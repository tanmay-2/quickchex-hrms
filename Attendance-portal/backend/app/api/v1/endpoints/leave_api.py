# ==============================================================================
# QUICKCHEX HRMS BACKEND - LEAVE MANAGEMENT CONTROLLER (leave_api.py)
# Path: Attendance-portal/backend/app/api/v1/endpoints/leave_api.py
# Purpose: FastAPI route controller handling leave requests, balance tracking,
# multi-level managerial and administrative approvals, and rejection audits.
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import leave_service
from typing import List, Optional

router = APIRouter(tags=["Leaves"])


# ==============================================================================
# 📝 ENDPOINT: Submit a New Leave Application
# ==============================================================================
@router.post("/apply")
async def apply_for_leave(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Submits a new employee leave application:
    1. Extracts employee identity from token or headers.
    2. Parses start date, end date, leave category, and half-day flags.
    3. Persists record atomically in both static 'leave_requests' and monthly tables.
    4. Sets initial workflow status to 'PENDING_MANAGER'.
    """
    try:
        from app.api.v1.endpoints.attendance_api import _resolve_emp_code
        try:
            data = await request.json()
        except Exception:
            data = {}
            
        # Resolve requesting employee code from JWT token or request headers
        emp_code = _resolve_emp_code(request, db, data) or data.get("emp_code")
        if not emp_code:
            raise HTTPException(status_code=401, detail="Employee identity is required to submit a leave request.")
            
        # Call leave service to execute database write and calculate consumed quotas
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
# 📋 ENDPOINT: Fetch Personal Leave History
# ==============================================================================
@router.get("/history/{emp_code}")
def get_leave_history(
    emp_code: str,
    db: Session = Depends(get_db)
):
    """
    Returns historical leave requests submitted by an employee,
    including approval timestamps, manager remarks, and overall status.
    """
    return leave_service.get_leave_requests(db, emp_code)


# ==============================================================================
# 👥 ENDPOINT: Team Leader / Manager Leave Inbox
# ==============================================================================
@router.get("/team/{tl_emp_code}")
def get_team_leave_requests(
    tl_emp_code: str, 
    db: Session = Depends(get_db)
):
    """
    Returns leave applications submitted by subordinates who report directly
    to this Team Leader or Manager for initial managerial review.
    """
    return leave_service.get_team_leaves(db, tl_emp_code)


# ==============================================================================
# ✅ ENDPOINT: Admin Final Leave Approval
# ==============================================================================
@router.put("/{leave_id}/approve")
@router.post("/{leave_id}/approve")
async def approve_leave(
    leave_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Executes final administrative approval for a leave application:
    1. Sets admin_status='APPROVED' and overall_status='APPROVED'.
    2. Automatically deducts the approved days from the employee's LeaveBalance.
    3. Synchronizes approval state across dynamic monthly tables.
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
# ❌ ENDPOINT: Admin Leave Rejection
# ==============================================================================
@router.put("/{leave_id}/reject")
@router.post("/{leave_id}/reject")
async def reject_leave(
    leave_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Rejects a leave application:
    1. Sets admin_status='REJECTED' and overall_status='REJECTED'.
    2. Stores the official rejection reason / comment provided by the administrator.
    3. Leaves employee's leave balance intact (no days deducted).
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
