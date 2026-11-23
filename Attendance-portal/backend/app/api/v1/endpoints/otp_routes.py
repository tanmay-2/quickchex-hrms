# ==============================================================================
# QUICKCHEX HRMS BACKEND - OTP_ROUTES.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/otp_routes.py
# Purpose: FastAPI route controller handling 'otp_routes' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.post('/send') -> send_otp()
#   • router.post('/verify') -> verify_otp_api()
#   • router.post('/resend-otp') -> resend_otp()
# ==============================================================================

# Import APIRouter, Depends, HTTPException from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import SendOtpRequest, VerifyOtpRequest, ResendOTPRequest from app.schemas.otp_schema for module operations
from app.schemas.otp_schema import SendOtpRequest, VerifyOtpRequest, ResendOTPRequest
# Import create_and_store_otp, validate_otp, resend_user_otp from app.services.otp_service for module operations
from app.services.otp_service import create_and_store_otp, validate_otp, resend_user_otp
# Import send_otp_email from app.services.email_service for module operations
from app.services.email_service import send_otp_email
# Import get_latest_otp, delete_otp from app.repositories.otp_repo for module operations
from app.repositories.otp_repo import get_latest_otp, delete_otp
 
 
# Set router variable to store router value
router = APIRouter(prefix="/otp", tags=["OTP"])
 
 
# Define HTTP POST route endpoint handler
@router.post("/send")
# Define send_otp function to handle send otp
def send_otp(
    # Define data schema field with type SendOtpRequest,
    data: SendOtpRequest,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    # Set otp variable to store otp value
    otp = create_and_store_otp(db, data.email)

    # Check if target condition is false or object is missing
    if not send_otp_email(data.email, otp):
        # Set record variable to store record value
        record = get_latest_otp(db, data.email)
        # Evaluate condition to control execution branch
        if record:
            # Invoke delete_otp to perform operational action
            delete_otp(db, record)
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=503, detail="OTP email could not be delivered. Please try again.")

    # Return computed result or response payload to caller
    return {"message": "OTP sent successfully"}
 
 
 
 
# Define HTTP POST route endpoint handler
@router.post("/verify")
# Define verify_otp_api function to handle verify otp api
def verify_otp_api(
    # Define data schema field with type VerifyOtpRequest,
    data: VerifyOtpRequest,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    # Set is_valid variable to store is valid value
    is_valid = validate_otp(db, data.email, data.otp)
 
    # Check if target condition is false or object is missing
    if not is_valid:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=400,
            # Set detail variable to store detail value
            detail="Invalid or expired OTP code."
        # Execute statement to process data and maintain state
        )
 
    # Return computed result or response payload to caller
    return {"message": "OTP verified successfully", "success": True}
 
 
# Define HTTP POST route endpoint handler
@router.post("/resend-otp")
# Define resend_otp function to handle resend otp
def resend_otp(
    # Define data schema field with type ResendOTPRequest,
    data: ResendOTPRequest,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    # Call the service layer logic
    return resend_user_otp(db, email=data.email)
 