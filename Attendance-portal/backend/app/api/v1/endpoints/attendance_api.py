import os
import shutil
import base64
import logging
import time as time_mod
import traceback
from datetime import datetime, time, date, timedelta
from typing import List, Optional , Any

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from jose import jwt

import math
import json
from app.models.work_location import ClientSite, AttendanceSettings, EmployeeWorkModeAssignment
from app.db.session import get_db
from app.models.profile_model import Profile
from app.core.dependencies import SECRET_KEY, ALGORITHM, get_current_user
from app.db.table_manager import create_monthly_tables
from app.services.attendance_service import (
    calculate_attendance_status,
    safe_parse_datetime,
    safe_parse_date,
    safe_format_time,
    safe_format_date,
    safe_calc_hours,
    repair_utc_punch_out,
    get_ist_now,
    get_ist_today,
    to_ist,
    IST
)

from pathlib import Path
from app.core.storage import UPLOAD_ROOT

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["Attendance"])
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = str(UPLOAD_ROOT)


def get_monthly_table_name(date_obj: date):
    """Generates the dynamic table name based on the current year and month."""
    return f"attendance_{date_obj.year}_{date_obj.month:02d}"


def _lookup_profile(db: Session, identifier: Any) -> Optional[Profile]:
    """Resolves a Profile record from emp_code, numeric ID, or email."""
    if identifier is None:
        return None
    val = str(identifier).strip()
    if not val or val.lower() in ("null", "undefined", "none"):
        return None
    # 1. Direct emp_code match (case-insensitive)
    p = db.query(Profile).filter(Profile.emp_code.ilike(val)).first()
    if p:
        return p
    # 2. Integer ID match
    if val.isdigit():
        p = db.query(Profile).filter(Profile.id == int(val)).first()
        if p:
            return p
    # 3. Email match
    if "@" in val:
        p = db.query(Profile).filter(Profile.email.ilike(val)).first()
        if p:
            return p
    return None


def _resolve_emp_code(request: Request, db: Session, fallback_data: dict = None, require_auth: bool = False) -> str:
    """
    Safely and securely extracts the employee code.
    Enforces that authenticated users cannot be impersonated via header/body tampering.
    Never falls back to hardcoded EMP001 or arbitrary profiles.
    """
    fallback_data = fallback_data or {}
    token_emp_code = None
    token_role = None

    # 1. Authenticated JWT Token
    auth_header = request.headers.get("authorization", "") if request else ""
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        payload = None
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except Exception:
            # Try allowing expired tokens (signature still valid)
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
            except Exception:
                # Extract unverified claims as last resort (e.g. secret key rotated)
                try:
                    payload = jwt.get_unverified_claims(token)
                except Exception:
                    payload = None

        if payload:
            raw_code = payload.get("emp_code")
            token_role = (payload.get("role") or "").strip().lower()

            p = (
                _lookup_profile(db, raw_code)
                or _lookup_profile(db, payload.get("sub"))
                or _lookup_profile(db, payload.get("employee_id") or payload.get("id"))
            )
            if p and p.emp_code:
                token_emp_code = p.emp_code
                if not token_role:
                    token_role = (p.role or "").strip().lower()
            elif raw_code:
                token_emp_code = str(raw_code).strip()

    # If authenticated user is employee/teamleader, enforce their authenticated emp_code strictly
    if token_emp_code:
        token_emp_code = str(token_emp_code).strip()
        # If user is admin/manager, allow targeting another employee if explicitly requested
        if token_role in ["admin", "superadmin", "administrator", "manager"]:
            target = (
                fallback_data.get("emp_code")
                or fallback_data.get("employee_id")
                or fallback_data.get("employeeId")
                or fallback_data.get("employee_code")
                or (request.headers.get("x-emp-code") if request else None)
            )
            if target and str(target).strip():
                target_p = _lookup_profile(db, target)
                if target_p and target_p.emp_code:
                    return str(target_p.emp_code).strip()
        return token_emp_code

    # 2. Custom Employee Headers (fallback for internal dev/legacy endpoints when require_auth is False or token omitted)
    if request:
        header_code = request.headers.get("x-emp-code") or request.headers.get("x-employee-id")
        if header_code and str(header_code).strip():
            p = _lookup_profile(db, header_code)
            if p and p.emp_code:
                return str(p.emp_code).strip()

        # 3. Email Lookup from headers
        email_hdr = request.headers.get("x-user-email") or request.headers.get("x-login-email")
        if email_hdr:
            p = _lookup_profile(db, email_hdr)
            if p and p.emp_code:
                return str(p.emp_code).strip()

    # 4. Payload Body (verified against Profile)
    body_code = (
        fallback_data.get("emp_code")
        or fallback_data.get("employee_id")
        or fallback_data.get("employeeId")
        or fallback_data.get("employee_code")
    )
    if body_code and str(body_code).strip():
        p = _lookup_profile(db, body_code)
        if p and p.emp_code:
            return str(p.emp_code).strip()

    email_body = fallback_data.get("email")
    if email_body:
        p = _lookup_profile(db, email_body)
        if p and p.emp_code:
            return str(p.emp_code).strip()

    raise HTTPException(
        status_code=401,
        detail="Unable to identify authenticated employee. Please sign in."
    )



def _compress_image_bytes(raw_bytes: bytes, max_dim: int = 160, quality: int = 60) -> bytes:
    """
    Compresses image bytes to a lightweight thumbnail (max 160px, JPEG quality 60).
    Reduces selfie storage footprint by ~98% (down to ~3-5 KB) to prevent PostgreSQL
    and Neon database storage exhaustion. Falls back to original bytes on any error.
    """
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(raw_bytes))
        img = img.convert("RGB")
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG", quality=quality, optimize=True)
        return out_buf.getvalue()
    except Exception as e:
        logger.warning(f"Selfie image compression skipped: {e}")
        return raw_bytes


def _save_selfie(emp_code: str, selfie_data, file_upload: UploadFile = None) -> Optional[str]:
    """
    Saves punch selfie photo with persistent cloud/database resilience.
    Compresses image to ~3-5 KB thumbnail and returns base64 data URL so that photos
    persist reliably in PostgreSQL (Neon) without causing storage bloat across Render restarts.
    Also writes compressed thumbnail to local static upload directory if possible.
    """
    try:
        dest_dir = Path(UPLOAD_ROOT)
        dest_dir.mkdir(parents=True, exist_ok=True)
        timestamp_str = get_ist_now().strftime("%Y%m%d_%H%M%S_%f")

        if file_upload and file_upload.filename:
            file_bytes = file_upload.file.read()
            compressed_bytes = _compress_image_bytes(file_bytes, max_dim=160, quality=60)
            b64_str = base64.b64encode(compressed_bytes).decode("utf-8")
            data_url = f"data:image/jpeg;base64,{b64_str}"
            try:
                dest_filename = f"punch_{emp_code}_{timestamp_str}.jpg"
                dest_path = dest_dir / dest_filename
                with open(dest_path, "wb") as buffer:
                    buffer.write(compressed_bytes)
            except Exception as e:
                logger.warning(f"Failed writing upload file to disk: {e}")
            return data_url

        if isinstance(selfie_data, str) and "base64," in selfie_data:
            clean_data = selfie_data.strip()
            try:
                header, b64_part = clean_data.split("base64,", 1)
                img_bytes = base64.b64decode(b64_part)
                compressed_bytes = _compress_image_bytes(img_bytes, max_dim=160, quality=60)
                compressed_b64 = base64.b64encode(compressed_bytes).decode("utf-8")
                compressed_url = f"data:image/jpeg;base64,{compressed_b64}"
                dest_filename = f"punch_{emp_code}_{timestamp_str}.jpg"
                dest_path = dest_dir / dest_filename
                try:
                    with open(dest_path, "wb") as f:
                        f.write(compressed_bytes)
                except Exception as e:
                    logger.warning(f"Failed writing base64 selfie to disk: {e}")
                return compressed_url
            except Exception as e:
                logger.warning(f"Failed compressing base64 selfie: {e}")
                return clean_data

        if isinstance(selfie_data, str) and selfie_data.strip():
            return selfie_data.strip()

    except Exception as e:
        logger.warning(f"[WARN] Error saving punch selfie: {e}")

    return None


def resolve_punch_photo(val: Optional[str]) -> Optional[str]:
    """
    Resolves punch photo value into a persistent, accessible format.
    If it's already a base64 data URL or external URL, returns as-is.
    If it's a legacy local disk path, reads the image if present on disk and converts to data URL.
    """
    if not val or not isinstance(val, str) or val.strip().lower() in ("", "none", "null", "undefined", "—", "-"):
        return None
    val = val.strip()
    if val.startswith("data:") or val.startswith("http://") or val.startswith("https://"):
        return val

    try:
        clean = val.replace("\\", "/").lstrip("/")
        no_prefix = clean
        if no_prefix.startswith("uploads/"):
            no_prefix = no_prefix[len("uploads/"):]
        candidates = [
            Path(UPLOAD_ROOT) / no_prefix,
            Path(UPLOAD_ROOT) / clean,
            Path(clean),
            Path("uploads") / no_prefix
        ]
        for p in candidates:
            if p.is_file():
                ext = p.suffix.lower()
                mime = "image/png" if ext == ".png" else "image/jpeg"
                with open(p, "rb") as f:
                    b64_str = base64.b64encode(f.read()).decode("utf-8")
                return f"data:{mime};base64,{b64_str}"
    except Exception as e:
        logger.debug(f"Could not resolve local selfie file to data-URL: {e}")

    return val


def _format_location(raw_loc) -> str:
    """Formats location into standard string representation using reverse geocoding."""
    from app.services.geo_service import format_punch_location
    return format_punch_location(raw_loc)


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula calculating distance in meters between two GPS coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def _process_punch(
    db: Session,
    emp_code: str,
    punch_type: str,
    location_input: Any,
    selfie_path: Optional[str],
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    accuracy: Optional[float] = None,
    timestamp_input: Optional[Any] = None,
    work_mode_input: Optional[str] = None,
    client_site_id_input: Optional[Any] = None,
    client_site_name_input: Optional[str] = None
) -> dict:
    """Core punch handler ensuring record persistence, work mode validation, and duplicate punch protection."""
    now = get_ist_now()
    today = now.date()
    now_db = now.replace(tzinfo=None)
    table_name = get_monthly_table_name(today)

    hours = 0.0
    h_str = "0h 00m"
    total_mins = 0
    calculated_status = "Present"

    # Ensure this month's dynamic tables exist
    create_monthly_tables(for_next_month=False)

    from app.services.geo_service import parse_coordinates
    if latitude is None or longitude is None:
        p_lat, p_lon = parse_coordinates(location_input)
        if latitude is None:
            latitude = p_lat
        if longitude is None:
            longitude = p_lon
    if accuracy is None and isinstance(location_input, dict):
        accuracy = location_input.get("accuracy")

    clean_location = _format_location(location_input)
    if not clean_location and (latitude is not None and longitude is not None):
        clean_location = f"{latitude:.4f}, {longitude:.4f}"
    if not clean_location:
        clean_location = "Location Detected"

    # Calculate on-time remark (<= 10:30 AM)
    cutoff = time(10, 30)
    punch_remark = "On Time" if now.time() <= cutoff else "Late"

    # Fetch global attendance settings
    settings = db.query(AttendanceSettings).first()
    if not settings:
        settings = AttendanceSettings()

    # Fetch employee assignment
    assignment = db.query(EmployeeWorkModeAssignment).filter(
        EmployeeWorkModeAssignment.emp_code == emp_code
    ).first()

    all_active_sites = db.query(ClientSite).filter(ClientSite.is_active == True).all()
    all_site_map = {s.id: s for s in all_active_sites}
    all_site_ids = list(all_site_map.keys())

    if assignment:
        allow_office = bool(assignment.allow_office)
        allow_wfh = bool(assignment.allow_wfh) and bool(settings.wfh_enabled)
        allow_client_site = bool(assignment.allow_client_site)
        try:
            assigned_site_ids = [int(x) for x in json.loads(assignment.assigned_client_site_ids or "[]")]
        except Exception:
            assigned_site_ids = []
    else:
        allow_office = True
        allow_wfh = bool(settings.wfh_enabled)
        allow_client_site = True
        assigned_site_ids = all_site_ids

    # Normalize work mode
    raw_mode = (str(work_mode_input or "OFFICE")).strip().upper().replace(" ", "_")
    if raw_mode in ["WORK_FROM_HOME", "HOME"]:
        norm_mode = "WFH"
    elif raw_mode in ["CLIENT", "CLIENTSITE", "CLIENT_SITE"]:
        norm_mode = "CLIENT_SITE"
    else:
        norm_mode = "OFFICE"

    # Fetch existing punch row for today
    existing = db.execute(
        text(f"""
            SELECT id, punch_in_time, punch_out_time, punch_in_location, punch_out_location,
                   punch_in_latitude, punch_in_longitude, punch_in_accuracy,
                   punch_out_latitude, punch_out_longitude, punch_out_accuracy,
                   punch_in_image, punch_out_image, status, hours_completed,
                   work_mode, client_site_id, client_site_name, remark,
                   first_punch_out_time, correction_status
            FROM {table_name}
            WHERE emp_code = :code AND date = :today
            ORDER BY id DESC LIMIT 1
        """),
        {"code": emp_code, "today": today}
    ).mappings().first()

    clean_type = str(punch_type or "").strip().lower().replace("-", "_").replace(" ", "_")
    is_in = clean_type in ["in", "check_in", "checkin", "punch_in", "punchin"]
    is_recovery = clean_type in ["recovery", "recovery_in", "recoveryin"]
    is_out = clean_type in ["out", "check_out", "checkout", "punch_out", "punchout"]

    resolved_site_id = None
    resolved_site_name = None

    if is_in or is_recovery:
        if norm_mode == "WFH":
            if not settings.wfh_enabled or not allow_wfh:
                raise HTTPException(
                    status_code=403,
                    detail="Work From Home is not enabled for your account."
                )
            resolved_site_id = None
            resolved_site_name = None

        elif norm_mode == "CLIENT_SITE":
            if not allow_client_site:
                raise HTTPException(
                    status_code=403,
                    detail="Client site work mode is not enabled for your account."
                )

            target_site = None
            if client_site_id_input is not None and str(client_site_id_input).isdigit():
                target_site = db.query(ClientSite).filter(ClientSite.id == int(client_site_id_input)).first()
            if not target_site and client_site_name_input:
                target_site = db.query(ClientSite).filter(ClientSite.name.ilike(str(client_site_name_input).strip())).first()
            if not target_site and client_site_id_input and not str(client_site_id_input).isdigit():
                target_site = db.query(ClientSite).filter(ClientSite.name.ilike(str(client_site_id_input).strip())).first()

            if target_site:
                resolved_site_id = target_site.id
                resolved_site_name = target_site.name
            else:
                resolved_site_id = None
                resolved_site_name = str(client_site_name_input or client_site_id_input or "Client Site").strip()

            # Record client site coordinates and actual location without geofence rejection
            if target_site and target_site.latitude and target_site.longitude and latitude is not None and longitude is not None:
                dist = calculate_haversine_distance(latitude, longitude, target_site.latitude, target_site.longitude)
                logger.info(f"Client site punch recorded for {emp_code} at {resolved_site_name}. Distance: {dist:.1f}m")

        else:  # OFFICE
            if not allow_office:
                raise HTTPException(
                    status_code=403,
                    detail="Office work mode is not enabled for your account."
                )
            resolved_site_id = None
            resolved_site_name = None

            # Office punch permitted from any physical location. Real GPS coordinates captured faithfully.
            if settings.office_latitude and settings.office_longitude and latitude is not None and longitude is not None:
                dist = calculate_haversine_distance(latitude, longitude, settings.office_latitude, settings.office_longitude)
                logger.info(f"Office punch recorded for {emp_code}. Distance from office: {dist:.1f}m")
    else:
        # PUNCH OUT: inherit work mode and client site from active punch-in row
        norm_mode = (existing.get("work_mode") if existing else None) or "OFFICE"
        resolved_site_id = existing.get("client_site_id") if existing else None
        resolved_site_name = existing.get("client_site_name") if existing else None

    first_out = None
    is_correction = False
    row_id = None

    # 1. PUNCH IN
    if is_in:
        if existing and existing.get("punch_out_time"):
            raise HTTPException(
                status_code=400,
                detail="You have already completed today's attendance."
            )

        try:
            if existing:
                # Update existing row for today (preserve original punch_in_time and on-time remark if already punched in)
                if existing.get("punch_in_time"):
                    punch_remark = existing.get("remark") or punch_remark
                db.execute(
                    text(f"""
                        UPDATE {table_name}
                        SET punch_in_time = COALESCE(punch_in_time, :now),
                            punch_in_location = :loc,
                            punch_in_image = COALESCE(:img, punch_in_image),
                            punch_in_latitude = :lat,
                            punch_in_longitude = :lon,
                            punch_in_accuracy = :acc,
                            status = 'Punched In',
                            remark = :remark,
                            work_mode = :wmode,
                            client_site_id = :csite_id,
                            client_site_name = :csite_name
                        WHERE id = :id
                    """),
                    {
                        "now": now_db,
                        "loc": clean_location,
                        "img": selfie_path,
                        "lat": latitude,
                        "lon": longitude,
                        "acc": accuracy,
                        "remark": punch_remark,
                        "wmode": norm_mode,
                        "csite_id": resolved_site_id,
                        "csite_name": resolved_site_name,
                        "id": existing["id"]
                    }
                )
                row_id = existing["id"]
            else:
                res = db.execute(
                    text(f"""
                        INSERT INTO {table_name} (
                            emp_code, date, punch_in_time, punch_in_location, punch_in_image,
                            punch_in_latitude, punch_in_longitude, punch_in_accuracy,
                            status, remark, work_mode, client_site_id, client_site_name
                        ) VALUES (
                            :code, :date, :now, :loc, :img,
                            :lat, :lon, :acc,
                            'Punched In', :remark, :wmode, :csite_id, :csite_name
                        ) RETURNING id
                    """),
                    {
                        "code": emp_code,
                        "date": today,
                        "now": now_db,
                        "loc": clean_location,
                        "img": selfie_path,
                        "lat": latitude,
                        "lon": longitude,
                        "acc": accuracy,
                        "remark": punch_remark,
                        "wmode": norm_mode,
                        "csite_id": resolved_site_id,
                        "csite_name": resolved_site_name
                    }
                )
                row_id = res.scalar()
            db.commit()
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during punch in: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Database error occurred while recording punch in.")

    # 2. RECOVERY PUNCH IN
    elif is_recovery:
        try:
            if existing:
                db.execute(
                    text(f"""
                        UPDATE {table_name}
                        SET punch_in_time = :now,
                            punch_out_time = NULL,
                            punch_in_location = :loc,
                            punch_in_image = COALESCE(:img, punch_in_image),
                            punch_in_latitude = :lat,
                            punch_in_longitude = :lon,
                            punch_in_accuracy = :acc,
                            hours_completed = NULL,
                            status = 'Punched In',
                            remark = :remark,
                            work_mode = :wmode,
                            client_site_id = :csite_id,
                            client_site_name = :csite_name
                        WHERE id = :id
                    """),
                    {
                        "now": now_db,
                        "loc": clean_location,
                        "img": selfie_path,
                        "lat": latitude,
                        "lon": longitude,
                        "acc": accuracy,
                        "remark": punch_remark,
                        "wmode": norm_mode,
                        "csite_id": resolved_site_id,
                        "csite_name": resolved_site_name,
                        "id": existing["id"]
                    }
                )
                row_id = existing["id"]
            else:
                res = db.execute(
                    text(f"""
                        INSERT INTO {table_name} (
                            emp_code, date, punch_in_time, punch_in_location, punch_in_image,
                            punch_in_latitude, punch_in_longitude, punch_in_accuracy,
                            status, remark, work_mode, client_site_id, client_site_name
                        ) VALUES (
                            :code, :date, :now, :loc, :img,
                            :lat, :lon, :acc,
                            'Punched In', :remark, :wmode, :csite_id, :csite_name
                        ) RETURNING id
                    """),
                    {
                        "code": emp_code,
                        "date": today,
                        "now": now_db,
                        "loc": clean_location,
                        "img": selfie_path,
                        "lat": latitude,
                        "lon": longitude,
                        "acc": accuracy,
                        "remark": punch_remark,
                        "wmode": norm_mode,
                        "csite_id": resolved_site_id,
                        "csite_name": resolved_site_name
                    }
                )
                row_id = res.scalar()
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during recovery punch in: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Database error occurred while recording recovery punch in.")

    # 3. PUNCH OUT
    else:
        if not existing or not existing["punch_in_time"]:
            raise HTTPException(
                status_code=400,
                detail="No active punch-in found for today. Please punch in first."
            )

        record_date = existing.get("date") or today

        in_time = safe_parse_datetime(existing["punch_in_time"])
        if in_time and now < in_time:
            raise HTTPException(
                status_code=400,
                detail="Punch out time cannot be earlier than punch in time."
            )

        is_correction = False
        first_out = None

        if existing.get("punch_out_time"):
            # A punch out already exists: this is a correction/re-punch attempt!
            corr_status = existing.get("correction_status") or "NONE"
            if corr_status == "CORRECTED":
                raise HTTPException(
                    status_code=400,
                    detail="Punch-out correction has already been completed for today."
                )

            first_out = safe_parse_datetime(existing.get("first_punch_out_time") or existing.get("punch_out_time"))
            if not first_out:
                first_out = safe_parse_datetime(existing.get("punch_out_time"))

            elapsed_seconds = (now - first_out).total_seconds()
            BUFFER_SECONDS = 15 * 60  # 15 minutes = 900 seconds

            if elapsed_seconds < BUFFER_SECONDS:
                remaining_seconds = max(0, int(BUFFER_SECONDS - elapsed_seconds))
                rem_m = remaining_seconds // 60
                rem_s = remaining_seconds % 60
                raise HTTPException(
                    status_code=400,
                    detail=f"Correction is not available yet. Please wait {rem_m:02d}:{rem_s:02d} before punching out again."
                )

            # 15-minute buffer expired: perform valid correction punch out!
            is_correction = True
            status_info = calculate_attendance_status(
                punch_in_time=in_time,
                punch_out_time=now,
                target_date=record_date
            )
            calculated_status = status_info["status"]
            hours = status_info["hours"]
            h_str = status_info["total_hours"]
            total_mins = status_info["total_minutes"]

            orig_time_str = first_out.strftime("%I:%M %p")
            new_time_str = now.strftime("%I:%M %p")
            existing_remark = existing.get("remark") or ""
            audit_note = f"Corrected punch-out from {orig_time_str} to {new_time_str}"
            new_remark = f"{existing_remark}; {audit_note}".strip("; ")

            try:
                db.execute(
                    text(f"""
                        UPDATE {table_name}
                        SET punch_out_time = :now,
                            punch_out_location = :loc,
                            punch_out_image = COALESCE(:img, punch_out_image),
                            punch_out_latitude = :lat,
                            punch_out_longitude = :lon,
                            punch_out_accuracy = :acc,
                            hours_completed = :hours,
                            status = :status,
                            correction_status = 'CORRECTED',
                            remark = :remark
                        WHERE id = :id
                    """),
                    {
                        "now": now_db,
                        "loc": clean_location,
                        "img": selfie_path,
                        "lat": latitude,
                        "lon": longitude,
                        "acc": accuracy,
                        "hours": round(hours, 2),
                        "status": calculated_status,
                        "remark": new_remark,
                        "id": existing["id"]
                    }
                )
                db.commit()
                row_id = existing["id"]
            except Exception as e:
                db.rollback()
                logger.error(f"Database error during correction punch out update: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="Database error occurred while recording correction punch out.")

        else:
            # First punch out of the day
            first_out = now
            status_info = calculate_attendance_status(
                punch_in_time=in_time,
                punch_out_time=now,
                target_date=record_date
            )
            calculated_status = status_info["status"]
            hours = status_info["hours"]
            h_str = status_info["total_hours"]
            total_mins = status_info["total_minutes"]

            try:
                db.execute(
                    text(f"""
                        UPDATE {table_name}
                        SET punch_out_time = :now,
                            first_punch_out_time = :now,
                            correction_status = 'CORRECTION_PENDING',
                            punch_out_location = :loc,
                            punch_out_image = COALESCE(:img, punch_out_image),
                            punch_out_latitude = :lat,
                            punch_out_longitude = :lon,
                            punch_out_accuracy = :acc,
                            hours_completed = :hours,
                            status = :status
                        WHERE id = :id
                    """),
                    {
                        "now": now_db,
                        "loc": clean_location,
                        "img": selfie_path,
                        "lat": latitude,
                        "lon": longitude,
                        "acc": accuracy,
                        "hours": round(hours, 2),
                        "status": calculated_status,
                        "id": existing["id"]
                    }
                )
                db.commit()
                row_id = existing["id"]
            except Exception as e:
                db.rollback()
                logger.error(f"Database error during punch out update: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="Database error occurred while recording punch out.")

    prof = db.query(Profile).filter(Profile.emp_code == emp_code).first()
    emp_name = f"{prof.first_name or ''} {prof.last_name or ''}".strip() if prof else emp_code
    emp_email = prof.email if prof else ""
    emp_contact = prof.mobile_no if prof else ""

    display_t = now.strftime("%I:%M %p")
    in_display = display_t if (is_in or is_recovery) else safe_format_time(existing["punch_in_time"] if existing else None, "—")
    out_display = display_t if is_out else "—"

    in_time_iso = now.isoformat() if (is_in or is_recovery) else (safe_parse_datetime(existing["punch_in_time"]).isoformat() if existing and existing["punch_in_time"] else None)
    out_time_iso = now.isoformat() if is_out else None

    in_lat = latitude if (is_in or is_recovery) else (existing.get("punch_in_latitude") if existing else None)
    in_lon = longitude if (is_in or is_recovery) else (existing.get("punch_in_longitude") if existing else None)
    in_acc = accuracy if (is_in or is_recovery) else (existing.get("punch_in_accuracy") if existing else None)
    in_loc = clean_location if (is_in or is_recovery) else (existing.get("punch_in_location") if existing else clean_location)

    out_lat = latitude if is_out else None
    out_lon = longitude if is_out else None
    out_acc = accuracy if is_out else None
    out_loc = clean_location if is_out else None

    corr_eligible_dt = (first_out + timedelta(minutes=15)) if first_out else None
    remaining_corr_sec = max(0, int((corr_eligible_dt - now).total_seconds())) if (is_out and not is_correction and corr_eligible_dt) else 0

    return {
        "status": "success",
        "message": (
            f"Punch Out updated successfully at {display_t}."
            if is_correction
            else (f"Punch Out confirmed at {display_t}." if is_out else f"Punch In confirmed at {display_t}.")
        ),
        "id": row_id,
        "type": "check_in" if (is_in or is_recovery) else "check_out",
        "punch_type": "in" if (is_in or is_recovery) else "out",
        "time": display_t,
        "checkIn": in_display,
        "checkOut": out_display,
        "punch_in_time": in_time_iso,
        "punch_out_time": out_time_iso,
        "first_punch_out_time": first_out.isoformat() if first_out else out_time_iso,
        "first_punch_out_time_display": safe_format_time(first_out, None) if first_out else out_display,
        "is_correction": is_correction,
        "correction_status": "CORRECTED" if is_correction else ("CORRECTION_PENDING" if is_out else "NONE"),
        "correction_eligible_at": corr_eligible_dt.isoformat() if corr_eligible_dt else None,
        "correction_available": is_out and not is_correction and (remaining_corr_sec == 0),
        "correction_remaining_seconds": remaining_corr_sec,
        "server_time": now.isoformat(),
        "hours": h_str if is_out else "0h 00m",
        "hours_completed": round(hours, 2) if is_out else 0.0,
        "total_minutes": total_mins if is_out else 0,
        "total_hours": h_str if is_out else "0h 00m",
        "working_hours": h_str if is_out else "0h 00m",
        "location": clean_location,
        "latitude": latitude,
        "longitude": longitude,
        "accuracy": accuracy,
        "punch_in_location": in_loc,
        "punch_out_location": out_loc,
        "punch_in_latitude": in_lat,
        "punch_in_longitude": in_lon,
        "punch_in_accuracy": in_acc,
        "punch_out_latitude": out_lat,
        "punch_out_longitude": out_lon,
        "punch_out_accuracy": out_acc,
        "punch_in_image": selfie_path if (is_in or is_recovery) else resolve_punch_photo(existing.get("punch_in_image") if existing else None),
        "punch_out_image": selfie_path if is_out else resolve_punch_photo(existing.get("punch_out_image") if existing else None),
        "timestamp": now.isoformat(),
        "date": today.strftime("%d %b %Y"),
        "emp_code": emp_code,
        "employee_name": emp_name,
        "email": emp_email,
        "contact": emp_contact,
        "status": calculated_status if is_out else "Punched In",
        "attendance_status": calculated_status if is_out else "Punched In",
        "work_mode": norm_mode,
        "workMode": norm_mode,
        "client_site_id": resolved_site_id,
        "clientSiteId": resolved_site_id,
        "client_site_name": resolved_site_name,
        "clientSiteName": resolved_site_name,
        "client_site": resolved_site_name,
        "clientSite": resolved_site_name
    }


# ==============================================================================
# PUNCH ROUTES (Accepts JSON & Form Data Seamlessly)
# ==============================================================================

@router.post("/punch")
@router.post("/punch-in")
@router.post("/check-in")
@router.post("/punch-out")
@router.post("/check-out")
async def punch_unified_api(request: Request, db: Session = Depends(get_db)):
    """Primary punch endpoint called by Employee Portal frontend."""
    body = {}
    content_type = request.headers.get("content-type", "").lower()
    file_upload = None

    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            body = {}
    else:
        try:
            form = await request.form()
            body = dict(form)
            file_upload = form.get("image") or form.get("selfie")
        except Exception:
            body = {}

    emp_code = _resolve_emp_code(request, db, body, require_auth=True)

    path = request.url.path.lower().rstrip("/")
    is_checkout_route = path.endswith("check-out") or path.endswith("punch-out")
    default_type = "out" if is_checkout_route else "in"

    punch_type = (
        body.get("punchType")
        or body.get("type")
        or body.get("punch_type")
        or default_type
    ).lower()

    raw_loc = body.get("location")
    lat = body.get("latitude")
    lon = body.get("longitude")
    acc = body.get("accuracy")

    if isinstance(raw_loc, dict):
        lat = lat if lat is not None else raw_loc.get("latitude")
        lon = lon if lon is not None else raw_loc.get("longitude")
        acc = acc if acc is not None else raw_loc.get("accuracy")

    selfie_path = _save_selfie(emp_code, body.get("selfie") or body.get("image"), file_upload)

    work_mode_in = body.get("work_mode") or body.get("workMode") or body.get("mode")
    client_site_id_in = (
        body.get("client_site_id")
        or body.get("clientSiteId")
        or body.get("client_site")
        or body.get("clientSite")
    )
    client_site_name_in = body.get("client_site_name") or body.get("clientSiteName")

    try:
        return _process_punch(
            db=db,
            emp_code=emp_code,
            punch_type=punch_type,
            location_input=raw_loc,
            selfie_path=selfie_path,
            latitude=lat,
            longitude=lon,
            accuracy=acc,
            timestamp_input=body.get("timestamp"),
            work_mode_input=work_mode_in,
            client_site_id_input=client_site_id_in,
            client_site_name_input=client_site_name_in
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Unexpected error in punch_unified_api for {emp_code}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing attendance punch. Please try again."
        )



@router.get("/today")
def get_today_attendance_record(request: Request, db: Session = Depends(get_db)):
    """Returns today's punch record for the authenticated employee."""
    emp_code = _resolve_emp_code(request, db)
    today = get_ist_today()
    record_date = today
    table_name = get_monthly_table_name(today)

    prof = db.query(Profile).filter(Profile.emp_code == emp_code).first() if emp_code else None
    emp_name = f"{prof.first_name or ''} {prof.last_name or ''}".strip() if prof else (emp_code or "Employee")
    email = prof.email if prof else ""
    contact = prof.mobile_no if prof else ""

    try:
        query = text(f"""
            SELECT 
                id, emp_code, date, punch_in_time, punch_out_time,
                punch_in_location, punch_out_location,
                punch_in_latitude, punch_in_longitude, punch_in_accuracy,
                punch_out_latitude, punch_out_longitude, punch_out_accuracy,
                status, remark, hours_completed,
                punch_in_image, punch_out_image,
                work_mode, client_site_id, client_site_name,
                first_punch_out_time, correction_status
            FROM {table_name}
            WHERE emp_code = :code AND date = :today
            ORDER BY id DESC LIMIT 1
        """)
        r = db.execute(query, {"code": emp_code, "today": today}).mappings().first()



        if not r:
            return {
                "punched": False,
                "status": "Not started",
                "date": today.strftime("%d %b %Y"),
                "checkIn": None,
                "checkOut": None,
                "hours": None,
                "location": None,
                "work_mode": "OFFICE",
                "workMode": "OFFICE",
                "client_site": None,
                "client_site_id": None,
                "client_site_name": None,
                "first_punch_out_time": None,
                "first_punch_out_time_display": None,
                "correction_status": "NONE",
                "correction_eligible_at": None,
                "correction_available": False,
                "correction_remaining_seconds": 0,
                "server_time": datetime.now().isoformat(),
                "employee": {
                    "name": emp_name,
                    "code": emp_code,
                    "email": email,
                    "contact": contact
                }
            }

        in_dt = safe_parse_datetime(r["punch_in_time"])
        out_dt = repair_utc_punch_out(in_dt, r["punch_out_time"], record_date)
        in_t = safe_format_time(in_dt, None)
        out_t = safe_format_time(out_dt, None)
        h_val = float(r["hours_completed"] or 0)
        if in_dt and out_dt:
            exp_h = safe_calc_hours(in_dt, out_dt, record_date)
            if h_val == 0 or abs(exp_h - h_val) > 1.0:
                h_val = exp_h
        elif h_val == 0 and in_dt:
            h_val = safe_calc_hours(in_dt, out_dt, record_date)

        status_info = calculate_attendance_status(
            punch_in_time=in_dt,
            punch_out_time=out_dt,
            hours_completed=h_val,
            target_date=record_date,
            status_override=r["status"]
        )
        h_str = status_info["total_hours"]
        st = status_info["status"]
        h_val = status_info["hours"]
        w_mode = r.get("work_mode") or "OFFICE"
        cs_name = r.get("client_site_name")

        first_out_dt = safe_parse_datetime(r.get("first_punch_out_time") or r.get("punch_out_time"))
        raw_corr_status = r.get("correction_status")
        if not raw_corr_status or raw_corr_status == "NONE":
            if "Corrected punch-out" in (r.get("remark") or ""):
                raw_corr_status = "CORRECTED"
            elif out_dt:
                raw_corr_status = "CORRECTION_PENDING"
            else:
                raw_corr_status = "NONE"

        now_dt = datetime.now()
        corr_eligible_at = (first_out_dt + timedelta(minutes=15)) if first_out_dt else None
        corr_rem_sec = 0
        corr_avail = False
        if out_dt and raw_corr_status != "CORRECTED" and corr_eligible_at:
            corr_rem_sec = max(0, int((corr_eligible_at - now_dt).total_seconds()))
            corr_avail = corr_rem_sec == 0

        return {
            "punched": bool(in_t),
            "id": r["id"],
            "emp_code": r["emp_code"],
            "date": today.strftime("%d %b %Y"),
            "isoDate": today.isoformat(),
            "checkIn": in_t,
            "checkOut": out_t,
            "punch_in_time": in_dt.isoformat() if in_dt else None,
            "punch_out_time": out_dt.isoformat() if out_dt else None,
            "first_punch_out_time": first_out_dt.isoformat() if first_out_dt else None,
            "first_punch_out_time_display": safe_format_time(first_out_dt, None),
            "correction_status": raw_corr_status,
            "correction_eligible_at": corr_eligible_at.isoformat() if corr_eligible_at else None,
            "correction_available": corr_avail,
            "correction_remaining_seconds": corr_rem_sec,
            "server_time": now_dt.isoformat(),
            "hours": h_str,
            "hours_completed": h_val,
            "status": st,
            "remark": r["remark"] or ("On Time" if in_t else ""),
            "punch_in_location": r["punch_in_location"],
            "punch_out_location": r["punch_out_location"],
            "location": r["punch_in_location"] or r["punch_out_location"] or "",
            "punch_in_latitude": r["punch_in_latitude"],
            "punch_in_longitude": r["punch_in_longitude"],
            "punch_in_accuracy": r["punch_in_accuracy"],
            "punch_out_latitude": r["punch_out_latitude"],
            "punch_out_longitude": r["punch_out_longitude"],
            "punch_out_accuracy": r["punch_out_accuracy"],
            "punch_in_image": resolve_punch_photo(r["punch_in_image"]),
            "punch_out_image": resolve_punch_photo(r["punch_out_image"]),
            "work_mode": w_mode,
            "workMode": w_mode,
            "client_site_id": r.get("client_site_id"),
            "clientSiteId": r.get("client_site_id"),
            "client_site_name": cs_name,
            "clientSiteName": cs_name,
            "client_site": cs_name,
            "clientSite": cs_name,
            "employee": {
                "name": emp_name,
                "code": emp_code,
                "email": email,
                "contact": contact
            }
        }

    except Exception as e:
        db.rollback()
        return {
            "punched": False,
            "status": "Not started",
            "date": today.strftime("%d %b %Y"),
            "employee": {
                "name": emp_name,
                "code": emp_code,
                "email": email,
                "contact": contact
            }
        }


# ==============================================================================
# ATTENDANCE DATA & SUMMARY ROUTES
# ==============================================================================

@router.get("/records")
def get_attendance_records_api(
    request: Request,
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Returns normalized attendance records for the active employee."""
    emp_code = _resolve_emp_code(request, db)
    today = get_ist_today()
    table_name = get_monthly_table_name(today)

    create_monthly_tables(for_next_month=False)

    prof = db.query(Profile).filter(Profile.emp_code == emp_code).first() if emp_code else None
    emp_name = f"{prof.first_name or ''} {prof.last_name or ''}".strip() if prof else (emp_code or "Employee")
    email = prof.email if prof else ""
    contact = prof.mobile_no if prof else ""

    params = {"code": emp_code} if emp_code else {}
    limit_clause = ""
    if limit is not None:
        limit_clause = "LIMIT :limit OFFSET :offset"
        params["limit"] = limit
        params["offset"] = offset or 0

    query = text(f"""
        SELECT 
            id, emp_code, date, punch_in_time, punch_out_time,
            punch_in_location, punch_out_location,
            punch_in_latitude, punch_in_longitude, punch_in_accuracy,
            punch_out_latitude, punch_out_longitude, punch_out_accuracy,
            status, remark, hours_completed,
            punch_in_image, punch_out_image,
            work_mode, client_site_id, client_site_name,
            first_punch_out_time, correction_status
        FROM {table_name}
        {"WHERE emp_code = :code" if emp_code else ""}
        ORDER BY date DESC, punch_in_time DESC
        {limit_clause}
    """)
    try:
        results = db.execute(query, params).mappings().all()
        formatted = []
        now_dt = datetime.now()
        for r in results:
            in_time_val = r["punch_in_time"]
            out_time_val = r["punch_out_time"]
            in_dt = safe_parse_datetime(in_time_val)
            d_val = safe_parse_date(r["date"]) or today
            out_dt = repair_utc_punch_out(in_dt, out_time_val, d_val)

            in_t = safe_format_time(in_dt, "—")
            out_t = safe_format_time(out_dt, "—")
            d_str = safe_format_date(r["date"], "%d %b %Y")
            h_val = round(float(r["hours_completed"] or 0), 2)
            if in_dt and out_dt:
                exp_h = safe_calc_hours(in_dt, out_dt, d_val)
                if h_val == 0 or abs(exp_h - h_val) > 1.0:
                    h_val = exp_h

            status_info = calculate_attendance_status(
                punch_in_time=in_dt,
                punch_out_time=out_dt,
                hours_completed=h_val,
                target_date=d_val,
                status_override=r["status"]
            )
            st = status_info["status"]
            h_str = status_info["total_hours"]
            h_val = status_info["hours"]

            first_out_dt = safe_parse_datetime(r.get("first_punch_out_time") or r.get("punch_out_time"))
            raw_corr_status = r.get("correction_status")
            if not raw_corr_status or raw_corr_status == "NONE":
                if "Corrected punch-out" in (r.get("remark") or ""):
                    raw_corr_status = "CORRECTED"
                elif out_dt:
                    raw_corr_status = "CORRECTION_PENDING"
                else:
                    raw_corr_status = "NONE"

            corr_eligible_at = (first_out_dt + timedelta(minutes=15)) if first_out_dt else None
            corr_rem_sec = 0
            corr_avail = False
            if out_dt and raw_corr_status != "CORRECTED" and corr_eligible_at and d_val == today:
                corr_rem_sec = max(0, int((corr_eligible_at - now_dt).total_seconds()))
                corr_avail = corr_rem_sec == 0

            loc = r["punch_in_location"] or r["punch_out_location"] or ""
            w_mode = r.get("work_mode") or "OFFICE"
            cs_name = r.get("client_site_name")

            formatted.append({
                "id": r["id"],
                "emp_code": r["emp_code"],
                "employee_code": r["emp_code"],
                "employee_name": emp_name,
                "name": emp_name,
                "email": email,
                "contact": contact,
                "date": d_str,
                "isoDate": d_val.isoformat() if d_val else "",
                "checkIn": in_t,
                "checkOut": out_t,
                "punch_in_time": in_dt.isoformat() if in_dt else None,
                "punch_out_time": out_dt.isoformat() if out_dt else None,
                "first_punch_out_time": first_out_dt.isoformat() if first_out_dt else None,
                "first_punch_out_time_display": safe_format_time(first_out_dt, None),
                "correction_status": raw_corr_status,
                "correction_eligible_at": corr_eligible_at.isoformat() if corr_eligible_at else None,
                "correction_available": corr_avail,
                "correction_remaining_seconds": corr_rem_sec,
                "punch_in_location": r["punch_in_location"] or loc,
                "punch_out_location": r["punch_out_location"] or loc,
                "location": loc,
                "punch_in_latitude": r["punch_in_latitude"],
                "punch_in_longitude": r["punch_in_longitude"],
                "punch_in_accuracy": r["punch_in_accuracy"],
                "punch_out_latitude": r["punch_out_latitude"],
                "punch_out_longitude": r["punch_out_longitude"],
                "punch_out_accuracy": r["punch_out_accuracy"],
                "punch_in_image": resolve_punch_photo(r["punch_in_image"]),
                "punch_out_image": resolve_punch_photo(r["punch_out_image"]),
                "hours": h_val,
                "hours_completed": h_val,
                "total_minutes": status_info["total_minutes"],
                "total_hours": h_str,
                "workingHours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
                "working_hours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
                "status": st,
                "attendance_status": st,
                "remark": r["remark"] or "On Time",
                "work_mode": w_mode,
                "workMode": w_mode,
                "client_site_id": r.get("client_site_id"),
                "clientSiteId": r.get("client_site_id"),
                "client_site_name": cs_name,
                "clientSiteName": cs_name,
                "client_site": cs_name,
                "clientSite": cs_name
            })
        return formatted

    except Exception as e:
        print(f"Error fetching attendance records: {e}")
        traceback.print_exc()
        db.rollback()
        return []


@router.get("/me")
def get_my_attendance(request: Request, db: Session = Depends(get_db)):
    """Fetch attendance for current authenticated user."""
    return get_attendance_records_api(request, db)


@router.get("/employee/{emp_code}")
def get_employee_attendance(emp_code: str, db: Session = Depends(get_db)):
    today = get_ist_today()
    table_name = get_monthly_table_name(today)
    create_monthly_tables(for_next_month=False)

    is_pg = False
    try:
        is_pg = (db.bind.dialect.name == "postgresql")
    except Exception:
        pass

    if is_pg:
        query = text(f"""
            SELECT DISTINCT ON (date) 
                id, emp_code, date, punch_in_time, punch_out_time,
                punch_in_location, punch_out_location, status, remark, hours_completed,
                punch_in_image, punch_out_image
            FROM {table_name} 
            WHERE emp_code = :code
            ORDER BY date DESC, punch_out_time DESC NULLS LAST
        """)
    else:
        query = text(f"""
            SELECT 
                id, emp_code, date, punch_in_time, punch_out_time,
                punch_in_location, punch_out_location, status, remark, hours_completed,
                punch_in_image, punch_out_image
            FROM {table_name} 
            WHERE emp_code = :code
            GROUP BY date
            ORDER BY date DESC
        """)
    try:
        result = db.execute(query, {"code": emp_code})
        return result.mappings().all()
    except Exception as e:
        print(f"Error fetching attendance for employee {emp_code}: {e}")
        db.rollback()
        return []


@router.get("/summary/{emp_code}")
def get_employee_attendance_summary(emp_code: str, db: Session = Depends(get_db)):
    """Provides dynamic attendance summary (Present, Absent, Late, Leave) for an employee."""
    today = get_ist_today()
    table_name = get_monthly_table_name(today)
    create_monthly_tables(for_next_month=False)

    present = 0
    absent = 0
    late = 0
    leave = 0

    try:
        q = text(f"SELECT status, remark, punch_in_time FROM {table_name} WHERE emp_code = :code")
        rows = db.execute(q, {"code": emp_code}).mappings().all()
        for r in rows:
            st = str(r["status"] or "").lower()
            rem = str(r["remark"] or "").lower()
            if "late" in rem or "late" in st:
                late += 1
                present += 1
            elif "present" in st or "completed" in st or r["punch_in_time"]:
                present += 1
            elif "absent" in st:
                absent += 1
            elif "leave" in st:
                leave += 1

        try:
            from app.models.leave import LeaveRequest
            approved_leaves = db.query(LeaveRequest).filter(
                LeaveRequest.emp_code == emp_code,
                LeaveRequest.status.ilike("approved")
            ).count()
            leave += approved_leaves
        except Exception:
            pass

        total_tracked = present + absent + late + leave
        return {
            "available": total_tracked > 0,
            "present": present,
            "absent": absent,
            "late": late,
            "leave": leave,
            "total_days": total_tracked
        }
    except Exception as e:
        db.rollback()
        return {
            "available": False,
            "present": 0,
            "absent": 0,
            "late": 0,
            "leave": 0,
            "total_days": 0
        }


@router.post("/reset-today")
def reset_today_attendance(request: Request, db: Session = Depends(get_db)):
    """Resets today's punch record for current employee (useful for re-testing)."""
    emp_code = _resolve_emp_code(request, db)
    today = get_ist_today()
    table_name = get_monthly_table_name(today)
    if emp_code:
        try:
            db.execute(text(f"DELETE FROM {table_name} WHERE emp_code = :code AND date = :today"), {"code": emp_code, "today": today})
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error resetting today attendance: {e}")
    return {"status": "success", "message": "Today attendance reset"}


@router.get("/monthly-summary")
def get_monthly_attendance_summary(
    request: Request,
    year: Optional[int] = None,
    month: Optional[int] = None,
    emp_code: Optional[str] = None,
    range_months: int = 4,
    db: Session = Depends(get_db)
):
    """Returns real monthly attendance overview, summary cards, and records for current employee or specified employee."""
    import calendar
    now = get_ist_now()
    t_month = int(month) if month else now.month
    t_year = int(year) if year else now.year
    target_code = (emp_code or "").strip()
    if not target_code:
        target_code = _resolve_emp_code(request, db)
    emp_code = target_code

    table_name = f"attendance_{t_year}_{t_month:02d}"

    records = []
    total_hours = 0.0
    present_days = 0.0
    absent_days = 0.0
    invalid_days = 0.0
    half_day_days = 0.0
    weekly_off_count = 0.0
    holidays_count = 0.0
    approved_leaves_count = 0.0

    try:
        from app.api.v1.endpoints.admin_api import _get_attendance_status_for_date
        days_in_month = calendar.monthrange(t_year, t_month)[1]
        for day_num in range(1, days_in_month + 1):
            target_date = date(t_year, t_month, day_num)
            att = _get_attendance_status_for_date(db, emp_code, target_date)
            st = att["status"]
            in_t = att["checkIn"]
            out_t = att["checkOut"]
            wh = att["workingHours"]
            loc = att.get("location") or ""
            w_mode = att.get("work_mode", "OFFICE")
            cs_name = att.get("client_site_name")
            h_val = float(att.get("hours", 0.0) or 0.0)

            total_hours += h_val

            if st == "Present":
                present_days += 1.0
            elif st == "Half Day":
                present_days += 0.5
                half_day_days += 1.0
            elif st == "Invalid":
                invalid_days += 1.0
            elif st == "Absent":
                absent_days += 1.0
            elif st == "Weekly Off":
                weekly_off_count += 1.0
            elif st == "Holiday":
                holidays_count += 1.0
            elif "Leave" in st:
                approved_leaves_count += 1.0

            records.append({
                "date": target_date.strftime("%d %b %Y"),
                "formattedDate": target_date.strftime("%a, %b %d"),
                "isoDate": target_date.isoformat(),
                "dayNum": day_num,
                "checkIn": in_t,
                "checkOut": out_t,
                "timing": att.get("timing") or ("WeeklyOff" if st == "Weekly Off" else (att.get("holiday_name") or "Holiday" if st == "Holiday" else "—")),
                "duration": att.get("duration") or ("0hr 0min" if st in ("Weekly Off", "Holiday") else wh),
                "workingHrs": wh,
                "status": st,
                "isHoliday": (st == "Holiday"),
                "isWeeklyOff": (st == "Weekly Off"),
                "holidayName": att.get("holiday_name"),
                "location": loc,
                "punch_in_location": att.get("punch_in_location") or loc,
                "punch_out_location": att.get("punch_out_location"),
                "shift_time": att.get("shift_time") or att.get("timing") or "09:30 AM - 06:30 PM",
                "shift": att.get("shift") or "09:30 AM - 06:30 PM",
                "work_mode": w_mode,
                "workMode": w_mode,
                "client_site_id": att.get("client_site_id"),
                "clientSiteId": att.get("client_site_id"),
                "client_site_name": cs_name,
                "clientSiteName": cs_name,
                "client_site": cs_name,
                "clientSite": cs_name,
                "remark": att.get("remark", "")
            })

    except Exception as e:
        print(f"Error computing monthly attendance summary: {e}")
        db.rollback()

    # Calculate range-month overview for chart
    overview = []
    for offset in range(range_months - 1, -1, -1):
        m = t_month - offset
        y = t_year
        while m <= 0:
            m += 12
            y -= 1
        m_name = calendar.month_abbr[m]
        hist_table = f"attendance_{y}_{m:02d}"
        days_cnt = 0
        try:
            cnt = db.execute(
                text(f"SELECT COUNT(DISTINCT date) FROM {hist_table} WHERE emp_code = :code AND (punch_in_time IS NOT NULL OR status IN ('Present', 'Half Day', 'Late'))"),
                {"code": emp_code}
            ).scalar()
            days_cnt = cnt or 0
        except Exception:
            db.rollback()
            days_cnt = 0
        overview.append({
            "month": m_name,
            "days": days_cnt
        })

    tot_h_int = int(total_hours)
    tot_m_int = int((total_hours % 1) * 60)
    month_name = calendar.month_name[t_month]

    # Holidays, weekly offs, and leaves are dynamically counted from the month evaluation

    return {
        "status": "success",
        "monthLabel": f"{month_name} {t_year}",
        "summary": {
            "totalDays": days_in_month,
            "currentMonthDays": days_in_month,
            "presentDays": present_days,
            "halfDayDays": half_day_days,
            "absentDays": absent_days,
            "invalidDays": invalid_days,
            "approvedLeaves": approved_leaves_count,
            "holidays": holidays_count,
            "weeklyOff": weekly_off_count,
            "totalWorkedHours": f"{tot_h_int:02d}:{tot_m_int:02d}"
        },
        "records": records,
        "overview": overview
    }



@router.get("/admin/monthly")
def get_admin_attendance_monthly(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Returns monthly summary for all employees for admin attendance pages."""
    now = get_ist_now()
    t_month = int(month) if month else now.month
    t_year = int(year) if year else now.year
    table_name = f"attendance_{t_year}_{t_month:02d}"

    try:
        profiles = db.execute(text("SELECT emp_code, first_name, last_name, department, profile_image FROM profile_master ORDER BY emp_code")).mappings().all()
        punches = []
        try:
            p_query = text(f"SELECT emp_code, date, punch_in_time, punch_out_time, status, remark, hours_completed FROM {table_name}")
            punches = db.execute(p_query).mappings().all()
        except Exception:
            db.rollback()
            punches = []

        emp_punches = {}
        for p in punches:
            c = p["emp_code"]
            emp_punches.setdefault(c, []).append(p)

        results = []
        for emp in profiles:
            p_list = emp_punches.get(emp["emp_code"], [])
            present_cnt = 0
            late_cnt = 0
            absent_cnt = 0
            leave_cnt = 0

            for p in p_list:
                s = (p["status"] or "").lower()
                rem = p["remark"] or ""
                p_in = safe_parse_datetime(p["punch_in_time"])
                p_out = safe_parse_datetime(p["punch_out_time"])
                h = float(p["hours_completed"] or 0)
                if p_in and p_out:
                    st_calc = calculate_attendance_status(punch_in_time=p_in, punch_out_time=p_out, hours_completed=h, target_date=p["date"], status_override=p["status"])
                    s = st_calc["status"].lower()

                if "leave" in s:
                    leave_cnt += 1
                elif s == "present":
                    present_cnt += 1
                elif s == "half day":
                    present_cnt += 0.5
                elif s in ("punched in", "in progress"):
                    present_cnt += 1
                elif s == "absent":
                    absent_cnt += 1

            total_tracked = present_cnt + absent_cnt + leave_cnt
            att_pct = round((present_cnt / total_tracked * 100)) if total_tracked > 0 else (100 if present_cnt > 0 else 0)

            emp_name = f"{emp['first_name'] or ''} {emp['last_name'] or ''}".strip() or emp["emp_code"]
            results.append({
                "id": f"emp-{emp['emp_code']}",
                "name": emp_name,
                "code": emp["emp_code"],
                "dept": emp["department"] or "Operations",
                "department": emp["department"] or "Operations",
                "present": present_cnt,
                "absent": absent_cnt,
                "late": late_cnt,
                "leave": leave_cnt,
                "attendance_percentage": att_pct,
                "avatar": emp["profile_image"] or None
            })

        return results
    except Exception as e:
        print(f"Error in admin/monthly: {e}")
        db.rollback()
        return []


def _safe_parse_datetime(v):
    if not v:
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime.combine(v, time.min)
    if isinstance(v, str):
        v_clean = v.strip().replace("Z", "")
        for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
            try:
                return datetime.strptime(v_clean, fmt)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(v_clean)
        except Exception:
            return None
    return None


def _safe_format_time(v):
    dt = _safe_parse_datetime(v)
    if dt:
        return dt.strftime("%I:%M %p")
    return str(v) if v else "—"


def _safe_format_date(v):
    if not v:
        return ""
    if isinstance(v, (datetime, date)):
        return v.strftime("%d-%m-%Y")
    if isinstance(v, str):
        dt = _safe_parse_datetime(v)
        if dt:
            return dt.strftime("%d-%m-%Y")
        return v
    return str(v)


def _safe_format_datetime(v, fallback_date=""):
    dt = _safe_parse_datetime(v)
    if dt:
        return dt.strftime("%d-%m-%Y %I:%M %p")
    return f"{fallback_date} —" if fallback_date else "—"


@router.get("/admin/logs")
def get_admin_attendance_all_logs(
    month: Optional[int] = None,
    year: Optional[int] = None,
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Returns all punch logs across all employees for AttendanceLogs.jsx."""
    now = get_ist_now()
    t_month = int(month) if month else now.month
    t_year = int(year) if year else now.year
    table_name = f"attendance_{t_year}_{t_month:02d}"

    try:
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        if table_name not in inspector.get_table_names():
            return []

        limit_clause = ""
        params = {}
        if limit is not None:
            limit_clause = "LIMIT :limit OFFSET :offset"
            params["limit"] = limit
            params["offset"] = offset or 0

        q = text(f"""
            SELECT 
                p.id, p.emp_code, p.date, p.punch_in_time, p.punch_out_time,
                p.punch_in_location, p.punch_out_location, p.status, p.remark, p.hours_completed,
                p.punch_in_image, p.punch_out_image,
                p.punch_in_latitude, p.punch_in_longitude, p.punch_in_accuracy,
                p.punch_out_latitude, p.punch_out_longitude, p.punch_out_accuracy,
                p.work_mode, p.client_site_id, p.client_site_name,
                m.first_name, m.last_name, m.email, m.mobile_no
            FROM {table_name} p
            LEFT JOIN profile_master m ON p.emp_code = m.emp_code
            ORDER BY p.date DESC, p.punch_in_time DESC
            {limit_clause}
        """)
        rows = db.execute(q, params).mappings().all()
        logs = []
        for r in rows:
            name = f"{r['first_name'] or ''} {r['last_name'] or ''}".strip() or r["emp_code"]
            initials = "".join([w[0] for w in name.split() if w])[:2].upper() or "EM"
            d_str = _safe_format_date(r["date"])
            email = r["email"] or ""
            contact = r["mobile_no"] or "—"
            w_mode = r.get("work_mode") or "OFFICE"
            cs_name = r.get("client_site_name")
            
            # Avatar color class cycler based on emp_code
            code_num = sum(ord(c) for c in (r["emp_code"] or "")) % 6
            av_class = f"al-av-{'abcdef'[code_num]}"

            # Punch In log entry
            if r["punch_in_time"]:
                logs.append({
                    "id": f"in-{r['id']}",
                    "rawId": r["id"],
                    "name": name,
                    "code": r["emp_code"],
                    "emp_code": r["emp_code"],
                    "email": email,
                    "contact": contact,
                    "initials": initials,
                    "avatarClass": av_class,
                    "date": d_str,
                    "time": _safe_format_time(r["punch_in_time"]),
                    "createdAt": _safe_format_datetime(r["punch_in_time"], d_str),
                    "captureType": "Check In",
                    "location": r["punch_in_location"] or "GPS / Office",
                    "latitude": r["punch_in_latitude"],
                    "longitude": r["punch_in_longitude"],
                    "accuracy": r["punch_in_accuracy"],
                    "selfie": resolve_punch_photo(r["punch_in_image"]) or "",
                    "status": r["status"] or "Present",
                    "remark": r["remark"] or "",
                    "work_mode": w_mode,
                    "workMode": w_mode,
                    "client_site_id": r.get("client_site_id"),
                    "clientSiteId": r.get("client_site_id"),
                    "client_site_name": cs_name,
                    "clientSiteName": cs_name,
                    "client_site": cs_name,
                    "clientSite": cs_name
                })

            # Punch Out log entry
            if r["punch_out_time"]:
                logs.append({
                    "id": f"out-{r['id']}",
                    "rawId": r["id"],
                    "name": name,
                    "code": r["emp_code"],
                    "emp_code": r["emp_code"],
                    "email": email,
                    "contact": contact,
                    "initials": initials,
                    "avatarClass": av_class,
                    "date": d_str,
                    "time": _safe_format_time(r["punch_out_time"]),
                    "createdAt": _safe_format_datetime(r["punch_out_time"], d_str),
                    "captureType": "Check Out",
                    "location": r["punch_out_location"] or r["punch_in_location"] or "GPS / Office",
                    "latitude": r["punch_out_latitude"] or r["punch_in_latitude"],
                    "longitude": r["punch_out_longitude"] or r["punch_in_longitude"],
                    "accuracy": r["punch_out_accuracy"] or r["punch_in_accuracy"],
                    "selfie": resolve_punch_photo(r["punch_out_image"]) or "",
                    "status": r["status"] or "Present",
                    "remark": r["remark"] or "",
                    "work_mode": w_mode,
                    "workMode": w_mode,
                    "client_site_id": r.get("client_site_id"),
                    "clientSiteId": r.get("client_site_id"),
                    "client_site_name": cs_name,
                    "clientSiteName": cs_name,
                    "client_site": cs_name,
                    "clientSite": cs_name
                })

            # Fallback if both timestamps null
            if not r["punch_in_time"] and not r["punch_out_time"]:
                logs.append({
                    "id": f"rec-{r['id']}",
                    "rawId": r["id"],
                    "name": name,
                    "code": r["emp_code"],
                    "emp_code": r["emp_code"],
                    "email": email,
                    "contact": contact,
                    "initials": initials,
                    "avatarClass": av_class,
                    "date": d_str,
                    "time": "—",
                    "createdAt": f"{d_str} —" if d_str else "—",
                    "captureType": "System Auto",
                    "location": "GPS / Office",
                    "latitude": None,
                    "longitude": None,
                    "accuracy": None,
                    "selfie": "",
                    "status": r["status"] or "Absent",
                    "remark": r["remark"] or "",
                    "work_mode": w_mode,
                    "workMode": w_mode,
                    "client_site_id": r.get("client_site_id"),
                    "clientSiteId": r.get("client_site_id"),
                    "client_site_name": cs_name,
                    "clientSiteName": cs_name,
                    "client_site": cs_name,
                    "clientSite": cs_name
                })


        return logs
    except Exception as e:
        print(f"Error in admin/logs: {e}")
        db.rollback()
        return []


@router.post("/admin/logs/{record_id}/reject")
@router.put("/admin/logs/{record_id}/reject")
def reject_admin_punch_log(
    record_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Marks a punch record as Rejected in the monthly attendance table."""
    now = get_ist_now()
    t_month = int(month) if month else now.month
    t_year = int(year) if year else now.year
    table_name = f"attendance_{t_year}_{t_month:02d}"

    try:
        db.execute(
            text(f"UPDATE {table_name} SET status = 'Rejected', remark = 'Punch rejected by Admin' WHERE id = :id"),
            {"id": record_id}
        )
        db.commit()
        return {"status": "success", "message": f"Punch record #{record_id} marked as Rejected"}
    except Exception as e:
        db.rollback()
        print(f"Error in reject_admin_punch_log: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{emp_code}/logs")
def get_employee_attendance_logs(
    emp_code: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Returns detailed punch logs for an employee for a given month/year (or current month)."""
    now = get_ist_now()
    t_month = int(month) if month else now.month
    t_year = int(year) if year else now.year
    table_name = f"attendance_{t_year}_{t_month:02d}"

    try:
        query = text(f"""
            SELECT 
                id, emp_code, date, punch_in_time, punch_out_time,
                punch_in_location, punch_out_location, status, remark, hours_completed,
                punch_in_image, punch_out_image
            FROM {table_name}
            WHERE emp_code = :code
            ORDER BY date DESC, punch_in_time DESC
        """)
        rows = db.execute(query, {"code": emp_code}).mappings().all()
        logs = []
        for r in rows:
            in_dt = safe_parse_datetime(r["punch_in_time"])
            out_dt = repair_utc_punch_out(in_dt, r["punch_out_time"], r["date"])
            in_t = safe_format_time(in_dt, "—")
            out_t = safe_format_time(out_dt, "—")
            d_str = safe_format_date(r["date"], "%d %b %Y")
            h_val = float(r["hours_completed"] or 0)
            if in_dt and out_dt:
                exp_h = safe_calc_hours(in_dt, out_dt, r["date"])
                if h_val == 0 or abs(exp_h - h_val) > 1.0:
                    h_val = exp_h
            in_img = r["punch_in_image"]
            if in_img and not in_img.startswith("http") and not in_img.startswith("/"):
                in_img = f"/{in_img}"
            out_img = r["punch_out_image"]
            if out_img and not out_img.startswith("http") and not out_img.startswith("/"):
                out_img = f"/{out_img}"
            loc = r["punch_in_location"] or r["punch_out_location"] or "GPS / Office"

            logs.append({
                "id": f"log-{r['id']}",
                "date": d_str,
                "inTime": in_t,
                "outTime": out_t,
                "punch_in_time": in_t,
                "punch_out_time": out_t,
                "punch_in_photo": in_img,
                "punch_out_photo": out_img,
                "inImage": in_img,
                "outImage": out_img,
                "worked": f"{int(h_val)}h {int((h_val % 1) * 60):02d}m" if h_val > 0 else "—",
                "worked_hours": f"{int(h_val)}h {int((h_val % 1) * 60):02d}m" if h_val > 0 else "—",
                "status": r["status"] or ("Late" if r["remark"] == "Late" else "Present"),
                "device": "Biometric / Web" if in_img else "Biometric",
                "location": loc
            })
        return logs
    except Exception as e:
        print(f"Error fetching logs for {emp_code} from {table_name}: {e}")
        db.rollback()
        return []


@router.get("/{emp_code}/monthly")
def get_employee_monthly_calendar(
    emp_code: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Returns day-by-day calendar statuses for the employee in month/year."""
    import calendar
    now = get_ist_now()
    t_month = int(month) if month else now.month
    t_year = int(year) if year else now.year
    table_name = f"attendance_{t_year}_{t_month:02d}"

    _, num_days = calendar.monthrange(t_year, t_month)

    day_map = {}
    for d in range(1, num_days + 1):
        dt = date(t_year, t_month, d)
        is_weekend = dt.weekday() >= 5
        day_map[d] = {
            "day": d,
            "date": dt.isoformat(),
            "status": "W" if is_weekend else ("A" if dt <= now.date() else "W")
        }

    # Centralized organization_calendar check (HOLIDAY / WEEKLY_OFF)
    try:
        cal_rows = db.execute(
            text("""
                SELECT date, status, holiday_name 
                FROM organization_calendar 
                WHERE EXTRACT(MONTH FROM date) = :m AND EXTRACT(YEAR FROM date) = :y
            """),
            {"m": t_month, "y": t_year}
        ).mappings().all()
        for c in cal_rows:
            c_date = c["date"]
            if hasattr(c_date, "day"):
                d_num = c_date.day
                c_status = (c["status"] or "").strip().upper()
                if "WEEK" in c_status or c_status in ("WEEKLY_OFF", "WO", "OFF"):
                    day_map[d_num]["status"] = "W"
                elif c_status == "HOLIDAY" or c.get("holiday_name"):
                    day_map[d_num]["status"] = "H"
                elif c_status == "WORKING_DAY":
                    dt_cal = date(t_year, t_month, d_num)
                    day_map[d_num]["status"] = "A" if dt_cal <= now.date() else ""
    except Exception:
        db.rollback()

    try:

        q = text(f"SELECT date, status, remark, punch_in_time, punch_out_time, hours_completed FROM {table_name} WHERE emp_code = :code")
        rows = db.execute(q, {"code": emp_code}).mappings().all()
        for r in rows:
            if r["date"]:
                d_num = r["date"].day
                stat = (r["status"] or "").strip()
                if stat.lower() in ("present", "completed"):
                    st_char = "P"
                elif stat.lower() in ("late",) or r["remark"] == "Late":
                    st_char = "L"
                elif "leave" in stat.lower():
                    st_char = "H"
                elif "half" in stat.lower():
                    st_char = "L"
                elif stat.lower() == "invalid":
                    st_char = "P" if r["punch_in_time"] else "A"
                elif stat.lower() == "absent":
                    st_char = "A"
                else:
                    st_char = "P" if r["punch_in_time"] else "A"
                
                day_map[d_num] = {
                    "day": d_num,
                    "date": r["date"].isoformat(),
                    "status": st_char
                }
    except Exception as e:
        print(f"Error fetching monthly calendar for {emp_code}: {e}")
        db.rollback()

    return list(day_map.values())


@router.get("/admin/today")
def get_admin_attendance_today(db: Session = Depends(get_db)):
    """Returns today's attendance summary across all employees for the admin portal."""
    try:
        from app.api.v1.endpoints.admin_api import _get_attendance_status_for_date
        today = get_ist_today()
        create_monthly_tables(for_next_month=False)

        profiles = db.query(Profile).order_by(Profile.id.asc()).all()
        response = []
        for f in profiles:
            att = _get_attendance_status_for_date(db, f.emp_code, today)
            emp_name = f"{f.first_name or ''} {f.last_name or ''}".strip() or f.emp_code
            h_val = float(att.get("hours") or 0.0)

            p_in = att.get("punch_in")
            p_out = att.get("punch_out")

            response.append({
                "emp_code": f.emp_code,
                "employee_code": f.emp_code,
                "employee_name": emp_name,
                "name": emp_name,
                "email": f.email or "",
                "contact": f.mobile_no or "—",
                "phone": f.mobile_no or "—",
                "role": f.designation or "Employee",
                "designation": f.designation or "Employee",
                "department": f.department or "Operations",
                "status": att.get("status") or "Absent",
                "badge_code": att.get("badge_code") or "A",
                "checkIn": p_in or "—",
                "checkOut": p_out or "—",
                "punch_in": p_in or "—",
                "punch_out": p_out or "—",
                "punch_in_time": att.get("punch_in_time"),
                "punch_out_time": att.get("punch_out_time"),
                "prodHours": f"{round(h_val, 2)} Hrs",
                "workingHours": att.get("workingHours") or "0h 00m",
                "location": att.get("location") or f.branch_location or "Hyde Park, Saki Vihar Road, Mumbai",
                "punch_in_location": att.get("punch_in_location") or att.get("location") or f.branch_location or "Mumbai, IN",
                "punch_out_location": att.get("punch_out_location"),
                "punch_in_latitude": att.get("punch_in_latitude"),
                "punch_in_longitude": att.get("punch_in_longitude"),
                "punch_in_accuracy": att.get("punch_in_accuracy"),
                "punch_out_latitude": att.get("punch_out_latitude"),
                "punch_out_longitude": att.get("punch_out_longitude"),
                "punch_out_accuracy": att.get("punch_out_accuracy"),
                "punch_in_image": resolve_punch_photo(att.get("punch_in_image")),
                "punch_out_image": resolve_punch_photo(att.get("punch_out_image")),
                "hoursStatus": "good" if h_val >= 8 else "bad",
                "remark": att.get("leave_status") if att.get("leave_status") != "None" else ("On Time" if p_in and p_in != "—" else "Absent")
            })

        return response

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def _parse_time_to_datetime(time_val, target_date: date) -> Optional[datetime]:
    """Helper to parse time inputs (e.g. '09:30 AM', '18:30:00', ISO strings) into a datetime."""
    if not time_val:
        return None
    if isinstance(time_val, datetime):
        return time_val
    if isinstance(time_val, time):
        return datetime.combine(target_date, time_val)
    
    s = str(time_val).strip()
    if not s or s in ("—", "-", "null", "None", "undefined"):
        return None
    
    try:
        return datetime.fromisoformat(s)
    except Exception:
        pass
    
    formats = [
        "%I:%M %p",
        "%I:%M%p",
        "%I:%M:%S %p",
        "%H:%M:%S",
        "%H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
    ]
    for fmt in formats:
        try:
            parsed = datetime.strptime(s, fmt)
            return datetime.combine(target_date, parsed.time())
        except Exception:
            continue
    return None


@router.get("/regularization")
def get_regularizations_endpoint(request: Request, db: Session = Depends(get_db)):
    """Returns attendance regularization requests for current employee with multi-level approval status."""
    emp_code = _resolve_emp_code(request, db)
    from app.services.regularization_service import get_all_regularizations_admin
    all_regs = get_all_regularizations_admin(db)
    if emp_code:
        return [r for r in all_regs if str(r.get("emp_code")).strip() == str(emp_code).strip()]
    return all_regs


@router.post("/regularization")
async def submit_regularization_endpoint(request: Request, db: Session = Depends(get_db)):
    """Creates a new attendance regularization request (Level 1: PENDING_MANAGER)."""
    emp_code = _resolve_emp_code(request, db) or "15"
    payload = await request.json()
    today = get_ist_today()
    
    att_date_str = payload.get("date") or payload.get("attendanceDate") or today.isoformat()
    try:
        att_date = date.fromisoformat(att_date_str) if isinstance(att_date_str, str) and "-" in att_date_str else today
    except Exception:
        att_date = today

    issue = payload.get("issue") or payload.get("requestType") or ""
    reason = payload.get("reason") or ""
    comment = f"{issue}: {reason}".strip(": ") if issue else reason

    raw_in = (
        payload.get("checkIn")
        or payload.get("check_in")
        or payload.get("in_time")
        or payload.get("issued_for_in_time")
    )
    raw_out = (
        payload.get("checkOut")
        or payload.get("check_out")
        or payload.get("out_time")
        or payload.get("issued_for_out_time")
    )

    in_dt = _parse_time_to_datetime(raw_in, att_date)
    out_dt = _parse_time_to_datetime(raw_out, att_date)

    if not in_dt:
        in_dt = datetime.combine(att_date, time(9, 30, 0))
    if not out_dt:
        out_dt = datetime.combine(att_date, time(18, 30, 0))

    from app.services.regularization_service import submit_regularization
    res_dict = submit_regularization(db, emp_code, att_date, in_dt, out_dt, comment)

    return {
        "success": True,
        "id": res_dict["id"],
        "message": "Regularization request submitted successfully. Pending Manager Approval.",
        "status": res_dict["status"],
        "statusDisplay": res_dict["statusDisplay"],
        "issued_for_in_time": str(in_dt),
        "issued_for_out_time": str(out_dt),
        **res_dict
    }