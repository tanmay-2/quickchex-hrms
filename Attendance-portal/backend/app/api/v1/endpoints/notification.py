import logging
import datetime
from typing import List, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.ticket_model import Ticket 
from app.models.notification_model import Notification
from app.services.notification_service import NotificationService

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def safe_table_exists(db: Session, table_name: str) -> bool:
    """
    Safely checks if a table exists in PostgreSQL without risking transaction abortion.
    Uses parameterized query against information_schema.tables.
    """
    if not table_name or not table_name.replace("_", "").isalnum():
        return False
    try:
        res = db.execute(
            text("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :tname"),
            {"tname": table_name}
        ).scalar()
        return bool(res)
    except Exception as exc:
        db.rollback()
        logger.error(f"Error checking table existence for {table_name}: {exc}")
        return False


def safe_table_columns(db: Session, table_name: str) -> Set[str]:
    """
    Safely retrieves the set of column names for a table in PostgreSQL without risking transaction abortion.
    """
    if not safe_table_exists(db, table_name):
        return set()
    try:
        cols = db.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :tname"),
            {"tname": table_name}
        ).scalars().all()
        return set(cols)
    except Exception as exc:
        db.rollback()
        logger.error(f"Error inspecting columns for {table_name}: {exc}")
        return set()


def get_monthly_reg_table_name(date_obj: datetime.date) -> str:
    """Generates the dynamic table name based on the current year and month."""
    return f"regularization_{date_obj.year}_{date_obj.month:02d}"


@router.get("", response_model=None)
@router.get("/", response_model=None)
@router.get("/me", response_model=None)
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
    notifications = []
    
    first_day = now.replace(day=1)
    prev_month_date = first_day - datetime.timedelta(days=1)

    # ==========================================
    # 1. FETCH REGULARIZATION NOTIFICATIONS
    # ==========================================
    try:
        reg_candidate_tables = [
            get_monthly_reg_table_name(now),
            get_monthly_reg_table_name(prev_month_date)
        ]

        for table_name in reg_candidate_tables:
            if not safe_table_exists(db, table_name):
                continue

            cols = safe_table_columns(db, table_name)
            has_is_read = "is_notif_read" in cols

            try:
                if has_is_read:
                    reg_query = text(f"""
                        SELECT id, target_date, status, is_notif_read 
                        FROM {table_name} 
                        WHERE emp_code = :emp_code 
                        AND status IN ('Approved', 'Rejected')
                    """)
                else:
                    reg_query = text(f"""
                        SELECT id, target_date, status 
                        FROM {table_name} 
                        WHERE emp_code = :emp_code 
                        AND status IN ('Approved', 'Rejected')
                    """)

                reg_results = db.execute(reg_query, {"emp_code": current_user.emp_code}).mappings().all()
                for row in reg_results:
                    try:
                        status_val = str(row["status"] or "Pending")
                        notif_type = "success" if status_val.lower() == "approved" else "error"
                        is_read_val = bool(row["is_notif_read"]) if has_is_read else False

                        notifications.append({
                            "id": f"reg_{row['id']}", 
                            "title": f"Regularization {status_val}",
                            "message": f"Your regularization request for {row['target_date']} was {status_val.lower()}.",
                            "type": notif_type,
                            "notification_type": "REGULARIZATION",
                            "is_read": is_read_val,
                            "read": is_read_val,
                            "unread": not is_read_val,
                            "created_at": now.isoformat() 
                        })
                    except Exception as inner_e:
                        logger.error(f"Error parsing regularization notification row: {inner_e}")
                        
            except Exception as e:
                db.rollback()
                logger.error(f"Failed querying regularization table {table_name}: {e}", exc_info=True)
                
    except Exception as e:
        db.rollback()
        logger.error(f"Error in regularization notification block: {e}", exc_info=True)

    # ==========================================
    # 2. FETCH TICKET NOTIFICATIONS
    # ==========================================
    try:
        tickets = db.query(Ticket).filter(Ticket.created_by == current_user.emp_code).all()

        for t in tickets:
            try:
                status_raw = str(t.status or "Open")
                status_lower = status_raw.lower()
                
                if status_lower in ["resolved", "closed", "completed"]:
                    notif_type = "success"
                    notif_title = f"Ticket {status_raw}"
                    notif_msg = f"Your ticket '{t.title}' has been marked as {status_raw}."
                elif status_lower in ["rejected", "cancelled"]:
                    notif_type = "error"
                    notif_title = f"Ticket {status_raw}"
                    notif_msg = f"Your ticket '{t.title}' has been marked as {status_raw}."
                elif status_lower == "open":
                    notif_type = "info"
                    notif_title = "Ticket Created"
                    notif_msg = f"Your ticket '{t.title}' was successfully submitted."
                else:
                    notif_type = "info" 
                    notif_title = f"Ticket {status_raw}"
                    notif_msg = f"Your ticket '{t.title}' is currently {status_raw}."

                time_to_use = getattr(t, 'updated_at', getattr(t, 'created_at', None))
                created_time = time_to_use.isoformat() if time_to_use else now.isoformat()
                is_read_val = bool(getattr(t, 'is_notif_read', False))

                notifications.append({
                    "id": f"ticket_{t.id}", 
                    "title": notif_title,
                    "message": notif_msg,
                    "type": notif_type,
                    "notification_type": "TICKET",
                    "is_read": is_read_val, 
                    "read": is_read_val,
                    "unread": not is_read_val,
                    "created_at": created_time
                })
            except Exception as inner_e:
                logger.error(f"Error parsing ticket notification row: {inner_e}")
                
    except Exception as e:
        db.rollback()
        logger.error(f"Error querying ticket notifications: {e}", exc_info=True)

    # ==========================================
    # 3. FETCH LEAVE NOTIFICATIONS 
    # ==========================================
    try:
        leave_candidate_tables = [
            f"leave_{now.year}_{now.month:02d}",
            f"leave_{prev_month_date.year}_{prev_month_date.month:02d}"
        ]

        for table_name in leave_candidate_tables:
            if not safe_table_exists(db, table_name):
                continue

            cols = safe_table_columns(db, table_name)
            has_is_read = "is_notif_read" in cols

            try:
                if has_is_read:
                    leave_query = text(f"""
                        SELECT id, status, is_notif_read, created_at 
                        FROM {table_name} 
                        WHERE emp_code = :emp_code
                    """)
                else:
                    leave_query = text(f"""
                        SELECT id, status, created_at 
                        FROM {table_name} 
                        WHERE emp_code = :emp_code
                    """)

                leave_results = db.execute(leave_query, {"emp_code": current_user.emp_code}).mappings().all()
                
                for l in leave_results:
                    try:
                        status_raw = str(l["status"] or "Pending")
                        status_lower = status_raw.lower()
                        if status_lower == "approved":
                            notif_type, notif_title = "success", "Leave Approved"
                            notif_msg = "Your leave request has been approved."
                        elif status_lower == "rejected":
                            notif_type, notif_title = "error", "Leave Rejected"
                            notif_msg = "Your leave request has been rejected."
                        elif status_lower == "pending":
                            notif_type, notif_title = "info", "Leave Applied"
                            notif_msg = "Your leave request is pending approval."
                        else:
                            notif_type, notif_title = "info", f"Leave {status_raw}"
                            notif_msg = f"Your leave request is currently {status_raw}."

                        is_read_val = bool(l["is_notif_read"]) if has_is_read else False
                        created_dt = l.get("created_at")
                        created_time_str = created_dt.isoformat() if created_dt else now.isoformat()

                        notifications.append({
                            "id": f"leave_{l['id']}", 
                            "title": notif_title,
                            "message": notif_msg,
                            "type": notif_type,
                            "notification_type": "LEAVE",
                            "is_read": is_read_val,
                            "read": is_read_val,
                            "unread": not is_read_val,
                            "created_at": created_time_str
                        })
                    except Exception as inner_e:
                        logger.error(f"Error parsing leave notification row: {inner_e}")
                        
            except Exception as e:
                db.rollback()
                logger.error(f"Failed querying leave table {table_name}: {e}", exc_info=True)
                
    except Exception as e:
        db.rollback()
        logger.error(f"Error in leave notification block: {e}", exc_info=True)

    # ==========================================
    # 4. FETCH POLICY UPDATE NOTIFICATIONS
    # ==========================================
    try:
        policy_notifs = NotificationService.get_policy_notifications_for_user(db, current_user.emp_code)
        notifications.extend(policy_notifs)
    except Exception as e:
        db.rollback()
        logger.error(f"Error in policy notification block: {e}", exc_info=True)

    # Sort all notifications together by date descending
    notifications.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return notifications


@router.get("/unread-count")
def get_unread_count(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns dynamic total unread count for current user."""
    notifs = get_my_notifications(current_user=current_user, db=db)
    unread_count = sum(1 for n in notifs if not n.get("is_read"))
    return {"unread_count": unread_count}


@router.put("/{notif_id}/read")
@router.patch("/{notif_id}/read")
def mark_notification_read(notif_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Marks a single notification as read based on its prefixed ID."""
    now = datetime.date.today()
    first_day = now.replace(day=1)
    prev_month_date = first_day - datetime.timedelta(days=1)
    
    try:
        if "_" in notif_id:
            notif_type, actual_id_str = notif_id.split("_", 1)
            actual_id = int(actual_id_str)
        else:
            notif_type = "policy"
            actual_id = int(notif_id)
        
        # Mark Regularization Read
        if notif_type == "reg":
            tables = [get_monthly_reg_table_name(now), get_monthly_reg_table_name(prev_month_date)]
            for table_name in tables:
                if not safe_table_exists(db, table_name):
                    continue
                cols = safe_table_columns(db, table_name)
                if "is_notif_read" in cols:
                    try:
                        res = db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE id = :id"), {"id": actual_id})
                        db.commit()
                        if res.rowcount > 0:
                            break
                    except Exception as e:
                        db.rollback()
                        logger.error(f"Error marking reg notification read in {table_name}: {e}")
            
        # Mark Ticket Read
        elif notif_type == "ticket":
            if hasattr(Ticket, "is_notif_read"):
                try:
                    ticket = db.query(Ticket).filter(Ticket.id == actual_id).first()
                    if ticket:
                        ticket.is_notif_read = True
                        db.commit()
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error marking ticket read: {e}")

        # Mark Leave Read
        elif notif_type == "leave":
            tables = [f"leave_{now.year}_{now.month:02d}", f"leave_{prev_month_date.year}_{prev_month_date.month:02d}"]
            for table_name in tables:
                if not safe_table_exists(db, table_name):
                    continue
                cols = safe_table_columns(db, table_name)
                if "is_notif_read" in cols:
                    try:
                        res = db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE id = :id"), {"id": actual_id})
                        db.commit()
                        if res.rowcount > 0:
                            break
                    except Exception as e:
                        db.rollback()
                        logger.error(f"Error marking leave read in {table_name}: {e}")

        # Mark Policy Notification Read
        elif notif_type in ("policy", "notif"):
            try:
                notif = db.query(Notification).filter(Notification.id == actual_id).first()
                if not notif:
                    raise HTTPException(status_code=404, detail="Notification not found")
                
                # Strict authorization check
                user_role = (getattr(current_user, "role", "") or "").lower()
                if notif.recipient_emp_code != current_user.emp_code and user_role != "admin":
                    raise HTTPException(status_code=403, detail="Access denied: Cannot modify another employee's notification.")
                
                notif.is_read = True
                notif.read_at = datetime.datetime.utcnow()
                db.commit()
            except HTTPException:
                db.rollback()
                raise
            except Exception as e:
                db.rollback()
                logger.error(f"Error marking policy notification read: {e}")
                raise HTTPException(status_code=500, detail="Unable to update notification read status.")
                
        return {"message": "Notification marked as read"}
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error in mark_notification_read: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while marking notification as read.")


@router.put("/read-all")
@router.patch("/read-all")
def mark_all_notifications_read(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Marks all unread notifications as read for the current user."""
    now = datetime.date.today()
    first_day = now.replace(day=1)
    prev_month_date = first_day - datetime.timedelta(days=1)
    
    try:
        # 1. Update Regularization Table
        reg_tables = [get_monthly_reg_table_name(now), get_monthly_reg_table_name(prev_month_date)]
        for table_name in reg_tables:
            if safe_table_exists(db, table_name):
                cols = safe_table_columns(db, table_name)
                if "is_notif_read" in cols:
                    try:
                        db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE emp_code = :emp_code AND is_notif_read = FALSE"), {"emp_code": current_user.emp_code})
                        db.commit()
                    except Exception as e:
                        db.rollback()
                        logger.error(f"Error updating reg read-all in {table_name}: {e}")
        
        # 2. Update Tickets Table
        if hasattr(Ticket, "is_notif_read"):
            try:
                db.query(Ticket).filter(
                    Ticket.created_by == current_user.emp_code,
                    Ticket.is_notif_read == False
                ).update({"is_notif_read": True})
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error updating tickets read-all: {e}")

        # 3. Update Leaves Table
        leave_tables = [f"leave_{now.year}_{now.month:02d}", f"leave_{prev_month_date.year}_{prev_month_date.month:02d}"]
        for table_name in leave_tables:
            if safe_table_exists(db, table_name):
                cols = safe_table_columns(db, table_name)
                if "is_notif_read" in cols:
                    try:
                        db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE emp_code = :emp_code AND is_notif_read = FALSE"), {"emp_code": current_user.emp_code})
                        db.commit()
                    except Exception as e:
                        db.rollback()
                        logger.error(f"Error updating leave read-all in {table_name}: {e}")

        # 4. Update Policy Notifications
        try:
            db.query(Notification).filter(
                Notification.recipient_emp_code == current_user.emp_code,
                Notification.is_read == False
            ).update({"is_read": True, "read_at": datetime.datetime.utcnow()})
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating policy notifications read-all: {e}")
            raise
        
        return {"message": "All notifications marked as read"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error in mark_all_notifications_read: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while marking all notifications as read.")


@router.get("/debug-my-leaves")
def debug_my_leaves(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Safe debug check for leaves for current user."""
    now = datetime.date.today()
    table_name = f"leave_{now.year}_{now.month:02d}" 
    
    if not safe_table_exists(db, table_name):
        return {
            "emp_code_checked": current_user.emp_code,
            "total_leaves_found": 0,
            "leaves": [],
            "table_exists": False
        }

    try:
        query = text(f"SELECT * FROM {table_name} WHERE emp_code = :emp_code")
        result = db.execute(query, {"emp_code": current_user.emp_code}).mappings().all()
        return {
            "emp_code_checked": current_user.emp_code,
            "total_leaves_found": len(result),
            "leaves": [dict(r) for r in result],
            "table_exists": True
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error in debug_my_leaves: {e}")
        return {"error": "Unable to fetch leaves debug info."}