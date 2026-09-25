from pydantic import BaseModel
from typing import Optional
from datetime import date

class AddEmployeeSchema(BaseModel):
    emp_code: str
    first_name: str
    middle_name: Optional[str]
    last_name: str
    password: str
    email: str
    mobile: str
    role:str
    department: Optional[str]
    designation: Optional[str]

    joining_date: date
    salary: Optional[float] = None
    monthly_gross: Optional[float] = None
    annual_ctc: Optional[float] = None