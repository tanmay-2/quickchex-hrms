import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Check,
  Download,
  List,
  Trash2,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock,
  X,
  Plus,
  RefreshCw,
  HelpCircle,
  BookOpen,
  Info,
  ShieldAlert,
  Calendar,
  Users,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  PiGearBold,
  PiDownloadSimpleBold,
  PiListDashesBold,
  PiTrashBold,
  PiCheckBold,
  PiBookOpenBold,
  PiArrowsCounterClockwiseBold,
  PiCalendarCheckBold,
  PiWarningCircleBold,
  PiPrinterBold,
} from "react-icons/pi";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./Rollovers.css";

/* =========================================================
   ROLLOVER OPTIONS (Matching Reference)
   ========================================================= */

const ROLLOVER_OPTIONS = [
  { id: "leave-cycle", num: "1", label: "Leave Cycle Rollovers" },
  { id: "work-anniversary", num: "2", label: "Work Anniversary Rollover" },
  { id: "intra-rollovers", num: "3", label: "Intra Rollovers" },
];

/* =========================================================
   DEMO ROLLOVER RECORDS DATA (Matching Reference)
   ========================================================= */

const INITIAL_LEAVE_CYCLE_DATA = [];

const ANNIVERSARY_DATA = [];

const INTRA_ROLLOVER_DATA = [];

/* Processed employee log items */
const SAMPLE_EMPLOYEE_LOGS = [];


export const Rollovers = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("leave-cycle");
  const [leaveCycleData, setLeaveCycleData] = useState(() => {
    try { const s = localStorage.getItem("rollovers_leave_cycle"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [anniversaryData, setAnniversaryData] = useState(() => {
    try { const s = localStorage.getItem("rollovers_anniversary"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [intraData, setIntraData] = useState(() => {
    try { const s = localStorage.getItem("rollovers_intra"); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const [genModalOpen, setGenModalOpen] = useState(false);
  const [logsModalItem, setLogsModalItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [confirmedWarning, setConfirmedWarning] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const currentRecords = useMemo(() => {
    if (activeTab === "leave-cycle") return leaveCycleData;
    if (activeTab === "work-anniversary") return anniversaryData;
    return intraData;
  }, [activeTab, leaveCycleData, anniversaryData, intraData]);

  const currentTitle = useMemo(() => {
    const item = ROLLOVER_OPTIONS.find((o) => o.id === activeTab);
    return item ? item.label : "Leave Cycle Rollover";
  }, [activeTab]);

  const handleGenerateRollover = (e) => {
    e.preventDefault();
    if (!confirmedWarning) return;

    const newRecord = {
      id: `ROLL-${Date.now().toString().slice(-4)}`,
      rolloverDate: "01-04-2027",
      runDate: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
      processedCount: 73,
      status: "Completed",
      progress: 100,
      allowDelete: true,
    };

    if (activeTab === "leave-cycle") {
      setLeaveCycleData((prev) => [...prev, newRecord]);
    } else if (activeTab === "work-anniversary") {
      setAnniversaryData((prev) => [...prev, newRecord]);
    } else {
      setIntraData((prev) => [...prev, newRecord]);
    }

    setGenModalOpen(false);
    setConfirmedWarning(false);
    showToast(`Leave cycle rollover successfully generated for 73 employees.`);
  };

  const handleDeleteRecord = (id) => {
    if (activeTab === "leave-cycle") {
      setLeaveCycleData((prev) => prev.filter((r) => r.id !== id));
    } else if (activeTab === "work-anniversary") {
      setAnniversaryData((prev) => prev.filter((r) => r.id !== id));
    } else {
      setIntraData((prev) => prev.filter((r) => r.id !== id));
    }
    setDeleteConfirmItem(null);
    showToast(`Rollover record ${id} removed.`);
  };

  const handleDownload = (record) => {
    showToast(`Downloading rollover summary report for ${record.rolloverDate}...`);
  };

  return (
    <div className="rollovers-page">
      <DashboardHeader />

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="ro-toast">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── 3-Column Split Layout (Matching Reference) ── */}
      <div className="ro-layout">
        {/* ═════════════════════════════════════════════════════════
            LEFT COLUMN: Rollover Options
            ═════════════════════════════════════════════════════════ */}
        <aside className="ro-options-panel">
          <div className="ro-options-head">
            <Settings size={18} className="ro-settings-icon" />
            <h2>Rollover Options</h2>
          </div>

          <nav className="ro-nav-list" aria-label="Rollover Options">
            {ROLLOVER_OPTIONS.map((opt) => {
              const isActive = activeTab === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`ro-nav-item${isActive ? " is-active" : ""}`}
                  onClick={() => setActiveTab(opt.id)}
                >
                  <span>
                    {opt.num}. {opt.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ═════════════════════════════════════════════════════════
            CENTER COLUMN: Leave Cycle Rollover Table & Action
            ═════════════════════════════════════════════════════════ */}
        <main className="ro-main-content">
          <div className="ro-content-head">
            <h2 className="ro-section-title">{currentTitle}</h2>

            <div className="ro-head-actions">
              <button
                type="button"
                className="ro-btn-generate"
                onClick={() => setGenModalOpen(true)}
              >
                <Check size={16} />
                <span>Generate Rollover</span>
              </button>

              <button
                type="button"
                className="ro-btn-logs-toggle"
                title="View All Audit Logs"
                aria-label="View All Audit Logs"
                onClick={() =>
                  setLogsModalItem({
                    rolloverDate: "Latest Run",
                    runDate: "Today",
                    processedCount: 61,
                  })
                }
              >
                <List size={17} />
              </button>
            </div>
          </div>

          {/* Main Table Card */}
          <div className="ro-table-card">
            <div className="ro-table-scroll">
              <table className="ro-table">
                <thead>
                  <tr>
                    <th>Rollover Date</th>
                    <th>Run Date</th>
                    <th>No Of Employees Processed</th>
                    <th>Status</th>
                    <th className="ro-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="ro-date-text">{row.rolloverDate}</span>
                      </td>
                      <td>
                        <span className="ro-date-text">{row.runDate}</span>
                      </td>
                      <td>
                        <span className="ro-count-text">{row.processedCount}</span>
                      </td>
                      <td>
                        <div className="ro-status-cell">
                          <span className="ro-status-label">{row.status}</span>
                          <div className="ro-progress-track">
                            <div
                              className="ro-progress-fill"
                              style={{ width: `${row.progress}%` }}
                            >
                              <span>{row.progress}%</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="ro-td-actions">
                        <div className="ro-actions-group">
                          <button
                            type="button"
                            className="ro-action-btn ro-btn-download"
                            title="Download Report"
                            aria-label={`Download Report for ${row.rolloverDate}`}
                            onClick={() => handleDownload(row)}
                          >
                            <Download size={14} />
                          </button>

                          {row.allowDelete && (
                            <button
                              type="button"
                              className="ro-action-btn ro-btn-delete"
                              title="Rollback / Delete Rollover"
                              aria-label={`Delete record ${row.id}`}
                              onClick={() => setDeleteConfirmItem(row)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="ro-action-btn ro-btn-list"
                            title="View Processed Details"
                            aria-label={`View details for ${row.rolloverDate}`}
                            onClick={() => setLogsModalItem(row)}
                          >
                            <List size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* ═════════════════════════════════════════════════════════
            RIGHT COLUMN: Help Center Guidelines (Matching Reference)
            ═════════════════════════════════════════════════════════ */}
        <aside className="ro-help-panel">
          <div className="ro-help-head">
            <BookOpen size={18} className="ro-help-icon" />
            <h2>Help Center</h2>
          </div>

          <div className="ro-help-body">
            <h3 className="ro-help-subtitle">
              Leave Cycle Rollover – Guidelines
            </h3>

            <ul className="ro-help-list">
              <li>
                The Leave Cycle Rollover should be run only at the end of your annual leave cycle.
              </li>
              <li>
                Once triggered, it will allot &amp; lapse leaves to all active employees based on the settings defined in their assigned leave templates.
              </li>
              <li>
                This process updates the leave balances in bulk and is irreversible once completed.
              </li>
              <li>
                It is recommended to review all settings before running the rollover.
              </li>
              <li>
                To proceed, click on Generate Rollover, review the warning, and then click Confirm to complete the process.
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* ── Generate Rollover Modal (With Warning / Confirmation) ── */}
      {genModalOpen && (
        <div className="ro-modal-backdrop" onClick={() => setGenModalOpen(false)}>
          <div className="ro-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ro-modal-header">
              <h2>Generate Leave Cycle Rollover</h2>
              <button
                type="button"
                className="ro-modal-close"
                onClick={() => setGenModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateRollover}>
              <div className="ro-modal-body">
                <div className="ro-modal-info-row">
                  <div className="ro-info-card">
                    <span className="ro-info-label">Effective Rollover Date</span>
                    <strong className="ro-info-val">01 April 2027</strong>
                  </div>
                  <div className="ro-info-card">
                    <span className="ro-info-label">Active Employees</span>
                    <strong className="ro-info-val">73 Staff Members</strong>
                  </div>
                </div>

                <div className="ro-warning-box">
                  <AlertTriangle size={20} className="ro-warning-icon" />
                  <div>
                    <strong>Irreversible Operation Warning</strong>
                    <p>
                      Running this rollover will update the leave balances in bulk for all active employees based on assigned templates. Any unused non-encashable leaves will be lapsed.
                    </p>
                  </div>
                </div>

                <label className="ro-confirm-checkbox">
                  <input
                    type="checkbox"
                    checked={confirmedWarning}
                    onChange={(e) => setConfirmedWarning(e.target.checked)}
                  />
                  <span>
                    I have reviewed all assigned leave policy templates and confirm triggering the annual cycle rollover.
                  </span>
                </label>
              </div>

              <div className="ro-modal-footer">
                <button
                  type="button"
                  className="ro-btn-cancel"
                  onClick={() => setGenModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ro-btn-submit"
                  disabled={!confirmedWarning}
                >
                  <Check size={16} />
                  <span>Confirm &amp; Run Rollover</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Logs Modal ── */}
      {logsModalItem && (
        <div className="ro-modal-backdrop" onClick={() => setLogsModalItem(null)}>
          <div className="ro-modal-box ro-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="ro-modal-header">
              <h2>Processed Employee Logs — {logsModalItem.rolloverDate}</h2>
              <button
                type="button"
                className="ro-modal-close"
                onClick={() => setLogsModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ro-modal-body">
              <div className="ro-log-summary">
                <span>Run Date: <strong>{logsModalItem.runDate}</strong></span>
                <span>Total Processed: <strong>{logsModalItem.processedCount || 61} Employees</strong></span>
              </div>

              <div className="ro-log-table-wrap">
                <table className="ro-log-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Allotted</th>
                      <th>Lapsed</th>
                      <th>Carried Forward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_EMPLOYEE_LOGS.map((emp, i) => (
                      <tr key={i}>
                        <td>
                          <strong>{emp.name}</strong>
                          <span className="ro-log-meta">{emp.id} • {emp.dept}</span>
                        </td>
                        <td><span className="ro-badge-allot">{emp.allotted}</span></td>
                        <td><span className="ro-badge-lapse">{emp.lapsed}</span></td>
                        <td><span className="ro-badge-carry">{emp.carried}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ro-modal-footer">
              <button
                type="button"
                className="ro-btn-submit"
                onClick={() => setLogsModalItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmItem && (
        <div className="ro-modal-backdrop" onClick={() => setDeleteConfirmItem(null)}>
          <div className="ro-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ro-modal-header">
              <h2>Rollback / Delete Rollover Run</h2>
              <button
                type="button"
                className="ro-modal-close"
                onClick={() => setDeleteConfirmItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ro-modal-body">
              <p>
                Are you sure you want to rollback and delete the rollover record for <strong>{deleteConfirmItem.rolloverDate}</strong>?
              </p>
            </div>

            <div className="ro-modal-footer">
              <button
                type="button"
                className="ro-btn-cancel"
                onClick={() => setDeleteConfirmItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ro-btn-danger"
                onClick={() => handleDeleteRecord(deleteConfirmItem.id)}
              >
                <Trash2 size={15} />
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rollovers;
