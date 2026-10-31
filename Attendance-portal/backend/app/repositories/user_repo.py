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

from sqlalchemy.orm import Session
from app.models.user import User



def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def get_all_users(db: Session):
    return db.query(User).all()


def create_user(db: Session, user: User):
    db.add(user)
    db.commit()
    db.refresh(user)
    return user