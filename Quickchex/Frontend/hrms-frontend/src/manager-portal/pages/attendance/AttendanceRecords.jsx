import React, { useState, useEffect, useCallback } from "react";
import { Download, Search, X, Clock } from "lucide-react";
import { ManagerSelect } from "../../components/ManagerSelect";
import { managerToast } from "../../components/ManagerToast";
import { getAttendanceMatrix } from "../../services/managerApiService";
import "./AttendancePages.css";

// Generate month options for last 12 months
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

/* ─── Cell Detail Popover (Preserves Interactive Logic) ─────────────────── */
const CellPopover = ({ day, emp, onClose }) => {
  if (!day) return null;
  const checkIn = day.check_in || "—";
  const checkOut = day.check_out || "—";
  const wh = day.working_hours || "—";
  const dateStr = day.date ? new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Attendance Details";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--mp-surface, #fff)",
          borderRadius: 14,
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          padding: "20px 24px",
          minWidth: 280,
          maxWidth: 320,
          border: "1px solid var(--mp-border, #e5e7eb)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: "var(--mp-text-primary, #111827)", fontSize: 14 }}>{dateStr}</div>
            <div style={{ fontSize: 12, color: "var(--mp-text-muted, #6b7280)", marginTop: 2 }}>{emp.name} · {emp.emp_code}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--mp-text-muted, #9ca3af)" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <span className={`mp-matrix-badge ${day.badge === "HD2" ? "L" : day.badge}`}>
            {day.badge}
          </span>
        </div>

        {day.badge !== "—" && day.badge !== "WO" && day.badge !== "HD" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span style={{ color: "var(--mp-text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={13} color="#059669" /> Check In
              </span>
              <strong style={{ color: "var(--mp-text-primary)" }}>{checkIn}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span style={{ color: "var(--mp-text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={13} color="#dc2626" /> Check Out
              </span>
              <strong style={{ color: "var(--mp-text-primary)" }}>{checkOut}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span style={{ color: "var(--mp-text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={13} color="#6b7280" /> Working Hours
              </span>
              <strong style={{ color: "var(--mp-text-primary)" }}>{wh}</strong>
            </div>
          </div>
        )}

        {(day.badge === "WO" || day.badge === "HD") && (
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)", margin: 0 }}>
            {day.badge === "WO" ? "Weekly off — no attendance required." : "Official company holiday."}
          </p>
        )}
      </div>
    </div>
  );
};

export const AttendanceRecords = () => {
  const [selectedOption, setSelectedOption] = useState(MONTH_OPTIONS[0]);
  const [search, setSearch] = useState("");
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [popover, setPopover] = useState(null);

  // Preserve existing live matrix data fetching logic
  const fetchMatrix = useCallback(async (month, year) => {
    setLoading(true);
    try {
      const data = await getAttendanceMatrix(month, year);
      setMatrixData(data);
    } catch (err) {
      console.error("Matrix fetch error:", err);
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
    const name = m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim();
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      (m.emp_code || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const daysInMonth = matrixData?.days_in_month || new Date(selectedOption.year, selectedOption.month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Preserve existing CSV Export logic
  const handleExport = () => {
    if (!matrixData || !team.length) {
      managerToast.info(`Exporting ${selectedOption.label} team attendance matrix...`, { title: "Exporting Data" });
      return;
    }
    const label = selectedOption.label;
    const header = ["Employee", "Code", "Department", ...days.map((d) => String(d))].join(",");
    const rows = team.map((emp) => {
      const cells = days.map((d) => {
        const dayData = emp.days?.find((dd) => dd.day === d);
        return dayData ? (dayData.badge === "—" ? "" : dayData.badge) : "";
      });
      return [emp.name, emp.emp_code, emp.department || "", ...cells].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-matrix-${label.replace(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    managerToast.info(`Exporting ${selectedOption.label} team attendance matrix...`, { title: "Exporting Data" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Top Header */}
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
            className="mp-btn-export"
            onClick={handleExport}
          >
            <Download size={15} /> Export Matrix
          </button>
        </div>
      </div>

      {/* Legend & Filter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "12px 18px",
          background: "var(--mp-surface)",
          border: "1px solid var(--mp-border)",
          borderRadius: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", fontSize: "12px", fontWeight: 600 }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="mp-matrix-badge P">P</span> Present
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="mp-matrix-badge L">L</span> Late
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="mp-matrix-badge A">A</span> Absent
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="mp-matrix-badge HD">HD</span> Holiday
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="mp-matrix-badge WO">WO</span> Week Off
          </span>
        </div>

        <div style={{ position: "relative", minWidth: "220px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member..."
            style={{
              width: "100%",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--mp-border)",
              background: "var(--mp-surface-subtle)",
              color: "var(--mp-text-primary)",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "14px" }}>
          Loading team members...
        </div>
      )}

      {/* Matrix Table */}
      {!loading && (
        <div className="mp-matrix-table-wrap">
          <table className="mp-matrix-table">
            <thead>
              <tr style={{ background: "var(--mp-surface-subtle)" }}>
                <th className="sticky-col">Employee Name</th>
                {days.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.length === 0 ? (
                <tr>
                  <td colSpan={days.length + 1} style={{ padding: "30px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "13px" }}>
                    No team members found.
                  </td>
                </tr>
              ) : (
                team.map((emp) => {
                  const name = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.emp_code;
                  return (
                    <tr key={emp.emp_code || emp.id}>
                      <td className="sticky-col">
                        <div style={{ fontWeight: 700, color: "var(--mp-text-primary)" }}>{name}</div>
                        <div style={{ fontSize: "11px", color: "var(--mp-text-muted)" }}>{emp.emp_code}</div>
                      </td>
                      {days.map((d) => {
                        const dayData = emp.days?.find((dd) => dd.day === d);
                        const rawBadge = dayData?.badge || "—";
                        
                        if (rawBadge === "—") {
                          return (
                            <td key={d}>
                              <span style={{ color: "var(--mp-text-muted)", fontSize: "11px" }}>—</span>
                            </td>
                          );
                        }

                        let badgeClass = rawBadge;
                        if (rawBadge === "HD2") badgeClass = "L";
                        if (rawBadge === "LV") badgeClass = "WO";

                        const isClickable = dayData && dayData.badge !== "—";

                        return (
                          <td
                            key={d}
                            style={{ cursor: isClickable ? "pointer" : "default" }}
                            onClick={() => isClickable && setPopover({ day: dayData, emp })}
                            title={dayData?.date ? `${name} — ${dayData.date}` : ""}
                          >
                            <span className={`mp-matrix-badge ${badgeClass}`}>{rawBadge === "HD2" ? "HD" : rawBadge}</span>
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
      )}

      {!loading && team.length > 0 && (
        <p style={{ fontSize: "12px", color: "var(--mp-text-muted)", textAlign: "center" }}>
          ℹ️ Day-wise attendance grid will populate once the historical records endpoint is available.
        </p>
      )}

      {/* Detail Popover */}
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
