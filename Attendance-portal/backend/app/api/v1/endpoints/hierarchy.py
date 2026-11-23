# ==============================================================================
# QUICKCHEX HRMS BACKEND - HIERARCHY.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/hierarchy.py
# Purpose: FastAPI route controller handling 'hierarchy' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/my-team') -> my_team()
# ==============================================================================

# Import APIRouter, Depends from fastapi for module operations
from fastapi import APIRouter, Depends
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import User from app.models.user for module operations
from app.models.user import User
# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user

# Set router variable to store router value
router = APIRouter()

# Define HTTP GET route endpoint handler
@router.get("/my-team")
# Define my_team function to handle my team
def my_team(db: Session = Depends(get_db),
            # Define user schema field with type User and default value
            user: User = Depends(get_current_user)):

    # Initiate database query on specified model
    team = db.query(User).filter(User.manager_id == user.id).all()

    # Return computed result or response payload to caller
    return team