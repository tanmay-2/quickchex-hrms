import { useMemo, useState, useEffect, useRef, useContext } from "react";
import {
  Users, CalendarDays, Wallet, Search, Download, Plus,
  Building2, Mail, User, CheckCircle2, Circle, Eye, X,
  AlertTriangle, TrendingUp, Clock, ChevronDown, Check,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import "./NoticePeriod.css";

/* ── Constants ─────────────────────────────────────────────────────────── */

const AVATAR_TONES = ["tone-a", "tone-b", "tone-c", "tone-d", "tone-e", "tone-f", "tone-g", "tone-h", "tone-i"];
const DEPT_TONES = ["tone-a", "tone-b", "tone-c", "tone-d", "tone-e", "tone-f", "tone-g", "tone-h", "tone-i"];

const NOTICE_PERIOD_OPTIONS = ["15 Days", "30 Days", "60 Days", "90 Days", "Custom"];
const RESIGNATION_REASONS = [
  "Better Career Opportunity", "Higher Studies", "Relocation",
  "Personal / Family Reasons", "Health Reasons", "Retirement", "Other",
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function getInitials(name) { return (name || "").split(" ").map(n => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "EM"; }

function toneFor(idx) { return AVATAR_TONES[idx % AVATAR_TONES.length]; }
function deptToneFor(idx) { return DEPT_TONES[idx % DEPT_TONES.length]; }

function toISODate(date) { return date.toISOString().split("T")[0]; }
function addDays(isoDate, days) {
  const d = new Date(isoDate); d.setDate(d.getDate() + days); return toISODate(d);
}
function noticePeriodDays(label) { const m = label.match(/\d+/); return m ? parseInt(m[0], 10) : null; }

function enrichEmployee(emp, i) {
  const today = new Date();
  const resignation = new Date(emp.resignationDate || emp.resignation_date || emp.date_of_resignation || toISODate(today));
  const lwd = new Date(emp.lastWorkingDay || emp.last_working_day || emp.last_working_date || toISODate(addDays(toISODate(today), 30)));
  const totalNoticeDays = daysBetween(resignation, lwd);
  const daysRemaining = daysBetween(today, lwd);
  const daysElapsed = Math.min(Math.max(daysBetween(resignation, today), 0), totalNoticeDays);
  const progressPct = totalNoticeDays > 0
    ? Math.min(100, Math.max(0, Math.round((daysElapsed / totalNoticeDays) * 100)))
    : 100;

  let status = "On Notice";
  if (emp.extended) status = "Extended";
  else if (daysRemaining < 0) status = "Exited";
  else if (daysRemaining <= 7) status = "Completing Soon";

  const name = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.emp_code || "Employee";
  return {
    ...emp,
    id: emp.id || emp.emp_code || `EMP-${i + 1}`,
    name,
    designation: emp.designation || emp.role || "Employee",
    department: emp.department || "General",
    email: emp.email || "",
    manager: emp.manager || emp.reporting_manager || "—",
    resignationDate: toISODate(resignation),
    lastWorkingDay: toISODate(lwd),
    extended: emp.extended || false,
    checklist: emp.checklist || [
      { task: "Knowledge transfer documentation", done: false },
      { task: "Asset return (laptop, ID card)", done: false },
      { task: "Exit interview scheduled", done: false },
      { task: "System access revocation", done: false },
    ],
    initials: getInitials(name),
    tone: toneFor(i),
    totalNoticeDays,
    daysRemaining,
    daysElapsed,
    progressPct,
    status,
  };
}

/* ── Status helpers ─────────────────────────────────────────────────────── */

function statusClass(status) {
  return { "On Notice": "on-notice", "Completing Soon": "completing-soon", "Extended": "extended", "Exited": "exited" }[status] ?? "exited";
}

/* ── CountdownRing ─────────────────────────────────────────────────────── */

function CountdownRing({ emp, size = 44, stroke = 4 }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = emp.status === "Exited" ? 100 : emp.progressPct;
  const offset = circ * (1 - pct / 100);

  const ringColor = {
    "On Notice": "#059669",
    "Completing Soon": "#d97706",
    "Extended": "#7c3aed",
    "Exited": "#cbd5e1",
  }[emp.status] ?? "#cbd5e1";

  return (
    <div className="np-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} stroke="#e2e8f0" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" stroke={ringColor}
          style={{ transition: "stroke-dashoffset .4s ease" }}
        />
      </svg>
      <span className="np-ring-value">
        {emp.status === "Exited"
          ? <CheckCircle2 size={13} color="#94a3b8" />
          : Math.max(emp.daysRemaining, 0)}
      </span>
    </div>
  );
}

/* ── Inline dropdown (used inside modal) ───────────────────────────────── */

function InlineSelect({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const outside = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", esc); };
  }, []);

  return (
    <div className="np-select" ref={ref}>
      <button type="button" className={`np-select-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}>
        <span>{value}</span>
        <ChevronDown size={15} className="np-select-chevron" />
      </button>
      {open && (
        <div className="np-select-menu" role="listbox">
          {options.map(opt => (
            <button key={opt} type="button" role="option" aria-selected={value === opt}
              className={`np-select-option ${value === opt ? "is-selected" : ""}`}
              onClick={() => { onChange(opt); setOpen(false); }}>
              <span>{opt}</span>
              {value === opt && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Add Resignation Modal ──────────────────────────────────────────────── */

function AddResignationModal({ departments, onClose, onSubmit }) {
  const todayIso = toISODate(new Date());
  const [form, setForm] = useState({
    employeeName: "", employeeId: "", department: departments[0] || "",
    reportingManager: "", resignationDate: todayIso, noticePeriod: "30 Days",
    lastWorkingDay: addDays(todayIso, 30), reason: RESIGNATION_REASONS[0], notes: "",
  });
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "resignationDate" || field === "noticePeriod") {
        const days = noticePeriodDays(field === "noticePeriod" ? value : next.noticePeriod);
        if (days) next.lastWorkingDay = addDays(field === "resignationDate" ? value : next.resignationDate, days);
      }
      return next;
    });
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const noticeDaysCount = useMemo(() => {
    if (!form.resignationDate || !form.lastWorkingDay) return null;
    return daysBetween(new Date(form.resignationDate), new Date(form.lastWorkingDay));
  }, [form.resignationDate, form.lastWorkingDay]);

  const validate = () => {
    const errs = {};
    if (!form.employeeName.trim()) errs.employeeName = "Employee name is required";
    if (!form.resignationDate) errs.resignationDate = "Resignation date is required";
    if (!form.lastWorkingDay) errs.lastWorkingDay = "Last working day is required";
    else if (form.lastWorkingDay < form.resignationDate) errs.lastWorkingDay = "Can't be before resignation date";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  return (
    <div className="np-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="np-modal" role="dialog" aria-modal="true" aria-labelledby="np-modal-title">
        <div className="np-modal-head">
          <div>
            <span className="np-modal-eyebrow">HR / Offboarding</span>
            <h2 className="np-modal-h2" id="np-modal-title">Add Resignation</h2>
            <p className="np-modal-sub">Record a resignation to start tracking notice period and offboarding.</p>
          </div>
          <button type="button" className="np-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="np-modal-body">
          {/* Employee Info */}
          <div>
            <span className="np-form-section-title">Employee Information</span>
            <div className="np-form-grid">
              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-name">Employee Name <span className="np-required">*</span></label>
                <input id="ar-name" type="text" className={`np-form-control ${errors.employeeName ? "has-error" : ""}`}
                  placeholder="e.g. Priya Nair" value={form.employeeName}
                  onChange={e => updateField("employeeName", e.target.value)} />
                {errors.employeeName && <span className="np-form-error">{errors.employeeName}</span>}
              </div>
              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-id">Employee ID</label>
                <input id="ar-id" type="text" className="np-form-control"
                  placeholder="e.g. EMP-1203" value={form.employeeId}
                  onChange={e => updateField("employeeId", e.target.value)} />
              </div>
              <div className="np-form-field">
                <label className="np-form-label">Department <span className="np-required">*</span></label>
                <InlineSelect value={form.department} options={departments}
                  onChange={v => updateField("department", v)} ariaLabel="Select department" />
              </div>
              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-manager">Reporting Manager</label>
                <input id="ar-manager" type="text" className="np-form-control"
                  placeholder="e.g. Vikram Mehta" value={form.reportingManager}
                  onChange={e => updateField("reportingManager", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Resignation Details */}
          <div>
            <span className="np-form-section-title">Resignation Details</span>
            <div className="np-form-grid">
              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-rdate">Resignation Date <span className="np-required">*</span></label>
                <div className="np-form-control-wrap">
                  <input id="ar-rdate" type="date" className={`np-form-control ${errors.resignationDate ? "has-error" : ""}`}
                    value={form.resignationDate} onChange={e => updateField("resignationDate", e.target.value)} />
                  <span className="np-form-control-icon"><CalendarDays size={14} /></span>
                </div>
                {errors.resignationDate && <span className="np-form-error">{errors.resignationDate}</span>}
              </div>
              <div className="np-form-field">
                <label className="np-form-label">Notice Period</label>
                <InlineSelect value={form.noticePeriod} options={NOTICE_PERIOD_OPTIONS}
                  onChange={v => updateField("noticePeriod", v)} ariaLabel="Select notice period" />
              </div>
              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-lwd">Last Working Day <span className="np-required">*</span></label>
                <div className="np-form-control-wrap">
                  <input id="ar-lwd" type="date" className={`np-form-control ${errors.lastWorkingDay ? "has-error" : ""}`}
                    value={form.lastWorkingDay} onChange={e => updateField("lastWorkingDay", e.target.value)} />
                  <span className="np-form-control-icon"><CalendarDays size={14} /></span>
                </div>
                {errors.lastWorkingDay && <span className="np-form-error">{errors.lastWorkingDay}</span>}
              </div>
              <div className="np-form-field">
                <label className="np-form-label">Reason</label>
                <InlineSelect value={form.reason} options={RESIGNATION_REASONS}
                  onChange={v => updateField("reason", v)} ariaLabel="Select reason" />
              </div>
            </div>
            {noticeDaysCount !== null && noticeDaysCount >= 0 && (
              <p className="np-form-hint" style={{ marginTop: 12 }}>
                {noticeDaysCount}-day notice period · Last day is {formatDate(form.lastWorkingDay)}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="np-form-field">
            <label className="np-form-label" htmlFor="ar-notes">Additional Notes</label>
            <textarea id="ar-notes" className="np-form-control" placeholder="Any additional context for HR records (optional)"
              rows={3} value={form.notes} onChange={e => updateField("notes", e.target.value)} />
          </div>
        </div>

        <div className="np-modal-footer">
          <button type="button" className="np-btn np-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="np-btn np-btn-primary" onClick={() => { if (validate()) onSubmit(form); }}>
            <Plus size={15} />Add Resignation
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Root Component ─────────────────────────────────────────────────────── */

export default function NoticePeriod(props) {
  const isInsideShell = useContext(DashboardShellContext);
  if (!isInsideShell) {
    return (
      <DashboardShell>
        <NoticePeriodContent {...props} />
      </DashboardShell>
    );
  }
  return <NoticePeriodContent {...props} />;
}

/* ── Main Content ───────────────────────────────────────────────────────── */

function NoticePeriodContent() {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deptDropOpen, setDeptDropOpen] = useState(false);
  const [statusDropOpen, setStatusDropOpen] = useState(false);

  const deptRef = useRef(null);
  const statusRef = useRef(null);

  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetch(`https://quickchex-backend.onrender.com/api/v1/resignation/all`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setEmployees(data.map((emp, i) => enrichEmployee(emp, i)));
        }
      })
      .catch(() => {
        // No notice period data yet — show empty state
        setEmployees([]);
      });
  }, []);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department))], [employees]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter(emp => {
      const matchSearch = !q || emp.name.toLowerCase().includes(q) || emp.id.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q) || emp.designation.toLowerCase().includes(q);
      const matchDept = departmentFilter === "All" || emp.department === departmentFilter;
      const matchStatus = statusFilter === "All" || emp.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, departmentFilter, statusFilter]);

  const deptIndexMap = useMemo(() => {
    const map = {};
    departments.forEach((d, i) => { map[d] = i; });
    return map;
  }, [departments]);

  const totalOnNotice = employees.filter(e => e.status !== "Exited").length;
  const exitingThisWeek = employees.filter(e => e.daysRemaining >= 0 && e.daysRemaining <= 7).length;
  const exitingThisMonth = employees.filter(e => e.daysRemaining >= 0 && e.daysRemaining <= 30).length;
  const avgNoticeDays = Math.round(employees.reduce((sum, e) => sum + e.totalNoticeDays, 0) / employees.length);

  const stats = [
    { label: "On Notice", value: totalOnNotice, icon: <Users size={16} />, tone: "teal", pill: "Active", footer: "Currently serving notice" },
    { label: "Exiting This Week", value: exitingThisWeek, icon: <AlertTriangle size={16} />, tone: "amber", pill: "Urgent", footer: "Due within 7 days" },
    { label: "Exiting This Month", value: exitingThisMonth, icon: <CalendarDays size={16} />, tone: "blue", pill: "Soon", footer: "Due within 30 days" },
    { label: "Avg. Notice Period", value: `${avgNoticeDays}d`, icon: <TrendingUp size={16} />, tone: "purple", pill: "Avg", footer: "Across all employees" },
  ];

  const resetFilters = () => { setSearch(""); setDepartmentFilter("All"); setStatusFilter("All"); };

  const exportCsv = () => {
    const rows = filteredEmployees.map(emp => [emp.id, emp.name, emp.designation, emp.department, emp.resignationDate, emp.lastWorkingDay, emp.daysRemaining, emp.status]);
    const csv = [["Employee ID", "Name", "Designation", "Department", "Resignation Date", "Last Working Day", "Days Left", "Status"], ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "notice-period-tracker.csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  // close dropdowns on outside click / escape
  useEffect(() => {
    const outside = e => {
      if (deptRef.current && !deptRef.current.contains(e.target)) setDeptDropOpen(false);
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusDropOpen(false);
    };
    const esc = e => {
      if (e.key !== "Escape") return;
      setDeptDropOpen(false); setStatusDropOpen(false);
      if (selectedEmployee) setSelectedEmployee(null);
      if (isAddOpen) setIsAddOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", esc); };
  }, [selectedEmployee, isAddOpen]);

  useEffect(() => {
    document.body.style.overflow = (selectedEmployee || isAddOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedEmployee, isAddOpen]);

  const deptOptions = ["All Departments", ...departments];
  const statusOptions = ["All Status", "On Notice", "Completing Soon", "Extended", "Exited"];

  const selectedDeptLabel = departmentFilter === "All" ? "All Departments" : departmentFilter;
  const selectedStatusLabel = statusFilter === "All" ? "All Status" : statusFilter;

  const filtersActive = search || departmentFilter !== "All" || statusFilter !== "All";

  return (
    <div className="np-page">

      {/* ── Action Bar ── */}
      <div className="np-action-bar">
        <div className="np-action-btns">
          <button type="button" className="np-btn np-btn-secondary" onClick={exportCsv} id="np-export-btn">
            <Download size={15} />Export
          </button>
          <button type="button" className="np-btn np-btn-primary" onClick={() => setIsAddOpen(true)} id="np-add-btn">
            <Plus size={15} />Add Resignation
          </button>
        </div>
      </div>

      {/* ── KPI Stats ── */}
      <div className="np-stats-grid">
        {stats.map(stat => (
          <div className="np-stat-card" key={stat.label}>
            <div className="np-stat-head">
              <div className="np-stat-head-left">
                <div className={`np-stat-icon-badge ${stat.tone}`}>{stat.icon}</div>
                <span className="np-stat-label">{stat.label}</span>
              </div>
              <span className={`np-stat-pill ${stat.tone}`}>{stat.pill}</span>
            </div>
            <div><p className="np-stat-val">{stat.value}</p></div>
            <div className="np-stat-footer">{stat.footer}</div>
          </div>
        ))}
      </div>

      {/* ── Main Table Card ── */}
      <div className="np-main-card">

        {/* Toolbar */}
        <div className="np-toolbar">
          <div className="np-toolbar-left">
            <span className="np-section-title">Employees</span>
            <span className="np-count-badge">{filteredEmployees.length}</span>
          </div>
          <div className="np-toolbar-right">

            {/* Search */}
            <div className="np-search-box">
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search employee, ID, department…"
                className="np-search-input" aria-label="Search notice period records" id="np-search" />
              {search && (
                <button type="button" className="np-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dept Filter */}
            <div className="np-select" ref={deptRef}>
              <button type="button" className={`np-select-trigger ${deptDropOpen ? "is-open" : ""}`}
                onClick={() => setDeptDropOpen(v => !v)} aria-haspopup="listbox" aria-expanded={deptDropOpen} id="np-dept-filter">
                <span>{selectedDeptLabel}</span>
                <ChevronDown size={15} className="np-select-chevron" />
              </button>
              {deptDropOpen && (
                <div className="np-select-menu" role="listbox">
                  {deptOptions.map(opt => {
                    const active = (opt === "All Departments" && departmentFilter === "All") || opt === departmentFilter;
                    return (
                      <button key={opt} type="button" role="option" aria-selected={active}
                        className={`np-select-option ${active ? "is-selected" : ""}`}
                        onClick={() => { setDepartmentFilter(opt === "All Departments" ? "All" : opt); setDeptDropOpen(false); }}>
                        <span>{opt}</span>
                        {active && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="np-select" ref={statusRef}>
              <button type="button" className={`np-select-trigger ${statusDropOpen ? "is-open" : ""}`}
                onClick={() => setStatusDropOpen(v => !v)} aria-haspopup="listbox" aria-expanded={statusDropOpen} id="np-status-filter">
                <span>{selectedStatusLabel}</span>
                <ChevronDown size={15} className="np-select-chevron" />
              </button>
              {statusDropOpen && (
                <div className="np-select-menu" role="listbox">
                  {statusOptions.map(opt => {
                    const active = (opt === "All Status" && statusFilter === "All") || opt === statusFilter;
                    return (
                      <button key={opt} type="button" role="option" aria-selected={active}
                        className={`np-select-option ${active ? "is-selected" : ""}`}
                        onClick={() => { setStatusFilter(opt === "All Status" ? "All" : opt); setStatusDropOpen(false); }}>
                        <span>{opt}</span>
                        {active && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table meta */}
        <div className="np-table-meta">
          <span>{filteredEmployees.length} of {employees.length} employees shown</span>
          {filtersActive && <button type="button" className="np-clear-btn" onClick={resetFilters}>Clear filters</button>}
        </div>

        {/* Table */}
        <div className="np-table-wrap">
          <table className="np-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Resignation Date</th>
                <th>Last Working Day</th>
                <th style={{ textAlign: "center" }}>Days Left</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="np-empty-state">
                      <Search size={20} />
                      <strong>No matching employees</strong>
                      <span>Try a different search or clear one of the filters.</span>
                      <button type="button" onClick={resetFilters}>Reset filters</button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const dIdx = deptIndexMap[emp.department] ?? 0;
                  return (
                    <tr key={emp.id} onClick={() => setSelectedEmployee(emp)}>
                      <td>
                        <div className="np-employee-cell">
                          <div className={`np-avatar ${emp.tone}`}>{emp.initials}</div>
                          <div>
                            <div className="np-employee-name">{emp.name}</div>
                            <div className="np-employee-role">{emp.designation}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`np-dept-pill ${deptToneFor(dIdx)}`}>{emp.department}</span>
                      </td>
                      <td style={{ color: "var(--np-text-muted)", fontSize: "13px" }}>{formatDate(emp.resignationDate)}</td>
                      <td style={{ fontWeight: 600, color: "var(--np-text)", fontSize: "13px" }}>{formatDate(emp.lastWorkingDay)}</td>
                      <td style={{ textAlign: "center" }}><CountdownRing emp={emp} size={44} stroke={4} /></td>
                      <td>
                        <span className={`np-status-badge ${statusClass(emp.status)}`}>{emp.status}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button type="button" className="np-eye-btn" aria-label={`View details for ${emp.name}`}
                          onClick={e => { e.stopPropagation(); setSelectedEmployee(emp); }}>
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DETAIL DRAWER
          ══════════════════════════════════════════════════════════════════ */}
      {selectedEmployee && (
        <div className="np-drawer-overlay">
          <button type="button" className="np-drawer-backdrop"
            aria-label="Close" onClick={() => setSelectedEmployee(null)} />
          <aside className="np-drawer">
            <div className="np-drawer-head">
              <div>
                <span className="np-drawer-eyebrow">Employee Details</span>
                <h2 className="np-drawer-h2">{selectedEmployee.name}</h2>
                <p className="np-drawer-sub">{selectedEmployee.id} · {selectedEmployee.department}</p>
              </div>
              <button type="button" className="np-drawer-close"
                onClick={() => setSelectedEmployee(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="np-drawer-body">
              {/* Profile hero */}
              <div className="np-profile-hero">
                <div className={`np-avatar np-avatar-lg ${selectedEmployee.tone}`}>
                  {selectedEmployee.initials}
                </div>
                <div className="np-profile-info">
                  <strong>{selectedEmployee.name}</strong>
                  <span>{selectedEmployee.designation}</span>
                  <small>{selectedEmployee.id}</small>
                </div>
                <span className={`np-status-badge ${statusClass(selectedEmployee.status)}`} style={{ marginLeft: "auto" }}>
                  {selectedEmployee.status}
                </span>
              </div>

              {/* Detail rows */}
              <div className="np-detail-grid">
                {[
                  { icon: <Building2 size={14} />, label: "Department", value: selectedEmployee.department },
                  { icon: <Mail size={14} />, label: "Email", value: selectedEmployee.email },
                  { icon: <User size={14} />, label: "Reporting Manager", value: selectedEmployee.manager },
                  { icon: <CalendarDays size={14} />, label: "Resignation Date", value: formatDate(selectedEmployee.resignationDate) },
                  { icon: <Clock size={14} />, label: "Last Working Day", value: formatDate(selectedEmployee.lastWorkingDay) },
                  { icon: <Wallet size={14} />, label: "Notice Period", value: `${selectedEmployee.totalNoticeDays} days` },
                ].map(row => (
                  <div className="np-detail-row" key={row.label}>
                    <div className="np-detail-icon">{row.icon}</div>
                    <div>
                      <div className="np-detail-label">{row.label}</div>
                      <div className="np-detail-value">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="np-progress-card">
                <div className="np-progress-card-head">
                  <div>
                    <div className="np-progress-card-label">Notice Progress</div>
                    <div className="np-progress-card-days">
                      {selectedEmployee.daysRemaining >= 0
                        ? `${selectedEmployee.daysRemaining} days remaining`
                        : "Notice period completed"}
                    </div>
                  </div>
                  <span className="np-progress-pct">
                    {selectedEmployee.status === "Exited" ? 100 : selectedEmployee.progressPct}%
                  </span>
                </div>
                <div className="np-progress-track">
                  <div className={`np-progress-fill ${statusClass(selectedEmployee.status)}`}
                    style={{ width: `${selectedEmployee.status === "Exited" ? 100 : selectedEmployee.progressPct}%` }} />
                </div>
              </div>

              {/* Checklist */}
              <div className="np-checklist-card">
                <div className="np-checklist-head">
                  <span className="np-checklist-title">Offboarding Checklist</span>
                  <span className="np-checklist-count">
                    {selectedEmployee.checklist.filter(i => i.done).length} / {selectedEmployee.checklist.length} done
                  </span>
                </div>
                {selectedEmployee.checklist.map(item => (
                  <div className="np-checklist-item" key={item.task}>
                    {item.done
                      ? <CheckCircle2 size={15} className="np-checklist-icon-done" />
                      : <Circle size={15} className="np-checklist-icon-pending" />}
                    <span className={`np-checklist-text ${item.done ? "done" : ""}`}>{item.task}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="np-drawer-footer">
              <button type="button" className="np-btn np-btn-secondary" onClick={() => setSelectedEmployee(null)}>Close</button>
              <button type="button" className="np-btn np-btn-primary" onClick={() => setSelectedEmployee(null)}>Mark Done</button>
            </div>
          </aside>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ADD RESIGNATION MODAL
          ══════════════════════════════════════════════════════════════════ */}
      {isAddOpen && (
        <AddResignationModal
          departments={departments}
          onClose={() => setIsAddOpen(false)}
          onSubmit={() => setIsAddOpen(false)}
        />
      )}
    </div>
  );
}