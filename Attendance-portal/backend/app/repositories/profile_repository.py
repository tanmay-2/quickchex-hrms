# ==============================================================================
# QUICKCHEX HRMS BACKEND - PROFILE_REPOSITORY.PY
# Path: Attendance-portal/backend/app/repositories/profile_repository.py
# Purpose: Data access repository encapsulating queries and mutations for 'profile_repository'.
# Primary Functions:
#   • get_profile_by_email()
#   • get_profile_by_id()
#   • get_by_emp_code()
#   • create_profile()
#   • update_profile()
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile


# Define get_profile_by_email function to handle get profile by email
def get_profile_by_email(db: Session, email: str):
    # Initiate database query on specified model
    return db.query(Profile).filter(Profile.email == email).first()


# Define get_profile_by_id function to handle get profile by id
def get_profile_by_id(db: Session, user_id: int):
    # Initiate database query on specified model
    return db.query(Profile).filter(Profile.id == user_id).first()

# Define get_by_emp_code function to handle get by emp code
def get_by_emp_code(db: Session, emp_code: str):
    # Initiate database query on specified model
    return db.query(Profile).filter(Profile.emp_code == emp_code).first()


# Define create_profile function to handle create profile
def create_profile(db: Session, data):
    # Set profile variable to store profile value
    profile = Profile(**data)
    # Stage new entity instance into database session
    db.add(profile)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(profile)
    # Return computed result or response payload to caller
    return profile


# Define update_profile function to handle update profile
def update_profile(db: Session, profile: Profile, data: dict):
    # Iterate through items in sequence loop
    for key, value in data.items():
        # Check if target condition is false or object is missing
        if value is not None:
            # Invoke setattr to perform operational action
            setattr(profile, key, value)

    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(profile)
    # Return computed result or response payload to caller
    return profile