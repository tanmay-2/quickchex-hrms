// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - MANAGERAPISERVICE.JS
// Path: Frontend/hrms-frontend/src/manager-portal/services/managerApiService.js
// Purpose: API network client service coordinating HTTP requests and caching for 'managerApiService'.
// Key Functions & Handlers:
//   • apiFetch()
//   • getTeam()
//   • getDashboardStats()
//   • getTodayAttendance()
//   • getTeamAttendance()
//   • getMyTodayAttendance()
//   • punchAttendance()
//   • getAttendanceMatrix()
//   • ... and 17 more handlers
// ==============================================================================

/* ==========================================================================
   MANAGER API SERVICE
   Centralised fetch layer for all Manager Portal live API calls.
   Supports dynamic host resolution and fallback to 127.0.0.1 / localhost.
   ========================================================================== */

import { apiRequest, getApiUrl } from "../../services/apiClient";

/** Generic authenticated fetch using centralized API client */
const apiFetch = async (path, options = {}) => {
  return await apiRequest(path, options);
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

/** GET /api/v1/attendance/today — active user's own punch record for today */
export const getMyTodayAttendance = () => apiFetch("/api/v1/attendance/today");

/** POST /api/v1/attendance/punch — punch in or out */
export const punchAttendance = (data) =>
  apiFetch("/api/v1/attendance/punch", {
    method: "POST",
    body: JSON.stringify(data),
  });

/** GET /api/v1/manager/attendance/matrix — monthly matrix for all team members */
export const getAttendanceMatrix = (month, year) => {
  const params = new URLSearchParams();
  if (month) params.append("month", month);
  if (year) params.append("year", year);
  const qs = params.toString();
  return apiFetch(`/api/v1/manager/attendance/matrix${qs ? `?${qs}` : ''}`);
};

/** GET /api/v1/attendance/monthly-summary — monthly records matching exact layout for selected member */
export const getMemberAttendanceSummary = (empCode, year, month) => {
  const params = new URLSearchParams();
  if (year) params.append("year", year);
  if (month) params.append("month", month);
  if (empCode && empCode !== "all") params.append("emp_code", empCode);
  const qs = params.toString();
  return apiFetch(`/api/v1/attendance/monthly-summary${qs ? `?${qs}` : ''}`);
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
  if (params.work_mode && params.work_mode !== "all") query.append("work_mode", params.work_mode);
  if (params.client_site && params.client_site !== "all") query.append("client_site", params.client_site);
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

/** GET /api/v1/leaves/team/{empCode} or /api/v1/leave/applications */
export const getTeamLeaves = (empCode) =>
  apiFetch(`/api/v1/leaves/team/${empCode || 'MGR001'}`)
    .then((data) => (Array.isArray(data) && data.length > 0 ? data : apiFetch("/api/v1/leave/applications")))
    .catch(() => apiFetch("/api/v1/leave/applications").catch(() => []));

/** POST/PUT /api/v1/leaves/{id}/approve */
export const approveLeave = (id) =>
  apiFetch(`/api/v1/leaves/${id}/approve`, { method: "POST" })
    .catch(() => apiFetch(`/api/v1/leave/${id}/approve`, { method: "PUT" }));

/** POST/PUT /api/v1/leaves/{id}/reject */
export const rejectLeave = (id, remarks) => {
  const qs = remarks ? `?remarks=${encodeURIComponent(remarks)}` : '';
  return apiFetch(`/api/v1/leaves/${id}/reject${qs}`, {
    method: "POST",
    body: JSON.stringify({ remarks })
  }).catch(() =>
    apiFetch(`/api/v1/leave/${id}/reject${qs}`, {
      method: "PUT",
      body: JSON.stringify({ remarks })
    })
  );
};

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

/** GET /api/v1/notifications/unread-count */
export const getUnreadCount = () =>
  apiFetch("/api/v1/notifications/unread-count").catch(() => ({ unread_count: 0 }));

/** GET /api/v1/leave/holidays — list of company holidays */
export const getHolidays = () =>
  apiFetch("/api/v1/leave/holidays")
    .catch(() => apiFetch("/api/v1/calendar?status_filter=HOLIDAY"))
    .catch(() => []);

