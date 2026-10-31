# ==============================================================================
# QUICKCHEX HRMS BACKEND - OTP_SCHEMA.PY
# Path: Attendance-portal/backend/app/schemas/otp_schema.py
# Purpose: Pydantic data validation and serialization schema definitions for 'otp_schema'.
# Classes / Data Models:
#   • SendOtpRequest
#   • VerifyOtpRequest
#   • ResendOTPRequest
# ==============================================================================

from pydantic import BaseModel, EmailStr
 
 
class SendOtpRequest(BaseModel):
    email: EmailStr
 
 
class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str
 
class ResendOTPRequest(BaseModel):
    email: str
 