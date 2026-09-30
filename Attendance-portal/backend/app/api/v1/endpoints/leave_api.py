from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import leave_service
from typing import List, Optional

router = APIRouter(tags=["Leaves"])

@router.post("/apply")
async def apply_for_leave(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Creates a leave request in status PENDING_MANAGER across
    the dynamic monthly table and static table.
    """
    try:
        from app.api.v1.endpoints.attendance_api import _resolve_emp_code
        try:
            data = await request.json()
        except Exception:
            data = {}
        emp_code = _resolve_emp_code(request, db, data) or data.get("emp_code")
        if not emp_code:
            raise HTTPException(status_code=401, detail="Employee identity is required to submit a leave request.")
        res = leave_service.create_leave_request(db, data, emp_code)
        return {"status": "success", "message": "Leave application submitted successfully. Awaiting manager approval.", "data": res, **res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{emp_code}")
def get_leave_history(
    emp_code: str,
    db: Session = Depends(get_db)
):
    """
    Fetches leave history for employee with full two-level approval stages.
    """
    return leave_service.get_leave_requests(db, emp_code)

@router.get("/team/{tl_emp_code}")
def get_team_leave_requests(
    tl_emp_code: str, 
    db: Session = Depends(get_db)
):
    """
    Fetches all leave requests for employees reporting to the given TL/Manager.
    """
    return leave_service.get_team_leaves(db, tl_emp_code)

@router.put("/{leave_id}/approve")
@router.post("/{leave_id}/approve")
async def approve_leave(
    leave_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Admin Final Approval:
    Approves leave (admin_status=APPROVED, overall_status=APPROVED)
    and deducts consumed leave from LeaveBalance.
    """
    comment = ""
    try:
        body = await request.json()
        comment = body.get("comment") or body.get("remarks") or ""
    except Exception:
        pass

    admin_name = "Admin Approver"
    auth_h = request.headers.get("authorization", "")
    if auth_h.startswith("Bearer "):
        try:
            from jose import jwt
            from app.core.dependencies import SECRET_KEY, ALGORITHM
            payload = jwt.decode(auth_h.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
            admin_name = payload.get("sub") or admin_name
        except Exception:
            pass

    try:
        result = leave_service.admin_action_leave(db, leave_id, "Approved", admin_name=admin_name, comment=comment)
        if not result:
            raise HTTPException(status_code=404, detail="Leave request not found")
        return {"status": "success", "message": "Leave application approved successfully.", "data": result, **result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{leave_id}/reject")
@router.post("/{leave_id}/reject")
async def reject_leave(
    leave_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Admin Rejection:
    Rejects leave application (admin_status=REJECTED, overall_status=REJECTED)
    with rejection reason. Does not deduct leave balance.
    """
    comment = ""
    try:
        body = await request.json()
        comment = body.get("comment") or body.get("reason") or body.get("remarks") or ""
    except Exception:
        pass

    admin_name = "Admin Approver"
    auth_h = request.headers.get("authorization", "")
    if auth_h.startswith("Bearer "):
        try:
            from jose import jwt
            from app.core.dependencies import SECRET_KEY, ALGORITHM
            payload = jwt.decode(auth_h.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
            admin_name = payload.get("sub") or admin_name
        except Exception:
            pass

    try:
        result = leave_service.admin_action_leave(db, leave_id, "Rejected", admin_name=admin_name, comment=comment)
        if not result:
            raise HTTPException(status_code=404, detail="Leave request not found")
        return {"status": "success", "message": "Request rejected successfully.", "data": result, **result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{emp_code}")
def get_user_leave_stats(
    emp_code: str, 
    db: Session = Depends(get_db)
):
    """
    Returns pending count (awaiting manager OR admin review) and available balance.
    """
    return leave_service.get_leave_stats(db, emp_code)

@router.get("/admin/all")
def get_all_leaves_admin_endpoint(db: Session = Depends(get_db)):
    """
    Fetches all leave requests across the system with two-level approval metadata.
    """
    return leave_service.get_all_leaves_admin(db)
