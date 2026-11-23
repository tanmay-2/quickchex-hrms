# ==============================================================================
# QUICKCHEX HRMS BACKEND - ATTENDANCE.PY
# Path: Attendance-portal/backend/app/models/attendance.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'attendance'.
# Classes / Data Models:
#   • Attendance
# ==============================================================================

# Import Column, Integer, String, Date, DateTime, Float from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Date, DateTime, Float
# Import Base from app.db.base for module operations
from app.db.base import Base
 
# Define class Attendance inheriting from Base
class Attendance(Base):
    # This tells SQLAlchemy NOT to look for a table named "attendance"
    __abstract__ = True
 
    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String, index=True)
    # Define database column schema mapping for date
    date = Column(Date)
    # Define database column schema mapping for punch in time
    punch_in_time = Column(DateTime, nullable=True)
    # Define database column schema mapping for punch out time
    punch_out_time = Column(DateTime, nullable=True)
    # Define database column schema mapping for punch in location
    punch_in_location = Column(String, nullable=True)
    # Define database column schema mapping for punch out location
    punch_out_location = Column(String, nullable=True)
    # Define database column schema mapping for punch in image
    punch_in_image = Column(String, nullable=True)
    # Define database column schema mapping for punch out image
    punch_out_image = Column(String, nullable=True)
    # Define database column schema mapping for punch in latitude
    punch_in_latitude = Column(Float, nullable=True)
    # Define database column schema mapping for punch in longitude
    punch_in_longitude = Column(Float, nullable=True)
    # Define database column schema mapping for punch in accuracy
    punch_in_accuracy = Column(Float, nullable=True)
    # Define database column schema mapping for punch out latitude
    punch_out_latitude = Column(Float, nullable=True)
    # Define database column schema mapping for punch out longitude
    punch_out_longitude = Column(Float, nullable=True)
    # Define database column schema mapping for punch out accuracy
    punch_out_accuracy = Column(Float, nullable=True)
    # Define database column schema mapping for hours completed
    hours_completed = Column(Float, nullable=True)
    # Define database column schema mapping for status
    status = Column(String, nullable=True)
    
    # Newly added remark field
    remark = Column(String, nullable=True)

    # 15-minute Punch-Out Correction Buffer fields
    first_punch_out_time = Column(DateTime, nullable=True)
    # Define database column schema mapping for correction status
    correction_status = Column(String(50), nullable=True, default="NONE")

    # Work Mode & Client Site fields
    work_mode = Column(String(50), nullable=True, default="OFFICE")
    # Define database column schema mapping for client site id
    client_site_id = Column(Integer, nullable=True)
    # Define database column schema mapping for client site name
    client_site_name = Column(String(150), nullable=True)
