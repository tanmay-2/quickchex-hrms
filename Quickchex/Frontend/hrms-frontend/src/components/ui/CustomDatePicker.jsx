import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Check,
} from "lucide-react";
import "./CustomDatePicker.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Helper to parse YYYY-MM-DD or DD-MM-YYYY safely
 */
function parseDateString(str) {
  if (!str) return null;
  if (typeof str !== "string") return null;

  // Check YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Check DD-MM-YYYY
  const ddmmyyyyMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateToISO(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = SHORT_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select date...",
  disabled = false,
  required = false,
  minDate = null,
  maxDate = null,
  className = "",
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current selected date
  const selectedDate = useMemo(() => parseDateString(value), [value]);

  // Current month & year being viewed in the calendar
  const [viewYear, setViewYear] = useState(() => {
    return selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    return selectedDate ? selectedDate.getMonth() : new Date().getMonth();
  });

  // Selector mode: "days" | "months" | "years"
  const [selectorMode, setSelectorMode] = useState("days");

  // Keep view aligned when value changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSelectorMode("days");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle month changes
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Select day
  const handleSelectDay = (day, monthOffset = 0) => {
    if (disabled) return;
    const targetDate = new Date(viewYear, viewMonth + monthOffset, day);
    const isoString = formatDateToISO(targetDate);
    onChange(isoString);
    setIsOpen(false);
    setSelectorMode("days");
  };

  // Quick preset buttons
  const handleSetToday = () => {
    const today = new Date();
    onChange(formatDateToISO(today));
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleSetYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    onChange(formatDateToISO(yest));
    setViewYear(yest.getFullYear());
    setViewMonth(yest.getMonth());
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange("");
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Previous month overflow days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        monthOffset: -1,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        monthOffset: 0,
      });
    }

    // Next month overflow days (to fill 35 or 42 grid slots)
    const totalSlots = days.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        monthOffset: 1,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Today reference
  const today = new Date();
  const isCurrentToday = (day, monthOffset) => {
    const d = new Date(viewYear, viewMonth + monthOffset, day);
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isDaySelected = (day, monthOffset) => {
    if (!selectedDate) return false;
    const d = new Date(viewYear, viewMonth + monthOffset, day);
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Years list for quick selector
  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let y = currentYear - 10; y <= currentYear + 10; y++) {
      list.push(y);
    }
    return list;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`c-datepicker-container ${disabled ? "is-disabled" : ""} ${
        isOpen ? "is-open" : ""
      } ${className}`}
      id={id}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className="c-datepicker-trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="c-datepicker-trigger-left">
          <CalendarIcon size={16} className="c-datepicker-calendar-icon" />
          <span className={`c-datepicker-value-text ${!selectedDate ? "is-placeholder" : ""}`}>
            {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
          </span>
        </div>

        <div className="c-datepicker-trigger-right">
          {selectedDate && !disabled && (
            <span
              className="c-datepicker-clear-btn"
              title="Clear date"
              onClick={handleClear}
            >
              <X size={13} />
            </span>
          )}
        </div>
      </button>

      {/* Floating Popover Calendar */}
      {isOpen && (
        <div className="c-datepicker-popover" role="dialog" aria-modal="true">
          {/* Quick Presets Bar */}
          <div className="c-datepicker-presets">
            <button
              type="button"
              className="c-dp-preset-btn"
              onClick={handleSetToday}
            >
              Today
            </button>
            <button
              type="button"
              className="c-dp-preset-btn"
              onClick={handleSetYesterday}
            >
              Yesterday
            </button>
          </div>

          {/* Header Month / Year Navigation */}
          <div className="c-datepicker-header">
            <button
              type="button"
              className="c-dp-nav-btn"
              onClick={handlePrevMonth}
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="c-dp-title-wrap">
              <button
                type="button"
                className="c-dp-month-select-btn"
                onClick={() =>
                  setSelectorMode((m) => (m === "months" ? "days" : "months"))
                }
              >
                {MONTH_NAMES[viewMonth]}
              </button>
              <button
                type="button"
                className="c-dp-year-select-btn"
                onClick={() =>
                  setSelectorMode((m) => (m === "years" ? "days" : "years"))
                }
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              className="c-dp-nav-btn"
              onClick={handleNextMonth}
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* View Modes */}
          {selectorMode === "months" && (
            <div className="c-dp-months-grid">
              {MONTH_NAMES.map((name, idx) => (
                <button
                  key={name}
                  type="button"
                  className={`c-dp-month-cell ${idx === viewMonth ? "is-selected" : ""}`}
                  onClick={() => {
                    setViewMonth(idx);
                    setSelectorMode("days");
                  }}
                >
                  {SHORT_MONTHS[idx]}
                </button>
              ))}
            </div>
          )}

          {selectorMode === "years" && (
            <div className="c-dp-years-grid">
              {yearsList.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  className={`c-dp-year-cell ${yr === viewYear ? "is-selected" : ""}`}
                  onClick={() => {
                    setViewYear(yr);
                    setSelectorMode("days");
                  }}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          {selectorMode === "days" && (
            <>
              {/* Days of Week Row */}
              <div className="c-datepicker-weekdays">
                {WEEKDAYS.map((wd) => (
                  <span key={wd} className="c-dp-weekday">
                    {wd}
                  </span>
                ))}
              </div>

              {/* Day Cells Matrix */}
              <div className="c-datepicker-days-grid">
                {calendarDays.map((item, idx) => {
                  const isSelected = isDaySelected(item.day, item.monthOffset);
                  const isToday = isCurrentToday(item.day, item.monthOffset);

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`c-dp-day-cell ${
                        item.isCurrentMonth ? "is-current-month" : "is-overflow"
                      } ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                      onClick={() => handleSelectDay(item.day, item.monthOffset)}
                    >
                      <span className="c-dp-day-number">{item.day}</span>
                      {isToday && !isSelected && <span className="c-dp-today-dot" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer Bar */}
          <div className="c-datepicker-footer">
            <button
              type="button"
              className="c-dp-footer-link"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                handleSetToday();
              }}
            >
              Today ({new Date().getDate()} {SHORT_MONTHS[new Date().getMonth()]})
            </button>

            <button
              type="button"
              className="c-dp-footer-done-btn"
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
