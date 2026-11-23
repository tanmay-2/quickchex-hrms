# ==============================================================================
# QUICKCHEX HRMS BACKEND - ATTENDANCE_REPO.PY
# Path: Attendance-portal/backend/app/repositories/attendance_repo.py
# Purpose: Data access repository encapsulating queries and mutations for 'attendance_repo'.
# Primary Functions:
#   • punch_in()
#   • create_check_in()
#   • update_check_out()
#   • get_user_attendance()
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import Attendance from app.models.attendance for module operations
from app.models.attendance import Attendance
# Import datetime, date from datetime for module operations
from datetime import datetime, date
# Import HTTPException from fastapi for module operations
from fastapi import HTTPException
# Import get_ist_now, get_ist_today from app.services.attendance_service for module operations
from app.services.attendance_service import get_ist_now, get_ist_today

# Define punch_in function to handle punch in
def punch_in(db: Session, emp_code: str, location: str, file_path: str):
    # Set today_ist variable to store today ist value
    today_ist = get_ist_today()
    # Set now_ist variable to store now ist value
    now_ist = get_ist_now().replace(tzinfo=None)

    # Initiate database query on specified model
    existing = db.query(Attendance).filter(
        # Specify parameter value for Attendance.emp_code
        Attendance.emp_code == str(emp_code),
        # Execute statement to process data and maintain state
        Attendance.date == today_ist
    # Execute statement to process data and maintain state
    ).first()

    # Evaluate condition to control execution branch
    if existing and existing.punch_in_time:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Already punched in today")

    # Check if target condition is false or object is missing
    if not existing:
        # Set attendance variable to store attendance value
        attendance = Attendance(
            # Set emp_code variable to store emp code value
            emp_code=str(emp_code),
            # Set date variable to store date value
            date=today_ist,
            # Set punch_in_time variable to store punch in time value
            punch_in_time=now_ist,
            # Set punch_in_location variable to store punch in location value
            punch_in_location=location,
            # Set punch_in_photo variable to store punch in photo value
            punch_in_photo=file_path
        # Execute statement to process data and maintain state
        )
        # Stage new entity instance into database session
        db.add(attendance)
    # Execute fallback branch when conditions are not met
    else:
        # Execute statement to process data and maintain state
        existing.punch_in_time = now_ist
        # Execute statement to process data and maintain state
        existing.punch_in_location = location
        # Execute statement to process data and maintain state
        existing.punch_in_photo = file_path

    # Commit transaction to persist changes in database
    db.commit()
    # Return computed result or response payload to caller
    return {"status": "Punch In Successful"}

# Define create_check_in function to handle create check in
def create_check_in(db: Session, emp_code: str):
    # Set today_ist variable to store today ist value
    today_ist = get_ist_today()
    # Set attendance variable to store attendance value
    attendance = Attendance(
        # Set emp_code variable to store emp code value
        emp_code=str(emp_code),
        # Set date variable to store date value
        date=today_ist
    # Execute statement to process data and maintain state
    )
    # Stage new entity instance into database session
    db.add(attendance)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(attendance)
    # Return computed result or response payload to caller
    return attendance

# Define update_check_out function to handle update check out
def update_check_out(db: Session, attendance: Attendance):
    # Set now_ist variable to store now ist value
    now_ist = get_ist_now().replace(tzinfo=None)
    # Execute statement to process data and maintain state
    attendance.check_out = now_ist
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(attendance)
    # Return computed result or response payload to caller
    return attendance

# Define get_user_attendance function to handle get user attendance
def get_user_attendance(db: Session, emp_code: str):
    # Initiate database query on specified model
    return db.query(Attendance).filter(
        # Execute statement to process data and maintain state
        Attendance.emp_code == str(emp_code)
    # Execute statement to process data and maintain state
    ).all()