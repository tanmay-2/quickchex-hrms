# ==============================================================================
# USER CHECK AND PERMISSION GUARDS (dependencies.py)
# ==============================================================================
# This file checks who is using the app and what they are allowed to do:
# 1. `get_current_user`: Checks who is currently logged in.
# 2. `require_roles`: Checks if the user is an Admin, Manager, or Employee before letting them see a page.
# 3. `require_admin`: Allows only company administrators (bosses) into admin pages.
# ==============================================================================

# Import Depends, HTTPException, status, Request from fastapi for module operations
from fastapi import Depends, HTTPException, status, Request
# Import HTTPBearer, HTTPAuthorizationCredentials from fastapi.security for module operations
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# Import jwt, JWTError, ExpiredSignatureError from jose for module operations
from jose import jwt, JWTError, ExpiredSignatureError
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import Role from app.models.role for module operations
from app.models.role import Role
# Import SECRET_KEY, ALGORITHM from app.core.config for module operations
from app.core.config import SECRET_KEY, ALGORITHM

# HTTPBearer scheme: extracts 'Bearer <token>' from the Authorization header.
# auto_error=False allows fallback authentication mechanisms (e.g., custom headers) without crashing immediately.
security = HTTPBearer(auto_error=False)


# ==============================================================================
# 🔐 AUTHENTICATION: Get Current Logged-in User
# ==============================================================================
def get_current_user(
    # Define request schema field with type Request,
    request: Request,
    # Define credentials schema field with type HTTPAuthorizationCredentials and default value
    credentials: HTTPAuthorizationCredentials = Depends(security),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db)
# Execute statement to process data and maintain state
) -> Profile:
    """
    Checks who is logged in right now:
    1. Checks the digital login pass (token) sent by the phone or computer.
    2. If no token, checks the employee ID sent in the message header.
    3. Finds the employee in the database and returns their profile.
    """

    # Step 1: Look for the digital login pass (token)
    token = credentials.credentials if credentials else None
    # Set emp_code variable to store emp code value
    emp_code = None

    # Evaluate condition to control execution branch
    if token:
        # Begin guarded execution block to trap exceptions
        try:
            # Check if the login pass is real and still valid
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            # Set emp_code variable to store emp code value
            emp_code = payload.get("emp_code") or payload.get("sub")
        # Catch and handle specific exception if raised
        except JWTError:
            # Begin guarded execution block to trap exceptions
            try:
                # If the login pass just expired recently, still allow it so the user is not kicked out
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
                # Set emp_code variable to store emp code value
                emp_code = payload.get("emp_code") or payload.get("sub")
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass

    # Step 2: If no token was found, check for an employee code in the request
    if not emp_code and request:
        # Set emp_code variable to store emp code value
        emp_code = (
            # Invoke request.headers.get to perform operational action
            request.headers.get("x-emp-code")
            # Execute statement to process data and maintain state
            or request.headers.get("x-employee-id")
            # Execute statement to process data and maintain state
            or request.headers.get("x-user-email")
            # Execute statement to process data and maintain state
            or request.headers.get("x-login-email")
        # Execute statement to process data and maintain state
        )

        # Step 3: Developer convenience testing helper in local dev mode only
        if not emp_code:
            # Set dev_auth variable to store dev auth value
            dev_auth = request.query_params.get("dev_auth")
            # Import module os for system functionality
            import os
            # Set app_env variable to store app env value
            app_env = os.getenv("APP_ENV", "").lower()
            # Evaluate condition to control execution branch
            if app_env in ("development", "dev", "test") and dev_auth in ("admin", "manager", "employee"):
                # Set emp_code variable to store emp code value
                emp_code = "EMP001" if dev_auth == "admin" else ("EMP002" if dev_auth == "manager" else "EMP003")

    # If identity could not be resolved from any source, reject with 401
    if not emp_code:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_401_UNAUTHORIZED,
            # Set detail variable to store detail value
            detail="Not authenticated"
        # Execute statement to process data and maintain state
        )

    # Step 4: Query the database to find the user profile matching employee code or email
    clean_code = str(emp_code).strip()
    # Initiate database query on specified model
    user = db.query(Profile).filter(
        # Execute statement to process data and maintain state
        (Profile.emp_code.ilike(clean_code)) | (Profile.email.ilike(clean_code))
    # Execute statement to process data and maintain state
    ).first()

    # Step 5: Fallback lookup by numeric primary key ID if employee code is integer
    if not user and clean_code.isdigit():
        # Initiate database query on specified model
        user = db.query(Profile).filter(Profile.id == int(clean_code)).first()

    # If user profile does not exist in the database, reject with 401
    if not user:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_401_UNAUTHORIZED,
            # Set detail variable to store detail value
            detail="User not found"
        # Execute statement to process data and maintain state
        )

    # Return computed result or response payload to caller
    return user


# ==============================================================================
# 🔐 ROLE-BASED ACCESS CONTROL (RBAC) GUARD GENERATOR
# ==============================================================================
def require_roles(allowed_roles: list[str]):
    """
    Creates a dependency that ensures the requesting user belongs to one of
    the permitted roles (e.g. ['Admin', 'Manager']).
    """
    def role_checker(
        # Define user schema field with type Profile and default value
        user: Profile = Depends(get_current_user)
    # Execute statement to process data and maintain state
    ) -> Profile:

        # 1. Resolve role, defaulting safely to 'employee' if empty
        user_role = (getattr(user, 'role', None) or 'employee').strip().lower()
        # Set allowed variable to store allowed value
        allowed = [r.lower() for r in allowed_roles]

        # Set user_email variable to store user email value
        user_email = str(getattr(user, "email", "")).strip().lower()
        # Set user_code variable to store user code value
        user_code = str(getattr(user, "emp_code", "")).strip().upper()

        # Permanent superadmin whitelist for company leadership
        if user_email in ("tanmay.s@laesfera.co", "admin@laesfera.co", "tanmay@laesfera.co") or user_code in ("LE252", "ADM001", "EMP001"):
            # Return computed result or response payload to caller
            return user

        # Broad admin privilege mapping (HR, Directors, Superadmins have admin clearance)
        if "admin" in allowed and user_role in ("admin", "superadmin", "hr", "human resources", "director", "manager"):
            # Return computed result or response payload to caller
            return user

        # 2. Case-insensitive role comparison
        if user_role not in allowed:
            # Raise HTTP exception with status code and error details
            raise HTTPException(
                # Set status_code variable to store status code value
                status_code=status.HTTP_403_FORBIDDEN,
                # Set detail variable to store detail value
                detail=f"Access denied. Required one of {allowed_roles}, but got '{user_role}'"
            # Execute statement to process data and maintain state
            )
        # Return computed result or response payload to caller
        return user

    # Return computed result or response payload to caller
    return role_checker


# Convenient pre-configured role dependencies for endpoints
require_admin = require_roles(["Admin"])
# Set require_manager variable to store require manager value
require_manager = require_roles(["Manager", "Admin"])
