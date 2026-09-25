from sqlalchemy import Column, Integer, String, Date, DateTime
from datetime import date
from app.db.base import Base
 
class Regularization(Base):
    __tablename__ = "regularizations"
 
    id = Column(Integer, primary_key=True, index=True)
   
    # Matching the type from your Attendance model
    emp_code = Column(String, index=True)
   
    request_date = Column(Date, default=date.today)
    target_date = Column(Date, nullable=False)
   
    # Using DateTime to match Attendance.punch_in_time
    issued_for_in_time = Column(DateTime, nullable=True)
    issued_for_out_time = Column(DateTime, nullable=True)
   
    comment = Column(String, nullable=True)
    status = Column(String, default="Pending") # Pending, Approved, Rejected
 