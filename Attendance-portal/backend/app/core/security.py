# ==============================================================================
# QUICKCHEX HRMS BACKEND - SECURITY.PY
# Path: Attendance-portal/backend/app/core/security.py
# Purpose: Core backend infrastructure component for 'security' (security, config, or utilities).
# Primary Functions:
#   • hash_password()
#   • verify_password()
#   • create_access_token()
#   • decode_access_token()
# ==============================================================================

# Import datetime, timedelta from datetime for module operations
from datetime import datetime, timedelta
# Import jwt from jose for module operations
from jose import jwt
# Import CryptContext from passlib.context for module operations
from passlib.context import CryptContext
# Import Depends, HTTPException from fastapi for module operations
from fastapi import Depends, HTTPException
# Import OAuth2PasswordBearer from fastapi.security for module operations
from fastapi.security import OAuth2PasswordBearer
# Import JWTError from jose for module operations
from jose import JWTError
# Import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES from app.core.config for module operations
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# Set pwd_context variable to store pwd context value
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Set oauth2_scheme variable to store oauth2 scheme value
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# Define hash_password function to handle hash password
def hash_password(password: str):
    # Return computed result or response payload to caller
    return pwd_context.hash(password)

# Define verify_password function to handle verify password
def verify_password(plain_password: str, hashed_password: str):
    # Return computed result or response payload to caller
    return pwd_context.verify(plain_password, hashed_password)


# 🔑 JWT config


# Define create_access_token function to handle create access token
def create_access_token(data: dict):
    # Set to_encode variable to store to encode value
    to_encode = data.copy()

    # Set expire variable to store expire value
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # Invoke to_encode.update to perform operational action
    to_encode.update({"exp": expire})

    # Return computed result or response payload to caller
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Define decode_access_token function to handle decode access token
def decode_access_token(token: str = Depends(oauth2_scheme)):
    # Begin guarded execution block to trap exceptions
    try:
        # Set payload variable to store payload value
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Return computed result or response payload to caller
        return payload
    # Catch and handle specific exception if raised
    except JWTError:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=401,
            # Set detail variable to store detail value
            detail="Invalid or expired token"
        # Execute statement to process data and maintain state
        )
