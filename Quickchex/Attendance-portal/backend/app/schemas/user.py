from pydantic import BaseModel, EmailStr, Field
from typing import Optional


# 🔹 Base Schema
class UserBase(BaseModel):
    name: str = Field(..., min_length=2)   # ✅ use name everywhere
    email: EmailStr
    role: str


# 🔹 Create Schema
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str


# 🔹 Response Schema (🔥 FIXED)
class UserResponse(BaseModel):
    id: int
    name: str               # ✅ matches service
    email: EmailStr
    role: str | None        # safe for null
    is_active: bool

    class Config:
        from_attributes = True


# 🔹 Login Schema
class UserLogin(BaseModel):
    email: EmailStr


# 🔹 OTP Verify Schema
class VerifyOtp(BaseModel):
    email: EmailStr
    otp: str