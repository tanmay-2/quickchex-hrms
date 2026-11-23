# ==============================================================================
# QUICKCHEX HRMS BACKEND - INIT_DB.PY
# Path: Attendance-portal/backend/app/db/init_db.py
# Purpose: Database management, migration, or lifecycle initialization module for 'init_db'.
# Primary Functions:
#   • init_db()
# ==============================================================================

# app/db/init_db.py

# Import engine from app.db.session for module operations
from app.db.session import engine
# Import Base from app.db.base for module operations
from app.db.base import Base

# 🔥 1. IMPORT ALL MODELS HERE 
# (This ensures SQLAlchemy sees them before creating the tables, without causing circular loops!)
from app.models.user import User
# Import Attendance from app.models.attendance for module operations
from app.models.attendance import Attendance
# Import Role from app.models.role for module operations
from app.models.role import Role
# Import OTP from app.models.otp for module operations
from app.models.otp import OTP
# Import Regularization from app.models.regularization for module operations
from app.models.regularization import Regularization
# from app.models.location import Location
from app.models.task_model import DailyTask
# Import MonthlySheet from app.models.monthly_sheet_model for module operations
from app.models.monthly_sheet_model import MonthlySheet
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import LeaveRequest, LeaveBalance, Holiday from app.models.leave for module operations
from app.models.leave import LeaveRequest, LeaveBalance, Holiday
# Import EmployeeDocument from app.models.document for module operations
from app.models.document import EmployeeDocument
# Import Policy from app.models.policy_model for module operations
from app.models.policy_model import Policy
# Import Ticket from app.models.ticket_model for module operations
from app.models.ticket_model import Ticket
# Import PayrollProfile, Payslip, PayrollSetting, PayrollRun, InternConversionRecord, PayrollRecord from app.models.payroll_model for module operations
from app.models.payroll_model import PayrollProfile, Payslip, PayrollSetting, PayrollRun, InternConversionRecord, PayrollRecord
# Import ClientSite, AttendanceSettings, EmployeeWorkModeAssignment from app.models.work_location for module operations
from app.models.work_location import ClientSite, AttendanceSettings, EmployeeWorkModeAssignment
# Import Notification from app.models.notification_model for module operations
from app.models.notification_model import Notification

# Define init_db function to handle init db
def init_db():
    """
    Creates all tables in the database based on the imported models.
    """
    Base.metadata.create_all(bind=engine)
    # Import migrate_policy_metadata from app.db.migrate_policy_metadata for module operations
    from app.db.migrate_policy_metadata import migrate_policy_metadata
    # Invoke migrate_policy_metadata to perform operational action
    migrate_policy_metadata()
    # Import migrate_notification_table from app.db.migrate_notifications for module operations
    from app.db.migrate_notifications import migrate_notification_table
    # Invoke migrate_notification_table to perform operational action
    migrate_notification_table()
