# app/models/__init__.py
# Import all active SQLAlchemy models to register them with Base.registry

from app.models.task_model import DailyTask
from app.models.monthly_sheet_model import MonthlySheet
from app.models.leave import LeaveRequest, LeaveBalance
from app.models.profile_model import Profile
from app.models.regularization import Regularization
from app.models.user import User
from app.models.role import Role
from app.models.otp import OTP
from app.models.document import EmployeeDocument
from app.models.policy_model import Policy
from app.models.ticket_model import Ticket

__all__ = [
    "DailyTask",
    "MonthlySheet",
    "LeaveRequest",
    "LeaveBalance",
    "Profile",
    "Regularization",
    "User",
    "Role",
    "OTP",
    "EmployeeDocument",
    "Policy",
    "Ticket",
]
