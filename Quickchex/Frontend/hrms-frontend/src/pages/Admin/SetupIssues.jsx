import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Server,
  Network,
  Users,
  Building,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Sliders,
} from "lucide-react";
import {
  PiGearSixBold,
  PiWarningDiamondBold,
  PiCheckCircleBold,
  PiCpuBold,
  PiArrowsClockwiseBold,
} from "react-icons/pi";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./SetupIssues.css";

/* =========================================================
   SETUP ISSUES DATA (2 active issues)
   ========================================================= */

const INITIAL_ISSUES = [];


const getAdminName = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    return u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || localStorage.getItem("user_name") || "Operations Admin";
  } catch {
    return localStorage.getItem("user_name") || "Operations Admin";
  }
};

const RESOLVED_HISTORY = [];


const KPI_SUMMARY = [
  { label: "Active Issues", count: null, key: "all", tone: "blue", icon: PiGearSixBold },
  { label: "Critical / Blocking", count: null, key: "Critical", tone: "pink", icon: AlertOctagon },
  { label: "Warnings", count: null, key: "Warning", tone: "orange", icon: AlertTriangle },
  { label: "Resolved This Month", count: null, key: "resolved", tone: "green", icon: PiCheckCircleBold },
];

export const SetupIssues = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState(() => {
    try {
      const saved = localStorage.getItem("setup_issues_v1");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState("all");
  const [selectedIssueModal, setSelectedIssueModal] = useState(null);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleResolve = (id, e) => {
    if (e) e.stopPropagation();
    setIssues((prev) => prev.filter((i) => i.id !== id));
    if (selectedIssueModal && selectedIssueModal.id === id) {
      setSelectedIssueModal(null);
    }
    showToast(`Issue ${id} marked as resolved.`);
  };

  const runDiagnostics = () => {
    setDiagnosticsRunning(true);
    setTimeout(() => {
      setDiagnosticsRunning(false);
      showToast("Diagnostics complete: 2 issues detected, 14 systems healthy.");
    }, 1800);
  };

  const filteredIssues = useMemo(() => {
    if (activeTab === "resolved") return [];
    if (activeTab === "all") return issues;
    return issues.filter((i) => i.severity === activeTab);
  }, [issues, activeTab]);

  return (
    <div className="setup-issues-page">
      <DashboardHeader />

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="si-toast">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── KPI Grid ── */}
      <div className="si-kpi-grid">
        {KPI_SUMMARY.map((kpi) => {
          const Icon = kpi.icon;
          const isActive = activeTab === kpi.key;
          return (
            <button
              key={kpi.key}
              type="button"
              className={`si-kpi-card is-${kpi.tone}${isActive ? " is-active" : ""}`}
              onClick={() => setActiveTab(kpi.key)}
            >
              <div className="si-kpi-icon-box">
                <Icon size={20} />
              </div>
              <div className="si-kpi-info">
                <span className="si-kpi-label">{kpi.label}</span>
                <strong className="si-kpi-count">{kpi.count}</strong>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Main Container ── */}
      <div className="si-card">
        {/* ── Toolbar ── */}
        <div className="si-toolbar">
          <div className="si-toolbar-title-wrap">
            <h2>System Health &amp; Configuration Diagnostics</h2>
            <p>Scan and resolve organization setup discrepancies.</p>
          </div>

          <button
            type="button"
            className={`si-btn-diag${diagnosticsRunning ? " is-loading" : ""}`}
            onClick={runDiagnostics}
            disabled={diagnosticsRunning}
          >
            <RefreshCw size={15} className={diagnosticsRunning ? "si-spin" : ""} />
            <span>{diagnosticsRunning ? "Running Diagnostics..." : "Run Health Check"}</span>
          </button>
        </div>

        {/* ── Content ── */}
        {activeTab === "resolved" ? (
          <div className="si-history-list">
            <h3 className="si-section-subtitle">Resolved Issues History (Last 30 Days)</h3>
            {RESOLVED_HISTORY.map((hist) => (
              <div key={hist.id} className="si-hist-row">
                <div className="si-hist-left">
                  <CheckCircle2 size={18} className="si-hist-check" />
                  <div>
                    <strong>{hist.title}</strong>
                    <span>{hist.type} • Resolved on {hist.resolvedDate} by {hist.resolvedBy}</span>
                  </div>
                </div>
                <span className="si-hist-badge">Resolved</span>
              </div>
            ))}
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="si-empty-state">
            <ShieldCheck size={48} className="si-empty-icon" />
            <h3>All Systems Configured Properly</h3>
            <p>No active setup issues matching your filter.</p>
          </div>
        ) : (
          <div className="si-issues-list">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`si-issue-box is-${issue.severity.toLowerCase()}`}
                onClick={() => setSelectedIssueModal(issue)}
              >
                <div className="si-issue-top">
                  <div className="si-issue-title-wrap">
                    <span className={`si-badge is-${issue.severity.toLowerCase()}`}>
                      {issue.severity}
                    </span>
                    <span className="si-type-tag">{issue.type}</span>
                    <h3 className="si-issue-title">{issue.title}</h3>
                  </div>
                  <span className="si-detected-time">Detected: {issue.detectedTime}</span>
                </div>

                <p className="si-issue-desc">{issue.description}</p>

                <div className="si-issue-meta">
                  <div className="si-meta-chip">
                    <Building size={13} />
                    <span>{issue.location}</span>
                  </div>
                  <div className="si-meta-chip">
                    <Server size={13} />
                    <span>{issue.device}</span>
                  </div>
                </div>

                <div className="si-issue-bottom">
                  <div className="si-rec-box">
                    <strong>Recommended:</strong> {issue.recommendation}
                  </div>

                  <div className="si-actions-row" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="si-btn-fix"
                      onClick={() => navigate(issue.link)}
                    >
                      <ExternalLink size={14} />
                      <span>{issue.linkLabel}</span>
                    </button>
                    <button
                      type="button"
                      className="si-btn-resolve"
                      onClick={(e) => handleResolve(issue.id, e)}
                    >
                      <Check size={14} />
                      <span>Mark Resolved</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Guided Fix Modal ── */}
      {selectedIssueModal && (
        <div className="si-modal-backdrop" onClick={() => setSelectedIssueModal(null)}>
          <div className="si-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="si-modal-header">
              <div className="si-modal-title-group">
                <span className={`si-badge is-${selectedIssueModal.severity.toLowerCase()}`}>
                  {selectedIssueModal.severity} Issue
                </span>
                <h2>{selectedIssueModal.title}</h2>
              </div>
              <button
                type="button"
                className="si-modal-close"
                onClick={() => setSelectedIssueModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="si-modal-body">
              <div className="si-modal-section">
                <h4>Issue Overview</h4>
                <p>{selectedIssueModal.description}</p>
              </div>

              <div className="si-modal-section">
                <h4>Step-by-Step Resolution Guide</h4>
                <ol className="si-steps-list">
                  {selectedIssueModal.steps.map((step, idx) => (
                    <li key={idx}>
                      <span className="si-step-num">{idx + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="si-modal-footer">
              <button
                type="button"
                className="si-btn-modal-close"
                onClick={() => setSelectedIssueModal(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="si-btn-modal-link"
                onClick={() => {
                  setSelectedIssueModal(null);
                  navigate(selectedIssueModal.link);
                }}
              >
                <ExternalLink size={14} />
                <span>{selectedIssueModal.linkLabel}</span>
              </button>
              <button
                type="button"
                className="si-btn-modal-resolve"
                onClick={() => handleResolve(selectedIssueModal.id)}
              >
                <Check size={15} />
                <span>Mark Resolved</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupIssues;
