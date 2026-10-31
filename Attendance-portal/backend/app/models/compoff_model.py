# ==============================================================================
# QUICKCHEX HRMS BACKEND - COMPOFF_MODEL.PY
# Path: Attendance-portal/backend/app/models/compoff_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'compoff_model'.
# Classes / Data Models:
#   • CompOff
#   • CompOffCreate
#   • CompOffReview
# ==============================================================================

from sqlalchemy import Column, Integer, String, Date, Text, DateTime
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.db.base import Base

# ================= DATABASE MODEL =================
class CompOff(Base):
    __tablename__ = "comp_offs"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String(50), index=True, nullable=False)
    employee_name = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True, default="Operations")
    applied_on = Column(Date, nullable=False, default=date.today)
    applied_for = Column(Date, nullable=False)
    is_half_day = Column(String(10), nullable=False, default="No")
    duration = Column(String(50), nullable=False, default="1 Day (8 Hours)")
    used_on = Column(String(50), nullable=False, default="—")
    comment = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Pending")  # Pending, Approved, Rejected
    level = Column(String(50), nullable=False, default="Level 1")  # Level 1, Completed
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ================= PYDANTIC SCHEMAS =================
class CompOffCreate(BaseModel):
    emp_code: Optional[str] = None
    empCode: Optional[str] = None
    employee_name: Optional[str] = None
    employeeName: Optional[str] = None
    employee: Optional[str] = None
    department: Optional[str] = None
    applied_on: Optional[str] = None
    appliedOn: Optional[str] = None
    applied_for: Optional[str] = None
    appliedFor: Optional[str] = None
    is_half_day: Optional[str] = None
    isHalfDay: Optional[str] = None
    duration: Optional[str] = None
    comment: Optional[str] = None
    status: Optional[str] = None

class CompOffReview(BaseModel):
    status: Optional[str] = None
    comment: Optional[str] = None
    reviewed_by: Optional[str] = None
