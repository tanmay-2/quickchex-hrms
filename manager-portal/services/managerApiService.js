/* ==========================================================================
   MANAGER API SERVICE
   Centralised fetch layer for all Manager Portal live API calls.
   Reads the auth token from localStorage (same key used by ManagerAuthContext).
   Base URL: http://127.0.0.1:8000  (falls back to VITE_API_URL env var)
   ========================================================================== */

const API_BASE = (
  typeof window !== "undefined" &&
  window.location.hostname &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? `http://${window.location.hostname}:8000`
    : (import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000")
).replace(/\/$/, "");

/** Returns the Bearer token stored by the auth system */
const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("manager_token") ||
  "";

/** Generic authenticated fetch — throws on non-2xx */
const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json();
};

/* -------------------------------------------------------------------------- */
/*  MANAGER / TEAM                                                             */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/manager/team — all employees under this manager */
export const getTeam = () => apiFetch("/api/v1/manager/team");

/** GET /api/v1/manager/dashboard — headline stats */
export const getDashboardStats = () => apiFetch("/api/v1/manager/dashboard");

/* -------------------------------------------------------------------------- */
/*  ATTENDANCE                                                                 */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/attendance/admin/today — today's punch records for all employees */
export const getTodayAttendance = () => apiFetch("/api/v1/attendance/admin/today");

/** GET /api/v1/manager/attendance/logs — dynamic logs with filtering, pagination, date ranges */
export const getAttendanceLogs = (params = {}) => {
  const query = new URLSearchParams();
  if (params.date) query.append("date_str", params.date);
  if (params.startDate) query.append("start_date", params.startDate);
  if (params.endDate) query.append("end_date", params.endDate);
  if (params.empCode && params.empCode !== "all") query.append("emp_code", params.empCode);
  if (params.department && params.department !== "all") query.append("department", params.department);
  if (params.status && params.status !== "all") query.append("status", params.status);
  if (params.search && params.search.trim()) query.append("search", params.search.trim());
  if (params.page) query.append("page", params.page);
  if (params.pageSize) query.append("page_size", params.pageSize);

  const qs = query.toString();
  return apiFetch(`/api/v1/manager/attendance/logs${qs ? `?${qs}` : ''}`);
};

/* -------------------------------------------------------------------------- */
/*  REGULARIZATION                                                             */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/regularization/all — pending + history for manager's team */
export const getRegularizationRequests = () => apiFetch("/api/v1/regularization/all");

/** PUT /api/v1/regularization/{id}/status — approve or reject */
export const updateRegularizationStatus = (id, status) =>
  apiFetch(`/api/v1/regularization/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

export const approveRegularization = (id) => updateRegularizationStatus(id, "Approved");
export const rejectRegularization = (id) => updateRegularizationStatus(id, "Rejected");

/* -------------------------------------------------------------------------- */
/*  LEAVES                                                                     */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/leaves/team/{tl_emp_code} — leave requests for manager's team */
export const getTeamLeaves = (empCode) => apiFetch(`/api/v1/leaves/team/${empCode}`);

/** PUT /api/v1/leaves/{id}/approve */
export const approveLeave = (id) =>
  apiFetch(`/api/v1/leaves/${id}/approve`, { method: "PUT" });

/** PUT /api/v1/leaves/{id}/reject */
export const rejectLeave = (id) =>
  apiFetch(`/api/v1/leaves/${id}/reject`, { method: "PUT" });

/* -------------------------------------------------------------------------- */
/*  NOTIFICATIONS                                                              */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/notifications/me — all notifications for logged-in user */
export const getNotifications = () => apiFetch("/api/v1/notifications/me");

/** PUT /api/v1/notifications/{id}/read */
export const markNotificationRead = (id) =>
  apiFetch(`/api/v1/notifications/${id}/read`, { method: "PUT" });

/** PUT /api/v1/notifications/read-all */
export const markAllNotificationsRead = () =>
  apiFetch("/api/v1/notifications/read-all", { method: "PUT" });
