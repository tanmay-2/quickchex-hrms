# ==============================================================================
# QUICKCHEX HRMS BACKEND - PROFILE_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/profile_api.py
# Purpose: FastAPI route controller handling 'profile_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.post('/upload-image/{emp_code}') -> upload_profile_picture()
#   • router.get('/employees') -> get_all_employees_no_slash()
#   • router.get('/employees/') -> get_all_employees()
#   • router.get('/me') -> get_my_profile_endpoint()
#   • router.get('/team/me', response_model=List[TeamMemberResponse]) -> get_my_team()
#   • router.get('/me/avatar') -> get_my_avatar()
#   • router.get('/team-leads/') -> get_team_leads()
#   • router.get('/employees/stats') -> get_employee_stats()
#   • ... and 3 more endpoints
# ==============================================================================

# Import module os for system functionality
import os
# Import module shutil for system functionality
import shutil
# Import module time for system functionality
import time
# Import module datetime for system functionality
import datetime
# Import APIRouter, Depends, UploadFile, File, HTTPException, Form, Request, Query from fastapi for module operations
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Request, Query
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text from sqlalchemy for module operations
from sqlalchemy import text
# Import List, Optional from typing for module operations
from typing import List, Optional

# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import get_current_user, require_roles from app.core.dependencies for module operations
from app.core.dependencies import get_current_user, require_roles
# Import UPLOAD_ROOT from app.core.storage for module operations
from app.core.storage import UPLOAD_ROOT
# Import get_profile, update_profile, delete_profile from app.services.profile_service for module operations
from app.services.profile_service import get_profile, update_profile, delete_profile
# Import ProfileUpdateSchema, TeamMemberResponse from app.schemas.profile_schema for module operations
from app.schemas.profile_schema import ProfileUpdateSchema, TeamMemberResponse
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile

# Set router variable to store router value
router = APIRouter(prefix="/profile", tags=["Profile"])

# Set UPLOAD_DIR variable to store UPLOAD DIR value
UPLOAD_DIR = UPLOAD_ROOT / "profiles"
# Invoke UPLOAD_DIR.mkdir to perform operational action
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# Define _can_access_profile function to handle  can access profile
def _can_access_profile(current_user: Profile, target: Profile) -> bool:
    # Set role variable to store role value
    role = (current_user.role or "").strip().lower()
    # Evaluate condition to control execution branch
    if role in {"admin", "superadmin", "administrator"}:
        # Return computed result or response payload to caller
        return True
    # Evaluate condition to control execution branch
    if current_user.emp_code == target.emp_code:
        # Return computed result or response payload to caller
        return True
    # Return computed result or response payload to caller
    return role in {"manager", "teamleader", "team_leader"} and target.reporting_supervisor == current_user.emp_code

# ==========================================
# 1. SPECIFIC ROUTES (Must go first!)
# ==========================================



# Import module re for system functionality
import re

# Define HTTP POST route endpoint handler
@router.post("/upload-image/{emp_code}")
# Define upload_profile_picture function to handle upload profile picture
def upload_profile_picture(
    # Define emp_code schema field with type str,
    emp_code: str, 
    # Define file schema field with type UploadFile and default value
    file: UploadFile = File(...), 
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define current_user schema field with type Profile and default value
    current_user: Profile = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Set clean_code variable to store clean code value
    clean_code = re.sub(r"[^a-zA-Z0-9_-]", "", emp_code)
    # Check if target condition is false or object is missing
    if not clean_code:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Invalid employee code")

    # Set role variable to store role value
    role = (current_user.role or "").strip().lower()
    # Check if target condition is false or object is missing
    if role not in ("admin", "superadmin", "hr", "administrator") and current_user.emp_code.lower() != clean_code.lower():
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify another employee's profile picture.")

    # Check if target condition is false or object is missing
    if not file.content_type.startswith("image/"):
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="File must be an image")

    # Set extension variable to store extension value
    extension = os.path.splitext(file.filename)[1].lower()
    # Check if target condition is false or object is missing
    if extension not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPG, PNG, WEBP, or GIF.")

    # Set filename variable to store filename value
    filename = f"profile_{clean_code}{extension}"
    # Set file_path variable to store file path value
    file_path = os.path.join(UPLOAD_DIR, filename)
    # Set db_path variable to store db path value
    db_path = file_path.replace("\\", "/")

    # Begin guarded execution block to trap exceptions
    try:
        # Acquire context manager resource for enclosed block
        with open(file_path, "wb") as buffer:
            # Invoke shutil.copyfileobj to perform operational action
            shutil.copyfileobj(file.file, buffer)
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # Set query variable to store query value
    query = text("UPDATE profile_master SET profile_image = :path WHERE emp_code = :code")
    # Begin guarded execution block to trap exceptions
    try:
        # Invoke db.execute to perform operational action
        db.execute(query, {"path": db_path, "code": clean_code})
        # Commit transaction to persist changes in database
        db.commit()
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success", 
            # Execute statement to process data and maintain state
            "message": "Profile image uploaded successfully",
            # Execute statement to process data and maintain state
            "image_url": f"/{db_path}"
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail="Database update failed")

# Define HTTP GET route endpoint handler
@router.get("/employees")
# Define get_all_employees_no_slash function to handle get all employees no slash
def get_all_employees_no_slash(
    # Define limit schema field with type Optional[int] and default value
    limit: Optional[int] = Query(None, ge=1, le=500),
    # Define offset schema field with type Optional[int] and default value
    offset: Optional[int] = Query(0, ge=0),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define _user schema field with type Profile and default value
    _user: Profile = Depends(require_roles(["admin", "manager", "teamleader", "employee"])),
# Execute statement to process data and maintain state
):
    # Return computed result or response payload to caller
    return get_all_employees(limit=limit, offset=offset, db=db, _user=_user)

# Define HTTP GET route endpoint handler
@router.get("/employees/")
# Define get_all_employees function to handle get all employees
def get_all_employees(
    # Define limit schema field with type Optional[int] and default value
    limit: Optional[int] = Query(None, ge=1, le=500),
    # Define offset schema field with type Optional[int] and default value
    offset: Optional[int] = Query(0, ge=0),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define _user schema field with type Profile and default value
    _user: Profile = Depends(require_roles(["admin", "manager", "teamleader", "employee"])),
# Execute statement to process data and maintain state
):
    # Initiate database query on specified model
    q = db.query(Profile).order_by(Profile.emp_code.asc())
    # Check if target condition is false or object is missing
    if limit is not None:
        # Set q variable to store q value
        q = q.offset(offset or 0).limit(limit)
    # Set employees variable to store employees value
    employees = q.all()
    # Set res variable to store res value
    res = []
    # Iterate through items in sequence loop
    for emp in employees:
        # Set first variable to store first value
        first = (emp.first_name or "").strip()
        # Set last variable to store last value
        last = (emp.last_name or "").strip()
        # Set emp_email variable to store emp email value
        emp_email = (emp.email or "").strip()
        
        # Evaluate condition to control execution branch
        if first and last:
            # Evaluate condition to control execution branch
            if first.lower() == last.lower():
                # Set raw_name variable to store raw name value
                raw_name = first
            # Execute fallback branch when conditions are not met
            else:
                # Set raw_name variable to store raw name value
                raw_name = f"{first} {last}".strip()
        # Execute fallback branch when conditions are not met
        else:
            # Set raw_name variable to store raw name value
            raw_name = first or last or ""

        # Set clean_name variable to store clean name value
        clean_name = raw_name if raw_name else None
        # Evaluate condition to control execution branch
        if clean_name and emp_email:
            # Evaluate condition to control execution branch
            if clean_name.lower() == emp_email.lower():
                # Set clean_name variable to store clean name value
                clean_name = None
            # Evaluate alternate branch condition
            elif clean_name.lower() == f"{emp_email.lower()} {emp_email.lower()}":
                # Set clean_name variable to store clean name value
                clean_name = None

        # Check if target condition is false or object is missing
        if not clean_name:
            # Set clean_name variable to store clean name value
            clean_name = emp.emp_code or "Employee"

        # Set img_url variable to store img url value
        img_url = None
        # Evaluate condition to control execution branch
        if emp.profile_image:
            # Set path variable to store path value
            path = emp.profile_image.replace("\\", "/").lstrip("/")
            # Set img_url variable to store img url value
            img_url = f"/{path}"

        # Execute statement to process data and maintain state
        res.append({
            # Execute statement to process data and maintain state
            "id": emp.emp_code,
            # Execute statement to process data and maintain state
            "emp_code": emp.emp_code,
            # Execute statement to process data and maintain state
            "employee_id": emp.emp_code,
            # Execute statement to process data and maintain state
            "employeeId": emp.emp_code,
            # Execute statement to process data and maintain state
            "first_name": emp.first_name or "",
            # Execute statement to process data and maintain state
            "last_name": emp.last_name or "",
            # Execute statement to process data and maintain state
            "name": clean_name,
            # Execute statement to process data and maintain state
            "role": (emp.role or "employee").strip().lower(),
            # Execute statement to process data and maintain state
            "department": emp.department or "General",
            # Execute statement to process data and maintain state
            "designation": emp.designation or "Employee",
            # Execute statement to process data and maintain state
            "email": emp_email or (f"{emp.emp_code.lower()}@laesfera.co" if emp.emp_code else ""),
            # Execute statement to process data and maintain state
            "contact_number": emp.mobile_no or "",
            # Execute statement to process data and maintain state
            "mobile": emp.mobile_no or "",
            # Execute statement to process data and maintain state
            "phone": emp.mobile_no or "",
            # Execute statement to process data and maintain state
            "mobile_no": emp.mobile_no or "",
            # Execute statement to process data and maintain state
            "location": f"{emp.city or 'Mumbai'}, {emp.state or 'IN'}" if (emp.city or emp.state) else (emp.branch_location or "Mumbai, IN"),
            # Execute statement to process data and maintain state
            "type": emp.employment_type or "Full-time",
            # Execute statement to process data and maintain state
            "status": emp.employment_status or "Active",
            # Execute statement to process data and maintain state
            "employment_status": emp.employment_status or "Active",
            # Execute statement to process data and maintain state
            "joining_date": emp.emp_join_date.strftime("%Y-%m-%d") if emp.emp_join_date else "",
            # Execute statement to process data and maintain state
            "joined": emp.emp_join_date.strftime("%Y-%m-%d") if emp.emp_join_date else "",
            # Execute statement to process data and maintain state
            "profile_image": img_url,
            # Execute statement to process data and maintain state
            "reporting_supervisor": emp.reporting_supervisor or ""
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return res

# Define HTTP GET route endpoint handler
@router.get("/me")
# Define get_my_profile_endpoint function to handle get my profile endpoint
def get_my_profile_endpoint(
    # Define current_user schema field with type Profile and default value
    current_user: Profile = Depends(get_current_user),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
# Execute statement to process data and maintain state
):
    """Fetches profile for currently logged in employee."""
    emp = current_user
    # Check if target condition is false or object is missing
    if not emp:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Profile not found")

    # Set fn variable to store fn value
    fn = (emp.first_name or "").strip()
    # Set ln variable to store ln value
    ln = (emp.last_name or "").strip()
    # Evaluate condition to control execution branch
    if "@" in fn: fn = ""
    # Evaluate condition to control execution branch
    if "@" in ln: ln = ""
    # Set full_name variable to store full name value
    full_name = f"{fn} {ln}".strip()
    # Check if target condition is false or object is missing
    if not full_name:
        # Set full_name variable to store full name value
        full_name = emp.emp_code or "Employee"
    # Set initials variable to store initials value
    initials = "".join([p[0] for p in full_name.split() if p])[:2].upper() or "EM"

    # Set mgr_name variable to store mgr name value
    mgr_name = emp.reporting_supervisor or "—"
    # Evaluate condition to control execution branch
    if emp.reporting_supervisor and emp.reporting_supervisor != "—":
        # Initiate database query on specified model
        mgr_prof = db.query(Profile).filter(
            # Execute statement to process data and maintain state
            (Profile.emp_code == emp.reporting_supervisor) |
            # Execute statement to process data and maintain state
            (Profile.email.ilike(emp.reporting_supervisor))
        # Execute statement to process data and maintain state
        ).first()
        # Evaluate condition to control execution branch
        if mgr_prof:
            # Set mgr_fn variable to store mgr fn value
            mgr_fn = (mgr_prof.first_name or "").strip()
            # Set mgr_ln variable to store mgr ln value
            mgr_ln = (mgr_prof.last_name or "").strip()
            # Evaluate condition to control execution branch
            if mgr_fn or mgr_ln:
                # Set mgr_name variable to store mgr name value
                mgr_name = f"{mgr_fn} {mgr_ln}".strip()

    # Set loc variable to store loc value
    loc = emp.branch_location or "Hyde Park, Saki Vihar Road, Mumbai"
    # Set img_url variable to store img url value
    img_url = None
    # Evaluate condition to control execution branch
    if emp.profile_image:
        # Set clean_p variable to store clean p value
        clean_p = emp.profile_image.replace('\\', '/').strip()
        # Set img_url variable to store img url value
        img_url = clean_p if clean_p.startswith('/') else f"/{clean_p}"

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "id": emp.emp_code,
        # Execute statement to process data and maintain state
        "emp_code": emp.emp_code,
        # Execute statement to process data and maintain state
        "employeeId": emp.emp_code,
        # Execute statement to process data and maintain state
        "name": full_name,
        # Execute statement to process data and maintain state
        "fullName": full_name,
        # Execute statement to process data and maintain state
        "first_name": emp.first_name or "",
        # Execute statement to process data and maintain state
        "lastName": emp.last_name or "",
        # Execute statement to process data and maintain state
        "last_name": emp.last_name or "",
        # Execute statement to process data and maintain state
        "initials": initials,
        # Execute statement to process data and maintain state
        "role": emp.role or "employee",
        # Execute statement to process data and maintain state
        "designation": emp.designation or "Employee",
        # Execute statement to process data and maintain state
        "department": emp.department or "Operations",
        # Execute statement to process data and maintain state
        "email": emp.email or "",
        # Execute statement to process data and maintain state
        "contact": emp.mobile_no or "—",
        # Execute statement to process data and maintain state
        "mobile_no": emp.mobile_no or "—",
        # Execute statement to process data and maintain state
        "phone": emp.mobile_no or "—",
        # Execute statement to process data and maintain state
        "location": loc,
        # Execute statement to process data and maintain state
        "branch_location": loc,
        # Execute statement to process data and maintain state
        "reporting_supervisor": mgr_name,
        # Execute statement to process data and maintain state
        "reportingManager": mgr_name,
        # Execute statement to process data and maintain state
        "reportingManagerId": emp.reporting_supervisor or "",
        # Execute statement to process data and maintain state
        "status": "Active",
        # Execute statement to process data and maintain state
        "joined": emp.emp_join_date.strftime("%d %b %Y") if emp.emp_join_date else "—",
        # Execute statement to process data and maintain state
        "profile_image": img_url,
        # Execute statement to process data and maintain state
        "profileImage": img_url,
        # Execute statement to process data and maintain state
        "avatar": img_url,
        # Execute statement to process data and maintain state
        "avatar_url": img_url,
        # Execute statement to process data and maintain state
        "blood_group": emp.blood_group or "",
        # Execute statement to process data and maintain state
        "personal": {
            # Execute statement to process data and maintain state
            "Date of Birth": emp.dob.strftime("%d %b %Y") if emp.dob else "—",
            # Execute statement to process data and maintain state
            "Gender": emp.gender or "—",
            # Execute statement to process data and maintain state
            "Blood Group": emp.blood_group or "—",
            # Execute statement to process data and maintain state
            "Marital Status": emp.marital_status or "—",
            # Execute statement to process data and maintain state
            "Nationality": emp.country or "Indian"
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "contact_info": {
            # Execute statement to process data and maintain state
            "Mobile Number": emp.mobile_no or "—",
            # Execute statement to process data and maintain state
            "Personal Email": emp.email or "—",
            # Execute statement to process data and maintain state
            "Work Email": emp.email or "—",
            # Execute statement to process data and maintain state
            "Current Address": loc,
            # Execute statement to process data and maintain state
            "Permanent Address": loc
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "employment": {
            # Execute statement to process data and maintain state
            "Employee ID": emp.emp_code,
            # Execute statement to process data and maintain state
            "Date of Joining": emp.emp_join_date.strftime("%d %b %Y") if emp.emp_join_date else "—",
            # Execute statement to process data and maintain state
            "Department": emp.department or "Operations",
            # Execute statement to process data and maintain state
            "Designation": emp.designation or "Employee",
            # Execute statement to process data and maintain state
            "Reporting Manager": mgr_name,
            # Execute statement to process data and maintain state
            "Work Location": loc,
            # Execute statement to process data and maintain state
            "Employment Type": emp.employment_type or "Full-Time"
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "emergency": {
            # Execute statement to process data and maintain state
            "Name": emp.father_name or emp.mother_name or "—",
            # Execute statement to process data and maintain state
            "Relationship": "Family" if (emp.father_name or emp.mother_name) else "—",
            # Execute statement to process data and maintain state
            "Phone Number": emp.family_contact or "—"
        # Execute statement to process data and maintain state
        }
    # Execute statement to process data and maintain state
    }


# Define HTTP GET route endpoint handler
@router.get("/team/me", response_model=List[TeamMemberResponse])
# Define get_my_team function to handle get my team
def get_my_team(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define current_user schema field with type Profile and default value
    current_user: Profile = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Initiate database query on specified model
    team = db.query(Profile).filter(
        # Execute statement to process data and maintain state
        Profile.reporting_supervisor == current_user.emp_code
    # Execute statement to process data and maintain state
    ).all()
    # Return computed result or response payload to caller
    return team

# Define HTTP GET route endpoint handler
@router.get("/me/avatar")
# Define get_my_avatar function to handle get my avatar
def get_my_avatar(current_user: Profile = Depends(get_current_user)):
    # Set image_url variable to store image url value
    image_url = None
    # Evaluate condition to control execution branch
    if current_user.profile_image:
        # Set path variable to store path value
        path = current_user.profile_image.replace("\\", "/")
        # Set cache_buster variable to store cache buster value
        cache_buster = int(time.time())
        # Set image_url variable to store image url value
        image_url = f"/{path.lstrip('/')}?t={cache_buster}"

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "emp_code": current_user.emp_code,
        # Execute statement to process data and maintain state
        "first_name": current_user.first_name,
        # Execute statement to process data and maintain state
        "last_name": current_user.last_name,
        # Execute statement to process data and maintain state
        "initials": f"{current_user.first_name[0] if current_user.first_name else ''}{(current_user.last_name[0] if current_user.last_name else '')}",
        # Execute statement to process data and maintain state
        "image_url": image_url
    # Execute statement to process data and maintain state
    }

# Define HTTP GET route endpoint handler
@router.get("/team-leads/")
# Define get_team_leads function to handle get team leads
def get_team_leads(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define _user schema field with type Profile and default value
    _user: Profile = Depends(require_roles(["admin", "manager", "teamleader", "employee"])),
# Execute statement to process data and maintain state
):
    # Initiate database query on specified model
    tls = db.query(Profile).filter(Profile.designation == "Team Lead").all()
    # Return computed result or response payload to caller
    return [
        # Execute statement to process data and maintain state
        {
            # Execute statement to process data and maintain state
            "emp_code": emp.emp_code,
            # Execute statement to process data and maintain state
            "name": f"{emp.first_name or ''} {emp.last_name or ''}".strip(),
        # Execute statement to process data and maintain state
        }
        # Iterate through items in sequence loop
        for emp in tls
    # Execute statement to process data and maintain state
    ]


# Define HTTP GET route endpoint handler
@router.get("/employees/stats")
# Define get_employee_stats function to handle get employee stats
def get_employee_stats(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define _user schema field with type Profile and default value
    _user: Profile = Depends(require_roles(["admin", "manager", "teamleader", "employee"])),
# Execute statement to process data and maintain state
):
    # Begin guarded execution block to trap exceptions
    try:
        # Initiate database query on specified model
        total = db.query(Profile).count()
        
        # 🔥 FIX: Using .ilike() safely ignores uppercase/lowercase and hidden spaces
        full_time = db.query(Profile).filter(Profile.employment_status.ilike("%Full Time%")).count()
        # Initiate database query on specified model
        contract = db.query(Profile).filter(Profile.employment_status.ilike("%Contract%")).count()
        # Initiate database query on specified model
        probation = db.query(Profile).filter(Profile.employment_status.ilike("%Probation%")).count()
        # Initiate database query on specified model
        new_emp = db.query(Profile).filter(Profile.designation.ilike("%Software Trainee%")).count()

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "total": total,
            # Execute statement to process data and maintain state
            "full_time": full_time,
            # Execute statement to process data and maintain state
            "contract": contract,
            # Execute statement to process data and maintain state
            "probation": probation,
            # Execute statement to process data and maintain state
            "new": new_emp
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except Exception as e:
        # Invoke print to perform operational action
        print("Error fetching stats:", e)
        # Fallback so it never returns a completely broken object
        return {"total": 0, "full_time": 0, "contract": 0, "probation": 0, "new": 0}

# Define HTTP GET route endpoint handler
@router.get("/{emp_code}")
# Define get_profile_api function to handle get profile api
def get_profile_api(emp_code: str, db: Session = Depends(get_db)):
    # 1. Get the model from DB
    user = db.query(Profile).filter(
        # Execute statement to process data and maintain state
        (Profile.emp_code == emp_code) | 
        # Execute statement to process data and maintain state
        (Profile.id == (int(emp_code) if emp_code.isdigit() else -1))
    # Execute statement to process data and maintain state
    ).first()
    
    # Check if target condition is false or object is missing
    if not user:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Profile not found")

    # Set profile_data variable to store profile data value
    profile_data = {c.name: getattr(user, c.name) for c in user.__table__.columns}
    
    # Set fn variable to store fn value
    fn = (user.first_name or "").strip()
    # Set ln variable to store ln value
    ln = (user.last_name or "").strip()
    # Evaluate condition to control execution branch
    if "@" in fn: fn = ""
    # Evaluate condition to control execution branch
    if "@" in ln: ln = ""
    
    # Evaluate condition to control execution branch
    if fn and ln:
        # Set full_name variable to store full name value
        full_name = fn if fn.lower() == ln.lower() else f"{fn} {ln}".strip()
    # Execute fallback branch when conditions are not met
    else:
        # Set full_name variable to store full name value
        full_name = fn or ln
        
    # Check if target condition is false or object is missing
    if not full_name or full_name == user.emp_code or "@" in full_name:
        # Set full_name variable to store full name value
        full_name = user.emp_code or "Employee"

    # Set mgr_name variable to store mgr name value
    mgr_name = user.reporting_supervisor or "—"
    # Evaluate condition to control execution branch
    if user.reporting_supervisor and user.reporting_supervisor != "—":
        # Initiate database query on specified model
        mgr_prof = db.query(Profile).filter(
            # Execute statement to process data and maintain state
            (Profile.emp_code == user.reporting_supervisor) |
            # Execute statement to process data and maintain state
            (Profile.email.ilike(user.reporting_supervisor))
        # Execute statement to process data and maintain state
        ).first()
        # Evaluate condition to control execution branch
        if mgr_prof:
            # Set mgr_fn variable to store mgr fn value
            mgr_fn = (mgr_prof.first_name or "").strip()
            # Set mgr_ln variable to store mgr ln value
            mgr_ln = (mgr_prof.last_name or "").strip()
            # Evaluate condition to control execution branch
            if mgr_fn or mgr_ln:
                # Set mgr_name variable to store mgr name value
                mgr_name = f"{mgr_fn} {mgr_ln}".strip()

    # Set loc variable to store loc value
    loc = user.branch_location or "Hyde Park, Saki Vihar Road, Mumbai"
    # Execute statement to process data and maintain state
    profile_data["name"] = full_name
    # Execute statement to process data and maintain state
    profile_data["fullName"] = full_name
    # Execute statement to process data and maintain state
    profile_data["employeeId"] = user.emp_code
    # Execute statement to process data and maintain state
    profile_data["location"] = loc
    # Execute statement to process data and maintain state
    profile_data["branch_location"] = loc
    # Execute statement to process data and maintain state
    profile_data["contact"] = user.mobile_no or "—"
    # Execute statement to process data and maintain state
    profile_data["phone"] = user.mobile_no or "—"
    # Execute statement to process data and maintain state
    profile_data["mobile_no"] = user.mobile_no or "—"
    # Execute statement to process data and maintain state
    profile_data["manager"] = mgr_name
    # Execute statement to process data and maintain state
    profile_data["reporting_supervisor"] = mgr_name
    # Execute statement to process data and maintain state
    profile_data["reportingManager"] = mgr_name
    # Execute statement to process data and maintain state
    profile_data["reportingManagerId"] = user.reporting_supervisor or ""
    # Execute statement to process data and maintain state
    profile_data["blood_group"] = getattr(user, "blood_group", "") or ""
    # Execute statement to process data and maintain state
    profile_data["personal"] = {
        # Execute statement to process data and maintain state
        "Date of Birth": user.dob.strftime("%d %b %Y") if user.dob else "—",
        # Execute statement to process data and maintain state
        "Gender": user.gender or "—",
        # Execute statement to process data and maintain state
        "Blood Group": getattr(user, "blood_group", "—") or "—",
        # Execute statement to process data and maintain state
        "Marital Status": user.marital_status or "—",
        # Execute statement to process data and maintain state
        "Nationality": user.country or "Indian"
    # Execute statement to process data and maintain state
    }

    # 2. Handle the Image URL logic
    if user.profile_image:
        # Set path variable to store path value
        path = user.profile_image.replace("\\", "/")
        # Execute statement to process data and maintain state
        profile_data["profile_image"] = f"/{path}?t={int(time.time())}"
    # Execute fallback branch when conditions are not met
    else:
        # Execute statement to process data and maintain state
        profile_data["profile_image"] = None

    # Return computed result or response payload to caller
    return profile_data

# Define HTTP PUT route endpoint handler
@router.put("/{emp_code}")
# Define update_profile_api function to handle update profile api
def update_profile_api(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define payload schema field with type ProfileUpdateSchema,
    payload: ProfileUpdateSchema,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    # Begin guarded execution block to trap exceptions
    try:
        # Set data variable to store data value
        data = payload.model_dump(exclude_unset=True)
    # Catch and handle specific exception if raised
    except AttributeError:
        # Set data variable to store data value
        data = payload.dict(exclude_unset=True)

    # Clean out empty string dates or invalid types
    clean_data = {k: v for k, v in data.items() if v is not None}
    # Set updated_profile variable to store updated profile value
    updated_profile = update_profile(db, emp_code, clean_data)
    # Check if target condition is false or object is missing
    if not updated_profile:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Profile not found or update failed")
    # Return computed result or response payload to caller
    return {"status": "success", "message": "Profile updated successfully", "data": updated_profile}


# Define HTTP DELETE route endpoint handler
@router.delete("/{emp_code}")
# Define delete_profile_api function to handle delete profile api
def delete_profile_api(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    # Set success variable to store success value
    success = delete_profile(db, emp_code)
    # Check if target condition is false or object is missing
    if not success:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail=f"Employee '{emp_code}' not found")
    # Return computed result or response payload to caller
    return {"status": "success", "message": f"Employee '{emp_code}' deleted successfully"}
