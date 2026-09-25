import sys
import os
import sqlite3
import datetime
from sqlalchemy import text, inspect

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine, DATABASE_URL
from app.db.init_db import init_db
from app.db.table_manager import create_monthly_tables
from app.db.seed import seed_data

def migrate():
    print(f"🚀 Connecting to PostgreSQL at: {DATABASE_URL}")
    
    # 1. Initialize core tables
    print("📦 Creating all core SQLAlchemy tables...")
    init_db()
    print("✅ Core tables created/verified.")

    # 2. Create monthly dynamic tables for this month and next month
    print("📦 Creating dynamic monthly tables...")
    create_monthly_tables(for_next_month=False)
    create_monthly_tables(for_next_month=True)
    
    # Also ensure 2026_08 exists if sqlite had it
    with engine.begin() as conn:
        for month_str in ["08", "09", "10"]:
            att_tbl = f"attendance_2026_{month_str}"
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS {att_tbl} (
                    id SERIAL PRIMARY KEY,
                    emp_code VARCHAR(50) NOT NULL,
                    date DATE NOT NULL,
                    punch_in_time TIMESTAMP,
                    punch_out_time TIMESTAMP,
                    punch_in_location TEXT,
                    punch_out_location TEXT,
                    punch_in_image TEXT,
                    punch_out_image TEXT,
                    hours_completed FLOAT,
                    status VARCHAR(20),
                    remark TEXT
                )
            """))
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS regularization_2026_{month_str} (
                    id SERIAL PRIMARY KEY,
                    emp_code VARCHAR(50) NOT NULL,
                    target_date DATE NOT NULL,
                    issued_for_in_time TIMESTAMP,
                    issued_for_out_time TIMESTAMP,
                    status VARCHAR(20) DEFAULT 'Pending',
                    comment TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS tasks_2026_{month_str} (
                    id SERIAL PRIMARY KEY,
                    emp_code VARCHAR(50) NOT NULL,
                    task_date DATE NOT NULL,
                    task_description TEXT NOT NULL,
                    hours_spent NUMERIC(5,2),
                    status VARCHAR(20),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS leave_2026_{month_str} (
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
                )
            """))
    print("✅ Dynamic monthly tables verified.")

    # 3. Read SQLite and migrate data
    sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "attendance.db")
    if not os.path.exists(sqlite_path):
        print(f"⚠️ SQLite file not found at {sqlite_path}")
        return

    print(f"📂 Reading data from SQLite: {sqlite_path}")
    s_conn = sqlite3.connect(sqlite_path)
    s_conn.row_factory = sqlite3.Row
    s_cur = s_conn.cursor()

    s_cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    sqlite_tables = [r[0] for r in s_cur.fetchall() if r[0] != "sqlite_sequence"]

    inspector = inspect(engine)
    pg_tables = set(inspector.get_table_names())

    with engine.begin() as pg_conn:
        for tbl in sqlite_tables:
            if tbl not in pg_tables:
                print(f"⏩ Skipping {tbl} (not in PostgreSQL schema)")
                continue

            s_cur.execute(f'SELECT count(*) FROM "{tbl}"')
            count = s_cur.fetchone()[0]
            if count == 0:
                continue

            print(f"🚚 Migrating table '{tbl}' ({count} rows)...")
            s_cur.execute(f'SELECT * FROM "{tbl}"')
            rows = s_cur.fetchall()

            # Get PostgreSQL columns for this table
            pg_cols = {col["name"]: col for col in inspector.get_columns(tbl)}

            inserted = 0
            for row in rows:
                data = dict(row)
                
                # Filter keys to only those present in PostgreSQL table
                filtered = {}
                for k, v in data.items():
                    if k in pg_cols:
                        # Handle boolean conversions from SQLite (1/0)
                        col_type = str(pg_cols[k]["type"]).upper()
                        if "BOOL" in col_type and v is not None:
                            filtered[k] = bool(v)
                        # Handle date/timestamp conversions
                        elif ("DATE" in col_type or "TIME" in col_type) and isinstance(v, str) and v.strip():
                            filtered[k] = v.strip()
                        elif v == "":
                            filtered[k] = None
                        else:
                            filtered[k] = v

                # If id is None, omit it so PostgreSQL auto-generates serial id
                if "id" in filtered and filtered["id"] is None:
                    del filtered["id"]

                # Build INSERT statement
                cols_str = ", ".join(filtered.keys())
                vals_str = ", ".join([f":{k}" for k in filtered.keys()])

                # Conflict target depends on table
                if tbl == "profile_master":
                    conflict_clause = "ON CONFLICT (emp_code) DO NOTHING"
                elif "id" in filtered and filtered["id"] is not None:
                    conflict_clause = "ON CONFLICT (id) DO NOTHING"
                else:
                    conflict_clause = ""

                stmt = text(f"INSERT INTO {tbl} ({cols_str}) VALUES ({vals_str}) {conflict_clause}")
                res = pg_conn.execute(stmt, filtered)
                inserted += res.rowcount if hasattr(res, "rowcount") else 1

            print(f"   -> Inserted {inserted} rows into '{tbl}'.")

            # Fix sequence for tables with serial primary key
            if "id" in pg_cols:
                try:
                    pg_conn.execute(text(f"""
                        SELECT setval(
                            pg_get_serial_sequence('{tbl}', 'id'),
                            COALESCE((SELECT MAX(id) FROM {tbl}), 1)
                        );
                    """))
                except Exception as seq_err:
                    pass

    s_conn.close()

    # 4. Run seed_data to ensure seed users and default passwords exist
    print("🌱 Running seed_data() verification...")
    seed_data()
    print("✅ Seed verified.")

    # 5. Print summary
    print("\n📊 Migration Summary - PostgreSQL Tables in 'hrms_db':")
    with engine.connect() as conn:
        inspector = inspect(engine)
        for tbl in sorted(inspector.get_table_names()):
            cnt = conn.execute(text(f"SELECT count(*) FROM {tbl}")).scalar()
            print(f"   - {tbl:<30}: {cnt} rows")

    print("\n🎉 Database migration complete! Connected successfully to PostgreSQL 'hrms_db'.")

if __name__ == "__main__":
    migrate()
