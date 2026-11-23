# ==============================================================================
# QUICKCHEX HRMS BACKEND - LOCATION.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/location.py
# Purpose: FastAPI route controller handling 'location' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/', response_model=List[LocationWithUserResponse]) -> get_all_locations_api()
#   • router.get('/me') -> get_my_last_location()
# ==============================================================================

# Import APIRouter, Depends from fastapi for module operations
from fastapi import APIRouter, Depends
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import List from typing for module operations
from typing import List

# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import LocationWithUserResponse from app.schemas.location for module operations
from app.schemas.location import LocationWithUserResponse
# Import get_all_user_locations, get_last_location from app.services.location_service for module operations
from app.services.location_service import get_all_user_locations, get_last_location
# Import require_roles, get_current_user from app.core.dependencies for module operations
from app.core.dependencies import require_roles, get_current_user
# Import ADMIN from app.core.constants for module operations
from app.core.constants import ADMIN
# Import User from app.models.user for module operations
from app.models.user import User

# Set router variable to store router value
router = APIRouter(prefix="/locations", tags=["Location"])


# 🔒 Admin → All locations
@router.get("/", response_model=List[LocationWithUserResponse])
# Define get_all_locations_api function to handle get all locations api
def get_all_locations_api(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define _ schema field with type User and default value
    _: User = Depends(require_roles([ADMIN]))
# Execute statement to process data and maintain state
):
    # Return computed result or response payload to caller
    return get_all_user_locations(db)


# 👤 User → Last location
@router.get("/me")
# Define get_my_last_location function to handle get my last location
def get_my_last_location(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define user schema field with type User and default value
    user: User = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Return computed result or response payload to caller
    return get_last_location(db, user.id)