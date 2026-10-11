import React, { useState, useEffect, useCallback, useRef } from "react";
import { Check, X, Clock, Search, AlertCircle, RotateCw } from "lucide-react";
import { ManagerBadge } from "../../components/ManagerBadge";
import { ManagerModal } from "../../components/ManagerModal";
import { managerToast } from "../../components/ManagerToast";
import { useManagerAuth } from "../../auth/ManagerAuthContext";
import {
  getTeamLeaves,
  approveLeave,
  rejectLeave,
} from "../../services/managerApiService";
import { apiClient } from "../../../services/apiClient";
import "./Approvals.css";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const normalise = (s) => (s || "").toLowerCase();

const getStatusDisplay = (req) => {
  const raw = String(req.overall_status || req.status || "").toUpperCase();
  const mgr = String(req.manager_status || "").toUpperCase();
  if (raw === "APPROVED" || mgr === "APPROVED" || raw === "PENDING_ADMIN")
    return "Approved";
  if (raw === "REJECTED" || mgr === "REJECTED") return "Rejected";
  if (raw === "PENDING_MANAGER" || raw === "PENDING")
    return "Pending Manager Approval";
  return req.statusDisplay || req.status || "Pending";
};

const isPendingMgr = (l) => {
  const raw = String(l.overall_status || l.status || "").toUpperCase();
  const mgr = String(l.manager_status || "").toUpperCase();
  if (raw === "APPROVED" || raw === "PENDING_ADMIN" || mgr === "APPROVED")
    return false;
  if (raw === "REJECTED" || mgr === "REJECTED") return false;
  return raw === "PENDING_MANAGER" || raw === "PENDING";
};

/** Format date → "1 Oct 2026" */
const fmtDate = (d) => {
  if (!d || d === "-" || d === "—") return "—";
  try {
    const s = String(d).trim();
    if (/^\d{1,2}\s+[a-zA-Z]{3}\s+\d{4}$/.test(s)) return s;
    const parsed = new Date(
      s.includes("-") && s.length <= 10 ? s + "T00:00:00" : s
    );
    if (isNaN(parsed.getTime())) return s;
    const day = parsed.getDate();
    const month = parsed.toLocaleString("en-US", { month: "short" });
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(d);
  }
};

/** Generate dynamic initials: Kirshna -> K, Payal Mundhe -> PM */
const getInitials = (name) => {
  if (!name || name === "Employee") return "EM";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

/* ─── Skeleton Card Component (Stable height, zero layout shift) ─────────── */
const SkeletonLeaveCard = () => (
  <div className="mp-leave-skeleton-card">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#E5E7EB", animation: "mp-pulse 1.4s ease-in-out infinite" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ width: 120, height: 14, background: "#E5E7EB", borderRadius: 6, animation: "mp-pulse 1.4s ease-in-out infinite" }} />
          <div style={{ width: 70, height: 11, background: "#E5E7EB", borderRadius: 4, animation: "mp-pulse 1.4s ease-in-out infinite" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ width: 80, height: 24, background: "#E5E7EB", borderRadius: 9999, animation: "mp-pulse 1.4s ease-in-out infinite" }} />
        <div style={{ width: 130, height: 24, background: "#E5E7EB", borderRadius: 9999, animation: "mp-pulse 1.4s ease-in-out infinite" }} />
      </div>
    </div>
    <div style={{ width: "100%", height: 58, background: "#E5E7EB", borderRadius: 10, animation: "mp-pulse 1.4s ease-in-out infinite" }} />
    <div style={{ width: "100%", height: 44, background: "#E5E7EB", borderRadius: 10, animation: "mp-pulse 1.4s ease-in-out infinite" }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
      <div style={{ width: 70, height: 14, background: "#E5E7EB", borderRadius: 4, animation: "mp-pulse 1.4s ease-in-out infinite" }} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 90, height: 40, background: "#E5E7EB", borderRadius: 8, animation: "mp-pulse 1.4s ease-in-out infinite" }} />
        <div style={{ width: 95, height: 40, background: "#E5E7EB", borderRadius: 8, animation: "mp-pulse 1.4s ease-in-out infinite" }} />
      </div>
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */

export const LeaveApprovals = () => {
  const { manager } = useManagerAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectModal, setRejectModal] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const leavesRef = useRef([]);
  leavesRef.current = leaves;
  const managerRef = useRef(manager);
  managerRef.current = manager;

  /**
   * Safe, non-flickering fetch requests
   * isSilent: When true, never triggers full-page loading skeleton
   */
  const fetchLeaves = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const empCode =
      managerRef.current?.id ||
      managerRef.current?.emp_code ||
      localStorage.getItem("emp_code") ||
      "MGR001";

    // Only show full loading skeleton if silent is false AND no leaves loaded yet
    if (!isSilent && leavesRef.current.length === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getTeamLeaves(empCode).catch(() => []);
      if (isMountedRef.current) {
        setLeaves(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch team leaves:", err);
      if (isMountedRef.current) {
        setError("Could not load leave requests.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      isFetchingRef.current = false;
    }
  }, []);

  // Initial mount: load once cleanly with debounced sync
  useEffect(() => {
    isMountedRef.current = true;
    fetchLeaves(false);

    let syncTimer = null;
    const onSync = () => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        if (isMountedRef.current) {
          fetchLeaves(true);
        }
      }, 150);
    };

    window.addEventListener("leave-applied", onSync);
    window.addEventListener("leave-balance-updated", onSync);
    window.addEventListener("attendance-updated", onSync);

    return () => {
      isMountedRef.current = false;
      if (syncTimer) clearTimeout(syncTimer);
      window.removeEventListener("leave-applied", onSync);
      window.removeEventListener("leave-balance-updated", onSync);
      window.removeEventListener("attendance-updated", onSync);
    };
  }, [fetchLeaves]);

  // User click on Refresh
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchLeaves(true);
  };

  // Approve action
  const handleApprove = async (id) => {
    setActionLoading(true);

    // Optimistic UI update so status changes immediately
    setLeaves((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              manager_status: "APPROVED",
              overall_status: "APPROVED",
              admin_status: "APPROVED",
              status: "Approved",
            }
          : item
      )
    );

    try {
      await approveLeave(id);
      await fetchLeaves(true);
      window.dispatchEvent(new Event("leave-applied"));
      window.dispatchEvent(new Event("leave-balance-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem(
          "hrms_last_event",
          JSON.stringify({
            type: "leave-updated",
            id,
            timestamp: Date.now(),
          })
        );
      } catch (e) {}
      managerToast.success(
        "Leave approved successfully and attendance updated.",
        {
          title: "Leave Approved",
        }
      );
    } catch (err) {
      await fetchLeaves(true);
      managerToast.error("Failed to approve: " + err.message, {
        title: "Error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Reject action
  const handleReject = async () => {
    if (!remarks.trim()) {
      managerToast.error("Please enter mandatory rejection remarks.", {
        title: "Validation Error",
      });
      return;
    }
    const targetId = rejectModal.id;
    const remarksVal = remarks.trim();
    setActionLoading(true);

    // Optimistic UI update so status changes immediately
    setLeaves((prev) =>
      prev.map((item) =>
        item.id === targetId
          ? {
              ...item,
              manager_status: "REJECTED",
              overall_status: "REJECTED",
              admin_status: "REJECTED",
              status: "Rejected",
              rejection_reason: remarksVal,
            }
          : item
      )
    );

    try {
      await rejectLeave(targetId, remarksVal);
      await fetchLeaves(true);
      window.dispatchEvent(new Event("leave-applied"));
      window.dispatchEvent(new Event("leave-balance-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem(
          "hrms_last_event",
          JSON.stringify({
            type: "leave-updated",
            id: targetId,
            timestamp: Date.now(),
          })
        );
      } catch (e) {}
      managerToast.info("Leave request rejected.", { title: "Leave Rejected" });
      setRejectModal(null);
      setRemarks("");
    } catch (err) {
      await fetchLeaves(true);
      managerToast.error("Failed to reject: " + err.message, {
        title: "Error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingLeaves = leaves.filter(isPendingMgr);
  const historyLeaves = leaves.filter((l) => !isPendingMgr(l));

  const filteredLeaves = (
    activeTab === "pending" ? pendingLeaves : historyLeaves
  ).filter((req) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (
      req.employee_name ||
      req.name ||
      req.employee ||
      ""
    ).toLowerCase();
    const code = (req.emp_code || req.code || "").toLowerCase();
    const type = (req.leave_type || req.category || "").toLowerCase();
    const reason = (req.reason || "").toLowerCase();
    const lid = String(req.id || "");
    return (
      name.includes(q) ||
      code.includes(q) ||
      type.includes(q) ||
      reason.includes(q) ||
      lid.includes(q)
    );
  });

  return (
    <div className="mp-leave-page">
      {/* ── Page Header ── */}
      <div className="mp-leave-header">
        <div className="mp-leave-header-text">
          <div className="mp-leave-title-row">
            <h2 className="mp-leave-title">Team Leave Applications</h2>
            {/* Unified Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="mp-leave-refresh-btn"
              title="Refresh leave requests"
            >
              <RotateCw size={14} className={refreshing ? "mp-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
          <p className="mp-leave-subtitle">
            Review employee leave balances, absence reasons, and approve or reject team requests.
          </p>
        </div>
      </div>

      {/* ── Controls Bar: Segmented Tabs + Search ── */}
      <div className="mp-leave-controls-bar">
        {/* Segmented Two-Column Tabs */}
        <div className="mp-leave-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pending"}
            onClick={() => setActiveTab("pending")}
            className={`mp-leave-tab-btn ${
              activeTab === "pending" ? "is-active" : ""
            }`}
          >
            <span>Pending Approvals</span>
            <span className="mp-leave-tab-count">{pendingLeaves.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            className={`mp-leave-tab-btn ${
              activeTab === "history" ? "is-active" : ""
            }`}
          >
            <span>Leave History</span>
            <span className="mp-leave-tab-count">{historyLeaves.length}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="mp-leave-search-wrap">
          <Search size={15} className="mp-reg-search-icon" />
          <input
            type="text"
            placeholder="Search employee, ID, reason..."
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
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--mp-text-primary, #111827)",
              marginBottom: 6,
            }}
          >
            {error}
          </div>
          <button
            type="button"
            onClick={() => fetchLeaves(false)}
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
        <div className="mp-leave-cards-list">
          {[1, 2].map((i) => (
            <SkeletonLeaveCard key={i} />
          ))}
        </div>
      )}

      {/* ── Leave Requests List / Empty State ── */}
      {!loading && !error && (
        <div className="mp-leave-cards-list">
          {filteredLeaves.length === 0 ? (
            /* Clean, compact empty state */
            <div className="mp-leave-empty-state">
              <div className="mp-leave-empty-icon-wrap">
                <Clock size={28} />
              </div>
              <h3 className="mp-leave-empty-title">
                {activeTab === "pending"
                  ? "No pending leave requests"
                  : "No leave history yet"}
              </h3>
              <p className="mp-leave-empty-desc">
                {activeTab === "pending"
                  ? "New leave requests submitted by your team will appear here."
                  : "Approved and rejected leave requests will appear here."}
              </p>
            </div>
          ) : (
            filteredLeaves.map((req) => {
              const employeeName =
                req.employee_name || req.name || req.emp_code || "Employee";
              const initials = getInitials(employeeName);
              const statusLower = normalise(req.overall_status || req.status);
              const leaveType = req.leave_type || req.category || "Leave";
              const isPending = isPendingMgr(req);
              const isApproved =
                ["approved", "completed", "pending_admin"].includes(
                  statusLower
                ) || req.manager_status === "APPROVED";
              const isRejected =
                statusLower === "rejected" ||
                req.manager_status === "REJECTED";

              return (
                <div key={req.id} className="mp-leave-card">
                  {/* Top: Employee info & Badges */}
                  <div className="mp-leave-card-top">
                    <div className="mp-leave-user-block">
                      <div className="mp-leave-avatar">{initials}</div>
                      <div className="mp-leave-user-info">
                        <div className="mp-leave-user-name">{employeeName}</div>
                        <div className="mp-leave-user-code">{req.emp_code}</div>
                      </div>
                    </div>

                    <div className="mp-leave-badges-wrap">
                      <span className="mp-leave-type-pill">{leaveType}</span>
                      <span
                        className={`mp-leave-status-pill ${
                          isApproved
                            ? "approved"
                            : isRejected
                            ? "rejected"
                            : "pending"
                        }`}
                      >
                        <span className="mp-leave-status-dot" />
                        {getStatusDisplay(req)}
                      </span>
                    </div>
                  </div>

                  {/* Dates Box */}
                  <div className="mp-leave-dates-box">
                    <div className="mp-leave-date-col">
                      <span className="mp-leave-date-label">From Date</span>
                      <span className="mp-leave-date-val">
                        {fmtDate(req.start_date || req.from || req.from_date)}
                      </span>
                    </div>
                    <div className="mp-leave-date-col">
                      <span className="mp-leave-date-label">To Date</span>
                      <span className="mp-leave-date-val">
                        {fmtDate(req.end_date || req.to || req.to_date)}
                      </span>
                    </div>
                    <div className="mp-leave-date-col">
                      <span className="mp-leave-date-label">Applied On</span>
                      <span className="mp-leave-date-val">
                        {fmtDate(
                          req.created_at ||
                            req.submittedOn ||
                            req.applied_date ||
                            req.submitted_at
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Applicant Statement */}
                  {req.reason && (
                    <div className="mp-leave-statement-box">
                      <span className="mp-leave-statement-label">
                        Applicant Statement:
                      </span>
                      <p className="mp-leave-statement-text">{req.reason}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mp-leave-footer">
                    <span className="mp-leave-id">Leave ID: #{req.id}</span>

                    {isPending ? (
                      <div className="mp-leave-actions-group">
                        <button
                          type="button"
                          className="mp-leave-btn-reject"
                          onClick={() => setRejectModal(req)}
                          disabled={actionLoading}
                        >
                          <X size={15} /> Reject
                        </button>
                        <button
                          type="button"
                          className="mp-leave-btn-approve"
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading}
                        >
                          <Check size={15} /> Approve
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`mp-leave-decision-pill ${
                          isApproved ? "approved" : "rejected"
                        }`}
                      >
                        {isApproved ? (
                          <>
                            <Check size={14} /> Decision: Approved
                          </>
                        ) : (
                          <>
                            <X size={14} /> Decision: Rejected
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Reject Modal ── */}
      <ManagerModal
        isOpen={Boolean(rejectModal)}
        onClose={() => {
          setRejectModal(null);
          setRemarks("");
        }}
        title="Reject Leave Application"
        subtitle={`Please state the reason for rejecting ${
          rejectModal?.employee_name || rejectModal?.emp_code
        }'s leave request.`}
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
                fontSize: "13.5px",
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
                fontSize: "13.5px",
                opacity: actionLoading || !remarks.trim() ? 0.6 : 1,
              }}
            >
              {actionLoading ? "Submitting..." : "Confirm Rejection"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--mp-text-primary, #111827)",
            }}
          >
            Rejection Reason *
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g., Critical release scheduled during this sprint..."
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
