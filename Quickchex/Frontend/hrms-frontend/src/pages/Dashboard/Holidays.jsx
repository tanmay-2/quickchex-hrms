import { useState, useEffect, useRef, useContext } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import "./Holidays.css";

const CALENDAR_YEAR = 2026;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstWeekdayOfMonth = (year, month) => new Date(year, month, 1).getDay();



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
  const [activeFilter, setActiveFilter] = useState("All");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const listItemRefs = useRef({});
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/leave/holidays")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const now = new Date();
          const mapped = data.map((h, i) => {
            const hDate = new Date(h.date);
            const isPassed = !isNaN(hDate.getTime()) && hDate < now;
            return {
              id: h.id || i + 1,
              name: h.name || h.title || "Holiday",
              date: h.date,
              day: h.day || (isNaN(hDate.getTime()) ? "" : hDate.toLocaleDateString("en-US", { weekday: "long" })),
              type: h.type || "Gazetted",
              status: isPassed ? "Passed" : "Upcoming",
            };
          });
          setHolidays(mapped);
        }
      })
      .catch((err) => console.warn("Failed to load holidays:", err));
  }, []);

  const filteredHolidays =
    activeFilter === "All"
      ? holidays
      : holidays.filter((h) => h.type === activeFilter || h.status === activeFilter);

  // Counts for tabs
  const tabCounts = {
    All: holidays.length,
    Public: holidays.filter((h) => h.type === "Public").length,
    National: holidays.filter((h) => h.type === "National").length,
    Optional: holidays.filter((h) => h.type === "Optional").length,
    Upcoming: holidays.filter((h) => h.status === "Upcoming").length,
  };

  // Reset to relevant month whenever calendar is opened
  useEffect(() => {
    if (showCalendar) setCalendarMonth(7);
  }, [showCalendar]);

  // Keep holiday list in sync with current visible month in modal
  useEffect(() => {
    if (!showCalendar) return;
    const match = holidays.find((h) => new Date(h.date).getMonth() === calendarMonth);
    const node = match && listItemRefs.current[match.id];
    if (node) node.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [calendarMonth, showCalendar, holidays]);

  const daysInMonth = getDaysInMonth(CALENDAR_YEAR, calendarMonth);
  const firstWeekday = getFirstWeekdayOfMonth(CALENDAR_YEAR, calendarMonth);
  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const holidaysInMonth = holidays.filter(
    (h) => new Date(h.date).getMonth() === calendarMonth
  );
  const getHolidayForDay = (day) =>
    holidaysInMonth.find((h) => new Date(h.date).getDate() === day);

  const isPrevDisabled = calendarMonth === 0;
  const isNextDisabled = calendarMonth === 11;
  const goToPrevMonth = () => {
    if (!isPrevDisabled) setCalendarMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (!isNextDisabled) setCalendarMonth((m) => m + 1);
  };

  return (
    <div className="hol-page-container">
      {/* ── TOP ACTION BAR ── */}
      <section className="hol-top-action-bar">
        <div className="hol-header-controls">
          <button
            type="button"
            className="hol-btn-primary"
            onClick={() => setShowCalendar(true)}
          >
            <CalendarDays size={16} />
            <span>Calendar View</span>
          </button>
        </div>
      </section>

      {/* ── NEXT UPCOMING HOLIDAY FEATURE CARD ── */}
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
            <h3 className="hol-feature-title">Independence Day</h3>
            <div className="hol-feature-meta">
              <span>Saturday, August 15, 2026</span>
              <span className="dot-sep" />
              <span>National Holiday</span>
              <span className="dot-sep" />
              <span style={{ color: "var(--hol-primary)", fontWeight: 600 }}>
                2 days remaining
              </span>
            </div>
          </div>
        </div>

        <div className="hol-feature-right">
          <button
            type="button"
            className="hol-feature-action-btn"
            onClick={() => {
              setCalendarMonth(7);
              setShowCalendar(true);
            }}
          >
            <span>View Month</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* ── FILTER TABS BAR ── */}
      <section className="hol-tabs-bar">
        {["All", "Public", "National", "Optional", "Upcoming"].map((filter) => (
          <button
            key={filter}
            type="button"
            className={`hol-tab-btn ${activeFilter === filter ? "active" : ""}`}
            onClick={() => setActiveFilter(filter)}
          >
            <span>{filter}</span>
            <span className="hol-tab-badge">{tabCounts[filter]}</span>
          </button>
        ))}
      </section>

      {/* ── HOLIDAY CARDS GRID ── */}
      <section className="hol-grid">
        {filteredHolidays.map((holiday) => {
          const categoryClass = String(holiday.type || "public").toLowerCase();
          const statusClass = String(holiday.status || "upcoming").toLowerCase();

          return (
            <div
              key={holiday.id}
              className="hol-card"
              onClick={() => {
                const month = new Date(holiday.date).getMonth();
                setCalendarMonth(month);
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
                    {holiday.date} • {holiday.day}
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
            aria-label="2026 Holiday Calendar"
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
                    {MONTH_NAMES[calendarMonth]} {CALENDAR_YEAR}
                  </h3>
                  <div className="hol-cal-nav-buttons">
                    <button
                      type="button"
                      className="hol-cal-nav-btn"
                      onClick={goToPrevMonth}
                      disabled={isPrevDisabled}
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="hol-cal-nav-btn"
                      onClick={goToNextMonth}
                      disabled={isNextDisabled}
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

                <div className="hol-cal-grid" key={calendarMonth}>
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
                    return (
                      <button
                        type="button"
                        key={day}
                        className={`hol-day-cell ${holiday ? "is-holiday" : ""}`}
                        title={
                          holiday
                            ? `${holiday.name} (${holiday.type})`
                            : `${MONTH_NAMES[calendarMonth]} ${day}, ${CALENDAR_YEAR}`
                        }
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side Listing of Holidays */}
              <div className="hol-cal-side">
                <div className="hol-cal-side-head">
                  <h4 className="hol-cal-side-title">All Holidays</h4>
                  <span className="hol-cal-side-year">{CALENDAR_YEAR}</span>
                </div>

                <div className="hol-side-items">
                  {holidays.map((holiday) => {
                    const isActiveMonth =
                      new Date(holiday.date).getMonth() === calendarMonth;
                    return (
                      <div
                        key={holiday.id}
                        className={`hol-side-item ${isActiveMonth ? "is-active-month" : ""
                          }`}
                        ref={(el) => {
                          listItemRefs.current[holiday.id] = el;
                        }}
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