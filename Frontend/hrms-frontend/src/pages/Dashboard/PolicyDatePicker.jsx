// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - POLICYDATEPICKER.JSX
// Path: Frontend/hrms-frontend/src/pages/Dashboard/PolicyDatePicker.jsx
// Purpose: Web portal page component managing 'PolicyDatePicker' views, user interactions, and state.
// UI Components:
//   • <MONTH_NAMES />
//   • <WEEKDAYS />
//   • <PolicyDatePicker />
// Key Functions & Handlers:
//   • handleClickOutside()
//   • handleKeyDown()
//   • handlePrevMonth()
//   • handleNextMonth()
//   • handleSelectDay()
//   • handleToday()
//   • handleClear()
//   • isDaySelected()
//   • ... and 1 more handlers
// ==============================================================================

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  PiCalendarBlankDuotone,
  PiCaretLeftBold,
  PiCaretRightBold,
  PiCaretDownBold,
} from "react-icons/pi";
import "./PolicyDatePicker.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Safely parse a date string (supports DD-MM-YYYY, YYYY-MM-DD, or ISO strings)
 */
export function parsePolicyDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  // Check DD-MM-YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  // Check YYYY-MM-DD
  const yyyymmdd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatToDDMMYYYY(date) {
  if (!date || isNaN(date.getTime())) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

export default function PolicyDatePicker({
  id,
  value,
  onChange,
  placeholder = "dd-mm-yyyy",
  alignRight = false,
  rightIconType = "calendar", // "calendar" | "chevron"
  isOpen,
  onToggle,
  onClose,
  disabled = false,
}) {
  const containerRef = useRef(null);

  // Parse currently selected date
  const selectedDate = useMemo(() => parsePolicyDate(value), [value]);

  // Calendar view state (month & year)
  const [viewYear, setViewYear] = useState(() => {
    return selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    return selectedDate ? selectedDate.getMonth() : new Date().getMonth();
  });

  // Keep view aligned when value changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  // Handle outside click & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (onClose) onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (onClose) onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Month navigation
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

  // Day selection
  const handleSelectDay = (date) => {
    if (disabled) return;
    const formatted = formatToDDMMYYYY(date);
    onChange(formatted);
    if (onClose) onClose();
  };

  // Today action
  const handleToday = (e) => {
    e.stopPropagation();
    if (disabled) return;
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onChange(formatToDDMMYYYY(today));
    if (onClose) onClose();
  };

  // Clear action
  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange("");
    if (onClose) onClose();
  };

  // Generate 7-column calendar grid
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Previous month overflow days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(viewYear, viewMonth - 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      days.push({
        day: d,
        date,
        isCurrentMonth: true,
      });
    }

    // Next month overflow days (fill 35 or 42 slots)
    const totalSlots = days.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const date = new Date(viewYear, viewMonth + 1, d);
      days.push({
        day: d,
        date,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Is day selected
  const isDaySelected = (date) => {
    if (!selectedDate || !date) return false;
    return (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    );
  };

  const isCurrentToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const displayString = selectedDate ? formatToDDMMYYYY(selectedDate) : "";

  return (
    <div
      ref={containerRef}
      className={`pol-date-container ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}
    >
      <button
        type="button"
        id={id}
        className={`pol-date-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => {
          if (!disabled && onToggle) onToggle();
        }}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="pol-date-trigger-left">
          <PiCalendarBlankDuotone className="pol-date-trigger-icon" size={17} />
          <span className={`pol-date-value ${!displayString ? "is-placeholder" : ""}`}>
            {displayString || placeholder}
          </span>
        </div>
        <div className="pol-date-trigger-right">
          {rightIconType === "chevron" ? (
            <PiCaretDownBold className="pol-date-caret-icon" size={13} />
          ) : (
            <PiCalendarBlankDuotone className="pol-date-trigger-icon-alt" size={15} />
          )}
        </div>
      </button>

      {isOpen && (
        <div
          className={`pol-cal-popover ${alignRight ? "align-right" : ""}`}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="pol-cal-header">
            <button
              type="button"
              className="pol-cal-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <PiCaretLeftBold size={14} />
            </button>
            <span className="pol-cal-title">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              className="pol-cal-nav-btn"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <PiCaretRightBold size={14} />
            </button>
          </div>

          {/* Weekdays */}
          <div className="pol-cal-weekdays">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="pol-cal-weekday">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="pol-cal-grid">
            {calendarDays.map((item, idx) => {
              const isSelected = isDaySelected(item.date);
              const isTodayDate = isCurrentToday(item.date);

              return (
                <button
                  key={idx}
                  type="button"
                  className={`pol-cal-day ${
                    item.isCurrentMonth ? "is-current-month" : "is-other-month"
                  } ${isSelected ? "is-selected" : ""} ${
                    isTodayDate ? "is-today" : ""
                  }`}
                  onClick={() => handleSelectDay(item.date)}
                >
                  <span className="pol-cal-day-num">{item.day}</span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pol-cal-footer">
            <button
              type="button"
              className="pol-cal-clear-btn"
              onClick={handleClear}
            >
              Clear
            </button>
            <button
              type="button"
              className="pol-cal-today-btn"
              onClick={handleToday}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
