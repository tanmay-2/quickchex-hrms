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
        return {"message": "Invalid or expired OTP"}
 
    return {"message": "OTP verified successfully"}
 
 
@router.post("/resend-otp")
def resend_otp(
    data: ResendOTPRequest,
    db: Session = Depends(get_db)
):
    # Call the service layer logic
    return resend_user_otp(db, email=data.email)
 