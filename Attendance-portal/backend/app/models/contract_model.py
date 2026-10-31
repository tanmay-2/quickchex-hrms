# ==============================================================================
# QUICKCHEX HRMS BACKEND - CONTRACT_MODEL.PY
# Path: Attendance-portal/backend/app/models/contract_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'contract_model'.
# Classes / Data Models:
#   • EmploymentContract
#   • ContractCreate
#   • ContractUpdate
# ==============================================================================

from sqlalchemy import Column, Integer, String, Date, Text, DateTime
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.db.base import Base

# ================= DATABASE MODEL =================
class EmploymentContract(Base):
    __tablename__ = "employment_contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_code = Column(String(50), unique=True, index=True, nullable=False)
    emp_code = Column(String(50), index=True, nullable=False)
    employee_name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=True, default="Operations")
    contract_type = Column(String(100), nullable=False, default="Permanent Employment Contract")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    approval_proof = Column(String(50), nullable=False, default="pending")  # pending, uploaded
    agreement = Column(String(50), nullable=False, default="pending")  # pending, uploaded
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ================= PYDANTIC SCHEMAS =================
class ContractCreate(BaseModel):
    emp_code: Optional[str] = None
    employee_name: Optional[str] = None
    employeeName: Optional[str] = None
    department: Optional[str] = None
    contract_type: Optional[str] = None
    contractType: Optional[str] = None
    start_date: Optional[str] = None
    startDate: Optional[str] = None
    end_date: Optional[str] = None
    endDate: Optional[str] = None
    approval_proof: Optional[str] = None
    approvalProof: Optional[str] = None
    agreement: Optional[str] = None
    notes: Optional[str] = None

class ContractUpdate(BaseModel):
    approval_proof: Optional[str] = None
    approvalProof: Optional[str] = None
    agreement: Optional[str] = None
    start_date: Optional[str] = None
    startDate: Optional[str] = None
    end_date: Optional[str] = None
    endDate: Optional[str] = None
    notes: Optional[str] = None
