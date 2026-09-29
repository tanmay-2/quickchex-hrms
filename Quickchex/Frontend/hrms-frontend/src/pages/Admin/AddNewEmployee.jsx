import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import CustomSelect from '../../components/ui/CustomSelect';
import { useTheme } from '../../theme/ThemeProvider';
import { getStoredEmployees, saveStoredEmployees } from '../../utils/employeeStore';
import './AddNewEmployee.css';

const DEPARTMENTS = ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Finance', 'Human Resources', 'Operations'];

const API_BASE = (import.meta.env.VITE_API_URL || 'https://quickchex-backend.onrender.com').replace(/\/$/, '');

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(isoStr) {
  if (!isoStr) return '';
  const parts = String(isoStr).split('-');
  if (parts.length < 3) return isoStr;
  const [y, m, d] = parts.map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  if (isNaN(date.getTime())) return isoStr;
  const monthName = date.toLocaleString('en-US', { month: 'short' });
  return `${d} ${monthName} ${y}`;
}

export default function AddNewEmployee() {
  const navigate = useNavigate();
  const themeContext = useTheme?.() || {};
  const isDark = Boolean(themeContext.isDark || themeContext.darkMode);
  const dateInputRef = useRef(null);

  const [formData, setFormData] = useState({
    emp_code: `LE${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    role: '',
    email: '',
    phone: '',
    location: '',
    department: '',
    type: 'Full-time',
    joined: todayISO(),
    salary: '',
    about: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  function updateField(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(data) {
    const errs = {};
    if (!data.emp_code || !data.emp_code.trim()) errs.emp_code = 'Employee Code is required.';
    if (!data.role || !data.role.trim()) errs.role = 'Role is required.';
    if (!data.email || !data.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errs.email = 'Enter a valid email address.';
    }
    if (!data.department) errs.department = 'Select a department.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    const cleanCode = formData.emp_code.trim();
    const displayName = formData.name ? formData.name.trim() : null;
    const parts = (formData.name || '').trim().split(/\s+/).filter(Boolean);
    const first = parts.length > 0 ? parts[0] : (displayName || cleanCode);
    const middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    const last = parts.length > 1 ? parts[parts.length - 1] : '';

    const newEmployee = {
      id: cleanCode,
      emp_code: cleanCode,
      name: displayName || `${first} ${last}`.trim() || cleanCode,
      first_name: first,
      middle_name: middle,
      last_name: last,
      role: (formData.role || 'employee').toLowerCase(),
      designation: formData.role || 'Employee',
      department: formData.department || 'General',
      email: formData.email,
      phone: formData.phone || '9999999999',
      mobile: formData.phone || '9999999999',
      mobile_no: formData.phone || '9999999999',
      contact: formData.phone || '9999999999',
      type: formData.type || 'Full-time',
      location: formData.location || 'Mumbai, IN',
      joined: formData.joined || todayISO(),
      joining_date: formData.joined || todayISO(),
      salary: formData.salary ? (Number(formData.salary) || formData.salary) : 'Payroll Setup Required',
      gross_salary: formData.salary ? (Number(formData.salary) || formData.salary) : 'Payroll Setup Required',
      about: formData.about || '',
      employment_status: 'Active',
    };

    try {
      // 1. Update local storage employee store
      const currentList = getStoredEmployees() || [];
      const updatedList = [newEmployee, ...currentList.filter((e) => (e.emp_code || e.id) !== cleanCode)];
      saveStoredEmployees(updatedList);

      // 2. Synchronize with backend API
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE}/add-emp/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            emp_code: cleanCode,
            first_name: first,
            middle_name: middle,
            last_name: last,
            password: 'Admin@123',
            email: formData.email,
            mobile: formData.phone || '9999999999',
            role: (formData.role || 'employee').toLowerCase(),
            department: formData.department || 'General',
            designation: formData.role || 'Employee',
            joining_date: formData.joined || todayISO()
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn('Backend rejected add-emp:', res.status, errData);
        }
      } catch (backendErr) {
        console.warn('Backend save error:', backendErr);
      }

      setAlert({ type: 'success', message: `Employee ${cleanCode} added successfully!` });
      setTimeout(() => {
        navigate('/dashboard/employees');
      }, 800);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to add employee. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    navigate('/dashboard/employees');
  }

  return (
    <div className={`ane-page-container ${isDark ? 'dark' : ''}`}>
      {alert && (
        <div className={`ane-alert-banner ${alert.type}`}>
          {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{alert.message}</span>
        </div>
      )}

      <div className="ane-modal-card">
        {/* Header */}
        <div className="ane-modal-header">
          <div className="ane-modal-header-copy">
            <h3 className="ane-modal-title">Add New Employee</h3>
            <p className="ane-modal-sub">Fill in the employee credentials and organizational details below.</p>
          </div>
          <button
            type="button"
            className="ane-modal-close"
            onClick={handleCancel}
            aria-label="Close"
            title="Back to Directory"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="ane-form">
          <div className="ane-modal-body">
            {/* Grid 1: Emp Code & Full Name */}
            <div className="ane-form-grid-2">
              <div className="ane-form-group">
                <label htmlFor="ane-emp-code">Emp Code / Employee ID *</label>
                <input
                  id="ane-emp-code"
                  type="text"
                  className={`ane-form-input ${errors.emp_code ? 'has-error' : ''}`}
                  placeholder="e.g. LE001"
                  value={formData.emp_code}
                  onChange={(e) => updateField('emp_code', e.target.value)}
                />
                {errors.emp_code && <span className="ane-field-err">{errors.emp_code}</span>}
              </div>

              <div className="ane-form-group">
                <label htmlFor="ane-name">Full Name</label>
                <input
                  id="ane-name"
                  type="text"
                  className={`ane-form-input ${errors.name ? 'has-error' : ''}`}
                  placeholder="e.g. Jordan Lee"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
                {errors.name && <span className="ane-field-err">{errors.name}</span>}
              </div>
            </div>

            {/* Grid 2: Role & Work Email */}
            <div className="ane-form-grid-2">
              <div className="ane-form-group">
                <label htmlFor="ane-role">Role / Title *</label>
                <input
                  id="ane-role"
                  type="text"
                  className={`ane-form-input ${errors.role ? 'has-error' : ''}`}
                  placeholder="e.g. Senior Designer"
                  value={formData.role}
                  onChange={(e) => updateField('role', e.target.value)}
                />
                {errors.role && <span className="ane-field-err">{errors.role}</span>}
              </div>

              <div className="ane-form-group">
                <label htmlFor="ane-email">Work Email *</label>
                <input
                  id="ane-email"
                  type="email"
                  className={`ane-form-input ${errors.email ? 'has-error' : ''}`}
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
                {errors.email && <span className="ane-field-err">{errors.email}</span>}
              </div>
            </div>

            {/* Grid 3: Phone & Location */}
            <div className="ane-form-grid-2">
              <div className="ane-form-group">
                <label htmlFor="ane-phone">Phone Number</label>
                <input
                  id="ane-phone"
                  type="tel"
                  className="ane-form-input"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>

              <div className="ane-form-group">
                <label htmlFor="ane-location">Location</label>
                <input
                  id="ane-location"
                  type="text"
                  className="ane-form-input"
                  placeholder="City, Country or Remote"
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                />
              </div>
            </div>

            {/* Grid 4: Department & Employment Type */}
            <div className="ane-form-grid-2">
              <div className="ane-form-group">
                <label htmlFor="ane-department">Department *</label>
                <CustomSelect
                  id="ane-department"
                  placeholder="Select department"
                  hasError={Boolean(errors.department)}
                  value={formData.department}
                  onChange={(val) => updateField('department', val)}
                  options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                />
                {errors.department && <span className="ane-field-err">{errors.department}</span>}
              </div>

              <div className="ane-form-group">
                <label htmlFor="ane-type">Employment Type</label>
                <CustomSelect
                  id="ane-type"
                  value={formData.type}
                  onChange={(val) => updateField('type', val)}
                  options={[
                    { value: 'Full-time', label: 'Full-time' },
                    { value: 'Contract', label: 'Contract' },
                  ]}
                />
              </div>
            </div>

            {/* Section 2: EMPLOYMENT & COMPENSATION */}
            <div className="ane-form-section-title">EMPLOYMENT & COMPENSATION</div>

            <div className="ane-form-group">
              <label htmlFor="ane-joined">Joining Date</label>
              <div
                className="ane-date-input-wrap"
                onClick={() => {
                  try {
                    if (dateInputRef.current?.showPicker) {
                      dateInputRef.current.showPicker();
                    } else {
                      dateInputRef.current?.focus();
                    }
                  } catch {
                    dateInputRef.current?.focus();
                  }
                }}
              >
                <span className={`ane-date-display ${!formData.joined ? 'placeholder' : ''}`}>
                  {formData.joined ? formatDisplayDate(formData.joined) : 'Select joining date'}
                </span>
                <input
                  ref={dateInputRef}
                  id="ane-joined"
                  type="date"
                  className="ane-native-date-input"
                  value={formData.joined || ''}
                  onChange={(e) => updateField('joined', e.target.value)}
                />
                <div className="ane-date-actions">
                  {formData.joined && (
                    <button
                      type="button"
                      className="ane-date-clear-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateField('joined', '');
                      }}
                      title="Clear date"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <Calendar size={16} className="ane-date-calendar-icon" />
                </div>
              </div>
            </div>

            <div className="ane-form-group">
              <label htmlFor="ane-salary">Monthly Gross Salary (₹, Optional)</label>
              <input
                id="ane-salary"
                type="text"
                className="ane-form-input"
                placeholder="e.g. 50000 (leave blank for setup required)"
                value={formData.salary || ''}
                onChange={(e) => updateField('salary', e.target.value)}
              />
              <span className="ane-field-hint">Leave blank to initialize as 'Payroll Setup Required'.</span>
            </div>

            {/* Section 3: ADDITIONAL INFORMATION */}
            <div className="ane-form-section-title">ADDITIONAL INFORMATION</div>

            <div className="ane-form-group">
              <label htmlFor="ane-about">About / Bio</label>
              <textarea
                id="ane-about"
                className="ane-form-textarea"
                placeholder="Brief description of their responsibilities and expertise..."
                value={formData.about}
                onChange={(e) => updateField('about', e.target.value)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="ane-modal-footer">
            <button
              type="button"
              className="ane-modal-cancel-btn"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ane-modal-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
