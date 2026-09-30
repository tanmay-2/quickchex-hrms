"""
Reset and Freshly Initialize Quickchex HRMS PostgreSQL Database
Drops all old tables in public schema and freshly re-creates tables and initial seed.
"""

import sys
import os

backend_root = os.path.dirname(os.path.abspath(__file__))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

import psycopg2
from app.db.session import DATABASE_URL, engine
from sqlalchemy import text
from app.db.init_db import init_db
from app.db.table_manager import create_monthly_tables
from app.db.seed import seed_data
from inspect_and_migrate_db import migrate

def reset_db():
    print(f"Connecting to database: {DATABASE_URL}")

    # 1. Drop all tables in public schema cleanly
    with engine.begin() as conn:
        print("Dropping all existing tables in public schema...")
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        print("Old tables and schema dropped completely.")

    # 2. Re-create all declarative tables
    print("Re-creating all models and tables via init_db()...")
    init_db()
    print("Base tables created.")

    # 3. Create monthly attendance dynamic tables (attendance_2026_09, etc.)
    print("Creating monthly attendance tables...")
    create_monthly_tables(for_next_month=False)
    create_monthly_tables(for_next_month=True)
    print("Monthly tables created.")

    # 4. Run schema alignment to ensure all columns (about, two-level leave workflow, etc.) are present
    print("Running schema column migrations...")
    migrate()
    print("Migrations complete.")

    # 5. Seed initial clean required role accounts (Admin, Manager, Employee)
    print("Seeding fresh default accounts...")
    seed_data()
    print("Seeding complete.")

    # 6. Verify table list in PostgreSQL
    with engine.connect() as conn:
        res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"))
        tables = [r[0] for r in res.fetchall()]
        print("Fresh tables in hrms_db:")
        for t in tables:
            print(" -", t)

if __name__ == "__main__":
    reset_db()
    print("\nDatabase reset and fresh initialization finished successfully!")
