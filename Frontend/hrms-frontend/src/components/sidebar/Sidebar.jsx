import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  PiSquaresFourDuotone,
  PiWarningCircleDuotone,
  PiUsersThreeDuotone,
  PiClockUserDuotone,
  PiCalendarCheckDuotone,
  PiAirplaneTiltDuotone,
  PiChartBarDuotone,
  PiChalkboardSimpleDuotone,
  PiShareNetworkDuotone,
  PiSidebarSimpleDuotone,
  PiPlusBold,
  PiMinusBold,
} from "react-icons/pi";
import { Ticket, LifeBuoy, X, ChevronDown, Settings } from "lucide-react";

import "./sidebar.css";
import logo from "../../assets/img/logo.png";
import fullLogo from "../../assets/img/laesfera_full_logo.png";
import AdminBottomNav from "../bottomnav/AdminBottomNav";

/* =========================================================
   LA ESFERA DASHBOARD SIDEBAR MENU
   Only the 9 requested primary categories.
   All detail pages are organized as subpages.
   ========================================================= */

export const MENU_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <PiSquaresFourDuotone />,
    path: "/dashboard",
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: <PiWarningCircleDuotone />,
    path: "/dashboard/alerts",
    hasRedDot: true,
  },
  {
    id: "employees",
    label: "Employees",
    icon: <PiUsersThreeDuotone />,
    children: [
      { label: "Employee Directory", path: "/dashboard/employees" },
      { label: "Role & Access Control", path: "/dashboard/role-access" },
      { label: "Organization Tree", path: "/dashboard/organization-tree" },
      { label: "Company Policies", path: "/dashboard/policies" },
      { label: "Pending Employment Contract", path: "/dashboard/employment-contracts" },
      { label: "Resignation", path: "/dashboard/resignation" },
      { label: "Termination", path: "/dashboard/termination" },
      { label: "Notice Period", path: "/dashboard/notice-period" },
      { label: "Payroll Calculator", path: "/admin/payroll" },
      { label: "Employee Salary", path: "/dashboard/salary" },
      { label: "Payroll Items", path: "/dashboard/payroll-items" },
      { label: "Investments", path: "/dashboard/investments" },
    ],
  },
  {
    id: "managers-and-teams",
    label: "Managers & Teams",
    icon: <PiUsersThreeDuotone />,
    path: "/admin/managers",
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: <PiClockUserDuotone />,
    children: [
      { label: "Attendance Overview", path: "/dashboard/all_emp_attendance" },
      { label: "Attendance Records", path: "/admin/attendance" },
      { label: "Attendance Logs", path: "/dashboard/attendance-logs" },
      { label: "Attendance Finalization", path: "/dashboard/attendance-finalization" },
      { label: "Attendance Audit", path: "/dashboard/attendance-audit" },
      { label: "Regularization", path: "/dashboard/regularization" },
      { label: "Daily Tasks", path: "/dashboard/dailytask" },
      { label: "Geo Location Master", path: "/dashboard/geo-location-master" },
      { label: "Device Registration Requests", path: "/dashboard/device-registration" },
    ],
  },
  {
    id: "timesheet",
    label: "Timesheet",
    badge: "Beta",
    icon: <PiCalendarCheckDuotone />,
    children: [
      { label: "Timesheet Requests", path: "/dashboard/timesheet-requests" },
      { label: "Timesheet Records", path: "/dashboard/timesheet-records" },
      { label: "Timesheet Management", path: "/dashboard/timesheet-management" },
    ],
  },
  {
    id: "leave",
    label: "Leave",
    icon: <PiAirplaneTiltDuotone />,
    children: [
      { label: "Leave Application", path: "/dashboard/leave" },
      { label: "Leave Balances", path: "/dashboard/leave-balances" },
      { label: "Comp Offs", path: "/dashboard/compoffs" },
      { label: "Leave Management Settings", path: "/dashboard/leave-management-settings" },
      { label: "Holidays", path: "/dashboard/holidays" },
      { label: "Rollovers", path: "/dashboard/rollovers" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: <PiChartBarDuotone />,
    path: "/dashboard/reports",
  },
  {
    id: "tickets",
    label: "Tickets",
    icon: <Ticket size={18} />,
    path: "/tickets/all",
  },
  {
    id: "help-desk",
    label: "Help Desk",
    icon: <LifeBuoy size={18} />,
    path: "/help-desk",
  },
  {
    id: "refer-and-earn",
    label: "Refer and Earn",
    icon: <PiShareNetworkDuotone />,
    children: [
      { label: "Submit Referral", path: "/dashboard/referral" },
      { label: "Track Referral", path: "/dashboard/referral-records" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings size={18} />,
    path: "/dashboard/settings",
  },
];

const PIN_KEY = "laesfera-sidebar-pinned";

function Sidebar({ expanded, setExpanded }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);

  const [pinned, setPinned] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.innerWidth <= 900) {
        return false;
      }
      const stored = window.localStorage.getItem(PIN_KEY);
      return stored !== null ? stored === "true" : true;
    } catch {
      return false;
    }
  });

  // Keep track of which accordion categories are expanded
  const [openSections, setOpenSections] = useState({
    "refer-and-earn": true,
  });

  /* Sync pin state for desktop only */
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth > 900) {
      try {
        window.localStorage.setItem(PIN_KEY, String(pinned));
      } catch {
        // ignore
      }

      if (typeof setExpanded === "function") {
        setExpanded(pinned);
      }
    }
  }, [pinned, setExpanded]);

  /* Listen for global toggle-sidebar custom event (triggered by mobile hamburger button & bottom nav More) */
  useEffect(() => {
    const handleToggle = () => {
      if (typeof window !== "undefined" && window.innerWidth <= 900) {
        setMobileOpen((prev) => !prev);
      } else {
        if (typeof setExpanded === "function") {
          setExpanded((prev) => !prev);
        }
        setPinned((prev) => !prev);
      }
    };
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, [setExpanded]);

  /* Auto-close sidebar on mobile when navigating */
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /* Auto-close mobile drawer when window resizes */
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined" && window.innerWidth <= 900) {
        if (typeof setExpanded === "function") {
          setExpanded(false);
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setExpanded]);

  /* Auto-expand parent group when current path matches a child item */
  useEffect(() => {
    const curPath = location.pathname;
    MENU_ITEMS.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (sub) => sub.path === curPath || curPath.startsWith(sub.path + "/")
        );
        if (isChildActive) {
          setOpenSections((prev) => ({
            ...prev,
            [item.id]: true,
          }));
        }
      }
    });
  }, [location.pathname]);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 900;
  const open = isMobile ? mobileOpen : (expanded || pinned);

  const toggleSection = (id) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleParentClick = (item) => {
    if (item.children) {
      toggleSection(item.id);
      if (!open && typeof setExpanded === "function") {
        setExpanded(true);
      }
    } else if (item.path) {
      navigate(item.path);
      if (typeof window !== "undefined" && window.innerWidth <= 900) {
        handleClose();
      }
    }
  };

  const handleClose = () => {
    setMobileOpen(false);
    if (typeof window !== "undefined" && window.innerWidth <= 900) {
      if (typeof setExpanded === "function") {
        setExpanded(false);
      }
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`qx-sidebar-backdrop ${mobileOpen ? "show" : ""}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <aside
        className={`sidebar qx-sidebar ${mobileOpen ? "mobile-open is-mobile-open" : ""} ${
          open ? "expanded" : ""
        } ${pinned ? "pinned" : ""}`}
        onMouseEnter={() => {
          if (typeof window !== "undefined" && window.innerWidth > 900) {
            if (!pinned && typeof setExpanded === "function") {
              setExpanded(true);
            }
          }
        }}
        onMouseLeave={() => {
          if (typeof window !== "undefined" && window.innerWidth > 900) {
            if (!pinned && typeof setExpanded === "function") {
              setExpanded(false);
            }
          }
        }}
        aria-label="Main navigation"
      >
        {/* ================= BRAND / TOP ================= */}
        <div className="sb-top qx-sb-top">
          <div
            className="sb-brand qx-sb-brand"
            onClick={() => {
              navigate("/dashboard");
              if (typeof window !== "undefined" && window.innerWidth <= 900) {
                handleClose();
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate("/dashboard");
                if (typeof window !== "undefined" && window.innerWidth <= 900) {
                  handleClose();
                }
              }
            }}
          >
            {open ? (
              <div className="qx-drawer-brand-col">
                <img src={fullLogo} alt="LA ESFERA" className="qx-full-logo-img" />
                <span className="qx-drawer-portal-badge">ADMIN PORTAL</span>
              </div>
            ) : (
              <div className="qx-logo-badge">
                <img src={logo} alt="LA ESFERA" className="qx-logo-img" />
              </div>
            )}
          </div>

          {open && (
            <button
              type="button"
              className="sb-pin qx-sb-pin desktop-only"
              onClick={() => setPinned((cur) => !cur)}
              title={pinned ? "Unpin sidebar" : "Keep sidebar open"}
              aria-label={pinned ? "Unpin sidebar" : "Keep sidebar open"}
              aria-pressed={pinned}
            >
              <PiSidebarSimpleDuotone />
            </button>
          )}

          {/* Mobile close button */}
          <button
            type="button"
            className="qx-mobile-close-btn"
            onClick={handleClose}
            title="Close navigation"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

      {/* ================= NAVIGATION LIST ================= */}
      <nav className="sb-nav qx-sb-nav" aria-label="Dashboard menu">
        <ul className="qx-nav-list">
          {MENU_ITEMS.map((item) => {
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const isSectionOpen = Boolean(openSections[item.id]);

            const isDirectActive =
              Boolean(item.path) &&
              (location.pathname === item.path ||
                (item.path === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.path)) ||
                (item.id === "help-desk" &&
                  (location.pathname === "/dashboard/faq" ||
                   location.pathname === "/dashboard/help-desk")));

            const isAnyChildActive =
              hasChildren &&
              item.children.some(
                (child) =>
                  location.pathname === child.path ||
                  location.pathname.startsWith(child.path + "/")
              );

            const isParentActive = isDirectActive || isAnyChildActive;

            return (
              <li
                key={item.id}
                className={`qx-nav-item ${isParentActive ? "is-active" : ""} ${
                  hasChildren ? "has-children" : ""
                } ${isSectionOpen ? "is-open" : ""}`}
              >
                <button
                  type="button"
                  className={`menu-item qx-menu-btn ${
                    isParentActive && (!hasChildren || !open) ? "active" : ""
                  } ${isParentActive ? "group-active" : ""}`}
                  onClick={() => handleParentClick(item)}
                  title={open ? undefined : item.label}
                  aria-expanded={hasChildren ? isSectionOpen : undefined}
                >
                  <span className="icon qx-menu-icon">{item.icon}</span>

                  {open && (
                    <>
                      <span className="label qx-menu-label">
                        {item.label}
                        {item.hasRedDot && <span className="qx-red-dot" aria-hidden="true" />}
                        {item.badge && (
                          <span className="qx-beta-badge">{item.badge}</span>
                        )}
                      </span>

                      {hasChildren && (
                        <span className="qx-accordion-icon" aria-hidden="true">
                          <ChevronDown
                            size={16}
                            className={`qx-accordion-chevron ${isSectionOpen ? "is-open" : ""}`}
                          />
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* ================= ACCORDION SUBMENU ================= */}
                {hasChildren && open && isSectionOpen && (
                  <ul className="qx-submenu" role="menu">
                    {item.children.map((sub) => {
                      const isSubActive =
                        location.pathname === sub.path ||
                        location.pathname.startsWith(sub.path + "/");

                      return (
                        <li key={sub.path} className="qx-submenu-item" role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className={`qx-submenu-link ${
                              isSubActive ? "active-sub" : ""
                            }`}
                            onClick={() => {
                              navigate(sub.path);
                              if (typeof window !== "undefined" && window.innerWidth <= 900) {
                                handleClose();
                              }
                            }}
                            title={sub.label}
                          >
                            <span className="qx-sub-bullet" aria-hidden="true" />
                            <span className="qx-sub-label">{sub.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ================= FOOTER / COPYRIGHT ================= */}
      {open && (
        <div className="sb-bottom qx-sb-bottom">
          <div className="qx-sb-copyright">
            <span>COPYRIGHT © {new Date().getFullYear()} LA ESFERA</span>
          </div>
        </div>
      )}
    </aside>
    {/* Global Admin Mobile Bottom Navigation */}
    <AdminBottomNav />
    </>
  );
}

export default Sidebar;