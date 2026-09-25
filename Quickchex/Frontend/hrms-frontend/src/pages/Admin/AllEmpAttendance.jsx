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
  Check,
  RefreshCw,
  Users,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import "./AllEmpAttendance.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;



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
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [department, setDepartment] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
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
    const interval = setInterval(() => fetchAdminAttendance(true), 4000);
    const handleSync = () => fetchAdminAttendance(true);
    window.addEventListener("focus", handleSync);
    window.addEventListener("attendance-updated", handleSync);
    window.addEventListener("punch-updated", handleSync);
    window.addEventListener("regularization-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
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
      const token = localStorage.getItem("token");

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

  const presentCount = attendanceRecords.filter(
    (item) => String(item.status || "").toLowerCase() === "present"
  ).length;

  const absentCount = attendanceRecords.filter(
    (item) => String(item.status || "").toLowerCase() === "absent"
  ).length;

  const lateCount = attendanceRecords.filter(
    (item) => String(item.remark || "").toLowerCase() === "late"
  ).length;

  const permissionCount = attendanceRecords.filter(
    (item) => String(item.status || "").toLowerCase() === "permission"
  ).length;

  const uninformedCount = attendanceRecords.filter(
    (item) => String(item.status || "").toLowerCase() === "uninformed"
  ).length;

  /* ========================================================
     FILTER DATA
     ======================================================== */
  const filteredRecords = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return attendanceRecords.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const role = String(item.role || item.designation || "").toLowerCase();
      const dept = String(item.department || "").toLowerCase();

      const matchesSearch =
        !search ||
        name.includes(search) ||
        role.includes(search) ||
        dept.includes(search);

      const matchesDepartment =
        department === "all" || dept === department.toLowerCase();

      return matchesSearch && matchesDepartment;
    });
  }, [attendanceRecords, searchTerm, department]);

  /* ========================================================
     HELPERS
     ======================================================== */
  const getInitials = (name) => {
    if (!name) return "EM";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const departments = [
    { value: "all", label: "All Departments" },
    { value: "Development", label: "Development" },
    { value: "Design", label: "Design" },
    { value: "Management", label: "Management" },
    { value: "HR", label: "HR" },
  ];

  const selectedDepartment =
    departments.find((item) => item.value === department) || departments[0];

  const handleDepartmentChange = (value) => {
    setDepartment(value);
    setDropdownOpen(false);
  };

  return (
    <div className="att-page-container">
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
            <span className="att-stat-value">{presentCount}</span>
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
            <span className="att-stat-value">{lateCount}</span>
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
            <span className="att-stat-value">{permissionCount}</span>
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
            <span className="att-stat-value">{uninformedCount}</span>
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
            <span className="att-stat-value">{absentCount}</span>
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
            onClick={fetchAdminAttendance}
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
                  {departments.map((item) => (
                    <button
                      type="button"
                      key={item.value}
                      className={`att-dropdown-item ${department === item.value ? "is-selected" : ""
                        }`}
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
                  const statusRaw = String(row.status || "Absent").toLowerCase();
                  const remarkRaw = String(row.remark || "").toLowerCase();

                  return (
                    <tr key={row.id || row.employee_id || index}>
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
                        <span className={`att-status-pill ${statusRaw}`}>
                          <span className="dot" />
                          {row.status || "Absent"}
                        </span>
                      </td>

                      {/* CHECK IN */}
                      <td className="att-time-cell">
                        {row.checkIn || "--:--"}
                      </td>

                      {/* CHECK OUT */}
                      <td className="att-time-cell">
                        {row.checkOut || "--:--"}
                      </td>

                      {/* REMARK */}
                      <td>
                        <span
                          className={`att-remark ${remarkRaw === "late"
                            ? "late"
                            : remarkRaw === "on time"
                              ? "on-time"
                              : remarkRaw === "approved"
                                ? "approved"
                                : ""
                            }`}
                        >
                          {row.remark || "—"}
                        </span>
                      </td>

                      {/* ACTIVE HOURS */}
                      <td className="att-active-hours">
                        {row.prodHours || row.activeHours || "—"}
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
  );
}