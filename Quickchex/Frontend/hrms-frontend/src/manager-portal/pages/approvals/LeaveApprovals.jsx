import React, { useState, useEffect, useCallback } from "react";
import { Check, X, Calendar } from "lucide-react";
import { ManagerBadge } from "../../components/ManagerBadge";
import { ManagerModal } from "../../components/ManagerModal";
import { managerToast } from "../../components/ManagerToast";
import { useManagerAuth } from "../../auth/ManagerAuthContext";
import {
  getTeamLeaves,
  approveLeave,
  rejectLeave,
} from "../../services/managerApiService";
import "./Approvals.css";

export const LeaveApprovals = () => {
  const { manager } = useManagerAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectModal, setRejectModal] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = useCallback(async () => {
    const empCode = manager?.id || manager?.emp_code || localStorage.getItem("emp_code") || "MGR001";
    setLoading(true);
    try {
      let data = await getTeamLeaves(empCode).catch(() => []);
      if (!Array.isArray(data) || data.length === 0) {
        // Fallback to fetch all active applications
        const res = await fetch("http://localhost:8000/api/v1/leave/applications").catch(() => null);
        if (res && res.ok) {
          data = await res.json();
        }
      }
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch team leaves:", err);
      managerToast.error("Could not load leave requests.", { title: "Error" });
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    fetchLeaves();
    const interval = setInterval(fetchLeaves, 4000);
    const onSync = () => fetchLeaves();
    window.addEventListener("focus", onSync);
    window.addEventListener("leave-applied", onSync);
    window.addEventListener("leave-balance-updated", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
      window.removeEventListener("leave-applied", onSync);
      window.removeEventListener("leave-balance-updated", onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [fetchLeaves]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await approveLeave(id);
      await fetchLeaves();
      window.dispatchEvent(new Event("leave-applied"));
      window.dispatchEvent(new Event("leave-balance-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({
          type: 'leave-updated',
          id,
          timestamp: Date.now()
        }));
      } catch (e) { }
      managerToast.success("Leave application approved and calendar updated.", {
        title: "Leave Approved",
      });
    } catch (err) {
      managerToast.error("Failed to approve: " + err.message, { title: "Error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      managerToast.error("Please enter mandatory rejection remarks.", { title: "Validation Error" });
      return;
    }
    setActionLoading(true);
    try {
      await rejectLeave(rejectModal.id);
      await fetchLeaves();
      window.dispatchEvent(new Event("leave-applied"));
      window.dispatchEvent(new Event("leave-balance-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({
          type: 'leave-updated',
          id: rejectModal.id,
          timestamp: Date.now()
        }));
      } catch (e) { }
      managerToast.error("Leave application rejected.", { title: "Leave Rejected" });
      setRejectModal(null);
      setRemarks("");
    } catch (err) {
      managerToast.error("Failed to reject: " + err.message, { title: "Error" });
    } finally {
      setActionLoading(false);
    }
  };

  const normalise = (s) => (s || "").toLowerCase();

  const filteredLeaves = leaves.filter((l) => {
    if (activeTab === "pending") return normalise(l.status) === "pending";
    return normalise(l.status) !== "pending";
  });

  const fmtDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
          Team Leave Applications
        </h2>
        <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
          Review employee leave balances, absence reasons, and approve or reject team requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="mp-tab-bar">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`mp-tab-btn ${activeTab === "pending" ? "is-active" : ""}`}
        >
          <span>Pending Approvals</span>
          <span className="mp-tab-count">
            {leaves.filter((l) => normalise(l.status) === "pending").length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`mp-tab-btn ${activeTab === "history" ? "is-active" : ""}`}
        >
          <span>Leave History</span>
          <span className="mp-tab-count">
            {leaves.filter((l) => normalise(l.status) !== "pending").length}
          </span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "14px" }}>
          Loading leave requests...
        </div>
      )}

      {/* Leave List */}
      {!loading && (
        <div className="mp-approval-card-list">
          {filteredLeaves.length === 0 ? (
            <div
              style={{
                padding: "48px 20px", textAlign: "center",
                background: "var(--mp-surface)", border: "1px solid var(--mp-border)",
                borderRadius: "14px", color: "var(--mp-text-muted)", fontSize: "14px",
              }}
            >
              No leave applications under this filter.
            </div>
          ) : (
            filteredLeaves.map((req) => {
              const employeeName = req.employee_name || req.emp_code || "Employee";
              const initials = employeeName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              const statusLower = normalise(req.status);
              const leaveType = req.leave_type || req.leaveType || "Leave";

              return (
                <div key={req.id} className="mp-approval-req-card">
                  <div className="mp-req-top">
                    <div className="mp-req-user-block">
                      <div className="mp-req-avatar">{initials}</div>
                      <div>
                        <div className="mp-req-user-title">{employeeName}</div>
                        <div className="mp-req-user-sub">{req.emp_code}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <ManagerBadge variant="leave" size="md">{leaveType}</ManagerBadge>
                      <ManagerBadge variant={statusLower} size="md" dot>{req.status}</ManagerBadge>
                    </div>
                  </div>

                  <div className="mp-req-details-grid">
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">From Date</span>
                      <span className="mp-req-val">{fmtDate(req.start_date || req.from)}</span>
                    </div>
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">To Date</span>
                      <span className="mp-req-val">{fmtDate(req.end_date || req.to)}</span>
                    </div>
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">Applied On</span>
                      <span className="mp-req-val">{fmtDate(req.created_at || req.submittedOn)}</span>
                    </div>
                  </div>

                  {req.reason && (
                    <div className="mp-req-reason-box">
                      <strong>Applicant Statement:</strong>
                      <p style={{ margin: "4px 0 0 0" }}>{req.reason}</p>
                    </div>
                  )}

                  <div className="mp-req-footer">
                    <span style={{ fontSize: "12px", color: "var(--mp-text-muted)" }}>
                      Leave ID: #{req.id}
                    </span>

                    {statusLower === "pending" ? (
                      <div className="mp-btn-group">
                        <button
                          type="button"
                          className="mp-btn-reject"
                          onClick={() => setRejectModal(req)}
                          disabled={actionLoading}
                        >
                          <X size={15} /> Reject
                        </button>
                        <button
                          type="button"
                          className="mp-btn-approve"
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading}
                        >
                          <Check size={15} /> Sanction Leave
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: statusLower === "approved" ? "#059669" : "#DC2626" }}>
                        {statusLower === "approved" ? "✓ Sanctioned by Manager" : "✕ Rejected"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Reject Modal */}
      <ManagerModal
        isOpen={Boolean(rejectModal)}
        onClose={() => setRejectModal(null)}
        title="Reject Leave Application"
        subtitle={`Please state the reason for rejecting ${rejectModal?.employee_name || rejectModal?.emp_code}'s leave request.`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectModal(null)}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--mp-border)", background: "transparent", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={actionLoading}
              style={{ padding: "8px 18px", borderRadius: "8px", border: "none", background: "#DC2626", color: "#FFF", fontWeight: 600, cursor: "pointer", opacity: actionLoading ? 0.7 : 1 }}
            >
              {actionLoading ? "Submitting..." : "Confirm Rejection"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600 }}>Rejection Reason</label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g., Critical release scheduled during this sprint..."
            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--mp-border)", background: "var(--mp-surface)", color: "var(--mp-text-primary)", fontSize: "13.5px", outline: "none" }}
          />
        </div>
      </ManagerModal>
    </div>
  );
};
