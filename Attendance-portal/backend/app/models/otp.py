# ==============================================================================
# QUICKCHEX HRMS BACKEND - OTP.PY
# Path: Attendance-portal/backend/app/models/otp.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'otp'.
# Classes / Data Models:
#   • OTP
# ==============================================================================

from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.db.base import Base


class OTP(Base):
    __tablename__ = "otp"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    otp = Column(String)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)