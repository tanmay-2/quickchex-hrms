import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, X, RefreshCw, Search, Filter, ChevronDown, Check,
  ClipboardPenLine, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, FileText, Info, Eye, SlidersHorizontal,
} from 'lucide-react';
import api from '../api';
import './Regularization.css';

function toDateInput(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeStatus(raw) {
  const s = String(raw || '').toUpperCase().trim();
  if (s === 'PENDING_MANAGER' || s === 'PENDING') return 'Pending';
  if (s === 'PENDING_ADMIN' || s === 'APPROVED_BY_MANAGER') return 'Pending Admin';
  if (s === 'APPROVED' || s === 'COMPLETED') return 'Approved';
  if (s.includes('REJECT')) return 'Rejected';
  return raw || 'Pending';
}

function StatusBadge({ status }) {
  const n = normalizeStatus(status);
  let cls = 'reg-badge';
  let Icon = Clock;
  if (n === 'Approved') { cls += ' reg-badge--approved'; Icon = CheckCircle2; }
  else if (n === 'Rejected') { cls += ' reg-badge--rejected'; Icon = XCircle; }
  else if (n === 'Pending Admin') { cls += ' reg-badge--admin'; Icon = AlertCircle; }
  else { cls += ' reg-badge--pending'; Icon = Clock; }
  return (
    <span className={cls}>
      <Icon size={11} />
      {n}
    </span>
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
          <StatusBadge status={item.status} />
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
        <div className="reg-drawer-section-title">Approval Timeline</div>
        <div className="reg-drawer-timeline">
          <div className={`reg-timeline-step${['Approved','Pending Admin','Rejected'].includes(status) ? ' done' : ''}`}>
            <div className="reg-timeline-dot" />
            <div className="reg-timeline-content">
              <strong>Manager Review</strong>
              <span>{status === 'Pending' ? 'Awaiting manager review' : status === 'Pending Admin' ? 'Approved by manager' : status === 'Approved' ? 'Approved by manager' : 'Reviewed'}</span>
            </div>
          </div>
          <div className={`reg-timeline-step${status === 'Approved' ? ' done' : ''}`}>
            <div className="reg-timeline-dot" />
            <div className="reg-timeline-content">
              <strong>Admin Review</strong>
              <span>{status === 'Approved' ? 'Approved by admin' : 'Pending admin review'}</span>
            </div>
          </div>
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
              <div className="reg-dialog-shell">
                <Calendar size={15} className="reg-dialog-icon" />
                <input
                  type="date"
                  className="reg-dialog-input"
                  value={form.attendanceDate}
                  max={toDateInput(new Date())}
                  onChange={e => set('attendanceDate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="reg-dialog-field">
              <label className="reg-dialog-label">Regularization Type <span className="reg-required">*</span></label>
              <div className="reg-dialog-shell reg-dialog-shell--select">
                <ClipboardPenLine size={15} className="reg-dialog-icon" />
                <select
                  className="reg-dialog-input reg-dialog-select"
                  value={form.requestType}
                  onChange={e => set('requestType', e.target.value)}
                >
                  {ISSUE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} className="reg-dialog-trail" />
              </div>
            </div>

            <div className="reg-dialog-field">
              <label className="reg-dialog-label">Correct Check-in Time</label>
              <div className="reg-dialog-shell">
                <Clock size={15} className="reg-dialog-icon" />
                <input
                  type="time"
                  className="reg-dialog-input"
                  value={form.checkIn}
                  onChange={e => set('checkIn', e.target.value)}
                />
              </div>
            </div>

            <div className="reg-dialog-field">
              <label className="reg-dialog-label">Correct Check-out Time</label>
              <div className="reg-dialog-shell">
                <Clock size={15} className="reg-dialog-icon" />
                <input
                  type="time"
                  className="reg-dialog-input"
                  value={form.checkOut}
                  onChange={e => set('checkOut', e.target.value)}
                />
              </div>
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
    const iv = setInterval(load, 15000);
    const sync = () => load();
    window.addEventListener('focus', sync);
    window.addEventListener('regularization-updated', sync);
    return () => { clearInterval(iv); window.removeEventListener('focus', sync); window.removeEventListener('regularization-updated', sync); };
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

        <div className="reg-table-wrap">
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
              <div className="reg-empty-icon"><ClipboardPenLine size={28} /></div>
              <h3>{hasFilters ? 'No matching requests' : 'No regularization requests yet'}</h3>
              <p>{hasFilters ? 'Try adjusting your search or filter criteria.' : 'When you have attendance discrepancies, submit a regularization request for manager review.'}</p>
              {hasFilters
                ? <button className="reg-secondary-btn" onClick={resetFilters}>Clear filters</button>
                : <button className="reg-primary-btn" onClick={() => setShowModal(true)}><Plus size={14} /> New Request</button>
              }
            </div>
          ) : (
            <table className="reg-table">
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
                    <td><StatusBadge status={row.status} /></td>
                    <td>
                      <button className="reg-view-btn" onClick={e => { e.stopPropagation(); setSelectedItem(row); }}>
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedItem && <DetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />}
      {showModal && <NewRequestModal onClose={() => setShowModal(false)} onSuccess={showToast} />}
    </div>
  );
}
