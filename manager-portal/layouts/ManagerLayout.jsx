import React, { useState } from "react";
import { ManagerSidebar } from "./ManagerSidebar";
import { ManagerHeader } from "./ManagerHeader";
import { ManagerToaster } from "../components/ManagerToast";
import "./ManagerLayout.css";

export const ManagerLayout = ({ children }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="manager-portal-shell">
      <ManagerToaster />
      <ManagerSidebar expanded={expanded} setExpanded={setExpanded} />
      <div className={`mp-main-container ${expanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
        <ManagerHeader />
        <main className="mp-page-body">
          <div className="mp-page-inner">{children}</div>
        </main>
      </div>
    </div>
  );
};
