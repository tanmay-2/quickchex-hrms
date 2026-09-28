import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ManagerSidebar } from "./ManagerSidebar";
import { ManagerHeader } from "./ManagerHeader";
import { ManagerToaster } from "../components/ManagerToast";
import "./ManagerLayout.css";

export const ManagerLayout = ({ children }) => {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="manager-portal-shell">
      <ManagerToaster />
      <ManagerSidebar
        expanded={expanded}
        setExpanded={setExpanded}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <div
          className="mp-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className={`mp-main-container ${expanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
        <ManagerHeader onMobileMenuToggle={() => setMobileOpen((v) => !v)} />
        <main className="mp-page-body">
          <div className="mp-page-inner">{children}</div>
        </main>
      </div>
    </div>
  );
};
