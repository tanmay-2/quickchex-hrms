# ==============================================================================
# USER LOGIN AND PASSWORD SYSTEM (auth.py)
# ==============================================================================
# This file handles everything about logging into the system:
# 1. Typing your email and password to log in.
# 2. Typing the 6-digit OTP code sent to your phone or email.
# 3. Changing or resetting your password.
# 4. Logging in with your company Microsoft work account.
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.profile_model import Profile
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    OTPVerifyRequest,
    ResetPasswordSchema,
    SSORequest,
    SSOCallbackRequest
)
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


# ==============================================================================
# HELPER: Update Password for Authenticated User
# ==============================================================================
def _update_authenticated_password(db: Session, user: Profile, new_password: str):
    """
    Saves a new password for the user safely:
    1. Makes sure the password has at least 6 letters/numbers.
    2. Makes sure they do not use the simple starting password 'Welcome@123'.
    3. Scrambles and locks the password so nobody can see it in plain text.
    4. Saves it into the database.
    """
    # Step 1: Make sure the new password is at least 6 characters long
    new_pwd = new_password.strip()
    if not new_pwd or len(new_pwd) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    # Step 2: Stop them from using the default starting password 'Welcome@123'
    if new_pwd in ["Welcome@123"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the default password 'Welcome@123'. Please choose a unique password."
        )

    # Step 3: Scramble the password so it is safely locked in the database
    hashed_new_pwd = hash_password(new_pwd)
    user.password_hash = hashed_new_pwd
    user.must_change_password = False

    # Step 4: Update the password in the user accounts table as well
    from app.models.user import User
    user_records = db.query(User).filter(
        (User.empcode.ilike(user.emp_code)) | (User.email.ilike(user.email))
    ).all()
    for user_record in user_records:
        user_record.password = hashed_new_pwd

    # Step 5: Save all changes to the database
    db.commit()
    db.refresh(user)
    return {
        "message": "Password updated successfully",
        "email": user.email,
        "emp_code": user.emp_code,
        "must_change_password": False
    }


# ==============================================================================
# HELPER: Identity Ownership Guard
# ==============================================================================
def _require_matching_user(user: Profile, identifier: str):
    """Makes sure a user can only change their own password, not anyone else's account."""
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


# ==============================================================================
# 🔑 ENDPOINT: Recover Forgotten Password
# ==============================================================================
@router.post("/recover-password")
def recover_password(
    request: ResetPasswordSchema,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allows an authenticated user to reset their password after verifying identity."""
    _require_matching_user(current_user, request.email)
    return _update_authenticated_password(db, current_user, request.new_password)


# ==============================================================================
# 🔑 ENDPOINT: First-Time Login Password Change
# ==============================================================================
@router.post("/set-first-password")
def set_first_password(
    request: ResetPasswordSchema,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Forces employees to change their temporary 'Welcome@123' password on initial login."""
    _require_matching_user(current_user, request.email)
    return _update_authenticated_password(db, current_user, request.new_password)


# ==============================================================================
# 🚪 ENDPOINT: User Login (Step 1: Credentials Verification)
# ==============================================================================
@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Validates user email/emp_code and password:
    - If valid, generates a 6-digit OTP code, emails it via Microsoft Graph,
      and returns an OTP challenge requiring 2FA verification.
    """
    return login_user(
        db=db,
        email=data.email,
        password=data.password
    )


# ==============================================================================
# 🛡️ ENDPOINT: Verify 2FA OTP (Step 2: Session Token Issuance)
# ==============================================================================
@router.post("/verify-otp")
def verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    """
    Validates the 6-digit OTP entered by the employee:
    - If valid and not expired (10-minute window), issues a signed JWT Bearer Token.
    """
    return verify_user_otp(db, data.email, data.otp)


# ==============================================================================
# 🔁 ENDPOINT: Resend OTP Code
# ==============================================================================
@router.post("/resend-otp")
def resend_otp(data: ResendOTPRequest, db: Session = Depends(get_db)):
    """Generates a fresh 6-digit OTP and dispatches a new email to the user."""
    return resend_user_otp(db, email=data.email)


# ==============================================================================
# ☁️ ENDPOINTS: Single Sign-On (SSO) & Microsoft Azure OAuth2
# ==============================================================================
@router.post("/sso/send-otp")
def sso_send_otp_route(data: SSORequest, db: Session = Depends(get_db)):
    """Generates an SSO OTP challenge for organizational corporate emails."""
    return sso_send_otp(db, data.email)


@router.post("/sso/direct")
def sso_direct_route(data: SSORequest, db: Session = Depends(get_db)):
    """Compatibility alias for direct SSO sign-in."""
    return sso_send_otp(db, data.email)


@router.get("/sso/microsoft/url")
def sso_microsoft_url_route(redirect_uri: str = "http://localhost:5173/login"):
    """Returns the official Microsoft Azure Active Directory OAuth2 login redirect URL."""
    return get_microsoft_sso_url(redirect_uri)


@router.post("/sso/microsoft/callback")
def sso_microsoft_callback_route(data: SSOCallbackRequest, db: Session = Depends(get_db)):
    """Exchanges Microsoft authorization code for access tokens, matches profile, and logs user in."""
    return handle_microsoft_sso_callback(db, data.code, data.redirect_uri)


@router.get("/sso/microsoft/logout-url")
def sso_microsoft_logout_url_route(redirect_uri: str = "http://localhost:5173/login"):
    """Returns official Microsoft 365 logout endpoint URL to clear enterprise SSO session."""
    import os
    tenant_id = os.getenv("TENANT_ID") or os.getenv("OUTLOOK_TENANT_ID") or "b292bf8e-4b06-4865-b248-a1d099b8c151"
    return {
        "logout_url": f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/logout?post_logout_redirect_uri={redirect_uri}",
        "tenant_id": tenant_id
    }
