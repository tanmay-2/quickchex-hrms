import { useEffect, useMemo, useState, useRef, useId, useContext } from "react";
import { createPortal } from "react-dom";
import {
  FileX2,
  Clock,
  CheckCircle2,
  ListFilter,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  Plus,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import CustomSelect from "../../components/ui/CustomSelect";
import "./Termination.css";

/* ── Constants ─────────────────────────────────────────────────────────── */

const STAGE_LABELS = ["Requested", "Approved", "Notice Period", "Completed"];

const STATUS_TO_STAGE = {
  Pending: 0,
  Approved: 1,
  "In Progress": 2,
  Completed: 3,
};

const DEPARTMENTS = [
  "Engineering", "Product", "Design", "Sales",
  "Marketing", "Human Resources", "Finance", "Operations", "Customer Support",
];

const TERMINATION_TYPES = [
  "Resignation", "Termination", "Layoff", "End of Contract", "Retirement", "Absconding",
];

const NOTICE_PERIODS = ["Immediate", "15 Days", "30 Days", "60 Days", "90 Days"];

const AVATAR_TONES = ["tone-a", "tone-b", "tone-c", "tone-d", "tone-e", "tone-f"];

const initialRecords = [
  {
    id: "EMP-1042", name: "Rohan Mehta", department: "Sales",
    type: "Resignation", initiatedOn: "2026-07-28", lastWorkingDay: "2026-08-27",
    status: "In Progress", noticePeriod: "30 Days", reason: "Career transition.",
  },
  {
    id: "EMP-0987", name: "Ayesha Khan", department: "Operations",
    type: "Termination", initiatedOn: "2026-08-01", lastWorkingDay: "2026-08-15",
    status: "Pending", noticePeriod: "15 Days", reason: "Role transition.",
  },
  {
    id: "EMP-0765", name: "Vikram Singh", department: "Engineering",
    type: "Resignation", initiatedOn: "2026-06-10", lastWorkingDay: "2026-07-10",
    status: "Completed", noticePeriod: "30 Days", reason: "Relocation.",
  },
  {
    id: "EMP-1108", name: "Priya Nair", department: "Finance",
    type: "Layoff", initiatedOn: "2026-08-05", lastWorkingDay: "2026-08-19",
    status: "Approved", noticePeriod: "15 Days", reason: "Business restructuring.",
  },
  {
    id: "EMP-0654", name: "Arjun Rao", department: "Marketing",
    type: "Retirement", initiatedOn: "2026-05-20", lastWorkingDay: "2026-06-20",
    status: "Completed",
  },
  {
    id: "EMP-1190", name: "Sara Fernandes", department: "Customer Support",
    type: "Termination", initiatedOn: "2026-08-10", lastWorkingDay: "2026-08-24",
    status: "Rejected", noticePeriod: "Immediate", reason: "Request rejected.",
  },
];

const emptyForm = {
  employeeName: "", employeeId: "", department: "",
  type: "Resignation", lastWorkingDay: "", noticePeriod: "30 Days", reason: "",
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function toneFor(name) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_TONES[code % AVATAR_TONES.length];
}

function typeClass(type) {
  return type.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");
}

/* ── Custom Responsive Calendar Picker ───────────────────────────────────── */

function CustomCalendarPicker({ value, onChange, error, placeholder = "Select last working day" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = value ? new Date(value + "T00:00:00") : null;

  const [viewMonth, setViewMonth] = useState(() => {
    return selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : today;
  });

  useEffect(() => {
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      setViewMonth(selectedDate);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewMonth(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const formatDisplay = (d) => {
    if (!d || isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const handleSelect = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleToday = (e) => {
    e.stopPropagation();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setViewMonth(today);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  return (
    <div className="tm-calendar-picker" ref={containerRef}>
      <button
        type="button"
        className={`tm-calendar-trigger ${isOpen ? "is-open" : ""} ${error ? "has-error" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="tm-calendar-trigger-left">
          <Calendar size={16} className="tm-calendar-trigger-icon" />
          <span className={value ? "tm-calendar-trigger-val" : "tm-calendar-trigger-placeholder"}>
            {value ? formatDisplay(selectedDate) : placeholder}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`tm-calendar-trigger-caret ${isOpen ? "is-open" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="tm-calendar-popover" role="dialog" aria-label="Calendar date picker">
          <div className="tm-cal-header">
            <button
              type="button"
              className="tm-cal-nav-btn"
              onClick={prevMonth}
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="tm-cal-title">
              <span className="tm-cal-month">{monthNames[month]}</span>
              <span className="tm-cal-year">{year}</span>
            </div>
            <button
              type="button"
              className="tm-cal-nav-btn"
              onClick={nextMonth}
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="tm-cal-weekdays">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day} className="tm-cal-weekday">{day}</span>
            ))}
          </div>

          <div className="tm-cal-grid">
            {days.map(({ day, date, isCurrentMonth }, idx) => {
              const dateTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
              const isSelected = selectedDate && dateTimestamp === new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
              const isToday = dateTimestamp === today.getTime();

              return (
                <button
                  key={idx}
                  type="button"
                  className={`tm-cal-day ${!isCurrentMonth ? "is-other-month" : ""} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                  onClick={() => handleSelect(date)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="tm-cal-footer">
            <div className="tm-cal-footer-left">
              <button
                type="button"
                className="tm-cal-footer-btn"
                onClick={handleClear}
              >
                Clear
              </button>
              <button
                type="button"
                className="tm-cal-footer-btn"
                onClick={handleToday}
              >
                Today
              </button>
            </div>
            <button
              type="button"
              className="tm-cal-footer-btn primary"
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Root Component (handles DashboardShell wrapping) ───────────────────── */

export default function Termination(props) {
  const isInsideShell = useContext(DashboardShellContext);
  if (!isInsideShell) {
    return (
      <DashboardShell>
        <TerminationContent {...props} />
      </DashboardShell>
    );
  }
  return <TerminationContent {...props} />;
}

/* ── Main Content ───────────────────────────────────────────────────────── */

function TerminationContent() {
  const uid = useId();
  const [records, setRecords] = useState(initialRecords);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [viewRecord, setViewRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const firstFieldRef = useRef(null);
  const viewCloseRef = useRef(null);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const stats = [
    {
      label: "Total Records",
      value: records.length,
      icon: <FileX2 size={16} />,
      tone: "purple",
      pill: "All",
      footer: "All offboarding records",
    },
    {
      label: "Pending Approval",
      value: records.filter((r) => r.status === "Pending").length,
      icon: <Clock size={16} />,
      tone: "amber",
      pill: "Pending",
      footer: "Awaiting HR approval",
    },
    {
      label: "In Notice Period",
      value: records.filter((r) => r.status === "In Progress").length,
      icon: <Calendar size={16} />,
      tone: "blue",
      pill: "Active",
      footer: "Currently serving notice",
    },
    {
      label: "Completed",
      value: records.filter((r) => r.status === "Completed").length,
      icon: <CheckCircle2 size={16} />,
      tone: "teal",
      pill: "Done",
      footer: "Successfully offboarded",
    },
  ];

  /* ── Handlers ── */

  const closeEditor = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setForm(emptyForm);
    setErrors({});
    setIsSubmitting(false);
  };

  const openCreate = () => {
    setOpenMenuId(null);
    setViewRecord(null);
    setEditingRecord(null);
    setForm(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (record) => {
    setOpenMenuId(null);
    setViewRecord(null);
    setEditingRecord(record);
    setForm({
      employeeName: record.name,
      employeeId: record.id,
      department: record.department === "—" ? "" : record.department,
      type: record.type,
      lastWorkingDay: record.lastWorkingDay,
      noticePeriod: record.noticePeriod || "30 Days",
      reason: record.reason || "",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openActions = (event, recordId) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 188;
    const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth));
    const top = Math.min(window.innerHeight - 200, rect.bottom + 8);
    setMenuPosition({ top, left });
    setOpenMenuId((current) => (current === recordId ? null : recordId));
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  useEffect(() => {
    const closeMenus = () => {
      setOpenMenuId(null);
      setIsStatusDropdownOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key !== "Escape") return;
      setOpenMenuId(null);
      setIsStatusDropdownOpen(false);
      if (viewRecord) setViewRecord(null);
      if (isModalOpen && !isSubmitting) closeEditor();
    };
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsStatusDropdownOpen(false);
      }
      if (openMenuId !== null && !e.target.closest(".tm-actions-cell")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("scroll", closeMenus, true);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("scroll", closeMenus, true);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen, viewRecord, isSubmitting, openMenuId]);

  useEffect(() => {
    document.body.style.overflow = (isModalOpen || Boolean(viewRecord)) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isModalOpen, viewRecord]);

  useEffect(() => {
    if (isModalOpen) firstFieldRef.current?.focus();
  }, [isModalOpen]);

  useEffect(() => {
    if (viewRecord) viewCloseRef.current?.focus();
  }, [viewRecord]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const validate = () => {
    const errs = {};
    if (!form.employeeName.trim()) errs.employeeName = "Employee name is required";
    if (!form.department) errs.department = "Please select a department";
    if (!form.lastWorkingDay) errs.lastWorkingDay = "Last working day is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    const normalized = {
      name: form.employeeName.trim(),
      department: form.department.trim() || "—",
      type: form.type,
      lastWorkingDay: form.lastWorkingDay,
      noticePeriod: form.noticePeriod,
      reason: form.reason.trim(),
    };
    if (editingRecord) {
      setRecords((prev) =>
        prev.map((rec) =>
          rec.id === editingRecord.id
            ? { ...rec, ...normalized, id: form.employeeId.trim() || rec.id }
            : rec
        )
      );
    } else {
      setRecords((prev) => [
        {
          id: form.employeeId.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          ...normalized,
          initiatedOn: new Date().toISOString().slice(0, 10),
          status: "Pending",
        },
        ...prev,
      ]);
    }
    window.setTimeout(closeEditor, 180);
  };

  const handleRemove = (record) => {
    if (window.confirm(`Remove the termination record for ${record.name}?`)) {
      setRecords((prev) => prev.filter((rec) => rec.id !== record.id));
    }
    setOpenMenuId(null);
  };

  const statusOptions = [
    { value: "All", label: "All Statuses" },
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "In Progress", label: "In Progress" },
    { value: "Completed", label: "Completed" },
    { value: "Rejected", label: "Rejected" },
  ];

  const selectedStatusLabel =
    statusOptions.find((o) => o.value === statusFilter)?.label ?? "All Statuses";

  return (
    <div className="tm-page">

      {/* ── Action Bar ── */}
      <div className="tm-action-bar">
        <div className="tm-tracker-badge">
          <FileX2 size={15} className="tm-tracker-badge-icon" />
          <span>Offboarding Tracker: <strong>{records.length} Records</strong></span>
        </div>

        <button type="button" className="tm-btn tm-btn-primary" onClick={openCreate} id="tm-initiate-btn">
          <Plus size={16} />
          <span>Initiate Termination</span>
        </button>
      </div>

      {/* ── KPI Stats (Responsive 2x2 on Mobile) ── */}
      <div className="tm-stats-grid">
        {stats.map((stat) => (
          <div className="tm-stat-card" key={stat.label}>
            <div className="tm-stat-head">
              <div className={`tm-stat-icon-badge ${stat.tone}`}>{stat.icon}</div>
              <span className={`tm-stat-pill ${stat.tone}`}>{stat.pill}</span>
            </div>
            <div className="tm-stat-label">{stat.label}</div>
            <div className="tm-stat-val-wrap">
              <h2 className="tm-stat-val">{stat.value}</h2>
            </div>
            <div className="tm-stat-footer">{stat.footer}</div>
          </div>
        ))}
      </div>

      {/* ── Main Content Card ── */}
      <div className="tm-main-card">

        {/* Toolbar */}
        <div className="tm-toolbar">
          <div className="tm-toolbar-left">
            <span className="tm-section-title">Records</span>
            <span className="tm-count-badge">{filteredRecords.length}</span>
          </div>
          <div className="tm-toolbar-right">

            {/* Search */}
            <div className="tm-search-box">
              <Search size={14} className="tm-search-icon" />
              <input
                type="search"
                placeholder="Search employee, ID, department…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="tm-search-input"
                aria-label="Search termination records"
                id="tm-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="tm-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="tm-select" ref={dropdownRef}>
              <button
                type="button"
                className={`tm-select-trigger ${isStatusDropdownOpen ? "is-open" : ""}`}
                onClick={() => setIsStatusDropdownOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={isStatusDropdownOpen}
                id="tm-status-filter"
              >
                <span>{selectedStatusLabel}</span>
                <ChevronDown size={15} className="tm-select-chevron" />
              </button>
              {isStatusDropdownOpen && (
                <div className="tm-select-menu" role="listbox">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`tm-select-option ${statusFilter === opt.value ? "is-selected" : ""}`}
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setIsStatusDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={statusFilter === opt.value}
                    >
                      {opt.label}
                      {statusFilter === opt.value && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="tm-table-meta">
          <span>
            {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""} shown
          </span>
          {(search || statusFilter !== "All") && (
            <button type="button" className="tm-clear-btn" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {/* Table (Desktop >= 769px) */}
        <div className="tm-table-wrap hrms-desktop-table">
          <table className="tm-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Type</th>
                <th>Initiated On</th>
                <th>Last Working Day</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="tm-empty-state">
                    No termination records match your search.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const stage = STATUS_TO_STAGE[r.status] ?? 0;
                  return (
                    <tr key={r.id}>
                      {/* Employee */}
                      <td>
                        <div className="tm-employee-cell">
                          <div className={`tm-avatar ${toneFor(r.name)}`}>
                            {r.name.charAt(0)}
                          </div>
                          <div>
                            <div className="tm-employee-name">{r.name}</div>
                            <div className="tm-employee-id">{r.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td style={{ color: "var(--tm-text-body)" }}>{r.department}</td>

                      {/* Type badge */}
                      <td>
                        <span className={`tm-type-badge ${typeClass(r.type)}`}>
                          {r.type}
                        </span>
                      </td>

                      {/* Dates */}
                      <td style={{ color: "var(--tm-text-muted)", fontSize: "13px" }}>
                        {formatDate(r.initiatedOn)}
                      </td>
                      <td style={{ color: "var(--tm-text-muted)", fontSize: "13px" }}>
                        {formatDate(r.lastWorkingDay)}
                      </td>

                      {/* Status */}
                      <td>
                        {r.status === "Rejected" ? (
                          <span className="tm-status-badge rejected">
                            <X size={11} />
                            Rejected
                          </span>
                        ) : (
                          <div className="tm-progress-wrap">
                            <div className="tm-progress-track">
                              {STAGE_LABELS.map((label, i) => (
                                <span className="tm-progress-step" key={label}>
                                  <span
                                    className={`tm-progress-dot ${
                                      i < stage ? "done" : i === stage ? "current" : ""
                                    }`}
                                  />
                                  {i < STAGE_LABELS.length - 1 && (
                                    <span className={`tm-progress-line ${i < stage ? "done" : ""}`} />
                                  )}
                                </span>
                              ))}
                            </div>
                            <span className="tm-progress-label">{STAGE_LABELS[stage]}</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="tm-actions-cell">
                        <button
                          type="button"
                          className="tm-menu-btn"
                          aria-label={`Actions for ${r.name}`}
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === r.id}
                          onClick={(e) => openActions(e, r.id)}
                        >
                          <span />
                          <span />
                          <span />
                        </button>

                        {openMenuId === r.id && (
                          <div
                            className="tm-dropdown-menu"
                            style={{ top: menuPosition.top, left: menuPosition.left }}
                            role="menu"
                          >
                            <button
                              type="button"
                              className="tm-dropdown-item"
                              role="menuitem"
                              onClick={() => { setOpenMenuId(null); setViewRecord(r); }}
                            >
                              <Eye size={14} />
                              View Details
                            </button>
                            <button
                              type="button"
                              className="tm-dropdown-item"
                              role="menuitem"
                              onClick={() => openEdit(r)}
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                            <div className="tm-dropdown-divider" />
                            <button
                              type="button"
                              className="tm-dropdown-item danger"
                              role="menuitem"
                              onClick={() => handleRemove(r)}
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Cards (< 768px): ZERO HORIZONTAL SCROLLER ── */}
        <div className="tm-mobile-cards hrms-mobile-cards">
          {filteredRecords.length === 0 ? (
            <div className="tm-empty-state">
              No termination records match your search.
            </div>
          ) : (
            filteredRecords.map((r) => {
              const stage = STATUS_TO_STAGE[r.status] ?? 0;
              return (
                <div key={r.id} className="tm-mob-card">
                  {/* Card Header: Avatar, Name, ID & Quick Action Icons */}
                  <div className="tm-mob-card-head">
                    <div className="tm-employee-cell">
                      <div className={`tm-avatar ${toneFor(r.name)}`}>
                        {r.name.charAt(0)}
                      </div>
                      <div>
                        <div className="tm-employee-name">{r.name}</div>
                        <div className="tm-employee-id">{r.id}</div>
                      </div>
                    </div>

                    <div className="tm-mob-actions-row">
                      <button
                        type="button"
                        className="tm-mob-action-btn"
                        onClick={() => setViewRecord(r)}
                        title="View Details"
                        aria-label="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        className="tm-mob-action-btn"
                        onClick={() => openEdit(r)}
                        title="Edit Request"
                        aria-label="Edit Request"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="tm-mob-action-btn danger"
                        onClick={() => handleRemove(r)}
                        title="Remove"
                        aria-label="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div className="tm-mob-badges-row">
                    <span className={`tm-type-badge ${typeClass(r.type)}`}>
                      {r.type}
                    </span>

                    {r.status === "Rejected" ? (
                      <span className="tm-status-badge rejected">
                        <X size={11} />
                        Rejected
                      </span>
                    ) : (
                      <span className={`tm-mob-status-pill status-${r.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {r.status === "In Progress" ? "In Notice" : r.status}
                      </span>
                    )}
                  </div>

                  {/* 4-Stage Visual Progress Bar */}
                  {r.status !== "Rejected" && (
                    <div className="tm-mob-stepper-wrap">
                      <div className="tm-progress-track">
                        {STAGE_LABELS.map((label, i) => (
                          <span className="tm-progress-step" key={label}>
                            <span
                              className={`tm-progress-dot ${
                                i < stage ? "done" : i === stage ? "current" : ""
                              }`}
                            />
                            {i < STAGE_LABELS.length - 1 && (
                              <span className={`tm-progress-line ${i < stage ? "done" : ""}`} />
                            )}
                          </span>
                        ))}
                      </div>
                      <span className="tm-progress-label">
                        Stage {stage + 1}/4: <strong>{STAGE_LABELS[stage]}</strong>
                      </span>
                    </div>
                  )}

                  {/* 2-Column Key Details Grid */}
                  <div className="tm-mob-info-grid">
                    <div className="tm-mob-info-item">
                      <span className="tm-mob-info-label">Department</span>
                      <span className="tm-mob-info-val">{r.department}</span>
                    </div>
                    <div className="tm-mob-info-item">
                      <span className="tm-mob-info-label">Notice Period</span>
                      <span className="tm-mob-info-val">{r.noticePeriod || "30 Days"}</span>
                    </div>
                    <div className="tm-mob-info-item">
                      <span className="tm-mob-info-label">Initiated On</span>
                      <span className="tm-mob-info-val">{formatDate(r.initiatedOn)}</span>
                    </div>
                    <div className="tm-mob-info-item">
                      <span className="tm-mob-info-label">Last Working Day</span>
                      <span className="tm-mob-info-val highlight">{formatDate(r.lastWorkingDay)}</span>
                    </div>
                  </div>

                  {/* Remarks preview if present */}
                  {r.reason && (
                    <div className="tm-mob-reason-box">
                      <span className="tm-mob-reason-label">Remarks:</span>
                      <span className="tm-mob-reason-text">{r.reason}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          VIEW DETAILS MODAL
          ══════════════════════════════════════════════════════════════════ */}
      {viewRecord && createPortal(
        <div
          className="tm-term-overlay tm-modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setViewRecord(null); }}
        >
          <div
            className="tm-term-modal tm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tm-details-title"
          >
            <div className="tm-modal-sheet-handle" />
            <div className="tm-modal-header">
              <div className="tm-modal-header-text">
                <span className="tm-modal-kicker">Request Details</span>
                <h3 className="tm-modal-h3" id="tm-details-title">{viewRecord.name}</h3>
                <p className="tm-modal-sub">
                  {viewRecord.id} · {viewRecord.department} · {viewRecord.type}
                </p>
              </div>
              <button
                type="button"
                className="tm-modal-close"
                aria-label="Close details"
                onClick={() => setViewRecord(null)}
                ref={viewCloseRef}
              >
                <X size={16} />
              </button>
            </div>

            <div className="tm-modal-body">
              <div className="tm-detail-hero">
                <div className={`tm-avatar tm-avatar-lg ${toneFor(viewRecord.name)}`}>
                  {viewRecord.name.charAt(0)}
                </div>
                <div className="tm-detail-hero-info">
                  <strong>{viewRecord.name}</strong>
                  <span>{viewRecord.id}</span>
                </div>
                <span
                  className={`tm-detail-status-chip ${
                    viewRecord.status === "Rejected" ? "danger" : ""
                  }`}
                >
                  {viewRecord.status === "In Progress" ? "Notice Period" : viewRecord.status}
                </span>
              </div>

              <div className="tm-detail-grid">
                <div className="tm-detail-field">
                  <label>Department</label>
                  <strong>{viewRecord.department}</strong>
                </div>
                <div className="tm-detail-field">
                  <label>Termination Type</label>
                  <strong>{viewRecord.type}</strong>
                </div>
                <div className="tm-detail-field">
                  <label>Initiated On</label>
                  <strong>{formatDate(viewRecord.initiatedOn)}</strong>
                </div>
                <div className="tm-detail-field">
                  <label>Last Working Day</label>
                  <strong>{formatDate(viewRecord.lastWorkingDay)}</strong>
                </div>
                <div className="tm-detail-field">
                  <label>Notice Period</label>
                  <strong>{viewRecord.noticePeriod || "—"}</strong>
                </div>
                <div className="tm-detail-field">
                  <label>Employee ID</label>
                  <strong>{viewRecord.id}</strong>
                </div>
              </div>

              <div className="tm-detail-notes">
                <label>Reason / Remarks</label>
                <p>{viewRecord.reason || "No additional remarks provided."}</p>
              </div>
            </div>

            <div className="tm-modal-footer">
              <button
                type="button"
                className="tm-btn tm-btn-secondary"
                onClick={() => setViewRecord(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                onClick={() => openEdit(viewRecord)}
              >
                <Pencil size={14} />
                Edit Request
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══════════════════════════════════════════════════════════════════
          INITIATE / EDIT FORM MODAL
          ══════════════════════════════════════════════════════════════════ */}
      {isModalOpen && createPortal(
        <div
          className="tm-term-overlay tm-form-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) closeEditor();
          }}
        >
          <div
            className="tm-term-modal tm-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${uid}-form-title`}
          >
            <div className="tm-modal-sheet-handle" />
            <div className="tm-form-header">
              <div className="tm-form-header-text">
                <span className="tm-form-eyebrow">
                  {editingRecord ? "Edit Request" : "New Request"}
                </span>
                <h2 className="tm-form-title" id={`${uid}-form-title`}>
                  {editingRecord ? "Edit termination" : "Initiate termination"}
                </h2>
                <p className="tm-form-desc">
                  {editingRecord
                    ? "Update the request details without losing the existing record."
                    : "Create a structured employee offboarding request for HR review."}
                </p>
              </div>

              <button
                type="button"
                className="tm-form-close"
                onClick={closeEditor}
                disabled={isSubmitting}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="tm-form-inner">
              <div className="tm-form-body">
                <div className="tm-form-grid">

                  {/* Employee Name */}
                  <div className="tm-form-field">
                    <label className="tm-form-label" htmlFor={`${uid}-employeeName`}>
                      Employee Name
                    </label>
                    <input
                      ref={firstFieldRef}
                      id={`${uid}-employeeName`}
                      type="text"
                      className={`tm-form-control ${errors.employeeName ? "error" : ""}`}
                      value={form.employeeName}
                      onChange={(e) => handleFormChange("employeeName", e.target.value)}
                      aria-invalid={!!errors.employeeName}
                      placeholder="Full name"
                    />
                    {errors.employeeName && (
                      <span className="tm-form-error">{errors.employeeName}</span>
                    )}
                  </div>

                  {/* Employee ID */}
                  <div className="tm-form-field">
                    <label className="tm-form-label" htmlFor={`${uid}-employeeId`}>
                      Employee ID
                    </label>
                    <input
                      id={`${uid}-employeeId`}
                      type="text"
                      className="tm-form-control"
                      value={form.employeeId}
                      onChange={(e) => handleFormChange("employeeId", e.target.value)}
                      placeholder="Auto-generated if blank"
                    />
                  </div>

                  {/* Department */}
                  <div className="tm-form-field">
                    <label className="tm-form-label" htmlFor={`${uid}-department`}>
                      Department
                    </label>
                    <CustomSelect
                      id={`${uid}-department`}
                      placeholder="Select department"
                      hasError={Boolean(errors.department)}
                      value={form.department}
                      onChange={(val) => handleFormChange("department", val)}
                      options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                    />
                    {errors.department && (
                      <span className="tm-form-error">{errors.department}</span>
                    )}
                  </div>

                  {/* Termination Type */}
                  <div className="tm-form-field">
                    <label className="tm-form-label" htmlFor={`${uid}-type`}>
                      Termination Type
                    </label>
                    <CustomSelect
                      id={`${uid}-type`}
                      value={form.type}
                      onChange={(val) => handleFormChange("type", val)}
                      options={TERMINATION_TYPES.map((t) => ({ value: t, label: t }))}
                    />
                  </div>

                  {/* Last Working Day */}
                  <div className="tm-form-field">
                    <label className="tm-form-label" id={`${uid}-lwd-label`}>
                      Last Working Day
                    </label>
                    <CustomCalendarPicker
                      value={form.lastWorkingDay}
                      onChange={(val) => handleFormChange("lastWorkingDay", val)}
                      error={Boolean(errors.lastWorkingDay)}
                      placeholder="Select proposed last working day"
                    />
                    {errors.lastWorkingDay && (
                      <span className="tm-form-error">{errors.lastWorkingDay}</span>
                    )}
                  </div>

                  {/* Notice Period */}
                  <div className="tm-form-field">
                    <label className="tm-form-label" htmlFor={`${uid}-noticePeriod`}>
                      Notice Period
                    </label>
                    <CustomSelect
                      id={`${uid}-noticePeriod`}
                      value={form.noticePeriod}
                      onChange={(val) => handleFormChange("noticePeriod", val)}
                      options={NOTICE_PERIODS.map((p) => ({ value: p, label: p }))}
                    />
                  </div>

                  {/* Reason */}
                  <div className="tm-form-field full-width">
                    <label className="tm-form-label" htmlFor={`${uid}-reason`}>
                      Reason / Remarks
                    </label>
                    <textarea
                      id={`${uid}-reason`}
                      className="tm-form-control"
                      value={form.reason}
                      onChange={(e) => handleFormChange("reason", e.target.value)}
                      placeholder="Add any relevant notes or context..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="tm-form-footer">
                <button
                  type="button"
                  className="tm-btn tm-btn-secondary"
                  onClick={closeEditor}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tm-btn tm-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Saving…"
                    : editingRecord
                    ? "Save Changes"
                    : "Submit Termination"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}