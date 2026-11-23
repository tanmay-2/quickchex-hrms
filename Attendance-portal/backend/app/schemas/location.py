# ==============================================================================
# QUICKCHEX HRMS BACKEND - LOCATION.PY
# Path: Attendance-portal/backend/app/schemas/location.py
# Purpose: Pydantic data validation and serialization schema definitions for 'location'.
# Classes / Data Models:
#   • LocationResponse
#   • LocationWithUserResponse
# ==============================================================================

# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import datetime from datetime for module operations
from datetime import datetime


# Define class LocationResponse inheriting from BaseModel
class LocationResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define user_id schema field with type int
    user_id: int
    # Define latitude schema field with type float
    latitude: float
    # Define longitude schema field with type float
    longitude: float
    # Define type schema field with type str
    type: str
    # Define created_at schema field with type datetime
    created_at: datetime

    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True


# Define class LocationWithUserResponse inheriting from BaseModel
class LocationWithUserResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define user_id schema field with type int
    user_id: int
    # Define user_name schema field with type str
    user_name: str
    # Define email schema field with type str
    email: str
    # Define latitude schema field with type float
    latitude: float
    # Define longitude schema field with type float
    longitude: float
    # Define type schema field with type str
    type: str
    # Define created_at schema field with type datetime
    created_at: datetime

    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True