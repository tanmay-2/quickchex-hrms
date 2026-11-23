# ==============================================================================
# QUICKCHEX HRMS BACKEND - USER.PY
# Path: Attendance-portal/backend/app/models/user.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'user'.
# Classes / Data Models:
#   • User
# ==============================================================================

# Import Column, Integer, String from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String
# Import Base from app.db.base for module operations
from app.db.base import Base


# Define class User inheriting from Base
class User(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "users"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for empcode
    empcode = Column(String, unique=True, nullable=False)
    # Define database column schema mapping for username
    username = Column(String, nullable=False)
    # Define database column schema mapping for email
    email = Column(String, unique=True, index=True, nullable=False)
    # Placeholder statement performing no operation
    password = Column(String, nullable=False)
    # Define database column schema mapping for role
    role = Column(String, nullable=False)
    # Define database column schema mapping for designation
    designation = Column(String)

    # Transparent alias: allows both user.emp_code and user.empcode to work
    @property
    # Define emp_code function to handle emp code
    def emp_code(self):
        # Return computed result or response payload to caller
        return self.empcode

    # Apply decorator to wrap function behavior
    @emp_code.setter
    # Define emp_code function to handle emp code
    def emp_code(self, value):
        # Execute statement to process data and maintain state
        self.empcode = value