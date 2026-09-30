import sqlite3
import datetime
from sqlalchemy import text
from app.db.session import engine

APPROVAL_COLUMNS = [
    ("overall_status", "VARCHAR(50) DEFAULT 'PENDING_MANAGER'"),
    ("manager_status", "VARCHAR(50) DEFAULT 'PENDING'"),
    ("admin_status", "VARCHAR(50) DEFAULT 'PENDING'"),
    ("manager_reviewed_by", "VARCHAR(150)"),
    ("manager_reviewed_at", "TIMESTAMP"),
    ("manager_comment", "TEXT"),
    ("manager_rejection_reason", "TEXT"),
    ("admin_reviewed_by", "VARCHAR(150)"),
    ("admin_reviewed_at", "TIMESTAMP"),
    ("admin_comment", "TEXT"),
    ("admin_rejection_reason", "TEXT"),
    ("submitted_at", "TIMESTAMP"),
    ("employee_name", "VARCHAR(150)"),
    ("manager_id", "VARCHAR(50)"),
    ("manager_name", "VARCHAR(150)"),
    ("approval_level", "INTEGER DEFAULT 1"),
]

def migrate_all_approval_tables():
    is_sqlite = str(engine.url).startswith("sqlite")
    print(f"Running approval columns migration on {'SQLite' if is_sqlite else 'PostgreSQL'}...")
    
    with engine.begin() as conn:
        if is_sqlite:
            tables_res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
            all_tables = [r[0] for r in tables_res]
        else:
            tables_res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
            all_tables = [r[0] for r in tables_res]

        target_tables = [
            t for t in all_tables
            if t in ("leave_requests", "regularizations") or t.startswith("leave_20") or t.startswith("regularization_20")
        ]

        print(f"Target tables found: {target_tables}")

        for tbl in target_tables:
            if is_sqlite:
                col_res = conn.execute(text(f"PRAGMA table_info({tbl})")).fetchall()
                col_names = {c[1] for c in col_res}
                for col_name, col_type in APPROVAL_COLUMNS:
                    if col_name not in col_names:
                        try:
                            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col_name} {col_type}"))
                            print(f"  + Added {col_name} to {tbl}")
                        except Exception as e:
                            print(f"  ! Error adding {col_name} to {tbl}: {e}")
            else:
                for col_name, col_type in APPROVAL_COLUMNS:
                    try:
                        conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                        print(f"  + Added/verified {col_name} in {tbl}")
                    except Exception as e:
                        print(f"  ! Error adding {col_name} to {tbl}: {e}")

        # Ensure employee_name, manager_id, manager_name are populated for existing rows
        for tbl in target_tables:
            try:
                # Update employee names from profile_master if missing
                conn.execute(text(f"""
                    UPDATE {tbl}
                    SET employee_name = (
                        SELECT COALESCE(NULLIF(TRIM(p.first_name || ' ' || COALESCE(p.last_name, '')), ''), {tbl}.emp_code)
                        FROM profile_master p WHERE p.emp_code = {tbl}.emp_code
                    )
                    WHERE employee_name IS NULL OR employee_name = '';
                """))

                # Update manager_id and manager_name from profile_master if missing
                conn.execute(text(f"""
                    UPDATE {tbl}
                    SET manager_id = (
                        SELECT p.reporting_supervisor FROM profile_master p WHERE p.emp_code = {tbl}.emp_code
                    )
                    WHERE manager_id IS NULL OR manager_id = '';
                """))
                conn.execute(text(f"""
                    UPDATE {tbl}
                    SET manager_name = (
                        SELECT COALESCE(NULLIF(TRIM(m.first_name || ' ' || COALESCE(m.last_name, '')), ''), {tbl}.manager_id)
                        FROM profile_master m WHERE m.emp_code = {tbl}.manager_id
                    )
                    WHERE manager_name IS NULL OR manager_name = '';
                """))

                # Backfill submitted_at
                try:
                    conn.execute(text(f"""
                        UPDATE {tbl}
                        SET submitted_at = CURRENT_TIMESTAMP
                        WHERE submitted_at IS NULL;
                    """))
                except Exception:
                    pass

                # Normalize statuses
                # 1. Approved -> APPROVED
                conn.execute(text(f"""
                    UPDATE {tbl}
                    SET overall_status = 'APPROVED',
                        manager_status = 'APPROVED',
                        admin_status = 'APPROVED'
                    WHERE UPPER(status) IN ('APPROVED', 'COMPLETED')
                      AND (overall_status IS NULL OR overall_status = 'PENDING_MANAGER');
                """))

                # 2. Rejected -> REJECTED
                conn.execute(text(f"""
                    UPDATE {tbl}
                    SET overall_status = 'REJECTED'
                    WHERE UPPER(status) LIKE '%REJECT%'
                      AND (overall_status IS NULL OR overall_status = 'PENDING_MANAGER');
                """))

                # 3. Pending admin
                conn.execute(text(f"""
                    UPDATE {tbl}
                    SET overall_status = 'PENDING_ADMIN',
                        manager_status = 'APPROVED',
                        admin_status = 'PENDING'
                    WHERE UPPER(status) IN ('PENDING_ADMIN', 'APPROVED_BY_MANAGER')
                      AND (overall_status IS NULL OR overall_status = 'PENDING_MANAGER');
                """))

                # 4. Default pending manager
                conn.execute(text(f"""
                    UPDATE {tbl}
                    SET overall_status = 'PENDING_MANAGER',
                        manager_status = 'PENDING',
                        admin_status = 'PENDING'
                    WHERE overall_status IS NULL OR overall_status = '';
                """))
            except Exception as e:
                print(f"Notice on data sync for {tbl}: {e}")

    print("Approval columns migration complete.")

if __name__ == "__main__":
    migrate_all_approval_tables()
