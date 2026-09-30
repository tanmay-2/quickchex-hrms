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