import os
import shutil
import time
import datetime
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.services.profile_service import get_profile, update_profile
from app.schemas.profile_schema import ProfileUpdateSchema, TeamMemberResponse
from app.models.profile_model import Profile

router = APIRouter(prefix="/profile", tags=["Profile"])

# Define the upload directory
UPLOAD_DIR = "uploads/profiles"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# ==========================================
# 1. SPECIFIC ROUTES (Must go first!)
# ==========================================



@router.post("/upload-image/{emp_code}")
def upload_profile_picture(
    emp_code: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    extension = os.path.splitext(file.filename)[1]
    filename = f"profile_{emp_code}{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    db_path = file_path.replace("\\", "/")

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    query = text("UPDATE profile_master SET profile_image = :path WHERE emp_code = :code")
    try:
        db.execute(query, {"path": db_path, "code": emp_code})
        db.commit()
        return {
            "status": "success", 
            "message": "Profile image uploaded successfully",
            "image_url": f"/{db_path}"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database update failed")

@router.get("/employees")
def get_all_employees_no_slash(db: Session = Depends(get_db)):
    return get_all_employees(db)

@router.get("/employees/")
def get_all_employees(db: Session = Depends(get_db)):
    employees = db.query(Profile).order_by(Profile.emp_code.asc()).all()
    res = []
    for emp in employees:
        first = (emp.first_name or "").strip()
        last = (emp.last_name or "").strip()
        emp_email = (emp.email or "").strip()
        
        if first and last:
            if first.lower() == last.lower():
                raw_name = first
            else:
                raw_name = f"{first} {last}".strip()
        else:
            raw_name = first or last or ""

        clean_name = raw_name if raw_name else None
        if clean_name and emp_email:
            if clean_name.lower() == emp_email.lower():
                clean_name = None
            elif clean_name.lower() == f"{emp_email.lower()} {emp_email.lower()}":
                clean_name = None

        if not clean_name:
            clean_name = emp.emp_code or "Employee"

        img_url = None
        if emp.profile_image:
            path = emp.profile_image.replace("\\", "/").lstrip("/")
            img_url = f"/{path}"

        res.append({
            "id": emp.emp_code,
            "emp_code": emp.emp_code,
            "employee_id": emp.emp_code,
            "employeeId": emp.emp_code,
            "first_name": emp.first_name or "",
            "last_name": emp.last_name or "",
            "name": clean_name,
            "role": (emp.role or "employee").strip().lower(),
            "department": emp.department or "General",
            "designation": emp.designation or "Employee",
            "email": emp_email or (f"{emp.emp_code.lower()}@laesfera.co" if emp.emp_code else ""),
            "contact_number": emp.mobile_no or "",
            "mobile": emp.mobile_no or "",
            "phone": emp.mobile_no or "",
            "mobile_no": emp.mobile_no or "",
            "location": f"{emp.city or 'Mumbai'}, {emp.state or 'IN'}" if (emp.city or emp.state) else (emp.branch_location or "Mumbai, IN"),
            "type": emp.employment_type or "Full-time",
            "status": emp.employment_status or "Active",
            "employment_status": emp.employment_status or "Active",
            "joining_date": emp.emp_join_date.strftime("%Y-%m-%d") if emp.emp_join_date else "",
            "joined": emp.emp_join_date.strftime("%Y-%m-%d") if emp.emp_join_date else "",
            "profile_image": img_url,
            "reporting_supervisor": emp.reporting_supervisor or ""
        })
    return res

@router.get("/me")
def get_my_profile_endpoint(request: Request, db: Session = Depends(get_db)):
    """Fetches profile for currently logged in employee."""
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    emp_code = _resolve_emp_code(request, db)
    emp = db.query(Profile).filter(Profile.emp_code == emp_code).first() if emp_code else None
    if not emp:
        emp = db.query(Profile).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Profile not found")

    fn = (emp.first_name or "").strip()
    ln = (emp.last_name or "").strip()
    if "@" in fn: fn = ""
    if "@" in ln: ln = ""
    full_name = f"{fn} {ln}".strip()
    if not full_name:
        full_name = emp.emp_code or "Employee"
    initials = "".join([p[0] for p in full_name.split() if p])[:2].upper() or "EM"

    mgr_name = emp.reporting_supervisor or "—"
    if emp.reporting_supervisor and emp.reporting_supervisor != "—":
        mgr_prof = db.query(Profile).filter(
            (Profile.emp_code == emp.reporting_supervisor) |
            (Profile.email.ilike(emp.reporting_supervisor))
        ).first()
        if mgr_prof:
            mgr_fn = (mgr_prof.first_name or "").strip()
            mgr_ln = (mgr_prof.last_name or "").strip()
            if mgr_fn or mgr_ln:
                mgr_name = f"{mgr_fn} {mgr_ln}".strip()

    loc = emp.branch_location or "Hyde Park, Saki Vihar Road, Mumbai"
    img_url = f"/{emp.profile_image.replace('\\', '/')}" if emp.profile_image else None

    return {
        "id": emp.emp_code,
        "emp_code": emp.emp_code,
        "employeeId": emp.emp_code,
        "name": full_name,
        "fullName": full_name,
        "first_name": emp.first_name or "",
        "lastName": emp.last_name or "",
        "last_name": emp.last_name or "",
        "initials": initials,
        "role": emp.role or "employee",
        "designation": emp.designation or "Employee",
        "department": emp.department or "Operations",
        "email": emp.email or "",
        "contact": emp.mobile_no or "—",
        "mobile_no": emp.mobile_no or "—",
        "phone": emp.mobile_no or "—",
        "location": loc,
        "branch_location": loc,
        "reporting_supervisor": mgr_name,
        "reportingManager": mgr_name,
        "reportingManagerId": emp.reporting_supervisor or "",
        "status": "Active",
        "joined": emp.emp_join_date.strftime("%d %b %Y") if emp.emp_join_date else "—",
        "profile_image": img_url,
        "personal": {
            "Date of Birth": emp.dob.strftime("%d %b %Y") if emp.dob else "—",
            "Gender": emp.gender or "—",
            "Blood Group": "—",
            "Marital Status": emp.marital_status or "—",
            "Nationality": emp.country or "Indian"
        },
        "contact_info": {
            "Mobile Number": emp.mobile_no or "—",
            "Personal Email": emp.email or "—",
            "Work Email": emp.email or "—",
            "Current Address": loc,
            "Permanent Address": loc
        },
        "employment": {
            "Employee ID": emp.emp_code,
            "Date of Joining": emp.emp_join_date.strftime("%d %b %Y") if emp.emp_join_date else "—",
            "Department": emp.department or "Operations",
            "Designation": emp.designation or "Employee",
            "Reporting Manager": mgr_name,
            "Work Location": loc,
            "Employment Type": emp.employment_type or "Full-Time"
        },
        "emergency": {
            "Name": emp.father_name or emp.mother_name or "—",
            "Relationship": "Family" if (emp.father_name or emp.mother_name) else "—",
            "Phone Number": emp.family_contact or "—"
        }
    }


@router.get("/team/me", response_model=List[TeamMemberResponse])
def get_my_team(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    team = db.query(Profile).filter(
        Profile.reporting_supervisor == current_user.emp_code
    ).all()
    return team

@router.get("/me/avatar")
def get_my_avatar(current_user: Profile = Depends(get_current_user)):
    image_url = None
    if current_user.profile_image:
        path = current_user.profile_image.replace("\\", "/")
        cache_buster = int(time.time())
        image_url = f"/{path.lstrip('/')}?t={cache_buster}"

    return {
        "emp_code": current_user.emp_code,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "initials": f"{current_user.first_name[0] if current_user.first_name else ''}{(current_user.last_name[0] if current_user.last_name else '')}",
        "image_url": image_url
    }

@router.get("/team-leads/")
def get_team_leads(db: Session = Depends(get_db)):
    tls = db.query(Profile).filter(Profile.designation == "Team Lead").all()
    return [
        {
            "emp_code": emp.emp_code,
            "name": f"{emp.first_name or ''} {emp.last_name or ''}".strip(),
        }
        for emp in tls
    ]


@router.get("/employees/stats")
def get_employee_stats(db: Session = Depends(get_db)):
    try:
        total = db.query(Profile).count()
        
        # 🔥 FIX: Using .ilike() safely ignores uppercase/lowercase and hidden spaces
        full_time = db.query(Profile).filter(Profile.employment_status.ilike("%Full Time%")).count()
        contract = db.query(Profile).filter(Profile.employment_status.ilike("%Contract%")).count()
        probation = db.query(Profile).filter(Profile.employment_status.ilike("%Probation%")).count()
        new_emp = db.query(Profile).filter(Profile.designation.ilike("%Software Trainee%")).count()

        return {
            "total": total,
            "full_time": full_time,
            "contract": contract,
            "probation": probation,
            "new": new_emp
        }
    except Exception as e:
        print("Error fetching stats:", e)
        # Fallback so it never returns a completely broken object
        return {"total": 0, "full_time": 0, "contract": 0, "probation": 0, "new": 0}

@router.get("/{emp_code}")
def get_profile_api(emp_code: str, db: Session = Depends(get_db)):
    # 1. Get the model from DB
    user = db.query(Profile).filter(
        (Profile.emp_code == emp_code) | 
        (Profile.id == (int(emp_code) if emp_code.isdigit() else -1))
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile_data = {c.name: getattr(user, c.name) for c in user.__table__.columns}
    
    fn = (user.first_name or "").strip()
    ln = (user.last_name or "").strip()
    if "@" in fn: fn = ""
    if "@" in ln: ln = ""
    
    if fn and ln:
        full_name = fn if fn.lower() == ln.lower() else f"{fn} {ln}".strip()
    else:
        full_name = fn or ln
        
    if not full_name or full_name == user.emp_code or "@" in full_name:
        full_name = user.emp_code or "Employee"

    mgr_name = user.reporting_supervisor or "—"
    if user.reporting_supervisor and user.reporting_supervisor != "—":
        mgr_prof = db.query(Profile).filter(
            (Profile.emp_code == user.reporting_supervisor) |
            (Profile.email.ilike(user.reporting_supervisor))
        ).first()
        if mgr_prof:
            mgr_fn = (mgr_prof.first_name or "").strip()
            mgr_ln = (mgr_prof.last_name or "").strip()
            if mgr_fn or mgr_ln:
                mgr_name = f"{mgr_fn} {mgr_ln}".strip()

    loc = user.branch_location or "Hyde Park, Saki Vihar Road, Mumbai"
    profile_data["name"] = full_name
    profile_data["fullName"] = full_name
    profile_data["employeeId"] = user.emp_code
    profile_data["location"] = loc
    profile_data["branch_location"] = loc
    profile_data["contact"] = user.mobile_no or "—"
    profile_data["phone"] = user.mobile_no or "—"
    profile_data["mobile_no"] = user.mobile_no or "—"
    profile_data["manager"] = mgr_name
    profile_data["reporting_supervisor"] = mgr_name
    profile_data["reportingManager"] = mgr_name
    profile_data["reportingManagerId"] = user.reporting_supervisor or ""

    # 2. Handle the Image URL logic
    if user.profile_image:
        path = user.profile_image.replace("\\", "/")
        profile_data["profile_image"] = f"/{path}?t={int(time.time())}"
    else:
        profile_data["profile_image"] = None

    return profile_data

@router.put("/{emp_code}")
def update_profile_api(
    emp_code: str,
    payload: ProfileUpdateSchema,
    db: Session = Depends(get_db)
):
    updated_profile = update_profile(db, emp_code, payload.dict())
    if not updated_profile:
        return {"status": "error", "message": "Profile not found or update failed"}
    return {"status": "success", "message": "Profile updated successfully", "data": updated_profile}