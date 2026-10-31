// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - API.JS
// Path: Frontend/hrms-frontend/src/pages/EmployeePortal/api.js
// Purpose: Web portal page component managing 'api' views, user interactions, and state.
// ==============================================================================

import { apiRequest, getApiUrl, authHeaders } from '../../services/apiClient';

export async function fetchApi(endpoint, options = {}) {
  return await apiRequest(endpoint, options);
}

// API Methods
export const api = {
  // Auth
  login: (data) => fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp: (data) => fetchApi('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
  resendOtp: (data) => fetchApi('/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  getDashboardSummary: () => fetchApi('/dashboard/summary'),

  // Profile & Employees
  getMyProfile: () => fetchApi('/profile/me'),
  updateProfile: (empCode, data) => fetchApi(`/profile/${encodeURIComponent(empCode)}`, { method: 'PUT', body: JSON.stringify(data) }),
  getEmployees: () => fetchApi('/profile/employees/'),
  getEmployeeStats: () => fetchApi('/profile/employees/stats'),
  getEmployeeAttendanceSummary: (empCode) => fetchApi(`/attendance/summary/${encodeURIComponent(empCode)}`),
  getEmployeeAttendance: (empCode) => fetchApi(`/attendance/employee/${encodeURIComponent(empCode)}`),

  // Attendance
  getAttendanceRecords: () => fetchApi('/attendance/records'),
  getMonthlyAttendanceSummary: (year, month, range = 4) => {
    const q = [];
    if (year) q.push(`year=${year}`);
    if (month) q.push(`month=${month}`);
    if (range) q.push(`range_months=${range}`);
    const qs = q.length > 0 ? `?${q.join('&')}` : '';
    return fetchApi(`/attendance/monthly-summary${qs}`);
  },
  getAdminTodayAttendance: () => fetchApi('/attendance/admin/today'),
  getTodayAttendance: () => fetchApi('/attendance/today'),
  punchAttendance: (data) => fetchApi('/attendance/punch', { method: 'POST', body: JSON.stringify(data) }),
  resetTodayAttendance: () => fetchApi('/attendance/reset-today', { method: 'POST' }),
  getRegularizations: () => fetchApi('/regularization/me'),
  submitRegularization: (data) => fetchApi('/regularization/', { method: 'POST', body: JSON.stringify(data) }),

  // Leave
  getLeaveApplications: () => fetchApi('/leave/applications'),
  applyLeave: (data) => {
    let empCode = localStorage.getItem('emp_code') || '';
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!empCode) empCode = user.employeeId || user.emp_code || user.id || '';
    } catch { }

    const payload = {
      emp_code: data.emp_code || empCode || 'EMP001',
      category: data.category || data.type || 'Casual Leave',
      type: data.type || data.category || 'Casual Leave',
      start_date: data.start_date || data.from || data.fromDate,
      end_date: data.end_date || data.to || data.toDate,
      from: data.from || data.fromDate || data.start_date,
      to: data.to || data.toDate || data.end_date,
      total_days: Number(data.total_days ?? data.days ?? 1),
      days: String(data.days ?? data.total_days ?? 1),
      reason: data.reason || '',
      has_half_days: Boolean(data.has_half_days || data.halfDay === 'Yes'),
      half_day_details: data.half_day_details || null,
    };
    return fetchApi('/leave/apply', { method: 'POST', body: JSON.stringify(payload) });
  },
  getLeaveBalance: () => fetchApi('/leave/balance'),
  getCompOffs: () => fetchApi('/leave/comp-off'),
  getHolidays: () => fetchApi('/leave/holidays'),

  // Payslips
  getPayslips: () => fetchApi('/payslips'),

  // Announcements
  getAnnouncements: () => fetchApi('/announcements'),

  // Work Location & Permissions
  getMyWorkLocationPermissions: () => fetchApi('/work-locations/my-permissions'),
  getActiveClientSites: () => fetchApi('/work-locations/client-sites'),

  // Notifications / Alerts
  getNotifications: () => fetchApi('/notifications/me').catch(() => []),
  getUnreadCount: () => fetchApi('/notifications/unread-count').catch(() => ({ unread_count: 0 })),
  markNotificationRead: (id) => fetchApi(`/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {}),
  markAllNotificationsRead: () => fetchApi('/notifications/read-all', { method: 'PATCH' }).catch(() => {}),
};

export default api;
