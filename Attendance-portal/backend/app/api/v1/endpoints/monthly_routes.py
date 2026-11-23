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

# Import APIRouter, Depends, HTTPException from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import MonthlySheet from app.models.monthly_sheet_model for module operations
from app.models.monthly_sheet_model import MonthlySheet

# Set router variable to store router value
router = APIRouter(tags=["Monthly Sheets"])

# Schema to handle the JSON body from React
class SheetCreate(BaseModel):
    # Define emp_code schema field with type str
    emp_code: str
    # Define month schema field with type int
    month: int
    # Define year schema field with type int
    year: int

# Define HTTP GET route endpoint handler
@router.get("/monthly-sheets/by-employee")
# Define get_monthly_sheet function to handle get monthly sheet
def get_monthly_sheet(emp_code: str, month: int, year: int, db: Session = Depends(get_db)):
    # Initiate database query on specified model
    sheet = db.query(MonthlySheet).filter(
        # Specify parameter value for MonthlySheet.emp_code
        MonthlySheet.emp_code == emp_code,
        # Specify parameter value for MonthlySheet.month
        MonthlySheet.month == month,
        # Execute statement to process data and maintain state
        MonthlySheet.year == year
    # Execute statement to process data and maintain state
    ).first()
    
    # Check if target condition is false or object is missing
    if not sheet:
        # Return computed result or response payload to caller
        return {"id": None, "message": "No sheet found"}
    # Return computed result or response payload to caller
    return sheet

# Define HTTP POST route endpoint handler
@router.post("/monthly-sheets/")
# Define create_monthly_sheet function to handle create monthly sheet
def create_monthly_sheet(sheet_data: SheetCreate, db: Session = Depends(get_db)):
    # Initiate database query on specified model
    existing = db.query(MonthlySheet).filter(
        # Specify parameter value for MonthlySheet.emp_code
        MonthlySheet.emp_code == sheet_data.emp_code,
        # Specify parameter value for MonthlySheet.month
        MonthlySheet.month == sheet_data.month,
        # Execute statement to process data and maintain state
        MonthlySheet.year == sheet_data.year
    # Execute statement to process data and maintain state
    ).first()
    
    # Evaluate condition to control execution branch
    if existing:
        # Return computed result or response payload to caller
        return existing

    # Set new_sheet variable to store new sheet value
    new_sheet = MonthlySheet(
        # Set emp_code variable to store emp code value
        emp_code=sheet_data.emp_code, 
        # Set month variable to store month value
        month=sheet_data.month, 
        # Set year variable to store year value
        year=sheet_data.year
    # Execute statement to process data and maintain state
    )
    # Stage new entity instance into database session
    db.add(new_sheet)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(new_sheet)
    # Return computed result or response payload to caller
    return new_sheet