# ==============================================================================
# QUICKCHEX HRMS BACKEND - MONTHLY_SHEET_MODEL.PY
# Path: Attendance-portal/backend/app/models/monthly_sheet_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'monthly_sheet_model'.
# Classes / Data Models:
#   • MonthlySheet
#   • MonthlySheetCreate
#   • MonthlySheetResponse
# ==============================================================================

from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, String
from sqlalchemy.orm import relationship
from app.db.base import Base
from pydantic import BaseModel
 
# ================= DATABASE MODEL =================
class MonthlySheet(Base):
    __tablename__ = "monthly_sheets"
 
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("profile_master.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_working_days = Column(Integer, default=0)
    status = Column(String(50), default="OPEN")
 
    __table_args__ = (
        UniqueConstraint("employee_id", "month", "year", name="unique_employee_month"),
    )
 
    # ✅ Relationships MUST be inside class
    employee = relationship("Profile", back_populates="sheets")
    tasks = relationship(
        "DailyTask",
        back_populates="monthly_sheet",
        cascade="all, delete-orphan"
    )
 
 
# ================= SCHEMAS =================
 
# 🔹 Create
class MonthlySheetCreate(BaseModel):
    employee_id: int
    month: int
    year: int
 
 
# 🔹 Response
class MonthlySheetResponse(BaseModel):
    id: int
    employee_id: int
    month: int
    year: int
    total_working_days: int
    status: str
 
    class Config:
        from_attributes = True
 