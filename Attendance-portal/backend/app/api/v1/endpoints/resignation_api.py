from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from datetime import date, datetime, timedelta
from typing import List, Optional

from app.db.session import get_db
from app.models.resignation_model import Resignation, ResignationCreate
from app.models.profile_model import Profile

router = APIRouter(prefix="/resignation", tags=["Resignation"])

def ensure_resignations_table(db: Session):
    """Ensure the resignations table exists and has seed data if empty."""
    inspector = inspect(db.bind)
    if "resignations" not in inspector.get_table_names():
        Resignation.__table__.create(db.bind, checkfirst=True)

    count = db.query(Resignation).count()
    if count == 0:
        # Initial 6 notice period records with real dates & calculations
        seeds = [
            Resignation(
                emp_code="EMP014",
                name="Aachal P.",
                email="aachal.p@laesfera.co",
                department="Design",
                designation="UI Designer",
                reporting_manager="Kevin John",
                resignation_date=date(2026, 9, 28),
                notice_period="30 Days",
                last_working_day=date(2026, 10, 28),
                primary_reason="Better Career Opportunity",
                comment="Transitioning to higher product design role.",
                status="Active Notice"
            ),
            Resignation(
                emp_code="EMP002",
                name="Migdad Mirza",
                email="migdad.m@laesfera.co",
                department="Engineering",
                designation="Team Leader",
                reporting_manager="Kevin John",
                resignation_date=date(2026, 9, 1),
                notice_period="45 Days",
                last_working_day=date(2026, 10, 16),
                primary_reason="Higher Studies",
                comment="Pursuing master's program.",
                status="Urgent"
            ),
            Resignation(
                emp_code="EMP003",
                name="Janhavi Solanki",
                email="janhavi.s@laesfera.co",
                department="Design",
                designation="Intern Developer",
                reporting_manager="Aaquib Khan",
                resignation_date=date(2026, 9, 20),
                notice_period="45 Days",
                last_working_day=date(2026, 11, 4),
                primary_reason="Higher Studies",
                comment="Academic curriculum completion.",
                status="Upcoming"
            ),
            Resignation(
                emp_code="EMP004",
                name="Pratik Shah",
                email="pratik.s@laesfera.co",
                department="Engineering",
                designation="Pre Sales",
                reporting_manager="Kevin John",
                resignation_date=date(2026, 8, 20),
                notice_period="60 Days",
                last_working_day=date(2026, 10, 19),
                primary_reason="Relocation",
                comment="Family relocation to Bangalore.",
                status="Urgent"
            ),
            Resignation(
                emp_code="EMP005",
                name="Akash Maurya",
                email="akash.m@laesfera.co",
                department="Engineering",
                designation="Senior Software Developer",
                reporting_manager="Migdad Mirza",
                resignation_date=date(2026, 9, 10),
                notice_period="45 Days",
                last_working_day=date(2026, 10, 25),
                primary_reason="Better Career Opportunity",
                comment="Accepted senior position.",
                status="Active Notice"
            ),
            Resignation(
                emp_code="EMP006",
                name="Jasmeet Saggu",
                email="jasmeet.s@laesfera.co",
                department="Finance",
                designation="Senior Accountant",
                reporting_manager="Kevin John",
                resignation_date=date(2026, 9, 26),
                notice_period="45 Days",
                last_working_day=date(2026, 11, 10),
                primary_reason="Personal / Family Reasons",
                comment="Taking a sabbatical for personal commitments.",
                status="Active Notice"
            ),
        ]
        db.add_all(seeds)
        db.commit()

def serialize_resignation(r: Resignation, today: Optional[date] = None):
    if today is None:
        today = date.today()
    
    res_date = r.resignation_date or today
    lwd = r.last_working_day or (today + timedelta(days=30))

    total_notice_days = (lwd - res_date).days
    days_remaining = (lwd - today).days
    days_elapsed = max(0, min(total_notice_days, (today - res_date).days))
    progress_pct = 100 if total_notice_days <= 0 else min(100, max(0, round((days_elapsed / total_notice_days) * 100)))

    # Compute status based on remaining days if not completed/exited
    status = r.status or "Active Notice"
    if days_remaining < 0:
        status = "Completed"
    elif days_remaining <= 7:
        status = "Urgent"
    elif status not in ["Active Notice", "Urgent", "Upcoming", "Completed"]:
        status = "Active Notice"

    return {
        "id": r.id,
        "emp_code": r.emp_code,
        "employeeId": r.emp_code,
        "name": r.name or r.emp_code,
        "employeeName": r.name or r.emp_code,
        "email": r.email or "",
        "department": r.department or "General",
        "designation": r.designation or "Employee",
        "reporting_manager": r.reporting_manager or "—",
        "manager": r.reporting_manager or "—",
        "resignation_date": res_date.isoformat(),
        "resignationDate": res_date.isoformat(),
        "notice_period": r.notice_period or f"{total_notice_days} Days",
        "noticePeriod": r.notice_period or f"{total_notice_days} Days",
        "last_working_day": lwd.isoformat(),
        "lastWorkingDay": lwd.isoformat(),
        "primary_reason": r.primary_reason or "Other",
        "reason": r.primary_reason or "Other",
        "comment": r.comment or "",
        "notes": r.comment or "",
        "status": status,
        "totalNoticeDays": total_notice_days,
        "total_notice_days": total_notice_days,
        "daysRemaining": days_remaining,
        "days_remaining": days_remaining,
        "daysElapsed": days_elapsed,
        "days_elapsed": days_elapsed,
        "progressPct": progress_pct,
        "progress_pct": progress_pct,
    }

@router.get("/all")
@router.get("")
@router.get("/")
def get_all_resignations(db: Session = Depends(get_db)):
    ensure_resignations_table(db)
    records = db.query(Resignation).order_by(Resignation.last_working_day.asc()).all()
    today = date.today()
    return [serialize_resignation(r, today) for r in records]

@router.get("/summary")
def get_resignation_summary(db: Session = Depends(get_db)):
    ensure_resignations_table(db)
    records = db.query(Resignation).all()
    today = date.today()
    
    total_on_notice = 0
    exiting_this_week = 0
    exiting_this_month = 0
    total_notice_sum = 0
    valid_count = 0

    for r in records:
        s = serialize_resignation(r, today)
        if s["status"] != "Completed":
            total_on_notice += 1
            if 0 <= s["daysRemaining"] <= 7:
                exiting_this_week += 1
            elif 0 <= s["daysRemaining"] <= 30:
                exiting_this_month += 1
        
        if s["totalNoticeDays"] and s["totalNoticeDays"] > 0:
            total_notice_sum += s["totalNoticeDays"]
            valid_count += 1

    avg_notice = round(total_notice_sum / valid_count) if valid_count > 0 else 0

    return {
        "total_on_notice": total_on_notice,
        "exiting_this_week": exiting_this_week,
        "exiting_this_month": exiting_this_month,
        "avg_notice_period_days": avg_notice,
    }

@router.post("/submit")
@router.post("/add")
def submit_resignation(payload: ResignationCreate, db: Session = Depends(get_db)):
    ensure_resignations_table(db)

    emp_code = payload.emp_code or payload.employeeId or "EMP-NEW"
    name = payload.name or payload.employeeName or emp_code
    dept = payload.department or "General"
    desig = payload.designation or "Employee"
    mgr = payload.reporting_manager or payload.reportingManager or "—"
    reason = payload.primary_reason or payload.reason or "Better Career Opportunity"
    notes = payload.comment or payload.notes or ""

    # Parse resignation date
    r_date_str = payload.resignation_date or payload.resignationDate
    if r_date_str:
        try:
            r_date = date.fromisoformat(r_date_str)
        except Exception:
            r_date = date.today()
    else:
        r_date = date.today()

    # Parse last working day
    lwd_str = payload.last_working_day or payload.lastWorkingDay or payload.proposed_last_working_day
    if lwd_str:
        try:
            lwd = date.fromisoformat(lwd_str)
        except Exception:
            lwd = r_date + timedelta(days=30)
    else:
        lwd = r_date + timedelta(days=30)

    # Calculate notice period string
    duration_days = max(1, (lwd - r_date).days)
    np_str = payload.notice_period or payload.noticePeriod or f"{duration_days} Days"

    # Status based on remaining days
    days_left = (lwd - date.today()).days
    status_val = "Urgent" if (0 <= days_left <= 7) else ("Active Notice" if days_left >= 0 else "Completed")

    new_record = Resignation(
        emp_code=emp_code,
        name=name,
        department=dept,
        designation=desig,
        reporting_manager=mgr,
        resignation_date=r_date,
        notice_period=np_str,
        last_working_day=lwd,
        primary_reason=reason,
        comment=notes,
        status=status_val
    )

    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return {
        "success": True,
        "message": "Resignation recorded successfully.",
        "record": serialize_resignation(new_record, date.today())
    }

@router.put("/{record_id}")
def update_resignation_endpoint(record_id: int, payload: dict, db: Session = Depends(get_db)):
    ensure_resignations_table(db)
    record = db.query(Resignation).filter(Resignation.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Resignation record not found")
    
    if "status" in payload:
        record.status = str(payload["status"]).strip()
    if "lastWorkingDay" in payload or "last_working_day" in payload:
        lwd_val = payload.get("lastWorkingDay") or payload.get("last_working_day")
        try:
            record.last_working_day = date.fromisoformat(lwd_val)
        except Exception:
            pass
    if "reason" in payload or "primary_reason" in payload:
        record.primary_reason = payload.get("reason") or payload.get("primary_reason")
    if "comment" in payload or "notes" in payload:
        record.comment = payload.get("comment") or payload.get("notes")
    if "department" in payload:
        record.department = payload["department"]
    if "designation" in payload:
        record.designation = payload["designation"]

    db.commit()
    db.refresh(record)
    return {
        "success": True,
        "message": "Resignation record updated successfully.",
        "record": serialize_resignation(record, date.today())
    }

@router.delete("/{record_id}")
def delete_resignation_endpoint(record_id: int, db: Session = Depends(get_db)):
    ensure_resignations_table(db)
    record = db.query(Resignation).filter(Resignation.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Resignation record not found")
    
    db.delete(record)
    db.commit()
    return {"success": True, "message": "Resignation record deleted successfully"}

