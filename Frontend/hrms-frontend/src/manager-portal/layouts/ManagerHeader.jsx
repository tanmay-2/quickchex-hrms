import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  User,
  Settings,
  KeyRound,
  LogOut,
  LogIn,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  X,
  Menu,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useManagerAuth } from "../auth/ManagerAuthContext";
import { getNotifications, markNotificationRead, getMyTodayAttendance } from "../services/managerApiService";
import AttendancePunch from "../../pages/EmployeePortal/components/AttendancePunch";

export const ManagerHeader = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { manager, logout, role } = useManagerAuth();

  const isAdmin =
    role === "admin" ||
    (localStorage.getItem("role") || "").trim().toLowerCase() === "admin";

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [punchRecord, setPunchRecord] = useState(null);
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [punchModalMode, setPunchModalMode] = useState(null);
  const [managerCountdown, setManagerCountdown] = useState(0);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Sync punch status for logged-in manager
  const fetchMyPunch = useCallback(async () => {
    try {
      const rec = await getMyTodayAttendance();
      if (rec && typeof rec === "object") {
        setPunchRecord(rec);
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchMyPunch();
    const handleUpdate = () => fetchMyPunch();
    window.addEventListener("attendance-updated", handleUpdate);
    window.addEventListener("punch-updated", handleUpdate);
    return () => {
      window.removeEventListener("attendance-updated", handleUpdate);
      window.removeEventListener("punch-updated", handleUpdate);
    };
  }, [fetchMyPunch]);

  // Manager 15-minute buffer live countdown
  useEffect(() => {
    if (!punchRecord?.checkOut || punchRecord?.correction_status !== 'CORRECTION_PENDING') {
      setManagerCountdown(0);
      return;
    }

    const eligibleAt = punchRecord.correction_eligible_at;
    const eligibleMs = eligibleAt ? new Date(eligibleAt).getTime() : null;
    const initRem = typeof punchRecord.correction_remaining_seconds === 'number'
      ? punchRecord.correction_remaining_seconds
      : (eligibleMs ? Math.max(0, Math.ceil((eligibleMs - Date.now()) / 1000)) : 0);
    setManagerCountdown(initRem);

    if (!eligibleMs) return;

    const interval = setInterval(() => {
      const rem = Math.max(0, Math.ceil((eligibleMs - Date.now()) / 1000));
      setManagerCountdown(rem);
      if (rem === 0) {
        clearInterval(interval);
        fetchMyPunch();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [punchRecord, fetchMyPunch]);

  const formatCountdown = (secs) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const sc = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`;
  };

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

  const getPageTitle = (pathname) => {
    if (pathname.includes("attendance/live")) return "Live Attendance";
    if (pathname.includes("attendance/records")) return "Attendance Records";
    if (pathname.includes("attendance/logs")) return "Attendance Logs";
    if (pathname.includes("dashboard")) return "Dashboard";
    if (pathname.includes("approvals/regularization")) return "Regularization";
    if (pathname.includes("approvals/leave")) return "Leave Requests";
    if (pathname.includes("calendar")) return "Team Calendar";
    if (pathname.includes("shifts")) return "Shift Management";
    if (pathname.includes("team")) return "Team Members";
    if (pathname.includes("policies")) return "Company Policies";
    if (pathname.includes("reports")) return "Attendance Reports";
    if (pathname.includes("notifications")) return "Notifications";
    if (pathname.includes("settings")) return "Settings";
    return "Live Attendance";
  };

  const managerInitials = (() => {
    if (manager?.initials) return manager.initials;
    const name = manager?.name || manager?.fullName || "";
    if (!name) return "JS";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  })();

  return (
    <header className="mp-header">
      {/* Left: Organization / Portal Breadcrumb on desktop, Brand on mobile */}
      <div className="mp-header-left">
        <div className="mp-header-breadcrumb mp-desktop-only">
          <span className="mp-breadcrumb-parent">Manager Portal</span>
          <span className="mp-breadcrumb-divider">&lt;</span>
          <span className="mp-breadcrumb-active">{getPageTitle(location.pathname)}</span>
        </div>

        <div className="mp-mobile-brand mp-mobile-only">
          <span className="mp-mobile-brand-name">Manager Portal</span>
        </div>
      </div>

      {/* Right: Actions, Punch Controls, Notifs, Logout, Profile */}
      <div className="mp-header-right">

        {/* Punch In / Out Quick Status & Action */}
        <div className="mp-header-punch-wrap">
          {punchRecord?.checkOut ? (
            punchRecord?.correction_status === 'CORRECTION_PENDING' && (punchRecord?.correction_available || managerCountdown === 0) ? (
              <button
                type="button"
                className="mp-header-punch-pill correction-ready"
                onClick={() => {
                  setPunchModalMode('checkOut');
                  setPunchModalOpen(true);
                }}
                title="Correction Available — Click to Punch Out Again"
              >
                <Sparkles size={14} style={{ color: "#6d44f5" }} />
                <span className="mp-punch-main">Out: {punchRecord.checkOut}</span>
                <span className="mp-punch-btn-action correction-action">
                  <RotateCcw size={12} /> Correct
                </span>
              </button>
            ) : punchRecord?.correction_status === 'CORRECTION_PENDING' && managerCountdown > 0 ? (
              <button
                type="button"
                className="mp-header-punch-pill completed buffer-active"
                onClick={() => {
                  setPunchModalMode(null);
                  setPunchModalOpen(true);
                }}
                title={`Punch Out Completed. Correction available in ${formatCountdown(managerCountdown)}`}
              >
                <Clock size={14} style={{ color: "#6d44f5" }} />
                <span className="mp-punch-main">Out: {punchRecord.checkOut}</span>
                <span className="mp-punch-tag buffer-tag">
                  Corr in {formatCountdown(managerCountdown)}
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="mp-header-punch-pill completed"
                onClick={() => {
                  setPunchModalMode(null);
                  setPunchModalOpen(true);
                }}
                title="Attendance Completed for Today"
              >
                <CheckCircle2 size={15} style={{ color: "#059669" }} />
                <span className="mp-punch-main">Out: {punchRecord.checkOut}</span>
                <span className="mp-punch-tag">
                  {punchRecord?.correction_status === 'CORRECTED' ? 'Corrected' : (punchRecord.hours || "Completed")}
                </span>
              </button>
            )
          ) : punchRecord?.checkIn ? (
            <button
              type="button"
              className="mp-header-punch-pill checked-in"
              onClick={() => {
                setPunchModalMode('checkOut');
                setPunchModalOpen(true);
              }}
              title="Click to Punch Out"
            >
              <span className="mp-punch-live-dot" />
              <span className="mp-punch-main">In: {punchRecord.checkIn}</span>
              <span className="mp-punch-btn-action">
                <LogOut size={13} /> Punch Out
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="mp-header-punch-btn punch-in"
              onClick={() => {
                setPunchModalMode('checkIn');
                setPunchModalOpen(true);
              }}
              title="Click to Punch In for Today"
            >
              <LogIn size={15} />
              <span>Punch In</span>
            </button>
          )}
        </div>

        {/* Desktop Logout Button */}
        <button
          type="button"
          className="mp-header-logout-btn mp-desktop-only"
          onClick={handleSignOut}
          title="Sign Out"
        >
          <LogOut size={15} />
          <span>Logout</span>
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
                          if (!n.is_read) {
                            markNotificationRead(n.id);
                            setNotifications((prev) =>
                              prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
                            );
                          }
                          if (n.notification_type === "POLICY_UPDATED" || n.policy_id || n.reference_type === "POLICY") {
                            navigate("/manager/policies");
                          } else {
                            navigate("/manager/notifications");
                          }
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
              {managerInitials}
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
                  {managerInitials}
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

      {/* Fullscreen Punch Flow / Attendance Punch for Manager */}
      {punchModalOpen && punchModalMode ? (
        <AttendancePunch
          autoOpen={punchModalMode}
          onClose={() => {
            setPunchModalOpen(false);
            setPunchModalMode(null);
          }}
          onPunchSuccess={() => {
            fetchMyPunch();
            window.dispatchEvent(new CustomEvent("punch-updated"));
            setPunchModalOpen(false);
            setPunchModalMode(null);
          }}
        />
      ) : punchModalOpen ? (
        <div className="mp-punch-modal-backdrop" onClick={() => setPunchModalOpen(false)}>
          <div className="mp-punch-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="mp-punch-modal-head">
              <div className="mp-punch-modal-title-wrap">
                <h3 className="mp-punch-modal-title">My Attendance Punch</h3>
                <span className="mp-punch-modal-subtitle">Record your punch-in, punch-out, and daily work mode</span>
              </div>
              <button
                type="button"
                className="mp-punch-modal-close"
                onClick={() => setPunchModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mp-punch-modal-content">
              <AttendancePunch
                compact
                onClose={() => setPunchModalOpen(false)}
                onPunchSuccess={() => {
                  fetchMyPunch();
                  window.dispatchEvent(new CustomEvent("punch-updated"));
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};
