# ==============================================================================
# QUICKCHEX HRMS BACKEND - DOCUMENT.PY
# Path: Attendance-portal/backend/app/models/document.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'document'.
# Classes / Data Models:
#   • EmployeeDocument
# ==============================================================================

# Import Column, Integer, String, DateTime, ForeignKey from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
# Import func from sqlalchemy.sql for module operations
from sqlalchemy.sql import func
# Import Base from app.db.base for module operations
from app.db.base import Base

# Define class EmployeeDocument inheriting from Base
class EmployeeDocument(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "employee_documents"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String, ForeignKey("profile_master.emp_code"), nullable=False)
    # Define database column schema mapping for file name
    file_name = Column(String, nullable=False)
    # Define database column schema mapping for file location
    file_location = Column(String, nullable=False)
    # Define database column schema mapping for category
    category = Column(String, default="other_documents")
    # Define database column schema mapping for file size
    file_size = Column(Integer, default=0)
    # Define database column schema mapping for uploaded at
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())