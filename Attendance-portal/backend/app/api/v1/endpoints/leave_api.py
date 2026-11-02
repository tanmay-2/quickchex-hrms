# ==============================================================================
# LEAVE REQUESTS AND APPROVALS (leave_api.py)
# ==============================================================================
# This file lets employees ask for time off (leave) and lets managers and admins
# approve or reject those leave requests.
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import leave_service
from typing import List, Optional

router = APIRouter(tags=["Leaves"])


# ==============================================================================
# 📝 ASK FOR LEAVE: Employee submits a new leave request
# ==============================================================================
@router.post("/apply")
async def apply_for_leave(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    How asking for leave works step by step:
    1. Finds out which employee is asking for leave.
    2. Reads the dates, reason, and type of leave (Casual, Sick, etc.).
    3. Saves the request into the database so their boss can see it.
    4. Marks the status as 'Pending Manager Approval'.
    """
    try:
        from app.api.v1.endpoints.attendance_api import _resolve_emp_code
        try:
            data = await request.json()
        except Exception:
            data = {}
            
        # Step 1: Find out who is asking for leave
        emp_code = _resolve_emp_code(request, db, data) or data.get("emp_code")
        if not emp_code:
            raise HTTPException(status_code=401, detail="Please log in first to apply for leave.")
            
        # Step 2: Save the leave request to the database
        res = leave_service.create_leave_request(db, data, emp_code)
        return {
            "status": "success",
            "message": "Leave application submitted successfully. Awaiting manager approval.",
            "data": res,
            **res
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# 📋 PAST LEAVES: See all past leaves for this employee
# ==============================================================================
@router.get("/history/{emp_code}")
def get_leave_history(
    emp_code: str,
    db: Session = Depends(get_db)
):
    """
    Shows a list of all leaves this employee asked for in the past,
    and whether each leave was Approved, Rejected, or is still Pending.
    """
    return leave_service.get_leave_requests(db, emp_code)


# ==============================================================================
# 👥 TEAM LEAVES: Boss sees leave requests from their team
# ==============================================================================
@router.get("/team/{tl_emp_code}")
def get_team_leave_requests(
    tl_emp_code: str, 
    db: Session = Depends(get_db)
):
    """
    Shows the manager all the leave requests sent by their team members,
    so the manager can review and approve or reject them.
    """
    return leave_service.get_team_leaves(db, tl_emp_code)


# ==============================================================================
# ✅ APPROVE LEAVE: Boss or Admin approves the leave
# ==============================================================================
@router.put("/{leave_id}/approve")
@router.post("/{leave_id}/approve")
async def approve_leave(
    leave_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Approves the leave:
    1. Marks the leave as 'Approved'.
    2. Takes the approved days out of the employee's remaining leave balance.
    3. Updates the attendance table so those days are marked as 'Leave'.
    """
    comment = ""
    try:
        body = await request.json()
        comment = body.get("comment") or body.get("remarks") or ""
    except Exception:
        pass

    # Resolve admin identifier from JWT token
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
        # Perform atomic approval and balance debit
        result = leave_service.admin_action_leave(db, leave_id, "Approved", admin_name=admin_name, comment=comment)
        if not result:
            raise HTTPException(status_code=404, detail="Leave request not found")
        return {"status": "success", "message": "Leave application approved successfully.", "data": result, **result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# ❌ REJECT LEAVE: Boss or Admin rejects the leave
# ==============================================================================
@router.put("/{leave_id}/reject")
@router.post("/{leave_id}/reject")
async def reject_leave(
    leave_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Rejects the leave:
    1. Marks the leave as 'Rejected'.
    2. Saves the reason why the leave was rejected so the employee can read it.
    3. Does NOT deduct any days from the employee's leave balance.
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
        # Mark leave application as rejected
        result = leave_service.admin_action_leave(db, leave_id, "Rejected", admin_name=admin_name, comment=comment)
        if not result:
            raise HTTPException(status_code=404, detail="Leave request not found")
        return {"status": "success", "message": "Request rejected successfully.", "data": result, **result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# 📊 ENDPOINT: Employee Leave Statistics & Quotas
# ==============================================================================
@router.get("/stats/{emp_code}")
def get_user_leave_stats(
    emp_code: str, 
    db: Session = Depends(get_db)
):
    """Returns available leave balances, used days, and pending request counts."""
    return leave_service.get_leave_stats(db, emp_code)


# ==============================================================================
# 🏢 ENDPOINT: Master Company-Wide Leaves List (Admin View)
# ==============================================================================
@router.get("/admin/all")
def get_all_leaves_admin_endpoint(db: Session = Depends(get_db)):
    """Fetches all employee leave applications across the organization for HR review."""
    return leave_service.get_all_leaves_admin(db)
