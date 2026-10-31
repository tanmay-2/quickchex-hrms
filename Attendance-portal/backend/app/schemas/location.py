# ==============================================================================
# QUICKCHEX HRMS BACKEND - LOCATION.PY
# Path: Attendance-portal/backend/app/schemas/location.py
# Purpose: Pydantic data validation and serialization schema definitions for 'location'.
# Classes / Data Models:
#   • LocationResponse
#   • LocationWithUserResponse
# ==============================================================================

from pydantic import BaseModel
from datetime import datetime


class LocationResponse(BaseModel):
    id: int
    user_id: int
    latitude: float
    longitude: float
    type: str
    created_at: datetime

    class Config:
        from_attributes = True


class LocationWithUserResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    email: str
    latitude: float
    longitude: float
    type: str
    created_at: datetime

    class Config:
        from_attributes = True