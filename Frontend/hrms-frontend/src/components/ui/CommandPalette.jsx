// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - COMMANDPALETTE.JSX
// Path: Frontend/hrms-frontend/src/components/ui/CommandPalette.jsx
// Purpose: Global Command Palette (Ctrl+K / Cmd+K) spotlight search for pages and actions.
// ==============================================================================

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PiMagnifyingGlassBold,
  PiCalendarCheckBold,
  PiClockBold,
  PiFileTextBold,
  PiUserCircleBold,
  PiUsersBold,
  PiTreeStructureBold,
  PiShieldCheckBold,
  PiHouseBold,
  PiXBold,
  PiArrowRightBold,
} from "react-icons/pi";
import "./CommandPalette.css";

const COMMAND_ITEMS = [
  // Quick Actions
  { id: "act-punch", title: "Record Today's Attendance", category: "Quick Actions", icon: <PiClockBold />, path: "/dashboard_emp" },
  { id: "act-leave", title: "Apply for Leave (Casual / Sick / PL)", category: "Quick Actions", icon: <PiCalendarCheckBold />, path: "/dashboard_emp/leave" },
  { id: "act-reg", title: "Regularize Missed Punch / Late Mark", category: "Quick Actions", icon: <PiClockBold />, path: "/dashboard_emp/regularization" },
  { id: "act-payslip", title: "View & Download Salary Payslips", category: "Quick Actions", icon: <PiFileTextBold />, path: "/dashboard_emp/payslips" },
  
  // Navigation Pages
  { id: "nav-dash", title: "Dashboard Overview", category: "Navigation", icon: <PiHouseBold />, path: "/dashboard_emp" },
  { id: "nav-att", title: "Attendance History & Logs", category: "Navigation", icon: <PiClockBold />, path: "/dashboard_emp/attendance" },
  { id: "nav-dir", title: "Employee Directory & Team", category: "Navigation", icon: <PiUsersBold />, path: "/dashboard_emp/directory" },
  { id: "nav-tree", title: "Organization Hierarchy Tree", category: "Navigation", icon: <PiTreeStructureBold />, path: "/admin/organization-tree" },
  { id: "nav-prof", title: "Personal Profile & Documents", category: "Navigation", icon: <PiUserCircleBold />, path: "/dashboard_emp/profile" },
  { id: "nav-pol", title: "Company Policies & Guidelines", category: "Navigation", icon: <PiShieldCheckBold />, path: "/dashboard_emp/policies" },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Global Ctrl+K / Cmd+K key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = COMMAND_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item) => {
    setIsOpen(false);
    if (item.path) {
      navigate(item.path);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onClick={() => setIsOpen(false)}>
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="cmd-input-bar">
          <PiMagnifyingGlassBold className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Type a page, person, or action... (Ctrl + K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
          <kbd className="cmd-esc-badge" onClick={() => setIsOpen(false)}>ESC</kbd>
        </div>

        {/* Results List */}
        <div className="cmd-results">
          {filteredItems.length === 0 ? (
            <div className="cmd-empty">
              No matching pages or actions found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`cmd-item ${isSelected ? "is-selected" : ""}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => handleSelect(item)}
                >
                  <div className="cmd-item-icon">{item.icon}</div>
                  <div className="cmd-item-info">
                    <span className="cmd-item-title">{item.title}</span>
                    <span className="cmd-item-cat">{item.category}</span>
                  </div>
                  {isSelected && <PiArrowRightBold className="cmd-item-arrow" />}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="cmd-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
