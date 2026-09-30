// ─────────────────────────────────────────────
// Design Tokens — shared across all screens
// ─────────────────────────────────────────────
import { Platform } from 'react-native';

export const COLORS = {
  // Backgrounds & Canvas (exact website: #f6f6fa)
  bg: '#f6f6fa',
  canvas: '#f6f6fa',
  surface: '#ffffff',
  surfaceElevated: '#fafaff',
  surfaceSunken: '#f1eff6',
  surfaceSubtle: '#f0ebff',

  // Borders (exact website: #e8e8ef / #dfe1eb)
  border: '#e8e8ef',
  borderLight: '#f1f1f7',
  borderStrong: '#dfe1eb',

  // Text (exact website: #17182a, #544c63, #767b90)
  textPrimary: '#17182a',
  textSecondary: '#544c63',
  textMuted: '#767b90',
  textDim: '#9ca1b2',
  textInverse: '#ffffff',

  // Brand Primary (exact website: #7445ef / #6d44f5 with gradient to #9c70ff)
  primary: '#7445ef',
  primaryDark: '#6135d6',
  primaryLight: '#9c70ff',
  primarySubtle: '#f0ebff',
  primaryBorder: '#dfd5ff',

  // Aliases for compatibility across existing screens
  blue: '#7445ef',
  blueLight: '#7445ef',
  blueGlow: '#9c70ff',
  purple: '#7445ef',
  purpleLight: '#9c70ff',

  // Attendance & Status vocabulary (exact website: --state-present: #059669, --state-late: #d97706, --state-absent: #dc2626, --state-leave: #0284c7)
  success: '#059669',
  successBg: '#ecfdf5',
  warning: '#d97706',
  warningBg: '#fffbeb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  info: '#0284c7',
  infoBg: '#f0f9ff',
  pending: '#7445ef',
  pendingBg: '#f0ebff',

  // Card shadow
  shadow: '#1f1845',
};

export const RADII = {
  xs: 6, sm: 10, md: 14, lg: 18, xl: 22, full: 999,
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 20, xl: 24, xxl: 32,
};

export const TYPOGRAPHY = {
  h1: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  h2: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  h3: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  h4: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  body: { fontSize: 14, fontWeight: '400', color: COLORS.textSecondary },
  bodySmall: { fontSize: 12, fontWeight: '400', color: COLORS.textSecondary },
  caption: { fontSize: 11, fontWeight: '500', color: COLORS.textMuted },
  label: { fontSize: 13, fontWeight: '600', color: '#cbd5e1' },
};

// Platform-specific safe top padding
export const HEADER_TOP = Platform.OS === 'ios' ? 50 : 44;

// Safe value extractor for leave balances / counts (prevents rendering {total, used, available} objects)
export function getLeaveCount(val, defaultVal = 0) {
  if (val == null) return defaultVal;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return isNaN(n) ? val : n;
  }
  if (typeof val === 'object') {
    return val.available ?? val.total ?? val.balance ?? defaultVal;
  }
  return defaultVal;
}

// Role-based navigation config (exact matching web portal role experiences)
export const ROLE_NAV = {
  admin: [
    { id: 'adminDashboard', icon: '📊', label: 'Dashboard' },
    { id: 'allAttendance', icon: '👥', label: 'Attendance' },
    { id: 'leaveApprovals', icon: '✅', label: 'Approvals' },
    { id: 'attendance', icon: '📍', label: 'My Punch' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ],
  manager: [
    { id: 'managerDashboard', icon: '📊', label: 'Dashboard' },
    { id: 'teamAttendance', icon: '👥', label: 'Team Att.' },
    { id: 'leaveApprovals', icon: '✅', label: 'Approvals' },
    { id: 'attendance', icon: '📍', label: 'My Punch' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ],
  teamleader: [
    { id: 'teamDashboard', icon: '📊', label: 'Team' },
    { id: 'teamAttendance', icon: '👥', label: 'Team Att.' },
    { id: 'leaveApprovals', icon: '✅', label: 'Approvals' },
    { id: 'attendance', icon: '📍', label: 'My Punch' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ],
  employee: [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'attendance', icon: '📍', label: 'Punch' },
    { id: 'regularization', icon: '🔄', label: 'Regularize' },
    { id: 'leaves', icon: '📅', label: 'Leave' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ],
};

// All quick nav items by role
export const QUICK_NAV = {
  admin: [
    { id: 'adminDashboard', icon: '📊', label: 'Admin Dashboard', color: '#7c3aed' },
    { id: 'attendance', icon: '📍', label: 'Attendance', color: '#2563eb' },
    { id: 'allAttendance', icon: '👥', label: 'All Attendance', color: '#0891b2' },
    { id: 'leaves', icon: '📅', label: 'Leave', color: '#7c3aed' },
    { id: 'leaveApprovals', icon: '✅', label: 'Leave Approvals', color: '#059669' },
    { id: 'salary', icon: '💰', label: 'Payroll', color: '#059669' },
    { id: 'tasks', icon: '✅', label: 'Tasks', color: '#d97706' },
    { id: 'regularization', icon: '🔄', label: 'Regularize', color: '#dc2626' },
    { id: 'directory', icon: '👥', label: 'Employees', color: '#0891b2' },
    { id: 'geoLocation', icon: '🗺️', label: 'Geo Location', color: '#7c3aed' },
    { id: 'tickets', icon: '🎫', label: 'All Tickets', color: '#be185d' },
    { id: 'policies', icon: '📋', label: 'Policies', color: '#4f46e5' },
    { id: 'holidays', icon: '🏖️', label: 'Holidays', color: '#065f46' },
    { id: 'reports', icon: '📈', label: 'Reports', color: '#dc2626' },
    { id: 'profile', icon: '👤', label: 'Profile', color: '#9333ea' },
  ],
  manager: [
    { id: 'managerDashboard', icon: '📊', label: 'Dashboard', color: '#7c3aed' },
    { id: 'attendance', icon: '📍', label: 'Attendance', color: '#2563eb' },
    { id: 'teamAttendance', icon: '👥', label: 'Team Attendance', color: '#0891b2' },
    { id: 'leaves', icon: '📅', label: 'My Leave', color: '#7c3aed' },
    { id: 'leaveApprovals', icon: '✅', label: 'Leave Approvals', color: '#059669' },
    { id: 'regularization', icon: '🔄', label: 'Regularize', color: '#dc2626' },
    { id: 'tasks', icon: '✅', label: 'Tasks', color: '#d97706' },
    { id: 'directory', icon: '👥', label: 'Employees', color: '#0891b2' },
    { id: 'tickets', icon: '🎫', label: 'Tickets', color: '#be185d' },
    { id: 'policies', icon: '📋', label: 'Policies', color: '#4f46e5' },
    { id: 'holidays', icon: '🏖️', label: 'Holidays', color: '#065f46' },
    { id: 'profile', icon: '👤', label: 'Profile', color: '#9333ea' },
  ],
  teamleader: [
    { id: 'teamDashboard', icon: '📊', label: 'Team Dashboard', color: '#7c3aed' },
    { id: 'attendance', icon: '📍', label: 'Attendance', color: '#2563eb' },
    { id: 'teamAttendance', icon: '👥', label: 'Team Attendance', color: '#0891b2' },
    { id: 'leaves', icon: '📅', label: 'My Leave', color: '#7c3aed' },
    { id: 'leaveApprovals', icon: '✅', label: 'Team Leave', color: '#059669' },
    { id: 'regularization', icon: '🔄', label: 'Regularize', color: '#dc2626' },
    { id: 'tasks', icon: '✅', label: 'Tasks', color: '#d97706' },
    { id: 'directory', icon: '👥', label: 'Directory', color: '#0891b2' },
    { id: 'tickets', icon: '🎫', label: 'Tickets', color: '#be185d' },
    { id: 'holidays', icon: '🏖️', label: 'Holidays', color: '#065f46' },
    { id: 'profile', icon: '👤', label: 'Profile', color: '#9333ea' },
  ],
  employee: [
    { id: 'attendance', icon: '📍', label: 'Attendance', color: '#2563eb' },
    { id: 'leaves', icon: '📅', label: 'Leave', color: '#7c3aed' },
    { id: 'salary', icon: '💰', label: 'Payslips', color: '#059669' },
    { id: 'tasks', icon: '✅', label: 'Tasks', color: '#d97706' },
    { id: 'regularization', icon: '🔄', label: 'Regularize', color: '#dc2626' },
    { id: 'directory', icon: '👥', label: 'Directory', color: '#0891b2' },
    { id: 'policies', icon: '📋', label: 'Policies', color: '#4f46e5' },
    { id: 'tickets', icon: '🎫', label: 'Tickets', color: '#be185d' },
    { id: 'holidays', icon: '🏖️', label: 'Holidays', color: '#065f46' },
    { id: 'profile', icon: '👤', label: 'Profile', color: '#9333ea' },
  ],
};

export const getRoleLabel = (role) => {
  const r = (role || '').toLowerCase();
  if (r === 'admin') return 'Administrator';
  if (r === 'manager') return 'Manager';
  if (r === 'teamleader') return 'Team Leader';
  return 'Employee';
};

export const normalizeRole = (role) => {
  const r = (role || '').toLowerCase().replace(/\s/g, '');
  if (r === 'admin' || r === 'administrator') return 'admin';
  if (r === 'manager') return 'manager';
  if (r === 'teamleader' || r === 'team_leader' || r === 'tl') return 'teamleader';
  return 'employee';
};
