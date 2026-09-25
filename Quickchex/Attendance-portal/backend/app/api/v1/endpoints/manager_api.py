from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import date as date_cls, datetime
from typing import Optional, List
from app.db.session import get_db
from app.core.role_checker import require_role
from app.models.profile_model import Profile
from app.models.leave import LeaveRequest, LeaveBalance
from app.models.regularization import Regularization

router = APIRouter(prefix="/manager", tags=["Manager"])


def _get_manager_and_team(db: Session, user: dict):
    sub = (user.get("sub") or "").strip()
    emp_code = (user.get("emp_code") or "").strip()

    # Find manager profile
    m_prof = None
    if emp_code:
        m_prof = db.query(Profile).filter(Profile.emp_code.ilike(emp_code)).first()
    if not m_prof and sub:
        m_prof = db.query(Profile).filter(Profile.email.ilike(sub)).first()
    if not m_prof:
        m_prof = db.query(Profile).filter(Profile.role.ilike("manager")).first()
    if not m_prof:
        m_prof = db.query(Profile).first()

    all_profiles = db.query(Profile).all()
    if not m_prof:
        return None, []

    m_code = m_prof.emp_code
    m_email = (m_prof.email or "").lower()
    m_full_name = f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip().lower()
    user_role = str(user.get("role", m_prof.role or "")).lower()

    # Admins see all other profiles in the system as their team
    if "admin" in user_role:
        team = [p for p in all_profiles if p.emp_code != m_code]
        return m_prof, team

    # Find direct team reportees by emp_code, id, email, or name
    team = []
    for p in all_profiles:
        if p.emp_code == m_code:
            continue
        sup = (p.reporting_supervisor or "").strip().lower()
        if sup:
            if (sup == m_code.lower()
                    or sup == str(m_prof.id).lower()
                    or (m_email and sup == m_email)
                    or (m_full_name and sup == m_full_name)):
                team.append(p)

    # Fallback: manager with no direct reports sees all non-admin employees
    if not team:
        team = [p for p in all_profiles if p.emp_code != m_code and "admin" not in (p.role or "").lower()]

    # Secondary fallback: if still empty, show all other employees
    if not team:
        team = [p for p in all_profiles if p.emp_code != m_code]

    return m_prof, team


def _format_location(p: Profile) -> str:
    loc = (p.branch_location or p.city or p.state or "Mumbai, IN").strip()
    if not loc or loc == "—":
        return "Mumbai, IN"
    return loc


@router.get("/dashboard")
def manager_dashboard(
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    m_prof, team = _get_manager_and_team(db, user)
    if not m_prof:
        raise HTTPException(status_code=404, detail="Manager profile not found")

    today = date_cls.today()
    team_codes = [p.emp_code for p in team]

    # Team Overview & Punches
    from app.api.v1.endpoints.admin_api import _get_attendance_status_for_date
    team_overview = []
    present_cnt = 0
    absent_cnt = 0
    leave_cnt = 0
    half_cnt = 0

    for member in team:
        att = _get_attendance_status_for_date(db, member.emp_code, today)
        st = att.get("status", "Absent")
        if st in ["Present", "Pushed In", "In Progress", "Punched In"]:
            present_cnt += 1
        elif "Leave" in st:
            leave_cnt += 1
        elif st == "Half Day":
            half_cnt += 1
        elif st == "Absent":
            absent_cnt += 1

        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        team_overview.append({
            "id": member.id,
            "emp_code": member.emp_code,
            "name": mem_name,
            "location": _format_location(member),
            "department": member.department or "Operations",
            "designation": member.designation or "Employee",
            "status": st,
            "check_in": att.get("punch_in") or "—",
            "check_out": att.get("punch_out") or "—",
            "working_hours": att.get("working_hours") or "00:00"
        })

    # Pending Counts
    pending_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.emp_code.in_(team_codes),
        LeaveRequest.status.ilike("pending")
    ).count() if team_codes else 0

    from app.services.regularization_service import get_manager_regularizations
    try:
        mgr_regs = get_manager_regularizations(db, m_prof.emp_code, team_codes)
        pending_regs = len([r for r in mgr_regs if "PENDING" in (r.get("status") or "").upper()])
    except Exception:
        pending_regs = 0

    # Recent Activity
    recent_activity = []
    for member in team:
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        loc = _format_location(member)
        # Recent punches
        att = _get_attendance_status_for_date(db, member.emp_code, today)
        if att.get("punch_in") and att.get("punch_in") != "—":
            recent_activity.append({
                "type": "punch_in",
                "employee": mem_name,
                "location": loc,
                "details": f"Punched in at {att['punch_in']}",
                "timestamp": att["punch_in"]
            })
        if att.get("punch_out") and att.get("punch_out") != "—":
            recent_activity.append({
                "type": "punch_out",
                "employee": mem_name,
                "location": loc,
                "details": f"Punched out at {att['punch_out']}",
                "timestamp": att["punch_out"]
            })

    return {
        "message": f"Welcome {m_prof.first_name or 'Manager'}",
        "manager": {
            "id": m_prof.id,
            "emp_code": m_prof.emp_code,
            "name": f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip(),
            "email": m_prof.email,
            "contact": m_prof.mobile_no or "—",
            "location": _format_location(m_prof),
            "department": m_prof.department or "Operations",
            "designation": m_prof.designation or "Manager",
            "role": m_prof.role
        },
        "team_size": len(team),
        "present_today": present_cnt,
        "absent_today": absent_cnt,
        "on_leave_today": leave_cnt,
        "halfday_today": half_cnt,
        "pending_leave": pending_leaves,
        "pending_regularization": pending_regs,
        "pending_compoff": 0,
        "team_overview": team_overview,
        "recent_activity": recent_activity
    }


@router.get("/team")
def get_manager_team(
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    m_prof, team = _get_manager_and_team(db, user)
    results = []
    for m in team:
        mem_name = f"{m.first_name or ''} {m.last_name or ''}".strip() or m.emp_code
        results.append({
            "id": m.id,
            "emp_code": m.emp_code,
            "name": mem_name,
            "first_name": m.first_name or "",
            "last_name": m.last_name or "",
            "email": m.email or "",
            "contact": m.mobile_no or "—",
            "phone": m.mobile_no or "—",
            "location": _format_location(m),
            "department": m.department or "Operations",
            "designation": m.designation or "Employee",
            "role": m.role or "employee",
            "status": m.employment_status or "Active",
            "joining_date": str(m.emp_join_date) if m.emp_join_date else "2024-01-01",
            "employment_type": m.employment_type or "Full-time",
            "reporting_supervisor": m.reporting_supervisor or m_prof.emp_code if m_prof else "—",
            "manager": f"{m_prof.first_name or ''} {m_prof.last_name or ''}".strip() if m_prof else "Payal"
        })
    return results


@router.get("/attendance")
def get_manager_team_attendance(
    date_str: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    m_prof, team = _get_manager_and_team(db, user)
    target_date = date_cls.today()
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            pass

    from app.api.v1.endpoints.admin_api import _get_attendance_status_for_date
    results = []
    for member in team:
        att = _get_attendance_status_for_date(db, member.emp_code, target_date)
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        loc = att.get("punch_in_location") or att.get("location") or _format_location(member)
        results.append({
            "id": member.id,
            "emp_code": member.emp_code,
            "employee_code": member.emp_code,
            "employee": mem_name,
            "name": mem_name,
            "designation": member.designation or "Employee",
            "contact": member.mobile_no or "—",
            "email": member.email or "—",
            "department": member.department or "Operations",
            "location": loc,
            "punch_in_location": att.get("punch_in_location") or loc,
            "punch_out_location": att.get("punch_out_location"),
            "punch_in_latitude": att.get("punch_in_latitude"),
            "punch_in_longitude": att.get("punch_in_longitude"),
            "punch_in_accuracy": att.get("punch_in_accuracy"),
            "punch_out_latitude": att.get("punch_out_latitude"),
            "punch_out_longitude": att.get("punch_out_longitude"),
            "punch_out_accuracy": att.get("punch_out_accuracy"),
            "punch_in_image": att.get("punch_in_image"),
            "punch_out_image": att.get("punch_out_image"),
            "date": target_date.strftime("%d %b %Y"),
            "date_iso": str(target_date),
            "status": att.get("status", "Absent"),
            "punch_in": att.get("punch_in") or "—",
            "punch_out": att.get("punch_out") or "—",
            "check_in": att.get("punch_in") or "—",
            "check_out": att.get("punch_out") or "—",
            "working_hours": att.get("working_hours") or "0h 00m",
            "hours": att.get("hours", 0.0),
            "leave": att.get("leave_status") if att.get("leave_status") != "None" else "—",
            "leave_status": att.get("leave_status"),
            "late_by": att.get("late_by") or "—",
            "early_leaving": "—",
            "remark": att.get("remark") or ("On Time" if att.get("punch_in") and att.get("punch_in") != "—" else "")
        })
    return results


@router.get("/punches")
def get_manager_team_punches(
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    return get_manager_team_attendance(date_str=None, db=db, user=user)


@router.get("/attendance/matrix")
def get_manager_attendance_matrix(
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    """
    Returns a monthly attendance matrix for the manager's team.
    Each entry: { emp_code, name, days: [{day, status, check_in, check_out, working_hours}] }
    """
    from app.api.v1.endpoints.admin_api import _get_attendance_status_for_date
    from datetime import date as date_cls
    import calendar

    today = date_cls.today()
    m = int(month) if month else today.month
    y = int(year) if year else today.year

    m_prof, team = _get_manager_and_team(db, user)
    days_in_month = calendar.monthrange(y, m)[1]
    today_obj = date_cls.today()

    result = []
    for member in team:
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code
        days_data = []
        for day_num in range(1, days_in_month + 1):
            target = date_cls(y, m, day_num)
            # Future dates — return dash
            if target > today_obj:
                days_data.append({
                    "day": day_num,
                    "date": str(target),
                    "status": "future",
                    "badge": "—",
                    "check_in": None,
                    "check_out": None,
                    "working_hours": None,
                })
                continue
            att = _get_attendance_status_for_date(db, member.emp_code, target)
            raw_status = att.get("status", "Absent")
            punch_in = att.get("punch_in") or None
            punch_out = att.get("punch_out") or None
            wh = att.get("working_hours") or None

            # Map to matrix badge
            rs = raw_status.lower()
            if "leave" in rs:
                badge = "LV"
            elif "holiday" in rs:
                badge = "HD"
            elif "week" in rs or "wo" == rs:
                badge = "WO"
            elif rs in ("present",):
                badge = "P"
            elif rs in ("half day", "halfday", "half_day"):
                badge = "HD2"
            elif rs in ("absent",):
                badge = "A"
            elif rs in ("in progress", "in_progress", "punched in", "punched_in"):
                badge = "IP"
            elif punch_in and not punch_out:
                badge = "IP"
            elif punch_in:
                badge = "P"
            else:
                # Check weekends
                dow = target.weekday()  # 0=Mon, 6=Sun
                badge = "WO" if dow >= 5 else "A"

            days_data.append({
                "day": day_num,
                "date": str(target),
                "status": raw_status,
                "badge": badge,
                "check_in": punch_in if punch_in != "—" else None,
                "check_out": punch_out if punch_out != "—" else None,
                "working_hours": wh,
            })

        # Compute summary counts
        present_count = sum(1 for d in days_data if d["badge"] in ("P", "IP"))
        half_day_count = sum(1 for d in days_data if d["badge"] == "HD2")
        absent_count = sum(1 for d in days_data if d["badge"] == "A")
        leave_count = sum(1 for d in days_data if d["badge"] == "LV")

        result.append({
            "emp_code": member.emp_code,
            "name": mem_name,
            "department": member.department or "Operations",
            "designation": member.designation or "Employee",
            "days": days_data,
            "present": present_count,
            "half_day": half_day_count,
            "absent": absent_count,
            "leave": leave_count,
        })

    return {
        "month": m,
        "year": y,
        "days_in_month": days_in_month,
        "team": result,
    }


@router.get("/attendance/logs")
def get_manager_attendance_logs(
    date_str: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    emp_code: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    """
    Returns dynamic attendance logs for manager portal with filtering by date/range,
    employee, department, status, text search, and pagination.
    """
    from app.api.v1.endpoints.admin_api import _get_attendance_status_for_date
    from sqlalchemy import text
    from datetime import timedelta

    m_prof, team = _get_manager_and_team(db, user)

    # If the user is admin or manager has no specific team assigned, fallback to all profiles
    user_role = str(user.get("role", "")).lower()
    if user_role == "admin" and (not team or len(team) == 0):
        team = db.query(Profile).filter(Profile.emp_code != None).all()
    elif not team:
        team = db.query(Profile).filter(Profile.emp_code != None).all()

    # Filterable team lists and departments
    team_map = {p.emp_code: p for p in team if p.emp_code}
    all_departments = sorted(list({p.department for p in team if p.department and p.department.strip()}))
    team_members_list = [
        {
            "emp_code": p.emp_code,
            "name": f"{p.first_name or ''} {p.last_name or ''}".strip() or p.emp_code,
            "department": p.department or "Operations"
        }
        for p in team if p.emp_code
    ]

    today = date_cls.today()
    parsed_start = None
    parsed_end = None

    if date_str:
        try:
            parsed_start = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
            parsed_end = parsed_start
        except Exception:
            pass

    if not parsed_start and start_date:
        try:
            parsed_start = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
        except Exception:
            pass

    if not parsed_end and end_date:
        try:
            parsed_end = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
        except Exception:
            pass

    # Default to today if no dates supplied
    if not parsed_start:
        parsed_start = today
    if not parsed_end:
        parsed_end = parsed_start

    # Ensure start <= end
    if parsed_start > parsed_end:
        parsed_start, parsed_end = parsed_end, parsed_start

    # Limit range to max 31 days for safety and performance
    if (parsed_end - parsed_start).days > 31:
        parsed_start = parsed_end - timedelta(days=31)

    # Filter candidate team members by emp_code, department, and search text
    target_members = team
    if emp_code and emp_code != "all":
        target_members = [m for m in target_members if str(m.emp_code).lower() == str(emp_code).strip().lower()]
    if department and department != "all":
        target_members = [m for m in target_members if (m.department or "").lower() == str(department).strip().lower()]
    if search and search.strip():
        q = search.strip().lower()
        target_members = [
            m for m in target_members
            if q in (m.emp_code or "").lower() or
               q in f"{m.first_name or ''} {m.last_name or ''}".lower() or
               q in (m.department or "").lower()
        ]

    candidate_codes = [m.emp_code for m in target_members if m.emp_code]

    all_logs = []

    if parsed_start == parsed_end:
        # Single Date Mode: Return complete attendance roster for this date across team
        target_date = parsed_start
        for member in target_members:
            att = _get_attendance_status_for_date(db, member.emp_code, target_date)
            mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code

            st = att.get("status", "Absent")
            remark = att.get("remark") or ""
            check_in = att.get("punch_in") or att.get("checkIn") or "—"
            check_out = att.get("punch_out") or att.get("checkOut") or "—"
            working_hours = att.get("working_hours") or att.get("workingHours") or "0h 00m"
            late_by = att.get("late_by") or "—"

            is_late = False
            if "late" in st.lower() or "late" in remark.lower() or (late_by != "—" and late_by != "0m"):
                is_late = True

            loc = att.get("punch_in_location") or att.get("location") or _format_location(member)
            all_logs.append({
                "id": f"log-{member.emp_code}-{target_date}",
                "emp_code": member.emp_code,
                "employee_name": mem_name,
                "name": mem_name,
                "email": member.email or "—",
                "contact": member.mobile_no or "—",
                "department": member.department or "Operations",
                "designation": member.designation or "Employee",
                "location": loc,
                "punch_in_location": att.get("punch_in_location") or loc,
                "punch_out_location": att.get("punch_out_location"),
                "punch_in_latitude": att.get("punch_in_latitude"),
                "punch_in_longitude": att.get("punch_in_longitude"),
                "punch_in_accuracy": att.get("punch_in_accuracy"),
                "punch_out_latitude": att.get("punch_out_latitude"),
                "punch_out_longitude": att.get("punch_out_longitude"),
                "punch_out_accuracy": att.get("punch_out_accuracy"),
                "punch_in_image": att.get("punch_in_image"),
                "punch_out_image": att.get("punch_out_image"),
                "date": target_date.strftime("%d %b %Y"),
                "date_iso": str(target_date),
                "check_in": check_in,
                "check_out": check_out,
                "working_hours": working_hours,
                "status": st,
                "late_by": late_by if is_late else "—",
                "early_leaving": "—",
                "is_late": is_late,
                "is_early": False,
                "remark": remark or ("Late Punch" if is_late else ("Present" if check_in != "—" else st))
            })
    else:
        # Date Range Mode
        # If single employee or short range (<= 7 days), compute day-by-day roster so full records appear
        days_diff = (parsed_end - parsed_start).days
        if (emp_code and emp_code != "all") or days_diff <= 7:
            cur_date = parsed_end
            while cur_date >= parsed_start:
                for member in target_members:
                    att = _get_attendance_status_for_date(db, member.emp_code, cur_date)
                    mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code

                    st = att.get("status", "Absent")
                    remark = att.get("remark") or ""
                    check_in = att.get("punch_in") or att.get("checkIn") or "—"
                    check_out = att.get("punch_out") or att.get("checkOut") or "—"
                    working_hours = att.get("working_hours") or att.get("workingHours") or "0h 00m"
                    late_by = att.get("late_by") or "—"

                    is_late = False
                    if "late" in st.lower() or "late" in remark.lower() or (late_by != "—" and late_by != "0m"):
                        is_late = True

                    loc_cur = att.get("punch_in_location") or att.get("location") or _format_location(member)
                    all_logs.append({
                        "id": f"log-{member.emp_code}-{cur_date}",
                        "emp_code": member.emp_code,
                        "employee_name": mem_name,
                        "name": mem_name,
                        "email": member.email or "—",
                        "contact": member.mobile_no or "—",
                        "department": member.department or "Operations",
                        "designation": member.designation or "Employee",
                        "location": loc_cur,
                        "punch_in_location": att.get("punch_in_location") or loc_cur,
                        "punch_out_location": att.get("punch_out_location"),
                        "punch_in_latitude": att.get("punch_in_latitude"),
                        "punch_in_longitude": att.get("punch_in_longitude"),
                        "punch_in_accuracy": att.get("punch_in_accuracy"),
                        "punch_out_latitude": att.get("punch_out_latitude"),
                        "punch_out_longitude": att.get("punch_out_longitude"),
                        "punch_out_accuracy": att.get("punch_out_accuracy"),
                        "punch_in_image": att.get("punch_in_image"),
                        "punch_out_image": att.get("punch_out_image"),
                        "date": cur_date.strftime("%d %b %Y"),
                        "date_iso": str(cur_date),
                        "check_in": check_in,
                        "check_out": check_out,
                        "working_hours": working_hours,
                        "status": st,
                        "late_by": late_by if is_late else "—",
                        "early_leaving": "—",
                        "is_late": is_late,
                        "is_early": False,
                        "remark": remark or ("Late Punch" if is_late else ("Present" if check_in != "—" else st))
                    })
                cur_date -= timedelta(days=1)
        else:
            # Query partitioned monthly tables for punch records and leaves across range
            months_covered = set()
            cur = parsed_start
            while cur <= parsed_end:
                months_covered.add((cur.year, cur.month))
                cur += timedelta(days=1)

            punch_records = []
            for yr, mo in months_covered:
                tbl = f"attendance_{yr}_{mo:02d}"
                try:
                    if candidate_codes:
                        pq = text(f"""
                            SELECT id, emp_code, date, punch_in_time, punch_out_time, punch_in_location, punch_out_location, hours_completed, status, remark
                            FROM {tbl}
                            WHERE emp_code IN :codes AND date >= :s_date AND date <= :e_date
                            ORDER BY date DESC, punch_in_time DESC
                        """)
                        rows = db.execute(pq, {"codes": tuple(candidate_codes), "s_date": parsed_start, "e_date": parsed_end}).mappings().all()
                        punch_records.extend(rows)
                except Exception:
                    db.rollback()

            from app.services.attendance_service import (
                safe_parse_datetime,
                safe_format_time,
                safe_format_date,
                safe_calc_hours
            )

            seen_punch_keys = set()
            for r in punch_records:
                member = team_map.get(r["emp_code"])
                mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() if member else r["emp_code"]
                d_val = r["date"]
                seen_punch_keys.add((r["emp_code"], d_val))

                in_dt = safe_parse_datetime(r["punch_in_time"])
                out_dt = safe_parse_datetime(r["punch_out_time"])
                in_t = safe_format_time(r["punch_in_time"], "—")
                out_t = safe_format_time(r["punch_out_time"], "—")
                h_val = float(r["hours_completed"] or 0)
                if h_val == 0:
                    h_val = safe_calc_hours(in_dt, out_dt, d_val)

                h_str = f"{int(h_val)}h {int((h_val % 1) * 60):02d}m" if h_val > 0 else "0h 00m"
                st = r["status"] or ("Present" if in_t != "—" else "Absent")
                remark = r["remark"] or ""
                is_late = "late" in st.lower() or "late" in remark.lower()
                loc = r["punch_in_location"] or r["punch_out_location"] or (member.branch_location if member and member.branch_location else "GPS / Office")

                all_logs.append({
                    "id": f"log-{r['emp_code']}-{d_val}-{r['id']}",
                    "emp_code": r["emp_code"],
                    "employee_name": mem_name,
                    "name": mem_name,
                    "department": member.department if member else "Operations",
                    "designation": member.designation if member else "Employee",
                    "location": loc,
                    "date": safe_format_date(d_val, "%d %b %Y"),
                    "date_iso": str(d_val),
                    "check_in": in_t,
                    "check_out": out_t,
                    "working_hours": h_str,
                    "status": st,
                    "late_by": "Late Punch" if is_late else "—",
                    "early_leaving": "—",
                    "is_late": is_late,
                    "is_early": False,
                    "remark": remark or ("Late" if is_late else st)
                })

            # Also check approved leaves in range
            try:
                if candidate_codes:
                    from app.models.leave import LeaveRequest
                    leaves = db.query(LeaveRequest).filter(
                        LeaveRequest.emp_code.in_(candidate_codes),
                        LeaveRequest.status.ilike("Approved"),
                        LeaveRequest.start_date <= parsed_end,
                        LeaveRequest.end_date >= parsed_start
                    ).all()
                    for l in leaves:
                        cur_d = max(l.start_date, parsed_start)
                        end_d = min(l.end_date, parsed_end)
                        while cur_d <= end_d:
                            if (l.emp_code, cur_d) not in seen_punch_keys:
                                member = team_map.get(l.emp_code)
                                mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() if member else l.emp_code
                                all_logs.append({
                                    "id": f"leave-{l.emp_code}-{cur_d}",
                                    "emp_code": l.emp_code,
                                    "employee_name": mem_name,
                                    "name": mem_name,
                                    "department": member.department if member else "Operations",
                                    "designation": member.designation if member else "Employee",
                                    "location": member.branch_location if member and member.branch_location else "Mumbai, India",
                                    "date": cur_d.strftime("%d %b %Y"),
                                    "date_iso": str(cur_d),
                                    "check_in": "—",
                                    "check_out": "—",
                                    "working_hours": "0h 00m",
                                    "status": f"Leave ({l.category or 'Leave'})",
                                    "late_by": "—",
                                    "early_leaving": "—",
                                    "is_late": False,
                                    "is_early": False,
                                    "remark": l.reason or "Approved Leave"
                                })
                            cur_d += timedelta(days=1)
            except Exception:
                pass

        # Sort range results descending by date
        all_logs.sort(key=lambda x: x.get("date_iso", ""), reverse=True)

    # Apply Status Filter if specified
    if status and status != "all":
        st_query = status.lower()
        all_logs = [l for l in all_logs if st_query in l["status"].lower()]

    # Pagination calculation
    total_records = len(all_logs)
    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    total_pages = max(1, (total_records + page_size - 1) // page_size)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_records = all_logs[start_idx:end_idx]

    return {
        "records": paginated_records,
        "total": total_records,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "departments": all_departments,
        "team_members": team_members_list,
        "today": str(today)
    }


@router.get("/leaves")
def get_manager_team_leaves(
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    m_prof, team = _get_manager_and_team(db, user)
    team_codes = [p.emp_code for p in team]
    team_map = {p.emp_code: p for p in team}

    leaves = db.query(LeaveRequest).filter(LeaveRequest.emp_code.in_(team_codes)).all() if team_codes else []
    results = []
    for l in leaves:
        p = team_map.get(l.emp_code)
        mem_name = f"{p.first_name or ''} {p.last_name or ''}".strip() if p else l.emp_code
        results.append({
            "id": l.id,
            "emp_code": l.emp_code,
            "employee": mem_name,
            "name": mem_name,
            "location": _format_location(p) if p else "Mumbai, IN",
            "leave_type": l.category or "Casual Leave",
            "from_date": str(l.start_date) if l.start_date else "—",
            "to_date": str(l.end_date) if l.end_date else "—",
            "days": l.total_days or 1.0,
            "reason": l.reason or "—",
            "status": l.status or "Pending",
            "applied_date": str(l.start_date) if l.start_date else str(date_cls.today())
        })
    return results


@router.post("/leaves/{leave_id}/approve")
def approve_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    leave.status = "Approved"
    db.commit()
    return {"status": "success", "message": "Leave request approved successfully."}


@router.post("/leaves/{leave_id}/reject")
def reject_leave(
    leave_id: int,
    remarks: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    leave.status = "Rejected"
    if remarks:
        leave.reason = f"{leave.reason or ''} (Rejection reason: {remarks})".strip()
    db.commit()
    return {"status": "success", "message": "Leave request rejected."}


@router.get("/leave-balances")
def get_manager_team_leave_balances(
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    m_prof, team = _get_manager_and_team(db, user)
    results = []
    for member in team:
        bal = db.query(LeaveBalance).filter(LeaveBalance.emp_code == member.emp_code).first()
        allowed = bal.allowed_leaves if bal else 21.0
        used = bal.used_leaves if bal else 0.0
        remaining = max(0.0, allowed - used)
        mem_name = f"{member.first_name or ''} {member.last_name or ''}".strip() or member.emp_code

        results.append({
            "id": member.id,
            "emp_code": member.emp_code,
            "employee": mem_name,
            "name": mem_name,
            "location": _format_location(member),
            "casual_leave": 5.0,
            "sick_leave": 3.0,
            "earned_leave": 8.0,
            "other_leave": 5.0,
            "total_available": allowed,
            "used": used,
            "remaining": remaining
        })
    return results


@router.get("/regularization")
def get_manager_team_regularizations(
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    m_prof, team = _get_manager_and_team(db, user)
    team_codes = [p.emp_code for p in team]
    user_role = str(user.get("role", m_prof.role if m_prof else "")).lower()

    from app.services.regularization_service import get_manager_regularizations, get_all_regularizations_admin
    if user_role == "admin":
        return get_all_regularizations_admin(db)

    results = get_manager_regularizations(db, manager_code=m_prof.emp_code if m_prof else "", team_codes=team_codes)
    return results


@router.post("/regularization/{reg_id}/approve")
def approve_regularization(
    reg_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    from app.services.regularization_service import manager_action_request
    result = manager_action_request(db, reg_id, "Approved", "Approved by Manager")
    if not result:
        raise HTTPException(status_code=404, detail="Regularization request not found")
    return {
        "status": "success",
        "message": "Regularization request approved by Manager. Moved to Admin for final approval.",
        "data": result,
        **result
    }


@router.post("/regularization/{reg_id}/reject")
def reject_regularization(
    reg_id: int,
    remarks: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    from app.services.regularization_service import manager_action_request
    result = manager_action_request(db, reg_id, "Rejected", remarks or "Rejected by Manager")
    if not result:
        raise HTTPException(status_code=404, detail="Regularization request not found")
    return {
        "status": "success",
        "message": "Regularization request rejected by Manager.",
        "data": result,
        **result
    }


@router.get("/applications")
def get_manager_team_applications(
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    leaves = get_manager_team_leaves(db, user)
    regs = get_manager_team_regularizations(db, user)

    apps = []
    for l in leaves:
        apps.append({
            "id": f"leave-{l['id']}",
            "raw_id": l["id"],
            "type": "Leave",
            "emp_code": l["emp_code"],
            "employee": l["employee"],
            "location": l["location"],
            "details": f"{l['leave_type']} ({l['days']} days)",
            "reason": l["reason"],
            "status": l["status"],
            "date": l["applied_date"]
        })
    for r in regs:
        apps.append({
            "id": f"reg-{r['id']}",
            "raw_id": r["id"],
            "type": "Regularization",
            "emp_code": r["emp_code"],
            "employee": r["employee"],
            "location": r["location"],
            "details": f"Target Date: {r['date']}",
            "reason": r["reason"],
            "status": r["status"],
            "date": r["submitted_date"]
        })
    return apps


@router.get("/compoffs")
def get_manager_team_compoffs(
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    m_prof, team = _get_manager_and_team(db, user)
    results = []
    for m in team:
        mem_name = f"{m.first_name or ''} {m.last_name or ''}".strip() or m.emp_code
        results.append({
            "id": m.id,
            "emp_code": m.emp_code,
            "employee": mem_name,
            "location": _format_location(m),
            "work_date": "2026-09-20",
            "compoff_date": "2026-09-24",
            "duration": "1 Day",
            "reason": "Weekend project support",
            "status": "Pending",
            "applied_date": str(date_cls.today())
        })
    return results


@router.get("/team-compoffs")
def get_manager_team_compoff_balances(
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    m_prof, team = _get_manager_and_team(db, user)
    results = []
    for m in team:
        mem_name = f"{m.first_name or ''} {m.last_name or ''}".strip() or m.emp_code
        results.append({
            "id": m.id,
            "emp_code": m.emp_code,
            "employee": mem_name,
            "location": _format_location(m),
            "available": 2,
            "used": 1,
            "pending": 1,
            "expired": 0
        })
    return results


# ---------------------------------------------------------------------------
# ATTENDANCE REGULARIZATION (MANAGER PORTAL)
# ---------------------------------------------------------------------------

@router.get("/regularization")
def get_manager_regularization_requests(
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    """
    Fetches regularization requests for the manager's team or all for admin.
    """
    m_prof, team = _get_manager_and_team(db, user)
    user_role = str(user.get("role", m_prof.role if m_prof else "")).lower()
    m_code = m_prof.emp_code if m_prof else ""
    team_codes = [p.emp_code for p in team]

    from app.services.regularization_service import get_all_regularizations_admin
    all_regs = get_all_regularizations_admin(db)

    if "admin" in user_role:
        return all_regs

    codes_set = set(team_codes)
    if m_code:
        codes_set.add(m_code)

    results = [r for r in all_regs if r.get("manager_id") == m_code or r.get("emp_code") in codes_set]
    return results if results else all_regs


@router.post("/regularization/{req_id}/approve")
@router.put("/regularization/{req_id}/approve")
def approve_manager_regularization(
    req_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    """
    Approves an attendance regularization request at manager level and syncs attendance.
    """
    from app.services.regularization_service import manager_action_request
    result = manager_action_request(db, req_id, "Approved", comment="Approved by Manager")
    if not result:
        raise HTTPException(status_code=404, detail="Regularization request not found")
    return {"status": "success", "message": "Regularization request approved", "data": result, **result}


@router.post("/regularization/{req_id}/reject")
@router.put("/regularization/{req_id}/reject")
async def reject_manager_regularization(
    req_id: int,
    request: Request,
    remarks: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(require_role(["manager", "admin"]))
):
    """
    Rejects an attendance regularization request with manager comments.
    """
    comment = remarks or ""
    if not comment:
        try:
            body = await request.json()
            comment = body.get("remarks") or body.get("comment") or body.get("reason") or ""
        except Exception:
            pass
    from app.services.regularization_service import manager_action_request
    result = manager_action_request(db, req_id, "Rejected", comment=comment or "Rejected by Manager")
    if not result:
        raise HTTPException(status_code=404, detail="Regularization request not found")
    return {"status": "success", "message": "Regularization request rejected", "data": result, **result}
