# ==============================================================================
# QUICKCHEX HRMS BACKEND - LOCATION_REPO.PY
# Path: Attendance-portal/backend/app/repositories/location_repo.py
# Purpose: Data access repository encapsulating queries and mutations for 'location_repo'.
# Primary Functions:
#   • create_location()
#   • get_all_locations()
#   • get_last_location_by_user()
# ==============================================================================

from sqlalchemy.orm import Session
from app.models.location import Location


def create_location(db: Session, user_id: int, lat: float, lon: float, loc_type: str):
    location = Location(
        user_id=user_id,
        latitude=lat,
        longitude=lon,
        type=loc_type
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


def get_all_locations(db: Session):
    return db.query(Location).all()


def get_last_location_by_user(db: Session, user_id: int):
    return (
        db.query(Location)
        .filter(Location.user_id == user_id)
        .order_by(Location.created_at.desc())
        .first()
    )