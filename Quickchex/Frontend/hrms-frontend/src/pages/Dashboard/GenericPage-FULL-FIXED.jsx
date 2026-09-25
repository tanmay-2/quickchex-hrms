import React from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Check,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import AttendancePunch from '../components/AttendancePunch';
import PayslipDocument from '../components/PayslipDocument';
import html2pdf from 'html2pdf.js';
import { attendanceRows, leaveRows } from '../data';

const pageMeta = {
  '/employee-directory': ['Employee Directory', 'View employee information and team details', UsersRound],
  '/attendance': ['Attendance', 'Your attendance overview and working-day summary', Clock3],
  '/attendance/records': ['My Attendance Records', 'Review your complete attendance history', FileClock],
  '/attendance/regularization': ['My Regularization', 'Submit and track attendance correction requests', ClipboardPenLine],
  '/leave': ['Leave', 'Manage your employee leave information', Plane],
  '/leave/applications': ['My Leave Applications', 'View and apply for employee leave', ClipboardPenLine],
  '/leave/balance': ['Leave Balance', 'Track your available and used leave balances', CalendarDays],
  '/leave/comp-off': ['Comp-Off List', 'View comp-off credits and usage', Clock4],
  '/leave/holidays': ['Holiday List', 'View the company holiday calendar', CalendarDays],
  '/payslips': ['Payslips', 'Review and download your monthly payslips', ReceiptIndianRupee],
};

const regularizationRows = [
  { date: '21 Aug 2026', issue: 'Missing check-out', requestDate: '22 Aug 2026', status: 'Approved' },
  { date: '14 Aug 2026', issue: 'Incorrect check-in', requestDate: '15 Aug 2026', status: 'Pending' },
  { date: '07 Aug 2026', issue: 'Missing check-in', requestDate: '08 Aug 2026', status: 'Rejected' },
];

const compOffRows = [
  { date: '15 Aug 2026', reason: 'Independence Day support', credited: '1 day', used: '0 day', status: 'Available' },
  { date: '02 Aug 2026', reason: 'Release support', credited: '1 day', used: '1 day', status: 'Used' },
];

const holidayRows = [
  ['15 Aug 2026', 'Independence Day', 'Saturday'],
  ['27 Aug 2026', 'Ganesh Chaturthi', 'Thursday'],
  ['02 Oct 2026', 'Gandhi Jayanti', 'Friday'],
  ['20 Oct 2026', 'Dussehra', 'Tuesday'],
];

export default function GenericPage() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/attendance') return <AttendanceOverview />;
  if (location.pathname === '/attendance/records') return <AttendanceRecords />;
  if (location.pathname === '/attendance/regularization') return <RegularizationPage />;
  if (location.pathname === '/leave') return <LeaveOverview />;
  if (location.pathname === '/leave/applications') return <LeaveApplications />;
  if (location.pathname === '/leave/balance') return <LeaveBalance />;
  if (location.pathname === '/leave/comp-off') return <CompOffPage />;
  if (location.pathname === '/leave/holidays') return <HolidayList />;
  if (location.pathname === '/payslips') return <Payslips />;

  const [title, sub, Icon] = pageMeta[location.pathname] || ['HRMS', 'Employee portal', UsersRound];
  return (
    <div>
      <PageHeader title={title} subtitle={sub} />
      <div className="card placeholder-page">
        <div className="placeholder-icon"><Icon size={26} /></div>
        <h2>{title}</h2>
        <p>This employee module is connected to the shared purple dashboard shell and is ready for your backend/API data.</p>
        <button className="primary-btn" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
      </div>
    </div>
  );
}

function AttendanceOverview() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title="Attendance" subtitle="Your attendance overview and working-day summary" action={<button className="primary-btn" onClick={() => navigate('/attendance/records')}>View my records <FileClock size={16} /></button>} />
      <AttendancePunch />
      <div className="stats-grid">
        <Stat label="Monthly attendance" value="96.2%" helper="August 2026" />
        <Stat label="Working hours" value="158h 20m" helper="This month" tone="blue" />
        <Stat label="Present days" value="20" helper="Out of 21 working days" tone="green" />
        <Stat label="Regularizations" value="2" helper="1 pending" tone="amber" />
      </div>
      <div className="card">
        <div className="card-header"><div><h2>Recent attendance</h2><p>Your latest check-in and check-out records</p></div><button className="text-btn" onClick={() => navigate('/attendance/records')}>View all</button></div>
        <AttendanceTable rows={attendanceRows.slice(0, 5)} />
      </div>
    </div>
  );
}

function AttendanceRecords() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title="My Attendance Records" subtitle="Review your complete attendance history" action={<button className="primary-btn" onClick={() => navigate('/attendance/regularization')}>My Regularization <ClipboardPenLine size={16} /></button>} />
      <div className="card">
        <div className="card-header"><div><h2>Attendance history</h2><p>All recent records available to you</p></div></div>
        <AttendanceTable rows={attendanceRows.concat([
          { date:'19 Aug 2026', checkIn:'10:15 AM', checkOut:'06:55 PM', hours:'8h 40m', status:'Present' },
          { date:'18 Aug 2026', checkIn:'10:22 AM', checkOut:'06:48 PM', hours:'8h 26m', status:'Present' },
        ])} />
      </div>
    </div>
  );
}

function RegularizationPage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    attendanceDate: '',
    requestType: 'Missing check-out',
    checkIn: '',
    checkOut: '',
    reason: '',
  });

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

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="My Regularization"
        subtitle="Submit and track attendance correction requests"
        action={
          <button className="primary-btn" type="button" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> New request
          </button>
        }
      />

      <div className="stats-grid">
        <Stat label="Approved" value="1" helper="This month" tone="green" />
        <Stat label="Pending" value="1" helper="Awaiting approval" tone="blue" />
        <Stat label="Rejected" value="1" helper="This month" tone="amber" />
        <Stat label="Total requests" value="3" helper="August 2026" />
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
              <tr><th>Attendance date</th><th>Issue</th><th>Request date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {regularizationRows.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{row.issue}</td>
                  <td>{row.requestDate}</td>
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
  return (
    <div>
      <PageHeader title="Leave" subtitle="Manage your employee leave information" action={<button className="primary-btn" onClick={() => navigate('/leave/applications')}><Plus size={16} /> Apply leave</button>} />
      <div className="stats-grid leave-summary-grid">
        <Stat label="Available balance" value="11 days" helper="Across leave types" tone="green" icon={Clock3} />
        <Stat label="Applications" value="3" helper="August 2026" tone="purple" icon={ClipboardPenLine} />
        <Stat label="Comp-off" value="1 day" helper="Available" tone="blue" icon={Clock4} />
        <Stat label="Holidays" value="4" helper="Upcoming" tone="amber" icon={CalendarDays} />
      </div>
      <div className="dashboard-grid top-grid">
        <div className="card">
          <div className="card-header"><div><h2>Recent leave applications</h2><p>Latest requests and their status</p></div><button className="text-btn" onClick={() => navigate('/leave/applications')}>View all</button></div>
          <div className="table-wrap"><table><thead><tr><th>Leave type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead><tbody>{leaveRows.map((r, i) => <tr key={i}><td>{r.type}</td><td>{r.from}</td><td>{r.to}</td><td>{r.days}</td><td><Status status={r.status} /></td></tr>)}</tbody></table></div>
        </div>
        <div className="card">
          <div className="card-header"><div><h2>Leave shortcuts</h2><p>Employee leave modules</p></div></div>
          <div className="quick-grid leave-shortcuts">
            <Shortcut text="My applications" to="/leave/applications" />
            <Shortcut text="Leave balance" to="/leave/balance" />
            <Shortcut text="Comp-Off list" to="/leave/comp-off" />
            <Shortcut text="Holiday list" to="/leave/holidays" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaveApplications() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    category: 'Casual Leave',
    fromDate: '',
    toDate: '',
    halfDay: 'No',
    reason: '',
  });

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
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsModalOpen(false);
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

      <div className="card">
        <div className="card-header"><div><h2>My applications</h2><p>Your submitted leave requests</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Leave type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
            <tbody>
              {leaveRows.concat([{type:'Optional Holiday',from:'10 Jul 2026',to:'10 Jul 2026',days:'1',status:'Approved'}]).map((r,i)=>(
                <tr key={i}><td>{r.type}</td><td>{r.from}</td><td>{r.to}</td><td>{r.days}</td><td><Status status={r.status} /></td></tr>
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

              <label className="form-field form-field-wide">
                <span>Reason for Leave</span>
                <textarea
                  rows="4"
                  value={form.reason}
                  onChange={(event) => updateField('reason', event.target.value)}
                  placeholder="Tell us briefly why you need leave..."
                  required
                />
              </label>

              <div className="leave-modal-note">
                <CalendarDays size={15} />
                <span>Your request will be checked against your available leave balance and sent to your reporting manager.</span>
              </div>

              <div className="leave-modal-actions">
                <button className="secondary-btn" type="button" onClick={closeModal}>Cancel</button>
                <button className="primary-btn" type="submit"><Check size={16} /> Submit</button>
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
  const balances = [
    ['Casual Leave', 7, 10],
    ['Sick Leave', 4, 6],
  ];
  return (
    <div>
      <PageHeader title="Leave Balance" subtitle="Track your available and used leave balances" />
      <div className="balance-strip">{balances.map(([name, used, total]) => <div className="card mini-balance" key={name}><span>{name}</span><strong>{used}</strong><small>{total - used} used of {total} total</small><div className="progress"><span style={{ width: `${Math.max(0, Math.round((used / total) * 100))}%` }} /></div></div>)}</div>
    </div>
  );
}

function CompOffPage() {
  return (
    <div>
      <PageHeader title="Comp-Off List" subtitle="View comp-off credits and usage" />
      <div className="card"><div className="card-header"><div><h2>Comp-off history</h2><p>Credits granted to your employee account</p></div></div><div className="table-wrap"><table><thead><tr><th>Credit date</th><th>Reason</th><th>Credited</th><th>Used</th><th>Status</th></tr></thead><tbody>{compOffRows.map((r)=><tr key={r.date}><td>{r.date}</td><td>{r.reason}</td><td>{r.credited}</td><td>{r.used}</td><td><Status status={r.status} /></td></tr>)}</tbody></table></div></div>
    </div>
  );
}

function HolidayList() {
  return (
    <div>
      <PageHeader title="Holiday List" subtitle="View the company holiday calendar" />
      <div className="card"><div className="card-header"><div><h2>Upcoming holidays</h2><p>Company holidays visible to employees</p></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Holiday</th><th>Day</th></tr></thead><tbody>{holidayRows.map(([date,name,day])=><tr key={date}><td>{date}</td><td>{name}</td><td>{day}</td></tr>)}</tbody></table></div></div>
    </div>
  );
}

const payslipRows = [
  {
    month: 'August 2026', generatedOn: '31 Aug 2026', netSalary: 58420,
    payroll: {
      totalDays: 30, paidDays: 30, arrearDays: 0, absentDays: 0,
      earnings: [
        { label: 'Net Salary', amount: 58420 },
      ],
      grossEarnings: 58420,
      deductions: [],
    },
  },
  {
    month: 'July 2026', generatedOn: '31 Jul 2026', netSalary: 58420,
    payroll: { totalDays: 31, paidDays: 31, arrearDays: 0, absentDays: 0, earnings: [{ label: 'Net Salary', amount: 58420 }], grossEarnings: 58420, deductions: [] },
  },
  {
    month: 'June 2026', generatedOn: '30 Jun 2026', netSalary: 58420,
    payroll: { totalDays: 30, paidDays: 30, arrearDays: 0, absentDays: 0, earnings: [{ label: 'Net Salary', amount: 58420 }], grossEarnings: 58420, deductions: [] },
  },
  {
    month: 'May 2026', generatedOn: '31 May 2026', netSalary: 58420,
    payroll: { totalDays: 31, paidDays: 31, arrearDays: 0, absentDays: 0, earnings: [{ label: 'Net Salary', amount: 58420 }], grossEarnings: 58420, deductions: [] },
  },
];

function Payslips() {
  const [selectedSlip, setSelectedSlip] = React.useState(null);
  const [isDownloading, setIsDownloading] = React.useState(false);

  const downloadSelected = async (slip) => {
    if (isDownloading) return;
    setIsDownloading(true);
    setSelectedSlip(slip);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    try {
      const element = document.getElementById('payslip-pdf-document');
      if (!element) throw new Error('Payslip document could not be prepared.');
      await html2pdf().set({
        margin: 0,
        filename: `${slip.month.replace(/\s+/g, '-')}-Payslip.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).from(element).save();
    } catch (error) {
      console.error('Payslip download failed:', error);
    } finally {
      setIsDownloading(false);
      setSelectedSlip(null);
    }
  };


  return (
    <div>
      <PageHeader title="Payslips" subtitle="Review and download your monthly payslips" />
      <div className="card">
        <div className="card-header"><div><h2>My payslips</h2><p>Only your employee payroll documents are shown</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Month</th><th>Net salary</th><th>Generated on</th><th>Action</th></tr></thead><tbody>{payslipRows.map((slip)=><tr key={slip.month}><td>{slip.month}</td><td>₹{slip.netSalary.toLocaleString('en-IN')}</td><td>{slip.generatedOn}</td><td><div className="payslip-action-group"><button className="text-btn" type="button" onClick={() => setSelectedSlip(slip)}><FileText size={14} /> View</button><button className="text-btn" type="button" disabled={isDownloading} onClick={() => downloadSelected(slip)}><Download size={14} /> {isDownloading ? 'Preparing…' : 'Download'}</button></div></td></tr>)}</tbody></table></div>
      </div>

      {selectedSlip && (
        <div className="payslip-preview-backdrop" onMouseDown={() => !isDownloading && setSelectedSlip(null)}>
          <div className="payslip-preview-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="payslip-preview-toolbar">
              <button className="secondary-btn" type="button" disabled={isDownloading} onClick={() => setSelectedSlip(null)}><ChevronLeft size={15} /> Back</button>
              <div className="payslip-preview-toolbar-title"><strong>{selectedSlip.month} Payslip</strong><span>LA ESFERA • {employee.name}</span></div>
              <button className="primary-btn" type="button" disabled={isDownloading} onClick={() => downloadSelected(selectedSlip)}><Download size={15} /> {isDownloading ? 'Preparing…' : 'Download PDF'}</button>
            </div>
            <div className="payslip-preview-scroll">
              <PayslipDocument slip={selectedSlip} documentId="payslip-pdf-document" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceTable({ rows }) {
  return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th></tr></thead><tbody>{rows.map((r) => <tr key={`${r.date}-${r.checkIn}`}><td>{r.date}</td><td>{r.checkIn}</td><td>{r.checkOut}</td><td>{r.hours}</td><td><Status status={r.status} /></td></tr>)}</tbody></table></div>;
}

function Stat({ label, value, helper, tone, icon: Icon = Clock3 }) {
  return <div className="stat-card"><div className={`stat-icon ${tone || ''}`}><Icon size={19} strokeWidth={2} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></div>;
}

function Status({ status }) {
  const map = { Approved: 'success', Available: 'success', Present: 'success', Pending: 'pending', Used: 'pending', Rejected: 'danger', Absent: 'danger' };
  return <span className={`status-badge ${map[status] || 'pending'}`}>{status === 'Approved' || status === 'Present' || status === 'Available' ? <CheckCircle2 size={12}/> : status === 'Rejected' || status === 'Absent' ? <XCircle size={12}/> : <Clock4 size={12}/>} {status}</span>;
}

function Shortcut({ text, to }) {
  const navigate = useNavigate();
  return <button className="quick-item" onClick={() => navigate(to)}><div className="quick-item-icon">→</div><span>{text}</span><span>›</span></button>;
}
