import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Calendar, 
  Search, 
  ChevronRight, 
  Briefcase, 
  Mail, 
  Phone,
  LayoutGrid,
  Table as TableIcon,
  X,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Building2,
  BadgeCheck,
  CheckCircle2
} from "lucide-react";
import { DashboardShellContext } from "../../components/header/DashboardHeader";
import { getApiUrl } from "../../services/apiClient";
import CustomSelect from "../../components/ui/CustomSelect";
import "./AdminManagersList.css";

export default function AdminManagersList() {
  const navigate = useNavigate();
  const isInsideShell = useContext(DashboardShellContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ total_managers: 0, managers: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("all");
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

  const fetchManagers = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token") || "";

    const tryFetch = async () => {
      const res = await fetch(getApiUrl("/admin/managers"), {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) return await res.json();
      throw new Error(`Failed to fetch managers: ${res.statusText}`);
    };

    tryFetch()
      .then((resData) => {
        if (resData && resData.managers) {
          setData(resData);
        } else {
          setData({ total_managers: 0, managers: [] });
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch managers:", err);
        setError("Unable to load managers directory. Please check network connection and try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  // Format department for clean display
  const cleanDepartment = (rawDept) => {
    if (!rawDept) return "Operations";
    if (rawDept.includes("*")) {
      const parts = rawDept.split("*").map(p => p.trim()).filter(Boolean);
      return parts[0] || "Operations";
    }
    return rawDept;
  };

  // Get initials from manager name
  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "M";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Extract unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set();
    (data.managers || []).forEach(m => {
      const d = cleanDepartment(m.department);
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [data.managers]);

  // Filtered managers
  const filteredManagers = useMemo(() => {
    return (data.managers || []).filter((m) => {
      const dept = cleanDepartment(m.department);

      // Department filter
      if (selectedDept !== "all" && dept.toLowerCase() !== selectedDept.toLowerCase()) {
        return false;
      }

      // Team filter
      if (selectedTeamFilter === "has_team" && (!m.team_size || m.team_size <= 0)) {
        return false;
      }
      if (selectedTeamFilter === "no_team" && m.team_size > 0) {
        return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return (
        (m.name || "").toLowerCase().includes(q) ||
        (m.emp_code || "").toLowerCase().includes(q) ||
        (m.department || "").toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q) ||
        (m.designation || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q)
      );
    });
  }, [data.managers, searchTerm, selectedDept, selectedTeamFilter]);

  // KPI calculations directly from authoritative backend response
  const totalManagers = data.total_managers || (data.managers || []).length;
  const totalTeamMembers = (data.managers || []).reduce((acc, m) => acc + (m.team_size || 0), 0);
  const totalPresentToday = (data.managers || []).reduce((acc, m) => acc + (m.present_today || 0), 0);
  const totalOnLeaveToday = (data.managers || []).reduce((acc, m) => acc + (m.leave_today || 0), 0);

  const hasActiveFilters = Boolean(searchTerm.trim() || selectedDept !== "all" || selectedTeamFilter !== "all");

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedDept("all");
    setSelectedTeamFilter("all");
  };

  return (
    <div className="dash-page-container">
      {/* Header if standalone */}
      {!isInsideShell && (
        <div className="dash-page-header">
          <div className="dash-page-header__left">
            <span className="dash-page-header__eyebrow">Admin Portal</span>
            <h1 className="dash-page-header__title">Managers & Teams</h1>
            <p className="dash-page-header__subtitle">
              View all managers, monitor direct reportees, and inspect team attendance in real-time.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards — 4 cols on desktop, 2 cols on mobile */}
      <section className="mgr-kpi-grid" aria-label="Manager Statistics Summary">
        <div className="mgr-kpi-card">
          <div className="mgr-kpi-icon purple" aria-hidden="true">
            <Users size={22} />
          </div>
          <div className="mgr-kpi-meta">
            <span className="mgr-kpi-label">Total Managers</span>
            <span className="mgr-kpi-value">{loading ? "..." : totalManagers}</span>
          </div>
        </div>

        <div className="mgr-kpi-card">
          <div className="mgr-kpi-icon blue" aria-hidden="true">
            <Users size={22} />
          </div>
          <div className="mgr-kpi-meta">
            <span className="mgr-kpi-label">Team Members</span>
            <span className="mgr-kpi-value">{loading ? "..." : totalTeamMembers}</span>
          </div>
        </div>

        <div className="mgr-kpi-card">
          <div className="mgr-kpi-icon green" aria-hidden="true">
            <UserCheck size={22} />
          </div>
          <div className="mgr-kpi-meta">
            <span className="mgr-kpi-label">Present Today</span>
            <span className="mgr-kpi-value">{loading ? "..." : totalPresentToday}</span>
          </div>
        </div>

        <div className="mgr-kpi-card">
          <div className="mgr-kpi-icon amber" aria-hidden="true">
            <Calendar size={22} />
          </div>
          <div className="mgr-kpi-meta">
            <span className="mgr-kpi-label">On Leave Today</span>
            <span className="mgr-kpi-value">{loading ? "..." : totalOnLeaveToday}</span>
          </div>
        </div>
      </section>

      {/* Main Directory Container */}
      <section className="mgr-directory-card" aria-label="Managers Directory">
        {/* Header & Filters */}
        <div className="mgr-directory-header">
          <div className="mgr-header-top">
            <div className="mgr-title-group">
              <h2 className="mgr-title">Managers Directory</h2>
              <p className="mgr-subtitle">
                Select a manager to view their team member roster and daily attendance.
              </p>
            </div>

            {/* Desktop View Switcher */}
            <div className="mgr-view-toggle" role="radiogroup" aria-label="View format">
              <button
                type="button"
                className={`mgr-toggle-btn ${viewMode === "cards" ? "is-active" : ""}`}
                onClick={() => setViewMode("cards")}
                title="Cards View"
                aria-label="Cards View"
              >
                <LayoutGrid size={15} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`mgr-toggle-btn ${viewMode === "table" ? "is-active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
                aria-label="Table View"
              >
                <TableIcon size={15} />
                <span>Table</span>
              </button>
            </div>
          </div>

          <div className="mgr-toolbar">
            {/* Search Box */}
            <div className="mgr-search-box">
              <Search size={16} className="mgr-search-icon" />
              <input
                type="text"
                placeholder="Search manager, code or dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mgr-search-input"
                aria-label="Search managers"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="mgr-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters Group */}
            <div className="mgr-filters-group">
              {departmentOptions.length > 0 && (
                <div style={{ minWidth: "160px" }}>
                  <CustomSelect
                    size="sm"
                    value={selectedDept}
                    onChange={(val) => {
                      const next = typeof val === "object" && val?.target ? val.target.value : val;
                      setSelectedDept(next);
                    }}
                    options={[
                      { value: "all", label: "All Departments" },
                      ...departmentOptions.map((dept) => ({ value: dept, label: dept })),
                    ]}
                    ariaLabel="Filter by department"
                    id="filter-department-select"
                  />
                </div>
              )}

              {/* Team Size Filter */}
              <div style={{ minWidth: "160px" }}>
                <CustomSelect
                  size="sm"
                  value={selectedTeamFilter}
                  onChange={(val) => {
                    const next = typeof val === "object" && val?.target ? val.target.value : val;
                    setSelectedTeamFilter(next);
                  }}
                  options={[
                    { value: "all", label: "All Team Sizes" },
                    { value: "has_team", label: "With Team Members" },
                    { value: "no_team", label: "No Direct Reports" },
                  ]}
                  ariaLabel="Filter by team assignment"
                  id="filter-team-size-select"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Summary Strip */}
        {hasActiveFilters && (
          <div className="mgr-filter-summary">
            <span>
              Showing {filteredManagers.length} of {data.managers?.length || 0} managers
              {searchTerm && ` matching "${searchTerm}"`}
              {selectedDept !== "all" && ` in ${selectedDept}`}
            </span>
            <button type="button" className="mgr-filter-summary-btn" onClick={clearAllFilters}>
              Reset Filters
            </button>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mgr-state-container">
            <div className="mgr-state-icon" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
              <AlertCircle size={24} />
            </div>
            <h3 className="mgr-state-title">Failed to load managers</h3>
            <p className="mgr-state-desc">{error}</p>
            <button
              type="button"
              className="mgr-btn-primary"
              style={{ width: "auto", padding: "0 20px" }}
              onClick={fetchManagers}
            >
              <RefreshCw size={15} /> Try Again
            </button>
          </div>
        )}

        {/* Loading State Skeletons */}
        {loading && (
          <div className="mgr-cards-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="mgr-skeleton-card">
                <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                  <div className="mgr-skeleton-box" style={{ width: "48px", height: "48px", borderRadius: "50%" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div className="mgr-skeleton-box" style={{ width: "60%", height: "16px" }} />
                    <div className="mgr-skeleton-box" style={{ width: "40%", height: "12px" }} />
                  </div>
                </div>
                <div className="mgr-skeleton-box" style={{ width: "100%", height: "40px" }} />
                <div className="mgr-skeleton-box" style={{ width: "100%", height: "50px" }} />
                <div className="mgr-skeleton-box" style={{ width: "100%", height: "38px" }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredManagers.length === 0 && (
          <div className="mgr-state-container">
            <div className="mgr-state-icon">
              <Users size={24} />
            </div>
            <h3 className="mgr-state-title">No managers found</h3>
            <p className="mgr-state-desc">
              {hasActiveFilters
                ? "No manager records match your current search query or filter selection."
                : "There are currently no manager profiles registered in the system."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="mgr-btn-secondary"
                style={{ width: "auto", padding: "0 18px", marginTop: "4px" }}
                onClick={clearAllFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ── CARD-BASED LAYOUT (Mobile ALWAYS, Desktop when cards active) ── */}
        {!loading && !error && filteredManagers.length > 0 && (viewMode === "cards" || window.innerWidth <= 768) && (
          <div className="mgr-cards-grid">
            {filteredManagers.map((m) => {
              const dept = cleanDepartment(m.department);
              const initials = getInitials(m.name);

              return (
                <article key={m.id || m.emp_code} className="mgr-card">
                  {/* Top: Identity Section */}
                  <div className="mgr-card-header">
                    <div className="mgr-avatar" aria-hidden="true">
                      {initials}
                    </div>

                    <div className="mgr-identity">
                      <div className="mgr-identity-top">
                        <h3 className="mgr-name">{m.name || "Unnamed Manager"}</h3>
                        <span className="mgr-code-badge" title="Employee ID">
                          {m.emp_code}
                        </span>
                      </div>

                      <p className="mgr-designation">{m.designation || "Manager"}</p>

                      <div className="mgr-meta-tags">
                        <span className="mgr-dept-badge">
                          <Building2 size={12} color="#7c3aed" />
                          {dept}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info Row */}
                  {(m.email || m.contact) && (
                    <div className="mgr-contact-list">
                      {m.email && (
                        <a 
                          href={`mailto:${m.email}`} 
                          className="mgr-contact-item" 
                          title={`Email ${m.name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail size={13} className="mgr-contact-icon" />
                          <span>{m.email}</span>
                        </a>
                      )}
                      {m.contact && m.contact !== "—" && (
                        <a 
                          href={`tel:${m.contact}`} 
                          className="mgr-contact-item" 
                          title={`Call ${m.name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={13} className="mgr-contact-icon" />
                          <span>{m.contact}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Team Attendance Stats Strip */}
                  <div className="mgr-stats-strip" aria-label="Team Attendance Status">
                    <div className="mgr-stat-tile is-team" title="Total Assigned Team Members">
                      <span className="mgr-stat-val">{m.team_size || 0}</span>
                      <span className="mgr-stat-lbl">Team</span>
                    </div>

                    <div className="mgr-stat-tile is-present" title="Team Members Present Today">
                      <span className="mgr-stat-val">{m.present_today || 0}</span>
                      <span className="mgr-stat-lbl">Present</span>
                    </div>

                    <div className="mgr-stat-tile is-leave" title="Team Members On Leave Today">
                      <span className="mgr-stat-val">{m.leave_today || 0}</span>
                      <span className="mgr-stat-lbl">Leave</span>
                    </div>

                    <div className="mgr-stat-tile is-absent" title="Team Members Absent Today">
                      <span className="mgr-stat-val">{m.absent_today || 0}</span>
                      <span className="mgr-stat-lbl">Absent</span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mgr-card-actions">
                    <button
                      type="button"
                      className="mgr-btn-primary"
                      onClick={() => navigate(`/admin/managers/${m.emp_code}/team`)}
                      title={`View team roster and daily attendance for ${m.name}`}
                    >
                      <Users size={14} />
                      <span>View Team</span>
                      <ChevronRight size={14} />
                    </button>

                    <button
                      type="button"
                      className="mgr-btn-secondary"
                      onClick={() => navigate(`/dashboard/employees/${m.emp_code}`)}
                      title={`View profile details for ${m.name}`}
                    >
                      <ExternalLink size={13} />
                      <span>Details</span>
                    </button>

                    <button
                      type="button"
                      className="mgr-btn-icon"
                      onClick={() => navigate(`/admin/employees/${m.emp_code}/attendance`)}
                      title={`Inspect individual attendance calendar for ${m.name}`}
                      aria-label="Attendance Calendar"
                    >
                      <Calendar size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ── DESKTOP TABLE VIEW (Optional Toggle on Desktop Screens) ── */}
        {!loading && !error && filteredManagers.length > 0 && viewMode === "table" && (
          <div className="mgr-table-wrapper">
            <table className="mgr-table">
              <thead>
                <tr>
                  <th>Manager</th>
                  <th>Emp ID</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th style={{ textAlign: "center" }}>Team Size</th>
                  <th style={{ textAlign: "center" }}>Present</th>
                  <th style={{ textAlign: "center" }}>On Leave</th>
                  <th style={{ textAlign: "center" }}>Absent</th>
                  <th style={{ textAlign: "right", paddingRight: "20px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredManagers.map((m) => {
                  const dept = cleanDepartment(m.department);
                  const initials = getInitials(m.name);
                  return (
                    <tr key={m.id || m.emp_code}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div className="mgr-avatar" style={{ width: "36px", height: "36px", fontSize: "13px" }}>
                            {initials}
                          </div>
                          <div>
                            <strong style={{ display: "block", fontSize: "13.5px", color: "var(--mgr-text)" }}>
                              {m.name}
                            </strong>
                            <span style={{ fontSize: "11.5px", color: "var(--mgr-text-muted)" }}>
                              {m.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="mgr-code-badge">{m.emp_code}</span>
                      </td>
                      <td style={{ fontSize: "12.5px" }}>{m.designation || "Manager"}</td>
                      <td>
                        <span className="mgr-dept-badge">{dept}</span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "var(--mgr-purple)" }}>
                        {m.team_size || 0}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "8px", background: "rgba(34,197,94,0.1)", color: "#16a34a", fontWeight: 700, fontSize: "11.5px" }}>
                          {m.present_today || 0}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "8px", background: "rgba(168,85,247,0.1)", color: "#9333ea", fontWeight: 700, fontSize: "11.5px" }}>
                          {m.leave_today || 0}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", color: "#dc2626", fontWeight: 700, fontSize: "11.5px" }}>
                          {m.absent_today || 0}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "16px" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="mgr-btn-primary"
                            style={{ height: "32px", padding: "0 10px", fontSize: "12px", width: "auto" }}
                            onClick={() => navigate(`/admin/managers/${m.emp_code}/team`)}
                            title="View Team"
                          >
                            <Users size={13} />
                            <span>Team</span>
                          </button>
                          <button
                            type="button"
                            className="mgr-btn-secondary"
                            style={{ height: "32px", padding: "0 10px", fontSize: "12px", width: "auto" }}
                            onClick={() => navigate(`/dashboard/employees/${m.emp_code}`)}
                            title="View Profile Details"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
