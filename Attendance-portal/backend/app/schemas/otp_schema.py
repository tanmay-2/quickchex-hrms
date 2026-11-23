# ==============================================================================
# QUICKCHEX HRMS BACKEND - OTP_SCHEMA.PY
# Path: Attendance-portal/backend/app/schemas/otp_schema.py
# Purpose: Pydantic data validation and serialization schema definitions for 'otp_schema'.
# Classes / Data Models:
#   • SendOtpRequest
#   • VerifyOtpRequest
#   • ResendOTPRequest
# ==============================================================================

# Import BaseModel, EmailStr from pydantic for module operations
from pydantic import BaseModel, EmailStr
 
 
# Define class SendOtpRequest to encapsulate data and behavior
class SendOtpRequest(BaseModel):
    # Execute statement to process data and maintain state
    email: EmailStr
 
 
# Define class VerifyOtpRequest to encapsulate data and behavior
class VerifyOtpRequest(BaseModel):
    # Execute statement to process data and maintain state
    email: EmailStr
    # Execute statement to process data and maintain state
    otp: str
 
# Define class ResendOTPRequest to encapsulate data and behavior
class ResendOTPRequest(BaseModel):
    # Execute statement to process data and maintain state
    email: str
 