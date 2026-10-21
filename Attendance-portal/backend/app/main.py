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

from app.core.dependencies import get_current_user

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

from app.api.v1.endpoints import payroll_api



# 🔥 1. IMPORT THE DAILY TASK ROUTERS

from app.api.v1.endpoints.monthly_routes import router as monthly_router

from app.api.v1.endpoints.leave_api import router as leave_router



# 🔥 IMPORT FROM YOUR SPECIFIC FILENAME 'attendance_task'

# We use 'as task_router' to avoid conflicts

from app.api.v1.endpoints.attendance_task import router as task_router, run_daily_absent_check

from app.api.v1.endpoints.work_location_api import router as work_location_router

from app.api.v1.endpoints.calendar_api import router as calendar_router

from app.api.v1.endpoints.notification import router as notification_router
from app.api.v1.endpoints import document_api
from app.api.v1.endpoints import resignation_api
from app.api.v1.endpoints import compoff_api
from app.api.v1.endpoints import contract_api

import os



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

        # Auto-heal any attendance punch out UTC shifts and correct Aaquib Khan's 19 Oct 2026 record
        try:
            from app.db.session import SessionLocal
            from sqlalchemy import text
            from app.services.attendance_service import safe_parse_datetime, calculate_attendance_status, repair_utc_punch_out
            from datetime import timedelta, date

            with SessionLocal() as db_mig:
                tables_to_check = set(["attendance_2026_10", f"attendance_{date.today().year}_{date.today().month:02d}"])
                for tname in tables_to_check:
                    try:
                        rows = db_mig.execute(text(f"""
                            SELECT id, emp_code, date, punch_in_time, punch_out_time, remark, status
                            FROM {tname}
                            WHERE date = '2026-10-19'
                               OR (punch_out_time IS NOT NULL AND punch_in_time IS NOT NULL)
                        """)).mappings().all()
                        for r in rows:
                            row_id = r["id"]
                            emp_code_val = (r["emp_code"] or "").strip().upper()
                            p_in = safe_parse_datetime(r["punch_in_time"])
                            p_out = safe_parse_datetime(r["punch_out_time"])

                            if p_in and p_out:
                                repaired_out = repair_utc_punch_out(p_in, p_out, r["date"])
                                if repaired_out and repaired_out != p_out:
                                    st_res = calculate_attendance_status(punch_in_time=p_in, punch_out_time=repaired_out, target_date=r["date"])
                                    db_mig.execute(text(f"""
                                        UPDATE {tname}
                                        SET punch_out_time = :out_t,
                                            hours_completed = :hrs,
                                            status = :st
                                        WHERE id = :rid
                                    """), {
                                        "out_t": repaired_out.replace(tzinfo=None),
                                        "hrs": st_res["hours"],
                                        "st": st_res["status"],
                                        "rid": row_id
                                    })
                        db_mig.commit()
                    except Exception as sub_err:
                        db_mig.rollback()
                print("✅ Attendance record healing completed")
        except Exception as mig_err:
            print("Attendance healing note:", mig_err)

        # Ensure Tanmay Salgaonkar and core admins have 'admin' role in PostgreSQL database
        try:
            from app.db.session import SessionLocal
            from sqlalchemy import text
            with SessionLocal() as db_role_mig:
                db_role_mig.execute(text("""
                    UPDATE profiles
                    SET role = 'admin'
                    WHERE emp_code IN ('LE252', 'ADM001', 'EMP001')
                       OR email IN ('tanmay.s@laesfera.co', 'admin@laesfera.co', 'tanmay@laesfera.co')
                """))
                db_role_mig.commit()
                print("✅ Core admin role verified in database")
        except Exception as r_err:
            print("Admin role verification note:", r_err)

        # Reclaim Neon PostgreSQL storage by clearing obsolete base64 punch photos older than 14 days
        # All attendance dates, punch in/out times, locations, statuses, and hours remain 100% intact.
        try:
            from app.db.session import SessionLocal
            from sqlalchemy import text
            with SessionLocal() as db_purge:
                tables_res = db_purge.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                      AND (table_name = 'attendance' OR table_name LIKE 'attendance_20%')
                """)).scalars().all()
                for tbl in tables_res:
                    try:
                        db_purge.execute(text(f"""
                            UPDATE {tbl}
                            SET punch_in_image = NULL
                            WHERE date < CURRENT_DATE - INTERVAL '14 days'
                              AND punch_in_image IS NOT NULL
                              AND LENGTH(punch_in_image) > 500
                        """))
                        db_purge.execute(text(f"""
                            UPDATE {tbl}
                            SET punch_out_image = NULL
                            WHERE date < CURRENT_DATE - INTERVAL '14 days'
                              AND punch_out_image IS NOT NULL
                              AND LENGTH(punch_out_image) > 500
                        """))
                        db_purge.commit()
                    except Exception as tbl_err:
                        db_purge.rollback()
                print("✅ 14-day attendance selfie storage cleanup completed")
        except Exception as purge_err:
            print("Selfie storage cleanup note:", purge_err)

        # Automatically execute VACUUM (ANALYZE) in AUTOCOMMIT mode to reclaim space from dead tuples
        try:
            from app.db.session import engine
            from sqlalchemy import text
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as vac_conn:
                vac_conn.execute(text("VACUUM (ANALYZE)"))
            print("✅ Database VACUUM (ANALYZE) completed successfully")
        except Exception as vac_err:
            print("Database VACUUM note:", vac_err)

        app_env = os.getenv("APP_ENV", "development").strip().lower()

        if os.getenv("SEED_DEMO_DATA", "false").lower() in ("true", "1", "yes"):

            if app_env in {"prod", "production"}:

                raise RuntimeError("SEED_DEMO_DATA cannot be enabled in production.")

            seed_data()

        else:

            print("Demo data seeding is disabled unless SEED_DEMO_DATA is enabled.")

        if os.getenv("RECALCULATE_ATTENDANCE_ON_STARTUP", "false").lower() in ("true", "1", "yes"):

            if app_env in {"prod", "production"}:

                raise RuntimeError("Attendance recalculation must be run as an explicit migration, not at production startup.")

            from app.services.attendance_service import recalculate_database_attendance_records

            recalculate_database_attendance_records()

            print("Development attendance recalculation completed.")

    except Exception as e:

        print("❌ ERROR during startup:", str(e))

        raise e

    

    # =============================================================

    # 🔥 BACKGROUND SCHEDULER (Safe single-instance initialization)

    # =============================================================

    run_scheduler = os.getenv("RUN_SCHEDULER", "false").lower() in ("true", "1", "yes")

    scheduler = None

    if run_scheduler:

        try:

            scheduler = BackgroundScheduler()

            # This will run the absent check at 12:05 AM daily

            scheduler.add_job(run_daily_absent_check, 'cron', hour=0, minute=0, second=1)

            scheduler.start()

            print("⏰ Background Scheduler started (Absent check scheduled for 12:05 AM)")

        except Exception as sch_err:

            print(f"⚠️ Scheduler startup note: {sch_err}")

    else:

        print("ℹ️ Background Scheduler disabled via RUN_SCHEDULER environment variable")

    # =============================================================



    print("🚀 Application started successfully")

    yield

    

    # 🔥 SHUTDOWN SCHEDULER ON EXIT

    if scheduler:

        print("🛑 Shutting down Background Scheduler")

        scheduler.shutdown()

    print("🛑 Application shutdown complete")



app = FastAPI(

    title="Quickchex HRMS API",

    version="1.0.0",

    lifespan=lifespan

)



# 📂 STABLE PERSISTENT UPLOADS DIRECTORY

from app.core.storage import UPLOAD_ROOT



UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")



# 🌐 PRODUCTION-READY CORS CONFIGURATION

cors_env = os.getenv("CORS_ORIGINS", "")

allowed_env_origins = [o.strip().rstrip("/") for o in cors_env.split(",") if o.strip()]

default_origins = [

    "https://hrms-frontend-xmbb.onrender.com",

    "http://localhost:5173",

    "http://127.0.0.1:5173",

    "http://localhost:5174",

    "http://127.0.0.1:5174",

    "http://localhost:5175",

    "http://127.0.0.1:5175",

    "http://localhost:3000",

    "http://127.0.0.1:3000",

]

all_allowed_origins = list(dict.fromkeys([o.rstrip("/") for o in default_origins] + allowed_env_origins))

allow_lan_origins = os.getenv("CORS_ALLOW_LAN", "true").strip().lower() in ("true", "1", "yes")

if "*" in all_allowed_origins:
    all_allowed_origins = [o for o in all_allowed_origins if o != "*"]
    local_network_origin_regex = r"^https?://.*$"
else:
    local_network_origin_regex = (
        r"^https?://(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|"
        r"192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d{1,5})?$"
        if allow_lan_origins else None
    )




app.add_middleware(
    CORSMiddleware,
    allow_origins=all_allowed_origins,
    allow_origin_regex=local_network_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)





# =============================================================

# 🩺 HEALTH AND READINESS CHECKS

# =============================================================



@app.get("/health", tags=["Health"])

@app.get("/api/v1/health", tags=["Health"])

def health_check():

    """Liveness check indicating the FastAPI application process is up."""

    return {

        "status": "ok",

        "service": "Quickchex HRMS API",

        "version": "1.0.0"

    }





@app.get("/ready", tags=["Health"])

@app.get("/api/v1/ready", tags=["Health"])

def readiness_check(db: Session = Depends(get_db)):

    """Readiness check validating the database connection."""

    try:

        from sqlalchemy import text

        db.execute(text("SELECT 1"))

        dialect = getattr(db.bind, 'dialect', None)

        dialect_name = dialect.name if dialect else 'database'

        return {

            "status": "ready",

            "database": dialect_name,

            "connected": True

        }

    except Exception as exc:

        raise HTTPException(

            status_code=503,

            detail=f"Database readiness check failed: {str(exc)}"

        )





# =============================================================

# 🔐 CANONICAL ROUTER REGISTRATION

# =============================================================



# 1. Master Canonical API Router (/api/v1/*)

app.include_router(api_router, prefix="/api/v1")



# 2. Backward Compatibility Mounts (for legacy requests omitting /api/v1)

app.include_router(profile_router)

app.include_router(attendance_router)

app.include_router(admin_api.router)

app.include_router(manager_api.router)

app.include_router(add_emp_router)

app.include_router(emp_router)

app.include_router(work_location_router)

app.include_router(policy_router)

app.include_router(regularization_api.router)

app.include_router(leave_router, prefix="/leaves")

app.include_router(payroll_api.router)

app.include_router(calendar_router, prefix="/api/v1")

app.include_router(notification_router)
app.include_router(document_api.router, prefix="/documents")
app.include_router(resignation_api.router)
app.include_router(compoff_api.router)
app.include_router(contract_api.router)







# =============================================================

# 🔁 BACKWARD-COMPAT: Employee Portal Regularization Routes

# These aliases map /attendance/regularization -> regularization service

# so old frontend calls continue to work without URL changes.

# =============================================================



@app.get("/attendance/regularization")

@app.get("/api/v1/attendance/regularization")

def get_my_regularizations_compat(request: Request, db: Session = Depends(get_db)):

    """Employee: fetch my regularization requests (backward-compat alias for /attendance/regularization)."""

    from app.api.v1.endpoints.attendance_api import _resolve_emp_code

    from app.services import regularization_service

    emp_code = _resolve_emp_code(request, db) or "EMP001"

    return regularization_service.get_my_regularizations(db, emp_code)





@app.post("/attendance/regularization")

@app.post("/api/v1/attendance/regularization")

async def submit_regularization_compat(request: Request, db: Session = Depends(get_db)):

    """Employee: submit a regularization request (backward-compat alias for /attendance/regularization)."""

    from app.api.v1.endpoints.regularization_api import apply_regularization

    return await apply_regularization(request=request, db=db)





@app.get("/departments", tags=["Departments"])

@app.get("/api/v1/departments", tags=["Departments"])

def get_departments_direct(db: Session = Depends(get_db)):

    return admin_api.get_all_departments(db)







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

@app.post("/leave/{leave_id}/approve")

@app.post("/api/v1/leave/{leave_id}/approve")

@app.post("/leaves/{leave_id}/approve")

@app.post("/api/v1/leaves/{leave_id}/approve")

async def approve_leave_unified(leave_id: int, request: Request, db: Session = Depends(get_db)):

    from app.services import leave_service

    comment = "Approved by Admin"

    try:

        body = await request.json()

        comment = body.get("comment") or body.get("remarks") or comment

    except Exception:

        pass

    try:

        result = leave_service.admin_action_leave(db, leave_id, "Approved", comment=comment)

        if not result:

            raise HTTPException(status_code=404, detail="Leave request not found")

        return {"status": "success", "message": "Leave application approved successfully.", "data": result, **result}

    except ValueError as ve:

        raise HTTPException(status_code=400, detail=str(ve))





@app.put("/leave/{leave_id}/reject")

@app.put("/api/v1/leave/{leave_id}/reject")

@app.put("/leaves/{leave_id}/reject")

@app.put("/api/v1/leaves/{leave_id}/reject")

@app.post("/leave/{leave_id}/reject")

@app.post("/api/v1/leave/{leave_id}/reject")

@app.post("/leaves/{leave_id}/reject")

@app.post("/api/v1/leaves/{leave_id}/reject")

async def reject_leave_unified(leave_id: int, request: Request, db: Session = Depends(get_db)):

    from app.services import leave_service

    comment = "Rejected by Admin"

    try:

        body = await request.json()

        comment = body.get("comment") or body.get("reason") or body.get("remarks") or comment

    except Exception:

        pass

    try:

        result = leave_service.admin_action_leave(db, leave_id, "Rejected", comment=comment)

        if not result:

            raise HTTPException(status_code=404, detail="Leave request not found")

        return {"status": "success", "message": "Request rejected successfully.", "data": result, **result}

    except ValueError as ve:

        raise HTTPException(status_code=400, detail=str(ve))





@app.put("/regularization/{req_id}/approve")

@app.put("/api/v1/regularization/{req_id}/approve")

@app.put("/attendance/regularization/{req_id}/approve")

@app.put("/api/v1/attendance/regularization/{req_id}/approve")

@app.post("/regularization/{req_id}/approve")

@app.post("/api/v1/regularization/{req_id}/approve")

@app.post("/attendance/regularization/{req_id}/approve")

@app.post("/api/v1/attendance/regularization/{req_id}/approve")

async def approve_regularization_root(req_id: int, request: Request, db: Session = Depends(get_db)):

    from app.services import regularization_service

    from app.api.v1.endpoints.regularization_api import _resolve_admin_user

    comment = "Approved by Admin"

    try:

        body = await request.json()

        comment = body.get("comment") or body.get("remarks") or comment

    except Exception:

        pass

    admin_name = _resolve_admin_user(request, db)

    try:

        res = regularization_service.admin_action_request(db, req_id, "Approved", comment=comment, admin_name=admin_name)

        if not res:

            raise HTTPException(status_code=404, detail="Regularization request not found")

        return {"status": "success", "message": "Regularization request approved and attendance synchronized.", "data": res, **res}

    except ValueError as ve:

        raise HTTPException(status_code=400, detail=str(ve))





@app.put("/regularization/{req_id}/reject")

@app.put("/api/v1/regularization/{req_id}/reject")

@app.put("/attendance/regularization/{req_id}/reject")

@app.put("/api/v1/attendance/regularization/{req_id}/reject")

@app.post("/regularization/{req_id}/reject")

@app.post("/api/v1/regularization/{req_id}/reject")

@app.post("/attendance/regularization/{req_id}/reject")

@app.post("/api/v1/attendance/regularization/{req_id}/reject")

async def reject_regularization_root(req_id: int, request: Request, db: Session = Depends(get_db)):

    from app.services import regularization_service

    from app.api.v1.endpoints.regularization_api import _resolve_admin_user

    comment = "Rejected by Admin"

    try:

        body = await request.json()

        comment = body.get("comment") or body.get("reason") or body.get("remarks") or comment

    except Exception:

        pass

    admin_name = _resolve_admin_user(request, db)

    try:

        res = regularization_service.admin_action_request(db, req_id, "Rejected", comment=comment, admin_name=admin_name)

        if not res:

            raise HTTPException(status_code=404, detail="Regularization request not found")

        return {"status": "success", "message": "Request rejected successfully.", "data": res, **res}

    except ValueError as ve:

        raise HTTPException(status_code=400, detail=str(ve))





@app.get("/leave/comp-off", tags=["Comp Offs"])
@app.get("/api/v1/leave/comp-off", tags=["Comp Offs"])
def get_employee_comp_off(db: Session = Depends(get_db)):
    from app.api.v1.endpoints.compoff_api import get_comp_offs
    return get_comp_offs(db)

@app.get("/leave/all", tags=["Leaves"])
@app.get("/api/v1/leave/all", tags=["Leaves"])
def get_all_leaves_alias(db: Session = Depends(get_db)):
    from app.services.leave_service import get_all_leaves_admin
    return get_all_leaves_admin(db)








@app.get("/leave/holidays", tags=["Holidays"])

@app.get("/api/v1/leave/holidays", tags=["Holidays"])

@app.get("/api/v1/holidays", tags=["Holidays"])

def get_company_holidays(db: Session = Depends(get_db)):

    from app.models.leave import Holiday

    from sqlalchemy import text as _text

    session_to_close = None

    if not isinstance(db, Session):

        from app.db.session import SessionLocal

        db = SessionLocal()

        session_to_close = db

    try:

        result = []



        # 1. Legacy Holiday table (Admin-managed named holidays)

        db_holidays = db.query(Holiday).filter(Holiday.status == "Active").order_by(Holiday.holiday_date.asc()).all()

        seen_dates = set()

        for h in db_holidays:

            d_iso = h.holiday_date.isoformat() if h.holiday_date else None

            if d_iso:

                seen_dates.add(d_iso)

            result.append({

                "id": h.id,

                "name": h.name,

                "date": h.holiday_date.strftime("%d %b %Y") if h.holiday_date else "",

                "isoDate": d_iso or "",

                "day": h.day_of_week or (h.holiday_date.strftime("%A") if h.holiday_date else ""),

                "type": h.type or "Gazetted"

            })



        # 2. OrganizationCalendar HOLIDAY entries (imported via Excel)

        try:

            cal_rows = db.execute(_text(

                "SELECT date, holiday_name FROM organization_calendar WHERE status = 'HOLIDAY' ORDER BY date ASC"

            )).mappings().all()

            for row in cal_rows:

                d_iso = row["date"].isoformat() if hasattr(row["date"], "isoformat") else str(row["date"])

                if d_iso in seen_dates:

                    continue  # already represented by the legacy table

                seen_dates.add(d_iso)

                d_obj = row["date"]

                name = row["holiday_name"] or "Holiday"

                result.append({

                    "id": f"cal-{d_iso}",

                    "name": name,

                    "date": d_obj.strftime("%d %b %Y") if hasattr(d_obj, "strftime") else d_iso,

                    "isoDate": d_iso,

                    "day": d_obj.strftime("%A") if hasattr(d_obj, "strftime") else "",

                    "type": "Gazetted"

                })

        except Exception:

            pass



        if result:

            return result



    except Exception as e:

        db.rollback()

    finally:

        if session_to_close:

            session_to_close.close()



    # Static fallback if DB has no records

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
        try:
            target_code = _resolve_emp_code(request, db)
        except Exception:
            target_code = None

    if not target_code and request:
        target_code = (
            request.headers.get("x-emp-code")
            or request.headers.get("x-employee-id")
            or request.headers.get("emp_code")
        )

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

    current_user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    from datetime import date, datetime

    from sqlalchemy import text

    from app.models.leave import LeaveBalance



    user = current_user

    effective_code = str(user.emp_code or "").strip()

    if not effective_code:

        raise HTTPException(status_code=401, detail="Authenticated user has no employee code.")



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

            "role": user.role if user else "employee",
            "profile_image": f"/{str(user.profile_image).replace('\\', '/').lstrip('/')}" if getattr(user, "profile_image", None) else None,
            "profileImage": f"/{str(user.profile_image).replace('\\', '/').lstrip('/')}" if getattr(user, "profile_image", None) else None,
            "avatar": f"/{str(user.profile_image).replace('\\', '/').lstrip('/')}" if getattr(user, "profile_image", None) else None,
            "photo": f"/{str(user.profile_image).replace('\\', '/').lstrip('/')}" if getattr(user, "profile_image", None) else None,

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

