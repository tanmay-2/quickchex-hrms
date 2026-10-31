// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - POLICYUPDATES.JSX
// Path: Frontend/hrms-frontend/src/pages/Dashboard/PolicyUpdates.jsx
// Purpose: Web portal page component managing 'PolicyUpdates' views, user interactions, and state.
// UI Components:
//   • <PolicyUpdates />
// Key Functions & Handlers:
//   • showToast()
//   • handleMarkRead()
//   • handleMarkAllRead()
//   • handleCardClick()
//   • handleDownloadFile()
//   • formatRelativeTime()
// ==============================================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FileText,
  Bell,
  CheckCheck,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Upload,
  Calendar,
  Clock,
  ExternalLink,
  Download,
  Info,
  ChevronRight,
  X,
  ShieldAlert,
  ArrowRight,
  Tag,
  Building,
  User,
  Check,
} from "lucide-react";
import { getApiUrl, authHeaders } from "../../services/apiClient";
import "./PolicyUpdates.css";

function formatRelativeTime(dateString) {
  if (!dateString) return "Recent";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateString);
  }
}

export default function PolicyUpdates() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    uploads: 0,
    updates: 0,
    deleted: 0,
  });

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, UPLOADED, UPDATED, DELETED
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Determine portal base URL for policy links
  const portalPoliciesRoute = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/manager")) return "/manager/policies";
    if (p.startsWith("/dashboard_emp")) return "/dashboard_emp/policies";
    return "/dashboard/policies";
  }, [location.pathname]);

  // Fetch policy notifications from backend API
  const fetchPolicyUpdates = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const url = getApiUrl("/api/v1/policies/updates/feed");
      const res = await fetch(url, {
        headers: authHeaders({ Accept: "application/json" }),
      });

      if (res.ok) {
        const data = await res.json();
        const feedItems = Array.isArray(data.items) ? data.items : [];
        setItems(feedItems);
        if (data.stats) {
          setStats(data.stats);
        } else {
          setStats({
            total: feedItems.length,
            unread: feedItems.filter((i) => !i.is_read).length,
            uploads: feedItems.filter((i) => i.action_type === "UPLOADED").length,
            updates: feedItems.filter((i) => i.action_type === "UPDATED").length,
            deleted: feedItems.filter((i) => i.action_type === "DELETED").length,
          });
        }
      } else {
        // Fallback to general notifications endpoint
        const fallbackUrl = getApiUrl("/api/v1/notifications/me");
        const fbRes = await fetch(fallbackUrl, {
          headers: authHeaders({ Accept: "application/json" }),
        });
        if (fbRes.ok) {
          const allNotifs = await fbRes.json();
          const policyNotifs = (Array.isArray(allNotifs) ? allNotifs : []).filter(
            (n) =>
              n.notification_type?.startsWith("POLICY") ||
              n.reference_type === "POLICY" ||
              n.type === "policy"
          );
          setItems(policyNotifs);
          setStats({
            total: policyNotifs.length,
            unread: policyNotifs.filter((i) => !i.is_read && !i.read).length,
            uploads: policyNotifs.filter(
              (i) => i.action_type === "UPLOADED" || i.notification_type === "POLICY_CREATED"
            ).length,
            updates: policyNotifs.filter(
              (i) => i.action_type === "UPDATED" || i.notification_type === "POLICY_UPDATED"
            ).length,
            deleted: policyNotifs.filter(
              (i) => i.action_type === "DELETED" || i.notification_type === "POLICY_DELETED"
            ).length,
          });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch policy updates:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicyUpdates();
  }, [fetchPolicyUpdates]);

  // Mark single notification as read
  const handleMarkRead = async (item, e) => {
    if (e) e.stopPropagation();
    if (item.is_read || item.read) return;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true, read: true, unread: false } : n))
    );
    setStats((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1),
    }));

    try {
      const endpoints = [
        getApiUrl(`/api/v1/policies/updates/${item.id}/read`),
        getApiUrl(`/api/v1/notifications/${item.id}/read`),
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "PATCH",
            headers: authHeaders(),
          });
          if (res.ok) break;
        } catch {
          // ignore fallback
        }
      }
    } catch {
      // ignore
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const unreadCount = items.filter((n) => !n.is_read && !n.read).length;
    if (unreadCount === 0) {
      showToast("All policy updates are already marked as read.", "info");
      return;
    }

    // Optimistic UI update
    setItems((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read: true, unread: false }))
    );
    setStats((prev) => ({ ...prev, unread: 0 }));

    try {
      const endpoints = [
        getApiUrl("/api/v1/policies/updates/read-all"),
        getApiUrl("/api/v1/notifications/read-all"),
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "PATCH",
            headers: authHeaders(),
          });
          if (res.ok) break;
        } catch {
          // continue
        }
      }
      showToast("All policy updates marked as read.");
    } catch {
      showToast("All policy updates marked as read.");
    }
  };

  // Click on a notification card: mark read & open detail modal
  const handleCardClick = (item) => {
    handleMarkRead(item);
    setSelectedNotif(item);
  };

  // Handle document download for an active policy
  const handleDownloadFile = (policyId, policyName) => {
    if (!policyId) {
      showToast("Policy document ID not available.", "error");
      return;
    }
    const downloadUrl = getApiUrl(`/api/v1/policies/${policyId}/file`);
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");

    // Use fetch with auth header and trigger browser download
    fetch(downloadUrl, {
      headers: authHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Document not found or access denied.");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${policyName || "policy"}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast("Policy document downloaded successfully.");
      })
      .catch((err) => {
        console.error("Download error:", err);
        showToast(err.message || "Failed to download policy document.", "error");
      });
  };

  // Filtered items computation
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Action filter
      if (activeFilter !== "ALL") {
        const itemAct = (item.action_type || "").toUpperCase();
        if (activeFilter === "UPLOADED" && itemAct !== "UPLOADED") return false;
        if (activeFilter === "UPDATED" && itemAct !== "UPDATED") return false;
        if (activeFilter === "DELETED" && itemAct !== "DELETED") return false;
      }

      // Unread only
      if (unreadOnly) {
        const isRead = Boolean(item.is_read ?? item.read);
        if (isRead) return false;
      }

      // Search term
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const titleMatch = (item.policy_name || item.title || "").toLowerCase().includes(q);
        const descMatch = (item.description || item.message || "").toLowerCase().includes(q);
        const catMatch = (item.category || "").toLowerCase().includes(q);
        const deptMatch = (item.department || "").toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !catMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [items, activeFilter, unreadOnly, search]);

  return (
    <div className="pu-page">
      {/* Toast Alert */}
      {toast && (
        <div className={`pu-toast ${toast.type === "error" ? "is-error" : "is-success"}`}>
          {toast.type === "error" ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. Top Summary Metric Cards ── */}
      <div className="pu-summary-grid">
        <div className="pu-summary-card">
          <div className="pu-summary-icon-wrap pu-icon-purple">
            <Bell size={18} />
          </div>
          <div className="pu-summary-meta">
            <span className="pu-summary-label">Total Updates</span>
            <span className="pu-summary-value">{stats.total}</span>
          </div>
        </div>

        <div className={`pu-summary-card ${stats.unread > 0 ? "has-unread" : ""}`}>
          <div className="pu-summary-icon-wrap pu-icon-violet">
            <Clock size={18} />
          </div>
          <div className="pu-summary-meta">
            <span className="pu-summary-label">Unread Updates</span>
            <span className="pu-summary-value">{stats.unread}</span>
          </div>
        </div>

        <div className="pu-summary-card">
          <div className="pu-summary-icon-wrap pu-icon-green">
            <Upload size={18} />
          </div>
          <div className="pu-summary-meta">
            <span className="pu-summary-label">New Uploads</span>
            <span className="pu-summary-value">{stats.uploads}</span>
          </div>
        </div>

        <div className="pu-summary-card">
          <div className="pu-summary-icon-wrap pu-icon-blue">
            <RotateCw size={18} />
          </div>
          <div className="pu-summary-meta">
            <span className="pu-summary-label">Updated</span>
            <span className="pu-summary-value">{stats.updates}</span>
          </div>
        </div>

        <div className="pu-summary-card">
          <div className="pu-summary-icon-wrap pu-icon-rose">
            <Trash2 size={18} />
          </div>
          <div className="pu-summary-meta">
            <span className="pu-summary-label">Retired</span>
            <span className="pu-summary-value">{stats.deleted}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Filter & Actions Control Bar ── */}
      <div className="pu-controls-card">
        <div className="pu-search-bar">
          <Search size={16} className="pu-search-icon" />
          <input
            type="text"
            className="pu-search-input"
            placeholder="Search by policy name, category or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="pu-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="pu-actions-bar">
          <div className="pu-filter-pills" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "ALL" && !unreadOnly}
              className={`pu-filter-pill ${activeFilter === "ALL" && !unreadOnly ? "is-active" : ""}`}
              onClick={() => {
                setActiveFilter("ALL");
                setUnreadOnly(false);
              }}
            >
              All ({stats.total})
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "UPLOADED"}
              className={`pu-filter-pill ${activeFilter === "UPLOADED" ? "is-active" : ""}`}
              onClick={() => {
                setActiveFilter("UPLOADED");
                setUnreadOnly(false);
              }}
            >
              New Uploads ({stats.uploads})
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "UPDATED"}
              className={`pu-filter-pill ${activeFilter === "UPDATED" ? "is-active" : ""}`}
              onClick={() => {
                setActiveFilter("UPDATED");
                setUnreadOnly(false);
              }}
            >
              Updated ({stats.updates})
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "DELETED"}
              className={`pu-filter-pill ${activeFilter === "DELETED" ? "is-active" : ""}`}
              onClick={() => {
                setActiveFilter("DELETED");
                setUnreadOnly(false);
              }}
            >
              Deleted ({stats.deleted})
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={unreadOnly}
              className={`pu-filter-pill pu-pill-unread ${unreadOnly ? "is-active" : ""}`}
              onClick={() => setUnreadOnly((prev) => !prev)}
            >
              Unread ({stats.unread})
            </button>
          </div>

          <div className="pu-right-actions">
            <button
              type="button"
              className="pu-btn-action"
              onClick={handleMarkAllRead}
              title="Mark all notifications as read"
            >
              <CheckCheck size={16} />
              <span>Mark All as Read</span>
            </button>

            <button
              type="button"
              className="pu-btn-icon"
              onClick={() => fetchPolicyUpdates(true)}
              title="Refresh updates feed"
              disabled={refreshing}
            >
              <RotateCw size={16} className={refreshing ? "pu-spin" : ""} />
            </button>

            <button
              type="button"
              className="pu-btn-primary"
              onClick={() => navigate(portalPoliciesRoute)}
            >
              <FileText size={16} />
              <span>Company Policies</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Chronological Notifications Feed ── */}
      <div className="pu-feed-section">
        {loading ? (
          <div className="pu-loading-state">
            <RotateCw size={24} className="pu-spin pu-spinner-purple" />
            <p>Loading policy updates...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="pu-empty-state">
            <div className="pu-empty-icon-wrap">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="pu-empty-title">No policy updates found</h3>
            <p className="pu-empty-subtitle">
              {search || activeFilter !== "ALL" || unreadOnly
                ? "There are no policy notifications matching your current filters."
                : "You're all caught up! No recent policy notifications have been issued."}
            </p>
            {(search || activeFilter !== "ALL" || unreadOnly) && (
              <button
                type="button"
                className="pu-btn-reset-filters"
                onClick={() => {
                  setSearch("");
                  setActiveFilter("ALL");
                  setUnreadOnly(false);
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="pu-cards-list">
            {filteredItems.map((item) => {
              const isUnread = !item.is_read && !item.read;
              const isDeleted =
                item.action_type === "DELETED" ||
                item.is_deleted ||
                item.notification_type === "POLICY_DELETED";
              const isUpload =
                item.action_type === "UPLOADED" ||
                item.notification_type === "POLICY_CREATED";

              let badgeText = "UPDATED";
              let badgeClass = "badge-updated";
              if (isUpload) {
                badgeText = "NEW UPLOAD";
                badgeClass = "badge-upload";
              } else if (isDeleted) {
                badgeText = "DELETED";
                badgeClass = "badge-deleted";
              }

              return (
                <div
                  key={item.id}
                  className={`pu-card ${isUnread ? "is-unread" : ""}`}
                  onClick={() => handleCardClick(item)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="pu-card-top">
                    <div className="pu-card-badge-row">
                      <span className={`pu-action-badge ${badgeClass}`}>
                        {badgeText}
                      </span>
                      {item.version_number && (
                        <span className="pu-version-pill">
                          v{item.version_number}
                        </span>
                      )}
                      {isUnread && (
                        <span className="pu-unread-indicator">
                          <span className="pu-unread-dot" />
                          Unread
                        </span>
                      )}
                    </div>

                    <div className="pu-card-time-wrap">
                      <Clock size={13} className="pu-card-time-icon" />
                      <span className="pu-card-time">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="pu-card-body">
                    <h4 className="pu-policy-title">
                      {item.policy_name || item.title}
                    </h4>
                    <p className="pu-policy-desc">
                      {item.description || item.message}
                    </p>
                  </div>

                  <div className="pu-card-footer">
                    <div className="pu-card-meta-chips">
                      {item.category && (
                        <span className="pu-chip pu-chip-category">
                          <Tag size={12} />
                          {item.category}
                        </span>
                      )}
                      {item.department && item.department !== "All Departments" && (
                        <span className="pu-chip pu-chip-dept">
                          <Building size={12} />
                          {item.department}
                        </span>
                      )}
                      {item.effective_date && (
                        <span className="pu-chip pu-chip-date">
                          <Calendar size={12} />
                          Effective: {item.effective_date}
                        </span>
                      )}
                      {item.actor_name && (
                        <span className="pu-chip pu-chip-actor">
                          <User size={12} />
                          {item.actor_name}
                        </span>
                      )}
                    </div>

                    <div className="pu-card-action-hint">
                      <span>View Details</span>
                      <ChevronRight size={15} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. Detailed Policy Notification Modal ── */}
      {selectedNotif && (
        <div className="pu-modal-overlay" onClick={() => setSelectedNotif(null)}>
          <div
            className="pu-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="pu-modal-header">
              <div className="pu-modal-title-wrap">
                <div
                  className={`pu-modal-icon-badge ${
                    selectedNotif.action_type === "DELETED"
                      ? "is-deleted"
                      : selectedNotif.action_type === "UPLOADED"
                      ? "is-uploaded"
                      : "is-updated"
                  }`}
                >
                  {selectedNotif.action_type === "DELETED" ? (
                    <Trash2 size={20} />
                  ) : selectedNotif.action_type === "UPLOADED" ? (
                    <Upload size={20} />
                  ) : (
                    <FileText size={20} />
                  )}
                </div>
                <div>
                  <h3 className="pu-modal-title">
                    {selectedNotif.policy_name || selectedNotif.title}
                  </h3>
                  <p className="pu-modal-subtitle">
                    Policy Event Notification Details
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="pu-modal-close-btn"
                onClick={() => setSelectedNotif(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pu-modal-body">
              {/* If Policy was Deleted */}
              {selectedNotif.action_type === "DELETED" || selectedNotif.is_deleted ? (
                <div className="pu-notice-box is-deleted-notice">
                  <ShieldAlert size={20} className="pu-notice-icon" />
                  <div>
                    <strong>Policy Retired / Removed</strong>
                    <p>
                      This company policy has been officially retired and removed from active
                      company documentation by administrators. File downloads are no longer available.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pu-notice-box is-active-notice">
                  <CheckCircle2 size={20} className="pu-notice-icon" />
                  <div>
                    <strong>Active Company Policy</strong>
                    <p>
                      This policy is currently published and legally binding for all applicable team members.
                    </p>
                  </div>
                </div>
              )}

              {/* Policy Attributes Grid */}
              <div className="pu-details-grid">
                <div className="pu-detail-item">
                  <span className="pu-detail-label">Action Performed</span>
                  <span
                    className={`pu-action-badge ${
                      selectedNotif.action_type === "DELETED"
                        ? "badge-deleted"
                        : selectedNotif.action_type === "UPLOADED"
                        ? "badge-upload"
                        : "badge-updated"
                    }`}
                  >
                    {selectedNotif.action_type || "UPDATED"}
                  </span>
                </div>

                <div className="pu-detail-item">
                  <span className="pu-detail-label">Version Number</span>
                  <span className="pu-detail-val">
                    v{selectedNotif.version_number || "1.0"}
                  </span>
                </div>

                <div className="pu-detail-item">
                  <span className="pu-detail-label">Category</span>
                  <span className="pu-detail-val">
                    {selectedNotif.category || "General"}
                  </span>
                </div>

                <div className="pu-detail-item">
                  <span className="pu-detail-label">Target Department</span>
                  <span className="pu-detail-val">
                    {selectedNotif.department || "All Departments"}
                  </span>
                </div>

                <div className="pu-detail-item">
                  <span className="pu-detail-label">Effective Date</span>
                  <span className="pu-detail-val">
                    {selectedNotif.effective_date || "Immediate"}
                  </span>
                </div>

                <div className="pu-detail-item">
                  <span className="pu-detail-label">Published / Updated Date</span>
                  <span className="pu-detail-val">
                    {selectedNotif.updated_date || selectedNotif.created_at?.slice(0, 10) || "Recent"}
                  </span>
                </div>

                <div className="pu-detail-item">
                  <span className="pu-detail-label">Announced By</span>
                  <span className="pu-detail-val">
                    {selectedNotif.actor_name || "Admin"}
                  </span>
                </div>

                <div className="pu-detail-item">
                  <span className="pu-detail-label">Read Status</span>
                  <span className="pu-detail-val">Read</span>
                </div>
              </div>

              {/* Description & Change Summary */}
              <div className="pu-detail-desc-box">
                <h5 className="pu-desc-title">Description & Scope</h5>
                <p className="pu-desc-content">
                  {selectedNotif.description || selectedNotif.message || "No specific details provided."}
                </p>
              </div>
            </div>

            <div className="pu-modal-footer">
              <button
                type="button"
                className="pu-btn-cancel"
                onClick={() => setSelectedNotif(null)}
              >
                Close
              </button>

              {/* If not deleted, allow downloading and navigating */}
              {!selectedNotif.is_deleted && selectedNotif.action_type !== "DELETED" && (
                <>
                  <button
                    type="button"
                    className="pu-btn-download"
                    onClick={() =>
                      handleDownloadFile(
                        selectedNotif.policy_id,
                        selectedNotif.policy_name
                      )
                    }
                  >
                    <Download size={15} />
                    <span>Download Policy</span>
                  </button>

                  <button
                    type="button"
                    className="pu-btn-primary"
                    onClick={() => {
                      setSelectedNotif(null);
                      navigate(portalPoliciesRoute);
                    }}
                  >
                    <ExternalLink size={15} />
                    <span>View in Policies</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
