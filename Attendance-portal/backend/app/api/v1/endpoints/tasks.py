# ==============================================================================
# QUICKCHEX HRMS BACKEND - TASKS.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/tasks.py
# Purpose: FastAPI route controller handling 'tasks' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.post('/', response_model=TaskResponse) -> create_task()
#   • router.get('/by-sheet/{sheet_id}', response_model=list[TaskResponse]) -> read_tasks_by_sheet()
#   • router.get('/monthly/{sheet_id}') -> get_monthly()
#   • router.get('/export/{sheet_id}') -> export_tasks()
# ==============================================================================

# Import APIRouter, Depends, HTTPException from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import StreamingResponse from fastapi.responses for module operations
from fastapi.responses import StreamingResponse
 
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import TaskCreate, TaskResponse from app.schemas.task for module operations
from app.schemas.task import TaskCreate, TaskResponse
# Import  from app.services.task_service for module operations
from app.services.task_service import (
    # Execute statement to process data and maintain state
    create_or_update_task,
    # Execute statement to process data and maintain state
    get_tasks_by_sheet,
    # Execute statement to process data and maintain state
    get_monthly_tasks,
    # Execute statement to process data and maintain state
    export_monthly_tasks
# Execute statement to process data and maintain state
)
# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user
 
# Set router variable to store router value
router = APIRouter()
 
 
# ==========================================
# ✅ EMPLOYEE → CREATE / UPDATE TASK
# ==========================================
@router.post("/", response_model=TaskResponse)
# Define create_task function to handle create task
def create_task(
    # Define task schema field with type TaskCreate,
    task: TaskCreate,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    user = Depends(get_current_user)   # ✅ FIX
# Execute statement to process data and maintain state
):
    return create_or_update_task(db, task, user)   # ✅ PASS USER
 
 
# ==========================================
# ✅ TL / ADMIN → VIEW TASKS BY SHEET
# ==========================================
@router.get("/by-sheet/{sheet_id}", response_model=list[TaskResponse])
# Define read_tasks_by_sheet function to handle read tasks by sheet
def read_tasks_by_sheet(
    # Define sheet_id schema field with type int,
    sheet_id: int,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Check if target condition is false or object is missing
    if user.role.lower() not in ["team lead", "admin"]:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=403, detail="Access denied")
 
    # Return computed result or response payload to caller
    return get_tasks_by_sheet(db, sheet_id)
 
 
# ==========================================
# ✅ TL / ADMIN → MONTHLY VIEW
# ==========================================
@router.get("/monthly/{sheet_id}")
# Define get_monthly function to handle get monthly
def get_monthly(
    # Define sheet_id schema field with type int,
    sheet_id: int,
    # Define month schema field with type str,
    month: str,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Check if target condition is false or object is missing
    if user.role.lower() not in ["team lead", "admin"]:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=403, detail="Access denied")
 
    # Return computed result or response payload to caller
    return get_monthly_tasks(db, user, sheet_id, month)
 
 
# ==========================================
# 🔒 TL / ADMIN → EXPORT EXCEL
# ==========================================
@router.get("/export/{sheet_id}")
# Define export_tasks function to handle export tasks
def export_tasks(
    # Define sheet_id schema field with type int,
    sheet_id: int,
    # Define month schema field with type str,
    month: str,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set user variable to store user value
    user = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # 🔒 ONLY TL ALLOWED
    if user.role.lower() != "team lead":
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=403, detail="Only TL can download")
 
    # Set data variable to store data value
    data = get_monthly_tasks(db, user, sheet_id, month)
 
    # Set file_stream variable to store file stream value
    file_stream = export_monthly_tasks(data)
 
    # Return computed result or response payload to caller
    return StreamingResponse(
        # Execute statement to process data and maintain state
        file_stream,
        # Set media_type variable to store media type value
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        # Set headers variable to store headers value
        headers={
            # Execute statement to process data and maintain state
            "Content-Disposition": "attachment; filename=monthly_tasks.xlsx"
        # Execute statement to process data and maintain state
        }
    # Execute statement to process data and maintain state
    )
 