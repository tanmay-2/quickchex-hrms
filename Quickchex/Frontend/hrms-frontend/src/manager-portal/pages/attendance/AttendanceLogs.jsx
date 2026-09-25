import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Calendar,
  Filter,
  Clock,
  RefreshCw,
  Download,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { ManagerBadge } from "../../components/ManagerBadge";
import { managerToast } from "../../components/ManagerToast";
import { getAttendanceLogs } from "../../services/managerApiService";
import "./AttendancePages.css";

// Helper for today's ISO date string (YYYY-MM-DD)
const getTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper for 7 days ago ISO date string
const getPastDateISO = (daysAgo = 7) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const AttendanceLogs = () => {
  // Filter States
  const [dateMode, setDateMode] = useState("single"); // 'single' | 'range'
  const [selectedDate, setSelectedDate] = useState(getTodayISO);
  const [startDate, setStartDate] = useState(() => getPastDateISO(6));
  const [endDate, setEndDate] = useState(getTodayISO);
  const [selectedEmp, setSelectedEmp] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [search, setSearch] = useState("");

  // Pagination States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data States
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch Attendance Logs from Backend API
  const fetchLogs = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = {
        page,
        pageSize,
        empCode: selectedEmp !== "all" ? selectedEmp : undefined,
        department: selectedDept !== "all" ? selectedDept : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        search: search.trim() ? search.trim() : undefined,
      };

      if (dateMode === "single") {
        params.date = selectedDate;
      } else {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await getAttendanceLogs(params);

      if (res && Array.isArray(res.records)) {
        setLogs(res.records);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
        if (Array.isArray(res.departments)) {
          setDepartments(res.departments);
        }
        if (Array.isArray(res.team_members)) {
          setTeamMembers(res.team_members);
        }
      } else if (Array.isArray(res)) {
        setLogs(res);
        setTotal(res.length);
        setTotalPages(Math.max(1, Math.ceil(res.length / pageSize)));
      } else {
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to fetch manager attendance logs:", err);
      setError(err?.message || "Failed to load attendance logs. Please check server connectivity.");
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    dateMode,
    selectedDate,
    startDate,
    endDate,
    selectedEmp,
    selectedDept,
    selectedStatus,
    search,
    page,
    pageSize,
  ]);

  // Initial and trigger load
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time synchronization event listeners
  useEffect(() => {
    const handleSync = () => fetchLogs(true);
    window.addEventListener("attendance-updated", handleSync);
    window.addEventListener("punch-updated", handleSync);
    window.addEventListener("regularization-updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("attendance-updated", handleSync);
      window.removeEventListener("punch-updated", handleSync);
      window.removeEventListener("regularization-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [fetchLogs]);

  // Reset Filters back to current date defaults
  const handleResetFilters = () => {
    setDateMode("single");
    setSelectedDate(getTodayISO());
    setStartDate(getPastDateISO(6));
    setEndDate(getTodayISO());
    setSelectedEmp("all");
    setSelectedDept("all");
    setSelectedStatus("all");
    setSearch("");
    setPage(1);
    managerToast.info("Filters reset to default current date.", { title: "Filters Reset" });
  };

  // Helper for status badge variant
  const getStatusVariant = (statusStr) => {
    const s = (statusStr || "").toLowerCase();
    if (s.includes("present") || s.includes("in progress")) return "present";
    if (s.includes("late")) return "late";
    if (s.includes("half")) return "late";
    if (s.includes("leave")) return "leave";
    if (s.includes("absent")) return "absent";
    return "default";
  };

  // Late / Early / On Time indicator pill
  const renderIndicator = (row) => {
    if (row.is_late || (row.late_by && row.late_by !== "—" && row.late_by !== "-")) {
      return (
        <span className="mp-indicator-pill mp-indicator-late" title={`Late punch: ${row.late_by}`}>
          <span className="mp-indicator-dot" />
          {row.late_by && row.late_by !== "—" && row.late_by !== "-" ? row.late_by : "Late Punch"}
        </span>
      );
    }
    if (row.is_early || (row.early_leaving && row.early_leaving !== "—" && row.early_leaving !== "-")) {
      return (
        <span className="mp-indicator-pill mp-indicator-early" title="Early departure">
          <span className="mp-indicator-dot" />
          {row.early_leaving}
        </span>
      );
    }
    if (row.remark && row.remark.toLowerCase().includes("regulariz")) {
      return (
        <span className="mp-indicator-pill mp-indicator-info">
          <span className="mp-indicator-dot" />
          Regularized
        </span>
      );
    }
    if (row.status === "Present" || (row.check_in && row.check_in !== "—" && row.check_in !== "-")) {
      return (
        <span className="mp-indicator-pill mp-indicator-ontime">
          <span className="mp-indicator-dot" />
          On Time
        </span>
      );
    }
    return <span style={{ color: "var(--mp-text-muted)", fontSize: "12.5px" }}>—</span>;
  };

  // Export current dataset to CSV
  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      managerToast.error("No attendance log records available to export.", { title: "Export Empty" });
      return;
    }

    const headers = [
      "Employee Name",
      "Employee ID",
      "Department",
      "Designation",
      "Date",
      "Check-In",
      "Check-Out",
      "Working Hours",
      "Status",
      "Late/Early Indicator",
      "Remark",
      "Location"
    ];

    const rows = logs.map((r) => [
      `"${(r.employee_name || r.name || "").replace(/"/g, '""')}"`,
      `"${(r.emp_code || "").replace(/"/g, '""')}"`,
      `"${(r.department || "").replace(/"/g, '""')}"`,
      `"${(r.designation || "").replace(/"/g, '""')}"`,
      `"${(r.date || "").replace(/"/g, '""')}"`,
      `"${(r.check_in || "—").replace(/"/g, '""')}"`,
      `"${(r.check_out || "—").replace(/"/g, '""')}"`,
      `"${(r.working_hours || "0h 00m").replace(/"/g, '""')}"`,
      `"${(r.status || "Absent").replace(/"/g, '""')}"`,
      `"${(r.is_late ? (r.late_by || "Late Punch") : (r.status === "Present" ? "On Time" : "—")).replace(/"/g, '""')}"`,
      `"${(r.remark || "—").replace(/"/g, '""')}"`,
      `"${(r.location || "Office").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const filename = `Attendance_Logs_${dateMode === "single" ? selectedDate : `${startDate}_to_${endDate}`}.csv`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    managerToast.success(`Exported ${logs.length} attendance records to CSV.`);
  };

  // Helper for pagination numbers
  const pageNumbers = useMemo(() => {
    const list = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      list.push(i);
    }
    return list;
  }, [page, totalPages]);

  return (
    <div className="mp-logs-container">
      {/* Page Title & Actions */}
      <div className="mp-logs-header">
        <div className="mp-logs-title-wrap">
          <h2>Attendance Log</h2>
          <p>
            Real-time biometric, web, and mobile attendance logs with punch timings and status tracking.
          </p>
        </div>

        <div className="mp-logs-header-actions">
          <button
            type="button"
            className="mp-logs-btn"
            onClick={() => fetchLogs(true)}
            disabled={loading || refreshing}
            title="Refresh logs from database"
          >
            <RefreshCw size={15} className={refreshing ? "mp-spin" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            className="mp-logs-btn mp-logs-btn-primary"
            onClick={handleExportCSV}
            disabled={loading || logs.length === 0}
            title="Export filtered records to CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Dynamic Filters Card */}
      <div className="mp-logs-filter-card">
        {/* Row 1: Date Mode & Date Selectors */}
        <div className="mp-logs-filter-row">
          <div className="mp-logs-mode-toggle">
            <button
              type="button"
              className={`mp-logs-mode-btn ${dateMode === "single" ? "is-active" : ""}`}
              onClick={() => {
                setDateMode("single");
                setPage(1);
              }}
            >
              Single Date
            </button>
            <button
              type="button"
              className={`mp-logs-mode-btn ${dateMode === "range" ? "is-active" : ""}`}
              onClick={() => {
                setDateMode("range");
                setPage(1);
              }}
            >
              Date Range
            </button>
          </div>

          {dateMode === "single" ? (
            <div className="mp-logs-input-wrap">
              <Calendar size={15} className="mp-logs-input-icon" />
              <input
                type="date"
                className="mp-logs-input"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(1);
                }}
                style={{ width: "165px" }}
              />
            </div>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <div className="mp-logs-input-wrap">
                <Calendar size={15} className="mp-logs-input-icon" />
                <input
                  type="date"
                  className="mp-logs-input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: "160px" }}
                  title="Start date"
                />
              </div>
              <span style={{ color: "var(--mp-text-muted)", fontSize: "13px", fontWeight: 600 }}>to</span>
              <div className="mp-logs-input-wrap">
                <Calendar size={15} className="mp-logs-input-icon" />
                <input
                  type="date"
                  className="mp-logs-input"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: "160px" }}
                  title="End date"
                />
              </div>
            </div>
          )}

          {/* Employee Dropdown */}
          <select
            className="mp-logs-select"
            value={selectedEmp}
            onChange={(e) => {
              setSelectedEmp(e.target.value);
              setPage(1);
            }}
            style={{ minWidth: "160px" }}
          >
            <option value="all">All Employees</option>
            {teamMembers.map((m) => (
              <option key={m.emp_code} value={m.emp_code}>
                {m.name} ({m.emp_code})
              </option>
            ))}
          </select>

          {/* Department Dropdown */}
          <select
            className="mp-logs-select"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            style={{ minWidth: "150px" }}
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            className="mp-logs-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            style={{ minWidth: "140px" }}
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="half day">Half Day</option>
            <option value="leave">Leave</option>
          </select>

          {/* Search Box */}
          <div className="mp-logs-input-wrap" style={{ flex: "1 1 200px" }}>
            <Search size={15} className="mp-logs-input-icon" />
            <input
              type="text"
              className="mp-logs-input"
              placeholder="Search employee name or ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%" }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--mp-text-muted)",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Clear Filters Button */}
          <button
            type="button"
            className="mp-logs-btn"
            onClick={handleResetFilters}
            title="Reset filters to today"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mp-logs-error-card">
          <div className="mp-logs-error-msg">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="mp-logs-btn"
            onClick={() => fetchLogs()}
            style={{ background: "#FFFFFF" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="mp-logs-table-card">
        <div className="mp-logs-table-scroll">
          <table className="mp-logs-table">
            <thead>
              <tr>
                <th style={{ width: "240px" }}>Employee</th>
                <th style={{ width: "110px" }}>Employee ID</th>
                <th style={{ width: "140px" }}>Department</th>
                <th style={{ width: "120px" }}>Date</th>
                <th style={{ width: "130px" }}>Check-In</th>
                <th style={{ width: "130px" }}>Check-Out</th>
                <th style={{ width: "130px" }}>Working Hours</th>
                <th style={{ width: "130px" }}>Status</th>
                <th style={{ width: "150px" }}>Late / Early Indicator</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading Skeleton Rows
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`}>
                    <td colSpan={9} style={{ padding: "18px 16px" }}>
                      <div
                        style={{
                          height: "20px",
                          borderRadius: "6px",
                          background: "linear-gradient(90deg, #F3EEFF 25%, #E6E3EE 50%, #F3EEFF 75%)",
                          backgroundSize: "200% 100%",
                          animation: "mp-shimmer 1.5s infinite",
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={9}>
                    <div className="mp-logs-empty-state">
                      <div className="mp-logs-empty-icon">
                        <Calendar size={28} />
                      </div>
                      <h4 className="mp-logs-empty-title">No Attendance Records Found</h4>
                      <p className="mp-logs-empty-desc">
                        No punch or attendance records match your current filter selections. Try selecting another date, clearing your search, or adjusting filters.
                      </p>
                      <button
                        type="button"
                        className="mp-logs-btn mp-logs-btn-primary"
                        onClick={handleResetFilters}
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                // Active Records
                logs.map((row) => {
                  const empName = row.employee_name || row.name || row.emp_code;
                  const initials = empName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "EM";

                  const hasCheckIn = row.check_in && row.check_in !== "—" && row.check_in !== "-";
                  const hasCheckOut = row.check_out && row.check_out !== "—" && row.check_out !== "-";

                  return (
                    <tr key={row.id}>
                      {/* Employee Name & Avatar */}
                      <td>
                        <div className="mp-emp-user-cell">
                          <div className="mp-emp-avatar-sm">{initials}</div>
                          <div className="mp-emp-cell-meta">
                            <span className="mp-emp-cell-name">{empName}</span>
                            <span className="mp-emp-cell-sub">
                              {row.designation || "Employee"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td>
                        <span className="mp-code-pill">{row.emp_code}</span>
                      </td>

                      {/* Department */}
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--mp-text-secondary)" }}>
                          {row.department || "Operations"}
                        </span>
                      </td>

                      {/* Date */}
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--mp-text-primary)" }}>
                          {row.date}
                        </span>
                      </td>

                      {/* Check-in */}
                      <td>
                        {hasCheckIn ? (
                          <span className="mp-time-cell">
                            <Clock size={13} style={{ color: "#059669" }} />
                            <span>{row.check_in}</span>
                          </span>
                        ) : (
                          <span className="mp-time-cell is-empty">—</span>
                        )}
                      </td>

                      {/* Check-out */}
                      <td>
                        {hasCheckOut ? (
                          <span className="mp-time-cell">
                            <Clock size={13} style={{ color: "#47435B" }} />
                            <span>{row.check_out}</span>
                          </span>
                        ) : (
                          <span className="mp-time-cell is-empty">—</span>
                        )}
                      </td>

                      {/* Working Hours */}
                      <td>
                        <span className="mp-hours-badge">
                          {row.working_hours || "0h 00m"}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <ManagerBadge variant={getStatusVariant(row.status)} dot>
                          {row.status || "Absent"}
                        </ManagerBadge>
                      </td>

                      {/* Late / Early Indicator */}
                      <td>
                        {renderIndicator(row)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar */}
        {!loading && logs.length > 0 && (
          <div className="mp-logs-pagination">
            <div className="mp-logs-page-info">
              Showing{" "}
              <strong>
                {Math.min(total, (page - 1) * pageSize + 1)} - {Math.min(total, page * pageSize)}
              </strong>{" "}
              of <strong>{total}</strong> attendance records
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* Rows Per Page */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--mp-text-muted)" }}>
                <span>Rows:</span>
                <select
                  className="mp-logs-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{ height: "32px", padding: "0 24px 0 8px", fontSize: "12.5px" }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev / Next & Numbers */}
              <div className="mp-logs-page-nav">
                <button
                  type="button"
                  className="mp-logs-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`mp-logs-page-btn ${num === page ? "is-active" : ""}`}
                    onClick={() => setPage(num)}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  className="mp-logs-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLogs;
