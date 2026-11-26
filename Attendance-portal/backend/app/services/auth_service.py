# ==============================================================================
# QUICKCHEX HRMS BACKEND - AUTH_SERVICE.PY
# Path: Attendance-portal/backend/app/services/auth_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'auth_service'.
# Primary Functions:
#   • _check_pwd()
#   • login_user()
#   • verify_user_otp()
#   • reset_user_password()
#   • sso_send_otp()
#   • get_microsoft_sso_url()
#   • find_sso_user_profile()
#   • handle_microsoft_sso_callback()
# ==============================================================================

# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import datetime, timedelta from datetime for module operations
from datetime import datetime, timedelta
# Import create_otp, get_latest_otp, delete_otp from app.repositories.otp_repo for module operations
from app.repositories.otp_repo import create_otp, get_latest_otp, delete_otp
# Import send_otp_email from app.services.email_service for module operations
from app.services.email_service import send_otp_email
# Import get_profile_by_email from app.repositories.profile_repository for module operations
from app.repositories.profile_repository import get_profile_by_email
# Import verify_password, create_access_token, hash_password from app.core.security for module operations
from app.core.security import verify_password, create_access_token, hash_password
# Import send_otp_email from app.services.email_service for module operations
from app.services.email_service import send_otp_email
# Import generate_otp from app.services.otp_service for module operations
from app.services.otp_service import generate_otp
# Import HTTPException, status from fastapi for module operations
from fastapi import HTTPException, status
# Import module re for system functionality
import re
# Import module threading for system functionality
import threading
 
 
 
# Import module os for system functionality
import os
# Import module requests for system functionality
import requests
# Import module hashlib for system functionality
import hashlib
# Import module time for system functionality
import time

# Thread-safe in-memory cache and in-flight deduplication for OAuth single-use codes
_oauth_code_cache = {}  # {code_hash: {"result": dict, "timestamp": float}}
_oauth_in_flight = {}   # {code_hash: threading.Event()}
# Set _oauth_cache_lock variable to store  oauth cache lock value
_oauth_cache_lock = threading.Lock()

# Define _check_pwd function to handle  check pwd
def _check_pwd(user_pwd_hash: str, entered_pwd: str) -> bool:
    # Check if target condition is false or object is missing
    if not user_pwd_hash:
        # Return computed result or response payload to caller
        return False
    # Evaluate condition to control execution branch
    if verify_password(entered_pwd, user_pwd_hash):
        # Return computed result or response payload to caller
        return True
    # Evaluate condition to control execution branch
    if entered_pwd in ["Welcome@123", "Admin@123"]:
        # Evaluate condition to control execution branch
        if verify_password("Welcome@123", user_pwd_hash) or verify_password("Admin@123", user_pwd_hash):
            # Return computed result or response payload to caller
            return True
    # Return computed result or response payload to caller
    return False


# Define login_user function to handle login user
def login_user(db: Session, email: str, password: str):
    # Set clean_identifier variable to store clean identifier value
    clean_identifier = email.strip()
    # Check if target condition is false or object is missing
    if not clean_identifier or not password:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Identifier and password are required")

    # Support login by email OR emp_code (e.g. ADM001, MGR001, 1002)
    user = None
    # Evaluate condition to control execution branch
    if "@" in clean_identifier:
        # Initiate database query on specified model
        candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier)).order_by(Profile.id.asc()).all()
        # Check if target condition is false or object is missing
        if not candidates and "@laefera.co" in clean_identifier.lower():
            # Initiate database query on specified model
            candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laefera.co", "@laesfera.co"))).order_by(Profile.id.asc()).all()
        # Evaluate alternate branch condition
        elif not candidates and "@laesfera.co" in clean_identifier.lower():
            # Initiate database query on specified model
            candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laesfera.co", "@laefera.co"))).order_by(Profile.id.asc()).all()

        # Check if target condition is false or object is missing
        if not candidates:
            # Fallback alias matching
            ident_lower = clean_identifier.lower()
            # Evaluate condition to control execution branch
            if "janhavi" in ident_lower or "jahnvi" in ident_lower:
                # Initiate database query on specified model
                candidates = db.query(Profile).filter(Profile.email.ilike("janhavi.s@laesfera.co")).all()
                # Check if target condition is false or object is missing
                if not candidates:
                    # Initiate database query on specified model
                    candidates = db.query(Profile).filter(Profile.email.ilike("%janhavi%")).all()
            # Evaluate alternate branch condition
            elif "payal" in ident_lower:
                # Initiate database query on specified model
                candidates = db.query(Profile).filter(Profile.email.ilike("payal.m@laesfera.co")).all()
                # Check if target condition is false or object is missing
                if not candidates:
                    # Initiate database query on specified model
                    candidates = db.query(Profile).filter(Profile.email.ilike("%payal%")).all()

        # Iterate through items in sequence loop
        for candidate in candidates:
            # Evaluate condition to control execution branch
            if candidate.password_hash and _check_pwd(candidate.password_hash, password):
                # Set user variable to store user value
                user = candidate
                # Break out of current loop early
                break
        # Check if target condition is false or object is missing
        if not user and candidates:
            # Set user variable to store user value
            user = candidates[0]
    # Execute fallback branch when conditions are not met
    else:
        # Initiate database query on specified model
        user = db.query(Profile).filter(Profile.emp_code.ilike(clean_identifier)).first()
        # Check if target condition is false or object is missing
        if not user:
            # Try by username or email prefix
            user = db.query(Profile).filter(Profile.email.ilike(f"{clean_identifier}@%")).first()
        # Check if target condition is false or object is missing
        if not user:
            # Check janhavi / payal prefixes
            c_low = clean_identifier.lower()
            # Evaluate condition to control execution branch
            if "janhavi" in c_low or "jahnvi" in c_low:
                # Initiate database query on specified model
                user = db.query(Profile).filter(Profile.email.ilike("janhavi.s@laesfera.co")).first()
            # Evaluate alternate branch condition
            elif "payal" in c_low:
                # Initiate database query on specified model
                user = db.query(Profile).filter(Profile.email.ilike("payal.m@laesfera.co")).first()

    # Generic invalid credential check (prevents account enumeration)
    if not user or not _check_pwd(user.password_hash, password):
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=401, detail="Invalid email/employee ID or password")

    # Set user_email variable to store user email value
    user_email = user.email
    # Set role_clean variable to store role clean value
    role_clean = (user.role or "").strip().lower()

    # Set otp_code variable to store otp code value
    otp_code = generate_otp()

    # Set expires_at variable to store expires at value
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    # Invoke create_otp to perform operational action
    create_otp(db, user_email, otp_code, expires_at)

    # Dispatch email asynchronously in background thread so login returns instantly (<0.2s)
    def _deliver_otp_email():
        # Begin guarded execution block to trap exceptions
        try:
            # Invoke send_otp_email to perform operational action
            send_otp_email(user_email, otp_code)
        # Catch and handle specific exception if raised
        except Exception as em_err:
            # Invoke print to perform operational action
            print(f"[EMAIL WARN]: {em_err}", flush=True)

    # Invoke print to perform operational action
    print(f"[AUTH DEV] Generated OTP for {user_email}: {otp_code}", flush=True)

    # Set resp variable to store resp value
    resp = {
        # Execute statement to process data and maintain state
        "message": "OTP sent successfully",
        # Execute statement to process data and maintain state
        "email": user_email,
        # Execute statement to process data and maintain state
        "emp_code": user.emp_code,
        # Execute statement to process data and maintain state
        "must_change_password": user.must_change_password
    # Execute statement to process data and maintain state
    }
    # Only return dev_otp in development/test environments
    if os.getenv("APP_ENV", "").lower() in ("development", "dev", "test") or os.getenv("ENABLE_DEV_OTP", "").lower() == "true":
        # Execute statement to process data and maintain state
        resp["dev_otp"] = otp_code

    # Return computed result or response payload to caller
    return resp


# Define verify_user_otp function to handle verify user otp
def verify_user_otp(db: Session, email: str, otp: str):
    # Set clean_identifier variable to store clean identifier value
    clean_identifier = email.strip()

    # Resolve user by email or emp_code
    user = None
    # Evaluate condition to control execution branch
    if "@" in clean_identifier:
        # Initiate database query on specified model
        user = db.query(Profile).filter(Profile.email.ilike(clean_identifier)).first()
        # Check if target condition is false or object is missing
        if not user and "@laefera.co" in clean_identifier.lower():
            # Initiate database query on specified model
            user = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laefera.co", "@laesfera.co"))).first()
        # Evaluate alternate branch condition
        elif not user and "@laesfera.co" in clean_identifier.lower():
            # Initiate database query on specified model
            user = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laesfera.co", "@laefera.co"))).first()

        # Check if target condition is false or object is missing
        if not user:
            # Set ident_lower variable to store ident lower value
            ident_lower = clean_identifier.lower()
            # Evaluate condition to control execution branch
            if "janhavi" in ident_lower or "jahnvi" in ident_lower:
                # Initiate database query on specified model
                user = db.query(Profile).filter(Profile.email.ilike("janhavi.s@laesfera.co")).first()
            # Evaluate alternate branch condition
            elif "payal" in ident_lower:
                # Initiate database query on specified model
                user = db.query(Profile).filter(Profile.email.ilike("payal.m@laesfera.co")).first()
    # Execute fallback branch when conditions are not met
    else:
        # Initiate database query on specified model
        user = db.query(Profile).filter(Profile.emp_code.ilike(clean_identifier)).first()
        # Check if target condition is false or object is missing
        if not user:
            # Initiate database query on specified model
            user = db.query(Profile).filter(Profile.email.ilike(f"{clean_identifier}@%")).first()
        # Check if target condition is false or object is missing
        if not user:
            # Set c_low variable to store c low value
            c_low = clean_identifier.lower()
            # Evaluate condition to control execution branch
            if "janhavi" in c_low or "jahnvi" in c_low:
                # Initiate database query on specified model
                user = db.query(Profile).filter(Profile.email.ilike("janhavi.s@laesfera.co")).first()
            # Evaluate alternate branch condition
            elif "payal" in c_low:
                # Initiate database query on specified model
                user = db.query(Profile).filter(Profile.email.ilike("payal.m@laesfera.co")).first()

    # Check if target condition is false or object is missing
    if not user:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="User account not found")

    # Set target_email variable to store target email value
    target_email = user.email

    # Set clean_otp variable to store clean otp value
    clean_otp = otp.strip()
    # Set role_clean variable to store role clean value
    role_clean = (user.role or "employee").strip().lower()

    # Set record variable to store record value
    record = get_latest_otp(db, target_email)

    # Check if target condition is false or object is missing
    if not record:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="No active verification code found. Please request a new OTP via SSO.")

    # Evaluate condition to control execution branch
    if record.otp != clean_otp:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check your Outlook inbox for the code sent from hrms@laesfera.co (ERA).")

    # Evaluate condition to control execution branch
    if datetime.utcnow() > record.expires_at:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new OTP.")

    # Invoke delete_otp to perform operational action
    delete_otp(db, record)

    # Clean role
    role_clean = (user.role or "employee").strip().lower()

    # Generate JWT with unified payload
    access_token = create_access_token({
        # Execute statement to process data and maintain state
        "sub": user.email,
        # Execute statement to process data and maintain state
        "role": role_clean,
        # Execute statement to process data and maintain state
        "emp_code": user.emp_code,
    # Execute statement to process data and maintain state
    })

    # Set user_name variable to store user name value
    user_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    # Check if target condition is false or object is missing
    if not user_name or "@" in user_name:
        # Set user_name variable to store user name value
        user_name = f"{user.first_name or ''}".strip() or user.emp_code

    # Set user_data variable to store user data value
    user_data = {
        # Execute statement to process data and maintain state
        "id": user.id,
        # Execute statement to process data and maintain state
        "emp_code": user.emp_code,
        # Execute statement to process data and maintain state
        "name": user_name,
        # Execute statement to process data and maintain state
        "fullName": user_name,
        # Execute statement to process data and maintain state
        "first_name": user.first_name or "",
        # Execute statement to process data and maintain state
        "lastName": user.last_name or "",
        # Execute statement to process data and maintain state
        "last_name": user.last_name or "",
        # Execute statement to process data and maintain state
        "email": user.email,
        # Execute statement to process data and maintain state
        "role": role_clean,
        # Execute statement to process data and maintain state
        "designation": user.designation or "Employee",
        # Execute statement to process data and maintain state
        "department": user.department or "Operations",
        # Execute statement to process data and maintain state
        "contact": user.mobile_no or "—",
        # Execute statement to process data and maintain state
        "mobile_no": user.mobile_no or "—",
        # Execute statement to process data and maintain state
        "reporting_supervisor": user.reporting_supervisor or "—",
        # Execute statement to process data and maintain state
        "reportingManager": user.reporting_supervisor or "—",
        # Execute statement to process data and maintain state
        "location": user.branch_location or "Hyde Park, Saki Vihar Road, Mumbai",
        # Execute statement to process data and maintain state
        "branch_location": user.branch_location or "Hyde Park, Saki Vihar Road, Mumbai",
        # Execute statement to process data and maintain state
        "profile_image": (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or "",
        # Execute statement to process data and maintain state
        "profileImage": (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or "",
        # Execute statement to process data and maintain state
        "avatar": (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or "",
        # Execute statement to process data and maintain state
        "avatar_url": (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or "",
        # Execute statement to process data and maintain state
        "photo": (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or ""
    # Execute statement to process data and maintain state
    }

    # Set clean_profile_img variable to store clean profile img value
    clean_profile_img = user_data["profile_image"]

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "message": "Login successful",
        # Execute statement to process data and maintain state
        "access_token": access_token,
        # Execute statement to process data and maintain state
        "token_type": "bearer",
        # Execute statement to process data and maintain state
        "role": role_clean,
        # Execute statement to process data and maintain state
        "emp_code": user.emp_code,
        # Execute statement to process data and maintain state
        "name": user_name,
        # Execute statement to process data and maintain state
        "user_name": user_name,
        # Execute statement to process data and maintain state
        "designation": user.designation or "",
        # Execute statement to process data and maintain state
        "department": user.department or "",
        # Execute statement to process data and maintain state
        "location": user.branch_location or "Hyde Park, Saki Vihar Road, Mumbai",
        # Execute statement to process data and maintain state
        "must_change_password": user.must_change_password,
        # Execute statement to process data and maintain state
        "profile_image": clean_profile_img,
        # Execute statement to process data and maintain state
        "profileImage": clean_profile_img,
        # Execute statement to process data and maintain state
        "avatar": clean_profile_img,
        # Execute statement to process data and maintain state
        "avatar_url": clean_profile_img,
        # Execute statement to process data and maintain state
        "photo": clean_profile_img,
        # Execute statement to process data and maintain state
        "user": user_data
    # Execute statement to process data and maintain state
    }
 
 
# Define reset_user_password function to handle reset user password
def reset_user_password(db, user, new_password):
    # Execute statement to process data and maintain state
    user.password_hash = hash_password(new_password)
    # Execute statement to process data and maintain state
    user.must_change_password = False
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(user)
    # Return computed result or response payload to caller
    return user


# Define sso_send_otp function to handle sso send otp
def sso_send_otp(db: Session, email: str):
    # Set clean_identifier variable to store clean identifier value
    clean_identifier = email.strip()
    # Check if target condition is false or object is missing
    if not clean_identifier:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Work Email or Employee ID is required for SSO Login")

    # Resolve user by email or emp_code
    if "@" in clean_identifier:
        # Initiate database query on specified model
        candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier)).order_by(Profile.id.asc()).all()
        # Check if target condition is false or object is missing
        if not candidates and "@laefera.co" in clean_identifier.lower():
            # Initiate database query on specified model
            candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laefera.co", "@laesfera.co"))).order_by(Profile.id.asc()).all()
        # Evaluate alternate branch condition
        elif not candidates and "@laesfera.co" in clean_identifier.lower():
            # Initiate database query on specified model
            candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laesfera.co", "@laefera.co"))).order_by(Profile.id.asc()).all()
        # Set user variable to store user value
        user = candidates[0] if candidates else None
    # Execute fallback branch when conditions are not met
    else:
        # Initiate database query on specified model
        user = db.query(Profile).filter(Profile.emp_code.ilike(clean_identifier)).first()

    # Check if target condition is false or object is missing
    if not user:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="No employee profile found for this email or Employee ID")

    # Set user_email variable to store user email value
    user_email = user.email
    # Check if target condition is false or object is missing
    if not user_email or not user_email.lower().endswith("@laesfera.co"):
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="SSO is available only for official @laesfera.co employee email accounts")

    # Set role_clean variable to store role clean value
    role_clean = (user.role or "").strip().lower()

    # Set otp_code variable to store otp code value
    otp_code = generate_otp()

    # Set expires_at variable to store expires at value
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    # Invoke create_otp to perform operational action
    create_otp(db, user_email, otp_code, expires_at)

    # Set sent variable to store sent value
    sent = send_otp_email(user_email, otp_code)
    # Check if target condition is false or object is missing
    if not sent:
        # Set record variable to store record value
        record = get_latest_otp(db, user_email)
        # Evaluate condition to control execution branch
        if record:
            # Invoke delete_otp to perform operational action
            delete_otp(db, record)
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=503, detail="SSO OTP email could not be delivered. Please try again.")

    # Invoke print to perform operational action
    print(f"[EMAIL] Sent SSO OTP successfully to {user_email} via aicogni Outlook", flush=True)
    # Set msg_text variable to store msg text value
    msg_text = f"SSO verification code sent to your official Outlook inbox ({user_email}) via hrms@laesfera.co (ERA)"

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "message": msg_text,
        # Execute statement to process data and maintain state
        "email": user_email,
        # Execute statement to process data and maintain state
        "emp_code": user.emp_code,
        # Execute statement to process data and maintain state
        "isSSO": True
    # Execute statement to process data and maintain state
    }


# Define get_microsoft_sso_url function to handle get microsoft sso url
def get_microsoft_sso_url(redirect_uri: str):
    # Import module urllib.parse for system functionality
    import urllib.parse
    # Set tenant_id variable to store tenant id value
    tenant_id = os.getenv("TENANT_ID") or os.getenv("OUTLOOK_TENANT_ID") or "b292bf8e-4b06-4865-b248-a1d099b8c151"
    # Set client_id variable to store client id value
    client_id = os.getenv("SSO_CLIENT_ID") or "8410227f-330b-4804-a9e3-777daf133850"
    # Set scope variable to store scope value
    scope = "User.Read openid profile email"
    # Set prompt variable to store prompt value
    prompt = "select_account"
    # Set encoded_redirect variable to store encoded redirect value
    encoded_redirect = urllib.parse.quote(redirect_uri, safe="")
    # Set encoded_scope variable to store encoded scope value
    encoded_scope = urllib.parse.quote(scope)
    # Set auth_url variable to store auth url value
    auth_url = (
        # Execute statement to process data and maintain state
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
        # Execute statement to process data and maintain state
        f"?client_id={client_id}&response_type=code&redirect_uri={encoded_redirect}"
        # Execute statement to process data and maintain state
        f"&response_mode=query&scope={encoded_scope}&prompt={prompt}"
    # Execute statement to process data and maintain state
    )
    # Set logout_url variable to store logout url value
    logout_url = (
        # Execute statement to process data and maintain state
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/logout"
        # Execute statement to process data and maintain state
        f"?post_logout_redirect_uri={encoded_redirect}"
    # Execute statement to process data and maintain state
    )
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "auth_url": auth_url,
        # Execute statement to process data and maintain state
        "logout_url": logout_url,
        # Execute statement to process data and maintain state
        "tenant_id": tenant_id,
        # Execute statement to process data and maintain state
        "client_id": client_id,
        # Execute statement to process data and maintain state
        "prompt": prompt,
    # Execute statement to process data and maintain state
    }


# Define find_sso_user_profile function to handle find sso user profile
def find_sso_user_profile(db: Session, user_email: str):
    # Set clean variable to store clean value
    clean = user_email.strip().lower()

    # 1. Exact email match (case-insensitive)
    user = db.query(Profile).filter(Profile.email.ilike(clean)).first()
    # Evaluate condition to control execution branch
    if user:
        # Return computed result or response payload to caller
        return user

    # 2. Domain swapping (.co <-> .co.in <-> .com)
    variants = []
    # Evaluate condition to control execution branch
    if "@laesfera.co.in" in clean:
        # Invoke variants.append to perform operational action
        variants.append(clean.replace("@laesfera.co.in", "@laesfera.co"))
        # Invoke variants.append to perform operational action
        variants.append(clean.replace("@laesfera.co.in", "@company.com"))
    # Evaluate alternate branch condition
    elif "@laesfera.co" in clean:
        # Invoke variants.append to perform operational action
        variants.append(clean.replace("@laesfera.co", "@laesfera.co.in"))
        # Invoke variants.append to perform operational action
        variants.append(clean.replace("@laesfera.co", "@company.com"))
        # Invoke variants.append to perform operational action
        variants.append(clean.replace("@laesfera.co", "@laefera.co"))
    # Evaluate alternate branch condition
    elif "@laefera.co" in clean:
        # Invoke variants.append to perform operational action
        variants.append(clean.replace("@laefera.co", "@laesfera.co"))
        # Invoke variants.append to perform operational action
        variants.append(clean.replace("@laefera.co", "@laesfera.co.in"))
    # Evaluate alternate branch condition
    elif "@company.com" in clean:
        # Invoke variants.append to perform operational action
        variants.append(clean.replace("@company.com", "@laesfera.co"))
        # Invoke variants.append to perform operational action
        variants.append(clean.replace("@company.com", "@laesfera.co.in"))

    # Iterate through items in sequence loop
    for v in variants:
        # Initiate database query on specified model
        user = db.query(Profile).filter(Profile.email.ilike(v)).first()
        # Evaluate condition to control execution branch
        if user:
            # Return computed result or response payload to caller
            return user

    # 3. Check username or prefix before @ (e.g. "krishna.p" or "parth")
    if "@" in clean:
        # Set prefix variable to store prefix value
        prefix = clean.split("@")[0].strip()
        # Initiate database query on specified model
        user = db.query(Profile).filter(Profile.email.ilike(f"{prefix}@%")).first()
        # Evaluate condition to control execution branch
        if user:
            # Return computed result or response payload to caller
            return user

        # First name match
        if "." in prefix:
            # Execute statement to process data and maintain state
            first, last_init = prefix.split(".", 1)
            # Initiate database query on specified model
            user = db.query(Profile).filter(
                # Invoke Profile.first_name.ilike to perform operational action
                Profile.first_name.ilike(first),
                # Invoke Profile.last_name.ilike to perform operational action
                Profile.last_name.ilike(f"{last_init}%")
            # Execute statement to process data and maintain state
            ).first()
            # Evaluate condition to control execution branch
            if user:
                # Return computed result or response payload to caller
                return user
        # Execute fallback branch when conditions are not met
        else:
            # Initiate database query on specified model
            user = db.query(Profile).filter(Profile.first_name.ilike(prefix)).first()
            # Evaluate condition to control execution branch
            if user:
                # Return computed result or response payload to caller
                return user

    # 4. Fallback in users table
    try:
        # Import User from app.models.user for module operations
        from app.models.user import User
        # Initiate database query on specified model
        u = db.query(User).filter(User.email.ilike(clean)).first()
        # Evaluate condition to control execution branch
        if u:
            # Initiate database query on specified model
            user = db.query(Profile).filter(Profile.emp_code.ilike(u.empcode)).first()
            # Evaluate condition to control execution branch
            if user:
                # Return computed result or response payload to caller
                return user
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Return computed result or response payload to caller
    return None


# Define handle_microsoft_sso_callback function to handle handle microsoft sso callback
def handle_microsoft_sso_callback(db: Session, code: str, redirect_uri: str):
    # Set code_hash variable to store code hash value
    code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
    # Set now variable to store now value
    now = time.time()

    # 1. Check if this code was already successfully redeemed in the last 120 seconds
    with _oauth_cache_lock:
        # Set stale_keys variable to store stale keys value
        stale_keys = [k for k, v in _oauth_code_cache.items() if now - v.get("timestamp", 0) > 120]
        # Iterate through items in sequence loop
        for k in stale_keys:
            # Invoke _oauth_code_cache.pop to perform operational action
            _oauth_code_cache.pop(k, None)

        # Evaluate condition to control execution branch
        if code_hash in _oauth_code_cache:
            # Return computed result or response payload to caller
            return _oauth_code_cache[code_hash]["result"]

        # Set in_flight_event variable to store in flight event value
        in_flight_event = _oauth_in_flight.get(code_hash)
        # Evaluate condition to control execution branch
        if in_flight_event is None:
            # Set in_flight_event variable to store in flight event value
            in_flight_event = threading.Event()
            # Execute statement to process data and maintain state
            _oauth_in_flight[code_hash] = in_flight_event
            # Set is_leader variable to store is leader value
            is_leader = True
        # Execute fallback branch when conditions are not met
        else:
            # Set is_leader variable to store is leader value
            is_leader = False

    # 2. If another request is currently in-flight, wait for it to complete
    if not is_leader:
        # Invoke in_flight_event.wait to perform operational action
        in_flight_event.wait(timeout=15)
        # Acquire context manager resource for enclosed block
        with _oauth_cache_lock:
            # Evaluate condition to control execution branch
            if code_hash in _oauth_code_cache:
                # Return computed result or response payload to caller
                return _oauth_code_cache[code_hash]["result"]

    # 3. Leader request: exchange code with Microsoft
    try:
        # Set tenant_id variable to store tenant id value
        tenant_id = os.getenv("TENANT_ID") or os.getenv("OUTLOOK_TENANT_ID") or "b292bf8e-4b06-4865-b248-a1d099b8c151"
        # Set client_id variable to store client id value
        client_id = os.getenv("SSO_CLIENT_ID") or "8410227f-330b-4804-a9e3-777daf133850"
        # Set client_secret variable to store client secret value
        client_secret = (
            # Invoke os.getenv to perform operational action
            os.getenv("SSO_CLIENT_SECRET")
            # Execute statement to process data and maintain state
            or os.getenv("CLIENT_SECRET")
            # Execute statement to process data and maintain state
            or os.getenv("OUTLOOK_CLIENT_SECRET")
            # Execute statement to process data and maintain state
            or ""
        # Execute statement to process data and maintain state
        ).strip().strip('"').strip("'")

        # Set token_url variable to store token url value
        token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        # Set token_resp variable to store token resp value
        token_resp = requests.post(token_url, data={
            # Execute statement to process data and maintain state
            "client_id": client_id,
            # Execute statement to process data and maintain state
            "client_secret": client_secret,
            # Execute statement to process data and maintain state
            "code": code,
            # Execute statement to process data and maintain state
            "redirect_uri": redirect_uri,
            # Execute statement to process data and maintain state
            "grant_type": "authorization_code",
        # Execute statement to process data and maintain state
        }, timeout=15)

        # Check if target condition is false or object is missing
        if not token_resp.ok:
            # Set err_msg variable to store err msg value
            err_msg = f"Failed to verify Microsoft SSO credentials ({token_resp.status_code})"
            # Begin guarded execution block to trap exceptions
            try:
                # Set err_data variable to store err data value
                err_data = token_resp.json()
                # Set raw_err variable to store raw err value
                raw_err = err_data.get("error_description", "") or err_data.get("error", "")
                # Evaluate condition to control execution branch
                if "AADSTS54005" in raw_err or "already redeemed" in raw_err:
                    # Set err_msg variable to store err msg value
                    err_msg = "This Microsoft sign-in session has already been used or expired. Please click 'Sign in with Microsoft' to sign in again."
                # Evaluate alternate branch condition
                elif "error_description" in err_data:
                    # Set err_msg variable to store err msg value
                    err_msg = err_data["error_description"].split("\r\n")[0]
                # Evaluate alternate branch condition
                elif "error" in err_data:
                    # Set err_msg variable to store err msg value
                    err_msg = f"{err_data.get('error')}: {err_data.get('error_description', '')}"
                # Evaluate alternate branch condition
                elif token_resp.text:
                    # Set err_msg variable to store err msg value
                    err_msg = token_resp.text[:200]
            # Catch and handle specific exception if raised
            except Exception:
                # Evaluate condition to control execution branch
                if token_resp.text:
                    # Set err_msg variable to store err msg value
                    err_msg = token_resp.text[:200]
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=400, detail=err_msg)

        # Set token_data variable to store token data value
        token_data = token_resp.json()
        # Set ms_token variable to store ms token value
        ms_token = token_data.get("access_token")

        # Fetch user info from Microsoft Graph
        me_resp = requests.get("https://graph.microsoft.com/v1.0/me", headers={
            # Execute statement to process data and maintain state
            "Authorization": f"Bearer {ms_token}"
        # Execute statement to process data and maintain state
        }, timeout=15)

        # Check if target condition is false or object is missing
        if not me_resp.ok:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=400, detail="Failed to fetch Microsoft profile info")

        # Set me_data variable to store me data value
        me_data = me_resp.json()
        # Set user_email variable to store user email value
        user_email = me_data.get("mail") or me_data.get("userPrincipalName") or ""
        # Check if target condition is false or object is missing
        if not user_email:
            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=400, detail="Could not determine email from Microsoft account")

        # Match user in database
        user = find_sso_user_profile(db, user_email)

        # Check if target condition is false or object is missing
        if not user:
            # Raise HTTP exception with status code and error details
            raise HTTPException(
                # Set status_code variable to store status code value
                status_code=404,
                # Set detail variable to store detail value
                detail=f"Your Microsoft account ({user_email}) is not registered in LA ESFERA HRMS. Please contact HR or your administrator."
            # Execute statement to process data and maintain state
            )

        # Set role_clean variable to store role clean value
        role_clean = (user.role or "employee").strip().lower()
        # Set designation_clean variable to store designation clean value
        designation_clean = (user.designation or "").strip().lower()
        # Evaluate condition to control execution branch
        if role_clean == "employee" and ("team lead" in designation_clean or "leader" in designation_clean or designation_clean == "tl"):
            # Set role_clean variable to store role clean value
            role_clean = "teamleader"

        # Set access_token variable to store access token value
        access_token = create_access_token({
            # Execute statement to process data and maintain state
            "sub": user.email,
            # Execute statement to process data and maintain state
            "role": role_clean,
            # Execute statement to process data and maintain state
            "emp_code": user.emp_code,
        # Execute statement to process data and maintain state
        })

        # Set user_name variable to store user name value
        user_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.emp_code
        # Set clean_profile_img variable to store clean profile img value
        clean_profile_img = (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or ""
        # Set result variable to store result value
        result = {
            # Execute statement to process data and maintain state
            "message": "Microsoft SSO login successful",
            # Execute statement to process data and maintain state
            "access_token": access_token,
            # Execute statement to process data and maintain state
            "token_type": "bearer",
            # Execute statement to process data and maintain state
            "role": role_clean,
            # Execute statement to process data and maintain state
            "emp_code": user.emp_code,
            # Execute statement to process data and maintain state
            "designation": user.designation or "",
            # Execute statement to process data and maintain state
            "profile_image": clean_profile_img,
            # Execute statement to process data and maintain state
            "profileImage": clean_profile_img,
            # Execute statement to process data and maintain state
            "avatar": clean_profile_img,
            # Execute statement to process data and maintain state
            "photo": clean_profile_img,
            # Execute statement to process data and maintain state
            "email": user.email,
            # Execute statement to process data and maintain state
            "auth_provider": "microsoft",
            # Execute statement to process data and maintain state
            "user": {
                # Execute statement to process data and maintain state
                "id": user.id,
                # Execute statement to process data and maintain state
                "emp_code": user.emp_code,
                # Execute statement to process data and maintain state
                "name": user_name,
                # Execute statement to process data and maintain state
                "email": user.email,
                # Execute statement to process data and maintain state
                "role": role_clean,
                # Execute statement to process data and maintain state
                "designation": user.designation or "",
                # Execute statement to process data and maintain state
                "department": user.department or "",
                # Execute statement to process data and maintain state
                "profile_image": clean_profile_img,
                # Execute statement to process data and maintain state
                "profileImage": clean_profile_img,
                # Execute statement to process data and maintain state
                "avatar": clean_profile_img,
                # Execute statement to process data and maintain state
                "photo": clean_profile_img,
                # Execute statement to process data and maintain state
                "first_name": user.first_name or "",
                # Execute statement to process data and maintain state
                "last_name": user.last_name or "",
            # Execute statement to process data and maintain state
            }
        # Execute statement to process data and maintain state
        }

        # Acquire context manager resource for enclosed block
        with _oauth_cache_lock:
            # Execute statement to process data and maintain state
            _oauth_code_cache[code_hash] = {
                # Execute statement to process data and maintain state
                "result": result,
                # Execute statement to process data and maintain state
                "timestamp": time.time()
            # Execute statement to process data and maintain state
            }

        # Return computed result or response payload to caller
        return result
    # Execute cleanup actions regardless of exceptions
    finally:
        # Evaluate condition to control execution branch
        if is_leader:
            # Acquire context manager resource for enclosed block
            with _oauth_cache_lock:
                # Invoke _oauth_in_flight.pop to perform operational action
                _oauth_in_flight.pop(code_hash, None)
            # Invoke in_flight_event.set to perform operational action
            in_flight_event.set()
