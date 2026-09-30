from sqlalchemy.orm import Session
from app.models.profile_model import Profile


def get_profile_by_email(db: Session, email: str):
    return db.query(Profile).filter(Profile.email == email).first()


def get_profile_by_id(db: Session, user_id: int):
    return db.query(Profile).filter(Profile.id == user_id).first()

def get_by_emp_code(db: Session, emp_code: str):
    return db.query(Profile).filter(Profile.emp_code == emp_code).first()


def create_profile(db: Session, data):
    profile = Profile(**data)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_profile(db: Session, profile: Profile, data: dict):
    for key, value in data.items():
        if value is not None:
            setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile