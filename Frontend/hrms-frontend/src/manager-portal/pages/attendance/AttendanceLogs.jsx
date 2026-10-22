import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Calendar,
  Clock,
  RefreshCw,
  Download,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  RotateCcw
} from "lucide-react";
import { ManagerBadge } from "../../components/ManagerBadge";
import { ManagerSelect } from "../../components/ManagerSelect";
import { managerToast } from "../../components/ManagerToast";
import { getAttendanceLogs } from "../../services/managerApiService";
import "./AttendancePages.css";
import "./AttendanceLogs.css";

/* ─── Initials Avatar Helper ─────────────────────────────────────────────── */
const getInitials = (name) => {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

/* ─── Date helpers ───────────────────────────────────────────────────────── */
const getTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPastDateISO = (daysAgo = 7) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 3; i >= -8; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();
const DEFAULT_MONTH_INDEX = Math.max(
  0,
  MONTH_OPTIONS.findIndex(
    (o) =>
      o.month === new Date().getMonth() + 1 &&
      o.year === new Date().getFullYear()
  )
);

/* ─── Status pill variant class ─────────────────────────────────────────── */
const getStatusClass = (statusStr) => {
  const s = (statusStr || "").toLowerCase();
  if (s.includes("present") || s.includes("in progress")) return "present";
  if (s.includes("late") || s.includes("half")) return "late";
  if (s.includes("leave")) return "leave";
  if (s.includes("holiday")) return "holiday";
  if (s.includes("not started") || s.includes("future") || s === "—" || s === "-") return "not-started";
  if (s.includes("absent")) return "absent";
  return "not-started";
};

/* ─── Month & Year Picker Component (Option B) ───────────────────────────── */
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const MonthYearPicker = ({ isOpen, value, onApply, onCancel }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState("month");
  const [tempYear, setTempYear] = useState(() => value?.year || new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(() => value?.month || new Date().getMonth() + 1);

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setTempYear(value?.year || new Date().getFullYear());
      setTempMonth(value?.month || new Date().getMonth() + 1);
      setActiveTab("month");
    }
  }, [isOpen, value]);

  // Year range for the Year tab
  const [yearBase, setYearBase] = useState(() => {
    const y = value?.year || new Date().getFullYear();
    return Math.floor(y / 12) * 12;
  });

  const yearsList = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => yearBase + i);
  }, [yearBase]);

  const handlePrevYear = () => setTempYear((y) => y - 1);
  const handleNextYear = () => setTempYear((y) => y + 1);

  const handleApply = () => {
    const label = `${FULL_MONTH_NAMES[tempMonth - 1]} ${tempYear}`;
    onApply({
      month: tempMonth,
      year: tempYear,
      label,
    });
  };

  return (
    <div className="mp-myp-backdrop" onClick={onCancel}>
      <div className="mp-myp-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mp-myp-header">
          <h3 className="mp-myp-title">Select Month & Year</h3>
          <button
            type="button"
            className="mp-myp-close-btn"
            onClick={onCancel}
            aria-label="Close picker"
          >
            <X size={18} />
          </button>
        </div>

        {/* Segmented Tabs: Month / Year */}
        <div className="mp-myp-tabs">
          <button
            type="button"
            className={`mp-myp-tab ${activeTab === "month" ? "is-active" : ""}`}
            onClick={() => setActiveTab("month")}
          >
            Month
          </button>
          <button
            type="button"
            className={`mp-myp-tab ${activeTab === "year" ? "is-active" : ""}`}
            onClick={() => setActiveTab("year")}
          >
            Year
          </button>
        </div>

        {activeTab === "month" ? (
          <>
            {/* Year Navigation Row */}
            <div className="mp-myp-year-nav">
              <button
                type="button"
                className="mp-myp-nav-btn"
                onClick={handlePrevYear}
                aria-label="Previous year"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="mp-myp-year-display">{tempYear}</span>
              <button
                type="button"
                className="mp-myp-nav-btn"
                onClick={handleNextYear}
                aria-label="Next year"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* 3-Column Month Grid (4 rows x 3 columns) */}
            <div className="mp-myp-month-grid">
              {MONTH_NAMES.map((mName, idx) => {
                const monthNum = idx + 1;
                const isSelected = tempMonth === monthNum;
                return (
                  <button
                    key={mName}
                    type="button"
                    className={`mp-myp-month-cell ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setTempMonth(monthNum)}
                  >
                    {mName}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Decade Navigation */}
            <div className="mp-myp-year-nav">
              <button
                type="button"
                className="mp-myp-nav-btn"
                onClick={() => setYearBase((b) => b - 12)}
                aria-label="Previous years"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="mp-myp-year-display">
                {yearsList[0]} - {yearsList[yearsList.length - 1]}
              </span>
              <button
                type="button"
                className="mp-myp-nav-btn"
                onClick={() => setYearBase((b) => b + 12)}
                aria-label="Next years"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* 3-Column Year Grid */}
            <div className="mp-myp-year-grid">
              {yearsList.map((y) => {
                const isSelected = tempYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    className={`mp-myp-year-cell ${isSelected ? "is-selected" : ""}`}
                    onClick={() => {
                      setTempYear(y);
                      setActiveTab("month");
                    }}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Footer Actions: Cancel / Apply */}
        <div className="mp-myp-footer">
          <button
            type="button"
            className="mp-myp-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="mp-myp-apply-btn"
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export const AttendanceLogs = () => {
  // Mobile Viewport Detection
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth <= 768 : false;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Month Selection State
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return MONTH_OPTIONS[DEFAULT_MONTH_INDEX] || {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      label: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  });
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [detailsMonthPickerOpen, setDetailsMonthPickerOpen] = useState(false);

  // Filter States
  const [dateMode, setDateMode] = useState("single"); // 'single' | 'range'
  const [selectedDate, setSelectedDate] = useState(getTodayISO);
  const [startDate, setStartDate] = useState(() => getPastDateISO(6));
  const [endDate, setEndDate] = useState(getTodayISO);
  const [selectedEmp, setSelectedEmp] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedWorkMode, setSelectedWorkMode] = useState("all");
  const [selectedClientSite, setSelectedClientSite] = useState("all");
  const [search, setSearch] = useState("");

  const handleApplyMonth = (newMonth) => {
    setSelectedMonth(newMonth);
    setMonthPickerOpen(false);

    const daysInMonth = new Date(newMonth.year, newMonth.month, 0).getDate();
    const startStr = `${newMonth.year}-${String(newMonth.month).padStart(2, "0")}-01`;
    const endStr = `${newMonth.year}-${String(newMonth.month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const now = new Date();
    if (now.getFullYear() === newMonth.year && now.getMonth() + 1 === newMonth.month) {
      setSelectedDate(getTodayISO());
    } else {
      setSelectedDate(startStr);
    }
    setStartDate(startStr);
    setEndDate(endStr);
    setPage(1);
  };

  // Pagination States (Mobile uses 4 per page as strictly required)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const activePageSize = isMobile ? 4 : pageSize;

  // Data States
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clientSites, setClientSites] = useState([]);

  // Memoized Options for Premium Dropdown Filters
  const employeeOptions = useMemo(() => [
    { label: "All Employees", value: "all" },
    ...teamMembers.map((m) => ({
      label: `${m.name} (${m.emp_code})`,
      value: m.emp_code,
    })),
  ], [teamMembers]);

  const departmentOptions = useMemo(() => [
    { label: "All Departments", value: "all" },
    ...departments.map((dept) => ({
      label: dept,
      value: dept,
    })),
  ], [departments]);

  const statusOptions = useMemo(() => [
    { label: "All Statuses", value: "all" },
    { label: "Present", value: "present" },
    { label: "Absent", value: "absent" },
    { label: "Late", value: "late" },
    { label: "Half Day", value: "half day" },
    { label: "Leave", value: "leave" },
  ], []);

  const workModeOptions = useMemo(() => [
    { label: "All Work Modes", value: "all" },
    { label: "Office", value: "OFFICE" },
    { label: "WFH", value: "WFH" },
    { label: "Client Site", value: "CLIENT_SITE" },
  ], []);

  const clientSiteOptions = useMemo(() => [
    { label: "All Client Sites", value: "all" },
    ...clientSites.map((cs) => ({
      label: cs.name,
      value: cs.name,
    })),
  ], [clientSites]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Screen 2: Dedicated Employee Attendance Details State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailsMonth, setDetailsMonth] = useState(MONTH_OPTIONS[DEFAULT_MONTH_INDEX]);
  const [detailsLogs, setDetailsLogs] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [detailsPage, setDetailsPage] = useState(1);
  const DETAILS_PAGE_SIZE = 10;

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
        pageSize: activePageSize,
        empCode: selectedEmp !== "all" ? selectedEmp : undefined,
        department: selectedDept !== "all" ? selectedDept : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        work_mode: selectedWorkMode !== "all" ? selectedWorkMode : undefined,
        client_site: selectedClientSite !== "all" ? selectedClientSite : undefined,
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
        setTotalPages(res.total_pages || Math.max(1, Math.ceil((res.total || 0) / activePageSize)));
        if (Array.isArray(res.departments)) setDepartments(res.departments);
        if (Array.isArray(res.team_members)) setTeamMembers(res.team_members);
        if (Array.isArray(res.client_sites)) setClientSites(res.client_sites);
      } else if (Array.isArray(res)) {
        setLogs(res);
        setTotal(res.length);
        setTotalPages(Math.max(1, Math.ceil(res.length / activePageSize)));
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
    selectedWorkMode,
    selectedClientSite,
    search,
    page,
    activePageSize,
  ]);

  // Initial and trigger load
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [isMobile, search, selectedEmp, selectedDept, selectedStatus, selectedWorkMode, selectedClientSite, dateMode, selectedDate, startDate, endDate]);

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

  // Reset Filters
  const handleResetFilters = () => {
    setDateMode("single");
    setSelectedMonth(MONTH_OPTIONS[DEFAULT_MONTH_INDEX]);
    setSelectedDate(getTodayISO());
    setStartDate(getPastDateISO(6));
    setEndDate(getTodayISO());
    setSelectedEmp("all");
    setSelectedDept("all");
    setSelectedStatus("all");
    setSelectedWorkMode("all");
    setSelectedClientSite("all");
    setSearch("");
    setPage(1);
    managerToast.info("Filters reset to default current date.", { title: "Filters Reset" });
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
      "Work Mode",
      "Client Site",
      "Date",
      "Check-In",
      "Check-Out",
      "Working Hours",
      "Status",
      "Late/Early Indicator",
      "Remark"
    ];

    const rows = logs.map((r) => [
      `"${(r.employee_name || r.name || "").replace(/"/g, '""')}"`,
      `"${(r.emp_code || "").replace(/"/g, '""')}"`,
      `"${(r.department || "").replace(/"/g, '""')}"`,
      `"${(r.work_mode || "OFFICE").replace(/"/g, '""')}"`,
      `"${(r.client_site_name || r.client_site || "—").replace(/"/g, '""')}"`,
      `"${(r.date || "").replace(/"/g, '""')}"`,
      `"${(r.check_in || "—").replace(/"/g, '""')}"`,
      `"${(r.check_out || "—").replace(/"/g, '""')}"`,
      `"${(r.working_hours || "0h 00m").replace(/"/g, '""')}"`,
      `"${(r.status || "Absent").replace(/"/g, '""')}"`,
      `"${(r.is_late ? (r.late_by || "Late Punch") : (r.status === "Present" ? "On Time" : "—")).replace(/"/g, '""')}"`,
      `"${(r.remark || "—").replace(/"/g, '""')}"`
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

  // Pagination page numbers list
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

  // ─── Fetch Selected Employee Full Month History (Screen 2) ────────────────
  const fetchEmployeeHistory = useCallback(async (empCode, month, year) => {
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const daysInMonth = new Date(year, month, 0).getDate();
      const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
      const endStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      const res = await getAttendanceLogs({
        empCode,
        startDate: startStr,
        endDate: endStr,
        page: 1,
        pageSize: 31,
      });

      if (res && Array.isArray(res.records)) {
        setDetailsLogs(res.records);
      } else if (Array.isArray(res)) {
        setDetailsLogs(res);
      } else {
        setDetailsLogs([]);
      }
    } catch (err) {
      console.error("Failed to load employee details history:", err);
      setDetailsError("Unable to load employee attendance records.");
      setDetailsLogs([]);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  // When selectedEmployee or detailsMonth changes, fetch history
  useEffect(() => {
    if (selectedEmployee?.emp_code) {
      fetchEmployeeHistory(
        selectedEmployee.emp_code,
        detailsMonth.month,
        detailsMonth.year
      );
      setDetailsPage(1);
    }
  }, [selectedEmployee, detailsMonth, fetchEmployeeHistory]);

  // Calculate Dynamic Attendance Summary for Screen 2
  const attendanceSummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let notStarted = 0;

    detailsLogs.forEach((rec) => {
      const s = (rec.status || "").toLowerCase();
      if (rec.is_late || s.includes("late")) {
        late++;
      }
      if (s.includes("present") || (rec.check_in && rec.check_in !== "—" && rec.check_in !== "-")) {
        present++;
      } else if (s.includes("absent")) {
        absent++;
      } else if (s.includes("not started") || s.includes("future") || (!rec.check_in || rec.check_in === "—")) {
        notStarted++;
      }
    });

    return { present, absent, late, notStarted };
  }, [detailsLogs]);

  // Paginated Details Logs for Screen 2
  const totalDetailsPages = Math.max(1, Math.ceil(detailsLogs.length / DETAILS_PAGE_SIZE));
  const paginatedDetailsLogs = useMemo(() => {
    const start = (detailsPage - 1) * DETAILS_PAGE_SIZE;
    return detailsLogs.slice(start, start + DETAILS_PAGE_SIZE);
  }, [detailsLogs, detailsPage]);

  const detailsPageNumbers = useMemo(() => {
    const list = [];
    for (let i = 1; i <= Math.min(5, totalDetailsPages); i++) {
      list.push(i);
    }
    return list;
  }, [totalDetailsPages]);

  return (
    <div className="mp-logs-container">
      {/* ====================================================================
          MOBILE VIEW (SCREEN 1 or SCREEN 2)
          ==================================================================== */}
      <div className="mp-logs-mobile-view">
        {selectedEmployee ? (
          /* ────────────────────────────────────────────────────────────────
             SCREEN 2: EMPLOYEE ATTENDANCE DETAILS
             ──────────────────────────────────────────────────────────────── */
          <div className="mp-details-view">
            {/* Header with Back button */}
            <div className="mp-details-header">
              <button
                type="button"
                className="mp-details-back-btn"
                onClick={() => setSelectedEmployee(null)}
              >
                <ArrowLeft size={20} />
                <span>Employee Attendance Details</span>
              </button>
              <p className="mp-details-subtitle">
                Complete attendance log and activity details for the selected employee.
              </p>
            </div>

            {/* Profile Summary Card */}
            <div className="mp-details-profile-card">
              <div className="mp-details-profile-top">
                <div className="mp-details-profile-main">
                  <div className="mp-details-avatar">
                    {getInitials(selectedEmployee.employee_name || selectedEmployee.name)}
                  </div>
                  <div>
                    <h3 className="mp-details-emp-name">
                      {selectedEmployee.employee_name || selectedEmployee.name}
                    </h3>
                    <p className="mp-details-emp-desig">
                      {selectedEmployee.designation || "Employee"}
                    </p>
                  </div>
                </div>
                <span className="mp-details-code-pill">
                  {selectedEmployee.emp_code}
                </span>
              </div>

              <div className="mp-details-profile-row">
                <div className="mp-details-info-item">
                  <div className="mp-details-info-val">
                    <Building2 size={15} color="#4B5563" />
                    <span>{selectedEmployee.department || "Operations"}</span>
                  </div>
                  <span className="mp-details-info-lbl">Department</span>
                </div>

                <div className="mp-details-info-item">
                  <div className="mp-details-info-val">
                    <Building2 size={15} color="#4B5563" />
                    <span>
                      {selectedEmployee.work_mode === "WFH"
                        ? "WFH"
                        : selectedEmployee.work_mode === "CLIENT_SITE"
                        ? "Site"
                        : "Office"}
                    </span>
                  </div>
                  <span className="mp-details-info-lbl">Work Mode</span>
                </div>

                <div className="mp-details-info-item">
                  <div className="mp-details-info-val">
                    <MapPin size={15} color="#4B5563" />
                    <span>
                      {selectedEmployee.client_site_name ||
                        selectedEmployee.client_site ||
                        "—"}
                    </span>
                  </div>
                  <span className="mp-details-info-lbl">Client Site</span>
                </div>
              </div>
            </div>

            {/* 4 Metrics Summary Cards Grid */}
            <div className="mp-details-summary-grid">
              <div className="mp-summary-card present">
                <div className="mp-summary-icon-wrap">
                  <Calendar size={16} color="#059669" />
                </div>
                <span className="mp-summary-label">Present</span>
                <span className="mp-summary-val">{attendanceSummary.present}</span>
                <span className="mp-summary-sub">Days</span>
              </div>

              <div className="mp-summary-card absent">
                <div className="mp-summary-icon-wrap">
                  <Calendar size={16} color="#DC2626" />
                </div>
                <span className="mp-summary-label">Absent</span>
                <span className="mp-summary-val">{attendanceSummary.absent}</span>
                <span className="mp-summary-sub">Days</span>
              </div>

              <div className="mp-summary-card late">
                <div className="mp-summary-icon-wrap">
                  <Clock size={16} color="#D97706" />
                </div>
                <span className="mp-summary-label">Late</span>
                <span className="mp-summary-val">{attendanceSummary.late}</span>
                <span className="mp-summary-sub">Days</span>
              </div>

              <div className="mp-summary-card not-started">
                <div className="mp-summary-icon-wrap">
                  <Clock size={16} color="#4B5563" />
                </div>
                <span className="mp-summary-label">Not Started</span>
                <span className="mp-summary-val">{attendanceSummary.notStarted}</span>
                <span className="mp-summary-sub">Days</span>
              </div>
            </div>

            {/* Attendance Logs Section with Month Selector */}
            <div className="mp-details-logs-section">
              <div className="mp-details-logs-header">
                <h3 className="mp-details-logs-title">Attendance Logs</h3>
                <div className="mp-details-month-select-wrap">
                  <button
                    type="button"
                    className="mp-details-month-btn"
                    onClick={() => setDetailsMonthPickerOpen(true)}
                  >
                    <Calendar size={14} color="#6B7280" />
                    <span>{detailsMonth.label}</span>
                    <ChevronDown size={14} color="#6B7280" />
                  </button>
                </div>
              </div>

              {/* Error in details */}
              {detailsError && !detailsLoading && (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    background: "#FFFFFF",
                    borderRadius: 14,
                    border: "1px solid #E5E7EB",
                    color: "#DC2626",
                    fontSize: 13,
                  }}
                >
                  <AlertCircle size={24} style={{ marginBottom: 6 }} />
                  <div>{detailsError}</div>
                  <button
                    onClick={() =>
                      fetchEmployeeHistory(
                        selectedEmployee.emp_code,
                        detailsMonth.month,
                        detailsMonth.year
                      )
                    }
                    className="mp-logs-btn mp-logs-btn-primary"
                    style={{ marginTop: 10, height: 34, fontSize: 12 }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Individual Attendance Cards for Employee History */}
              {!detailsError && (
                <>
                <div className="mp-details-cards-list">
                  {detailsLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={`det-skel-${idx}`}
                        style={{
                          height: 120,
                          borderRadius: 12,
                          background:
                            "linear-gradient(90deg, #F3EEFF 25%, #E6E3EE 50%, #F3EEFF 75%)",
                          backgroundSize: "200% 100%",
                          animation: "mp-shimmer 1.5s infinite",
                        }}
                      />
                    ))
                  ) : detailsLogs.length === 0 ? (
                    <div
                      style={{
                        padding: 36,
                        textAlign: "center",
                        background: "#FFFFFF",
                        borderRadius: 14,
                        border: "1px solid #E5E7EB",
                        color: "#6B7280",
                        fontSize: 13.5,
                      }}
                    >
                      No attendance records found for this month.
                    </div>
                  ) : (
                    paginatedDetailsLogs.map((row) => (
                      <div key={row.id} className="mp-details-day-card">
                        <div className="mp-details-day-header">
                          <div className="mp-details-day-date">
                            <Calendar size={13} color="#7C3AED" />
                            <span>{row.date}</span>
                          </div>
                          <span
                            className={`mp-status-pill ${getStatusClass(
                              row.status
                            )}`}
                          >
                            <span className="mp-status-dot" />
                            {row.status || "Absent"}
                          </span>
                        </div>

                        <div className="mp-details-day-grid">
                          <div className="mp-details-grid-box">
                            <span className="mp-details-box-lbl">Check-in</span>
                            <div className="mp-details-box-val">
                              <Clock size={12} color="#059669" />
                              <span>{row.check_in && row.check_in !== "—" ? row.check_in : "—"}</span>
                            </div>
                          </div>

                          <div className="mp-details-grid-box">
                            <span className="mp-details-box-lbl">Check-out</span>
                            <div className="mp-details-box-val">
                              <Clock size={12} color="#6B7280" />
                              <span>{row.check_out && row.check_out !== "—" ? row.check_out : "—"}</span>
                            </div>
                          </div>

                          <div className="mp-details-grid-box">
                            <span className="mp-details-box-lbl">Working Hours</span>
                            <div className="mp-details-box-val">
                              <Clock size={12} color="#7C3AED" />
                              <span>{row.working_hours && row.working_hours !== "—" ? row.working_hours : "—"}</span>
                            </div>
                          </div>

                          <div className="mp-details-grid-box">
                            <span className="mp-details-box-lbl">Late / Early</span>
                            <div className="mp-details-box-val">
                              <span style={{ color: row.is_late ? "#D97706" : "#059669" }}>
                                {row.late_by && row.late_by !== "—" && row.late_by !== "-" ? row.late_by : "On Time"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination Footer */}
                {!detailsLoading && detailsLogs.length > 0 && (
                  <div className="mp-details-pagination">
                    <button
                      type="button"
                      className="mp-pagination-btn"
                      disabled={detailsPage <= 1}
                      onClick={() => setDetailsPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {detailsPageNumbers.map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`mp-pagination-btn ${
                          num === detailsPage ? "active" : ""
                        }`}
                        onClick={() => setDetailsPage(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="mp-pagination-btn"
                      disabled={detailsPage >= totalDetailsPages}
                      onClick={() =>
                        setDetailsPage((p) => Math.min(totalDetailsPages, p + 1))
                      }
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        ) : (
          /* ────────────────────────────────────────────────────────────────
             SCREEN 1: ATTENDANCE LOG LIST (4 EMPLOYEES AT A TIME)
             ──────────────────────────────────────────────────────────────── */
          <>
            {/* Header Title & Subtitle with Clock Icon */}
            <div className="mp-logs-title-wrap">
              <div className="mp-logs-title-row">
                <h2>Attendance Log</h2>
                <Clock size={19} className="mp-logs-title-clock" />
              </div>
              <p>
                Real-time biometric, web, and mobile attendance logs with punch timings and status tracking.
              </p>
            </div>

            {/* Top Actions: Refresh & Export CSV */}
            <div className="mp-logs-header-actions">
              <button
                type="button"
                className="mp-logs-btn"
                onClick={() => fetchLogs(true)}
                disabled={loading || refreshing}
              >
                <RefreshCw size={15} className={refreshing ? "mp-spin" : ""} />
                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>

              <button
                type="button"
                className="mp-logs-btn mp-logs-btn-primary"
                onClick={handleExportCSV}
                disabled={loading || logs.length === 0}
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Date Mode Toggle */}
            <div className="mp-logs-mode-toggle mp-logs-mobile-toggle">
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

            {/* Date Selection Controls */}
            {dateMode === "single" ? (
              <div className="mp-logs-mobile-date-wrap">
                <button
                  type="button"
                  className="mp-logs-month-trigger"
                  onClick={() => setMonthPickerOpen(true)}
                  aria-label="Select month and year"
                >
                  <div className="mp-logs-month-trigger-left">
                    <Calendar size={16} className="mp-logs-month-trigger-icon" />
                    <span>{selectedMonth.label}</span>
                  </div>
                  <ChevronDown size={16} className="mp-logs-month-trigger-chevron" />
                </button>
              </div>
            ) : (
              <div className="mp-logs-mobile-range-wrap">
                <input
                  type="date"
                  className="mp-logs-date-control"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  onClick={(e) => {
                    try {
                      e.target.showPicker?.();
                    } catch {}
                  }}
                  title="Start date"
                  aria-label="Start date"
                />
                <input
                  type="date"
                  className="mp-logs-date-control"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  onClick={(e) => {
                    try {
                      e.target.showPicker?.();
                    } catch {}
                  }}
                  title="End date"
                  aria-label="End date"
                />
              </div>
            )}

            {/* Stacked 5 Filter Dropdowns (Premium Custom Dropdowns) */}
            <div className="mp-logs-filters-stack">
              {/* 1. All Employees with In-Dropdown Search */}
              <ManagerSelect
                id="mp-filter-employee"
                value={selectedEmp}
                onChange={(val) => {
                  setSelectedEmp(val);
                  setPage(1);
                }}
                options={employeeOptions}
                placeholder="All Employees"
                searchable={true}
                searchPlaceholder="Search employee by name or ID..."
                fullWidth={true}
              />

              {/* 2. All Departments */}
              <ManagerSelect
                id="mp-filter-department"
                value={selectedDept}
                onChange={(val) => {
                  setSelectedDept(val);
                  setPage(1);
                }}
                options={departmentOptions}
                placeholder="All Departments"
                fullWidth={true}
              />

              {/* 3. All Statuses */}
              <ManagerSelect
                id="mp-filter-status"
                value={selectedStatus}
                onChange={(val) => {
                  setSelectedStatus(val);
                  setPage(1);
                }}
                options={statusOptions}
                placeholder="All Statuses"
                fullWidth={true}
              />

              {/* 4. All Work Modes */}
              <ManagerSelect
                id="mp-filter-workmode"
                value={selectedWorkMode}
                onChange={(val) => {
                  setSelectedWorkMode(val);
                  setPage(1);
                }}
                options={workModeOptions}
                placeholder="All Work Modes"
                fullWidth={true}
              />

              {/* 5. All Client Sites */}
              <ManagerSelect
                id="mp-filter-clientsite"
                value={selectedClientSite}
                onChange={(val) => {
                  setSelectedClientSite(val);
                  setPage(1);
                }}
                options={clientSiteOptions}
                placeholder="All Client Sites"
                fullWidth={true}
              />

              {/* Search Bar */}
              <div className="mp-logs-search-wrap">
                <Search size={16} color="#9CA3AF" />
                <input
                  type="text"
                  className="mp-logs-search-input"
                  placeholder="Search employee by name or code..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#9CA3AF",
                      padding: "4px",
                    }}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Reset Button on Mobile */}
              <button
                type="button"
                className="mp-logs-reset-btn"
                onClick={handleResetFilters}
                style={{ width: "100%", height: "46px" }}
              >
                <RotateCcw size={15} />
                <span>Reset Filters</span>
              </button>
            </div>

            {/* Error Message */}
            {error && !loading && (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  background: "#FFFFFF",
                  borderRadius: 14,
                  border: "1px solid #E5E7EB",
                  color: "#DC2626",
                  fontSize: 13,
                }}
              >
                <AlertCircle size={24} style={{ marginBottom: 6 }} />
                <div>{error}</div>
                <button
                  onClick={() => fetchLogs()}
                  className="mp-logs-btn mp-logs-btn-primary"
                  style={{ marginTop: 10, height: 34, fontSize: 12 }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Exactly 4 Employee Cards on Mobile */}
            {!error && (
              <div className="mp-logs-mobile-list">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`card-skel-${idx}`}
                      style={{
                        height: 170,
                        borderRadius: 14,
                        background:
                          "linear-gradient(90deg, #F3EEFF 25%, #E6E3EE 50%, #F3EEFF 75%)",
                        backgroundSize: "200% 100%",
                        animation: "mp-shimmer 1.5s infinite",
                      }}
                    />
                  ))
                ) : logs.length === 0 ? (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      background: "#FFFFFF",
                      borderRadius: 14,
                      border: "1px solid #E5E7EB",
                      color: "#6B7280",
                      fontSize: 14,
                    }}
                  >
                    No attendance logs found matching current filters.
                  </div>
                ) : (
                  logs.map((row) => {
                    const empName = row.employee_name || row.name || row.emp_code;
                    const initials = getInitials(empName);
                    return (
                      <div
                        className="mp-logs-emp-card"
                        key={row.id}
                        onClick={() => setSelectedEmployee(row)}
                        title="View employee attendance history"
                      >
                        {/* Card Top: Avatar, Name, Designation, Department, Code, Chevron */}
                        <div className="mp-logs-card-head">
                          <div className="mp-logs-card-profile">
                            <div className="mp-logs-avatar">{initials}</div>
                            <div className="mp-logs-profile-text">
                              <span className="mp-logs-emp-name">{empName}</span>
                              <span className="mp-logs-emp-desig">
                                {(() => {
                                  const desig = (row.designation || "").trim();
                                  const dept = (row.department || "").trim();
                                  if (desig && dept && desig.toLowerCase() !== dept.toLowerCase()) {
                                    return `${desig} • ${dept}`;
                                  }
                                  return desig || dept || "Employee";
                                })()}
                              </span>
                            </div>
                          </div>
                          <div className="mp-logs-card-head-right">
                            <span className="mp-logs-code-badge">
                              {row.emp_code}
                            </span>
                            <ChevronRight size={18} className="mp-logs-chevron" />
                          </div>
                        </div>

                        {/* Card Date & Status Bar */}
                        <div className="mp-logs-card-date-bar">
                          <div className="mp-logs-date-chip">
                            <Calendar size={13} className="mp-logs-chip-icon" />
                            <span>{row.date || selectedDate}</span>
                          </div>
                          <span
                            className={`mp-status-pill ${getStatusClass(
                              row.status
                            )}`}
                          >
                            <span className="mp-status-dot" />
                            {row.status || "Absent"}
                          </span>
                        </div>

                        {/* Card 2x2 Details Grid */}
                        <div className="mp-logs-card-grid">
                          {/* Check-in */}
                          <div className="mp-logs-grid-item">
                            <span className="mp-logs-grid-lbl">Check-in</span>
                            <div className="mp-logs-grid-val">
                              <Clock size={12} color="#059669" />
                              <span>
                                {row.check_in && row.check_in !== "—"
                                  ? row.check_in
                                  : "—"}
                              </span>
                            </div>
                          </div>

                          {/* Check-out */}
                          <div className="mp-logs-grid-item">
                            <span className="mp-logs-grid-lbl">Check-out</span>
                            <div className="mp-logs-grid-val">
                              <Clock size={12} color="#6B7280" />
                              <span>
                                {row.check_out && row.check_out !== "—"
                                  ? row.check_out
                                  : "—"}
                              </span>
                            </div>
                          </div>

                          {/* Working Hours */}
                          <div className="mp-logs-grid-item">
                            <span className="mp-logs-grid-lbl">Working Hours</span>
                            <div className="mp-logs-grid-val">
                              <Clock size={12} color="#7C3AED" />
                              <span>
                                {row.working_hours && row.working_hours !== "—"
                                  ? row.working_hours
                                  : "—"}
                              </span>
                            </div>
                          </div>

                          {/* Work Mode & Client Site */}
                          <div className="mp-logs-grid-item">
                            <span className="mp-logs-grid-lbl">Work Mode & Site</span>
                            <div className="mp-logs-grid-val">
                              <Building2 size={12} color="#7C3AED" />
                              <span>
                                {row.work_mode === "WFH"
                                  ? "WFH"
                                  : row.work_mode === "CLIENT_SITE"
                                  ? "Site"
                                  : "Office"}
                                {row.client_site_name || row.client_site
                                  ? ` (${row.client_site_name || row.client_site})`
                                  : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Pagination: Showing 4 of X logs */}
            {!loading && logs.length > 0 && (
              <div className="mp-logs-pagination">
                <span className="mp-logs-pagination-info">
                  Showing {Math.min(total, logs.length)} of {total} logs
                </span>

                <div className="mp-logs-page-nav">
                  <button
                    type="button"
                    className="mp-pagination-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {pageNumbers.map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`mp-pagination-btn ${
                        num === page ? "active" : ""
                      }`}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="mp-pagination-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ====================================================================
          DESKTOP VIEW (PRESERVED TABLE & FILTERING)
          ==================================================================== */}
      <div className="mp-logs-desktop-view">
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

        {/* Dynamic Filters Card — Professional 2-Row Layout */}
        <div className="mp-logs-filter-card">
          {/* Row 1: [ Single Date | Date Range ] [ Date ] [ Employees ] [ Departments ] */}
          <div className="mp-logs-filter-row mp-logs-filter-row-1">
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
              <div className="mp-logs-date-field-wrap">
                <input
                  type="date"
                  className="mp-logs-date-control"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setPage(1);
                  }}
                  onClick={(e) => {
                    try {
                      e.target.showPicker?.();
                    } catch {}
                  }}
                  style={{ width: "170px" }}
                  aria-label="Select date"
                />
              </div>
            ) : (
              <div className="mp-logs-date-range-wrap">
                <input
                  type="date"
                  className="mp-logs-date-control"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  onClick={(e) => {
                    try {
                      e.target.showPicker?.();
                    } catch {}
                  }}
                  style={{ width: "160px" }}
                  title="Start date"
                  aria-label="Start date"
                />
                <span className="mp-logs-range-sep">to</span>
                <input
                  type="date"
                  className="mp-logs-date-control"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  onClick={(e) => {
                    try {
                      e.target.showPicker?.();
                    } catch {}
                  }}
                  style={{ width: "160px" }}
                  title="End date"
                  aria-label="End date"
                />
              </div>
            )}

            {/* Employee Dropdown */}
            <select
              className="mp-logs-select mp-logs-select-emp"
              value={selectedEmp}
              onChange={(e) => {
                setSelectedEmp(e.target.value);
                setPage(1);
              }}
              style={{ flex: "1 1 200px" }}
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
              className="mp-logs-select mp-logs-select-dept"
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              style={{ flex: "1 1 180px" }}
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: [ Status ] [ Work Modes ] [ Client Sites ] [ Search ........ ] [Reset] */}
          <div className="mp-logs-filter-row mp-logs-filter-row-2">
            {/* Status Dropdown */}
            <select
              className="mp-logs-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              style={{ width: "150px" }}
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half day">Half Day</option>
              <option value="leave">Leave</option>
            </select>

            {/* Work Mode Filter */}
            <select
              className="mp-logs-select"
              value={selectedWorkMode}
              onChange={(e) => {
                setSelectedWorkMode(e.target.value);
                setPage(1);
              }}
              style={{ width: "150px" }}
            >
              <option value="all">All Work Modes</option>
              <option value="OFFICE">Office</option>
              <option value="WFH">WFH</option>
              <option value="CLIENT_SITE">Client Site</option>
            </select>

            {/* Client Site Filter */}
            {clientSites.length > 0 && (
              <select
                className="mp-logs-select"
                value={selectedClientSite}
                onChange={(e) => {
                  setSelectedClientSite(e.target.value);
                  setPage(1);
                }}
                style={{ width: "160px" }}
              >
                <option value="all">All Client Sites</option>
                {clientSites.map((cs) => (
                  <option key={cs.id} value={cs.name}>
                    {cs.name}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input (fills available space) */}
            <div className="mp-logs-search-box">
              <Search size={15} className="mp-logs-search-icon" />
              <input
                type="text"
                className="mp-logs-search-input-field"
                placeholder="Search employee name or ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  className="mp-logs-search-clear-btn"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Reset Button */}
            <button
              type="button"
              className="mp-logs-reset-btn"
              onClick={handleResetFilters}
              title="Reset filters to today"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Desktop Table Card */}
        <div className="mp-logs-table-card">
          <div className="mp-logs-table-scroll">
            <table className="mp-logs-table">
              <thead>
                <tr>
                  <th style={{ width: "220px" }}>Employee</th>
                  <th style={{ width: "100px" }}>Employee ID</th>
                  <th style={{ width: "130px" }}>Department</th>
                  <th style={{ width: "110px" }}>Work Mode</th>
                  <th style={{ width: "120px" }}>Client Site</th>
                  <th style={{ width: "120px" }}>Date</th>
                  <th style={{ width: "120px" }}>Check-In</th>
                  <th style={{ width: "120px" }}>Check-Out</th>
                  <th style={{ width: "120px" }}>Working Hours</th>
                  <th style={{ width: "120px" }}>Status</th>
                  <th style={{ width: "140px" }}>Late / Early</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`desk-skel-${idx}`}>
                      <td colSpan={11} style={{ padding: "18px 16px" }}>
                        <div
                          style={{
                            height: "20px",
                            borderRadius: "6px",
                            background:
                              "linear-gradient(90deg, #F3EEFF 25%, #E6E3EE 50%, #F3EEFF 75%)",
                            backgroundSize: "200% 100%",
                            animation: "mp-shimmer 1.5s infinite",
                          }}
                        />
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={11}>
                      <div className="mp-logs-empty-state">
                        <div className="mp-logs-empty-icon">
                          <Calendar size={28} />
                        </div>
                        <h4 className="mp-logs-empty-title">No Attendance Records Found</h4>
                        <p className="mp-logs-empty-desc">
                          No punch or attendance records match your current filter selections.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((row) => {
                    const empName = row.employee_name || row.name || row.emp_code;
                    const initials = getInitials(empName);
                    const hasCheckIn = row.check_in && row.check_in !== "—" && row.check_in !== "-";
                    const hasCheckOut = row.check_out && row.check_out !== "—" && row.check_out !== "-";

                    return (
                      <tr key={row.id}>
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
                        <td>
                          <span className="mp-code-pill">{row.emp_code}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--mp-text-secondary)" }}>
                            {row.department || "Operations"}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "999px",
                              background:
                                row.work_mode === "WFH"
                                  ? "rgba(16,185,129,0.1)"
                                  : row.work_mode === "CLIENT_SITE"
                                  ? "rgba(245,158,11,0.1)"
                                  : "rgba(109,68,245,0.1)",
                              color:
                                row.work_mode === "WFH"
                                  ? "#059669"
                                  : row.work_mode === "CLIENT_SITE"
                                  ? "#b45309"
                                  : "#6D44F5",
                            }}
                          >
                            {row.work_mode === "WFH"
                              ? "🏠 WFH"
                              : row.work_mode === "CLIENT_SITE"
                              ? "🏢 Site"
                              : "🏢 Office"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--mp-text-secondary)", fontWeight: 500 }}>
                            {row.client_site_name || row.client_site || "—"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--mp-text-primary)" }}>
                            {row.date}
                          </span>
                        </td>
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
                        <td>
                          <span className="mp-hours-badge">
                            {row.working_hours || "0h 00m"}
                          </span>
                        </td>
                        <td>
                          <ManagerBadge
                            variant={
                              (row.status || "").toLowerCase().includes("present")
                                ? "present"
                                : (row.status || "").toLowerCase().includes("absent")
                                ? "absent"
                                : (row.status || "").toLowerCase().includes("late")
                                ? "late"
                                : "default"
                            }
                            dot
                          >
                            {row.status || "Absent"}
                          </ManagerBadge>
                        </td>
                        <td>
                          {row.is_late && row.late_by && row.late_by !== "—" ? (
                            <span className="mp-indicator-pill mp-indicator-late">
                              <span className="mp-indicator-dot" />
                              {row.late_by}
                            </span>
                          ) : row.status === "Present" ? (
                            <span className="mp-indicator-pill mp-indicator-ontime">
                              <span className="mp-indicator-dot" />
                              On Time
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Desktop Pagination Bar */}
          {!loading && logs.length > 0 && (
            <div className="mp-logs-pagination">
              <div className="mp-logs-page-info">
                Showing{" "}
                <strong>
                  {Math.min(total, (page - 1) * pageSize + 1)} -{" "}
                  {Math.min(total, page * pageSize)}
                </strong>{" "}
                of <strong>{total}</strong> attendance records
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    color: "var(--mp-text-muted)",
                  }}
                >
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

      {/* ─── Premium Month & Year Picker Popups (Option B) ─── */}
      <MonthYearPicker
        isOpen={monthPickerOpen}
        value={selectedMonth}
        onApply={handleApplyMonth}
        onCancel={() => setMonthPickerOpen(false)}
      />

      <MonthYearPicker
        isOpen={detailsMonthPickerOpen}
        value={detailsMonth}
        onApply={(newMonth) => {
          setDetailsMonth(newMonth);
          setDetailsMonthPickerOpen(false);
        }}
        onCancel={() => setDetailsMonthPickerOpen(false)}
      />
    </div>
  );
};

export default AttendanceLogs;
