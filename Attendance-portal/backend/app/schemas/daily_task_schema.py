# ==============================================================================
# QUICKCHEX HRMS BACKEND - DAILY_TASK_SCHEMA.PY
# Path: Attendance-portal/backend/app/schemas/daily_task_schema.py
# Purpose: Pydantic data validation and serialization schema definitions for 'daily_task_schema'.
# Classes / Data Models:
#   • MonthlySheetCreate
#   • MonthlySheetResponse
#   • DailyTaskCreate
#   • DailyTaskResponse
# ==============================================================================

# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import date from datetime for module operations
from datetime import date
# Import Optional from typing for module operations
from typing import Optional

# --- MONTHLY SHEET SCHEMAS ---
class MonthlySheetCreate(BaseModel):
    emp_code: str  # 🔥 Strictly string
    # Define month schema field with type int
    month: int
    # Define year schema field with type int
    year: int

# Define class MonthlySheetResponse inheriting from BaseModel
class MonthlySheetResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define emp_code schema field with type str
    emp_code: str
    # Define month schema field with type int
    month: int
    # Define year schema field with type int
    year: int
    # Define total_working_days schema field with type int
    total_working_days: int
    # Define status schema field with type str
    status: str

    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True

# --- DAILY TASK SCHEMAS ---
class DailyTaskCreate(BaseModel):
    # Define monthly_sheet_id schema field with type int
    monthly_sheet_id: int
    # Define task_date schema field with type date
    task_date: date
    # Define task_title schema field with type str
    task_title: str
    # Define description schema field with type Optional[str] and default value
    description: Optional[str] = None
    # Define status schema field with type str and default value
    status: str = "COMPLETED"

# Define class DailyTaskResponse inheriting from BaseModel
class DailyTaskResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define monthly_sheet_id schema field with type int
    monthly_sheet_id: int
    # Define task_date schema field with type date
    task_date: date
    # Define task_title schema field with type str
    task_title: str
    # Define description schema field with type Optional[str]
    description: Optional[str]
    # Define status schema field with type str
    status: str
    # Define designation schema field with type Optional[str] and default value
    designation: Optional[str] = None

    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True