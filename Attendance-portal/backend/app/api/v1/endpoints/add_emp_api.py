from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.add_emp_schema import AddEmployeeSchema
from app.services.profile_service import add_employee
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/add-emp", tags=["Add Employee"])


@router.post("")
@router.post("/")
def add_employee_api(
    data: AddEmployeeSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = str(getattr(current_user, "role", "")).strip().lower()
    if role not in {"admin", "manager", "superadmin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Forbidden: Admin or manager access required to add employees.")

    result = add_employee(db, data)

    if not result:
        raise HTTPException(status_code=400, detail="Employee could not be created.")

    first = (result.first_name or "").strip()
    last = (result.last_name or "").strip()
    full_name = f"{first} {last}".strip() or result.emp_code
    join_str = result.emp_join_date.strftime("%Y-%m-%d") if result.emp_join_date else ""

    employee_data = {
        "id": result.emp_code,
        "emp_code": result.emp_code,
        "employee_id": result.emp_code,
        "employeeId": result.emp_code,
        "name": full_name,
        "first_name": result.first_name or "",
        "last_name": result.last_name or "",
        "email": result.email or "",
        "phone": result.mobile_no or "",
        "mobile": result.mobile_no or "",
        "mobile_no": result.mobile_no or "",
        "contact": result.mobile_no or "",
        "role": result.role or "employee",
        "designation": result.designation or "Employee",
        "department": result.department or "General",
        "type": result.employment_type or "Full-time",
        "employment_type": result.employment_type or "Full-time",
        "location": result.branch_location or "Mumbai, IN",
        "status": result.employment_status or "Active",
        "employment_status": result.employment_status or "Active",
        "joining_date": join_str,
        "joined": join_str,
        "about": getattr(result, "about", "") or "",
        "profile_image": getattr(result, "profile_image", "") or None
    }

    has_salary = bool(getattr(data, "salary", None) or getattr(data, "monthly_gross", None) or getattr(data, "annual_ctc", None))
    success_msg = "Employee added successfully. Payroll profile initialized." if has_salary else "Employee added successfully. Payroll profile created — salary setup is still required before the first payslip can be generated."

    return {
        "success": True,
        "message": success_msg,
        "emp_code": result.emp_code,
        "payroll_status": "Configured" if has_salary else "Payroll Setup Required",
        "employee": employee_data
    }
