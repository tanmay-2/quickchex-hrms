import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  XCircle,
  Calendar,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  RefreshCw,
  Users,
  User,
  Building2,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import "./AllEmpAttendance.css";
import { getApiBaseUrl } from "../../services/apiClient";

const API_BASE_URL = getApiBaseUrl();

/* ── MetricDonut: Option B circular ring indicator ── */
function MetricDonut({ value, total, color }) {
  const radius = 8;
  const circumference = 2 * Math.PI * radius; // ~50.265
  const ratio = total > 0 ? Math.min(Math.max(value / total, 0.22), 0.88) : 0.25;
  const offset = circumference * (1 - ratio);

  return (
    <svg className="att-optb-metric-ring" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
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

/* ============================================================
   ROOT COMPONENT WITH SHELL INTEGRATION
   ============================================================ */
export default function AllEmpAttendance(props) {
  const isInsideShell = useContext(DashboardShellContext);

  if (!isInsideShell) {
    return (
      <DashboardShell>
        <AllEmpAttendanceContent {...props} />
      </DashboardShell>
    );
  }

  return <AllEmpAttendanceContent {...props} />;
}

/* ============================================================
   CONTENT COMPONENT
   ============================================================ */
function AllEmpAttendanceContent() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [department, setDepartment] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileDeptOpen, setMobileDeptOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target)) {
        setMobileDeptOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  /* ========================================================
     FETCH ATTENDANCE
     ======================================================== */
  useEffect(() => {
    fetchAdminAttendance();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden")) return;
      fetchAdminAttendance(true);
    }, 30000);

    const handleSync = () => {
      if (typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden")) return;
      fetchAdminAttendance(true);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden && document.visibilityState === "visible") {
        fetchAdminAttendance(true);
      }
    };

    window.addEventListener("focus", handleSync);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("attendance-updated", handleSync);
    window.addEventListener("punch-updated", handleSync);
    window.addEventListener("regularization-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("attendance-updated", handleSync);
      window.removeEventListener("punch-updated", handleSync);
      window.removeEventListener("regularization-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const fetchAdminAttendance = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");

      const response = await fetch(`${API_BASE_URL}/api/v1/attendance/admin/today`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load attendance data");
      }

      const json = await response.json();

      const attendanceList = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : [];

      setData(attendanceList);
    } catch (err) {
      console.error("Attendance API error:", err);
      if (!silent) {
        setError("Unable to connect to live attendance data.");
        setData([]);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  /* ========================================================
     NORMALIZE & CALCULATE COUNTS
     ======================================================== */
  const attendanceRecords = Array.isArray(data) ? data : [];
  const totalEmployees = attendanceRecords.length;

  const presentCount = attendanceRecords.filter((item) => {
    const s = String(item.status || "").toLowerCase();
    const r = String(item.remark || "").toLowerCase();
    return s === "present" || (s !== "absent" && s !== "not started" && item.checkIn && item.checkIn !== "—" && item.checkIn !== "" && item.checkIn !== "--:--");
  }).length;

  const absentCount = attendanceRecords.filter((item) => {
    const s = String(item.status || "").toLowerCase();
    const r = String(item.remark || "").toLowerCase();
    return s === "absent" || s === "not started" || r === "absent" || (!s && !r);
  }).length;

  const lateCount = attendanceRecords.filter((item) => {
    const s = String(item.status || "").toLowerCase();
    const r = String(item.remark || "").toLowerCase();
    return s === "late" || r === "late" || r.includes("late");
  }).length;

  const permissionCount = attendanceRecords.filter((item) => {
    const s = String(item.status || "").toLowerCase();
    const r = String(item.remark || "").toLowerCase();
    return s === "permission" || s === "approved" || r === "permission" || r === "approved";
  }).length;

  const uninformedCount = attendanceRecords.filter((item) => {
    const s = String(item.status || "").toLowerCase();
    const r = String(item.remark || "").toLowerCase();
    return s === "uninformed" || r === "uninformed";
  }).length;

  /* ========================================================
     DYNAMIC DEPARTMENTS
     ======================================================== */
  const dynamicDepartments = useMemo(() => {
    const list = [
      { value: "all", label: "All Departments" },
      { value: "Operations", label: "Operations" },
      { value: "Development", label: "Development" },
      { value: "Design", label: "Design" },
      { value: "Management", label: "Management" },
      { value: "HR", label: "HR" },
    ];
    attendanceRecords.forEach((item) => {
      const dept = item.department || item.dept;
      if (dept && typeof dept === "string" && dept.trim()) {
        const dTrim = dept.trim();
        if (!list.some((d) => d.value.toLowerCase() === dTrim.toLowerCase())) {
          list.push({ value: dTrim, label: dTrim });
        }
      }
    });
    return list;
  }, [attendanceRecords]);

  const selectedDepartment =
    dynamicDepartments.find((item) => item.value === department) || dynamicDepartments[0];

  /* ========================================================
     FILTER DATA
     ======================================================== */
  const filteredRecords = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return attendanceRecords.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const role = String(item.role || item.designation || "").toLowerCase();
      const dept = String(item.department || "").toLowerCase();
      const code = String(item.emp_code || item.employee_code || item.employee_id || "").toLowerCase();

      const matchesSearch =
        !search ||
        name.includes(search) ||
        role.includes(search) ||
        dept.includes(search) ||
        code.includes(search);

      const matchesDepartment =
        department === "all" || dept === department.toLowerCase();

      return matchesSearch && matchesDepartment;
    });
  }, [attendanceRecords, searchTerm, department]);

  /* ========================================================
     HELPERS
     ======================================================== */
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

  const sanitizeHours = (val, rowStatus) => {
    if (!val || val === "" || val === "0.0 Hrs" || val === "0.0" || val === "0" || val === "null") {
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

    if (normStatus === "absent" || normRemark.toLowerCase() === "absent" || normStatus === "not started") {
      return "No attendance record for this date";
    }
    if (!normRemark || normRemark === "" || normRemark === "-") {
      if (normStatus === "present") return "On Time";
      return "No attendance record for this date";
    }
    if (normRemark.toLowerCase() === "on time" || normRemark.toLowerCase() === "ontime") {
      return "On Time";
    }
    if (normRemark.toLowerCase() === "late" || normRemark.toLowerCase() === "late login") {
      return "Late Login";
    }
    return normRemark;
  };

  const getStatusDisplayAndClass = (status, remark) => {
    const s = String(status || "").trim().toLowerCase();
    const r = String(remark || "").trim().toLowerCase();

    if (s === "present" || r === "present" || r === "on time") {
      return { display: "PRESENT", className: "present" };
    }
    if (s === "late" || r === "late" || r === "late login") {
      return { display: "LATE", className: "late" };
    }
    if (s === "permission" || r === "permission" || r === "approved") {
      return { display: "PERMISSION", className: "permission" };
    }
    if (s === "uninformed" || r === "uninformed") {
      return { display: "UNINFORMED", className: "uninformed" };
    }
    return { display: "ABSENT", className: "absent" };
  };

  const handleEmployeeClick = (empCode) => {
    if (empCode) {
      navigate(`/admin/employees/${empCode}/attendance`);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleDepartmentChange = (value) => {
    setDepartment(value);
    setDropdownOpen(false);
  };

  return (
    <div className="att-page-container">
      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP VIEW ONLY (> 768px)
          Preserved original desktop table, toolbar, and KPI cards
          ═══════════════════════════════════════════════════════════════ */}
      <div className="att-desktop-view">
        {/* ── TOP ACTION BAR ── */}
        <section className="att-top-action-bar">
          <div className="att-header-controls">
            <div className="att-date-pill">
              <span className="att-date-icon">
                <Calendar size={15} />
              </span>
              <span>{today}</span>
            </div>
          </div>
        </section>

        {/* ── KPI SUMMARY CARDS (5-COL GRID) ── */}
        <section className="att-summary-grid">
          {/* PRESENT */}
          <div className="att-stat-card">
            <div className="att-stat-top">
              <span className="att-stat-label">Present</span>
              <div className="att-stat-icon-wrap present">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="att-stat-body">
              <span className="att-stat-value">{isLoading || error ? "—" : presentCount}</span>
              <span className="att-stat-subtext">Active today</span>
            </div>
          </div>

          {/* LATE LOGIN */}
          <div className="att-stat-card">
            <div className="att-stat-top">
              <span className="att-stat-label">Late Login</span>
              <div className="att-stat-icon-wrap late">
                <Clock size={18} />
              </div>
            </div>
            <div className="att-stat-body">
              <span className="att-stat-value">{isLoading || error ? "—" : lateCount}</span>
              <span className="att-stat-subtext">Past threshold</span>
            </div>
          </div>

          {/* ON PERMISSION */}
          <div className="att-stat-card">
            <div className="att-stat-top">
              <span className="att-stat-label">On Permission</span>
              <div className="att-stat-icon-wrap permission">
                <FileText size={18} />
              </div>
            </div>
            <div className="att-stat-body">
              <span className="att-stat-value">{isLoading || error ? "—" : permissionCount}</span>
              <span className="att-stat-subtext">Approved</span>
            </div>
          </div>

          {/* UNINFORMED */}
          <div className="att-stat-card">
            <div className="att-stat-top">
              <span className="att-stat-label">Uninformed</span>
              <div className="att-stat-icon-wrap uninformed">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="att-stat-body">
              <span className="att-stat-value">{isLoading || error ? "—" : uninformedCount}</span>
              <span className="att-stat-subtext">No notice</span>
            </div>
          </div>

          {/* ABSENT */}
          <div className="att-stat-card">
            <div className="att-stat-top">
              <span className="att-stat-label">Absent</span>
              <div className="att-stat-icon-wrap absent">
                <XCircle size={18} />
              </div>
            </div>
            <div className="att-stat-body">
              <span className="att-stat-value">{isLoading || error ? "—" : absentCount}</span>
              <span className="att-stat-subtext">Not in today</span>
            </div>
          </div>
        </section>

        {/* ── ALERT BANNER (IF ERROR) ── */}
        {error && (
          <div className="att-alert-banner">
            <div className="att-alert-content">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchAdminAttendance()}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12.5px",
              }}
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        )}

        {/* ── TABLE CARD ── */}
        <section className="att-table-card">
          {/* TOOLBAR */}
          <div className="att-toolbar">
            <div className="att-toolbar-title-wrap">
              <h2 className="att-toolbar-title">Employee Logs</h2>
              <span className="att-badge-count">{filteredRecords.length}</span>
            </div>

            <div className="att-toolbar-controls">
              {/* Search Input */}
              <div className="att-search-wrap">
                <Search size={15} className="att-search-icon" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search team members..."
                  className="att-search-input"
                />
              </div>

              {/* Department Dropdown */}
              <div className="att-dropdown-wrap" ref={dropdownRef}>
                <button
                  type="button"
                  className={`att-dropdown-btn ${dropdownOpen ? "is-open" : ""}`}
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-expanded={dropdownOpen}
                >
                  <span>{selectedDepartment.label}</span>
                  <ChevronDown size={14} />
                </button>

                {dropdownOpen && (
                  <div className="att-dropdown-menu">
                    {dynamicDepartments.map((item) => (
                      <button
                        type="button"
                        key={item.value}
                        className={`att-dropdown-item ${department === item.value ? "is-selected" : ""}`}
                        onClick={() => handleDepartmentChange(item.value)}
                      >
                        <span>{item.label}</span>
                        {department === item.value && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TABLE CONTENT */}
          <div className="att-table-container">
            <table className="att-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>STATUS</th>
                  <th>CHECK IN</th>
                  <th>CHECK OUT</th>
                  <th>REMARK</th>
                  <th>ACTIVE HOURS</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6">
                      <div className="att-empty-state">
                        <RefreshCw size={24} className="att-loading-spinner att-empty-icon" />
                        <p className="att-empty-title">Fetching records...</p>
                        <p className="att-empty-sub">Connecting to live attendance service</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="att-empty-state">
                        <Users size={32} className="att-empty-icon" />
                        <p className="att-empty-title">No attendance records found</p>
                        <p className="att-empty-sub">
                          {searchTerm || department !== "all"
                            ? "Try clearing your search or department filter."
                            : "No employee check-ins have been recorded today."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((row, index) => {
                    const { display: statusDisplay, className: statusClass } =
                      getStatusDisplayAndClass(row.status, row.remark);
                    const cleanCheckIn = sanitizeTime(row.checkIn || row.punch_in);
                    const cleanCheckOut = sanitizeTime(row.checkOut || row.punch_out);
                    const cleanProdHours = sanitizeHours(
                      row.prodHours || row.workingHours || row.activeHours,
                      row.status
                    );
                    const cleanRemark = sanitizeRemark(row.remark, row.status);

                    return (
                      <tr key={row.id || row.emp_code || row.employee_code || index}>
                        {/* EMPLOYEE */}
                        <td>
                          <div className="att-user-cell">
                            <div className="att-avatar">
                              {getInitials(row.name)}
                            </div>
                            <div className="att-user-info">
                              <span className="att-user-name">
                                {row.name || "Unknown Employee"}
                              </span>
                              <span className="att-user-dept">
                                {row.role || row.designation || row.department || "Staff"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* STATUS */}
                        <td>
                          <span className={`att-status-pill ${statusClass}`}>
                            <span className="dot" />
                            {statusDisplay}
                          </span>
                        </td>

                        {/* CHECK IN */}
                        <td className="att-time-cell">
                          {cleanCheckIn}
                        </td>

                        {/* CHECK OUT */}
                        <td className="att-time-cell">
                          {cleanCheckOut}
                        </td>

                        {/* REMARK */}
                        <td>
                          <span className={`att-remark ${statusClass}`}>
                            {cleanRemark}
                          </span>
                        </td>

                        {/* ACTIVE HOURS */}
                        <td className="att-active-hours">
                          {cleanProdHours}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE OPTION B PRESENTATION (<= 768px)
          Matches Option B - Employee Log Cards Reference Design
          ═══════════════════════════════════════════════════════════════ */}
      <div className="att-mobile-view">
        {/* ── ERROR ALERT BANNER (MOBILE) ── */}
        {error && (
          <div className="att-optb-alert">
            <div className="att-optb-alert-content">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="att-optb-retry-btn"
              onClick={() => fetchAdminAttendance()}
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        )}

        {/* ── 1. COMPACT 5 ATTENDANCE METRIC CARDS (2-COL GRID) ── */}
        <div className="att-optb-kpi-grid">
          {/* PRESENT */}
          <div className="att-optb-kpi-card is-present">
            <div className="att-optb-kpi-left">
              <div className="att-optb-kpi-icon present">
                <Users size={18} strokeWidth={2.2} />
              </div>
              <div className="att-optb-kpi-data">
                <span className="att-optb-kpi-label">PRESENT</span>
                <span className="att-optb-kpi-value">
                  {isLoading || error ? "—" : presentCount}
                </span>
              </div>
            </div>
            <MetricDonut
              value={presentCount}
              total={totalEmployees}
              color="#10b981"
            />
          </div>

          {/* LATE LOGIN */}
          <div className="att-optb-kpi-card is-late">
            <div className="att-optb-kpi-left">
              <div className="att-optb-kpi-icon late">
                <Clock size={18} strokeWidth={2.2} />
              </div>
              <div className="att-optb-kpi-data">
                <span className="att-optb-kpi-label">LATE LOGIN</span>
                <span className="att-optb-kpi-value">
                  {isLoading || error ? "—" : lateCount}
                </span>
              </div>
            </div>
            <MetricDonut
              value={lateCount}
              total={totalEmployees}
              color="#f59e0b"
            />
          </div>

          {/* ON PERMISSION */}
          <div className="att-optb-kpi-card is-permission">
            <div className="att-optb-kpi-left">
              <div className="att-optb-kpi-icon permission">
                <FileText size={18} strokeWidth={2.2} />
              </div>
              <div className="att-optb-kpi-data">
                <span className="att-optb-kpi-label">ON PERMISSION</span>
                <span className="att-optb-kpi-value">
                  {isLoading || error ? "—" : permissionCount}
                </span>
              </div>
            </div>
            <MetricDonut
              value={permissionCount}
              total={totalEmployees}
              color="#0284c7"
            />
          </div>

          {/* UNINFORMED */}
          <div className="att-optb-kpi-card is-uninformed">
            <div className="att-optb-kpi-left">
              <div className="att-optb-kpi-icon uninformed">
                <Calendar size={18} strokeWidth={2.2} />
              </div>
              <div className="att-optb-kpi-data">
                <span className="att-optb-kpi-label">UNINFORMED</span>
                <span className="att-optb-kpi-value">
                  {isLoading || error ? "—" : uninformedCount}
                </span>
              </div>
            </div>
            <MetricDonut
              value={uninformedCount}
              total={totalEmployees}
              color="#7c3aed"
            />
          </div>

          {/* ABSENT */}
          <div className="att-optb-kpi-card is-absent">
            <div className="att-optb-kpi-left">
              <div className="att-optb-kpi-icon absent">
                <User size={18} strokeWidth={2.2} />
              </div>
              <div className="att-optb-kpi-data">
                <span className="att-optb-kpi-label">ABSENT</span>
                <span className="att-optb-kpi-value">
                  {isLoading || error ? "—" : absentCount}
                </span>
              </div>
            </div>
            <MetricDonut
              value={absentCount}
              total={totalEmployees}
              color="#ef4444"
            />
          </div>
        </div>

        {/* ── 2. FULL-WIDTH EMPLOYEE SEARCH ── */}
        <div className="att-optb-search-wrap">
          <Search size={18} className="att-optb-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee by name, code or department..."
            className="att-optb-search-input"
            aria-label="Search employee by name, code or department"
          />
          <button
            type="button"
            className="att-optb-search-filter-icon"
            onClick={() => setMobileDeptOpen((v) => !v)}
            title="Filter by department"
            aria-label="Filter by department"
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>

        {/* ── 3. PREMIUM DEPARTMENT DROPDOWN ── */}
        <div className="att-optb-dept-wrap" ref={mobileDropdownRef}>
          <button
            type="button"
            className={`att-optb-dept-btn ${mobileDeptOpen ? "is-open" : ""}`}
            onClick={() => setMobileDeptOpen((v) => !v)}
            aria-expanded={mobileDeptOpen}
          >
            <div className="att-optb-dept-info">
              <Building2 size={18} className="att-optb-dept-icon" />
              <span className="att-optb-dept-title">{selectedDepartment.label}</span>
            </div>
            <ChevronDown
              size={18}
              className={`att-optb-dept-chevron ${mobileDeptOpen ? "is-open" : ""}`}
            />
          </button>

          {mobileDeptOpen && (
            <div className="att-optb-dept-menu">
              {dynamicDepartments.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`att-optb-dept-item ${department === item.value ? "is-selected" : ""}`}
                  onClick={() => {
                    setDepartment(item.value);
                    setMobileDeptOpen(false);
                  }}
                >
                  <span>{item.label}</span>
                  {department === item.value && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. INDIVIDUAL WHITE EMPLOYEE LOG CARDS (OPTION B) ── */}
        <div className="att-optb-cards-container">
          {isLoading ? (
            <div className="att-optb-loading-card">
              <RefreshCw size={26} className="att-loading-spinner att-optb-spinner" />
              <p className="att-optb-empty-title">Fetching records...</p>
              <p className="att-optb-empty-sub">Connecting to live attendance service</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="att-optb-empty-card">
              <Users size={32} className="att-optb-empty-icon" />
              <p className="att-optb-empty-title">No attendance records found</p>
              <p className="att-optb-empty-sub">
                {searchTerm || department !== "all"
                  ? "Try clearing your search or department filter."
                  : "No employee check-ins have been recorded today."}
              </p>
              {(searchTerm || department !== "all") && (
                <button
                  type="button"
                  className="att-optb-clear-filter-btn"
                  onClick={() => {
                    setSearchTerm("");
                    setDepartment("all");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            filteredRecords.map((row, index) => {
              const { display: statusDisplay, className: statusClass } =
                getStatusDisplayAndClass(row.status, row.remark);
              const cleanCheckIn = sanitizeTime(row.checkIn || row.punch_in);
              const cleanCheckOut = sanitizeTime(row.checkOut || row.punch_out);
              const cleanProdHours = sanitizeHours(
                row.prodHours || row.workingHours || row.activeHours,
                row.status
              );
              const cleanRemark = sanitizeRemark(row.remark, row.status);
              const empCode = row.emp_code || row.employee_code || row.employee_id || "";

              return (
                <div
                  key={row.id || empCode || index}
                  className="att-optb-card"
                  onClick={() => handleEmployeeClick(empCode)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleEmployeeClick(empCode);
                    }
                  }}
                >
                  {/* CARD HEADER: AVATAR + NAME/TITLE/CODE + STATUS PILL + CHEVRON */}
                  <div className="att-optb-card-header">
                    <div className="att-optb-avatar">
                      {getInitials(row.name)}
                    </div>
                    <div className="att-optb-info">
                      <div className="att-optb-name">
                        {row.name || "Unknown Employee"}
                      </div>
                      <div className="att-optb-meta">
                        <span className="att-optb-role">
                          {row.role || row.designation || row.department || "Staff"}
                        </span>
                        {empCode && (
                          <>
                            <span className="att-optb-dot">•</span>
                            <span className="att-optb-code">{empCode}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="att-optb-status-wrap">
                      <span className={`att-optb-status-badge ${statusClass}`}>
                        <span className="att-optb-badge-dot" />
                        {statusDisplay}
                      </span>
                      <ChevronRight size={17} className="att-optb-arrow" />
                    </div>
                  </div>

                  {/* 3-COLUMN METRICS ROW (CHECK IN, CHECK OUT, ACTIVE HOURS) */}
                  <div className="att-optb-metrics-grid">
                    {/* CHECK IN */}
                    <div className="att-optb-metric-col">
                      <div className="att-optb-metric-icon checkin">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="att-optb-metric-text">
                        <span className="att-optb-metric-label">Check In</span>
                        <strong className="att-optb-metric-val">{cleanCheckIn}</strong>
                      </div>
                    </div>

                    {/* CHECK OUT */}
                    <div className="att-optb-metric-col">
                      <div className="att-optb-metric-icon checkout">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="att-optb-metric-text">
                        <span className="att-optb-metric-label">Check Out</span>
                        <strong className="att-optb-metric-val">{cleanCheckOut}</strong>
                      </div>
                    </div>

                    {/* ACTIVE HOURS */}
                    <div className="att-optb-metric-col">
                      <div className="att-optb-metric-icon hours">
                        <Clock size={16} />
                      </div>
                      <div className="att-optb-metric-text">
                        <span className="att-optb-metric-label">Active Hours</span>
                        <strong className="att-optb-metric-val">{cleanProdHours}</strong>
                      </div>
                    </div>
                  </div>

                  {/* REMARK FOOTER ROW */}
                  <div className="att-optb-remark-bar">
                    <FileText size={15} className="att-optb-remark-icon" />
                    <span className="att-optb-remark-lbl">Remark</span>
                    <span className="att-optb-remark-text">{cleanRemark}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
