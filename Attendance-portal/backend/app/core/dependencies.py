from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.profile_model import Profile
from app.models.role import Role
from app.core.config import SECRET_KEY, ALGORITHM

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

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # ✅ use emp_code instead of email
        emp_code: str | None = payload.get("emp_code") or payload.get("sub")

        if emp_code is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

    except JWTError:
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

        # 1. Resolve role, defaulting safely to 'employee' if not assigned
        user_role = (getattr(user, 'role', None) or 'employee').strip().lower()

        # 2. Case-insensitive match using the direct column
        if user_role not in [r.lower() for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required one of {allowed_roles}, but got '{user_role}'"
            )
        return user

    return role_checker


# Convenient role dependencies
require_admin = require_roles(["Admin"])
require_manager = require_roles(["Manager", "Admin"])
