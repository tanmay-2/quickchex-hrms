from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.add_emp_schema import AddEmployeeSchema
from app.services.profile_service import add_employee

router = APIRouter(prefix="/add-emp", tags=["Add Employee"])


@router.post("/")
def add_employee_api(data: AddEmployeeSchema, db: Session = Depends(get_db)):
    result = add_employee(db, data)

    if not result:
        raise HTTPException(status_code=400, detail="Employee already exists")

    return {
        "message": "Employee added successfully",
        "emp_code": result.emp_code
    }