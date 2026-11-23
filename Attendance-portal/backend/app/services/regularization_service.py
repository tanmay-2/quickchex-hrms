# ==============================================================================
# QUICKCHEX HRMS BACKEND - REGULARIZATION_SERVICE.PY
# Path: Attendance-portal/backend/app/services/regularization_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'regularization_service'.
# Primary Functions:
#   • get_monthly_reg_table_name()
#   • ensure_monthly_reg_table()
#   • get_all_reg_tables()
#   • format_status_display()
#   • submit_regularization()
#   • find_regularization_globally()
#   • manager_action_request()
#   • admin_action_request()
#   • ... and 4 more functions
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text, inspect from sqlalchemy for module operations
from sqlalchemy import text, inspect
# Import date, datetime, timedelta from datetime for module operations
from datetime import date, datetime, timedelta
# Import module logging for system functionality
import logging
# Import Optional, List, Dict, Any from typing for module operations
from typing import Optional, List, Dict, Any

# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile

# Set logger variable to store logger value
logger = logging.getLogger(__name__)


# Define get_monthly_reg_table_name function to handle get monthly reg table name
def get_monthly_reg_table_name(date_obj: date):
    """Generates the dynamic table name based on year and month."""
    return f"regularization_{date_obj.year}_{date_obj.month:02d}"


# Define ensure_monthly_reg_table function to handle ensure monthly reg table
def ensure_monthly_reg_table(db: Session, table_name: str):
    """Ensures dynamic monthly regularization table exists with full schema."""
    try:
        # Execute statement to process data and maintain state
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
                is_notif_read BOOLEAN DEFAULT FALSE,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        # Commit transaction to persist changes in database
        db.commit()
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log warning message for non-fatal unexpected condition
        logger.warning(f"Notice on ensure_monthly_reg_table for {table_name}: {e}")


# Define get_all_reg_tables function to handle get all reg tables
def get_all_reg_tables(db: Session):
    """Returns all dynamic monthly regularization tables in the database."""
    tables = []

    # Primary: query information_schema directly
    try:
        # Set rows variable to store rows value
        rows = db.execute(text(
            # Execute statement to process data and maintain state
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name LIKE 'regularization_20%'"
        # Execute statement to process data and maintain state
        )).fetchall()
        # Iterate through items in sequence loop
        for row in rows:
            # Set t variable to store t value
            t = row[0]
            # Check if target condition is false or object is missing
            if t not in tables:
                # Invoke tables.append to perform operational action
                tables.append(t)
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

    # Fallback: SQLAlchemy inspect
    if not tables:
        # Begin guarded execution block to trap exceptions
        try:
            # Set insp variable to store insp value
            insp = inspect(db.bind)
            # Iterate through items in sequence loop
            for t in insp.get_table_names():
                # Check if target condition is false or object is missing
                if t.startswith("regularization_20") and t not in tables:
                    # Invoke tables.append to perform operational action
                    tables.append(t)
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

    # Return computed result or response payload to caller
    return tables


# Define format_status_display function to handle format status display
def format_status_display(status_code: str) -> str:
    """Standardizes human-readable regularization status label."""
    s = str(status_code or "Pending").strip().upper()
    # Evaluate condition to control execution branch
    if s in ("PENDING_MANAGER", "PENDING"):
        # Return computed result or response payload to caller
        return "Pending Manager Approval"
    # Evaluate alternate branch condition
    elif s in ("PENDING_ADMIN", "APPROVED_BY_MANAGER"):
        # Return computed result or response payload to caller
        return "Pending Admin Approval"
    # Evaluate alternate branch condition
    elif s in ("COMPLETED", "APPROVED"):
        # Return computed result or response payload to caller
        return "Approved"
    # Evaluate alternate branch condition
    elif s in ("REJECTED", "REJECTED_BY_MANAGER", "REJECTED_BY_ADMIN"):
        # Return computed result or response payload to caller
        return "Rejected"
    # Return computed result or response payload to caller
    return status_code or "Pending"


# Define submit_regularization function to handle submit regularization
def submit_regularization(
    # Define db schema field with type Session,
    db: Session,
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define target_date schema field with type date,
    target_date: date,
    # Define in_time schema field with type Optional[datetime],
    in_time: Optional[datetime],
    # Define out_time schema field with type Optional[datetime],
    out_time: Optional[datetime],
    # Define comment schema field with type str
    comment: str
# Execute statement to process data and maintain state
) -> dict:
    """
    Level 1: Employee submits a regularization request.
    Initial state: PENDING_MANAGER (manager_status=PENDING, admin_status=PENDING).
    No attendance corrections applied yet.
    """
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

    # Import IST, safe_parse_date, get_ist_now, get_ist_today from app.services.attendance_service for module operations
    from app.services.attendance_service import IST, safe_parse_date, get_ist_now, get_ist_today
    # Evaluate condition to control execution branch
    if isinstance(target_date, str):
        # Set target_date variable to store target date value
        target_date = safe_parse_date(target_date) or get_ist_today()
    # Evaluate alternate branch condition
    elif isinstance(target_date, datetime):
        # Set target_date variable to store target date value
        target_date = target_date.date()
    # Evaluate alternate branch condition
    elif not target_date:
        # Set target_date variable to store target date value
        target_date = get_ist_today()

    # Ensure in_time and out_time are naive IST datetimes matching target_date
    if in_time:
        # Check if target condition is false or object is missing
        if getattr(in_time, "tzinfo", None) is not None:
            # Set in_time variable to store in time value
            in_time = in_time.astimezone(IST).replace(tzinfo=None)
        # Set in_time variable to store in time value
        in_time = datetime.combine(target_date, in_time.time())

    # Evaluate condition to control execution branch
    if out_time:
        # Check if target condition is false or object is missing
        if getattr(out_time, "tzinfo", None) is not None:
            # Set out_time variable to store out time value
            out_time = out_time.astimezone(IST).replace(tzinfo=None)
        # Set out_time variable to store out time value
        out_time = datetime.combine(target_date, out_time.time())

    # Set now variable to store now value
    now = get_ist_now().replace(tzinfo=None)
    # Dynamic monthly table derived strictly from the actual regularization target date
    reg_table = get_monthly_reg_table_name(target_date)
    # Invoke ensure_monthly_reg_table to perform operational action
    ensure_monthly_reg_table(db, reg_table)

    # Set new_id variable to store new id value
    new_id = None
    # Begin guarded execution block to trap exceptions
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
        # Set params variable to store params value
        params = {
            # Execute statement to process data and maintain state
            "code": emp_code,
            # Execute statement to process data and maintain state
            "t_date": target_date,
            # Execute statement to process data and maintain state
            "in_t": in_time,
            # Execute statement to process data and maintain state
            "out_t": out_time,
            # Execute statement to process data and maintain state
            "comm": comment,
            # Execute statement to process data and maintain state
            "e_name": emp_name,
            # Execute statement to process data and maintain state
            "m_id": manager_id,
            # Execute statement to process data and maintain state
            "m_name": manager_name,
            # Execute statement to process data and maintain state
            "now": now
        # Execute statement to process data and maintain state
        }
        # Set res variable to store res value
        res = db.execute(static_sql, params)
        # Set row variable to store row value
        row = res.fetchone()
        # Set new_id variable to store new id value
        new_id = row[0] if row else None
        # Check if target condition is false or object is missing
        if not new_id:
            # Raise exception to abort current operation with error
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
        # Set m_params variable to store m params value
        m_params = {
            # Execute statement to process data and maintain state
            "nid": new_id,
            # Execute statement to process data and maintain state
            "code": emp_code,
            # Execute statement to process data and maintain state
            "t_date": target_date,
            # Execute statement to process data and maintain state
            "in_t": in_time,
            # Execute statement to process data and maintain state
            "out_t": out_time,
            # Execute statement to process data and maintain state
            "comm": comment,
            # Execute statement to process data and maintain state
            "e_name": emp_name,
            # Execute statement to process data and maintain state
            "m_id": manager_id,
            # Execute statement to process data and maintain state
            "m_name": manager_name,
            # Execute statement to process data and maintain state
            "now": now
        # Execute statement to process data and maintain state
        }
        # Invoke db.execute to perform operational action
        db.execute(monthly_sql, m_params)
        # Begin guarded execution block to trap exceptions
        try:
            # Invoke db.execute to perform operational action
            db.execute(text(f"SELECT setval(pg_get_serial_sequence('{reg_table}', 'id'), COALESCE((SELECT MAX(id) FROM {reg_table}), 1), true)"))
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

        # Atomic commit to PostgreSQL
        db.commit()
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Error submitting regularization into database: {e}")
        # Raise exception to abort current operation with error
        raise RuntimeError(f"Database write failed for regularization: {e}")

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "id": new_id,
        # Execute statement to process data and maintain state
        "rawId": new_id,
        # Execute statement to process data and maintain state
        "emp_code": emp_code,
        # Execute statement to process data and maintain state
        "employee_name": emp_name,
        # Execute statement to process data and maintain state
        "manager_id": manager_id,
        # Execute statement to process data and maintain state
        "manager_name": manager_name,
        # Execute statement to process data and maintain state
        "status": "PENDING_MANAGER",
        # Execute statement to process data and maintain state
        "overall_status": "PENDING_MANAGER",
        # Execute statement to process data and maintain state
        "manager_status": "PENDING",
        # Execute statement to process data and maintain state
        "admin_status": "PENDING",
        # Execute statement to process data and maintain state
        "statusDisplay": "Pending Manager Approval",
        # Execute statement to process data and maintain state
        "approval_level": 1,
        # Execute statement to process data and maintain state
        "target_date": str(target_date),
        # Execute statement to process data and maintain state
        "issued_for_in_time": in_time.isoformat() if in_time else None,
        # Execute statement to process data and maintain state
        "issued_for_out_time": out_time.isoformat() if out_time else None,
        # Execute statement to process data and maintain state
        "comment": comment,
        # Execute statement to process data and maintain state
        "submitted_at": now.isoformat()
    # Execute statement to process data and maintain state
    }


# Define find_regularization_globally function to handle find regularization globally
def find_regularization_globally(db: Session, req_id: int):
    """Searches for a regularization request across static and all dynamic tables."""
    try:
        # Set query variable to store query value
        query = text("SELECT * FROM regularizations WHERE id = :id")
        # Set row variable to store row value
        row = db.execute(query, {"id": int(req_id)}).mappings().first()
        # Evaluate condition to control execution branch
        if row:
            # Return computed result or response payload to caller
            return dict(row), "regularizations"
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Set tables variable to store tables value
    tables = get_all_reg_tables(db)
    # Iterate through items in sequence loop
    for t_name in tables:
        # Begin guarded execution block to trap exceptions
        try:
            # Set query variable to store query value
            query = text(f"SELECT * FROM {t_name} WHERE id = :id")
            # Set row variable to store row value
            row = db.execute(query, {"id": int(req_id)}).mappings().first()
            # Evaluate condition to control execution branch
            if row:
                # Return computed result or response payload to caller
                return dict(row), t_name
        # Catch and handle specific exception if raised
        except Exception:
            # Skip to next iteration of active loop
            continue

    # Return computed result or response payload to caller
    return None, None


# Define manager_action_request function to handle manager action request
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
    # Check if target condition is false or object is missing
    if not req:
        # Return computed result or response payload to caller
        return None

    # Set current_overall variable to store current overall value
    current_overall = str(req.get("overall_status") or req.get("status") or "").upper()
    # Evaluate condition to control execution branch
    if current_overall in ("APPROVED", "COMPLETED", "REJECTED"):
        # Raise exception to abort current operation with error
        raise ValueError("This regularization request has already been processed.")

    # Set is_approve variable to store is approve value
    is_approve = action.lower() == "approved"
    # Set now variable to store now value
    now = datetime.now()

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
    tables_to_update = set(get_all_reg_tables(db))
    # Invoke tables_to_update.add to perform operational action
    tables_to_update.add("regularizations")
    # Evaluate condition to control execution branch
    if found_table:
        # Invoke tables_to_update.add to perform operational action
        tables_to_update.add(found_table)

    # Set emp_code variable to store emp code value
    emp_code = req.get("emp_code")
    # Set target_d variable to store target d value
    target_d = req.get("target_date")
    # Evaluate condition to control execution branch
    if target_d:
        # Begin guarded execution block to trap exceptions
        try:
            # Evaluate condition to control execution branch
            if isinstance(target_d, str):
                # Set t_obj variable to store t obj value
                t_obj = datetime.strptime(target_d[:10], "%Y-%m-%d").date()
            # Execute fallback branch when conditions are not met
            else:
                # Set t_obj variable to store t obj value
                t_obj = target_d
            # Invoke tables_to_update.add to perform operational action
            tables_to_update.add(get_monthly_reg_table_name(t_obj))
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Iterate through items in sequence loop
    for t in tables_to_update:
        # Begin guarded execution block to trap exceptions
        try:
            # Execute statement to process data and maintain state
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
                # Execute statement to process data and maintain state
                "status": ui_st,
                # Execute statement to process data and maintain state
                "ost": overall_st,
                # Execute statement to process data and maintain state
                "mst": mgr_st,
                # Execute statement to process data and maintain state
                "ast": adm_st,
                # Execute statement to process data and maintain state
                "act": action,
                # Execute statement to process data and maintain state
                "mname": manager_name,
                # Execute statement to process data and maintain state
                "comm": mgr_comm,
                # Execute statement to process data and maintain state
                "mrej": mgr_rej,
                # Execute statement to process data and maintain state
                "now": now,
                # Execute statement to process data and maintain state
                "id": int(req_id),
                # Execute statement to process data and maintain state
                "c": emp_code,
                # Execute statement to process data and maintain state
                "td": target_d
            # Execute statement to process data and maintain state
            })
            # Commit transaction to persist changes in database
            db.commit()
        # Catch and handle specific exception if raised
        except Exception as e:
            # Roll back transaction to revert changes on failure
            db.rollback()
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"Error updating regularization in {t}: {e}")

    # Synchronize Attendance dynamically and live upon Manager Approval
    if is_approve:
        # Set in_time variable to store in time value
        in_time = req.get("issued_for_in_time")
        # Set out_time variable to store out time value
        out_time = req.get("issued_for_out_time")

        # Evaluate condition to control execution branch
        if isinstance(target_d, str):
            # Begin guarded execution block to trap exceptions
            try:
                # Set target_d variable to store target d value
                target_d = date.fromisoformat(target_d[:10])
            # Catch and handle specific exception if raised
            except Exception:
                # Set target_d variable to store target d value
                target_d = date.today()

        # Evaluate condition to control execution branch
        if emp_code and target_d:
            # Set att_table variable to store att table value
            att_table = f"attendance_{target_d.year}_{target_d.month:02d}"

            # Import calculate_attendance_status from app.services.attendance_service for module operations
            from app.services.attendance_service import calculate_attendance_status
            # Set calc variable to store calc value
            calc = calculate_attendance_status(
                # Set punch_in_time variable to store punch in time value
                punch_in_time=in_time,
                # Set punch_out_time variable to store punch out time value
                punch_out_time=out_time,
                # Set target_date variable to store target date value
                target_date=target_d
            # Execute statement to process data and maintain state
            )
            # Set att_status variable to store att status value
            att_status = calc["status"]
            # Set hours variable to store hours value
            hours = calc["hours"]

            # Set in_dt_obj variable to store in dt obj value
            in_dt_obj = safe_parse_datetime(in_time)
            # Set out_dt_obj variable to store out dt obj value
            out_dt_obj = safe_parse_datetime(out_time)
            # Set in_time_db variable to store in time db value
            in_time_db = in_dt_obj.replace(tzinfo=None) if in_dt_obj else None
            # Set out_time_db variable to store out time db value
            out_time_db = out_dt_obj.replace(tzinfo=None) if out_dt_obj else None

            # Begin guarded execution block to trap exceptions
            try:
                # Set att_row variable to store att row value
                att_row = db.execute(
                    # Invoke text to perform operational action
                    text(f"SELECT id FROM {att_table} WHERE emp_code = :c AND date = :d"),
                    # Execute statement to process data and maintain state
                    {"c": emp_code, "d": target_d}
                # Execute statement to process data and maintain state
                ).first()

                # Evaluate condition to control execution branch
                if att_row:
                    # Execute statement to process data and maintain state
                    db.execute(text(f"""
                        UPDATE {att_table}
                        SET punch_in_time = COALESCE(:in_time, punch_in_time),
                            punch_out_time = COALESCE(:out_time, punch_out_time),
                            hours_completed = :hours,
                            status = :st,
                            remark = 'Regularized'
                        WHERE emp_code = :c AND date = :d
                    """), {
                        # Execute statement to process data and maintain state
                        "in_time": in_time_db,
                        # Execute statement to process data and maintain state
                        "out_time": out_time_db,
                        # Execute statement to process data and maintain state
                        "hours": hours,
                        # Execute statement to process data and maintain state
                        "st": att_status,
                        # Execute statement to process data and maintain state
                        "c": emp_code,
                        # Execute statement to process data and maintain state
                        "d": target_d
                    # Execute statement to process data and maintain state
                    })
                # Execute fallback branch when conditions are not met
                else:
                    # Execute statement to process data and maintain state
                    db.execute(text(f"""
                        INSERT INTO {att_table}
                        (emp_code, date, punch_in_time, punch_out_time, hours_completed, status, remark)
                        VALUES (:c, :d, :in_time, :out_time, :hours, :st, 'Regularized')
                    """), {
                        # Execute statement to process data and maintain state
                        "c": emp_code,
                        # Execute statement to process data and maintain state
                        "d": target_d,
                        # Execute statement to process data and maintain state
                        "in_time": in_time_db,
                        # Execute statement to process data and maintain state
                        "out_time": out_time_db,
                        # Execute statement to process data and maintain state
                        "hours": hours,
                        # Execute statement to process data and maintain state
                        "st": att_status
                    # Execute statement to process data and maintain state
                    })
                # Commit transaction to persist changes in database
                db.commit()
                # Log informational message for system observability
                logger.info(f"Attendance synchronized for {emp_code} on {target_d} to {att_status} ({hours}h) via Manager approval")
            # Catch and handle specific exception if raised
            except Exception as err:
                # Roll back transaction to revert changes on failure
                db.rollback()
                # Log warning message for non-fatal unexpected condition
                logger.warning(f"Failed updating attendance table {att_table} on manager approve: {err}")

    # Execute statement to process data and maintain state
    req["status"] = ui_st
    # Execute statement to process data and maintain state
    req["overall_status"] = overall_st
    # Execute statement to process data and maintain state
    req["manager_status"] = mgr_st
    # Execute statement to process data and maintain state
    req["admin_status"] = adm_st
    # Execute statement to process data and maintain state
    req["statusDisplay"] = format_status_display(overall_st)
    # Execute statement to process data and maintain state
    req["manager_action"] = action
    # Execute statement to process data and maintain state
    req["manager_reviewed_by"] = manager_name
    # Execute statement to process data and maintain state
    req["manager_reviewed_at"] = now.isoformat()
    # Execute statement to process data and maintain state
    req["manager_comment"] = mgr_comm
    # Execute statement to process data and maintain state
    req["manager_rejection_reason"] = mgr_rej
    # Execute statement to process data and maintain state
    req["approval_level"] = 2
    # Return computed result or response payload to caller
    return req


# Define admin_action_request function to handle admin action request
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
    # Check if target condition is false or object is missing
    if not req:
        # Return computed result or response payload to caller
        return None

    # Set current_overall variable to store current overall value
    current_overall = str(req.get("overall_status") or req.get("status") or "").upper().strip()
    # Evaluate condition to control execution branch
    if current_overall in ("APPROVED", "COMPLETED", "REJECTED"):
        # Raise exception to abort current operation with error
        raise ValueError("This regularization request has already been processed.")
    # Check if target condition is false or object is missing
    if current_overall not in ("PENDING_MANAGER", "PENDING_ADMIN", "PENDING", "APPROVED_BY_MANAGER"):
        # Raise exception to abort current operation with error
        raise ValueError(f"Cannot process request in status '{current_overall}'.")

    # Set is_approve variable to store is approve value
    is_approve = action.lower() == "approved"
    # Check if target condition is false or object is missing
    if not is_approve and not (comment and str(comment).strip()):
        # Raise exception to abort current operation with error
        raise ValueError("Reason for rejection is required.")

    # Set now variable to store now value
    now = datetime.now()

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
        # Set adm_comm variable to store adm comm value
        adm_comm = comment or "Approved by Admin"
        # Set adm_rej variable to store adm rej value
        adm_rej = None
    # Execute fallback branch when conditions are not met
    else:
        # Set overall_st variable to store overall st value
        overall_st = "REJECTED"
        # Set mgr_st variable to store mgr st value
        mgr_st = req.get("manager_status") or "APPROVED"
        # Set adm_st variable to store adm st value
        adm_st = "REJECTED"
        # Set ui_st variable to store ui st value
        ui_st = "Rejected"
        # Set adm_comm variable to store adm comm value
        adm_comm = None
        # Set adm_rej variable to store adm rej value
        adm_rej = comment or "Rejected by Admin"

    # Set tables_to_update variable to store tables to update value
    tables_to_update = set(get_all_reg_tables(db))
    # Invoke tables_to_update.add to perform operational action
    tables_to_update.add("regularizations")
    # Evaluate condition to control execution branch
    if found_table:
        # Invoke tables_to_update.add to perform operational action
        tables_to_update.add(found_table)

    # Set emp_code variable to store emp code value
    emp_code = req.get("emp_code")
    # Set target_d variable to store target d value
    target_d = req.get("target_date")
    # Evaluate condition to control execution branch
    if target_d:
        # Begin guarded execution block to trap exceptions
        try:
            # Evaluate condition to control execution branch
            if isinstance(target_d, str):
                # Set t_obj variable to store t obj value
                t_obj = datetime.strptime(target_d[:10], "%Y-%m-%d").date()
            # Execute fallback branch when conditions are not met
            else:
                # Set t_obj variable to store t obj value
                t_obj = target_d
            # Invoke tables_to_update.add to perform operational action
            tables_to_update.add(get_monthly_reg_table_name(t_obj))
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Iterate through items in sequence loop
    for t in tables_to_update:
        # Begin guarded execution block to trap exceptions
        try:
            # Execute statement to process data and maintain state
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
                # Execute statement to process data and maintain state
                "status": ui_st,
                # Execute statement to process data and maintain state
                "ost": overall_st,
                # Execute statement to process data and maintain state
                "mst": mgr_st,
                # Execute statement to process data and maintain state
                "ast": adm_st,
                # Execute statement to process data and maintain state
                "act": action,
                # Execute statement to process data and maintain state
                "aname": admin_name,
                # Execute statement to process data and maintain state
                "comm": adm_comm,
                # Execute statement to process data and maintain state
                "arej": adm_rej,
                # Execute statement to process data and maintain state
                "now": now,
                # Execute statement to process data and maintain state
                "id": int(req_id),
                # Execute statement to process data and maintain state
                "c": emp_code,
                # Execute statement to process data and maintain state
                "td": target_d
            # Execute statement to process data and maintain state
            })
            # Commit transaction to persist changes in database
            db.commit()
        # Catch and handle specific exception if raised
        except Exception as e:
            # Roll back transaction to revert changes on failure
            db.rollback()
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"Error updating regularization in {t}: {e}")

    # Synchronize Attendance ONLY upon final Admin approval
    if is_approve:
        # Set in_time variable to store in time value
        in_time = req.get("issued_for_in_time")
        # Set out_time variable to store out time value
        out_time = req.get("issued_for_out_time")

        # Evaluate condition to control execution branch
        if isinstance(target_d, str):
            # Begin guarded execution block to trap exceptions
            try:
                # Set target_d variable to store target d value
                target_d = date.fromisoformat(target_d[:10])
            # Catch and handle specific exception if raised
            except Exception:
                # Set target_d variable to store target d value
                target_d = date.today()

        # Evaluate condition to control execution branch
        if emp_code and target_d:
            # Set att_table variable to store att table value
            att_table = f"attendance_{target_d.year}_{target_d.month:02d}"

            # Calculate completed hours and authoritative status (>=9h: Present, >=5h: Half Day, <5h: Absent)
            from app.services.attendance_service import calculate_attendance_status
            # Set calc variable to store calc value
            calc = calculate_attendance_status(
                # Set punch_in_time variable to store punch in time value
                punch_in_time=in_time,
                # Set punch_out_time variable to store punch out time value
                punch_out_time=out_time,
                # Set target_date variable to store target date value
                target_date=target_d
            # Execute statement to process data and maintain state
            )
            # Set att_status variable to store att status value
            att_status = calc["status"]
            # Set hours variable to store hours value
            hours = calc["hours"]

            # Set in_dt_obj variable to store in dt obj value
            in_dt_obj = safe_parse_datetime(in_time)
            # Set out_dt_obj variable to store out dt obj value
            out_dt_obj = safe_parse_datetime(out_time)
            # Set in_time_db variable to store in time db value
            in_time_db = in_dt_obj.replace(tzinfo=None) if in_dt_obj else None
            # Set out_time_db variable to store out time db value
            out_time_db = out_dt_obj.replace(tzinfo=None) if out_dt_obj else None

            # Begin guarded execution block to trap exceptions
            try:
                # Set att_row variable to store att row value
                att_row = db.execute(
                    # Invoke text to perform operational action
                    text(f"SELECT id FROM {att_table} WHERE emp_code = :c AND date = :d"),
                    # Execute statement to process data and maintain state
                    {"c": emp_code, "d": target_d}
                # Execute statement to process data and maintain state
                ).first()

                # Evaluate condition to control execution branch
                if att_row:
                    # Execute statement to process data and maintain state
                    db.execute(text(f"""
                        UPDATE {att_table}
                        SET punch_in_time = COALESCE(:in_time, punch_in_time),
                            punch_out_time = COALESCE(:out_time, punch_out_time),
                            hours_completed = :hours,
                            status = :st,
                            remark = 'Regularized'
                        WHERE emp_code = :c AND date = :d
                    """), {
                        # Execute statement to process data and maintain state
                        "in_time": in_time_db,
                        # Execute statement to process data and maintain state
                        "out_time": out_time_db,
                        # Execute statement to process data and maintain state
                        "hours": hours,
                        # Execute statement to process data and maintain state
                        "st": att_status,
                        # Execute statement to process data and maintain state
                        "c": emp_code,
                        # Execute statement to process data and maintain state
                        "d": target_d
                    # Execute statement to process data and maintain state
                    })
                # Execute fallback branch when conditions are not met
                else:
                    # Execute statement to process data and maintain state
                    db.execute(text(f"""
                        INSERT INTO {att_table}
                        (emp_code, date, punch_in_time, punch_out_time, hours_completed, status, remark)
                        VALUES (:c, :d, :in_time, :out_time, :hours, :st, 'Regularized')
                    """), {
                        # Execute statement to process data and maintain state
                        "c": emp_code,
                        # Execute statement to process data and maintain state
                        "d": target_d,
                        # Execute statement to process data and maintain state
                        "in_time": in_time_db,
                        # Execute statement to process data and maintain state
                        "out_time": out_time_db,
                        # Execute statement to process data and maintain state
                        "hours": hours,
                        # Execute statement to process data and maintain state
                        "st": att_status
                    # Execute statement to process data and maintain state
                    })
                # Commit transaction to persist changes in database
                db.commit()
                # Log informational message for system observability
                logger.info(f"Attendance synchronized for {emp_code} on {target_d} to {att_status} ({hours}h)")
            # Catch and handle specific exception if raised
            except Exception as err:
                # Roll back transaction to revert changes on failure
                db.rollback()
                # Log warning message for non-fatal unexpected condition
                logger.warning(f"Failed updating attendance table {att_table}: {err}")

    # Execute statement to process data and maintain state
    req["status"] = ui_st
    # Execute statement to process data and maintain state
    req["overall_status"] = overall_st
    # Execute statement to process data and maintain state
    req["manager_status"] = mgr_st
    # Execute statement to process data and maintain state
    req["admin_status"] = adm_st
    # Execute statement to process data and maintain state
    req["statusDisplay"] = format_status_display(overall_st)
    # Execute statement to process data and maintain state
    req["admin_action"] = action
    # Execute statement to process data and maintain state
    req["admin_reviewed_by"] = admin_name
    # Execute statement to process data and maintain state
    req["admin_reviewed_at"] = now.isoformat()
    # Execute statement to process data and maintain state
    req["admin_comment"] = adm_comm
    # Execute statement to process data and maintain state
    req["admin_rejection_reason"] = adm_rej
    # Execute statement to process data and maintain state
    req["approval_level"] = 3
    # Return computed result or response payload to caller
    return req


# Define update_request_status function to handle update request status
def update_request_status(db: Session, req_id: int, new_status: str, admin_name: str = "Admin Approver", comment: str = ""):
    """Bridge for PUT endpoints calling approve/reject."""
    s_clean = new_status.lower()
    # Execute statement to process data and maintain state
    req, _ = find_regularization_globally(db, req_id)
    # Check if target condition is false or object is missing
    if not req:
        # Return computed result or response payload to caller
        return None
    # Set curr_st variable to store curr st value
    curr_st = str(req.get("overall_status") or req.get("status") or "").upper()
    # Evaluate condition to control execution branch
    if curr_st == "PENDING_MANAGER":
        # Evaluate condition to control execution branch
        if "approve" in s_clean:
            # Return computed result or response payload to caller
            return manager_action_request(db, req_id, "Approved", comment=comment, manager_name=admin_name)
        # Evaluate alternate branch condition
        elif "reject" in s_clean:
            # Return computed result or response payload to caller
            return manager_action_request(db, req_id, "Rejected", comment=comment, manager_name=admin_name)
    # Execute fallback branch when conditions are not met
    else:
        # Evaluate condition to control execution branch
        if "approve" in s_clean:
            # Return computed result or response payload to caller
            return admin_action_request(db, req_id, "Approved", comment=comment, admin_name=admin_name)
        # Evaluate alternate branch condition
        elif "reject" in s_clean:
            # Return computed result or response payload to caller
            return admin_action_request(db, req_id, "Rejected", comment=comment, admin_name=admin_name)
    # Return computed result or response payload to caller
    return None


# Define get_all_regularizations_admin function to handle get all regularizations admin
def get_all_regularizations_admin(db: Session, supervisor_code: str = None, limit: Optional[int] = None, offset: int = 0) -> List[dict]:
    """
    Authoritative query: returns all regularization requests across the system
    joined with profile_master for full employee metadata and exact 2-level status.
    """
    all_regs = []
    # Set seen_keys variable to store seen keys value
    seen_keys = set()

    # Begin guarded execution block to trap exceptions
    try:
        # Set where_clause variable to store where clause value
        where_clause = ""
        # Set params variable to store params value
        params = {}
        # Evaluate condition to control execution branch
        if supervisor_code:
            # Set where_clause variable to store where clause value
            where_clause = "WHERE (p.reporting_supervisor = :sup OR r.manager_id = :sup)"
            # Execute statement to process data and maintain state
            params["sup"] = supervisor_code

        # Set limit_clause variable to store limit clause value
        limit_clause = ""
        # Check if target condition is false or object is missing
        if limit is not None:
            # Set limit_clause variable to store limit clause value
            limit_clause = "LIMIT :limit OFFSET :offset"
            # Execute statement to process data and maintain state
            params["limit"] = limit
            # Execute statement to process data and maintain state
            params["offset"] = offset or 0

        # Set query variable to store query value
        query = text(f"""
            SELECT r.*, p.first_name, p.last_name, p.email, p.mobile_no, p.department, p.designation, p.reporting_supervisor, p.branch_location, p.emp_join_date
            FROM regularizations r
            LEFT JOIN profile_master p ON r.emp_code = p.emp_code
            {where_clause}
            ORDER BY r.id DESC
            {limit_clause}
        """)
        # Set rows variable to store rows value
        rows = db.execute(query, params).mappings().all()
        # Iterate through items in sequence loop
        for r in rows:
            # Set actual_id variable to store actual id value
            actual_id = r.get("id")
            # Set comp_key variable to store comp key value
            comp_key = (str(r.get("emp_code") or "").upper().strip(), str(r.get("target_date") or "").strip())
            # Evaluate condition to control execution branch
            if actual_id in seen_keys or comp_key in seen_keys:
                # Skip to next iteration of active loop
                continue
            # Invoke seen_keys.add to perform operational action
            seen_keys.add(actual_id)
            # Invoke seen_keys.add to perform operational action
            seen_keys.add(comp_key)

            # Set emp_c variable to store emp c value
            emp_c = r.get("emp_code")
            # Set emp_name variable to store emp name value
            emp_name = r.get("employee_name") or f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or emp_c or "Employee"
            # Set tar_d variable to store tar d value
            tar_d = r.get("target_date")
            # Set req_d variable to store req d value
            req_d = r.get("submitted_at") or r.get("created_at") or r.get("request_date") or tar_d
            # Import safe_parse_date, safe_parse_datetime, safe_format_time, safe_format_date, safe_calc_hours from app.services.attendance_service for module operations
            from app.services.attendance_service import safe_parse_date, safe_parse_datetime, safe_format_time, safe_format_date, safe_calc_hours
            # Set tar_parsed variable to store tar parsed value
            tar_parsed = safe_parse_date(tar_d)
            # Set tar_str variable to store tar str value
            tar_str = safe_format_date(tar_parsed, "%d %b %Y") if tar_parsed else str(tar_d or "")

            # Set req_parsed variable to store req parsed value
            req_parsed = safe_parse_datetime(req_d)
            # Set req_str variable to store req str value
            req_str = req_parsed.strftime("%d %b %Y, %I:%M %p") if req_parsed else str(req_d or "")

            # Set in_val variable to store in val value
            in_val = r.get("issued_for_in_time") or r.get("check_in") or r.get("in_time")
            # Set out_val variable to store out val value
            out_val = r.get("issued_for_out_time") or r.get("check_out") or r.get("out_time")

            # Set in_t variable to store in t value
            in_t = safe_format_time(in_val, "—")
            # Set out_t variable to store out t value
            out_t = safe_format_time(out_val, "—")

            # Evaluate condition to control execution branch
            if in_val and out_val:
                # Set calc_wh variable to store calc wh value
                calc_wh = safe_calc_hours(in_val, out_val)
                # Set req_wh_str variable to store req wh str value
                req_wh_str = f"{int(calc_wh)}h {int(round((calc_wh % 1) * 60)):02d}m"
            # Execute fallback branch when conditions are not met
            else:
                # Set req_wh_str variable to store req wh str value
                req_wh_str = "—"

            # Two-level status mapping
            raw_overall = str(r.get("overall_status") or "").upper().strip()
            # Set raw_status variable to store raw status value
            raw_status = str(r.get("status") or "").upper().strip()

            # Evaluate condition to control execution branch
            if raw_overall in ("PENDING_ADMIN", "PENDING_MANAGER", "APPROVED", "REJECTED"):
                # Set overall_st variable to store overall st value
                overall_st = raw_overall
            # Evaluate alternate branch condition
            elif "APPROV" in raw_status or "COMPLET" in raw_status:
                # Set overall_st variable to store overall st value
                overall_st = "APPROVED"
            # Evaluate alternate branch condition
            elif "REJECT" in raw_status:
                # Set overall_st variable to store overall st value
                overall_st = "REJECTED"
            # Evaluate alternate branch condition
            elif raw_status in ("PENDING_ADMIN", "APPROVED_BY_MANAGER"):
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

            # Set st_disp variable to store st disp value
            st_disp = format_status_display(overall_st)

            # Original attendance data
            orig_in_str = "—"
            # Set orig_out_str variable to store orig out str value
            orig_out_str = "—"
            # Set orig_wh_str variable to store orig wh str value
            orig_wh_str = "—"
            # Set orig_status variable to store orig status value
            orig_status = "Absent"
            # Evaluate condition to control execution branch
            if emp_c and tar_d:
                # Begin guarded execution block to trap exceptions
                try:
                    # Set p_date variable to store p date value
                    p_date = safe_parse_date(tar_d)
                    # Evaluate condition to control execution branch
                    if p_date:
                        # Set att_tbl variable to store att tbl value
                        att_tbl = f"attendance_{p_date.year}_{p_date.month:02d}"
                        # Set att_q variable to store att q value
                        att_q = text(f"""
                            SELECT punch_in_time, punch_out_time, hours_completed, status
                            FROM {att_tbl}
                            WHERE emp_code = :c AND date = :d
                            ORDER BY id DESC LIMIT 1
                        """)
                        # Set att_row variable to store att row value
                        att_row = db.execute(att_q, {"c": str(emp_c), "d": p_date}).mappings().first()
                        # Evaluate condition to control execution branch
                        if att_row:
                            # Set p_in variable to store p in value
                            p_in = att_row.get("punch_in_time")
                            # Set p_out variable to store p out value
                            p_out = att_row.get("punch_out_time")
                            # Set orig_in_str variable to store orig in str value
                            orig_in_str = safe_format_time(p_in) if p_in else "—"
                            # Set orig_out_str variable to store orig out str value
                            orig_out_str = safe_format_time(p_out) if p_out else "—"
                            # Set hc variable to store hc value
                            hc = att_row.get("hours_completed")
                            # Check if target condition is false or object is missing
                            if hc is not None and float(hc) > 0:
                                # Set hf variable to store hf value
                                hf = float(hc)
                                # Set orig_wh_str variable to store orig wh str value
                                orig_wh_str = f"{int(hf)}h {int(round((hf % 1) * 60)):02d}m"
                            # Evaluate alternate branch condition
                            elif p_in and p_out:
                                # Set calc_h variable to store calc h value
                                calc_h = safe_calc_hours(p_in, p_out)
                                # Set orig_wh_str variable to store orig wh str value
                                orig_wh_str = f"{int(calc_h)}h {int(round((calc_h % 1) * 60)):02d}m"
                            # Execute fallback branch when conditions are not met
                            else:
                                # Set orig_wh_str variable to store orig wh str value
                                orig_wh_str = "—"
                            # Set orig_status variable to store orig status value
                            orig_status = att_row.get("status") or ("Present" if orig_in_str != "—" and orig_out_str != "—" else "Absent")
                # Catch and handle specific exception if raised
                except Exception:
                    # Placeholder statement performing no operation
                    pass

            # Set email_val variable to store email val value
            email_val = r.get("email") or "—"
            # Set mobile_val variable to store mobile val value
            mobile_val = r.get("mobile_no") or r.get("phone") or "—"

            # Execute statement to process data and maintain state
            all_regs.append({
                # Execute statement to process data and maintain state
                "id": actual_id,
                # Execute statement to process data and maintain state
                "rawId": actual_id,
                # Execute statement to process data and maintain state
                "emp_code": emp_c or "",
                # Execute statement to process data and maintain state
                "employeeId": emp_c or "",
                # Execute statement to process data and maintain state
                "name": emp_name,
                # Execute statement to process data and maintain state
                "employeeName": emp_name,
                # Execute statement to process data and maintain state
                "email": email_val,
                # Execute statement to process data and maintain state
                "contact_number": mobile_val,
                # Execute statement to process data and maintain state
                "contactNumber": mobile_val,
                # Execute statement to process data and maintain state
                "phone": mobile_val,
                # Execute statement to process data and maintain state
                "department": r.get("department") or "Operations",
                # Execute statement to process data and maintain state
                "designation": r.get("designation") or "Employee",
                # Execute statement to process data and maintain state
                "location": r.get("branch_location") or "Mumbai, IN",
                # Execute statement to process data and maintain state
                "date": str(tar_d or ""),
                # Execute statement to process data and maintain state
                "attendanceDate": tar_str,
                # Execute statement to process data and maintain state
                "effectiveDate": str(tar_d or ""),
                # Execute statement to process data and maintain state
                "targetDate": str(tar_d or ""),
                # Execute statement to process data and maintain state
                "target_date": str(tar_d or ""),
                # Execute statement to process data and maintain state
                "appliedDate": req_str,
                # Execute statement to process data and maintain state
                "requestDate": req_str,
                # Execute statement to process data and maintain state
                "request_date": str(req_d or ""),
                # Execute statement to process data and maintain state
                "created_at": str(req_d or ""),
                # Execute statement to process data and maintain state
                "submittedOn": req_str,
                # Execute statement to process data and maintain state
                "submitted_on": req_str,
                # Execute statement to process data and maintain state
                "submitted_at": str(req_d or ""),
                # Execute statement to process data and maintain state
                "checkIn": in_t,
                # Execute statement to process data and maintain state
                "checkOut": out_t,
                # Execute statement to process data and maintain state
                "inTime": in_t,
                # Execute statement to process data and maintain state
                "outTime": out_t,
                # Execute statement to process data and maintain state
                "requested_check_in": in_t,
                # Execute statement to process data and maintain state
                "requested_check_out": out_t,
                # Execute statement to process data and maintain state
                "requestedCheckIn": in_t,
                # Execute statement to process data and maintain state
                "requestedCheckOut": out_t,
                # Execute statement to process data and maintain state
                "working_hours": req_wh_str,
                # Execute statement to process data and maintain state
                "workingHours": req_wh_str,
                # Execute statement to process data and maintain state
                "issued_for_in_time": str(in_val) if in_val else None,
                # Execute statement to process data and maintain state
                "issued_for_out_time": str(out_val) if out_val else None,
                # Specify parameter value for "requestedTimings": f"In: {in_t} Out: {out_t}" if in_t !
                "requestedTimings": f"In: {in_t} Out: {out_t}" if in_t != "—" or out_t != "—" else "—",
                # Execute statement to process data and maintain state
                "original_check_in": orig_in_str,
                # Execute statement to process data and maintain state
                "original_check_out": orig_out_str,
                # Execute statement to process data and maintain state
                "originalCheckIn": orig_in_str,
                # Execute statement to process data and maintain state
                "originalCheckOut": orig_out_str,
                # Execute statement to process data and maintain state
                "original_working_hours": orig_wh_str,
                # Execute statement to process data and maintain state
                "originalWorkingHours": orig_wh_str,
                # Execute statement to process data and maintain state
                "original_status": orig_status,
                # Execute statement to process data and maintain state
                "issue": r.get("comment") or "Attendance correction",
                # Execute statement to process data and maintain state
                "reason": r.get("comment") or "",
                # Execute statement to process data and maintain state
                "comment": r.get("comment") or "",
                # Execute statement to process data and maintain state
                "status": overall_st,
                # Execute statement to process data and maintain state
                "statusDisplay": st_disp,
                # Execute statement to process data and maintain state
                "overall_status": overall_st,
                # Execute statement to process data and maintain state
                "manager_status": mgr_st,
                # Execute statement to process data and maintain state
                "admin_status": adm_st,
                # Execute statement to process data and maintain state
                "approval_level": r.get("approval_level") or 1,
                # Execute statement to process data and maintain state
                "manager_action": r.get("manager_action") or mgr_st,
                # Execute statement to process data and maintain state
                "manager_reviewed_by": r.get("manager_reviewed_by"),
                # Execute statement to process data and maintain state
                "manager_reviewed_at": str(r.get("manager_reviewed_at") or ""),
                # Execute statement to process data and maintain state
                "manager_comment": r.get("manager_comment") or "",
                # Execute statement to process data and maintain state
                "manager_rejection_reason": r.get("manager_rejection_reason") or "",
                # Execute statement to process data and maintain state
                "admin_action": r.get("admin_action") or adm_st,
                # Execute statement to process data and maintain state
                "admin_reviewed_by": r.get("admin_reviewed_by"),
                # Execute statement to process data and maintain state
                "admin_reviewed_at": str(r.get("admin_reviewed_at") or ""),
                # Execute statement to process data and maintain state
                "admin_comment": r.get("admin_comment") or "",
                # Execute statement to process data and maintain state
                "admin_rejection_reason": r.get("admin_rejection_reason") or "",
                # Execute statement to process data and maintain state
                "manager_id": r.get("manager_id") or r.get("reporting_supervisor") or "MGR001",
                # Execute statement to process data and maintain state
                "manager_name": r.get("manager_name") or "Manager",
                # Execute statement to process data and maintain state
                "approver": r.get("admin_reviewed_by") or r.get("manager_name") or "Reporting Manager",
                # Execute statement to process data and maintain state
                "reviewer": r.get("manager_name") or "Manager",
                # Execute statement to process data and maintain state
                "review_date": str(r.get("updated_at") or "")[:19] if r.get("updated_at") else "—",
                # Execute statement to process data and maintain state
                "rejection_reason": r.get("admin_rejection_reason") or r.get("manager_rejection_reason") or r.get("comment") or "",
                # Execute statement to process data and maintain state
                "type": "Pending" if "PENDING" in overall_st else ("Completed" if overall_st in ("APPROVED", "REJECTED") else "Pending")
            # Execute statement to process data and maintain state
            })
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"Error fetching from regularizations: {e}")

    # Also scan dynamic tables
    tables = get_all_reg_tables(db)
    # Iterate through items in sequence loop
    for t_name in tables:
        # Begin guarded execution block to trap exceptions
        try:
            # Set m_rows variable to store m rows value
            m_rows = db.execute(text(f"""
                SELECT r.*, p.first_name, p.last_name, p.email, p.mobile_no, p.department, p.designation, p.reporting_supervisor, p.branch_location, p.emp_join_date
                FROM {t_name} r
                LEFT JOIN profile_master p ON r.emp_code = p.emp_code
                ORDER BY r.id DESC
            """)).mappings().all()
            # Iterate through items in sequence loop
            for r in m_rows:
                # Set actual_id variable to store actual id value
                actual_id = r.get("id")
                # Set comp_key variable to store comp key value
                comp_key = (str(r.get("emp_code") or "").upper().strip(), str(r.get("target_date") or "").strip())
                # Evaluate condition to control execution branch
                if (actual_id and actual_id in seen_keys) or comp_key in seen_keys:
                    # Skip to next iteration of active loop
                    continue
                # Evaluate condition to control execution branch
                if actual_id:
                    # Invoke seen_keys.add to perform operational action
                    seen_keys.add(actual_id)
                # Invoke seen_keys.add to perform operational action
                seen_keys.add(comp_key)

                # Set emp_c variable to store emp c value
                emp_c = r.get("emp_code")
                # Set emp_name variable to store emp name value
                emp_name = r.get("employee_name") or f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or emp_c or "Employee"
                # Set tar_d variable to store tar d value
                tar_d = r.get("target_date")
                # Set req_d variable to store req d value
                req_d = r.get("submitted_at") or r.get("created_at") or tar_d
                # Import safe_parse_date, safe_parse_datetime, safe_format_time, safe_format_date, safe_calc_hours from app.services.attendance_service for module operations
                from app.services.attendance_service import safe_parse_date, safe_parse_datetime, safe_format_time, safe_format_date, safe_calc_hours
                # Set tar_parsed variable to store tar parsed value
                tar_parsed = safe_parse_date(tar_d)
                # Set tar_str variable to store tar str value
                tar_str = safe_format_date(tar_parsed, "%d %b %Y") if tar_parsed else str(tar_d or "")
                # Set req_parsed variable to store req parsed value
                req_parsed = safe_parse_datetime(req_d)
                # Set req_str variable to store req str value
                req_str = req_parsed.strftime("%d %b %Y, %I:%M %p") if req_parsed else str(req_d or "")

                # Set in_val variable to store in val value
                in_val = r.get("issued_for_in_time")
                # Set out_val variable to store out val value
                out_val = r.get("issued_for_out_time")
                # Set in_t variable to store in t value
                in_t = safe_format_time(in_val, "—")
                # Set out_t variable to store out t value
                out_t = safe_format_time(out_val, "—")

                # Evaluate condition to control execution branch
                if in_val and out_val:
                    # Set calc_wh variable to store calc wh value
                    calc_wh = safe_calc_hours(in_val, out_val)
                    # Set req_wh_str variable to store req wh str value
                    req_wh_str = f"{int(calc_wh)}h {int(round((calc_wh % 1) * 60)):02d}m"
                # Execute fallback branch when conditions are not met
                else:
                    # Set req_wh_str variable to store req wh str value
                    req_wh_str = "—"

                # Set raw_overall variable to store raw overall value
                raw_overall = str(r.get("overall_status") or r.get("status") or "PENDING_MANAGER").upper()
                # Evaluate condition to control execution branch
                if "APPROV" in raw_overall or "COMPLET" in raw_overall:
                    # Set overall_st variable to store overall st value
                    overall_st = "APPROVED"
                # Evaluate alternate branch condition
                elif "REJECT" in raw_overall:
                    # Set overall_st variable to store overall st value
                    overall_st = "REJECTED"
                # Evaluate alternate branch condition
                elif raw_overall in ("PENDING_ADMIN", "APPROVED_BY_MANAGER"):
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

                # Set st_disp variable to store st disp value
                st_disp = format_status_display(overall_st)

                # Original attendance data
                orig_in_str = "—"
                # Set orig_out_str variable to store orig out str value
                orig_out_str = "—"
                # Set orig_wh_str variable to store orig wh str value
                orig_wh_str = "—"
                # Set orig_status variable to store orig status value
                orig_status = "Absent"
                # Evaluate condition to control execution branch
                if emp_c and tar_d:
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Set p_date variable to store p date value
                        p_date = safe_parse_date(tar_d)
                        # Evaluate condition to control execution branch
                        if p_date:
                            # Set att_tbl variable to store att tbl value
                            att_tbl = f"attendance_{p_date.year}_{p_date.month:02d}"
                            # Set att_q variable to store att q value
                            att_q = text(f"""
                                SELECT punch_in_time, punch_out_time, hours_completed, status
                                FROM {att_tbl}
                                WHERE emp_code = :c AND date = :d
                                ORDER BY id DESC LIMIT 1
                            """)
                            # Set att_row variable to store att row value
                            att_row = db.execute(att_q, {"c": str(emp_c), "d": p_date}).mappings().first()
                            # Evaluate condition to control execution branch
                            if att_row:
                                # Set p_in variable to store p in value
                                p_in = att_row.get("punch_in_time")
                                # Set p_out variable to store p out value
                                p_out = att_row.get("punch_out_time")
                                # Set orig_in_str variable to store orig in str value
                                orig_in_str = safe_format_time(p_in) if p_in else "—"
                                # Set orig_out_str variable to store orig out str value
                                orig_out_str = safe_format_time(p_out) if p_out else "—"
                                # Set hc variable to store hc value
                                hc = att_row.get("hours_completed")
                                # Check if target condition is false or object is missing
                                if hc is not None and float(hc) > 0:
                                    # Set hf variable to store hf value
                                    hf = float(hc)
                                    # Set orig_wh_str variable to store orig wh str value
                                    orig_wh_str = f"{int(hf)}h {int(round((hf % 1) * 60)):02d}m"
                                # Evaluate alternate branch condition
                                elif p_in and p_out:
                                    # Set calc_h variable to store calc h value
                                    calc_h = safe_calc_hours(p_in, p_out)
                                    # Set orig_wh_str variable to store orig wh str value
                                    orig_wh_str = f"{int(calc_h)}h {int(round((calc_h % 1) * 60)):02d}m"
                                # Execute fallback branch when conditions are not met
                                else:
                                    # Set orig_wh_str variable to store orig wh str value
                                    orig_wh_str = "—"
                                # Set orig_status variable to store orig status value
                                orig_status = att_row.get("status") or ("Present" if orig_in_str != "—" and orig_out_str != "—" else "Absent")
                    # Catch and handle specific exception if raised
                    except Exception:
                        # Placeholder statement performing no operation
                        pass

                # Set email_val variable to store email val value
                email_val = r.get("email") or "—"
                # Set mobile_val variable to store mobile val value
                mobile_val = r.get("mobile_no") or r.get("phone") or "—"

                # Execute statement to process data and maintain state
                all_regs.append({
                    # Execute statement to process data and maintain state
                    "id": actual_id,
                    # Execute statement to process data and maintain state
                    "rawId": actual_id,
                    # Execute statement to process data and maintain state
                    "emp_code": emp_c or "",
                    # Execute statement to process data and maintain state
                    "employeeId": emp_c or "",
                    # Execute statement to process data and maintain state
                    "name": emp_name,
                    # Execute statement to process data and maintain state
                    "employeeName": emp_name,
                    # Execute statement to process data and maintain state
                    "email": email_val,
                    # Execute statement to process data and maintain state
                    "contact_number": mobile_val,
                    # Execute statement to process data and maintain state
                    "contactNumber": mobile_val,
                    # Execute statement to process data and maintain state
                    "phone": mobile_val,
                    # Execute statement to process data and maintain state
                    "department": r.get("department") or "Operations",
                    # Execute statement to process data and maintain state
                    "designation": r.get("designation") or "Employee",
                    # Execute statement to process data and maintain state
                    "location": r.get("branch_location") or "Mumbai, IN",
                    # Execute statement to process data and maintain state
                    "date": str(tar_d or ""),
                    # Execute statement to process data and maintain state
                    "attendanceDate": tar_str,
                    # Execute statement to process data and maintain state
                    "targetDate": str(tar_d or ""),
                    # Execute statement to process data and maintain state
                    "target_date": str(tar_d or ""),
                    # Execute statement to process data and maintain state
                    "appliedDate": req_str,
                    # Execute statement to process data and maintain state
                    "requestDate": req_str,
                    # Execute statement to process data and maintain state
                    "submittedOn": req_str,
                    # Execute statement to process data and maintain state
                    "submitted_on": req_str,
                    # Execute statement to process data and maintain state
                    "submitted_at": str(req_d or ""),
                    # Execute statement to process data and maintain state
                    "checkIn": in_t,
                    # Execute statement to process data and maintain state
                    "checkOut": out_t,
                    # Execute statement to process data and maintain state
                    "inTime": in_t,
                    # Execute statement to process data and maintain state
                    "outTime": out_t,
                    # Execute statement to process data and maintain state
                    "requested_check_in": in_t,
                    # Execute statement to process data and maintain state
                    "requested_check_out": out_t,
                    # Execute statement to process data and maintain state
                    "requestedCheckIn": in_t,
                    # Execute statement to process data and maintain state
                    "requestedCheckOut": out_t,
                    # Execute statement to process data and maintain state
                    "working_hours": req_wh_str,
                    # Execute statement to process data and maintain state
                    "workingHours": req_wh_str,
                    # Execute statement to process data and maintain state
                    "issued_for_in_time": str(in_val) if in_val else None,
                    # Execute statement to process data and maintain state
                    "issued_for_out_time": str(out_val) if out_val else None,
                    # Specify parameter value for "requestedTimings": f"In: {in_t} Out: {out_t}" if in_t !
                    "requestedTimings": f"In: {in_t} Out: {out_t}" if in_t != "—" or out_t != "—" else "—",
                    # Execute statement to process data and maintain state
                    "original_check_in": orig_in_str,
                    # Execute statement to process data and maintain state
                    "original_check_out": orig_out_str,
                    # Execute statement to process data and maintain state
                    "originalCheckIn": orig_in_str,
                    # Execute statement to process data and maintain state
                    "originalCheckOut": orig_out_str,
                    # Execute statement to process data and maintain state
                    "original_working_hours": orig_wh_str,
                    # Execute statement to process data and maintain state
                    "originalWorkingHours": orig_wh_str,
                    # Execute statement to process data and maintain state
                    "original_status": orig_status,
                    # Execute statement to process data and maintain state
                    "issue": r.get("comment") or "Attendance correction",
                    # Execute statement to process data and maintain state
                    "reason": r.get("comment") or "",
                    # Execute statement to process data and maintain state
                    "comment": r.get("comment") or "",
                    # Execute statement to process data and maintain state
                    "status": overall_st,
                    # Execute statement to process data and maintain state
                    "statusDisplay": st_disp,
                    # Execute statement to process data and maintain state
                    "overall_status": overall_st,
                    # Execute statement to process data and maintain state
                    "manager_status": mgr_st,
                    # Execute statement to process data and maintain state
                    "admin_status": adm_st,
                    # Execute statement to process data and maintain state
                    "approval_level": r.get("approval_level") or 1,
                    # Execute statement to process data and maintain state
                    "manager_action": r.get("manager_action") or mgr_st,
                    # Execute statement to process data and maintain state
                    "manager_reviewed_by": r.get("manager_reviewed_by"),
                    # Execute statement to process data and maintain state
                    "manager_reviewed_at": str(r.get("manager_reviewed_at") or ""),
                    # Execute statement to process data and maintain state
                    "manager_comment": r.get("manager_comment") or "",
                    # Execute statement to process data and maintain state
                    "manager_rejection_reason": r.get("manager_rejection_reason") or "",
                    # Execute statement to process data and maintain state
                    "admin_action": r.get("admin_action") or adm_st,
                    # Execute statement to process data and maintain state
                    "admin_reviewed_by": r.get("admin_reviewed_by"),
                    # Execute statement to process data and maintain state
                    "admin_reviewed_at": str(r.get("admin_reviewed_at") or ""),
                    # Execute statement to process data and maintain state
                    "admin_comment": r.get("admin_comment") or "",
                    # Execute statement to process data and maintain state
                    "admin_rejection_reason": r.get("admin_rejection_reason") or "",
                    # Execute statement to process data and maintain state
                    "manager_id": r.get("manager_id") or "MGR001",
                    # Execute statement to process data and maintain state
                    "manager_name": r.get("manager_name") or "Manager",
                    # Execute statement to process data and maintain state
                    "approver": r.get("admin_reviewed_by") or r.get("manager_name") or "Reporting Manager",
                    # Execute statement to process data and maintain state
                    "type": "Pending" if "PENDING" in overall_st else "Completed"
                # Execute statement to process data and maintain state
                })
        # Catch and handle specific exception if raised
        except Exception:
            # Skip to next iteration of active loop
            continue


    # Invoke all_regs.sort to perform operational action
    all_regs.sort(key=lambda x: str(x.get("id") or ""), reverse=True)
    # Return computed result or response payload to caller
    return all_regs


# Define get_manager_regularizations function to handle get manager regularizations
def get_manager_regularizations(db: Session, manager_code: str, team_codes: List[str] = None) -> List[dict]:
    """Fetches regularizations for a manager's direct team."""
    all_regs = get_all_regularizations_admin(db)
    # Set codes_set variable to store codes set value
    codes_set = {str(code).upper().strip() for code in (team_codes or []) if code}
    # Set mgr_clean variable to store mgr clean value
    mgr_clean = str(manager_code or "").upper().strip()
    # Evaluate condition to control execution branch
    if mgr_clean:
        # Invoke codes_set.add to perform operational action
        codes_set.add(mgr_clean)

    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for r in all_regs:
        # Set employee_code variable to store employee code value
        employee_code = str(r.get("emp_code") or "").upper().strip()
        # Set r_mgr_id variable to store r mgr id value
        r_mgr_id = str(r.get("manager_id") or "").upper().strip()
        # Set r_mgr_name variable to store r mgr name value
        r_mgr_name = str(r.get("manager_name") or "").upper().strip()
        # Evaluate condition to control execution branch
        if employee_code in codes_set or (mgr_clean and (r_mgr_id == mgr_clean or mgr_clean in r_mgr_name)):
            # Invoke results.append to perform operational action
            results.append(r)
    # Return computed result or response payload to caller
    return results


# Define get_my_regularizations function to handle get my regularizations
def get_my_regularizations(db: Session, emp_code: str) -> List[dict]:
    """Fetches regularizations for a specific employee."""
    all_regs = get_all_regularizations_admin(db)
    # Set emp_upper variable to store emp upper value
    emp_upper = emp_code.upper().strip()
    # Return computed result or response payload to caller
    return [r for r in all_regs if (r.get("emp_code") or "").upper().strip() == emp_upper]
