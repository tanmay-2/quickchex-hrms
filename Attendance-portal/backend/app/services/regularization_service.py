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


def ensure_monthly_reg_table(db: Session, table_name: str):
    """Ensures dynamic monthly regularization table exists with full schema."""
    try:
        db.execute(text(f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                id SERIAL PRIMARY KEY,
                emp_code VARCHAR(50) NOT NULL,
                target_date DATE NOT NULL,
                issued_for_in_time TIMESTAMP,
                issued_for_out_time TIMESTAMP,
                status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
                overall_status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
                manager_status VARCHAR(50) DEFAULT 'PENDING',
                admin_status VARCHAR(50) DEFAULT 'PENDING',
                comment TEXT,
                employee_id VARCHAR(50),
                employee_name VARCHAR(150),
                manager_id VARCHAR(50),
                manager_name VARCHAR(150),
                approval_level INTEGER DEFAULT 1,
                manager_action VARCHAR(50),
                manager_reviewed_by VARCHAR(150),
                manager_reviewed_at TIMESTAMP,
                manager_comment TEXT,
                manager_rejection_reason TEXT,
                admin_action VARCHAR(50),
                admin_reviewed_by VARCHAR(150),
                admin_reviewed_at TIMESTAMP,
                admin_comment TEXT,
                admin_rejection_reason TEXT,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Notice on ensure_monthly_reg_table for {table_name}: {e}")


def get_all_reg_tables(db: Session):
    """Returns all dynamic monthly regularization tables in the database."""
    tables = []

    # Primary: query information_schema directly
    try:
        rows = db.execute(text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name LIKE 'regularization_20%'"
        )).fetchall()
        for row in rows:
            t = row[0]
            if t not in tables:
                tables.append(t)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    # Fallback: SQLAlchemy inspect
    if not tables:
        try:
            insp = inspect(db.bind)
            for t in insp.get_table_names():
                if t.startswith("regularization_20") and t not in tables:
                    tables.append(t)
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass

    return tables


def format_status_display(status_code: str) -> str:
    """Standardizes human-readable regularization status label."""
    s = str(status_code or "Pending").strip().upper()
    if s in ("PENDING_MANAGER", "PENDING"):
        return "Pending Manager Approval"
    elif s in ("PENDING_ADMIN", "APPROVED_BY_MANAGER"):
        return "Pending Admin Approval"
    elif s in ("COMPLETED", "APPROVED"):
        return "Approved"
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
    """
    Level 1: Employee submits a regularization request.
    Initial state: PENDING_MANAGER (manager_status=PENDING, admin_status=PENDING).
    No attendance corrections applied yet.
    """
    emp_prof = db.query(Profile).filter(
        (Profile.emp_code == emp_code) | (Profile.email.ilike(emp_code))
    ).first()

    emp_name = f"{emp_prof.first_name or ''} {emp_prof.last_name or ''}".strip() if emp_prof else emp_code
    manager_id = emp_prof.reporting_supervisor if emp_prof else None
    
    mgr_prof = db.query(Profile).filter(
        (Profile.emp_code == manager_id) | (Profile.email.ilike(manager_id))
    ).first() if manager_id else None
    manager_name = f"{mgr_prof.first_name or ''} {mgr_prof.last_name or ''}".strip() if mgr_prof else (manager_id or "Unassigned")

    from app.services.attendance_service import IST, safe_parse_date, get_ist_now, get_ist_today
    if isinstance(target_date, str):
        target_date = safe_parse_date(target_date) or get_ist_today()
    elif isinstance(target_date, datetime):
        target_date = target_date.date()
    elif not target_date:
        target_date = get_ist_today()

    # Ensure in_time and out_time are naive IST datetimes matching target_date
    if in_time:
        if getattr(in_time, "tzinfo", None) is not None:
            in_time = in_time.astimezone(IST).replace(tzinfo=None)
        in_time = datetime.combine(target_date, in_time.time())

    if out_time:
        if getattr(out_time, "tzinfo", None) is not None:
            out_time = out_time.astimezone(IST).replace(tzinfo=None)
        out_time = datetime.combine(target_date, out_time.time())

    now = get_ist_now().replace(tzinfo=None)
    # Dynamic monthly table derived strictly from the actual regularization target date
    reg_table = get_monthly_reg_table_name(target_date)
    ensure_monthly_reg_table(db, reg_table)

    new_id = None
    try:
        # 1. Insert into static regularizations table to generate authoritative sequential ID
        static_sql = text("""
            INSERT INTO regularizations (
                emp_code, target_date, issued_for_in_time, issued_for_out_time,
                comment, status, overall_status, manager_status, admin_status,
                employee_id, employee_name, manager_id, manager_name,
                approval_level, submitted_at, created_at, updated_at
            ) VALUES (
                :code, :t_date, :in_t, :out_t,
                :comm, 'PENDING_MANAGER', 'PENDING_MANAGER', 'PENDING', 'PENDING',
                :code, :e_name, :m_id, :m_name,
                1, :now, :now, :now
            ) RETURNING id;
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
        res = db.execute(static_sql, params)
        row = res.fetchone()
        new_id = row[0] if row else None
        if not new_id:
            raise RuntimeError("Database failed to generate ID for regularization request.")

        # 2. Insert into dynamic monthly table with the exact same ID
        monthly_sql = text(f"""
            INSERT INTO {reg_table} (
                id, emp_code, target_date, issued_for_in_time, issued_for_out_time,
                comment, status, overall_status, manager_status, admin_status,
                employee_id, employee_name, manager_id, manager_name,
                approval_level, submitted_at, created_at, updated_at
            ) VALUES (
                :nid, :code, :t_date, :in_t, :out_t,
                :comm, 'PENDING_MANAGER', 'PENDING_MANAGER', 'PENDING', 'PENDING',
                :code, :e_name, :m_id, :m_name,
                1, :now, :now, :now
            ) ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                overall_status = EXCLUDED.overall_status,
                updated_at = EXCLUDED.updated_at;
        """)
        m_params = {
            "nid": new_id,
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
        db.execute(monthly_sql, m_params)
        try:
            db.execute(text(f"SELECT setval(pg_get_serial_sequence('{reg_table}', 'id'), COALESCE((SELECT MAX(id) FROM {reg_table}), 1), true)"))
        except Exception:
            pass

        # Atomic commit to PostgreSQL
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting regularization into database: {e}")
        raise RuntimeError(f"Database write failed for regularization: {e}")

    return {
        "id": new_id,
        "rawId": new_id,
        "emp_code": emp_code,
        "employee_name": emp_name,
        "manager_id": manager_id,
        "manager_name": manager_name,
        "status": "PENDING_MANAGER",
        "overall_status": "PENDING_MANAGER",
        "manager_status": "PENDING",
        "admin_status": "PENDING",
        "statusDisplay": "Pending Manager Approval",
        "approval_level": 1,
        "target_date": str(target_date),
        "issued_for_in_time": in_time.isoformat() if in_time else None,
        "issued_for_out_time": out_time.isoformat() if out_time else None,
        "comment": comment,
        "submitted_at": now.isoformat()
    }


def find_regularization_globally(db: Session, req_id: int):
    """Searches for a regularization request across static and all dynamic tables."""
    try:
        query = text("SELECT * FROM regularizations WHERE id = :id")
        row = db.execute(query, {"id": int(req_id)}).mappings().first()
        if row:
            return dict(row), "regularizations"
    except Exception:
        pass

    tables = get_all_reg_tables(db)
    for t_name in tables:
        try:
            query = text(f"SELECT * FROM {t_name} WHERE id = :id")
            row = db.execute(query, {"id": int(req_id)}).mappings().first()
            if row:
                return dict(row), t_name
        except Exception:
            continue

    return None, None


def manager_action_request(db: Session, req_id: int, action: str, comment: str = "", manager_name: str = "Manager") -> Optional[dict]:
    """
    Level 1 Review (Manager):
    - action == 'Approved':
      manager_status = 'APPROVED'
      overall_status = 'PENDING_ADMIN'
      admin_status = 'PENDING'
      status = 'PENDING_ADMIN'
      approval_level = 2
      DO NOT immediately apply attendance correction.
    - action == 'Rejected':
      manager_status = 'REJECTED'
      overall_status = 'REJECTED'
      status = 'Rejected'
      approval_level = 2
    """
    req, found_table = find_regularization_globally(db, req_id)
    if not req:
        return None

    current_overall = str(req.get("overall_status") or req.get("status") or "").upper()
    if current_overall in ("APPROVED", "COMPLETED", "REJECTED"):
        raise ValueError("This regularization request has already been processed.")

    is_approve = action.lower() == "approved"
    now = datetime.now()

    if is_approve:
        overall_st = "APPROVED"
        mgr_st = "APPROVED"
        adm_st = "APPROVED"
        ui_st = "Approved"
        mgr_comm = comment or "Approved by Manager"
        mgr_rej = None
    else:
        overall_st = "REJECTED"
        mgr_st = "REJECTED"
        adm_st = "REJECTED"
        ui_st = "Rejected"
        mgr_comm = None
        mgr_rej = comment or "Rejected by Manager"

    tables_to_update = set(get_all_reg_tables(db))
    tables_to_update.add("regularizations")
    if found_table:
        tables_to_update.add(found_table)

    emp_code = req.get("emp_code")
    target_d = req.get("target_date")
    if target_d:
        try:
            if isinstance(target_d, str):
                t_obj = datetime.strptime(target_d[:10], "%Y-%m-%d").date()
            else:
                t_obj = target_d
            tables_to_update.add(get_monthly_reg_table_name(t_obj))
        except Exception:
            pass

    for t in tables_to_update:
        try:
            db.execute(text(f"""
                UPDATE {t}
                SET status = :status,
                    overall_status = :ost,
                    manager_status = :mst,
                    admin_status = :ast,
                    approval_level = 2,
                    manager_action = :act,
                    manager_reviewed_by = :mname,
                    manager_reviewed_at = :now,
                    manager_comment = COALESCE(:comm, manager_comment),
                    manager_rejection_reason = COALESCE(:mrej, manager_rejection_reason),
                    updated_at = :now
                WHERE id = :id OR (emp_code = :c AND target_date = :td)
            """), {
                "status": ui_st,
                "ost": overall_st,
                "mst": mgr_st,
                "ast": adm_st,
                "act": action,
                "mname": manager_name,
                "comm": mgr_comm,
                "mrej": mgr_rej,
                "now": now,
                "id": int(req_id),
                "c": emp_code,
                "td": target_d
            })
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Error updating regularization in {t}: {e}")

    # Synchronize Attendance dynamically and live upon Manager Approval
    if is_approve:
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

            in_dt_obj = safe_parse_datetime(in_time)
            out_dt_obj = safe_parse_datetime(out_time)
            in_time_db = in_dt_obj.replace(tzinfo=None) if in_dt_obj else None
            out_time_db = out_dt_obj.replace(tzinfo=None) if out_dt_obj else None

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
                        "in_time": in_time_db,
                        "out_time": out_time_db,
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
                        "in_time": in_time_db,
                        "out_time": out_time_db,
                        "hours": hours,
                        "st": att_status
                    })
                db.commit()
                logger.info(f"Attendance synchronized for {emp_code} on {target_d} to {att_status} ({hours}h) via Manager approval")
            except Exception as err:
                db.rollback()
                logger.warning(f"Failed updating attendance table {att_table} on manager approve: {err}")

    req["status"] = ui_st
    req["overall_status"] = overall_st
    req["manager_status"] = mgr_st
    req["admin_status"] = adm_st
    req["statusDisplay"] = format_status_display(overall_st)
    req["manager_action"] = action
    req["manager_reviewed_by"] = manager_name
    req["manager_reviewed_at"] = now.isoformat()
    req["manager_comment"] = mgr_comm
    req["manager_rejection_reason"] = mgr_rej
    req["approval_level"] = 2
    return req


def admin_action_request(db: Session, req_id: int, action: str, comment: str = "", admin_name: str = "Admin Approver") -> Optional[dict]:
    """
    Level 2 Review (Admin):
    - action == 'Approved':
      admin_status = 'APPROVED'
      overall_status = 'APPROVED'
      status = 'Approved'
      approval_level = 3
      NOW AND ONLY NOW: update attendance and recalculate working hours:
      >= 9.0h => Present
      >= 5.0h and < 9.0h => Half Day
      < 5.0h => Absent
    - action == 'Rejected':
      admin_status = 'REJECTED'
      overall_status = 'REJECTED'
      status = 'Rejected'
      approval_level = 3
    """
    req, found_table = find_regularization_globally(db, req_id)
    if not req:
        return None

    current_overall = str(req.get("overall_status") or req.get("status") or "").upper().strip()
    if current_overall in ("APPROVED", "COMPLETED", "REJECTED"):
        raise ValueError("This regularization request has already been processed.")
    if current_overall not in ("PENDING_MANAGER", "PENDING_ADMIN", "PENDING", "APPROVED_BY_MANAGER"):
        raise ValueError(f"Cannot process request in status '{current_overall}'.")

    is_approve = action.lower() == "approved"
    if not is_approve and not (comment and str(comment).strip()):
        raise ValueError("Reason for rejection is required.")

    now = datetime.now()

    if is_approve:
        overall_st = "APPROVED"
        mgr_st = "APPROVED"
        adm_st = "APPROVED"
        ui_st = "Approved"
        adm_comm = comment or "Approved by Admin"
        adm_rej = None
    else:
        overall_st = "REJECTED"
        mgr_st = req.get("manager_status") or "APPROVED"
        adm_st = "REJECTED"
        ui_st = "Rejected"
        adm_comm = None
        adm_rej = comment or "Rejected by Admin"

    tables_to_update = set(get_all_reg_tables(db))
    tables_to_update.add("regularizations")
    if found_table:
        tables_to_update.add(found_table)

    emp_code = req.get("emp_code")
    target_d = req.get("target_date")
    if target_d:
        try:
            if isinstance(target_d, str):
                t_obj = datetime.strptime(target_d[:10], "%Y-%m-%d").date()
            else:
                t_obj = target_d
            tables_to_update.add(get_monthly_reg_table_name(t_obj))
        except Exception:
            pass

    for t in tables_to_update:
        try:
            db.execute(text(f"""
                UPDATE {t}
                SET status = :status,
                    overall_status = :ost,
                    manager_status = :mst,
                    admin_status = :ast,
                    approval_level = 3,
                    admin_action = :act,
                    admin_reviewed_by = :aname,
                    admin_reviewed_at = :now,
                    admin_comment = COALESCE(:comm, admin_comment),
                    admin_rejection_reason = COALESCE(:arej, admin_rejection_reason),
                    updated_at = :now
                WHERE id = :id OR (emp_code = :c AND target_date = :td)
            """), {
                "status": ui_st,
                "ost": overall_st,
                "mst": mgr_st,
                "ast": adm_st,
                "act": action,
                "aname": admin_name,
                "comm": adm_comm,
                "arej": adm_rej,
                "now": now,
                "id": int(req_id),
                "c": emp_code,
                "td": target_d
            })
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Error updating regularization in {t}: {e}")

    # Synchronize Attendance ONLY upon final Admin approval
    if is_approve:
        in_time = req.get("issued_for_in_time")
        out_time = req.get("issued_for_out_time")

        if isinstance(target_d, str):
            try:
                target_d = date.fromisoformat(target_d[:10])
            except Exception:
                target_d = date.today()

        if emp_code and target_d:
            att_table = f"attendance_{target_d.year}_{target_d.month:02d}"

            # Calculate completed hours and authoritative status (>=9h: Present, >=5h: Half Day, <5h: Absent)
            from app.services.attendance_service import calculate_attendance_status
            calc = calculate_attendance_status(
                punch_in_time=in_time,
                punch_out_time=out_time,
                target_date=target_d
            )
            att_status = calc["status"]
            hours = calc["hours"]

            in_dt_obj = safe_parse_datetime(in_time)
            out_dt_obj = safe_parse_datetime(out_time)
            in_time_db = in_dt_obj.replace(tzinfo=None) if in_dt_obj else None
            out_time_db = out_dt_obj.replace(tzinfo=None) if out_dt_obj else None

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
                        "in_time": in_time_db,
                        "out_time": out_time_db,
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
                        "in_time": in_time_db,
                        "out_time": out_time_db,
                        "hours": hours,
                        "st": att_status
                    })
                db.commit()
                logger.info(f"Attendance synchronized for {emp_code} on {target_d} to {att_status} ({hours}h)")
            except Exception as err:
                db.rollback()
                logger.warning(f"Failed updating attendance table {att_table}: {err}")

    req["status"] = ui_st
    req["overall_status"] = overall_st
    req["manager_status"] = mgr_st
    req["admin_status"] = adm_st
    req["statusDisplay"] = format_status_display(overall_st)
    req["admin_action"] = action
    req["admin_reviewed_by"] = admin_name
    req["admin_reviewed_at"] = now.isoformat()
    req["admin_comment"] = adm_comm
    req["admin_rejection_reason"] = adm_rej
    req["approval_level"] = 3
    return req


def update_request_status(db: Session, req_id: int, new_status: str, admin_name: str = "Admin Approver", comment: str = ""):
    """Bridge for PUT endpoints calling approve/reject."""
    s_clean = new_status.lower()
    req, _ = find_regularization_globally(db, req_id)
    if not req:
        return None
    curr_st = str(req.get("overall_status") or req.get("status") or "").upper()
    if curr_st == "PENDING_MANAGER":
        if "approve" in s_clean:
            return manager_action_request(db, req_id, "Approved", comment=comment, manager_name=admin_name)
        elif "reject" in s_clean:
            return manager_action_request(db, req_id, "Rejected", comment=comment, manager_name=admin_name)
    else:
        if "approve" in s_clean:
            return admin_action_request(db, req_id, "Approved", comment=comment, admin_name=admin_name)
        elif "reject" in s_clean:
            return admin_action_request(db, req_id, "Rejected", comment=comment, admin_name=admin_name)
    return None


def get_all_regularizations_admin(db: Session, supervisor_code: str = None) -> List[dict]:
    """
    Authoritative query: returns all regularization requests across the system
    joined with profile_master for full employee metadata and exact 2-level status.
    """
    all_regs = []
    seen_keys = set()

    try:
        where_clause = ""
        params = {}
        if supervisor_code:
            where_clause = "WHERE (p.reporting_supervisor = :sup OR r.manager_id = :sup)"
            params["sup"] = supervisor_code

        query = text(f"""
            SELECT r.*, p.first_name, p.last_name, p.email, p.mobile_no, p.department, p.designation, p.reporting_supervisor, p.branch_location, p.emp_join_date
            FROM regularizations r
            LEFT JOIN profile_master p ON r.emp_code = p.emp_code
            {where_clause}
            ORDER BY r.id DESC
        """)
        rows = db.execute(query, params).mappings().all()
        for r in rows:
            actual_id = r.get("id")
            comp_key = (str(r.get("emp_code") or "").upper().strip(), str(r.get("target_date") or "").strip())
            if actual_id in seen_keys or comp_key in seen_keys:
                continue
            seen_keys.add(actual_id)
            seen_keys.add(comp_key)

            emp_c = r.get("emp_code")
            emp_name = r.get("employee_name") or f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or emp_c or "Employee"
            tar_d = r.get("target_date")
            req_d = r.get("submitted_at") or r.get("created_at") or r.get("request_date") or tar_d
            from app.services.attendance_service import safe_parse_date, safe_parse_datetime, safe_format_time, safe_format_date, safe_calc_hours
            tar_parsed = safe_parse_date(tar_d)
            tar_str = safe_format_date(tar_parsed, "%d %b %Y") if tar_parsed else str(tar_d or "")

            req_parsed = safe_parse_datetime(req_d)
            req_str = req_parsed.strftime("%d %b %Y, %I:%M %p") if req_parsed else str(req_d or "")

            in_val = r.get("issued_for_in_time") or r.get("check_in") or r.get("in_time")
            out_val = r.get("issued_for_out_time") or r.get("check_out") or r.get("out_time")

            in_t = safe_format_time(in_val, "—")
            out_t = safe_format_time(out_val, "—")

            if in_val and out_val:
                calc_wh = safe_calc_hours(in_val, out_val)
                req_wh_str = f"{int(calc_wh)}h {int(round((calc_wh % 1) * 60)):02d}m"
            else:
                req_wh_str = "—"

            # Two-level status mapping
            raw_overall = str(r.get("overall_status") or "").upper().strip()
            raw_status = str(r.get("status") or "").upper().strip()

            if raw_overall in ("PENDING_ADMIN", "PENDING_MANAGER", "APPROVED", "REJECTED"):
                overall_st = raw_overall
            elif "APPROV" in raw_status or "COMPLET" in raw_status:
                overall_st = "APPROVED"
            elif "REJECT" in raw_status:
                overall_st = "REJECTED"
            elif raw_status in ("PENDING_ADMIN", "APPROVED_BY_MANAGER"):
                overall_st = "PENDING_ADMIN"
            else:
                overall_st = "PENDING_MANAGER"

            mgr_st = str(r.get("manager_status") or "").upper().strip()
            if not mgr_st or mgr_st == "NONE":
                if overall_st in ("PENDING_ADMIN", "APPROVED"):
                    mgr_st = "APPROVED"
                elif overall_st == "REJECTED" and "manager" in str(r.get("manager_rejection_reason") or "").lower():
                    mgr_st = "REJECTED"
                else:
                    mgr_st = "PENDING"

            adm_st = str(r.get("admin_status") or "").upper().strip()
            if not adm_st or adm_st == "NONE":
                if overall_st == "APPROVED":
                    adm_st = "APPROVED"
                elif overall_st == "REJECTED" and "admin" in str(r.get("admin_rejection_reason") or "").lower():
                    adm_st = "REJECTED"
                else:
                    adm_st = "PENDING"

            st_disp = format_status_display(overall_st)

            # Original attendance data
            orig_in_str = "—"
            orig_out_str = "—"
            orig_wh_str = "—"
            orig_status = "Absent"
            if emp_c and tar_d:
                try:
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

            email_val = r.get("email") or "—"
            mobile_val = r.get("mobile_no") or r.get("phone") or "—"

            all_regs.append({
                "id": actual_id,
                "rawId": actual_id,
                "emp_code": emp_c or "",
                "employeeId": emp_c or "",
                "name": emp_name,
                "employeeName": emp_name,
                "email": email_val,
                "contact_number": mobile_val,
                "contactNumber": mobile_val,
                "phone": mobile_val,
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
                "submitted_at": str(req_d or ""),
                "checkIn": in_t,
                "checkOut": out_t,
                "inTime": in_t,
                "outTime": out_t,
                "requested_check_in": in_t,
                "requested_check_out": out_t,
                "requestedCheckIn": in_t,
                "requestedCheckOut": out_t,
                "working_hours": req_wh_str,
                "workingHours": req_wh_str,
                "issued_for_in_time": str(in_val) if in_val else None,
                "issued_for_out_time": str(out_val) if out_val else None,
                "requestedTimings": f"In: {in_t} Out: {out_t}" if in_t != "—" or out_t != "—" else "—",
                "original_check_in": orig_in_str,
                "original_check_out": orig_out_str,
                "originalCheckIn": orig_in_str,
                "originalCheckOut": orig_out_str,
                "original_working_hours": orig_wh_str,
                "originalWorkingHours": orig_wh_str,
                "original_status": orig_status,
                "issue": r.get("comment") or "Attendance correction",
                "reason": r.get("comment") or "",
                "comment": r.get("comment") or "",
                "status": overall_st,
                "statusDisplay": st_disp,
                "overall_status": overall_st,
                "manager_status": mgr_st,
                "admin_status": adm_st,
                "approval_level": r.get("approval_level") or 1,
                "manager_action": r.get("manager_action") or mgr_st,
                "manager_reviewed_by": r.get("manager_reviewed_by"),
                "manager_reviewed_at": str(r.get("manager_reviewed_at") or ""),
                "manager_comment": r.get("manager_comment") or "",
                "manager_rejection_reason": r.get("manager_rejection_reason") or "",
                "admin_action": r.get("admin_action") or adm_st,
                "admin_reviewed_by": r.get("admin_reviewed_by"),
                "admin_reviewed_at": str(r.get("admin_reviewed_at") or ""),
                "admin_comment": r.get("admin_comment") or "",
                "admin_rejection_reason": r.get("admin_rejection_reason") or "",
                "manager_id": r.get("manager_id") or r.get("reporting_supervisor") or "MGR001",
                "manager_name": r.get("manager_name") or "Manager",
                "approver": r.get("admin_reviewed_by") or r.get("manager_name") or "Reporting Manager",
                "reviewer": r.get("manager_name") or "Manager",
                "review_date": str(r.get("updated_at") or "")[:19] if r.get("updated_at") else "—",
                "rejection_reason": r.get("admin_rejection_reason") or r.get("manager_rejection_reason") or r.get("comment") or "",
                "type": "Pending" if "PENDING" in overall_st else ("Completed" if overall_st in ("APPROVED", "REJECTED") else "Pending")
            })
    except Exception as e:
        logger.error(f"Error fetching from regularizations: {e}")

    # Also scan dynamic tables
    tables = get_all_reg_tables(db)
    for t_name in tables:
        try:
            m_rows = db.execute(text(f"""
                SELECT r.*, p.first_name, p.last_name, p.email, p.mobile_no, p.department, p.designation, p.reporting_supervisor, p.branch_location, p.emp_join_date
                FROM {t_name} r
                LEFT JOIN profile_master p ON r.emp_code = p.emp_code
                ORDER BY r.id DESC
            """)).mappings().all()
            for r in m_rows:
                actual_id = r.get("id")
                comp_key = (str(r.get("emp_code") or "").upper().strip(), str(r.get("target_date") or "").strip())
                if (actual_id and actual_id in seen_keys) or comp_key in seen_keys:
                    continue
                if actual_id:
                    seen_keys.add(actual_id)
                seen_keys.add(comp_key)

                emp_c = r.get("emp_code")
                emp_name = r.get("employee_name") or f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or emp_c or "Employee"
                tar_d = r.get("target_date")
                req_d = r.get("submitted_at") or r.get("created_at") or tar_d
                from app.services.attendance_service import safe_parse_date, safe_parse_datetime, safe_format_time, safe_format_date, safe_calc_hours
                tar_parsed = safe_parse_date(tar_d)
                tar_str = safe_format_date(tar_parsed, "%d %b %Y") if tar_parsed else str(tar_d or "")
                req_parsed = safe_parse_datetime(req_d)
                req_str = req_parsed.strftime("%d %b %Y, %I:%M %p") if req_parsed else str(req_d or "")

                in_val = r.get("issued_for_in_time")
                out_val = r.get("issued_for_out_time")
                in_t = safe_format_time(in_val, "—")
                out_t = safe_format_time(out_val, "—")

                if in_val and out_val:
                    calc_wh = safe_calc_hours(in_val, out_val)
                    req_wh_str = f"{int(calc_wh)}h {int(round((calc_wh % 1) * 60)):02d}m"
                else:
                    req_wh_str = "—"

                raw_overall = str(r.get("overall_status") or r.get("status") or "PENDING_MANAGER").upper()
                if "APPROV" in raw_overall or "COMPLET" in raw_overall:
                    overall_st = "APPROVED"
                elif "REJECT" in raw_overall:
                    overall_st = "REJECTED"
                elif raw_overall in ("PENDING_ADMIN", "APPROVED_BY_MANAGER"):
                    overall_st = "PENDING_ADMIN"
                else:
                    overall_st = "PENDING_MANAGER"

                mgr_st = str(r.get("manager_status") or "").upper().strip()
                if not mgr_st or mgr_st == "NONE":
                    if overall_st in ("PENDING_ADMIN", "APPROVED"):
                        mgr_st = "APPROVED"
                    elif overall_st == "REJECTED" and "manager" in str(r.get("manager_rejection_reason") or "").lower():
                        mgr_st = "REJECTED"
                    else:
                        mgr_st = "PENDING"

                adm_st = str(r.get("admin_status") or "").upper().strip()
                if not adm_st or adm_st == "NONE":
                    if overall_st == "APPROVED":
                        adm_st = "APPROVED"
                    elif overall_st == "REJECTED" and "admin" in str(r.get("admin_rejection_reason") or "").lower():
                        adm_st = "REJECTED"
                    else:
                        adm_st = "PENDING"

                st_disp = format_status_display(overall_st)

                # Original attendance data
                orig_in_str = "—"
                orig_out_str = "—"
                orig_wh_str = "—"
                orig_status = "Absent"
                if emp_c and tar_d:
                    try:
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

                email_val = r.get("email") or "—"
                mobile_val = r.get("mobile_no") or r.get("phone") or "—"

                all_regs.append({
                    "id": actual_id,
                    "rawId": actual_id,
                    "emp_code": emp_c or "",
                    "employeeId": emp_c or "",
                    "name": emp_name,
                    "employeeName": emp_name,
                    "email": email_val,
                    "contact_number": mobile_val,
                    "contactNumber": mobile_val,
                    "phone": mobile_val,
                    "department": r.get("department") or "Operations",
                    "designation": r.get("designation") or "Employee",
                    "location": r.get("branch_location") or "Mumbai, IN",
                    "date": str(tar_d or ""),
                    "attendanceDate": tar_str,
                    "targetDate": str(tar_d or ""),
                    "target_date": str(tar_d or ""),
                    "appliedDate": req_str,
                    "requestDate": req_str,
                    "submittedOn": req_str,
                    "submitted_on": req_str,
                    "submitted_at": str(req_d or ""),
                    "checkIn": in_t,
                    "checkOut": out_t,
                    "inTime": in_t,
                    "outTime": out_t,
                    "requested_check_in": in_t,
                    "requested_check_out": out_t,
                    "requestedCheckIn": in_t,
                    "requestedCheckOut": out_t,
                    "working_hours": req_wh_str,
                    "workingHours": req_wh_str,
                    "issued_for_in_time": str(in_val) if in_val else None,
                    "issued_for_out_time": str(out_val) if out_val else None,
                    "requestedTimings": f"In: {in_t} Out: {out_t}" if in_t != "—" or out_t != "—" else "—",
                    "original_check_in": orig_in_str,
                    "original_check_out": orig_out_str,
                    "originalCheckIn": orig_in_str,
                    "originalCheckOut": orig_out_str,
                    "original_working_hours": orig_wh_str,
                    "originalWorkingHours": orig_wh_str,
                    "original_status": orig_status,
                    "issue": r.get("comment") or "Attendance correction",
                    "reason": r.get("comment") or "",
                    "comment": r.get("comment") or "",
                    "status": overall_st,
                    "statusDisplay": st_disp,
                    "overall_status": overall_st,
                    "manager_status": mgr_st,
                    "admin_status": adm_st,
                    "approval_level": r.get("approval_level") or 1,
                    "manager_action": r.get("manager_action") or mgr_st,
                    "manager_reviewed_by": r.get("manager_reviewed_by"),
                    "manager_reviewed_at": str(r.get("manager_reviewed_at") or ""),
                    "manager_comment": r.get("manager_comment") or "",
                    "manager_rejection_reason": r.get("manager_rejection_reason") or "",
                    "admin_action": r.get("admin_action") or adm_st,
                    "admin_reviewed_by": r.get("admin_reviewed_by"),
                    "admin_reviewed_at": str(r.get("admin_reviewed_at") or ""),
                    "admin_comment": r.get("admin_comment") or "",
                    "admin_rejection_reason": r.get("admin_rejection_reason") or "",
                    "manager_id": r.get("manager_id") or "MGR001",
                    "manager_name": r.get("manager_name") or "Manager",
                    "approver": r.get("admin_reviewed_by") or r.get("manager_name") or "Reporting Manager",
                    "type": "Pending" if "PENDING" in overall_st else "Completed"
                })
        except Exception:
            continue


    all_regs.sort(key=lambda x: str(x.get("id") or ""), reverse=True)
    return all_regs


def get_manager_regularizations(db: Session, manager_code: str, team_codes: List[str] = None) -> List[dict]:
    """Fetches regularizations for a manager's direct team."""
    all_regs = get_all_regularizations_admin(db)
    codes_set = {str(code).upper().strip() for code in (team_codes or []) if code}
    mgr_clean = str(manager_code or "").upper().strip()
    if mgr_clean:
        codes_set.add(mgr_clean)

    results = []
    for r in all_regs:
        employee_code = str(r.get("emp_code") or "").upper().strip()
        r_mgr_id = str(r.get("manager_id") or "").upper().strip()
        r_mgr_name = str(r.get("manager_name") or "").upper().strip()
        if employee_code in codes_set or (mgr_clean and (r_mgr_id == mgr_clean or mgr_clean in r_mgr_name)):
            results.append(r)
    return results


def get_my_regularizations(db: Session, emp_code: str) -> List[dict]:
    """Fetches regularizations for a specific employee."""
    all_regs = get_all_regularizations_admin(db)
    emp_upper = emp_code.upper().strip()
    return [r for r in all_regs if (r.get("emp_code") or "").upper().strip() == emp_upper]
