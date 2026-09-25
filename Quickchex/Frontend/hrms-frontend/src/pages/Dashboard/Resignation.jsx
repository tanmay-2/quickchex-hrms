import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Calendar,
  Clock,
  ChevronDown,
  Send,
  RotateCcw,
  Laptop,
  ClipboardList,
  Users,
  Wallet,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  HelpCircle,
  Building2,
  Briefcase,
  AlertCircle,
  X,
  CheckCircle2,
  Check
} from "lucide-react";

import "./Resignation.css";
import Sidebar from "../../components/sidebar/Sidebar";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";

// ── API Configuration ──────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL;
const RESIGNATION_API_URL = `${API_BASE_URL}/api/v1/resignation`;

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export default function Resignation(props) {
  const isInsideShell = useContext(DashboardShellContext);

  if (!isInsideShell) {
    return (
      <DashboardShell>
        <ResignationContent isInsideShell={true} {...props} />
      </DashboardShell>
    );
  }

  return <ResignationContent isInsideShell={isInsideShell} {...props} />;
}

function ResignationContent({ isInsideShell }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const [employeeData, setEmployeeData] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return {
        name: u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || localStorage.getItem("user_name") || "Employee",
        designation: u.designation || localStorage.getItem("designation") || "Employee",
        department: u.department || "Operations",
        reportingManager: "Reporting Manager",
        dateOfJoining: "12 Jun 2023",
        requiredNotice: "30 Days",
      };
    } catch {
      return {
        name: localStorage.getItem("user_name") || "Employee",
        designation: localStorage.getItem("designation") || "Employee",
        department: "Operations",
        reportingManager: "Reporting Manager",
        dateOfJoining: "12 Jun 2023",
        requiredNotice: "30 Days",
      };
    }
  });

  // Form States
  const [primaryReason, setPrimaryReason] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [comment, setComment] = useState("");

  // Dropdown & Modal UI States
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null); // { type: 'success' | 'error', message: '' }

  const reasonDropdownRef = useRef(null);
  const token = localStorage.getItem("token");

  // Reasons list for dropdown
  const resignationReasons = [
    "Better Career Opportunity",
    "Higher Studies",
    "Career Change",
    "Relocation",
    "Health Reasons",
    "Personal Reasons",
    "Retirement",
    "Other"
  ];

  // Quick preset days from today
  const getPresetDate = (daysFromNow) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split("T")[0];
  };

  const presetOptions = [
    { label: "+15 Days", days: 15 },
    { label: "+30 Days (Standard)", days: 30 },
    { label: "+45 Days", days: 45 },
    { label: "+60 Days", days: 60 }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(event.target)) {
        setIsReasonOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch user profile
  useEffect(() => {
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const empCode = localStorage.getItem("emp_code") || "";
        const res = await fetch(`${API_BASE_URL}/profile/${empCode}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const fullName =
            data?.first_name && data?.last_name
              ? `${data.first_name} ${data.last_name}`
              : data?.user?.first_name
                ? `${data.user.first_name} ${data.user.last_name || ""}`
                : data?.name || localStorage.getItem("user_name") || "Employee";

          setEmployeeData((prev) => ({
            ...prev,
            name: fullName,
            designation: data?.designation || prev.designation,
            department: data?.department || prev.department,
            reportingManager: data?.reporting_manager || prev.reportingManager,
            dateOfJoining: data?.date_of_joining ? new Date(data.date_of_joining).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : prev.dateOfJoining,
          }));
        }
      } catch (err) {
        console.error("Profile Fetch Error:", err);
      }
    };

    fetchProfile();
  }, [token]);

  // Handle Form Submission
  const handleSubmitResignation = async (e) => {
    e.preventDefault();
    if (!primaryReason) {
      setAlertInfo({ type: "error", message: "Please select a primary reason for resignation." });
      return;
    }
    if (!lastWorkingDay) {
      setAlertInfo({ type: "error", message: "Please select or propose your last working day." });
      return;
    }

    setLoading(true);
    setAlertInfo(null);
    const payload = {
      primary_reason: primaryReason,
      proposed_last_working_day: lastWorkingDay,
      comment: comment,
    };

    try {
      const response = await fetch(`${RESIGNATION_API_URL}/submit`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setAlertInfo({ type: "success", message: "Your resignation request has been submitted successfully." });
        handleClearForm();
      } else {
        const errData = await response.json().catch(() => ({}));
        setAlertInfo({ type: "error", message: errData.detail || "Failed to submit resignation request." });
      }
    } catch (error) {
      console.error("Submission error:", error);
      setAlertInfo({ type: "error", message: "An error occurred while communicating with the server." });
    } finally {
      setLoading(false);
    }
  };

  // Handle Form Clear
  const handleClearForm = () => {
    setPrimaryReason("");
    setLastWorkingDay("");
    setComment("");
  };

  const getInitials = (name) => {
    if (!name) return "AK";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const pageBody = (
    <>
      {/* ── TOP ACTION BAR ── */}
      <section className="res-top-action-bar">

        <div className="res-header-controls">
          <button
            type="button"
            className="res-btn res-btn-secondary"
            onClick={() => setShowPolicyModal(true)}
          >
            <FileText size={15} />
            <span>Offboarding Policy</span>
          </button>
        </div>
      </section>

      {/* ── 4 KPI SUMMARY STAT CARDS ── */}
      <section className="res-summary-grid">
        {/* Card 1: Notice Period */}
        <div className="res-stat-card">
          <div className="res-stat-head">
            <div className="res-stat-head-left">
              <div className="res-stat-icon-badge purple">
                <Clock size={16} />
              </div>
              <span className="res-stat-label">Notice Period</span>
            </div>
            <span className="res-stat-pill purple">Standard</span>
          </div>
          <div className="res-stat-val-wrap">
            <h2 className="res-stat-val">{employeeData.requiredNotice}</h2>
            <span className="res-stat-unit">Duration</span>
          </div>
          <div className="res-stat-footer">
            <span><strong>Mandatory</strong> notice commitment</span>
          </div>
        </div>

        {/* Card 2: Exit Milestones */}
        <div className="res-stat-card">
          <div className="res-stat-head">
            <div className="res-stat-head-left">
              <div className="res-stat-icon-badge teal">
                <ClipboardList size={16} />
              </div>
              <span className="res-stat-label">Exit Steps</span>
            </div>
            <span className="res-stat-pill teal">4 Stages</span>
          </div>
          <div className="res-stat-val-wrap">
            <h2 className="res-stat-val">Sequential</h2>
            <span className="res-stat-unit">Process</span>
          </div>
          <div className="res-stat-footer">
            <span><strong>Assets • KT • Interview • F&F</strong></span>
          </div>
        </div>

        {/* Card 3: Reporting Manager */}
        <div className="res-stat-card">
          <div className="res-stat-head">
            <div className="res-stat-head-left">
              <div className="res-stat-icon-badge amber">
                <Users size={16} />
              </div>
              <span className="res-stat-label">Direct Approver</span>
            </div>
            <span className="res-stat-pill amber">Reviewer</span>
          </div>
          <div className="res-stat-val-wrap">
            <h2 className="res-stat-val">{employeeData.reportingManager}</h2>
          </div>
          <div className="res-stat-footer">
            <span><strong>First-level</strong> approval workflow</span>
          </div>
        </div>

        {/* Card 4: Joining Date */}
        <div className="res-stat-card">
          <div className="res-stat-head">
            <div className="res-stat-head-left">
              <div className="res-stat-icon-badge blue">
                <Calendar size={16} />
              </div>
              <span className="res-stat-label">Joining Date</span>
            </div>
            <span className="res-stat-pill blue">Permanent</span>
          </div>
          <div className="res-stat-val-wrap">
            <h2 className="res-stat-val">{employeeData.dateOfJoining}</h2>
          </div>
          <div className="res-stat-footer">
            <span><strong>Confirmed</strong> organizational tenure</span>
          </div>
        </div>
      </section>

      {/* ── EMPLOYEE IDENTITY CARD ── */}
      <section className="res-profile-card">
        <div className="res-profile-top">
          <div className="res-avatar-badge">
            {getInitials(employeeData.name)}
          </div>
          <div className="res-profile-identity">
            <h2 className="res-profile-name">{employeeData.name}</h2>
            <div className="res-profile-badges">
              <span className="res-tag-pill">
                <Briefcase size={14} />
                <span>{employeeData.designation}</span>
              </span>
              <span className="res-tag-dept">{employeeData.department}</span>
            </div>
          </div>
        </div>

        <div className="res-profile-meta-grid">
          <div className="res-meta-item">
            <span className="res-meta-label">
              <Users size={12} /> Reporting Manager
            </span>
            <span className="res-meta-val">{employeeData.reportingManager}</span>
          </div>
          <div className="res-meta-item">
            <span className="res-meta-label">
              <Calendar size={12} /> Date of Joining
            </span>
            <span className="res-meta-val">{employeeData.dateOfJoining}</span>
          </div>
          <div className="res-meta-item">
            <span className="res-meta-label">
              <Clock size={12} /> Notice Period
            </span>
            <span className="res-meta-val highlight">{employeeData.requiredNotice}</span>
          </div>
        </div>
      </section>

      {/* ── 2-COLUMN MAIN CONTENT ── */}
      <div className="res-main-layout">

        {/* Left Column: Resignation Application Form */}
        <div className="res-card">
          <div className="res-card-header">
            <div>
              <h3 className="res-card-title">Resignation Application</h3>
              <p className="res-card-desc">Please provide your reasons and proposed last working date.</p>
            </div>
            <span className="res-req-pill">
              <AlertCircle size={13} /> * Required fields
            </span>
          </div>

          {alertInfo && (
            <div className={`res-alert ${alertInfo.type}`}>
              <div className="res-alert-content">
                {alertInfo.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{alertInfo.message}</span>
              </div>
              <button
                type="button"
                className="res-alert-close"
                onClick={() => setAlertInfo(null)}
                aria-label="Dismiss alert"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitResignation} className="res-form">

            {/* Primary Reason */}
            <div className="res-field" ref={reasonDropdownRef}>
              <label className="res-label">
                Primary Reason <span className="res-req-star">*</span>
              </label>
              <div
                className={`res-select-trigger ${isReasonOpen ? "is-open" : ""}`}
                onClick={() => setIsReasonOpen(!isReasonOpen)}
              >
                <span className={primaryReason ? "" : "res-select-placeholder"}>
                  {primaryReason || "Select a professional reason"}
                </span>
                <ChevronDown
                  size={16}
                  style={{ transform: isReasonOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}
                />
              </div>

              {isReasonOpen && (
                <div className="res-dropdown-menu">
                  {resignationReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className={`res-dropdown-item ${primaryReason === reason ? "is-selected" : ""}`}
                      onClick={() => {
                        setPrimaryReason(reason);
                        setIsReasonOpen(false);
                      }}
                    >
                      <span>{reason}</span>
                      {primaryReason === reason && <Check size={14} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Proposed Last Working Day */}
            <div className="res-field">
              <label className="res-label">
                <Calendar size={14} style={{ color: "#7c3aed" }} />
                Proposed Last Working Day <span className="res-req-star">*</span>
              </label>

              <input
                type="date"
                className="res-input"
                value={lastWorkingDay}
                onChange={(e) => setLastWorkingDay(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />

              {/* Quick suggestion pills */}
              <div className="res-quick-dates">
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--res-text-faint)" }}>
                  Quick presets:
                </span>
                {presetOptions.map((opt) => {
                  const targetDate = getPresetDate(opt.days);
                  const isActive = lastWorkingDay === targetDate;
                  return (
                    <button
                      key={opt.days}
                      type="button"
                      className={`res-quick-date-pill ${isActive ? "active" : ""}`}
                      onClick={() => setLastWorkingDay(targetDate)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notice Letter / Comments */}
            <div className="res-field">
              <label className="res-label">
                <MessageSquare size={14} style={{ color: "#7c3aed" }} />
                Write a message (Notice Letter / Comments)
              </label>
              <textarea
                className="res-textarea"
                rows={4}
                placeholder="Write your formal notice message or additional details here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* Form Actions */}
            <div className="res-form-actions">
              <button
                type="button"
                className="res-btn res-btn-secondary"
                onClick={handleClearForm}
              >
                <RotateCcw size={15} />
                <span>Clear</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="res-btn res-btn-primary"
                style={{ flex: 1 }}
              >
                <Send size={15} />
                <span>{loading ? "Submitting..." : "Submit Application"}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Right Column: Offboarding Guidelines & Support */}
        <div className="res-guidelines-wrap">

          {/* What Happens Next Card */}
          <div className="res-card">
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--res-text)", margin: "0 0 6px" }}>
              What happens next?
            </h4>
            <p style={{ fontSize: "12.5px", color: "var(--res-text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Once your resignation is approved, these offboarding steps will follow:
            </p>

            <div className="res-milestone-list">
              <div className="res-milestone-item">
                <div className="res-milestone-icon">
                  <Laptop size={17} />
                </div>
                <div className="res-milestone-text">
                  <p className="res-milestone-title">Return company assets</p>
                  <p className="res-milestone-desc">Laptop, ID card, access card</p>
                </div>
              </div>

              <div className="res-milestone-item">
                <div className="res-milestone-icon">
                  <ClipboardList size={17} />
                </div>
                <div className="res-milestone-text">
                  <p className="res-milestone-title">Knowledge transfer</p>
                  <p className="res-milestone-desc">Handover documents & sessions</p>
                </div>
              </div>

              <div className="res-milestone-item">
                <div className="res-milestone-icon">
                  <Users size={17} />
                </div>
                <div className="res-milestone-text">
                  <p className="res-milestone-title">Exit interview</p>
                  <p className="res-milestone-desc">Scheduled with HR department</p>
                </div>
              </div>

              <div className="res-milestone-item">
                <div className="res-milestone-icon">
                  <Wallet size={17} />
                </div>
                <div className="res-milestone-text">
                  <p className="res-milestone-title">Final settlement</p>
                  <p className="res-milestone-desc">Full & final salary processing</p>
                </div>
              </div>
            </div>

            <div
              className="res-policy-trigger"
              onClick={() => setShowPolicyModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowPolicyModal(true); }}
            >
              <div>
                <p className="res-policy-trigger-title">Offboarding policy</p>
                <p className="res-policy-trigger-desc">Review standard exit processes</p>
              </div>
              <ArrowRight size={16} className="res-policy-arrow" />
            </div>
          </div>

          {/* Need Help Card */}
          <div className="res-help-card">
            <div className="res-help-icon">
              <HelpCircle size={18} />
            </div>
            <div className="res-help-text">
              <h4 className="res-help-title">Need help?</h4>
              <p className="res-help-desc">
                Contact HR if you have questions regarding your notice period or exit formalities.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* ── Offboarding Policy Modal Popup ── */}
      {showPolicyModal && (
        <div
          className="res-modal-overlay"
          onClick={() => setShowPolicyModal(false)}
        >
          <div
            className="res-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="res-modal-header">
              <div className="res-modal-header-left">
                <div className="res-modal-icon">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="res-modal-title">Company Offboarding Policy</h3>
                  <p className="res-modal-sub">Standard guidelines and procedures for employee exit</p>
                </div>
              </div>
              <button
                type="button"
                className="res-modal-close"
                onClick={() => setShowPolicyModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="res-modal-body">
              <div className="res-policy-section">
                <h4 className="res-policy-section-title">
                  <CheckCircle2 size={16} style={{ color: "#7c3aed" }} /> 1. Notice Period Compliance
                </h4>
                <p className="res-policy-section-body">
                  All full-time employees are required to serve a standard 30-day notice period upon resignation, unless an alternative release date is formally approved by department heads and HR. Shortfall in notice days may result in a proportionate recovery adjustment during final settlement.
                </p>
              </div>

              <div className="res-policy-section">
                <h4 className="res-policy-section-title">
                  <CheckCircle2 size={16} style={{ color: "#7c3aed" }} /> 2. Asset Return Protocol
                </h4>
                <p className="res-policy-section-body">
                  All company-issued assets including laptops, chargers, access cards, ID badges, and external hardware must be handed over to the IT & Admin department on or before the last working day. Clearance certificates are mandatory for settlement processing.
                </p>
              </div>

              <div className="res-policy-section">
                <h4 className="res-policy-section-title">
                  <CheckCircle2 size={16} style={{ color: "#7c3aed" }} /> 3. Knowledge Transfer (KT) & Handover
                </h4>
                <p className="res-policy-section-body">
                  Employees must prepare a comprehensive KT documentation package and conduct transition sessions with their reporting manager or designated successor. Successful completion of KT is signed off directly by the reporting manager.
                </p>
              </div>

              <div className="res-policy-section">
                <h4 className="res-policy-section-title">
                  <CheckCircle2 size={16} style={{ color: "#7c3aed" }} /> 4. Exit Interview & Feedback
                </h4>
                <p className="res-policy-section-body">
                  An exit interview will be scheduled with the HR department during the final week of your notice period. This confidential session provides an opportunity to share constructive feedback about your experience and organizational culture.
                </p>
              </div>

              <div className="res-policy-section">
                <h4 className="res-policy-section-title">
                  <CheckCircle2 size={16} style={{ color: "#7c3aed" }} /> 5. Full & Final (F&F) Settlement
                </h4>
                <p className="res-policy-section-body">
                  Full and final salary processing, including encashment of accrued leaves and pending reimbursements, is completed within 30 to 45 working days post your last working day, subject to complete clearance from all internal departments.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="res-modal-footer">
              <button
                type="button"
                className="res-btn res-btn-primary"
                onClick={() => setShowPolicyModal(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (isInsideShell) {
    return <div className="res-page-container">{pageBody}</div>;
  }

  return (
    <div className="res-standalone-shell">
      <Sidebar expanded={expanded} setExpanded={setExpanded} />
      <div className="res-standalone-main" style={{ marginLeft: expanded ? 260 : 76 }}>
        {pageBody}
      </div>
    </div>
  );
}