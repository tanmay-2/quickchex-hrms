// Mobile App API Configuration
// Connected to the live PostgreSQL Neon database backend
export const API_BASE_URL = 'https://quickchex-backend.onrender.com';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/v1/auth/login`,
  VERIFY_OTP: `${API_BASE_URL}/api/v1/auth/verify-otp`,
  RESEND_OTP: `${API_BASE_URL}/api/v1/auth/resend-otp`,
  ME: `${API_BASE_URL}/api/v1/profile/me`,

  // Attendance (Live sync with Website)
  PUNCH: `${API_BASE_URL}/api/v1/attendance/punch`,
  TODAY: `${API_BASE_URL}/api/v1/attendance/today`,
  TODAY_ATTENDANCE: `${API_BASE_URL}/api/v1/attendance/today`,
  RECORDS: `${API_BASE_URL}/api/v1/attendance/records`,
  ADMIN_TODAY: `${API_BASE_URL}/api/v1/attendance/admin/today`,

  // Dashboard & Metrics
  DASHBOARD_SUMMARY: `${API_BASE_URL}/api/v1/dashboard/summary`,
  ANNOUNCEMENTS: `${API_BASE_URL}/api/v1/announcements`,

  // Leaves
  LEAVE_BALANCE: `${API_BASE_URL}/api/v1/leave/balance`,
  LEAVE_APPLY: `${API_BASE_URL}/api/v1/leaves/apply`,
  LEAVES_ADMIN_ALL: `${API_BASE_URL}/api/v1/leaves/admin/all`,
  HOLIDAYS: `${API_BASE_URL}/api/v1/leave/holidays`,

  // Regularization
  REGULARIZATION_ALL: `${API_BASE_URL}/api/v1/regularization/admin/all`,
  REGULARIZATION_APPLY: `${API_BASE_URL}/api/v1/attendance/regularization`,

  // Payroll & Payslips
  PAYSLIPS: `${API_BASE_URL}/api/v1/payslips`,

  // Admin & Manager
  EMPLOYEES: `${API_BASE_URL}/api/v1/profile/employees/`,
  ADMIN_USERS: `${API_BASE_URL}/api/v1/admin/users`,
  ADMIN_DEPTS: `${API_BASE_URL}/api/v1/admin/departments/stats`,
  MANAGER_DASHBOARD: `${API_BASE_URL}/api/v1/manager/dashboard`,
  MANAGER_ATTENDANCE: `${API_BASE_URL}/api/v1/manager/attendance`,
  MANAGER_LEAVES: `${API_BASE_URL}/api/v1/manager/leaves`,
  MANAGER_REGULARIZATION: `${API_BASE_URL}/api/v1/manager/regularization`,

  // Geo Location
  GEOFENCE_LOCATIONS: `${API_BASE_URL}/api/v1/locations/geo-master`,
};

export default API_BASE_URL;
