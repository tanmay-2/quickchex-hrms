from sqlalchemy import Column, String, Date, Float, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base # Check if your Base is here, usually it is in db/base_class.py
 
class LeaveRequest(Base):
    __tablename__ = "leave_requests"
 
    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String, ForeignKey("profile_master.emp_code")) # Ensure profile_master is the correct table name
   
    category = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
   
    # ✅ UPDATED COLUMNS: These now perfectly match your React frontend and Pydantic schema
    total_days = Column(Float)
    has_half_days = Column(Boolean, default=False)
    half_day_details = Column(String, nullable=True) # Will store the comma-separated string of dates
   
    reason = Column(String)
    status = Column(String, default="Pending")
 
    # Relationship points to the "Profile" class in profile_model.py
    employee = relationship("Profile", back_populates="leaves")
 
 
class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String, unique=True, index=True)
    allowed_leaves = Column(Float, default=21.0)
    used_leaves = Column(Float, default=0.0)
 