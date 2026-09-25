import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  Clock,
  FileSpreadsheet,
  Eye,
  Mail,
  Phone,
  Briefcase
} from "lucide-react";

export default function AdminManagerTeamView() {
  const { managerId } = useParams();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState(null);
  const [viewMode, setViewMode] = useState("daily"); // "daily" | "monthly"
  const [monthlyGrid, setMonthlyGrid] = useState(null);

  const fetchTeamData = (dateStr) => {
    setLoading(true);
    fetch(`http://localhost:8000/admin/managers/${managerId}/team?date_str=${dateStr}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        "Content-Type": "application/json"
      }
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData && resData.status === "success") {
          setTeamData(resData);
        }
      })
      .catch((err) => console.warn("Failed to fetch manager team:", err))
      .finally(() => setLoading(false));
  };

  const fetchMonthlyGrid = () => {
    const d = new Date(currentDate);
    fetch(`http://localhost:8000/admin/managers/${managerId}/monthly-grid?year=${d.getFullYear()}&month=${d.getMonth() + 1}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        "Content-Type": "application/json"
      }
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData && resData.grid) {
          setMonthlyGrid(resData);
        }
      })
      .catch((err) => console.warn("Failed to fetch monthly grid:", err));
  };

  useEffect(() => {
    fetchTeamData(currentDate);
  }, [managerId, currentDate]);

  useEffect(() => {
    if (viewMode === "monthly") {
      fetchMonthlyGrid();
    }
  }, [viewMode, currentDate]);

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    setCurrentDate(new Date().toISOString().split("T")[0]);
  };

  const manager = teamData?.manager || {};
  const summary = teamData?.summary || { total: 0, present: 0, absent: 0, on_leave: 0, half_day: 0, missing_punch: 0 };
  const members = teamData?.members || [];

  const getStatusBadge = (status, code) => {
    if (code === "P" || status === "Present") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(34,197,94,0.12)", color: "#16a34a", fontWeight: 700, fontSize: "11px" }}>Present</span>;
    }
    if (code === "HD" || status === "Half Day") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(245,158,11,0.12)", color: "#d97706", fontWeight: 700, fontSize: "11px" }}>Half Day</span>;
    }
    if (code === "1H" || status === "First Half Leave") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(168,85,247,0.12)", color: "#9333ea", fontWeight: 700, fontSize: "11px" }}>1H Leave</span>;
    }
    if (code === "2H" || status === "Second Half Leave") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(168,85,247,0.12)", color: "#9333ea", fontWeight: 700, fontSize: "11px" }}>2H Leave</span>;
    }
    if (code === "L" || status.includes("Leave")) {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(124,58,237,0.12)", color: "#7c3aed", fontWeight: 700, fontSize: "11px" }}>Leave</span>;
    }
    if (code === "MP" || status === "Missing Punch") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(239,68,68,0.12)", color: "#dc2626", fontWeight: 700, fontSize: "11px" }}>Missing Punch</span>;
    }
    if (code === "WO" || status === "Week Off") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(100,116,139,0.12)", color: "#64748b", fontWeight: 700, fontSize: "11px" }}>Week Off</span>;
    }
    if (status === "Absent") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(239,68,68,0.12)", color: "#dc2626", fontWeight: 700, fontSize: "11px" }}>Absent</span>;
    }
    return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(100,116,139,0.1)", color: "#64748b", fontWeight: 600, fontSize: "11px" }}>{status || "—"}</span>;
  };

  return (
    <div className="dash-page-container">
      {/* Top Header & Back Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <button
          onClick={() => navigate("/admin/managers")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "9px",
            border: "1px solid var(--border, #e2e8f0)",
            background: "var(--surface, #ffffff)",
            color: "var(--text, #0f172a)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          <ArrowLeft size={16} /> Back to Managers
        </button>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setViewMode("daily")}
            style={{
              padding: "8px 16px",
              borderRadius: "9px",
              border: "none",
              background: viewMode === "daily" ? "#7c3aed" : "var(--surface-2, #f1f5f9)",
              color: viewMode === "daily" ? "#ffffff" : "var(--text, #0f172a)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Daily Team View
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            style={{
              padding: "8px 16px",
              borderRadius: "9px",
              border: "none",
              background: viewMode === "monthly" ? "#7c3aed" : "var(--surface-2, #f1f5f9)",
              color: viewMode === "monthly" ? "#ffffff" : "var(--text, #0f172a)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            View Monthly Attendance
          </button>
        </div>
      </div>

      {/* Manager Information Card */}
      <div className="card" style={{ padding: "20px 24px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(109,40,217,0.01) 100%)", border: "1px solid rgba(124,58,237,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#7c3aed", color: "#ffffff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "20px" }}>
            {manager.name ? manager.name.charAt(0).toUpperCase() : "M"}
          </div>

          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>{manager.name || "Manager"}</h2>
              <span style={{ padding: "3px 9px", borderRadius: "12px", background: "#7c3aed", color: "#ffffff", fontSize: "11px", fontWeight: 700 }}>
                {manager.emp_code}
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted, #64748b)" }}>
              {manager.designation} · {manager.department} Department
            </p>
          </div>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "12px" }}>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Email ID</span>
              <strong style={{ fontSize: "13px" }}>{manager.email}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Contact</span>
              <strong style={{ fontSize: "13px" }}>{manager.contact}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Team Size</span>
              <strong style={{ fontSize: "13px", color: "#7c3aed" }}>{manager.team_size} Members</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Date Navigation & Summary Cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted, #64748b)" }}>Attendance Date:</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface, #ffffff)", border: "1px solid var(--border, #e2e8f0)", padding: "4px 8px", borderRadius: "9px" }}>
            <button onClick={handlePrevDay} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #64748b)" }}>
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: "13px", fontWeight: 600, color: "var(--text, #0f172a)", background: "none" }}
            />
            <button onClick={handleNextDay} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #64748b)" }}>
              <ChevronRight size={16} />
            </button>
          </div>
          <button onClick={handleToday} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", background: "var(--surface, #ffffff)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            Today
          </button>
        </div>

        <strong style={{ fontSize: "14px", color: "#7c3aed" }}>
          {teamData?.date || ""}
        </strong>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", fontWeight: 600 }}>Total Team Members</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700 }}>{summary.total}</h3>
        </div>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Present Today</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700, color: "#16a34a" }}>{summary.present}</h3>
        </div>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 600 }}>Absent Today</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700, color: "#dc2626" }}>{summary.absent}</h3>
        </div>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "#9333ea", fontWeight: 600 }}>On Leave</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700, color: "#9333ea" }}>{summary.on_leave}</h3>
        </div>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>Half Day</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700, color: "#d97706" }}>{summary.half_day}</h3>
        </div>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "#e11d48", fontWeight: 600 }}>Missing Punch</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700, color: "#e11d48" }}>{summary.missing_punch}</h3>
        </div>
      </div>

      {/* Main Table Content */}
      {viewMode === "daily" ? (
        <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 700 }}>Team Member Attendance Roster</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #f8fafc)" }}>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Employee</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Employee Code</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Designation</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Contact</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Email</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Punch In</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Punch Out</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Working Hours</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Leave</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                      Loading team members...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                      No team members found for this manager.
                    </td>
                  </tr>
                ) : (
                  members.map((mem) => (
                    <tr key={mem.id || mem.emp_code} style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                      <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#6366f1", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "12px" }}>
                            {mem.name ? mem.name.charAt(0).toUpperCase() : "E"}
                          </div>
                          <strong style={{ fontSize: "13px" }}>{mem.name}</strong>
                        </div>
                      </td>
                      <td style={{ padding: "14px", fontSize: "12px", fontWeight: 600 }}>{mem.emp_code}</td>
                      <td style={{ padding: "14px", fontSize: "12px" }}>{mem.designation}</td>
                      <td style={{ padding: "14px", fontSize: "12px" }}>{mem.contact}</td>
                      <td style={{ padding: "14px", fontSize: "12px" }}>{mem.email}</td>
                      <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{mem.checkIn}</td>
                      <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{mem.checkOut}</td>
                      <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{mem.workingHours}</td>
                      <td style={{ padding: "14px", textAlign: "center" }}>{getStatusBadge(mem.status, mem.badge_code)}</td>
                      <td style={{ padding: "14px", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>{mem.leave_status}</td>
                      <td style={{ padding: "14px", textAlign: "right" }}>
                        <button
                          onClick={() => navigate(`/admin/employees/${mem.emp_code}/attendance`)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "7px",
                            background: "rgba(124,58,237,0.1)",
                            color: "#7c3aed",
                            border: "none",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          View Attendance
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Monthly Team Grid View */
        <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 700 }}>Monthly Team Attendance Matrix</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #f8fafc)" }}>
                  <th style={{ padding: "10px", textAlign: "left", minWidth: "160px", position: "sticky", left: 0, background: "var(--surface-2, #f8fafc)", zIndex: 3 }}>Employee</th>
                  {Array.from({ length: monthlyGrid?.days_in_month || 31 }, (_, i) => (
                    <th key={i + 1} style={{ padding: "8px 6px", textAlign: "center", minWidth: "30px" }}>{i + 1}</th>
                  ))}
                  <th style={{ padding: "10px", textAlign: "center", background: "#f0fdf4", color: "#16a34a" }}>P</th>
                  <th style={{ padding: "10px", textAlign: "center", background: "#fef2f2", color: "#dc2626" }}>A</th>
                  <th style={{ padding: "10px", textAlign: "center", background: "#faf5ff", color: "#9333ea" }}>L</th>
                  <th style={{ padding: "10px", textAlign: "center", background: "#fffbeb", color: "#d97706" }}>HD</th>
                </tr>
              </thead>
              <tbody>
                {!monthlyGrid || !monthlyGrid.grid ? (
                  <tr><td colSpan={36} style={{ padding: "24px", textAlign: "center" }}>Loading monthly grid...</td></tr>
                ) : (
                  monthlyGrid.grid.map((row) => (
                    <tr key={row.emp_code} style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                      <td style={{ padding: "10px", fontWeight: 600, position: "sticky", left: 0, background: "var(--surface, #ffffff)", zIndex: 2 }}>
                        {row.name}
                        <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted, #64748b)" }}>{row.emp_code}</span>
                      </td>
                      {Array.from({ length: monthlyGrid.days_in_month }, (_, i) => {
                        const code = row.daily[String(i + 1)] || "—";
                        let bg = "#f8fafc";
                        let color = "#64748b";
                        if (code === "P") { bg = "#dcfce7"; color = "#15803d"; }
                        else if (code === "A") { bg = "#fee2e2"; color = "#b91c1c"; }
                        else if (code === "HD") { bg = "#fef3c7"; color = "#b45309"; }
                        else if (code === "L" || code === "1H" || code === "2H") { bg = "#f3e8ff"; color = "#7e22ce"; }
                        else if (code === "WO" || code === "H") { bg = "#f1f5f9"; color = "#475569"; }
                        return (
                          <td key={i + 1} style={{ padding: "4px 2px", textAlign: "center" }}>
                            <span style={{ display: "inline-block", width: "24px", height: "24px", lineHeight: "24px", borderRadius: "4px", background: bg, color: color, fontWeight: 700, fontSize: "10px" }}>
                              {code}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#16a34a" }}>{row.totals.present}</td>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#dc2626" }}>{row.totals.absent}</td>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#9333ea" }}>{row.totals.leave}</td>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#d97706" }}>{row.totals.half_day}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
