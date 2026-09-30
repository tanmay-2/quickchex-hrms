from pydantic import BaseModel
from datetime import date
from typing import Optional

# --- MONTHLY SHEET SCHEMAS ---
class MonthlySheetCreate(BaseModel):
    emp_code: str  # 🔥 Strictly string
    month: int
    year: int

class MonthlySheetResponse(BaseModel):
    id: int
    emp_code: str
    month: int
    year: int
    total_working_days: int
    status: str

    class Config:
        from_attributes = True

# --- DAILY TASK SCHEMAS ---
class DailyTaskCreate(BaseModel):
    monthly_sheet_id: int
    task_date: date
    task_title: str
    description: Optional[str] = None
    status: str = "COMPLETED"

class DailyTaskResponse(BaseModel):
    id: int
    monthly_sheet_id: int
    task_date: date
    task_title: str
    description: Optional[str]
    status: str
    designation: Optional[str] = None

    class Config:
        from_attributes = True