# ==============================================================================
# QUICKCHEX HRMS BACKEND - ADD_EMP_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/add_emp_api.py
# Purpose: FastAPI route controller handling 'add_emp_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.post('') -> add_employee_api()
#   • router.post('/') -> add_employee_api()
# ==============================================================================

# Import APIRouter, Depends, HTTPException from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import AddEmployeeSchema from app.schemas.add_emp_schema for module operations
from app.schemas.add_emp_schema import AddEmployeeSchema
# Import add_employee from app.services.profile_service for module operations
from app.services.profile_service import add_employee
# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user

# Set router variable to store router value
router = APIRouter(prefix="/add-emp", tags=["Add Employee"])


# Define HTTP POST route endpoint handler
@router.post("")
# Define HTTP POST route endpoint handler
@router.post("/")
# Define add_employee_api function to handle add employee api
def add_employee_api(
    # Define data schema field with type AddEmployeeSchema,
    data: AddEmployeeSchema,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set current_user variable to store current user value
    current_user=Depends(get_current_user),
# Execute statement to process data and maintain state
):
    # Set role variable to store role value
    role = str(getattr(current_user, "role", "")).strip().lower()
    # Check if target condition is false or object is missing
    if role not in {"admin", "manager", "superadmin", "super_admin"}:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=403, detail="Forbidden: Admin or manager access required to add employees.")

    # Set result variable to store result value
    result = add_employee(db, data)

    # Check if target condition is false or object is missing
    if not result:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Employee could not be created.")

    # Set first variable to store first value
    first = (result.first_name or "").strip()
    # Set last variable to store last value
    last = (result.last_name or "").strip()
    # Set full_name variable to store full name value
    full_name = f"{first} {last}".strip() or result.emp_code
    # Set join_str variable to store join str value
    join_str = result.emp_join_date.strftime("%Y-%m-%d") if result.emp_join_date else ""

    # Set employee_data variable to store employee data value
    employee_data = {
        # Execute statement to process data and maintain state
        "id": result.emp_code,
        # Execute statement to process data and maintain state
        "emp_code": result.emp_code,
        # Execute statement to process data and maintain state
        "employee_id": result.emp_code,
        # Execute statement to process data and maintain state
        "employeeId": result.emp_code,
        # Execute statement to process data and maintain state
        "name": full_name,
        # Execute statement to process data and maintain state
        "first_name": result.first_name or "",
        # Execute statement to process data and maintain state
        "last_name": result.last_name or "",
        # Execute statement to process data and maintain state
        "email": result.email or "",
        # Execute statement to process data and maintain state
        "phone": result.mobile_no or "",
        # Execute statement to process data and maintain state
        "mobile": result.mobile_no or "",
        # Execute statement to process data and maintain state
        "mobile_no": result.mobile_no or "",
        # Execute statement to process data and maintain state
        "contact": result.mobile_no or "",
        # Execute statement to process data and maintain state
        "role": result.role or "employee",
        # Execute statement to process data and maintain state
        "designation": result.designation or "Employee",
        # Execute statement to process data and maintain state
        "department": result.department or "General",
        # Execute statement to process data and maintain state
        "type": result.employment_type or "Full-time",
        # Execute statement to process data and maintain state
        "employment_type": result.employment_type or "Full-time",
        # Execute statement to process data and maintain state
        "location": result.branch_location or "Mumbai, IN",
        # Execute statement to process data and maintain state
        "status": result.employment_status or "Active",
        # Execute statement to process data and maintain state
        "employment_status": result.employment_status or "Active",
        # Execute statement to process data and maintain state
        "joining_date": join_str,
        # Execute statement to process data and maintain state
        "joined": join_str,
        # Execute statement to process data and maintain state
        "about": getattr(result, "about", "") or "",
        # Execute statement to process data and maintain state
        "profile_image": getattr(result, "profile_image", "") or None
    # Execute statement to process data and maintain state
    }

    # Set has_salary variable to store has salary value
    has_salary = bool(getattr(data, "salary", None) or getattr(data, "monthly_gross", None) or getattr(data, "annual_ctc", None))
    # Set success_msg variable to store success msg value
    success_msg = "Employee added successfully. Payroll profile initialized." if has_salary else "Employee added successfully. Payroll profile created — salary setup is still required before the first payslip can be generated."

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "success": True,
        # Execute statement to process data and maintain state
        "message": success_msg,
        # Execute statement to process data and maintain state
        "emp_code": result.emp_code,
        # Execute statement to process data and maintain state
        "payroll_status": "Configured" if has_salary else "Payroll Setup Required",
        # Execute statement to process data and maintain state
        "employee": employee_data
    # Execute statement to process data and maintain state
    }
