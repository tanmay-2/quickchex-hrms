import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  CalendarDays,
  FileCheck2,
  ArrowRight,
  TrendingUp,
  LogIn,
  ChevronRight,
  UserX,
  Target,
  Sparkles,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from "recharts";
import { ManagerModal } from "../../components/ManagerModal";
import { useManagerAuth } from "../../auth/ManagerAuthContext";
import { managerToast } from "../../components/ManagerToast";

import {
  getDashboardStats,
  getTodayAttendance,
  getTeam,
  getRegularizationRequests,
  approveRegularization,
  rejectRegularization,
  getTeamLeaves,
  approveLeave,
  rejectLeave,
} from "../../services/managerApiService";
import "./ManagerDashboard.css";

const PIE_COLORS = {
  Present: "#059669",
  "Half Day": "#D97706",
  "On Leave": "#0284C7",
  Absent: "#DC2626",
  Late: "#F59E0B",
};

export const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { manager } = useManagerAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [dashStats, setDashStats] = useState(null);
  const [todayPunches, setTodayPunches] = useState([]);
  const [teamMap, setTeamMap] = useState({});          // emp_code → member info
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const empCode = manager?.id || manager?.emp_code || localStorage.getItem("emp_code") || "MGR001";
    try {
      const [stats, punches, team, regs, leaves] = await Promise.allSettled([
        getDashboardStats(),
        getTodayAttendance(),
        getTeam(),
        getRegularizationRequests(),
        getTeamLeaves(empCode),
      ]);

      if (stats.status === "fulfilled") setDashStats(stats.value);

      if (punches.status === "fulfilled") {
        setTodayPunches(Array.isArray(punches.value) ? punches.value : []);
      }

      if (team.status === "fulfilled" && Array.isArray(team.value)) {
        const map = {};
        team.value.forEach((m) => { map[m.emp_code] = m; });
        setTeamMap(map);
      }

      const pendingList = [];

      if (regs.status === "fulfilled" && Array.isArray(regs.value)) {
        const pendingRegs = regs.value
          .filter((r) => {
            const s = String(r.status || r.overall_status || "").toUpperCase();
            const m = String(r.manager_status || "").toUpperCase();
            if (s === "APPROVED" || s === "COMPLETED" || s === "PENDING_ADMIN" || m === "APPROVED") return false;
            if (s === "REJECTED" || m === "REJECTED") return false;
            return s === "PENDING_MANAGER" || s === "PENDING";
          })
          .map((r, i) => ({
            id: r.id,
            name: r.employee_name || r.name || r.emp_code,
            type: "Regularization Request",
            date: r.target_date || r.date || "Today",
            details: r.comment || r.reason || "Attendance Regularization",
            isNew: i === 0
          }));
        pendingList.push(...pendingRegs);
      }

      if (leaves.status === "fulfilled" && Array.isArray(leaves.value)) {
        const pendingLeaves = leaves.value
          .filter((l) => {
            const s = String(l.overall_status || l.status || "").toUpperCase();
            const m = String(l.manager_status || "").toUpperCase();
            if (s === "APPROVED" || s === "PENDING_ADMIN" || m === "APPROVED") return false;
            if (s === "REJECTED" || m === "REJECTED") return false;
            return s === "PENDING_MANAGER" || s === "PENDING";
          })
          .map((l, i) => ({
            id: l.id,
            name: l.employee_name || l.emp_code,
            type: "Leave Request",
            date: l.start_date || l.from || "Today",
            details: `${l.leave_type || "Leave"} - ${l.reason || ""}`,
            isNew: i === 0 && pendingList.length === 0
          }));
        pendingList.push(...pendingLeaves);
      }

      setApprovals(pendingList);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 6000);
    const handleSync = () => fetchData(true);
    window.addEventListener("focus", handleSync);
    window.addEventListener("attendance-updated", handleSync);
    window.addEventListener("punch-updated", handleSync);
    window.addEventListener("regularization-updated", handleSync);
    window.addEventListener("leave-applied", handleSync);
    window.addEventListener("leave-balance-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("attendance-updated", handleSync);
      window.removeEventListener("punch-updated", handleSync);
      window.removeEventListener("regularization-updated", handleSync);
      window.removeEventListener("leave-applied", handleSync);
      window.removeEventListener("leave-balance-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [fetchData]);

  // ── Approve / Reject ───────────────────────────────────────────────────────
  const handleApprove = async (apr) => {
    const id = typeof apr === "object" ? apr.id : apr;
    const isLeave = (apr.type || "").toLowerCase().includes("leave");
    const itemType = isLeave ? "Leave" : "Regularization";
    setIsApproving(true);
    setApprovals((prev) => prev.filter((item) => item.id !== id));
    try {
      if (isLeave) {
        await approveLeave(id);
        window.dispatchEvent(new CustomEvent("leave-applied"));
        window.dispatchEvent(new CustomEvent("leave-balance-updated"));
      } else {
        await approveRegularization(id);
        window.dispatchEvent(new CustomEvent("regularization-updated"));
      }
      window.dispatchEvent(new CustomEvent("attendance-updated"));
      try {
        localStorage.setItem("hrms_last_event", JSON.stringify({
          type: isLeave ? "leave-updated" : "regularization-updated",
          id,
          timestamp: Date.now()
        }));
      } catch (e) {}
      managerToast.success(`${itemType} approved successfully and synchronized.`, { title: `${itemType} Approved` });
      fetchData(true);
    } catch (err) {
      fetchData(true);
      managerToast.error("Failed to approve: " + err.message, { title: "Error" });
    } finally {
      setIsApproving(false);
      setActiveModal(null);
    }
  };

  const handleReject = async (apr) => {
    if (!rejectRemarks.trim()) {
      managerToast.error("Please provide rejection remarks.", { title: "Remarks Required" });
      return;
    }
    const id = typeof apr === "object" ? apr.id : apr;
    const isLeave = (apr.type || "").toLowerCase().includes("leave");
    const itemType = isLeave ? "Leave" : "Regularization";
    const remarks = rejectRemarks.trim();
    setApprovals((prev) => prev.filter((item) => item.id !== id));
    try {
      if (isLeave) {
        await rejectLeave(id, remarks);
        window.dispatchEvent(new CustomEvent("leave-applied"));
        window.dispatchEvent(new CustomEvent("leave-balance-updated"));
      } else {
        await rejectRegularization(id, remarks);
        window.dispatchEvent(new CustomEvent("regularization-updated"));
      }
      window.dispatchEvent(new CustomEvent("attendance-updated"));
      try {
        localStorage.setItem("hrms_last_event", JSON.stringify({
          type: isLeave ? "leave-updated" : "regularization-updated",
          id,
          timestamp: Date.now()
        }));
      } catch (e) {}
      managerToast.info(`${itemType} request rejected.`, { title: `${itemType} Rejected` });
      fetchData(true);
    } catch (err) {
      fetchData(true);
      managerToast.error("Failed to reject: " + err.message, { title: "Error" });
    } finally {
      setActiveModal(null);
      setRejectRemarks("");
    }
  };

  // ── Derived data for cards & charts ───────────────────────────────────────
  const statusCounts = todayPunches.reduce((acc, p) => {
    const s = p.status || "Absent";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
    color: PIE_COLORS[name] || "#8B5CF6",
  }));

  const totalTeam = dashStats?.team_size || Object.keys(teamMap).length || 0;
  const presentCount = dashStats?.present_today ?? statusCounts["Present"] ?? 0;
  const lateCount = statusCounts["Late"] || 0;
  const leaveCount = dashStats?.leave_today ?? statusCounts["On Leave"] ?? 0;
  const absentCount = dashStats?.absent_today ?? statusCounts["Absent"] ?? 0;

  // Recent punches for live monitor
  const recentPunches = todayPunches.slice(0, 5).map((p) => {
    const member = teamMap[p.emp_code] || {};
    return {
      id: p.emp_code,
      name: member.name || p.name || p.emp_code,
      dept: member.department || "Engineering",
      time: p.checkIn || p.punch_in || "—",
      status: p.remark || p.status || "On Time",
    };
  });

  // Team Attendance Today List (combining teamMap and todayPunches)
  const teamAttendanceList = useMemo(() => {
    if (dashStats?.team_overview && Array.isArray(dashStats.team_overview) && dashStats.team_overview.length > 0) {
      return dashStats.team_overview;
    }

    const punchMap = {};
    todayPunches.forEach((p) => {
      if (p.emp_code) punchMap[p.emp_code] = p;
    });

    const members = Object.values(teamMap);
    if (members.length > 0) {
      return members.map((m) => {
        const punch = punchMap[m.emp_code] || {};
        const st = punch.status || "Not started";
        return {
          id: m.emp_code || m.id,
          emp_code: m.emp_code,
          name: m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.emp_code,
          designation: m.designation,
          department: m.department,
          status: st,
          check_in: punch.checkIn || punch.punch_in || "—",
          check_out: punch.checkOut || punch.punch_out || "—"
        };
      });
    }

    if (todayPunches.length > 0) {
      return todayPunches.map((p) => ({
        id: p.emp_code,
        emp_code: p.emp_code,
        name: p.name || p.employee_name || p.emp_code,
        status: p.status || "Present",
        check_in: p.checkIn || p.punch_in || "—",
        check_out: p.checkOut || p.punch_out || "—"
      }));
    }

    return [];
  }, [dashStats, teamMap, todayPunches]);

  // Formatted date info
  const todayDate = new Date();
  const dayName = todayDate.toLocaleDateString("en-US", { weekday: "long" });
  const dateFormatted = todayDate.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

  const renderAttendanceStatusPill = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("present") || s.includes("punched in") || s.includes("in progress")) {
      return <span className="mp-team-status-pill present"><span className="dot" /> Present</span>;
    }
    if (s.includes("late")) {
      return <span className="mp-team-status-pill late"><span className="dot" /> Late</span>;
    }
    if (s.includes("half")) {
      return <span className="mp-team-status-pill halfday"><span className="dot" /> Half Day</span>;
    }
    if (s.includes("leave")) {
      return <span className="mp-team-status-pill leave"><span className="dot" /> On Leave</span>;
    }
    if (s.includes("absent")) {
      return <span className="mp-team-status-pill absent"><span className="dot" /> Absent</span>;
    }
    return <span className="mp-team-status-pill notstarted"><span className="dot" /> Not started</span>;
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
        Loading Manager Dashboard...
      </div>
    );
  }

  return (
    <div className="mp-dashboard-container-b">

      {/* ── 1. PURPLE WELCOME CARD WITH QUICK ACTIONS ─────────────────────── */}
      <div className="mp-welcome-card-b">
        <div className="mp-welcome-top-row">
          <div className="mp-welcome-text-col">
            <h1 className="mp-welcome-title">
              Welcome back, {manager?.name || "Manager"} 👋
            </h1>
            <p className="mp-welcome-subtitle">
              Manage your team attendance and approvals efficiently.
            </p>
          </div>

          <div className="mp-welcome-date-box">
            <Calendar size={18} />
            <div className="mp-welcome-date-text">
              <span className="mp-welcome-date-day">{dayName}</span>
              <span className="mp-welcome-date-num">{dateFormatted}</span>
            </div>
          </div>
        </div>

        {/* Two Prominent Quick Action Buttons */}
        <div className="mp-welcome-actions-row">
          <button
            type="button"
            className="mp-welcome-btn"
            onClick={() => navigate("/manager/attendance/live")}
          >
            <div className="mp-welcome-btn-left">
              <Users size={17} color="#4c1d95" />
              <span>Team Attendance</span>
            </div>
            <ChevronRight size={17} color="#4c1d95" />
          </button>

          <button
            type="button"
            className="mp-welcome-btn"
            onClick={() => navigate("/manager/approvals/regularization")}
          >
            <div className="mp-welcome-btn-left">
              <FileCheck2 size={17} color="#4c1d95" />
              <span>Review Approvals</span>
              {approvals.length > 0 && (
                <span className="mp-welcome-btn-badge">{approvals.length}</span>
              )}
            </div>
            <ChevronRight size={17} color="#4c1d95" />
          </button>
        </div>
      </div>

      {/* ── 2. COMPACT ATTENDANCE SUMMARY CARDS ───────────────────────────── */}
      <div className="mp-summary-grid-b">
        {/* Present Today */}
        <div
          className="mp-summary-card-b"
          onClick={() => navigate("/manager/attendance/live")}
        >
          <div className="mp-summary-card-top">
            <div className="mp-summary-icon-box green">
              <Users size={18} />
            </div>
            <div className="mp-summary-indicator green" />
          </div>
          <span className="mp-summary-label">Present Today</span>
          <div className="mp-summary-val">{presentCount} / {totalTeam}</div>
        </div>

        {/* Absent Today */}
        <div
          className="mp-summary-card-b"
          onClick={() => navigate("/manager/attendance/live")}
        >
          <div className="mp-summary-card-top">
            <div className="mp-summary-icon-box red">
              <UserX size={18} />
            </div>
            <div className="mp-summary-indicator red" />
          </div>
          <span className="mp-summary-label">Absent Today</span>
          <div className="mp-summary-val">{absentCount}</div>
        </div>

        {/* Late Arrivals */}
        <div
          className="mp-summary-card-b"
          onClick={() => navigate("/manager/attendance/live")}
        >
          <div className="mp-summary-card-top">
            <div className="mp-summary-icon-box amber">
              <Clock size={18} />
            </div>
            <div className="mp-summary-indicator amber" />
          </div>
          <span className="mp-summary-label">Late Arrivals</span>
          <div className="mp-summary-val">{lateCount}</div>
        </div>

        {/* On Leave */}
        <div
          className="mp-summary-card-b"
          onClick={() => navigate("/manager/approvals/leave")}
        >
          <div className="mp-summary-card-top">
            <div className="mp-summary-icon-box blue">
              <CalendarDays size={18} />
            </div>
            <div className="mp-summary-indicator blue" />
          </div>
          <span className="mp-summary-label">On Leave</span>
          <div className="mp-summary-val">{leaveCount}</div>
        </div>
      </div>

      {/* ── 3. MAIN DASHBOARD CONTENT (BALANCED DESKTOP GRID) ─────────────── */}
      <div className="mp-dashboard-two-col">

        {/* LEFT COLUMN: OPERATIONAL PRIORITY SECTIONS */}
        <div className="mp-dashboard-col">

          {/* Pending Actions Section */}
          <div className="mp-section-card-b">
            <div className="mp-section-card-header">
              <h3 className="mp-section-card-title">
                <FileCheck2 size={18} />
                <span>Pending Actions</span>
              </h3>
              <button
                type="button"
                className="mp-section-card-action"
                onClick={() => navigate("/manager/approvals/regularization")}
              >
                <span>View All</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="mp-pending-actions-list">
              {approvals.length === 0 ? (
                <div className="mp-empty-state-compact">
                  <CheckCircle2 size={18} color="#10b981" />
                  <span>You're all caught up. No pending approvals for your team.</span>
                </div>
              ) : (
                approvals.slice(0, 5).map((apr) => {
                  const initials = (apr.name || "?")
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div key={apr.id} className="mp-pending-action-item">
                      <div className="mp-action-left-info">
                        <div className="mp-avatar-circle">{initials}</div>
                        <div className="mp-action-text-meta">
                          <span className="mp-action-req-title">{apr.type}</span>
                          <span className="mp-action-req-sub">From {apr.name} • {apr.date}</span>
                        </div>
                      </div>

                      <div className="mp-action-right-controls">
                        {apr.isNew ? (
                          <span className="mp-badge-new">New</span>
                        ) : (
                          <span className="mp-badge-pending">Pending</span>
                        )}
                        <button
                          type="button"
                          className="mp-btn-review"
                          onClick={() => setActiveModal(apr)}
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Team Attendance Today Section */}
          <div className="mp-section-card-b">
            <div className="mp-section-card-header">
              <h3 className="mp-section-card-title">
                <Users size={18} />
                <span>Team Attendance Today</span>
              </h3>
              <button
                type="button"
                className="mp-section-card-action"
                onClick={() => navigate("/manager/attendance/live")}
              >
                <span>View All</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="mp-team-attendance-list">
              {teamAttendanceList.length === 0 ? (
                <div className="mp-empty-state-compact">
                  <span>No team attendance records found for today.</span>
                </div>
              ) : (
                teamAttendanceList.slice(0, 6).map((mem) => {
                  const initials = (mem.name || "?")
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div key={mem.emp_code || mem.id} className="mp-team-attendance-item">
                      <div className="mp-team-member-info">
                        <div className="mp-avatar-circle">{initials}</div>
                        <div className="mp-team-member-meta">
                          <span className="mp-team-member-name">{mem.name}</span>
                          <span className="mp-team-member-code">{mem.emp_code}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        {renderAttendanceStatusPill(mem.status)}
                        <span className="mp-team-punch-time">{mem.check_in || "—"}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: TRENDS & TEAM INSIGHTS */}
        <div className="mp-dashboard-col">

          {/* Weekly Attendance Trend Card */}
          <div className="mp-section-card-b">
            <div className="mp-section-card-header">
              <h3 className="mp-section-card-title">
                <TrendingUp size={18} />
                <span>Weekly Attendance Trend</span>
              </h3>
              <button
                type="button"
                className="mp-section-card-action"
                onClick={() => navigate("/manager/reports")}
              >
                <span>View Report</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="mp-weekly-chart-box">
              <div className="mp-weekly-bars-mock">
                <div className="mp-mock-bar" style={{ height: "45%" }} />
                <div className="mp-mock-bar" style={{ height: "65%" }} />
                <div className="mp-mock-bar" style={{ height: "85%" }} />
                <div className="mp-mock-bar accent" style={{ height: "100%" }} />
                <div className="mp-mock-bar" style={{ height: "70%" }} />
              </div>
              <div className="mp-weekly-chart-desc">
                Weekly trend data will be available once historical endpoint is set up.
              </div>
            </div>
          </div>

          {/* Today's Team Ratio (Donut Chart) */}
          <div className="mp-section-card-b">
            <div className="mp-section-card-header">
              <h3 className="mp-section-card-title">
                <Target size={18} />
                <span>Today's Team Ratio</span>
              </h3>
              <button
                type="button"
                className="mp-section-card-action"
                onClick={() => navigate("/manager/reports")}
              >
                <span>View Full Report</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {pieData.length === 0 ? (
              <div className="mp-empty-state-compact">
                <span>No attendance data yet for today.</span>
              </div>
            ) : (
              <>
                <div style={{ height: "170px", position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={48}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase" }}>Total</span>
                    <div style={{ fontSize: "19px", fontWeight: 800, color: "#0f172a" }}>{totalTeam}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {pieData.map((item) => (
                    <div key={item.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                        {item.name}
                      </span>
                      <strong style={{ color: "#0f172a" }}>
                        {item.value} ({totalTeam > 0 ? Math.round((item.value / totalTeam) * 100) : 0}%)
                      </strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Recent Team Punches */}
          <div className="mp-section-card-b">
            <div className="mp-section-card-header">
              <h3 className="mp-section-card-title">
                <Clock size={18} />
                <span>Recent Team Punches</span>
              </h3>
              <button
                type="button"
                className="mp-section-card-action"
                onClick={() => navigate("/manager/attendance/live")}
              >
                <span>Live Monitor</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentPunches.length === 0 ? (
                <div className="mp-empty-state-compact">
                  <span>No punch records for today yet.</span>
                </div>
              ) : (
                recentPunches.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingBottom: "8px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <LogIn
                        size={15}
                        style={{ color: (p.status || "").toLowerCase().includes("late") ? "#d97706" : "#059669" }}
                      />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>{p.name}</span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>{p.dept}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{p.time}</div>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: (p.status || "").toLowerCase().includes("late") ? "#d97706" : "#059669"
                        }}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── REVIEW & APPROVAL DECISION MODAL ─────────────────────────────── */}
      <ManagerModal
        isOpen={Boolean(activeModal)}
        onClose={() => {
          setActiveModal(null);
          setRejectRemarks("");
        }}
        title={`Review ${activeModal?.type || "Request"}`}
        subtitle={`Action requested by ${activeModal?.name || "Employee"} on ${activeModal?.date || "Today"}`}
        footer={
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", width: "100%" }}>
            <button
              type="button"
              onClick={() => {
                setActiveModal(null);
                setRejectRemarks("");
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "13px"
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => handleReject(activeModal)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#dc2626",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => handleApprove(activeModal)}
              disabled={isApproving}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                background: "#059669",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {isApproving ? "Approving..." : "Approve Request"}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", fontSize: "13px" }}>
            <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 600 }}>DETAILS / REASON</div>
            <div style={{ marginTop: "4px", color: "#0f172a", fontWeight: 500 }}>
              {activeModal?.details || "No details provided."}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#334155" }}>
              Rejection Remarks (Required if rejecting)
            </label>
            <textarea
              rows={3}
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="e.g. Schedule conflicts / Insufficient notice provided..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>
      </ManagerModal>

    </div>
  );
};
