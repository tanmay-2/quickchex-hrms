import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CheckCircle2, MoreHorizontal } from "lucide-react";
import "./ManagerBottomNav.css";

export const ManagerBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/manager/dashboard",
      isActive: path.startsWith("/manager/dashboard"),
    },
    {
      id: "team",
      label: "Team",
      icon: Users,
      path: "/manager/attendance/live",
      isActive: path.startsWith("/manager/attendance") || path.startsWith("/manager/team"),
    },
    {
      id: "approvals",
      label: "Approvals",
      icon: CheckCircle2,
      path: "/manager/approvals/regularization",
      isActive: path.startsWith("/manager/approvals"),
    },
    {
      id: "more",
      label: "More",
      icon: MoreHorizontal,
      path: "/manager/settings",
      isActive:
        path.startsWith("/manager/settings") ||
        path.startsWith("/manager/profile") ||
        path.startsWith("/manager/reports") ||
        path.startsWith("/manager/policies") ||
        path.startsWith("/manager/notifications") ||
        path.startsWith("/manager/calendar") ||
        path.startsWith("/manager/shifts"),
    },
  ];

  return (
    <nav className="mp-bottom-nav" aria-label="Mobile Bottom Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={`mp-bottom-nav-item ${item.isActive ? "active" : ""}`}
            onClick={() => {
              if (item.id === "more") {
                window.dispatchEvent(new CustomEvent("toggle-manager-sidebar"));
              } else {
                navigate(item.path);
              }
            }}
          >
            <div className="mp-bottom-nav-icon-wrap">
              <Icon size={20} strokeWidth={item.isActive ? 2.4 : 1.9} />
            </div>
            <span className="mp-bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
