import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import LoginPage from "./pages/Login/loginPage";
import OtpPage from "./pages/Login/OtpPage";
import ResetPassword from "./pages/Login/ResetPassword";
import ChangePasswordModal from "./components/ChangePasswordModal";

import Dashboard from "./pages/Admin/Dashboard";
import Profile from "./pages/Profile/Profile";
import CompanyPolicies from "./pages/Dashboard/CompanyPolicies";
import LeaveApplication from "./pages/Dashboard/LeaveApplication";

import Attendance from "./pages/Attendance/Attendance"; // ✅ correct import
import ViewAllAttendance from "./pages/Attendance/ViewAllAttendance"; // ✅ correct import


import { DashboardShell } from "./components/header/DashboardHeader";

// Admin Pages
import Departments from "./pages/Dashboard/Departments";
import AllTickets from "./pages/Admin/AllTickets";
import Tickets_emp from "./pages/Dashboard/Tickets_emp";
import Holidays from "./pages/Dashboard/Holidays";
import Salary from "./pages/Dashboard/Salary";
import PayrollItems from "./pages/Dashboard/PayrollItems";
import Resignation from "./pages/Dashboard/Resignation";
import Termination from "./pages/Dashboard/Termination";
import NoticePeriod from "./pages/Dashboard/NoticePeriod";
import Dashboard_emp from "./pages/Dashboard/Dashboard_emp";
import EmployeeLayout from "./pages/EmployeePortal/components/Layout";
import EmployeePortalDashboard from "./pages/EmployeePortal/pages/Dashboard";
import EmployeePortalDirectory from "./pages/EmployeePortal/pages/EmployeeDirectory";
import EmployeePortalGenericPage from "./pages/EmployeePortal/pages/GenericPage";
import EmployeePortalProfile from "./pages/EmployeePortal/pages/Profile";
import EmployeeDirectory from "./pages/Admin/EmployeeDirectory";
import EmployeeProfileDetails from "./pages/Admin/EmployeeProfileDetails";
import RegularizationPage from "./pages/Dashboard/RegularizationPage";
import DailyTaskPage from "./pages/Dashboard/DailyTaskPage";
import AllEmpAttendance from "./pages/Admin/AllEmpAttendance";
import GeoLocationMasterPage from "./pages/Admin/GeoLocationMaster";

import AlertPage from "./pages/Admin/AlertPage";
import EmploymentContracts from "./pages/Admin/EmploymentContracts";
import DeviceRegistration from "./pages/Admin/DeviceRegistration";
import AttendanceLogs from "./pages/Dashboard/AttendanceLogs";
import AttendanceFinalization from "./pages/Dashboard/AttendanceFinalization";
import AttendanceRecord from "./pages/Dashboard/AttendanceRecord";
import AttendanceAudit from "./pages/Dashboard/AttendanceAudit";
import TimesheetRequests from "./pages/Admin/TimesheetRequests";
import TimesheetRecords from "./pages/Admin/TimesheetRecords";
import TimesheetManagement from "./pages/Admin/TimesheetManagement";
import LeaveBalances from "./pages/Admin/LeaveBalances";
import Rollovers from "./pages/Admin/Rollovers";
import Reports from "./pages/Admin/Reports";
import EmployeeReferral from "./pages/Admin/EmployeeReferral";
import ReferralRecords from "./pages/Admin/ReferralRecords";
import EventsPage from "./pages/Admin/EventsPage";
import PendingRequests from "./pages/Admin/PendingRequests";
import ProcessAlerts from "./pages/Admin/ProcessAlerts";
import SetupIssues from "./pages/Admin/SetupIssues";
import FaqPage from "./pages/Admin/FaqPage";
import AdminNotificationsPage from "./pages/Admin/AdminNotificationsPage";
import EmployeeProfile from "./pages/Admin/EmployeeProfile";
import RoleAccessManagement from "./pages/Admin/RoleAccessManagement";
import EmployeeTimesheetDetail from "./pages/Admin/EmployeeTimesheetDetail";
import OrganizationTree from "./pages/Admin/OrganizationTree";
import Investments from "./pages/Admin/Investments";
import CompOffs from "./pages/Admin/CompOffs";
import LeaveManagementSettings from "./pages/Admin/LeaveManagementSettings";
import AdminManagersList from "./pages/Admin/AdminManagersList";
import AdminManagerTeamView from "./pages/Admin/AdminManagerTeamView";
import AdminAttendanceRecords from "./pages/Admin/AdminAttendanceRecords";
import AdminEmployeeAttendanceCalendar from "./pages/Admin/AdminEmployeeAttendanceCalendar";

//TL pages
import TLDashboard from "./pages/TeamLeader/TLDashboard";
import TLRegularization from "./pages/TeamLeader/TLRegularization";
import TeamAttendance from "./pages/TeamLeader/TeamAttendance";
import TeamLeaveApplication from "./pages/TeamLeader/TeamLeaveApplication";

// 👔 Manager Portal
import ManagerRoutes from "./manager-portal/routes/ManagerRoutes";



// 🔐 Protected Route enforcing strict 1-to-1 role access (Admin -> Admin only, Manager -> Manager only, Employee -> Employee only)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  const role = (localStorage.getItem("role") || "").trim().toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const allowed = allowedRoles.map((r) => r.toLowerCase());

    // Strict 1-to-1 Isolation: Each role can ONLY access their own allowed routes
    const isPermitted = allowed.includes(role);

    if (!isPermitted) {
      if (role === "admin") return <Navigate to="/dashboard" replace />;
      if (role === "manager") return <Navigate to="/manager/dashboard" replace />;
      if (role === "teamleader") return <Navigate to="/dashboard_tl" replace />;
      return <Navigate to="/dashboard_emp" replace />;
    }
  }

  return children;
};

// 🧭 Safe Auth-Aware Fallback Route (Redirects to respective landing portal, or /login)
const AuthFallback = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  const role = (localStorage.getItem("role") || "").trim().toLowerCase();

  if (token) {
    if (role === "admin") return <Navigate to="/dashboard" replace />;
    if (role === "manager") return <Navigate to="/manager/dashboard" replace />;
    if (role === "teamleader") return <Navigate to="/dashboard_tl" replace />;
    return <Navigate to="/dashboard_emp" replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  const location = useLocation();
  const [forceChangePassword, setForceChangePassword] = useState(false);

  useEffect(() => {
    const checkPasswordStatus = () => {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const mustChange = localStorage.getItem("must_change_password") === "true";
      const isAuthFlowPage = location.pathname === "/login" || location.pathname === "/otp";

      if (token && mustChange && !isAuthFlowPage) {
        setForceChangePassword(true);
      } else {
        setForceChangePassword(false);
      }
    };

    checkPasswordStatus();
    window.addEventListener("storage", checkPasswordStatus);
    return () => window.removeEventListener("storage", checkPasswordStatus);
  }, [location.pathname]);

  const handleGlobalPasswordSuccess = () => {
    localStorage.setItem("must_change_password", "false");
    setForceChangePassword(false);
  };

  return (
    <>
      <Routes>

      {/* 🔓 Public Routes (Admin / General) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* 🔁 Default Startup Route -> Auth-Aware Redirection */}
      <Route path="/" element={<AuthFallback />} />

      {/* 👔 Manager Portal Namespace (Strictly for Manager only) */}
      <Route
        path="/manager/*"
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <ManagerRoutes />
          </ProtectedRoute>
        }
      />

      {/* 🔐 Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* 🟣 Employee Portal (Purple Modern Design from Screenshot) */}
      <Route
        path="/dashboard_emp"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<EmployeePortalDashboard />} />
        <Route path="employee-directory" element={<EmployeePortalDirectory />} />
        <Route path="employee-directory/:employeeId" element={<EmployeeProfileDetails />} />
        <Route path="attendance" element={<EmployeePortalGenericPage />} />
        <Route path="attendance/records" element={<EmployeePortalGenericPage />} />
        <Route path="attendance/regularization" element={<EmployeePortalGenericPage />} />
        <Route path="leave" element={<EmployeePortalGenericPage />} />
        <Route path="leave/applications" element={<EmployeePortalGenericPage />} />
        <Route path="leave/balance" element={<EmployeePortalGenericPage />} />
        <Route path="leave/comp-off" element={<EmployeePortalGenericPage />} />
        <Route path="leave/holidays" element={<EmployeePortalGenericPage />} />
        <Route path="payslips" element={<EmployeePortalGenericPage />} />
        <Route path="profile" element={<EmployeePortalProfile />} />
        <Route path="regularization" element={<EmployeePortalGenericPage />} />
        <Route path="policies" element={<CompanyPolicies />} />
        <Route path="dailytask" element={<DailyTaskPage />} />
        <Route path="create_ticket" element={<Tickets_emp />} />
      </Route>

      <Route
        path="/dashboard_tl"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <TLDashboard />
          </ProtectedRoute>
        }
      />

      {/* 👔 Admin Managers & Team Attendance Module */}
      <Route
        path="/admin/managers"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <AdminManagersList />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/managers/:managerId/team"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <AdminManagerTeamView />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <AdminAttendanceRecords />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/employees/:employeeId/attendance"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <AdminEmployeeAttendanceCalendar />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/employees"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <EmployeeDirectory />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/employees/:employeeId"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee", "manager", "teamleader"]}>
            <DashboardShell>
              <EmployeeProfileDetails />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees/:employeeId"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee", "manager", "teamleader"]}>
            <DashboardShell>
              <EmployeeProfileDetails />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/role-access"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell
              customTitle="Role & Access Control"
              customSubtitle="Manage portal access, roles, permissions, and user privileges."
            >
              <RoleAccessManagement />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/role_access"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell
              customTitle="Role & Access Control"
              customSubtitle="Manage portal access, roles, permissions, and user privileges."
            >
              <RoleAccessManagement />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/organization-tree"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <OrganizationTree />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/investments"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <Investments />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/departments"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Departments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/policies"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <CompanyPolicies />
            </DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard_emp/policies"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <CompanyPolicies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard_tl/policies"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <CompanyPolicies />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/holidays"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Holidays />
          </ProtectedRoute>
        }
      />

      /*Leave
      <Route
        path="/dashboard_emp/leave"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <LeaveApplication />
          </ProtectedRoute>
        }
      />
 
      <Route
        path="/dashboard_tl/leave"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <LeaveApplication />
          </ProtectedRoute>
        }
      />
 
      <Route
        path="/dashboard_tl/teamleave"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <TeamLeaveApplication />
          </ProtectedRoute>
        }
      />
 
 

      {/* ✅ ATTENDANCE ROUTE (ONLY ONE) */}
      <Route
        path="/dashboard_emp/attendance"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <Attendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard_tl/attendance"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <Attendance />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/all_emp_attendance"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AllEmpAttendance />
          </ProtectedRoute>
        }
      />

      <Route path="/attendance/all" element={<ViewAllAttendance />} />

      {/* ✅ ATTENDANCE ROUTE (ONLY ONE) */}
      <Route
        path="/dashboard_tl/team_attendance"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <TeamAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard_emp/regularization"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <RegularizationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard_tl/my_regularization"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <RegularizationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard_tl/tl_regularization"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <TLRegularization />
          </ProtectedRoute>
        }
      />
      


      <Route
        path="/dashboard_emp/dailytask"
        element={
          <ProtectedRoute allowedRoles={["employee","teamleader","employee"]}>
            <DashboardShell>
              <DailyTaskPage/>
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      {/* <Route
        path="/dashboard_tl/dailytask"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <DailyTaskPage/>
          </ProtectedRoute>
        }
      /> */}


      <Route
        path="/dashboard_emp/create_ticket"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <Tickets_emp />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard_tl/create_ticket"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <Tickets_emp />
          </ProtectedRoute>
        }
      />



      <Route
        path="/dashboard/salary"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Salary />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/payroll-items"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <PayrollItems />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/resignation"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <Resignation />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/termination"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Termination />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/notice-period"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <NoticePeriod />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/profile"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard_emp/profile"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard_tl/profile"
        element={
          <ProtectedRoute allowedRoles={["teamleader"]}>
            <Profile />
          </ProtectedRoute>
        }
      />


      <Route
        path="/tickets/all"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AllTickets />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/tickets"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AllTickets />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/geo-location-master"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <GeoLocationMasterPage />
          </ProtectedRoute>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          ADMIN SIDEBAR & PORTAL ROUTES
          ───────────────────────────────────────────────────────────── */}
      <Route
        path="/dashboard/alerts"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <AlertPage />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/employment-contracts"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <EmploymentContracts />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/device-registration"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <DeviceRegistration />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/attendance-logs"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager"]}>
            <AttendanceLogs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/attendance-finalization"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AttendanceFinalization />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/attendance-records"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AttendanceRecord />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/attendance-audit"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AttendanceAudit />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/regularization"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <RegularizationPage />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/dailytask"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <DailyTaskPage />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/timesheet-requests"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <TimesheetRequests />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/timesheet-requests/:employeeId"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <EmployeeTimesheetDetail />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/timesheet-records"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <TimesheetRecords />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/timesheet-management"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <TimesheetManagement />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/leave"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <LeaveApplication />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/leave-balances"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <LeaveBalances />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/compoffs"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <CompOffs />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/comp-offs"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <CompOffs />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/leave-management-settings"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <LeaveManagementSettings />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/rollovers"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <Rollovers />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/reports"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <Reports />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/referral"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <EmployeeReferral />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/referral-records"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <ReferralRecords />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/events"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <EventsPage />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/setup-issues"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <SetupIssues />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/pending-requests"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <PendingRequests />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/process-alerts"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <ProcessAlerts />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/faq"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <FaqPage />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/help-desk"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <FaqPage />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/help-desk"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardShell>
              <FaqPage />
            </DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/notifications"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminNotificationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/employees/:employeeId"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <EmployeeProfile />
          </ProtectedRoute>
        }
      />

      {/* 🧭 Safe Auth-Aware Fallback (Redirects authenticated users to their dashboard, unauthenticated to login) */}
      <Route path="*" element={<AuthFallback />} />

    </Routes>

    {/* 🔒 Mandatory Global Password Change Guard */}
    <ChangePasswordModal
      isOpen={forceChangePassword}
      targetIdentifier={
        localStorage.getItem("loginEmail") ||
        (() => {
          try {
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            return u.email || u.emp_code || "";
          } catch {
            return "";
          }
        })() ||
        localStorage.getItem("emp_code") ||
        ""
      }
      onSuccess={handleGlobalPasswordSuccess}
    />
  </>
  );
}

export default App;