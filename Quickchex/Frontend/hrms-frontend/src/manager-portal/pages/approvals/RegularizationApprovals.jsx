import React, { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, User, Calendar, AlertCircle, RotateCw } from "lucide-react";
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
  return u === "COMPLETED" || u === "APPROVED" || u === "PENDING_ADMIN" || u === "APPROVED_BY_MANAGER";
};

const isRejected = (s) => {
  const u = (s || "").toUpperCase();
  return u === "REJECTED" || u === "REJECTED_BY_MANAGER" || u === "REJECTED_BY_ADMIN";
};

const statusLabel = (s) => {
  const u = (s || "").toUpperCase();
  if (u === "PENDING_MANAGER") return "Pending Manager Review";
  if (u === "PENDING_ADMIN" || u === "APPROVED_BY_MANAGER") return "Pending Admin Approval";
  if (u === "PENDING") return "Pending Review";
  if (u === "COMPLETED" || u === "APPROVED") return "Approved";
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

/** Format a raw time string like "2026-09-24 09:30:00" or "09:30 AM" → "09:30 AM" */
const fmtTime = (t) => {
  if (!t || t === "-" || t === "—") return "—";
  try {
    const s = String(t).trim();
    if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(s)) return s;
    const d = new Date(s.replace(" ", "T"));
    if (isNaN(d)) return s;
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return String(t); }
};

/** Format ISO date → "25 Sep 2026" */
const fmtDate = (d) => {
  if (!d || d === "-" || d === "—") return "—";
  try {
    const s = String(d).trim();
    if (/[a-zA-Z]/.test(s)) return s;
    const dt = new Date(s.includes("T") ? s : `${s}T00:00:00`);
    if (isNaN(dt)) return s;
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return String(d); }
};

/** Format datetime → "25 Sep 2026, 09:42 AM" */
const fmtDateTime = (d) => {
  if (!d || d === "-" || d === "—") return "—";
  try {
    const s = String(d).trim();
    if (s.includes(",") && /[a-zA-Z]/.test(s)) return s;
    const dt = new Date(s.replace(" ", "T"));
    if (isNaN(dt)) return s;
    return dt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return String(d); }
};

const initials = (name) =>
  (name || "?").split(" ").map((n) => n[0] || "").join("").toUpperCase().slice(0, 2);

/* ─── Skeleton Card ──────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div style={{
    background: "var(--mp-surface)", border: "1px solid var(--mp-border)",
    borderRadius: "14px", padding: "20px", animation: "mp-pulse 1.5s ease-in-out infinite",
    opacity: 0.6,
  }}>
    <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--mp-border)" }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, background: "var(--mp-border)", borderRadius: 6, width: "40%", marginBottom: 8 }} />
        <div style={{ height: 12, background: "var(--mp-border)", borderRadius: 6, width: "25%" }} />
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div style={{ height: 10, background: "var(--mp-border)", borderRadius: 4, width: "60%", marginBottom: 6 }} />
          <div style={{ height: 13, background: "var(--mp-border)", borderRadius: 4, width: "80%" }} />
        </div>
      ))}
    </div>
  </div>
);

/* ─── Detail Drawer ──────────────────────────────────────────────────────── */
const DetailDrawer = ({ req, onClose, onApprove, onReject, actionLoading }) => {
  if (!req) return null;
  const name = req.employee_name || req.employeeName || req.name || req.emp_code || "Employee";
  const empCode = req.emp_code || req.employeeId || "—";
  const dept = req.department || "—";
  const desig = req.designation || "—";
  const attDate = fmtDate(req.attendanceDate || req.target_date || req.date);
  const submittedOn = fmtDateTime(req.submittedOn || req.submitted_on || req.created_at || req.request_date || req.requestDate || req.appliedDate);
  const reqIn = fmtTime(req.checkIn || req.inTime || req.issued_for_in_time);
  const reqOut = fmtTime(req.checkOut || req.outTime || req.issued_for_out_time);
  const reason = req.comment || req.reason || req.issue || "—";
  const reqId = req.id || req.rawId;
  const pending = isPending(req.status);
  const approved = isApproved(req.status);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, height: "100vh", width: "420px", maxWidth: "95vw",
      background: "var(--mp-surface, #fff)", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
      zIndex: 1000, display: "flex", flexDirection: "column", overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--mp-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--mp-text-primary)" }}>Regularization Request</div>
          <div style={{ fontSize: 12, color: "var(--mp-text-muted)", marginTop: 2 }}>#{reqId}</div>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--mp-text-muted)", padding: 4, display: "flex" }}>
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Employee */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: "var(--mp-primary, #7c3aed)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 16, flexShrink: 0,
          }}>{initials(name)}</div>
          <div>
            <div style={{ fontWeight: 700, color: "var(--mp-text-primary)", fontSize: 15 }}>{name}</div>
            <div style={{ fontSize: 12.5, color: "var(--mp-text-muted)" }}>{empCode} · {dept}</div>
            <div style={{ fontSize: 12, color: "var(--mp-text-muted)" }}>{desig}</div>
          </div>
        </div>

        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mp-text-muted)" }}>Status:</span>
          <ManagerBadge variant={badgeVariant(req.status)}>{statusLabel(req.status)}</ManagerBadge>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--mp-border)", margin: 0 }} />

        {/* Attendance Date */}
        <DrawerField label="Attendance Date" value={attDate} />

        {/* Requested Times */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--mp-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Requested Correction</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DrawerField label="Check In" value={reqIn} accent="#059669" />
            <DrawerField label="Check Out" value={reqOut} accent="#059669" />
          </div>
        </div>

        {/* Reason */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--mp-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Reason</div>
          <div style={{ fontSize: 13.5, color: "var(--mp-text-primary)", background: "var(--mp-surface-subtle, #f8f7ff)", padding: "10px 14px", borderRadius: 8, lineHeight: 1.5 }}>
            {reason}
          </div>
        </div>

        {/* Submitted */}
        <DrawerField label="Submitted On" value={submittedOn} />

        {/* Manager comment if rejected */}
        {isRejected(req.status) && req.manager_comment && req.manager_comment !== "-" && (
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Rejection Reason</div>
            <div style={{ fontSize: 13, color: "#DC2626", background: "#fef2f2", padding: "10px 14px", borderRadius: 8 }}>
              {req.manager_comment}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {pending && (
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--mp-border)", display: "flex", gap: 10 }}>
          <button
            onClick={() => { onReject(req); onClose(); }}
            disabled={actionLoading}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #ef4444", background: "#fff", color: "#ef4444", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}
          >
            <X size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Reject
          </button>
          <button
            onClick={() => { onApprove(req.id); onClose(); }}
            disabled={actionLoading}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "var(--mp-primary, #7c3aed)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}
          >
            <Check size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Approve
          </button>
        </div>
      )}
    </div>
  );
};

const DrawerField = ({ label, value, accent }) => (
  <div>
    <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--mp-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: accent || "var(--mp-text-primary)" }}>{value || "—"}</div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */

export const RegularizationApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectModal, setRejectModal] = useState(null);
  const [drawerReq, setDrawerReq] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [approveConfirm, setApproveConfirm] = useState(null);
  const [search, setSearch] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRegularizationRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch regularizations:", err);
      setError("Unable to load regularization requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const onSync = () => fetchRequests();
    window.addEventListener("focus", onSync);
    window.addEventListener("regularization-updated", onSync);
    return () => {
      window.removeEventListener("focus", onSync);
      window.removeEventListener("regularization-updated", onSync);
    };
  }, [fetchRequests]);

  const handleApprove = async (id) => {
    setApproveConfirm(null);
    setActionLoading(true);
    // Optimistic UI update so status changes immediately
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Approved", manager_action: "Approved" } : r))
    );
    try {
      await approveRegularization(id);
      await fetchRequests();
      window.dispatchEvent(new Event("regularization-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      managerToast.success("Regularization request approved successfully.", { title: "Approved" });
    } catch (err) {
      await fetchRequests();
      managerToast.error("Failed to approve: " + err.message, { title: "Error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      managerToast.error("Please enter a rejection reason.", { title: "Required" });
      return;
    }
    const targetId = rejectModal.id;
    const reasonText = remarks.trim();
    setActionLoading(true);
    // Optimistic UI update so status changes immediately
    setRequests((prev) =>
      prev.map((r) =>
        r.id === targetId ? { ...r, status: "Rejected", manager_action: "Rejected", manager_comment: reasonText } : r
      )
    );
    try {
      await rejectRegularization(targetId, reasonText);
      await fetchRequests();
      window.dispatchEvent(new Event("regularization-updated"));
      managerToast.info("Regularization request rejected.", { title: "Rejected" });
      setRejectModal(null);
      setRemarks("");
    } catch (err) {
      await fetchRequests();
      managerToast.error("Failed to reject: " + err.message, { title: "Error" });
    } finally {
      setActionLoading(false);
    }
  };

  /* Pending = PENDING_MANAGER; History = anything else */
  const pendingReqs = requests.filter((r) => isPending(r.status));
  const historyReqs = requests.filter((r) => !isPending(r.status));
  const displayedReqs = (activeTab === "pending" ? pendingReqs : historyReqs).filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (r.employee_name || r.employeeName || r.name || r.emp_code || "").toLowerCase();
    const code = (r.emp_code || "").toLowerCase();
    const rid = String(r.id || "");
    return name.includes(q) || code.includes(q) || rid.includes(q);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
            Attendance Regularization Requests
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
            Review punch discrepancies, missing check-in/out stamps, and overtime corrections.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          title="Refresh"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px solid var(--mp-border)", borderRadius: 8, background: "var(--mp-surface)", cursor: "pointer", fontSize: 13, color: "var(--mp-text-muted)", fontWeight: 500 }}
        >
          <RotateCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mp-tab-bar">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`mp-tab-btn ${activeTab === "pending" ? "is-active" : ""}`}
        >
          <span>Pending Review</span>
          <span className="mp-tab-count">{pendingReqs.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`mp-tab-btn ${activeTab === "history" ? "is-active" : ""}`}
        >
          <span>Approval History</span>
          <span className="mp-tab-count">{historyReqs.length}</span>
        </button>

        {/* Search */}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <input
            type="text"
            placeholder="Search employee, ID, request..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "7px 12px 7px 32px", border: "1px solid var(--mp-border)",
              borderRadius: 8, fontSize: 13, outline: "none", background: "var(--mp-surface-subtle, #f8f7ff)",
              color: "var(--mp-text-primary)", minWidth: 220,
            }}
          />
          <User size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--mp-text-muted)" }} />
        </div>
      </div>

      {/* Error State */}
      {error && !loading && (
        <div style={{ padding: "32px 20px", textAlign: "center", background: "var(--mp-surface)", border: "1px solid var(--mp-border)", borderRadius: 14 }}>
          <AlertCircle size={32} color="#ef4444" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--mp-text-primary)", marginBottom: 6 }}>{error}</div>
          <button onClick={fetchRequests} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--mp-primary, #7c3aed)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Cards */}
      {!loading && !error && (
        <div className="mp-approval-card-list">
          {displayedReqs.length === 0 ? (
            <div style={{
              padding: "56px 20px", textAlign: "center", background: "var(--mp-surface)",
              border: "1px solid var(--mp-border)", borderRadius: "14px", color: "var(--mp-text-muted)",
            }}>
              <Clock size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "var(--mp-text-primary)" }}>
                {activeTab === "pending" ? "No pending regularization requests" : "No approval history yet"}
              </div>
              <div style={{ fontSize: 13 }}>
                {activeTab === "pending"
                  ? "Requests submitted by your team will appear here."
                  : "Approved and rejected requests will appear here."}
              </div>
            </div>
          ) : (
            displayedReqs.map((req) => {
              const name = req.employee_name || req.employeeName || req.name || req.emp_code || "Employee";
              const empCode = req.emp_code || req.employeeId || "—";
              const dept = req.department || "—";
              const desig = req.designation || "—";
              const attDate = fmtDate(req.attendanceDate || req.target_date || req.date);
              const submittedOn = fmtDateTime(req.submittedOn || req.submitted_on || req.created_at || req.request_date || req.requestDate || req.appliedDate);
              const reqIn = fmtTime(req.checkIn || req.inTime || req.issued_for_in_time);
              const reqOut = fmtTime(req.checkOut || req.outTime || req.issued_for_out_time);
              const reason = req.comment || req.reason || req.issue || "—";
              const pending = isPending(req.status);
              const approved = isApproved(req.status);
              const rejected = isRejected(req.status);

              return (
                <div
                  key={req.id}
                  className="mp-approval-req-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => setDrawerReq(req)}
                >
                  {/* Top: employee + status */}
                  <div className="mp-req-top">
                    <div className="mp-req-user-block">
                      <div className="mp-req-avatar">{initials(name)}</div>
                      <div>
                        <div className="mp-req-user-title">{name}</div>
                        <div className="mp-req-user-sub">{empCode} · {dept} · {desig}</div>
                      </div>
                    </div>
                    <ManagerBadge variant={badgeVariant(req.status)} dot>
                      {statusLabel(req.status)}
                    </ManagerBadge>
                  </div>

                  {/* Detail grid */}
                  <div className="mp-req-details-grid">
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">Attendance Date</span>
                      <span className="mp-req-val">{attDate}</span>
                    </div>
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">Requested Check In</span>
                      <span className="mp-req-val" style={{ color: "#059669" }}>{reqIn}</span>
                    </div>
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">Requested Check Out</span>
                      <span className="mp-req-val" style={{ color: "#059669" }}>{reqOut}</span>
                    </div>
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">Submitted On</span>
                      <span className="mp-req-val">{submittedOn}</span>
                    </div>
                  </div>

                  {/* Reason */}
                  {reason && reason !== "—" && (
                    <div className="mp-req-reason-box">
                      <strong>Reason:</strong>
                      <p style={{ margin: "4px 0 0 0" }}>{reason}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mp-req-footer" onClick={(e) => e.stopPropagation()}>
                    <span style={{ fontSize: "12px", color: "var(--mp-text-muted)" }}>
                      Request ID: #{req.id}
                    </span>

                    {pending ? (
                      <div className="mp-btn-group">
                        <button
                          type="button"
                          className="mp-btn-reject"
                          onClick={(e) => { e.stopPropagation(); setRejectModal(req); }}
                          disabled={actionLoading}
                        >
                          <X size={14} /> Reject
                        </button>
                        <button
                          type="button"
                          className="mp-btn-approve"
                          onClick={(e) => { e.stopPropagation(); setApproveConfirm(req); }}
                          disabled={actionLoading}
                        >
                          <Check size={14} /> {actionLoading ? "Processing…" : "Approve"}
                        </button>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: "12.5px", fontWeight: 700,
                        color: rejected ? "#DC2626" : "#059669",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {rejected ? <X size={14} /> : <Check size={14} />}
                        {statusLabel(req.status)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Detail Drawer */}
      {drawerReq && (
        <>
          <div
            onClick={() => setDrawerReq(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 999 }}
          />
          <DetailDrawer
            req={drawerReq}
            onClose={() => setDrawerReq(null)}
            onApprove={(id) => { setApproveConfirm(drawerReq); }}
            onReject={(r) => { setRejectModal(r); }}
            actionLoading={actionLoading}
          />
        </>
      )}

      {/* Approve Confirmation Modal */}
      <ManagerModal
        isOpen={Boolean(approveConfirm)}
        onClose={() => setApproveConfirm(null)}
        title="Approve Regularization?"
        subtitle={`Approving the attendance correction for ${approveConfirm?.employee_name || approveConfirm?.emp_code || "this employee"} on ${fmtDate(approveConfirm?.target_date || approveConfirm?.date)}.`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setApproveConfirm(null)}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--mp-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApprove(approveConfirm.id)}
              disabled={actionLoading}
              style={{ padding: "8px 18px", borderRadius: "8px", border: "none", background: "var(--mp-primary, #7c3aed)", color: "#FFF", fontWeight: 600, cursor: "pointer", opacity: actionLoading ? 0.7 : 1 }}
            >
              {actionLoading ? "Approving…" : "Approve"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 13.5, color: "var(--mp-text-muted)", margin: 0 }}>
          This will move the request to <strong>Pending Admin Approval</strong>.
          The attendance record will be updated after final admin sign-off.
        </p>
      </ManagerModal>

      {/* Reject Modal */}
      <ManagerModal
        isOpen={Boolean(rejectModal)}
        onClose={() => { setRejectModal(null); setRemarks(""); }}
        title="Reject Regularization Request"
        subtitle={`Provide a reason for rejecting ${rejectModal?.employee_name || rejectModal?.emp_code}'s request for ${fmtDate(rejectModal?.target_date || rejectModal?.date)}.`}
        footer={
          <>
            <button
              type="button"
              onClick={() => { setRejectModal(null); setRemarks(""); }}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--mp-border)", background: "transparent", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={actionLoading || !remarks.trim()}
              style={{ padding: "8px 18px", borderRadius: "8px", border: "none", background: "#DC2626", color: "#FFF", fontWeight: 600, cursor: "pointer", opacity: (actionLoading || !remarks.trim()) ? 0.6 : 1 }}
            >
              {actionLoading ? "Submitting…" : "Reject Request"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--mp-text-primary)" }}>Reason for Rejection *</label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g., Punch logs do not align with swipe terminal at security..."
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "8px",
              border: `1px solid ${remarks.trim() ? "var(--mp-border)" : "#ef4444"}`,
              background: "var(--mp-surface)", color: "var(--mp-text-primary)",
              fontSize: "13.5px", outline: "none", resize: "vertical", boxSizing: "border-box",
            }}
          />
          {!remarks.trim() && <span style={{ fontSize: 12, color: "#ef4444" }}>Rejection reason is required.</span>}
        </div>
      </ManagerModal>
    </div>
  );
};
