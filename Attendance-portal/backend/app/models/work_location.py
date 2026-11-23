# ==============================================================================
# QUICKCHEX HRMS BACKEND - WORK_LOCATION.PY
# Path: Attendance-portal/backend/app/models/work_location.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'work_location'.
# Classes / Data Models:
#   • ClientSite
#   • AttendanceSettings
#   • EmployeeWorkModeAssignment
# ==============================================================================

# Import Column, Integer, String, Float, Boolean, DateTime, Text from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
# Import datetime from datetime for module operations
from datetime import datetime
# Import Base from app.db.base for module operations
from app.db.base import Base

# Define class ClientSite inheriting from Base
class ClientSite(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "client_sites"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for name
    name = Column(String(100), unique=True, nullable=False, index=True)
    # Define database column schema mapping for client name
    client_name = Column(String(150), nullable=True)
    # Define database column schema mapping for address
    address = Column(Text, nullable=True)
    # Define database column schema mapping for latitude
    latitude = Column(Float, nullable=False)
    # Define database column schema mapping for longitude
    longitude = Column(Float, nullable=False)
    allowed_radius = Column(Float, default=200.0)  # meters
    # Define database column schema mapping for is active
    is_active = Column(Boolean, default=True)
    # Define database column schema mapping for created at
    created_at = Column(DateTime, default=datetime.utcnow)
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Define class AttendanceSettings inheriting from Base
class AttendanceSettings(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "attendance_settings"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for office name
    office_name = Column(String(150), default="LA ESFERA Head Office")
    # Define database column schema mapping for office address
    office_address = Column(Text, default="Mumbai, Maharashtra, India")
    # Define database column schema mapping for office latitude
    office_latitude = Column(Float, default=19.1324)
    # Define database column schema mapping for office longitude
    office_longitude = Column(Float, default=72.9278)
    # Define database column schema mapping for office radius
    office_radius = Column(Float, default=200.0)
    # Define database column schema mapping for enforce geofence
    enforce_geofence = Column(Boolean, default=False)

    # Define database column schema mapping for wfh enabled
    wfh_enabled = Column(Boolean, default=True)
    # Define database column schema mapping for wfh requires approval
    wfh_requires_approval = Column(Boolean, default=False)
    # Define database column schema mapping for wfh requires location
    wfh_requires_location = Column(Boolean, default=True)
    # Define database column schema mapping for wfh requires camera
    wfh_requires_camera = Column(Boolean, default=True)

    # Define database column schema mapping for allowed work modes
    allowed_work_modes = Column(Text, default='["OFFICE","WFH","CLIENT_SITE"]')
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Define class EmployeeWorkModeAssignment inheriting from Base
class EmployeeWorkModeAssignment(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "employee_work_mode_assignments"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String(50), unique=True, index=True, nullable=False)
    # Define database column schema mapping for allow office
    allow_office = Column(Boolean, default=True)
    # Define database column schema mapping for allow wfh
    allow_wfh = Column(Boolean, default=True)
    # Define database column schema mapping for allow client site
    allow_client_site = Column(Boolean, default=True)
    assigned_client_site_ids = Column(Text, default="[]")  # JSON encoded list of client site IDs
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
