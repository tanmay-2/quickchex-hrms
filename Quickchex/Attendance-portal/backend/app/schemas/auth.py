from pydantic import BaseModel, EmailStr

from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: str
    password: str

class ResetPasswordSchema(BaseModel):
    email: str
    new_password: str

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class SSORequest(BaseModel):
    email: str

class SSOCallbackRequest(BaseModel):
    code: str
    redirect_uri: str