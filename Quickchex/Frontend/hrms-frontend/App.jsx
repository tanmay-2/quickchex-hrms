import React, { useState } from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

/* =========================================================
   LOGIN
   ========================================================= */

import LoginPage from "./pages/Login/loginPage";
import OtpPage from "./pages/Login/OtpPage";
import ResetPassword from "./pages/Login/ResetPassword";

/* =========================================================
   ADMIN / DASHBOARD
   ========================================================= */

import Dashboard, {
  Shell,
  TopBanner,
} from "./pages/Admin/Dashboard";

import Profile from "./pages/Profile/Profile";

import CompanyPolicies from "./pages/Dashboard/CompanyPolicies";
import LeaveApplication from "./pages/Dashboard/LeaveApplication";

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
import EmployeeDirectory from "./pages/Admin/EmployeeDirectory";

import RegularizationPage from "./pages/Dashboard/RegularizationPage";
import DailyTaskPage from "./pages/Dashboard/DailyTaskPage";

/* =========================================================
   ATTENDANCE
   ========================================================= */

import Attendance from "./pages/Attendance/Attendance";
import ViewAllAttendance from "./pages/Attendance/ViewAllAttendance";
import AttendanceRecord from "./pages/Attendance/AttendanceRecord";

/* =========================================================
   ALERTS
   ========================================================= */

import AlertPage from "./pages/Admin/AlertPage";

/* =========================================================
   TEAM LEADER
   ========================================================= */

import TLDashboard from "./pages/TeamLeader/TLDashboard";
import TLRegularization from "./pages/TeamLeader/TLRegularization";
import TeamAttendance from "./pages/TeamLeader/TeamAttendance";
import TeamLeaveApplication from "./pages/TeamLeader/TeamLeaveApplication";

/* =========================================================
   ROLE NORMALIZER
   ========================================================= */

const normalizeRole = (role) => {
  if (!role) {
    return "";
  }

  const value = String(role)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (
    value === "admin" ||
    value === "administrator"
  ) {
    return "admin";
  }

  if (
    value === "employee" ||
    value === "user" ||
    value === "staff"
  ) {
    return "employee";
  }

  if (
    value === "teamleader" ||
    value === "teamlead" ||
    value === "tl"
  ) {
    return "teamleader";
  }

  return value;
};

/* =========================================================
   GET DASHBOARD BY ROLE
   ========================================================= */

const getDashboardPath = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") {
    return "/dashboard";
  }

  if (normalizedRole === "employee") {
    return "/dashboard_emp";
  }

  if (normalizedRole === "teamleader") {
    return "/dashboard_tl";
  }

  return "/login";
};

/* =========================================================
   PROTECTED ROUTE
   ========================================================= */

const ProtectedRoute = ({
  children,
  allowedRoles = [],
}) => {
  const token = localStorage.getItem("token");

  const storedRole = localStorage.getItem("role");

  const role = normalizeRole(storedRole);

  /* -------------------------------------------------------
     NO TOKEN
     ------------------------------------------------------- */

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /* -------------------------------------------------------
     TOKEN EXISTS BUT NO ROLE
     ------------------------------------------------------- */

  if (
    !role &&
    allowedRoles.length === 0
  ) {
    return children;
  }

  /* -------------------------------------------------------
     CHECK ROLE
     ------------------------------------------------------- */

  if (allowedRoles.length > 0) {
    const normalizedAllowedRoles =
      allowedRoles.map(normalizeRole);

    if (
      !normalizedAllowedRoles.includes(role)
    ) {
      return (
        <Navigate
          to={getDashboardPath(role)}
          replace
        />
      );
    }
  }

  return children;
};

/* =========================================================
   PUBLIC LOGIN ROUTE
   ========================================================= */

const PublicLoginRoute = ({
  children,
}) => {
  const token =
    localStorage.getItem("token");

  const role =
    localStorage.getItem("role");

  if (token && role) {
    return (
      <Navigate
        to={getDashboardPath(role)}
        replace
      />
    );
  }

  return children;
};

/* =========================================================
   ADMIN ALERTS LAYOUT
   ---------------------------------------------------------
   IMPORTANT:
   This DOES NOT create a new sidebar.
   It reuses Dashboard.jsx's existing Shell.
   ========================================================= */

const AlertsLayout = () => {
  const [expanded, setExpanded] =
    useState(false);

  return (
    <Shell
      expanded={expanded}
      setExpanded={setExpanded}
    >
      {/* ---------------------------------------------------
          SAME EXISTING DASHBOARD TOP HEADER
          --------------------------------------------------- */}

      <TopBanner
        name="Team Member"
        photo={null}
        onViewAllNotifications={() => {
          window.location.href =
            "/dashboard/notifications";
        }}
      />

      {/* ---------------------------------------------------
          EXISTING ALERT PAGE

          DO NOT modify its design/content here.
          AlertPage owns the Alerts UI.
          --------------------------------------------------- */}

      <AlertPage />
    </Shell>
  );
};

/* =========================================================
   APP
   ========================================================= */

function App() {
  return (
    <Routes>

      {/* =====================================================
          LOGIN
          ===================================================== */}

      <Route
        path="/login"
        element={
          <PublicLoginRoute>
            <LoginPage />
          </PublicLoginRoute>
        }
      />

      <Route
        path="/otp"
        element={<OtpPage />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* =====================================================
          ROOT
          ===================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* =====================================================
          ADMIN DASHBOARD
          ===================================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN ALERTS

          THIS IS THE IMPORTANT FIX.

          Previously:
              <AlertPage />

          Now:
              <AlertsLayout />

          Therefore Alerts gets the SAME Shell and Sidebar
          used by Dashboard.
          ===================================================== */}

      <Route
        path="/dashboard/alerts"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <AlertsLayout />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN EMPLOYEE DIRECTORY
          ===================================================== */}

      <Route
        path="/dashboard/employees"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <EmployeeDirectory />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN DEPARTMENTS
          ===================================================== */}

      <Route
        path="/dashboard/departments"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <Departments />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN COMPANY POLICIES
          ===================================================== */}

      <Route
        path="/dashboard/policies"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <CompanyPolicies />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE COMPANY POLICIES
          ===================================================== */}

      <Route
        path="/dashboard_emp/policies"
        element={
          <ProtectedRoute
            allowedRoles={["employee"]}
          >
            <CompanyPolicies />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEAM LEADER COMPANY POLICIES
          ===================================================== */}

      <Route
        path="/dashboard_tl/policies"
        element={
          <ProtectedRoute
            allowedRoles={["teamleader"]}
          >
            <CompanyPolicies />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN HOLIDAYS
          ===================================================== */}

      <Route
        path="/dashboard/holidays"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <Holidays />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN LEAVE
          ===================================================== */}

      <Route
        path="/dashboard/leave"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <LeaveApplication />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE DASHBOARD
          ===================================================== */}

      <Route
        path="/dashboard_emp"
        element={
          <ProtectedRoute
            allowedRoles={["employee"]}
          >
            <Dashboard_emp />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEAM LEADER DASHBOARD
          ===================================================== */}

      <Route
        path="/dashboard_tl"
        element={
          <ProtectedRoute
            allowedRoles={["teamleader"]}
          >
            <TLDashboard />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE LEAVE
          ===================================================== */}

      <Route
        path="/dashboard_emp/leave"
        element={
          <ProtectedRoute
            allowedRoles={["employee"]}
          >
            <LeaveApplication />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEAM LEADER LEAVE
          ===================================================== */}

      <Route
        path="/dashboard_tl/leave"
        element={
          <ProtectedRoute
            allowedRoles={["teamleader"]}
          >
            <LeaveApplication />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEAM LEADER TEAM LEAVE
          ===================================================== */}

      <Route
        path="/dashboard_tl/teamleave"
        element={
          <ProtectedRoute
            allowedRoles={["teamleader"]}
          >
            <TeamLeaveApplication />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE ATTENDANCE
          ===================================================== */}

      <Route
        path="/dashboard_emp/attendance"
        element={
          <ProtectedRoute
            allowedRoles={["employee"]}
          >
            <Attendance />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEAM LEADER ATTENDANCE
          ===================================================== */}

      <Route
        path="/dashboard_tl/attendance"
        element={
          <ProtectedRoute
            allowedRoles={["teamleader"]}
          >
            <Attendance />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN ALL EMPLOYEE ATTENDANCE
          ===================================================== */}

      <Route
        path="/dashboard/all_emp_attendance"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <Attendance />
          </ProtectedRoute>
        }
      />

      {/* ADMIN ATTENDANCE RECORDS - restored working page */}
      <Route
        path="/dashboard/attendance-records"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AttendanceRecord />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ALL ATTENDANCE
          ===================================================== */}

      <Route
        path="/attendance/all"
        element={
          <ProtectedRoute
            allowedRoles={[
              "admin",
              "employee",
              "teamleader",
            ]}
          >
            <ViewAllAttendance />
          </ProtectedRoute>
        }
      />

      {/* ADMIN REGULARIZATION - restored working page */}
      <Route
        path="/dashboard/regularization"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <RegularizationPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEAM LEADER TEAM ATTENDANCE
          ===================================================== */}

      <Route
        path="/dashboard_tl/team_attendance"
        element={
          <ProtectedRoute
            allowedRoles={["teamleader"]}
          >
            <TeamAttendance />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE REGULARIZATION
          ===================================================== */}

      <Route
        path="/dashboard_emp/regularization"
        element={
          <ProtectedRoute
            allowedRoles={["employee"]}
          >
            <RegularizationPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEAM LEADER MY REGULARIZATION
          ===================================================== */}

      <Route
        path="/dashboard_tl/my_regularization"
        element={
          <ProtectedRoute
            allowedRoles={["teamleader"]}
          >
            <RegularizationPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEAM LEADER REGULARIZATION
          ===================================================== */}

      <Route
        path="/dashboard_tl/tl_regularization"
        element={
          <ProtectedRoute
            allowedRoles={["teamleader"]}
          >
            <TLRegularization />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          DAILY TASK
          ===================================================== */}

      <Route
        path="/dashboard_emp/dailytask"
        element={
          <ProtectedRoute
            allowedRoles={[
              "employee",
              "teamleader",
            ]}
          >
            <DailyTaskPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE CREATE TICKET
          ===================================================== */}

      <Route
        path="/dashboard_emp/create_ticket"
        element={
          <ProtectedRoute
            allowedRoles={["employee"]}
          >
            <Tickets_emp />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEAM LEADER CREATE TICKET
          ===================================================== */}

      <Route
        path="/dashboard_tl/create_ticket"
        element={
          <ProtectedRoute
            allowedRoles={["teamleader"]}
          >
            <Tickets_emp />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN TICKETS
          ===================================================== */}

      <Route
        path="/tickets/all"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <AllTickets />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN SALARY
          ===================================================== */}

      <Route
        path="/dashboard/salary"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <Salary />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN PAYROLL ITEMS
          ===================================================== */}

      <Route
        path="/dashboard/payroll-items"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <PayrollItems />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN RESIGNATION
          ===================================================== */}

      <Route
        path="/dashboard/resignation"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <Resignation />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN TERMINATION
          ===================================================== */}

      <Route
        path="/dashboard/termination"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <Termination />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN NOTICE PERIOD
          ===================================================== */}

      <Route
        path="/dashboard/notice-period"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <NoticePeriod />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN PROFILE
          ===================================================== */}

      <Route
        path="/dashboard/profile"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE PROFILE
          ===================================================== */}

      <Route
        path="/dashboard_emp/profile"
        element={
          <ProtectedRoute
            allowedRoles={["employee"]}
          >
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEAM LEADER PROFILE
          ===================================================== */}

      <Route
        path="/dashboard_tl/profile"
        element={
          <ProtectedRoute
            allowedRoles={["teamleader"]}
          >
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          FALLBACK
          ===================================================== */}

      <Route
        path="*"
        element={<RoleBasedFallback />}
      />

    </Routes>
  );
};

/* =========================================================
   ROLE BASED FALLBACK
   ========================================================= */

const RoleBasedFallback = () => {
  const token =
    localStorage.getItem("token");

  const role =
    localStorage.getItem("role");

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return (
    <Navigate
      to={getDashboardPath(role)}
      replace
    />
  );
};

export default App;