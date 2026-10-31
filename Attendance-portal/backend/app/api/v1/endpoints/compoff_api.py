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

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from datetime import date, datetime
from typing import List, Optional

from app.db.session import get_db
from app.models.compoff_model import CompOff, CompOffCreate, CompOffReview
from app.models.profile_model import Profile

router = APIRouter(prefix="/leave/comp-off", tags=["Comp Offs"])

def ensure_compoff_table(db: Session):
    """Ensure comp_offs table exists and seed real organization records if empty."""
    inspector = inspect(db.bind)
    if "comp_offs" not in inspector.get_table_names():
        CompOff.__table__.create(db.bind, checkfirst=True)

    count = db.query(CompOff).count()
    if count == 0:
        seeds = [
            CompOff(
                emp_code="EMP005",
                employee_name="Akash Maurya",
                department="Engineering",
                applied_on=date(2026, 8, 12),
                applied_for=date(2026, 8, 16),
                is_half_day="No",
                duration="1 Day (8 Hours)",
                used_on="—",
                comment="Weekend deployment & server monitoring support.",
                status="Pending",
                level="Level 1",
            ),
            CompOff(
                emp_code="EMP014",
                employee_name="Aachal P.",
                department="Design",
                applied_on=date(2026, 8, 10),
                applied_for=date(2026, 8, 15),
                is_half_day="Yes",
                duration="0.5 Day (4 Hours)",
                used_on="—",
                comment="Emergency product design assets for client release.",
                status="Pending",
                level="Level 1",
            ),
            CompOff(
                emp_code="LE249",
                employee_name="Payal Mishra",
                department="Operations",
                applied_on=date(2026, 8, 5),
                applied_for=date(2026, 8, 8),
                is_half_day="Yes",
                duration="0.5 Day (4 Hours)",
                used_on="—",
                comment="Supported month-end operations finalization.",
                status="Approved",
                level="Completed",
            ),
            CompOff(
                emp_code="EMP004",
                employee_name="Pratik Shah",
                department="Engineering",
                applied_on=date(2026, 8, 1),
                applied_for=date(2026, 8, 2),
                is_half_day="No",
                duration="1 Day (8 Hours)",
                used_on="19 Aug 2026",
                comment="Sunday database optimization.",
                status="Approved",
                level="Completed",
            ),
            CompOff(
                emp_code="EMP006",
                employee_name="Jasmeet Saggu",
                department="Finance",
                applied_on=date(2026, 7, 28),
                applied_for=date(2026, 8, 1),
                is_half_day="No",
                duration="1 Day (8 Hours)",
                used_on="—",
                comment="Financial audit preparation during quarterly closing.",
                status="Rejected",
                level="Completed",
            ),
        ]
        db.add_all(seeds)
        db.commit()

def serialize_compoff(co: CompOff):
    applied_on_str = co.applied_on.strftime("%d %b %Y") if co.applied_on else ""
    applied_for_str = co.applied_for.strftime("%d %b %Y") if co.applied_for else ""
    st = co.status or "Pending"
    is_pending = st.lower() == "pending"

    return {
        "id": co.id,
        "employeeName": co.employee_name or co.emp_code,
        "empCode": co.emp_code,
        "department": co.department or "Operations",
        "avatarBg": "#7c3aed",
        "appliedOn": applied_on_str,
        "appliedFor": applied_for_str,
        "isHalfDay": co.is_half_day or "No",
        "duration": co.duration or ("0.5 Day (4 Hours)" if co.is_half_day == "Yes" else "1 Day (8 Hours)"),
        "usedOn": co.used_on or "—",
        "comment": co.comment or "",
        "status": st,
        "level": co.level or ("Level 1" if is_pending else "Completed"),
        "tab": "pending" if is_pending else "completed",
    }

def parse_date_flexible(val) -> date:
    if not val:
        return date.today()
    if isinstance(val, date):
        return val
    val_str = str(val).strip()
    # Try ISO format YYYY-MM-DD
    try:
        return date.fromisoformat(val_str)
    except Exception:
        pass
    # Try DD Mon YYYY e.g. 18 Aug 2026
    for fmt in ("%d %b %Y", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(val_str, fmt).date()
        except Exception:
            pass
    return date.today()

@router.get("")
@router.get("/")
def get_comp_offs(db: Session = Depends(get_db)):
    ensure_compoff_table(db)
    records = db.query(CompOff).order_by(CompOff.id.desc()).all()
    return [serialize_compoff(r) for r in records]

@router.post("")
@router.post("/")
def create_comp_off(payload: CompOffCreate, db: Session = Depends(get_db)):
    ensure_compoff_table(db)

    # Resolve emp_code and employee_name
    emp_code = (payload.emp_code or payload.empCode or "").strip()
    emp_name = (payload.employee_name or payload.employeeName or "").strip()
    dept = (payload.department or "").strip()

    if payload.employee and (" - " in payload.employee):
        parts = payload.employee.split(" - ")
        if not emp_name:
            emp_name = parts[0].strip()
        if not emp_code:
            emp_code = parts[1].strip()

    # If department or name is missing, look up from profile table
    if emp_code:
        profile = db.query(Profile).filter(Profile.emp_code == emp_code).first()
        if profile:
            if not emp_name:
                emp_name = f"{profile.first_name or ''} {profile.last_name or ''}".strip() or profile.emp_code
            if not dept:
                dept = profile.department or "Operations"

    if not emp_code:
        emp_code = "EMP001"
    if not emp_name:
        emp_name = "Employee"
    if not dept:
        dept = "Operations"

    # Dates
    app_on = parse_date_flexible(payload.applied_on or payload.appliedOn)
    app_for = parse_date_flexible(payload.applied_for or payload.appliedFor)

    half_day = payload.is_half_day or payload.isHalfDay or "No"
    duration = payload.duration or ("0.5 Day (4 Hours)" if half_day == "Yes" else "1 Day (8 Hours)")

    new_record = CompOff(
        emp_code=emp_code,
        employee_name=emp_name,
        department=dept,
        applied_on=app_on,
        applied_for=app_for,
        is_half_day=half_day,
        duration=duration,
        used_on="—",
        comment=(payload.comment or "").strip(),
        status="Pending",
        level="Level 1",
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return {
        "success": True,
        "message": "Comp Off request submitted successfully.",
        "record": serialize_compoff(new_record),
    }

@router.put("/{record_id}/approve")
@router.post("/{record_id}/approve")
def approve_comp_off(record_id: int, db: Session = Depends(get_db)):
    ensure_compoff_table(db)
    record = db.query(CompOff).filter(CompOff.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Comp Off record not found")

    record.status = "Approved"
    record.level = "Completed"
    record.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "message": f"Comp Off for {record.employee_name} approved successfully.",
        "record": serialize_compoff(record),
    }

@router.put("/{record_id}/reject")
@router.post("/{record_id}/reject")
def reject_comp_off(record_id: int, db: Session = Depends(get_db)):
    ensure_compoff_table(db)
    record = db.query(CompOff).filter(CompOff.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Comp Off record not found")

    record.status = "Rejected"
    record.level = "Completed"
    record.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "message": f"Comp Off for {record.employee_name} rejected.",
        "record": serialize_compoff(record),
    }

@router.delete("/{record_id}")
def delete_comp_off(record_id: int, db: Session = Depends(get_db)):
    ensure_compoff_table(db)
    record = db.query(CompOff).filter(CompOff.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Comp Off record not found")

    db.delete(record)
    db.commit()
    return {"success": True, "message": "Comp Off record deleted successfully"}
