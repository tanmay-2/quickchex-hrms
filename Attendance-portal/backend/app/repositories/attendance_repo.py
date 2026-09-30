from sqlalchemy.orm import Session
from app.models.attendance import Attendance
from datetime import datetime,date
from fastapi import HTTPException

def punch_in(db: Session, emp_code: str, location: str, file_path: str):

    existing = db.query(Attendance).filter(
        Attendance.emp_code == emp_code,
        Attendance.date == date.today()
    ).first()

    if existing and existing.punch_in_time:
        raise HTTPException(status_code=400, detail="Already punched in today")

    if not existing:
        attendance = Attendance(
            emp_code=emp_code,
            date=date.today(),
            punch_in_time=datetime.now(),
            punch_in_location=location,
            punch_in_photo=file_path
        )
        db.add(attendance)
    else:
        existing.punch_in_time = datetime.now()
        existing.punch_in_location = location
        existing.punch_in_photo = file_path

    db.commit()
    return {"status": "Punch In Successful"}

def create_check_in(db: Session, emp_code: int):
    attendance = Attendance(
        emp_code=emp_code,
        date=date.today()
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance

def update_check_out(db: Session, attendance: Attendance):
    from datetime import datetime
    attendance.check_out = datetime.utcnow()
    db.commit()
    db.refresh(attendance)
    return attendance

def get_user_attendance(db: Session, emp_code: int):
    return db.query(Attendance).filter(
        Attendance.emp_code == emp_code
    ).all()