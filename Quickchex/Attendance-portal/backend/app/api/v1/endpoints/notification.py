from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user

# Import the Ticket model
from app.models.ticket_model import Ticket 
# (LeaveRequest is not imported here because we use raw SQL for dynamic tables)

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])

def get_monthly_reg_table_name(date_obj: datetime.date):
    """Generates the dynamic table name based on the current year and month."""
    return f"regularization_{date_obj.year}_{date_obj.month:02d}"

@router.get("/me")
def get_my_notifications(current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    """
    Dynamically generates notifications by querying the dynamic regularization 
    and leave tables, and the static tickets table.
    """
    now = datetime.date.today()
    notifications = []
    
    # Calculate previous month to catch cross-month approvals
    first_day = now.replace(day=1)
    prev_month_date = first_day - datetime.timedelta(days=1)

    # ==========================================
    # 1. FETCH REGULARIZATION NOTIFICATIONS
    # ==========================================
    try:
        reg_tables_to_check = [
            get_monthly_reg_table_name(now),
            get_monthly_reg_table_name(prev_month_date)
        ]

        for table_name in reg_tables_to_check:
            try:
                reg_query = text(f"""
                    SELECT id, target_date, status, request_date, is_notif_read 
                    FROM {table_name} 
                    WHERE emp_code = :emp_code 
                    AND status IN ('Approved', 'Rejected')
                """)

                reg_results = db.execute(reg_query, {"emp_code": current_user.emp_code}).mappings().all()
                for row in reg_results:
                    try:
                        notif_type = "success" if row["status"].lower() == "approved" else "error"
                        notifications.append({
                            "id": f"reg_{row['id']}", 
                            "title": f"Regularization {row['status']}",
                            "message": f"Your regularization request for {row['target_date']} was {row['status'].lower()}.",
                            "type": notif_type,
                            "is_read": row["is_notif_read"],
                            # Hardcoded to 'now' so fresh approvals jump to the top of the feed
                            "created_at": now.isoformat() 
                        })
                    except Exception as inner_e:
                        print(f"Skipped a reg notif due to error: {inner_e}")
                        
            except Exception as e:
                print(f"Notice: Could not fetch regularization notifications for {table_name}. Error: {e}")
                
    except Exception as e:
        print(f"Notice: Error in regularization notification block: {e}")

    # ==========================================
    # 2. FETCH TICKET NOTIFICATIONS
    # ==========================================
    try:
        tickets = db.query(Ticket).filter(Ticket.created_by == current_user.emp_code).all()

        for t in tickets:
            try:
                status_lower = t.status.lower()
                
                if status_lower in ["resolved", "closed", "completed"]:
                    notif_type = "success"
                    notif_title = f"Ticket {t.status}"
                    notif_msg = f"Your ticket '{t.title}' has been marked as {t.status}."
                elif status_lower in ["rejected", "cancelled"]:
                    notif_type = "error"
                    notif_title = f"Ticket {t.status}"
                    notif_msg = f"Your ticket '{t.title}' has been marked as {t.status}."
                elif status_lower == "open":
                    notif_type = "info"
                    notif_title = "Ticket Created"
                    notif_msg = f"Your ticket '{t.title}' was successfully submitted."
                else:
                    notif_type = "info" 
                    notif_title = f"Ticket {t.status}"
                    notif_msg = f"Your ticket '{t.title}' is currently {t.status}."

                time_to_use = getattr(t, 'updated_at', getattr(t, 'created_at', None))
                created_time = time_to_use.isoformat() if time_to_use else now.isoformat()

                notifications.append({
                    "id": f"ticket_{t.id}", 
                    "title": notif_title,
                    "message": notif_msg,
                    "type": notif_type,
                    "is_read": getattr(t, 'is_notif_read', False), 
                    "created_at": created_time
                })
            except Exception as inner_e:
                print(f"Skipped a ticket notif due to error: {inner_e}")
                
    except Exception as e:
        print(f"Notice: Could not fetch ticket notifications. Error: {e}")

    # ==========================================
    # 3. FETCH LEAVE NOTIFICATIONS 
    # ==========================================
    try:
        leave_tables_to_check = [
            f"leave_{now.year}_{now.month:02d}",
            f"leave_{prev_month_date.year}_{prev_month_date.month:02d}"
        ]

        for table_name in leave_tables_to_check:
            try:
                # Strictly selects only columns that exist in the DB
                leave_query = text(f"""
                    SELECT id, status, is_notif_read, created_at 
                    FROM {table_name} 
                    WHERE emp_code = :emp_code
                """)
                leave_results = db.execute(leave_query, {"emp_code": current_user.emp_code}).mappings().all()
                
                for l in leave_results:
                    try:
                        status_lower = l["status"].lower()
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
                            notif_type, notif_title = "info", f"Leave {l['status']}"
                            notif_msg = f"Your leave request is currently {l['status']}."

                        notifications.append({
                            "id": f"leave_{l['id']}", 
                            "title": notif_title,
                            "message": notif_msg,
                            "type": notif_type,
                            "is_read": l.get('is_notif_read', False),
                            # Bumps to the top of the feed like regularization
                            "created_at": now.isoformat() 
                        })
                    except Exception as inner_e:
                        print(f"Skipped a leave notif due to error: {inner_e}")
                        
            except Exception as e:
                print(f"Notice: Could not fetch leave notifications for {table_name}. Error: {e}")
                
    except Exception as e:
        print(f"Notice: Error in leave notification block: {e}")

    # Sort all notifications together by date descending
    notifications.sort(key=lambda x: x["created_at"], reverse=True)
    return notifications


@router.put("/{notif_id}/read")
def mark_notification_read(notif_id: str, db: Session=Depends(get_db)):
    """Marks a single notification as read based on its prefixed ID."""
    now = datetime.date.today()
    first_day = now.replace(day=1)
    prev_month_date = first_day - datetime.timedelta(days=1)
    
    try:
        notif_type, actual_id = notif_id.split("_")
        actual_id = int(actual_id)
        
        # Mark Regularization Read
        if notif_type == "reg":
            tables = [get_monthly_reg_table_name(now), get_monthly_reg_table_name(prev_month_date)]
            for table_name in tables:
                try:
                    res = db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE id = :id"), {"id": actual_id})
                    if res.rowcount > 0: break
                except Exception: pass
            db.commit()
            
        # Mark Ticket Read
        elif notif_type == "ticket":
            ticket = db.query(Ticket).filter(Ticket.id == actual_id).first()
            if ticket:
                ticket.is_notif_read = True
                db.commit()

        # Mark Leave Read
        elif notif_type == "leave":
            tables = [f"leave_{now.year}_{now.month:02d}", f"leave_{prev_month_date.year}_{prev_month_date.month:02d}"]
            for table_name in tables:
                try:
                    res = db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE id = :id"), {"id": actual_id})
                    if res.rowcount > 0: break
                except Exception: pass
            db.commit()
                
        return {"message": "Notification marked as read"}
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/read-all")
def mark_all_notifications_read(current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    """Marks all unread notifications as read for the current user."""
    now = datetime.date.today()
    first_day = now.replace(day=1)
    prev_month_date = first_day - datetime.timedelta(days=1)
    
    try:
        # 1. Update Regularization Table
        reg_tables = [get_monthly_reg_table_name(now), get_monthly_reg_table_name(prev_month_date)]
        for table_name in reg_tables:
            try:
                db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE emp_code = :emp_code AND is_notif_read = FALSE"), {"emp_code": current_user.emp_code})
            except Exception: pass
        
        # 2. Update Tickets Table
        db.query(Ticket).filter(
            Ticket.created_by == current_user.emp_code,
            Ticket.is_notif_read == False
        ).update({"is_notif_read": True})

        # 3. Update Leaves Table
        leave_tables = [f"leave_{now.year}_{now.month:02d}", f"leave_{prev_month_date.year}_{prev_month_date.month:02d}"]
        for table_name in leave_tables:
            try:
                db.execute(text(f"UPDATE {table_name} SET is_notif_read = TRUE WHERE emp_code = :emp_code AND is_notif_read = FALSE"), {"emp_code": current_user.emp_code})
            except Exception: pass
        
        db.commit()
        return {"message": "All notifications marked as read"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug-my-leaves")
def debug_my_leaves(current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    """X-Ray to check if this user ACTUALLY has leaves in the database."""
    now = datetime.date.today()
    table_name = f"leave_{now.year}_{now.month:02d}" 
    
    try:
        query = text(f"SELECT * FROM {table_name} WHERE emp_code = :emp_code")
        result = db.execute(query, {"emp_code": current_user.emp_code}).mappings().all()
        return {
            "emp_code_checked": current_user.emp_code,
            "total_leaves_found": len(result),
            "leaves": result
        }
    except Exception as e:
        return {"error": str(e)}