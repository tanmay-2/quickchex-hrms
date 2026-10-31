// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - LEAVEAPPLICATION.JSX
// Path: Frontend/hrms-frontend/src/pages/Dashboard/LeaveApplication.jsx
// Purpose: Web portal page component managing 'LeaveApplication' views, user interactions, and state.
// UI Components:
//   • <API_BASE_URL />
//   • <LEAVE_CATEGORIES />
//   • <INITIAL_LEAVES />
//   • <LeaveApplication />
// Key Functions & Handlers:
//   • getInitials()
//   • parseSafeDate()
//   • toDateInput()
//   • formatDate()
//   • isWeekday()
//   • countWorkingDays()
//   • parseDays()
//   • tryParse()
//   • ... and 17 more handlers
// ==============================================================================

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Check,
  X,
  Eye,
  Download,
  Plus,
  RotateCw,
  Clock,
  CalendarDays,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardShell } from "../../components/header/DashboardHeader";
import CustomSelect from "../../components/ui/CustomSelect";
import { ApprovalProgress } from "../../components/ApprovalProgress/ApprovalProgress";
import "./LeaveApplication.css";
import { getApiBaseUrl } from "../../services/apiClient";

/* =========================================================
   LEAVE APPLICATION — Admin / Employee / Team Leader
   Renders inside the shared DashboardShell (sidebar + shared
   3D purple header). Reference: HRMS Purple "Leave Application"
   sanction page.
   ========================================================= */

const API_BASE_URL = getApiBaseUrl();

const LEAVE_CATEGORIES = [
  "Casual Leave",
  "Sick Leave",
  "Earned Leave",
  "Maternity Leave",
  "Comp Off",
  "Leave Without Pay",
  "Compassionate Leave",
];

const INITIAL_LEAVES = [
  // 6 Pending Applications (matching reference screenshot 1)
  {
    id: "LV-1001",
    employeeName: "Rohit Sharma",
    empCode: "EMP012",
    initials: "RS",
    avatarTone: "tone-blue",
    category: "Casual Leave",
    startDate: "2026-08-18",
    endDate: "2026-08-20",
    days: 3,
    reason: "Family function in hometown",
    overall_status: "PENDING_MANAGER",
    manager_status: "PENDING",
    admin_status: "PENDING",
    status: "Pending",
  },
  {
    id: "LV-1002",
    employeeName: "Priya Gupta",
    empCode: "EMP008",
    initials: "PG",
    avatarTone: "tone-pink",
    category: "Sick Leave",
    startDate: "2026-08-22",
    endDate: "2026-08-24",
    days: 3,
    reason: "Severe viral fever and doctor consultation",
    overall_status: "PENDING_MANAGER",
    manager_status: "PENDING",
    admin_status: "PENDING",
    status: "Pending",
  },
  {
    id: "LV-1003",
    employeeName: "Amit Mehta",
    empCode: "EMP015",
    initials: "AM",
    avatarTone: "tone-green",
    category: "Personal Leave",
    startDate: "2026-08-25",
    endDate: "2026-08-26",
    days: 2,
    reason: "Personal banking and house shifting work",
    overall_status: "PENDING_MANAGER",
    manager_status: "PENDING",
    admin_status: "PENDING",
    status: "Pending",
  },
  {
    id: "LV-1004",
    employeeName: "Sneha Nair",
    empCode: "EMP021",
    initials: "SN",
    avatarTone: "tone-purple",
    category: "Earned Leave",
    startDate: "2026-08-28",
    endDate: "2026-08-30",
    days: 3,
    reason: "Annual vacation with family",
    overall_status: "PENDING_MANAGER",
    manager_status: "PENDING",
    admin_status: "PENDING",
    status: "Pending",
  },
  {
    id: "LV-1005",
    employeeName: "Vikram Kumar",
    empCode: "EMP005",
    initials: "VK",
    avatarTone: "tone-amber",
    category: "Casual Leave",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
    days: 5,
    reason: "Attending sister's wedding ceremony",
    overall_status: "PENDING_MANAGER",
    manager_status: "PENDING",
    admin_status: "PENDING",
    status: "Pending",
  },
  {
    id: "LV-1006",
    employeeName: "Ananya Roy",
    empCode: "EMP019",
    initials: "AR",
    avatarTone: "tone-cyan",
    category: "Sick Leave",
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    days: 3,
    reason: "Medical procedure and doctor advised rest",
    overall_status: "PENDING_MANAGER",
    manager_status: "PENDING",
    admin_status: "PENDING",
    status: "Pending",
  },

  // 14 Completed Applications (matching reference screenshot 2)
  {
    id: "LV-2001",
    employeeName: "Aaquib Khan",
    empCode: "ADM001",
    initials: "AK",
    avatarTone: "tone-green",
    category: "Casual Leave",
    startDate: "2026-08-12",
    endDate: "2026-08-14",
    days: 3,
    reason: "Urgent personal task",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
  {
    id: "LV-2002",
    employeeName: "Sneha Sharma",
    empCode: "EMP003",
    initials: "SS",
    avatarTone: "tone-purple",
    category: "Medical Leave",
    startDate: "2026-08-05",
    endDate: "2026-08-06",
    days: 2,
    reason: "Eye checkup and rest",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
  {
    id: "LV-2003",
    employeeName: "Rahul Kumar",
    empCode: "EMP014",
    initials: "RK",
    avatarTone: "tone-blue",
    category: "Personal Leave",
    startDate: "2026-07-21",
    endDate: "2026-07-22",
    days: 2,
    reason: "Government office documentation appointment",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
  {
    id: "LV-2004",
    employeeName: "Neha Patel",
    empCode: "EMP007",
    initials: "NP",
    avatarTone: "tone-amber",
    category: "Casual Leave",
    startDate: "2026-07-10",
    endDate: "2026-07-10",
    days: 1,
    reason: "Urgent domestic emergency",
    overall_status: "REJECTED",
    manager_status: "REJECTED",
    admin_status: "REJECTED",
    status: "Rejected",
    admin_reviewed_by: "Admin Approver",
    admin_rejection_reason: "Critical sprint delivery on this date",
  },
  {
    id: "LV-2005",
    employeeName: "Vikram Purushottam",
    empCode: "EMP002",
    initials: "VP",
    avatarTone: "tone-purple",
    category: "Earned Leave",
    startDate: "2026-07-01",
    endDate: "2026-07-03",
    days: 3,
    reason: "Mid-year break with family",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
  {
    id: "LV-2006",
    employeeName: "Payal Kaur",
    empCode: "EMP004",
    initials: "PK",
    avatarTone: "tone-pink",
    category: "Maternity Leave",
    startDate: "2026-06-15",
    endDate: "2026-09-15",
    days: 90,
    reason: "Maternity leave entitlement",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "HR Admin",
  },
  {
    id: "LV-2007",
    employeeName: "Elena Rostova",
    empCode: "LE724",
    initials: "ER",
    avatarTone: "tone-cyan",
    category: "Casual Leave",
    startDate: "2026-06-10",
    endDate: "2026-06-12",
    days: 3,
    reason: "Family visit to hometown",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
  {
    id: "LV-2008",
    employeeName: "Kevin John",
    empCode: "MGR001",
    initials: "KJ",
    avatarTone: "tone-blue",
    category: "Comp Off",
    startDate: "2026-06-01",
    endDate: "2026-06-02",
    days: 2,
    reason: "Worked on client deployment over weekend",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
  {
    id: "LV-2009",
    employeeName: "Monika Tiwari",
    empCode: "MGR002",
    initials: "MT",
    avatarTone: "tone-green",
    category: "Sick Leave",
    startDate: "2026-05-20",
    endDate: "2026-05-22",
    days: 3,
    reason: "Dental surgery and recovery",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
  {
    id: "LV-2010",
    employeeName: "Rakesh Singh",
    empCode: "LE002",
    initials: "RS",
    avatarTone: "tone-amber",
    category: "Earned Leave",
    startDate: "2026-05-11",
    endDate: "2026-05-15",
    days: 5,
    reason: "Annual leave and pilgrimage",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
  {
    id: "LV-2011",
    employeeName: "Akash Maurya",
    empCode: "LE120",
    initials: "AM",
    avatarTone: "tone-pink",
    category: "Casual Leave",
    startDate: "2026-05-02",
    endDate: "2026-05-03",
    days: 2,
    reason: "Personal travel",
    overall_status: "REJECTED",
    manager_status: "REJECTED",
    admin_status: "REJECTED",
    status: "Rejected",
    admin_reviewed_by: "Admin Approver",
    admin_rejection_reason: "Insufficient notice provided ahead of time",
  },
  {
    id: "LV-2012",
    employeeName: "Renuka Vishwakarma",
    empCode: "LE024",
    initials: "RV",
    avatarTone: "tone-purple",
    category: "Sick Leave",
    startDate: "2026-04-18",
    endDate: "2026-04-19",
    days: 2,
    reason: "Severe migraine doctor consultation",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
  {
    id: "LV-2013",
    employeeName: "Tanmay Salgaonkar",
    empCode: "EMP001",
    initials: "TS",
    avatarTone: "tone-blue",
    category: "Casual Leave",
    startDate: "2026-04-05",
    endDate: "2026-04-07",
    days: 3,
    reason: "Personal family commitment",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
  {
    id: "LV-2014",
    employeeName: "Pooja Hegde",
    empCode: "EMP018",
    initials: "PH",
    avatarTone: "tone-cyan",
    category: "Personal Leave",
    startDate: "2026-03-22",
    endDate: "2026-03-23",
    days: 2,
    reason: "House registry and personal work",
    overall_status: "APPROVED",
    manager_status: "APPROVED",
    admin_status: "APPROVED",
    status: "Approved",
    admin_reviewed_by: "Admin Approver",
  },
];

/* ── helpers ───────────────────────────────────────────── */
const getInitials = (name) =>
  String(name || "")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const parseSafeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const str = String(value).trim();
  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const toDateInput = (value) => {
  const d = parseSafeDate(value);
  if (!d) return String(value || "");
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  const d = parseSafeDate(value);
  if (!d) return value || "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const isWeekday = (date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6;
};

const countWorkingDays = (from, to) => {
  const start = parseSafeDate(from);
  const end = parseSafeDate(to);
  if (!start || !end || end < start) {
    return 0;
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  let total = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (isWeekday(cursor)) total += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(0, total);
};

const parseDays = (item) => {
  const tryParse = (val) => {
    if (typeof val === "number" && !isNaN(val) && val > 0) return val;
    if (typeof val === "string") {
      const match = val.match(/[\d.]+/);
      if (match) {
        const n = parseFloat(match[0]);
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return null;
  };
  const parsed = tryParse(item.total_days) ?? tryParse(item.totalDays) ?? tryParse(item.days) ?? tryParse(item.leaveDays);
  if (parsed != null) return parsed;

  const sStr = item.startDate || item.start_date || item.from || item.from_date;
  const eStr = item.endDate || item.end_date || item.to || item.to_date;
  const s = parseSafeDate(sStr);
  const e = parseSafeDate(eStr);
  if (s && e) {
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) return diff;
  }
  return 1;
};

/* Read the current logged-in user's display name / role */
const readProfile = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const storedEmployee = JSON.parse(localStorage.getItem("employee") || "null");
    const name =
      localStorage.getItem("user_name") ||
      storedUser?.name ||
      storedUser?.full_name ||
      storedEmployee?.name ||
      storedEmployee?.full_name ||
      "";
    const role =
      localStorage.getItem("user_role") ||
      storedUser?.role ||
      storedEmployee?.role ||
      "Employee";
    return { name, role, empCode: localStorage.getItem("emp_code") || "" };
  } catch {
    return { name: "", role: "Employee", empCode: "" };
  }
};

/* Normalize a stored/raw leave record into the page shape */
const normalizeLeave = (item) => {
  const employeeName = item.employeeName || item.employee_name || item.name || "Employee";
  const calculatedDays = parseDays(item);
  const rawStatus = (item.overall_status || item.status || "PENDING_MANAGER").toUpperCase();
  const rawMgr = (item.manager_status || "").toUpperCase();
  const rawAdm = (item.admin_status || "").toUpperCase();

  const isAppr =
    ["APPROVED", "COMPLETED", "PENDING_ADMIN", "APPROVED_BY_MANAGER"].includes(rawStatus) ||
    rawMgr === "APPROVED" ||
    rawAdm === "APPROVED";

  const isRej = rawStatus.includes("REJECT") || rawMgr.includes("REJECT") || rawAdm.includes("REJECT");

  let overall_status = "PENDING_MANAGER";
  if (isAppr) overall_status = "APPROVED";
  else if (isRej) overall_status = "REJECTED";

  const manager_status = isAppr ? "APPROVED" : (isRej ? "REJECTED" : "PENDING");
  const admin_status = isAppr ? "APPROVED" : (isRej ? "REJECTED" : "PENDING");
  const displayStatus = isAppr ? "Approved" : (isRej ? "Rejected" : "Pending Manager Review");

  return {
    id: item.id || `LV-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    rawId: item.rawId || (typeof item.id === "number" ? item.id : null),
    employeeName,
    empCode: item.empCode || item.emp_code || item.code || "",
    initials: item.initials || getInitials(employeeName) || "EM",
    avatarTone: item.avatarTone || "tone-purple",
    category: item.category || item.type || item.leaveType || "Casual Leave",
    startDate: toDateInput(item.startDate || item.start_date || item.from || item.from_date),
    endDate: toDateInput(item.endDate || item.end_date || item.to || item.to_date),
    days: calculatedDays,
    reason: item.reason || item.comment || "",
    overall_status,
    manager_status,
    admin_status,
    status: displayStatus,
    manager_reviewed_by: item.manager_reviewed_by || item.manager_name || "",
    manager_reviewed_at: item.manager_reviewed_at || null,
    manager_comment: item.manager_comment || "",
    manager_rejection_reason: item.manager_rejection_reason || "",
    admin_reviewed_by: item.admin_reviewed_by || "",
    admin_reviewed_at: item.admin_reviewed_at || null,
    admin_comment: item.admin_comment || "",
    admin_rejection_reason: item.admin_rejection_reason || "",
    submitted_at: item.submitted_at || item.created_at || null,
    approver: item.approver || (overall_status === "APPROVED" ? (item.admin_reviewed_by || "Admin") : "Admin Approver"),
  };
};


const LeaveApplication = () => {
  const navigate = useNavigate();

  /* ── state ─────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionSubmittingId, setActionSubmittingId] = useState(null);
  const [leaves, setLeaves] = useState(() => {
    let savedArr = null;
    try {
      const sources = ["leave_requests", "leaveRequests", "allLeaves"];
      for (const key of sources) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.data)
            ? parsed.data
            : Array.isArray(parsed?.requests)
              ? parsed.requests
              : null;
        if (Array.isArray(arr) && arr.length > 0) {
          savedArr = arr;
          break;
        }
      }
    } catch (error) {
      console.error("Unable to load saved leave data:", error);
    }

    // Merge: Seed initial leaves first, then overlay saved leaves
    const map = new Map();
    INITIAL_LEAVES.forEach((item) => {
      const norm = normalizeLeave(item);
      map.set(norm.id, norm);
    });

    if (Array.isArray(savedArr)) {
      savedArr.forEach((item) => {
        const norm = normalizeLeave(item);
        map.set(norm.id, norm);
      });
    }

    return Array.from(map.values());
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [addForm, setAddForm] = useState({
    category: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const actionsRef = useRef(null);
  const filterRef = useRef(null);

  /* ── Fetch live leaves from backend API ── */
  const fetchLeaves = async () => {
    try {
      let res = await fetch(`${API_BASE_URL}/api/v1/leaves/admin/all`);
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/api/v1/leave/applications?all=true`);
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLeaves(data.map(normalizeLeave));
          return;
        }
      }
    } catch (err) {
      console.warn("Backend leave fetch fallback:", err);
    }
  };

  useEffect(() => {
    fetchLeaves();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden")) return;
      fetchLeaves();
    }, 30000);

    const onSync = () => {
      if (typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden")) return;
      fetchLeaves();
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden && document.visibilityState === "visible") {
        fetchLeaves();
      }
    };

    window.addEventListener("focus", onSync);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("leave-balance-updated", onSync);
    window.addEventListener("leave-applied", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("leave-balance-updated", onSync);
      window.removeEventListener("leave-applied", onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  /* ── persist to the existing localStorage data flow ── */
  useEffect(() => {
    try {
      localStorage.setItem("leave_requests", JSON.stringify(leaves));
    } catch (error) {
      console.error("Unable to save leave data:", error);
    }
  }, [leaves]);

  /* Close menus on outside click */
  useEffect(() => {
    const handleOutside = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setActionsOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
      if (!e.target.closest(".la-card-menu-wrap")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  /* ── derived counts ────────────────────────────────── */
  const pendingCount = leaves.filter((item) => ["PENDING_MANAGER", "PENDING_ADMIN"].includes(item.overall_status)).length;
  const completedCount = leaves.filter((item) => ["APPROVED", "REJECTED"].includes(item.overall_status)).length;

  const filteredLeaves = leaves
    .filter((item) => {
      if (activeTab === "Pending") return ["PENDING_MANAGER", "PENDING_ADMIN"].includes(item.overall_status);
      if (activeTab === "Completed") return ["APPROVED", "REJECTED"].includes(item.overall_status);
      return true;
    })
    .filter(
      (item) =>
        categoryFilter === "All Categories" || item.category === categoryFilter
    )
    .filter((item) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return [
        item.employeeName,
        item.empCode,
        item.category,
        item.reason,
        item.status,
        item.overall_status,
      ].some((v) => String(v || "").toLowerCase().includes(term));
    })
    .sort((a, b) => {
      const aTime = new Date(a.startDate || 0).getTime();
      const bTime = new Date(b.startDate || 0).getTime();
      return bTime - aTime;
    });

  const displayedLeaves = filteredLeaves.slice(0, visibleCount);


  /* ── raw ID helper ── */
  const getRawId = (id) => {
    const item = leaves.find((r) => r.id === id);
    if (item && item.rawId) return item.rawId;
    const num = String(id).replace(/[^0-9]/g, "");
    return num ? parseInt(num, 10) : id;
  };

  /* ── actions ───────────────────────────────────────── */
  const handleApprove = async (id) => {
    const rawId = getRawId(id);
    if (actionSubmittingId) return;
    setActionSubmittingId(id);

    // Optimistic UI update so status changes immediately
    setLeaves((prev) =>
      prev.map((item) =>
        item.id === id || item.rawId === rawId || String(item.id) === String(id)
          ? {
              ...item,
              overall_status: "APPROVED",
              manager_status: "APPROVED",
              admin_status: "APPROVED",
              status: "Approved",
            }
          : item
      )
    );

    const profile = readProfile();
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken") || "";

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leaves/${rawId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          admin_name: profile.name || "Admin Approver",
          approver_role: "admin",
          comment: "Approved by Admin"
        })
      });
      if (res.ok) {
        toast.success("Leave application approved successfully.");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Unable to approve this request.");
      }
      await fetchLeaves();
      window.dispatchEvent(new Event("leave-balance-updated"));
      window.dispatchEvent(new Event("leave-applied"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'leave-updated', id, timestamp: Date.now() }));
      } catch (e) { }
    } catch (err) {
      console.warn("Backend approve leave error:", err);
      toast.error("Unable to approve this request.");
      await fetchLeaves();
    } finally {
      setActionSubmittingId(null);
    }
  };

  const handleRejectClick = (item) => {
    setRejectItem(item);
    setRejectReason("");
  };

  const handleRejectConfirm = async () => {
    if (!rejectItem) return;
    if (!rejectReason.trim()) {
      toast.error("Please enter a reason for rejection.");
      return;
    }
    const rawId = getRawId(rejectItem.id);
    setActionSubmittingId(rejectItem.id);

    // Optimistic UI update so status changes immediately
    setLeaves((prev) =>
      prev.map((item) =>
        item.id === rejectItem.id || item.rawId === rawId || String(item.id) === String(rejectItem.id)
          ? {
              ...item,
              overall_status: "REJECTED",
              manager_status: "REJECTED",
              admin_status: "REJECTED",
              status: "Rejected",
            }
          : item
      )
    );

    const profile = readProfile();
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken") || "";

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leaves/${rawId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          rejection_reason: rejectReason.trim(),
          comment: rejectReason.trim(),
          reason: rejectReason.trim(),
          admin_name: profile.name || "Admin Approver",
          approver_role: "admin"
        }),
      });
      if (res.ok) {
        toast.success("Request rejected successfully.");
        setRejectItem(null);
        setRejectReason("");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Unable to reject this request.");
      }
      await fetchLeaves();
      window.dispatchEvent(new Event("leave-balance-updated"));
      window.dispatchEvent(new Event("leave-applied"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'leave-updated', id: rejectItem.id, timestamp: Date.now() }));
      } catch (e) { }
    } catch (err) {
      console.warn("Backend reject leave error:", err);
      toast.error("Unable to reject this request.");
      await fetchLeaves();
    } finally {
      setActionSubmittingId(null);
    }
  };

  const handleAddSubmit = async () => {
    if (!addForm.startDate || !addForm.endDate) {
      toast.error("Please select start and end dates.");
      return;
    }
    const days = countWorkingDays(addForm.startDate, addForm.endDate) || 1;
    const profile = readProfile();
    const payload = {
      emp_code: profile.empCode,
      category: addForm.category || "Casual Leave",
      type: addForm.category || "Casual Leave",
      start_date: addForm.startDate,
      end_date: addForm.endDate,
      from: addForm.startDate,
      to: addForm.endDate,
      total_days: days,
      days: String(days),
      reason: addForm.reason || "",
      has_half_days: false,
    };

    if (!payload.emp_code) {
      toast.error("Your employee profile is missing. Please sign in again.");
      return;
    }

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken") || "";
      const res = await fetch(`${API_BASE_URL}/leave/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Leave application submitted successfully.");
        setAddOpen(false);
        setAddForm({ category: "Casual Leave", startDate: "", endDate: "", reason: "" });
        fetchLeaves();
        window.dispatchEvent(new Event("leave-balance-updated"));
        window.dispatchEvent(new Event("leave-applied"));
        window.dispatchEvent(new Event("attendance-updated"));
        try {
          localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'leave-updated', timestamp: Date.now() }));
        } catch (e) { }
      } else {
        toast.error("Failed to submit leave application.");
      }
    } catch (err) {
      console.warn("Submit leave error:", err);
      toast.error("Error submitting leave application to server.");
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
  };

  const handleBulkApprove = async () => {
    const pending = filteredLeaves.filter((item) => ["PENDING_MANAGER", "PENDING_ADMIN"].includes(item.overall_status));
    if (pending.length === 0) {
      toast.error("No pending applications in the current view.");
      return;
    }
    const ids = new Set(pending.map((item) => item.id));
    setLeaves((prev) =>
      prev.map((item) =>
        ids.has(item.id)
          ? { ...item, overall_status: "APPROVED", status: "Approved", admin_status: "APPROVED", approver: readProfile().name || "Admin Approver" }
          : item
      )
    );
    setActionsOpen(false);
    toast.success(`Approved ${pending.length} pending application(s).`);

    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken") || "";
    for (const item of pending) {
      try {
        const rawId = getRawId(item.id);
        await fetch(`${API_BASE_URL}/api/v1/leaves/${rawId}/approve`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ admin_name: readProfile().name || "Admin Approver", approver_role: "admin", comment: "Bulk Approved" })
        });
      } catch { }
    }
    fetchLeaves();
    window.dispatchEvent(new Event("leave-balance-updated"));
    window.dispatchEvent(new Event("leave-applied"));
  };

  const handleBulkReject = async () => {
    const pending = filteredLeaves.filter((item) => ["PENDING_MANAGER", "PENDING_ADMIN"].includes(item.overall_status));
    if (pending.length === 0) {
      toast.error("No pending applications in the current view.");
      return;
    }
    const ids = new Set(pending.map((item) => item.id));
    setLeaves((prev) =>
      prev.map((item) =>
        ids.has(item.id)
          ? { ...item, overall_status: "REJECTED", status: "Rejected", admin_status: "REJECTED", approver: readProfile().name || "Admin Approver" }
          : item
      )
    );
    setActionsOpen(false);
    toast.success(`Rejected ${pending.length} pending application(s).`);

    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken") || "";
    for (const item of pending) {
      try {
        const rawId = getRawId(item.id);
        await fetch(`${API_BASE_URL}/api/v1/leaves/${rawId}/reject`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ admin_name: readProfile().name || "Admin Approver", approver_role: "admin", comment: "Bulk Rejected", rejection_reason: "Bulk Rejected" })
        });
      } catch { }
    }
    fetchLeaves();
    window.dispatchEvent(new Event("leave-balance-updated"));
    window.dispatchEvent(new Event("leave-applied"));
  };


  const handleExportCSV = () => {
    const headers = [
      "Employee Name",
      "Emp Code",
      "Category",
      "Start Date",
      "End Date",
      "Leave Days",
      "Reason",
      "Status",
    ];
    const rows = filteredLeaves.map((item) => [
      item.employeeName,
      item.empCode,
      item.category,
      item.startDate,
      item.endDate,
      item.days,
      item.reason,
      item.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "leave-applications.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setActionsOpen(false);
    toast.success("Leave applications exported to CSV.");
  };



  const handleLoadMore = () => setVisibleCount((count) => count + 5);

  const statusBadgeClass = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "PENDING_ADMIN") return "la-status la-status-pending-admin";
    if (s === "APPROVED") return "la-status la-status-approved";
    if (s === "REJECTED") return "la-status la-status-rejected";
    return "la-status la-status-pending";
  };

  const profile = readProfile();

  return (
    <DashboardShell
      customTitle="Leave Application"
      customSubtitle="Sanction applied applications for leaves by Employees."
    >
      <div className="leave-application-page">
        <Toaster
          position="top-center"
          reverseOrder={false}
          containerStyle={{ zIndex: 99999 }}
        />

        <div className="la-body">
          {/* 1. Segmented Control Tabs */}
          <div className="la-tabs" role="tablist" aria-label="Leave application status">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Pending"}
              className={`la-tab-btn ${activeTab === "Pending" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("Pending");
                setVisibleCount(5);
              }}
            >
              <span className="la-tab-label">
                <span>Pending</span>
                <span>Applications</span>
              </span>
              <span className="la-tab-count">{pendingCount}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Completed"}
              className={`la-tab-btn ${activeTab === "Completed" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("Completed");
                setVisibleCount(5);
              }}
            >
              <span className="la-tab-label">
                <span>Completed</span>
                <span>Applications</span>
              </span>
              <span className="la-tab-count">{completedCount}</span>
            </button>
          </div>

          {/* 2. Full-Width Search Input */}
          <div className="la-search-wrap">
            <Search size={18} className="la-search-icon" />
            <input
              type="text"
              className="la-search-input"
              placeholder="Search employee, category or reason"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(5);
              }}
              aria-label="Search leave applications"
            />
          </div>

          {/* 3. Sub-Toolbar: Filters on Left, Actions on Right */}
          <div className="la-sub-toolbar">
            <div className="la-filter-wrap" ref={filterRef}>
              <button
                type="button"
                className={`la-filter-btn ${categoryFilter !== "All Categories" ? "is-active" : ""}`}
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((prev) => !prev)}
              >
                <SlidersHorizontal size={16} />
                <span>Filters</span>
                {categoryFilter !== "All Categories" && (
                  <span className="la-filter-dot" />
                )}
              </button>

              {filterOpen && (
                <div className="la-filter-menu" role="menu">
                  <button
                    type="button"
                    className={categoryFilter === "All Categories" ? "is-selected" : ""}
                    onClick={() => {
                      setCategoryFilter("All Categories");
                      setFilterOpen(false);
                      setVisibleCount(5);
                    }}
                  >
                    All Categories
                  </button>
                  {LEAVE_CATEGORIES.map((category) => (
                    <button
                      type="button"
                      key={category}
                      className={categoryFilter === category ? "is-selected" : ""}
                      onClick={() => {
                        setCategoryFilter(category);
                        setFilterOpen(false);
                        setVisibleCount(5);
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="la-actions-wrap" ref={actionsRef}>
              <button
                type="button"
                className="la-actions-btn"
                aria-expanded={actionsOpen}
                onClick={() => setActionsOpen((prev) => !prev)}
              >
                <span>Actions</span>
                <ChevronDown size={15} className={actionsOpen ? "is-rotated" : ""} />
              </button>

              {actionsOpen && (
                <div className="la-actions-menu" role="menu">
                  <button
                    type="button"
                    onClick={() => {
                      setAddOpen(true);
                      setActionsOpen(false);
                    }}
                  >
                    <Plus size={15} />
                    <span>New Request</span>
                  </button>
                  <button type="button" onClick={handleBulkApprove}>
                    <Check size={15} />
                    <span>Bulk Approve</span>
                  </button>
                  <button type="button" onClick={handleBulkReject}>
                    <X size={15} />
                    <span>Bulk Reject</span>
                  </button>
                  <button type="button" onClick={handleExportCSV}>
                    <Download size={15} />
                    <span>Export CSV</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. Desktop Table (Hidden on mobile <= 768px) */}
          <div className="la-table-card la-desktop-table">
            <div className="la-table-scroll">
              <table className="la-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Category</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Leave Days</th>
                    <th>Manager Approval</th>
                    <th>Admin Approval</th>
                    <th>Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="la-empty-cell">
                        <div className="la-empty">
                          <Clock size={36} />
                          <strong>No Leave Applications Found</strong>
                          <span>
                            There are currently no {activeTab.toLowerCase()} leave applications
                            matching your filters.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedLeaves.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="la-emp-cell">
                            <div className={`la-emp-avatar ${item.avatarTone}`}>
                              {item.initials}
                            </div>
                            <div>
                              <span className="la-emp-name">{item.employeeName}</span>
                              {item.empCode && (
                                <span className="la-emp-loc">{item.empCode}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="la-category">{item.category}</span>
                        </td>

                        <td className="la-col-date">{formatDate(item.startDate)}</td>
                        <td className="la-col-date">{formatDate(item.endDate)}</td>

                        <td>
                          <span className="la-days">
                            <CalendarDays size={13} />
                            {item.days} {item.days === 1 ? "Day" : "Days"}
                          </span>
                        </td>

                        <td>
                          <div>
                            <span className={`la-badge-mini ${item.manager_status === 'APPROVED' ? 'approved' : item.manager_status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                              {item.manager_status === 'APPROVED' ? '✓ Approved' : item.manager_status === 'REJECTED' ? '✕ Rejected' : '○ Pending'}
                            </span>
                            {item.manager_reviewed_by && (
                              <div style={{ fontSize: "11px", color: "var(--la-ink-muted)", marginTop: "2px" }}>
                                {item.manager_reviewed_by}
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          <div>
                            <span className={`la-badge-mini ${item.admin_status === 'APPROVED' ? 'approved' : item.admin_status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                              {item.admin_status === 'APPROVED' ? '✓ Approved' : item.admin_status === 'REJECTED' ? '✕ Rejected' : '○ Pending'}
                            </span>
                            {item.admin_reviewed_by && (
                              <div style={{ fontSize: "11px", color: "var(--la-ink-muted)", marginTop: "2px" }}>
                                {item.admin_reviewed_by}
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}>
                            <span className={`la-status-badge la-status-badge--${item.overall_status === "APPROVED" ? "approved" : item.overall_status === "REJECTED" ? "rejected" : "pending"}`}>
                              {item.overall_status === "APPROVED" ? "Approved" : item.overall_status === "REJECTED" ? "Rejected" : "Pending Review"}
                            </span>
                            <button
                              type="button"
                              className="la-row-btn"
                              title="View Details"
                              onClick={() => openEdit(item)}
                              aria-label={`View leave request details for ${item.employeeName}`}
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>

                        <td>
                          <div className="la-action-btns">
                            {["PENDING_MANAGER", "PENDING_ADMIN"].includes(item.overall_status) && (
                              <>
                                <button
                                  type="button"
                                  className="la-btn-action-text reject"
                                  title="Reject Application"
                                  disabled={actionSubmittingId === item.id}
                                  onClick={() => handleRejectClick(item)}
                                >
                                  <X size={13} />
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  className="la-btn-action-text approve"
                                  title="Approve Application"
                                  disabled={actionSubmittingId === item.id}
                                  onClick={() => handleApprove(item.id)}
                                >
                                  <Check size={13} />
                                  {actionSubmittingId === item.id ? "Approving..." : "Approve"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Mobile Cards View (Shown on mobile <= 768px, matching reference screenshot) */}
          <div className="la-mobile-cards la-mobile-only">
            {displayedLeaves.length === 0 ? (
              <div className="la-empty-state">
                <Clock size={36} />
                <strong>No Leave Applications Found</strong>
                <span>There are currently no {activeTab.toLowerCase()} leave applications matching your filters.</span>
                {(search || categoryFilter !== "All Categories") && (
                  <button
                    type="button"
                    className="la-clear-filters-btn"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("All Categories");
                      setVisibleCount(5);
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              displayedLeaves.map((item) => (
                <div
                  key={item.id}
                  className="la-app-card"
                  onClick={() => openEdit(item)}
                >
                  {/* Left Section: Avatar + Details */}
                  <div className="la-card-left">
                    <div className={`la-card-avatar ${item.avatarTone}`}>
                      {item.initials}
                    </div>
                    <div className="la-card-info">
                      <span className="la-card-name">{item.employeeName}</span>
                      <div className="la-card-dates">
                        <CalendarDays size={13} className="la-calendar-icon" />
                        <span>{formatDate(item.startDate)} - {formatDate(item.endDate)}</span>
                      </div>
                      <div className="la-card-category-row">
                        <span className="la-card-category">{item.category}</span>
                        {item.reason && item.reason.toLowerCase() !== item.category.toLowerCase() && (
                          <span className="la-card-reason" title={item.reason}>
                            • {item.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Status Pill + 3-Dots + Duration */}
                  <div className="la-card-right">
                    <div className="la-card-badge-row">
                      <span className={`la-status-pill ${item.overall_status.toLowerCase()}`}>
                        {item.overall_status === "APPROVED" ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Approved</span>
                          </>
                        ) : item.overall_status === "REJECTED" ? (
                          <>
                            <XCircle size={12} />
                            <span>Rejected</span>
                          </>
                        ) : (
                          <>
                            <Clock size={12} />
                            <span>Pending</span>
                          </>
                        )}
                      </span>

                      <div className="la-card-menu-wrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="la-card-menu-btn"
                          aria-label="Actions menu"
                          onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="la-card-dropdown" role="menu">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                openEdit(item);
                              }}
                            >
                              <Eye size={14} />
                              <span>View Details</span>
                            </button>
                            {["PENDING_MANAGER", "PENDING_ADMIN"].includes(item.overall_status) && (
                              <>
                                <button
                                  type="button"
                                  className="la-dd-approve"
                                  disabled={actionSubmittingId === item.id}
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleApprove(item.id);
                                  }}
                                >
                                  <Check size={14} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  className="la-dd-reject"
                                  disabled={actionSubmittingId === item.id}
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleRejectClick(item);
                                  }}
                                >
                                  <X size={14} />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="la-card-duration">
                      {item.days} {item.days === 1 ? "Day" : "Days"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 6. Dynamic Load More Button & Status Text */}
          {filteredLeaves.length > visibleCount && (
            <div className="la-load-more-section">
              <button
                type="button"
                className="la-load-more-btn"
                onClick={handleLoadMore}
              >
                <RotateCw size={15} />
                <span>Load More</span>
              </button>
              <span className="la-load-more-counter">
                Showing {Math.min(visibleCount, filteredLeaves.length)} of {filteredLeaves.length} {activeTab.toLowerCase()} applications
              </span>
            </div>
          )}

          {filteredLeaves.length <= visibleCount && filteredLeaves.length > 0 && (
            <div className="la-all-loaded-text">
              Showing all {filteredLeaves.length} of {filteredLeaves.length} {activeTab.toLowerCase()} applications
            </div>
          )}
        </div>


        {/* ── Add / New Request modal ── */}
        {addOpen && (
          <div className="la-modal-overlay" onClick={() => setAddOpen(false)}>
            <div className="la-modal" onClick={(e) => e.stopPropagation()}>
              <div className="la-modal-head">
                <h3>New Leave Application</h3>
                <button
                  type="button"
                  className="la-modal-close"
                  onClick={() => setAddOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="la-modal-body">
                <div className="la-form-group">
                  <label>Employee</label>
                  <input type="text" readOnly value={profile.name || "Employee"} />
                </div>

                <div className="la-form-group">
                  <label>Category</label>
                  <CustomSelect
                    value={addForm.category}
                    onChange={(val) =>
                      setAddForm((prev) => ({ ...prev, category: val }))
                    }
                    options={LEAVE_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                  />
                </div>

                <div className="la-grid-2">
                  <div className="la-form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={addForm.startDate}
                      onChange={(e) =>
                        setAddForm((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="la-form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={addForm.endDate}
                      onChange={(e) =>
                        setAddForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {addForm.startDate && addForm.endDate && (
                  <div className="la-preview">
                    <span>Leave Days</span>
                    <strong>
                      {countWorkingDays(addForm.startDate, addForm.endDate)} Days
                    </strong>
                  </div>
                )}

                <div className="la-form-group">
                  <label>Reason</label>
                  <textarea
                    placeholder="Briefly describe the reason for leave..."
                    value={addForm.reason}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="la-modal-foot">
                <button
                  type="button"
                  className="la-btn-cancel"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </button>
                <button type="button" className="la-btn-submit" onClick={handleAddSubmit}>
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ── Edit / View modal ── */}
        {editItem && (
          <div className="la-modal-overlay" onClick={() => setEditItem(null)}>
            <div className="la-modal" onClick={(e) => e.stopPropagation()}>
              <div className="la-modal-head">
                <h3>Leave Application Details</h3>
                <button
                  type="button"
                  className="la-modal-close"
                  onClick={() => setEditItem(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="la-modal-body">
                <div className="la-emp-cell" style={{ marginBottom: 8 }}>
                  <div className={`la-emp-avatar ${editItem.avatarTone}`}>
                    {editItem.initials}
                  </div>
                  <div>
                    <strong style={{ fontSize: 15 }}>{editItem.employeeName}</strong>
                    {editItem.empCode && (
                      <span className="la-emp-loc">{editItem.empCode}</span>
                    )}
                  </div>
                </div>

                <div className="la-form-group">
                  <label>Category</label>
                  <input type="text" readOnly value={editItem.category} />
                </div>

                <div className="la-grid-2">
                  <div className="la-form-group">
                    <label>Start Date</label>
                    <input
                      type="text"
                      readOnly
                      value={editItem.startDate}
                    />
                  </div>
                  <div className="la-form-group">
                    <label>End Date</label>
                    <input
                      type="text"
                      readOnly
                      value={editItem.endDate}
                    />
                  </div>
                </div>

                <div className="la-form-group">
                  <label>Status</label>
                  <input type="text" readOnly value={editItem.status} />
                </div>

                <div className="la-form-group">
                  <ApprovalProgress
                    overallStatus={editItem.overall_status}
                    managerStatus={editItem.manager_status}
                    adminStatus={editItem.admin_status}
                    managerName={editItem.manager_reviewed_by}
                    managerReviewedAt={editItem.manager_reviewed_at}
                    managerComment={editItem.manager_comment}
                    managerRejectionReason={editItem.manager_rejection_reason}
                    adminName={editItem.admin_reviewed_by}
                    adminReviewedAt={editItem.admin_reviewed_at}
                    adminComment={editItem.admin_comment}
                    adminRejectionReason={editItem.admin_rejection_reason}
                    submittedAt={editItem.submitted_at}
                  />
                </div>

                <div className="la-form-group">
                  <label>Reason</label>
                  <textarea
                    readOnly
                    value={editItem.reason || ""}
                  />
                </div>
              </div>

              <div className="la-modal-foot">
                {["PENDING_MANAGER", "PENDING_ADMIN"].includes(editItem.overall_status) && (
                  <>
                    <button
                      type="button"
                      className="la-btn-action-text reject"
                      style={{ padding: "8px 16px" }}
                      onClick={() => {
                        const itemToReject = editItem;
                        setEditItem(null);
                        handleRejectClick(itemToReject);
                      }}
                      disabled={actionSubmittingId === editItem.id}
                    >
                      <X size={14} />
                      Reject
                    </button>
                    <button
                      type="button"
                      className="la-btn-action-text approve"
                      style={{ padding: "8px 16px" }}
                      onClick={() => {
                        handleApprove(editItem.id);
                        setEditItem(null);
                      }}
                      disabled={actionSubmittingId === editItem.id}
                    >
                      <Check size={14} />
                      {actionSubmittingId === editItem.id ? "Approving..." : "Approve"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="la-btn-cancel"
                  onClick={() => setEditItem(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Rejection Modal ── */}
        {rejectItem && (
          <div className="la-modal-overlay" onClick={() => !actionSubmittingId && setRejectItem(null)}>
            <div className="la-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
              <div className="la-modal-head">
                <h3>Reject Leave Application</h3>
                <button
                  type="button"
                  className="la-modal-close"
                  onClick={() => !actionSubmittingId && setRejectItem(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="la-modal-body">
                <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--la-ink-muted)" }}>
                  Rejecting leave request for <strong>{rejectItem.employeeName}</strong> ({rejectItem.category}, {rejectItem.days} {rejectItem.days === 1 ? "day" : "days"}).
                </p>
                <div className="la-form-group">
                  <label>Reason for rejection <span style={{ color: "#dc2626" }}>*</span></label>
                  <textarea
                    placeholder="Enter reason for rejecting this leave application..."
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="la-modal-foot">
                <button
                  type="button"
                  className="la-btn-cancel"
                  onClick={() => setRejectItem(null)}
                  disabled={actionSubmittingId === rejectItem.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="la-btn-action-text reject"
                  style={{ padding: "8px 18px", fontSize: 13 }}
                  onClick={handleRejectConfirm}
                  disabled={actionSubmittingId === rejectItem.id}
                >
                  {actionSubmittingId === rejectItem.id ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
};

export default LeaveApplication;

