from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.profile_model import Profile
from app.db.session import get_db
from app.schemas.auth import LoginRequest, OTPVerifyRequest, ResetPasswordSchema, SSORequest, SSOCallbackRequest
from app.services.auth_service import (
    login_user,
    verify_user_otp,
    reset_user_password,
    sso_send_otp,
    get_microsoft_sso_url,
    handle_microsoft_sso_callback
)
from app.core.dependencies import get_current_user
from app.core.security import hash_password
from app.services.otp_service import resend_user_otp
 
from app.schemas.otp_schema import ResendOTPRequest
 
router = APIRouter()
 
 
def _update_authenticated_password(db: Session, user: Profile, new_password: str):
    new_pwd = new_password.strip()
    if not new_pwd or len(new_pwd) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    if new_pwd in ["Welcome@123"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the default password 'Welcome@123'. Please choose a unique password."
        )

    hashed_new_pwd = hash_password(new_pwd)
    user.password_hash = hashed_new_pwd
    user.must_change_password = False

    from app.models.user import User
    user_records = db.query(User).filter(
        (User.empcode.ilike(user.emp_code)) | (User.email.ilike(user.email))
    ).all()
    for user_record in user_records:
        user_record.password = hashed_new_pwd

    db.commit()
    db.refresh(user)
    return {
        "message": "Password updated successfully",
        "email": user.email,
        "emp_code": user.emp_code,
        "must_change_password": False
    }


def _require_matching_user(user: Profile, identifier: str):
    clean_identifier = identifier.strip().casefold()
    allowed_identifiers = {
        value.casefold()
        for value in (user.email, user.emp_code)
        if value
    }
    if clean_identifier not in allowed_identifiers:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change the password for your own account."
        )


@router.post("/recover-password")
def recover_password(
    request: ResetPasswordSchema,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_matching_user(current_user, request.email)
    return _update_authenticated_password(db, current_user, request.new_password)


@router.post("/set-first-password")
def set_first_password(
    request: ResetPasswordSchema,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_matching_user(current_user, request.email)
    return _update_authenticated_password(db, current_user, request.new_password)
 
@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return login_user(
        db=db,
        email=data.email,
        password=data.password
    )
 
 
 
@router.post("/verify-otp")
def verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    return verify_user_otp(db, data.email, data.otp)
 
 
 
# Add this endpoint to the Auth section
@router.post("/resend-otp")
def resend_otp(data: ResendOTPRequest, db: Session = Depends(get_db)):
    """
    Triggers the generation and emailing of a new 6-digit OTP.
    """
    return resend_user_otp(db, email=data.email)


# 🔐 SSO ENDPOINTS
@router.post("/sso/send-otp")
def sso_send_otp_route(data: SSORequest, db: Session = Depends(get_db)):
    return sso_send_otp(db, data.email)


@router.post("/sso/direct")
def sso_direct_route(data: SSORequest, db: Session = Depends(get_db)):
    return sso_send_otp(db, data.email)


@router.get("/sso/microsoft/url")
def sso_microsoft_url_route(redirect_uri: str = "http://localhost:5173/login"):
    return get_microsoft_sso_url(redirect_uri)


@router.post("/sso/microsoft/callback")
def sso_microsoft_callback_route(data: SSOCallbackRequest, db: Session = Depends(get_db)):
    return handle_microsoft_sso_callback(db, data.code, data.redirect_uri)
 