# ==============================================================================
# QUICKCHEX HRMS BACKEND - RESIGNATION_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/resignation_api.py
# Purpose: FastAPI route controller handling 'resignation_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/all') -> get_all_resignations()
#   • router.get('') -> get_all_resignations()
#   • router.get('/') -> get_all_resignations()
#   • router.get('/summary') -> get_resignation_summary()
#   • router.post('/submit') -> submit_resignation()
#   • router.post('/add') -> submit_resignation()
#   • router.put('/{record_id}') -> update_resignation_endpoint()
#   • router.delete('/{record_id}') -> delete_resignation_endpoint()
# ==============================================================================

# Import APIRouter, Depends, HTTPException, status from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, status
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import inspect from sqlalchemy for module operations
from sqlalchemy import inspect
# Import date, datetime, timedelta from datetime for module operations
from datetime import date, datetime, timedelta
# Import List, Optional from typing for module operations
from typing import List, Optional

# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import Resignation, ResignationCreate from app.models.resignation_model for module operations
from app.models.resignation_model import Resignation, ResignationCreate
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile

# Set router variable to store router value
router = APIRouter(prefix="/resignation", tags=["Resignation"])

# Define ensure_resignations_table function to handle ensure resignations table
def ensure_resignations_table(db: Session):
    """Ensure the resignations table exists and has seed data if empty."""
    inspector = inspect(db.bind)
    # Check if target condition is false or object is missing
    if "resignations" not in inspector.get_table_names():
        # Invoke Resignation.__table__.create to perform operational action
        Resignation.__table__.create(db.bind, checkfirst=True)

    # Initiate database query on specified model
    count = db.query(Resignation).count()
    # Evaluate condition to control execution branch
    if count == 0:
        # Initial 6 notice period records with real dates & calculations
        seeds = [
            # Execute statement to process data and maintain state
            Resignation(
                # Set emp_code variable to store emp code value
                emp_code="EMP014",
                # Set name variable to store name value
                name="Aachal P.",
                # Set email variable to store email value
                email="aachal.p@laesfera.co",
                # Set department variable to store department value
                department="Design",
                # Set designation variable to store designation value
                designation="UI Designer",
                # Set reporting_manager variable to store reporting manager value
                reporting_manager="Kevin John",
                # Set resignation_date variable to store resignation date value
                resignation_date=date(2026, 9, 28),
                # Set notice_period variable to store notice period value
                notice_period="30 Days",
                # Set last_working_day variable to store last working day value
                last_working_day=date(2026, 10, 28),
                # Set primary_reason variable to store primary reason value
                primary_reason="Better Career Opportunity",
                # Set comment variable to store comment value
                comment="Transitioning to higher product design role.",
                # Set status variable to store status value
                status="Active Notice"
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            Resignation(
                # Set emp_code variable to store emp code value
                emp_code="EMP002",
                # Set name variable to store name value
                name="Migdad Mirza",
                # Set email variable to store email value
                email="migdad.m@laesfera.co",
                # Set department variable to store department value
                department="Engineering",
                # Set designation variable to store designation value
                designation="Team Leader",
                # Set reporting_manager variable to store reporting manager value
                reporting_manager="Kevin John",
                # Set resignation_date variable to store resignation date value
                resignation_date=date(2026, 9, 1),
                # Set notice_period variable to store notice period value
                notice_period="45 Days",
                # Set last_working_day variable to store last working day value
                last_working_day=date(2026, 10, 16),
                # Set primary_reason variable to store primary reason value
                primary_reason="Higher Studies",
                # Set comment variable to store comment value
                comment="Pursuing master's program.",
                # Set status variable to store status value
                status="Urgent"
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            Resignation(
                # Set emp_code variable to store emp code value
                emp_code="EMP003",
                # Set name variable to store name value
                name="Janhavi Solanki",
                # Set email variable to store email value
                email="janhavi.s@laesfera.co",
                # Set department variable to store department value
                department="Design",
                # Set designation variable to store designation value
                designation="Intern Developer",
                # Set reporting_manager variable to store reporting manager value
                reporting_manager="Aaquib Khan",
                # Set resignation_date variable to store resignation date value
                resignation_date=date(2026, 9, 20),
                # Set notice_period variable to store notice period value
                notice_period="45 Days",
                # Set last_working_day variable to store last working day value
                last_working_day=date(2026, 11, 4),
                # Set primary_reason variable to store primary reason value
                primary_reason="Higher Studies",
                # Set comment variable to store comment value
                comment="Academic curriculum completion.",
                # Set status variable to store status value
                status="Upcoming"
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            Resignation(
                # Set emp_code variable to store emp code value
                emp_code="EMP004",
                # Set name variable to store name value
                name="Pratik Shah",
                # Set email variable to store email value
                email="pratik.s@laesfera.co",
                # Set department variable to store department value
                department="Engineering",
                # Set designation variable to store designation value
                designation="Pre Sales",
                # Set reporting_manager variable to store reporting manager value
                reporting_manager="Kevin John",
                # Set resignation_date variable to store resignation date value
                resignation_date=date(2026, 8, 20),
                # Set notice_period variable to store notice period value
                notice_period="60 Days",
                # Set last_working_day variable to store last working day value
                last_working_day=date(2026, 10, 19),
                # Set primary_reason variable to store primary reason value
                primary_reason="Relocation",
                # Set comment variable to store comment value
                comment="Family relocation to Bangalore.",
                # Set status variable to store status value
                status="Urgent"
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            Resignation(
                # Set emp_code variable to store emp code value
                emp_code="EMP005",
                # Set name variable to store name value
                name="Akash Maurya",
                # Set email variable to store email value
                email="akash.m@laesfera.co",
                # Set department variable to store department value
                department="Engineering",
                # Set designation variable to store designation value
                designation="Senior Software Developer",
                # Set reporting_manager variable to store reporting manager value
                reporting_manager="Migdad Mirza",
                # Set resignation_date variable to store resignation date value
                resignation_date=date(2026, 9, 10),
                # Set notice_period variable to store notice period value
                notice_period="45 Days",
                # Set last_working_day variable to store last working day value
                last_working_day=date(2026, 10, 25),
                # Set primary_reason variable to store primary reason value
                primary_reason="Better Career Opportunity",
                # Set comment variable to store comment value
                comment="Accepted senior position.",
                # Set status variable to store status value
                status="Active Notice"
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            Resignation(
                # Set emp_code variable to store emp code value
                emp_code="EMP006",
                # Set name variable to store name value
                name="Jasmeet Saggu",
                # Set email variable to store email value
                email="jasmeet.s@laesfera.co",
                # Set department variable to store department value
                department="Finance",
                # Set designation variable to store designation value
                designation="Senior Accountant",
                # Set reporting_manager variable to store reporting manager value
                reporting_manager="Kevin John",
                # Set resignation_date variable to store resignation date value
                resignation_date=date(2026, 9, 26),
                # Set notice_period variable to store notice period value
                notice_period="45 Days",
                # Set last_working_day variable to store last working day value
                last_working_day=date(2026, 11, 10),
                # Set primary_reason variable to store primary reason value
                primary_reason="Personal / Family Reasons",
                # Set comment variable to store comment value
                comment="Taking a sabbatical for personal commitments.",
                # Set status variable to store status value
                status="Active Notice"
            # Execute statement to process data and maintain state
            ),
        # Execute statement to process data and maintain state
        ]
        # Invoke db.add_all to perform operational action
        db.add_all(seeds)
        # Commit transaction to persist changes in database
        db.commit()

# Define serialize_resignation function to handle serialize resignation
def serialize_resignation(r: Resignation, today: Optional[date] = None):
    # Evaluate condition to control execution branch
    if today is None:
        # Set today variable to store today value
        today = date.today()
    
    # Set res_date variable to store res date value
    res_date = r.resignation_date or today
    # Set lwd variable to store lwd value
    lwd = r.last_working_day or (today + timedelta(days=30))

    # Set total_notice_days variable to store total notice days value
    total_notice_days = (lwd - res_date).days
    # Set days_remaining variable to store days remaining value
    days_remaining = (lwd - today).days
    # Set days_elapsed variable to store days elapsed value
    days_elapsed = max(0, min(total_notice_days, (today - res_date).days))
    # Set progress_pct variable to store progress pct value
    progress_pct = 100 if total_notice_days <= 0 else min(100, max(0, round((days_elapsed / total_notice_days) * 100)))

    # Compute status based on remaining days if not completed/exited
    status = r.status or "Active Notice"
    # Evaluate condition to control execution branch
    if days_remaining < 0:
        # Set status variable to store status value
        status = "Completed"
    # Evaluate alternate branch condition
    elif days_remaining <= 7:
        # Set status variable to store status value
        status = "Urgent"
    # Evaluate alternate branch condition
    elif status not in ["Active Notice", "Urgent", "Upcoming", "Completed"]:
        # Set status variable to store status value
        status = "Active Notice"

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "id": r.id,
        # Execute statement to process data and maintain state
        "emp_code": r.emp_code,
        # Execute statement to process data and maintain state
        "employeeId": r.emp_code,
        # Execute statement to process data and maintain state
        "name": r.name or r.emp_code,
        # Execute statement to process data and maintain state
        "employeeName": r.name or r.emp_code,
        # Execute statement to process data and maintain state
        "email": r.email or "",
        # Execute statement to process data and maintain state
        "department": r.department or "General",
        # Execute statement to process data and maintain state
        "designation": r.designation or "Employee",
        # Execute statement to process data and maintain state
        "reporting_manager": r.reporting_manager or "—",
        # Execute statement to process data and maintain state
        "manager": r.reporting_manager or "—",
        # Execute statement to process data and maintain state
        "resignation_date": res_date.isoformat(),
        # Execute statement to process data and maintain state
        "resignationDate": res_date.isoformat(),
        # Execute statement to process data and maintain state
        "notice_period": r.notice_period or f"{total_notice_days} Days",
        # Execute statement to process data and maintain state
        "noticePeriod": r.notice_period or f"{total_notice_days} Days",
        # Execute statement to process data and maintain state
        "last_working_day": lwd.isoformat(),
        # Execute statement to process data and maintain state
        "lastWorkingDay": lwd.isoformat(),
        # Execute statement to process data and maintain state
        "primary_reason": r.primary_reason or "Other",
        # Execute statement to process data and maintain state
        "reason": r.primary_reason or "Other",
        # Execute statement to process data and maintain state
        "comment": r.comment or "",
        # Execute statement to process data and maintain state
        "notes": r.comment or "",
        # Execute statement to process data and maintain state
        "status": status,
        # Execute statement to process data and maintain state
        "totalNoticeDays": total_notice_days,
        # Execute statement to process data and maintain state
        "total_notice_days": total_notice_days,
        # Execute statement to process data and maintain state
        "daysRemaining": days_remaining,
        # Execute statement to process data and maintain state
        "days_remaining": days_remaining,
        # Execute statement to process data and maintain state
        "daysElapsed": days_elapsed,
        # Execute statement to process data and maintain state
        "days_elapsed": days_elapsed,
        # Execute statement to process data and maintain state
        "progressPct": progress_pct,
        # Execute statement to process data and maintain state
        "progress_pct": progress_pct,
    # Execute statement to process data and maintain state
    }

# Define HTTP GET route endpoint handler
@router.get("/all")
# Define HTTP GET route endpoint handler
@router.get("")
# Define HTTP GET route endpoint handler
@router.get("/")
# Define get_all_resignations function to handle get all resignations
def get_all_resignations(db: Session = Depends(get_db)):
    # Invoke ensure_resignations_table to perform operational action
    ensure_resignations_table(db)
    # Initiate database query on specified model
    records = db.query(Resignation).order_by(Resignation.last_working_day.asc()).all()
    # Set today variable to store today value
    today = date.today()
    # Return computed result or response payload to caller
    return [serialize_resignation(r, today) for r in records]

# Define HTTP GET route endpoint handler
@router.get("/summary")
# Define get_resignation_summary function to handle get resignation summary
def get_resignation_summary(db: Session = Depends(get_db)):
    # Invoke ensure_resignations_table to perform operational action
    ensure_resignations_table(db)
    # Initiate database query on specified model
    records = db.query(Resignation).all()
    # Set today variable to store today value
    today = date.today()
    
    # Set total_on_notice variable to store total on notice value
    total_on_notice = 0
    # Set exiting_this_week variable to store exiting this week value
    exiting_this_week = 0
    # Set exiting_this_month variable to store exiting this month value
    exiting_this_month = 0
    # Set total_notice_sum variable to store total notice sum value
    total_notice_sum = 0
    # Set valid_count variable to store valid count value
    valid_count = 0

    # Iterate through items in sequence loop
    for r in records:
        # Set s variable to store s value
        s = serialize_resignation(r, today)
        # Evaluate condition to control execution branch
        if s["status"] != "Completed":
            # Execute statement to process data and maintain state
            total_on_notice += 1
            # Evaluate condition to control execution branch
            if 0 <= s["daysRemaining"] <= 7:
                # Execute statement to process data and maintain state
                exiting_this_week += 1
            # Evaluate alternate branch condition
            elif 0 <= s["daysRemaining"] <= 30:
                # Execute statement to process data and maintain state
                exiting_this_month += 1
        
        # Evaluate condition to control execution branch
        if s["totalNoticeDays"] and s["totalNoticeDays"] > 0:
            # Execute statement to process data and maintain state
            total_notice_sum += s["totalNoticeDays"]
            # Execute statement to process data and maintain state
            valid_count += 1

    # Set avg_notice variable to store avg notice value
    avg_notice = round(total_notice_sum / valid_count) if valid_count > 0 else 0

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "total_on_notice": total_on_notice,
        # Execute statement to process data and maintain state
        "exiting_this_week": exiting_this_week,
        # Execute statement to process data and maintain state
        "exiting_this_month": exiting_this_month,
        # Execute statement to process data and maintain state
        "avg_notice_period_days": avg_notice,
    # Execute statement to process data and maintain state
    }

# Define HTTP POST route endpoint handler
@router.post("/submit")
# Define HTTP POST route endpoint handler
@router.post("/add")
# Define submit_resignation function to handle submit resignation
def submit_resignation(payload: ResignationCreate, db: Session = Depends(get_db)):
    # Invoke ensure_resignations_table to perform operational action
    ensure_resignations_table(db)

    # Set emp_code variable to store emp code value
    emp_code = payload.emp_code or payload.employeeId or "EMP-NEW"
    # Set name variable to store name value
    name = payload.name or payload.employeeName or emp_code
    # Set dept variable to store dept value
    dept = payload.department or "General"
    # Set desig variable to store desig value
    desig = payload.designation or "Employee"
    # Set mgr variable to store mgr value
    mgr = payload.reporting_manager or payload.reportingManager or "—"
    # Set reason variable to store reason value
    reason = payload.primary_reason or payload.reason or "Better Career Opportunity"
    # Set notes variable to store notes value
    notes = payload.comment or payload.notes or ""

    # Parse resignation date
    r_date_str = payload.resignation_date or payload.resignationDate
    # Evaluate condition to control execution branch
    if r_date_str:
        # Begin guarded execution block to trap exceptions
        try:
            # Set r_date variable to store r date value
            r_date = date.fromisoformat(r_date_str)
        # Catch and handle specific exception if raised
        except Exception:
            # Set r_date variable to store r date value
            r_date = date.today()
    # Execute fallback branch when conditions are not met
    else:
        # Set r_date variable to store r date value
        r_date = date.today()

    # Parse last working day
    lwd_str = payload.last_working_day or payload.lastWorkingDay or payload.proposed_last_working_day
    # Evaluate condition to control execution branch
    if lwd_str:
        # Begin guarded execution block to trap exceptions
        try:
            # Set lwd variable to store lwd value
            lwd = date.fromisoformat(lwd_str)
        # Catch and handle specific exception if raised
        except Exception:
            # Set lwd variable to store lwd value
            lwd = r_date + timedelta(days=30)
    # Execute fallback branch when conditions are not met
    else:
        # Set lwd variable to store lwd value
        lwd = r_date + timedelta(days=30)

    # Calculate notice period string
    duration_days = max(1, (lwd - r_date).days)
    # Set np_str variable to store np str value
    np_str = payload.notice_period or payload.noticePeriod or f"{duration_days} Days"

    # Status based on remaining days
    days_left = (lwd - date.today()).days
    # Set status_val variable to store status val value
    status_val = "Urgent" if (0 <= days_left <= 7) else ("Active Notice" if days_left >= 0 else "Completed")

    # Set new_record variable to store new record value
    new_record = Resignation(
        # Set emp_code variable to store emp code value
        emp_code=emp_code,
        # Set name variable to store name value
        name=name,
        # Set department variable to store department value
        department=dept,
        # Set designation variable to store designation value
        designation=desig,
        # Set reporting_manager variable to store reporting manager value
        reporting_manager=mgr,
        # Set resignation_date variable to store resignation date value
        resignation_date=r_date,
        # Set notice_period variable to store notice period value
        notice_period=np_str,
        # Set last_working_day variable to store last working day value
        last_working_day=lwd,
        # Set primary_reason variable to store primary reason value
        primary_reason=reason,
        # Set comment variable to store comment value
        comment=notes,
        # Set status variable to store status value
        status=status_val
    # Execute statement to process data and maintain state
    )

    # Stage new entity instance into database session
    db.add(new_record)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(new_record)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "success": True,
        # Execute statement to process data and maintain state
        "message": "Resignation recorded successfully.",
        # Execute statement to process data and maintain state
        "record": serialize_resignation(new_record, date.today())
    # Execute statement to process data and maintain state
    }

# Define HTTP PUT route endpoint handler
@router.put("/{record_id}")
# Define update_resignation_endpoint function to handle update resignation endpoint
def update_resignation_endpoint(record_id: int, payload: dict, db: Session = Depends(get_db)):
    # Invoke ensure_resignations_table to perform operational action
    ensure_resignations_table(db)
    # Initiate database query on specified model
    record = db.query(Resignation).filter(Resignation.id == record_id).first()
    # Check if target condition is false or object is missing
    if not record:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Resignation record not found")
    
    # Evaluate condition to control execution branch
    if "status" in payload:
        # Execute statement to process data and maintain state
        record.status = str(payload["status"]).strip()
    # Evaluate condition to control execution branch
    if "lastWorkingDay" in payload or "last_working_day" in payload:
        # Set lwd_val variable to store lwd val value
        lwd_val = payload.get("lastWorkingDay") or payload.get("last_working_day")
        # Begin guarded execution block to trap exceptions
        try:
            # Execute statement to process data and maintain state
            record.last_working_day = date.fromisoformat(lwd_val)
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
    # Evaluate condition to control execution branch
    if "reason" in payload or "primary_reason" in payload:
        # Execute statement to process data and maintain state
        record.primary_reason = payload.get("reason") or payload.get("primary_reason")
    # Evaluate condition to control execution branch
    if "comment" in payload or "notes" in payload:
        # Execute statement to process data and maintain state
        record.comment = payload.get("comment") or payload.get("notes")
    # Evaluate condition to control execution branch
    if "department" in payload:
        # Execute statement to process data and maintain state
        record.department = payload["department"]
    # Evaluate condition to control execution branch
    if "designation" in payload:
        # Execute statement to process data and maintain state
        record.designation = payload["designation"]

    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(record)
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "success": True,
        # Execute statement to process data and maintain state
        "message": "Resignation record updated successfully.",
        # Execute statement to process data and maintain state
        "record": serialize_resignation(record, date.today())
    # Execute statement to process data and maintain state
    }

# Define HTTP DELETE route endpoint handler
@router.delete("/{record_id}")
# Define delete_resignation_endpoint function to handle delete resignation endpoint
def delete_resignation_endpoint(record_id: int, db: Session = Depends(get_db)):
    # Invoke ensure_resignations_table to perform operational action
    ensure_resignations_table(db)
    # Initiate database query on specified model
    record = db.query(Resignation).filter(Resignation.id == record_id).first()
    # Check if target condition is false or object is missing
    if not record:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Resignation record not found")
    
    # Mark entity instance for deletion in database
    db.delete(record)
    # Commit transaction to persist changes in database
    db.commit()
    # Return computed result or response payload to caller
    return {"success": True, "message": "Resignation record deleted successfully"}

