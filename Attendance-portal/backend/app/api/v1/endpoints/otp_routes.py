# ==============================================================================
# QUICKCHEX HRMS BACKEND - OTP_ROUTES.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/otp_routes.py
# Purpose: FastAPI route controller handling 'otp_routes' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.post('/send') -> send_otp()
#   • router.post('/verify') -> verify_otp_api()
#   • router.post('/resend-otp') -> resend_otp()
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.otp_schema import SendOtpRequest, VerifyOtpRequest, ResendOTPRequest
from app.services.otp_service import create_and_store_otp, validate_otp, resend_user_otp
from app.services.email_service import send_otp_email
from app.repositories.otp_repo import get_latest_otp, delete_otp
 
 
router = APIRouter(prefix="/otp", tags=["OTP"])
 
 
@router.post("/send")
def send_otp(
    data: SendOtpRequest,
    db: Session = Depends(get_db)
):
    otp = create_and_store_otp(db, data.email)

    if not send_otp_email(data.email, otp):
        record = get_latest_otp(db, data.email)
        if record:
            delete_otp(db, record)
        raise HTTPException(status_code=503, detail="OTP email could not be delivered. Please try again.")

    return {"message": "OTP sent successfully"}
 
 
 
 
@router.post("/verify")
def verify_otp_api(
    data: VerifyOtpRequest,
    db: Session = Depends(get_db)
):
    is_valid = validate_otp(db, data.email, data.otp)
 
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP code."
        )
 
    return {"message": "OTP verified successfully", "success": True}
 
 
@router.post("/resend-otp")
def resend_otp(
    data: ResendOTPRequest,
    db: Session = Depends(get_db)
):
    # Call the service layer logic
    return resend_user_otp(db, email=data.email)
 