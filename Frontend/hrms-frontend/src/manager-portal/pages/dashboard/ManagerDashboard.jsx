import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays,
  FileCheck2,
  FileCheck,
  ChevronRight,
  TrendingUp,
  LogIn,
  RotateCw,
  UserX,
  Calendar,
  Sparkles,
  ExternalLink,
  MessageSquare,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
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
  getTeamLeaves,
  approveLeave,
  rejectLeave,
  getAttendanceMatrix,
} from "../../services/managerApiService";
import "./ManagerDashboard.css";

/** Helper: Generate initials from full name */
const getInitials = (name) => {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

/** Helper: Format cleaner department label */
const cleanDepartment = (raw) => {
  if (!raw || typeof raw !== "string") return "Operations";
  if (raw.includes("*")) {
    const segments = raw.split("*").filter(Boolean);
    return segments[0] || "Operations";
  }
  return raw;
};

export const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { manager } = useManagerAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [dashStats, setDashStats] = useState(null);
  const [todayPunches, setTodayPunches] = useState([]);
  const [teamList, setTeamList] = useState([]);
  const [teamMap, setTeamMap] = useState({});
  const [approvals, setApprovals] = useState([]);
  const [weeklyTrendData, setWeeklyTrendData] = useState([]);
  const [trendAvailable, setTrendAvailable] = useState(false);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Review Modal State
  const [selectedActionItem, setSelectedActionItem] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setFetchError(null);
    }
    const empCode = manager?.id || manager?.emp_code || localStorage.getItem("emp_code") || "ADM002";
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    try {
      const [statsRes, punchesRes, teamRes, regsRes, leavesRes, matrixRes] =
        await Promise.allSettled([
          getDashboardStats(),
          getTodayAttendance(),
          getTeam(),
          getRegularizationRequests(),
          getTeamLeaves(empCode),
          getAttendanceMatrix(currentMonth, currentYear),
        ]);

      let hasSuccess = false;

      // 1. Dashboard Stats
      if (statsRes.status === "fulfilled" && statsRes.value) {
        setDashStats(statsRes.value);
        hasSuccess = true;
      }

      // 2. Today's Attendance
      let punchesData = [];
      if (punchesRes.status === "fulfilled") {
        punchesData = Array.isArray(punchesRes.value) ? punchesRes.value : [];
        setTodayPunches(punchesData);
        hasSuccess = true;
      }

      // 3. Team Roster
      if (teamRes.status === "fulfilled" && Array.isArray(teamRes.value)) {
        setTeamList(teamRes.value);
        const map = {};
        teamRes.value.forEach((m) => {
          map[m.emp_code] = m;
        });
        setTeamMap(map);
        hasSuccess = true;
      }

      // 4. Pending Regularizations & Leaves
      const pendingList = [];

      if (regsRes.status === "fulfilled" && Array.isArray(regsRes.value)) {
        hasSuccess = true;
        const pendingRegs = regsRes.value
          .filter((r) => {
            const s = String(r.status || r.overall_status || "").toUpperCase();
            const m = String(r.manager_status || "").toUpperCase();
            if (s === "APPROVED" || s === "COMPLETED" || s === "PENDING_ADMIN" || m === "APPROVED") {
              return false;
            }
            if (s === "REJECTED" || m === "REJECTED") {
              return false;
            }
            return s === "PENDING_MANAGER" || s === "PENDING" || m === "PENDING" || m === "PENDING_MANAGER";
          })
          .map((r) => ({
            id: r.id,
            raw: r,
            name: r.employee_name || r.name || r.employeeName || r.emp_code,
            empCode: r.emp_code || r.employeeId || "",
            type: "Regularization",
            date: r.target_date || r.date || r.targetDate || "—",
            details: r.comment || r.reason || r.issue || "Attendance Regularization",
            submittedOn: r.submittedOn || r.appliedDate || r.requestDate || "Recent",
            checkIn: r.requested_check_in || r.checkIn || r.inTime || "—",
            checkOut: r.requested_check_out || r.checkOut || r.outTime || "—",
            status: "Pending Review",
          }));
        pendingList.push(...pendingRegs);
      }

      if (leavesRes.status === "fulfilled" && Array.isArray(leavesRes.value)) {
        hasSuccess = true;
        const pendingLeaves = leavesRes.value
          .filter((l) => {
            const s = String(l.overall_status || l.status || "").toUpperCase();
            const m = String(l.manager_status || "").toUpperCase();
            if (s === "APPROVED" || s === "PENDING_ADMIN" || m === "APPROVED") {
              return false;
            }
            if (s === "REJECTED" || m === "REJECTED") {
              return false;
            }
            return s === "PENDING_MANAGER" || s === "PENDING" || m === "PENDING" || m === "PENDING_MANAGER";
          })
          .map((l) => ({
            id: l.id,
            raw: l,
            name: l.name || l.employee_name || l.emp_code,
            empCode: l.emp_code || l.code || "",
            type: "Leave",
            leaveType: l.leave_type || "Leave",
            date: l.start_date
              ? `${l.start_date}${l.end_date && l.end_date !== l.start_date ? ` to ${l.end_date}` : ""}`
              : "Today",
            details: `${l.leave_type || "Leave"}${l.reason ? ` • ${l.reason}` : ""}`,
            submittedOn: l.applied_on || l.created_at || "Recent",
            status: "Pending Review",
          }));
        pendingList.push(...pendingLeaves);
      }

      setApprovals(pendingList);

      // 5. Weekly Attendance Trend (Matrix)
      if (matrixRes.status === "fulfilled" && matrixRes.value?.team) {
        hasSuccess = true;
        const matrix = matrixRes.value;
        const daysInMonth = matrix.days_in_month || 31;
        const currentDay = Math.min(now.getDate(), daysInMonth);

        const days = [];
        const startDay = Math.max(1, currentDay - 6);
        for (let d = startDay; d <= currentDay; d++) {
          days.push(d);
        }
        while (days.length < 7 && days[0] > 1) {
          days.unshift(days[0] - 1);
        }

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        const trendPoints = days.map((dayNum) => {
          let presentCount = 0;
          let absentCount = 0;
          let leaveCount = 0;

          matrix.team.forEach((member) => {
            const dayRecord = Array.isArray(member.days)
              ? member.days.find((x) => x.day === dayNum)
              : null;
            if (dayRecord) {
              const badge = (dayRecord.badge || "").toUpperCase();
              const status = (dayRecord.status || "").toLowerCase();
              if (badge === "P" || badge === "IP" || status === "present") {
                presentCount++;
              } else if (badge === "LV" || status.includes("leave")) {
                leaveCount++;
              } else if (badge === "A" || status === "absent") {
                absentCount++;
              }
            }
          });

          const dateObj = new Date(matrix.year || currentYear, (matrix.month || currentMonth) - 1, dayNum);
          const dayLabel = `${dayNames[dateObj.getDay()]} ${dayNum}`;

          return {
            name: dayLabel,
            Present: presentCount,
            Absent: absentCount,
            "On Leave": leaveCount,
            total: presentCount + absentCount + leaveCount,
          };
        });

        const hasTrendData = trendPoints.some((p) => p.total > 0);
        setWeeklyTrendData(trendPoints);
        setTrendAvailable(hasTrendData);
      } else {
        setTrendAvailable(false);
      }

      if (!hasSuccess && !silent) {
        setFetchError("Unable to reach the server. Please verify network connection.");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (!silent) {
        setFetchError("Error loading dashboard data: " + (err.message || "Unknown error"));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 8000);
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

  // ── Derived Attendance Counts ──────────────────────────────────────────────
  const { totalTeam, presentCount, lateCount, leaveCount, absentCount } = useMemo(() => {
    const total =
      dashStats?.team_size ||
      teamList.length ||
      todayPunches.length ||
      Object.keys(teamMap).length ||
      0;

    // A punch is counted only when explicitly recorded; "Not started" is NOT absent
    const pCount =
      todayPunches.filter((p) => {
        const s = (p.status || "").toLowerCase();
        return s === "present" || s === "on time" || s === "in progress";
      }).length ||
      dashStats?.present_today ||
      0;

    const lCount =
      todayPunches.filter((p) => {
        const s = (p.status || "").toLowerCase();
        const r = (p.remark || "").toLowerCase();
        return s === "late" || r.includes("late");
      }).length ||
      dashStats?.late_today ||
      0;

    const lvCount =
      todayPunches.filter((p) => {
        const s = (p.status || "").toLowerCase();
        const ls = (p.leave_status || "").toLowerCase();
        return s.includes("leave") || (ls && ls !== "none" && ls !== "—");
      }).length ||
      dashStats?.on_leave_today ||
      0;

    const aCount =
      todayPunches.filter((p) => {
        const s = (p.status || "").toLowerCase();
        return s === "absent";
      }).length ||
      dashStats?.absent_today ||
      0;

    return {
      totalTeam: total,
      presentCount: pCount,
      lateCount: lCount,
      leaveCount: lvCount,
      absentCount: aCount,
    };
  }, [todayPunches, dashStats, teamList, teamMap]);

  // ── Team Attendance Today Roster ───────────────────────────────────────────
  const teamTodayRoster = useMemo(() => {
    if (todayPunches.length > 0) {
      return todayPunches.slice(0, 8);
    }
    if (teamList.length > 0) {
      return teamList.slice(0, 8).map((m) => ({
        emp_code: m.emp_code,
        name: m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.emp_code,
        designation: m.designation || "Employee",
        department: m.department || "Operations",
        status: "Not started",
        punch_in: "—",
      }));
    }
    return [];
  }, [todayPunches, teamList]);

  // ── Recent 5 punches for live monitor ──────────────────────────────────────
  const recentPunches = useMemo(() => {
    return todayPunches
      .filter((p) => p.punch_in && p.punch_in !== "—" && p.punch_in !== null)
      .slice(0, 5)
      .map((p) => {
        const member = teamMap[p.emp_code] || {};
        return {
          id: p.emp_code,
          name: p.name || p.employee || member.name || p.emp_code,
          dept: cleanDepartment(p.designation || member.department || p.department || "Operations"),
          time: p.punch_in || p.check_in || "—",
          status: p.status || p.remark || "Present",
        };
      });
  }, [todayPunches, teamMap]);

  // ── Handlers: Approve & Reject ─────────────────────────────────────────────
  const handleApprove = async (item) => {
    if (!item) return;
    setActionSubmitting(true);
    setApprovals((prev) => prev.filter((i) => i.id !== item.id));

    try {
      if (item.type === "Leave") {
        await approveLeave(item.id);
        window.dispatchEvent(new CustomEvent("leave-applied"));
        window.dispatchEvent(new CustomEvent("leave-balance-updated"));
      } else {
        await approveRegularization(item.id);
        window.dispatchEvent(new CustomEvent("regularization-updated"));
      }
      window.dispatchEvent(new CustomEvent("attendance-updated"));
      managerToast.success(`${item.type} request approved successfully.`, {
        title: "Request Approved",
      });
      setSelectedActionItem(null);
      fetchData(true);
    } catch (err) {
      managerToast.error("Failed to approve: " + err.message, { title: "Approval Error" });
      fetchData(true);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async (item) => {
    if (!item) return;
    if (!rejectRemarks.trim()) {
      managerToast.error("Please provide mandatory rejection remarks.", {
        title: "Remarks Required",
      });
      return;
    }
    setActionSubmitting(true);
    const remarks = rejectRemarks.trim();
    setApprovals((prev) => prev.filter((i) => i.id !== item.id));

    try {
      if (item.type === "Leave") {
        await rejectLeave(item.id, remarks);
        window.dispatchEvent(new CustomEvent("leave-applied"));
        window.dispatchEvent(new CustomEvent("leave-balance-updated"));
      } else {
        await rejectRegularization(item.id, remarks);
        window.dispatchEvent(new CustomEvent("regularization-updated"));
      }
      window.dispatchEvent(new CustomEvent("attendance-updated"));
      managerToast.info(`${item.type} request rejected.`, { title: "Request Rejected" });
      setSelectedActionItem(null);
      setRejectRemarks("");
      fetchData(true);
    } catch (err) {
      managerToast.error("Failed to reject: " + err.message, { title: "Rejection Error" });
      fetchData(true);
    } finally {
      setActionSubmitting(false);
    }
  };

  // ── Render Loading Skeleton ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mp-dashboard-loading">
        <div className="mp-loading-spinner">
          <RotateCw size={26} className="spin-icon" />
        </div>
        <p className="mp-loading-text">Loading Manager Portal Dashboard...</p>
      </div>
    );
  }

  // ── Render API Error State ─────────────────────────────────────────────────
  if (fetchError && !dashStats && todayPunches.length === 0) {
    return (
      <div className="mp-dashboard-error-card">
        <AlertCircle size={36} style={{ color: "#DC2626" }} />
        <h3 className="mp-error-title">Unable to Load Dashboard Data</h3>
        <p className="mp-error-desc">{fetchError}</p>
        <button
          type="button"
          className="mp-btn-retry"
          onClick={() => fetchData()}
        >
          <RotateCw size={15} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  // Formatted current date
  const now = new Date();
  const formattedToday = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const weekdayToday = now.toLocaleDateString("en-US", { weekday: "long" });
  const dayMonthYearToday = now.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const managerGreetingName =
    manager?.name ||
    dashStats?.manager?.name ||
    (manager?.first_name ? `${manager.first_name} ${manager.last_name || ""}`.trim() : null) ||
    "Manager";

  const pendingApprovalsCount = approvals.length || dashStats?.pending_approvals || 0;

  return (
    <div className="mp-dashboard-container">
      {/* ── 1. WELCOME BANNER (Desktop: Approved Header, Mobile: Option B Action-First Card) ─ */}
      <div className="mp-page-header mp-welcome-banner-responsive" id="manager-welcome-card" style={{ color: "#FFFFFF" }}>
        {/* Desktop View (> 768px) */}
        <div className="mp-welcome-desktop-row">
          <div>
            <h1 className="mp-page-header-title" style={{ color: "#FFFFFF" }}>
              Welcome back, {managerGreetingName} 👋
            </h1>
            <p className="mp-page-header-subtitle" style={{ color: "#FFFFFF", opacity: 0.95 }}>
              Here is your live team attendance overview for {formattedToday}.
            </p>
          </div>

          <div className="mp-page-header-actions" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => navigate("/manager/attendance/live")}
              className="mp-btn-hero-punches"
              id="btn-shortcut-live-punches"
            >
              <Clock size={16} style={{ color: "#FFFFFF" }} />
              <span style={{ color: "#FFFFFF" }}>Live Punches</span>
            </button>

            <button
              type="button"
              className="mp-btn-hero-pending"
              onClick={() => navigate("/manager/approvals/regularization")}
              id="btn-shortcut-pending-approvals"
            >
              <FileCheck size={16} />
              <span>Pending Approvals</span>
              <span className="mp-hero-counter">{pendingApprovalsCount}</span>
            </button>
          </div>
        </div>

        {/* Mobile View (<= 768px: Option B Action-First Dashboard) */}
        <div className="mp-welcome-mobile-box">
          <div className="mp-welcome-mobile-top">
            <div className="mp-welcome-mobile-text">
              <h1 className="mp-welcome-mobile-title">
                Welcome back, {managerGreetingName} 👋
              </h1>
              <p className="mp-welcome-mobile-subtitle">
                Manage your team attendance and approvals efficiently.
              </p>
            </div>

            <div className="mp-welcome-date-badge">
              <Calendar size={18} className="mp-welcome-date-icon" />
              <div className="mp-welcome-date-lines">
                <span className="mp-welcome-date-day">{weekdayToday}</span>
                <span className="mp-welcome-date-val">{dayMonthYearToday}</span>
              </div>
            </div>
          </div>

          <div className="mp-welcome-mobile-shortcuts">
            <button
              type="button"
              className="mp-mobile-shortcut-btn"
              onClick={() => navigate("/manager/attendance/live")}
              id="btn-mobile-shortcut-team-attendance"
            >
              <div className="mp-mobile-shortcut-left">
                <Users size={16} className="mp-shortcut-icon" />
                <span>Team Attendance</span>
              </div>
              <ChevronRight size={14} className="mp-shortcut-chevron" />
            </button>

            <button
              type="button"
              className="mp-mobile-shortcut-btn"
              onClick={() => navigate("/manager/approvals/regularization")}
              id="btn-mobile-shortcut-review-approvals"
            >
              <div className="mp-mobile-shortcut-left">
                <FileCheck size={16} className="mp-shortcut-icon" />
                <span>Review Approvals</span>
              </div>
              <ChevronRight size={14} className="mp-shortcut-chevron" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. ATTENDANCE METRIC CARDS (Option B: 2-column mobile, 4-col desktop) ─ */}
      <div className="mp-stats-grid" id="manager-metric-cards-grid">
        <ManagerStatCard
          title="Present Today"
          value={totalTeam > 0 ? `${presentCount} / ${totalTeam}` : `${presentCount}`}
          subtitle={
            totalTeam > 0
              ? `${Math.round((presentCount / totalTeam) * 100)}% active attendance`
              : "Direct reports present"
          }
          icon={Users}
          variant="success"
          indicator={true}
          onClick={() => navigate("/manager/attendance/live")}
        />

        <ManagerStatCard
          title="Absent Today"
          value={absentCount}
          subtitle="Confirmed unexcused absences"
          icon={UserX}
          variant="danger"
          badge={absentCount > 0 ? "Follow Up" : undefined}
          onClick={() => navigate("/manager/attendance/live")}
        />

        <ManagerStatCard
          title="Late Arrivals"
          value={lateCount}
          subtitle="Checked in past grace period"
          icon={Clock}
          variant="warning"
          badge={lateCount > 0 ? "Requires Review" : undefined}
          onClick={() => navigate("/manager/attendance/live")}
        />

        <ManagerStatCard
          title="On Leave"
          value={leaveCount}
          subtitle="Approved leave absences today"
          icon={Calendar}
          variant="info"
          onClick={() => navigate("/manager/approvals/leave")}
        />
      </div>

      {/* ── 3. PENDING ACTIONS SECTION (Option B) ─────────────────────────────── */}
      <div className="mp-card mp-pending-actions-card" id="manager-pending-actions-section">
        <div className="mp-card-header">
          <h2 className="mp-card-title">
            <FileCheck2 size={18} style={{ color: "#7C3AED" }} />
            <span>Pending Actions</span>
            {approvals.length > 0 && (
              <span className="mp-count-pill">{approvals.length}</span>
            )}
          </h2>

          <button
            type="button"
            className="mp-card-action"
            onClick={() => navigate("/manager/approvals/regularization")}
            id="btn-view-all-pending-actions"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="mp-approval-list">
          {approvals.length === 0 ? (
            <div className="mp-empty-state-compact">
              <CheckCircle2 size={24} style={{ color: "#059669" }} />
              <div>
                <p className="mp-empty-title">All Caught Up!</p>
                <p className="mp-empty-desc">
                  No pending regularization or leave requests requiring manager review.
                </p>
              </div>
            </div>
          ) : (
            approvals.map((apr) => {
              const reqTypeLabel = apr.type.toLowerCase().includes("request")
                ? apr.type
                : `${apr.type} Request`;
              return (
                <div key={`${apr.type}-${apr.id}`} className="mp-approval-item">
                  <div className="mp-approval-info">
                    <div className="mp-approval-avatar">
                      {getInitials(apr.name)}
                    </div>
                    <div className="mp-approval-meta">
                      <span className="mp-approval-name">{reqTypeLabel}</span>
                      <span className="mp-approval-type">
                        From {apr.name} • {apr.date}
                      </span>
                    </div>
                  </div>

                  <div className="mp-approval-actions">
                    <span className="mp-status-pill pending">
                      Pending
                    </span>
                    <button
                      type="button"
                      className="mp-btn-review-pill"
                      onClick={() => {
                        setSelectedActionItem(apr);
                        setRejectRemarks("");
                      }}
                      id={`btn-review-${apr.id}`}
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

      {/* ── 4. TEAM ATTENDANCE TODAY (Option B) ───────────────────────────────── */}
      <div className="mp-card mp-team-attendance-card" id="manager-team-attendance-section">
        <div className="mp-card-header">
          <h2 className="mp-card-title">
            <Users size={18} style={{ color: "#7C3AED" }} />
            <span>Team Attendance Today</span>
          </h2>

          <button
            type="button"
            className="mp-card-action"
            onClick={() => navigate("/manager/attendance/live")}
            id="btn-view-all-team-attendance"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {teamTodayRoster.length === 0 ? (
          <div className="mp-empty-state-compact">
            <Users size={24} style={{ color: "#7C3AED" }} />
            <div>
              <p className="mp-empty-title">No Direct Reports Found</p>
              <p className="mp-empty-desc">
                No team members are currently assigned under your manager profile.
              </p>
            </div>
          </div>
        ) : (
          <div className="mp-team-roster-list">
            {teamTodayRoster.map((member) => {
              const statusRaw = member.status || "Not started";
              const statusLower = statusRaw.toLowerCase();
              let badgeClass = "not-started";
              let badgeLabel = statusRaw;

              if (statusLower === "present" || statusLower === "on time") {
                badgeClass = "present";
                badgeLabel = "Present";
              } else if (statusLower === "late" || (member.remark && member.remark.toLowerCase().includes("late"))) {
                badgeClass = "late";
                badgeLabel = "Late";
              } else if (statusLower.includes("leave")) {
                badgeClass = "leave";
                badgeLabel = "On Leave";
              } else if (statusLower === "absent") {
                badgeClass = "absent";
                badgeLabel = "Absent";
              }

              const punchInTime =
                member.punch_in && member.punch_in !== "—"
                  ? member.punch_in
                  : member.check_in && member.check_in !== "—"
                  ? member.check_in
                  : "—";

              return (
                <div key={member.emp_code} className="mp-roster-row">
                  <div className="mp-roster-left">
                    <div className="mp-roster-avatar">
                      {getInitials(member.name || member.employee || member.emp_code)}
                    </div>
                    <div className="mp-roster-meta">
                      <span className="mp-roster-name">
                        {member.name || member.employee || member.emp_code}
                      </span>
                      <span className="mp-roster-sub">
                        {member.emp_code}
                      </span>
                    </div>
                  </div>

                  <div className="mp-roster-right">
                    <span className={`mp-status-pill ${badgeClass}`}>
                      <span className="mp-status-dot" />
                      {badgeLabel}
                    </span>
                    <div className="mp-roster-time">
                      {punchInTime !== "—" ? punchInTime : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. LOWER DASHBOARD: WEEKLY TREND & RECENT PUNCHES ─────────────────── */}
      <div className="mp-two-col-grid" id="manager-lower-widgets-grid">
        {/* Weekly Attendance Trend */}
        <div className="mp-card mp-trend-card">
          <div className="mp-card-header">
            <h2 className="mp-card-title">
              <TrendingUp size={18} style={{ color: "#7C3AED" }} />
              <span>Weekly Attendance Trend</span>
            </h2>

            <button
              type="button"
              className="mp-card-action"
              onClick={() => navigate("/manager/reports")}
              id="btn-view-trend-report"
            >
              <span>View Report</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {!trendAvailable ? (
            <div className="mp-chart-unavailable-box-optb">
              <div className="mp-chart-bars-illustration" aria-hidden="true">
                <span className="mp-mini-bar bar-1" />
                <span className="mp-mini-bar bar-2" />
                <span className="mp-mini-bar bar-3" />
                <span className="mp-mini-bar bar-4" />
                <span className="mp-mini-bar bar-5" />
                <span className="mp-mini-bar bar-6" />
              </div>
              <p className="mp-chart-unavailable-text">
                Weekly trend data will be available once historical endpoint is set up.
              </p>
            </div>
          ) : (
            <div style={{ height: "230px", width: "100%", marginTop: "6px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECE8F6" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#7D7590" }}
                    axisLine={{ stroke: "#E6E3EE" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#7D7590" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF",
                      borderRadius: "10px",
                      border: "1px solid #E6E3EE",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11.5px", paddingTop: "8px" }} />
                  <Bar dataKey="Present" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Absent" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="On Leave" fill="#0284C7" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Team Punches Timeline */}
        <div className="mp-card mp-punches-card">
          <div className="mp-card-header">
            <h2 className="mp-card-title">
              <Clock size={18} style={{ color: "#7C3AED" }} />
              <span>Recent Team Punches</span>
            </h2>

            <button
              type="button"
              className="mp-card-action"
              onClick={() => navigate("/manager/attendance/live")}
              id="btn-view-live-monitor"
            >
              <span>Live Monitor</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="mp-punch-timeline">
            {recentPunches.length === 0 ? (
              <div className="mp-empty-state-compact">
                <Clock size={22} style={{ color: "#9CA3AF" }} />
                <div>
                  <p className="mp-empty-title">No Punches Today Yet</p>
                  <p className="mp-empty-desc">
                    Team punches will populate automatically once members punch in.
                  </p>
                </div>
              </div>
            ) : (
              recentPunches.map((p) => {
                const isLate = (p.status || "").toLowerCase().includes("late");
                return (
                  <div key={p.id} className="mp-punch-row">
                    <div className="mp-punch-user">
                      <LogIn
                        size={15}
                        style={{ color: isLate ? "#D97706" : "#059669" }}
                      />
                      <div className="mp-punch-meta">
                        <span className="mp-punch-name">{p.name}</span>
                        <span className="mp-punch-sub">{p.dept}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="mp-punch-time">{p.time}</div>
                      <ManagerBadge
                        variant={isLate ? "late" : "present"}
                        size="sm"
                      >
                        {isLate ? "Late" : "On Time"}
                      </ManagerBadge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 6. REVIEW ACTION MODAL (Option B) ─────────────────────────────────── */}
      <ManagerModal
        isOpen={Boolean(selectedActionItem)}
        onClose={() => {
          setSelectedActionItem(null);
          setRejectRemarks("");
        }}
        title={`Review ${selectedActionItem?.type} Request`}
        subtitle={`Submitted by ${selectedActionItem?.name} (${selectedActionItem?.empCode})`}
        footer={
          <div className="mp-review-modal-footer">
            <button
              type="button"
              className="mp-btn-modal-cancel"
              disabled={actionSubmitting}
              onClick={() => {
                setSelectedActionItem(null);
                setRejectRemarks("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="mp-btn-modal-reject"
              disabled={actionSubmitting}
              onClick={() => handleReject(selectedActionItem)}
              id="btn-confirm-reject-request"
            >
              {actionSubmitting ? "Processing..." : "Reject Request"}
            </button>
            <button
              type="button"
              className="mp-btn-modal-approve"
              disabled={actionSubmitting}
              onClick={() => handleApprove(selectedActionItem)}
              id="btn-confirm-approve-request"
            >
              {actionSubmitting ? "Processing..." : "Approve Request"}
            </button>
          </div>
        }
      >
        {selectedActionItem && (
          <div className="mp-review-modal-body">
            <div className="mp-modal-details-grid">
              <div className="mp-modal-detail-item">
                <span className="mp-detail-label">Employee</span>
                <span className="mp-detail-val">
                  {selectedActionItem.name} ({selectedActionItem.empCode})
                </span>
              </div>

              <div className="mp-modal-detail-item">
                <span className="mp-detail-label">Request Type</span>
                <span className="mp-detail-val">{selectedActionItem.type}</span>
              </div>

              <div className="mp-modal-detail-item">
                <span className="mp-detail-label">
                  {selectedActionItem.type === "Leave" ? "Leave Period" : "Target Date"}
                </span>
                <span className="mp-detail-val">{selectedActionItem.date}</span>
              </div>

              {selectedActionItem.type === "Regularization" && (
                <div className="mp-modal-detail-item">
                  <span className="mp-detail-label">Requested Timings</span>
                  <span className="mp-detail-val">
                    In: {selectedActionItem.checkIn} | Out: {selectedActionItem.checkOut}
                  </span>
                </div>
              )}
            </div>

            <div className="mp-modal-reason-box">
              <span className="mp-detail-label">Reason / Justification</span>
              <p className="mp-reason-text">
                {selectedActionItem.details || "No explanation provided."}
              </p>
            </div>

            <div className="mp-modal-remarks-wrap">
              <label className="mp-remarks-label" htmlFor="rejection-remarks-input">
                Rejection Remarks (Required only if rejecting):
              </label>
              <textarea
                id="rejection-remarks-input"
                rows={3}
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="e.g. Schedule conflict / insufficient notice provided..."
                className="mp-remarks-textarea"
              />
            </div>
          </div>
        )}
      </ManagerModal>
    </div>
  );
};
