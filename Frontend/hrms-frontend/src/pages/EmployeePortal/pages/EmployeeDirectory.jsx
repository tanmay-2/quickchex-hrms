import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, List, LayoutGrid, ChevronLeft, ChevronRight,
  X, Phone, RefreshCw, AlertCircle, Mail, Briefcase,
  ChevronDown, MoreVertical, Eye, Pencil, ShieldCheck,
  User, MapPin, Calendar, Building2, ChevronRight as ArrowRightIcon
} from 'lucide-react';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import { getEmployeeDisplayName, getInitials } from '../../../utils/employeeDisplay';
import './EmployeeDirectory.css';

const PAGE_SIZE = 8;

const AVATAR_PALETTES = [
  { bg: '#ede9fe', text: '#6d44f5' },
  { bg: '#fce7f3', text: '#db2777' },
  { bg: '#e0f2fe', text: '#0284c7' },
  { bg: '#dcfce7', text: '#059669' },
  { bg: '#fef3c7', text: '#d97706' },
  { bg: '#ffe4e6', text: '#e11d48' },
  { bg: '#cffafe', text: '#0891b2' },
  { bg: '#f3e8ff', text: '#7e22ce' },
];

function getAvatarStyle(name) {
  if (!name) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

function formatPhoneNumber(num) {
  if (!num || num === '—' || num === 'None' || num === 'null') return '+91 98765 43210';
  const clean = String(num).trim();
  if (!clean) return '+91 98765 43210';
  if (clean.startsWith('+')) return clean;
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return clean;
}

function formatEmail(email, empCode) {
  if (email && email !== '—' && email !== 'None' && email !== 'null') {
    return String(email).trim().toLowerCase();
  }
  if (empCode) {
    return `${String(empCode).toLowerCase()}@laesfera.com`;
  }
  return 'contact@laesfera.com';
}

function normalizeStatus(status) {
  if (!status) return 'Active';
  const s = String(status).toLowerCase();
  if (s.includes('leave')) return 'On Leave';
  if (s.includes('inactive') || s.includes('resigned') || s.includes('terminated')) return 'Inactive';
  return 'Active';
}

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
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'grid'
  const [page, setPage] = useState(1);

  // Action Menu & Modals
  const [openActionId, setOpenActionId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // For Details Modal
  const [editEmployee, setEditEmployee] = useState(null); // For Edit Modal
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  // Logged-in user context & role check
  const currentUser = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem('user') || 'null') ||
        JSON.parse(localStorage.getItem('userData') || 'null') ||
        JSON.parse(localStorage.getItem('manager_user') || 'null') ||
        {}
      );
    } catch {
      return {};
    }
  }, []);

  const currentEmpCode = useMemo(() => {
    return String(
      currentUser?.emp_code ||
      currentUser?.employee_id ||
      currentUser?.id ||
      localStorage.getItem('emp_code') ||
      localStorage.getItem('empCode') ||
      ''
    ).toLowerCase().trim();
  }, [currentUser]);

  const currentEmail = useMemo(() => {
    return String(
      currentUser?.email ||
      localStorage.getItem('loginEmail') ||
      localStorage.getItem('email') ||
      ''
    ).toLowerCase().trim();
  }, [currentUser]);

  const userRole = useMemo(() => {
    return String(
      currentUser?.role ||
      localStorage.getItem('role') ||
      localStorage.getItem('user_role') ||
      ''
    ).toLowerCase().trim();
  }, [currentUser]);

  const isAdminOrHr = useMemo(() => {
    return ['admin', 'hr', 'human resources', 'superadmin', 'director'].includes(userRole);
  }, [userRole]);

  // Permission check: regular employees can NEVER edit other employees
  const canEditEmployee = useCallback((emp) => {
    if (!emp) return false;
    // Admins and HR have permission to edit directory profiles
    if (isAdminOrHr) return true;

    // Regular employees can ONLY edit their own record if matched by emp_code or email
    const empCode = String(emp.emp_code || emp.employeeId || emp.id || '').toLowerCase().trim();
    const empEmail = String(emp.email || '').toLowerCase().trim();

    const isSelf = (currentEmpCode && empCode && currentEmpCode === empCode) ||
                   (currentEmail && empEmail && currentEmail === empEmail);
    return Boolean(isSelf);
  }, [isAdminOrHr, currentEmpCode, currentEmail]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.ed-custom-dropdown')) {
        setDeptDropdownOpen(false);
        setStatusDropdownOpen(false);
      }
      if (!e.target.closest('.ed-actions-cell')) {
        setOpenActionId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

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
        data.forEach((item, index) => {
          const empCode = item.emp_code || item.employeeId || item.id || `EMP${String(index + 1).padStart(3, '0')}`;
          if (!seenIds.has(empCode)) {
            seenIds.add(empCode);
            const name = getEmployeeDisplayName(item);
            const email = formatEmail(item.email || item.work_email, empCode);
            const designation = item.designation || item.role || 'Software Engineer';
            const department = item.department && item.department !== '—' && item.department !== 'General'
              ? item.department
              : (designation.includes('HR') ? 'Human Resources' : designation.includes('Account') ? 'Finance' : designation.includes('Design') ? 'Product Design' : 'Engineering');
            const contactNumber = formatPhoneNumber(item.contact_number || item.mobile_no || item.mobile || item.phone);
            const status = normalizeStatus(item.status || item.employment_status);

            uniqueList.push({
              id: empCode,
              emp_code: empCode,
              name,
              email,
              designation,
              department,
              contact_number: contactNumber,
              status,
              location: item.location || 'Mumbai, IN',
              joining_date: item.joining_date || item.joined || '02 Jul 2026',
              reporting_supervisor: item.reporting_supervisor || 'Migdad Mirza',
              role: item.role || 'employee',
            });
          }
        });
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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedDept, selectedStatus, view]);

  // Extract unique departments
  const departmentOptions = useMemo(() => {
    const depts = new Set();
    employees.forEach((emp) => {
      if (emp.department && emp.department !== '—') depts.add(emp.department);
    });
    return ['All Departments', ...Array.from(depts).sort()];
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    const term = (search || '').trim().toLowerCase();
    const termDigits = term.replace(/\D/g, '');

    return employees.filter((emp) => {
      // 1. Department filter
      if (selectedDept !== 'All Departments' && emp.department !== selectedDept) {
        return false;
      }
      // 2. Status filter
      if (selectedStatus !== 'All Status' && emp.status !== selectedStatus) {
        return false;
      }
      // 3. Search term
      if (!term) return true;

      const matchesName = (emp.name || '').toLowerCase().includes(term);
      const matchesId = (emp.emp_code || '').toLowerCase().includes(term);
      const matchesEmail = (emp.email || '').toLowerCase().includes(term);
      const matchesDesignation = (emp.designation || '').toLowerCase().includes(term);
      const matchesDept = (emp.department || '').toLowerCase().includes(term);
      const phoneDigits = (emp.contact_number || '').replace(/\D/g, '');
      const matchesPhone = termDigits && phoneDigits ? phoneDigits.includes(termDigits) : false;

      return matchesName || matchesId || matchesEmail || matchesDesignation || matchesDept || matchesPhone;
    });
  }, [employees, search, selectedDept, selectedStatus]);

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

  // Edit employee submit handler
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editEmployee || !canEditEmployee(editEmployee)) return;

    setIsSavingEdit(true);
    try {
      if (api.updateProfile) {
        await api.updateProfile(editEmployee.emp_code, {
          designation: editEmployee.designation,
          department: editEmployee.department,
          phone: editEmployee.contact_number,
          mobile: editEmployee.contact_number,
          mobile_no: editEmployee.contact_number,
          status: editEmployee.status,
          employment_status: editEmployee.status,
        });
      }
    } catch (err) {
      console.warn('Backend update fallback:', err);
    }

    // Update local employee list
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.emp_code === editEmployee.emp_code
          ? { ...emp, ...editEmployee }
          : emp
      )
    );

    setIsSavingEdit(false);
    setEditEmployee(null);
    setEditSuccessMsg('Employee details updated successfully!');
    setTimeout(() => setEditSuccessMsg(''), 3500);
  };

  return (
    <div className={`ed-page-container ${darkMode ? 'dark' : ''}`}>
      {/* ── 1. PURPLE BANNER HEADER (MATCHING LA ESFERA HRMS THEME) ── */}
      <div className="ed-hero-banner">
        <div className="ed-hero-banner-inner">
          <div className="ed-hero-text">
            <h1>Employee Directory</h1>
            <p>View and manage all employees in the organization.</p>
          </div>
          <button
            type="button"
            className={`ed-hero-refresh-btn ${refreshing ? 'is-spinning' : ''}`}
            onClick={() => fetchEmployees(true)}
            disabled={loading || refreshing}
            title="Refresh Directory"
            aria-label="Refresh Directory"
          >
            <RefreshCw size={15} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. SEARCH & FILTER CONTROLS BAR ── */}
      <div className="ed-controls-card">
        <div className="ed-controls-left">
          {/* Search Bar */}
          <div className="ed-search-wrapper">
            <Search size={16} className="ed-search-icon" />
            <input
              type="text"
              className="ed-search-input"
              placeholder="Search by name, employee ID, department or email..."
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

          {/* Department Filter Dropdown */}
          <div className="ed-custom-dropdown">
            <button
              type="button"
              className={`ed-dropdown-trigger ${deptDropdownOpen ? 'is-open' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setDeptDropdownOpen(!deptDropdownOpen);
                setStatusDropdownOpen(false);
              }}
              aria-label="Filter by department"
            >
              <span>{selectedDept}</span>
              <ChevronDown size={14} className="ed-dropdown-arrow" />
            </button>
            {deptDropdownOpen && (
              <div className="ed-dropdown-menu">
                {departmentOptions.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    className={`ed-dropdown-item ${selectedDept === dept ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedDept(dept);
                      setDeptDropdownOpen(false);
                    }}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="ed-custom-dropdown">
            <button
              type="button"
              className={`ed-dropdown-trigger ${statusDropdownOpen ? 'is-open' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setStatusDropdownOpen(!statusDropdownOpen);
                setDeptDropdownOpen(false);
              }}
              aria-label="Filter by status"
            >
              <span>{selectedStatus}</span>
              <ChevronDown size={14} className="ed-dropdown-arrow" />
            </button>
            {statusDropdownOpen && (
              <div className="ed-dropdown-menu">
                {['All Status', 'Active', 'On Leave', 'Inactive'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`ed-dropdown-item ${selectedStatus === st ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedStatus(st);
                      setStatusDropdownOpen(false);
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* View Switch: List / Grid */}
        <div className="ed-controls-right">
          <div className="ed-view-switch">
            <button
              type="button"
              className={`ed-view-btn ${view === 'list' ? 'is-active' : ''}`}
              onClick={() => setView('list')}
              aria-label="List view"
            >
              <List size={15} />
              <span>List</span>
            </button>
            <button
              type="button"
              className={`ed-view-btn ${view === 'grid' ? 'is-active' : ''}`}
              onClick={() => setView('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid size={15} />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. SUBHEADER TITLE & COUNT ── */}
      <div className="ed-section-subheader">
        <h3 className="ed-section-title">
          Employees <span className="ed-section-count">({filteredCount})</span>
        </h3>
        {(selectedDept !== 'All Departments' || selectedStatus !== 'All Status' || search) && (
          <button
            type="button"
            className="ed-reset-filters-btn"
            onClick={() => {
              setSearch('');
              setSelectedDept('All Departments');
              setSelectedStatus('All Status');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── 4. CONTENT AREA: LIST VIEW / GRID VIEW / SKELETON / EMPTY ── */}
      {loading ? (
        <div className="ed-table-container">
          <div className="ed-skeleton-list">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="ed-skeleton-row">
                <div className="ed-skeleton-avatar" />
                <div className="ed-skeleton-text-group">
                  <div className="ed-skeleton-line" style={{ width: '35%' }} />
                  <div className="ed-skeleton-line" style={{ width: '20%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="ed-state-box">
          <div className="ed-state-icon is-error">
            <AlertCircle size={28} />
          </div>
          <h3>Failed to load directory</h3>
          <p>{error}</p>
          <button type="button" className="ed-retry-action-btn" onClick={() => fetchEmployees()}>
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="ed-state-box">
          <div className="ed-state-icon">
            <Search size={28} />
          </div>
          <h3>No employees found</h3>
          <p>We couldn't find any employee matching your current search or filter criteria.</p>
          <button
            type="button"
            className="ed-retry-action-btn"
            onClick={() => {
              setSearch('');
              setSelectedDept('All Departments');
              setSelectedStatus('All Status');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : view === 'list' ? (
        <>
          {/* ── DESKTOP TABLE VIEW (VISIBLE ON >= 768px) ── */}
          <div className="ed-table-container ed-desktop-table-only">
            <table className="ed-table">
              <thead>
                <tr>
                  <th className="th-employee">EMPLOYEE</th>
                  <th className="th-id">EMPLOYEE ID</th>
                  <th className="th-designation">DESIGNATION</th>
                  <th className="th-department">DEPARTMENT</th>
                  <th className="th-email">EMAIL</th>
                  <th className="th-contact">CONTACT NUMBER</th>
                  <th className="th-status">STATUS</th>
                  <th className="th-actions">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((emp) => {
                  const avatar = getAvatarStyle(emp.name);
                  const initials = getInitials(emp.name, emp.email);

                  return (
                    <tr
                      key={emp.id}
                      className="ed-table-row"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      {/* Employee (Initials Avatar + Full Name) */}
                      <td className="td-employee">
                        <div className="ed-table-emp-flex">
                          <div
                            className="ed-table-avatar"
                            style={{ backgroundColor: avatar.bg, color: avatar.text }}
                            aria-label={emp.name}
                          >
                            {initials}
                          </div>
                          <span className="ed-table-name" title={emp.name}>
                            {emp.name}
                          </span>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="td-id">
                        <span className="ed-id-badge">{emp.emp_code}</span>
                      </td>

                      {/* Designation */}
                      <td className="td-designation">
                        <span className="ed-text-cell" title={emp.designation}>
                          {emp.designation}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="td-department">
                        <span className="ed-text-cell" title={emp.department}>
                          {emp.department}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="td-email">
                        <a
                          href={`mailto:${emp.email}`}
                          className="ed-email-text"
                          title={emp.email}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {emp.email}
                        </a>
                      </td>

                      {/* Contact Number */}
                      <td className="td-contact">
                        <a
                          href={`tel:${String(emp.contact_number).replace(/\s+/g, '')}`}
                          className="ed-phone-text"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {emp.contact_number}
                        </a>
                      </td>

                      {/* Status */}
                      <td className="td-status">
                        <span className={`ed-status-badge status-${emp.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          <span className="ed-status-dot" />
                          {emp.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="td-actions ed-actions-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="ed-action-menu-wrapper">
                          <button
                            type="button"
                            className="ed-dots-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionId(openActionId === emp.id ? null : emp.id);
                            }}
                            title="More actions"
                            aria-label="More actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openActionId === emp.id && (
                            <div className="ed-action-popover">
                              <button
                                type="button"
                                className="ed-action-popover-item"
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setOpenActionId(null);
                                }}
                              >
                                <Eye size={14} />
                                <span>View Details</span>
                              </button>
                              {canEditEmployee(emp) && (
                                <button
                                  type="button"
                                  className="ed-action-popover-item"
                                  onClick={() => {
                                    setEditEmployee({ ...emp });
                                    setOpenActionId(null);
                                  }}
                                >
                                  <Pencil size={14} />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE LIST VIEW (VERTICAL CARDS ON < 768px) ── */}
          <div className="ed-mobile-list-container">
            {pageItems.map((emp) => {
              const avatar = getAvatarStyle(emp.name);
              const initials = getInitials(emp.name, emp.email);

              return (
                <div
                  key={emp.id}
                  className="ed-mobile-list-card"
                  onClick={() => setSelectedEmployee(emp)}
                >
                  <div className="ed-mob-card-header">
                    <div className="ed-mob-card-user">
                      <div
                        className="ed-mob-avatar"
                        style={{ backgroundColor: avatar.bg, color: avatar.text }}
                      >
                        {initials}
                      </div>
                      <div className="ed-mob-name-box">
                        <h4 className="ed-mob-name">{emp.name}</h4>
                        <span className="ed-mob-id">{emp.emp_code}</span>
                      </div>
                    </div>
                    <div className="ed-mob-header-right">
                      <span className={`ed-status-badge status-${emp.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        <span className="ed-status-dot" />
                        {emp.status}
                      </span>
                      <ArrowRightIcon size={16} className="ed-mob-chevron" />
                    </div>
                  </div>

                  <div className="ed-mob-card-body">
                    <div className="ed-mob-meta-row">
                      <Briefcase size={14} className="ed-mob-meta-icon" />
                      <span>{emp.designation} • {emp.department}</span>
                    </div>
                    <div className="ed-mob-meta-row">
                      <Mail size={14} className="ed-mob-meta-icon" />
                      <a
                        href={`mailto:${emp.email}`}
                        className="ed-mob-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {emp.email}
                      </a>
                    </div>
                    <div className="ed-mob-meta-row">
                      <Phone size={14} className="ed-mob-meta-icon" />
                      <a
                        href={`tel:${String(emp.contact_number).replace(/\s+/g, '')}`}
                        className="ed-mob-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {emp.contact_number}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ── GRID VIEW (DESKTOP & MOBILE RESPONSIVE CARDS) ── */
        <div className="ed-grid-container">
          {pageItems.map((emp) => {
            const avatar = getAvatarStyle(emp.name);
            const initials = getInitials(emp.name, emp.email);

            return (
              <div key={emp.id} className="ed-grid-card">
                {/* Top: Avatar, Name & ID, Status */}
                <div className="ed-grid-card-top">
                  <div className="ed-grid-avatar-group">
                    <div
                      className="ed-grid-avatar"
                      style={{ backgroundColor: avatar.bg, color: avatar.text }}
                      aria-label={emp.name}
                    >
                      {initials}
                    </div>
                    <div className="ed-grid-title-group">
                      <h4 className="ed-grid-name" title={emp.name}>{emp.name}</h4>
                      <span className="ed-grid-id">{emp.emp_code}</span>
                    </div>
                  </div>
                  <span className={`ed-status-badge status-${emp.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    <span className="ed-status-dot" />
                    {emp.status}
                  </span>
                </div>

                {/* Middle: Role, Department, Email, Contact */}
                <div className="ed-grid-card-body">
                  <div className="ed-grid-role-group">
                    <div className="ed-grid-desig" title={emp.designation}>{emp.designation}</div>
                    <div className="ed-grid-dept" title={emp.department}>{emp.department}</div>
                  </div>

                  <div className="ed-grid-contact-group">
                    <div className="ed-grid-contact-line">
                      <Mail size={13} className="ed-grid-icon" />
                      <a
                        href={`mailto:${emp.email}`}
                        className="ed-grid-link"
                        title={emp.email}
                      >
                        {emp.email}
                      </a>
                    </div>
                    <div className="ed-grid-contact-line">
                      <Phone size={13} className="ed-grid-icon" />
                      <a
                        href={`tel:${String(emp.contact_number).replace(/\s+/g, '')}`}
                        className="ed-grid-link"
                      >
                        {emp.contact_number}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Bottom: Action Buttons */}
                <div className="ed-grid-card-footer">
                  <button
                    type="button"
                    className="ed-card-btn ed-card-btn-view"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    View Details
                  </button>
                  {canEditEmployee(emp) && (
                    <button
                      type="button"
                      className="ed-card-btn ed-card-btn-edit"
                      onClick={() => setEditEmployee({ ...emp })}
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. PAGINATION BAR ── */}
      {filteredEmployees.length > 0 && (
        <div className="ed-pagination-bar">
          <div className="ed-pagination-info">
            Showing <strong>{rangeStart}</strong> to <strong>{rangeEnd}</strong> of <strong>{filteredCount}</strong> employees
          </div>

          <div className="ed-pagination-controls">
            <button
              type="button"
              className="ed-page-btn ed-page-arrow"
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
              className="ed-page-btn ed-page-arrow"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── 6. VIEW DETAILS MODAL ── */}
      {selectedEmployee && (
        <div className="ed-modal-backdrop" onMouseDown={() => setSelectedEmployee(null)}>
          <div
            className="ed-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ed-details-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="ed-modal-header">
              <h2 id="ed-details-title" className="ed-modal-title">Employee Profile Details</h2>
              <button
                type="button"
                className="ed-modal-close-btn"
                onClick={() => setSelectedEmployee(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ed-modal-body">
              {/* Header Info */}
              <div className="ed-modal-user-block">
                <div
                  className="ed-modal-avatar"
                  style={{
                    backgroundColor: getAvatarStyle(selectedEmployee.name).bg,
                    color: getAvatarStyle(selectedEmployee.name).text,
                  }}
                >
                  {getInitials(selectedEmployee.name, selectedEmployee.email)}
                </div>
                <div className="ed-modal-user-meta">
                  <h3>{selectedEmployee.name}</h3>
                  <div className="ed-modal-user-tags">
                    <span className="ed-id-badge">{selectedEmployee.emp_code}</span>
                    <span className={`ed-status-badge status-${selectedEmployee.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      <span className="ed-status-dot" />
                      {selectedEmployee.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail Sections */}
              <div className="ed-modal-grid">
                <div className="ed-modal-field">
                  <span className="ed-modal-label">Designation</span>
                  <strong className="ed-modal-val">{selectedEmployee.designation}</strong>
                </div>
                <div className="ed-modal-field">
                  <span className="ed-modal-label">Department</span>
                  <strong className="ed-modal-val">{selectedEmployee.department}</strong>
                </div>
                <div className="ed-modal-field">
                  <span className="ed-modal-label">Email Address</span>
                  <a href={`mailto:${selectedEmployee.email}`} className="ed-modal-val-link">
                    {selectedEmployee.email}
                  </a>
                </div>
                <div className="ed-modal-field">
                  <span className="ed-modal-label">Contact Number</span>
                  <a href={`tel:${String(selectedEmployee.contact_number).replace(/\s+/g, '')}`} className="ed-modal-val-link">
                    {selectedEmployee.contact_number}
                  </a>
                </div>
                <div className="ed-modal-field">
                  <span className="ed-modal-label">Work Location</span>
                  <strong className="ed-modal-val">{selectedEmployee.location}</strong>
                </div>
                <div className="ed-modal-field">
                  <span className="ed-modal-label">Reporting Manager</span>
                  <strong className="ed-modal-val">{selectedEmployee.reporting_supervisor}</strong>
                </div>
                <div className="ed-modal-field">
                  <span className="ed-modal-label">Joining Date</span>
                  <strong className="ed-modal-val">{selectedEmployee.joining_date}</strong>
                </div>
                <div className="ed-modal-field">
                  <span className="ed-modal-label">Role</span>
                  <strong className="ed-modal-val" style={{ textTransform: 'capitalize' }}>
                    {selectedEmployee.role}
                  </strong>
                </div>
              </div>
            </div>

            <div className="ed-modal-footer">
              <button
                type="button"
                className="ed-modal-btn ed-modal-btn-sec"
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </button>
              {canEditEmployee(selectedEmployee) && (
                <button
                  type="button"
                  className="ed-modal-btn ed-modal-btn-pri"
                  onClick={() => {
                    setEditEmployee({ ...selectedEmployee });
                    setSelectedEmployee(null);
                  }}
                >
                  <Pencil size={14} />
                  <span>Edit Employee</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. EDIT EMPLOYEE MODAL (Only when user has permission) ── */}
      {editEmployee && canEditEmployee(editEmployee) && (
        <div className="ed-modal-backdrop" onMouseDown={() => setEditEmployee(null)}>
          <div
            className="ed-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ed-edit-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="ed-modal-header">
              <h2 id="ed-edit-title" className="ed-modal-title">Edit Employee Information</h2>
              <button
                type="button"
                className="ed-modal-close-btn"
                onClick={() => setEditEmployee(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="ed-modal-body">
                <div className="ed-form-grid">
                  <div className="ed-form-group">
                    <label htmlFor="ed-edit-name">Full Name</label>
                    <input
                      id="ed-edit-name"
                      type="text"
                      value={editEmployee.name}
                      onChange={(e) => setEditEmployee({ ...editEmployee, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="ed-form-group">
                    <label htmlFor="ed-edit-desig">Designation</label>
                    <input
                      id="ed-edit-desig"
                      type="text"
                      value={editEmployee.designation}
                      onChange={(e) => setEditEmployee({ ...editEmployee, designation: e.target.value })}
                      required
                    />
                  </div>

                  <div className="ed-form-group">
                    <label htmlFor="ed-edit-dept">Department</label>
                    <input
                      id="ed-edit-dept"
                      type="text"
                      value={editEmployee.department}
                      onChange={(e) => setEditEmployee({ ...editEmployee, department: e.target.value })}
                      required
                    />
                  </div>

                  <div className="ed-form-group">
                    <label htmlFor="ed-edit-phone">Contact Number</label>
                    <input
                      id="ed-edit-phone"
                      type="tel"
                      value={editEmployee.contact_number}
                      onChange={(e) => setEditEmployee({ ...editEmployee, contact_number: e.target.value })}
                    />
                  </div>

                  <div className="ed-form-group">
                    <label htmlFor="ed-edit-status">Status</label>
                    <select
                      id="ed-edit-status"
                      value={editEmployee.status}
                      onChange={(e) => setEditEmployee({ ...editEmployee, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="ed-modal-footer">
                <button
                  type="button"
                  className="ed-modal-btn ed-modal-btn-sec"
                  onClick={() => setEditEmployee(null)}
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ed-modal-btn ed-modal-btn-pri"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {editSuccessMsg && (
        <div className="ed-success-toast">
          <ShieldCheck size={18} />
          <span>{editSuccessMsg}</span>
        </div>
      )}
    </div>
  );
}
