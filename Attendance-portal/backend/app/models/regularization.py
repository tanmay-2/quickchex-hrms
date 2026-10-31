# ==============================================================================
# QUICKCHEX HRMS BACKEND - REGULARIZATION.PY
# Path: Attendance-portal/backend/app/models/regularization.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'regularization'.
# Classes / Data Models:
#   • Regularization
# ==============================================================================

from sqlalchemy import Column, Integer, String, Date, DateTime
from datetime import date
from app.db.base import Base

class Regularization(Base):
    __tablename__ = "regularizations"

    id = Column(Integer, primary_key=True, index=True)
   
    emp_code = Column(String, index=True)
   
    request_date = Column(Date, default=date.today)
    target_date = Column(Date, nullable=False)
   
    issued_for_in_time = Column(DateTime, nullable=True)
    issued_for_out_time = Column(DateTime, nullable=True)
   
    comment = Column(String, nullable=True)
    status = Column(String, default="PENDING_MANAGER")

    # Two-level approval workflow fields
    overall_status = Column(String, default="PENDING_MANAGER")
    manager_status = Column(String, default="PENDING")
    admin_status = Column(String, default="PENDING")
    employee_id = Column(String, nullable=True)
    employee_name = Column(String, nullable=True)
    manager_id = Column(String, nullable=True)
    manager_name = Column(String, nullable=True)
    approval_level = Column(Integer, default=1)
    manager_action = Column(String, nullable=True)
    manager_reviewed_by = Column(String, nullable=True)
    manager_reviewed_at = Column(DateTime, nullable=True)
    manager_comment = Column(String, nullable=True)
    manager_rejection_reason = Column(String, nullable=True)
    admin_action = Column(String, nullable=True)
    admin_reviewed_by = Column(String, nullable=True)
    admin_reviewed_at = Column(DateTime, nullable=True)
    admin_comment = Column(String, nullable=True)
    admin_rejection_reason = Column(String, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)