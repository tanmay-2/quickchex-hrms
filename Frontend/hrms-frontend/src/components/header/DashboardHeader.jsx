/*
 * DashboardHeader.jsx
 * ─────────────────────────────────────────────────────────────────
 * THE ONE reusable shared Header Component for all /dashboard/* and /admin/* pages.
 * Replaced with the premium purple reference design featuring:
 *  • White circular badge with LA ESFERA logo
 *  • Dynamic route-aware Page Title & Subtitle (white typography)
 *  • Deep purple gradient with soft decorative background shapes
 *  • 3D Notification bell with live orange unread badge
 *  • Decorative 3D document/alert card illustration
 *  • Live ticking Date and Time pill (e.g. Wednesday, 08 Oct 2026 | 03:42 PM)
 *  • Integrated profile dropdown & sign-out
 *  • Full responsiveness from 320px to 1920px with zero overflow
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  UserCircle2,
  HelpCircle,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
} from "lucide-react";
import { handleGlobalLogout } from "../../utils/authUtils";
import {
  PiWarningCircleBold,
  PiClipboardTextBold,
  PiMegaphoneBold,
  PiCalendarBlankBold,
} from "react-icons/pi";

import Sidebar from "../sidebar/Sidebar";
import AdminBottomNav from "../bottomnav/AdminBottomNav";
import laesferaLogoWhite from "../../assets/img/laesfera_logo_white.png";
import logoImg from "../../assets/img/logo.png";
import "./DashboardHeader.css";
import { getApiBaseUrl } from "../../services/apiClient";

/* ─── constants ─────────────────────────────────────────────── */

const COMPANY_NAME = "LA ESFERA MULTISERVICES LLP";

export const getInitials = (name) => {
  if (!name || typeof name !== "string") {
    const code = localStorage.getItem("emp_code") || localStorage.getItem("hrms_user_emp_code");
    if (code) return code.slice(0, 2).toUpperCase();
    return "EM";
  }
  const clean = name.replace(/[^\w\s]/gi, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    const code = localStorage.getItem("emp_code") || localStorage.getItem("hrms_user_emp_code");
    if (code) return code.slice(0, 2).toUpperCase();
    return "EM";
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* Routes where we never render the shared header */
const HEADER_EXCLUDED_ROUTES = [
  "/dashboard/referral",
  "/dashboard/employee-referral",
];

export const ROUTE_HEADER_MAP = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Overview of your organization's current activity and performance.",
    isDashboard: true,
  },
  "/admin": {
    title: "Dashboard",
    subtitle: "Overview of your organization's current activity and performance.",
    isDashboard: true,
  },
  "/admin/dashboard": {
    title: "Dashboard",
    subtitle: "Overview of your organization's current activity and performance.",
    isDashboard: true,
  },

  // Alerts & Approvals
  "/dashboard/alerts": {
    title: "Alerts",
    subtitle: "Review system and attendance process alerts.",
  },
  "/dashboard/alerts/:alertId": {
    title: "Alerts",
    subtitle: "Review system and attendance process alerts.",
  },
  "/dashboard/alerts/leave-approval": {
    title: "Alerts",
    subtitle: "Review system and attendance process alerts.",
  },
  "/dashboard/pending-requests": {
    title: "Pending Requests",
    subtitle: "Review, verify, and approve all pending employee requests.",
  },
  "/admin/pending-requests": {
    title: "Pending Requests",
    subtitle: "Review, verify, and approve all pending employee requests.",
  },
  "/dashboard/process-alerts": {
    title: "Process Alerts",
    subtitle: "Monitor, troubleshoot, and resolve workflow and attendance process alerts.",
  },
  "/admin/process-alerts": {
    title: "Process Alerts",
    subtitle: "Monitor, troubleshoot, and resolve workflow and attendance process alerts.",
  },
  "/dashboard/setup-issues": {
    title: "Setup Issues",
    subtitle: "Diagnose, configure, and resolve system setup issues.",
  },
  "/admin/setup-issues": {
    title: "Setup Issues",
    subtitle: "Diagnose, configure, and resolve system setup issues.",
  },

  // Employees & Directory
  "/dashboard/employees": {
    title: "Employee Directory",
    subtitle: "View and manage employee information.",
  },
  "/dashboard/employee-directory": {
    title: "Employee Directory",
    subtitle: "View and manage employee information.",
  },
  "/admin/employees": {
    title: "Employee Directory",
    subtitle: "View and manage employee information.",
  },
  "/admin/employees/:employeeId": {
    title: "Employee Profile",
    subtitle: "View and manage employee profile and documents.",
  },

  // Payroll
  "/admin/payroll": {
    title: "Payroll Calculator",
    subtitle: "Calculate and review monthly employee payroll.",
  },
  "/dashboard/payroll": {
    title: "Payroll Calculator",
    subtitle: "Calculate and review monthly employee payroll.",
  },
  "/dashboard/salary": {
    title: "Employee Salary",
    subtitle: "Manage employee salaries, structure and payslips.",
  },
  "/admin/salary": {
    title: "Payslips",
    subtitle: "Manage employee salaries, structure and payslips.",
  },
  "/admin/payslips": {
    title: "Payslips",
    subtitle: "Manage employee salaries, structure and payslips.",
  },
  "/dashboard/payroll-items": {
    title: "Payroll Items",
    subtitle: "Configure payroll components and items.",
  },
  "/admin/payroll-items": {
    title: "Payroll Items",
    subtitle: "Configure payroll components and items.",
  },
  "/dashboard/investments": {
    title: "Investments",
    subtitle: "View & Manage Employee Tax Declarations, Investment Proofs and Exemption Policies.",
  },

  // Role Access & Organization
  "/dashboard/role-access": {
    title: "Role & Access Control",
    subtitle: "Manage portal access, roles, permissions, and user privileges.",
  },
  "/dashboard/role_access": {
    title: "Role & Access Control",
    subtitle: "Manage portal access, roles, permissions, and user privileges.",
  },
  "/admin/role-access": {
    title: "Role & Access Control",
    subtitle: "Manage portal access, roles, permissions, and user privileges.",
  },
  "/admin/role_access": {
    title: "Role & Access Control",
    subtitle: "Manage portal access, roles, permissions, and user privileges.",
  },
  "/dashboard/organization-tree": {
    title: "Organization Tree",
    subtitle: "Interactive organizational structure, department hierarchy, and reporting lines.",
  },
  "/admin/organization-tree": {
    title: "Organization Tree",
    subtitle: "Interactive organizational structure, department hierarchy, and reporting lines.",
  },
  "/dashboard/departments": {
    title: "Departments",
    subtitle: "Manage organizational departments and teams.",
  },
  "/admin/departments": {
    title: "Departments",
    subtitle: "Manage organizational departments and teams.",
  },

  // Policies & Contracts
  "/dashboard/policies": {
    title: "Company Policies",
    subtitle: "Company guidelines and important documents.",
  },
  "/admin/policies": {
    title: "Company Policies",
    subtitle: "Company guidelines and important documents.",
  },
  "/dashboard/employment-contracts": {
    title: "Pending Employment Contract",
    subtitle: "Review and manage employee employment contracts.",
  },
  "/admin/employment-contracts": {
    title: "Pending Employment Contract",
    subtitle: "Review and manage employee employment contracts.",
  },
  "/dashboard/resignation": {
    title: "Resignation",
    subtitle: "Process employee resignation requests.",
  },
  "/admin/resignation": {
    title: "Resignation",
    subtitle: "Process employee resignation requests.",
  },
  "/dashboard/termination": {
    title: "Termination",
    subtitle: "Manage employee offboarding and termination records.",
  },
  "/admin/termination": {
    title: "Termination",
    subtitle: "Manage employee offboarding and termination records.",
  },
  "/dashboard/notice-period": {
    title: "Notice Period",
    subtitle: "Track and configure employee notice period status.",
  },
  "/dashboard/notice-period/:employeeId": {
    title: "Notice Period",
    subtitle: "Detailed employee offboarding and resignation record.",
  },
  "/admin/notice-period": {
    title: "Notice Period",
    subtitle: "Track and configure employee notice period status.",
  },
  "/admin/notice-period/:employeeId": {
    title: "Notice Period",
    subtitle: "Detailed employee offboarding and resignation record.",
  },

  // Attendance
  "/dashboard/attendance": {
    title: "Attendance",
    subtitle: "Monitor and manage employee daily attendance.",
  },
  "/dashboard/all_emp_attendance": {
    title: "Attendance",
    subtitle: "Monitor and manage employee daily attendance.",
  },
  "/admin/all_emp_attendance": {
    title: "Attendance",
    subtitle: "Monitor and manage employee daily attendance.",
  },
  "/dashboard/attendance-records": {
    title: "Attendance Records",
    subtitle: "Search, filter, and export overall company attendance records across managers, departments, and employees.",
  },
  "/admin/attendance": {
    title: "Attendance Records",
    subtitle: "Search, filter, and export overall company attendance records across managers, departments, and employees.",
  },
  "/admin/attendance-records": {
    title: "Attendance Records",
    subtitle: "Search, filter, and export overall company attendance records across managers, departments, and employees.",
  },
  "/admin/attendance/records": {
    title: "Attendance Records",
    subtitle: "Search, filter, and export overall company attendance records across managers, departments, and employees.",
  },
  "/dashboard/attendance-logs": {
    title: "Attendance Logs",
    subtitle: "Raw check-in / check-out punches captured from all devices.",
  },
  "/admin/attendance-logs": {
    title: "Attendance Logs",
    subtitle: "Raw check-in / check-out punches captured from all devices.",
  },
  "/admin/attendance/logs": {
    title: "Attendance Logs",
    subtitle: "Raw check-in / check-out punches captured from all devices.",
  },
  "/dashboard/attendance-finalization": {
    title: "Attendance Finalization",
    subtitle: "Run and track the monthly attendance process.",
  },
  "/admin/attendance-finalization": {
    title: "Attendance Finalization",
    subtitle: "Run and track the monthly attendance process.",
  },
  "/dashboard/attendance-audit": {
    title: "Attendance Audit",
    subtitle: "Audit trail of every attendance change and approval.",
  },
  "/admin/attendance-audit": {
    title: "Attendance Audit",
    subtitle: "Audit trail of every attendance change and approval.",
  },
  "/dashboard/regularization": {
    title: "Regularization",
    subtitle: "Review and manage attendance correction requests.",
  },
  "/admin/regularization": {
    title: "Regularization",
    subtitle: "Review and manage attendance correction requests.",
  },
  "/admin/attendance/regularization": {
    title: "Regularization",
    subtitle: "Review and manage attendance correction requests.",
  },
  "/dashboard/geo-location-master": {
    title: "Geo Location Master",
    subtitle: "Manage office geo-fencing and authorized check-in locations.",
  },
  "/dashboard/geo-location": {
    title: "Geo Location Master",
    subtitle: "Manage office geo-fencing and authorized check-in locations.",
  },
  "/admin/geo-location-master": {
    title: "Geo Location Master",
    subtitle: "Manage office geo-fencing and authorized check-in locations.",
  },
  "/dashboard/device-registration": {
    title: "Device Registration Request",
    subtitle: "Approve or reject employee device registration requests.",
  },
  "/admin/device-registration": {
    title: "Device Registration Request",
    subtitle: "Approve or reject employee device registration requests.",
  },

  // Leave & Comp-Off
  "/dashboard/leave": {
    title: "Leave",
    subtitle: "Review employee leave requests and balances.",
  },
  "/admin/leave": {
    title: "Leave Applications",
    subtitle: "Review and manage employee leave requests and balances.",
  },
  "/admin/leave-applications": {
    title: "Leave Applications",
    subtitle: "Review and manage employee leave requests and balances.",
  },
  "/dashboard/leave-balances": {
    title: "Leave Balances",
    subtitle: "View Leave Balance History",
  },
  "/admin/leave-balances": {
    title: "Leave Balances",
    subtitle: "View Leave Balance History",
  },
  "/dashboard/compoffs": {
    title: "Comp Off Earnings",
    subtitle: "Review, track and approve employee compensatory off earnings.",
  },
  "/dashboard/comp-offs": {
    title: "Comp Off Earnings",
    subtitle: "Review, track and approve employee compensatory off earnings.",
  },
  "/admin/compoffs": {
    title: "Comp Off Earnings",
    subtitle: "Review, track and approve employee compensatory off earnings.",
  },
  "/admin/comp-offs": {
    title: "Comp Off Earnings",
    subtitle: "Review, track and approve employee compensatory off earnings.",
  },
  "/dashboard/leave-management-settings": {
    title: "Leave Management",
    subtitle: "View & configure leave policies, categories, templates and assignments.",
  },
  "/admin/leave-management-settings": {
    title: "Leave Management",
    subtitle: "View & configure leave policies, categories, templates and assignments.",
  },

  // Reports, Timesheets, Events & General
  "/dashboard/reports": {
    title: "Reports",
    subtitle: "Generate, export, and download comprehensive organizational reports.",
  },
  "/admin/reports": {
    title: "Reports",
    subtitle: "Generate, export, and download comprehensive organizational reports.",
  },
  "/dashboard/events": {
    title: "Today's Events",
    subtitle: "Track organization events, celebrations, holidays, and schedules.",
  },
  "/dashboard/holidays": {
    title: "Holidays",
    subtitle: "View upcoming company and statutory holidays.",
  },
  "/admin/holidays": {
    title: "Holidays",
    subtitle: "View upcoming company and statutory holidays.",
  },
  "/dashboard/timesheet-requests": {
    title: "Timesheet Requests",
    subtitle: "Review and approve employee timesheet submissions.",
  },
  "/dashboard/timesheet-records": {
    title: "Timesheet Records",
    subtitle: "Weekly and monthly employee timesheet logs.",
  },
  "/dashboard/timesheet-management": {
    title: "Timesheet Management",
    subtitle: "Configure timesheet rules and settings.",
  },
  "/dashboard/referral-records": {
    title: "Referral Records",
    subtitle: "Track and manage submitted candidate referrals.",
  },
  "/dashboard/dailytask": {
    title: "Daily Tasks",
    subtitle: "Manage, organize and track your daily work.",
  },
  "/admin/dailytask": {
    title: "Daily Tasks",
    subtitle: "Manage, organize and track your daily work.",
  },
  "/dashboard/rollovers": {
    title: "Rollovers",
    subtitle: "View and Generate Rollovers",
  },
  "/dashboard/profile": {
    title: "Profile",
    subtitle: "View and manage admin account details.",
  },
  "/admin/profile": {
    title: "Profile",
    subtitle: "View and manage admin account details.",
  },
  "/dashboard/notifications": {
    title: "Notifications",
    subtitle: "System alerts, approvals and notifications.",
  },
  "/admin/notifications": {
    title: "Notifications",
    subtitle: "System alerts, approvals and notifications.",
  },
  "/dashboard/faq": {
    title: "FAQ & Help Center",
    subtitle: "Frequently asked questions and support guides.",
  },
  "/help-desk": {
    title: "Help Desk & FAQ",
    subtitle: "Frequently asked questions, administrative assistance and support guides.",
  },
  "/dashboard/help-desk": {
    title: "Help Desk & FAQ",
    subtitle: "Frequently asked questions, administrative assistance and support guides.",
  },
  "/tickets/all": {
    title: "Ticket Report",
    subtitle: "Monitor employee support tickets, SLA performance, and resolution status.",
  },
  "/admin/managers": {
    title: "Managers & Teams",
    subtitle: "View and manage team structures and manager assignments.",
  },
  "/dashboard/settings": {
    title: "Settings",
    subtitle: "System configuration, roles, permissions and preferences.",
  },
  "/admin/settings": {
    title: "Settings",
    subtitle: "System configuration, roles, permissions and preferences.",
  },
};

const matchParameterizedRoute = (pattern, path) => {
  if (!pattern.includes("/:")) return false;
  const regexPattern = "^" + pattern.replace(/:[a-zA-Z0-9_]+/g, "[^/]+") + "$";
  return new RegExp(regexPattern).test(path);
};

export const DashboardShellContext = React.createContext(false);

const USER_STORAGE_KEYS = [
  "userData", "user", "employee", "authUser", "currentUser",
  "loginData", "profile", "employeeData", "auth",
];

const NOTIFICATIONS = [
  { id: "n1", title: "28 process alerts need review", time: "10 min ago", tone: "pink", icon: PiWarningCircleBold, unread: true },
  { id: "n2", title: "Regularization request is pending", time: "1 hr ago", tone: "orange", icon: PiClipboardTextBold, unread: true },
  { id: "n3", title: "New announcement: office timings update", time: "3 hr ago", tone: "blue", icon: PiMegaphoneBold, unread: false },
  { id: "n4", title: "1 holiday coming up this week", time: "Yesterday", tone: "green", icon: PiCalendarBlankBold, unread: false },
];

/* ─── helpers ───────────────────────────────────────────────── */

const readStoredUser = () => {
  for (const store of [localStorage, sessionStorage]) {
    for (const key of USER_STORAGE_KEYS) {
      let raw;
      try { raw = store.getItem(key); } catch { continue; }
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const candidate = parsed?.user ?? parsed?.employee ?? parsed?.data ?? parsed;
        if (candidate && typeof candidate === "object") return candidate;
      } catch { /* skip non-JSON */ }
    }
  }
  return null;
};

export const getStoredUserName = () => {
  const d = readStoredUser();
  if (d) {
    const fn = (d.first_name || d.firstName || "").trim();
    const ln = (d.last_name || d.lastName || "").trim();
    if (fn && ln && !fn.includes("@") && !ln.includes("@")) {
      return `${fn} ${ln}`;
    }
    if (fn && !fn.includes("@")) return fn;

    const candidate =
      d.fullName ||
      d.full_name ||
      d.name ||
      d.employee_name ||
      d.employeeName;
    if (candidate && typeof candidate === "string" && !candidate.includes("@") && candidate.toLowerCase() !== "employee") {
      return candidate.trim();
    }
  }
  for (const store of [localStorage, sessionStorage]) {
    for (const k of ["user_name", "userName", "name"]) {
      try {
        const val = store.getItem(k);
        if (val && typeof val === "string" && val.trim() && !val.includes("@") && val.toLowerCase() !== "employee") {
          return val.trim();
        }
      } catch { /* ignore */ }
    }
  }
  return "Team Member";
};

export const getStoredUserEmail = () => {
  const d = readStoredUser();
  if (d && d.email) return d.email;
  for (const store of [localStorage, sessionStorage]) {
    for (const k of ["loginEmail", "email", "rememberedLoginEmail"]) {
      try {
        const val = store.getItem(k);
        if (val && typeof val === "string" && val.trim()) return val.trim();
      } catch { /* ignore */ }
    }
  }
  return "";
};

export const getStoredUserRole = () => {
  const d = readStoredUser();
  if (d && (d.designation || d.role)) return d.designation || d.role;
  return localStorage.getItem("designation") || localStorage.getItem("role") || "";
};

const resolvePhotoUrl = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.trim();
  if (!clean || clean === "null" || clean === "undefined") return null;
  if (/^https?:\/\//i.test(clean) || clean.startsWith("data:image/")) return clean;
  const normalized = clean.replace(/\\/g, "/");
  const uploadIdx = normalized.toLowerCase().indexOf("/uploads/");
  if (uploadIdx !== -1) {
    return normalized.slice(uploadIdx);
  }
  return `/${normalized.replace(/^\/+/, "")}`;
};

const getEmployeePhoto = () => {
  // Personal profile photographs disabled across UI: initials only
  return null;
};

/* ═══════════════════════════════════════════════════════════════
   DECORATIVE CARD ILLUSTRATION (Exact match to reference image)
   Features crisp 3D Organization Tree hierarchy icon with unique SVG IDs
   ═══════════════════════════════════════════════════════════════ */

const HeaderCardIllustration = ({ idSuffix = "default", isOrgTree = false, isPolicies = false }) => {
  const dropFilterId = `dhCardDrop_${idSuffix}`;
  const bodyGradId = `dhCardBodyGrad_${idSuffix}`;
  const badgeGradId = `dhCardBadgeGrad_${idSuffix}`;

  if (isPolicies) {
    const docDropId = `dhDocDrop_${idSuffix}`;
    const docBodyGradId = `dhDocBodyGrad_${idSuffix}`;
    const foldGradId = `dhFoldGrad_${idSuffix}`;
    const pdfGradId = `dhPdfGrad_${idSuffix}`;

    return (
      <div className="dh-hero-card-illus is-policies-art" aria-hidden="true">
        <svg
          width="80"
          height="88"
          viewBox="0 0 80 88"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="dh-hero-card-svg dh-hero-doc-svg"
        >
          <defs>
            <filter id={docDropId} x="-6" y="-2" width="94" height="98" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="5" stdDeviation="5.5" floodColor="#1e0b4b" floodOpacity="0.38" />
            </filter>
            <linearGradient id={docBodyGradId} x1="16" y1="6" x2="66" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.99" />
              <stop offset="45%" stopColor="#f8f4ff" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#ede6ff" stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id={foldGradId} x1="48" y1="6" x2="66" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e9d5ff" />
              <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id={pdfGradId} x1="23" y1="26" x2="57" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>
          </defs>
          <g transform="rotate(-3 40 44)" filter={`url(#${docDropId})`}>
            {/* Main Document Sheet with Folded Top-Right Corner */}
            <path
              d="M 16 10 C 16 6.7 18.7 4 22 4 H 48 L 66 22 V 74 C 66 77.3 63.3 80 60 80 H 22 C 18.7 80 16 77.3 16 74 Z"
              fill={`url(#${docBodyGradId})`}
              stroke="rgba(255, 255, 255, 0.95)"
              strokeWidth="1.5"
            />
            {/* Folded Flap Corner */}
            <path
              d="M 48 4 V 18 C 48 20.2 49.8 22 52 22 H 66 Z"
              fill={`url(#${foldGradId})`}
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="1.2"
            />

            {/* Purple PDF Badge matching reference */}
            <rect
              x="23"
              y="26"
              width="34"
              height="22"
              rx="6"
              fill={`url(#${pdfGradId})`}
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth="0.8"
            />
            {/* PDF Bold White Text */}
            <text
              x="40"
              y="41.5"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11.5"
              fontWeight="800"
              fontFamily="system-ui, -apple-system, sans-serif"
              letterSpacing="0.6"
            >
              PDF
            </text>

            {/* Document Content Lines */}
            <rect x="23" y="54" width="34" height="3.2" rx="1.6" fill="#a78bfa" fillOpacity="0.85" />
            <rect x="23" y="60.5" width="28" height="3" rx="1.5" fill="#c4b5fd" fillOpacity="0.75" />
            <rect x="23" y="67" width="20" height="3" rx="1.5" fill="#ddd6fe" fillOpacity="0.65" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className={`dh-hero-card-illus ${isOrgTree ? "is-org-tree-art" : ""}`} aria-hidden="true">
      <svg
        width="76"
        height="56"
        viewBox="0 0 76 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="dh-hero-card-svg"
      >
        <defs>
          <filter id={dropFilterId} x="-6" y="-2" width="88" height="66" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="4" stdDeviation="4.5" floodColor="#1e0b4b" floodOpacity="0.35" />
          </filter>
          <linearGradient id={bodyGradId} x1="6" y1="4" x2="70" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.99" />
            <stop offset="45%" stopColor="#f5efff" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#eedeff" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={badgeGradId} x1="12" y1="10" x2="26" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        <g transform="rotate(-6 38 28)" filter={`url(#${dropFilterId})`}>
          {/* Rounded rectangular card */}
          <rect
            x="7"
            y="5"
            width="62"
            height="44"
            rx="12"
            fill={`url(#${bodyGradId})`}
            stroke="rgba(255, 255, 255, 0.95)"
            strokeWidth="1.4"
          />

          {/* Vibrant Circular Badge with Clear Organization Tree Icon */}
          <circle cx="19" cy="18" r="7.5" fill={`url(#${badgeGradId})`} />
          <circle cx="19" cy="18" r="7.5" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="0.8" />

          {/* Organization Tree Nodes & Hierarchy Branches (Crisp, High Contrast, Always Visible) */}
          {/* Root node */}
          <circle cx="19" cy="14.8" r="1.9" fill="#ffffff" />
          {/* T-branch connector lines */}
          <path
            d="M19 16.7 V 18.5 M19 18.5 H 15.5 V 20 M19 18.5 H 22.5 V 20"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Left child node */}
          <circle cx="15.5" cy="21.2" r="1.4" fill="#ffffff" />
          {/* Right child node */}
          <circle cx="22.5" cy="21.2" r="1.4" fill="#ffffff" />

          {/* Top header lines (Crisp, high-contrast purple bars) */}
          <rect x="30" y="14" width="24" height="3.2" rx="1.6" fill="#6d28d9" fillOpacity="0.85" />
          <rect x="30" y="19.5" width="16" height="2.8" rx="1.4" fill="#8b5cf6" fillOpacity="0.75" />

          {/* Subtle divider */}
          <line x1="13" y1="28.5" x2="61" y2="28.5" stroke="#c084fc" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="2 2" />

          {/* Bottom text bar & status dot */}
          <rect x="13" y="33" width="34" height="3" rx="1.5" fill="#7c3aed" fillOpacity="0.6" />
          <circle cx="56" cy="34.5" r="2.2" fill="#10b981" />
        </g>
      </svg>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD HEADER COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export const DashboardHeader = ({
  title: customTitle,
  subtitle: customSubtitle,
  name: propName,
  photo: propPhoto,
  onViewAllNotifications,
  showBack = false,
  backUrl,
  onBack,
  __isShellTopLevel = false,
}) => {
  const isInsideShell = React.useContext(DashboardShellContext);
  if (isInsideShell && !__isShellTopLevel) {
    return null;
  }

  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname.replace(/\/$/, "");
  const isExcluded = HEADER_EXCLUDED_ROUTES.includes(currentPath);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const isOrgTree = currentPath.includes("organization-tree");
  const isPolicies = currentPath.includes("policies") || currentPath.includes("policy");
  const [imgFailed, setImgFailed] = useState(false);
  const [readIds, setReadIds] = useState(
    () => new Set(NOTIFICATIONS.filter((n) => !n.unread).map((n) => n.id))
  );
  const [liveNotifs, setLiveNotifs] = useState([]);

  // Notifications calculation
  const activeNotifs = useMemo(() => {
    return liveNotifs.length > 0 ? liveNotifs : NOTIFICATIONS;
  }, [liveNotifs]);

  const unreadCount = useMemo(() => {
    return activeNotifs.filter((n) => n.unread && !readIds.has(n.id)).length;
  }, [activeNotifs, readIds]);

  const hasUnread = unreadCount > 0;
  const displayCount = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : "1";

  // Live ticking date and time state
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format real date and time matching the reference image
  const dayDateStr = useMemo(() => {
    return currentDateTime.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [currentDateTime]);

  const shortDateStr = useMemo(() => {
    return currentDateTime.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [currentDateTime]);

  const timeStr = useMemo(() => {
    return currentDateTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, [currentDateTime]);

  // Notifications fetch from backend
  useEffect(() => {
    const API_BASE = getApiBaseUrl();
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (!token) return;
    fetch(`${API_BASE}/notifications/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLiveNotifs(
            data.map((d) => ({
              id: d.id,
              title: d.title,
              time: d.updated_date || (d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Recent"),
              tone: d.notification_type === "POLICY_UPDATED" ? "purple" : (d.type === "success" ? "green" : d.type === "error" ? "pink" : "blue"),
              icon: PiWarningCircleBold,
              unread: !d.is_read,
              notification_type: d.notification_type,
            }))
          );
        }
      })
      .catch(() => {});
  }, [notifOpen]);

  const [liveUserName, setLiveUserName] = useState(() => {
    if (propName && propName !== "Team Member") return propName;
    return getStoredUserName();
  });
  const [liveUserEmail, setLiveUserEmail] = useState(getStoredUserEmail);
  const [liveUserRole, setLiveUserRole] = useState(getStoredUserRole);

  useEffect(() => {
    const updateUserDetails = () => {
      if (propName && propName !== "Team Member") {
        setLiveUserName(propName);
      } else {
        setLiveUserName(getStoredUserName());
      }
      setLiveUserEmail(getStoredUserEmail());
      setLiveUserRole(getStoredUserRole());
    };

    updateUserDetails();

    const API_BASE = getApiBaseUrl();
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (token) {
      fetch(`${API_BASE}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(prof => {
          if (prof) {
            const cleanName = prof.name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
            if (cleanName && !cleanName.includes("@") && cleanName.toLowerCase() !== "employee") {
              setLiveUserName(cleanName);
            }
            if (prof.email) setLiveUserEmail(prof.email);
            if (prof.designation) setLiveUserRole(prof.designation);
          }
        })
        .catch(() => {});
    }

    window.addEventListener("storage", updateUserDetails);
    return () => window.removeEventListener("storage", updateUserDetails);
  }, [propName]);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const notifMenuRef = useRef(null);
  const profileMenuRef = useRef(null);

  const photo = useMemo(() => propPhoto || getEmployeePhoto(), [propPhoto]);
  const showImg = Boolean(photo) && !imgFailed;

  // Resolve dynamic title and subtitle based on current route
  const { pageTitle, pageSubtitle } = useMemo(() => {
    // 1. Exact match from ROUTE_HEADER_MAP
    const exactMeta = ROUTE_HEADER_MAP[currentPath];
    if (exactMeta) {
      return {
        pageTitle: customTitle || exactMeta.title,
        pageSubtitle: customSubtitle || exactMeta.subtitle,
      };
    }
    if (customTitle) {
      return {
        pageTitle: customTitle,
        pageSubtitle: customSubtitle || "Here's what's happening at your organization today.",
      };
    }
    // 2. Parameterized pattern match
    for (const [routeKey, config] of Object.entries(ROUTE_HEADER_MAP)) {
      if (matchParameterizedRoute(routeKey, currentPath)) {
        return {
          pageTitle: config.title,
          pageSubtitle: config.subtitle,
        };
      }
    }
    // 3. Dynamic prefix matching for sub-routes
    const sortedKeys = Object.keys(ROUTE_HEADER_MAP).sort((a, b) => b.length - a.length);
    for (const routeKey of sortedKeys) {
      if (
        routeKey !== "/dashboard" &&
        routeKey !== "/admin" &&
        !routeKey.includes("/:") &&
        currentPath.startsWith(routeKey)
      ) {
        return {
          pageTitle: ROUTE_HEADER_MAP[routeKey].title,
          pageSubtitle: ROUTE_HEADER_MAP[routeKey].subtitle,
        };
      }
    }
    // 4. Default fallback for dashboard roots
    if (currentPath === "/admin" || currentPath === "/dashboard" || currentPath === "") {
      return {
        pageTitle: "Dashboard",
        pageSubtitle: "Overview of your organization's current activity and performance.",
      };
    }
    return {
      pageTitle: "Dashboard",
      pageSubtitle: "Overview of your organization's current activity and performance.",
    };
  }, [currentPath, customTitle, customSubtitle]);

  // Close menus on outside click or mobile touch without intercepting clicks on the menus themselves
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // Notification dropdown check: check trigger, menu, and class fallback
      const inNotifTrigger = notifRef.current && notifRef.current.contains(e.target);
      const inNotifMenu =
        (notifMenuRef.current && notifMenuRef.current.contains(e.target)) ||
        (e.target.closest && e.target.closest(".dh-notif-menu"));
      if (!inNotifTrigger && !inNotifMenu) {
        setNotifOpen(false);
      }

      // Profile dropdown check: check desktop wrap, mobile trigger, menu, and class fallback
      const inProfileTrigger =
        (profileRef.current && profileRef.current.contains(e.target)) ||
        (e.target.closest && e.target.closest(".dh-mobile-avatar-btn"));
      const inProfileMenu =
        (profileMenuRef.current && profileMenuRef.current.contains(e.target)) ||
        (e.target.closest && e.target.closest(".dh-profile-menu"));
      if (!inProfileTrigger && !inProfileMenu) {
        setProfileOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const displayUserName = useMemo(() => {
    if (propName && propName !== "Team Member" && propName !== "Admin Quickchex") return propName;
    if (
      liveUserName &&
      liveUserName !== "Team Member" &&
      liveUserName !== "Admin Quickchex" &&
      !liveUserName.includes("@")
    ) {
      return liveUserName;
    }
    return "Aaquib Khan";
  }, [propName, liveUserName]);

  const displayUserEmail = useMemo(() => {
    if (
      liveUserEmail &&
      liveUserEmail.includes("@") &&
      !liveUserEmail.includes("quickchex.com") &&
      !liveUserEmail.includes("aaquib.k")
    ) {
      return liveUserEmail;
    }
    return "admin@laesfera.com";
  }, [liveUserEmail]);

  const userInitials = useMemo(() => {
    return getInitials(displayUserName);
  }, [displayUserName]);

  const handleSignOut = () => {
    handleGlobalLogout({ navigate });
  };

  if (isExcluded) return null;

  return (
    <header className="dh-purple-header" role="banner">
      {/* Decorative luminous bokeh background */}
      <div className="dh-banner-clip" aria-hidden="true">
        <div className="dh-ref-bokeh dh-ref-bokeh-1" />
        <div className="dh-ref-bokeh dh-ref-bokeh-2" />
        <div className="dh-ref-bokeh dh-ref-bokeh-3" />
        <div className="dh-ref-bokeh dh-ref-bokeh-4" />
      </div>

      {/* ─── MOBILE HEADER BAR (Exact Reference: Left Hamburger, Center Logo, Right Bell + Avatar) ─── */}
      <div className="dh-mobile-nav-bar" aria-label="Mobile Navigation Header">
        {/* Left: 3-line Hamburger Menu Button */}
        <button
          type="button"
          className="dh-mobile-hamburger-btn"
          aria-label="Toggle navigation menu"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("toggle-sidebar"));
          }}
          id="admin-mobile-hamburger"
          title="Open Menu"
        >
          <Menu size={22} strokeWidth={2.4} />
        </button>

        {/* Center: HRMS Company Logo */}
        <div
          className="dh-mobile-logo-wrap"
          onClick={() => navigate("/dashboard")}
          role="button"
          tabIndex={0}
          title="LA ESFERA Dashboard"
        >
          <img
            src={laesferaLogoWhite}
            alt="LA ESFERA"
            className="dh-mobile-logo-img"
            onError={(e) => {
              e.currentTarget.src = logoImg;
            }}
          />
        </div>

        {/* Right: Notification Bell + Profile Avatar */}
        <div className="dh-mobile-right-controls">
          <button
            type="button"
            className="dh-purple-btn dh-mobile-bell-btn"
            aria-label="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
            title="Notifications"
          >
            <Bell size={19} strokeWidth={2.2} />
            {hasUnread && (
              <span className="dh-bell-badge-orange" aria-label="Unread notifications">
                {displayCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className="dh-purple-btn dh-mobile-avatar-btn"
            aria-label="Profile Menu"
            onClick={() => setProfileOpen((v) => !v)}
            title={displayUserName}
          >
            <div className="dh-purple-avatar-thumb">
              <span className="dh-purple-avatar-initials">{userInitials}</span>
            </div>
          </button>
        </div>
      </div>

      {/* ─── MOBILE PAGE CONTEXT SUBBAR (Always clear orientation on mobile) ─── */}
      <div className="dh-mobile-subbar">
        <h2 className="dh-mobile-subbar-title">{pageTitle}</h2>
        {pageSubtitle && (
          <p className="dh-mobile-subbar-desc">{pageSubtitle}</p>
        )}
      </div>

      {/* ─── DESKTOP HEADER ROW (Unchanged original desktop view) ─── */}
      <div className="dh-desktop-header-row">
        {/* Left side: Dynamic page title and subtitle */}
        <div className="dh-purple-header-left">
          <h1 className="dh-purple-header-title">{pageTitle}</h1>
          <p className="dh-purple-header-subtitle">{pageSubtitle}</p>
        </div>

        {/* Right side: Notification bell, Alerts button, User Profile */}
        <div className="dh-purple-header-right">
          {/* 1. Notification Bell Button with Real Unread Count */}
          <div className="dh-ctrl-wrap" ref={notifRef}>
            <button
              type="button"
              className="dh-purple-btn dh-purple-bell-btn"
              aria-label="Open notifications"
              onClick={() => setNotifOpen((v) => !v)}
              id="admin-topbar-bell"
              title="Notifications"
            >
              <Bell size={20} strokeWidth={2.2} />
              {hasUnread && (
                <span className="dh-bell-badge-orange" aria-label="Unread notifications">
                  {displayCount}
                </span>
              )}
            </button>
          </div>

          {/* 2. Alerts Button */}
          <button
            type="button"
            className="dh-purple-btn dh-purple-alerts-btn"
            aria-label="Alerts"
            onClick={() => navigate("/dashboard/alerts")}
            id="admin-topbar-alerts"
            title="Alerts"
          >
            <PiWarningCircleBold size={18} />
            <span>Alerts</span>
          </button>

          {/* 3. User Profile Button with Dropdown */}
          <div className="dh-ctrl-wrap dh-purple-profile-wrap" ref={profileRef}>
            <button
              type="button"
              className="dh-purple-btn dh-purple-profile-btn"
              aria-label="Open profile menu"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((v) => !v)}
              id="admin-topbar-profile"
              title={displayUserName}
            >
              <div className="dh-purple-avatar-thumb">
                <span className="dh-purple-avatar-initials">{userInitials}</span>
              </div>
              <span className="dh-purple-profile-name">{displayUserName}</span>
              <ChevronDown size={14} className="dh-purple-profile-chevron" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── NOTIFICATION DROPDOWN MENU (Anchored for both desktop & mobile) ─── */}
      {notifOpen && (
        <div className="dh-notif-menu" role="menu" ref={notifMenuRef}>
          <div className="dh-notif-head">
            <span>Notifications</span>
            <span className="dh-notif-count">{activeNotifs.length}</span>
          </div>

          <ul className="dh-notif-list" role="list">
            {activeNotifs.map((n) => (
              <li
                key={n.id}
                role="menuitem"
                className={`dh-notif-item is-${n.tone || "blue"}${
                  n.unread && !readIds.has(n.id) ? " is-unread" : ""
                }`}
                onClick={() => {
                  setReadIds((s) => new Set([...s, n.id]));
                  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
                  if (token) {
                    fetch(`${getApiBaseUrl()}/notifications/${n.id}/read`, {
                      method: "PATCH",
                      headers: { Authorization: `Bearer ${token}` },
                    }).catch(() => {});
                  }
                  setNotifOpen(false);
                  if (n.id) {
                    navigate(`/dashboard/notifications?id=${n.id}`);
                  } else {
                    navigate("/dashboard/notifications");
                  }
                }}
              >
                <span className="dh-notif-icon"><n.icon size={16} /></span>
                <div className="dh-notif-copy">
                  <div className="dh-notif-title-row">
                    <p className="dh-notif-title">{n.title}</p>
                    {n.unread && !readIds.has(n.id) && (
                      <span className="dh-notif-unread-dot" aria-label="Unread" />
                    )}
                  </div>
                  <p className="dh-notif-time">{n.time}</p>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="dh-notif-viewall"
            onClick={() => {
              setNotifOpen(false);
              if (onViewAllNotifications) {
                onViewAllNotifications();
              } else {
                navigate("/dashboard/notifications");
              }
            }}
          >
            View all notifications
          </button>
        </div>
      )}

      {/* ─── PROFILE DROPDOWN MENU (Anchored for both desktop & mobile) ─── */}
      {profileOpen && (
        <div className="dh-profile-menu dh-topbar-profile-dropdown" role="menu" ref={profileMenuRef}>
          {/* User card header */}
          <div className="dh-profile-card-header">
            <div className="dh-profile-avatar-circle">
              {userInitials}
            </div>
            <div className="dh-profile-user-info">
              <strong className="dh-profile-user-name">{displayUserName}</strong>
              <span className="dh-profile-user-email">{displayUserEmail}</span>
            </div>
          </div>

          <div className="dh-profile-divider" />

          {/* 1. My Profile */}
          <button
            type="button"
            role="menuitem"
            className="dh-profile-item"
            onClick={() => {
              setProfileOpen(false);
              const r = (localStorage.getItem("role") || "").toLowerCase();
              if (r === "manager") navigate("/manager/profile");
              else if (r === "employee" || r === "user") navigate("/dashboard_emp/profile");
              else if (r === "teamleader") navigate("/dashboard_tl/profile");
              else navigate("/dashboard/profile");
            }}
          >
            <UserCircle2 size={17} className="dh-profile-item-icon" />
            <span>My Profile</span>
          </button>

          {/* 2. Company Settings */}
          <button
            type="button"
            role="menuitem"
            className="dh-profile-item"
            onClick={() => {
              setProfileOpen(false);
              navigate("/dashboard/settings");
            }}
          >
            <Settings size={17} className="dh-profile-item-icon" />
            <span>Company Settings</span>
          </button>

          {/* 3. Help & Support */}
          <button
            type="button"
            role="menuitem"
            className="dh-profile-item"
            onClick={() => {
              setProfileOpen(false);
              navigate("/dashboard/faq");
            }}
          >
            <HelpCircle size={17} className="dh-profile-item-icon" />
            <span>Help & Support</span>
          </button>

          <div className="dh-profile-divider" />

          {/* 4. Logout (working logout) */}
          <button
            type="button"
            role="menuitem"
            className="dh-profile-item dh-profile-item--danger"
            id="admin-logout-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setProfileOpen(false);
              handleSignOut();
            }}
          >
            <LogOut size={17} className="dh-profile-item-icon dh-profile-logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
};

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD SHELL COMPONENT (Default layout for dashboard pages)
   ═══════════════════════════════════════════════════════════════ */

export const DashboardShell = ({
  children,
  customTitle,
  customSubtitle,
  name,
  photo,
  showBack = false,
  backUrl,
  onBack,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <DashboardShellContext.Provider value={true}>
      <div className="dash-shell">
        <Sidebar expanded={expanded} setExpanded={setExpanded} />
        <main className={`dash-main${expanded ? " is-expanded" : ""}`}>
          <div className="dash-inner dash-ov-inner">
            <DashboardHeader
              title={customTitle}
              subtitle={customSubtitle}
              name={name}
              photo={photo}
              showBack={showBack}
              backUrl={backUrl}
              onBack={onBack}
              __isShellTopLevel={true}
            />
            {children}
          </div>
        </main>
      </div>
    </DashboardShellContext.Provider>
  );
};

export default DashboardHeader;
