import csv
import io
import openpyxl
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import payroll_service

router = APIRouter(prefix="/payroll", tags=["Payroll"])


def _extract_admin_user(request: Request, db: Session):
    auth_h = request.headers.get("authorization", "")
    if not auth_h.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    try:
        from jose import jwt
        from app.core.dependencies import SECRET_KEY, ALGORITHM
        from app.models.profile_model import Profile

        payload = jwt.decode(auth_h.split(" ", 1)[1], SECRET_KEY, algorithms=[ALGORITHM])
        emp_code = payload.get("emp_code")
        user = db.query(Profile).filter(Profile.emp_code == emp_code).first() if emp_code else None
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")

    if not user:
        raise HTTPException(status_code=401, detail="Authenticated user was not found.")
    role = str(user.role or "").strip().lower()
    if role not in {"admin", "superadmin", "hr", "administrator", "manager"}:
        raise HTTPException(status_code=403, detail="Forbidden: Admin or manager access required for payroll operations.")
    return user


@router.get("")
def get_payroll_list(
    search: str = "",
    month: str = "",
    year: str = "",
    department: str = "",
    status: str = "",
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Returns actual, database-backed payroll records for all employees.
    No fake salaries. Displays 'Payroll Setup Required' if not configured.
    """
    _extract_admin_user(request, db)
    return payroll_service.get_all_payroll_records(
        db=db,
        search=search,
        month=month,
        year=year,
        department=department,
        status=status
    )


@router.post("/validate")
async def validate_payroll_records(request: Request, db: Session = Depends(get_db)):
    _extract_admin_user(request, db)
    body = await request.json()
    records = body.get("records", [])
    valid = []
    invalid = []
    for idx, r in enumerate(records, start=1):
        if not r.get("employeeId") and not r.get("employee_id") and not r.get("emp_code"):
            invalid.append({"row": idx, "errors": ["Missing Employee ID"]})
        else:
            valid.append({"row": idx, **r, "errors": []})
    return {"valid": valid, "invalid": invalid}


@router.post("/import")
async def import_payroll_records(request: Request, db: Session = Depends(get_db)):
    _extract_admin_user(request, db)
    body = await request.json()
    records = body.get("records", [])
    count = 0
    for r in records:
        emp_c = r.get("employeeId") or r.get("employee_id") or r.get("emp_code")
        if not emp_c:
            continue
        m = r.get("month") or "September"
        y = int(r.get("year") or 2026)
        try:
            payroll_service.generate_payslip_for_employee_record(db, emp_c, m, y)
            count += 1
        except Exception:
            pass
    return {"imported": count, "message": f"Successfully imported {count} payroll records."}


@router.post("/{record_id}/generate-payslip")
async def generate_payslip_api(record_id: str, request: Request, db: Session = Depends(get_db)):
    """
    Generates a single real payslip for the specified employee record.
    Prevents duplicates and strictly verifies salary is configured.
    """
    _extract_admin_user(request, db)

    # Parse record_id: e.g. "12", "rec-LE724-September-2026", or "LE724"
    emp_code = None
    month = "September"
    year = 2026

    if str(record_id).startswith("rec-"):
        parts = record_id.split("-")
        if len(parts) >= 4:
            emp_code = parts[1]
            month = parts[2]
            year = int(parts[3])
    elif not str(record_id).isdigit():
        emp_code = record_id
    else:
        # Check if record_id is an existing payslip id
        from sqlalchemy import text
        row = db.execute(text("SELECT emp_code, month, year FROM payslips WHERE id = :id"), {"id": int(record_id)}).mappings().first()
        if row:
            emp_code = row["emp_code"]
            month = row["month"]
            year = row["year"]

    # Also check request body for overrides
    try:
        body = await request.json()
        if body.get("emp_code"):
            emp_code = body.get("emp_code")
        if body.get("month"):
            month = body.get("month")
        if body.get("year"):
            year = int(body.get("year"))
    except Exception:
        pass

    if not emp_code:
        raise HTTPException(status_code=400, detail="Employee ID could not be identified from record.")

    try:
        payslip = payroll_service.generate_payslip_for_employee_record(db, emp_code, month, year)
        return {
            "status": "success",
            "message": f"Payslip generated successfully for {emp_code} ({month} {year}).",
            "data": payslip,
            **payslip
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{record_id}/approve")
def approve_payroll_api(record_id: str, request: Request, db: Session = Depends(get_db)):
    _extract_admin_user(request, db)
    try:
        res = payroll_service.approve_payroll_record(db, record_id)
        return {"status": "success", "message": "Payroll approved.", "data": res, **res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{record_id}")
async def update_payroll_api(record_id: str, request: Request, db: Session = Depends(get_db)):
    _extract_admin_user(request, db)
    body = await request.json()

    # Determine emp_code
    emp_code = record_id
    if str(record_id).startswith("rec-"):
        parts = record_id.split("-")
        if len(parts) >= 2:
            emp_code = parts[1]
    elif str(record_id).isdigit():
        from sqlalchemy import text
        row = db.execute(text("SELECT emp_code FROM payslips WHERE id = :id"), {"id": int(record_id)}).mappings().first()
        if row:
            emp_code = row["emp_code"]

    emp_code = body.get("emp_code") or body.get("employeeId") or emp_code

    try:
        res = payroll_service.update_employee_salary_configuration(db, emp_code, body)
        return {"status": "success", "message": f"Salary updated for {emp_code}.", "data": res, **res}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{record_id}/payslip/download")
def download_payslip_api(record_id: str, request: Request, db: Session = Depends(get_db)):
    _extract_admin_user(request, db)
    try:
        pdf_bytes = payroll_service.generate_payslip_pdf(db, record_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Payslip_{record_id}.pdf"
            }
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
def export_payroll_api(
    format: str = "csv",
    search: str = "",
    month: str = "",
    year: str = "",
    department: str = "",
    status: str = "",
    request: Request = None,
    db: Session = Depends(get_db)
):
    _extract_admin_user(request, db)
    data = payroll_service.get_all_payroll_records(
        db=db, search=search, month=month, year=year, department=department, status=status
    )
    records = data.get("records", [])

    headers = [
        "Employee Name", "Employee ID", "Department", "Month", "Year",
        "Total Days in Month", "Present Days", "Gross Salary", "PT Deducted",
        "Other Deductions", "Salary Credited", "Final Amount Credited", "Status"
    ]

    if format.lower() == "xlsx":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Payroll"
        ws.append(headers)
        for r in records:
            ws.append([
                r["employeeName"], r["employeeId"], r["department"], r["month"], r["year"],
                r["totalDays"], r["presentDays"], r["grossSalary"], r["ptDeducted"],
                r["otherDeductions"], r["salaryCredited"], r["finalAmountCredited"], r["status"]
            ])
        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return Response(
            content=stream.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=Payroll_{month or 'All'}_{year or '2026'}.xlsx"}
        )
    else:
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(headers)
        for r in records:
            writer.writerow([
                r["employeeName"], r["employeeId"], r["department"], r["month"], r["year"],
                r["totalDays"], r["presentDays"], r["grossSalary"], r["ptDeducted"],
                r["otherDeductions"], r["salaryCredited"], r["finalAmountCredited"], r["status"]
            ])
        return Response(
            content=stream.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=Payroll_{month or 'All'}_{year or '2026'}.csv"}
        )
