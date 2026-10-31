// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - REGULARIZATIONAPPROVALS.JSX
// Path: Frontend/hrms-frontend/src/manager-portal/pages/approvals/RegularizationApprovals.jsx
// Purpose: Web portal page component managing 'RegularizationApprovals' views, user interactions, and state.
// UI Components:
//   • <SkeletonCard />
//   • <DetailDrawer />
//   • <RegularizationApprovals />
// Key Functions & Handlers:
//   • isPending()
//   • isApproved()
//   • isRejected()
//   • statusLabel()
//   • badgeVariant()
//   • formatDate()
//   • formatTime()
//   • formatDateTime()
//   • ... and 6 more handlers
// ==============================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Check,
  X,
  Clock,
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  RotateCw,
  ChevronRight,
  User,
  Calendar,
} from "lucide-react";
import { ManagerBadge } from "../../components/ManagerBadge";
import { ManagerModal } from "../../components/ManagerModal";
import { managerToast } from "../../components/ManagerToast";
import {
  getRegularizationRequests,
  approveRegularization,
  rejectRegularization,
} from "../../services/managerApiService";
import "./Approvals.css";

/* ─── Status helpers ─────────────────────────────────────────────────────── */

/** Raw DB statuses: PENDING_MANAGER, PENDING_ADMIN, COMPLETED, APPROVED, REJECTED, etc. */
const isPending = (s) => {
  const u = (s || "").toUpperCase();
  return u === "PENDING_MANAGER" || u === "PENDING";
};

const isApproved = (s) => {
  const u = (s || "").toUpperCase();
  return (
    u === "COMPLETED" ||
    u === "APPROVED" ||
    u === "PENDING_ADMIN" ||
    u === "APPROVED_BY_MANAGER"
  );
};

const isRejected = (s) => {
  const u = (s || "").toUpperCase();
  return (
    u === "REJECTED" ||
    u === "REJECTED_BY_MANAGER" ||
    u === "REJECTED_BY_ADMIN"
  );
};

const statusLabel = (s) => {
  const u = (s || "").toUpperCase();
  if (u === "PENDING_MANAGER" || u === "PENDING") return "Pending Review";
  if (
    u === "COMPLETED" ||
    u === "APPROVED" ||
    u === "PENDING_ADMIN" ||
    u === "APPROVED_BY_MANAGER"
  )
    return "Approved";
  if (u === "REJECTED" || u === "REJECTED_BY_MANAGER") return "Rejected";
  if (u === "REJECTED_BY_ADMIN") return "Rejected by Admin";
  return s || "Unknown";
};

const badgeVariant = (s) => {
  if (isPending(s)) return "warning";
  if (isApproved(s)) return "success";
  if (isRejected(s)) return "danger";
  return "info";
};

/** Format ISO / raw date → "05 Oct 2026" */
const formatDate = (val) => {
  if (!val || val === "-" || val === "—") return "—";
  try {
    const s = String(val).trim();
    if (/^\d{1,2}\s+[a-zA-Z]{3}\s+\d{4}$/.test(s)) return s;
    const dt = new Date(s.includes("T") ? s : `${s}T00:00:00`);
    if (isNaN(dt.getTime())) return s;
    const day = String(dt.getDate()).padStart(2, "0");
    const month = dt.toLocaleString("en-US", { month: "short" });
    const year = dt.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(val);
  }
};

/** Format time string → "09:30 AM" */
const formatTime = (val) => {
  if (!val || val === "-" || val === "—" || val === "None") return "—";
  try {
    const s = String(val).trim();
    if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(s)) return s;
    const dt = new Date(s.replace(" ", "T"));
    if (isNaN(dt.getTime())) return s;
    return dt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(val);
  }
};

/** Format datetime → "05 Oct 2026, 09:42 AM" */
const formatDateTime = (val) => {
  if (!val || val === "-" || val === "—") return "—";
  try {
    const s = String(val).trim();
    if (s.includes(",") && /[a-zA-Z]/.test(s)) return s;
    const dt = new Date(s.replace(" ", "T"));
    if (isNaN(dt.getTime())) return s;
    return dt.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(val);
  }
};

/** Generate dynamic initials: Parth Patil -> PP */
const getInitials = (name) => {
  if (!name || name === "Employee") return "EM";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

/** Dynamic reason banner categorization */
const getReasonMeta = (req) => {
  const reasonText = (
    req.issue ||
    req.reason ||
    req.comment ||
    req.rejection_reason ||
    ""
  ).trim();
  const lower = reasonText.toLowerCase();

  if (
    lower.includes("missing check-out") ||
    lower.includes("missing checkout") ||
    lower.includes("punch out") ||
    lower.includes("forget to punch out") ||
    lower.includes("forgot to punch out")
  ) {
    return {
      label: reasonText || "Missing check-out",
      variant: "danger",
      iconType: "alert",
    };
  }

  if (
    lower.includes("late check-in") ||
    lower.includes("late checkin") ||
    lower.includes("late") ||
    lower.includes("delay") ||
    lower.includes("traffic")
  ) {
    return {
      label: reasonText || "Late check-in",
      variant: "warning",
      iconType: "clock",
    };
  }

  if (
    lower.includes("overtime correction") ||
    lower.includes("overtime") ||
    lower.includes("ot correction") ||
    lower.includes("extra hours")
  ) {
    return {
      label: reasonText || "Overtime correction",
      variant: "danger",
      iconType: "alert",
    };
  }

  if (
    lower.includes("missing check-in") ||
    lower.includes("missing checkin") ||
    lower.includes("punch in") ||
    lower.includes("forget to punch in") ||
    lower.includes("forgot to punch in")
  ) {
    return {
      label: reasonText || "Missing check-in",
      variant: "info",
      iconType: "info",
    };
  }

  // Fallback checks from punch data
  const hasIn = req.checkIn && req.checkIn !== "—";
  const hasOut = req.checkOut && req.checkOut !== "—";
  const origInMissing = !req.original_check_in || req.original_check_in === "—";
  const origOutMissing = !req.original_check_out || req.original_check_out === "—";

  if (origOutMissing && hasOut && (!origInMissing || !hasIn)) {
    return {
      label: reasonText || "Missing check-out",
      variant: "danger",
      iconType: "alert",
    };
  }
  if (origInMissing && hasIn && (!origOutMissing || !hasOut)) {
    return {
      label: reasonText || "Missing check-in",
      variant: "info",
      iconType: "info",
    };
  }

  return {
    label: reasonText || "Attendance correction",
    variant: "warning",
    iconType: "clock",
  };
};

/* ─── Skeleton Card Component (Stable height) ────────────────────────────── */
const SkeletonCard = () => (
  <div className="mp-reg-skeleton-card">
    <div className="mp-reg-skeleton-head">
      <div className="mp-reg-skeleton-avatar" />
      <div className="mp-reg-skeleton-user">
        <div className="mp-reg-skeleton-bar" style={{ width: "42%", height: 14 }} />
        <div className="mp-reg-skeleton-bar" style={{ width: "28%", height: 11 }} />
      </div>
      <div className="mp-reg-skeleton-bar" style={{ width: "22%", height: 13 }} />
    </div>
    <div className="mp-reg-skeleton-bar" style={{ width: "100%", height: 34, borderRadius: 8, margin: "6px 0" }} />
    <div className="mp-reg-skeleton-bar" style={{ width: "100%", height: 52, borderRadius: 10, marginBottom: 8 }} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div className="mp-reg-skeleton-bar" style={{ height: 42, borderRadius: 10 }} />
      <div className="mp-reg-skeleton-bar" style={{ height: 42, borderRadius: 10 }} />
    </div>
  </div>
);

/* ─── Detail Drawer ──────────────────────────────────────────────────────── */
const DetailDrawer = ({ req, onClose, onApprove, onReject, actionLoading }) => {
  if (!req) return null;
  const name = req.employee_name || req.employeeName || req.name || req.emp_code || "Employee";
  const empCode = req.emp_code || req.employeeId || "—";
  const dept = req.department || "Operations";
  const desig = req.designation || "Employee";
  const attDate = formatDate(req.attendanceDate || req.target_date || req.date);
  const submittedOn = formatDateTime(
    req.submittedOn ||
      req.submitted_on ||
      req.created_at ||
      req.request_date ||
      req.requestDate ||
      req.appliedDate
  );
  const reqIn = formatTime(req.checkIn || req.inTime || req.issued_for_in_time);
  const reqOut = formatTime(req.checkOut || req.outTime || req.issued_for_out_time);
  const reason = req.comment || req.reason || req.issue || "—";
  const reqId = req.id || req.rawId;
  const pending = isPending(req.status);
  const rejected = isRejected(req.status);
  const reasonMeta = getReasonMeta(req);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "440px",
        maxWidth: "100vw",
        background: "var(--mp-surface, #FFFFFF)",
        boxShadow: "-8px 0 36px rgba(0,0,0,0.16)",
        zIndex: 1100,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid var(--mp-border, #E5E7EB)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--mp-surface-subtle, #F9FAFB)",
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--mp-text-primary, #111827)" }}>
            Regularization Request
          </div>
          <div style={{ fontSize: 12.5, color: "var(--mp-text-muted, #6B7280)", marginTop: 2 }}>
            #{reqId} · {attDate}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--mp-text-muted, #6B7280)",
            padding: 6,
            display: "flex",
            borderRadius: 6,
          }}
          title="Close drawer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          padding: "20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Employee */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#EDE9FE",
              color: "#7C3AED",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {getInitials(name)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, color: "var(--mp-text-primary, #111827)", fontSize: 15.5 }}>
              {name}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--mp-text-muted, #6B7280)", marginTop: 2 }}>
              {empCode} · {desig}
            </div>
            <div style={{ fontSize: 12, color: "var(--mp-text-muted, #6B7280)" }}>
              {dept}
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--mp-surface-subtle, #F9FAFB)", borderRadius: 10, border: "1px solid var(--mp-border, #E5E7EB)" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--mp-text-muted, #6B7280)" }}>
            Current Status
          </span>
          <ManagerBadge variant={badgeVariant(req.status)} dot>
            {statusLabel(req.status)}
          </ManagerBadge>
        </div>

        {/* Reason Banner */}
        <div className={`mp-reg-reason-banner ${reasonMeta.variant}`}>
          <span className="mp-reg-banner-icon">
            {reasonMeta.iconType === "alert" ? (
              <AlertCircle size={15} />
            ) : reasonMeta.iconType === "info" ? (
              <Info size={15} />
            ) : (
              <Clock size={15} />
            )}
          </span>
          <span className="mp-reg-banner-text">{reasonMeta.label}</span>
        </div>

        {/* Requested Timings */}
        <div style={{ background: "#F9FAFB", padding: "14px", borderRadius: 12, border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--mp-text-muted, #6B7280)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Requested Attendance Correction
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11.5, color: "#6B7280", fontWeight: 500 }}>Check-in</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#059669", marginTop: 2 }}>{reqIn}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "#6B7280", fontWeight: 500 }}>Check-out</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#059669", marginTop: 2 }}>{reqOut}</div>
            </div>
          </div>
        </div>

        {/* Original attendance record if present */}
        {(req.original_check_in || req.original_check_out) && (
          <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: 10, border: "1px dashed #E5E7EB" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>
              Original Biometric Record
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#4B5563" }}>
              <span>In: <strong>{req.original_check_in || "—"}</strong></span>
              <span>Out: <strong>{req.original_check_out || "—"}</strong></span>
            </div>
          </div>
        )}

        {/* Detailed Reason */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--mp-text-muted, #6B7280)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Employee Remarks / Justification
          </div>
          <div style={{ fontSize: 13.5, color: "var(--mp-text-primary, #111827)", background: "var(--mp-surface-subtle, #F9FAFB)", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--mp-border, #E5E7EB)", lineHeight: 1.5 }}>
            {reason}
          </div>
        </div>

        {/* Submitted on */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--mp-text-muted, #6B7280)", textTransform: "uppercase" }}>
            Submitted On
          </div>
          <div style={{ fontSize: 13.5, color: "var(--mp-text-primary, #111827)", marginTop: 2, fontWeight: 500 }}>
            {submittedOn}
          </div>
        </div>

        {/* Manager comment if rejected */}
        {rejected && req.manager_comment && req.manager_comment !== "-" && (
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Rejection Reason
            </div>
            <div style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", padding: "10px 14px", borderRadius: 8, border: "1px solid #FECACA" }}>
              {req.manager_comment}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {pending && (
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--mp-border, #E5E7EB)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            background: "var(--mp-surface, #FFFFFF)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onReject(req);
              onClose();
            }}
            disabled={actionLoading}
            className="mp-reg-btn-reject"
          >
            <X size={15} /> Reject
          </button>
          <button
            type="button"
            onClick={() => {
              onApprove(req.id);
              onClose();
            }}
            disabled={actionLoading}
            className="mp-reg-btn-approve"
          >
            <Check size={15} /> Approve
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Main RegularizationApprovals Component ────────────────────────────── */

export const RegularizationApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectModal, setRejectModal] = useState(null);
  const [drawerReq, setDrawerReq] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [approveConfirm, setApproveConfirm] = useState(null);
  const [search, setSearch] = useState("");

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  /**
   * Safe, non-flickering fetch requests
   * isSilent: When true, never triggers full-page loading skeleton
   */
  const fetchRequests = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!isSilent) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getRegularizationRequests();
      if (isMountedRef.current) {
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch regularizations:", err);
      if (isMountedRef.current) {
        setError("Unable to load regularization requests.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      isFetchingRef.current = false;
    }
  }, []);

  // Initial mount: load once cleanly
  useEffect(() => {
    isMountedRef.current = true;
    fetchRequests(false);

    // Silent listener for external updates (e.g. employee applied or manager approved)
    const onSync = () => {
      fetchRequests(true);
    };

    window.addEventListener("regularization-updated", onSync);
    window.addEventListener("attendance-updated", onSync);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener("regularization-updated", onSync);
      window.removeEventListener("attendance-updated", onSync);
    };
  }, [fetchRequests]);

  // User click on Refresh
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchRequests(true);
  };

  // Approve action
  const handleApprove = async (id) => {
    setApproveConfirm(null);
    setActionLoading(true);

    // Optimistic UI update
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "APPROVED",
              overall_status: "APPROVED",
              manager_status: "APPROVED",
              admin_status: "APPROVED",
              manager_action: "Approved",
              statusDisplay: "Approved",
            }
          : r
      )
    );

    try {
      await approveRegularization(id);
      await fetchRequests(true);
      window.dispatchEvent(new Event("regularization-updated"));
      managerToast.success("Request approved and forwarded to Admin.", {
        title: "Approved",
      });
    } catch (err) {
      await fetchRequests(true);
      managerToast.error("Failed to approve: " + err.message, {
        title: "Error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Reject action
  const handleReject = async () => {
    if (!rejectModal) return;
    const targetId = rejectModal.id;
    const reasonText = remarks.trim() || "Rejected by Manager";
    setActionLoading(true);

    // Optimistic UI update
    setRequests((prev) =>
      prev.map((r) =>
        r.id === targetId
          ? {
              ...r,
              status: "REJECTED",
              overall_status: "REJECTED",
              manager_status: "REJECTED",
              manager_action: "Rejected",
              manager_comment: reasonText,
              statusDisplay: "Rejected",
            }
          : r
      )
    );

    try {
      await rejectRegularization(targetId, reasonText);
      await fetchRequests(true);
      window.dispatchEvent(new Event("regularization-updated"));
      managerToast.info("Request rejected successfully.", {
        title: "Rejected",
      });
      setRejectModal(null);
      setRemarks("");
    } catch (err) {
      await fetchRequests(true);
      managerToast.error("Failed to reject: " + err.message, {
        title: "Error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  /* Pending = PENDING_MANAGER or PENDING; History = anything else */
  const pendingReqs = requests.filter((r) => isPending(r.status));
  const historyReqs = requests.filter((r) => !isPending(r.status));

  const displayedReqs = (
    activeTab === "pending" ? pendingReqs : historyReqs
  ).filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (
      r.employee_name ||
      r.employeeName ||
      r.name ||
      ""
    ).toLowerCase();
    const code = (r.emp_code || r.employeeId || "").toLowerCase();
    const desig = (r.designation || "").toLowerCase();
    const dept = (r.department || "").toLowerCase();
    const issue = (r.issue || r.reason || r.comment || "").toLowerCase();
    const rid = String(r.id || "");
    return (
      name.includes(q) ||
      code.includes(q) ||
      desig.includes(q) ||
      dept.includes(q) ||
      issue.includes(q) ||
      rid.includes(q)
    );
  });

  return (
    <div className="mp-reg-page">
      {/* ── Page Header ── */}
      <div className="mp-reg-header">
        <div className="mp-reg-header-text">
          <h2 className="mp-reg-title">Attendance Regularization Requests</h2>
          <p className="mp-reg-subtitle">
            Review punch discrepancies, missing check-in/out stamps, and overtime corrections.
          </p>
        </div>

        {/* Desktop Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="mp-reg-refresh-btn mp-reg-desktop-refresh"
          title="Refresh regularization requests"
        >
          <RotateCw size={14} className={refreshing ? "mp-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Mobile Refresh Button */}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="mp-reg-refresh-btn mp-reg-mobile-refresh"
        title="Refresh regularization requests"
      >
        <RotateCw size={15} className={refreshing ? "mp-spin" : ""} />
        <span>Refresh</span>
      </button>

      {/* ── Controls Bar: Segmented Tabs + Search ── */}
      <div className="mp-reg-controls-bar">
        {/* Segmented Two-Column Tabs */}
        <div className="mp-reg-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`mp-reg-tab-btn ${activeTab === "pending" ? "is-active" : ""}`}
          >
            <span>Pending Review</span>
            <span className="mp-reg-tab-count">{pendingReqs.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`mp-reg-tab-btn ${activeTab === "history" ? "is-active" : ""}`}
          >
            <span>Approval History</span>
            <span className="mp-reg-tab-count">{historyReqs.length}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="mp-reg-search-wrap">
          <Search size={15} className="mp-reg-search-icon" />
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mp-reg-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mp-reg-search-clear"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Error State ── */}
      {error && !loading && (
        <div
          style={{
            padding: "36px 20px",
            textAlign: "center",
            background: "var(--mp-surface, #FFFFFF)",
            border: "1px solid var(--mp-border, #E5E7EB)",
            borderRadius: 16,
          }}
        >
          <AlertCircle size={32} color="#EF4444" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--mp-text-primary, #111827)", marginBottom: 6 }}>
            {error}
          </div>
          <button
            type="button"
            onClick={() => fetchRequests(false)}
            style={{
              marginTop: 10,
              padding: "9px 22px",
              borderRadius: 8,
              border: "none",
              background: "#7C3AED",
              color: "#FFF",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading Skeleton (Stable height, zero layout shift) ── */}
      {loading && (
        <div className="mp-reg-cards-list">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Requests List / Empty State ── */}
      {!loading && !error && (
        <div className="mp-reg-cards-list">
          {displayedReqs.length === 0 ? (
            /* Clean, compact empty state */
            <div className="mp-reg-empty-state">
              <div className="mp-reg-empty-icon-wrap">
                <Clock size={28} />
              </div>
              <h3 className="mp-reg-empty-title">
                {activeTab === "pending"
                  ? "No pending regularization requests"
                  : "No approval history yet"}
              </h3>
              <p className="mp-reg-empty-desc">
                {activeTab === "pending"
                  ? "Requests submitted by your team will appear here."
                  : "Approved and rejected requests will appear here."}
              </p>
            </div>
          ) : (
            displayedReqs.map((req) => {
              const name =
                req.employee_name ||
                req.employeeName ||
                req.name ||
                req.emp_code ||
                "Employee";
              const desig = req.designation || req.department || "DevOps Engineer";
              const attDate = formatDate(
                req.attendanceDate || req.target_date || req.date
              );
              const reqIn = formatTime(
                req.checkIn || req.inTime || req.issued_for_in_time
              );
              const reqOut = formatTime(
                req.checkOut || req.outTime || req.issued_for_out_time
              );
              const pending = isPending(req.status);
              const approved = isApproved(req.status);
              const rejected = isRejected(req.status);
              const reasonMeta = getReasonMeta(req);

              return (
                <div
                  key={req.id}
                  className="mp-reg-card"
                  onClick={() => setDrawerReq(req)}
                >
                  {/* Card Header */}
                  <div className="mp-reg-card-head">
                    <div className="mp-reg-avatar">{getInitials(name)}</div>
                    <div className="mp-reg-user-info">
                      <div className="mp-reg-user-name">{name}</div>
                      <div className="mp-reg-user-role">{desig}</div>
                    </div>
                    <div className="mp-reg-head-right">
                      <span className="mp-reg-date-badge">{attDate}</span>
                      <ChevronRight size={17} className="mp-reg-chevron" />
                    </div>
                  </div>

                  {/* Reason Banner */}
                  <div className={`mp-reg-reason-banner ${reasonMeta.variant}`}>
                    <span className="mp-reg-banner-icon">
                      {reasonMeta.iconType === "alert" ? (
                        <AlertCircle size={15} />
                      ) : reasonMeta.iconType === "info" ? (
                        <Info size={15} />
                      ) : (
                        <Clock size={15} />
                      )}
                    </span>
                    <span className="mp-reg-banner-text">{reasonMeta.label}</span>
                  </div>

                  {/* Timings Row */}
                  <div className="mp-reg-timing-row">
                    <div className="mp-reg-timing-col">
                      <div className="mp-reg-timing-label">
                        <Clock size={14} className="mp-timing-icon check-in" />
                        <span>Check-in</span>
                      </div>
                      <div className="mp-reg-timing-val">{reqIn}</div>
                    </div>
                    <div className="mp-reg-timing-divider" />
                    <div className="mp-reg-timing-col">
                      <div className="mp-reg-timing-label">
                        <Clock size={14} className="mp-timing-icon check-out" />
                        <span>Check-out</span>
                      </div>
                      <div className="mp-reg-timing-val">{reqOut}</div>
                    </div>
                  </div>

                  {/* Actions Row (Approve / Reject for Pending; Status Pill for History) */}
                  {pending ? (
                    <div
                      className="mp-reg-actions-row"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="mp-reg-btn-approve"
                        onClick={() => setApproveConfirm(req)}
                        disabled={actionLoading}
                      >
                        <Check size={16} /> Approve
                      </button>
                      <button
                        type="button"
                        className="mp-reg-btn-reject"
                        onClick={() => setRejectModal(req)}
                        disabled={actionLoading}
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className="mp-reg-history-status-row">
                      <span style={{ fontSize: 12, color: "#6B7280" }}>
                        ID: #{req.id}
                      </span>
                      <span
                        className={`mp-reg-status-badge ${
                          approved
                            ? "approved"
                            : rejected
                            ? "rejected"
                            : "pending"
                        }`}
                      >
                        {approved ? (
                          <Check size={13} />
                        ) : rejected ? (
                          <X size={13} />
                        ) : (
                          <Clock size={13} />
                        )}
                        {statusLabel(req.status)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Detail Drawer ── */}
      {drawerReq && (
        <>
          <div
            onClick={() => setDrawerReq(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.38)",
              zIndex: 1090,
            }}
          />
          <DetailDrawer
            req={drawerReq}
            onClose={() => setDrawerReq(null)}
            onApprove={(id) => {
              setDrawerReq(null);
              setApproveConfirm(drawerReq);
            }}
            onReject={(r) => {
              setDrawerReq(null);
              setRejectModal(r);
            }}
            actionLoading={actionLoading}
          />
        </>
      )}

      {/* ── Approve Confirmation Modal ── */}
      <ManagerModal
        isOpen={Boolean(approveConfirm)}
        onClose={() => setApproveConfirm(null)}
        title="Approve Regularization?"
        subtitle={`Approving attendance correction for ${
          approveConfirm?.employee_name ||
          approveConfirm?.name ||
          approveConfirm?.emp_code ||
          "this employee"
        } on ${formatDate(
          approveConfirm?.attendanceDate ||
            approveConfirm?.target_date ||
            approveConfirm?.date
        )}.`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setApproveConfirm(null)}
              style={{
                padding: "9px 18px",
                borderRadius: "9px",
                border: "1px solid var(--mp-border, #E5E7EB)",
                background: "transparent",
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--mp-text-primary, #111827)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApprove(approveConfirm.id)}
              disabled={actionLoading}
              style={{
                padding: "9px 20px",
                borderRadius: "9px",
                border: "none",
                background: "#059669",
                color: "#FFF",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13.5,
                opacity: actionLoading ? 0.7 : 1,
              }}
            >
              {actionLoading ? "Approving…" : "Approve Request"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 13.5, color: "var(--mp-text-muted, #4B5563)", margin: 0, lineHeight: 1.5 }}>
          This will approve the attendance correction and move the request to{" "}
          <strong>Pending Admin Review</strong>. Final attendance hours will update once admin review completes.
        </p>
      </ManagerModal>

      {/* ── Reject Modal ── */}
      <ManagerModal
        isOpen={Boolean(rejectModal)}
        onClose={() => {
          setRejectModal(null);
          setRemarks("");
        }}
        title="Reject Regularization Request"
        subtitle={`Provide a reason for rejecting ${
          rejectModal?.employee_name || rejectModal?.name || rejectModal?.emp_code
        }'s request for ${formatDate(
          rejectModal?.attendanceDate ||
            rejectModal?.target_date ||
            rejectModal?.date
        )}.`}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setRejectModal(null);
                setRemarks("");
              }}
              style={{
                padding: "9px 18px",
                borderRadius: "9px",
                border: "1px solid var(--mp-border, #E5E7EB)",
                background: "transparent",
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={actionLoading || !remarks.trim()}
              style={{
                padding: "9px 20px",
                borderRadius: "9px",
                border: "none",
                background: "#DC2626",
                color: "#FFF",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13.5,
                opacity: actionLoading || !remarks.trim() ? 0.6 : 1,
              }}
            >
              {actionLoading ? "Submitting…" : "Reject Request"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--mp-text-primary, #111827)" }}>
            Reason for Rejection *
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g., Punch logs do not align with swipe terminal at security..."
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1px solid ${
                remarks.trim() ? "var(--mp-border, #E5E7EB)" : "#EF4444"
              }`,
              background: "var(--mp-surface, #FFFFFF)",
              color: "var(--mp-text-primary, #111827)",
              fontSize: "13.5px",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          {!remarks.trim() && (
            <span style={{ fontSize: 12, color: "#EF4444" }}>
              Rejection reason is required.
            </span>
          )}
        </div>
      </ManagerModal>
    </div>
  );
};
