# ==============================================================================
# QUICKCHEX HRMS BACKEND - WORK_LOCATION.PY
# Path: Attendance-portal/backend/app/models/work_location.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'work_location'.
# Classes / Data Models:
#   • ClientSite
#   • AttendanceSettings
#   • EmployeeWorkModeAssignment
# ==============================================================================

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from datetime import datetime
from app.db.base import Base

class ClientSite(Base):
    __tablename__ = "client_sites"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    client_name = Column(String(150), nullable=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    allowed_radius = Column(Float, default=200.0)  # meters
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AttendanceSettings(Base):
    __tablename__ = "attendance_settings"

    id = Column(Integer, primary_key=True, index=True)
    office_name = Column(String(150), default="LA ESFERA Head Office")
    office_address = Column(Text, default="Mumbai, Maharashtra, India")
    office_latitude = Column(Float, default=19.1324)
    office_longitude = Column(Float, default=72.9278)
    office_radius = Column(Float, default=200.0)
    enforce_geofence = Column(Boolean, default=False)

    wfh_enabled = Column(Boolean, default=True)
    wfh_requires_approval = Column(Boolean, default=False)
    wfh_requires_location = Column(Boolean, default=True)
    wfh_requires_camera = Column(Boolean, default=True)

    allowed_work_modes = Column(Text, default='["OFFICE","WFH","CLIENT_SITE"]')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmployeeWorkModeAssignment(Base):
    __tablename__ = "employee_work_mode_assignments"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String(50), unique=True, index=True, nullable=False)
    allow_office = Column(Boolean, default=True)
    allow_wfh = Column(Boolean, default=True)
    allow_client_site = Column(Boolean, default=True)
    assigned_client_site_ids = Column(Text, default="[]")  # JSON encoded list of client site IDs
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
