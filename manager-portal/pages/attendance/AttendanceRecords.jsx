import React, { useState, useEffect, useCallback } from "react";
import { Download, Search } from "lucide-react";
import { ManagerBadge } from "../../components/ManagerBadge";
import { ManagerSelect } from "../../components/ManagerSelect";
import { managerToast } from "../../components/ManagerToast";
import { getTeam, getTodayAttendance } from "../../services/managerApiService";
import "./AttendancePages.css";

// Generate month options for last 6 months
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(
      d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    );
  }
  return options;
};

const MONTHS = generateMonthOptions();

export const AttendanceRecords = () => {
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [todayMap, setTodayMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const [teamRes, attRes] = await Promise.allSettled([
        getTeam(),
        getTodayAttendance(),
      ]);
      setMembers(teamRes.status === "fulfilled" && Array.isArray(teamRes.value) ? teamRes.value : []);
      if (attRes.status === "fulfilled" && Array.isArray(attRes.value)) {
        const map = {};
        attRes.value.forEach((a) => { map[a.emp_code] = a; });
        setTodayMap(map);
      }
    } catch (err) {
      console.error("Failed to fetch team for records:", err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  // Build 31-day column headers for the selected month
  const [year, month] = (() => {
    const d = new Date(selectedMonth);
    return [d.getFullYear(), d.getMonth()];
  })();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredMembers = members.filter(
    (m) => {
      const name = m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim();
      return (
        name.toLowerCase().includes(search.toLowerCase()) ||
        (m.emp_code || "").toLowerCase().includes(search.toLowerCase())
      );
    }
  );

  const handleExport = () => {
    managerToast.info(`Exporting ${selectedMonth} team attendance matrix...`, { title: "Exporting Data" });
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
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={MONTHS}
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
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: "12px", padding: "12px 18px",
          background: "var(--mp-surface)", border: "1px solid var(--mp-border)", borderRadius: "12px",
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
              width: "100%", padding: "6px 12px", borderRadius: "6px",
              border: "1px solid var(--mp-border)", background: "var(--mp-surface-subtle)",
              color: "var(--mp-text-primary)", fontSize: "13px", outline: "none",
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
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={days.length + 1} style={{ padding: "30px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "13px" }}>
                    No team members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((emp) => {
                  const name = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.emp_code;
                  return (
                    <tr key={emp.emp_code || emp.id}>
                      <td className="sticky-col">
                        <div style={{ fontWeight: 700, color: "var(--mp-text-primary)" }}>{name}</div>
                        <div style={{ fontSize: "11px", color: "var(--mp-text-muted)" }}>{emp.emp_code}</div>
                      </td>
                      {days.map((d) => {
                        const dow = new Date(year, month, d).getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        const isToday =
                          d === new Date().getDate() &&
                          month === new Date().getMonth() &&
                          year === new Date().getFullYear();

                        if (isWeekend) {
                          return (
                            <td key={d}>
                              <span className="mp-matrix-badge WO">WO</span>
                            </td>
                          );
                        }

                        if (isToday) {
                          const todayRec = todayMap[emp.emp_code] || {};
                          const raw = (todayRec.status || "").toLowerCase();
                          let badge = "P";
                          if (raw.includes("late") || todayRec.remark === "Late") badge = "L";
                          else if (raw.includes("absent")) badge = "A";
                          else if (raw.includes("present")) badge = "P";
                          else badge = "P";

                          return (
                            <td key={d}>
                              <span className={`mp-matrix-badge ${badge}`}>{badge}</span>
                            </td>
                          );
                        }

                        return (
                          <td key={d}>
                            <span style={{ color: "var(--mp-text-muted)", fontSize: "11px" }}>—</span>
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

      {!loading && filteredMembers.length > 0 && (
        <p style={{ fontSize: "12px", color: "var(--mp-text-muted)", textAlign: "center" }}>
          ℹ️ Day-wise attendance grid will populate once the historical records endpoint is available.
        </p>
      )}
    </div>
  );
};
