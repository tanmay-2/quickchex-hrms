import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  X,
  CheckCircle2,
  User,
  Calendar,
  Clock,
  Umbrella,
  HeartPulse,
  Plane,
  FileText,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import { loadUnifiedEmployees } from "../../utils/employeeStore";
import "./LeaveBalances.css";
import { getApiUrl } from "../../services/apiClient";

const LEAVE_CYCLES = [
  { id: "apr26-mar27", label: "Apr 2026 - Mar 2027" },
  { id: "apr25-mar26", label: "Apr 2025 - Mar 2026" },
  { id: "apr24-mar25", label: "Apr 2024 - Mar 2025" },
];

export const LeaveBalances = () => {
  const navigate = useNavigate();

  /* ── Form State ── */
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [empDropOpen, setEmpDropOpen] = useState(false);

  const [selectedCycle, setSelectedCycle] = useState(LEAVE_CYCLES[0]);
  const [cycleDropOpen, setCycleDropOpen] = useState(false);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [errors, setErrors] = useState({});

  /* ── Results State ── */
  const [cardsData, setCardsData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  /* ── Refs for click-outside ── */
  const empRef = useRef(null);
  const cycleRef = useRef(null);
  const actionsRef = useRef(null);

  /* ── Fetch Employees on mount ── */
  useEffect(() => {
    let mounted = true;
    loadUnifiedEmployees()
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((e) => ({
            id: e.emp_code || e.id || e.employee_id,
            name: e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.emp_code,
            dept: e.department || "General",
          }));
          setEmployees(mapped);
        }
      })
      .catch((err) => console.warn("Failed to fetch employees in LeaveBalances:", err));

    return () => {
      mounted = false;
    };
  }, []);

  /* ── Click outside to close dropdowns ── */
  useEffect(() => {
    const handler = (e) => {
      if (empRef.current && !empRef.current.contains(e.target)) setEmpDropOpen(false);
      if (cycleRef.current && !cycleRef.current.contains(e.target)) setCycleDropOpen(false);
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setActionsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3200);
  };

  /* ── Filtered employee list ── */
  const filteredEmployees = useMemo(() => {
    const q = (employeeSearch || "").trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      `${e.name || ""} ${e.id || ""}`.toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  /* ── Date formatting helper (e.g. 12 Aug 2026 - 14 Aug 2026) ── */
  const formatLeaveDates = (start, end) => {
    if (!start) return "—";
    try {
      const parseDate = (d) => {
        if (!d) return null;
        if (typeof d === "string" && d.includes("-")) {
          const parts = d.split("-");
          if (parts[0].length === 2 && parts[2]?.length === 4) {
            return new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]);
          }
          return new Date(d);
        }
        return new Date(d);
      };

      const s = parseDate(start);
      const e = end ? parseDate(end) : s;

      const opt = { day: "2-digit", month: "short", year: "numeric" };
      const sStr = s && !isNaN(s.getTime()) ? s.toLocaleDateString("en-GB", opt) : start;
      const eStr = e && !isNaN(e.getTime()) ? e.toLocaleDateString("en-GB", opt) : (end || sStr);

      return `${sStr} - ${eStr}`;
    } catch {
      return `${start} - ${end || start}`;
    }
  };

  /* ── Fetch Real Leave Balances & History ── */
  const fetchBalanceAndHistory = async (emp, cycle) => {
    if (!emp) return;
    setLoading(true);

    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (emp.id) headers["x-emp-code"] = emp.id;

    try {
      // 1. Fetch Leave Balances from backend
      const balRes = await fetch(getApiUrl(`/api/v1/leave/balance?emp_code=${encodeURIComponent(emp.id)}`), {
        headers,
      });

      let b = {};
      if (balRes.ok) {
        b = await balRes.json();
      }

      // 2. Fetch Real Leave Applications
      const histRes = await fetch(getApiUrl("/api/v1/leave/applications?all=true"), {
        headers,
      });

      let empHist = [];
      let appCasualUsed = 0;
      let appSickUsed = 0;
      let appEarnedUsed = 0;
      let appUnpaidUsed = 0;

      if (histRes.ok) {
        const histData = await histRes.json();
        if (Array.isArray(histData)) {
          const selId = (emp.id || "").toLowerCase().trim();
          const selName = (emp.name || "").toLowerCase().trim();

          const rawFiltered = histData.filter((item) => {
            const code = (item.emp_code || item.code || item.empCode || "").toLowerCase().trim();
            const name = (item.employee || item.employee_name || item.name || "").toLowerCase().trim();
            if (selId && code === selId) return true;
            if (selName && name) {
              if (selName.includes(name) || name.includes(selName)) return true;
              const selWords = selName.split(/\s+/).filter(Boolean);
              const itemWords = name.split(/\s+/).filter(Boolean);
              if (selWords.length >= 2 && itemWords.length >= 2) {
                if (selWords[0] === itemWords[0] && selWords[selWords.length - 1] === itemWords[itemWords.length - 1]) {
                  return true;
                }
              }
            }
            return false;
          });

          // Calculate used days from approved applications
          rawFiltered.forEach((item) => {
            const isApproved = (item.status || item.statusDisplay || "").toUpperCase().includes("APPROV");
            if (isApproved) {
              const days = parseFloat(item.total_days || item.days || 1) || 1;
              const lType = (item.leave_type || item.category || item.type || "").toLowerCase();
              if (lType.includes("casual")) appCasualUsed += days;
              else if (lType.includes("sick")) appSickUsed += days;
              else if (lType.includes("earn") || lType.includes("paid") || lType.includes("privilege")) appEarnedUsed += days;
              else if (lType.includes("unpaid") || lType.includes("lwp")) appUnpaidUsed += days;
            }
          });

          empHist = rawFiltered.map((item) => {
            const lType = item.leave_type || item.category || item.type || "Casual Leave";
            let tone = "emerald";
            let IconComp = Umbrella;

            const lowerType = lType.toLowerCase();
            if (lowerType.includes("casual")) {
              tone = "emerald";
              IconComp = Umbrella;
            } else if (lowerType.includes("sick")) {
              tone = "rose";
              IconComp = HeartPulse;
            } else if (lowerType.includes("earn") || lowerType.includes("privilege") || lowerType.includes("paid")) {
              tone = "blue";
              IconComp = Plane;
            } else if (lowerType.includes("unpaid") || lowerType.includes("lwp") || lowerType.includes("comp")) {
              tone = "amber";
              IconComp = FileText;
            }

            const statusRaw = (item.statusDisplay || item.status || "APPROVED").toUpperCase();
            let statusClass = "pending";
            let statusText = "Pending";
            if (statusRaw.includes("APPROV")) {
              statusClass = "approved";
              statusText = "Approved";
            } else if (statusRaw.includes("REJECT")) {
              statusClass = "rejected";
              statusText = "Rejected";
            }

            return {
              id: item.id || Math.random(),
              title: lType,
              dateRange: formatLeaveDates(item.start_date || item.from_date || item.from, item.end_date || item.to_date || item.to),
              statusClass,
              statusText,
              tone,
              IconComp,
            };
          });

          setHistoryData(empHist);
        }
      }

      // Safe extraction avoiding division by zero
      const casualObj = b.casual || b.casualLeave || {};
      const casualTotal = typeof casualObj.total === "number" && casualObj.total > 0 ? casualObj.total : 12;
      const rawCasualUsed = typeof casualObj.used === "number" ? casualObj.used : 0;
      const casualUsed = Math.max(rawCasualUsed, appCasualUsed);
      const casualAvail = typeof casualObj.available === "number" && rawCasualUsed === casualUsed
        ? casualObj.available
        : Math.max(0, casualTotal - casualUsed);

      const sickObj = b.sick || b.sickLeave || {};
      const sickTotal = typeof sickObj.total === "number" && sickObj.total > 0 ? sickObj.total : 10;
      const rawSickUsed = typeof sickObj.used === "number" ? sickObj.used : 0;
      const sickUsed = Math.max(rawSickUsed, appSickUsed);
      const sickAvail = typeof sickObj.available === "number" && rawSickUsed === sickUsed
        ? sickObj.available
        : Math.max(0, sickTotal - sickUsed);

      const earnedObj = b.earned || b.earnedLeave || {};
      const earnedTotal = typeof earnedObj.total === "number" && earnedObj.total > 0
        ? earnedObj.total
        : (b.allowed && b.allowed > 18 ? b.allowed - 18 : 20);
      const rawEarnedUsed = typeof earnedObj.used === "number" ? earnedObj.used : 0;
      const earnedUsed = Math.max(rawEarnedUsed, appEarnedUsed);
      const earnedAvail = typeof earnedObj.available === "number" && rawEarnedUsed === earnedUsed
        ? earnedObj.available
        : Math.max(0, earnedTotal - earnedUsed);

      const compOffObj = b.unpaid || b.compOff || b.optionalHoliday || b.optional || {};
      const unpaidTotal = typeof compOffObj.total === "number" && compOffObj.total > 0 ? compOffObj.total : 5;
      const rawUnpaidUsed = typeof compOffObj.used === "number" ? compOffObj.used : 0;
      const unpaidUsed = Math.max(rawUnpaidUsed, appUnpaidUsed);
      const unpaidAvail = typeof compOffObj.available === "number" && rawUnpaidUsed === unpaidUsed
        ? compOffObj.available
        : Math.max(0, unpaidTotal - unpaidUsed);

      // Mobile Option B Cards
      const summaryCards = [
        {
          id: "casual",
          title: "Casual Leave",
          used: casualUsed,
          total: casualTotal,
          available: casualAvail,
          tone: "emerald",
          icon: Umbrella,
        },
        {
          id: "sick",
          title: "Sick Leave",
          used: sickUsed,
          total: sickTotal,
          available: sickAvail,
          tone: "rose",
          icon: HeartPulse,
        },
        {
          id: "earned",
          title: "Earned Leave",
          used: earnedUsed,
          total: earnedTotal,
          available: earnedAvail,
          tone: "blue",
          icon: Plane,
        },
        {
          id: "unpaid",
          title: "Unpaid Leave",
          used: unpaidUsed,
          total: unpaidTotal,
          available: unpaidAvail,
          tone: "amber",
          icon: FileText,
        },
      ];
      setCardsData(summaryCards);

      // Desktop Table Data
      const dynamicTable = [
        { type: "Casual Leave", allotted: casualTotal, taken: casualUsed, pending: 0, balance: casualAvail, lapsed: 0 },
        { type: "Sick Leave", allotted: sickTotal, taken: sickUsed, pending: 0, balance: sickAvail, lapsed: 0 },
        { type: "Privilege Leave", allotted: earnedTotal, taken: earnedUsed, pending: 0, balance: earnedAvail, lapsed: 0 },
        { type: "Comp-off Leave", allotted: unpaidTotal, taken: unpaidUsed, pending: 0, balance: unpaidAvail, lapsed: 0 },
        { type: "LWP", allotted: 0, taken: 0, pending: 0, balance: 0, lapsed: 0 },
      ];
      setTableData(dynamicTable);

      setSubmitted(true);
    } catch (err) {
      console.warn("Failed to fetch balance or history:", err);
      showToast("Could not load leave records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Submit Handler ── */
  const handleSubmit = async () => {
    const newErrors = {};
    if (!selectedEmployee) newErrors.employee = "Please select an employee.";
    if (!selectedCycle) newErrors.cycle = "Please select a leave cycle.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    await fetchBalanceAndHistory(selectedEmployee, selectedCycle);
  };

  /* ── Select Employee Handler ── */
  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setEmployeeSearch("");
    setEmpDropOpen(false);
    setErrors((prev) => ({ ...prev, employee: undefined }));
    fetchBalanceAndHistory(emp, selectedCycle);
  };

  /* ── Clear Employee Handler ── */
  const handleClearEmployee = (e) => {
    e.stopPropagation();
    setSelectedEmployee(null);
    setEmployeeSearch("");
    setSubmitted(false);
    setCardsData([]);
    setHistoryData([]);
    setTableData([]);
    setErrors({});
  };

  /* ── Actions Dropdown ── */
  const handleAction = (action) => {
    setActionsOpen(false);
    if (action === "excel") showToast("Downloading leave balances as Excel…");
    if (action === "pdf") showToast("Generating PDF report…");
  };

  /* ── Total row for Desktop Table ── */
  const totals = tableData.reduce(
    (acc, row) => ({
      allotted: acc.allotted + row.allotted,
      taken: acc.taken + row.taken,
      pending: acc.pending + row.pending,
      balance: acc.balance + row.balance,
      lapsed: acc.lapsed + row.lapsed,
    }),
    { allotted: 0, taken: 0, pending: 0, balance: 0, lapsed: 0 }
  );

  /* ── Filtered / Visible History ── */
  const visibleHistory = showAllHistory ? historyData : historyData.slice(0, 4);

  return (
    <div className="lb-page">
      <DashboardHeader />

      {/* ── Toast Alert ── */}
      {toastMsg && (
        <div className="lb-toast" role="alert" aria-live="assertive">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Main Container ── */}
      <div className="lb-main-container">
        {/* ── Filter / Selector Card (Option B Top Card) ── */}
        <div className="lb-filter-card">
          {/* Controls Form */}
          <div className="lb-form-grid">
            {/* 1. Employee Selector */}
            <div className="lb-field-group" ref={empRef}>
              <label className="lb-field-label" htmlFor="lb-emp-input">
                <User size={14} className="lb-label-icon" />
                <span>Select employee</span>
              </label>

              <div
                className={`lb-custom-select ${empDropOpen ? "is-open" : ""} ${errors.employee ? "has-error" : ""}`}
                onClick={() => setEmpDropOpen((v) => !v)}
              >
                <div className="lb-select-display">
                  <Search size={16} className="lb-search-icon" />
                  {selectedEmployee ? (
                    <div className="lb-selected-emp-wrap">
                      <span className="lb-select-value">{selectedEmployee.name}</span>
                      <span className="lb-selected-badge">{selectedEmployee.id}</span>
                    </div>
                  ) : (
                    <input
                      id="lb-emp-input"
                      type="text"
                      className="lb-emp-search-input"
                      placeholder="Search employee by name or ID..."
                      value={employeeSearch}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                        setEmpDropOpen(true);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmpDropOpen(true);
                      }}
                      aria-label="Search employee by name or ID"
                      autoComplete="off"
                    />
                  )}

                  {selectedEmployee ? (
                    <button
                      type="button"
                      className="lb-clear-btn"
                      onClick={handleClearEmployee}
                      aria-label="Clear selected employee"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <ChevronDown size={16} className="lb-chevron" />
                  )}
                </div>

                {/* Dropdown Menu */}
                {empDropOpen && (
                  <ul className="lb-dropdown-list" role="listbox" aria-label="Employee list">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((emp) => (
                        <li
                          key={emp.id}
                          role="option"
                          aria-selected={selectedEmployee?.id === emp.id}
                          className={`lb-dropdown-item ${selectedEmployee?.id === emp.id ? "is-selected" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEmployee(emp);
                          }}
                        >
                          <div className="lb-emp-avatar-circle">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="lb-dropdown-emp-info">
                            <div className="lb-emp-name">{emp.name}</div>
                            <div className="lb-emp-meta">
                              {emp.id} · {emp.dept}
                            </div>
                          </div>
                          {selectedEmployee?.id === emp.id && (
                            <CheckCircle2 size={15} className="lb-selected-check" />
                          )}
                        </li>
                      ))
                    ) : (
                      <li className="lb-dropdown-empty">No employees found</li>
                    )}
                  </ul>
                )}
              </div>
              {errors.employee && (
                <span className="lb-field-error" role="alert">{errors.employee}</span>
              )}
            </div>

            {/* 2. Leave Cycle Dropdown */}
            <div className="lb-field-group" ref={cycleRef}>
              <label className="lb-field-label" htmlFor="lb-cycle-btn">
                <Calendar size={14} className="lb-label-icon" />
                <span>Leave Cycle</span>
              </label>

              <div
                className={`lb-custom-select ${cycleDropOpen ? "is-open" : ""} ${errors.cycle ? "has-error" : ""}`}
                onClick={() => setCycleDropOpen((v) => !v)}
              >
                <div
                  className="lb-select-display"
                  id="lb-cycle-btn"
                  aria-haspopup="listbox"
                  role="combobox"
                  aria-expanded={cycleDropOpen}
                >
                  <Calendar size={16} className="lb-search-icon" />
                  <span className="lb-select-value">
                    {selectedCycle ? selectedCycle.label : "Select Leave Cycle"}
                  </span>
                  {cycleDropOpen ? <ChevronUp size={16} className="lb-chevron" /> : <ChevronDown size={16} className="lb-chevron" />}
                </div>

                {cycleDropOpen && (
                  <ul className="lb-dropdown-list" role="listbox" aria-label="Leave cycle options">
                    {LEAVE_CYCLES.map((cycle) => (
                      <li
                        key={cycle.id}
                        role="option"
                        aria-selected={selectedCycle?.id === cycle.id}
                        className={`lb-dropdown-item lb-cycle-item ${selectedCycle?.id === cycle.id ? "is-selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCycle(cycle);
                          setCycleDropOpen(false);
                          setErrors((prev) => ({ ...prev, cycle: undefined }));
                          if (selectedEmployee) {
                            fetchBalanceAndHistory(selectedEmployee, cycle);
                          }
                        }}
                      >
                        <Calendar size={15} className="lb-emp-icon" />
                        <span>{cycle.label}</span>
                        {selectedCycle?.id === cycle.id && (
                          <CheckCircle2 size={15} className="lb-selected-check" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {errors.cycle && (
                <span className="lb-field-error" role="alert">{errors.cycle}</span>
              )}
            </div>

            {/* 3. Full-width View Balance Button */}
            <div className="lb-submit-wrap">
              <button
                id="lb-submit-btn"
                type="button"
                className="lb-btn-submit"
                onClick={handleSubmit}
                disabled={loading}
                aria-label="View Balance"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="lb-spinner" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>View Balance</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Content Area: Option B Mobile Cards or Empty State ── */}
        <div className="lb-content-area">
          {!submitted ? (
            /* Option A/B Empty State (Clean Illustration & Message) */
            <div className="lb-empty-card">
              <div className="lb-empty-illustration-wrap" aria-hidden="true">
                <svg
                  width="110"
                  height="110"
                  viewBox="0 0 110 110"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="lb-empty-svg"
                >
                  <circle cx="55" cy="55" r="46" fill="#F5F3FF" />
                  <rect x="26" y="28" width="58" height="54" rx="12" fill="#FFFFFF" stroke="#DDD6FE" strokeWidth="2.5" />
                  <path d="M26 41C26 33.82 31.82 28 39 28H71C78.18 28 84 33.82 84 41V44H26V41Z" fill="#7C3AED" />
                  <rect x="37" y="22" width="4" height="10" rx="2" fill="#5B21B6" />
                  <rect x="69" y="22" width="4" height="10" rx="2" fill="#5B21B6" />
                  <rect x="36" y="52" width="7" height="6" rx="2" fill="#EDE9FE" />
                  <rect x="47" y="52" width="7" height="6" rx="2" fill="#EDE9FE" />
                  <rect x="58" y="52" width="7" height="6" rx="2" fill="#EDE9FE" />
                  <rect x="36" y="62" width="7" height="6" rx="2" fill="#EDE9FE" />
                  <rect x="47" y="62" width="7" height="6" rx="2" fill="#7C3AED" />
                  <rect x="58" y="62" width="7" height="6" rx="2" fill="#EDE9FE" />
                  <circle cx="78" cy="78" r="16" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="3" />
                  <path d="M78 70V78L83 81" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="92" cy="38" r="2.5" fill="#C4B5FD" />
                  <circle cx="20" cy="52" r="2" fill="#C4B5FD" />
                </svg>
              </div>
              <h3 className="lb-empty-title">Select an employee to view leave balances</h3>
              <p className="lb-empty-desc">
                Choose an employee and leave cycle to see their leave balance details and history.
              </p>
            </div>
          ) : (
            /* Option B Loaded View */
            <div className="lb-overview-results">
              {/* ── Section 1: Leave Balances ── */}
              <div className="lb-section-block">
                <div className="lb-section-header">
                  <Clock size={16} className="lb-section-icon" />
                  <h3 className="lb-section-title">Leave Balances</h3>
                </div>

                {/* 2-Column Responsive Balance Cards Grid */}
                <div className="lb-balance-cards-grid">
                  {cardsData.map((card) => {
                    const CardIcon = card.icon;
                    const usedSafe = typeof card.used === "number" ? card.used : 0;
                    const totalSafe = typeof card.total === "number" ? card.total : 0;
                    const availSafe = typeof card.available === "number" ? card.available : Math.max(0, totalSafe - usedSafe);
                    const pct = totalSafe > 0 ? Math.min(100, Math.max(0, (usedSafe / totalSafe) * 100)) : 0;

                    return (
                      <div key={card.id} className="lb-balance-card">
                        <div className="lb-card-top-row">
                          <div className="lb-card-badge-wrap">
                            <div
                              className={`lb-card-icon-box lb-icon-box-${card.tone}`}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                backgroundColor:
                                  card.tone === "emerald"
                                    ? "#ecfdf5"
                                    : card.tone === "rose"
                                    ? "#fef2f2"
                                    : card.tone === "blue"
                                    ? "#eff6ff"
                                    : "#fffbeb",
                                color:
                                  card.tone === "emerald"
                                    ? "#059669"
                                    : card.tone === "rose"
                                    ? "#e11d48"
                                    : card.tone === "blue"
                                    ? "#2563eb"
                                    : "#d97706",
                              }}
                            >
                              <CardIcon size={16} />
                            </div>
                            <span className="lb-card-title">{card.title}</span>
                          </div>
                          <ChevronRight size={15} className="lb-card-chevron" />
                        </div>

                        <div className="lb-card-ratio-row">
                          <div className="lb-ratio-text">
                            <span className="lb-ratio-num lb-ratio-used">{usedSafe}</span>
                            <span className="lb-ratio-slash"> / </span>
                            <span className="lb-ratio-num lb-ratio-total">{totalSafe}</span>
                          </div>
                          <span className="lb-ratio-unit">days</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="lb-progress-track">
                          <div
                            className={`lb-progress-fill lb-progress-fill-${card.tone}`}
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                card.tone === "emerald"
                                  ? "#10b981"
                                  : card.tone === "rose"
                                  ? "#f43f5e"
                                  : card.tone === "blue"
                                  ? "#3b82f6"
                                  : "#f59e0b",
                            }}
                            role="progressbar"
                            aria-valuenow={usedSafe}
                            aria-valuemin={0}
                            aria-valuemax={totalSafe}
                          />
                        </div>

                        {/* Used / Available Legend */}
                        <div className="lb-card-legend-row">
                          <span className="lb-legend-item">
                            <svg width="8" height="8" viewBox="0 0 8 8" className="lb-dot-svg" style={{ flexShrink: 0 }}>
                              <circle
                                cx="4"
                                cy="4"
                                r="3.5"
                                fill={
                                  card.tone === "emerald"
                                    ? "#10b981"
                                    : card.tone === "rose"
                                    ? "#f43f5e"
                                    : card.tone === "blue"
                                    ? "#3b82f6"
                                    : "#f59e0b"
                                }
                              />
                            </svg>
                            <span className="lb-legend-label">Used: {usedSafe}</span>
                          </span>
                          <span className="lb-legend-item">
                            <svg width="8" height="8" viewBox="0 0 8 8" className="lb-dot-svg" style={{ flexShrink: 0 }}>
                              <circle cx="4" cy="4" r="3.5" fill="#cbd5e1" />
                            </svg>
                            <span className="lb-legend-label">Available: {availSafe}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Section 2: Balance History ── */}
              <div className="lb-section-block">
                <div className="lb-section-header lb-history-header">
                  <div className="lb-history-header-left">
                    <Clock size={16} className="lb-section-icon" />
                    <h3 className="lb-section-title">Balance History</h3>
                  </div>

                  {historyData.length > 4 && (
                    <button
                      type="button"
                      className="lb-btn-view-all"
                      onClick={() => setShowAllHistory((v) => !v)}
                    >
                      <span>{showAllHistory ? "Show Less" : "View All"}</span>
                      <ChevronRight
                        size={13}
                        className={`lb-view-all-icon ${showAllHistory ? "is-open" : ""}`}
                      />
                    </button>
                  )}
                </div>

                {/* History Card Container */}
                <div className="lb-history-card">
                  {historyData.length > 0 ? (
                    <div className="lb-history-list">
                      {visibleHistory.map((item, idx) => {
                        const HistIcon = item.IconComp;
                        return (
                          <div key={item.id || idx} className="lb-history-item">
                            <div
                              className={`lb-hist-icon-box lb-hist-icon-${item.tone}`}
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "9px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                backgroundColor:
                                  item.tone === "emerald"
                                    ? "#ecfdf5"
                                    : item.tone === "rose"
                                    ? "#fef2f2"
                                    : item.tone === "blue"
                                    ? "#eff6ff"
                                    : "#fffbeb",
                                color:
                                  item.tone === "emerald"
                                    ? "#059669"
                                    : item.tone === "rose"
                                    ? "#e11d48"
                                    : item.tone === "blue"
                                    ? "#2563eb"
                                    : "#d97706",
                              }}
                            >
                              <HistIcon size={16} />
                            </div>

                            <div className="lb-hist-info">
                              <span className="lb-hist-title">{item.title}</span>
                              <span className="lb-hist-dates">{item.dateRange}</span>
                            </div>

                            <div className="lb-hist-right">
                              <span className={`lb-status-pill lb-status-${item.statusClass}`}>
                                {item.statusText}
                              </span>
                              <ChevronRight size={14} className="lb-hist-chevron" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="lb-history-empty">
                      <p>No leave balance history recorded for this cycle.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Desktop Tabular Section (Displayed on Desktop >= 769px) ── */}
              <div className="lb-desktop-table-section">
                <div className="lb-result-header">
                  <div className="lb-result-emp-info">
                    <div className="lb-emp-avatar">
                      {selectedEmployee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="lb-result-emp-name">{selectedEmployee.name}</div>
                      <div className="lb-result-emp-meta">
                        {selectedEmployee.id} · {selectedEmployee.dept}
                      </div>
                    </div>
                  </div>

                  <div className="lb-desktop-actions-group">
                    <div className="lb-result-cycle-badge">
                      <Calendar size={13} />
                      {selectedCycle.label}
                    </div>

                    <div className="lb-actions-wrap" ref={actionsRef}>
                      <button
                        type="button"
                        className="lb-btn-actions"
                        onClick={() => setActionsOpen((v) => !v)}
                        aria-expanded={actionsOpen}
                      >
                        Actions
                        {actionsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {actionsOpen && (
                        <div className="lb-actions-dropdown" role="menu">
                          <button
                            type="button"
                            className="lb-action-item"
                            onClick={() => handleAction("excel")}
                          >
                            <FileSpreadsheet size={15} />
                            Download Excel
                          </button>
                          <button
                            type="button"
                            className="lb-action-item"
                            onClick={() => handleAction("pdf")}
                          >
                            <FileText size={15} />
                            Download PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lb-table-wrap">
                  <table className="lb-table" aria-label="Leave balance details table">
                    <thead>
                      <tr>
                        <th className="lb-th">Leave Type</th>
                        <th className="lb-th lb-th-num">Allotted</th>
                        <th className="lb-th lb-th-num">Taken</th>
                        <th className="lb-th lb-th-num">Pending</th>
                        <th className="lb-th lb-th-num">Balance</th>
                        <th className="lb-th lb-th-num">Lapsed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, idx) => (
                        <tr key={idx} className="lb-tr">
                          <td className="lb-td lb-td-type">{row.type}</td>
                          <td className="lb-td lb-td-num">{row.allotted}</td>
                          <td className="lb-td lb-td-num lb-taken">{row.taken}</td>
                          <td className="lb-td lb-td-num lb-pending">{row.pending || "—"}</td>
                          <td className="lb-td lb-td-num lb-balance">
                            <span className={`lb-balance-chip ${row.balance === 0 ? "lb-balance-zero" : ""}`}>
                              {row.balance}
                            </span>
                          </td>
                          <td className="lb-td lb-td-num lb-lapsed">
                            {row.lapsed > 0 ? (
                              <span className="lb-lapsed-chip">{row.lapsed}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="lb-tr-total">
                        <td className="lb-td lb-td-total-label">Total</td>
                        <td className="lb-td lb-td-num lb-td-total">{totals.allotted}</td>
                        <td className="lb-td lb-td-num lb-td-total">{totals.taken}</td>
                        <td className="lb-td lb-td-num lb-td-total">{totals.pending || "—"}</td>
                        <td className="lb-td lb-td-num lb-td-total">
                          <span className="lb-balance-chip lb-balance-total">{totals.balance}</span>
                        </td>
                        <td className="lb-td lb-td-num lb-td-total">
                          {totals.lapsed > 0 ? (
                            <span className="lb-lapsed-chip">{totals.lapsed}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="lb-legend">
                  <span className="lb-legend-item">
                    <span className="lb-legend-dot" /> Balance = Allotted − Taken − Pending
                  </span>
                  <span className="lb-legend-item">
                    <span className="lb-legend-dot lb-legend-dot-lapsed" /> Lapsed = expired at cycle end
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveBalances;
