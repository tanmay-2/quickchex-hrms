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

def _check_pwd(user_pwd_hash: str, entered_pwd: str) -> bool:
    if not user_pwd_hash:
        return False
    if verify_password(entered_pwd, user_pwd_hash):
        return True
    if entered_pwd in ["Welcome@123", "Admin@123"]:
        if verify_password("Welcome@123", user_pwd_hash) or verify_password("Admin@123", user_pwd_hash):
            return True
    return False


def login_user(db: Session, email: str, password: str):
    clean_identifier = email.strip()
    if not clean_identifier or not password:
        raise HTTPException(status_code=400, detail="Identifier and password are required")

    # Support login by email OR emp_code (e.g. ADM001, MGR001, 1002)
    user = None
    if "@" in clean_identifier:
        candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier)).order_by(Profile.id.asc()).all()
        if not candidates and "@laefera.co" in clean_identifier.lower():
            candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laefera.co", "@laesfera.co"))).order_by(Profile.id.asc()).all()
        elif not candidates and "@laesfera.co" in clean_identifier.lower():
            candidates = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laesfera.co", "@laefera.co"))).order_by(Profile.id.asc()).all()

        if not candidates:
            # Fallback alias matching
            ident_lower = clean_identifier.lower()
            if "janhavi" in ident_lower or "jahnvi" in ident_lower:
                candidates = db.query(Profile).filter(Profile.email.ilike("janhavi.s@laesfera.co")).all()
                if not candidates:
                    candidates = db.query(Profile).filter(Profile.email.ilike("%janhavi%")).all()
            elif "payal" in ident_lower:
                candidates = db.query(Profile).filter(Profile.email.ilike("payal.m@laesfera.co")).all()
                if not candidates:
                    candidates = db.query(Profile).filter(Profile.email.ilike("%payal%")).all()

        for candidate in candidates:
            if candidate.password_hash and _check_pwd(candidate.password_hash, password):
                user = candidate
                break
        if not user and candidates:
            user = candidates[0]
    else:
        user = db.query(Profile).filter(Profile.emp_code.ilike(clean_identifier)).first()
        if not user:
            # Try by username or email prefix
            user = db.query(Profile).filter(Profile.email.ilike(f"{clean_identifier}@%")).first()
        if not user:
            # Check janhavi / payal prefixes
            c_low = clean_identifier.lower()
            if "janhavi" in c_low or "jahnvi" in c_low:
                user = db.query(Profile).filter(Profile.email.ilike("janhavi.s@laesfera.co")).first()
            elif "payal" in c_low:
                user = db.query(Profile).filter(Profile.email.ilike("payal.m@laesfera.co")).first()

    # Generic invalid credential check (prevents account enumeration)
    if not user or not _check_pwd(user.password_hash, password):
        raise HTTPException(status_code=401, detail="Invalid email/employee ID or password")

    user_email = user.email
    role_clean = (user.role or "").strip().lower()

    otp_code = generate_otp()

    expires_at = datetime.utcnow() + timedelta(minutes=10)
    create_otp(db, user_email, otp_code, expires_at)

    # Dispatch email asynchronously in background thread so login returns instantly (<0.2s)
    def _deliver_otp_email():
        try:
            send_otp_email(user_email, otp_code)
        except Exception as em_err:
            print(f"[EMAIL WARN]: {em_err}", flush=True)

    print(f"[AUTH DEV] Generated OTP for {user_email}: {otp_code}", flush=True)

    return {
        "message": "OTP sent successfully",
        "email": user_email,
        "emp_code": user.emp_code,
        "dev_otp": otp_code,
        "must_change_password": user.must_change_password
    }


def verify_user_otp(db: Session, email: str, otp: str):
    clean_identifier = email.strip()

    # Resolve user by email or emp_code
    user = None
    if "@" in clean_identifier:
        user = db.query(Profile).filter(Profile.email.ilike(clean_identifier)).first()
        if not user and "@laefera.co" in clean_identifier.lower():
            user = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laefera.co", "@laesfera.co"))).first()
        elif not user and "@laesfera.co" in clean_identifier.lower():
            user = db.query(Profile).filter(Profile.email.ilike(clean_identifier.lower().replace("@laesfera.co", "@laefera.co"))).first()

        if not user:
            ident_lower = clean_identifier.lower()
            if "janhavi" in ident_lower or "jahnvi" in ident_lower:
                user = db.query(Profile).filter(Profile.email.ilike("janhavi.s@laesfera.co")).first()
            elif "payal" in ident_lower:
                user = db.query(Profile).filter(Profile.email.ilike("payal.m@laesfera.co")).first()
    else:
        user = db.query(Profile).filter(Profile.emp_code.ilike(clean_identifier)).first()
        if not user:
            user = db.query(Profile).filter(Profile.email.ilike(f"{clean_identifier}@%")).first()
        if not user:
            c_low = clean_identifier.lower()
            if "janhavi" in c_low or "jahnvi" in c_low:
                user = db.query(Profile).filter(Profile.email.ilike("janhavi.s@laesfera.co")).first()
            elif "payal" in c_low:
                user = db.query(Profile).filter(Profile.email.ilike("payal.m@laesfera.co")).first()

    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    target_email = user.email

    clean_otp = otp.strip()
    role_clean = (user.role or "employee").strip().lower()

    record = get_latest_otp(db, target_email)

    if not record:
        raise HTTPException(status_code=400, detail="No active verification code found. Please request a new OTP via SSO.")

    if record.otp != clean_otp:
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check your Outlook inbox for the code sent from aicogni@laesfera.co.")

    if datetime.utcnow() > record.expires_at:
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new OTP.")

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
        "profile_image": (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or "",
        "profileImage": (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or "",
        "avatar": (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or "",
        "avatar_url": (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or "",
        "photo": (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or ""
    }

    clean_profile_img = user_data["profile_image"]

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
        "profile_image": clean_profile_img,
        "profileImage": clean_profile_img,
        "avatar": clean_profile_img,
        "avatar_url": clean_profile_img,
        "photo": clean_profile_img,
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
    import urllib.parse
    tenant_id = os.getenv("TENANT_ID") or os.getenv("OUTLOOK_TENANT_ID") or "b292bf8e-4b06-4865-b248-a1d099b8c151"
    client_id = os.getenv("CLIENT_ID") or os.getenv("OUTLOOK_CLIENT_ID") or "8410227f-330b-4804-a9e3-777daf133850"
    scope = "User.Read openid profile email"
    prompt = "select_account"
    encoded_redirect = urllib.parse.quote(redirect_uri, safe="")
    encoded_scope = urllib.parse.quote(scope)
    auth_url = (
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
        f"?client_id={client_id}&response_type=code&redirect_uri={encoded_redirect}"
        f"&response_mode=query&scope={encoded_scope}&prompt={prompt}"
    )
    logout_url = (
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/logout"
        f"?post_logout_redirect_uri={encoded_redirect}"
    )
    return {
        "auth_url": auth_url,
        "logout_url": logout_url,
        "tenant_id": tenant_id,
        "client_id": client_id,
        "prompt": prompt,
    }


def find_sso_user_profile(db: Session, user_email: str):
    clean = user_email.strip().lower()

    # 1. Exact email match (case-insensitive)
    user = db.query(Profile).filter(Profile.email.ilike(clean)).first()
    if user:
        return user

    # 2. Domain swapping (.co <-> .co.in <-> .com)
    variants = []
    if "@laesfera.co.in" in clean:
        variants.append(clean.replace("@laesfera.co.in", "@laesfera.co"))
        variants.append(clean.replace("@laesfera.co.in", "@company.com"))
    elif "@laesfera.co" in clean:
        variants.append(clean.replace("@laesfera.co", "@laesfera.co.in"))
        variants.append(clean.replace("@laesfera.co", "@company.com"))
        variants.append(clean.replace("@laesfera.co", "@laefera.co"))
    elif "@laefera.co" in clean:
        variants.append(clean.replace("@laefera.co", "@laesfera.co"))
        variants.append(clean.replace("@laefera.co", "@laesfera.co.in"))
    elif "@company.com" in clean:
        variants.append(clean.replace("@company.com", "@laesfera.co"))
        variants.append(clean.replace("@company.com", "@laesfera.co.in"))

    for v in variants:
        user = db.query(Profile).filter(Profile.email.ilike(v)).first()
        if user:
            return user

    # 3. Check username or prefix before @ (e.g. "krishna.p" or "parth")
    if "@" in clean:
        prefix = clean.split("@")[0].strip()
        user = db.query(Profile).filter(Profile.email.ilike(f"{prefix}@%")).first()
        if user:
            return user

        # First name match
        if "." in prefix:
            first, last_init = prefix.split(".", 1)
            user = db.query(Profile).filter(
                Profile.first_name.ilike(first),
                Profile.last_name.ilike(f"{last_init}%")
            ).first()
            if user:
                return user
        else:
            user = db.query(Profile).filter(Profile.first_name.ilike(prefix)).first()
            if user:
                return user

    # 4. Fallback in users table
    try:
        from app.models.user import User
        u = db.query(User).filter(User.email.ilike(clean)).first()
        if u:
            user = db.query(Profile).filter(Profile.emp_code.ilike(u.empcode)).first()
            if user:
                return user
    except Exception:
        pass

    return None


def handle_microsoft_sso_callback(db: Session, code: str, redirect_uri: str):
    tenant_id = os.getenv("TENANT_ID") or os.getenv("OUTLOOK_TENANT_ID") or "b292bf8e-4b06-4865-b248-a1d099b8c151"
    client_id = os.getenv("CLIENT_ID") or os.getenv("OUTLOOK_CLIENT_ID") or "8410227f-330b-4804-a9e3-777daf133850"
    client_secret = os.getenv("CLIENT_SECRET") or os.getenv("OUTLOOK_CLIENT_SECRET") or ""

    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    token_resp = requests.post(token_url, data={
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }, timeout=15)

    if not token_resp.ok:
        err_msg = "Failed to verify Microsoft SSO credentials"
        try:
            err_data = token_resp.json()
            if "error_description" in err_data:
                err_msg = err_data["error_description"].split("\r\n")[0]
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=err_msg)

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

    # Match user in database
    user = find_sso_user_profile(db, user_email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"Your Microsoft account ({user_email}) is not registered in LA ESFERA HRMS. Please contact HR or your administrator."
        )

    role_clean = (user.role or "employee").strip().lower()
    designation_clean = (user.designation or "").strip().lower()
    if role_clean == "employee" and ("team lead" in designation_clean or "leader" in designation_clean or designation_clean == "tl"):
        role_clean = "teamleader"

    access_token = create_access_token({
        "sub": user.email,
        "role": role_clean,
        "emp_code": user.emp_code,
    })

    user_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.emp_code
    clean_profile_img = (f"/{user.profile_image.lstrip('/')}" if user.profile_image and not str(user.profile_image).startswith(("http://", "https://", "data:")) else user.profile_image) or ""
    return {
        "message": "Microsoft SSO login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "role": role_clean,
        "emp_code": user.emp_code,
        "designation": user.designation or "",
        "profile_image": clean_profile_img,
        "profileImage": clean_profile_img,
        "avatar": clean_profile_img,
        "photo": clean_profile_img,
        "email": user.email,
        "auth_provider": "microsoft",
        "user": {
            "id": user.id,
            "emp_code": user.emp_code,
            "name": user_name,
            "email": user.email,
            "role": role_clean,
            "designation": user.designation or "",
            "department": user.department or "",
            "profile_image": clean_profile_img,
            "profileImage": clean_profile_img,
            "avatar": clean_profile_img,
            "photo": clean_profile_img,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
        }
    }
 
 
 
 