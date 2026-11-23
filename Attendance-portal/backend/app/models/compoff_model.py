# ==============================================================================
# QUICKCHEX HRMS BACKEND - COMPOFF_MODEL.PY
# Path: Attendance-portal/backend/app/models/compoff_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'compoff_model'.
# Classes / Data Models:
#   • CompOff
#   • CompOffCreate
#   • CompOffReview
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
class CompOff(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "comp_offs"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String(50), index=True, nullable=False)
    # Define database column schema mapping for employee name
    employee_name = Column(String(100), nullable=True)
    # Define database column schema mapping for department
    department = Column(String(100), nullable=True, default="Operations")
    # Define database column schema mapping for applied on
    applied_on = Column(Date, nullable=False, default=date.today)
    # Define database column schema mapping for applied for
    applied_for = Column(Date, nullable=False)
    # Define database column schema mapping for is half day
    is_half_day = Column(String(10), nullable=False, default="No")
    # Define database column schema mapping for duration
    duration = Column(String(50), nullable=False, default="1 Day (8 Hours)")
    # Define database column schema mapping for used on
    used_on = Column(String(50), nullable=False, default="—")
    # Define database column schema mapping for comment
    comment = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Pending")  # Pending, Approved, Rejected
    level = Column(String(50), nullable=False, default="Level 1")  # Level 1, Completed
    # Define database column schema mapping for reviewed by
    reviewed_by = Column(String(100), nullable=True)
    # Define database column schema mapping for reviewed at
    reviewed_at = Column(DateTime, nullable=True)
    # Define database column schema mapping for created at
    created_at = Column(DateTime, default=datetime.utcnow)

# ================= PYDANTIC SCHEMAS =================
class CompOffCreate(BaseModel):
    # Define emp_code schema field with type Optional[str] and default value
    emp_code: Optional[str] = None
    # Define empCode schema field with type Optional[str] and default value
    empCode: Optional[str] = None
    # Define employee_name schema field with type Optional[str] and default value
    employee_name: Optional[str] = None
    # Define employeeName schema field with type Optional[str] and default value
    employeeName: Optional[str] = None
    # Define employee schema field with type Optional[str] and default value
    employee: Optional[str] = None
    # Define department schema field with type Optional[str] and default value
    department: Optional[str] = None
    # Define applied_on schema field with type Optional[str] and default value
    applied_on: Optional[str] = None
    # Define appliedOn schema field with type Optional[str] and default value
    appliedOn: Optional[str] = None
    # Define applied_for schema field with type Optional[str] and default value
    applied_for: Optional[str] = None
    # Define appliedFor schema field with type Optional[str] and default value
    appliedFor: Optional[str] = None
    # Define is_half_day schema field with type Optional[str] and default value
    is_half_day: Optional[str] = None
    # Define isHalfDay schema field with type Optional[str] and default value
    isHalfDay: Optional[str] = None
    # Define duration schema field with type Optional[str] and default value
    duration: Optional[str] = None
    # Define comment schema field with type Optional[str] and default value
    comment: Optional[str] = None
    # Define status schema field with type Optional[str] and default value
    status: Optional[str] = None

# Define class CompOffReview inheriting from BaseModel
class CompOffReview(BaseModel):
    # Define status schema field with type Optional[str] and default value
    status: Optional[str] = None
    # Define comment schema field with type Optional[str] and default value
    comment: Optional[str] = None
    # Define reviewed_by schema field with type Optional[str] and default value
    reviewed_by: Optional[str] = None
