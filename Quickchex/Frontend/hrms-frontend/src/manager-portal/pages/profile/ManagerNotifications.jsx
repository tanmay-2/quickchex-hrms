import React, { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, Clock, AlertTriangle, Trash2, Check } from "lucide-react";
import { managerToast } from "../../components/ManagerToast";
import { getNotifications, markAllNotificationsRead } from "../../services/managerApiService";

const formatRelative = (iso) => {
  if (!iso) return "Recently";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "Recently";
  }
};

export const ManagerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      const list = Array.isArray(data) ? data : [];
      const mapped = list.map((n) => {
        let icon = Clock;
        let color = "#7C3AED";
        if (n.type === "success") {
          icon = CheckCircle2;
          color = "#059669";
        } else if (n.type === "error" || n.type === "warning") {
          icon = AlertTriangle;
          color = "#D97706";
        }
        return {
          id: n.id,
          category: n.category || "System",
          title: n.title,
          desc: n.message,
          time: formatRelative(n.created_at),
          unread: !n.is_read,
          icon,
          color,
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
  }, [fetchNotifs]);

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    managerToast.success("All notifications marked as read.", { title: "Notifications Cleared" });
  };

  const clearAll = () => {
    setNotifications([]);
    managerToast.info("Notification list cleared.", { title: "List Cleared" });
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return n.unread;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
            Manager Notifications Center
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
            Alerts on team regularization requests, leave applications, and attendance anomalies.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={markAllAsRead}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--mp-border)",
              background: "var(--mp-surface)",
              color: "var(--mp-text-primary)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Check size={14} /> Mark All Read
          </button>
          <button
            type="button"
            onClick={clearAll}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #FECACA",
              background: "#FEF2F2",
              color: "#DC2626",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Trash2 size={14} /> Clear All
          </button>
        </div>
      </div>

      <div
        style={{
          background: "var(--mp-surface, #FFFFFF)",
          border: "1px solid var(--mp-border, #E6E3EE)",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "var(--mp-shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)" }}>
            No notifications to display.
          </div>
        ) : (
          filtered.map((n) => {
            const Icon = n.icon;
            return (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: n.unread ? "var(--mp-brand-50, #F3EEFF)" : "var(--mp-surface-subtle, #F8F7FB)",
                  border: "1px solid var(--mp-border)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "var(--mp-surface)",
                    color: n.color,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    border: "1px solid var(--mp-border)",
                  }}
                >
                  <Icon size={18} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--mp-text-primary)" }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: "11.5px", color: "var(--mp-text-muted)" }}>{n.time}</span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--mp-text-secondary)" }}>
                    {n.desc}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
