# ==============================================================================
# QUICKCHEX HRMS BACKEND - MIGRATE_WORK_LOCATIONS.PY
# Path: Attendance-portal/backend/app/db/migrate_work_locations.py
# Purpose: Database management, migration, or lifecycle initialization module for 'migrate_work_locations'.
# Primary Functions:
#   • migrate_work_location_tables()
# ==============================================================================

import sys
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
except Exception:
    pass

import json
from sqlalchemy import text
from app.db.session import engine

def migrate_work_location_tables():
    """
    Ensures client_sites, attendance_settings, and employee_work_mode_assignments
    tables exist and are seeded with dynamic defaults (NCDX, UBI, etc.).
    """
    is_sqlite = str(engine.url).startswith("sqlite")
    pk_str = "INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "SERIAL PRIMARY KEY"
    bool_str = "BOOLEAN"
    dt_str = "DATETIME DEFAULT CURRENT_TIMESTAMP" if is_sqlite else "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"

    try:
        with engine.begin() as conn:
            # 1. Create client_sites
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS client_sites (
                    id {pk_str},
                    name VARCHAR(100) UNIQUE NOT NULL,
                    client_name VARCHAR(150),
                    address TEXT,
                    latitude FLOAT NOT NULL,
                    longitude FLOAT NOT NULL,
                    allowed_radius FLOAT DEFAULT 200.0,
                    is_active {bool_str} DEFAULT 1,
                    created_at {dt_str},
                    updated_at {dt_str}
                );
            """))

            # 2. Create attendance_settings
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS attendance_settings (
                    id {pk_str},
                    office_name VARCHAR(150) DEFAULT 'LA ESFERA Head Office',
                    office_address TEXT DEFAULT 'Mumbai, Maharashtra, India',
                    office_latitude FLOAT DEFAULT 19.1324,
                    office_longitude FLOAT DEFAULT 72.9278,
                    office_radius FLOAT DEFAULT 200.0,
                    enforce_geofence {bool_str} DEFAULT 0,
                    wfh_enabled {bool_str} DEFAULT 1,
                    wfh_requires_approval {bool_str} DEFAULT 0,
                    wfh_requires_location {bool_str} DEFAULT 1,
                    wfh_requires_camera {bool_str} DEFAULT 1,
                    allowed_work_modes TEXT DEFAULT '["OFFICE","WFH","CLIENT_SITE"]',
                    updated_at {dt_str}
                );
            """))

            # 3. Create employee_work_mode_assignments
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS employee_work_mode_assignments (
                    id {pk_str},
                    emp_code VARCHAR(50) UNIQUE NOT NULL,
                    allow_office {bool_str} DEFAULT 1,
                    allow_wfh {bool_str} DEFAULT 1,
                    allow_client_site {bool_str} DEFAULT 1,
                    assigned_client_site_ids TEXT DEFAULT '[]',
                    updated_at {dt_str}
                );
            """))

            # 4. Seed default client sites if table is empty (e.g. NCDX and UBI)
            existing_count = conn.execute(text("SELECT COUNT(*) FROM client_sites;")).scalar() or 0
            if existing_count == 0:
                is_active_val = "1" if is_sqlite else "TRUE"
                conn.execute(text(f"""
                    INSERT INTO client_sites (name, client_name, address, latitude, longitude, allowed_radius, is_active)
                    VALUES 
                    ('NCDX', 'National Commodity & Derivatives Exchange', 'Kanjur Station Road, Kanjur West, S Ward, Mumbai, Maharashtra 400042', 19.132413, 72.927876, 200.0, {is_active_val}),
                    ('UBI', 'Union Bank of India', 'Nariman Point, Colaba, Mumbai, Maharashtra 400021', 18.9262, 72.8219, 200.0, {is_active_val});
                """))
                print("✅ Seeded default dynamic client sites: NCDX, UBI")

            # 5. Seed default attendance settings row if empty
            sett_count = conn.execute(text("SELECT COUNT(*) FROM attendance_settings;")).scalar() or 0
            if sett_count == 0:
                t_val = "1" if is_sqlite else "TRUE"
                f_val = "0" if is_sqlite else "FALSE"
                conn.execute(text(f"""
                    INSERT INTO attendance_settings (
                        office_name, office_address, office_latitude, office_longitude, office_radius,
                        enforce_geofence, wfh_enabled, wfh_requires_approval, wfh_requires_location,
                        wfh_requires_camera, allowed_work_modes
                    ) VALUES (
                        'LA ESFERA Head Office',
                        'Kanjurmarg West, Mumbai, Maharashtra, 400078',
                        19.1232, 72.9284, 250.0,
                        {f_val}, {t_val}, {f_val}, {t_val}, {t_val}, '["OFFICE","WFH","CLIENT_SITE"]'
                    );
                """))
                print("✅ Seeded default attendance settings")

            # 6. Ensure all attendance tables have work_mode, client_site_id, client_site_name
            new_cols = [
                ("work_mode", "VARCHAR(50) DEFAULT 'OFFICE'"),
                ("client_site_id", "INTEGER"),
                ("client_site_name", "VARCHAR(150)"),
                ("first_punch_out_time", "TIMESTAMP"),
                ("correction_status", "VARCHAR(50) DEFAULT 'NONE'")
            ]
            if is_sqlite:
                tables_res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'attendance_%'")).fetchall()
                existing_tables = [r[0] for r in tables_res]
                for tbl in existing_tables:
                    col_res = conn.execute(text(f"PRAGMA table_info({tbl})")).fetchall()
                    col_names = {c[1] for c in col_res}
                    for col_name, col_type in new_cols:
                        if col_name not in col_names:
                            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col_name} {col_type}"))
                            print(f"✅ Added {col_name} to {tbl}")
            else:
                tables_res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'attendance_%'")).fetchall()
                existing_tables = [r[0] for r in tables_res]
                for tbl in existing_tables:
                    for col_name, col_type in new_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                        except Exception:
                            pass

        print("✅ Work location tables & attendance columns successfully verified/migrated.")
    except Exception as exc:
        print(f"❌ Error migrating work location tables: {exc}")

if __name__ == "__main__":
    migrate_work_location_tables()
