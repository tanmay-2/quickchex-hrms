from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.dependencies import get_current_user

router = APIRouter()

@router.get("/my-team")
def my_team(db: Session = Depends(get_db),
            user: User = Depends(get_current_user)):

    team = db.query(User).filter(User.manager_id == user.id).all()

    return team