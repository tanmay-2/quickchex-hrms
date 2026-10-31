# ==============================================================================
# QUICKCHEX HRMS BACKEND - MONTHLY_ROUTES.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/monthly_routes.py
# Purpose: FastAPI route controller handling 'monthly_routes' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/monthly-sheets/by-employee') -> get_monthly_sheet()
#   • router.post('/monthly-sheets/') -> create_monthly_sheet()
# Classes / Data Models:
#   • SheetCreate
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.models.monthly_sheet_model import MonthlySheet

router = APIRouter(tags=["Monthly Sheets"])

# Schema to handle the JSON body from React
class SheetCreate(BaseModel):
    emp_code: str
    month: int
    year: int

@router.get("/monthly-sheets/by-employee")
def get_monthly_sheet(emp_code: str, month: int, year: int, db: Session = Depends(get_db)):
    sheet = db.query(MonthlySheet).filter(
        MonthlySheet.emp_code == emp_code,
        MonthlySheet.month == month,
        MonthlySheet.year == year
    ).first()
    
    if not sheet:
        return {"id": None, "message": "No sheet found"}
    return sheet

@router.post("/monthly-sheets/")
def create_monthly_sheet(sheet_data: SheetCreate, db: Session = Depends(get_db)):
    existing = db.query(MonthlySheet).filter(
        MonthlySheet.emp_code == sheet_data.emp_code,
        MonthlySheet.month == sheet_data.month,
        MonthlySheet.year == sheet_data.year
    ).first()
    
    if existing:
        return existing

    new_sheet = MonthlySheet(
        emp_code=sheet_data.emp_code, 
        month=sheet_data.month, 
        year=sheet_data.year
    )
    db.add(new_sheet)
    db.commit()
    db.refresh(new_sheet)
    return new_sheet