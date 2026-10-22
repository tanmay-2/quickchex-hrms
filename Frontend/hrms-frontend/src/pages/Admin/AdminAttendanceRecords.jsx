import React, { useState, useEffect, useRef, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Search,
  Download,
  Filter,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Upload,
  MapPin,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  User,
  Clock,
  FileText,
  Building2,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";
import { DashboardShellContext } from "../../components/header/DashboardHeader";
import { getApiBaseUrl } from "../../services/apiClient";
import AttendanceDateDetailsModal from "./AttendanceDateDetailsModal";
import "./AdminAttendanceRecords.css";

const getToken = () => localStorage.getItem("token") || "";

const getTodayLocalStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/* ── MetricDonut: Option B circular ring indicator ── */
function MetricDonut({ value, total, color }) {
  const radius = 8;
  const circumference = 2 * Math.PI * radius; // ~50.265
  const ratio = total > 0 ? Math.min(Math.max(value / total, 0.22), 0.88) : 0.25;
  const offset = circumference * (1 - ratio);

  return (
    <svg className="aar-kpi-ring" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="2.5"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

export default function AdminAttendanceRecords() {
  const navigate = useNavigate();
  const isInsideShell = useContext(DashboardShellContext);

  // Filters
  const [dateStr, setDateStr] = useState(getTodayLocalStr());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [managerFilter, setManagerFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workModeFilter, setWorkModeFilter] = useState("all");
  const [clientSiteFilter, setClientSiteFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile specific controls
  const [chipFilter, setChipFilter] = useState("all"); // "all", "present", "late", "permission", "absent"
  const [sortBy, setSortBy] = useState("latest"); // "latest", "oldest", "name_asc", "name_desc"
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedRecordModal, setSelectedRecordModal] = useState(null);

  // Data
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [clientSitesList, setClientSitesList] = useState([]);

  // Excel Upload state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch dropdown lists
  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    const headers = { Authorization: `Bearer ${getToken()}` };

    fetch(`${baseUrl}/api/v1/admin/users`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.users) {
          setEmployeesList(data.users);
          const depts = Array.from(new Set(data.users.map((u) => u.department).filter(Boolean)));
          setDepartmentsList(depts);
        }
      })
      .catch(() => {});

    fetch(`${baseUrl}/api/v1/admin/managers`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.managers) setManagersList(data.managers);
      })
      .catch(() => {});
  }, []);

  // Fetch records
  const fetchRecords = () => {
    setLoading(true);
    const q = [];
    if (dateStr) q.push(`date_str=${dateStr}`);
    if (selectedMonth) q.push(`month=${selectedMonth}`);
    if (selectedYear) q.push(`year=${selectedYear}`);
    if (managerFilter !== "all") q.push(`manager_id=${encodeURIComponent(managerFilter)}`);
    if (employeeFilter !== "all") q.push(`employee_id=${encodeURIComponent(employeeFilter)}`);
    if (deptFilter !== "all") q.push(`department=${encodeURIComponent(deptFilter)}`);
    if (statusFilter !== "all") q.push(`status_filter=${encodeURIComponent(statusFilter)}`);
    if (workModeFilter !== "all") q.push(`work_mode=${encodeURIComponent(workModeFilter)}`);
    if (clientSiteFilter !== "all") q.push(`client_site=${encodeURIComponent(clientSiteFilter)}`);
    if (searchQuery.trim()) q.push(`search=${encodeURIComponent(searchQuery.trim())}`);

    const url = `${getApiBaseUrl()}/api/v1/admin/attendance/all-records?${q.join("&")}`;
    fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.records) setRecords(data.records);
        if (data && data.client_sites && data.client_sites.length > 0) {
          setClientSitesList(data.client_sites);
        }
      })
      .catch((err) => {
        console.error("Failed to load records:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
  }, [dateStr, selectedMonth, selectedYear, managerFilter, employeeFilter, deptFilter, statusFilter, workModeFilter, clientSiteFilter, searchQuery]);

  const handleClearFilters = () => {
    setDateStr(getTodayLocalStr());
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setManagerFilter("all");
    setEmployeeFilter("all");
    setDeptFilter("all");
    setStatusFilter("all");
    setWorkModeFilter("all");
    setClientSiteFilter("all");
    setSearchQuery("");
    setChipFilter("all");
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!records.length) {
      showToast("No records available to export", "error");
      return;
    }
    const headers = ["Date", "Employee", "Code", "Manager", "Dept", "Work Mode", "Client Site", "Punch In", "Punch Out", "Hours", "Location", "Status", "Leave"];
    const csvRows = [headers.join(",")];
    records.forEach((r) => {
      csvRows.push([
        `"${r.date}"`,
        `"${r.name}"`,
        `"${r.emp_code}"`,
        `"${r.manager}"`,
        `"${r.department}"`,
        `"${r.work_mode || r.workMode || "OFFICE"}"`,
        `"${r.client_site || r.clientSite || "—"}"`,
        `"${r.checkIn}"`,
        `"${r.checkOut}"`,
        `"${r.workingHours}"`,
        `"${r.location || r.punch_in_location || "—"}"`,
        `"${r.status}"`,
        `"${r.leave_status}"`,
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Admin_Attendance_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Attendance CSV downloaded successfully!", "success");
  };

  // Excel Upload
  const handleFileSelect = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setUploadFile(f);
      setUploadResult(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/attendance/upload-excel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setUploadResult(data);
      showToast(data.message || "Attendance records imported successfully!", "success");
      fetchRecords();
      window.dispatchEvent(new Event("attendance-updated"));
      setTimeout(() => {
        handleCloseUploadModal();
      }, 1000);
    } catch (err) {
      setUploadResult({ error: err.message });
      showToast(err.message, "error");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadResult(null);
  };

  /* ── Calculations & Helpers ── */
  const totalEmployees = records.length;

  const presentCount = records.filter((r) => {
    const s = String(r.status || "").toLowerCase();
    return s.includes("present") || (s !== "absent" && r.checkIn && r.checkIn !== "—" && r.checkIn !== "--:--");
  }).length;

  const lateCount = records.filter((r) => {
    const s = String(r.status || "").toLowerCase();
    const rem = String(r.remark || "").toLowerCase();
    return s.includes("late") || rem.includes("late");
  }).length;

  const permissionCount = records.filter((r) => {
    const s = String(r.status || "").toLowerCase();
    const l = String(r.leave_status || "").toLowerCase();
    return s.includes("permission") || l.includes("permission") || s.includes("half day") || l.includes("half day");
  }).length;

  const uninformedCount = records.filter((r) => {
    const s = String(r.status || "").toLowerCase();
    const rem = String(r.remark || "").toLowerCase();
    return s.includes("uninformed") || rem.includes("uninformed") || s.includes("missing punch");
  }).length;

  const absentCount = records.filter((r) => {
    const s = String(r.status || "").toLowerCase();
    return s.includes("absent") || (!s.includes("present") && (!r.checkIn || r.checkIn === "—" || r.checkIn === "--:--"));
  }).length;

  // Filter & sort for mobile cards
  const sortedRecords = useMemo(() => {
    let list = [...records];

    if (chipFilter !== "all") {
      list = list.filter((r) => {
        const s = String(r.status || "").toLowerCase();
        const rem = String(r.remark || "").toLowerCase();
        const l = String(r.leave_status || "").toLowerCase();
        if (chipFilter === "present") return s.includes("present");
        if (chipFilter === "late") return s.includes("late") || rem.includes("late");
        if (chipFilter === "permission") return s.includes("permission") || l.includes("permission") || s.includes("half day");
        if (chipFilter === "absent") return s.includes("absent") || (!s.includes("present") && (!r.checkIn || r.checkIn === "—" || r.checkIn === "--:--"));
        return true;
      });
    }

    if (sortBy === "latest") {
      list.sort((a, b) => new Date(b.isoDate || b.date) - new Date(a.isoDate || a.date));
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.isoDate || a.date) - new Date(b.isoDate || b.date));
    } else if (sortBy === "name_asc") {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => String(b.name || "").localeCompare(String(a.name || "")));
    }

    return list;
  }, [records, chipFilter, sortBy]);

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "EM";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const sanitizeTime = (val) => {
    if (!val || val === "" || val === "--:--" || val === "-" || val === "null" || val === "None") {
      return "—";
    }
    return String(val).trim();
  };

  const sanitizeHours = (val) => {
    if (!val || val === "" || val === "0.0 Hrs" || val === "0.0" || val === "0" || val === "null" || val === "—") {
      return "0h 00m";
    }
    const str = String(val).trim();
    if (str.includes("h") || str.includes("m")) return str;
    const match = str.match(/([\d.]+)/);
    if (match) {
      const num = parseFloat(match[1]);
      if (isNaN(num) || num <= 0) return "0h 00m";
      const h = Math.floor(num);
      const m = Math.round((num - h) * 60);
      return `${h}h ${String(m).padStart(2, "0")}m`;
    }
    return str;
  };

  const sanitizeRemark = (remark, status) => {
    const normStatus = String(status || "").toLowerCase();
    const normRemark = String(remark || "").trim();

    if (normStatus.includes("absent") || normRemark.toLowerCase().includes("absent") || normStatus === "not started") {
      return "No check-in record";
    }
    if (!normRemark || normRemark === "" || normRemark === "-") {
      if (normStatus.includes("present")) return "On Time";
      return "No check-in record";
    }
    if (normRemark.toLowerCase() === "on time" || normRemark.toLowerCase() === "ontime") {
      return "On Time";
    }
    if (normRemark.toLowerCase().includes("late")) {
      return "Late Login";
    }
    return normRemark;
  };

  const getBadgeStyle = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("present")) return { bg: "#ecfdf5", color: "#059669", text: "PRESENT", dot: "#10b981", className: "present" };
    if (s.includes("late")) return { bg: "#fffbeb", color: "#d97706", text: "LATE", dot: "#f59e0b", className: "late" };
    if (s.includes("permission") || s.includes("half day") || s.includes("leave")) return { bg: "#f0f9ff", color: "#0284c7", text: "PERMISSION", dot: "#0284c7", className: "permission" };
    if (s.includes("uninformed") || s.includes("missing")) return { bg: "#f5f3ff", color: "#7c3aed", text: "UNINFORMED", dot: "#7c3aed", className: "uninformed" };
    return { bg: "#fef2f2", color: "#ef4444", text: "ABSENT", dot: "#ef4444", className: "absent" };
  };

  const getWorkModeBadge = (wm) => {
    const m = (wm || "OFFICE").toUpperCase();
    if (m === "WFH") return { bg: "rgba(16,185,129,0.1)", color: "#059669", text: "WFH" };
    if (m === "CLIENT_SITE") return { bg: "rgba(245,158,11,0.1)", color: "#d97706", text: "Client Site" };
    return { bg: "rgba(99,102,241,0.1)", color: "#4f46e5", text: "Office" };
  };

  const formatCardDate = (dateVal) => {
    if (!dateVal) return "Today";
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      }
    } catch (e) {}
    return String(dateVal);
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid var(--border, #e2e8f0)",
    fontSize: "12.5px",
    outline: "none",
    backgroundColor: "var(--surface, #fff)",
    color: "var(--text, #1e293b)",
    boxSizing: "border-box"
  };

  const selectStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid var(--border, #e2e8f0)",
    fontSize: "12.5px",
    outline: "none",
    backgroundColor: "var(--surface, #fff)",
    color: "var(--text, #1e293b)",
    cursor: "pointer",
    boxSizing: "border-box"
  };

  const labelStyle = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-muted, #64748b)",
    marginBottom: "4px"
  };

  return (
    <div className="admin-att-records-page dash-page-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 99999,
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px 20px", borderRadius: "12px",
          background: toast.type === "error" ? "#fee2e2" : "#dcfce7",
          color: toast.type === "error" ? "#dc2626" : "#16a34a",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)", fontWeight: 600, fontSize: "13px"
        }}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP VIEW ONLY (> 768px)
          Original desktop table, filter bar, and controls
          ═══════════════════════════════════════════════════════════════ */}
      <div className="aar-desktop-view">
        {/* Top Header Actions */}
        {isInsideShell ? (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setUploadModalOpen(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "9px 18px", borderRadius: "9999px",
                background: "rgba(124,58,237,0.1)", color: "#7c3aed",
                border: "1px solid rgba(124,58,237,0.3)", fontSize: "13px",
                fontWeight: 600, cursor: "pointer"
              }}
            >
              <Upload size={16} /> Upload Excel
            </button>
            <button
              onClick={handleExportCSV}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "9px 18px", borderRadius: "9999px",
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                color: "#ffffff", border: "none", fontSize: "13px",
                fontWeight: 600, cursor: "pointer",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)"
              }}
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        ) : (
          <div className="dash-page-header">
            <div className="dash-page-header__left">
              <span className="dash-page-header__eyebrow">Admin Portal</span>
              <h1 className="dash-page-header__title">Attendance Records</h1>
              <p className="dash-page-header__subtitle">
                Search, filter, and export overall company attendance records across managers, departments, work modes, and client sites.
              </p>
            </div>
            <div className="dash-page-header__actions" style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setUploadModalOpen(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "9px 18px", borderRadius: "9999px",
                  background: "rgba(124,58,237,0.1)", color: "#7c3aed",
                  border: "1px solid rgba(124,58,237,0.3)", fontSize: "13px",
                  fontWeight: 600, cursor: "pointer"
                }}
              >
                <Upload size={16} /> Upload Attendance Excel
              </button>
              <button
                onClick={handleExportCSV}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "9px 18px", borderRadius: "9999px",
                  background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                  color: "#ffffff", border: "none", fontSize: "13px",
                  fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)"
                }}
              >
                <Download size={16} /> Export Attendance
              </button>
            </div>
          </div>
        )}

        {/* Filter Bar (Desktop) */}
        <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Filter size={16} color="#7c3aed" />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Filter Attendance Records</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: "12px" }}>
            {/* Date */}
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} style={inputStyle} />
            </div>

            {/* Manager */}
            <div>
              <label style={labelStyle}>Manager</label>
              <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} style={selectStyle}>
                <option value="all">All Managers</option>
                {managersList.map((m) => (
                  <option key={m.emp_code} value={m.emp_code}>{m.name} ({m.emp_code})</option>
                ))}
              </select>
            </div>

            {/* Employee */}
            <div>
              <label style={labelStyle}>Employee</label>
              <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} style={selectStyle}>
                <option value="all">All Employees</option>
                {employeesList.map((emp) => (
                  <option key={emp.emp_code} value={emp.emp_code}>
                    {emp.name || emp.first_name || emp.emp_code} ({emp.emp_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label style={labelStyle}>Department</label>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={selectStyle}>
                <option value="all">All Departments</option>
                {departmentsList.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
                <option value="all">All Statuses</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half day">Half Day</option>
                <option value="leave">Leave</option>
                <option value="missing punch">Missing Punch</option>
                <option value="week off">Week Off</option>
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label style={labelStyle}>Work Mode</label>
              <select value={workModeFilter} onChange={(e) => setWorkModeFilter(e.target.value)} style={selectStyle}>
                <option value="all">All Modes</option>
                <option value="OFFICE">Office</option>
                <option value="WFH">WFH</option>
                <option value="CLIENT_SITE">Client Site</option>
              </select>
            </div>

            {/* Client Site */}
            <div>
              <label style={labelStyle}>Client Site</label>
              <select value={clientSiteFilter} onChange={(e) => setClientSiteFilter(e.target.value)} style={selectStyle}>
                <option value="all">All Sites</option>
                {clientSitesList.map((cs) => (
                  <option key={cs.id || cs.name} value={cs.name}>{cs.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label style={labelStyle}>Search</label>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #64748b)" }} />
                <input
                  type="text"
                  placeholder="Name, code or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: "30px" }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleClearFilters}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "6px 14px", borderRadius: "8px",
                border: "1px solid var(--border, #e2e8f0)",
                background: "var(--surface-2, #f8fafc)",
                fontSize: "12px", fontWeight: 600, cursor: "pointer",
                color: "var(--text-muted, #64748b)"
              }}
            >
              <RotateCcw size={14} /> Clear Filters
            </button>
          </div>
        </div>

        {/* Table Card (Desktop) */}
        <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Attendance Records Table</h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)", fontWeight: 600 }}>Total: {records.length}</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #f8fafc)" }}>
                  {["Date", "Employee", "Code", "Manager", "Work Mode", "Client Site", "Punch In", "Punch Out", "Hours", "Location", "Status", "Leave", "Action"].map((h) => (
                    <th key={h} style={{ padding: "11px 13px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: h === "Action" ? "right" : "left", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                        <div style={{ width: "20px", height: "20px", border: "2px solid #e2e8f0", borderTop: "2px solid #7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        Loading attendance records...
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                      <MapPin size={32} style={{ display: "block", margin: "0 auto 12px", opacity: 0.4 }} />
                      No attendance records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  records.map((r, idx) => {
                    const b = getBadgeStyle(r.status);
                    const wm = getWorkModeBadge(r.work_mode || r.workMode);
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                        <td style={{ padding: "13px", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>{r.date}</td>
                        <td style={{ padding: "13px", whiteSpace: "nowrap" }}>
                          <strong style={{ fontSize: "13px" }}>{r.name}</strong>
                        </td>
                        <td style={{ padding: "13px", fontSize: "12px", fontWeight: 600 }}>{r.emp_code}</td>
                        <td style={{ padding: "13px", fontSize: "12px", color: "var(--text-muted, #64748b)", whiteSpace: "nowrap" }}>{r.manager}</td>
                        <td style={{ padding: "13px" }}>
                          <span style={{ padding: "3px 9px", borderRadius: "10px", background: wm.bg, color: wm.color, fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                            {wm.text}
                          </span>
                        </td>
                        <td style={{ padding: "13px", fontSize: "12px", color: "var(--text-muted, #64748b)", whiteSpace: "nowrap", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis" }} title={r.client_site || r.clientSite || "—"}>
                          {r.client_site || r.clientSite || "—"}
                        </td>
                        <td style={{ padding: "13px", textAlign: "left", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>{sanitizeTime(r.checkIn)}</td>
                        <td style={{ padding: "13px", textAlign: "left", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>{sanitizeTime(r.checkOut)}</td>
                        <td style={{ padding: "13px", textAlign: "left", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>{sanitizeHours(r.workingHours)}</td>
                        <td style={{ padding: "13px", fontSize: "12px", color: "var(--text-muted, #64748b)", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.location || r.punch_in_location || "—"}>
                          {r.location || r.punch_in_location || "—"}
                        </td>
                        <td style={{ padding: "13px" }}>
                          <span style={{ padding: "4px 10px", borderRadius: "12px", background: b.bg, color: b.color, fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                            {b.text}
                          </span>
                        </td>
                        <td style={{ padding: "13px", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>{r.leave_status}</td>
                        <td style={{ padding: "13px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedRecordModal(r)}
                            style={{
                              padding: "6px 12px", borderRadius: "7px",
                              background: "rgba(124,58,237,0.1)", color: "#7c3aed",
                              border: "none", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE VIEWPORT (<= 768px): OPTION B — EMPLOYEE ATTENDANCE CARDS
          Matches Option B Reference Image
          ═══════════════════════════════════════════════════════════════ */}
      <div className="aar-mobile-view">
        {/* ── 1. ACTION BUTTONS (Upload Excel & Export CSV) ── */}
        <div className="aar-mobile-actions">
          <button
            type="button"
            className="aar-mobile-btn-upload"
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload size={17} />
            <span>Upload Excel</span>
          </button>
          <button
            type="button"
            className="aar-mobile-btn-export"
            onClick={handleExportCSV}
          >
            <Download size={17} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* ── 2. ATTENDANCE SUMMARY (5 COMPACT METRIC CARDS) ── */}
        <div className="aar-kpi-grid">
          {/* Present */}
          <div className="aar-kpi-card">
            <div className="aar-kpi-left">
              <div className="aar-kpi-icon present">
                <Users size={18} strokeWidth={2.2} />
              </div>
              <div className="aar-kpi-data">
                <span className="aar-kpi-label">PRESENT</span>
                <span className="aar-kpi-value">{loading ? "—" : presentCount}</span>
              </div>
            </div>
            <MetricDonut value={presentCount} total={totalEmployees} color="#10b981" />
          </div>

          {/* Late Login */}
          <div className="aar-kpi-card">
            <div className="aar-kpi-left">
              <div className="aar-kpi-icon late">
                <Clock size={18} strokeWidth={2.2} />
              </div>
              <div className="aar-kpi-data">
                <span className="aar-kpi-label">LATE LOGIN</span>
                <span className="aar-kpi-value">{loading ? "—" : lateCount}</span>
              </div>
            </div>
            <MetricDonut value={lateCount} total={totalEmployees} color="#f59e0b" />
          </div>

          {/* On Permission */}
          <div className="aar-kpi-card">
            <div className="aar-kpi-left">
              <div className="aar-kpi-icon permission">
                <FileText size={18} strokeWidth={2.2} />
              </div>
              <div className="aar-kpi-data">
                <span className="aar-kpi-label">ON PERMISSION</span>
                <span className="aar-kpi-value">{loading ? "—" : permissionCount}</span>
              </div>
            </div>
            <MetricDonut value={permissionCount} total={totalEmployees} color="#0284c7" />
          </div>

          {/* Uninformed */}
          <div className="aar-kpi-card">
            <div className="aar-kpi-left">
              <div className="aar-kpi-icon uninformed">
                <Calendar size={18} strokeWidth={2.2} />
              </div>
              <div className="aar-kpi-data">
                <span className="aar-kpi-label">UNINFORMED</span>
                <span className="aar-kpi-value">{loading ? "—" : uninformedCount}</span>
              </div>
            </div>
            <MetricDonut value={uninformedCount} total={totalEmployees} color="#7c3aed" />
          </div>

          {/* Absent */}
          <div className="aar-kpi-card">
            <div className="aar-kpi-left">
              <div className="aar-kpi-icon absent">
                <User size={18} strokeWidth={2.2} />
              </div>
              <div className="aar-kpi-data">
                <span className="aar-kpi-label">ABSENT</span>
                <span className="aar-kpi-value">{loading ? "—" : absentCount}</span>
              </div>
            </div>
            <MetricDonut value={absentCount} total={totalEmployees} color="#ef4444" />
          </div>
        </div>

        {/* ── 3. SEARCH & ALL FILTERS ROW ── */}
        <div className="aar-search-filter-row">
          <div className="aar-search-wrap">
            <Search size={18} className="aar-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee by name, code or department..."
              className="aar-search-input"
              aria-label="Search employee by name, code or department"
            />
          </div>
          <button
            type="button"
            className={`aar-all-filters-btn ${managerFilter !== "all" || deptFilter !== "all" || statusFilter !== "all" || workModeFilter !== "all" || clientSiteFilter !== "all" ? "is-active" : ""}`}
            onClick={() => setMobileFiltersOpen(true)}
            aria-label="Open all filters"
          >
            <SlidersHorizontal size={17} />
            <span>All Filters</span>
          </button>
        </div>

        {/* ── 4. STATUS FILTER CHIPS ── */}
        <div className="aar-chips-row">
          <button
            type="button"
            className={`aar-chip ${chipFilter === "all" ? "is-active" : ""}`}
            onClick={() => setChipFilter("all")}
          >
            <span className="aar-chip-dot all" />
            <span>All</span>
          </button>
          <button
            type="button"
            className={`aar-chip ${chipFilter === "present" ? "is-active" : ""}`}
            onClick={() => setChipFilter("present")}
          >
            <span className="aar-chip-dot present" />
            <span>Present</span>
          </button>
          <button
            type="button"
            className={`aar-chip ${chipFilter === "late" ? "is-active" : ""}`}
            onClick={() => setChipFilter("late")}
          >
            <span className="aar-chip-dot late" />
            <span>Late</span>
          </button>
          <button
            type="button"
            className={`aar-chip ${chipFilter === "permission" ? "is-active" : ""}`}
            onClick={() => setChipFilter("permission")}
          >
            <span className="aar-chip-dot permission" />
            <span>Permission</span>
          </button>
          <button
            type="button"
            className={`aar-chip ${chipFilter === "absent" ? "is-active" : ""}`}
            onClick={() => setChipFilter("absent")}
          >
            <span className="aar-chip-dot absent" />
            <span>Absent</span>
          </button>
        </div>

        {/* ── 5. SECTION BAR (Record Count & Sorting) ── */}
        <div className="aar-section-bar">
          <div className="aar-section-title-wrap">
            <Users size={18} color="#7c3aed" />
            <span>Employee Attendance</span>
            <span className="aar-section-badge">{sortedRecords.length}</span>
          </div>

          <select
            className="aar-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort employee attendance records"
          >
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </select>
        </div>

        {/* ── 6. EMPLOYEE ATTENDANCE CARDS LIST ── */}
        <div className="aar-cards-list">
          {loading ? (
            <div className="aar-loading-card">
              <RefreshCw size={26} color="#7c3aed" className="aar-spinner" />
              <p className="aar-empty-title">Loading attendance records...</p>
              <p className="aar-empty-sub">Fetching latest check-in & punch logs</p>
            </div>
          ) : sortedRecords.length === 0 ? (
            <div className="aar-empty-card">
              <MapPin size={32} className="aar-empty-icon" />
              <p className="aar-empty-title">No attendance records found</p>
              <p className="aar-empty-sub">
                {searchQuery || chipFilter !== "all" || deptFilter !== "all" || statusFilter !== "all"
                  ? "Try clearing your search query or filters to see more results."
                  : "No attendance records recorded for the selected date."}
              </p>
              {(searchQuery || chipFilter !== "all" || deptFilter !== "all" || statusFilter !== "all") && (
                <button
                  type="button"
                  className="aar-clear-filter-btn"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            sortedRecords.map((r, idx) => {
              const b = getBadgeStyle(r.status);
              const employeeInfo = employeesList.find((e) => e.emp_code === r.emp_code) || {};
              const designation = r.designation || r.role || employeeInfo.designation || employeeInfo.role || "Staff";
              const departmentName = r.department || employeeInfo.department || "Operations";
              const cleanCheckIn = sanitizeTime(r.checkIn);
              const cleanCheckOut = sanitizeTime(r.checkOut);
              const cleanWorkingHours = sanitizeHours(r.workingHours);
              const cleanRemark = sanitizeRemark(r.remark || r.leave_status, r.status);
              const formattedDate = formatCardDate(r.date);

              return (
                <div key={r.id || `${r.emp_code}-${idx}`} className="aar-card">
                  {/* Top Row: Avatar + Info + Date / Status Badge */}
                  <div className="aar-card-header">
                    <div className="aar-avatar">
                      {getInitials(r.name)}
                    </div>
                    <div className="aar-info">
                      <div className="aar-name">{r.name || "Unknown Employee"}</div>
                      <div className="aar-meta-sub">
                        <span>{r.emp_code}</span>
                        <span>•</span>
                        <span>{designation}</span>
                      </div>
                      <div className="aar-dept-line">
                        <Building2 size={13} color="#64748b" />
                        <span>{departmentName}</span>
                      </div>
                    </div>
                    <div className="aar-card-header-right">
                      <div className="aar-card-date">
                        <Calendar size={12} color="#64748b" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="aar-card-status-row">
                        <span className={`aar-status-badge ${b.className}`}>
                          <span className="aar-status-dot" />
                          {b.text}
                        </span>
                        <ChevronRight size={17} className="aar-chevron" />
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: 3 Columns Metrics (Check In, Check Out, Working Hours) */}
                  <div className="aar-metrics-row">
                    {/* Check In */}
                    <div className="aar-metric-col">
                      <div className="aar-metric-icon checkin">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="aar-metric-text">
                        <span className="aar-metric-label">Check In</span>
                        <strong className="aar-metric-val">{cleanCheckIn}</strong>
                      </div>
                    </div>

                    {/* Check Out */}
                    <div className="aar-metric-col">
                      <div className="aar-metric-icon checkout">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="aar-metric-text">
                        <span className="aar-metric-label">Check Out</span>
                        <strong className="aar-metric-val">{cleanCheckOut}</strong>
                      </div>
                    </div>

                    {/* Working Hours */}
                    <div className="aar-metric-col">
                      <div className="aar-metric-icon hours">
                        <Clock size={16} />
                      </div>
                      <div className="aar-metric-text">
                        <span className="aar-metric-label">Working Hours</span>
                        <strong className="aar-metric-val">{cleanWorkingHours}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Footer Row: Remark + View Details Action */}
                  <div className="aar-footer-row">
                    <div className="aar-remark-wrap">
                      <FileText size={14} className="aar-remark-icon" />
                      <span className="aar-remark-lbl">Remark</span>
                      <span className="aar-remark-text">{cleanRemark}</span>
                    </div>

                    <button
                      type="button"
                      className="aar-view-details-btn"
                      onClick={() => setSelectedRecordModal(r)}
                      aria-label={`View details for ${r.name}`}
                    >
                      <span>View Details</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 7. ALL FILTERS BOTTOM SHEET / MODAL (MOBILE) — Portaled to document.body ── */}
      {mobileFiltersOpen && createPortal(
        <div
          className="aar-filter-sheet-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileFiltersOpen(false);
          }}
        >
          <div className="aar-filter-sheet">
            <div className="aar-sheet-header">
              <h3 className="aar-sheet-title">
                <Filter size={18} color="#7c3aed" />
                <span>Filter Attendance Records</span>
              </h3>
              <button
                type="button"
                className="aar-sheet-close-btn"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>

            <div className="aar-sheet-body">
              {/* Date */}
              <div className="aar-sheet-field">
                <label className="aar-sheet-label">Date</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="aar-sheet-input"
                />
              </div>

              {/* Manager */}
              <div className="aar-sheet-field">
                <label className="aar-sheet-label">Manager</label>
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="aar-sheet-select"
                >
                  <option value="all">All Managers</option>
                  {managersList.map((m) => (
                    <option key={m.emp_code} value={m.emp_code}>
                      {m.name} ({m.emp_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee */}
              <div className="aar-sheet-field">
                <label className="aar-sheet-label">Employee</label>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="aar-sheet-select"
                >
                  <option value="all">All Employees</option>
                  {employeesList.map((emp) => (
                    <option key={emp.emp_code} value={emp.emp_code}>
                      {emp.name || emp.first_name || emp.emp_code} ({emp.emp_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div className="aar-sheet-field">
                <label className="aar-sheet-label">Department</label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="aar-sheet-select"
                >
                  <option value="all">All Departments</option>
                  {departmentsList.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="aar-sheet-field">
                <label className="aar-sheet-label">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="aar-sheet-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half day">Half Day</option>
                  <option value="leave">Leave</option>
                  <option value="missing punch">Missing Punch</option>
                  <option value="week off">Week Off</option>
                </select>
              </div>

              {/* Work Mode */}
              <div className="aar-sheet-field">
                <label className="aar-sheet-label">Work Mode</label>
                <select
                  value={workModeFilter}
                  onChange={(e) => setWorkModeFilter(e.target.value)}
                  className="aar-sheet-select"
                >
                  <option value="all">All Modes</option>
                  <option value="OFFICE">Office</option>
                  <option value="WFH">WFH</option>
                  <option value="CLIENT_SITE">Client Site</option>
                </select>
              </div>

              {/* Client Site */}
              <div className="aar-sheet-field">
                <label className="aar-sheet-label">Client Site</label>
                <select
                  value={clientSiteFilter}
                  onChange={(e) => setClientSiteFilter(e.target.value)}
                  className="aar-sheet-select"
                >
                  <option value="all">All Sites</option>
                  {clientSitesList.map((cs) => (
                    <option key={cs.id || cs.name} value={cs.name}>{cs.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="aar-sheet-footer">
              <button
                type="button"
                className="aar-sheet-btn-reset"
                onClick={() => {
                  handleClearFilters();
                  setMobileFiltersOpen(false);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="aar-sheet-btn-apply"
                onClick={() => {
                  fetchRecords();
                  setMobileFiltersOpen(false);
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 8. EXCEL UPLOAD MODAL — Portaled to document.body ── */}
      {uploadModalOpen && createPortal(
        <div
          className="aar-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && handleCloseUploadModal()}
        >
          <div style={{
            background: "#fff", borderRadius: "20px", padding: "28px 24px",
            width: "min(500px, 92vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            boxSizing: "border-box", zIndex: 100000
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800 }}>Upload Attendance Excel</h2>
                <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                  Import attendance records from .csv, .xlsx, or .xls files.
                </p>
              </div>
              <button onClick={handleCloseUploadModal} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                <X size={20} color="#94a3b8" />
              </button>
            </div>

            {/* File Drop Zone */}
            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: `2px dashed ${uploadFile ? "#7c3aed" : "#e2e8f0"}`,
                borderRadius: "12px",
                padding: "28px 16px",
                textAlign: "center",
                cursor: "pointer",
                background: uploadFile ? "rgba(124,58,237,0.04)" : "#fafafa",
                transition: "all 0.2s",
                marginBottom: "18px"
              }}
            >
              <Upload size={28} color={uploadFile ? "#7c3aed" : "#94a3b8"} style={{ display: "block", margin: "0 auto 10px" }} />
              {uploadFile ? (
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: "#7c3aed", fontSize: "13.5px" }}>{uploadFile.name}</p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>{(uploadFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: "#475569", fontSize: "13.5px" }}>Click to select file</p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>Accepts .csv, .xlsx, .xls</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ display: "none" }} />
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div style={{
                padding: "12px 14px", borderRadius: "10px", marginBottom: "16px",
                background: uploadResult.error ? "#fee2e2" : "#dcfce7",
                border: `1px solid ${uploadResult.error ? "#fca5a5" : "#86efac"}`
              }}>
                {uploadResult.error ? (
                  <p style={{ margin: 0, color: "#dc2626", fontWeight: 600, fontSize: "12.5px" }}>
                    ❌ {uploadResult.error}
                  </p>
                ) : (
                  <div>
                    <p style={{ margin: 0, color: "#16a34a", fontWeight: 700, fontSize: "13px" }}>
                      ✅ {uploadResult.message || "Attendance records imported successfully."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={handleCloseUploadModal}
                style={{
                  padding: "9px 18px", borderRadius: "9999px",
                  border: "1px solid #e2e8f0", background: "#f8fafc",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#64748b"
                }}
              >
                {uploadResult && !uploadResult.error ? "Close" : "Cancel"}
              </button>
              {uploadResult && !uploadResult.error ? (
                <button
                  onClick={handleCloseUploadModal}
                  style={{
                    padding: "9px 22px", borderRadius: "9999px",
                    background: "linear-gradient(135deg, #16a34a, #15803d)",
                    color: "#fff", border: "none", fontSize: "13px", fontWeight: 700,
                    cursor: "pointer", boxShadow: "0 4px 12px rgba(22,163,74,0.3)"
                  }}
                >
                  Done
                </button>
              ) : (
                <button
                  onClick={handleUploadSubmit}
                  disabled={!uploadFile || uploadLoading}
                  style={{
                    padding: "9px 22px", borderRadius: "9999px",
                    background: uploadFile && !uploadLoading ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "#e2e8f0",
                    color: uploadFile && !uploadLoading ? "#fff" : "#94a3b8",
                    border: "none", fontSize: "13px", fontWeight: 700,
                    cursor: uploadFile && !uploadLoading ? "pointer" : "not-allowed",
                    boxShadow: uploadFile && !uploadLoading ? "0 4px 12px rgba(124,58,237,0.3)" : "none"
                  }}
                >
                  {uploadLoading ? "Importing..." : "Import Records"}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Attendance Date Details Modal */}
      {selectedRecordModal && (
        <AttendanceDateDetailsModal
          isOpen={!!selectedRecordModal}
          onClose={() => setSelectedRecordModal(null)}
          record={selectedRecordModal}
          employee={selectedRecordModal}
        />
      )}

      {/* Animation for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
