from sqlalchemy import Column, Integer, String, Date, Text, DateTime
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.db.base import Base

# ================= DATABASE MODEL =================
class Resignation(Base):
    __tablename__ = "resignations"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String(50), index=True, nullable=False)
    name = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    reporting_manager = Column(String(100), nullable=True)
    resignation_date = Column(Date, nullable=False, default=date.today)
    notice_period = Column(String(50), nullable=True, default="30 Days")
    last_working_day = Column(Date, nullable=False)
    primary_reason = Column(String(200), nullable=True)
    comment = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Active Notice")  # Active Notice, Urgent, Upcoming, Completed
    created_at = Column(DateTime, default=datetime.utcnow)

# ================= PYDANTIC SCHEMAS =================
class ResignationCreate(BaseModel):
    emp_code: Optional[str] = None
    employeeId: Optional[str] = None
    employeeName: Optional[str] = None
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    reporting_manager: Optional[str] = None
    reportingManager: Optional[str] = None
    resignation_date: Optional[str] = None
    resignationDate: Optional[str] = None
    notice_period: Optional[str] = None
    noticePeriod: Optional[str] = None
    last_working_day: Optional[str] = None
    lastWorkingDay: Optional[str] = None
    proposed_last_working_day: Optional[str] = None
    primary_reason: Optional[str] = None
    reason: Optional[str] = None
    comment: Optional[str] = None
    notes: Optional[str] = None

class ResignationResponse(BaseModel):
    id: int
    emp_code: str
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    reporting_manager: Optional[str] = None
    resignation_date: Optional[date] = None
    notice_period: Optional[str] = None
    last_working_day: Optional[date] = None
    primary_reason: Optional[str] = None
    comment: Optional[str] = None
    status: str = "Active Notice"
    total_notice_days: Optional[int] = None
    days_remaining: Optional[int] = None
    days_elapsed: Optional[int] = None
    progress_pct: Optional[int] = None

    class Config:
        from_attributes = True
