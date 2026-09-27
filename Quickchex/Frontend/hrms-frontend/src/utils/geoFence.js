import { getApiBaseUrl } from "./apiBase";

export const GEO_STORAGE_KEY = "laesfera_geo_locations";

export const DEFAULT_OFFICE_LOCATIONS = [
  {
    id: "loc-001",
    name: "NCDEX",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Kanjur Station Road, Kanjur West, S Ward, Mumbai Zone 6, Mumbai, Mumbai Suburban District, Maharashtra, 400042, India",
    latitude: "19.13241306584792",
    longitude: "72.92787611957756",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-002",
    name: "NCDEX",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Kanjur Station Road, Kanjur West, S Ward, Mumbai Zone 6, Mumbai, Mumbai Suburban District, Maharashtra, 400042, India",
    latitude: "19.132512",
    longitude: "72.927946000001",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-003",
    name: "Jeevan Seva Building",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Swami Vivekanand Road, JEEVAN SHANTI COLONY, Vile Parle West, K/W Ward, Mumbai Zone 3, Mumbai, Mumbai Suburban District, Maharashtra, 400057, India",
    latitude: "19.0933709",
    longitude: "72.8398086",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-004",
    name: "Mittal Chambers, Nariman Point",
    city: "Mumbai",
    state: "Maharashtra",
    address: "NCPA Marg, Nariman Point, Colaba, A Ward, Mumbai Zone 1, Mumbai City District, Maharashtra, 400021, India",
    latitude: "18.9262",
    longitude: "72.8219",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-005",
    name: "LIC Colony, Suresh Colony",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Kothu Wadi, Vile Parle West, K/W Ward, Mumbai Zone 3, Mumbai, Mumbai Suburban District, Maharashtra, 400054, India",
    latitude: "19.0927141",
    longitude: "72.8404524",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-006",
    name: "Thane Hiranandani Front",
    city: "Thane",
    state: "Maharashtra",
    address: "Central Avenue, Hiranandani Estate, Brahmand Nagar, Thane, Thane Subdistrict, Thane, Maharashtra, 400607, India",
    latitude: "19.2521953",
    longitude: "72.9808554",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-007",
    name: "Cuffe Parade",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Nature's Basket, T L Waswani Road, Cuffe Parade, Colaba, A Ward, Mumbai Zone 1, Mumbai, Mumbai City District, Maharashtra, 400005, India",
    latitude: "18.9145662",
    longitude: "72.8179441",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-008",
    name: "Kandivali West",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Goregaon Link Road, Renuka Nagar, Mahavir Nagar, R/S Ward, Mumbai Zone 4, Mumbai Suburban District, Maharashtra, 400067, India",
    latitude: "19.2111092",
    longitude: "72.8356159",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-009",
    name: "Ghodbunder",
    city: "Thane",
    state: "Maharashtra",
    address: "Anand Nagar, Thane, Thane Subdistrict, Thane, Maharashtra, 400615, India",
    latitude: "19.2650059",
    longitude: "72.9630347",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-010",
    name: "FORT",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Mupanna P Shetty Marg, Kala Ghoda, Fort, Mumbai Zone 1, Mumbai City District, Maharashtra, 400032, India",
    latitude: "18.9310646",
    longitude: "72.8331541",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-011",
    name: "Palghar",
    city: "Boisar",
    state: "Maharashtra",
    address: "Boisar, Palghar Subdistrict, Palghar, Maharashtra, 401504, India",
    latitude: "19.8025181",
    longitude: "72.7573132",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-012",
    name: "Powai",
    city: "Mumbai",
    state: "Maharashtra",
    address: "New MHADA Colony Road, Tunga Village, L Ward, Mumbai Zone 5, Mumbai, Mumbai Suburban District, Maharashtra, 400087, India",
    latitude: "19.1232718",
    longitude: "72.8085564",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-013",
    name: "Thane Hiranandani",
    city: "Thane",
    state: "Maharashtra",
    address: "Regent Street, Hiranandani Estate, Waghbil, Thane, Thane Subdistrict, Thane, Maharashtra, 400607, India",
    latitude: "19.2628793",
    longitude: "72.9484532",
    radius_km: 1.0,
    status: "Active",
  },
  {
    id: "loc-014",
    name: "Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Mumbai Central business location, Maharashtra, India",
    latitude: "19.11043",
    longitude: "72.887818",
    radius_km: 1.0,
    status: "Active",
  },
];

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance into a human-friendly string (e.g., "150m" or "3.4 km").
 */
export function formatDistance(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm)) return "—";
  const meters = distanceKm * 1000;
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${distanceKm.toFixed(2)} km`;
}

/**
 * Loads registered office locations from backend or fallback local storage / defaults.
 */
export async function loadGeoFenceLocations() {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/v1/locations/geo-master?active_only=true`, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        try {
          window.localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(data));
        } catch {}
        return data;
      }
    }
  } catch (err) {
    console.warn("Backend geo locations fetch error, using local cache:", err);
  }

  // Fallback to localStorage or DEFAULT_OFFICE_LOCATIONS
  try {
    const saved = window.localStorage.getItem(GEO_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return DEFAULT_OFFICE_LOCATIONS;
}

/**
 * Gets cached locations synchronously from localStorage or defaults.
 */
export function getCachedGeoFenceLocations() {
  try {
    const saved = window.localStorage.getItem(GEO_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((loc) => !loc.status || loc.status === "Active");
      }
    }
  } catch {}
  return DEFAULT_OFFICE_LOCATIONS;
}

/**
 * Evaluates whether given coordinates are within the 1 km radius of ANY active approved location.
 * Provides instant live feedback with zero network latency.
 */
export function validateLiveLocation(latitude, longitude, locations = null) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      valid: false,
      nearest: null,
      distanceKm: null,
      distanceText: "—",
      allowedRadiusKm: 1.0,
      message: "Waiting for GPS coordinates...",
    };
  }

  const activeLocations = (locations || getCachedGeoFenceLocations()).filter(
    (loc) => !loc.status || loc.status === "Active"
  );

  if (activeLocations.length === 0) {
    return {
      valid: true,
      nearest: { name: "Office" },
      distanceKm: 0,
      distanceText: "0m",
      allowedRadiusKm: 1.0,
      message: "No geo-fences configured. Attendance permitted.",
    };
  }

  let minDistance = Infinity;
  let nearestLocation = null;

  for (const loc of activeLocations) {
    const locLat = Number(loc.latitude);
    const locLon = Number(loc.longitude);
    if (!Number.isFinite(locLat) || !Number.isFinite(locLon)) continue;

    const dist = calculateDistanceKm(lat, lon, locLat, locLon);
    if (dist < minDistance) {
      minDistance = dist;
      nearestLocation = loc;
    }
  }

  if (!nearestLocation) {
    return {
      valid: true,
      nearest: { name: "Office" },
      distanceKm: 0,
      distanceText: "0m",
      allowedRadiusKm: 1.0,
      message: "Location verified.",
    };
  }

  const allowedRadiusKm = Number(nearestLocation.radius_km || 1.0);
  const isValid = minDistance <= allowedRadiusKm;
  const distanceFormatted = formatDistance(minDistance);

  return {
    valid: isValid,
    nearest: nearestLocation,
    distanceKm: minDistance,
    distanceText: distanceFormatted,
    allowedRadiusKm,
    message: isValid
      ? `Valid Location: Within ${allowedRadiusKm} km of ${nearestLocation.name} (${distanceFormatted} away)`
      : `Invalid Location: You are ${distanceFormatted} away from nearest office (${nearestLocation.name}). Attendance must be within ${allowedRadiusKm} km.`,
  };
}

/**
 * Validates coordinates with the backend API.
 */
export async function validateLocationWithBackend(latitude, longitude) {
  const apiBase = getApiBaseUrl();
  const res = await fetch(
    `${apiBase}/api/v1/locations/validate?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`
  );
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || "Location validation failed");
  }
  return await res.json();
}
