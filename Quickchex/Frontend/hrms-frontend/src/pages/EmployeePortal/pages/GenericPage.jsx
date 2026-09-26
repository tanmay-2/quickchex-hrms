import React from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  UsersRound,
  ReceiptIndianRupee,
  Clock3,
  Plane,
  ClipboardPenLine,
  CalendarDays,
  FileClock,
  Plus,
  Download,
  CheckCircle2,
  Clock4,
  XCircle,
  X,
  FileText,
  Eye,
  Check,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PayslipDocument from '../components/PayslipDocument';
import { attendanceRows, leaveRows, employee } from '../data';
import api from '../api';
import AttendanceRecords from './AttendanceRecords';
import RegularizationPageNew from './Regularization';
import LeaveApplicationsPageNew from './LeaveApplications';

const pageMeta = {
  '/dashboard_emp/employee-directory': ['Employee Directory', 'View employee information and team details', UsersRound],
  '/dashboard_emp/attendance/records': ['My Attendance Records', 'Review your complete attendance history', FileClock],
  '/dashboard_emp/attendance/regularization': ['My Regularization', 'Submit and track attendance correction requests', ClipboardPenLine],
  '/dashboard_emp/leave': ['Leave', 'Manage your employee leave information', Plane],
  '/dashboard_emp/leave/applications': ['My Leave Applications', 'View and apply for employee leave', ClipboardPenLine],
  '/dashboard_emp/leave/balance': ['Leave Balance', 'Track your available and used leave balances', CalendarDays],
  '/dashboard_emp/leave/comp-off': ['Comp-Off List', 'View comp-off credits and usage', Clock4],
  '/dashboard_emp/leave/holidays': ['Holiday List', 'View the company holiday calendar', CalendarDays],
  '/dashboard_emp/payslips': ['Payslips', 'Review and download your monthly payslips', ReceiptIndianRupee],
  '/employee-directory': ['Employee Directory', 'View employee information and team details', UsersRound],
  '/attendance/records': ['My Attendance Records', 'Review your complete attendance history', FileClock],
  '/attendance/regularization': ['My Regularization', 'Submit and track attendance correction requests', ClipboardPenLine],
  '/leave': ['Leave', 'Manage your employee leave information', Plane],
  '/leave/applications': ['My Leave Applications', 'View and apply for employee leave', ClipboardPenLine],
  '/leave/balance': ['Leave Balance', 'Track your available and used leave balances', CalendarDays],
  '/leave/comp-off': ['Comp-Off List', 'View comp-off credits and usage', Clock4],
  '/leave/holidays': ['Holiday List', 'View the company holiday calendar', CalendarDays],
  '/payslips': ['Payslips', 'Review and download your monthly payslips', ReceiptIndianRupee],
};

const regularizationRows = [];

const compOffRows = [];

const holidayRows = [];

export default function GenericPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const p = location.pathname;

  if (p === '/dashboard_emp/attendance' || p === '/attendance') {
    return <Navigate to="/dashboard_emp/attendance/records" replace />;
  }
  if (p === '/dashboard_emp/attendance/records' || p === '/attendance/records') return <AttendanceRecords />;
  if (p === '/dashboard_emp/attendance/regularization' || p === '/attendance/regularization' || p === '/dashboard_emp/regularization') return <RegularizationPageNew />;
  if (p === '/dashboard_emp/leave' || p === '/leave') return <LeaveOverview />;
  if (p === '/dashboard_emp/leave/applications' || p === '/leave/applications') return <LeaveApplicationsPageNew />;
  if (p === '/dashboard_emp/leave/balance' || p === '/leave/balance') return <LeaveBalance />;
  if (p === '/dashboard_emp/leave/comp-off' || p === '/leave/comp-off') return <CompOffPage />;
  if (p === '/dashboard_emp/leave/holidays' || p === '/leave/holidays') return <HolidayList />;
  if (p === '/dashboard_emp/payslips' || p === '/payslips') return <Payslips />;

  const [title, sub, Icon] = pageMeta[p] || ['HRMS', 'Employee portal', UsersRound];
  return (
    <div>
      <PageHeader title={title} subtitle={sub} />
      <div className="card placeholder-page">
        <div className="placeholder-icon"><Icon size={26} /></div>
        <h2>{title}</h2>
        <p>This employee module is connected to the shared purple dashboard shell and is ready for your backend/API data.</p>
        <button className="primary-btn" onClick={() => navigate('/dashboard_emp')}>Back to dashboard</button>
      </div>
    </div>
  );
}

function RegularizationPage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [requests, setRequests] = React.useState(regularizationRows);
  const [form, setForm] = React.useState({
    attendanceDate: toDateInput(new Date()),
    requestType: 'Missing check-out',
    checkIn: '09:30 AM',
    checkOut: '06:30 PM',
    reason: '',
  });

  const openModal = () => {
    setForm({
      attendanceDate: toDateInput(new Date()),
      requestType: 'Missing check-out',
      checkIn: '09:30 AM',
      checkOut: '06:30 PM',
      reason: '',
    });
    setIsModalOpen(true);
  };

  const loadRequests = React.useCallback(() => {
    api.getRegularizations().then((data) => {
      if (Array.isArray(data)) setRequests(data);
    }).catch(() => { });
  }, []);

  React.useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 4000);
    const handleSync = () => loadRequests();
    window.addEventListener('focus', handleSync);
    window.addEventListener('regularization-updated', handleSync);
    window.addEventListener('attendance-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('regularization-updated', handleSync);
      window.removeEventListener('attendance-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadRequests]);

  React.useEffect(() => {
    if (!isModalOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.submitRegularization({
        date: form.attendanceDate,
        issue: form.requestType,
        checkIn: form.checkIn || '09:30 AM',
        checkOut: form.checkOut || '06:30 PM',
        reason: form.reason,
      });
      window.dispatchEvent(new Event('regularization-updated'));
      window.dispatchEvent(new Event('attendance-updated'));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'regularization-updated', timestamp: Date.now() }));
      } catch (e) { }
      loadRequests();
    } catch (err) {
      console.warn('Regularization submit fallback:', err.message);
      setRequests((prev) => [
        { date: form.attendanceDate || 'Today', issue: form.requestType, checkIn: form.checkIn || '09:30 AM', checkOut: form.checkOut || '06:30 PM', requestDate: 'Today', status: 'Pending' },
        ...prev,
      ]);
    }
    setIsModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Regularization"
        subtitle="Submit and track attendance correction requests"
        action={
          <button className="primary-btn" type="button" onClick={openModal}>
            <Plus size={16} /> New request
          </button>
        }
      />

      <div className="stats-grid">
        <Stat label="Approved" value={requests.filter(r => r.status === 'Approved').length} helper="This month" tone="green" />
        <Stat label="Pending" value={requests.filter(r => r.status === 'Pending').length} helper="Awaiting approval" tone="blue" />
        <Stat label="Rejected" value={requests.filter(r => r.status === 'Rejected').length} helper="This month" tone="amber" />
        <Stat label="Total requests" value={requests.length} helper="Current month" />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>My regularization requests</h2>
            <p>Track submitted attendance corrections</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Attendance date</th>
                <th>Issue</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Request date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.date}</td>
                  <td>{row.issue}</td>
                  <td>{row.checkIn || row.check_in || '—'}</td>
                  <td>{row.checkOut || row.check_out || '—'}</td>
                  <td>{row.requestDate || row.request_date || 'Recent'}</td>
                  <td><Status status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="regularization-modal-backdrop" onMouseDown={closeModal}>
          <div
            className="regularization-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="regularization-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="regularization-modal-header">
              <div>
                <div className="regularization-modal-eyebrow">ATTENDANCE CORRECTION</div>
                <h2 id="regularization-modal-title">New Regularization Request</h2>
                <p>Submit a correction request for an attendance record.</p>
              </div>
              <button className="icon-btn regularization-modal-close" type="button" onClick={closeModal} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="regularization-form-grid">
                <CustomDateField
                  label="Attendance Date"
                  value={form.attendanceDate}
                  onChange={(value) => updateField('attendanceDate', value)}
                  required
                />

                <CustomSelectField
                  label="Regularization Type"
                  value={form.requestType}
                  onChange={(value) => updateField('requestType', value)}
                  options={[
                    'Missing check-out',
                    'Missing check-in',
                    'Incorrect check-in',
                    'Incorrect check-out',
                    'Attendance not marked',
                  ]}
                />

                <TimePickerField
                  label="Correct Check-in"
                  value={form.checkIn}
                  onChange={(value) => updateField('checkIn', value)}
                />

                <TimePickerField
                  label="Correct Check-out"
                  value={form.checkOut}
                  onChange={(value) => updateField('checkOut', value)}
                />

                <label className="form-field form-field-wide">
                  <span>Reason / Remarks</span>
                  <textarea
                    rows="4"
                    value={form.reason}
                    onChange={(e) => updateField('reason', e.target.value)}
                    placeholder="Describe the attendance issue and provide a reason for this request..."
                    required
                  />
                </label>
              </div>

              <div className="regularization-modal-note">
                <span>Requests are sent to your reporting manager for approval.</span>
              </div>

              <div className="regularization-modal-actions">
                <button className="secondary-btn" type="button" onClick={closeModal}>Cancel</button>
                <button className="primary-btn" type="submit"><Plus size={16} /> Submit request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomDateField({ label, value, onChange, required }) {
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() => value ? parseDateInput(value) : new Date());
  const triggerRef = React.useRef(null);
  const pickerId = 'regularization-date-popover';
  const [anchor, setAnchor] = React.useState({ top: 0, left: 0, width: 320, placement: 'bottom' });

  React.useEffect(() => {
    if (value) setViewDate(parseDateInput(value));
  }, [value]);

  const updateAnchor = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const height = 360;
    const gap = 8;
    const width = Math.min(340, Math.max(300, rect.width));
    const maxLeft = window.innerWidth - width - 12;
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    const placeAbove = below < height + gap && above > height + gap;
    setAnchor({
      left: Math.min(Math.max(12, rect.left), maxLeft),
      top: placeAbove ? rect.top - gap : rect.bottom + gap,
      width,
      placement: placeAbove ? 'top' : 'bottom',
    });
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;
    updateAnchor();
    const onViewport = () => updateAnchor();
    window.addEventListener('resize', onViewport);
    window.addEventListener('scroll', onViewport, true);
    return () => {
      window.removeEventListener('resize', onViewport);
      window.removeEventListener('scroll', onViewport, true);
    };
  }, [open, updateAnchor]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      const popover = document.getElementById(pickerId);
      if (popover?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const monthLabel = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const days = getCalendarDays(viewDate);
  const selected = value ? parseDateInput(value) : null;
  const selectDate = (date) => {
    onChange(toDateInput(date));
    setViewDate(date);
    setOpen(false);
  };
  const goMonth = (delta) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };
  const today = new Date();

  return (
    <div className="form-field">
      <span>{label}</span>
      <div className={`field-with-icon custom-date-shell${open ? ' is-open' : ''}`} ref={triggerRef}>
        <CalendarDays size={16} />
        <button
          type="button"
          className="custom-field-button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={value ? '' : 'placeholder'}>{value ? formatDisplayDate(value) : 'Select attendance date'}</span>
        </button>
        <button type="button" className="custom-field-caret" onClick={() => setOpen((current) => !current)} aria-label="Open calendar">
          <ChevronDown size={15} />
        </button>
      </div>
      {required && !value ? <div className="field-helper">Choose the date that needs correction.</div> : null}

      {open && createPortal(
        <div
          id={pickerId}
          className={`custom-calendar-popover ${anchor.placement}`}
          style={{ left: anchor.left, top: anchor.top, width: anchor.width }}
          role="dialog"
          aria-label="Attendance date picker"
        >
          <div className="calendar-head">
            <div>
              <span>Attendance date</span>
              <strong>{value ? formatDisplayDate(value) : 'Select a date'}</strong>
            </div>
            <span className="calendar-year-badge">{viewDate.getFullYear()}</span>
          </div>
          <div className="calendar-nav">
            <button type="button" className="calendar-nav-btn" onClick={() => goMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
            <strong>{monthLabel}</strong>
            <button type="button" className="calendar-nav-btn" onClick={() => goMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button>
          </div>
          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {days.map(({ date, currentMonth }) => {
              const isSelected = selected && sameDate(date, selected);
              const isToday = sameDate(date, today);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  className={`calendar-day${currentMonth ? '' : ' is-muted'}${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                  onClick={() => selectDate(date)}
                  aria-pressed={Boolean(isSelected)}
                >
                  <span>{date.getDate()}</span>
                  {isToday && !isSelected ? <i /> : null}
                </button>
              );
            })}
          </div>
          <div className="calendar-actions">
            <button type="button" className="text-btn" onClick={() => { const now = new Date(); selectDate(now); }}>Today</button>
            <button type="button" className="text-btn" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function CustomSelectField({ label, value, onChange, options, popoverTitle = 'Choose an option' }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef(null);
  const listboxId = `regularization-select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const [anchor, setAnchor] = React.useState({ top: 0, left: 0, width: 320, placement: 'bottom' });

  const updateAnchor = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const height = Math.min(280, 56 + options.length * 42);
    const gap = 8;
    const width = Math.max(260, rect.width);
    const maxLeft = window.innerWidth - width - 12;
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    const placeAbove = below < height + gap && above > height + gap;
    setAnchor({ left: Math.min(Math.max(12, rect.left), maxLeft), top: placeAbove ? rect.top - gap : rect.bottom + gap, width, placement: placeAbove ? 'top' : 'bottom' });
  }, [options.length]);

  React.useEffect(() => {
    if (!open) return undefined;
    updateAnchor();
    const onViewport = () => updateAnchor();
    window.addEventListener('resize', onViewport);
    window.addEventListener('scroll', onViewport, true);
    return () => {
      window.removeEventListener('resize', onViewport);
      window.removeEventListener('scroll', onViewport, true);
    };
  }, [open, updateAnchor]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      const popover = document.getElementById(listboxId);
      if (popover?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowDown') setOpen(true);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, listboxId]);

  return (
    <div className="form-field">
      <span>{label}</span>
      <div className={`field-with-icon custom-select-shell${open ? ' is-open' : ''}`} ref={triggerRef}>
        <FileText size={16} />
        <button
          type="button"
          className="custom-field-button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
        >
          {value}
        </button>
        <button type="button" className="custom-field-caret" onClick={() => setOpen((current) => !current)} aria-label={`Open ${label.toLowerCase()} dropdown`}>
          <ChevronDown size={15} />
        </button>
      </div>

      {open && createPortal(
        <div
          id={listboxId}
          className={`custom-select-popover ${anchor.placement}`}
          style={{ left: anchor.left, top: anchor.top, width: anchor.width }}
          role="listbox"
          aria-label={label}
        >
          <div className="custom-select-popover-head">{popoverTitle}</div>
          <div className="custom-select-options">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={value === option}
                className={`custom-select-option${value === option ? ' is-selected' : ''}`}
                onClick={() => { onChange(option); setOpen(false); }}
              >
                <span>{option}</span>
                {value === option ? <Check size={15} /> : null}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function parseDateInput(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}
function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function formatDisplayDate(value) {
  const date = parseDateInput(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getCalendarDays(viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { date, currentMonth: date.getMonth() === viewDate.getMonth() };
  });
}

function TimePickerField({ label, value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value || '');
  const [error, setError] = React.useState('');
  const triggerRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const pickerId = `regularization-time-popover-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const [anchor, setAnchor] = React.useState({ top: 0, left: 0, width: 300, placement: 'bottom' });

  React.useEffect(() => {
    setDraft(value || '');
  }, [value]);

  const parts = parseTime(draft || value);
  const selectedHour = parts?.hour ?? 10;
  const selectedMinute = parts?.minute ?? 0;
  const selectedPeriod = parts?.period ?? 'AM';

  const updateAnchor = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 286;
    const gap = 8;
    const belowSpace = window.innerHeight - rect.bottom;
    const placeAbove = belowSpace < popoverHeight + gap && rect.top > popoverHeight + gap;
    const width = Math.min(320, Math.max(280, rect.width));
    const maxLeft = window.innerWidth - width - 12;
    setAnchor({
      left: Math.min(Math.max(12, rect.left), maxLeft),
      top: placeAbove ? rect.top - gap : rect.bottom + gap,
      width,
      placement: placeAbove ? 'top' : 'bottom',
    });
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;
    updateAnchor();
    const onViewportChange = () => updateAnchor();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, updateAnchor]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      const popover = document.getElementById(pickerId);
      if (popover?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const commitDraft = (nextValue) => {
    const normalized = normalizeTimeInput(nextValue);
    if (normalized) {
      setDraft(normalized);
      setError('');
      onChange(normalized);
      return true;
    }
    if (String(nextValue).trim() === '') {
      setDraft('');
      setError('');
      onChange('');
      return true;
    }
    setError('Use a valid time like 10:18 AM.');
    return false;
  };

  const setTimePart = (type, next) => {
    const base = parseTime(draft || value) || { hour: 10, minute: 0, period: 'AM' };
    const nextTime = { ...base, [type]: next };
    const normalized = formatTime(nextTime.hour, nextTime.minute, nextTime.period);
    setDraft(normalized);
    setError('');
    onChange(normalized);
  };

  return (
    <div className={`form-field time-picker-field${error ? ' has-error' : ''}`}>
      <span>{label}</span>
      <div className={`field-with-icon time-input-shell${open ? ' is-open' : ''}${error ? ' has-error' : ''}`} ref={triggerRef}>
        <Clock3 size={16} />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError('');
          }}
          onBlur={() => {
            if (draft) commitDraft(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (commitDraft(draft)) setOpen(false);
            }
          }}
          placeholder="10:18 AM"
          inputMode="text"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${label.replaceAll(' ', '-').toLowerCase()}-error` : undefined}
        />
        <button
          type="button"
          className="time-picker-trigger"
          onClick={() => {
            setOpen((current) => !current);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          aria-label={`Select ${label.toLowerCase()}`}
          aria-expanded={open}
        >
          <ChevronDown size={15} />
        </button>
      </div>
      <div className="time-input-helper">Type a time or use the picker.</div>
      {error && (
        <div className="field-error" id={`${label.replaceAll(' ', '-').toLowerCase()}-error`}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {open && createPortal(
        <div
          id={pickerId}
          className={`time-picker-popover ${anchor.placement}`}
          style={{ left: anchor.left, top: anchor.top, width: anchor.width }}
          role="dialog"
          aria-label={`${label} time picker`}
        >
          <div className="time-picker-head">
            <div>
              <span>Time</span>
              <strong>{parts ? formatTime(parts.hour, parts.minute, parts.period) : '10:00 AM'}</strong>
            </div>
            <span className="time-picker-format">12-hour</span>
          </div>
          <div className="time-picker-columns">
            <div className="time-picker-column">
              <div className="time-picker-column-title">Hour</div>
              <div className="time-picker-list">
                {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    className={`time-picker-option${selectedHour === hour ? ' is-selected' : ''}`}
                    onClick={() => setTimePart('hour', hour)}
                  >
                    <span>{String(hour).padStart(2, '0')}</span>
                    {selectedHour === hour && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="time-picker-column">
              <div className="time-picker-column-title">Minute</div>
              <div className="time-picker-list">
                {Array.from({ length: 60 }, (_, minute) => minute).map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className={`time-picker-option${selectedMinute === minute ? ' is-selected' : ''}`}
                    onClick={() => setTimePart('minute', minute)}
                  >
                    <span>{String(minute).padStart(2, '0')}</span>
                    {selectedMinute === minute && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="time-picker-column time-picker-period-column">
              <div className="time-picker-column-title">Period</div>
              <div className="time-picker-periods">
                {['AM', 'PM'].map((period) => (
                  <button
                    key={period}
                    type="button"
                    className={`time-picker-period${selectedPeriod === period ? ' is-selected' : ''}`}
                    onClick={() => setTimePart('period', period)}
                  >
                    <span>{period}</span>
                    {selectedPeriod === period && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="time-picker-footer">
            <span>Choose manually or type above.</span>
            <button type="button" className="text-btn" onClick={() => { setDraft(''); setError(''); onChange(''); }}>Clear</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function parseTime(value) {
  if (!value) return null;
  const raw = String(value).trim().toUpperCase().replace(/\s+/g, ' ');
  const match = raw.match(/^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(AM|PM)$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = match[3];
  return { hour, minute, period };
}

function normalizeTimeInput(value) {
  const parsed = parseTime(value);
  return parsed ? formatTime(parsed.hour, parsed.minute, parsed.period) : null;
}

function formatTime(hour, minute, period) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

function LeaveOverview() {
  const navigate = useNavigate();
  const [leaves, setLeaves] = React.useState([]);
  const [leaveBalance, setLeaveBalance] = React.useState('—');
  const [holidayCount, setHolidayCount] = React.useState('0');

  const loadLeaveData = React.useCallback(() => {
    api.getLeaveApplications().then((data) => {
      if (Array.isArray(data)) setLeaves(data);
    }).catch(() => { });

    api.getLeaveBalance().then((data) => {
      if (data) {
        setLeaveBalance(`${data.totalAvailable ?? data.available ?? 0} days`);
      }
    }).catch(() => { });

    api.getHolidays().then((data) => {
      if (Array.isArray(data)) setHolidayCount(String(data.length));
    }).catch(() => { });
  }, []);

  React.useEffect(() => {
    loadLeaveData();
    const interval = setInterval(loadLeaveData, 4000);
    const handleSync = () => loadLeaveData();
    window.addEventListener('focus', handleSync);
    window.addEventListener('leave-balance-updated', handleSync);
    window.addEventListener('leave-applied', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('leave-balance-updated', handleSync);
      window.removeEventListener('leave-applied', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadLeaveData]);

  return (
    <div>
      <PageHeader title="Leave" subtitle="Manage your employee leave information" action={<button className="primary-btn" onClick={() => navigate('/dashboard_emp/leave/applications')}><Plus size={16} /> Apply leave</button>} />
      <div className="stats-grid leave-summary-grid">
        <Stat label="Available balance" value={leaveBalance} helper="Across leave types" tone="green" icon={Clock3} />
        <Stat label="Applications" value={String(leaves.length)} helper="Total submitted" tone="purple" icon={ClipboardPenLine} />
        <Stat label="Comp-off" value="0 days" helper="Available" tone="blue" icon={Clock4} />
        <Stat label="Holidays" value={holidayCount} helper="Upcoming" tone="amber" icon={CalendarDays} />
      </div>
      <div className="dashboard-grid top-grid">
        <div className="card">
          <div className="card-header"><div><h2>Recent leave applications</h2><p>Latest requests</p></div><button className="text-btn" onClick={() => navigate('/dashboard_emp/leave/applications')}>View all</button></div>
          <div className="table-wrap"><table><thead><tr><th>Leave type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead><tbody>{leaves.map((r, i) => <tr key={i}><td>{r.type || r.category || r.leave_type || 'Leave'}</td><td>{r.from || r.from_date || r.startDate || r.start_date || '—'}</td><td>{r.to || r.to_date || r.endDate || r.end_date || '—'}</td><td>{r.days || (r.total_days ? `${r.total_days} days` : '1 day')}</td><td><Status status={r.status || 'Pending'} /></td></tr>)}</tbody></table></div>
        </div>
        <div className="card">
          <div className="card-header"><div><h2>Leave shortcuts</h2><p>Employee leave modules</p></div></div>
          <div className="quick-grid leave-shortcuts">
            <Shortcut text="My applications" to="/dashboard_emp/leave/applications" />
            <Shortcut text="Leave balance" to="/dashboard_emp/leave/balance" />
            <Shortcut text="Comp-Off list" to="/dashboard_emp/leave/comp-off" />
            <Shortcut text="Holiday list" to="/dashboard_emp/leave/holidays" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaveApplications() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [applications, setApplications] = React.useState(leaveRows);
  const [form, setForm] = React.useState({
    category: 'Casual Leave',
    fromDate: '',
    toDate: '',
    halfDay: 'No',
    reason: '',
  });
  const [liveBalance, setLiveBalance] = React.useState(null);
  const [balanceLoading, setBalanceLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const [toastMessage, setToastMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchLiveBalance = React.useCallback(() => {
    setBalanceLoading(true);
    api.getLeaveBalance()
      .then((data) => {
        if (data) setLiveBalance(data);
      })
      .catch(() => { })
      .finally(() => setBalanceLoading(false));
  }, []);

  const loadApplications = React.useCallback(() => {
    api.getLeaveApplications().then((data) => {
      if (Array.isArray(data)) setApplications(data);
    }).catch(() => { });
  }, []);

  React.useEffect(() => {
    loadApplications();
    fetchLiveBalance();
    const interval = setInterval(() => {
      loadApplications();
      fetchLiveBalance();
    }, 4000);
    const handleSync = () => {
      loadApplications();
      fetchLiveBalance();
    };
    window.addEventListener('focus', handleSync);
    window.addEventListener('leave-balance-updated', handleSync);
    window.addEventListener('leave-applied', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('leave-balance-updated', handleSync);
      window.removeEventListener('leave-applied', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadApplications, fetchLiveBalance]);

  React.useEffect(() => {
    if (isModalOpen) {
      setSubmitError('');
      fetchLiveBalance();
    }
  }, [isModalOpen, fetchLiveBalance]);

  React.useEffect(() => {
    if (!isModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitError('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSubmitError('');
  };

  const calculateDays = () => {
    if (form.halfDay === 'Yes') return 0.5;
    if (form.fromDate && form.toDate) {
      const start = new Date(form.fromDate);
      const end = new Date(form.toDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff > 0 ? diff : 1;
      }
    }
    return 1;
  };
  const calculatedDays = calculateDays();

  const getCatStats = () => {
    const cat = (form.category || '').toLowerCase();
    if (cat.includes('casual')) {
      const tot = (liveBalance?.casualLeave?.total != null && Number(liveBalance.casualLeave.total) > 0) ? Number(liveBalance.casualLeave.total) : 10;
      const avail = (liveBalance?.casualLeave?.available != null && Number(liveBalance.casualLeave.available) >= 0 && Number(liveBalance?.casualLeave?.total) > 0)
        ? Number(liveBalance.casualLeave.available)
        : tot;
      return {
        name: 'Casual Leave',
        available: avail,
        total: tot,
        used: liveBalance?.casualLeave?.used ?? 0,
        pending: liveBalance?.casualLeave?.pending ?? 0,
      };
    }
    if (cat.includes('sick')) {
      const tot = (liveBalance?.sickLeave?.total != null && Number(liveBalance.sickLeave.total) > 0) ? Number(liveBalance.sickLeave.total) : 8;
      const avail = (liveBalance?.sickLeave?.available != null && Number(liveBalance.sickLeave.available) >= 0 && Number(liveBalance?.sickLeave?.total) > 0)
        ? Number(liveBalance.sickLeave.available)
        : tot;
      return {
        name: 'Sick Leave',
        available: avail,
        total: tot,
        used: liveBalance?.sickLeave?.used ?? 0,
        pending: liveBalance?.sickLeave?.pending ?? 0,
      };
    }
    if (cat.includes('optional') || cat.includes('privilege') || cat.includes('earned')) {
      const tot = (liveBalance?.optionalHoliday?.total != null && Number(liveBalance.optionalHoliday.total) > 0) ? Number(liveBalance.optionalHoliday.total) : 3;
      const avail = (liveBalance?.optionalHoliday?.available != null && Number(liveBalance.optionalHoliday.available) >= 0 && Number(liveBalance?.optionalHoliday?.total) > 0)
        ? Number(liveBalance.optionalHoliday.available)
        : tot;
      return {
        name: 'Optional / Privilege Holiday',
        available: avail,
        total: tot,
        used: liveBalance?.optionalHoliday?.used ?? 0,
        pending: liveBalance?.optionalHoliday?.pending ?? 0,
      };
    }
    const tot = (liveBalance?.allowed != null && Number(liveBalance.allowed) > 0) ? Number(liveBalance.allowed) : 21;
    const avail = (liveBalance?.totalAvailable != null && Number(liveBalance.totalAvailable) >= 0 && Number(liveBalance?.allowed) > 0)
      ? Number(liveBalance.totalAvailable)
      : tot;
    return {
      name: form.category || 'Leave',
      available: avail,
      total: tot,
      used: liveBalance?.used ?? 0,
      pending: liveBalance?.pending ?? 0,
    };
  };

  const catStats = getCatStats();
  const isLWP = (form.category || '').toLowerCase().includes('without pay') || (form.category || '').toLowerCase().includes('lwp');
  const remainingAfter = Math.max(0, catStats.available - calculatedDays);
  const isExceeded = !isLWP && (calculatedDays > catStats.available);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.fromDate || !form.toDate) {
      setSubmitError('Please select both From Date and To Date.');
      return;
    }
    if (!form.reason || !form.reason.trim()) {
      setSubmitError('Please enter a reason for your leave request.');
      return;
    }
    setSubmitError('');
    setIsSubmitting(true);

    try {
      await api.applyLeave({
        category: form.category,
        type: form.category,
        start_date: form.fromDate,
        end_date: form.toDate,
        from: form.fromDate,
        to: form.toDate,
        total_days: calculatedDays,
        days: String(calculatedDays),
        reason: form.reason.trim(),
        has_half_days: form.halfDay === 'Yes',
        halfDay: form.halfDay,
      });

      // Global event to notify all dashboard cards, leave balance pages, and records immediately
      window.dispatchEvent(new Event('leave-balance-updated'));
      window.dispatchEvent(new Event('leave-applied'));
      window.dispatchEvent(new Event('attendance-updated'));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'leave-applied', timestamp: Date.now() }));
      } catch (e) { }

      loadApplications();
      fetchLiveBalance();
      setToastMessage(`Leave request submitted successfully! (${calculatedDays} ${calculatedDays === 1 ? 'day' : 'days'} for ${catStats.name}). Status: Pending manager approval.`);
      setTimeout(() => setToastMessage(''), 5000);
      setIsModalOpen(false);
    } catch (err) {
      console.warn('Apply leave error:', err.message);
      setSubmitError(err.message || 'Failed to submit leave request to backend');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="My Leave Applications"
        subtitle="View and apply for employee leave"
        action={
          <button className="primary-btn" type="button" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> New application
          </button>
        }
      />

      {toastMessage && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 18px',
            borderRadius: '8px',
            background: 'rgba(22, 163, 74, 0.1)',
            border: '1px solid rgba(22, 163, 74, 0.3)',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13.5px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="card">
        <div className="card-header"><div><h2>My applications</h2><p>Your submitted leave requests</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Leave type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
            <tbody>
              {applications.map((r, i) => (
                <tr key={i}><td>{r.type || r.category || r.leave_type || 'Leave'}</td><td>{r.from || r.from_date || r.startDate || r.start_date || '—'}</td><td>{r.to || r.to_date || r.endDate || r.end_date || '—'}</td><td>{r.days || (r.total_days ? `${r.total_days} days` : '1 day')}</td><td><Status status={r.status || 'Pending'} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && createPortal(
        <div className="leave-modal-backdrop" onMouseDown={closeModal}>
          <div
            className="leave-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="leave-modal-header">
              <div>
                <div className="leave-modal-eyebrow">LEAVE MANAGEMENT</div>
                <h2 id="leave-modal-title">Apply for Leave</h2>
                <p>Submit a new leave request for manager approval.</p>
              </div>
              <button className="icon-btn leave-modal-close" type="button" onClick={closeModal} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="leave-form">
              <CustomSelectField
                label="Leave Category"
                value={form.category}
                onChange={(value) => updateField('category', value)}
                options={['Casual Leave', 'Sick Leave', 'Earned Leave', 'Optional Holiday']}
                popoverTitle="Choose leave category"
              />

              <div className="leave-date-range">
                <CustomDateField
                  label="From Date"
                  value={form.fromDate}
                  onChange={(value) => updateField('fromDate', value)}
                  required
                />
                <CustomDateField
                  label="To Date"
                  value={form.toDate}
                  onChange={(value) => updateField('toDate', value)}
                  required
                />
              </div>

              <div className="form-field">
                <span>Half Day</span>
                <div className="leave-segmented" role="group" aria-label="Half day selection">
                  {['No', 'Yes'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`leave-segmented-btn${form.halfDay === option ? ' is-selected' : ''}`}
                      onClick={() => updateField('halfDay', option)}
                      aria-pressed={form.halfDay === option}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Live Leave Balance Deduction Preview */}
              <div
                className="leave-balance-preview-card"
                style={{
                  background: isExceeded
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)',
                  border: `1px solid ${isExceeded ? '#fca5a5' : 'rgba(99, 102, 241, 0.2)'}`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  margin: '6px 0 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                    {catStats.name} Balance
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: catStats.available > 0 ? 'rgba(22, 163, 74, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: catStats.available > 0 ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {catStats.available} / {catStats.total} remaining
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--muted, #64748b)' }}>
                    Requesting: <strong style={{ color: 'var(--text-primary, #1e293b)' }}>{calculatedDays} {calculatedDays === 1 ? 'day' : 'days'}</strong>
                  </span>
                  <span style={{ fontWeight: 600, color: isExceeded ? '#dc2626' : '#16a34a' }}>
                    Remaining after leave: <strong>{isExceeded ? 0 : remainingAfter} days</strong>
                  </span>
                </div>

                {isExceeded && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 500,
                    }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>Requested {calculatedDays} days exceeds your available balance ({catStats.available} days). Request will be submitted for manager approval (may be marked as LWP/unpaid leave).</span>
                  </div>
                )}
              </div>

              <label className="form-field form-field-wide">
                <span>Reason for Leave</span>
                <textarea
                  rows="3"
                  value={form.reason}
                  onChange={(event) => updateField('reason', event.target.value)}
                  placeholder="Tell us briefly why you need leave..."
                  required
                />
              </label>

              {submitError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    fontSize: '12.5px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="leave-modal-note">
                <CalendarDays size={15} />
                <span>Your request will immediately deduct from your remaining leave balance and notify your manager.</span>
              </div>

              <div className="leave-modal-actions">
                <button className="secondary-btn" type="button" onClick={closeModal}>Cancel</button>
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={isSubmitting || !form.fromDate || !form.toDate}
                  style={{
                    opacity: isSubmitting || !form.fromDate || !form.toDate ? 0.6 : 1,
                    cursor: isSubmitting || !form.fromDate || !form.toDate ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Check size={16} /> {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function LeaveBalance() {
  const [balance, setBalance] = React.useState({
    casualLeave: { total: 10, used: 0, available: 10, pending: 0 },
    sickLeave: { total: 8, used: 0, available: 8, pending: 0 },
    optionalHoliday: { total: 3, used: 0, available: 3, pending: 0 },
    totalAvailable: 21,
    allowed: 21,
    used: 0,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchBalance = React.useCallback(() => {
    setLoading(true);
    setError(null);
    api.getLeaveBalance().then((data) => {
      if (data?.casualLeave || data?.totalAvailable != null) setBalance(data);
      setLoading(false);
    }).catch((err) => {
      console.warn('Failed to fetch leave balance:', err);
      setError(err);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 4000);
    const handleSync = () => fetchBalance();
    window.addEventListener('focus', handleSync);
    window.addEventListener('leave-balance-updated', handleSync);
    window.addEventListener('leave-applied', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('leave-balance-updated', handleSync);
      window.removeEventListener('leave-applied', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchBalance]);

  const balances = [
    {
      name: 'Casual Leave',
      avail: (balance?.casualLeave?.available != null && Number(balance?.casualLeave?.total) > 0) ? balance.casualLeave.available : 10,
      total: (balance?.casualLeave?.total != null && Number(balance?.casualLeave?.total) > 0) ? balance.casualLeave.total : 10,
      used: balance?.casualLeave?.used ?? 0,
      pending: balance?.casualLeave?.pending ?? 0,
    },
    {
      name: 'Sick Leave',
      avail: (balance?.sickLeave?.available != null && Number(balance?.sickLeave?.total) > 0) ? balance.sickLeave.available : 8,
      total: (balance?.sickLeave?.total != null && Number(balance?.sickLeave?.total) > 0) ? balance.sickLeave.total : 8,
      used: balance?.sickLeave?.used ?? 0,
      pending: balance?.sickLeave?.pending ?? 0,
    },
    {
      name: 'Optional / Privilege Holiday',
      avail: (balance?.optionalHoliday?.available != null && Number(balance?.optionalHoliday?.total) > 0) ? balance.optionalHoliday.available : 3,
      total: (balance?.optionalHoliday?.total != null && Number(balance?.optionalHoliday?.total) > 0) ? balance.optionalHoliday.total : 3,
      used: balance?.optionalHoliday?.used ?? 0,
      pending: balance?.optionalHoliday?.pending ?? 0,
    },
  ];

  const totalAvail = balance?.totalAvailable ?? (balances.reduce((acc, b) => acc + b.avail, 0));
  const totalAllotted = balance?.allowed ?? (balances.reduce((acc, b) => acc + b.total, 0));
  const totalUsed = balance?.used ?? (balances.reduce((acc, b) => acc + b.used, 0));
  const usedPct = totalAllotted > 0 ? Math.round((totalUsed / totalAllotted) * 100) : 0;

  const LEAVE_COLORS = [
    { from: '#6d44f5', to: '#8d6bff', light: '#f5f3ff', border: '#ddd6fe', dot: '#6d44f5' },
    { from: '#0891b2', to: '#06b6d4', light: '#ecfeff', border: '#a5f3fc', dot: '#0891b2' },
    { from: '#059669', to: '#10b981', light: '#ecfdf5', border: '#a7f3d0', dot: '#059669' },
  ];

  const LEAVE_ICONS = ['🗓️', '🤒', '🌟'];
  const LEAVE_DESCS = [
    'Planned time-off for personal errands, vacation, or family occasions.',
    'Medically-required absence for illness, recovery, or health check-ups.',
    'Government-notified restricted holidays you can opt into.',
  ];

  return (
    <div className="lb-page">
      {/* ── 1. Simple Page Header ── */}
      <div className="lb-page-header">
        <div className="lb-page-header-left">
          <h1 className="lb-title">Leave Balance</h1>
          <p className="lb-subtitle">View your available, used, and remaining leave entitlement for the current leave year.</p>
        </div>
        <div className="lb-page-header-right">
          <div className="lb-year-pill">
            <Calendar size={13} />
            <span>FY 2026–2027</span>
          </div>
          <button
            type="button"
            className="lb-refresh-btn"
            onClick={fetchBalance}
            disabled={loading}
            title="Refresh leave balance"
          >
            <RefreshCw size={13} className={loading ? 'lb-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && !balance && (
        <div className="lb-error-card">
          <AlertCircle size={18} className="lb-error-icon" />
          <div className="lb-error-info">
            <strong>Unable to load your leave balance.</strong>
            <span>Please try again later or check your network.</span>
          </div>
          <button className="lb-retry-btn" onClick={fetchBalance}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── 2. Clean Summary Cards ── */}
      <div className="lb-summary-grid">
        <div className="lb-summary-card">
          <div className="lb-summary-icon lb-icon--green">
            <CheckCircle2 size={20} />
          </div>
          <div className="lb-summary-body">
            <span className="lb-summary-label">Available Leave</span>
            <div className="lb-summary-value-row">
              <strong className="lb-summary-value lb-val--green">{loading ? '—' : totalAvail}</strong>
              <span className="lb-summary-unit">days</span>
            </div>
            <span className="lb-summary-sub">Ready to apply</span>
          </div>
        </div>

        <div className="lb-summary-card">
          <div className="lb-summary-icon lb-icon--amber">
            <Clock4 size={20} />
          </div>
          <div className="lb-summary-body">
            <span className="lb-summary-label">Used Leave</span>
            <div className="lb-summary-value-row">
              <strong className="lb-summary-value lb-val--amber">{loading ? '—' : totalUsed}</strong>
              <span className="lb-summary-unit">days</span>
            </div>
            <span className="lb-summary-sub">{totalAllotted > 0 ? `${usedPct}% of annual quota` : '0% used'}</span>
          </div>
        </div>

        <div className="lb-summary-card">
          <div className="lb-summary-icon lb-icon--purple">
            <CalendarDays size={20} />
          </div>
          <div className="lb-summary-body">
            <span className="lb-summary-label">Annual Quota</span>
            <div className="lb-summary-value-row">
              <strong className="lb-summary-value lb-val--purple">{loading ? '—' : totalAllotted}</strong>
              <span className="lb-summary-unit">days</span>
            </div>
            <span className="lb-summary-sub">Total annual entitlement</span>
          </div>
        </div>
      </div>

      {/* ── 3. Section Title ── */}
      <div className="lb-section-header">
        <h2 className="lb-section-title">Leave Types</h2>
        <span className="lb-section-sub">Individual category allowances and live usage tracking</span>
      </div>

      {/* ── 4. Leave Type Cards ── */}
      <div className="lb-cards-grid">
        {balances.map((b, i) => {
          const col = LEAVE_COLORS[i] || LEAVE_COLORS[0];
          const usagePct = b.total > 0 ? Math.max(0, Math.min(100, Math.round((b.used / b.total) * 100))) : 0;
          return (
            <div
              className="lb-card"
              key={b.name}
              style={{
                '--lb-from': col.from,
                '--lb-to': col.to,
                '--lb-light': col.light,
                '--lb-border': col.border,
                '--lb-dot': col.dot,
              }}
            >
              <div className="lb-card-top">
                <div className="lb-card-meta">
                  <span className="lb-card-emoji">{LEAVE_ICONS[i]}</span>
                  <div>
                    <h3 className="lb-card-name">{b.name}</h3>
                    <p className="lb-card-desc">{LEAVE_DESCS[i]}</p>
                  </div>
                </div>
                <span className="lb-card-badge">
                  {b.total > 0 ? `${usagePct}% used` : '0% used'}
                </span>
              </div>

              <div className="lb-card-numbers">
                <div className="lb-card-num">
                  <span className="lb-card-num-val lb-num--avail">{b.avail}</span>
                  <span className="lb-card-num-label">Available</span>
                </div>
                <div className="lb-card-num">
                  <span className="lb-card-num-val lb-num-muted">{b.used}</span>
                  <span className="lb-card-num-label">Used</span>
                </div>
                <div className="lb-card-num">
                  <span className="lb-card-num-val lb-num-muted">{b.total}</span>
                  <span className="lb-card-num-label">Total Quota</span>
                </div>
                {b.pending > 0 && (
                  <div className="lb-card-num">
                    <span className="lb-card-num-val lb-num-amber">{b.pending}</span>
                    <span className="lb-card-num-label">Pending</span>
                  </div>
                )}
              </div>

              <div className="lb-card-progress-wrap">
                <div className="lb-card-progress-bar">
                  <div
                    className="lb-card-progress-fill"
                    style={{ width: `${Math.min(100, usagePct)}%` }}
                  />
                </div>
                <div className="lb-card-progress-labels">
                  <span>{b.avail} days remaining</span>
                  <span>{usagePct}% used of {b.total}</span>
                </div>
              </div>

              {b.pending > 0 && (
                <div className="lb-card-pending-note">
                  ⏳ {b.pending} day{b.pending !== 1 ? 's' : ''} pending approval
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 5. Policy Info Strip ── */}
      <div className="lb-policy-strip">
        <div className="lb-policy-item">
          <span className="lb-policy-icon">📋</span>
          <div>
            <strong>Leave Policy</strong>
            <span>Annual entitlement resets on 1 January each year</span>
          </div>
        </div>
        <div className="lb-policy-divider" />
        <div className="lb-policy-item">
          <span className="lb-policy-icon">⚡</span>
          <div>
            <strong>Carry Forward</strong>
            <span>Unused casual leaves up to 5 days may be carried forward</span>
          </div>
        </div>
        <div className="lb-policy-divider" />
        <div className="lb-policy-item">
          <span className="lb-policy-icon">🔔</span>
          <div>
            <strong>Approval Process</strong>
            <span>Requests are reviewed by your reporting manager within 48 hours</span>
          </div>
        </div>
      </div>

      <style>{`
        .lb-page {
          position: relative;
          width: 100%;
        }

        /* ── Simple Page Header ── */
        .lb-page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .lb-page-header-left { min-width: 0; }
        .lb-title {
          margin: 0;
          font-family: Poppins, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .lb-subtitle {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }
        .lb-page-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lb-year-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 99px;
          background: var(--surface-2);
          color: var(--text);
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border);
        }
        .lb-refresh-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 38px;
          padding: 0 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          transition: all 0.16s ease;
        }
        .lb-refresh-btn:hover:not(:disabled) {
          background: var(--surface-2);
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-1px);
        }
        .lb-refresh-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        @keyframes lbSpin {
          100% { transform: rotate(360deg); }
        }
        .lb-spin {
          animation: lbSpin 0.8s linear infinite;
        }

        /* ── Error Banner ── */
        .lb-error-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 20px;
          color: #991b1b;
        }
        .lb-error-icon { color: #dc2626; flex: none; }
        .lb-error-info { flex: 1; }
        .lb-error-info strong { display: block; font-size: 13px; font-weight: 600; }
        .lb-error-info span { font-size: 12px; color: #b91c1c; }
        .lb-retry-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #dc2626;
          background: #fff;
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        /* ── Summary Cards ── */
        .lb-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        .lb-summary-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: var(--shadow);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .lb-summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(31, 24, 69, 0.08);
        }
        .lb-summary-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex: none;
        }
        .lb-icon--green { background: #ecfdf5; color: #10b981; }
        .lb-icon--amber { background: #fffbeb; color: #f59e0b; }
        .lb-icon--purple { background: var(--primary-100, #f5f3ff); color: var(--primary, #6d44f5); }
        .lb-summary-body {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .lb-summary-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--muted);
          margin-bottom: 3px;
        }
        .lb-summary-value-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .lb-summary-value {
          font-family: Poppins, sans-serif;
          font-size: 26px;
          font-weight: 700;
          line-height: 1.1;
        }
        .lb-val--green { color: #10b981; }
        .lb-val--amber { color: #d97706; }
        .lb-val--purple { color: var(--primary, #6d44f5); }
        .lb-summary-unit {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
        }
        .lb-summary-sub {
          font-size: 11px;
          color: var(--muted);
          margin-top: 3px;
        }

        /* ── Section Header ── */
        .lb-section-header {
          margin-bottom: 14px;
        }
        .lb-section-title {
          margin: 0;
          font-family: Poppins, sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .lb-section-sub {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
          display: block;
        }

        /* ── Leave Type Cards ── */
        .lb-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-bottom: 24px;
        }
        .lb-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: var(--shadow);
        }
        .lb-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(31, 24, 69, 0.08);
        }
        .lb-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .lb-card-meta {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .lb-card-emoji {
          font-size: 24px;
          line-height: 1;
          flex: none;
          margin-top: 2px;
        }
        .lb-card-name {
          font-family: Poppins, sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px;
        }
        .lb-card-desc {
          font-size: 12px;
          color: var(--muted);
          margin: 0;
          line-height: 1.45;
        }
        .lb-card-badge {
          flex: none;
          background: var(--lb-light, #f5f3ff);
          color: var(--lb-dot, #6d44f5);
          border: 1px solid var(--lb-border, #ddd6fe);
          border-radius: 8px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: 700;
          font-family: Poppins, sans-serif;
        }
        .lb-card-numbers {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding: 12px 14px;
          background: var(--surface-2);
          border-radius: 10px;
          border: 1px solid var(--border);
        }
        .lb-card-num {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .lb-card-num-val {
          font-family: Poppins, sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          line-height: 1.1;
        }
        .lb-num--avail { color: var(--primary, #6d44f5); }
        .lb-num-muted { color: var(--muted) !important; }
        .lb-num-amber { color: #d97706 !important; }
        .lb-card-num-label {
          font-size: 10px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }
        .lb-card-progress-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .lb-card-progress-bar {
          height: 6px;
          border-radius: 99px;
          background: var(--border);
          overflow: hidden;
        }
        .lb-card-progress-fill {
          height: 100%;
          border-radius: 99px;
          background: var(--primary, #6d44f5);
          transition: width 0.6s ease;
        }
        .lb-card-progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--muted);
        }
        .lb-card-pending-note {
          font-size: 11px;
          color: #d97706;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 7px 10px;
          font-weight: 500;
        }

        /* ── Policy Info Strip ── */
        .lb-policy-strip {
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px 20px;
          margin-top: 10px;
        }
        .lb-policy-item {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        .lb-policy-icon {
          font-size: 20px;
          flex: none;
        }
        .lb-policy-item strong {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 2px;
        }
        .lb-policy-item span {
          display: block;
          font-size: 11px;
          color: var(--muted);
          line-height: 1.4;
        }
        .lb-policy-divider {
          width: 1px;
          height: 38px;
          background: var(--border);
          margin: 0 20px;
          flex: none;
        }

        /* ── Responsive ── */
        @media (max-width: 960px) {
          .lb-summary-grid { grid-template-columns: repeat(2, 1fr); }
          .lb-cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .lb-summary-grid { grid-template-columns: 1fr; }
          .lb-cards-grid { grid-template-columns: 1fr; }
          .lb-policy-strip { flex-direction: column; gap: 14px; align-items: flex-start; }
          .lb-policy-divider { display: none; }
        }
      `}</style>
    </div>
  );
}

function CompOffPage() {
  const [rows, setRows] = React.useState(compOffRows);
  const [loading, setLoading] = React.useState(false);

  const fetchCompOffs = React.useCallback(() => {
    setLoading(true);
    api.getCompOffs().then((data) => {
      if (Array.isArray(data) && data.length > 0) setRows(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchCompOffs();
  }, [fetchCompOffs]);

  const totalCredited = rows.reduce((acc, r) => acc + (Number(r.credited) || 0), 0);
  const totalUsed = rows.reduce((acc, r) => acc + (Number(r.used) || 0), 0);
  const totalAvailable = Math.max(0, totalCredited - totalUsed);
  const pendingCount = rows.filter(r => String(r.status || '').toLowerCase() === 'pending').length;

  const statusDot = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'approved') return { bg: '#ecfdf5', color: '#059669', dot: '#10b981', label: 'Approved' };
    if (v === 'pending') return { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b', label: 'Pending' };
    if (v === 'rejected' || v === 'expired') return { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444', label: s };
    return { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', label: s || '—' };
  };

  return (
    <div className="co-page">
      {/* ── 1. Simple Page Header ── */}
      <div className="co-page-header">
        <div className="co-page-header-left">
          <h1 className="co-title">Comp-Off List</h1>
          <p className="co-subtitle">View compensatory off credits earned and usage history</p>
        </div>
        <div className="co-page-header-right">
          <button
            type="button"
            className="co-refresh-btn"
            onClick={fetchCompOffs}
            disabled={loading}
            title="Refresh comp-off list"
          >
            <RefreshCw size={13} className={loading ? 'co-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. Clean Summary Cards ── */}
      <div className="co-summary-grid">
        <div className="co-summary-card">
          <div className="co-summary-icon co-icon--green">
            <CheckCircle2 size={20} />
          </div>
          <div className="co-summary-body">
            <span className="co-summary-label">Available Days</span>
            <div className="co-summary-value-row">
              <strong className="co-summary-value co-val--green">{totalAvailable}</strong>
              <span className="co-summary-unit">days</span>
            </div>
            <span className="co-summary-sub">Ready to apply</span>
          </div>
        </div>

        <div className="co-summary-card">
          <div className="co-summary-icon co-icon--amber">
            <Clock4 size={20} />
          </div>
          <div className="co-summary-body">
            <span className="co-summary-label">Used Days</span>
            <div className="co-summary-value-row">
              <strong className="co-summary-value co-val--amber">{totalUsed}</strong>
              <span className="co-summary-unit">days</span>
            </div>
            <span className="co-summary-sub">Claimed leaves</span>
          </div>
        </div>

        <div className="co-summary-card">
          <div className="co-summary-icon co-icon--purple">
            <CalendarDays size={20} />
          </div>
          <div className="co-summary-body">
            <span className="co-summary-label">Total Credited</span>
            <div className="co-summary-value-row">
              <strong className="co-summary-value co-val--purple">{totalCredited}</strong>
              <span className="co-summary-unit">days</span>
            </div>
            <span className="co-summary-sub">Earned to date</span>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="co-summary-card">
            <div className="co-summary-icon co-icon--amber">
              <AlertCircle size={20} />
            </div>
            <div className="co-summary-body">
              <span className="co-summary-label">Pending Approval</span>
              <div className="co-summary-value-row">
                <strong className="co-summary-value co-val--amber">{pendingCount}</strong>
                <span className="co-summary-unit">requests</span>
              </div>
              <span className="co-summary-sub">Awaiting manager</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. History Table ── */}
      <div className="co-card">
        <div className="co-card-header">
          <div>
            <h2 className="co-card-title">Comp-Off History</h2>
            <p className="co-card-sub">Credits granted to your employee account</p>
          </div>
          <span className="co-record-badge">
            {rows.length} record{rows.length !== 1 ? 's' : ''}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="co-empty-state">
            <div className="co-empty-icon">☀️</div>
            <h3 className="co-empty-title">No Comp-Off Credits Yet</h3>
            <p className="co-empty-desc">
              You haven't earned any compensatory off credits. Credits are issued when you work on official holidays, weekends, or beyond regular hours.
            </p>
            <div className="co-empty-note">
              ℹ️ &nbsp; Credits appear here once approved by your manager
            </div>
          </div>
        ) : (
          <div className="co-table-wrap">
            <table className="co-table">
              <thead>
                <tr>
                  {['Credit Date', 'Reason', 'Credited', 'Used', 'Available', 'Status'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const avail = Math.max(0, (Number(r.credited) || 0) - (Number(r.used) || 0));
                  const st = statusDot(r.status);
                  return (
                    <tr key={i}>
                      <td className="co-cell-date">{r.date || r.credit_date || '—'}</td>
                      <td className="co-cell-reason">{r.reason || '—'}</td>
                      <td>
                        <span className="co-val-credited">{r.credited ?? '—'}</span>
                        <span className="co-unit">days</span>
                      </td>
                      <td>
                        <span className="co-val-used">{r.used ?? '0'}</span>
                        <span className="co-unit">days</span>
                      </td>
                      <td>
                        <span className={`co-val-avail ${avail > 0 ? 'co-val-avail--pos' : 'co-val-avail--zero'}`}>{avail}</span>
                        <span className="co-unit">days</span>
                      </td>
                      <td>
                        <span className="co-badge" style={{ background: st.bg, color: st.color }}>
                          <span className="co-badge-dot" style={{ background: st.dot }} />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. Policy Info Strip ── */}
      <div className="co-policy-strip">
        {[
          { icon: '📋', title: 'Validity', desc: 'Comp-off credits are valid for 60 days from the date of issuance' },
          { icon: '⚡', title: 'Earning', desc: 'Earned by working on official holidays, weekends, or on-call duties' },
          { icon: '✅', title: 'Redemption', desc: 'Apply through My Leave Applications section, selecting "Comp-off"' },
        ].map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="co-policy-divider" />}
            <div className="co-policy-item">
              <span className="co-policy-icon">{item.icon}</span>
              <div>
                <strong>{item.title}</strong>
                <span>{item.desc}</span>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <style>{`
        .co-page { position: relative; width: 100%; }

        /* Header */
        .co-page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .co-page-header-left { min-width: 0; }
        .co-title {
          margin: 0;
          font-family: Poppins, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .co-subtitle {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }
        .co-page-header-right { display: flex; align-items: center; gap: 10px; }
        .co-refresh-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 38px;
          padding: 0 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          transition: all 0.16s ease;
        }
        .co-refresh-btn:hover:not(:disabled) {
          background: var(--surface-2);
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-1px);
        }
        .co-refresh-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        @keyframes coSpin { 100% { transform: rotate(360deg); } }
        .co-spin { animation: coSpin 0.8s linear infinite; }

        /* Summary Cards */
        .co-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        .co-summary-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: var(--shadow);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .co-summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(31, 24, 69, 0.08);
        }
        .co-summary-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex: none;
        }
        .co-icon--green { background: #ecfdf5; color: #10b981; }
        .co-icon--amber { background: #fffbeb; color: #f59e0b; }
        .co-icon--purple { background: var(--primary-100, #f5f3ff); color: var(--primary, #6d44f5); }
        .co-summary-body { display: flex; flex-direction: column; min-width: 0; }
        .co-summary-label { font-size: 12px; font-weight: 500; color: var(--muted); margin-bottom: 3px; }
        .co-summary-value-row { display: flex; align-items: baseline; gap: 6px; }
        .co-summary-value { font-family: Poppins, sans-serif; font-size: 26px; font-weight: 700; line-height: 1.1; }
        .co-val--green { color: #10b981; }
        .co-val--amber { color: #d97706; }
        .co-val--purple { color: var(--primary, #6d44f5); }
        .co-summary-unit { font-size: 12px; font-weight: 600; color: var(--muted); }
        .co-summary-sub { font-size: 11px; color: var(--muted); margin-top: 3px; }

        /* Table Card */
        .co-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--shadow);
        }
        .co-card-header {
          padding: 18px 24px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .co-card-title {
          font-family: Poppins, sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .co-card-sub { font-size: 12px; color: var(--muted); margin: 3px 0 0; }
        .co-record-badge {
          font-size: 12px;
          color: var(--muted);
          background: var(--surface-2);
          padding: 5px 12px;
          border-radius: 8px;
          font-weight: 600;
        }
        .co-table-wrap { overflow-x: auto; }
        .co-table { width: 100%; border-collapse: collapse; }
        .co-table th {
          padding: 12px 18px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border);
          background: var(--surface-2);
          white-space: nowrap;
        }
        .co-table td {
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .co-table tr:hover td { background: var(--surface-2); }
        .co-cell-date { font-size: 13px; color: var(--text); font-weight: 600; }
        .co-cell-reason { font-size: 13px; color: var(--text); max-width: 240px; }
        .co-val-credited { font-family: Poppins, sans-serif; font-size: 15px; font-weight: 700; color: #0891b2; }
        .co-val-used { font-family: Poppins, sans-serif; font-size: 15px; font-weight: 700; color: #f59e0b; }
        .co-val-avail { font-family: Poppins, sans-serif; font-size: 15px; font-weight: 700; }
        .co-val-avail--pos { color: #059669; }
        .co-val-avail--zero { color: var(--muted); }
        .co-unit { font-size: 11px; color: var(--muted); margin-left: 3px; }
        .co-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 7px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 700;
        }
        .co-badge-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; }

        /* Empty state */
        .co-empty-state { padding: 60px 24px; text-align: center; }
        .co-empty-icon { font-size: 48px; margin-bottom: 14px; }
        .co-empty-title { font-family: Poppins, sans-serif; font-size: 16px; font-weight: 700; color: var(--text); margin: 0 0 8px; }
        .co-empty-desc { font-size: 13px; color: var(--muted); margin: 0 auto; max-width: 400px; line-height: 1.5; }
        .co-empty-note { margin-top: 20px; display: inline-flex; align-items: center; gap: 8px; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 10px; padding: 10px 16px; color: #0891b2; font-size: 12px; font-weight: 600; }

        /* Policy Strip */
        .co-policy-strip {
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px 20px;
          margin-top: 20px;
        }
        .co-policy-item { display: flex; align-items: center; gap: 12px; flex: 1; }
        .co-policy-icon { font-size: 20px; flex: none; }
        .co-policy-item strong { display: block; font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
        .co-policy-item span { display: block; font-size: 11px; color: var(--muted); line-height: 1.4; }
        .co-policy-divider { width: 1px; height: 38px; background: var(--border); margin: 0 20px; flex: none; }

        @media (max-width: 768px) {
          .co-policy-strip { flex-direction: column; gap: 14px; align-items: flex-start; }
          .co-policy-divider { display: none; }
        }
      `}</style>
    </div>
  );
}

function HolidayList() {
  const [rows, setRows] = React.useState(holidayRows);
  const [loading, setLoading] = React.useState(false);

  const fetchHolidays = React.useCallback(() => {
    setLoading(true);
    api.getHolidays().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setRows(data.map(h => ({
          date: h.date, name: h.title || h.name, day: h.day, type: h.type || 'National',
        })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const today = new Date();
  const parseDate = (s) => { try { return new Date(s); } catch { return null; } };
  const upcoming = rows.filter(r => { const d = parseDate(r.date); return d && d >= today; });
  const past = rows.filter(r => { const d = parseDate(r.date); return d && d < today; });
  const nextHoliday = upcoming[0];

  const typeStyle = (t) => {
    const v = String(t || '').toLowerCase();
    if (v === 'national') return { bg: '#eff6ff', color: '#2563eb', label: 'National' };
    if (v === 'gazetted') return { bg: '#f5f3ff', color: '#7c3aed', label: 'Gazetted' };
    if (v === 'optional') return { bg: '#fef9c3', color: '#ca8a04', label: 'Optional' };
    return { bg: '#f1f5f9', color: '#475569', label: t || 'Holiday' };
  };

  const dayEmoji = (d) => {
    const v = String(d || '').toLowerCase();
    if (v === 'monday') return '🟦';
    if (v === 'friday') return '🟩';
    if (v.includes('sat') || v.includes('sun')) return '🟨';
    return '🟧';
  };

  return (
    <div className="hl-page">
      {/* ── 1. Simple Page Header ── */}
      <div className="hl-page-header">
        <div className="hl-page-header-left">
          <h1 className="hl-title">Holiday List</h1>
          <p className="hl-subtitle">Official company holidays and gazetted days off for the current calendar year</p>
        </div>
        <div className="hl-page-header-right">
          <div className="hl-year-pill">
            <Calendar size={13} />
            <span>CY 2026</span>
          </div>
          <button
            type="button"
            className="hl-refresh-btn"
            onClick={fetchHolidays}
            disabled={loading}
            title="Refresh holiday list"
          >
            <RefreshCw size={13} className={loading ? 'hl-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. Clean Summary Cards ── */}
      <div className="hl-summary-grid">
        <div className="hl-summary-card">
          <div className="hl-summary-icon hl-icon--purple">
            <CalendarDays size={20} />
          </div>
          <div className="hl-summary-body">
            <span className="hl-summary-label">Total Holidays</span>
            <div className="hl-summary-value-row">
              <strong className="hl-summary-value hl-val--purple">{rows.length}</strong>
              <span className="hl-summary-unit">days</span>
            </div>
            <span className="hl-summary-sub">Scheduled for 2026</span>
          </div>
        </div>

        <div className="hl-summary-card">
          <div className="hl-summary-icon hl-icon--green">
            <CheckCircle2 size={20} />
          </div>
          <div className="hl-summary-body">
            <span className="hl-summary-label">Upcoming Holidays</span>
            <div className="hl-summary-value-row">
              <strong className="hl-summary-value hl-val--green">{upcoming.length}</strong>
              <span className="hl-summary-unit">days</span>
            </div>
            <span className="hl-summary-sub">Remaining this year</span>
          </div>
        </div>

        <div className="hl-summary-card">
          <div className="hl-summary-icon hl-icon--amber">
            <Clock4 size={20} />
          </div>
          <div className="hl-summary-body">
            <span className="hl-summary-label">Past Holidays</span>
            <div className="hl-summary-value-row">
              <strong className="hl-summary-value hl-val--amber">{past.length}</strong>
              <span className="hl-summary-unit">days</span>
            </div>
            <span className="hl-summary-sub">Observed</span>
          </div>
        </div>

        {nextHoliday && (
          <div className="hl-summary-card hl-summary-card--next">
            <div className="hl-summary-icon hl-icon--next">
              <Calendar size={20} />
            </div>
            <div className="hl-summary-body">
              <span className="hl-summary-label">Next Upcoming</span>
              <strong className="hl-summary-next-name">{nextHoliday.name}</strong>
              <span className="hl-summary-sub">{nextHoliday.date} · {nextHoliday.day}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Section Header ── */}
      <div className="hl-section-header">
        <h2 className="hl-section-title">All Holidays</h2>
        <span className="hl-section-sub">Company holiday schedule and observation dates</span>
      </div>

      {/* ── 4. Holidays Grid ── */}
      <div className="hl-cards-grid">
        {rows.map((r, i) => {
          const d = parseDate(r.date);
          const isPast = d && d < today;
          const isNext = nextHoliday && r.name === nextHoliday.name;
          const ts = typeStyle(r.type);
          return (
            <div
              key={i}
              className={`hl-card ${isNext ? 'hl-card--next' : ''} ${isPast ? 'hl-card--past' : ''}`}
            >
              {isNext && (
                <div className="hl-badge-next">NEXT</div>
              )}
              <div className="hl-card-content">
                <div className={`hl-date-badge ${isPast ? 'hl-date-badge--past' : ''}`} style={{ background: isPast ? undefined : ts.bg }}>
                  <span className="hl-date-year" style={{ color: isPast ? undefined : ts.color }}>
                    {r.date ? String(r.date).split(' ').slice(-1)[0] || '2026' : '2026'}
                  </span>
                  <span className="hl-date-day" style={{ color: isPast ? undefined : ts.color }}>
                    {r.date ? String(r.date).split(' ')[0] : '—'}
                  </span>
                  <span className="hl-date-month" style={{ color: isPast ? undefined : ts.color }}>
                    {r.date ? String(r.date).split(' ')[1] || '' : ''}
                  </span>
                </div>
                <div className="hl-card-info">
                  <h3 className="hl-card-name">{r.name || '—'}</h3>
                  <div className="hl-card-day-row">
                    <span>{dayEmoji(r.day)}</span>
                    <span className="hl-card-day-text">{r.day || '—'}</span>
                    <span className="hl-type-pill" style={{ background: ts.bg, color: ts.color }}>
                      {ts.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div className="hl-empty-state">
          <div className="hl-empty-icon">🗓️</div>
          <h3 className="hl-empty-title">No holidays loaded</h3>
          <p className="hl-empty-desc">Company holiday calendar will appear here once published by HR.</p>
        </div>
      )}

      <style>{`
        .hl-page { position: relative; width: 100%; }

        /* Header */
        .hl-page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .hl-page-header-left { min-width: 0; }
        .hl-title {
          margin: 0;
          font-family: Poppins, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .hl-subtitle {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }
        .hl-page-header-right { display: flex; align-items: center; gap: 10px; }
        .hl-year-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 99px;
          background: var(--surface-2);
          color: var(--text);
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border);
        }
        .hl-refresh-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 38px;
          padding: 0 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          transition: all 0.16s ease;
        }
        .hl-refresh-btn:hover:not(:disabled) {
          background: var(--surface-2);
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-1px);
        }
        .hl-refresh-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        @keyframes hlSpin { 100% { transform: rotate(360deg); } }
        .hl-spin { animation: hlSpin 0.8s linear infinite; }

        /* Summary Cards */
        .hl-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        .hl-summary-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: var(--shadow);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .hl-summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(31, 24, 69, 0.08);
        }
        .hl-summary-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex: none;
        }
        .hl-icon--purple { background: var(--primary-100, #f5f3ff); color: var(--primary, #6d44f5); }
        .hl-icon--green { background: #ecfdf5; color: #10b981; }
        .hl-icon--amber { background: #fffbeb; color: #f59e0b; }
        .hl-icon--next { background: #ede9fe; color: #7c3aed; }
        .hl-summary-card--next {
          border-color: #ddd6fe;
          background: var(--surface);
        }
        .hl-summary-body { display: flex; flex-direction: column; min-width: 0; }
        .hl-summary-label { font-size: 12px; font-weight: 500; color: var(--muted); margin-bottom: 3px; }
        .hl-summary-value-row { display: flex; align-items: baseline; gap: 6px; }
        .hl-summary-value { font-family: Poppins, sans-serif; font-size: 26px; font-weight: 700; line-height: 1.1; }
        .hl-val--purple { color: var(--primary, #6d44f5); }
        .hl-val--green { color: #10b981; }
        .hl-val--amber { color: #d97706; }
        .hl-summary-unit { font-size: 12px; font-weight: 600; color: var(--muted); }
        .hl-summary-next-name {
          font-family: Poppins, sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hl-summary-sub { font-size: 11px; color: var(--muted); margin-top: 3px; }

        /* Section Header */
        .hl-section-header { margin-bottom: 14px; }
        .hl-section-title {
          margin: 0;
          font-family: Poppins, sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .hl-section-sub { font-size: 12px; color: var(--muted); margin-top: 2px; display: block; }

        /* Holiday Cards Grid */
        .hl-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .hl-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px 18px;
          position: relative;
          box-shadow: var(--shadow);
          transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
        }
        .hl-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(31, 24, 69, 0.08);
        }
        .hl-card--next {
          border-color: var(--primary, #6d44f5);
          box-shadow: 0 4px 16px rgba(109, 68, 245, 0.1);
        }
        .hl-card--past { opacity: 0.65; }
        .hl-badge-next {
          position: absolute;
          top: 10px;
          right: 12px;
          background: var(--primary, #6d44f5);
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 5px;
          letter-spacing: 0.06em;
        }
        .hl-card-content { display: flex; align-items: flex-start; gap: 14px; }
        .hl-date-badge {
          flex: none;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
        }
        .hl-date-badge--past { background: var(--surface-2) !important; border-color: var(--border) !important; }
        .hl-date-year { font-size: 8px; font-weight: 700; letter-spacing: 0.06em; }
        .hl-date-day { font-family: Poppins, sans-serif; font-size: 19px; font-weight: 800; line-height: 1.05; }
        .hl-date-month { font-size: 8px; font-weight: 700; letter-spacing: 0.04em; }
        .hl-card-info { flex: 1; min-width: 0; }
        .hl-card-name {
          font-family: Poppins, sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 6px;
          line-height: 1.3;
        }
        .hl-card-day-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .hl-card-day-text { font-size: 12px; color: var(--muted); }
        .hl-type-pill {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 5px;
        }

        /* Empty state */
        .hl-empty-state {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 52px 24px;
          text-align: center;
        }
        .hl-empty-icon { font-size: 48px; margin-bottom: 14px; }
        .hl-empty-title { font-family: Poppins, sans-serif; font-size: 16px; font-weight: 700; color: var(--text); margin: 0 0 8px; }
        .hl-empty-desc { font-size: 13px; color: var(--muted); margin: 0; }
      `}</style>
    </div>
  );
}

const payslipRows = [];

function Payslips() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = React.useState('2026-2027');
  const [slips, setSlips] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [ytdSummary, setYtdSummary] = React.useState({
    months_paid: 0,
    gross_earnings: 0,
    net_take_home: 0,
    employer_contributions: 0,
    total_ctc: 0,
    composition: { net_pct: 100, deductions_pct: 0, contributions_pct: 0 }
  });
  const [selectedSlip, setSelectedSlip] = React.useState(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState('');

  const empCode = localStorage.getItem('hrms_user_emp_code') || employee?.employeeId || employee?.emp_code || 'LE258';
  const empName = employee?.name || 'BIKITA HAIT';
  const initials = empName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'BH';

  const loadPayslips = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://quickchex-backend.onrender.com/api/v1/payslips?emp_code=${encodeURIComponent(empCode)}&financial_year=${encodeURIComponent(selectedYear)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.slips) {
          setYtdSummary(data.ytd_summary || {});
          const mapped = data.slips.map((d) => {
            const basic = d.basic_salary || 0;
            const hra = d.hra || 0;
            const allow = d.special_allowance || 0;
            const pf = d.pf_deduction || 0;
            const pt = d.pt_deduction || 200;
            const net = d.net_salary || (basic + hra + allow - pf - pt);
            const gross = d.gross_earnings || (basic + hra + allow);

            return {
              id: d.id,
              month: `${d.month} ${d.year}`,
              monthName: d.month,
              year: d.year,
              generatedOn: d.generated_on ? `30 ${d.month?.slice(0, 3)} ${d.year}` : `30 ${d.month?.slice(0, 3)} ${d.year}`,
              netSalary: net,
              grossSalary: gross,
              deductions: d.total_deductions,
              employerContributions: d.employer_contributions,
              ctc: d.ctc,
              status: d.status || 'Paid',
              payroll: {
                totalDays: d.total_days || 30,
                paidDays: d.paid_days || 30,
                arrearDays: 0,
                absentDays: 0,
                earnings: [
                  { label: 'Basic Salary', amount: basic },
                  { label: 'House Rent Allowance (HRA)', amount: hra },
                  { label: 'Special Allowances', amount: allow },
                ].filter(e => e.amount > 0),
                grossEarnings: gross,
                deductions: [
                  { label: 'Provident Fund (PF)', amount: pf },
                  { label: 'Professional Tax', amount: pt },
                ].filter(ded => ded.amount > 0),
              },
            };
          });
          setSlips(mapped);
        }
      }
    } catch (err) {
      console.warn('Error loading payslips:', err);
    } finally {
      setLoading(false);
    }
  }, [empCode, selectedYear]);

  React.useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  React.useEffect(() => {
    if (!selectedSlip) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isDownloading) setSelectedSlip(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedSlip, isDownloading]);

  const downloadSelected = async (slip) => {
    if (isDownloading || !slip) return;
    setIsDownloading(true);
    setDownloadError('');

    try {
      const pdfBlob = createPayslipPdfBlob(slip);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slugifyFileName(empName)}-${slugifyFileName(slip.month)}-Payslip.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) {
      console.error('Payslip download failed:', error);
      setDownloadError('We could not generate this payslip. Please try again.');
    } finally {
      window.setTimeout(() => setIsDownloading(false), 650);
    }
  };

  if (selectedSlip) {
    return (
      <div className="payslip-view-screen">
        <div className="payslip-view-header">
          <div>
            <span className="payslip-view-eyebrow">PAYROLL DOCUMENT</span>
            <h1>View Payslip</h1>
            <p>{selectedSlip.month} · {empName}</p>
          </div>
          <div className="payslip-view-header-actions">
            <button className="secondary-btn" type="button" disabled={isDownloading} onClick={() => setSelectedSlip(null)}>
              <ChevronLeft size={16} /> Back
            </button>
            <button className="primary-btn" type="button" disabled={isDownloading} onClick={() => downloadSelected(selectedSlip)}>
              <Download size={16} /> {isDownloading ? 'Preparing PDF…' : 'Download PDF'}
            </button>
          </div>
        </div>

        {downloadError ? <div className="payslip-download-error" role="alert"><AlertCircle size={15} /> {downloadError}</div> : null}

        <div className="payslip-document-wrap">
          <PayslipDocument slip={selectedSlip} documentId="payslip-view-document" />
        </div>

        <div className="payslip-bottom-actions">
          <button className="payslip-bottom-back" type="button" disabled={isDownloading} onClick={() => setSelectedSlip(null)}>
            <ChevronLeft size={17} /> Back to Payslips
          </button>
          <button className="payslip-bottom-download" type="button" disabled={isDownloading} onClick={() => downloadSelected(selectedSlip)}>
            <Download size={17} /> {isDownloading ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
    );
  }

  const comp = ytdSummary.composition || { net_pct: 100, deductions_pct: 0, contributions_pct: 0 };

  return (
    <div className="ps-page">
      {/* ── 1. Simple Page Header ── */}
      <div className="ps-page-header">
        <div className="ps-page-header-left">
          <h1 className="ps-title">Payslips</h1>
          <p className="ps-subtitle">Review, inspect, and download your monthly salary statements</p>
        </div>
        <div className="ps-page-header-right">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="ps-year-select"
          >
            <option value="2026-2027">FY 2026-2027</option>
            <option value="2025-2026">FY 2025-2026</option>
          </select>
          <button
            type="button"
            className="ps-refresh-btn"
            onClick={loadPayslips}
            disabled={loading}
            title="Refresh payslips"
          >
            <RefreshCw size={13} className={loading ? 'ps-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. Clean YTD Summary Card ── */}
      <div className="ps-ytd-card">
        <div className="ps-ytd-header">
          <div className="ps-ytd-header-left">
            <span className="ps-ytd-tag">Year-to-Date Summary</span>
            <span className="ps-ytd-year">{selectedYear}</span>
          </div>
          <div className="ps-ytd-emp-meta">
            <span className="ps-emp-avatar">{initials}</span>
            <span className="ps-emp-name">{empName}</span>
            <span className="ps-emp-dot">·</span>
            <span className="ps-emp-code">{empCode}</span>
            <span className="ps-emp-dot">·</span>
            <span className="ps-emp-months">{ytdSummary.months_paid || 0} month{ytdSummary.months_paid !== 1 ? 's' : ''} paid this FY</span>
          </div>
        </div>

        <div className="ps-metrics-grid">
          <div className="ps-metric-item">
            <div className="ps-metric-label-row">
              <div className="ps-metric-icon ps-icon--orange">💰</div>
              <span className="ps-metric-label">Gross Earnings</span>
            </div>
            <div className="ps-metric-val ps-val--orange">
              ₹{Number(ytdSummary.gross_earnings || 0).toLocaleString('en-IN')}
            </div>
            <span className="ps-metric-sub">Total earned before deductions</span>
          </div>

          <div className="ps-metric-item">
            <div className="ps-metric-label-row">
              <div className="ps-metric-icon ps-icon--green">🏠</div>
              <span className="ps-metric-label">Net Take-Home</span>
            </div>
            <div className="ps-metric-val ps-val--green">
              ₹{Number(ytdSummary.net_take_home || 0).toLocaleString('en-IN')}
            </div>
            <span className="ps-metric-sub">Disbursed to bank account</span>
          </div>

          <div className="ps-metric-item">
            <div className="ps-metric-label-row">
              <div className="ps-metric-icon ps-icon--purple">🤝</div>
              <span className="ps-metric-label">Employer Contrib.</span>
            </div>
            <div className="ps-metric-val ps-val--purple">
              ₹{Number(ytdSummary.employer_contributions || 0).toLocaleString('en-IN')}
            </div>
            <span className="ps-metric-sub">PF, gratuity & benefits</span>
          </div>

          <div className="ps-metric-item">
            <div className="ps-metric-label-row">
              <div className="ps-metric-icon ps-icon--slate">📊</div>
              <span className="ps-metric-label">Total CTC</span>
            </div>
            <div className="ps-metric-val ps-val--slate">
              ₹{Number(ytdSummary.total_ctc || 0).toLocaleString('en-IN')}
            </div>
            <span className="ps-metric-sub">Total cost to company</span>
          </div>
        </div>

        {/* CTC composition bar */}
        <div className="ps-composition-wrap">
          <div className="ps-composition-header">
            <span className="ps-composition-title">CTC Composition</span>
            <div className="ps-composition-legend">
              <span className="ps-legend-item">
                <span className="ps-legend-bullet" style={{ background: '#10b981' }} />
                Net {comp.net_pct || 100}%
              </span>
              <span className="ps-legend-item">
                <span className="ps-legend-bullet" style={{ background: '#f43f5e' }} />
                Deductions {comp.deductions_pct || 0}%
              </span>
              <span className="ps-legend-item">
                <span className="ps-legend-bullet" style={{ background: '#f59e0b' }} />
                Contributions {comp.contributions_pct || 0}%
              </span>
            </div>
          </div>
          <div className="ps-progress-bar">
            <div style={{ width: `${comp.net_pct || 100}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', transition: 'width 0.4s' }} />
            <div style={{ width: `${comp.deductions_pct || 0}%`, background: '#f43f5e', transition: 'width 0.4s' }} />
            <div style={{ width: `${comp.contributions_pct || 0}%`, background: '#f59e0b', transition: 'width 0.4s' }} />
          </div>
        </div>
      </div>

      {/* ── 3. Month-Wise History ── */}
      <div className="ps-history-header">
        <div className="ps-history-title-wrap">
          <span className="ps-history-label">Month-Wise History</span>
          <span className="ps-history-badge">{slips.length} payslip{slips.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {slips.length > 0 ? (
        <div className="ps-slips-list">
          {slips.map((slip) => (
            <div key={slip.id || slip.month} className="ps-slip-card">
              <div className="ps-slip-content">
                {/* Month icon */}
                <div className="ps-slip-month-box">
                  <span className="ps-slip-month-name">{String(slip.monthName || '').slice(0, 3)}</span>
                  <span className="ps-slip-month-year">{slip.year || ''}</span>
                </div>

                {/* Details */}
                <div className="ps-slip-info">
                  <div className="ps-slip-month-title">{slip.month}</div>
                  <div className="ps-slip-amounts-meta">
                    Gross <strong className="ps-gross-num">₹{Number(slip.grossSalary || 0).toLocaleString('en-IN')}</strong>
                    &nbsp;·&nbsp;
                    Deductions <strong className="ps-ded-num">₹{Number(slip.deductions || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Net */}
                <div className="ps-slip-net-box">
                  <div className="ps-slip-net-amount">₹{Number(slip.netSalary || 0).toLocaleString('en-IN')}</div>
                  <div className="ps-slip-net-label">Net take-home</div>
                </div>

                {/* Actions */}
                <div className="ps-slip-actions">
                  <span className="ps-status-badge">
                    <span className="ps-status-dot" />
                    {slip.status || 'Paid'}
                  </span>
                  <div className="ps-slip-btns">
                    <button
                      type="button"
                      className="ps-view-btn"
                      onClick={() => setSelectedSlip(slip)}
                    >
                      View <ArrowUpRight size={13} />
                    </button>
                    <button
                      type="button"
                      className="ps-dl-icon-btn"
                      title="Download PDF"
                      disabled={isDownloading}
                      onClick={() => downloadSelected(slip)}
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ps-empty-state">
          <div className="ps-empty-icon">💳</div>
          <h3 className="ps-empty-title">No Payslips Found</h3>
          <p className="ps-empty-desc">No payslips have been generated for <strong>{selectedYear}</strong> yet.<br />Please check back after your payroll is processed.</p>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .ps-page {
          width: 100%;
          min-height: 100%;
          background: var(--bg);
          color: var(--text);
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding-bottom: 40px;
        }
        .ps-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .ps-title {
          margin: 0;
          font-family: Poppins, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .ps-subtitle {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }
        .ps-page-header-right { display: flex; align-items: center; gap: 10px; }
        .ps-year-select {
          height: 38px !important;
          min-height: 38px !important;
          padding: 0 34px 0 14px !important;
          border-radius: 10px !important;
          border: 1px solid var(--border) !important;
          background-color: var(--surface) !important;
          color: var(--text) !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
          cursor: pointer !important;
          transition: border-color 0.16s ease;
        }
        .ps-year-select:hover {
          border-color: var(--primary) !important;
        }
        .ps-year-select option {
          background: var(--surface);
          color: var(--text);
        }
        .ps-refresh-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 38px;
          padding: 0 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          transition: all 0.16s ease;
        }
        .ps-refresh-btn:hover:not(:disabled) {
          background: var(--surface-2);
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-1px);
        }
        .ps-refresh-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        @keyframes psSpin { 100% { transform: rotate(360deg); } }
        .ps-spin { animation: psSpin 0.8s linear infinite; }

        /* YTD Summary Card */
        .ps-ytd-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow);
          overflow: hidden;
          margin-bottom: 28px;
        }
        .ps-ytd-header {
          padding: 16px 22px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          background: var(--surface-2, rgba(0,0,0,0.01));
        }
        .ps-ytd-header-left { display: flex; align-items: center; gap: 8px; }
        .ps-ytd-tag {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .ps-ytd-year {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          color: var(--primary);
          background: var(--primary-100, #f5f3ff);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .ps-ytd-emp-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--muted);
        }
        .ps-emp-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--primary, #6366f1);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ps-emp-name { font-weight: 600; color: var(--text); }
        .ps-emp-code { font-weight: 500; }
        .ps-emp-dot { color: var(--muted); opacity: 0.5; }
        .ps-emp-months { font-weight: 500; }

        /* Metrics Grid */
        .ps-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        @media (max-width: 900px) {
          .ps-metrics-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .ps-metrics-grid { grid-template-columns: 1fr; }
        }
        .ps-metric-item {
          padding: 18px 22px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .ps-metric-item:last-child { border-right: none; }
        @media (min-width: 901px) {
          .ps-metric-item { border-bottom: none; }
        }
        .ps-metric-label-row {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
        }
        .ps-metric-icon {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          flex: none;
        }
        .ps-icon--orange { background: #fff7ed; }
        .ps-icon--green { background: #ecfdf5; }
        .ps-icon--purple { background: #f5f3ff; }
        .ps-icon--slate { background: #f1f5f9; }
        .ps-metric-label {
          font-size: 12px;
          color: var(--muted);
          font-weight: 600;
        }
        .ps-metric-val {
          font-family: Poppins, sans-serif;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 4px;
        }
        .ps-val--orange { color: #ea580c; }
        .ps-val--green { color: #059669; }
        .ps-val--purple { color: #7c3aed; }
        .ps-val--slate { color: var(--text); }
        .ps-metric-sub {
          font-size: 11px;
          color: var(--muted);
          display: block;
        }

        /* CTC Composition */
        .ps-composition-wrap {
          padding: 14px 22px 16px;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }
        .ps-composition-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ps-composition-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: 0.03em;
        }
        .ps-composition-legend {
          display: flex;
          gap: 14px;
          font-size: 11px;
          font-weight: 600;
          color: var(--muted);
        }
        .ps-legend-item { display: inline-flex; align-items: center; gap: 5px; }
        .ps-legend-bullet { width: 8px; height: 8px; border-radius: 2px; }
        .ps-progress-bar {
          display: flex;
          height: 7px;
          border-radius: 5px;
          overflow: hidden;
          background: var(--border);
        }

        /* Month-Wise History */
        .ps-history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .ps-history-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ps-history-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .ps-history-badge {
          font-size: 11px;
          font-weight: 600;
          color: var(--muted);
          background: var(--surface-2, #f1f5f9);
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .ps-slips-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ps-slip-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: var(--shadow);
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .ps-slip-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(31, 24, 69, 0.08);
        }
        .ps-slip-content {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          gap: 16px;
        }
        .ps-slip-month-box {
          flex: none;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: var(--primary-100, #ede9fe);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(124, 58, 237, 0.15);
        }
        .ps-slip-month-name {
          font-size: 10px;
          font-weight: 700;
          color: var(--primary, #7c3aed);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .ps-slip-month-year {
          font-family: Poppins, sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: var(--primary, #6d28d9);
          line-height: 1.1;
        }
        .ps-slip-info { flex: 1; min-width: 0; }
        .ps-slip-month-title {
          font-family: Poppins, sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }
        .ps-slip-amounts-meta {
          font-size: 12px;
          color: var(--muted);
          margin-top: 3px;
        }
        .ps-gross-num { color: #ea580c; font-weight: 600; }
        .ps-ded-num { color: #ef4444; font-weight: 600; }
        .ps-slip-net-box {
          flex: none;
          text-align: right;
          padding: 0 8px;
        }
        .ps-slip-net-amount {
          font-family: Poppins, sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: #059669;
        }
        .ps-slip-net-label {
          font-size: 11px;
          color: var(--muted);
          margin-top: 1px;
        }
        .ps-slip-actions {
          flex: none;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .ps-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #ecfdf5;
          color: #059669;
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 10.5px;
          font-weight: 700;
        }
        .ps-status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
        }
        .ps-slip-btns {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ps-view-btn {
          background: var(--primary, #6366f1);
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(99,102,241,0.25);
          transition: all 0.16s ease;
        }
        .ps-view-btn:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .ps-dl-icon-btn {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 6px 9px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.16s ease;
        }
        .ps-dl-icon-btn:hover:not(:disabled) {
          background: var(--surface-2);
          border-color: var(--primary);
          color: var(--primary);
        }
        .ps-dl-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Empty State */
        .ps-empty-state {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 52px 24px;
          text-align: center;
          box-shadow: var(--shadow);
        }
        .ps-empty-icon { font-size: 44px; margin-bottom: 12px; }
        .ps-empty-title {
          font-family: Poppins, sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 8px;
        }
        .ps-empty-desc {
          font-size: 13px;
          color: var(--muted);
          margin: 0;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

function slugifyFileName(value) {
  return String(value || 'payslip')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function createPayslipPdfBlob(slip) {
  const payroll = slip.payroll || {};
  const gross = Number(payroll.grossEarnings || slip.netSalary || 0);
  const deductions = Array.isArray(payroll.deductions) ? payroll.deductions : [];
  const deductionsTotal = deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const net = Number(slip.netSalary || Math.max(0, gross - deductionsTotal));
  const earnings = Array.isArray(payroll.earnings) && payroll.earnings.length
    ? payroll.earnings
    : [{ label: 'Net Salary', amount: net }];

  const commands = [];
  const pageWidth = 595;
  const dark = [55, 55, 55];
  const orange = [239, 111, 47];
  const green = [0, 169, 104];
  const red = [220, 63, 79];
  const light = [245, 245, 248];
  const line = [210, 210, 218];
  const white = [255, 255, 255];

  const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const esc = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const text = (x, y, value, size = 9, bold = false, color = dark, align = 'left') => {
    const safe = esc(value);
    const width = safe.length * size * 0.48;
    const tx = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
    const font = bold ? '/F2' : '/F1';
    commands.push(`${color[0] / 255} ${color[1] / 255} ${color[2] / 255} rg BT ${font} ${size} Tf ${tx} ${y} Td (${safe}) Tj ET`);
  };
  const rect = (x, y, w, h, color) => {
    commands.push(`${color[0] / 255} ${color[1] / 255} ${color[2] / 255} rg ${x} ${y} ${w} ${h} re f`);
  };
  const lineTo = (x1, y1, x2, y2, color = line, width = 0.6) => {
    commands.push(`${color[0] / 255} ${color[1] / 255} ${color[2] / 255} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  text(42, 790, 'LA ESFERA MULTISERVICES LLP', 14, true, dark);
  text(42, 775, 'HYDE PARK, SAKI VIHAR ROAD,', 8);
  text(42, 764, 'ANDHERI EAST, MUMBAI 400072', 8);
  text(pageWidth - 42, 790, 'PAYSLIP', 14, true, dark, 'right');
  text(pageWidth - 42, 775, slip.month, 9, false, dark, 'right');

  rect(40, 680, 515, 68, orange);
  const emp = employee;
  const left = [
    ['Employee Code', emp.employeeId || '—'],
    ['Name', emp.name || '—'],
    ['City', emp.employment?.['Work Location']?.split(',')[0] || '—'],
    ['State', emp.employment?.['Work Location']?.split(',')[1]?.trim() || '—'],
    ['Designation', emp.designation || '—'],
  ];
  const right = [
    ['Joining Date', emp.employment?.['Date of Joining'] || '—'],
    ['PAN Number', '—'],
    ['Department', emp.department || '—'],
    ['Bank Name', '—'],
  ];
  left.forEach(([label, value], i) => {
    text(50, 732 - i * 12, `${label}:`, 7, true, white);
    text(160, 732 - i * 12, value, 7, false, white);
  });
  right.forEach(([label, value], i) => {
    text(305, 732 - i * 12, `${label}:`, 7, true, white);
    text(545, 732 - i * 12, value, 7, false, white, 'right');
  });

  rect(40, 651, 515, 24, light);
  text(48, 659, 'Payroll Days', 7, true);
  text(145, 659, `Total ${payroll.totalDays ?? 0}`, 7);
  text(245, 659, `Paid ${payroll.paidDays ?? 0}`, 7);
  text(335, 659, `Arrear ${payroll.arrearDays ?? 0}`, 7);
  text(435, 659, `Absent ${payroll.absentDays ?? 0}`, 7);

  text(48, 633, '●  Earnings', 10, true, green);
  text(305, 633, '●  Deductions', 10, true, red);
  lineTo(48, 616, 290, 616);
  lineTo(305, 616, 545, 616);
  lineTo(298, 636, 298, 500, line, 0.5);
  text(48, 621, 'Earning Head', 7, true);
  text(290, 621, 'Total Amount', 7, true, dark, 'right');
  text(305, 621, 'Deduction Head', 7, true);
  text(545, 621, 'Total Amount', 7, true, dark, 'right');

  let y = 602;
  earnings.forEach((item) => {
    text(48, y, item.label, 7);
    text(290, y, money(item.amount), 7, false, dark, 'right');
    y -= 14;
  });
  text(48, y, 'Gross Earnings', 7, true);
  text(290, y, money(gross), 7, true, dark, 'right');

  let y2 = 602;
  deductions.forEach((item) => {
    text(305, y2, item.label, 7);
    text(545, y2, money(item.amount), 7, false, dark, 'right');
    y2 -= 14;
  });
  if (!deductions.length) {
    text(305, y2, 'No deductions reported', 7);
    text(545, y2, money(0), 7, false, dark, 'right');
    y2 -= 14;
  }
  text(305, y2, 'Gross Deductions', 7, true);
  text(545, y2, money(deductionsTotal), 7, true, dark, 'right');

  rect(40, 472, 515, 26, light);
  text(48, 481, 'Net Salary', 9, true);
  text(545, 481, money(net), 10, true, orange, 'right');
  lineTo(40, 458, 555, 458, line, 0.7);
  text(48, 444, 'Net Amount in words:', 7, true);
  text(165, 444, `${amountToWords(net)} Rupees Only`, 7, true);
  lineTo(40, 430, 555, 430, line, 0.7);
  text(48, 415, 'Note: This is a computer generated statement. Hence no signature is required.', 7, true);

  const content = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function amountToWords(value) {
  const ones = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const below100 = (n) => n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`;
  const below1000 = (n) => n < 100 ? below100(n) : `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${below100(n % 100)}` : ''}`;
  const n = Math.floor(Number(value || 0));
  if (n < 1000) return below1000(n);
  if (n < 100000) return `${below1000(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${below1000(n % 1000)}` : ''}`;
  if (n < 10000000) return `${below1000(Math.floor(n / 100000))} Lakh${n % 100000 ? ` ${below1000(n % 100000)}` : ''}`;
  return n.toLocaleString('en-IN');
}

function isPastAttendanceDate(dateVal) {
  if (!dateVal || dateVal === '-' || dateVal === '—') return false;
  let targetYear, targetMonth, targetDay;

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    const textMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (textMatch) {
      const months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const mStr = textMatch[2].substring(0, 3).toLowerCase();
      if (months[mStr] !== undefined) {
        targetDay = parseInt(textMatch[1], 10);
        targetMonth = months[mStr];
        targetYear = parseInt(textMatch[3], 10);
      }
    }
    if (targetYear === undefined) {
      const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        targetYear = parseInt(isoMatch[1], 10);
        targetMonth = parseInt(isoMatch[2], 10) - 1;
        targetDay = parseInt(isoMatch[3], 10);
      }
    }
  }

  if (targetYear === undefined) {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const recordDay = new Date(targetYear, targetMonth, targetDay).getTime();

  return recordDay < todayStart;
}

function parseWorkingHours(hoursVal, checkInStr, checkOutStr) {
  if (hoursVal !== undefined && hoursVal !== null && hoursVal !== '—' && hoursVal !== '-' && hoursVal !== '') {
    if (typeof hoursVal === 'number') return hoursVal;
    const str = String(hoursVal).trim();

    const hmMatch = str.match(/^(?:(\d+)\s*h(?:rs?)?)?\s*(?:(\d+)\s*m(?:ins?)?)?$/i);
    if (hmMatch && (hmMatch[1] || hmMatch[2])) {
      const h = parseInt(hmMatch[1] || '0', 10);
      const m = parseInt(hmMatch[2] || '0', 10);
      return h + m / 60;
    }

    const floatVal = parseFloat(str);
    if (!isNaN(floatVal)) return floatVal;
  }

  if (checkInStr && checkOutStr && checkInStr !== '—' && checkOutStr !== '—' && checkOutStr !== '-' && checkInStr !== '-') {
    const parseTime = (t) => {
      const m = String(t).trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!m) return null;
      let hrs = parseInt(m[1], 10);
      const mins = parseInt(m[2], 10);
      const ampm = m[3] ? m[3].toUpperCase() : null;
      if (ampm === 'PM' && hrs < 12) hrs += 12;
      if (ampm === 'AM' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };
    const inMins = parseTime(checkInStr);
    const outMins = parseTime(checkOutStr);
    if (inMins !== null && outMins !== null && outMins >= inMins) {
      return (outMins - inMins) / 60;
    }
  }

  return null;
}

function resolveAttendanceStatus(r) {
  const rawStatus = (r.status || r.attendance_status || '').trim();

  if (['On Leave', 'Holiday', 'Week Off', 'Weekly Off', 'Permission'].includes(rawStatus) && !r.checkIn && !r.checkOut && !r.check_in && !r.check_out) {
    return rawStatus;
  }

  const checkIn = r.checkIn || r.check_in;
  const checkOut = r.checkOut || r.check_out;

  const hasIn = Boolean(checkIn && checkIn !== '—' && checkIn !== '-' && checkIn !== '--');
  const hasOut = Boolean(checkOut && checkOut !== '—' && checkOut !== '-' && checkOut !== '--');

  if ((hasIn && !hasOut) || (hasOut && !hasIn)) {
    return 'Invalid';
  }

  if (!hasIn && !hasOut) {
    return rawStatus || 'Absent';
  }

  const hours = parseWorkingHours(r.hours, checkIn, checkOut);

  if (hours !== null && !isNaN(hours)) {
    if (hours >= 9.0) {
      return 'Present';
    } else if (hours >= 4.5) {
      return 'Half Day';
    } else {
      return 'Absent';
    }
  }

  return rawStatus || 'Absent';
}

function AttendanceTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Check in</th>
            <th>Check out</th>
            <th>Hours</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const dynamicStatus = resolveAttendanceStatus(r);
            return (
              <tr key={r.id || `${r.date}-${idx}`}>
                <td>{r.date}</td>
                <td>{r.checkIn || r.check_in || '—'}</td>
                <td>{r.checkOut || r.check_out || '—'}</td>
                <td>{r.hours || '—'}</td>
                <td><Status status={dynamicStatus} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value, helper, tone, icon: Icon = Clock3 }) {
  return <div className="stat-card"><div className={`stat-icon ${tone || ''}`}><Icon size={19} strokeWidth={2} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></div>;
}

function Status({ status }) {
  const s = String(status || '').trim();
  const map = {
    Approved: 'success',
    Available: 'success',
    Present: 'success',
    Pending: 'pending',
    Used: 'pending',
    Rejected: 'danger',
    Absent: 'danger',
    Invalid: 'invalid',
    'Half Day Absent': 'warning',
    'Half Day': 'warning',
    'Half Day Present': 'warning',
  };
  const isOk = s === 'Approved' || s === 'Present' || s === 'Available';
  const isInvalid = s.toLowerCase() === 'invalid';
  const isErr = s === 'Rejected' || s === 'Absent';
  const isWarn = s.toLowerCase().includes('half');
  const badgeClass = map[s] || (isInvalid ? 'invalid' : isErr ? 'danger' : isWarn ? 'warning' : isOk ? 'success' : 'pending');
  return (
    <span className={`status-badge ${badgeClass}`}>
      {isOk ? <CheckCircle2 size={12} /> : isInvalid ? <AlertCircle size={12} /> : isErr ? <XCircle size={12} /> : <Clock4 size={12} />} {s}
    </span>
  );
}

function Shortcut({ text, to }) {
  const navigate = useNavigate();
  return <button className="quick-item" onClick={() => navigate(to)}><div className="quick-item-icon">→</div><span>{text}</span><span>›</span></button>;
}
