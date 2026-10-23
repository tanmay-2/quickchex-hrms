/**
 * QUICKCHEX HRMS — CENTRALIZED PRODUCTION API CLIENT
 * 
 * Resolves API URL dynamically across:
 * - Direct Server IP deployment (e.g. http://192.168.1.50:8000)
 * - Nginx Reverse Proxy deployment (e.g. http://SERVER_IP/api)
 * - Local Development (e.g. http://localhost:5173 -> http://localhost:8000)
 * - Explicit VITE_API_URL environment variable override
 */

export function getApiBaseUrl() {
  // 1. Explicit environment variable configured at build/runtime
  const envUrl = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    let trimmed = envUrl.trim().replace(/\/$/, "");
    // If Vercel has the old suspended backend URL cached in environment variables, redirect to v2
    if (trimmed.includes("quickchex-hrms-backend.onrender.com") || trimmed.includes("quickchex-backend.onrender.com")) {
      trimmed = "https://quickchex-backend-v2.onrender.com";
    }
    // If VITE_API_URL is configured as "/api" or "/", normalize to empty so downstream /api/v1/... routes never duplicate /api
    if (trimmed === "/api" || trimmed === "/") {
      return "";
    }
    return trimmed;
  }

  // 2. Dynamic host detection in browser (supports localhost and LAN IP e.g. 192.168.x.x)
  if (typeof window !== "undefined" && window.location) {
    const { protocol, hostname, port } = window.location;

    // Running behind standard HTTP/HTTPS proxy (e.g., Nginx on port 80/443 or Vercel deployment)
    if (!port || port === "80" || port === "443") {
      if (hostname.includes("vercel.app")) {
        return "https://quickchex-backend-v2.onrender.com";
      }
      return "";
    }


    // Connect to backend port 8000. On Windows dev, 127.0.0.1 avoids IPv6 resolution delays
    const targetHost = hostname === "localhost" ? "127.0.0.1" : hostname;
    return `${protocol}//${targetHost}:8000`;
  }

  return "http://127.0.0.1:8000";
}

/**
 * Builds a fully qualified API URL for any given path, preventing duplicate prefixes.
 */
export function getApiUrl(path = "") {
  if (!path) return getApiBaseUrl();

  // If already an absolute URL, return as-is after stripping any duplicate /api/api/
  if (/^https?:\/\//i.test(path)) {
    return path.replace(/\/api\/api\//g, "/api/");
  }

  const base = getApiBaseUrl();
  let cleanPath = path.startsWith("/") ? path : `/${path}`;

  // Prevent duplicate /api/api/ within the path itself
  cleanPath = cleanPath.replace(/^\/api\/api\//, "/api/");

  // If base is empty (same-origin production reverse proxy)
  if (!base) {
    return cleanPath;
  }

  // Prevent duplicate /api when base ends with /api and path starts with /api/
  if (base.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${base}${cleanPath.substring(4)}`;
  }

  return `${base}${cleanPath}`.replace(/\/api\/api\//g, "/api/");
}

/**
 * Retrieves the currently active authentication token from storage.
 */
export function getToken() {
  if (typeof window === "undefined" || !window.localStorage) return "";
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("manager_token") ||
    ""
  );
}

/**
 * Constructs standard headers including Bearer authorization and user context.
 */
export function authHeaders(extra = {}) {
  const token = getToken();
  let empCode = "";
  let email = "";

  if (typeof window !== "undefined" && window.localStorage) {
    empCode =
      localStorage.getItem("emp_code") ||
      localStorage.getItem("empCode") ||
      localStorage.getItem("employee_id") ||
      "";

    email =
      localStorage.getItem("loginEmail") ||
      localStorage.getItem("rememberedLoginEmail") ||
      localStorage.getItem("email") ||
      "";

    try {
      const u = JSON.parse(localStorage.getItem("user") || "null") ||
                JSON.parse(localStorage.getItem("userData") || "null") || {};
      if (!empCode) empCode = u.emp_code || u.employeeId || u.empCode || u.id || "";
      if (!email) email = u.email || "";
    } catch {
      // Ignored
    }
  }

  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };

  if (empCode) {
    headers["x-emp-code"] = empCode;
    headers["x-employee-id"] = empCode;
  }
  if (email) {
    headers["x-user-email"] = email;
    headers["x-login-email"] = email;
  }

  return headers;
}

/**
 * Executes a network request with centralized URL and header handling.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = authHeaders({
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  });

  // Guard against hanging requests with a 15-second timeout
  let timeoutId = null;
  let customSignal = options.signal;
  if (!customSignal && typeof AbortController !== "undefined") {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 15000);
    customSignal = controller.signal;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: customSignal,
    });
  } catch (networkErr) {
    if (networkErr?.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after 15s.`);
    }
    // If fetching failed due to localhost vs 127.0.0.1 mismatch, attempt retry with alternate loopback
    let fallbackSuccess = false;
    if (url.includes('localhost:8000')) {
      const altUrl = url.replace('localhost:8000', '127.0.0.1:8000');
      try {
        response = await fetch(altUrl, { ...options, headers });
        fallbackSuccess = true;
      } catch {}
    } else if (url.includes('127.0.0.1:8000')) {
      const altUrl = url.replace('127.0.0.1:8000', 'localhost:8000');
      try {
        response = await fetch(altUrl, { ...options, headers });
        fallbackSuccess = true;
      } catch {}
    }
    if (!fallbackSuccess || !response) {
      throw new Error(`Failed to fetch from backend at ${url}. Please verify that backend is running on port 8000.`);
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => null);
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  // Guard against SPA catch-all router returning index.html for API requests
  if (typeof data === "string" && (data.trim().startsWith("<!DOCTYPE") || data.trim().startsWith("<html") || data.trim().startsWith("<!doctype"))) {
    const error = new Error(`API endpoint '${url}' returned HTML instead of expected JSON data. Please verify your backend server status or VITE_API_URL.`);
    error.status = response.status;
    error.isHtmlResponse = true;
    throw error;
  }

  if (!response.ok) {
    const errorMsg =
      data?.detail ||
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;
    const error = new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Completely purges all auth session artifacts across admin, manager, and employee keys.
 */
export function clearAuthSession() {
  if (typeof window === "undefined" || !window.localStorage) return;
  const authKeys = [
    "token",
    "authToken",
    "accessToken",
    "access_token",
    "user",
    "userData",
    "currentUser",
    "loginData",
    "user_name",
    "role",
    "emp_code",
    "empCode",
    "employee_id",
    "designation",
    "profile_image",
    "manager_token",
    "manager_user",
  ];
  authKeys.forEach((k) => localStorage.removeItem(k));
  if (window.sessionStorage) {
    window.sessionStorage.clear();
  }
}

export const apiClient = {
  getBaseUrl: getApiBaseUrl,
  getUrl: getApiUrl,
  getToken,
  getHeaders: authHeaders,
  clearAuthSession,
  request: apiRequest,
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (endpoint, body, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: "DELETE" }),
};

export default apiClient;

