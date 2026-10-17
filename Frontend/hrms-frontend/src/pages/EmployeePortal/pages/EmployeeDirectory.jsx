import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, List, LayoutGrid, ChevronLeft, ChevronRight,
  X, Phone, RefreshCw, AlertCircle, Mail, Briefcase
} from 'lucide-react';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import { getEmployeeDisplayName, getInitials } from '../../../utils/employeeDisplay';
import './EmployeeDirectory.css';

const PAGE_SIZE = 10;

const AVATAR_COLORS = [
  'linear-gradient(135deg, #6d44f5, #9c7dff)',
  'linear-gradient(135deg, #0284c7, #38bdf8)',
  'linear-gradient(135deg, #059669, #34d399)',
  'linear-gradient(135deg, #d97706, #fbbf24)',
  'linear-gradient(135deg, #db2777, #f472b6)',
  'linear-gradient(135deg, #4f46e5, #818cf8)',
];

function getAvatarBg(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/* Helper: phone formatter */
function formatPhoneNumber(num) {
  if (!num || num === '—' || num === 'None' || num === 'null') return 'Contact not available';
  const clean = String(num).trim();
  if (!clean) return 'Contact not available';
  if (clean.startsWith('+')) return clean;
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return clean;
}

/* Helper: email formatter */
function formatEmail(email) {
  if (!email || email === '—' || email === 'None' || email === 'null') return 'Not available';
  return String(email).trim();
}

/* Helper: designation formatter */
function formatDesignation(desig, role) {
  if (desig && desig !== '—' && desig !== 'None' && desig !== 'null') {
    const d = String(desig).trim();
    if (d.toLowerCase() !== 'employee') return d;
  }
  if (role && role !== '—' && role !== 'None') {
    const r = String(role).trim();
    return r.charAt(0).toUpperCase() + r.slice(1);
  }
  return 'Employee';
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

export default function EmployeeDirectory() {
  const { darkMode } = useTheme();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Controls
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'grid'
  const [page, setPage] = useState(1);

  // Fetch employees from API
  const fetchEmployees = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.getEmployees();
      if (Array.isArray(data)) {
        const seenIds = new Set();
        const uniqueList = [];
        for (const item of data) {
          const empId = item.id || item.emp_code || item.employeeId || item.email;
          if (empId && !seenIds.has(empId)) {
            seenIds.add(empId);
            const name = getEmployeeDisplayName(item);
            const email = item.email || item.work_email || item.official_email || '';
            const designation = item.designation || item.role || item.job_title || 'Employee';
            const department = item.department || '';
            const contactNumber = item.contact_number || item.mobile_no || item.mobile || item.phone || '';

            uniqueList.push({
              id: empId,
              emp_code: item.emp_code || item.employeeId || item.id || '',
              name,
              email,
              designation,
              role: item.role || '',
              department,
              contact_number: contactNumber,
              profile_image: item.profile_image || item.avatar || item.photo || '',
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

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search, view]);

  // Filter employees by Name, Designation, Email, or Contact Number
  const filteredEmployees = useMemo(() => {
    const term = (search || '').trim().toLowerCase();
    if (!term) return employees;

    const termDigits = term.replace(/\D/g, '');

    return employees.filter((emp) => {
      const matchesName = (emp.name || '').toLowerCase().includes(term);
      const matchesEmail = (emp.email || '').toLowerCase().includes(term);
      const matchesDesignation = (emp.designation || '').toLowerCase().includes(term);
      const matchesDept = (emp.department || '').toLowerCase().includes(term);
      const phoneDigits = (emp.contact_number || '').replace(/\D/g, '');
      const matchesPhone = termDigits && phoneDigits ? phoneDigits.includes(termDigits) : false;
      return matchesName || matchesEmail || matchesDesignation || matchesDept || matchesPhone;
    });
  }, [employees, search]);

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

  return (
    <div className={`ed-page-container ${darkMode ? 'dark' : ''}`}>
      {/* ── 1. PAGE HEADER ── */}
      <div className="ed-header-bar">
        <div className="ed-title-area">
          <h2>Employee Directory</h2>
          <span className="ed-count-pill">
            {filteredCount === totalEmployees
              ? `${totalEmployees} Employees`
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

      {/* ── 2. CONTROLS CARD (Search & View Toggle) ── */}
      <div className="ed-controls-card">
        <div className="ed-controls-left">
          <div className="ed-search-wrapper">
            <Search size={16} className="ed-search-icon" />
            <input
              type="text"
              className="ed-search-input-field"
              placeholder="Search by name, designation, email, or contact..."
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
        <div className="ed-table-card">
          <div className="ed-table-scroll">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="ed-skeleton-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="ed-skeleton-line" style={{ width: '45%' }} />
                  <div className="ed-skeleton-line" style={{ width: '25%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="ed-state-card">
          <div className="ed-state-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <AlertCircle size={28} />
          </div>
          <h3>Unable to load employees</h3>
          <p>{error}</p>
          <button type="button" className="ed-retry-btn" onClick={() => fetchEmployees()}>
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="ed-state-card">
          <div className="ed-state-icon">
            <Search size={28} />
          </div>
          <h3>No employees found</h3>
          <p>No matching employee name, designation, email, or contact number found.</p>
          {search && (
            <button
              type="button"
              className="ed-refresh-btn"
              onClick={() => setSearch('')}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : view === 'list' ? (
        /* ── LIST VIEW (Responsive Table — Name, Designation, Email & Contact) ── */
        <div className="ed-table-card">
          <div className="ed-table-scroll">
            <table className="ed-data-table ed-data-table-modern">
              <colgroup>
                <col className="ed-col-name" />
                <col className="ed-col-designation" />
                <col className="ed-col-email" />
                <col className="ed-col-contact" />
              </colgroup>
              <thead>
                <tr>
                  <th className="ed-th-name">EMPLOYEE NAME</th>
                  <th className="ed-th-designation">DESIGNATION</th>
                  <th className="ed-th-email">EMAIL ID</th>
                  <th className="ed-th-contact">CONTACT NUMBER</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((emp) => {
                  const phoneFormatted = formatPhoneNumber(emp.contact_number);
                  const emailFormatted = formatEmail(emp.email);
                  const desigFormatted = formatDesignation(emp.designation, emp.role);
                  const initials = getInitials(emp.name, emp.email);
                  const avatarBg = getAvatarBg(emp.name);

                  return (
                    <tr key={emp.id} className="ed-table-row">
                      {/* Employee Name */}
                      <td className="ed-td-name">
                        <div className="ed-person-flex">
                          <div
                            className="ed-avatar-box"
                            style={{ background: avatarBg }}
                            aria-label={emp.name}
                          >
                            <span>{initials}</span>
                          </div>
                          <div className="ed-person-meta">
                            <strong className="ed-person-meta-name" title={emp.name}>
                              {emp.name}
                            </strong>
                            {emp.department && (
                              <span className="ed-person-meta-sub">{emp.department}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="ed-td-designation">
                        <div className="ed-designation-badge" title={desigFormatted}>
                          <Briefcase size={12} className="ed-badge-icon" />
                          <span>{desigFormatted}</span>
                        </div>
                      </td>

                      {/* Email ID */}
                      <td className="ed-td-email">
                        <div className="ed-email-row-flex">
                          <Mail size={13} className="ed-email-icon-sub" />
                          {emp.email && emailFormatted !== 'Not available' ? (
                            <a
                              href={`mailto:${emp.email}`}
                              className="ed-email-link"
                              title={emp.email}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {emp.email}
                            </a>
                          ) : (
                            <span className="ed-muted-text">Not available</span>
                          )}
                        </div>
                      </td>

                      {/* Contact Number */}
                      <td className="ed-td-contact">
                        <div className="ed-contact-row-flex">
                          <Phone size={13} className="ed-contact-icon-sub" />
                          {emp.contact_number && phoneFormatted !== 'Contact not available' ? (
                            <a
                              href={`tel:${String(emp.contact_number).replace(/\s+/g, '')}`}
                              className="ed-contact-text ed-contact-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {phoneFormatted}
                            </a>
                          ) : (
                            <span className="ed-contact-text ed-muted-text">{phoneFormatted}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── GRID VIEW (Responsive Clean Cards — Name, Designation, Email & Contact) ── */
        <div className="ed-grid-wrapper ed-grid-wrapper-clean">
          {pageItems.map((emp) => {
            const phoneFormatted = formatPhoneNumber(emp.contact_number);
            const emailFormatted = formatEmail(emp.email);
            const desigFormatted = formatDesignation(emp.designation, emp.role);
            const initials = getInitials(emp.name, emp.email);
            const avatarBg = getAvatarBg(emp.name);

            return (
              <div key={emp.id} className="ed-employee-card ed-card-clean">
                <div className="ed-card-clean-top">
                  <div
                    className="ed-card-avatar"
                    style={{ background: avatarBg }}
                    aria-label={emp.name}
                  >
                    <span>{initials}</span>
                  </div>
                  <div className="ed-card-clean-info">
                    <h4 className="ed-card-name" title={emp.name}>{emp.name}</h4>
                    <div className="ed-designation-badge" title={desigFormatted}>
                      <Briefcase size={11} className="ed-badge-icon" />
                      <span>{desigFormatted}</span>
                    </div>
                    {emp.department && (
                      <span className="ed-card-dept">{emp.department}</span>
                    )}
                  </div>
                </div>

                <div className="ed-card-divider" />

                <div className="ed-card-clean-bottom">
                  {/* Email ID */}
                  <div className="ed-card-contact-line">
                    <Mail size={13} className="ed-contact-icon-sub" />
                    {emp.email && emailFormatted !== 'Not available' ? (
                      <a
                        href={`mailto:${emp.email}`}
                        className="ed-email-link"
                        title={emp.email}
                      >
                        {emp.email}
                      </a>
                    ) : (
                      <span className="ed-muted-text">Not available</span>
                    )}
                  </div>

                  {/* Contact Number */}
                  <div className="ed-card-contact-line">
                    <Phone size={13} className="ed-contact-icon-sub" />
                    {emp.contact_number && phoneFormatted !== 'Contact not available' ? (
                      <a
                        href={`tel:${String(emp.contact_number).replace(/\s+/g, '')}`}
                        className="ed-card-phone-val ed-contact-link"
                      >
                        {phoneFormatted}
                      </a>
                    ) : (
                      <span className="ed-card-phone-val ed-muted-text">{phoneFormatted}</span>
                    )}
                  </div>
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
    </div>
  );
}
