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

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import datetime from datetime for module operations
from datetime import datetime
# Import OTP from app.models.otp for module operations
from app.models.otp import OTP


# Define purge_expired_otps function to handle purge expired otps
def purge_expired_otps(db: Session) -> int:
    """Delete all expired OTP records across all users. Returns count deleted."""
    try:
        # Set deleted variable to store deleted value
        deleted = (
            # Initiate database query on specified model
            db.query(OTP)
            # Invoke .filter to perform operational action
            .filter(OTP.expires_at < datetime.utcnow())
            # Invoke .delete to perform operational action
            .delete(synchronize_session=False)
        # Execute statement to process data and maintain state
        )
        # Commit transaction to persist changes in database
        db.commit()
        # Return computed result or response payload to caller
        return deleted
    # Catch and handle specific exception if raised
    except Exception:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Return computed result or response payload to caller
        return 0


# Define create_otp function to handle create otp
def create_otp(db: Session, email: str, otp: str, expires_at):
    # Purge any previous OTPs for this specific email first
    try:
        # Initiate database query on specified model
        db.query(OTP).filter(OTP.email == email).delete()
        # Commit transaction to persist changes in database
        db.commit()
    # Catch and handle specific exception if raised
    except Exception:
        # Roll back transaction to revert changes on failure
        db.rollback()

    # Also silently purge globally expired OTPs to keep table clean
    try:
        # Initiate database query on specified model
        db.query(OTP).filter(OTP.expires_at < datetime.utcnow()).delete(synchronize_session=False)
        # Commit transaction to persist changes in database
        db.commit()
    # Catch and handle specific exception if raised
    except Exception:
        # Roll back transaction to revert changes on failure
        db.rollback()

    # Set db_otp variable to store db otp value
    db_otp = OTP(email=email, otp=otp, expires_at=expires_at)
    # Stage new entity instance into database session
    db.add(db_otp)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(db_otp)
    # Return computed result or response payload to caller
    return db_otp


# Define get_latest_otp function to handle get latest otp
def get_latest_otp(db: Session, email: str):
    # Return computed result or response payload to caller
    return (
        # Initiate database query on specified model
        db.query(OTP)
        # Invoke .filter to perform operational action
        .filter(OTP.email == email)
        # Invoke .order_by to perform operational action
        .order_by(OTP.created_at.desc())
        # Invoke .first to perform operational action
        .first()
    # Execute statement to process data and maintain state
    )


# Define delete_otp function to handle delete otp
def delete_otp(db: Session, otp_obj):
    # Evaluate condition to control execution branch
    if otp_obj is None:
        # Return computed result or response payload to caller
        return
    # Begin guarded execution block to trap exceptions
    try:
        # Mark entity instance for deletion in database
        db.delete(otp_obj)
        # Commit transaction to persist changes in database
        db.commit()
    # Catch and handle specific exception if raised
    except Exception:
        # Roll back transaction to revert changes on failure
        db.rollback()
