# ==============================================================================
# QUICKCHEX HRMS BACKEND - COMPOFF_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/compoff_api.py
# Purpose: FastAPI route controller handling 'compoff_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('') -> get_comp_offs()
#   • router.get('/') -> get_comp_offs()
#   • router.post('') -> create_comp_off()
#   • router.post('/') -> create_comp_off()
#   • router.put('/{record_id}/approve') -> approve_comp_off()
#   • router.post('/{record_id}/approve') -> approve_comp_off()
#   • router.put('/{record_id}/reject') -> reject_comp_off()
#   • router.post('/{record_id}/reject') -> reject_comp_off()
#   • ... and 1 more endpoints
# ==============================================================================

# Import APIRouter, Depends, HTTPException, status, Request from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, status, Request
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import inspect from sqlalchemy for module operations
from sqlalchemy import inspect
# Import date, datetime from datetime for module operations
from datetime import date, datetime
# Import List, Optional from typing for module operations
from typing import List, Optional

# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import CompOff, CompOffCreate, CompOffReview from app.models.compoff_model for module operations
from app.models.compoff_model import CompOff, CompOffCreate, CompOffReview
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile

# Set router variable to store router value
router = APIRouter(prefix="/leave/comp-off", tags=["Comp Offs"])

# Define ensure_compoff_table function to handle ensure compoff table
def ensure_compoff_table(db: Session):
    """Ensure comp_offs table exists and seed real organization records if empty."""
    inspector = inspect(db.bind)
    # Check if target condition is false or object is missing
    if "comp_offs" not in inspector.get_table_names():
        # Invoke CompOff.__table__.create to perform operational action
        CompOff.__table__.create(db.bind, checkfirst=True)

    # Initiate database query on specified model
    count = db.query(CompOff).count()
    # Evaluate condition to control execution branch
    if count == 0:
        # Set seeds variable to store seeds value
        seeds = [
            # Execute statement to process data and maintain state
            CompOff(
                # Set emp_code variable to store emp code value
                emp_code="EMP005",
                # Set employee_name variable to store employee name value
                employee_name="Akash Maurya",
                # Set department variable to store department value
                department="Engineering",
                # Set applied_on variable to store applied on value
                applied_on=date(2026, 8, 12),
                # Set applied_for variable to store applied for value
                applied_for=date(2026, 8, 16),
                # Set is_half_day variable to store is half day value
                is_half_day="No",
                # Set duration variable to store duration value
                duration="1 Day (8 Hours)",
                # Set used_on variable to store used on value
                used_on="—",
                # Set comment variable to store comment value
                comment="Weekend deployment & server monitoring support.",
                # Set status variable to store status value
                status="Pending",
                # Set level variable to store level value
                level="Level 1",
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            CompOff(
                # Set emp_code variable to store emp code value
                emp_code="EMP014",
                # Set employee_name variable to store employee name value
                employee_name="Aachal P.",
                # Set department variable to store department value
                department="Design",
                # Set applied_on variable to store applied on value
                applied_on=date(2026, 8, 10),
                # Set applied_for variable to store applied for value
                applied_for=date(2026, 8, 15),
                # Set is_half_day variable to store is half day value
                is_half_day="Yes",
                # Set duration variable to store duration value
                duration="0.5 Day (4 Hours)",
                # Set used_on variable to store used on value
                used_on="—",
                # Set comment variable to store comment value
                comment="Emergency product design assets for client release.",
                # Set status variable to store status value
                status="Pending",
                # Set level variable to store level value
                level="Level 1",
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            CompOff(
                # Set emp_code variable to store emp code value
                emp_code="LE249",
                # Set employee_name variable to store employee name value
                employee_name="Payal Mishra",
                # Set department variable to store department value
                department="Operations",
                # Set applied_on variable to store applied on value
                applied_on=date(2026, 8, 5),
                # Set applied_for variable to store applied for value
                applied_for=date(2026, 8, 8),
                # Set is_half_day variable to store is half day value
                is_half_day="Yes",
                # Set duration variable to store duration value
                duration="0.5 Day (4 Hours)",
                # Set used_on variable to store used on value
                used_on="—",
                # Set comment variable to store comment value
                comment="Supported month-end operations finalization.",
                # Set status variable to store status value
                status="Approved",
                # Set level variable to store level value
                level="Completed",
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            CompOff(
                # Set emp_code variable to store emp code value
                emp_code="EMP004",
                # Set employee_name variable to store employee name value
                employee_name="Pratik Shah",
                # Set department variable to store department value
                department="Engineering",
                # Set applied_on variable to store applied on value
                applied_on=date(2026, 8, 1),
                # Set applied_for variable to store applied for value
                applied_for=date(2026, 8, 2),
                # Set is_half_day variable to store is half day value
                is_half_day="No",
                # Set duration variable to store duration value
                duration="1 Day (8 Hours)",
                # Set used_on variable to store used on value
                used_on="19 Aug 2026",
                # Set comment variable to store comment value
                comment="Sunday database optimization.",
                # Set status variable to store status value
                status="Approved",
                # Set level variable to store level value
                level="Completed",
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            CompOff(
                # Set emp_code variable to store emp code value
                emp_code="EMP006",
                # Set employee_name variable to store employee name value
                employee_name="Jasmeet Saggu",
                # Set department variable to store department value
                department="Finance",
                # Set applied_on variable to store applied on value
                applied_on=date(2026, 7, 28),
                # Set applied_for variable to store applied for value
                applied_for=date(2026, 8, 1),
                # Set is_half_day variable to store is half day value
                is_half_day="No",
                # Set duration variable to store duration value
                duration="1 Day (8 Hours)",
                # Set used_on variable to store used on value
                used_on="—",
                # Set comment variable to store comment value
                comment="Financial audit preparation during quarterly closing.",
                # Set status variable to store status value
                status="Rejected",
                # Set level variable to store level value
                level="Completed",
            # Execute statement to process data and maintain state
            ),
        # Execute statement to process data and maintain state
        ]
        # Invoke db.add_all to perform operational action
        db.add_all(seeds)
        # Commit transaction to persist changes in database
        db.commit()

# Define serialize_compoff function to handle serialize compoff
def serialize_compoff(co: CompOff):
    # Set applied_on_str variable to store applied on str value
    applied_on_str = co.applied_on.strftime("%d %b %Y") if co.applied_on else ""
    # Set applied_for_str variable to store applied for str value
    applied_for_str = co.applied_for.strftime("%d %b %Y") if co.applied_for else ""
    # Set st variable to store st value
    st = co.status or "Pending"
    # Set is_pending variable to store is pending value
    is_pending = st.lower() == "pending"

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "id": co.id,
        # Execute statement to process data and maintain state
        "employeeName": co.employee_name or co.emp_code,
        # Execute statement to process data and maintain state
        "empCode": co.emp_code,
        # Execute statement to process data and maintain state
        "department": co.department or "Operations",
        # Execute statement to process data and maintain state
        "avatarBg": "#7c3aed",
        # Execute statement to process data and maintain state
        "appliedOn": applied_on_str,
        # Execute statement to process data and maintain state
        "appliedFor": applied_for_str,
        # Execute statement to process data and maintain state
        "isHalfDay": co.is_half_day or "No",
        # Specify parameter value for "duration": co.duration or ("0.5 Day (4 Hours)" if co.is_half_day
        "duration": co.duration or ("0.5 Day (4 Hours)" if co.is_half_day == "Yes" else "1 Day (8 Hours)"),
        # Execute statement to process data and maintain state
        "usedOn": co.used_on or "—",
        # Execute statement to process data and maintain state
        "comment": co.comment or "",
        # Execute statement to process data and maintain state
        "status": st,
        # Execute statement to process data and maintain state
        "level": co.level or ("Level 1" if is_pending else "Completed"),
        # Execute statement to process data and maintain state
        "tab": "pending" if is_pending else "completed",
    # Execute statement to process data and maintain state
    }

# Define parse_date_flexible function to handle parse date flexible
def parse_date_flexible(val) -> date:
    # Check if target condition is false or object is missing
    if not val:
        # Return computed result or response payload to caller
        return date.today()
    # Evaluate condition to control execution branch
    if isinstance(val, date):
        # Return computed result or response payload to caller
        return val
    # Set val_str variable to store val str value
    val_str = str(val).strip()
    # Try ISO format YYYY-MM-DD
    try:
        # Return computed result or response payload to caller
        return date.fromisoformat(val_str)
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass
    # Try DD Mon YYYY e.g. 18 Aug 2026
    for fmt in ("%d %b %Y", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        # Begin guarded execution block to trap exceptions
        try:
            # Return computed result or response payload to caller
            return datetime.strptime(val_str, fmt).date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return date.today()

# Define HTTP GET route endpoint handler
@router.get("")
# Define HTTP GET route endpoint handler
@router.get("/")
# Define get_comp_offs function to handle get comp offs
def get_comp_offs(db: Session = Depends(get_db)):
    # Invoke ensure_compoff_table to perform operational action
    ensure_compoff_table(db)
    # Initiate database query on specified model
    records = db.query(CompOff).order_by(CompOff.id.desc()).all()
    # Return computed result or response payload to caller
    return [serialize_compoff(r) for r in records]

# Define HTTP POST route endpoint handler
@router.post("")
# Define HTTP POST route endpoint handler
@router.post("/")
# Define create_comp_off function to handle create comp off
def create_comp_off(payload: CompOffCreate, db: Session = Depends(get_db)):
    # Invoke ensure_compoff_table to perform operational action
    ensure_compoff_table(db)

    # Resolve emp_code and employee_name
    emp_code = (payload.emp_code or payload.empCode or "").strip()
    # Set emp_name variable to store emp name value
    emp_name = (payload.employee_name or payload.employeeName or "").strip()
    # Set dept variable to store dept value
    dept = (payload.department or "").strip()

    # Evaluate condition to control execution branch
    if payload.employee and (" - " in payload.employee):
        # Set parts variable to store parts value
        parts = payload.employee.split(" - ")
        # Check if target condition is false or object is missing
        if not emp_name:
            # Set emp_name variable to store emp name value
            emp_name = parts[0].strip()
        # Check if target condition is false or object is missing
        if not emp_code:
            # Set emp_code variable to store emp code value
            emp_code = parts[1].strip()

    # If department or name is missing, look up from profile table
    if emp_code:
        # Initiate database query on specified model
        profile = db.query(Profile).filter(Profile.emp_code == emp_code).first()
        # Evaluate condition to control execution branch
        if profile:
            # Check if target condition is false or object is missing
            if not emp_name:
                # Set emp_name variable to store emp name value
                emp_name = f"{profile.first_name or ''} {profile.last_name or ''}".strip() or profile.emp_code
            # Check if target condition is false or object is missing
            if not dept:
                # Set dept variable to store dept value
                dept = profile.department or "Operations"

    # Check if target condition is false or object is missing
    if not emp_code:
        # Set emp_code variable to store emp code value
        emp_code = "EMP001"
    # Check if target condition is false or object is missing
    if not emp_name:
        # Set emp_name variable to store emp name value
        emp_name = "Employee"
    # Check if target condition is false or object is missing
    if not dept:
        # Set dept variable to store dept value
        dept = "Operations"

    # Dates
    app_on = parse_date_flexible(payload.applied_on or payload.appliedOn)
    # Set app_for variable to store app for value
    app_for = parse_date_flexible(payload.applied_for or payload.appliedFor)

    # Set half_day variable to store half day value
    half_day = payload.is_half_day or payload.isHalfDay or "No"
    # Set duration variable to store duration value
    duration = payload.duration or ("0.5 Day (4 Hours)" if half_day == "Yes" else "1 Day (8 Hours)")

    # Set new_record variable to store new record value
    new_record = CompOff(
        # Set emp_code variable to store emp code value
        emp_code=emp_code,
        # Set employee_name variable to store employee name value
        employee_name=emp_name,
        # Set department variable to store department value
        department=dept,
        # Set applied_on variable to store applied on value
        applied_on=app_on,
        # Set applied_for variable to store applied for value
        applied_for=app_for,
        # Set is_half_day variable to store is half day value
        is_half_day=half_day,
        # Set duration variable to store duration value
        duration=duration,
        # Set used_on variable to store used on value
        used_on="—",
        # Set comment variable to store comment value
        comment=(payload.comment or "").strip(),
        # Set status variable to store status value
        status="Pending",
        # Set level variable to store level value
        level="Level 1",
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
        "message": "Comp Off request submitted successfully.",
        # Execute statement to process data and maintain state
        "record": serialize_compoff(new_record),
    # Execute statement to process data and maintain state
    }

# Define HTTP PUT route endpoint handler
@router.put("/{record_id}/approve")
# Define HTTP POST route endpoint handler
@router.post("/{record_id}/approve")
# Define approve_comp_off function to handle approve comp off
def approve_comp_off(record_id: int, db: Session = Depends(get_db)):
    # Invoke ensure_compoff_table to perform operational action
    ensure_compoff_table(db)
    # Initiate database query on specified model
    record = db.query(CompOff).filter(CompOff.id == record_id).first()
    # Check if target condition is false or object is missing
    if not record:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Comp Off record not found")

    # Execute statement to process data and maintain state
    record.status = "Approved"
    # Execute statement to process data and maintain state
    record.level = "Completed"
    # Execute statement to process data and maintain state
    record.reviewed_at = datetime.utcnow()
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(record)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "success": True,
        # Execute statement to process data and maintain state
        "message": f"Comp Off for {record.employee_name} approved successfully.",
        # Execute statement to process data and maintain state
        "record": serialize_compoff(record),
    # Execute statement to process data and maintain state
    }

# Define HTTP PUT route endpoint handler
@router.put("/{record_id}/reject")
# Define HTTP POST route endpoint handler
@router.post("/{record_id}/reject")
# Define reject_comp_off function to handle reject comp off
def reject_comp_off(record_id: int, db: Session = Depends(get_db)):
    # Invoke ensure_compoff_table to perform operational action
    ensure_compoff_table(db)
    # Initiate database query on specified model
    record = db.query(CompOff).filter(CompOff.id == record_id).first()
    # Check if target condition is false or object is missing
    if not record:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Comp Off record not found")

    # Execute statement to process data and maintain state
    record.status = "Rejected"
    # Execute statement to process data and maintain state
    record.level = "Completed"
    # Execute statement to process data and maintain state
    record.reviewed_at = datetime.utcnow()
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(record)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "success": True,
        # Execute statement to process data and maintain state
        "message": f"Comp Off for {record.employee_name} rejected.",
        # Execute statement to process data and maintain state
        "record": serialize_compoff(record),
    # Execute statement to process data and maintain state
    }

# Define HTTP DELETE route endpoint handler
@router.delete("/{record_id}")
# Define delete_comp_off function to handle delete comp off
def delete_comp_off(record_id: int, db: Session = Depends(get_db)):
    # Invoke ensure_compoff_table to perform operational action
    ensure_compoff_table(db)
    # Initiate database query on specified model
    record = db.query(CompOff).filter(CompOff.id == record_id).first()
    # Check if target condition is false or object is missing
    if not record:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Comp Off record not found")

    # Mark entity instance for deletion in database
    db.delete(record)
    # Commit transaction to persist changes in database
    db.commit()
    # Return computed result or response payload to caller
    return {"success": True, "message": "Comp Off record deleted successfully"}
