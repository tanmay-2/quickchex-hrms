import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import {
  Calendar,
  Filter,
  Plus,
  ChevronDown,
  Clock,
  CheckCircle2,
  Eye,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Grid,
  List,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import "./DailyTask.css";

/* =====================================================================
   INITIAL TASKS DATA (Dynamic HRMS Live Tasks)
   ===================================================================== */
const INITIAL_TASKS = [];

const WEEKLY_CHART_DATA = [
  { day: "Mon", completed: 65, inProgress: 20, pending: 15 },
  { day: "Tue", completed: 78, inProgress: 14, pending: 8 },
  { day: "Wed", completed: 82, inProgress: 12, pending: 6 },
  { day: "Thu", completed: 71, inProgress: 19, pending: 10 },
  { day: "Fri", completed: 88, inProgress: 8, pending: 4 },
  { day: "Sat", completed: 55, inProgress: 25, pending: 20 },
  { day: "Sun", completed: 40, inProgress: 30, pending: 30 },
];

export default function DailyTaskPage() {
  const isInsideShell = useContext(DashboardShellContext);

  // If not already inside DashboardShell, wrap in DashboardShell so sidebar & header are guaranteed
  if (!isInsideShell) {
    return (
      <DashboardShell>
        <DailyTaskPage />
      </DashboardShell>
    );
  }

  return <DailyTaskContent />;
}

function DailyTaskContent() {
  // Tasks state
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("hrms_daily_tasks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // Persist tasks in localStorage
  useEffect(() => {
    localStorage.setItem("hrms_daily_tasks", JSON.stringify(tasks));
  }, [tasks]);

  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState("table");
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [activeDate, setActiveDate] = useState("Today");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [chartRange, setChartRange] = useState("This Week");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // New task form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    project: "HR Portal",
    dueDate: "Today, 06:00 PM",
    priority: "Medium",
    assigneeName: "",
    assigneeRole: "",
    assigneeCode: "",
    status: "In Progress",
    progress: 25,
  });

  // Edit task form state
  const [editTask, setEditTask] = useState(null);

  // Pagination state
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Refs for closing popovers on outside click
  const filterRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterPopoverOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Summary card counts
  const summaryCounts = useMemo(() => {
    let total = tasks.length;
    let inProgress = tasks.filter((t) => t.status === "In Progress").length;
    let completed = tasks.filter((t) => t.status === "Completed").length;
    let overdue = tasks.filter((t) => t.status === "Overdue").length;
    let pending = tasks.filter((t) => t.status === "Pending").length;
    return { total, inProgress, completed, overdue, pending };
  }, [tasks]);

  // Unique projects for filter
  const projectsList = useMemo(() => {
    const set = new Set(tasks.map((t) => t.project));
    return Array.from(set);
  }, [tasks]);

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(q);
          const matchesDesc = (task.description || "").toLowerCase().includes(q);
          const matchesProject = task.project.toLowerCase().includes(q);
          const matchesAssignee = task.assignee.name.toLowerCase().includes(q);
          const matchesCode = (task.assignee.code || "").toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesProject && !matchesAssignee && !matchesCode) {
            return false;
          }
        }

        if (statusFilter !== "all" && task.status !== statusFilter) {
          return false;
        }

        if (priorityFilter !== "all" && task.priority !== priorityFilter) {
          return false;
        }

        if (projectFilter !== "all" && task.project !== projectFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const pOrder = { High: 1, Medium: 2, Low: 3 };
          return (pOrder[a.priority] || 4) - (pOrder[b.priority] || 4);
        }
        if (sortBy === "dueDate") {
          return (a.dueDateRaw || "").localeCompare(b.dueDateRaw || "");
        }
        if (sortBy === "status") {
          return a.status.localeCompare(b.status);
        }
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [tasks, searchQuery, statusFilter, priorityFilter, projectFilter, sortBy]);

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;

  // Checkbox handlers
  const allCurrentSelected =
    paginatedTasks.length > 0 && paginatedTasks.every((t) => selectedTasks.has(t.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedTasks);
    if (allCurrentSelected) {
      paginatedTasks.forEach((t) => next.delete(t.id));
    } else {
      paginatedTasks.forEach((t) => next.add(t.id));
    }
    setSelectedTasks(next);
  };

  const toggleSelectTask = (id) => {
    const next = new Set(selectedTasks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTasks(next);
  };

  // Quick toggle status
  const handleQuickToggleComplete = (task) => {
    const newStatus = task.status === "Completed" ? "In Progress" : "Completed";
    const newProgress = newStatus === "Completed" ? 100 : Math.min(task.progress, 75) || 50;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus, progress: newProgress } : t))
    );
  };

  // Delete task
  const handleDeleteTask = (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setSelectedTasks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Add Task submit
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    const id = `TSK-${Math.floor(100 + Math.random() * 900)}`;
    const initials = newTask.assigneeName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const created = {
      id,
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      project: newTask.project,
      dueDate: newTask.dueDate || "Today, 06:00 PM",
      dueDateRaw: new Date().toISOString(),
      priority: newTask.priority,
      assignee: {
        name: newTask.assigneeName,
        code: newTask.assigneeCode || "EMP-0999",
        role: newTask.assigneeRole || "Staff",
        avatarBg: "#7c3aed",
        initials,
      },
      progress: Number(newTask.progress) || 0,
      status: newTask.status,
    };

    setTasks([created, ...tasks]);
    setShowAddModal(false);
    setNewTask({
      title: "",
      description: "",
      project: "HR Portal",
      dueDate: "Today, 06:00 PM",
      priority: "Medium",
      assigneeName: "",
      assigneeRole: "",
      assigneeCode: "",
      status: "In Progress",
      progress: 25,
    });
  };

  // Edit Task submit
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editTask) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === editTask.id ? { ...editTask } : t))
    );
    setShowEditModal(false);
    setEditTask(null);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setProjectFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    statusFilter !== "all" || priorityFilter !== "all" || projectFilter !== "all" || searchQuery !== "";

  return (
    <div className="daily-task-page">
      {/* ── TOP SECTION: Controls (+ Add Task, Date, Filter) ── */}
      <section className="dt-top-action-bar">
        <div className="dt-header-controls">
          {/* Today Date Selector */}
          <div className="dt-date-selector">
            <Calendar size={16} className="dt-date-icon" />
            <select
              className="dt-date-select"
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
            >
              <option value="Today">Today, 17 Sep 2026</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          {/* Filter Toggle Button */}
          <div className="dt-popover-anchor" ref={filterRef}>
            <button
              type="button"
              className={`dt-btn-filter ${hasActiveFilters ? "is-active" : ""}`}
              onClick={() => setFilterPopoverOpen((v) => !v)}
              title="Filter tasks"
            >
              <Filter size={16} />
              <span>Filter</span>
              {hasActiveFilters && <span className="dt-filter-dot" />}
            </button>

            {/* Filter Dropdown Popover */}
            {filterPopoverOpen && (
              <div className="dt-filter-popover">
                <div className="dt-popover-head">
                  <strong>Filter Tasks</strong>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="dt-filter-reset-link"
                      onClick={handleResetFilters}
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="dt-popover-body">
                  <div className="dt-popover-group">
                    <label>Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Completed">Completed</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div className="dt-popover-group">
                    <label>Priority</label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => {
                        setPriorityFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All Priorities</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div className="dt-popover-group">
                    <label>Project</label>
                    <select
                      value={projectFilter}
                      onChange={(e) => {
                        setProjectFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All Projects</option>
                      {projectsList.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* "+ Add Task" Primary Button (Purple) */}
          <button
            type="button"
            className="dt-btn-add-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} strokeWidth={2.4} />
            <span>Add Task</span>
          </button>
        </div>
      </section>

      {/* ── 4 SUMMARY CARDS (Total Tasks, In Progress, Completed, Overdue) ── */}
      <section className="dt-summary-grid">
        {/* Card 1: Total Tasks — 24 */}
        <div className="dt-card dt-card--total">
          <div className="dt-card-head">
            <span className="dt-card-label">Total Tasks</span>
            <span className="dt-card-pill dt-pill--purple">+4 vs yesterday</span>
          </div>
          <div className="dt-card-val-wrap">
            <h2 className="dt-card-val">{summaryCounts.total}</h2>
            <span className="dt-card-unit">Tasks</span>
          </div>
          <div className="dt-card-substats">
            <span><strong>18</strong> On-Time</span>
            <span className="dt-sub-divider">•</span>
            <span><strong>6</strong> In-Review</span>
          </div>
        </div>

        {/* Card 2: In Progress — 6 */}
        <div className="dt-card dt-card--progress">
          <div className="dt-card-head">
            <span className="dt-card-label">In Progress</span>
            <span className="dt-card-pill dt-pill--violet">+1 vs yesterday</span>
          </div>
          <div className="dt-card-val-wrap">
            <h2 className="dt-card-val">{summaryCounts.inProgress}</h2>
            <span className="dt-card-unit">Tasks</span>
          </div>
          <div className="dt-card-substats">
            <span><strong>4</strong> High Priority</span>
            <span className="dt-sub-divider">•</span>
            <span><strong>2</strong> Medium</span>
          </div>
        </div>

        {/* Card 3: Completed — 8 (Rich Purple Card matching HRMS theme) */}
        <div className="dt-card dt-card--completed">
          <div className="dt-card-head">
            <span className="dt-card-label">Completed</span>
            <span className="dt-card-pill dt-pill--dark-purple">+3 today</span>
          </div>
          <div className="dt-card-val-wrap">
            <h2 className="dt-card-val">{summaryCounts.completed}</h2>
            <span className="dt-card-unit">Tasks</span>
          </div>
          <div className="dt-card-substats">
            <span><strong>100%</strong> Quality Passed</span>
            <span className="dt-sub-divider">•</span>
            <span><strong>0</strong> Blockers</span>
          </div>
        </div>

        {/* Card 4: Overdue — 3 */}
        <div className="dt-card dt-card--overdue">
          <div className="dt-card-head">
            <span className="dt-card-label">Overdue</span>
            <span className="dt-card-pill dt-pill--rose">Needs Action</span>
          </div>
          <div className="dt-card-val-wrap">
            <h2 className="dt-card-val">{summaryCounts.overdue}</h2>
            <span className="dt-card-unit">Tasks</span>
          </div>
          <div className="dt-card-substats">
            <span><strong>2</strong> Critical S1</span>
            <span className="dt-sub-divider">•</span>
            <span><strong>1</strong> Escalated</span>
          </div>
        </div>
      </section>

      {/* ── TASK OVERVIEW SECTION (Weekly Progress Chart, Stats & Today's %) ── */}
      <section className="dt-overview-card">
        <div className="dt-overview-left">
          <div className="dt-overview-head">
            <div>
              <h3 className="dt-overview-title">Task Overview</h3>
              <p className="dt-overview-sub">Weekly task completion and activity velocity</p>
            </div>

            <div className="dt-overview-time-select">
              <select
                value={chartRange}
                onChange={(e) => setChartRange(e.target.value)}
                className="dt-range-dropdown"
              >
                <option value="This Week">This Week</option>
                <option value="Last 2 Weeks">Last 2 Weeks</option>
                <option value="Last 6 Months">Last 6 Months</option>
              </select>
            </div>
          </div>

          {/* Weekly Progress Bar Chart (Purple Shades) */}
          <div className="dt-chart-container">
            <div className="dt-chart-y-axis">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            <div className="dt-chart-bars">
              {WEEKLY_CHART_DATA.map((item) => (
                <div key={item.day} className="dt-chart-col">
                  <div className="dt-stacked-bar">
                    {/* Top segment: Completed (Primary Purple) */}
                    <div
                      className="dt-bar-seg dt-bar-seg--completed"
                      style={{ height: `${item.completed}%` }}
                      title={`${item.day}: ${item.completed}% Completed`}
                    />
                    {/* Middle segment: In Progress (Soft Violet) */}
                    <div
                      className="dt-bar-seg dt-bar-seg--progress"
                      style={{ height: `${item.inProgress}%` }}
                      title={`${item.day}: ${item.inProgress}% In Progress`}
                    />
                    {/* Base segment: Pending (Deep Purple/Indigo) */}
                    <div
                      className="dt-bar-seg dt-bar-seg--pending"
                      style={{ height: `${item.pending}%` }}
                      title={`${item.day}: ${item.pending}% Pending`}
                    />
                  </div>
                  <span className="dt-chart-label">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="dt-chart-legend">
            <span className="dt-legend-item">
              <span className="dt-dot dt-dot--completed" /> Completed
            </span>
            <span className="dt-legend-item">
              <span className="dt-dot dt-dot--progress" /> In Progress
            </span>
            <span className="dt-legend-item">
              <span className="dt-dot dt-dot--pending" /> Pending
            </span>
          </div>
        </div>

        {/* Right: Today's Completion Percentage Dial & Statistics (Purple) */}
        <div className="dt-overview-right">
          <h4 className="dt-right-title">Today's Performance</h4>

          <div className="dt-radial-wrap">
            <svg className="dt-radial-svg" viewBox="0 0 120 120">
              <circle
                className="dt-radial-track"
                cx="60"
                cy="60"
                r="48"
                strokeWidth="10"
              />
              <circle
                className="dt-radial-fill"
                cx="60"
                cy="60"
                r="48"
                strokeWidth="10"
                strokeDasharray="301.59"
                strokeDashoffset={301.59 * (1 - 0.72)}
              />
            </svg>
            <div className="dt-radial-text">
              <span className="dt-radial-percent">72%</span>
              <span className="dt-radial-label">Completed</span>
            </div>
          </div>

          <div className="dt-metrics-list">
            <div className="dt-metric-row">
              <div className="dt-metric-label">
                <span className="dt-dot dt-dot--completed" />
                <span>Completed Tasks</span>
              </div>
              <strong style={{ color: "#7c3aed" }}>{summaryCounts.completed} (33%)</strong>
            </div>
            <div className="dt-metric-row">
              <div className="dt-metric-label">
                <span className="dt-dot dt-dot--progress" />
                <span>In Progress</span>
              </div>
              <strong>{summaryCounts.inProgress} (25%)</strong>
            </div>
            <div className="dt-metric-row">
              <div className="dt-metric-label">
                <span className="dt-dot dt-dot--pending" />
                <span>Pending Review</span>
              </div>
              <strong>{summaryCounts.pending} (29%)</strong>
            </div>
            <div className="dt-metric-row">
              <div className="dt-metric-label">
                <span className="dt-dot dt-dot--rose" />
                <span>Overdue Tasks</span>
              </div>
              <strong style={{ color: "#e11d48" }}>{summaryCounts.overdue} (13%)</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── "TODAY'S TASKS" SECTION WITH TOOLBAR, TABLE & PAGINATION ── */}
      <section className="dt-tasks-section">
        {/* Section Toolbar */}
        <div className="dt-tasks-toolbar">
          <div className="dt-toolbar-title-wrap">
            <h2 className="dt-section-title">Today's Tasks</h2>
            <span className="dt-task-count-badge">{filteredTasks.length} tasks</span>
          </div>

          <div className="dt-toolbar-actions">
            {/* Search Tasks */}
            <div className="dt-search-box">
              <input
                type="text"
                placeholder="Search tasks, projects, or assignees..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="dt-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="dt-clear-search"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              type="button"
              className={`dt-btn-secondary ${statusFilter !== "all" ? "is-active" : ""}`}
              onClick={() => setFilterPopoverOpen((v) => !v)}
            >
              <Filter size={15} />
              <span>Filter</span>
            </button>

            {/* Sort By Dropdown */}
            <div className="dt-popover-anchor" ref={sortRef}>
              <button
                type="button"
                className="dt-btn-secondary"
                onClick={() => setSortDropdownOpen((v) => !v)}
              >
                <SlidersHorizontal size={15} />
                <span>Sort by: {sortBy === "default" ? "Default" : sortBy}</span>
                <ChevronDown size={14} />
              </button>

              {sortDropdownOpen && (
                <div className="dt-sort-menu">
                  <button
                    type="button"
                    className={`dt-sort-item ${sortBy === "default" ? "is-selected" : ""}`}
                    onClick={() => {
                      setSortBy("default");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Default Order
                  </button>
                  <button
                    type="button"
                    className={`dt-sort-item ${sortBy === "dueDate" ? "is-selected" : ""}`}
                    onClick={() => {
                      setSortBy("dueDate");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Due Date
                  </button>
                  <button
                    type="button"
                    className={`dt-sort-item ${sortBy === "priority" ? "is-selected" : ""}`}
                    onClick={() => {
                      setSortBy("priority");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Priority (High to Low)
                  </button>
                  <button
                    type="button"
                    className={`dt-sort-item ${sortBy === "status" ? "is-selected" : ""}`}
                    onClick={() => {
                      setSortBy("status");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Status
                  </button>
                  <button
                    type="button"
                    className={`dt-sort-item ${sortBy === "title" ? "is-selected" : ""}`}
                    onClick={() => {
                      setSortBy("title");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Task Title
                  </button>
                </div>
              )}
            </div>

            {/* View Options (Table / Grid) */}
            <div className="dt-view-toggle">
              <button
                type="button"
                className={`dt-view-btn ${viewMode === "table" ? "is-active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <List size={16} />
              </button>
              <button
                type="button"
                className={`dt-view-btn ${viewMode === "grid" ? "is-active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <Grid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* TABLE VIEW */}
        {viewMode === "table" ? (
          <div className="dt-table-card">
            <div className="dt-table-responsive">
              <table className="dt-table">
                <thead>
                  <tr>
                    <th style={{ width: "42px" }}>
                      <input
                        type="checkbox"
                        className="dt-checkbox"
                        checked={allCurrentSelected}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th style={{ minWidth: "120px" }}>Progress</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right", minWidth: "100px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="dt-empty-cell">
                        <div className="dt-empty-wrap">
                          <FileText size={32} />
                          <p>No tasks found matching current filters.</p>
                          <button
                            type="button"
                            className="dt-btn-reset-filters"
                            onClick={handleResetFilters}
                          >
                            Clear Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((task) => {
                      const isSelected = selectedTasks.has(task.id);
                      return (
                        <tr
                          key={task.id}
                          className={`dt-row ${isSelected ? "is-row-selected" : ""}`}
                        >
                          {/* 1. Checkbox */}
                          <td>
                            <input
                              type="checkbox"
                              className="dt-checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectTask(task.id)}
                            />
                          </td>

                          {/* 2. Task */}
                          <td>
                            <div className="dt-task-cell">
                              <span className="dt-task-title" title={task.title}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span className="dt-task-desc" title={task.description}>
                                  {task.description}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Project */}
                          <td>
                            <span className="dt-project-badge">{task.project}</span>
                          </td>

                          {/* 4. Due Date */}
                          <td>
                            <div className="dt-date-cell">
                              <Clock size={13} className="dt-clock-icon" />
                              <span>{task.dueDate}</span>
                            </div>
                          </td>

                          {/* 5. Priority */}
                          <td>
                            <span
                              className={`dt-priority-pill dt-priority--${task.priority.toLowerCase()}`}
                            >
                              {task.priority}
                            </span>
                          </td>

                          {/* 6. Assignee */}
                          <td>
                            <div className="dt-assignee-cell">
                              <span
                                className="dt-assignee-avatar"
                                style={{ backgroundColor: task.assignee.avatarBg || "#7c3aed" }}
                              >
                                {task.assignee.initials || "EM"}
                              </span>
                              <div className="dt-assignee-meta">
                                <strong className="dt-assignee-name">{task.assignee.name}</strong>
                                <span className="dt-assignee-code">
                                  {task.assignee.code} • {task.assignee.role}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 7. Progress */}
                          <td>
                            <div className="dt-progress-wrap">
                              <div className="dt-progress-bar-bg">
                                <div
                                  className="dt-progress-bar-fill"
                                  style={{
                                    width: `${task.progress}%`,
                                    backgroundColor:
                                      task.progress === 100
                                        ? "#7c3aed"
                                        : task.progress > 50
                                        ? "#8b5cf6"
                                        : "#a855f7",
                                  }}
                                />
                              </div>
                              <span className="dt-progress-text">{task.progress}%</span>
                            </div>
                          </td>

                          {/* 8. Status */}
                          <td>
                            <span
                              className={`dt-status-pill dt-status--${task.status
                                .toLowerCase()
                                .replace(/\s+/g, "-")}`}
                            >
                              {task.status}
                            </span>
                          </td>

                          {/* 9. Actions */}
                          <td style={{ textAlign: "right" }}>
                            <div className="dt-actions-group">
                              <button
                                type="button"
                                className="dt-action-icon-btn"
                                title="Quick Toggle Complete"
                                onClick={() => handleQuickToggleComplete(task)}
                              >
                                <CheckCircle2
                                  size={16}
                                  color={task.status === "Completed" ? "#7c3aed" : "#94a3b8"}
                                />
                              </button>
                              <button
                                type="button"
                                className="dt-action-icon-btn"
                                title="View Task Details"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowViewModal(true);
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                className="dt-action-icon-btn"
                                title="Edit Task"
                                onClick={() => {
                                  setEditTask({ ...task });
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                className="dt-action-icon-btn dt-action-danger"
                                title="Delete Task"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 size={15} />
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
        ) : (
          /* GRID VIEW ALTERNATIVE */
          <div className="dt-grid-view">
            {paginatedTasks.map((task) => (
              <div key={task.id} className="dt-grid-card">
                <div className="dt-grid-card-head">
                  <span className="dt-project-badge">{task.project}</span>
                  <span
                    className={`dt-priority-pill dt-priority--${task.priority.toLowerCase()}`}
                  >
                    {task.priority}
                  </span>
                </div>

                <h3 className="dt-grid-title">{task.title}</h3>
                <p className="dt-grid-desc">{task.description}</p>

                <div className="dt-grid-assignee">
                  <span
                    className="dt-assignee-avatar"
                    style={{ backgroundColor: task.assignee.avatarBg || "#7c3aed" }}
                  >
                    {task.assignee.initials || "EM"}
                  </span>
                  <div>
                    <strong>{task.assignee.name}</strong>
                    <p>{task.assignee.code}</p>
                  </div>
                </div>

                <div className="dt-progress-wrap" style={{ marginTop: "12px" }}>
                  <div className="dt-progress-bar-bg">
                    <div
                      className="dt-progress-bar-fill"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="dt-progress-text">{task.progress}%</span>
                </div>

                <div className="dt-grid-footer">
                  <span
                    className={`dt-status-pill dt-status--${task.status
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {task.status}
                  </span>
                  <div className="dt-actions-group">
                    <button
                      type="button"
                      className="dt-action-icon-btn"
                      onClick={() => {
                        setSelectedTask(task);
                        setShowViewModal(true);
                      }}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      className="dt-action-icon-btn"
                      onClick={() => {
                        setEditTask({ ...task });
                        setShowEditModal(true);
                      }}
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PAGINATION (Show 10 of 24 results, < 1 2 3 >) ── */}
        <div className="dt-pagination-bar">
          <div className="dt-pagination-left">
            <span>Show</span>
            <select
              className="dt-page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>of {filteredTasks.length} results</span>
          </div>

          <div className="dt-pagination-controls">
            <button
              type="button"
              className="dt-page-btn dt-page-prev"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`dt-page-number ${currentPage === page ? "is-active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="dt-page-btn dt-page-next"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          "+ ADD TASK" MODAL
          ══════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="dt-modal-overlay">
          <div className="dt-modal-card">
            <div className="dt-modal-head">
              <h3>Create New Daily Task</h3>
              <button
                type="button"
                className="dt-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="dt-modal-form">
              <div className="dt-form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit security compliance logs"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>

              <div className="dt-form-group">
                <label>Description / Work Notes</label>
                <textarea
                  rows={3}
                  placeholder="Provide scope of work or acceptance criteria..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>

              <div className="dt-form-row">
                <div className="dt-form-group">
                  <label>Project</label>
                  <select
                    value={newTask.project}
                    onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
                  >
                    <option value="HR Portal">HR Portal</option>
                    <option value="UI Redesign">UI Redesign</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Security & Access">Security & Access</option>
                    <option value="Payroll & Salary">Payroll & Salary</option>
                    <option value="Leave Management">Leave Management</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>

                <div className="dt-form-group">
                  <label>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="dt-form-row">
                <div className="dt-form-group">
                  <label>Assignee Name</label>
                  <input
                    type="text"
                    value={newTask.assigneeName}
                    onChange={(e) => setNewTask({ ...newTask, assigneeName: e.target.value })}
                  />
                </div>

                <div className="dt-form-group">
                  <label>Assignee Employee Code</label>
                  <input
                    type="text"
                    value={newTask.assigneeCode}
                    onChange={(e) => setNewTask({ ...newTask, assigneeCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="dt-form-row">
                <div className="dt-form-group">
                  <label>Due Date & Time</label>
                  <input
                    type="text"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>

                <div className="dt-form-group">
                  <label>Initial Status</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="dt-form-group">
                <label>Progress: {newTask.progress}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={newTask.progress}
                  onChange={(e) => setNewTask({ ...newTask, progress: Number(e.target.value) })}
                />
              </div>

              <div className="dt-modal-foot">
                <button
                  type="button"
                  className="dt-btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="dt-btn-submit">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          "EDIT TASK" MODAL
          ═══════════════════════════════════════════════════════════════ */}
      {showEditModal && editTask && (
        <div className="dt-modal-overlay">
          <div className="dt-modal-card">
            <div className="dt-modal-head">
              <h3>Edit Daily Task ({editTask.id})</h3>
              <button
                type="button"
                className="dt-modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="dt-modal-form">
              <div className="dt-form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTask.title}
                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                />
              </div>

              <div className="dt-form-group">
                <label>Description / Work Notes</label>
                <textarea
                  rows={3}
                  value={editTask.description || ""}
                  onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                />
              </div>

              <div className="dt-form-row">
                <div className="dt-form-group">
                  <label>Project</label>
                  <input
                    type="text"
                    value={editTask.project}
                    onChange={(e) => setEditTask({ ...editTask, project: e.target.value })}
                  />
                </div>

                <div className="dt-form-group">
                  <label>Priority</label>
                  <select
                    value={editTask.priority}
                    onChange={(e) => setEditTask({ ...editTask, priority: e.target.value })}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="dt-form-row">
                <div className="dt-form-group">
                  <label>Due Date</label>
                  <input
                    type="text"
                    value={editTask.dueDate}
                    onChange={(e) => setEditTask({ ...editTask, dueDate: e.target.value })}
                  />
                </div>

                <div className="dt-form-group">
                  <label>Status</label>
                  <select
                    value={editTask.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      const newProg =
                        newStatus === "Completed"
                          ? 100
                          : editTask.progress === 100
                          ? 60
                          : editTask.progress;
                      setEditTask({ ...editTask, status: newStatus, progress: newProg });
                    }}
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="dt-form-group">
                <label>Progress: {editTask.progress}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editTask.progress}
                  onChange={(e) => setEditTask({ ...editTask, progress: Number(e.target.value) })}
                />
              </div>

              <div className="dt-modal-foot">
                <button
                  type="button"
                  className="dt-btn-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="dt-btn-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          "VIEW TASK DETAILS" MODAL
          ═══════════════════════════════════════════════════════════════ */}
      {showViewModal && selectedTask && (
        <div className="dt-modal-overlay">
          <div className="dt-modal-card dt-modal-detail">
            <div className="dt-modal-head">
              <div>
                <span className="dt-detail-id">{selectedTask.id}</span>
                <h3 style={{ marginTop: "4px" }}>{selectedTask.title}</h3>
              </div>
              <button
                type="button"
                className="dt-modal-close"
                onClick={() => setShowViewModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dt-detail-body">
              <div className="dt-detail-section">
                <label>Description</label>
                <p className="dt-detail-text">
                  {selectedTask.description || "No specific work notes provided for this task."}
                </p>
              </div>

              <div className="dt-detail-grid">
                <div className="dt-detail-item">
                  <label>Project</label>
                  <span className="dt-project-badge">{selectedTask.project}</span>
                </div>
                <div className="dt-detail-item">
                  <label>Status</label>
                  <span
                    className={`dt-status-pill dt-status--${selectedTask.status
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {selectedTask.status}
                  </span>
                </div>
                <div className="dt-detail-item">
                  <label>Priority</label>
                  <span
                    className={`dt-priority-pill dt-priority--${selectedTask.priority.toLowerCase()}`}
                  >
                    {selectedTask.priority}
                  </span>
                </div>
                <div className="dt-detail-item">
                  <label>Due Date</label>
                  <strong>{selectedTask.dueDate}</strong>
                </div>
              </div>

              <div className="dt-detail-assignee-card">
                <span
                  className="dt-assignee-avatar dt-assignee-avatar--lg"
                  style={{ backgroundColor: selectedTask.assignee.avatarBg || "#7c3aed" }}
                >
                  {selectedTask.assignee.initials}
                </span>
                <div>
                  <strong>{selectedTask.assignee.name}</strong>
                  <p>
                    {selectedTask.assignee.code} • {selectedTask.assignee.role}
                  </p>
                </div>
              </div>

              <div className="dt-detail-progress-section">
                <div className="dt-detail-progress-label">
                  <span>Current Completion</span>
                  <strong>{selectedTask.progress}%</strong>
                </div>
                <div className="dt-progress-bar-bg" style={{ height: "10px" }}>
                  <div
                    className="dt-progress-bar-fill"
                    style={{ width: `${selectedTask.progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="dt-modal-foot">
              <button
                type="button"
                className="dt-btn-cancel"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="dt-btn-submit"
                onClick={() => {
                  setShowViewModal(false);
                  setEditTask({ ...selectedTask });
                  setShowEditModal(true);
                }}
              >
                Edit Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}