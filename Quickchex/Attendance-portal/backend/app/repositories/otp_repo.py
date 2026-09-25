from sqlalchemy.orm import Session
from datetime import datetime
from app.models.otp import OTP


def create_otp(db: Session, email: str, otp: str, expires_at):
    try:
        db.query(OTP).filter(OTP.email == email).delete()
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
    db.delete(otp_obj)
    db.commit()