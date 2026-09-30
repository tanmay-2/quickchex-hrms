import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  RefreshCw,
  SlidersHorizontal,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  Layers,
  Sparkles,
  FileDown,
} from "lucide-react";
import {
  PiFileTextBold,
  PiTableBold,
  PiDownloadSimpleBold,
  PiArrowsClockwiseBold,
  PiFunnelBold,
  PiMagnifyingGlassBold,
  PiCheckCircleBold,
  PiClockBold,
  PiGearBold,
  PiChartBarBold,
  PiCalendarCheckBold,
  PiShieldCheckBold,
  PiUsersBold,
} from "react-icons/pi";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./Reports.css";

/* =========================================================
   DETAILS LIST ITEMS
   ========================================================= */

const DETAILS_LIST = [
  { id: "import-export", num: "1", label: "Import Export" },
  { id: "reports-generation", num: "2", label: "Reports Generation" },
  { id: "audit-reports", num: "3", label: "Audit Reports" },
  { id: "leave-reports", num: "4", label: "Leave Reports" },
  { id: "attendance-reports", num: "5", label: "Attendance Reports" },
  { id: "custom-reports", num: "6", label: "Custom Reports" },
  { id: "hr-reports", num: "7", label: "HR Reports" },
  { id: "timesheet-reports", num: "8", label: "Timesheet Reports" },
];

/* =========================================================
   SAMPLE IMPORT/EXPORT DATA (Matching reference structure)
   ========================================================= */

const INITIAL_IMPORT_EXPORT_DATA = [
  {
    id: "REP-901",
    name: "Biometric Logs Download",
    period: "June-2026",
    generatedAt: "09-07-2026 - 15:59:20 IST",
    generatedBy: "Renuka Vishwakarma",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "2.4 MB",
  },
  {
    id: "REP-902",
    name: "Biometric Logs Download",
    period: "April-2026",
    generatedAt: "16-05-2026 - 16:31:39 IST",
    generatedBy: "Renuka Vishwakarma",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "2.1 MB",
  },
  {
    id: "REP-903",
    name: "Biometric Logs Download",
    period: "March-2026",
    generatedAt: "20-03-2026 - 17:19:44 IST",
    generatedBy: "Renuka Vishwakarma",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "1.9 MB",
  },
  {
    id: "REP-904",
    name: "Biometric Logs Download",
    period: "June-2025",
    generatedAt: "14-03-2026 - 17:25:55 IST",
    generatedBy: "Renuka Vishwakarma",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "3.2 MB",
  },
  {
    id: "REP-905",
    name: "Biometric Logs Download",
    period: "July-2025",
    generatedAt: "14-03-2026 - 17:25:40 IST",
    generatedBy: "Renuka Vishwakarma",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "3.0 MB",
  },
  {
    id: "REP-906",
    name: "Biometric Logs Download",
    period: "January-2026",
    generatedAt: "07-02-2026 - 12:29:11 IST",
    generatedBy: "Renuka Vishwakarma",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "2.6 MB",
  },
  {
    id: "REP-907",
    name: "Biometric Logs Download",
    period: "January-2026",
    generatedAt: "07-02-2026 - 02:09:40 IST",
    generatedBy: "Renuka Vishwakarma",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "2.5 MB",
  },
  {
    id: "REP-908",
    name: "Biometric Logs Download",
    period: "January-2026",
    generatedAt: "06-02-2026 - 13:37:06 IST",
    generatedBy: "Renuka Vishwakarma",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "2.7 MB",
  },
  {
    id: "REP-909",
    name: "Biometric Logs Download",
    period: "November-2025",
    generatedAt: "19-01-2026 - 15:13:47 IST",
    generatedBy: "Renuka Vishwakarma",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "2.2 MB",
  },
  {
    id: "REP-910",
    name: "Biometric Logs Download",
    period: "October-2025",
    generatedAt: "19-01-2026 - 15:13:35 IST",
    generatedBy: "Renuka Vishwakarma",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "2.3 MB",
  },
  {
    id: "REP-911",
    name: "Monthly Attendance Summary Export",
    period: "August-2026",
    generatedAt: "01-09-2026 - 09:12:00 IST",
    generatedBy: "Aaquib Khan",
    type: "Export",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "1.4 MB",
  },
  {
    id: "REP-912",
    name: "Employee Shift Roster Sync",
    period: "August-2026",
    generatedAt: "28-08-2026 - 11:30:15 IST",
    generatedBy: "System Scheduler",
    type: "Import",
    status: "Completed",
    progress: 100,
    fileFormat: "CSV",
    size: "820 KB",
  },
];

/* Alternate reports data for other sections */
const SECTION_DESCRIPTIONS = {
  "import-export": "Historical data exports, biometric downloads, and system sync archives.",
  "reports-generation": "Create custom operational and statutory reports with flexible filters.",
  "audit-reports": "Security, login authentication, and administrative access audit trails.",
  "leave-reports": "Leave utilization ratios, balances, and department leave ledgers.",
  "attendance-reports": "Daily punch summaries, punctuality deviations, and overtime records.",
  "custom-reports": "Build and schedule parameterized ad-hoc organizational reports.",
  "hr-reports": "Headcount distribution, turnover rates, and employee demographics.",
  "timesheet-reports": "Billable hours, project task breakdowns, and client timesheets.",
};

export const Reports = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("import-export");
  const [data, setData] = useState(INITIAL_IMPORT_EXPORT_DATA);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // New Report Generator modal state
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genForm, setGenForm] = useState({
    name: "Biometric Logs Download",
    period: "August-2026",
    format: "XLSX",
    type: "Export",
  });

  const PAGE_SIZE = 10;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Report records refreshed.");
    }, 600);
  };

  const handleDownload = (item) => {
    showToast(`Downloading "${item.name}_${item.period}.${item.fileFormat.toLowerCase()}"...`);
  };

  const handleGenerateReport = (e) => {
    e.preventDefault();
    const newReport = {
      id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: genForm.name,
      period: genForm.period,
      generatedAt: `${new Date().toLocaleDateString("en-GB")} - ${new Date().toLocaleTimeString("en-GB")} IST`,
      generatedBy: (() => {
        try {
          const u = JSON.parse(localStorage.getItem("user") || "{}");
          return u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || localStorage.getItem("user_name") || "Admin User";
        } catch {
          return localStorage.getItem("user_name") || "Admin User";
        }
      })(),
      type: genForm.type,
      status: "Completed",
      progress: 100,
      fileFormat: genForm.format,
      size: "1.8 MB",
    };
    setData((prev) => [newReport, ...prev]);
    setGenModalOpen(false);
    showToast(`Report "${genForm.name}" generated successfully.`);
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.name.toLowerCase().includes(q) ||
          item.period.toLowerCase().includes(q) ||
          item.generatedBy.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [data, typeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const currentSectionObj =
    DETAILS_LIST.find((item) => item.id === activeSection) || DETAILS_LIST[0];

  return (
    <div className="reports-page">
      <DashboardHeader />

      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className="rep-toast">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Main 2-Column Split Layout ── */}
      <div className="rep-layout">
        {/* ═════════════════════════════════════════════════════════
            LEFT COLUMN: Details List (Matching Reference)
            ═════════════════════════════════════════════════════════ */}
        <aside className="rep-details-panel">
          <div className="rep-details-header">
            <Settings size={18} className="rep-settings-icon" />
            <h2>Details List</h2>
          </div>

          <nav className="rep-nav-list" aria-label="Report sections">
            {DETAILS_LIST.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`rep-nav-item${isActive ? " is-active" : ""}`}
                  onClick={() => {
                    setActiveSection(item.id);
                    setCurrentPage(1);
                  }}
                >
                  <span className="rep-nav-text">
                    {item.num}. {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ═════════════════════════════════════════════════════════
            RIGHT COLUMN: Report Content & Table
            ═════════════════════════════════════════════════════════ */}
        <section className="rep-main-content">
          {/* Top Title & Action Bar */}
          <div className="rep-content-head">
            <div className="rep-title-wrap">
              <h2 className="rep-section-title">{currentSectionObj.label}</h2>
              <p className="rep-section-sub">
                {SECTION_DESCRIPTIONS[activeSection]}
              </p>
            </div>

            <div className="rep-head-controls">
              <button
                type="button"
                className={`rep-ctrl-circle-btn${isRefreshing ? " is-spinning" : ""}`}
                onClick={handleRefresh}
                title="Refresh records"
                aria-label="Refresh records"
              >
                <RefreshCw size={16} />
              </button>

              <button
                type="button"
                className={`rep-ctrl-circle-btn${typeFilter !== "all" ? " is-active" : ""}`}
                onClick={() =>
                  setTypeFilter((prev) =>
                    prev === "all" ? "Export" : prev === "Export" ? "Import" : "all"
                  )
                }
                title={`Filter Type: ${typeFilter}`}
                aria-label="Filter type"
              >
                <SlidersHorizontal size={16} />
              </button>

              <button
                type="button"
                className={`rep-ctrl-circle-btn${showSearch ? " is-active" : ""}`}
                onClick={() => setShowSearch((v) => !v)}
                title="Toggle Search"
                aria-label="Toggle Search"
              >
                <Search size={16} />
              </button>

              <button
                type="button"
                className="rep-btn-generate"
                onClick={() => setGenModalOpen(true)}
              >
                <Plus size={15} />
                <span>Generate Report</span>
              </button>
            </div>
          </div>

          {/* Collapsible Search Bar */}
          {showSearch && (
            <div className="rep-search-bar">
              <input
                type="text"
                placeholder="Search reports by name, period or author..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="rep-search-clear"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Table Container */}
          <div className="rep-table-card">
            <div className="rep-table-scroll">
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Import/Export Name</th>
                    <th>Period</th>
                    <th>Generated At</th>
                    <th>Generated By</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="rep-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="rep-empty-td">
                        <div className="rep-empty-box">
                          <FileText size={36} className="rep-empty-icon" />
                          <p className="rep-empty-title">No report records found</p>
                          <p className="rep-empty-desc">
                            No export or import entries match the selected filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <span className="rep-name-text">{row.name}</span>
                        </td>
                        <td>
                          <span className="rep-period-text">{row.period}</span>
                        </td>
                        <td>
                          <span className="rep-date-text">{row.generatedAt}</span>
                        </td>
                        <td>
                          <span className="rep-by-text">{row.generatedBy}</span>
                        </td>
                        <td>
                          <span className={`rep-type-pill is-${row.type.toLowerCase()}`}>
                            {row.type}
                          </span>
                        </td>
                        <td>
                          <div className="rep-status-cell">
                            <span className="rep-status-label">{row.status}</span>
                            <div className="rep-progress-track">
                              <div
                                className="rep-progress-fill"
                                style={{ width: `${row.progress}%` }}
                              >
                                <span>{row.progress}%</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="rep-td-actions">
                          <button
                            type="button"
                            className="rep-download-btn"
                            title={`Download ${row.fileFormat}`}
                            aria-label={`Download ${row.name}`}
                            onClick={() => handleDownload(row)}
                          >
                            <Download size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Matching Reference) */}
            <div className="rep-pagination">
              <button
                type="button"
                className="rep-page-nav"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                ← Previous
              </button>

              <div className="rep-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`rep-page-num${currentPage === pageNum ? " is-active" : ""}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="rep-page-nav"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              >
                Next →
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── Generate Report Modal ── */}
      {genModalOpen && (
        <div className="rep-modal-backdrop" onClick={() => setGenModalOpen(false)}>
          <div className="rep-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="rep-modal-header">
              <h2>Generate New Report</h2>
              <button
                type="button"
                className="rep-modal-close"
                onClick={() => setGenModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateReport}>
              <div className="rep-modal-body">
                <div className="rep-form-group">
                  <label>Report Template / Name *</label>
                  <select
                    value={genForm.name}
                    onChange={(e) => setGenForm({ ...genForm, name: e.target.value })}
                  >
                    <option value="Biometric Logs Download">Biometric Logs Download</option>
                    <option value="Monthly Attendance Summary Export">Monthly Attendance Summary Export</option>
                    <option value="Leave Utilization Ledger">Leave Utilization Ledger</option>
                    <option value="Timesheet Project Hours Register">Timesheet Project Hours Register</option>
                    <option value="Employee Master Sync">Employee Master Sync</option>
                    <option value="Salary Slip Register Export">Salary Slip Register Export</option>
                  </select>
                </div>

                <div className="rep-form-row">
                  <div className="rep-form-group">
                    <label>Period *</label>
                    <select
                      value={genForm.period}
                      onChange={(e) => setGenForm({ ...genForm, period: e.target.value })}
                    >
                      <option value="August-2026">August-2026</option>
                      <option value="July-2026">July-2026</option>
                      <option value="June-2026">June-2026</option>
                      <option value="May-2026">May-2026</option>
                      <option value="April-2026">April-2026</option>
                      <option value="Q2-2026">Q2-2026</option>
                      <option value="FY-2025-2026">FY 2025-2026</option>
                    </select>
                  </div>

                  <div className="rep-form-group">
                    <label>File Format</label>
                    <select
                      value={genForm.format}
                      onChange={(e) => setGenForm({ ...genForm, format: e.target.value })}
                    >
                      <option value="XLSX">Excel (.xlsx)</option>
                      <option value="CSV">Comma Separated (.csv)</option>
                      <option value="PDF">Document (.pdf)</option>
                    </select>
                  </div>
                </div>

                <div className="rep-form-group">
                  <label>Type</label>
                  <select
                    value={genForm.type}
                    onChange={(e) => setGenForm({ ...genForm, type: e.target.value })}
                  >
                    <option value="Export">Export</option>
                    <option value="Import">Import</option>
                  </select>
                </div>
              </div>

              <div className="rep-modal-footer">
                <button
                  type="button"
                  className="rep-btn-cancel"
                  onClick={() => setGenModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="rep-btn-submit">
                  <Download size={15} />
                  <span>Generate &amp; Export</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
