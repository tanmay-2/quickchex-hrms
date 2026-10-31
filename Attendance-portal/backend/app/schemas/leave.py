# ==============================================================================
# QUICKCHEX HRMS BACKEND - LEAVE.PY
# Path: Attendance-portal/backend/app/schemas/leave.py
# Purpose: Pydantic data validation and serialization schema definitions for 'leave'.
# Classes / Data Models:
#   • LeaveCreate
#   • LeaveResponse
# ==============================================================================

from pydantic import BaseModel
from datetime import date
from typing import Optional
 
class LeaveCreate(BaseModel):
    emp_code: str  
    category: str
    start_date: date
    end_date: date
    total_days: float  # ✅ MUST be float to accept 0.5
    reason: str
    has_half_days: bool = False  # ✅ Added to match frontend payload
    half_day_details: Optional[str] = None  # ✅ Added as string (comma-separated dates)
 
class LeaveResponse(BaseModel):
    id: int
    emp_code: str
    category: str
    start_date: date
    end_date: date
    total_days: float  # ✅ Ensure response sends back the float
    status: str
    reason: str
    has_half_days: bool
    half_day_details: Optional[str]
 
    class Config:
        from_attributes = True # In Pydantic v2, use this instead of orm_mode
 