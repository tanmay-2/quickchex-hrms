import sys
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
except Exception:
    pass

import datetime
from sqlalchemy import text
from apscheduler.schedulers.background import BackgroundScheduler
# Assuming your engine is defined in app.db.session
from app.db.session import engine

_VERIFIED_MONTHS = set()
_COLUMNS_MIGRATED = False

def create_monthly_tables(for_next_month=True):
    """
    Creates monthly tables for Attendance, Regularization, Daily Tasks, and Leaves.
    Cached in memory to prevent repetitive DDL execution and deadlocks.
    """
    global _COLUMNS_MIGRATED
    today = datetime.date.today()
    
    if for_next_month:
        if today.month == 12:
            target_month = 1
            target_year = today.year + 1
        else:
            target_month = today.month + 1
            target_year = today.year
    else:
        target_month = today.month
        target_year = today.year

    cache_key = f"{target_year}_{target_month:02d}"
    if cache_key in _VERIFIED_MONTHS:
        return

    month_str = f"{target_month:02d}"
    
    # Dynamic Table Names
    attendance_table = f"attendance_{target_year}_{month_str}"
    regularization_table = f"regularization_{target_year}_{month_str}"
    tasks_table = f"tasks_{target_year}_{month_str}"
    leave_table = f"leave_{target_year}_{month_str}"

    # Define Schemas based on your existing models
    schemas = {
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
            remark Text
        """,
        regularization_table: """
            id SERIAL PRIMARY KEY,
            emp_code VARCHAR(50) NOT NULL,
            target_date DATE NOT NULL,
            issued_for_in_time TIMESTAMP,
            issued_for_out_time TIMESTAMP,
            status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
            comment TEXT,
            employee_id VARCHAR(50),
            employee_name VARCHAR(150),
            manager_id VARCHAR(50),
            manager_name VARCHAR(150),
            approval_level INTEGER DEFAULT 1,
            manager_action VARCHAR(50),
            manager_comment TEXT,
            admin_action VARCHAR(50),
            admin_comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """,
        tasks_table: """
            id SERIAL PRIMARY KEY,
            emp_code VARCHAR(50) NOT NULL,
            task_date DATE NOT NULL,
            task_description TEXT NOT NULL,
            hours_spent NUMERIC(5,2),
            status VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """,
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
            status VARCHAR(20) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """
    }

    # Execute Table Creation
    try:
        is_sqlite = str(engine.url).startswith("sqlite")
        with engine.begin() as conn:
            for table_name, schema in schemas.items():
                target_schema = schema
                if is_sqlite:
                    target_schema = target_schema.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
                query = text(f"CREATE TABLE IF NOT EXISTS {table_name} ({target_schema});")
                conn.execute(query)

            # Ensure all attendance tables have GPS coordinate and accuracy columns once
            if not _COLUMNS_MIGRATED:
                _migrate_attendance_columns(conn, is_sqlite)
                _COLUMNS_MIGRATED = True

        _VERIFIED_MONTHS.add(cache_key)
        print(f"✅ Successfully verified/created tables for: {cache_key}")
    except Exception as e:
        print(f"❌ Error creating monthly tables: {e}")


def _migrate_attendance_columns(conn, is_sqlite: bool):
    """Safely adds missing coordinate columns to all attendance_YYYY_MM tables once."""
    new_cols = [
        ("punch_in_latitude", "FLOAT"),
        ("punch_in_longitude", "FLOAT"),
        ("punch_in_accuracy", "FLOAT"),
        ("punch_out_latitude", "FLOAT"),
        ("punch_out_longitude", "FLOAT"),
        ("punch_out_accuracy", "FLOAT"),
    ]

    try:
        if is_sqlite:
            tables_res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'attendance_%'")).fetchall()
            existing_tables = [r[0] for r in tables_res]
            for tbl in existing_tables:
                col_res = conn.execute(text(f"PRAGMA table_info({tbl})")).fetchall()
                col_names = {c[1] for c in col_res}
                for col_name, col_type in new_cols:
                    if col_name not in col_names:
                        conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col_name} {col_type}"))
        else:
            tables_res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'attendance_%'")).fetchall()
            existing_tables = [r[0] for r in tables_res]
            for tbl in existing_tables:
                for col_name, col_type in new_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                    except Exception:
                        pass
    except Exception as exc:
        print(f"⚠️ Error migrating attendance columns: {exc}")

# --- Initialize Scheduler ---
scheduler = BackgroundScheduler()

# This job ensures the "Next Month" tables exist before the month starts
scheduler.add_job(
    create_monthly_tables,
    'cron',
    day=25,
    hour=2,
    kwargs={'for_next_month': True},
    id="monthly_table_creator"
)