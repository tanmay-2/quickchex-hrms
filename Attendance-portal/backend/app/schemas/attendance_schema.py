# ==============================================================================
# QUICKCHEX HRMS BACKEND - ATTENDANCE_SCHEMA.PY
# Path: Attendance-portal/backend/app/schemas/attendance_schema.py
# Purpose: Pydantic data validation and serialization schema definitions for 'attendance_schema'.
# Classes / Data Models:
#   • AttendanceResponse
# ==============================================================================

# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import Optional from typing for module operations
from typing import Optional
# Import date, datetime from datetime for module operations
from datetime import date, datetime
 
# Define class AttendanceResponse inheriting from BaseModel
class AttendanceResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define emp_code schema field with type str
    emp_code: str
    # Define date schema field with type Optional[datetime] and default value
    date: Optional[datetime] = None
    # Define punch_in_time schema field with type Optional[datetime] and default value
    punch_in_time: Optional[datetime] = None
    # Define punch_out_time schema field with type Optional[datetime] and default value
    punch_out_time: Optional[datetime] = None
    # Define punch_in_location schema field with type Optional[str] and default value
    punch_in_location: Optional[str] = None
    # Define punch_out_location schema field with type Optional[str] and default value
    punch_out_location: Optional[str] = None
    # Define status schema field with type Optional[str] and default value
    status: Optional[str] = None
    
    # Newly added remark field
    remark: Optional[str] = None 
    
    # Define hours_completed schema field with type Optional[float] and default value
    hours_completed: Optional[float] = None
   
    # 🔥 ADD THESE TWO LINES:
    punch_in_image: Optional[str] = None
    # Define punch_out_image schema field with type Optional[str] and default value
    punch_out_image: Optional[str] = None
 
    # Define class Config to encapsulate data and behavior
    class Config:
        from_attributes = True  # (or orm_mode = True if using older Pydantic)