# ==============================================================================
# QUICKCHEX HRMS BACKEND - POLICY_MODEL.PY
# Path: Attendance-portal/backend/app/models/policy_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'policy_model'.
# Classes / Data Models:
#   • Policy
#   • PolicyCreate
#   • PolicyResponse
# ==============================================================================

from sqlalchemy import Column, Integer, String, Date
from datetime import date
from typing import Optional
from pydantic import BaseModel
from app.db.base import Base # Assuming your engine/base is in db/database.py

# ================= DATABASE MODEL =================
class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    department = Column(String)
    description = Column(String)
    created_date = Column(Date, default=date.today)
    file_path = Column(String)
    category = Column(String(100), nullable=False, default="General")
    publish_date = Column(String(20), nullable=True)
    updated_date = Column(String(20), nullable=True)
    version_number = Column(String(30), nullable=False, default="1.0")
    status = Column(String(30), nullable=False, default="Published")

# ================= PYDANTIC SCHEMAS =================
# Used for data coming IN (POST request)
class PolicyCreate(BaseModel):
    name: str
    department: str
    description: Optional[str] = None
    # file_path is usually handled separately during upload

# Used for data going OUT (API Response)
class PolicyResponse(BaseModel):
    id: int
    name: str
    department: str
    description: Optional[str]
    created_date: date
    file_path: Optional[str]
    category: str = "General"
    publish_date: Optional[str] = None
    updated_date: Optional[str] = None
    version_number: str = "1.0"
    status: str = "Published"

    class Config:
        from_attributes = True
