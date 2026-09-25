from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import datetime
 
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.schemas.regularization import RegularizationCreate, RegularizationResponse, RegularizationStatusUpdate
 
router = APIRouter(prefix="/api/v1/regularization", tags=["Regularization"])
 
def get_monthly_reg_table_name(date_obj: datetime.date):
    """Generates the dynamic table name based on the current year and month."""
    return f"regularization_{date_obj.year}_{date_obj.month:02d}"
 
@router.post("/", response_model=RegularizationResponse)
def apply_regularization(
    data: RegularizationCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.date.today()
    table_name = get_monthly_reg_table_name(now)
   
    query = text(f"""
        INSERT INTO {table_name}
        (emp_code, request_date, target_date, issued_for_in_time, issued_for_out_time, comment, status)
        VALUES
        (:emp_code, :request_date, :target_date, :in_time, :out_time, :comment, 'Pending')
        RETURNING *;
    """)
   
    try:
        res = db.execute(query, {
            "emp_code": current_user.emp_code,
            "request_date": now,
            "target_date": data.target_date,
            "in_time": data.issued_for_in_time,
            "out_time": data.issued_for_out_time,
            "comment": data.comment
        })
        db.commit()
        # Return the newly created row as a dictionary
        return dict(res.mappings().first())
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
 
 
@router.get("/me", response_model=List[RegularizationResponse])
def my_regularization_requests(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.date.today()
    table_name = get_monthly_reg_table_name(now)
   
    columns = "id, emp_code, request_date, target_date, issued_for_in_time, issued_for_out_time, comment, status"
   
    query = text(f"""
        SELECT {columns}
        FROM {table_name}
        WHERE emp_code = :code
        ORDER BY request_date DESC, id DESC
    """)
   
    try:
        result = db.execute(query, {"code": current_user.emp_code})
        return result.mappings().all()
    except Exception as e:
        db.rollback()
        # If the table doesn't exist yet for a brand new month, gracefully return an empty list
        print(f"Notice: Query failed on {table_name}. Returning empty list. Error: {e}")
        return []
 
 
from app.services import regularization_service


@router.get("/all")
def all_requests(request: Request = None, db: Session = Depends(get_db)):
    """Fetches regularization requests for team leader or manager."""
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    emp_code = _resolve_emp_code(request, db) if request else None

    # First attempt to filter by supervisor
    team_regs = regularization_service.get_all_regularizations_admin(db, supervisor_code=emp_code) if emp_code else []
    if team_regs:
        return team_regs
    # If no team-specific records or emp_code not set, return all regularizations
    return regularization_service.get_all_regularizations_admin(db)


@router.get("/admin/all")
def all_requests_admin(db: Session = Depends(get_db)):
    """Admin endpoint to fetch all regularization requests across all employees."""
    return regularization_service.get_all_regularizations_admin(db)


@router.put("/{req_id}/approve")
def approve_regularization_endpoint(req_id: int, db: Session = Depends(get_db)):
    result = regularization_service.update_request_status(db, req_id, "Approved")
    if not result:
        raise HTTPException(status_code=404, detail="Regularization request not found")
    return {"status": "success", "message": "Regularization request approved and attendance synchronized", "data": result, **result}


@router.put("/{req_id}/reject")
def reject_regularization_endpoint(req_id: int, db: Session = Depends(get_db)):
    result = regularization_service.update_request_status(db, req_id, "Rejected")
    if not result:
        raise HTTPException(status_code=404, detail="Regularization request not found")
    return {"status": "success", "message": "Regularization request rejected", "data": result, **result}


@router.put("/{req_id}/status")
async def change_request_status(req_id: int, request: Request, db: Session = Depends(get_db)):
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    new_status = body.get("status") or "Approved"
    result = regularization_service.update_request_status(db, req_id, new_status)
    if not result:
        raise HTTPException(status_code=404, detail="Request not found in the current dynamic table.")
    return {"status": "success", "data": result, **result}
    

@router.delete("/{req_id}")
def delete_regularization_request(req_id: int, db: Session = Depends(get_db)):
    now = datetime.date.today()
    table_name = get_monthly_reg_table_name(now)
    
    delete_query = text(f"""
        DELETE FROM {table_name}
        WHERE id = :id
        RETURNING id;
    """)
    
    try:
        res = db.execute(delete_query, {"id": req_id})
        deleted_id = res.scalar()
        
        if not deleted_id:
            raise HTTPException(status_code=404, detail="Request not found in the current dynamic table.")
            
        db.commit()
        return {"message": "Deleted successfully", "id": deleted_id}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))