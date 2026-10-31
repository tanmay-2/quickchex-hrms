# ==============================================================================
# QUICKCHEX HRMS BACKEND - MIGRATE_POLICY_METADATA.PY
# Path: Attendance-portal/backend/app/db/migrate_policy_metadata.py
# Purpose: Database management, migration, or lifecycle initialization module for 'migrate_policy_metadata'.
# Primary Functions:
#   • migrate_policy_metadata()
# ==============================================================================

from sqlalchemy import inspect, text

from app.db.session import engine


def migrate_policy_metadata():
    """Add the policy fields used by the live portal to existing databases."""
    inspector = inspect(engine)
    if not inspector.has_table("policies"):
        return

    existing = {column["name"] for column in inspector.get_columns("policies")}
    additions = {
        "category": "VARCHAR(100) NOT NULL DEFAULT 'General'",
        "publish_date": "VARCHAR(20)",
        "updated_date": "VARCHAR(20)",
        "version_number": "VARCHAR(30) NOT NULL DEFAULT '1.0'",
        "status": "VARCHAR(30) NOT NULL DEFAULT 'Published'",
    }
    with engine.begin() as connection:
        for column_name, column_definition in additions.items():
            if column_name not in existing:
                connection.execute(text(
                    f"ALTER TABLE policies ADD COLUMN {column_name} {column_definition}"
                ))
