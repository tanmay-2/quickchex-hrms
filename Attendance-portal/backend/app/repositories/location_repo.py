# ==============================================================================
# QUICKCHEX HRMS BACKEND - LOCATION_REPO.PY
# Path: Attendance-portal/backend/app/repositories/location_repo.py
# Purpose: Data access repository encapsulating queries and mutations for 'location_repo'.
# Primary Functions:
#   • create_location()
#   • get_all_locations()
#   • get_last_location_by_user()
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import Location from app.models.location for module operations
from app.models.location import Location


# Define create_location function to handle create location
def create_location(db: Session, user_id: int, lat: float, lon: float, loc_type: str):
    # Set location variable to store location value
    location = Location(
        # Set user_id variable to store user id value
        user_id=user_id,
        # Set latitude variable to store latitude value
        latitude=lat,
        # Set longitude variable to store longitude value
        longitude=lon,
        # Set type variable to store type value
        type=loc_type
    # Execute statement to process data and maintain state
    )
    # Stage new entity instance into database session
    db.add(location)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(location)
    # Return computed result or response payload to caller
    return location


# Define get_all_locations function to handle get all locations
def get_all_locations(db: Session):
    # Initiate database query on specified model
    return db.query(Location).all()


# Define get_last_location_by_user function to handle get last location by user
def get_last_location_by_user(db: Session, user_id: int):
    # Return computed result or response payload to caller
    return (
        # Initiate database query on specified model
        db.query(Location)
        # Invoke .filter to perform operational action
        .filter(Location.user_id == user_id)
        # Invoke .order_by to perform operational action
        .order_by(Location.created_at.desc())
        # Invoke .first to perform operational action
        .first()
    # Execute statement to process data and maintain state
    )