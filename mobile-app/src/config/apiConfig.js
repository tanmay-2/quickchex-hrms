// ==============================================================================
// QUICKCHEX MOBILE APP - API CONFIGURATION & ROUTE REGISTRY (apiConfig.js)
// ==============================================================================
// This file centralizes the backend API base URL and all endpoint route paths
// used across React Native / Expo mobile screens.
// Changing API_BASE_URL here updates network requests across the entire mobile app.
// ==============================================================================

// Primary cloud backend URL hosted on Render (connected to PostgreSQL Neon database)
export const API_BASE_URL = 'https://quickchex-backend-v2.onrender.com';

// Comprehensive map of all REST endpoints grouped by business domain
export const API_ENDPOINTS = {
  // --- 1. Authentication & Session ---
  LOGIN: `${API_BASE_URL}/api/v1/auth/login`,              // Email & password credential verification
  VERIFY_OTP: `${API_BASE_URL}/api/v1/auth/verify-otp`,   // 2FA / OTP verification code submission
  RESEND_OTP: `${API_BASE_URL}/api/v1/auth/resend-otp`,   // Request a new OTP email
  ME: `${API_BASE_URL}/api/v1/profile/me`,                // Current authenticated user's profile

  // --- 2. Attendance & Punch Tracking ---
  PUNCH: `${API_BASE_URL}/api/v1/attendance/punch`,       // Check-in / Check-out with GPS & selfie image
  TODAY: `${API_BASE_URL}/api/v1/attendance/today`,       // Today's punch timestamps and current status
  TODAY_ATTENDANCE: `${API_BASE_URL}/api/v1/attendance/today`, // Compatibility alias for today's status
  RECORDS: `${API_BASE_URL}/api/v1/attendance/records`,   // Historical attendance punch list
  ADMIN_TODAY: `${API_BASE_URL}/api/v1/attendance/admin/today`, // Admin view of company-wide attendance today

  // --- 3. Dashboard Summaries ---
  DASHBOARD_SUMMARY: `${API_BASE_URL}/api/v1/dashboard/summary`, // Consolidated metrics (stats, recent punches, balances)
  ANNOUNCEMENTS: `${API_BASE_URL}/api/v1/announcements`,         // Company-wide notices and broadcast messages

  // --- 4. Leaves & Holidays ---
  LEAVE_BALANCE: `${API_BASE_URL}/api/v1/leave/balance`,   // Categorized leave balances (casual, sick, optional)
  LEAVE_APPLY: `${API_BASE_URL}/api/v1/leaves/apply`,       // Submit a new leave request application
  LEAVES_ADMIN_ALL: `${API_BASE_URL}/api/v1/leaves/admin/all`, // Admin/HR overview of all leave applications
  HOLIDAYS: `${API_BASE_URL}/api/v1/leave/holidays`,       // Official organization holiday calendar

  // --- 5. Attendance Regularization ---
  REGULARIZATION_ALL: `${API_BASE_URL}/api/v1/regularization/admin/all`, // Admin list of regularization requests
  REGULARIZATION_APPLY: `${API_BASE_URL}/api/v1/attendance/regularization`, // Apply for missed punch correction

  // --- 6. Payroll & Financials ---
  PAYSLIPS: `${API_BASE_URL}/api/v1/payslips`,             // Monthly salary slips and PDF downloads

  // --- 7. Admin & Team Management ---
  EMPLOYEES: `${API_BASE_URL}/api/v1/profile/employees/`,  // Staff directory list
  ADMIN_USERS: `${API_BASE_URL}/api/v1/admin/users`,       // Admin user list and account statuses
  ADMIN_DEPTS: `${API_BASE_URL}/api/v1/admin/departments/stats`, // Department breakdown statistics
  MANAGER_DASHBOARD: `${API_BASE_URL}/api/v1/manager/dashboard`, // Team Leader / Manager consolidated dashboard
  MANAGER_ATTENDANCE: `${API_BASE_URL}/api/v1/manager/attendance`, // Direct report team member attendance logs
  MANAGER_LEAVES: `${API_BASE_URL}/api/v1/manager/leaves`,         // Direct report leave approval inbox
  MANAGER_REGULARIZATION: `${API_BASE_URL}/api/v1/manager/regularization`, // Direct report punch regularizations

  // --- 8. Geofencing & Work Locations ---
  GEOFENCE_LOCATIONS: `${API_BASE_URL}/api/v1/locations/geo-master`, // Permitted office geofence coordinates & radius
};

export default API_BASE_URL;
