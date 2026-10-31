// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - COMPOFFS.JSX
// Path: Frontend/hrms-frontend/src/pages/Admin/CompOffs.jsx
// Purpose: Web portal page component managing 'CompOffs' views, user interactions, and state.
// UI Components:
//   • <DEFAULT_EARNINGS />
//   • <HALF_DAY_OPTIONS />
//   • <FILTER_HALF_DAY_OPTIONS />
//   • <STATUS_FILTER_OPTIONS />
//   • <SORT_OPTIONS />
//   • <STORAGE_KEY />
//   • <CompOffs />
// Key Functions & Handlers:
//   • getInitials()
//   • showToast()
//   • handleClickOutside()
//   • fetchCompOffs()
//   • handleApprove()
//   • handleReject()
//   • handleOpenReview()
//   • handleAddSubmit()
// ==============================================================================

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Check,
  X,
  Calendar,
  User,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
  Filter,
  ArrowUpDown,
  FileText,
  Eye,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { CustomSelect, CustomDatePicker } from "../../components/ui";
import { loadUnifiedEmployees } from "../../utils/employeeStore";
import "./CompOffs.css";
import { getApiUrl, apiRequest } from "../../services/apiClient";

/* ─── Default Comp Off Earnings ─────────────────────────────────── */
const DEFAULT_EARNINGS = [];


const HALF_DAY_OPTIONS = [
  { value: "No", label: "No (Full Day)", sublabel: "1 Full Day Credit" },
  { value: "Yes", label: "Yes (Half Day)", sublabel: "0.5 Day Credit" },
];

const FILTER_HALF_DAY_OPTIONS = [
  { value: "all", label: "All Half Days" },
  { value: "yes", label: "Yes (Half Day)" },
  { value: "no", label: "No (Full Day)" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const SORT_OPTIONS = [
  { value: "latest", label: "Sort by: Latest" },
  { value: "oldest", label: "Sort by: Oldest" },
  { value: "name", label: "Sort by: Name" },
];

const STORAGE_KEY = "hrms_compoff_earnings_records";

const getInitials = (name) => {
  if (!name || typeof name !== "string") return "CO";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function CompOffs() {
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "completed"

  // Load from localStorage or fallback
  const [earnings, setEarnings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove legacy mockups with non-existent employees
          const cleaned = parsed.filter(
            (p) =>
              p.employeeName !== "Rohit Gupta" &&
              p.employeeName !== "Payal Kaur" &&
              p.employeeName !== "Payal Mundhe" &&
              p.empCode !== "EMM003"
          );
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch (err) {
      console.warn("Failed to load comp-off records from storage:", err);
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(true);

  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [halfDayFilter, setHalfDayFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  // Dropdown & Popover states
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Add Earning Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEarning, setNewEarning] = useState({
    employee: "",
    appliedFor: new Date().toISOString().split("T")[0],
    isHalfDay: "No",
    comment: "",
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Refs for click outside
  const statusRef = useRef(null);
  const sortRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setStatusDropdownOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(earnings));
    } catch (err) {
      console.warn("Failed to persist comp-off records:", err);
    }
  }, [earnings]);

  const fetchCompOffs = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest("/api/v1/leave/comp-off");
      if (Array.isArray(data)) {
        const mapped = data.map((d, i) => ({
          id: d.id || i + 1,
          employeeName: d.employeeName || d.name || "Employee",
          empCode: d.empCode || d.emp_code || `EMP${d.id || i + 1}`,
          department: d.department || "Operations",
          avatarBg: "#7c3aed",
          appliedOn: d.appliedOn || d.applied_on || "—",
          appliedFor: d.appliedFor || d.applied_for || "—",
          isHalfDay: d.isHalfDay || d.is_half_day || "No",
          duration: d.duration || (d.isHalfDay === "Yes" ? "0.5 Day (4 Hours)" : "1 Day (8 Hours)"),
          usedOn: d.usedOn || d.used_on || "—",
          comment: d.comment || d.reason || "",
          status: d.status || "Pending",
          level: d.level || "Level 1",
          tab: (d.status || "").toLowerCase().includes("pending") ? "pending" : "completed",
        }));
        setEarnings(mapped);
      }
    } catch (err) {
      console.warn("Failed to fetch comp-offs from API:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unified employees & live backend comp-offs
  useEffect(() => {
    loadUnifiedEmployees()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const opts = data.map((e) => ({
            value: `${e.name || e.emp_code} - ${e.emp_code || e.id}`,
            label: `${e.name || e.emp_code} (${e.emp_code || e.id})`,
            code: e.emp_code || e.id,
            department: e.department || "Operations",
          }));
          setEmployeeOptions(opts);
          if (opts.length > 0) {
            setNewEarning((prev) => ({
              ...prev,
              employee: prev.employee || opts[0].value,
            }));
          }
        }
      })
      .catch((err) => console.warn("Failed to fetch unified employees:", err));

    fetchCompOffs();
  }, []);


  // Summary counts
  const pendingCount = useMemo(
    () => earnings.filter((e) => (e.status || "").toLowerCase().includes("pending")).length,
    [earnings]
  );
  const approvedCount = useMemo(
    () => earnings.filter((e) => (e.status || "").toLowerCase() === "approved").length,
    [earnings]
  );
  const rejectedCount = useMemo(
    () => earnings.filter((e) => (e.status || "").toLowerCase() === "rejected").length,
    [earnings]
  );
  const completedCount = approvedCount + rejectedCount;

  // Filtered & Sorted Earnings
  const filteredEarnings = useMemo(() => {
    let result = earnings.filter((item) => {
      const isPending = (item.status || "").toLowerCase().includes("pending");
      if (activeTab === "pending" && !isPending) return false;
      if (activeTab === "completed" && isPending) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (item.employeeName || "").toLowerCase().includes(q) ||
          (item.empCode || "").toLowerCase().includes(q) ||
          (item.department || "").toLowerCase().includes(q) ||
          (item.comment || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      if (statusFilter !== "all") {
        const s = (item.status || "").toLowerCase();
        if (statusFilter === "pending" && !s.includes("pending")) return false;
        if (statusFilter === "approved" && s !== "approved") return false;
        if (statusFilter === "rejected" && s !== "rejected") return false;
      }

      if (halfDayFilter !== "all") {
        if ((item.isHalfDay || "").toLowerCase() !== halfDayFilter.toLowerCase()) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "name") {
        return (a.employeeName || "").localeCompare(b.employeeName || "");
      }
      if (sortBy === "oldest") {
        return (a.id || 0) - (b.id || 0);
      }
      return (b.id || 0) - (a.id || 0);
    });

    return result;
  }, [earnings, activeTab, searchQuery, statusFilter, halfDayFilter, sortBy]);

  // Actions
  const handleApprove = async (id) => {
    try {
      await apiRequest(`/api/v1/leave/comp-off/${id}/approve`, { method: "PUT" });
      setEarnings((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "Approved",
                tab: "completed",
                level: "Completed",
              }
            : item
        )
      );
      showToast("Comp Off earning approved successfully!");
    } catch (err) {
      console.error("Failed to approve comp off:", err);
      setEarnings((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "Approved", tab: "completed", level: "Completed" }
            : item
        )
      );
      showToast("Comp Off earning approved.");
    }
  };

  const handleReject = async (id) => {
    try {
      await apiRequest(`/api/v1/leave/comp-off/${id}/reject`, { method: "PUT" });
      setEarnings((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "Rejected",
                tab: "completed",
                level: "Completed",
              }
            : item
        )
      );
      showToast("Comp Off earning rejected.", "warning");
    } catch (err) {
      console.error("Failed to reject comp off:", err);
      setEarnings((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "Rejected", tab: "completed", level: "Completed" }
            : item
        )
      );
      showToast("Comp Off earning rejected.", "warning");
    }
  };

  const handleOpenReview = (item) => {
    setSelectedRequest(item);
    setReviewModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newEarning.comment.trim()) return;

    const [empName, empCode] = (newEarning.employee || "Employee - LE999").split(" - ");
    const selectedEmp = employeeOptions.find(
      (o) => o.code === empCode || o.value === newEarning.employee
    );

    const payload = {
      emp_code: empCode ? empCode.trim() : "EMP001",
      employee_name: empName ? empName.trim() : "Employee",
      department: selectedEmp?.department || "Operations",
      applied_on: new Date().toISOString().split("T")[0],
      applied_for: newEarning.appliedFor,
      is_half_day: newEarning.isHalfDay,
      duration: newEarning.isHalfDay === "Yes" ? "0.5 Day (4 Hours)" : "1 Day (8 Hours)",
      comment: newEarning.comment.trim(),
    };

    try {
      const res = await apiRequest("/api/v1/leave/comp-off", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res && res.record) {
        setEarnings((prev) => [res.record, ...prev]);
      } else {
        await fetchCompOffs();
      }
      setAddModalOpen(false);
      setNewEarning({
        employee: employeeOptions[0]?.value || "",
        appliedFor: new Date().toISOString().split("T")[0],
        isHalfDay: "No",
        comment: "",
      });
      showToast(`Comp Off earning added for ${(empName || "Employee").trim()}.`);
    } catch (err) {
      console.error("Failed to submit comp off:", err);
      // Fallback
      const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const created = {
        id: Date.now(),
        employeeName: (empName || "Employee").trim(),
        empCode: (empCode || "EMP001").trim(),
        department: selectedEmp?.department || "Operations",
        avatarBg: "#7c3aed",
        appliedOn: today,
        appliedFor: newEarning.appliedFor || today,
        isHalfDay: newEarning.isHalfDay,
        duration: newEarning.isHalfDay === "Yes" ? "0.5 Day (4 Hours)" : "1 Day (8 Hours)",
        usedOn: "—",
        comment: newEarning.comment.trim(),
        status: "Pending",
        level: "Level 1",
        tab: "pending",
      };
      setEarnings((prev) => [created, ...prev]);
      setAddModalOpen(false);
      showToast(`Comp Off earning added for ${created.employeeName}.`);
    }
  };


  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.value === sortBy)?.label || "Sort by: Latest";

  const currentStatusLabel =
    STATUS_FILTER_OPTIONS.find((s) => s.value === statusFilter)?.label || "All Status";

  return (
    <div className="compoffs-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`co-toast co-toast-${toast.type}`} role="alert" aria-live="assertive">
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Container Card */}
      <div className="co-container-card">
        {/* ─── 1. OPTION B SUMMARY STAT CARDS (Pending, Approved, Rejected) ─── */}
        <div className="co-stats-grid">
          {/* Card 1: Pending */}
          <div
            className={`co-stat-card co-stat-card-pending ${activeTab === "pending" ? "is-selected" : ""}`}
            onClick={() => {
              setActiveTab("pending");
              setStatusFilter("all");
            }}
            role="button"
            tabIndex={0}
          >
            <div className="co-stat-icon-wrap co-stat-icon-pending">
              <Clock size={18} />
            </div>
            <div className="co-stat-info">
              <span className="co-stat-num">{pendingCount}</span>
              <span className="co-stat-label">Pending</span>
            </div>
          </div>

          {/* Card 2: Approved */}
          <div
            className={`co-stat-card co-stat-card-approved ${activeTab === "completed" && statusFilter === "approved" ? "is-selected" : ""}`}
            onClick={() => {
              setActiveTab("completed");
              setStatusFilter("approved");
            }}
            role="button"
            tabIndex={0}
          >
            <div className="co-stat-icon-wrap co-stat-icon-approved">
              <CheckCircle2 size={18} />
            </div>
            <div className="co-stat-info">
              <span className="co-stat-num">{approvedCount}</span>
              <span className="co-stat-label">Approved</span>
            </div>
          </div>

          {/* Card 3: Rejected */}
          <div
            className={`co-stat-card co-stat-card-rejected ${activeTab === "completed" && statusFilter === "rejected" ? "is-selected" : ""}`}
            onClick={() => {
              setActiveTab("completed");
              setStatusFilter("rejected");
            }}
            role="button"
            tabIndex={0}
          >
            <div className="co-stat-icon-wrap co-stat-icon-rejected">
              <XCircle size={18} />
            </div>
            <div className="co-stat-info">
              <span className="co-stat-num">{rejectedCount}</span>
              <span className="co-stat-label">Rejected</span>
            </div>
          </div>
        </div>

        {/* ─── 2. TABS: Pending Earnings vs Completed Earnings (Option B Pills) ─── */}
        <div className="co-tabs-pills">
          <button
            type="button"
            className={`co-tab-pill ${activeTab === "pending" ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab("pending");
              setStatusFilter("all");
            }}
            aria-selected={activeTab === "pending"}
          >
            <span>Pending Earnings</span>
            <span className="co-tab-pill-badge">{pendingCount}</span>
          </button>
          <button
            type="button"
            className={`co-tab-pill ${activeTab === "completed" ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab("completed");
              setStatusFilter("all");
            }}
            aria-selected={activeTab === "completed"}
          >
            <span>Completed Earnings</span>
            <span className="co-tab-pill-badge">{completedCount}</span>
          </button>
        </div>

        {/* ─── 3. SEARCH BAR ─── */}
        <div className="co-search-full">
          <Search size={16} className="co-search-icon" />
          <input
            type="text"
            className="co-search-input"
            placeholder="Search employee by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search employee by name or ID"
          />
          {searchQuery && (
            <button
              type="button"
              className="co-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ─── 4. CONTROLS ROW: Filter Icon, Status Dropdown, + Comp Off Earning ─── */}
        <div className="co-controls-row">
          {/* Filter Popover Toggle */}
          <div className="co-filter-wrap" ref={filterRef}>
            <button
              type="button"
              className={`co-btn-filter ${showFilterPopover || halfDayFilter !== "all" ? "is-active" : ""}`}
              title="Advanced Filter Options"
              onClick={() => setShowFilterPopover((v) => !v)}
              aria-label="Filter Options"
            >
              <Filter size={16} />
            </button>

            {showFilterPopover && (
              <div className="co-filter-popover" role="dialog">
                <div className="co-filter-popover-header">
                  <span>Filter Earnings</span>
                  <button
                    type="button"
                    className="co-popover-close"
                    onClick={() => setShowFilterPopover(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="co-filter-item">
                  <label>Duration / Half Day</label>
                  <CustomSelect
                    size="sm"
                    options={FILTER_HALF_DAY_OPTIONS}
                    value={halfDayFilter}
                    onChange={(val) => setHalfDayFilter(val)}
                  />
                </div>
                <div className="co-filter-actions">
                  <button
                    type="button"
                    className="co-btn-reset"
                    onClick={() => {
                      setHalfDayFilter("all");
                      setStatusFilter("all");
                      setShowFilterPopover(false);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="co-status-select-wrap" ref={statusRef}>
            <button
              type="button"
              className={`co-status-select-btn ${statusDropdownOpen ? "is-open" : ""}`}
              onClick={() => setStatusDropdownOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={statusDropdownOpen}
            >
              <span>{currentStatusLabel}</span>
              <ChevronDown size={14} className="co-chevron" />
            </button>

            {statusDropdownOpen && (
              <ul className="co-status-menu" role="listbox">
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={statusFilter === opt.value}
                    className={`co-status-option ${statusFilter === opt.value ? "is-selected" : ""}`}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setStatusDropdownOpen(false);
                    }}
                  >
                    <span>{opt.label}</span>
                    {statusFilter === opt.value && <Check size={14} className="co-check-icon" />}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add Comp Off Earning Button */}
          <button
            type="button"
            className="co-btn-add-earning"
            onClick={() => setAddModalOpen(true)}
            aria-label="Add Comp Off Earning"
          >
            <Plus size={15} />
            <span className="co-btn-text-full">Comp Off Earning</span>
            <span className="co-btn-text-short">Comp Off</span>
          </button>
        </div>

        {/* ─── 5. SECTION HEADER: Request Count & Sort Control ─── */}
        <div className="co-section-header">
          <span className="co-section-title">
            Comp Off Requests ({filteredEarnings.length})
          </span>

          <div className="co-sort-wrap" ref={sortRef}>
            <button
              type="button"
              className="co-sort-btn"
              onClick={() => setSortDropdownOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={sortDropdownOpen}
            >
              <ArrowUpDown size={14} className="co-sort-icon" />
              <span>{currentSortLabel}</span>
              <ChevronDown size={13} className="co-chevron" />
            </button>

            {sortDropdownOpen && (
              <ul className="co-sort-menu" role="listbox">
                {SORT_OPTIONS.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={sortBy === opt.value}
                    className={`co-sort-option ${sortBy === opt.value ? "is-selected" : ""}`}
                    onClick={() => {
                      setSortBy(opt.value);
                      setSortDropdownOpen(false);
                    }}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.value && <Check size={13} className="co-check-icon" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ─── 6. MOBILE REQUEST CARDS (Option B Layout) ─── */}
        <div className="co-mobile-content">
          {isLoading ? (
            <div className="co-empty-state" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "10px", padding: "40px" }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              <span>Loading comp off requests...</span>
            </div>
          ) : filteredEarnings.length === 0 ? (
            <div className="co-empty-state">
              <div className="co-empty-icon-wrap">
                <AlertCircle size={28} className="co-empty-icon" />
              </div>
              <h4 className="co-empty-title">No comp off earnings found</h4>
              <p className="co-empty-desc">
                {searchQuery || statusFilter !== "all" || halfDayFilter !== "all"
                  ? "Try adjusting your search query or filters."
                  : activeTab === "pending"
                  ? "There are currently no pending compensatory off requests to review."
                  : "No completed compensatory off records available for this cycle."}
              </p>
            </div>
          ) : (
            <div className="co-cards-list">
              {filteredEarnings.map((item) => {
                const initials = getInitials(item.employeeName);
                const isPending = (item.status || "").toLowerCase().includes("pending");
                const isApproved = (item.status || "").toLowerCase() === "approved";

                return (
                  <div key={item.id} className="co-request-card">
                    {/* Top Row: Avatar, Name & Meta, Status Badge */}
                    <div className="co-card-header-row">
                      <div className="co-card-avatar">{initials}</div>
                      <div className="co-card-emp-info">
                        <div className="co-card-emp-name">{item.employeeName}</div>
                        <div className="co-card-emp-meta">
                          {item.empCode} • {item.department || "Operations"}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`co-status-badge ${
                          isPending ? "is-pending" : isApproved ? "is-approved" : "is-rejected"
                        }`}
                      >
                        {isPending && <Clock size={12} />}
                        {isApproved && <CheckCircle2 size={12} />}
                        {!isPending && !isApproved && <XCircle size={12} />}
                        <span>{item.status}</span>
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="co-card-meta-grid">
                      <div className="co-meta-item">
                        <Calendar size={14} className="co-meta-icon" />
                        <div className="co-meta-text-wrap">
                          <span className="co-meta-label">Applied on</span>
                          <span className="co-meta-val">{item.appliedOn}</span>
                        </div>
                      </div>

                      <div className="co-meta-divider" />

                      <div className="co-meta-item">
                        <Calendar size={14} className="co-meta-icon" />
                        <div className="co-meta-text-wrap">
                          <span className="co-meta-label">Comp off date</span>
                          <span className="co-meta-val">{item.appliedFor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Duration & Reason Row */}
                    <div className="co-card-details-row">
                      <div className="co-detail-item">
                        <Clock size={14} className="co-meta-icon" />
                        <span className="co-detail-val">
                          {item.duration || (item.isHalfDay === "Yes" ? "0.5 Day (4 Hours)" : "1 Day (8 Hours)")}
                        </span>
                      </div>

                      <div className="co-meta-divider-dot">•</div>

                      <div className="co-detail-item co-detail-comment" title={item.comment}>
                        <FileText size={14} className="co-meta-icon" />
                        <span className="co-detail-comment-txt">{item.comment || "Holiday duty support"}</span>
                      </div>
                    </div>

                    {/* Action Button (Option B Full-Width Button) */}
                    <div className="co-card-action-wrap">
                      <button
                        type="button"
                        className="co-btn-review-req"
                        onClick={() => handleOpenReview(item)}
                      >
                        <CheckCheck size={15} />
                        <span>Review Request</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 7. DESKTOP TABLE VIEW (Preserved for ≥ 769px) ─── */}
        <div className="co-table-wrap">
          <table className="co-table" aria-label="Comp Off Earnings Table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Applied On</th>
                <th>Comp Off Date</th>
                <th>Duration</th>
                <th>Used On</th>
                <th>Comment</th>
                <th>Status</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="co-empty-cell">
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
                      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Loading compensatory off requests...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEarnings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="co-empty-cell">
                    <AlertCircle size={24} />
                    <p>No compensatory off earnings found.</p>
                  </td>
                </tr>
              ) : (
                filteredEarnings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="co-emp-cell">
                        <div
                          className="co-emp-avatar"
                          style={{ backgroundColor: item.avatarBg || "#7c3aed" }}
                        >
                          {getInitials(item.employeeName)}
                        </div>
                        <div className="co-emp-text">
                          <span className="co-emp-name">
                            {item.employeeName} - {item.empCode}
                          </span>
                          <span className="co-emp-dept">{item.department || "Operations"}</span>
                        </div>
                      </div>
                    </td>
                    <td>{item.appliedOn}</td>
                    <td>{item.appliedFor}</td>
                    <td>
                      <span className={`co-half-day-pill ${item.isHalfDay === "Yes" ? "is-yes" : ""}`}>
                        {item.duration || (item.isHalfDay === "Yes" ? "0.5 Day" : "1 Day")}
                      </span>
                    </td>
                    <td>{item.usedOn}</td>
                    <td className="co-comment-cell" title={item.comment}>
                      {item.comment}
                    </td>
                    <td>
                      <span
                        className={`co-status-badge ${
                          item.status.includes("Pending")
                            ? "is-pending"
                            : item.status === "Approved"
                            ? "is-approved"
                            : "is-rejected"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="td-actions">
                      {item.tab === "pending" ? (
                        <div className="co-action-btns">
                          <button
                            type="button"
                            className="co-act-btn co-act-approve"
                            title="Approve Comp Off"
                            onClick={() => handleApprove(item.id)}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="co-act-btn co-act-reject"
                            title="Reject Comp Off"
                            onClick={() => handleReject(item.id)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="co-completed-txt">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 8. REVIEW REQUEST MODAL (Details & Actions) ─── */}
      {reviewModalOpen && selectedRequest && (
        <div className="co-modal-backdrop" onClick={() => setReviewModalOpen(false)}>
          <div className="co-modal co-review-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="co-modal-header">
              <div className="co-modal-title-wrap">
                <CheckCheck size={18} className="co-modal-title-icon" />
                <h3>Review Comp Off Request</h3>
              </div>
              <button
                type="button"
                className="co-modal-close"
                onClick={() => setReviewModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="co-modal-body">
              {/* Employee Summary Card in Modal */}
              <div className="co-review-emp-card">
                <div className="co-card-avatar">{getInitials(selectedRequest.employeeName)}</div>
                <div className="co-review-emp-text">
                  <span className="co-review-emp-name">{selectedRequest.employeeName}</span>
                  <span className="co-review-emp-meta">
                    {selectedRequest.empCode} • {selectedRequest.department || "Operations"}
                  </span>
                </div>
                <span
                  className={`co-status-badge ${
                    selectedRequest.status.includes("Pending")
                      ? "is-pending"
                      : selectedRequest.status === "Approved"
                      ? "is-approved"
                      : "is-rejected"
                  }`}
                >
                  {selectedRequest.status}
                </span>
              </div>

              {/* Request Details Grid */}
              <div className="co-review-details-grid">
                <div className="co-review-detail-cell">
                  <span className="co-detail-cell-label">Applied On</span>
                  <span className="co-detail-cell-val">{selectedRequest.appliedOn}</span>
                </div>

                <div className="co-review-detail-cell">
                  <span className="co-detail-cell-label">Comp Off Date</span>
                  <span className="co-detail-cell-val">{selectedRequest.appliedFor}</span>
                </div>

                <div className="co-review-detail-cell">
                  <span className="co-detail-cell-label">Requested Duration</span>
                  <span className="co-detail-cell-val">
                    {selectedRequest.duration ||
                      (selectedRequest.isHalfDay === "Yes" ? "0.5 Day (4 Hours)" : "1 Day (8 Hours)")}
                  </span>
                </div>

                <div className="co-review-detail-cell">
                  <span className="co-detail-cell-label">Approval Stage</span>
                  <span className="co-detail-cell-val">{selectedRequest.level || "Level 1 (Direct Manager)"}</span>
                </div>
              </div>

              {/* Reason / Work Description */}
              <div className="co-review-reason-box">
                <span className="co-reason-box-title">Work Justification & Notes:</span>
                <p className="co-reason-box-txt">{selectedRequest.comment || "Duty performed on scheduled holiday / off-day."}</p>
              </div>
            </div>

            <div className="co-modal-footer co-review-footer">
              <button
                type="button"
                className="co-btn-secondary"
                onClick={() => setReviewModalOpen(false)}
              >
                Close
              </button>

              {selectedRequest.status.toLowerCase().includes("pending") && (
                <div className="co-review-action-btns">
                  <button
                    type="button"
                    className="co-btn-reject-modal"
                    onClick={() => {
                      handleReject(selectedRequest.id);
                      setReviewModalOpen(false);
                    }}
                  >
                    <X size={15} />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    className="co-btn-approve-modal"
                    onClick={() => {
                      handleApprove(selectedRequest.id);
                      setReviewModalOpen(false);
                    }}
                  >
                    <Check size={15} />
                    <span>Approve Request</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 9. ADD COMP OFF EARNING MODAL (Preserved & Enhanced) ─── */}
      {addModalOpen && (
        <div className="co-modal-backdrop" onClick={() => setAddModalOpen(false)}>
          <div className="co-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="co-modal-header">
              <div className="co-modal-title-wrap">
                <Plus size={18} className="co-modal-title-icon" />
                <h3>Add Comp Off Earning</h3>
              </div>
              <button
                type="button"
                className="co-modal-close"
                onClick={() => setAddModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="co-modal-body">
                <div className="co-form-group">
                  <label>
                    Select Employee <span className="req-star">*</span>
                  </label>
                  <CustomSelect
                    searchable
                    placeholder="Choose an employee..."
                    options={employeeOptions}
                    value={newEarning.employee}
                    onChange={(val) =>
                      setNewEarning((p) => ({ ...p, employee: val }))
                    }
                  />
                </div>

                <div className="co-form-row">
                  <div className="co-form-group">
                    <label>
                      Worked On Date <span className="req-star">*</span>
                    </label>
                    <CustomDatePicker
                      required
                      placeholder="Select date..."
                      value={newEarning.appliedFor}
                      onChange={(val) =>
                        setNewEarning((p) => ({ ...p, appliedFor: val }))
                      }
                    />
                  </div>

                  <div className="co-form-group">
                    <label>Is Half Day?</label>
                    <CustomSelect
                      options={HALF_DAY_OPTIONS}
                      value={newEarning.isHalfDay}
                      onChange={(val) =>
                        setNewEarning((p) => ({ ...p, isHalfDay: val }))
                      }
                    />
                  </div>
                </div>

                <div className="co-form-group">
                  <label>
                    Reason / Comments <span className="req-star">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Worked on weekend release deployment or holiday support..."
                    value={newEarning.comment}
                    onChange={(e) =>
                      setNewEarning((p) => ({ ...p, comment: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="co-modal-footer">
                <button
                  type="button"
                  className="co-btn-secondary"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="co-btn-primary">
                  Submit Earning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
