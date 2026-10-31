// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - HOLIDAYS.JSX
// Path: Frontend/hrms-frontend/src/pages/Dashboard/Holidays.jsx
// Purpose: Web portal page component managing 'Holidays' views, user interactions, and state.
// UI Components:
//   • <MONTH_NAMES />
//   • <BASELINE_HOLIDAYS />
//   • <Holidays />
//   • <HolidaysContent />
// Key Functions & Handlers:
//   • getDaysInMonth()
//   • getFirstWeekdayOfMonth()
//   • getHolidayForDay()
//   • goToPrevMonth()
//   • goToNextMonth()
//   • goToToday()
//   • handleOpenCalendar()
//   • parseHolidayDate()
// ==============================================================================

import { useState, useEffect, useRef, useContext, useMemo } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import "./Holidays.css";
import { getApiUrl } from "../../services/apiClient";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstWeekdayOfMonth = (year, month) => new Date(year, month, 1).getDay();

/** Parse a holiday object or date string into a local midnight Date object */
function parseHolidayDate(h) {
  if (!h) return null;
  const iso = h.isoDate || (typeof h === "string" ? h : h.date);
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (h.date) {
    const d = new Date(h.date);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }
  return null;
}

/** Standard baseline holidays to ensure coverage across current and upcoming months/years */
const BASELINE_HOLIDAYS = [
  // 2026 Schedule
  { id: 1, name: "Republic Day", date: "26 Jan 2026", isoDate: "2026-01-26", day: "Monday", type: "National", calType: "HOLIDAY" },
  { id: 2, name: "Holi", date: "14 Mar 2026", isoDate: "2026-03-14", day: "Saturday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 3, name: "Independence Day", date: "15 Aug 2026", isoDate: "2026-08-15", day: "Saturday", type: "National", calType: "HOLIDAY" },
  { id: 4, name: "Holiday", date: "04 Sep 2026", isoDate: "2026-09-04", day: "Friday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 5, name: "Holiday", date: "14 Sep 2026", isoDate: "2026-09-14", day: "Monday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 6, name: "Gandhi Jayanti", date: "02 Oct 2026", isoDate: "2026-10-02", day: "Friday", type: "National", calType: "HOLIDAY" },
  { id: 7, name: "Dussehra", date: "20 Oct 2026", isoDate: "2026-10-20", day: "Tuesday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 8, name: "Diwali", date: "08 Nov 2026", isoDate: "2026-11-08", day: "Sunday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 9, name: "Christmas", date: "25 Dec 2026", isoDate: "2026-12-25", day: "Friday", type: "Gazetted", calType: "HOLIDAY" },

  // 2027 Schedule (Upcoming year)
  { id: 101, name: "New Year's Day", date: "01 Jan 2027", isoDate: "2027-01-01", day: "Friday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 102, name: "Republic Day", date: "26 Jan 2027", isoDate: "2027-01-26", day: "Tuesday", type: "National", calType: "HOLIDAY" },
  { id: 103, name: "Maha Shivratri", date: "06 Mar 2027", isoDate: "2027-03-06", day: "Saturday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 104, name: "Holi", date: "24 Mar 2027", isoDate: "2027-03-24", day: "Wednesday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 105, name: "Good Friday", date: "26 Mar 2027", isoDate: "2027-03-26", day: "Friday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 106, name: "Eid al-Fitr", date: "31 Mar 2027", isoDate: "2027-03-31", day: "Wednesday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 107, name: "May Day", date: "01 May 2027", isoDate: "2027-05-01", day: "Saturday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 108, name: "Independence Day", date: "15 Aug 2027", isoDate: "2027-08-15", day: "Sunday", type: "National", calType: "HOLIDAY" },
  { id: 109, name: "Gandhi Jayanti", date: "02 Oct 2027", isoDate: "2027-10-02", day: "Saturday", type: "National", calType: "HOLIDAY" },
  { id: 110, name: "Dussehra", date: "10 Oct 2027", isoDate: "2027-10-10", day: "Sunday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 111, name: "Diwali", date: "29 Oct 2027", isoDate: "2027-10-29", day: "Friday", type: "Gazetted", calType: "HOLIDAY" },
  { id: 112, name: "Christmas", date: "25 Dec 2027", isoDate: "2027-12-25", day: "Saturday", type: "Gazetted", calType: "HOLIDAY" },
];

/* ============================================================
   ROOT COMPONENT WITH SHELL INTEGRATION
   ============================================================ */
export default function Holidays(props) {
  const isInsideShell = useContext(DashboardShellContext);

  if (!isInsideShell) {
    return (
      <DashboardShell>
        <HolidaysContent {...props} />
      </DashboardShell>
    );
  }

  return <HolidaysContent {...props} />;
}

/* ============================================================
   CONTENT COMPONENT
   ============================================================ */
function HolidaysContent() {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [activeFilter, setActiveFilter] = useState("All");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const listItemRefs = useRef({});
  const [holidays, setHolidays] = useState([]);

  // Fetch real holidays and merge with baseline calendar
  useEffect(() => {
    Promise.all([
      fetch(getApiUrl("/api/v1/leave/holidays"))
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch(getApiUrl("/api/v1/calendar?status_filter=HOLIDAY"))
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch(getApiUrl("/api/v1/calendar?status_filter=WEEKLY_OFF"))
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
    ]).then(([legacyHols, calHols, calWeekoffs]) => {
      const mapByIso = new Map();

      // 1. Load baseline schedule
      BASELINE_HOLIDAYS.forEach((h) => {
        const d = parseHolidayDate(h);
        const iso = h.isoDate || (d ? d.toISOString().slice(0, 10) : "");
        if (iso) {
          mapByIso.set(iso, {
            ...h,
            isoDate: iso,
            status: d && d.getTime() < today.getTime() ? "Passed" : d && d.getTime() === today.getTime() ? "Today" : "Upcoming",
          });
        }
      });

      // 2. Merge legacy holidays from backend
      (Array.isArray(legacyHols) ? legacyHols : []).forEach((h, i) => {
        const d = parseHolidayDate(h);
        const iso = h.isoDate || (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "");
        if (!iso) return;
        const isPassed = d && d.getTime() < today.getTime();
        const isToday = d && d.getTime() === today.getTime();
        mapByIso.set(iso, {
          id: h.id || `leg-${i + 1}`,
          name: h.name || h.title || "Holiday",
          date: h.date || (d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : iso),
          isoDate: iso,
          day: h.day || (d ? d.toLocaleDateString("en-US", { weekday: "long" }) : ""),
          type: h.type || "Gazetted",
          calType: "HOLIDAY",
          status: isToday ? "Today" : isPassed ? "Passed" : "Upcoming",
        });
      });

      // 3. Merge calendar HOLIDAY entries
      (Array.isArray(calHols) ? calHols : []).forEach((h) => {
        const iso = h.date ? h.date.slice(0, 10) : "";
        if (!iso) return;
        const d = parseHolidayDate(h);
        const isPassed = d && d.getTime() < today.getTime();
        const isToday = d && d.getTime() === today.getTime();
        mapByIso.set(iso, {
          id: `cal-h-${iso}`,
          name: h.holiday_name || "Holiday",
          date: d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : iso,
          isoDate: iso,
          day: d ? d.toLocaleDateString("en-US", { weekday: "long" }) : "",
          type: "Gazetted",
          calType: "HOLIDAY",
          status: isToday ? "Today" : isPassed ? "Passed" : "Upcoming",
        });
      });

      // 4. Merge calendar WEEKLY_OFF entries
      (Array.isArray(calWeekoffs) ? calWeekoffs : []).forEach((h) => {
        const iso = h.date ? h.date.slice(0, 10) : "";
        if (!iso) return;
        const d = parseHolidayDate(h);
        const isPassed = d && d.getTime() < today.getTime();
        const isToday = d && d.getTime() === today.getTime();
        mapByIso.set(`wo-${iso}`, {
          id: `cal-wo-${iso}`,
          name: "Weekly Off",
          date: d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : iso,
          isoDate: iso,
          day: d ? d.toLocaleDateString("en-US", { weekday: "long" }) : "",
          type: "Weekly Off",
          calType: "WEEKLY_OFF",
          status: isToday ? "Today" : isPassed ? "Passed" : "Upcoming",
        });
      });

      const list = Array.from(mapByIso.values());
      list.sort((a, b) => (a.isoDate || "").localeCompare(b.isoDate || ""));
      setHolidays(list);
    });
  }, [today]);

  // Compute Next Upcoming Holiday dynamically relative to current date
  const { nextHoliday, nextHolidayDate, diffDays, remainingText } = useMemo(() => {
    const upcomingList = holidays
      .filter((h) => {
        const d = parseHolidayDate(h);
        return d && d.getTime() >= today.getTime() && h.calType !== "WEEKLY_OFF";
      })
      .sort((a, b) => {
        const da = parseHolidayDate(a);
        const db = parseHolidayDate(b);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
      });

    const chosen = upcomingList[0] || holidays.find((h) => h.calType !== "WEEKLY_OFF") || holidays[0];
    const d = parseHolidayDate(chosen);
    let diff = 0;
    let label = "";

    if (d) {
      diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) label = "Today";
      else if (diff === 1) label = "Tomorrow (1 day remaining)";
      else if (diff > 1) label = `${diff} days remaining`;
      else label = "Past Holiday";
    }

    return {
      nextHoliday: chosen,
      nextHolidayDate: d,
      diffDays: diff,
      remainingText: label,
    };
  }, [holidays, today]);

  // Dynamic filter for Current Month & Upcoming Months
  const filteredHolidays = useMemo(() => {
    if (activeFilter === "All") return holidays;
    if (activeFilter === "This Month") {
      return holidays.filter((h) => {
        const d = parseHolidayDate(h);
        return (
          d &&
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth()
        );
      });
    }
    if (activeFilter === "Upcoming") {
      return holidays.filter((h) => {
        const d = parseHolidayDate(h);
        return d && d.getTime() >= today.getTime();
      });
    }
    if (activeFilter === "Holiday") {
      return holidays.filter(
        (h) => h.calType === "HOLIDAY" || (h.type !== "Weekly Off" && !h.calType)
      );
    }
    if (activeFilter === "Weekly Off") {
      return holidays.filter((h) => h.calType === "WEEKLY_OFF");
    }
    if (activeFilter === "National") {
      return holidays.filter((h) => h.type === "National");
    }
    return holidays.filter((h) => h.type === activeFilter || h.status === activeFilter);
  }, [activeFilter, holidays, today]);

  // Dynamic tab counts
  const tabCounts = useMemo(() => ({
    All: holidays.length,
    "This Month": holidays.filter((h) => {
      const d = parseHolidayDate(h);
      return (
        d &&
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth()
      );
    }).length,
    Upcoming: holidays.filter((h) => {
      const d = parseHolidayDate(h);
      return d && d.getTime() >= today.getTime();
    }).length,
    Holiday: holidays.filter((h) => h.calType === "HOLIDAY" || h.type !== "Weekly Off").length,
    "Weekly Off": holidays.filter((h) => h.calType === "WEEKLY_OFF").length,
    National: holidays.filter((h) => h.type === "National").length,
  }), [holidays, today]);

  // Keep side list in sync with current visible month in modal
  useEffect(() => {
    if (!showCalendar) return;
    const match = holidays.find((h) => {
      const d = parseHolidayDate(h);
      return d && d.getFullYear() === calendarYear && d.getMonth() === calendarMonth;
    });
    const node = match && listItemRefs.current[match.id];
    if (node) node.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [calendarMonth, calendarYear, showCalendar, holidays]);

  // Calendar calculations
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstWeekday = getFirstWeekdayOfMonth(calendarYear, calendarMonth);
  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const holidaysInMonth = useMemo(() => {
    return holidays.filter((h) => {
      const d = parseHolidayDate(h);
      return d && d.getFullYear() === calendarYear && d.getMonth() === calendarMonth;
    });
  }, [holidays, calendarYear, calendarMonth]);

  const getHolidayForDay = (day) => {
    return holidaysInMonth.find((h) => {
      const d = parseHolidayDate(h);
      return d && d.getDate() === day;
    });
  };

  const goToPrevMonth = () => {
    setCalendarMonth((m) => {
      if (m === 0) {
        setCalendarYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const goToNextMonth = () => {
    setCalendarMonth((m) => {
      if (m === 11) {
        setCalendarYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const goToToday = () => {
    setCalendarYear(today.getFullYear());
    setCalendarMonth(today.getMonth());
  };

  // Open calendar focused on current month by default
  const handleOpenCalendar = () => {
    setCalendarYear(today.getFullYear());
    setCalendarMonth(today.getMonth());
    setShowCalendar(true);
  };

  return (
    <div className="hol-page-container">
      {/* ── TOP ACTION BAR ── */}
      <section className="hol-top-action-bar">
        <div className="hol-header-controls">
          <button
            type="button"
            className="hol-btn-primary"
            onClick={handleOpenCalendar}
          >
            <CalendarDays size={16} />
            <span>Calendar View</span>
          </button>
        </div>
      </section>

      {/* ── NEXT UPCOMING HOLIDAY FEATURE CARD (DYNAMIC) ── */}
      {nextHoliday && (
        <section className="hol-feature-card">
          <div className="hol-feature-left">
            <div className="hol-feature-icon-box">
              <Calendar size={26} />
            </div>
            <div className="hol-feature-info">
              <span className="hol-feature-eyebrow">
                <Sparkles size={13} />
                Next Upcoming Holiday
              </span>
              <h3 className="hol-feature-title">{nextHoliday.name}</h3>
              <div className="hol-feature-meta">
                <span>
                  {nextHoliday.day ? `${nextHoliday.day}, ` : ""}
                  {nextHoliday.date}
                </span>
                <span className="dot-sep" />
                <span>{nextHoliday.type}</span>
                {remainingText && (
                  <>
                    <span className="dot-sep" />
                    <span style={{ color: "var(--hol-primary)", fontWeight: 600 }}>
                      {remainingText}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hol-feature-right">
            <button
              type="button"
              className="hol-feature-action-btn"
              onClick={() => {
                if (nextHolidayDate) {
                  setCalendarYear(nextHolidayDate.getFullYear());
                  setCalendarMonth(nextHolidayDate.getMonth());
                } else {
                  setCalendarYear(today.getFullYear());
                  setCalendarMonth(today.getMonth());
                }
                setShowCalendar(true);
              }}
            >
              <span>View Month</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      )}

      {/* ── FILTER TABS BAR (INCLUDES THIS MONTH & UPCOMING) ── */}
      <section className="hol-tabs-bar">
        {["All", "This Month", "Upcoming", "Holiday", "Weekly Off", "National"].map(
          (filter) => (
            <button
              key={filter}
              type="button"
              className={`hol-tab-btn ${activeFilter === filter ? "active" : ""}`}
              onClick={() => setActiveFilter(filter)}
            >
              <span>{filter}</span>
              <span className="hol-tab-badge">{tabCounts[filter] || 0}</span>
            </button>
          )
        )}
      </section>

      {/* ── HOLIDAY CARDS GRID ── */}
      {filteredHolidays.length === 0 ? (
        <div className="hol-empty-card">
          <Calendar size={36} className="hol-empty-icon" />
          <h4 className="hol-empty-title">No holidays found</h4>
          <p className="hol-empty-desc">
            There are no holidays listed for the selected filter ({activeFilter}). Try selecting{" "}
            <strong>Upcoming</strong> or <strong>All</strong> to view the entire schedule.
          </p>
        </div>
      ) : (
        <section className="hol-grid">
          {filteredHolidays.map((holiday) => {
            const categoryClass = String(holiday.type || "public").toLowerCase().replace(/\s+/g, "-");
            const statusClass = String(holiday.status || "upcoming").toLowerCase();

            return (
              <div
                key={holiday.id}
                className="hol-card"
                onClick={() => {
                  const d = parseHolidayDate(holiday);
                  if (d) {
                    setCalendarYear(d.getFullYear());
                    setCalendarMonth(d.getMonth());
                  }
                  setShowCalendar(true);
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="hol-card-top">
                  <div className="hol-icon-box">
                    <Calendar size={18} />
                  </div>
                  <span className={`hol-category-badge ${categoryClass}`}>
                    {holiday.type}
                  </span>
                </div>

                <div className="hol-card-body">
                  <h4 className="hol-card-title">{holiday.name}</h4>
                  <p className="hol-card-date">
                    <Clock size={13} />
                    <span>
                      {holiday.date} {holiday.day ? `• ${holiday.day}` : ""}
                    </span>
                  </p>
                </div>

                <div className="hol-card-footer">
                  <span className={`hol-status-pill ${statusClass}`}>
                    <span className="dot" />
                    {holiday.status}
                  </span>
                  <span className="hol-action-arrow">
                    <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── INTERACTIVE CALENDAR MODAL ── */}
      {showCalendar && (
        <div
          className="hol-modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCalendar(false);
          }}
        >
          <div
            className="hol-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${calendarYear} Holiday Calendar`}
          >
            {/* Modal Header */}
            <div className="hol-modal-header">
              <div className="hol-modal-title-wrap">
                <span className="hol-modal-kicker">Official Schedule</span>
                <h2 className="hol-modal-title">Company Holiday Calendar</h2>
              </div>
              <button
                type="button"
                className="hol-modal-close-btn"
                aria-label="Close calendar"
                onClick={() => setShowCalendar(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="hol-modal-body">
              {/* Calendar Grid View */}
              <div className="hol-cal-main">
                <div className="hol-cal-nav">
                  <h3 className="hol-cal-month-title">
                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                  </h3>
                  <div className="hol-cal-nav-buttons">
                    <button
                      type="button"
                      className="hol-cal-today-btn"
                      onClick={goToToday}
                      title="Jump to current month"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="hol-cal-nav-btn"
                      onClick={goToPrevMonth}
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="hol-cal-nav-btn"
                      onClick={goToNextMonth}
                      aria-label="Next month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="hol-cal-weekdays">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="hol-cal-grid" key={`${calendarYear}-${calendarMonth}`}>
                  {calendarCells.map((day, idx) => {
                    if (day === null) {
                      return (
                        <div
                          key={`blank-${idx}`}
                          className="hol-day-blank"
                          aria-hidden="true"
                        />
                      );
                    }
                    const holiday = getHolidayForDay(day);
                    const isTodayCell =
                      calendarYear === today.getFullYear() &&
                      calendarMonth === today.getMonth() &&
                      day === today.getDate();

                    const isWeeklyOff =
                      holiday?.calType === "WEEKLY_OFF" ||
                      (!holiday && (idx % 7 === 0)); // Sundays

                    return (
                      <button
                        type="button"
                        key={day}
                        className={`hol-day-cell ${holiday ? "is-holiday" : ""} ${
                          isTodayCell ? "is-today" : ""
                        } ${isWeeklyOff && !holiday ? "is-weekly-off" : ""}`}
                        title={
                          holiday
                            ? `${holiday.name} (${holiday.type})`
                            : isTodayCell
                            ? `Today: ${MONTH_NAMES[calendarMonth]} ${day}, ${calendarYear}`
                            : `${MONTH_NAMES[calendarMonth]} ${day}, ${calendarYear}`
                        }
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-legend for quick reading */}
                <div className="hol-cal-legend">
                  <div className="hol-legend-item">
                    <span className="hol-legend-dot holiday" />
                    <span>Holiday</span>
                  </div>
                  <div className="hol-legend-item">
                    <span className="hol-legend-dot today" />
                    <span>Today</span>
                  </div>
                  <div className="hol-legend-item">
                    <span className="hol-legend-dot weekend" />
                    <span>Weekend / Off</span>
                  </div>
                </div>
              </div>

              {/* Side Listing of Holidays */}
              <div className="hol-cal-side">
                <div className="hol-cal-side-head">
                  <h4 className="hol-cal-side-title">Holidays in {calendarYear}</h4>
                  <span className="hol-cal-side-year">{calendarYear}</span>
                </div>

                <div className="hol-side-items">
                  {holidays
                    .filter((h) => {
                      const d = parseHolidayDate(h);
                      return d && d.getFullYear() === calendarYear && h.calType !== "WEEKLY_OFF";
                    })
                    .map((holiday) => {
                      const d = parseHolidayDate(holiday);
                      const isActiveMonth = d && d.getMonth() === calendarMonth;

                      return (
                        <div
                          key={holiday.id}
                          className={`hol-side-item ${isActiveMonth ? "is-active-month" : ""}`}
                          ref={(el) => {
                            listItemRefs.current[holiday.id] = el;
                          }}
                          onClick={() => {
                            if (d) {
                              setCalendarYear(d.getFullYear());
                              setCalendarMonth(d.getMonth());
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="hol-side-date-badge">
                            <span>{holiday.date.split(" ")[0]}</span>
                            <span style={{ fontSize: "13px" }}>
                              {holiday.date.split(" ")[1]?.replace(",", "")}
                            </span>
                          </div>
                          <div className="hol-side-item-content">
                            <span className="hol-side-name">{holiday.name}</span>
                            <span className="hol-side-meta">
                              {holiday.day} • {holiday.type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}