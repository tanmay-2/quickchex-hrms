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

# Import module urllib.request for system functionality
import urllib.request
import urllib.parse
# Import module json for system functionality
import json
# Import module logging for system functionality
import logging
# Import module math for system functionality
import math
# Import module os for system functionality
import os
# Import module time for system functionality
import time
# Import module re for system functionality
import re
# Import Tuple, Optional from typing for module operations
from typing import Tuple, Optional
from pathlib import Path

# Ensure .env is loaded so MapmyIndia credentials are always present in os.environ
try:
    from dotenv import load_dotenv
    load_dotenv()
    _backend_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if _backend_env.exists():
        load_dotenv(dotenv_path=_backend_env)
except Exception:
    pass

# Foolproof fallback: parse .env directly into os.environ if dotenv was missing
if not os.getenv("MAPMYINDIA_CLIENT_ID"):
    try:
        _backend_env = Path(__file__).resolve().parent.parent.parent / ".env"
        if not _backend_env.exists():
            _backend_env = Path(".env").resolve()
        if _backend_env.exists():
            with open(_backend_env, "r", encoding="utf-8", errors="ignore") as _f:
                for _line in _f:
                    _line = _line.strip()
                    if _line and not _line.startswith("#") and "=" in _line:
                        _k, _v = _line.split("=", 1)
                        _k = _k.strip()
                        _v = _v.strip().strip("'\"")
                        if _k and _k not in os.environ:
                            os.environ[_k] = _v
    except Exception:
        pass

# Set logger variable to store logger value
logger = logging.getLogger(__name__)

# Cache resolved coordinates (rounded to 3 decimal places ~110m) to avoid redundant network calls
_GEO_CACHE = {}
_MAPPLS_TOKEN_CACHE = {"token": None, "expires_at": 0}


# Define calculate_haversine_distance function to handle calculate haversine distance
def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula calculating distance in meters between two GPS coordinates."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        # Return computed result or response payload to caller
        return 999999999.0
    R = 6371000.0  # Earth radius in meters
    # Set phi1 variable to store phi1 value
    phi1 = math.radians(lat1)
    # Set phi2 variable to store phi2 value
    phi2 = math.radians(lat2)
    # Set delta_phi variable to store delta phi value
    delta_phi = math.radians(lat2 - lat1)
    # Set delta_lambda variable to store delta lambda value
    delta_lambda = math.radians(lon2 - lon1)
    # Set a variable to store a value
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    # Set c variable to store c value
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    # Return computed result or response payload to caller
    return R * c


# Define parse_coordinates function to handle parse coordinates
def parse_coordinates(loc_input) -> Tuple[Optional[float], Optional[float]]:
    """Extracts latitude and longitude from dict, string or tuple."""
    if not loc_input:
        # Return computed result or response payload to caller
        return None, None
    # Evaluate condition to control execution branch
    if isinstance(loc_input, dict):
        # Begin guarded execution block to trap exceptions
        try:
            # Set lat variable to store lat value
            lat = loc_input.get("latitude")
            # Set lon variable to store lon value
            lon = loc_input.get("longitude")
            # Check if target condition is false or object is missing
            if lat is not None and lon is not None:
                # Return computed result or response payload to caller
                return float(lat), float(lon)
        # Catch and handle specific exception if raised
        except Exception:
            # Return computed result or response payload to caller
            return None, None
    # Set s variable to store s value
    s = str(loc_input).strip()
    # Set match variable to store match value
    match = re.search(r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", s)
    # Evaluate condition to control execution branch
    if match:
        # Begin guarded execution block to trap exceptions
        try:
            # Return computed result or response payload to caller
            return float(match.group(1)), float(match.group(2))
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return None, None


def _get_mappls_token() -> Optional[str]:
    """Retrieves or refreshes OAuth 2.0 access token for MapmyIndia (Mappls) APIs."""
    global _MAPPLS_TOKEN_CACHE
    now = time.time()
    if _MAPPLS_TOKEN_CACHE.get("token") and now < _MAPPLS_TOKEN_CACHE.get("expires_at", 0):
        return _MAPPLS_TOKEN_CACHE["token"]

    client_id = os.getenv("MAPMYINDIA_CLIENT_ID")
    client_secret = os.getenv("MAPMYINDIA_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None

    try:
        url = "https://outpost.mappls.com/api/security/oauth/token"
        data = urllib.parse.urlencode({
            "grant_type": "client_credentials",
            "client_id": client_id.strip(),
            "client_secret": client_secret.strip()
        }).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        with urllib.request.urlopen(req, timeout=3.0) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            token = res_data.get("access_token")
            expires_in = int(res_data.get("expires_in", 86400))
            if token:
                _MAPPLS_TOKEN_CACHE = {
                    "token": token,
                    "expires_at": now + expires_in - 300  # refresh 5 mins before expiry
                }
                return token
    except Exception as e:
        logger.warning(f"MapmyIndia OAuth token generation note: {e}")

    return None


def _reverse_geocode_mappls(lat: float, lon: float) -> Optional[str]:
    """Calls MapmyIndia (Mappls) Advanced Maps Reverse Geocoding API."""
    token = _get_mappls_token()
    if not token:
        return None

    try:
        url = f"https://apis.mappls.com/advancedmaps/v1/{token}/rev_geocode?lat={lat}&lng={lon}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "Quickchex-HRMS-Attendance/2.0"
        })
        with urllib.request.urlopen(req, timeout=2.5) as res:
            data = json.loads(res.read().decode("utf-8"))
            results = data.get("results", [])
            if results and isinstance(results, list):
                first = results[0]
                formatted = first.get("formatted_address", "")
                if formatted:
                    # Clean up trailing ' (India)' or '. Pin-400059 (India)'
                    clean = re.sub(r"\s*\(India\)$", "", formatted.strip())
                    clean = re.sub(r"\.\s*Pin-(\d{6})", r" - \1", clean)
                    return clean

                # Compose from granular components if formatted_address not present
                parts = []
                for field in ["poi", "street", "subSubLocality", "subLocality", "locality", "city", "pincode"]:
                    val = (first.get(field) or "").strip()
                    if val and val not in parts:
                        parts.append(val)
                if parts:
                    return ", ".join(parts)
    except Exception as e:
        logger.warning(f"MapmyIndia rev_geocode lookup note for ({lat}, {lon}): {e}")

    return None


# Define reverse_geocode function to handle reverse geocode
def reverse_geocode(lat: float, lon: float) -> str:
    """
    Reverse geocodes (lat, lon) to a human-readable location address (e.g. 'Andheri East, Mumbai')
    using MapmyIndia (Mappls) with fallback to OpenStreetMap Nominatim and free tier caching.
    """
    if lat is None or lon is None:
        # Return computed result or response payload to caller
        return ""

    # Set cache_key variable to store cache key value
    cache_key = (round(lat, 3), round(lon, 3))
    # Evaluate condition to control execution branch
    if cache_key in _GEO_CACHE:
        # Return computed result or response payload to caller
        return _GEO_CACHE[cache_key]

    # 1. Primary: Try MapmyIndia (Mappls) reverse geocoding
    mappls_addr = _reverse_geocode_mappls(lat, lon)
    if mappls_addr:
        _GEO_CACHE[cache_key] = mappls_addr
        return mappls_addr

    # 2. Secondary Fallback: OpenStreetMap Nominatim

    # Begin guarded execution block to trap exceptions
    try:
        # Set url variable to store url value
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
        # Set req variable to store req value
        req = urllib.request.Request(
            # Execute statement to process data and maintain state
            url,
            # Set headers variable to store headers value
            headers={
                # Execute statement to process data and maintain state
                "User-Agent": "Quickchex-HRMS-Attendance/2.0 (contact: admin@laesfera.co)",
                # Execute statement to process data and maintain state
                "Accept-Language": "en-US,en;q=0.9"
            # Execute statement to process data and maintain state
            }
        # Execute statement to process data and maintain state
        )
        # Acquire context manager resource for enclosed block
        with urllib.request.urlopen(req, timeout=1.2) as response:
            # Set data variable to store data value
            data = json.loads(response.read().decode("utf-8"))
            # Set addr_data variable to store addr data value
            addr_data = data.get("address", {})

            # Set road variable to store road value
            road = addr_data.get("road") or addr_data.get("pedestrian") or ""
            # Set suburb variable to store suburb value
            suburb = (
                # Invoke addr_data.get to perform operational action
                addr_data.get("suburb")
                # Execute statement to process data and maintain state
                or addr_data.get("neighbourhood")
                # Execute statement to process data and maintain state
                or addr_data.get("residential")
                # Execute statement to process data and maintain state
                or addr_data.get("city_district")
                # Execute statement to process data and maintain state
                or ""
            # Execute statement to process data and maintain state
            )
            # Set city variable to store city value
            city = (
                # Invoke addr_data.get to perform operational action
                addr_data.get("city")
                # Execute statement to process data and maintain state
                or addr_data.get("town")
                # Execute statement to process data and maintain state
                or addr_data.get("county")
                # Execute statement to process data and maintain state
                or addr_data.get("state_district")
                # Execute statement to process data and maintain state
                or ""
            # Execute statement to process data and maintain state
            )

            # Evaluate condition to control execution branch
            if suburb and city and suburb.lower() != city.lower():
                # Set resolved variable to store resolved value
                resolved = f"{suburb}, {city}"
            # Evaluate alternate branch condition
            elif road and (suburb or city):
                # Set resolved variable to store resolved value
                resolved = f"{road}, {suburb or city}"
            # Evaluate alternate branch condition
            elif suburb or city:
                # Set resolved variable to store resolved value
                resolved = suburb or city
            # Execute fallback branch when conditions are not met
            else:
                # Set disp variable to store disp value
                disp = data.get("display_name", "")
                # Evaluate condition to control execution branch
                if disp:
                    # Set parts variable to store parts value
                    parts = [p.strip() for p in disp.split(",") if p.strip()]
                    # Set resolved variable to store resolved value
                    resolved = ", ".join(parts[:2])
                # Execute fallback branch when conditions are not met
                else:
                    # Set resolved variable to store resolved value
                    resolved = f"GPS ({lat:.4f}, {lon:.4f})"

            # Evaluate condition to control execution branch
            if resolved:
                # Execute statement to process data and maintain state
                _GEO_CACHE[cache_key] = resolved
                # Return computed result or response payload to caller
                return resolved
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log warning message for non-fatal unexpected condition
        logger.warning(f"Reverse geocode lookup note for ({lat}, {lon}): {e}")

    # Set fallback variable to store fallback value
    fallback = f"GPS ({lat:.4f}, {lon:.4f})"
    # Execute statement to process data and maintain state
    _GEO_CACHE[cache_key] = fallback
    # Return computed result or response payload to caller
    return fallback


# Define resolve_location_name function to handle resolve location name
def resolve_location_name(
    # Define lat schema field with type Optional[float],
    lat: Optional[float],
    # Define lon schema field with type Optional[float],
    lon: Optional[float],
    # Define office_name schema field with type Optional[str] and default value
    office_name: Optional[str] = "LA ESFERA Head Office",
    # Define office_lat schema field with type Optional[float] and default value
    office_lat: Optional[float] = 19.1365,
    # Define office_lon schema field with type Optional[float] and default value
    office_lon: Optional[float] = 72.8595,
    # Define office_radius schema field with type float and default value
    office_radius: float = 1000.0,
    # Define work_mode schema field with type str and default value
    work_mode: str = "OFFICE",
    # Define client_site_name schema field with type Optional[str] and default value
    client_site_name: Optional[str] = None,
    # Define default_name schema field with type Optional[str] and default value
    default_name: Optional[str] = None,
# Execute statement to process data and maintain state
) -> str:
    """
    Determines real human-readable location using:
    1. Office Geofence (returns office name e.g. 'LA ESFERA Head Office' if inside radius <= 1000m)
    2. Client site matching if client site specified
    3. MapmyIndia (Mappls) reverse geocode (e.g. 'Mahakali Caves Road, Andheri East, Mumbai')
    4. Meaningful fallback based on work mode (Never plain 'Location Detected')
    """
    w_mode = str(work_mode or "OFFICE").strip().upper()

    # If GPS coordinates are available
    if lat is not None and lon is not None and abs(lat) > 0.0001 and abs(lon) > 0.0001:
        # Check office geofence distance (1000m threshold)
        if office_lat is not None and office_lon is not None:
            # Set dist variable to store dist value
            dist = calculate_haversine_distance(lat, lon, office_lat, office_lon)
            # Evaluate condition to control execution branch
            if dist <= (office_radius or 1000.0):
                # Return computed result or response payload to caller
                return office_name or "LA ESFERA Head Office"

        # Reverse geocode to real address (e.g. "Andheri East, Mumbai")
        real_addr = reverse_geocode(lat, lon)
        # Check if target condition is false or object is missing
        if real_addr and not real_addr.startswith("GPS ("):
            # Evaluate condition to control execution branch
            if w_mode == "CLIENT_SITE" and client_site_name:
                # Return computed result or response payload to caller
                return f"{client_site_name} ({real_addr})"
            # Return computed result or response payload to caller
            return real_addr
        # Evaluate alternate branch condition
        elif real_addr:
            # Evaluate condition to control execution branch
            if w_mode == "OFFICE":
                # Return computed result or response payload to caller
                return office_name or default_name or real_addr
            # Evaluate condition to control execution branch
            if w_mode == "CLIENT_SITE" and client_site_name:
                # Return computed result or response payload to caller
                return client_site_name
            # Return computed result or response payload to caller
            return real_addr

    # If GPS coordinates unavailable
    if w_mode == "OFFICE":
        # Return computed result or response payload to caller
        return office_name or default_name or "Office HQ"
    # Evaluate alternate branch condition
    elif w_mode == "CLIENT_SITE":
        # Return computed result or response payload to caller
        return client_site_name or "Client Site"
    # Evaluate alternate branch condition
    elif w_mode in ("WFH", "WORK_FROM_HOME"):
        # Return computed result or response payload to caller
        return default_name or "Remote / Home"

    # Return computed result or response payload to caller
    return default_name or office_name or "Office HQ"


# Define format_punch_location function to handle format punch location
def format_punch_location(loc_input, lat: Optional[float] = None, lon: Optional[float] = None, default_loc: Optional[str] = None) -> str:
    """Converts raw location input (coordinates dict/string) into a resolved dynamic address using MapmyIndia."""
    if not loc_input and lat is None and lon is None:
        # Return computed result or response payload to caller
        return default_loc or ""

    # 1. Prioritize explicit GPS coordinates with MapmyIndia
    if lat is not None and lon is not None and abs(lat) > 0.0001 and abs(lon) > 0.0001:
        addr = reverse_geocode(lat, lon)
        if addr and not addr.startswith("GPS ("):
            return addr

    # 2. Check if loc_input contains raw coordinates (e.g. "19.1104, 72.8878" or dict)
    p_lat, p_lon = parse_coordinates(loc_input)
    if p_lat is not None and p_lon is not None and abs(p_lat) > 0.0001 and abs(p_lon) > 0.0001:
        addr = reverse_geocode(p_lat, p_lon)
        if addr and not addr.startswith("GPS ("):
            return addr

    # 3. If already a human-readable address string
    s = str(loc_input or "").strip()
    if s and s.lower() not in ("location detected", "none", "null", "—", "-"):
        return s

    return default_loc or s or ""


