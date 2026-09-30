from sqlalchemy.orm import Session
from app.models.task_model import Task
 
 
def create_task(db: Session, task: Task):
    db.add(task)
    db.commit()
    db.refresh(task)
    return task
 
 
def get_tasks_by_user(db: Session, user_id: int):
    return db.query(Task).filter(Task.assigned_to == user_id).all()
 
 
def get_all_tasks(db: Session):
    return db.query(Task).all()
 
 
def get_task_by_id(db: Session, task_id: int):
    return db.query(Task).filter(Task.id == task_id).first()
 