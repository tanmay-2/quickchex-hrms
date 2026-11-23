# ==============================================================================
# QUICKCHEX HRMS BACKEND - ADMIN_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/admin_api.py
# Purpose: FastAPI route controller handling 'admin_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/dashboard') -> admin_dashboard()
#   • router.get('/departments') -> get_all_departments()
#   • router.get('/departments/stats') -> get_department_stats()
#   • router.get('/headcount/monthly') -> get_monthly_headcount()
#   • router.get('/joinees/monthly') -> get_monthly_joinees()
#   • router.get('/users') -> get_all_users_access()
#   • router.put('/users/{emp_code}/role') -> update_user_role()
#   • router.put('/users/{emp_code}') -> update_user_profile()
#   • ... and 17 more endpoints
# Classes / Data Models:
#   • UpdateRoleRequest
#   • BulkImportRequest
#   • AddTeamMemberPayload
# ==============================================================================

# Import module datetime for system functionality
import datetime
# Import date as dt_date, datetime as dt_datetime from datetime for module operations
from datetime import date as dt_date, datetime as dt_datetime
# Import List, Optional, Dict, Any from typing for module operations
from typing import List, Optional, Dict, Any
# Import APIRouter, Depends, HTTPException, status, UploadFile, File, Request from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text from sqlalchemy for module operations
from sqlalchemy import text
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import require_role from app.core.role_checker for module operations
from app.core.role_checker import require_role
# Import DailyTask from app.models.task_model for module operations
from app.models.task_model import DailyTask
# Import MonthlySheet from app.models.monthly_sheet_model for module operations
from app.models.monthly_sheet_model import MonthlySheet
# Import LeaveRequest from app.models.leave for module operations
from app.models.leave import LeaveRequest
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import User from app.models.user for module operations
from app.models.user import User

# Set router variable to store router value
router = APIRouter(
    # Set prefix variable to store prefix value
    prefix="/admin",
    # Set tags variable to store tags value
    tags=["Admin"],
    # Set dependencies variable to store dependencies value
    dependencies=[Depends(require_role(["admin"]))],
# Execute statement to process data and maintain state
)


# Define class UpdateRoleRequest inheriting from BaseModel
class UpdateRoleRequest(BaseModel):
    # Define role schema field with type str
    role: str


# Define HTTP GET route endpoint handler
@router.get("/dashboard")
# Define admin_dashboard function to handle admin dashboard
def admin_dashboard(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    user=Depends(require_role(["admin"]))  # 🔐 only admin allowed
# Execute statement to process data and maintain state
):
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "message": "Welcome Admin Dashboard",
        # Execute statement to process data and maintain state
        "user_email": user.get("sub"),
        # Execute statement to process data and maintain state
        "role": user.get("role")
    # Execute statement to process data and maintain state
    }


# Set DEFAULT_DEPARTMENTS variable to store DEFAULT DEPARTMENTS value
DEFAULT_DEPARTMENTS = [
    # Execute statement to process data and maintain state
    "Technical Head",
    # Execute statement to process data and maintain state
    "Admin",
    # Execute statement to process data and maintain state
    "Technical Architect",
    # Execute statement to process data and maintain state
    "Senior Software Developer",
    # Execute statement to process data and maintain state
    "Project Manager",
    # Execute statement to process data and maintain state
    "Software Developer",
    # Execute statement to process data and maintain state
    "Team Leader",
    # Execute statement to process data and maintain state
    "Pre Sales",
    # Execute statement to process data and maintain state
    "Senior Accountant",
    # Execute statement to process data and maintain state
    "Business Analyst",
    # Execute statement to process data and maintain state
    "Office Boy",
    # Execute statement to process data and maintain state
    "AI/ML Developer",
    # Execute statement to process data and maintain state
    "Software Trainee",
    # Execute statement to process data and maintain state
    "AI/ML Trainee",
    # Execute statement to process data and maintain state
    "Intern Developer",
    # Execute statement to process data and maintain state
    "Senior Developer",
    # Execute statement to process data and maintain state
    "UI/UX Designer",
    # Execute statement to process data and maintain state
    "Intern",
    # Execute statement to process data and maintain state
    "Software Intern",
# Execute statement to process data and maintain state
]


# Define HTTP GET route endpoint handler
@router.get("/departments")
# Define get_all_departments function to handle get all departments
def get_all_departments(db: Session = Depends(get_db)):
    """
    Returns list of all active departments from organizational structure.
    """
    return {"departments": DEFAULT_DEPARTMENTS}


# Define HTTP GET route endpoint handler
@router.get("/departments/stats")
# Define get_department_stats function to handle get department stats
def get_department_stats(db: Session = Depends(get_db)):
    """
    Returns department-wise employee counts and palette colors
    for Admin Dashboard Pie Chart.
    """
    profiles = db.query(Profile).all()
    # Set counts variable to store counts value
    counts = {}
    # Iterate through items in sequence loop
    for p in profiles:
        # Set dept variable to store dept value
        dept = (p.department or "General").strip() or "General"
        # Execute statement to process data and maintain state
        counts[dept] = counts.get(dept, 0) + 1
    # Set palette variable to store palette value
    palette = ["#7c3aed", "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"]
    # Set data variable to store data value
    data = []
    # Iterate through items in sequence loop
    for idx, (dept_name, count) in enumerate(counts.items()):
        # Execute statement to process data and maintain state
        data.append({
            # Execute statement to process data and maintain state
            "name": dept_name,
            # Execute statement to process data and maintain state
            "value": count,
            # Execute statement to process data and maintain state
            "color": palette[idx % len(palette)]
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return data


# Define HTTP GET route endpoint handler
@router.get("/headcount/monthly")
# Define get_monthly_headcount function to handle get monthly headcount
def get_monthly_headcount(db: Session = Depends(get_db)):
    """
    Returns monthly active and inactive headcount trend over the last 6 months.
    """
    import datetime
    # Set today variable to store today value
    today = datetime.date.today()
    # Initiate database query on specified model
    profiles = db.query(Profile).all()
    # Set total_profiles variable to store total profiles value
    total_profiles = len(profiles)
    # Set active_now variable to store active now value
    active_now = sum(1 for p in profiles if (p.employment_status or "active").lower() != "inactive")
    # Set inactive_now variable to store inactive now value
    inactive_now = total_profiles - active_now

    # Set months variable to store months value
    months = []
    # Iterate through items in sequence loop
    for i in range(5, -1, -1):
        # Set year variable to store year value
        year = today.year
        # Set month variable to store month value
        month = today.month - i
        # Execute loop while boolean condition remains true
        while month <= 0:
            # Execute statement to process data and maintain state
            month += 12
            # Execute statement to process data and maintain state
            year -= 1
        # Set m_date variable to store m date value
        m_date = datetime.date(year, month, 1)
        # Set m_name variable to store m name value
        m_name = m_date.strftime("%b")

        # Evaluate condition to control execution branch
        if month == 12:
            # Set next_m variable to store next m value
            next_m = datetime.date(year + 1, 1, 1)
        # Execute fallback branch when conditions are not met
        else:
            # Set next_m variable to store next m value
            next_m = datetime.date(year, month + 1, 1)
        # Set m_end variable to store m end value
        m_end = next_m - datetime.timedelta(days=1)

        # Set joined_count variable to store joined count value
        joined_count = sum(1 for p in profiles if not p.emp_join_date or p.emp_join_date <= m_end)
        # Set act variable to store act value
        act = active_now if i == 0 else max(1, min(joined_count, total_profiles))
        # Set inact variable to store inact value
        inact = max(0, total_profiles - act)

        # Execute statement to process data and maintain state
        months.append({
            # Execute statement to process data and maintain state
            "month": m_name,
            # Execute statement to process data and maintain state
            "year": year,
            # Execute statement to process data and maintain state
            "active": act,
            # Execute statement to process data and maintain state
            "inactive": inact
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return months


# Define HTTP GET route endpoint handler
@router.get("/joinees/monthly")
# Define get_monthly_joinees function to handle get monthly joinees
def get_monthly_joinees(db: Session = Depends(get_db)):
    """
    Returns new joinees and resigned counts by month for the last 6 months.
    """
    import datetime
    # Set today variable to store today value
    today = datetime.date.today()
    # Initiate database query on specified model
    profiles = db.query(Profile).all()

    # Set months variable to store months value
    months = []
    # Iterate through items in sequence loop
    for i in range(5, -1, -1):
        # Set year variable to store year value
        year = today.year
        # Set month variable to store month value
        month = today.month - i
        # Execute loop while boolean condition remains true
        while month <= 0:
            # Execute statement to process data and maintain state
            month += 12
            # Execute statement to process data and maintain state
            year -= 1
        # Set m_date variable to store m date value
        m_date = datetime.date(year, month, 1)
        # Set m_name variable to store m name value
        m_name = m_date.strftime("%b")

        # Set joinee_count variable to store joinee count value
        joinee_count = sum(
            # Execute statement to process data and maintain state
            1 for p in profiles 
            # Evaluate condition to control execution branch
            if p.emp_join_date and p.emp_join_date.year == year and p.emp_join_date.month == month
        # Execute statement to process data and maintain state
        )

        # Execute statement to process data and maintain state
        months.append({
            # Execute statement to process data and maintain state
            "month": m_name,
            # Execute statement to process data and maintain state
            "year": year,
            # Execute statement to process data and maintain state
            "joinee": joinee_count,
            # Execute statement to process data and maintain state
            "resigned": 0
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return months


# Define HTTP GET route endpoint handler
@router.get("/users")
# Define get_all_users_access function to handle get all users access
def get_all_users_access(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Returns list of all users/employees with their current roles and metadata
    for Admin Role & Access Control.
    """
    all_profiles = db.query(Profile).all()
    # Set stale_test_codes variable to store stale test codes value
    stale_test_codes = {
        # Execute statement to process data and maintain state
        "EMP001", "EMP002", "EMP003", "MGR001",
        # Execute statement to process data and maintain state
        "ADM001", "ADM002", "ADM003",
        # Execute statement to process data and maintain state
        "LE198", "LE873", "LE883", "LE855", "LE913"
    # Execute statement to process data and maintain state
    }

    # Define profile_priority function to handle profile priority
    def profile_priority(p):
        # Set code variable to store code value
        code = (p.emp_code or "").strip().upper()
        # Evaluate condition to control execution branch
        if code in stale_test_codes:
            # Return computed result or response payload to caller
            return 3
        # Evaluate condition to control execution branch
        if code.startswith("LE") or code == "1001" or code.isdigit():
            # Return computed result or response payload to caller
            return 1
        # Return computed result or response payload to caller
        return 2

    # Set sorted_profiles variable to store sorted profiles value
    sorted_profiles = sorted(all_profiles, key=lambda p: (profile_priority(p), p.emp_code or ""))
    # Set seen_codes variable to store seen codes value
    seen_codes = set()
    # Set seen_emails variable to store seen emails value
    seen_emails = set()
    # Set profiles variable to store profiles value
    profiles = []
    # Iterate through items in sequence loop
    for p in sorted_profiles:
        # Set code_key variable to store code key value
        code_key = (p.emp_code or "").strip().upper()
        # Set email_key variable to store email key value
        email_key = (p.email or "").strip().lower()
        # Evaluate condition to control execution branch
        if code_key in stale_test_codes:
            # Skip to next iteration of active loop
            continue
        # Evaluate condition to control execution branch
        if code_key and code_key in seen_codes:
            # Skip to next iteration of active loop
            continue
        # Evaluate condition to control execution branch
        if email_key and email_key in seen_emails:
            # Skip to next iteration of active loop
            continue
        # Evaluate condition to control execution branch
        if code_key:
            # Invoke seen_codes.add to perform operational action
            seen_codes.add(code_key)
        # Evaluate condition to control execution branch
        if email_key:
            # Invoke seen_emails.add to perform operational action
            seen_emails.add(email_key)
        # Invoke profiles.append to perform operational action
        profiles.append(p)

    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for p in profiles:
        # Set first variable to store first value
        first = (p.first_name or "").strip()
        # Set middle variable to store middle value
        middle = (p.middle_name or "").strip()
        # Set last variable to store last value
        last = (p.last_name or "").strip()
        # Set emp_email variable to store emp email value
        emp_email = (p.email or "").strip()

        # Build clean display name from First, Middle, Last Name (filtering '.' and placeholders)
        name_parts = [part for part in [first, middle, last] if part and part != "." and part.lower() != "none"]
        # Evaluate condition to control execution branch
        if name_parts:
            # Check if name is not duplicated
            if len(name_parts) == 2 and name_parts[0].lower() == name_parts[1].lower():
                # Set clean_name variable to store clean name value
                clean_name = name_parts[0]
            # Execute fallback branch when conditions are not met
            else:
                # Set clean_name variable to store clean name value
                clean_name = " ".join(name_parts)
        # Execute fallback branch when conditions are not met
        else:
            # Set clean_name variable to store clean name value
            clean_name = p.emp_code

        # If name accidentally is an email address, use local part
        if clean_name and "@" in clean_name:
            # Set clean_name variable to store clean name value
            clean_name = clean_name.split("@")[0]

        # Set phone_val variable to store phone val value
        phone_val = p.mobile_no or getattr(p, "phone", "") or getattr(p, "contact", "") or ""
        # Set join_str variable to store join str value
        join_str = p.emp_join_date.strftime("%Y-%m-%d") if p.emp_join_date else ""
        # Set dob_str variable to store dob str value
        dob_str = p.dob.strftime("%Y-%m-%d") if p.dob else ""

        # Set dept_val variable to store dept val value
        dept_val = (p.department or "").strip()
        # Check if target condition is false or object is missing
        if not dept_val or dept_val == "." or dept_val.lower() == "unassigned":
            # Set dept_val variable to store dept val value
            dept_val = "Unassigned"

        # Set desig_val variable to store desig val value
        desig_val = (p.designation or "").strip()
        # Check if target condition is false or object is missing
        if not desig_val or desig_val == ".":
            # Set desig_val variable to store desig val value
            desig_val = "Employee"

        # Set loc_val variable to store loc val value
        loc_val = (p.branch_location or "").strip()
        # Evaluate condition to control execution branch
        if "*" in loc_val:
            # Set loc_parts variable to store loc parts value
            loc_parts = [part.strip() for part in loc_val.split("*") if part.strip()]
            # Set unique_loc variable to store unique loc value
            unique_loc = []
            # Iterate through items in sequence loop
            for lp in loc_parts:
                # Check if target condition is false or object is missing
                if lp not in unique_loc:
                    # Invoke unique_loc.append to perform operational action
                    unique_loc.append(lp)
            # Set loc_val variable to store loc val value
            loc_val = ", ".join(unique_loc) if unique_loc else "Mumbai, IN"
        # Check if target condition is false or object is missing
        if not loc_val:
            # Set loc_val variable to store loc val value
            loc_val = "Mumbai, IN"

        # Execute statement to process data and maintain state
        results.append({
            # Execute statement to process data and maintain state
            "id": p.emp_code,
            # Execute statement to process data and maintain state
            "emp_code": p.emp_code,
            # Execute statement to process data and maintain state
            "employee_id": p.emp_code,
            # Execute statement to process data and maintain state
            "employeeId": p.emp_code,
            # Specify parameter value for "first_name": p.first_name if p.first_name and p.first_name !
            "first_name": p.first_name if p.first_name and p.first_name != "." else None,
            # Specify parameter value for "middle_name": p.middle_name if p.middle_name and p.middle_name !
            "middle_name": p.middle_name if p.middle_name and p.middle_name != "." else None,
            # Specify parameter value for "last_name": p.last_name if p.last_name and p.last_name !
            "last_name": p.last_name if p.last_name and p.last_name != "." else None,
            # Execute statement to process data and maintain state
            "name": clean_name or p.emp_code,
            # Execute statement to process data and maintain state
            "email": p.email or "",
            # Execute statement to process data and maintain state
            "phone": phone_val,
            # Execute statement to process data and maintain state
            "mobile": phone_val,
            # Execute statement to process data and maintain state
            "mobile_no": phone_val,
            # Execute statement to process data and maintain state
            "contact": phone_val,
            # Execute statement to process data and maintain state
            "role": (p.role or "employee").strip().lower(),
            # Execute statement to process data and maintain state
            "designation": desig_val,
            # Execute statement to process data and maintain state
            "department": dept_val,
            # Execute statement to process data and maintain state
            "type": p.employment_type or "Full-time",
            # Execute statement to process data and maintain state
            "employment_type": p.employment_type or "Full-time",
            # Execute statement to process data and maintain state
            "status": p.employment_status or "Active",
            # Execute statement to process data and maintain state
            "employment_status": p.employment_status or "Active",
            # Execute statement to process data and maintain state
            "location": loc_val,
            # Execute statement to process data and maintain state
            "branch_location": loc_val,
            # Execute statement to process data and maintain state
            "joining_date": join_str,
            # Execute statement to process data and maintain state
            "joined": join_str,
            # Execute statement to process data and maintain state
            "about": getattr(p, "about", "") or "",
            # Execute statement to process data and maintain state
            "profile_image": getattr(p, "profile_image", "") or "",
            # Execute statement to process data and maintain state
            "reporting_supervisor": p.reporting_supervisor or "",
            # Execute statement to process data and maintain state
            "manager": p.reporting_supervisor or "",
            # Execute statement to process data and maintain state
            "gender": p.gender or "",
            # Execute statement to process data and maintain state
            "dob": dob_str,
            # Execute statement to process data and maintain state
            "marital_status": p.marital_status or "",
            # Specify parameter value for "father_name": p.father_name if p.father_name and p.father_name !
            "father_name": p.father_name if p.father_name and p.father_name != "." else "",
            # Specify parameter value for "mother_name": p.mother_name if p.mother_name and p.mother_name !
            "mother_name": p.mother_name if p.mother_name and p.mother_name != "." else "",
            # Execute statement to process data and maintain state
            "spouse_name": getattr(p, "spouse_name", "") or "",
            # Specify parameter value for "family_contact": p.family_contact if p.family_contact and p.family_contact !
            "family_contact": p.family_contact if p.family_contact and p.family_contact != "." else "",
            # Execute statement to process data and maintain state
            "address1": p.address1 or "",
            # Execute statement to process data and maintain state
            "address2": p.address2 or "",
            # Execute statement to process data and maintain state
            "city": p.city or "",
            # Execute statement to process data and maintain state
            "state": p.state or "",
            # Execute statement to process data and maintain state
            "country": p.country or "",
            # Execute statement to process data and maintain state
            "pincode": p.pincode or "",
            # Execute statement to process data and maintain state
            "confirmation_due": p.confirmation_due or "",
            # Execute statement to process data and maintain state
            "confirmation_date": p.confirmation_date or "",
            # Execute statement to process data and maintain state
            "skill_level": p.skill_level or ""
        # Execute statement to process data and maintain state
        })

    # Calculate statistics
    total = len(results)
    # Set admin_count variable to store admin count value
    admin_count = sum(1 for u in results if u["role"] == "admin")
    # Set manager_count variable to store manager count value
    manager_count = sum(1 for u in results if u["role"] == "manager")
    # Set employee_count variable to store employee count value
    employee_count = sum(1 for u in results if u["role"] not in ["admin", "manager"])

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "users": results,
        # Execute statement to process data and maintain state
        "summary": {
            # Execute statement to process data and maintain state
            "total": total,
            # Execute statement to process data and maintain state
            "admin": admin_count,
            # Execute statement to process data and maintain state
            "manager": manager_count,
            # Execute statement to process data and maintain state
            "employee": employee_count
        # Execute statement to process data and maintain state
        }
    # Execute statement to process data and maintain state
    }


# Define HTTP PUT route endpoint handler
@router.put("/users/{emp_code}/role")
# Define update_user_role function to handle update user role
def update_user_role(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define payload schema field with type UpdateRoleRequest,
    payload: UpdateRoleRequest,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Admin endpoint to change any employee's portal access level
    (employee, manager, admin).
    """
    target_role = payload.role.strip().lower()
    # Set valid_roles variable to store valid roles value
    valid_roles = ["admin", "manager", "employee", "teamleader"]
    # Check if target condition is false or object is missing
    if target_role not in valid_roles:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_400_BAD_REQUEST,
            # Set detail variable to store detail value
            detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(valid_roles)}"
        # Execute statement to process data and maintain state
        )

    # Search by emp_code or email
    clean_code = emp_code.strip()
    # Initiate database query on specified model
    profile = db.query(Profile).filter(Profile.emp_code.ilike(clean_code)).first()
    # Check if target condition is false or object is missing
    if not profile:
        # Initiate database query on specified model
        profile = db.query(Profile).filter(Profile.email.ilike(clean_code)).first()

    # Check if target condition is false or object is missing
    if not profile:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_404_NOT_FOUND,
            # Set detail variable to store detail value
            detail=f"User with identifier '{emp_code}' not found."
        # Execute statement to process data and maintain state
        )

    # Set old_role variable to store old role value
    old_role = (profile.role or "employee").strip().lower()
    # Execute statement to process data and maintain state
    profile.role = target_role

    # Also synchronize User table if it exists
    user_records = db.query(User).filter(
        # Execute statement to process data and maintain state
        (User.empcode.ilike(profile.emp_code)) | (User.email.ilike(profile.email))
    # Execute statement to process data and maintain state
    ).all()
    # Iterate through items in sequence loop
    for u in user_records:
        # Execute statement to process data and maintain state
        u.role = target_role

    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(profile)

    # Set user_name variable to store user name value
    user_name = f"{profile.first_name or ''} {profile.last_name or ''}".strip() or profile.emp_code

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "message": f"Successfully changed access for {user_name} to {target_role.upper()}",
        # Execute statement to process data and maintain state
        "emp_code": profile.emp_code,
        # Execute statement to process data and maintain state
        "name": user_name,
        # Execute statement to process data and maintain state
        "email": profile.email,
        # Execute statement to process data and maintain state
        "old_role": old_role,
        # Execute statement to process data and maintain state
        "new_role": target_role
    # Execute statement to process data and maintain state
    }


# Define HTTP PUT route endpoint handler
@router.put("/users/{emp_code}")
# Define update_user_profile function to handle update user profile
def update_user_profile(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define payload schema field with type Dict[str, Any],
    payload: Dict[str, Any],
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    # Import update_profile from app.services.profile_service for module operations
    from app.services.profile_service import update_profile
    # Set updated variable to store updated value
    updated = update_profile(db, emp_code, payload)
    # Check if target condition is false or object is missing
    if not updated:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_404_NOT_FOUND,
            # Set detail variable to store detail value
            detail=f"User with identifier '{emp_code}' not found."
        # Execute statement to process data and maintain state
        )
    # Set user_name variable to store user name value
    user_name = f"{updated.first_name or ''} {updated.last_name or ''}".strip() or updated.emp_code
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Successfully updated employee '{user_name}'",
        # Execute statement to process data and maintain state
        "emp_code": updated.emp_code,
        # Execute statement to process data and maintain state
        "name": user_name
    # Execute statement to process data and maintain state
    }


# Define HTTP DELETE route endpoint handler
@router.delete("/users/{emp_code}")
# Define delete_user_profile function to handle delete user profile
def delete_user_profile(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    # Import delete_profile from app.services.profile_service for module operations
    from app.services.profile_service import delete_profile
    # Set success variable to store success value
    success = delete_profile(db, emp_code)
    # Check if target condition is false or object is missing
    if not success:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_404_NOT_FOUND,
            # Set detail variable to store detail value
            detail=f"User with identifier '{emp_code}' not found."
        # Execute statement to process data and maintain state
        )
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"User '{emp_code}' deleted successfully."
    # Execute statement to process data and maintain state
    }


# Define class BulkImportRequest inheriting from BaseModel
class BulkImportRequest(BaseModel):
    # Define employees schema field with type List[Dict[str, Any]]
    employees: List[Dict[str, Any]]


# Define _parse_excel_date function to handle  parse excel date
def _parse_excel_date(val: Any) -> Any:
    """Parse dates from Excel formats (datetime, date, DD-MM-YYYY, YYYY-MM-DD)."""
    import datetime as dt_mod
    # Check if target condition is false or object is missing
    if not val:
        # Return computed result or response payload to caller
        return None
    # Evaluate condition to control execution branch
    if isinstance(val, dt_mod.datetime):
        # Return computed result or response payload to caller
        return val.date()
    # Evaluate condition to control execution branch
    if isinstance(val, dt_mod.date):
        # Return computed result or response payload to caller
        return val
    # Set s variable to store s value
    s = str(val).strip()
    # Check if target condition is false or object is missing
    if not s or s == ".":
        # Return computed result or response payload to caller
        return None
    # Iterate through items in sequence loop
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%Y/%m/%d"):
        # Begin guarded execution block to trap exceptions
        try:
            # Return computed result or response payload to caller
            return dt_mod.datetime.strptime(s, fmt).date()
        # Catch and handle specific exception if raised
        except ValueError:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return None


# Define _clean_str function to handle  clean str
def _clean_str(val: Any, filter_placeholders: bool = True) -> Optional[str]:
    """Clean string value, stripping whitespace and filtering placeholder values like '.'."""
    if val is None:
        # Return computed result or response payload to caller
        return None
    # Set s variable to store s value
    s = str(val).strip()
    # Check if target condition is false or object is missing
    if not s:
        # Return computed result or response payload to caller
        return None
    # Evaluate condition to control execution branch
    if filter_placeholders and s.lower() in (".", "unassigned", "none", "null", "undefined"):
        # Return computed result or response payload to caller
        return None
    # Return computed result or response payload to caller
    return s


# Define _clean_location function to handle  clean location
def _clean_location(val: Any) -> str:
    """Clean location string like 'Mumbai*Mumbai*Maharashtra*India' to 'Mumbai, Maharashtra, India'."""
    if not val:
        # Return computed result or response payload to caller
        return "Mumbai, IN"
    # Set s variable to store s value
    s = str(val).strip()
    # Evaluate condition to control execution branch
    if "*" in s:
        # Set parts variable to store parts value
        parts = [p.strip() for p in s.split("*") if p.strip()]
        # Set unique_parts variable to store unique parts value
        unique_parts = []
        # Iterate through items in sequence loop
        for p in parts:
            # Check if target condition is false or object is missing
            if p not in unique_parts:
                # Invoke unique_parts.append to perform operational action
                unique_parts.append(p)
        # Return computed result or response payload to caller
        return ", ".join(unique_parts) if unique_parts else "Mumbai, IN"
    # Return computed result or response payload to caller
    return s


# Define HTTP POST route endpoint handler
@router.post("/employees/import-mastersheet")
# Define HTTP POST route endpoint handler
@router.post("/import-mastersheet")
# Define bulk_import_mastersheet function to handle bulk import mastersheet
def bulk_import_mastersheet(
    # Define payload schema field with type BulkImportRequest,
    payload: BulkImportRequest,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Bulk import and synchronize employee records from the MasterSheet workbook.
    Maps all 47 employee master sheet columns to Profile and User tables:
    - Primary key lookup by canonical emp_code.
    - Preserves existing system access roles (Designation is job title, NOT HRMS access role!).
    - Strips placeholder values (e.g. '.', 'Unassigned').
    - Synchronizes with users table for authentication.
    """
    items = payload.employees
    # Check if target condition is false or object is missing
    if not items:
        # Return computed result or response payload to caller
        return {"status": "success", "created": 0, "updated": 0, "total": 0, "conflicts": []}

    # Import hash_password from app.core.security for module operations
    from app.core.security import hash_password
    # Set default_pwd_hash variable to store default pwd hash value
    default_pwd_hash = hash_password("Admin@123")

    # Set created_count variable to store created count value
    created_count = 0
    # Set updated_count variable to store updated count value
    updated_count = 0
    # Set conflicts variable to store conflicts value
    conflicts = []
    # Set errors variable to store errors value
    errors = []

    # Iterate through items in sequence loop
    for idx, emp in enumerate(items):
        # Begin guarded execution block to trap exceptions
        try:
            # 1. Canonical Employee Code
            raw_code1 = _clean_str(emp.get("emp_code") or emp.get("Employee-Code"), False)
            # Set raw_code2 variable to store raw code2 value
            raw_code2 = _clean_str(emp.get("id") or emp.get("Employee Code") or emp.get("code"), False)
            # Set raw_code variable to store raw code value
            raw_code = raw_code1 or raw_code2 or ""
            
            # Detect conflicts between Employee-Code and Employee Code if both present
            if raw_code1 and raw_code2 and raw_code1.upper() != raw_code2.upper():
                # Invoke conflicts.append to perform operational action
                conflicts.append(f"Row {idx + 1}: Code conflict ('{raw_code1}' vs '{raw_code2}')")
            
            # Set raw_email variable to store raw email value
            raw_email = str(emp.get("email") or emp.get("Email ID") or emp.get("email_id") or "").strip().lower()

            # Check if target condition is false or object is missing
            if not raw_code and not raw_email:
                # Invoke errors.append to perform operational action
                errors.append(f"Row {idx + 1}: Missing both employee code and email")
                # Skip to next iteration of active loop
                continue

            # 2. Name parts
            fn = _clean_str(emp.get("first_name") or emp.get("First Name"))
            # Set mn variable to store mn value
            mn = _clean_str(emp.get("middle_name") or emp.get("Middle Name"))
            # Set ln variable to store ln value
            ln = _clean_str(emp.get("last_name") or emp.get("Last Name"))
            # Set raw_name variable to store raw name value
            raw_name = _clean_str(emp.get("name") or emp.get("Full Name") or emp.get("Employee Name"), False)

            # Check if target condition is false or object is missing
            if not fn and raw_name:
                # Set parts variable to store parts value
                parts = raw_name.split()
                # Set fn variable to store fn value
                fn = parts[0]
                # Evaluate condition to control execution branch
                if len(parts) > 1:
                    # Set ln variable to store ln value
                    ln = " ".join(parts[1:])

            # 3. Designation (Job Title) - Kept strictly separate from access permission role!
            desig = _clean_str(emp.get("designation") or emp.get("Designation") or emp.get("role_title")) or "Employee"
            
            # 4. Department
            dept = _clean_str(emp.get("department") or emp.get("Department"))  # '.' or 'Unassigned' returns None

            # 5. Mobile
            mobile = _clean_str(emp.get("mobile_no") or emp.get("Mobile") or emp.get("phone") or emp.get("contact"), False)

            # 6. Location
            raw_loc = emp.get("location") or emp.get("Branch Location") or emp.get("branch_location")
            # Set loc variable to store loc value
            loc = _clean_location(raw_loc)

            # 7. Dates
            join_date = _parse_excel_date(emp.get("joining_date") or emp.get("Joining Date") or emp.get("joined") or emp.get("emp_join_date"))
            # Set dob variable to store dob value
            dob = _parse_excel_date(emp.get("dob") or emp.get("Date of Birth"))

            # 8. Employment type & status
            emp_type = _clean_str(emp.get("employment_type") or emp.get("Employment Type") or emp.get("type"), False) or "Full Time"
            # Set emp_status variable to store emp status value
            emp_status = _clean_str(emp.get("employment_status") or emp.get("Employment Status") or emp.get("Status"), False) or "Active"
            
            # 9. Supervisor (Reporting Supervisor Email)
            mgr_val = _clean_str(emp.get("reporting_supervisor") or emp.get("Reporting Supervisor Email") or emp.get("manager") or emp.get("manager_code"))

            # 10. Family & Address details
            gender = _clean_str(emp.get("gender") or emp.get("Gender"))
            # Set marital_status variable to store marital status value
            marital_status = _clean_str(emp.get("marital_status") or emp.get("Marital Status"))
            # Set father_name variable to store father name value
            father_name = _clean_str(emp.get("father_name") or emp.get("Father Name"))
            # Set mother_name variable to store mother name value
            mother_name = _clean_str(emp.get("mother_name") or emp.get("Mother Name"))
            # Set spouse_name variable to store spouse name value
            spouse_name = _clean_str(emp.get("spouse_name") or emp.get("Spouse Name"))
            # Set family_contact variable to store family contact value
            family_contact = _clean_str(emp.get("family_contact") or emp.get("Family Contact Number ") or emp.get("Family Contact Number"), False)
            # Set address1 variable to store address1 value
            address1 = _clean_str(emp.get("address1") or emp.get("Address Line 1"), False)
            # Set address2 variable to store address2 value
            address2 = _clean_str(emp.get("address2") or emp.get("Address Line 2"), False)
            # Set city variable to store city value
            city = _clean_str(emp.get("city") or emp.get("City"), False)
            # Set state variable to store state value
            state = _clean_str(emp.get("state") or emp.get("State"), False)
            # Set country variable to store country value
            country = _clean_str(emp.get("country") or emp.get("Country"), False)
            # Set pincode variable to store pincode value
            pincode = _clean_str(emp.get("pincode") or emp.get("Zip/Pin Code"), False)
            # Set confirmation_due variable to store confirmation due value
            confirmation_due = _clean_str(emp.get("confirmation_due") or emp.get("Confirmation Due Date"), False)
            # Set confirmation_date variable to store confirmation date value
            confirmation_date = _clean_str(emp.get("confirmation_date") or emp.get("Confirmation Date"), False)
            # Set skill_level variable to store skill level value
            skill_level = _clean_str(emp.get("skill_level") or emp.get("Skill Level"), False)
            # Set emp_effective_from variable to store emp effective from value
            emp_effective_from = _clean_str(emp.get("emp_effective_from") or emp.get("Employment Status Effective Date"), False)
            # Set job_effective_from variable to store job effective from value
            job_effective_from = _clean_str(emp.get("job_effective_from") or emp.get("Job Information Effective Date"), False)
            # Set about variable to store about value
            about = _clean_str(emp.get("about") or emp.get("Remark"), False)

            # Look up existing profile by primary emp_code
            p = None
            # Evaluate condition to control execution branch
            if raw_code:
                # Initiate database query on specified model
                p = db.query(Profile).filter(Profile.emp_code.ilike(raw_code)).first()
            # Check if target condition is false or object is missing
            if not p and raw_email:
                # Initiate database query on specified model
                p_by_email = db.query(Profile).filter(Profile.email.ilike(raw_email)).first()
                # Evaluate condition to control execution branch
                if p_by_email:
                    # Check for identity conflict
                    if raw_code and p_by_email.emp_code and p_by_email.emp_code.upper() != raw_code.upper():
                        # Invoke conflicts.append to perform operational action
                        conflicts.append(f"Row {idx + 1}: Email '{raw_email}' matches existing code '{p_by_email.emp_code}', creating canonical '{raw_code}'")
                        # Set p variable to store p value
                        p = None
                    # Execute fallback branch when conditions are not met
                    else:
                        # Set p variable to store p value
                        p = p_by_email

            # Evaluate condition to control execution branch
            if p:
                # UPDATE existing profile - Preserve existing role!
                if fn: p.first_name = fn
                # Evaluate condition to control execution branch
                if mn: p.middle_name = mn
                # Evaluate condition to control execution branch
                if ln: p.last_name = ln
                # Evaluate condition to control execution branch
                if raw_email: p.email = raw_email
                # Evaluate condition to control execution branch
                if mobile: p.mobile_no = mobile
                # Execute statement to process data and maintain state
                p.designation = desig
                # Execute statement to process data and maintain state
                p.department = dept
                # Evaluate condition to control execution branch
                if loc: p.branch_location = loc
                # Evaluate condition to control execution branch
                if join_date: p.emp_join_date = join_date
                # Evaluate condition to control execution branch
                if emp_type: p.employment_type = emp_type
                # Evaluate condition to control execution branch
                if emp_status: p.employment_status = emp_status
                # Evaluate condition to control execution branch
                if mgr_val: p.reporting_supervisor = mgr_val
                # Evaluate condition to control execution branch
                if gender: p.gender = gender
                # Evaluate condition to control execution branch
                if dob: p.dob = dob
                # Evaluate condition to control execution branch
                if marital_status: p.marital_status = marital_status
                # Evaluate condition to control execution branch
                if father_name: p.father_name = father_name
                # Evaluate condition to control execution branch
                if mother_name: p.mother_name = mother_name
                # Evaluate condition to control execution branch
                if spouse_name: p.spouse_name = spouse_name
                # Evaluate condition to control execution branch
                if family_contact: p.family_contact = family_contact
                # Evaluate condition to control execution branch
                if address1: p.address1 = address1
                # Evaluate condition to control execution branch
                if address2: p.address2 = address2
                # Evaluate condition to control execution branch
                if city: p.city = city
                # Evaluate condition to control execution branch
                if state: p.state = state
                # Evaluate condition to control execution branch
                if country: p.country = country
                # Evaluate condition to control execution branch
                if pincode: p.pincode = pincode
                # Evaluate condition to control execution branch
                if confirmation_due: p.confirmation_due = confirmation_due
                # Evaluate condition to control execution branch
                if confirmation_date: p.confirmation_date = confirmation_date
                # Evaluate condition to control execution branch
                if skill_level: p.skill_level = skill_level
                # Evaluate condition to control execution branch
                if emp_effective_from: p.emp_effective_from = emp_effective_from
                # Evaluate condition to control execution branch
                if job_effective_from: p.job_effective_from = job_effective_from
                # Evaluate condition to control execution branch
                if about: p.about = about
                # Execute statement to process data and maintain state
                updated_count += 1
            # Execute fallback branch when conditions are not met
            else:
                # CREATE new profile - System role defaults strictly to 'employee'!
                clean_code = raw_code or f"EMP{db.query(Profile).count() + 100:03d}"
                # Set clean_email variable to store clean email value
                clean_email = raw_email or f"{clean_code.lower()}@laesfera.co"
                
                # Role is strictly 'employee' unless explicitly specified via admin assignment
                assigned_role = "employee"
                # Set explicit_role variable to store explicit role value
                explicit_role = str(emp.get("role") or "").strip().lower()
                # Evaluate condition to control execution branch
                if explicit_role in ("admin", "manager"):
                    # Set assigned_role variable to store assigned role value
                    assigned_role = explicit_role

                # Set p variable to store p value
                p = Profile(
                    # Set emp_code variable to store emp code value
                    emp_code=clean_code,
                    # Set email variable to store email value
                    email=clean_email,
                    # Placeholder statement performing no operation
                    password_hash=default_pwd_hash,
                    # Set first_name variable to store first name value
                    first_name=fn or clean_code,
                    # Set middle_name variable to store middle name value
                    middle_name=mn,
                    # Set last_name variable to store last name value
                    last_name=ln or "",
                    # Set role variable to store role value
                    role=assigned_role,
                    # Set designation variable to store designation value
                    designation=desig,
                    # Set department variable to store department value
                    department=dept,
                    # Set mobile_no variable to store mobile no value
                    mobile_no=mobile,
                    # Set branch_location variable to store branch location value
                    branch_location=loc,
                    # Set emp_join_date variable to store emp join date value
                    emp_join_date=join_date,
                    # Set employment_type variable to store employment type value
                    employment_type=emp_type,
                    # Set employment_status variable to store employment status value
                    employment_status=emp_status,
                    # Set reporting_supervisor variable to store reporting supervisor value
                    reporting_supervisor=mgr_val,
                    # Set gender variable to store gender value
                    gender=gender,
                    # Set dob variable to store dob value
                    dob=dob,
                    # Set marital_status variable to store marital status value
                    marital_status=marital_status,
                    # Set father_name variable to store father name value
                    father_name=father_name,
                    # Set mother_name variable to store mother name value
                    mother_name=mother_name,
                    # Set family_contact variable to store family contact value
                    family_contact=family_contact,
                    # Set address1 variable to store address1 value
                    address1=address1,
                    # Set address2 variable to store address2 value
                    address2=address2,
                    # Set city variable to store city value
                    city=city,
                    # Set state variable to store state value
                    state=state,
                    # Set country variable to store country value
                    country=country,
                    # Set pincode variable to store pincode value
                    pincode=pincode,
                    # Set confirmation_due variable to store confirmation due value
                    confirmation_due=confirmation_due,
                    # Set confirmation_date variable to store confirmation date value
                    confirmation_date=confirmation_date,
                    # Set skill_level variable to store skill level value
                    skill_level=skill_level,
                    # Set emp_effective_from variable to store emp effective from value
                    emp_effective_from=emp_effective_from,
                    # Set job_effective_from variable to store job effective from value
                    job_effective_from=job_effective_from,
                    # Set about variable to store about value
                    about=about,
                    # Set must_change_password variable to store must change password value
                    must_change_password=False
                # Execute statement to process data and maintain state
                )
                # Stage new entity instance into database session
                db.add(p)
                # Execute statement to process data and maintain state
                created_count += 1

            # Synchronize with User table without duplicating
            u = db.query(User).filter(User.empcode.ilike(p.emp_code)).first()
            # Check if target condition is false or object is missing
            if not u and p.email:
                # Initiate database query on specified model
                u = db.query(User).filter(User.email.ilike(p.email)).first()
            # Evaluate condition to control execution branch
            if u:
                # Execute statement to process data and maintain state
                u.empcode = p.emp_code
                # Execute statement to process data and maintain state
                u.email = p.email
                # Execute statement to process data and maintain state
                u.designation = p.designation
            # Execute fallback branch when conditions are not met
            else:
                # Set new_u variable to store new u value
                new_u = User(
                    # Set username variable to store username value
                    username=p.emp_code,
                    # Set email variable to store email value
                    email=p.email,
                    # Set empcode variable to store empcode value
                    empcode=p.emp_code,
                    # Placeholder statement performing no operation
                    password=default_pwd_hash,
                    # Set role variable to store role value
                    role=p.role,
                    # Set designation variable to store designation value
                    designation=p.designation
                # Execute statement to process data and maintain state
                )
                # Stage new entity instance into database session
                db.add(new_u)

        # Catch and handle specific exception if raised
        except Exception as row_err:
            # Invoke errors.append to perform operational action
            errors.append(f"Row {idx + 1} processing error: {str(row_err)}")

    # Begin guarded execution block to trap exceptions
    try:
        # Commit transaction to persist changes in database
        db.commit()
    # Catch and handle specific exception if raised
    except Exception as commit_err:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=f"Database commit error during import: {str(commit_err)}")

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Successfully synchronized {created_count + updated_count} employee records",
        # Execute statement to process data and maintain state
        "created": created_count,
        # Execute statement to process data and maintain state
        "updated": updated_count,
        # Execute statement to process data and maintain state
        "created_count": created_count,
        # Execute statement to process data and maintain state
        "updated_count": updated_count,
        # Execute statement to process data and maintain state
        "total": created_count + updated_count,
        # Execute statement to process data and maintain state
        "conflicts": conflicts,
        # Execute statement to process data and maintain state
        "errors": errors
    # Execute statement to process data and maintain state
    }


# Define HTTP POST route endpoint handler
@router.post("/employees/sync-master-file")
# Define sync_master_file_direct function to handle sync master file direct
def sync_master_file_direct(db: Session = Depends(get_db)):
    """
    Locates and synchronizes the real 'Emp Data 1.xlsx' master workbook
    directly from the project workspace into the database.
    """
    import os, openpyxl

    # Set possible_paths variable to store possible paths value
    possible_paths = [
        # Execute statement to process data and maintain state
        r"c:\Users\info\Downloads\La esfera-project (1)\Quickchex-project 1 (3)\Quickchex-project 1\Quickchex\Emp Data 1.xlsx",
        # Invoke os.path.abspath to perform operational action
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "Emp Data 1.xlsx")),
        # Invoke os.path.abspath to perform operational action
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "..", "Emp Data 1.xlsx")),
    # Execute statement to process data and maintain state
    ]

    # Set target_path variable to store target path value
    target_path = None
    # Iterate through items in sequence loop
    for p in possible_paths:
        # Evaluate condition to control execution branch
        if os.path.exists(p):
            # Set target_path variable to store target path value
            target_path = p
            # Break out of current loop early
            break

    # Check if target condition is false or object is missing
    if not target_path:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Master sheet 'Emp Data 1.xlsx' could not be located in workspace.")

    # Set wb variable to store wb value
    wb = openpyxl.load_workbook(target_path, data_only=True)
    # Set sheet variable to store sheet value
    sheet = wb.active
    # Set headers variable to store headers value
    headers = [str(cell.value).strip() if cell.value is not None else "" for cell in sheet[1]]

    # Set raw_items variable to store raw items value
    raw_items = []
    # Iterate through items in sequence loop
    for r in range(2, sheet.max_row + 1):
        # Set vals variable to store vals value
        vals = [sheet.cell(row=r, column=c).value for c in range(1, len(headers) + 1)]
        # Check if target condition is false or object is missing
        if any(v is not None and str(v).strip() != "" for v in vals):
            # Invoke raw_items.append to perform operational action
            raw_items.append(dict(zip(headers, vals)))

    # Set req variable to store req value
    req = BulkImportRequest(employees=raw_items)
    # Set res variable to store res value
    res = bulk_import_mastersheet(req, db)
    # Execute statement to process data and maintain state
    res["file_path"] = target_path
    # Execute statement to process data and maintain state
    res["total_sheet_rows"] = len(raw_items)
    # Return computed result or response payload to caller
    return res


# ==============================================================================
# MANAGER & TEAM ATTENDANCE ENDPOINTS FOR ADMIN PORTAL
# ==============================================================================
import calendar
# Import date as date_cls, datetime, timedelta from datetime for module operations
from datetime import date as date_cls, datetime, timedelta
# Import text from sqlalchemy for module operations
from sqlalchemy import text
# Import LeaveRequest from app.models.leave for module operations
from app.models.leave import LeaveRequest


# Define _get_attendance_status_for_date function to handle  get attendance status for date
def _get_attendance_status_for_date(db: Session, emp_code: str, target_date: date_cls):
    """
    Helper to compute detailed attendance status, punch in, punch out, working hours, and location
    for a given employee and date across all portal endpoints.
    """
    from app.services.attendance_service import calculate_attendance_status

    # Set now variable to store now value
    now = datetime.now()
    # Set today variable to store today value
    today = now.date()

    # Resolve candidate codes
    candidate_codes = [str(emp_code).strip()]
    # Initiate database query on specified model
    prof = db.query(Profile).filter(
        # Execute statement to process data and maintain state
        (Profile.emp_code == str(emp_code).strip()) |
        # Execute statement to process data and maintain state
        (Profile.email.ilike(str(emp_code).strip())) |
        # Execute statement to process data and maintain state
        (Profile.id == (int(emp_code) if str(emp_code).isdigit() else -1))
    # Execute statement to process data and maintain state
    ).first()

    # Evaluate condition to control execution branch
    if prof:
        # Check if target condition is false or object is missing
        if prof.emp_code and prof.emp_code not in candidate_codes:
            # Invoke candidate_codes.append to perform operational action
            candidate_codes.append(prof.emp_code)
        # Check if target condition is false or object is missing
        if prof.email and prof.email not in candidate_codes:
            # Invoke candidate_codes.append to perform operational action
            candidate_codes.append(prof.email)
        # Check if target condition is false or object is missing
        if prof.id and str(prof.id) not in candidate_codes:
            # Invoke candidate_codes.append to perform operational action
            candidate_codes.append(str(prof.id))

    # Set emp_location variable to store emp location value
    emp_location = (prof.branch_location if prof and prof.branch_location else "Mumbai, India") or "Mumbai, India"

    # Query Leave
    leave = None
    # Iterate through items in sequence loop
    for code_val in candidate_codes:
        # Initiate database query on specified model
        leave = db.query(LeaveRequest).filter(
            # Specify parameter value for LeaveRequest.emp_code
            LeaveRequest.emp_code == code_val,
            # Invoke LeaveRequest.status.ilike to perform operational action
            LeaveRequest.status.ilike("Approved"),
            # Specify parameter value for LeaveRequest.start_date <
            LeaveRequest.start_date <= target_date,
            # Execute statement to process data and maintain state
            LeaveRequest.end_date >= target_date
        # Execute statement to process data and maintain state
        ).first()
        # Evaluate condition to control execution branch
        if leave:
            # Break out of current loop early
            break

    # ── Check Centralized Organization Calendar (HOLIDAY / WEEKLY_OFF) ────────
    is_holiday = False
    # Set is_weekly_off variable to store is weekly off value
    is_weekly_off = False
    # Set holiday_name variable to store holiday name value
    holiday_name = None
    # Set cal_exists variable to store cal exists value
    cal_exists = False
    # Begin guarded execution block to trap exceptions
    try:
        # Set cal_row variable to store cal row value
        cal_row = db.execute(
            # Invoke text to perform operational action
            text("SELECT status, holiday_name FROM organization_calendar WHERE date = :d"),
            # Execute statement to process data and maintain state
            {"d": target_date}
        # Execute statement to process data and maintain state
        ).mappings().first()
        # Evaluate condition to control execution branch
        if cal_row:
            # Set cal_exists variable to store cal exists value
            cal_exists = True
            # Set cal_status variable to store cal status value
            cal_status = (cal_row["status"] or "").strip().upper()
            # Set h_name variable to store h name value
            h_name = (cal_row["holiday_name"] or "").strip()
            # Evaluate condition to control execution branch
            if "WEEK" in cal_status or cal_status in ("WEEKLY_OFF", "WO", "OFF"):
                # Set is_weekly_off variable to store is weekly off value
                is_weekly_off = True
            # Evaluate alternate branch condition
            elif cal_status == "HOLIDAY" or h_name or (cal_status and cal_status not in ("WORKING_DAY", "WORKING", "WORK")):
                # Set is_holiday variable to store is holiday value
                is_holiday = True
                # Set holiday_name variable to store holiday name value
                holiday_name = h_name or (cal_row["status"].strip() if cal_row["status"] else "Holiday")
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Only for past or current dates (<= today), fallback to Sunday as Weekly Off ONLY IF date is NOT in calendar
    if target_date <= today and not cal_exists:
        # Check if target condition is false or object is missing
        if not is_holiday and not is_weekly_off and target_date.weekday() == 6:
            # Set is_weekly_off variable to store is weekly off value
            is_weekly_off = True

    # Query Punch
    from sqlalchemy import bindparam
    # Set table_name variable to store table name value
    table_name = f"attendance_{target_date.year}_{target_date.month:02d}"
    # Set rec variable to store rec value
    rec = None
    # Begin guarded execution block to trap exceptions
    try:
        # Set query variable to store query value
        query = text(f"""
            SELECT punch_in_time, punch_out_time, punch_in_location, punch_out_location,
                   punch_in_latitude, punch_in_longitude, punch_in_accuracy,
                   punch_out_latitude, punch_out_longitude, punch_out_accuracy,
                   punch_in_image, punch_out_image,
                   hours_completed, status, remark,
                   work_mode, client_site_id, client_site_name
            FROM {table_name}
            WHERE emp_code IN :codes AND date = :t_date
            ORDER BY id DESC LIMIT 1
        """).bindparams(bindparam("codes", expanding=True))
        # Set rec variable to store rec value
        rec = db.execute(query, {"codes": list(candidate_codes), "t_date": target_date}).mappings().first()
    # Catch and handle specific exception if raised
    except Exception:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Set rec variable to store rec value
        rec = None

    # Import  from app.services.attendance_service for module operations
    from app.services.attendance_service import (
        # Execute statement to process data and maintain state
        calculate_attendance_status,
        # Execute statement to process data and maintain state
        safe_parse_datetime,
        # Execute statement to process data and maintain state
        safe_parse_date,
        # Execute statement to process data and maintain state
        safe_format_time,
        # Execute statement to process data and maintain state
        safe_format_date,
        # Execute statement to process data and maintain state
        safe_calc_hours,
        # Execute statement to process data and maintain state
        repair_utc_punch_out
    # Execute statement to process data and maintain state
    )
    # Import resolve_punch_photo from app.api.v1.endpoints.attendance_api for module operations
    from app.api.v1.endpoints.attendance_api import resolve_punch_photo

    # Set in_time_val variable to store in time val value
    in_time_val = rec["punch_in_time"] if rec else None
    # Set out_time_val variable to store out time val value
    out_time_val = rec["punch_out_time"] if rec else None
    # Set in_dt variable to store in dt value
    in_dt = safe_parse_datetime(in_time_val)
    # Set d_val variable to store d val value
    d_val = safe_parse_date(target_date) or today
    # Set out_dt variable to store out dt value
    out_dt = repair_utc_punch_out(in_dt, out_time_val, d_val)
    # Set h_val variable to store h val value
    h_val = float(rec["hours_completed"] or 0) if rec else 0.0

    # Evaluate condition to control execution branch
    if in_dt and out_dt:
        # Set expected_h variable to store expected h value
        expected_h = safe_calc_hours(in_dt, out_dt, d_val, now=now)
        # Evaluate condition to control execution branch
        if h_val == 0 or abs(expected_h - h_val) > 1.0:
            # Set h_val variable to store h val value
            h_val = expected_h

    # Set status_info variable to store status info value
    status_info = calculate_attendance_status(
        # Set punch_in_time variable to store punch in time value
        punch_in_time=in_dt,
        # Set punch_out_time variable to store punch out time value
        punch_out_time=out_dt,
        # Set hours_completed variable to store hours completed value
        hours_completed=h_val,
        # Set target_date variable to store target date value
        target_date=d_val,
        # Set is_leave variable to store is leave value
        is_leave=bool(leave),
        # Set leave_category variable to store leave category value
        leave_category=leave.category if leave else None,
        # Set is_holiday variable to store is holiday value
        is_holiday=is_holiday,
        # Set is_sunday variable to store is sunday value
        is_sunday=is_weekly_off,
        # Set status_override variable to store status override value
        status_override=rec["status"] if rec else None,
        # Set now variable to store now value
        now=now
    # Execute statement to process data and maintain state
    )


    # Import format_punch_location from app.services.geo_service for module operations
    from app.services.geo_service import format_punch_location

    # Set in_t variable to store in t value
    in_t = safe_format_time(in_dt, "—")
    # Set out_t variable to store out t value
    out_t = safe_format_time(out_dt, "—")

    # Set h_str variable to store h str value
    h_str = status_info["total_hours"]
    # Set h_val variable to store h val value
    h_val = status_info["hours"]
    # Set p_in_lat variable to store p in lat value
    p_in_lat = rec["punch_in_latitude"] if rec else None
    # Set p_in_lon variable to store p in lon value
    p_in_lon = rec["punch_in_longitude"] if rec else None
    # Set raw_loc variable to store raw loc value
    raw_loc = (rec["punch_in_location"] if rec and rec["punch_in_location"] else (rec["punch_out_location"] if rec and rec["punch_out_location"] else emp_location)) if rec else emp_location
    # Set loc_captured variable to store loc captured value
    loc_captured = format_punch_location(raw_loc, lat=p_in_lat, lon=p_in_lon, default_loc=emp_location) or emp_location

    # Authoritative resolution based on Calendar and Attendance
    if is_holiday:
        # Set st_final variable to store st final value
        st_final = "Holiday"
        # Set badge_final variable to store badge final value
        badge_final = "HD"
        # Set timing_str variable to store timing str value
        timing_str = holiday_name or "Holiday"
        # Set duration_str variable to store duration str value
        duration_str = "0hr 0min"
    # Evaluate alternate branch condition
    elif is_weekly_off:
        # Set st_final variable to store st final value
        st_final = "Weekly Off"
        # Set badge_final variable to store badge final value
        badge_final = "WO"
        # Set timing_str variable to store timing str value
        timing_str = "WeeklyOff"
        # Set duration_str variable to store duration str value
        duration_str = "0hr 0min"
    # Evaluate alternate branch condition
    elif leave:
        # Set cat_str variable to store cat str value
        cat_str = f" ({leave.category})" if leave.category else ""
        # Set st_final variable to store st final value
        st_final = f"Leave{cat_str}"
        # Set badge_final variable to store badge final value
        badge_final = "LV"
        # Set timing_str variable to store timing str value
        timing_str = f"Leave{cat_str}"
        # Set duration_str variable to store duration str value
        duration_str = "0hr 0min"
    # Evaluate alternate branch condition
    elif rec:
        # Set st_final variable to store st final value
        st_final = status_info["status"]
        # Set badge_final variable to store badge final value
        badge_final = status_info["badge_code"]
        # Set timing_str variable to store timing str value
        timing_str = f"{in_t} - {out_t}" if (in_t != "—" and out_t != "—") else (f"In: {in_t}" if in_t != "—" else "—")
        # Set duration_str variable to store duration str value
        duration_str = f"{int(h_val)}hr {int((h_val % 1)*60):02d}min" if in_t != "—" else "0hr 0min"
    # Execute fallback branch when conditions are not met
    else:
        # Evaluate condition to control execution branch
        if d_val > today:
            # Set st_final variable to store st final value
            st_final = ""
            # Set badge_final variable to store badge final value
            badge_final = "—"
            # Set timing_str variable to store timing str value
            timing_str = "—"
            # Set duration_str variable to store duration str value
            duration_str = "—"
        # Evaluate alternate branch condition
        elif d_val == today:
            # Set st_final variable to store st final value
            st_final = "Not started"
            # Set badge_final variable to store badge final value
            badge_final = "—"
            # Set timing_str variable to store timing str value
            timing_str = "—"
            # Set duration_str variable to store duration str value
            duration_str = "—"
        # Execute fallback branch when conditions are not met
        else:
            # Check if target condition is false or object is missing
            if not is_holiday and not is_weekly_off and not cal_exists and d_val.weekday() == 6:
                # Set st_final variable to store st final value
                st_final = "Weekly Off"
                # Set badge_final variable to store badge final value
                badge_final = "WO"
                # Set timing_str variable to store timing str value
                timing_str = "WeeklyOff"
                # Set duration_str variable to store duration str value
                duration_str = "0hr 0min"
            # Execute fallback branch when conditions are not met
            else:
                # Set st_final variable to store st final value
                st_final = "Absent"
                # Set badge_final variable to store badge final value
                badge_final = "A"
                # Set timing_str variable to store timing str value
                timing_str = "—"
                # Set duration_str variable to store duration str value
                duration_str = "0hr 0min"

    # Set w_mode variable to store w mode value
    w_mode = (rec["work_mode"] if rec and rec.get("work_mode") else "OFFICE") or "OFFICE"
    # Set cs_name variable to store cs name value
    cs_name = (rec["client_site_name"] if rec and rec.get("client_site_name") else None)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": st_final,
        # Execute statement to process data and maintain state
        "badge_code": badge_final,
        # Execute statement to process data and maintain state
        "badge": badge_final,
        # Execute statement to process data and maintain state
        "checkIn": in_t,
        # Execute statement to process data and maintain state
        "checkOut": out_t,
        # Execute statement to process data and maintain state
        "punch_in": in_t,
        # Execute statement to process data and maintain state
        "punch_out": out_t,
        # Execute statement to process data and maintain state
        "timing": timing_str,
        # Execute statement to process data and maintain state
        "duration": duration_str,
        # Execute statement to process data and maintain state
        "formattedDate": d_val.strftime("%a, %b %d"),
        # Execute statement to process data and maintain state
        "is_holiday": is_holiday,
        # Execute statement to process data and maintain state
        "is_weekly_off": is_weekly_off,
        # Execute statement to process data and maintain state
        "holiday_name": holiday_name,
        # Execute statement to process data and maintain state
        "punch_in_time": in_dt.isoformat() if in_dt else None,
        # Execute statement to process data and maintain state
        "punch_out_time": out_dt.isoformat() if out_dt else None,
        # Specify parameter value for "workingHours": h_str if (in_dt and (out_dt or d_val
        "workingHours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
        # Specify parameter value for "working_hours": h_str if (in_dt and (out_dt or d_val
        "working_hours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
        # Execute statement to process data and maintain state
        "total_minutes": status_info["total_minutes"],
        # Execute statement to process data and maintain state
        "total_hours": h_str,
        # Execute statement to process data and maintain state
        "hours": h_val,
        # Execute statement to process data and maintain state
        "location": loc_captured,
        # Execute statement to process data and maintain state
        "punch_in_location": loc_captured,
        # Execute statement to process data and maintain state
        "punch_out_location": rec["punch_out_location"] if rec else None,
        # Execute statement to process data and maintain state
        "punch_in_latitude": rec["punch_in_latitude"] if rec else None,
        # Execute statement to process data and maintain state
        "punch_in_longitude": rec["punch_in_longitude"] if rec else None,
        # Execute statement to process data and maintain state
        "punch_in_accuracy": rec["punch_in_accuracy"] if rec else None,
        # Execute statement to process data and maintain state
        "punch_out_latitude": rec["punch_out_latitude"] if rec else None,
        # Execute statement to process data and maintain state
        "punch_out_longitude": rec["punch_out_longitude"] if rec else None,
        # Execute statement to process data and maintain state
        "punch_out_accuracy": rec["punch_out_accuracy"] if rec else None,
        # Execute statement to process data and maintain state
        "punch_in_image": resolve_punch_photo(rec["punch_in_image"]) if rec else None,
        # Execute statement to process data and maintain state
        "punch_out_image": resolve_punch_photo(rec["punch_out_image"]) if rec else None,
        # Execute statement to process data and maintain state
        "leave_status": leave.category if leave else "None",
        # Execute statement to process data and maintain state
        "holiday_name": holiday_name,
        # Specify parameter value for "remark": (rec["remark"] if rec and rec.get("remark") else None) or (holiday_name if is_holiday else ("On Time" if in_t !
        "remark": (rec["remark"] if rec and rec.get("remark") else None) or (holiday_name if is_holiday else ("On Time" if in_t != "—" else "")),
        # Execute statement to process data and maintain state
        "work_mode": w_mode,
        # Execute statement to process data and maintain state
        "workMode": w_mode,
        # Execute statement to process data and maintain state
        "client_site_id": rec["client_site_id"] if rec and rec.get("client_site_id") else None,
        # Execute statement to process data and maintain state
        "client_site_name": cs_name,
        # Execute statement to process data and maintain state
        "client_site": cs_name
    # Execute statement to process data and maintain state
    }



# Define HTTP GET route endpoint handler
@router.get("/managers")
# Define get_all_managers_admin function to handle get all managers admin
def get_all_managers_admin(db: Session = Depends(get_db)):
    """Returns list of all managers with department, team count, present, absent, leave, and half day counts."""
    profiles = db.query(Profile).all()
    # Set today variable to store today value
    today = date_cls.today()

    # Find profiles with role 'manager'
    manager_codes = set()
    # Iterate through items in sequence loop
    for p in profiles:
        # Set r variable to store r value
        r = (p.role or "").strip().lower()
        # Evaluate condition to control execution branch
        if r == "manager":
            # Invoke manager_codes.add to perform operational action
            manager_codes.add(p.emp_code)

    # Fallback: if no manager explicitly marked, check supervisors
    if not manager_codes:
        # Iterate through items in sequence loop
        for p in profiles:
            # Set sup variable to store sup value
            sup = (p.reporting_supervisor or "").strip()
            # Evaluate condition to control execution branch
            if sup:
                # Invoke manager_codes.add to perform operational action
                manager_codes.add(sup)

    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for m_code in sorted(list(manager_codes)):
        # Set m_prof variable to store m prof value
        m_prof = next((p for p in profiles if p.emp_code == m_code), None)
        # Check if target condition is false or object is missing
        if not m_prof:
            # Skip to next iteration of active loop
            continue

        # Set m_name variable to store m name value
        m_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() or m_prof.emp_code

        # Direct reportees strictly by reporting_supervisor relationship
        m_code_clean = (m_code or "").strip().lower()
        # Set team variable to store team value
        team = [
            # Execute statement to process data and maintain state
            p for p in profiles 
            # Evaluate condition to control execution branch
            if p.reporting_supervisor and (
                # Execute statement to process data and maintain state
                p.reporting_supervisor.strip().lower() == m_code_clean or 
                # Execute statement to process data and maintain state
                (str(p.reporting_supervisor).strip() == str(m_prof.id)) or
                # Execute statement to process data and maintain state
                (m_prof.email and p.reporting_supervisor.strip().lower() == m_prof.email.strip().lower()) or
                # Execute statement to process data and maintain state
                (m_name and p.reporting_supervisor.strip().lower() == m_name.strip().lower())
            # Execute statement to process data and maintain state
            )
        # Execute statement to process data and maintain state
        ]
        # Set team_size variable to store team size value
        team_size = len(team)

        # Set present_cnt variable to store present cnt value
        present_cnt = 0
        # Set absent_cnt variable to store absent cnt value
        absent_cnt = 0
        # Set leave_cnt variable to store leave cnt value
        leave_cnt = 0
        # Set half_cnt variable to store half cnt value
        half_cnt = 0

        # Iterate through items in sequence loop
        for member in team:
            # Begin guarded execution block to trap exceptions
            try:
                # Set att variable to store att value
                att = _get_attendance_status_for_date(db, member.emp_code, today)
                # Set st variable to store st value
                st = att.get("status", "Present")
                # Evaluate condition to control execution branch
                if st in ["Present", "In Progress", "Punched In"]:
                    # Execute statement to process data and maintain state
                    present_cnt += 1
                # Evaluate alternate branch condition
                elif "Leave" in st:
                    # Execute statement to process data and maintain state
                    leave_cnt += 1
                # Evaluate alternate branch condition
                elif st == "Half Day":
                    # Execute statement to process data and maintain state
                    half_cnt += 1
                # Evaluate alternate branch condition
                elif st == "Absent":
                    # Execute statement to process data and maintain state
                    absent_cnt += 1
            # Catch and handle specific exception if raised
            except Exception as att_err:
                # Invoke print to perform operational action
                print(f"Attendance status query note for {member.emp_code}:", att_err)

        # Execute statement to process data and maintain state
        results.append({
            # Execute statement to process data and maintain state
            "id": m_prof.id,
            # Execute statement to process data and maintain state
            "emp_code": m_prof.emp_code,
            # Execute statement to process data and maintain state
            "name": m_name,
            # Execute statement to process data and maintain state
            "designation": m_prof.designation or "Manager",
            # Execute statement to process data and maintain state
            "department": m_prof.department or "Operations",
            # Execute statement to process data and maintain state
            "email": m_prof.email or "",
            # Execute statement to process data and maintain state
            "contact": m_prof.mobile_no or "—",
            # Execute statement to process data and maintain state
            "profile_image": getattr(m_prof, "profile_image", "") or "",
            # Execute statement to process data and maintain state
            "team_size": team_size,
            # Execute statement to process data and maintain state
            "present_today": present_cnt,
            # Execute statement to process data and maintain state
            "absent_today": absent_cnt,
            # Execute statement to process data and maintain state
            "leave_today": leave_cnt,
            # Execute statement to process data and maintain state
            "halfday_today": half_cnt
        # Execute statement to process data and maintain state
        })

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "total_managers": len(results),
        # Execute statement to process data and maintain state
        "managers": results
    # Execute statement to process data and maintain state
    }


# Define HTTP GET route endpoint handler
@router.get("/managers/{manager_id}/team")
# Define get_manager_team_admin function to handle get manager team admin
def get_manager_team_admin(
    # Define manager_id schema field with type str,
    manager_id: str,
    # Define date_str schema field with type Optional[str] and default value
    date_str: Optional[str] = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Returns manager details, team attendance metrics, and individual team members for a given date."""
    target_date = date_cls.today()
    # Evaluate condition to control execution branch
    if date_str:
        # Begin guarded execution block to trap exceptions
        try:
            # Set target_date variable to store target date value
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Find manager
    m_prof = db.query(Profile).filter((Profile.emp_code == manager_id) | (Profile.id == (int(manager_id) if manager_id.isdigit() else -1))).first()
    # Check if target condition is false or object is missing
    if not m_prof:
        # Initiate database query on specified model
        m_prof = db.query(Profile).first()

    # Initiate database query on specified model
    all_profiles = db.query(Profile).all()
    # Set m_code variable to store m code value
    m_code = m_prof.emp_code if m_prof else "EMP001"
    # Set m_email variable to store m email value
    m_email = (m_prof.email or "").lower() if m_prof else ""
    # Set m_name variable to store m name value
    m_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() or m_code if m_prof else "Manager"

    # Find direct reportees strictly by reporting_supervisor relationship
    m_code_clean = (m_code or "").strip().lower()
    # Set team variable to store team value
    team = [
        # Execute statement to process data and maintain state
        p for p in all_profiles 
        # Evaluate condition to control execution branch
        if p.reporting_supervisor and (
            # Execute statement to process data and maintain state
            p.reporting_supervisor.strip().lower() == m_code_clean or 
            # Execute statement to process data and maintain state
            (m_prof and str(p.reporting_supervisor).strip() == str(m_prof.id)) or
            # Execute statement to process data and maintain state
            (m_email and p.reporting_supervisor.strip().lower() == m_email) or
            # Execute statement to process data and maintain state
            (m_name and p.reporting_supervisor.strip().lower() == m_name.lower())
        # Execute statement to process data and maintain state
        )
    # Execute statement to process data and maintain state
    ]

    # Set team_members variable to store team members value
    team_members = []
    # Set present_cnt variable to store present cnt value
    present_cnt = 0
    # Set absent_cnt variable to store absent cnt value
    absent_cnt = 0
    # Set leave_cnt variable to store leave cnt value
    leave_cnt = 0
    # Set half_cnt variable to store half cnt value
    half_cnt = 0
    # Set missing_cnt variable to store missing cnt value
    missing_cnt = 0

    # Iterate through items in sequence loop
    for member in team:
        # Set att variable to store att value
        att = _get_attendance_status_for_date(db, member.emp_code, target_date)
        # Set st variable to store st value
        st = att["status"]
        # Evaluate condition to control execution branch
        if st in ["Present", "Punched In", "In Progress"]:
            # Execute statement to process data and maintain state
            present_cnt += 1
        # Evaluate alternate branch condition
        elif "Leave" in st:
            # Execute statement to process data and maintain state
            leave_cnt += 1
        # Evaluate alternate branch condition
        elif st == "Half Day":
            # Execute statement to process data and maintain state
            half_cnt += 1
        # Evaluate alternate branch condition
        elif st == "Missing Punch":
            # Execute statement to process data and maintain state
            missing_cnt += 1
        # Evaluate alternate branch condition
        elif st == "Absent":
            # Execute statement to process data and maintain state
            absent_cnt += 1

        # Set mem_name variable to store mem name value
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        # Execute statement to process data and maintain state
        team_members.append({
            # Execute statement to process data and maintain state
            "id": member.id,
            # Execute statement to process data and maintain state
            "emp_code": member.emp_code,
            # Execute statement to process data and maintain state
            "name": mem_name,
            # Execute statement to process data and maintain state
            "designation": member.designation or "Employee",
            # Execute statement to process data and maintain state
            "department": member.department or "Operations",
            # Execute statement to process data and maintain state
            "contact": member.mobile_no or "—",
            # Execute statement to process data and maintain state
            "email": member.email or "—",
            # Execute statement to process data and maintain state
            "profile_image": getattr(member, "profile_image", "") or "",
            # Execute statement to process data and maintain state
            "checkIn": att["checkIn"],
            # Execute statement to process data and maintain state
            "checkOut": att["checkOut"],
            # Execute statement to process data and maintain state
            "workingHours": att["workingHours"],
            # Execute statement to process data and maintain state
            "status": att["status"],
            # Execute statement to process data and maintain state
            "badge_code": att["badge_code"],
            # Execute statement to process data and maintain state
            "leave_status": att["leave_status"]
        # Execute statement to process data and maintain state
        })

    # Set m_name variable to store m name value
    m_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() or m_code if m_prof else "Manager"

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "date": target_date.strftime("%d %B %Y"),
        # Execute statement to process data and maintain state
        "isoDate": target_date.isoformat(),
        # Execute statement to process data and maintain state
        "manager": {
            # Execute statement to process data and maintain state
            "id": m_prof.id if m_prof else 0,
            # Execute statement to process data and maintain state
            "emp_code": m_code,
            # Execute statement to process data and maintain state
            "name": m_name,
            # Execute statement to process data and maintain state
            "designation": m_prof.designation if m_prof else "Manager",
            # Execute statement to process data and maintain state
            "department": m_prof.department if m_prof else "Operations",
            # Execute statement to process data and maintain state
            "email": m_prof.email if m_prof else "—",
            # Execute statement to process data and maintain state
            "contact": m_prof.mobile_no if m_prof else "—",
            # Execute statement to process data and maintain state
            "profile_image": getattr(m_prof, "profile_image", "") if m_prof else "",
            # Execute statement to process data and maintain state
            "team_size": len(team_members)
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "summary": {
            # Execute statement to process data and maintain state
            "total": len(team_members),
            # Execute statement to process data and maintain state
            "present": present_cnt,
            # Execute statement to process data and maintain state
            "absent": absent_cnt,
            # Execute statement to process data and maintain state
            "on_leave": leave_cnt,
            # Execute statement to process data and maintain state
            "half_day": half_cnt,
            # Execute statement to process data and maintain state
            "missing_punch": missing_cnt
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "members": team_members
    # Execute statement to process data and maintain state
    }


# Define HTTP GET route endpoint handler
@router.get("/managers/{manager_id}/monthly-grid")
# Define get_manager_team_monthly_grid_admin function to handle get manager team monthly grid admin
def get_manager_team_monthly_grid_admin(
    # Define manager_id schema field with type str,
    manager_id: str,
    # Define year schema field with type Optional[int] and default value
    year: Optional[int] = None,
    # Define month schema field with type Optional[int] and default value
    month: Optional[int] = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Returns monthly 31-day team attendance grid matrix for a manager's team."""
    now = datetime.now()
    # Set t_year variable to store t year value
    t_year = year or now.year
    # Set t_month variable to store t month value
    t_month = month or now.month
    # Set num_days variable to store num days value
    num_days = calendar.monthrange(t_year, t_month)[1]

    # Find manager & team
    m_prof = db.query(Profile).filter((Profile.emp_code == manager_id) | (Profile.id == (int(manager_id) if manager_id.isdigit() else -1))).first()
    # Initiate database query on specified model
    all_profiles = db.query(Profile).all()
    # Set m_code variable to store m code value
    m_code = m_prof.emp_code if m_prof else "EMP001"
    # Set m_email variable to store m email value
    m_email = (m_prof.email or "").lower() if m_prof else ""

    # Set team variable to store team value
    team = [p for p in all_profiles if (p.reporting_supervisor and (p.reporting_supervisor == m_code or (m_email and p.reporting_supervisor.lower() == m_email))) or (p.emp_code != m_code and m_prof and p.department == m_prof.department)]
    # Check if target condition is false or object is missing
    if not team:
        # Set team variable to store team value
        team = [p for p in all_profiles if p.emp_code != m_code]

    # Set grid_rows variable to store grid rows value
    grid_rows = []
    # Iterate through items in sequence loop
    for member in team:
        # Set mem_name variable to store mem name value
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        # Set daily_status variable to store daily status value
        daily_status = {}
        # Set present_c variable to store present c value
        present_c = 0
        # Set absent_c variable to store absent c value
        absent_c = 0
        # Set leave_c variable to store leave c value
        leave_c = 0
        # Set half_c variable to store half c value
        half_c = 0

        # Iterate through items in sequence loop
        for day in range(1, num_days + 1):
            # Set d_obj variable to store d obj value
            d_obj = date_cls(t_year, t_month, day)
            # Set att variable to store att value
            att = _get_attendance_status_for_date(db, member.emp_code, d_obj)
            # Set code variable to store code value
            code = att["badge_code"]
            # Execute statement to process data and maintain state
            daily_status[str(day)] = code
            # Evaluate condition to control execution branch
            if code == "P": present_c += 1
            # Evaluate alternate branch condition
            elif code == "A": absent_c += 1
            # Evaluate alternate branch condition
            elif code in ["L", "1H", "2H"]: leave_c += 1
            # Evaluate alternate branch condition
            elif code == "HD": half_c += 1

        # Execute statement to process data and maintain state
        grid_rows.append({
            # Execute statement to process data and maintain state
            "emp_code": member.emp_code,
            # Execute statement to process data and maintain state
            "name": mem_name,
            # Execute statement to process data and maintain state
            "designation": member.designation or "Employee",
            # Execute statement to process data and maintain state
            "daily": daily_status,
            # Execute statement to process data and maintain state
            "totals": {
                # Execute statement to process data and maintain state
                "present": present_c,
                # Execute statement to process data and maintain state
                "absent": absent_c,
                # Execute statement to process data and maintain state
                "leave": leave_c,
                # Execute statement to process data and maintain state
                "half_day": half_c
            # Execute statement to process data and maintain state
            }
        # Execute statement to process data and maintain state
        })

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "year": t_year,
        # Execute statement to process data and maintain state
        "month": t_month,
        # Execute statement to process data and maintain state
        "days_in_month": num_days,
        # Execute statement to process data and maintain state
        "grid": grid_rows
    # Execute statement to process data and maintain state
    }


# Define class AddTeamMemberPayload inheriting from BaseModel
class AddTeamMemberPayload(BaseModel):
    # Define is_new schema field with type Optional[bool] and default value
    is_new: Optional[bool] = False
    # Define emp_code schema field with type Optional[str] and default value
    emp_code: Optional[str] = None
    # Define name schema field with type Optional[str] and default value
    name: Optional[str] = None
    # Define first_name schema field with type Optional[str] and default value
    first_name: Optional[str] = None
    # Define last_name schema field with type Optional[str] and default value
    last_name: Optional[str] = None
    # Define email schema field with type Optional[str] and default value
    email: Optional[str] = None
    # Define contact schema field with type Optional[str] and default value
    contact: Optional[str] = None
    # Define phone schema field with type Optional[str] and default value
    phone: Optional[str] = None
    # Define mobile schema field with type Optional[str] and default value
    mobile: Optional[str] = None
    # Define designation schema field with type Optional[str] and default value
    designation: Optional[str] = None
    # Define department schema field with type Optional[str] and default value
    department: Optional[str] = None
    # Define employment_type schema field with type Optional[str] and default value
    employment_type: Optional[str] = "Regular Employee"
    # Define location schema field with type Optional[str] and default value
    location: Optional[str] = "Mumbai, IN"
    # Define joining_date schema field with type Optional[str] and default value
    joining_date: Optional[str] = None
    # Define role schema field with type Optional[str] and default value
    role: Optional[str] = "employee"
    # Define reporting_supervisor schema field with type Optional[str] and default value
    reporting_supervisor: Optional[str] = None


# Define HTTP POST route endpoint handler
@router.post("/employees/{emp_code}/assign-manager")
# Define assign_manager_admin function to handle assign manager admin
def assign_manager_admin(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define payload schema field with type dict,
    payload: dict,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Assigns or changes reporting supervisor manager for an employee, and updates employment details if provided."""
    target_prof = db.query(Profile).filter(Profile.emp_code.ilike(emp_code)).first()
    # Check if target condition is false or object is missing
    if not target_prof:
        # Initiate database query on specified model
        target_prof = db.query(Profile).filter(Profile.email.ilike(emp_code)).first()
    # Check if target condition is false or object is missing
    if not target_prof:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail=f"Employee {emp_code} not found")

    # Set new_mgr variable to store new mgr value
    new_mgr = (payload.get("manager_code") or payload.get("manager") or payload.get("reporting_supervisor") or "").strip()
    # Execute statement to process data and maintain state
    target_prof.reporting_supervisor = new_mgr if new_mgr else None

    # Update organization attributes if provided
    if payload.get("department"):
        # Execute statement to process data and maintain state
        target_prof.department = str(payload["department"]).strip()
    # Evaluate condition to control execution branch
    if payload.get("designation"):
        # Execute statement to process data and maintain state
        target_prof.designation = str(payload["designation"]).strip()
    # Evaluate condition to control execution branch
    if payload.get("branch_location") or payload.get("location"):
        # Execute statement to process data and maintain state
        target_prof.branch_location = str(payload.get("branch_location") or payload.get("location")).strip()
    # Evaluate condition to control execution branch
    if payload.get("employment_type") or payload.get("type"):
        # Execute statement to process data and maintain state
        target_prof.employment_type = str(payload.get("employment_type") or payload.get("type")).strip()
    # Evaluate condition to control execution branch
    if payload.get("role"):
        # Execute statement to process data and maintain state
        target_prof.role = str(payload["role"]).strip().lower()

    # Synchronize User record
    user_rec = db.query(User).filter((User.empcode.ilike(target_prof.emp_code)) | (User.email.ilike(target_prof.email))).first()
    # Evaluate condition to control execution branch
    if user_rec:
        # Evaluate condition to control execution branch
        if payload.get("role"):
            # Execute statement to process data and maintain state
            user_rec.role = str(payload["role"]).strip().lower()
        # Evaluate condition to control execution branch
        if payload.get("designation"):
            # Execute statement to process data and maintain state
            user_rec.designation = str(payload["designation"]).strip()

    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(target_prof)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Successfully updated manager for {target_prof.emp_code} to '{new_mgr}'",
        # Execute statement to process data and maintain state
        "emp_code": target_prof.emp_code,
        # Execute statement to process data and maintain state
        "reporting_supervisor": target_prof.reporting_supervisor,
        # Execute statement to process data and maintain state
        "department": target_prof.department,
        # Execute statement to process data and maintain state
        "designation": target_prof.designation
    # Execute statement to process data and maintain state
    }


# Define HTTP GET route endpoint handler
@router.get("/employees/{emp_code}/attendance-quick")
# Define get_employee_attendance_quick_admin function to handle get employee attendance quick admin
def get_employee_attendance_quick_admin(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define date_str schema field with type Optional[str] and default value
    date_str: Optional[str] = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Quick lookup of an employee's actual attendance status for a specific date."""
    target_date = date_cls.today()
    # Evaluate condition to control execution branch
    if date_str:
        # Begin guarded execution block to trap exceptions
        try:
            # Set target_date variable to store target date value
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
    # Set att variable to store att value
    att = _get_attendance_status_for_date(db, emp_code, target_date)
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "emp_code": emp_code,
        # Execute statement to process data and maintain state
        "date": target_date.isoformat(),
        # Execute statement to process data and maintain state
        "attendance": att
    # Execute statement to process data and maintain state
    }


# Define HTTP POST route endpoint handler
@router.post("/managers/{manager_id}/team/members")
# Define HTTP POST route endpoint handler
@router.post("/managers/{manager_id}/add-member")
# Define add_team_member_to_manager function to handle add team member to manager
def add_team_member_to_manager(
    # Define manager_id schema field with type str,
    manager_id: str,
    # Define payload schema field with type AddTeamMemberPayload,
    payload: AddTeamMemberPayload,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Adds a team member under a specific manager.
    Supports either assigning an existing employee or creating a brand new employee profile.
    """
    from app.core.security import hash_password
    # Import LeaveBalance from app.models.leave for module operations
    from app.models.leave import LeaveBalance
    # Import module re for system functionality
    import re

    # 1. Resolve manager
    m_prof = db.query(Profile).filter(
        # Execute statement to process data and maintain state
        (Profile.emp_code == manager_id) | 
        # Execute statement to process data and maintain state
        (Profile.id == (int(manager_id) if manager_id.isdigit() else -1)) |
        # Execute statement to process data and maintain state
        (Profile.email.ilike(manager_id))
    # Execute statement to process data and maintain state
    ).first()
    # Set manager_code variable to store manager code value
    manager_code = m_prof.emp_code if m_prof else manager_id
    # Set manager_name variable to store manager name value
    manager_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() or manager_code if m_prof else manager_id

    # 2. Check if this is an existing employee assignment
    existing_emp = None
    # Set input_code variable to store input code value
    input_code = (payload.emp_code or "").strip()
    # Set input_email variable to store input email value
    input_email = (payload.email or "").strip().lower()

    # Check if target condition is false or object is missing
    if input_code and not payload.is_new:
        # Initiate database query on specified model
        existing_emp = db.query(Profile).filter(Profile.emp_code.ilike(input_code)).first()
    # Check if target condition is false or object is missing
    if not existing_emp and input_email and not payload.is_new:
        # Initiate database query on specified model
        existing_emp = db.query(Profile).filter(Profile.email.ilike(input_email)).first()

    # Evaluate condition to control execution branch
    if existing_emp:
        # Assign existing employee to this manager
        existing_emp.reporting_supervisor = manager_code
        # Evaluate condition to control execution branch
        if payload.designation and payload.designation.strip():
            # Execute statement to process data and maintain state
            existing_emp.designation = payload.designation.strip()
        # Evaluate condition to control execution branch
        if payload.department and payload.department.strip():
            # Execute statement to process data and maintain state
            existing_emp.department = payload.department.strip()
        # Evaluate condition to control execution branch
        if payload.employment_type and payload.employment_type.strip():
            # Execute statement to process data and maintain state
            existing_emp.employment_type = payload.employment_type.strip()
        # Evaluate condition to control execution branch
        if payload.location and payload.location.strip():
            # Execute statement to process data and maintain state
            existing_emp.branch_location = payload.location.strip()
        # Evaluate condition to control execution branch
        if payload.contact or payload.phone:
            # Execute statement to process data and maintain state
            existing_emp.mobile_no = (payload.contact or payload.phone).strip()

        # Set clean_role variable to store clean role value
        clean_role = (payload.role or existing_emp.role or "employee").strip().lower()
        # Evaluate condition to control execution branch
        if clean_role in ["admin", "manager", "employee", "teamleader"]:
            # Execute statement to process data and maintain state
            existing_emp.role = clean_role

        # Update User table if present
        u = db.query(User).filter(User.empcode.ilike(existing_emp.emp_code)).first()
        # Evaluate condition to control execution branch
        if u:
            # Execute statement to process data and maintain state
            u.role = clean_role
            # Evaluate condition to control execution branch
            if payload.designation:
                # Execute statement to process data and maintain state
                u.designation = payload.designation.strip()

        # Evaluate condition to control execution branch
        if payload.joining_date:
            # Begin guarded execution block to trap exceptions
            try:
                # Set date_val variable to store date val value
                date_val = datetime.strptime(payload.joining_date.strip().split("T")[0], "%Y-%m-%d").date()
                # Execute statement to process data and maintain state
                existing_emp.emp_join_date = date_val
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass

        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(existing_emp)
        # Set emp_name variable to store emp name value
        emp_name = f"{existing_emp.first_name or ''} {existing_emp.last_name or ''}".strip() or existing_emp.emp_code
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": f"Successfully assigned {emp_name} ({existing_emp.emp_code}) to manager {manager_name}'s team.",
            # Execute statement to process data and maintain state
            "is_new": False,
            # Execute statement to process data and maintain state
            "employee": {
                # Execute statement to process data and maintain state
                "id": existing_emp.id,
                # Execute statement to process data and maintain state
                "emp_code": existing_emp.emp_code,
                # Execute statement to process data and maintain state
                "name": emp_name,
                # Execute statement to process data and maintain state
                "email": existing_emp.email,
                # Execute statement to process data and maintain state
                "designation": existing_emp.designation,
                # Execute statement to process data and maintain state
                "department": existing_emp.department,
                # Execute statement to process data and maintain state
                "reporting_supervisor": existing_emp.reporting_supervisor,
                # Execute statement to process data and maintain state
                "role": existing_emp.role
            # Execute statement to process data and maintain state
            }
        # Execute statement to process data and maintain state
        }

    # 3. Create a brand new employee profile
    if not input_email or "@" not in input_email:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="A valid Work Email address is required.")

    # Check email uniqueness
    if db.query(Profile).filter(Profile.email.ilike(input_email)).first() or db.query(User).filter(User.email.ilike(input_email)).first():
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="An employee account already exists with this email address.")

    # Set full_name_input variable to store full name input value
    full_name_input = (payload.name or "").strip()
    # Set first variable to store first value
    first = (payload.first_name or "").strip()
    # Set last variable to store last value
    last = (payload.last_name or "").strip()

    # Check if target condition is false or object is missing
    if full_name_input and not first:
        # Set parts variable to store parts value
        parts = [p.strip() for p in full_name_input.split() if p.strip()]
        # Evaluate condition to control execution branch
        if parts:
            # Set first variable to store first value
            first = parts[0]
            # Set last variable to store last value
            last = " ".join(parts[1:]) if len(parts) > 1 else ""

    # Check if target condition is false or object is missing
    if not first and not full_name_input:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Full Name is required.")

    # Set full_name variable to store full name value
    full_name = f"{first} {last}".strip() if (first or last) else (full_name_input or "Employee")

    # Determine unique emp_code
    clean_code = input_code.upper()
    # Evaluate condition to control execution branch
    if clean_code:
        # Initiate database query on specified model
        if db.query(Profile).filter(Profile.emp_code.ilike(clean_code)).first() or db.query(User).filter(User.empcode.ilike(clean_code)).first():
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=400, detail=f"Employee ID '{clean_code}' already exists. Please choose a different code.")
    # Execute fallback branch when conditions are not met
    else:
        # Auto-generate next LE number
        all_codes = [p[0] for p in db.query(Profile.emp_code).all() if p[0]]
        # Set max_num variable to store max num value
        max_num = 200
        # Iterate through items in sequence loop
        for c in all_codes:
            # Set num_part variable to store num part value
            num_part = re.sub(r"\D", "", c)
            # Evaluate condition to control execution branch
            if num_part.isdigit():
                # Set max_num variable to store max num value
                max_num = max(max_num, int(num_part))
        # Set clean_code variable to store clean code value
        clean_code = f"LE{max_num + 1}"

    # Parse joining date
    join_date = date_cls.today()
    # Evaluate condition to control execution branch
    if payload.joining_date:
        # Begin guarded execution block to trap exceptions
        try:
            # Set join_date variable to store join date value
            join_date = datetime.strptime(payload.joining_date.strip().split("T")[0], "%Y-%m-%d").date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Role and access
    raw_role = (payload.role or "employee").strip().lower()
    # Set valid_roles variable to store valid roles value
    valid_roles = ["admin", "manager", "employee", "teamleader"]
    # Set system_role variable to store system role value
    system_role = raw_role if raw_role in valid_roles else "employee"

    # Set desig_val variable to store desig val value
    desig_val = (payload.designation or "Employee").strip()
    # Set dept_val variable to store dept val value
    dept_val = (payload.department or (m_prof.department if m_prof else "Engineering")).strip()
    # Set type_val variable to store type val value
    type_val = (payload.employment_type or "Regular Employee").strip()
    # Set loc_val variable to store loc val value
    loc_val = (payload.location or "Mumbai, IN").strip()
    # Set phone_val variable to store phone val value
    phone_val = (payload.contact or payload.phone or payload.mobile or "").strip() or None

    # Set pwd_hash variable to store pwd hash value
    pwd_hash = hash_password("Admin@123")

    # Begin guarded execution block to trap exceptions
    try:
        # Set new_prof variable to store new prof value
        new_prof = Profile(
            # Set emp_code variable to store emp code value
            emp_code=clean_code,
            # Set first_name variable to store first name value
            first_name=first or None,
            # Set last_name variable to store last name value
            last_name=last or None,
            # Set email variable to store email value
            email=input_email,
            # Placeholder statement performing no operation
            password_hash=pwd_hash,
            # Set must_change_password variable to store must change password value
            must_change_password=True,
            # Set mobile_no variable to store mobile no value
            mobile_no=phone_val,
            # Set role variable to store role value
            role=system_role,
            # Set department variable to store department value
            department=dept_val,
            # Set designation variable to store designation value
            designation=desig_val,
            # Set employment_type variable to store employment type value
            employment_type=type_val,
            # Set employment_status variable to store employment status value
            employment_status="Active",
            # Set branch_location variable to store branch location value
            branch_location=loc_val,
            # Set emp_join_date variable to store emp join date value
            emp_join_date=join_date,
            # Set reporting_supervisor variable to store reporting supervisor value
            reporting_supervisor=manager_code
        # Execute statement to process data and maintain state
        )
        # Stage new entity instance into database session
        db.add(new_prof)

        # Set new_user variable to store new user value
        new_user = User(
            # Set empcode variable to store empcode value
            empcode=clean_code,
            # Set username variable to store username value
            username=full_name,
            # Set email variable to store email value
            email=input_email,
            # Placeholder statement performing no operation
            password=pwd_hash,
            # Set role variable to store role value
            role=system_role,
            # Set designation variable to store designation value
            designation=desig_val
        # Execute statement to process data and maintain state
        )
        # Stage new entity instance into database session
        db.add(new_user)

        # Initialize leave balance
        lb = db.query(LeaveBalance).filter(LeaveBalance.emp_code == clean_code).first()
        # Check if target condition is false or object is missing
        if not lb:
            # Stage new entity instance into database session
            db.add(LeaveBalance(emp_code=clean_code, allowed_leaves=21.0, used_leaves=0.0))

        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(new_prof)
    # Catch and handle specific exception if raised
    except HTTPException:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise exception to abort current operation with error
        raise
    # Catch and handle specific exception if raised
    except Exception as exc:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=f"Database error creating employee: {str(exc)}")

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Successfully created employee {full_name} ({clean_code}) and assigned to manager {manager_name}.",
        # Execute statement to process data and maintain state
        "is_new": True,
        # Execute statement to process data and maintain state
        "employee": {
            # Execute statement to process data and maintain state
            "id": new_prof.id,
            # Execute statement to process data and maintain state
            "emp_code": new_prof.emp_code,
            # Execute statement to process data and maintain state
            "name": full_name,
            # Execute statement to process data and maintain state
            "email": new_prof.email,
            # Execute statement to process data and maintain state
            "designation": new_prof.designation,
            # Execute statement to process data and maintain state
            "department": new_prof.department,
            # Execute statement to process data and maintain state
            "reporting_supervisor": new_prof.reporting_supervisor,
            # Execute statement to process data and maintain state
            "role": new_prof.role
        # Execute statement to process data and maintain state
        }
    # Execute statement to process data and maintain state
    }


# Define HTTP GET route endpoint handler
@router.get("/employees/{emp_code}/attendance-preview")
# Define get_employee_attendance_preview function to handle get employee attendance preview
def get_employee_attendance_preview(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define date_str schema field with type Optional[str] and default value
    date_str: Optional[str] = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Fetches real attendance record for preview inside modal."""
    target_date = date_cls.today()
    # Evaluate condition to control execution branch
    if date_str:
        # Begin guarded execution block to trap exceptions
        try:
            # Set target_date variable to store target date value
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Set att variable to store att value
    att = _get_attendance_status_for_date(db, emp_code, target_date)
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "emp_code": emp_code,
        # Execute statement to process data and maintain state
        "date": target_date.isoformat(),
        # Execute statement to process data and maintain state
        "attendance": att
    # Execute statement to process data and maintain state
    }



# Define HTTP GET route endpoint handler
@router.get("/attendance/all-records")
# Define get_global_attendance_records_admin function to handle get global attendance records admin
def get_global_attendance_records_admin(
    # Define date_str schema field with type Optional[str] and default value
    date_str: Optional[str] = None,
    # Define month schema field with type Optional[int] and default value
    month: Optional[int] = None,
    # Define year schema field with type Optional[int] and default value
    year: Optional[int] = None,
    # Define manager_id schema field with type Optional[str] and default value
    manager_id: Optional[str] = None,
    # Define employee_id schema field with type Optional[str] and default value
    employee_id: Optional[str] = None,
    # Define department schema field with type Optional[str] and default value
    department: Optional[str] = None,
    # Define status_filter schema field with type Optional[str] and default value
    status_filter: Optional[str] = None,
    # Define work_mode schema field with type Optional[str] and default value
    work_mode: Optional[str] = None,
    # Define client_site schema field with type Optional[str] and default value
    client_site: Optional[str] = None,
    # Define search schema field with type Optional[str] and default value
    search: Optional[str] = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Global multi-filtered attendance records endpoint for Admin Attendance Records page."""
    now = datetime.now()
    # Set target_date variable to store target date value
    target_date = date_cls.today()
    # Evaluate condition to control execution branch
    if date_str:
        # Begin guarded execution block to trap exceptions
        try:
            # Set target_date variable to store target date value
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Initiate database query on specified model
    profiles = db.query(Profile).all()

    # Filter profiles by manager, employee, department, search
    filtered_profiles = profiles
    # Evaluate condition to control execution branch
    if department and department.strip() and department.lower() != "all":
        # Set filtered_profiles variable to store filtered profiles value
        filtered_profiles = [p for p in filtered_profiles if (p.department or "").lower() == department.strip().lower()]

    # Evaluate condition to control execution branch
    if manager_id and manager_id.strip() and manager_id.lower() != "all":
        # Set filtered_profiles variable to store filtered profiles value
        filtered_profiles = [p for p in filtered_profiles if p.reporting_supervisor == manager_id or (p.department and p.department == manager_id)]

    # Evaluate condition to control execution branch
    if employee_id and employee_id.strip() and employee_id.lower() != "all":
        # Set filtered_profiles variable to store filtered profiles value
        filtered_profiles = [p for p in filtered_profiles if p.emp_code == employee_id or p.email == employee_id]

    # Evaluate condition to control execution branch
    if search and search.strip():
        # Set s variable to store s value
        s = search.strip().lower()
        # Set filtered_profiles variable to store filtered profiles value
        filtered_profiles = [
            # Execute statement to process data and maintain state
            p for p in filtered_profiles
            # Evaluate condition to control execution branch
            if s in p.emp_code.lower()
            # Execute statement to process data and maintain state
            or s in (p.email or "").lower()
            # Execute statement to process data and maintain state
            or s in f"{p.first_name or ''} {p.last_name or ''}".lower()
        # Execute statement to process data and maintain state
        ]

    # Deduplicate profiles so the same employee is not repeated
    # Priority: official LE employee codes > ADM/MGR codes > legacy mock EMP codes
    def _prof_priority(prof):
        # Set c variable to store c value
        c = (prof.emp_code or "").upper()
        # Evaluate condition to control execution branch
        if c.startswith("LE"):
            # Return computed result or response payload to caller
            return 3
        # Evaluate condition to control execution branch
        if c.startswith("ADM") or c.startswith("MGR"):
            # Return computed result or response payload to caller
            return 2
        # Return computed result or response payload to caller
        return 1

    # Set sorted_profiles variable to store sorted profiles value
    sorted_profiles = sorted(filtered_profiles, key=_prof_priority, reverse=True)
    # Set deduped_profiles variable to store deduped profiles value
    deduped_profiles = []
    # Set seen_emails variable to store seen emails value
    seen_emails = set()
    # Set seen_names variable to store seen names value
    seen_names = set()

    # Iterate through items in sequence loop
    for p in sorted_profiles:
        # Set c_email variable to store c email value
        c_email = (p.email or "").strip().lower()
        # Set f_name variable to store f name value
        f_name = f"{p.first_name or ''} {p.last_name or ''}".strip().lower()

        # Evaluate condition to control execution branch
        if c_email and c_email in seen_emails:
            # Skip to next iteration of active loop
            continue
        # Evaluate condition to control execution branch
        if f_name and len(f_name) > 3 and f_name in seen_names:
            # Skip to next iteration of active loop
            continue

        # Evaluate condition to control execution branch
        if c_email:
            # Invoke seen_emails.add to perform operational action
            seen_emails.add(c_email)
        # Evaluate condition to control execution branch
        if f_name and len(f_name) > 3:
            # Invoke seen_names.add to perform operational action
            seen_names.add(f_name)

        # Invoke deduped_profiles.append to perform operational action
        deduped_profiles.append(p)

    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for p in deduped_profiles:
        # Set att variable to store att value
        att = _get_attendance_status_for_date(db, p.emp_code, target_date)
        # Set st variable to store st value
        st = att["status"]

        # Evaluate condition to control execution branch
        if status_filter and status_filter.strip() and status_filter.lower() != "all":
            # Set sf variable to store sf value
            sf = status_filter.strip().lower()
            # Check if target condition is false or object is missing
            if sf == "leave" and "leave" not in st.lower():
                # Skip to next iteration of active loop
                continue
            # Evaluate alternate branch condition
            elif sf != "leave" and sf not in st.lower():
                # Skip to next iteration of active loop
                continue

        # Set emp_name variable to store emp name value
        emp_name = _clean_employee_full_name(p.first_name, p.last_name, p.email, p.emp_code)
        # Set mgr_name variable to store mgr name value
        mgr_name = p.reporting_supervisor or "—"
        # Set att_work_mode variable to store att work mode value
        att_work_mode = att.get("work_mode") or "OFFICE"
        # Set att_cs_id variable to store att cs id value
        att_cs_id = att.get("client_site_id")
        # Set att_cs_name variable to store att cs name value
        att_cs_name = att.get("client_site_name")

        # Apply work mode filter
        if work_mode and work_mode.strip().lower() not in ("all", ""):
            # Evaluate condition to control execution branch
            if att_work_mode.upper() != work_mode.strip().upper():
                # Skip to next iteration of active loop
                continue

        # Apply client site filter
        if client_site and client_site.strip().lower() not in ("all", ""):
            # Set cs_q variable to store cs q value
            cs_q = client_site.strip().lower()
            # Evaluate condition to control execution branch
            if (att_cs_name or "").lower() != cs_q and str(att_cs_id or "") != cs_q:
                # Skip to next iteration of active loop
                continue

        # Execute statement to process data and maintain state
        results.append({
            # Execute statement to process data and maintain state
            "date": target_date.strftime("%d %b %Y"),
            # Execute statement to process data and maintain state
            "isoDate": target_date.isoformat(),
            # Execute statement to process data and maintain state
            "emp_code": p.emp_code,
            # Execute statement to process data and maintain state
            "name": emp_name,
            # Execute statement to process data and maintain state
            "email": p.email or "—",
            # Execute statement to process data and maintain state
            "contact": p.mobile_no or "—",
            # Execute statement to process data and maintain state
            "manager": mgr_name,
            # Execute statement to process data and maintain state
            "department": p.department or "Operations",
            # Execute statement to process data and maintain state
            "checkIn": att["checkIn"],
            # Execute statement to process data and maintain state
            "checkOut": att["checkOut"],
            # Execute statement to process data and maintain state
            "workingHours": att["workingHours"],
            # Execute statement to process data and maintain state
            "status": att["status"],
            # Execute statement to process data and maintain state
            "leave_status": att["leave_status"],
            # Execute statement to process data and maintain state
            "location": att.get("location") or att.get("punch_in_location") or p.branch_location or "—",
            # Execute statement to process data and maintain state
            "punch_in_location": att.get("punch_in_location") or att.get("location") or p.branch_location or "—",
            # Execute statement to process data and maintain state
            "punch_out_location": att.get("punch_out_location"),
            # Execute statement to process data and maintain state
            "punch_in_latitude": att.get("punch_in_latitude"),
            # Execute statement to process data and maintain state
            "punch_in_longitude": att.get("punch_in_longitude"),
            # Execute statement to process data and maintain state
            "punch_in_image": att.get("punch_in_image"),
            # Execute statement to process data and maintain state
            "punch_out_image": att.get("punch_out_image"),
            # Execute statement to process data and maintain state
            "punch_out_latitude": att.get("punch_out_latitude"),
            # Execute statement to process data and maintain state
            "punch_out_longitude": att.get("punch_out_longitude"),
            # Execute statement to process data and maintain state
            "punch_in_time": att.get("punch_in_time"),
            # Execute statement to process data and maintain state
            "punch_out_time": att.get("punch_out_time"),
            # Execute statement to process data and maintain state
            "profile_image": getattr(p, "profile_image", "") or "",
            # Execute statement to process data and maintain state
            "work_mode": att_work_mode,
            # Execute statement to process data and maintain state
            "workMode": att_work_mode,
            # Execute statement to process data and maintain state
            "client_site_id": att_cs_id,
            # Execute statement to process data and maintain state
            "client_site_name": att_cs_name,
            # Execute statement to process data and maintain state
            "clientSiteName": att_cs_name,
            # Execute statement to process data and maintain state
            "client_site": att_cs_name or "—",
            # Execute statement to process data and maintain state
            "clientSite": att_cs_name or "—"
        # Execute statement to process data and maintain state
        })

    # Fetch active client sites for filter dropdowns
    client_sites_list = []
    # Begin guarded execution block to trap exceptions
    try:
        # Import ClientSite from app.models.work_location for module operations
        from app.models.work_location import ClientSite
        # Initiate database query on specified model
        active_sites = db.query(ClientSite).filter(ClientSite.is_active == True).all()
        # Set client_sites_list variable to store client sites list value
        client_sites_list = [{"id": cs.id, "name": cs.name, "client_name": cs.client_name} for cs in active_sites]
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "date": target_date.strftime("%d %B %Y"),
        # Execute statement to process data and maintain state
        "total": len(results),
        # Execute statement to process data and maintain state
        "records": results,
        # Execute statement to process data and maintain state
        "client_sites": client_sites_list,
        # Execute statement to process data and maintain state
        "work_modes": ["OFFICE", "WFH", "CLIENT_SITE"]
    # Execute statement to process data and maintain state
    }


# Define HTTP POST route endpoint handler
@router.post("/attendance/upload-excel")
# Define upload_attendance_excel function to handle upload attendance excel
async def upload_attendance_excel(
    # Define file schema field with type UploadFile and default value
    file: UploadFile = File(...),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Admin: Upload Excel/CSV attendance records and upsert into the DB.
    Expected columns (flexible mapping):
      emp_code / employee_id
      date (YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY)
      punch_in / check_in / in_time
      punch_out / check_out / out_time
      work_mode  (OFFICE / WFH / CLIENT_SITE)
      client_site_name / client_site
      location / punch_in_location
    """
    import io, csv
    # Import datetime as _dt, date as _date from datetime for module operations
    from datetime import datetime as _dt, date as _date
    # Import create_monthly_tables from app.db.table_manager for module operations
    from app.db.table_manager import create_monthly_tables
    # Import safe_calc_hours from app.services.attendance_service for module operations
    from app.services.attendance_service import safe_calc_hours

    # Set filename variable to store filename value
    filename = (file.filename or "").lower()
    # Set content_bytes variable to store content bytes value
    content_bytes = await file.read()

    # Set rows variable to store rows value
    rows = []
    # Define _normalize_import_header function to handle  normalize import header
    def _normalize_import_header(value):
        # CSV files saved by Excel commonly prefix the first column with a BOM.
        header = str(value or "").lstrip("\ufeff").strip().lower()
        # Return computed result or response payload to caller
        return "_".join(header.replace("-", " ").split())

    # ── Parse the file ──
    if filename.endswith(".csv"):
        # Set text_content variable to store text content value
        text_content = content_bytes.decode("utf-8-sig", errors="replace")
        # Set csv_reader variable to store csv reader value
        csv_reader = list(csv.reader(io.StringIO(text_content)))
        # Evaluate condition to control execution branch
        if csv_reader:
            # Set headers variable to store headers value
            headers = [_normalize_import_header(c) for c in csv_reader[0]]
            # Iterate through items in sequence loop
            for r in csv_reader[1:]:
                # Check if target condition is false or object is missing
                if not r or all(str(v or "").strip() == "" for v in r):
                    # Skip to next iteration of active loop
                    continue
                # Set row_dict variable to store row dict value
                row_dict = {headers[i]: str(r[i] or "").strip() for i in range(min(len(headers), len(r))) if headers[i]}
                # Execute statement to process data and maintain state
                row_dict["_raw_cols"] = [str(v or "").strip() for v in r]
                # Invoke rows.append to perform operational action
                rows.append(row_dict)
    # Evaluate alternate branch condition
    elif filename.endswith((".xlsx", ".xls")):
        # Begin guarded execution block to trap exceptions
        try:
            # Import module openpyxl for system functionality
            import openpyxl
            # Set wb variable to store wb value
            wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
            # Set ws variable to store ws value
            ws = wb.active
            # Set headers variable to store headers value
            headers = [_normalize_import_header(c.value) for c in next(ws.iter_rows(min_row=1, max_row=1))]
            # Iterate through items in sequence loop
            for ws_row in ws.iter_rows(min_row=2, values_only=True):
                # Check if target condition is false or object is missing
                if not ws_row or all(v is None or str(v).strip() == "" for v in ws_row):
                    # Skip to next iteration of active loop
                    continue
                # Set row_dict variable to store row dict value
                row_dict = {headers[i]: str(ws_row[i] or "").strip() for i in range(min(len(headers), len(ws_row))) if headers[i]}
                # Execute statement to process data and maintain state
                row_dict["_raw_cols"] = [str(v or "").strip() for v in ws_row]
                # Invoke rows.append to perform operational action
                rows.append(row_dict)
        # Catch and handle specific exception if raised
        except ImportError:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=400, detail="openpyxl library not installed. Please upload a CSV file instead.")
        # Catch and handle specific exception if raised
        except Exception as ex:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(ex)}")
    # Execute fallback branch when conditions are not met
    else:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .csv, .xlsx, or .xls")

    # Check if target condition is false or object is missing
    if not rows:
        # Return computed result or response payload to caller
        return {"status": "success", "message": "File was empty", "inserted": 0, "updated": 0, "errors": []}

    # ── Auto-detect: Calendar format vs Attendance format ──────────────────────
    # Calendar format:
    # 1. 3-column file with Date | Day | Status
    # 2. No emp_code column, or emp_code column is completely empty
    # 3. Status column contains Working / Holiday / Weekly Off

    # Set sample_keys variable to store sample keys value
    sample_keys = set(rows[0].keys()) - {"_raw_cols"} if rows else set()

    # Set EMP_CODE_KEYS variable to store EMP CODE KEYS value
    EMP_CODE_KEYS = {"emp_code", "employee_id", "employee_code", "empcode", "emp"}
    # Set STATUS_KEYS variable to store STATUS KEYS value
    STATUS_KEYS   = {"status", "holiday_status", "day_type", "day_status", "state"}
    # Set CALENDAR_STATUS_VALUES variable to store CALENDAR STATUS VALUES value
    CALENDAR_STATUS_VALUES = {
        # Execute statement to process data and maintain state
        "holiday", "weekly_off", "weekly off", "week_off", "week off", "working_day",
        # Execute statement to process data and maintain state
        "working", "work", "workday", "working day", "off", "present"
    # Execute statement to process data and maintain state
    }

    # Set has_status_col variable to store has status col value
    has_status_col  = bool(STATUS_KEYS & sample_keys) or any(k.startswith("status") for k in sample_keys)
    # Set has_emp_col_hdr variable to store has emp col hdr value
    has_emp_col_hdr = bool(EMP_CODE_KEYS & sample_keys)

    # Check if emp_code column actually contains any real values in the first 10 rows
    emp_code_populated = False
    # Evaluate condition to control execution branch
    if has_emp_col_hdr:
        # Set emp_key variable to store emp key value
        emp_key = next((k for k in EMP_CODE_KEYS if k in sample_keys), None)
        # Evaluate condition to control execution branch
        if emp_key:
            # Set emp_code_populated variable to store emp code populated value
            emp_code_populated = any(
                # Invoke bool to perform operational action
                bool((row.get(emp_key) or "").strip())
                # Iterate through items in sequence loop
                for row in rows[:10]
            # Execute statement to process data and maintain state
            )

    # Check if status column contains calendar-type values
    status_is_calendar = False
    # Set status_key variable to store status key value
    status_key = next((k for k in STATUS_KEYS if k in sample_keys), None) or next((k for k in sample_keys if "status" in k), None)
    # Evaluate condition to control execution branch
    if status_key:
        # Set status_is_calendar variable to store status is calendar value
        status_is_calendar = any(
            # Execute statement to process data and maintain state
            (row.get(status_key) or "").strip().lower() in CALENDAR_STATUS_VALUES
            # Iterate through items in sequence loop
            for row in rows[:10]
        # Execute statement to process data and maintain state
        )

    # Decision: calendar if no emp_code populated AND (has status col OR row has 2-3 columns with date)
    has_date_col = any("date" in k for k in sample_keys) or any(len(row.get("_raw_cols", [])) >= 2 for row in rows[:5])
    # Set is_calendar_format variable to store is calendar format value
    is_calendar_format = not emp_code_populated and (has_status_col or status_is_calendar or (has_date_col and not has_emp_col_hdr))

    # Evaluate condition to control execution branch
    if is_calendar_format:
        # ── CALENDAR IMPORT PATH ──────────────────────────────────────────────
        from datetime import datetime as _dt
        # Import _normalize_status, _parse_date as _cal_parse_date from app.api.v1.endpoints.calendar_api for module operations
        from app.api.v1.endpoints.calendar_api import _normalize_status, _parse_date as _cal_parse_date

        # Set VALID_CALENDAR_STATUSES variable to store VALID CALENDAR STATUSES value
        VALID_CALENDAR_STATUSES = {"HOLIDAY", "WEEKLY_OFF", "WORKING_DAY"}

        # Set cal_inserted variable to store cal inserted value
        cal_inserted = 0
        # Set cal_updated variable to store cal updated value
        cal_updated = 0
        # Set cal_errors variable to store cal errors value
        cal_errors = []
        # Set now_ts variable to store now ts value
        now_ts = _dt.utcnow()

        # Begin guarded execution block to trap exceptions
        try:
            # Iterate through items in sequence loop
            for idx, row in enumerate(rows):
                # Begin guarded execution block to trap exceptions
                try:
                    # Set raw_cols variable to store raw cols value
                    raw_cols = row.get("_raw_cols") or []

                    # 1. Resolve date
                    raw_date = (
                        # Invoke row.get to perform operational action
                        row.get("date")
                        # Execute statement to process data and maintain state
                        or row.get("attendance_date")
                        # Execute statement to process data and maintain state
                        or row.get("dates")
                        # Execute statement to process data and maintain state
                        or next((row[k] for k in row if "date" in k and k != "_raw_cols"), "")
                    # Execute statement to process data and maintain state
                    ).strip()
                    # Check if target condition is false or object is missing
                    if not raw_date and raw_cols:
                        # Iterate through items in sequence loop
                        for c in raw_cols:
                            # Evaluate condition to control execution branch
                            if c and ("-" in c or "/" in c or (isinstance(c, str) and len(c) == 5)):
                                # Set raw_date variable to store raw date value
                                raw_date = c.strip()
                                # Break out of current loop early
                                break
                        # Check if target condition is false or object is missing
                        if not raw_date:
                            # Set raw_date variable to store raw date value
                            raw_date = raw_cols[0].strip()

                    # Check if target condition is false or object is missing
                    if not raw_date:
                        # Skip to next iteration of active loop
                        continue

                    # Set rec_date variable to store rec date value
                    rec_date = _cal_parse_date(raw_date)
                    # Check if target condition is false or object is missing
                    if not rec_date:
                        # Skip to next iteration of active loop
                        continue

                    # 2. Resolve day name (optional)
                    raw_day = (
                        # Invoke row.get to perform operational action
                        row.get("day")
                        # Execute statement to process data and maintain state
                        or row.get("day_name")
                        # Execute statement to process data and maintain state
                        or row.get("weekday")
                        # Execute statement to process data and maintain state
                        or next((row[k] for k in row if "day" in k and "status" not in k and "type" not in k and k != "_raw_cols"), "")
                    # Execute statement to process data and maintain state
                    ).strip()
                    # Check if target condition is false or object is missing
                    if not raw_day and len(raw_cols) >= 2:
                        # Iterate through items in sequence loop
                        for c in raw_cols:
                            # Evaluate condition to control execution branch
                            if c and c.lower() in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"):
                                # Set raw_day variable to store raw day value
                                raw_day = c.strip()
                                # Break out of current loop early
                                break

                    # 3. Resolve status (Working / Holiday / Weekly Off)
                    raw_status = (
                        # Invoke row.get to perform operational action
                        row.get("status")
                        # Execute statement to process data and maintain state
                        or row.get("holiday_status")
                        # Execute statement to process data and maintain state
                        or row.get("day_type")
                        # Execute statement to process data and maintain state
                        or row.get("day_status")
                        # Execute statement to process data and maintain state
                        or next((row[k] for k in row if "status" in k and k != "_raw_cols"), "")
                    # Execute statement to process data and maintain state
                    ).strip()

                    # If raw_status was accidentally set to a date string, discard it
                    if raw_status and ("202" in raw_status or ":" in raw_status or "-" in raw_status):
                        # Set raw_status variable to store raw status value
                        raw_status = ""

                    # Set norm_status variable to store norm status value
                    norm_status = _normalize_status(raw_status) if raw_status else ""
                    # Check if target condition is false or object is missing
                    if not norm_status:
                        # Blank or unassigned status in uploaded calendar is a normal working day
                        # Do NOT arbitrarily mark Saturdays or Sundays as weekly off!
                        norm_status = "WORKING_DAY"

                    # Set holiday_name variable to store holiday name value
                    holiday_name = None
                    # Evaluate condition to control execution branch
                    if norm_status == "HOLIDAY":
                        # Set raw_name variable to store raw name value
                        raw_name = (
                            # Invoke row.get to perform operational action
                            row.get("holiday_name")
                            # Execute statement to process data and maintain state
                            or row.get("remarks")
                            # Execute statement to process data and maintain state
                            or row.get("name")
                            # Invoke or to perform operational action
                            or (raw_status if (raw_status and raw_status.upper() not in ("HOLIDAY", "H", "PUBLIC_HOLIDAY", "NATIONAL_HOLIDAY", "WORKING", "WORKING_DAY", "WEEKLY_OFF", "WEEK_OFF")) else None)
                            # Invoke or to perform operational action
                            or (raw_day if (raw_day and raw_day.lower() not in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")) else None)
                            # Execute statement to process data and maintain state
                            or "Holiday"
                        # Execute statement to process data and maintain state
                        )
                        # Set holiday_name variable to store holiday name value
                        holiday_name = str(raw_name).strip() if raw_name else "Holiday"
                    # Set description variable to store description value
                    description = (row.get("description") or row.get("notes") or row.get("remark") or "").strip() or None

                    # Set existing variable to store existing value
                    existing = db.execute(
                        # Invoke text to perform operational action
                        text("SELECT id FROM organization_calendar WHERE date = :d"),
                        # Execute statement to process data and maintain state
                        {"d": rec_date}
                    # Execute statement to process data and maintain state
                    ).mappings().first()

                    # Evaluate condition to control execution branch
                    if existing:
                        # Execute statement to process data and maintain state
                        db.execute(text("""
                            UPDATE organization_calendar
                               SET status = :status, holiday_name = :name, description = :desc, updated_at = :now
                             WHERE date = :d
                        """), {"status": norm_status, "name": holiday_name, "desc": description, "now": now_ts, "d": rec_date})
                        # Execute statement to process data and maintain state
                        cal_updated += 1
                    # Execute fallback branch when conditions are not met
                    else:
                        # Execute statement to process data and maintain state
                        db.execute(text("""
                            INSERT INTO organization_calendar (date, status, holiday_name, description, created_at, updated_at)
                            VALUES (:d, :status, :name, :desc, :now, :now)
                        """), {"d": rec_date, "status": norm_status, "name": holiday_name, "desc": description, "now": now_ts})
                        # Execute statement to process data and maintain state
                        cal_inserted += 1

                # Catch and handle specific exception if raised
                except Exception as ex:
                    # Invoke print to perform operational action
                    print(f"Row {idx + 2} parse warning: {ex}")

            # Commit transaction to persist changes in database
            db.commit()
        # Catch and handle specific exception if raised
        except Exception as ex:
            # Roll back transaction to revert changes on failure
            db.rollback()
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=500, detail=f"Attendance records import failed: {str(ex)}")

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "import_type": "attendance",
            # Execute statement to process data and maintain state
            "message": f"Attendance records imported successfully. {cal_inserted + cal_updated} records processed.",
            # Execute statement to process data and maintain state
            "inserted": cal_inserted,
            # Execute statement to process data and maintain state
            "updated": cal_updated,
            # Execute statement to process data and maintain state
            "total_rows": len(rows),
            # Execute statement to process data and maintain state
            "errors": []
        # Execute statement to process data and maintain state
        }




    # ── Column alias resolution ──
    def pick(row, *keys):
        # Iterate through items in sequence loop
        for k in keys:
            # Set v variable to store v value
            v = row.get(k, "")
            # Check if target condition is false or object is missing
            if v and v.lower() not in ("-", "—", "none", "null", "n/a", ""):
                # Return computed result or response payload to caller
                return v
        # Return computed result or response payload to caller
        return None

    # Define _parse_date function to handle  parse date
    def _parse_date(val):
        # Check if target condition is false or object is missing
        if not val: return None
        # Iterate through items in sequence loop
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"):
            # Begin guarded execution block to trap exceptions
            try: return _dt.strptime(str(val).strip(), fmt).date()
            # Catch and handle specific exception if raised
            except: pass
        # Return computed result or response payload to caller
        return None

    # Define _parse_time function to handle  parse time
    def _parse_time(val, ref_date):
        # Check if target condition is false or object is missing
        if not val: return None
        # Set val variable to store val value
        val = str(val).strip()
        # Iterate through items in sequence loop
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p"):
            # Begin guarded execution block to trap exceptions
            try:
                # Set t variable to store t value
                t = _dt.strptime(val, fmt)
                # Check if target condition is false or object is missing
                if not t.date().year > 1900 or t.date() == _date(1900, 1, 1):
                    # Return computed result or response payload to caller
                    return _dt.combine(ref_date, t.time())
                # Return computed result or response payload to caller
                return t
            # Catch and handle specific exception if raised
            except: pass
        # Return computed result or response payload to caller
        return None

    # Set inserted variable to store inserted value
    inserted = 0
    # Set updated variable to store updated value
    updated = 0
    # Set errors variable to store errors value
    errors = []

    # Import ClientSite from app.models.work_location for module operations
    from app.models.work_location import ClientSite
    # Initiate database query on specified model
    all_sites = {s.name.lower(): s for s in db.query(ClientSite).all()}

    # Iterate through items in sequence loop
    for idx, row in enumerate(rows):
        # Begin guarded execution block to trap exceptions
        try:
            # Set emp_code variable to store emp code value
            emp_code = pick(row, "emp_code", "employee_id", "employee_code", "empcode", "emp")
            # Check if target condition is false or object is missing
            if not emp_code:
                # Invoke errors.append to perform operational action
                errors.append(f"Row {idx + 2}: missing emp_code")
                # Skip to next iteration of active loop
                continue
            # Set emp_code variable to store emp code value
            emp_code = emp_code.strip()

            # Set raw_date variable to store raw date value
            raw_date = pick(row, "date", "attendance_date", "punch_date")
            # Set rec_date variable to store rec date value
            rec_date = _parse_date(raw_date)
            # Check if target condition is false or object is missing
            if not rec_date:
                # Invoke errors.append to perform operational action
                errors.append(f"Row {idx + 2} ({emp_code}): invalid date '{raw_date}'")
                # Skip to next iteration of active loop
                continue

            # Verify employee exists
            prof = db.query(Profile).filter(Profile.emp_code.ilike(emp_code)).first()
            # Check if target condition is false or object is missing
            if not prof:
                # Invoke errors.append to perform operational action
                errors.append(f"Row {idx + 2}: employee '{emp_code}' not found")
                # Skip to next iteration of active loop
                continue

            # Set table_name variable to store table name value
            table_name = f"attendance_{rec_date.year}_{rec_date.month:02d}"
            # Invoke create_monthly_tables to perform operational action
            create_monthly_tables(for_next_month=False)

            # Set raw_in variable to store raw in value
            raw_in  = pick(row, "punch_in", "check_in", "in_time", "punch_in_time", "checkin")
            # Set raw_out variable to store raw out value
            raw_out = pick(row, "punch_out", "check_out", "out_time", "punch_out_time", "checkout")
            # Set in_dt variable to store in dt value
            in_dt   = _parse_time(raw_in, rec_date)
            # Set out_dt variable to store out dt value
            out_dt  = _parse_time(raw_out, rec_date)

            # Set work_mode_raw variable to store work mode raw value
            work_mode_raw = pick(row, "work_mode", "workmode", "mode") or "OFFICE"
            # Set norm_mode variable to store norm mode value
            norm_mode = work_mode_raw.strip().upper().replace(" ", "_")
            # Evaluate condition to control execution branch
            if norm_mode in ["WORK_FROM_HOME", "HOME"]: norm_mode = "WFH"
            # Evaluate alternate branch condition
            elif norm_mode in ["CLIENT", "CLIENTSITE", "CLIENT SITE"]: norm_mode = "CLIENT_SITE"
            # Evaluate alternate branch condition
            elif norm_mode not in ["WFH", "CLIENT_SITE"]: norm_mode = "OFFICE"

            # Set cs_name_raw variable to store cs name raw value
            cs_name_raw = pick(row, "client_site_name", "client_site", "site", "clientsite")
            # Set cs_id variable to store cs id value
            cs_id = None
            # Set cs_name variable to store cs name value
            cs_name = None
            # Evaluate condition to control execution branch
            if cs_name_raw:
                # Set site_obj variable to store site obj value
                site_obj = all_sites.get(cs_name_raw.lower())
                # Evaluate condition to control execution branch
                if site_obj:
                    # Set cs_id variable to store cs id value
                    cs_id = site_obj.id
                    # Set cs_name variable to store cs name value
                    cs_name = site_obj.name
                # Execute fallback branch when conditions are not met
                else:
                    # Set cs_name variable to store cs name value
                    cs_name = cs_name_raw

            # Set location variable to store location value
            location = pick(row, "location", "punch_in_location", "address") or (cs_name or "Imported")

            # Set hours_str variable to store hours str value
            hours_str = None
            # Evaluate condition to control execution branch
            if in_dt and out_dt and out_dt > in_dt:
                # Set diff_sec variable to store diff sec value
                diff_sec = (out_dt - in_dt).total_seconds()
                # Set h variable to store h value
                h = int(diff_sec // 3600)
                # Set m variable to store m value
                m = int((diff_sec % 3600) // 60)
                # Set hours_str variable to store hours str value
                hours_str = f"{h}h {m}m"
                # Set att_status variable to store att status value
                att_status = "Present" if h >= 4 else "Half Day"
            # Evaluate alternate branch condition
            elif in_dt:
                # Set att_status variable to store att status value
                att_status = "Punched In"
            # Execute fallback branch when conditions are not met
            else:
                # Set att_status variable to store att status value
                att_status = "Absent"

            # Check for existing record
            existing = db.execute(
                # Invoke text to perform operational action
                text(f"SELECT id FROM {table_name} WHERE emp_code = :code AND date = :d ORDER BY id DESC LIMIT 1"),
                # Execute statement to process data and maintain state
                {"code": emp_code, "d": rec_date}
            # Execute statement to process data and maintain state
            ).mappings().first()

            # Evaluate condition to control execution branch
            if existing:
                # Execute statement to process data and maintain state
                db.execute(text(f"""
                    UPDATE {table_name} SET
                        punch_in_time = :in_t,
                        punch_out_time = :out_t,
                        punch_in_location = :loc,
                        hours_completed = :hrs,
                        status = :status,
                        work_mode = :wmode,
                        client_site_id = :csid,
                        client_site_name = :csname
                    WHERE id = :id
                """), {
                    # Execute statement to process data and maintain state
                    "in_t": in_dt, "out_t": out_dt, "loc": location,
                    # Execute statement to process data and maintain state
                    "hrs": hours_str, "status": att_status,
                    # Execute statement to process data and maintain state
                    "wmode": norm_mode, "csid": cs_id, "csname": cs_name,
                    # Execute statement to process data and maintain state
                    "id": existing["id"]
                # Execute statement to process data and maintain state
                })
                # Execute statement to process data and maintain state
                updated += 1
            # Execute fallback branch when conditions are not met
            else:
                # Execute statement to process data and maintain state
                db.execute(text(f"""
                    INSERT INTO {table_name} (
                        emp_code, date, punch_in_time, punch_out_time, punch_in_location,
                        hours_completed, status, remark, work_mode, client_site_id, client_site_name
                    ) VALUES (
                        :code, :d, :in_t, :out_t, :loc,
                        :hrs, :status, 'Imported', :wmode, :csid, :csname
                    )
                """), {
                    # Execute statement to process data and maintain state
                    "code": emp_code, "d": rec_date,
                    # Execute statement to process data and maintain state
                    "in_t": in_dt, "out_t": out_dt, "loc": location,
                    # Execute statement to process data and maintain state
                    "hrs": hours_str, "status": att_status,
                    # Execute statement to process data and maintain state
                    "wmode": norm_mode, "csid": cs_id, "csname": cs_name
                # Execute statement to process data and maintain state
                })
                # Execute statement to process data and maintain state
                inserted += 1
        # Catch and handle specific exception if raised
        except Exception as ex:
            # Invoke errors.append to perform operational action
            errors.append(f"Row {idx + 2}: {str(ex)}")

    # Begin guarded execution block to trap exceptions
    try:
        # Commit transaction to persist changes in database
        db.commit()
    # Catch and handle specific exception if raised
    except Exception as ex:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=f"Database commit error: {str(ex)}")

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Import complete. {inserted} inserted, {updated} updated.",
        # Execute statement to process data and maintain state
        "inserted": inserted,
        # Execute statement to process data and maintain state
        "updated": updated,
        # Execute statement to process data and maintain state
        "total_rows": len(rows),
        "errors": errors[:50]  # cap to first 50 errors
    # Execute statement to process data and maintain state
    }


# Define _clean_employee_full_name function to handle  clean employee full name
def _clean_employee_full_name(first_name: str, last_name: str, email: str, emp_code: str) -> str:
    # Set fn variable to store fn value
    fn = (first_name or "").strip()
    # Set ln variable to store ln value
    ln = (last_name or "").strip()
    # Evaluate condition to control execution branch
    if "@" in fn: fn = ""
    # Evaluate condition to control execution branch
    if "@" in ln: ln = ""
    
    # Evaluate condition to control execution branch
    if fn and ln:
        # Set combined variable to store combined value
        combined = fn if fn.lower() == ln.lower() else f"{fn} {ln}".strip()
    # Execute fallback branch when conditions are not met
    else:
        # Set combined variable to store combined value
        combined = fn or ln
        
    # Check if target condition is false or object is missing
    if combined and combined != emp_code and "@" not in combined:
        # Return computed result or response payload to caller
        return combined

    # Evaluate condition to control execution branch
    if email and "@" in email:
        # Set local variable to store local value
        local = email.split("@")[0]
        # Set parts variable to store parts value
        parts = [p.capitalize() for p in local.replace(".", " ").replace("_", " ").replace("-", " ").split() if p]
        # Evaluate condition to control execution branch
        if len(parts) > 1 and parts[-1].isdigit():
            # Invoke parts.pop to perform operational action
            parts.pop()
        # Evaluate condition to control execution branch
        if parts:
            # Return computed result or response payload to caller
            return " ".join(parts)

    # Return computed result or response payload to caller
    return emp_code or "Employee"


# Define HTTP GET route endpoint handler
@router.get("/employees/{employee_id}/attendance-calendar")
# Define get_employee_attendance_calendar_admin function to handle get employee attendance calendar admin
def get_employee_attendance_calendar_admin(
    # Define employee_id schema field with type str,
    employee_id: str,
    # Define year schema field with type Optional[int] and default value
    year: Optional[int] = None,
    # Define month schema field with type Optional[int] and default value
    month: Optional[int] = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Returns employee profile details, manager info, monthly totals, and 31-day calendar entries."""
    now = datetime.now()
    # Set t_year variable to store t year value
    t_year = year or now.year
    # Set t_month variable to store t month value
    t_month = month or now.month
    # Set num_days variable to store num days value
    num_days = calendar.monthrange(t_year, t_month)[1]

    # Find employee profile
    p = db.query(Profile).filter((Profile.emp_code == employee_id) | (Profile.id == (int(employee_id) if employee_id.isdigit() else -1))).first()
    # Check if target condition is false or object is missing
    if not p:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Employee not found")

    # Set emp_name variable to store emp name value
    emp_name = _clean_employee_full_name(p.first_name, p.last_name, p.email, p.emp_code)
    # Set mgr_name variable to store mgr name value
    mgr_name = p.reporting_supervisor or "—"
    # Set emp_location variable to store emp location value
    emp_location = p.branch_location or (f"{p.city}, {p.state}" if p.city else "Mumbai, India")

    # Set calendar_days variable to store calendar days value
    calendar_days = []
    # Set present_cnt variable to store present cnt value
    present_cnt = 0
    # Set absent_cnt variable to store absent cnt value
    absent_cnt = 0
    # Set half_cnt variable to store half cnt value
    half_cnt = 0
    # Set leave_cnt variable to store leave cnt value
    leave_cnt = 0
    # Set holiday_cnt variable to store holiday cnt value
    holiday_cnt = 0
    # Set weekoff_cnt variable to store weekoff cnt value
    weekoff_cnt = 0
    # Set working_days_cnt variable to store working days cnt value
    working_days_cnt = 0

    # Iterate through items in sequence loop
    for day in range(1, num_days + 1):
        # Set d_obj variable to store d obj value
        d_obj = date_cls(t_year, t_month, day)
        # Set att variable to store att value
        att = _get_attendance_status_for_date(db, p.emp_code, d_obj)
        # Set code variable to store code value
        code = att["badge_code"]
        # Set st variable to store st value
        st = att["status"]

        # Evaluate condition to control execution branch
        if code == "P": present_cnt += 1; working_days_cnt += 1
        # Evaluate alternate branch condition
        elif code == "A": absent_cnt += 1; working_days_cnt += 1
        # Evaluate alternate branch condition
        elif code == "HD": half_cnt += 1; working_days_cnt += 1
        # Evaluate alternate branch condition
        elif code in ["L", "1H", "2H"]: leave_cnt += 1
        # Evaluate alternate branch condition
        elif code == "H": holiday_cnt += 1
        # Evaluate alternate branch condition
        elif code == "WO": weekoff_cnt += 1

        # Execute statement to process data and maintain state
        calendar_days.append({
            # Execute statement to process data and maintain state
            "day": day,
            # Execute statement to process data and maintain state
            "date": d_obj.strftime("%d %b %Y"),
            # Execute statement to process data and maintain state
            "isoDate": d_obj.isoformat(),
            # Execute statement to process data and maintain state
            "dayName": d_obj.strftime("%a"),
            # Execute statement to process data and maintain state
            "status": st,
            # Execute statement to process data and maintain state
            "badge_code": code,
            # Execute statement to process data and maintain state
            "checkIn": att["checkIn"],
            # Execute statement to process data and maintain state
            "checkOut": att["checkOut"],
            # Execute statement to process data and maintain state
            "workingHours": att["workingHours"],
            # Execute statement to process data and maintain state
            "location": att["location"],
            # Execute statement to process data and maintain state
            "leave_status": att["leave_status"],
            # Execute statement to process data and maintain state
            "manager": mgr_name,
            # Specify parameter value for "remarks": "On Time" if code
            "remarks": "On Time" if code == "P" else ("Late / Half Day" if code == "HD" else "—"),
            # Execute statement to process data and maintain state
            "punch_in_image": att.get("punch_in_image"),
            # Execute statement to process data and maintain state
            "punch_out_image": att.get("punch_out_image"),
            # Execute statement to process data and maintain state
            "punch_in_location": att.get("punch_in_location") or att.get("location"),
            # Execute statement to process data and maintain state
            "punch_out_location": att.get("punch_out_location") or att.get("location"),
            # Execute statement to process data and maintain state
            "punch_in_latitude": att.get("punch_in_latitude"),
            # Execute statement to process data and maintain state
            "punch_in_longitude": att.get("punch_in_longitude"),
            # Execute statement to process data and maintain state
            "punch_out_latitude": att.get("punch_out_latitude"),
            # Execute statement to process data and maintain state
            "punch_out_longitude": att.get("punch_out_longitude"),
            # Execute statement to process data and maintain state
            "punch_in_time": att.get("punch_in_time"),
            # Execute statement to process data and maintain state
            "punch_out_time": att.get("punch_out_time"),
        # Execute statement to process data and maintain state
        })

    # Set month_name variable to store month name value
    month_name = calendar.month_name[t_month]

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "employee": {
            # Execute statement to process data and maintain state
            "id": p.id,
            # Execute statement to process data and maintain state
            "emp_code": p.emp_code,
            # Execute statement to process data and maintain state
            "name": emp_name,
            # Execute statement to process data and maintain state
            "first_name": p.first_name or "",
            # Execute statement to process data and maintain state
            "last_name": p.last_name or "",
            # Execute statement to process data and maintain state
            "designation": p.designation or "Employee",
            # Execute statement to process data and maintain state
            "department": p.department or "Operations",
            # Execute statement to process data and maintain state
            "manager": mgr_name,
            # Execute statement to process data and maintain state
            "email": p.email or "—",
            # Execute statement to process data and maintain state
            "contact": p.mobile_no or "—",
            # Execute statement to process data and maintain state
            "location": emp_location,
            # Execute statement to process data and maintain state
            "profile_image": getattr(p, "profile_image", "") or ""
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "summary": {
            # Execute statement to process data and maintain state
            "present": present_cnt,
            # Execute statement to process data and maintain state
            "absent": absent_cnt,
            # Execute statement to process data and maintain state
            "half_day": half_cnt,
            # Execute statement to process data and maintain state
            "leave": leave_cnt,
            # Execute statement to process data and maintain state
            "holidays": holiday_cnt,
            # Execute statement to process data and maintain state
            "week_off": weekoff_cnt,
            # Execute statement to process data and maintain state
            "working_days": working_days_cnt
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "monthLabel": f"{month_name} {t_year}",
        # Execute statement to process data and maintain state
        "year": t_year,
        # Execute statement to process data and maintain state
        "month": t_month,
        # Execute statement to process data and maintain state
        "calendar": calendar_days
    # Execute statement to process data and maintain state
    }


# Define HTTP POST route endpoint handler
@router.post("/maintenance/vacuum")
# Define trigger_database_vacuum function to handle trigger database vacuum
async def trigger_database_vacuum(
    # Define before_date schema field with type Optional[str] and default value
    before_date: Optional[str] = "2026-10-17",
    # Set user variable to store user value
    user=Depends(require_role(["admin"]))
# Execute statement to process data and maintain state
):
    """
    Admin: Deletes legacy selfie photos before the given date (default 17 Oct 2026)
    and executes PostgreSQL VACUUM (ANALYZE) in AUTOCOMMIT mode to immediately reclaim disk space.
    """
    try:
        # Import engine, SessionLocal from app.db.session for module operations
        from app.db.session import engine, SessionLocal
        # Import text from sqlalchemy for module operations
        from sqlalchemy import text
        # Set cleaned_tables variable to store cleaned tables value
        cleaned_tables = []
        # Acquire context manager resource for enclosed block
        with SessionLocal() as db_purge:
            # Set tables_res variable to store tables res value
            tables_res = db_purge.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND (table_name = 'attendance' OR table_name LIKE 'attendance_20%')
            """)).scalars().all()
            # Iterate through items in sequence loop
            for tbl in tables_res:
                # Begin guarded execution block to trap exceptions
                try:
                    # Execute statement to process data and maintain state
                    db_purge.execute(text(f"""
                        UPDATE {tbl}
                        SET punch_in_image = NULL
                        WHERE date < :b_date AND punch_in_image IS NOT NULL
                    """), {"b_date": before_date})
                    # Execute statement to process data and maintain state
                    db_purge.execute(text(f"""
                        UPDATE {tbl}
                        SET punch_out_image = NULL
                        WHERE date < :b_date AND punch_out_image IS NOT NULL
                    """), {"b_date": before_date})
                    # Invoke db_purge.commit to perform operational action
                    db_purge.commit()
                    # Invoke cleaned_tables.append to perform operational action
                    cleaned_tables.append(tbl)
                # Catch and handle specific exception if raised
                except Exception as tbl_err:
                    # Invoke db_purge.rollback to perform operational action
                    db_purge.rollback()

        # Acquire context manager resource for enclosed block
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as vac_conn:
            # Invoke vac_conn.execute to perform operational action
            vac_conn.execute(text("VACUUM (ANALYZE)"))

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": f"Successfully cleared punch selfie images before {before_date} and executed VACUUM (ANALYZE).",
            # Execute statement to process data and maintain state
            "cleaned_tables": cleaned_tables
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"Error during maintenance cleanup: {e}")
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=f"Failed to execute maintenance cleanup: {str(e)}")


# Define HTTP GET route endpoint handler
@router.get("/maintenance/storage")
# Define get_database_storage_stats function to handle get database storage stats
async def get_database_storage_stats(
    # Set user variable to store user value
    user=Depends(require_role(["admin"]))
# Execute statement to process data and maintain state
):
    """
    Admin: Returns real-time database storage consumption, total database size,
    and size breakdown of individual tables directly from PostgreSQL.
    """
    try:
        # Import engine from app.db.session for module operations
        from app.db.session import engine
        # Import text from sqlalchemy for module operations
        from sqlalchemy import text
        # Acquire context manager resource for enclosed block
        with engine.connect() as conn:
            # Set db_type variable to store db type value
            db_type = engine.dialect.name
            # Evaluate condition to control execution branch
            if db_type != "postgresql":
                # Return computed result or response payload to caller
                return {
                    # Execute statement to process data and maintain state
                    "database_engine": db_type,
                    # Execute statement to process data and maintain state
                    "message": "Detailed storage breakdown is available when connected to PostgreSQL (Neon)."
                # Execute statement to process data and maintain state
                }

            # Set total_size_res variable to store total size res value
            total_size_res = conn.execute(text(
                # Execute statement to process data and maintain state
                "SELECT pg_size_pretty(pg_database_size(current_database())) as size_str, pg_database_size(current_database()) as size_bytes"
            # Execute statement to process data and maintain state
            )).mappings().first()

            # Set tables_res variable to store tables res value
            tables_res = conn.execute(text("""
                SELECT 
                    table_name,
                    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS total_size,
                    pg_total_relation_size(quote_ident(table_name)) AS bytes
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC
                LIMIT 15;
            """)).mappings().all()

            # Set tables_data variable to store tables data value
            tables_data = [
                # Execute statement to process data and maintain state
                {"table": r["table_name"], "size": r["total_size"], "bytes": r["bytes"]}
                # Iterate through items in sequence loop
                for r in tables_res
            # Execute statement to process data and maintain state
            ]

            # Return computed result or response payload to caller
            return {
                # Execute statement to process data and maintain state
                "status": "success",
                # Execute statement to process data and maintain state
                "database_engine": "PostgreSQL (Neon)",
                # Execute statement to process data and maintain state
                "total_database_size": total_size_res["size_str"] if total_size_res else "unknown",
                # Execute statement to process data and maintain state
                "total_size_bytes": total_size_res["size_bytes"] if total_size_res else 0,
                # Execute statement to process data and maintain state
                "tables": tables_data
            # Execute statement to process data and maintain state
            }
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"Error checking storage: {e}")
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=f"Failed to check storage: {str(e)}")




