/* ==========================================================================
   MANAGER API SERVICE
   Centralised fetch layer for all Manager Portal live API calls.
   Supports dynamic host resolution and fallback to 127.0.0.1 / localhost.
   ========================================================================== */

const liveBackend = (import.meta.env?.VITE_API_URL || "https://quickchex-backend.onrender.com").replace(/\/$/, "");

const primaryHost = (
  typeof window !== "undefined" &&
  window.location.hostname &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
) ? 'http://127.0.0.1:8000' : liveBackend;

const hosts = ["", primaryHost, liveBackend, "http://127.0.0.1:8000", "http://localhost:8000"];
const uniqueHosts = [...new Set(hosts.filter(Boolean))];

/** Returns the Bearer token stored by the auth system */
const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("manager_token") ||
  localStorage.getItem("access_token") ||
  "";

/** Generic authenticated fetch with fallback — throws on non-2xx */
const apiFetch = async (path, options = {}) => {
  const token = getToken();
  let lastErr;
  for (const host of uniqueHosts) {
    try {
      const url = /^https?:\/\//i.test(host) ? `${host}${path}` : `http://${host}${path}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });
      if (res.ok) {
        return await res.json();
      }
      const text = await res.text().catch(() => res.statusText);
      throw new Error(text || `HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
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

/** GET /api/v1/manager/attendance — today's or date-specific team attendance */
export const getTodayAttendance = (dateStr) =>
  apiFetch(`/api/v1/manager/attendance${dateStr ? `?date_str=${dateStr}` : ''}`)
    .catch(() => apiFetch("/api/v1/attendance/admin/today"));

export const getTeamAttendance = (dateStr) =>
  apiFetch(`/api/v1/manager/attendance${dateStr ? `?date_str=${dateStr}` : ''}`);

/** GET /api/v1/manager/attendance/matrix — monthly matrix for all team members */
export const getAttendanceMatrix = (month, year) => {
  const params = new URLSearchParams();
  if (month) params.append("month", month);
  if (year) params.append("year", year);
  const qs = params.toString();
  return apiFetch(`/api/v1/manager/attendance/matrix${qs ? `?${qs}` : ''}`);
};

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

/** GET /api/v1/manager/regularization — pending + history for manager's team */
export const getRegularizationRequests = () =>
  apiFetch("/api/v1/manager/regularization")
    .catch(() => apiFetch("/api/v1/regularization/all"));

/** Approve regularization */
export const approveRegularization = (id) =>
  apiFetch(`/api/v1/manager/regularization/${id}/approve`, { method: "POST" })
    .catch(() => apiFetch(`/api/v1/regularization/${id}/status`, { method: "PUT", body: JSON.stringify({ status: "Approved" }) }));

/** Reject regularization */
export const rejectRegularization = (id, remarks) => {
  const qs = remarks ? `?remarks=${encodeURIComponent(remarks)}` : '';
  return apiFetch(`/api/v1/manager/regularization/${id}/reject${qs}`, {
    method: "POST",
    body: JSON.stringify({ remarks, reason: remarks, comment: remarks }),
  }).catch(() =>
    apiFetch(`/api/v1/regularization/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "Rejected", remarks, comment: remarks }),
    })
  );
};

/* -------------------------------------------------------------------------- */
/*  LEAVES                                                                     */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/manager/leaves — leave requests for manager's team */
export const getTeamLeaves = (empCode) =>
  apiFetch("/api/v1/manager/leaves")
    .catch(() => apiFetch(`/api/v1/leaves/team/${empCode || 'MGR001'}`));

/** POST /api/v1/manager/leaves/{id}/approve */
export const approveLeave = (id) =>
  apiFetch(`/api/v1/manager/leaves/${id}/approve`, { method: "POST" })
    .catch(() => apiFetch(`/api/v1/leaves/${id}/approve`, { method: "PUT" }));

/** POST /api/v1/manager/leaves/{id}/reject */
export const rejectLeave = (id, remarks) =>
  apiFetch(`/api/v1/manager/leaves/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ remarks })
  }).catch(() => apiFetch(`/api/v1/leaves/${id}/reject`, { method: "PUT" }));

/** GET /api/v1/manager/leave-balances */
export const getTeamLeaveBalances = () => apiFetch("/api/v1/manager/leave-balances");

/* -------------------------------------------------------------------------- */
/*  COMP-OFFS & APPLICATIONS                                                   */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/manager/applications */
export const getTeamApplications = () => apiFetch("/api/v1/manager/applications");

/** GET /api/v1/manager/compoffs */
export const getTeamCompOffs = () => apiFetch("/api/v1/manager/compoffs");

/** GET /api/v1/manager/team-compoffs */
export const getTeamCompOffBalances = () => apiFetch("/api/v1/manager/team-compoffs");

/* -------------------------------------------------------------------------- */
/*  NOTIFICATIONS                                                              */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/notifications/me — all notifications for logged-in user */
export const getNotifications = () => apiFetch("/api/v1/notifications/me").catch(() => []);

/** PUT /api/v1/notifications/{id}/read */
export const markNotificationRead = (id) =>
  apiFetch(`/api/v1/notifications/${id}/read`, { method: "PUT" }).catch(() => {});

/** PUT /api/v1/notifications/read-all */
export const markAllNotificationsRead = () =>
  apiFetch("/api/v1/notifications/read-all", { method: "PUT" }).catch(() => {});
