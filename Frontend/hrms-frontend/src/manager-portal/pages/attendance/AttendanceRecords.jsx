// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - ATTENDANCERECORDS.JSX
// Path: Frontend/hrms-frontend/src/manager-portal/pages/attendance/AttendanceRecords.jsx
// Purpose: Web portal page component managing 'AttendanceRecords' views, user interactions, and state.
// UI Components:
//   • <MONTH_OPTIONS />
//   • <DEFAULT_OPTION_INDEX />
//   • <BADGE_CONFIG />
//   • <CellPopover />
//   • <FullMonthModal />
//   • <AttendanceRecords />
//   • <PAGE_SIZE />
// Key Functions & Handlers:
//   • getInitials()
//   • generateMonthOptions()
//   • getBadgeCfg()
//   • resolveBadge()
//   • onSync()
//   • handleExport()
//   • handleNavigateTeam()
// ==============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Search,
  RotateCw,
  X,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
} from "lucide-react";
import { ManagerSelect } from "../../components/ManagerSelect";
import { managerToast } from "../../components/ManagerToast";
import { getAttendanceMatrix } from "../../services/managerApiService";
import "./AttendancePages.css";
import "./AttendanceRecords.css";

/* ─── Initials Avatar Helper ─────────────────────────────────────────────── */
const getInitials = (name) => {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

/* ─── Month helpers ──────────────────────────────────────────────────────── */
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 3; i >= -8; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();
const DEFAULT_OPTION_INDEX = Math.max(
  0,
  MONTH_OPTIONS.findIndex(
    (o) =>
      o.month === new Date().getMonth() + 1 &&
      o.year === new Date().getFullYear()
  )
);

/* ─── Badge Config & Status Colors ───────────────────────────────────────── */
const BADGE_CONFIG = {
  P:   { label: "P",   title: "Present",     color: "#059669", bg: "#DCFCE7" },
  HD:  { label: "HD",  title: "Half Day",    color: "#D97706", bg: "#FEF3C7" },
  HD2: { label: "HD",  title: "Half Day",    color: "#D97706", bg: "#FEF3C7" },
  A:   { label: "A",   title: "Absent",      color: "#DC2626", bg: "#FEE2E2" },
  LV:  { label: "LV",  title: "Leave",       color: "#7C3AED", bg: "#EDE9FE" },
  H:   { label: "H",   title: "Holiday",     color: "#0284C7", bg: "#E0F2FE" },
  WO:  { label: "WO",  title: "Week Off",    color: "#64748B", bg: "#F1F5F9" },
  IP:  { label: "•",   title: "In Progress", color: "#D97706", bg: "#FEF3C7" },
  "—": { label: "—",  title: "Future / Off", color: "#9CA3AF", bg: "transparent" },
};

const getBadgeCfg = (badge) => BADGE_CONFIG[badge] || BADGE_CONFIG["—"];

/** Resolves the accurate badge code and config based on status and badge string */
const resolveBadge = (day) => {
  if (!day) return { code: "—", cfg: BADGE_CONFIG["—"] };
  const rawStatus = (day.status || "").toLowerCase();
  const rawBadge = (day.badge || "—").toUpperCase();

  if (rawStatus.includes("holiday") || rawBadge === "H") {
    return { code: "H", cfg: BADGE_CONFIG.H };
  }
  if (rawStatus.includes("half") || rawBadge === "HD" || rawBadge === "HD2") {
    return { code: "HD", cfg: BADGE_CONFIG.HD };
  }
  if (rawStatus.includes("leave") || day.is_leave || rawBadge === "LV") {
    return { code: "LV", cfg: BADGE_CONFIG.LV };
  }
  if (rawStatus.includes("week") || rawBadge === "WO") {
    return { code: "WO", cfg: BADGE_CONFIG.WO };
  }
  if (rawStatus.includes("progress") || rawBadge === "IP") {
    return { code: "IP", cfg: BADGE_CONFIG.IP };
  }
  if (rawStatus.includes("present") || rawBadge === "P") {
    return { code: "P", cfg: BADGE_CONFIG.P };
  }
  if (rawStatus.includes("absent") || rawBadge === "A") {
    return { code: "A", cfg: BADGE_CONFIG.A };
  }
  return { code: rawBadge, cfg: getBadgeCfg(rawBadge) };
};

/* ─── Cell popover (Single Day Details) ─────────────────────────────────── */
const CellPopover = ({ day, emp, resolvedBadge, onClose }) => {
  if (!day) return null;
  const cfg = resolvedBadge ? resolvedBadge.cfg : resolveBadge(day).cfg;
  const checkIn = day.check_in || "—";
  const checkOut = day.check_out || "—";
  const wh = day.working_hours || "—";
  const dateStr = day.date
    ? new Date(day.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : `Day ${day.day}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.45)",
        padding: "16px",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          padding: "20px 22px",
          minWidth: 280,
          maxWidth: 320,
          border: "1px solid #E5E7EB",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: "#111827", fontSize: 14.5 }}>
              {dateStr}
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              {emp.name} · {emp.emp_code}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#F3F4F6",
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#6B7280",
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span
            style={{
              background: cfg.bg,
              color: cfg.color,
              padding: "4px 10px",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {cfg.label} · {cfg.title}
          </span>
          {day.is_leave && (
            <span
              style={{
                background: "#F3E8FF",
                color: "#7E22CE",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {day.leave_type || "Leave"}
            </span>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            fontSize: 12,
            borderTop: "1px solid #F3F4F6",
            paddingTop: 12,
          }}
        >
          <div>
            <div style={{ color: "#9CA3AF", marginBottom: 2 }}>Check In</div>
            <div style={{ fontWeight: 600, color: "#111827" }}>{checkIn}</div>
          </div>
          <div>
            <div style={{ color: "#9CA3AF", marginBottom: 2 }}>Check Out</div>
            <div style={{ fontWeight: 600, color: "#111827" }}>{checkOut}</div>
          </div>
          <div
            style={{
              gridColumn: "span 2",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            <Clock size={13} color="#9CA3AF" />
            <span style={{ color: "#6B7280" }}>Working Hours:</span>
            <span style={{ fontWeight: 600, color: "#111827" }}>{wh}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Full Month Attendance Modal (Option B Action) ──────────────────────── */
const FullMonthModal = ({ emp, monthOption, days, onClose, onNavigateTeam }) => {
  if (!emp) return null;
  const initials = getInitials(emp.name);

  // Compute stats and resolved items for all days
  const resolvedDays = days.map((d) => {
    const dayData = emp.days?.find((dd) => dd.day === d);
    const { code, cfg } = resolveBadge(dayData);
    const dateObj = new Date(monthOption.year, monthOption.month - 1, d);
    const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
    return {
      day: d,
      weekday,
      dateStr: dateObj.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      code,
      cfg,
      data: dayData,
    };
  });

  const presentCount = resolvedDays.filter(
    (d) => d.code === "P" || d.code === "IP"
  ).length;
  const halfDayCount = resolvedDays.filter((d) => d.code === "HD").length;
  const absentCount = resolvedDays.filter((d) => d.code === "A").length;
  const leaveCount = resolvedDays.filter((d) => d.code === "LV").length;

  return (
    <div className="mp-full-month-modal-backdrop" onClick={onClose}>
      <div
        className="mp-full-month-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mp-full-month-modal-header">
          <div className="mp-full-month-modal-profile">
            <div className="mp-records-avatar">{initials}</div>
            <div className="mp-full-month-info">
              <h3 className="mp-full-month-modal-name">{emp.name}</h3>
              <p className="mp-full-month-modal-meta">
                {emp.emp_code} • {emp.department || "Operations"} • {monthOption.label}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="mp-full-month-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Month Summary Pills */}
        <div className="mp-full-month-summary-row">
          <div className="mp-fm-stat-pill present">
            <span className="mp-fm-stat-dot" />
            <span>
              Present: <strong>{presentCount}</strong>
            </span>
          </div>
          <div className="mp-fm-stat-pill halfday">
            <span className="mp-fm-stat-dot" />
            <span>
              Half Day: <strong>{halfDayCount}</strong>
            </span>
          </div>
          <div className="mp-fm-stat-pill absent">
            <span className="mp-fm-stat-dot" />
            <span>
              Absent: <strong>{absentCount}</strong>
            </span>
          </div>
          <div className="mp-fm-stat-pill leave">
            <span className="mp-fm-stat-dot" />
            <span>
              Leave: <strong>{leaveCount}</strong>
            </span>
          </div>
        </div>

        {/* Day-by-Day Complete Attendance Scroll List */}
        <div className="mp-full-month-records-list">
          {resolvedDays.map((item) => {
            const checkIn = item.data?.check_in || "—";
            const checkOut = item.data?.check_out || "—";
            const wh = item.data?.working_hours || "—";

            return (
              <div key={item.day} className="mp-full-month-day-row">
                <div className="mp-fm-day-col">
                  <span className="mp-fm-day-num">{item.day}</span>
                  <span className="mp-fm-day-wk">{item.weekday}</span>
                </div>
                <div className="mp-fm-status-col">
                  <span
                    className="mp-records-card-badge"
                    style={{ background: item.cfg.bg, color: item.cfg.color }}
                  >
                    {item.cfg.label}
                  </span>
                  <span className="mp-fm-status-title">{item.cfg.title}</span>
                </div>
                <div className="mp-fm-timing-col">
                  <span>
                    In: <strong>{checkIn}</strong>
                  </span>
                  <span>
                    Out: <strong>{checkOut}</strong>
                  </span>
                </div>
                <div className="mp-fm-hours-col">
                  <span>{wh}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer with Direct Route Link & Dismiss */}
        <div className="mp-full-month-modal-footer">
          <button
            type="button"
            className="mp-fm-profile-btn"
            onClick={() => {
              onClose();
              onNavigateTeam(emp.emp_code);
            }}
          >
            <User size={14} /> View Team Member Profile
          </button>
          <button type="button" className="mp-fm-close-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
export const AttendanceRecords = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState(
    MONTH_OPTIONS[DEFAULT_OPTION_INDEX]
  );
  const [search, setSearch] = useState("");
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popover, setPopover] = useState(null);
  const [fullMonthEmp, setFullMonthEmp] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 7;

  const fetchMatrix = useCallback(async (month, year) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAttendanceMatrix(month, year);
      setMatrixData(data);
    } catch (err) {
      console.error("Matrix fetch error:", err);
      setError("Unable to load team attendance data.");
      setMatrixData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrix(selectedOption.month, selectedOption.year);
    const onSync = () => fetchMatrix(selectedOption.month, selectedOption.year);
    window.addEventListener("focus", onSync);
    window.addEventListener("attendance-updated", onSync);
    return () => {
      window.removeEventListener("focus", onSync);
      window.removeEventListener("attendance-updated", onSync);
    };
  }, [selectedOption, fetchMatrix]);

  // Reset page when search or month changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedOption]);

  const team = (matrixData?.team || []).filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.emp_code || "").toLowerCase().includes(q)
    );
  });

  const daysInMonth =
    matrixData?.days_in_month ||
    new Date(selectedOption.year, selectedOption.month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Pagination for desktop
  const totalPages = Math.max(1, Math.ceil(team.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTeam = team.slice(startIndex, startIndex + PAGE_SIZE);

  const handleExport = () => {
    if (!matrixData || !team.length) {
      managerToast.info("No data to export.");
      return;
    }
    const label = selectedOption.label;
    const header = [
      "Employee",
      "Code",
      "Department",
      ...days.map((d) => String(d)),
    ].join(",");
    const rows = team.map((emp) => {
      const cells = days.map((d) => {
        const dayData = emp.days?.find((dd) => dd.day === d);
        return dayData ? (dayData.badge === "—" ? "" : dayData.badge) : "";
      });
      return [emp.name, emp.emp_code, emp.department || "Operations", ...cells].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-matrix-${label.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    managerToast.success(`Exported ${team.length} member records for ${label}`);
  };

  const handleNavigateTeam = (empCode) => {
    navigate(`/manager/team/${empCode}`);
  };

  return (
    <div className="mp-attendance-records">
      {/* ─── Header & Top Controls ────────────────────────────────────── */}
      <div className="mp-records-header">
        <div className="mp-records-title-group">
          <h2 className="mp-records-title">Attendance Records Matrix</h2>
          <p className="mp-records-subtitle">
            Review daily status by employee
          </p>
        </div>

        <div className="mp-records-header-right">
          <div className="mp-records-controls-row">
            <ManagerSelect
              value={selectedOption.label}
              onChange={(val) => {
                const opt = MONTH_OPTIONS.find((o) => o.label === val);
                if (opt) setSelectedOption(opt);
              }}
              options={MONTH_OPTIONS.map((o) => o.label)}
              icon={Calendar}
              minWidth="175px"
            />
            <button
              type="button"
              className="mp-records-refresh-btn"
              onClick={() => fetchMatrix(selectedOption.month, selectedOption.year)}
              title="Refresh attendance matrix"
              aria-label="Refresh attendance matrix"
            >
              <RotateCw size={15} />
            </button>
          </div>
          <button
            type="button"
            className="mp-records-export-btn"
            onClick={handleExport}
            disabled={loading || !team.length}
          >
            <Download size={15} /> Export Matrix
          </button>
        </div>
      </div>

      {/* ─── Status Legend (Option B Layout) ─────────────────────────── */}
      <div className="mp-records-legend-card">
        <div className="mp-records-legend-content">
          <div className="mp-records-legend-row">
            <span className="mp-records-legend-item">
              <span
                className="mp-records-badge-tag"
                style={{ background: BADGE_CONFIG.P.bg, color: BADGE_CONFIG.P.color }}
              >
                P
              </span>
              Present
            </span>
            <span className="mp-records-legend-item">
              <span
                className="mp-records-badge-tag"
                style={{ background: BADGE_CONFIG.HD.bg, color: BADGE_CONFIG.HD.color }}
              >
                HD
              </span>
              Half Day
            </span>
            <span className="mp-records-legend-item">
              <span
                className="mp-records-badge-tag"
                style={{ background: BADGE_CONFIG.A.bg, color: BADGE_CONFIG.A.color }}
              >
                A
              </span>
              Absent
            </span>
            <span className="mp-records-legend-item">
              <span
                className="mp-records-badge-tag"
                style={{ background: BADGE_CONFIG.LV.bg, color: BADGE_CONFIG.LV.color }}
              >
                LV
              </span>
              Leave
            </span>
          </div>
          <div className="mp-records-legend-row">
            <span className="mp-records-legend-item">
              <span
                className="mp-records-badge-tag"
                style={{ background: BADGE_CONFIG.H.bg, color: BADGE_CONFIG.H.color }}
              >
                H
              </span>
              Holiday
            </span>
            <span className="mp-records-legend-item">
              <span
                className="mp-records-badge-tag"
                style={{ background: BADGE_CONFIG.WO.bg, color: BADGE_CONFIG.WO.color }}
              >
                WO
              </span>
              Week Off
            </span>
            <span className="mp-records-legend-item">
              <span className="mp-records-legend-dot" />
              In Progress
            </span>
          </div>
        </div>
        <ChevronRight size={16} className="mp-records-legend-chevron" />
      </div>

      {/* ─── Search Bar ───────────────────────────────────────────────── */}
      <div className="mp-records-search-card">
        <Search size={16} className="mp-records-search-icon" />
        <input
          type="text"
          className="mp-records-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search member by name or code..."
        />
        {search && (
          <button
            type="button"
            className="mp-records-search-clear"
            onClick={() => setSearch("")}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ─── Error Message ────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="mp-records-error-card">
          <AlertCircle size={32} color="#EF4444" style={{ marginBottom: 10 }} />
          <div className="mp-records-error-title">
            Unable to load team attendance data
          </div>
          <p className="mp-records-error-desc">
            Please check network connectivity or refresh the page.
          </p>
          <button
            type="button"
            className="mp-records-retry-btn"
            onClick={() => fetchMatrix(selectedOption.month, selectedOption.year)}
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── DESKTOP VIEW: Matrix Table ───────────────────────────────── */}
      {!error && (
        <div className="mp-records-desktop-view">
          <div className="mp-records-matrix-scroll">
            <table className="mp-records-table">
              <thead>
                <tr>
                  <th className="emp-col">EMPLOYEE</th>
                  {days.map((d) => (
                    <th key={d}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={days.length + 1}
                      style={{
                        padding: 40,
                        textAlign: "center",
                        color: "#6B7280",
                        fontSize: 14,
                      }}
                    >
                      Loading attendance matrix...
                    </td>
                  </tr>
                ) : paginatedTeam.length === 0 ? (
                  <tr>
                    <td
                      colSpan={days.length + 1}
                      style={{
                        padding: 40,
                        textAlign: "center",
                        color: "#6B7280",
                        fontSize: 14,
                      }}
                    >
                      {search ? `No team members matching "${search}".` : "No team members found."}
                    </td>
                  </tr>
                ) : (
                  paginatedTeam.map((emp) => {
                    const initials = getInitials(emp.name);
                    return (
                      <tr key={emp.emp_code}>
                        <td className="emp-col">
                          <div className="mp-records-emp-wrap">
                            <div className="mp-records-avatar">{initials}</div>
                            <div className="mp-records-emp-info">
                              <span className="mp-records-emp-name">
                                {emp.name}
                              </span>
                              <span className="mp-records-emp-code">
                                {emp.emp_code} • {emp.department || "Operations"}
                              </span>
                            </div>
                          </div>
                        </td>
                        {days.map((d) => {
                          const dayData = emp.days?.find((dd) => dd.day === d);
                          const { code, cfg } = resolveBadge(dayData);
                          return (
                            <td key={d}>
                              <button
                                type="button"
                                className="mp-records-badge-btn"
                                onClick={() =>
                                  dayData &&
                                  setPopover({
                                    day: dayData,
                                    emp,
                                    resolvedBadge: { code, cfg },
                                  })
                                }
                                style={{
                                  background: cfg.bg,
                                  color: cfg.color,
                                  cursor: dayData ? "pointer" : "default",
                                }}
                                title={`${emp.name} - Day ${d}: ${cfg.title}`}
                              >
                                {cfg.label}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Desktop Pagination Footer */}
          {!loading && team.length > 0 && (
            <div className="mp-records-pagination-bar">
              <span className="mp-records-pagination-info">
                Showing {paginatedTeam.length} of {team.length} members
              </span>
              <div className="mp-records-pagination-controls">
                <button
                  type="button"
                  className="mp-pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`mp-pagination-btn ${currentPage === p ? "active" : ""}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className="mp-pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MOBILE VIEW: Employee Attendance Cards (Option B) ────────── */}
      {!error && (
        <div className="mp-records-mobile-view">
          <div className="mp-records-mobile-cards-list">
            {loading ? (
              <div className="mp-records-mobile-loading">
                <RotateCw size={22} className="mp-spin-icon" />
                <span>Loading team attendance records...</span>
              </div>
            ) : team.length === 0 ? (
              <div className="mp-records-mobile-empty">
                {search ? `No team members matching "${search}".` : "No team members found."}
              </div>
            ) : (
              team.map((emp) => {
                const initials = getInitials(emp.name);

                return (
                  <div className="mp-records-emp-card" key={emp.emp_code}>
                    {/* Top Row: Avatar + Name + Code/Dept + View Full Month Action */}
                    <div className="mp-records-card-header">
                      <div className="mp-records-card-profile">
                        <div className="mp-records-avatar">{initials}</div>
                        <div className="mp-records-card-info">
                          <span className="mp-records-card-name">{emp.name}</span>
                          <span className="mp-records-card-meta">
                            {emp.emp_code} • {emp.department || "Engineering"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mp-records-view-month-btn"
                        onClick={() => setFullMonthEmp(emp)}
                        title={`View ${emp.name}'s complete month`}
                      >
                        <span>View full month</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Bottom Row: Days Track with Date Num + Weekday + Color Badge */}
                    <div className="mp-records-card-days-track">
                      {days.map((d) => {
                        const dayData = emp.days?.find((dd) => dd.day === d);
                        const { code, cfg } = resolveBadge(dayData);
                        const dateObj = new Date(
                          selectedOption.year,
                          selectedOption.month - 1,
                          d
                        );
                        const weekday = dateObj.toLocaleDateString("en-US", {
                          weekday: "short",
                        });

                        return (
                          <div
                            key={d}
                            className="mp-records-card-day-cell"
                            onClick={() =>
                              dayData &&
                              setPopover({
                                day: dayData,
                                emp,
                                resolvedBadge: { code, cfg },
                              })
                            }
                            title={`${emp.name} - ${d} ${weekday}: ${cfg.title}`}
                          >
                            <span className="mp-records-day-num">{d}</span>
                            <span className="mp-records-day-name">{weekday}</span>
                            <div
                              className="mp-records-card-badge"
                              style={{
                                background: cfg.bg,
                                color: cfg.color,
                              }}
                            >
                              {cfg.label}
                            </div>
                          </div>
                        );
                      })}
                      {/* More Indicator Cell */}
                      <div
                        className="mp-records-more-cell"
                        onClick={() => setFullMonthEmp(emp)}
                        title="View all days in month"
                      >
                        <span className="mp-records-more-dots">···</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── Day Details Popover Modal ───────────────────────────────── */}
      {popover && (
        <CellPopover
          day={popover.day}
          emp={popover.emp}
          resolvedBadge={popover.resolvedBadge}
          onClose={() => setPopover(null)}
        />
      )}

      {/* ─── Full Month Attendance Modal ─────────────────────────────── */}
      {fullMonthEmp && (
        <FullMonthModal
          emp={fullMonthEmp}
          monthOption={selectedOption}
          days={days}
          onClose={() => setFullMonthEmp(null)}
          onNavigateTeam={handleNavigateTeam}
        />
      )}
    </div>
  );
};

export default AttendanceRecords;
