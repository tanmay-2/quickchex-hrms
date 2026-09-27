import urllib.request
import json
import logging
import re
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# Cache resolved coordinates to avoid redundant network calls
_GEO_CACHE = {}

def parse_coordinates(loc_input) -> Tuple[Optional[float], Optional[float]]:
    """Extracts latitude and longitude from dict, string or tuple."""
    if not loc_input:
        return None, None
    if isinstance(loc_input, dict):
        try:
            return float(loc_input.get("latitude")), float(loc_input.get("longitude"))
        except Exception:
            return None, None
    s = str(loc_input).strip()
    match = re.search(r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", s)
    if match:
        try:
            return float(match.group(1)), float(match.group(2))
        except Exception:
            pass
    return None, None


def reverse_geocode(lat: float, lon: float) -> str:
    """Reverse geocodes (lat, lon) to a human-readable location address with strict timeout."""
    if lat is None or lon is None:
        return "Office / GPS"

    cache_key = (round(lat, 4), round(lon, 4))
    if cache_key in _GEO_CACHE:
        return _GEO_CACHE[cache_key]

    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
        req = urllib.request.Request(url, headers={"User-Agent": "HRMS-Portal-App/2.0"})
        with urllib.request.urlopen(req, timeout=1.5) as response:
            data = json.loads(response.read().decode("utf-8"))
            addr_data = data.get("address", {})
            road = addr_data.get("road") or addr_data.get("suburb") or ""
            suburb = addr_data.get("neighbourhood") or addr_data.get("suburb") or addr_data.get("city_district") or ""
            city = addr_data.get("city") or addr_data.get("town") or addr_data.get("county") or ""

            parts = [p for p in [road, suburb, city] if p]
            if parts:
                resolved = ", ".join(parts)
            else:
                disp = data.get("display_name", "")
                if disp:
                    resolved = ", ".join([p.strip() for p in disp.split(",")[:3]])
                else:
                    resolved = f"GPS ({lat:.4f}, {lon:.4f})"
            
            _GEO_CACHE[cache_key] = resolved
            return resolved
    except Exception as e:
        logger.warning(f"Reverse geocode lookup skipped for ({lat}, {lon}): {e}")

    # Fallback to readable coordinate string immediately
    fallback = f"GPS ({lat:.4f}, {lon:.4f})"
    _GEO_CACHE[cache_key] = fallback
    return fallback


def format_punch_location(loc_input) -> str:
    """Converts raw location input (coordinates dict/string) into a resolved dynamic address."""
    if not loc_input:
        return ""
    lat, lon = parse_coordinates(loc_input)
    if lat is not None and lon is not None:
        addr = reverse_geocode(lat, lon)
        return addr
    s = str(loc_input).strip()
    return s


import math
from app.models.location import GeoLocation

DEFAULT_OFFICE_LOCATIONS = [
    {"name": "NCDEX", "latitude": 19.13241306584792, "longitude": 72.92787611957756, "radius_km": 1.0},
    {"name": "NCDEX West", "latitude": 19.132512, "longitude": 72.927946000001, "radius_km": 1.0},
    {"name": "Jeevan Seva Building", "latitude": 19.0933709, "longitude": 72.8398086, "radius_km": 1.0},
    {"name": "Mittal Chambers, Nariman Point", "latitude": 18.9262, "longitude": 72.8219, "radius_km": 1.0},
    {"name": "LIC Colony, Suresh Colony", "latitude": 19.0927141, "longitude": 72.8404524, "radius_km": 1.0},
    {"name": "Thane Hiranandani Front", "latitude": 19.2521953, "longitude": 72.9808554, "radius_km": 1.0},
    {"name": "Cuffe Parade", "latitude": 18.9145662, "longitude": 72.8179441, "radius_km": 1.0},
    {"name": "Kandivali West", "latitude": 19.2111092, "longitude": 72.8356159, "radius_km": 1.0},
    {"name": "Ghodbunder", "latitude": 19.2650059, "longitude": 72.9630347, "radius_km": 1.0},
    {"name": "FORT", "latitude": 18.9310646, "longitude": 72.8331541, "radius_km": 1.0},
    {"name": "Palghar", "latitude": 19.8025181, "longitude": 72.7573132, "radius_km": 1.0},
    {"name": "Powai", "latitude": 19.1232718, "longitude": 72.8085564, "radius_km": 1.0},
    {"name": "Thane Hiranandani", "latitude": 19.2628793, "longitude": 72.9484532, "radius_km": 1.0},
    {"name": "Mumbai", "latitude": 19.11043, "longitude": 72.887818, "radius_km": 1.0},
]


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth's mean radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def validate_coordinates_against_geofence(lat: float, lon: float, db=None) -> dict:
    """
    Validates if coordinates (lat, lon) are within the allowed radius (default 1.0 km)
    of any approved office location in the database.
    """
    active_locations = []
    if db is not None:
        try:
            active_locations = db.query(GeoLocation).filter(GeoLocation.status == "Active").all()
        except Exception as e:
            logger.warning(f"Error querying GeoLocation table: {e}")

    if not active_locations:
        active_locations = [
            type("OfficeLoc", (), item)() for item in DEFAULT_OFFICE_LOCATIONS
        ]

    min_dist_km = float("inf")
    nearest_loc = None

    for loc in active_locations:
        try:
            loc_lat = float(loc.latitude)
            loc_lon = float(loc.longitude)
            dist = calculate_haversine_distance(lat, lon, loc_lat, loc_lon)
            if dist < min_dist_km:
                min_dist_km = dist
                nearest_loc = loc
        except Exception:
            continue

    if not nearest_loc:
        return {
            "valid": True,
            "nearest_location": "Office",
            "distance_km": 0.0,
            "distance_meters": 0.0,
            "allowed_radius_km": 1.0,
            "message": "No active geo-fence locations defined. Attendance permitted."
        }

    allowed_radius = getattr(nearest_loc, "radius_km", 1.0) or 1.0
    is_valid = min_dist_km <= allowed_radius

    dist_meters = round(min_dist_km * 1000, 1)
    dist_km_rounded = round(min_dist_km, 3)

    if is_valid:
        if dist_meters < 1000:
            dist_str = f"{int(dist_meters)}m"
        else:
            dist_str = f"{dist_km_rounded:.2f} km"
        msg = f"Valid location: Within {allowed_radius} km of {nearest_loc.name} ({dist_str} away)."
    else:
        msg = f"Invalid Location: You are {dist_km_rounded:.2f} km away from {nearest_loc.name}. Attendance punch is only allowed within {allowed_radius} km of an approved office."

    return {
        "valid": is_valid,
        "nearest_location": nearest_loc.name,
        "distance_km": dist_km_rounded,
        "distance_meters": dist_meters,
        "allowed_radius_km": allowed_radius,
        "message": msg
    }

