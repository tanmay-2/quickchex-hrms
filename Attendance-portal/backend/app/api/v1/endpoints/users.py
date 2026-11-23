# ==============================================================================
# QUICKCHEX HRMS BACKEND - USERS.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/users.py
# Purpose: FastAPI route controller handling 'users' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.post('/', response_model=UserResponse) -> create_user()
#   • router.get('/me', response_model=UserResponse) -> get_me()
#   • router.get('/', response_model=List[UserResponse]) -> get_users()
# ==============================================================================

# Import APIRouter, Depends from fastapi for module operations
from fastapi import APIRouter, Depends
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import List from typing for module operations
from typing import List

# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import UserResponse, UserCreate from app.schemas.user for module operations
from app.schemas.user import UserResponse, UserCreate
# Import  from app.services.user_service for module operations
from app.services.user_service import (
    # Execute statement to process data and maintain state
    create_user_service,
    # Execute statement to process data and maintain state
    get_me_service,
    # Execute statement to process data and maintain state
    get_users_service,
# Execute statement to process data and maintain state
)
# Import get_current_user, require_roles from app.core.dependencies for module operations
from app.core.dependencies import get_current_user, require_roles
# Import User from app.models.user for module operations
from app.models.user import User
# Import ADMIN from app.core.constants for module operations
from app.core.constants import ADMIN

# Set router variable to store router value
router = APIRouter()


# Define HTTP POST route endpoint handler
@router.post("/", response_model=UserResponse)
# Define create_user function to handle create user
def create_user(
    # Define data schema field with type UserCreate,
    data: UserCreate,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
# Execute statement to process data and maintain state
):
    # Return computed result or response payload to caller
    return create_user_service(db, data)


# Define HTTP GET route endpoint handler
@router.get("/me", response_model=UserResponse)
# Define get_me function to handle get me
def get_me(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define current_user schema field with type User and default value
    current_user: User = Depends(get_current_user),
# Execute statement to process data and maintain state
):
    # Return computed result or response payload to caller
    return get_me_service(db, current_user.id)


# Define HTTP GET route endpoint handler
@router.get("/", response_model=List[UserResponse])
# Define get_users function to handle get users
def get_users(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define _ schema field with type User and default value
    _: User = Depends(require_roles([ADMIN])),
# Execute statement to process data and maintain state
):
    # Return computed result or response payload to caller
    return get_users_service(db)