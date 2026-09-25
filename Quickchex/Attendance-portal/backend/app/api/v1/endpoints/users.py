from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.schemas.user import UserResponse, UserCreate
from app.services.user_service import (
    create_user_service,
    get_me_service,
    get_users_service,
)
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.core.constants import ADMIN

router = APIRouter()


@router.post("/", response_model=UserResponse)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
):
    return create_user_service(db, data)


@router.get("/me", response_model=UserResponse)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_me_service(db, current_user.id)


@router.get("/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([ADMIN])),
):
    return get_users_service(db)