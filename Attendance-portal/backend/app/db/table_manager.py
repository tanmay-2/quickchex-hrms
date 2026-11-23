# ==============================================================================
# QUICKCHEX HRMS BACKEND - TABLE_MANAGER.PY
# Path: Attendance-portal/backend/app/db/table_manager.py
# Purpose: Database management, migration, or lifecycle initialization module for 'table_manager'.
# Primary Functions:
#   • create_monthly_tables()
#   • _ensure_org_calendar_table()
#   • _migrate_attendance_columns()
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

# Import module datetime for system functionality
import datetime
# Import text from sqlalchemy for module operations
from sqlalchemy import text
# Import BackgroundScheduler from apscheduler.schedulers.background for module operations
from apscheduler.schedulers.background import BackgroundScheduler
# Import engine from app.db.session for module operations
from app.db.session import engine
# Set _INITIALIZED_MONTHS variable to store  INITIALIZED MONTHS value
_INITIALIZED_MONTHS = set()
# Set _GLOBAL_SETUP_DONE variable to store  GLOBAL SETUP DONE value
_GLOBAL_SETUP_DONE = False
# Set _CALENDAR_CHECKED variable to store  CALENDAR CHECKED value
_CALENDAR_CHECKED = False

# Define create_monthly_tables function to handle create monthly tables
def create_monthly_tables(for_next_month=True):
    """
    Creates monthly tables for Attendance, Regularization, Daily Tasks, and Leaves.
    Uses in-memory caching to prevent redundant DDL locks during concurrent user requests.
    """
    today = datetime.date.today()
    
    # Evaluate condition to control execution branch
    if for_next_month:
        # Evaluate condition to control execution branch
        if today.month == 12:
            # Set target_month variable to store target month value
            target_month = 1
            # Set target_year variable to store target year value
            target_year = today.year + 1
        # Execute fallback branch when conditions are not met
        else:
            # Set target_month variable to store target month value
            target_month = today.month + 1
            # Set target_year variable to store target year value
            target_year = today.year
    # Execute fallback branch when conditions are not met
    else:
        # Set target_month variable to store target month value
        target_month = today.month
        # Set target_year variable to store target year value
        target_year = today.year

    # Set cache_key variable to store cache key value
    cache_key = (target_year, target_month)
    # Evaluate condition to control execution branch
    if cache_key in _INITIALIZED_MONTHS:
        # Return computed result or response payload to caller
        return

    # Set month_str variable to store month str value
    month_str = f"{target_month:02d}"
    
    # Dynamic Table Names
    attendance_table = f"attendance_{target_year}_{month_str}"
    # Set regularization_table variable to store regularization table value
    regularization_table = f"regularization_{target_year}_{month_str}"
    # Set tasks_table variable to store tasks table value
    tasks_table = f"tasks_{target_year}_{month_str}"
    # Set leave_table variable to store leave table value
    leave_table = f"leave_{target_year}_{month_str}"

    # Define Schemas based on models
    schemas = {
        # Define attendance_table schema field with type """
        attendance_table: """
            id SERIAL PRIMARY KEY,
            emp_code VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            punch_in_time TIMESTAMP,
            punch_out_time TIMESTAMP,
            punch_in_location TEXT,
            punch_out_location TEXT,
            punch_in_image TEXT,
            punch_out_image TEXT,
            punch_in_latitude FLOAT,
            punch_in_longitude FLOAT,
            punch_in_accuracy FLOAT,
            punch_out_latitude FLOAT,
            punch_out_longitude FLOAT,
            punch_out_accuracy FLOAT,
            hours_completed FLOAT,
            status VARCHAR(20),
            remark TEXT,
            first_punch_out_time TIMESTAMP,
            correction_status VARCHAR(50) DEFAULT 'NONE'
        """,
        # Define regularization_table schema field with type """
        regularization_table: """
            id SERIAL PRIMARY KEY,
            emp_code VARCHAR(50) NOT NULL,
            target_date DATE NOT NULL,
            issued_for_in_time TIMESTAMP,
            issued_for_out_time TIMESTAMP,
            status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
            overall_status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
            manager_status VARCHAR(50) DEFAULT 'PENDING',
            admin_status VARCHAR(50) DEFAULT 'PENDING',
            comment TEXT,
            employee_id VARCHAR(50),
            employee_name VARCHAR(150),
            manager_id VARCHAR(50),
            manager_name VARCHAR(150),
            approval_level INTEGER DEFAULT 1,
            manager_action VARCHAR(50),
            manager_reviewed_by VARCHAR(150),
            manager_reviewed_at TIMESTAMP,
            manager_comment TEXT,
            manager_rejection_reason TEXT,
            admin_action VARCHAR(50),
            admin_reviewed_by VARCHAR(150),
            admin_reviewed_at TIMESTAMP,
            admin_comment TEXT,
            admin_rejection_reason TEXT,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """,
        # Define tasks_table schema field with type """
        tasks_table: """
            id SERIAL PRIMARY KEY,
            emp_code VARCHAR(50) NOT NULL,
            task_date DATE NOT NULL,
            task_description TEXT NOT NULL,
            hours_spent NUMERIC(5,2),
            status VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """,
        # Define leave_table schema field with type """
        leave_table: """
            id SERIAL PRIMARY KEY,
            emp_code VARCHAR(50) NOT NULL,
            category VARCHAR(50) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_days FLOAT NOT NULL,
            reason TEXT NOT NULL,
            has_half_days BOOLEAN DEFAULT FALSE,
            half_day_details TEXT,
            status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
            overall_status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
            manager_status VARCHAR(50) DEFAULT 'PENDING',
            admin_status VARCHAR(50) DEFAULT 'PENDING',
            manager_reviewed_by VARCHAR(150),
            manager_reviewed_at TIMESTAMP,
            manager_comment TEXT,
            manager_rejection_reason TEXT,
            admin_reviewed_by VARCHAR(150),
            admin_reviewed_at TIMESTAMP,
            admin_comment TEXT,
            admin_rejection_reason TEXT,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            employee_name VARCHAR(150),
            manager_id VARCHAR(50),
            manager_name VARCHAR(150),
            approval_level INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """
    # Execute statement to process data and maintain state
    }

    # Execute Table Creation
    try:
        # Set is_sqlite variable to store is sqlite value
        is_sqlite = str(engine.url).startswith("sqlite")
        # Acquire context manager resource for enclosed block
        with engine.begin() as conn:
            # Iterate through items in sequence loop
            for table_name, schema in schemas.items():
                # Set target_schema variable to store target schema value
                target_schema = schema
                # Evaluate condition to control execution branch
                if is_sqlite:
                    # Set target_schema variable to store target schema value
                    target_schema = target_schema.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
                # Set query variable to store query value
                query = text(f"CREATE TABLE IF NOT EXISTS {table_name} ({target_schema});")
                # Invoke conn.execute to perform operational action
                conn.execute(query)
                # Invoke print to perform operational action
                print(f"✅ Successfully verified/created table: {table_name}")

            # Ensure unique and lookup indexes on dynamic monthly tables
            try:
                # Invoke conn.execute to perform operational action
                conn.execute(text(f"CREATE UNIQUE INDEX IF NOT EXISTS uq_{attendance_table}_emp_date ON {attendance_table} (emp_code, date);"))
                # Invoke conn.execute to perform operational action
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{attendance_table}_date ON {attendance_table} (date);"))
                # Invoke conn.execute to perform operational action
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{regularization_table}_emp_d ON {regularization_table} (emp_code, target_date);"))
                # Invoke conn.execute to perform operational action
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{leave_table}_emp_sd ON {leave_table} (emp_code, start_date);"))
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass

            # Execute statement to process data and maintain state
            global _GLOBAL_SETUP_DONE
            # Check if target condition is false or object is missing
            if not _GLOBAL_SETUP_DONE:
                # Set _GLOBAL_SETUP_DONE variable to store  GLOBAL SETUP DONE value
                _GLOBAL_SETUP_DONE = True
                # Ensure all attendance tables have GPS coordinate and accuracy columns
                _migrate_attendance_columns(conn, is_sqlite)

        # Invoke _INITIALIZED_MONTHS.add to perform operational action
        _INITIALIZED_MONTHS.add(cache_key)
    # Catch and handle specific exception if raised
    except Exception as e:
        # Invoke print to perform operational action
        print(f"❌ Error creating monthly tables: {e}")

    # Ensure the centralized org calendar table exists (once)
    global _CALENDAR_CHECKED
    # Check if target condition is false or object is missing
    if not _CALENDAR_CHECKED:
        # Set _CALENDAR_CHECKED variable to store  CALENDAR CHECKED value
        _CALENDAR_CHECKED = True
        # Invoke _ensure_org_calendar_table to perform operational action
        _ensure_org_calendar_table()


# Define _ensure_org_calendar_table function to handle  ensure org calendar table
def _ensure_org_calendar_table():
    """Creates the organization_calendar table if it doesn't exist yet."""
    ddl = """
        CREATE TABLE IF NOT EXISTS organization_calendar (
            id SERIAL PRIMARY KEY,
            date DATE NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'WORKING_DAY',
            holiday_name VARCHAR(200),
            description VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_org_calendar_date UNIQUE (date)
        );
    """
    # SQLite version uses INTEGER + AUTOINCREMENT
    ddl_sqlite = """
        CREATE TABLE IF NOT EXISTS organization_calendar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL UNIQUE,
            status VARCHAR(50) NOT NULL DEFAULT 'WORKING_DAY',
            holiday_name VARCHAR(200),
            description VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """
    # Begin guarded execution block to trap exceptions
    try:
        # Set is_sqlite variable to store is sqlite value
        is_sqlite = str(engine.url).startswith("sqlite")
        # Acquire context manager resource for enclosed block
        with engine.begin() as conn:
            # Invoke conn.execute to perform operational action
            conn.execute(text(ddl_sqlite if is_sqlite else ddl))
        # Invoke print to perform operational action
        print("✅ organization_calendar table verified/created.")
    # Catch and handle specific exception if raised
    except Exception as e:
        # Invoke print to perform operational action
        print(f"⚠️  Could not create organization_calendar table: {e}")



# Define _migrate_attendance_columns function to handle  migrate attendance columns
def _migrate_attendance_columns(conn, is_sqlite: bool):
    """Safely adds missing coordinate columns to all attendance_YYYY_MM tables."""
    new_cols = [
        # Execute statement to process data and maintain state
        ("punch_in_latitude", "FLOAT"),
        # Execute statement to process data and maintain state
        ("punch_in_longitude", "FLOAT"),
        # Execute statement to process data and maintain state
        ("punch_in_accuracy", "FLOAT"),
        # Execute statement to process data and maintain state
        ("punch_out_latitude", "FLOAT"),
        # Execute statement to process data and maintain state
        ("punch_out_longitude", "FLOAT"),
        # Execute statement to process data and maintain state
        ("punch_out_accuracy", "FLOAT"),
        # Execute statement to process data and maintain state
        ("first_punch_out_time", "TIMESTAMP"),
        # Execute statement to process data and maintain state
        ("correction_status", "VARCHAR(50) DEFAULT 'NONE'"),
    # Execute statement to process data and maintain state
    ]

    # Begin guarded execution block to trap exceptions
    try:
        # Evaluate condition to control execution branch
        if is_sqlite:
            # Set tables_res variable to store tables res value
            tables_res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'attendance_%'")).fetchall()
            # Set existing_tables variable to store existing tables value
            existing_tables = [r[0] for r in tables_res]
            # Iterate through items in sequence loop
            for tbl in existing_tables:
                # Set col_res variable to store col res value
                col_res = conn.execute(text(f"PRAGMA table_info({tbl})")).fetchall()
                # Set col_names variable to store col names value
                col_names = {c[1] for c in col_res}
                # Iterate through items in sequence loop
                for col_name, col_type in new_cols:
                    # Check if target condition is false or object is missing
                    if col_name not in col_names:
                        # Invoke conn.execute to perform operational action
                        conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col_name} {col_type}"))
                        # Invoke print to perform operational action
                        print(f"✅ Added {col_name} to {tbl}")
        # Execute fallback branch when conditions are not met
        else:
            # Set tables_res variable to store tables res value
            tables_res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'attendance_%'")).fetchall()
            # Set existing_tables variable to store existing tables value
            existing_tables = [r[0] for r in tables_res]
            # Iterate through items in sequence loop
            for tbl in existing_tables:
                # Iterate through items in sequence loop
                for col_name, col_type in new_cols:
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Invoke conn.execute to perform operational action
                        conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                    # Catch and handle specific exception if raised
                    except Exception:
                        # Placeholder statement performing no operation
                        pass
    # Catch and handle specific exception if raised
    except Exception as exc:
        # Invoke print to perform operational action
        print(f"⚠️ Error migrating attendance columns: {exc}")

# --- Initialize Scheduler ---
scheduler = BackgroundScheduler()

# Execute statement to process data and maintain state
scheduler.add_job(
    # Execute statement to process data and maintain state
    create_monthly_tables,
    # Execute statement to process data and maintain state
    'cron',
    # Set day variable to store day value
    day=25,
    # Set hour variable to store hour value
    hour=2,
    # Set kwargs variable to store kwargs value
    kwargs={'for_next_month': True},
    # Set id variable to store id value
    id="monthly_table_creator"
# Execute statement to process data and maintain state
)