from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories.user_repo import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_all_users,
)
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate
from app.core.security import hash_password


def format_user_response(user: User):
    role_val = user.role if isinstance(user.role, str) else (user.role.name if getattr(user, "role", None) else None)
    return {
        "id": user.id,
        "name": user.username,
        "email": user.email,
        "role": role_val,
        "is_active": getattr(user, "is_active", True),
    }

def create_user_service(db: Session, data: UserCreate):
    # Check existing user
    existing_user = get_user_by_email(db, data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    # Create user
    empcode_val = getattr(data, "empcode", None) or data.email.split("@")[0].upper()
    user = User(
        username=data.name,
        email=data.email,
        password=hash_password(data.password),
        role=data.role.lower(),
        empcode=empcode_val,
    )

    user = create_user(db, user)

    return format_user_response(user)


def get_me_service(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return format_user_response(user)   # 🔥 FIXED


def get_users_service(db: Session):
    users = get_all_users(db)
    return [format_user_response(user) for user in users]   # 🔥 FIXED