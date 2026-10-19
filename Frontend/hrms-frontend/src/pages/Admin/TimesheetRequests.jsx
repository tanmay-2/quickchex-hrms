import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  X,
  Download,
  ArrowUpDown,
  Pencil,
  FileSpreadsheet,
  RotateCcw,
  User,
  Briefcase,
  List,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./TimesheetRequests.css";
import { getApiUrl } from "../../services/apiClient";
import { loadUnifiedEmployees } from "../../utils/employeeStore";

/* =========================================================
   CONSTANTS & DEFAULT DATA
   ========================================================= */

const MONTHS = [
  "January-2026",
  "February-2026",
  "March-2026",
  "April-2026",
  "May-2026",
  "June-2026",
  "July-2026",
  "August-2026",
  "September-2026",
  "October-2026",
  "November-2026",
  "December-2026",
];

const STORAGE_KEY = "hrms_timesheet_requests_data";

const DEFAULT_TIMESHEETS = [
  {
    id: "EMP001",
    empCode: "EMP001",
    employeeName: "Aaquib Khan",
    initials: "AK",
    department: "Engineering",
    designation: "Senior Lead Developer",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "17 Aug 2026",
    totalHours: "80h 30m",
    hoursNumeric: 80.5,
    status: "Pending",
    approvedCount: 0,
    pendingCount: 1,
    avatarTone: "avatar-a",
    month: "August-2026",
  },
  {
    id: "EMP003",
    empCode: "LE249",
    employeeName: "Payal Mundhe",
    initials: "PM",
    department: "HR",
    designation: "HR Specialist",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "16 Aug 2026",
    totalHours: "72h 00m",
    hoursNumeric: 72.0,
    status: "Pending",
    approvedCount: 0,
    pendingCount: 1,
    avatarTone: "avatar-b",
    month: "August-2026",
  },
  {
    id: "ADM003",
    empCode: "ADM003",
    employeeName: "Janhavi Samant",
    initials: "JS",
    department: "Operations",
    designation: "Operations Lead",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "16 Aug 2026",
    totalHours: "68h 15m",
    hoursNumeric: 68.25,
    status: "Pending",
    approvedCount: 0,
    pendingCount: 1,
    avatarTone: "avatar-c",
    month: "August-2026",
  },
  {
    id: "LE214",
    empCode: "LE214",
    employeeName: "Krishna",
    initials: "KB",
    department: "Operations",
    designation: "Operations Analyst",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "15 Aug 2026",
    totalHours: "76h 45m",
    hoursNumeric: 76.75,
    status: "Pending",
    approvedCount: 0,
    pendingCount: 1,
    avatarTone: "avatar-d",
    month: "August-2026",
  },
  {
    id: "LE243",
    empCode: "LE243",
    employeeName: "Parth Patil",
    initials: "PP",
    department: "Technology",
    designation: "Cloud Architect",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "15 Aug 2026",
    totalHours: "82h 00m",
    hoursNumeric: 82.0,
    status: "Pending",
    approvedCount: 0,
    pendingCount: 1,
    avatarTone: "avatar-e",
    month: "August-2026",
  },
  {
    id: "LE252",
    empCode: "LE252",
    employeeName: "Tanmay Salgoankar",
    initials: "TS",
    department: "Design",
    designation: "UI/UX Designer",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "14 Aug 2026",
    totalHours: "74h 30m",
    hoursNumeric: 74.5,
    status: "Pending",
    approvedCount: 0,
    pendingCount: 1,
    avatarTone: "avatar-f",
    month: "August-2026",
  },
  // 12 Approved requests
  {
    id: "EMP002",
    empCode: "EMP002",
    employeeName: "Payal Kaur",
    initials: "PK",
    department: "Operations",
    designation: "Operations Executive",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "14 Aug 2026",
    totalHours: "80h 00m",
    hoursNumeric: 80.0,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-a",
    month: "August-2026",
  },
  {
    id: "EMP004",
    empCode: "LE724",
    employeeName: "Elena Rostova",
    initials: "ER",
    department: "Engineering",
    designation: "Senior Frontend Engineer",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "13 Aug 2026",
    totalHours: "84h 45m",
    hoursNumeric: 84.75,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-b",
    month: "August-2026",
  },
  {
    id: "EMP005",
    empCode: "MGR001",
    employeeName: "Kevin John",
    initials: "KJ",
    department: "Management",
    designation: "Engineering Manager",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "13 Aug 2026",
    totalHours: "80h 00m",
    hoursNumeric: 80.0,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-c",
    month: "August-2026",
  },
  {
    id: "EMP006",
    empCode: "EMP006",
    employeeName: "Rohit Sharma",
    initials: "RS",
    department: "Engineering",
    designation: "Backend Developer",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "12 Aug 2026",
    totalHours: "78h 30m",
    hoursNumeric: 78.5,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-d",
    month: "August-2026",
  },
  {
    id: "EMP007",
    empCode: "LE855",
    employeeName: "Aachal",
    initials: "AA",
    department: "QA",
    designation: "QA Engineer",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "12 Aug 2026",
    totalHours: "75h 00m",
    hoursNumeric: 75.0,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-e",
    month: "August-2026",
  },
  {
    id: "EMP008",
    empCode: "LE902",
    employeeName: "Siddharth Verma",
    initials: "SV",
    department: "Technology",
    designation: "DevOps Engineer",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "11 Aug 2026",
    totalHours: "82h 15m",
    hoursNumeric: 82.25,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-f",
    month: "August-2026",
  },
  {
    id: "EMP009",
    empCode: "LE915",
    employeeName: "Neha Gupta",
    initials: "NG",
    department: "Finance",
    designation: "Financial Analyst",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "11 Aug 2026",
    totalHours: "79h 30m",
    hoursNumeric: 79.5,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-a",
    month: "August-2026",
  },
  {
    id: "EMP010",
    empCode: "LE922",
    employeeName: "Amitabh Sen",
    initials: "AS",
    department: "Engineering",
    designation: "Full Stack Engineer",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "10 Aug 2026",
    totalHours: "80h 00m",
    hoursNumeric: 80.0,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-b",
    month: "August-2026",
  },
  {
    id: "EMP011",
    empCode: "LE935",
    employeeName: "Pooja Hegde",
    initials: "PH",
    department: "Marketing",
    designation: "Content Strategist",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "10 Aug 2026",
    totalHours: "73h 45m",
    hoursNumeric: 73.75,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-c",
    month: "August-2026",
  },
  {
    id: "EMP012",
    empCode: "LE944",
    employeeName: "Vikas Dubey",
    initials: "VD",
    department: "Operations",
    designation: "Operations Executive",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "09 Aug 2026",
    totalHours: "77h 15m",
    hoursNumeric: 77.25,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-d",
    month: "August-2026",
  },
  {
    id: "EMP013",
    empCode: "LE950",
    employeeName: "Ritu Singhal",
    initials: "RS",
    department: "HR",
    designation: "Recruiter",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "09 Aug 2026",
    totalHours: "71h 30m",
    hoursNumeric: 71.5,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-e",
    month: "August-2026",
  },
  {
    id: "EMP014",
    empCode: "LE961",
    employeeName: "Manoj Bajpai",
    initials: "MB",
    department: "Design",
    designation: "Visual Designer",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "08 Aug 2026",
    totalHours: "78h 00m",
    hoursNumeric: 78.0,
    status: "Approved",
    approvedCount: 1,
    pendingCount: 0,
    avatarTone: "avatar-f",
    month: "August-2026",
  },
  // 3 Rejected requests
  {
    id: "EMP015",
    empCode: "LE970",
    employeeName: "Deepak Chavan",
    initials: "DC",
    department: "Operations",
    designation: "Operations Associate",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "08 Aug 2026",
    totalHours: "56h 00m",
    hoursNumeric: 56.0,
    status: "Rejected",
    approvedCount: 0,
    pendingCount: 0,
    avatarTone: "avatar-a",
    month: "August-2026",
  },
  {
    id: "EMP016",
    empCode: "LE982",
    employeeName: "Priyanka Naik",
    initials: "PN",
    department: "Finance",
    designation: "Accountant",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "07 Aug 2026",
    totalHours: "52h 30m",
    hoursNumeric: 52.5,
    status: "Rejected",
    approvedCount: 0,
    pendingCount: 0,
    avatarTone: "avatar-b",
    month: "August-2026",
  },
  {
    id: "EMP017",
    empCode: "LE991",
    employeeName: "Sanjay Mishra",
    initials: "SM",
    department: "Technology",
    designation: "Support Specialist",
    period: "01 Aug – 15 Aug 2026",
    submissionDate: "06 Aug 2026",
    totalHours: "48h 15m",
    hoursNumeric: 48.25,
    status: "Rejected",
    approvedCount: 0,
    pendingCount: 0,
    avatarTone: "avatar-c",
    month: "August-2026",
  },
];

function TimesheetRequests() {
  const navigate = useNavigate();

  // State
  const [selectedMonth, setSelectedMonth] = useState("August-2026");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [selectedIds, setSelectedIds] = useState([]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [desktopMonthOpen, setDesktopMonthOpen] = useState(false);
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const actionsRef = useRef(null);
  const sortRef = useRef(null);
  const monthDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const desktopMonthRef = useRef(null);

  // Initialize and load timesheets
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadData() {
      try {
        // 1. Check local storage cache for existing user modifications
        const cached = localStorage.getItem(STORAGE_KEY);
        let baseList = [];
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 25) {
              baseList = parsed;
            }
          } catch {
            baseList = [];
          }
        }

        if (baseList.length === 0) {
          baseList = [...DEFAULT_TIMESHEETS];
        }

        // 2. Fetch unified employees to enrich employee names/departments from DB
        try {
          const unified = await loadUnifiedEmployees();
          if (Array.isArray(unified) && unified.length > 0) {
            const unifiedMap = new Map();
            unified.forEach((u) => {
              const code = (u.emp_code || u.employee_id || u.id || "").trim().toUpperCase();
              if (code) unifiedMap.set(code, u);
            });

            baseList = baseList.map((item) => {
              const matched = unifiedMap.get((item.empCode || item.id || "").toUpperCase());
              if (matched) {
                const name =
                  matched.name ||
                  `${matched.first_name || ""} ${matched.last_name || ""}`.trim() ||
                  item.employeeName;
                return {
                  ...item,
                  employeeName: name,
                  department: matched.department || item.department,
                  designation: matched.designation || item.designation,
                };
              }
              return item;
            });
          }
        } catch (fetchErr) {
          console.warn("Unified employees load skipped, using base list:", fetchErr);
        }

        if (isMounted) {
          setEmployees(baseList);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(baseList));
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load timesheet requests:", err);
          setError("Failed to load timesheet requests.");
          setEmployees(DEFAULT_TIMESHEETS);
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync state helper to persist updates
  const updateTimesheetsStore = (updatedList) => {
    setEmployees(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.warn("Failed to persist timesheet store:", e);
    }
  };

  // Click outside and keydown listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActionsOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target)) {
        setMonthDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
      if (desktopMonthRef.current && !desktopMonthRef.current.contains(event.target)) {
        setDesktopMonthOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setActionsOpen(false);
        setSortOpen(false);
        setMonthDropdownOpen(false);
        setStatusDropdownOpen(false);
        setDesktopMonthOpen(false);
        setFilterDrawerOpen(false);
        setReviewModalItem(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Distinct departments for filter drawer
  const departmentsList = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.department && e.department.trim()) set.add(e.department.trim());
    });
    return ["all", ...Array.from(set)];
  }, [employees]);

  // Status counts for the selected month
  const counts = useMemo(() => {
    const inMonth = employees.filter(
      (e) => !selectedMonth || e.month === selectedMonth || !e.month
    );
    const pending = inMonth.filter((e) => e.status === "Pending").length;
    const approved = inMonth.filter((e) => e.status === "Approved").length;
    const rejected = inMonth.filter((e) => e.status === "Rejected").length;
    return {
      pending,
      approved,
      rejected,
      total: inMonth.length,
    };
  }, [employees, selectedMonth]);

  // Filtered and sorted employees list
  const filteredEmployees = useMemo(() => {
    let list = employees.filter(
      (e) => !selectedMonth || e.month === selectedMonth || !e.month
    );

    // Search query
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (emp) =>
          emp.employeeName.toLowerCase().includes(query) ||
          emp.empCode.toLowerCase().includes(query) ||
          (emp.department && emp.department.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((emp) => emp.status === statusFilter);
    }

    // Department filter
    if (deptFilter !== "all") {
      list = list.filter((emp) => emp.department === deptFilter);
    }

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === "latest") {
        return (b.submissionDate || "").localeCompare(a.submissionDate || "");
      }
      if (sortBy === "oldest") {
        return (a.submissionDate || "").localeCompare(b.submissionDate || "");
      }
      if (sortBy === "hours-desc") {
        return (b.hoursNumeric || 0) - (a.hoursNumeric || 0);
      }
      if (sortBy === "hours-asc") {
        return (a.hoursNumeric || 0) - (b.hoursNumeric || 0);
      }
      if (sortBy === "name") {
        return a.employeeName.localeCompare(b.employeeName);
      }
      return 0;
    });

    return list;
  }, [employees, selectedMonth, search, statusFilter, deptFilter, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, deptFilter, selectedMonth, sortBy]);

  // Pagination slice for mobile view
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Selection handlers
  const allSelected =
    filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmployees.map((e) => e.id));
    }
  };

  const toggleSelectRow = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Row navigation to details
  const handleRowClick = (id) => {
    navigate(`/dashboard/timesheet-requests/${id}`);
  };

  // Approve single request
  const handleApproveSingle = (id, e) => {
    if (e) e.stopPropagation();
    const updated = employees.map((emp) => {
      if (emp.id === id) {
        return {
          ...emp,
          status: "Approved",
          approvedCount: 1,
          pendingCount: 0,
        };
      }
      return emp;
    });
    updateTimesheetsStore(updated);
    const target = employees.find((x) => x.id === id);
    showToast(`Approved timesheet for ${target?.employeeName || id}`);
    if (reviewModalItem && reviewModalItem.id === id) {
      setReviewModalItem((prev) => (prev ? { ...prev, status: "Approved" } : null));
    }
  };

  // Reject single request
  const handleRejectSingle = (id, e) => {
    if (e) e.stopPropagation();
    const updated = employees.map((emp) => {
      if (emp.id === id) {
        return {
          ...emp,
          status: "Rejected",
          approvedCount: 0,
          pendingCount: 0,
        };
      }
      return emp;
    });
    updateTimesheetsStore(updated);
    const target = employees.find((x) => x.id === id);
    showToast(`Rejected timesheet for ${target?.employeeName || id}`);
    if (reviewModalItem && reviewModalItem.id === id) {
      setReviewModalItem((prev) => (prev ? { ...prev, status: "Rejected" } : null));
    }
  };

  // Bulk Approve
  const handleBulkApprove = () => {
    const targets = selectedIds.length > 0 ? selectedIds : filteredEmployees.filter((e) => e.status === "Pending").map((e) => e.id);
    if (targets.length === 0) {
      showToast("No pending timesheets to approve");
      return;
    }
    const updated = employees.map((emp) => {
      if (targets.includes(emp.id)) {
        return {
          ...emp,
          status: "Approved",
          approvedCount: 1,
          pendingCount: 0,
        };
      }
      return emp;
    });
    updateTimesheetsStore(updated);
    showToast(`Approved timesheets for ${targets.length} employee(s)`);
    setSelectedIds([]);
    setActionsOpen(false);
  };

  // Bulk Reject
  const handleBulkReject = () => {
    const targets = selectedIds.length > 0 ? selectedIds : filteredEmployees.filter((e) => e.status === "Pending").map((e) => e.id);
    if (targets.length === 0) {
      showToast("No pending timesheets to reject");
      return;
    }
    const updated = employees.map((emp) => {
      if (targets.includes(emp.id)) {
        return {
          ...emp,
          status: "Rejected",
          approvedCount: 0,
          pendingCount: 0,
        };
      }
      return emp;
    });
    updateTimesheetsStore(updated);
    showToast(`Rejected timesheets for ${targets.length} employee(s)`);
    setSelectedIds([]);
    setActionsOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const listToExport = filteredEmployees.length > 0 ? filteredEmployees : employees;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Employee Code,Employee Name,Department,Period,Submission Date,Total Hours,Status"]
        .concat(
          listToExport.map(
            (e) =>
              `"${e.empCode}","${e.employeeName}","${e.department || ""}","${e.period}","${e.submissionDate}","${e.totalHours}","${e.status}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timesheet_requests_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionsOpen(false);
    showToast(`Exported ${listToExport.length} timesheet records`);
  };

  // Reset all filters
  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDeptFilter("all");
    setSelectedMonth("August-2026");
    setSortBy("latest");
    showToast("Filters reset to default");
  };

  return (
    <div className="timesheet-requests-page">
      <DashboardHeader />

      {/* =====================================================
          DESKTOP VIEW (>768px): PRESERVED EXISTING TABLE
          ===================================================== */}
      <div className="ts-desktop-view">
        <div className="ts-body">
          <div className="ts-top-bar">
            <h2 className="ts-section-title">Timesheet Requests</h2>

            <div className="ts-controls">
              {/* Search Box */}
              <div className="ts-search-wrap">
                <input
                  type="text"
                  placeholder="Search employee"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ts-search-input"
                />
              </div>

              {/* Filter icon button */}
              <button
                type="button"
                className={`ts-icon-btn ${filterDrawerOpen ? "is-active" : ""}`}
                title="Filters"
                onClick={() => setFilterDrawerOpen((prev) => !prev)}
              >
                <SlidersHorizontal size={17} />
              </button>

              {/* Actions Dropdown */}
              <div className="ts-actions-wrap" ref={actionsRef}>
                <button
                  type="button"
                  className="ts-actions-btn"
                  onClick={() => setActionsOpen((prev) => !prev)}
                  aria-expanded={actionsOpen}
                >
                  Actions
                  <ChevronDown size={15} />
                </button>

                {actionsOpen && (
                  <div className="ts-actions-menu" role="menu">
                    <button type="button" onClick={handleBulkApprove}>
                      <Check size={15} />
                      Bulk Approve Timesheets
                    </button>
                    <button type="button" onClick={handleBulkReject}>
                      <X size={15} />
                      Bulk Reject Timesheets
                    </button>
                    <button type="button" onClick={handleExportCSV}>
                      <Download size={15} />
                      Export CSV
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop Premium Month Selector */}
              <div className="ts-desktop-month-wrap" ref={desktopMonthRef}>
                <button
                  type="button"
                  className={`ts-desktop-month-trigger ${desktopMonthOpen ? "is-open" : ""}`}
                  onClick={() => {
                    setDesktopMonthOpen((prev) => !prev);
                    setActionsOpen(false);
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={desktopMonthOpen}
                >
                  <Calendar size={15} />
                  <span>{selectedMonth.replace("-", " ")}</span>
                  <ChevronDown size={14} className={desktopMonthOpen ? "is-rotated" : ""} />
                </button>

                {desktopMonthOpen && (
                  <div className="ts-desktop-month-popover" role="listbox">
                    <div className="ts-desktop-month-scroll">
                      {MONTHS.map((m) => {
                        const isSelected = selectedMonth === m;
                        const displayMonth = m.replace("-", " ");
                        return (
                          <button
                            key={m}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={`ts-desktop-month-option ${isSelected ? "is-selected" : ""}`}
                            onClick={() => {
                              setSelectedMonth(m);
                              setDesktopMonthOpen(false);
                              showToast(`Viewing ${displayMonth}`);
                            }}
                          >
                            <span>{displayMonth}</span>
                            {isSelected && <Check size={14} className="ts-desktop-month-check" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="ts-table-card">
            <table className="ts-table">
              <thead>
                <tr>
                  <th className="ts-col-check">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th>Employee Name</th>
                  <th>Latest Submission Date</th>
                  <th>No. Of Approved Applications</th>
                  <th>No. Of Pending Applications</th>
                  <th style={{ textAlign: "right", paddingRight: "28px" }}>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                      <Clock size={28} className="ts-spin-icon" />
                      <p style={{ marginTop: "10px", color: "#64748b" }}>Loading timesheet requests...</p>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="ts-empty-state">
                        <Clock size={40} />
                        <h3>No Timesheet Requests Found</h3>
                        <p>Try adjusting your search criteria or month filter.</p>
                        <button type="button" className="ts-clear-btn" onClick={handleClearFilters}>
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = selectedIds.includes(emp.id);

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => handleRowClick(emp.id)}
                        className={isSelected ? "is-selected" : ""}
                      >
                        <td className="ts-col-check" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectRow(emp.id, e)}
                            aria-label={`Select ${emp.employeeName}`}
                          />
                        </td>

                        <td>
                          <div className="ts-emp-cell">
                            <div className={`ts-emp-avatar ${emp.avatarTone}`}>
                              {emp.initials}
                            </div>
                            <span className="ts-emp-name">
                              {emp.employeeName}-{emp.empCode}
                            </span>
                          </div>
                        </td>

                        <td>{emp.submissionDate || emp.latestSubmissionDate || "—"}</td>

                        <td>
                          <span
                            className={`ts-badge-count ${
                              emp.status === "Approved" || emp.approvedCount > 0 ? "approved" : ""
                            }`}
                          >
                            {emp.status === "Approved" ? 1 : emp.approvedCount || 0}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`ts-badge-count ${
                              emp.status === "Pending" || emp.pendingCount > 0 ? "pending" : ""
                            }`}
                          >
                            {emp.status === "Pending" ? 1 : emp.pendingCount || 0}
                          </span>
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              paddingRight: "8px",
                            }}
                          >
                            <button
                              type="button"
                              className="ts-action-edit-btn"
                              title="View Employee Timesheet"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(emp.id);
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
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

      {/* =====================================================
          MOBILE VIEW (<=768px): OPTION B REVIEW-FIRST TIMESHEETS
          ===================================================== */}
      <div className="ts-mobile-view">
        {/* 1. Compact Status Summary Cards (3 Cards Row) */}
        <div className="ts-mob-summary-grid">
          <div
            className={`ts-mob-summary-card ${statusFilter === "Pending" ? "is-active" : ""}`}
            onClick={() => setStatusFilter((prev) => (prev === "Pending" ? "all" : "Pending"))}
            role="button"
            tabIndex={0}
            title="Filter by Pending"
          >
            <div className="ts-mob-summary-icon pending">
              <Clock size={18} />
            </div>
            <div className="ts-mob-summary-content">
              <span className="ts-mob-summary-num">{counts.pending}</span>
              <span className="ts-mob-summary-txt">Pending</span>
            </div>
          </div>

          <div
            className={`ts-mob-summary-card ${statusFilter === "Approved" ? "is-active" : ""}`}
            onClick={() => setStatusFilter((prev) => (prev === "Approved" ? "all" : "Approved"))}
            role="button"
            tabIndex={0}
            title="Filter by Approved"
          >
            <div className="ts-mob-summary-icon approved">
              <CheckCircle2 size={18} />
            </div>
            <div className="ts-mob-summary-content">
              <span className="ts-mob-summary-num">{counts.approved}</span>
              <span className="ts-mob-summary-txt">Approved</span>
            </div>
          </div>

          <div
            className={`ts-mob-summary-card ${statusFilter === "Rejected" ? "is-active" : ""}`}
            onClick={() => setStatusFilter((prev) => (prev === "Rejected" ? "all" : "Rejected"))}
            role="button"
            tabIndex={0}
            title="Filter by Rejected"
          >
            <div className="ts-mob-summary-icon rejected">
              <AlertCircle size={18} />
            </div>
            <div className="ts-mob-summary-content">
              <span className="ts-mob-summary-num">{counts.rejected}</span>
              <span className="ts-mob-summary-txt">Rejected</span>
            </div>
          </div>
        </div>

        {/* 2. Full-Width Search Bar */}
        <div className="ts-mob-search-wrap">
          <Search size={16} className="ts-mob-search-icon" />
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ts-mob-search-input"
          />
          {search && (
            <button
              type="button"
              className="ts-mob-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* 3. Premium Month / Period Selector Dropdown */}
        <div className="ts-mob-month-select-wrap" ref={monthDropdownRef}>
          <button
            type="button"
            className={`ts-mob-month-trigger ${monthDropdownOpen ? "is-open" : ""}`}
            onClick={() => {
              setMonthDropdownOpen((prev) => !prev);
              setStatusDropdownOpen(false);
              setActionsOpen(false);
              setSortOpen(false);
            }}
            aria-haspopup="listbox"
            aria-expanded={monthDropdownOpen}
          >
            <div className="ts-mob-month-trigger-left">
              <Calendar size={16} className="ts-mob-month-icon" />
              <span className="ts-mob-month-label">
                {selectedMonth.replace("-", " ")}
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`ts-mob-month-chevron ${monthDropdownOpen ? "is-rotated" : ""}`}
            />
          </button>

          {monthDropdownOpen && (
            <div className="ts-mob-month-popover" role="listbox">
              <div className="ts-mob-month-scroll-list">
                {MONTHS.map((m) => {
                  const isSelected = selectedMonth === m;
                  const displayMonth = m.replace("-", " ");
                  return (
                    <button
                      key={m}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`ts-mob-month-option ${isSelected ? "is-selected" : ""}`}
                      onClick={() => {
                        setSelectedMonth(m);
                        setMonthDropdownOpen(false);
                        showToast(`Viewing ${displayMonth}`);
                      }}
                    >
                      <span className="ts-mob-month-opt-text">{displayMonth}</span>
                      {isSelected && <Check size={16} className="ts-mob-month-check" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4. Controls Row: Status Dropdown, Filter Button & Actions Dropdown */}
        <div className="ts-mob-controls-row">
          {/* Status Custom Dropdown */}
          <div className="ts-mob-status-dropdown-wrap" ref={statusDropdownRef}>
            <button
              type="button"
              className={`ts-mob-status-trigger ${statusDropdownOpen ? "is-open" : ""}`}
              onClick={() => {
                setStatusDropdownOpen((prev) => !prev);
                setMonthDropdownOpen(false);
                setActionsOpen(false);
                setSortOpen(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={statusDropdownOpen}
            >
              <div className="ts-mob-status-trigger-left">
                <List size={16} className="ts-mob-status-icon" />
                <span className="ts-mob-status-label">
                  {statusFilter === "all" ? "All Status" : statusFilter}
                </span>
              </div>
              <ChevronDown
                size={14}
                className={`ts-mob-status-chevron ${statusDropdownOpen ? "is-rotated" : ""}`}
              />
            </button>

            {statusDropdownOpen && (
              <div className="ts-mob-status-popover" role="listbox">
                {/* Option 1: All Status */}
                <button
                  type="button"
                  role="option"
                  aria-selected={statusFilter === "all"}
                  className={`ts-mob-status-option ${statusFilter === "all" ? "is-selected" : ""}`}
                  onClick={() => {
                    setStatusFilter("all");
                    setStatusDropdownOpen(false);
                    showToast("Showing all statuses");
                  }}
                >
                  <span className="ts-mob-status-opt-text">All Status</span>
                  {statusFilter === "all" && (
                    <span className="ts-mob-opt-check-badge">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>

                {/* Option 2: Pending */}
                <button
                  type="button"
                  role="option"
                  aria-selected={statusFilter === "Pending"}
                  className={`ts-mob-status-option ${statusFilter === "Pending" ? "is-selected" : ""}`}
                  onClick={() => {
                    setStatusFilter("Pending");
                    setStatusDropdownOpen(false);
                    showToast("Filtered by Pending");
                  }}
                >
                  <div className="ts-mob-status-opt-left">
                    <span className="ts-mob-opt-dot pending" />
                    <span className="ts-mob-status-opt-text">Pending</span>
                  </div>
                  {statusFilter === "Pending" && (
                    <span className="ts-mob-opt-check-badge">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>

                {/* Option 3: Approved */}
                <button
                  type="button"
                  role="option"
                  aria-selected={statusFilter === "Approved"}
                  className={`ts-mob-status-option ${statusFilter === "Approved" ? "is-selected" : ""}`}
                  onClick={() => {
                    setStatusFilter("Approved");
                    setStatusDropdownOpen(false);
                    showToast("Filtered by Approved");
                  }}
                >
                  <div className="ts-mob-status-opt-left">
                    <span className="ts-mob-opt-dot approved" />
                    <span className="ts-mob-status-opt-text">Approved</span>
                  </div>
                  {statusFilter === "Approved" && (
                    <span className="ts-mob-opt-check-badge">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>

                {/* Option 4: Rejected */}
                <button
                  type="button"
                  role="option"
                  aria-selected={statusFilter === "Rejected"}
                  className={`ts-mob-status-option ${statusFilter === "Rejected" ? "is-selected" : ""}`}
                  onClick={() => {
                    setStatusFilter("Rejected");
                    setStatusDropdownOpen(false);
                    showToast("Filtered by Rejected");
                  }}
                >
                  <div className="ts-mob-status-opt-left">
                    <span className="ts-mob-opt-dot rejected" />
                    <span className="ts-mob-status-opt-text">Rejected</span>
                  </div>
                  {statusFilter === "Rejected" && (
                    <span className="ts-mob-opt-check-badge">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Filter Button */}
          <button
            type="button"
            className={`ts-mob-filter-btn ${filterDrawerOpen || deptFilter !== "all" ? "is-active" : ""}`}
            onClick={() => {
              setFilterDrawerOpen((prev) => !prev);
              setStatusDropdownOpen(false);
              setMonthDropdownOpen(false);
              setActionsOpen(false);
            }}
            aria-expanded={filterDrawerOpen}
          >
            <SlidersHorizontal size={14} />
            <span>Filter</span>
            {deptFilter !== "all" && <span className="ts-mob-filter-active-dot" />}
          </button>

          {/* Actions Button */}
          <div className="ts-mob-actions-wrap" ref={actionsRef}>
            <button
              type="button"
              className="ts-mob-actions-btn"
              onClick={() => {
                setActionsOpen((prev) => !prev);
                setStatusDropdownOpen(false);
                setMonthDropdownOpen(false);
                setSortOpen(false);
              }}
              aria-expanded={actionsOpen}
            >
              <span>Actions</span>
              <ChevronDown size={14} />
            </button>

            {actionsOpen && (
              <div className="ts-mob-actions-menu" role="menu">
                <button type="button" onClick={handleBulkApprove}>
                  <Check size={15} />
                  Bulk Approve
                </button>
                <button type="button" onClick={handleBulkReject}>
                  <X size={15} />
                  Bulk Reject
                </button>
                <button type="button" onClick={handleExportCSV}>
                  <Download size={15} />
                  Export CSV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Optional Filter Drawer for Department Filtering */}
        {filterDrawerOpen && (
          <div className="ts-mob-filter-drawer">
            <div className="ts-mob-filter-drawer-header">
              <span className="ts-mob-filter-drawer-title">Filter by Department</span>
              {deptFilter !== "all" && (
                <button
                  type="button"
                  className="ts-mob-filter-reset-btn"
                  onClick={() => setDeptFilter("all")}
                >
                  Reset
                </button>
              )}
            </div>
            <div className="ts-mob-dept-chips">
              {departmentsList.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  className={`ts-mob-dept-chip ${deptFilter === dept ? "is-active" : ""}`}
                  onClick={() => setDeptFilter(dept)}
                >
                  {dept === "all" ? "All Departments" : dept}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. List Header with Record Count & Sort Control */}
        <div className="ts-mob-list-header">
          <span className="ts-mob-list-title">
            Timesheet Requests ({filteredEmployees.length})
          </span>

          <div className="ts-mob-sort-wrap" ref={sortRef}>
            <button
              type="button"
              className="ts-mob-sort-btn"
              onClick={() => setSortOpen((prev) => !prev)}
              aria-label="Sort Timesheets"
            >
              <ArrowUpDown size={13} />
              <span>
                Sort by: {sortBy === "latest" ? "Latest" : sortBy === "oldest" ? "Oldest" : sortBy === "hours-desc" ? "Hours (High)" : sortBy === "hours-asc" ? "Hours (Low)" : "Name"}
              </span>
              <ChevronDown size={13} />
            </button>

            {sortOpen && (
              <div className="ts-mob-sort-dropdown" role="menu">
                <button
                  type="button"
                  className={sortBy === "latest" ? "is-active" : ""}
                  onClick={() => {
                    setSortBy("latest");
                    setSortOpen(false);
                  }}
                >
                  Latest Submission
                </button>
                <button
                  type="button"
                  className={sortBy === "oldest" ? "is-active" : ""}
                  onClick={() => {
                    setSortBy("oldest");
                    setSortOpen(false);
                  }}
                >
                  Oldest Submission
                </button>
                <button
                  type="button"
                  className={sortBy === "hours-desc" ? "is-active" : ""}
                  onClick={() => {
                    setSortBy("hours-desc");
                    setSortOpen(false);
                  }}
                >
                  Hours: High to Low
                </button>
                <button
                  type="button"
                  className={sortBy === "hours-asc" ? "is-active" : ""}
                  onClick={() => {
                    setSortBy("hours-asc");
                    setSortOpen(false);
                  }}
                >
                  Hours: Low to High
                </button>
                <button
                  type="button"
                  className={sortBy === "name" ? "is-active" : ""}
                  onClick={() => {
                    setSortBy("name");
                    setSortOpen(false);
                  }}
                >
                  Employee Name (A–Z)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 7. Individual Timesheet Request Cards */}
        {loading ? (
          <div className="ts-mob-loading-wrap">
            <div className="ts-mob-skeleton-card" />
            <div className="ts-mob-skeleton-card" />
            <div className="ts-mob-skeleton-card" />
          </div>
        ) : error ? (
          <div className="ts-mob-error-wrap">
            <AlertCircle size={36} color="#dc2626" />
            <h4>Failed to Load Timesheets</h4>
            <p>{error}</p>
            <button
              type="button"
              className="ts-mob-retry-btn"
              onClick={() => window.location.reload()}
            >
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="ts-mob-empty-wrap">
            <div className="ts-mob-empty-icon-circle">
              <Clock size={32} />
            </div>
            <h4>No Timesheet Requests Found</h4>
            <p>Try adjusting your search criteria, month, or status filter.</p>
            <button
              type="button"
              className="ts-mob-clear-btn"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="ts-mob-cards-list">
            {paginatedEmployees.map((emp) => {
              const statusClass = (emp.status || "Pending").toLowerCase();

              return (
                <div
                  key={emp.id}
                  className="ts-mob-card"
                  onClick={() => handleRowClick(emp.id)}
                >
                  {/* Top Row: Avatar, Name, Code/Dept, Status Badge */}
                  <div className="ts-mob-card-top">
                    <div className="ts-mob-card-emp">
                      <div className="ts-mob-card-avatar">{emp.initials}</div>
                      <div className="ts-mob-card-meta">
                        <span className="ts-mob-card-name">{emp.employeeName}</span>
                        <span className="ts-mob-card-sub">
                          {emp.empCode} · {emp.department}
                        </span>
                      </div>
                    </div>

                    <span className={`ts-mob-badge ${statusClass}`}>
                      {emp.status === "Approved" ? (
                        <CheckCircle2 size={11} />
                      ) : emp.status === "Rejected" ? (
                        <AlertCircle size={11} />
                      ) : (
                        <Clock size={11} />
                      )}
                      <span>{emp.status}</span>
                    </span>
                  </div>

                  {/* Middle Row: Period & Total Hours */}
                  <div className="ts-mob-card-middle">
                    <div className="ts-mob-card-period">
                      <Calendar size={13} />
                      <span>{emp.period}</span>
                    </div>

                    <div className="ts-mob-card-hours">
                      <Clock size={13} />
                      <span>{emp.totalHours}</span>
                    </div>

                    <ChevronRight size={16} className="ts-mob-card-chevron" />
                  </div>

                  {/* Bottom Row: Submission Date */}
                  <div className="ts-mob-card-submitted">
                    <Calendar size={12} />
                    <span>Submitted: {emp.submissionDate}</span>
                  </div>

                  {/* Action Button: Review Details */}
                  <button
                    type="button"
                    className="ts-mob-review-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReviewModalItem(emp);
                    }}
                  >
                    <Eye size={15} />
                    <span>Review Details</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 8. Pagination Controls */}
        {!loading && filteredEmployees.length > 0 && (
          <div className="ts-mob-pagination">
            <span className="ts-mob-page-info">
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredEmployees.length)} of{" "}
              {filteredEmployees.length} requests
            </span>

            <div className="ts-mob-page-btns">
              <button
                type="button"
                className="ts-mob-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                &lt;
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  className={`ts-mob-page-btn ${currentPage === pg ? "is-active" : ""}`}
                  onClick={() => setCurrentPage(pg)}
                >
                  {pg}
                </button>
              ))}

              <button
                type="button"
                className="ts-mob-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          MOBILE REVIEW DETAILS MODAL DIALOG
          ===================================================== */}
      {reviewModalItem && (
        <div
          className="ts-modal-overlay"
          onClick={() => setReviewModalItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="ts-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ts-modal-sheet-header">
              <div className="ts-modal-sheet-emp">
                <div className="ts-mob-card-avatar">{reviewModalItem.initials}</div>
                <div>
                  <h3 className="ts-modal-sheet-name">{reviewModalItem.employeeName}</h3>
                  <span className="ts-modal-sheet-sub">
                    {reviewModalItem.empCode} · {reviewModalItem.department}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="ts-modal-sheet-close"
                onClick={() => setReviewModalItem(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ts-modal-sheet-body">
              {/* Status pill */}
              <div className="ts-modal-row">
                <span className="ts-modal-label">Status</span>
                <span className={`ts-mob-badge ${(reviewModalItem.status || "Pending").toLowerCase()}`}>
                  {reviewModalItem.status}
                </span>
              </div>

              {/* Reporting Period */}
              <div className="ts-modal-row">
                <span className="ts-modal-label">Reporting Period</span>
                <span className="ts-modal-val">{reviewModalItem.period}</span>
              </div>

              {/* Total Hours */}
              <div className="ts-modal-row">
                <span className="ts-modal-label">Total Logged Hours</span>
                <span className="ts-modal-val ts-highlight-hours">{reviewModalItem.totalHours}</span>
              </div>

              {/* Submission Date */}
              <div className="ts-modal-row">
                <span className="ts-modal-label">Submitted On</span>
                <span className="ts-modal-val">{reviewModalItem.submissionDate}</span>
              </div>

              {/* Sample Task Summary */}
              <div className="ts-modal-tasks-card">
                <span className="ts-modal-tasks-title">Summary of Work</span>
                <div className="ts-modal-task-item">
                  <span className="ts-modal-task-proj">Core Sprint Deliverables</span>
                  <span className="ts-modal-task-desc">Feature architecture, sprint tasks, and client review tickets.</span>
                </div>
                <div className="ts-modal-task-item">
                  <span className="ts-modal-task-proj">Team Coordination</span>
                  <span className="ts-modal-task-desc">Daily standups, PR reviews, and sprint planning sessions.</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="ts-modal-sheet-footer">
              {reviewModalItem.status === "Pending" && (
                <div className="ts-modal-actions-grid">
                  <button
                    type="button"
                    className="ts-modal-btn approve"
                    onClick={() => handleApproveSingle(reviewModalItem.id)}
                  >
                    <Check size={16} /> Approve Timesheet
                  </button>
                  <button
                    type="button"
                    className="ts-modal-btn reject"
                    onClick={() => handleRejectSingle(reviewModalItem.id)}
                  >
                    <X size={16} /> Reject Timesheet
                  </button>
                </div>
              )}

              <button
                type="button"
                className="ts-modal-btn calendar"
                onClick={() => handleRowClick(reviewModalItem.id)}
              >
                <Calendar size={15} />
                <span>Open Full Timesheet Calendar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="ts-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default TimesheetRequests;
