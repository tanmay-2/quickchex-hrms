from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
 
class AttendanceResponse(BaseModel):
    id: int
    emp_code: str
    date: Optional[datetime] = None
    punch_in_time: Optional[datetime] = None
    punch_out_time: Optional[datetime] = None
    punch_in_location: Optional[str] = None
    punch_out_location: Optional[str] = None
    status: Optional[str] = None
    
    # Newly added remark field
    remark: Optional[str] = None 
    
    hours_completed: Optional[float] = None
   
    # 🔥 ADD THESE TWO LINES:
    punch_in_image: Optional[str] = None
    punch_out_image: Optional[str] = None
 
    class Config:
        from_attributes = True  # (or orm_mode = True if using older Pydantic)