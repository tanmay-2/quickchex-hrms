# ==============================================================================
# QUICKCHEX HRMS BACKEND - ROLE.PY
# Path: Attendance-portal/backend/app/models/role.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'role'.
# Classes / Data Models:
#   • Role
# ==============================================================================

from sqlalchemy import Column, Integer, String
from app.db.base import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)