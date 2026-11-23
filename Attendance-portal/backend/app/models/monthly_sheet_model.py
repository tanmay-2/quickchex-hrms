# ==============================================================================
# QUICKCHEX HRMS BACKEND - MONTHLY_SHEET_MODEL.PY
# Path: Attendance-portal/backend/app/models/monthly_sheet_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'monthly_sheet_model'.
# Classes / Data Models:
#   • MonthlySheet
#   • MonthlySheetCreate
#   • MonthlySheetResponse
# ==============================================================================

# Import Column, Integer, ForeignKey, UniqueConstraint, String from sqlalchemy for module operations
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, String
# Import relationship from sqlalchemy.orm for module operations
from sqlalchemy.orm import relationship
# Import Base from app.db.base for module operations
from app.db.base import Base
# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
 
# ================= DATABASE MODEL =================
class MonthlySheet(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "monthly_sheets"
 
    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for employee id
    employee_id = Column(Integer, ForeignKey("profile_master.id"), nullable=False)
    # Define database column schema mapping for month
    month = Column(Integer, nullable=False)
    # Define database column schema mapping for year
    year = Column(Integer, nullable=False)
    # Define database column schema mapping for total working days
    total_working_days = Column(Integer, default=0)
    # Define database column schema mapping for status
    status = Column(String(50), default="OPEN")
 
    # Set __table_args__ variable to store   table args   value
    __table_args__ = (
        # Invoke UniqueConstraint to perform operational action
        UniqueConstraint("employee_id", "month", "year", name="unique_employee_month"),
    # Execute statement to process data and maintain state
    )
 
    # ✅ Relationships MUST be inside class
    employee = relationship("Profile", back_populates="sheets")
    # Set tasks variable to store tasks value
    tasks = relationship(
        # Execute statement to process data and maintain state
        "DailyTask",
        # Set back_populates variable to store back populates value
        back_populates="monthly_sheet",
        # Set cascade variable to store cascade value
        cascade="all, delete-orphan"
    # Execute statement to process data and maintain state
    )
 
 
# ================= SCHEMAS =================
 
# 🔹 Create
class MonthlySheetCreate(BaseModel):
    # Define employee_id schema field with type int
    employee_id: int
    # Define month schema field with type int
    month: int
    # Define year schema field with type int
    year: int
 
 
# 🔹 Response
class MonthlySheetResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define employee_id schema field with type int
    employee_id: int
    # Define month schema field with type int
    month: int
    # Define year schema field with type int
    year: int
    # Define total_working_days schema field with type int
    total_working_days: int
    # Define status schema field with type str
    status: str
 
    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True
 