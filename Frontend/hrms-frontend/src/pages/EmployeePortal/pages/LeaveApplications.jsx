import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, X, RefreshCw, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Check,
  ClipboardPenLine, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, FileText, Info, Eye, SlidersHorizontal,
  Plane, Stethoscope, Star, ArrowRight, Minus,
} from 'lucide-react';
import api from '../api';
import { ApprovalProgress } from '../../../components/ApprovalProgress/ApprovalProgress';
import './LeaveApplications.css';

/* ─── helpers ─────────────────────────────────────────────────────── */
function toDateInput(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDate(str) {
  if (!str || str === '—') return '—';
  try {
    const d = new Date(str.includes('-') && str.length <= 10 ? str + 'T00:00:00' : str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return str; }
}

function calcDays(from, to, halfDay) {
  if (halfDay) return 0.5;
  if (!from || !to) return 1;
  const s = new Date(from), e = new Date(to);
  if (isNaN(s) || isNaN(e)) return 1;
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

function LeaveIcon({ type = '' }) {
  const t = type.toLowerCase();
  if (t.includes('sick')) return <Stethoscope size={14} />;
  if (t.includes('optional') || t.includes('privilege') || t.includes('earned')) return <Star size={14} />;
  return <Plane size={14} />;
}

function leaveTone(type = '') {
  const t = type.toLowerCase();
  if (t.includes('sick')) return 'green';
  if (t.includes('optional') || t.includes('privilege')) return 'amber';
  return 'blue';
}

function StatusBadge({ status, item }) {
  const raw = String(item?.overall_status || status || 'PENDING_MANAGER').toUpperCase();
  let text = 'Pending';
  let sub = 'Awaiting manager approval';
  let cls = 'la-badge la-badge--pending';
  let Icon = Clock;

  if (raw === 'APPROVED') {
    text = 'Approved';
    sub = null;
    cls = 'la-badge la-badge--approved';
    Icon = CheckCircle2;
  } else if (raw === 'REJECTED') {
    text = 'Rejected';
    const isMgrRej = String(item?.manager_status || '').toUpperCase() === 'REJECTED';
    sub = isMgrRej ? 'Rejected by Manager' : 'Rejected by Admin';
    cls = 'la-badge la-badge--rejected';
    Icon = XCircle;
  } else if (raw === 'PENDING_ADMIN') {
    text = 'Pending Admin Approval';
    sub = 'Awaiting admin approval';
    cls = 'la-badge la-badge--admin';
    Icon = AlertCircle;
  } else {
    text = 'Pending';
    sub = 'Awaiting manager approval';
    cls = 'la-badge la-badge--pending';
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

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Optional / Privilege Holiday', 'Leave Without Pay'];

const LEAVE_CONFIGS = [
  { value: 'Casual Leave', label: 'Casual Leave', icon: Plane, desc: 'Planned personal time off', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'Sick Leave', label: 'Sick Leave', icon: Stethoscope, desc: 'Medical & health recovery', color: '#ef4444', bg: '#fef2f2' },
  { value: 'Optional / Privilege Holiday', label: 'Optional / Privilege Holiday', icon: Star, desc: 'Festival or privilege day', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'Leave Without Pay', label: 'Leave Without Pay', icon: Clock, desc: 'Unpaid absence (LWP)', color: '#64748b', bg: '#f1f5f9' },
];

function parseDateInput(str) {
  if (!str) return null;
  if (str instanceof Date) return isNaN(str.getTime()) ? null : str;
  const parts = String(str).split('T')[0].split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
  }
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDisplayDate(str) {
  if (!str) return '';
  const dt = parseDateInput(str);
  if (!dt) return str;
  const day = String(dt.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
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
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    days.push({
      date: new Date(year, month + 1, d),
      currentMonth: false,
    });
  }
  return days;
}

function LeaveDatePicker({ value, onChange, min, max, label = 'Select Date', placeholder = 'Select date' }) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => value ? parseDateInput(value) : null, [value]);
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const ref = useRef(null);

  useEffect(() => {
    if (value) {
      const parsed = parseDateInput(value);
      if (parsed) setViewDate(parsed);
    }
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

  const minDate = min ? parseDateInput(min) : null;
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

  const isDayDisabled = (d) => {
    if (!d) return false;
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (minDate) {
      const minTime = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
      if (target < minTime) return true;
    }
    if (maxDate) {
      const maxTime = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime();
      if (target > maxTime) return true;
    }
    return false;
  };

  return (
    <div ref={ref} className={`la-custom-picker-wrap${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className={`la-dialog-shell la-picker-button${open ? ' is-open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
      >
        <Calendar size={15} className="la-dialog-icon" />
        <span className={`la-picker-display-val${!value ? ' is-placeholder' : ''}`}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <ChevronDown size={14} className={`la-dialog-trail la-chevron${open ? ' is-rotated' : ''}`} />
      </button>

      {open && (
        <div className="la-calendar-popover" role="dialog" aria-label={label}>
          <div className="la-cal-head">
            <div>
              <span className="la-cal-sub-label">{label.toUpperCase()}</span>
              <strong className="la-cal-main-label">{value ? formatDisplayDate(value) : 'Pick a date'}</strong>
            </div>
            <span className="la-cal-badge">{viewDate.getFullYear()}</span>
          </div>

          <div className="la-cal-nav">
            <button type="button" className="la-cal-nav-btn" onClick={() => goMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <span className="la-cal-month-title">{monthName}</span>
            <button type="button" className="la-cal-nav-btn" onClick={() => goMonth(1)} aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="la-cal-weekdays">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => <span key={w}>{w}</span>)}
          </div>

          <div className="la-cal-grid">
            {days.map(({ date, currentMonth }, i) => {
              const isSel = selectedDate && isSameDay(date, selectedDate);
              const isTod = isSameDay(date, today);
              const disabled = isDayDisabled(date);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  className={`la-cal-day${!currentMonth ? ' is-diff-month' : ''}${isSel ? ' is-selected' : ''}${isTod ? ' is-today' : ''}`}
                  onClick={() => handleSelect(date)}
                >
                  <span>{date.getDate()}</span>
                </button>
              );
            })}
          </div>

          <div className="la-cal-footer">
            <button
              type="button"
              className="la-cal-today-btn"
              disabled={isDayDisabled(today)}
              onClick={() => handleSelect(today)}
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                className="la-cal-clear-btn"
                onClick={() => { onChange(''); setOpen(false); }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              className="la-cal-close-btn"
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

function LeaveTypeSelect({ value, onChange }) {
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

  const activeCfg = LEAVE_CONFIGS.find(c => c.value === value) || LEAVE_CONFIGS[0];
  const ActiveIcon = activeCfg.icon;

  return (
    <div ref={ref} className={`la-custom-picker-wrap${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className={`la-dialog-shell la-picker-button la-picker-button--select${open ? ' is-open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="la-select-badge" style={{ color: activeCfg.color, background: activeCfg.bg }}>
          <ActiveIcon size={14} />
        </span>
        <span className="la-picker-display-val">{activeCfg.label}</span>
        <ChevronDown size={14} className={`la-dialog-trail la-chevron${open ? ' is-rotated' : ''}`} />
      </button>

      {open && (
        <div className="la-custom-dropdown-menu" role="listbox">
          {LEAVE_CONFIGS.map((cfg) => {
            const isSel = cfg.value === value;
            const ItemIcon = cfg.icon;
            return (
              <button
                key={cfg.value}
                type="button"
                className={`la-custom-dropdown-item${isSel ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(cfg.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={isSel}
              >
                <div className="la-dropdown-item-left">
                  <span className="la-dropdown-item-icon" style={{ color: cfg.color, background: cfg.bg }}>
                    <ItemIcon size={15} />
                  </span>
                  <div className="la-dropdown-item-info">
                    <strong className="la-dropdown-item-title">{cfg.label}</strong>
                    <span className="la-dropdown-item-desc">{cfg.desc}</span>
                  </div>
                </div>
                {isSel && <Check size={16} className="la-select-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Custom Dropdown ─────────────────────────────────────────────── */
function Dropdown({ value, onChange, options, icon: Icon, placeholder = 'Select' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const label = options.find(o => (o.value ?? o) === value)?.label ?? value ?? placeholder;
  return (
    <div ref={ref} className={`la-dropdown${open ? ' is-open' : ''}`}>
      <button type="button" className="la-dropdown-trigger" onClick={() => setOpen(v => !v)}>
        {Icon && <Icon size={14} className="la-dropdown-icon" />}
        <span className="la-dropdown-label">{label}</span>
        <ChevronDown size={14} className="la-dropdown-chevron" />
      </button>
      {open && (
        <div className="la-dropdown-menu">
          {options.map((opt, i) => {
            const val = opt.value ?? opt;
            const lbl = opt.label ?? opt;
            const isSel = val === value;
            return (
              <button key={i} type="button" className={`la-dropdown-option${isSel ? ' is-selected' : ''}`}
                onClick={() => { onChange(val); setOpen(false); }}>
                {lbl}{isSel && <Check size={12} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Leave Balance Bar ────────────────────────────────────────────── */
function BalanceBar({ label, used, total, tone = 'purple' }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const avail = Math.max(0, total - used);
  return (
    <div className="la-balance-bar">
      <div className="la-balance-bar-header">
        <span className="la-balance-bar-label">{label}</span>
        <span className="la-balance-bar-count"><strong>{avail}</strong> / {total} days</span>
      </div>
      <div className="la-balance-bar-track">
        <div className={`la-balance-bar-fill la-balance-bar-fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Detail Drawer ────────────────────────────────────────────────── */
function DetailDrawer({ item, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  const tone = leaveTone(item.type || item.category || '');
  const from = item.from || item.startDate || item.start_date || item.from_date || '—';
  const to = item.to || item.endDate || item.end_date || item.to_date || '—';
  const days = item.total_days ?? item.days ?? '—';
  const daysNum = typeof days === 'string' ? parseFloat(days) : days;
  const appliedOn = item.created_at ? fmtDate(item.created_at) : '—';
  return (
    <div className="la-drawer-backdrop" onMouseDown={onClose}>
      <div className="la-drawer" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="la-drawer-header">
          <div className={`la-drawer-type-icon la-drawer-type-icon--${tone}`}><LeaveIcon type={item.type || item.category || ''} /></div>
          <div className="la-drawer-header-text">
            <div className="la-drawer-eyebrow">LEAVE APPLICATION</div>
            <h2 className="la-drawer-title">{item.type || item.category || 'Leave'}</h2>
          </div>
          <button className="la-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="la-drawer-status-row">
          <StatusBadge status={item.status} />
          <span className="la-drawer-meta">{!isNaN(daysNum) ? `${daysNum} day${daysNum !== 1 ? 's' : ''}` : ''}</span>
        </div>
        <div className="la-drawer-section-title">Leave Details</div>
        <div className="la-drawer-grid">
          <div className="la-drawer-item"><span>From Date</span><strong>{fmtDate(from)}</strong></div>
          <div className="la-drawer-item"><span>To Date</span><strong>{fmtDate(to)}</strong></div>
          <div className="la-drawer-item"><span>Duration</span><strong>{!isNaN(daysNum) ? `${daysNum} day${daysNum !== 1 ? 's' : ''}` : '—'}</strong></div>
          <div className="la-drawer-item"><span>Applied On</span><strong>{appliedOn}</strong></div>
        </div>
        {item.reason && (
          <>
            <div className="la-drawer-section-title">Reason</div>
            <div className="la-drawer-reason">{item.reason}</div>
          </>
        )}
        <div style={{ marginTop: '16px' }}>
          <ApprovalProgress
            overallStatus={item.overall_status || item.status}
            managerStatus={item.manager_status}
            adminStatus={item.admin_status}
            managerName={item.manager_reviewed_by || item.manager_name}
            managerReviewedAt={item.manager_reviewed_at}
            managerComment={item.manager_comment}
            managerRejectionReason={item.manager_rejection_reason}
            adminName={item.admin_reviewed_by}
            adminReviewedAt={item.admin_reviewed_at}
            adminComment={item.admin_comment}
            adminRejectionReason={item.admin_rejection_reason}
            submittedAt={item.submitted_at || item.created_at}
          />
        </div>
        <div className="la-drawer-footer">
          <button className="la-secondary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─── New Application Modal ────────────────────────────────────────── */
function NewApplicationModal({ onClose, onSuccess, balance, categoryBalances }) {
  const [form, setForm] = useState({ category: 'Casual Leave', fromDate: '', toDate: '', halfDay: false, reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };
  const days = calcDays(form.fromDate, form.toDate, form.halfDay);

  const getCatBalance = () => {
    const cat = (form.category || '').toLowerCase();
    if (cat.includes('sick')) {
      const tot = categoryBalances?.sick?.total ?? (balance?.sickLeave?.total ?? 8);
      const used = categoryBalances?.sick?.used ?? (balance?.sickLeave?.used ?? 0);
      return { avail: Math.max(0, tot - used), total: tot };
    }
    if (cat.includes('optional') || cat.includes('privilege')) {
      const tot = categoryBalances?.optional?.total ?? (balance?.optionalHoliday?.total ?? 3);
      const used = categoryBalances?.optional?.used ?? (balance?.optionalHoliday?.used ?? 0);
      return { avail: Math.max(0, tot - used), total: tot };
    }
    if (cat.includes('without pay') || cat.includes('lwp')) return { avail: 999, total: 999 };
    const tot = categoryBalances?.casual?.total ?? (balance?.casualLeave?.total ?? 10);
    const used = categoryBalances?.casual?.used ?? (balance?.casualLeave?.used ?? 0);
    return { avail: Math.max(0, tot - used), total: tot };
  };
  const catBal = getCatBalance();
  const afterBalance = Math.max(0, catBal.avail - days);
  const isExceeded = !form.category.toLowerCase().includes('without pay') && days > catBal.avail;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromDate || !form.toDate) { setError('Please select both From and To dates.'); return; }
    if (!form.reason.trim()) { setError('Please provide a reason for your leave.'); return; }
    if (isExceeded) { setError('Requested days exceed available leave balance.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.applyLeave({
        category: form.category, type: form.category,
        start_date: form.fromDate, end_date: form.toDate,
        from: form.fromDate, to: form.toDate,
        total_days: days, days: String(days),
        reason: form.reason.trim(),
        has_half_days: form.halfDay, halfDay: form.halfDay ? 'Yes' : 'No',
      });
      window.dispatchEvent(new Event('leave-applied'));
      window.dispatchEvent(new Event('leave-balance-updated'));
      onSuccess(`Leave request submitted successfully! ${days} day${days !== 1 ? 's' : ''} of ${form.category} — pending approval.`);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="la-dialog-backdrop" onMouseDown={onClose}>
      <div className="la-dialog-window" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="la-dialog-header">
          <div>
            <div className="la-dialog-eyebrow">LEAVE APPLICATION</div>
            <h2 className="la-dialog-title">New Leave Application</h2>
            <p className="la-dialog-sub">Apply for leave and track multi-level approval status.</p>
          </div>
          <button className="la-dialog-close" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="la-dialog-grid">
            <div className="la-dialog-field la-dialog-field--wide">
              <label className="la-dialog-label">Leave Type <span className="la-required">*</span></label>
              <LeaveTypeSelect
                value={form.category}
                onChange={val => set('category', val)}
              />
            </div>
            <div className="la-dialog-field">
              <label className="la-dialog-label">From Date <span className="la-required">*</span></label>
              <LeaveDatePicker
                value={form.fromDate}
                onChange={val => {
                  set('fromDate', val);
                  if (form.toDate && val && val > form.toDate) {
                    set('toDate', val);
                  }
                }}
                label="From Date"
                placeholder="Select start date"
              />
            </div>
            <div className="la-dialog-field">
              <label className="la-dialog-label">To Date <span className="la-required">*</span></label>
              <LeaveDatePicker
                value={form.toDate}
                min={form.fromDate}
                onChange={val => set('toDate', val)}
                label="To Date"
                placeholder="Select end date"
              />
            </div>
            <div className="la-dialog-field">
              <label className="la-dialog-label">Half Day Option</label>
              <label className="la-toggle-row">
                <div className={`la-toggle${form.halfDay ? ' is-on' : ''}`} onClick={() => set('halfDay', !form.halfDay)}>
                  <div className="la-toggle-knob" />
                </div>
                <span className="la-toggle-label">{form.halfDay ? 'Yes — Half day (0.5d)' : 'No — Full days'}</span>
              </label>
            </div>
            <div className="la-dialog-field">
              <label className="la-dialog-label">Calculated Duration</label>
              <div className="la-duration-pill">
                <Calendar size={14} />
                <strong>{days}</strong>
                <span>day{days !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="la-dialog-field la-dialog-field--wide">
              <label className="la-dialog-label">Reason / Justification <span className="la-required">*</span></label>
              <textarea className="la-dialog-textarea" rows={3} placeholder="Provide the reason for your leave request..." value={form.reason} onChange={e => set('reason', e.target.value)} required />
            </div>
          </div>

          {/* Balance preview */}
          {!form.category.toLowerCase().includes('without pay') && (
            <div className={`la-balance-preview${isExceeded ? ' la-balance-preview--warn' : ''}`}>
              <div className="la-balance-preview-item">
                <span>Available:</span> <strong>{catBal.avail} days</strong>
              </div>
              <span className="la-balance-preview-dot">•</span>
              <div className="la-balance-preview-item">
                <span>Requesting:</span> <strong className={isExceeded ? 'la-text-red' : ''}>{days} {days === 1 ? 'day' : 'days'}</strong>
              </div>
              <span className="la-balance-preview-dot">•</span>
              <div className="la-balance-preview-item">
                <span>Remaining:</span> <strong className={isExceeded ? 'la-text-red' : 'la-text-green'}>{isExceeded ? 'Exceeded' : `${afterBalance} days`}</strong>
              </div>
            </div>
          )}

          {error && <div className="la-dialog-error"><AlertCircle size={15} /><span>{error}</span></div>}
          <div className="la-dialog-note"><Info size={15} /><span>Leave requests are reviewed by your Reporting Manager and then synced upon approval.</span></div>
          <div className="la-dialog-actions">
            <button type="button" className="la-dialog-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="la-dialog-btn-primary" disabled={submitting || isExceeded}>
              {submitting ? <><span className="la-spinner" /> Submitting…</> : <><Plus size={16} /> Submit Application</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main LeaveApplications Component ────────────────────────────── */
export default function LeaveApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balLoading, setBalLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadAll = useCallback(async () => {
    try {
      const [apps, bal] = await Promise.all([api.getLeaveApplications(), api.getLeaveBalance()]);
      if (Array.isArray(apps)) setApplications(apps);
      if (bal) setBalance(bal);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setBalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const iv = setInterval(loadAll, 20000);
    const sync = () => loadAll();
    window.addEventListener('focus', sync);
    window.addEventListener('leave-applied', sync);
    window.addEventListener('leave-balance-updated', sync);
    return () => { clearInterval(iv); window.removeEventListener('focus', sync); window.removeEventListener('leave-applied', sync); window.removeEventListener('leave-balance-updated', sync); };
  }, [loadAll]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 6000); };

  /* Category leave breakdown computed accurately from applications & balance */
  const categoryBalances = useMemo(() => {
    let cUsed = balance?.casualLeave?.used ?? 0;
    let sUsed = balance?.sickLeave?.used ?? 0;
    let oUsed = balance?.optionalHoliday?.used ?? 0;

    // Cross-verify with approved applications to guarantee 100% real-time accuracy
    if (applications && applications.length > 0) {
      let appSick = 0, appCasual = 0, appOptional = 0;
      for (const a of applications) {
        const st = String(a.overall_status || a.status || '').toUpperCase();
        if (st === 'APPROVED') {
          const cat = String(a.type || a.category || '').toLowerCase();
          const d = parseFloat(a.total_days || a.days || 1) || 1;
          if (cat.includes('sick')) {
            appSick += d;
          } else if (cat.includes('optional') || cat.includes('privilege') || cat.includes('holiday')) {
            appOptional += d;
          } else if (!cat.includes('without pay') && !cat.includes('lwp')) {
            appCasual += d;
          }
        }
      }
      if (appSick > 0 || appOptional > 0 || appCasual > 0) {
        sUsed = appSick;
        cUsed = appCasual;
        oUsed = appOptional;
      }
    }

    const cTotal = balance?.casualLeave?.total ?? 10;
    const sTotal = balance?.sickLeave?.total ?? 8;
    const oTotal = balance?.optionalHoliday?.total ?? 3;

    return {
      casual: { used: cUsed, total: cTotal },
      sick: { used: sUsed, total: sTotal },
      optional: { used: oUsed, total: oTotal }
    };
  }, [balance, applications]);

  /* Summary stats */
  const stats = useMemo(() => {
    const totalUsed = categoryBalances.casual.used + categoryBalances.sick.used + categoryBalances.optional.used;
    const allowed = balance?.allowed ?? 21;
    const avail = Math.max(0, allowed - totalUsed);
    const used = totalUsed;
    const pending = applications.filter(a => ['PENDING_MANAGER', 'PENDING_ADMIN', 'Pending'].includes(String(a.overall_status || a.status))).length;
    const upcoming = applications.filter(a => {
      const d = new Date(a.start_date || a.startDate || a.from || '');
      return !isNaN(d) && d > new Date() && a.status !== 'Rejected';
    }).reduce((sum, a) => sum + (parseFloat(a.total_days) || 1), 0);
    return { avail, used, pending, upcoming };
  }, [balance, applications, categoryBalances]);

  /* Unique leave types for filter */
  const typeOptions = useMemo(() => {
    const types = ['All', ...new Set(applications.map(a => a.type || a.category || 'Leave').filter(Boolean))];
    return types;
  }, [applications]);

  /* Filtered rows */
  const filtered = useMemo(() => {
    return applications.filter(a => {
      const cat = a.type || a.category || '';
      const tMatch = typeFilter === 'All' || cat === typeFilter;
      const sMatch = statusFilter === 'All' || a.status === statusFilter;
      const q = search.toLowerCase();
      const qMatch = !q || [cat, a.reason, a.status, a.from || a.start_date, a.to || a.end_date].some(v => String(v || '').toLowerCase().includes(q));
      return tMatch && sMatch && qMatch;
    });
  }, [applications, search, typeFilter, statusFilter]);

  const resetFilters = () => { setSearch(''); setTypeFilter('All'); setStatusFilter('All'); };
  const hasFilters = search || typeFilter !== 'All' || statusFilter !== 'All';

  return (
    <div className="la-page">
      {toast && <div className="la-toast"><CheckCircle2 size={16} /><span>{toast}</span></div>}

      {/* Header */}
      <div className="la-header">
        <div className="la-header-left">
          <h1 className="la-title">My Leave Applications</h1>
          <p className="la-subtitle">View and manage your leave requests</p>
        </div>
        <button className="la-primary-btn" id="la-new-application-btn" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Application
        </button>
      </div>

      {/* Summary Cards */}
      <div className="la-stats-grid">
        {[
          { label: 'Available', value: loading || balLoading ? '—' : `${stats.avail}`, helper: 'Days remaining', icon: CheckCircle2, tone: 'green' },
          { label: 'Used', value: loading || balLoading ? '—' : `${stats.used}`, helper: 'Days taken', icon: Minus, tone: 'blue' },
          { label: 'Pending', value: loading ? '—' : `${stats.pending}`, helper: 'Awaiting approval', icon: Clock, tone: 'amber' },
          { label: 'Upcoming', value: loading ? '—' : `${stats.upcoming}`, helper: 'Days approved ahead', icon: ArrowRight, tone: 'purple' },
        ].map(({ label, value, helper, icon: Icon, tone }) => (
          <div key={label} className="la-stat-card">
            <div className={`la-stat-icon la-stat-icon--${tone}`}><Icon size={18} /></div>
            <div className="la-stat-body">
              <span className="la-stat-label">{label}</span>
              <strong className="la-stat-value">{value}</strong>
              <small className="la-stat-helper">{helper}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Balance Strip */}
      <div className="la-balance-strip">
        <div className="la-balance-strip-header">
          <h3 className="la-balance-strip-title">Leave Balance Overview</h3>
          <span className="la-balance-strip-sub">Total: {balance?.allowed ?? 21} days allowed</span>
        </div>
        <div className="la-balance-bars">
          <BalanceBar label="Casual Leave" used={categoryBalances.casual.used} total={categoryBalances.casual.total} tone="blue" />
          <BalanceBar label="Sick Leave" used={categoryBalances.sick.used} total={categoryBalances.sick.total} tone="green" />
          <BalanceBar label="Optional / Privilege" used={categoryBalances.optional.used} total={categoryBalances.optional.total} tone="amber" />
        </div>
      </div>

      {/* Table Card */}
      <div className="la-card">
        <div className="la-card-header">
          <div>
            <h2 className="la-card-title">My Applications</h2>
            <p className="la-card-sub">All submitted leave requests</p>
          </div>
          <button className="la-refresh-btn" onClick={loadAll} title="Refresh" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'la-spin' : ''} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="la-toolbar">
          <div className="la-search-wrap">
            <Search size={14} className="la-search-icon" />
            <input className="la-search-input" placeholder="Search by type, reason, or status…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="la-search-clear" onClick={() => setSearch('')}><X size={13} /></button>}
          </div>
          <Dropdown value={typeFilter} onChange={setTypeFilter} icon={Filter}
            options={typeOptions.map(t => ({ value: t, label: t === 'All' ? 'All Types' : t }))}
          />
          <Dropdown value={statusFilter} onChange={setStatusFilter} icon={SlidersHorizontal}
            options={[{value:'All',label:'All Statuses'},{value:'Pending',label:'Pending'},{value:'Approved',label:'Approved'},{value:'Rejected',label:'Rejected'}]}
          />
          {hasFilters && <button className="la-reset-btn" onClick={resetFilters}><X size={12} /> Clear</button>}
        </div>

        {!loading && (
          <div className="la-result-bar">
            Showing <strong>&nbsp;{filtered.length}</strong>&nbsp;of&nbsp;<strong>{applications.length}</strong>&nbsp;applications
          </div>
        )}

        <div className="la-table-wrap">
          {loading ? (
            <div className="la-skeleton-rows">
              {[1,2,3].map(i => (
                <div key={i} className="la-skeleton-row">
                  {[120,110,110,60,160,90,80].map((w,j) => <div key={j} className="la-skeleton-cell" style={{width:w}} />)}
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="la-empty-state">
              <div className="la-empty-icon la-empty-icon--error"><AlertCircle size={24} /></div>
              <h3>Failed to load applications</h3>
              <p>{error}</p>
              <button className="la-primary-btn" onClick={loadAll}><RefreshCw size={14} /> Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="la-empty-state">
              <div className="la-empty-icon"><Plane size={28} /></div>
              <h3>{hasFilters ? 'No matching applications' : 'No leave applications yet'}</h3>
              <p>{hasFilters ? 'Try adjusting your search or filters.' : 'Submit a leave request and track its approval status here.'}</p>
              {hasFilters && (
                <button className="la-secondary-btn" onClick={resetFilters}>Clear filters</button>
              )}
            </div>
          ) : (
            <table className="la-table">
              <thead>
                <tr>
                  <th>LEAVE TYPE</th><th>FROM</th><th>TO</th>
                  <th>DAYS</th><th>REASON</th><th>APPLIED ON</th>
                  <th>STATUS</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => {
                  const cat = row.type || row.category || 'Leave';
                  const tone = leaveTone(cat);
                  const from = row.from || row.startDate || row.start_date || row.from_date || '—';
                  const to = row.to || row.endDate || row.end_date || row.to_date || '—';
                  const days = row.total_days ?? row.days ?? '—';
                  const applied = row.created_at ? fmtDate(row.created_at) : '—';
                  return (
                    <tr key={row.id || idx} className="la-table-row" onClick={() => setSelectedItem(row)}>
                      <td>
                        <div className="la-type-cell">
                          <div className={`la-type-icon la-type-icon--${tone}`}><LeaveIcon type={cat} /></div>
                          <span>{cat}</span>
                        </div>
                      </td>
                      <td className="la-date-cell"><Calendar size={11} className="la-cell-icon" />{fmtDate(from)}</td>
                      <td className="la-date-cell"><Calendar size={11} className="la-cell-icon" />{fmtDate(to)}</td>
                      <td className="la-days-cell">{days} {typeof days === 'number' || !String(days).includes('day') ? 'days' : ''}</td>
                      <td className="la-reason-cell">{row.reason || '—'}</td>
                      <td className="la-date-cell">{applied}</td>
                      <td><StatusBadge status={row.status || 'Pending'} item={row} /></td>
                      <td>
                        <button className="la-view-btn" onClick={e => { e.stopPropagation(); setSelectedItem(row); }}>
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedItem && <DetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />}
      {showModal && <NewApplicationModal onClose={() => setShowModal(false)} onSuccess={showToast} balance={balance} categoryBalances={categoryBalances} />}
    </div>
  );
}
