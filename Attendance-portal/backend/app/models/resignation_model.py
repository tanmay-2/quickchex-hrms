# ==============================================================================
# QUICKCHEX HRMS BACKEND - RESIGNATION_MODEL.PY
# Path: Attendance-portal/backend/app/models/resignation_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'resignation_model'.
# Classes / Data Models:
#   • Resignation
#   • ResignationCreate
#   • ResignationResponse
# ==============================================================================

# Import Column, Integer, String, Date, Text, DateTime from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Date, Text, DateTime
# Import date, datetime from datetime for module operations
from datetime import date, datetime
# Import Optional from typing for module operations
from typing import Optional
# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import Base from app.db.base for module operations
from app.db.base import Base

# ================= DATABASE MODEL =================
class Resignation(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "resignations"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String(50), index=True, nullable=False)
    # Define database column schema mapping for name
    name = Column(String(100), nullable=True)
    # Define database column schema mapping for email
    email = Column(String(100), nullable=True)
    # Define database column schema mapping for department
    department = Column(String(100), nullable=True)
    # Define database column schema mapping for designation
    designation = Column(String(100), nullable=True)
    # Define database column schema mapping for reporting manager
    reporting_manager = Column(String(100), nullable=True)
    # Define database column schema mapping for resignation date
    resignation_date = Column(Date, nullable=False, default=date.today)
    # Define database column schema mapping for notice period
    notice_period = Column(String(50), nullable=True, default="30 Days")
    # Define database column schema mapping for last working day
    last_working_day = Column(Date, nullable=False)
    # Define database column schema mapping for primary reason
    primary_reason = Column(String(200), nullable=True)
    # Define database column schema mapping for comment
    comment = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Active Notice")  # Active Notice, Urgent, Upcoming, Completed
    # Define database column schema mapping for created at
    created_at = Column(DateTime, default=datetime.utcnow)

# ================= PYDANTIC SCHEMAS =================
class ResignationCreate(BaseModel):
    # Define emp_code schema field with type Optional[str] and default value
    emp_code: Optional[str] = None
    # Define employeeId schema field with type Optional[str] and default value
    employeeId: Optional[str] = None
    # Define employeeName schema field with type Optional[str] and default value
    employeeName: Optional[str] = None
    # Define name schema field with type Optional[str] and default value
    name: Optional[str] = None
    # Define department schema field with type Optional[str] and default value
    department: Optional[str] = None
    # Define designation schema field with type Optional[str] and default value
    designation: Optional[str] = None
    # Define reporting_manager schema field with type Optional[str] and default value
    reporting_manager: Optional[str] = None
    # Define reportingManager schema field with type Optional[str] and default value
    reportingManager: Optional[str] = None
    # Define resignation_date schema field with type Optional[str] and default value
    resignation_date: Optional[str] = None
    # Define resignationDate schema field with type Optional[str] and default value
    resignationDate: Optional[str] = None
    # Define notice_period schema field with type Optional[str] and default value
    notice_period: Optional[str] = None
    # Define noticePeriod schema field with type Optional[str] and default value
    noticePeriod: Optional[str] = None
    # Define last_working_day schema field with type Optional[str] and default value
    last_working_day: Optional[str] = None
    # Define lastWorkingDay schema field with type Optional[str] and default value
    lastWorkingDay: Optional[str] = None
    # Define proposed_last_working_day schema field with type Optional[str] and default value
    proposed_last_working_day: Optional[str] = None
    # Define primary_reason schema field with type Optional[str] and default value
    primary_reason: Optional[str] = None
    # Define reason schema field with type Optional[str] and default value
    reason: Optional[str] = None
    # Define comment schema field with type Optional[str] and default value
    comment: Optional[str] = None
    # Define notes schema field with type Optional[str] and default value
    notes: Optional[str] = None

# Define class ResignationResponse inheriting from BaseModel
class ResignationResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define emp_code schema field with type str
    emp_code: str
    # Define name schema field with type Optional[str] and default value
    name: Optional[str] = None
    # Define email schema field with type Optional[str] and default value
    email: Optional[str] = None
    # Define department schema field with type Optional[str] and default value
    department: Optional[str] = None
    # Define designation schema field with type Optional[str] and default value
    designation: Optional[str] = None
    # Define reporting_manager schema field with type Optional[str] and default value
    reporting_manager: Optional[str] = None
    # Define resignation_date schema field with type Optional[date] and default value
    resignation_date: Optional[date] = None
    # Define notice_period schema field with type Optional[str] and default value
    notice_period: Optional[str] = None
    # Define last_working_day schema field with type Optional[date] and default value
    last_working_day: Optional[date] = None
    # Define primary_reason schema field with type Optional[str] and default value
    primary_reason: Optional[str] = None
    # Define comment schema field with type Optional[str] and default value
    comment: Optional[str] = None
    # Define status schema field with type str and default value
    status: str = "Active Notice"
    # Define total_notice_days schema field with type Optional[int] and default value
    total_notice_days: Optional[int] = None
    # Define days_remaining schema field with type Optional[int] and default value
    days_remaining: Optional[int] = None
    # Define days_elapsed schema field with type Optional[int] and default value
    days_elapsed: Optional[int] = None
    # Define progress_pct schema field with type Optional[int] and default value
    progress_pct: Optional[int] = None

    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True
