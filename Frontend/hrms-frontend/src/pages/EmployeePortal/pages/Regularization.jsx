// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - REGULARIZATION.JSX
// Path: Frontend/hrms-frontend/src/pages/EmployeePortal/pages/Regularization.jsx
// Purpose: Web portal page component managing 'Regularization' views, user interactions, and state.
// UI Components:
//   • <StatusBadge />
//   • <ISSUE_OPTIONS />
//   • <Dropdown />
//   • <ModalDatePicker />
//   • <ModalSelect />
//   • <ModalTimePicker />
//   • <DetailDrawer />
//   • <NewRequestModal />
// Key Functions & Handlers:
//   • handler()
//   • handleDown()
//   • handleKey()
//   • goMonth()
//   • handleSelect()
//   • setHour()
//   • setMinute()
//   • set()
//   • ... and 11 more handlers
// ==============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, X, RefreshCw, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Check,
  ClipboardPenLine, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, FileText, Info, Eye, SlidersHorizontal,
} from 'lucide-react';
import api from '../api';
import { ApprovalProgress } from '../../../components/ApprovalProgress/ApprovalProgress';
import './Regularization.css';

function toDateInput(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateInput(str) {
  if (!str) return new Date();
  const [y, m, d] = String(str).split('-').map(Number);
  if (!y || !m || !d) return new Date(str);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(str) {
  if (!str) return '';
  const dt = parseDateInput(str);
  if (isNaN(dt.getTime())) return str;
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
}

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      currentMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      date: new Date(year, month, d),
      currentMonth: true,
    });
  }
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({
      date: new Date(year, month + 1, d),
      currentMonth: false,
    });
  }
  return days;
}

function normalizeStatus(raw) {
  const s = String(raw || '').toUpperCase().trim();
  if (s === 'PENDING_MANAGER' || s === 'PENDING') return 'Pending';
  if (s === 'PENDING_ADMIN' || s === 'APPROVED_BY_MANAGER' || s === 'APPROVED' || s === 'COMPLETED') return 'Approved';
  if (s.includes('REJECT')) return 'Rejected';
  return raw || 'Pending';
}

function StatusBadge({ status, item }) {
  const raw = String(item?.overall_status || status || 'PENDING_MANAGER').toUpperCase();
  let text = 'Pending';
  let sub = 'Awaiting manager approval';
  let cls = 'reg-badge reg-badge--pending';
  let Icon = Clock;

  if (raw === 'APPROVED' || raw === 'COMPLETED' || raw === 'PENDING_ADMIN' || raw === 'APPROVED_BY_MANAGER') {
    text = 'Approved';
    sub = null;
    cls = 'reg-badge reg-badge--approved';
    Icon = CheckCircle2;
  } else if (raw === 'REJECTED' || raw.includes('REJECT')) {
    text = 'Rejected';
    const isMgrRej = String(item?.manager_status || '').toUpperCase() === 'REJECTED';
    sub = isMgrRej ? 'Rejected by Manager' : 'Rejected by Admin';
    cls = 'reg-badge reg-badge--rejected';
    Icon = XCircle;
  } else {
    text = 'Pending';
    sub = 'Awaiting manager approval';
    cls = 'reg-badge reg-badge--pending';
    Icon = Clock;
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span className={cls}>
        <Icon size={11} />
        {text}
      </span>
      {sub && <span style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>{sub}</span>}
    </div>
  );
}

const ISSUE_OPTIONS = [
  'Missing check-out',
  'Missing check-in',
  'Incorrect check-in',
  'Incorrect check-out',
  'Attendance not marked',
  'Other',
];

function Dropdown({ value, onChange, options, placeholder = 'Select', icon: Icon }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const label = options.find(o => (o.value ?? o) === value)?.label ?? value ?? placeholder;
  return (
    <div ref={ref} className={`reg-dropdown${open ? ' is-open' : ''}`}>
      <button type="button" className="reg-dropdown-trigger" onClick={() => setOpen(v => !v)}>
        {Icon && <Icon size={14} className="reg-dropdown-icon" />}
        <span className="reg-dropdown-label">{label}</span>
        <ChevronDown size={14} className="reg-dropdown-chevron" />
      </button>
      {open && (
        <div className="reg-dropdown-menu">
          {options.map((opt, i) => {
            const val = opt.value ?? opt;
            const lbl = opt.label ?? opt;
            const isSel = val === value;
            return (
              <button
                key={i}
                type="button"
                className={`reg-dropdown-option${isSel ? ' is-selected' : ''}`}
                onClick={() => { onChange(val); setOpen(false); }}
              >
                {lbl}
                {isSel && <Check size={12} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModalDatePicker({ value, onChange, max }) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => value ? parseDateInput(value) : new Date(), [value]);
  const [viewDate, setViewDate] = useState(selectedDate);
  const ref = useRef(null);

  useEffect(() => {
    if (value) setViewDate(parseDateInput(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('touchstart', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('touchstart', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const maxDate = max ? parseDateInput(max) : null;
  const today = new Date();
  const days = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const monthName = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const goMonth = (delta) => {
    setViewDate(curr => new Date(curr.getFullYear(), curr.getMonth() + delta, 1));
  };

  const handleSelect = (d) => {
    onChange(toDateInput(d));
    setOpen(false);
  };

  return (
    <div ref={ref} className={`reg-custom-picker-wrap${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="reg-dialog-shell reg-picker-button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Calendar size={15} className="reg-dialog-icon" />
        <span className="reg-picker-display-val">{formatDisplayDate(value)}</span>
        <ChevronDown size={14} className={`reg-dialog-trail reg-chevron${open ? ' is-rotated' : ''}`} />
      </button>

      {open && (
        <div className="reg-calendar-popover" role="dialog" aria-label="Attendance date picker">
          <div className="reg-cal-head">
            <div>
              <span className="reg-cal-sub-label">ATTENDANCE DATE</span>
              <strong className="reg-cal-main-label">{formatDisplayDate(value)}</strong>
            </div>
            <span className="reg-cal-badge">{viewDate.getFullYear()}</span>
          </div>

          <div className="reg-cal-nav">
            <button type="button" className="reg-cal-nav-btn" onClick={() => goMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <span className="reg-cal-month-title">{monthName}</span>
            <button type="button" className="reg-cal-nav-btn" onClick={() => goMonth(1)} aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="reg-cal-weekdays">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => <span key={w}>{w}</span>)}
          </div>

          <div className="reg-cal-grid">
            {days.map(({ date, currentMonth }, i) => {
              const isSel = isSameDay(date, selectedDate);
              const isTod = isSameDay(date, today);
              const isFuture = maxDate && date > maxDate;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isFuture}
                  className={`reg-cal-day${!currentMonth ? ' is-diff-month' : ''}${isSel ? ' is-selected' : ''}${isTod ? ' is-today' : ''}`}
                  onClick={() => handleSelect(date)}
                >
                  <span>{date.getDate()}</span>
                </button>
              );
            })}
          </div>

          <div className="reg-cal-footer">
            <button
              type="button"
              className="reg-cal-today-btn"
              onClick={() => handleSelect(today)}
            >
              Today
            </button>
            <button
              type="button"
              className="reg-cal-close-btn"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalSelect({ value, onChange, options, icon: Icon, placeholder = 'Select' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('touchstart', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('touchstart', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`reg-custom-picker-wrap${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="reg-dialog-shell reg-picker-button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {Icon && <Icon size={15} className="reg-dialog-icon" />}
        <span className="reg-picker-display-val">{value || placeholder}</span>
        <ChevronDown size={14} className={`reg-dialog-trail reg-chevron${open ? ' is-rotated' : ''}`} />
      </button>

      {open && (
        <div className="reg-custom-dropdown-menu" role="listbox">
          {options.map((opt) => {
            const isSel = opt === value;
            return (
              <button
                key={opt}
                type="button"
                className={`reg-custom-dropdown-item${isSel ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                role="option"
                aria-selected={isSel}
              >
                <span>{opt}</span>
                {isSel && <Check size={14} className="reg-select-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModalTimePicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hourScrollRef = useRef(null);
  const minScrollRef = useRef(null);

  const parts = (value || '09:30').split(':');
  const hh = parseInt(parts[0], 10) || 0;
  const rawMm = parseInt(parts[1], 10) || 0;
  // Snap to nearest 5-min increment
  const mm = Math.round(rawMm / 5) * 5 % 60;

  // Auto-scroll to selected item when popover opens
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      if (hourScrollRef.current) {
        const sel = hourScrollRef.current.querySelector('.is-selected');
        if (sel) sel.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
      if (minScrollRef.current) {
        const sel = minScrollRef.current.querySelector('.is-selected');
        if (sel) sel.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }, 30);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('touchstart', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('touchstart', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const setHour = (h) => onChange(`${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`);
  const setMinute = (m) => onChange(`${String(hh).padStart(2,'0')}:${String(m).padStart(2,'0')}`);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const displayVal = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;

  return (
    <div ref={ref} className={`reg-custom-picker-wrap${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="reg-dialog-shell reg-picker-button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-label={label || 'Select time'}
      >
        <Clock size={15} className="reg-dialog-icon" />
        <span className="reg-picker-display-val">{displayVal}</span>
        <ChevronDown size={14} className={`reg-dialog-trail reg-chevron${open ? ' is-rotated' : ''}`} />
      </button>

      {open && (
        <div className="reg-time-popover" role="dialog">
          <div className="reg-time-popover-inner">
            {/* Hours column */}
            <div className="reg-time-col">
              <div className="reg-time-col-label">HH</div>
              <div className="reg-time-scroll" ref={hourScrollRef}>
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    className={`reg-time-item${h === hh ? ' is-selected' : ''}`}
                    onClick={() => { setHour(h); }}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
            <div className="reg-time-sep">:</div>
            {/* Minutes column */}
            <div className="reg-time-col">
              <div className="reg-time-col-label">MM</div>
              <div className="reg-time-scroll" ref={minScrollRef}>
                {minutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`reg-time-item${m === mm ? ' is-selected' : ''}`}
                    onClick={() => { setMinute(m); }}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="reg-time-popover-footer">
            <button type="button" className="reg-cal-close-btn" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}


function DetailDrawer({ item, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  const status = normalizeStatus(item.status);
  return (
    <div className="reg-drawer-backdrop" onMouseDown={onClose}>
      <div className="reg-drawer" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="reg-drawer-header">
          <div>
            <div className="reg-drawer-eyebrow">REGULARIZATION REQUEST</div>
            <h2 className="reg-drawer-title">REG-{item.id || '—'}</h2>
          </div>
          <button className="reg-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="reg-drawer-status-row">
          <StatusBadge status={item.status} item={item} />
          <span className="reg-drawer-meta">Applied {item.requestDate || item.appliedDate || '—'}</span>
        </div>
        <div className="reg-drawer-section-title">Request Details</div>
        <div className="reg-drawer-grid">
          <div className="reg-drawer-item"><span>Attendance Date</span><strong>{item.date || item.attendanceDate || item.targetDate || '—'}</strong></div>
          <div className="reg-drawer-item"><span>Issue / Type</span><strong>{item.issue || 'Attendance correction'}</strong></div>
          <div className="reg-drawer-item"><span>Requested Check-In</span><strong>{item.checkIn || item.inTime || '—'}</strong></div>
          <div className="reg-drawer-item"><span>Requested Check-Out</span><strong>{item.checkOut || item.outTime || '—'}</strong></div>
        </div>
        {(item.reason || item.comment) && (
          <>
            <div className="reg-drawer-section-title">Reason</div>
            <div className="reg-drawer-reason">{item.reason || item.comment}</div>
          </>
        )}
        <div style={{ marginTop: '16px' }}>
          <ApprovalProgress
            overallStatus={item.overall_status || item.status}
            managerStatus={item.manager_status}
            adminStatus={item.admin_status}
            managerName={item.manager_reviewed_by}
            managerReviewedAt={item.manager_reviewed_at}
            managerComment={item.manager_comment}
            managerRejectionReason={item.manager_rejection_reason}
            adminName={item.admin_reviewed_by}
            adminReviewedAt={item.admin_reviewed_at}
            adminComment={item.admin_comment}
            adminRejectionReason={item.admin_rejection_reason}
            submittedAt={item.submitted_at || item.requestDate || item.created_at}
          />
        </div>
        <div className="reg-drawer-footer">
          <button className="reg-secondary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function NewRequestModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    attendanceDate: toDateInput(new Date()),
    requestType: 'Missing check-out',
    checkIn: '09:30',
    checkOut: '18:30',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) { setError('Please describe the reason for this request.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.submitRegularization({
        date: form.attendanceDate,
        issue: form.requestType,
        checkIn: form.checkIn || '09:30 AM',
        checkOut: form.checkOut || '06:30 PM',
        reason: form.reason.trim(),
      });
      window.dispatchEvent(new Event('regularization-updated'));
      window.dispatchEvent(new Event('attendance-updated'));
      onSuccess('Regularization request submitted! Pending manager approval.');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reg-dialog-backdrop" onMouseDown={onClose}>
      <div className="reg-dialog-window" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="reg-dialog-header">
          <div>
            <div className="reg-dialog-eyebrow">ATTENDANCE CORRECTION</div>
            <h2 className="reg-dialog-title">New Regularization Request</h2>
            <p className="reg-dialog-sub">Submit an attendance discrepancy or punch correction for manager review.</p>
          </div>
          <button className="reg-dialog-close" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="reg-dialog-grid">
            <div className="reg-dialog-field">
              <label className="reg-dialog-label">Attendance Date <span className="reg-required">*</span></label>
              <ModalDatePicker
                value={form.attendanceDate}
                max={toDateInput(new Date())}
                onChange={val => set('attendanceDate', val)}
              />
            </div>

            <div className="reg-dialog-field">
              <label className="reg-dialog-label">Regularization Type <span className="reg-required">*</span></label>
              <ModalSelect
                value={form.requestType}
                options={ISSUE_OPTIONS}
                icon={ClipboardPenLine}
                onChange={val => set('requestType', val)}
              />
            </div>

            <div className="reg-dialog-field">
              <label className="reg-dialog-label">Correct Check-In Time</label>
              <ModalTimePicker
                value={form.checkIn}
                label="Correct Check-In Time"
                onChange={val => set('checkIn', val)}
              />
            </div>

            <div className="reg-dialog-field">
              <label className="reg-dialog-label">Correct Check-Out Time</label>
              <ModalTimePicker
                value={form.checkOut}
                label="Correct Check-Out Time"
                onChange={val => set('checkOut', val)}
              />
            </div>

            <div className="reg-dialog-field reg-dialog-field--wide">
              <label className="reg-dialog-label">Reason / Remarks <span className="reg-required">*</span></label>
              <textarea
                className="reg-dialog-textarea"
                rows={4}
                placeholder="Provide detailed justification (e.g., Client site meeting, biometric punch machine failure, power interruption, worked from home)..."
                value={form.reason}
                onChange={e => { set('reason', e.target.value); setError(''); }}
                required
              />
            </div>
          </div>

          {error && (
            <div className="reg-dialog-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="reg-dialog-note">
            <Info size={15} />
            <span>Your request will be routed to your Reporting Manager for Level-1 approval, followed by Admin for attendance ledger synchronization.</span>
          </div>

          <div className="reg-dialog-actions">
            <button type="button" className="reg-dialog-btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="reg-dialog-btn-primary" disabled={submitting}>
              {submitting ? <><span className="reg-spinner" /> Submitting…</> : <><Plus size={16} /> Submit Request</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegularizationPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [issueFilter, setIssueFilter] = useState('All');

  const load = useCallback(async () => {
    try {
      const data = await api.getRegularizations();
      if (Array.isArray(data)) setRequests(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(() => {
      if (typeof document !== 'undefined' && (document.hidden || document.visibilityState === 'hidden')) return;
      load();
    }, 30000);

    const sync = () => {
      if (typeof document !== 'undefined' && (document.hidden || document.visibilityState === 'hidden')) return;
      load();
    };

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden && document.visibilityState === 'visible') {
        load();
      }
    };

    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('regularization-updated', sync);
    window.addEventListener('attendance-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      clearInterval(iv);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('regularization-updated', sync);
      window.removeEventListener('attendance-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 5000); };

  const stats = useMemo(() => {
    const pending = requests.filter(r => ['Pending','Pending Admin'].includes(normalizeStatus(r.status))).length;
    const approved = requests.filter(r => normalizeStatus(r.status) === 'Approved').length;
    const rejected = requests.filter(r => normalizeStatus(r.status) === 'Rejected').length;
    return { pending, approved, rejected, total: requests.length };
  }, [requests]);

  const issueOptions = useMemo(() => {
    const all = ['All', ...new Set(requests.map(r => r.issue || 'Attendance correction').filter(Boolean))];
    return all;
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const sNorm = normalizeStatus(r.status);
      const sMatch = statusFilter === 'All' || sNorm === statusFilter || (statusFilter === 'Pending' && sNorm === 'Pending Admin');
      const iMatch = issueFilter === 'All' || (r.issue || 'Attendance correction') === issueFilter;
      const q = search.toLowerCase();
      const qMatch = !q || [r.date, r.attendanceDate, r.issue, r.reason, r.checkIn, r.checkOut, r.requestDate].some(v => String(v || '').toLowerCase().includes(q));
      return sMatch && iMatch && qMatch;
    });
  }, [requests, search, statusFilter, issueFilter]);

  const resetFilters = () => { setSearch(''); setStatusFilter('All'); setIssueFilter('All'); };
  const hasFilters = search || statusFilter !== 'All' || issueFilter !== 'All';

  return (
    <div className="reg-page">
      {toast && <div className="reg-toast"><CheckCircle2 size={16} /><span>{toast}</span></div>}

      <div className="reg-page-header">
        <div className="reg-page-header-left">
          <h1 className="reg-title">My Regularization</h1>
          <p className="reg-subtitle">Submit and track attendance correction requests</p>
        </div>
        <button className="reg-primary-btn" id="reg-new-request-btn" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Request
        </button>
      </div>

      <div className="reg-stats-grid">
        {[
          { label: 'Pending', value: stats.pending, helper: 'Awaiting approval', icon: Clock, tone: 'blue' },
          { label: 'Approved', value: stats.approved, helper: 'Processed successfully', icon: CheckCircle2, tone: 'green' },
          { label: 'Rejected', value: stats.rejected, helper: 'Declined requests', icon: XCircle, tone: 'red' },
          { label: 'Total Requests', value: stats.total, helper: 'All time', icon: FileText, tone: 'purple' },
        ].map(({ label, value, helper, icon: Icon, tone }) => (
          <div key={label} className="reg-stat-card">
            <div className={`reg-stat-icon reg-stat-icon--${tone}`}><Icon size={18} /></div>
            <div className="reg-stat-body">
              <span className="reg-stat-label">{label}</span>
              <strong className="reg-stat-value">{loading ? '—' : value}</strong>
              <small className="reg-stat-helper">{helper}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="reg-card">
        <div className="reg-card-header">
          <div>
            <h2 className="reg-card-title">My Regularization Requests</h2>
            <p className="reg-card-sub">Track all submitted attendance corrections</p>
          </div>
          <button className="reg-refresh-btn" onClick={load} title="Refresh" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'reg-spin' : ''} />
          </button>
        </div>

        <div className="reg-toolbar">
          <div className="reg-search-wrap">
            <Search size={14} className="reg-search-icon" />
            <input className="reg-search-input" placeholder="Search by date, issue, or reason…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="reg-search-clear" onClick={() => setSearch('')}><X size={13} /></button>}
          </div>
          <Dropdown value={statusFilter} onChange={setStatusFilter} icon={SlidersHorizontal}
            options={[{value:'All',label:'All Statuses'},{value:'Pending',label:'Pending'},{value:'Approved',label:'Approved'},{value:'Rejected',label:'Rejected'}]}
          />
          <Dropdown value={issueFilter} onChange={setIssueFilter} icon={Filter}
            options={issueOptions.map(o => ({ value: o, label: o === 'All' ? 'All Issues' : o }))}
          />
          {hasFilters && <button className="reg-reset-btn" onClick={resetFilters}><X size={12} /> Clear</button>}
        </div>

        {!loading && (
          <div className="reg-result-bar">
            Showing <strong>&nbsp;{filtered.length}</strong>&nbsp;of&nbsp;<strong>{requests.length}</strong>&nbsp;requests
          </div>
        )}

        {loading ? (
          <div className="reg-skeleton-rows">
            {[1,2,3].map(i => (
              <div key={i} className="reg-skeleton-row">
                {[80,160,130,80,80,100,80].map((w,j) => <div key={j} className="reg-skeleton-cell" style={{width:w}} />)}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="reg-empty-state">
            <div className="reg-empty-icon reg-empty-icon--error"><AlertCircle size={24} /></div>
            <h3>Failed to load requests</h3>
            <p>{error}</p>
            <button className="reg-primary-btn" onClick={load}><RefreshCw size={14} /> Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="reg-empty-state">
            <div className="reg-empty-icon reg-empty-icon--ref">
              <ClipboardPenLine size={30} />
            </div>
            <h3 className="reg-empty-title">
              {hasFilters ? 'No matching requests' : 'No regularization requests yet'}
            </h3>
            <p className="reg-empty-desc">
              {hasFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'When you have attendance discrepancies, submit a regularization request for manager review.'}
            </p>
            {hasFilters && (
              <button className="reg-secondary-btn" onClick={resetFilters}>Clear filters</button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table (>768px) */}
            <div className="reg-table-wrap">
              <table className="reg-table reg-desktop-table">
                <thead>
                  <tr>
                    <th>REQUEST</th><th>ATTENDANCE DATE</th><th>ISSUE</th>
                    <th>CHECK IN</th><th>CHECK OUT</th><th>APPLIED ON</th>
                    <th>STATUS</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => (
                    <tr key={row.id || idx} className="reg-table-row" onClick={() => setSelectedItem(row)}>
                      <td>
                        <div className="reg-req-id">
                          <div className="reg-req-icon"><ClipboardPenLine size={13} /></div>
                          <span>REG-{row.id || row.rawId || (idx + 1)}</span>
                        </div>
                      </td>
                      <td className="reg-date-cell"><Calendar size={11} className="reg-cell-icon" />{row.date || row.attendanceDate || row.targetDate || '—'}</td>
                      <td className="reg-issue-cell">{row.issue || 'Attendance correction'}</td>
                      <td className="reg-time-cell">{row.checkIn || row.inTime || '—'}</td>
                      <td className="reg-time-cell">{row.checkOut || row.outTime || '—'}</td>
                      <td className="reg-date-cell"><Calendar size={11} className="reg-cell-icon" />{row.requestDate || row.appliedDate || '—'}</td>
                      <td><StatusBadge status={row.status} item={row} /></td>
                      <td>
                        <button className="reg-view-btn" onClick={e => { e.stopPropagation(); setSelectedItem(row); }} title="View details">
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (<=768px) */}
            <div className="reg-mobile-cards-wrap">
              {filtered.map((row, idx) => (
                <div key={row.id || idx} className="reg-mobile-card" onClick={() => setSelectedItem(row)}>
                  <div className="reg-mobile-card-top">
                    <div className="reg-req-id">
                      <div className="reg-req-icon"><ClipboardPenLine size={13} /></div>
                      <strong>REG-{row.id || row.rawId || (idx + 1)}</strong>
                    </div>
                    <StatusBadge status={row.status} item={row} />
                  </div>

                  <div className="reg-mobile-card-grid">
                    <div className="reg-mobile-card-item">
                      <span>Attendance Date</span>
                      <strong>{row.date || row.attendanceDate || row.targetDate || '—'}</strong>
                    </div>
                    <div className="reg-mobile-card-item">
                      <span>Regularization Type</span>
                      <strong>{row.issue || 'Attendance correction'}</strong>
                    </div>
                    <div className="reg-mobile-card-item">
                      <span>Requested Check-In</span>
                      <strong>{row.checkIn || row.inTime || '—'}</strong>
                    </div>
                    <div className="reg-mobile-card-item">
                      <span>Requested Check-Out</span>
                      <strong>{row.checkOut || row.outTime || '—'}</strong>
                    </div>
                  </div>

                  {(row.reason || row.comment) && (
                    <div className="reg-mobile-card-reason">
                      <span>Reason:</span> {row.reason || row.comment}
                    </div>
                  )}

                  <div className="reg-mobile-card-footer">
                    <span className="reg-mobile-card-date">
                      Applied {row.requestDate || row.appliedDate || '—'}
                    </span>
                    <button
                      type="button"
                      className="reg-mobile-card-view-btn"
                      onClick={e => { e.stopPropagation(); setSelectedItem(row); }}
                    >
                      <Eye size={13} /> View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedItem && <DetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />}
      {showModal && <NewRequestModal onClose={() => setShowModal(false)} onSuccess={showToast} />}
    </div>
  );
}
