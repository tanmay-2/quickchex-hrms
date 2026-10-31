// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - ADMINBOTTOMNAV.JSX
// Path: Frontend/hrms-frontend/src/components/bottomnav/AdminBottomNav.jsx
// Purpose: Reusable UI component 'AdminBottomNav' rendering structured interface controls and visual layouts.
// UI Components:
//   • <AdminBottomNav />
// ==============================================================================

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PiHouseBold,
  PiUsersBold,
  PiCalendarCheckBold,
  PiBellBold,
  PiDotsNineBold,
} from "react-icons/pi";
import "./AdminBottomNav.css";

export const AdminBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const isHome = path === "/dashboard" || path === "/dashboard/" || path === "/admin";
  const isEmployees = path.includes("/employee") || path.includes("/role-access") || path.includes("/organization-tree") || path.includes("/policies") || path.includes("/payroll");
  const isAttendance = path.includes("/attendance") || path.includes("/timesheet") || path.includes("/regularization");
  const isAlerts = path.includes("/alert") || path.includes("/pending-requests") || path.includes("/process-alerts") || path.includes("/notifications");

  return (
    <nav className="dash-mob-bottom-nav" aria-label="Mobile Navigation Bar">
      <button
        type="button"
        className={`dash-mob-nav-item ${isHome ? "is-active" : ""}`}
        onClick={() => navigate("/dashboard")}
        aria-label="Home Dashboard"
      >
        <PiHouseBold size={20} />
        <span>Home</span>
      </button>

      <button
        type="button"
        className={`dash-mob-nav-item ${isEmployees ? "is-active" : ""}`}
        onClick={() => navigate("/dashboard/employees")}
        aria-label="Employees Directory"
      >
        <PiUsersBold size={20} />
        <span>Employees</span>
      </button>

      <button
        type="button"
        className={`dash-mob-nav-item ${isAttendance ? "is-active" : ""}`}
        onClick={() => navigate("/dashboard/all_emp_attendance")}
        aria-label="Attendance Records"
      >
        <PiCalendarCheckBold size={20} />
        <span>Attendance</span>
      </button>

      <button
        type="button"
        className={`dash-mob-nav-item ${isAlerts ? "is-active" : ""}`}
        onClick={() => navigate("/dashboard/alerts")}
        aria-label="Alerts and Requests"
      >
        <PiBellBold size={20} />
        <span>Alerts</span>
      </button>

      <button
        type="button"
        className="dash-mob-nav-item"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("toggle-sidebar"));
        }}
        aria-label="More Navigation Options"
      >
        <PiDotsNineBold size={20} />
        <span>More</span>
      </button>
    </nav>
  );
};

export default AdminBottomNav;
