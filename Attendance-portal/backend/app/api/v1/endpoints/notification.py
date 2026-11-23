# ==============================================================================
# QUICKCHEX HRMS BACKEND - NOTIFICATION.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/notification.py
# Purpose: FastAPI route controller handling 'notification' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('', response_model=None) -> get_my_notifications()
#   • router.get('/', response_model=None) -> get_my_notifications()
#   • router.get('/me', response_model=None) -> get_my_notifications()
#   • router.get('/unread-count') -> get_unread_count()
#   • router.put('/{notif_id}/read') -> mark_notification_read()
#   • router.patch('/{notif_id}/read') -> mark_notification_read()
#   • router.put('/read-all') -> mark_all_notifications_read()
#   • router.patch('/read-all') -> mark_all_notifications_read()
#   • ... and 1 more endpoints
# ==============================================================================

# Import module logging for system functionality
import logging
# Import module datetime for system functionality
import datetime
# Import List, Optional, Set from typing for module operations
from typing import List, Optional, Set
# Import APIRouter, Depends, HTTPException, status from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, status
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text from sqlalchemy for module operations
from sqlalchemy import text

# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user
# Import Ticket from app.models.ticket_model for module operations
from app.models.ticket_model import Ticket 
# Import Notification from app.models.notification_model for module operations
from app.models.notification_model import Notification
# Import NotificationService from app.services.notification_service for module operations
from app.services.notification_service import NotificationService

# Set logger variable to store logger value
logger = logging.getLogger("uvicorn.error")

# Set router variable to store router value
router = APIRouter(prefix="/notifications", tags=["Notifications"])


# Define safe_table_exists function to handle safe table exists
def safe_table_exists(db: Session, table_name: str) -> bool:
    """
    Safely checks if a table exists in PostgreSQL without risking transaction abortion.
    Uses parameterized query against information_schema.tables.
    """
    if not table_name or not table_name.replace("_", "").isalnum():
        # Return computed result or response payload to caller
        return False
    # Begin guarded execution block to trap exceptions
    try:
        # Set res variable to store res value
        res = db.execute(
            # Invoke text to perform operational action
            text("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :tname"),
            # Execute statement to process data and maintain state
            {"tname": table_name}
        # Execute statement to process data and maintain state
        ).scalar()
        # Return computed result or response payload to caller
        return bool(res)
    # Catch and handle specific exception if raised
    except Exception as exc:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Error checking table existence for {table_name}: {exc}")
        # Return computed result or response payload to caller
        return False


# Define safe_table_columns function to handle safe table columns
def safe_table_columns(db: Session, table_name: str) -> Set[str]:
    """
    Safely retrieves the set of column names for a table in PostgreSQL without risking transaction abortion.
    """
    if not safe_table_exists(db, table_name):
        # Return computed result or response payload to caller
        return set()
    # Begin guarded execution block to trap exceptions
    try:
        # Set cols variable to store cols value
        cols = db.execute(
            # Invoke text to perform operational action
            text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :tname"),
            # Execute statement to process data and maintain state
            {"tname": table_name}
        # Execute statement to process data and maintain state
        ).scalars().all()
        # Return computed result or response payload to caller
        return set(cols)
    # Catch and handle specific exception if raised
    except Exception as exc:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Error inspecting columns for {table_name}: {exc}")
        # Return computed result or response payload to caller
        return set()


# Define get_monthly_reg_table_name function to handle get monthly reg table name
def get_monthly_reg_table_name(date_obj: datetime.date) -> str:
    """Generates the dynamic table name based on the current year and month."""
    return f"regularization_{date_obj.year}_{date_obj.month:02d}"


# Define HTTP GET route endpoint handler
@router.get("", response_model=None)
# Define HTTP GET route endpoint handler
@router.get("/", response_model=None)
# Define HTTP GET route endpoint handler
@router.get("/me", response_model=None)
# Define get_my_notifications function to handle get my notifications
def get_my_notifications(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Dynamically returns notifications for the authenticated user, aggregating:
    1. Dynamic regularization notifications
    2. Static tickets notifications
    3. Dynamic leave notifications
    4. Persistent policy update notifications (Notification table)
    Each block is strictly isolated with try/except/db.rollback() to ensure transaction health.
    """
    now = datetime.date.today()
    # Set notifications variable to store notifications value
    notifications = []
    
    # Set first_day variable to store first day value
    first_day = now.replace(day=1)
    # Set prev_month_date variable to store prev month date value
    prev_month_date = first_day - datetime.timedelta(days=1)

    # ==========================================
    # 1. FETCH REGULARIZATION NOTIFICATIONS
    # ==========================================
    try:
        # Set reg_candidate_tables variable to store reg candidate tables value
        reg_candidate_tables = [
            # Invoke get_monthly_reg_table_name to perform operational action
            get_monthly_reg_table_name(now),
            # Invoke get_monthly_reg_table_name to perform operational action
            get_monthly_reg_table_name(prev_month_date)
        # Execute statement to process data and maintain state
        ]
        # Check if target condition is false or object is missing
        if safe_table_exists(db, "regularizations") and "regularizations" not in reg_candidate_tables:
            # Invoke reg_candidate_tables.append to perform operational action
            reg_candidate_tables.append("regularizations")

        # Set seen_reg_ids variable to store seen reg ids value
        seen_reg_ids = set()
        # Iterate through items in sequence loop
        for table_name in reg_candidate_tables:
            # Check if target condition is false or object is missing
            if not safe_table_exists(db, table_name):
                # Skip to next iteration of active loop
                continue

            # Set cols variable to store cols value
            cols = safe_table_columns(db, table_name)
            # Set has_is_read variable to store has is read value
            has_is_read = "is_notif_read" in cols

            # Begin guarded execution block to trap exceptions
            try:
                # Evaluate condition to control execution branch
                if has_is_read:
                    # Set reg_query variable to store reg query value
                    reg_query = text(f"""
                        SELECT id, target_date, status, is_notif_read 
                        FROM {table_name} 
                        WHERE emp_code = :emp_code 
                        AND status IN ('Approved', 'Rejected')
                    """)
                # Execute fallback branch when conditions are not met
                else:
                    # Set reg_query variable to store reg query value
                    reg_query = text(f"""
                        SELECT id, target_date, status 
                        FROM {table_name} 
                        WHERE emp_code = :emp_code 
                        AND status IN ('Approved', 'Rejected')
                    """)

                # Set reg_results variable to store reg results value
                reg_results = db.execute(reg_query, {"emp_code": current_user.emp_code}).mappings().all()
                # Iterate through items in sequence loop
                for row in reg_results:
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Set row_id variable to store row id value
                        row_id = row['id']
                        # Evaluate condition to control execution branch
                        if row_id in seen_reg_ids:
                            # Skip to next iteration of active loop
                            continue
                        # Invoke seen_reg_ids.add to perform operational action
                        seen_reg_ids.add(row_id)
                        # Set status_val variable to store status val value
                        status_val = str(row["status"] or "Pending")
                        # Set notif_type variable to store notif type value
                        notif_type = "success" if status_val.lower() == "approved" else "error"
                        # Set is_read_val variable to store is read val value
                        is_read_val = bool(row["is_notif_read"]) if has_is_read else False

                        # Execute statement to process data and maintain state
                        notifications.append({
                            # Execute statement to process data and maintain state
                            "id": f"reg_{row['id']}", 
                            # Execute statement to process data and maintain state
                            "title": f"Regularization {status_val}",
                            # Execute statement to process data and maintain state
                            "message": f"Your regularization request for {row['target_date']} was {status_val.lower()}.",
                            # Execute statement to process data and maintain state
                            "type": notif_type,
                            # Execute statement to process data and maintain state
                            "notification_type": "REGULARIZATION",
                            # Execute statement to process data and maintain state
                            "is_read": is_read_val,
                            # Execute statement to process data and maintain state
                            "read": is_read_val,
                            # Execute statement to process data and maintain state
                            "unread": not is_read_val,
                            # Execute statement to process data and maintain state
                            "created_at": now.isoformat() 
                        # Execute statement to process data and maintain state
                        })
                    # Catch and handle specific exception if raised
                    except Exception as inner_e:
                        # Log error message with failure diagnostic details
                        logger.error(f"Error parsing regularization notification row: {inner_e}")
                        
            # Catch and handle specific exception if raised
            except Exception as e:
                # Roll back transaction to revert changes on failure
                db.rollback()
                # Log error message with failure diagnostic details
                logger.error(f"Failed querying regularization table {table_name}: {e}", exc_info=True)
                
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Error in regularization notification block: {e}", exc_info=True)

    # ==========================================
    # 2. FETCH TICKET NOTIFICATIONS
    # ==========================================
    try:
        # Initiate database query on specified model
        tickets = db.query(Ticket).filter(Ticket.created_by == current_user.emp_code).all()

        # Iterate through items in sequence loop
        for t in tickets:
            # Begin guarded execution block to trap exceptions
            try:
                # Set status_raw variable to store status raw value
                status_raw = str(t.status or "Open")
                # Set status_lower variable to store status lower value
                status_lower = status_raw.lower()
                
                # Evaluate condition to control execution branch
                if status_lower in ["resolved", "closed", "completed"]:
                    # Set notif_type variable to store notif type value
                    notif_type = "success"
                    # Set notif_title variable to store notif title value
                    notif_title = f"Ticket {status_raw}"
                    # Set notif_msg variable to store notif msg value
                    notif_msg = f"Your ticket '{t.title}' has been marked as {status_raw}."
                # Evaluate alternate branch condition
                elif status_lower in ["rejected", "cancelled"]:
                    # Set notif_type variable to store notif type value
                    notif_type = "error"
                    # Set notif_title variable to store notif title value
                    notif_title = f"Ticket {status_raw}"
                    # Set notif_msg variable to store notif msg value
                    notif_msg = f"Your ticket '{t.title}' has been marked as {status_raw}."
                # Evaluate alternate branch condition
                elif status_lower == "open":
                    # Set notif_type variable to store notif type value
                    notif_type = "info"
                    # Set notif_title variable to store notif title value
                    notif_title = "Ticket Created"
                    # Set notif_msg variable to store notif msg value
                    notif_msg = f"Your ticket '{t.title}' was successfully submitted."
                # Execute fallback branch when conditions are not met
                else:
                    # Set notif_type variable to store notif type value
                    notif_type = "info" 
                    # Set notif_title variable to store notif title value
                    notif_title = f"Ticket {status_raw}"
                    # Set notif_msg variable to store notif msg value
                    notif_msg = f"Your ticket '{t.title}' is currently {status_raw}."

                # Set time_to_use variable to store time to use value
                time_to_use = getattr(t, 'updated_at', getattr(t, 'created_at', None))
                # Set created_time variable to store created time value
                created_time = time_to_use.isoformat() if time_to_use else now.isoformat()
                # Set is_read_val variable to store is read val value
                is_read_val = bool(getattr(t, 'is_notif_read', False))

                # Execute statement to process data and maintain state
                notifications.append({
                    # Execute statement to process data and maintain state
                    "id": f"ticket_{t.id}", 
                    # Execute statement to process data and maintain state
                    "title": notif_title,
                    # Execute statement to process data and maintain state
                    "message": notif_msg,
                    # Execute statement to process data and maintain state
                    "type": notif_type,
                    # Execute statement to process data and maintain state
                    "notification_type": "TICKET",
                    # Execute statement to process data and maintain state
                    "is_read": is_read_val, 
                    # Execute statement to process data and maintain state
                    "read": is_read_val,
                    # Execute statement to process data and maintain state
                    "unread": not is_read_val,
                    # Execute statement to process data and maintain state
                    "created_at": created_time
                # Execute statement to process data and maintain state
                })
            # Catch and handle specific exception if raised
            except Exception as inner_e:
                # Log error message with failure diagnostic details
                logger.error(f"Error parsing ticket notification row: {inner_e}")
                
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Error querying ticket notifications: {e}", exc_info=True)

    # ==========================================
    # 3. FETCH LEAVE NOTIFICATIONS 
    # ==========================================
    try:
        # Set leave_candidate_tables variable to store leave candidate tables value
        leave_candidate_tables = [
            # Execute statement to process data and maintain state
            f"leave_{now.year}_{now.month:02d}",
            # Execute statement to process data and maintain state
            f"leave_{prev_month_date.year}_{prev_month_date.month:02d}"
        # Execute statement to process data and maintain state
        ]
        # Check if target condition is false or object is missing
        if safe_table_exists(db, "leave_requests") and "leave_requests" not in leave_candidate_tables:
            # Invoke leave_candidate_tables.append to perform operational action
            leave_candidate_tables.append("leave_requests")

        # Set seen_leave_ids variable to store seen leave ids value
        seen_leave_ids = set()
        # Iterate through items in sequence loop
        for table_name in leave_candidate_tables:
            # Check if target condition is false or object is missing
            if not safe_table_exists(db, table_name):
                # Skip to next iteration of active loop
                continue

            # Set cols variable to store cols value
            cols = safe_table_columns(db, table_name)
            # Set has_is_read variable to store has is read value
            has_is_read = "is_notif_read" in cols

            # Begin guarded execution block to trap exceptions
            try:
                # Evaluate condition to control execution branch
                if has_is_read:
                    # Set leave_query variable to store leave query value
                    leave_query = text(f"""
                        SELECT id, status, is_notif_read, created_at 
                        FROM {table_name} 
                        WHERE emp_code = :emp_code
                    """)
                # Execute fallback branch when conditions are not met
                else:
                    # Set leave_query variable to store leave query value
                    leave_query = text(f"""
                        SELECT id, status, created_at 
                        FROM {table_name} 
                        WHERE emp_code = :emp_code
                    """)

                # Set leave_results variable to store leave results value
                leave_results = db.execute(leave_query, {"emp_code": current_user.emp_code}).mappings().all()
                
                # Iterate through items in sequence loop
                for l in leave_results:
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Set leave_id variable to store leave id value
                        leave_id = l['id']
                        # Evaluate condition to control execution branch
                        if leave_id in seen_leave_ids:
                            # Skip to next iteration of active loop
                            continue
                        # Invoke seen_leave_ids.add to perform operational action
                        seen_leave_ids.add(leave_id)
                        # Set status_raw variable to store status raw value
                        status_raw = str(l["status"] or "Pending")
                        # Set status_lower variable to store status lower value
                        status_lower = status_raw.lower()
                        # Evaluate condition to control execution branch
                        if status_lower == "approved":
                            # Execute statement to process data and maintain state
                            notif_type, notif_title = "success", "Leave Approved"
                            # Set notif_msg variable to store notif msg value
                            notif_msg = "Your leave request has been approved."
                        # Evaluate alternate branch condition
                        elif status_lower == "rejected":
                            # Execute statement to process data and maintain state
                            notif_type, notif_title = "error", "Leave Rejected"
                            # Set notif_msg variable to store notif msg value
                            notif_msg = "Your leave request has been rejected."
                        # Evaluate alternate branch condition
                        elif status_lower == "pending":
                            # Execute statement to process data and maintain state
                            notif_type, notif_title = "info", "Leave Applied"
                            # Set notif_msg variable to store notif msg value
                            notif_msg = "Your leave request is pending approval."
                        # Execute fallback branch when conditions are not met
                        else:
                            # Execute statement to process data and maintain state
                            notif_type, notif_title = "info", f"Leave {status_raw}"
                            # Set notif_msg variable to store notif msg value
                            notif_msg = f"Your leave request is currently {status_raw}."

                        # Set is_read_val variable to store is read val value
                        is_read_val = bool(l["is_notif_read"]) if has_is_read else False
                        # Set created_dt variable to store created dt value
                        created_dt = l.get("created_at")
                        # Set created_time_str variable to store created time str value
                        created_time_str = created_dt.isoformat() if created_dt else now.isoformat()

                        # Execute statement to process data and maintain state
                        notifications.append({
                            # Execute statement to process data and maintain state
                            "id": f"leave_{l['id']}", 
                            # Execute statement to process data and maintain state
                            "title": notif_title,
                            # Execute statement to process data and maintain state
                            "message": notif_msg,
                            # Execute statement to process data and maintain state
                            "type": notif_type,
                            # Execute statement to process data and maintain state
                            "notification_type": "LEAVE",
                            # Execute statement to process data and maintain state
                            "is_read": is_read_val,
                            # Execute statement to process data and maintain state
                            "read": is_read_val,
                            # Execute statement to process data and maintain state
                            "unread": not is_read_val,
                            # Execute statement to process data and maintain state
                            "created_at": created_time_str
                        # Execute statement to process data and maintain state
                        })
                    # Catch and handle specific exception if raised
                    except Exception as inner_e:
                        # Log error message with failure diagnostic details
                        logger.error(f"Error parsing leave notification row: {inner_e}")
                        
            # Catch and handle specific exception if raised
            except Exception as e:
                # Roll back transaction to revert changes on failure
                db.rollback()
                # Log error message with failure diagnostic details
                logger.error(f"Failed querying leave table {table_name}: {e}", exc_info=True)
                
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Error in leave notification block: {e}", exc_info=True)

    # ==========================================
    # 4. FETCH POLICY UPDATE NOTIFICATIONS
    # ==========================================
    try:
        # Set policy_notifs variable to store policy notifs value
        policy_notifs = NotificationService.get_policy_notifications_for_user(db, current_user.emp_code)
        # Invoke notifications.extend to perform operational action
        notifications.extend(policy_notifs)
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Error in policy notification block: {e}", exc_info=True)

    # Sort all notifications together by date descending
    notifications.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    # Return computed result or response payload to caller
    return notifications


# Define HTTP GET route endpoint handler
@router.get("/unread-count")
# Define get_unread_count function to handle get unread count
def get_unread_count(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns dynamic total unread count for current user."""
    notifs = get_my_notifications(current_user=current_user, db=db)
    # Set unread_count variable to store unread count value
    unread_count = sum(1 for n in notifs if not n.get("is_read"))
    # Return computed result or response payload to caller
    return {"unread_count": unread_count}


# Define HTTP PUT route endpoint handler
@router.put("/{notif_id}/read")
# Define HTTP PATCH route endpoint handler
@router.patch("/{notif_id}/read")
# Define mark_notification_read function to handle mark notification read
def mark_notification_read(notif_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Marks a single notification as read based on its prefixed ID."""
    now = datetime.date.today()
    # Set first_day variable to store first day value
    first_day = now.replace(day=1)
    # Set prev_month_date variable to store prev month date value
    prev_month_date = first_day - datetime.timedelta(days=1)
    
    # Begin guarded execution block to trap exceptions
    try:
        # Evaluate condition to control execution branch
        if "_" in notif_id:
            # Execute statement to process data and maintain state
            notif_type, actual_id_str = notif_id.split("_", 1)
            # Set actual_id variable to store actual id value
            actual_id = int(actual_id_str)
        # Execute fallback branch when conditions are not met
        else:
            # Set notif_type variable to store notif type value
            notif_type = "policy"
            # Set actual_id variable to store actual id value
            actual_id = int(notif_id)
        
        # Mark Regularization Read
        if notif_type == "reg":
            # Set tables variable to store tables value
            tables = [get_monthly_reg_table_name(now), get_monthly_reg_table_name(prev_month_date)]
            # Check if target condition is false or object is missing
            if safe_table_exists(db, "regularizations") and "regularizations" not in tables:
                # Invoke tables.append to perform operational action
                tables.append("regularizations")
            # Iterate through items in sequence loop
            for table_name in tables:
                # Check if target condition is false or object is missing
                if not safe_table_exists(db, table_name):
                    # Skip to next iteration of active loop
                    continue
                # Set cols variable to store cols value
                cols = safe_table_columns(db, table_name)
                # Evaluate condition to control execution branch
                if "is_notif_read" in cols:
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Set res variable to store res value
                        res = db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE id = :id"), {"id": actual_id})
                        # Commit transaction to persist changes in database
                        db.commit()
                        # Evaluate condition to control execution branch
                        if res.rowcount > 0:
                            # Break out of current loop early
                            break
                    # Catch and handle specific exception if raised
                    except Exception as e:
                        # Roll back transaction to revert changes on failure
                        db.rollback()
                        # Log error message with failure diagnostic details
                        logger.error(f"Error marking reg notification read in {table_name}: {e}")
            
        # Mark Ticket Read
        elif notif_type == "ticket":
            # Evaluate condition to control execution branch
            if hasattr(Ticket, "is_notif_read"):
                # Begin guarded execution block to trap exceptions
                try:
                    # Initiate database query on specified model
                    ticket = db.query(Ticket).filter(Ticket.id == actual_id).first()
                    # Evaluate condition to control execution branch
                    if ticket:
                        # Execute statement to process data and maintain state
                        ticket.is_notif_read = True
                        # Commit transaction to persist changes in database
                        db.commit()
                # Catch and handle specific exception if raised
                except Exception as e:
                    # Roll back transaction to revert changes on failure
                    db.rollback()
                    # Log error message with failure diagnostic details
                    logger.error(f"Error marking ticket read: {e}")

        # Mark Leave Read
        elif notif_type == "leave":
            # Set tables variable to store tables value
            tables = [f"leave_{now.year}_{now.month:02d}", f"leave_{prev_month_date.year}_{prev_month_date.month:02d}"]
            # Check if target condition is false or object is missing
            if safe_table_exists(db, "leave_requests") and "leave_requests" not in tables:
                # Invoke tables.append to perform operational action
                tables.append("leave_requests")
            # Iterate through items in sequence loop
            for table_name in tables:
                # Check if target condition is false or object is missing
                if not safe_table_exists(db, table_name):
                    # Skip to next iteration of active loop
                    continue
                # Set cols variable to store cols value
                cols = safe_table_columns(db, table_name)
                # Evaluate condition to control execution branch
                if "is_notif_read" in cols:
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Set res variable to store res value
                        res = db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE id = :id"), {"id": actual_id})
                        # Commit transaction to persist changes in database
                        db.commit()
                        # Evaluate condition to control execution branch
                        if res.rowcount > 0:
                            # Break out of current loop early
                            break
                    # Catch and handle specific exception if raised
                    except Exception as e:
                        # Roll back transaction to revert changes on failure
                        db.rollback()
                        # Log error message with failure diagnostic details
                        logger.error(f"Error marking leave read in {table_name}: {e}")

        # Mark Policy Notification Read
        elif notif_type in ("policy", "notif"):
            # Begin guarded execution block to trap exceptions
            try:
                # Initiate database query on specified model
                notif = db.query(Notification).filter(Notification.id == actual_id).first()
                # Check if target condition is false or object is missing
                if not notif:
                    # Raise HTTP exception with status code and error details
                    raise HTTPException(status_code=404, detail="Notification not found")
                
                # Strict authorization check
                user_role = (getattr(current_user, "role", "") or "").lower()
                # Evaluate condition to control execution branch
                if notif.recipient_emp_code != current_user.emp_code and user_role != "admin":
                    # Raise HTTP exception with status code and error details
                    raise HTTPException(status_code=403, detail="Access denied: Cannot modify another employee's notification.")
                
                # Execute statement to process data and maintain state
                notif.is_read = True
                # Execute statement to process data and maintain state
                notif.read_at = datetime.datetime.utcnow()
                # Commit transaction to persist changes in database
                db.commit()
            # Catch and handle specific exception if raised
            except HTTPException:
                # Roll back transaction to revert changes on failure
                db.rollback()
                # Raise exception to abort current operation with error
                raise
            # Catch and handle specific exception if raised
            except Exception as e:
                # Roll back transaction to revert changes on failure
                db.rollback()
                # Log error message with failure diagnostic details
                logger.error(f"Error marking policy notification read: {e}")
                # Raise HTTP exception with status code and error details
                raise HTTPException(status_code=500, detail="Unable to update notification read status.")
                
        # Return computed result or response payload to caller
        return {"message": "Notification marked as read"}
            
    # Catch and handle specific exception if raised
    except HTTPException:
        # Raise exception to abort current operation with error
        raise
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Unexpected error in mark_notification_read: {e}", exc_info=True)
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail="An error occurred while marking notification as read.")


# Define HTTP PUT route endpoint handler
@router.put("/read-all")
# Define HTTP PATCH route endpoint handler
@router.patch("/read-all")
# Define mark_all_notifications_read function to handle mark all notifications read
def mark_all_notifications_read(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Marks all unread notifications as read for the current user."""
    now = datetime.date.today()
    # Set first_day variable to store first day value
    first_day = now.replace(day=1)
    # Set prev_month_date variable to store prev month date value
    prev_month_date = first_day - datetime.timedelta(days=1)
    
    # Begin guarded execution block to trap exceptions
    try:
        # 1. Update Regularization Table
        reg_tables = [get_monthly_reg_table_name(now), get_monthly_reg_table_name(prev_month_date)]
        # Check if target condition is false or object is missing
        if safe_table_exists(db, "regularizations") and "regularizations" not in reg_tables:
            # Invoke reg_tables.append to perform operational action
            reg_tables.append("regularizations")
        # Iterate through items in sequence loop
        for table_name in reg_tables:
            # Evaluate condition to control execution branch
            if safe_table_exists(db, table_name):
                # Set cols variable to store cols value
                cols = safe_table_columns(db, table_name)
                # Evaluate condition to control execution branch
                if "is_notif_read" in cols:
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Invoke db.execute to perform operational action
                        db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE emp_code = :emp_code AND is_notif_read = FALSE"), {"emp_code": current_user.emp_code})
                        # Commit transaction to persist changes in database
                        db.commit()
                    # Catch and handle specific exception if raised
                    except Exception as e:
                        # Roll back transaction to revert changes on failure
                        db.rollback()
                        # Log error message with failure diagnostic details
                        logger.error(f"Error updating reg read-all in {table_name}: {e}")
        
        # 2. Update Tickets Table
        if hasattr(Ticket, "is_notif_read"):
            # Begin guarded execution block to trap exceptions
            try:
                # Initiate database query on specified model
                db.query(Ticket).filter(
                    # Specify parameter value for Ticket.created_by
                    Ticket.created_by == current_user.emp_code,
                    # Execute statement to process data and maintain state
                    Ticket.is_notif_read == False
                # Execute statement to process data and maintain state
                ).update({"is_notif_read": True})
                # Commit transaction to persist changes in database
                db.commit()
            # Catch and handle specific exception if raised
            except Exception as e:
                # Roll back transaction to revert changes on failure
                db.rollback()
                # Log error message with failure diagnostic details
                logger.error(f"Error updating tickets read-all: {e}")

        # 3. Update Leaves Table
        leave_tables = [f"leave_{now.year}_{now.month:02d}", f"leave_{prev_month_date.year}_{prev_month_date.month:02d}"]
        # Check if target condition is false or object is missing
        if safe_table_exists(db, "leave_requests") and "leave_requests" not in leave_tables:
            # Invoke leave_tables.append to perform operational action
            leave_tables.append("leave_requests")
        # Iterate through items in sequence loop
        for table_name in leave_tables:
            # Evaluate condition to control execution branch
            if safe_table_exists(db, table_name):
                # Set cols variable to store cols value
                cols = safe_table_columns(db, table_name)
                # Evaluate condition to control execution branch
                if "is_notif_read" in cols:
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Invoke db.execute to perform operational action
                        db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE emp_code = :emp_code AND is_notif_read = FALSE"), {"emp_code": current_user.emp_code})
                        # Commit transaction to persist changes in database
                        db.commit()
                    # Catch and handle specific exception if raised
                    except Exception as e:
                        # Roll back transaction to revert changes on failure
                        db.rollback()
                        # Log error message with failure diagnostic details
                        logger.error(f"Error updating leave read-all in {table_name}: {e}")

        # 4. Update Policy Notifications
        try:
            # Initiate database query on specified model
            db.query(Notification).filter(
                # Specify parameter value for Notification.recipient_emp_code
                Notification.recipient_emp_code == current_user.emp_code,
                # Execute statement to process data and maintain state
                Notification.is_read == False
            # Execute statement to process data and maintain state
            ).update({"is_read": True, "read_at": datetime.datetime.utcnow()})
            # Commit transaction to persist changes in database
            db.commit()
        # Catch and handle specific exception if raised
        except Exception as e:
            # Roll back transaction to revert changes on failure
            db.rollback()
            # Log error message with failure diagnostic details
            logger.error(f"Error updating policy notifications read-all: {e}")
            # Raise exception to abort current operation with error
            raise
        
        # Return computed result or response payload to caller
        return {"message": "All notifications marked as read"}
        
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Unexpected error in mark_all_notifications_read: {e}", exc_info=True)
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail="An error occurred while marking all notifications as read.")


# Define HTTP GET route endpoint handler
@router.get("/debug-my-leaves")
# Define debug_my_leaves function to handle debug my leaves
def debug_my_leaves(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Safe debug check for leaves for current user."""
    now = datetime.date.today()
    # Set table_name variable to store table name value
    table_name = f"leave_{now.year}_{now.month:02d}" 
    
    # Check if target condition is false or object is missing
    if not safe_table_exists(db, table_name):
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "emp_code_checked": current_user.emp_code,
            # Execute statement to process data and maintain state
            "total_leaves_found": 0,
            # Execute statement to process data and maintain state
            "leaves": [],
            # Execute statement to process data and maintain state
            "table_exists": False
        # Execute statement to process data and maintain state
        }

    # Begin guarded execution block to trap exceptions
    try:
        # Set query variable to store query value
        query = text(f"SELECT * FROM {table_name} WHERE emp_code = :emp_code")
        # Set result variable to store result value
        result = db.execute(query, {"emp_code": current_user.emp_code}).mappings().all()
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "emp_code_checked": current_user.emp_code,
            # Execute statement to process data and maintain state
            "total_leaves_found": len(result),
            # Execute statement to process data and maintain state
            "leaves": [dict(r) for r in result],
            # Execute statement to process data and maintain state
            "table_exists": True
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Log error message with failure diagnostic details
        logger.error(f"Error in debug_my_leaves: {e}")
        # Return computed result or response payload to caller
        return {"error": "Unable to fetch leaves debug info."}