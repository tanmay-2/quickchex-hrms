# ==============================================================================
# QUICKCHEX HRMS BACKEND - CONFIG.PY
# Path: Attendance-portal/backend/app/core/config.py
# Purpose: Core backend infrastructure component for 'config' (security, config, or utilities).
# ==============================================================================

# Import module os for system functionality
import os
# Import module secrets for system functionality
import secrets
# Import load_dotenv from dotenv for module operations
from dotenv import load_dotenv

# Invoke load_dotenv to perform operational action
load_dotenv()

# Set APP_ENV variable to store APP ENV value
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
# Set IS_PRODUCTION variable to store IS PRODUCTION value
IS_PRODUCTION = APP_ENV in {"prod", "production"}
# Set DATABASE_URL variable to store DATABASE URL value
DATABASE_URL = os.getenv("DATABASE_URL", "")
# Set SECRET_KEY variable to store SECRET KEY value
SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
# Evaluate condition to control execution branch
if IS_PRODUCTION and (
    # Execute statement to process data and maintain state
    len(SECRET_KEY) < 32
    # Execute statement to process data and maintain state
    or any(marker in SECRET_KEY.lower() for marker in ("change-this", "replace_with", "your_secret"))
# Execute statement to process data and maintain state
):
    # Raise exception to abort current operation with error
    raise RuntimeError("Production requires SECRET_KEY to be a unique random value of at least 32 characters.")
# Check if target condition is false or object is missing
if not SECRET_KEY:
    # Keep local development self-contained without a weak committed secret.
    # Tokens are invalidated when the development process restarts.
    SECRET_KEY = secrets.token_urlsafe(48)
# Set ALGORITHM variable to store ALGORITHM value
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # Default 30 days for uninterrupted sessions
# Set OTP_EXPIRE_MINUTES variable to store OTP EXPIRE MINUTES value
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
