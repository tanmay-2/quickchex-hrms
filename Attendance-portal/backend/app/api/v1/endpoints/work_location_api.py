# ==============================================================================
# QUICKCHEX HRMS BACKEND - WORK_LOCATION_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/work_location_api.py
# Purpose: FastAPI route controller handling 'work_location_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/settings') -> get_work_location_settings()
#   • router.put('/settings') -> update_work_location_settings()
#   • router.get('/client-sites') -> get_client_sites()
#   • router.post('/client-sites') -> create_client_site()
#   • router.put('/client-sites/{site_id}') -> update_client_site()
#   • router.delete('/client-sites/{site_id}') -> delete_client_site()
#   • router.get('/employee-permissions') -> get_all_employee_permissions()
#   • router.put('/employee-permissions/{emp_code}') -> update_employee_permissions()
#   • ... and 1 more endpoints
# Classes / Data Models:
#   • SettingsUpdateSchema
#   • ClientSiteCreateSchema
#   • ClientSiteUpdateSchema
#   • EmployeePermissionUpdateSchema
# ==============================================================================

import json
from typing import List, Optional, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.db.session import get_db
from app.models.work_location import ClientSite, AttendanceSettings, EmployeeWorkModeAssignment
from app.models.profile_model import Profile
from app.api.v1.endpoints.attendance_api import _resolve_emp_code
from app.services.attendance_service import safe_parse_datetime

router = APIRouter(prefix="/work-locations", tags=["Work Locations & Attendance Settings"])


# --- Pydantic Schemas ---

class SettingsUpdateSchema(BaseModel):
    office_name: Optional[str] = None
    office_address: Optional[str] = None
    office_latitude: Optional[float] = None
    office_longitude: Optional[float] = None
    office_radius: Optional[float] = None
    enforce_geofence: Optional[bool] = None
    wfh_enabled: Optional[bool] = None
    wfh_requires_approval: Optional[bool] = None
    wfh_requires_location: Optional[bool] = None
    wfh_requires_camera: Optional[bool] = None
    allowed_work_modes: Optional[List[str]] = None


class ClientSiteCreateSchema(BaseModel):
    name: str
    client_name: Optional[str] = None
    address: Optional[str] = None
    latitude: float
    longitude: float
    allowed_radius: Optional[float] = 200.0
    is_active: Optional[bool] = True


class ClientSiteUpdateSchema(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    allowed_radius: Optional[float] = None
    is_active: Optional[bool] = None


class EmployeePermissionUpdateSchema(BaseModel):
    allow_office: Optional[bool] = None
    allow_wfh: Optional[bool] = None
    allow_client_site: Optional[bool] = None
    assigned_client_site_ids: Optional[List[int]] = None


# --- Helper to get or create settings ---
def get_or_create_settings(db: Session) -> AttendanceSettings:
    settings = db.query(AttendanceSettings).first()
    if not settings:
        settings = AttendanceSettings(
            office_name="LA ESFERA Head Office",
            office_address="Kanjurmarg West, Mumbai, Maharashtra, 400078",
            office_latitude=19.1232,
            office_longitude=72.9284,
            office_radius=250.0,
            enforce_geofence=False,
            wfh_enabled=True,
            wfh_requires_approval=False,
            wfh_requires_location=True,
            wfh_requires_camera=True,
            allowed_work_modes='["OFFICE","WFH","CLIENT_SITE"]'
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


# ==============================================================================
# 1. SETTINGS ENDPOINTS
# ==============================================================================

@router.get("/settings")
def get_work_location_settings(db: Session = Depends(get_db)):
    """Fetch global attendance & work location settings."""
    s = get_or_create_settings(db)
    modes = []
    try:
        modes = json.loads(s.allowed_work_modes or '["OFFICE","WFH","CLIENT_SITE"]')
    except Exception:
        modes = ["OFFICE", "WFH", "CLIENT_SITE"]

    return {
        "office": {
            "name": s.office_name,
            "address": s.office_address,
            "latitude": s.office_latitude,
            "longitude": s.office_longitude,
            "allowed_radius": s.office_radius,
            "enforce_geofence": bool(s.enforce_geofence),
        },
        "wfh": {
            "enabled": bool(s.wfh_enabled),
            "requires_approval": bool(s.wfh_requires_approval),
            "requires_location": bool(s.wfh_requires_location),
            "requires_camera": bool(s.wfh_requires_camera),
        },
        "allowed_work_modes": modes
    }


@router.put("/settings")
def update_work_location_settings(payload: SettingsUpdateSchema, db: Session = Depends(get_db)):
    """Update global attendance & work location settings."""
    s = get_or_create_settings(db)

    if payload.office_name is not None:
        s.office_name = payload.office_name.strip()
    if payload.office_address is not None:
        s.office_address = payload.office_address.strip()
    if payload.office_latitude is not None:
        s.office_latitude = payload.office_latitude
    if payload.office_longitude is not None:
        s.office_longitude = payload.office_longitude
    if payload.office_radius is not None:
        s.office_radius = payload.office_radius
    if payload.enforce_geofence is not None:
        s.enforce_geofence = payload.enforce_geofence

    if payload.wfh_enabled is not None:
        s.wfh_enabled = payload.wfh_enabled
    if payload.wfh_requires_approval is not None:
        s.wfh_requires_approval = payload.wfh_requires_approval
    if payload.wfh_requires_location is not None:
        s.wfh_requires_location = payload.wfh_requires_location
    if payload.wfh_requires_camera is not None:
        s.wfh_requires_camera = payload.wfh_requires_camera

    if payload.allowed_work_modes is not None:
        s.allowed_work_modes = json.dumps(payload.allowed_work_modes)

    s.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(s)

    return {"status": "success", "message": "Attendance settings updated successfully."}


# ==============================================================================
# 2. CLIENT SITES CRUD ENDPOINTS
# ==============================================================================

@router.get("/client-sites")
def get_client_sites(active_only: bool = False, db: Session = Depends(get_db)):
    """Get all configured client sites."""
    query = db.query(ClientSite)
    if active_only:
        query = query.filter(ClientSite.is_active == True)
    sites = query.order_by(ClientSite.name.asc()).all()

    return [
        {
            "id": site.id,
            "name": site.name,
            "client_name": site.client_name or "",
            "address": site.address or "",
            "latitude": site.latitude,
            "longitude": site.longitude,
            "allowed_radius": site.allowed_radius or 200.0,
            "is_active": bool(site.is_active),
            "status": "Active" if site.is_active else "Inactive",
            "created_at": site.created_at.isoformat() if site.created_at else None,
            "updated_at": site.updated_at.isoformat() if site.updated_at else None,
        }
        for site in sites
    ]


@router.post("/client-sites")
def create_client_site(payload: ClientSiteCreateSchema, db: Session = Depends(get_db)):
    """Create a new client site dynamically."""
    name_clean = payload.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Site name is required.")

    # Check for existing duplicate site name
    existing = db.query(ClientSite).filter(ClientSite.name.ilike(name_clean)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Client site '{name_clean}' already exists.")

    new_site = ClientSite(
        name=name_clean,
        client_name=(payload.client_name or "").strip() or None,
        address=(payload.address or "").strip() or None,
        latitude=payload.latitude,
        longitude=payload.longitude,
        allowed_radius=payload.allowed_radius or 200.0,
        is_active=True if payload.is_active is None else payload.is_active,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_site)
    db.commit()
    db.refresh(new_site)

    return {
        "status": "success",
        "message": f"Client site '{name_clean}' created successfully.",
        "site": {
            "id": new_site.id,
            "name": new_site.name,
            "client_name": new_site.client_name or "",
            "address": new_site.address or "",
            "latitude": new_site.latitude,
            "longitude": new_site.longitude,
            "allowed_radius": new_site.allowed_radius,
            "is_active": bool(new_site.is_active),
            "status": "Active" if new_site.is_active else "Inactive",
        }
    }


@router.put("/client-sites/{site_id}")
def update_client_site(site_id: int, payload: ClientSiteUpdateSchema, db: Session = Depends(get_db)):
    """Update existing client site details or status."""
    site = db.query(ClientSite).filter(ClientSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Client site not found.")

    if payload.name is not None:
        name_clean = payload.name.strip()
        if not name_clean:
            raise HTTPException(status_code=400, detail="Site name cannot be empty.")
        # Check uniqueness if name changed
        if name_clean.lower() != site.name.lower():
            dup = db.query(ClientSite).filter(ClientSite.name.ilike(name_clean), ClientSite.id != site_id).first()
            if dup:
                raise HTTPException(status_code=400, detail=f"Another client site named '{name_clean}' already exists.")
        site.name = name_clean

    if payload.client_name is not None:
        site.client_name = payload.client_name.strip() or None
    if payload.address is not None:
        site.address = payload.address.strip() or None
    if payload.latitude is not None:
        site.latitude = payload.latitude
    if payload.longitude is not None:
        site.longitude = payload.longitude
    if payload.allowed_radius is not None:
        site.allowed_radius = payload.allowed_radius
    if payload.is_active is not None:
        site.is_active = payload.is_active

    site.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(site)

    return {
        "status": "success",
        "message": f"Client site '{site.name}' updated successfully.",
        "site": {
            "id": site.id,
            "name": site.name,
            "client_name": site.client_name or "",
            "address": site.address or "",
            "latitude": site.latitude,
            "longitude": site.longitude,
            "allowed_radius": site.allowed_radius,
            "is_active": bool(site.is_active),
            "status": "Active" if site.is_active else "Inactive",
        }
    }


@router.delete("/client-sites/{site_id}")
def delete_client_site(site_id: int, db: Session = Depends(get_db)):
    """Soft-deactivates or deletes client site."""
    site = db.query(ClientSite).filter(ClientSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Client site not found.")

    # Mark as inactive
    site.is_active = False
    site.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "success", "message": f"Client site '{site.name}' disabled successfully."}


# ==============================================================================
# 3. EMPLOYEE WORK MODE & SITE PERMISSIONS
# ==============================================================================

@router.get("/employee-permissions")
def get_all_employee_permissions(db: Session = Depends(get_db)):
    """Returns work mode permissions and assigned client sites for all employees."""
    profiles = db.query(Profile).filter(Profile.emp_code != None).order_by(Profile.emp_code.asc()).all()
    assignments = {a.emp_code: a for a in db.query(EmployeeWorkModeAssignment).all()}
    all_sites = {s.id: s for s in db.query(ClientSite).filter(ClientSite.is_active == True).all()}
    all_site_ids = list(all_sites.keys())

    results = []
    for p in profiles:
        assign = assignments.get(p.emp_code)
        if assign:
            allow_office = bool(assign.allow_office)
            allow_wfh = bool(assign.allow_wfh)
            allow_client_site = bool(assign.allow_client_site)
            try:
                assigned_site_ids = json.loads(assign.assigned_client_site_ids or "[]")
            except Exception:
                assigned_site_ids = []
        else:
            # Default for unconfigured employee: all allowed, all active sites assigned
            allow_office = True
            allow_wfh = True
            allow_client_site = True
            assigned_site_ids = all_site_ids

        assigned_sites_data = [
            {"id": s_id, "name": all_sites[s_id].name, "address": all_sites[s_id].address or ""}
            for s_id in assigned_site_ids if s_id in all_sites
        ]

        emp_name = f"{p.first_name or ''} {p.last_name or ''}".strip() or p.emp_code
        results.append({
            "emp_code": p.emp_code,
            "name": emp_name,
            "email": p.email or "",
            "contact": p.mobile_no or "",
            "department": p.department or "—",
            "role": p.designation or p.role or "Employee",
            "allow_office": allow_office,
            "allow_wfh": allow_wfh,
            "allow_client_site": allow_client_site,
            "assigned_client_site_ids": assigned_site_ids,
            "assigned_client_sites": assigned_sites_data
        })

    return results


@router.put("/employee-permissions/{emp_code}")
def update_employee_permissions(
    emp_code: str,
    payload: EmployeePermissionUpdateSchema,
    db: Session = Depends(get_db)
):
    """Updates work mode eligibility and client site assignments for an employee."""
    emp_code_clean = emp_code.strip()
    prof = db.query(Profile).filter(Profile.emp_code == emp_code_clean).first()
    if not prof:
        raise HTTPException(status_code=404, detail=f"Employee '{emp_code_clean}' not found.")

    assignment = db.query(EmployeeWorkModeAssignment).filter(
        EmployeeWorkModeAssignment.emp_code == emp_code_clean
    ).first()

    if not assignment:
        assignment = EmployeeWorkModeAssignment(emp_code=emp_code_clean)
        db.add(assignment)

    if payload.allow_office is not None:
        assignment.allow_office = payload.allow_office
    if payload.allow_wfh is not None:
        assignment.allow_wfh = payload.allow_wfh
    if payload.allow_client_site is not None:
        assignment.allow_client_site = payload.allow_client_site
    if payload.assigned_client_site_ids is not None:
        assignment.assigned_client_site_ids = json.dumps(payload.assigned_client_site_ids)

    assignment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)

    return {
        "status": "success",
        "message": f"Work mode permissions for {emp_code_clean} updated successfully.",
        "permissions": {
            "emp_code": emp_code_clean,
            "allow_office": bool(assignment.allow_office),
            "allow_wfh": bool(assignment.allow_wfh),
            "allow_client_site": bool(assignment.allow_client_site),
            "assigned_client_site_ids": json.loads(assignment.assigned_client_site_ids or "[]")
        }
    }


# ==============================================================================
# 4. MY PERMISSIONS (For Active Employee on Dashboard)
# ==============================================================================

@router.get("/my-permissions")
def get_my_work_mode_permissions(request: Request, db: Session = Depends(get_db)):
    """
    Returns allowed work modes and assigned client sites for current employee.
    Used by Employee Dashboard Today's Punch card to dynamically render
    Office, WFH, and Client Site options.
    """
    emp_code = _resolve_emp_code(request, db)
    settings = get_or_create_settings(db)

    # Fetch all active client sites
    active_sites = db.query(ClientSite).filter(ClientSite.is_active == True).order_by(ClientSite.name.asc()).all()
    active_site_map = {s.id: s for s in active_sites}
    all_site_ids = list(active_site_map.keys())

    # Fetch employee assignment
    assignment = db.query(EmployeeWorkModeAssignment).filter(
        EmployeeWorkModeAssignment.emp_code == emp_code
    ).first()

    if assignment:
        allow_office = bool(assignment.allow_office)
        allow_wfh = bool(assignment.allow_wfh) and bool(settings.wfh_enabled)
        allow_client_site = bool(assignment.allow_client_site)
        try:
            assigned_ids = json.loads(assignment.assigned_client_site_ids or "[]")
        except Exception:
            assigned_ids = []
    else:
        # Defaults if not customized
        allow_office = True
        allow_wfh = bool(settings.wfh_enabled)
        allow_client_site = True
        assigned_ids = all_site_ids

    # Resolve assigned client sites
    assigned_client_sites = [
        {
            "id": s.id,
            "name": s.name,
            "client_name": s.client_name or "",
            "address": s.address or "",
            "latitude": s.latitude,
            "longitude": s.longitude,
            "allowed_radius": s.allowed_radius or 200.0,
        }
        for s_id in assigned_ids
        if (s := active_site_map.get(s_id)) is not None
    ]

    allowed_modes = []
    if allow_office:
        allowed_modes.append("OFFICE")
    if allow_wfh:
        allowed_modes.append("WFH")
    if allow_client_site and len(assigned_client_sites) > 0:
        allowed_modes.append("CLIENT_SITE")

    return {
        "emp_code": emp_code,
        "allow_office": allow_office,
        "allow_wfh": allow_wfh,
        "allow_client_site": allow_client_site,
        "allowed_modes": allowed_modes,
        "assigned_client_sites": assigned_client_sites,
        "office": {
            "name": settings.office_name,
            "address": settings.office_address,
            "latitude": settings.office_latitude,
            "longitude": settings.office_longitude,
            "allowed_radius": settings.office_radius,
            "enforce_geofence": bool(settings.enforce_geofence),
        },
        "wfh": {
            "enabled": bool(settings.wfh_enabled),
            "requires_location": bool(settings.wfh_requires_location),
            "requires_camera": bool(settings.wfh_requires_camera),
        }
    }
