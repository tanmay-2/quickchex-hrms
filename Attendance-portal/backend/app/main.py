# ==============================================================================
# MAIN STARTING FILE OF THE BACKEND SERVER (main.py)
# ==============================================================================
# This is the main starting point of the entire backend system:
# 1. Starts up the server when the computer runs.
# 2. Connects to the database and creates attendance tables for this month.
# 3. Sets an automatic timer at midnight (12:00:01 AM) every night to mark absent workers.
# 4. Lets web browsers and mobile phone apps connect safely.
# 5. Serves profile photos, documents, and attendance punch selfies.
# 6. Connects all features together (Attendance, Leaves, Payroll, Profiles).
# ==============================================================================

# Import module sys for system functionality
import sys

# Begin guarded execution block to trap exceptions
try:

    # Evaluate condition to control execution branch
    if hasattr(sys.stdout, "reconfigure"):

        # Invoke sys.stdout.reconfigure to perform operational action
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

    # Evaluate condition to control execution branch
    if hasattr(sys.stderr, "reconfigure"):

        # Invoke sys.stderr.reconfigure to perform operational action
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")

# Catch and handle specific exception if raised
except Exception:

    # Placeholder statement performing no operation
    pass



# Import FastAPI, Request, Depends, HTTPException from fastapi for module operations
from fastapi import FastAPI, Request, Depends, HTTPException

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session

# Import get_db from app.db.session for module operations
from app.db.session import get_db

# Import asynccontextmanager from contextlib for module operations
from contextlib import asynccontextmanager

# Import CORSMiddleware from fastapi.middleware.cors for module operations
from fastapi.middleware.cors import CORSMiddleware

# Import StaticFiles from fastapi.staticfiles for module operations
from fastapi.staticfiles import StaticFiles



# 🔥 IMPORT SCHEDULER TOOLS

# Import BackgroundScheduler from apscheduler.schedulers.background for module operations
from apscheduler.schedulers.background import BackgroundScheduler

# Import CronTrigger from apscheduler.triggers.cron for module operations
from apscheduler.triggers.cron import CronTrigger



# Import api_router from app.api.v1.api for module operations
from app.api.v1.api import api_router

# Import init_db from app.db.init_db for module operations
from app.db.init_db import init_db

# Import seed_data from app.db.seed for module operations
from app.db.seed import seed_data

# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user

# Import router as add_emp_router from app.api.v1.endpoints.add_emp_api for module operations
from app.api.v1.endpoints.add_emp_api import router as add_emp_router

# Import router as attendance_router from app.api.v1.endpoints.attendance_api for module operations
from app.api.v1.endpoints.attendance_api import router as attendance_router

# Import router as emp_router from app.api.v1.endpoints.employee_api for module operations
from app.api.v1.endpoints.employee_api import router as emp_router

# Import router as profile_router from app.api.v1.endpoints.profile_api for module operations
from app.api.v1.endpoints.profile_api import router as profile_router

# Import otp_routes from app.api.v1.endpoints for module operations
from app.api.v1.endpoints import otp_routes

# Import admin_api from app.api.v1.endpoints for module operations
from app.api.v1.endpoints import admin_api

# Import manager_api from app.api.v1.endpoints for module operations
from app.api.v1.endpoints import manager_api

# Import router as ticket_api from app.api.v1.endpoints.tickets_api for module operations
from app.api.v1.endpoints.tickets_api import router as ticket_api

# Import router as policy_router from app.api.v1.endpoints.policy_api for module operations
from app.api.v1.endpoints.policy_api import router as policy_router

# Import regularization_api from app.api.v1.endpoints for module operations
from app.api.v1.endpoints import regularization_api

# Import payroll_api from app.api.v1.endpoints for module operations
from app.api.v1.endpoints import payroll_api



# 🔥 1. IMPORT THE DAILY TASK ROUTERS

# Import router as monthly_router from app.api.v1.endpoints.monthly_routes for module operations
from app.api.v1.endpoints.monthly_routes import router as monthly_router

# Import router as leave_router from app.api.v1.endpoints.leave_api for module operations
from app.api.v1.endpoints.leave_api import router as leave_router



# 🔥 IMPORT FROM YOUR SPECIFIC FILENAME 'attendance_task'

# We use 'as task_router' to avoid conflicts

# Import router as task_router, run_daily_absent_check from app.api.v1.endpoints.attendance_task for module operations
from app.api.v1.endpoints.attendance_task import router as task_router, run_daily_absent_check

# Import router as work_location_router from app.api.v1.endpoints.work_location_api for module operations
from app.api.v1.endpoints.work_location_api import router as work_location_router

# Import router as calendar_router from app.api.v1.endpoints.calendar_api for module operations
from app.api.v1.endpoints.calendar_api import router as calendar_router

# Import router as notification_router from app.api.v1.endpoints.notification for module operations
from app.api.v1.endpoints.notification import router as notification_router
# Import document_api from app.api.v1.endpoints for module operations
from app.api.v1.endpoints import document_api
# Import resignation_api from app.api.v1.endpoints for module operations
from app.api.v1.endpoints import resignation_api
# Import compoff_api from app.api.v1.endpoints for module operations
from app.api.v1.endpoints import compoff_api
# Import chatbot_api from app.api.v1.endpoints for module operations
from app.api.v1.endpoints import chatbot_api
# Import contract_api from app.api.v1.endpoints for module operations
from app.api.v1.endpoints import contract_api

# Import module os for system functionality
import os




# ------------------------------------------------------------------------------
# SERVER STARTUP STEPS (lifespan)
# ------------------------------------------------------------------------------
# This function runs automatically as soon as the backend server turns on.
# It makes sure the database is ready, tables exist, and timers are running.
# ------------------------------------------------------------------------------
@asynccontextmanager

# Define lifespan function to handle lifespan
async def lifespan(app: FastAPI):

    # Invoke print to perform operational action
    print("🔥 Starting application...")

    # Begin guarded execution block to trap exceptions
    try:

        # Invoke init_db to perform operational action
        init_db()

        # Invoke print to perform operational action
        print("✅ Database initialized")



        # Create THIS month's dynamic tables (attendance_YYYY_MM etc).

        # Import create_monthly_tables from app.db.table_manager for module operations
        from app.db.table_manager import create_monthly_tables

        # Invoke create_monthly_tables to perform operational action
        create_monthly_tables(for_next_month=False)

        # Invoke create_monthly_tables to perform operational action
        create_monthly_tables(for_next_month=True)

        # Invoke print to perform operational action
        print("✅ Monthly tables verified")

        # Fix any punch times that had the wrong computer clock time so working hours are correct in Indian time
        try:
            # Import SessionLocal from app.db.session for module operations
            from app.db.session import SessionLocal
            # Import text from sqlalchemy for module operations
            from sqlalchemy import text
            # Import safe_parse_datetime, calculate_attendance_status, repair_utc_punch_out from app.services.attendance_service for module operations
            from app.services.attendance_service import safe_parse_datetime, calculate_attendance_status, repair_utc_punch_out
            # Import timedelta, date from datetime for module operations
            from datetime import timedelta, date

            # Acquire context manager resource for enclosed block
            with SessionLocal() as db_mig:
                # Set tables_to_check variable to store tables to check value
                tables_to_check = set(["attendance_2026_10", f"attendance_{date.today().year}_{date.today().month:02d}"])
                # Iterate through items in sequence loop
                for tname in tables_to_check:
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Set rows variable to store rows value
                        rows = db_mig.execute(text(f"""
                            SELECT id, emp_code, date, punch_in_time, punch_out_time, remark, status
                            FROM {tname}
                            WHERE date = '2026-10-19'
                               OR (punch_out_time IS NOT NULL AND punch_in_time IS NOT NULL)
                        """)).mappings().all()
                        # Iterate through items in sequence loop
                        for r in rows:
                            # Set row_id variable to store row id value
                            row_id = r["id"]
                            # Set emp_code_val variable to store emp code val value
                            emp_code_val = (r["emp_code"] or "").strip().upper()
                            # Set p_in variable to store p in value
                            p_in = safe_parse_datetime(r["punch_in_time"])
                            # Set p_out variable to store p out value
                            p_out = safe_parse_datetime(r["punch_out_time"])

                            # Evaluate condition to control execution branch
                            if p_in and p_out:
                                # Set repaired_out variable to store repaired out value
                                repaired_out = repair_utc_punch_out(p_in, p_out, r["date"])
                                # Evaluate condition to control execution branch
                                if repaired_out and repaired_out != p_out:
                                    # Set st_res variable to store st res value
                                    st_res = calculate_attendance_status(punch_in_time=p_in, punch_out_time=repaired_out, target_date=r["date"])
                                    # Execute statement to process data and maintain state
                                    db_mig.execute(text(f"""
                                        UPDATE {tname}
                                        SET punch_out_time = :out_t,
                                            hours_completed = :hrs,
                                            status = :st
                                        WHERE id = :rid
                                    """), {
                                        # Specify parameter value for "out_t": repaired_out.replace(tzinfo
                                        "out_t": repaired_out.replace(tzinfo=None),
                                        # Execute statement to process data and maintain state
                                        "hrs": st_res["hours"],
                                        # Execute statement to process data and maintain state
                                        "st": st_res["status"],
                                        # Execute statement to process data and maintain state
                                        "rid": row_id
                                    # Execute statement to process data and maintain state
                                    })
                        # Invoke db_mig.commit to perform operational action
                        db_mig.commit()
                    # Catch and handle specific exception if raised
                    except Exception as sub_err:
                        # Invoke db_mig.rollback to perform operational action
                        db_mig.rollback()
                # Invoke print to perform operational action
                print("✅ Attendance record healing completed")
        # Catch and handle specific exception if raised
        except Exception as mig_err:
            # Invoke print to perform operational action
            print("Attendance healing note:", mig_err)

        # Make sure Tanmay and the main managers always have full Admin access in the database
        try:
            # Import SessionLocal from app.db.session for module operations
            from app.db.session import SessionLocal
            # Import text from sqlalchemy for module operations
            from sqlalchemy import text
            # Acquire context manager resource for enclosed block
            with SessionLocal() as db_role_mig:
                # Execute statement to process data and maintain state
                db_role_mig.execute(text("""
                    UPDATE profiles
                    SET role = 'admin'
                    WHERE emp_code IN ('LE252', 'ADM001', 'EMP001')
                       OR email IN ('tanmay.s@laesfera.co', 'admin@laesfera.co', 'tanmay@laesfera.co')
                """))
                # Invoke db_role_mig.commit to perform operational action
                db_role_mig.commit()
                # Invoke print to perform operational action
                print("✅ Core admin role verified in database")
        # Catch and handle specific exception if raised
        except Exception as r_err:
            # Invoke print to perform operational action
            print("Admin role verification note:", r_err)

        # Make sure the employee profile table has a field saved for blood group
        try:
            # Import SessionLocal from app.db.session for module operations
            from app.db.session import SessionLocal
            # Import text from sqlalchemy for module operations
            from sqlalchemy import text
            # Acquire context manager resource for enclosed block
            with SessionLocal() as db_col_mig:
                # Invoke db_col_mig.execute to perform operational action
                db_col_mig.execute(text("ALTER TABLE profile_master ADD COLUMN IF NOT EXISTS blood_group VARCHAR(20)"))
                # Invoke db_col_mig.commit to perform operational action
                db_col_mig.commit()
                # Invoke print to perform operational action
                print("✅ profile_master.blood_group column verified")
        # Catch and handle specific exception if raised
        except Exception as col_err:
            # Invoke print to perform operational action
            print("profile_master.blood_group migration note:", col_err)

        # Data retention: All attendance selfies, punches, and historical records are permanently preserved.


        # Ensure all policy documents exist physically on disk (auto-heals ephemeral filesystem restarts)
        try:
            # Import SessionLocal from app.db.session for module operations
            from app.db.session import SessionLocal
            # Import Policy from app.models.policy_model for module operations
            from app.models.policy_model import Policy
            # Import ensure_policy_file_exists from app.services.policy_generator for module operations
            from app.services.policy_generator import ensure_policy_file_exists
            # Acquire context manager resource for enclosed block
            with SessionLocal() as db_pols:
                # Set all_pols variable to store all pols value
                all_pols = db_pols.query(Policy).all()
                # Iterate through items in sequence loop
                for p in all_pols:
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Invoke ensure_policy_file_exists to perform operational action
                        ensure_policy_file_exists(p)
                    # Catch and handle specific exception if raised
                    except Exception:
                        # Placeholder statement performing no operation
                        pass
                # Invoke print to perform operational action
                print(f"✅ Verified {len(all_pols)} company policy documents on disk")
        # Catch and handle specific exception if raised
        except Exception as pol_err:
            # Invoke print to perform operational action
            print("Policy verification note:", pol_err)

        # Set app_env variable to store app env value
        app_env = os.getenv("APP_ENV", "development").strip().lower()

        # Evaluate condition to control execution branch
        if os.getenv("SEED_DEMO_DATA", "false").lower() in ("true", "1", "yes"):

            # Evaluate condition to control execution branch
            if app_env in {"prod", "production"}:

                # Raise exception to abort current operation with error
                raise RuntimeError("SEED_DEMO_DATA cannot be enabled in production.")

            # Invoke seed_data to perform operational action
            seed_data()

        # Execute fallback branch when conditions are not met
        else:

            # Invoke print to perform operational action
            print("Demo data seeding is disabled unless SEED_DEMO_DATA is enabled.")

        # Evaluate condition to control execution branch
        if os.getenv("RECALCULATE_ATTENDANCE_ON_STARTUP", "false").lower() in ("true", "1", "yes"):

            # Evaluate condition to control execution branch
            if app_env in {"prod", "production"}:

                # Raise exception to abort current operation with error
                raise RuntimeError("Attendance recalculation must be run as an explicit migration, not at production startup.")

            # Import recalculate_database_attendance_records from app.services.attendance_service for module operations
            from app.services.attendance_service import recalculate_database_attendance_records

            # Invoke recalculate_database_attendance_records to perform operational action
            recalculate_database_attendance_records()

            # Invoke print to perform operational action
            print("Development attendance recalculation completed.")

    # Catch and handle specific exception if raised
    except Exception as e:

        # Invoke print to perform operational action
        print("❌ ERROR during startup:", str(e))

        # Raise exception to abort current operation with error
        raise e

    

    # =============================================================
    # 🔥 AUTOMATED ATTENDANCE SCHEDULER (Teams alerts & Absent check)
    # =============================================================
    run_scheduler = os.getenv("RUN_SCHEDULER", "false").lower() in ("true", "1", "yes")
    # Set scheduler variable to store scheduler value
    scheduler = None
    # Evaluate condition to control execution branch
    if run_scheduler:
        # Begin guarded execution block to trap exceptions
        try:
            # Set scheduler variable to store scheduler value
            scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

            # 1. Midnight: marks absent employees
            scheduler.add_job(run_daily_absent_check, 'cron', hour=0, minute=0, second=1)

            # 2. 11:00 AM IST: ERA 1-on-1 missing punch-in alert (skips Sundays, 4th Saturday, holidays & leaves)
            from app.services.aicogni_service import run_aicogni_morning_punch_check, run_aicogni_night_punchout_check
            scheduler.add_job(run_aicogni_morning_punch_check, 'cron', hour=11, minute=0)

            # 3. Dynamic 9-Hour 10-Minute Completion Alert: runs every 10 minutes between 2:00 PM and 11:59 PM IST
            # Sends exactly one reminder to each employee as soon as they hit 9 hours and 10 minutes of work from punch-in
            scheduler.add_job(run_aicogni_night_punchout_check, 'cron', hour='14-23', minute='*/10')

            scheduler.start()
            print("⏰ Background Scheduler started (ERA Teams alerts: 11:00 AM missing punch-in + Dynamic 9h 10m completion + Midnight Absent check)")
        # Catch and handle specific exception if raised
        except Exception as sch_err:
            # Invoke print to perform operational action
            print(f"⚠️ Scheduler startup note: {sch_err}")
    # Execute fallback branch when conditions are not met
    else:
        # Invoke print to perform operational action
        print("ℹ️ Background Scheduler disabled via RUN_SCHEDULER environment variable")
    # =============================================================



    # Invoke print to perform operational action
    print("🚀 Application started successfully")

    # Yield active session or generator value to caller
    yield

    

    # 🔥 SHUTDOWN SCHEDULER ON EXIT

    # Evaluate condition to control execution branch
    if scheduler:

        # Invoke print to perform operational action
        print("🛑 Shutting down Background Scheduler")

        # Invoke scheduler.shutdown to perform operational action
        scheduler.shutdown()

    # Invoke print to perform operational action
    print("🛑 Application shutdown complete")




# ------------------------------------------------------------------------------
# FASTAPI APPLICATION INSTANTIATION
# ------------------------------------------------------------------------------
# Initializes the FastAPI app with application metadata and lifespan handler.
# ------------------------------------------------------------------------------
app = FastAPI(

    # Set title variable to store title value
    title="Quickchex HRMS API",

    # Set version variable to store version value
    version="1.0.0",

    # Set lifespan variable to store lifespan value
    lifespan=lifespan

# Execute statement to process data and maintain state
)



# 📂 STABLE PERSISTENT UPLOADS DIRECTORY

# Import UPLOAD_ROOT from app.core.storage for module operations
from app.core.storage import UPLOAD_ROOT



# Invoke UPLOAD_ROOT.mkdir to perform operational action
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

# Invoke app.mount to perform operational action
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")



# 🌐 PRODUCTION-READY CORS CONFIGURATION

# Set cors_env variable to store cors env value
cors_env = os.getenv("CORS_ORIGINS", "")

# Set allowed_env_origins variable to store allowed env origins value
allowed_env_origins = [o.strip().rstrip("/") for o in cors_env.split(",") if o.strip()]

# Set default_origins variable to store default origins value
default_origins = [

    # Execute statement to process data and maintain state
    "https://la-esfera-hrms.vercel.app",

    # Execute statement to process data and maintain state
    "https://hrms-frontend-xmbb.onrender.com",

    # Execute statement to process data and maintain state
    "http://localhost:5173",

    # Execute statement to process data and maintain state
    "http://127.0.0.1:5173",

    # Execute statement to process data and maintain state
    "http://localhost:5174",

    # Execute statement to process data and maintain state
    "http://127.0.0.1:5174",

    # Execute statement to process data and maintain state
    "http://localhost:5175",

    # Execute statement to process data and maintain state
    "http://127.0.0.1:5175",

    # Execute statement to process data and maintain state
    "http://localhost:3000",

    # Execute statement to process data and maintain state
    "http://127.0.0.1:3000",

# Execute statement to process data and maintain state
]

# Set all_allowed_origins variable to store all allowed origins value
all_allowed_origins = list(dict.fromkeys([o.rstrip("/") for o in default_origins] + allowed_env_origins))

# Set allow_lan_origins variable to store allow lan origins value
allow_lan_origins = os.getenv("CORS_ALLOW_LAN", "true").strip().lower() in ("true", "1", "yes")

# Evaluate condition to control execution branch
if "*" in all_allowed_origins:
    # Set all_allowed_origins variable to store all allowed origins value
    all_allowed_origins = [o for o in all_allowed_origins if o != "*"]
    # Set local_network_origin_regex variable to store local network origin regex value
    local_network_origin_regex = r"^https?://.*$"
# Execute fallback branch when conditions are not met
else:
    # Set local_network_origin_regex variable to store local network origin regex value
    local_network_origin_regex = (
        # Execute statement to process data and maintain state
        r"^https?://(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|"
        r"192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d{1,5})?$|"
        r"^https://.*\.vercel\.app$"
        # Evaluate condition to control execution branch
        if allow_lan_origins else None
    # Execute statement to process data and maintain state
    )




# Execute statement to process data and maintain state
app.add_middleware(
    # Execute statement to process data and maintain state
    CORSMiddleware,
    # Set allow_origins variable to store allow origins value
    allow_origins=all_allowed_origins,
    # Set allow_origin_regex variable to store allow origin regex value
    allow_origin_regex=local_network_origin_regex,
    # Set allow_credentials variable to store allow credentials value
    allow_credentials=True,
    # Set allow_methods variable to store allow methods value
    allow_methods=["*"],
    # Set allow_headers variable to store allow headers value
    allow_headers=["*"],
# Execute statement to process data and maintain state
)

# Import GZipMiddleware from fastapi.middleware.gzip for module operations
from fastapi.middleware.gzip import GZipMiddleware
# Invoke app.add_middleware to perform operational action
app.add_middleware(GZipMiddleware, minimum_size=1000)





# =============================================================

# 🩺 HEALTH AND READINESS CHECKS

# =============================================================



# Apply decorator to wrap function behavior
@app.get("/health", tags=["Health"])

# Apply decorator to wrap function behavior
@app.get("/api/v1/health", tags=["Health"])

# Define health_check function to handle health check
def health_check():

    """Liveness check indicating the FastAPI application process is up."""

    # Return computed result or response payload to caller
    return {

        # Execute statement to process data and maintain state
        "status": "ok",

        # Execute statement to process data and maintain state
        "service": "Quickchex HRMS API",

        # Execute statement to process data and maintain state
        "version": "1.0.0"

    # Execute statement to process data and maintain state
    }





# Apply decorator to wrap function behavior
@app.get("/ready", tags=["Health"])

# Apply decorator to wrap function behavior
@app.get("/api/v1/ready", tags=["Health"])

# Define readiness_check function to handle readiness check
def readiness_check(db: Session = Depends(get_db)):

    """Readiness check validating the database connection."""

    # Begin guarded execution block to trap exceptions
    try:

        # Import text from sqlalchemy for module operations
        from sqlalchemy import text

        # Invoke db.execute to perform operational action
        db.execute(text("SELECT 1"))

        # Set dialect variable to store dialect value
        dialect = getattr(db.bind, 'dialect', None)

        # Set dialect_name variable to store dialect name value
        dialect_name = dialect.name if dialect else 'database'

        # Return computed result or response payload to caller
        return {

            # Execute statement to process data and maintain state
            "status": "ready",

            # Execute statement to process data and maintain state
            "database": dialect_name,

            # Execute statement to process data and maintain state
            "connected": True

        # Execute statement to process data and maintain state
        }

    # Catch and handle specific exception if raised
    except Exception as exc:

        # Raise HTTP exception with status code and error details
        raise HTTPException(

            # Set status_code variable to store status code value
            status_code=503,

            # Set detail variable to store detail value
            detail=f"Database readiness check failed: {str(exc)}"

        # Execute statement to process data and maintain state
        )





# =============================================================

# 🔐 CANONICAL ROUTER REGISTRATION

# =============================================================



# 1. Master Canonical API Router (/api/v1/*)

# Invoke app.include_router to perform operational action
app.include_router(api_router, prefix="/api/v1")
# Invoke app.include_router to perform operational action
app.include_router(api_router, prefix="/api")



# 2. Backward Compatibility Mounts (for legacy requests omitting /api/v1)

# Invoke app.include_router to perform operational action
app.include_router(profile_router)

# Invoke app.include_router to perform operational action
app.include_router(attendance_router)

# Invoke app.include_router to perform operational action
app.include_router(admin_api.router)

# Invoke app.include_router to perform operational action
app.include_router(manager_api.router)

# Invoke app.include_router to perform operational action
app.include_router(add_emp_router)

# Invoke app.include_router to perform operational action
app.include_router(emp_router)

# Invoke app.include_router to perform operational action
app.include_router(work_location_router)

# Invoke app.include_router to perform operational action
app.include_router(policy_router)

# Invoke app.include_router to perform operational action
app.include_router(regularization_api.router)

# Invoke app.include_router to perform operational action
app.include_router(leave_router, prefix="/leaves")

# Invoke app.include_router to perform operational action
app.include_router(payroll_api.router)

# Invoke app.include_router to perform operational action
app.include_router(calendar_router, prefix="/api/v1")

# Invoke app.include_router to perform operational action
app.include_router(notification_router)
# Invoke app.include_router to perform operational action
app.include_router(document_api.router, prefix="/documents")
# Invoke app.include_router to perform operational action
app.include_router(resignation_api.router)
# Invoke app.include_router to perform operational action
app.include_router(compoff_api.router)
# Invoke app.include_router to perform operational action
app.include_router(contract_api.router)
# Invoke app.include_router to perform operational action
app.include_router(chatbot_api.router)
# Invoke app.include_router to perform operational action
app.include_router(chatbot_api.router, prefix="/api")







# =============================================================

# 🔁 BACKWARD-COMPAT: Employee Portal Regularization Routes

# These aliases map /attendance/regularization -> regularization service

# so old frontend calls continue to work without URL changes.

# =============================================================



# Apply decorator to wrap function behavior
@app.get("/attendance/regularization")

# Apply decorator to wrap function behavior
@app.get("/api/v1/attendance/regularization")

# Define get_my_regularizations_compat function to handle get my regularizations compat
def get_my_regularizations_compat(request: Request, db: Session = Depends(get_db)):

    """Employee: fetch my regularization requests (backward-compat alias for /attendance/regularization)."""

    # Import _resolve_emp_code from app.api.v1.endpoints.attendance_api for module operations
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code

    # Import regularization_service from app.services for module operations
    from app.services import regularization_service

    # Set emp_code variable to store emp code value
    emp_code = _resolve_emp_code(request, db) or "EMP001"

    # Return computed result or response payload to caller
    return regularization_service.get_my_regularizations(db, emp_code)





# Apply decorator to wrap function behavior
@app.post("/attendance/regularization")

# Apply decorator to wrap function behavior
@app.post("/api/v1/attendance/regularization")

# Define submit_regularization_compat function to handle submit regularization compat
async def submit_regularization_compat(request: Request, db: Session = Depends(get_db)):

    """Employee: submit a regularization request (backward-compat alias for /attendance/regularization)."""

    # Import apply_regularization from app.api.v1.endpoints.regularization_api for module operations
    from app.api.v1.endpoints.regularization_api import apply_regularization

    # Return computed result or response payload to caller
    return await apply_regularization(request=request, db=db)





# Apply decorator to wrap function behavior
@app.get("/departments", tags=["Departments"])

# Apply decorator to wrap function behavior
@app.get("/api/v1/departments", tags=["Departments"])

# Define get_departments_direct function to handle get departments direct
def get_departments_direct(db: Session = Depends(get_db)):

    # Return computed result or response payload to caller
    return admin_api.get_all_departments(db)







# Apply decorator to wrap function behavior
@app.get("/leave/applications")

# Apply decorator to wrap function behavior
@app.get("/api/v1/leave/applications")

# Define get_employee_leave_applications function to handle get employee leave applications
def get_employee_leave_applications(request: Request, db: Session = Depends(get_db)):

    # Import get_all_leaves_admin from app.services.leave_service for module operations
    from app.services.leave_service import get_all_leaves_admin

    # Set all_leaves variable to store all leaves value
    all_leaves = get_all_leaves_admin(db)



    # 1. Explicit query parameter ?all=true or ?admin=true

    # Evaluate condition to control execution branch
    if request.query_params.get("all") == "true" or request.query_params.get("admin") == "true":

        # Return computed result or response payload to caller
        return all_leaves



    # 2. Extract employee code and role from headers or JWT

    # Set role variable to store role value
    role = (request.headers.get("x-role") or "").lower()

    # Set auth_header variable to store auth header value
    auth_header = request.headers.get("authorization", "")

    # Set emp_code variable to store emp code value
    emp_code = request.headers.get("x-emp-code") or request.headers.get("x-employee-id")



    # Evaluate condition to control execution branch
    if auth_header.startswith("Bearer "):

        # Set token variable to store token value
        token = auth_header.split(" ")[1]

        # Begin guarded execution block to trap exceptions
        try:

            # Import jwt from jose for module operations
            from jose import jwt

            # Import SECRET_KEY, ALGORITHM from app.core.dependencies for module operations
            from app.core.dependencies import SECRET_KEY, ALGORITHM

            # Set payload variable to store payload value
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

            # Set emp_code variable to store emp code value
            emp_code = payload.get("emp_code") or emp_code

            # Set role variable to store role value
            role = (payload.get("role") or role).lower()

        # Catch and handle specific exception if raised
        except Exception:

            # Placeholder statement performing no operation
            pass



    # 3. Admins and Managers get all leaves

    # Evaluate condition to control execution branch
    if "admin" in role or "manager" in role or (emp_code and emp_code.upper().startswith("ADM")):

        # Return computed result or response payload to caller
        return all_leaves



    # 4. If a specific employee code is provided, return their leaves

    # Evaluate condition to control execution branch
    if emp_code:

        # Set filtered variable to store filtered value
        filtered = [l for l in all_leaves if (l.get("emp_code") or "").upper() == emp_code.upper() or (l.get("code") or "").upper() == emp_code.upper()]

        # Return computed result or response payload to caller
        return filtered



    # Return computed result or response payload to caller
    return all_leaves






# ------------------------------------------------------------------------------
# HELPER: Compute Category Leave Balances (Casual, Sick, Optional)
# ------------------------------------------------------------------------------
# Breaks down an employee's total allowed leaves into category-specific buckets:
# - Casual Leave: up to 10 days
# - Sick Leave: up to 8 days
# - Optional / Privilege Holiday: remaining days
# Calculates approved used days for each category and derives available balances.
# ------------------------------------------------------------------------------
def _compute_category_leave_balances(db: Session, emp_code: str, allowed: float, total_used: float):
    # Set casual_total variable to store casual total value
    casual_total = 10.0 if allowed >= 10 else allowed
    # Set sick_total variable to store sick total value
    sick_total = 8.0 if allowed >= 18 else max(0.0, allowed - casual_total)
    # Set optional_total variable to store optional total value
    optional_total = max(0.0, allowed - casual_total - sick_total)

    # Set sick_used variable to store sick used value
    sick_used = 0.0
    # Set casual_used variable to store casual used value
    casual_used = 0.0
    # Set optional_used variable to store optional used value
    optional_used = 0.0

    # Evaluate condition to control execution branch
    if emp_code:
        # Begin guarded execution block to trap exceptions
        try:
            # Import get_all_leaves_admin from app.services.leave_service for module operations
            from app.services.leave_service import get_all_leaves_admin
            # Set all_leaves variable to store all leaves value
            all_leaves = get_all_leaves_admin(db)
            # Set emp_clean variable to store emp clean value
            emp_clean = str(emp_code).strip().upper()
            # Iterate through items in sequence loop
            for l in all_leaves:
                # Evaluate condition to control execution branch
                if str(l.get("emp_code") or "").strip().upper() != emp_clean:
                    # Skip to next iteration of active loop
                    continue
                # Set st variable to store st value
                st = str(l.get("overall_status") or l.get("status") or "").upper()
                # Evaluate condition to control execution branch
                if st != "APPROVED":
                    # Skip to next iteration of active loop
                    continue
                # Set cat variable to store cat value
                cat = str(l.get("category") or "").strip().lower()
                # Begin guarded execution block to trap exceptions
                try:
                    # Set days_val variable to store days val value
                    days_val = float(l.get("total_days") or 1.0)
                # Catch and handle specific exception if raised
                except Exception:
                    # Set days_val variable to store days val value
                    days_val = 1.0

                # Evaluate condition to control execution branch
                if "sick" in cat:
                    # Execute statement to process data and maintain state
                    sick_used += days_val
                # Evaluate alternate branch condition
                elif "optional" in cat or "privilege" in cat or "holiday" in cat:
                    # Execute statement to process data and maintain state
                    optional_used += days_val
                # Evaluate alternate branch condition
                elif "without pay" in cat or "lwp" in cat:
                    # Placeholder statement performing no operation
                    pass
                # Execute fallback branch when conditions are not met
                else:
                    # Execute statement to process data and maintain state
                    casual_used += days_val
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Set calculated_sum variable to store calculated sum value
    calculated_sum = sick_used + casual_used + optional_used
    # Evaluate condition to control execution branch
    if calculated_sum == 0.0 and total_used > 0.0:
        # Set casual_used variable to store casual used value
        casual_used = min(total_used, casual_total)
        # Set rem variable to store rem value
        rem = max(0.0, total_used - casual_used)
        # Set sick_used variable to store sick used value
        sick_used = min(rem, sick_total)
        # Set rem2 variable to store rem2 value
        rem2 = max(0.0, rem - sick_used)
        # Set optional_used variable to store optional used value
        optional_used = min(rem2, optional_total)
    # Execute fallback branch when conditions are not met
    else:
        # Set total_used variable to store total used value
        total_used = max(total_used, calculated_sum)

    # Set casual_used variable to store casual used value
    casual_used = min(casual_used, casual_total)
    # Set sick_used variable to store sick used value
    sick_used = min(sick_used, sick_total)
    # Set optional_used variable to store optional used value
    optional_used = min(optional_used, optional_total)

    # Set actual_used variable to store actual used value
    actual_used = casual_used + sick_used + optional_used
    # Set avail variable to store avail value
    avail = max(0.0, allowed - actual_used)

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "casualLeave": {"total": casual_total, "used": casual_used, "available": max(0.0, casual_total - casual_used), "pending": 0},
        # Execute statement to process data and maintain state
        "sickLeave": {"total": sick_total, "used": sick_used, "available": max(0.0, sick_total - sick_used), "pending": 0},
        # Execute statement to process data and maintain state
        "optionalHoliday": {"total": optional_total, "used": optional_used, "available": max(0.0, optional_total - optional_used), "pending": 0},
        # Execute statement to process data and maintain state
        "casual": {"total": casual_total, "used": casual_used, "available": max(0.0, casual_total - casual_used)},
        # Execute statement to process data and maintain state
        "sick": {"total": sick_total, "used": sick_used, "available": max(0.0, sick_total - sick_used)},
        # Execute statement to process data and maintain state
        "optional": {"total": optional_total, "used": optional_used, "available": max(0.0, optional_total - optional_used)},
        # Execute statement to process data and maintain state
        "earned": {"total": 0.0, "used": 0.0, "available": 0.0},
        # Execute statement to process data and maintain state
        "compOff": {"total": 0.0, "used": 0.0, "available": 0.0},
        # Execute statement to process data and maintain state
        "totalAvailable": avail,
        # Execute statement to process data and maintain state
        "allowed": allowed,
        # Execute statement to process data and maintain state
        "used": actual_used
    # Execute statement to process data and maintain state
    }


# Apply decorator to wrap function behavior
@app.get("/leave/balance")
@app.get("/api/v1/leave/balance")
@app.get("/leave/stats")
@app.get("/api/v1/leave/stats")
# Define get_employee_leave_balance function to handle get employee leave balance
def get_employee_leave_balance(request: Request, db: Session = Depends(get_db)):
    # Import _resolve_emp_code from app.api.v1.endpoints.attendance_api for module operations
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code
    # Set emp_code variable to store emp code value
    emp_code = _resolve_emp_code(request, db)
    # Import LeaveBalance from app.models.leave for module operations
    from app.models.leave import LeaveBalance
    # Set bal variable to store bal value
    bal = None
    # Evaluate condition to control execution branch
    if emp_code:
        # Initiate database query on specified model
        bal = db.query(LeaveBalance).filter(LeaveBalance.emp_code == emp_code).first()
        # Check if target condition is false or object is missing
        if not bal:
            # Begin guarded execution block to trap exceptions
            try:
                # Set bal variable to store bal value
                bal = LeaveBalance(emp_code=emp_code, allowed_leaves=21.0, used_leaves=0.0)
                # Stage new entity instance into database session
                db.add(bal)
                # Commit transaction to persist changes in database
                db.commit()
                # Refresh instance state with updated database values
                db.refresh(bal)
            # Catch and handle specific exception if raised
            except Exception:
                # Roll back transaction to revert changes on failure
                db.rollback()
                # Set bal variable to store bal value
                bal = None

    # Set allowed variable to store allowed value
    allowed = float(bal.allowed_leaves) if bal and bal.allowed_leaves is not None else 21.0
    # Set used variable to store used value
    used = float(bal.used_leaves) if bal and bal.used_leaves is not None else 0.0
    # Evaluate condition to control execution branch
    if allowed <= 0:
        # Set allowed variable to store allowed value
        allowed = 21.0

    # Return computed result or response payload to caller
    return _compute_category_leave_balances(db, emp_code, allowed, used)





# Apply decorator to wrap function behavior
@app.post("/leave/apply")

# Apply decorator to wrap function behavior
@app.post("/api/v1/leave/apply")

# Apply decorator to wrap function behavior
@app.post("/leaves/apply")

# Apply decorator to wrap function behavior
@app.post("/api/v1/leaves/apply")

# Define apply_for_leave_unified function to handle apply for leave unified
async def apply_for_leave_unified(request: Request, db: Session = Depends(get_db)):

    # Import _resolve_emp_code from app.api.v1.endpoints.attendance_api for module operations
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code

    # Import leave_service from app.services for module operations
    from app.services import leave_service



    # Begin guarded execution block to trap exceptions
    try:

        # Set data variable to store data value
        data = await request.json()

    # Catch and handle specific exception if raised
    except Exception:

        # Set data variable to store data value
        data = {}



    # Set emp_code variable to store emp code value
    emp_code = data.get("emp_code") or _resolve_emp_code(request, db, data) or "EMP001"



    # Begin guarded execution block to trap exceptions
    try:

        # Set created variable to store created value
        created = leave_service.create_leave_request(db, data, emp_code)

        # Return computed result or response payload to caller
        return {

            # Execute statement to process data and maintain state
            "status": "success",

            # Execute statement to process data and maintain state
            "message": "Leave application submitted successfully",

            # Execute statement to process data and maintain state
            "data": created,

            # Execute statement to process data and maintain state
            **created

        # Execute statement to process data and maintain state
        }

    # Catch and handle specific exception if raised
    except Exception as e:

        # Roll back transaction to revert changes on failure
        db.rollback()

        # Invoke print to perform operational action
        print("Apply leave error in unified endpoint:", e)

        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))





# Apply decorator to wrap function behavior
@app.put("/leave/{leave_id}/approve")

# Apply decorator to wrap function behavior
@app.put("/api/v1/leave/{leave_id}/approve")

# Apply decorator to wrap function behavior
@app.put("/leaves/{leave_id}/approve")

# Apply decorator to wrap function behavior
@app.put("/api/v1/leaves/{leave_id}/approve")

# Apply decorator to wrap function behavior
@app.post("/leave/{leave_id}/approve")

# Apply decorator to wrap function behavior
@app.post("/api/v1/leave/{leave_id}/approve")

# Apply decorator to wrap function behavior
@app.post("/leaves/{leave_id}/approve")

# Apply decorator to wrap function behavior
@app.post("/api/v1/leaves/{leave_id}/approve")

# Define approve_leave_unified function to handle approve leave unified
async def approve_leave_unified(leave_id: int, request: Request, db: Session = Depends(get_db)):

    # Import leave_service from app.services for module operations
    from app.services import leave_service

    # Set comment variable to store comment value
    comment = "Approved by Admin"

    # Begin guarded execution block to trap exceptions
    try:

        # Set body variable to store body value
        body = await request.json()

        # Set comment variable to store comment value
        comment = body.get("comment") or body.get("remarks") or comment

    # Catch and handle specific exception if raised
    except Exception:

        # Placeholder statement performing no operation
        pass

    # Begin guarded execution block to trap exceptions
    try:

        # Set result variable to store result value
        result = leave_service.admin_action_leave(db, leave_id, "Approved", comment=comment)

        # Check if target condition is false or object is missing
        if not result:

            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Leave request not found")

        # Return computed result or response payload to caller
        return {"status": "success", "message": "Leave application approved successfully.", "data": result, **result}

    # Catch and handle specific exception if raised
    except ValueError as ve:

        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))





# Apply decorator to wrap function behavior
@app.put("/leave/{leave_id}/reject")

# Apply decorator to wrap function behavior
@app.put("/api/v1/leave/{leave_id}/reject")

# Apply decorator to wrap function behavior
@app.put("/leaves/{leave_id}/reject")

# Apply decorator to wrap function behavior
@app.put("/api/v1/leaves/{leave_id}/reject")

# Apply decorator to wrap function behavior
@app.post("/leave/{leave_id}/reject")

# Apply decorator to wrap function behavior
@app.post("/api/v1/leave/{leave_id}/reject")

# Apply decorator to wrap function behavior
@app.post("/leaves/{leave_id}/reject")

# Apply decorator to wrap function behavior
@app.post("/api/v1/leaves/{leave_id}/reject")

# Define reject_leave_unified function to handle reject leave unified
async def reject_leave_unified(leave_id: int, request: Request, db: Session = Depends(get_db)):

    # Import leave_service from app.services for module operations
    from app.services import leave_service

    # Set comment variable to store comment value
    comment = "Rejected by Admin"

    # Begin guarded execution block to trap exceptions
    try:

        # Set body variable to store body value
        body = await request.json()

        # Set comment variable to store comment value
        comment = body.get("comment") or body.get("reason") or body.get("remarks") or comment

    # Catch and handle specific exception if raised
    except Exception:

        # Placeholder statement performing no operation
        pass

    # Begin guarded execution block to trap exceptions
    try:

        # Set result variable to store result value
        result = leave_service.admin_action_leave(db, leave_id, "Rejected", comment=comment)

        # Check if target condition is false or object is missing
        if not result:

            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Leave request not found")

        # Return computed result or response payload to caller
        return {"status": "success", "message": "Request rejected successfully.", "data": result, **result}

    # Catch and handle specific exception if raised
    except ValueError as ve:

        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))





# Apply decorator to wrap function behavior
@app.put("/regularization/{req_id}/approve")

# Apply decorator to wrap function behavior
@app.put("/api/v1/regularization/{req_id}/approve")

# Apply decorator to wrap function behavior
@app.put("/attendance/regularization/{req_id}/approve")

# Apply decorator to wrap function behavior
@app.put("/api/v1/attendance/regularization/{req_id}/approve")

# Apply decorator to wrap function behavior
@app.post("/regularization/{req_id}/approve")

# Apply decorator to wrap function behavior
@app.post("/api/v1/regularization/{req_id}/approve")

# Apply decorator to wrap function behavior
@app.post("/attendance/regularization/{req_id}/approve")

# Apply decorator to wrap function behavior
@app.post("/api/v1/attendance/regularization/{req_id}/approve")

# Define approve_regularization_root function to handle approve regularization root
async def approve_regularization_root(req_id: int, request: Request, db: Session = Depends(get_db)):

    # Import regularization_service from app.services for module operations
    from app.services import regularization_service

    # Import _resolve_admin_user from app.api.v1.endpoints.regularization_api for module operations
    from app.api.v1.endpoints.regularization_api import _resolve_admin_user

    # Set comment variable to store comment value
    comment = "Approved by Admin"

    # Begin guarded execution block to trap exceptions
    try:

        # Set body variable to store body value
        body = await request.json()

        # Set comment variable to store comment value
        comment = body.get("comment") or body.get("remarks") or comment

    # Catch and handle specific exception if raised
    except Exception:

        # Placeholder statement performing no operation
        pass

    # Set admin_name variable to store admin name value
    admin_name = _resolve_admin_user(request, db)

    # Begin guarded execution block to trap exceptions
    try:

        # Set res variable to store res value
        res = regularization_service.admin_action_request(db, req_id, "Approved", comment=comment, admin_name=admin_name)

        # Check if target condition is false or object is missing
        if not res:

            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Regularization request not found")

        # Return computed result or response payload to caller
        return {"status": "success", "message": "Regularization request approved and attendance synchronized.", "data": res, **res}

    # Catch and handle specific exception if raised
    except ValueError as ve:

        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))





# Apply decorator to wrap function behavior
@app.put("/regularization/{req_id}/reject")

# Apply decorator to wrap function behavior
@app.put("/api/v1/regularization/{req_id}/reject")

# Apply decorator to wrap function behavior
@app.put("/attendance/regularization/{req_id}/reject")

# Apply decorator to wrap function behavior
@app.put("/api/v1/attendance/regularization/{req_id}/reject")

# Apply decorator to wrap function behavior
@app.post("/regularization/{req_id}/reject")

# Apply decorator to wrap function behavior
@app.post("/api/v1/regularization/{req_id}/reject")

# Apply decorator to wrap function behavior
@app.post("/attendance/regularization/{req_id}/reject")

# Apply decorator to wrap function behavior
@app.post("/api/v1/attendance/regularization/{req_id}/reject")

# Define reject_regularization_root function to handle reject regularization root
async def reject_regularization_root(req_id: int, request: Request, db: Session = Depends(get_db)):

    # Import regularization_service from app.services for module operations
    from app.services import regularization_service

    # Import _resolve_admin_user from app.api.v1.endpoints.regularization_api for module operations
    from app.api.v1.endpoints.regularization_api import _resolve_admin_user

    # Set comment variable to store comment value
    comment = "Rejected by Admin"

    # Begin guarded execution block to trap exceptions
    try:

        # Set body variable to store body value
        body = await request.json()

        # Set comment variable to store comment value
        comment = body.get("comment") or body.get("reason") or body.get("remarks") or comment

    # Catch and handle specific exception if raised
    except Exception:

        # Placeholder statement performing no operation
        pass

    # Set admin_name variable to store admin name value
    admin_name = _resolve_admin_user(request, db)

    # Begin guarded execution block to trap exceptions
    try:

        # Set res variable to store res value
        res = regularization_service.admin_action_request(db, req_id, "Rejected", comment=comment, admin_name=admin_name)

        # Check if target condition is false or object is missing
        if not res:

            # Raise HTTP exception with status code and error details
            raise HTTPException(status_code=404, detail="Regularization request not found")

        # Return computed result or response payload to caller
        return {"status": "success", "message": "Request rejected successfully.", "data": res, **res}

    # Catch and handle specific exception if raised
    except ValueError as ve:

        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=str(ve))





# Apply decorator to wrap function behavior
@app.get("/leave/comp-off", tags=["Comp Offs"])
# Apply decorator to wrap function behavior
@app.get("/api/v1/leave/comp-off", tags=["Comp Offs"])
# Define get_employee_comp_off function to handle get employee comp off
def get_employee_comp_off(db: Session = Depends(get_db)):
    # Import get_comp_offs from app.api.v1.endpoints.compoff_api for module operations
    from app.api.v1.endpoints.compoff_api import get_comp_offs
    # Return computed result or response payload to caller
    return get_comp_offs(db)

# Apply decorator to wrap function behavior
@app.get("/leave/all", tags=["Leaves"])
# Apply decorator to wrap function behavior
@app.get("/api/v1/leave/all", tags=["Leaves"])
# Define get_all_leaves_alias function to handle get all leaves alias
def get_all_leaves_alias(db: Session = Depends(get_db)):
    # Import get_all_leaves_admin from app.services.leave_service for module operations
    from app.services.leave_service import get_all_leaves_admin
    # Return computed result or response payload to caller
    return get_all_leaves_admin(db)








# Apply decorator to wrap function behavior
@app.get("/leave/holidays", tags=["Holidays"])

# Apply decorator to wrap function behavior
@app.get("/api/v1/leave/holidays", tags=["Holidays"])

# Apply decorator to wrap function behavior
@app.get("/api/v1/holidays", tags=["Holidays"])

# Define get_company_holidays function to handle get company holidays
def get_company_holidays(db: Session = Depends(get_db)):

    # Import Holiday from app.models.leave for module operations
    from app.models.leave import Holiday

    # Import text as _text from sqlalchemy for module operations
    from sqlalchemy import text as _text

    # Set session_to_close variable to store session to close value
    session_to_close = None

    # Check if target condition is false or object is missing
    if not isinstance(db, Session):

        # Import SessionLocal from app.db.session for module operations
        from app.db.session import SessionLocal

        # Set db variable to store db value
        db = SessionLocal()

        # Set session_to_close variable to store session to close value
        session_to_close = db

    # Begin guarded execution block to trap exceptions
    try:

        # Set result variable to store result value
        result = []



        # 1. Legacy Holiday table (Admin-managed named holidays)

        # Initiate database query on specified model
        db_holidays = db.query(Holiday).filter(Holiday.status == "Active").order_by(Holiday.holiday_date.asc()).all()

        # Set seen_dates variable to store seen dates value
        seen_dates = set()

        # Iterate through items in sequence loop
        for h in db_holidays:

            # Set d_iso variable to store d iso value
            d_iso = h.holiday_date.isoformat() if h.holiday_date else None

            # Evaluate condition to control execution branch
            if d_iso:

                # Invoke seen_dates.add to perform operational action
                seen_dates.add(d_iso)

            # Execute statement to process data and maintain state
            result.append({

                # Execute statement to process data and maintain state
                "id": h.id,

                # Execute statement to process data and maintain state
                "name": h.name,

                # Execute statement to process data and maintain state
                "date": h.holiday_date.strftime("%d %b %Y") if h.holiday_date else "",

                # Execute statement to process data and maintain state
                "isoDate": d_iso or "",

                # Execute statement to process data and maintain state
                "day": h.day_of_week or (h.holiday_date.strftime("%A") if h.holiday_date else ""),

                # Execute statement to process data and maintain state
                "type": h.type or "Gazetted"

            # Execute statement to process data and maintain state
            })



        # 2. OrganizationCalendar HOLIDAY entries (imported via Excel)

        # Begin guarded execution block to trap exceptions
        try:

            # Set cal_rows variable to store cal rows value
            cal_rows = db.execute(_text(

                # Execute statement to process data and maintain state
                "SELECT date, holiday_name FROM organization_calendar WHERE status = 'HOLIDAY' ORDER BY date ASC"

            # Execute statement to process data and maintain state
            )).mappings().all()

            # Iterate through items in sequence loop
            for row in cal_rows:

                # Set d_iso variable to store d iso value
                d_iso = row["date"].isoformat() if hasattr(row["date"], "isoformat") else str(row["date"])

                # Evaluate condition to control execution branch
                if d_iso in seen_dates:

                    continue  # already represented by the legacy table

                # Invoke seen_dates.add to perform operational action
                seen_dates.add(d_iso)

                # Set d_obj variable to store d obj value
                d_obj = row["date"]

                # Set name variable to store name value
                name = row["holiday_name"] or "Holiday"

                # Execute statement to process data and maintain state
                result.append({

                    # Execute statement to process data and maintain state
                    "id": f"cal-{d_iso}",

                    # Execute statement to process data and maintain state
                    "name": name,

                    # Execute statement to process data and maintain state
                    "date": d_obj.strftime("%d %b %Y") if hasattr(d_obj, "strftime") else d_iso,

                    # Execute statement to process data and maintain state
                    "isoDate": d_iso,

                    # Execute statement to process data and maintain state
                    "day": d_obj.strftime("%A") if hasattr(d_obj, "strftime") else "",

                    # Execute statement to process data and maintain state
                    "type": "Gazetted"

                # Execute statement to process data and maintain state
                })

        # Catch and handle specific exception if raised
        except Exception:

            # Placeholder statement performing no operation
            pass



        # Evaluate condition to control execution branch
        if result:

            # Return computed result or response payload to caller
            return result



    # Catch and handle specific exception if raised
    except Exception as e:

        # Roll back transaction to revert changes on failure
        db.rollback()

    # Execute cleanup actions regardless of exceptions
    finally:

        # Evaluate condition to control execution branch
        if session_to_close:

            # Invoke session_to_close.close to perform operational action
            session_to_close.close()



    # Static fallback if DB has no records

    # Return computed result or response payload to caller
    return [

        # Execute statement to process data and maintain state
        {"id": 1, "name": "Republic Day", "date": "26 Jan 2026", "day": "Monday", "type": "National"},

        # Execute statement to process data and maintain state
        {"id": 2, "name": "Holi", "date": "14 Mar 2026", "day": "Saturday", "type": "Gazetted"},

        # Execute statement to process data and maintain state
        {"id": 3, "name": "Independence Day", "date": "15 Aug 2026", "day": "Saturday", "type": "National"},

        # Execute statement to process data and maintain state
        {"id": 4, "name": "Gandhi Jayanti", "date": "02 Oct 2026", "day": "Friday", "type": "National"},

        # Execute statement to process data and maintain state
        {"id": 5, "name": "Diwali", "date": "08 Nov 2026", "day": "Sunday", "type": "Gazetted"},

        # Execute statement to process data and maintain state
        {"id": 6, "name": "Christmas", "date": "25 Dec 2026", "day": "Friday", "type": "Gazetted"}

    # Execute statement to process data and maintain state
    ]









# Apply decorator to wrap function behavior
@app.get("/payslips")

# Apply decorator to wrap function behavior
@app.get("/api/v1/payslips")

# Define get_employee_payslips function to handle get employee payslips
def get_employee_payslips(

    # Define request schema field with type Request and default value
    request: Request = None,

    # Define emp_code schema field with type str and default value
    emp_code: str = None,

    # Define financial_year schema field with type str and default value
    financial_year: str = "2026-2027",

    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)

# Execute statement to process data and maintain state
):

    # Import _resolve_emp_code from app.api.v1.endpoints.attendance_api for module operations
    from app.api.v1.endpoints.attendance_api import _resolve_emp_code

    # Import get_employee_payslip_data from app.services.payroll_service for module operations
    from app.services.payroll_service import get_employee_payslip_data



    # Set target_code variable to store target code value
    target_code = emp_code
    # Check if target condition is false or object is missing
    if not target_code and request:
        # Begin guarded execution block to trap exceptions
        try:
            # Set target_code variable to store target code value
            target_code = _resolve_emp_code(request, db)
        # Catch and handle specific exception if raised
        except Exception:
            # Set target_code variable to store target code value
            target_code = None

    # Check if target condition is false or object is missing
    if not target_code and request:
        # Set target_code variable to store target code value
        target_code = (
            # Invoke request.headers.get to perform operational action
            request.headers.get("x-emp-code")
            # Execute statement to process data and maintain state
            or request.headers.get("x-employee-id")
            # Execute statement to process data and maintain state
            or request.headers.get("emp_code")
        # Execute statement to process data and maintain state
        )

    # Check if target condition is false or object is missing
    if not target_code:
        # Fallback to default first employee profile
        from app.models.profile_model import Profile
        # Initiate database query on specified model
        first_user = db.query(Profile).first()
        # Set target_code variable to store target code value
        target_code = first_user.emp_code if first_user else "LE250"



    # Set data variable to store data value
    data = get_employee_payslip_data(db, emp_code=target_code, financial_year=financial_year)

    # Return computed result or response payload to caller
    return data



# Apply decorator to wrap function behavior
@app.post("/payslips/generate-auto")

# Apply decorator to wrap function behavior
@app.post("/api/v1/payslips/generate-auto")

# Define generate_payslips_bulk_api function to handle generate payslips bulk api
async def generate_payslips_bulk_api(

    # Define request schema field with type Request,
    request: Request,

    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)

# Execute statement to process data and maintain state
):

    # Import generate_payslips_for_employee from app.services.payroll_service for module operations
    from app.services.payroll_service import generate_payslips_for_employee

    # Begin guarded execution block to trap exceptions
    try:

        # Set payload variable to store payload value
        payload = await request.json()

    # Catch and handle specific exception if raised
    except Exception:

        # Set payload variable to store payload value
        payload = {}



    # Set emp_code variable to store emp code value
    emp_code = payload.get("emp_code")

    # Set name variable to store name value
    name = payload.get("name") or payload.get("employee_name") or ""

    # Set gross variable to store gross value
    gross = payload.get("monthly_gross") or payload.get("salary") or payload.get("gross_earnings") or None

    # Set ctc variable to store ctc value
    ctc = payload.get("annual_ctc") or payload.get("ctc") or None

    # Set role variable to store role value
    role = payload.get("role") or payload.get("designation") or ""



    # Check if target condition is false or object is missing
    if not emp_code:

        # Return computed result or response payload to caller
        return {"status": "error", "message": "emp_code is required"}



    # Set calc variable to store calc value
    calc = generate_payslips_for_employee(

        # Set db variable to store db value
        db=db,

        # Set emp_code variable to store emp code value
        emp_code=emp_code,

        # Set employee_name variable to store employee name value
        employee_name=name,

        # Set monthly_gross variable to store monthly gross value
        monthly_gross=gross,

        # Set annual_ctc variable to store annual ctc value
        annual_ctc=ctc,

        # Set role variable to store role value
        role=role

    # Execute statement to process data and maintain state
    )

    # Return computed result or response payload to caller
    return {"status": "success", "emp_code": emp_code, "summary": calc}






# ------------------------------------------------------------------------------
# DASHBOARD SUMMARY ENDPOINT (/dashboard/summary)
# ------------------------------------------------------------------------------
# High-performance consolidated dashboard endpoint consumed by web and mobile.
# Returns:
# 1. Employee profile details (name, designation, department, avatar).
# 2. Key stats (attendance %, today's working hours, available leave balance).
# 3. Recent attendance punches for the month with GPS coordinates & selfie URLs.
# 4. Category-level leave balances (casual, sick, optional).
# ------------------------------------------------------------------------------
@app.get("/dashboard/summary")

# Apply decorator to wrap function behavior
@app.get("/api/dashboard/summary")
# Apply decorator to wrap function behavior
@app.get("/api/v1/dashboard/summary")

# Define get_dashboard_summary_root function to handle get dashboard summary root
def get_dashboard_summary_root(

    # Set current_user variable to store current user value
    current_user=Depends(get_current_user),

    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)

# Execute statement to process data and maintain state
):

    # Import date, datetime from datetime for module operations
    from datetime import date, datetime

    # Import text from sqlalchemy for module operations
    from sqlalchemy import text

    # Import LeaveBalance from app.models.leave for module operations
    from app.models.leave import LeaveBalance



    # Set user variable to store user value
    user = current_user

    # Set effective_code variable to store effective code value
    effective_code = str(user.emp_code or "").strip()

    # Check if target condition is false or object is missing
    if not effective_code:

        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=401, detail="Authenticated user has no employee code.")



    # Set today variable to store today value
    today = date.today()

    # Set table_name variable to store table name value
    table_name = f"attendance_{today.year}_{today.month:02d}"



    # Set recent variable to store recent value
    recent = []

    # Set today_hours variable to store today hours value
    today_hours = "0h 00m"

    # Set month_present variable to store month present value
    month_present = 0

    # Set month_tracked variable to store month tracked value
    month_tracked = 0

    # Set name_str variable to store name str value
    name_str = f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Employee"

    # Set user_email variable to store user email value
    user_email = user.email if user else ""

    # Set user_contact variable to store user contact value
    user_contact = user.mobile_no if user else ""



    # Begin guarded execution block to trap exceptions
    try:

        # Set q variable to store q value
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

        # Set rows variable to store rows value
        rows = db.execute(q, {"code": effective_code}).mappings().all()

        # Import  from app.services.attendance_service for module operations
        from app.services.attendance_service import (

            # Execute statement to process data and maintain state
            calculate_attendance_status,

            # Execute statement to process data and maintain state
            safe_parse_datetime,

            # Execute statement to process data and maintain state
            safe_parse_date,

            # Execute statement to process data and maintain state
            safe_format_time,

            # Execute statement to process data and maintain state
            safe_format_date,

            # Execute statement to process data and maintain state
            safe_calc_hours

        # Execute statement to process data and maintain state
        )

        # Iterate through items in sequence loop
        for r in rows:

            # Set in_time_val variable to store in time val value
            in_time_val = r["punch_in_time"]

            # Set out_time_val variable to store out time val value
            out_time_val = r["punch_out_time"]

            # Set in_dt variable to store in dt value
            in_dt = safe_parse_datetime(in_time_val)

            # Set out_dt variable to store out dt value
            out_dt = safe_parse_datetime(out_time_val)

            # Set d_val variable to store d val value
            d_val = safe_parse_date(r["date"]) or today



            # Set in_t variable to store in t value
            in_t = safe_format_time(in_time_val, "—")

            # Set out_t variable to store out t value
            out_t = safe_format_time(out_time_val, "—")

            # Set h_val variable to store h val value
            h_val = float(r["hours_completed"] or 0)

            # Evaluate condition to control execution branch
            if h_val == 0 and in_dt:

                # Set h_val variable to store h val value
                h_val = safe_calc_hours(in_dt, out_dt, d_val)



            # Set status_info variable to store status info value
            status_info = calculate_attendance_status(

                # Set punch_in_time variable to store punch in time value
                punch_in_time=in_dt,

                # Set punch_out_time variable to store punch out time value
                punch_out_time=out_dt,

                # Set hours_completed variable to store hours completed value
                hours_completed=h_val,

                # Set target_date variable to store target date value
                target_date=d_val,

                # Set is_sunday variable to store is sunday value
                is_sunday=(d_val.weekday() == 6),

                # Set status_override variable to store status override value
                status_override=r["status"]

            # Execute statement to process data and maintain state
            )

            # Set st variable to store st value
            st = status_info["status"]

            # Set h_str variable to store h str value
            h_str = status_info["total_hours"]

            # Set h_val variable to store h val value
            h_val = status_info["hours"]

            

            # Evaluate condition to control execution branch
            if d_val == today:

                # Set today_hours variable to store today hours value
                today_hours = h_str if (in_dt and (out_dt or d_val == today)) else "0h 00m"



            # Evaluate condition to control execution branch
            if st == "Present":

                # Execute statement to process data and maintain state
                month_present += 1.0

            # Evaluate alternate branch condition
            elif st == "Half Day":

                # Execute statement to process data and maintain state
                month_present += 0.5

            # Evaluate alternate branch condition
            elif st in ("In Progress", "Punched In"):

                # Execute statement to process data and maintain state
                month_present += 1.0

            # Execute statement to process data and maintain state
            month_tracked += 1



            # Set loc variable to store loc value
            loc = r["punch_in_location"] or r["punch_out_location"] or ""

            # Execute statement to process data and maintain state
            recent.append({

                # Execute statement to process data and maintain state
                "emp_code": effective_code,

                # Execute statement to process data and maintain state
                "employee_code": effective_code,

                # Execute statement to process data and maintain state
                "name": name_str or "Employee",

                # Execute statement to process data and maintain state
                "employee_name": name_str or "Employee",

                # Execute statement to process data and maintain state
                "email": user_email,

                # Execute statement to process data and maintain state
                "contact": user_contact,

                # Execute statement to process data and maintain state
                "date": safe_format_date(r["date"], "%d %b %Y"),

                # Execute statement to process data and maintain state
                "isoDate": d_val.isoformat() if d_val else "",

                # Execute statement to process data and maintain state
                "checkIn": in_t,

                # Execute statement to process data and maintain state
                "checkOut": out_t,

                # Execute statement to process data and maintain state
                "punch_in_time": in_dt.isoformat() if in_dt else None,

                # Execute statement to process data and maintain state
                "punch_out_time": out_dt.isoformat() if out_dt else None,

                # Specify parameter value for "hours": h_str if (in_dt and (out_dt or d_val
                "hours": h_str if (in_dt and (out_dt or d_val == today)) else "—",

                # Execute statement to process data and maintain state
                "hours_completed": h_val,

                # Execute statement to process data and maintain state
                "total_minutes": status_info["total_minutes"],

                # Execute statement to process data and maintain state
                "total_hours": h_str,

                # Execute statement to process data and maintain state
                "working_hours": h_str,

                # Execute statement to process data and maintain state
                "status": st,

                # Execute statement to process data and maintain state
                "attendance_status": st,

                # Execute statement to process data and maintain state
                "location": loc,

                # Execute statement to process data and maintain state
                "punch_in_location": r["punch_in_location"] or loc,

                # Execute statement to process data and maintain state
                "punch_out_location": r["punch_out_location"],

                # Execute statement to process data and maintain state
                "punch_in_latitude": r.get("punch_in_latitude"),

                # Execute statement to process data and maintain state
                "punch_in_longitude": r.get("punch_in_longitude"),

                # Execute statement to process data and maintain state
                "punch_in_accuracy": r.get("punch_in_accuracy"),

                # Execute statement to process data and maintain state
                "punch_out_latitude": r.get("punch_out_latitude"),

                # Execute statement to process data and maintain state
                "punch_out_longitude": r.get("punch_out_longitude"),

                # Execute statement to process data and maintain state
                "punch_out_accuracy": r.get("punch_out_accuracy"),

                # Execute statement to process data and maintain state
                "punch_in_image": r.get("punch_in_image"),

                # Execute statement to process data and maintain state
                "punch_out_image": r.get("punch_out_image")

            # Execute statement to process data and maintain state
            })

    # Catch and handle specific exception if raised
    except Exception as e:

        # Invoke print to perform operational action
        print(f"Error in dashboard/summary recent query: {e}")

        # Roll back transaction to revert changes on failure
        db.rollback()



    # Set att_pct variable to store att pct value
    att_pct = f"{round((month_present / month_tracked) * 100)}%" if month_tracked > 0 else "0%"



    # Initiate database query on specified model
    bal = db.query(LeaveBalance).filter(LeaveBalance.emp_code == effective_code).first()

    # Set allowed variable to store allowed value
    allowed = float(bal.allowed_leaves) if bal and bal.allowed_leaves is not None else 21.0

    # Set used variable to store used value
    used = float(bal.used_leaves) if bal and bal.used_leaves is not None else 0.0

    # Evaluate condition to control execution branch
    if allowed <= 0:

        # Set allowed variable to store allowed value
        allowed = 21.0

    # Set avail variable to store avail value
    avail = max(0.0, allowed - used)



    # Import get_all_leaves_admin from app.services.leave_service for module operations
    from app.services.leave_service import get_all_leaves_admin

    # Set all_leaves variable to store all leaves value
    all_leaves = get_all_leaves_admin(db)

    # Set user_leaves variable to store user leaves value
    user_leaves = [l for l in all_leaves if l.get("emp_code") == effective_code]



    # Set cat_bals variable to store cat bals value
    cat_bals = _compute_category_leave_balances(db, effective_code, allowed, used)
    # Set avail variable to store avail value
    avail = cat_bals["totalAvailable"]

    # Set name_str variable to store name str value
    name_str = f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Employee"

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "employee": {
            # Execute statement to process data and maintain state
            "name": name_str or "Employee",
            # Execute statement to process data and maintain state
            "emp_code": user.emp_code if user else "EMP001",
            # Execute statement to process data and maintain state
            "email": user.email if user else "",
            # Execute statement to process data and maintain state
            "designation": user.designation if user else "Employee",
            # Execute statement to process data and maintain state
            "department": user.department if user else "General",
            # Execute statement to process data and maintain state
            "role": user.role if user else "employee",
            # Execute statement to process data and maintain state
            "profile_image": f"/{str(user.profile_image).replace('\\', '/').lstrip('/')}" if getattr(user, "profile_image", None) else None,
            # Execute statement to process data and maintain state
            "profileImage": f"/{str(user.profile_image).replace('\\', '/').lstrip('/')}" if getattr(user, "profile_image", None) else None,
            # Execute statement to process data and maintain state
            "avatar": f"/{str(user.profile_image).replace('\\', '/').lstrip('/')}" if getattr(user, "profile_image", None) else None,
            # Execute statement to process data and maintain state
            "photo": f"/{str(user.profile_image).replace('\\', '/').lstrip('/')}" if getattr(user, "profile_image", None) else None,
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "stats": {
            # Execute statement to process data and maintain state
            "attendance": att_pct,
            # Execute statement to process data and maintain state
            "workingHours": today_hours,
            # Execute statement to process data and maintain state
            "leaveBalance": f"{int(avail)} days" if avail.is_integer() else f"{avail} days",
            # Execute statement to process data and maintain state
            "netSalary": "₹0"
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "recentAttendance": recent,
        # Execute statement to process data and maintain state
        "leaveRequests": user_leaves[:5],
        # Execute statement to process data and maintain state
        "leaveBalances": {
            # Execute statement to process data and maintain state
            "casual": cat_bals["casual"],
            # Execute statement to process data and maintain state
            "sick": cat_bals["sick"],
            # Execute statement to process data and maintain state
            "optional": cat_bals["optional"]
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "announcements": []
    # Execute statement to process data and maintain state
    }





# Apply decorator to wrap function behavior
@app.get("/announcements")

# Apply decorator to wrap function behavior
@app.get("/api/announcements")
# Apply decorator to wrap function behavior
@app.get("/api/v1/announcements")

# Define get_announcements_root function to handle get announcements root
def get_announcements_root():

    # Return computed result or response payload to caller
    return []





# Apply decorator to wrap function behavior
@app.get("/")

# Define root function to handle root
def root():

    # Return computed result or response payload to caller
    return {

        # Execute statement to process data and maintain state
        "message": "Attendance Backend Running",

        # Execute statement to process data and maintain state
        "status": "OK"

    # Execute statement to process data and maintain state
    }

