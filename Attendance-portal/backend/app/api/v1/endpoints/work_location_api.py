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

# Import module json for system functionality
import json
# Import List, Optional, Any from typing for module operations
from typing import List, Optional, Any
# Import datetime from datetime for module operations
from datetime import datetime
# Import APIRouter, Depends, HTTPException, Request from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, Request
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text from sqlalchemy for module operations
from sqlalchemy import text
# Import BaseModel from pydantic for module operations
from pydantic import BaseModel

# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import ClientSite, AttendanceSettings, EmployeeWorkModeAssignment from app.models.work_location for module operations
from app.models.work_location import ClientSite, AttendanceSettings, EmployeeWorkModeAssignment
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import _resolve_emp_code from app.api.v1.endpoints.attendance_api for module operations
from app.api.v1.endpoints.attendance_api import _resolve_emp_code
# Import safe_parse_datetime from app.services.attendance_service for module operations
from app.services.attendance_service import safe_parse_datetime

# Set router variable to store router value
router = APIRouter(prefix="/work-locations", tags=["Work Locations & Attendance Settings"])


# --- Pydantic Schemas ---

# Define class SettingsUpdateSchema inheriting from BaseModel
class SettingsUpdateSchema(BaseModel):
    # Define office_name schema field with type Optional[str] and default value
    office_name: Optional[str] = None
    # Define office_address schema field with type Optional[str] and default value
    office_address: Optional[str] = None
    # Define office_latitude schema field with type Optional[float] and default value
    office_latitude: Optional[float] = None
    # Define office_longitude schema field with type Optional[float] and default value
    office_longitude: Optional[float] = None
    # Define office_radius schema field with type Optional[float] and default value
    office_radius: Optional[float] = None
    # Define enforce_geofence schema field with type Optional[bool] and default value
    enforce_geofence: Optional[bool] = None
    # Define wfh_enabled schema field with type Optional[bool] and default value
    wfh_enabled: Optional[bool] = None
    # Define wfh_requires_approval schema field with type Optional[bool] and default value
    wfh_requires_approval: Optional[bool] = None
    # Define wfh_requires_location schema field with type Optional[bool] and default value
    wfh_requires_location: Optional[bool] = None
    # Define wfh_requires_camera schema field with type Optional[bool] and default value
    wfh_requires_camera: Optional[bool] = None
    # Define allowed_work_modes schema field with type Optional[List[str]] and default value
    allowed_work_modes: Optional[List[str]] = None


# Define class ClientSiteCreateSchema inheriting from BaseModel
class ClientSiteCreateSchema(BaseModel):
    # Define name schema field with type str
    name: str
    # Define client_name schema field with type Optional[str] and default value
    client_name: Optional[str] = None
    # Define address schema field with type Optional[str] and default value
    address: Optional[str] = None
    # Define latitude schema field with type float
    latitude: float
    # Define longitude schema field with type float
    longitude: float
    # Define allowed_radius schema field with type Optional[float] and default value
    allowed_radius: Optional[float] = 200.0
    # Define is_active schema field with type Optional[bool] and default value
    is_active: Optional[bool] = True


# Define class ClientSiteUpdateSchema inheriting from BaseModel
class ClientSiteUpdateSchema(BaseModel):
    # Define name schema field with type Optional[str] and default value
    name: Optional[str] = None
    # Define client_name schema field with type Optional[str] and default value
    client_name: Optional[str] = None
    # Define address schema field with type Optional[str] and default value
    address: Optional[str] = None
    # Define latitude schema field with type Optional[float] and default value
    latitude: Optional[float] = None
    # Define longitude schema field with type Optional[float] and default value
    longitude: Optional[float] = None
    # Define allowed_radius schema field with type Optional[float] and default value
    allowed_radius: Optional[float] = None
    # Define is_active schema field with type Optional[bool] and default value
    is_active: Optional[bool] = None


# Define class EmployeePermissionUpdateSchema inheriting from BaseModel
class EmployeePermissionUpdateSchema(BaseModel):
    # Define allow_office schema field with type Optional[bool] and default value
    allow_office: Optional[bool] = None
    # Define allow_wfh schema field with type Optional[bool] and default value
    allow_wfh: Optional[bool] = None
    # Define allow_client_site schema field with type Optional[bool] and default value
    allow_client_site: Optional[bool] = None
    # Define assigned_client_site_ids schema field with type Optional[List[int]] and default value
    assigned_client_site_ids: Optional[List[int]] = None


# --- Helper to get or create settings ---
def get_or_create_settings(db: Session) -> AttendanceSettings:
    # Initiate database query on specified model
    settings = db.query(AttendanceSettings).first()
    # Check if target condition is false or object is missing
    if not settings:
        # Set settings variable to store settings value
        settings = AttendanceSettings(
            # Set office_name variable to store office name value
            office_name="LA ESFERA Head Office",
            # Set office_address variable to store office address value
            office_address="1103 and 1104, Western Express Hwy, Saraswati Baug, Shankarwadi, Jogeshwari East, Mumbai, Maharashtra 400060",
            # Set office_latitude variable to store office latitude value
            office_latitude=19.1365,
            # Set office_longitude variable to store office longitude value
            office_longitude=72.8595,
            # Set office_radius variable to store office radius value
            office_radius=1000.0,
            # Set enforce_geofence variable to store enforce geofence value
            enforce_geofence=False,
            # Set wfh_enabled variable to store wfh enabled value
            wfh_enabled=True,
            # Set wfh_requires_approval variable to store wfh requires approval value
            wfh_requires_approval=False,
            # Set wfh_requires_location variable to store wfh requires location value
            wfh_requires_location=True,
            # Set wfh_requires_camera variable to store wfh requires camera value
            wfh_requires_camera=True,
            # Set allowed_work_modes variable to store allowed work modes value
            allowed_work_modes='["OFFICE","WFH","CLIENT_SITE"]'
        # Execute statement to process data and maintain state
        )
        # Stage new entity instance into database session
        db.add(settings)
        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(settings)
    # Return computed result or response payload to caller
    return settings


# ==============================================================================
# 1. SETTINGS ENDPOINTS
# ==============================================================================

# Define HTTP GET route endpoint handler
@router.get("/settings")
# Define get_work_location_settings function to handle get work location settings
def get_work_location_settings(db: Session = Depends(get_db)):
    """Fetch global attendance & work location settings."""
    s = get_or_create_settings(db)
    # Set modes variable to store modes value
    modes = []
    # Begin guarded execution block to trap exceptions
    try:
        # Set modes variable to store modes value
        modes = json.loads(s.allowed_work_modes or '["OFFICE","WFH","CLIENT_SITE"]')
    # Catch and handle specific exception if raised
    except Exception:
        # Set modes variable to store modes value
        modes = ["OFFICE", "WFH", "CLIENT_SITE"]

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "office": {
            # Execute statement to process data and maintain state
            "name": s.office_name,
            # Execute statement to process data and maintain state
            "address": s.office_address,
            # Execute statement to process data and maintain state
            "latitude": s.office_latitude,
            # Execute statement to process data and maintain state
            "longitude": s.office_longitude,
            # Execute statement to process data and maintain state
            "allowed_radius": s.office_radius,
            # Execute statement to process data and maintain state
            "enforce_geofence": bool(s.enforce_geofence),
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "wfh": {
            # Execute statement to process data and maintain state
            "enabled": bool(s.wfh_enabled),
            # Execute statement to process data and maintain state
            "requires_approval": bool(s.wfh_requires_approval),
            # Execute statement to process data and maintain state
            "requires_location": bool(s.wfh_requires_location),
            # Execute statement to process data and maintain state
            "requires_camera": bool(s.wfh_requires_camera),
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "allowed_work_modes": modes
    # Execute statement to process data and maintain state
    }


# Define HTTP PUT route endpoint handler
@router.put("/settings")
# Define update_work_location_settings function to handle update work location settings
def update_work_location_settings(payload: SettingsUpdateSchema, db: Session = Depends(get_db)):
    """Update global attendance & work location settings."""
    s = get_or_create_settings(db)

    # Check if target condition is false or object is missing
    if payload.office_name is not None:
        # Execute statement to process data and maintain state
        s.office_name = payload.office_name.strip()
    # Check if target condition is false or object is missing
    if payload.office_address is not None:
        # Execute statement to process data and maintain state
        s.office_address = payload.office_address.strip()
    # Check if target condition is false or object is missing
    if payload.office_latitude is not None:
        # Execute statement to process data and maintain state
        s.office_latitude = payload.office_latitude
    # Check if target condition is false or object is missing
    if payload.office_longitude is not None:
        # Execute statement to process data and maintain state
        s.office_longitude = payload.office_longitude
    # Check if target condition is false or object is missing
    if payload.office_radius is not None:
        # Execute statement to process data and maintain state
        s.office_radius = payload.office_radius
    # Check if target condition is false or object is missing
    if payload.enforce_geofence is not None:
        # Execute statement to process data and maintain state
        s.enforce_geofence = payload.enforce_geofence

    # Check if target condition is false or object is missing
    if payload.wfh_enabled is not None:
        # Execute statement to process data and maintain state
        s.wfh_enabled = payload.wfh_enabled
    # Check if target condition is false or object is missing
    if payload.wfh_requires_approval is not None:
        # Execute statement to process data and maintain state
        s.wfh_requires_approval = payload.wfh_requires_approval
    # Check if target condition is false or object is missing
    if payload.wfh_requires_location is not None:
        # Execute statement to process data and maintain state
        s.wfh_requires_location = payload.wfh_requires_location
    # Check if target condition is false or object is missing
    if payload.wfh_requires_camera is not None:
        # Execute statement to process data and maintain state
        s.wfh_requires_camera = payload.wfh_requires_camera

    # Check if target condition is false or object is missing
    if payload.allowed_work_modes is not None:
        # Execute statement to process data and maintain state
        s.allowed_work_modes = json.dumps(payload.allowed_work_modes)

    # Execute statement to process data and maintain state
    s.updated_at = datetime.utcnow()
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(s)

    # Return computed result or response payload to caller
    return {"status": "success", "message": "Attendance settings updated successfully."}


# ==============================================================================
# 2. CLIENT SITES CRUD ENDPOINTS
# ==============================================================================

# Define HTTP GET route endpoint handler
@router.get("/client-sites")
# Define get_client_sites function to handle get client sites
def get_client_sites(active_only: bool = False, db: Session = Depends(get_db)):
    """Get all configured client sites."""
    query = db.query(ClientSite)
    # Evaluate condition to control execution branch
    if active_only:
        # Set query variable to store query value
        query = query.filter(ClientSite.is_active == True)
    # Set sites variable to store sites value
    sites = query.order_by(ClientSite.name.asc()).all()

    # Return computed result or response payload to caller
    return [
        # Execute statement to process data and maintain state
        {
            # Execute statement to process data and maintain state
            "id": site.id,
            # Execute statement to process data and maintain state
            "name": site.name,
            # Execute statement to process data and maintain state
            "client_name": site.client_name or "",
            # Execute statement to process data and maintain state
            "address": site.address or "",
            # Execute statement to process data and maintain state
            "latitude": site.latitude,
            # Execute statement to process data and maintain state
            "longitude": site.longitude,
            # Execute statement to process data and maintain state
            "allowed_radius": site.allowed_radius or 200.0,
            # Execute statement to process data and maintain state
            "is_active": bool(site.is_active),
            # Execute statement to process data and maintain state
            "status": "Active" if site.is_active else "Inactive",
            # Execute statement to process data and maintain state
            "created_at": site.created_at.isoformat() if site.created_at else None,
            # Execute statement to process data and maintain state
            "updated_at": site.updated_at.isoformat() if site.updated_at else None,
        # Execute statement to process data and maintain state
        }
        # Iterate through items in sequence loop
        for site in sites
    # Execute statement to process data and maintain state
    ]


# Define HTTP POST route endpoint handler
@router.post("/client-sites")
# Define create_client_site function to handle create client site
def create_client_site(payload: ClientSiteCreateSchema, db: Session = Depends(get_db)):
    """Create a new client site dynamically."""
    name_clean = payload.name.strip()
    # Check if target condition is false or object is missing
    if not name_clean:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Site name is required.")

    # Check for existing duplicate site name
    existing = db.query(ClientSite).filter(ClientSite.name.ilike(name_clean)).first()
    # Evaluate condition to control execution branch
    if existing:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=f"Client site '{name_clean}' already exists.")

    # Set new_site variable to store new site value
    new_site = ClientSite(
        # Set name variable to store name value
        name=name_clean,
        # Set client_name variable to store client name value
        client_name=(payload.client_name or "").strip() or None,
        # Set address variable to store address value
        address=(payload.address or "").strip() or None,
        # Set latitude variable to store latitude value
        latitude=payload.latitude,
        # Set longitude variable to store longitude value
        longitude=payload.longitude,
        # Set allowed_radius variable to store allowed radius value
        allowed_radius=payload.allowed_radius or 200.0,
        # Set is_active variable to store is active value
        is_active=True if payload.is_active is None else payload.is_active,
        # Set created_at variable to store created at value
        created_at=datetime.utcnow(),
        # Set updated_at variable to store updated at value
        updated_at=datetime.utcnow()
    # Execute statement to process data and maintain state
    )
    # Stage new entity instance into database session
    db.add(new_site)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(new_site)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Client site '{name_clean}' created successfully.",
        # Execute statement to process data and maintain state
        "site": {
            # Execute statement to process data and maintain state
            "id": new_site.id,
            # Execute statement to process data and maintain state
            "name": new_site.name,
            # Execute statement to process data and maintain state
            "client_name": new_site.client_name or "",
            # Execute statement to process data and maintain state
            "address": new_site.address or "",
            # Execute statement to process data and maintain state
            "latitude": new_site.latitude,
            # Execute statement to process data and maintain state
            "longitude": new_site.longitude,
            # Execute statement to process data and maintain state
            "allowed_radius": new_site.allowed_radius,
            # Execute statement to process data and maintain state
            "is_active": bool(new_site.is_active),
            # Execute statement to process data and maintain state
            "status": "Active" if new_site.is_active else "Inactive",
        # Execute statement to process data and maintain state
        }
    # Execute statement to process data and maintain state
    }


# Define HTTP PUT route endpoint handler
@router.put("/client-sites/{site_id}")
# Define update_client_site function to handle update client site
def update_client_site(site_id: int, payload: ClientSiteUpdateSchema, db: Session = Depends(get_db)):
    """Update existing client site details or status."""
    site = db.query(ClientSite).filter(ClientSite.id == site_id).first()
    # Check if target condition is false or object is missing
    if not site:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Client site not found.")

    # Check if target condition is false or object is missing
    if payload.name is not None:
        # Set name_clean variable to store name clean value
        name_clean = payload.name.strip()
        # Check if target condition is false or object is missing
        if not name_clean:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=400, detail="Site name cannot be empty.")
        # Check uniqueness if name changed
        if name_clean.lower() != site.name.lower():
            # Initiate database query on specified model
            dup = db.query(ClientSite).filter(ClientSite.name.ilike(name_clean), ClientSite.id != site_id).first()
            # Evaluate condition to control execution branch
            if dup:
                # Raise HTTP exception with status code and error details
                raise HTTPException(status_code=400, detail=f"Another client site named '{name_clean}' already exists.")
        # Execute statement to process data and maintain state
        site.name = name_clean

    # Check if target condition is false or object is missing
    if payload.client_name is not None:
        # Execute statement to process data and maintain state
        site.client_name = payload.client_name.strip() or None
    # Check if target condition is false or object is missing
    if payload.address is not None:
        # Execute statement to process data and maintain state
        site.address = payload.address.strip() or None
    # Check if target condition is false or object is missing
    if payload.latitude is not None:
        # Execute statement to process data and maintain state
        site.latitude = payload.latitude
    # Check if target condition is false or object is missing
    if payload.longitude is not None:
        # Execute statement to process data and maintain state
        site.longitude = payload.longitude
    # Check if target condition is false or object is missing
    if payload.allowed_radius is not None:
        # Execute statement to process data and maintain state
        site.allowed_radius = payload.allowed_radius
    # Check if target condition is false or object is missing
    if payload.is_active is not None:
        # Execute statement to process data and maintain state
        site.is_active = payload.is_active

    # Execute statement to process data and maintain state
    site.updated_at = datetime.utcnow()
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(site)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Client site '{site.name}' updated successfully.",
        # Execute statement to process data and maintain state
        "site": {
            # Execute statement to process data and maintain state
            "id": site.id,
            # Execute statement to process data and maintain state
            "name": site.name,
            # Execute statement to process data and maintain state
            "client_name": site.client_name or "",
            # Execute statement to process data and maintain state
            "address": site.address or "",
            # Execute statement to process data and maintain state
            "latitude": site.latitude,
            # Execute statement to process data and maintain state
            "longitude": site.longitude,
            # Execute statement to process data and maintain state
            "allowed_radius": site.allowed_radius,
            # Execute statement to process data and maintain state
            "is_active": bool(site.is_active),
            # Execute statement to process data and maintain state
            "status": "Active" if site.is_active else "Inactive",
        # Execute statement to process data and maintain state
        }
    # Execute statement to process data and maintain state
    }


# Define HTTP DELETE route endpoint handler
@router.delete("/client-sites/{site_id}")
# Define delete_client_site function to handle delete client site
def delete_client_site(site_id: int, db: Session = Depends(get_db)):
    """Soft-deactivates or deletes client site."""
    site = db.query(ClientSite).filter(ClientSite.id == site_id).first()
    # Check if target condition is false or object is missing
    if not site:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Client site not found.")

    # Mark as inactive
    site.is_active = False
    # Execute statement to process data and maintain state
    site.updated_at = datetime.utcnow()
    # Commit transaction to persist changes in database
    db.commit()

    # Return computed result or response payload to caller
    return {"status": "success", "message": f"Client site '{site.name}' disabled successfully."}


# ==============================================================================
# 3. EMPLOYEE WORK MODE & SITE PERMISSIONS
# ==============================================================================

# Define HTTP GET route endpoint handler
@router.get("/employee-permissions")
# Define get_all_employee_permissions function to handle get all employee permissions
def get_all_employee_permissions(db: Session = Depends(get_db)):
    """Returns work mode permissions and assigned client sites for all employees."""
    profiles = db.query(Profile).filter(Profile.emp_code != None).order_by(Profile.emp_code.asc()).all()
    # Initiate database query on specified model
    assignments = {a.emp_code: a for a in db.query(EmployeeWorkModeAssignment).all()}
    # Initiate database query on specified model
    all_sites = {s.id: s for s in db.query(ClientSite).filter(ClientSite.is_active == True).all()}
    # Set all_site_ids variable to store all site ids value
    all_site_ids = list(all_sites.keys())

    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for p in profiles:
        # Set assign variable to store assign value
        assign = assignments.get(p.emp_code)
        # Evaluate condition to control execution branch
        if assign:
            # Set allow_office variable to store allow office value
            allow_office = bool(assign.allow_office)
            # Set allow_wfh variable to store allow wfh value
            allow_wfh = bool(assign.allow_wfh)
            # Set allow_client_site variable to store allow client site value
            allow_client_site = bool(assign.allow_client_site)
            # Begin guarded execution block to trap exceptions
            try:
                # Set assigned_site_ids variable to store assigned site ids value
                assigned_site_ids = json.loads(assign.assigned_client_site_ids or "[]")
            # Catch and handle specific exception if raised
            except Exception:
                # Set assigned_site_ids variable to store assigned site ids value
                assigned_site_ids = []
        # Execute fallback branch when conditions are not met
        else:
            # Default for unconfigured employee: all allowed, all active sites assigned
            allow_office = True
            # Set allow_wfh variable to store allow wfh value
            allow_wfh = True
            # Set allow_client_site variable to store allow client site value
            allow_client_site = True
            # Set assigned_site_ids variable to store assigned site ids value
            assigned_site_ids = all_site_ids

        # Set assigned_sites_data variable to store assigned sites data value
        assigned_sites_data = [
            # Execute statement to process data and maintain state
            {"id": s_id, "name": all_sites[s_id].name, "address": all_sites[s_id].address or ""}
            # Iterate through items in sequence loop
            for s_id in assigned_site_ids if s_id in all_sites
        # Execute statement to process data and maintain state
        ]

        # Set emp_name variable to store emp name value
        emp_name = f"{p.first_name or ''} {p.last_name or ''}".strip() or p.emp_code
        # Execute statement to process data and maintain state
        results.append({
            # Execute statement to process data and maintain state
            "emp_code": p.emp_code,
            # Execute statement to process data and maintain state
            "name": emp_name,
            # Execute statement to process data and maintain state
            "email": p.email or "",
            # Execute statement to process data and maintain state
            "contact": p.mobile_no or "",
            # Execute statement to process data and maintain state
            "department": p.department or "—",
            # Execute statement to process data and maintain state
            "role": p.designation or p.role or "Employee",
            # Execute statement to process data and maintain state
            "allow_office": allow_office,
            # Execute statement to process data and maintain state
            "allow_wfh": allow_wfh,
            # Execute statement to process data and maintain state
            "allow_client_site": allow_client_site,
            # Execute statement to process data and maintain state
            "assigned_client_site_ids": assigned_site_ids,
            # Execute statement to process data and maintain state
            "assigned_client_sites": assigned_sites_data
        # Execute statement to process data and maintain state
        })

    # Return computed result or response payload to caller
    return results


# Define HTTP PUT route endpoint handler
@router.put("/employee-permissions/{emp_code}")
# Define update_employee_permissions function to handle update employee permissions
def update_employee_permissions(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define payload schema field with type EmployeePermissionUpdateSchema,
    payload: EmployeePermissionUpdateSchema,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Updates work mode eligibility and client site assignments for an employee."""
    emp_code_clean = emp_code.strip()
    # Initiate database query on specified model
    prof = db.query(Profile).filter(Profile.emp_code == emp_code_clean).first()
    # Check if target condition is false or object is missing
    if not prof:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail=f"Employee '{emp_code_clean}' not found.")

    # Initiate database query on specified model
    assignment = db.query(EmployeeWorkModeAssignment).filter(
        # Execute statement to process data and maintain state
        EmployeeWorkModeAssignment.emp_code == emp_code_clean
    # Execute statement to process data and maintain state
    ).first()

    # Check if target condition is false or object is missing
    if not assignment:
        # Set assignment variable to store assignment value
        assignment = EmployeeWorkModeAssignment(emp_code=emp_code_clean)
        # Stage new entity instance into database session
        db.add(assignment)

    # Check if target condition is false or object is missing
    if payload.allow_office is not None:
        # Execute statement to process data and maintain state
        assignment.allow_office = payload.allow_office
    # Check if target condition is false or object is missing
    if payload.allow_wfh is not None:
        # Execute statement to process data and maintain state
        assignment.allow_wfh = payload.allow_wfh
    # Check if target condition is false or object is missing
    if payload.allow_client_site is not None:
        # Execute statement to process data and maintain state
        assignment.allow_client_site = payload.allow_client_site
    # Check if target condition is false or object is missing
    if payload.assigned_client_site_ids is not None:
        # Execute statement to process data and maintain state
        assignment.assigned_client_site_ids = json.dumps(payload.assigned_client_site_ids)

    # Execute statement to process data and maintain state
    assignment.updated_at = datetime.utcnow()
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(assignment)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Work mode permissions for {emp_code_clean} updated successfully.",
        # Execute statement to process data and maintain state
        "permissions": {
            # Execute statement to process data and maintain state
            "emp_code": emp_code_clean,
            # Execute statement to process data and maintain state
            "allow_office": bool(assignment.allow_office),
            # Execute statement to process data and maintain state
            "allow_wfh": bool(assignment.allow_wfh),
            # Execute statement to process data and maintain state
            "allow_client_site": bool(assignment.allow_client_site),
            # Execute statement to process data and maintain state
            "assigned_client_site_ids": json.loads(assignment.assigned_client_site_ids or "[]")
        # Execute statement to process data and maintain state
        }
    # Execute statement to process data and maintain state
    }


# ==============================================================================
# 4. MY PERMISSIONS (For Active Employee on Dashboard)
# ==============================================================================

# Define HTTP GET route endpoint handler
@router.get("/my-permissions")
# Define get_my_work_mode_permissions function to handle get my work mode permissions
def get_my_work_mode_permissions(request: Request, db: Session = Depends(get_db)):
    """
    Returns allowed work modes and assigned client sites for current employee.
    Used by Employee Dashboard Today's Punch card to dynamically render
    Office, WFH, and Client Site options.
    """
    emp_code = _resolve_emp_code(request, db)
    # Set settings variable to store settings value
    settings = get_or_create_settings(db)

    # Fetch all active client sites
    active_sites = db.query(ClientSite).filter(ClientSite.is_active == True).order_by(ClientSite.name.asc()).all()
    # Set active_site_map variable to store active site map value
    active_site_map = {s.id: s for s in active_sites}
    # Set all_site_ids variable to store all site ids value
    all_site_ids = list(active_site_map.keys())

    # Fetch employee assignment
    assignment = db.query(EmployeeWorkModeAssignment).filter(
        # Execute statement to process data and maintain state
        EmployeeWorkModeAssignment.emp_code == emp_code
    # Execute statement to process data and maintain state
    ).first()

    # Evaluate condition to control execution branch
    if assignment:
        # Set allow_office variable to store allow office value
        allow_office = bool(assignment.allow_office)
        # Set allow_wfh variable to store allow wfh value
        allow_wfh = bool(assignment.allow_wfh) and bool(settings.wfh_enabled)
        # Set allow_client_site variable to store allow client site value
        allow_client_site = bool(assignment.allow_client_site)
        # Begin guarded execution block to trap exceptions
        try:
            # Set assigned_ids variable to store assigned ids value
            assigned_ids = json.loads(assignment.assigned_client_site_ids or "[]")
        # Catch and handle specific exception if raised
        except Exception:
            # Set assigned_ids variable to store assigned ids value
            assigned_ids = []
    # Execute fallback branch when conditions are not met
    else:
        # Defaults if not customized
        allow_office = True
        # Set allow_wfh variable to store allow wfh value
        allow_wfh = bool(settings.wfh_enabled)
        # Set allow_client_site variable to store allow client site value
        allow_client_site = True
        # Set assigned_ids variable to store assigned ids value
        assigned_ids = all_site_ids

    # Resolve assigned client sites
    assigned_client_sites = [
        # Execute statement to process data and maintain state
        {
            # Execute statement to process data and maintain state
            "id": s.id,
            # Execute statement to process data and maintain state
            "name": s.name,
            # Execute statement to process data and maintain state
            "client_name": s.client_name or "",
            # Execute statement to process data and maintain state
            "address": s.address or "",
            # Execute statement to process data and maintain state
            "latitude": s.latitude,
            # Execute statement to process data and maintain state
            "longitude": s.longitude,
            # Execute statement to process data and maintain state
            "allowed_radius": s.allowed_radius or 200.0,
        # Execute statement to process data and maintain state
        }
        # Iterate through items in sequence loop
        for s_id in assigned_ids
        # Check if target condition is false or object is missing
        if (s := active_site_map.get(s_id)) is not None
    # Execute statement to process data and maintain state
    ]

    # Set allowed_modes variable to store allowed modes value
    allowed_modes = []
    # Evaluate condition to control execution branch
    if allow_office:
        # Invoke allowed_modes.append to perform operational action
        allowed_modes.append("OFFICE")
    # Evaluate condition to control execution branch
    if allow_wfh:
        # Invoke allowed_modes.append to perform operational action
        allowed_modes.append("WFH")
    # Evaluate condition to control execution branch
    if allow_client_site and len(assigned_client_sites) > 0:
        # Invoke allowed_modes.append to perform operational action
        allowed_modes.append("CLIENT_SITE")

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "emp_code": emp_code,
        # Execute statement to process data and maintain state
        "allow_office": allow_office,
        # Execute statement to process data and maintain state
        "allow_wfh": allow_wfh,
        # Execute statement to process data and maintain state
        "allow_client_site": allow_client_site,
        # Execute statement to process data and maintain state
        "allowed_modes": allowed_modes,
        # Execute statement to process data and maintain state
        "assigned_client_sites": assigned_client_sites,
        # Execute statement to process data and maintain state
        "office": {
            # Execute statement to process data and maintain state
            "name": settings.office_name,
            # Execute statement to process data and maintain state
            "address": settings.office_address,
            # Execute statement to process data and maintain state
            "latitude": settings.office_latitude,
            # Execute statement to process data and maintain state
            "longitude": settings.office_longitude,
            # Execute statement to process data and maintain state
            "allowed_radius": settings.office_radius,
            # Execute statement to process data and maintain state
            "enforce_geofence": bool(settings.enforce_geofence),
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "wfh": {
            # Execute statement to process data and maintain state
            "enabled": bool(settings.wfh_enabled),
            # Execute statement to process data and maintain state
            "requires_location": bool(settings.wfh_requires_location),
            # Execute statement to process data and maintain state
            "requires_camera": bool(settings.wfh_requires_camera),
        # Execute statement to process data and maintain state
        }
    # Execute statement to process data and maintain state
    }
