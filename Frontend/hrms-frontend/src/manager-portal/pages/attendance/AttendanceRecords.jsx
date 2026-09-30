import React, { useState, useEffect, useCallback } from "react";
import { Download, Search, RotateCw, X, Clock, AlertCircle } from "lucide-react";
import { ManagerSelect } from "../../components/ManagerSelect";
import { managerToast } from "../../components/ManagerToast";
import { getAttendanceMatrix } from "../../services/managerApiService";
import "./AttendancePages.css";

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
const DEFAULT_OPTION_INDEX = Math.max(0, MONTH_OPTIONS.findIndex((o) => o.month === (new Date().getMonth() + 1) && o.year === new Date().getFullYear()));

/* ─── Badge config ───────────────────────────────────────────────────────── */
const BADGE_CONFIG = {
  P:   { label: "P",   title: "Present",   color: "#059669", bg: "#d1fae5" },
  HD2: { label: "HD",  title: "Half Day",  color: "#d97706", bg: "#fef3c7" },
  A:   { label: "A",   title: "Absent",    color: "#dc2626", bg: "#fee2e2" },
  LV:  { label: "LV",  title: "Leave",     color: "#7c3aed", bg: "#ede9fe" },
  HD:  { label: "HD",  title: "Holiday",   color: "#0891b2", bg: "#cffafe" },
  WO:  { label: "WO",  title: "Week Off",  color: "#6b7280", bg: "#f3f4f6" },
  IP:  { label: "•",   title: "In Progress", color: "#f59e0b", bg: "#fef3c7" },
  "—": { label: "—",  title: "Future",    color: "#d1d5db", bg: "transparent" },
};

const getBadgeCfg = (badge) => BADGE_CONFIG[badge] || BADGE_CONFIG["—"];

/* ─── Cell popover ───────────────────────────────────────────────────────── */
const CellPopover = ({ day, emp, onClose }) => {
  if (!day) return null;
  const cfg = getBadgeCfg(day.badge);
  const checkIn = day.check_in || "—";
  const checkOut = day.check_out || "—";
  const wh = day.working_hours || "—";
  const dateStr = new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 14, boxShadow: "0 20px 50px rgba(0,0,0,0.18)", padding: "20px 24px",
          minWidth: 280, maxWidth: 320, border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>{dateStr}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{emp.name} · {emp.emp_code}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <span style={{
            display: "inline-block", padding: "4px 10px", borderRadius: 20,
            background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 12,
          }}>
            {cfg.title}
          </span>
        </div>

        {day.badge !== "—" && day.badge !== "WO" && day.badge !== "HD" && day.badge !== "LV" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={13} color="#059669" /> Check In
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{checkIn}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={13} color="#dc2626" /> Check Out
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{checkOut}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={13} color="#6b7280" /> Working Hours
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{wh}</span>
            </div>
          </div>
        )}
        {(day.badge === "WO" || day.badge === "HD" || day.badge === "LV") && (
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            {day.badge === "WO" ? "Weekly day off — no attendance expected." : day.badge === "HD" ? "Official company holiday." : "Employee is on approved leave."}
          </p>
        )}
        {day.badge === "A" && (
          <p style={{ fontSize: 13, color: "#6b7280", margin: "8px 0 0 0" }}>No attendance recorded for this day.</p>
        )}
      </div>
    </div>
  );
};

/* ─── Summary bar ────────────────────────────────────────────────────────── */
const SummaryBar = ({ team }) => {
  const totals = team.reduce(
    (acc, m) => ({
      present: acc.present + (m.present || 0),
      halfDay: acc.halfDay + (m.half_day || 0),
      absent: acc.absent + (m.absent || 0),
      leave: acc.leave + (m.leave || 0),
    }),
    { present: 0, halfDay: 0, absent: 0, leave: 0 }
  );

  return (
    <div style={{
      display: "flex", gap: 16, flexWrap: "wrap", padding: "12px 18px",
      background: "var(--mp-surface)", border: "1px solid var(--mp-border)", borderRadius: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mp-text-primary)" }}>{totals.present}</span>
        <span style={{ fontSize: 12, color: "var(--mp-text-muted)" }}>Present Days</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#d97706", display: "inline-block" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mp-text-primary)" }}>{totals.halfDay}</span>
        <span style={{ fontSize: 12, color: "var(--mp-text-muted)" }}>Half Days</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mp-text-primary)" }}>{totals.absent}</span>
        <span style={{ fontSize: 12, color: "var(--mp-text-muted)" }}>Absent Days</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mp-text-primary)" }}>{totals.leave}</span>
        <span style={{ fontSize: 12, color: "var(--mp-text-muted)" }}>Leave Days</span>
      </div>
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────────────────── */
export const AttendanceRecords = () => {
  const [selectedOption, setSelectedOption] = useState(MONTH_OPTIONS[DEFAULT_OPTION_INDEX]);
  const [search, setSearch] = useState("");
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popover, setPopover] = useState(null);

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

  const team = (matrixData?.team || []).filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.emp_code || "").toLowerCase().includes(q);
  });

  const daysInMonth = matrixData?.days_in_month || new Date(selectedOption.year, selectedOption.month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleExport = () => {
    if (!matrixData || !team.length) {
      managerToast.info("No data to export.");
      return;
    }
    const label = selectedOption.label;
    const header = ["Employee", "Code", "Department", ...days.map((d) => String(d))].join(",");
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
            Attendance Records Matrix
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
            Monthly attendance record grid with day-wise status indicators for team members.
          </p>
        </div>

        <div className="mp-toolbar">
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
            onClick={() => fetchMatrix(selectedOption.month, selectedOption.year)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px solid var(--mp-border)", borderRadius: 8, background: "var(--mp-surface)", cursor: "pointer", fontSize: 13, color: "var(--mp-text-muted)", fontWeight: 500 }}
            title="Refresh"
          >
            <RotateCw size={14} />
          </button>
          <button
            type="button"
            className="mp-btn-export"
            onClick={handleExport}
            disabled={loading || !team.length}
          >
            <Download size={15} /> Export Matrix
          </button>
        </div>
      </div>

      {/* Summary */}
      {!loading && !error && matrixData && team.length > 0 && (
        <SummaryBar team={team} />
      )}

      {/* Legend & Search */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "12px", padding: "12px 18px",
        background: "var(--mp-surface)", border: "1px solid var(--mp-border)", borderRadius: "12px",
      }}>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap", fontSize: "12px", fontWeight: 600 }}>
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
              <span key={badge} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 4, background: cfg.bg, color: cfg.color,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800,
                }}>
                  {cfg.label}
                </span>
                {label}
              </span>
            );
          })}
        </div>

        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member..."
            style={{
              padding: "6px 12px 6px 30px", border: "1px solid var(--mp-border)",
              borderRadius: "6px", background: "var(--mp-surface-subtle, #f8f7ff)",
              color: "var(--mp-text-primary)", fontSize: "13px", outline: "none", minWidth: 200,
            }}
          />
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--mp-text-muted)" }} />
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: "48px 20px", textAlign: "center", background: "var(--mp-surface)", border: "1px solid var(--mp-border)", borderRadius: 14 }}>
          <AlertCircle size={32} color="#ef4444" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--mp-text-primary)", marginBottom: 6 }}>Unable to load team attendance.</div>
          <button
            onClick={() => fetchMatrix(selectedOption.month, selectedOption.year)}
            style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--mp-primary, #7c3aed)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div style={{
          background: "var(--mp-surface)", border: "1px solid var(--mp-border)",
          borderRadius: 14, overflow: "hidden", boxShadow: "var(--mp-shadow-sm)",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "var(--mp-surface-subtle, #f8f7ff)", borderBottom: "1px solid var(--mp-border)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--mp-text-muted)", position: "sticky", left: 0, background: "var(--mp-surface-subtle, #f8f7ff)", zIndex: 2, minWidth: 160 }}>
                    Employee
                  </th>
                  {days.map((d) => (
                    <th key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--mp-text-muted)", minWidth: 28, width: 28 }}>
                      {d}
                    </th>
                  ))}
                  <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#059669", minWidth: 32 }}>P</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#dc2626", minWidth: 32 }}>A</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#7c3aed", minWidth: 32 }}>LV</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={days.length + 4} style={{ padding: 40, textAlign: "center", color: "var(--mp-text-muted)", fontSize: 14 }}>
                      Loading attendance matrix...
                    </td>
                  </tr>
                ) : team.length === 0 ? (
                  <tr>
                    <td colSpan={days.length + 4} style={{ padding: 40, textAlign: "center", color: "var(--mp-text-muted)", fontSize: 14 }}>
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  team.map((emp) => (
                    <tr key={emp.emp_code} style={{ borderBottom: "1px solid var(--mp-border)" }}>
                      <td style={{ padding: "10px 14px", position: "sticky", left: 0, background: "var(--mp-surface)", zIndex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--mp-text-primary)" }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: "var(--mp-text-muted)" }}>{emp.emp_code}</div>
                      </td>
                      {days.map((d) => {
                        const dayData = emp.days?.find((dd) => dd.day === d);
                        const badge = dayData?.badge || "—";
                        const cfg = getBadgeCfg(badge);
                        return (
                          <td key={d} style={{ padding: "4px 2px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => setPopover({ day: dayData, emp })}
                              style={{
                                width: 24, height: 24, borderRadius: 4,
                                background: cfg.bg, color: cfg.color,
                                border: "none", cursor: dayData ? "pointer" : "default",
                                fontSize: 10, fontWeight: 800,
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                padding: 0
                              }}
                              title={`${emp.name} - Day ${d}: ${cfg.title}`}
                            >
                              {cfg.label}
                            </button>
                          </td>
                        );
                      })}
                      <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "#059669" }}>{emp.present || 0}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "#dc2626" }}>{emp.absent || 0}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "#7c3aed" }}>{emp.leave || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Popover */}
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
