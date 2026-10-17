import { useMemo, useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Users,
  CalendarDays,
  Wallet,
  Search,
  Download,
  Plus,
  Building2,
  Mail,
  User,
  CheckCircle2,
  Circle,
  Eye,
  X,
  AlertTriangle,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronRight,
  Check
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import CustomSelect from "../../components/ui/CustomSelect";
import "./NoticePeriod.css";
import { getApiUrl } from "../../services/apiClient";

/* ── Constants ─────────────────────────────────────────────────────────── */

const NOTICE_PERIOD_OPTIONS = ["15 Days", "30 Days", "45 Days", "60 Days", "90 Days", "Custom"];
const RESIGNATION_REASONS = [
  "Better Career Opportunity",
  "Higher Studies",
  "Relocation",
  "Personal / Family Reasons",
  "Health Reasons",
  "Retirement",
  "Other"
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatLastWorkingDay(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function getInitials(name) {
  if (!name) return "EM";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function toISODate(date) {
  return date.toISOString().split("T")[0];
}

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function noticePeriodDays(label) {
  const m = label.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function getStatusKey(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("urgent")) return "urgent";
  if (s.includes("upcoming")) return "upcoming";
  if (s.includes("complete") || s.includes("exit")) return "completed";
  return "active";
}

function getAvatarTone(name, i) {
  const n = (name || "").toLowerCase();
  if (n.includes("aachal")) return "tone-green";
  if (n.includes("migdad")) return "tone-red";
  if (n.includes("janhavi")) return "tone-purple";
  if (n.includes("pratik")) return "tone-amber";
  if (n.includes("akash")) return "tone-indigo";
  if (n.includes("jasmeet")) return "tone-blue";
  const tones = ["tone-green", "tone-red", "tone-purple", "tone-amber", "tone-indigo", "tone-blue"];
  return tones[i % tones.length];
}

function enrichEmployee(emp, i) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const resDateStr = emp.resignationDate || emp.resignation_date || emp.date_of_resignation || toISODate(today);
  const lwdStr = emp.lastWorkingDay || emp.last_working_day || emp.last_working_date || toISODate(addDays(resDateStr, 30));

  const resignation = new Date(resDateStr);
  const lwd = new Date(lwdStr);

  const totalNoticeDays = Math.max(1, daysBetween(resignation, lwd));
  const daysRemaining = daysBetween(today, lwd);
  const daysElapsed = Math.min(Math.max(daysBetween(resignation, today), 0), totalNoticeDays);
  const progressPct = totalNoticeDays > 0
    ? Math.min(100, Math.max(0, Math.round((daysElapsed / totalNoticeDays) * 100)))
    : 100;

  let status = emp.status || "Active notice";
  if (daysRemaining < 0) {
    status = "Completed";
  } else if (daysRemaining <= 7) {
    status = "Urgent";
  } else if (emp.status === "Upcoming" || (daysRemaining > 20 && String(emp.status).toLowerCase().includes("upcoming"))) {
    status = "Upcoming";
  } else if (emp.status === "Active" || emp.status === "On Notice" || emp.status === "Active notice" || !emp.status) {
    status = "Active notice";
  }

  const name = emp.name || emp.employeeName || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.emp_code || "Employee";
  const empCode = emp.emp_code || emp.employeeId || (typeof emp.id === "string" && emp.id.startsWith("EMP") ? emp.id : `EMP${String(emp.id || i + 1).padStart(3, "0")}`);

  return {
    ...emp,
    id: emp.id || empCode,
    emp_code: empCode,
    name,
    designation: emp.designation || emp.role || "Employee",
    department: emp.department || "Design",
    email: emp.email || "",
    manager: emp.manager || emp.reporting_manager || "—",
    resignationDate: toISODate(resignation),
    lastWorkingDay: toISODate(lwd),
    initials: getInitials(name),
    avatarTone: getAvatarTone(name, i),
    totalNoticeDays,
    daysRemaining,
    daysElapsed,
    progressPct,
    status,
    statusKey: getStatusKey(status),
    checklist: emp.checklist || [
      { task: "Knowledge transfer documentation", done: progressPct > 50 },
      { task: "Asset return (laptop, ID card)", done: daysRemaining <= 2 },
      { task: "Exit interview scheduled", done: progressPct > 70 },
      { task: "System access revocation", done: false }
    ]
  };
}

/* ── Auth Helpers ───────────────────────────────────────────────────────── */

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

const authHeaders = (extra = {}) => {
  const token = getToken();
  return {
    Accept: "application/json",
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

/* ── CountdownRing (Desktop Table) ──────────────────────────────────────── */

function CountdownRing({ emp, size = 44, stroke = 4 }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = emp.status === "Completed" ? 100 : emp.progressPct;
  const offset = circ * (1 - pct / 100);

  const ringColor = {
    "Active notice": "#059669",
    "Urgent": "#d97706",
    "Upcoming": "#2563eb",
    "Completed": "#cbd5e1"
  }[emp.status] ?? "#cbd5e1";

  return (
    <div className="np-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} stroke="#e2e8f0" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={ringColor}
          style={{ transition: "stroke-dashoffset .4s ease" }}
        />
      </svg>
      <span className="np-ring-value">
        {emp.status === "Completed" ? (
          <CheckCircle2 size={13} color="#94a3b8" />
        ) : (
          Math.max(emp.daysRemaining, 0)
        )}
      </span>
    </div>
  );
}

/* ── Add Resignation Modal ──────────────────────────────────────────────── */

function AddResignationModal({ departments, onClose, onSubmit }) {
  const todayIso = toISODate(new Date());
  const [form, setForm] = useState({
    employeeName: "",
    employeeId: "",
    department: departments[0] || "Engineering",
    reportingManager: "",
    resignationDate: todayIso,
    noticePeriod: "30 Days",
    lastWorkingDay: addDays(todayIso, 30),
    reason: RESIGNATION_REASONS[0],
    notes: ""
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "resignationDate" || field === "noticePeriod") {
        const days = noticePeriodDays(field === "noticePeriod" ? value : next.noticePeriod);
        if (days) {
          next.lastWorkingDay = addDays(field === "resignationDate" ? value : next.resignationDate, days);
        }
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
    else if (form.lastWorkingDay < form.resignationDate) {
      errs.lastWorkingDay = "Cannot be before resignation date";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (e) {
      setErrors({ form: e.message || "Failed to submit resignation" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="np-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="np-modal" role="dialog" aria-modal="true" aria-labelledby="np-modal-title">
        <div className="np-modal-head">
          <div>
            <span className="np-modal-eyebrow">HR / Offboarding</span>
            <h2 className="np-modal-h2" id="np-modal-title">Add Resignation</h2>
            <p className="np-modal-sub">Record a resignation to track notice period and offboarding.</p>
          </div>
          <button type="button" className="np-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="np-modal-body">
          {errors.form && (
            <div className="np-form-alert-error">
              <AlertTriangle size={15} />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Employee Information */}
          <div>
            <span className="np-form-section-title">Employee Information</span>
            <div className="np-form-grid">
              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-name">
                  Employee Name <span className="np-required">*</span>
                </label>
                <input
                  id="ar-name"
                  type="text"
                  className={`np-form-control ${errors.employeeName ? "has-error" : ""}`}
                  placeholder="e.g. Priya Nair"
                  value={form.employeeName}
                  onChange={e => updateField("employeeName", e.target.value)}
                />
                {errors.employeeName && <span className="np-form-error">{errors.employeeName}</span>}
              </div>

              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-id">Employee ID</label>
                <input
                  id="ar-id"
                  type="text"
                  className="np-form-control"
                  placeholder="e.g. EMP025"
                  value={form.employeeId}
                  onChange={e => updateField("employeeId", e.target.value)}
                />
              </div>

              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-dept">Department <span className="np-required">*</span></label>
                <CustomSelect
                  id="ar-dept"
                  value={form.department}
                  options={departments.map(d => ({ value: d, label: d }))}
                  onChange={v => updateField("department", v)}
                  size="sm"
                  searchable={false}
                  ariaLabel="Select Department"
                />
              </div>

              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-manager">Reporting Manager</label>
                <input
                  id="ar-manager"
                  type="text"
                  className="np-form-control"
                  placeholder="e.g. Kevin John"
                  value={form.reportingManager}
                  onChange={e => updateField("reportingManager", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Resignation Details */}
          <div>
            <span className="np-form-section-title">Resignation Details</span>
            <div className="np-form-grid">
              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-rdate">
                  Resignation Date <span className="np-required">*</span>
                </label>
                <div className="np-form-control-wrap">
                  <input
                    id="ar-rdate"
                    type="date"
                    className={`np-form-control ${errors.resignationDate ? "has-error" : ""}`}
                    value={form.resignationDate}
                    onChange={e => updateField("resignationDate", e.target.value)}
                  />
                  <span className="np-form-control-icon"><CalendarDays size={14} /></span>
                </div>
                {errors.resignationDate && <span className="np-form-error">{errors.resignationDate}</span>}
              </div>

              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-notice">Notice Period</label>
                <CustomSelect
                  id="ar-notice"
                  value={form.noticePeriod}
                  options={NOTICE_PERIOD_OPTIONS.map(o => ({ value: o, label: o }))}
                  onChange={v => updateField("noticePeriod", v)}
                  size="sm"
                  searchable={false}
                  ariaLabel="Select Notice Period"
                />
              </div>

              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-lwd">
                  Last Working Day <span className="np-required">*</span>
                </label>
                <div className="np-form-control-wrap">
                  <input
                    id="ar-lwd"
                    type="date"
                    className={`np-form-control ${errors.lastWorkingDay ? "has-error" : ""}`}
                    value={form.lastWorkingDay}
                    onChange={e => updateField("lastWorkingDay", e.target.value)}
                  />
                  <span className="np-form-control-icon"><CalendarDays size={14} /></span>
                </div>
                {errors.lastWorkingDay && <span className="np-form-error">{errors.lastWorkingDay}</span>}
              </div>

              <div className="np-form-field">
                <label className="np-form-label" htmlFor="ar-reason">Reason</label>
                <CustomSelect
                  id="ar-reason"
                  value={form.reason}
                  options={RESIGNATION_REASONS.map(r => ({ value: r, label: r }))}
                  onChange={v => updateField("reason", v)}
                  size="sm"
                  searchable={false}
                  ariaLabel="Select Reason"
                />
              </div>
            </div>

            {noticeDaysCount !== null && noticeDaysCount >= 0 && (
              <p className="np-form-hint">
                {noticeDaysCount}-day notice period · Last day is {formatDate(form.lastWorkingDay)}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="np-form-field">
            <label className="np-form-label" htmlFor="ar-notes">Additional Notes</label>
            <textarea
              id="ar-notes"
              className="np-form-control"
              placeholder="Any additional context for HR records (optional)"
              rows={3}
              value={form.notes}
              onChange={e => updateField("notes", e.target.value)}
            />
          </div>
        </div>

        <div className="np-modal-footer">
          <button type="button" className="np-btn np-btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="np-btn np-btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Plus size={15} />
            <span>{submitting ? "Saving..." : "Add Resignation"}</span>
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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const handleViewDetails = (emp) => {
    navigate(`/dashboard/notice-period/${emp.emp_code || emp.id}`);
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/v1/resignation/all"), {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEmployees(data.map((emp, i) => enrichEmployee(emp, i)));
        } else {
          setEmployees([]);
        }
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.warn("Error loading notice period records:", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const departments = useMemo(() => {
    const list = [...new Set(employees.map(e => e.department).filter(Boolean))];
    return list.length > 0 ? list : ["Design", "Engineering", "Finance", "Operations"];
  }, [employees]);

  const deptOptions = useMemo(() => ["All Departments", ...departments], [departments]);
  const statusOptions = ["All Statuses", "Active notice", "Urgent", "Upcoming", "Completed"];

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter(emp => {
      const matchSearch =
        !q ||
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.emp_code && emp.emp_code.toLowerCase().includes(q)) ||
        (emp.id && String(emp.id).toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.designation && emp.designation.toLowerCase().includes(q));

      const matchDept =
        departmentFilter === "All Departments" ||
        departmentFilter === "All" ||
        emp.department === departmentFilter;

      const matchStatus =
        statusFilter === "All Statuses" ||
        statusFilter === "All" ||
        emp.status?.toLowerCase() === statusFilter.toLowerCase() ||
        (statusFilter === "Active notice" && (emp.status === "On Notice" || emp.status === "Active notice"));

      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, departmentFilter, statusFilter]);

  // Dynamic KPI counts computed from actual records
  const totalOnNotice = useMemo(() => {
    return employees.filter(e => e.status !== "Completed" && e.status !== "Exited").length;
  }, [employees]);

  const exitingThisWeek = useMemo(() => {
    return employees.filter(e => e.daysRemaining >= 0 && e.daysRemaining <= 7 && e.status !== "Completed").length;
  }, [employees]);

  const exitingThisMonth = useMemo(() => {
    return employees.filter(e => e.daysRemaining >= 0 && e.daysRemaining <= 30 && e.status !== "Completed").length;
  }, [employees]);

  const avgNoticeDisplay = useMemo(() => {
    const valid = employees.filter(e => typeof e.totalNoticeDays === "number" && !isNaN(e.totalNoticeDays) && e.totalNoticeDays > 0);
    if (valid.length === 0) return "—";
    const avg = Math.round(valid.reduce((sum, e) => sum + e.totalNoticeDays, 0) / valid.length);
    return isNaN(avg) ? "—" : `${avg} days`;
  }, [employees]);

  const resetFilters = () => {
    setSearch("");
    setDepartmentFilter("All Departments");
    setStatusFilter("All Statuses");
  };

  const exportCsv = () => {
    const rows = filteredEmployees.map(emp => [
      emp.id,
      emp.name,
      emp.designation,
      emp.department,
      emp.email,
      emp.manager,
      emp.resignationDate,
      emp.noticePeriod || `${emp.totalNoticeDays} Days`,
      emp.lastWorkingDay,
      emp.daysRemaining,
      emp.status
    ]);

    const headers = [
      "Employee ID",
      "Employee Name",
      "Designation",
      "Department",
      "Email",
      "Reporting Manager",
      "Resignation Date",
      "Notice Duration",
      "Last Working Day",
      "Days Remaining",
      "Status"
    ];

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Notice_Period_Employees_${toISODate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setFeedback({ type: "success", message: `Exported ${filteredEmployees.length} employee notice period records.` });
  };

  const handleAddResignation = async (formData) => {
    const token = getToken();
    const res = await fetch(getApiUrl("/api/v1/resignation/submit"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(formData)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to submit resignation");
    }

    setIsAddOpen(false);
    setFeedback({ type: "success", message: "Resignation recorded successfully." });
    await loadEmployees();
  };

  // Prevent background scroll when modal/drawer is open
  useEffect(() => {
    document.body.style.overflow = (selectedEmployee || isAddOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedEmployee, isAddOpen]);

  return (
    <div className="np-page">
      {/* Toast Feedback */}
      {feedback.message && (
        <div className={`np-toast-banner banner-${feedback.type}`}>
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback({ type: "", message: "" })}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Top Action Buttons ── */}
      <div className="np-action-bar">
        <button
          type="button"
          className="np-btn np-btn-export"
          onClick={exportCsv}
          id="np-export-btn"
        >
          <Download size={15} />
          <span>Export</span>
        </button>
        <button
          type="button"
          className="np-btn np-btn-add"
          onClick={() => setIsAddOpen(true)}
          id="np-add-btn"
        >
          <Plus size={15} />
          <span>Add Resignation</span>
        </button>
      </div>

      {/* ── Summary KPI Cards (2x2 on mobile, 4 cols on desktop) ── */}
      <div className="np-stats-grid">
        {/* Card 1: On Notice */}
        <div className="np-stat-card">
          <div className="np-stat-head">
            <div className="np-stat-head-left">
              <div className="np-stat-icon-badge tone-teal">
                <Users size={16} />
              </div>
              <span className="np-stat-label">ON NOTICE</span>
            </div>
            <span className="np-stat-pill tone-teal">Active</span>
          </div>
          <div className="np-stat-val">{totalOnNotice}</div>
          <div className="np-stat-footer">Currently serving notice</div>
        </div>

        {/* Card 2: Exiting This Week */}
        <div className="np-stat-card">
          <div className="np-stat-head">
            <div className="np-stat-head-left">
              <div className="np-stat-icon-badge tone-amber">
                <CalendarDays size={16} />
              </div>
              <span className="np-stat-label">EXITING THIS WEEK</span>
            </div>
            <span className="np-stat-pill tone-amber">Urgent</span>
          </div>
          <div className="np-stat-val">{exitingThisWeek}</div>
          <div className="np-stat-footer">Due within 7 days</div>
        </div>

        {/* Card 3: Exiting This Month */}
        <div className="np-stat-card">
          <div className="np-stat-head">
            <div className="np-stat-head-left">
              <div className="np-stat-icon-badge tone-blue">
                <CalendarDays size={16} />
              </div>
              <span className="np-stat-label">EXITING THIS MONTH</span>
            </div>
            <span className="np-stat-pill tone-blue">Soon</span>
          </div>
          <div className="np-stat-val">{exitingThisMonth}</div>
          <div className="np-stat-footer">Due within 30 days</div>
        </div>

        {/* Card 4: Average Notice Period */}
        <div className="np-stat-card">
          <div className="np-stat-head">
            <div className="np-stat-head-left">
              <div className="np-stat-icon-badge tone-purple">
                <Clock size={16} />
              </div>
              <span className="np-stat-label">AVG. NOTICE PERIOD</span>
            </div>
          </div>
          <div className="np-stat-val">{avgNoticeDisplay}</div>
          <div className="np-stat-footer">Across employees</div>
        </div>
      </div>

      {/* ── Main Employees Card ── */}
      <div className="np-main-card">
        {/* Card Header & Controls */}
        <div className="np-toolbar">
          <div className="np-toolbar-left">
            <h2 className="np-section-title">Employees</h2>
            <span className="np-count-badge">{filteredEmployees.length}</span>
          </div>

          {/* Search Field */}
          <div className="np-search-box">
            <Search size={16} className="np-search-icon" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee, ID, department..."
              className="np-search-input"
              aria-label="Search notice period records"
              id="np-search"
            />
            {search && (
              <button
                type="button"
                className="np-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Department & Status Filters (Side by Side) */}
          <div className="np-filters-row">
            <div className="np-filter-select-wrap">
              <CustomSelect
                id="np-dept-filter"
                value={departmentFilter}
                onChange={val => setDepartmentFilter(val)}
                options={deptOptions.map(d => ({ value: d, label: d }))}
                size="sm"
                searchable={false}
                ariaLabel="Filter by Department"
              />
            </div>
            <div className="np-filter-select-wrap">
              <CustomSelect
                id="np-status-filter"
                value={statusFilter}
                onChange={val => setStatusFilter(val)}
                options={statusOptions.map(s => ({ value: s, label: s }))}
                size="sm"
                searchable={false}
                ariaLabel="Filter by Status"
              />
            </div>
          </div>

          {/* Active filtered count label */}
          <div className="np-count-label">
            {filteredEmployees.length} employee{filteredEmployees.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* ── Mobile Employee Cards (< 768px) ── */}
        <div className="np-mobile-cards-list">
          {loading ? (
            <div className="np-loading-state">
              <Clock size={24} className="spin" />
              <span>Loading notice period records...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="np-empty-state">
              <Search size={22} />
              <strong>No matching employees</strong>
              <span>Try adjusting your search query or filters.</span>
              <button type="button" onClick={resetFilters} className="np-reset-btn">
                Reset filters
              </button>
            </div>
          ) : (
            filteredEmployees.map(emp => (
              <article
                key={emp.id}
                className="np-employee-card"
                onClick={() => handleViewDetails(emp)}
                role="button"
                tabIndex={0}
                aria-label={`Notice period details for ${emp.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleViewDetails(emp);
                  }
                }}
              >
                {/* First row — Employee identity: Avatar + Full Name + Employee ID */}
                <div className="np-card-row-identity">
                  <div className={`np-avatar np-avatar-circle ${emp.avatarTone}`}>
                    {emp.initials}
                  </div>
                  <div className="np-card-name-block">
                    <h3 className="np-card-emp-name">{emp.name}</h3>
                    <span className="np-card-emp-id">{emp.emp_code}</span>
                  </div>
                </div>

                {/* Second row — Department and status */}
                <div className="np-card-row-badges">
                  {emp.department && (
                    <span className={`np-card-dept-badge dept-${(emp.department || "").toLowerCase()}`}>
                      {emp.department}
                    </span>
                  )}
                  <span className={`np-card-status-pill status-${emp.statusKey}`}>
                    <span className="np-status-dot" />
                    <span>{emp.status}</span>
                  </span>
                </div>

                {/* Third row — Last working day and action */}
                <div className="np-card-row-footer">
                  <div className="np-card-lwd-block">
                    <div className="np-card-cal-icon">
                      <CalendarDays size={16} />
                    </div>
                    <div className="np-card-lwd-text">
                      <span className="np-card-lwd-label">Last working day</span>
                      <strong className="np-card-lwd-val">
                        {formatLastWorkingDay(emp.lastWorkingDay)}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="np-card-view-details-btn"
                    onClick={e => {
                      e.stopPropagation();
                      handleViewDetails(emp);
                    }}
                    aria-label={`View details for ${emp.name}`}
                  >
                    <span>View Details</span>
                    <span className="np-btn-arrow">→</span>
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* ── Desktop Table (>= 768px) ── */}
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
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px" }}>
                    Loading records...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="np-empty-state">
                      <Search size={20} />
                      <strong>No matching employees</strong>
                      <span>Try a different search or clear one of the filters.</span>
                      <button type="button" onClick={resetFilters} className="np-reset-btn">
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} onClick={() => handleViewDetails(emp)}>
                    <td>
                      <div className="np-employee-cell">
                        <div className={`np-avatar ${emp.avatarTone}`}>{emp.initials}</div>
                        <div>
                          <div className="np-employee-name">{emp.name}</div>
                          <div className="np-employee-role">{emp.designation} · {emp.emp_code}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`np-card-dept-badge dept-${(emp.department || "").toLowerCase()}`}>{emp.department}</span>
                    </td>
                    <td style={{ color: "#64748b", fontSize: "13px" }}>
                      {formatDate(emp.resignationDate)}
                    </td>
                    <td style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                      {formatLastWorkingDay(emp.lastWorkingDay)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <CountdownRing emp={emp} size={42} stroke={4} />
                    </td>
                    <td>
                      <span className={`np-card-status-pill status-${emp.statusKey}`}>
                        <span className="np-status-dot" />
                        <span>{emp.status}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="np-eye-btn"
                        aria-label={`View details for ${emp.name}`}
                        onClick={e => {
                          e.stopPropagation();
                          handleViewDetails(emp);
                        }}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Drawer / Modal ── */}
      {selectedEmployee && (
        <div className="np-drawer-overlay">
          <button
            type="button"
            className="np-drawer-backdrop"
            aria-label="Close"
            onClick={() => setSelectedEmployee(null)}
          />
          <aside className="np-drawer">
            <div className="np-drawer-head">
              <div>
                <span className="np-drawer-eyebrow">Employee Details</span>
                <h2 className="np-drawer-h2">{selectedEmployee.name}</h2>
                <p className="np-drawer-sub">{selectedEmployee.emp_code} · {selectedEmployee.department}</p>
              </div>
              <button
                type="button"
                className="np-drawer-close"
                onClick={() => setSelectedEmployee(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="np-drawer-body">
              {/* Profile hero */}
              <div className="np-profile-hero">
                <div className={`np-avatar np-avatar-lg ${selectedEmployee.avatarTone}`}>
                  {selectedEmployee.initials}
                </div>
                <div className="np-profile-info">
                  <strong>{selectedEmployee.name}</strong>
                  <span>{selectedEmployee.designation}</span>
                  <small>{selectedEmployee.emp_code}</small>
                </div>
                <span className={`np-card-status-pill status-${selectedEmployee.statusKey}`} style={{ marginLeft: "auto" }}>
                  <span className="np-status-dot" />
                  <span>{selectedEmployee.status}</span>
                </span>
              </div>

              {/* Detail rows */}
              <div className="np-detail-grid">
                {[
                  { icon: <Building2 size={14} />, label: "Department", value: selectedEmployee.department },
                  { icon: <Mail size={14} />, label: "Email", value: selectedEmployee.email || "—" },
                  { icon: <User size={14} />, label: "Reporting Manager", value: selectedEmployee.manager },
                  { icon: <CalendarDays size={14} />, label: "Resignation Date", value: formatDate(selectedEmployee.resignationDate) },
                  { icon: <Clock size={14} />, label: "Last Working Day", value: formatLastWorkingDay(selectedEmployee.lastWorkingDay) },
                  { icon: <Wallet size={14} />, label: "Notice Period", value: `${selectedEmployee.totalNoticeDays} days` }
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

              {/* Reason */}
              {selectedEmployee.primary_reason && (
                <div className="np-detail-block">
                  <span className="np-detail-label">Reason for Resignation</span>
                  <p className="np-detail-block-text">{selectedEmployee.primary_reason}</p>
                </div>
              )}

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
                    {selectedEmployee.status === "Completed" ? 100 : selectedEmployee.progressPct}%
                  </span>
                </div>
                <div className="np-progress-track">
                  <div
                    className={`np-progress-fill status-${selectedEmployee.statusKey}`}
                    style={{ width: `${selectedEmployee.status === "Completed" ? 100 : selectedEmployee.progressPct}%` }}
                  />
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
                    {item.done ? (
                      <CheckCircle2 size={15} className="np-checklist-icon-done" />
                    ) : (
                      <Circle size={15} className="np-checklist-icon-pending" />
                    )}
                    <span className={`np-checklist-text ${item.done ? "done" : ""}`}>{item.task}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="np-drawer-footer">
              <button
                type="button"
                className="np-btn np-btn-secondary"
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Add Resignation Modal ── */}
      {isAddOpen &&
        createPortal(
          <AddResignationModal
            departments={departments}
            onClose={() => setIsAddOpen(false)}
            onSubmit={handleAddResignation}
          />,
          document.body
        )}
    </div>
  );
}