import React, { useState, useEffect, useMemo } from 'react';
import { 
  CalendarDays, 
  Calendar, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileText
} from 'lucide-react';
import api from '../api';

function generateMonthOptions(count = 6) {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1
    });
  }
  return options;
}

const MONTH_OPTIONS = generateMonthOptions();

export default function AttendanceRecords() {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [overviewRange, setOverviewRange] = useState(4);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const activeMonth = MONTH_OPTIONS[selectedMonthIndex] || MONTH_OPTIONS[0];

  // Fetch dynamic monthly data directly from backend database
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
  const totalPages = Math.ceil(totalRecords / recordsPerPage) || 1;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
  const currentRecords = records.slice(startIndex, endIndex);

  // CSV Export with Check In & Check Out columns
  const handleExport = () => {
    if (!records.length) return;
    const headers = ['Date', 'Check In', 'Check Out', 'Working Hrs.', 'Status'];
    const csvRows = [headers.join(',')];

    records.forEach((r) => {
      csvRows.push([
        `"${r.date}"`,
        `"${r.checkIn || r.check_in || '—'}"`,
        `"${r.checkOut || r.check_out || '—'}"`,
        `"${r.workingHrs || r.hours || '—'}"`,
        `"${r.status}"`
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

  // Helper for Status indicator dot & badge styling
  const getStatusBadge = (status) => {
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
    if (s.includes('Half Day') || s === 'Invalid') {
      return (
        <span className="att-status-cell half-day">
          <span className="att-status-dot dot-half-day" /> Half Day
        </span>
      );
    }
    if (s === 'Punched In' || s === 'In Progress') {
      return (
        <span className="att-status-cell in-progress" style={{ color: 'var(--primary)', background: 'var(--primary-50, rgba(99, 102, 241, 0.1))', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="att-status-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)' }} /> {s}
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
          <span className="att-status-dot dot-holiday" /> Holiday
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
    return <span style={{ color: 'var(--muted)' }}>{s || '--'}</span>;
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

      {/* Bottom Section: Attendance Details Table (Late / Early Mark column removed) */}
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
            <div className="att-month-select-wrap">
              <Calendar size={14} className="att-month-icon" />
              <select
                aria-label="Select month"
                value={selectedMonthIndex}
                onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                className="att-month-select"
                style={{ paddingLeft: '36px', paddingRight: '30px' }}
              >
                {MONTH_OPTIONS.map((m, idx) => (
                  <option key={idx} value={idx}>{m.label}</option>
                ))}
              </select>
            </div>

            <button className="secondary-btn att-export-btn" onClick={handleExport}>
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        <div className="table-wrap att-table-wrap">
          <table className="att-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Hrs.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    Loading attendance records...
                  </td>
                </tr>
              ) : currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    No records found for this month.
                  </td>
                </tr>
              ) : (
                currentRecords.map((r, idx) => (
                  <tr key={idx}>
                    <td className="att-date-col">{r.date}</td>
                    <td className="att-time-col">{r.checkIn || r.check_in || '—'}</td>
                    <td className="att-time-col">{r.checkOut || r.check_out || '—'}</td>
                    <td className="att-hrs-col">{r.workingHrs || r.hours || '—'}</td>
                    <td>{getStatusBadge(r.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="att-pagination-bar">
          <span className="att-pagination-info">
            Showing {totalRecords > 0 ? startIndex + 1 : 0} to {endIndex} of {totalRecords} records
          </span>

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
    </div>
  );
}
