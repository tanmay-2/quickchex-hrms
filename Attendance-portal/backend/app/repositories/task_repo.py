# ==============================================================================
# QUICKCHEX HRMS BACKEND - TASK_REPO.PY
# Path: Attendance-portal/backend/app/repositories/task_repo.py
# Purpose: Data access repository encapsulating queries and mutations for 'task_repo'.
# Primary Functions:
#   • create_task()
#   • get_tasks_by_user()
#   • get_all_tasks()
#   • get_task_by_id()
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import Task from app.models.task_model for module operations
from app.models.task_model import Task
 
 
# Define create_task function to handle create task
def create_task(db: Session, task: Task):
    # Stage new entity instance into database session
    db.add(task)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(task)
    # Return computed result or response payload to caller
    return task
 
 
# Define get_tasks_by_user function to handle get tasks by user
def get_tasks_by_user(db: Session, user_id: int):
    # Initiate database query on specified model
    return db.query(Task).filter(Task.assigned_to == user_id).all()
 
 
# Define get_all_tasks function to handle get all tasks
def get_all_tasks(db: Session):
    # Initiate database query on specified model
    return db.query(Task).all()
 
 
# Define get_task_by_id function to handle get task by id
def get_task_by_id(db: Session, task_id: int):
    # Initiate database query on specified model
    return db.query(Task).filter(Task.id == task_id).first()
 