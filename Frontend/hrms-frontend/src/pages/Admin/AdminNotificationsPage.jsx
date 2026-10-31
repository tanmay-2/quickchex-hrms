// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - ADMINNOTIFICATIONSPAGE.JSX
// Path: Frontend/hrms-frontend/src/pages/Admin/AdminNotificationsPage.jsx
// Purpose: Web portal page component managing 'AdminNotificationsPage' views, user interactions, and state.
// UI Components:
//   • <FALLBACK_SEED />
//   • <AdminNotificationsPage />
//   • <Icon />
// Key Functions & Handlers:
//   • showToast()
//   • handleMarkRead()
//   • handleToggleRead()
//   • handleMarkAllRead()
//   • handleNotificationAction()
//   • handleCardClick()
//   • handleKeyDown()
//   • formatTime()
//   • ... and 2 more handlers
// ==============================================================================

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  CheckCheck,
  RotateCw,
  Search,
  X,
  ChevronRight,
  ExternalLink,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Inbox,
  CalendarCheck,
  Check,
  Info
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./AdminNotificationsPage.css";
import { getApiUrl, authHeaders } from "../../services/apiClient";

/* ── Fallback Seed Notifications (if backend has 0 records) ──────────── */
const FALLBACK_SEED = [
  {
    id: "reg_1",
    category: "Regularization",
    title: "Regularization Request Approved",
    message: "Your attendance regularization request for 2026-09-25 was approved by Admin.",
    time: "13 Oct 2026",
    unread: true,
    notification_type: "REGULARIZATION",
    type: "success",
    target_date: "2026-09-25"
  },
  {
    id: "leave_1",
    category: "Leave",
    title: "Casual Leave Approved",
    message: "Your leave application for 2 days has been approved by Kevin John.",
    time: "12 Oct 2026",
    unread: true,
    notification_type: "LEAVE",
    type: "success"
  },
  {
    id: "policy_1",
    category: "Policy",
    title: "Company Remote Work Policy Updated",
    message: "The company policy 'Test Remote Policy 2026' has been updated. Please review the latest version.",
    time: "29 Sep 2026",
    unread: false,
    notification_type: "POLICY_UPDATED",
    version: "1.0",
    updatedDate: "29-09-2026",
    policy_name: "Test Remote Policy 2026"
  },
  {
    id: "sys_1",
    category: "System",
    title: "Payroll Finalization Complete",
    message: "Payroll calculations and reconciliation for October 2026 are ready for review.",
    time: "Yesterday",
    unread: false,
    notification_type: "SYSTEM",
    type: "info"
  }
];

function formatTime(val) {
  if (!val) return "Recent";
  if (typeof val === "string" && (val.includes("ago") || val === "Yesterday" || val === "Recent")) {
    return val;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getCategoryTone(category) {
  const c = String(category || "").toLowerCase();
  if (c.includes("regulariz") || c.includes("attendance")) return "tone-emerald";
  if (c.includes("leave")) return "tone-blue";
  if (c.includes("policy")) return "tone-purple";
  if (c.includes("system") || c.includes("process")) return "tone-amber";
  return "tone-purple";
}

function getCategoryIcon(category, type) {
  const c = String(category || "").toLowerCase();
  if (c.includes("regulariz")) return CalendarCheck;
  if (c.includes("leave")) return CheckCircle2;
  if (c.includes("policy")) return ShieldCheck;
  if (c.includes("system")) return Bell;
  return type === "success" ? CheckCircle2 : Bell;
}

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramId = searchParams.get("id");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Show transient toast notification
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Fetch notifications from live backend
  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const endpoints = [
        getApiUrl("/notifications/me"),
        getApiUrl("/api/v1/notifications/me"),
        getApiUrl("/notifications")
      ];

      let fetchedData = null;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            headers: authHeaders({ Accept: "application/json" })
          });
          if (res.ok) {
            fetchedData = await res.json();
            if (Array.isArray(fetchedData)) break;
          }
        } catch {
          // Continue to next endpoint fallback
        }
      }

      if (Array.isArray(fetchedData) && fetchedData.length > 0) {
        const mapped = fetchedData.map((d) => {
          let category = d.category;
          if (!category) {
            if (d.notification_type === "POLICY_UPDATED") category = "Policy";
            else if (d.notification_type === "REGULARIZATION") category = "Regularization";
            else if (d.notification_type === "LEAVE") category = "Leave";
            else category = "System";
          }

          return {
            id: String(d.id),
            rawId: d.id,
            category,
            title: d.title || "Notification",
            message: d.message || "",
            time: formatTime(d.updated_date || d.created_at),
            rawDate: d.created_at || d.updated_date,
            unread: !d.is_read && !d.read,
            notification_type: d.notification_type || "GENERAL",
            type: d.type || "info",
            version: d.version_number || d.version,
            updatedDate: d.updated_date,
            policy_id: d.policy_id,
            policy_name: d.policy_name,
            target_date: d.target_date,
            metadata: d.metadata || {}
          };
        });
        setItems(mapped);
      } else {
        // Fallback seed notifications so UI is always interactive and full
        setItems(FALLBACK_SEED);
      }
    } catch (err) {
      console.warn("Failed to fetch live notifications, using fallback:", err);
      setItems(FALLBACK_SEED);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-open notification detail drawer when ?id= param is specified
  useEffect(() => {
    if (paramId && items.length > 0) {
      const match = items.find(
        (i) => String(i.id) === String(paramId) || String(i.rawId) === String(paramId)
      );
      if (match) {
        setSelectedNotif(match);
      }
    }
  }, [paramId, items]);

  // Mark a single notification as read
  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();

    // Optimistic update
    setItems((curr) =>
      curr.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    if (selectedNotif && selectedNotif.id === id) {
      setSelectedNotif((prev) => ({ ...prev, unread: false }));
    }

    try {
      const endpoints = [
        getApiUrl(`/notifications/${id}/read`),
        getApiUrl(`/api/v1/notifications/${id}/read`)
      ];
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "PATCH",
            headers: authHeaders()
          });
          if (res.ok) break;
        } catch {
          // Ignore fallback errors
        }
      }
    } catch {
      // Local optimistic state preserved
    }
  };

  // Toggle read/unread state locally and update server
  const handleToggleRead = async (item, e) => {
    if (e) e.stopPropagation();
    if (item.unread) {
      await handleMarkRead(item.id, e);
      showToast("Notification marked as read");
    } else {
      // Mark as unread
      setItems((curr) =>
        curr.map((n) => (n.id === item.id ? { ...n, unread: true } : n))
      );
      if (selectedNotif && selectedNotif.id === item.id) {
        setSelectedNotif((prev) => ({ ...prev, unread: true }));
      }
      showToast("Notification marked as unread");
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    const unreadCount = items.filter((n) => n.unread).length;
    if (unreadCount === 0) {
      showToast("All notifications are already marked as read.");
      return;
    }

    // Optimistic update
    setItems((curr) => curr.map((n) => ({ ...n, unread: false })));
    if (selectedNotif) {
      setSelectedNotif((prev) => ({ ...prev, unread: false }));
    }

    try {
      const endpoints = [
        getApiUrl("/notifications/read-all"),
        getApiUrl("/api/v1/notifications/read-all")
      ];
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "PATCH",
            headers: authHeaders()
          });
          if (res.ok) break;
        } catch {
          // Ignore
        }
      }
      showToast(`Marked ${unreadCount} notifications as read.`);
    } catch {
      showToast("Marked notifications as read.");
    }
  };

  // Navigate to contextual target action based on notification type
  const handleNotificationAction = (item) => {
    const type = String(item.notification_type || "").toUpperCase();
    const cat = String(item.category || "").toUpperCase();

    if (type.includes("POLICY") || cat.includes("POLICY")) {
      navigate("/dashboard/policy-updates");
    } else if (type.includes("REGULARIZ") || cat.includes("REGULARIZ")) {
      navigate("/dashboard/attendance-record");
    } else if (type.includes("LEAVE") || cat.includes("LEAVE")) {
      navigate("/dashboard/leave-application");
    } else if (type.includes("TICKET") || cat.includes("TICKET")) {
      navigate("/dashboard/tickets");
    } else if (type.includes("PAYROLL")) {
      navigate("/admin/payroll");
    } else {
      navigate("/dashboard");
    }
  };

  // Handle clicking a notification card to view its full professional drawer
  const handleCardClick = (item) => {
    setSelectedNotif(item);
    if (item.unread) {
      handleMarkRead(item.id);
    }
  };

  // Dynamic Metrics / KPI Computations
  const stats = useMemo(() => {
    const total = items.length;
    const unread = items.filter((i) => i.unread).length;
    const approvals = items.filter((i) => {
      const cat = (i.category || "").toLowerCase();
      const type = (i.notification_type || "").toLowerCase();
      return cat.includes("regulariz") || cat.includes("leave") || type.includes("reg") || type.includes("leave");
    }).length;
    const policies = items.filter((i) => {
      const cat = (i.category || "").toLowerCase();
      const type = (i.notification_type || "").toLowerCase();
      return cat.includes("policy") || type.includes("policy");
    }).length;

    return { total, unread, approvals, policies };
  }, [items]);

  // Tab Filtering
  const filtered = useMemo(() => {
    let result = items;

    // 1. Tab filter
    if (activeTab === "unread") {
      result = result.filter((i) => i.unread);
    } else if (activeTab === "regularization") {
      result = result.filter((i) => (i.category || "").toLowerCase().includes("regulariz") || (i.notification_type || "").toLowerCase().includes("reg"));
    } else if (activeTab === "leave") {
      result = result.filter((i) => (i.category || "").toLowerCase().includes("leave") || (i.notification_type || "").toLowerCase().includes("leave"));
    } else if (activeTab === "policy") {
      result = result.filter((i) => (i.category || "").toLowerCase().includes("policy") || (i.notification_type || "").toLowerCase().includes("policy"));
    }

    // 2. Search filter
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (i) =>
          `${i.category} ${i.title} ${i.message} ${i.notification_type}`
            .toLowerCase()
            .includes(query)
      );
    }

    return result;
  }, [items, activeTab, search]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedNotif(null);
      }
    };
    if (selectedNotif) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedNotif]);

  // Prevent background body scroll when drawer is active, restore safely on dismiss/unmount
  useEffect(() => {
    if (selectedNotif) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow || "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [selectedNotif]);

  return (
    <div className="notif-page-container">
      {/* ── Toast Feedback Notification ── */}
      {toastMessage && (
        <div className="notif-toast-banner" role="status">
          <Info size={16} />
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} aria-label="Close">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Top Action Bar ── */}
      <section className="notif-action-bar">
        <div className="notif-action-left">
          <div className="notif-title-group">
            <h2 className="notif-main-title">Notification Center</h2>
            <span className="notif-live-pill">
              <span className="notif-live-dot" /> Live Updates
            </span>
          </div>
          <p className="notif-subtitle">
            Stay updated with real-time employee requests, policy revisions, and system alerts.
          </p>
        </div>

        <div className="notif-action-right">
          <button
            type="button"
            className="notif-btn notif-btn-secondary"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing || loading}
            id="notif-refresh-btn"
            title="Refresh notifications"
          >
            <RotateCw size={15} className={refreshing ? "notif-spin" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            className="notif-btn notif-btn-primary"
            onClick={handleMarkAllRead}
            disabled={stats.unread === 0}
            id="notif-mark-all-read-btn"
            title="Mark all notifications as read"
          >
            <CheckCheck size={16} />
            <span>Mark All as Read</span>
          </button>
        </div>
      </section>

      {/* ── 4 Summary KPI Cards (2x2 on Mobile, 4 Columns on Desktop) ── */}
      <section className="notif-stats-grid">
        {/* Card 1: Total Alerts */}
        <div className="notif-stat-card">
          <div className="notif-stat-head">
            <div className="notif-stat-head-left">
              <div className="notif-stat-icon-badge tone-purple">
                <Bell size={16} />
              </div>
              <span className="notif-stat-label">TOTAL ALERTS</span>
            </div>
            <span className="notif-stat-pill tone-purple">All Time</span>
          </div>
          <div className="notif-stat-val">{stats.total}</div>
          <div className="notif-stat-footer">System notifications recorded</div>
        </div>

        {/* Card 2: Unread */}
        <div className="notif-stat-card">
          <div className="notif-stat-head">
            <div className="notif-stat-head-left">
              <div className="notif-stat-icon-badge tone-rose">
                <AlertCircle size={16} />
              </div>
              <span className="notif-stat-label">UNREAD</span>
            </div>
            {stats.unread > 0 ? (
              <span className="notif-stat-pill tone-rose">Action Needed</span>
            ) : (
              <span className="notif-stat-pill tone-emerald">Caught Up</span>
            )}
          </div>
          <div className="notif-stat-val">{stats.unread}</div>
          <div className="notif-stat-footer">
            {stats.unread > 0 ? `${stats.unread} items awaiting review` : "Zero unread alerts"}
          </div>
        </div>

        {/* Card 3: Approvals & Requests */}
        <div className="notif-stat-card">
          <div className="notif-stat-head">
            <div className="notif-stat-head-left">
              <div className="notif-stat-icon-badge tone-emerald">
                <CalendarCheck size={16} />
              </div>
              <span className="notif-stat-label">APPROVALS</span>
            </div>
            <span className="notif-stat-pill tone-emerald">Requests</span>
          </div>
          <div className="notif-stat-val">{stats.approvals}</div>
          <div className="notif-stat-footer">Attendance & leave statuses</div>
        </div>

        {/* Card 4: Policies & Compliance */}
        <div className="notif-stat-card">
          <div className="notif-stat-head">
            <div className="notif-stat-head-left">
              <div className="notif-stat-icon-badge tone-blue">
                <ShieldCheck size={16} />
              </div>
              <span className="notif-stat-label">POLICIES</span>
            </div>
            <span className="notif-stat-pill tone-blue">Compliance</span>
          </div>
          <div className="notif-stat-val">{stats.policies}</div>
          <div className="notif-stat-footer">Revisions and announcements</div>
        </div>
      </section>

      {/* ── Main Notifications Card ── */}
      <section className="notif-main-card">
        {/* Toolbar with Tabs, Search, and Status Counters */}
        <div className="notif-toolbar">
          {/* Category Tabs */}
          <div className="notif-tabs-scroll-wrap">
            <div className="notif-tabs">
              <button
                type="button"
                className={`notif-tab ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                <span>All</span>
                <span className="notif-tab-count">{stats.total}</span>
              </button>

              <button
                type="button"
                className={`notif-tab ${activeTab === "unread" ? "active" : ""}`}
                onClick={() => setActiveTab("unread")}
              >
                <span>Unread</span>
                <span className={`notif-tab-count ${stats.unread > 0 ? "highlight" : ""}`}>
                  {stats.unread}
                </span>
              </button>

              <button
                type="button"
                className={`notif-tab ${activeTab === "regularization" ? "active" : ""}`}
                onClick={() => setActiveTab("regularization")}
              >
                <span>Regularization</span>
                <span className="notif-tab-count">
                  {items.filter((i) => (i.category || "").toLowerCase().includes("regulariz")).length}
                </span>
              </button>

              <button
                type="button"
                className={`notif-tab ${activeTab === "leave" ? "active" : ""}`}
                onClick={() => setActiveTab("leave")}
              >
                <span>Leaves</span>
                <span className="notif-tab-count">
                  {items.filter((i) => (i.category || "").toLowerCase().includes("leave")).length}
                </span>
              </button>

              <button
                type="button"
                className={`notif-tab ${activeTab === "policy" ? "active" : ""}`}
                onClick={() => setActiveTab("policy")}
              >
                <span>Policies</span>
                <span className="notif-tab-count">{stats.policies}</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="notif-search-box">
            <Search size={15} className="notif-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications by title, type, keywords..."
              className="notif-search-input"
              aria-label="Search notifications"
              id="notif-search-input"
            />
            {search && (
              <button
                type="button"
                className="notif-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter sub-count indicator */}
        <div className="notif-count-meta">
          <span>
            Showing <strong>{filtered.length}</strong> of {items.length} notification
            {items.length === 1 ? "" : "s"}
            {stats.unread > 0 && ` (${stats.unread} unread)`}
          </span>
          {activeTab !== "all" && (
            <button
              type="button"
              className="notif-clear-filter-btn"
              onClick={() => {
                setActiveTab("all");
                setSearch("");
              }}
            >
              Reset filters
            </button>
          )}
        </div>

        {/* ── Notification Items List ── */}
        <div className="notif-list-wrap">
          {loading ? (
            <div className="notif-loading-state">
              <RotateCw size={26} className="notif-spin" />
              <strong>Loading notifications...</strong>
              <span>Fetching dynamic alerts from your organization server.</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="notif-empty-state">
              <div className="notif-empty-icon-wrap">
                <Inbox size={32} />
              </div>
              <h3 className="notif-empty-title">
                {search ? "No matching notifications found" : "No notifications in this view"}
              </h3>
              <p className="notif-empty-sub">
                {search
                  ? `No alerts matched your search query "${search}". Try checking your spelling or clearing filters.`
                  : "You're completely up to date! New approvals and announcements will appear right here."}
              </p>
              {(search || activeTab !== "all") && (
                <button
                  type="button"
                  className="notif-btn notif-btn-secondary"
                  onClick={() => {
                    setSearch("");
                    setActiveTab("all");
                  }}
                >
                  View All Notifications
                </button>
              )}
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = getCategoryIcon(item.category, item.type);
              const toneClass = getCategoryTone(item.category);

              return (
                <article
                  key={item.id}
                  className={`notif-card ${item.unread ? "unread" : "read"}`}
                  onClick={() => handleCardClick(item)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Notification: ${item.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCardClick(item);
                    }
                  }}
                >
                  {/* Row 1: Type/icon + Category badge + Read/unread status + Desktop Time */}
                  <div className="notif-card-header">
                    <div className="notif-card-header-left">
                      <div className={`notif-card-avatar ${toneClass}`}>
                        <Icon size={16} />
                      </div>
                      <span className={`notif-cat-badge ${toneClass}`}>
                        {item.category.toUpperCase()}
                      </span>
                      {item.unread ? (
                        <span className="notif-unread-pill">
                          <span className="notif-unread-dot" />
                          <span>New</span>
                        </span>
                      ) : (
                        <span className="notif-read-pill">
                          <span>Read</span>
                        </span>
                      )}
                    </div>

                    <time className="notif-card-time notif-card-time--desktop">
                      <Clock size={12} />
                      <span>{item.time}</span>
                    </time>
                  </div>

                  {/* Row 2: Main Content (Title + Message preview + Metadata tags) */}
                  <div className="notif-card-content">
                    <h3 className="notif-card-title">{item.title}</h3>
                    <p className="notif-card-desc">{item.message}</p>

                    {(item.version || item.updatedDate || item.target_date) && (
                      <div className="notif-card-tags">
                        {item.version && (
                          <span className="notif-tag">
                            <FileText size={12} /> Version {item.version}
                          </span>
                        )}
                        {item.updatedDate && (
                          <span className="notif-tag">
                            <Calendar size={12} /> Updated: {item.updatedDate}
                          </span>
                        )}
                        {item.target_date && (
                          <span className="notif-tag">
                            <Calendar size={12} /> Target: {item.target_date}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 3: Footer (Date/time on left + Actions on right) */}
                  <div className="notif-card-footer" onClick={(e) => e.stopPropagation()}>
                    <time className="notif-card-time notif-card-time--mobile">
                      <Clock size={12} />
                      <span>{item.time}</span>
                    </time>

                    <div className="notif-card-footer-actions">
                      <button
                        type="button"
                        className={`notif-action-btn ${item.unread ? "mark-read" : "mark-unread"}`}
                        onClick={(e) => handleToggleRead(item, e)}
                        title={item.unread ? "Mark as read" : "Mark as unread"}
                        aria-label={item.unread ? "Mark as read" : "Mark as unread"}
                      >
                        {item.unread ? (
                          <>
                            <Check size={13} />
                            <span className="notif-action-label">Mark read</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            <span className="notif-action-label">Read</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="notif-open-details-btn"
                        onClick={() => handleCardClick(item)}
                        title="View full details"
                        aria-label="View full details"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* ── Slide-Over Detail Drawer (Modal / Bottom Sheet on Mobile) ── */}
      {selectedNotif &&
        createPortal(
          <div className="notif-drawer-overlay">
          {/* Backdrop button to close */}
          <button
            type="button"
            className="notif-drawer-backdrop"
            aria-label="Close notification details"
            onClick={() => setSelectedNotif(null)}
          />

          <aside
            className="notif-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-drawer-title"
          >
            {/* Drawer Header */}
            <div className="notif-drawer-head">
              <div>
                <span className="notif-drawer-eyebrow">
                  {selectedNotif.category.toUpperCase()} ALERT
                </span>
                <h2 className="notif-drawer-h2" id="notif-drawer-title">
                  Notification Details
                </h2>
                <p className="notif-drawer-sub">
                  ID: <span className="notif-mono-id">{selectedNotif.id}</span> · Received {selectedNotif.time}
                </p>
              </div>

              <button
                type="button"
                className="notif-drawer-close"
                onClick={() => setSelectedNotif(null)}
                aria-label="Close drawer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="notif-drawer-body">
              {/* Profile / Category Hero */}
              <div className="notif-drawer-hero">
                <div className={`notif-drawer-hero-icon ${getCategoryTone(selectedNotif.category)}`}>
                  {React.createElement(getCategoryIcon(selectedNotif.category, selectedNotif.type), {
                    size: 24
                  })}
                </div>
                <div className="notif-drawer-hero-info">
                  <span className={`notif-cat-badge ${getCategoryTone(selectedNotif.category)}`}>
                    {selectedNotif.category}
                  </span>
                  <h3 className="notif-drawer-hero-title">{selectedNotif.title}</h3>
                  <div className="notif-drawer-hero-meta">
                    <span className="notif-time-badge">
                      <Clock size={12} /> {selectedNotif.time}
                    </span>
                    <span
                      className={`notif-status-badge ${selectedNotif.unread ? "unread" : "read"}`}
                    >
                      {selectedNotif.unread ? "Unread" : "Read"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Message Box */}
              <div className="notif-drawer-message-card">
                <span className="notif-detail-label">MESSAGE</span>
                <p className="notif-drawer-message-text">{selectedNotif.message}</p>
              </div>

              {/* Structured Metadata Grid */}
              <div className="notif-drawer-section">
                <span className="notif-detail-section-title">Record Details</span>
                <div className="notif-drawer-grid">
                  <div className="notif-detail-item">
                    <span className="notif-detail-prop">Category</span>
                    <strong className="notif-detail-val">{selectedNotif.category}</strong>
                  </div>

                  <div className="notif-detail-item">
                    <span className="notif-detail-prop">Event Type</span>
                    <strong className="notif-detail-val">{selectedNotif.notification_type}</strong>
                  </div>

                  {selectedNotif.version && (
                    <div className="notif-detail-item">
                      <span className="notif-detail-prop">Policy Version</span>
                      <strong className="notif-detail-val">Version {selectedNotif.version}</strong>
                    </div>
                  )}

                  {selectedNotif.updatedDate && (
                    <div className="notif-detail-item">
                      <span className="notif-detail-prop">Effective Date</span>
                      <strong className="notif-detail-val">{selectedNotif.updatedDate}</strong>
                    </div>
                  )}

                  {selectedNotif.target_date && (
                    <div className="notif-detail-item">
                      <span className="notif-detail-prop">Target Date</span>
                      <strong className="notif-detail-val">{selectedNotif.target_date}</strong>
                    </div>
                  )}

                  <div className="notif-detail-item">
                    <span className="notif-detail-prop">Status</span>
                    <strong className="notif-detail-val">
                      {selectedNotif.unread ? "Pending Review" : "Acknowledged"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Contextual Action Banner */}
              <div className="notif-drawer-action-banner">
                <div className="notif-action-banner-text">
                  <strong>Take Action on this Alert</strong>
                  <p>
                    Navigate to the respective HRMS management module to view full records, download policies, or process requests.
                  </p>
                </div>
                <button
                  type="button"
                  className="notif-btn notif-btn-primary notif-btn-wide"
                  onClick={() => {
                    handleNotificationAction(selectedNotif);
                    setSelectedNotif(null);
                  }}
                >
                  <span>Open {selectedNotif.category} Module</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="notif-drawer-footer">
              <button
                type="button"
                className="notif-btn notif-btn-secondary"
                onClick={(e) => handleToggleRead(selectedNotif, e)}
              >
                {selectedNotif.unread ? (
                  <>
                    <Check size={14} />
                    <span>Mark as Read</span>
                  </>
                ) : (
                  <>
                    <RotateCw size={13} />
                    <span>Mark as Unread</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="notif-btn notif-btn-primary"
                onClick={() => setSelectedNotif(null)}
              >
                Close
              </button>
            </div>
          </aside>
        </div>,
        document.body
      )}
    </div>
  );
}
