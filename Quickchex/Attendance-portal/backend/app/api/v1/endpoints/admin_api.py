from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.role_checker import require_role
from app.models.task_model import DailyTask
from app.models.monthly_sheet_model import MonthlySheet
from app.models.leave import LeaveRequest
from app.models.profile_model import Profile
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])


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


@router.get("/users")
def get_all_users_access(
    db: Session = Depends(get_db)
):
    """
    Returns list of all users/employees with their current roles and metadata
    for Admin Role & Access Control.
    """
    profiles = db.query(Profile).order_by(Profile.emp_code.asc()).all()
    results = []
    for p in profiles:
        first = (p.first_name or "").strip()
        last = (p.last_name or "").strip()
        emp_email = (p.email or "").strip()

        if first and last:
            if first.lower() == last.lower():
                raw_name = first
            else:
                raw_name = f"{first} {last}".strip()
        else:
            raw_name = first or last or ""

        clean_name = raw_name if raw_name else None
        if clean_name and emp_email:
            if clean_name.lower() == emp_email.lower() or clean_name.lower() == f"{emp_email.lower()} {emp_email.lower()}":
                clean_name = None

        phone_val = p.mobile_no or getattr(p, "phone", "") or getattr(p, "contact", "") or ""

        results.append({
            "id": p.id,
            "emp_code": p.emp_code,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "name": clean_name,
            "email": p.email or "",
            "phone": phone_val,
            "mobile": phone_val,
            "mobile_no": phone_val,
            "contact": phone_val,
            "role": (p.role or "employee").strip().lower(),
            "designation": p.designation or "Employee",
            "department": p.department or "General",
            "employment_status": p.employment_status or "Active",
            "location": p.branch_location or "Mumbai, IN",
            "profile_image": getattr(p, "profile_image", "") or ""
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


class BulkImportRequest(BaseModel):
    employees: List[Dict[str, Any]]


@router.post("/employees/import-mastersheet")
@router.post("/import-mastersheet")
def bulk_import_mastersheet(
    payload: BulkImportRequest,
    db: Session = Depends(get_db)
):
    """
    Bulk import and synchronize employee records from MasterSheet upload.
    Creates new employees and updates existing employees by emp_code or email.
    """
    items = payload.employees
    if not items:
        return {"status": "success", "created": 0, "updated": 0, "total": 0}

    from app.core.security import hash_password
    default_pwd_hash = hash_password("Admin@123")

    created_count = 0
    updated_count = 0

    for emp in items:
        raw_code = str(emp.get("emp_code") or emp.get("id") or "").strip()
        raw_email = str(emp.get("email") or "").strip()

        if not raw_code and not raw_email:
            continue

        # Look up existing profile
        p = None
        if raw_code:
            p = db.query(Profile).filter(Profile.emp_code.ilike(raw_code)).first()
        if not p and raw_email:
            p = db.query(Profile).filter(Profile.email.ilike(raw_email)).first()

        first = emp.get("first_name")
        last = emp.get("last_name")
        raw_name = emp.get("name")
        if raw_name and not first:
            parts = str(raw_name).strip().split(" ")
            first = parts[0]
            if len(parts) > 1:
                last = " ".join(parts[1:])

        dept = str(emp.get("department") or "General").strip()
        desig = str(emp.get("designation") or emp.get("role") or "Employee").strip()
        role = str(emp.get("role") or "employee").strip().lower()
        if "admin" in role or "director" in role:
            role = "admin"
        elif "manager" in role or "lead" in role or "head" in role:
            role = "manager"
        else:
            role = "employee"

        mobile = str(emp.get("mobile_no") or emp.get("phone") or emp.get("mobile") or "9999999999").strip()
        loc = str(emp.get("location") or "Mumbai, IN").strip()
        joined = str(emp.get("joining_date") or emp.get("joined") or "").strip()
        emp_type = str(emp.get("employment_type") or emp.get("type") or "Full-time").strip()
        mgr = emp.get("manager") or emp.get("manager_code") or emp.get("reporting_supervisor")

        if p:
            # Update existing
            if first: p.first_name = first
            if last: p.last_name = last
            if raw_email: p.email = raw_email
            if mobile and mobile != "9999999999": p.mobile_no = mobile
            p.role = role
            p.designation = desig
            p.department = dept
            if loc: p.branch_location = loc
            if joined: p.emp_join_date = joined
            if emp_type: p.employment_type = emp_type
            if mgr: p.reporting_supervisor = str(mgr)
            updated_count += 1
        else:
            # Create new profile
            clean_code = raw_code or f"EMP{db.query(Profile).count() + 100:03d}"
            clean_email = raw_email or f"{clean_code.lower()}@laesfera.co"
            p = Profile(
                emp_code=clean_code,
                email=clean_email,
                password_hash=default_pwd_hash,
                first_name=first or clean_code,
                last_name=last or "",
                role=role,
                designation=desig,
                department=dept,
                mobile_no=mobile,
                branch_location=loc,
                emp_join_date=joined or None,
                employment_type=emp_type,
                reporting_supervisor=str(mgr) if mgr else None,
                employment_status="Active"
            )
            db.add(p)
            created_count += 1

        # Also sync User table
        u = db.query(User).filter((User.empcode.ilike(p.emp_code)) | (User.email.ilike(p.email))).first()
        if u:
            u.role = role
            u.department = dept
            u.designation = desig
        else:
            new_u = User(
                username=p.emp_code,
                email=p.email,
                empcode=p.emp_code,
                password_hash=default_pwd_hash,
                role=role,
                department=dept,
                designation=desig
            )
            db.add(new_u)

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully synchronized {created_count + updated_count} employee records",
        "created": created_count,
        "updated": updated_count,
        "total": created_count + updated_count
    }


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

    # Check Company Holiday
    is_holiday = False
    holiday_name = None
    try:
        from app.main import get_company_holidays
        company_holidays = get_company_holidays()
        for h in company_holidays:
            from app.services.attendance_service import safe_parse_date
            hd = safe_parse_date(h.get("date"))
            if hd and hd == target_date:
                is_holiday = True
                holiday_name = h.get("name")
                break
    except Exception:
        pass

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
                   hours_completed, status, remark
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
        safe_calc_hours
    )

    in_time_val = rec["punch_in_time"] if rec else None
    out_time_val = rec["punch_out_time"] if rec else None
    in_dt = safe_parse_datetime(in_time_val)
    out_dt = safe_parse_datetime(out_time_val)
    d_val = safe_parse_date(target_date) or today
    h_val = float(rec["hours_completed"] or 0) if rec else 0.0

    if h_val == 0:
        h_val = safe_calc_hours(in_dt, out_dt, d_val, now=now)

    status_info = calculate_attendance_status(
        punch_in_time=in_dt,
        punch_out_time=out_dt,
        hours_completed=h_val,
        target_date=d_val,
        is_leave=bool(leave),
        leave_category=leave.category if leave else None,
        is_holiday=is_holiday,
        is_sunday=(d_val.weekday() == 6),
        status_override=rec["status"] if rec else None,
        now=now
    )

    from app.services.geo_service import format_punch_location

    in_t = safe_format_time(in_time_val, "—")
    out_t = safe_format_time(out_time_val, "—")

    h_str = status_info["total_hours"]
    h_val = status_info["hours"]
    raw_loc = (rec["punch_in_location"] if rec and rec["punch_in_location"] else (rec["punch_out_location"] if rec and rec["punch_out_location"] else emp_location)) if rec else emp_location
    loc_captured = format_punch_location(raw_loc) or emp_location

    st_final = status_info["status"]
    badge_final = status_info["badge_code"]

    return {
        "status": st_final,
        "badge_code": badge_final,
        "checkIn": in_t,
        "checkOut": out_t,
        "punch_in": in_t,
        "punch_out": out_t,
        "punch_in_time": in_dt.isoformat() if in_dt else None,
        "punch_out_time": out_dt.isoformat() if out_dt else None,
        "workingHours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
        "working_hours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
        "total_minutes": status_info["total_minutes"],
        "total_hours": h_str,
        "hours": h_val,
        "location": loc_captured,
        "punch_in_location": (rec["punch_in_location"] if rec else None) or loc_captured,
        "punch_out_location": rec["punch_out_location"] if rec else None,
        "punch_in_latitude": rec["punch_in_latitude"] if rec else None,
        "punch_in_longitude": rec["punch_in_longitude"] if rec else None,
        "punch_in_accuracy": rec["punch_in_accuracy"] if rec else None,
        "punch_out_latitude": rec["punch_out_latitude"] if rec else None,
        "punch_out_longitude": rec["punch_out_longitude"] if rec else None,
        "punch_out_accuracy": rec["punch_out_accuracy"] if rec else None,
        "punch_in_image": rec["punch_in_image"] if rec else None,
        "punch_out_image": rec["punch_out_image"] if rec else None,
        "leave_status": leave.category if leave else "None",
        "holiday_name": holiday_name,
        "remark": (rec["remark"] if rec and rec.get("remark") else None) or (holiday_name if is_holiday else ("On Time" if in_t != "—" else ""))
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
        team = [
            p for p in profiles 
            if p.reporting_supervisor and (
                p.reporting_supervisor == m_code or 
                (str(p.reporting_supervisor) == str(m_prof.id)) or
                (m_prof.email and p.reporting_supervisor.lower() == m_prof.email.lower()) or
                (m_name and p.reporting_supervisor.lower() == m_name.lower())
            )
        ]
        team_size = len(team)

        present_cnt = 0
        absent_cnt = 0
        leave_cnt = 0
        half_cnt = 0

        for member in team:
            att = _get_attendance_status_for_date(db, member.emp_code, today)
            st = att["status"]
            if st in ["Present", "In Progress", "Pushed In"]:
                present_cnt += 1
            elif "Leave" in st:
                leave_cnt += 1
            elif st == "Half Day":
                half_cnt += 1
            elif st == "Absent":
                absent_cnt += 1

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
    team = [
        p for p in all_profiles 
        if p.reporting_supervisor and (
            p.reporting_supervisor == m_code or 
            (str(p.reporting_supervisor) == str(m_prof.id)) or
            (m_email and p.reporting_supervisor.lower() == m_email) or
            (m_name and p.reporting_supervisor.lower() == m_name.lower())
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


@router.post("/employees/{emp_code}/assign-manager")
def assign_manager_admin(
    emp_code: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    """Assigns or changes reporting supervisor manager for an employee."""
    target_prof = db.query(Profile).filter(Profile.emp_code.ilike(emp_code)).first()
    if not target_prof:
        target_prof = db.query(Profile).filter(Profile.email.ilike(emp_code)).first()
    if not target_prof:
        raise HTTPException(status_code=404, detail=f"Employee {emp_code} not found")

    new_mgr = (payload.get("manager_code") or payload.get("manager") or "").strip()
    target_prof.reporting_supervisor = new_mgr if new_mgr else None
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully updated manager for {target_prof.emp_code} to '{new_mgr}'",
        "emp_code": target_prof.emp_code,
        "reporting_supervisor": target_prof.reporting_supervisor
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

    results = []
    for p in filtered_profiles:
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

        results.append({
            "date": target_date.strftime("%d %b %Y"),
            "isoDate": target_date.isoformat(),
            "emp_code": p.emp_code,
            "name": emp_name,
            "manager": mgr_name,
            "department": p.department or "Operations",
            "checkIn": att["checkIn"],
            "checkOut": att["checkOut"],
            "workingHours": att["workingHours"],
            "status": att["status"],
            "leave_status": att["leave_status"],
            "location": att.get("location") or att.get("punch_in_location") or p.branch_location or "Mumbai, IN",
            "punch_in_location": att.get("punch_in_location") or att.get("location") or p.branch_location or "Mumbai, IN"
        })

    return {
        "status": "success",
        "date": target_date.strftime("%d %B %Y"),
        "total": len(results),
        "records": results
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
    mgr_name = p.reporting_supervisor or "Payal" if p.emp_code == "5" else (p.reporting_supervisor or "—")
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
            "remarks": "On Time" if code == "P" else ("Late / Half Day" if code == "HD" else "—")
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


class ImportEmployeeItem(BaseModel):
    emp_code: str
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    mobile_no: Optional[str] = None
    role: Optional[str] = "Employee"
    designation: Optional[str] = "Employee"
    department: Optional[str] = "General"
    location: Optional[str] = "Mumbai, IN"
    manager: Optional[str] = None
    manager_code: Optional[str] = None
    joining_date: Optional[str] = None
    employment_type: Optional[str] = "Full-time"


class BulkImportRequest(BaseModel):
    employees: List[ImportEmployeeItem]


@router.post("/employees/import-mastersheet")
def bulk_import_mastersheet_api(
    payload: BulkImportRequest,
    db: Session = Depends(get_db)
):
    """
    Bulk Mastersheet Import & Synchronization API:
    - Primary key lookup by emp_code.
    - Updates existing profile if emp_code exists (no duplicates!).
    - Inserts new Profile + User if emp_code does not exist.
    - Automatically normalizes roles ('Admin', 'Manager', 'Employee').
    - Automatically maps reporting_supervisor (Manager/Team relationship).
    """
    from app.core.security import hash_password

    items = payload.employees
    created_count = 0
    updated_count = 0
    errors = []

    default_hash = hash_password("password123")

    for idx, item in enumerate(items):
        clean_code = (item.emp_code or "").strip()
        if not clean_code:
            errors.append(f"Row {idx + 1}: Missing Employee Code")
            continue

        # Extract name parts
        raw_name = (item.name or "").strip()
        first_n = (item.first_name or "").strip()
        last_n = (item.last_name or "").strip()

        if not first_n and not last_n and raw_name:
            parts = raw_name.split(maxsplit=1)
            first_n = parts[0]
            last_n = parts[1] if len(parts) > 1 else ""

        # Normalize role
        raw_role = (item.role or "").strip().lower()
        if "admin" in raw_role:
            norm_role = "admin"
        elif "manager" in raw_role or "lead" in raw_role or "supervisor" in raw_role:
            norm_role = "manager"
        else:
            norm_role = "employee"

        # Email fallback
        clean_email = (item.email or "").strip()
        if not clean_email:
            clean_email = f"{clean_code.lower()}@laesfera.co"

        # Manager assignment
        mgr_val = (item.manager_code or item.manager or "").strip()

        # Check if Profile exists
        profile = db.query(Profile).filter(Profile.emp_code.ilike(clean_code)).first()

        if profile:
            # UPDATE existing employee
            profile.first_name = first_n or profile.first_name
            profile.last_name = last_n or profile.last_name
            profile.email = clean_email or profile.email
            if item.mobile_no:
                profile.mobile_no = item.mobile_no
            profile.role = norm_role
            if item.designation:
                profile.designation = item.designation
            if item.department:
                profile.department = item.department
            if item.location:
                profile.branch_location = item.location
            if mgr_val:
                profile.reporting_supervisor = mgr_val
            if item.employment_type:
                profile.employment_type = item.employment_type

            # Also update User table role if exists
            user_rec = db.query(User).filter(User.empcode.ilike(clean_code)).first()
            if user_rec:
                user_rec.role = norm_role
                user_rec.email = clean_email

            updated_count += 1
        else:
            # CREATE new employee
            new_prof = Profile(
                emp_code=clean_code,
                first_name=first_n or clean_code,
                last_name=last_n,
                email=clean_email,
                mobile_no=item.mobile_no or "+91 99999 99999",
                role=norm_role,
                designation=item.designation or "Employee",
                department=item.department or "General",
                branch_location=item.location or "Mumbai, IN",
                reporting_supervisor=mgr_val or None,
                employment_type=item.employment_type or "Full-time",
                password_hash=default_hash,
                must_change_password=False
            )
            db.add(new_prof)

            # Create User record for auth login
            user_rec = db.query(User).filter(User.empcode.ilike(clean_code)).first()
            if not user_rec:
                new_user = User(
                    username=clean_code,
                    email=clean_email,
                    role=norm_role,
                    empcode=clean_code,
                    is_active=True
                )
                db.add(new_user)

            created_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit error during import: {str(e)}")

    return {
        "status": "success",
        "message": f"Import completed successfully. Created {created_count}, Updated {updated_count}.",
        "total_processed": len(items),
        "created": created_count,
        "updated": updated_count,
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped": len(errors),
        "errors": errors
    }
