from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from datetime import datetime
from app.db.base import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_user_id = Column(Integer, nullable=True, index=True)
    recipient_emp_code = Column(String(50), nullable=False, index=True)
    recipient_role = Column(String(50), nullable=False)
    notification_type = Column(String(50), nullable=False, default="POLICY_UPDATED", index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    reference_type = Column(String(50), nullable=False, default="POLICY")
    reference_id = Column(Integer, nullable=False, index=True)
    notif_metadata = Column("metadata", JSON, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)

    def to_dict(self):
        meta = self.notif_metadata if isinstance(self.notif_metadata, dict) else {}
        return {
            "id": f"policy_{self.id}",
            "db_id": self.id,
            "recipient_user_id": self.recipient_user_id,
            "recipient_emp_code": self.recipient_emp_code,
            "recipient_role": self.recipient_role,
            "notification_type": self.notification_type,
            "type": "info",
            "title": self.title,
            "message": self.message,
            "reference_type": self.reference_type,
            "reference_id": self.reference_id,
            "policy_id": self.reference_id,
            "policy_name": meta.get("policy_name") or meta.get("name", ""),
            "category": meta.get("category", "General"),
            "version_number": meta.get("version_number", "1.0"),
            "version": meta.get("version_number", "1.0"),
            "updated_date": meta.get("updated_date", ""),
            "metadata": meta,
            "is_read": self.is_read,
            "read": self.is_read,
            "unread": not self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else datetime.utcnow().isoformat(),
            "read_at": self.read_at.isoformat() if self.read_at else None,
        }
