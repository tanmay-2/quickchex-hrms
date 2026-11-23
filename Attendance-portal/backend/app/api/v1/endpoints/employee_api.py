# ==============================================================================
# QUICKCHEX HRMS BACKEND - EMPLOYEE_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/employee_api.py
# Purpose: FastAPI route controller handling 'employee_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/') -> get_employees()
# ==============================================================================

# Import APIRouter, Depends from fastapi for module operations
from fastapi import APIRouter, Depends
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile

# Set router variable to store router value
router = APIRouter(prefix="/employees", tags=["Employees"])

# Register API route decorator for endpoint handling
@router.get("/")
# Define get_employees function to handle get employees
def get_employees(db: Session = Depends(get_db)):
    # Set employees variable to store employees value
    employees = db.query(Profile).all()
    # Return computed result or response to caller
    return employees