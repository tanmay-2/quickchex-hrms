import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Check,
  X,
  Eye,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  Building,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import {
  PiWarningCircleBold,
  PiShieldWarningBold,
  PiClockBold,
  PiArrowsClockwiseBold,
  PiSparkleBold,
} from "react-icons/pi";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./ProcessAlerts.css";

/* =========================================================
   SAMPLE PROCESS ALERTS (28 total)
   ========================================================= */


const INITIAL_ALERTS = [];


const SEVERITY_CARDS = [
  { label: "All Process Alerts", count: null, key: "all", tone: "purple", icon: PiWarningCircleBold },
  { label: "High Severity", count: null, key: "High", tone: "pink", icon: ShieldAlert },
  { label: "Medium Severity", count: null, key: "Medium", tone: "orange", icon: AlertTriangle },
  { label: "Low Severity", count: null, key: "Low", tone: "blue", icon: AlertCircle },
];

export const ProcessAlerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem("process_alerts_v1");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedModalAlert, setSelectedModalAlert] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleResolveAlert = (id, e) => {
    if (e) e.stopPropagation();
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (selectedModalAlert && selectedModalAlert.id === id) {
      setSelectedModalAlert(null);
    }
    showToast(`Alert ${id} resolved successfully.`);
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      if (selectedSeverity !== "all" && item.severity !== selectedSeverity) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [alerts, selectedSeverity, categoryFilter, searchQuery]);

  return (
    <div className="process-alerts-page">
      <DashboardHeader />

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="pa-toast">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Severity Cards ── */}
      <div className="pa-kpi-grid">
        {SEVERITY_CARDS.map((card) => {
          const Icon = card.icon;
          const isActive = selectedSeverity === card.key;
          return (
            <button
              key={card.key}
              type="button"
              className={`pa-kpi-card is-${card.tone}${isActive ? " is-active" : ""}`}
              onClick={() => setSelectedSeverity(card.key)}
            >
              <div className="pa-kpi-icon-box">
                <Icon size={20} />
              </div>
              <div className="pa-kpi-info">
                <span className="pa-kpi-label">{card.label}</span>
                <strong className="pa-kpi-count">{card.count}</strong>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Main Container ── */}
      <div className="pa-card">
        {/* ── Toolbar ── */}
        <div className="pa-toolbar">
          <div className="pa-search-wrap">
            <input
              type="text"
              className="pa-search-input"
              placeholder="Search alerts by title, description or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="pa-clear-search"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="pa-filter-wrap">
            <select
              className="pa-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="Attendance">Attendance</option>
              <option value="Roster">Roster</option>
              <option value="Policy">Policy</option>
              <option value="Regularization">Regularization</option>
              <option value="System">System</option>
              <option value="Hardware">Hardware</option>
            </select>
          </div>
        </div>

        {/* ── Alert List ── */}
        <div className="pa-list">
          {filteredAlerts.length === 0 ? (
            <div className="pa-empty-state">
              <CheckCircle2 size={40} className="pa-empty-icon" />
              <h3>All Alerts Clear!</h3>
              <p>No active process alerts matching your current filter selection.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`pa-alert-card is-${alert.severity.toLowerCase()}`}
                onClick={() => setSelectedModalAlert(alert)}
              >
                <div className="pa-alert-top">
                  <div className="pa-alert-title-wrap">
                    <span className={`pa-sev-badge is-${alert.severity.toLowerCase()}`}>
                      {alert.severity}
                    </span>
                    <span className="pa-cat-badge">{alert.category}</span>
                    <h3 className="pa-alert-title">{alert.title}</h3>
                  </div>
                  <span className="pa-alert-time">{alert.time}</span>
                </div>

                <p className="pa-alert-desc">{alert.description}</p>

                <div className="pa-alert-bottom">
                  <div className="pa-alert-meta">
                    <span className="pa-meta-item">
                      <Users size={14} />
                      <strong>{alert.affectedCount}</strong> affected
                    </span>
                    <span className="pa-meta-item">
                      <Building size={14} />
                      {alert.department}
                    </span>
                  </div>

                  <div className="pa-alert-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="pa-btn-details"
                      onClick={() => setSelectedModalAlert(alert)}
                    >
                      <Eye size={14} />
                      <span>View Records</span>
                    </button>
                    <button
                      type="button"
                      className="pa-btn-resolve"
                      onClick={(e) => handleResolveAlert(alert.id, e)}
                    >
                      <Check size={14} />
                      <span>Resolve Alert</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selectedModalAlert && (
        <div className="pa-modal-backdrop" onClick={() => setSelectedModalAlert(null)}>
          <div className="pa-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pa-modal-header">
              <div className="pa-modal-title-group">
                <span className={`pa-sev-badge is-${selectedModalAlert.severity.toLowerCase()}`}>
                  {selectedModalAlert.severity} Severity
                </span>
                <h2>{selectedModalAlert.title}</h2>
              </div>
              <button
                type="button"
                className="pa-modal-close"
                onClick={() => setSelectedModalAlert(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pa-modal-body">
              <div className="pa-modal-section">
                <h4>Description & Impact</h4>
                <p>{selectedModalAlert.description}</p>
                <div className="pa-impact-box">
                  <strong>Impact:</strong> {selectedModalAlert.impact}
                </div>
              </div>

              <div className="pa-modal-section">
                <h4>Recommended Action</h4>
                <div className="pa-action-box">
                  <PiSparkleBold size={16} />
                  <span>{selectedModalAlert.suggestedAction}</span>
                </div>
              </div>

              <div className="pa-modal-section">
                <h4>Affected Records ({selectedModalAlert.records.length})</h4>
                <div className="pa-records-table">
                  {selectedModalAlert.records.map((r, i) => (
                    <div key={i} className="pa-record-row">
                      <div className="pa-record-emp">
                        <strong>{r.name}</strong>
                        <span>{r.id} • {r.dept}</span>
                      </div>
                      <span className="pa-record-date">{r.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pa-modal-footer">
              <button
                type="button"
                className="pa-btn-modal-close"
                onClick={() => setSelectedModalAlert(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="pa-btn-modal-resolve"
                onClick={() => handleResolveAlert(selectedModalAlert.id)}
              >
                <Check size={15} />
                <span>Mark Alert Resolved</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessAlerts;
