import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, List, LayoutGrid, ChevronLeft, ChevronRight,
  X, Phone, RefreshCw, AlertCircle
} from 'lucide-react';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import { getEmployeeDisplayName } from '../../../utils/employeeDisplay';
import './EmployeeDirectory.css';

const PAGE_SIZE = 10;

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
            uniqueList.push({
              id: empId,
              name: getEmployeeDisplayName(item),
              contact_number: item.contact_number || item.mobile_no || item.mobile || item.phone || '',
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

  // Filter employees only by Name or Contact Number
  const filteredEmployees = useMemo(() => {
    const term = (search || '').trim().toLowerCase();
    if (!term) return employees;

    const termDigits = term.replace(/\D/g, '');

    return employees.filter((emp) => {
      const matchesName = (emp.name || '').toLowerCase().includes(term);
      const phoneDigits = (emp.contact_number || '').replace(/\D/g, '');
      const matchesPhone = termDigits && phoneDigits ? phoneDigits.includes(termDigits) : false;
      return matchesName || matchesPhone;
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
              placeholder="Search by name or contact..."
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
          <p>No matching employee name or contact number found.</p>
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
        /* ── LIST VIEW (Responsive Table — Name & Contact Only) ── */
        <div className="ed-table-card">
          <div className="ed-table-scroll">
            <table className="ed-data-table ed-data-table-simplified">
              <colgroup>
                <col className="ed-col-name" />
                <col className="ed-col-contact" />
              </colgroup>
              <thead>
                <tr>
                  <th className="ed-name-cell">EMPLOYEE NAME</th>
                  <th className="ed-contact-cell">EMPLOYEE CONTACT</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((emp) => {
                  const phoneFormatted = formatPhoneNumber(emp.contact_number);

                  return (
                    <tr key={emp.id}>
                      {/* Employee Name */}
                      <td className="ed-name-cell">
                        <div className="ed-person-flex">
                          <div className="ed-person-meta">
                            <strong className="ed-person-meta-name">{emp.name}</strong>
                          </div>
                        </div>
                      </td>

                      {/* Contact Only */}
                      <td className="ed-contact-cell">
                        <div className="ed-contact-row-flex">
                          <Phone size={13} className="ed-contact-icon-sub" />
                          <span className="ed-contact-text">{phoneFormatted}</span>
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
        /* ── GRID VIEW (Responsive Clean Cards — Name & Contact Only) ── */
        <div className="ed-grid-wrapper ed-grid-wrapper-clean">
          {pageItems.map((emp) => {
            const phoneFormatted = formatPhoneNumber(emp.contact_number);

            return (
              <div key={emp.id} className="ed-employee-card ed-card-clean">
                <div className="ed-card-clean-top">
                  <div className="ed-card-clean-info">
                    <span className="ed-card-clean-lbl">Employee Name</span>
                    <h4 className="ed-card-name">{emp.name}</h4>
                  </div>
                </div>

                <div className="ed-card-divider" />

                <div className="ed-card-clean-bottom">
                  <span className="ed-card-clean-lbl">Contact</span>
                  <div className="ed-card-contact-line">
                    <Phone size={13} className="ed-contact-icon-sub" />
                    <span className="ed-card-phone-val">{phoneFormatted}</span>
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
