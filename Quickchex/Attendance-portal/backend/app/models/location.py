from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String, Text
from datetime import datetime
from app.db.base import Base


class Location(Base):
    """Legacy user location history table."""
    __tablename__ = "user_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    type = Column(String(50), nullable=True)  # "check-in" / "check-out"
    created_at = Column(DateTime, default=datetime.utcnow)


class GeoLocation(Base):
    """Master geo-fenced office locations for attendance radius verification."""
    __tablename__ = "geo_locations"

    id = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_km = Column(Float, default=1.0, nullable=False)
    status = Column(String(50), default="Active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)