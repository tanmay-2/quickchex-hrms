# ==============================================================================
# QUICKCHEX HRMS BACKEND - USER_REPO.PY
# Path: Attendance-portal/backend/app/repositories/user_repo.py
# Purpose: Data access repository encapsulating queries and mutations for 'user_repo'.
# Primary Functions:
#   • get_user_by_email()
#   • get_user_by_id()
#   • get_all_users()
#   • create_user()
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import User from app.models.user for module operations
from app.models.user import User



# Define get_user_by_email function to handle get user by email
def get_user_by_email(db: Session, email: str):
    # Initiate database query on specified model
    return db.query(User).filter(User.email == email).first()


# Define get_user_by_id function to handle get user by id
def get_user_by_id(db: Session, user_id: int):
    # Initiate database query on specified model
    return db.query(User).filter(User.id == user_id).first()


# Define get_all_users function to handle get all users
def get_all_users(db: Session):
    # Initiate database query on specified model
    return db.query(User).all()


# Define create_user function to handle create user
def create_user(db: Session, user: User):
    # Stage new entity instance into database session
    db.add(user)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(user)
    # Return computed result or response payload to caller
    return user