# ==============================================================================
# QUICKCHEX HRMS BACKEND - MIGRATE_NOTIFICATIONS.PY
# Path: Attendance-portal/backend/app/db/migrate_notifications.py
# Purpose: Database management, migration, or lifecycle initialization module for 'migrate_notifications'.
# Primary Functions:
#   • migrate_notification_table()
# ==============================================================================

import logging
from sqlalchemy import inspect, text
from app.db.session import engine
from app.db.base import Base
from app.models.notification_model import Notification

logger = logging.getLogger("uvicorn.error")

def migrate_notification_table():
    """Ensure the notifications table exists and has all required fields."""
    inspector = inspect(engine)
    if not inspector.has_table("notifications"):
        # Create table using model metadata
        Notification.__table__.create(bind=engine, checkfirst=True)
        logger.info("Created 'notifications' table successfully.")
        return

    # Check for missing columns if table already exists
    existing = {column["name"] for column in inspector.get_columns("notifications")}
    additions = {
        "recipient_user_id": "INTEGER",
        "recipient_emp_code": "VARCHAR(50)",
        "recipient_role": "VARCHAR(50)",
        "notification_type": "VARCHAR(50) DEFAULT 'POLICY_UPDATED'",
        "title": "VARCHAR(255)",
        "message": "TEXT",
        "reference_type": "VARCHAR(50) DEFAULT 'POLICY'",
        "reference_id": "INTEGER",
        "metadata": "JSON",
        "is_read": "BOOLEAN DEFAULT 0",
        "created_at": "TIMESTAMP",
        "read_at": "TIMESTAMP",
    }
    with engine.begin() as connection:
        for column_name, column_definition in additions.items():
            if column_name not in existing:
                try:
                    connection.execute(text(
                        f"ALTER TABLE notifications ADD COLUMN {column_name} {column_definition}"
                    ))
                    logger.info(f"Added column {column_name} to 'notifications' table.")
                except Exception as e:
                    logger.warning(f"Could not add column {column_name} to 'notifications': {e}")

        # Also ensure dynamic regularization and leave tables have is_notif_read
        all_tables = inspector.get_table_names()
        dynamic_targets = [
            t for t in all_tables 
            if t.startswith("regularization") or t.startswith("leave")
        ]
        for tbl in dynamic_targets:
            tbl_cols = {c["name"] for c in inspector.get_columns(tbl)}
            if "is_notif_read" not in tbl_cols:
                try:
                    connection.execute(text(f"ALTER TABLE {tbl} ADD COLUMN is_notif_read BOOLEAN DEFAULT FALSE"))
                    logger.info(f"Added 'is_notif_read' column to '{tbl}' table.")
                except Exception as e:
                    logger.warning(f"Could not add 'is_notif_read' to '{tbl}': {e}")
