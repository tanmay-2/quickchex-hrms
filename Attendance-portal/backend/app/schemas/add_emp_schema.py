from pydantic import BaseModel, EmailStr
from typing import Optional, Union
from datetime import date

class AddEmployeeSchema(BaseModel):
    emp_code: str
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    password: Optional[str] = "Admin@123"
    email: str
    mobile: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "employee"
    department: Optional[str] = None
    designation: Optional[str] = None
    employment_type: Optional[str] = "Full-time"
    type: Optional[str] = "Full-time"
    location: Optional[str] = "Mumbai, IN"
    joining_date: Optional[Union[date, str]] = None
    joined: Optional[Union[date, str]] = None
    about: Optional[str] = None
    salary: Optional[float] = None
    monthly_gross: Optional[float] = None
    annual_ctc: Optional[float] = None