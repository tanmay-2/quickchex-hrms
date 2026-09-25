import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, List, LayoutGrid, ChevronLeft, ChevronRight,
  ChevronDown, Check, Eye, X, Mail, Phone, Building2,
  Calendar, Briefcase, RefreshCw, AlertCircle, User,
  CheckCircle2, Clock, FileText, ArrowRight
} from 'lucide-react';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import { getEmployeeDisplayName, getInitials } from '../../../utils/employeeDisplay';
import './EmployeeDirectory.css';

const PAGE_SIZE = 8;
const API_BASE = (typeof window !== 'undefined' && window.location?.hostname
  ? `http://${window.location.hostname}:8000`
  : 'http://localhost:8000');

/* Helper: resolve full media/document url */
function docUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}/${String(path).replace(/^\//, '')}`;
}

/* Helper: deterministic color palette for avatars */
const AVATAR_PALETTES = [
  'linear-gradient(135deg, #7c3aed, #9333ea)', // Purple
  'linear-gradient(135deg, #059669, #10b981)', // Green
  'linear-gradient(135deg, #0284c7, #38bdf8)', // Blue
  'linear-gradient(135deg, #d97706, #f59e0b)', // Amber
  'linear-gradient(135deg, #db2777, #ec4899)', // Pink
  'linear-gradient(135deg, #4f46e5, #6366f1)', // Indigo
  'linear-gradient(135deg, #0d9488, #14b8a6)', // Teal
];

function getAvatarBackground(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

/* Helper: department color tone */
function getDeptTone(department = '') {
  const d = String(department).toLowerCase();
  if (d.includes('eng') || d.includes('tech') || d.includes('it')) return 'tone-blue';
  if (d.includes('design') || d.includes('product') || d.includes('ui')) return 'tone-purple';
  if (d.includes('sales') || d.includes('market')) return 'tone-amber';
  if (d.includes('finance') || d.includes('account')) return 'tone-green';
  if (d.includes('hr') || d.includes('people')) return 'tone-rose';
  return 'tone-purple';
}

/* Helper: phone formatter */
function formatPhoneNumber(num) {
  if (!num || num === '—' || num === 'None' || num === 'null') return 'Not available';
  const clean = String(num).trim();
  if (!clean) return 'Not available';
  if (clean.startsWith('+')) return clean;
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return clean;
}

/* Helper: date formatter */
function formatDate(str) {
  if (!str || str === '—') return '—';
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return str;
  }
}

/* Helper: pagination numbers */
function getPageNumbers(current, total) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  return pages;
}

/* ---------- Custom Dropdown Component ---------- */
function FilterDropdown({ value, onChange, options, ariaLabel, placeholder = 'Select' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div className={`ed-filter-select-wrapper ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="ed-filter-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={14} style={{ transition: 'transform 0.18s ease', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div className="ed-filter-menu" role="listbox">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`ed-filter-option ${active ? 'is-active' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {active && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Main Component ---------- */
export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const themeContext = useTheme();
  const darkMode = themeContext?.isDark || false;

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [codeFilter, setCodeFilter] = useState('all');
  const [view, setView] = useState('list');
  const [page, setPage] = useState(1);

  // Selected employee for detail modal/drawer
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  /* Load employee list from API */
  const fetchEmployees = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await api.getEmployees();
      if (Array.isArray(data)) {
        // Deduplicate using unique database ID / emp_code
        const seenIds = new Set();
        const uniqueList = [];

        for (const item of data) {
          const empId = item.emp_code || item.id || item.employee_id;
          if (empId && !seenIds.has(empId)) {
            seenIds.add(empId);
            uniqueList.push({
              ...item,
              id: empId,
              emp_code: empId,
              name: getEmployeeDisplayName(item),
              department: item.department || 'General',
              designation: item.designation || 'Employee',
              role: item.role || 'employee',
              email: item.email || (empId ? `${String(empId).toLowerCase()}@laesfera.co` : ''),
              contact_number: item.contact_number || item.mobile_no || item.mobile || item.phone || '',
              status: item.status || item.employment_status || 'Active',
              joining_date: item.joining_date || item.joined || '',
              profile_image: item.profile_image || null,
            });
          }
        }
        setEmployees(uniqueList);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Failed to load employee directory:', err);
      setError(err.message || 'Unable to load employees. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [search, deptFilter, codeFilter, view]);

  // Load attendance summary when employee is selected
  useEffect(() => {
    if (!selectedEmployee) {
      setAttendanceSummary(null);
      return;
    }

    let isMounted = true;
    const loadSummary = async () => {
      setAttendanceLoading(true);
      try {
        const empCode = selectedEmployee.emp_code || selectedEmployee.id;
        const res = await api.getEmployeeAttendanceSummary(empCode);
        if (isMounted) {
          setAttendanceSummary(res);
        }
      } catch (err) {
        if (isMounted) {
          setAttendanceSummary({ available: false });
        }
      } finally {
        if (isMounted) setAttendanceLoading(false);
      }
    };

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, [selectedEmployee]);

  // Dynamic unique department options from actual employees
  const availableDepartments = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.department && typeof e.department === 'string') {
        const d = e.department.trim();
        if (d && d !== '—') set.add(d);
      }
    });
    return Array.from(set).sort();
  }, [employees]);

  // Dynamic unique employee codes from actual employees
  const availableEmployeeCodes = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      const code = e.emp_code || e.id || e.employee_id;
      if (code) set.add(String(code).trim());
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    const term = (search || '').trim().toLowerCase();

    return employees.filter((emp) => {
      // 1. Search Query
      const matchesSearch =
        !term ||
        (emp.name || '').toLowerCase().includes(term) ||
        (emp.emp_code || emp.id || '').toLowerCase().includes(term) ||
        (emp.email || '').toLowerCase().includes(term) ||
        (emp.designation || emp.role || '').toLowerCase().includes(term) ||
        (emp.department || '').toLowerCase().includes(term) ||
        (emp.contact_number || '').replace(/\D/g, '').includes(term.replace(/\D/g, ''));

      // 2. Department Filter
      const matchesDept = deptFilter === 'all' || emp.department === deptFilter;

      // 3. Employee ID / Code Filter
      const matchesCode =
        codeFilter === 'all' ||
        String(emp.emp_code || emp.id || '') === codeFilter;

      return matchesSearch && matchesDept && matchesCode;
    });
  }, [employees, search, deptFilter, codeFilter]);

  // Pagination calculation
  const totalEmployees = employees.length;
  const filteredCount = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, safePage]);

  const pageNumbers = useMemo(() => getPageNumbers(safePage, totalPages), [safePage, totalPages]);
  const rangeStart = filteredCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredCount);

  // Status badge CSS helper
  const getStatusClass = (status = '') => {
    const s = String(status).toLowerCase();
    if (s.includes('active')) return 'status-active';
    if (s.includes('leave')) return 'status-on-leave';
    if (s.includes('pending')) return 'status-pending';
    return 'status-inactive';
  };

  return (
    <div className={`ed-page-container ${darkMode ? 'dark' : ''}`}>
      {/* ── 1. PAGE HEADER ── */}
      <div className="ed-header-bar">
        <div className="ed-title-area">
          <h2>All Employees</h2>
          <span className="ed-count-pill">
            {filteredCount === totalEmployees
              ? `${totalEmployees} of ${totalEmployees}`
              : `${filteredCount} of ${totalEmployees}`}
          </span>
        </div>

        <div className="ed-header-actions">
          <button
            type="button"
            className={`ed-refresh-btn ${refreshing ? 'is-spinning' : ''}`}
            onClick={() => fetchEmployees(true)}
            disabled={loading || refreshing}
            title="Refresh employee directory"
            aria-label="Refresh employee directory"
          >
            <RefreshCw size={14} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. CONTROLS CARD (Search, Filters, Toggle) ── */}
      <div className="ed-controls-card">
        <div className="ed-controls-left">
          {/* Responsive Search Box */}
          <div className="ed-search-wrapper">
            <Search size={16} className="ed-search-icon" />
            <input
              type="text"
              className="ed-search-input-field"
              placeholder="Search by name, employee ID, email or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search employees"
            />
            {search && (
              <button
                type="button"
                className="ed-search-clear-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <FilterDropdown
            value={deptFilter}
            onChange={setDeptFilter}
            ariaLabel="Filter by Department"
            options={[
              { value: 'all', label: 'All Departments' },
              ...availableDepartments.map((d) => ({ value: d, label: d })),
            ]}
          />

          {/* Employee ID Filter */}
          <FilterDropdown
            value={codeFilter}
            onChange={setCodeFilter}
            ariaLabel="Filter by Employee ID"
            options={[
              { value: 'all', label: 'All Employee IDs' },
              ...availableEmployeeCodes.map((code) => ({ value: code, label: code })),
            ]}
          />
        </div>

        {/* List / Grid Toggle */}
        <div className="ed-controls-right">
          <div className="ed-view-toggle-group">
            <button
              type="button"
              className={`ed-view-toggle-btn ${view === 'list' ? 'is-active' : ''}`}
              onClick={() => setView('list')}
              aria-label="List view"
            >
              <List size={14} />
              <span>List</span>
            </button>
            <button
              type="button"
              className={`ed-view-toggle-btn ${view === 'grid' ? 'is-active' : ''}`}
              onClick={() => setView('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid size={14} />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. CONTENT AREA (Loading / Error / Empty / Data) ── */}
      {loading ? (
        /* Loading Skeleton */
        <div className="ed-table-card">
          <div className="ed-table-scroll">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="ed-skeleton-line" style={{ width: '180px' }} />
            </div>
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="ed-skeleton-row">
                <div className="ed-skeleton-avatar" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="ed-skeleton-line" style={{ width: '40%' }} />
                  <div className="ed-skeleton-line" style={{ width: '25%' }} />
                </div>
                <div className="ed-skeleton-line" style={{ width: '15%' }} />
                <div className="ed-skeleton-line" style={{ width: '12%' }} />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div className="ed-state-card">
          <div className="ed-state-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <AlertCircle size={28} />
          </div>
          <h3>Unable to load employees</h3>
          <p>{error}</p>
          <button type="button" className="ed-retry-btn" onClick={() => fetchEmployees()}>
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        /* Empty State */
        <div className="ed-state-card">
          <div className="ed-state-icon">
            <Search size={28} />
          </div>
          <h3>No employees found</h3>
          <p>Try changing your search or filters.</p>
          {(search || deptFilter !== 'all' || codeFilter !== 'all') && (
            <button
              type="button"
              className="ed-refresh-btn"
              onClick={() => {
                setSearch('');
                setDeptFilter('all');
                setCodeFilter('all');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : view === 'list' ? (
        /* ── LIST VIEW (Production Table) ── */
        <div className="ed-table-card">
          <div className="ed-table-scroll">
            <table className="ed-data-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>EMPLOYEE ID</th>
                  <th>CONTACT</th>
                  <th>EMAIL</th>
                  <th>DEPARTMENT</th>
                  <th>DESIGNATION</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((emp) => {
                  const phoneFormatted = formatPhoneNumber(emp.contact_number);
                  const tone = getDeptTone(emp.department);
                  const avatarBg = getAvatarBackground(emp.name);

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedEmployee(emp);
                        }
                      }}
                    >
                      {/* Employee Avatar & Name */}
                      <td>
                        <div className="ed-person-flex">
                          <div className="ed-avatar-box" style={{ background: avatarBg }}>
                            {emp.profile_image ? (
                              <img
                                src={docUrl(emp.profile_image)}
                                alt={emp.name}
                                className="ed-avatar-img"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>{getInitials(emp.name)}</span>
                            )}
                          </div>
                          <div className="ed-person-meta">
                            <span className="ed-person-meta-name">{emp.name}</span>
                            <span className="ed-person-meta-sub">{emp.designation || emp.role}</span>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td>
                        <span className="ed-code-badge">{emp.emp_code || emp.id}</span>
                      </td>

                      {/* Contact */}
                      <td>
                        <span className="ed-contact-text">{phoneFormatted}</span>
                      </td>

                      {/* Email */}
                      <td>
                        {emp.email ? (
                          <a
                            href={`mailto:${emp.email}`}
                            className="ed-email-link"
                            onClick={(e) => e.stopPropagation()}
                            title={`Email ${emp.name}`}
                          >
                            <Mail size={13} style={{ color: 'var(--primary)' }} />
                            <span>{emp.email}</span>
                          </a>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </td>

                      {/* Department */}
                      <td>
                        <span className={`ed-dept-chip ${tone}`}>{emp.department}</span>
                      </td>

                      {/* Designation */}
                      <td>
                        <span style={{ fontWeight: 500 }}>{emp.designation || '—'}</span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`ed-status-chip ${getStatusClass(emp.status)}`}>
                          {emp.status || 'Active'}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="ed-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployee(emp);
                          }}
                          aria-label={`View details for ${emp.name}`}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── GRID VIEW (Employee Cards) ── */
        <div className="ed-grid-wrapper">
          {pageItems.map((emp) => {
            const phoneFormatted = formatPhoneNumber(emp.contact_number);
            const tone = getDeptTone(emp.department);
            const avatarBg = getAvatarBackground(emp.name);

            return (
              <div
                key={emp.id}
                className="ed-employee-card"
                onClick={() => setSelectedEmployee(emp)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedEmployee(emp);
                  }
                }}
              >
                <div className="ed-card-top">
                  <div className="ed-card-avatar" style={{ background: avatarBg }}>
                    {emp.profile_image ? (
                      <img
                        src={docUrl(emp.profile_image)}
                        alt={emp.name}
                        className="ed-avatar-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{getInitials(emp.name)}</span>
                    )}
                  </div>
                  <span className={`ed-status-chip ${getStatusClass(emp.status)}`}>
                    {emp.status || 'Active'}
                  </span>
                </div>

                <div className="ed-card-main-info">
                  <h4 className="ed-card-name">{emp.name}</h4>
                  <span className="ed-card-role">{emp.designation || emp.role}</span>
                  <div style={{ marginTop: 4 }}>
                    <span className={`ed-dept-chip ${tone}`}>{emp.department}</span>
                  </div>
                </div>

                <div className="ed-card-divider" />

                <div className="ed-card-details">
                  <div className="ed-card-detail-row">
                    <User size={13} />
                    <span>ID: <strong>{emp.emp_code || emp.id}</strong></span>
                  </div>
                  <div className="ed-card-detail-row">
                    <Mail size={13} />
                    {emp.email ? (
                      <a
                        href={`mailto:${emp.email}`}
                        onClick={(e) => e.stopPropagation()}
                        title={emp.email}
                      >
                        {emp.email}
                      </a>
                    ) : (
                      <span>Not available</span>
                    )}
                  </div>
                  <div className="ed-card-detail-row">
                    <Phone size={13} />
                    <span>{phoneFormatted}</span>
                  </div>
                </div>

                <div className="ed-card-footer">
                  <span className="ed-code-badge">{emp.emp_code || emp.id}</span>
                  <button
                    type="button"
                    className="ed-card-view-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmployee(emp);
                    }}
                  >
                    <Eye size={13} />
                    <span>View Profile</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. PAGINATION ── */}
      {filteredEmployees.length > 0 && (
        <div className="ed-pagination-bar">
          <span className="ed-pagination-info">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{filteredCount}</strong> employees
          </span>

          <div className="ed-pagination-controls">
            <button
              type="button"
              className="ed-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {pageNumbers.map((pNum, idx) =>
              pNum === '...' ? (
                <span key={`gap-${idx}`} className="ed-page-ellipsis">…</span>
              ) : (
                <button
                  key={pNum}
                  type="button"
                  className={`ed-page-btn ${safePage === pNum ? 'is-active' : ''}`}
                  onClick={() => setPage(pNum)}
                >
                  {pNum}
                </button>
              )
            )}

            <button
              type="button"
              className="ed-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── 5. EMPLOYEE DETAIL DRAWER / MODAL ── */}
      {selectedEmployee && (
        <div
          className="ed-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEmployee(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="employee-modal-title"
        >
          <div className="ed-modal-dialog">
            {/* Modal Header */}
            <div className="ed-modal-header">
              <div className="ed-modal-header-text">
                <span>Employee Details</span>
                <h3 id="employee-modal-title">{selectedEmployee.name}</h3>
              </div>
              <button
                type="button"
                className="ed-modal-close-btn"
                onClick={() => setSelectedEmployee(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="ed-modal-body">
              {/* Profile Head */}
              <div className="ed-modal-profile-head">
                <div
                  className="ed-modal-avatar"
                  style={{ background: getAvatarBackground(selectedEmployee.name) }}
                >
                  {selectedEmployee.profile_image ? (
                    <img
                      src={docUrl(selectedEmployee.profile_image)}
                      alt={selectedEmployee.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{getInitials(selectedEmployee.name)}</span>
                  )}
                </div>

                <div className="ed-modal-profile-info">
                  <h4 className="ed-modal-name">{selectedEmployee.name}</h4>
                  <span className="ed-modal-subtitle">
                    {selectedEmployee.designation || selectedEmployee.role} · {selectedEmployee.department}
                  </span>
                  <div className="ed-modal-badges">
                    <span className="ed-code-badge">{selectedEmployee.emp_code || selectedEmployee.id}</span>
                    <span className={`ed-status-chip ${getStatusClass(selectedEmployee.status)}`}>
                      {selectedEmployee.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Work & Contact Information */}
              <div>
                <h5 className="ed-modal-section-title">Employee & Work Information</h5>
                <div className="ed-modal-grid">
                  <div className="ed-modal-grid-item">
                    <span>Work Email</span>
                    <strong>
                      {selectedEmployee.email ? (
                        <a
                          href={`mailto:${selectedEmployee.email}`}
                          className="ed-email-link"
                          style={{ color: 'var(--primary)' }}
                        >
                          {selectedEmployee.email}
                        </a>
                      ) : (
                        'Not available'
                      )}
                    </strong>
                  </div>

                  <div className="ed-modal-grid-item">
                    <span>Contact Number</span>
                    <strong>{formatPhoneNumber(selectedEmployee.contact_number)}</strong>
                  </div>

                  <div className="ed-modal-grid-item">
                    <span>Department</span>
                    <strong>{selectedEmployee.department || '—'}</strong>
                  </div>

                  <div className="ed-modal-grid-item">
                    <span>Designation</span>
                    <strong>{selectedEmployee.designation || selectedEmployee.role || '—'}</strong>
                  </div>

                  <div className="ed-modal-grid-item">
                    <span>Employment Role</span>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {selectedEmployee.role || 'Employee'}
                    </strong>
                  </div>

                  <div className="ed-modal-grid-item">
                    <span>Employment Status</span>
                    <strong>{selectedEmployee.status || 'Active'}</strong>
                  </div>

                  <div className="ed-modal-grid-item">
                    <span>Joining Date</span>
                    <strong>{formatDate(selectedEmployee.joining_date)}</strong>
                  </div>

                  <div className="ed-modal-grid-item">
                    <span>Work Location</span>
                    <strong>{selectedEmployee.location || 'Mumbai, IN'}</strong>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div>
                <h5 className="ed-modal-section-title">Attendance Summary</h5>
                <div className="ed-attendance-summary-box">
                  {attendanceLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 }}>
                      <RefreshCw size={16} className="is-spinning" style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading attendance summary...</span>
                    </div>
                  ) : attendanceSummary?.available ? (
                    <div className="ed-attendance-chips-row">
                      <div className="ed-att-chip present">
                        <span>Present</span>
                        <strong>{attendanceSummary.present ?? 0}</strong>
                      </div>
                      <div className="ed-att-chip absent">
                        <span>Absent</span>
                        <strong>{attendanceSummary.absent ?? 0}</strong>
                      </div>
                      <div className="ed-att-chip late">
                        <span>Late</span>
                        <strong>{attendanceSummary.late ?? 0}</strong>
                      </div>
                      <div className="ed-att-chip leave">
                        <span>Leave</span>
                        <strong>{attendanceSummary.leave ?? 0}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="ed-att-empty-msg">
                      No attendance data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="ed-modal-footer">
              <button
                type="button"
                className="ed-refresh-btn"
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="ed-retry-btn"
                style={{ margin: 0 }}
                onClick={() => {
                  const targetId = selectedEmployee.emp_code || selectedEmployee.id;
                  setSelectedEmployee(null);
                  navigate(`/dashboard_emp/employee-directory/${encodeURIComponent(targetId)}`, {
                    state: { employee: selectedEmployee }
                  });
                }}
              >
                <span>Full Profile</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
