# ==============================================================================
# QUICKCHEX HRMS BACKEND - NOTIFICATION_SERVICE.PY
# Path: Attendance-portal/backend/app/services/notification_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'notification_service'.
# Classes / Data Models:
#   • NotificationService
# Primary Functions:
#   • is_active_profile()
# ==============================================================================

# Import module logging for system functionality
import logging
# Import datetime, timedelta from datetime for module operations
from datetime import datetime, timedelta
# Import List, Optional from typing for module operations
from typing import List, Optional
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import func, or_ from sqlalchemy for module operations
from sqlalchemy import func, or_

# Import Notification from app.models.notification_model for module operations
from app.models.notification_model import Notification
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import Policy from app.models.policy_model for module operations
from app.models.policy_model import Policy

# Set logger variable to store logger value
logger = logging.getLogger("uvicorn.error")

# Define is_active_profile function to handle is active profile
def is_active_profile(profile: Profile) -> bool:
    """Check if profile belongs to an active employee/manager."""
    if not profile:
        # Return computed result or response payload to caller
        return False
    # Set status variable to store status value
    status = (profile.employment_status or "").strip().lower()
    # Check if target condition is false or object is missing
    if not status:
        return True  # Null/empty is considered Active by default
    # Evaluate condition to control execution branch
    if status in ("inactive", "terminated", "resigned", "archived", "disabled", "suspended"):
        # Return computed result or response payload to caller
        return False
    # Evaluate condition to control execution branch
    if "inactive" in status or "terminated" in status or "resigned" in status:
        # Return computed result or response payload to caller
        return False
    # Return computed result or response payload to caller
    return True

# Define class NotificationService to encapsulate data and behavior
class NotificationService:

    # Apply decorator to wrap function behavior
    @staticmethod
    # Define create_policy_update_notifications function to handle create policy update notifications
    def create_policy_update_notifications(
        # Define db schema field with type Session,
        db: Session,
        # Define policy schema field with type Policy,
        policy: Policy,
        # Define old_version schema field with type Optional[str] and default value
        old_version: Optional[str] = None
    # Execute statement to process data and maintain state
    ) -> List[Notification]:
        """
        Creates individual policy update notifications for all active Managers and Employees.
        Includes duplicate protection against rapid re-submissions or double clicks.
        """
        if not policy:
            # Return computed result or response payload to caller
            return []

        # Set version variable to store version value
        version = policy.version_number or "1.0"
        # Set policy_name variable to store policy name value
        policy_name = policy.name or "Company Policy"
        # Set updated_date_str variable to store updated date str value
        updated_date_str = policy.updated_date or datetime.utcnow().strftime("%d-%m-%Y")

        # 1. Duplicate protection check (within 60s for identical policy and version)
        recent_cutoff = datetime.utcnow() - timedelta(seconds=60)
        # Initiate database query on specified model
        recent_exist = db.query(Notification).filter(
            # Specify parameter value for Notification.reference_type
            Notification.reference_type == "POLICY",
            # Specify parameter value for Notification.reference_id
            Notification.reference_id == policy.id,
            # Execute statement to process data and maintain state
            Notification.created_at >= recent_cutoff
        # Execute statement to process data and maintain state
        ).first()

        # Evaluate condition to control execution branch
        if recent_exist and recent_exist.notif_metadata:
            # Set existing_ver variable to store existing ver value
            existing_ver = str(recent_exist.notif_metadata.get("version_number", "")).strip()
            # Evaluate condition to control execution branch
            if existing_ver == str(version).strip():
                # Log informational message for system observability
                logger.info(f"Duplicate policy update notification prevented for policy {policy.id} v{version}")
                # Return computed result or response payload to caller
                return []

        # 2. Fetch all active managers and employees
        potential_recipients = db.query(Profile).filter(
            # Invoke func.lower to perform operational action
            func.lower(Profile.role).in_(["manager", "employee"])
        # Execute statement to process data and maintain state
        ).all()

        # Set active_recipients variable to store active recipients value
        active_recipients = [p for p in potential_recipients if is_active_profile(p)]
        # Check if target condition is false or object is missing
        if not active_recipients:
            # Log informational message for system observability
            logger.info("No active managers or employees found for policy notification.")
            # Return computed result or response payload to caller
            return []

        # Set title variable to store title value
        title = "Company Policy Updated"
        # Set message variable to store message value
        message = f'The company policy "{policy_name}" has been updated. Please review the latest version.'
        # Set metadata variable to store metadata value
        metadata = {
            # Execute statement to process data and maintain state
            "policy_id": policy.id,
            # Execute statement to process data and maintain state
            "policy_name": policy_name,
            # Execute statement to process data and maintain state
            "category": policy.category or "General",
            # Execute statement to process data and maintain state
            "version_number": version,
            # Execute statement to process data and maintain state
            "updated_date": updated_date_str,
        # Execute statement to process data and maintain state
        }

        # Set created_notifs variable to store created notifs value
        created_notifs = []
        # Begin guarded execution block to trap exceptions
        try:
            # Iterate through items in sequence loop
            for recipient in active_recipients:
                # Set notif variable to store notif value
                notif = Notification(
                    # Set recipient_user_id variable to store recipient user id value
                    recipient_user_id=recipient.id,
                    # Set recipient_emp_code variable to store recipient emp code value
                    recipient_emp_code=recipient.emp_code,
                    # Set recipient_role variable to store recipient role value
                    recipient_role=recipient.role.lower() if recipient.role else "employee",
                    # Set notification_type variable to store notification type value
                    notification_type="POLICY_UPDATED",
                    # Set title variable to store title value
                    title=title,
                    # Set message variable to store message value
                    message=message,
                    # Set reference_type variable to store reference type value
                    reference_type="POLICY",
                    # Set reference_id variable to store reference id value
                    reference_id=policy.id,
                    # Set notif_metadata variable to store notif metadata value
                    notif_metadata=metadata,
                    # Set is_read variable to store is read value
                    is_read=False,
                    # Set created_at variable to store created at value
                    created_at=datetime.utcnow(),
                # Execute statement to process data and maintain state
                )
                # Stage new entity instance into database session
                db.add(notif)
                # Invoke created_notifs.append to perform operational action
                created_notifs.append(notif)

            # Commit transaction to persist changes in database
            db.commit()
            # Iterate through items in sequence loop
            for n in created_notifs:
                # Refresh instance state with updated database values
                db.refresh(n)
            # Log informational message for system observability
            logger.info(f"Created {len(created_notifs)} policy update notifications for policy '{policy_name}' (v{version}).")
            # Return computed result or response payload to caller
            return created_notifs
        # Catch and handle specific exception if raised
        except Exception as e:
            # Roll back transaction to revert changes on failure
            db.rollback()
            # Log error message with failure diagnostic details
            logger.error(f"Error creating policy update notifications: {e}")
            # Return computed result or response payload to caller
            return []

    # Apply decorator to wrap function behavior
    @staticmethod
    # Define get_policy_notifications_for_user function to handle get policy notifications for user
    def get_policy_notifications_for_user(db: Session, emp_code: str) -> List[dict]:
        """Fetch all policy notifications for a given employee code."""
        try:
            # Initiate database query on specified model
            notifs = db.query(Notification).filter(
                # Execute statement to process data and maintain state
                Notification.recipient_emp_code == emp_code
            # Execute statement to process data and maintain state
            ).order_by(Notification.created_at.desc()).all()
            # Return computed result or response payload to caller
            return [n.to_dict() for n in notifs]
        # Catch and handle specific exception if raised
        except Exception as e:
            # Roll back transaction to revert changes on failure
            db.rollback()
            # Log error message with failure diagnostic details
            logger.error(f"Error fetching policy notifications for {emp_code}: {e}", exc_info=True)
            # Return computed result or response payload to caller
            return []
