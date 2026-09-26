import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Check,
  X,
  Pencil,
  Download,
  Plus,
  RotateCw,
  Clock,
  CalendarDays,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardShell } from "../../components/header/DashboardHeader";
import CustomSelect from "../../components/ui/CustomSelect";
import "./LeaveApplication.css";

/* =========================================================
   LEAVE APPLICATION — Admin / Employee / Team Leader
   Renders inside the shared DashboardShell (sidebar + shared
   3D purple header). Reference: HRMS Purple "Leave Application"
   sanction page.
   ========================================================= */

import { getApiBaseUrl } from "../../utils/apiBase";

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

const INITIAL_LEAVES = [];

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
  return {
    id: item.id || `LV-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    employeeName,
    empCode: item.empCode || item.emp_code || item.code || "",
    initials: item.initials || getInitials(employeeName) || "EM",
    avatarTone: item.avatarTone || "tone-purple",
    category: item.category || item.type || item.leaveType || "Casual Leave",
    startDate: toDateInput(item.startDate || item.start_date || item.from || item.from_date),
    endDate: toDateInput(item.endDate || item.end_date || item.to || item.to_date),
    days: calculatedDays,
    reason: item.reason || item.comment || "",
    status: item.status || "Pending",
    approver: item.approver || (item.status === "Approved" ? "Admin" : "Admin Approver"),
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
  const [visibleCount, setVisibleCount] = useState(8);
  const [leaves, setLeaves] = useState(() => {
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
          return arr.map(normalizeLeave);
        }
      }
    } catch (error) {
      console.error("Unable to load saved leave data:", error);
    }
    return [];
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [addForm, setAddForm] = useState({
    category: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [editForm, setEditForm] = useState({
    category: "",
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
        if (Array.isArray(data)) {
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
    const interval = setInterval(fetchLeaves, 4000);
    const onSync = () => fetchLeaves();
    window.addEventListener("focus", onSync);
    window.addEventListener("leave-balance-updated", onSync);
    window.addEventListener("leave-applied", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
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
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  /* ── derived counts ────────────────────────────────── */
  const pendingCount = leaves.filter((item) => item.status === "Pending").length;
  const completedCount = leaves.length - pendingCount;

  const filteredLeaves = leaves
    .filter((item) => {
      if (activeTab === "Pending") return item.status === "Pending";
      if (activeTab === "Completed") return item.status !== "Pending";
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
      ].some((v) => String(v || "").toLowerCase().includes(term));
    })
    .sort((a, b) => {
      const aTime = new Date(a.startDate || 0).getTime();
      const bTime = new Date(b.startDate || 0).getTime();
      return bTime - aTime;
    });

  const displayedLeaves = filteredLeaves.slice(0, visibleCount);


  /* ── actions ───────────────────────────────────────── */
  const handleApprove = async (id) => {
    setLeaves((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "Approved", approver: readProfile().name || "Admin Approver" }
          : item
      )
    );
    toast.success("Leave application approved.");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leaves/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        await fetch(`${API_BASE_URL}/leave/${id}/approve`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        });
      }
      fetchLeaves();
      window.dispatchEvent(new Event("leave-balance-updated"));
      window.dispatchEvent(new Event("leave-applied"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'leave-updated', id, timestamp: Date.now() }));
      } catch (e) { }
    } catch (err) {
      console.warn("Backend approve leave error:", err);
    }
  };

  const handleReject = async (id) => {
    setLeaves((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "Rejected", approver: readProfile().name || "Admin Approver" }
          : item
      )
    );
    toast.success("Leave application rejected.");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leaves/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        await fetch(`${API_BASE_URL}/leave/${id}/reject`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        });
      }
      fetchLeaves();
      window.dispatchEvent(new Event("leave-balance-updated"));
      window.dispatchEvent(new Event("leave-applied"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'leave-updated', id, timestamp: Date.now() }));
      } catch (e) { }
    } catch (err) {
      console.warn("Backend reject leave error:", err);
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
      emp_code: profile.empCode || "EMP001",
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

    try {
      const res = await fetch(`${API_BASE_URL}/leave/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    setEditForm({
      category: item.category,
      startDate: item.startDate,
      endDate: item.endDate,
      reason: item.reason || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editItem) return;
    const days = countWorkingDays(editForm.startDate, editForm.endDate);
    if (!editForm.startDate || !editForm.endDate || days <= 0) {
      toast.error("Please select a valid working-day date range.");
      return;
    }
    setLeaves((prev) =>
      prev.map((item) =>
        item.id === editItem.id
          ? {
            ...item,
            category: editForm.category,
            startDate: editForm.startDate,
            endDate: editForm.endDate,
            days,
            reason: editForm.reason.trim(),
          }
          : item
      )
    );
    setEditItem(null);
    toast.success("Leave application updated.");
  };

  const handleBulkApprove = async () => {
    const pending = filteredLeaves.filter((item) => item.status === "Pending");
    if (pending.length === 0) {
      toast.error("No pending applications in the current view.");
      return;
    }
    const ids = new Set(pending.map((item) => item.id));
    setLeaves((prev) =>
      prev.map((item) =>
        ids.has(item.id)
          ? { ...item, status: "Approved", approver: readProfile().name || "Admin Approver" }
          : item
      )
    );
    setActionsOpen(false);
    toast.success(`Approved ${pending.length} pending application(s).`);

    for (const item of pending) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/leaves/${item.id}/approve`, { method: "PUT" });
      } catch { }
    }
    fetchLeaves();
    window.dispatchEvent(new Event("leave-balance-updated"));
    window.dispatchEvent(new Event("leave-applied"));
  };

  const handleBulkReject = async () => {
    const pending = filteredLeaves.filter((item) => item.status === "Pending");
    if (pending.length === 0) {
      toast.error("No pending applications in the current view.");
      return;
    }
    const ids = new Set(pending.map((item) => item.id));
    setLeaves((prev) =>
      prev.map((item) =>
        ids.has(item.id)
          ? { ...item, status: "Rejected", approver: readProfile().name || "Admin Approver" }
          : item
      )
    );
    setActionsOpen(false);
    toast.success(`Rejected ${pending.length} pending application(s).`);

    for (const item of pending) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/leaves/${item.id}/reject`, { method: "PUT" });
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



  const handleLoadMore = () => setVisibleCount((count) => count + 8);

  const statusBadgeClass = (status) => {
    const map = {
      Pending: "la-status la-status-pending",
      Approved: "la-status la-status-approved",
      Rejected: "la-status la-status-rejected",
    };
    return map[status] || "la-status la-status-pending";
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
          {/* ── toolbar: tabs + controls ── */}
          <div className="la-toolbar">
            <div className="la-tabs" role="tablist" aria-label="Leave application status">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "Pending"}
                className={`la-tab-btn ${activeTab === "Pending" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("Pending");
                  setVisibleCount(8);
                }}
              >
                Pending Applications
                <span className="la-tab-count">{pendingCount}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "Completed"}
                className={`la-tab-btn ${activeTab === "Completed" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("Completed");
                  setVisibleCount(8);
                }}
              >
                Completed Applications
                <span className="la-tab-count">{completedCount}</span>
              </button>
            </div>

            <div className="la-controls">
              <div className="la-search-wrap">
                <input
                  type="text"
                  className="la-search-input"
                  placeholder="Search employee, category or reason"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search leave applications"
                />
              </div>

              <div className="la-filter-wrap" ref={filterRef}>
                <button
                  type="button"
                  className={`la-icon-btn ${categoryFilter !== "All Categories" ? "is-active" : ""}`}
                  title="Filter by category"
                  aria-expanded={filterOpen}
                  onClick={() => setFilterOpen((prev) => !prev)}
                >
                  <SlidersHorizontal size={17} />
                </button>

                {filterOpen && (
                  <div className="la-filter-menu" role="menu">
                    <button
                      type="button"
                      className={categoryFilter === "All Categories" ? "is-selected" : ""}
                      onClick={() => {
                        setCategoryFilter("All Categories");
                        setFilterOpen(false);
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
                  Actions
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
                      New Request
                    </button>
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
          </div>


          {/* ── table ── */}
          <div className="la-table-card">
            <table className="la-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Category</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Leave Days</th>
                  <th>Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="la-empty-cell">
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

                      <td className="la-date-cell">{formatDate(item.startDate)}</td>
                      <td className="la-date-cell">{formatDate(item.endDate)}</td>

                      <td>
                        <span className="la-days">
                          <CalendarDays size={13} />
                          {item.days} {item.days === 1 ? "Day" : "Days"}
                        </span>
                      </td>

                      <td>
                        <div>
                          <span className={statusBadgeClass(item.status)}>{item.status}</span>
                          {item.approver && (
                            <span className="la-status-sub">with: {item.approver}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="la-action-btns">
                          <button
                            type="button"
                            className="la-row-btn"
                            title="Edit / View Details"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil size={14} />
                          </button>
                          {item.status === "Pending" && (
                            <>
                              <button
                                type="button"
                                className="la-row-btn approve"
                                title="Approve Application"
                                onClick={() => handleApprove(item.id)}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                className="la-row-btn reject"
                                title="Reject Application"
                                onClick={() => handleReject(item.id)}
                              >
                                <X size={14} />
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

          {/* ── load more ── */}
          {filteredLeaves.length > visibleCount && (
            <div className="la-load-more-wrap">
              <button
                type="button"
                className="la-load-more-btn"
                onClick={handleLoadMore}
              >
                <RotateCw size={15} />
                Load More
              </button>
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
                  <CustomSelect
                    value={editForm.category}
                    onChange={(val) =>
                      setEditForm((prev) => ({ ...prev, category: val }))
                    }
                    options={LEAVE_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                  />
                </div>

                <div className="la-grid-2">
                  <div className="la-form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="la-form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="la-form-group">
                  <label>Status</label>
                  <input type="text" readOnly value={editItem.status} />
                </div>

                <div className="la-form-group">
                  <label>Reason</label>
                  <textarea
                    value={editForm.reason}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="la-modal-foot">
                {editItem.status === "Pending" && (
                  <>
                    <button
                      type="button"
                      className="la-btn-reject"
                      onClick={() => {
                        handleReject(editItem.id);
                        setEditItem(null);
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="la-btn-submit"
                      onClick={() => {
                        handleApprove(editItem.id);
                        setEditItem(null);
                      }}
                    >
                      Approve
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
                <button type="button" className="la-btn-submit" onClick={handleSaveEdit}>
                  Save Changes
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

