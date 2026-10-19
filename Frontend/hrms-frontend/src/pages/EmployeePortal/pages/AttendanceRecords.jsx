import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Calendar, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  X,
  Smartphone
} from 'lucide-react';
import api from '../api';

function generateMonthOptions() {
  const options = [];
  const now = new Date();
  // Generate options for past 24 months and next 12 months
  for (let i = 12; i >= -24; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1
    });
  }
  return options;
}

const MONTH_OPTIONS = generateMonthOptions();
// Default to September 2026 or current active month
const DEFAULT_INDEX = Math.max(0, MONTH_OPTIONS.findIndex(m => m.month === (new Date().getMonth() + 1) && m.year === new Date().getFullYear()));

export default function AttendanceRecords() {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(DEFAULT_INDEX >= 0 ? DEFAULT_INDEX : 0);
  const [overviewRange, setOverviewRange] = useState(4);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedDailyLog, setSelectedDailyLog] = useState(null);

  const activeMonth = MONTH_OPTIONS[selectedMonthIndex] || MONTH_OPTIONS[0];

  // Fetch dynamic monthly data directly from backend database & calendar
  useEffect(() => {
    let mounted = true;

    const fetchSummary = (silent = false) => {
      if (!silent) setLoading(true);
      api.getMonthlyAttendanceSummary(activeMonth.year, activeMonth.month, overviewRange)
        .then((res) => {
          if (mounted && res) {
            setData(res);
          }
        })
        .catch((err) => {
          console.warn('Failed to load monthly attendance summary:', err.message);
        })
        .finally(() => {
          if (mounted && !silent) setLoading(false);
        });
    };

    fetchSummary(false);
    const interval = setInterval(() => fetchSummary(true), 5000);
    const handleSync = () => fetchSummary(true);
    window.addEventListener('focus', handleSync);
    window.addEventListener('attendance-updated', handleSync);
    window.addEventListener('regularization-updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('attendance-updated', handleSync);
      window.removeEventListener('regularization-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [activeMonth.year, activeMonth.month, overviewRange]);

  const records = data?.records || [];
  const summary = data?.summary || {
    presentDays: 0.0,
    absentDays: 0.0,
    invalidDays: 0.0,
    approvedLeaves: 0.0,
    holidays: 0.0,
    weeklyOff: 0.0,
    totalWorkedHours: '00:00'
  };

  const overview = data?.overview || [];

  // Dynamic pagination calculation
  const totalRecords = records.length;
  const effectivePageSize = pageSize === 0 ? (totalRecords || 1) : pageSize;
  const totalPages = Math.ceil(totalRecords / effectivePageSize) || 1;
  const startIndex = (currentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, totalRecords);
  const currentRecords = pageSize === 0 ? records : records.slice(startIndex, endIndex);

  // Worked hours calculator: accurately calculates hours between check-in and check-out
  const formatWorkedHours = (record) => {
    const inTime = record.checkIn || record.check_in;
    const outTime = record.checkOut || record.check_out;
    if (!inTime || inTime === '—' || inTime === '-') return '—';
    if (!outTime || outTime === '—' || outTime === '-') return '—';

    const rawHrs = record.workingHrs || record.hours || record.duration;
    if (rawHrs && rawHrs !== '—' && rawHrs !== '0h 00m' && rawHrs !== '0hr 0min' && rawHrs !== '0.00' && rawHrs !== '0') {
      return rawHrs;
    }

    try {
      const parseTime = (tStr) => {
        const match = String(tStr).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (!match) return null;
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[4]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };
      const startMins = parseTime(inTime);
      const endMins = parseTime(outTime);
      if (startMins !== null && endMins !== null && endMins >= startMins) {
        const diff = endMins - startMins;
        const hrs = Math.floor(diff / 60);
        const mins = diff % 60;
        return `${hrs}h ${String(mins).padStart(2, '0')}m`;
      }
    } catch (e) {
      console.error('Hours calculation error:', e);
    }
    return rawHrs || '—';
  };

  // CSV Export with Check In & Check Out columns
  const handleExport = () => {
    if (!records.length) return;
    const headers = ['Date', 'Check In', 'Check Out', 'Working Hrs.', 'Status'];
    const csvRows = [headers.join(',')];

    records.forEach((r) => {
      csvRows.push([
        `"${r.formattedDate || r.date}"`,
        `"${r.checkIn || r.check_in || '—'}"`,
        `"${r.checkOut || r.check_out || '—'}"`,
        `"${r.workingHrs || r.hours || '—'}"`,
        `"${getEmployeeRecordStatus(r)}"`
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Records_${activeMonth.year}_${activeMonth.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Employee Portal 9-Hour Rule:
  // Punch in is shown as "Invalid" unless and until the full 9 hours (540 mins) are completed
  const getEmployeeRecordStatus = (r) => {
    const rawStatus = String(r.status || '').trim();

    // Preserve non-working statuses like Holiday, Weekly Off, Approved Leave
    if (
      r.isHoliday ||
      r.isWeeklyOff ||
      rawStatus === 'Holiday' ||
      rawStatus === 'Weekly Off' ||
      rawStatus.includes('Leave')
    ) {
      return rawStatus;
    }

    const inTime = r.checkIn || r.check_in;
    const outTime = r.checkOut || r.check_out;

    // Helper to parse time string like "11:59 AM" into minutes from midnight
    const parseTimeToMins = (tStr) => {
      if (!tStr || tStr === '—' || tStr === '-') return null;
      const match = String(tStr).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[4]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    // Helper to parse workingHrs/duration into minutes
    const parseWorkedMins = (wh) => {
      if (!wh || wh === '—' || wh === '-') return null;
      if (typeof wh === 'number') return Math.round(wh * 60);
      const str = String(wh).trim();
      const hmMatch = str.match(/(\d+)\s*h(?:r|ours?)?\s*(\d+)?\s*m?/i);
      if (hmMatch) {
        const hrs = parseInt(hmMatch[1], 10) || 0;
        const mins = parseInt(hmMatch[2], 10) || 0;
        return hrs * 60 + mins;
      }
      const colonMatch = str.match(/(\d{1,2}):(\d{2})/);
      if (colonMatch) {
        return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
      }
      const fl = parseFloat(str);
      if (!isNaN(fl) && fl > 0) return Math.round(fl * 60);
      return null;
    };

    // If punch in exists
    if (inTime && inTime !== '—' && inTime !== '-') {
      let totalMins = parseWorkedMins(r.workingHrs || r.hours || r.duration);

      // If check-out exists and totalMins not yet computed from string
      if (totalMins === null && outTime && outTime !== '—' && outTime !== '-') {
        const inMins = parseTimeToMins(inTime);
        const outMins = parseTimeToMins(outTime);
        if (inMins !== null && outMins !== null && outMins >= inMins) {
          totalMins = outMins - inMins;
        }
      }

      // If active session (check-out is missing / ongoing punch)
      if (totalMins === null && (!outTime || outTime === '—' || outTime === '-')) {
        const inMins = parseTimeToMins(inTime);
        if (inMins !== null) {
          const now = new Date();
          const currentMins = now.getHours() * 60 + now.getMinutes();
          if (currentMins >= inMins) {
            totalMins = currentMins - inMins;
          } else {
            totalMins = 0;
          }
        }
      }

      // Unless and until total 9 hours (540 mins) are completed, show as Invalid
      if (totalMins === null || totalMins < 540) {
        return 'Invalid';
      }

      // Total 9 hours completed
      return 'Present';
    }

    // No punch in at all -> Absent
    return rawStatus || 'Absent';
  };

  // Helper for Status indicator dot & badge styling
  const getStatusBadge = (status, holidayName) => {
    const s = String(status || '').trim();
    if (s === 'Present') {
      return (
        <span className="att-status-cell present">
          <span className="att-status-dot dot-present" /> Present
        </span>
      );
    }
    if (s === 'Absent') {
      return (
        <span className="att-status-cell absent">
          <span className="att-status-dot dot-absent" /> Absent
        </span>
      );
    }
    if (s === 'Invalid' || s === 'invalid') {
      return (
        <span className="att-status-cell invalid" style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.08)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="att-status-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#dc2626' }} /> Invalid
        </span>
      );
    }
    if (s.includes('Half Day')) {
      return (
        <span className="att-status-cell half-day">
          <span className="att-status-dot dot-half-day" /> Half Day
        </span>
      );
    }
    if (s === 'Punched In' || s === 'In Progress') {
      return (
        <span className="att-status-cell in-progress" style={{ color: 'var(--primary, #6366f1)', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="att-status-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary, #6366f1)' }} /> {s}
        </span>
      );
    }
    if (s === 'Weekly Off') {
      return (
        <span className="att-status-cell weekly-off">
          <span className="att-status-dot dot-weekly-off" /> Weekly Off
        </span>
      );
    }
    if (s === 'Holiday') {
      return (
        <span className="att-status-cell holiday">
          <span className="att-status-dot dot-holiday" /> {holidayName ? `Holiday (${holidayName})` : 'Holiday'}
        </span>
      );
    }
    if (s.includes('Leave')) {
      return (
        <span className="att-status-cell leave">
          <span className="att-status-dot dot-leave" /> {s}
        </span>
      );
    }
    return <span style={{ color: 'var(--muted, #94a3b8)' }}>{s || '—'}</span>;
  };

  // Maximum days for the chart scale
  const maxDays = Math.max(25, ...overview.map((item) => Number(item.days) || 0));

  return (
    <div className="attendance-records-page">
      {/* Top Header */}
      <div className="att-header-row">
        <div>
          <h1 className="att-main-title">Attendance Records</h1>
          <p className="att-main-sub">Track and manage your attendance history</p>
        </div>
        <button 
          className="primary-btn att-view-records-btn" 
          onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
        >
          <FileText size={16} /> View my records
        </button>
      </div>

      {/* Top Section: Overview Chart & Month Summary */}
      <div className="att-top-grid">
        {/* Card 1: Attendance Overview Bar Chart (Live Data) */}
        <div className="card att-overview-card">
          <div className="att-card-header">
            <h3>Attendance Overview</h3>
            <div className="att-dropdown-wrap">
              <select 
                aria-label="Filter overview range"
                className="att-range-select"
                value={overviewRange}
                onChange={(e) => setOverviewRange(Number(e.target.value))}
              >
                <option value={4}>Last 4 Months</option>
                <option value={6}>Last 6 Months</option>
                <option value={12}>This Year</option>
              </select>
            </div>
          </div>

          {/* Dynamic SVG Bar Chart */}
          <div className="att-chart-wrap">
            <div className="att-chart-y-axis">
              <span className="att-y-title">Days</span>
              <div className="att-y-ticks">
                <span>{maxDays}</span>
                <span>{Math.round(maxDays * 0.8)}</span>
                <span>{Math.round(maxDays * 0.6)}</span>
                <span>{Math.round(maxDays * 0.4)}</span>
                <span>{Math.round(maxDays * 0.2)}</span>
                <span>0</span>
              </div>
            </div>

            <div className="att-chart-body">
              {/* Grid Lines */}
              <div className="att-chart-gridlines">
                <div className="gridline" />
                <div className="gridline" />
                <div className="gridline" />
                <div className="gridline" />
                <div className="gridline" />
                <div className="gridline" />
              </div>

              {/* Bars Columns */}
              <div className="att-bars-row">
                {overview.map((item, idx) => {
                  const heightPercent = maxDays > 0 ? Math.min(100, Math.max(0, (item.days / maxDays) * 100)) : 0;
                  return (
                    <div key={idx} className="att-bar-col" title={`${item.month}: ${item.days} Days`}>
                      <div className="att-bar-track">
                        <div 
                          className="att-bar-fill" 
                          style={{ height: `${heightPercent}%` }}
                        >
                          <span className="att-bar-tooltip">{item.days} d</span>
                        </div>
                      </div>
                      <span className="att-bar-label">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Current Month Summary (Live & Dynamic) */}
        <div className="card att-summary-card">
          <div className="att-summary-header">
            <div className="att-icon-badge">
              <CalendarDays size={18} />
            </div>
            <h3>{data?.monthLabel || activeMonth.label} Summary</h3>
          </div>

          <div className="att-summary-list">
            <div className="att-summary-item">
              <div className="att-summary-item-label">
                <span className="att-status-dot dot-present" />
                <span>Present Days</span>
              </div>
              <strong className="val-present">{Number(summary.presentDays || 0).toFixed(1)}</strong>
            </div>

            <div className="att-summary-item">
              <div className="att-summary-item-label">
                <span className="att-status-dot dot-absent" />
                <span>Absent Days</span>
              </div>
              <strong className="val-absent">{Number(summary.absentDays || 0).toFixed(1)}</strong>
            </div>

            <div className="att-summary-item">
              <div className="att-summary-item-label">
                <span className="att-status-dot dot-half-day" />
                <span>Half Day</span>
              </div>
              <strong className="val-half-day" style={{ color: '#d97706' }}>{Number(summary.halfDayDays ?? summary.invalidDays ?? 0).toFixed(1)}</strong>
            </div>

            <div className="att-summary-item">
              <div className="att-summary-item-label">
                <span className="att-status-dot dot-leave" />
                <span>Approved Leaves</span>
              </div>
              <strong className="val-leave">{Number(summary.approvedLeaves || 0).toFixed(1)}</strong>
            </div>

            <div className="att-summary-item">
              <div className="att-summary-item-label">
                <span className="att-status-dot dot-holiday" />
                <span>Holidays</span>
              </div>
              <strong className="val-holiday">{Number(summary.holidays || 0).toFixed(1)}</strong>
            </div>

            <div className="att-summary-item">
              <div className="att-summary-item-label">
                <span className="att-status-dot dot-weekly-off" />
                <span>Weekly Off</span>
              </div>
              <strong className="val-weekly-off">{Number(summary.weeklyOff || 0).toFixed(1)}</strong>
            </div>
          </div>

          <div className="att-summary-divider" />

          <div className="att-summary-footer-row">
            <span className="att-total-label">Total Worked Hours</span>
            <strong className="att-total-hours">{summary.totalWorkedHours || '00:00'}</strong>
          </div>
        </div>
      </div>

      {/* Bottom Section: Attendance Details Table */}
      <div className="card att-details-card">
        <div className="att-details-header">
          <div className="att-details-title-wrap">
            <div className="att-icon-badge">
              <Calendar size={18} />
            </div>
            <div>
              <h3>Attendance Details</h3>
              <p>Your attendance records for the selected period</p>
            </div>
          </div>

          <div className="att-details-actions">
            <label className="att-month-select-wrap" htmlFor="att-month-dropdown">
              <Calendar size={15} className="att-month-icon" />
              <select
                id="att-month-dropdown"
                aria-label="Select month"
                value={selectedMonthIndex}
                onChange={(e) => {
                  setSelectedMonthIndex(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="att-month-select"
              >
                {MONTH_OPTIONS.map((m, idx) => (
                  <option key={idx} value={idx}>{m.label}</option>
                ))}
              </select>
            </label>

            <button className="secondary-btn att-export-btn" onClick={handleExport}>
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="table-wrap att-table-wrap att-table-desktop">
          <table className="att-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Hrs.</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    Loading attendance records...
                  </td>
                </tr>
              ) : currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    No attendance records found for this month.
                  </td>
                </tr>
              ) : (
                currentRecords.map((r, idx) => {
                  const isHoliday = r.status === 'Holiday' || r.isHoliday;
                  const isWeeklyOff = r.status === 'Weekly Off' || r.isWeeklyOff;
                  return (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedDailyLog(r)}
                      title="Click to view daily punch logs"
                      style={{
                        cursor: 'pointer',
                        background: isHoliday ? 'rgba(234, 88, 12, 0.04)' : isWeeklyOff ? 'rgba(245, 158, 11, 0.04)' : 'transparent'
                      }}
                    >
                      <td className="att-date-col">{r.formattedDate || r.date}</td>
                      <td className="att-time-col">{r.checkIn || r.check_in || '—'}</td>
                      <td className="att-time-col">{r.checkOut || r.check_out || '—'}</td>
                      <td className="att-hrs-col">{formatWorkedHours(r)}</td>
                      <td className="att-loc-col" style={{ color: 'var(--muted, #64748b)', fontSize: '11.5px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.clientSiteName || r.location || 'Main Office'}
                      </td>
                      <td>{getStatusBadge(getEmployeeRecordStatus(r), r.holidayName)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View (Req 18) */}
        <div className="att-mobile-cards-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)', fontSize: '13px' }}>
              Loading attendance records...
            </div>
          ) : currentRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)', fontSize: '13px' }}>
              No attendance records found for this month.
            </div>
          ) : (
            currentRecords.map((r, idx) => (
              <div 
                key={idx} 
                className="att-record-card"
                onClick={() => setSelectedDailyLog(r)}
                style={{ cursor: 'pointer' }}
                title="Click to view daily punch logs"
              >
                <div className="att-record-card-top">
                  <span className="att-record-card-date">{r.date || r.formattedDate}</span>
                  {getStatusBadge(getEmployeeRecordStatus(r), r.holidayName)}
                </div>
                <div className="att-record-card-grid">
                  <div className="att-record-field">
                    <span className="att-record-label">Check In</span>
                    <span className="att-record-val">{r.checkIn || r.check_in || '—'}</span>
                  </div>
                  <div className="att-record-field">
                    <span className="att-record-label">Check Out</span>
                    <span className="att-record-val">{r.checkOut || r.check_out || '—'}</span>
                  </div>
                  <div className="att-record-field">
                    <span className="att-record-label">Hours</span>
                    <span className="att-record-val">{formatWorkedHours(r)}</span>
                  </div>
                  <div className="att-record-field">
                    <span className="att-record-label">Location</span>
                    <span className="att-record-val" title={r.clientSiteName || r.location || 'Office'}>
                      {r.clientSiteName || r.location || 'Office'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table Pagination */}
        <div className="att-pagination-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="att-pagination-info">
              {loading
                ? 'Loading records...'
                : totalRecords > 0
                ? `Showing ${startIndex + 1} to ${endIndex} of ${totalRecords} records`
                : 'No records to display'}
            </span>
            <select
              aria-label="Records per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                fontSize: '12px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border, #e2e8f0)',
                background: 'var(--surface, #fff)',
                color: 'var(--text, #374151)',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10 / page</option>
              <option value={15}>15 / page</option>
              <option value={31}>All Days</option>
            </select>
          </div>

          <div className="att-pagination-controls">
            <button 
              className="att-page-nav-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                className={`att-page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button 
              className="att-page-nav-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Daily Logs Modal (matching attached reference) */}
      {selectedDailyLog && (
        <div 
          className="att-daily-logs-backdrop" 
          onClick={() => setSelectedDailyLog(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
        >
          <div 
            className="att-daily-logs-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(31, 24, 69, 0.2)',
              border: '1px solid #E2E8F0',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {/* Project Theme Header */}
            <div 
              style={{
                backgroundColor: '#FFFFFF',
                padding: '16px 20px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F1F5F9'
              }}
            >
              <div>
                <span 
                  style={{
                    display: 'inline-block',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#6D44F5',
                    backgroundColor: '#F0EBFF',
                    padding: '2.5px 7.5px',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                  }}
                >
                  Attendance Log
                </span>
                <h3 
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0F172A',
                    letterSpacing: '-0.01em',
                    fontFamily: 'Poppins, Inter, sans-serif'
                  }}
                >
                  Daily Logs
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedDailyLog(null)}
                aria-label="Close"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  color: '#64748B',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'background 0.15s ease, color 0.15s ease'
                }}
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Sub-header: Date & Shift-time */}
            <div 
              style={{
                padding: '12px 20px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div 
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#1E293B'
                  }}
                >
                  {selectedDailyLog.date || selectedDailyLog.formattedDate}
                </div>
                <div 
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#64748B',
                    marginTop: '2px'
                  }}
                >
                  Shift: {selectedDailyLog.shift_time || selectedDailyLog.shift || selectedDailyLog.timing || '09:30 AM-06:30 PM'}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0'
                }}
              >
                {selectedDailyLog.status || 'Present'}
              </span>
            </div>

            {/* Table Header: Time | Location | Type */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: '75px 1fr 50px',
                padding: '10px 20px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #F1F5F9',
                backgroundColor: '#FFFFFF'
              }}
            >
              <div>Time</div>
              <div>Location</div>
              <div style={{ textAlign: 'center' }}>Type</div>
            </div>

            {/* Rows / Punch logs */}
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {(() => {
                const logs = [];
                const checkIn = selectedDailyLog.checkIn || selectedDailyLog.check_in;
                const checkOut = selectedDailyLog.checkOut || selectedDailyLog.check_out;
                const inLoc = selectedDailyLog.punch_in_location || selectedDailyLog.location || selectedDailyLog.clientSiteName || 'Office';
                const outLoc = selectedDailyLog.punch_out_location || selectedDailyLog.location || selectedDailyLog.clientSiteName || 'Office';

                // Check Out row (shown at top as in reference screenshot if completed)
                if (checkOut && checkOut !== '—' && checkOut !== '-') {
                  logs.push({
                    key: 'out',
                    time: checkOut,
                    location: outLoc,
                    type: 'mobile',
                    isOut: true,
                  });
                }

                // Check In row
                if (checkIn && checkIn !== '—' && checkIn !== '-') {
                  logs.push({
                    key: 'in',
                    time: checkIn,
                    location: inLoc,
                    type: 'mobile',
                    isIn: true,
                  });
                }

                if (logs.length === 0) {
                  return (
                    <div style={{ padding: '36px 18px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                      {selectedDailyLog.isHoliday 
                        ? `Holiday (${selectedDailyLog.holidayName || 'Holiday'})`
                        : selectedDailyLog.isWeeklyOff 
                        ? 'Weekly Off' 
                        : selectedDailyLog.status?.includes('Leave')
                        ? selectedDailyLog.status
                        : 'No punch logs recorded for this date.'}
                    </div>
                  );
                }

                return logs.map((log) => (
                  <div 
                    key={log.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '75px 1fr 50px',
                      alignItems: 'center',
                      padding: '13px 20px',
                      borderBottom: '1px solid #F1F5F9',
                      gap: '8px'
                    }}
                  >
                    <div 
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0F172A',
                        lineHeight: 1.2
                      }}
                    >
                      {log.time}
                    </div>
                    <div 
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: '#334155',
                        lineHeight: 1.45,
                        wordBreak: 'break-word'
                      }}
                    >
                      {log.location}
                    </div>
                    <div 
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        color: '#6D44F5'
                      }}
                    >
                      <Smartphone size={18} strokeWidth={2.2} />
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #F1F5F9',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedDailyLog(null)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
