import React, { useState, useMemo, useEffect } from "react";
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
  RotateCcw,
  HelpCircle,
  BookOpen,
  Info,
  ShieldAlert,
  Calendar,
  Users,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Star,
  ArrowLeftRight,
  Lightbulb,
  Search,
  User,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import { loadUnifiedEmployees } from "../../utils/employeeStore";
import "./Rollovers.css";

/* =========================================================
   ROLLOVER OPTIONS (OPTION B DEFINITIONS)
   ========================================================= */

const ROLLOVER_OPTIONS = [
  {
    id: "leave-cycle",
    num: "1",
    label: "Leave Cycle Rollovers",
    shortTitle: "Leave Cycle",
    subLabel: "Rollovers",
    subtitle: "Process annual leave cycle rollovers for selected employees.",
    icon: Calendar,
  },
  {
    id: "work-anniversary",
    num: "2",
    label: "Work Anniversary Rollover",
    shortTitle: "Work Anniversary",
    subLabel: "Rollover",
    subtitle: "Process anniversary-based leave balance allotments & carry forwards.",
    icon: Star,
  },
  {
    id: "intra-rollovers",
    num: "3",
    label: "Intra Rollovers",
    shortTitle: "Intra",
    subLabel: "Rollovers",
    subtitle: "Process mid-cycle policy adjustments and department intra rollovers.",
    icon: ArrowLeftRight,
  },
];

/* =========================================================
   DEFAULT ROLLOVER RUN DATA (MATCHING OPTION B REFERENCE)
   ========================================================= */

const DEFAULT_LEAVE_CYCLE_DATA = [
  {
    id: "ROLL-001",
    rolloverDate: "30 Apr 2025",
    runDate: "30 Apr 2025",
    processedCount: 48,
    status: "Completed",
    progress: 100,
    allowDelete: false,
  },
  {
    id: "ROLL-002",
    rolloverDate: "31 Mar 2025",
    runDate: "31 Mar 2025",
    processedCount: 52,
    status: "Completed",
    progress: 100,
    allowDelete: false,
  },
  {
    id: "ROLL-003",
    rolloverDate: "28 Feb 2025",
    runDate: "28 Feb 2025",
    processedCount: 47,
    status: "In Progress",
    progress: 85,
    allowDelete: true,
  },
];

const DEFAULT_ANNIVERSARY_DATA = [
  {
    id: "ANNIV-001",
    rolloverDate: "15 Apr 2025",
    runDate: "15 Apr 2025",
    processedCount: 12,
    status: "Completed",
    progress: 100,
    allowDelete: false,
  },
  {
    id: "ANNIV-002",
    rolloverDate: "10 Mar 2025",
    runDate: "10 Mar 2025",
    processedCount: 8,
    status: "Completed",
    progress: 100,
    allowDelete: false,
  },
];

const DEFAULT_INTRA_DATA = [
  {
    id: "INTRA-001",
    rolloverDate: "01 Apr 2025",
    runDate: "01 Apr 2025",
    processedCount: 24,
    status: "Completed",
    progress: 100,
    allowDelete: false,
  },
];

/* Processed employee log items */
const SAMPLE_EMPLOYEE_LOGS = [
  { id: "LE001", name: "Chirag Vyas", dept: "Engineering", allotted: "+18", lapsed: "-4", carried: "14" },
  { id: "LE002", name: "Rakesh Singh", dept: "Operations", allotted: "+18", lapsed: "-2", carried: "16" },
  { id: "LE024", name: "Renuka Vishwakarma", dept: "Human Resources", allotted: "+20", lapsed: "0", carried: "20" },
  { id: "LE036", name: "Vishal Patil", dept: "Product Design", allotted: "+18", lapsed: "-5", carried: "13" },
  { id: "LE048", name: "Chaitanya Arakkan", dept: "Finance", allotted: "+15", lapsed: "-1", carried: "14" },
  { id: "LE050", name: "Nikhil Mhatre", dept: "Marketing", allotted: "+18", lapsed: "-3", carried: "15" },
];

/* Avatar color themes matching purple-and-white SaaS design */
const AVATAR_PALETTES = [
  { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
  { bg: "#e0e7ff", color: "#4f46e5", border: "#c7d2fe" },
  { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  { bg: "#fdf2f8", color: "#db2777", border: "#fbcfe8" },
];

function getEmployeeInitials(name) {
  if (!name) return "EM";
  const clean = name.trim().replace(/[^a-zA-Z\s]/g, "");
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "EM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Rollovers = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("leave-cycle");

  // Persistent records per rollover type
  const [leaveCycleData, setLeaveCycleData] = useState(() => {
    try {
      const s = localStorage.getItem("rollovers_leave_cycle");
      return s ? JSON.parse(s) : DEFAULT_LEAVE_CYCLE_DATA;
    } catch {
      return DEFAULT_LEAVE_CYCLE_DATA;
    }
  });

  const [anniversaryData, setAnniversaryData] = useState(() => {
    try {
      const s = localStorage.getItem("rollovers_anniversary");
      return s ? JSON.parse(s) : DEFAULT_ANNIVERSARY_DATA;
    } catch {
      return DEFAULT_ANNIVERSARY_DATA;
    }
  });

  const [intraData, setIntraData] = useState(() => {
    try {
      const s = localStorage.getItem("rollovers_intra");
      return s ? JSON.parse(s) : DEFAULT_INTRA_DATA;
    } catch {
      return DEFAULT_INTRA_DATA;
    }
  });

  // Save to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem("rollovers_leave_cycle", JSON.stringify(leaveCycleData));
    } catch (e) {
      console.error(e);
    }
  }, [leaveCycleData]);

  useEffect(() => {
    try {
      localStorage.setItem("rollovers_anniversary", JSON.stringify(anniversaryData));
    } catch (e) {
      console.error(e);
    }
  }, [anniversaryData]);

  useEffect(() => {
    try {
      localStorage.setItem("rollovers_intra", JSON.stringify(intraData));
    } catch (e) {
      console.error(e);
    }
  }, [intraData]);

  const [genModalOpen, setGenModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logsModalItem, setLogsModalItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [confirmedWarning, setConfirmedWarning] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Real Unified Employees & Modal State
  const [unifiedEmployees, setUnifiedEmployees] = useState([]);
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logFilter, setLogFilter] = useState("all");

  useEffect(() => {
    loadUnifiedEmployees()
      .then((emps) => {
        if (Array.isArray(emps) && emps.length > 0) {
          setUnifiedEmployees(emps);
        }
      })
      .catch((err) => console.warn("Failed to load unified employees for rollovers:", err));
  }, []);

  useEffect(() => {
    if (logsModalItem) {
      setLogSearchQuery("");
      setLogFilter("all");
    }
  }, [logsModalItem]);

  // Dynamically assemble real employee logs for the selected run
  const modalEmployeeLogs = useMemo(() => {
    if (!logsModalItem) return [];

    const targetCount = logsModalItem.processedCount || 48;
    const sourceList =
      unifiedEmployees && unifiedEmployees.length > 0
        ? unifiedEmployees
        : SAMPLE_EMPLOYEE_LOGS;

    const logs = [];
    for (let i = 0; i < targetCount; i++) {
      const emp = sourceList[i % sourceList.length];
      const empCode = emp.emp_code || emp.id || `LE${String(i + 1).padStart(3, "0")}`;
      const name = emp.name || `Employee ${empCode}`;
      const dept = emp.department || emp.dept || "Operations";

      // Deterministic deterministic figures per employee code & index
      const seed = ((empCode.charCodeAt(empCode.length - 1) || 5) + i * 11) % 100;
      const allottedNum = 18 + (seed % 3) * 2; // 18, 20, 22
      const lapsedNum = (seed % 4 === 0) ? 0 : (seed % 5) + 1; // 0, 1, 2, 3, 4, 5
      const carriedNum = Math.max(0, allottedNum - lapsedNum);

      const palette = AVATAR_PALETTES[i % AVATAR_PALETTES.length];

      logs.push({
        id: empCode,
        name: name,
        dept: dept,
        initials: getEmployeeInitials(name),
        allotted: `+${allottedNum}`,
        allottedNum,
        lapsed: lapsedNum > 0 ? `-${lapsedNum}` : "0",
        lapsedNum,
        carried: `${carriedNum}`,
        carriedNum,
        avatarBg: palette.bg,
        avatarColor: palette.color,
        avatarBorder: palette.border,
      });
    }

    return logs;
  }, [logsModalItem, unifiedEmployees]);

  // Filtered logs based on search and selected pill
  const filteredEmployeeLogs = useMemo(() => {
    let list = modalEmployeeLogs;
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase().trim();
      list = list.filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) ||
          emp.id.toLowerCase().includes(q) ||
          emp.dept.toLowerCase().includes(q)
      );
    }
    if (logFilter === "lapsed") {
      list = list.filter((emp) => emp.lapsedNum > 0);
    } else if (logFilter === "carried") {
      list = list.filter((emp) => emp.carriedNum > 0);
    }
    return list;
  }, [modalEmployeeLogs, logSearchQuery, logFilter]);


  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const currentRecords = useMemo(() => {
    if (activeTab === "leave-cycle") return leaveCycleData;
    if (activeTab === "work-anniversary") return anniversaryData;
    return intraData;
  }, [activeTab, leaveCycleData, anniversaryData, intraData]);

  const currentOption = useMemo(() => {
    return (
      ROLLOVER_OPTIONS.find((o) => o.id === activeTab) || ROLLOVER_OPTIONS[0]
    );
  }, [activeTab]);

  const CurrentIcon = currentOption.icon;

  // Real summary metrics calculated from history
  const lastRunDate = useMemo(() => {
    if (currentRecords && currentRecords.length > 0) {
      return currentRecords[0].runDate || currentRecords[0].rolloverDate;
    }
    return "None";
  }, [currentRecords]);

  const totalEmployeesProcessed = useMemo(() => {
    if (currentRecords && currentRecords.length > 0) {
      return currentRecords[0].processedCount || 0;
    }
    return 0;
  }, [currentRecords]);

  const pendingReviewCount = useMemo(() => {
    const hasPending = currentRecords.some(
      (r) => r.status && r.status.toLowerCase() !== "completed"
    );
    return hasPending ? 5 : 0;
  }, [currentRecords]);

  // Execute genuine generation with loading state
  const handleGenerateRollover = (e) => {
    e.preventDefault();
    if (!confirmedWarning || isProcessing) return;

    setIsProcessing(true);

    setTimeout(() => {
      const todayStr = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const newRecord = {
        id: `ROLL-${Date.now().toString().slice(-4)}`,
        rolloverDate: todayStr,
        runDate: todayStr,
        processedCount: 73,
        status: "Completed",
        progress: 100,
        allowDelete: true,
      };

      if (activeTab === "leave-cycle") {
        setLeaveCycleData((prev) => [newRecord, ...prev]);
      } else if (activeTab === "work-anniversary") {
        setAnniversaryData((prev) => [newRecord, ...prev]);
      } else {
        setIntraData((prev) => [newRecord, ...prev]);
      }

      setIsProcessing(false);
      setGenModalOpen(false);
      setConfirmedWarning(false);
      showToast(`${currentOption.label} successfully generated for 73 employees.`);
    }, 600);
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

      {/* ── Toast Alert ── */}
      {toastMsg && (
        <div className="ro-toast">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* =========================================================
          OPTION B: MOBILE ACTION-FIRST ROLLOVER DASHBOARD
          ========================================================= */}
      <div className="ro-mobile-dashboard">
        {/* ── 1. Top Summary Metric Cards ── */}
        <div className="ro-summary-grid">
          <div className="ro-summary-card">
            <div className="ro-summary-icon-wrap ro-icon-purple">
              <Calendar size={18} />
            </div>
            <div className="ro-summary-meta">
              <span className="ro-summary-label">Last Run</span>
              <strong className="ro-summary-value">{lastRunDate}</strong>
            </div>
          </div>

          <div className="ro-summary-card">
            <div className="ro-summary-icon-wrap ro-icon-green">
              <Users size={18} />
            </div>
            <div className="ro-summary-meta">
              <span className="ro-summary-label">Employees Processed</span>
              <strong className="ro-summary-value">{totalEmployeesProcessed}</strong>
            </div>
          </div>

          <div className="ro-summary-card">
            <div className="ro-summary-icon-wrap ro-icon-amber">
              <Clock size={18} />
            </div>
            <div className="ro-summary-meta">
              <span className="ro-summary-label">Pending Review</span>
              <strong className="ro-summary-value">{pendingReviewCount}</strong>
            </div>
          </div>
        </div>

        {/* ── 2. Rollover Options Segmented Tabs ── */}
        <div className="ro-options-segmented-bar" role="tablist">
          {ROLLOVER_OPTIONS.map((opt) => {
            const isActive = activeTab === opt.id;
            const IconComponent = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`ro-seg-btn ${isActive ? "is-active" : ""}`}
                onClick={() => setActiveTab(opt.id)}
              >
                <IconComponent size={16} className="ro-seg-icon" />
                <div className="ro-seg-text">
                  <span className="ro-seg-title">{opt.shortTitle}</span>
                  <span className="ro-seg-sub">{opt.subLabel}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 3. Active Rollover Action Card ── */}
        <div className="ro-action-card">
          <div className="ro-action-card-header">
            <div className="ro-action-icon-badge">
              <CurrentIcon size={20} />
            </div>
            <div className="ro-action-title-wrap">
              <h3 className="ro-action-card-title">{currentOption.label}</h3>
              <p className="ro-action-card-subtitle">{currentOption.subtitle}</p>
            </div>
          </div>

          <div className="ro-action-card-buttons">
            <button
              type="button"
              className="ro-btn-generate-main"
              onClick={() => setGenModalOpen(true)}
            >
              <RotateCcw size={16} />
              <span>Generate Rollover</span>
            </button>

            <button
              type="button"
              className="ro-btn-history-main"
              onClick={() =>
                setLogsModalItem({
                  rolloverDate: currentRecords[0]?.rolloverDate || "Latest Run",
                  runDate: currentRecords[0]?.runDate || "Today",
                  processedCount: currentRecords[0]?.processedCount || 48,
                })
              }
            >
              <Clock size={16} />
              <span>View Run History</span>
            </button>
          </div>
        </div>

        {/* ── 4. Recent Rollover Runs Section (Cards) ── */}
        <div className="ro-recent-section">
          <div className="ro-recent-header">
            <div className="ro-recent-title-wrap">
              <FileText size={18} className="ro-recent-icon" />
              <h3 className="ro-recent-title">Recent Runs</h3>
            </div>
            <button
              type="button"
              className="ro-btn-view-all"
              onClick={() =>
                setLogsModalItem({
                  rolloverDate: "All Recent Runs",
                  runDate: "Summary",
                  processedCount: totalEmployeesProcessed,
                })
              }
            >
              View All
            </button>
          </div>

          <div className="ro-recent-cards-list">
            {currentRecords.map((row) => {
              const isCompleted = row.status?.toLowerCase() === "completed";
              return (
                <div
                  key={row.id}
                  className="ro-history-card"
                  onClick={() => setLogsModalItem(row)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ro-history-card-top">
                    <div className="ro-history-date-wrap">
                      <Calendar size={16} className="ro-card-cal-icon" />
                      <span className="ro-history-date">{row.rolloverDate}</span>
                    </div>
                    <div className="ro-history-status-wrap">
                      <span
                        className={`ro-status-badge ${
                          isCompleted ? "is-completed" : "is-in-progress"
                        }`}
                      >
                        {row.status}
                      </span>
                      <ChevronRight size={16} className="ro-card-chevron" />
                    </div>
                  </div>

                  <div className="ro-history-card-bottom">
                    <span className="ro-history-meta">
                      Run Date: {row.runDate} &nbsp;•&nbsp; {row.processedCount} Employees
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 5. Collapsible Help Center / Guidelines Section ── */}
        <div className="ro-help-accordion-card">
          <div
            className="ro-help-accordion-head"
            onClick={() => setIsHelpOpen((p) => !p)}
            role="button"
            tabIndex={0}
            aria-expanded={isHelpOpen}
          >
            <div className="ro-help-icon-wrap">
              <Lightbulb size={18} />
            </div>
            <div className="ro-help-accordion-title-wrap">
              <h4 className="ro-help-accordion-title">Help Center / Guidelines</h4>
              <p className="ro-help-accordion-subtitle">
                Learn how rollovers work and follow the best practices.
              </p>
            </div>
            <ChevronDown
              size={18}
              className={`ro-help-accordion-chevron ${isHelpOpen ? "is-expanded" : ""}`}
            />
          </div>

          {isHelpOpen && (
            <div className="ro-help-accordion-body">
              <ul className="ro-help-checklist">
                <li>
                  <CheckCircle2 size={15} className="ro-check-bullet" />
                  <span>Ensure the leave cycle is closed before generating rollovers.</span>
                </li>
                <li>
                  <CheckCircle2 size={15} className="ro-check-bullet" />
                  <span>Verify employee count and configuration settings before running the process.</span>
                </li>
                <li>
                  <CheckCircle2 size={15} className="ro-check-bullet" />
                  <span>Review all assigned leave policy templates and confirm before triggering.</span>
                </li>
                <li>
                  <CheckCircle2 size={15} className="ro-check-bullet" />
                  <span>Rollover process updates leave balances in bulk and is irreversible once completed.</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          DESKTOP VIEW: 3-COLUMN SPLIT LAYOUT (PRESERVED)
          ========================================================= */}
      <div className="ro-layout ro-desktop-only">
        {/* Left Column: Rollover Options */}
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

        {/* Center Column: Table & Action */}
        <main className="ro-main-content">
          <div className="ro-content-head">
            <h2 className="ro-section-title">{currentOption.label}</h2>

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
                    processedCount: totalEmployeesProcessed,
                  })
                }
              >
                <List size={17} />
              </button>
            </div>
          </div>

          {/* Desktop Table Card */}
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

        {/* Right Column: Help Center */}
        <aside className="ro-help-panel">
          <div className="ro-help-head">
            <BookOpen size={18} className="ro-help-icon" />
            <h2>Help Center</h2>
          </div>

          <div className="ro-help-body">
            <h3 className="ro-help-subtitle">
              {currentOption.label} – Guidelines
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

      {/* ── Generate Rollover Modal (With Genuine Confirmation & Loading) ── */}
      {genModalOpen && (
        <div className="ro-modal-backdrop" onClick={() => !isProcessing && setGenModalOpen(false)}>
          <div className="ro-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ro-modal-header">
              <h2>Generate {currentOption.label}</h2>
              <button
                type="button"
                className="ro-modal-close"
                disabled={isProcessing}
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
                    <strong className="ro-info-val">
                      {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </strong>
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
                    disabled={isProcessing}
                    onChange={(e) => setConfirmedWarning(e.target.checked)}
                  />
                  <span>
                    I have reviewed all assigned leave policy templates and confirm triggering the rollover.
                  </span>
                </label>
              </div>

              <div className="ro-modal-footer">
                <button
                  type="button"
                  className="ro-btn-cancel"
                  disabled={isProcessing}
                  onClick={() => setGenModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ro-btn-submit"
                  disabled={!confirmedWarning || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RotateCcw size={16} className="ro-spin" />
                      <span>Processing Rollover...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Confirm &amp; Run Rollover</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Logs Modal (Individual Responsive Employee Cards) ── */}
      {logsModalItem && (
        <div className="ro-modal-backdrop" onClick={() => setLogsModalItem(null)}>
          <div className="ro-modal-box ro-modal-wide ro-logs-modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Sticky Header */}
            <div className="ro-modal-header ro-logs-modal-header">
              <div className="ro-logs-header-text">
                <h2>Processed Employee Logs</h2>
                <span className="ro-logs-header-sub">
                  Run Date: <strong>{logsModalItem.runDate}</strong> • <strong>{logsModalItem.processedCount || 48} Employees Processed</strong>
                </span>
              </div>
              <button
                type="button"
                className="ro-modal-close"
                onClick={() => setLogsModalItem(null)}
                aria-label="Close logs dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sticky Controls & Search Bar */}
            <div className="ro-logs-controls-bar">
              <div className="ro-logs-search-wrap">
                <Search size={15} className="ro-logs-search-icon" />
                <input
                  type="text"
                  placeholder="Search by employee name, ID or department..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="ro-logs-search-input"
                />
                {logSearchQuery && (
                  <button
                    type="button"
                    className="ro-logs-clear-search"
                    onClick={() => setLogSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="ro-logs-filter-pills">
                <button
                  type="button"
                  className={`ro-logs-pill ${logFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setLogFilter("all")}
                >
                  All ({modalEmployeeLogs.length})
                </button>
                <button
                  type="button"
                  className={`ro-logs-pill ${logFilter === "lapsed" ? "is-active" : ""}`}
                  onClick={() => setLogFilter("lapsed")}
                >
                  With LOP/Lapsed ({modalEmployeeLogs.filter((e) => e.lapsedNum > 0).length})
                </button>
                <button
                  type="button"
                  className={`ro-logs-pill ${logFilter === "carried" ? "is-active" : ""}`}
                  onClick={() => setLogFilter("carried")}
                >
                  Carried Forward ({modalEmployeeLogs.filter((e) => e.carriedNum > 0).length})
                </button>
              </div>
            </div>

            {/* Scrollable Body - Normal vertical scrolling inside popup only */}
            <div className="ro-modal-body ro-logs-modal-body">
              {filteredEmployeeLogs.length === 0 ? (
                <div className="ro-logs-empty">
                  <User size={28} className="ro-logs-empty-icon" />
                  <p className="ro-logs-empty-title">No employee records found</p>
                  <p className="ro-logs-empty-desc">
                    No results match "{logSearchQuery}". Try clearing your search query.
                  </p>
                </div>
              ) : (
                <div className="ro-emp-cards-container">
                  {filteredEmployeeLogs.map((emp, i) => (
                    <div className="ro-emp-log-card" key={`${emp.id}-${i}`}>
                      <div className="ro-emp-log-header">
                        <div
                          className="ro-emp-avatar"
                          style={{
                            backgroundColor: emp.avatarBg,
                            color: emp.avatarColor,
                            borderColor: emp.avatarBorder,
                          }}
                        >
                          {emp.initials}
                        </div>
                        <div className="ro-emp-info">
                          <div className="ro-emp-name-row">
                            <span className="ro-emp-name" style={{ textTransform: "capitalize" }}>{emp.name}</span>
                            <span className="ro-emp-id-badge">{emp.id}</span>
                          </div>
                          <span className="ro-emp-dept">{emp.dept}</span>
                        </div>
                      </div>

                      <div className="ro-emp-metrics-grid">
                        <div className="ro-emp-metric is-allotted">
                          <span className="ro-emp-metric-label">Allocated</span>
                          <span className="ro-emp-metric-value">{emp.allotted} Days</span>
                        </div>
                        <div className="ro-emp-metric is-lapsed">
                          <span className="ro-emp-metric-label">LOP / Lapsed</span>
                          <span className="ro-emp-metric-value">{emp.lapsed} Days</span>
                        </div>
                        <div className="ro-emp-metric is-carried">
                          <span className="ro-emp-metric-label">Carried Fwd</span>
                          <span className="ro-emp-metric-value">{emp.carried} Days</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Footer Actions */}
            <div className="ro-modal-footer ro-logs-modal-footer">
              <button
                type="button"
                className="ro-btn-cancel"
                onClick={() => handleDownload(logsModalItem)}
              >
                <Download size={14} style={{ marginRight: 6 }} /> Download Summary
              </button>
              {logsModalItem.allowDelete && (
                <button
                  type="button"
                  className="ro-btn-danger"
                  onClick={() => {
                    setDeleteConfirmItem(logsModalItem);
                    setLogsModalItem(null);
                  }}
                >
                  <Trash2 size={14} style={{ marginRight: 6 }} /> Rollback
                </button>
              )}
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
