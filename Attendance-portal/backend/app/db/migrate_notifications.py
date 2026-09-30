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
