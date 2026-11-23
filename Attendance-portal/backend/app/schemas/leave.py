# ==============================================================================
# QUICKCHEX HRMS BACKEND - LEAVE.PY
# Path: Attendance-portal/backend/app/schemas/leave.py
# Purpose: Pydantic data validation and serialization schema definitions for 'leave'.
# Classes / Data Models:
#   • LeaveCreate
#   • LeaveResponse
# ==============================================================================

# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import date from datetime for module operations
from datetime import date
# Import Optional from typing for module operations
from typing import Optional
 
# Define class LeaveCreate inheriting from BaseModel
class LeaveCreate(BaseModel):
    # Define emp_code schema field with type str
    emp_code: str  
    # Define category schema field with type str
    category: str
    # Define start_date schema field with type date
    start_date: date
    # Define end_date schema field with type date
    end_date: date
    total_days: float  # ✅ MUST be float to accept 0.5
    # Define reason schema field with type str
    reason: str
    has_half_days: bool = False  # ✅ Added to match frontend payload
    half_day_details: Optional[str] = None  # ✅ Added as string (comma-separated dates)
 
# Define class LeaveResponse inheriting from BaseModel
class LeaveResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define emp_code schema field with type str
    emp_code: str
    # Define category schema field with type str
    category: str
    # Define start_date schema field with type date
    start_date: date
    # Define end_date schema field with type date
    end_date: date
    total_days: float  # ✅ Ensure response sends back the float
    # Define status schema field with type str
    status: str
    # Define reason schema field with type str
    reason: str
    # Define has_half_days schema field with type bool
    has_half_days: bool
    # Define half_day_details schema field with type Optional[str]
    half_day_details: Optional[str]
 
    # Define class Config to encapsulate data and behavior
    class Config:
        from_attributes = True # In Pydantic v2, use this instead of orm_mode
 