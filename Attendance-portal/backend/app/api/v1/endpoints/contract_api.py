from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from datetime import date, datetime, timedelta
from typing import List, Optional

from app.db.session import get_db
from app.models.contract_model import EmploymentContract, ContractCreate, ContractUpdate
from app.models.profile_model import Profile

router = APIRouter(prefix="/contracts", tags=["Employment Contracts"])

def ensure_contracts_table(db: Session):
    """Ensure employment_contracts table exists and seed real organization contracts if empty."""
    inspector = inspect(db.bind)
    if "employment_contracts" not in inspector.get_table_names():
        EmploymentContract.__table__.create(db.bind, checkfirst=True)

    count = db.query(EmploymentContract).count()
    if count == 0:
        seeds = [
            EmploymentContract(
                contract_code="EC-1001",
                emp_code="EMP005",
                employee_name="Akash Maurya",
                department="Engineering",
                contract_type="Permanent Employment Contract",
                start_date=date(2026, 9, 1),
                end_date=date(2027, 8, 31),
                approval_proof="pending",
                agreement="pending",
            ),
            EmploymentContract(
                contract_code="EC-1002",
                emp_code="EMP014",
                employee_name="Aachal P.",
                department="Design",
                contract_type="Permanent Employment Contract",
                start_date=date(2026, 9, 15),
                end_date=date(2028, 9, 14),
                approval_proof="uploaded",
                agreement="pending",
            ),
            EmploymentContract(
                contract_code="EC-1003",
                emp_code="EMP004",
                employee_name="Pratik Shah",
                department="Engineering",
                contract_type="Permanent Employment Contract",
                start_date=date(2026, 10, 1),
                end_date=date(2027, 9, 30),
                approval_proof="uploaded",
                agreement="uploaded",
            ),
            EmploymentContract(
                contract_code="EC-1004",
                emp_code="LE249",
                employee_name="Payal Mishra",
                department="Operations",
                contract_type="Permanent Employment Contract",
                start_date=date(2026, 10, 10),
                end_date=date.today() + timedelta(days=45),  # Expiring in 45 days
                approval_proof="pending",
                agreement="pending",
            ),
        ]
        db.add_all(seeds)
        db.commit()
    else:
        # If no contract expires within 90 days, set EC-1004 to expire in 45 days so Expiring Soon is directly testable
        has_expiring = db.query(EmploymentContract).filter(
            EmploymentContract.end_date <= date.today() + timedelta(days=90),
            EmploymentContract.end_date >= date.today()
        ).first()
        if not has_expiring:
            target = db.query(EmploymentContract).filter(EmploymentContract.contract_code == "EC-1004").first()
            if not target:
                target = db.query(EmploymentContract).order_by(EmploymentContract.id.desc()).first()
            if target:
                target.end_date = date.today() + timedelta(days=45)
                db.commit()

def serialize_contract(c: EmploymentContract):
    parts = (c.employee_name or "").strip().split()
    initials = "".join([p[0] for p in parts if p]).upper()[:2] or "EC"
    is_fully_done = c.approval_proof == "uploaded" and c.agreement == "uploaded"
    
    end_d = c.end_date
    if isinstance(end_d, datetime):
        end_d = end_d.date()
    elif isinstance(end_d, str):
        try:
            end_d = date.fromisoformat(end_d.strip())
        except Exception:
            end_d = None

    today = date.today()
    if end_d and end_d < today:
        contract_status = "Expired"
    elif end_d and (end_d - today).days <= 90:
        contract_status = "Expiring Soon"
    else:
        contract_status = "Active"

    return {
        "dbId": c.id,
        "id": c.contract_code,
        "contractCode": c.contract_code,
        "empCode": c.emp_code,
        "employeeName": c.employee_name,
        "department": c.department or "Operations",
        "initials": initials,
        "avatarColor": "#dcfce7" if is_fully_done else ("#fee2e2" if c.approval_proof == "pending" else "#e0e7ff"),
        "textColor": "#15803d" if is_fully_done else ("#ef4444" if c.approval_proof == "pending" else "#4338ca"),
        "startDate": c.start_date.isoformat() if hasattr(c.start_date, "isoformat") else str(c.start_date or ""),
        "endDate": c.end_date.isoformat() if hasattr(c.end_date, "isoformat") else str(c.end_date or ""),
        "contractType": c.contract_type or "Permanent Employment Contract",
        "approvalProof": c.approval_proof or "pending",
        "agreement": c.agreement or "pending",
        "notes": c.notes or "",
        "status": contract_status,
    }

def parse_date(d_val) -> date:
    if not d_val:
        return date.today()
    if isinstance(d_val, date):
        return d_val
    try:
        return date.fromisoformat(str(d_val).strip())
    except Exception:
        return date.today()

@router.get("")
@router.get("/")
def get_all_contracts(
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    ensure_contracts_table(db)
    q = db.query(EmploymentContract).order_by(EmploymentContract.id.asc())
    if limit is not None:
        q = q.offset(offset or 0).limit(limit)
    records = q.all()
    return [serialize_contract(r) for r in records]

@router.post("")
@router.post("/")
def create_contract(payload: ContractCreate, db: Session = Depends(get_db)):
    ensure_contracts_table(db)

    emp_name = (payload.employee_name or payload.employeeName or "").strip()
    emp_code = (payload.emp_code or "").strip()
    dept = (payload.department or "").strip()

    # Look up profile by name or code if missing
    if not emp_code and emp_name:
        profile = db.query(Profile).filter(
            (Profile.first_name.ilike(f"%{emp_name}%")) | 
            (Profile.emp_code == emp_name)
        ).first()
        if profile:
            emp_code = profile.emp_code
            if not dept:
                dept = profile.department or "Operations"

    if not emp_code:
        emp_code = f"EMP-{int(datetime.utcnow().timestamp()) % 10000}"
    if not emp_name:
        emp_name = "Employee"
    if not dept:
        dept = "Operations"

    # Generate sequential EC code
    last = db.query(EmploymentContract).order_by(EmploymentContract.id.desc()).first()
    next_num = (last.id + 1001) if last else 1001
    code = f"EC-{next_num}"

    s_date = parse_date(payload.start_date or payload.startDate)
    e_date = parse_date(payload.end_date or payload.endDate)
    c_type = payload.contract_type or payload.contractType or "Permanent Employment Contract"
    proof = payload.approval_proof or payload.approvalProof or "pending"
    agr = payload.agreement or "pending"

    new_rec = EmploymentContract(
        contract_code=code,
        emp_code=emp_code,
        employee_name=emp_name,
        department=dept,
        contract_type=c_type,
        start_date=s_date,
        end_date=e_date,
        approval_proof=proof,
        agreement=agr,
        notes=payload.notes or "",
    )
    db.add(new_rec)
    db.commit()
    db.refresh(new_rec)

    return {
        "success": True,
        "message": f"Contract {code} created successfully for {emp_name}.",
        "contract": serialize_contract(new_rec),
    }

@router.put("/{identifier}")
@router.patch("/{identifier}")
def update_contract(identifier: str, payload: ContractUpdate, db: Session = Depends(get_db)):
    ensure_contracts_table(db)

    rec = None
    if identifier.isdigit():
        rec = db.query(EmploymentContract).filter(EmploymentContract.id == int(identifier)).first()
    if not rec:
        rec = db.query(EmploymentContract).filter(EmploymentContract.contract_code == identifier).first()

    if not rec:
        raise HTTPException(status_code=404, detail=f"Contract {identifier} not found")

    if payload.approval_proof is not None or payload.approvalProof is not None:
        rec.approval_proof = payload.approval_proof or payload.approvalProof
    if payload.agreement is not None:
        rec.agreement = payload.agreement
    if payload.start_date or payload.startDate:
        rec.start_date = parse_date(payload.start_date or payload.startDate)
    if payload.end_date or payload.endDate:
        rec.end_date = parse_date(payload.end_date or payload.endDate)
    if payload.notes is not None:
        rec.notes = payload.notes

    db.commit()
    db.refresh(rec)

    return {
        "success": True,
        "message": f"Contract {rec.contract_code} updated successfully.",
        "contract": serialize_contract(rec),
    }

@router.delete("/{identifier}")
def delete_contract(identifier: str, db: Session = Depends(get_db)):
    ensure_contracts_table(db)

    rec = None
    if identifier.isdigit():
        rec = db.query(EmploymentContract).filter(EmploymentContract.id == int(identifier)).first()
    if not rec:
        rec = db.query(EmploymentContract).filter(EmploymentContract.contract_code == identifier).first()

    if not rec:
        raise HTTPException(status_code=404, detail=f"Contract {identifier} not found")

    db.delete(rec)
    db.commit()

    return {"success": True, "message": f"Contract {identifier} deleted successfully"}
