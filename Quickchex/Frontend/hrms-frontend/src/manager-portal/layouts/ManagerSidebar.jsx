import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  CheckCircle2,
  CalendarDays,
  Users,
  FileBarChart2,
  Bell,
  Settings,
  Plus,
  Minus,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import logo from "../../assets/img/logo.png";
import fullLogo from "../../assets/img/laesfera_full_logo.png";

export const MANAGER_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/manager/dashboard",
  },
  {
    id: "attendance",
    label: "Team Attendance",
    icon: Clock,
    children: [
      { label: "Live Attendance", path: "/manager/attendance/live" },
      { label: "Attendance Records", path: "/manager/attendance/records" },
      { label: "Attendance Logs", path: "/manager/attendance/logs" },
    ],
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: CheckCircle2,
    badge: "4",
    children: [
      { label: "Regularization", path: "/manager/approvals/regularization" },
      { label: "Leave Requests", path: "/manager/approvals/leave" },
    ],
  },
  {
    id: "schedule",
    label: "Schedule & Shifts",
    icon: CalendarDays,
    children: [
      { label: "Team Calendar", path: "/manager/calendar" },
      { label: "Shift Management", path: "/manager/shifts" },
    ],
  },
  {
    id: "team",
    label: "Team Members",
    icon: Users,
    path: "/manager/team",
  },
  {
    id: "reports",
    label: "Attendance Reports",
    icon: FileBarChart2,
    path: "/manager/reports",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    path: "/manager/notifications",
    badge: "2",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: "/manager/settings",
  },
];

export const ManagerSidebar = ({ expanded, setExpanded }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [openSections, setOpenSections] = useState({
    attendance: true,
    approvals: true,
  });

  // Auto-expand active group
  useEffect(() => {
    const cur = location.pathname;
    MANAGER_NAV_ITEMS.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (sub) => cur === sub.path || cur.startsWith(sub.path + "/")
        );
        if (isChildActive) {
          setOpenSections((prev) => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [location.pathname]);

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleItemClick = (item) => {
    if (item.children) {
      toggleSection(item.id);
      if (!expanded && typeof setExpanded === "function") {
        setExpanded(true);
      }
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <aside className={`mp-sidebar ${expanded ? "is-expanded" : "is-collapsed"}`}>
      {/* Brand Top */}
      <div className="mp-sb-top">
        <div
          className="mp-sb-brand"
          onClick={() => expanded ? navigate("/manager/dashboard") : setExpanded(true)}
          title={expanded ? "Go to Dashboard" : "Expand sidebar"}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && (expanded ? navigate("/manager/dashboard") : setExpanded(true))}
        >
          {expanded ? (
            <div className="mp-sb-brand-info" style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <img src={fullLogo} alt="LA ESFERA" style={{ height: "32px", width: "auto", maxWidth: "150px", objectFit: "contain" }} />
              <span className="mp-sb-brand-badge">MANAGER PORTAL</span>
            </div>
          ) : (
            <div className="mp-sb-logo-box">
              <img src={logo} alt="LA ESFERA" className="mp-sb-logo-img" />
            </div>
          )}
        </div>

        {/* Only show collapse button when expanded — avoids overlap in collapsed state */}
        {expanded && (
          <button
            type="button"
            className="mp-sb-toggle-btn"
            onClick={() => setExpanded(false)}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="mp-sb-nav">
        <ul className="mp-sb-list">
          {MANAGER_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const isOpen = Boolean(openSections[item.id]);

            const isDirectActive =
              item.path &&
              (location.pathname === item.path ||
                (item.path !== "/manager/dashboard" && location.pathname.startsWith(item.path)));

            const isChildActive =
              hasChildren &&
              item.children.some(
                (c) => location.pathname === c.path || location.pathname.startsWith(c.path + "/")
              );

            const isActive = isDirectActive || isChildActive;

            return (
              <li key={item.id} className={`mp-nav-item ${isActive ? "active-parent" : ""}`}>
                <button
                  type="button"
                  className={`mp-menu-btn ${isActive ? "active" : ""}`}
                  onClick={() => handleItemClick(item)}
                  title={!expanded ? item.label : undefined}
                >
                  <span className="mp-menu-icon">
                    <Icon size={19} />
                  </span>

                  {expanded && (
                    <>
                      <span className="mp-menu-label">{item.label}</span>

                      {item.badge && <span className="mp-menu-badge">{item.badge}</span>}

                      {hasChildren && (
                        <span className="mp-accordion-toggle">
                          {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* Submenu */}
                {hasChildren && expanded && isOpen && (
                  <ul className="mp-submenu">
                    {item.children.map((sub) => {
                      const isSubActive =
                        location.pathname === sub.path ||
                        location.pathname.startsWith(sub.path + "/");

                      return (
                        <li key={sub.path}>
                          <button
                            type="button"
                            className={`mp-sub-btn ${isSubActive ? "active" : ""}`}
                            onClick={() => navigate(sub.path)}
                          >
                            <span className="mp-sub-bullet" />
                            <span>{sub.label}</span>
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

      {/* Footer */}
      {expanded && (
        <div className="mp-sb-footer">
          <span>COPYRIGHT © {new Date().getFullYear()} LA ESFERA</span>
        </div>
      )}
    </aside>
  );
};
