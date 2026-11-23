# ==============================================================================
# QUICKCHEX HRMS BACKEND - ROLE.PY
# Path: Attendance-portal/backend/app/models/role.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'role'.
# Classes / Data Models:
#   • Role
# ==============================================================================

# Import SQLAlchemy column types for mapping database table columns
from sqlalchemy import Column, Integer, String
# Import declarative Base class for ORM mapping
from app.db.base import Base

# Database model defining user authorization roles within the organization
class Role(Base):
    # Specify target database table name in PostgreSQL
    __tablename__ = "roles"

    # Primary key integer identifier for the user role
    id = Column(Integer, primary_key=True, index=True)
    # Unique text name representing the role (e.g., Admin, Manager, Employee)
    name = Column(String, unique=True)
