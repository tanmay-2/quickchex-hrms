import React, { useState, useEffect, useCallback, useRef } from "react";
import { Download, Search, RotateCw, X, Clock, MapPin, AlertCircle } from "lucide-react";
import { ManagerSelect } from "../../components/ManagerSelect";
import { managerToast } from "../../components/ManagerToast";
import { getAttendanceMatrix } from "../../services/managerApiService";
import "./AttendancePages.css";

/* ─── Month helpers ──────────────────────────────────────────────────────── */
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

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
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>{dateStr}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{emp.name} · {emp.emp_code}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af" }}>
            <X size={16} />
          </button>
        </div>

        {/* Status badge */}
        <div style={{ marginBottom: 14 }}>
          <span style={{
            display: "inline-block", padding: "4px 10px", borderRadius: 20,
            background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 12,
          }}>
            {cfg.title}
          </span>
        </div>

        {/* Details */}
        {day.badge !== "—" && day.badge !== "WO" && day.badge !== "HD" && day.badge !== "LV" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PopRow label="Check In" value={checkIn} icon={<Clock size={13} color="#059669" />} />
            <PopRow label="Check Out" value={checkOut} icon={<Clock size={13} color="#dc2626" />} />
            <PopRow label="Working Hours" value={wh} icon={<Clock size={13} color="#6b7280" />} />
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

const PopRow = ({ label, value, icon }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 5 }}>
      {icon} {label}
    </span>
    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{value}</span>
  </div>
);

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
      <SumItem label="Present Days" value={totals.present} color="#059669" />
      <SumItem label="Half Days" value={totals.halfDay} color="#d97706" />
      <SumItem label="Absent Days" value={totals.absent} color="#dc2626" />
      <SumItem label="Leave Days" value={totals.leave} color="#7c3aed" />
    </div>
  );
};

const SumItem = ({ label, value, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mp-text-primary)" }}>{value}</span>
    <span style={{ fontSize: 12, color: "var(--mp-text-muted)" }}>{label}</span>
  </div>
);

/* ─── Main component ─────────────────────────────────────────────────────── */
export const AttendanceRecords = () => {
  const [selectedOption, setSelectedOption] = useState(MONTH_OPTIONS[0]);
  const [search, setSearch] = useState("");
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popover, setPopover] = useState(null); // { day, emp }

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

      {/* Loading skeleton */}
      {loading && (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: 14, background: "var(--mp-surface)", border: "1px solid var(--mp-border)", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 12 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: "var(--mp-border)", animation: `mp-pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
            ))}
          </div>
          Loading team attendance for {selectedOption.label}…
        </div>
      )}

      {/* Matrix Table */}
      {!loading && !error && (
        <div className="mp-matrix-table-wrap">
          <table className="mp-matrix-table">
            <thead>
              <tr style={{ background: "var(--mp-surface-subtle)" }}>
                <th className="sticky-col" style={{ minWidth: 180 }}>Employee Name</th>
                {days.map((d) => (
                  <th key={d} style={{ fontSize: 11, padding: "8px 4px", textAlign: "center" }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.length === 0 ? (
                <tr>
                  <td colSpan={days.length + 1} style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: 13 }}>
                    {search.trim() ? `No team members match "${search}".` : "No team members found."}
                  </td>
                </tr>
              ) : (
                team.map((emp) => (
                  <tr key={emp.emp_code}>
                    <td className="sticky-col">
                      <div style={{ fontWeight: 700, color: "var(--mp-text-primary)", fontSize: 13 }}>{emp.name}</div>
                      <div style={{ fontSize: 11, color: "var(--mp-text-muted)" }}>{emp.emp_code}</div>
                      <div style={{ fontSize: 10.5, color: "var(--mp-text-muted)", marginTop: 1 }}>{emp.department}</div>
                    </td>
                    {(emp.days || []).map((dayData) => {
                      const cfg = getBadgeCfg(dayData.badge);
                      return (
                        <td
                          key={dayData.day}
                          style={{ padding: "4px", textAlign: "center", cursor: dayData.badge !== "—" ? "pointer" : "default" }}
                          title={`${emp.name} — ${dayData.date} — ${cfg.title}`}
                          onClick={() => dayData.badge !== "—" && setPopover({ day: dayData, emp })}
                        >
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 24, height: 24, borderRadius: 5, fontSize: 9.5, fontWeight: 800,
                            background: cfg.bg, color: cfg.color,
                            border: `1px solid ${cfg.color}22`,
                            transition: "transform 0.1s",
                          }}
                            onMouseEnter={(e) => { if (dayData.badge !== "—") e.currentTarget.style.transform = "scale(1.2)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                          >
                            {cfg.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cell Popover */}
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
