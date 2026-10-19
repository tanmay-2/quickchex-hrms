from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.profile_model import Profile
from app.models.role import Role
from app.core.config import SECRET_KEY, ALGORITHM

# 🔥 FIX: prevent automatic error
security = HTTPBearer(auto_error=False)


# 🔐 Get Current User
def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Profile:

    token = credentials.credentials if credentials else None
    emp_code = None

    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            emp_code = payload.get("emp_code") or payload.get("sub")
        except JWTError:
            try:
                # 1. Allow expired token if signature matches
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
                emp_code = payload.get("emp_code") or payload.get("sub")
            except Exception:
                pass

    # 2. Fallback to request headers if token is not present
    if not emp_code and request:
        emp_code = (
            request.headers.get("x-emp-code")
            or request.headers.get("x-employee-id")
            or request.headers.get("x-user-email")
            or request.headers.get("x-login-email")
        )

        if not emp_code:
            dev_auth = request.query_params.get("dev_auth")
            # Only honor dev_auth if explicitly configured in non-production
            import os
            app_env = os.getenv("APP_ENV", "").lower()
            if app_env in ("development", "dev", "test") and dev_auth in ("admin", "manager", "employee"):
                emp_code = "EMP001" if dev_auth == "admin" else ("EMP002" if dev_auth == "manager" else "EMP003")

    if not emp_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    # Match user by emp_code or email in Profile
    clean_code = str(emp_code).strip()
    user = db.query(Profile).filter(
        (Profile.emp_code.ilike(clean_code)) | (Profile.email.ilike(clean_code))
    ).first()

    if not user and clean_code.isdigit():
        user = db.query(Profile).filter(Profile.id == int(clean_code)).first()

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
