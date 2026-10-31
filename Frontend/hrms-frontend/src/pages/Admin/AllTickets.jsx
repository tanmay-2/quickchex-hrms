// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - ALLTICKETS.JSX
// Path: Frontend/hrms-frontend/src/pages/Admin/AllTickets.jsx
// Purpose: Web portal page component managing 'AllTickets' views, user interactions, and state.
// UI Components:
//   • <INITIAL_TICKETS />
//   • <TICKET_CATEGORIES />
//   • <CATEGORY_STYLE />
//   • <CustomSelect />
//   • <TicketReport />
//   • <TicketReportContent />
//   • <STATS />
//   • <HEAT_COLS />
// Key Functions & Handlers:
//   • updatePosition()
//   • handleScrollOrResize()
//   • handleKeyDown()
//   • handleOutside()
//   • toggleDropdown()
//   • fetchTickets()
//   • handleOutsideClick()
//   • openRaiseTicket()
//   • ... and 10 more handlers
// ==============================================================================

import React, { useState, useRef, useEffect, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Download,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Folder,
  BarChart3,
  Hourglass,
  Clock,
  Calendar,
  X,
  Eye,
  Trash2,
  Check,
  Filter,
  Building2,
  Plus,
  ChevronDown,
  Paperclip,
  LayoutGrid,
  FileText,
  Flag,
  AlignLeft,
  Send,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import "./AllTickets.css";
import { getApiUrl } from "../../services/apiClient";

/* ---------------------------------------------------------------- */
/* INITIAL SAMPLE DATA                                              */
/* ---------------------------------------------------------------- */

const INITIAL_TICKETS = [];

const TICKET_CATEGORIES = [
  "Complaint",
  "HR Request",
  "IT / Technical Issue",
  "Payroll / Salary Issue",
  "Attendance Issue",
  "Leave Issue",
  "Document Request",
  "General Query",
];

const CATEGORY_STYLE = {
  "Complaint": "complaint",
  "HR Request": "hr",
  "IT / Technical Issue": "it",
  "Payroll / Salary Issue": "payroll",
  "Attendance Issue": "attendance",
  "Leave Issue": "leave",
  "Document Request": "document",
  "General Query": "general",
};

/* ---------------------------------------------------------------- */
/* CUSTOM PORTAL-BASED RESPONSIVE SELECT DROPDOWN                   */
/* ---------------------------------------------------------------- */

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  hideAllOption,
  alignRight,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 220,
    maxHeight: 260,
    openUp: false,
  });

  const normalizedOptions = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === "string" ? { value: opt, label: opt } : opt
      ),
    [options]
  );

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const totalCount = normalizedOptions.length + (!hideAllOption ? 1 : 0);
    const estimatedHeight = Math.min(260, totalCount * 42 + 16);

    const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const top = openUp
      ? Math.max(10, rect.top - estimatedHeight - 6)
      : rect.bottom + 6;

    const isMobile = window.innerWidth <= 640;
    const width = isMobile
      ? Math.min(260, Math.max(rect.width, window.innerWidth - 32))
      : Math.max(180, rect.width);

    let left = alignRight ? rect.right - width : rect.left;
    if (left + width > window.innerWidth - 16) {
      left = window.innerWidth - width - 16;
    }
    if (left < 16) {
      left = 16;
    }

    setCoords({
      top,
      left,
      width,
      maxHeight: openUp ? Math.min(260, spaceAbove - 20) : Math.min(260, spaceBelow - 20),
      openUp,
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => {
        updatePosition();
      };
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
      };
      const handleOutside = (e) => {
        if (
          triggerRef.current &&
          !triggerRef.current.contains(e.target) &&
          menuRef.current &&
          !menuRef.current.contains(e.target)
        ) {
          setIsOpen(false);
        }
      };

      window.addEventListener("resize", handleScrollOrResize, { passive: true });
      window.addEventListener("scroll", handleScrollOrResize, { passive: true, capture: true });
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("touchstart", handleOutside, { passive: true });
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("resize", handleScrollOrResize);
        window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
        document.removeEventListener("mousedown", handleOutside);
        document.removeEventListener("touchstart", handleOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, normalizedOptions.length, hideAllOption, alignRight]);

  const selectedOpt = normalizedOptions.find((o) => o.value === value);
  const displayLabel = selectedOpt ? selectedOpt.label : placeholder || "Select";
  const hasValue = value && value !== "All";

  const toggleDropdown = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="tck-select-wrap" data-open={isOpen ? "true" : "false"}>
      <button
        ref={triggerRef}
        type="button"
        className={`tck-select-btn ${hasValue ? "is-active" : ""}`}
        onClick={toggleDropdown}
        aria-expanded={isOpen}
      >
        {Icon && <Icon size={15} className="tck-select-lead-icon" />}
        <span className="tck-select-label">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`tck-select-chevron ${isOpen ? "is-open" : ""}`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`tck-select-portal-menu ${coords.openUp ? "is-open-up" : ""}`}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 999999,
            }}
          >
            {!hideAllOption && (
              <button
                type="button"
                className={`tck-select-option ${value === "All" ? "is-selected" : ""}`}
                onClick={() => {
                  onChange("All");
                  setIsOpen(false);
                }}
              >
                <span>{placeholder || "All"}</span>
                {value === "All" && <Check size={14} className="tck-select-check" />}
              </button>
            )}
            {normalizedOptions.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  className={`tck-select-option ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={14} className="tck-select-check" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

/* ============================================================
   ROOT COMPONENT WITH SHELL INTEGRATION
   ============================================================ */
export default function TicketReport(props) {
  const isInsideShell = useContext(DashboardShellContext);

  if (!isInsideShell) {
    return (
      <DashboardShell>
        <TicketReportContent {...props} />
      </DashboardShell>
    );
  }

  return <TicketReportContent {...props} />;
}

/* ============================================================
   CONTENT COMPONENT
   ============================================================ */
function TicketReportContent() {
  const [tickets, setTickets] = useState(INITIAL_TICKETS);

  // Filtering & Search state
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [tenantFilter, setTenantFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest First");
  const [dateFilter, setDateFilter] = useState("All");
  const [selected, setSelected] = useState([]);

  // UI Interactive state
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [modalTicket, setModalTicket] = useState(null);
  const [timeRange, setTimeRange] = useState("This Year");

  // Raise Ticket modal
  const [raiseTicketOpen, setRaiseTicketOpen] = useState(false);
  const [raiseTicketError, setRaiseTicketError] = useState("");
  const [raiseTicket, setRaiseTicket] = useState({
    category: "Complaint",
    title: "",
    description: "",
    priority: "Medium",
    attachment: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const rowMenuRef = useRef(null);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const res = await fetch(getApiUrl("/api/v1/tickets/all"), {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((t) => ({
            id: t.id ? (String(t.id).startsWith("TCK-") ? String(t.id) : `TCK-${t.id}`) : `TCK-${Math.floor(Math.random() * 1000)}`,
            rawId: t.id,
            empCode: t.created_by || t.emp_code || t.empCode || "EMP",
            title: t.title || "Ticket",
            agent: t.agent || "Admin",
            tenant: t.tenant || t.created_by || "Employee",
            status: t.status || "Open",
            priority: t.priority || "Medium",
            date: t.created_at ? t.created_at.slice(0, 10) : (t.date || "Today"),
            description: t.description || "",
            category: t.category || "General Query",
          }));
          setTickets(mapped);
        }
      }
    } catch (err) {
      console.warn("Tickets API fetch warning:", err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const openRaiseTicket = (category = "Complaint") => {
    setRaiseTicket({
      category: TICKET_CATEGORIES.includes(category) ? category : "Complaint",
      title: "",
      description: "",
      priority: "Medium",
      attachment: null,
    });
    setRaiseTicketError("");
    setRaiseTicketOpen(true);
  };

  const closeRaiseTicket = () => {
    setRaiseTicketOpen(false);
    setRaiseTicketError("");
    setIsSubmitting(false);
  };

  const handleRaiseTicketChange = (field, value) => {
    setRaiseTicket((prev) => ({ ...prev, [field]: value }));
    setRaiseTicketError("");
  };

  const handleSubmitRaiseTicket = () => {
    const title = raiseTicket.title.trim();
    const description = raiseTicket.description.trim();

    if (!title) {
      setRaiseTicketError("Please enter a subject or complaint title.");
      return;
    }

    if (!description) {
      setRaiseTicketError("Please describe the issue so it can be routed correctly.");
      return;
    }

    setIsSubmitting(true);

    const empCode =
      localStorage.getItem("emp_code") ||
      localStorage.getItem("employee_code") ||
      "EMP-ME";

    const nextNumber =
      1000 +
      tickets.reduce((highest, ticket) => {
        const numericId = Number(String(ticket.id).replace(/\D/g, ""));
        return Math.max(highest, Number.isFinite(numericId) ? numericId : 1000);
      }, 1000) +
      1;

    const newTicket = {
      id: `TCK-${nextNumber}`,
      empCode,
      title,
      agent: "Unassigned",
      tenant: "Me",
      status: "Open",
      priority: raiseTicket.priority,
      date: new Date().toISOString().slice(0, 10),
      description,
      category: raiseTicket.category,
      attachmentName: raiseTicket.attachment?.name || "",
    };

    setTimeout(() => {
      setTickets((prev) => [newTicket, ...prev]);
      setCategoryFilter(raiseTicket.category);
      setSortBy("Newest First");
      setIsSubmitting(false);
      setRaiseTicketOpen(false);
      setRaiseTicketError("");
      setToastMsg(`Support Ticket ${newTicket.id} raised successfully!`);
      setTimeout(() => setToastMsg(""), 3500);
    }, 350);
  };

  /* ---------------- Dynamic Stat Calculations ---------------- */
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "Open").length;
  const pendingTickets = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedTickets = tickets.filter((t) => t.status === "Closed").length;
  const slaBreached = tickets.filter((t) => t.priority === "Critical" && t.status !== "Closed").length;
  const escalated = tickets.filter((t) => t.priority === "Critical" || t.priority === "High").length;

  const STATS = [
    { key: "total", label: "Total Tickets", value: totalTickets, change: "+5.5%", trend: "good", icon: Folder, tone: "purple" },
    { key: "open", label: "Open Tickets", value: openTickets, change: "+2.1%", trend: "good", icon: Clock, tone: "blue" },
    { key: "pending", label: "Pending Tickets", value: pendingTickets, change: "+3.4%", trend: "bad", icon: Hourglass, tone: "amber" },
    { key: "resolved", label: "Resolved Tickets", value: resolvedTickets, change: "+4.3%", trend: "good", icon: CheckCircle2, tone: "green" },
    { key: "sla", label: "SLA Breached", value: slaBreached, change: "+1.2%", trend: "bad", icon: AlertTriangle, tone: "rose" },
    { key: "escalated", label: "Tickets Escalated", value: escalated, change: "+2.7%", trend: "bad", icon: ArrowUpRight, tone: "orange" },
  ];

  /* ---------------- Dynamic Heatmap Calculations ---------------- */
  const HEAT_COLS = ["Critical", "High", "Medium", "Low"];
  const HEAT_STATUSES = ["Open", "In Progress", "Closed"];

  const dynamicHeatmap = HEAT_STATUSES.map((status) => {
    const values = HEAT_COLS.map((priority) => {
      return tickets.filter((t) => t.status === status && t.priority === priority).length;
    });
    return { label: status, values };
  });

  const maxHeat = Math.max(1, ...dynamicHeatmap.flatMap((r) => r.values));

  /* ---------------- Filtering & Sorting Logic ---------------- */
  const filtered = tickets
    .filter((t) => {
      const matchDate = dateFilter === "All" || (t.date && t.date.slice(0, 7) === dateFilter);
      const matchStatus = statusFilter === "All" || t.status === statusFilter;
      const matchPriority = priorityFilter === "All" || t.priority === priorityFilter;
      const matchTenant = tenantFilter === "All" || t.tenant === tenantFilter;
      const matchCategory = categoryFilter === "All" || t.category === categoryFilter;
      const matchQuery =
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.id.toLowerCase().includes(query.toLowerCase()) ||
        t.empCode.toLowerCase().includes(query.toLowerCase()) ||
        t.agent.toLowerCase().includes(query.toLowerCase());

      return matchDate && matchStatus && matchPriority && matchTenant && matchCategory && matchQuery;
    })
    .sort((a, b) => {
      if (sortBy === "Oldest First") return a.id.localeCompare(b.id);
      if (sortBy === "Last 7 Days" || sortBy === "Newest First") return b.id.localeCompare(a.id);
      return 0;
    });

  /* ---------------- Selection logic ---------------- */
  const allSelected = filtered.length > 0 && filtered.every((t) => selected.includes(t.id));
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((t) => t.id));
  const toggleRow = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  /* ---------------- Action Handlers ---------------- */
  const handleUpdateStatus = (id, newStatus) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
    setActiveMenuId(null);
  };

  const handleDeleteTicket = (id) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    setSelected((prev) => prev.filter((item) => item !== id));
    setActiveMenuId(null);
  };

  const handleBulkDelete = () => {
    setTickets((prev) => prev.filter((t) => !selected.includes(t.id)));
    setSelected([]);
  };

  const handleBulkStatusChange = (newStatus) => {
    setTickets((prev) =>
      prev.map((t) => (selected.includes(t.id) ? { ...t, status: newStatus } : t))
    );
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Employee Code", "Title", "Category", "Agent", "Tenant", "Status", "Priority", "Date"];
    const rows = filtered.map((t) => [
      t.id,
      t.empCode,
      `"${t.title.replace(/"/g, '""')}"`,
      t.category || "General Query",
      t.agent,
      t.tenant,
      t.status,
      t.priority,
      t.date || "12 Aug 2026",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ticket_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tck-page-container">
      {/* ── TOP ACTION BAR ── */}
      <section className="tck-top-action-bar">
        <div className="tck-header-controls">
          <button
            type="button"
            className="tck-btn-secondary"
            onClick={handleExportCSV}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="tck-btn-primary"
            onClick={() => openRaiseTicket("Complaint")}
          >
            <Plus size={16} />
            <span>Raise Ticket</span>
          </button>
        </div>
      </section>

      {/* ── KPI SUMMARY CARDS (6-COL GRID) ── */}
      <section className="tck-summary-grid">
        {STATS.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div key={stat.key} className="tck-stat-card">
              <div className="tck-stat-top">
                <span className="tck-stat-label">{stat.label}</span>
                <div className={`tck-stat-icon-wrap ${stat.tone}`}>
                  <IconComponent size={18} />
                </div>
              </div>
              <div className="tck-stat-bottom">
                <span className="tck-stat-value">{stat.value}</span>
                <span className={`tck-stat-trend ${stat.trend}`}>{stat.change}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── ANALYTICS SPLIT (HEATMAP & CATEGORIES) ── */}
      <section className="tck-analytics-split">
        {/* Heatmap Card */}
        <div className="tck-card">
          <div className="tck-card-head">
            <div className="tck-card-title-wrap">
              <BarChart3 size={18} style={{ color: "var(--tck-primary)" }} />
              <h3 className="tck-card-title">Ticket Status vs Priority</h3>
            </div>
            <CustomSelect
              value={timeRange}
              onChange={setTimeRange}
              options={["This Year", "Last Year", "Last 30 Days", "Last 90 Days", "Custom Range"]}
              hideAllOption={true}
              alignRight={true}
            />
          </div>

          <div className="tck-heatmap-wrap">
            <div className="tck-heatmap">
              <div className="tck-hm-header-row">
                <div />
                {HEAT_COLS.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>

              {dynamicHeatmap.map((row) => (
                <div className="tck-hm-row" key={row.label}>
                  <div className="tck-hm-label">{row.label}</div>
                  {row.values.map((val, idx) => {
                    const intensity = val > 0 ? 0.25 + (val / maxHeat) * 0.75 : 0.05;
                    const isZero = val === 0;
                    return (
                      <div
                        key={idx}
                        className="tck-hm-cell"
                        style={{
                          backgroundColor: isZero
                            ? "var(--tck-surface-alt)"
                            : `rgba(124, 58, 237, ${intensity})`,
                          color: isZero ? "var(--tck-text-faint)" : "#ffffff",
                        }}
                        title={`${val} ${row.label} ${HEAT_COLS[idx]} tickets`}
                        onClick={() => {
                          setStatusFilter(row.label);
                          setPriorityFilter(HEAT_COLS[idx]);
                        }}
                      >
                        {val}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Categories Card */}
        <div className="tck-card">
          <div className="tck-card-head">
            <div>
              <h3 className="tck-card-title">Ticket Categories</h3>
              <p className="tck-card-subtitle">
                Classify employee issues for faster routing and resolution.
              </p>
            </div>
            <span className="tck-cat-count">
              {TICKET_CATEGORIES.length} categories
            </span>
          </div>

          <div className="tck-category-grid">
            {TICKET_CATEGORIES.map((category) => {
              const count = tickets.filter((t) => t.category === category).length;
              const active = categoryFilter === category;
              return (
                <button
                  key={category}
                  type="button"
                  className={`tck-category-chip ${active ? "active" : ""}`}
                  onClick={() => setCategoryFilter(active ? "All" : category)}
                >
                  <div className="tck-category-chip-left">
                    <span className={`tck-cat-dot ${CATEGORY_STYLE[category]}`} />
                    <span>{category}</span>
                  </div>
                  <span className="tck-cat-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TABLE CARD & TOOLBAR ── */}
      <section className="tck-table-card">
        {/* Filters Toolbar */}
        <div className="tck-toolbar-filters">
          <h2 className="tck-table-title">Ticket List</h2>

          <div className="tck-filters-row">
            <CustomSelect
              icon={Calendar}
              placeholder="All Dates"
              value={dateFilter}
              onChange={setDateFilter}
              options={[
                { value: "2026-01", label: "January 2026" },
                { value: "2026-02", label: "February 2026" },
                { value: "2026-03", label: "March 2026" },
                { value: "2026-04", label: "April 2026" },
                { value: "2026-05", label: "May 2026" },
                { value: "2026-06", label: "June 2026" },
                { value: "2026-07", label: "July 2026" },
                { value: "2026-08", label: "August 2026" },
                { value: "2026-09", label: "September 2026" },
                { value: "2026-10", label: "October 2026" },
                { value: "2026-11", label: "November 2026" },
                { value: "2026-12", label: "December 2026" },
              ]}
            />
            <CustomSelect
              icon={Filter}
              placeholder="All Statuses"
              value={statusFilter}
              onChange={setStatusFilter}
              options={["Open", "In Progress", "Closed"]}
            />
            <CustomSelect
              placeholder="All Priorities"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={["Critical", "High", "Medium", "Low"]}
            />
            <CustomSelect
              icon={Building2}
              placeholder="All Tenants"
              value={tenantFilter}
              onChange={setTenantFilter}
              options={["Me", "Ian D", "Belinda B", "Usman A"]}
            />
            <CustomSelect
              icon={Folder}
              placeholder="All Categories"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={TICKET_CATEGORIES}
            />
            <CustomSelect
              placeholder="Sort By"
              value={sortBy}
              onChange={setSortBy}
              options={["Newest First", "Oldest First", "Last 7 Days"]}
            />
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="tck-search-row">
          <div className="tck-search-wrap">
            <Search size={15} className="tck-search-icon" />
            <input
              type="text"
              className="tck-search-input"
              placeholder="Search title, ID, agent..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div style={{ fontSize: "13px", color: "var(--tck-text-muted)" }}>
            Showing <b>{filtered.length}</b> of {tickets.length} tickets
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selected.length > 0 && (
          <div className="tck-bulk-bar">
            <span>{selected.length} ticket(s) selected</span>
            <div className="tck-bulk-actions">
              <button
                type="button"
                className="tck-bulk-btn"
                onClick={() => handleBulkStatusChange("Closed")}
              >
                Mark Closed
              </button>
              <button
                type="button"
                className="tck-bulk-btn danger"
                onClick={handleBulkDelete}
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="tck-table-scroll">
          <table className="tck-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th>ID</th>
                <th>EMP CODE</th>
                <th>TITLE & AGENT</th>
                <th>CATEGORY</th>
                <th>STATUS</th>
                <th>PRIORITY</th>
                <th>DATE CREATED</th>
                <th style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    style={{
                      textAlign: "center",
                      padding: "48px 24px",
                      color: "var(--tck-text-muted)",
                    }}
                  >
                    No tickets found matching your search or filters.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const statusClass = String(t.status || "open")
                    .toLowerCase()
                    .replace(/\s+/g, "-");
                  const priorityClass = String(t.priority || "low").toLowerCase();
                  const isSelected = selected.includes(t.id);

                  return (
                    <tr key={t.id} className={isSelected ? "selected" : ""}>
                      {/* Checkbox */}
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(t.id)}
                        />
                      </td>

                      {/* ID */}
                      <td>
                        <span
                          className="tck-id-link"
                          onClick={() => setModalTicket(t)}
                        >
                          {t.id}
                        </span>
                      </td>

                      {/* Emp Code */}
                      <td style={{ fontWeight: 600, color: "var(--tck-text-body)" }}>
                        {t.empCode}
                      </td>

                      {/* Title & Agent */}
                      <td>
                        <div className="tck-title-cell">
                          <span className="tck-item-title">{t.title}</span>
                          <span className="tck-item-agent">
                            Assigned to: {t.agent}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className="tck-category-pill">
                          {t.category || "General"}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`tck-status-pill ${statusClass}`}>
                          <span className="dot" />
                          {t.status}
                        </span>
                      </td>

                      {/* Priority */}
                      <td>
                        <span className={`tck-priority-badge ${priorityClass}`}>
                          {t.priority}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ color: "var(--tck-text-muted)" }}>
                        {t.date || "12 Aug 2026"}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right", position: "relative" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <button
                            type="button"
                            className="tck-action-btn"
                            title="View details"
                            onClick={() => setModalTicket(t)}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            className="tck-action-btn"
                            title="More options"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === t.id ? null : t.id)
                            }
                          >
                            <MoreVertical size={15} />
                          </button>
                        </div>

                        {activeMenuId === t.id && (
                          <div
                            ref={rowMenuRef}
                            style={{
                              position: "absolute",
                              right: 20,
                              top: "100%",
                              background: "var(--tck-surface)",
                              border: "1px solid var(--tck-border)",
                              borderRadius: "var(--tck-radius-md)",
                              boxShadow: "var(--tck-shadow-elevated)",
                              zIndex: 70,
                              padding: "6px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                              minWidth: 150,
                              textAlign: "left",
                            }}
                          >
                            <button
                              type="button"
                              className="tck-select-option"
                              onClick={() => handleUpdateStatus(t.id, "Open")}
                            >
                              Mark as Open
                            </button>
                            <button
                              type="button"
                              className="tck-select-option"
                              onClick={() => handleUpdateStatus(t.id, "In Progress")}
                            >
                              Mark as In Progress
                            </button>
                            <button
                              type="button"
                              className="tck-select-option"
                              onClick={() => handleUpdateStatus(t.id, "Closed")}
                            >
                              Mark as Closed
                            </button>
                            <div
                              style={{
                                height: 1,
                                background: "var(--tck-border-subtle)",
                                margin: "4px 0",
                              }}
                            />
                            <button
                              type="button"
                              className="tck-select-option"
                              style={{ color: "var(--tck-rose)" }}
                              onClick={() => handleDeleteTicket(t.id)}
                            >
                              <Trash2 size={13} style={{ marginRight: 6 }} />
                              Delete Ticket
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

        {/* ── OPTION A: MOBILE TICKET CARDS ── */}
        <div className="tck-mobile-cards">
          {filtered.length === 0 ? (
            <div className="tck-tc-empty">No tickets found matching your search or filters.</div>
          ) : (
            filtered.map((t) => {
              const statusClass = String(t.status || "open").toLowerCase().replace(/\s+/g, "-");
              const priorityClass = String(t.priority || "low").toLowerCase();
              return (
                <div
                  key={t.id}
                  className="tck-ticket-card"
                  onClick={() => setModalTicket(t)}
                >
                  {/* Top row: ID + status & priority badges */}
                  <div className="tck-tc-top">
                    <span className="tck-tc-id">{t.id}</span>
                    <div className="tck-tc-badges">
                      <span className={`tck-status-pill ${statusClass}`}>
                        <span className="dot" />
                        {t.status}
                      </span>
                      <span className={`tck-priority-badge ${priorityClass}`}>
                        {t.priority}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="tck-tc-title">{t.title}</div>

                  {/* Meta: agent + date */}
                  <div className="tck-tc-meta">
                    <div className="tck-tc-meta-item">
                      <Calendar size={12} />
                      <span>{t.date || "—"}</span>
                    </div>
                    <div className="tck-tc-meta-item">
                      <span>Agent: {t.agent}</span>
                    </div>
                    {t.empCode && (
                      <div className="tck-tc-meta-item">
                        <span>{t.empCode}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer: category + actions */}
                  <div className="tck-tc-footer">
                    <span className="tck-tc-category">{t.category || "General Query"}</span>
                    <div className="tck-tc-actions">
                      <button
                        type="button"
                        className="tck-tc-action-btn"
                        title="View details"
                        onClick={(e) => { e.stopPropagation(); setModalTicket(t); }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="tck-tc-action-btn"
                        title="More options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === t.id ? null : t.id);
                        }}
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── TICKET DETAILS DRAWER ── */}
      {modalTicket && (
        <div
          className="tck-drawer-overlay"
          onClick={() => setModalTicket(null)}
        >
          <div
            className="tck-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tck-drawer-head">
              <div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--tck-primary)",
                  }}
                >
                  {modalTicket.id}
                </span>
                <h3
                  style={{
                    margin: "2px 0 0 0",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--tck-text)",
                  }}
                >
                  {modalTicket.title}
                </h3>
              </div>
              <button
                type="button"
                className="tck-action-btn"
                onClick={() => setModalTicket(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tck-drawer-body">
              <div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--tck-text-muted)",
                  }}
                >
                  Description
                </span>
                <p
                  style={{
                    margin: "6px 0 0 0",
                    fontSize: "13.5px",
                    lineHeight: 1.5,
                    color: "var(--tck-text)",
                  }}
                >
                  {modalTicket.description || "No description provided."}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  padding: "16px 0",
                  borderTop: "1px solid var(--tck-border-subtle)",
                  borderBottom: "1px solid var(--tck-border-subtle)",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--tck-text-muted)",
                    }}
                  >
                    Category
                  </span>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {modalTicket.category || "General"}
                  </p>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--tck-text-muted)",
                    }}
                  >
                    Priority
                  </span>
                  <p style={{ margin: "4px 0 0 0" }}>
                    <span
                      className={`tck-priority-badge ${modalTicket.priority?.toLowerCase()}`}
                    >
                      {modalTicket.priority}
                    </span>
                  </p>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--tck-text-muted)",
                    }}
                  >
                    Status
                  </span>
                  <p style={{ margin: "4px 0 0 0" }}>
                    <span
                      className={`tck-status-pill ${modalTicket.status
                        ?.toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      <span className="dot" />
                      {modalTicket.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--tck-text-muted)",
                    }}
                  >
                    Created Date
                  </span>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {modalTicket.date || "12 Aug 2026"}
                  </p>
                </div>
              </div>

              <div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--tck-text-muted)",
                  }}
                >
                  Change Status
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {["Open", "In Progress", "Closed"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`tck-select-btn ${modalTicket.status === st ? "is-active" : ""
                        }`}
                      onClick={() => {
                        handleUpdateStatus(modalTicket.id, st);
                        setModalTicket((prev) => ({ ...prev, status: st }));
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RAISE TICKET MODAL ── */}
      {raiseTicketOpen && (
        <div
          className="tck-modal-overlay"
          onClick={closeRaiseTicket}
        >
          <div
            className="tck-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tck-modal-title"
          >
            {/* Modal Header */}
            <div className="tck-modal-head">
              <h3 id="tck-modal-title" className="tck-modal-title">
                Raise New Support Ticket
              </h3>
              <button
                type="button"
                className="tck-modal-close-btn"
                onClick={closeRaiseTicket}
                aria-label="Close support ticket form"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="tck-modal-body">
              {raiseTicketError && (
                <div className="tck-modal-alert-error">
                  <AlertTriangle size={16} className="tck-alert-icon" />
                  <span>{raiseTicketError}</span>
                </div>
              )}

              {/* Category Field */}
              <div className="tck-form-group">
                <label className="tck-form-label">
                  Category <span className="tck-required">*</span>
                </label>
                <CustomSelect
                  value={raiseTicket.category}
                  hideAllOption
                  icon={LayoutGrid}
                  placeholder="Select category"
                  onChange={(val) =>
                    handleRaiseTicketChange("category", val)
                  }
                  options={TICKET_CATEGORIES}
                />
              </div>

              {/* Subject / Title Field */}
              <div className="tck-form-group">
                <label className="tck-form-label">
                  Subject / Title <span className="tck-required">*</span>
                </label>
                <div className="tck-input-icon-wrap">
                  <FileText size={16} className="tck-field-lead-icon" />
                  <input
                    type="text"
                    className="tck-form-input has-icon"
                    placeholder="Brief summary of your inquiry or issue"
                    value={raiseTicket.title}
                    onChange={(e) =>
                      handleRaiseTicketChange("title", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Priority Field */}
              <div className="tck-form-group">
                <label className="tck-form-label">
                  Priority <span className="tck-required">*</span>
                </label>
                <CustomSelect
                  value={raiseTicket.priority}
                  hideAllOption
                  icon={Flag}
                  placeholder="Select priority"
                  onChange={(val) =>
                    handleRaiseTicketChange("priority", val)
                  }
                  options={["Low", "Medium", "High", "Critical"]}
                />
              </div>

              {/* Description Field */}
              <div className="tck-form-group">
                <label className="tck-form-label">
                  Description <span className="tck-required">*</span>
                </label>
                <div className="tck-textarea-wrap">
                  <AlignLeft size={16} className="tck-textarea-lead-icon" />
                  <textarea
                    className="tck-form-textarea has-icon"
                    maxLength={500}
                    placeholder="Describe your issue with full details so the team can resolve it efficiently..."
                    value={raiseTicket.description}
                    onChange={(e) =>
                      handleRaiseTicketChange("description", e.target.value)
                    }
                  />
                  <span className="tck-char-counter">
                    {raiseTicket.description.length}/500
                  </span>
                </div>
              </div>

              {/* Attachment Field */}
              <div className="tck-form-group">
                <label className="tck-form-label">Attachment (Optional)</label>
                <label className="tck-attachment-box">
                  <div className="tck-attachment-icon-badge">
                    <Paperclip size={18} />
                  </div>
                  <div className="tck-attachment-text-wrap">
                    <span className="tck-attachment-name">
                      {raiseTicket.attachment
                        ? raiseTicket.attachment.name
                        : "Attach screenshot or document"}
                    </span>
                    <span className="tck-attachment-hint">
                      PNG, JPG, PDF (Max 5MB)
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      handleRaiseTicketChange(
                        "attachment",
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </label>
              </div>
            </div>

            {/* Modal Footer with Single Full-Width Primary Action Button */}
            <div className="tck-modal-foot">
              <button
                type="button"
                className="tck-btn-submit-ticket"
                disabled={isSubmitting}
                onClick={handleSubmitRaiseTicket}
              >
                {isSubmitting ? (
                  <>
                    <Clock size={17} className="tck-spin" />
                    <span>Submitting Ticket...</span>
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    <span>Submit Ticket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION ── */}
      {toastMsg && (
        <div className="tck-toast">
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}