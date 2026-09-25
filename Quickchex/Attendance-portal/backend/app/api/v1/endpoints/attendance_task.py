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
 
def run_daily_absent_check():
    """
    This function is called by the background scheduler at midnight.
    It marks missing records as 'Absent' or 'Week Off'.
    """
    db = SessionLocal()
    try:
        # Check for YESTERDAY, because this runs right after midnight [cite: 114]
        # Ensure server timezone matches office timezone (e.g., IST) 
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        table_name = get_monthly_table_name(yesterday)
       
        # 🔥 THE FIX: Decide whether to insert "Absent" or "Week Off" based on the date [cite: 115]
        status_to_insert = 'Week Off' if is_week_off(yesterday) else 'Absent'
       
        # Insert records only for employees who do NOT already have a record for yesterday [cite: 121]
        query = text(f"""
            INSERT INTO {table_name} (emp_code, date, status, hours_completed)
            SELECT p.emp_code, :target_date, :status_val, 0
            FROM profile_master p                                        
            WHERE p.emp_code NOT IN (
                SELECT emp_code FROM {table_name} WHERE date = :target_date
            )
        """)
 
        # Execute the query passing in the dynamically calculated status [cite: 116]
        db.execute(query, {
            "target_date": yesterday,
            "status_val": status_to_insert
        })
        db.commit()
        print(f"✅ Successfully marked '{status_to_insert}' for {yesterday}")
       
    except Exception as e:
        db.rollback()
        print(f"❌ Error marking records: {e}")
    finally:
        db.close()
 
# Expose as an API so you can test it manually via Swagger/Postman [cite: 130]
@router.post("/trigger-absent-check")
def manual_absent_check():
    """Manual trigger to execute the daily check for testing purposes[cite: 131]."""
    run_daily_absent_check()
    return {"message": "Absent/Week Off check executed successfully"}