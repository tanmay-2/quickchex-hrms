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
 