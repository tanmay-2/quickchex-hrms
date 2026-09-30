import logging
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.models.notification_model import Notification
from app.models.profile_model import Profile
from app.models.policy_model import Policy

logger = logging.getLogger("uvicorn.error")

def is_active_profile(profile: Profile) -> bool:
    """Check if profile belongs to an active employee/manager."""
    if not profile:
        return False
    status = (profile.employment_status or "").strip().lower()
    if not status:
        return True  # Null/empty is considered Active by default
    if status in ("inactive", "terminated", "resigned", "archived", "disabled", "suspended"):
        return False
    if "inactive" in status or "terminated" in status or "resigned" in status:
        return False
    return True

class NotificationService:

    @staticmethod
    def create_policy_update_notifications(
        db: Session,
        policy: Policy,
        old_version: Optional[str] = None
    ) -> List[Notification]:
        """
        Creates individual policy update notifications for all active Managers and Employees.
        Includes duplicate protection against rapid re-submissions or double clicks.
        """
        if not policy:
            return []

        version = policy.version_number or "1.0"
        policy_name = policy.name or "Company Policy"
        updated_date_str = policy.updated_date or datetime.utcnow().strftime("%d-%m-%Y")

        # 1. Duplicate protection check (within 60s for identical policy and version)
        recent_cutoff = datetime.utcnow() - timedelta(seconds=60)
        recent_exist = db.query(Notification).filter(
            Notification.reference_type == "POLICY",
            Notification.reference_id == policy.id,
            Notification.created_at >= recent_cutoff
        ).first()

        if recent_exist and recent_exist.notif_metadata:
            existing_ver = str(recent_exist.notif_metadata.get("version_number", "")).strip()
            if existing_ver == str(version).strip():
                logger.info(f"Duplicate policy update notification prevented for policy {policy.id} v{version}")
                return []

        # 2. Fetch all active managers and employees
        potential_recipients = db.query(Profile).filter(
            func.lower(Profile.role).in_(["manager", "employee"])
        ).all()

        active_recipients = [p for p in potential_recipients if is_active_profile(p)]
        if not active_recipients:
            logger.info("No active managers or employees found for policy notification.")
            return []

        title = "Company Policy Updated"
        message = f'The company policy "{policy_name}" has been updated. Please review the latest version.'
        metadata = {
            "policy_id": policy.id,
            "policy_name": policy_name,
            "category": policy.category or "General",
            "version_number": version,
            "updated_date": updated_date_str,
        }

        created_notifs = []
        try:
            for recipient in active_recipients:
                notif = Notification(
                    recipient_user_id=recipient.id,
                    recipient_emp_code=recipient.emp_code,
                    recipient_role=recipient.role.lower() if recipient.role else "employee",
                    notification_type="POLICY_UPDATED",
                    title=title,
                    message=message,
                    reference_type="POLICY",
                    reference_id=policy.id,
                    notif_metadata=metadata,
                    is_read=False,
                    created_at=datetime.utcnow(),
                )
                db.add(notif)
                created_notifs.append(notif)

            db.commit()
            for n in created_notifs:
                db.refresh(n)
            logger.info(f"Created {len(created_notifs)} policy update notifications for policy '{policy_name}' (v{version}).")
            return created_notifs
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating policy update notifications: {e}")
            return []

    @staticmethod
    def get_policy_notifications_for_user(db: Session, emp_code: str) -> List[dict]:
        """Fetch all policy notifications for a given employee code."""
        try:
            notifs = db.query(Notification).filter(
                Notification.recipient_emp_code == emp_code
            ).order_by(Notification.created_at.desc()).all()
            return [n.to_dict() for n in notifs]
        except Exception as e:
            db.rollback()
            logger.error(f"Error fetching policy notifications for {emp_code}: {e}", exc_info=True)
            return []
