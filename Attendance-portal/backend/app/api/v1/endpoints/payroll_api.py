# ==============================================================================
# QUICKCHEX HRMS BACKEND - PAYROLL_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/payroll_api.py
# Purpose: FastAPI route controller handling 'payroll_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('') -> get_payroll_list()
#   • router.get('/settings') -> get_payroll_settings_api()
#   • router.post('/settings') -> update_payroll_settings_api()
#   • router.put('/settings') -> update_payroll_settings_api()
#   • router.post('/calculate') -> calculate_monthly_payroll_api()
#   • router.post('/generate') -> calculate_monthly_payroll_api()
#   • router.post('/finalize') -> finalize_payroll_api()
#   • router.post('/reopen') -> reopen_payroll_api()
#   • ... and 11 more endpoints
# ==============================================================================

# Import module csv for system functionality
import csv
# Import module io for system functionality
import io
# Import module logging for system functionality
import logging
# Import datetime from datetime for module operations
from datetime import datetime
# Import module openpyxl for system functionality
import openpyxl
# Import APIRouter, Depends, HTTPException, Request, Response from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, Request, Response
# Import text from sqlalchemy for module operations
from sqlalchemy import text
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import payroll_service from app.services for module operations
from app.services import payroll_service

# Set logger variable to store logger value
logger = logging.getLogger(__name__)

# Set router variable to store router value
router = APIRouter(prefix="/payroll", tags=["Payroll"])


# Define _extract_admin_user function to handle  extract admin user
def _extract_admin_user(request: Request, db: Session):
    # Import get_current_user from app.core.dependencies for module operations
    from app.core.dependencies import get_current_user
    # Import HTTPAuthorizationCredentials from fastapi.security for module operations
    from fastapi.security import HTTPAuthorizationCredentials

    # Set auth_h variable to store auth h value
    auth_h = request.headers.get("authorization", "") if request else ""
    # Set token variable to store token value
    token = None
    # Evaluate condition to control execution branch
    if auth_h.startswith("Bearer "):
        # Set token variable to store token value
        token = auth_h.split(" ", 1)[1].strip()

    # Set creds variable to store creds value
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token) if token else None
    # Begin guarded execution block to trap exceptions
    try:
        # Set user variable to store user value
        user = get_current_user(request=request, credentials=creds, db=db)
    # Catch and handle specific exception if raised
    except HTTPException:
        # Raise exception to abort current operation with error
        raise
    # Catch and handle specific exception if raised
    except Exception as exc:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(exc)}")

    # Check if target condition is false or object is missing
    if not user:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=401, detail="Authenticated user was not found.")
    # Set role variable to store role value
    role = str(getattr(user, "role", "") or "").strip().lower()
    # Check if target condition is false or object is missing
    if role not in {"admin", "superadmin", "hr", "administrator", "manager"}:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=403, detail="Forbidden: Admin or manager access required for payroll operations.")
    # Return computed result or response payload to caller
    return user


# Define HTTP GET route endpoint handler
@router.get("")
# Define get_payroll_list function to handle get payroll list
def get_payroll_list(
    # Define search schema field with type str and default value
    search: str = "",
    # Define month schema field with type str and default value
    month: str = "",
    # Define year schema field with type str and default value
    year: str = "",
    # Define department schema field with type str and default value
    department: str = "",
    # Define status schema field with type str and default value
    status: str = "",
    # Define worker_type schema field with type str and default value
    worker_type: str = "",
    # Define has_exceptions schema field with type str and default value
    has_exceptions: str = "",
    # Define force_recalculate schema field with type bool and default value
    force_recalculate: bool = False,
    # Define request schema field with type Request and default value
    request: Request = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """
    Returns actual, database-backed payroll records for all employees.
    Calculates calendar days dynamically and provides reconciliation summary.
    """
    _extract_admin_user(request, db)
    # Return computed result or response payload to caller
    return payroll_service.get_all_payroll_records(
        # Set db variable to store db value
        db=db,
        # Set search variable to store search value
        search=search,
        # Set month variable to store month value
        month=month,
        # Set year variable to store year value
        year=year,
        # Set department variable to store department value
        department=department,
        # Set status variable to store status value
        status=status,
        # Set worker_type variable to store worker type value
        worker_type=worker_type,
        # Set has_exceptions variable to store has exceptions value
        has_exceptions=has_exceptions,
        # Set force_recalculate variable to store force recalculate value
        force_recalculate=force_recalculate
    # Execute statement to process data and maintain state
    )


# Define HTTP GET route endpoint handler
@router.get("/settings")
# Define get_payroll_settings_api function to handle get payroll settings api
def get_payroll_settings_api(request: Request, db: Session = Depends(get_db)):
    """Returns company-wide payroll rules and intern configuration."""
    _extract_admin_user(request, db)
    # Return computed result or response payload to caller
    return payroll_service.get_payroll_settings(db)


# Define HTTP POST route endpoint handler
@router.post("/settings")
# Define HTTP PUT route endpoint handler
@router.put("/settings")
# Define update_payroll_settings_api function to handle update payroll settings api
async def update_payroll_settings_api(request: Request, db: Session = Depends(get_db)):
    """Updates company-wide payroll rules and intern configuration."""
    user = _extract_admin_user(request, db)
    # Set body variable to store body value
    body = await request.json()
    # Set u_name variable to store u name value
    u_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "Admin"
    # Return computed result or response payload to caller
    return payroll_service.update_payroll_settings(db, body, user_name=u_name)


# Define HTTP POST route endpoint handler
@router.post("/calculate")
# Define HTTP POST route endpoint handler
@router.post("/generate")
# Define calculate_monthly_payroll_api function to handle calculate monthly payroll api
async def calculate_monthly_payroll_api(request: Request, db: Session = Depends(get_db)):
    """Recalculates dynamic payroll for the selected month and year."""
    _extract_admin_user(request, db)
    # Set body variable to store body value
    body = await request.json()
    # Set month variable to store month value
    month = body.get("month", "")
    # Set year variable to store year value
    year = str(body.get("year", ""))
    # Return computed result or response payload to caller
    return payroll_service.get_all_payroll_records(
        # Set db variable to store db value
        db=db,
        # Set month variable to store month value
        month=month,
        # Set year variable to store year value
        year=year,
        # Set force_recalculate variable to store force recalculate value
        force_recalculate=True
    # Execute statement to process data and maintain state
    )


# Define HTTP POST route endpoint handler
@router.post("/finalize")
# Define finalize_payroll_api function to handle finalize payroll api
async def finalize_payroll_api(request: Request, db: Session = Depends(get_db)):
    """Finalizes payroll and creates official payslips for Employee Portal."""
    user = _extract_admin_user(request, db)
    # Set body variable to store body value
    body = await request.json()
    # Set month variable to store month value
    month = body.get("month", "")
    # Set year variable to store year value
    year = int(body.get("year", 2026))
    # Set allow_with_exceptions variable to store allow with exceptions value
    allow_with_exceptions = bool(body.get("allow_with_exceptions", False))
    # Set u_name variable to store u name value
    u_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "Admin"
    # Begin guarded execution block to trap exceptions
    try:
        # Return computed result or response payload to caller
        return payroll_service.finalize_monthly_payroll(
            # Execute statement to process data and maintain state
            db, month=month, year=year, user_name=u_name, allow_with_exceptions=allow_with_exceptions
        # Execute statement to process data and maintain state
        )
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))


# Define HTTP POST route endpoint handler
@router.post("/reopen")
# Define reopen_payroll_api function to handle reopen payroll api
async def reopen_payroll_api(request: Request, db: Session = Depends(get_db)):
    """Reopens a finalized payroll back to Draft status."""
    user = _extract_admin_user(request, db)
    # Set body variable to store body value
    body = await request.json()
    # Set month variable to store month value
    month = body.get("month", "")
    # Set year variable to store year value
    year = int(body.get("year", 2026))
    # Set u_name variable to store u name value
    u_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "Admin"
    # Return computed result or response payload to caller
    return payroll_service.reopen_monthly_payroll(db, month=month, year=year, user_name=u_name)


# Define HTTP GET route endpoint handler
@router.get("/history")
# Define get_payroll_history_api function to handle get payroll history api
def get_payroll_history_api(request: Request, db: Session = Depends(get_db)):
    """Returns all historical payroll runs."""
    _extract_admin_user(request, db)
    # Return computed result or response payload to caller
    return payroll_service.get_payroll_history(db)


# Define HTTP POST route endpoint handler
@router.post("/intern/convert")
# Define intern_conversion_api function to handle intern conversion api
async def intern_conversion_api(request: Request, db: Session = Depends(get_db)):
    """HR records intern conversion, extension, or status decision."""
    user = _extract_admin_user(request, db)
    # Set body variable to store body value
    body = await request.json()
    # Set emp_code variable to store emp code value
    emp_code = body.get("emp_code")
    # Check if target condition is false or object is missing
    if not emp_code:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="emp_code is required.")
    # Set u_name variable to store u name value
    u_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "Admin"
    # Return computed result or response payload to caller
    return payroll_service.record_intern_conversion(db, emp_code, body, user_name=u_name)


# Define HTTP PUT route endpoint handler
@router.put("/employee/{emp_code}/salary")
# Define update_employee_salary_api function to handle update employee salary api
async def update_employee_salary_api(emp_code: str, request: Request, db: Session = Depends(get_db)):
    """Updates employee salary/stipend and PT configuration."""
    _extract_admin_user(request, db)
    # Set body variable to store body value
    body = await request.json()
    # Begin guarded execution block to trap exceptions
    try:
        # Also update pt_applicable on profile_master if provided
        if "pt_applicable" in body or "ptApplicable" in body:
            # Set pt_val variable to store pt val value
            pt_val = bool(body.get("pt_applicable") if "pt_applicable" in body else body.get("ptApplicable"))
            # Import text from sqlalchemy for module operations
            from sqlalchemy import text
            # Invoke db.execute to perform operational action
            db.execute(text("UPDATE profile_master SET pt_applicable = :pt WHERE emp_code = :c"), {"pt": pt_val, "c": emp_code})
            # Invoke db.execute to perform operational action
            db.execute(text("UPDATE payroll_profiles SET pt_applicable = :pt WHERE emp_code = :c"), {"pt": pt_val, "c": emp_code})
            # Commit transaction to persist changes in database
            db.commit()

        # Also update employment_type if provided
        if "worker_type" in body or "employment_type" in body:
            # Set wt variable to store wt value
            wt = body.get("worker_type") or body.get("employment_type")
            # Import text from sqlalchemy for module operations
            from sqlalchemy import text
            # Invoke db.execute to perform operational action
            db.execute(text("UPDATE profile_master SET employment_type = :wt WHERE emp_code = :c"), {"wt": wt, "c": emp_code})
            # Commit transaction to persist changes in database
            db.commit()

        # Set res variable to store res value
        res = payroll_service.update_employee_salary_configuration(db, emp_code, body)
        # Return computed result or response payload to caller
        return {"status": "success", "message": f"Salary updated for {emp_code}.", "data": res, **res}
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))



# Define HTTP POST route endpoint handler
@router.post("/validate")
# Define validate_payroll_records function to handle validate payroll records
async def validate_payroll_records(request: Request, db: Session = Depends(get_db)):
    # Invoke _extract_admin_user to perform operational action
    _extract_admin_user(request, db)
    # Set body variable to store body value
    body = await request.json()
    # Set records variable to store records value
    records = body.get("records", [])
    # Set valid variable to store valid value
    valid = []
    # Set invalid variable to store invalid value
    invalid = []
    # Iterate through items in sequence loop
    for idx, r in enumerate(records, start=1):
        # Check if target condition is false or object is missing
        if not r.get("employeeId") and not r.get("employee_id") and not r.get("emp_code"):
            # Invoke invalid.append to perform operational action
            invalid.append({"row": idx, "errors": ["Missing Employee ID"]})
        # Execute fallback branch when conditions are not met
        else:
            # Invoke valid.append to perform operational action
            valid.append({"row": idx, **r, "errors": []})
    # Return computed result or response payload to caller
    return {"valid": valid, "invalid": invalid}


# Define HTTP POST route endpoint handler
@router.post("/import")
# Define import_payroll_records function to handle import payroll records
async def import_payroll_records(request: Request, db: Session = Depends(get_db)):
    # Invoke _extract_admin_user to perform operational action
    _extract_admin_user(request, db)
    # Set body variable to store body value
    body = await request.json()
    # Set records variable to store records value
    records = body.get("records", [])
    # Set count variable to store count value
    count = 0
    # Iterate through items in sequence loop
    for r in records:
        # Set emp_c variable to store emp c value
        emp_c = r.get("employeeId") or r.get("employee_id") or r.get("emp_code")
        # Check if target condition is false or object is missing
        if not emp_c:
            # Skip to next iteration of active loop
            continue
        # Set m variable to store m value
        m = r.get("month") or "September"
        # Set y variable to store y value
        y = int(r.get("year") or 2026)
        # Begin guarded execution block to trap exceptions
        try:
            # Invoke payroll_service.generate_payslip_for_employee_record to perform operational action
            payroll_service.generate_payslip_for_employee_record(db, emp_c, m, y)
            # Execute statement to process data and maintain state
            count += 1
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return {"imported": count, "message": f"Successfully imported {count} payroll records."}


# Define HTTP POST route endpoint handler
@router.post("/{record_id}/generate-payslip")
# Define generate_payslip_api function to handle generate payslip api
async def generate_payslip_api(record_id: str, request: Request, db: Session = Depends(get_db)):
    """
    Generates a single real payslip for the specified employee record.
    Prevents duplicates and strictly verifies salary is configured.
    """
    _extract_admin_user(request, db)

    # Parse record_id: e.g. "12", "rec-LE724-September-2026", or "LE724"
    emp_code = None
    # Set month variable to store month value
    month = "September"
    # Set year variable to store year value
    year = 2026

    # Evaluate condition to control execution branch
    if str(record_id).startswith("rec-"):
        # Set parts variable to store parts value
        parts = record_id.split("-")
        # Evaluate condition to control execution branch
        if len(parts) >= 4:
            # Set emp_code variable to store emp code value
            emp_code = parts[1]
            # Set month variable to store month value
            month = parts[2]
            # Set year variable to store year value
            year = int(parts[3])
    # Evaluate alternate branch condition
    elif not str(record_id).isdigit():
        # Set emp_code variable to store emp code value
        emp_code = record_id
    # Execute fallback branch when conditions are not met
    else:
        # Check if record_id is an existing payslip id
        from sqlalchemy import text
        # Set row variable to store row value
        row = db.execute(text("SELECT emp_code, month, year FROM payslips WHERE id = :id"), {"id": int(record_id)}).mappings().first()
        # Evaluate condition to control execution branch
        if row:
            # Set emp_code variable to store emp code value
            emp_code = row["emp_code"]
            # Set month variable to store month value
            month = row["month"]
            # Set year variable to store year value
            year = row["year"]

    # Also check request body for overrides
    try:
        # Set body variable to store body value
        body = await request.json()
        # Evaluate condition to control execution branch
        if body.get("emp_code"):
            # Set emp_code variable to store emp code value
            emp_code = body.get("emp_code")
        # Evaluate condition to control execution branch
        if body.get("month"):
            # Set month variable to store month value
            month = body.get("month")
        # Evaluate condition to control execution branch
        if body.get("year"):
            # Set year variable to store year value
            year = int(body.get("year"))
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Check if target condition is false or object is missing
    if not emp_code:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Employee ID could not be identified from record.")

    # Begin guarded execution block to trap exceptions
    try:
        # Set payslip variable to store payslip value
        payslip = payroll_service.generate_payslip_for_employee_record(db, emp_code, month, year)
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "success",
            # Execute statement to process data and maintain state
            "message": f"Payslip generated successfully for {emp_code} ({month} {year}).",
            # Execute statement to process data and maintain state
            "data": payslip,
            # Execute statement to process data and maintain state
            **payslip
        # Execute statement to process data and maintain state
        }
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# Define HTTP POST route endpoint handler
@router.post("/{record_id}/approve")
# Define approve_payroll_api function to handle approve payroll api
def approve_payroll_api(record_id: str, request: Request, db: Session = Depends(get_db)):
    # Invoke _extract_admin_user to perform operational action
    _extract_admin_user(request, db)
    # Begin guarded execution block to trap exceptions
    try:
        # Set res variable to store res value
        res = payroll_service.approve_payroll_record(db, record_id)
        # Return computed result or response payload to caller
        return {"status": "success", "message": "Payroll approved.", "data": res, **res}
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(e))


# Define HTTP PUT route endpoint handler
@router.put("/{record_id}")
# Define update_payroll_api function to handle update payroll api
async def update_payroll_api(record_id: str, request: Request, db: Session = Depends(get_db)):
    # Invoke _extract_admin_user to perform operational action
    _extract_admin_user(request, db)
    # Set body variable to store body value
    body = await request.json()

    # Determine emp_code
    emp_code = record_id
    # Evaluate condition to control execution branch
    if str(record_id).startswith("rec-"):
        # Set parts variable to store parts value
        parts = record_id.split("-")
        # Evaluate condition to control execution branch
        if len(parts) >= 2:
            # Set emp_code variable to store emp code value
            emp_code = parts[1]
    # Evaluate alternate branch condition
    elif str(record_id).isdigit():
        # Import text from sqlalchemy for module operations
        from sqlalchemy import text
        # Set row variable to store row value
        row = db.execute(text("SELECT emp_code FROM payslips WHERE id = :id"), {"id": int(record_id)}).mappings().first()
        # Evaluate condition to control execution branch
        if row:
            # Set emp_code variable to store emp code value
            emp_code = row["emp_code"]

    # Set emp_code variable to store emp code value
    emp_code = body.get("emp_code") or body.get("employeeId") or emp_code

    # Begin guarded execution block to trap exceptions
    try:
        # Set res variable to store res value
        res = payroll_service.update_employee_salary_configuration(db, emp_code, body)
        # Return computed result or response payload to caller
        return {"status": "success", "message": f"Salary updated for {emp_code}.", "data": res, **res}
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# Define HTTP GET route endpoint handler
@router.get("/{record_id}/payslip/download")
# Define download_payslip_api function to handle download payslip api
def download_payslip_api(
    # Define record_id schema field with type str,
    record_id: str,
    # Define month schema field with type str and default value
    month: str = "",
    # Define year schema field with type str and default value
    year: str = "",
    # Define request schema field with type Request and default value
    request: Request = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    # Invoke _extract_admin_user to perform operational action
    _extract_admin_user(request, db)
    # Begin guarded execution block to trap exceptions
    try:
        # Set clean_code variable to store clean code value
        clean_code = record_id
        # Set target_month variable to store target month value
        target_month = month
        # Set target_year variable to store target year value
        target_year = year

        # Evaluate condition to control execution branch
        if record_id.startswith("rec-"):
            # Set parts variable to store parts value
            parts = record_id.split("-")
            # Evaluate condition to control execution branch
            if len(parts) >= 2:
                # Set clean_code variable to store clean code value
                clean_code = parts[1]
            # Check if target condition is false or object is missing
            if len(parts) >= 3 and not target_month:
                # Set target_month variable to store target month value
                target_month = parts[2]
            # Check if target condition is false or object is missing
            if len(parts) >= 4 and not target_year:
                # Set target_year variable to store target year value
                target_year = parts[3]
        # Evaluate alternate branch condition
        elif record_id.isdigit():
            # Set num_id variable to store num id value
            num_id = int(record_id)
            # Set match variable to store match value
            match = db.execute(
                # Invoke text to perform operational action
                text("SELECT emp_code, month, year FROM payroll_records WHERE id = :id"),
                # Execute statement to process data and maintain state
                {"id": num_id}
            # Execute statement to process data and maintain state
            ).mappings().first()
            # Check if target condition is false or object is missing
            if not match:
                # Set match variable to store match value
                match = db.execute(
                    # Invoke text to perform operational action
                    text("SELECT emp_code, month, year FROM payslips WHERE id = :id"),
                    # Execute statement to process data and maintain state
                    {"id": num_id}
                # Execute statement to process data and maintain state
                ).mappings().first()
            # Evaluate condition to control execution branch
            if match:
                # Set clean_code variable to store clean code value
                clean_code = match["emp_code"]
                # Check if target condition is false or object is missing
                if not target_month:
                    # Set target_month variable to store target month value
                    target_month = match["month"]
                # Check if target condition is false or object is missing
                if not target_year:
                    # Set target_year variable to store target year value
                    target_year = str(match["year"])

        # Set now variable to store now value
        now = datetime.now()
        # Check if target condition is false or object is missing
        if not target_month:
            # Set target_month variable to store target month value
            target_month = "October" if now.year == 2026 else payroll_service.MONTH_NAMES[now.month - 1]
        # Check if target condition is false or object is missing
        if not target_year:
            # Set target_year variable to store target year value
            target_year = "2026" if now.year == 2026 else str(now.year)

        # Set pdf_bytes variable to store pdf bytes value
        pdf_bytes = payroll_service.generate_payslip_pdf(
            # Set db variable to store db value
            db=db,
            # Set payslip_id_or_code variable to store payslip id or code value
            payslip_id_or_code=record_id,
            # Set month variable to store month value
            month=month,
            # Set year variable to store year value
            year=year
        # Execute statement to process data and maintain state
        )
        # Return computed result or response payload to caller
        return Response(
            # Set content variable to store content value
            content=pdf_bytes,
            # Set media_type variable to store media type value
            media_type="application/pdf",
            # Set headers variable to store headers value
            headers={
                # Execute statement to process data and maintain state
                "Content-Disposition": f"attachment; filename=Payslip_{clean_code}_{target_month}_{target_year}.pdf"
            # Execute statement to process data and maintain state
            }
        # Execute statement to process data and maintain state
        )
    # Catch and handle specific exception if raised
    except ValueError as ve:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail=str(ve))
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"Payslip PDF download failed: {e}", exc_info=True)
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail="Unable to generate payslip. Please try again.")


# Define HTTP GET route endpoint handler
@router.get("/employee/{emp_code}/breakdown")
# Define get_employee_breakdown_api function to handle get employee breakdown api
def get_employee_breakdown_api(
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define month schema field with type str and default value
    month: str = "",
    # Define year schema field with type str and default value
    year: str = "",
    # Define request schema field with type Request and default value
    request: Request = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Returns granular calculation breakdown for employee modal."""
    _extract_admin_user(request, db)
    # Set data variable to store data value
    data = payroll_service.get_all_payroll_records(
        # Set db variable to store db value
        db=db, search=emp_code, month=month, year=year
    # Execute statement to process data and maintain state
    )
    # Set rec variable to store rec value
    rec = next((r for r in data.get("records", []) if r.get("employeeId") == emp_code or r.get("emp_code") == emp_code), None)
    # Check if target condition is false or object is missing
    if not rec:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail=f"Employee {emp_code} not found in payroll.")
    # Return computed result or response payload to caller
    return {"status": "success", "data": rec, **rec}


# Define HTTP GET route endpoint handler
@router.get("/export")
# Define export_payroll_api function to handle export payroll api
def export_payroll_api(
    # Define format schema field with type str and default value
    format: str = "csv",
    # Define search schema field with type str and default value
    search: str = "",
    # Define month schema field with type str and default value
    month: str = "",
    # Define year schema field with type str and default value
    year: str = "",
    # Define department schema field with type str and default value
    department: str = "",
    # Define status schema field with type str and default value
    status: str = "",
    # Define worker_type schema field with type str and default value
    worker_type: str = "",
    # Define has_exceptions schema field with type str and default value
    has_exceptions: str = "",
    # Define request schema field with type Request and default value
    request: Request = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
):
    """Exports comprehensive payroll report in Excel (.xlsx) or CSV format matching Section 57."""
    _extract_admin_user(request, db)
    # Set data variable to store data value
    data = payroll_service.get_all_payroll_records(
        # Set db variable to store db value
        db=db, search=search, month=month, year=year,
        # Set department variable to store department value
        department=department, status=status, worker_type=worker_type,
        # Set has_exceptions variable to store has exceptions value
        has_exceptions=has_exceptions
    # Execute statement to process data and maintain state
    )
    # Set records variable to store records value
    records = data.get("records", [])

    # Set headers variable to store headers value
    headers = [
        # Execute statement to process data and maintain state
        "Sr.no", "Employee ID", "Employee Name", "Designation", "Department", "Worker Type",
        # Execute statement to process data and maintain state
        "Gross Salary", "Days in month", "Paid Days", "Leave Taken",
        # Execute statement to process data and maintain state
        "Fixed Gross Salary", "Basic + DA", "HRA", "Flexi Allowance", "Gross",
        # Execute statement to process data and maintain state
        "Earn basic", "Earn HRA", "Earn Other Allo", "Flexi Allowance2", "Earn Gross",
        # Execute statement to process data and maintain state
        "PF WAGES", "PF", "ESIC", "PT", "LWF", "TDS",
        # Execute statement to process data and maintain state
        "Leave Deduction", "Other Deduction", "Arrears",
        # Execute statement to process data and maintain state
        "Net Salary", "Payroll Status", "Exceptions"
    # Execute statement to process data and maintain state
    ]

    # Define format_row function to handle format row
    def format_row(idx, r):
        # Set exc_str variable to store exc str value
        exc_str = "; ".join([e.get("message", "") for e in r.get("exceptions", [])]) if r.get("exceptions") else "None"
        # Set gross_val variable to store gross val value
        gross_val = r.get("monthlyCompensation", 0.0)
        # Set cal_d variable to store cal d value
        cal_d = r.get("calendarDays", 30)
        # Set paid_d variable to store paid d value
        paid_d = r.get("paidEquivalentDays", 0.0)
        # Set leave_taken variable to store leave taken value
        leave_taken = r.get("leaveTaken", 0.0)

        # Fixed structure
        fixed_gross = r.get("fixedGrossSalary", gross_val)
        # Set basic_val variable to store basic val value
        basic_val = r.get("basicSalary", round(gross_val * 0.5, 2))
        # Set hra_val variable to store hra val value
        hra_val = r.get("hra", round(gross_val * 0.25, 2))
        # Set flexi_val variable to store flexi val value
        flexi_val = r.get("flexiAllowance", round(gross_val - basic_val - hra_val, 2))

        # Earned components
        earn_basic = r.get("earnBasic", round(basic_val * (paid_d / cal_d), 2) if cal_d else 0.0)
        # Set earn_hra variable to store earn hra value
        earn_hra = r.get("earnHra", round(hra_val * (paid_d / cal_d), 2) if cal_d else 0.0)
        # Set earn_other variable to store earn other value
        earn_other = r.get("earnOtherAllo", round(flexi_val * (paid_d / cal_d), 2) if cal_d else 0.0)
        # Set earn_gross variable to store earn gross value
        earn_gross = r.get("earnGross", r.get("grossEarnedSalary", 0.0))

        # Deductions
        pf_wages = float(r.get("pfWages") or 0.0)
        # Set pf variable to store pf value
        pf = float(r.get("pfDeduction") or 0.0)
        # Set esic variable to store esic value
        esic = float(r.get("esicDeduction") or 0.0)
        # Set pt variable to store pt value
        pt = float(r.get("ptDeducted") or 0.0)
        # Set lwf variable to store lwf value
        lwf = float(r.get("lwfDeduction") or 0.0)
        # Set tds variable to store tds value
        tds = float(r.get("tdsDeduction") or 0.0)
        # Set leave_ded variable to store leave ded value
        leave_ded = float(r.get("lopDeduction") or 0.0)
        # Set other_ded variable to store other ded value
        other_ded = float(r.get("otherDeductions") or 0.0)
        # Set arrears variable to store arrears value
        arrears = float(r.get("arrears") or 0.0)
        # Set net_sal variable to store net sal value
        net_sal = float(r.get("netSalary") or 0.0)

        # Return computed result or response payload to caller
        return [
            # Execute statement to process data and maintain state
            idx,
            # Invoke r.get to perform operational action
            r.get("employeeId"),
            # Invoke r.get to perform operational action
            r.get("employeeName"),
            # Invoke r.get to perform operational action
            r.get("designation"),
            # Invoke r.get to perform operational action
            r.get("department"),
            # Invoke r.get to perform operational action
            r.get("workerType"),
            # Execute statement to process data and maintain state
            gross_val,
            # Execute statement to process data and maintain state
            cal_d,
            # Execute statement to process data and maintain state
            paid_d,
            # Execute statement to process data and maintain state
            leave_taken,
            # Execute statement to process data and maintain state
            fixed_gross,
            # Execute statement to process data and maintain state
            basic_val,
            # Execute statement to process data and maintain state
            hra_val,
            # Execute statement to process data and maintain state
            flexi_val,
            # Execute statement to process data and maintain state
            fixed_gross,
            # Execute statement to process data and maintain state
            earn_basic,
            # Execute statement to process data and maintain state
            earn_hra,
            # Execute statement to process data and maintain state
            earn_other,
            # Execute statement to process data and maintain state
            0.0,
            # Execute statement to process data and maintain state
            earn_gross,
            # Execute statement to process data and maintain state
            pf_wages,
            # Execute statement to process data and maintain state
            pf,
            # Execute statement to process data and maintain state
            esic,
            # Execute statement to process data and maintain state
            pt,
            # Execute statement to process data and maintain state
            lwf,
            # Execute statement to process data and maintain state
            tds,
            # Execute statement to process data and maintain state
            leave_ded,
            # Execute statement to process data and maintain state
            other_ded,
            # Execute statement to process data and maintain state
            arrears,
            # Execute statement to process data and maintain state
            net_sal,
            # Invoke r.get to perform operational action
            r.get("status"),
            # Execute statement to process data and maintain state
            exc_str
        # Execute statement to process data and maintain state
        ]

    # Evaluate condition to control execution branch
    if format.lower() == "xlsx":
        # Import Font, PatternFill, Alignment, Border, Side from openpyxl.styles for module operations
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        # Import get_column_letter from openpyxl.utils for module operations
        from openpyxl.utils import get_column_letter

        # Set wb variable to store wb value
        wb = openpyxl.Workbook()
        # Set ws variable to store ws value
        ws = wb.active
        # Execute statement to process data and maintain state
        ws.title = f"Payroll_{month or 'Month'}"

        # Invoke ws.append to perform operational action
        ws.append(headers)

        # Style Header Row matching Company Reference Sheet
        header_font = Font(name="Calibri", size=11, bold=True, color="000000")
        # Set yellow_fill variable to store yellow fill value
        yellow_fill = PatternFill(start_color="FFF200", end_color="FFF200", fill_type="solid")
        # Set green_fill variable to store green fill value
        green_fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
        # Set default_fill variable to store default fill value
        default_fill = PatternFill(start_color="EAECEF", end_color="EAECEF", fill_type="solid")
        # Set thin_border variable to store thin border value
        thin_border = Border(
            # Set left variable to store left value
            left=Side(style='thin', color='D0D5DD'),
            # Set right variable to store right value
            right=Side(style='thin', color='D0D5DD'),
            # Set top variable to store top value
            top=Side(style='thin', color='D0D5DD'),
            # Set bottom variable to store bottom value
            bottom=Side(style='thin', color='D0D5DD')
        # Execute statement to process data and maintain state
        )

        # Iterate through items in sequence loop
        for col_idx in range(1, len(headers) + 1):
            # Set cell variable to store cell value
            cell = ws.cell(row=1, column=col_idx)
            # Execute statement to process data and maintain state
            cell.font = header_font
            # Execute statement to process data and maintain state
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            # Execute statement to process data and maintain state
            cell.border = thin_border
            
            # Yellow group (Columns 11 to 15: Fixed Gross Salary, Basic + DA, HRA, Flexi Allowance, Gross)
            if 11 <= col_idx <= 15:
                # Execute statement to process data and maintain state
                cell.fill = yellow_fill
            # Green group (Columns 8 to 10: Days in month, Paid Days, Leave Taken, and Columns 27-29: Leave Ded, Other Ded, Arrears)
            elif 8 <= col_idx <= 10 or 27 <= col_idx <= 29:
                # Execute statement to process data and maintain state
                cell.fill = green_fill
            # Execute fallback branch when conditions are not met
            else:
                # Execute statement to process data and maintain state
                cell.fill = default_fill

        # Execute statement to process data and maintain state
        ws.row_dimensions[1].height = 28

        # Iterate through items in sequence loop
        for idx, r in enumerate(records, start=1):
            # Set row_data variable to store row data value
            row_data = format_row(idx, r)
            # Invoke ws.append to perform operational action
            ws.append(row_data)
            # Set current_row variable to store current row value
            current_row = ws.max_row
            # Execute statement to process data and maintain state
            ws.row_dimensions[current_row].height = 20
            # Iterate through items in sequence loop
            for col_idx in range(1, len(headers) + 1):
                # Set c variable to store c value
                c = ws.cell(row=current_row, column=col_idx)
                # Execute statement to process data and maintain state
                c.border = thin_border
                # Execute statement to process data and maintain state
                c.font = Font(name="Calibri", size=10)
                # Numeric alignments
                if isinstance(c.value, (int, float)):
                    # Execute statement to process data and maintain state
                    c.alignment = Alignment(horizontal="right", vertical="center")
                # Execute fallback branch when conditions are not met
                else:
                    # Execute statement to process data and maintain state
                    c.alignment = Alignment(horizontal="left", vertical="center")

        # Auto-adjust column widths
        for col in ws.columns:
            # Set max_len variable to store max len value
            max_len = 0
            # Set col_letter variable to store col letter value
            col_letter = get_column_letter(col[0].column)
            # Iterate through items in sequence loop
            for cell in col:
                # Set val variable to store val value
                val = str(cell.value or "")
                # Evaluate condition to control execution branch
                if len(val) > max_len:
                    # Set max_len variable to store max len value
                    max_len = len(val)
            # Execute statement to process data and maintain state
            ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

        # Set stream variable to store stream value
        stream = io.BytesIO()
        # Invoke wb.save to perform operational action
        wb.save(stream)
        # Invoke stream.seek to perform operational action
        stream.seek(0)
        # Return computed result or response payload to caller
        return Response(
            # Set content variable to store content value
            content=stream.getvalue(),
            # Set media_type variable to store media type value
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            # Set headers variable to store headers value
            headers={"Content-Disposition": f"attachment; filename=Payroll_{month or 'All'}_{year or '2026'}.xlsx"}
        # Execute statement to process data and maintain state
        )
    # Execute fallback branch when conditions are not met
    else:
        # Set stream variable to store stream value
        stream = io.StringIO()
        # Set writer variable to store writer value
        writer = csv.writer(stream)
        # Invoke writer.writerow to perform operational action
        writer.writerow(headers)
        # Iterate through items in sequence loop
        for idx, r in enumerate(records, start=1):
            # Invoke writer.writerow to perform operational action
            writer.writerow(format_row(idx, r))
        # Return computed result or response payload to caller
        return Response(
            # Set content variable to store content value
            content=stream.getvalue(),
            # Set media_type variable to store media type value
            media_type="text/csv",
            # Set headers variable to store headers value
            headers={"Content-Disposition": f"attachment; filename=Payroll_{month or 'All'}_{year or '2026'}.csv"}
        # Execute statement to process data and maintain state
        )

