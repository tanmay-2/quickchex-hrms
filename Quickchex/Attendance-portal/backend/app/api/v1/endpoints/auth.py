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
 
 
@router.post("/recover-password")
def recover_password(request: ResetPasswordSchema, db: Session = Depends(get_db)):
    clean_identifier = (request.email or "").strip()
    new_pwd = (request.new_password or "").strip()

    if not clean_identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or Employee ID is required."
        )

    if not new_pwd or len(new_pwd) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    if new_pwd == "Welcome@123":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the default password 'Welcome@123'. Please choose a unique password."
        )

    # Find all matching user profiles by email or emp_code (case-insensitive)
    matched_profiles = []
    if "@" in clean_identifier:
        matched_profiles = db.query(Profile).filter(Profile.email.ilike(clean_identifier)).all()
        if not matched_profiles and "@laefera.co" in clean_identifier.lower():
            alt_email = clean_identifier.lower().replace("@laefera.co", "@laesfera.co")
            matched_profiles = db.query(Profile).filter(Profile.email.ilike(alt_email)).all()
        elif not matched_profiles and "@laesfera.co" in clean_identifier.lower():
            alt_email = clean_identifier.lower().replace("@laesfera.co", "@laefera.co")
            matched_profiles = db.query(Profile).filter(Profile.email.ilike(alt_email)).all()
        if not matched_profiles:
            matched_profiles = db.query(Profile).filter(Profile.emp_code.ilike(clean_identifier)).all()
    else:
        matched_profiles = db.query(Profile).filter(Profile.emp_code.ilike(clean_identifier)).all()
        if not matched_profiles:
            matched_profiles = db.query(Profile).filter(Profile.email.ilike(clean_identifier)).all()

    if not matched_profiles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with identifier '{clean_identifier}' does not exist."
        )

    hashed_new_pwd = hash_password(new_pwd)
    for p in matched_profiles:
        p.password_hash = hashed_new_pwd
        p.must_change_password = False

    db.commit()

    primary_user = matched_profiles[0]
    return {
        "message": "Password updated successfully",
        "email": primary_user.email,
        "emp_code": primary_user.emp_code,
        "must_change_password": False
    }

@router.post("/set-first-password")
def set_first_password(request: ResetPasswordSchema, db: Session = Depends(get_db)):
    return recover_password(request, db)
 
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
 