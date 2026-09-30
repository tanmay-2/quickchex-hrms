from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, Any

class RegularizationCreate(BaseModel):
    target_date: Optional[Any] = None
    issued_for_in_time: Optional[Any] = None
    issued_for_out_time: Optional[Any] = None
    comment: Optional[str] = None
 
class RegularizationStatusUpdate(BaseModel):
    status: str # "Approved" or "Rejected"
 
class RegularizationResponse(BaseModel):
    id: int
    emp_code: str
    request_date: Optional[Any] = None
    target_date: Optional[Any] = None
    issued_for_in_time: Optional[Any] = None
    issued_for_out_time: Optional[Any] = None
    comment: Optional[str] = None
    status: str
 
    class Config:
        from_attributes = True
 
 