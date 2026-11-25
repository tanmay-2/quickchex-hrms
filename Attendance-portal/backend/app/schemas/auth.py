# ==============================================================================
# QUICKCHEX HRMS BACKEND - AUTH.PY
# Path: Attendance-portal/backend/app/schemas/auth.py
# Purpose: Pydantic data validation and serialization schema definitions for 'auth'.
# Classes / Data Models:
#   • LoginRequest
#   • ResetPasswordSchema
#   • OTPVerifyRequest
#   • TokenResponse
#   • SSORequest
#   • SSOCallbackRequest
# ==============================================================================

from typing import Optional
# Import BaseModel, EmailStr from pydantic for module operations
from pydantic import BaseModel, EmailStr

# Define class LoginRequest inheriting from BaseModel
class LoginRequest(BaseModel):
    # Define email schema field with type str
    email: str
    # Placeholder statement performing no operation
    password: str

# Define class ResetPasswordSchema inheriting from BaseModel
class ResetPasswordSchema(BaseModel):
    # Define email schema field with type str
    email: str
    # Define new_password schema field with type str
    new_password: str

# Define class OTPVerifyRequest inheriting from BaseModel
class OTPVerifyRequest(BaseModel):
    # Define email schema field with type str
    email: str
    # Define otp schema field with type str
    otp: str

# Define class TokenResponse inheriting from BaseModel
class TokenResponse(BaseModel):
    # Define access_token schema field with type str
    access_token: str
    # Define token_type schema field with type str and default value
    token_type: str = "bearer"

# Define class SSORequest inheriting from BaseModel
class SSORequest(BaseModel):
    # Define email schema field with type str
    email: str
    entra_oid: Optional[str] = None
    bot_secret: Optional[str] = None

# Define class SSOCallbackRequest inheriting from BaseModel
class SSOCallbackRequest(BaseModel):
    # Define code schema field with type str
    code: str
    # Define redirect_uri schema field with type str
    redirect_uri: str