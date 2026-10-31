# ==============================================================================
# QUICKCHEX HRMS BACKEND - EMPLOYEE_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/employee_api.py
# Purpose: FastAPI route controller handling 'employee_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/') -> get_employees()
# ==============================================================================

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.profile_model import Profile

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get("/")
def get_employees(db: Session = Depends(get_db)):
    employees = db.query(Profile).all()
    return employees