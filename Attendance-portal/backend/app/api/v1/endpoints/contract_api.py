# ==============================================================================
# QUICKCHEX HRMS BACKEND - CONTRACT_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/contract_api.py
# Purpose: FastAPI route controller handling 'contract_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('') -> get_all_contracts()
#   • router.get('/') -> get_all_contracts()
#   • router.post('') -> create_contract()
#   • router.post('/') -> create_contract()
#   • router.put('/{identifier}') -> update_contract()
#   • router.patch('/{identifier}') -> update_contract()
#   • router.delete('/{identifier}') -> delete_contract()
# ==============================================================================

# Import APIRouter, Depends, HTTPException, status, Query from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, status, Query
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
# Import EmploymentContract, ContractCreate, ContractUpdate from app.models.contract_model for module operations
from app.models.contract_model import EmploymentContract, ContractCreate, ContractUpdate
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile

# Set router variable to store router value
router = APIRouter(prefix="/contracts", tags=["Employment Contracts"])

# Define ensure_contracts_table function to handle ensure contracts table
def ensure_contracts_table(db: Session):
    """Ensure employment_contracts table exists and seed real organization contracts if empty."""
    inspector = inspect(db.bind)
    # Check if target condition is false or object is missing
    if "employment_contracts" not in inspector.get_table_names():
        # Invoke EmploymentContract.__table__.create to perform operational action
        EmploymentContract.__table__.create(db.bind, checkfirst=True)

    # Initiate database query on specified model
    count = db.query(EmploymentContract).count()
    # Evaluate condition to control execution branch
    if count == 0:
        # Set seeds variable to store seeds value
        seeds = [
            # Execute statement to process data and maintain state
            EmploymentContract(
                # Set contract_code variable to store contract code value
                contract_code="EC-1001",
                # Set emp_code variable to store emp code value
                emp_code="EMP005",
                # Set employee_name variable to store employee name value
                employee_name="Akash Maurya",
                # Set department variable to store department value
                department="Engineering",
                # Set contract_type variable to store contract type value
                contract_type="Permanent Employment Contract",
                # Set start_date variable to store start date value
                start_date=date(2026, 9, 1),
                # Set end_date variable to store end date value
                end_date=date(2027, 8, 31),
                # Set approval_proof variable to store approval proof value
                approval_proof="pending",
                # Set agreement variable to store agreement value
                agreement="pending",
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            EmploymentContract(
                # Set contract_code variable to store contract code value
                contract_code="EC-1002",
                # Set emp_code variable to store emp code value
                emp_code="EMP014",
                # Set employee_name variable to store employee name value
                employee_name="Aachal P.",
                # Set department variable to store department value
                department="Design",
                # Set contract_type variable to store contract type value
                contract_type="Permanent Employment Contract",
                # Set start_date variable to store start date value
                start_date=date(2026, 9, 15),
                # Set end_date variable to store end date value
                end_date=date(2028, 9, 14),
                # Set approval_proof variable to store approval proof value
                approval_proof="uploaded",
                # Set agreement variable to store agreement value
                agreement="pending",
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            EmploymentContract(
                # Set contract_code variable to store contract code value
                contract_code="EC-1003",
                # Set emp_code variable to store emp code value
                emp_code="EMP004",
                # Set employee_name variable to store employee name value
                employee_name="Pratik Shah",
                # Set department variable to store department value
                department="Engineering",
                # Set contract_type variable to store contract type value
                contract_type="Permanent Employment Contract",
                # Set start_date variable to store start date value
                start_date=date(2026, 10, 1),
                # Set end_date variable to store end date value
                end_date=date(2027, 9, 30),
                # Set approval_proof variable to store approval proof value
                approval_proof="uploaded",
                # Set agreement variable to store agreement value
                agreement="uploaded",
            # Execute statement to process data and maintain state
            ),
            # Execute statement to process data and maintain state
            EmploymentContract(
                # Set contract_code variable to store contract code value
                contract_code="EC-1004",
                # Set emp_code variable to store emp code value
                emp_code="LE249",
                # Set employee_name variable to store employee name value
                employee_name="Payal Mishra",
                # Set department variable to store department value
                department="Operations",
                # Set contract_type variable to store contract type value
                contract_type="Permanent Employment Contract",
                # Set start_date variable to store start date value
                start_date=date(2026, 10, 10),
                end_date=date.today() + timedelta(days=45),  # Expiring in 45 days
                # Set approval_proof variable to store approval proof value
                approval_proof="pending",
                # Set agreement variable to store agreement value
                agreement="pending",
            # Execute statement to process data and maintain state
            ),
        # Execute statement to process data and maintain state
        ]
        # Invoke db.add_all to perform operational action
        db.add_all(seeds)
        # Commit transaction to persist changes in database
        db.commit()
    # Execute fallback branch when conditions are not met
    else:
        # If no contract expires within 90 days, set EC-1004 to expire in 45 days so Expiring Soon is directly testable
        has_expiring = db.query(EmploymentContract).filter(
            # Specify parameter value for EmploymentContract.end_date <
            EmploymentContract.end_date <= date.today() + timedelta(days=90),
            # Execute statement to process data and maintain state
            EmploymentContract.end_date >= date.today()
        # Execute statement to process data and maintain state
        ).first()
        # Check if target condition is false or object is missing
        if not has_expiring:
            # Initiate database query on specified model
            target = db.query(EmploymentContract).filter(EmploymentContract.contract_code == "EC-1004").first()
            # Check if target condition is false or object is missing
            if not target:
                # Initiate database query on specified model
                target = db.query(EmploymentContract).order_by(EmploymentContract.id.desc()).first()
            # Evaluate condition to control execution branch
            if target:
                # Execute statement to process data and maintain state
                target.end_date = date.today() + timedelta(days=45)
                # Commit transaction to persist changes in database
                db.commit()

# Define serialize_contract function to handle serialize contract
def serialize_contract(c: EmploymentContract):
    # Set parts variable to store parts value
    parts = (c.employee_name or "").strip().split()
    # Set initials variable to store initials value
    initials = "".join([p[0] for p in parts if p]).upper()[:2] or "EC"
    # Set is_fully_done variable to store is fully done value
    is_fully_done = c.approval_proof == "uploaded" and c.agreement == "uploaded"
    
    # Set end_d variable to store end d value
    end_d = c.end_date
    # Evaluate condition to control execution branch
    if isinstance(end_d, datetime):
        # Set end_d variable to store end d value
        end_d = end_d.date()
    # Evaluate alternate branch condition
    elif isinstance(end_d, str):
        # Begin guarded execution block to trap exceptions
        try:
            # Set end_d variable to store end d value
            end_d = date.fromisoformat(end_d.strip())
        # Catch and handle specific exception if raised
        except Exception:
            # Set end_d variable to store end d value
            end_d = None

    # Set today variable to store today value
    today = date.today()
    # Evaluate condition to control execution branch
    if end_d and end_d < today:
        # Set contract_status variable to store contract status value
        contract_status = "Expired"
    # Evaluate alternate branch condition
    elif end_d and (end_d - today).days <= 90:
        # Set contract_status variable to store contract status value
        contract_status = "Expiring Soon"
    # Execute fallback branch when conditions are not met
    else:
        # Set contract_status variable to store contract status value
        contract_status = "Active"

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "dbId": c.id,
        # Execute statement to process data and maintain state
        "id": c.contract_code,
        # Execute statement to process data and maintain state
        "contractCode": c.contract_code,
        # Execute statement to process data and maintain state
        "empCode": c.emp_code,
        # Execute statement to process data and maintain state
        "employeeName": c.employee_name,
        # Execute statement to process data and maintain state
        "department": c.department or "Operations",
        # Execute statement to process data and maintain state
        "initials": initials,
        # Specify parameter value for "avatarColor": "#dcfce7" if is_fully_done else ("#fee2e2" if c.approval_proof
        "avatarColor": "#dcfce7" if is_fully_done else ("#fee2e2" if c.approval_proof == "pending" else "#e0e7ff"),
        # Specify parameter value for "textColor": "#15803d" if is_fully_done else ("#ef4444" if c.approval_proof
        "textColor": "#15803d" if is_fully_done else ("#ef4444" if c.approval_proof == "pending" else "#4338ca"),
        # Execute statement to process data and maintain state
        "startDate": c.start_date.isoformat() if hasattr(c.start_date, "isoformat") else str(c.start_date or ""),
        # Execute statement to process data and maintain state
        "endDate": c.end_date.isoformat() if hasattr(c.end_date, "isoformat") else str(c.end_date or ""),
        # Execute statement to process data and maintain state
        "contractType": c.contract_type or "Permanent Employment Contract",
        # Execute statement to process data and maintain state
        "approvalProof": c.approval_proof or "pending",
        # Execute statement to process data and maintain state
        "agreement": c.agreement or "pending",
        # Execute statement to process data and maintain state
        "notes": c.notes or "",
        # Execute statement to process data and maintain state
        "status": contract_status,
    # Execute statement to process data and maintain state
    }

# Define parse_date function to handle parse date
def parse_date(d_val) -> date:
    # Check if target condition is false or object is missing
    if not d_val:
        # Return computed result or response payload to caller
        return date.today()
    # Evaluate condition to control execution branch
    if isinstance(d_val, date):
        # Return computed result or response payload to caller
        return d_val
    # Begin guarded execution block to trap exceptions
    try:
        # Return computed result or response payload to caller
        return date.fromisoformat(str(d_val).strip())
    # Catch and handle specific exception if raised
    except Exception:
        # Return computed result or response payload to caller
        return date.today()

# Define HTTP GET route endpoint handler
@router.get("")
# Define HTTP GET route endpoint handler
@router.get("/")
# Define get_all_contracts function to handle get all contracts
def get_all_contracts(
    # Define limit schema field with type Optional[int] and default value
    limit: Optional[int] = Query(None, ge=1, le=500),
    # Define offset schema field with type Optional[int] and default value
    offset: Optional[int] = Query(0, ge=0),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    # Invoke ensure_contracts_table to perform operational action
    ensure_contracts_table(db)
    # Initiate database query on specified model
    q = db.query(EmploymentContract).order_by(EmploymentContract.id.asc())
    # Check if target condition is false or object is missing
    if limit is not None:
        # Set q variable to store q value
        q = q.offset(offset or 0).limit(limit)
    # Set records variable to store records value
    records = q.all()
    # Return computed result or response payload to caller
    return [serialize_contract(r) for r in records]

# Define HTTP POST route endpoint handler
@router.post("")
# Define HTTP POST route endpoint handler
@router.post("/")
# Define create_contract function to handle create contract
def create_contract(payload: ContractCreate, db: Session = Depends(get_db)):
    # Invoke ensure_contracts_table to perform operational action
    ensure_contracts_table(db)

    # Set emp_name variable to store emp name value
    emp_name = (payload.employee_name or payload.employeeName or "").strip()
    # Set emp_code variable to store emp code value
    emp_code = (payload.emp_code or "").strip()
    # Set dept variable to store dept value
    dept = (payload.department or "").strip()

    # Look up profile by name or code if missing
    if not emp_code and emp_name:
        # Initiate database query on specified model
        profile = db.query(Profile).filter(
            # Execute statement to process data and maintain state
            (Profile.first_name.ilike(f"%{emp_name}%")) | 
            # Execute statement to process data and maintain state
            (Profile.emp_code == emp_name)
        # Execute statement to process data and maintain state
        ).first()
        # Evaluate condition to control execution branch
        if profile:
            # Set emp_code variable to store emp code value
            emp_code = profile.emp_code
            # Check if target condition is false or object is missing
            if not dept:
                # Set dept variable to store dept value
                dept = profile.department or "Operations"

    # Check if target condition is false or object is missing
    if not emp_code:
        # Set emp_code variable to store emp code value
        emp_code = f"EMP-{int(datetime.utcnow().timestamp()) % 10000}"
    # Check if target condition is false or object is missing
    if not emp_name:
        # Set emp_name variable to store emp name value
        emp_name = "Employee"
    # Check if target condition is false or object is missing
    if not dept:
        # Set dept variable to store dept value
        dept = "Operations"

    # Generate sequential EC code
    last = db.query(EmploymentContract).order_by(EmploymentContract.id.desc()).first()
    # Set next_num variable to store next num value
    next_num = (last.id + 1001) if last else 1001
    # Set code variable to store code value
    code = f"EC-{next_num}"

    # Set s_date variable to store s date value
    s_date = parse_date(payload.start_date or payload.startDate)
    # Set e_date variable to store e date value
    e_date = parse_date(payload.end_date or payload.endDate)
    # Set c_type variable to store c type value
    c_type = payload.contract_type or payload.contractType or "Permanent Employment Contract"
    # Set proof variable to store proof value
    proof = payload.approval_proof or payload.approvalProof or "pending"
    # Set agr variable to store agr value
    agr = payload.agreement or "pending"

    # Set new_rec variable to store new rec value
    new_rec = EmploymentContract(
        # Set contract_code variable to store contract code value
        contract_code=code,
        # Set emp_code variable to store emp code value
        emp_code=emp_code,
        # Set employee_name variable to store employee name value
        employee_name=emp_name,
        # Set department variable to store department value
        department=dept,
        # Set contract_type variable to store contract type value
        contract_type=c_type,
        # Set start_date variable to store start date value
        start_date=s_date,
        # Set end_date variable to store end date value
        end_date=e_date,
        # Set approval_proof variable to store approval proof value
        approval_proof=proof,
        # Set agreement variable to store agreement value
        agreement=agr,
        # Set notes variable to store notes value
        notes=payload.notes or "",
    # Execute statement to process data and maintain state
    )
    # Stage new entity instance into database session
    db.add(new_rec)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(new_rec)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "success": True,
        # Execute statement to process data and maintain state
        "message": f"Contract {code} created successfully for {emp_name}.",
        # Execute statement to process data and maintain state
        "contract": serialize_contract(new_rec),
    # Execute statement to process data and maintain state
    }

# Define HTTP PUT route endpoint handler
@router.put("/{identifier}")
# Define HTTP PATCH route endpoint handler
@router.patch("/{identifier}")
# Define update_contract function to handle update contract
def update_contract(identifier: str, payload: ContractUpdate, db: Session = Depends(get_db)):
    # Invoke ensure_contracts_table to perform operational action
    ensure_contracts_table(db)

    # Set rec variable to store rec value
    rec = None
    # Evaluate condition to control execution branch
    if identifier.isdigit():
        # Initiate database query on specified model
        rec = db.query(EmploymentContract).filter(EmploymentContract.id == int(identifier)).first()
    # Check if target condition is false or object is missing
    if not rec:
        # Initiate database query on specified model
        rec = db.query(EmploymentContract).filter(EmploymentContract.contract_code == identifier).first()

    # Check if target condition is false or object is missing
    if not rec:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail=f"Contract {identifier} not found")

    # Check if target condition is false or object is missing
    if payload.approval_proof is not None or payload.approvalProof is not None:
        # Execute statement to process data and maintain state
        rec.approval_proof = payload.approval_proof or payload.approvalProof
    # Check if target condition is false or object is missing
    if payload.agreement is not None:
        # Execute statement to process data and maintain state
        rec.agreement = payload.agreement
    # Evaluate condition to control execution branch
    if payload.start_date or payload.startDate:
        # Execute statement to process data and maintain state
        rec.start_date = parse_date(payload.start_date or payload.startDate)
    # Evaluate condition to control execution branch
    if payload.end_date or payload.endDate:
        # Execute statement to process data and maintain state
        rec.end_date = parse_date(payload.end_date or payload.endDate)
    # Check if target condition is false or object is missing
    if payload.notes is not None:
        # Execute statement to process data and maintain state
        rec.notes = payload.notes

    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(rec)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "success": True,
        # Execute statement to process data and maintain state
        "message": f"Contract {rec.contract_code} updated successfully.",
        # Execute statement to process data and maintain state
        "contract": serialize_contract(rec),
    # Execute statement to process data and maintain state
    }

# Define HTTP DELETE route endpoint handler
@router.delete("/{identifier}")
# Define delete_contract function to handle delete contract
def delete_contract(identifier: str, db: Session = Depends(get_db)):
    # Invoke ensure_contracts_table to perform operational action
    ensure_contracts_table(db)

    # Set rec variable to store rec value
    rec = None
    # Evaluate condition to control execution branch
    if identifier.isdigit():
        # Initiate database query on specified model
        rec = db.query(EmploymentContract).filter(EmploymentContract.id == int(identifier)).first()
    # Check if target condition is false or object is missing
    if not rec:
        # Initiate database query on specified model
        rec = db.query(EmploymentContract).filter(EmploymentContract.contract_code == identifier).first()

    # Check if target condition is false or object is missing
    if not rec:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail=f"Contract {identifier} not found")

    # Mark entity instance for deletion in database
    db.delete(rec)
    # Commit transaction to persist changes in database
    db.commit()

    # Return computed result or response payload to caller
    return {"success": True, "message": f"Contract {identifier} deleted successfully"}
