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
from sqlalchemy import Column, Integer, String, Date, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.db.base import Base


class OrganizationCalendar(Base):
    __tablename__ = "organization_calendar"

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Unique per date — no duplicates allowed
    __table_args__ = (UniqueConstraint("date", name="uq_org_calendar_date"),)
