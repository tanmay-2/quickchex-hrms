from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date

from app.db.session import get_db
from app.models.resignation import ResignationRequest
from app.models.profile_model import Profile
from app.models.user import User
from app.core.dependencies import get_current_user

router = APIRouter(tags=["Resignation"])

class ResignationSubmitPayload(BaseModel):
    primary_reason: str
    proposed_last_working_day: Optional[str] = None
    comment: Optional[str] = None

class AddResignationPayload(BaseModel):
    emp_code: Optional[str] = None
    employee_id: Optional[str] = None
    resignation_date: Optional[str] = None
    last_working_day: Optional[str] = None
    notice_period: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None

@router.get("/all")
def get_all_resignations(db: Session = Depends(get_db)):
    """Fetch all recorded resignations enriched with employee profile details."""
    try:
        requests = db.query(ResignationRequest).order_by(ResignationRequest.created_at.desc()).all()
        # Pre-fetch profiles
        emp_codes = {r.emp_code for r in requests if r.emp_code}
        profiles = {}
        if emp_codes:
            for p in db.query(Profile).filter(Profile.emp_code.in_(emp_codes)).all():
                profiles[p.emp_code] = p

        results = []
        for r in requests:
            prof = profiles.get(r.emp_code)
            full_name = f"{prof.first_name or ''} {prof.last_name or ''}".strip() if prof else r.emp_code
            dept = prof.department if prof else "General"
            desig = prof.designation if prof else "Employee"
            res_date = r.created_at.strftime("%Y-%m-%d") if r.created_at else str(date.today())

            results.append({
                "id": r.id,
                "emp_code": r.emp_code,
                "name": full_name or r.emp_code,
                "department": dept,
                "designation": desig,
                "resignationDate": res_date,
                "resignation_date": res_date,
                "lastWorkingDay": r.proposed_last_working_day or res_date,
                "last_working_day": r.proposed_last_working_day or res_date,
                "reason": r.primary_reason,
                "primary_reason": r.primary_reason,
                "notes": r.comment or "",
                "status": r.status or "On Notice"
            })
        return results
    except Exception as e:
        print(f"Error fetching resignations: {e}")
        return []

@router.post("/submit")
def submit_resignation(
    payload: ResignationSubmitPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Employee submits resignation request."""
    emp_code = current_user.emp_code or current_user.username or "UNKNOWN"
    new_req = ResignationRequest(
        emp_code=emp_code,
        primary_reason=payload.primary_reason,
        proposed_last_working_day=payload.proposed_last_working_day,
        comment=payload.comment,
        status="On Notice"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return {"status": "success", "message": "Resignation submitted successfully", "id": new_req.id}

@router.post("/")
@router.post("/apply")
def apply_or_add_resignation(
    payload: AddResignationPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin or employee adds a resignation record."""
    emp_code = payload.emp_code or payload.employee_id or current_user.emp_code or current_user.username
    new_req = ResignationRequest(
        emp_code=emp_code,
        primary_reason=payload.reason or "Other",
        proposed_last_working_day=payload.last_working_day,
        comment=payload.notes,
        status="On Notice"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return {"status": "success", "message": "Resignation recorded successfully", "id": new_req.id}

@router.get("/me")
def get_my_resignation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get active resignation for logged-in user."""
    emp_code = current_user.emp_code or current_user.username
    req = db.query(ResignationRequest).filter(ResignationRequest.emp_code == emp_code).order_by(ResignationRequest.created_at.desc()).first()
    if not req:
        return {"has_resignation": False}
    return {
        "has_resignation": True,
        "id": req.id,
        "emp_code": req.emp_code,
        "primary_reason": req.primary_reason,
        "proposed_last_working_day": req.proposed_last_working_day,
        "comment": req.comment,
        "status": req.status,
        "created_at": req.created_at
    }
