import React, { useState, useEffect, useCallback } from "react";
import { Download, Search, RotateCw, X, Clock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
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

/* ─── Badge config ───────────────────────────────────────────────────────── */
const BADGE_CONFIG = {
  P:   { label: "P",   title: "Present",     color: "#059669", bg: "#D1FAE5" },
  HD2: { label: "HD",  title: "Half Day",    color: "#D97706", bg: "#FEF3C7" },
  A:   { label: "A",   title: "Absent",      color: "#DC2626", bg: "#FEE2E2" },
  LV:  { label: "LV",  title: "Leave",       color: "#7C3AED", bg: "#EDE9FE" },
  HD:  { label: "HD",  title: "Holiday",     color: "#0891B2", bg: "#CFFAFE" },
  WO:  { label: "WO",  title: "Week Off",    color: "#6B7280", bg: "#F3F4F6" },
  IP:  { label: "•",   title: "In Progress", color: "#D97706", bg: "#FEF3C7" },
  "—": { label: "—",  title: "Future / Off", color: "#9CA3AF", bg: "transparent" },
};

const getBadgeCfg = (badge) => BADGE_CONFIG[badge] || BADGE_CONFIG["—"];

/* ─── Cell popover ───────────────────────────────────────────────────────── */
const CellPopover = ({ day, emp, onClose }) => {
  if (!day) return null;
  const cfg = getBadgeCfg(day.badge);
  const checkIn = day.check_in || "—";
  const checkOut = day.check_out || "—";
  const wh = day.working_hours || "—";
  const dateStr = new Date(day.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.4)",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          padding: "20px 24px",
          minWidth: 280,
          maxWidth: 320,
          border: "1px solid #e5e7eb",
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
            <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>
              {dateStr}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {emp.name} · {emp.emp_code}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#9ca3af",
            }}
          >
            <X size={18} />
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
                background: "#f3e8ff",
                color: "#7e22ce",
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
            borderTop: "1px solid #f3f4f6",
            paddingTop: 12,
          }}
        >
          <div>
            <div style={{ color: "#9ca3af", marginBottom: 2 }}>Check In</div>
            <div style={{ fontWeight: 600, color: "#111827" }}>{checkIn}</div>
          </div>
          <div>
            <div style={{ color: "#9ca3af", marginBottom: 2 }}>Check Out</div>
            <div style={{ fontWeight: 600, color: "#111827" }}>{checkOut}</div>
          </div>
          <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Clock size={13} color="#9ca3af" />
            <span style={{ color: "#6b7280" }}>Working Hours:</span>
            <span style={{ fontWeight: 600, color: "#111827" }}>{wh}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
export const AttendanceRecords = () => {
  const [selectedOption, setSelectedOption] = useState(
    MONTH_OPTIONS[DEFAULT_OPTION_INDEX]
  );
  const [search, setSearch] = useState("");
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popover, setPopover] = useState(null);
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
      return [emp.name, emp.emp_code, emp.department, ...cells].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-matrix-${label.replace(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    managerToast.success(`Exported ${team.length} member records for ${label}`);
  };

  return (
    <div className="mp-attendance-records">
      {/* ─── Header & Top Controls ────────────────────────────────────── */}
      <div className="mp-records-header">
        <div className="mp-records-title-group">
          <h2 className="mp-records-title">Attendance Records Matrix</h2>
          <p className="mp-records-subtitle">
            Monthly attendance record grid with day-wise status indicators for team members.
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
              minWidth="170px"
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

      {/* ─── Status Legend ────────────────────────────────────────────── */}
      <div className="mp-records-legend-card">
        <div className="mp-records-legend-wrap">
          {[
            { badge: "P", label: "Present" },
            { badge: "HD2", label: "Half Day" },
            { badge: "A", label: "Absent" },
            { badge: "LV", label: "Leave" },
            { badge: "HD", label: "Holiday" },
            { badge: "WO", label: "Week Off" },
            { badge: "IP", label: "In Progress" },
          ].map(({ badge, label }) => {
            const cfg = getBadgeCfg(badge);
            return (
              <span key={badge} className="mp-records-legend-item">
                <span
                  className="mp-records-badge-tag"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
                {label}
              </span>
            );
          })}
        </div>
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
      </div>

      {/* ─── Error Message ────────────────────────────────────────────── */}
      {error && !loading && (
        <div
          style={{
            padding: "48px 20px",
            textAlign: "center",
            background: "#FFFFFF",
            border: "1px solid var(--mp-border, #E5E7EB)",
            borderRadius: 14,
          }}
        >
          <AlertCircle size={32} color="#ef4444" style={{ marginBottom: 12 }} />
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--mp-text-primary, #111827)",
              marginBottom: 6,
            }}
          >
            Unable to load team attendance.
          </div>
          <button
            onClick={() => fetchMatrix(selectedOption.month, selectedOption.year)}
            style={{
              marginTop: 8,
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
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
                      No team members found.
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
                                {emp.emp_code}
                              </span>
                            </div>
                          </div>
                        </td>
                        {days.map((d) => {
                          const dayData = emp.days?.find((dd) => dd.day === d);
                          const badge = dayData?.badge || "—";
                          const cfg = getBadgeCfg(badge);
                          return (
                            <td key={d}>
                              <button
                                type="button"
                                className="mp-records-badge-btn"
                                onClick={() => setPopover({ day: dayData, emp })}
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

      {/* ─── MOBILE VIEW: Employee Cards List ─────────────────────────── */}
      {!error && (
        <div className="mp-records-mobile-view">
          <div className="mp-records-mobile-cards-list">
            {loading ? (
              <div
                style={{
                  padding: 36,
                  textAlign: "center",
                  background: "#FFFFFF",
                  borderRadius: 14,
                  border: "1px solid var(--mp-border, #E5E7EB)",
                  color: "#6B7280",
                  fontSize: 14,
                }}
              >
                Loading attendance records...
              </div>
            ) : team.length === 0 ? (
              <div
                style={{
                  padding: 36,
                  textAlign: "center",
                  background: "#FFFFFF",
                  borderRadius: 14,
                  border: "1px solid var(--mp-border, #E5E7EB)",
                  color: "#6B7280",
                  fontSize: 14,
                }}
              >
                No team members found.
              </div>
            ) : (
              team.map((emp) => {
                const initials = getInitials(emp.name);
                return (
                  <div className="mp-records-emp-card" key={emp.emp_code}>
                    {/* Top Row: Avatar + Name + Code + Chevron */}
                    <div
                      className="mp-records-card-header"
                      onClick={() => {
                        const firstActiveDay = emp.days?.find((d) => d.badge && d.badge !== "—");
                        if (firstActiveDay) setPopover({ day: firstActiveDay, emp });
                      }}
                    >
                      <div className="mp-records-card-profile">
                        <div className="mp-records-avatar">{initials}</div>
                        <div className="mp-records-card-info">
                          <span className="mp-records-card-name">{emp.name}</span>
                          <span className="mp-records-card-code">{emp.emp_code}</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="mp-records-card-chevron" />
                    </div>

                    {/* Bottom Row: Days Track with day numbers & status badges */}
                    <div className="mp-records-card-days-track">
                      {days.map((d) => {
                        const dayData = emp.days?.find((dd) => dd.day === d);
                        const badge = dayData?.badge || "—";
                        const cfg = getBadgeCfg(badge);
                        return (
                          <div key={d} className="mp-records-card-day-cell">
                            <span className="mp-records-card-day-num">{d}</span>
                            <button
                              type="button"
                              className="mp-records-card-badge"
                              onClick={() => setPopover({ day: dayData, emp })}
                              style={{
                                background: cfg.bg,
                                color: cfg.color,
                                cursor: dayData ? "pointer" : "default",
                              }}
                              title={`${emp.name} - Day ${d}: ${cfg.title}`}
                            >
                              {cfg.label}
                            </button>
                          </div>
                        );
                      })}
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
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
};

export default AttendanceRecords;
