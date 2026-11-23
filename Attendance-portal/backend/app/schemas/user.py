# ==============================================================================
# QUICKCHEX HRMS BACKEND - USER.PY
# Path: Attendance-portal/backend/app/schemas/user.py
# Purpose: Pydantic data validation and serialization schema definitions for 'user'.
# Classes / Data Models:
#   • UserBase
#   • UserCreate
#   • UserResponse
#   • UserLogin
#   • VerifyOtp
# ==============================================================================

# Import BaseModel, EmailStr, Field from pydantic for module operations
from pydantic import BaseModel, EmailStr, Field
# Import Optional from typing for module operations
from typing import Optional


# 🔹 Base Schema
class UserBase(BaseModel):
    name: str = Field(..., min_length=2)   # ✅ use name everywhere
    # Define email schema field with type EmailStr
    email: EmailStr
    # Define role schema field with type str
    role: str


# 🔹 Create Schema
class UserCreate(BaseModel):
    # Define name schema field with type str and default value
    name: str = Field(..., min_length=2)
    # Define email schema field with type EmailStr
    email: EmailStr
    # Placeholder statement performing no operation
    password: str = Field(..., min_length=6)
    # Define role schema field with type str
    role: str


# 🔹 Response Schema (🔥 FIXED)
class UserResponse(BaseModel):
    # Define id schema field with type int
    id: int
    name: str               # ✅ matches service
    # Define email schema field with type EmailStr
    email: EmailStr
    role: str | None        # safe for null
    # Define is_active schema field with type bool
    is_active: bool

    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True


# 🔹 Login Schema
class UserLogin(BaseModel):
    # Define email schema field with type EmailStr
    email: EmailStr


# 🔹 OTP Verify Schema
class VerifyOtp(BaseModel):
    # Define email schema field with type EmailStr
    email: EmailStr
    # Define otp schema field with type str
    otp: str