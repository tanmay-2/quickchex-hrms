import React, { useMemo, useState } from "react";
import { Bell, CheckCircle2, ClipboardList, FileText, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./AdminNotificationsPage.css";

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
              <article key={item.id} className={`admin-notification-card${item.unread ? " unread" : ""}`}>
                <div className="admin-notification-icon"><Icon size={18} /></div>
                <div className="admin-notification-copy">
                  <small>{item.category}</small>
                  <h2>{item.title}</h2>
                  <p>{item.message}</p>
                  <time>{item.time}</time>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.map((n) => n.id === item.id ? { ...n, unread: false } : n)
                    )
                  }
                >
                  {item.unread ? "Mark read" : "Read"}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
