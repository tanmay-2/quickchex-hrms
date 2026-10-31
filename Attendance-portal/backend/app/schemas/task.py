# ==============================================================================
# QUICKCHEX HRMS BACKEND - TASK.PY
# Path: Attendance-portal/backend/app/schemas/task.py
# Purpose: Pydantic data validation and serialization schema definitions for 'task'.
# Classes / Data Models:
#   • TaskCreate
#   • TaskResponse
#   • TaskUpdate
# ==============================================================================

from pydantic import BaseModel
from typing import Optional
from datetime import date
 
 
# ✅ CREATE (Employee)
class TaskCreate(BaseModel):
    monthly_sheet_id: int
    task_date: date
    task_title: str
    description: Optional[str] = None
 
 
# ✅ RESPONSE (TL / Admin / Employee)
class TaskResponse(BaseModel):
    id: int
    task_date: date
    task_title: str
    description: Optional[str]
 
    class Config:
        from_attributes = True
 
 
# ✅ UPDATE (same-day only)
class TaskUpdate(BaseModel):
    task_title: Optional[str] = None
    description: Optional[str] = None
 