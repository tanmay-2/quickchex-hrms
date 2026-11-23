# ==============================================================================
# QUICKCHEX HRMS BACKEND - NOTIFICATION_MODEL.PY
# Path: Attendance-portal/backend/app/models/notification_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'notification_model'.
# Classes / Data Models:
#   • Notification
# ==============================================================================

# Import Column, Integer, String, Text, Boolean, DateTime, JSON from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
# Import datetime from datetime for module operations
from datetime import datetime
# Import Base from app.db.base for module operations
from app.db.base import Base

# Define class Notification inheriting from Base
class Notification(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "notifications"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for recipient user id
    recipient_user_id = Column(Integer, nullable=True, index=True)
    # Define database column schema mapping for recipient emp code
    recipient_emp_code = Column(String(50), nullable=False, index=True)
    # Define database column schema mapping for recipient role
    recipient_role = Column(String(50), nullable=False)
    # Define database column schema mapping for notification type
    notification_type = Column(String(50), nullable=False, default="POLICY_UPDATED", index=True)
    # Define database column schema mapping for title
    title = Column(String(255), nullable=False)
    # Define database column schema mapping for message
    message = Column(Text, nullable=False)
    # Define database column schema mapping for reference type
    reference_type = Column(String(50), nullable=False, default="POLICY")
    # Define database column schema mapping for reference id
    reference_id = Column(Integer, nullable=False, index=True)
    # Define database column schema mapping for notif metadata
    notif_metadata = Column("metadata", JSON, nullable=True)
    # Define database column schema mapping for is read
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    # Define database column schema mapping for created at
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    # Define database column schema mapping for read at
    read_at = Column(DateTime, nullable=True)

    # Define to_dict function to handle to dict
    def to_dict(self):
        # Set meta variable to store meta value
        meta = self.notif_metadata if isinstance(self.notif_metadata, dict) else {}
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "id": f"policy_{self.id}",
            # Execute statement to process data and maintain state
            "db_id": self.id,
            # Execute statement to process data and maintain state
            "recipient_user_id": self.recipient_user_id,
            # Execute statement to process data and maintain state
            "recipient_emp_code": self.recipient_emp_code,
            # Execute statement to process data and maintain state
            "recipient_role": self.recipient_role,
            # Execute statement to process data and maintain state
            "notification_type": self.notification_type,
            # Execute statement to process data and maintain state
            "type": "info",
            # Execute statement to process data and maintain state
            "title": self.title,
            # Execute statement to process data and maintain state
            "message": self.message,
            # Execute statement to process data and maintain state
            "reference_type": self.reference_type,
            # Execute statement to process data and maintain state
            "reference_id": self.reference_id,
            # Execute statement to process data and maintain state
            "policy_id": self.reference_id,
            # Execute statement to process data and maintain state
            "policy_name": meta.get("policy_name") or meta.get("name", ""),
            # Execute statement to process data and maintain state
            "category": meta.get("category", "General"),
            # Execute statement to process data and maintain state
            "version_number": meta.get("version_number", "1.0"),
            # Execute statement to process data and maintain state
            "version": meta.get("version_number", "1.0"),
            # Execute statement to process data and maintain state
            "updated_date": meta.get("updated_date", ""),
            # Execute statement to process data and maintain state
            "metadata": meta,
            # Execute statement to process data and maintain state
            "is_read": self.is_read,
            # Execute statement to process data and maintain state
            "read": self.is_read,
            # Execute statement to process data and maintain state
            "unread": not self.is_read,
            # Execute statement to process data and maintain state
            "created_at": self.created_at.isoformat() if self.created_at else datetime.utcnow().isoformat(),
            # Execute statement to process data and maintain state
            "read_at": self.read_at.isoformat() if self.read_at else None,
        # Execute statement to process data and maintain state
        }
