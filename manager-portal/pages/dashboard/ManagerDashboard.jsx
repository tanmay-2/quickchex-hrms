import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays,
  FileCheck2,
  ArrowRight,
  TrendingUp,
  LogIn,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ManagerStatCard } from "../../components/ManagerStatCard";
import { ManagerBadge } from "../../components/ManagerBadge";
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

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [stats, punches, team, regs] = await Promise.allSettled([
        getDashboardStats(),
        getTodayAttendance(),
        getTeam(),
        getRegularizationRequests(),
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

      if (regs.status === "fulfilled") {
        const pending = (Array.isArray(regs.value) ? regs.value : [])
          .filter((r) => (r.status || "").toLowerCase() === "pending")
          .map((r) => ({
            id: r.id,
            name: r.employee_name || r.emp_code,
            type: "Regularization",
            date: r.target_date,
            details: r.comment || "",
          }));
        setApprovals(pending);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 4000);
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
  const handleApprove = async (id) => {
    try {
      await approveRegularization(id);
      setApprovals((prev) => prev.filter((item) => item.id !== id));
      window.dispatchEvent(new CustomEvent('regularization-updated'));
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({
          type: 'regularization-updated',
          id,
          timestamp: Date.now()
        }));
      } catch (e) {}
      managerToast.success("Request approved successfully.", { title: "Request Approved" });
    } catch (err) {
      managerToast.error("Failed to approve: " + err.message, { title: "Error" });
    }
    setActiveModal(null);
  };

  const handleReject = async (id) => {
    if (!rejectRemarks.trim()) {
      managerToast.error("Please provide rejection remarks.", { title: "Remarks Required" });
      return;
    }
    try {
      await rejectRegularization(id);
      setApprovals((prev) => prev.filter((item) => item.id !== id));
      window.dispatchEvent(new CustomEvent('regularization-updated'));
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({
          type: 'regularization-updated',
          id,
          timestamp: Date.now()
        }));
      } catch (e) {}
      managerToast.error("Request rejected.", { title: "Request Rejected" });
    } catch (err) {
      managerToast.error("Failed to reject: " + err.message, { title: "Error" });
    }
    setActiveModal(null);
    setRejectRemarks("");
  };

  // ── Derived data for charts ────────────────────────────────────────────────
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
  const presentCount = statusCounts["Present"] || 0;
  const lateCount = statusCounts["Late"] || 0;
  const leaveCount = statusCounts["On Leave"] || 0;
  const absentCount = statusCounts["Absent"] || 0;

  // Recent 5 punches for the timeline
  const recentPunches = todayPunches.slice(0, 5).map((p) => {
    const member = teamMap[p.emp_code] || {};
    return {
      id: p.emp_code,
      name: member.name || p.emp_code,
      dept: member.department || "—",
      time: p.checkIn || "—",
      status: p.remark || p.status || "On Time",
    };
  });

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "14px" }}>
        Loading dashboard data...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Page Header Banner */}
      <div className="mp-page-header" style={{ color: "#FFFFFF" }}>
        <div>
          <h1 className="mp-page-header-title" style={{ color: "#FFFFFF" }}>
            Welcome back, {manager?.name || "Manager"} 👋
          </h1>
          <p className="mp-page-header-subtitle" style={{ color: "#FFFFFF", opacity: 0.95 }}>
            Here is your live team attendance overview for{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => navigate("/manager/attendance/live")}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "10px 18px", borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.18)", color: "#FFFFFF",
              fontSize: "13.5px", fontWeight: 600, cursor: "pointer",
              backdropFilter: "blur(8px)", transition: "all 140ms ease",
            }}
          >
            <Clock size={16} style={{ color: "#FFFFFF" }} />
            <span style={{ color: "#FFFFFF" }}>Live Punches</span>
          </button>
          <button
            type="button"
            className="mp-btn-hero-pending"
            onClick={() => navigate("/manager/approvals/regularization")}
          >
            <FileCheck2 size={16} />
            <span>Pending Approvals</span>
            <span className="mp-hero-counter">{approvals.length}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="mp-stats-grid">
        <ManagerStatCard
          title="Present Today"
          value={`${presentCount} / ${totalTeam}`}
          subtitle={totalTeam > 0 ? `${Math.round((presentCount / totalTeam) * 100)}% on-time check-in` : "—"}
          icon={CheckCircle2}
          variant="success"
          onClick={() => navigate("/manager/attendance/live")}
        />
        <ManagerStatCard
          title="Late Arrivals"
          value={lateCount}
          subtitle="Checked in after 10:30 AM"
          icon={Clock}
          variant="warning"
          badge={lateCount > 0 ? "Action Recommended" : undefined}
          onClick={() => navigate("/manager/attendance/live")}
        />
        <ManagerStatCard
          title="On Approved Leave"
          value={leaveCount}
          subtitle="Sanctioned absences today"
          icon={CalendarDays}
          variant="info"
          onClick={() => navigate("/manager/approvals/leave")}
        />
        <ManagerStatCard
          title="Pending Approvals"
          value={approvals.length}
          subtitle="Regularization requests"
          icon={AlertCircle}
          variant="danger"
          badge={approvals.length > 0 ? "Review Now" : undefined}
          onClick={() => navigate("/manager/approvals/regularization")}
        />
      </div>

      {/* Attendance Visualizations */}
      <div className="mp-charts-grid">
        {/* Today's Breakdown Donut Chart */}
        <div className="mp-card">
          <div className="mp-card-header">
            <h3 className="mp-card-title">Today's Team Ratio</h3>
          </div>

          {pieData.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "13px" }}>
              No attendance data yet for today.
            </div>
          ) : (
            <>
              <div style={{ height: "190px", position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={50}
                      outerRadius={75}
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
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)", textAlign: "center",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "var(--mp-text-muted)", textTransform: "uppercase" }}>Total</span>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--mp-text-primary)" }}>{totalTeam}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {pieData.map((item) => (
                  <div key={item.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--mp-text-secondary)" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                      {item.name}
                    </span>
                    <strong style={{ color: "var(--mp-text-primary)" }}>
                      {item.value} ({totalTeam > 0 ? Math.round((item.value / totalTeam) * 100) : 0}%)
                    </strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Weekly placeholder (no weekly endpoint yet) */}
        <div className="mp-card">
          <div className="mp-card-header">
            <h3 className="mp-card-title">
              <TrendingUp size={18} style={{ color: "#7C3AED" }} />
              <span>Weekly Attendance Trend</span>
            </h3>
            <button
              type="button"
              className="mp-card-action"
              onClick={() => navigate("/manager/reports")}
            >
              <span>View Full Report</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "13px" }}>
            Weekly trend data will be available once historical endpoint is set up.
          </div>
        </div>
      </div>

      {/* Two-Column: Quick Approvals & Recent Punches */}
      <div className="mp-two-col-grid">
        {/* Quick Approvals */}
        <div className="mp-card">
          <div className="mp-card-header">
            <h3 className="mp-card-title">
              <FileCheck2 size={18} style={{ color: "#7C3AED" }} />
              <span>Pending Action Items</span>
            </h3>
            <button
              type="button"
              className="mp-card-action"
              onClick={() => navigate("/manager/approvals/regularization")}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="mp-approval-list">
            {approvals.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "13px" }}>
                🎉 Great job! No pending approvals for your team.
              </div>
            ) : (
              approvals.map((apr) => (
                <div key={apr.id} className="mp-approval-item">
                  <div className="mp-approval-info">
                    <div className="mp-approval-avatar">
                      {(apr.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </div>
                    <div className="mp-approval-meta">
                      <span className="mp-approval-name">{apr.name}</span>
                      <span className="mp-approval-type">
                        {apr.type} • {apr.date}
                      </span>
                    </div>
                  </div>

                  <div className="mp-approval-actions">
                    <button
                      type="button"
                      className="mp-btn-approve-sm"
                      onClick={() => handleApprove(apr.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="mp-btn-reject-sm"
                      onClick={() => setActiveModal(apr)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Punches Timeline */}
        <div className="mp-card">
          <div className="mp-card-header">
            <h3 className="mp-card-title">
              <Clock size={18} style={{ color: "#7C3AED" }} />
              <span>Recent Team Punches</span>
            </h3>
            <button
              type="button"
              className="mp-card-action"
              onClick={() => navigate("/manager/attendance/live")}
            >
              <span>Live Monitor</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="mp-punch-timeline">
            {recentPunches.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "13px" }}>
                No punch records for today yet.
              </div>
            ) : (
              recentPunches.map((p) => (
                <div key={p.id} className="mp-punch-row">
                  <div className="mp-punch-user">
                    <LogIn size={15} style={{ color: (p.status || "").toLowerCase().includes("late") ? "#D97706" : "#059669" }} />
                    <div className="mp-punch-meta">
                      <span className="mp-punch-name">{p.name}</span>
                      <span className="mp-punch-sub">{p.dept}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mp-punch-time">{p.time}</div>
                    <ManagerBadge
                      variant={(p.status || "").toLowerCase().includes("late") ? "late" : "present"}
                      size="sm"
                    >
                      {p.status}
                    </ManagerBadge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      <ManagerModal
        isOpen={Boolean(activeModal)}
        onClose={() => setActiveModal(null)}
        title="Reject Request"
        subtitle={`Provide reason for rejecting ${activeModal?.name}'s ${activeModal?.type} request.`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              style={{
                padding: "8px 16px", borderRadius: "8px",
                border: "1px solid var(--mp-border)", background: "transparent", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleReject(activeModal?.id)}
              style={{
                padding: "8px 18px", borderRadius: "8px", border: "none",
                background: "#DC2626", color: "#FFF", fontWeight: 600, cursor: "pointer",
              }}
            >
              Confirm Rejection
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600 }}>Rejection Remarks (Mandatory)</label>
          <textarea
            rows={3}
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            placeholder="e.g., Insufficient notice provided / Shift requirements..."
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "8px",
              border: "1px solid var(--mp-border)", background: "var(--mp-surface)",
              color: "var(--mp-text-primary)", fontSize: "13.5px", outline: "none",
            }}
          />
        </div>
      </ManagerModal>
    </div>
  );
};
