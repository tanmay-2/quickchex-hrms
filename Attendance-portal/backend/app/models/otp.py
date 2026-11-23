# ==============================================================================
# QUICKCHEX HRMS BACKEND - OTP.PY
# Path: Attendance-portal/backend/app/models/otp.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'otp'.
# Classes / Data Models:
#   • OTP
# ==============================================================================

# Import Column, Integer, String, DateTime from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, DateTime
# Import datetime from datetime for module operations
from datetime import datetime
# Import Base from app.db.base for module operations
from app.db.base import Base


# Define class OTP inheriting from Base
class OTP(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "otp"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for email
    email = Column(String, index=True)
    # Define database column schema mapping for otp
    otp = Column(String)
    # Define database column schema mapping for expires at
    expires_at = Column(DateTime)
    # Define database column schema mapping for created at
    created_at = Column(DateTime, default=datetime.utcnow)