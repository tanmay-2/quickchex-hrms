from fastapi import APIRouter
from sqlalchemy.orm import Session
from sqlalchemy import text
import datetime
 
from app.db.session import SessionLocal
 
router = APIRouter(tags=["Scheduled Tasks"])
 
def get_monthly_table_name(date_obj: datetime.date):
    """Returns the dynamic monthly table name based on date."""
    return f"attendance_{date_obj.year}_{date_obj.month:02d}"
 
# 🔥 NEW HELPER: Checks if the date is a Sunday or 4th Saturday
def is_week_off(date_obj: datetime.date) -> bool:
    """Returns True if the date is a Sunday or the 4th Saturday."""
    # In Python's datetime, Monday is 0 and Sunday is 6
    day_of_week = date_obj.weekday()
   
    if day_of_week == 6:  # 6 = Sunday
        return True
       
    if day_of_week == 5:  # 5 = Saturday
        # The 4th occurrence of any day in a month always falls between the 22nd and 28th
        if 22 <= date_obj.day <= 28:
            return True
           
    return False
 
from app.services.attendance_service import get_ist_today

def run_daily_absent_check():
    """
    Called by background scheduler shortly after midnight.
    Accurately marks missing records in IST as 'On Leave', 'Holiday', 'Week Off', or 'Absent'.
    """
    db = SessionLocal()
    try:
        # Check for IST YESTERDAY to prevent UTC drift
        yesterday = get_ist_today() - datetime.timedelta(days=1)
        table_name = get_monthly_table_name(yesterday)

        # 1. Check if yesterday was an official Company Holiday
        is_holiday = False
        try:
            h_row = db.execute(
                text("SELECT status, holiday_name FROM organization_calendar WHERE date = :d"),
                {"d": yesterday}
            ).mappings().first()
            if h_row and str(h_row.get("status") or "").upper() == "HOLIDAY":
                is_holiday = True
        except Exception:
            pass

        if is_holiday:
            default_status = "Holiday"
        elif is_week_off(yesterday):
            default_status = "Week Off"
        else:
            default_status = "Absent"

        # 2. Check for officially approved leaves for yesterday
        approved_leaves = {}
        leave_table = f"leave_{yesterday.year}_{yesterday.month:02d}"
        try:
            l_rows = db.execute(
                text(f"""
                    SELECT emp_code, category, status, overall_status
                    FROM {leave_table}
                    WHERE start_date <= :d AND end_date >= :d
                      AND (UPPER(overall_status) = 'APPROVED' OR UPPER(status) = 'APPROVED')
                """),
                {"d": yesterday}
            ).mappings().all()
            for lr in l_rows:
                approved_leaves[lr["emp_code"]] = lr.get("category") or "On Leave"
        except Exception:
            pass

        try:
            l_rows2 = db.execute(
                text("""
                    SELECT emp_code, category, status, overall_status
                    FROM leave_requests
                    WHERE start_date <= :d AND end_date >= :d
                      AND (UPPER(overall_status) = 'APPROVED' OR UPPER(status) = 'APPROVED')
                """),
                {"d": yesterday}
            ).mappings().all()
            for lr in l_rows2:
                if lr["emp_code"] not in approved_leaves:
                    approved_leaves[lr["emp_code"]] = lr.get("category") or "On Leave"
        except Exception:
            pass

        # 3. Find employees with missing attendance for yesterday
        missing_emps = db.execute(
            text(f"""
                SELECT p.emp_code
                FROM profile_master p
                WHERE p.emp_code NOT IN (
                    SELECT emp_code FROM {table_name} WHERE date = :target_date
                )
            """),
            {"target_date": yesterday}
        ).fetchall()

        # 4. Insert accurate status preserving approved leaves
        for row in missing_emps:
            emp_code = row[0]
            emp_status = approved_leaves.get(emp_code, default_status)
            try:
                db.execute(
                    text(f"""
                        INSERT INTO {table_name} (emp_code, date, status, hours_completed)
                        VALUES (:code, :date, :status, 0)
                    """),
                    {"code": emp_code, "date": yesterday, "status": emp_status}
                )
            except Exception:
                pass

        db.commit()
        print(f"✅ Daily attendance check completed for {yesterday}: processed {len(missing_emps)} employees.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error during daily attendance check: {e}")
    finally:
        db.close()
 
# Expose as an API so you can test it manually via Swagger/Postman [cite: 130]
@router.post("/trigger-absent-check")
def manual_absent_check():
    """Manual trigger to execute the daily check for testing purposes[cite: 131]."""
    run_daily_absent_check()
    return {"message": "Absent/Week Off check executed successfully"}