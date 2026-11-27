# ==============================================================================
# QUICKCHEX HRMS BACKEND - LEAVE_SERVICE.PY
# Path: Attendance-portal/backend/app/services/leave_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'leave_service'.
# Primary Functions:
#   • get_monthly_table_name()
#   • get_all_leave_tables()
#   • find_leave_by_id_globally()
#   • ensure_leave_table()
#   • _parse_date()
#   • create_leave_request()
#   • get_leave_requests()
#   • get_team_leaves()
#   • ... and 5 more functions
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text, inspect from sqlalchemy for module operations
from sqlalchemy import text, inspect
# Import LeaveRequest, LeaveBalance from app.models.leave for module operations
from app.models.leave import LeaveRequest, LeaveBalance
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import date, datetime, timedelta from datetime for module operations
from datetime import date, datetime, timedelta
# Import module logging for system functionality
import logging

# Set logger variable to store logger value
logger = logging.getLogger(__name__)

# --- HELPER LOGIC ---

# ==============================================================================
# DYNAMIC MONTHLY TABLE NAME RESOLVER
# ==============================================================================
# Formulates a partitioned table name based on year and 2-digit zero-padded month.
# Example: date(2026, 4, 15) -> "leave_2026_04"
# ==============================================================================
def get_monthly_table_name(date_obj: date):
    """Generates table name like leave_2026_04"""
    # Return formatted table name string with zero-padded 2-digit month
    return f"leave_{date_obj.year}_{date_obj.month:02d}"


# ==============================================================================
# LEAVE PARTITION DISCOVERY
# ==============================================================================
# Inspects PostgreSQL database schema to discover all dynamically created monthly
# leave partition tables (e.g. leave_2026_01, leave_2026_02, etc.).
# ==============================================================================
def get_all_leave_tables(db: Session):
    # Set table_names variable to store table names value
    table_names = []
    # Begin guarded execution block to trap exceptions
    try:
        # Use SQLAlchemy inspector to retrieve all table names from database engine
        insp = inspect(db.bind)
        # Iterate through items in sequence loop
        for t in insp.get_table_names():
            # Filter tables matching pattern 'leave_20XX' and avoid duplicates
            if t.startswith("leave_20") and t not in table_names:
                # Invoke table_names.append to perform operational action
                table_names.append(t)
    # Catch and handle specific exception if raised
    except Exception:
        # Safely rollback aborted database transaction if an inspection error occurs
        try:
            # Roll back transaction to revert changes on failure
            db.rollback()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return table_names

# ==============================================================================
# GLOBAL LEAVE RECORD LOCATOR (Across Static & Dynamic Partition Tables)
# ==============================================================================
# Searches the central static `leave_requests` master table and all dynamically
# generated monthly partition tables (`leave_YYYY_MM`) to locate a leave by ID.
# Returns a tuple: (leave_data_dict, table_name_where_found) or (None, None).
# ==============================================================================
def find_leave_by_id_globally(db: Session, leave_id: int):
    """
    Checks all dynamic monthly tables and static leave_requests table
    to find where this specific leave_id exists.
    """
    # Step 1: Check primary static master table `leave_requests`
    try:
        # Formulate parameterized query to locate leave application by primary key ID
        s_query = text("SELECT * FROM leave_requests WHERE id = :id")
        # Execute query against PostgreSQL and fetch mapped dictionary result
        res = db.execute(s_query, {"id": int(leave_id)}).mappings().first()
        # Evaluate condition to control execution branch
        if res:
            # Found in static master table; return record and source table identifier
            return dict(res), "leave_requests"
    # Catch and handle specific exception if raised
    except Exception:
        # Rollback transaction on failure so pooler connection remains healthy
        try:
            # Roll back transaction to revert changes on failure
            db.rollback()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Step 2: Query all dynamic monthly partition tables if not found in master
    table_names = get_all_leave_tables(db)
    # Iterate through items in sequence loop
    for t_name in table_names:
        # Begin guarded execution block to trap exceptions
        try:
            # Query each partition table sequentially
            query = text(f"SELECT * FROM {t_name} WHERE id = :id")
            # Set res variable to store res value
            res = db.execute(query, {"id": int(leave_id)}).mappings().first()
            # Evaluate condition to control execution branch
            if res:
                # Found in this monthly partition; return record and partition name
                return dict(res), t_name
        # Catch and handle specific exception if raised
        except Exception:
            # In case of table query error, rollback and continue searching remaining partitions
            try:
                # Roll back transaction to revert changes on failure
                db.rollback()
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass
            # Skip to next iteration of active loop
            continue

    # Record not found anywhere across the database
    return None, None

# ==============================================================================
# DYNAMIC MONTHLY LEAVE PARTITION TABLE DDL PROVISIONER
# ==============================================================================
# Verifies or creates a monthly partition table (e.g. `leave_2026_04`) containing:
# - Employee identification (emp_code, employee_name)
# - Leave specifications (category, start_date, end_date, total_days, reason)
# - 2-tier approval workflow states (overall_status, manager_status, admin_status)
# - Audit tracking columns (reviewer names, review timestamps, approval comments)
# ==============================================================================
def ensure_leave_table(db: Session, table_name: str):
    """Ensures dynamic monthly leave table exists with proper schema."""
    try:
        # Issue DDL statement to create partition table if not already created
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
        # Commit table creation DDL
        db.commit()
    # Catch and handle specific exception if raised
    except Exception as e:
        # Rollback and log warning if table creation encounters a conflict or lock
        db.rollback()
        # Log warning message for non-fatal unexpected condition
        logger.warning(f"Notice on ensure_leave_table for {table_name}: {e}")

# ==============================================================================
# MULTI-FORMAT CALENDAR DATE PARSER
# ==============================================================================
# Robust date parser handling various client representations:
# - ISO format: "2026-04-15"
# - Indian format: "15-04-2026" or "15/04/2026"
# - Human readable format: "15 Apr 2026"
# - Python date or datetime objects directly
# - Fallback to provided default date if parsing fails
# ==============================================================================
def _parse_date(val, fallback):
    # If input is empty or None, return the fallback default date
    if not val:
        # Return computed result or response payload to caller
        return fallback
    # If already a Python date object, return directly
    if isinstance(val, date):
        # Return computed result or response payload to caller
        return val
    # If Python datetime object, extract date portion
    if isinstance(val, datetime):
        # Return computed result or response payload to caller
        return val.date()
    
    # Normalize string representation
    val_str = str(val).strip()
    
    # Attempt parsing against standard date formats
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d %b %Y", "%d %B %Y"):
        # Begin guarded execution block to trap exceptions
        try:
            # Return computed result or response payload to caller
            return datetime.strptime(val_str[:11].strip(), fmt).date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
            
    # Try dateutil's flexible heuristic parser
    try:
        # Import parse from dateutil.parser for module operations
        from dateutil.parser import parse
        # Return computed result or response payload to caller
        return parse(val_str).date()
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass
        
    # Return safe fallback if all parsers fail
    return fallback

# ==============================================================================
# LEAVE REQUEST APPLICATION CREATOR
# ==============================================================================
# Handles new employee leave submissions:
# 1. Normalizes date ranges, category (Casual, Sick, Privilege), and duration.
# 2. Queries profile_master to resolve applicant name and direct reporting supervisor.
# 3. Inserts into static `leave_requests` master table to generate canonical SERIAL ID.
# 4. Synchronizes record into dynamic monthly partition table (e.g. `leave_2026_04`).
# 5. Initializes 2-tier approval workflow at Stage 1: 'PENDING_MANAGER'.
# ==============================================================================
def create_leave_request(db: Session, obj_in, emp_code: str):
    """
    Creates a new leave application in state PENDING_MANAGER across
    dynamic monthly table and static leave_requests table with atomic PostgreSQL persistence.
    """
    def _get(field, default=None):
        # Evaluate condition to control execution branch
        if isinstance(obj_in, dict):
            # Return computed result or response payload to caller
            return obj_in.get(field, default)
        # Return computed result or response payload to caller
        return getattr(obj_in, field, default)

    # Set start_d variable to store start d value
    start_d = _parse_date(_get("start_date") or _get("from") or _get("fromDate"), date.today())
    # Set end_d variable to store end d value
    end_d = _parse_date(_get("end_date") or _get("to") or _get("toDate"), start_d)
    # Set category variable to store category value
    category = _get("category") or _get("type") or _get("leave_type") or "Casual Leave"
    # Set raw_days variable to store raw days value
    raw_days = _get("total_days") or _get("days") or 1.0
    # Begin guarded execution block to trap exceptions
    try:
        # Set total_days variable to store total days value
        total_days = float(str(raw_days).split()[0])
    # Catch and handle specific exception if raised
    except Exception:
        # Set total_days variable to store total days value
        total_days = 1.0

    # Set has_half_days variable to store has half days value
    has_half_days = bool(_get("has_half_days") or _get("halfDay") == "Yes" or total_days == 0.5)
    # Set half_day_details variable to store half day details value
    half_day_details = _get("half_day_details")
    # Set reason variable to store reason value
    reason = str(_get("reason") or "").strip()

    # Find employee profile and manager info
    emp_prof = db.query(Profile).filter(
        # Execute statement to process data and maintain state
        (Profile.emp_code == emp_code) | (Profile.email.ilike(emp_code))
    # Execute statement to process data and maintain state
    ).first()
    # Set emp_name variable to store emp name value
    emp_name = f"{emp_prof.first_name or ''} {emp_prof.last_name or ''}".strip() if emp_prof else emp_code
    # Set manager_id variable to store manager id value
    manager_id = emp_prof.reporting_supervisor if emp_prof else None
    
    # Initiate database query on specified model
    mgr_prof = db.query(Profile).filter(
        # Execute statement to process data and maintain state
        (Profile.emp_code == manager_id) | (Profile.email.ilike(manager_id))
    # Execute statement to process data and maintain state
    ).first() if manager_id else None
    # Set manager_name variable to store manager name value
    manager_name = f"{mgr_prof.first_name or ''} {mgr_prof.last_name or ''}".strip() if mgr_prof else (manager_id or "Unassigned")
    # Import get_ist_now from app.services.attendance_service for module operations
    from app.services.attendance_service import get_ist_now
    # Set now variable to store now value
    now = get_ist_now().replace(tzinfo=None)
    # Set table_name variable to store table name value
    table_name = get_monthly_table_name(start_d)
    # Invoke ensure_leave_table to perform operational action
    ensure_leave_table(db, table_name)

    # 1. Insert into static leave_requests table first to obtain canonical ID
    new_id = None
    # Begin guarded execution block to trap exceptions
    try:
        # Set insert_static variable to store insert static value
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
        # Set res variable to store res value
        res = db.execute(insert_static, {
            # Execute statement to process data and maintain state
            "code": emp_code, "cat": category, "start": start_d, "end": end_d, "days": total_days,
            # Execute statement to process data and maintain state
            "half": has_half_days, "details": half_day_details, "reason": reason,
            # Execute statement to process data and maintain state
            "ename": emp_name, "mid": manager_id, "mname": manager_name, "now": now
        # Execute statement to process data and maintain state
        })
        # Set row variable to store row value
        row = res.fetchone()
        # Set new_id variable to store new id value
        new_id = row[0] if row else None
        # Check if target condition is false or object is missing
        if not new_id:
            # Raise exception to abort current operation with error
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
        # Execute statement to process data and maintain state
        db.execute(insert_monthly, {
            # Execute statement to process data and maintain state
            "nid": new_id, "code": emp_code, "cat": category, "start": start_d, "end": end_d, "days": total_days,
            # Execute statement to process data and maintain state
            "half": has_half_days, "details": half_day_details, "reason": reason,
            # Execute statement to process data and maintain state
            "ename": emp_name, "mid": manager_id, "mname": manager_name, "now": now
        # Execute statement to process data and maintain state
        })
        # Begin guarded execution block to trap exceptions
        try:
            # Invoke db.execute to perform operational action
            db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE((SELECT MAX(id) FROM {table_name}), 1), true)"))
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

        # Atomic commit to PostgreSQL
        db.commit()

        # Send interactive leave approval card to Manager in Microsoft Teams via ERA
        try:
            mgr_email = mgr_prof.email if mgr_prof else None
            if mgr_email and "@" in mgr_email:
                from app.services.aicogni_service import send_aicogni_message
                portal_url = "https://lahrms.laesfera.co:8200/manager/leaves"
                card_html = f"""
                <div style="font-family:'Segoe UI',sans-serif; border:1px solid #d2d0ce; border-left:4px solid #0078d4; border-radius:6px; padding:16px; max-width:480px; background:#ffffff; color:#323130;">
                    <div style="font-size:16px; font-weight:600; color:#0078d4; margin-bottom:8px;">🏖️ New Leave Request Submitted</div>
                    <div style="font-size:14px; margin-bottom:6px;"><b>Employee:</b> {emp_name} (<code style="background:#f3f2f1; padding:2px 4px; border-radius:3px;">{emp_code}</code>)</div>
                    <div style="font-size:14px; margin-bottom:6px;"><b>Category:</b> {category} (<b>{total_days} day(s)</b>)</div>
                    <div style="font-size:14px; margin-bottom:6px;"><b>Dates:</b> {start_d} to {end_d}</div>
                    <div style="font-size:14px; margin-bottom:12px;"><b>Reason:</b> {reason or 'Personal'}</div>
                    <div style="margin-top:12px;">
                        <a href="{portal_url}" style="background-color:#0078d4; color:#ffffff; padding:7px 16px; text-decoration:none; border-radius:4px; font-weight:600; font-size:13px; display:inline-block;">Review & Approve in Portal</a>
                    </div>
                    <div style="font-size:11px; color:#605e5c; margin-top:10px;">Sent by ERA (La Esfera HR Assistant)</div>
                </div>
                """
                send_aicogni_message(mgr_email, card_html)
        except Exception as notify_err:
            logger.warning(f"Failed to dispatch Teams notification to manager: {notify_err}")
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Error saving leave request into database: {e}")
        # Raise exception to abort current operation with error
        raise RuntimeError(f"Database write failed for leave application: {e}")

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "id": new_id,
        # Execute statement to process data and maintain state
        "emp_code": emp_code,
        # Execute statement to process data and maintain state
        "employee_name": emp_name,
        # Execute statement to process data and maintain state
        "category": category,
        # Execute statement to process data and maintain state
        "type": category,
        # Execute statement to process data and maintain state
        "leave_type": category,
        # Execute statement to process data and maintain state
        "start_date": str(start_d),
        # Execute statement to process data and maintain state
        "end_date": str(end_d),
        # Execute statement to process data and maintain state
        "from": str(start_d),
        # Execute statement to process data and maintain state
        "to": str(end_d),
        # Execute statement to process data and maintain state
        "from_date": str(start_d),
        # Execute statement to process data and maintain state
        "to_date": str(end_d),
        # Execute statement to process data and maintain state
        "days": f"{total_days} days",
        # Execute statement to process data and maintain state
        "total_days": total_days,
        # Execute statement to process data and maintain state
        "reason": reason,
        # Execute statement to process data and maintain state
        "status": "PENDING_MANAGER",
        # Execute statement to process data and maintain state
        "overall_status": "PENDING_MANAGER",
        # Execute statement to process data and maintain state
        "manager_status": "PENDING",
        # Execute statement to process data and maintain state
        "admin_status": "PENDING",
        # Execute statement to process data and maintain state
        "manager_id": manager_id,
        # Execute statement to process data and maintain state
        "manager_name": manager_name,
        # Execute statement to process data and maintain state
        "approval_level": 1,
        # Execute statement to process data and maintain state
        "submitted_at": now.isoformat()
    # Execute statement to process data and maintain state
    }


# Define get_leave_requests function to handle get leave requests
def get_leave_requests(db: Session, emp_code: str):
    """
    Fetches leave history for a specific employee across leave_requests and dynamic tables.
    """
    all_leaves = get_all_leaves_admin(db)
    # Set emp_upper variable to store emp upper value
    emp_upper = emp_code.upper().strip()
    # Return computed result or response payload to caller
    return [l for l in all_leaves if l.get("emp_code", "").upper().strip() == emp_upper]


# Define get_team_leaves function to handle get team leaves
def get_team_leaves(db: Session, tl_emp_code: str):
    """
    Fetches leave requests for manager's authorized team members.
    """
    all_leaves = get_all_leaves_admin(db)
    # Set tl_upper variable to store tl upper value
    tl_upper = (tl_emp_code or "MGR001").upper().strip()

    # Find profiles reporting to this manager (by emp_code, email, or full name)
    mgr_prof = db.query(Profile).filter(
        # Execute statement to process data and maintain state
        (Profile.emp_code.ilike(tl_upper)) | (Profile.email.ilike(tl_upper))
    # Execute statement to process data and maintain state
    ).first()

    # Set mgr_identifiers variable to store mgr identifiers value
    mgr_identifiers = {tl_upper}
    # Evaluate condition to control execution branch
    if mgr_prof:
        # Invoke mgr_identifiers.add to perform operational action
        mgr_identifiers.add((mgr_prof.emp_code or "").upper().strip())
        # Evaluate condition to control execution branch
        if mgr_prof.email:
            # Invoke mgr_identifiers.add to perform operational action
            mgr_identifiers.add(mgr_prof.email.upper().strip())
        # Set fn variable to store fn value
        fn = mgr_prof.first_name or ""
        # Set ln variable to store ln value
        ln = mgr_prof.last_name or ""
        # Set full_n variable to store full n value
        full_n = f"{fn} {ln}".strip().upper()
        # Evaluate condition to control execution branch
        if full_n:
            # Invoke mgr_identifiers.add to perform operational action
            mgr_identifiers.add(full_n)

    # Initiate database query on specified model
    all_profs = db.query(Profile).all()
    # Set team_codes variable to store team codes value
    team_codes = set(mgr_identifiers)
    # Iterate through items in sequence loop
    for p in all_profs:
        # Set sup variable to store sup value
        sup = (p.reporting_supervisor or "").strip().upper()
        # Evaluate condition to control execution branch
        if sup and sup in mgr_identifiers:
            # Invoke team_codes.add to perform operational action
            team_codes.add((p.emp_code or "").upper().strip())

    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for l in all_leaves:
        # Set m_id variable to store m id value
        m_id = (l.get("manager_id") or "").upper().strip()
        # Set m_name variable to store m name value
        m_name = (l.get("manager_name") or "").upper().strip()
        # Set e_code variable to store e code value
        e_code = (l.get("emp_code") or "").upper().strip()
        # Evaluate condition to control execution branch
        if m_id in mgr_identifiers or m_name in mgr_identifiers or e_code in team_codes:
            # Invoke results.append to perform operational action
            results.append(l)

    # Return computed result or response payload to caller
    return results


# Define get_leave_stats function to handle get leave stats
def get_leave_stats(db: Session, emp_code: str):
    """
    Returns pending count (requests awaiting manager OR admin) and available balance.
    """
    all_leaves = get_all_leaves_admin(db)
    # Set emp_upper variable to store emp upper value
    emp_upper = emp_code.upper().strip()
    # Set user_leaves variable to store user leaves value
    user_leaves = [l for l in all_leaves if l.get("emp_code", "").upper().strip() == emp_upper]

    # Set pending_count variable to store pending count value
    pending_count = sum(
        # Execute statement to process data and maintain state
        1 for l in user_leaves
        # Evaluate condition to control execution branch
        if l.get("overall_status") in ("PENDING_MANAGER", "PENDING_ADMIN") or l.get("status") in ("Pending", "PENDING_MANAGER", "PENDING_ADMIN")
    # Execute statement to process data and maintain state
    )

    # Initiate database query on specified model
    balance = db.query(LeaveBalance).filter(LeaveBalance.emp_code == emp_code).first()
    # Check if target condition is false or object is missing
    if not balance:
        # Set balance variable to store balance value
        balance = LeaveBalance(emp_code=emp_code, allowed_leaves=21.0, used_leaves=0.0)
        # Stage new entity instance into database session
        db.add(balance)
        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(balance)

    # Set available variable to store available value
    available = max(0.0, float(balance.allowed_leaves or 21.0) - float(balance.used_leaves or 0.0))
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "pending_count": pending_count,
        # Execute statement to process data and maintain state
        "available_balance": available,
        # Execute statement to process data and maintain state
        "allowed_leaves": float(balance.allowed_leaves or 21.0),
        # Execute statement to process data and maintain state
        "used_leaves": float(balance.used_leaves or 0.0)
    # Execute statement to process data and maintain state
    }


# ==============================================================================
# MANAGER APPROVES OR REJECTS LEAVE (manager_action_leave)
# ==============================================================================
# When the employee's direct boss reviews the leave:
# - If 'Approved':
#     • Marks the leave as Approved by the manager.
#     • Takes the days out of the employee's leave balance.
#     • Marks the attendance calendar on those days as 'Leave'.
# - If 'Rejected':
#     • Marks the leave as Rejected.
#     • Saves the reason why the boss rejected it.
#     • Leaves the employee's leave balance untouched (no cut).
# ==============================================================================
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
    # Check if target condition is false or object is missing
    if not leave:
        # Return computed result or response payload to caller
        return None

    # Set current_overall variable to store current overall value
    current_overall = str(leave.get("overall_status") or leave.get("status") or "").upper()
    # Evaluate condition to control execution branch
    if current_overall in ("APPROVED", "REJECTED"):
        # Raise exception to abort current operation with error
        raise ValueError("This leave application has already been processed.")

    # Set now variable to store now value
    now = datetime.now()
    # Set is_approve variable to store is approve value
    is_approve = action.lower() == "approved"

    # Evaluate condition to control execution branch
    if is_approve:
        # Set overall_st variable to store overall st value
        overall_st = "APPROVED"
        # Set mgr_st variable to store mgr st value
        mgr_st = "APPROVED"
        # Set adm_st variable to store adm st value
        adm_st = "APPROVED"
        # Set ui_st variable to store ui st value
        ui_st = "Approved"
        # Set mgr_comm variable to store mgr comm value
        mgr_comm = comment or "Approved by Manager"
        # Set mgr_rej variable to store mgr rej value
        mgr_rej = None
    # Execute fallback branch when conditions are not met
    else:
        # Set overall_st variable to store overall st value
        overall_st = "REJECTED"
        # Set mgr_st variable to store mgr st value
        mgr_st = "REJECTED"
        # Set adm_st variable to store adm st value
        adm_st = "REJECTED"
        # Set ui_st variable to store ui st value
        ui_st = "Rejected"
        # Set mgr_comm variable to store mgr comm value
        mgr_comm = None
        # Set mgr_rej variable to store mgr rej value
        mgr_rej = comment or "Rejected by Manager"

    # Set tables_to_update variable to store tables to update value
    tables_to_update = set(get_all_leave_tables(db))
    # Invoke tables_to_update.add to perform operational action
    tables_to_update.add("leave_requests")
    # Evaluate condition to control execution branch
    if found_table:
        # Invoke tables_to_update.add to perform operational action
        tables_to_update.add(found_table)

    # Set emp_code variable to store emp code value
    emp_code = leave.get("emp_code")
    # Set start_date variable to store start date value
    start_date = leave.get("start_date")

    # Iterate through items in sequence loop
    for tbl in tables_to_update:
        # Begin guarded execution block to trap exceptions
        try:
            # Execute statement to process data and maintain state
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
                # Execute statement to process data and maintain state
                "ost": overall_st,
                # Execute statement to process data and maintain state
                "mst": mgr_st,
                # Execute statement to process data and maintain state
                "ast": adm_st,
                # Execute statement to process data and maintain state
                "st": ui_st,
                # Execute statement to process data and maintain state
                "mname": manager_name,
                # Execute statement to process data and maintain state
                "now": now,
                # Execute statement to process data and maintain state
                "mcomm": mgr_comm,
                # Execute statement to process data and maintain state
                "mrej": mgr_rej,
                # Execute statement to process data and maintain state
                "id": int(leave_id),
                # Execute statement to process data and maintain state
                "c": emp_code,
                # Execute statement to process data and maintain state
                "sd": start_date
            # Execute statement to process data and maintain state
            })
            # Commit transaction to persist changes in database
            db.commit()
        # Catch and handle specific exception if raised
        except Exception as e:
            # Roll back transaction to revert changes on failure
            db.rollback()
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"Error updating leave in {tbl}: {e}")

    # Synchronize Leave Balance and Attendance dynamically and live upon Manager Approval (only if not already approved)
    was_already_approved = (
        # Execute statement to process data and maintain state
        str(leave.get("overall_status") or "").upper() == "APPROVED"
        # Execute statement to process data and maintain state
        or str(leave.get("manager_status") or "").upper() == "APPROVED"
        # Execute statement to process data and maintain state
        or str(leave.get("admin_status") or "").upper() == "APPROVED"
        # Execute statement to process data and maintain state
        or str(leave.get("status") or "").upper() == "APPROVED"
    # Execute statement to process data and maintain state
    )

    # Check if target condition is false or object is missing
    if is_approve and emp_code and not was_already_approved:
        # Set raw_days variable to store raw days value
        raw_days = leave.get("total_days") or 1.0
        # Begin guarded execution block to trap exceptions
        try:
            # Set total_days variable to store total days value
            total_days = float(raw_days)
        # Catch and handle specific exception if raised
        except Exception:
            # Set total_days variable to store total days value
            total_days = 1.0

        # Begin guarded execution block to trap exceptions
        try:
            # Initiate database query on specified model
            balance = db.query(LeaveBalance).filter(LeaveBalance.emp_code == emp_code).first()
            # Check if target condition is false or object is missing
            if not balance:
                # Set balance variable to store balance value
                balance = LeaveBalance(emp_code=emp_code, allowed_leaves=21.0, used_leaves=0.0)
                # Stage new entity instance into database session
                db.add(balance)
            # Execute statement to process data and maintain state
            balance.used_leaves = float(balance.used_leaves or 0.0) + total_days
            # Commit transaction to persist changes in database
            db.commit()
            # Log informational message for system observability
            logger.info(f"Leave balance updated for {emp_code}: +{total_days} days used upon Manager approval")
        # Catch and handle specific exception if raised
        except Exception as e:
            # Roll back transaction to revert changes on failure
            db.rollback()
            # Log error message with failure diagnostic details
            logger.error(f"Error updating leave balance on manager approve: {e}")

        # Synchronize attendance for leave dates
        try:
            # Set s_d variable to store s d value
            s_d = _parse_date(start_date, date.today())
            # Set e_d variable to store e d value
            e_d = _parse_date(leave.get("end_date") or start_date, s_d)
            # Set cur variable to store cur value
            cur = s_d
            # Set cat variable to store cat value
            cat = leave.get("category") or "Leave"
            # Execute loop while boolean condition remains true
            while cur <= e_d:
                # Set att_table variable to store att table value
                att_table = f"attendance_{cur.year}_{cur.month:02d}"
                # Begin guarded execution block to trap exceptions
                try:
                    # Set att_row variable to store att row value
                    att_row = db.execute(
                        # Invoke text to perform operational action
                        text(f"SELECT id FROM {att_table} WHERE emp_code = :c AND date = :d"),
                        # Execute statement to process data and maintain state
                        {"c": emp_code, "d": cur}
                    # Execute statement to process data and maintain state
                    ).first()
                    # Evaluate condition to control execution branch
                    if att_row:
                        # Execute statement to process data and maintain state
                        db.execute(text(f"""
                            UPDATE {att_table}
                            SET status = 'Leave',
                                remark = :rem,
                                hours_completed = 0.0
                            WHERE emp_code = :c AND date = :d
                        """), {"rem": f"Approved {cat}", "c": emp_code, "d": cur})
                    # Execute fallback branch when conditions are not met
                    else:
                        # Execute statement to process data and maintain state
                        db.execute(text(f"""
                            INSERT INTO {att_table}
                            (emp_code, date, status, remark, hours_completed)
                            VALUES (:c, :d, 'Leave', :rem, 0.0)
                        """), {"rem": f"Approved {cat}", "c": emp_code, "d": cur})
                    # Commit transaction to persist changes in database
                    db.commit()
                # Catch and handle specific exception if raised
                except Exception:
                    # Roll back transaction to revert changes on failure
                    db.rollback()
                # Execute statement to process data and maintain state
                cur += timedelta(days=1)
        # Catch and handle specific exception if raised
        except Exception as e_att_sync:
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"Leave attendance sync error: {e_att_sync}")

    # Set updated variable to store updated value
    updated = {
        # Execute statement to process data and maintain state
        **leave,
        # Execute statement to process data and maintain state
        "overall_status": overall_st,
        # Execute statement to process data and maintain state
        "manager_status": mgr_st,
        # Execute statement to process data and maintain state
        "admin_status": adm_st,
        # Execute statement to process data and maintain state
        "status": ui_st,
        # Execute statement to process data and maintain state
        "manager_reviewed_by": manager_name,
        # Execute statement to process data and maintain state
        "manager_reviewed_at": now.isoformat(),
        # Execute statement to process data and maintain state
        "manager_comment": mgr_comm,
        # Execute statement to process data and maintain state
        "manager_rejection_reason": mgr_rej,
        # Execute statement to process data and maintain state
        "approval_level": 2
    # Execute statement to process data and maintain state
    }
    # Return computed result or response payload to caller
    return updated


# ==============================================================================
# FINAL ADMIN REVIEW (admin_action_leave)
# ==============================================================================
# When the company HR or top administrator gives final review:
# - If 'Approved':
#     • Gives full final approval.
#     • Makes sure leave days are deducted from the employee's balance.
# - If 'Rejected':
#     • Rejects the leave and saves the rejection reason.
#     • Does not cut any leave balance.
# ==============================================================================
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
    # Check if target condition is false or object is missing
    if not leave:
        # Return computed result or response payload to caller
        return None

    # Set current_overall variable to store current overall value
    current_overall = str(leave.get("overall_status") or "").upper()
    # Evaluate condition to control execution branch
    if current_overall in ("APPROVED", "REJECTED"):
        # Raise exception to abort current operation with error
        raise ValueError("This leave application has already been processed.")

    # Set now variable to store now value
    now = datetime.now()
    # Set is_approve variable to store is approve value
    is_approve = action.lower() == "approved"

    # Evaluate condition to control execution branch
    if is_approve:
        # Set overall_st variable to store overall st value
        overall_st = "APPROVED"
        # Set mgr_st variable to store mgr st value
        mgr_st = leave.get("manager_status") or "APPROVED"
        # Set adm_st variable to store adm st value
        adm_st = "APPROVED"
        # Set ui_st variable to store ui st value
        ui_st = "Approved"
        # Set adm_comm variable to store adm comm value
        adm_comm = comment or "Approved by Admin"
        # Set adm_rej variable to store adm rej value
        adm_rej = None
    # Execute fallback branch when conditions are not met
    else:
        # Set overall_st variable to store overall st value
        overall_st = "REJECTED"
        # Set mgr_st variable to store mgr st value
        mgr_st = leave.get("manager_status") or "APPROVED"
        # Set adm_st variable to store adm st value
        adm_st = "REJECTED"
        # Set ui_st variable to store ui st value
        ui_st = "Rejected"
        # Set adm_comm variable to store adm comm value
        adm_comm = None
        # Set adm_rej variable to store adm rej value
        adm_rej = comment or "Rejected by Admin"

    # Set tables_to_update variable to store tables to update value
    tables_to_update = set(get_all_leave_tables(db))
    # Invoke tables_to_update.add to perform operational action
    tables_to_update.add("leave_requests")
    # Evaluate condition to control execution branch
    if found_table:
        # Invoke tables_to_update.add to perform operational action
        tables_to_update.add(found_table)

    # Set emp_code variable to store emp code value
    emp_code = leave.get("emp_code")
    # Set start_date variable to store start date value
    start_date = leave.get("start_date")
    # Set raw_days variable to store raw days value
    raw_days = leave.get("total_days") or 1.0
    # Begin guarded execution block to trap exceptions
    try:
        # Set total_days variable to store total days value
        total_days = float(raw_days)
    # Catch and handle specific exception if raised
    except Exception:
        # Set total_days variable to store total days value
        total_days = 1.0

    # Iterate through items in sequence loop
    for tbl in tables_to_update:
        # Begin guarded execution block to trap exceptions
        try:
            # Execute statement to process data and maintain state
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
                # Execute statement to process data and maintain state
                "ost": overall_st,
                # Execute statement to process data and maintain state
                "mst": mgr_st,
                # Execute statement to process data and maintain state
                "ast": adm_st,
                # Execute statement to process data and maintain state
                "st": ui_st,
                # Execute statement to process data and maintain state
                "aname": admin_name,
                # Execute statement to process data and maintain state
                "now": now,
                # Execute statement to process data and maintain state
                "acomm": adm_comm,
                # Execute statement to process data and maintain state
                "arej": adm_rej,
                # Execute statement to process data and maintain state
                "id": int(leave_id),
                # Execute statement to process data and maintain state
                "c": emp_code,
                # Execute statement to process data and maintain state
                "sd": start_date
            # Execute statement to process data and maintain state
            })
            # Commit transaction to persist changes in database
            db.commit()
        # Catch and handle specific exception if raised
        except Exception as e:
            # Roll back transaction to revert changes on failure
            db.rollback()
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"Error updating leave in {tbl}: {e}")

    # Deduct Leave Balance on Admin approval (only if not already approved/deducted)
    was_already_approved = (
        # Execute statement to process data and maintain state
        str(leave.get("overall_status") or "").upper() == "APPROVED"
        # Execute statement to process data and maintain state
        or str(leave.get("admin_status") or "").upper() == "APPROVED"
        # Execute statement to process data and maintain state
        or str(leave.get("manager_status") or "").upper() == "APPROVED"
        # Execute statement to process data and maintain state
        or str(leave.get("status") or "").upper() == "APPROVED"
    # Execute statement to process data and maintain state
    )

    # Check if target condition is false or object is missing
    if is_approve and emp_code and not was_already_approved:
        # Begin guarded execution block to trap exceptions
        try:
            # Initiate database query on specified model
            balance = db.query(LeaveBalance).filter(LeaveBalance.emp_code == emp_code).first()
            # Check if target condition is false or object is missing
            if not balance:
                # Set balance variable to store balance value
                balance = LeaveBalance(emp_code=emp_code, allowed_leaves=21.0, used_leaves=0.0)
                # Stage new entity instance into database session
                db.add(balance)
            # Execute statement to process data and maintain state
            balance.used_leaves = float(balance.used_leaves or 0.0) + total_days
            # Commit transaction to persist changes in database
            db.commit()
            # Log informational message for system observability
            logger.info(f"Leave balance updated for {emp_code}: +{total_days} days used")
        # Catch and handle specific exception if raised
        except Exception as e:
            # Roll back transaction to revert changes on failure
            db.rollback()
            # Log error message with failure diagnostic details
            logger.error(f"Error updating leave balance on admin approve: {e}")

    # Set updated variable to store updated value
    updated = {
        # Execute statement to process data and maintain state
        **leave,
        # Execute statement to process data and maintain state
        "overall_status": overall_st,
        # Execute statement to process data and maintain state
        "manager_status": mgr_st,
        # Execute statement to process data and maintain state
        "admin_status": adm_st,
        # Execute statement to process data and maintain state
        "status": ui_st,
        # Execute statement to process data and maintain state
        "admin_reviewed_by": admin_name,
        # Execute statement to process data and maintain state
        "admin_reviewed_at": now.isoformat(),
        # Execute statement to process data and maintain state
        "admin_comment": adm_comm,
        # Execute statement to process data and maintain state
        "admin_rejection_reason": adm_rej,
        # Execute statement to process data and maintain state
        "approval_level": 3
    # Execute statement to process data and maintain state
    }
    # Return computed result or response payload to caller
    return updated


# Define update_leave_status function to handle update leave status
def update_leave_status(db: Session, leave_id: int, new_status: str, admin_name: str = "Admin Approver", comment: str = ""):
    """
    Bridge for general endpoints calling approve/reject.
    Default routed to admin_action_leave.
    """
    s_clean = new_status.lower()
    # Evaluate condition to control execution branch
    if "approve" in s_clean:
        # Return computed result or response payload to caller
        return admin_action_leave(db, leave_id, "Approved", admin_name=admin_name, comment=comment)
    # Evaluate alternate branch condition
    elif "reject" in s_clean:
        # Return computed result or response payload to caller
        return admin_action_leave(db, leave_id, "Rejected", admin_name=admin_name, comment=comment)
    # Return computed result or response payload to caller
    return None


# ==============================================================================
# AUTHORITATIVE SYSTEM-WIDE LEAVE CATALOG (get_all_leaves_admin)
# ==============================================================================
# Retrieves, deduplicates, and sorts all leave requests across the company:
# 1. Joins `leave_requests` master table with `profile_master` for complete metadata
#    (employee name, department, designation, branch location, supervisor).
# 2. Scans all dynamic monthly partition tables for newly created requests.
# 3. Deduplicates records using (emp_code, start_date, end_date, category) keys.
# 4. Formats human-readable status labels for frontend display badges.
# 5. Orders records chronologically descending by start date.
# ==============================================================================
def get_all_leaves_admin(db: Session):
    """
    Authoritative query: returns all leave applications across the system
    joined with profile_master for full employee metadata and exact 2-level status.
    """
    all_leaves = []
    # Set seen_ids variable to store seen ids value
    seen_ids = set()
    # Set seen_keys variable to store seen keys value
    seen_keys = set()

    # Begin guarded execution block to trap exceptions
    try:
        # Set query variable to store query value
        query = text("""
            SELECT l.*,
                   p.first_name, p.last_name, p.designation, p.department, p.role, p.reporting_supervisor, p.branch_location
            FROM leave_requests l
            LEFT JOIN profile_master p ON l.emp_code = p.emp_code
            ORDER BY l.id DESC
        """)
        # Set rows variable to store rows value
        rows = db.execute(query).mappings().all()
        # Iterate through items in sequence loop
        for r in rows:
            # Set rec_id variable to store rec id value
            rec_id = r["id"]
            # Evaluate condition to control execution branch
            if rec_id in seen_ids:
                # Skip to next iteration of active loop
                continue
            # Invoke seen_ids.add to perform operational action
            seen_ids.add(rec_id)

            # Set emp_name variable to store emp name value
            emp_name = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip()
            # Check if target condition is false or object is missing
            if not emp_name or emp_name.lower() == "none none":
                # Set emp_name variable to store emp name value
                emp_name = r.get("employee_name") or r.get("emp_code") or "Employee"

            # Set start_d variable to store start d value
            start_d = r.get("start_date")
            # Set end_d variable to store end d value
            end_d = r.get("end_date")
            # Set start_str variable to store start str value
            start_str = start_d.strftime("%d-%m-%Y") if hasattr(start_d, "strftime") else str(start_d or "")
            # Set end_str variable to store end str value
            end_str = end_d.strftime("%d-%m-%Y") if hasattr(end_d, "strftime") else str(end_d or "")
            # Set t_days variable to store t days value
            t_days = float(r.get("total_days") or 1.0)
            # Set cat variable to store cat value
            cat = r.get("category") or "Casual Leave"

            # Set comp_key variable to store comp key value
            comp_key = (
                # Invoke str to perform operational action
                str(r.get("emp_code") or "").upper().strip(),
                # Invoke str to perform operational action
                str(start_d),
                # Invoke str to perform operational action
                str(end_d),
                # Invoke str to perform operational action
                str(cat).upper().strip()
            # Execute statement to process data and maintain state
            )
            # Invoke seen_keys.add to perform operational action
            seen_keys.add(comp_key)

            # Authoritative status mapping
            raw_overall = str(r.get("overall_status") or "").upper().strip()
            # Set raw_status variable to store raw status value
            raw_status = str(r.get("status") or "").upper().strip()

            # Evaluate condition to control execution branch
            if raw_overall in ("PENDING_ADMIN", "PENDING_MANAGER", "APPROVED", "REJECTED"):
                # Set overall_st variable to store overall st value
                overall_st = raw_overall
            # Evaluate alternate branch condition
            elif "APPROV" in raw_status:
                # Set overall_st variable to store overall st value
                overall_st = "APPROVED"
            # Evaluate alternate branch condition
            elif "REJECT" in raw_status:
                # Set overall_st variable to store overall st value
                overall_st = "REJECTED"
            # Evaluate alternate branch condition
            elif raw_status == "PENDING_ADMIN":
                # Set overall_st variable to store overall st value
                overall_st = "PENDING_ADMIN"
            # Execute fallback branch when conditions are not met
            else:
                # Set overall_st variable to store overall st value
                overall_st = "PENDING_MANAGER"

            # Set mgr_st variable to store mgr st value
            mgr_st = str(r.get("manager_status") or "").upper().strip()
            # Check if target condition is false or object is missing
            if not mgr_st or mgr_st == "NONE":
                # Evaluate condition to control execution branch
                if overall_st in ("PENDING_ADMIN", "APPROVED"):
                    # Set mgr_st variable to store mgr st value
                    mgr_st = "APPROVED"
                # Evaluate alternate branch condition
                elif overall_st == "REJECTED" and "manager" in str(r.get("manager_rejection_reason") or "").lower():
                    # Set mgr_st variable to store mgr st value
                    mgr_st = "REJECTED"
                # Execute fallback branch when conditions are not met
                else:
                    # Set mgr_st variable to store mgr st value
                    mgr_st = "PENDING"

            # Set adm_st variable to store adm st value
            adm_st = str(r.get("admin_status") or "").upper().strip()
            # Check if target condition is false or object is missing
            if not adm_st or adm_st == "NONE":
                # Evaluate condition to control execution branch
                if overall_st == "APPROVED":
                    # Set adm_st variable to store adm st value
                    adm_st = "APPROVED"
                # Evaluate alternate branch condition
                elif overall_st == "REJECTED" and "admin" in str(r.get("admin_rejection_reason") or "").lower():
                    # Set adm_st variable to store adm st value
                    adm_st = "REJECTED"
                # Execute fallback branch when conditions are not met
                else:
                    # Set adm_st variable to store adm st value
                    adm_st = "PENDING"

            # Display status label for UI
            if overall_st == "APPROVED":
                # Set ui_status variable to store ui status value
                ui_status = "Approved"
            # Evaluate alternate branch condition
            elif overall_st == "REJECTED":
                # Set ui_status variable to store ui status value
                ui_status = "Rejected"
            # Evaluate alternate branch condition
            elif overall_st == "PENDING_ADMIN":
                # Set ui_status variable to store ui status value
                ui_status = "Pending Admin Approval"
            # Execute fallback branch when conditions are not met
            else:
                # Set ui_status variable to store ui status value
                ui_status = "Pending Manager Approval"

            # Set sub_at variable to store sub at value
            sub_at = r.get("submitted_at")
            # Set sub_at_str variable to store sub at str value
            sub_at_str = sub_at.isoformat() if hasattr(sub_at, "isoformat") else str(sub_at or "")

            # Execute statement to process data and maintain state
            all_leaves.append({
                # Execute statement to process data and maintain state
                "id": rec_id,
                # Execute statement to process data and maintain state
                "emp_code": r.get("emp_code") or "",
                # Execute statement to process data and maintain state
                "code": r.get("emp_code") or "",
                # Execute statement to process data and maintain state
                "empCode": r.get("emp_code") or "",
                # Execute statement to process data and maintain state
                "name": emp_name,
                # Execute statement to process data and maintain state
                "employee": emp_name,
                # Execute statement to process data and maintain state
                "employee_name": emp_name,
                # Execute statement to process data and maintain state
                "employeeName": emp_name,
                # Execute statement to process data and maintain state
                "department": r.get("department") or "General",
                # Execute statement to process data and maintain state
                "designation": r.get("designation") or r.get("role") or "Employee",
                # Execute statement to process data and maintain state
                "category": cat,
                # Execute statement to process data and maintain state
                "type": cat,
                # Execute statement to process data and maintain state
                "leave_type": cat,
                # Execute statement to process data and maintain state
                "start_date": str(start_d or ""),
                # Execute statement to process data and maintain state
                "end_date": str(end_d or ""),
                # Execute statement to process data and maintain state
                "startDate": start_str,
                # Execute statement to process data and maintain state
                "endDate": end_str,
                # Execute statement to process data and maintain state
                "from": start_str,
                # Execute statement to process data and maintain state
                "from_date": str(start_d or ""),
                # Execute statement to process data and maintain state
                "to": end_str,
                # Execute statement to process data and maintain state
                "to_date": str(end_d or ""),
                # Execute statement to process data and maintain state
                "total_days": t_days,
                # Execute statement to process data and maintain state
                "days": f"{t_days} days",
                # Execute statement to process data and maintain state
                "reason": r.get("reason") or "",
                # Execute statement to process data and maintain state
                "status": overall_st,
                # Execute statement to process data and maintain state
                "statusDisplay": ui_status,
                # Execute statement to process data and maintain state
                "overall_status": overall_st,
                # Execute statement to process data and maintain state
                "manager_status": mgr_st,
                # Execute statement to process data and maintain state
                "admin_status": adm_st,
                # Execute statement to process data and maintain state
                "manager_id": r.get("manager_id") or r.get("reporting_supervisor") or "MGR001",
                # Execute statement to process data and maintain state
                "manager_name": r.get("manager_name") or "Manager",
                # Execute statement to process data and maintain state
                "manager_reviewed_by": r.get("manager_reviewed_by"),
                # Execute statement to process data and maintain state
                "manager_reviewed_at": str(r.get("manager_reviewed_at") or ""),
                # Execute statement to process data and maintain state
                "manager_comment": r.get("manager_comment"),
                # Execute statement to process data and maintain state
                "manager_rejection_reason": r.get("manager_rejection_reason"),
                # Execute statement to process data and maintain state
                "admin_reviewed_by": r.get("admin_reviewed_by"),
                # Execute statement to process data and maintain state
                "admin_reviewed_at": str(r.get("admin_reviewed_at") or ""),
                # Execute statement to process data and maintain state
                "admin_comment": r.get("admin_comment"),
                # Execute statement to process data and maintain state
                "admin_rejection_reason": r.get("admin_rejection_reason"),
                # Execute statement to process data and maintain state
                "submitted_at": sub_at_str,
                # Execute statement to process data and maintain state
                "applied_date": str(start_d or ""),
                # Execute statement to process data and maintain state
                "approval_level": r.get("approval_level") or 1,
                # Execute statement to process data and maintain state
                "approver": r.get("admin_reviewed_by") or r.get("manager_name") or "Admin Approver",
                # Execute statement to process data and maintain state
                "location": r.get("branch_location") or "Mumbai; Maharashtra"
            # Execute statement to process data and maintain state
            })
    # Catch and handle specific exception if raised
    except Exception as e:
        # Begin guarded execution block to trap exceptions
        try:
            # Roll back transaction to revert changes on failure
            db.rollback()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
        # Log error message with failure diagnostic details
        logger.error(f"Error in get_all_leaves_admin: {e}")

    # Also check dynamic tables for any leaves not yet in leave_requests
    table_names = get_all_leave_tables(db)
    # Iterate through items in sequence loop
    for tbl in table_names:
        # Begin guarded execution block to trap exceptions
        try:
            # Set m_rows variable to store m rows value
            m_rows = db.execute(text(f"""
                SELECT m.*, p.first_name, p.last_name, p.designation, p.department, p.role, p.reporting_supervisor, p.branch_location
                FROM {tbl} m
                LEFT JOIN profile_master p ON m.emp_code = p.emp_code
            """)).mappings().all()
            # Iterate through items in sequence loop
            for r in m_rows:
                # Set rec_id variable to store rec id value
                rec_id = r.get("id")
                # Set start_d variable to store start d value
                start_d = r.get("start_date")
                # Set end_d variable to store end d value
                end_d = r.get("end_date")
                # Set cat variable to store cat value
                cat = r.get("category") or "Casual Leave"

                # Set comp_key variable to store comp key value
                comp_key = (
                    # Invoke str to perform operational action
                    str(r.get("emp_code") or "").upper().strip(),
                    # Invoke str to perform operational action
                    str(start_d),
                    # Invoke str to perform operational action
                    str(end_d),
                    # Invoke str to perform operational action
                    str(cat).upper().strip()
                # Execute statement to process data and maintain state
                )

                # Evaluate condition to control execution branch
                if (rec_id and rec_id in seen_ids) or comp_key in seen_keys:
                    # Skip to next iteration of active loop
                    continue
                # Evaluate condition to control execution branch
                if rec_id:
                    # Invoke seen_ids.add to perform operational action
                    seen_ids.add(rec_id)
                # Invoke seen_keys.add to perform operational action
                seen_keys.add(comp_key)

                # Set emp_name variable to store emp name value
                emp_name = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or r.get("employee_name") or r.get("emp_code") or "Employee"
                # Set start_str variable to store start str value
                start_str = start_d.strftime("%d-%m-%Y") if hasattr(start_d, "strftime") else str(start_d or "")
                # Set end_str variable to store end str value
                end_str = end_d.strftime("%d-%m-%Y") if hasattr(end_d, "strftime") else str(end_d or "")
                # Set t_days variable to store t days value
                t_days = float(r.get("total_days") or 1.0)
                # Set overall_st variable to store overall st value
                overall_st = str(r.get("overall_status") or r.get("status") or "PENDING_MANAGER").upper()
                # Evaluate condition to control execution branch
                if "APPROV" in overall_st:
                    # Set overall_st variable to store overall st value
                    overall_st = "APPROVED"
                # Evaluate alternate branch condition
                elif "REJECT" in overall_st:
                    # Set overall_st variable to store overall st value
                    overall_st = "REJECTED"
                # Evaluate alternate branch condition
                elif overall_st not in ("PENDING_ADMIN", "PENDING_MANAGER", "APPROVED", "REJECTED"):
                    # Set overall_st variable to store overall st value
                    overall_st = "PENDING_MANAGER"

                # Execute statement to process data and maintain state
                all_leaves.append({
                    # Execute statement to process data and maintain state
                    "id": rec_id or 9999,
                    # Execute statement to process data and maintain state
                    "emp_code": r.get("emp_code") or "",
                    # Execute statement to process data and maintain state
                    "name": emp_name,
                    # Execute statement to process data and maintain state
                    "employee": emp_name,
                    # Execute statement to process data and maintain state
                    "employee_name": emp_name,
                    # Execute statement to process data and maintain state
                    "department": r.get("department") or "General",
                    # Execute statement to process data and maintain state
                    "designation": r.get("designation") or "Employee",
                    # Execute statement to process data and maintain state
                    "category": cat,
                    # Execute statement to process data and maintain state
                    "type": cat,
                    # Execute statement to process data and maintain state
                    "leave_type": cat,
                    # Execute statement to process data and maintain state
                    "start_date": str(start_d or ""),
                    # Execute statement to process data and maintain state
                    "end_date": str(end_d or ""),
                    # Execute statement to process data and maintain state
                    "startDate": start_str,
                    # Execute statement to process data and maintain state
                    "endDate": end_str,
                    # Execute statement to process data and maintain state
                    "from": start_str,
                    # Execute statement to process data and maintain state
                    "to": end_str,
                    # Execute statement to process data and maintain state
                    "total_days": t_days,
                    # Execute statement to process data and maintain state
                    "days": f"{t_days} days",
                    # Execute statement to process data and maintain state
                    "reason": r.get("reason") or "",
                    # Execute statement to process data and maintain state
                    "status": overall_st,
                    # Specify parameter value for "statusDisplay": "Approved" if overall_st
                    "statusDisplay": "Approved" if overall_st == "APPROVED" else ("Rejected" if overall_st == "REJECTED" else ("Pending Admin Approval" if overall_st == "PENDING_ADMIN" else "Pending Manager Approval")),
                    # Execute statement to process data and maintain state
                    "overall_status": overall_st,
                    # Execute statement to process data and maintain state
                    "manager_status": r.get("manager_status") or "PENDING",
                    # Execute statement to process data and maintain state
                    "admin_status": r.get("admin_status") or "PENDING",
                    # Execute statement to process data and maintain state
                    "manager_id": r.get("manager_id") or "MGR001",
                    # Execute statement to process data and maintain state
                    "manager_name": r.get("manager_name") or "Manager",
                    # Execute statement to process data and maintain state
                    "manager_reviewed_by": r.get("manager_reviewed_by"),
                    # Execute statement to process data and maintain state
                    "manager_reviewed_at": str(r.get("manager_reviewed_at") or ""),
                    # Execute statement to process data and maintain state
                    "admin_reviewed_by": r.get("admin_reviewed_by"),
                    # Execute statement to process data and maintain state
                    "admin_reviewed_at": str(r.get("admin_reviewed_at") or ""),
                    # Execute statement to process data and maintain state
                    "submitted_at": str(r.get("submitted_at") or ""),
                    # Execute statement to process data and maintain state
                    "location": r.get("branch_location") or "Mumbai; Maharashtra"
                # Execute statement to process data and maintain state
                })
        # Catch and handle specific exception if raised
        except Exception:
            # Begin guarded execution block to trap exceptions
            try:
                # Roll back transaction to revert changes on failure
                db.rollback()
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass

    # Invoke all_leaves.sort to perform operational action
    all_leaves.sort(key=lambda x: str(x.get("start_date") or ""), reverse=True)
    # Return computed result or response payload to caller
    return all_leaves
