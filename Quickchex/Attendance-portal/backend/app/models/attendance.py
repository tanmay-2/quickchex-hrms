from sqlalchemy import Column, Integer, String, Date, DateTime, Float
from app.db.base import Base
 
class Attendance(Base):
    # This tells SQLAlchemy NOT to look for a table named "attendance"
    __abstract__ = True
 
    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String, index=True)
    date = Column(Date)
    punch_in_time = Column(DateTime, nullable=True)
    punch_out_time = Column(DateTime, nullable=True)
    punch_in_location = Column(String, nullable=True)
    punch_out_location = Column(String, nullable=True)
    punch_in_image = Column(String, nullable=True)
    punch_out_image = Column(String, nullable=True)
    punch_in_latitude = Column(Float, nullable=True)
    punch_in_longitude = Column(Float, nullable=True)
    punch_in_accuracy = Column(Float, nullable=True)
    punch_out_latitude = Column(Float, nullable=True)
    punch_out_longitude = Column(Float, nullable=True)
    punch_out_accuracy = Column(Float, nullable=True)
    hours_completed = Column(Float, nullable=True)
    status = Column(String, nullable=True)
    
    # Newly added remark field
    remark = Column(String, nullable=True)