# ==============================================================================
# QUICKCHEX HRMS BACKEND - __INIT__.PY
# Path: Attendance-portal/backend/app/models/__init__.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for '__init__'.
# ==============================================================================

"""
Quickchex HRMS Models Registry
Ensures all SQLAlchemy declarative models are loaded and mapped into the registry.
"""

# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import MonthlySheet from app.models.monthly_sheet_model for module operations
from app.models.monthly_sheet_model import MonthlySheet
# Import Attendance from app.models.attendance for module operations
from app.models.attendance import Attendance
# Import LeaveRequest, Holiday, LeaveBalance from app.models.leave for module operations
from app.models.leave import LeaveRequest, Holiday, LeaveBalance
# Import Regularization from app.models.regularization for module operations
from app.models.regularization import Regularization
# Import  from app.models.payroll_model for module operations
from app.models.payroll_model import (
    # Execute statement to process data and maintain state
    PayrollProfile,
    # Execute statement to process data and maintain state
    Payslip,
    # Execute statement to process data and maintain state
    PayrollSetting,
    # Execute statement to process data and maintain state
    PayrollRun,
    # Execute statement to process data and maintain state
    InternConversionRecord,
    # Execute statement to process data and maintain state
    PayrollRecord,
# Execute statement to process data and maintain state
)
# Import ResignationRequest from app.models.resignation for module operations
from app.models.resignation import ResignationRequest
# Import ClientSite, AttendanceSettings, EmployeeWorkModeAssignment from app.models.work_location for module operations
from app.models.work_location import ClientSite, AttendanceSettings, EmployeeWorkModeAssignment
# Import OTP from app.models.otp for module operations
from app.models.otp import OTP
# Import User from app.models.user for module operations
from app.models.user import User
# Import Role from app.models.role for module operations
from app.models.role import Role
# Import DailyTask from app.models.task_model for module operations
from app.models.task_model import DailyTask
# Import Ticket from app.models.ticket_model for module operations
from app.models.ticket_model import Ticket
# Import Policy from app.models.policy_model for module operations
from app.models.policy_model import Policy
# Import EmployeeDocument from app.models.document for module operations
from app.models.document import EmployeeDocument
# Import OrganizationCalendar from app.models.organization_calendar for module operations
from app.models.organization_calendar import OrganizationCalendar
# Import Notification from app.models.notification_model for module operations
from app.models.notification_model import Notification

# Set __all__ variable to store   all   value
__all__ = [
    # Execute statement to process data and maintain state
    "Profile",
    # Execute statement to process data and maintain state
    "MonthlySheet",
    # Execute statement to process data and maintain state
    "Attendance",
    # Execute statement to process data and maintain state
    "LeaveRequest",
    # Execute statement to process data and maintain state
    "Holiday",
    # Execute statement to process data and maintain state
    "LeaveBalance",
    # Execute statement to process data and maintain state
    "Regularization",
    # Execute statement to process data and maintain state
    "PayrollProfile",
    # Execute statement to process data and maintain state
    "Payslip",
    # Execute statement to process data and maintain state
    "PayrollSetting",
    # Execute statement to process data and maintain state
    "PayrollRun",
    # Execute statement to process data and maintain state
    "InternConversionRecord",
    # Execute statement to process data and maintain state
    "PayrollRecord",
    # Execute statement to process data and maintain state
    "ResignationRequest",
    # Execute statement to process data and maintain state
    "ClientSite",
    # Execute statement to process data and maintain state
    "AttendanceSettings",
    # Execute statement to process data and maintain state
    "EmployeeWorkModeAssignment",
    # Execute statement to process data and maintain state
    "OTP",
    # Execute statement to process data and maintain state
    "User",
    # Execute statement to process data and maintain state
    "Role",
    # Execute statement to process data and maintain state
    "DailyTask",
    # Execute statement to process data and maintain state
    "Ticket",
    # Execute statement to process data and maintain state
    "Policy",
    # Execute statement to process data and maintain state
    "EmployeeDocument",
    # Execute statement to process data and maintain state
    "OrganizationCalendar",
    # Execute statement to process data and maintain state
    "Notification",
# Execute statement to process data and maintain state
]
