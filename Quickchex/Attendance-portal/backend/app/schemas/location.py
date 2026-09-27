from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class LocationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    latitude: float
    longitude: float
    type: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LocationWithUserResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    email: Optional[str] = None
    latitude: float
    longitude: float
    type: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GeoLocationBase(BaseModel):
    name: str
    city: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    latitude: float
    longitude: float
    radius_km: Optional[float] = 1.0
    status: Optional[str] = "Active"


class GeoLocationCreate(GeoLocationBase):
    id: Optional[str] = None


class GeoLocationUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = None
    status: Optional[str] = None


class GeoLocationResponse(GeoLocationBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GeoValidationResponse(BaseModel):
    valid: bool
    nearest_location: str
    distance_km: float
    distance_meters: float
    allowed_radius_km: float
    message: str