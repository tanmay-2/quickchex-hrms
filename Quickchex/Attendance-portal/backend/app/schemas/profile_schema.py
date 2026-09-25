from pydantic import BaseModel, validator
from typing import Optional
from datetime import date

class ProfileUpdateSchema(BaseModel):

    # ================= PERSONAL =================
    emp_code: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None

    mobile: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    marital_status: Optional[str] = None
    pan: Optional[str] = None
    aadhar: Optional[str] = None

    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    family_contact: Optional[str] = None

    address1: Optional[str] = None
    address2: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None

    # ================= EMPLOYMENT =================
    joining_date: Optional[date] = None
    employment_type: Optional[str] = None
    skill_level: Optional[str] = None

    emp_effective_from: Optional[date] = None
    emp_effective_to: Optional[date] = None
    confirmation_due: Optional[date] = None
    confirmation_date: Optional[date] = None

    employment_status: Optional[str] = None

    job_effective_from: Optional[date] = None
    job_effective_to: Optional[date] = None   # ✅ FIXED TYPO

    location: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    reporting_supervisor: Optional[str] = None

    role: Optional[str] = None

    # ================= STATUTORY =================
    pf_applicable: Optional[bool] = None
    esic_applicable: Optional[bool] = None
    pt_applicable: Optional[bool] = None
    lwf_applicable: Optional[bool] = None
    it_applicable: Optional[bool] = None
    gratuity_applicable: Optional[bool] = None
    nps_applicable: Optional[bool] = None

    pran_number: Optional[str] = None
    tax_regime: Optional[str] = None

    tax_regime_updated_at: Optional[date] = None
    tax_updated_by: Optional[str] = None   # ✅ ADDED

    decimal_rates_allowed: Optional[bool] = None
    tax_no_on_pan: Optional[bool] = None

    

    # ================= CLEAN EMPTY VALUES =================
    @validator("*", pre=True)
    def empty_to_none(cls, v):
        if v == "":
            return None
        return v
    

class TeamMemberResponse(BaseModel):
    emp_code: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    designation: Optional[str] = None
    mobile_no: Optional[str] = None

    class Config:
        from_attributes = True