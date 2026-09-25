import React, { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, FileText } from "lucide-react";
import { ManagerBadge } from "../../components/ManagerBadge";
import { ManagerModal } from "../../components/ManagerModal";
import { managerToast } from "../../components/ManagerToast";
import {
  getRegularizationRequests,
  approveRegularization,
  rejectRegularization,
} from "../../services/managerApiService";
import "./Approvals.css";

export const RegularizationApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectModal, setRejectModal] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRegularizationRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch regularizations:", err);
      managerToast.error("Could not load regularization requests.", { title: "Error" });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 4000);
    const onSync = () => fetchRequests();
    window.addEventListener("focus", onSync);
    window.addEventListener("regularization-updated", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
      window.removeEventListener("regularization-updated", onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [fetchRequests]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await approveRegularization(id);
      await fetchRequests();
      window.dispatchEvent(new Event("regularization-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({
          type: 'regularization-updated',
          id,
          timestamp: Date.now()
        }));
      } catch (e) {}
      managerToast.success("Regularization request approved and attendance hours updated.", {
        title: "Request Approved",
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
      await rejectRegularization(rejectModal.id);
      await fetchRequests();
      window.dispatchEvent(new Event("regularization-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({
          type: 'regularization-updated',
          id: rejectModal.id,
          timestamp: Date.now()
        }));
      } catch (e) {}
      managerToast.error("Regularization request rejected.", { title: "Request Rejected" });
      setRejectModal(null);
      setRemarks("");
    } catch (err) {
      managerToast.error("Failed to reject: " + err.message, { title: "Error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Normalise status field (API uses "Pending", "Approved", "Rejected")
  const normalise = (s) => (s || "").toLowerCase();

  const filteredRequests = requests.filter((r) => {
    if (activeTab === "pending") return normalise(r.status) === "pending";
    return normalise(r.status) !== "pending";
  });

  /** Format a date string nicely */
  const fmtDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
          Attendance Regularization Requests
        </h2>
        <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
          Review and sanitize punch discrepancies, missing check-in/out stamps, and overtime corrections.
        </p>
      </div>

      {/* Tabs */}
      <div className="mp-tab-bar">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`mp-tab-btn ${activeTab === "pending" ? "is-active" : ""}`}
        >
          <span>Pending Review</span>
          <span className="mp-tab-count">
            {requests.filter((r) => normalise(r.status) === "pending").length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`mp-tab-btn ${activeTab === "history" ? "is-active" : ""}`}
        >
          <span>Approval History</span>
          <span className="mp-tab-count">
            {requests.filter((r) => normalise(r.status) !== "pending").length}
          </span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "14px" }}>
          Loading regularization requests...
        </div>
      )}

      {/* Requests List */}
      {!loading && (
        <div className="mp-approval-card-list">
          {filteredRequests.length === 0 ? (
            <div
              style={{
                padding: "48px 20px", textAlign: "center",
                background: "var(--mp-surface)", border: "1px solid var(--mp-border)",
                borderRadius: "14px", color: "var(--mp-text-muted)", fontSize: "14px",
              }}
            >
              No regularization requests in this category.
            </div>
          ) : (
            filteredRequests.map((req) => {
              const employeeName = req.employee_name || req.emp_code || "Employee";
              const initials = employeeName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              const statusLower = normalise(req.status);

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
                    <ManagerBadge variant={statusLower} size="md" dot>
                      {req.status}
                    </ManagerBadge>
                  </div>

                  <div className="mp-req-details-grid">
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">Attendance Date</span>
                      <span className="mp-req-val">{fmtDate(req.target_date)}</span>
                    </div>
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">Requested In Time</span>
                      <span className="mp-req-val" style={{ color: "#059669" }}>
                        {req.issued_for_in_time || "—"}
                      </span>
                    </div>
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">Requested Out Time</span>
                      <span className="mp-req-val" style={{ color: "#059669" }}>
                        {req.issued_for_out_time || "—"}
                      </span>
                    </div>
                    <div className="mp-req-detail-item">
                      <span className="mp-req-label">Submitted On</span>
                      <span className="mp-req-val">{fmtDate(req.request_date)}</span>
                    </div>
                  </div>

                  {req.comment && (
                    <div className="mp-req-reason-box">
                      <strong>Reason:</strong>
                      <p style={{ margin: "4px 0 0 0" }}>{req.comment}</p>
                    </div>
                  )}

                  <div className="mp-req-footer">
                    <span style={{ fontSize: "12px", color: "var(--mp-text-muted)" }}>
                      Request ID: #{req.id}
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
                          <Check size={15} /> Sanction & Approve
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: statusLower === "approved" ? "#059669" : "#DC2626" }}>
                        {statusLower === "approved" ? "✓ Approved by Manager" : "✕ Rejected"}
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
        title="Reject Regularization Request"
        subtitle={`Please state why ${rejectModal?.employee_name || rejectModal?.emp_code}'s regularization for ${fmtDate(rejectModal?.target_date)} is being denied.`}
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
              {actionLoading ? "Submitting..." : "Submit Rejection"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600 }}>Remarks for Employee</label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g., Punch logs do not align with swipe terminal at security..."
            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--mp-border)", background: "var(--mp-surface)", color: "var(--mp-text-primary)", fontSize: "13.5px", outline: "none" }}
          />
        </div>
      </ManagerModal>
    </div>
  );
};
