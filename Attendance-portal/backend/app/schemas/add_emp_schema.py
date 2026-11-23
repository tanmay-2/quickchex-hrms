# ==============================================================================
# QUICKCHEX HRMS BACKEND - ADD_EMP_SCHEMA.PY
# Path: Attendance-portal/backend/app/schemas/add_emp_schema.py
# Purpose: Pydantic data validation and serialization schema definitions for 'add_emp_schema'.
# Classes / Data Models:
#   • AddEmployeeSchema
# ==============================================================================

# Import BaseModel, EmailStr from pydantic for module operations
from pydantic import BaseModel, EmailStr
# Import Optional, Union from typing for module operations
from typing import Optional, Union
# Import date from datetime for module operations
from datetime import date

# Define class AddEmployeeSchema inheriting from BaseModel
class AddEmployeeSchema(BaseModel):
    # Define emp_code schema field with type str
    emp_code: str
    # Define first_name schema field with type Optional[str] and default value
    first_name: Optional[str] = None
    # Define middle_name schema field with type Optional[str] and default value
    middle_name: Optional[str] = None
    # Define last_name schema field with type Optional[str] and default value
    last_name: Optional[str] = None
    # Define name schema field with type Optional[str] and default value
    name: Optional[str] = None
    # Placeholder statement performing no operation
    password: Optional[str] = "Admin@123"
    # Define email schema field with type str
    email: str
    # Define mobile schema field with type Optional[str] and default value
    mobile: Optional[str] = None
    # Define phone schema field with type Optional[str] and default value
    phone: Optional[str] = None
    # Define role schema field with type Optional[str] and default value
    role: Optional[str] = "employee"
    # Define department schema field with type Optional[str] and default value
    department: Optional[str] = None
    # Define designation schema field with type Optional[str] and default value
    designation: Optional[str] = None
    # Define employment_type schema field with type Optional[str] and default value
    employment_type: Optional[str] = "Full-time"
    # Define type schema field with type Optional[str] and default value
    type: Optional[str] = "Full-time"
    # Define location schema field with type Optional[str] and default value
    location: Optional[str] = "Mumbai, IN"
    # Define joining_date schema field with type Optional[Union[date, str]] and default value
    joining_date: Optional[Union[date, str]] = None
    # Define joined schema field with type Optional[Union[date, str]] and default value
    joined: Optional[Union[date, str]] = None
    # Define about schema field with type Optional[str] and default value
    about: Optional[str] = None
    # Define salary schema field with type Optional[float] and default value
    salary: Optional[float] = None
    # Define monthly_gross schema field with type Optional[float] and default value
    monthly_gross: Optional[float] = None
    # Define annual_ctc schema field with type Optional[float] and default value
    annual_ctc: Optional[float] = None
    # Define reporting_supervisor schema field with type Optional[str] and default value
    reporting_supervisor: Optional[str] = None
    # Define manager schema field with type Optional[str] and default value
    manager: Optional[str] = None
    # Define manager_code schema field with type Optional[str] and default value
    manager_code: Optional[str] = None