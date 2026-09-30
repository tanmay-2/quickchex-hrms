from sqlalchemy import Column, String, Date, Float, ForeignKey, Integer, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String, ForeignKey("profile_master.emp_code"))
   
    category = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
   
    total_days = Column(Float)
    has_half_days = Column(Boolean, default=False)
    half_day_details = Column(String, nullable=True)
   
    reason = Column(String)
    status = Column(String, default="Pending")

    # Two-level approval workflow fields
    overall_status = Column(String, default="PENDING_MANAGER")
    manager_status = Column(String, default="PENDING")
    admin_status = Column(String, default="PENDING")
    manager_reviewed_by = Column(String, nullable=True)
    manager_reviewed_at = Column(DateTime, nullable=True)
    manager_comment = Column(String, nullable=True)
    manager_rejection_reason = Column(String, nullable=True)
    admin_reviewed_by = Column(String, nullable=True)
    admin_reviewed_at = Column(DateTime, nullable=True)
    admin_comment = Column(String, nullable=True)
    admin_rejection_reason = Column(String, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    employee_name = Column(String, nullable=True)
    manager_id = Column(String, nullable=True)
    manager_name = Column(String, nullable=True)
    approval_level = Column(Integer, default=1)

    # Relationship points to Profile
    employee = relationship("Profile", back_populates="leaves")


class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String, unique=True, index=True)
    allowed_leaves = Column(Float, default=21.0)
    used_leaves = Column(Float, default=0.0)


class Holiday(Base):
    __tablename__ = "holidays"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    holiday_date = Column(Date, nullable=False)
    day_of_week = Column(String(50), nullable=True)
    type = Column(String(50), default="Gazetted")
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=DateTime)