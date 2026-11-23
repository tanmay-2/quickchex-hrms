# ==============================================================================
# QUICKCHEX HRMS BACKEND - RESIGNATION.PY
# Path: Attendance-portal/backend/app/models/resignation.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'resignation'.
# Classes / Data Models:
#   • ResignationRequest
# ==============================================================================

# Import Column, Integer, String, Text, DateTime from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Text, DateTime
# Import func from sqlalchemy.sql for module operations
from sqlalchemy.sql import func
# Import Base from app.db.base for module operations
from app.db.base import Base

# Define class ResignationRequest inheriting from Base
class ResignationRequest(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "resignation_requests"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String(50), nullable=False, index=True)
    # Define database column schema mapping for primary reason
    primary_reason = Column(String(255), nullable=False)
    # Define database column schema mapping for proposed last working day
    proposed_last_working_day = Column(String(50), nullable=True)
    # Define database column schema mapping for comment
    comment = Column(Text, nullable=True)
    # Define database column schema mapping for status
    status = Column(String(50), default="Pending")
    # Define database column schema mapping for created at
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
