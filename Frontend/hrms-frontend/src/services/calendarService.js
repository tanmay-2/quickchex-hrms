// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - CALENDARSERVICE.JS
// Path: Frontend/hrms-frontend/src/services/calendarService.js
// Purpose: API network client service coordinating HTTP requests and caching for 'calendarService'.
// Key Functions & Handlers:
//   • toIsoDateStr()
// ==============================================================================

/**
 * Organization Calendar Service
 * ================================
 * Centralized calendar API client for HRMS.
 * Fetches HOLIDAY / WEEKLY_OFF data from the backend for any given month/year.
 *
 * Usage:
 *   import { fetchCalendar, getCalendarEntry, isHoliday, isWeeklyOff } from './calendarService';
 *
 *   const entries = await fetchCalendar({ year: 2026, month: 10 });
 *   const isOff = isWeeklyOff(entries, '2026-10-04');
 *   const hol   = isHoliday(entries, '2026-10-02');
 */

import { getApiUrl } from "./apiClient";

/**
 * Fetch organization calendar entries from the backend.
 * @param {{ year?: number, month?: number, status?: string }} options
 * @returns {Promise<Array<{id, date, status, holiday_name, description}>>}
 */
export async function fetchCalendar({ year, month, status } = {}) {
  const params = new URLSearchParams();
  if (year) params.set("year", year);
  if (month) params.set("month", month);
  if (status) params.set("status_filter", status);

  const url = getApiUrl(`/api/v1/calendar?${params.toString()}`);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Fetch a single calendar entry for a specific date.
 * @param {string} dateStr ISO date string (YYYY-MM-DD)
 * @returns {Promise<{id, date, status, holiday_name, description}|null>}
 */
export async function fetchCalendarEntry(dateStr) {
  const url = getApiUrl(`/api/v1/calendar/${dateStr}`);
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Build a lookup map from an array of calendar entries.
 * Key: "YYYY-MM-DD"  →  Value: entry object
 * @param {Array} entries
 * @returns {Object}
 */
export function buildCalendarMap(entries) {
  const map = {};
  if (!Array.isArray(entries)) return map;
  for (const entry of entries) {
    if (entry && entry.date) {
      // Normalize to YYYY-MM-DD
      const key = entry.date.slice(0, 10);
      map[key] = entry;
    }
  }
  return map;
}

/**
 * Check if a date is a HOLIDAY in the given calendar map.
 * @param {Object} calMap  — result of buildCalendarMap()
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isHoliday(calMap, date) {
  const key = toIsoDateStr(date);
  return key ? (calMap[key]?.status === "HOLIDAY") : false;
}

/**
 * Check if a date is WEEKLY_OFF in the given calendar map.
 * @param {Object} calMap  — result of buildCalendarMap()
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isWeeklyOff(calMap, date) {
  const key = toIsoDateStr(date);
  return key ? (calMap[key]?.status === "WEEKLY_OFF") : false;
}

/**
 * Get the holiday name for a date (or null).
 * @param {Object} calMap
 * @param {string|Date} date
 * @returns {string|null}
 */
export function getHolidayName(calMap, date) {
  const key = toIsoDateStr(date);
  if (!key) return null;
  const entry = calMap[key];
  return (entry?.status === "HOLIDAY" ? entry.holiday_name : null) || null;
}

/**
 * Given a date, return its display status string for attendance views.
 * Returns: "HOLIDAY" | "WEEKLY OFF" | null
 */
export function getCalendarStatus(calMap, date) {
  const key = toIsoDateStr(date);
  if (!key || !calMap[key]) return null;
  const s = calMap[key].status;
  if (s === "HOLIDAY") return "HOLIDAY";
  if (s === "WEEKLY_OFF") return "WEEKLY OFF";
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toIsoDateStr(date) {
  if (!date) return null;
  if (typeof date === "string") return date.slice(0, 10);
  if (date instanceof Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}
