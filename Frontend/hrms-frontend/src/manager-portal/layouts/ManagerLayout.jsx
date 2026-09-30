import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ManagerSidebar } from "./ManagerSidebar";
import { ManagerHeader } from "./ManagerHeader";
import { ManagerToaster } from "../components/ManagerToast";
import "./ManagerLayout.css";

export const ManagerLayout = ({ children }) => {
  const [expanded, setExpanded] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth > 900 : true;
  });
  const location = useLocation();

  // Auto-close drawer on mobile when navigating to another page
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 900) {
      setExpanded(false);
    }
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
      </div>
    </div>
  );
};
