import React, { useCallback, useEffect, useMemo, useState, useContext, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft as PiArrowLeftDuotone,
  ArrowRight as PiArrowRightDuotone,
  Bell as PiBellRingingDuotone,
  CalendarCheck as PiCalendarCheckDuotone,
  Calendar as PiCalendarDuotone,
  CheckCircle2 as PiCheckCircleDuotone,
  Clock as PiClockDuotone,
  ClipboardList as PiClipboardTextDuotone,
  AlertTriangle as PiCloudWarningDuotone,
  Search as PiMagnifyingGlassDuotone,
  User as PiPersonDuotone,
  UsersRound as PiUsersThreeDuotone,
  XCircle as PiXCircleDuotone,
  X as PiXDuotone,
  RefreshCw as PiArrowsClockwiseDuotone,
  Settings as PiGearDuotone,
  ShieldAlert as PiShieldWarningDuotone,
  Filter as PiFunnelDuotone,
  Info as PiInfoDuotone,
  Check as PiCheckDuotone,
  TrendingUp,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  Building,
} from "lucide-react";

import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import { getApiBaseUrl, authHeaders } from "../../services/apiClient";
import "./AlertPage.css";

/* =========================================================
   DATE & AVATAR FORMATTING HELPERS
   ========================================================= */

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "—") return "—";
  try {
    if (typeof dateStr === "string" && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split("-");
      const dt = new Date(`${y}-${m}-${d}`);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      }
    }
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
  } catch (e) {}
  return String(dateStr);
};

const formatSyncTimestamp = (date = new Date()) => {
  const dStr = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const tStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dStr}, ${tStr}`;
};

const getInitials = (name) => {
  if (!name) return "EMP";
  const clean = name.trim().replace(/^none\s+/i, "");
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

const AVATAR_PALETTES = [
  { bg: "#ede9fe", color: "#6d28d9" }, // soft purple
  { bg: "#e0f2fe", color: "#0369a1" }, // soft blue
  { bg: "#fce7f3", color: "#be185d" }, // soft pink
  { bg: "#dcfce7", color: "#15803d" }, // soft green
  { bg: "#ffedd5", color: "#c2410c" }, // soft amber
  { bg: "#ccfbf1", color: "#0f766e" }, // soft teal
];

const getAvatarStyle = (name) => {
  if (!name) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
};

/* =========================================================
   STATUS DROPDOWN & SEVERITY BADGE COMPONENTS
   ========================================================= */

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "attention", label: "Attention" },
  { value: "active", label: "Active" },
  { value: "resolved", label: "Resolved" },
];

function AlertStatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentOption = STATUS_OPTIONS.find((opt) => opt.value === value) || STATUS_OPTIONS[0];

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="alerts-status-select-wrap" ref={dropdownRef}>
      <button
        type="button"
        className={`alerts-custom-select-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        id="alerts-status-dropdown-btn"
      >
        <span>{currentOption.label}</span>
        <ChevronDown size={14} className={`alerts-select-arrow ${open ? "is-rotated" : ""}`} />
      </button>

      {open && (
        <ul className="alerts-custom-select-menu" role="listbox" aria-label="Filter alerts by status">
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                className={`alerts-custom-select-item ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(opt.value);
                    setOpen(false);
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <PiCheckDuotone size={14} className="alerts-select-check" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const LEAVE_TYPE_OPTIONS = [
  { value: "all", label: "Filter: All Types" },
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "earned", label: "Earned Leave" },
  { value: "paid", label: "Paid Leave" },
];

function LeaveTypeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentOption = LEAVE_TYPE_OPTIONS.find((opt) => opt.value === value) || LEAVE_TYPE_OPTIONS[0];

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="alerts-status-select-wrap leave-filter-dropdown-wrap" ref={dropdownRef}>
      <button
        type="button"
        className={`alerts-custom-select-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        id="leave-type-dropdown-btn"
      >
        <span>{currentOption.label}</span>
        <ChevronDown size={14} className={`alerts-select-arrow ${open ? "is-rotated" : ""}`} />
      </button>

      {open && (
        <ul className="alerts-custom-select-menu" role="listbox" aria-label="Filter leave requests by type">
          {LEAVE_TYPE_OPTIONS.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                className={`alerts-custom-select-item ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(opt.value);
                    setOpen(false);
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <PiCheckDuotone size={14} className="alerts-select-check" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AlertSeverityBadge({ severity }) {
  const raw = String(severity || "Medium").trim();
  const lower = raw.toLowerCase();

  let label = "Medium";
  let toneClass = "medium";

  if (lower === "high" || lower === "critical") {
    label = "High";
    toneClass = "high";
  } else if (lower === "low") {
    label = "Low";
    toneClass = "low";
  } else if (lower === "information" || lower === "info") {
    label = "INFORMATION";
    toneClass = "info";
  } else if (lower === "pending") {
    label = "Pending";
    toneClass = "pending";
  } else if (lower === "resolved") {
    label = "Resolved";
    toneClass = "resolved";
  } else if (lower === "active") {
    label = "Active";
    toneClass = "active";
  } else {
    label = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    toneClass = "medium";
  }

  return (
    <span className={`alerts-severity-badge alerts-severity-badge--${toneClass}`}>
      {label}
    </span>
  );
}

/* =========================================================
   INITIAL FALLBACK ALERT DEFINITIONS
   ========================================================= */

const INITIAL_ALERTS = {
  pending: [
    {
      id: "leave-approval",
      title: "Pending Leave Approval Requests",
      shortTitle: "Leave Approval",
      count: 0,
      displayCount: "00",
      description: "Leave requests submitted by employees awaiting administrative review and approval.",
      status: "Pending",
      severity: "Medium",
      actionType: "leave-approval",
      icon: PiCalendarCheckDuotone,
      color: "purple",
      updated: "Live from database",
      source: "Leave Management",
      department: "All Departments",
      records: [],
    },
    {
      id: "regularization-approval",
      title: "Pending Attendance Regularization Requests",
      shortTitle: "Regularization",
      count: 0,
      displayCount: "00",
      description: "Attendance regularization and punch correction requests waiting for administrator action.",
      status: "Pending",
      severity: "Medium",
      actionType: "reg-approval",
      icon: PiClipboardTextDuotone,
      color: "orange",
      updated: "Live from database",
      source: "Attendance Regularization",
      department: "All Departments",
      records: [],
    },
  ],
  setup: [
    {
      id: "system-notifications",
      title: "System & Policy Notifications",
      shortTitle: "Setup Issues",
      count: 1,
      displayCount: "01",
      description: "Organizational compliance, policy notices, and system setup configurations.",
      status: "Active",
      severity: "Medium",
      icon: PiGearDuotone,
      color: "blue",
      updated: "Live from database",
      source: "System Notifications",
      department: "Organization",
      records: [],
    },
  ],
  process: [
    {
      id: "attendance-exceptions",
      title: "Today's Unmarked Attendance & Absences",
      shortTitle: "Process Alerts",
      count: 0,
      displayCount: "00",
      description: "Process monitor tracking unpunched work shifts and pending daily workflows.",
      status: "Normal",
      severity: "Low",
      icon: PiShieldWarningDuotone,
      color: "pink",
      updated: "Updated live today",
      source: "Process Monitor",
      department: "System Wide",
      records: [],
    },
  ],
};

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

function AlertPageContent() {
  const navigate = useNavigate();
  const { alertId } = useParams();

  // Route awareness
  const isLeaveApprovalPage = alertId === "leave-approval";

  // Tab & Filter States for Page 1
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Raw Database Lists
  const [rawLeaves, setRawLeaves] = useState([]);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);

  // Loading & Sync States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => formatSyncTimestamp());
  const [showSyncToast, setShowSyncToast] = useState(true);
  const [actionToast, setActionToast] = useState(null);

  // Page 2: Leave Approval Detail States
  const [leaveDetailTab, setLeaveDetailTab] = useState("pending"); // "pending" | "approved" | "rejected"
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [selectedLeaveIds, setSelectedLeaveIds] = useState(new Set());
  const [modalLeave, setModalLeave] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Preserve query params during in-app navigation
  const getPreservedSearch = useCallback(() => window.location.search || "", []);

  /* =======================================================
     DATA FETCH & REFRESH
     ======================================================= */

  const refreshAlerts = useCallback(async () => {
    setLoading(true);
    setError(false);
    const headers = authHeaders();
    const API_BASE = getApiBaseUrl();

    try {
      const [leavesRes, regsRes, attRes, notifsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/leaves/admin/all`, { headers }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE}/api/v1/regularization/admin/all`, { headers }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE}/api/v1/attendance/admin/today`, { headers }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE}/notifications/me`, { headers }).then((r) => (r.ok ? r.json() : [])),
      ]);

      const leavesList = leavesRes.status === "fulfilled" && Array.isArray(leavesRes.value) ? leavesRes.value : [];
      const regsList = regsRes.status === "fulfilled" && Array.isArray(regsRes.value) ? regsRes.value : [];
      const attList = attRes.status === "fulfilled" && Array.isArray(attRes.value) ? attRes.value : [];
      const notifsList = notifsRes.status === "fulfilled" && Array.isArray(notifsRes.value) ? notifsRes.value : [];

      setRawLeaves(leavesList);

      // Categorize Pending Items
      const pendingLeaves = leavesList.filter((l) => {
        const st = (l.status || l.overall_status || "").toUpperCase();
        return st.includes("PENDING");
      });

      const pendingRegs = regsList.filter((r) => {
        const st = (r.status || r.overall_status || "").toUpperCase();
        return st.includes("PENDING");
      });

      const lateToday = attList.filter((a) => (a.remark || "").toLowerCase().includes("late"));
      const unpunchedToday = attList.filter((a) => (a.status || "").toLowerCase() === "absent");
      const unreadNotifs = notifsList.filter((n) => !n.is_read);

      const newAlerts = {
        pending: [
          {
            id: "leave-approval",
            title: "Pending Leave Approval Requests",
            shortTitle: "Leave Approval",
            count: pendingLeaves.length,
            displayCount: String(pendingLeaves.length).padStart(2, "0"),
            description: "Leave requests submitted by employees awaiting administrative review and approval.",
            status: pendingLeaves.length > 0 ? "Pending" : "Resolved",
            severity: pendingLeaves.length > 5 ? "High" : "Medium",
            actionType: "leave-approval",
            icon: PiCalendarCheckDuotone,
            color: "purple",
            updated: "Live from database",
            source: "Leave Management",
            department: "All Departments",
            records: pendingLeaves.map((l) => ({
              id: l.id,
              employee: l.name || l.employee_name || l.emp_code,
              employeeId: l.emp_code || `EMP-${l.id}`,
              department: l.department || "Engineering",
              requestType: l.category || l.leave_type || "Leave Request",
              submitted: l.submitted_at || l.applied_date || "Recent",
              from: l.start_date || l.from || "—",
              to: l.end_date || l.to || "—",
              days: l.total_days || l.days || 1,
              status: l.overall_status || l.status || "Pending",
              reason: l.reason || "",
            })),
          },
          {
            id: "regularization-approval",
            title: "Pending Attendance Regularization Requests",
            shortTitle: "Regularization",
            count: pendingRegs.length,
            displayCount: String(pendingRegs.length).padStart(2, "0"),
            description: "Attendance regularization and punch correction requests waiting for administrator action.",
            status: pendingRegs.length > 0 ? "Pending" : "Resolved",
            severity: pendingRegs.length > 5 ? "High" : "Medium",
            actionType: "reg-approval",
            icon: PiClipboardTextDuotone,
            color: "orange",
            updated: "Live from database",
            source: "Attendance Regularization",
            department: "All Departments",
            records: pendingRegs.map((r) => ({
              id: r.id,
              employee: r.name || r.employee_name || r.emp_code,
              employeeId: r.emp_code || `EMP-${r.id}`,
              department: r.department || "Engineering",
              requestType: "Regularization",
              submitted: r.submittedOn || r.created_at || "Recent",
              from: r.date || r.target_date || "—",
              to: r.date || r.target_date || "—",
              days: 1,
              status: r.overall_status || r.status || "Pending",
              reason: r.reason || r.issue || "",
            })),
          },
        ],
        setup: [
          {
            id: "system-notifications",
            title: "System & Policy Notifications",
            shortTitle: "Setup Issues",
            count: unreadNotifs.length > 0 ? unreadNotifs.length : 1,
            displayCount: String(unreadNotifs.length > 0 ? unreadNotifs.length : 1).padStart(2, "0"),
            description: "System updates, policy notices, and organizational alerts.",
            status: "Active",
            severity: "Information",
            icon: PiGearDuotone,
            color: "blue",
            updated: "Latest system sync",
            source: "System Notifications",
            department: "Organization",
            records: notifsList.map((n) => ({
              id: n.id,
              employee: "System Notice",
              employeeId: `SYS-${n.id}`,
              department: "General",
              requestType: n.title || "Notification",
              submitted: n.created_at || "Recent",
              from: "—",
              to: "—",
              days: 0,
              status: n.is_read ? "Read" : "Unread",
            })),
          },
        ],
        process: [
          {
            id: "attendance-exceptions",
            title: "Today's Unmarked Attendance & Absences",
            shortTitle: "Process Alerts",
            count: unpunchedToday.length + lateToday.length,
            displayCount: String(unpunchedToday.length + lateToday.length).padStart(2, "0"),
            description: "Employees who have not yet recorded their attendance punches or have late arrival remarks.",
            status: unpunchedToday.length > 0 ? "Active" : "Normal",
            severity: unpunchedToday.length > 5 ? "High" : "Low",
            icon: PiShieldWarningDuotone,
            color: "pink",
            updated: "Updated live today",
            source: "HRMS Daily Monitor",
            department: "All Departments",
            records: unpunchedToday.map((a, i) => ({
              id: a.id || i,
              employee: a.name || a.emp_code,
              employeeId: a.emp_code,
              department: a.department || "General",
              requestType: "Unmarked Check-in",
              submitted: "Today",
              from: a.date || "Today",
              to: a.date || "Today",
              days: 1,
              status: a.status || "Absent",
            })),
          },
        ],
      };

      setAlerts(newAlerts);
      setLastSyncTime(formatSyncTimestamp());
    } catch (err) {
      console.error("Alerts sync error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  // Body scroll lock when detail modal is open
  useEffect(() => {
    if (modalLeave) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [modalLeave]);

  /* =======================================================
     CALCULATED METRICS & CATEGORY TOTALS
     ======================================================= */

  const getCategoryTotal = (items = []) => items.reduce((total, item) => total + (item.count || 0), 0);

  const pendingCategoryTotal = getCategoryTotal(alerts.pending);
  const setupCategoryTotal = getCategoryTotal(alerts.setup);
  const processCategoryTotal = getCategoryTotal(alerts.process);
  const totalAlertsCount = pendingCategoryTotal + setupCategoryTotal + processCategoryTotal;

  // Filtered Alert Cards on Page 1
  const currentAlertCards = useMemo(() => {
    const list = alerts[activeTab] || [];
    return list.filter((alert) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        alert.title.toLowerCase().includes(q) ||
        alert.description.toLowerCase().includes(q) ||
        alert.source.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || alert.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [alerts, activeTab, search, statusFilter]);

  /* =======================================================
     PAGE 2: LEAVE APPROVAL DATA FILTERING & TAB METRICS
     ======================================================= */

  const { pendingLeavesList, approvedLeavesList, rejectedLeavesList } = useMemo(() => {
    const pending = [];
    const approved = [];
    const rejected = [];

    rawLeaves.forEach((l) => {
      const st = (l.status || l.overall_status || "").toUpperCase();
      if (st.includes("PENDING")) {
        pending.push(l);
      } else if (st.includes("APPROV")) {
        approved.push(l);
      } else if (st.includes("REJECT")) {
        rejected.push(l);
      } else {
        pending.push(l);
      }
    });

    return {
      pendingLeavesList: pending,
      approvedLeavesList: approved,
      rejectedLeavesList: rejected,
    };
  }, [rawLeaves]);

  const activeLeaveDataset = useMemo(() => {
    if (leaveDetailTab === "approved") return approvedLeavesList;
    if (leaveDetailTab === "rejected") return rejectedLeavesList;
    return pendingLeavesList;
  }, [leaveDetailTab, pendingLeavesList, approvedLeavesList, rejectedLeavesList]);

  const filteredLeaveDataset = useMemo(() => {
    return activeLeaveDataset.filter((leave) => {
      const q = leaveSearch.trim().toLowerCase();
      const name = (leave.name || leave.employee_name || "").toLowerCase();
      const code = (leave.emp_code || leave.code || "").toLowerCase();
      const dept = (leave.department || "").toLowerCase();
      const type = (leave.category || leave.leave_type || "").toLowerCase();
      const dateStr = (leave.start_date || leave.from || "").toLowerCase();

      const matchesQuery =
        !q ||
        name.includes(q) ||
        code.includes(q) ||
        dept.includes(q) ||
        type.includes(q) ||
        dateStr.includes(q);

      const matchesType =
        leaveTypeFilter === "all" || type.includes(leaveTypeFilter.toLowerCase());

      return matchesQuery && matchesType;
    });
  }, [activeLeaveDataset, leaveSearch, leaveTypeFilter]);

  // Pagination slice
  const paginatedLeaves = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeaveDataset.slice(start, start + itemsPerPage);
  }, [filteredLeaveDataset, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLeaveDataset.length / itemsPerPage));

  /* =======================================================
     ACTION HANDLERS: APPROVE & REJECT
     ======================================================= */

  const handleApproveSingle = async (leaveId) => {
    setLoading(true);
    setActionToast({ type: "info", text: "Processing approval..." });
    const headers = authHeaders({ "Content-Type": "application/json" });
    const API_BASE = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE}/api/v1/leaves/${leaveId}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify({ comment: "Approved by Administrator via Alert Center" }),
      });
      if (!res.ok) throw new Error("Approval request failed");

      setActionToast({ type: "success", text: "Leave request approved successfully!" });
      setSelectedLeaveIds((prev) => {
        const next = new Set(prev);
        next.delete(leaveId);
        return next;
      });
      if (modalLeave?.id === leaveId) setModalLeave(null);
      await refreshAlerts();
    } catch (e) {
      setActionToast({ type: "error", text: `Approval failed: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSingle = async (leaveId) => {
    setLoading(true);
    setActionToast({ type: "info", text: "Processing rejection..." });
    const headers = authHeaders({ "Content-Type": "application/json" });
    const API_BASE = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE}/api/v1/leaves/${leaveId}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: "Rejected by Administrator via Alert Center" }),
      });
      if (!res.ok) throw new Error("Rejection request failed");

      setActionToast({ type: "success", text: "Leave request rejected successfully." });
      setSelectedLeaveIds((prev) => {
        const next = new Set(prev);
        next.delete(leaveId);
        return next;
      });
      if (modalLeave?.id === leaveId) setModalLeave(null);
      await refreshAlerts();
    } catch (e) {
      setActionToast({ type: "error", text: `Rejection failed: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedLeaveIds.size === 0) return;
    setLoading(true);
    setActionToast({ type: "info", text: `Approving ${selectedLeaveIds.size} request(s)...` });
    const headers = authHeaders({ "Content-Type": "application/json" });
    const API_BASE = getApiBaseUrl();

    try {
      const promises = Array.from(selectedLeaveIds).map((id) =>
        fetch(`${API_BASE}/api/v1/leaves/${id}/approve`, {
          method: "POST",
          headers,
          body: JSON.stringify({ comment: "Batch approved by Administrator via Alert Center" }),
        })
      );
      await Promise.allSettled(promises);
      setActionToast({
        type: "success",
        text: `Successfully approved ${selectedLeaveIds.size} leave request(s).`,
      });
      setSelectedLeaveIds(new Set());
      await refreshAlerts();
    } catch (e) {
      setActionToast({ type: "error", text: `Batch approve failed: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedLeaveIds.size === 0) return;
    setLoading(true);
    setActionToast({ type: "info", text: `Rejecting ${selectedLeaveIds.size} request(s)...` });
    const headers = authHeaders({ "Content-Type": "application/json" });
    const API_BASE = getApiBaseUrl();

    try {
      const promises = Array.from(selectedLeaveIds).map((id) =>
        fetch(`${API_BASE}/api/v1/leaves/${id}/reject`, {
          method: "POST",
          headers,
          body: JSON.stringify({ reason: "Batch rejected by Administrator via Alert Center" }),
        })
      );
      await Promise.allSettled(promises);
      setActionToast({
        type: "success",
        text: `Successfully rejected ${selectedLeaveIds.size} leave request(s).`,
      });
      setSelectedLeaveIds(new Set());
      await refreshAlerts();
    } catch (e) {
      setActionToast({ type: "error", text: `Batch reject failed: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeaveIds.size === paginatedLeaves.length && paginatedLeaves.length > 0) {
      setSelectedLeaveIds(new Set());
    } else {
      setSelectedLeaveIds(new Set(paginatedLeaves.map((l) => l.id)));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedLeaveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* =======================================================
     OTHER ALERT DETAIL VIEW (E.G. REGULARIZATION)
     ======================================================= */

  const otherAlertDetail = useMemo(() => {
    if (!alertId || isLeaveApprovalPage) return null;
    const allAlerts = [
      ...(alerts.pending || []),
      ...(alerts.setup || []),
      ...(alerts.process || []),
    ];
    return allAlerts.find(
      (a) =>
        a.id === alertId ||
        (alertId === "regularization" && a.id === "regularization-approval") ||
        (alertId === "regularization-approval" && a.id === "regularization")
    );
  }, [alertId, isLeaveApprovalPage, alerts]);

  /* =======================================================
     VIEW RENDERER: ERROR STATE
     ======================================================= */

  if (error) {
    return (
      <main className="alerts-page">
        <div className="alerts-empty-state">
          <PiCloudWarningDuotone className="alerts-empty-icon text-danger" size={48} />
          <h2>Unable to Load Alerts</h2>
          <p>We could not retrieve the latest database records. Please try refreshing.</p>
          <button type="button" className="alerts-primary-pill-btn" onClick={refreshAlerts}>
            <PiArrowsClockwiseDuotone size={16} />
            <span>Try Again</span>
          </button>
        </div>
      </main>
    );
  }

  /* =======================================================
     VIEW RENDERER: PAGE 2 (LEAVE APPROVAL DETAIL)
     ======================================================= */

  if (isLeaveApprovalPage) {
    const isAllSelected =
      paginatedLeaves.length > 0 && selectedLeaveIds.size === paginatedLeaves.length;

    return (
      <main className="alerts-page leave-detail-page">
        {/* 1. TOP NAV: Back to Alerts */}
        <div className="leave-top-nav">
          <button
            type="button"
            className="leave-back-pill-btn"
            onClick={() => navigate(`/dashboard/alerts${getPreservedSearch()}`)}
            id="leave-approval-back-top"
          >
            <PiArrowLeftDuotone size={16} />
            <span>Back to Alerts</span>
          </button>
        </div>

        {/* Action Toast Feedback Banner */}
        {actionToast && (
          <div className={`alerts-feedback-toast alerts-feedback-toast--${actionToast.type}`}>
            <PiCheckCircleDuotone size={18} />
            <span>{actionToast.text}</span>
            <button
              type="button"
              className="alerts-toast-dismiss"
              onClick={() => setActionToast(null)}
              aria-label="Dismiss toast"
            >
              <PiXDuotone size={15} />
            </button>
          </div>
        )}

        {/* 2. LEAVE MANAGEMENT HERO CARD */}
        <section className="leave-hero-card">
          <div className="leave-hero-main">
            <div className="leave-hero-icon-box">
              <PiCalendarCheckDuotone size={28} />
            </div>
            <div className="leave-hero-text">
              <span className="leave-hero-eyebrow">LEAVE MANAGEMENT</span>
              <h1 className="leave-hero-title">Pending Leave Approval Requests</h1>
              <p className="leave-hero-subtitle">
                Leave requests submitted by employees awaiting administrative review and approval.
              </p>
            </div>
          </div>
          <div className="leave-hero-badge">
            <AlertSeverityBadge severity="Medium" />
          </div>
        </section>

        {/* 3. FOUR SUMMARY METRICS CARDS */}
        <section className="leave-metrics-grid">
          <div className="leave-metric-card">
            <div className="leave-metric-icon-wrap leave-metric-icon-wrap--mint">
              <PiClockDuotone size={20} />
            </div>
            <div className="leave-metric-info">
              <span className="leave-metric-label">Status</span>
              <strong className="leave-metric-value leave-metric-value--status">
                <span className="leave-status-live-dot" />
                Pending
              </strong>
            </div>
          </div>

          <div className="leave-metric-card">
            <div className="leave-metric-icon-wrap leave-metric-icon-wrap--peach">
              <TrendingUp size={20} />
            </div>
            <div className="leave-metric-info">
              <span className="leave-metric-label">Severity</span>
              <strong className="leave-metric-value">Medium</strong>
            </div>
          </div>

          <div className="leave-metric-card">
            <div className="leave-metric-icon-wrap leave-metric-icon-wrap--purple">
              <FileText size={20} />
            </div>
            <div className="leave-metric-info">
              <span className="leave-metric-label">Open Items</span>
              <strong className="leave-metric-value">{pendingLeavesList.length}</strong>
            </div>
          </div>

          <div className="leave-metric-card">
            <div className="leave-metric-icon-wrap leave-metric-icon-wrap--purple">
              <PiCalendarDuotone size={20} />
            </div>
            <div className="leave-metric-info">
              <span className="leave-metric-label">Last Updated</span>
              <strong className="leave-metric-value leave-metric-value--time">
                {lastSyncTime}
              </strong>
            </div>
          </div>
        </section>

        {/* 4. DETAIL TABS + SEARCH / FILTER TOOLBAR */}
        <section className="leave-toolbar-bar">
          <div className="leave-tabs-container">
            <button
              type="button"
              id="leave-tab-pending"
              className={`leave-tab-btn ${leaveDetailTab === "pending" ? "leave-tab-btn--active" : ""}`}
              onClick={() => {
                setLeaveDetailTab("pending");
                setCurrentPage(1);
                setSelectedLeaveIds(new Set());
              }}
            >
              <PiCalendarCheckDuotone size={16} />
              <span className="leave-tab-label--desktop">Pending Requests</span>
              <span className="leave-tab-label--mobile">Pending</span>
              <span className="leave-tab-count-badge">{pendingLeavesList.length}</span>
            </button>

            <button
              type="button"
              id="leave-tab-approved"
              className={`leave-tab-btn ${leaveDetailTab === "approved" ? "leave-tab-btn--active" : ""}`}
              onClick={() => {
                setLeaveDetailTab("approved");
                setCurrentPage(1);
                setSelectedLeaveIds(new Set());
              }}
            >
              <PiCheckCircleDuotone size={16} />
              <span>Approved</span>
              <span className="leave-tab-count-badge">{approvedLeavesList.length}</span>
            </button>

            <button
              type="button"
              id="leave-tab-rejected"
              className={`leave-tab-btn ${leaveDetailTab === "rejected" ? "leave-tab-btn--active" : ""}`}
              onClick={() => {
                setLeaveDetailTab("rejected");
                setCurrentPage(1);
                setSelectedLeaveIds(new Set());
              }}
            >
              <PiXCircleDuotone size={16} />
              <span>Rejected</span>
              <span className="leave-tab-count-badge">{rejectedLeavesList.length}</span>
            </button>
          </div>

          <div className="leave-search-filter-controls">
            <div className="leave-search-box">
              <PiMagnifyingGlassDuotone size={16} className="leave-search-icon" />
              <input
                type="text"
                placeholder="Search employee, leave type, or date..."
                value={leaveSearch}
                onChange={(e) => {
                  setLeaveSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="leave-search-input"
              />
              {leaveSearch && (
                <button
                  type="button"
                  className="leave-search-clear-btn"
                  onClick={() => setLeaveSearch("")}
                >
                  <PiXDuotone size={14} />
                </button>
              )}
            </div>

            <LeaveTypeDropdown
              value={leaveTypeFilter}
              onChange={(val) => {
                setLeaveTypeFilter(val);
                setCurrentPage(1);
              }}
            />
          </div>
        </section>

        {/* 5. DESKTOP VIEW: STRUCTURED TABLE */}
        <section className="leave-desktop-table-card">
          {paginatedLeaves.length === 0 ? (
            <div className="leave-no-records-view">
              <PiCheckCircleDuotone size={36} className="text-muted" />
              <h3>No Leave Requests</h3>
              <p>There are no {leaveDetailTab} requests matching the current criteria.</p>
            </div>
          ) : (
            <>
              <div className="leave-table-responsive-wrapper">
                <table className="leave-structured-table">
                  <thead>
                    <tr>
                      <th className="th-checkbox">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all rows"
                        />
                      </th>
                      <th>EMPLOYEE</th>
                      <th>EMPLOYEE ID</th>
                      <th>DEPARTMENT</th>
                      <th>LEAVE TYPE</th>
                      <th>SUBMITTED ON</th>
                      <th>LEAVE PERIOD</th>
                      <th>DAYS</th>
                      <th>STATUS</th>
                      <th className="th-actions">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeaves.map((record) => {
                      const empName = record.name || record.employee_name || record.emp_code || "Employee";
                      const empCode = record.emp_code || record.code || `EMP-${record.id}`;
                      const dept = record.department || "Engineering";
                      const leaveType = record.category || record.leave_type || "Casual Leave";
                      const submittedOn = formatDate(record.submitted_at || record.applied_date || "Today");
                      const startDate = formatDate(record.start_date || record.from);
                      const endDate = formatDate(record.end_date || record.to);
                      const totalDays = record.total_days || record.days || 1;
                      const isSelected = selectedLeaveIds.has(record.id);
                      const avatarStyle = getAvatarStyle(empName);

                      const rawStatus = (record.status || record.overall_status || "").toUpperCase();
                      const statusClass = rawStatus.includes("APPROV")
                        ? "approved"
                        : rawStatus.includes("REJECT")
                        ? "rejected"
                        : "pending";
                      const displayStatus = rawStatus.includes("APPROV")
                        ? "APPROVED"
                        : rawStatus.includes("REJECT")
                        ? "REJECTED"
                        : "PENDING";

                      return (
                        <tr
                          key={record.id}
                          className={`leave-table-row ${isSelected ? "leave-table-row--selected" : ""}`}
                        >
                          <td className="td-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(record.id)}
                              aria-label={`Select ${empName}`}
                            />
                          </td>
                          <td className="td-employee">
                            <div className="leave-employee-cell">
                              <span
                                className="leave-avatar-badge"
                                style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.color }}
                              >
                                {getInitials(empName)}
                              </span>
                              <strong className="leave-emp-name">{empName}</strong>
                            </div>
                          </td>
                          <td className="td-code">{empCode}</td>
                          <td className="td-dept">{dept}</td>
                          <td className="td-type">{leaveType}</td>
                          <td className="td-date">{submittedOn}</td>
                          <td className="td-period">
                            <span className="leave-period-text">
                              {startDate} {endDate && endDate !== startDate ? `→ ${endDate}` : ""}
                            </span>
                          </td>
                          <td className="td-days">{totalDays}</td>
                          <td className="td-status">
                            <span className={`leave-status-pill leave-status-pill--${statusClass}`}>
                              {displayStatus}
                            </span>
                          </td>
                          <td className="td-actions">
                            <button
                              type="button"
                              className="leave-action-view-btn"
                              onClick={() => setModalLeave(record)}
                              title="View Details"
                            >
                              <Eye size={15} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="leave-table-pagination-row">
                <span className="leave-pagination-text">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLeaveDataset.length)} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredLeaveDataset.length)} of{" "}
                  {filteredLeaveDataset.length} requests
                </span>
                <div className="leave-pagination-controls">
                  <button
                    type="button"
                    className="leave-page-nav-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="leave-page-current-num">{currentPage}</span>
                  <button
                    type="button"
                    className="leave-page-nav-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* 6. MOBILE VIEW: RESPONSIVE CARDS (NO TABLE SQUEEZING!) */}
        <section className="leave-mobile-cards-stack">
          {paginatedLeaves.length === 0 ? (
            <div className="leave-no-records-view">
              <PiCheckCircleDuotone size={36} className="text-muted" />
              <h3>No Leave Requests</h3>
              <p>There are no {leaveDetailTab} requests matching the current criteria.</p>
            </div>
          ) : (
            paginatedLeaves.map((record) => {
              const empName = record.name || record.employee_name || record.emp_code || "Employee";
              const empCode = record.emp_code || record.code || `EMP-${record.id}`;
              const dept = record.department || "Engineering";
              const leaveType = record.category || record.leave_type || "Casual Leave";
              const submittedOn = formatDate(record.submitted_at || record.applied_date || "Today");
              const startDate = formatDate(record.start_date || record.from);
              const endDate = formatDate(record.end_date || record.to);
              const totalDays = record.total_days || record.days || 1;
              const reason = record.reason || "Out of station";
              const avatarStyle = getAvatarStyle(empName);

              const rawStatus = (record.status || record.overall_status || "").toUpperCase();
              const statusClass = rawStatus.includes("APPROV")
                ? "approved"
                : rawStatus.includes("REJECT")
                ? "rejected"
                : "pending";
              const displayStatus = rawStatus.includes("APPROV")
                ? "Approved"
                : rawStatus.includes("REJECT")
                ? "Rejected"
                : "Pending";

              return (
                <article className="leave-mobile-card" key={`mob-${record.id}`}>
                  <div className="leave-mob-card-header">
                    <div className="leave-mob-user-row">
                      <span
                        className="leave-avatar-badge"
                        style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.color }}
                      >
                        {getInitials(empName)}
                      </span>
                      <div className="leave-mob-emp-titles">
                        <strong className="leave-mob-emp-name">{empName}</strong>
                        <span className="leave-mob-emp-sub">
                          {empCode} · {dept}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="leave-mob-tags-row">
                    <span className="leave-mob-type-badge">{leaveType}</span>
                    <span className={`leave-status-pill leave-status-pill--${statusClass}`}>
                      {displayStatus}
                    </span>
                  </div>

                  <div className="leave-mob-grid-details">
                    <div className="leave-mob-grid-item">
                      <span className="mob-grid-label">From</span>
                      <strong className="mob-grid-val">{startDate}</strong>
                    </div>
                    <div className="leave-mob-grid-item">
                      <span className="mob-grid-label">To</span>
                      <strong className="mob-grid-val">{endDate}</strong>
                    </div>
                    <div className="leave-mob-grid-item">
                      <span className="mob-grid-label">Days</span>
                      <strong className="mob-grid-val">{totalDays}</strong>
                    </div>
                    <div className="leave-mob-grid-item">
                      <span className="mob-grid-label">Applied On</span>
                      <strong className="mob-grid-val">{submittedOn}</strong>
                    </div>
                  </div>

                  <div className="leave-mob-statement-box">
                    <span className="mob-statement-label">Applicant Statement</span>
                    <p className="mob-statement-text">{reason}</p>
                  </div>

                  <div className="leave-mob-actions-row">
                    <button
                      type="button"
                      className="leave-mob-view-btn"
                      onClick={() => setModalLeave(record)}
                    >
                      View Details
                    </button>
                    {statusClass === "pending" && (
                      <div className="leave-mob-decision-btns">
                        <button
                          type="button"
                          className="leave-mob-reject-btn"
                          onClick={() => handleRejectSingle(record.id)}
                          disabled={loading}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="leave-mob-approve-btn"
                          onClick={() => handleApproveSingle(record.id)}
                          disabled={loading}
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* 7. SYSTEM MONITORING NOTICE BANNER */}
        <section className="leave-notice-info-bar">
          <div className="leave-notice-left">
            <PiInfoDuotone size={18} className="text-brand-purple" />
            <span>
              Review employee leave requests and take appropriate action. Approved requests will be
              updated in the attendance and leave records.
            </span>
          </div>
          <div className="leave-notice-right">
            <span className="leave-monitoring-active-pill">
              <span className="leave-status-live-dot" />
              System monitoring active
            </span>
          </div>
        </section>

        {/* 8. FOOTER ACTION BAR */}
        <footer className="leave-bottom-action-bar">
          <button
            type="button"
            className="leave-back-pill-btn"
            onClick={() => navigate(`/dashboard/alerts${getPreservedSearch()}`)}
            id="leave-approval-back-bottom"
          >
            <PiArrowLeftDuotone size={16} />
            <span>Back to Alerts</span>
          </button>

          <div className="leave-batch-action-btns">
            <button
              type="button"
              className="leave-reject-selected-btn"
              onClick={handleBatchReject}
              disabled={loading || selectedLeaveIds.size === 0}
            >
              <PiXCircleDuotone size={16} />
              <span>Reject Selected {selectedLeaveIds.size > 0 ? `(${selectedLeaveIds.size})` : ""}</span>
            </button>

            <button
              type="button"
              className="leave-approve-selected-btn"
              onClick={handleBatchApprove}
              disabled={loading || selectedLeaveIds.size === 0}
            >
              <PiCheckDuotone size={16} />
              <span>Approve Selected {selectedLeaveIds.size > 0 ? `(${selectedLeaveIds.size})` : ""}</span>
            </button>
          </div>
        </footer>

        {/* 9. REQUEST DETAIL MODAL (CLEAN POPUP, LOCKS BODY OVERFLOW, NO NESTED SHELL) */}
        {modalLeave && (
          <div
            className="leave-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-modal-title"
          >
            <div className="leave-modal-content-card">
              <div className="leave-modal-header">
                <div className="leave-modal-header-info">
                  <h3 id="leave-modal-title">Leave Request Details</h3>
                  <span>Reference ID: LEAVE-#{modalLeave.id}</span>
                </div>
                <button
                  type="button"
                  className="leave-modal-close-btn"
                  onClick={() => setModalLeave(null)}
                  aria-label="Close modal"
                >
                  <PiXDuotone size={18} />
                </button>
              </div>

              <div className="leave-modal-body">
                {/* Employee Profile Card inside modal */}
                <div className="leave-modal-emp-profile">
                  <span
                    className="leave-avatar-badge leave-avatar-badge--large"
                    style={{
                      backgroundColor: getAvatarStyle(modalLeave.name).bg,
                      color: getAvatarStyle(modalLeave.name).color,
                    }}
                  >
                    {getInitials(modalLeave.name || modalLeave.employee_name)}
                  </span>
                  <div className="leave-modal-emp-meta">
                    <h4>{modalLeave.name || modalLeave.employee_name || modalLeave.emp_code}</h4>
                    <p>
                      {modalLeave.emp_code} · {modalLeave.department || "Engineering"} ·{" "}
                      {modalLeave.designation || "Employee"}
                    </p>
                  </div>
                </div>

                {/* Grid details */}
                <div className="leave-modal-details-grid">
                  <div className="leave-modal-cell">
                    <span className="modal-cell-label">Leave Category</span>
                    <strong className="modal-cell-val">
                      {modalLeave.category || modalLeave.leave_type || "Casual Leave"}
                    </strong>
                  </div>
                  <div className="leave-modal-cell">
                    <span className="modal-cell-label">Total Duration</span>
                    <strong className="modal-cell-val">
                      {modalLeave.total_days || modalLeave.days || 1} Days
                    </strong>
                  </div>
                  <div className="leave-modal-cell">
                    <span className="modal-cell-label">Period (From)</span>
                    <strong className="modal-cell-val">
                      {formatDate(modalLeave.start_date || modalLeave.from)}
                    </strong>
                  </div>
                  <div className="leave-modal-cell">
                    <span className="modal-cell-label">Period (To)</span>
                    <strong className="modal-cell-val">
                      {formatDate(modalLeave.end_date || modalLeave.to)}
                    </strong>
                  </div>
                  <div className="leave-modal-cell">
                    <span className="modal-cell-label">Applied Date</span>
                    <strong className="modal-cell-val">
                      {formatDate(modalLeave.submitted_at || modalLeave.applied_date || "Recent")}
                    </strong>
                  </div>
                  <div className="leave-modal-cell">
                    <span className="modal-cell-label">Current Status</span>
                    <strong className="modal-cell-val text-pending">
                      {modalLeave.overall_status || modalLeave.status || "Pending Admin Review"}
                    </strong>
                  </div>
                </div>

                {/* Reason Statement */}
                <div className="leave-modal-statement-box">
                  <span className="modal-cell-label">Applicant Statement & Reason</span>
                  <p className="leave-modal-statement-text">
                    {modalLeave.reason || "No written statement submitted."}
                  </p>
                </div>
              </div>

              <div className="leave-modal-footer">
                <button
                  type="button"
                  className="leave-modal-cancel-btn"
                  onClick={() => setModalLeave(null)}
                >
                  Close
                </button>
                <div className="leave-modal-footer-decisions">
                  <button
                    type="button"
                    className="leave-modal-reject-btn"
                    onClick={() => handleRejectSingle(modalLeave.id)}
                    disabled={loading}
                  >
                    Reject Request
                  </button>
                  <button
                    type="button"
                    className="leave-modal-approve-btn"
                    onClick={() => handleApproveSingle(modalLeave.id)}
                    disabled={loading}
                  >
                    Approve Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  /* =======================================================
     VIEW RENDERER: OTHER DEDICATED ALERT DETAIL (E.G. REGULARIZATION)
     ======================================================= */

  if (otherAlertDetail) {
    const DetailIcon = otherAlertDetail.icon || PiClipboardTextDuotone;
    return (
      <main className="alerts-page leave-detail-page">
        <div className="leave-top-nav">
          <button
            type="button"
            className="leave-back-pill-btn"
            onClick={() => navigate(`/dashboard/alerts${getPreservedSearch()}`)}
          >
            <PiArrowLeftDuotone size={16} />
            <span>Back to Alerts</span>
          </button>
        </div>

        <section className="leave-hero-card">
          <div className="leave-hero-main">
            <div className="leave-hero-icon-box">
              <DetailIcon size={28} />
            </div>
            <div className="leave-hero-text">
              <span className="leave-hero-eyebrow">
                {otherAlertDetail.source?.toUpperCase() || "SYSTEM ALERT"}
              </span>
              <h1 className="leave-hero-title">{otherAlertDetail.title}</h1>
              <p className="leave-hero-subtitle">{otherAlertDetail.description}</p>
            </div>
          </div>
          <div className="leave-hero-badge">
            <AlertSeverityBadge severity={otherAlertDetail.severity || "Medium"} />
          </div>
        </section>

        <section className="leave-metrics-grid">
          <div className="leave-metric-card">
            <div className="leave-metric-icon-wrap leave-metric-icon-wrap--mint">
              <PiClockDuotone size={20} />
            </div>
            <div className="leave-metric-info">
              <span className="leave-metric-label">Status</span>
              <strong className="leave-metric-value leave-metric-value--status">
                <span className="leave-status-live-dot" />
                {otherAlertDetail.status}
              </strong>
            </div>
          </div>

          <div className="leave-metric-card">
            <div className="leave-metric-icon-wrap leave-metric-icon-wrap--peach">
              <TrendingUp size={20} />
            </div>
            <div className="leave-metric-info">
              <span className="leave-metric-label">Severity</span>
              <strong className="leave-metric-value">{otherAlertDetail.severity}</strong>
            </div>
          </div>

          <div className="leave-metric-card">
            <div className="leave-metric-icon-wrap leave-metric-icon-wrap--purple">
              <FileText size={20} />
            </div>
            <div className="leave-metric-info">
              <span className="leave-metric-label">Open Items</span>
              <strong className="leave-metric-value">{otherAlertDetail.count}</strong>
            </div>
          </div>

          <div className="leave-metric-card">
            <div className="leave-metric-icon-wrap leave-metric-icon-wrap--purple">
              <PiCalendarDuotone size={20} />
            </div>
            <div className="leave-metric-info">
              <span className="leave-metric-label">Last Updated</span>
              <strong className="leave-metric-value leave-metric-value--time">
                {otherAlertDetail.updated}
              </strong>
            </div>
          </div>
        </section>

        {/* Related records */}
        <section className="leave-desktop-table-card">
          <div className="leave-records-detail-wrap">
            <h3 style={{ padding: "18px 20px 8px 20px", margin: 0, fontSize: "16px", color: "#1e1b4b" }}>
              Pending Records ({otherAlertDetail.records?.length || 0})
            </h3>
            {(!otherAlertDetail.records || otherAlertDetail.records.length === 0) ? (
              <div className="leave-no-records-view">
                <PiCheckCircleDuotone size={32} className="text-muted" />
                <p>No open records for this alert.</p>
              </div>
            ) : (
              <div className="leave-table-responsive-wrapper">
                <table className="leave-structured-table">
                  <thead>
                    <tr>
                      <th>EMPLOYEE</th>
                      <th>EMPLOYEE ID</th>
                      <th>DEPARTMENT</th>
                      <th>TYPE</th>
                      <th>DATE / PERIOD</th>
                      <th>STATUS</th>
                      <th>STATEMENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherAlertDetail.records.map((r, i) => (
                      <tr key={r.id || i}>
                        <td>
                          <strong className="leave-emp-name">{r.employee}</strong>
                        </td>
                        <td>{r.employeeId}</td>
                        <td>{r.department}</td>
                        <td>{r.requestType}</td>
                        <td>{r.from}</td>
                        <td>
                          <span className="leave-status-pill leave-status-pill--pending">
                            {r.status}
                          </span>
                        </td>
                        <td>{r.reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <footer className="leave-bottom-action-bar">
          <button
            type="button"
            className="leave-back-pill-btn"
            onClick={() => navigate(`/dashboard/alerts${getPreservedSearch()}`)}
          >
            <PiArrowLeftDuotone size={16} />
            <span>Back to Alerts</span>
          </button>
        </footer>
      </main>
    );
  }

  /* =======================================================
     VIEW RENDERER: PAGE 1 (MAIN ALERTS PAGE)
     ======================================================= */

  return (
    <main className="alerts-page">
      {/* 1. TOP GREEN SYNCHRONIZATION TOAST */}
      {showSyncToast && (
        <section className="alerts-sync-toast" aria-label="Database sync status">
          <div className="alerts-sync-toast-left">
            <span className="alerts-sync-toast-icon">
              <PiCheckCircleDuotone size={20} />
            </span>
            <div className="alerts-sync-toast-text">
              <strong>Leave alerts synchronized from database.</strong>
              <span>All leave request alerts are up to date.</span>
            </div>
          </div>
          <div className="alerts-sync-toast-right">
            <span className="alerts-sync-toast-time">Last sync: {lastSyncTime}</span>
            <button
              type="button"
              className="alerts-sync-toast-dismiss"
              onClick={() => setShowSyncToast(false)}
              aria-label="Dismiss banner"
            >
              <PiXDuotone size={15} />
            </button>
          </div>
        </section>
      )}

      {/* Action Toast Feedback Banner */}
      {actionToast && (
        <div className={`alerts-feedback-toast alerts-feedback-toast--${actionToast.type}`}>
          <PiCheckCircleDuotone size={18} />
          <span>{actionToast.text}</span>
          <button
            type="button"
            className="alerts-toast-dismiss"
            onClick={() => setActionToast(null)}
            aria-label="Dismiss toast"
          >
            <PiXDuotone size={15} />
          </button>
        </div>
      )}

      {/* 2. CATEGORY TABS + TOTAL ALERTS + REFRESH ROW */}
      <section className="alerts-category-row" aria-label="Alert categories">
        <div className="alerts-category-tabs">
          <button
            type="button"
            className={`alerts-cat-btn ${activeTab === "pending" ? "alerts-cat-btn--active" : ""}`}
            onClick={() => {
              setActiveTab("pending");
              setSearch("");
              setStatusFilter("all");
            }}
          >
            <PiClipboardTextDuotone size={17} />
            <span>Pending Requests</span>
            <span className="alerts-cat-badge">{pendingCategoryTotal}</span>
          </button>

          <button
            type="button"
            className={`alerts-cat-btn ${activeTab === "setup" ? "alerts-cat-btn--active" : ""}`}
            onClick={() => {
              setActiveTab("setup");
              setSearch("");
              setStatusFilter("all");
            }}
          >
            <PiGearDuotone size={17} />
            <span>Setup Issues</span>
            <span className="alerts-cat-badge">{setupCategoryTotal}</span>
          </button>

          <button
            type="button"
            className={`alerts-cat-btn ${activeTab === "process" ? "alerts-cat-btn--active" : ""}`}
            onClick={() => {
              setActiveTab("process");
              setSearch("");
              setStatusFilter("all");
            }}
          >
            <PiShieldWarningDuotone size={17} />
            <span>Process Alerts</span>
            <span className="alerts-cat-badge">{processCategoryTotal}</span>
          </button>
        </div>

        <div className="alerts-cat-divider" />

        <div className="alerts-category-actions-right">
          <div className="alerts-total-count-card">
            <span className="alerts-total-icon">
              <PiBellRingingDuotone size={18} />
            </span>
            <div className="alerts-total-copy">
              <span>Total Alerts</span>
              <strong>{totalAlertsCount}</strong>
            </div>
          </div>

          <button
            type="button"
            className="alerts-refresh-pill-btn"
            onClick={refreshAlerts}
            disabled={loading}
            title="Refresh alerts from database"
          >
            <PiArrowsClockwiseDuotone
              size={16}
              className={loading ? "alerts-spin-anim" : ""}
            />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </section>

      {/* 3. ALERT CENTER FILTER BAR */}
      <section className="alerts-filter-bar">
        <div className="alerts-filter-brand">
          <span className="alerts-filter-icon-box">
            <PiFunnelDuotone size={17} />
          </span>
          <div className="alerts-filter-brand-text">
            <strong>Alert Center</strong>
            <span className="alerts-filter-brand-sep">|</span>
            <span className="alerts-filter-brand-count">
              {currentAlertCards.length} {currentAlertCards.length === 1 ? "alert" : "alerts"} shown
            </span>
          </div>
        </div>

        <div className="alerts-filter-inputs">
          <div className="alerts-search-wrap">
            <PiMagnifyingGlassDuotone size={16} className="alerts-search-icon" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="alerts-search-input"
            />
            {search && (
              <button
                type="button"
                className="alerts-search-clear-btn"
                onClick={() => setSearch("")}
              >
                <PiXDuotone size={14} />
              </button>
            )}
          </div>

          <AlertStatusDropdown
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
          />
        </div>
      </section>

      {/* 4. ATTENTION REQUIRED HEADING */}
      <section className="alerts-attention-heading-area">
        <span className="alerts-attention-eyebrow">
          {activeTab === "pending"
            ? "ATTENTION REQUIRED"
            : activeTab === "setup"
            ? "CONFIGURATION ITEMS"
            : "PROCESS MONITORING"}
        </span>
        <div className="alerts-attention-title-row">
          <h2 className="alerts-attention-title">
            {activeTab === "pending"
              ? "Pending Requests"
              : activeTab === "setup"
              ? "Setup Issues"
              : "Process Alerts"}
          </h2>
          <span className="alerts-attention-count-badge">
            {getCategoryTotal(alerts[activeTab])}
          </span>
        </div>
        <p className="alerts-attention-subtitle">
          {activeTab === "pending"
            ? "Requests waiting for administrative review."
            : activeTab === "setup"
            ? "Configuration and policy items requiring administrative review."
            : "Operational workflows and attendance process monitoring alerts."}
        </p>
      </section>

      {/* 5. ALERT CARDS GRID (2 COLUMNS DESKTOP, 1 COLUMN MOBILE) */}
      <section className="alerts-cards-grid">
        {loading ? (
          [1, 2].map((n) => (
            <div className="alerts-skeleton-card" key={`sk-${n}`}>
              <div className="alerts-sk-line alerts-sk-line--icon" />
              <div className="alerts-sk-line alerts-sk-line--title" />
              <div className="alerts-sk-line alerts-sk-line--text" />
              <div className="alerts-sk-line alerts-sk-line--num" />
            </div>
          ))
        ) : currentAlertCards.length === 0 ? (
          <div className="alerts-empty-state-card">
            <PiCheckCircleDuotone size={36} className="text-success" />
            <h3>All Clear</h3>
            <p>There are no alerts matching your current filter in this category.</p>
          </div>
        ) : (
          currentAlertCards.map((card) => {
            const CardIcon = card.icon || PiCalendarCheckDuotone;
            const openItemsNum = String(card.displayCount ?? card.count).padStart(2, "0");

            const isLeaveApproval = card.id === "leave-approval";

            return (
              <article
                className={`alerts-overview-card alerts-overview-card--${card.color || "purple"}`}
                key={card.id}
              >
                <div className="alerts-card-top-row">
                  <div className={`alerts-card-icon-wrap alerts-card-icon-wrap--${card.color || "purple"}`}>
                    <CardIcon size={22} />
                  </div>
                  <AlertSeverityBadge severity={card.severity} />
                </div>

                <div className="alerts-card-body">
                  <h3 className="alerts-card-title">{card.title}</h3>
                  <p className="alerts-card-desc">{card.description}</p>
                </div>

                <div className="alerts-card-meta-list">
                  <div className="alerts-card-meta-item">
                    <Database size={14} className="meta-icon" />
                    <span>Live from database</span>
                  </div>
                  <div className="alerts-card-meta-item">
                    <Building size={14} className="meta-icon" />
                    <span>All Departments</span>
                  </div>
                </div>

                <div className="alerts-card-bottom-row">
                  <div className="alerts-card-open-items">
                    <span className="open-items-label">OPEN ITEMS</span>
                    <strong className="open-items-val">{openItemsNum}</strong>
                  </div>

                  <button
                    type="button"
                    className="alerts-card-view-btn"
                    onClick={() => {
                      if (isLeaveApproval) {
                        navigate(`/dashboard/alerts/leave-approval${getPreservedSearch()}`);
                      } else {
                        navigate(`/dashboard/alerts/${card.id}${getPreservedSearch()}`);
                      }
                    }}
                    id={`view-alert-${card.id}`}
                  >
                    <span>View</span>
                    <PiArrowRightDuotone size={16} />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* 6. ALERT CENTER FOOTER */}
      <footer className="alerts-bottom-footer-card">
        <div className="alerts-footer-left">
          <span className="alerts-footer-icon-wrap">
            <PiClipboardTextDuotone size={20} />
          </span>
          <div className="alerts-footer-text">
            <strong>Alert Center</strong>
            <span>Pending requests, setup issues and process alerts are maintained here.</span>
          </div>
        </div>

        <div className="alerts-footer-right">
          <span className="alerts-monitoring-active-pill">
            <span className="leave-status-live-dot" />
            System monitoring active
          </span>
        </div>
      </footer>
    </main>
  );
}

export default function AlertPage(props) {
  const isInsideShell = useContext(DashboardShellContext);

  if (!isInsideShell) {
    return (
      <DashboardShell
        customTitle="Alerts"
        customSubtitle="Review system and attendance process alerts."
      >
        <AlertPageContent {...props} />
      </DashboardShell>
    );
  }

  return <AlertPageContent {...props} />;
}