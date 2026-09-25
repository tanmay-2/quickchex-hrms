from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.leave import LeaveCreate, LeaveResponse
from app.services import leave_service
from app.core.dependencies import get_current_user # Assuming you use this for security

from typing import List

router = APIRouter(tags=["Leaves"])

@router.post("/apply")
async def apply_for_leave(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Creates a leave request in the dynamic monthly table and static table
    based on the start_date provided.
    """
    try:
        from app.api.v1.endpoints.attendance_api import _resolve_emp_code
        try:
            data = await request.json()
        except Exception:
            data = {}
        emp_code = data.get("emp_code") or _resolve_emp_code(request, db, data) or "EMP001"
        return leave_service.create_leave_request(db, data, emp_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{emp_code}", response_model=List[LeaveResponse])
def get_leave_history(
    emp_code: str,
    db: Session = Depends(get_db)
):
    """
    Fetches leave history from the current monthly table.
    """
    return leave_service.get_leave_requests(db, emp_code)

@router.get("/team/{tl_emp_code}")
def get_team_leave_requests(
    tl_emp_code: str, 
    db: Session = Depends(get_db)
):
    """
    Fetches all leave requests for employees reporting to the given TL.
    """
    return leave_service.get_team_leaves(db, tl_emp_code)

@router.put("/{leave_id}/approve")
def approve_leave(
    leave_id: int, 
    db: Session = Depends(get_db)
):
    """
    Approves leave and deducts from the static LeaveBalance table.
    """
    result = leave_service.update_leave_status(db, leave_id, "Approved")
    if not result:
        raise HTTPException(status_code=404, detail="Leave request not found in recent records")
    return result

@router.put("/{leave_id}/reject")
def reject_leave(
    leave_id: int, 
    db: Session = Depends(get_db)
):
    """
    Rejects leave without affecting balance.
    """
    result = leave_service.update_leave_status(db, leave_id, "Rejected")
    if not result:
        raise HTTPException(status_code=404, detail="Leave request not found in recent records")
    return result

@router.get("/stats/{emp_code}")
def get_user_leave_stats(
    emp_code: str, 
    db: Session = Depends(get_db)
):
    """
    Returns pending count from dynamic table and available balance from static table.
    """
    return leave_service.get_leave_stats(db, emp_code)


@router.get("/admin/all")
def get_all_leaves_admin_endpoint(db: Session = Depends(get_db)):
    """
    Fetches all leave requests across all active dynamic tables for the Admin portal.
    """
    return leave_service.get_all_leaves_admin(db)