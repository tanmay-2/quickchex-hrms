from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from datetime import date, datetime, timedelta
import logging
from typing import Optional, List, Dict, Any

from app.models.profile_model import Profile

logger = logging.getLogger(__name__)


def get_monthly_reg_table_name(date_obj: date):
    """Generates the dynamic table name based on year and month."""
    return f"regularization_{date_obj.year}_{date_obj.month:02d}"


def get_all_reg_tables(db: Session):
    """Returns all dynamic monthly regularization tables in the database."""
    tables = []
    try:
        insp = inspect(db.bind)
        all_db_tables = set(insp.get_table_names())
        for t in all_db_tables:
            if t.startswith("regularization_20") and t not in tables:
                tables.append(t)
    except Exception:
        all_db_tables = set()

    today = date.today()
    for d in [today, today.replace(day=1) - timedelta(days=1), today.replace(day=28) + timedelta(days=5)]:
        t_name = get_monthly_reg_table_name(d)
        if t_name in all_db_tables and t_name not in tables:
            tables.append(t_name)
    return tables


def format_status_display(status_code: str) -> str:
    """Standardizes human-readable regularization status label."""
    s = str(status_code or "Pending").strip().upper()
    if s in ("PENDING_MANAGER", "PENDING"):
        return "Pending Manager Approval"
    elif s in ("PENDING_ADMIN", "APPROVED_BY_MANAGER"):
        return "Pending Admin Approval"
    elif s in ("COMPLETED", "APPROVED"):
        return "Completed"
    elif s in ("REJECTED", "REJECTED_BY_MANAGER", "REJECTED_BY_ADMIN"):
        return "Rejected"
    return status_code or "Pending"


def submit_regularization(
    db: Session,
    emp_code: str,
    target_date: date,
    in_time: Optional[datetime],
    out_time: Optional[datetime],
    comment: str
) -> dict:
    """Level 1: Employee submits a regularization request."""
    # Find employee profile and reporting supervisor
    emp_prof = db.query(Profile).filter(
        (Profile.emp_code == emp_code) | (Profile.email.ilike(emp_code))
    ).first()

    emp_name = f"{emp_prof.first_name or ''} {emp_prof.last_name or ''}".strip() if emp_prof else emp_code
    manager_id = emp_prof.reporting_supervisor if emp_prof and emp_prof.reporting_supervisor else "MGR001"
    
    mgr_prof = db.query(Profile).filter(
        (Profile.emp_code == manager_id) | (Profile.email.ilike(manager_id))
    ).first() if manager_id else None
    manager_name = f"{mgr_prof.first_name or ''} {mgr_prof.last_name or ''}".strip() if mgr_prof else (manager_id or "Manager")

    now = datetime.now()
    reg_table = get_monthly_reg_table_name(target_date or now.date())

    # Build INSERT without RETURNING — use lastrowid for SQLite compatibility
    insert_sql = text(f"""
        INSERT INTO {reg_table} (
            emp_code, target_date, issued_for_in_time, issued_for_out_time,
            comment, status, employee_id, employee_name, manager_id, manager_name,
            approval_level, created_at, updated_at
        ) VALUES (
            :code, :t_date, :in_t, :out_t,
            :comm, 'PENDING_MANAGER', :code, :e_name, :m_id, :m_name,
            1, :now, :now
        );
    """)

    params = {
        "code": emp_code,
        "t_date": target_date,
        "in_t": in_time,
        "out_t": out_time,
        "comm": comment,
        "e_name": emp_name,
        "m_id": manager_id,
        "m_name": manager_name,
        "now": now
    }

    new_id = None
    try:
        res = db.execute(insert_sql, params)
        db.commit()
        new_id = res.lastrowid
        if new_id:
            try:
                db.execute(text(f"UPDATE {reg_table} SET id = :nid WHERE rowid = :nid AND id IS NULL"), {"nid": new_id})
                db.commit()
            except Exception:
                pass
    except Exception as e:
        db.rollback()
        logger.warning(f"Error inserting into {reg_table}: {e}")
        # Fallback: insert into static regularizations table
        static_sql = text("""
            INSERT INTO regularizations (
                emp_code, target_date, issued_for_in_time, issued_for_out_time,
                comment, status, employee_id, employee_name, manager_id, manager_name,
                approval_level, created_at, updated_at
            ) VALUES (
                :code, :t_date, :in_t, :out_t,
                :comm, 'PENDING_MANAGER', :code, :e_name, :m_id, :m_name,
                1, :now, :now
            );
        """)
        res = db.execute(static_sql, params)
        db.commit()
        new_id = res.lastrowid
        if new_id:
            try:
                db.execute(text("UPDATE regularizations SET id = :nid WHERE rowid = :nid AND id IS NULL"), {"nid": new_id})
                db.commit()
            except Exception:
                pass

    return {
        "id": new_id,
        "emp_code": emp_code,
        "employee_name": emp_name,
        "manager_id": manager_id,
        "manager_name": manager_name,
        "status": "PENDING_MANAGER",
        "statusDisplay": "Pending Manager Approval",
        "approval_level": 1,
        "target_date": str(target_date),
        "issued_for_in_time": in_time.isoformat() if in_time else None,
        "issued_for_out_time": out_time.isoformat() if out_time else None,
        "comment": comment
    }


def find_regularization_globally(db: Session, req_id: int):
    """Searches for a regularization request across all dynamic tables and static table."""
    tables = get_all_reg_tables(db)
    for t_name in tables:
        try:
            query = text(f"SELECT * FROM {t_name} WHERE id = :id")
            row = db.execute(query, {"id": int(req_id)}).mappings().first()
            if row:
                return dict(row), t_name
        except Exception:
            continue

    try:
        query = text("SELECT * FROM regularizations WHERE id = :id")
        row = db.execute(query, {"id": int(req_id)}).mappings().first()
        if row:
            return dict(row), "regularizations"
    except Exception:
        pass

    return None, None


def manager_action_request(db: Session, req_id: int, action: str, comment: str = "") -> Optional[dict]:
    """
    Level 2: Manager reviews regularization request.
    Action: 'Approved' -> status becomes Approved, approval_level = 2, synchronizes attendance
    Action: 'Rejected' -> status becomes Rejected, approval_level = 2, records rejection reason
    """
    req, found_table = find_regularization_globally(db, req_id)
    if not req:
        return None

    new_status = "Approved" if action.lower() == "approved" else "Rejected"
    now = datetime.now()

    tables_to_update = set(get_all_reg_tables(db))
    if found_table:
        tables_to_update.add(found_table)
    tables_to_update.add("regularizations")

    for t in tables_to_update:
        try:
            db.execute(text(f"""
                UPDATE {t}
                SET status = :status,
                    approval_level = 2,
                    manager_action = :act,
                    manager_comment = :comm,
                    updated_at = :now
                WHERE id = :id OR (emp_code = :c AND target_date = :td)
            """), {
                "status": new_status,
                "act": action,
                "comm": comment or f"Manager {action}",
                "now": now,
                "id": int(req_id),
                "c": req.get("emp_code"),
                "td": req.get("target_date")
            })
            db.commit()
        except Exception:
            db.rollback()

    # Synchronize Attendance upon approval
    if action.lower() == "approved":
        emp_code = req.get("emp_code")
        target_d = req.get("target_date")
        in_time = req.get("issued_for_in_time")
        out_time = req.get("issued_for_out_time")

        if isinstance(target_d, str):
            try:
                target_d = date.fromisoformat(target_d[:10])
            except Exception:
                target_d = date.today()

        if emp_code and target_d:
            att_table = f"attendance_{target_d.year}_{target_d.month:02d}"

            from app.services.attendance_service import calculate_attendance_status
            calc = calculate_attendance_status(
                punch_in_time=in_time,
                punch_out_time=out_time,
                target_date=target_d
            )
            att_status = calc["status"]
            hours = calc["hours"]

            try:
                att_row = db.execute(
                    text(f"SELECT id FROM {att_table} WHERE emp_code = :c AND date = :d"),
                    {"c": emp_code, "d": target_d}
                ).first()

                if att_row:
                    db.execute(text(f"""
                        UPDATE {att_table}
                        SET punch_in_time = COALESCE(:in_time, punch_in_time),
                            punch_out_time = COALESCE(:out_time, punch_out_time),
                            hours_completed = :hours,
                            status = :st,
                            remark = 'Regularized'
                        WHERE emp_code = :c AND date = :d
                    """), {
                        "in_time": in_time,
                        "out_time": out_time,
                        "hours": hours,
                        "st": att_status,
                        "c": emp_code,
                        "d": target_d
                    })
                else:
                    db.execute(text(f"""
                        INSERT INTO {att_table}
                        (emp_code, date, punch_in_time, punch_out_time, hours_completed, status, remark)
                        VALUES (:c, :d, :in_time, :out_time, :hours, :st, 'Regularized')
                    """), {
                        "c": emp_code,
                        "d": target_d,
                        "in_time": in_time,
                        "out_time": out_time,
                        "hours": hours,
                        "st": att_status
                    })
                db.commit()
                logger.info(f"Attendance synchronized for {emp_code} on {target_d} to {att_status} ({hours}h)")
            except Exception as err:
                db.rollback()
                logger.warning(f"Failed updating attendance table {att_table}: {err}")

    req["status"] = new_status
    req["statusDisplay"] = format_status_display(new_status)
    req["manager_action"] = action
    req["manager_comment"] = comment
    return req


def admin_action_request(db: Session, req_id: int, action: str, comment: str = "") -> Optional[dict]:
    """
    Level 3: Admin reviews regularization request.
    Action: 'Approved' -> status becomes COMPLETED, approval_level = 3, UPDATES ATTENDANCE
    Action: 'Rejected' -> status becomes REJECTED, approval_level = 3
    """
    req, found_table = find_regularization_globally(db, req_id)
    if not req:
        return None

    new_status = "COMPLETED" if action.lower() == "approved" else "REJECTED"
    now = datetime.now()

    tables_to_update = set(get_all_reg_tables(db))
    if found_table:
        tables_to_update.add(found_table)
    tables_to_update.add("regularizations")

    for t in tables_to_update:
        try:
            db.execute(text(f"""
                UPDATE {t}
                SET status = :status,
                    approval_level = 3,
                    admin_action = :act,
                    admin_comment = :comm,
                    updated_at = :now
                WHERE id = :id OR (emp_code = :c AND target_date = :td)
            """), {
                "status": new_status,
                "act": action,
                "comm": comment or f"Admin {action}",
                "now": now,
                "id": int(req_id),
                "c": req.get("emp_code"),
                "td": req.get("target_date")
            })
            db.commit()
        except Exception:
            db.rollback()

    # Synchronize Attendance upon final approval
    if action.lower() == "approved":
        emp_code = req.get("emp_code")
        target_d = req.get("target_date")
        in_time = req.get("issued_for_in_time")
        out_time = req.get("issued_for_out_time")

        if isinstance(target_d, str):
            try:
                target_d = date.fromisoformat(target_d[:10])
            except Exception:
                target_d = date.today()

        if emp_code and target_d:
            att_table = f"attendance_{target_d.year}_{target_d.month:02d}"

            # Calculate completed hours and authoritative status via calculate_attendance_status
            from app.services.attendance_service import calculate_attendance_status
            calc = calculate_attendance_status(
                punch_in_time=in_time,
                punch_out_time=out_time,
                target_date=target_d
            )
            att_status = calc["status"]
            hours = calc["hours"]

            try:
                att_row = db.execute(
                    text(f"SELECT id FROM {att_table} WHERE emp_code = :c AND date = :d"),
                    {"c": emp_code, "d": target_d}
                ).first()

                if att_row:
                    db.execute(text(f"""
                        UPDATE {att_table}
                        SET punch_in_time = COALESCE(:in_time, punch_in_time),
                            punch_out_time = COALESCE(:out_time, punch_out_time),
                            hours_completed = :hours,
                            status = :st,
                            remark = 'Regularized'
                        WHERE emp_code = :c AND date = :d
                    """), {
                        "in_time": in_time,
                        "out_time": out_time,
                        "hours": hours,
                        "st": att_status,
                        "c": emp_code,
                        "d": target_d
                    })
                else:
                    db.execute(text(f"""
                        INSERT INTO {att_table}
                        (emp_code, date, punch_in_time, punch_out_time, hours_completed, status, remark)
                        VALUES (:c, :d, :in_time, :out_time, :hours, :st, 'Regularized')
                    """), {
                        "c": emp_code,
                        "d": target_d,
                        "in_time": in_time,
                        "out_time": out_time,
                        "hours": hours,
                        "st": att_status
                    })
                db.commit()
                logger.info(f"Attendance synchronized for {emp_code} on {target_d} to {att_status} ({hours}h)")
            except Exception as err:
                db.rollback()
                logger.warning(f"Failed updating attendance table {att_table}: {err}")

    req["status"] = new_status
    req["statusDisplay"] = format_status_display(new_status)
    req["admin_action"] = action
    return req


def update_request_status(db: Session, req_id: int, new_status: str):
    """Bridge for PUT endpoints calling approve/reject."""
    s_clean = new_status.lower()
    if "approve" in s_clean:
        return admin_action_request(db, req_id, "Approved")
    elif "reject" in s_clean:
        return admin_action_request(db, req_id, "Rejected")
    return None


def get_all_regularizations_admin(db: Session, supervisor_code: str = None) -> List[dict]:
    """Fetches regularization requests across all tables for Admin and Manager portals."""
    tables = get_all_reg_tables(db)
    all_regs = []
    seen_keys = set()

    for t_name in tables:
        try:
            where_clause = ""
            params = {}
            if supervisor_code:
                where_clause = "WHERE (p.reporting_supervisor = :sup OR r.manager_id = :sup)"
                params["sup"] = supervisor_code

            query = text(f"""
                SELECT r.rowid as _rowid, r.*, p.first_name, p.last_name, p.department, p.designation, p.reporting_supervisor, p.branch_location
                FROM {t_name} r
                LEFT JOIN profile_master p ON r.emp_code = p.emp_code
                {where_clause}
                ORDER BY COALESCE(r.id, r.rowid) DESC
            """)
            rows = db.execute(query, params).mappings().all()
            for r in rows:
                actual_id = r.get("id") or r.get("_rowid")
                key = (str(r.get("emp_code")), str(r.get("target_date")), str(actual_id))
                if key in seen_keys:
                    continue
                seen_keys.add(key)

                emp_c = r.get("emp_code")
                emp_name = r.get("employee_name") or f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or emp_c or "Employee"
                tar_d = r.get("target_date")
                req_d = r.get("created_at") or r.get("request_date") or tar_d
                from app.services.attendance_service import safe_parse_date, safe_parse_datetime, safe_format_time, safe_format_date
                tar_parsed = safe_parse_date(tar_d)
                tar_str = safe_format_date(tar_parsed, "%d %b %Y") if tar_parsed else str(tar_d or "")

                req_parsed = safe_parse_datetime(req_d)
                req_str = req_parsed.strftime("%d %b %Y, %I:%M %p") if req_parsed else str(req_d or "")

                in_val = r.get("issued_for_in_time") or r.get("check_in") or r.get("in_time")
                out_val = r.get("issued_for_out_time") or r.get("check_out") or r.get("out_time")

                in_t = safe_format_time(in_val, "—")
                out_t = safe_format_time(out_val, "—")

                raw_st = r.get("status") or "PENDING_MANAGER"
                st_disp = format_status_display(raw_st)

                # Look up original attendance record for this employee and date
                orig_in_str = "—"
                orig_out_str = "—"
                orig_wh_str = "—"
                orig_status = "Absent"
                if emp_c and tar_d:
                    try:
                        from app.services.attendance_service import safe_parse_date, safe_format_time, safe_calc_hours
                        p_date = safe_parse_date(tar_d)
                        if p_date:
                            att_tbl = f"attendance_{p_date.year}_{p_date.month:02d}"
                            att_q = text(f"""
                                SELECT punch_in_time, punch_out_time, hours_completed, status
                                FROM {att_tbl}
                                WHERE emp_code = :c AND date = :d
                                ORDER BY id DESC LIMIT 1
                            """)
                            att_row = db.execute(att_q, {"c": str(emp_c), "d": p_date}).mappings().first()
                            if att_row:
                                p_in = att_row.get("punch_in_time")
                                p_out = att_row.get("punch_out_time")
                                orig_in_str = safe_format_time(p_in) if p_in else "—"
                                orig_out_str = safe_format_time(p_out) if p_out else "—"
                                hc = att_row.get("hours_completed")
                                if hc is not None and float(hc) > 0:
                                    hf = float(hc)
                                    orig_wh_str = f"{int(hf)}h {int(round((hf % 1) * 60)):02d}m"
                                elif p_in and p_out:
                                    calc_h = safe_calc_hours(p_in, p_out)
                                    orig_wh_str = f"{int(calc_h)}h {int(round((calc_h % 1) * 60)):02d}m"
                                else:
                                    orig_wh_str = "—"
                                orig_status = att_row.get("status") or ("Present" if orig_in_str != "—" and orig_out_str != "—" else "Absent")
                    except Exception:
                        pass

                all_regs.append({
                    "id": actual_id,
                    "rawId": actual_id,
                    "emp_code": emp_c or "",
                    "employeeId": emp_c or "",
                    "name": emp_name,
                    "employeeName": emp_name,
                    "department": r.get("department") or "Operations",
                    "designation": r.get("designation") or "Employee",
                    "location": r.get("branch_location") or "Mumbai, IN",
                    "date": str(tar_d or ""),
                    "attendanceDate": tar_str,
                    "effectiveDate": str(tar_d or ""),
                    "targetDate": str(tar_d or ""),
                    "target_date": str(tar_d or ""),
                    "appliedDate": req_str,
                    "requestDate": req_str,
                    "request_date": str(req_d or ""),
                    "created_at": str(req_d or ""),
                    "submittedOn": req_str,
                    "submitted_on": req_str,
                    "checkIn": in_t,
                    "checkOut": out_t,
                    "inTime": in_t,
                    "outTime": out_t,
                    "issued_for_in_time": str(in_val) if in_val else None,
                    "issued_for_out_time": str(out_val) if out_val else None,
                    "requestedTimings": f"In: {in_t} Out: {out_t}" if in_t != "—" or out_t != "—" else "—",
                    "original_check_in": orig_in_str,
                    "original_check_out": orig_out_str,
                    "original_working_hours": orig_wh_str,
                    "original_status": orig_status,
                    "issue": r.get("comment") or "Attendance correction",
                    "reason": r.get("comment") or "",
                    "comment": r.get("comment") or "",
                    "status": raw_st,
                    "statusDisplay": st_disp,
                    "approval_level": r.get("approval_level") or 1,
                    "manager_action": r.get("manager_action") or "—",
                    "manager_comment": r.get("manager_comment") or "—",
                    "admin_action": r.get("admin_action") or "—",
                    "admin_comment": r.get("admin_comment") or "—",
                    "manager_id": r.get("manager_id") or r.get("reporting_supervisor") or "",
                    "manager_name": r.get("manager_name") or "",
                    "approver": r.get("manager_name") or r.get("reporting_supervisor") or "Reporting Manager",
                    "reviewer": r.get("manager_name") or r.get("manager_id") or "Manager",
                    "review_date": str(r.get("updated_at") or "")[:19] if r.get("updated_at") else "—",
                    "rejection_reason": r.get("manager_comment") or r.get("admin_comment") or "",
                    "type": "Pending" if "PENDING" in raw_st.upper() else ("Completed" if "COMPLETED" in raw_st.upper() or "APPROVED" in raw_st.upper() else "Rejected")
                })
        except Exception:
            continue

    all_regs.sort(key=lambda x: str(x.get("id") or ""), reverse=True)
    return all_regs


def get_manager_regularizations(db: Session, manager_code: str, team_codes: List[str] = None) -> List[dict]:
    """Fetches regularizations for a manager's direct team."""
    all_regs = get_all_regularizations_admin(db)
    codes_set = set(team_codes or [])
    if manager_code:
        codes_set.add(manager_code)

    results = []
    for r in all_regs:
        if r.get("manager_id") == manager_code or r.get("emp_code") in codes_set:
            results.append(r)
    return results