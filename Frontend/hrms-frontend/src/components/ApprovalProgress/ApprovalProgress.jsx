import React from "react";
import { Check, Clock, X, Minus } from "lucide-react";
import "./ApprovalProgress.css";

/**
 * Reusable Two-Level Approval Progress Component
 * Displays Manager stage and Admin stage with reviewer name, timestamp, and status.
 */
export const ApprovalProgress = ({
  managerStatus = "PENDING",
  adminStatus = "PENDING",
  overallStatus = "PENDING_MANAGER",
  managerName = "Manager",
  managerReviewedAt = null,
  managerComment = "",
  managerRejectionReason = "",
  adminName = "Admin",
  adminReviewedAt = null,
  adminComment = "",
  adminRejectionReason = "",
  submittedAt = null,
  compact = false,
}) => {
  const normMgr = String(managerStatus || "PENDING").toUpperCase();
  const normAdm = String(adminStatus || "PENDING").toUpperCase();
  const normOverall = String(overallStatus || "PENDING_MANAGER").toUpperCase();

  const isMgrApproved = normMgr === "APPROVED" || ["PENDING_ADMIN", "APPROVED"].includes(normOverall);
  const isMgrRejected = normMgr === "REJECTED" || (normOverall === "REJECTED" && normAdm !== "REJECTED");
  const isMgrPending = !isMgrApproved && !isMgrRejected;

  const isAdmApproved = normAdm === "APPROVED" || normOverall === "APPROVED";
  const isAdmRejected = normAdm === "REJECTED" || (normOverall === "REJECTED" && isMgrApproved);
  const isAdmPending = isMgrApproved && !isAdmApproved && !isAdmRejected;
  const isAdmSkipped = isMgrRejected;

  const fmtTime = (ts) => {
    if (!ts || ts === "—") return "";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(ts);
    }
  };

  if (compact) {
    return (
      <div className="ap-compact-container">
        <div className="ap-compact-step">
          <span className="ap-compact-label">Manager:</span>
          {isMgrApproved && <span className="ap-tag ap-tag--approved">Approved ✓</span>}
          {isMgrRejected && <span className="ap-tag ap-tag--rejected">Rejected ✕</span>}
          {isMgrPending && <span className="ap-tag ap-tag--pending">Pending ○</span>}
        </div>
        <div className="ap-compact-arrow">→</div>
        <div className="ap-compact-step">
          <span className="ap-compact-label">Admin:</span>
          {isAdmApproved && <span className="ap-tag ap-tag--approved">Approved ✓</span>}
          {isAdmRejected && <span className="ap-tag ap-tag--rejected">Rejected ✕</span>}
          {isAdmPending && <span className="ap-tag ap-tag--pending">Pending ○</span>}
          {isAdmSkipped && <span className="ap-tag ap-tag--muted">—</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="ap-full-container">
      <div className="ap-header">
        <span className="ap-title">Approval Progress</span>
        {submittedAt && (
          <span className="ap-submitted">Submitted: {fmtTime(submittedAt)}</span>
        )}
      </div>

      <div className="ap-timeline">
        {/* STEP 1: MANAGER */}
        <div className={`ap-step ${isMgrApproved ? "is-approved" : isMgrRejected ? "is-rejected" : "is-pending"}`}>
          <div className="ap-indicator">
            {isMgrApproved && <Check size={14} className="ap-icon" />}
            {isMgrRejected && <X size={14} className="ap-icon" />}
            {isMgrPending && <Clock size={14} className="ap-icon" />}
          </div>
          <div className="ap-step-content">
            <div className="ap-step-header">
              <strong className="ap-step-title">Manager Approval</strong>
              <span className={`ap-step-badge ${isMgrApproved ? "badge-success" : isMgrRejected ? "badge-danger" : "badge-warning"}`}>
                {isMgrApproved ? "Approved ✓" : isMgrRejected ? "Rejected ✕" : "Pending Review"}
              </span>
            </div>
            <div className="ap-step-meta">
              <span>{managerName || "Reporting Manager"}</span>
              {managerReviewedAt && <span>• {fmtTime(managerReviewedAt)}</span>}
            </div>
            {isMgrRejected && managerRejectionReason && (
              <div className="ap-reason">Reason: {managerRejectionReason}</div>
            )}
            {managerComment && !isMgrRejected && (
              <div className="ap-comment">{managerComment}</div>
            )}
          </div>
        </div>

        {/* CONNECTOR LINE */}
        <div className={`ap-connector ${isMgrApproved ? "is-approved" : ""}`} />

        {/* STEP 2: ADMIN */}
        <div className={`ap-step ${isAdmApproved ? "is-approved" : isAdmRejected ? "is-rejected" : isAdmPending ? "is-pending" : "is-skipped"}`}>
          <div className="ap-indicator">
            {isAdmApproved && <Check size={14} className="ap-icon" />}
            {isAdmRejected && <X size={14} className="ap-icon" />}
            {isAdmPending && <Clock size={14} className="ap-icon" />}
            {isAdmSkipped && <Minus size={14} className="ap-icon" />}
          </div>
          <div className="ap-step-content">
            <div className="ap-step-header">
              <strong className="ap-step-title">Admin Final Approval</strong>
              <span className={`ap-step-badge ${isAdmApproved ? "badge-success" : isAdmRejected ? "badge-danger" : isAdmPending ? "badge-warning" : "badge-muted"}`}>
                {isAdmApproved ? "Approved ✓" : isAdmRejected ? "Rejected ✕" : isAdmPending ? "Pending Review" : "Not Required"}
              </span>
            </div>
            <div className="ap-step-meta">
              <span>{adminName || "HR Admin"}</span>
              {adminReviewedAt && <span>• {fmtTime(adminReviewedAt)}</span>}
            </div>
            {isAdmRejected && adminRejectionReason && (
              <div className="ap-reason">Reason: {adminRejectionReason}</div>
            )}
            {adminComment && !isAdmRejected && (
              <div className="ap-comment">{adminComment}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalProgress;
