# ==============================================================================
# USER LOGIN AND PASSWORD SYSTEM (auth.py)
# ==============================================================================
# This file handles everything about logging into the system:
# 1. Typing your email and password to log in.
# 2. Typing the 6-digit OTP code sent to your phone or email.
# 3. Changing or resetting your password.
# 4. Logging in with your company Microsoft work account.
# ==============================================================================

# Import APIRouter, Depends, HTTPException, status from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, status, Request
import os
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import  from app.schemas.auth for module operations
from app.schemas.auth import (
    # Execute statement to process data and maintain state
    LoginRequest,
    # Execute statement to process data and maintain state
    OTPVerifyRequest,
    # Execute statement to process data and maintain state
    ResetPasswordSchema,
    # Execute statement to process data and maintain state
    SSORequest,
    # Execute statement to process data and maintain state
    SSOCallbackRequest
# Execute statement to process data and maintain state
)
# Import  from app.services.auth_service for module operations
from app.services.auth_service import (
    # Execute statement to process data and maintain state
    login_user,
    # Execute statement to process data and maintain state
    verify_user_otp,
    # Execute statement to process data and maintain state
    reset_user_password,
    # Execute statement to process data and maintain state
    sso_send_otp,
    # Execute statement to process data and maintain state
    get_microsoft_sso_url,
    # Execute statement to process data and maintain state
    handle_microsoft_sso_callback
# Execute statement to process data and maintain state
)
# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user
# Import hash_password from app.core.security for module operations
from app.core.security import hash_password
# Import resend_user_otp from app.services.otp_service for module operations
from app.services.otp_service import resend_user_otp
# Import ResendOTPRequest from app.schemas.otp_schema for module operations
from app.schemas.otp_schema import ResendOTPRequest

# Set router variable to store router value
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
    # Check if target condition is false or object is missing
    if not new_pwd or len(new_pwd) < 6:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_400_BAD_REQUEST,
            # Set detail variable to store detail value
            detail="New password must be at least 6 characters long."
        # Execute statement to process data and maintain state
        )

    # Step 2: Stop them from using the default starting password 'Welcome@123'
    if new_pwd in ["Welcome@123"]:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_400_BAD_REQUEST,
            # Set detail variable to store detail value
            detail="New password cannot be the default password 'Welcome@123'. Please choose a unique password."
        # Execute statement to process data and maintain state
        )

    # Step 3: Scramble the password so it is safely locked in the database
    hashed_new_pwd = hash_password(new_pwd)
    # Execute statement to process data and maintain state
    user.password_hash = hashed_new_pwd
    # Execute statement to process data and maintain state
    user.must_change_password = False

    # Step 4: Update the password in the user accounts table as well
    from app.models.user import User
    # Initiate database query on specified model
    user_records = db.query(User).filter(
        # Execute statement to process data and maintain state
        (User.empcode.ilike(user.emp_code)) | (User.email.ilike(user.email))
    # Execute statement to process data and maintain state
    ).all()
    # Iterate through items in sequence loop
    for user_record in user_records:
        # Execute statement to process data and maintain state
        user_record.password = hashed_new_pwd

    # Step 5: Save all changes to the database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(user)
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "message": "Password updated successfully",
        # Execute statement to process data and maintain state
        "email": user.email,
        # Execute statement to process data and maintain state
        "emp_code": user.emp_code,
        # Execute statement to process data and maintain state
        "must_change_password": False
    # Execute statement to process data and maintain state
    }


# ==============================================================================
# HELPER: Identity Ownership Guard
# ==============================================================================
def _require_matching_user(user: Profile, identifier: str):
    """Makes sure a user can only change their own password, not anyone else's account."""
    clean_identifier = identifier.strip().casefold()
    # Set allowed_identifiers variable to store allowed identifiers value
    allowed_identifiers = {
        # Invoke value.casefold to perform operational action
        value.casefold()
        # Iterate through items in sequence loop
        for value in (user.email, user.emp_code)
        # Evaluate condition to control execution branch
        if value
    # Execute statement to process data and maintain state
    }
    # Check if target condition is false or object is missing
    if clean_identifier not in allowed_identifiers:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_403_FORBIDDEN,
            # Set detail variable to store detail value
            detail="You can only change the password for your own account."
        # Execute statement to process data and maintain state
        )


# ==============================================================================
# 🔑 ENDPOINT: Recover Forgotten Password
# ==============================================================================
@router.post("/recover-password")
# Define recover_password function to handle recover password
def recover_password(
    # Define request schema field with type ResetPasswordSchema,
    request: ResetPasswordSchema,
    # Define current_user schema field with type Profile and default value
    current_user: Profile = Depends(get_current_user),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
# Execute statement to process data and maintain state
):
    """Allows an authenticated user to reset their password after verifying identity."""
    _require_matching_user(current_user, request.email)
    # Return computed result or response payload to caller
    return _update_authenticated_password(db, current_user, request.new_password)


# ==============================================================================
# 🔑 ENDPOINT: First-Time Login Password Change
# ==============================================================================
@router.post("/set-first-password")
# Define set_first_password function to handle set first password
def set_first_password(
    # Define request schema field with type ResetPasswordSchema,
    request: ResetPasswordSchema,
    # Define current_user schema field with type Profile and default value
    current_user: Profile = Depends(get_current_user),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
# Execute statement to process data and maintain state
):
    """Forces employees to change their temporary 'Welcome@123' password on initial login."""
    _require_matching_user(current_user, request.email)
    # Return computed result or response payload to caller
    return _update_authenticated_password(db, current_user, request.new_password)


# ==============================================================================
# 🚪 ENDPOINT: User Login (Step 1: Credentials Verification)
# ==============================================================================
@router.post("/login")
# Define login function to handle login
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Validates user email/emp_code and password:
    - If valid, generates a 6-digit OTP code, emails it via Microsoft Graph,
      and returns an OTP challenge requiring 2FA verification.
    """
    return login_user(
        # Set db variable to store db value
        db=db,
        # Set email variable to store email value
        email=data.email,
        # Placeholder statement performing no operation
        password=data.password
    # Execute statement to process data and maintain state
    )


# ==============================================================================
# 🛡️ ENDPOINT: Verify 2FA OTP (Step 2: Session Token Issuance)
# ==============================================================================
@router.post("/verify-otp")
# Define verify_otp function to handle verify otp
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
# Define resend_otp function to handle resend otp
def resend_otp(data: ResendOTPRequest, db: Session = Depends(get_db)):
    """Generates a fresh 6-digit OTP and dispatches a new email to the user."""
    return resend_user_otp(db, email=data.email)


# ==============================================================================
# ☁️ ENDPOINTS: Single Sign-On (SSO) & Microsoft Azure OAuth2
# ==============================================================================
@router.post("/sso/send-otp")
# Define sso_send_otp_route function to handle sso send otp route
def sso_send_otp_route(data: SSORequest, db: Session = Depends(get_db)):
    """Generates an SSO OTP challenge for organizational corporate emails."""
    return sso_send_otp(db, data.email)


# Define HTTP POST route endpoint handler
@router.post("/sso/direct")
@router.post("/token-exchange")
def sso_direct_route(data: SSORequest, request: Request, db: Session = Depends(get_db)):
    """
    Direct SSO & Token Exchange entrypoint:
    1. Machine-to-Machine Bot Authentication: When X-Bot-Api-Secret is supplied,
       verifies the employee's corporate email and returns an employee-scoped HRMS JWT
       immediately without sending an OTP email or requiring user credentials.
    2. Interactive Browser User: Dispatches a 6-digit OTP challenge to the employee email.
    """
    bot_secret = request.headers.get("x-bot-api-secret") or data.bot_secret
    valid_secrets = [
        s for s in [
            os.getenv("BOT_API_SECRET"),
            os.getenv("BOT_APP_PASSWORD"),
            os.getenv("SECRET_KEY")
        ] if s
    ]
    if bot_secret and any(bot_secret.strip() == vs.strip() for vs in valid_secrets):
        from app.core.security import create_access_token
        clean_email = data.email.strip()
        user = db.query(Profile).filter(Profile.email.ilike(clean_email)).first()
        if not user and "@" not in clean_email:
            user = db.query(Profile).filter(Profile.emp_code.ilike(clean_email)).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"Employee profile for email or code '{clean_email}' not found in HRMS"
            )

        role_clean = (user.role or "employee").strip().lower()
        token = create_access_token({
            "sub": user.email,
            "role": role_clean,
            "emp_code": user.emp_code,
        })
        return {
            "access_token": token,
            "token_type": "bearer",
            "emp_code": user.emp_code,
            "email": user.email,
            "role": role_clean,
            "user_name": user.full_name or user.name or user.email,
            "expires_in": 86400
        }

    return sso_send_otp(db, data.email)


# Define HTTP GET route endpoint handler
@router.get("/sso/microsoft/url")
# Define sso_microsoft_url_route function to handle sso microsoft url route
def sso_microsoft_url_route(redirect_uri: str = "http://localhost:5173/login"):
    """Returns the official Microsoft Azure Active Directory OAuth2 login redirect URL."""
    return get_microsoft_sso_url(redirect_uri)


# Define HTTP POST route endpoint handler
@router.post("/sso/microsoft/callback")
# Define sso_microsoft_callback_route function to handle sso microsoft callback route
def sso_microsoft_callback_route(data: SSOCallbackRequest, db: Session = Depends(get_db)):
    """Exchanges Microsoft authorization code for access tokens, matches profile, and logs user in."""
    return handle_microsoft_sso_callback(db, data.code, data.redirect_uri)


# Define HTTP GET route endpoint handler
@router.get("/sso/microsoft/logout-url")
# Define sso_microsoft_logout_url_route function to handle sso microsoft logout url route
def sso_microsoft_logout_url_route(redirect_uri: str = "http://localhost:5173/login"):
    """Returns official Microsoft 365 logout endpoint URL to clear enterprise SSO session."""
    import os
    # Set tenant_id variable to store tenant id value
    tenant_id = os.getenv("TENANT_ID") or os.getenv("OUTLOOK_TENANT_ID") or "b292bf8e-4b06-4865-b248-a1d099b8c151"
    # Return computed result or response payload to caller
    return {
        # Specify parameter value for "logout_url": f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/logout?post_logout_redirect_uri
        "logout_url": f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/logout?post_logout_redirect_uri={redirect_uri}",
        # Execute statement to process data and maintain state
        "tenant_id": tenant_id
    # Execute statement to process data and maintain state
    }
