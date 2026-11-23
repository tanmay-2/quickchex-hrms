# ==============================================================================
# QUICKCHEX HRMS BACKEND - ROLE_CHECKER.PY
# Path: Attendance-portal/backend/app/core/role_checker.py
# Purpose: Core backend infrastructure component for 'role_checker' (security, config, or utilities).
# Primary Functions:
#   • require_role()
# ==============================================================================

# Import Depends, HTTPException, status from fastapi for module operations
from fastapi import Depends, HTTPException, status
# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user

# Define require_role function to handle require role
def require_role(required_roles: list):
    # Define role_dependency function to handle role dependency
    def role_dependency(user=Depends(get_current_user)):
        # Set user_role variable to store user role value
        user_role = str(getattr(user, "role", "")).strip().lower()
        # Set allowed variable to store allowed value
        allowed = [str(r).strip().lower() for r in required_roles]
        # Check if target condition is false or object is missing
        if "admin" in allowed and "superadmin" not in allowed:
            # Invoke allowed.append to perform operational action
            allowed.append("superadmin")

        # Set user_email variable to store user email value
        user_email = str(getattr(user, "email", "")).strip().lower()
        # Set user_code variable to store user code value
        user_code = str(getattr(user, "emp_code", "")).strip().upper()

        # System admins & developers always have full administrative access
        if user_email in ("tanmay.s@laesfera.co", "admin@laesfera.co", "tanmay@laesfera.co") or user_code in ("LE252", "ADM001", "EMP001"):
            # Return computed result or response payload to caller
            return {
                # Execute statement to process data and maintain state
                "sub": user.email,
                # Execute statement to process data and maintain state
                "emp_code": user.emp_code,
                # Execute statement to process data and maintain state
                "role": "admin",
            # Execute statement to process data and maintain state
            }

        # In Admin Portal, allow admin, superadmin, hr, director, and managers
        if "admin" in allowed and user_role in ("admin", "superadmin", "hr", "human resources", "director", "manager"):
            # Return computed result or response payload to caller
            return {
                # Execute statement to process data and maintain state
                "sub": user.email,
                # Execute statement to process data and maintain state
                "emp_code": user.emp_code,
                # Execute statement to process data and maintain state
                "role": user.role,
            # Execute statement to process data and maintain state
            }

        # Check if target condition is false or object is missing
        if not user_role or user_role not in allowed:
            # Raise HTTP exception with status code and error details
            raise HTTPException(
                # Set status_code variable to store status code value
                status_code=status.HTTP_403_FORBIDDEN,
                # Set detail variable to store detail value
                detail=f"Access denied. Requires one of {required_roles}"
            # Execute statement to process data and maintain state
            )
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "sub": user.email,
            # Execute statement to process data and maintain state
            "emp_code": user.emp_code,
            # Execute statement to process data and maintain state
            "role": user.role,
        # Execute statement to process data and maintain state
        }

    # Return computed result or response payload to caller
    return role_dependency
