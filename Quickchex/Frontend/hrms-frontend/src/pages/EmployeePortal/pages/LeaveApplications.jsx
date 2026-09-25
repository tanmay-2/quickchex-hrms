import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, X, RefreshCw, Search, Filter, ChevronDown, Check,
  ClipboardPenLine, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, FileText, Info, Eye, SlidersHorizontal,
  Plane, Stethoscope, Star, ArrowRight, Minus,
} from 'lucide-react';
import api from '../api';
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

function StatusBadge({ status }) {
  const s = String(status || 'Pending');
  let cls = 'la-badge';
  let Icon = Clock;
  if (s === 'Approved') { cls += ' la-badge--approved'; Icon = CheckCircle2; }
  else if (s === 'Rejected') { cls += ' la-badge--rejected'; Icon = XCircle; }
  else { cls += ' la-badge--pending'; Icon = Clock; }
  return <span className={cls}><Icon size={11} />{s}</span>;
}

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Optional / Privilege Holiday', 'Leave Without Pay'];

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
        <div className="la-drawer-section-title">Approval Status</div>
        <div className="la-drawer-timeline">
          <div className={`la-timeline-step${item.status !== 'Pending' ? ' done' : ''}`}>
            <div className="la-timeline-dot" />
            <div className="la-timeline-content">
              <strong>Manager Review</strong>
              <span>{item.status === 'Pending' ? 'Awaiting manager review' : item.status === 'Approved' ? 'Approved' : 'Reviewed'}</span>
            </div>
          </div>
          <div className={`la-timeline-step${item.status === 'Approved' ? ' done' : ''}`}>
            <div className="la-timeline-dot" />
            <div className="la-timeline-content">
              <strong>Admin Review</strong>
              <span>{item.status === 'Approved' ? 'Approved' : 'Pending'}</span>
            </div>
          </div>
        </div>
        <div className="la-drawer-footer">
          <button className="la-secondary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─── New Application Modal ────────────────────────────────────────── */
function NewApplicationModal({ onClose, onSuccess, balance }) {
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
    if (!balance) return { avail: 21, total: 21 };
    const cat = (form.category || '').toLowerCase();
    if (cat.includes('sick')) {
      const tot = balance.sickLeave?.total ?? 8;
      return { avail: balance.sickLeave?.available ?? tot, total: tot };
    }
    if (cat.includes('optional') || cat.includes('privilege')) {
      const tot = balance.optionalHoliday?.total ?? 3;
      return { avail: balance.optionalHoliday?.available ?? tot, total: tot };
    }
    if (cat.includes('without pay') || cat.includes('lwp')) return { avail: 999, total: 999 };
    const tot = balance.casualLeave?.total ?? 10;
    return { avail: balance.casualLeave?.available ?? tot, total: tot };
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
              <div className="la-dialog-shell la-dialog-shell--select">
                <Plane size={15} className="la-dialog-icon" />
                <select className="la-dialog-input la-dialog-select" value={form.category} onChange={e => set('category', e.target.value)}>
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} className="la-dialog-trail" />
              </div>
            </div>
            <div className="la-dialog-field">
              <label className="la-dialog-label">From Date <span className="la-required">*</span></label>
              <div className="la-dialog-shell">
                <Calendar size={15} className="la-dialog-icon" />
                <input type="date" className="la-dialog-input" value={form.fromDate} onChange={e => set('fromDate', e.target.value)} required />
              </div>
            </div>
            <div className="la-dialog-field">
              <label className="la-dialog-label">To Date <span className="la-required">*</span></label>
              <div className="la-dialog-shell">
                <Calendar size={15} className="la-dialog-icon" />
                <input type="date" className="la-dialog-input" value={form.toDate} min={form.fromDate} onChange={e => set('toDate', e.target.value)} required />
              </div>
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

  /* Summary stats */
  const stats = useMemo(() => {
    const avail = balance?.totalAvailable ?? 21;
    const used = balance?.used ?? 0;
    const pending = applications.filter(a => a.status === 'Pending').length;
    const upcoming = applications.filter(a => {
      const d = new Date(a.start_date || a.startDate || a.from || '');
      return !isNaN(d) && d > new Date() && a.status !== 'Rejected';
    }).reduce((sum, a) => sum + (parseFloat(a.total_days) || 1), 0);
    return { avail, used, pending, upcoming };
  }, [balance, applications]);

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
          <BalanceBar label="Casual Leave" used={balance?.casualLeave?.used ?? 0} total={balance?.casualLeave?.total ?? 10} tone="blue" />
          <BalanceBar label="Sick Leave" used={balance?.sickLeave?.used ?? 0} total={balance?.sickLeave?.total ?? 8} tone="green" />
          <BalanceBar label="Optional / Privilege" used={balance?.optionalHoliday?.used ?? 0} total={balance?.optionalHoliday?.total ?? 3} tone="amber" />
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
              {hasFilters
                ? <button className="la-secondary-btn" onClick={resetFilters}>Clear filters</button>
                : <button className="la-primary-btn" onClick={() => setShowModal(true)}><Plus size={14} /> New Application</button>
              }
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
                      <td><StatusBadge status={row.status || 'Pending'} /></td>
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
      {showModal && <NewApplicationModal onClose={() => setShowModal(false)} onSuccess={showToast} balance={balance} />}
    </div>
  );
}
