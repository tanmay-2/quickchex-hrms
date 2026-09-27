from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.models.location import GeoLocation
from app.schemas.location import (
    GeoLocationCreate,
    GeoLocationUpdate,
    GeoLocationResponse,
    GeoValidationResponse,
)
from app.services.geo_service import (
    validate_coordinates_against_geofence,
    DEFAULT_OFFICE_LOCATIONS,
)

router = APIRouter(prefix="/locations", tags=["Location"])


# ==============================================================================
# GEO LOCATION MASTER ENDPOINTS
# ==============================================================================

@router.get("/geo-master", response_model=List[GeoLocationResponse])
def get_all_geo_master_locations(
    active_only: bool = Query(False, description="Filter only active locations"),
    db: Session = Depends(get_db)
):
    """
    Returns all registered office geo-fence locations.
    Auto-seeds default locations if table is empty.
    """
    query = db.query(GeoLocation)
    if active_only:
        query = query.filter(GeoLocation.status == "Active")
    locations = query.order_by(GeoLocation.name.asc()).all()

    # If database table is empty, auto-seed defaults
    if not locations:
        for idx, item in enumerate(DEFAULT_OFFICE_LOCATIONS):
            new_id = f"loc-{idx+1:03d}"
            loc = GeoLocation(
                id=new_id,
                name=item["name"],
                city="Mumbai",
                state="Maharashtra",
                address=item.get("address", item["name"]),
                latitude=item["latitude"],
                longitude=item["longitude"],
                radius_km=item.get("radius_km", 1.0),
                status="Active"
            )
            db.merge(loc)
        db.commit()
        locations = db.query(GeoLocation).order_by(GeoLocation.name.asc()).all()

    return locations


@router.post("/geo-master", response_model=GeoLocationResponse)
def create_or_update_geo_location(
    data: GeoLocationCreate,
    db: Session = Depends(get_db)
):
    """
    Creates a new geo-fenced office location or updates an existing one.
    """
    loc_id = data.id or f"loc-{uuid.uuid4().hex[:8]}"

    existing = db.query(GeoLocation).filter(GeoLocation.id == loc_id).first()
    if existing:
        existing.name = data.name
        existing.city = data.city
        existing.state = data.state
        existing.address = data.address
        existing.latitude = data.latitude
        existing.longitude = data.longitude
        existing.radius_km = data.radius_km if data.radius_km is not None else 1.0
        existing.status = data.status or "Active"
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_loc = GeoLocation(
            id=loc_id,
            name=data.name,
            city=data.city,
            state=data.state,
            address=data.address,
            latitude=data.latitude,
            longitude=data.longitude,
            radius_km=data.radius_km if data.radius_km is not None else 1.0,
            status=data.status or "Active"
        )
        db.add(new_loc)
        db.commit()
        db.refresh(new_loc)
        return new_loc


@router.delete("/geo-master/{loc_id}")
def delete_geo_location(
    loc_id: str,
    db: Session = Depends(get_db)
):
    """
    Deletes an office geo-fence location by ID.
    """
    loc = db.query(GeoLocation).filter(GeoLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(loc)
    db.commit()
    return {"status": "success", "message": f"Location {loc_id} deleted successfully"}


# ==============================================================================
# LIVE GEO-FENCE VALIDATION ENDPOINT
# ==============================================================================

@router.get("/validate", response_model=GeoValidationResponse)
def validate_live_location(
    latitude: float = Query(..., description="Employee's current GPS latitude"),
    longitude: float = Query(..., description="Employee's current GPS longitude"),
    db: Session = Depends(get_db)
):
    """
    Live real-time validation: checks if current coordinates are within the 1 km radius
    of any active registered office location.
    """
    result = validate_coordinates_against_geofence(latitude, longitude, db=db)
    return result