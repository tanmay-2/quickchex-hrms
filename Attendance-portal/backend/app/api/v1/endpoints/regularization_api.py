from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.services import regularization_service

router = APIRouter(prefix="/regularization", tags=["Regularization"])

@router.post("/")
@router.post("")
@router.post("/apply")
async def apply_regularization(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Level 1: Employee submits regularization request in PENDING_MANAGER status.
    """
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    try:
        body = await request.json()
    except Exception:
        body = {}

    emp_code = _resolve_emp_code(request, db, body) or body.get("emp_code")
    if not emp_code:
        raise HTTPException(status_code=401, detail="Employee identity is required to submit a regularization request.")
    raw_date = body.get("target_date") or body.get("date") or body.get("attendanceDate")
    from app.services.attendance_service import safe_parse_date, safe_parse_datetime
    target_d = safe_parse_date(raw_date) or datetime.date.today()

    raw_in = body.get("requested_check_in") or body.get("requestedCheckIn") or body.get("issued_for_in_time") or body.get("in_time") or body.get("inTime") or body.get("checkIn")
    raw_out = body.get("requested_check_out") or body.get("requestedCheckOut") or body.get("issued_for_out_time") or body.get("out_time") or body.get("outTime") or body.get("checkOut")

    # Combine time with target_date if string is HH:MM or datetime
    def parse_time_with_date(val, t_date):
        if not val or val in ("—", "-"):
            return None
        parsed_dt = safe_parse_datetime(val)
        if parsed_dt:
            return datetime.datetime.combine(t_date, parsed_dt.time())
        val_str = str(val).strip()
        for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M:%S", "%H:%M"):
            try:
                t_obj = datetime.datetime.strptime(val_str, fmt).time()
                return datetime.datetime.combine(t_date, t_obj)
            except Exception:
                pass
        return None

    in_time = parse_time_with_date(raw_in, target_d)
    out_time = parse_time_with_date(raw_out, target_d)
    comment = str(body.get("comment") or body.get("reason") or body.get("issue") or "").strip()

    try:
        res = regularization_service.submit_regularization(
            db=db,
            emp_code=emp_code,
            target_date=target_d,
            in_time=in_time,
            out_time=out_time,
            comment=comment
        )
        return {
            "status": "success",
            "message": "Regularization request submitted successfully. Awaiting manager approval.",
            "data": res,
            **res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me")
def my_regularization_requests(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Fetches all regularization requests submitted by this employee.
    """
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    emp_code = _resolve_emp_code(request, db) or "EMP001"
    return regularization_service.get_my_regularizations(db, emp_code)


@router.get("/all")
def all_requests(
    request: Request = None,
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Fetches regularization requests for team leader or manager.
    """
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    emp_code = _resolve_emp_code(request, db) if request else None

    if emp_code:
        team_regs = regularization_service.get_all_regularizations_admin(db, supervisor_code=emp_code, limit=limit, offset=offset)
        if team_regs:
            return team_regs
    return regularization_service.get_all_regularizations_admin(db, limit=limit, offset=offset)


@router.get("/admin/all")
def all_requests_admin(
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint: fetches all regularization requests across all employees.
    """
    return regularization_service.get_all_regularizations_admin(db, limit=limit, offset=offset)


def _resolve_admin_user(request: Request, db: Session) -> str:
    from app.models.profile_model import Profile
    auth_h = request.headers.get("authorization", "")
    admin_name = "Admin Approver"
    if auth_h.startswith("Bearer "):
        token = auth_h.split(" ")[1]
        try:
            from jose import jwt
            from app.core.dependencies import SECRET_KEY, ALGORITHM
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            role = str(payload.get("role") or "").strip().lower()
            emp_c = payload.get("emp_code")
            if emp_c:
                user_prof = db.query(Profile).filter(Profile.emp_code == emp_c).first()
                if user_prof:
                    role = (user_prof.role or role).strip().lower()
                    admin_name = f"{user_prof.first_name or ''} {user_prof.last_name or ''}".strip() or emp_c
            if role and role not in ["admin", "superadmin", "hr", "administrator"]:
                raise HTTPException(status_code=403, detail="Forbidden: Admin role required to perform this action.")
            if admin_name == "Admin Approver":
                admin_name = payload.get("sub") or "Admin Approver"
        except HTTPException:
            raise
        except Exception:
            pass
    return admin_name


@router.put("/{req_id}/approve")
@router.post("/{req_id}/approve")
async def approve_regularization_endpoint(
    req_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Level 2 Final Review (Admin):
    Approves request (admin_status=APPROVED, overall_status=APPROVED)
    and synchronizes attendance + recalculates hours.
    """
    comment = "Approved by Admin"
    try:
        body = await request.json()
        comment = body.get("comment") or body.get("remarks") or comment
    except Exception:
        pass

    admin_name = _resolve_admin_user(request, db)

    try:
        result = regularization_service.admin_action_request(
            db, req_id, "Approved", comment=comment, admin_name=admin_name
        )
        if not result:
            raise HTTPException(status_code=404, detail="Regularization request not found")
        return {
            "status": "success",
            "message": "Regularization request approved and attendance synchronized.",
            "data": result,
            **result
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{req_id}/reject")
@router.post("/{req_id}/reject")
async def reject_regularization_endpoint(
    req_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Admin Rejection:
    Rejects regularization (admin_status=REJECTED, overall_status=REJECTED)
    with required reason. Does not update attendance.
    """
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    rejection_reason = str(body.get("rejection_reason") or body.get("reason") or body.get("comment") or body.get("remarks") or "").strip()
    if not rejection_reason:
        raise HTTPException(status_code=400, detail="Reason for rejection is required.")

    admin_name = _resolve_admin_user(request, db)

    try:
        result = regularization_service.admin_action_request(
            db, req_id, "Rejected", comment=rejection_reason, admin_name=admin_name
        )
        if not result:
            raise HTTPException(status_code=404, detail="Regularization request not found")
        return {
            "status": "success",
            "message": "Request rejected successfully.",
            "data": result,
            **result
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{req_id}/status")
async def change_request_status(req_id: int, request: Request, db: Session = Depends(get_db)):
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    new_status = body.get("status") or "Approved"
    comment = body.get("comment") or body.get("remarks") or body.get("reason") or ""
    try:
        result = regularization_service.update_request_status(db, req_id, new_status, comment=comment)
        if not result:
            raise HTTPException(status_code=404, detail="Request not found.")
        return {"status": "success", "data": result, **result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.delete("/{req_id}")
def delete_regularization_request(req_id: int, db: Session = Depends(get_db)):
    try:
        db.execute(text("DELETE FROM regularizations WHERE id = :id"), {"id": req_id})
        from app.services.regularization_service import get_all_reg_tables
        for t in get_all_reg_tables(db):
            try:
                db.execute(text(f"DELETE FROM {t} WHERE id = :id"), {"id": req_id})
            except Exception:
                pass
        db.commit()
        return {"message": "Deleted successfully", "id": req_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
