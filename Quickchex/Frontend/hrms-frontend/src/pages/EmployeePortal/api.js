const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.hostname ? `http://${window.location.hostname}:8000` : (import.meta.env?.VITE_API_URL || 'http://localhost:8000')).replace(/\/$/, '');

function getAuthHeaders() {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('manager_token');
  let empCode =
    localStorage.getItem('emp_code') ||
    localStorage.getItem('empCode') ||
    '';
  let email =
    localStorage.getItem('loginEmail') ||
    localStorage.getItem('rememberedLoginEmail') ||
    localStorage.getItem('email') ||
    '';

  try {
    const user =
      JSON.parse(localStorage.getItem('user') || 'null') ||
      JSON.parse(localStorage.getItem('userData') || 'null') ||
      {};
    if (!empCode) empCode = user.employeeId || user.emp_code || user.empCode || user.id || '';
    if (!email) email = user.email || '';
  } catch { }

  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(empCode ? { 'x-emp-code': empCode, 'x-employee-id': empCode } : {}),
    ...(email ? { 'x-user-email': email, 'x-login-email': email } : {}),
  };
}

export async function fetchApi(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.message || errData.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`API call to ${endpoint} failed:`, err.message);
    throw err;
  }
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
  punchAttendance: (data) => fetchApi('/attendance/punch', { method: 'POST', body: JSON.stringify(data) }),
  resetTodayAttendance: () => fetchApi('/attendance/reset-today', { method: 'POST' }),
  getRegularizations: () => fetchApi('/attendance/regularization'),
  submitRegularization: (data) => fetchApi('/attendance/regularization', { method: 'POST', body: JSON.stringify(data) }),

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
};

export default api;
