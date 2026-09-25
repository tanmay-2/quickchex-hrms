import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  PiBellBold,
  PiDotsThreeVerticalBold,
  PiListBold,
  PiArrowsClockwiseBold,
  PiHeartBold,
  PiChatCircleBold,
  PiPlusBold,
  PiQuestionBold,
  PiCaretUpBold,
  PiMegaphoneBold,
  PiClipboardTextBold,
  PiWarningCircleBold,
  PiCalendarBlankBold,
  PiGearSixBold,
  PiConfettiBold,
  PiGiftBold,
  PiUserCircleBold,
  PiCalendarCheckBold,
  PiTicketBold,
  PiClockCounterClockwiseBold,
  PiArrowRightBold,
  PiUsersThreeBold,
  PiClockBold,
} from "react-icons/pi";
import {
  ChevronDown,
  HelpCircle,
  Search,
  X,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
} from "lucide-react";

import Sidebar from "../../components/sidebar/Sidebar";
import { useTheme } from "../../theme/ThemeProvider";
import logoIcon from "../../assets/img/logo.png";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./Dashboard.css";

/*
 * Optional illustration for the "no birthdays today" empty state.
 */
const BIRTHDAY_IMAGE = "/dashboard-birthday-illustration.png";

/*
 * Optional decorative artwork for the welcome banner.
 */
const BANNER_IMAGE = "/dashboard-banner-illustration.png";

const COMPANY_NAME = "LA ESFERA MULTISERVICES LLP";

/* =========================================================
   CHART INITIAL STATE (empty — populated from live APIs)
   ========================================================= */

const DEPT_COLORS = ["#7c3aed", "#c4b5fd", "#a78bfa", "#6d28d9", "#8b5cf6", "#ddd6fe"];

const INITIAL_DEPARTMENT_DATA = [];
const INITIAL_HEADCOUNT_DATA = [];
const INITIAL_JOINEE_DATA = [];

const STAT_CARDS = [
  {
    key: "pending",
    label: "Pending Requests",
    value: 0,
    alert: true,
    tone: "purple",
    icon: PiClipboardTextBold,
    path: "/dashboard/pending-requests",
  },
  {
    key: "alerts",
    label: "Process Alerts",
    value: 0,
    alert: true,
    tone: "pink",
    icon: PiWarningCircleBold,
    path: "/dashboard/process-alerts",
  },
  {
    key: "events",
    label: "Today's Events",
    value: 0,
    alert: false,
    tone: "yellow",
    icon: PiCalendarBlankBold,
    path: "/dashboard/events",
  },
  {
    key: "issues",
    label: "Setup Issues",
    value: 0,
    alert: true,
    tone: "blue",
    icon: PiGearSixBold,
    path: "/dashboard/setup-issues",
  },
];

/* Attendance KPI data */
const KPI_CARDS = [
  {
    key: "present",
    label: "Present Today",
    value: 61,
    total: 73,
    icon: CheckCircle2,
    variant: "present",
    sub: "84% attendance rate",
  },
  {
    key: "leave",
    label: "On Leave",
    value: 5,
    total: 73,
    icon: Clock,
    variant: "leave",
    sub: "Approved leaves",
  },
  {
    key: "absent",
    label: "Absent",
    value: 4,
    total: 73,
    icon: XCircle,
    variant: "absent",
    sub: "Unmarked today",
  },
  {
    key: "late",
    label: "Late Arrivals",
    value: 3,
    total: 73,
    icon: Users,
    variant: "late",
    sub: "After 10:00 AM",
  },
];

// Announcements are fetched live from /api/v1/announcements — no hardcoded data

const NOTIFICATIONS = [];


const HAS_UNREAD_NOTIFICATIONS = NOTIFICATIONS.some((n) => n.unread);

const FEED_POSTS = [];


const FEED_PAGE_SIZE = 5;

const QUICK_ACTIONS = [
  { key: "leave", label: "Apply for Leave", path: "/dashboard/leave", icon: PiCalendarCheckBold },
  { key: "regularization", label: "Request Regularization", path: "/dashboard/regularization", icon: PiClockCounterClockwiseBold },
  { key: "ticket", label: "Raise a Ticket", path: "/tickets/all", icon: PiTicketBold },
];

const chartTooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(124,58,237,0.12)",
  background: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(12px)",
  color: "#16161d",
  fontSize: 12,
  boxShadow: "0 10px 24px rgba(109,40,217,0.12)",
};

/* =========================================================
   FLOATING PARTICLES
   ========================================================= */

/* Particle configuration: position, size, duration, delay */
const PARTICLES = [
  { x: "8%", y: "20%", s: 5, dur: "9s", delay: "0s" },
  { x: "18%", y: "70%", s: 4, dur: "11s", delay: "1.4s" },
  { x: "30%", y: "40%", s: 6, dur: "8s", delay: "0.6s" },
  { x: "42%", y: "80%", s: 3, dur: "12s", delay: "2.2s" },
  { x: "55%", y: "15%", s: 5, dur: "10s", delay: "0.3s" },
  { x: "65%", y: "55%", s: 4, dur: "7s", delay: "1.8s" },
  { x: "72%", y: "30%", s: 7, dur: "14s", delay: "0.9s" },
  { x: "80%", y: "75%", s: 4, dur: "9s", delay: "3.1s" },
  { x: "88%", y: "45%", s: 5, dur: "11s", delay: "1.2s" },
  { x: "93%", y: "20%", s: 3, dur: "8s", delay: "2.6s" },
  { x: "25%", y: "90%", s: 6, dur: "13s", delay: "0.7s" },
  { x: "50%", y: "60%", s: 4, dur: "10s", delay: "1.9s" },
];

const FloatingParticles = () => (
  <div className="dash-particles" aria-hidden="true">
    {PARTICLES.map((p, i) => (
      <div
        key={i}
        className="dash-particle"
        style={{
          left: p.x,
          top: p.y,
          width: `${p.s}px`,
          height: `${p.s}px`,
          "--dur": p.dur,
          "--delay": p.delay,
        }}
      />
    ))}
  </div>
);

/* =========================================================
   3D ROCKET SCENE
   ========================================================= */

const RocketScene = () => (
  <div className="dash-banner-rocket-scene" aria-hidden="true">
    {/* Orbiting bubbles centered around a point */}
    <div className="dash-orbit-center" style={{ left: "22px", top: "50%" }}>
      <div className="dash-orbit-bubble dash-orbit-bubble-1">✓</div>
      <div className="dash-orbit-bubble dash-orbit-bubble-2" />
      <div className="dash-orbit-bubble dash-orbit-bubble-3" />
    </div>

    {/* Rocket */}
    <div className="dash-rocket">
      <div className="dash-rocket-body">
        <div className="dash-rocket-window" />
        <div className="dash-rocket-fin-left" />
        <div className="dash-rocket-fin-right" />
      </div>
      <div className="dash-rocket-flames">
        <div className="dash-rocket-flame dash-rocket-flame-1" />
        <div className="dash-rocket-flame dash-rocket-flame-2" />
        <div className="dash-rocket-flame dash-rocket-flame-3" />
      </div>
    </div>

    {/* Floating check-in symbols */}
    <div className="dash-checkin-symbol" style={{ right: "50px", top: "8px", animationDelay: "0.2s" }}>✓</div>
    <div className="dash-checkin-symbol" style={{ right: "80px", bottom: "8px", animationDelay: "0.5s" }}>●</div>
  </div>
);

/* =========================================================
   KPI BAR
   ========================================================= */

const KpiBar = ({ cards = KPI_CARDS }) => (
  <div className="dash-kpi-bar">
    {cards.map((card) => {
      const IconComp = card.icon;
      const pct = Math.round((card.value / card.total) * 100);
      return (
        <div key={card.key} className={`dash-kpi-card ${card.variant}`}>
          <div className="dash-kpi-icon">
            <IconComp size={22} />
          </div>
          <div className="dash-kpi-content">
            <div className="dash-kpi-label">{card.label}</div>
            <div className="dash-kpi-value">{card.value}</div>
            <div className="dash-kpi-sub">{card.sub}</div>
          </div>
          <div
            className="dash-kpi-progress"
            style={{ "--kpi-pct": `${pct}%` }}
          >
            <div
              className="dash-kpi-progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

/* =========================================================
   HELPERS
   ========================================================= */

const USER_STORAGE_KEYS = [
  "userData", "user", "employee", "authUser", "currentUser",
  "loginData", "profile", "employeeData", "auth",
];

const readStoredUser = () => {
  for (const store of [localStorage, sessionStorage]) {
    for (const key of USER_STORAGE_KEYS) {
      let raw;
      try {
        raw = store.getItem(key);
      } catch {
        continue;
      }
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const candidate = parsed?.user ?? parsed?.employee ?? parsed?.data ?? parsed;
        if (candidate && typeof candidate === "object") {
          return candidate;
        }
      } catch {
        // Not JSON — skip
      }
    }
  }

  if (import.meta.env?.DEV) {
    console.warn(
      "[Dashboard] No employee data found under the expected storage keys.",
      "Keys actually present:",
      {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
      }
    );
  }
  return null;
};

const getEmployeeName = () => {
  const data = readStoredUser();
  if (data) {
    const candidate =
      data.name ||
      data.full_name ||
      data.fullName ||
      data.employee_name ||
      data.employeeName ||
      `${data.first_name || data.firstName || ""} ${data.last_name || data.lastName || ""}`.trim() ||
      data.username;
    if (candidate && candidate.trim()) return candidate.trim();
  }
  for (const store of [localStorage, sessionStorage]) {
    for (const k of ["user_name", "userName", "name", "emp_name", "emp_code"]) {
      try {
        const val = store.getItem(k);
        if (val && typeof val === "string" && val.trim()) return val.trim();
      } catch { /* ignore */ }
    }
  }
  return "Team Member";
};

const getEmployeePhoto = () => {
  const data = readStoredUser();
  if (!data) return null;
  return (
    data.photo || data.photo_url || data.photoUrl || data.avatar ||
    data.avatar_url || data.avatarUrl || data.profile_image ||
    data.profileImage || data.profile_picture || data.profilePicture || null
  );
};

const getInitials = (name) =>
  String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/* =========================================================
   DASHBOARD
   ========================================================= */

const Dashboard = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [showBirthdayFeed, setShowBirthdayFeed] = useState(true);
  const [visibleFeedCount, setVisibleFeedCount] = useState(FEED_PAGE_SIZE);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const quickMenuRef = useRef(null);
  const [faqOpen, setFaqOpen] = useState(false);

  useEffect(() => {
    if (!quickMenuOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (quickMenuRef.current && !quickMenuRef.current.contains(event.target)) {
        setQuickMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [quickMenuOpen]);

  const [employeeName, setEmployeeName] = useState(getEmployeeName);
  const [employeePhoto, setEmployeePhoto] = useState(getEmployeePhoto);

  useEffect(() => {
    const syncUserDetails = () => {
      setEmployeeName(getEmployeeName());
      setEmployeePhoto(getEmployeePhoto());
    };
    syncUserDetails();
    window.addEventListener("storage", syncUserDetails);
    return () => window.removeEventListener("storage", syncUserDetails);
  }, []);

  const [kpiCards, setKpiCards] = useState(KPI_CARDS);
  const [departmentData, setDepartmentData] = useState(INITIAL_DEPARTMENT_DATA);
  const [headcountData, setHeadcountData] = useState(INITIAL_HEADCOUNT_DATA);
  const [joineeData, setJoineeData] = useState(INITIAL_JOINEE_DATA);
  const [statCards, setStatCards] = useState(STAT_CARDS);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    let mounted = true;
    const API_BASE = (import.meta.env?.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

    const fetchDashboardData = () => {
      // 1. Fetch Today's Attendance for KPI Cards
      fetch(`${API_BASE}/api/v1/attendance/admin/today`)
        .then((res) => (res.ok ? res.json() : []))
        .then((records) => {
          if (!mounted || !Array.isArray(records) || records.length === 0) return;
          const total = records.length;
          let present = 0;
          let onLeave = 0;
          let absent = 0;
          let late = 0;

          records.forEach((r) => {
            const st = (r.status || "").toLowerCase();
            const rem = (r.remark || "").toLowerCase();
            const hasPunch = Boolean(r.punch_in_time || (r.punch_in && r.punch_in !== "—" && r.punch_in !== "-") || (r.checkIn && r.checkIn !== "—" && r.checkIn !== "-"));

            if (st === "present" || st === "in progress" || st === "half day" || (hasPunch && st !== "absent")) {
              present += 1;
            } else if (st.includes("leave")) {
              onLeave += 1;
            } else {
              absent += 1;
            }

            if (rem.includes("late")) {
              late += 1;
            } else if (r.punch_in_time) {
              try {
                const punchDate = new Date(r.punch_in_time);
                if (punchDate.getHours() > 10 || (punchDate.getHours() === 10 && punchDate.getMinutes() > 15)) {
                  late += 1;
                }
              } catch { }
            }
          });

          const rate = total > 0 ? Math.round((present / total) * 100) : 0;

          setKpiCards([
            {
              key: "present",
              label: "Present Today",
              value: present,
              total,
              icon: CheckCircle2,
              variant: "present",
              sub: `${rate}% attendance rate`,
            },
            {
              key: "leave",
              label: "On Leave",
              value: onLeave,
              total,
              icon: Clock,
              variant: "leave",
              sub: "Approved leaves",
            },
            {
              key: "absent",
              label: "Absent",
              value: absent,
              total,
              icon: XCircle,
              variant: "absent",
              sub: "Unmarked today",
            },
            {
              key: "late",
              label: "Late Arrivals",
              value: late,
              total,
              icon: Users,
              variant: "late",
              sub: "After 10:00 AM",
            },
          ]);
        })
        .catch((err) => console.warn("Failed to fetch admin attendance today:", err));

      // 2. Fetch Department Distribution
      fetch(`${API_BASE}/api/v1/admin/departments/stats`)
        .then((res) => (res.ok ? res.json() : []))
        .then((deptStats) => {
          if (!mounted || !Array.isArray(deptStats) || deptStats.length === 0) return;
          const colored = deptStats.map((d, i) => ({
            ...d,
            color: d.color || DEPT_COLORS[i % DEPT_COLORS.length],
          }));
          setDepartmentData(colored);
        })
        .catch(() => { });

      // 3. Fetch Live Pending Requests Count
      Promise.all([
        fetch(`${API_BASE}/api/v1/regularization/admin/all`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/api/v1/leaves/admin/all`).then(r => r.ok ? r.json() : []).catch(() => [])
      ]).then(([regs, leaves]) => {
        if (!mounted) return;
        const pendingRegs = Array.isArray(regs) ? regs.filter(r => (r.status || '').toLowerCase().includes('pending')).length : 0;
        const pendingLeaves = Array.isArray(leaves) ? leaves.filter(l => (l.status || '').toLowerCase().includes('pending')).length : 0;
        const totalPending = pendingRegs + pendingLeaves;
        setStatCards(prev => prev.map(c => c.key === 'pending' ? { ...c, value: totalPending } : c));
      });

      // 4. Fetch Live Announcements
      fetch(`${API_BASE}/api/v1/announcements`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (mounted && Array.isArray(data)) {
            setAnnouncements(data);
          }
        })
        .catch(() => { });

      // 5. Fetch Employee Head Count trend
      fetch(`${API_BASE}/api/v1/admin/headcount/monthly`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (mounted && Array.isArray(data) && data.length > 0) {
            setHeadcountData(data);
          }
        })
        .catch(() => { });

      // 6. Fetch New Joinee / Resigned trend
      fetch(`${API_BASE}/api/v1/admin/joinees/monthly`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (mounted && Array.isArray(data) && data.length > 0) {
            setJoineeData(data);
          }
        })
        .catch(() => { });
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 4000);
    const handleSync = () => fetchDashboardData();

    window.addEventListener("focus", handleSync);
    window.addEventListener("attendance-updated", handleSync);
    window.addEventListener("punch-updated", handleSync);
    window.addEventListener("regularization-updated", handleSync);
    window.addEventListener("leave-applied", handleSync);
    window.addEventListener("leave-balance-updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("attendance-updated", handleSync);
      window.removeEventListener("punch-updated", handleSync);
      window.removeEventListener("regularization-updated", handleSync);
      window.removeEventListener("leave-applied", handleSync);
      window.removeEventListener("leave-balance-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const departmentTotal = useMemo(
    () => departmentData.reduce((sum, d) => sum + d.value, 0),
    [departmentData]
  );

  const visibleFeed = showBirthdayFeed ? FEED_POSTS.slice(0, visibleFeedCount) : [];
  const canLoadMore = showBirthdayFeed && visibleFeedCount < FEED_POSTS.length;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Shell expanded={expanded} setExpanded={setExpanded}>
      {/* Floating ambient particles */}
      <FloatingParticles />

      <TopBanner
        name={employeeName}
        photo={employeePhoto}
        onViewAllNotifications={() => navigate("/dashboard/notifications")}
      />

      {/* ---- ATTENDANCE KPI BAR ---- */}
      <KpiBar cards={kpiCards} />

      <section className="dash-ov-grid">
        {/* ================= MAIN (LEFT) COLUMN ================= */}
        <div className="dash-ov-col dash-ov-col-main">
          <div className="dash-ov-charts-pair">
            <ChartPanel
              title="Department Distribution"
              onClick={() => navigate("/dashboard/info/department-distribution")}
            >
              <div className="dash-ov-donut-wrap">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {departmentData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="dash-ov-donut-center">
                  <span>Total</span>
                  <strong>{departmentTotal}</strong>
                </div>
              </div>

              <ul className="dash-ov-legend dash-ov-legend-dots">
                {departmentData.map((d) => (
                  <li key={d.name}>
                    <i style={{ background: d.color }} />
                    {d.name}
                  </li>
                ))}
              </ul>
            </ChartPanel>

            <ChartPanel
              title="Employee Head Count"
              onClick={() => navigate("/dashboard/info/employee-head-count")}
              legend={[
                { label: "Active", color: "var(--ov-purple)" },
                { label: "In-Active", color: "var(--ov-pink)" },
              ]}
            >
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={headcountData}
                  margin={{ top: 6, right: 4, left: -18, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid vertical={false} stroke="var(--ov-grid)" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--ov-axis)", fontSize: 11 }}
                    dy={6}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--ov-axis)", fontSize: 11 }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    cursor={{ fill: "var(--ov-cursor)" }}
                  />
                  <Bar dataKey="active" name="Active" fill="var(--ov-purple)" radius={[5, 5, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="inactive" name="In-Active" fill="var(--ov-pink)" radius={[5, 5, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <div className="dash-ov-stats-row">
            {statCards.map((card, i) => (
              <StatCard
                key={card.key}
                {...card}
                animDelay={`${i * 0.06}s`}
                onClick={() => navigate(card.path)}
              />
            ))}
          </div>

          <div className="dash-ov-panel dash-ov-announcements">
            <div className="dash-ov-panel-head">
              <h2>Announcement</h2>
              <button type="button" className="dash-ov-icon-btn" aria-label="Refresh announcements">
                <PiArrowsClockwiseBold />
              </button>
            </div>
            <div className="dash-ov-announcement-list">
              {announcements.length > 0 ? (
                announcements.map((a) => (
                  <AnnouncementCard key={a.id} {...a} />
                ))
              ) : (
                <p style={{ padding: "16px", color: "var(--ov-muted)", fontSize: "13px" }}>
                  No active announcements published.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ================= SIDE (RIGHT) COLUMN ================= */}
        <div className="dash-ov-col dash-ov-col-side">
          <ChartPanel
            title="New Joinee / Resigned Employees"
            onClick={() => navigate("/dashboard/info/joiners-resigned")}
            legend={[
              { label: "New Joinee", color: "var(--ov-green)" },
              { label: "Resigned", color: "var(--ov-red)" },
            ]}
          >
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={joineeData}
                margin={{ top: 6, right: 4, left: -14, bottom: 0 }}
                barGap={3}
              >
                <CartesianGrid vertical={false} stroke="var(--ov-grid)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--ov-axis)", fontSize: 10 }}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--ov-axis)", fontSize: 11 }}
                  width={24}
                />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "var(--ov-cursor)" }} />
                <Bar dataKey="joined" name="New Joinee" fill="var(--ov-green)" radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="resigned" name="Resigned" fill="var(--ov-red)" radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <div
            className="dash-ov-panel dash-ov-birthday-panel dash-ov-clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/dashboard/info/birthdays-events")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate("/dashboard/info/birthdays-events");
              }
            }}
          >
            <div className="dash-ov-panel-head">
              <h2>Today's Birthdays / Work Anniversaries (0)</h2>
            </div>
            <BirthdayIllustration />
          </div>

          <div className="dash-ov-toggle-row">
            <span>Birthday/Anniversary Feeds</span>
            <label className={`dash-ov-switch${showBirthdayFeed ? " is-on" : ""}`}>
              <input
                type="checkbox"
                checked={showBirthdayFeed}
                onChange={(event) => setShowBirthdayFeed(event.target.checked)}
              />
              <span className="dash-ov-switch-label">{showBirthdayFeed ? "Show" : "Hide"}</span>
              <span className="dash-ov-switch-thumb" />
            </label>
          </div>

          <div className="dash-ov-pill-row">
            <button
              type="button"
              className="dash-ov-pill is-holiday dash-ov-clickable"
              onClick={() => navigate("/dashboard/info/holidays")}
            >
              <PiCalendarBlankBold />
              <span>1 Holiday</span>
            </button>
            <button
              type="button"
              className="dash-ov-pill is-event dash-ov-clickable"
              onClick={() => navigate("/dashboard/info/special-events")}
            >
              <PiGiftBold />
              <span>0 Special Events</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= EMPLOYEE FEEDS ================= */}
      <div
        className="dash-ov-panel dash-ov-feeds dash-ov-clickable"
        role="button"
        tabIndex={0}
        onClick={(event) => {
          if (event.target.closest("button")) return;
          navigate("/dashboard/info/employee-feeds");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate("/dashboard/info/employee-feeds");
          }
        }}
      >
        <div className="dash-ov-panel-head">
          <h2>Employee Feeds</h2>
          <button type="button" className="dash-ov-icon-btn" aria-label="Refresh feeds">
            <PiArrowsClockwiseBold />
          </button>
        </div>

        {visibleFeed.length === 0 ? (
          <p className="dash-ov-empty">No feed posts to show right now.</p>
        ) : (
          <ul className="dash-ov-feed-list">
            {visibleFeed.map((post) => (
              <FeedPost key={post.id} post={post} authorName={employeeName} />
            ))}
          </ul>
        )}

        {canLoadMore && (
          <div className="dash-ov-load-more-wrap">
            <button
              type="button"
              className="dash-ov-load-more"
              onClick={() =>
                setVisibleFeedCount((n) => Math.min(n + FEED_PAGE_SIZE, FEED_POSTS.length))
              }
            >
              <PiArrowsClockwiseBold />
              Load More
            </button>
          </div>
        )}
      </div>

      <FaqHelpPanel
        open={faqOpen}
        onClose={() => setFaqOpen(false)}
        onViewAll={() => {
          setFaqOpen(false);
          navigate("/dashboard/faq");
        }}
      />

      <p className="dash-ov-copyright">
        COPYRIGHT © {new Date().getFullYear()} LA ESFERA
      </p>

      {/* ================= FLOATING ACTIONS ================= */}
      <div className="dash-ov-fab-group" ref={quickMenuRef}>
        {quickMenuOpen && (
          <ul className="dash-ov-quick-menu" role="menu">
            {QUICK_ACTIONS.map((action) => (
              <li key={action.key}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    navigate(action.path);
                  }}
                >
                  <action.icon />
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="dash-ov-fab dash-ov-fab-add"
          aria-label="Create new"
          aria-haspopup="menu"
          aria-expanded={quickMenuOpen}
          onClick={() => setQuickMenuOpen((open) => !open)}
        >
          <PiPlusBold />
        </button>
      </div>

      <button
        type="button"
        className="dash-ov-fab dash-ov-fab-faq"
        aria-label="Open FAQ"
        aria-expanded={faqOpen}
        onClick={() => setFaqOpen((open) => !open)}
      >
        <PiQuestionBold />
        <span>FAQ</span>
      </button>

      <button
        type="button"
        className="dash-ov-fab dash-ov-fab-top"
        aria-label="Scroll to top"
        onClick={scrollToTop}
      >
        <PiCaretUpBold />
      </button>
    </Shell>
  );
};

/* ================================================================
   Layout shell (sidebar + main scroll area)
   ================================================================ */

export const Shell = ({ expanded, setExpanded, children }) => (
  <div className="dash-shell">
    <Sidebar expanded={expanded} setExpanded={setExpanded} />
    <main className={`dash-main${expanded ? " is-expanded" : ""}`}>
      <div className="dash-inner dash-ov-inner">{children}</div>
    </main>
  </div>
);

/* ================================================================
   Welcome banner with 3D rocket scene (Delegates to shared DashboardHeader)
   ================================================================ */

export const TopBanner = (props) => <DashboardHeader {...props} />;

/* ================================================================
   Notification dropdown
   ================================================================ */

const NotificationDropdown = ({ items, onViewAll }) => {
  const navigate = useNavigate();
  const [readIds, setReadIds] = useState(
    () => new Set(items.filter((item) => !item.unread).map((item) => item.id))
  );

  const markRead = (id) => {
    setReadIds((current) => new Set([...current, id]));
  };

  return (
    <div className="dash-ov-notif-menu" role="menu">
      <div className="dash-ov-notif-menu-head">
        <span>Notifications</span>
        <span className="dash-ov-notif-menu-count">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="dash-ov-notif-empty">You're all caught up.</p>
      ) : (
        <ul className="dash-ov-notif-list">
          {items.map((item) => (
            <li
              key={item.id}
              className={`dash-ov-notif-item is-${item.tone}${item.unread && !readIds.has(item.id) ? " is-unread" : ""
                }`}
              onClick={() => markRead(item.id)}
            >
              <span className="dash-ov-notif-icon">
                <item.icon />
              </span>
              <div className="dash-ov-notif-copy">
                <p className="dash-ov-notif-title">{item.title}</p>
                <p className="dash-ov-notif-meta">{item.time}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="dash-ov-notif-viewall" onClick={onViewAll}>
        View all notifications
      </button>
    </div>
  );
};

/* ================================================================
   Banner avatar (photo or icon) with profile menu
   ================================================================ */

const TopBannerAvatar = ({ name, photo }) => {
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef(null);
  const showImage = Boolean(photo) && !imageFailed;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen]);

  const handleSignOut = () => {
    setMenuOpen(false);
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="dash-ov-profile-wrap" ref={profileRef}>
      <button
        type="button"
        className="dash-ov-profile-trigger"
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="dash-ov-avatar" aria-hidden="true">
          {showImage ? (
            <img
              src={photo}
              alt=""
              className="dash-ov-avatar-image"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <PiUserCircleBold />
          )}
        </span>
      </button>

      {menuOpen && (
        <div className="dash-ov-profile-menu" role="menu" aria-label="Profile menu">
          <button
            type="button"
            className="dash-ov-profile-menu-item"
            role="menuitem"
            onClick={() => { setMenuOpen(false); navigate("/dashboard/notifications"); }}
          >
            <PiBellBold aria-hidden="true" />
            <span>Notification Settings</span>
          </button>

          <button
            type="button"
            className="dash-ov-profile-menu-item"
            role="menuitem"
            onClick={() => { setMenuOpen(false); navigate("/dashboard/faq"); }}
          >
            <PiQuestionBold aria-hidden="true" />
            <span>Help Center</span>
          </button>

          <button
            type="button"
            className="dash-ov-profile-menu-item dash-ov-profile-menu-item-danger"
            role="menuitem"
            onClick={handleSignOut}
          >
            <PiArrowRightBold aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* ================================================================
   FAQ / Help panel
   ================================================================ */

const FAQ_ITEMS = [
  {
    question: "How do I check attendance or regularization?",
    answer: "Open the Attendance area from the sidebar. You can review records and create or follow regularization requests there.",
  },
  {
    question: "Where can I review leave information?",
    answer: "Use the Leave section to review leave applications, balances and related employee information.",
  },
  {
    question: "Where can I view payroll information?",
    answer: "Use Employee Salary and Payroll Items from the Payroll section to review payroll records and related actions.",
  },
  {
    question: "How do I manage employee records?",
    answer: "Open Employee Directory to search employees, review profiles and access employee-specific information.",
  },
  {
    question: "Where can I find company policies?",
    answer: "Company Policies is available from the Organisation section of the sidebar.",
  },
];

const FaqHelpPanel = ({ open, onClose, onViewAll }) => {
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState(0);

  const visible = FAQ_ITEMS.filter((item) =>
    `${item.question} ${item.answer}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        className={`dash-faq-overlay${open ? " is-open" : ""}`}
        aria-label="Close FAQ"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />

      <aside
        className={`dash-faq-panel${open ? " is-open" : ""}`}
        aria-label="FAQ and help"
        aria-hidden={!open}
      >
        <div className="dash-faq-panel-head">
          <div className="dash-faq-panel-title">
            <div className="dash-faq-panel-title-copy">
              <span className="dash-faq-kicker">SUPPORT</span>
              <h2>Instant Answers</h2>
            </div>
          </div>
          <button type="button" className="dash-faq-close" aria-label="Close FAQ" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="dash-faq-search">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpenIndex(0);
            }}
            placeholder="Search your question..."
            aria-label="Search FAQs"
          />
        </div>

        <div className="dash-faq-list">
          {visible.length === 0 ? (
            <div className="dash-faq-empty">
              <HelpCircle size={26} aria-hidden="true" />
              <strong>No matching questions found.</strong>
              <span>Try another search term.</span>
            </div>
          ) : (
            visible.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={item.question} className={`dash-faq-item${isOpen ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="dash-faq-question"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      size={16}
                      className={`dash-faq-question-icon${isOpen ? " is-rotated" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && <p className="dash-faq-answer">{item.answer}</p>}
                </div>
              );
            })
          )}
        </div>

        <div className="dash-faq-bottom">
          <button type="button" className="dash-faq-view-all" onClick={onViewAll}>
            <span>View all help &amp; FAQs</span>
            <span aria-hidden="true">→</span>
          </button>

          <div className="dash-faq-bottom-search">
            <input
              type="text"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setOpenIndex(0); }}
              placeholder="What can we help you with?"
              aria-label="What can we help you with?"
            />
          </div>
        </div>
      </aside>
    </>
  );
};

/* ================================================================
   Chart panel
   ================================================================ */

const ChartPanel = ({ title, legend, children, onClick }) => (
  <div
    className={`dash-ov-panel dash-ov-chart-panel${onClick ? " dash-ov-clickable" : ""}`}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={
      onClick
        ? (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }
        : undefined
    }
  >
    <div className="dash-ov-panel-head">
      <h2>{title}</h2>
      <div className="dash-ov-panel-actions">
        <button type="button" className="dash-ov-icon-btn" aria-label="Panel options">
          <PiListBold />
        </button>
        <button type="button" className="dash-ov-icon-btn" aria-label="Refresh">
          <PiArrowsClockwiseBold />
        </button>
      </div>
    </div>

    {legend && (
      <ul className="dash-ov-legend dash-ov-legend-inline">
        {legend.map((item) => (
          <li key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>
    )}

    <div className="dash-ov-chart-body">{children}</div>
  </div>
);

/* ================================================================
   Stat card with animation delay
   ================================================================ */

const StatCard = ({ label, value, alert, tone, icon: Icon, onClick, animDelay }) => (
  <button
    type="button"
    className={`dash-ov-stat-card is-${tone} dash-ov-clickable`}
    onClick={onClick}
    style={{ animationDelay: animDelay || "0s" }}
  >
    {alert && <span className="dash-ov-stat-dot" aria-hidden="true" />}

    <span className="dash-ov-stat-head">
      <span className="dash-ov-stat-icon">
        <Icon />
      </span>
      <span className="dash-ov-stat-label">{label}</span>
    </span>

    <span className="dash-ov-stat-foot">
      <strong className="dash-ov-stat-value">{value}</strong>
      <span className="dash-ov-stat-view">view</span>
    </span>
  </button>
);

/* ================================================================
   Announcement card
   ================================================================ */

const AnnouncementCard = ({ title, date, time, tone, onClick }) => (
  <button
    type="button"
    className={`dash-ov-announcement-card is-${tone} dash-ov-clickable`}
    onClick={onClick}
  >
    <span className="dash-ov-announcement-icon">
      <PiMegaphoneBold />
    </span>

    <div className="dash-ov-announcement-copy">
      <p className="dash-ov-announcement-title" title={title}>{title}</p>
      <p className="dash-ov-announcement-meta">{date} | {time}</p>
    </div>

    <button
      type="button"
      className="dash-ov-icon-btn dash-ov-announcement-menu"
      aria-label="Announcement options"
    >
      <PiDotsThreeVerticalBold />
    </button>
  </button>
);

/* ================================================================
   Birthday / empty-state illustration (SVG-based 3D desk scene)
   ================================================================ */

const BirthdayIllustration = () => {
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageFailed) {
    return (
      <div className="dash-ov-birthday-illustration">
        <span className="dash-ov-birthday-circle" aria-hidden="true" />
        <img
          src={BIRTHDAY_IMAGE}
          alt=""
          className="dash-ov-birthday-image"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  /* CSS-only 3D desk/employee scene when image is unavailable */
  return (
    <div className="dash-ov-birthday-illustration">
      <span className="dash-ov-birthday-circle" aria-hidden="true" />
      <svg
        width="160"
        height="140"
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* Monitor */}
        <rect x="52" y="28" width="56" height="42" rx="5" fill="#e8e0ff" stroke="#7c3aed" strokeWidth="2" />
        <rect x="56" y="32" width="48" height="34" rx="3" fill="#f0eaff" />
        <rect x="68" y="68" width="24" height="5" fill="#c4b5fd" />
        <rect x="62" y="73" width="36" height="4" rx="2" fill="#7c3aed" />

        {/* Screen content lines */}
        <rect x="60" y="36" width="28" height="3" rx="1.5" fill="#a78bfa" />
        <rect x="60" y="42" width="22" height="2" rx="1" fill="#c4b5fd" />
        <rect x="60" y="47" width="26" height="2" rx="1" fill="#c4b5fd" />
        <rect x="60" y="52" width="18" height="2" rx="1" fill="#ddd6fe" />

        {/* Desk */}
        <rect x="30" y="80" width="100" height="10" rx="4" fill="#c4b5fd" />
        <rect x="38" y="90" width="6" height="30" rx="2" fill="#a78bfa" />
        <rect x="116" y="90" width="6" height="30" rx="2" fill="#a78bfa" />

        {/* Person silhouette */}
        <circle cx="82" cy="18" r="11" fill="#7c3aed" />
        <ellipse cx="82" cy="40" rx="14" ry="10" fill="#6d28d9" />

        {/* Confetti dots */}
        <circle cx="35" cy="30" r="3" fill="#fbbf24" opacity="0.8" />
        <circle cx="130" cy="22" r="4" fill="#ec4899" opacity="0.7" />
        <circle cx="120" cy="50" r="2.5" fill="#34d399" opacity="0.8" />
        <circle cx="42" cy="55" r="3" fill="#7c3aed" opacity="0.6" />
        <circle cx="25" cy="65" r="2" fill="#f97316" opacity="0.7" />
        <circle cx="140" cy="70" r="3" fill="#fbbf24" opacity="0.7" />
      </svg>
    </div>
  );
};

/* ================================================================
   Employee feed post
   ================================================================ */

const FeedPost = ({ post, authorName }) => (
  <li className="dash-ov-feed-post">
    <div className={`dash-ov-feed-avatar is-${post.tone}`} aria-label={post.name}>
      <PiUserCircleBold />
    </div>

    <div className="dash-ov-feed-body">
      <div className="dash-ov-feed-top">
        <strong>{post.name}</strong>
        <button type="button" className="dash-ov-icon-btn" aria-label="Post options">
          <PiDotsThreeVerticalBold />
        </button>
      </div>

      <p className="dash-ov-feed-meta">
        Posted on {post.date} at {post.time} by {authorName}
      </p>

      <p className="dash-ov-feed-text">Today is {post.name}'s Birthday! Wish them!</p>

      <div className="dash-ov-feed-actions">
        <span>
          <PiHeartBold /> 0 Likes
        </span>
        <span>
          <PiChatCircleBold /> 0 Comments
        </span>
      </div>
    </div>
  </li>
);

export default Dashboard;