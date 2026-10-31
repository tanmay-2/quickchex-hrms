// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - REPORTS.JSX
// Path: Frontend/hrms-frontend/src/pages/Admin/Reports.jsx
// Purpose: Web portal page component managing 'Reports' views, user interactions, and state.
// UI Components:
//   • <REPORT_TABS />
//   • <CATEGORIES />
//   • <INITIAL_REPORTS_DATA />
//   • <Reports />
//   • <PAGE_SIZE />
// Key Functions & Handlers:
//   • showToast()
//   • handleOutsideClick()
//   • getCategoryTheme()
//   • handleDownload()
//   • handleGenerate()
//   • handleModalGenerateSubmit()
//   • handleRefresh()
// ==============================================================================

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  Play,
  MoreVertical,
  Users,
  CheckSquare,
  DollarSign,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  History,
  Check,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./Reports.css";

/* =========================================================
   TOP TABS (Option 2 — Tabbed List View)
   ========================================================= */

const REPORT_TABS = [
  { id: "details-list", label: "Details List" },
  { id: "import-export", label: "Import Export" },
  { id: "reports-generation", label: "Reports Generation" },
  { id: "report-history", label: "Report History" },
];

/* =========================================================
   CATEGORY FILTER PILLS (Matching Option 2 Reference)
   ========================================================= */

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "Attendance", label: "Attendance" },
  { id: "Payroll", label: "Payroll" },
  { id: "Employees", label: "Employees" },
  { id: "Status", label: "Status" },
];

/* =========================================================
   INITIAL REPORTS DATA (Comprehensive HRMS dataset)
   ========================================================= */

const INITIAL_REPORTS_DATA = [
  {
    id: "REP-101",
    name: "Attendance Summary",
    category: "Attendance",
    description: "Generate detailed attendance summary for employees.",
    period: "October 2026",
    lastGenerated: "13 Oct 2026",
    generatedBy: "Admin User",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "1.8 MB",
    type: "Export",
  },
  {
    id: "REP-102",
    name: "Employee Directory",
    category: "Employees",
    description: "Export employee details, department and contact information.",
    period: "October 2026",
    lastGenerated: "10 Oct 2026",
    generatedBy: "Janhavi Solanki",
    status: "Completed",
    progress: 100,
    fileFormat: "CSV",
    size: "850 KB",
    type: "Export",
  },
  {
    id: "REP-103",
    name: "Payroll Summary",
    category: "Payroll",
    description: "Generate payroll summary and salary breakdown.",
    period: "October 2026",
    lastGenerated: "08 Oct 2026",
    generatedBy: "Admin User",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "2.4 MB",
    type: "Export",
  },
  {
    id: "REP-104",
    name: "Employee Shift Roster",
    category: "Employees",
    description: "Export shift roster for selected period.",
    period: "October 2026",
    lastGenerated: "05 Oct 2026",
    generatedBy: "System Scheduler",
    status: "Completed",
    progress: 100,
    fileFormat: "CSV",
    size: "620 KB",
    type: "Export",
  },
  {
    id: "REP-105",
    name: "Biometric Logs Download",
    category: "Attendance",
    description: "Raw biometric punch records and terminal sync data.",
    period: "June-2026",
    lastGenerated: "09-07-2026",
    generatedBy: "Renuka Vishwakarma",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "2.4 MB",
    type: "Export",
  },
  {
    id: "REP-106",
    name: "Leave Utilization Ledger",
    category: "Attendance",
    description: "Department leave balances, approval ratios, and encashment logs.",
    period: "September-2026",
    lastGenerated: "02 Oct 2026",
    generatedBy: "Janhavi Solanki",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "1.2 MB",
    type: "Export",
  },
  {
    id: "REP-107",
    name: "Salary Slip Register Export",
    category: "Payroll",
    description: "Comprehensive statutory salary register with PF, ESIC and PT breakdown.",
    period: "September-2026",
    lastGenerated: "30 Sep 2026",
    generatedBy: "Admin User",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "3.1 MB",
    type: "Export",
  },
  {
    id: "REP-108",
    name: "Timesheet Project Hours Register",
    category: "Employees",
    description: "Billable client hours, task submissions and project utilization.",
    period: "August-2026",
    lastGenerated: "28 Aug 2026",
    generatedBy: "Aaquib Khan",
    status: "Completed",
    progress: 100,
    fileFormat: "CSV",
    size: "940 KB",
    type: "Export",
  },
  {
    id: "REP-109",
    name: "Biometric Terminal Sync Archive",
    category: "Attendance",
    description: "Automated biometric device clocking and sync archive.",
    period: "May-2026",
    lastGenerated: "16 May 2026",
    generatedBy: "System Scheduler",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "2.1 MB",
    type: "Import",
  },
  {
    id: "REP-110",
    name: "Monthly Attendance Summary Export",
    category: "Attendance",
    description: "Monthly finalized attendance ledger with punch corrections.",
    period: "August-2026",
    lastGenerated: "01 Sep 2026",
    generatedBy: "Aaquib Khan",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "1.4 MB",
    type: "Export",
  },
  {
    id: "REP-111",
    name: "Administrative Audit Log",
    category: "Status",
    description: "System authentication events, role modifications and policy audits.",
    period: "October 2026",
    lastGenerated: "14 Oct 2026",
    generatedBy: "Super Admin",
    status: "Completed",
    progress: 100,
    fileFormat: "PDF",
    size: "1.1 MB",
    type: "Export",
  },
  {
    id: "REP-112",
    name: "Tax Deduction at Source (TDS) Summary",
    category: "Payroll",
    description: "Quarterly investment declarations, Form 16 and tax calculations.",
    period: "Q2-2026",
    lastGenerated: "05 Oct 2026",
    generatedBy: "Admin User",
    status: "Completed",
    progress: 100,
    fileFormat: "XLSX",
    size: "1.6 MB",
    type: "Export",
  },
];

export const Reports = () => {
  const navigate = useNavigate();

  // Top Tabs: "details-list", "import-export", "reports-generation", "report-history"
  const [activeTab, setActiveTab] = useState("details-list");

  // Category filter: "all", "Attendance", "Payroll", "Employees", "Status"
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Status dropdown filter
  const [statusFilter, setStatusFilter] = useState("all");

  // Search query
  const [searchQuery, setSearchQuery] = useState("");

  // Filter toolbar visibility
  const [filterToolbarOpen, setFilterToolbarOpen] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState("name-asc");

  // Reports data state
  const [reportsData, setReportsData] = useState(INITIAL_REPORTS_DATA);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 4; // 4 items per page on mobile card view for ideal compact scrolling

  // Feedback & Loading
  const [toastMsg, setToastMsg] = useState("");
  const [generatingId, setGeneratingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Action Menu Dropdown state (more options)
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Details Modal state
  const [detailsModalReport, setDetailsModalReport] = useState(null);

  // Generator Modal state
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genForm, setGenForm] = useState({
    name: "Attendance Summary",
    category: "Attendance",
    period: "October 2026",
    format: "XLSX",
    type: "Export",
    description: "Generate detailed attendance summary for employees.",
  });

  // History state
  const [historyList, setHistoryList] = useState([
    {
      id: "HIST-501",
      name: "Attendance Summary",
      period: "October 2026",
      generatedAt: "13 Oct 2026 - 16:45 IST",
      generatedBy: "Admin User",
      status: "Success",
      fileFormat: "XLSX",
      size: "1.8 MB",
    },
    {
      id: "HIST-502",
      name: "Employee Directory",
      period: "October 2026",
      generatedAt: "10 Oct 2026 - 11:30 IST",
      generatedBy: "Janhavi Solanki",
      status: "Success",
      fileFormat: "CSV",
      size: "850 KB",
    },
    {
      id: "HIST-503",
      name: "Payroll Summary",
      period: "October 2026",
      generatedAt: "08 Oct 2026 - 18:12 IST",
      generatedBy: "Admin User",
      status: "Success",
      fileFormat: "XLSX",
      size: "2.4 MB",
    },
  ]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Close more menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".rep-action-menu-wrap")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Category Icon helper with proper semantic color schemes matching Option 2
  const getCategoryTheme = (category) => {
    switch (category) {
      case "Attendance":
        return {
          icon: <Calendar size={18} className="rep-icon-emerald" />,
          boxClass: "rep-icon-box--emerald",
          badgeClass: "rep-badge--emerald",
        };
      case "Employees":
        return {
          icon: <Users size={18} className="rep-icon-blue" />,
          boxClass: "rep-icon-box--blue",
          badgeClass: "rep-badge--blue",
        };
      case "Payroll":
        return {
          icon: <DollarSign size={18} className="rep-icon-rose" />,
          boxClass: "rep-icon-box--rose",
          badgeClass: "rep-badge--rose",
        };
      default:
        return {
          icon: <Layers size={18} className="rep-icon-purple" />,
          boxClass: "rep-icon-box--purple",
          badgeClass: "rep-badge--purple",
        };
    }
  };

  // Real client-side file export/download
  const handleDownload = (report) => {
    const ext = report.fileFormat.toLowerCase();
    const filename = `${report.name.replace(/\s+/g, "_")}_${report.period.replace(/\s+/g, "_")}.${ext}`;

    let content = "";
    if (report.category === "Attendance") {
      content = `Employee ID,Employee Name,Department,Period,Present Days,Absent Days,Leave Days,Half Days,Late Marks,Total Hours,Status\n` +
        `EMP101,Rahul Verma,Engineering,${report.period},22,1,1,0,2,176,Finalized\n` +
        `ADM003,Janhavi Solanki,Engineering,${report.period},24,0,0,0,0,192,Finalized\n` +
        `ADM001,Admin Quickchex,Management,${report.period},23,0,1,0,1,184,Finalized\n` +
        `EMP104,Pooja Sharma,Human Resources,${report.period},21,2,1,0,1,168,Finalized\n` +
        `EMP105,Amit Patel,Design,${report.period},22,1,1,0,0,176,Finalized\n` +
        `EMP106,Sneha Kulkarni,Finance,${report.period},23,0,1,0,0,184,Finalized\n` +
        `EMP107,Vikas Gupta,Operations,${report.period},24,0,0,0,2,192,Finalized\n`;
    } else if (report.category === "Employees") {
      content = `Employee ID,Full Name,Designation,Department,Email,Phone,Joining Date,Status,Location\n` +
        `EMP101,Rahul Verma,Software Engineer,Engineering,rahul.v@laesfera.co,+91 98765 43210,15-01-2024,Active,Mumbai HQ\n` +
        `ADM003,Janhavi Solanki,Engineering Manager,Engineering,janhavi.s@laesfera.co,+91 98765 43211,10-06-2023,Active,Mumbai HQ\n` +
        `ADM001,Admin Quickchex,Administrator,Management,admin@quickchex.com,+91 98765 43212,01-01-2022,Active,Mumbai HQ\n` +
        `EMP104,Pooja Sharma,HR Generalist,Human Resources,pooja.s@laesfera.co,+91 98765 43213,20-03-2024,Active,Delhi Office\n` +
        `EMP105,Amit Patel,UI/UX Designer,Design,amit.p@laesfera.co,+91 98765 43214,01-08-2024,Active,Remote\n` +
        `EMP106,Sneha Kulkarni,Payroll Analyst,Finance,sneha.k@laesfera.co,+91 98765 43215,12-11-2023,Active,Mumbai HQ\n`;
    } else if (report.category === "Payroll") {
      content = `Employee ID,Employee Name,Department,Gross Salary,Basic + DA,HRA,Allowances,PF Deduction,ESIC,PT,TDS,Net Salary,Payment Status\n` +
        `EMP101,Rahul Verma,Engineering,85000,42500,21250,21250,1800,0,200,4500,78500,Paid\n` +
        `ADM003,Janhavi Solanki,Engineering,140000,70000,35000,35000,1800,0,200,16500,121500,Paid\n` +
        `ADM001,Admin Quickchex,Management,180000,90000,45000,45000,1800,0,200,25000,153000,Paid\n` +
        `EMP104,Pooja Sharma,Human Resources,65000,32500,16250,16250,1800,0,200,2200,60800,Paid\n` +
        `EMP105,Amit Patel,Design,75000,37500,18750,18750,1800,0,200,3500,69500,Paid\n` +
        `EMP106,Sneha Kulkarni,Finance,70000,35000,17500,17500,1800,0,200,2800,65200,Paid\n`;
    } else {
      content = `Record ID,Report Name,Period,Timestamp,Generated By,Type,Status,File Format,Size\n` +
        `${report.id},${report.name},${report.period},${report.lastGenerated},${report.generatedBy},${report.type},${report.status},${report.fileFormat},${report.size}\n`;
    }

    const mimeType = ext === "csv" ? "text/csv;charset=utf-8;" : "application/vnd.ms-excel;charset=utf-8;";
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded "${filename}"`);
  };

  // Real Report Generation workflow
  const handleGenerate = (report) => {
    setGeneratingId(report.id);
    setTimeout(() => {
      const nowStr = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Update report record
      setReportsData((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? {
                ...r,
                lastGenerated: nowStr,
                status: "Completed",
                progress: 100,
              }
            : r
        )
      );

      // Add to history
      const newHist = {
        id: `HIST-${Math.floor(600 + Math.random() * 400)}`,
        name: report.name,
        period: report.period,
        generatedAt: `${nowStr} - ${timeStr} IST`,
        generatedBy: (() => {
          try {
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            return u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Admin User";
          } catch {
            return "Admin User";
          }
        })(),
        status: "Success",
        fileFormat: report.fileFormat,
        size: report.size,
      };
      setHistoryList((prev) => [newHist, ...prev]);

      setGeneratingId(null);
      showToast(`Report "${report.name}" generated successfully.`);
    }, 600);
  };

  // Form submit for new report generation
  const handleModalGenerateSubmit = (e) => {
    e.preventDefault();
    const nowStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newReport = {
      id: `REP-${Math.floor(200 + Math.random() * 800)}`,
      name: genForm.name,
      category: genForm.category,
      description: genForm.description || `Generated ${genForm.name} for ${genForm.period}.`,
      period: genForm.period,
      lastGenerated: nowStr,
      generatedBy: "Admin User",
      status: "Completed",
      progress: 100,
      fileFormat: genForm.format,
      size: "1.5 MB",
      type: genForm.type,
    };

    setReportsData((prev) => [newReport, ...prev]);

    setHistoryList((prev) => [
      {
        id: `HIST-${Math.floor(700 + Math.random() * 300)}`,
        name: newReport.name,
        period: newReport.period,
        generatedAt: `${nowStr} - ${timeStr} IST`,
        generatedBy: "Admin User",
        status: "Success",
        fileFormat: newReport.fileFormat,
        size: newReport.size,
      },
      ...prev,
    ]);

    setGenModalOpen(false);
    showToast(`Report "${genForm.name}" created and generated.`);
  };

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Report records refreshed.");
    }, 500);
  };

  // Filtering data logic
  const filteredData = useMemo(() => {
    return reportsData.filter((item) => {
      // Top Tab filter
      if (activeTab === "import-export") {
        // Only export/import types
        if (!item.type) return false;
      }

      // Category Pill filter
      if (selectedCategory !== "all") {
        if (selectedCategory === "Status") {
          // If status category is selected, allow filter by status
          if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
            return false;
          }
        } else if (item.category !== selectedCategory) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.period.toLowerCase().includes(q) ||
          item.generatedBy.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [reportsData, activeTab, selectedCategory, statusFilter, searchQuery]);

  // Sorting logic
  const sortedData = useMemo(() => {
    const list = [...filteredData];
    if (sortBy === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name-desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "date-desc") {
      list.sort((a, b) => b.lastGenerated.localeCompare(a.lastGenerated));
    }
    return list;
  }, [filteredData, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedData.slice(start, start + PAGE_SIZE);
  }, [sortedData, currentPage]);

  return (
    <div className="reports-page option2-layout">
      {/* ── DashboardHeader: preserved exactly, null when inside DashboardShell ── */}
      <DashboardHeader />

      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className="rep-toast" role="alert">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── OPTION 2: COMPACT TOP TABS ── */}
      <nav className="rep-option2-tabs-bar" aria-label="Reports Views">
        <div className="rep-option2-tabs-container">
          {REPORT_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`rep-opt2-tab-btn${isActive ? " is-active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
              >
                <span>{tab.label}</span>
                {isActive && <div className="rep-opt2-tab-indicator" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── OPTION 2: TAB CONTENT ── */}
      {activeTab === "report-history" ? (
        /* ═════════════════════════════════════════════════════════
           VIEW: REPORT HISTORY
           ═════════════════════════════════════════════════════════ */
        <div className="rep-history-view">
          <div className="rep-history-card">
            <div className="rep-history-head">
              <div className="rep-history-title-wrap">
                <History size={18} className="rep-history-icon" />
                <h3 className="rep-history-title">Report Generation History</h3>
              </div>
              <button
                type="button"
                className="rep-opt2-refresh-btn"
                onClick={handleRefresh}
                title="Refresh history"
              >
                <RefreshCw size={15} className={isRefreshing ? "is-spinning" : ""} />
              </button>
            </div>

            <div className="rep-history-list">
              {historyList.map((hist) => (
                <div key={hist.id} className="rep-history-item">
                  <div className="rep-hist-info">
                    <h4 className="rep-hist-name">{hist.name}</h4>
                    <div className="rep-hist-meta">
                      <span>Period: {hist.period}</span>
                      <span>•</span>
                      <span>Generated: {hist.generatedAt}</span>
                      <span>•</span>
                      <span>By: {hist.generatedBy}</span>
                    </div>
                  </div>
                  <div className="rep-hist-actions">
                    <span className="rep-hist-badge">{hist.fileFormat}</span>
                    <button
                      type="button"
                      className="rep-hist-dl-btn"
                      onClick={() =>
                        handleDownload({
                          name: hist.name,
                          period: hist.period,
                          fileFormat: hist.fileFormat,
                          category: "Attendance",
                        })
                      }
                      title="Download file"
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════
           MAIN OPTION 2 VIEW: TABBED LIST VIEW (Details List / Import Export)
           ═════════════════════════════════════════════════════════ */
        <div className="rep-content-container">
          {/* 1. Full-width Search and Filter Toolbar */}
          <div className="rep-opt2-toolbar">
            <div className="rep-opt2-search-box">
              <Search size={18} className="rep-opt2-search-icon" />
              <input
                type="text"
                placeholder="Search reports by name or type..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="rep-opt2-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="rep-opt2-search-clear"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              className={`rep-opt2-filter-toggle${filterToolbarOpen ? " is-active" : ""}`}
              onClick={() => setFilterToolbarOpen((v) => !v)}
              title="Filter and sort options"
              aria-label="Filter and sort options"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>

          {/* Collapsible Extended Filters */}
          {filterToolbarOpen && (
            <div className="rep-opt2-ext-filters">
              <div className="rep-ext-group">
                <label>Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rep-ext-select"
                >
                  <option value="name-asc">Report Name (A → Z)</option>
                  <option value="name-desc">Report Name (Z → A)</option>
                  <option value="date-desc">Recently Generated</option>
                </select>
              </div>

              <div className="rep-ext-group">
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rep-ext-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in progress">In Progress</option>
                </select>
              </div>

              <button
                type="button"
                className="rep-ext-btn-gen"
                onClick={() => setGenModalOpen(true)}
              >
                <Plus size={15} />
                <span>New Template</span>
              </button>
            </div>
          )}

          {/* 2. Category Filter Pills (Matching Option 2 Reference) */}
          <div className="rep-opt2-pills-row" role="tablist" aria-label="Category Filters">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`rep-opt2-pill${isActive ? " is-active" : ""}`}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setCurrentPage(1);
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* 3. Empty State Check */}
          {sortedData.length === 0 ? (
            <div className="rep-empty-card">
              <FileText size={40} className="rep-empty-icon" />
              <h3 className="rep-empty-title">No reports match your filters</h3>
              <p className="rep-empty-desc">
                Try adjusting your search query, selecting another category, or resetting the filter options.
              </p>
              <button
                type="button"
                className="rep-btn-reset-filters"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setStatusFilter("all");
                  setCurrentPage(1);
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════
                  4. MOBILE REPORT CARDS (Option 2 — Tabbed List View)
                  ═══════════════════════════════════════════════════════ */}
              <div className="rep-opt2-mobile-list" role="region" aria-label="Reports List">
                {paginatedData.map((report) => {
                  const theme = getCategoryTheme(report.category);
                  const isGen = generatingId === report.id;
                  const menuOpen = activeMenuId === report.id;

                  return (
                    <div key={report.id} className="rep-opt2-card">
                      {/* Left Category Icon Box */}
                      <div className={`rep-opt2-icon-box ${theme.boxClass}`}>
                        {theme.icon}
                      </div>

                      {/* Middle Card Content */}
                      <div className="rep-opt2-card-body">
                        <div className="rep-opt2-title-row">
                          <h3 className="rep-opt2-card-name">{report.name}</h3>
                          <span className={`rep-opt2-category-badge ${theme.badgeClass}`}>
                            {report.category}
                          </span>
                        </div>

                        <p className="rep-opt2-card-desc">{report.description}</p>

                        <div className="rep-opt2-card-meta">
                          <div className="rep-opt2-meta-item">
                            <span className="rep-opt2-meta-lbl">Period</span>
                            <div className="rep-opt2-meta-val">
                              <Calendar size={13} className="rep-opt2-meta-icon" />
                              <span>{report.period}</span>
                            </div>
                          </div>

                          <div className="rep-opt2-meta-item">
                            <span className="rep-opt2-meta-lbl">Last generated</span>
                            <div className="rep-opt2-meta-val">
                              <Clock size={13} className="rep-opt2-meta-icon" />
                              <span>{report.lastGenerated}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="rep-opt2-card-actions">
                        {/* 1. Primary Action: Purple Generate Button (Play icon) */}
                        <button
                          type="button"
                          className={`rep-opt2-act-btn rep-act-generate${isGen ? " is-loading" : ""}`}
                          onClick={() => handleGenerate(report)}
                          title="Generate report"
                          aria-label={`Generate ${report.name}`}
                          disabled={isGen}
                        >
                          <Play size={15} fill="currentColor" className="rep-play-icon" />
                        </button>

                        {/* 2. Download outline button */}
                        <button
                          type="button"
                          className="rep-opt2-act-btn rep-act-outline"
                          onClick={() => handleDownload(report)}
                          title={`Download ${report.fileFormat}`}
                          aria-label={`Download ${report.name}`}
                        >
                          <Download size={15} />
                        </button>

                        {/* 3. View Details outline button */}
                        <button
                          type="button"
                          className="rep-opt2-act-btn rep-act-outline"
                          onClick={() => setDetailsModalReport(report)}
                          title="View details & sample data"
                          aria-label={`View details for ${report.name}`}
                        >
                          <FileText size={15} />
                        </button>

                        {/* 4. More Options Three Dots button */}
                        <div className="rep-action-menu-wrap">
                          <button
                            type="button"
                            className={`rep-opt2-act-btn rep-act-outline rep-act-more${menuOpen ? " is-active" : ""}`}
                            onClick={() => setActiveMenuId(menuOpen ? null : report.id)}
                            title="More options"
                            aria-label="More options"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {menuOpen && (
                            <div className="rep-opt2-dropdown-menu">
                              <button
                                type="button"
                                className="rep-opt2-dd-item"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleGenerate(report);
                                }}
                              >
                                <Play size={14} />
                                <span>Generate Now</span>
                              </button>
                              <button
                                type="button"
                                className="rep-opt2-dd-item"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleDownload({ ...report, fileFormat: "CSV" });
                                }}
                              >
                                <Download size={14} />
                                <span>Export as CSV</span>
                              </button>
                              <button
                                type="button"
                                className="rep-opt2-dd-item"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleDownload({ ...report, fileFormat: "XLSX" });
                                }}
                              >
                                <FileSpreadsheet size={14} />
                                <span>Export as Excel</span>
                              </button>
                              <button
                                type="button"
                                className="rep-opt2-dd-item"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDetailsModalReport(report);
                                }}
                              >
                                <Eye size={14} />
                                <span>View Details</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ═══════════════════════════════════════════════════════
                  5. DESKTOP VIEW: CLEAN PROFESSIONAL TABLE (>768px)
                  ═══════════════════════════════════════════════════════ */}
              <div className="rep-opt2-desktop-table-card">
                <div className="rep-opt2-table-scroll">
                  <table className="rep-opt2-table">
                    <thead>
                      <tr>
                        <th>Report Identity</th>
                        <th>Category</th>
                        <th>Period</th>
                        <th>Last Generated</th>
                        <th>Status</th>
                        <th className="rep-th-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((row) => {
                        const theme = getCategoryTheme(row.category);
                        const isGen = generatingId === row.id;

                        return (
                          <tr key={row.id}>
                            <td>
                              <div className="rep-desk-identity">
                                <div className={`rep-opt2-icon-box rep-desk-box ${theme.boxClass}`}>
                                  {theme.icon}
                                </div>
                                <div className="rep-desk-text-wrap">
                                  <span className="rep-desk-name">{row.name}</span>
                                  <span className="rep-desk-desc">{row.description}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`rep-opt2-category-badge ${theme.badgeClass}`}>
                                {row.category}
                              </span>
                            </td>
                            <td>
                              <span className="rep-desk-period">{row.period}</span>
                            </td>
                            <td>
                              <div className="rep-desk-date-wrap">
                                <Clock size={12} className="rep-opt2-meta-icon" />
                                <span>{row.lastGenerated}</span>
                              </div>
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
                            <td className="rep-th-center">
                              <div className="rep-desk-actions">
                                <button
                                  type="button"
                                  className={`rep-opt2-act-btn rep-act-generate${isGen ? " is-loading" : ""}`}
                                  onClick={() => handleGenerate(row)}
                                  title="Generate report"
                                  disabled={isGen}
                                >
                                  <Play size={14} fill="currentColor" />
                                </button>

                                <button
                                  type="button"
                                  className="rep-opt2-act-btn rep-act-outline"
                                  onClick={() => handleDownload(row)}
                                  title={`Download ${row.fileFormat}`}
                                >
                                  <Download size={14} />
                                </button>

                                <button
                                  type="button"
                                  className="rep-opt2-act-btn rep-act-outline"
                                  onClick={() => setDetailsModalReport(row)}
                                  title="View details"
                                >
                                  <FileText size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════
                  6. COMPACT PAGINATION (Matching Option 2 Reference)
                  ═══════════════════════════════════════════════════════ */}
              <div className="rep-opt2-pagination" aria-label="Pagination">
                <button
                  type="button"
                  className="rep-opt2-page-arrow"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  aria-label="Previous page"
                >
                  &lt; Previous
                </button>

                <div className="rep-opt2-page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      className={`rep-opt2-page-num${currentPage === pageNum ? " is-active" : ""}`}
                      onClick={() => setCurrentPage(pageNum)}
                      aria-current={currentPage === pageNum ? "page" : undefined}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="rep-opt2-page-arrow"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  aria-label="Next page"
                >
                  Next &gt;
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          7. VIEW DETAILS MODAL
          ═════════════════════════════════════════════════════════ */}
      {detailsModalReport && (
        <div
          className="rep-modal-backdrop"
          onClick={() => setDetailsModalReport(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="rep-modal-box rep-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rep-modal-header">
              <div className="rep-modal-header-left">
                <FileText size={20} className="rep-modal-header-icon" />
                <h3 className="rep-modal-title">{detailsModalReport.name}</h3>
              </div>
              <button
                type="button"
                className="rep-modal-close"
                onClick={() => setDetailsModalReport(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rep-modal-body">
              <div className="rep-details-grid">
                <div className="rep-det-field">
                  <span className="rep-det-label">Category</span>
                  <span className="rep-det-value">{detailsModalReport.category}</span>
                </div>
                <div className="rep-det-field">
                  <span className="rep-det-label">Target Period</span>
                  <span className="rep-det-value">{detailsModalReport.period}</span>
                </div>
                <div className="rep-det-field">
                  <span className="rep-det-label">Last Generated</span>
                  <span className="rep-det-value">{detailsModalReport.lastGenerated}</span>
                </div>
                <div className="rep-det-field">
                  <span className="rep-det-label">Generated By</span>
                  <span className="rep-det-value">{detailsModalReport.generatedBy}</span>
                </div>
                <div className="rep-det-field">
                  <span className="rep-det-label">Format &amp; Size</span>
                  <span className="rep-det-value">
                    {detailsModalReport.fileFormat} • {detailsModalReport.size}
                  </span>
                </div>
                <div className="rep-det-field">
                  <span className="rep-det-label">Current Status</span>
                  <span className="rep-det-value rep-det-status-ok">
                    {detailsModalReport.status} (100%)
                  </span>
                </div>
              </div>

              <div className="rep-details-desc-box">
                <p>{detailsModalReport.description}</p>
              </div>

              <div className="rep-sample-preview">
                <h4 className="rep-sample-title">Data Schema Preview</h4>
                <div className="rep-sample-table-wrap">
                  <table className="rep-sample-table">
                    <thead>
                      <tr>
                        <th>Field / Column</th>
                        <th>Data Type</th>
                        <th>Sample Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Employee ID</td>
                        <td>String</td>
                        <td>EMP101</td>
                      </tr>
                      <tr>
                        <td>Full Name</td>
                        <td>String</td>
                        <td>Rahul Verma</td>
                      </tr>
                      <tr>
                        <td>Department</td>
                        <td>String</td>
                        <td>Engineering</td>
                      </tr>
                      <tr>
                        <td>Period Value</td>
                        <td>String</td>
                        <td>{detailsModalReport.period}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="rep-modal-footer">
              <button
                type="button"
                className="rep-btn-cancel"
                onClick={() => setDetailsModalReport(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="rep-btn-submit"
                onClick={() => {
                  handleDownload(detailsModalReport);
                  setDetailsModalReport(null);
                }}
              >
                <Download size={15} />
                <span>Download Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          8. GENERATE REPORT / NEW TEMPLATE MODAL
          ═════════════════════════════════════════════════════════ */}
      {genModalOpen && (
        <div
          className="rep-modal-backdrop"
          onClick={() => setGenModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="rep-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="rep-modal-header">
              <div className="rep-modal-header-left">
                <Plus size={20} className="rep-modal-header-icon" />
                <h3 className="rep-modal-title">Generate New Report</h3>
              </div>
              <button
                type="button"
                className="rep-modal-close"
                onClick={() => setGenModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleModalGenerateSubmit}>
              <div className="rep-modal-body">
                <div className="rep-form-group">
                  <label>Report Template *</label>
                  <select
                    value={genForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      let cat = "Attendance";
                      let desc = "";
                      if (val.includes("Attendance") || val.includes("Biometric") || val.includes("Leave")) {
                        cat = "Attendance";
                        desc = "Detailed employee attendance and time tracking records.";
                      } else if (val.includes("Payroll") || val.includes("Salary") || val.includes("Tax")) {
                        cat = "Payroll";
                        desc = "Comprehensive compensation and statutory deduction breakdown.";
                      } else {
                        cat = "Employees";
                        desc = "Employee records, department mappings and shift schedules.";
                      }
                      setGenForm({ ...genForm, name: val, category: cat, description: desc });
                    }}
                    className="rep-form-select"
                  >
                    <option value="Attendance Summary">Attendance Summary</option>
                    <option value="Employee Directory">Employee Directory</option>
                    <option value="Payroll Summary">Payroll Summary</option>
                    <option value="Employee Shift Roster">Employee Shift Roster</option>
                    <option value="Biometric Logs Download">Biometric Logs Download</option>
                    <option value="Leave Utilization Ledger">Leave Utilization Ledger</option>
                    <option value="Salary Slip Register Export">Salary Slip Register Export</option>
                    <option value="Timesheet Project Hours Register">Timesheet Project Hours Register</option>
                  </select>
                </div>

                <div className="rep-form-row">
                  <div className="rep-form-group">
                    <label>Period *</label>
                    <select
                      value={genForm.period}
                      onChange={(e) => setGenForm({ ...genForm, period: e.target.value })}
                      className="rep-form-select"
                    >
                      <option value="October 2026">October 2026</option>
                      <option value="September-2026">September-2026</option>
                      <option value="August-2026">August-2026</option>
                      <option value="July-2026">July-2026</option>
                      <option value="Q3-2026">Q3-2026</option>
                      <option value="FY-2025-2026">FY 2025-2026</option>
                    </select>
                  </div>

                  <div className="rep-form-group">
                    <label>File Format</label>
                    <select
                      value={genForm.format}
                      onChange={(e) => setGenForm({ ...genForm, format: e.target.value })}
                      className="rep-form-select"
                    >
                      <option value="XLSX">Excel (.xlsx)</option>
                      <option value="CSV">Comma Separated (.csv)</option>
                      <option value="PDF">Document (.pdf)</option>
                    </select>
                  </div>
                </div>

                <div className="rep-form-group">
                  <label>Category</label>
                  <select
                    value={genForm.category}
                    onChange={(e) => setGenForm({ ...genForm, category: e.target.value })}
                    className="rep-form-select"
                  >
                    <option value="Attendance">Attendance</option>
                    <option value="Payroll">Payroll</option>
                    <option value="Employees">Employees</option>
                    <option value="Status">Status / Audit</option>
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
                  <Play size={14} fill="currentColor" />
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
