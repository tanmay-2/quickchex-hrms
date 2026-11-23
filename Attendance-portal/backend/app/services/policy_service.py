# ==============================================================================
# QUICKCHEX HRMS BACKEND - POLICY_SERVICE.PY
# Path: Attendance-portal/backend/app/services/policy_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'policy_service'.
# Classes / Data Models:
#   • PolicyService
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import Policy from app.models.policy_model for module operations
from app.models.policy_model import Policy
# Import module datetime for system functionality
import datetime
# Import module os for system functionality
import os

# Define class PolicyService to encapsulate data and behavior
class PolicyService:
    
    # Apply decorator to wrap function behavior
    @staticmethod
    # Define get_all_policies function to handle get all policies
    def get_all_policies(db: Session):
        """Combines Repo logic (query) and Service logic (returning data)"""
        return db.query(Policy).all()

    # Apply decorator to wrap function behavior
    @staticmethod
    # Define create_policy function to handle create policy
    def create_policy(
        # Define db schema field with type Session, name: str, dept: str, desc: str, file_name: str,
        db: Session, name: str, dept: str, desc: str, file_name: str,
        # Define category schema field with type str and default value
        category: str = "General", publish_date: str = None,
        # Define updated_date schema field with type str and default value
        updated_date: str = None, version_number: str = "1.0", status: str = "Published",
    # Execute statement to process data and maintain state
    ):
        # We store the relative path using forward slashes: "uploads/policies/filename.pdf"
        relative_path = f"uploads/policies/{file_name}"
        
        # Set db_policy variable to store db policy value
        db_policy = Policy(
            # Set name variable to store name value
            name=name,
            # Set department variable to store department value
            department=dept,
            # Set description variable to store description value
            description=desc,
            file_path=relative_path, # This matches app.mount
            # Set created_date variable to store created date value
            created_date=datetime.date.today(),
            # Set category variable to store category value
            category=category,
            # Set publish_date variable to store publish date value
            publish_date=publish_date or None,
            # Set updated_date variable to store updated date value
            updated_date=updated_date or None,
            # Set version_number variable to store version number value
            version_number=version_number,
            # Set status variable to store status value
            status=status,
        # Execute statement to process data and maintain state
        )
        # Stage new entity instance into database session
        db.add(db_policy)
        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(db_policy)
        # Return computed result or response payload to caller
        return db_policy

    # Apply decorator to wrap function behavior
    @staticmethod
    # Define delete_policy function to handle delete policy
    def delete_policy(db: Session, policy_id: int):
        """Finds and deletes a record in one place"""
        policy = db.query(Policy).filter(Policy.id == policy_id).first()
        # Evaluate condition to control execution branch
        if policy:
          # Mark entity instance for deletion in database
          db.delete(policy)
          # Commit transaction to persist changes in database
          db.commit()
          # Return computed result or response payload to caller
          return True
        # Return computed result or response payload to caller
        return False
