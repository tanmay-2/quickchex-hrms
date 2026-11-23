# ==============================================================================
# QUICKCHEX HRMS BACKEND - OTP_SERVICE.PY
# Path: Attendance-portal/backend/app/services/otp_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'otp_service'.
# Primary Functions:
#   • generate_otp()
#   • create_and_store_otp()
#   • validate_otp()
#   • resend_user_otp()
# ==============================================================================

# Import module secrets for system functionality
import secrets
# Import datetime, timedelta from datetime for module operations
from datetime import datetime, timedelta
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import create_otp, get_latest_otp, delete_otp from app.repositories.otp_repo for module operations
from app.repositories.otp_repo import create_otp, get_latest_otp, delete_otp
# Import HTTPException from fastapi for module operations
from fastapi import HTTPException
# Import get_profile_by_email from app.repositories.profile_repository for module operations
from app.repositories.profile_repository import get_profile_by_email
# Import send_otp_email from app.services.email_service for module operations
from app.services.email_service import send_otp_email
 
 
# Define generate_otp function to handle generate otp
def generate_otp():
    # Return computed result or response payload to caller
    return f"{secrets.randbelow(900000) + 100000}"
 
 
# Define create_and_store_otp function to handle create and store otp
def create_and_store_otp(db: Session, email: str):
    # Set otp variable to store otp value
    otp = generate_otp()
    # Set expires_at variable to store expires at value
    expires_at = datetime.utcnow() + timedelta(minutes=10)
 
    # Invoke create_otp to perform operational action
    create_otp(db, email, otp, expires_at)
 
    # Return computed result or response payload to caller
    return otp
 
 
_FAILED_ATTEMPTS = {}  # email -> int

# Define validate_otp function to handle validate otp
def validate_otp(db: Session, email: str, user_otp: str):
    # Set clean_email variable to store clean email value
    clean_email = str(email or "").strip().lower()
    # Set clean_otp variable to store clean otp value
    clean_otp = str(user_otp or "").strip()

    # Rate limiting: max 5 failed attempts per OTP cycle
    attempts = _FAILED_ATTEMPTS.get(clean_email, 0)
    # Evaluate condition to control execution branch
    if attempts >= 5:
        # Set record variable to store record value
        record = get_latest_otp(db, clean_email)
        # Evaluate condition to control execution branch
        if record:
            # Invoke delete_otp to perform operational action
            delete_otp(db, record)
        # Invoke _FAILED_ATTEMPTS.pop to perform operational action
        _FAILED_ATTEMPTS.pop(clean_email, None)
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=429,
            # Set detail variable to store detail value
            detail="Too many incorrect OTP attempts. For security, please request a new OTP."
        # Execute statement to process data and maintain state
        )

    # Set record variable to store record value
    record = get_latest_otp(db, clean_email)

    # Check if target condition is false or object is missing
    if not record:
        # Return computed result or response payload to caller
        return False

    # Evaluate condition to control execution branch
    if datetime.utcnow() > record.expires_at:
        # Invoke delete_otp to perform operational action
        delete_otp(db, record)
        # Invoke _FAILED_ATTEMPTS.pop to perform operational action
        _FAILED_ATTEMPTS.pop(clean_email, None)
        # Return computed result or response payload to caller
        return False

    # Evaluate condition to control execution branch
    if record.otp != clean_otp:
        # Execute statement to process data and maintain state
        _FAILED_ATTEMPTS[clean_email] = attempts + 1
        # Return computed result or response payload to caller
        return False

    # Success: clear attempt count and consume OTP
    _FAILED_ATTEMPTS.pop(clean_email, None)
    # Invoke delete_otp to perform operational action
    delete_otp(db, record)
    # Return computed result or response payload to caller
    return True
 
# Define resend_user_otp function to handle resend user otp
def resend_user_otp(db: Session, email: str):
    # Validate the user exists
    user = get_profile_by_email(db, email)
    # Check if target condition is false or object is missing
    if not user:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Email not registered")
 
    # Generate a fresh short-lived OTP.
    otp_code = generate_otp()
    # Set expires_at variable to store expires at value
    expires_at = datetime.utcnow() + timedelta(minutes=10)
 
    # Store in database
    create_otp(db, email, otp_code, expires_at)
 
    # Deliver via background thread so response is instant
    import threading
    # Define _deliver function to handle  deliver
    def _deliver():
        # Begin guarded execution block to trap exceptions
        try:
            # Invoke send_otp_email to perform operational action
            send_otp_email(email, otp_code)
        # Catch and handle specific exception if raised
        except Exception as se:
            # Invoke print to perform operational action
            print(f"[RESEND EMAIL WARN]: {se}", flush=True)

    # Invoke threading.Thread to perform operational action
    threading.Thread(target=_deliver, daemon=True).start()
    # Invoke print to perform operational action
    print(f"New OTP generated for {email}: {otp_code}")
    # Return computed result or response payload to caller
    return {"message": "A new OTP has been sent to your email."}
 
 
 
 