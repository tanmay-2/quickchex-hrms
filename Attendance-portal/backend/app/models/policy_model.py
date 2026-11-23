# ==============================================================================
# QUICKCHEX HRMS BACKEND - POLICY_MODEL.PY
# Path: Attendance-portal/backend/app/models/policy_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'policy_model'.
# Classes / Data Models:
#   • Policy
#   • PolicyCreate
#   • PolicyResponse
# ==============================================================================

# Import Column, Integer, String, Date from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Date
# Import date from datetime for module operations
from datetime import date
# Import Optional from typing for module operations
from typing import Optional
# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
from app.db.base import Base # Assuming your engine/base is in db/database.py

# ================= DATABASE MODEL =================
class Policy(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "policies"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for name
    name = Column(String, index=True)
    # Define database column schema mapping for department
    department = Column(String)
    # Define database column schema mapping for description
    description = Column(String)
    # Define database column schema mapping for created date
    created_date = Column(Date, default=date.today)
    # Define database column schema mapping for file path
    file_path = Column(String)
    # Define database column schema mapping for category
    category = Column(String(100), nullable=False, default="General")
    # Define database column schema mapping for publish date
    publish_date = Column(String(20), nullable=True)
    # Define database column schema mapping for updated date
    updated_date = Column(String(20), nullable=True)
    # Define database column schema mapping for version number
    version_number = Column(String(30), nullable=False, default="1.0")
    # Define database column schema mapping for status
    status = Column(String(30), nullable=False, default="Published")

# ================= PYDANTIC SCHEMAS =================
# Used for data coming IN (POST request)
class PolicyCreate(BaseModel):
    # Define name schema field with type str
    name: str
    # Define department schema field with type str
    department: str
    # Define description schema field with type Optional[str] and default value
    description: Optional[str] = None
    # file_path is usually handled separately during upload

# Used for data going OUT (API Response)
class PolicyResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define name schema field with type str
    name: str
    # Define department schema field with type str
    department: str
    # Define description schema field with type Optional[str]
    description: Optional[str]
    # Define created_date schema field with type date
    created_date: date
    # Define file_path schema field with type Optional[str]
    file_path: Optional[str]
    # Define category schema field with type str and default value
    category: str = "General"
    # Define publish_date schema field with type Optional[str] and default value
    publish_date: Optional[str] = None
    # Define updated_date schema field with type Optional[str] and default value
    updated_date: Optional[str] = None
    # Define version_number schema field with type str and default value
    version_number: str = "1.0"
    # Define status schema field with type str and default value
    status: str = "Published"

    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True
