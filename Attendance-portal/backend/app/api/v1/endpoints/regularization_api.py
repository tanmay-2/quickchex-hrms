# ==============================================================================
# QUICKCHEX HRMS BACKEND - REGULARIZATION_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/regularization_api.py
# Purpose: FastAPI route controller handling 'regularization_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.post('/') -> apply_regularization()
#   • router.post('') -> apply_regularization()
#   • router.post('/apply') -> apply_regularization()
#   • router.get('/me') -> my_regularization_requests()
#   • router.get('/all') -> all_requests()
#   • router.get('/admin/all') -> all_requests_admin()
#   • router.put('/{req_id}/approve') -> approve_regularization_endpoint()
#   • router.post('/{req_id}/approve') -> approve_regularization_endpoint()
#   • ... and 4 more endpoints
# ==============================================================================

# Import APIRouter, Depends, HTTPException, Request, Query from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, Request, Query
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text from sqlalchemy for module operations
from sqlalchemy import text
# Import List, Optional from typing for module operations
from typing import List, Optional
# Import module datetime for system functionality
import datetime

# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user
# Import regularization_service from app.services for module operations
from app.services import regularization_service

# Set router variable to store router value
router = APIRouter(prefix="/regularization", tags=["Regularization"])

# Define HTTP POST route endpoint handler
@router.post("/")
# Define HTTP POST route endpoint handler
@router.post("")
# Define HTTP POST route endpoint handler
@router.post("/apply")
# Define apply_regularization function to handle apply regularization
async def apply_regularization(
    # Define request schema field with type Request,
    request: Request,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Level 1: Employee submits regularization request in PENDING_MANAGER status.
    """
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    # Begin guarded execution block to trap exceptions
    try:
        # Set body variable to store body value
        body = await request.json()
    # Catch and handle specific exception if raised
    except Exception:
        # Set body variable to store body value
        body = {}

    # Set emp_code variable to store emp code value
    emp_code = _resolve_emp_code(request, db, body) or body.get("emp_code")
    # Check if target condition is false or object is missing
    if not emp_code:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=401, detail="Employee identity is required to submit a regularization request.")
    # Set raw_date variable to store raw date value
    raw_date = body.get("target_date") or body.get("date") or body.get("attendanceDate")
    # Import safe_parse_date, safe_parse_datetime from app.services.attendance_service for module operations
    from app.services.attendance_service import safe_parse_date, safe_parse_datetime
    # Set target_d variable to store target d value
    target_d = safe_parse_date(raw_date) or datetime.date.today()

    # Set raw_in variable to store raw in value
    raw_in = body.get("requested_check_in") or body.get("requestedCheckIn") or body.get("issued_for_in_time") or body.get("in_time") or body.get("inTime") or body.get("checkIn")
    # Set raw_out variable to store raw out value
    raw_out = body.get("requested_check_out") or body.get("requestedCheckOut") or body.get("issued_for_out_time") or body.get("out_time") or body.get("outTime") or body.get("checkOut")

    # Combine time with target_date if string is HH:MM or datetime
    def parse_time_with_date(val, t_date):
        # Check if target condition is false or object is missing
        if not val or val in ("—", "-"):
            # Return computed result or response payload to caller
            return None
        # Set parsed_dt variable to store parsed dt value
        parsed_dt = safe_parse_datetime(val)
        # Evaluate condition to control execution branch
        if parsed_dt:
            # Return computed result or response payload to caller
            return datetime.datetime.combine(t_date, parsed_dt.time())
        # Set val_str variable to store val str value
        val_str = str(val).strip()
        # Iterate through items in sequence loop
        for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M:%S", "%H:%M"):
            # Begin guarded execution block to trap exceptions
            try:
                # Set t_obj variable to store t obj value
                t_obj = datetime.datetime.strptime(val_str, fmt).time()
                # Return computed result or response payload to caller
                return datetime.datetime.combine(t_date, t_obj)
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass
        # Return computed result or response payload to caller
        return None

    # Set in_time variable to store in time value
    in_time = parse_time_with_date(raw_in, target_d)
    # Set out_time variable to store out time value
    out_time = parse_time_with_date(raw_out, target_d)
    # Set comment variable to store comment value
    comment = str(body.get("comment") or body.get("reason") or body.get("issue") or "").strip()

    # Begin guarded execution block to trap exceptions
    try:
        # Set res variable to store res value
        res = regularization_service.submit_regularization(
            # Set db variable to store db value
            db=db,
            # Set emp_code variable to store emp code value
            emp_code=emp_code,
            # Set target_date variable to store target date value
            target_date=target_d,
            # Set in_time variable to store in time value
            in_time=in_time,
            # Set out_time variable to store out time value
            out_time=out_time,
            # Set comment variable to store comment value
            comment=comment
        # Execute statement to process data and maintain state
        )
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": "Regularization request submitted successfully. Awaiting manager approval.",
            # Execute statement to process data and maintain state
            "data": res,
            # Execute statement to process data and maintain state
            **res
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# Define HTTP GET route endpoint handler
@router.get("/me")
# Define my_regularization_requests function to handle my regularization requests
def my_regularization_requests(
    # Define request schema field with type Request,
    request: Request,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Fetches all regularization requests submitted by this employee.
    """
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    # Set emp_code variable to store emp code value
    emp_code = _resolve_emp_code(request, db) or "EMP001"
    # Return computed result or response payload to caller
    return regularization_service.get_my_regularizations(db, emp_code)


# Define HTTP GET route endpoint handler
@router.get("/all")
# Define all_requests function to handle all requests
def all_requests(
    # Define request schema field with type Request and default value
    request: Request = None,
    # Define limit schema field with type Optional[int] and default value
    limit: Optional[int] = Query(None, ge=1, le=500),
    # Define offset schema field with type Optional[int] and default value
    offset: Optional[int] = Query(0, ge=0),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Fetches regularization requests for team leader or manager.
    """
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    # Set emp_code variable to store emp code value
    emp_code = _resolve_emp_code(request, db) if request else None

    # Evaluate condition to control execution branch
    if emp_code:
        # Set team_regs variable to store team regs value
        team_regs = regularization_service.get_all_regularizations_admin(db, supervisor_code=emp_code, limit=limit, offset=offset)
        # Evaluate condition to control execution branch
        if team_regs:
            # Return computed result or response payload to caller
            return team_regs
    # Return computed result or response payload to caller
    return regularization_service.get_all_regularizations_admin(db, limit=limit, offset=offset)


# Define HTTP GET route endpoint handler
@router.get("/admin/all")
# Define all_requests_admin function to handle all requests admin
def all_requests_admin(
    # Define limit schema field with type Optional[int] and default value
    limit: Optional[int] = Query(None, ge=1, le=500),
    # Define offset schema field with type Optional[int] and default value
    offset: Optional[int] = Query(0, ge=0),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Admin endpoint: fetches all regularization requests across all employees.
    """
    return regularization_service.get_all_regularizations_admin(db, limit=limit, offset=offset)


# Define _resolve_admin_user function to handle  resolve admin user
def _resolve_admin_user(request: Request, db: Session) -> str:
    # Import Profile from app.models.profile_model for module operations
    from app.models.profile_model import Profile
    # Set auth_h variable to store auth h value
    auth_h = request.headers.get("authorization", "")
    # Set admin_name variable to store admin name value
    admin_name = "Admin Approver"
    # Evaluate condition to control execution branch
    if auth_h.startswith("Bearer "):
        # Set token variable to store token value
        token = auth_h.split(" ")[1]
        # Begin guarded execution block to trap exceptions
        try:
            # Import jwt from jose for module operations
            from jose import jwt
            # Import SECRET_KEY, ALGORITHM from app.core.dependencies for module operations
            from app.core.dependencies import SECRET_KEY, ALGORITHM
            # Set payload variable to store payload value
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            # Set role variable to store role value
            role = str(payload.get("role") or "").strip().lower()
            # Set emp_c variable to store emp c value
            emp_c = payload.get("emp_code")
            # Evaluate condition to control execution branch
            if emp_c:
                # Initiate database query on specified model
                user_prof = db.query(Profile).filter(Profile.emp_code == emp_c).first()
                # Evaluate condition to control execution branch
                if user_prof:
                    # Set role variable to store role value
                    role = (user_prof.role or role).strip().lower()
                    # Set admin_name variable to store admin name value
                    admin_name = f"{user_prof.first_name or ''} {user_prof.last_name or ''}".strip() or emp_c
            # Check if target condition is false or object is missing
            if role and role not in ["admin", "superadmin", "hr", "administrator"]:
                # Raise HTTP exception with status code and error details
                raise HTTPException(status_code=403, detail="Forbidden: Admin role required to perform this action.")
            # Evaluate condition to control execution branch
            if admin_name == "Admin Approver":
                # Set admin_name variable to store admin name value
                admin_name = payload.get("sub") or "Admin Approver"
        # Catch and handle specific exception if raised
        except HTTPException:
            # Raise exception to abort current operation with error
            raise
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return admin_name


# Define HTTP PUT route endpoint handler
@router.put("/{req_id}/approve")
# Define HTTP POST route endpoint handler
@router.post("/{req_id}/approve")
# Define approve_regularization_endpoint function to handle approve regularization endpoint
async def approve_regularization_endpoint(
    # Define req_id schema field with type int,
    req_id: int,
    # Define request schema field with type Request,
    request: Request,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Level 2 Final Review (Admin):
    Approves request (admin_status=APPROVED, overall_status=APPROVED)
    and synchronizes attendance + recalculates hours.
    """
    comment = "Approved by Admin"
    # Begin guarded execution block to trap exceptions
    try:
        # Set body variable to store body value
        body = await request.json()
        # Set comment variable to store comment value
        comment = body.get("comment") or body.get("remarks") or comment
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Set admin_name variable to store admin name value
    admin_name = _resolve_admin_user(request, db)

    # Begin guarded execution block to trap exceptions
    try:
        # Set result variable to store result value
        result = regularization_service.admin_action_request(
            # Execute statement to process data and maintain state
            db, req_id, "Approved", comment=comment, admin_name=admin_name
        # Execute statement to process data and maintain state
        )
        # Check if target condition is false or object is missing
        if not result:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Regularization request not found")
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": "Regularization request approved and attendance synchronized.",
            # Execute statement to process data and maintain state
            "data": result,
            # Execute statement to process data and maintain state
            **result
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# Define HTTP PUT route endpoint handler
@router.put("/{req_id}/reject")
# Define HTTP POST route endpoint handler
@router.post("/{req_id}/reject")
# Define reject_regularization_endpoint function to handle reject regularization endpoint
async def reject_regularization_endpoint(
    # Define req_id schema field with type int,
    req_id: int,
    # Define request schema field with type Request,
    request: Request,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Admin Rejection:
    Rejects regularization (admin_status=REJECTED, overall_status=REJECTED)
    with required reason. Does not update attendance.
    """
    body = {}
    # Begin guarded execution block to trap exceptions
    try:
        # Set body variable to store body value
        body = await request.json()
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Set rejection_reason variable to store rejection reason value
    rejection_reason = str(body.get("rejection_reason") or body.get("reason") or body.get("comment") or body.get("remarks") or "").strip()
    # Check if target condition is false or object is missing
    if not rejection_reason:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Reason for rejection is required.")

    # Set admin_name variable to store admin name value
    admin_name = _resolve_admin_user(request, db)

    # Begin guarded execution block to trap exceptions
    try:
        # Set result variable to store result value
        result = regularization_service.admin_action_request(
            # Execute statement to process data and maintain state
            db, req_id, "Rejected", comment=rejection_reason, admin_name=admin_name
        # Execute statement to process data and maintain state
        )
        # Check if target condition is false or object is missing
        if not result:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Regularization request not found")
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": "Request rejected successfully.",
            # Execute statement to process data and maintain state
            "data": result,
            # Execute statement to process data and maintain state
            **result
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# Define HTTP PUT route endpoint handler
@router.put("/{req_id}/status")
# Define change_request_status function to handle change request status
async def change_request_status(req_id: int, request: Request, db: Session = Depends(get_db)):
    # Set body variable to store body value
    body = {}
    # Begin guarded execution block to trap exceptions
    try:
        # Set body variable to store body value
        body = await request.json()
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass
    # Set new_status variable to store new status value
    new_status = body.get("status") or "Approved"
    # Set comment variable to store comment value
    comment = body.get("comment") or body.get("remarks") or body.get("reason") or ""
    # Begin guarded execution block to trap exceptions
    try:
        # Set result variable to store result value
        result = regularization_service.update_request_status(db, req_id, new_status, comment=comment)
        # Check if target condition is false or object is missing
        if not result:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Request not found.")
        # Return computed result or response payload to caller
        return {"status": "success", "data": result, **result}
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))


# Define HTTP DELETE route endpoint handler
@router.delete("/{req_id}")
# Define delete_regularization_request function to handle delete regularization request
def delete_regularization_request(req_id: int, db: Session = Depends(get_db)):
    # Begin guarded execution block to trap exceptions
    try:
        # Invoke db.execute to perform operational action
        db.execute(text("DELETE FROM regularizations WHERE id = :id"), {"id": req_id})
        # Import get_all_reg_tables from app.services.regularization_service for module operations
        from app.services.regularization_service import get_all_reg_tables
        # Iterate through items in sequence loop
        for t in get_all_reg_tables(db):
            # Begin guarded execution block to trap exceptions
            try:
                # Invoke db.execute to perform operational action
                db.execute(text(f"DELETE FROM {t} WHERE id = :id"), {"id": req_id})
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass
        # Commit transaction to persist changes in database
        db.commit()
        # Return computed result or response payload to caller
        return {"message": "Deleted successfully", "id": req_id}
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))
