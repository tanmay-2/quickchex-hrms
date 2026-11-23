# ==============================================================================
# QUICKCHEX HRMS BACKEND - PROFILE_SCHEMA.PY
# Path: Attendance-portal/backend/app/schemas/profile_schema.py
# Purpose: Pydantic data validation and serialization schema definitions for 'profile_schema'.
# Classes / Data Models:
#   • ProfileUpdateSchema
#   • TeamMemberResponse
# ==============================================================================

# Import BaseModel, validator from pydantic for module operations
from pydantic import BaseModel, validator
# Import Optional, Any from typing for module operations
from typing import Optional, Any
# Import date from datetime for module operations
from datetime import date

# Define class ProfileUpdateSchema inheriting from BaseModel
class ProfileUpdateSchema(BaseModel):

    # ================= PERSONAL =================
    emp_code: Optional[str] = None
    # Define first_name schema field with type Optional[str] and default value
    first_name: Optional[str] = None
    # Define middle_name schema field with type Optional[str] and default value
    middle_name: Optional[str] = None
    # Define last_name schema field with type Optional[str] and default value
    last_name: Optional[str] = None
    # Define name schema field with type Optional[str] and default value
    name: Optional[str] = None
    # Define email schema field with type Optional[str] and default value
    email: Optional[str] = None

    # Define mobile schema field with type Optional[str] and default value
    mobile: Optional[str] = None
    # Define phone schema field with type Optional[str] and default value
    phone: Optional[str] = None
    # Define mobile_no schema field with type Optional[str] and default value
    mobile_no: Optional[str] = None
    # Define gender schema field with type Optional[str] and default value
    gender: Optional[str] = None
    # Define dob schema field with type Optional[Any] and default value
    dob: Optional[Any] = None
    # Define marital_status schema field with type Optional[str] and default value
    marital_status: Optional[str] = None
    # Define blood_group schema field with type Optional[str] and default value
    blood_group: Optional[str] = None
    # Define pan schema field with type Optional[str] and default value
    pan: Optional[str] = None
    # Define aadhar schema field with type Optional[str] and default value
    aadhar: Optional[str] = None

    # Define father_name schema field with type Optional[str] and default value
    father_name: Optional[str] = None
    # Define mother_name schema field with type Optional[str] and default value
    mother_name: Optional[str] = None
    # Define family_contact schema field with type Optional[str] and default value
    family_contact: Optional[str] = None

    # Define address1 schema field with type Optional[str] and default value
    address1: Optional[str] = None
    # Define address2 schema field with type Optional[str] and default value
    address2: Optional[str] = None
    # Define country schema field with type Optional[str] and default value
    country: Optional[str] = None
    # Define state schema field with type Optional[str] and default value
    state: Optional[str] = None
    # Define city schema field with type Optional[str] and default value
    city: Optional[str] = None
    # Define pincode schema field with type Optional[str] and default value
    pincode: Optional[str] = None

    # ================= EMPLOYMENT =================
    joining_date: Optional[Any] = None
    # Define joined schema field with type Optional[Any] and default value
    joined: Optional[Any] = None
    # Define employment_type schema field with type Optional[str] and default value
    employment_type: Optional[str] = None
    # Define type schema field with type Optional[str] and default value
    type: Optional[str] = None
    # Define skill_level schema field with type Optional[str] and default value
    skill_level: Optional[str] = None

    # Define emp_effective_from schema field with type Optional[Any] and default value
    emp_effective_from: Optional[Any] = None
    # Define emp_effective_to schema field with type Optional[Any] and default value
    emp_effective_to: Optional[Any] = None
    # Define confirmation_due schema field with type Optional[Any] and default value
    confirmation_due: Optional[Any] = None
    # Define confirmation_date schema field with type Optional[Any] and default value
    confirmation_date: Optional[Any] = None

    # Define employment_status schema field with type Optional[str] and default value
    employment_status: Optional[str] = None
    # Define status schema field with type Optional[str] and default value
    status: Optional[str] = None

    # Define job_effective_from schema field with type Optional[Any] and default value
    job_effective_from: Optional[Any] = None
    # Define job_effective_to schema field with type Optional[Any] and default value
    job_effective_to: Optional[Any] = None

    # Define location schema field with type Optional[str] and default value
    location: Optional[str] = None
    # Define designation schema field with type Optional[str] and default value
    designation: Optional[str] = None
    # Define department schema field with type Optional[str] and default value
    department: Optional[str] = None
    # Define reporting_supervisor schema field with type Optional[str] and default value
    reporting_supervisor: Optional[str] = None

    # Define role schema field with type Optional[str] and default value
    role: Optional[str] = None
    # Define about schema field with type Optional[str] and default value
    about: Optional[str] = None

    # ================= STATUTORY =================
    pf_applicable: Optional[bool] = None
    # Define esic_applicable schema field with type Optional[bool] and default value
    esic_applicable: Optional[bool] = None
    # Define pt_applicable schema field with type Optional[bool] and default value
    pt_applicable: Optional[bool] = None
    # Define lwf_applicable schema field with type Optional[bool] and default value
    lwf_applicable: Optional[bool] = None
    # Define it_applicable schema field with type Optional[bool] and default value
    it_applicable: Optional[bool] = None
    # Define gratuity_applicable schema field with type Optional[bool] and default value
    gratuity_applicable: Optional[bool] = None
    # Define nps_applicable schema field with type Optional[bool] and default value
    nps_applicable: Optional[bool] = None

    # Define pran_number schema field with type Optional[str] and default value
    pran_number: Optional[str] = None
    # Define tax_regime schema field with type Optional[str] and default value
    tax_regime: Optional[str] = None

    # Define tax_regime_updated_at schema field with type Optional[Any] and default value
    tax_regime_updated_at: Optional[Any] = None
    # Define tax_updated_by schema field with type Optional[str] and default value
    tax_updated_by: Optional[str] = None

    # Define decimal_rates_allowed schema field with type Optional[bool] and default value
    decimal_rates_allowed: Optional[bool] = None
    # Define tax_no_on_pan schema field with type Optional[bool] and default value
    tax_no_on_pan: Optional[bool] = None

    

    # ================= EXTRA CONTACT / PERSONAL =================
    blood_group: Optional[str] = None
    # Define personal_email schema field with type Optional[str] and default value
    personal_email: Optional[str] = None
    # Define current_address schema field with type Optional[str] and default value
    current_address: Optional[str] = None
    # Define permanent_address schema field with type Optional[str] and default value
    permanent_address: Optional[str] = None
    # Define emergency_name schema field with type Optional[str] and default value
    emergency_name: Optional[str] = None
    # Define emergency_contact_name schema field with type Optional[str] and default value
    emergency_contact_name: Optional[str] = None
    # Define emergency_contact_relation schema field with type Optional[str] and default value
    emergency_contact_relation: Optional[str] = None
    # Define emergency_phone schema field with type Optional[str] and default value
    emergency_phone: Optional[str] = None
    # Define emergency_contact_phone schema field with type Optional[str] and default value
    emergency_contact_phone: Optional[str] = None

    # Define class Config to encapsulate data and behavior
    class Config:
        # Set extra variable to store extra value
        extra = "allow"

    # ================= CLEAN EMPTY VALUES =================
    @validator("*", pre=True)
    # Define empty_to_none function to handle empty to none
    def empty_to_none(cls, v):
        # Evaluate condition to control execution branch
        if v == "":
            # Return computed result or response payload to caller
            return None
        # Return computed result or response payload to caller
        return v
    

# Define class TeamMemberResponse inheriting from BaseModel
class TeamMemberResponse(BaseModel):
    # Define emp_code schema field with type str
    emp_code: str
    # Define first_name schema field with type Optional[str] and default value
    first_name: Optional[str] = None
    # Define last_name schema field with type Optional[str] and default value
    last_name: Optional[str] = None
    # Define designation schema field with type Optional[str] and default value
    designation: Optional[str] = None
    # Define mobile_no schema field with type Optional[str] and default value
    mobile_no: Optional[str] = None

    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True