# ==============================================================================
# QUICKCHEX HRMS BACKEND - DOCUMENT.PY
# Path: Attendance-portal/backend/app/models/document.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'document'.
# Classes / Data Models:
#   • EmployeeDocument
# ==============================================================================

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class EmployeeDocument(Base):
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String, ForeignKey("profile_master.emp_code"), nullable=False)
    file_name = Column(String, nullable=False)
    file_location = Column(String, nullable=False)
    category = Column(String, default="other_documents")
    file_size = Column(Integer, default=0)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())