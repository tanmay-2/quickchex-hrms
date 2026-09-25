from fastapi import Depends, HTTPException, status
from app.core.security import decode_access_token

def require_role(required_roles: list):
    def role_dependency(token: dict = Depends(decode_access_token)):
        user_role = str(token.get("role", "")).strip().lower()
        allowed = [str(r).strip().lower() for r in required_roles]

        if not user_role or user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of {required_roles}"
            )
        return token

    return role_dependency