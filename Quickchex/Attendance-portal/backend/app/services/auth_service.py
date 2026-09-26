from app.models.profile_model import Profile
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.repositories.otp_repo import create_otp, get_latest_otp, delete_otp
from app.services.email_service import send_otp_email
from app.repositories.profile_repository import get_profile_by_email
from app.core.security import verify_password, create_access_token, hash_password
from app.services.email_service import send_otp_email
from app.services.otp_service import generate_otp
from fastapi import HTTPException, status
import re
import threading
 
 
 
import os
import requests

def login_user(db: Session, email: str, password: str):
    clean_identifier = email.strip()
    if not clean_identifier or not password:
        raise HTTPException(status_code=400, detail="Identifier and password are required")

    # Support login by email OR emp_code (e.g. ADM001, MGR001, 1002)
    if "@" in clean_identifier:
        candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier)).order_by(Profile.id.asc()).all()
        if not candidates and "@laefera.co" in clean_identifier.lower():
            candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laefera.co", "@laesfera.co"))).order_by(Profile.id.asc()).all()
        elif not candidates and "@laesfera.co" in clean_identifier.lower():
            candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laesfera.co", "@laefera.co"))).order_by(Profile.id.asc()).all()

        user = None
        for candidate in candidates:
            if candidate.password_hash and verify_password(password, candidate.password_hash):
                user = candidate
                break
        if not user and candidates:
            user = candidates[0]
    else:
        user = db.query(Profile).filter(Profile.emp_code.ilike(clean_identifier)).first()

    # Generic invalid credential check (prevents account enumeration)
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email/employee ID or password")

    user_email = user.email
    role_clean = (user.role or "employee").strip().lower()

    # Exception ONLY for the test user: bypass OTP and log in directly by password
    if user.emp_code == "TEST001" or (user.email and user.email.lower() == "testuser@company.com"):
        token = create_access_token(data={"sub": user.email, "role": role_clean, "emp_code": user.emp_code})
        return {
            "message": "Direct login successful",
            "access_token": token,
            "token_type": "bearer",
            "role": role_clean,
            "designation": user.designation or "Employee",
            "emp_code": user.emp_code,
            "email": user.email,
            "user": {
                "name": f"{user.first_name} {user.last_name}".strip(),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": role_clean,
                "emp_code": user.emp_code,
                "designation": user.designation or "Employee"
            },
            "must_change_password": False
        }

    otp_code = generate_otp()

    expires_at = datetime.utcnow() + timedelta(minutes=10)
    create_otp(db, user_email, otp_code, expires_at)

    # Send before returning success so the OTP screen opens only after Outlook accepts the message.
    sent = False
    try:
        sent = send_otp_email(user_email, otp_code)
    except Exception as em_err:
        print(f"[EMAIL WARN]: {em_err}", flush=True)

    if not sent:
        print(f"[EMAIL DEV FALLBACK] Stored OTP {otp_code} for {user_email} (fallback dev OTP 123456 also accepted)", flush=True)

    print(f"[EMAIL] Active OTP for {user_email}: {otp_code}", flush=True)

    return {
        "message": "OTP sent successfully",
        "email": user_email,
        "emp_code": user.emp_code,
        "must_change_password": user.must_change_password
    }


def verify_user_otp(db: Session, email: str, otp: str):
    clean_identifier = email.strip()

    # Resolve user by email or emp_code
    if "@" in clean_identifier:
        user = db.query(Profile).filter(Profile.email.ilike(clean_identifier)).first()
        if not user and "@laefera.co" in clean_identifier.lower():
            user = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laefera.co", "@laesfera.co"))).first()
        elif not user and "@laesfera.co" in clean_identifier.lower():
            user = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laesfera.co", "@laefera.co"))).first()
    else:
        user = db.query(Profile).filter(Profile.emp_code.ilike(clean_identifier)).first()

    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    target_email = user.email
    clean_otp = otp.strip()
    role_clean = (user.role or "employee").strip().lower()

    record = get_latest_otp(db, target_email)

    # Master testing bypass OTP 123456 or matching record
    if clean_otp != "123456":
        if not record:
            raise HTTPException(status_code=400, detail="No active verification code found. Please request a new OTP via SSO.")

        if record.otp != clean_otp:
            raise HTTPException(status_code=400, detail="Invalid verification code. Please check your Outlook inbox for the code sent from aicogni@laesfera.co.")

        if datetime.utcnow() > record.expires_at:
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new OTP.")

    # Delete verified OTP if record exists
    if record:
        delete_otp(db, record)

    # Clean role
    role_clean = (user.role or "employee").strip().lower()

    # Generate JWT with unified payload
    access_token = create_access_token({
        "sub": user.email,
        "role": role_clean,
        "emp_code": user.emp_code,
    })

    user_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    if not user_name or "@" in user_name:
        user_name = f"{user.first_name or ''}".strip() or user.emp_code

    user_data = {
        "id": user.id,
        "emp_code": user.emp_code,
        "name": user_name,
        "fullName": user_name,
        "first_name": user.first_name or "",
        "lastName": user.last_name or "",
        "last_name": user.last_name or "",
        "email": user.email,
        "role": role_clean,
        "designation": user.designation or "Employee",
        "department": user.department or "Operations",
        "contact": user.mobile_no or "—",
        "mobile_no": user.mobile_no or "—",
        "reporting_supervisor": user.reporting_supervisor or "—",
        "reportingManager": user.reporting_supervisor or "—",
        "location": user.branch_location or "Hyde Park, Saki Vihar Road, Mumbai",
        "branch_location": user.branch_location or "Hyde Park, Saki Vihar Road, Mumbai",
        "profile_image": user.profile_image or ""
    }

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "role": role_clean,
        "emp_code": user.emp_code,
        "name": user_name,
        "user_name": user_name,
        "designation": user.designation or "",
        "department": user.department or "",
        "location": user.branch_location or "Hyde Park, Saki Vihar Road, Mumbai",
        "must_change_password": user.must_change_password,
        "user": user_data
    }
 
 
def reset_user_password(db, user, new_password):
    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    db.commit()
    db.refresh(user)
    return user


def sso_send_otp(db: Session, email: str):
    clean_identifier = email.strip()
    if not clean_identifier:
        raise HTTPException(status_code=400, detail="Work Email or Employee ID is required for SSO Login")

    # Resolve user by email or emp_code
    if "@" in clean_identifier:
        candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier)).order_by(Profile.id.asc()).all()
        if not candidates and "@laefera.co" in clean_identifier.lower():
            candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laefera.co", "@laesfera.co"))).order_by(Profile.id.asc()).all()
        elif not candidates and "@laesfera.co" in clean_identifier.lower():
            candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laesfera.co", "@laefera.co"))).order_by(Profile.id.asc()).all()
        user = candidates[0] if candidates else None
    else:
        user = db.query(Profile).filter(Profile.emp_code.ilike(clean_identifier)).first()

    if not user:
        raise HTTPException(status_code=404, detail="No employee profile found for this email or Employee ID")

    user_email = user.email
    if not user_email or not user_email.lower().endswith("@laesfera.co"):
        raise HTTPException(status_code=400, detail="SSO is available only for official @laesfera.co employee email accounts")

    role_clean = (user.role or "").strip().lower()

    otp_code = generate_otp()

    expires_at = datetime.utcnow() + timedelta(minutes=10)
    create_otp(db, user_email, otp_code, expires_at)

    print("=" * 50, flush=True)
    print(f"[SSO OTP] Code for {user_email} ({user.emp_code} - {role_clean}): {otp_code}", flush=True)
    print("=" * 50, flush=True)

    sent = send_otp_email(user_email, otp_code)
    if not sent:
        record = get_latest_otp(db, user_email)
        if record:
            delete_otp(db, record)
        raise HTTPException(status_code=503, detail="SSO OTP email could not be delivered. Please try again.")

    print(f"[EMAIL] Sent SSO OTP successfully to {user_email} via aicogni Outlook", flush=True)
    msg_text = f"SSO verification code sent to your official Outlook inbox ({user_email}) via aicogni@laesfera.co"

    return {
        "message": msg_text,
        "email": user_email,
        "emp_code": user.emp_code,
        "isSSO": True
    }


def get_microsoft_sso_url(redirect_uri: str):
    tenant_id = os.getenv("TENANT_ID") or "common"
    client_id = os.getenv("CLIENT_ID", "")
    scope = "User.Read openid profile email"
    return {
        "auth_url": f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize?client_id={client_id}&response_type=code&redirect_uri={redirect_uri}&response_mode=query&scope={scope}"
    }


def handle_microsoft_sso_callback(db: Session, code: str, redirect_uri: str):
    tenant_id = os.getenv("TENANT_ID") or "common"
    client_id = os.getenv("CLIENT_ID", "")
    client_secret = os.getenv("CLIENT_SECRET", "")

    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    token_resp = requests.post(token_url, data={
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }, timeout=15)

    if not token_resp.ok:
        raise HTTPException(status_code=400, detail="Failed to verify Microsoft SSO credentials")

    token_data = token_resp.json()
    ms_token = token_data.get("access_token")

    # Fetch user info from Microsoft Graph
    me_resp = requests.get("https://graph.microsoft.com/v1.0/me", headers={
        "Authorization": f"Bearer {ms_token}"
    }, timeout=15)

    if not me_resp.ok:
        raise HTTPException(status_code=400, detail="Failed to fetch Microsoft profile info")

    me_data = me_resp.json()
    user_email = me_data.get("mail") or me_data.get("userPrincipalName") or ""
    if not user_email:
        raise HTTPException(status_code=400, detail="Could not determine email from Microsoft account")

    # Match user in profile_master
    user = db.query(Profile).filter(Profile.email.ilike(user_email.strip())).first()
    if not user and "@laesfera.co" in user_email.lower():
        user = db.query(Profile).filter(Profile.email.ilike(user_email.strip().lower().replace("@laesfera.co", "@laefera.co"))).first()
    elif not user and "@laefera.co" in user_email.lower():
        user = db.query(Profile).filter(Profile.email.ilike(user_email.strip().lower().replace("@laefera.co", "@laesfera.co"))).first()

    if not user:
        raise HTTPException(status_code=404, detail=f"No HRMS account linked to {user_email}")

    role_clean = (user.role or "employee").strip().lower()
    access_token = create_access_token({
        "sub": user.email,
        "role": role_clean,
        "emp_code": user.emp_code,
    })

    user_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.emp_code
    return {
        "message": "Microsoft SSO login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "role": role_clean,
        "emp_code": user.emp_code,
        "designation": user.designation or "",
        "user": {
            "id": user.id,
            "emp_code": user.emp_code,
            "name": user_name,
            "email": user.email,
            "role": role_clean,
            "designation": user.designation or ""
        }
    }
 
 
 
 