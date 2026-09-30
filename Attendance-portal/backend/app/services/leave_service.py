from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from app.models.leave import LeaveRequest, LeaveBalance
from app.models.profile_model import Profile
from datetime import date, datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# --- HELPER LOGIC ---

def get_monthly_table_name(date_obj: date):
    """Generates table name like leave_2026_04"""
    return f"leave_{date_obj.year}_{date_obj.month:02d}"

def get_all_leave_tables(db: Session):
    table_names = []
    try:
        insp = inspect(db.bind)
        for t in insp.get_table_names():
            if t.startswith("leave_20") and t not in table_names:
                table_names.append(t)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    return table_names

def find_leave_by_id_globally(db: Session, leave_id: int):
    """
    Checks all dynamic monthly tables and static leave_requests table
    to find where this specific leave_id exists.
    """
    # 1. First check static leave_requests
    try:
        s_query = text("SELECT * FROM leave_requests WHERE id = :id")
        res = db.execute(s_query, {"id": int(leave_id)}).mappings().first()
        if res:
            return dict(res), "leave_requests"
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    # 2. Check dynamic tables
    table_names = get_all_leave_tables(db)
    for t_name in table_names:
        try:
            query = text(f"SELECT * FROM {t_name} WHERE id = :id")
            res = db.execute(query, {"id": int(leave_id)}).mappings().first()
            if res:
                return dict(res), t_name
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass
            continue

    return None, None

def ensure_leave_table(db: Session, table_name: str):
    """Ensures dynamic monthly leave table exists with proper schema."""
    try:
        db.execute(text(f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                id SERIAL PRIMARY KEY,
                emp_code VARCHAR(50) NOT NULL,
                category VARCHAR(100) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                total_days DOUBLE PRECISION NOT NULL,
                reason TEXT NOT NULL,
                has_half_days BOOLEAN DEFAULT FALSE,
                half_day_details TEXT,
                status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
                overall_status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
                manager_status VARCHAR(50) DEFAULT 'PENDING',
                admin_status VARCHAR(50) DEFAULT 'PENDING',
                manager_reviewed_by VARCHAR(150),
                manager_reviewed_at TIMESTAMP,
                manager_comment TEXT,
                manager_rejection_reason TEXT,
                admin_reviewed_by VARCHAR(150),
                admin_reviewed_at TIMESTAMP,
                admin_comment TEXT,
                admin_rejection_reason TEXT,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                employee_name VARCHAR(150),
                manager_id VARCHAR(50),
                manager_name VARCHAR(150),
                approval_level INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Notice on ensure_leave_table for {table_name}: {e}")

def _parse_date(val, fallback):
    if not val:
        return fallback
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    val_str = str(val).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(val_str[:11].strip(), fmt).date()
        except Exception:
            pass
    try:
        from dateutil.parser import parse
        return parse(val_str).date()
    except Exception:
        pass
    return fallback

def create_leave_request(db: Session, obj_in, emp_code: str):
    """
    Creates a new leave application in state PENDING_MANAGER across
    dynamic monthly table and static leave_requests table with atomic PostgreSQL persistence.
    """
    def _get(field, default=None):
        if isinstance(obj_in, dict):
            return obj_in.get(field, default)
        return getattr(obj_in, field, default)

    start_d = _parse_date(_get("start_date") or _get("from") or _get("fromDate"), date.today())
    end_d = _parse_date(_get("end_date") or _get("to") or _get("toDate"), start_d)
    category = _get("category") or _get("type") or _get("leave_type") or "Casual Leave"
    raw_days = _get("total_days") or _get("days") or 1.0
    try:
        total_days = float(str(raw_days).split()[0])
    except Exception:
        total_days = 1.0

    has_half_days = bool(_get("has_half_days") or _get("halfDay") == "Yes" or total_days == 0.5)
    half_day_details = _get("half_day_details")
    reason = str(_get("reason") or "").strip()

    # Find employee profile and manager info
    emp_prof = db.query(Profile).filter(
        (Profile.emp_code == emp_code) | (Profile.email.ilike(emp_code))
    ).first()
    emp_name = f"{emp_prof.first_name or ''} {emp_prof.last_name or ''}".strip() if emp_prof else emp_code
    manager_id = emp_prof.reporting_supervisor if emp_prof else None
    
    mgr_prof = db.query(Profile).filter(
        (Profile.emp_code == manager_id) | (Profile.email.ilike(manager_id))
    ).first() if manager_id else None
    manager_name = f"{mgr_prof.first_name or ''} {mgr_prof.last_name or ''}".strip() if mgr_prof else (manager_id or "Unassigned")

    now = datetime.now()
    table_name = get_monthly_table_name(start_d)
    ensure_leave_table(db, table_name)

    # 1. Insert into static leave_requests table first to obtain canonical ID
    new_id = None
    try:
        insert_static = text("""
            INSERT INTO leave_requests (
                emp_code, category, start_date, end_date, total_days,
                has_half_days, half_day_details, reason, status,
                overall_status, manager_status, admin_status,
                employee_name, manager_id, manager_name, approval_level,
                submitted_at
            ) VALUES (
                :code, :cat, :start, :end, :days,
                :half, :details, :reason, 'PENDING_MANAGER',
                'PENDING_MANAGER', 'PENDING', 'PENDING',
                :ename, :mid, :mname, 1,
                :now
            ) RETURNING id;
        """)
        res = db.execute(insert_static, {
            "code": emp_code, "cat": category, "start": start_d, "end": end_d, "days": total_days,
            "half": has_half_days, "details": half_day_details, "reason": reason,
            "ename": emp_name, "mid": manager_id, "mname": manager_name, "now": now
        })
        row = res.fetchone()
        new_id = row[0] if row else None
        if not new_id:
            raise RuntimeError("Database failed to generate ID for leave request.")

        # 2. Insert into monthly table with same ID
        insert_monthly = text(f"""
            INSERT INTO {table_name} (
                id, emp_code, category, start_date, end_date, total_days,
                has_half_days, half_day_details, reason, status,
                overall_status, manager_status, admin_status,
                employee_name, manager_id, manager_name, approval_level,
                submitted_at, created_at
            ) VALUES (
                :nid, :code, :cat, :start, :end, :days,
                :half, :details, :reason, 'PENDING_MANAGER',
                'PENDING_MANAGER', 'PENDING', 'PENDING',
                :ename, :mid, :mname, 1,
                :now, :now
            ) ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                overall_status = EXCLUDED.overall_status;
        """)
        db.execute(insert_monthly, {
            "nid": new_id, "code": emp_code, "cat": category, "start": start_d, "end": end_d, "days": total_days,
            "half": has_half_days, "details": half_day_details, "reason": reason,
            "ename": emp_name, "mid": manager_id, "mname": manager_name, "now": now
        })
        try:
            db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE((SELECT MAX(id) FROM {table_name}), 1), true)"))
        except Exception:
            pass

        # Atomic commit to PostgreSQL
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving leave request into database: {e}")
        raise RuntimeError(f"Database write failed for leave application: {e}")

    return {
        "id": new_id,
        "emp_code": emp_code,
        "employee_name": emp_name,
        "category": category,
        "type": category,
        "leave_type": category,
        "start_date": str(start_d),
        "end_date": str(end_d),
        "from": str(start_d),
        "to": str(end_d),
        "from_date": str(start_d),
        "to_date": str(end_d),
        "days": f"{total_days} days",
        "total_days": total_days,
        "reason": reason,
        "status": "PENDING_MANAGER",
        "overall_status": "PENDING_MANAGER",
        "manager_status": "PENDING",
        "admin_status": "PENDING",
        "manager_id": manager_id,
        "manager_name": manager_name,
        "approval_level": 1,
        "submitted_at": now.isoformat()
    }


def get_leave_requests(db: Session, emp_code: str):
    """
    Fetches leave history for a specific employee across leave_requests and dynamic tables.
    """
    all_leaves = get_all_leaves_admin(db)
    emp_upper = emp_code.upper().strip()
    return [l for l in all_leaves if l.get("emp_code", "").upper().strip() == emp_upper]


def get_team_leaves(db: Session, tl_emp_code: str):
    """
    Fetches leave requests for manager's authorized team members.
    """
    all_leaves = get_all_leaves_admin(db)
    tl_upper = (tl_emp_code or "MGR001").upper().strip()

    # Find profiles reporting to this manager (by emp_code, email, or full name)
    mgr_prof = db.query(Profile).filter(
        (Profile.emp_code.ilike(tl_upper)) | (Profile.email.ilike(tl_upper))
    ).first()

    mgr_identifiers = {tl_upper}
    if mgr_prof:
        mgr_identifiers.add((mgr_prof.emp_code or "").upper().strip())
        if mgr_prof.email:
            mgr_identifiers.add(mgr_prof.email.upper().strip())
        fn = mgr_prof.first_name or ""
        ln = mgr_prof.last_name or ""
        full_n = f"{fn} {ln}".strip().upper()
        if full_n:
            mgr_identifiers.add(full_n)

    all_profs = db.query(Profile).all()
    team_codes = set(mgr_identifiers)
    for p in all_profs:
        sup = (p.reporting_supervisor or "").strip().upper()
        if sup and sup in mgr_identifiers:
            team_codes.add((p.emp_code or "").upper().strip())

    results = []
    for l in all_leaves:
        m_id = (l.get("manager_id") or "").upper().strip()
        m_name = (l.get("manager_name") or "").upper().strip()
        e_code = (l.get("emp_code") or "").upper().strip()
        if m_id in mgr_identifiers or m_name in mgr_identifiers or e_code in team_codes:
            results.append(l)

    return results


def get_leave_stats(db: Session, emp_code: str):
    """
    Returns pending count (requests awaiting manager OR admin) and available balance.
    """
    all_leaves = get_all_leaves_admin(db)
    emp_upper = emp_code.upper().strip()
    user_leaves = [l for l in all_leaves if l.get("emp_code", "").upper().strip() == emp_upper]

    pending_count = sum(
        1 for l in user_leaves
        if l.get("overall_status") in ("PENDING_MANAGER", "PENDING_ADMIN") or l.get("status") in ("Pending", "PENDING_MANAGER", "PENDING_ADMIN")
    )

    balance = db.query(LeaveBalance).filter(LeaveBalance.emp_code == emp_code).first()
    if not balance:
        balance = LeaveBalance(emp_code=emp_code, allowed_leaves=21.0, used_leaves=0.0)
        db.add(balance)
        db.commit()
        db.refresh(balance)

    available = max(0.0, float(balance.allowed_leaves or 21.0) - float(balance.used_leaves or 0.0))
    return {
        "pending_count": pending_count,
        "available_balance": available,
        "allowed_leaves": float(balance.allowed_leaves or 21.0),
        "used_leaves": float(balance.used_leaves or 0.0)
    }


def manager_action_leave(db: Session, leave_id: int, action: str, manager_name: str = "Manager", comment: str = ""):
    """
    Level 1 Review (Manager):
    - action == 'Approved':
      manager_status = 'APPROVED'
      overall_status = 'PENDING_ADMIN'
      admin_status = 'PENDING'
      status = 'PENDING_ADMIN'
      DO NOT deduct leave balance.
    - action == 'Rejected':
      manager_status = 'REJECTED'
      overall_status = 'REJECTED'
      status = 'Rejected'
    """
    leave, found_table = find_leave_by_id_globally(db, leave_id)
    if not leave:
        return None

    current_overall = str(leave.get("overall_status") or leave.get("status") or "").upper()
    if current_overall in ("APPROVED", "REJECTED"):
        raise ValueError("This leave application has already been processed.")

    now = datetime.now()
    is_approve = action.lower() == "approved"

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

    tables_to_update = set(get_all_leave_tables(db))
    tables_to_update.add("leave_requests")
    if found_table:
        tables_to_update.add(found_table)

    emp_code = leave.get("emp_code")
    start_date = leave.get("start_date")

    for tbl in tables_to_update:
        try:
            db.execute(text(f"""
                UPDATE {tbl}
                SET overall_status = :ost,
                    manager_status = :mst,
                    admin_status = :ast,
                    status = :st,
                    manager_reviewed_by = :mname,
                    manager_reviewed_at = :now,
                    manager_comment = COALESCE(:mcomm, manager_comment),
                    manager_rejection_reason = COALESCE(:mrej, manager_rejection_reason),
                    approval_level = 2
                WHERE id = :id OR (emp_code = :c AND start_date = :sd)
            """), {
                "ost": overall_st,
                "mst": mgr_st,
                "ast": adm_st,
                "st": ui_st,
                "mname": manager_name,
                "now": now,
                "mcomm": mgr_comm,
                "mrej": mgr_rej,
                "id": int(leave_id),
                "c": emp_code,
                "sd": start_date
            })
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Error updating leave in {tbl}: {e}")

    # Synchronize Leave Balance and Attendance dynamically and live upon Manager Approval
    if is_approve and emp_code:
        raw_days = leave.get("total_days") or 1.0
        try:
            total_days = float(raw_days)
        except Exception:
            total_days = 1.0

        try:
            balance = db.query(LeaveBalance).filter(LeaveBalance.emp_code == emp_code).first()
            if not balance:
                balance = LeaveBalance(emp_code=emp_code, allowed_leaves=21.0, used_leaves=0.0)
                db.add(balance)
            balance.used_leaves = float(balance.used_leaves or 0.0) + total_days
            db.commit()
            logger.info(f"Leave balance updated for {emp_code}: +{total_days} days used upon Manager approval")
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating leave balance on manager approve: {e}")

        # Synchronize attendance for leave dates
        try:
            s_d = _parse_date(start_date, date.today())
            e_d = _parse_date(leave.get("end_date") or start_date, s_d)
            cur = s_d
            cat = leave.get("category") or "Leave"
            while cur <= e_d:
                att_table = f"attendance_{cur.year}_{cur.month:02d}"
                try:
                    att_row = db.execute(
                        text(f"SELECT id FROM {att_table} WHERE emp_code = :c AND date = :d"),
                        {"c": emp_code, "d": cur}
                    ).first()
                    if att_row:
                        db.execute(text(f"""
                            UPDATE {att_table}
                            SET status = 'Leave',
                                remark = :rem,
                                hours_completed = 0.0
                            WHERE emp_code = :c AND date = :d
                        """), {"rem": f"Approved {cat}", "c": emp_code, "d": cur})
                    else:
                        db.execute(text(f"""
                            INSERT INTO {att_table}
                            (emp_code, date, status, remark, hours_completed)
                            VALUES (:c, :d, 'Leave', :rem, 0.0)
                        """), {"rem": f"Approved {cat}", "c": emp_code, "d": cur})
                    db.commit()
                except Exception:
                    db.rollback()
                cur += timedelta(days=1)
        except Exception as e_att_sync:
            logger.warning(f"Leave attendance sync error: {e_att_sync}")

    updated = {
        **leave,
        "overall_status": overall_st,
        "manager_status": mgr_st,
        "admin_status": adm_st,
        "status": ui_st,
        "manager_reviewed_by": manager_name,
        "manager_reviewed_at": now.isoformat(),
        "manager_comment": mgr_comm,
        "manager_rejection_reason": mgr_rej,
        "approval_level": 2
    }
    return updated


def admin_action_leave(db: Session, leave_id: int, action: str, admin_name: str = "Admin Approver", comment: str = ""):
    """
    Level 2 Review (Admin):
    - action == 'Approved':
      admin_status = 'APPROVED'
      overall_status = 'APPROVED'
      status = 'Approved'
      NOW AND ONLY NOW: deduct leave balance
    - action == 'Rejected':
      admin_status = 'REJECTED'
      overall_status = 'REJECTED'
      status = 'Rejected'
    """
    leave, found_table = find_leave_by_id_globally(db, leave_id)
    if not leave:
        return None

    current_overall = str(leave.get("overall_status") or "").upper()
    if current_overall in ("APPROVED", "REJECTED"):
        raise ValueError("This leave application has already been processed.")

    now = datetime.now()
    is_approve = action.lower() == "approved"

    if is_approve:
        overall_st = "APPROVED"
        mgr_st = leave.get("manager_status") or "APPROVED"
        adm_st = "APPROVED"
        ui_st = "Approved"
        adm_comm = comment or "Approved by Admin"
        adm_rej = None
    else:
        overall_st = "REJECTED"
        mgr_st = leave.get("manager_status") or "APPROVED"
        adm_st = "REJECTED"
        ui_st = "Rejected"
        adm_comm = None
        adm_rej = comment or "Rejected by Admin"

    tables_to_update = set(get_all_leave_tables(db))
    tables_to_update.add("leave_requests")
    if found_table:
        tables_to_update.add(found_table)

    emp_code = leave.get("emp_code")
    start_date = leave.get("start_date")
    raw_days = leave.get("total_days") or 1.0
    try:
        total_days = float(raw_days)
    except Exception:
        total_days = 1.0

    for tbl in tables_to_update:
        try:
            db.execute(text(f"""
                UPDATE {tbl}
                SET overall_status = :ost,
                    manager_status = :mst,
                    admin_status = :ast,
                    status = :st,
                    admin_reviewed_by = :aname,
                    admin_reviewed_at = :now,
                    admin_comment = COALESCE(:acomm, admin_comment),
                    admin_rejection_reason = COALESCE(:arej, admin_rejection_reason),
                    approval_level = 3
                WHERE id = :id OR (emp_code = :c AND start_date = :sd)
            """), {
                "ost": overall_st,
                "mst": mgr_st,
                "ast": adm_st,
                "st": ui_st,
                "aname": admin_name,
                "now": now,
                "acomm": adm_comm,
                "arej": adm_rej,
                "id": int(leave_id),
                "c": emp_code,
                "sd": start_date
            })
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Error updating leave in {tbl}: {e}")

    # Deduct Leave Balance ONLY on Admin approval
    if is_approve and emp_code:
        try:
            balance = db.query(LeaveBalance).filter(LeaveBalance.emp_code == emp_code).first()
            if not balance:
                balance = LeaveBalance(emp_code=emp_code, allowed_leaves=21.0, used_leaves=0.0)
                db.add(balance)
            balance.used_leaves = float(balance.used_leaves or 0.0) + total_days
            db.commit()
            logger.info(f"Leave balance updated for {emp_code}: +{total_days} days used")
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating leave balance on admin approve: {e}")

    updated = {
        **leave,
        "overall_status": overall_st,
        "manager_status": mgr_st,
        "admin_status": adm_st,
        "status": ui_st,
        "admin_reviewed_by": admin_name,
        "admin_reviewed_at": now.isoformat(),
        "admin_comment": adm_comm,
        "admin_rejection_reason": adm_rej,
        "approval_level": 3
    }
    return updated


def update_leave_status(db: Session, leave_id: int, new_status: str, admin_name: str = "Admin Approver", comment: str = ""):
    """
    Bridge for general endpoints calling approve/reject.
    Default routed to admin_action_leave.
    """
    s_clean = new_status.lower()
    if "approve" in s_clean:
        return admin_action_leave(db, leave_id, "Approved", admin_name=admin_name, comment=comment)
    elif "reject" in s_clean:
        return admin_action_leave(db, leave_id, "Rejected", admin_name=admin_name, comment=comment)
    return None


def get_all_leaves_admin(db: Session):
    """
    Authoritative query: returns all leave applications across the system
    joined with profile_master for full employee metadata and exact 2-level status.
    """
    all_leaves = []
    seen_ids = set()
    seen_keys = set()

    try:
        query = text("""
            SELECT l.*,
                   p.first_name, p.last_name, p.designation, p.department, p.role, p.reporting_supervisor, p.branch_location
            FROM leave_requests l
            LEFT JOIN profile_master p ON l.emp_code = p.emp_code
            ORDER BY l.id DESC
        """)
        rows = db.execute(query).mappings().all()
        for r in rows:
            rec_id = r["id"]
            if rec_id in seen_ids:
                continue
            seen_ids.add(rec_id)

            emp_name = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip()
            if not emp_name or emp_name.lower() == "none none":
                emp_name = r.get("employee_name") or r.get("emp_code") or "Employee"

            start_d = r.get("start_date")
            end_d = r.get("end_date")
            start_str = start_d.strftime("%d-%m-%Y") if hasattr(start_d, "strftime") else str(start_d or "")
            end_str = end_d.strftime("%d-%m-%Y") if hasattr(end_d, "strftime") else str(end_d or "")
            t_days = float(r.get("total_days") or 1.0)
            cat = r.get("category") or "Casual Leave"

            comp_key = (
                str(r.get("emp_code") or "").upper().strip(),
                str(start_d),
                str(end_d),
                str(cat).upper().strip()
            )
            seen_keys.add(comp_key)

            # Authoritative status mapping
            raw_overall = str(r.get("overall_status") or "").upper().strip()
            raw_status = str(r.get("status") or "").upper().strip()

            if raw_overall in ("PENDING_ADMIN", "PENDING_MANAGER", "APPROVED", "REJECTED"):
                overall_st = raw_overall
            elif "APPROV" in raw_status:
                overall_st = "APPROVED"
            elif "REJECT" in raw_status:
                overall_st = "REJECTED"
            elif raw_status == "PENDING_ADMIN":
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

            # Display status label for UI
            if overall_st == "APPROVED":
                ui_status = "Approved"
            elif overall_st == "REJECTED":
                ui_status = "Rejected"
            elif overall_st == "PENDING_ADMIN":
                ui_status = "Pending Admin Approval"
            else:
                ui_status = "Pending Manager Approval"

            sub_at = r.get("submitted_at")
            sub_at_str = sub_at.isoformat() if hasattr(sub_at, "isoformat") else str(sub_at or "")

            all_leaves.append({
                "id": rec_id,
                "emp_code": r.get("emp_code") or "",
                "code": r.get("emp_code") or "",
                "empCode": r.get("emp_code") or "",
                "name": emp_name,
                "employee": emp_name,
                "employee_name": emp_name,
                "employeeName": emp_name,
                "department": r.get("department") or "General",
                "designation": r.get("designation") or r.get("role") or "Employee",
                "category": cat,
                "type": cat,
                "leave_type": cat,
                "start_date": str(start_d or ""),
                "end_date": str(end_d or ""),
                "startDate": start_str,
                "endDate": end_str,
                "from": start_str,
                "from_date": str(start_d or ""),
                "to": end_str,
                "to_date": str(end_d or ""),
                "total_days": t_days,
                "days": f"{t_days} days",
                "reason": r.get("reason") or "",
                "status": overall_st,
                "statusDisplay": ui_status,
                "overall_status": overall_st,
                "manager_status": mgr_st,
                "admin_status": adm_st,
                "manager_id": r.get("manager_id") or r.get("reporting_supervisor") or "MGR001",
                "manager_name": r.get("manager_name") or "Manager",
                "manager_reviewed_by": r.get("manager_reviewed_by"),
                "manager_reviewed_at": str(r.get("manager_reviewed_at") or ""),
                "manager_comment": r.get("manager_comment"),
                "manager_rejection_reason": r.get("manager_rejection_reason"),
                "admin_reviewed_by": r.get("admin_reviewed_by"),
                "admin_reviewed_at": str(r.get("admin_reviewed_at") or ""),
                "admin_comment": r.get("admin_comment"),
                "admin_rejection_reason": r.get("admin_rejection_reason"),
                "submitted_at": sub_at_str,
                "applied_date": str(start_d or ""),
                "approval_level": r.get("approval_level") or 1,
                "approver": r.get("admin_reviewed_by") or r.get("manager_name") or "Admin Approver",
                "location": r.get("branch_location") or "Mumbai; Maharashtra"
            })
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        logger.error(f"Error in get_all_leaves_admin: {e}")

    # Also check dynamic tables for any leaves not yet in leave_requests
    table_names = get_all_leave_tables(db)
    for tbl in table_names:
        try:
            m_rows = db.execute(text(f"""
                SELECT m.*, p.first_name, p.last_name, p.designation, p.department, p.role, p.reporting_supervisor, p.branch_location
                FROM {tbl} m
                LEFT JOIN profile_master p ON m.emp_code = p.emp_code
            """)).mappings().all()
            for r in m_rows:
                rec_id = r.get("id")
                start_d = r.get("start_date")
                end_d = r.get("end_date")
                cat = r.get("category") or "Casual Leave"

                comp_key = (
                    str(r.get("emp_code") or "").upper().strip(),
                    str(start_d),
                    str(end_d),
                    str(cat).upper().strip()
                )

                if (rec_id and rec_id in seen_ids) or comp_key in seen_keys:
                    continue
                if rec_id:
                    seen_ids.add(rec_id)
                seen_keys.add(comp_key)

                emp_name = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or r.get("employee_name") or r.get("emp_code") or "Employee"
                start_str = start_d.strftime("%d-%m-%Y") if hasattr(start_d, "strftime") else str(start_d or "")
                end_str = end_d.strftime("%d-%m-%Y") if hasattr(end_d, "strftime") else str(end_d or "")
                t_days = float(r.get("total_days") or 1.0)
                overall_st = str(r.get("overall_status") or r.get("status") or "PENDING_MANAGER").upper()
                if "APPROV" in overall_st:
                    overall_st = "APPROVED"
                elif "REJECT" in overall_st:
                    overall_st = "REJECTED"
                elif overall_st not in ("PENDING_ADMIN", "PENDING_MANAGER", "APPROVED", "REJECTED"):
                    overall_st = "PENDING_MANAGER"

                all_leaves.append({
                    "id": rec_id or 9999,
                    "emp_code": r.get("emp_code") or "",
                    "name": emp_name,
                    "employee": emp_name,
                    "employee_name": emp_name,
                    "department": r.get("department") or "General",
                    "designation": r.get("designation") or "Employee",
                    "category": cat,
                    "type": cat,
                    "leave_type": cat,
                    "start_date": str(start_d or ""),
                    "end_date": str(end_d or ""),
                    "startDate": start_str,
                    "endDate": end_str,
                    "from": start_str,
                    "to": end_str,
                    "total_days": t_days,
                    "days": f"{t_days} days",
                    "reason": r.get("reason") or "",
                    "status": overall_st,
                    "statusDisplay": "Approved" if overall_st == "APPROVED" else ("Rejected" if overall_st == "REJECTED" else ("Pending Admin Approval" if overall_st == "PENDING_ADMIN" else "Pending Manager Approval")),
                    "overall_status": overall_st,
                    "manager_status": r.get("manager_status") or "PENDING",
                    "admin_status": r.get("admin_status") or "PENDING",
                    "manager_id": r.get("manager_id") or "MGR001",
                    "manager_name": r.get("manager_name") or "Manager",
                    "manager_reviewed_by": r.get("manager_reviewed_by"),
                    "manager_reviewed_at": str(r.get("manager_reviewed_at") or ""),
                    "admin_reviewed_by": r.get("admin_reviewed_by"),
                    "admin_reviewed_at": str(r.get("admin_reviewed_at") or ""),
                    "submitted_at": str(r.get("submitted_at") or ""),
                    "location": r.get("branch_location") or "Mumbai; Maharashtra"
                })
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass

    all_leaves.sort(key=lambda x: str(x.get("start_date") or ""), reverse=True)
    return all_leaves
