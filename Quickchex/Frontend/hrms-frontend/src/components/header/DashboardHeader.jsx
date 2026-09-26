/*
 * DashboardHeader.jsx
 * ─────────────────────────────────────────────────────────────────
 * THE ONE reusable shared 3D Header Component for all /dashboard/* pages.
 *
 * Changes in this version:
 *  • NO box-shadow / glow under the banner
 *  • 3D scene (rocket + orbits + particles) sits at the FAR RIGHT edge,
 *    strictly behind the purple banner clip, so it NEVER overlaps controls
 *  • Dashboard page title = "Welcome, {UserName} 👋" with animated wave
 *  • Employee Referral page (/dashboard/referral) renders NO header at all
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Bell,
  UserCircle2,
  HelpCircle,
  LogOut,
  Settings,
} from "lucide-react";
import {
  PiWarningCircleBold,
  PiClipboardTextBold,
  PiMegaphoneBold,
  PiCalendarBlankBold,
} from "react-icons/pi";

import Sidebar from "../sidebar/Sidebar";
import logoIcon from "../../assets/img/logo.png";
import "./DashboardHeader.css";

/* ─── constants ─────────────────────────────────────────────── */

const COMPANY_NAME = "LA ESFERA MULTISERVICES LLP";

/* Routes where we never render the shared header */
const HEADER_EXCLUDED_ROUTES = [
  "/dashboard/referral",
  "/dashboard/employee-referral",
];

export const ROUTE_HEADER_MAP = {
  "/dashboard": {
    title: "Welcome 👋",
    subtitle: "Here's what's happening at your organization today.",
    isDashboard: true,
  },
  "/dashboard/attendance": {
    title: "Attendance",
    subtitle: "Monitor and manage employee daily attendance.",
  },
  "/dashboard/all_emp_attendance": {
    title: "Attendance",
    subtitle: "Monitor and manage employee daily attendance.",
  },
  "/dashboard/attendance-records": {
    title: "Attendance Records",
    subtitle: "Employee Attendance records must be noted under this section.",
  },
  "/dashboard/attendance-logs": {
    title: "Attendance Logs",
    subtitle: "Raw check-in / check-out punches captured from all devices.",
  },
  "/dashboard/attendance-finalization": {
    title: "Attendance Finalization",
    subtitle: "Run and track the monthly attendance process.",
  },
  "/dashboard/attendance-audit": {
    title: "Attendance Audit",
    subtitle: "Audit trail of every attendance change and approval.",
  },
  "/dashboard/regularization": {
    title: "Regularization",
    subtitle: "Sanction regularization requests.",
  },
  "/dashboard/leave": {
    title: "Leave",
    subtitle: "Review employee leave requests and balances.",
  },
  "/dashboard/leave-balances": {
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
  "/dashboard/leave-management-settings": {
    title: "Leave Management",
    subtitle: "View & configure leave policies, categories, templates and assignments.",
  },
  "/dashboard/salary": {
    title: "Employee Salary & Payslips",
    subtitle: "Manage employee salaries, structure and payslips.",
  },
  "/dashboard/payroll-items": {
    title: "Payroll Items",
    subtitle: "Configure payroll components and items.",
  },
  "/dashboard/investments": {
    title: "Investments",
    subtitle: "View & Manage Employee Tax Declarations, Investment Proofs and Exemption Policies.",
  },
  "/dashboard/alerts": {
    title: "Alerts",
    subtitle: "Review system and attendance process alerts.",
  },
  "/dashboard/pending-requests": {
    title: "Pending Requests",
    subtitle: "Review, verify, and approve all pending employee requests.",
  },
  "/dashboard/process-alerts": {
    title: "Process Alerts",
    subtitle: "Monitor, troubleshoot, and resolve workflow and attendance process alerts.",
  },
  "/dashboard/events": {
    title: "Today's Events",
    subtitle: "Track organization events, celebrations, holidays, and schedules.",
  },
  "/dashboard/setup-issues": {
    title: "Setup Issues",
    subtitle: "Diagnose, configure, and resolve system setup issues.",
  },
  "/dashboard/geo-location-master": {
    title: "Geo Location Master",
    subtitle: "Manage office geo-fencing and authorized check-in locations.",
  },
  "/dashboard/geo-location": {
    title: "Geo Location Master",
    subtitle: "Manage office geo-fencing and authorized check-in locations.",
  },
  "/dashboard/employment-contracts": {
    title: "Pending Employment Contract",
    subtitle: "Review and manage employee employment contracts.",
  },
  "/dashboard/device-registration": {
    title: "Device Registration Request",
    subtitle: "Approve or reject employee device registration requests.",
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
  "/dashboard/employees": {
    title: "Employee Directory",
    subtitle: "Search and manage complete employee records.",
  },
  "/dashboard/role-access": {
    title: "Role & Access Control",
    subtitle: "Manage portal access, roles, permissions, and user privileges.",
  },
  "/dashboard/role_access": {
    title: "Role & Access Control",
    subtitle: "Manage portal access, roles, permissions, and user privileges.",
  },
  "/dashboard/organization-tree": {
    title: "Organization Tree",
    subtitle: "Interactive organizational structure, department hierarchy, and reporting lines.",
  },
  "/dashboard/departments": {
    title: "Departments",
    subtitle: "Manage organizational departments and teams.",
  },
  "/dashboard/policies": {
    title: "Company Policies",
    subtitle: "View and distribute organization policies.",
  },
  "/dashboard/holidays": {
    title: "Holidays",
    subtitle: "View upcoming company and statutory holidays.",
  },
  "/dashboard/resignation": {
    title: "Resignation",
    subtitle: "Process employee resignation requests.",
  },
  "/dashboard/termination": {
    title: "Termination",
    subtitle: "Manage employee offboarding and termination records.",
  },
  "/dashboard/notice-period": {
    title: "Notice Period",
    subtitle: "Track and configure employee notice period status.",
  },
  "/dashboard/reports": {
    title: "Reports",
    subtitle: "Generate, export, and download comprehensive organizational reports.",
  },
  "/dashboard/rollovers": {
    title: "Rollovers",
    subtitle: "View and Generate Rollovers",
  },
  "/dashboard/profile": {
    title: "Profile",
    subtitle: "View and manage admin account details.",
  },
  "/tickets/all": {
    title: "Ticket Report",
    subtitle: "Monitor employee support tickets, SLA performance, and resolution status.",
  },
  "/help-desk": {
    title: "Help Desk & FAQ",
    subtitle: "Frequently asked questions, administrative assistance and support guides.",
  },
  "/dashboard/help-desk": {
    title: "Help Desk & FAQ",
    subtitle: "Frequently asked questions, administrative assistance and support guides.",
  },
  "/dashboard/dailytask": {
    title: "Daily Tasks",
    subtitle: "Manage, organize and track your daily work.",
  },
  "/dashboard/faq": {
    title: "FAQ & Help Center",
    subtitle: "Frequently asked questions and support guides.",
  },
  "/dashboard/notifications": {
    title: "Notifications",
    subtitle: "System alerts, approvals and notifications.",
  },
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

const HAS_UNREAD = NOTIFICATIONS.some((n) => n.unread);

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

const getEmployeePhoto = () => {
  const d = readStoredUser();
  if (!d) return null;
  return (
    d.photo || d.photo_url || d.photoUrl || d.avatar || d.avatar_url ||
    d.avatarUrl || d.profile_image || d.profileImage || d.profile_picture ||
    d.profilePicture || null
  );
};

/* ═══════════════════════════════════════════════════════════════
   3D ROCKET SCENE — lives at the far-right edge of the banner clip
   Only particles are spread across the full width for ambiance.
   ═══════════════════════════════════════════════════════════════ */

/* Particles are spread over the right 55% of the banner only */
const PARTICLES = [
  { x: "60%", y: "18%", s: 3.5, dur: "10s", delay: "0s" },
  { x: "66%", y: "72%", s: 4,   dur: "12s", delay: "1.2s" },
  { x: "73%", y: "30%", s: 5,   dur: "9s",  delay: "0.5s" },
  { x: "79%", y: "85%", s: 3,   dur: "13s", delay: "2.1s" },
  { x: "84%", y: "42%", s: 4.5, dur: "8s",  delay: "0.9s" },
  { x: "88%", y: "60%", s: 3,   dur: "11s", delay: "1.7s" },
  { x: "92%", y: "22%", s: 5,   dur: "14s", delay: "0.3s" },
  { x: "96%", y: "78%", s: 3.5, dur: "9s",  delay: "2.8s" },
];

const Rocket3DScene = () => (
  /* Entire scene sits at far-right inside the clip layer — never touches controls */
  <div className="dh-scene" aria-hidden="true">
    {/* Orbiting bubbles */}
    <div className="dh-orbit">
      <div className="dh-orb dh-orb-1">✓</div>
      <div className="dh-orb dh-orb-2" />
      <div className="dh-orb dh-orb-3" />
    </div>

    {/* Rocket */}
    <div className="dh-rocket">
      <div className="dh-rocket-body">
        <div className="dh-rocket-window" />
        <div className="dh-rocket-fin dh-rocket-fin-l" />
        <div className="dh-rocket-fin dh-rocket-fin-r" />
      </div>
      <div className="dh-rocket-flames">
        <div className="dh-flame dh-flame-1" />
        <div className="dh-flame dh-flame-2" />
        <div className="dh-flame dh-flame-3" />
      </div>
    </div>

    {/* Floating checkmarks */}
    <span className="dh-check dh-check-1">✓</span>
    <span className="dh-check dh-check-2">●</span>
    <span className="dh-check dh-check-3">✓</span>
  </div>
);

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
  const [imgFailed, setImgFailed] = useState(false);
  const [readIds, setReadIds] = useState(
    () => new Set(NOTIFICATIONS.filter((n) => !n.unread).map((n) => n.id))
  );

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

    const API_BASE = (import.meta.env?.VITE_API_URL || 'https://quickchex-backend.onrender.com').replace(/\/$/, '');
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

  const photo = useMemo(() => propPhoto || getEmployeePhoto(), [propPhoto]);
  const showImg = Boolean(photo) && !imgFailed;

  // Resolve dynamic title and subtitle based on current route
  const { pageTitle, pageSubtitle, isDashboard } = useMemo(() => {
    if (customTitle) {
      return {
        pageTitle: customTitle,
        pageSubtitle: customSubtitle || "Here's what's happening at your organization today.",
        isDashboard: false,
      };
    }
    if (ROUTE_HEADER_MAP[currentPath]) {
      return {
        pageTitle: ROUTE_HEADER_MAP[currentPath].title,
        pageSubtitle: ROUTE_HEADER_MAP[currentPath].subtitle,
        isDashboard: ROUTE_HEADER_MAP[currentPath].isDashboard || false,
      };
    }
    // Dynamic matching for sub-routes like /dashboard/timesheet-requests/:id
    for (const [routeKey, config] of Object.entries(ROUTE_HEADER_MAP)) {
      if (currentPath.startsWith(routeKey) && routeKey !== "/dashboard") {
        return {
          pageTitle: config.title,
          pageSubtitle: config.subtitle,
          isDashboard: false,
        };
      }
    }
    return {
      pageTitle: "Dashboard",
      pageSubtitle: "Here's what's happening at your organization today.",
      isDashboard: false,
    };
  }, [currentPath, customTitle, customSubtitle]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("role");
    localStorage.removeItem("emp_code");
    localStorage.removeItem("designation");
    localStorage.removeItem("user");
    localStorage.removeItem("manager_token");
    localStorage.removeItem("manager_user");
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  if (isExcluded) return null;

  return (
    <header className="dh-banner" role="banner">
      {/* ── Background decoration container (strictly clipped, pointer-events: none) ── */}
      <div className="dh-banner-clip" aria-hidden="true">
        <div className="dh-stars" />
        <div
          className="dh-banner-art"
          style={{ backgroundImage: "url(/dashboard-banner-illustration.png)" }}
        />
        <div className="dh-banner-overlay" />

        {/* Ambient floating particles — right side only */}
        <div className="dh-particles">
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className="dh-particle"
              style={{
                left: p.x,
                top: p.y,
                width: `${p.s}px`,
                height: `${p.s}px`,
                "--dur": p.dur,
                "--delay": p.delay,
              }}
            />
          ))}
        </div>

        {/* 3D Rocket Scene — constrained to far-right corner of clip layer */}
        <Rocket3DScene />
      </div>

      {/* ── Left: White Logo Badge + Page Title (WHITE) + Subtitle (WHITE) ── */}
      <div className="dh-banner-left">

        <span className="dh-logo-mark">
          <img src={logoIcon} alt="LA ESFERA Logo" width={30} height={30} />
        </span>
        <div className="dh-banner-copy">
          <h1 className={`dh-banner-title${isDashboard ? " dh-banner-title--welcome" : ""}`}>
            {isDashboard ? (
              <>
                Welcome, {liveUserName}{" "}
                <span className="dh-wave" aria-label="waving hand">👋</span>
              </>
            ) : (
              pageTitle
            )}
          </h1>
          <p className="dh-banner-sub">{pageSubtitle}</p>
        </div>
      </div>

      {/* ── Right: Company Pill + Bell + Profile (dropdowns never clipped) ── */}
      <div className="dh-banner-right">
        {/* Company selector pill */}
        <button type="button" className="dh-company-pill" aria-label="Company selector">
          <Building2 size={14} aria-hidden="true" />
          <span>{COMPANY_NAME}</span>
        </button>

        {/* Notification bell */}
        <div className="dh-ctrl-wrap" ref={notifRef}>
          <button
            type="button"
            className="dh-ctrl-btn dh-bell-btn"
            aria-label="Open notifications"
            aria-haspopup="menu"
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell size={18} aria-hidden="true" />
            {HAS_UNREAD && <span className="dh-badge" aria-label="Unread notifications" />}
          </button>

          {notifOpen && (
            <div className="dh-notif-menu" role="menu">
              <div className="dh-notif-head">
                <span>Notifications</span>
                <span className="dh-notif-count">{NOTIFICATIONS.length}</span>
              </div>

              <ul className="dh-notif-list" role="list">
                {NOTIFICATIONS.map((n) => (
                  <li
                    key={n.id}
                    role="menuitem"
                    className={`dh-notif-item is-${n.tone}${
                      n.unread && !readIds.has(n.id) ? " is-unread" : ""
                    }`}
                    onClick={() => setReadIds((s) => new Set([...s, n.id]))}
                  >
                    <span className="dh-notif-icon"><n.icon /></span>
                    <div className="dh-notif-copy">
                      <p className="dh-notif-title">{n.title}</p>
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
        </div>

        {/* Profile Avatar */}
        <div className="dh-ctrl-wrap" ref={profileRef}>
          <button
            type="button"
            className="dh-ctrl-btn dh-avatar-btn"
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((v) => !v)}
          >
            {showImg ? (
              <img
                src={photo}
                alt="Profile avatar"
                className="dh-avatar-img"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <UserCircle2 size={22} aria-hidden="true" />
            )}
          </button>

          {profileOpen && (
            <div className="dh-profile-menu" role="menu">
              <div
                className="dh-profile-head"
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "var(--text, #1e293b)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {liveUserName}
                </div>
                {(liveUserEmail || liveUserRole) && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted, #64748b)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {liveUserEmail || liveUserRole}
                  </div>
                )}
              </div>
              <button
                type="button"
                role="menuitem"
                className="dh-profile-item"
                onClick={() => { setProfileOpen(false); navigate("/dashboard/notifications"); }}
              >
                <Settings size={14} aria-hidden="true" />
                <span>Notification Settings</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="dh-profile-item"
                onClick={() => { setProfileOpen(false); navigate("/dashboard/faq"); }}
              >
                <HelpCircle size={14} aria-hidden="true" />
                <span>Help Center</span>
              </button>
              <div className="dh-profile-divider" />
              <button
                type="button"
                role="menuitem"
                className="dh-profile-item dh-profile-item--danger"
                onClick={handleSignOut}
              >
                <LogOut size={14} aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
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
