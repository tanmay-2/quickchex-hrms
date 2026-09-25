from sqlalchemy.orm import Session
from app.models.policy_model import Policy
import datetime
import os

class PolicyService:
    
    @staticmethod
    def get_all_policies(db: Session):
        """Combines Repo logic (query) and Service logic (returning data)"""
        return db.query(Policy).all()

    @staticmethod
    def create_policy(db: Session, name: str, dept: str, desc: str, file_name: str):
        # We store the relative path: "uploads/policies/filename.pdf"
        relative_path = os.path.join("uploads", "policies", file_name)
        
        db_policy = Policy(
            name=name,
            department=dept,
            description=desc,
            file_path=relative_path, # This matches your app.mount
            created_date=datetime.date.today()
        )
        db.add(db_policy)
        db.commit()
        db.refresh(db_policy)
        return db_policy

    @staticmethod
    def delete_policy(db: Session, policy_id: int):
        """Finds and deletes a record in one place"""
        policy = db.query(Policy).filter(Policy.id == policy_id).first()
        if policy:
          db.delete(policy)
          db.commit()
          return True
        return False