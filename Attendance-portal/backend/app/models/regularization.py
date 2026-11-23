# ==============================================================================
# QUICKCHEX HRMS BACKEND - REGULARIZATION.PY
# Path: Attendance-portal/backend/app/models/regularization.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'regularization'.
# Classes / Data Models:
#   • Regularization
# ==============================================================================

# Import Column, Integer, String, Date, DateTime from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Date, DateTime
# Import date from datetime for module operations
from datetime import date
# Import Base from app.db.base for module operations
from app.db.base import Base

# Define class Regularization inheriting from Base
class Regularization(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "regularizations"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
   
    # Define database column schema mapping for emp code
    emp_code = Column(String, index=True)
   
    # Define database column schema mapping for request date
    request_date = Column(Date, default=date.today)
    # Define database column schema mapping for target date
    target_date = Column(Date, nullable=False)
   
    # Define database column schema mapping for issued for in time
    issued_for_in_time = Column(DateTime, nullable=True)
    # Define database column schema mapping for issued for out time
    issued_for_out_time = Column(DateTime, nullable=True)
   
    # Define database column schema mapping for comment
    comment = Column(String, nullable=True)
    # Define database column schema mapping for status
    status = Column(String, default="PENDING_MANAGER")

    # Two-level approval workflow fields
    overall_status = Column(String, default="PENDING_MANAGER")
    # Define database column schema mapping for manager status
    manager_status = Column(String, default="PENDING")
    # Define database column schema mapping for admin status
    admin_status = Column(String, default="PENDING")
    # Define database column schema mapping for employee id
    employee_id = Column(String, nullable=True)
    # Define database column schema mapping for employee name
    employee_name = Column(String, nullable=True)
    # Define database column schema mapping for manager id
    manager_id = Column(String, nullable=True)
    # Define database column schema mapping for manager name
    manager_name = Column(String, nullable=True)
    # Define database column schema mapping for approval level
    approval_level = Column(Integer, default=1)
    # Define database column schema mapping for manager action
    manager_action = Column(String, nullable=True)
    # Define database column schema mapping for manager reviewed by
    manager_reviewed_by = Column(String, nullable=True)
    # Define database column schema mapping for manager reviewed at
    manager_reviewed_at = Column(DateTime, nullable=True)
    # Define database column schema mapping for manager comment
    manager_comment = Column(String, nullable=True)
    # Define database column schema mapping for manager rejection reason
    manager_rejection_reason = Column(String, nullable=True)
    # Define database column schema mapping for admin action
    admin_action = Column(String, nullable=True)
    # Define database column schema mapping for admin reviewed by
    admin_reviewed_by = Column(String, nullable=True)
    # Define database column schema mapping for admin reviewed at
    admin_reviewed_at = Column(DateTime, nullable=True)
    # Define database column schema mapping for admin comment
    admin_comment = Column(String, nullable=True)
    # Define database column schema mapping for admin rejection reason
    admin_rejection_reason = Column(String, nullable=True)
    # Define database column schema mapping for submitted at
    submitted_at = Column(DateTime, nullable=True)
    # Define database column schema mapping for created at
    created_at = Column(DateTime, nullable=True)
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime, nullable=True)