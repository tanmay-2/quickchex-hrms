# ==============================================================================
# QUICKCHEX HRMS BACKEND - OTP_REPO.PY
# Path: Attendance-portal/backend/app/repositories/otp_repo.py
# Purpose: Data access repository encapsulating queries and mutations for 'otp_repo'.
# Primary Functions:
#   • purge_expired_otps()
#   • create_otp()
#   • get_latest_otp()
#   • delete_otp()
# ==============================================================================

from sqlalchemy.orm import Session
from datetime import datetime
from app.models.otp import OTP


def purge_expired_otps(db: Session) -> int:
    """Delete all expired OTP records across all users. Returns count deleted."""
    try:
        deleted = (
            db.query(OTP)
            .filter(OTP.expires_at < datetime.utcnow())
            .delete(synchronize_session=False)
        )
        db.commit()
        return deleted
    except Exception:
        db.rollback()
        return 0


def create_otp(db: Session, email: str, otp: str, expires_at):
    # Purge any previous OTPs for this specific email first
    try:
        db.query(OTP).filter(OTP.email == email).delete()
        db.commit()
    except Exception:
        db.rollback()

    # Also silently purge globally expired OTPs to keep table clean
    try:
        db.query(OTP).filter(OTP.expires_at < datetime.utcnow()).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()

    db_otp = OTP(email=email, otp=otp, expires_at=expires_at)
    db.add(db_otp)
    db.commit()
    db.refresh(db_otp)
    return db_otp


def get_latest_otp(db: Session, email: str):
    return (
        db.query(OTP)
        .filter(OTP.email == email)
        .order_by(OTP.created_at.desc())
        .first()
    )


def delete_otp(db: Session, otp_obj):
    if otp_obj is None:
        return
    try:
        db.delete(otp_obj)
        db.commit()
    except Exception:
        db.rollback()
