import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
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
 * Helper to parse YYYY-MM-DD or DD-MM-YYYY safely without timezone shift
 */
function parseDateString(str) {
  if (!str) return null;
  if (typeof str !== "string") return null;

  // Check YYYY-MM-DD
  const isoMatch = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Check DD-MM-YYYY
  const ddmmyyyyMatch = str.trim().match(/^(\d{2})-(\d{2})-(\d{4})/);
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
  return `${day} ${month} ${year}`;
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
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: "bottom" });

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

  // Calculate viewport positioning for the portal
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const isMobile = window.innerWidth <= 480;
    if (isMobile) {
      setCoords({ top: window.innerHeight / 2, left: 12, placement: "center", isMobile: true });
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 286;
    const popoverHeight = 350;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    let top = rect.bottom + 6;
    let placement = "bottom";
    if (top + popoverHeight > window.innerHeight - 12 && rect.top - popoverHeight - 6 > 12) {
      top = rect.top - popoverHeight - 6;
      placement = "top";
    }

    setCoords({ top, left, placement, isMobile: false });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Click outside to close and Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSelectorMode("days");
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSelectorMode("days");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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

  // Set Today
  const handleSetToday = () => {
    const today = new Date();
    onChange(formatDateToISO(today));
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Clear date
  const handleClear = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (disabled) return;
    onChange("");
    setIsOpen(false);
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
        onClick={() => {
          if (!disabled) {
            updatePosition();
            setIsOpen((prev) => !prev);
          }
        }}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="c-datepicker-trigger-left">
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
          <CalendarIcon size={16} className="c-datepicker-calendar-icon" />
        </div>
      </button>

      {/* Floating Popover Calendar portaled to document.body */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {coords.isMobile && (
              <div
                className="c-datepicker-backdrop"
                onClick={() => {
                  setIsOpen(false);
                  setSelectorMode("days");
                }}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.45)",
                  backdropFilter: "blur(2px)",
                  zIndex: 999998,
                }}
              />
            )}
            <div
              ref={popoverRef}
              className={`c-datepicker-popover c-datepicker-portal placement-${coords.placement} ${
                coords.isMobile ? "is-mobile-centered" : ""
              }`}
              style={{
                position: "fixed",
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 999999,
              }}
              role="dialog"
              aria-modal="true"
            >
            {/* Header Month / Year Navigation */}
            <div className="c-datepicker-header">
              <button
                type="button"
                className="c-dp-nav-btn"
                onClick={handlePrevMonth}
                title="Previous Month"
                aria-label="Previous Month"
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
                  title="Select Month"
                >
                  {MONTH_NAMES[viewMonth]}
                </button>
                <button
                  type="button"
                  className="c-dp-year-select-btn"
                  onClick={() =>
                    setSelectorMode((m) => (m === "years" ? "days" : "years"))
                  }
                  title="Select Year"
                >
                  {viewYear}
                </button>
              </div>

              <button
                type="button"
                className="c-dp-nav-btn"
                onClick={handleNextMonth}
                title="Next Month"
                aria-label="Next Month"
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

            {/* Footer Bar: Clear on left, Today on right */}
            <div className="c-datepicker-footer">
              <button
                type="button"
                className="c-dp-footer-link c-dp-clear-link"
                onClick={handleClear}
                title="Clear selected date"
              >
                Clear
              </button>

              <button
                type="button"
                className="c-dp-footer-link c-dp-today-link"
                onClick={handleSetToday}
                title="Select today"
              >
                Today
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
