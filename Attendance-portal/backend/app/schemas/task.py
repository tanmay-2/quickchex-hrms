# ==============================================================================
# QUICKCHEX HRMS BACKEND - TASK.PY
# Path: Attendance-portal/backend/app/schemas/task.py
# Purpose: Pydantic data validation and serialization schema definitions for 'task'.
# Classes / Data Models:
#   • TaskCreate
#   • TaskResponse
#   • TaskUpdate
# ==============================================================================

# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import Optional from typing for module operations
from typing import Optional
# Import date from datetime for module operations
from datetime import date
 
 
# ✅ CREATE (Employee)
class TaskCreate(BaseModel):
    # Define monthly_sheet_id schema field with type int
    monthly_sheet_id: int
    # Define task_date schema field with type date
    task_date: date
    # Define task_title schema field with type str
    task_title: str
    # Define description schema field with type Optional[str] and default value
    description: Optional[str] = None
 
 
# ✅ RESPONSE (TL / Admin / Employee)
class TaskResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define task_date schema field with type date
    task_date: date
    # Define task_title schema field with type str
    task_title: str
    # Define description schema field with type Optional[str]
    description: Optional[str]
 
    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True
 
 
# ✅ UPDATE (same-day only)
class TaskUpdate(BaseModel):
    # Define task_title schema field with type Optional[str] and default value
    task_title: Optional[str] = None
    # Define description schema field with type Optional[str] and default value
    description: Optional[str] = None
 