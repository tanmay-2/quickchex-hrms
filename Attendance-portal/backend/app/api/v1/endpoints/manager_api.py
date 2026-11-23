# ==============================================================================
# QUICKCHEX HRMS BACKEND - MANAGER_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/manager_api.py
# Purpose: FastAPI route controller handling 'manager_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/dashboard') -> manager_dashboard()
#   • router.get('/team') -> get_manager_team()
#   • router.get('/attendance') -> get_manager_team_attendance()
#   • router.get('/punches') -> get_manager_team_punches()
#   • router.get('/attendance/matrix') -> get_manager_attendance_matrix()
#   • router.get('/attendance/logs') -> get_manager_attendance_logs()
#   • router.get('/leaves') -> get_manager_team_leaves()
#   • router.post('/leaves/{leave_id}/approve') -> approve_leave()
#   • ... and 12 more endpoints
# ==============================================================================

# Import APIRouter, Depends, HTTPException, status, Request from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, status, Request
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import date as date_cls, datetime from datetime for module operations
from datetime import date as date_cls, datetime
# Import Optional, List from typing for module operations
from typing import Optional, List
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import require_role from app.core.role_checker for module operations
from app.core.role_checker import require_role
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import LeaveRequest, LeaveBalance from app.models.leave for module operations
from app.models.leave import LeaveRequest, LeaveBalance
# Import Regularization from app.models.regularization for module operations
from app.models.regularization import Regularization

# Set router variable to store router value
router = APIRouter(prefix="/manager", tags=["Manager"])


# Define _get_manager_and_team function to handle  get manager and team
def _get_manager_and_team(db: Session, user: dict):
    # Set sub variable to store sub value
    sub = (user.get("sub") or "").strip()
    # Set emp_code variable to store emp code value
    emp_code = (user.get("emp_code") or "").strip()

    # Find manager profile
    m_prof = None
    # Evaluate condition to control execution branch
    if emp_code:
        # Initiate database query on specified model
        m_prof = db.query(Profile).filter(Profile.emp_code.ilike(emp_code)).first()
    # Check if target condition is false or object is missing
    if not m_prof and sub:
        # Initiate database query on specified model
        m_prof = db.query(Profile).filter(Profile.email.ilike(sub)).first()

    # Initiate database query on specified model
    all_profiles = db.query(Profile).all()
    # Check if target condition is false or object is missing
    if not m_prof:
        # Return computed result or response payload to caller
        return None, []

    # Set m_code variable to store m code value
    m_code = m_prof.emp_code
    # Set m_email variable to store m email value
    m_email = (m_prof.email or "").lower()
    # Set m_full_name variable to store m full name value
    m_full_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip().lower()
    # Set user_role variable to store user role value
    user_role = str(user.get("role", m_prof.role or "")).lower()

    # Admins see all other profiles in the system as their team
    if "admin" in user_role:
        # Set team variable to store team value
        team = [p for p in all_profiles if p.emp_code != m_code]
        # Return computed result or response payload to caller
        return m_prof, team

    # Find direct team reportees by emp_code, id, email, or name
    team = []
    # Iterate through items in sequence loop
    for p in all_profiles:
        # Evaluate condition to control execution branch
        if p.emp_code == m_code:
            # Skip to next iteration of active loop
            continue
        # Set sup variable to store sup value
        sup = (p.reporting_supervisor or "").strip().lower()
        # Evaluate condition to control execution branch
        if sup:
            # Evaluate condition to control execution branch
            if (sup == m_code.lower()
                    # Execute statement to process data and maintain state
                    or sup == str(m_prof.id).lower()
                    # Invoke or to perform operational action
                    or (m_email and sup == m_email)
                    # Invoke or to perform operational action
                    or (m_full_name and sup == m_full_name)):
                # Invoke team.append to perform operational action
                team.append(p)

    # Return computed result or response payload to caller
    return m_prof, team


# Define _format_location function to handle  format location
def _format_location(p: Profile) -> str:
    # Set loc variable to store loc value
    loc = (p.branch_location or p.city or p.state or "Mumbai, IN").strip()
    # Check if target condition is false or object is missing
    if not loc or loc == "—":
        # Return computed result or response payload to caller
        return "Mumbai, IN"
    # Return computed result or response payload to caller
    return loc


# Define HTTP GET route endpoint handler
@router.get("/dashboard")
# Define manager_dashboard function to handle manager dashboard
def manager_dashboard(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, team = _get_manager_and_team(db, user)
    # Check if target condition is false or object is missing
    if not m_prof:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Manager profile not found")

    # Set today variable to store today value
    today = date_cls.today()
    # Set team_codes variable to store team codes value
    team_codes = [p.emp_code for p in team]

    # Team Overview & Punches
    from app.api.v1.endpoints.admin_api import _get_attendance_status_for_date
    # Set team_overview variable to store team overview value
    team_overview = []
    # Set team_att_map variable to store team att map value
    team_att_map = {}
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
        # Set att variable to store att value
        att = _get_attendance_status_for_date(db, member.emp_code, today)
        # Execute statement to process data and maintain state
        team_att_map[member.emp_code] = att
        # Set st variable to store st value
        st = att.get("status", "Absent")
        # Evaluate condition to control execution branch
        if st in ["Present", "Pushed In", "In Progress", "Punched In"]:
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

        # Set mem_name variable to store mem name value
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        # Execute statement to process data and maintain state
        team_overview.append({
            # Execute statement to process data and maintain state
            "id": member.id,
            # Execute statement to process data and maintain state
            "emp_code": member.emp_code,
            # Execute statement to process data and maintain state
            "name": mem_name,
            # Execute statement to process data and maintain state
            "location": _format_location(member),
            # Execute statement to process data and maintain state
            "department": member.department or "Operations",
            # Execute statement to process data and maintain state
            "designation": member.designation or "Employee",
            # Execute statement to process data and maintain state
            "status": st,
            # Execute statement to process data and maintain state
            "check_in": att.get("punch_in") or "—",
            # Execute statement to process data and maintain state
            "check_out": att.get("punch_out") or "—",
            # Execute statement to process data and maintain state
            "working_hours": att.get("working_hours") or "00:00"
        # Execute statement to process data and maintain state
        })

    # Pending Counts
    pending_leaves = db.query(LeaveRequest).filter(
        # Invoke LeaveRequest.emp_code.in_ to perform operational action
        LeaveRequest.emp_code.in_(team_codes),
        # Invoke LeaveRequest.status.ilike to perform operational action
        LeaveRequest.status.ilike("pending")
    # Execute statement to process data and maintain state
    ).count() if team_codes else 0

    # Import get_manager_regularizations from app.services.regularization_service for module operations
    from app.services.regularization_service import get_manager_regularizations
    # Begin guarded execution block to trap exceptions
    try:
        # Set mgr_regs variable to store mgr regs value
        mgr_regs = get_manager_regularizations(db, m_prof.emp_code, team_codes)
        # Set pending_regs variable to store pending regs value
        pending_regs = len([r for r in mgr_regs if "PENDING" in (r.get("status") or "").upper()])
    # Catch and handle specific exception if raised
    except Exception:
        # Set pending_regs variable to store pending regs value
        pending_regs = 0

    # Recent Activity (reusing cached attendance status map)
    recent_activity = []
    # Iterate through items in sequence loop
    for member in team:
        # Set mem_name variable to store mem name value
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        # Set loc variable to store loc value
        loc = _format_location(member)
        # Set att variable to store att value
        att = team_att_map.get(member.emp_code) or {}
        # Evaluate condition to control execution branch
        if att.get("punch_in") and att.get("punch_in") != "—":
            # Execute statement to process data and maintain state
            recent_activity.append({
                # Execute statement to process data and maintain state
                "type": "punch_in",
                # Execute statement to process data and maintain state
                "employee": mem_name,
                # Execute statement to process data and maintain state
                "location": loc,
                # Execute statement to process data and maintain state
                "details": f"Punched in at {att['punch_in']}",
                # Execute statement to process data and maintain state
                "timestamp": att["punch_in"]
            # Execute statement to process data and maintain state
            })
        # Evaluate condition to control execution branch
        if att.get("punch_out") and att.get("punch_out") != "—":
            # Execute statement to process data and maintain state
            recent_activity.append({
                # Execute statement to process data and maintain state
                "type": "punch_out",
                # Execute statement to process data and maintain state
                "employee": mem_name,
                # Execute statement to process data and maintain state
                "location": loc,
                # Execute statement to process data and maintain state
                "details": f"Punched out at {att['punch_out']}",
                # Execute statement to process data and maintain state
                "timestamp": att["punch_out"]
            # Execute statement to process data and maintain state
            })

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "message": f"Welcome {m_prof.first_name or 'Manager'}",
        # Execute statement to process data and maintain state
        "manager": {
            # Execute statement to process data and maintain state
            "id": m_prof.id,
            # Execute statement to process data and maintain state
            "emp_code": m_prof.emp_code,
            # Execute statement to process data and maintain state
            "name": f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip(),
            # Execute statement to process data and maintain state
            "email": m_prof.email,
            # Execute statement to process data and maintain state
            "contact": m_prof.mobile_no or "—",
            # Execute statement to process data and maintain state
            "location": _format_location(m_prof),
            # Execute statement to process data and maintain state
            "department": m_prof.department or "Operations",
            # Execute statement to process data and maintain state
            "designation": m_prof.designation or "Manager",
            # Execute statement to process data and maintain state
            "role": m_prof.role
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "team_size": len(team),
        # Execute statement to process data and maintain state
        "present_today": present_cnt,
        # Execute statement to process data and maintain state
        "absent_today": absent_cnt,
        # Execute statement to process data and maintain state
        "on_leave_today": leave_cnt,
        # Execute statement to process data and maintain state
        "halfday_today": half_cnt,
        # Execute statement to process data and maintain state
        "pending_leave": pending_leaves,
        # Execute statement to process data and maintain state
        "pending_regularization": pending_regs,
        # Execute statement to process data and maintain state
        "pending_compoff": 0,
        # Execute statement to process data and maintain state
        "team_overview": team_overview,
        # Execute statement to process data and maintain state
        "recent_activity": recent_activity
    # Execute statement to process data and maintain state
    }


# Define HTTP GET route endpoint handler
@router.get("/team")
# Define get_manager_team function to handle get manager team
def get_manager_team(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, team = _get_manager_and_team(db, user)
    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for m in team:
        # Set mem_name variable to store mem name value
        mem_name = f"{m.first_name or ''} {m.last_name or ''}".strip() or m.emp_code
        # Execute statement to process data and maintain state
        results.append({
            # Execute statement to process data and maintain state
            "id": m.id,
            # Execute statement to process data and maintain state
            "emp_code": m.emp_code,
            # Execute statement to process data and maintain state
            "name": mem_name,
            # Execute statement to process data and maintain state
            "first_name": m.first_name or "",
            # Execute statement to process data and maintain state
            "last_name": m.last_name or "",
            # Execute statement to process data and maintain state
            "email": m.email or "",
            # Execute statement to process data and maintain state
            "contact": m.mobile_no or "—",
            # Execute statement to process data and maintain state
            "phone": m.mobile_no or "—",
            # Execute statement to process data and maintain state
            "location": _format_location(m),
            # Execute statement to process data and maintain state
            "department": m.department or "Operations",
            # Execute statement to process data and maintain state
            "designation": m.designation or "Employee",
            # Execute statement to process data and maintain state
            "role": m.role or "employee",
            # Execute statement to process data and maintain state
            "status": m.employment_status or "Active",
            # Execute statement to process data and maintain state
            "joining_date": str(m.emp_join_date) if m.emp_join_date else "2024-01-01",
            # Execute statement to process data and maintain state
            "employment_type": m.employment_type or "Full-time",
            # Execute statement to process data and maintain state
            "reporting_supervisor": m.reporting_supervisor or m_prof.emp_code if m_prof else "—",
            # Execute statement to process data and maintain state
            "manager": f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() if m_prof else "Payal"
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return results


# Define HTTP GET route endpoint handler
@router.get("/attendance")
# Define get_manager_team_attendance function to handle get manager team attendance
def get_manager_team_attendance(
    # Define date_str schema field with type Optional[str] and default value
    date_str: Optional[str] = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, team = _get_manager_and_team(db, user)
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

    # Import _get_attendance_status_for_date from app.api.v1.endpoints.admin_api for module operations
    from app.api.v1.endpoints.admin_api import _get_attendance_status_for_date
    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for member in team:
        # Set att variable to store att value
        att = _get_attendance_status_for_date(db, member.emp_code, target_date)
        # Set mem_name variable to store mem name value
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        # Set loc variable to store loc value
        loc = att.get("punch_in_location") or att.get("location") or _format_location(member)
        # Execute statement to process data and maintain state
        results.append({
            # Execute statement to process data and maintain state
            "id": member.id,
            # Execute statement to process data and maintain state
            "emp_code": member.emp_code,
            # Execute statement to process data and maintain state
            "employee_code": member.emp_code,
            # Execute statement to process data and maintain state
            "employee": mem_name,
            # Execute statement to process data and maintain state
            "name": mem_name,
            # Execute statement to process data and maintain state
            "designation": member.designation or "Employee",
            # Execute statement to process data and maintain state
            "contact": member.mobile_no or "—",
            # Execute statement to process data and maintain state
            "email": member.email or "—",
            # Execute statement to process data and maintain state
            "department": member.department or "Operations",
            # Execute statement to process data and maintain state
            "location": loc,
            # Execute statement to process data and maintain state
            "punch_in_location": att.get("punch_in_location") or loc,
            # Execute statement to process data and maintain state
            "punch_out_location": att.get("punch_out_location"),
            # Execute statement to process data and maintain state
            "punch_in_latitude": att.get("punch_in_latitude"),
            # Execute statement to process data and maintain state
            "punch_in_longitude": att.get("punch_in_longitude"),
            # Execute statement to process data and maintain state
            "punch_in_accuracy": att.get("punch_in_accuracy"),
            # Execute statement to process data and maintain state
            "punch_out_latitude": att.get("punch_out_latitude"),
            # Execute statement to process data and maintain state
            "punch_out_longitude": att.get("punch_out_longitude"),
            # Execute statement to process data and maintain state
            "punch_out_accuracy": att.get("punch_out_accuracy"),
            # Execute statement to process data and maintain state
            "punch_in_image": att.get("punch_in_image"),
            # Execute statement to process data and maintain state
            "punch_out_image": att.get("punch_out_image"),
            # Execute statement to process data and maintain state
            "date": target_date.strftime("%d %b %Y"),
            # Execute statement to process data and maintain state
            "date_iso": str(target_date),
            # Execute statement to process data and maintain state
            "status": att.get("status", "Absent"),
            # Execute statement to process data and maintain state
            "punch_in": att.get("punch_in") or "—",
            # Execute statement to process data and maintain state
            "punch_out": att.get("punch_out") or "—",
            # Execute statement to process data and maintain state
            "check_in": att.get("punch_in") or "—",
            # Execute statement to process data and maintain state
            "check_out": att.get("punch_out") or "—",
            # Execute statement to process data and maintain state
            "working_hours": att.get("working_hours") or "0h 00m",
            # Execute statement to process data and maintain state
            "hours": att.get("hours", 0.0),
            # Specify parameter value for "leave": att.get("leave_status") if att.get("leave_status") !
            "leave": att.get("leave_status") if att.get("leave_status") != "None" else "—",
            # Execute statement to process data and maintain state
            "leave_status": att.get("leave_status"),
            # Execute statement to process data and maintain state
            "late_by": att.get("late_by") or "—",
            # Execute statement to process data and maintain state
            "early_leaving": "—",
            # Execute statement to process data and maintain state
            "remark": att.get("remark") or ("On Time" if att.get("punch_in") and att.get("punch_in") != "—" else "")
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return results


# Define HTTP GET route endpoint handler
@router.get("/punches")
# Define get_manager_team_punches function to handle get manager team punches
def get_manager_team_punches(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Return computed result or response payload to caller
    return get_manager_team_attendance(date_str=None, db=db, user=user)


# Define HTTP GET route endpoint handler
@router.get("/attendance/matrix")
# Define get_manager_attendance_matrix function to handle get manager attendance matrix
def get_manager_attendance_matrix(
    # Define month schema field with type int and default value
    month: int = None,
    # Define year schema field with type int and default value
    year: int = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    """
    Returns a monthly attendance matrix for the manager's team using efficient batch queries.
    Replaces 6,000+ serial SQL queries with 3 fast batch queries (<50ms).
    """
    from datetime import date as date_cls, timedelta
    # Import text, bindparam from sqlalchemy for module operations
    from sqlalchemy import text, bindparam
    # Import module calendar for system functionality
    import calendar
    # Import  from app.services.attendance_service for module operations
    from app.services.attendance_service import (
        # Execute statement to process data and maintain state
        calculate_attendance_status,
        # Execute statement to process data and maintain state
        safe_parse_datetime,
        # Execute statement to process data and maintain state
        safe_calc_hours,
        # Execute statement to process data and maintain state
        repair_utc_punch_out
    # Execute statement to process data and maintain state
    )

    # Set today variable to store today value
    today = date_cls.today()
    # Set m variable to store m value
    m = int(month) if month else today.month
    # Set y variable to store y value
    y = int(year) if year else today.year

    # Execute statement to process data and maintain state
    m_prof, team = _get_manager_and_team(db, user)
    # Check if target condition is false or object is missing
    if not team:
        # Return computed result or response payload to caller
        return {"month": m, "year": y, "days_in_month": calendar.monthrange(y, m)[1], "team": []}

    # Set days_in_month variable to store days in month value
    days_in_month = calendar.monthrange(y, m)[1]
    # Set month_start variable to store month start value
    month_start = date_cls(y, m, 1)
    # Set month_end variable to store month end value
    month_end = date_cls(y, m, days_in_month)

    # Set team_codes variable to store team codes value
    team_codes = [p.emp_code for p in team if p.emp_code]

    # 1. Batch fetch organization calendar for the month (1 query)
    cal_map = {}
    # Begin guarded execution block to trap exceptions
    try:
        # Set cal_rows variable to store cal rows value
        cal_rows = db.execute(
            # Invoke text to perform operational action
            text("SELECT date, status, holiday_name FROM organization_calendar WHERE date BETWEEN :start AND :end"),
            # Execute statement to process data and maintain state
            {"start": month_start, "end": month_end}
        # Execute statement to process data and maintain state
        ).mappings().all()
        # Iterate through items in sequence loop
        for cr in cal_rows:
            # Set d_val variable to store d val value
            d_val = cr["date"]
            # Evaluate condition to control execution branch
            if hasattr(d_val, "strftime"):
                # Execute statement to process data and maintain state
                cal_map[str(d_val)] = cr
            # Execute fallback branch when conditions are not met
            else:
                # Execute statement to process data and maintain state
                cal_map[str(d_val)[:10]] = cr
    # Catch and handle specific exception if raised
    except Exception:
        # Roll back transaction to revert changes on failure
        db.rollback()

    # 2. Batch fetch approved leaves for the whole team in this month (1 query)
    leave_map = {}
    # Begin guarded execution block to trap exceptions
    try:
        # Import LeaveRequest from app.models.leave for module operations
        from app.models.leave import LeaveRequest
        # Initiate database query on specified model
        leaves = db.query(LeaveRequest).filter(
            # Invoke LeaveRequest.emp_code.in_ to perform operational action
            LeaveRequest.emp_code.in_(team_codes),
            # Invoke LeaveRequest.status.ilike to perform operational action
            LeaveRequest.status.ilike("Approved"),
            # Specify parameter value for LeaveRequest.start_date <
            LeaveRequest.start_date <= month_end,
            # Execute statement to process data and maintain state
            LeaveRequest.end_date >= month_start
        # Execute statement to process data and maintain state
        ).all()
        # Iterate through items in sequence loop
        for lv in leaves:
            # Set s_d variable to store s d value
            s_d = max(lv.start_date, month_start)
            # Set e_d variable to store e d value
            e_d = min(lv.end_date, month_end)
            # Set cur variable to store cur value
            cur = s_d
            # Execute loop while boolean condition remains true
            while cur <= e_d:
                # Execute statement to process data and maintain state
                leave_map[(lv.emp_code.strip().lower(), str(cur))] = lv.leave_type or "Leave"
                # Set cur variable to store cur value
                cur = cur + timedelta(days=1)
    # Catch and handle specific exception if raised
    except Exception:
        # Roll back transaction to revert changes on failure
        db.rollback()

    # 3. Batch fetch all attendance punch records for the month table (1 query)
    table_name = f"attendance_{y}_{m:02d}"
    # Set punch_map variable to store punch map value
    punch_map = {}
    # Begin guarded execution block to trap exceptions
    try:
        # Set punch_rows variable to store punch rows value
        punch_rows = db.execute(text(f"""
            SELECT emp_code, date, punch_in_time, punch_out_time, hours_completed, status, remark
            FROM {table_name}
            WHERE emp_code IN :codes
        """).bindparams(bindparam("codes", expanding=True)), {"codes": team_codes}).mappings().all()
        # Iterate through items in sequence loop
        for pr in punch_rows:
            # Set e_c variable to store e c value
            e_c = (pr["emp_code"] or "").strip().lower()
            # Set d_s variable to store d s value
            d_s = str(pr["date"])[:10]
            # Execute statement to process data and maintain state
            punch_map[(e_c, d_s)] = pr
    # Catch and handle specific exception if raised
    except Exception:
        # Roll back transaction to revert changes on failure
        db.rollback()

    # Set result variable to store result value
    result = []
    # Set now variable to store now value
    now = datetime.now()

    # Iterate through items in sequence loop
    for member in team:
        # Set mem_code variable to store mem code value
        mem_code = (member.emp_code or "").strip()
        # Set mem_code_l variable to store mem code l value
        mem_code_l = mem_code.lower()
        # Set mem_name variable to store mem name value
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or mem_code
        # Set days_data variable to store days data value
        days_data = []

        # Iterate through items in sequence loop
        for day_num in range(1, days_in_month + 1):
            # Set target variable to store target value
            target = date_cls(y, m, day_num)
            # Set target_str variable to store target str value
            target_str = str(target)
            # Set is_past_or_today variable to store is past or today value
            is_past_or_today = target <= today

            # Check calendar
            cal_info = cal_map.get(target_str)
            # Set is_holiday variable to store is holiday value
            is_holiday = False
            # Set is_weekly_off variable to store is weekly off value
            is_weekly_off = False
            # Set holiday_name variable to store holiday name value
            holiday_name = None

            # Evaluate condition to control execution branch
            if cal_info:
                # Set cal_st variable to store cal st value
                cal_st = (cal_info.get("status") or "").strip().upper()
                # Set h_name variable to store h name value
                h_name = (cal_info.get("holiday_name") or "").strip()
                # Evaluate condition to control execution branch
                if "WEEK" in cal_st or cal_st in ("WEEKLY_OFF", "WO", "OFF"):
                    # Set is_weekly_off variable to store is weekly off value
                    is_weekly_off = True
                # Evaluate alternate branch condition
                elif cal_st == "HOLIDAY" or h_name or (cal_st and cal_st not in ("WORKING_DAY", "WORKING", "WORK")):
                    # Set is_holiday variable to store is holiday value
                    is_holiday = True
                    # Set holiday_name variable to store holiday name value
                    holiday_name = h_name or "Holiday"
            # Evaluate alternate branch condition
            elif is_past_or_today and target.weekday() == 6:
                # Set is_weekly_off variable to store is weekly off value
                is_weekly_off = True

            # Check leave
            leave_type = leave_map.get((mem_code_l, target_str))

            # Check punch
            rec = punch_map.get((mem_code_l, target_str))
            # Set punch_in variable to store punch in value
            punch_in = rec["punch_in_time"] if rec else None
            # Set punch_out variable to store punch out value
            punch_out = rec["punch_out_time"] if rec else None
            # Set h_val variable to store h val value
            h_val = float(rec["hours_completed"] or 0) if rec else 0.0

            # Evaluate condition to control execution branch
            if punch_in and punch_out:
                # Set in_dt variable to store in dt value
                in_dt = safe_parse_datetime(punch_in)
                # Set out_dt variable to store out dt value
                out_dt = repair_utc_punch_out(in_dt, punch_out, target)
                # Set expected_h variable to store expected h value
                expected_h = safe_calc_hours(in_dt, out_dt, target, now=now)
                # Evaluate condition to control execution branch
                if h_val == 0 or abs(expected_h - h_val) > 1.0:
                    # Set h_val variable to store h val value
                    h_val = expected_h

            # Set status_info variable to store status info value
            status_info = calculate_attendance_status(
                # Set punch_in_time variable to store punch in time value
                punch_in_time=punch_in,
                # Set punch_out_time variable to store punch out time value
                punch_out_time=punch_out,
                # Set hours_completed variable to store hours completed value
                hours_completed=h_val,
                # Set target_date variable to store target date value
                target_date=target,
                # Set is_holiday variable to store is holiday value
                is_holiday=is_holiday,
                # Set is_weekly_off variable to store is weekly off value
                is_weekly_off=is_weekly_off,
                # Set holiday_name variable to store holiday name value
                holiday_name=holiday_name,
                # Set is_leave variable to store is leave value
                is_leave=bool(leave_type),
                # Set leave_category variable to store leave category value
                leave_category=leave_type
            # Execute statement to process data and maintain state
            )

            # Set raw_status variable to store raw status value
            raw_status = status_info.get("status", "Absent" if is_past_or_today else "—")
            # Set badge variable to store badge value
            badge = status_info.get("badge_code") or status_info.get("badge") or ("A" if is_past_or_today else "—")

            # Execute statement to process data and maintain state
            days_data.append({
                # Execute statement to process data and maintain state
                "day": day_num,
                # Execute statement to process data and maintain state
                "date": target_str,
                # Execute statement to process data and maintain state
                "status": raw_status,
                # Execute statement to process data and maintain state
                "badge": badge,
                # Execute statement to process data and maintain state
                "check_in": punch_in if (punch_in and str(punch_in).strip() not in ("—", "None", "")) else None,
                # Execute statement to process data and maintain state
                "check_out": punch_out if (punch_out and str(punch_out).strip() not in ("—", "None", "")) else None,
                # Execute statement to process data and maintain state
                "working_hours": f"{h_val:.1f} hrs" if h_val > 0 else None,
            # Execute statement to process data and maintain state
            })

        # Compute summary counts
        present_count = sum(1 for d in days_data if d["badge"] in ("P", "IP"))
        # Set half_day_count variable to store half day count value
        half_day_count = sum(1 for d in days_data if d["badge"] == "HD2")
        # Set absent_count variable to store absent count value
        absent_count = sum(1 for d in days_data if d["badge"] == "A")
        # Set leave_count variable to store leave count value
        leave_count = sum(1 for d in days_data if d["badge"] == "LV")

        # Execute statement to process data and maintain state
        result.append({
            # Execute statement to process data and maintain state
            "emp_code": mem_code,
            # Execute statement to process data and maintain state
            "name": mem_name,
            # Execute statement to process data and maintain state
            "department": member.department or "Operations",
            # Execute statement to process data and maintain state
            "designation": member.designation or "Employee",
            # Execute statement to process data and maintain state
            "days": days_data,
            # Execute statement to process data and maintain state
            "present": present_count,
            # Execute statement to process data and maintain state
            "half_day": half_day_count,
            # Execute statement to process data and maintain state
            "absent": absent_count,
            # Execute statement to process data and maintain state
            "leave": leave_count,
        # Execute statement to process data and maintain state
        })

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "month": m,
        # Execute statement to process data and maintain state
        "year": y,
        # Execute statement to process data and maintain state
        "days_in_month": days_in_month,
        # Execute statement to process data and maintain state
        "team": result,
    # Execute statement to process data and maintain state
    }


# Define HTTP GET route endpoint handler
@router.get("/attendance/logs")
# Define get_manager_attendance_logs function to handle get manager attendance logs
def get_manager_attendance_logs(
    # Define date_str schema field with type Optional[str] and default value
    date_str: Optional[str] = None,
    # Define start_date schema field with type Optional[str] and default value
    start_date: Optional[str] = None,
    # Define end_date schema field with type Optional[str] and default value
    end_date: Optional[str] = None,
    # Define emp_code schema field with type Optional[str] and default value
    emp_code: Optional[str] = None,
    # Define department schema field with type Optional[str] and default value
    department: Optional[str] = None,
    # Define status schema field with type Optional[str] and default value
    status: Optional[str] = None,
    # Define work_mode schema field with type Optional[str] and default value
    work_mode: Optional[str] = None,
    # Define client_site schema field with type Optional[str] and default value
    client_site: Optional[str] = None,
    # Define search schema field with type Optional[str] and default value
    search: Optional[str] = None,
    # Define page schema field with type int and default value
    page: int = 1,
    # Define page_size schema field with type int and default value
    page_size: int = 10,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):

    """
    Returns dynamic attendance logs for manager portal with filtering by date/range,
    employee, department, status, text search, and pagination.
    """
    from app.api.v1.endpoints.admin_api import _get_attendance_status_for_date
    # Import text from sqlalchemy for module operations
    from sqlalchemy import text
    # Import timedelta from datetime for module operations
    from datetime import timedelta

    # Execute statement to process data and maintain state
    m_prof, team = _get_manager_and_team(db, user)

    # If the user is admin or manager has no specific team assigned, fallback to all profiles
    user_role = str(user.get("role", "")).lower()
    # Check if target condition is false or object is missing
    if user_role == "admin" and (not team or len(team) == 0):
        # Initiate database query on specified model
        team = db.query(Profile).filter(Profile.emp_code != None).all()
    # Evaluate alternate branch condition
    elif not team:
        # Initiate database query on specified model
        team = db.query(Profile).filter(Profile.emp_code != None).all()

    # Filterable team lists and departments
    team_map = {p.emp_code: p for p in team if p.emp_code}
    # Set all_departments variable to store all departments value
    all_departments = sorted(list({p.department for p in team if p.department and p.department.strip()}))
    # Set team_members_list variable to store team members list value
    team_members_list = [
        # Execute statement to process data and maintain state
        {
            # Execute statement to process data and maintain state
            "emp_code": p.emp_code,
            # Execute statement to process data and maintain state
            "name": f"{p.first_name or ''} {p.last_name or ''}".strip() or p.emp_code,
            # Execute statement to process data and maintain state
            "department": p.department or "Operations"
        # Execute statement to process data and maintain state
        }
        # Iterate through items in sequence loop
        for p in team if p.emp_code
    # Execute statement to process data and maintain state
    ]

    # Set today variable to store today value
    today = date_cls.today()
    # Set parsed_start variable to store parsed start value
    parsed_start = None
    # Set parsed_end variable to store parsed end value
    parsed_end = None

    # Evaluate condition to control execution branch
    if date_str:
        # Begin guarded execution block to trap exceptions
        try:
            # Set parsed_start variable to store parsed start value
            parsed_start = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
            # Set parsed_end variable to store parsed end value
            parsed_end = parsed_start
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Check if target condition is false or object is missing
    if not parsed_start and start_date:
        # Begin guarded execution block to trap exceptions
        try:
            # Set parsed_start variable to store parsed start value
            parsed_start = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Check if target condition is false or object is missing
    if not parsed_end and end_date:
        # Begin guarded execution block to trap exceptions
        try:
            # Set parsed_end variable to store parsed end value
            parsed_end = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Default to today if no dates supplied
    if not parsed_start:
        # Set parsed_start variable to store parsed start value
        parsed_start = today
    # Check if target condition is false or object is missing
    if not parsed_end:
        # Set parsed_end variable to store parsed end value
        parsed_end = parsed_start

    # Ensure start <= end
    if parsed_start > parsed_end:
        # Execute statement to process data and maintain state
        parsed_start, parsed_end = parsed_end, parsed_start

    # Limit range to max 31 days for safety and performance
    if (parsed_end - parsed_start).days > 31:
        # Set parsed_start variable to store parsed start value
        parsed_start = parsed_end - timedelta(days=31)

    # Filter candidate team members by emp_code, department, and search text
    target_members = team
    # Evaluate condition to control execution branch
    if emp_code and emp_code != "all":
        # Set target_members variable to store target members value
        target_members = [m for m in target_members if str(m.emp_code).lower() == str(emp_code).strip().lower()]
    # Evaluate condition to control execution branch
    if department and department != "all":
        # Set target_members variable to store target members value
        target_members = [m for m in target_members if (m.department or "").lower() == str(department).strip().lower()]
    # Evaluate condition to control execution branch
    if search and search.strip():
        # Set q variable to store q value
        q = search.strip().lower()
        # Set target_members variable to store target members value
        target_members = [
            # Execute statement to process data and maintain state
            m for m in target_members
            # Evaluate condition to control execution branch
            if q in (m.emp_code or "").lower() or
               # Execute statement to process data and maintain state
               q in f"{m.first_name or ''} {m.last_name or ''}".lower() or
               # Execute statement to process data and maintain state
               q in (m.department or "").lower()
        # Execute statement to process data and maintain state
        ]

    # Set candidate_codes variable to store candidate codes value
    candidate_codes = [m.emp_code for m in target_members if m.emp_code]

    # Set all_logs variable to store all logs value
    all_logs = []

    # Evaluate condition to control execution branch
    if parsed_start == parsed_end:
        # Single Date Mode: Return complete attendance roster for this date across team
        target_date = parsed_start
        # Iterate through items in sequence loop
        for member in target_members:
            # Set att variable to store att value
            att = _get_attendance_status_for_date(db, member.emp_code, target_date)
            # Set mem_name variable to store mem name value
            mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code

            # Set st variable to store st value
            st = att.get("status", "Absent")
            # Set remark variable to store remark value
            remark = att.get("remark") or ""
            # Set check_in variable to store check in value
            check_in = att.get("punch_in") or att.get("checkIn") or "—"
            # Set check_out variable to store check out value
            check_out = att.get("punch_out") or att.get("checkOut") or "—"
            # Set working_hours variable to store working hours value
            working_hours = att.get("working_hours") or att.get("workingHours") or "0h 00m"
            # Set late_by variable to store late by value
            late_by = att.get("late_by") or "—"

            # Set is_late variable to store is late value
            is_late = False
            # Evaluate condition to control execution branch
            if "late" in st.lower() or "late" in remark.lower() or (late_by != "—" and late_by != "0m"):
                # Set is_late variable to store is late value
                is_late = True

            # Set loc variable to store loc value
            loc = att.get("punch_in_location") or att.get("location") or _format_location(member)
            # Execute statement to process data and maintain state
            all_logs.append({
                # Execute statement to process data and maintain state
                "id": f"log-{member.emp_code}-{target_date}",
                # Execute statement to process data and maintain state
                "emp_code": member.emp_code,
                # Execute statement to process data and maintain state
                "employee_name": mem_name,
                # Execute statement to process data and maintain state
                "name": mem_name,
                # Execute statement to process data and maintain state
                "email": member.email or "—",
                # Execute statement to process data and maintain state
                "contact": member.mobile_no or "—",
                # Execute statement to process data and maintain state
                "department": member.department or "Operations",
                # Execute statement to process data and maintain state
                "designation": member.designation or "Employee",
                # Execute statement to process data and maintain state
                "location": loc,
                # Execute statement to process data and maintain state
                "punch_in_location": att.get("punch_in_location") or loc,
                # Execute statement to process data and maintain state
                "punch_out_location": att.get("punch_out_location"),
                # Execute statement to process data and maintain state
                "punch_in_latitude": att.get("punch_in_latitude"),
                # Execute statement to process data and maintain state
                "punch_in_longitude": att.get("punch_in_longitude"),
                # Execute statement to process data and maintain state
                "punch_in_accuracy": att.get("punch_in_accuracy"),
                # Execute statement to process data and maintain state
                "punch_out_latitude": att.get("punch_out_latitude"),
                # Execute statement to process data and maintain state
                "punch_out_longitude": att.get("punch_out_longitude"),
                # Execute statement to process data and maintain state
                "punch_out_accuracy": att.get("punch_out_accuracy"),
                # Execute statement to process data and maintain state
                "punch_in_image": att.get("punch_in_image"),
                # Execute statement to process data and maintain state
                "punch_out_image": att.get("punch_out_image"),
                # Execute statement to process data and maintain state
                "date": target_date.strftime("%d %b %Y"),
                # Execute statement to process data and maintain state
                "date_iso": str(target_date),
                # Execute statement to process data and maintain state
                "check_in": check_in,
                # Execute statement to process data and maintain state
                "check_out": check_out,
                # Execute statement to process data and maintain state
                "working_hours": working_hours,
                # Execute statement to process data and maintain state
                "status": st,
                # Execute statement to process data and maintain state
                "late_by": late_by if is_late else "—",
                # Execute statement to process data and maintain state
                "early_leaving": "—",
                # Execute statement to process data and maintain state
                "is_late": is_late,
                # Execute statement to process data and maintain state
                "is_early": False,
                # Specify parameter value for "remark": remark or ("Late Punch" if is_late else ("Present" if check_in !
                "remark": remark or ("Late Punch" if is_late else ("Present" if check_in != "—" else st)),
                # Execute statement to process data and maintain state
                "work_mode": att.get("work_mode", "OFFICE"),
                # Execute statement to process data and maintain state
                "workMode": att.get("work_mode", "OFFICE"),
                # Execute statement to process data and maintain state
                "client_site_id": att.get("client_site_id"),
                # Execute statement to process data and maintain state
                "clientSiteId": att.get("client_site_id"),
                # Execute statement to process data and maintain state
                "client_site_name": att.get("client_site_name"),
                # Execute statement to process data and maintain state
                "clientSiteName": att.get("client_site_name"),
                # Execute statement to process data and maintain state
                "client_site": att.get("client_site_name") or "—",
                # Execute statement to process data and maintain state
                "clientSite": att.get("client_site_name") or "—"
            # Execute statement to process data and maintain state
            })

    # Execute fallback branch when conditions are not met
    else:
        # Date Range Mode
        # If single employee or short range (<= 7 days), compute day-by-day roster so full records appear
        days_diff = (parsed_end - parsed_start).days
        # Evaluate condition to control execution branch
        if (emp_code and emp_code != "all") or days_diff <= 7:
            # Set cur_date variable to store cur date value
            cur_date = parsed_end
            # Execute loop while boolean condition remains true
            while cur_date >= parsed_start:
                # Iterate through items in sequence loop
                for member in target_members:
                    # Set att variable to store att value
                    att = _get_attendance_status_for_date(db, member.emp_code, cur_date)
                    # Set mem_name variable to store mem name value
                    mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code

                    # Set st variable to store st value
                    st = att.get("status", "Absent")
                    # Set remark variable to store remark value
                    remark = att.get("remark") or ""
                    # Set check_in variable to store check in value
                    check_in = att.get("punch_in") or att.get("checkIn") or "—"
                    # Set check_out variable to store check out value
                    check_out = att.get("punch_out") or att.get("checkOut") or "—"
                    # Set working_hours variable to store working hours value
                    working_hours = att.get("working_hours") or att.get("workingHours") or "0h 00m"
                    # Set late_by variable to store late by value
                    late_by = att.get("late_by") or "—"

                    # Set is_late variable to store is late value
                    is_late = False
                    # Evaluate condition to control execution branch
                    if "late" in st.lower() or "late" in remark.lower() or (late_by != "—" and late_by != "0m"):
                        # Set is_late variable to store is late value
                        is_late = True

                    # Set loc_cur variable to store loc cur value
                    loc_cur = att.get("punch_in_location") or att.get("location") or _format_location(member)
                    # Execute statement to process data and maintain state
                    all_logs.append({
                        # Execute statement to process data and maintain state
                        "id": f"log-{member.emp_code}-{cur_date}",
                        # Execute statement to process data and maintain state
                        "emp_code": member.emp_code,
                        # Execute statement to process data and maintain state
                        "employee_name": mem_name,
                        # Execute statement to process data and maintain state
                        "name": mem_name,
                        # Execute statement to process data and maintain state
                        "email": member.email or "—",
                        # Execute statement to process data and maintain state
                        "contact": member.mobile_no or "—",
                        # Execute statement to process data and maintain state
                        "department": member.department or "Operations",
                        # Execute statement to process data and maintain state
                        "designation": member.designation or "Employee",
                        # Execute statement to process data and maintain state
                        "location": loc_cur,
                        # Execute statement to process data and maintain state
                        "punch_in_location": att.get("punch_in_location") or loc_cur,
                        # Execute statement to process data and maintain state
                        "punch_out_location": att.get("punch_out_location"),
                        # Execute statement to process data and maintain state
                        "punch_in_latitude": att.get("punch_in_latitude"),
                        # Execute statement to process data and maintain state
                        "punch_in_longitude": att.get("punch_in_longitude"),
                        # Execute statement to process data and maintain state
                        "punch_in_accuracy": att.get("punch_in_accuracy"),
                        # Execute statement to process data and maintain state
                        "punch_out_latitude": att.get("punch_out_latitude"),
                        # Execute statement to process data and maintain state
                        "punch_out_longitude": att.get("punch_out_longitude"),
                        # Execute statement to process data and maintain state
                        "punch_out_accuracy": att.get("punch_out_accuracy"),
                        # Execute statement to process data and maintain state
                        "punch_in_image": att.get("punch_in_image"),
                        # Execute statement to process data and maintain state
                        "punch_out_image": att.get("punch_out_image"),
                        # Execute statement to process data and maintain state
                        "date": cur_date.strftime("%d %b %Y"),
                        # Execute statement to process data and maintain state
                        "date_iso": str(cur_date),
                        # Execute statement to process data and maintain state
                        "check_in": check_in,
                        # Execute statement to process data and maintain state
                        "check_out": check_out,
                        # Execute statement to process data and maintain state
                        "working_hours": working_hours,
                        # Execute statement to process data and maintain state
                        "status": st,
                        # Execute statement to process data and maintain state
                        "late_by": late_by if is_late else "—",
                        # Execute statement to process data and maintain state
                        "early_leaving": "—",
                        # Execute statement to process data and maintain state
                        "is_late": is_late,
                        # Execute statement to process data and maintain state
                        "is_early": False,
                        # Specify parameter value for "remark": remark or ("Late Punch" if is_late else ("Present" if check_in !
                        "remark": remark or ("Late Punch" if is_late else ("Present" if check_in != "—" else st)),
                        # Execute statement to process data and maintain state
                        "work_mode": att.get("work_mode", "OFFICE"),
                        # Execute statement to process data and maintain state
                        "workMode": att.get("work_mode", "OFFICE"),
                        # Execute statement to process data and maintain state
                        "client_site_id": att.get("client_site_id"),
                        # Execute statement to process data and maintain state
                        "clientSiteId": att.get("client_site_id"),
                        # Execute statement to process data and maintain state
                        "client_site_name": att.get("client_site_name"),
                        # Execute statement to process data and maintain state
                        "clientSiteName": att.get("client_site_name"),
                        # Execute statement to process data and maintain state
                        "client_site": att.get("client_site_name") or "—",
                        # Execute statement to process data and maintain state
                        "clientSite": att.get("client_site_name") or "—"
                    # Execute statement to process data and maintain state
                    })
                # Execute statement to process data and maintain state
                cur_date -= timedelta(days=1)
        # Execute fallback branch when conditions are not met
        else:
            # Query partitioned monthly tables for punch records and leaves across range
            months_covered = set()
            # Set cur variable to store cur value
            cur = parsed_start
            # Execute loop while boolean condition remains true
            while cur <= parsed_end:
                # Invoke months_covered.add to perform operational action
                months_covered.add((cur.year, cur.month))
                # Execute statement to process data and maintain state
                cur += timedelta(days=1)

            # Set punch_records variable to store punch records value
            punch_records = []
            # Iterate through items in sequence loop
            for yr, mo in months_covered:
                # Set tbl variable to store tbl value
                tbl = f"attendance_{yr}_{mo:02d}"
                # Begin guarded execution block to trap exceptions
                try:
                    # Evaluate condition to control execution branch
                    if candidate_codes:
                        # Set pq variable to store pq value
                        pq = text(f"""
                            SELECT id, emp_code, date, punch_in_time, punch_out_time, punch_in_location, punch_out_location,
                                   punch_in_latitude, punch_in_longitude, punch_in_accuracy,
                                   punch_out_latitude, punch_out_longitude, punch_out_accuracy,
                                   punch_in_image, punch_out_image, hours_completed, status, remark,
                                   work_mode, client_site_id, client_site_name
                            FROM {tbl}
                            WHERE emp_code IN :codes AND date >= :s_date AND date <= :e_date
                            ORDER BY date DESC, punch_in_time DESC
                        """)
                        # Set rows variable to store rows value
                        rows = db.execute(pq, {"codes": tuple(candidate_codes), "s_date": parsed_start, "e_date": parsed_end}).mappings().all()
                        # Invoke punch_records.extend to perform operational action
                        punch_records.extend(rows)
                # Catch and handle specific exception if raised
                except Exception:
                    # Roll back transaction to revert changes on failure
                    db.rollback()

            # Import  from app.services.attendance_service for module operations
            from app.services.attendance_service import (
                # Execute statement to process data and maintain state
                safe_parse_datetime,
                # Execute statement to process data and maintain state
                safe_format_time,
                # Execute statement to process data and maintain state
                safe_format_date,
                # Execute statement to process data and maintain state
                safe_calc_hours
            # Execute statement to process data and maintain state
            )

            # Set seen_punch_keys variable to store seen punch keys value
            seen_punch_keys = set()
            # Iterate through items in sequence loop
            for r in punch_records:
                # Set member variable to store member value
                member = team_map.get(r["emp_code"])
                # Set mem_name variable to store mem name value
                mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() if member else r["emp_code"]
                # Set d_val variable to store d val value
                d_val = r["date"]
                # Invoke seen_punch_keys.add to perform operational action
                seen_punch_keys.add((r["emp_code"], d_val))

                # Import repair_utc_punch_out from app.services.attendance_service for module operations
                from app.services.attendance_service import repair_utc_punch_out
                # Set in_dt variable to store in dt value
                in_dt = safe_parse_datetime(r["punch_in_time"])
                # Set out_dt variable to store out dt value
                out_dt = repair_utc_punch_out(in_dt, r["punch_out_time"], d_val)

                # Set in_t variable to store in t value
                in_t = safe_format_time(in_dt, "—")
                # Set out_t variable to store out t value
                out_t = safe_format_time(out_dt, "—")
                # Set h_val variable to store h val value
                h_val = float(r["hours_completed"] or 0)
                # Evaluate condition to control execution branch
                if in_dt and out_dt:
                    # Set expected_h variable to store expected h value
                    expected_h = safe_calc_hours(in_dt, out_dt, d_val)
                    # Evaluate condition to control execution branch
                    if h_val == 0 or abs(expected_h - h_val) > 1.0:
                        # Set h_val variable to store h val value
                        h_val = expected_h

                # Set h_str variable to store h str value
                h_str = f"{int(h_val)}h {int((h_val % 1) * 60):02d}m" if h_val > 0 else "0h 00m"
                # Set st variable to store st value
                st = r["status"] or ("Present" if in_t != "—" else "Absent")
                # Set remark variable to store remark value
                remark = r["remark"] or ""
                # Set is_late variable to store is late value
                is_late = "late" in st.lower() or "late" in remark.lower()
                # Set loc variable to store loc value
                loc = r["punch_in_location"] or r["punch_out_location"] or (member.branch_location if member and member.branch_location else "GPS / Office")
                # Set wm variable to store wm value
                wm = r.get("work_mode") or "OFFICE"
                # Set cs_id variable to store cs id value
                cs_id = r.get("client_site_id")
                # Set cs_name variable to store cs name value
                cs_name = r.get("client_site_name")

                # Execute statement to process data and maintain state
                all_logs.append({
                    # Execute statement to process data and maintain state
                    "id": f"log-{r['emp_code']}-{d_val}-{r['id']}",
                    # Execute statement to process data and maintain state
                    "emp_code": r["emp_code"],
                    # Execute statement to process data and maintain state
                    "employee_name": mem_name,
                    # Execute statement to process data and maintain state
                    "name": mem_name,
                    # Execute statement to process data and maintain state
                    "email": member.email if member else "—",
                    # Execute statement to process data and maintain state
                    "contact": member.mobile_no if member else "—",
                    # Execute statement to process data and maintain state
                    "department": member.department if member else "Operations",
                    # Execute statement to process data and maintain state
                    "designation": member.designation if member else "Employee",
                    # Execute statement to process data and maintain state
                    "location": loc,
                    # Execute statement to process data and maintain state
                    "punch_in_location": r.get("punch_in_location") or loc,
                    # Execute statement to process data and maintain state
                    "punch_out_location": r.get("punch_out_location"),
                    # Execute statement to process data and maintain state
                    "punch_in_latitude": r.get("punch_in_latitude"),
                    # Execute statement to process data and maintain state
                    "punch_in_longitude": r.get("punch_in_longitude"),
                    # Execute statement to process data and maintain state
                    "punch_in_accuracy": r.get("punch_in_accuracy"),
                    # Execute statement to process data and maintain state
                    "punch_out_latitude": r.get("punch_out_latitude"),
                    # Execute statement to process data and maintain state
                    "punch_out_longitude": r.get("punch_out_longitude"),
                    # Execute statement to process data and maintain state
                    "punch_out_accuracy": r.get("punch_out_accuracy"),
                    # Execute statement to process data and maintain state
                    "punch_in_image": r.get("punch_in_image"),
                    # Execute statement to process data and maintain state
                    "punch_out_image": r.get("punch_out_image"),
                    # Execute statement to process data and maintain state
                    "date": safe_format_date(d_val, "%d %b %Y"),
                    # Execute statement to process data and maintain state
                    "date_iso": str(d_val),
                    # Execute statement to process data and maintain state
                    "check_in": in_t,
                    # Execute statement to process data and maintain state
                    "check_out": out_t,
                    # Execute statement to process data and maintain state
                    "working_hours": h_str,
                    # Execute statement to process data and maintain state
                    "status": st,
                    # Execute statement to process data and maintain state
                    "late_by": "Late Punch" if is_late else "—",
                    # Execute statement to process data and maintain state
                    "early_leaving": "—",
                    # Execute statement to process data and maintain state
                    "is_late": is_late,
                    # Execute statement to process data and maintain state
                    "is_early": False,
                    # Execute statement to process data and maintain state
                    "remark": remark or ("Late" if is_late else st),
                    # Execute statement to process data and maintain state
                    "work_mode": wm,
                    # Execute statement to process data and maintain state
                    "workMode": wm,
                    # Execute statement to process data and maintain state
                    "client_site_id": cs_id,
                    # Execute statement to process data and maintain state
                    "clientSiteId": cs_id,
                    # Execute statement to process data and maintain state
                    "client_site_name": cs_name,
                    # Execute statement to process data and maintain state
                    "clientSiteName": cs_name,
                    # Execute statement to process data and maintain state
                    "client_site": cs_name or "—",
                    # Execute statement to process data and maintain state
                    "clientSite": cs_name or "—"
                # Execute statement to process data and maintain state
                })

            # Also check approved leaves in range
            try:
                # Evaluate condition to control execution branch
                if candidate_codes:
                    # Import LeaveRequest from app.models.leave for module operations
                    from app.models.leave import LeaveRequest
                    # Initiate database query on specified model
                    leaves = db.query(LeaveRequest).filter(
                        # Invoke LeaveRequest.emp_code.in_ to perform operational action
                        LeaveRequest.emp_code.in_(candidate_codes),
                        # Invoke LeaveRequest.status.ilike to perform operational action
                        LeaveRequest.status.ilike("Approved"),
                        # Specify parameter value for LeaveRequest.start_date <
                        LeaveRequest.start_date <= parsed_end,
                        # Execute statement to process data and maintain state
                        LeaveRequest.end_date >= parsed_start
                    # Execute statement to process data and maintain state
                    ).all()
                    # Iterate through items in sequence loop
                    for l in leaves:
                        # Set cur_d variable to store cur d value
                        cur_d = max(l.start_date, parsed_start)
                        # Set end_d variable to store end d value
                        end_d = min(l.end_date, parsed_end)
                        # Execute loop while boolean condition remains true
                        while cur_d <= end_d:
                            # Check if target condition is false or object is missing
                            if (l.emp_code, cur_d) not in seen_punch_keys:
                                # Set member variable to store member value
                                member = team_map.get(l.emp_code)
                                # Set mem_name variable to store mem name value
                                mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() if member else l.emp_code
                                # Execute statement to process data and maintain state
                                all_logs.append({
                                    # Execute statement to process data and maintain state
                                    "id": f"leave-{l.emp_code}-{cur_d}",
                                    # Execute statement to process data and maintain state
                                    "emp_code": l.emp_code,
                                    # Execute statement to process data and maintain state
                                    "employee_name": mem_name,
                                    # Execute statement to process data and maintain state
                                    "name": mem_name,
                                    # Execute statement to process data and maintain state
                                    "email": member.email if member else "—",
                                    # Execute statement to process data and maintain state
                                    "contact": member.mobile_no if member else "—",
                                    # Execute statement to process data and maintain state
                                    "department": member.department if member else "Operations",
                                    # Execute statement to process data and maintain state
                                    "designation": member.designation if member else "Employee",
                                    # Execute statement to process data and maintain state
                                    "location": member.branch_location if member and member.branch_location else "Mumbai, India",
                                    # Execute statement to process data and maintain state
                                    "date": cur_d.strftime("%d %b %Y"),
                                    # Execute statement to process data and maintain state
                                    "date_iso": str(cur_d),
                                    # Execute statement to process data and maintain state
                                    "check_in": "—",
                                    # Execute statement to process data and maintain state
                                    "check_out": "—",
                                    # Execute statement to process data and maintain state
                                    "working_hours": "0h 00m",
                                    # Execute statement to process data and maintain state
                                    "status": f"Leave ({l.category or 'Leave'})",
                                    # Execute statement to process data and maintain state
                                    "late_by": "—",
                                    # Execute statement to process data and maintain state
                                    "early_leaving": "—",
                                    # Execute statement to process data and maintain state
                                    "is_late": False,
                                    # Execute statement to process data and maintain state
                                    "is_early": False,
                                    # Execute statement to process data and maintain state
                                    "remark": l.reason or "Approved Leave",
                                    # Execute statement to process data and maintain state
                                    "work_mode": "—",
                                    # Execute statement to process data and maintain state
                                    "workMode": "—",
                                    # Execute statement to process data and maintain state
                                    "client_site_id": None,
                                    # Execute statement to process data and maintain state
                                    "clientSiteId": None,
                                    # Execute statement to process data and maintain state
                                    "client_site_name": None,
                                    # Execute statement to process data and maintain state
                                    "clientSiteName": None,
                                    # Execute statement to process data and maintain state
                                    "client_site": "—",
                                    # Execute statement to process data and maintain state
                                    "clientSite": "—"
                                # Execute statement to process data and maintain state
                                })
                            # Execute statement to process data and maintain state
                            cur_d += timedelta(days=1)
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass

        # Sort range results descending by date
        all_logs.sort(key=lambda x: x.get("date_iso", ""), reverse=True)

    # Apply Work Mode Filter if specified
    if work_mode and work_mode.lower() != "all":
        # Set wm_query variable to store wm query value
        wm_query = work_mode.strip().upper()
        # Set all_logs variable to store all logs value
        all_logs = [l for l in all_logs if (l.get("work_mode") or "").upper() == wm_query]

    # Apply Client Site Filter if specified
    if client_site and client_site.lower() != "all":
        # Set cs_query variable to store cs query value
        cs_query = client_site.strip().lower()
        # Set all_logs variable to store all logs value
        all_logs = [
            # Execute statement to process data and maintain state
            l for l in all_logs
            # Evaluate condition to control execution branch
            if (l.get("client_site_name") or "").lower() == cs_query or str(l.get("client_site_id") or "") == cs_query
        # Execute statement to process data and maintain state
        ]

    # Apply Status Filter if specified
    if status and status != "all":
        # Set st_query variable to store st query value
        st_query = status.lower()
        # Set all_logs variable to store all logs value
        all_logs = [l for l in all_logs if st_query in l["status"].lower()]

    # Fetch active client sites for manager filter options
    client_sites_list = []
    # Begin guarded execution block to trap exceptions
    try:
        # Import ClientSite from app.models.work_location for module operations
        from app.models.work_location import ClientSite
        # Initiate database query on specified model
        client_sites = db.query(ClientSite).filter(ClientSite.is_active == True).all()
        # Set client_sites_list variable to store client sites list value
        client_sites_list = [{"id": cs.id, "name": cs.name, "client_name": cs.client_name} for cs in client_sites]
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Pagination calculation
    total_records = len(all_logs)
    # Set page variable to store page value
    page = max(1, page)
    # Set page_size variable to store page size value
    page_size = max(1, min(page_size, 100))
    # Set total_pages variable to store total pages value
    total_pages = max(1, (total_records + page_size - 1) // page_size)
    # Set start_idx variable to store start idx value
    start_idx = (page - 1) * page_size
    # Set end_idx variable to store end idx value
    end_idx = start_idx + page_size
    # Set paginated_records variable to store paginated records value
    paginated_records = all_logs[start_idx:end_idx]

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "records": paginated_records,
        # Execute statement to process data and maintain state
        "total": total_records,
        # Execute statement to process data and maintain state
        "page": page,
        # Execute statement to process data and maintain state
        "page_size": page_size,
        # Execute statement to process data and maintain state
        "total_pages": total_pages,
        # Execute statement to process data and maintain state
        "departments": all_departments,
        # Execute statement to process data and maintain state
        "team_members": team_members_list,
        # Execute statement to process data and maintain state
        "client_sites": client_sites_list,
        # Execute statement to process data and maintain state
        "work_modes": ["OFFICE", "WFH", "CLIENT_SITE"],
        # Execute statement to process data and maintain state
        "today": str(today)
    # Execute statement to process data and maintain state
    }


# Define HTTP GET route endpoint handler
@router.get("/leaves")
# Define get_manager_team_leaves function to handle get manager team leaves
def get_manager_team_leaves(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, team = _get_manager_and_team(db, user)
    # Set m_code variable to store m code value
    m_code = m_prof.emp_code if m_prof else "MGR001"
    # Set user_role variable to store user role value
    user_role = str(user.get("role", m_prof.role if m_prof else "")).lower()

    # Import leave_service from app.services for module operations
    from app.services import leave_service
    # Evaluate condition to control execution branch
    if user_role == "admin":
        # Return computed result or response payload to caller
        return leave_service.get_all_leaves_admin(db)
    # Return computed result or response payload to caller
    return leave_service.get_team_leaves(db, m_code)


# Define HTTP POST route endpoint handler
@router.post("/leaves/{leave_id}/approve")
# Define HTTP PUT route endpoint handler
@router.put("/leaves/{leave_id}/approve")
# Define approve_leave function to handle approve leave
async def approve_leave(
    # Define leave_id schema field with type int,
    leave_id: int,
    # Define request schema field with type Request,
    request: Request,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, _ = _get_manager_and_team(db, user)
    # Set m_name variable to store m name value
    m_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() if m_prof else "Manager"
    # Set comment variable to store comment value
    comment = "Approved by Manager"
    # Begin guarded execution block to trap exceptions
    try:
        # Set body variable to store body value
        body = await request.json()
        # Set comment variable to store comment value
        comment = body.get("comment") or body.get("remarks") or comment
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Import leave_service from app.services for module operations
    from app.services import leave_service
    # Begin guarded execution block to trap exceptions
    try:
        # Set result variable to store result value
        result = leave_service.manager_action_leave(db, leave_id, "Approved", manager_name=m_name, comment=comment)
        # Check if target condition is false or object is missing
        if not result:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Leave request not found")
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": "Leave approved by Manager and sent to Admin for final approval.",
            # Execute statement to process data and maintain state
            "data": result,
            # Execute statement to process data and maintain state
            **result
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# Define HTTP POST route endpoint handler
@router.post("/leaves/{leave_id}/reject")
# Define HTTP PUT route endpoint handler
@router.put("/leaves/{leave_id}/reject")
# Define reject_leave function to handle reject leave
async def reject_leave(
    # Define leave_id schema field with type int,
    leave_id: int,
    # Define request schema field with type Request,
    request: Request,
    # Define remarks schema field with type Optional[str] and default value
    remarks: Optional[str] = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, _ = _get_manager_and_team(db, user)
    # Set m_name variable to store m name value
    m_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() if m_prof else "Manager"
    # Set comment variable to store comment value
    comment = remarks or ""
    # Check if target condition is false or object is missing
    if not comment:
        # Begin guarded execution block to trap exceptions
        try:
            # Set body variable to store body value
            body = await request.json()
            # Set comment variable to store comment value
            comment = body.get("remarks") or body.get("reason") or body.get("comment") or ""
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Import leave_service from app.services for module operations
    from app.services import leave_service
    # Begin guarded execution block to trap exceptions
    try:
        # Set result variable to store result value
        result = leave_service.manager_action_leave(db, leave_id, "Rejected", manager_name=m_name, comment=comment or "Rejected by Manager")
        # Check if target condition is false or object is missing
        if not result:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Leave request not found")
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": "Request rejected successfully.",
            # Execute statement to process data and maintain state
            "data": result,
            # Execute statement to process data and maintain state
            **result
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# Define HTTP GET route endpoint handler
@router.get("/leave-balances")
# Define get_manager_team_leave_balances function to handle get manager team leave balances
def get_manager_team_leave_balances(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, team = _get_manager_and_team(db, user)
    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for member in team:
        # Initiate database query on specified model
        bal = db.query(LeaveBalance).filter(LeaveBalance.emp_code == member.emp_code).first()
        # Set allowed variable to store allowed value
        allowed = bal.allowed_leaves if bal else 21.0
        # Set used variable to store used value
        used = bal.used_leaves if bal else 0.0
        # Set remaining variable to store remaining value
        remaining = max(0.0, allowed - used)
        # Set mem_name variable to store mem name value
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code

        # Execute statement to process data and maintain state
        results.append({
            # Execute statement to process data and maintain state
            "id": member.id,
            # Execute statement to process data and maintain state
            "emp_code": member.emp_code,
            # Execute statement to process data and maintain state
            "employee": mem_name,
            # Execute statement to process data and maintain state
            "name": mem_name,
            # Execute statement to process data and maintain state
            "location": _format_location(member),
            # Execute statement to process data and maintain state
            "casual_leave": 5.0,
            # Execute statement to process data and maintain state
            "sick_leave": 3.0,
            # Execute statement to process data and maintain state
            "earned_leave": 8.0,
            # Execute statement to process data and maintain state
            "other_leave": 5.0,
            # Execute statement to process data and maintain state
            "total_available": allowed,
            # Execute statement to process data and maintain state
            "used": used,
            # Execute statement to process data and maintain state
            "remaining": remaining
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return results


# Define HTTP GET route endpoint handler
@router.get("/regularization")
# Define get_manager_team_regularizations function to handle get manager team regularizations
def get_manager_team_regularizations(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, team = _get_manager_and_team(db, user)
    # Set team_codes variable to store team codes value
    team_codes = [p.emp_code for p in team]
    # Set user_role variable to store user role value
    user_role = str(user.get("role", m_prof.role if m_prof else "")).lower()

    # Import get_manager_regularizations, get_all_regularizations_admin from app.services.regularization_service for module operations
    from app.services.regularization_service import get_manager_regularizations, get_all_regularizations_admin
    # Evaluate condition to control execution branch
    if user_role == "admin":
        # Return computed result or response payload to caller
        return get_all_regularizations_admin(db)

    # Set results variable to store results value
    results = get_manager_regularizations(db, manager_code=m_prof.emp_code if m_prof else "", team_codes=team_codes)
    # Return computed result or response payload to caller
    return results


# Define HTTP POST route endpoint handler
@router.post("/regularization/{reg_id}/approve")
# Define HTTP PUT route endpoint handler
@router.put("/regularization/{reg_id}/approve")
# Define approve_regularization function to handle approve regularization
async def approve_regularization(
    # Define reg_id schema field with type int,
    reg_id: int,
    # Define request schema field with type Request,
    request: Request,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, _ = _get_manager_and_team(db, user)
    # Set m_name variable to store m name value
    m_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() if m_prof else "Manager"
    # Set comment variable to store comment value
    comment = "Approved by Manager"
    # Begin guarded execution block to trap exceptions
    try:
        # Set body variable to store body value
        body = await request.json()
        # Set comment variable to store comment value
        comment = body.get("comment") or body.get("remarks") or comment
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Import manager_action_request from app.services.regularization_service for module operations
    from app.services.regularization_service import manager_action_request
    # Begin guarded execution block to trap exceptions
    try:
        # Set result variable to store result value
        result = manager_action_request(db, reg_id, "Approved", comment=comment, manager_name=m_name)
        # Check if target condition is false or object is missing
        if not result:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Regularization request not found")
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": "Regularization approved and moved to Admin review.",
            # Execute statement to process data and maintain state
            "data": result,
            # Execute statement to process data and maintain state
            **result
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# Define HTTP POST route endpoint handler
@router.post("/regularization/{reg_id}/reject")
# Define HTTP PUT route endpoint handler
@router.put("/regularization/{reg_id}/reject")
# Define reject_regularization function to handle reject regularization
async def reject_regularization(
    # Define reg_id schema field with type int,
    reg_id: int,
    # Define request schema field with type Request,
    request: Request,
    # Define remarks schema field with type Optional[str] and default value
    remarks: Optional[str] = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, _ = _get_manager_and_team(db, user)
    # Set m_name variable to store m name value
    m_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() if m_prof else "Manager"
    # Set comment variable to store comment value
    comment = remarks or ""
    # Check if target condition is false or object is missing
    if not comment:
        # Begin guarded execution block to trap exceptions
        try:
            # Set body variable to store body value
            body = await request.json()
            # Set comment variable to store comment value
            comment = body.get("remarks") or body.get("reason") or body.get("comment") or ""
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Import manager_action_request from app.services.regularization_service for module operations
    from app.services.regularization_service import manager_action_request
    # Begin guarded execution block to trap exceptions
    try:
        # Set result variable to store result value
        result = manager_action_request(db, reg_id, "Rejected", comment=comment or "Rejected by Manager", manager_name=m_name)
        # Check if target condition is false or object is missing
        if not result:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Regularization request not found")
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": "Request rejected successfully.",
            # Execute statement to process data and maintain state
            "data": result,
            # Execute statement to process data and maintain state
            **result
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# Define HTTP GET route endpoint handler
@router.get("/applications")
# Define get_manager_team_applications function to handle get manager team applications
def get_manager_team_applications(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Set leaves variable to store leaves value
    leaves = get_manager_team_leaves(db, user)
    # Set regs variable to store regs value
    regs = get_manager_team_regularizations(db, user)

    # Set apps variable to store apps value
    apps = []
    # Iterate through items in sequence loop
    for l in leaves:
        # Execute statement to process data and maintain state
        apps.append({
            # Execute statement to process data and maintain state
            "id": f"leave-{l['id']}",
            # Execute statement to process data and maintain state
            "raw_id": l["id"],
            # Execute statement to process data and maintain state
            "type": "Leave",
            # Execute statement to process data and maintain state
            "emp_code": l["emp_code"],
            # Execute statement to process data and maintain state
            "employee": l["employee"],
            # Execute statement to process data and maintain state
            "location": l["location"],
            # Execute statement to process data and maintain state
            "details": f"{l['leave_type']} ({l['days']} days)",
            # Execute statement to process data and maintain state
            "reason": l["reason"],
            # Execute statement to process data and maintain state
            "status": l["status"],
            # Execute statement to process data and maintain state
            "date": l["applied_date"]
        # Execute statement to process data and maintain state
        })
    # Iterate through items in sequence loop
    for r in regs:
        # Execute statement to process data and maintain state
        apps.append({
            # Execute statement to process data and maintain state
            "id": f"reg-{r['id']}",
            # Execute statement to process data and maintain state
            "raw_id": r["id"],
            # Execute statement to process data and maintain state
            "type": "Regularization",
            # Execute statement to process data and maintain state
            "emp_code": r["emp_code"],
            # Execute statement to process data and maintain state
            "employee": r["employee"],
            # Execute statement to process data and maintain state
            "location": r["location"],
            # Execute statement to process data and maintain state
            "details": f"Target Date: {r['date']}",
            # Execute statement to process data and maintain state
            "reason": r["reason"],
            # Execute statement to process data and maintain state
            "status": r["status"],
            # Execute statement to process data and maintain state
            "date": r["submitted_date"]
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return apps


# Define HTTP GET route endpoint handler
@router.get("/compoffs")
# Define get_manager_team_compoffs function to handle get manager team compoffs
def get_manager_team_compoffs(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, team = _get_manager_and_team(db, user)
    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for m in team:
        # Set mem_name variable to store mem name value
        mem_name = f"{m.first_name or ''} {m.last_name or ''}".strip() or m.emp_code
        # Execute statement to process data and maintain state
        results.append({
            # Execute statement to process data and maintain state
            "id": m.id,
            # Execute statement to process data and maintain state
            "emp_code": m.emp_code,
            # Execute statement to process data and maintain state
            "employee": mem_name,
            # Execute statement to process data and maintain state
            "location": _format_location(m),
            # Execute statement to process data and maintain state
            "work_date": "2026-09-20",
            # Execute statement to process data and maintain state
            "compoff_date": "2026-09-24",
            # Execute statement to process data and maintain state
            "duration": "1 Day",
            # Execute statement to process data and maintain state
            "reason": "Weekend project support",
            # Execute statement to process data and maintain state
            "status": "Pending",
            # Execute statement to process data and maintain state
            "applied_date": str(date_cls.today())
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return results


# Define HTTP GET route endpoint handler
@router.get("/team-compoffs")
# Define get_manager_team_compoff_balances function to handle get manager team compoff balances
def get_manager_team_compoff_balances(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user=Depends(require_role(["manager", "admin"]))
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    m_prof, team = _get_manager_and_team(db, user)
    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for m in team:
        # Set mem_name variable to store mem name value
        mem_name = f"{m.first_name or ''} {m.last_name or ''}".strip() or m.emp_code
        # Execute statement to process data and maintain state
        results.append({
            # Execute statement to process data and maintain state
            "id": m.id,
            # Execute statement to process data and maintain state
            "emp_code": m.emp_code,
            # Execute statement to process data and maintain state
            "employee": mem_name,
            # Execute statement to process data and maintain state
            "location": _format_location(m),
            # Execute statement to process data and maintain state
            "available": 2,
            # Execute statement to process data and maintain state
            "used": 1,
            # Execute statement to process data and maintain state
            "pending": 1,
            # Execute statement to process data and maintain state
            "expired": 0
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return results
