// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - MANAGERNOTIFICATIONS.JSX
// Path: Frontend/hrms-frontend/src/manager-portal/pages/profile/ManagerNotifications.jsx
// Purpose: Web portal page component managing 'ManagerNotifications' views, user interactions, and state.
// UI Components:
//   • <ManagerNotifications />
//   • <Icon />
// Key Functions & Handlers:
//   • formatRelative()
//   • getNotificationMeta()
//   • handleSync()
//   • markAllAsRead()
//   • clearAll()
//   • handleMarkOneRead()
//   • handleNotificationClick()
// ==============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Check,
  FileText,
  FileCheck,
  Users,
  ChevronRight,
} from "lucide-react";
import { managerToast } from "../../components/ManagerToast";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../services/managerApiService";
import "./ProfilePages.css";

const formatRelative = (iso) => {
  if (!iso) return "Just now";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Recently";
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs === 1) return "1 hour ago";
    if (hrs < 24) return `${hrs} hours ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "Recently";
  }
};

const getNotificationMeta = (n) => {
  const typeStr = (n.notification_type || n.type || n.category || "").toLowerCase();
  const titleStr = (n.title || "").toLowerCase();

  if (typeStr.includes("regularization") || titleStr.includes("regularization")) {
    return {
      Icon: FileCheck,
      bg: "#EDE9FE",
      color: "#7C3AED",
      route: "/manager/approvals/regularization",
      category: "Regularization",
    };
  }
  if (typeStr.includes("leave") || titleStr.includes("leave")) {
    return {
      Icon: CheckCircle2,
      bg: "#DCFCE7",
      color: "#16A34A",
      route: "/manager/approvals/leave",
      category: "Leave",
    };
  }
  if (typeStr.includes("policy") || titleStr.includes("policy")) {
    return {
      Icon: FileText,
      bg: "#F3E8FF",
      color: "#9333EA",
      route: "/manager/policies",
      category: "Policy",
    };
  }
  if (
    typeStr.includes("attendance") ||
    titleStr.includes("attendance") ||
    typeStr.includes("late") ||
    titleStr.includes("late") ||
    typeStr.includes("clock")
  ) {
    return {
      Icon: AlertTriangle,
      bg: "#FEF3C7",
      color: "#D97706",
      route: "/manager/attendance/live",
      category: "Attendance",
    };
  }
  if (typeStr.includes("team") || titleStr.includes("team") || titleStr.includes("member") || typeStr.includes("onboard")) {
    return {
      Icon: Users,
      bg: "#E0F2FE",
      color: "#0284C7",
      route: "/manager/team",
      category: "Team Member",
    };
  }
  if (typeStr.includes("shift") || titleStr.includes("shift")) {
    return {
      Icon: Clock,
      bg: "#FFE4E6",
      color: "#E11D48",
      route: "/manager/shifts",
      category: "Shift",
    };
  }
  return {
    Icon: Bell,
    bg: "#F1F5F9",
    color: "#64748B",
    route: null,
    category: "Notification",
  };
};

export const ManagerNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      const list = Array.isArray(data) ? data : [];

      // Filter out notifications cleared by user in this session
      const clearedIds = JSON.parse(
        localStorage.getItem("manager_cleared_notifications") || "[]"
      );
      const filteredList = list.filter((n) => !clearedIds.includes(n.id));

      const mapped = filteredList.map((n) => {
        const meta = getNotificationMeta(n);
        return {
          id: n.id,
          category: n.category || meta.category,
          title: n.title,
          desc: n.message,
          time: formatRelative(n.created_at),
          unread: !n.is_read,
          notificationType: n.notification_type,
          policyId: n.policy_id || n.reference_id,
          version: n.version_number || n.version,
          updatedDate: n.updated_date,
          Icon: meta.Icon,
          bg: meta.bg,
          color: meta.color,
          route: meta.route,
        };
      });
      setNotifications(mapped);
    } catch (err) {
      console.warn("Could not fetch notifications:", err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const handleSync = () => fetchNotifs();
    window.addEventListener("manager-notifications-updated", handleSync);
    return () => window.removeEventListener("manager-notifications-updated", handleSync);
  }, [fetchNotifs]);

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.warn("Could not mark all notifications as read:", err);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    window.dispatchEvent(new CustomEvent("manager-notifications-updated"));
    managerToast.success("All notifications marked as read.", {
      title: "Notifications Updated",
    });
  };

  const clearAll = async () => {
    const clearedIds = notifications.map((n) => n.id);
    const existingCleared = JSON.parse(
      localStorage.getItem("manager_cleared_notifications") || "[]"
    );
    const merged = Array.from(new Set([...existingCleared, ...clearedIds]));
    localStorage.setItem("manager_cleared_notifications", JSON.stringify(merged));
    
    // Also mark them read on backend so unread badges drop to 0
    try {
      await markAllNotificationsRead();
    } catch (e) {}

    setNotifications([]);
    window.dispatchEvent(new CustomEvent("manager-notifications-updated"));
    managerToast.info("Notification list cleared.", { title: "List Cleared" });
  };

  const handleMarkOneRead = async (id) => {
    try {
      await markNotificationRead(id);
    } catch {}
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    window.dispatchEvent(new CustomEvent("manager-notifications-updated"));
  };

  const handleNotificationClick = async (n) => {
    if (n.unread) {
      await handleMarkOneRead(n.id);
    }
    if (n.route) {
      navigate(n.route);
    } else if (n.notificationType === "POLICY_UPDATED" || n.policyId) {
      navigate("/manager/policies");
    }
  };

  return (
    <div className="mp-notifs-page">
      {/* Page Header */}
      <div className="mp-page-header-wrap">
        <div className="mp-page-header-text">
          <h2 className="mp-page-main-title">Manager Notifications Center</h2>
          <p className="mp-page-subtitle">
            Alerts on company policy updates, team regularization requests, leave applications, and attendance.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mp-notifs-actions-row">
          <button
            type="button"
            className="mp-btn-mark-read"
            onClick={markAllAsRead}
            disabled={notifications.length === 0}
            title="Mark All Read"
          >
            <Check size={16} />
            <span>Mark All Read</span>
          </button>
          <button
            type="button"
            className="mp-btn-clear-all"
            onClick={clearAll}
            disabled={notifications.length === 0}
            title="Clear All"
          >
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Notifications List / Skeletons / Empty */}
      {loading ? (
        <div className="mp-notifs-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mp-notif-skeleton">
              <div className="mp-skeleton-icon-box" />
              <div className="mp-skeleton-lines">
                <div className="mp-skeleton-bar-title" />
                <div className="mp-skeleton-bar-desc" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="mp-notifs-empty">
          <div className="mp-notifs-empty-icon">
            <Bell size={26} />
          </div>
          <div className="mp-notifs-empty-title">No notifications to display.</div>
          <p className="mp-notifs-empty-desc">
            You are all caught up with team alerts, approval requests, and policy updates.
          </p>
        </div>
      ) : (
        <div className="mp-notifs-list">
          {notifications.map((n) => {
            const Icon = n.Icon;
            return (
              <div
                key={n.id}
                className={`mp-notif-card ${n.unread ? "unread" : ""}`}
                onClick={() => handleNotificationClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleNotificationClick(n);
                  }
                }}
              >
                {/* Category Icon */}
                <div
                  className="mp-notif-icon-box"
                  style={{ backgroundColor: n.bg, color: n.color }}
                >
                  <Icon size={20} />
                </div>

                {/* Notification Content */}
                <div className="mp-notif-body">
                  <div className="mp-notif-top">
                    <span className="mp-notif-title">{n.title}</span>
                    <div className="mp-notif-meta-right">
                      <span className="mp-notif-time">{n.time}</span>
                      <span
                        className={n.unread ? "mp-notif-unread-dot" : "mp-notif-read-dot"}
                        title={n.unread ? "Unread notification" : "Read"}
                      />
                    </div>
                  </div>
                  <p className="mp-notif-message">{n.desc}</p>
                </div>

                {/* Chevron Navigation Indicator */}
                <ChevronRight size={18} className="mp-notif-chevron" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
