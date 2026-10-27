import datetime
from datetime import date as dt_date, datetime as dt_datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.role_checker import require_role
from app.models.task_model import DailyTask
from app.models.monthly_sheet_model import MonthlySheet
from app.models.leave import LeaveRequest
from app.models.profile_model import Profile
from app.models.user import User

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_role(["admin"]))],
)


class UpdateRoleRequest(BaseModel):
    role: str


@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    user=Depends(require_role(["admin"]))  # 🔐 only admin allowed
):
    return {
        "message": "Welcome Admin Dashboard",
        "user_email": user.get("sub"),
        "role": user.get("role")
    }


DEFAULT_DEPARTMENTS = [
    "Technical Head",
    "Admin",
    "Technical Architect",
    "Senior Software Developer",
    "Project Manager",
    "Software Developer",
    "Team Leader",
    "Pre Sales",
    "Senior Accountant",
    "Business Analyst",
    "Office Boy",
    "AI/ML Developer",
    "Software Trainee",
    "AI/ML Trainee",
    "Intern Developer",
    "Senior Developer",
    "UI/UX Designer",
    "Intern",
    "Software Intern",
]


@router.get("/departments")
def get_all_departments(db: Session = Depends(get_db)):
    """
    Returns list of all active departments from organizational structure.
    """
    return {"departments": DEFAULT_DEPARTMENTS}


@router.get("/departments/stats")
def get_department_stats(db: Session = Depends(get_db)):
    """
    Returns department-wise employee counts and palette colors
    for Admin Dashboard Pie Chart.
    """
    profiles = db.query(Profile).all()
    counts = {}
    for p in profiles:
        dept = (p.department or "General").strip() or "General"
        counts[dept] = counts.get(dept, 0) + 1
    palette = ["#7c3aed", "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"]
    data = []
    for idx, (dept_name, count) in enumerate(counts.items()):
        data.append({
            "name": dept_name,
            "value": count,
            "color": palette[idx % len(palette)]
        })
    return data


@router.get("/headcount/monthly")
def get_monthly_headcount(db: Session = Depends(get_db)):
    """
    Returns monthly active and inactive headcount trend over the last 6 months.
    """
    import datetime
    today = datetime.date.today()
    profiles = db.query(Profile).all()
    total_profiles = len(profiles)
    active_now = sum(1 for p in profiles if (p.employment_status or "active").lower() != "inactive")
    inactive_now = total_profiles - active_now

    months = []
    for i in range(5, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        m_date = datetime.date(year, month, 1)
        m_name = m_date.strftime("%b")

        if month == 12:
            next_m = datetime.date(year + 1, 1, 1)
        else:
            next_m = datetime.date(year, month + 1, 1)
        m_end = next_m - datetime.timedelta(days=1)

        joined_count = sum(1 for p in profiles if not p.emp_join_date or p.emp_join_date <= m_end)
        act = active_now if i == 0 else max(1, min(joined_count, total_profiles))
        inact = max(0, total_profiles - act)

        months.append({
            "month": m_name,
            "year": year,
            "active": act,
            "inactive": inact
        })
    return months


@router.get("/joinees/monthly")
def get_monthly_joinees(db: Session = Depends(get_db)):
    """
    Returns new joinees and resigned counts by month for the last 6 months.
    """
    import datetime
    today = datetime.date.today()
    profiles = db.query(Profile).all()

    months = []
    for i in range(5, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        m_date = datetime.date(year, month, 1)
        m_name = m_date.strftime("%b")

        joinee_count = sum(
            1 for p in profiles 
            if p.emp_join_date and p.emp_join_date.year == year and p.emp_join_date.month == month
        )

        months.append({
            "month": m_name,
            "year": year,
            "joinee": joinee_count,
            "resigned": 0
        })
    return months


@router.get("/users")
def get_all_users_access(
    db: Session = Depends(get_db)
):
    """
    Returns list of all users/employees with their current roles and metadata
    for Admin Role & Access Control.
    """
    all_profiles = db.query(Profile).all()
    stale_test_codes = {
        "EMP001", "EMP002", "EMP003", "MGR001",
        "ADM001", "ADM002", "ADM003",
        "LE198", "LE873", "LE883", "LE855", "LE913"
    }

    def profile_priority(p):
        code = (p.emp_code or "").strip().upper()
        if code in stale_test_codes:
            return 3
        if code.startswith("LE") or code == "1001" or code.isdigit():
            return 1
        return 2

    sorted_profiles = sorted(all_profiles, key=lambda p: (profile_priority(p), p.emp_code or ""))
    seen_codes = set()
    seen_emails = set()
    profiles = []
    for p in sorted_profiles:
        code_key = (p.emp_code or "").strip().upper()
        email_key = (p.email or "").strip().lower()
        if code_key in stale_test_codes:
            continue
        if code_key and code_key in seen_codes:
            continue
        if email_key and email_key in seen_emails:
            continue
        if code_key:
            seen_codes.add(code_key)
        if email_key:
            seen_emails.add(email_key)
        profiles.append(p)

    results = []
    for p in profiles:
        first = (p.first_name or "").strip()
        middle = (p.middle_name or "").strip()
        last = (p.last_name or "").strip()
        emp_email = (p.email or "").strip()

        # Build clean display name from First, Middle, Last Name (filtering '.' and placeholders)
        name_parts = [part for part in [first, middle, last] if part and part != "." and part.lower() != "none"]
        if name_parts:
            # Check if name is not duplicated
            if len(name_parts) == 2 and name_parts[0].lower() == name_parts[1].lower():
                clean_name = name_parts[0]
            else:
                clean_name = " ".join(name_parts)
        else:
            clean_name = p.emp_code

        # If name accidentally is an email address, use local part
        if clean_name and "@" in clean_name:
            clean_name = clean_name.split("@")[0]

        phone_val = p.mobile_no or getattr(p, "phone", "") or getattr(p, "contact", "") or ""
        join_str = p.emp_join_date.strftime("%Y-%m-%d") if p.emp_join_date else ""
        dob_str = p.dob.strftime("%Y-%m-%d") if p.dob else ""

        dept_val = (p.department or "").strip()
        if not dept_val or dept_val == "." or dept_val.lower() == "unassigned":
            dept_val = "Unassigned"

        desig_val = (p.designation or "").strip()
        if not desig_val or desig_val == ".":
            desig_val = "Employee"

        loc_val = (p.branch_location or "").strip()
        if "*" in loc_val:
            loc_parts = [part.strip() for part in loc_val.split("*") if part.strip()]
            unique_loc = []
            for lp in loc_parts:
                if lp not in unique_loc:
                    unique_loc.append(lp)
            loc_val = ", ".join(unique_loc) if unique_loc else "Mumbai, IN"
        if not loc_val:
            loc_val = "Mumbai, IN"

        results.append({
            "id": p.emp_code,
            "emp_code": p.emp_code,
            "employee_id": p.emp_code,
            "employeeId": p.emp_code,
            "first_name": p.first_name if p.first_name and p.first_name != "." else None,
            "middle_name": p.middle_name if p.middle_name and p.middle_name != "." else None,
            "last_name": p.last_name if p.last_name and p.last_name != "." else None,
            "name": clean_name or p.emp_code,
            "email": p.email or "",
            "phone": phone_val,
            "mobile": phone_val,
            "mobile_no": phone_val,
            "contact": phone_val,
            "role": (p.role or "employee").strip().lower(),
            "designation": desig_val,
            "department": dept_val,
            "type": p.employment_type or "Full-time",
            "employment_type": p.employment_type or "Full-time",
            "status": p.employment_status or "Active",
            "employment_status": p.employment_status or "Active",
            "location": loc_val,
            "branch_location": loc_val,
            "joining_date": join_str,
            "joined": join_str,
            "about": getattr(p, "about", "") or "",
            "profile_image": getattr(p, "profile_image", "") or "",
            "reporting_supervisor": p.reporting_supervisor or "",
            "manager": p.reporting_supervisor or "",
            "gender": p.gender or "",
            "dob": dob_str,
            "marital_status": p.marital_status or "",
            "father_name": p.father_name if p.father_name and p.father_name != "." else "",
            "mother_name": p.mother_name if p.mother_name and p.mother_name != "." else "",
            "spouse_name": getattr(p, "spouse_name", "") or "",
            "family_contact": p.family_contact if p.family_contact and p.family_contact != "." else "",
            "address1": p.address1 or "",
            "address2": p.address2 or "",
            "city": p.city or "",
            "state": p.state or "",
            "country": p.country or "",
            "pincode": p.pincode or "",
            "confirmation_due": p.confirmation_due or "",
            "confirmation_date": p.confirmation_date or "",
            "skill_level": p.skill_level or ""
        })

    # Calculate statistics
    total = len(results)
    admin_count = sum(1 for u in results if u["role"] == "admin")
    manager_count = sum(1 for u in results if u["role"] == "manager")
    employee_count = sum(1 for u in results if u["role"] not in ["admin", "manager"])

    return {
        "users": results,
        "summary": {
            "total": total,
            "admin": admin_count,
            "manager": manager_count,
            "employee": employee_count
        }
    }


@router.put("/users/{emp_code}/role")
def update_user_role(
    emp_code: str,
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to change any employee's portal access level
    (employee, manager, admin).
    """
    target_role = payload.role.strip().lower()
    valid_roles = ["admin", "manager", "employee", "teamleader"]
    if target_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(valid_roles)}"
        )

    # Search by emp_code or email
    clean_code = emp_code.strip()
    profile = db.query(Profile).filter(Profile.emp_code.ilike(clean_code)).first()
    if not profile:
        profile = db.query(Profile).filter(Profile.email.ilike(clean_code)).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with identifier '{emp_code}' not found."
        )

    old_role = (profile.role or "employee").strip().lower()
    profile.role = target_role

    # Also synchronize User table if it exists
    user_records = db.query(User).filter(
        (User.empcode.ilike(profile.emp_code)) | (User.email.ilike(profile.email))
    ).all()
    for u in user_records:
        u.role = target_role

    db.commit()
    db.refresh(profile)

    user_name = f"{profile.first_name or ''} {profile.last_name or ''}".strip() or profile.emp_code

    return {
        "message": f"Successfully changed access for {user_name} to {target_role.upper()}",
        "emp_code": profile.emp_code,
        "name": user_name,
        "email": profile.email,
        "old_role": old_role,
        "new_role": target_role
    }


@router.put("/users/{emp_code}")
def update_user_profile(
    emp_code: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    from app.services.profile_service import update_profile
    updated = update_profile(db, emp_code, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with identifier '{emp_code}' not found."
        )
    user_name = f"{updated.first_name or ''} {updated.last_name or ''}".strip() or updated.emp_code
    return {
        "status": "success",
        "message": f"Successfully updated employee '{user_name}'",
        "emp_code": updated.emp_code,
        "name": user_name
    }


@router.delete("/users/{emp_code}")
def delete_user_profile(
    emp_code: str,
    db: Session = Depends(get_db)
):
    from app.services.profile_service import delete_profile
    success = delete_profile(db, emp_code)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with identifier '{emp_code}' not found."
        )
    return {
        "status": "success",
        "message": f"User '{emp_code}' deleted successfully."
    }


class BulkImportRequest(BaseModel):
    employees: List[Dict[str, Any]]


def _parse_excel_date(val: Any) -> Any:
    """Parse dates from Excel formats (datetime, date, DD-MM-YYYY, YYYY-MM-DD)."""
    import datetime as dt_mod
    if not val:
        return None
    if isinstance(val, dt_mod.datetime):
        return val.date()
    if isinstance(val, dt_mod.date):
        return val
    s = str(val).strip()
    if not s or s == ".":
        return None
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            return dt_mod.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def _clean_str(val: Any, filter_placeholders: bool = True) -> Optional[str]:
    """Clean string value, stripping whitespace and filtering placeholder values like '.'."""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    if filter_placeholders and s.lower() in (".", "unassigned", "none", "null", "undefined"):
        return None
    return s


def _clean_location(val: Any) -> str:
    """Clean location string like 'Mumbai*Mumbai*Maharashtra*India' to 'Mumbai, Maharashtra, India'."""
    if not val:
        return "Mumbai, IN"
    s = str(val).strip()
    if "*" in s:
        parts = [p.strip() for p in s.split("*") if p.strip()]
        unique_parts = []
        for p in parts:
            if p not in unique_parts:
                unique_parts.append(p)
        return ", ".join(unique_parts) if unique_parts else "Mumbai, IN"
    return s


@router.post("/employees/import-mastersheet")
@router.post("/import-mastersheet")
def bulk_import_mastersheet(
    payload: BulkImportRequest,
    db: Session = Depends(get_db)
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
    if not items:
        return {"status": "success", "created": 0, "updated": 0, "total": 0, "conflicts": []}

    from app.core.security import hash_password
    default_pwd_hash = hash_password("Admin@123")

    created_count = 0
    updated_count = 0
    conflicts = []
    errors = []

    for idx, emp in enumerate(items):
        try:
            # 1. Canonical Employee Code
            raw_code1 = _clean_str(emp.get("emp_code") or emp.get("Employee-Code"), False)
            raw_code2 = _clean_str(emp.get("id") or emp.get("Employee Code") or emp.get("code"), False)
            raw_code = raw_code1 or raw_code2 or ""
            
            # Detect conflicts between Employee-Code and Employee Code if both present
            if raw_code1 and raw_code2 and raw_code1.upper() != raw_code2.upper():
                conflicts.append(f"Row {idx + 1}: Code conflict ('{raw_code1}' vs '{raw_code2}')")
            
            raw_email = str(emp.get("email") or emp.get("Email ID") or emp.get("email_id") or "").strip().lower()

            if not raw_code and not raw_email:
                errors.append(f"Row {idx + 1}: Missing both employee code and email")
                continue

            # 2. Name parts
            fn = _clean_str(emp.get("first_name") or emp.get("First Name"))
            mn = _clean_str(emp.get("middle_name") or emp.get("Middle Name"))
            ln = _clean_str(emp.get("last_name") or emp.get("Last Name"))
            raw_name = _clean_str(emp.get("name") or emp.get("Full Name") or emp.get("Employee Name"), False)

            if not fn and raw_name:
                parts = raw_name.split()
                fn = parts[0]
                if len(parts) > 1:
                    ln = " ".join(parts[1:])

            # 3. Designation (Job Title) - Kept strictly separate from access permission role!
            desig = _clean_str(emp.get("designation") or emp.get("Designation") or emp.get("role_title")) or "Employee"
            
            # 4. Department
            dept = _clean_str(emp.get("department") or emp.get("Department"))  # '.' or 'Unassigned' returns None

            # 5. Mobile
            mobile = _clean_str(emp.get("mobile_no") or emp.get("Mobile") or emp.get("phone") or emp.get("contact"), False)

            # 6. Location
            raw_loc = emp.get("location") or emp.get("Branch Location") or emp.get("branch_location")
            loc = _clean_location(raw_loc)

            # 7. Dates
            join_date = _parse_excel_date(emp.get("joining_date") or emp.get("Joining Date") or emp.get("joined") or emp.get("emp_join_date"))
            dob = _parse_excel_date(emp.get("dob") or emp.get("Date of Birth"))

            # 8. Employment type & status
            emp_type = _clean_str(emp.get("employment_type") or emp.get("Employment Type") or emp.get("type"), False) or "Full Time"
            emp_status = _clean_str(emp.get("employment_status") or emp.get("Employment Status") or emp.get("Status"), False) or "Active"
            
            # 9. Supervisor (Reporting Supervisor Email)
            mgr_val = _clean_str(emp.get("reporting_supervisor") or emp.get("Reporting Supervisor Email") or emp.get("manager") or emp.get("manager_code"))

            # 10. Family & Address details
            gender = _clean_str(emp.get("gender") or emp.get("Gender"))
            marital_status = _clean_str(emp.get("marital_status") or emp.get("Marital Status"))
            father_name = _clean_str(emp.get("father_name") or emp.get("Father Name"))
            mother_name = _clean_str(emp.get("mother_name") or emp.get("Mother Name"))
            spouse_name = _clean_str(emp.get("spouse_name") or emp.get("Spouse Name"))
            family_contact = _clean_str(emp.get("family_contact") or emp.get("Family Contact Number ") or emp.get("Family Contact Number"), False)
            address1 = _clean_str(emp.get("address1") or emp.get("Address Line 1"), False)
            address2 = _clean_str(emp.get("address2") or emp.get("Address Line 2"), False)
            city = _clean_str(emp.get("city") or emp.get("City"), False)
            state = _clean_str(emp.get("state") or emp.get("State"), False)
            country = _clean_str(emp.get("country") or emp.get("Country"), False)
            pincode = _clean_str(emp.get("pincode") or emp.get("Zip/Pin Code"), False)
            confirmation_due = _clean_str(emp.get("confirmation_due") or emp.get("Confirmation Due Date"), False)
            confirmation_date = _clean_str(emp.get("confirmation_date") or emp.get("Confirmation Date"), False)
            skill_level = _clean_str(emp.get("skill_level") or emp.get("Skill Level"), False)
            emp_effective_from = _clean_str(emp.get("emp_effective_from") or emp.get("Employment Status Effective Date"), False)
            job_effective_from = _clean_str(emp.get("job_effective_from") or emp.get("Job Information Effective Date"), False)
            about = _clean_str(emp.get("about") or emp.get("Remark"), False)

            # Look up existing profile by primary emp_code
            p = None
            if raw_code:
                p = db.query(Profile).filter(Profile.emp_code.ilike(raw_code)).first()
            if not p and raw_email:
                p_by_email = db.query(Profile).filter(Profile.email.ilike(raw_email)).first()
                if p_by_email:
                    # Check for identity conflict
                    if raw_code and p_by_email.emp_code and p_by_email.emp_code.upper() != raw_code.upper():
                        conflicts.append(f"Row {idx + 1}: Email '{raw_email}' matches existing code '{p_by_email.emp_code}', creating canonical '{raw_code}'")
                        p = None
                    else:
                        p = p_by_email

            if p:
                # UPDATE existing profile - Preserve existing role!
                if fn: p.first_name = fn
                if mn: p.middle_name = mn
                if ln: p.last_name = ln
                if raw_email: p.email = raw_email
                if mobile: p.mobile_no = mobile
                p.designation = desig
                p.department = dept
                if loc: p.branch_location = loc
                if join_date: p.emp_join_date = join_date
                if emp_type: p.employment_type = emp_type
                if emp_status: p.employment_status = emp_status
                if mgr_val: p.reporting_supervisor = mgr_val
                if gender: p.gender = gender
                if dob: p.dob = dob
                if marital_status: p.marital_status = marital_status
                if father_name: p.father_name = father_name
                if mother_name: p.mother_name = mother_name
                if spouse_name: p.spouse_name = spouse_name
                if family_contact: p.family_contact = family_contact
                if address1: p.address1 = address1
                if address2: p.address2 = address2
                if city: p.city = city
                if state: p.state = state
                if country: p.country = country
                if pincode: p.pincode = pincode
                if confirmation_due: p.confirmation_due = confirmation_due
                if confirmation_date: p.confirmation_date = confirmation_date
                if skill_level: p.skill_level = skill_level
                if emp_effective_from: p.emp_effective_from = emp_effective_from
                if job_effective_from: p.job_effective_from = job_effective_from
                if about: p.about = about
                updated_count += 1
            else:
                # CREATE new profile - System role defaults strictly to 'employee'!
                clean_code = raw_code or f"EMP{db.query(Profile).count() + 100:03d}"
                clean_email = raw_email or f"{clean_code.lower()}@laesfera.co"
                
                # Role is strictly 'employee' unless explicitly specified via admin assignment
                assigned_role = "employee"
                explicit_role = str(emp.get("role") or "").strip().lower()
                if explicit_role in ("admin", "manager"):
                    assigned_role = explicit_role

                p = Profile(
                    emp_code=clean_code,
                    email=clean_email,
                    password_hash=default_pwd_hash,
                    first_name=fn or clean_code,
                    middle_name=mn,
                    last_name=ln or "",
                    role=assigned_role,
                    designation=desig,
                    department=dept,
                    mobile_no=mobile,
                    branch_location=loc,
                    emp_join_date=join_date,
                    employment_type=emp_type,
                    employment_status=emp_status,
                    reporting_supervisor=mgr_val,
                    gender=gender,
                    dob=dob,
                    marital_status=marital_status,
                    father_name=father_name,
                    mother_name=mother_name,
                    family_contact=family_contact,
                    address1=address1,
                    address2=address2,
                    city=city,
                    state=state,
                    country=country,
                    pincode=pincode,
                    confirmation_due=confirmation_due,
                    confirmation_date=confirmation_date,
                    skill_level=skill_level,
                    emp_effective_from=emp_effective_from,
                    job_effective_from=job_effective_from,
                    about=about,
                    must_change_password=False
                )
                db.add(p)
                created_count += 1

            # Synchronize with User table without duplicating
            u = db.query(User).filter(User.empcode.ilike(p.emp_code)).first()
            if not u and p.email:
                u = db.query(User).filter(User.email.ilike(p.email)).first()
            if u:
                u.empcode = p.emp_code
                u.email = p.email
                u.designation = p.designation
            else:
                new_u = User(
                    username=p.emp_code,
                    email=p.email,
                    empcode=p.emp_code,
                    password=default_pwd_hash,
                    role=p.role,
                    designation=p.designation
                )
                db.add(new_u)

        except Exception as row_err:
            errors.append(f"Row {idx + 1} processing error: {str(row_err)}")

    try:
        db.commit()
    except Exception as commit_err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit error during import: {str(commit_err)}")

    return {
        "status": "success",
        "message": f"Successfully synchronized {created_count + updated_count} employee records",
        "created": created_count,
        "updated": updated_count,
        "created_count": created_count,
        "updated_count": updated_count,
        "total": created_count + updated_count,
        "conflicts": conflicts,
        "errors": errors
    }


@router.post("/employees/sync-master-file")
def sync_master_file_direct(db: Session = Depends(get_db)):
    """
    Locates and synchronizes the real 'Emp Data 1.xlsx' master workbook
    directly from the project workspace into the database.
    """
    import os, openpyxl

    possible_paths = [
        r"c:\Users\info\Downloads\La esfera-project (1)\Quickchex-project 1 (3)\Quickchex-project 1\Quickchex\Emp Data 1.xlsx",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "Emp Data 1.xlsx")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "..", "Emp Data 1.xlsx")),
    ]

    target_path = None
    for p in possible_paths:
        if os.path.exists(p):
            target_path = p
            break

    if not target_path:
        raise HTTPException(status_code=404, detail="Master sheet 'Emp Data 1.xlsx' could not be located in workspace.")

    wb = openpyxl.load_workbook(target_path, data_only=True)
    sheet = wb.active
    headers = [str(cell.value).strip() if cell.value is not None else "" for cell in sheet[1]]

    raw_items = []
    for r in range(2, sheet.max_row + 1):
        vals = [sheet.cell(row=r, column=c).value for c in range(1, len(headers) + 1)]
        if any(v is not None and str(v).strip() != "" for v in vals):
            raw_items.append(dict(zip(headers, vals)))

    req = BulkImportRequest(employees=raw_items)
    res = bulk_import_mastersheet(req, db)
    res["file_path"] = target_path
    res["total_sheet_rows"] = len(raw_items)
    return res


# ==============================================================================
# MANAGER & TEAM ATTENDANCE ENDPOINTS FOR ADMIN PORTAL
# ==============================================================================
import calendar
from datetime import date as date_cls, datetime, timedelta
from sqlalchemy import text
from app.models.leave import LeaveRequest


def _get_attendance_status_for_date(db: Session, emp_code: str, target_date: date_cls):
    """
    Helper to compute detailed attendance status, punch in, punch out, working hours, and location
    for a given employee and date across all portal endpoints.
    """
    from app.services.attendance_service import calculate_attendance_status

    now = datetime.now()
    today = now.date()

    # Resolve candidate codes
    candidate_codes = [str(emp_code).strip()]
    prof = db.query(Profile).filter(
        (Profile.emp_code == str(emp_code).strip()) |
        (Profile.email.ilike(str(emp_code).strip())) |
        (Profile.id == (int(emp_code) if str(emp_code).isdigit() else -1))
    ).first()

    if prof:
        if prof.emp_code and prof.emp_code not in candidate_codes:
            candidate_codes.append(prof.emp_code)
        if prof.email and prof.email not in candidate_codes:
            candidate_codes.append(prof.email)
        if prof.id and str(prof.id) not in candidate_codes:
            candidate_codes.append(str(prof.id))

    emp_location = (prof.branch_location if prof and prof.branch_location else "Mumbai, India") or "Mumbai, India"

    # Query Leave
    leave = None
    for code_val in candidate_codes:
        leave = db.query(LeaveRequest).filter(
            LeaveRequest.emp_code == code_val,
            LeaveRequest.status.ilike("Approved"),
            LeaveRequest.start_date <= target_date,
            LeaveRequest.end_date >= target_date
        ).first()
        if leave:
            break

    # ── Check Centralized Organization Calendar (HOLIDAY / WEEKLY_OFF) ────────
    is_holiday = False
    is_weekly_off = False
    holiday_name = None
    cal_exists = False
    try:
        cal_row = db.execute(
            text("SELECT status, holiday_name FROM organization_calendar WHERE date = :d"),
            {"d": target_date}
        ).mappings().first()
        if cal_row:
            cal_exists = True
            cal_status = (cal_row["status"] or "").strip().upper()
            h_name = (cal_row["holiday_name"] or "").strip()
            if "WEEK" in cal_status or cal_status in ("WEEKLY_OFF", "WO", "OFF"):
                is_weekly_off = True
            elif cal_status == "HOLIDAY" or h_name or (cal_status and cal_status not in ("WORKING_DAY", "WORKING", "WORK")):
                is_holiday = True
                holiday_name = h_name or (cal_row["status"].strip() if cal_row["status"] else "Holiday")
    except Exception:
        pass

    # Only for past or current dates (<= today), fallback to Sunday as Weekly Off ONLY IF date is NOT in calendar
    if target_date <= today and not cal_exists:
        if not is_holiday and not is_weekly_off and target_date.weekday() == 6:
            is_weekly_off = True

    # Query Punch
    from sqlalchemy import bindparam
    table_name = f"attendance_{target_date.year}_{target_date.month:02d}"
    rec = None
    try:
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
        rec = db.execute(query, {"codes": list(candidate_codes), "t_date": target_date}).mappings().first()
    except Exception:
        db.rollback()
        rec = None

    from app.services.attendance_service import (
        calculate_attendance_status,
        safe_parse_datetime,
        safe_parse_date,
        safe_format_time,
        safe_format_date,
        safe_calc_hours,
        repair_utc_punch_out
    )
    from app.api.v1.endpoints.attendance_api import resolve_punch_photo

    in_time_val = rec["punch_in_time"] if rec else None
    out_time_val = rec["punch_out_time"] if rec else None
    in_dt = safe_parse_datetime(in_time_val)
    d_val = safe_parse_date(target_date) or today
    out_dt = repair_utc_punch_out(in_dt, out_time_val, d_val)
    h_val = float(rec["hours_completed"] or 0) if rec else 0.0

    if in_dt and out_dt:
        expected_h = safe_calc_hours(in_dt, out_dt, d_val, now=now)
        if h_val == 0 or abs(expected_h - h_val) > 1.0:
            h_val = expected_h

    status_info = calculate_attendance_status(
        punch_in_time=in_dt,
        punch_out_time=out_dt,
        hours_completed=h_val,
        target_date=d_val,
        is_leave=bool(leave),
        leave_category=leave.category if leave else None,
        is_holiday=is_holiday,
        is_sunday=is_weekly_off,
        status_override=rec["status"] if rec else None,
        now=now
    )


    from app.services.geo_service import format_punch_location

    in_t = safe_format_time(in_dt, "—")
    out_t = safe_format_time(out_dt, "—")

    h_str = status_info["total_hours"]
    h_val = status_info["hours"]
    p_in_lat = rec["punch_in_latitude"] if rec else None
    p_in_lon = rec["punch_in_longitude"] if rec else None
    raw_loc = (rec["punch_in_location"] if rec and rec["punch_in_location"] else (rec["punch_out_location"] if rec and rec["punch_out_location"] else emp_location)) if rec else emp_location
    loc_captured = format_punch_location(raw_loc, lat=p_in_lat, lon=p_in_lon, default_loc=emp_location) or emp_location

    # Authoritative resolution based on Calendar and Attendance
    if is_holiday:
        st_final = "Holiday"
        badge_final = "HD"
        timing_str = holiday_name or "Holiday"
        duration_str = "0hr 0min"
    elif is_weekly_off:
        st_final = "Weekly Off"
        badge_final = "WO"
        timing_str = "WeeklyOff"
        duration_str = "0hr 0min"
    elif leave:
        cat_str = f" ({leave.category})" if leave.category else ""
        st_final = f"Leave{cat_str}"
        badge_final = "LV"
        timing_str = f"Leave{cat_str}"
        duration_str = "0hr 0min"
    elif rec:
        st_final = status_info["status"]
        badge_final = status_info["badge_code"]
        timing_str = f"{in_t} - {out_t}" if (in_t != "—" and out_t != "—") else (f"In: {in_t}" if in_t != "—" else "—")
        duration_str = f"{int(h_val)}hr {int((h_val % 1)*60):02d}min" if in_t != "—" else "0hr 0min"
    else:
        if d_val > today:
            st_final = ""
            badge_final = "—"
            timing_str = "—"
            duration_str = "—"
        elif d_val == today:
            st_final = "Not started"
            badge_final = "—"
            timing_str = "—"
            duration_str = "—"
        else:
            if not is_holiday and not is_weekly_off and not cal_exists and d_val.weekday() == 6:
                st_final = "Weekly Off"
                badge_final = "WO"
                timing_str = "WeeklyOff"
                duration_str = "0hr 0min"
            else:
                st_final = "Absent"
                badge_final = "A"
                timing_str = "—"
                duration_str = "0hr 0min"

    w_mode = (rec["work_mode"] if rec and rec.get("work_mode") else "OFFICE") or "OFFICE"
    cs_name = (rec["client_site_name"] if rec and rec.get("client_site_name") else None)

    return {
        "status": st_final,
        "badge_code": badge_final,
        "badge": badge_final,
        "checkIn": in_t,
        "checkOut": out_t,
        "punch_in": in_t,
        "punch_out": out_t,
        "timing": timing_str,
        "duration": duration_str,
        "formattedDate": d_val.strftime("%a, %b %d"),
        "is_holiday": is_holiday,
        "is_weekly_off": is_weekly_off,
        "holiday_name": holiday_name,
        "punch_in_time": in_dt.isoformat() if in_dt else None,
        "punch_out_time": out_dt.isoformat() if out_dt else None,
        "workingHours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
        "working_hours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
        "total_minutes": status_info["total_minutes"],
        "total_hours": h_str,
        "hours": h_val,
        "location": loc_captured,
        "punch_in_location": loc_captured,
        "punch_out_location": rec["punch_out_location"] if rec else None,
        "punch_in_latitude": rec["punch_in_latitude"] if rec else None,
        "punch_in_longitude": rec["punch_in_longitude"] if rec else None,
        "punch_in_accuracy": rec["punch_in_accuracy"] if rec else None,
        "punch_out_latitude": rec["punch_out_latitude"] if rec else None,
        "punch_out_longitude": rec["punch_out_longitude"] if rec else None,
        "punch_out_accuracy": rec["punch_out_accuracy"] if rec else None,
        "punch_in_image": resolve_punch_photo(rec["punch_in_image"]) if rec else None,
        "punch_out_image": resolve_punch_photo(rec["punch_out_image"]) if rec else None,
        "leave_status": leave.category if leave else "None",
        "holiday_name": holiday_name,
        "remark": (rec["remark"] if rec and rec.get("remark") else None) or (holiday_name if is_holiday else ("On Time" if in_t != "—" else "")),
        "work_mode": w_mode,
        "workMode": w_mode,
        "client_site_id": rec["client_site_id"] if rec and rec.get("client_site_id") else None,
        "client_site_name": cs_name,
        "client_site": cs_name
    }



@router.get("/managers")
def get_all_managers_admin(db: Session = Depends(get_db)):
    """Returns list of all managers with department, team count, present, absent, leave, and half day counts."""
    profiles = db.query(Profile).all()
    today = date_cls.today()

    # Find profiles with role 'manager'
    manager_codes = set()
    for p in profiles:
        r = (p.role or "").strip().lower()
        if r == "manager":
            manager_codes.add(p.emp_code)

    # Fallback: if no manager explicitly marked, check supervisors
    if not manager_codes:
        for p in profiles:
            sup = (p.reporting_supervisor or "").strip()
            if sup:
                manager_codes.add(sup)

    results = []
    for m_code in sorted(list(manager_codes)):
        m_prof = next((p for p in profiles if p.emp_code == m_code), None)
        if not m_prof:
            continue

        m_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() or m_prof.emp_code

        # Direct reportees strictly by reporting_supervisor relationship
        m_code_clean = (m_code or "").strip().lower()
        team = [
            p for p in profiles 
            if p.reporting_supervisor and (
                p.reporting_supervisor.strip().lower() == m_code_clean or 
                (str(p.reporting_supervisor).strip() == str(m_prof.id)) or
                (m_prof.email and p.reporting_supervisor.strip().lower() == m_prof.email.strip().lower()) or
                (m_name and p.reporting_supervisor.strip().lower() == m_name.strip().lower())
            )
        ]
        team_size = len(team)

        present_cnt = 0
        absent_cnt = 0
        leave_cnt = 0
        half_cnt = 0

        for member in team:
            try:
                att = _get_attendance_status_for_date(db, member.emp_code, today)
                st = att.get("status", "Present")
                if st in ["Present", "In Progress", "Punched In"]:
                    present_cnt += 1
                elif "Leave" in st:
                    leave_cnt += 1
                elif st == "Half Day":
                    half_cnt += 1
                elif st == "Absent":
                    absent_cnt += 1
            except Exception as att_err:
                print(f"Attendance status query note for {member.emp_code}:", att_err)

        results.append({
            "id": m_prof.id,
            "emp_code": m_prof.emp_code,
            "name": m_name,
            "designation": m_prof.designation or "Manager",
            "department": m_prof.department or "Operations",
            "email": m_prof.email or "",
            "contact": m_prof.mobile_no or "—",
            "profile_image": getattr(m_prof, "profile_image", "") or "",
            "team_size": team_size,
            "present_today": present_cnt,
            "absent_today": absent_cnt,
            "leave_today": leave_cnt,
            "halfday_today": half_cnt
        })

    return {
        "status": "success",
        "total_managers": len(results),
        "managers": results
    }


@router.get("/managers/{manager_id}/team")
def get_manager_team_admin(
    manager_id: str,
    date_str: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns manager details, team attendance metrics, and individual team members for a given date."""
    target_date = date_cls.today()
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            pass

    # Find manager
    m_prof = db.query(Profile).filter((Profile.emp_code == manager_id) | (Profile.id == (int(manager_id) if manager_id.isdigit() else -1))).first()
    if not m_prof:
        m_prof = db.query(Profile).first()

    all_profiles = db.query(Profile).all()
    m_code = m_prof.emp_code if m_prof else "EMP001"
    m_email = (m_prof.email or "").lower() if m_prof else ""
    m_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() or m_code if m_prof else "Manager"

    # Find direct reportees strictly by reporting_supervisor relationship
    m_code_clean = (m_code or "").strip().lower()
    team = [
        p for p in all_profiles 
        if p.reporting_supervisor and (
            p.reporting_supervisor.strip().lower() == m_code_clean or 
            (m_prof and str(p.reporting_supervisor).strip() == str(m_prof.id)) or
            (m_email and p.reporting_supervisor.strip().lower() == m_email) or
            (m_name and p.reporting_supervisor.strip().lower() == m_name.lower())
        )
    ]

    team_members = []
    present_cnt = 0
    absent_cnt = 0
    leave_cnt = 0
    half_cnt = 0
    missing_cnt = 0

    for member in team:
        att = _get_attendance_status_for_date(db, member.emp_code, target_date)
        st = att["status"]
        if st in ["Present", "Punched In", "In Progress"]:
            present_cnt += 1
        elif "Leave" in st:
            leave_cnt += 1
        elif st == "Half Day":
            half_cnt += 1
        elif st == "Missing Punch":
            missing_cnt += 1
        elif st == "Absent":
            absent_cnt += 1

        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        team_members.append({
            "id": member.id,
            "emp_code": member.emp_code,
            "name": mem_name,
            "designation": member.designation or "Employee",
            "department": member.department or "Operations",
            "contact": member.mobile_no or "—",
            "email": member.email or "—",
            "profile_image": getattr(member, "profile_image", "") or "",
            "checkIn": att["checkIn"],
            "checkOut": att["checkOut"],
            "workingHours": att["workingHours"],
            "status": att["status"],
            "badge_code": att["badge_code"],
            "leave_status": att["leave_status"]
        })

    m_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() or m_code if m_prof else "Manager"

    return {
        "status": "success",
        "date": target_date.strftime("%d %B %Y"),
        "isoDate": target_date.isoformat(),
        "manager": {
            "id": m_prof.id if m_prof else 0,
            "emp_code": m_code,
            "name": m_name,
            "designation": m_prof.designation if m_prof else "Manager",
            "department": m_prof.department if m_prof else "Operations",
            "email": m_prof.email if m_prof else "—",
            "contact": m_prof.mobile_no if m_prof else "—",
            "profile_image": getattr(m_prof, "profile_image", "") if m_prof else "",
            "team_size": len(team_members)
        },
        "summary": {
            "total": len(team_members),
            "present": present_cnt,
            "absent": absent_cnt,
            "on_leave": leave_cnt,
            "half_day": half_cnt,
            "missing_punch": missing_cnt
        },
        "members": team_members
    }


@router.get("/managers/{manager_id}/monthly-grid")
def get_manager_team_monthly_grid_admin(
    manager_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Returns monthly 31-day team attendance grid matrix for a manager's team."""
    now = datetime.now()
    t_year = year or now.year
    t_month = month or now.month
    num_days = calendar.monthrange(t_year, t_month)[1]

    # Find manager & team
    m_prof = db.query(Profile).filter((Profile.emp_code == manager_id) | (Profile.id == (int(manager_id) if manager_id.isdigit() else -1))).first()
    all_profiles = db.query(Profile).all()
    m_code = m_prof.emp_code if m_prof else "EMP001"
    m_email = (m_prof.email or "").lower() if m_prof else ""

    team = [p for p in all_profiles if (p.reporting_supervisor and (p.reporting_supervisor == m_code or (m_email and p.reporting_supervisor.lower() == m_email))) or (p.emp_code != m_code and m_prof and p.department == m_prof.department)]
    if not team:
        team = [p for p in all_profiles if p.emp_code != m_code]

    grid_rows = []
    for member in team:
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        daily_status = {}
        present_c = 0
        absent_c = 0
        leave_c = 0
        half_c = 0

        for day in range(1, num_days + 1):
            d_obj = date_cls(t_year, t_month, day)
            att = _get_attendance_status_for_date(db, member.emp_code, d_obj)
            code = att["badge_code"]
            daily_status[str(day)] = code
            if code == "P": present_c += 1
            elif code == "A": absent_c += 1
            elif code in ["L", "1H", "2H"]: leave_c += 1
            elif code == "HD": half_c += 1

        grid_rows.append({
            "emp_code": member.emp_code,
            "name": mem_name,
            "designation": member.designation or "Employee",
            "daily": daily_status,
            "totals": {
                "present": present_c,
                "absent": absent_c,
                "leave": leave_c,
                "half_day": half_c
            }
        })

    return {
        "status": "success",
        "year": t_year,
        "month": t_month,
        "days_in_month": num_days,
        "grid": grid_rows
    }


class AddTeamMemberPayload(BaseModel):
    is_new: Optional[bool] = False
    emp_code: Optional[str] = None
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    employment_type: Optional[str] = "Regular Employee"
    location: Optional[str] = "Mumbai, IN"
    joining_date: Optional[str] = None
    role: Optional[str] = "employee"
    reporting_supervisor: Optional[str] = None


@router.post("/employees/{emp_code}/assign-manager")
def assign_manager_admin(
    emp_code: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    """Assigns or changes reporting supervisor manager for an employee, and updates employment details if provided."""
    target_prof = db.query(Profile).filter(Profile.emp_code.ilike(emp_code)).first()
    if not target_prof:
        target_prof = db.query(Profile).filter(Profile.email.ilike(emp_code)).first()
    if not target_prof:
        raise HTTPException(status_code=404, detail=f"Employee {emp_code} not found")

    new_mgr = (payload.get("manager_code") or payload.get("manager") or payload.get("reporting_supervisor") or "").strip()
    target_prof.reporting_supervisor = new_mgr if new_mgr else None

    # Update organization attributes if provided
    if payload.get("department"):
        target_prof.department = str(payload["department"]).strip()
    if payload.get("designation"):
        target_prof.designation = str(payload["designation"]).strip()
    if payload.get("branch_location") or payload.get("location"):
        target_prof.branch_location = str(payload.get("branch_location") or payload.get("location")).strip()
    if payload.get("employment_type") or payload.get("type"):
        target_prof.employment_type = str(payload.get("employment_type") or payload.get("type")).strip()
    if payload.get("role"):
        target_prof.role = str(payload["role"]).strip().lower()

    # Synchronize User record
    user_rec = db.query(User).filter((User.empcode.ilike(target_prof.emp_code)) | (User.email.ilike(target_prof.email))).first()
    if user_rec:
        if payload.get("role"):
            user_rec.role = str(payload["role"]).strip().lower()
        if payload.get("designation"):
            user_rec.designation = str(payload["designation"]).strip()

    db.commit()
    db.refresh(target_prof)

    return {
        "status": "success",
        "message": f"Successfully updated manager for {target_prof.emp_code} to '{new_mgr}'",
        "emp_code": target_prof.emp_code,
        "reporting_supervisor": target_prof.reporting_supervisor,
        "department": target_prof.department,
        "designation": target_prof.designation
    }


@router.get("/employees/{emp_code}/attendance-quick")
def get_employee_attendance_quick_admin(
    emp_code: str,
    date_str: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Quick lookup of an employee's actual attendance status for a specific date."""
    target_date = date_cls.today()
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            pass
    att = _get_attendance_status_for_date(db, emp_code, target_date)
    return {
        "status": "success",
        "emp_code": emp_code,
        "date": target_date.isoformat(),
        "attendance": att
    }


@router.post("/managers/{manager_id}/team/members")
@router.post("/managers/{manager_id}/add-member")
def add_team_member_to_manager(
    manager_id: str,
    payload: AddTeamMemberPayload,
    db: Session = Depends(get_db)
):
    """
    Adds a team member under a specific manager.
    Supports either assigning an existing employee or creating a brand new employee profile.
    """
    from app.core.security import hash_password
    from app.models.leave import LeaveBalance
    import re

    # 1. Resolve manager
    m_prof = db.query(Profile).filter(
        (Profile.emp_code == manager_id) | 
        (Profile.id == (int(manager_id) if manager_id.isdigit() else -1)) |
        (Profile.email.ilike(manager_id))
    ).first()
    manager_code = m_prof.emp_code if m_prof else manager_id
    manager_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() or manager_code if m_prof else manager_id

    # 2. Check if this is an existing employee assignment
    existing_emp = None
    input_code = (payload.emp_code or "").strip()
    input_email = (payload.email or "").strip().lower()

    if input_code and not payload.is_new:
        existing_emp = db.query(Profile).filter(Profile.emp_code.ilike(input_code)).first()
    if not existing_emp and input_email and not payload.is_new:
        existing_emp = db.query(Profile).filter(Profile.email.ilike(input_email)).first()

    if existing_emp:
        # Assign existing employee to this manager
        existing_emp.reporting_supervisor = manager_code
        if payload.designation and payload.designation.strip():
            existing_emp.designation = payload.designation.strip()
        if payload.department and payload.department.strip():
            existing_emp.department = payload.department.strip()
        if payload.employment_type and payload.employment_type.strip():
            existing_emp.employment_type = payload.employment_type.strip()
        if payload.location and payload.location.strip():
            existing_emp.branch_location = payload.location.strip()
        if payload.contact or payload.phone:
            existing_emp.mobile_no = (payload.contact or payload.phone).strip()

        clean_role = (payload.role or existing_emp.role or "employee").strip().lower()
        if clean_role in ["admin", "manager", "employee", "teamleader"]:
            existing_emp.role = clean_role

        # Update User table if present
        u = db.query(User).filter(User.empcode.ilike(existing_emp.emp_code)).first()
        if u:
            u.role = clean_role
            if payload.designation:
                u.designation = payload.designation.strip()

        if payload.joining_date:
            try:
                date_val = datetime.strptime(payload.joining_date.strip().split("T")[0], "%Y-%m-%d").date()
                existing_emp.emp_join_date = date_val
            except Exception:
                pass

        db.commit()
        db.refresh(existing_emp)
        emp_name = f"{existing_emp.first_name or ''} {existing_emp.last_name or ''}".strip() or existing_emp.emp_code
        return {
            "status": "success",
            "message": f"Successfully assigned {emp_name} ({existing_emp.emp_code}) to manager {manager_name}'s team.",
            "is_new": False,
            "employee": {
                "id": existing_emp.id,
                "emp_code": existing_emp.emp_code,
                "name": emp_name,
                "email": existing_emp.email,
                "designation": existing_emp.designation,
                "department": existing_emp.department,
                "reporting_supervisor": existing_emp.reporting_supervisor,
                "role": existing_emp.role
            }
        }

    # 3. Create a brand new employee profile
    if not input_email or "@" not in input_email:
        raise HTTPException(status_code=400, detail="A valid Work Email address is required.")

    # Check email uniqueness
    if db.query(Profile).filter(Profile.email.ilike(input_email)).first() or db.query(User).filter(User.email.ilike(input_email)).first():
        raise HTTPException(status_code=400, detail="An employee account already exists with this email address.")

    full_name_input = (payload.name or "").strip()
    first = (payload.first_name or "").strip()
    last = (payload.last_name or "").strip()

    if full_name_input and not first:
        parts = [p.strip() for p in full_name_input.split() if p.strip()]
        if parts:
            first = parts[0]
            last = " ".join(parts[1:]) if len(parts) > 1 else ""

    if not first and not full_name_input:
        raise HTTPException(status_code=400, detail="Full Name is required.")

    full_name = f"{first} {last}".strip() if (first or last) else (full_name_input or "Employee")

    # Determine unique emp_code
    clean_code = input_code.upper()
    if clean_code:
        if db.query(Profile).filter(Profile.emp_code.ilike(clean_code)).first() or db.query(User).filter(User.empcode.ilike(clean_code)).first():
            raise HTTPException(status_code=400, detail=f"Employee ID '{clean_code}' already exists. Please choose a different code.")
    else:
        # Auto-generate next LE number
        all_codes = [p[0] for p in db.query(Profile.emp_code).all() if p[0]]
        max_num = 200
        for c in all_codes:
            num_part = re.sub(r"\D", "", c)
            if num_part.isdigit():
                max_num = max(max_num, int(num_part))
        clean_code = f"LE{max_num + 1}"

    # Parse joining date
    join_date = date_cls.today()
    if payload.joining_date:
        try:
            join_date = datetime.strptime(payload.joining_date.strip().split("T")[0], "%Y-%m-%d").date()
        except Exception:
            pass

    # Role and access
    raw_role = (payload.role or "employee").strip().lower()
    valid_roles = ["admin", "manager", "employee", "teamleader"]
    system_role = raw_role if raw_role in valid_roles else "employee"

    desig_val = (payload.designation or "Employee").strip()
    dept_val = (payload.department or (m_prof.department if m_prof else "Engineering")).strip()
    type_val = (payload.employment_type or "Regular Employee").strip()
    loc_val = (payload.location or "Mumbai, IN").strip()
    phone_val = (payload.contact or payload.phone or payload.mobile or "").strip() or None

    pwd_hash = hash_password("Admin@123")

    try:
        new_prof = Profile(
            emp_code=clean_code,
            first_name=first or None,
            last_name=last or None,
            email=input_email,
            password_hash=pwd_hash,
            must_change_password=True,
            mobile_no=phone_val,
            role=system_role,
            department=dept_val,
            designation=desig_val,
            employment_type=type_val,
            employment_status="Active",
            branch_location=loc_val,
            emp_join_date=join_date,
            reporting_supervisor=manager_code
        )
        db.add(new_prof)

        new_user = User(
            empcode=clean_code,
            username=full_name,
            email=input_email,
            password=pwd_hash,
            role=system_role,
            designation=desig_val
        )
        db.add(new_user)

        # Initialize leave balance
        lb = db.query(LeaveBalance).filter(LeaveBalance.emp_code == clean_code).first()
        if not lb:
            db.add(LeaveBalance(emp_code=clean_code, allowed_leaves=21.0, used_leaves=0.0))

        db.commit()
        db.refresh(new_prof)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error creating employee: {str(exc)}")

    return {
        "status": "success",
        "message": f"Successfully created employee {full_name} ({clean_code}) and assigned to manager {manager_name}.",
        "is_new": True,
        "employee": {
            "id": new_prof.id,
            "emp_code": new_prof.emp_code,
            "name": full_name,
            "email": new_prof.email,
            "designation": new_prof.designation,
            "department": new_prof.department,
            "reporting_supervisor": new_prof.reporting_supervisor,
            "role": new_prof.role
        }
    }


@router.get("/employees/{emp_code}/attendance-preview")
def get_employee_attendance_preview(
    emp_code: str,
    date_str: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetches real attendance record for preview inside modal."""
    target_date = date_cls.today()
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            pass

    att = _get_attendance_status_for_date(db, emp_code, target_date)
    return {
        "status": "success",
        "emp_code": emp_code,
        "date": target_date.isoformat(),
        "attendance": att
    }



@router.get("/attendance/all-records")
def get_global_attendance_records_admin(
    date_str: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    manager_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    work_mode: Optional[str] = None,
    client_site: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Global multi-filtered attendance records endpoint for Admin Attendance Records page."""
    now = datetime.now()
    target_date = date_cls.today()
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            pass

    profiles = db.query(Profile).all()

    # Filter profiles by manager, employee, department, search
    filtered_profiles = profiles
    if department and department.strip() and department.lower() != "all":
        filtered_profiles = [p for p in filtered_profiles if (p.department or "").lower() == department.strip().lower()]

    if manager_id and manager_id.strip() and manager_id.lower() != "all":
        filtered_profiles = [p for p in filtered_profiles if p.reporting_supervisor == manager_id or (p.department and p.department == manager_id)]

    if employee_id and employee_id.strip() and employee_id.lower() != "all":
        filtered_profiles = [p for p in filtered_profiles if p.emp_code == employee_id or p.email == employee_id]

    if search and search.strip():
        s = search.strip().lower()
        filtered_profiles = [
            p for p in filtered_profiles
            if s in p.emp_code.lower()
            or s in (p.email or "").lower()
            or s in f"{p.first_name or ''} {p.last_name or ''}".lower()
        ]

    # Deduplicate profiles so the same employee is not repeated
    # Priority: official LE employee codes > ADM/MGR codes > legacy mock EMP codes
    def _prof_priority(prof):
        c = (prof.emp_code or "").upper()
        if c.startswith("LE"):
            return 3
        if c.startswith("ADM") or c.startswith("MGR"):
            return 2
        return 1

    sorted_profiles = sorted(filtered_profiles, key=_prof_priority, reverse=True)
    deduped_profiles = []
    seen_emails = set()
    seen_names = set()

    for p in sorted_profiles:
        c_email = (p.email or "").strip().lower()
        f_name = f"{p.first_name or ''} {p.last_name or ''}".strip().lower()

        if c_email and c_email in seen_emails:
            continue
        if f_name and len(f_name) > 3 and f_name in seen_names:
            continue

        if c_email:
            seen_emails.add(c_email)
        if f_name and len(f_name) > 3:
            seen_names.add(f_name)

        deduped_profiles.append(p)

    results = []
    for p in deduped_profiles:
        att = _get_attendance_status_for_date(db, p.emp_code, target_date)
        st = att["status"]

        if status_filter and status_filter.strip() and status_filter.lower() != "all":
            sf = status_filter.strip().lower()
            if sf == "leave" and "leave" not in st.lower():
                continue
            elif sf != "leave" and sf not in st.lower():
                continue

        emp_name = _clean_employee_full_name(p.first_name, p.last_name, p.email, p.emp_code)
        mgr_name = p.reporting_supervisor or "—"
        att_work_mode = att.get("work_mode") or "OFFICE"
        att_cs_id = att.get("client_site_id")
        att_cs_name = att.get("client_site_name")

        # Apply work mode filter
        if work_mode and work_mode.strip().lower() not in ("all", ""):
            if att_work_mode.upper() != work_mode.strip().upper():
                continue

        # Apply client site filter
        if client_site and client_site.strip().lower() not in ("all", ""):
            cs_q = client_site.strip().lower()
            if (att_cs_name or "").lower() != cs_q and str(att_cs_id or "") != cs_q:
                continue

        results.append({
            "date": target_date.strftime("%d %b %Y"),
            "isoDate": target_date.isoformat(),
            "emp_code": p.emp_code,
            "name": emp_name,
            "email": p.email or "—",
            "contact": p.mobile_no or "—",
            "manager": mgr_name,
            "department": p.department or "Operations",
            "checkIn": att["checkIn"],
            "checkOut": att["checkOut"],
            "workingHours": att["workingHours"],
            "status": att["status"],
            "leave_status": att["leave_status"],
            "location": att.get("location") or att.get("punch_in_location") or p.branch_location or "—",
            "punch_in_location": att.get("punch_in_location") or att.get("location") or p.branch_location or "—",
            "punch_out_location": att.get("punch_out_location"),
            "punch_in_latitude": att.get("punch_in_latitude"),
            "punch_in_longitude": att.get("punch_in_longitude"),
            "punch_in_image": att.get("punch_in_image"),
            "punch_out_image": att.get("punch_out_image"),
            "punch_out_latitude": att.get("punch_out_latitude"),
            "punch_out_longitude": att.get("punch_out_longitude"),
            "punch_in_time": att.get("punch_in_time"),
            "punch_out_time": att.get("punch_out_time"),
            "profile_image": getattr(p, "profile_image", "") or "",
            "work_mode": att_work_mode,
            "workMode": att_work_mode,
            "client_site_id": att_cs_id,
            "client_site_name": att_cs_name,
            "clientSiteName": att_cs_name,
            "client_site": att_cs_name or "—",
            "clientSite": att_cs_name or "—"
        })

    # Fetch active client sites for filter dropdowns
    client_sites_list = []
    try:
        from app.models.work_location import ClientSite
        active_sites = db.query(ClientSite).filter(ClientSite.is_active == True).all()
        client_sites_list = [{"id": cs.id, "name": cs.name, "client_name": cs.client_name} for cs in active_sites]
    except Exception:
        pass

    return {
        "status": "success",
        "date": target_date.strftime("%d %B %Y"),
        "total": len(results),
        "records": results,
        "client_sites": client_sites_list,
        "work_modes": ["OFFICE", "WFH", "CLIENT_SITE"]
    }


@router.post("/attendance/upload-excel")
async def upload_attendance_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
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
    from datetime import datetime as _dt, date as _date
    from app.db.table_manager import create_monthly_tables
    from app.services.attendance_service import safe_calc_hours

    filename = (file.filename or "").lower()
    content_bytes = await file.read()

    rows = []
    def _normalize_import_header(value):
        # CSV files saved by Excel commonly prefix the first column with a BOM.
        header = str(value or "").lstrip("\ufeff").strip().lower()
        return "_".join(header.replace("-", " ").split())

    # ── Parse the file ──
    if filename.endswith(".csv"):
        text_content = content_bytes.decode("utf-8-sig", errors="replace")
        csv_reader = list(csv.reader(io.StringIO(text_content)))
        if csv_reader:
            headers = [_normalize_import_header(c) for c in csv_reader[0]]
            for r in csv_reader[1:]:
                if not r or all(str(v or "").strip() == "" for v in r):
                    continue
                row_dict = {headers[i]: str(r[i] or "").strip() for i in range(min(len(headers), len(r))) if headers[i]}
                row_dict["_raw_cols"] = [str(v or "").strip() for v in r]
                rows.append(row_dict)
    elif filename.endswith((".xlsx", ".xls")):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
            ws = wb.active
            headers = [_normalize_import_header(c.value) for c in next(ws.iter_rows(min_row=1, max_row=1))]
            for ws_row in ws.iter_rows(min_row=2, values_only=True):
                if not ws_row or all(v is None or str(v).strip() == "" for v in ws_row):
                    continue
                row_dict = {headers[i]: str(ws_row[i] or "").strip() for i in range(min(len(headers), len(ws_row))) if headers[i]}
                row_dict["_raw_cols"] = [str(v or "").strip() for v in ws_row]
                rows.append(row_dict)
        except ImportError:
            raise HTTPException(status_code=400, detail="openpyxl library not installed. Please upload a CSV file instead.")
        except Exception as ex:
            raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(ex)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .csv, .xlsx, or .xls")

    if not rows:
        return {"status": "success", "message": "File was empty", "inserted": 0, "updated": 0, "errors": []}

    # ── Auto-detect: Calendar format vs Attendance format ──────────────────────
    # Calendar format:
    # 1. 3-column file with Date | Day | Status
    # 2. No emp_code column, or emp_code column is completely empty
    # 3. Status column contains Working / Holiday / Weekly Off

    sample_keys = set(rows[0].keys()) - {"_raw_cols"} if rows else set()

    EMP_CODE_KEYS = {"emp_code", "employee_id", "employee_code", "empcode", "emp"}
    STATUS_KEYS   = {"status", "holiday_status", "day_type", "day_status", "state"}
    CALENDAR_STATUS_VALUES = {
        "holiday", "weekly_off", "weekly off", "week_off", "week off", "working_day",
        "working", "work", "workday", "working day", "off", "present"
    }

    has_status_col  = bool(STATUS_KEYS & sample_keys) or any(k.startswith("status") for k in sample_keys)
    has_emp_col_hdr = bool(EMP_CODE_KEYS & sample_keys)

    # Check if emp_code column actually contains any real values in the first 10 rows
    emp_code_populated = False
    if has_emp_col_hdr:
        emp_key = next((k for k in EMP_CODE_KEYS if k in sample_keys), None)
        if emp_key:
            emp_code_populated = any(
                bool((row.get(emp_key) or "").strip())
                for row in rows[:10]
            )

    # Check if status column contains calendar-type values
    status_is_calendar = False
    status_key = next((k for k in STATUS_KEYS if k in sample_keys), None) or next((k for k in sample_keys if "status" in k), None)
    if status_key:
        status_is_calendar = any(
            (row.get(status_key) or "").strip().lower() in CALENDAR_STATUS_VALUES
            for row in rows[:10]
        )

    # Decision: calendar if no emp_code populated AND (has status col OR row has 2-3 columns with date)
    has_date_col = any("date" in k for k in sample_keys) or any(len(row.get("_raw_cols", [])) >= 2 for row in rows[:5])
    is_calendar_format = not emp_code_populated and (has_status_col or status_is_calendar or (has_date_col and not has_emp_col_hdr))

    if is_calendar_format:
        # ── CALENDAR IMPORT PATH ──────────────────────────────────────────────
        from datetime import datetime as _dt
        from app.api.v1.endpoints.calendar_api import _normalize_status, _parse_date as _cal_parse_date

        VALID_CALENDAR_STATUSES = {"HOLIDAY", "WEEKLY_OFF", "WORKING_DAY"}

        cal_inserted = 0
        cal_updated = 0
        cal_errors = []
        now_ts = _dt.utcnow()

        try:
            for idx, row in enumerate(rows):
                try:
                    raw_cols = row.get("_raw_cols") or []

                    # 1. Resolve date
                    raw_date = (
                        row.get("date")
                        or row.get("attendance_date")
                        or row.get("dates")
                        or next((row[k] for k in row if "date" in k and k != "_raw_cols"), "")
                    ).strip()
                    if not raw_date and raw_cols:
                        for c in raw_cols:
                            if c and ("-" in c or "/" in c or (isinstance(c, str) and len(c) == 5)):
                                raw_date = c.strip()
                                break
                        if not raw_date:
                            raw_date = raw_cols[0].strip()

                    if not raw_date:
                        continue

                    rec_date = _cal_parse_date(raw_date)
                    if not rec_date:
                        continue

                    # 2. Resolve day name (optional)
                    raw_day = (
                        row.get("day")
                        or row.get("day_name")
                        or row.get("weekday")
                        or next((row[k] for k in row if "day" in k and "status" not in k and "type" not in k and k != "_raw_cols"), "")
                    ).strip()
                    if not raw_day and len(raw_cols) >= 2:
                        for c in raw_cols:
                            if c and c.lower() in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"):
                                raw_day = c.strip()
                                break

                    # 3. Resolve status (Working / Holiday / Weekly Off)
                    raw_status = (
                        row.get("status")
                        or row.get("holiday_status")
                        or row.get("day_type")
                        or row.get("day_status")
                        or next((row[k] for k in row if "status" in k and k != "_raw_cols"), "")
                    ).strip()

                    # If raw_status was accidentally set to a date string, discard it
                    if raw_status and ("202" in raw_status or ":" in raw_status or "-" in raw_status):
                        raw_status = ""

                    norm_status = _normalize_status(raw_status) if raw_status else ""
                    if not norm_status:
                        # Blank or unassigned status in uploaded calendar is a normal working day
                        # Do NOT arbitrarily mark Saturdays or Sundays as weekly off!
                        norm_status = "WORKING_DAY"

                    holiday_name = None
                    if norm_status == "HOLIDAY":
                        raw_name = (
                            row.get("holiday_name")
                            or row.get("remarks")
                            or row.get("name")
                            or (raw_status if (raw_status and raw_status.upper() not in ("HOLIDAY", "H", "PUBLIC_HOLIDAY", "NATIONAL_HOLIDAY", "WORKING", "WORKING_DAY", "WEEKLY_OFF", "WEEK_OFF")) else None)
                            or (raw_day if (raw_day and raw_day.lower() not in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")) else None)
                            or "Holiday"
                        )
                        holiday_name = str(raw_name).strip() if raw_name else "Holiday"
                    description = (row.get("description") or row.get("notes") or row.get("remark") or "").strip() or None

                    existing = db.execute(
                        text("SELECT id FROM organization_calendar WHERE date = :d"),
                        {"d": rec_date}
                    ).mappings().first()

                    if existing:
                        db.execute(text("""
                            UPDATE organization_calendar
                               SET status = :status, holiday_name = :name, description = :desc, updated_at = :now
                             WHERE date = :d
                        """), {"status": norm_status, "name": holiday_name, "desc": description, "now": now_ts, "d": rec_date})
                        cal_updated += 1
                    else:
                        db.execute(text("""
                            INSERT INTO organization_calendar (date, status, holiday_name, description, created_at, updated_at)
                            VALUES (:d, :status, :name, :desc, :now, :now)
                        """), {"d": rec_date, "status": norm_status, "name": holiday_name, "desc": description, "now": now_ts})
                        cal_inserted += 1

                except Exception as ex:
                    print(f"Row {idx + 2} parse warning: {ex}")

            db.commit()
        except Exception as ex:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Attendance records import failed: {str(ex)}")

        return {
            "status": "success",
            "import_type": "attendance",
            "message": f"Attendance records imported successfully. {cal_inserted + cal_updated} records processed.",
            "inserted": cal_inserted,
            "updated": cal_updated,
            "total_rows": len(rows),
            "errors": []
        }




    # ── Column alias resolution ──
    def pick(row, *keys):
        for k in keys:
            v = row.get(k, "")
            if v and v.lower() not in ("-", "—", "none", "null", "n/a", ""):
                return v
        return None

    def _parse_date(val):
        if not val: return None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"):
            try: return _dt.strptime(str(val).strip(), fmt).date()
            except: pass
        return None

    def _parse_time(val, ref_date):
        if not val: return None
        val = str(val).strip()
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p"):
            try:
                t = _dt.strptime(val, fmt)
                if not t.date().year > 1900 or t.date() == _date(1900, 1, 1):
                    return _dt.combine(ref_date, t.time())
                return t
            except: pass
        return None

    inserted = 0
    updated = 0
    errors = []

    from app.models.work_location import ClientSite
    all_sites = {s.name.lower(): s for s in db.query(ClientSite).all()}

    for idx, row in enumerate(rows):
        try:
            emp_code = pick(row, "emp_code", "employee_id", "employee_code", "empcode", "emp")
            if not emp_code:
                errors.append(f"Row {idx + 2}: missing emp_code")
                continue
            emp_code = emp_code.strip()

            raw_date = pick(row, "date", "attendance_date", "punch_date")
            rec_date = _parse_date(raw_date)
            if not rec_date:
                errors.append(f"Row {idx + 2} ({emp_code}): invalid date '{raw_date}'")
                continue

            # Verify employee exists
            prof = db.query(Profile).filter(Profile.emp_code.ilike(emp_code)).first()
            if not prof:
                errors.append(f"Row {idx + 2}: employee '{emp_code}' not found")
                continue

            table_name = f"attendance_{rec_date.year}_{rec_date.month:02d}"
            create_monthly_tables(for_next_month=False)

            raw_in  = pick(row, "punch_in", "check_in", "in_time", "punch_in_time", "checkin")
            raw_out = pick(row, "punch_out", "check_out", "out_time", "punch_out_time", "checkout")
            in_dt   = _parse_time(raw_in, rec_date)
            out_dt  = _parse_time(raw_out, rec_date)

            work_mode_raw = pick(row, "work_mode", "workmode", "mode") or "OFFICE"
            norm_mode = work_mode_raw.strip().upper().replace(" ", "_")
            if norm_mode in ["WORK_FROM_HOME", "HOME"]: norm_mode = "WFH"
            elif norm_mode in ["CLIENT", "CLIENTSITE", "CLIENT SITE"]: norm_mode = "CLIENT_SITE"
            elif norm_mode not in ["WFH", "CLIENT_SITE"]: norm_mode = "OFFICE"

            cs_name_raw = pick(row, "client_site_name", "client_site", "site", "clientsite")
            cs_id = None
            cs_name = None
            if cs_name_raw:
                site_obj = all_sites.get(cs_name_raw.lower())
                if site_obj:
                    cs_id = site_obj.id
                    cs_name = site_obj.name
                else:
                    cs_name = cs_name_raw

            location = pick(row, "location", "punch_in_location", "address") or (cs_name or "Imported")

            hours_str = None
            if in_dt and out_dt and out_dt > in_dt:
                diff_sec = (out_dt - in_dt).total_seconds()
                h = int(diff_sec // 3600)
                m = int((diff_sec % 3600) // 60)
                hours_str = f"{h}h {m}m"
                att_status = "Present" if h >= 4 else "Half Day"
            elif in_dt:
                att_status = "Punched In"
            else:
                att_status = "Absent"

            # Check for existing record
            existing = db.execute(
                text(f"SELECT id FROM {table_name} WHERE emp_code = :code AND date = :d ORDER BY id DESC LIMIT 1"),
                {"code": emp_code, "d": rec_date}
            ).mappings().first()

            if existing:
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
                    "in_t": in_dt, "out_t": out_dt, "loc": location,
                    "hrs": hours_str, "status": att_status,
                    "wmode": norm_mode, "csid": cs_id, "csname": cs_name,
                    "id": existing["id"]
                })
                updated += 1
            else:
                db.execute(text(f"""
                    INSERT INTO {table_name} (
                        emp_code, date, punch_in_time, punch_out_time, punch_in_location,
                        hours_completed, status, remark, work_mode, client_site_id, client_site_name
                    ) VALUES (
                        :code, :d, :in_t, :out_t, :loc,
                        :hrs, :status, 'Imported', :wmode, :csid, :csname
                    )
                """), {
                    "code": emp_code, "d": rec_date,
                    "in_t": in_dt, "out_t": out_dt, "loc": location,
                    "hrs": hours_str, "status": att_status,
                    "wmode": norm_mode, "csid": cs_id, "csname": cs_name
                })
                inserted += 1
        except Exception as ex:
            errors.append(f"Row {idx + 2}: {str(ex)}")

    try:
        db.commit()
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit error: {str(ex)}")

    return {
        "status": "success",
        "message": f"Import complete. {inserted} inserted, {updated} updated.",
        "inserted": inserted,
        "updated": updated,
        "total_rows": len(rows),
        "errors": errors[:50]  # cap to first 50 errors
    }


def _clean_employee_full_name(first_name: str, last_name: str, email: str, emp_code: str) -> str:
    fn = (first_name or "").strip()
    ln = (last_name or "").strip()
    if "@" in fn: fn = ""
    if "@" in ln: ln = ""
    
    if fn and ln:
        combined = fn if fn.lower() == ln.lower() else f"{fn} {ln}".strip()
    else:
        combined = fn or ln
        
    if combined and combined != emp_code and "@" not in combined:
        return combined

    if email and "@" in email:
        local = email.split("@")[0]
        parts = [p.capitalize() for p in local.replace(".", " ").replace("_", " ").replace("-", " ").split() if p]
        if len(parts) > 1 and parts[-1].isdigit():
            parts.pop()
        if parts:
            return " ".join(parts)

    return emp_code or "Employee"


@router.get("/employees/{employee_id}/attendance-calendar")
def get_employee_attendance_calendar_admin(
    employee_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Returns employee profile details, manager info, monthly totals, and 31-day calendar entries."""
    now = datetime.now()
    t_year = year or now.year
    t_month = month or now.month
    num_days = calendar.monthrange(t_year, t_month)[1]

    # Find employee profile
    p = db.query(Profile).filter((Profile.emp_code == employee_id) | (Profile.id == (int(employee_id) if employee_id.isdigit() else -1))).first()
    if not p:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp_name = _clean_employee_full_name(p.first_name, p.last_name, p.email, p.emp_code)
    mgr_name = p.reporting_supervisor or "—"
    emp_location = p.branch_location or (f"{p.city}, {p.state}" if p.city else "Mumbai, India")

    calendar_days = []
    present_cnt = 0
    absent_cnt = 0
    half_cnt = 0
    leave_cnt = 0
    holiday_cnt = 0
    weekoff_cnt = 0
    working_days_cnt = 0

    for day in range(1, num_days + 1):
        d_obj = date_cls(t_year, t_month, day)
        att = _get_attendance_status_for_date(db, p.emp_code, d_obj)
        code = att["badge_code"]
        st = att["status"]

        if code == "P": present_cnt += 1; working_days_cnt += 1
        elif code == "A": absent_cnt += 1; working_days_cnt += 1
        elif code == "HD": half_cnt += 1; working_days_cnt += 1
        elif code in ["L", "1H", "2H"]: leave_cnt += 1
        elif code == "H": holiday_cnt += 1
        elif code == "WO": weekoff_cnt += 1

        calendar_days.append({
            "day": day,
            "date": d_obj.strftime("%d %b %Y"),
            "isoDate": d_obj.isoformat(),
            "dayName": d_obj.strftime("%a"),
            "status": st,
            "badge_code": code,
            "checkIn": att["checkIn"],
            "checkOut": att["checkOut"],
            "workingHours": att["workingHours"],
            "location": att["location"],
            "leave_status": att["leave_status"],
            "manager": mgr_name,
            "remarks": "On Time" if code == "P" else ("Late / Half Day" if code == "HD" else "—"),
            "punch_in_image": att.get("punch_in_image"),
            "punch_out_image": att.get("punch_out_image"),
            "punch_in_location": att.get("punch_in_location") or att.get("location"),
            "punch_out_location": att.get("punch_out_location") or att.get("location"),
            "punch_in_latitude": att.get("punch_in_latitude"),
            "punch_in_longitude": att.get("punch_in_longitude"),
            "punch_out_latitude": att.get("punch_out_latitude"),
            "punch_out_longitude": att.get("punch_out_longitude"),
            "punch_in_time": att.get("punch_in_time"),
            "punch_out_time": att.get("punch_out_time"),
        })

    month_name = calendar.month_name[t_month]

    return {
        "status": "success",
        "employee": {
            "id": p.id,
            "emp_code": p.emp_code,
            "name": emp_name,
            "first_name": p.first_name or "",
            "last_name": p.last_name or "",
            "designation": p.designation or "Employee",
            "department": p.department or "Operations",
            "manager": mgr_name,
            "email": p.email or "—",
            "contact": p.mobile_no or "—",
            "location": emp_location,
            "profile_image": getattr(p, "profile_image", "") or ""
        },
        "summary": {
            "present": present_cnt,
            "absent": absent_cnt,
            "half_day": half_cnt,
            "leave": leave_cnt,
            "holidays": holiday_cnt,
            "week_off": weekoff_cnt,
            "working_days": working_days_cnt
        },
        "monthLabel": f"{month_name} {t_year}",
        "year": t_year,
        "month": t_month,
        "calendar": calendar_days
    }


@router.post("/maintenance/vacuum")
async def trigger_database_vacuum(
    before_date: Optional[str] = "2026-10-17",
    user=Depends(require_role(["admin"]))
):
    """
    Admin: Deletes legacy selfie photos before the given date (default 17 Oct 2026)
    and executes PostgreSQL VACUUM (ANALYZE) in AUTOCOMMIT mode to immediately reclaim disk space.
    """
    try:
        from app.db.session import engine, SessionLocal
        from sqlalchemy import text
        cleaned_tables = []
        with SessionLocal() as db_purge:
            tables_res = db_purge.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND (table_name = 'attendance' OR table_name LIKE 'attendance_20%')
            """)).scalars().all()
            for tbl in tables_res:
                try:
                    db_purge.execute(text(f"""
                        UPDATE {tbl}
                        SET punch_in_image = NULL
                        WHERE date < :b_date AND punch_in_image IS NOT NULL
                    """), {"b_date": before_date})
                    db_purge.execute(text(f"""
                        UPDATE {tbl}
                        SET punch_out_image = NULL
                        WHERE date < :b_date AND punch_out_image IS NOT NULL
                    """), {"b_date": before_date})
                    db_purge.commit()
                    cleaned_tables.append(tbl)
                except Exception as tbl_err:
                    db_purge.rollback()

        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as vac_conn:
            vac_conn.execute(text("VACUUM (ANALYZE)"))

        return {
            "status": "success",
            "message": f"Successfully cleared punch selfie images before {before_date} and executed VACUUM (ANALYZE).",
            "cleaned_tables": cleaned_tables
        }
    except Exception as e:
        logger.error(f"Error during maintenance cleanup: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute maintenance cleanup: {str(e)}")


@router.get("/maintenance/storage")
async def get_database_storage_stats(
    user=Depends(require_role(["admin"]))
):
    """
    Admin: Returns real-time database storage consumption, total database size,
    and size breakdown of individual tables directly from PostgreSQL.
    """
    try:
        from app.db.session import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            db_type = engine.dialect.name
            if db_type != "postgresql":
                return {
                    "database_engine": db_type,
                    "message": "Detailed storage breakdown is available when connected to PostgreSQL (Neon)."
                }

            total_size_res = conn.execute(text(
                "SELECT pg_size_pretty(pg_database_size(current_database())) as size_str, pg_database_size(current_database()) as size_bytes"
            )).mappings().first()

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

            tables_data = [
                {"table": r["table_name"], "size": r["total_size"], "bytes": r["bytes"]}
                for r in tables_res
            ]

            return {
                "status": "success",
                "database_engine": "PostgreSQL (Neon)",
                "total_database_size": total_size_res["size_str"] if total_size_res else "unknown",
                "total_size_bytes": total_size_res["size_bytes"] if total_size_res else 0,
                "tables": tables_data
            }
    except Exception as e:
        logger.error(f"Error checking storage: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check storage: {str(e)}")




