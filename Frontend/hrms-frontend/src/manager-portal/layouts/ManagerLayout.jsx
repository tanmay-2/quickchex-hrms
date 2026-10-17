import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ManagerSidebar } from "./ManagerSidebar";
import { ManagerHeader } from "./ManagerHeader";
import { ManagerBottomNav } from "./ManagerBottomNav";
import { ManagerToaster } from "../components/ManagerToast";
import "./ManagerLayout.css";

export const ManagerLayout = ({ children }) => {
  const [expanded, setExpanded] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth > 900 : true;
  });
  const location = useLocation();

  // Check if current route is attendance records, logs, approvals, calendar, policies, or reports
  const isAttendanceRecordsOrLogs =
    location.pathname.includes("/attendance/records") ||
    location.pathname.includes("/attendance/logs") ||
    location.pathname.includes("/approvals/regularization") ||
    location.pathname.includes("/approvals/leave") ||
    location.pathname.includes("/calendar") ||
    location.pathname.includes("/policies") ||
    location.pathname.includes("/reports") ||
    location.pathname.includes("/notifications") ||
    location.pathname.includes("/settings");

  // Listen for toggle-manager-sidebar event
  useEffect(() => {
    const handleToggle = () => setExpanded((prev) => !prev);
    window.addEventListener("toggle-manager-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-manager-sidebar", handleToggle);
  }, []);

  // Auto-close drawer on mobile when navigating to another page or on resize
  useEffect(() => {
    const checkScreen = () => {
      if (typeof window !== "undefined" && window.innerWidth <= 900) {
        setExpanded(false);
      }
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, [location.pathname]);

  return (
    <div className="manager-portal-shell">
      <ManagerToaster />
      <div
        className={`mp-sidebar-backdrop ${expanded ? "show" : ""}`}
        onClick={() => setExpanded(false)}
        aria-hidden="true"
      />
      <ManagerSidebar expanded={expanded} setExpanded={setExpanded} />
      <div className={`mp-main-container ${expanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
        <ManagerHeader onToggleSidebar={() => setExpanded((prev) => !prev)} />
        <main className="mp-page-body">
          <div className="mp-page-inner">{children}</div>
        </main>
        <ManagerBottomNav />
      </div>
    </div>
  );
};
