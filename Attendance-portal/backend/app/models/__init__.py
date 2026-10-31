# ==============================================================================
# QUICKCHEX HRMS BACKEND - __INIT__.PY
# Path: Attendance-portal/backend/app/models/__init__.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for '__init__'.
# ==============================================================================

"""
Quickchex HRMS Models Registry
Ensures all SQLAlchemy declarative models are loaded and mapped into the registry.
"""

from app.models.profile_model import Profile
from app.models.monthly_sheet_model import MonthlySheet
from app.models.attendance import Attendance
from app.models.leave import LeaveRequest, Holiday, LeaveBalance
from app.models.regularization import Regularization
from app.models.payroll_model import (
    PayrollProfile,
    Payslip,
    PayrollSetting,
    PayrollRun,
    InternConversionRecord,
    PayrollRecord,
)
from app.models.resignation import ResignationRequest
from app.models.work_location import ClientSite, AttendanceSettings, EmployeeWorkModeAssignment
from app.models.otp import OTP
from app.models.user import User
from app.models.role import Role
from app.models.task_model import DailyTask
from app.models.ticket_model import Ticket
from app.models.policy_model import Policy
from app.models.document import EmployeeDocument
from app.models.organization_calendar import OrganizationCalendar
from app.models.notification_model import Notification

__all__ = [
    "Profile",
    "MonthlySheet",
    "Attendance",
    "LeaveRequest",
    "Holiday",
    "LeaveBalance",
    "Regularization",
    "PayrollProfile",
    "Payslip",
    "PayrollSetting",
    "PayrollRun",
    "InternConversionRecord",
    "PayrollRecord",
    "ResignationRequest",
    "ClientSite",
    "AttendanceSettings",
    "EmployeeWorkModeAssignment",
    "OTP",
    "User",
    "Role",
    "DailyTask",
    "Ticket",
    "Policy",
    "EmployeeDocument",
    "OrganizationCalendar",
    "Notification",
]
