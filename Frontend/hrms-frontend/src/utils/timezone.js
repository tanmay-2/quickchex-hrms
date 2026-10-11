/**
 * Timezone utilities for QuickChex HRMS.
 * All attendance punch timestamps, displays, and daily comparisons
 * are strictly grounded in India Standard Time (IST), timezone Asia/Kolkata.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats any time input (string, ISO timestamp, Date object) to 12-hour format 'hh:mm AM/PM' in IST.
 * Example: '07:10 AM', '12:40 PM'
 */
export function formatIstTime(val, fallback = '—') {
  if (!val || val === '—' || val === '-' || val === '--') return fallback;

  if (typeof val === 'string') {
    const s = val.trim();
    // 1. If already in 12-hour format: e.g. "07:10 AM" or "7:10 am"
    const match12 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (match12) {
      const h = match12[1].padStart(2, '0');
      const m = match12[2];
      const p = match12[3].toUpperCase();
      return `${h}:${m} ${p}`;
    }

    // 2. If simple 24-hour time string without date: e.g. "13:45" or "07:10:00"
    const match24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
    if (match24) {
      let h = parseInt(match24[1], 10);
      const m = match24[2];
      const p = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${String(h).padStart(2, '0')}:${m} ${p}`;
    }
  }

  try {
    let d;
    if (typeof val === 'string') {
      const s = val.trim();
      // Handle SQL naive format: "2026-10-03 12:40:00"
      if (!s.includes('T') && s.includes(' ') && s.includes('-')) {
        d = new Date(s.replace(' ', 'T') + '+05:30');
      } else if (!s.includes('Z') && !s.includes('+') && !s.slice(10).includes('-')) {
        // ISO string without timezone offset: e.g. "2026-10-03T12:40:00"
        d = new Date(s + '+05:30');
      } else {
        d = new Date(s);
      }
    } else {
      d = val;
    }

    if (isNaN(d.getTime())) return String(val) || fallback;

    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(d);

    const hour = parts.find((p) => p.type === 'hour')?.value.padStart(2, '0') || '12';
    const minute = parts.find((p) => p.type === 'minute')?.value.padStart(2, '0') || '00';
    const dayPeriod = (parts.find((p) => p.type === 'dayPeriod')?.value || 'AM').toUpperCase();
    return `${hour}:${minute} ${dayPeriod}`;
  } catch {
    return String(val) || fallback;
  }
}

/**
 * Returns today's date in 'YYYY-MM-DD' format based on Asia/Kolkata timezone.
 */
export function getIstTodayKey() {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a given record date corresponds to today in Asia/Kolkata timezone.
 */
export function isIstTodayRecord(recDate) {
  if (!recDate) return false;
  const localToday = getIstTodayKey();
  const d1 = String(recDate).trim().toLowerCase();

  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(now);

  const dayStr = parts.find((p) => p.type === 'day')?.value;
  const day2Str = dayStr?.padStart(2, '0');
  const monthStr = parts.find((p) => p.type === 'month')?.value.toLowerCase();
  const yearStr = parts.find((p) => p.type === 'year')?.value;

  const t1 = `${day2Str} ${monthStr} ${yearStr}`.toLowerCase();
  const t2 = `${dayStr} ${monthStr} ${yearStr}`.toLowerCase();

  if (d1 === t1 || d1 === t2 || d1 === localToday) return true;

  try {
    const parsed = new Date(recDate);
    if (!isNaN(parsed.getTime())) {
      const pParts = new Intl.DateTimeFormat('en-IN', {
        timeZone: IST_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(parsed);
      const py = pParts.find((p) => p.type === 'year')?.value;
      const pm = pParts.find((p) => p.type === 'month')?.value;
      const pd = pParts.find((p) => p.type === 'day')?.value;
      return `${py}-${pm}-${pd}` === localToday;
    }
  } catch {}

  return false;
}

export default {
  IST_TIMEZONE,
  formatIstTime,
  getIstTodayKey,
  isIstTodayRecord,
};
