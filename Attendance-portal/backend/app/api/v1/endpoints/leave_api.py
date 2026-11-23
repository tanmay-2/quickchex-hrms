# ==============================================================================
# LEAVE REQUESTS AND APPROVALS (leave_api.py)
# ==============================================================================
# This file lets employees ask for time off (leave) and lets managers and admins
# approve or reject those leave requests.
# ==============================================================================

# Import APIRouter, Depends, HTTPException, status, Request from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, status, Request
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import leave_service from app.services for module operations
from app.services import leave_service
# Import List, Optional from typing for module operations
from typing import List, Optional

# Set router variable to store router value
router = APIRouter(tags=["Leaves"])


# ==============================================================================
# 📝 ASK FOR LEAVE: Employee submits a new leave request
# ==============================================================================
@router.post("/apply")
# Define apply_for_leave function to handle apply for leave
async def apply_for_leave(
    # Define request schema field with type Request,
    request: Request,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    How asking for leave works step by step:
    1. Finds out which employee is asking for leave.
    2. Reads the dates, reason, and type of leave (Casual, Sick, etc.).
    3. Saves the request into the database so their boss can see it.
    4. Marks the status as 'Pending Manager Approval'.
    """
    try:
        # Import _resolve_emp_code from app.api.v1.endpoints.attendance_api for module operations
        from app.api.v1.endpoints.attendance_api import _resolve_emp_code
        # Begin guarded execution block to trap exceptions
        try:
            # Set data variable to store data value
            data = await request.json()
        # Catch and handle specific exception if raised
        except Exception:
            # Set data variable to store data value
            data = {}
            
        # Step 1: Find out who is asking for leave
        emp_code = _resolve_emp_code(request, db, data) or data.get("emp_code")
        # Check if target condition is false or object is missing
        if not emp_code:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=401, detail="Please log in first to apply for leave.")
            
        # Step 2: Save the leave request to the database
        res = leave_service.create_leave_request(db, data, emp_code)
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": "Leave application submitted successfully. Awaiting manager approval.",
            # Execute statement to process data and maintain state
            "data": res,
            # Execute statement to process data and maintain state
            **res
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except HTTPException:
        # Raise exception to abort current operation with error
        raise
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# 📋 PAST LEAVES: See all past leaves for this employee
# ==============================================================================
@router.get("/history/{emp_code}")
# Define get_leave_history function to handle get leave history
def get_leave_history(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
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
# Define get_team_leave_requests function to handle get team leave requests
def get_team_leave_requests(
    # Define tl_emp_code schema field with type str,
    tl_emp_code: str, 
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
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
# Define HTTP POST route endpoint handler
@router.post("/{leave_id}/approve")
# Define approve_leave function to handle approve leave
async def approve_leave(
    # Define leave_id schema field with type int,
    leave_id: int,
    # Define request schema field with type Request,
    request: Request,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Approves the leave:
    1. Marks the leave as 'Approved'.
    2. Takes the approved days out of the employee's remaining leave balance.
    3. Updates the attendance table so those days are marked as 'Leave'.
    """
    comment = ""
    # Begin guarded execution block to trap exceptions
    try:
        # Set body variable to store body value
        body = await request.json()
        # Set comment variable to store comment value
        comment = body.get("comment") or body.get("remarks") or ""
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Resolve admin identifier from JWT token
    admin_name = "Admin Approver"
    # Set auth_h variable to store auth h value
    auth_h = request.headers.get("authorization", "")
    # Evaluate condition to control execution branch
    if auth_h.startswith("Bearer "):
        # Begin guarded execution block to trap exceptions
        try:
            # Import jwt from jose for module operations
            from jose import jwt
            # Import SECRET_KEY, ALGORITHM from app.core.dependencies for module operations
            from app.core.dependencies import SECRET_KEY, ALGORITHM
            # Set payload variable to store payload value
            payload = jwt.decode(auth_h.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
            # Set admin_name variable to store admin name value
            admin_name = payload.get("sub") or admin_name
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Begin guarded execution block to trap exceptions
    try:
        # Perform atomic approval and balance debit
        result = leave_service.admin_action_leave(db, leave_id, "Approved", admin_name=admin_name, comment=comment)
        # Check if target condition is false or object is missing
        if not result:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Leave request not found")
        # Return computed result or response payload to caller
        return {"status": "success", "message": "Leave application approved successfully.", "data": result, **result}
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# ❌ REJECT LEAVE: Boss or Admin rejects the leave
# ==============================================================================
@router.put("/{leave_id}/reject")
# Define HTTP POST route endpoint handler
@router.post("/{leave_id}/reject")
# Define reject_leave function to handle reject leave
async def reject_leave(
    # Define leave_id schema field with type int,
    leave_id: int,
    # Define request schema field with type Request,
    request: Request,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Rejects the leave:
    1. Marks the leave as 'Rejected'.
    2. Saves the reason why the leave was rejected so the employee can read it.
    3. Does NOT deduct any days from the employee's leave balance.
    """
    comment = ""
    # Begin guarded execution block to trap exceptions
    try:
        # Set body variable to store body value
        body = await request.json()
        # Set comment variable to store comment value
        comment = body.get("comment") or body.get("reason") or body.get("remarks") or ""
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Set admin_name variable to store admin name value
    admin_name = "Admin Approver"
    # Set auth_h variable to store auth h value
    auth_h = request.headers.get("authorization", "")
    # Evaluate condition to control execution branch
    if auth_h.startswith("Bearer "):
        # Begin guarded execution block to trap exceptions
        try:
            # Import jwt from jose for module operations
            from jose import jwt
            # Import SECRET_KEY, ALGORITHM from app.core.dependencies for module operations
            from app.core.dependencies import SECRET_KEY, ALGORITHM
            # Set payload variable to store payload value
            payload = jwt.decode(auth_h.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
            # Set admin_name variable to store admin name value
            admin_name = payload.get("sub") or admin_name
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Begin guarded execution block to trap exceptions
    try:
        # Mark leave application as rejected
        result = leave_service.admin_action_leave(db, leave_id, "Rejected", admin_name=admin_name, comment=comment)
        # Check if target condition is false or object is missing
        if not result:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Leave request not found")
        # Return computed result or response payload to caller
        return {"status": "success", "message": "Request rejected successfully.", "data": result, **result}
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# 📊 ENDPOINT: Employee Leave Statistics & Quotas
# ==============================================================================
@router.get("/stats/{emp_code}")
# Define get_user_leave_stats function to handle get user leave stats
def get_user_leave_stats(
    # Define emp_code schema field with type str,
    emp_code: str, 
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Returns available leave balances, used days, and pending request counts."""
    return leave_service.get_leave_stats(db, emp_code)


# ==============================================================================
# 🏢 ENDPOINT: Master Company-Wide Leaves List (Admin View)
# ==============================================================================
@router.get("/admin/all")
# Define get_all_leaves_admin_endpoint function to handle get all leaves admin endpoint
def get_all_leaves_admin_endpoint(db: Session = Depends(get_db)):
    """Fetches all employee leave applications across the organization for HR review."""
    return leave_service.get_all_leaves_admin(db)
