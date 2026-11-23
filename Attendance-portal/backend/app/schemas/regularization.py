# ==============================================================================
# QUICKCHEX HRMS BACKEND - REGULARIZATION.PY
# Path: Attendance-portal/backend/app/schemas/regularization.py
# Purpose: Pydantic data validation and serialization schema definitions for 'regularization'.
# Classes / Data Models:
#   • RegularizationCreate
#   • RegularizationStatusUpdate
#   • RegularizationResponse
# ==============================================================================

# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import date, datetime from datetime for module operations
from datetime import date, datetime
# Import Optional, Any from typing for module operations
from typing import Optional, Any

# Define class RegularizationCreate inheriting from BaseModel
class RegularizationCreate(BaseModel):
    # Define target_date schema field with type Optional[Any] and default value
    target_date: Optional[Any] = None
    # Define issued_for_in_time schema field with type Optional[Any] and default value
    issued_for_in_time: Optional[Any] = None
    # Define issued_for_out_time schema field with type Optional[Any] and default value
    issued_for_out_time: Optional[Any] = None
    # Define comment schema field with type Optional[str] and default value
    comment: Optional[str] = None
 
# Define class RegularizationStatusUpdate inheriting from BaseModel
class RegularizationStatusUpdate(BaseModel):
    status: str # "Approved" or "Rejected"
 
# Define class RegularizationResponse inheriting from BaseModel
class RegularizationResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define emp_code schema field with type str
    emp_code: str
    # Define request_date schema field with type Optional[Any] and default value
    request_date: Optional[Any] = None
    # Define target_date schema field with type Optional[Any] and default value
    target_date: Optional[Any] = None
    # Define issued_for_in_time schema field with type Optional[Any] and default value
    issued_for_in_time: Optional[Any] = None
    # Define issued_for_out_time schema field with type Optional[Any] and default value
    issued_for_out_time: Optional[Any] = None
    # Define comment schema field with type Optional[str] and default value
    comment: Optional[str] = None
    # Define status schema field with type str
    status: str
 
    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True
 
 