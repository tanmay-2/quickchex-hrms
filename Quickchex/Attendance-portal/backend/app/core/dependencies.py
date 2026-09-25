from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.profile_model import Profile
from app.models.role import Role
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

# 🔥 FIX: prevent automatic error
security = HTTPBearer(auto_error=False)


# 🔐 Get Current User
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Profile:

    if credentials is None or credentials.credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    token = credentials.credentials
    print("TOKEN:", token)

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("PAYLOAD:", payload)

        # ✅ FIX: use emp_code instead of email
        emp_code: str | None = payload.get("emp_code")

        if emp_code is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

    except JWTError as e:
        print("JWT ERROR:", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    # ✅ FIX: match using emp_code
    user = db.query(Profile).filter(Profile.emp_code == emp_code).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user

# 🔐 Role-Based Access Control
def require_roles(allowed_roles: list[str]):
    def role_checker(
        user: Profile = Depends(get_current_user)
        # We removed the `db` dependency here because we don't need to query another table!
    ) -> Profile:

        # 1. Check if the user actually has a role in their profile
        if getattr(user, "role", None) is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Role not assigned to this profile"
            )

        # 2. Case-insensitive match using the direct column
        if user.role.lower() not in [r.lower() for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                # Helpful debug message
                detail=f"Access denied. Required one of {allowed_roles}, but got '{user.role}'"
            )

        return user

    return role_checker