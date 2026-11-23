# ==============================================================================
# QUICKCHEX HRMS BACKEND - LEAVE.PY
# Path: Attendance-portal/backend/app/models/leave.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'leave'.
# Classes / Data Models:
#   • LeaveRequest
#   • LeaveBalance
#   • Holiday
# ==============================================================================

# Import Column, String, Date, Float, ForeignKey, Integer, Boolean, DateTime from sqlalchemy for module operations
from sqlalchemy import Column, String, Date, Float, ForeignKey, Integer, Boolean, DateTime
# Import relationship from sqlalchemy.orm for module operations
from sqlalchemy.orm import relationship
# Import Base from app.db.base for module operations
from app.db.base import Base

# Define class LeaveRequest inheriting from Base
class LeaveRequest(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "leave_requests"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String, ForeignKey("profile_master.emp_code"))
   
    # Define database column schema mapping for category
    category = Column(String)
    # Define database column schema mapping for start date
    start_date = Column(Date)
    # Define database column schema mapping for end date
    end_date = Column(Date)
   
    # Define database column schema mapping for total days
    total_days = Column(Float)
    # Define database column schema mapping for has half days
    has_half_days = Column(Boolean, default=False)
    # Define database column schema mapping for half day details
    half_day_details = Column(String, nullable=True)
   
    # Define database column schema mapping for reason
    reason = Column(String)
    # Define database column schema mapping for status
    status = Column(String, default="Pending")

    # Two-level approval workflow fields
    overall_status = Column(String, default="PENDING_MANAGER")
    # Define database column schema mapping for manager status
    manager_status = Column(String, default="PENDING")
    # Define database column schema mapping for admin status
    admin_status = Column(String, default="PENDING")
    # Define database column schema mapping for manager reviewed by
    manager_reviewed_by = Column(String, nullable=True)
    # Define database column schema mapping for manager reviewed at
    manager_reviewed_at = Column(DateTime, nullable=True)
    # Define database column schema mapping for manager comment
    manager_comment = Column(String, nullable=True)
    # Define database column schema mapping for manager rejection reason
    manager_rejection_reason = Column(String, nullable=True)
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
    # Define database column schema mapping for employee name
    employee_name = Column(String, nullable=True)
    # Define database column schema mapping for manager id
    manager_id = Column(String, nullable=True)
    # Define database column schema mapping for manager name
    manager_name = Column(String, nullable=True)
    # Define database column schema mapping for approval level
    approval_level = Column(Integer, default=1)

    # Relationship points to Profile
    employee = relationship("Profile", back_populates="leaves")


# Define class LeaveBalance inheriting from Base
class LeaveBalance(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "leave_balances"
    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String, unique=True, index=True)
    # Define database column schema mapping for allowed leaves
    allowed_leaves = Column(Float, default=21.0)
    # Define database column schema mapping for used leaves
    used_leaves = Column(Float, default=0.0)


# Define class Holiday inheriting from Base
class Holiday(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "holidays"
    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for name
    name = Column(String(100), nullable=False)
    # Define database column schema mapping for holiday date
    holiday_date = Column(Date, nullable=False)
    # Define database column schema mapping for day of week
    day_of_week = Column(String(50), nullable=True)
    # Define database column schema mapping for type
    type = Column(String(50), default="Gazetted")
    # Define database column schema mapping for status
    status = Column(String(50), default="Active")
    # Define database column schema mapping for created at
    created_at = Column(DateTime, default=DateTime)