import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ManagerAuthProvider } from "../auth/ManagerAuthContext";
import { ManagerProtectedRoute } from "../auth/ManagerProtectedRoute";
import { ManagerLayout } from "../layouts/ManagerLayout";

/* Pages */
import { ManagerLoginPage } from "../pages/auth/ManagerLoginPage";
import { ManagerOtpPage } from "../pages/auth/ManagerOtpPage";
import { ManagerDashboard } from "../pages/dashboard/ManagerDashboard";
import { TeamAttendance } from "../pages/attendance/TeamAttendance";
import { AttendanceRecords } from "../pages/attendance/AttendanceRecords";
import { AttendanceLogs } from "../pages/attendance/AttendanceLogs";
import { RegularizationApprovals } from "../pages/approvals/RegularizationApprovals";
import { LeaveApprovals } from "../pages/approvals/LeaveApprovals";
import { TeamCalendar } from "../pages/schedule/TeamCalendar";
import { ShiftManagement } from "../pages/schedule/ShiftManagement";
import { AttendanceReports } from "../pages/reports/AttendanceReports";
import { TeamMembers } from "../pages/team/TeamMembers";
import { TeamMemberDetail } from "../pages/team/TeamMemberDetail";
import { ManagerProfile } from "../pages/profile/ManagerProfile";
import { ManagerNotifications } from "../pages/profile/ManagerNotifications";
import { ManagerSettings } from "../pages/profile/ManagerSettings";
import { ManagerChangePassword } from "../pages/profile/ManagerChangePassword";

export const ManagerRoutes = () => {
  return (
    <ManagerAuthProvider>
      <Routes>
        {/* Index route */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Public Auth Routes -> Redirect to ONE Common Login */}
        <Route path="login" element={<Navigate to="/login" replace />} />
        <Route path="otp" element={<Navigate to="/otp" replace />} />

        {/* Protected Manager Application Routes */}
        <Route
          path="dashboard"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <ManagerDashboard />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />

        {/* Team Attendance */}
        <Route
          path="attendance/live"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <TeamAttendance />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="attendance/records"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <AttendanceRecords />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="attendance/logs"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <AttendanceLogs />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />
        <Route path="attendance" element={<Navigate to="/manager/attendance/live" replace />} />

        {/* Approvals */}
        <Route
          path="approvals/regularization"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <RegularizationApprovals />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="approvals/leave"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <LeaveApprovals />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />
        <Route path="approvals" element={<Navigate to="/manager/approvals/regularization" replace />} />

        {/* Schedule & Shifts */}
        <Route
          path="calendar"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <TeamCalendar />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="shifts"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <ShiftManagement />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />

        {/* Team Directory */}
        <Route
          path="team"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <TeamMembers />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="team/:memberId"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <TeamMemberDetail />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />

        {/* Reports */}
        <Route
          path="reports"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <AttendanceReports />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />

        {/* Profile & Settings */}
        <Route
          path="notifications"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <ManagerNotifications />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <ManagerProfile />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <ManagerSettings />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="change-password"
          element={
            <ManagerProtectedRoute>
              <ManagerLayout>
                <ManagerChangePassword />
              </ManagerLayout>
            </ManagerProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/manager/dashboard" replace />} />
      </Routes>
    </ManagerAuthProvider>
  );
};

export default ManagerRoutes;
