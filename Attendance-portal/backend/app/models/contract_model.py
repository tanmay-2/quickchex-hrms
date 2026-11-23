# ==============================================================================
# QUICKCHEX HRMS BACKEND - CONTRACT_MODEL.PY
# Path: Attendance-portal/backend/app/models/contract_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'contract_model'.
# Classes / Data Models:
#   • EmploymentContract
#   • ContractCreate
#   • ContractUpdate
# ==============================================================================

# Import Column, Integer, String, Date, Text, DateTime from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Date, Text, DateTime
# Import date, datetime from datetime for module operations
from datetime import date, datetime
# Import Optional from typing for module operations
from typing import Optional
# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import Base from app.db.base for module operations
from app.db.base import Base

# ================= DATABASE MODEL =================
class EmploymentContract(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "employment_contracts"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for contract code
    contract_code = Column(String(50), unique=True, index=True, nullable=False)
    # Define database column schema mapping for emp code
    emp_code = Column(String(50), index=True, nullable=False)
    # Define database column schema mapping for employee name
    employee_name = Column(String(100), nullable=False)
    # Define database column schema mapping for department
    department = Column(String(100), nullable=True, default="Operations")
    # Define database column schema mapping for contract type
    contract_type = Column(String(100), nullable=False, default="Permanent Employment Contract")
    # Define database column schema mapping for start date
    start_date = Column(Date, nullable=False)
    # Define database column schema mapping for end date
    end_date = Column(Date, nullable=False)
    approval_proof = Column(String(50), nullable=False, default="pending")  # pending, uploaded
    agreement = Column(String(50), nullable=False, default="pending")  # pending, uploaded
    # Define database column schema mapping for notes
    notes = Column(Text, nullable=True)
    # Define database column schema mapping for created at
    created_at = Column(DateTime, default=datetime.utcnow)

# ================= PYDANTIC SCHEMAS =================
class ContractCreate(BaseModel):
    # Define emp_code schema field with type Optional[str] and default value
    emp_code: Optional[str] = None
    # Define employee_name schema field with type Optional[str] and default value
    employee_name: Optional[str] = None
    # Define employeeName schema field with type Optional[str] and default value
    employeeName: Optional[str] = None
    # Define department schema field with type Optional[str] and default value
    department: Optional[str] = None
    # Define contract_type schema field with type Optional[str] and default value
    contract_type: Optional[str] = None
    # Define contractType schema field with type Optional[str] and default value
    contractType: Optional[str] = None
    # Define start_date schema field with type Optional[str] and default value
    start_date: Optional[str] = None
    # Define startDate schema field with type Optional[str] and default value
    startDate: Optional[str] = None
    # Define end_date schema field with type Optional[str] and default value
    end_date: Optional[str] = None
    # Define endDate schema field with type Optional[str] and default value
    endDate: Optional[str] = None
    # Define approval_proof schema field with type Optional[str] and default value
    approval_proof: Optional[str] = None
    # Define approvalProof schema field with type Optional[str] and default value
    approvalProof: Optional[str] = None
    # Define agreement schema field with type Optional[str] and default value
    agreement: Optional[str] = None
    # Define notes schema field with type Optional[str] and default value
    notes: Optional[str] = None

# Define class ContractUpdate inheriting from BaseModel
class ContractUpdate(BaseModel):
    # Define approval_proof schema field with type Optional[str] and default value
    approval_proof: Optional[str] = None
    # Define approvalProof schema field with type Optional[str] and default value
    approvalProof: Optional[str] = None
    # Define agreement schema field with type Optional[str] and default value
    agreement: Optional[str] = None
    # Define start_date schema field with type Optional[str] and default value
    start_date: Optional[str] = None
    # Define startDate schema field with type Optional[str] and default value
    startDate: Optional[str] = None
    # Define end_date schema field with type Optional[str] and default value
    end_date: Optional[str] = None
    # Define endDate schema field with type Optional[str] and default value
    endDate: Optional[str] = None
    # Define notes schema field with type Optional[str] and default value
    notes: Optional[str] = None
