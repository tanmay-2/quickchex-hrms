import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Sun,
  Moon,
  User,
  Settings,
  KeyRound,
  LogOut,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
} from "lucide-react";
import { useManagerAuth } from "../auth/ManagerAuthContext";
import { useTheme } from "../../theme/ThemeProvider";
import { getNotifications } from "../services/managerApiService";

export const ManagerHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { manager, logout, role } = useManagerAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const isAdmin =
    role === "admin" ||
    (localStorage.getItem("role") || "").trim().toLowerCase() === "admin";

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Could not load notifications:", err.message);
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // Load on mount and when dropdown opens
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (notifOpen) fetchNotifications();
  }, [notifOpen, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  /** Map API notification type to icon + colour */
  const getNotifMeta = (type) => {
    switch (type) {
      case "success":
        return { Icon: CheckCircle2, color: "#059669" };
      case "error":
        return { Icon: AlertTriangle, color: "#DC2626" };
      case "info":
      default:
        return { Icon: Clock, color: "#7C3AED" };
    }
  };

  /** Format ISO date string to relative time */
  const formatRelative = (iso) => {
    if (!iso) return "";
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return "";
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="mp-header">
      {/* Left: Organization / Portal Indicator */}
      <div className="mp-header-left">
        <div className="mp-header-pill">
          <span className="mp-pill-dot" />
          <span className="mp-pill-org">LA ESFERA MULTISERVICES LLP</span>
          <span className="mp-pill-divider">/</span>
          <span className="mp-pill-role">Manager Portal</span>
        </div>
      </div>

      {/* Right: Actions, Theme Toggle, Notifs, Profile */}
      <div className="mp-header-right">

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="mp-header-icon-btn"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="mp-dropdown-wrap" ref={notifRef}>
          <button
            type="button"
            className="mp-header-icon-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="mp-notif-badge">{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="mp-dropdown-panel mp-notif-panel">
              <div className="mp-notif-head">
                <span className="mp-notif-title">Notifications</span>
                <button
                  type="button"
                  className="mp-notif-view-all"
                  onClick={() => {
                    setNotifOpen(false);
                    navigate("/manager/notifications");
                  }}
                >
                  View All
                </button>
              </div>

              <div className="mp-notif-list">
                {notifLoading ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "13px" }}>
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "13px" }}>
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => {
                    const { Icon, color } = getNotifMeta(n.type);
                    return (
                      <div
                        key={n.id}
                        className={`mp-notif-item ${!n.is_read ? "unread" : ""}`}
                        onClick={() => {
                          setNotifOpen(false);
                          navigate("/manager/notifications");
                        }}
                      >
                        <div className="mp-notif-icon-box" style={{ color }}>
                          <Icon size={16} />
                        </div>
                        <div className="mp-notif-content">
                          <div className="mp-notif-item-title">{n.title}</div>
                          <div className="mp-notif-item-desc">{n.message}</div>
                          <div className="mp-notif-item-time">{formatRelative(n.created_at)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Manager Profile Dropdown */}
        <div className="mp-dropdown-wrap" ref={profileRef}>
          <button
            type="button"
            className="mp-profile-trigger"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-expanded={profileOpen}
          >
            <div className="mp-avatar-circle">
              {manager?.initials || (manager?.name ? manager.name.slice(0, 2).toUpperCase() : "MG")}
            </div>
            <div className="mp-profile-meta">
              <span className="mp-profile-name">{manager?.name || "Manager"}</span>
              <span className="mp-profile-role">{manager?.role || "Manager"}</span>
            </div>
            <ChevronDown size={14} className="mp-profile-caret" />
          </button>

          {profileOpen && (
            <div className="mp-dropdown-panel mp-profile-panel">
              <div className="mp-profile-panel-head">
                <div className="mp-avatar-circle lg">
                  {manager?.initials || (manager?.name ? manager.name.slice(0, 2).toUpperCase() : "MG")}
                </div>
                <div>
                  <div className="mp-panel-name">{manager?.name || "Manager"}</div>
                  <div className="mp-panel-email">{manager?.email || ""}</div>
                </div>
              </div>

              <div className="mp-dropdown-divider" />

              <div className="mp-profile-menu-list">
                <button
                  type="button"
                  className="mp-profile-menu-item"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/manager/profile");
                  }}
                >
                  <User size={16} />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  className="mp-profile-menu-item"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/manager/settings");
                  }}
                >
                  <Settings size={16} />
                  <span>Manager Settings</span>
                </button>

                <button
                  type="button"
                  className="mp-profile-menu-item"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/manager/change-password");
                  }}
                >
                  <KeyRound size={16} />
                  <span>Change Password</span>
                </button>

                <div className="mp-dropdown-divider" />

                <button
                  type="button"
                  className="mp-profile-menu-item mp-danger-item"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
