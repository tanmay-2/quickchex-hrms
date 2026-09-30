# app/db/init_db.py

from app.db.session import engine
from app.db.base import Base

# 🔥 1. IMPORT ALL MODELS HERE 
# (This ensures SQLAlchemy sees them before creating the tables, without causing circular loops!)
from app.models.user import User
from app.models.attendance import Attendance
from app.models.role import Role
from app.models.otp import OTP
from app.models.regularization import Regularization
# from app.models.location import Location
from app.models.task_model import DailyTask
from app.models.monthly_sheet_model import MonthlySheet
from app.models.profile_model import Profile
from app.models.leave import LeaveRequest, LeaveBalance, Holiday
from app.models.document import EmployeeDocument
from app.models.policy_model import Policy
from app.models.ticket_model import Ticket
from app.models.payroll_model import PayrollProfile, Payslip
from app.models.work_location import ClientSite, AttendanceSettings, EmployeeWorkModeAssignment
from app.models.notification_model import Notification

def init_db():
    """
    Creates all tables in the database based on the imported models.
    """
    Base.metadata.create_all(bind=engine)
    from app.db.migrate_policy_metadata import migrate_policy_metadata
    migrate_policy_metadata()
    from app.db.migrate_notifications import migrate_notification_table
    migrate_notification_table()
