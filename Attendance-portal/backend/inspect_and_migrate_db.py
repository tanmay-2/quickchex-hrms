"""
Database schema alignment and migration script for PostgreSQL.
Ensures all columns defined in SQLAlchemy models exist in PostgreSQL tables.
"""

from app.db.session import engine
from sqlalchemy import text

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
    with engine.begin() as conn:
        for table, cols in REQUIRED_COLUMNS.items():
            print(f"Checking table: {table}")
            res = conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = :t"
            ), {"t": table})
            existing_cols = {r[0] for r in res.fetchall()}
            print(f"Existing columns in {table}: {len(existing_cols)}")
            
            for col_name, col_type in cols:
                if col_name not in existing_cols:
                    print(f"Adding missing column {col_name} ({col_type}) to {table}...")
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                    print(f"Added {col_name} to {table}.")
                else:
                    print(f"Column {col_name} already exists in {table}.")

if __name__ == "__main__":
    migrate()
    print("Migration complete.")
