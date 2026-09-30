import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.repositories.otp_repo import create_otp, get_latest_otp, delete_otp
from fastapi import HTTPException
from app.repositories.profile_repository import get_profile_by_email
from app.services.email_service import send_otp_email
 
 
def generate_otp():
    return f"{secrets.randbelow(900000) + 100000}"
 
 
def create_and_store_otp(db: Session, email: str):
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
 
    create_otp(db, email, otp, expires_at)
 
    return otp
 
 
def validate_otp(db: Session, email: str, user_otp: str):
    record = get_latest_otp(db, email)
 
    if not record:
        return False
 
    if record.otp != user_otp:
        return False
 
    if datetime.utcnow() > record.expires_at:
        return False
 
    # optional: delete after success
    delete_otp(db, record)
 
    return True
 
def resend_user_otp(db: Session, email: str):
    # Validate the user exists
    user = get_profile_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
 
    # Generate a fresh short-lived OTP.
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
 
    # Store in database
    create_otp(db, email, otp_code, expires_at)
 
    sent = send_otp_email(email, otp_code)
    if not sent:
        delete_otp(db, get_latest_otp(db, email))
        raise HTTPException(status_code=503, detail="OTP email could not be delivered. Please try again.")

    print(f"New OTP email sent to {email}")
    return {"message": "A new OTP has been sent to your email."}
 
 
 
 