import React, { useMemo, useState, useEffect } from "react";
import { Bell, CheckCircle2, ClipboardList, FileText, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./AdminNotificationsPage.css";
import { getApiBaseUrl } from "../../services/apiClient";

const INITIAL = [
  { id: "n1", category: "Process", title: "28 process alerts need review", message: "Several process alerts are waiting for administrative review.", time: "10 min ago", unread: true, icon: Bell },
  { id: "n2", category: "Attendance", title: "Regularization request is pending", message: "A regularization request is awaiting review.", time: "1 hr ago", unread: true, icon: ClipboardList },
  { id: "n3", category: "Announcement", title: "Office timings update", message: "A new announcement has been published.", time: "3 hr ago", unread: false, icon: FileText },
  { id: "n4", category: "Holiday", title: "1 holiday coming up this week", message: "Review the holiday calendar for upcoming dates.", time: "Yesterday", unread: false, icon: CheckCircle2 },
];

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(INITIAL);
  const [q, setQ] = useState("");

  useEffect(() => {
    const API_BASE = getApiBaseUrl();
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (!token) return;

    fetch(`${API_BASE}/notifications/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(
            data.map((d) => ({
              id: d.id,
              category: d.category || (d.notification_type === "POLICY_UPDATED" ? "Policy" : "System"),
              title: d.title,
              message: d.message,
              time: d.updated_date || (d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Recent"),
              unread: !d.is_read,
              notification_type: d.notification_type,
              version: d.version_number || d.version,
              updatedDate: d.updated_date,
              icon: d.notification_type === "POLICY_UPDATED" ? FileText : Bell,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleMarkRead = (id) => {
    setItems((current) =>
      current.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (token) {
      fetch(`${getApiBaseUrl()}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  const filtered = useMemo(() => {
    const value = q.trim().toLowerCase();
    if (!value) return items;
    return items.filter((item) =>
      `${item.category} ${item.title} ${item.message}`.toLowerCase().includes(value)
    );
  }, [items, q]);

  const unread = items.filter((item) => item.unread).length;

  return (
    <div className="admin-notifications-page">
      <div className="admin-notifications-shell">
        <div className="admin-notifications-search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notifications..." />
        </div>

        <section className="admin-notifications-list">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.id}
                className={`admin-notification-card${item.unread ? " unread" : ""}`}
                onClick={() => {
                  if (item.unread) handleMarkRead(item.id);
                  if (item.notification_type === "POLICY_UPDATED") {
                    navigate("/dashboard/policies");
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="admin-notification-icon"><Icon size={18} /></div>
                <div className="admin-notification-copy">
                  <small>{item.category}</small>
                  <h2>{item.title}</h2>
                  <p>{item.message}</p>
                  {(item.version || item.updatedDate) && (
                    <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "#6D28D9", margin: "4px 0" }}>
                      {item.version && <span>Version: {item.version}</span>}
                      {item.updatedDate && <span>Updated: {item.updatedDate}</span>}
                    </div>
                  )}
                  <time>{item.time}</time>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkRead(item.id);
                    if (item.notification_type === "POLICY_UPDATED") {
                      navigate("/dashboard/policies");
                    }
                  }}
                >
                  {item.notification_type === "POLICY_UPDATED" ? "View Policy" : (item.unread ? "Mark read" : "Read")}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
