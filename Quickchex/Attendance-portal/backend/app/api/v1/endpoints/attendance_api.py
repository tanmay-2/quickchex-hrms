import os
import shutil
import base64
import time as time_mod
import traceback
from datetime import datetime, time, date
from typing import List, Optional , Any

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from jose import jwt

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
    safe_calc_hours
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_monthly_table_name(date_obj: date):
    """Generates the dynamic table name based on the current year and month."""
    return f"attendance_{date_obj.year}_{date_obj.month:02d}"


def _resolve_emp_code(request: Request, db: Session, fallback_data: dict = None) -> str:
    """Safely extracts the employee code from JWT, custom headers, or request payload."""
    fallback_data = fallback_data or {}

    # 1. Bearer Token
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            emp_code = payload.get("emp_code")
            if emp_code:
                return str(emp_code).strip()
            sub = payload.get("sub")
            if sub:
                p = db.query(Profile).filter(Profile.email.ilike(str(sub).strip())).first()
                if p and p.emp_code:
                    return str(p.emp_code).strip()
        except Exception:
            pass

    # 2. Custom Employee Headers
    header_code = request.headers.get("x-emp-code") or request.headers.get("x-employee-id")
    if header_code and str(header_code).strip():
        p = db.query(Profile).filter(Profile.emp_code.ilike(str(header_code).strip())).first()
        if p and p.emp_code:
            return str(p.emp_code).strip()
        return str(header_code).strip()

    # 3. Email Lookup from headers
    email_hdr = request.headers.get("x-user-email") or request.headers.get("x-login-email")
    if email_hdr:
        p = db.query(Profile).filter(Profile.email.ilike(str(email_hdr).strip())).first()
        if p and p.emp_code:
            return str(p.emp_code).strip()

    # 4. Payload Body
    body_code = (
        fallback_data.get("emp_code")
        or fallback_data.get("employee_id")
        or fallback_data.get("employeeId")
        or fallback_data.get("employee_code")
    )
    if body_code and str(body_code).strip():
        p = db.query(Profile).filter(Profile.emp_code.ilike(str(body_code).strip())).first()
        if p and p.emp_code:
            return str(p.emp_code).strip()
        return str(body_code).strip()

    email_body = fallback_data.get("email")
    if email_body:
        p = db.query(Profile).filter(Profile.email.ilike(str(email_body).strip())).first()
        if p and p.emp_code:
            return str(p.emp_code).strip()

    # 5. Default Fallback
    first_profile = db.query(Profile).first()
    if first_profile and first_profile.emp_code:
        return str(first_profile.emp_code).strip()

    return "EMP001"


def _save_selfie(emp_code: str, selfie_data, file_upload: UploadFile = None) -> Optional[str]:
    """Saves selfie either from uploaded file or from base64 data-URL string."""
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S_%f")

        if file_upload and file_upload.filename:
            ext = os.path.splitext(file_upload.filename)[1] or ".jpg"
            dest_filename = f"punch_{emp_code}_{timestamp_str}{ext}"
            dest_path = os.path.join(UPLOAD_DIR, dest_filename)
            with open(dest_path, "wb") as buffer:
                shutil.copyfileobj(file_upload.file, buffer)
            return dest_path.replace("\\", "/")

        if isinstance(selfie_data, str) and "base64," in selfie_data:
            header, b64_part = selfie_data.split("base64,", 1)
            ext = ".png" if "png" in header.lower() else ".jpg"
            dest_filename = f"punch_{emp_code}_{timestamp_str}{ext}"
            dest_path = os.path.join(UPLOAD_DIR, dest_filename)
            img_bytes = base64.b64decode(b64_part)
            with open(dest_path, "wb") as f:
                f.write(img_bytes)
            return dest_path.replace("\\", "/")

        if isinstance(selfie_data, str) and selfie_data.strip():
            return selfie_data.strip()

    except Exception as e:
        print(f"[WARN] Error saving punch selfie: {e}")

    return None


def _format_location(raw_loc) -> str:
    """Formats location into standard string representation using reverse geocoding."""
    from app.services.geo_service import format_punch_location
    return format_punch_location(raw_loc)


def _process_punch(
    db: Session,
    emp_code: str,
    punch_type: str,
    location_input: Any,
    selfie_path: Optional[str],
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    accuracy: Optional[float] = None,
    timestamp_input: Optional[Any] = None
) -> dict:
    """Core punch handler ensuring record persistence and duplicate punch protection."""
    now = datetime.now()
    today = now.date()
    table_name = get_monthly_table_name(today)

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

    # Fetch existing punch row for today
    existing = db.execute(
        text(f"""
            SELECT id, punch_in_time, punch_out_time, punch_in_location, punch_out_location,
                   punch_in_latitude, punch_in_longitude, punch_in_accuracy,
                   punch_out_latitude, punch_out_longitude, punch_out_accuracy,
                   punch_in_image, punch_out_image, status, hours_completed
            FROM {table_name}
            WHERE emp_code = :code AND date = :today
            ORDER BY id DESC LIMIT 1
        """),
        {"code": emp_code, "today": today}
    ).mappings().first()

    is_in = punch_type in ["in", "check_in", "checkin"]
    is_recovery = punch_type in ["recovery", "recovery-in", "recovery_in"]
    is_out = punch_type in ["out", "check_out", "checkout"]

    # 1. PUNCH IN
    if is_in:
        if existing:
            if existing["punch_in_time"] and not existing["punch_out_time"]:
                raise HTTPException(
                    status_code=400,
                    detail="Employee has already punched in today."
                )
            if existing["punch_in_time"] and existing["punch_out_time"]:
                raise HTTPException(
                    status_code=400,
                    detail="You have already completed today's attendance."
                )

        res = db.execute(
            text(f"""
                INSERT INTO {table_name} (
                    emp_code, date, punch_in_time, punch_in_location, punch_in_image,
                    punch_in_latitude, punch_in_longitude, punch_in_accuracy,
                    status, remark
                ) VALUES (
                    :code, :date, :now, :loc, :img,
                    :lat, :lon, :acc,
                    'Punched In', :remark
                )
            """),
            {
                "code": emp_code,
                "date": today,
                "now": now,
                "loc": clean_location,
                "img": selfie_path,
                "lat": latitude,
                "lon": longitude,
                "acc": accuracy,
                "remark": punch_remark
            }
        )
        db.commit()
        row_id = getattr(res, "lastrowid", None) or getattr(res, "inserted_primary_key", [None])[0]

    # 2. RECOVERY PUNCH IN
    elif is_recovery:
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
                        remark = :remark
                    WHERE id = :id
                """),
                {
                    "now": now,
                    "loc": clean_location,
                    "img": selfie_path,
                    "lat": latitude,
                    "lon": longitude,
                    "acc": accuracy,
                    "remark": punch_remark,
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
                        status, remark
                    ) VALUES (
                        :code, :date, :now, :loc, :img,
                        :lat, :lon, :acc,
                        'Punched In', :remark
                    )
                """),
                {
                    "code": emp_code,
                    "date": today,
                    "now": now,
                    "loc": clean_location,
                    "img": selfie_path,
                    "lat": latitude,
                    "lon": longitude,
                    "acc": accuracy,
                    "remark": punch_remark
                }
            )
            row_id = getattr(res, "lastrowid", None)
        db.commit()

    # 3. PUNCH OUT
    else:
        if not existing or not existing["punch_in_time"]:
            raise HTTPException(
                status_code=400,
                detail="No active punch-in found for today. Please punch in first."
            )
        if existing["punch_out_time"]:
            raise HTTPException(
                status_code=400,
                detail="You have already completed today's attendance."
            )

        in_time = safe_parse_datetime(existing["punch_in_time"])
        if in_time and now < in_time:
            raise HTTPException(
                status_code=400,
                detail="Punch out time cannot be earlier than punch in time."
            )

        status_info = calculate_attendance_status(
            punch_in_time=in_time,
            punch_out_time=now,
            target_date=today
        )
        calculated_status = status_info["status"]
        hours = status_info["hours"]
        h_str = status_info["total_hours"]
        total_mins = status_info["total_minutes"]

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
                    status = :status
                WHERE id = :id
            """),
            {
                "now": now,
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

    return {
        "status": "success",
        "message": f"Punch In confirmed at {display_t}." if (is_in or is_recovery) else f"Punch Out confirmed at {display_t}.",
        "id": row_id,
        "type": "check_in" if (is_in or is_recovery) else "check_out",
        "punch_type": "in" if (is_in or is_recovery) else "out",
        "time": display_t,
        "checkIn": in_display,
        "checkOut": out_display,
        "punch_in_time": in_time_iso,
        "punch_out_time": out_time_iso,
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
        "punch_in_image": selfie_path if (is_in or is_recovery) else (existing.get("punch_in_image") if existing else None),
        "punch_out_image": selfie_path if is_out else None,
        "timestamp": now.isoformat(),
        "date": today.strftime("%d %b %Y"),
        "emp_code": emp_code,
        "employee_name": emp_name,
        "email": emp_email,
        "contact": emp_contact,
        "status": calculated_status if is_out else "Punched In",
        "attendance_status": calculated_status if is_out else "Punched In"
    }


# ==============================================================================
# PUNCH ROUTES (Accepts JSON & Form Data Seamlessly)
# ==============================================================================

@router.post("/punch")
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

    emp_code = _resolve_emp_code(request, db, body)
    punch_type = (
        body.get("punchType")
        or body.get("type")
        or body.get("punch_type")
        or "in"
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

    return _process_punch(
        db=db,
        emp_code=emp_code,
        punch_type=punch_type,
        location_input=raw_loc,
        selfie_path=selfie_path,
        latitude=lat,
        longitude=lon,
        accuracy=acc,
        timestamp_input=body.get("timestamp")
    )


@router.get("/today")
def get_today_attendance_record(request: Request, db: Session = Depends(get_db)):
    """Returns today's punch record for the authenticated employee."""
    emp_code = _resolve_emp_code(request, db)
    today = date.today()
    table_name = get_monthly_table_name(today)
    create_monthly_tables(for_next_month=False)

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
                punch_in_image, punch_out_image
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
                "employee": {
                    "name": emp_name,
                    "code": emp_code,
                    "email": email,
                    "contact": contact
                }
            }

        in_dt = safe_parse_datetime(r["punch_in_time"])
        out_dt = safe_parse_datetime(r["punch_out_time"])
        in_t = safe_format_time(in_dt, None)
        out_t = safe_format_time(out_dt, None)
        h_val = float(r["hours_completed"] or 0)
        if h_val == 0 and in_dt:
            h_val = safe_calc_hours(in_dt, out_dt, today)

        status_info = calculate_attendance_status(
            punch_in_time=in_dt,
            punch_out_time=out_dt,
            hours_completed=h_val,
            target_date=today,
            status_override=r["status"]
        )
        h_str = status_info["total_hours"]
        st = status_info["status"]
        h_val = status_info["hours"]

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
            "punch_in_image": r["punch_in_image"],
            "punch_out_image": r["punch_out_image"],
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
def get_attendance_records_api(request: Request, db: Session = Depends(get_db)):
    """Returns normalized attendance records for the active employee."""
    emp_code = _resolve_emp_code(request, db)
    today = date.today()
    table_name = get_monthly_table_name(today)

    create_monthly_tables(for_next_month=False)

    prof = db.query(Profile).filter(Profile.emp_code == emp_code).first() if emp_code else None
    emp_name = f"{prof.first_name or ''} {prof.last_name or ''}".strip() if prof else (emp_code or "Employee")
    email = prof.email if prof else ""
    contact = prof.mobile_no if prof else ""

    query = text(f"""
        SELECT 
            id, emp_code, date, punch_in_time, punch_out_time,
            punch_in_location, punch_out_location,
            punch_in_latitude, punch_in_longitude, punch_in_accuracy,
            punch_out_latitude, punch_out_longitude, punch_out_accuracy,
            status, remark, hours_completed,
            punch_in_image, punch_out_image
        FROM {table_name}
        {"WHERE emp_code = :code" if emp_code else ""}
        ORDER BY date DESC, punch_in_time DESC
    """)
    try:
        params = {"code": emp_code} if emp_code else {}
        results = db.execute(query, params).mappings().all()
        formatted = []
        for r in results:
            in_time_val = r["punch_in_time"]
            out_time_val = r["punch_out_time"]
            in_dt = safe_parse_datetime(in_time_val)
            out_dt = safe_parse_datetime(out_time_val)
            d_val = safe_parse_date(r["date"]) or today

            in_t = safe_format_time(in_time_val, "—")
            out_t = safe_format_time(out_time_val, "—")
            d_str = safe_format_date(r["date"], "%d %b %Y")
            h_val = round(float(r["hours_completed"] or 0), 2)
            if h_val == 0 and in_dt:
                h_val = safe_calc_hours(in_dt, out_dt, d_val)

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

            loc = r["punch_in_location"] or r["punch_out_location"] or ""

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
                "punch_in_location": r["punch_in_location"] or loc,
                "punch_out_location": r["punch_out_location"] or loc,
                "location": loc,
                "punch_in_latitude": r["punch_in_latitude"],
                "punch_in_longitude": r["punch_in_longitude"],
                "punch_in_accuracy": r["punch_in_accuracy"],
                "punch_out_latitude": r["punch_out_latitude"],
                "punch_out_longitude": r["punch_out_longitude"],
                "punch_out_accuracy": r["punch_out_accuracy"],
                "punch_in_image": r["punch_in_image"],
                "punch_out_image": r["punch_out_image"],
                "hours": h_val,
                "hours_completed": h_val,
                "total_minutes": status_info["total_minutes"],
                "total_hours": h_str,
                "workingHours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
                "working_hours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
                "status": st,
                "attendance_status": st,
                "remark": r["remark"] or "On Time"
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
    today = date.today()
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
    today = date.today()
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
    today = date.today()
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
    range_months: int = 4,
    db: Session = Depends(get_db)
):
    """Returns real monthly attendance overview, summary cards, and records for current employee."""
    import calendar
    now = datetime.now()
    t_month = int(month) if month else now.month
    t_year = int(year) if year else now.year
    emp_code = _resolve_emp_code(request, db)

    table_name = f"attendance_{t_year}_{t_month:02d}"

    records = []
    total_hours = 0.0
    present_days = 0.0
    absent_days = 0.0
    invalid_days = 0.0
    half_day_days = 0.0

    try:
        q = text(f"""
            SELECT id, date, punch_in_time, punch_out_time, punch_in_location, punch_out_location, hours_completed, status, remark
            FROM {table_name}
            WHERE emp_code = :code
            ORDER BY date DESC
        """)
        rows = db.execute(q, {"code": emp_code}).mappings().all()
        for r in rows:
            d_str = safe_format_date(r["date"], "%d %b %Y")
            d_val = safe_parse_date(r["date"])
            in_dt = safe_parse_datetime(r["punch_in_time"])
            out_dt = safe_parse_datetime(r["punch_out_time"])
            h_val = float(r["hours_completed"] or 0)
            if h_val == 0 and in_dt and out_dt:
                h_val = safe_calc_hours(in_dt, out_dt, d_val)

            status_info = calculate_attendance_status(
                punch_in_time=in_dt,
                punch_out_time=out_dt,
                hours_completed=h_val,
                target_date=d_val,
                status_override=r["status"]
            )
            st = status_info["status"]
            h_val = status_info["hours"]
            h_str = status_info["total_hours"]
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

            in_t = safe_format_time(r["punch_in_time"], "—")
            out_t = safe_format_time(r["punch_out_time"], "—")
            loc = r["punch_in_location"] or r["punch_out_location"] or ""

            records.append({
                "date": d_str,
                "checkIn": in_t,
                "checkOut": out_t,
                "workingHrs": h_str if (in_dt and (out_dt or d_val == now.date())) else "—",
                "status": st,
                "location": loc
            })
    except Exception as e:
        print(f"Error reading {table_name}: {e}")
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

    return {
        "status": "success",
        "monthLabel": f"{month_name} {t_year}",
        "summary": {
            "presentDays": present_days,
            "halfDayDays": half_day_days,
            "absentDays": absent_days,
            "invalidDays": invalid_days,
            "approvedLeaves": 0.0,
            "holidays": 0.0,
            "weeklyOff": 0.0,
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
    now = datetime.now()
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
    db: Session = Depends(get_db)
):
    """Returns all punch logs across all employees for AttendanceLogs.jsx."""
    now = datetime.now()
    t_month = int(month) if month else now.month
    t_year = int(year) if year else now.year
    table_name = f"attendance_{t_year}_{t_month:02d}"

    try:
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        if table_name not in inspector.get_table_names():
            return []

        q = text(f"""
            SELECT 
                p.id, p.emp_code, p.date, p.punch_in_time, p.punch_out_time,
                p.punch_in_location, p.punch_out_location, p.status, p.remark, p.hours_completed,
                p.punch_in_image, p.punch_out_image,
                p.punch_in_latitude, p.punch_in_longitude, p.punch_in_accuracy,
                p.punch_out_latitude, p.punch_out_longitude, p.punch_out_accuracy,
                m.first_name, m.last_name, m.email, m.mobile_no
            FROM {table_name} p
            LEFT JOIN profile_master m ON p.emp_code = m.emp_code
            ORDER BY p.date DESC, p.punch_in_time DESC
        """)
        rows = db.execute(q).mappings().all()
        logs = []
        for r in rows:
            name = f"{r['first_name'] or ''} {r['last_name'] or ''}".strip() or r["emp_code"]
            initials = "".join([w[0] for w in name.split() if w])[:2].upper() or "EM"
            d_str = _safe_format_date(r["date"])
            email = r["email"] or ""
            contact = r["mobile_no"] or "—"
            
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
                    "selfie": r["punch_in_image"] or "",
                    "status": r["status"] or "Present",
                    "remark": r["remark"] or ""
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
                    "selfie": r["punch_out_image"] or "",
                    "status": r["status"] or "Present",
                    "remark": r["remark"] or ""
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
                    "remark": r["remark"] or ""
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
    now = datetime.now()
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
    now = datetime.now()
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
            in_t = safe_format_time(r["punch_in_time"], "—")
            out_t = safe_format_time(r["punch_out_time"], "—")
            d_str = safe_format_date(r["date"], "%d %b %Y")
            h_val = float(r["hours_completed"] or 0)
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
    now = datetime.now()
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
        today = date.today()
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
                "punch_in_image": att.get("punch_in_image"),
                "punch_out_image": att.get("punch_out_image"),
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
    today = date.today()
    
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