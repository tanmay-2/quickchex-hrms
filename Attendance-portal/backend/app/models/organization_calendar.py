# ==============================================================================
# QUICKCHEX HRMS BACKEND - ORGANIZATION_CALENDAR.PY
# Path: Attendance-portal/backend/app/models/organization_calendar.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'organization_calendar'.
# Classes / Data Models:
#   • OrganizationCalendar
# ==============================================================================

"""
OrganizationCalendar — Centralized org-level calendar table.

Stores HOLIDAY / WEEKLY_OFF / WORKING_DAY records that apply to ALL employees.
One record per date (enforced via unique constraint on `date`).
Admin imports/manages; Employee & Manager portals read-only.
"""
# Import SQLAlchemy schema types for columns and constraints
from sqlalchemy import Column, Integer, String, Date, DateTime, UniqueConstraint
# Import SQL functions for server-side timestamp defaults
from sqlalchemy.sql import func
# Import declarative Base class for ORM mapping
from app.db.base import Base


# Database model representing the company-wide organization calendar
class OrganizationCalendar(Base):
    # Specify target database table name in PostgreSQL
    __tablename__ = "organization_calendar"

    # Unique primary key integer identifier for the calendar entry
    id = Column(Integer, primary_key=True, index=True)

    # ISO date (YYYY-MM-DD)
    date = Column(Date, nullable=False, index=True)

    # HOLIDAY | WEEKLY_OFF | WORKING_DAY
    status = Column(String(50), nullable=False, default="WORKING_DAY")

    # Optional human-readable label, e.g. "Gandhi Jayanti"
    holiday_name = Column(String(200), nullable=True)

    # Optional description / notes
    description = Column(String(500), nullable=True)

    # Audit
    # Record creation timestamp populated automatically by database server
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Record modification timestamp updated automatically on every row modification
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Unique per date — no duplicates allowed
    __table_args__ = (UniqueConstraint("date", name="uq_org_calendar_date"),)
