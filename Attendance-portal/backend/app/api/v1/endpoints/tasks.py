from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
 
from app.db.session import get_db
from app.schemas.task import TaskCreate, TaskResponse
from app.services.task_service import (
    create_or_update_task,
    get_tasks_by_sheet,
    get_monthly_tasks,
    export_monthly_tasks
)
from app.core.dependencies import get_current_user
 
router = APIRouter()
 
 
# ==========================================
# ✅ EMPLOYEE → CREATE / UPDATE TASK
# ==========================================
@router.post("/", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)   # ✅ FIX
):
    return create_or_update_task(db, task, user)   # ✅ PASS USER
 
 
# ==========================================
# ✅ TL / ADMIN → VIEW TASKS BY SHEET
# ==========================================
@router.get("/by-sheet/{sheet_id}", response_model=list[TaskResponse])
def read_tasks_by_sheet(
    sheet_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    if user.role.lower() not in ["team lead", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
 
    return get_tasks_by_sheet(db, sheet_id)
 
 
# ==========================================
# ✅ TL / ADMIN → MONTHLY VIEW
# ==========================================
@router.get("/monthly/{sheet_id}")
def get_monthly(
    sheet_id: int,
    month: str,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    if user.role.lower() not in ["team lead", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
 
    return get_monthly_tasks(db, user, sheet_id, month)
 
 
# ==========================================
# 🔒 TL / ADMIN → EXPORT EXCEL
# ==========================================
@router.get("/export/{sheet_id}")
def export_tasks(
    sheet_id: int,
    month: str,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    # 🔒 ONLY TL ALLOWED
    if user.role.lower() != "team lead":
        raise HTTPException(status_code=403, detail="Only TL can download")
 
    data = get_monthly_tasks(db, user, sheet_id, month)
 
    file_stream = export_monthly_tasks(data)
 
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=monthly_tasks.xlsx"
        }
    )
 