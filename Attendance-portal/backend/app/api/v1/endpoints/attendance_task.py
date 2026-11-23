# ==============================================================================
# QUICKCHEX HRMS BACKEND - ATTENDANCE_TASK.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/attendance_task.py
# Purpose: FastAPI route controller handling 'attendance_task' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.post('/trigger-absent-check') -> manual_absent_check()
# ==============================================================================

# Import APIRouter from fastapi for module operations
from fastapi import APIRouter
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text from sqlalchemy for module operations
from sqlalchemy import text
# Import module datetime for system functionality
import datetime
 
# Import SessionLocal from app.db.session for module operations
from app.db.session import SessionLocal
 
# Set router variable to store router value
router = APIRouter(tags=["Scheduled Tasks"])
 
# Define get_monthly_table_name function to handle get monthly table name
def get_monthly_table_name(date_obj: datetime.date):
    """Returns the dynamic monthly table name based on date."""
    return f"attendance_{date_obj.year}_{date_obj.month:02d}"
 
# 🔥 NEW HELPER: Checks if the date is a Sunday or 4th Saturday
def is_week_off(date_obj: datetime.date) -> bool:
    """Returns True if the date is a Sunday or the 4th Saturday."""
    # In Python's datetime, Monday is 0 and Sunday is 6
    day_of_week = date_obj.weekday()
   
    if day_of_week == 6:  # 6 = Sunday
        # Return computed result or response payload to caller
        return True
       
    if day_of_week == 5:  # 5 = Saturday
        # The 4th occurrence of any day in a month always falls between the 22nd and 28th
        if 22 <= date_obj.day <= 28:
            # Return computed result or response payload to caller
            return True
           
    # Return computed result or response payload to caller
    return False
 
# Import get_ist_today from app.services.attendance_service for module operations
from app.services.attendance_service import get_ist_today

# Define run_daily_absent_check function to handle run daily absent check
def run_daily_absent_check():
    """
    Called by background scheduler shortly after midnight.
    Accurately marks missing records in IST as 'On Leave', 'Holiday', 'Week Off', or 'Absent'.
    """
    db = SessionLocal()
    # Begin guarded execution block to trap exceptions
    try:
        # Check for IST YESTERDAY to prevent UTC drift
        yesterday = get_ist_today() - datetime.timedelta(days=1)
        # Set table_name variable to store table name value
        table_name = get_monthly_table_name(yesterday)

        # 1. Check if yesterday was an official Company Holiday
        is_holiday = False
        # Begin guarded execution block to trap exceptions
        try:
            # Set h_row variable to store h row value
            h_row = db.execute(
                # Invoke text to perform operational action
                text("SELECT status, holiday_name FROM organization_calendar WHERE date = :d"),
                # Execute statement to process data and maintain state
                {"d": yesterday}
            # Execute statement to process data and maintain state
            ).mappings().first()
            # Evaluate condition to control execution branch
            if h_row and str(h_row.get("status") or "").upper() == "HOLIDAY":
                # Set is_holiday variable to store is holiday value
                is_holiday = True
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

        # Evaluate condition to control execution branch
        if is_holiday:
            # Set default_status variable to store default status value
            default_status = "Holiday"
        # Evaluate alternate branch condition
        elif is_week_off(yesterday):
            # Set default_status variable to store default status value
            default_status = "Week Off"
        # Execute fallback branch when conditions are not met
        else:
            # Set default_status variable to store default status value
            default_status = "Absent"

        # 2. Check for officially approved leaves for yesterday
        approved_leaves = {}
        # Set leave_table variable to store leave table value
        leave_table = f"leave_{yesterday.year}_{yesterday.month:02d}"
        # Begin guarded execution block to trap exceptions
        try:
            # Set l_rows variable to store l rows value
            l_rows = db.execute(
                # Execute statement to process data and maintain state
                text(f"""
                    SELECT emp_code, category, status, overall_status
                    FROM {leave_table}
                    WHERE start_date <= :d AND end_date >= :d
                      AND (UPPER(overall_status) = 'APPROVED' OR UPPER(status) = 'APPROVED')
                """),
                # Execute statement to process data and maintain state
                {"d": yesterday}
            # Execute statement to process data and maintain state
            ).mappings().all()
            # Iterate through items in sequence loop
            for lr in l_rows:
                # Execute statement to process data and maintain state
                approved_leaves[lr["emp_code"]] = lr.get("category") or "On Leave"
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

        # Begin guarded execution block to trap exceptions
        try:
            # Set l_rows2 variable to store l rows2 value
            l_rows2 = db.execute(
                # Execute statement to process data and maintain state
                text("""
                    SELECT emp_code, category, status, overall_status
                    FROM leave_requests
                    WHERE start_date <= :d AND end_date >= :d
                      AND (UPPER(overall_status) = 'APPROVED' OR UPPER(status) = 'APPROVED')
                """),
                # Execute statement to process data and maintain state
                {"d": yesterday}
            # Execute statement to process data and maintain state
            ).mappings().all()
            # Iterate through items in sequence loop
            for lr in l_rows2:
                # Check if target condition is false or object is missing
                if lr["emp_code"] not in approved_leaves:
                    # Execute statement to process data and maintain state
                    approved_leaves[lr["emp_code"]] = lr.get("category") or "On Leave"
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

        # 3. Find employees with missing attendance for yesterday
        missing_emps = db.execute(
            # Execute statement to process data and maintain state
            text(f"""
                SELECT p.emp_code
                FROM profile_master p
                WHERE p.emp_code NOT IN (
                    SELECT emp_code FROM {table_name} WHERE date = :target_date
                )
            """),
            # Execute statement to process data and maintain state
            {"target_date": yesterday}
        # Execute statement to process data and maintain state
        ).fetchall()

        # 4. Insert accurate status preserving approved leaves
        for row in missing_emps:
            # Set emp_code variable to store emp code value
            emp_code = row[0]
            # Set emp_status variable to store emp status value
            emp_status = approved_leaves.get(emp_code, default_status)
            # Begin guarded execution block to trap exceptions
            try:
                # Execute statement to process data and maintain state
                db.execute(
                    # Execute statement to process data and maintain state
                    text(f"""
                        INSERT INTO {table_name} (emp_code, date, status, hours_completed)
                        VALUES (:code, :date, :status, 0)
                    """),
                    # Execute statement to process data and maintain state
                    {"code": emp_code, "date": yesterday, "status": emp_status}
                # Execute statement to process data and maintain state
                )
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass

        # Commit transaction to persist changes in database
        db.commit()
        # Invoke print to perform operational action
        print(f"✅ Daily attendance check completed for {yesterday}: processed {len(missing_emps)} employees.")
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Invoke print to perform operational action
        print(f"❌ Error during daily attendance check: {e}")
    # Execute cleanup actions regardless of exceptions
    finally:
        # Invoke db.close to perform operational action
        db.close()
 
# Expose as an API so you can test it manually via Swagger/Postman [cite: 130]
@router.post("/trigger-absent-check")
# Define manual_absent_check function to handle manual absent check
def manual_absent_check():
    """Manual trigger to execute the daily check for testing purposes[cite: 131]."""
    run_daily_absent_check()
    # Return computed result or response payload to caller
    return {"message": "Absent/Week Off check executed successfully"}