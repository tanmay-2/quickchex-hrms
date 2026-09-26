import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  PiTrendUpBold,
  PiTrendDownBold,
  PiArrowsClockwiseBold,
  PiCameraBold,
  PiMapPinBold,
  PiCheckCircleBold,
  PiXBold,
  PiClockBold,
  PiUserCircleBold,
  PiArrowClockwiseBold,
  PiBellBold,
  PiQuestionBold,
  PiArrowRightBold,
  PiCalendarCheckBold,
  PiFileTextBold,
} from "react-icons/pi";

import Sidebar from "../../components/sidebar/Sidebar_emp";
import profileFallback from "../../assets/img/ProfileImage.jfif";
import { useTheme } from "../../theme/ThemeProvider";
import "./Dashboard_emp.css";
import { getApiBaseUrl } from "../../utils/apiBase";

const API_BASE_URL = getApiBaseUrl();

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

/* "8.25 Hrs" -> 8.25 */
const parseHours = (value) => {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


const getProfileImageValue = (value) => {
  if (!value) return "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return `${API_BASE_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
};

const readCurrentEmployee = () => {
  const keys = ["employee", "userData", "user"];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const value = JSON.parse(raw);

      if (value && typeof value === "object") {
        return {
          name:
            value.name ||
            value.full_name ||
            value.employee_name ||
            value.username ||
            "Employee",
          id:
            value.employee_id ||
            value.employeeId ||
            value.emp_code ||
            value.employee_code ||
            value.code ||
            "—",
          email: value.email || value.work_email || "",
          avatar: getProfileImageValue(
            value.profile_image ||
            value.profileImage ||
            value.photo ||
            value.photo_url ||
            value.avatar ||
            value.avatar_url ||
            value.image
          ) || profileFallback,
        };
      }
    } catch {
      // Ignore malformed local storage values.
    }
  }

  return { name: "Employee", id: "—", email: "", avatar: profileFallback };
};

const formatLiveTime = (date) =>
  date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const formatPunchTime = (date) =>
  date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getInitials = (name) => {
  const value = String(name || "Employee").trim();

  return (
    value
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "EM"
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [now, setNow] = useState(new Date());
  const [notifications, setNotifications] = useState(() => {
    try {
      const raw = localStorage.getItem("laesfera_employee_notifications");
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [
        { id: "dash-1", title: "Attendance reminder", message: "Remember to complete today’s attendance.", time: "Today", unread: true },
        { id: "dash-2", title: "Payslip available", message: "Your latest payslip is ready to view.", time: "Yesterday", unread: true },
        { id: "dash-3", title: "Policy update", message: "A company policy was updated.", time: "2 days ago", unread: false },
      ];
    } catch {
      return [];
    }
  });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [stats, setStats] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [punchModal, setPunchModal] = useState(null);
  const [punchState, setPunchState] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(`employee-punch-${getTodayKey()}`) || "{}"
      );
    } catch {
      return {};
    }
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Your session has ended. Sign in again to continue.");
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    try {
      const [statsRes, attRes, empRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/profile/employees/stats`, { headers }),
        fetch(`${API_BASE_URL}/attendance/admin/today`, { headers }),
        fetch(`${API_BASE_URL}/profile/employees/`, { headers }),
      ]);

      const unauthorised = [statsRes, attRes, empRes].some(
        (r) => r.status === "fulfilled" && r.value.status === 401
      );
      if (unauthorised) {
        localStorage.removeItem("token");
        setError("Your session has ended. Sign in again to continue.");
        setLoading(false);
        return;
      }

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        setStats(await statsRes.value.json());
      } else {
        throw new Error("headcount");
      }

      // Both of these are optional - the monthly attendance table may not
      // exist yet, and the roster call is a nice-to-have for the charts.
      if (attRes.status === "fulfilled" && attRes.value.ok) {
        const data = await attRes.value.json();
        setAttendance(Array.isArray(data) ? data : []);
      } else {
        setAttendance([]);
      }

      if (empRes.status === "fulfilled" && empRes.value.ok) {
        const data = await empRes.value.json();
        setPeople(Array.isArray(data) ? data : []);
      } else {
        setPeople([]);
      }
    } catch {
      setError("Couldn't reach the server. Check that the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("laesfera_employee_notifications", JSON.stringify(notifications));
    } catch {
      // best effort only
    }
  }, [notifications]);

  /* ---------- derived: today ---------- */
  const today = useMemo(() => {
    const rows = attendance ?? [];
    const isLate = (r) => /late/i.test(r.remark ?? "");
    const isAbsent = (r) => /absent/i.test(r.status ?? "");

    const present = rows.filter((r) => !isAbsent(r));
    const late = rows.filter((r) => !isAbsent(r) && isLate(r));
    const absent = rows.filter(isAbsent);
    const logged = present.reduce((sum, r) => sum + parseHours(r.prodHours), 0);

    return {
      rows,
      present: present.length,
      late: late.length,
      absent: absent.length,
      avgHours: present.length ? (logged / present.length).toFixed(1) : null,
      roll: rows.map((r) => ({
        code: r.emp_code,
        state: isAbsent(r) ? "absent" : isLate(r) ? "late" : "present",
        checkIn: r.checkIn,
      })),
    };
  }, [attendance]);

  /* ---------- derived: roster ----------
     Everything here is computed from real joining dates and departments.
     Nothing is invented; if a field is blank the row is grouped as such. */
  const roster = useMemo(() => {
    const now = new Date();

    // Joiners per month for the last six months, oldest first.
    const buckets = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], joined: 0 });
    }
    const index = new Map(buckets.map((b, i) => [b.key, i]));

    let joinedThisMonth = 0;
    let joinedLastMonth = 0;
    const thisKey = `${now.getFullYear()}-${now.getMonth()}`;
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey = `${lastDate.getFullYear()}-${lastDate.getMonth()}`;

    const byDept = new Map();

    people.forEach((p) => {
      const dept = (p.department || "Unassigned").trim() || "Unassigned";
      byDept.set(dept, (byDept.get(dept) || 0) + 1);

      if (!p.joining_date) return;
      const d = new Date(p.joining_date);
      if (Number.isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (index.has(key)) buckets[index.get(key)].joined += 1;
      if (key === thisKey) joinedThisMonth += 1;
      if (key === lastKey) joinedLastMonth += 1;
    });

    const departments = [...byDept.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      joiners: buckets,
      departments,
      joinedThisMonth,
      joinedLastMonth,
      hasJoinDates: buckets.some((b) => b.joined > 0),
    };
  }, [people]);

  const headcount = stats?.total ?? 0;

  const currentEmployee = useMemo(() => {
    const stored = readCurrentEmployee();
    const code = String(stored.id || "").toLowerCase();

    const matched = (people ?? []).find((person) => {
      const personCode = String(
        person.emp_code ||
        person.employee_code ||
        person.employee_id ||
        person.id ||
        ""
      ).toLowerCase();
      return code && code !== "—" && personCode === code;
    });

    if (!matched) return stored;

    return {
      ...stored,
      name:
        matched.name ||
        matched.employee_name ||
        matched.full_name ||
        stored.name,
      id:
        matched.emp_code ||
        matched.employee_code ||
        matched.employee_id ||
        stored.id,
      email: matched.email || matched.work_email || stored.email,
      avatar:
        getProfileImageValue(
          matched.profile_image ||
          matched.profileImage ||
          matched.photo ||
          matched.photo_url ||
          matched.avatar ||
          matched.avatar_url ||
          matched.image
        ) || stored.avatar || profileFallback,
    };
  }, [people]);

  const ownAttendanceRow = useMemo(() => {
    const code = String(currentEmployee.id || "").toLowerCase();
    const name = String(currentEmployee.name || "").toLowerCase();

    return (attendance ?? []).find((row) => {
      const rowCode = String(
        row.emp_code ||
        row.employee_code ||
        row.employee_id ||
        ""
      ).toLowerCase();

      const rowName = String(
        row.employee_name ||
        row.name ||
        ""
      ).toLowerCase();

      return (
        (code !== "—" && code && rowCode === code) ||
        (name && rowName === name)
      );
    }) || null;
  }, [attendance, currentEmployee]);

  const alreadyPunchedIn =
    Boolean(punchState.checkIn) ||
    Boolean(
      ownAttendanceRow &&
      ownAttendanceRow.checkIn &&
      ownAttendanceRow.checkIn !== "-"
    );

  const alreadyPunchedOut =
    Boolean(punchState.checkOut) ||
    Boolean(
      ownAttendanceRow &&
      ownAttendanceRow.checkOut &&
      ownAttendanceRow.checkOut !== "-"
    );

  const punchRecordTime = (type) =>
    punchState[type] ||
    (type === "checkIn"
      ? ownAttendanceRow?.checkIn
      : ownAttendanceRow?.checkOut) ||
    null;

  const refreshAfterPunch = async (type, time) => {
    const next = {
      ...punchState,
      [type]: time,
    };

    try {
      localStorage.setItem(
        `employee-punch-${getTodayKey()}`,
        JSON.stringify(next)
      );
    } catch {
      // Local persistence is best-effort.
    }

    setPunchState(next);
    await loadDashboard();
  };

  /* Chart colours have to be real values, not CSS vars - recharts writes
     them into SVG attributes. Swap the set with the theme. */
  const palette = isDark
    ? { grid: "#2e2846", axis: "#857da0", bar: "#9575f5", surface: "#1c1830", line: "#2e2846", ink: "#f2f0f7" }
    : { grid: "#eceaf4", axis: "#9a97ad", bar: "#5b3df5", surface: "#ffffff", line: "#e7e5f0", ink: "#191735" };

  const deptColours = isDark
    ? ["#9575f5", "#38bdf8", "#34d399", "#fbbf24", "#f87171", "#c4b5fd"]
    : ["#5b3df5", "#0284c7", "#16a34a", "#e8871e", "#dc2626", "#a78bfa"];

  const chartTooltip = {
    contentStyle: {
      background: palette.surface,
      border: `1px solid ${palette.line}`,
      borderRadius: 10,
      fontSize: 12,
      color: palette.ink,
      boxShadow: "0 4px 16px rgba(25,23,53,0.10)",
    },
    labelStyle: { color: palette.axis, fontSize: 11, marginBottom: 2 },
    cursor: { fill: isDark ? "rgba(149,117,245,0.08)" : "rgba(91,61,245,0.05)" },
  };

  /* ---------- states ---------- */
  if (loading) {
    return (
      <Shell expanded={expanded} setExpanded={setExpanded}>
        <div className="dash-skeleton">
          <div className="sk sk-head" />
          <div className="sk sk-panel" />
          <div className="sk-row">
            <div className="sk sk-metric" /><div className="sk sk-metric" />
            <div className="sk sk-metric" /><div className="sk sk-metric" />
          </div>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell expanded={expanded} setExpanded={setExpanded}>
        <div className="dash-panel dash-error">
          <p className="dash-empty-title">Can't load the dashboard</p>
          <p className="dash-empty-body">{error}</p>
          <button className="dash-btn dash-btn-primary" onClick={loadDashboard}>Try again</button>
        </div>
      </Shell>
    );
  }

  const inPct = headcount ? Math.round((today.present / headcount) * 100) : null;
  const joinDelta = roster.joinedThisMonth - roster.joinedLastMonth;
  const unreadNotifications = notifications.filter((item) => item?.unread).length;

  const markNotificationRead = (id) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, unread: false } : item))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
  };

  return (
    <Shell expanded={expanded} setExpanded={setExpanded}>
      <header className="dash-head">
        <div className="dash-head-actions">
          <div className="dash-live-clock" aria-live="polite">
            <span className="dash-live-dot" />
            <span>{formatLiveTime(now)}</span>
          </div>

          <div className="dash-notification-wrap">
            <button
              type="button"
              className="dash-icon-btn"
              onClick={() => setShowNotifications((value) => !value)}
              aria-label="Open notifications"
              aria-expanded={showNotifications}
            >
              <PiBellBold />
              {unreadNotifications > 0 && (
                <span className="dash-notification-count">{unreadNotifications}</span>
              )}
            </button>

            {showNotifications && (
              <div className="dash-notification-panel">
                <div className="dash-notification-panel-head">
                  <div>
                    <strong>Notifications</strong>
                    <span>{unreadNotifications ? `${unreadNotifications} unread` : "All caught up"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    disabled={!unreadNotifications}
                  >
                    Mark all read
                  </button>
                </div>

                <div className="dash-notification-list">
                  {notifications.length === 0 ? (
                    <div className="dash-notification-empty">
                      <PiBellBold />
                      <span>No notifications yet.</span>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`dash-notification-item ${item.unread ? "is-unread" : ""}`}
                        onClick={() => markNotificationRead(item.id)}
                      >
                        <span className="dash-notification-item-dot" />
                        <span className="dash-notification-item-copy">
                          <strong>{item.title}</strong>
                          <span>{item.message}</span>
                          <small>{item.time}</small>
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  className="dash-notification-view-all"
                  onClick={() => {
                    setShowNotifications(false);
                    navigate("/dashboard_emp/notifications");
                  }}
                >
                  View all notifications <PiArrowRightBold />
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="dash-head-avatar"
            onClick={() => navigate("/dashboard_emp/profile")}
            aria-label="Open my profile"
            title="My Profile"
          >
            {currentEmployee.avatar ? (
              <img
                src={currentEmployee.avatar}
                alt={currentEmployee.name}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span>{getInitials(currentEmployee.name)}</span>
            )}
          </button>

          <button className="dash-btn dash-btn-quiet" onClick={loadDashboard}>
            <PiArrowsClockwiseBold /> Refresh
          </button>
        </div>
      </header>

      {/* ---------- KPI row ---------- */}
      <section className="dash-metrics">
        <Metric
          label="On the team"
          value={headcount}
          note="Active profiles"
          onClick={() => navigate("/dashboard_emp/profile")}
          delta={roster.joinedThisMonth ? { dir: joinDelta >= 0 ? "up" : "down", text: `${roster.joinedThisMonth} joined this month` } : null}
        />
        <Metric
          label="In today"
          value={today.rows.length ? today.present : "—"}
          onClick={() => navigate("/dashboard_emp/attendance")}
          note={today.rows.length ? `${today.absent} not in` : "No data yet"}
          delta={inPct !== null && today.rows.length ? { dir: inPct >= 80 ? "up" : "down", text: `${inPct}% of team` } : null}
        />
        <Metric
          label="Arrived late"
          value={today.rows.length ? today.late : "—"}
          onClick={() => navigate("/dashboard_emp/attendance")}
          note={today.rows.length ? "Flagged on punch-in" : "No data yet"}
          tone={today.late > 0 ? "warn" : undefined}
        />
        <Metric
          label="Avg hours logged"
          value={today.avgHours ?? "—"}
          onClick={() => navigate("/dashboard_emp/attendance")}
          note={today.avgHours ? "Across those present" : "No data yet"}
        />
      </section>

      <section className="dash-quick-actions" aria-label="Employee quick actions">
        <button type="button" className="dash-quick-card is-leave" onClick={() => navigate("/dashboard_emp/leave")}>
          <span className="dash-quick-icon"><PiCalendarCheckBold /></span>
          <span><strong>Request Leave</strong><small>Apply and track leave</small></span>
          <PiArrowRightBold />
        </button>
        <button type="button" className="dash-quick-card is-regularization" onClick={() => navigate("/dashboard_emp/regularization")}>
          <span className="dash-quick-icon"><PiClockBold /></span>
          <span><strong>Regularization</strong><small>Correct attendance records</small></span>
          <PiArrowRightBold />
        </button>
        <button type="button" className="dash-quick-card is-payslip" onClick={() => navigate("/dashboard_emp/payslips")}>
          <span className="dash-quick-icon"><PiFileTextBold /></span>
          <span><strong>View Payslips</strong><small>Open salary history</small></span>
          <PiArrowRightBold />
        </button>
        <button type="button" className="dash-quick-card is-profile" onClick={() => navigate("/dashboard_emp/profile")}>
          <span className="dash-quick-icon"><PiUserCircleBold /></span>
          <span><strong>Manage Profile</strong><small>Update your information</small></span>
          <PiArrowRightBold />
        </button>
      </section>

      {/* ---------- roll call ---------- */}
      <section className="dash-panel dash-rollcall">
        <div className="dash-panel-head">
          <div>
            <h2>Today's Attendance</h2>
            <p className="dash-panel-sub">
              Record your check-in and check-out securely.
            </p>
          </div>

          <div className="dash-punch-status">
            <span className={`dash-punch-state ${alreadyPunchedIn ? "is-done" : ""}`}>
              <i />
              {alreadyPunchedIn
                ? `Checked in ${punchRecordTime("checkIn")}`
                : "Not checked in"}
            </span>

            {alreadyPunchedOut && (
              <span className="dash-punch-state is-done">
                <i />
                Checked out {punchRecordTime("checkOut")}
              </span>
            )}
          </div>
        </div>

        <div className="dash-punch-actions">
          <button
            type="button"
            className="dash-punch-btn dash-punch-in"
            onClick={() => setPunchModal("in")}
            disabled={alreadyPunchedIn}
          >
            <span className="dash-punch-icon">
              <PiCameraBold />
            </span>
            <span>
              <strong>
                {alreadyPunchedIn
                  ? "Punch In Recorded"
                  : "Punch In"}
              </strong>
              <small>
                {alreadyPunchedIn
                  ? `Recorded at ${punchRecordTime("checkIn")}`
                  : "Verify identity with camera & location"}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="dash-punch-btn dash-punch-out"
            onClick={() => setPunchModal("out")}
            disabled={!alreadyPunchedIn || alreadyPunchedOut}
          >
            <span className="dash-punch-icon">
              <PiArrowClockwiseBold />
            </span>
            <span>
              <strong>
                {alreadyPunchedOut
                  ? "Punch Out Recorded"
                  : "Punch Out"}
              </strong>
              <small>
                {alreadyPunchedOut
                  ? `Recorded at ${punchRecordTime("checkOut")}`
                  : !alreadyPunchedIn
                    ? "Punch in first to enable check-out"
                    : "Verify identity with camera & location"}
              </small>
            </span>
          </button>
        </div>

        <div className="dash-punch-employee">
          <span className="dash-punch-avatar">
            {currentEmployee.avatar ? (
              <img
                src={currentEmployee.avatar}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              getInitials(currentEmployee.name)
            )}
          </span>

          <div>
            <strong>{currentEmployee.name}</strong>
            <span>
              Employee ID · {currentEmployee.id}
            </span>
          </div>
        </div>

        {today.rows.length === 0 ? (
          <div className="dash-empty">
            <p className="dash-empty-title">
              No team punches recorded yet
            </p>
            <p className="dash-empty-body">
              Your punch actions above remain available even when the daily team roll is empty.
            </p>
          </div>
        ) : (
          <>
            <div
              className="dash-roll"
              role="img"
              aria-label={`${today.present} present, ${today.late} late, ${today.absent} absent`}
            >
              {today.roll.map((p, i) => (
                <span
                  key={`${p.code}-${i}`}
                  className={`dash-stripe is-${p.state}`}
                  title={`${p.code} — ${p.state}${p.checkIn && p.checkIn !== "-"
                    ? ` at ${p.checkIn}`
                    : ""
                    }`}
                />
              ))}
            </div>

            <ul className="dash-legend">
              <li>
                <i className="is-present" />
                On time <b>{today.present - today.late}</b>
              </li>
              <li>
                <i className="is-late" />
                Late <b>{today.late}</b>
              </li>
              <li>
                <i className="is-absent" />
                Absent <b>{today.absent}</b>
              </li>
            </ul>
          </>
        )}
      </section>

      {/* ---------- charts ---------- */}
      <section className="dash-split dash-split-wide">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2>Joiners</h2>
            <p className="dash-panel-sub">Last 6 months</p>
          </div>
          {!roster.hasJoinDates ? (
            <div className="dash-empty">
              <p className="dash-empty-title">No joining dates recorded</p>
              <p className="dash-empty-body">
                This fills in once employee profiles carry a joining date.
              </p>
            </div>
          ) : (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={roster.joiners} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={palette.grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false}
                    tick={{ fill: palette.axis, fontSize: 11 }} dy={6} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false}
                    tick={{ fill: palette.axis, fontSize: 11 }} width={44} />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="joined" name="Joined" fill={palette.bar} radius={[5, 5, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2>By department</h2>
            {roster.departments.length > 0 && (
              <p className="dash-panel-sub">{roster.departments.length} shown</p>
            )}
          </div>
          {roster.departments.length === 0 ? (
            <div className="dash-empty">
              <p className="dash-empty-title">No departments yet</p>
              <p className="dash-empty-body">Assign departments to see the split.</p>
            </div>
          ) : (
            <div className="dash-donut-wrap">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={roster.departments} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={54} outerRadius={82}
                    paddingAngle={2} stroke="none">
                    {roster.departments.map((d, i) => (
                      <Cell key={d.name} fill={deptColours[i % deptColours.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="dash-donut-key">
                {roster.departments.map((d, i) => (
                  <li key={d.name}>
                    <i style={{ background: deptColours[i % deptColours.length] }} />
                    <span>{d.name}</span>
                    <b>{d.value}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ---------- breakdown + table ---------- */}
      <section className="dash-split">
        <div className="dash-panel">
          <div className="dash-panel-head"><h2>Employment type</h2></div>
          {headcount === 0 ? (
            <div className="dash-empty">
              <p className="dash-empty-title">No employees yet</p>
              <p className="dash-empty-body">Add your first employee to see the breakdown.</p>
            </div>
          ) : (
            <Breakdown total={headcount} rows={[
              { label: "Full-time", value: stats.full_time },
              { label: "Contract", value: stats.contract },
              { label: "Probation", value: stats.probation },
            ]} />
          )}
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2>Checked in</h2>
            {today.rows.length > 8 && (
              <p className="dash-panel-sub">Showing 8 of {today.rows.length}</p>
            )}
          </div>
          {today.rows.length === 0 ? (
            <div className="dash-empty">
              <p className="dash-empty-title">Nothing to show</p>
              <p className="dash-empty-body">Check-ins appear here through the day.</p>
            </div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr><th>Employee</th><th>In</th><th>Hours</th><th>Note</th></tr>
              </thead>
              <tbody>
                {today.rows.slice(0, 8).map((r, i) => (
                  <tr key={`${r.emp_code}-${i}`}>
                    <td className="mono">{r.emp_code}</td>
                    <td className="mono">{r.checkIn}</td>
                    <td className="mono">{r.prodHours}</td>
                    <td>
                      <span className={`dash-tag ${/late/i.test(r.remark ?? "") ? "is-late" : ""}`}>
                        {r.remark}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <button
        type="button"
        className="dash-faq-fab"
        onClick={() => navigate("/dashboard_emp/faq")}
        aria-label="Open frequently asked questions"
      >
        <PiQuestionBold />
        <span>FAQ</span>
      </button>

      {punchModal && (
        <PunchModal
          mode={punchModal}
          employee={currentEmployee}
          onClose={() => setPunchModal(null)}
          onComplete={async (type, time) => {
            await refreshAfterPunch(type, time);
            setPunchModal(null);
          }}
        />
      )}
    </Shell>
  );
};

/* ---------- small pieces ---------- */


const PunchModal = ({
  mode,
  employee,
  onClose,
  onComplete,
}) => {
  const isPunchIn = mode === "in";

  const [now, setNow] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [permissionMessage, setPermissionMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [stream, setStream] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selfie, setSelfie] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(new Date()),
      1000
    );

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(
        "Location is not supported by this browser."
      );
      return undefined;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(
            position.coords.accuracy || 0
          ),
        });
        setLocationError("");
      },
      () => {
        setLocationError(
          "Location permission was denied. Enable location access to continue."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );

    return undefined;
  }, []);

  useEffect(() => {
    if (!stream || !videoRef.current) return;

    videoRef.current.srcObject = stream;

    videoRef.current.play().catch(() => { });
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const openCamera = async () => {
    setCameraError("");
    setPermissionMessage("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is not supported by this browser."
      );
      return;
    }

    try {
      const nextStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

      setStream(nextStream);
      setCameraOpen(true);
    } catch (error) {
      console.error("Camera permission error:", error);
      setCameraError(
        "Camera permission was denied. Allow camera access and try again."
      );
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream
        .getTracks()
        .forEach((track) => track.stop());
    }

    setStream(null);
    setCameraOpen(false);
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (!video.videoWidth || !video.videoHeight) {
      setCameraError(
        "Camera is still starting. Please try again."
      );
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    setSelfie(
      canvas.toDataURL("image/jpeg", 0.86)
    );

    closeCamera();
  };

  const retakeSelfie = () => {
    setSelfie("");
    openCamera();
  };

  const submitPunch = async () => {
    if (!location) {
      setPermissionMessage(
        "Location is required before confirming your punch."
      );
      return;
    }

    if (!selfie) {
      setPermissionMessage(
        "Please capture a selfie before confirming your punch."
      );
      return;
    }

    setSaving(true);
    setSaveError("");
    setPermissionMessage("");

    const token = localStorage.getItem("token");

    const payload = {
      employee_id: employee.id,
      employee_name: employee.name,
      punch_type: isPunchIn
        ? "check_in"
        : "check_out",
      timestamp: new Date().toISOString(),
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      selfie,
    };

    const endpoints = [
      `${API_BASE_URL}/api/v1/attendance/punch`,
      `${API_BASE_URL}/attendance/punch`,
      isPunchIn ? `${API_BASE_URL}/attendance/punch-in` : `${API_BASE_URL}/attendance/punch-out`,
      isPunchIn ? `${API_BASE_URL}/attendance/check-in` : `${API_BASE_URL}/attendance/check-out`,
      isPunchIn ? `${API_BASE_URL}/api/v1/attendance/punch-in` : `${API_BASE_URL}/api/v1/attendance/punch-out`,
    ];

    try {
      let response = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const nextResponse = await fetch(
            endpoint,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                ...(token
                  ? {
                    Authorization: `Bearer ${token}`,
                  }
                  : {}),
                "x-emp-code": employee?.id || employee?.emp_code || "",
              },
              body: JSON.stringify(payload),
            }
          );

          if (nextResponse.ok) {
            response = nextResponse;
            break;
          }

          lastError = new Error(
            `Punch request failed with ${nextResponse.status}`
          );
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) {
        throw (
          lastError ||
          new Error(
            "Unable to save attendance punch."
          )
        );
      }

      setSuccess(true);

      window.setTimeout(() => {
        onComplete(
          isPunchIn ? "checkIn" : "checkOut",
          formatPunchTime(new Date())
        );
      }, 900);
    } catch (error) {
      console.error(
        "Punch submission error:",
        error
      );

      setSaveError(
        "Couldn't save the punch. Check that the attendance API is running and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="dash-punch-overlay"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <div className="dash-punch-modal">
        <div className="dash-punch-modal-head">
          <div>
            <span className="dash-punch-eyebrow">
              ATTENDANCE VERIFICATION
            </span>

            <h2>
              {isPunchIn
                ? "Punch In"
                : "Punch Out"}
            </h2>

            <p>
              Verify your identity before recording this attendance event.
            </p>
          </div>

          <button
            type="button"
            className="dash-punch-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close attendance verification"
          >
            <PiXBold />
          </button>
        </div>

        {success ? (
          <div className="dash-punch-success">
            <span className="dash-punch-success-icon">
              <PiCheckCircleBold />
            </span>

            <h3>
              {isPunchIn
                ? "Punch In Successful"
                : "Punch Out Successful"}
            </h3>

            <strong>
              {formatPunchTime(new Date())}
            </strong>

            <p>
              Your attendance record has been submitted successfully.
            </p>
          </div>
        ) : (
          <>
            <div className="dash-punch-meta-grid">
              <div className="dash-punch-meta-card">
                <span className="dash-punch-meta-icon">
                  <PiUserCircleBold />
                </span>

                <div>
                  <small>EMPLOYEE</small>
                  <strong>{employee.name}</strong>
                  <span>
                    ID · {employee.id}
                  </span>
                </div>
              </div>

              <div className="dash-punch-meta-card">
                <span className="dash-punch-meta-icon">
                  <PiClockBold />
                </span>

                <div>
                  <small>LIVE TIME</small>
                  <strong>
                    {formatLiveTime(now)}
                  </strong>
                  <span>
                    {now.toLocaleDateString(
                      undefined,
                      {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </span>
                </div>
              </div>

              <div className="dash-punch-meta-card">
                <span
                  className={`dash-punch-location-icon ${location ? "is-ready" : ""
                    }`}
                >
                  <PiMapPinBold />
                </span>

                <div>
                  <small>LOCATION</small>
                  <strong>
                    {location
                      ? "Location captured"
                      : "Waiting for location"}
                  </strong>
                  <span>
                    {location
                      ? `${location.latitude.toFixed(
                        5
                      )}, ${location.longitude.toFixed(
                        5
                      )}`
                      : locationError ||
                      "Requesting GPS permission"}
                  </span>
                </div>
              </div>
            </div>

            <div className="dash-camera-card">
              <div className="dash-camera-head">
                <div>
                  <span className="dash-punch-eyebrow">
                    IDENTITY VERIFICATION
                  </span>

                  <h3>Attendance selfie</h3>
                </div>

                {cameraOpen && (
                  <span className="dash-camera-live">
                    <i />
                    Camera live
                  </span>
                )}
              </div>

              <div className="dash-camera-stage">
                {selfie ? (
                  <img
                    src={selfie}
                    alt="Attendance selfie preview"
                  />
                ) : cameraOpen ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                  />
                ) : (
                  <div className="dash-camera-placeholder">
                    <span>
                      <PiCameraBold />
                    </span>

                    <strong>
                      No camera preview
                    </strong>

                    <small>
                      Open the camera to capture your attendance selfie.
                    </small>
                  </div>
                )}
              </div>

              <canvas
                ref={canvasRef}
                className="dash-camera-canvas"
                aria-hidden="true"
              />

              {(cameraError ||
                locationError ||
                permissionMessage ||
                saveError) && (
                  <div className="dash-punch-error">
                    {cameraError ||
                      locationError ||
                      permissionMessage ||
                      saveError}
                  </div>
                )}

              <div className="dash-camera-actions">
                {!cameraOpen && !selfie && (
                  <button
                    type="button"
                    className="dash-camera-btn dash-camera-primary"
                    onClick={openCamera}
                  >
                    <PiCameraBold />
                    Open Camera
                  </button>
                )}

                {cameraOpen && (
                  <>
                    <button
                      type="button"
                      className="dash-camera-btn dash-camera-primary"
                      onClick={captureSelfie}
                    >
                      <PiCameraBold />
                      Capture Selfie
                    </button>

                    <button
                      type="button"
                      className="dash-camera-btn"
                      onClick={closeCamera}
                    >
                      <PiXBold />
                      Close Camera
                    </button>
                  </>
                )}

                {selfie && (
                  <>
                    <button
                      type="button"
                      className="dash-camera-btn"
                      onClick={retakeSelfie}
                    >
                      <PiArrowClockwiseBold />
                      Retake
                    </button>

                    <span className="dash-selfie-ready">
                      <PiCheckCircleBold />
                      Selfie ready
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="dash-punch-note">
              <span>
                <PiCheckCircleBold />
              </span>

              Your exact punch time and GPS location will be submitted with this attendance record.
            </div>

            <div className="dash-punch-footer">
              <button
                type="button"
                className="dash-camera-btn dash-punch-cancel"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="dash-punch-confirm"
                onClick={submitPunch}
                disabled={
                  saving ||
                  !location ||
                  !selfie
                }
              >
                {saving
                  ? "Submitting..."
                  : "Confirm Punch"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Shell = ({ expanded, setExpanded, children }) => (
  <div className="dash-shell">
    <Sidebar expanded={expanded} setExpanded={setExpanded} />
    <main className="dash-main" style={{ marginLeft: expanded ? 260 : 76 }}>
      <div className="dash-inner">{children}</div>
    </main>
  </div>
);

const Metric = ({ label, value, note, tone, delta, onClick }) => (
  <button
    type="button"
    className={`dash-metric${tone ? ` is-${tone}` : ""}`}
    onClick={onClick}
    disabled={!onClick}
    aria-label={`${label}: ${value}`}
  >
    <p className="dash-metric-label">{label}</p>
    <div className="dash-metric-row">
      <p className="dash-metric-value">{value}</p>
      {delta && (
        <span className={`dash-delta is-${delta.dir}`}>
          {delta.dir === "up" ? <PiTrendUpBold /> : <PiTrendDownBold />}
          {delta.text}
        </span>
      )}
    </div>
    <p className="dash-metric-note">{note}</p>
  </button>
);

const Breakdown = ({ rows, total }) => {
  const counted = rows.reduce((s, r) => s + (r.value || 0), 0);
  const unset = total - counted;

  return (
    <div className="dash-breakdown">
      {rows.map((r) => (
        <div className="dash-bd-row" key={r.label}>
          <span className="dash-bd-label">{r.label}</span>
          <span className="dash-bd-track">
            <span className="dash-bd-fill"
              style={{ width: total ? `${((r.value || 0) / total) * 100}%` : 0 }} />
          </span>
          <span className="dash-bd-value">{r.value || 0}</span>
        </div>
      ))}
      {unset > 0 && (
        <p className="dash-bd-foot">
          {unset} {unset === 1 ? "profile has" : "profiles have"} no employment type set.
        </p>
      )}
    </div>
  );
};

export default Dashboard;
