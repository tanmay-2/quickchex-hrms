from fastapi import Depends, HTTPException, status
from app.core.dependencies import get_current_user

def require_role(required_roles: list):
    def role_dependency(user=Depends(get_current_user)):
        user_role = str(getattr(user, "role", "")).strip().lower()
        allowed = [str(r).strip().lower() for r in required_roles]
        if "admin" in allowed and "superadmin" not in allowed:
            allowed.append("superadmin")

        if not user_role or user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of {required_roles}"
            )
        return {
            "sub": user.email,
            "emp_code": user.emp_code,
            "role": user.role,
        }

    return role_dependency
