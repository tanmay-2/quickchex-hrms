import sys
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
except Exception:
    pass

from fastapi import FastAPI, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# 🔥 IMPORT SCHEDULER TOOLS
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.api.v1.api import api_router
from app.db.init_db import init_db
from app.db.seed import seed_data
from app.api.v1.endpoints.add_emp_api import router as add_emp_router
from app.api.v1.endpoints.attendance_api import router as attendance_router
from app.api.v1.endpoints.employee_api import router as emp_router
from app.api.v1.endpoints.profile_api import router as profile_router
from app.api.v1.endpoints import otp_routes
from app.api.v1.endpoints import admin_api
from app.api.v1.endpoints import manager_api
from app.api.v1.endpoints.tickets_api import router as ticket_api
from app.api.v1.endpoints.policy_api import router as policy_router
from app.api.v1.endpoints import regularization_api

# 🔥 1. IMPORT THE DAILY TASK ROUTERS
from app.api.v1.endpoints.monthly_routes import router as monthly_router
from app.api.v1.endpoints.leave_api import router as leave_router

# 🔥 IMPORT FROM YOUR SPECIFIC FILENAME 'attendance_task'
# We use 'as task_router' to avoid conflicts
from app.api.v1.endpoints.attendance_task import router as task_router, run_daily_absent_check

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔥 Starting application...")
    try:
        init_db()
        print("✅ Database initialized")

        # Create THIS month's dynamic tables (attendance_YYYY_MM etc).
        from app.db.table_manager import create_monthly_tables
        create_monthly_tables(for_next_month=False)
        create_monthly_tables(for_next_month=True)
        print("✅ Monthly tables verified")
        seed_data()
        print("✅ Seeding completed")
        from app.services.attendance_service import recalculate_database_attendance_records
        recalculate_database_attendance_records()
        print("✅ Attendance records synchronized to 9h/5h rule")
    except Exception as e:
        print("❌ ERROR during startup:", str(e))
        raise e
    
    # =============================================================
    # 🔥 START THE BACKGROUND SCHEDULER
    # =============================================================
    scheduler = BackgroundScheduler()
    # This will run the absent check at 12:05 AM daily
    scheduler.add_job(run_daily_absent_check, 'cron', hour=0, minute=0, second=1)
    scheduler.start()
    print("⏰ Background Scheduler started (Absent check scheduled for 12:05 AM)")
    # =============================================================

    print("🚀 Application started successfully")
    yield
    
    # 🔥 SHUTDOWN SCHEDULER ON EXIT
    print("🛑 Application shutting down")
    scheduler.shutdown()

app = FastAPI(
    title="Attendance Portal API",
    version="1.0.0",
    lifespan=lifespan
)

import os

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://quickchex-hrms.vercel.app",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ REGISTER ALL EXISTING ROUTES (UNTOUCHED)
app.include_router(api_router, prefix="/api/v1")
app.include_router(add_emp_router)
app.include_router(emp_router)
app.include_router(profile_router)
app.include_router(otp_routes.router)
app.include_router(admin_api.router, prefix="/api/v1")
app.include_router(admin_api.router)
app.include_router(manager_api.router, prefix="/api/v1")
app.include_router(manager_api.router)
app.include_router(ticket_api, prefix="/api/v1")
app.include_router(policy_router)
app.include_router(regularization_api.router)
app.include_router(profile_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(attendance_router)

# ✅ REGISTER DAILY TASK ROUTES
app.include_router(monthly_router, prefix="/api/v1") 

# ✅ REGISTER ATTENDANCE TASK ROUTER (FOR MANUAL TRIGGER)
app.include_router(task_router, prefix="/api/v1/tasks")
app.include_router(leave_router, prefix="/api/v1/leaves", tags=["Leave Management"])
app.include_router(leave_router, prefix="/leaves", tags=["Leave Management"])


@app.get("/leave/applications")
@app.get("/api/v1/leave/applications")
def get_employee_leave_applications(request: Request, db: Session = Depends(get_db)):
    from app.services.leave_service import get_all_leaves_admin
    all_leaves = get_all_leaves_admin(db)

    # 1. Explicit query parameter ?all=true or ?admin=true
    if request.query_params.get("all") == "true" or request.query_params.get("admin") == "true":
        return all_leaves

    # 2. Extract employee code and role from headers or JWT
    role = (request.headers.get("x-role") or "").lower()
    auth_header = request.headers.get("authorization", "")
    emp_code = request.headers.get("x-emp-code") or request.headers.get("x-employee-id")

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from jose import jwt
            from app.core.dependencies import SECRET_KEY, ALGORITHM
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            emp_code = payload.get("emp_code") or emp_code
            role = (payload.get("role") or role).lower()
        except Exception:
            pass

    # 3. Admins and Managers get all leaves
    if "admin" in role or "manager" in role or (emp_code and emp_code.upper().startswith("ADM")):
        return all_leaves

    # 4. If a specific employee code is provided, return their leaves
    if emp_code:
        filtered = [l for l in all_leaves if (l.get("emp_code") or "").upper() == emp_code.upper() or (l.get("code") or "").upper() == emp_code.upper()]
        return filtered

    return all_leaves


@app.get("/leave/balance")
@app.get("/api/v1/leave/balance")
def get_employee_leave_balance(request: Request, db: Session = Depends(get_db)):
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    emp_code = _resolve_emp_code(request, db)
    from app.models.leave import LeaveBalance
    bal = None
    if emp_code:
        bal = db.query(LeaveBalance).filter(LeaveBalance.emp_code == emp_code).first()
        if not bal:
            try:
                bal = LeaveBalance(emp_code=emp_code, allowed_leaves=21.0, used_leaves=0.0)
                db.add(bal)
                db.commit()
                db.refresh(bal)
            except Exception:
                db.rollback()
                bal = None

    allowed = float(bal.allowed_leaves) if bal and bal.allowed_leaves is not None else 21.0
    used = float(bal.used_leaves) if bal and bal.used_leaves is not None else 0.0
    if allowed <= 0:
        allowed = 21.0
    avail = max(0.0, allowed - used)

    casual_total = 10.0 if allowed >= 10 else allowed
    sick_total = 8.0 if allowed >= 18 else max(0.0, allowed - casual_total)
    optional_total = max(0.0, allowed - casual_total - sick_total)
    return {
        "casualLeave": {"total": casual_total, "used": min(used, casual_total), "available": max(0.0, casual_total - min(used, casual_total)), "pending": 0},
        "sickLeave": {"total": sick_total, "used": 0.0, "available": sick_total, "pending": 0},
        "optionalHoliday": {"total": optional_total, "used": 0.0, "available": optional_total, "pending": 0},
        "casual": {"total": casual_total, "used": min(used, casual_total), "available": max(0.0, casual_total - min(used, casual_total))},
        "sick": {"total": sick_total, "used": 0.0, "available": sick_total},
        "optional": {"total": optional_total, "used": 0.0, "available": optional_total},
        "earned": {"total": 0.0, "used": 0.0, "available": 0.0},
        "compOff": {"total": 0.0, "used": 0.0, "available": 0.0},
        "totalAvailable": avail,
        "allowed": allowed,
        "used": used
    }


@app.post("/leave/apply")
@app.post("/api/v1/leave/apply")
@app.post("/leaves/apply")
@app.post("/api/v1/leaves/apply")
async def apply_for_leave_unified(request: Request, db: Session = Depends(get_db)):
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    from app.services import leave_service

    try:
        data = await request.json()
    except Exception:
        data = {}

    emp_code = data.get("emp_code") or _resolve_emp_code(request, db, data) or "EMP001"

    try:
        created = leave_service.create_leave_request(db, data, emp_code)
        return {
            "status": "success",
            "message": "Leave application submitted successfully",
            "data": created,
            **created
        }
    except Exception as e:
        db.rollback()
        print("Apply leave error in unified endpoint:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/leave/{leave_id}/approve")
@app.put("/api/v1/leave/{leave_id}/approve")
@app.put("/leaves/{leave_id}/approve")
@app.put("/api/v1/leaves/{leave_id}/approve")
def approve_leave_unified(leave_id: int, db: Session = Depends(get_db)):
    from app.services import leave_service
    result = leave_service.update_leave_status(db, leave_id, "Approved")
    if not result:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"status": "success", "message": "Leave approved successfully", "data": result, **result}


@app.put("/leave/{leave_id}/reject")
@app.put("/api/v1/leave/{leave_id}/reject")
@app.put("/leaves/{leave_id}/reject")
@app.put("/api/v1/leaves/{leave_id}/reject")
def reject_leave_unified(leave_id: int, db: Session = Depends(get_db)):
    from app.services import leave_service
    result = leave_service.update_leave_status(db, leave_id, "Rejected")
    if not result:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"status": "success", "message": "Leave rejected successfully", "data": result, **result}


@app.put("/regularization/{req_id}/approve")
@app.put("/api/v1/regularization/{req_id}/approve")
@app.put("/attendance/regularization/{req_id}/approve")
@app.put("/api/v1/attendance/regularization/{req_id}/approve")
def approve_regularization_root(req_id: int, db: Session = Depends(get_db)):
    from app.services import regularization_service
    res = regularization_service.update_request_status(db, req_id, "Approved")
    if not res:
        raise HTTPException(status_code=404, detail="Regularization request not found")
    return {"status": "success", "message": "Regularization request approved and attendance synchronized", "data": res, **res}


@app.put("/regularization/{req_id}/reject")
@app.put("/api/v1/regularization/{req_id}/reject")
@app.put("/attendance/regularization/{req_id}/reject")
@app.put("/api/v1/attendance/regularization/{req_id}/reject")
def reject_regularization_root(req_id: int, db: Session = Depends(get_db)):
    from app.services import regularization_service
    res = regularization_service.update_request_status(db, req_id, "Rejected")
    if not res:
        raise HTTPException(status_code=404, detail="Regularization request not found")
    return {"status": "success", "message": "Regularization request rejected", "data": res, **res}


@app.get("/leave/comp-off")
@app.get("/api/v1/leave/comp-off")
def get_employee_comp_off():
    return []


@app.get("/leave/holidays")
@app.get("/api/v1/leave/holidays")
def get_company_holidays():
    return [
        {"id": 1, "name": "Republic Day", "date": "26 Jan 2026", "day": "Monday", "type": "National"},
        {"id": 2, "name": "Holi", "date": "14 Mar 2026", "day": "Saturday", "type": "Gazetted"},
        {"id": 3, "name": "Independence Day", "date": "15 Aug 2026", "day": "Saturday", "type": "National"},
        {"id": 4, "name": "Gandhi Jayanti", "date": "02 Oct 2026", "day": "Friday", "type": "National"},
        {"id": 5, "name": "Diwali", "date": "08 Nov 2026", "day": "Sunday", "type": "Gazetted"},
        {"id": 6, "name": "Christmas", "date": "25 Dec 2026", "day": "Friday", "type": "Gazetted"}
    ]


@app.get("/payslips")
@app.get("/api/v1/payslips")
def get_employee_payslips(
    request: Request = None,
    emp_code: str = None,
    financial_year: str = "2026-2027",
    db: Session = Depends(get_db)
):
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    from app.services.payroll_service import get_employee_payslip_data

    target_code = emp_code
    if not target_code and request:
        target_code = _resolve_emp_code(request, db)
    
    if not target_code:
        # Fallback to default first employee profile
        from app.models.profile_model import Profile
        first_user = db.query(Profile).first()
        target_code = first_user.emp_code if first_user else "LE250"

    data = get_employee_payslip_data(db, emp_code=target_code, financial_year=financial_year)
    return data

@app.post("/payslips/generate-auto")
@app.post("/api/v1/payslips/generate-auto")
async def generate_payslips_bulk_api(
    request: Request,
    db: Session = Depends(get_db)
):
    from app.services.payroll_service import generate_payslips_for_employee
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    emp_code = payload.get("emp_code")
    name = payload.get("name") or payload.get("employee_name") or ""
    gross = payload.get("monthly_gross") or payload.get("salary") or payload.get("gross_earnings") or None
    ctc = payload.get("annual_ctc") or payload.get("ctc") or None
    role = payload.get("role") or payload.get("designation") or ""

    if not emp_code:
        return {"status": "error", "message": "emp_code is required"}

    calc = generate_payslips_for_employee(
        db=db,
        emp_code=emp_code,
        employee_name=name,
        monthly_gross=gross,
        annual_ctc=ctc,
        role=role
    )
    return {"status": "success", "emp_code": emp_code, "summary": calc}


@app.get("/dashboard/summary")
@app.get("/api/v1/dashboard/summary")
def get_dashboard_summary_root(
    request: Request = None,
    db: Session = Depends(get_db)
):
    from datetime import date, datetime
    from sqlalchemy import text
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    from app.models.profile_model import Profile
    from app.models.leave import LeaveBalance

    emp_code = _resolve_emp_code(request, db) if request else None
    user = None
    if emp_code:
        user = db.query(Profile).filter(Profile.emp_code == emp_code).first()
    if not user:
        user = db.query(Profile).first()

    effective_code = user.emp_code if user else "EMP001"

    today = date.today()
    table_name = f"attendance_{today.year}_{today.month:02d}"

    recent = []
    today_hours = "0h 00m"
    month_present = 0
    month_tracked = 0
    name_str = f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Employee"
    user_email = user.email if user else ""
    user_contact = user.mobile_no if user else ""

    try:
        q = text(f"""
            SELECT date, punch_in_time, punch_out_time, punch_in_location, punch_out_location,
                   punch_in_latitude, punch_in_longitude, punch_in_accuracy,
                   punch_out_latitude, punch_out_longitude, punch_out_accuracy,
                   punch_in_image, punch_out_image,
                   hours_completed, status, remark 
            FROM {table_name} 
            WHERE emp_code = :code 
            ORDER BY date DESC, punch_in_time DESC LIMIT 10
        """)
        rows = db.execute(q, {"code": effective_code}).mappings().all()
        from app.services.attendance_service import (
            calculate_attendance_status,
            safe_parse_datetime,
            safe_parse_date,
            safe_format_time,
            safe_format_date,
            safe_calc_hours
        )
        for r in rows:
            in_time_val = r["punch_in_time"]
            out_time_val = r["punch_out_time"]
            in_dt = safe_parse_datetime(in_time_val)
            out_dt = safe_parse_datetime(out_time_val)
            d_val = safe_parse_date(r["date"]) or today

            in_t = safe_format_time(in_time_val, "—")
            out_t = safe_format_time(out_time_val, "—")
            h_val = float(r["hours_completed"] or 0)
            if h_val == 0 and in_dt:
                h_val = safe_calc_hours(in_dt, out_dt, d_val)

            status_info = calculate_attendance_status(
                punch_in_time=in_dt,
                punch_out_time=out_dt,
                hours_completed=h_val,
                target_date=d_val,
                is_sunday=(d_val.weekday() == 6),
                status_override=r["status"]
            )
            st = status_info["status"]
            h_str = status_info["total_hours"]
            h_val = status_info["hours"]
            
            if d_val == today:
                today_hours = h_str if (in_dt and (out_dt or d_val == today)) else "0h 00m"

            if st == "Present":
                month_present += 1.0
            elif st == "Half Day":
                month_present += 0.5
            elif st in ("In Progress", "Punched In"):
                month_present += 1.0
            month_tracked += 1

            loc = r["punch_in_location"] or r["punch_out_location"] or ""
            recent.append({
                "emp_code": effective_code,
                "employee_code": effective_code,
                "name": name_str or "Employee",
                "employee_name": name_str or "Employee",
                "email": user_email,
                "contact": user_contact,
                "date": safe_format_date(r["date"], "%d %b %Y"),
                "isoDate": d_val.isoformat() if d_val else "",
                "checkIn": in_t,
                "checkOut": out_t,
                "punch_in_time": in_dt.isoformat() if in_dt else None,
                "punch_out_time": out_dt.isoformat() if out_dt else None,
                "hours": h_str if (in_dt and (out_dt or d_val == today)) else "—",
                "hours_completed": h_val,
                "total_minutes": status_info["total_minutes"],
                "total_hours": h_str,
                "working_hours": h_str,
                "status": st,
                "attendance_status": st,
                "location": loc,
                "punch_in_location": r["punch_in_location"] or loc,
                "punch_out_location": r["punch_out_location"],
                "punch_in_latitude": r.get("punch_in_latitude"),
                "punch_in_longitude": r.get("punch_in_longitude"),
                "punch_in_accuracy": r.get("punch_in_accuracy"),
                "punch_out_latitude": r.get("punch_out_latitude"),
                "punch_out_longitude": r.get("punch_out_longitude"),
                "punch_out_accuracy": r.get("punch_out_accuracy"),
                "punch_in_image": r.get("punch_in_image"),
                "punch_out_image": r.get("punch_out_image")
            })
    except Exception as e:
        print(f"Error in dashboard/summary recent query: {e}")
        db.rollback()

    att_pct = f"{round((month_present / month_tracked) * 100)}%" if month_tracked > 0 else "0%"

    bal = db.query(LeaveBalance).filter(LeaveBalance.emp_code == effective_code).first()
    allowed = float(bal.allowed_leaves) if bal and bal.allowed_leaves is not None else 21.0
    used = float(bal.used_leaves) if bal and bal.used_leaves is not None else 0.0
    if allowed <= 0:
        allowed = 21.0
    avail = max(0.0, allowed - used)

    from app.services.leave_service import get_all_leaves_admin
    all_leaves = get_all_leaves_admin(db)
    user_leaves = [l for l in all_leaves if l.get("emp_code") == effective_code]

    casual_total = 10.0 if allowed >= 10 else allowed
    sick_total = 8.0 if allowed >= 18 else max(0.0, allowed - casual_total)
    optional_total = max(0.0, allowed - casual_total - sick_total)

    name_str = f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Employee"
    return {
        "employee": {
            "name": name_str or "Employee",
            "emp_code": user.emp_code if user else "EMP001",
            "email": user.email if user else "",
            "designation": user.designation if user else "Employee",
            "department": user.department if user else "General",
            "role": user.role if user else "employee"
        },
        "stats": {
            "attendance": att_pct,
            "workingHours": today_hours,
            "leaveBalance": f"{int(avail)} days" if avail.is_integer() else f"{avail} days",
            "netSalary": "₹0"
        },
        "recentAttendance": recent,
        "leaveRequests": user_leaves[:5],
        "leaveBalances": {
            "casual": {"used": min(used, casual_total), "total": casual_total, "available": max(0.0, casual_total - min(used, casual_total))},
            "sick": {"used": 0.0, "total": sick_total, "available": sick_total},
            "optional": {"used": 0.0, "total": optional_total, "available": optional_total}
        },
        "announcements": []
    }


@app.get("/announcements")
@app.get("/api/v1/announcements")
def get_announcements_root():
    return []


@app.get("/")
def root():
    return {
        "message": "Attendance Backend Running",
        "status": "OK"
    }