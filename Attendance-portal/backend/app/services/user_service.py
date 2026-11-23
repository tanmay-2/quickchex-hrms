# ==============================================================================
# QUICKCHEX HRMS BACKEND - USER_SERVICE.PY
# Path: Attendance-portal/backend/app/services/user_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'user_service'.
# Primary Functions:
#   • format_user_response()
#   • create_user_service()
#   • get_me_service()
#   • get_users_service()
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import HTTPException from fastapi for module operations
from fastapi import HTTPException

# Import  from app.repositories.user_repo for module operations
from app.repositories.user_repo import (
    # Execute statement to process data and maintain state
    create_user,
    # Execute statement to process data and maintain state
    get_user_by_email,
    # Execute statement to process data and maintain state
    get_user_by_id,
    # Execute statement to process data and maintain state
    get_all_users,
# Execute statement to process data and maintain state
)
# Import User from app.models.user for module operations
from app.models.user import User
# Import Role from app.models.role for module operations
from app.models.role import Role
# Import UserCreate from app.schemas.user for module operations
from app.schemas.user import UserCreate
# Import hash_password from app.core.security for module operations
from app.core.security import hash_password


# Define format_user_response function to handle format user response
def format_user_response(user: User):
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "id": user.id,
        "name": user.username,   # 🔥 FIX (username → name)
        # Execute statement to process data and maintain state
        "email": user.email,
        # Execute statement to process data and maintain state
        "role": user.role.name if user.role else None,
        # Execute statement to process data and maintain state
        "is_active": user.is_active,
        # ❌ removed created_at (not in DB)
    }

# Define create_user_service function to handle create user service
def create_user_service(db: Session, data: UserCreate):
    # 🔍 Check existing user
    existing_user = get_user_by_email(db, data.email)
    # Evaluate condition to control execution branch
    if existing_user:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="User already exists")

    # 🔍 Get role
    role = db.query(Role).filter(Role.name == data.role).first()
    # Check if target condition is false or object is missing
    if not role:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Invalid role")

    # ✅ Create user
    user = User(
        # Set username variable to store username value
        username=data.name,
        # Set email variable to store email value
        email=data.email,
        # Placeholder statement performing no operation
        password=hash_password(data.password),
        # Set role_id variable to store role id value
        role_id=role.id,
        # Set is_active variable to store is active value
        is_active=True,
    # Execute statement to process data and maintain state
    )

    # Set user variable to store user value
    user = create_user(db, user)

    return format_user_response(user)   # 🔥 FIXED


# Define get_me_service function to handle get me service
def get_me_service(db: Session, user_id: int):
    # Set user variable to store user value
    user = get_user_by_id(db, user_id)

    # Check if target condition is false or object is missing
    if not user:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="User not found")

    return format_user_response(user)   # 🔥 FIXED


# Define get_users_service function to handle get users service
def get_users_service(db: Session):
    # Set users variable to store users value
    users = get_all_users(db)
    return [format_user_response(user) for user in users]   # 🔥 FIXED