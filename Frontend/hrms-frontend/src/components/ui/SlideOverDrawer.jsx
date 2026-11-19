// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - SLIDEOVERDRAWER.JSX
// Path: Frontend/hrms-frontend/src/components/ui/SlideOverDrawer.jsx
// Purpose: Slide-over right drawer (Sheet) covering ~40% of screen for seamless side workflows.
// ==============================================================================

import React, { useEffect } from "react";
import { PiXBold } from "react-icons/pi";
import "./SlideOverDrawer.css";

export default function SlideOverDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  width = "42%",
  children,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="drawer-panel"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header-copy">
            <h3 className="drawer-title">{title}</h3>
            {subtitle && <p className="drawer-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose} aria-label="Close drawer">
            <PiXBold />
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="drawer-content">{children}</div>
      </div>
    </div>
  );
}
