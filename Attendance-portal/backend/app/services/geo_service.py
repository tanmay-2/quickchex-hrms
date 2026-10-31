# ==============================================================================
# QUICKCHEX HRMS BACKEND - GEO_SERVICE.PY
# Path: Attendance-portal/backend/app/services/geo_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'geo_service'.
# Primary Functions:
#   • calculate_haversine_distance()
#   • parse_coordinates()
#   • reverse_geocode()
#   • resolve_location_name()
#   • format_punch_location()
# ==============================================================================

import urllib.request
import json
import logging
import math
import re
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# Cache resolved coordinates (rounded to 3 decimal places ~110m) to avoid redundant network calls
_GEO_CACHE = {}


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula calculating distance in meters between two GPS coordinates."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999999999.0
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def parse_coordinates(loc_input) -> Tuple[Optional[float], Optional[float]]:
    """Extracts latitude and longitude from dict, string or tuple."""
    if not loc_input:
        return None, None
    if isinstance(loc_input, dict):
        try:
            lat = loc_input.get("latitude")
            lon = loc_input.get("longitude")
            if lat is not None and lon is not None:
                return float(lat), float(lon)
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
    """
    Reverse geocodes (lat, lon) to a human-readable location address (e.g. 'Andheri East, Mumbai')
    using OpenStreetMap Nominatim with free tier caching.
    """
    if lat is None or lon is None:
        return ""

    cache_key = (round(lat, 3), round(lon, 3))
    if cache_key in _GEO_CACHE:
        return _GEO_CACHE[cache_key]

    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Quickchex-HRMS-Attendance/2.0 (contact: admin@laesfera.co)",
                "Accept-Language": "en-US,en;q=0.9"
            }
        )
        with urllib.request.urlopen(req, timeout=3.0) as response:
            data = json.loads(response.read().decode("utf-8"))
            addr_data = data.get("address", {})

            road = addr_data.get("road") or addr_data.get("pedestrian") or ""
            suburb = (
                addr_data.get("suburb")
                or addr_data.get("neighbourhood")
                or addr_data.get("residential")
                or addr_data.get("city_district")
                or ""
            )
            city = (
                addr_data.get("city")
                or addr_data.get("town")
                or addr_data.get("county")
                or addr_data.get("state_district")
                or ""
            )

            if suburb and city and suburb.lower() != city.lower():
                resolved = f"{suburb}, {city}"
            elif road and (suburb or city):
                resolved = f"{road}, {suburb or city}"
            elif suburb or city:
                resolved = suburb or city
            else:
                disp = data.get("display_name", "")
                if disp:
                    parts = [p.strip() for p in disp.split(",") if p.strip()]
                    resolved = ", ".join(parts[:2])
                else:
                    resolved = f"GPS ({lat:.4f}, {lon:.4f})"

            if resolved:
                _GEO_CACHE[cache_key] = resolved
                return resolved
    except Exception as e:
        logger.warning(f"Reverse geocode lookup note for ({lat}, {lon}): {e}")

    fallback = f"GPS ({lat:.4f}, {lon:.4f})"
    _GEO_CACHE[cache_key] = fallback
    return fallback


def resolve_location_name(
    lat: Optional[float],
    lon: Optional[float],
    office_name: Optional[str] = "Office HQ",
    office_lat: Optional[float] = None,
    office_lon: Optional[float] = None,
    office_radius: float = 200.0,
    work_mode: str = "OFFICE",
    client_site_name: Optional[str] = None,
    default_name: Optional[str] = None,
) -> str:
    """
    Determines real human-readable location using:
    1. Office Geofence (returns office name e.g. 'Office HQ' or 'LA ESFERA Head Office' if inside radius)
    2. Client site matching if client site specified
    3. OpenStreetMap Nominatim reverse geocode (e.g. 'Andheri East, Mumbai')
    4. Meaningful fallback based on work mode (Never plain 'Location Detected')
    """
    w_mode = str(work_mode or "OFFICE").strip().upper()

    # If GPS coordinates are available
    if lat is not None and lon is not None and abs(lat) > 0.0001 and abs(lon) > 0.0001:
        # Check office geofence distance
        if office_lat is not None and office_lon is not None:
            dist = calculate_haversine_distance(lat, lon, office_lat, office_lon)
            if dist <= (office_radius or 200.0):
                return office_name or "Office HQ"

        # Reverse geocode to real address (e.g. "Andheri East, Mumbai")
        real_addr = reverse_geocode(lat, lon)
        if real_addr and not real_addr.startswith("GPS ("):
            if w_mode == "CLIENT_SITE" and client_site_name:
                return f"{client_site_name} ({real_addr})"
            return real_addr
        elif real_addr:
            if w_mode == "OFFICE":
                return office_name or default_name or real_addr
            if w_mode == "CLIENT_SITE" and client_site_name:
                return client_site_name
            return real_addr

    # If GPS coordinates unavailable
    if w_mode == "OFFICE":
        return office_name or default_name or "Office HQ"
    elif w_mode == "CLIENT_SITE":
        return client_site_name or "Client Site"
    elif w_mode in ("WFH", "WORK_FROM_HOME"):
        return default_name or "Remote / Home"

    return default_name or office_name or "Office HQ"


def format_punch_location(loc_input, lat: Optional[float] = None, lon: Optional[float] = None, default_loc: Optional[str] = None) -> str:
    """Converts raw location input (coordinates dict/string) into a resolved dynamic address."""
    if not loc_input and lat is None and lon is None:
        return default_loc or ""

    # If already a valid named address (not 'Location Detected' / 'Location detected')
    s = str(loc_input or "").strip()
    if s and s.lower() not in ("location detected", "none", "null", "—", "-"):
        # Check if it's raw lat,lon string
        p_lat, p_lon = parse_coordinates(s)
        if p_lat is not None and p_lon is not None:
            return reverse_geocode(p_lat, p_lon)
        return s

    if lat is not None and lon is not None:
        return reverse_geocode(lat, lon)

    p_lat, p_lon = parse_coordinates(loc_input)
    if p_lat is not None and p_lon is not None:
        return reverse_geocode(p_lat, p_lon)

    return default_loc or s or ""


