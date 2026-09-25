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
    """Reverse geocodes (lat, lon) to a human-readable location address."""
    if lat is None or lon is None:
        return "Office / GPS"

    cache_key = (round(lat, 4), round(lon, 4))
    if cache_key in _GEO_CACHE:
        return _GEO_CACHE[cache_key]

    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
        req = urllib.request.Request(url, headers={"User-Agent": "HRMS-Portal-App/2.0"})
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode("utf-8"))
            addr_data = data.get("address", {})
            road = addr_data.get("road") or addr_data.get("suburb") or ""
            suburb = addr_data.get("neighbourhood") or addr_data.get("suburb") or addr_data.get("city_district") or ""
            city = addr_data.get("city") or addr_data.get("town") or addr_data.get("county") or ""
            state = addr_data.get("state") or ""

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
        logger.warning(f"Reverse geocode lookup failed for ({lat}, {lon}): {e}")

    # Fallback to readable coordinate string
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

