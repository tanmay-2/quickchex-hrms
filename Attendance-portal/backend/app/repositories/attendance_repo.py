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

from sqlalchemy.orm import Session
from app.models.attendance import Attendance
from datetime import datetime, date
from fastapi import HTTPException
from app.services.attendance_service import get_ist_now, get_ist_today

def punch_in(db: Session, emp_code: str, location: str, file_path: str):
    today_ist = get_ist_today()
    now_ist = get_ist_now().replace(tzinfo=None)

    existing = db.query(Attendance).filter(
        Attendance.emp_code == str(emp_code),
        Attendance.date == today_ist
    ).first()

    if existing and existing.punch_in_time:
        raise HTTPException(status_code=400, detail="Already punched in today")

    if not existing:
        attendance = Attendance(
            emp_code=str(emp_code),
            date=today_ist,
            punch_in_time=now_ist,
            punch_in_location=location,
            punch_in_photo=file_path
        )
        db.add(attendance)
    else:
        existing.punch_in_time = now_ist
        existing.punch_in_location = location
        existing.punch_in_photo = file_path

    db.commit()
    return {"status": "Punch In Successful"}

def create_check_in(db: Session, emp_code: str):
    today_ist = get_ist_today()
    attendance = Attendance(
        emp_code=str(emp_code),
        date=today_ist
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance

def update_check_out(db: Session, attendance: Attendance):
    now_ist = get_ist_now().replace(tzinfo=None)
    attendance.check_out = now_ist
    db.commit()
    db.refresh(attendance)
    return attendance

def get_user_attendance(db: Session, emp_code: str):
    return db.query(Attendance).filter(
        Attendance.emp_code == str(emp_code)
    ).all()