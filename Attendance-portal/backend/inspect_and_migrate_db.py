# ==============================================================================
# QUICKCHEX HRMS BACKEND - DATABASE SCHEMA INSPECTION & MIGRATION SCRIPT
# Path: Attendance-portal/backend/inspect_and_migrate_db.py
# Description: Connects to PostgreSQL, checks for missing table columns against
# SQLAlchemy model definitions, and safely runs ALTER TABLE ADD COLUMN statements.
# ==============================================================================

from app.db.session import engine
from sqlalchemy import text

# Dictionary of required columns for each PostgreSQL database table
REQUIRED_COLUMNS = {
    "leave_requests": [
        ("overall_status", "VARCHAR DEFAULT 'PENDING_MANAGER'"),
        ("manager_status", "VARCHAR DEFAULT 'PENDING'"),
        ("admin_status", "VARCHAR DEFAULT 'PENDING'"),
        ("manager_reviewed_by", "VARCHAR"),
        ("manager_reviewed_at", "TIMESTAMP"),
        ("manager_comment", "VARCHAR"),
        ("manager_rejection_reason", "VARCHAR"),
        ("admin_reviewed_by", "VARCHAR"),
        ("admin_reviewed_at", "TIMESTAMP"),
        ("admin_comment", "VARCHAR"),
        ("admin_rejection_reason", "VARCHAR"),
        ("submitted_at", "TIMESTAMP"),
        ("employee_name", "VARCHAR"),
        ("manager_id", "VARCHAR"),
        ("manager_name", "VARCHAR"),
        ("approval_level", "INTEGER DEFAULT 1"),
    ],
    "profile_master": [
        ("about", "TEXT DEFAULT ''"),
    ]
}

def migrate():
    """
    Connects to database, queries information_schema.columns to check existing columns,
    and applies ALTER TABLE ADD COLUMN IF NOT EXISTS for any missing fields.
    """
    # Open transactional connection using SQLAlchemy engine
    with engine.begin() as conn:
        for table, cols in REQUIRED_COLUMNS.items():
            print(f"Checking table: {table}")
            
            # Step 1: Query existing column names from PostgreSQL information schema
            res = conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = :t"
            ), {"t": table})
            existing_cols = {r[0] for r in res.fetchall()}
            print(f"Existing columns in {table}: {len(existing_cols)}")
            
            # Step 2: Compare against required columns list
            for col_name, col_type in cols:
                if col_name not in existing_cols:
                    print(f"Adding missing column {col_name} ({col_type}) to {table}...")
                    # Step 3: Add the missing column safely without dropping any data
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                    print(f"Added {col_name} to {table}.")
                else:
                    print(f"Column {col_name} already exists in {table}.")

if __name__ == "__main__":
    # Execute database migration directly when script is run from terminal
    migrate()
    print("Migration complete.")
