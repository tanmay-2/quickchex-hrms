# ==============================================================================
# QUICKCHEX HRMS BACKEND - USER.PY
# Path: Attendance-portal/backend/app/models/user.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'user'.
# Classes / Data Models:
#   • User
# ==============================================================================

from sqlalchemy import Column, Integer, String
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    empcode = Column(String, unique=True, nullable=False)
    username = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    designation = Column(String)

    # Transparent alias: allows both user.emp_code and user.empcode to work
    @property
    def emp_code(self):
        return self.empcode

    @emp_code.setter
    def emp_code(self, value):
        self.empcode = value