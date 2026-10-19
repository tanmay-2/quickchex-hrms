import React, { useEffect, useState } from 'react';
import { Pencil, User, Phone, Briefcase, HeartPulse, ShieldCheck, X, Check, Mail, Calendar, MapPin, Heart, AlertCircle } from 'lucide-react';
import api from '../api';
import { getEmployeeDisplayName } from '../../../utils/employeeDisplay';

const toSafeText = (val, fallback = '—') => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string') return val.trim() || fallback;
  if (typeof val === 'number') return String(val);
  return fallback;
};

const normalizeDateForInput = (d) => {
  if (!d || d === '—') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
};

export default function Profile() {
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('user') || localStorage.getItem('userData');
      const email = localStorage.getItem('loginEmail') || localStorage.getItem('rememberedLoginEmail') || '';
      const empCode = localStorage.getItem('emp_code') || localStorage.getItem('empCode') || '';
      const desig = localStorage.getItem('designation') || '';
      let u = {};
      if (stored) {
        try { u = JSON.parse(stored); } catch {}
      }
      const rawName = u.name || u.full_name || u.first_name || (email ? email.split('@')[0] : (empCode || 'Employee'));
      const rawContact = typeof u.contact === 'string' ? u.contact : (typeof u.phone === 'string' ? u.phone : (typeof u.mobile === 'string' ? u.mobile : ''));
      return {
        name: getEmployeeDisplayName(rawName),
        email: typeof u.email === 'string' ? u.email : (email || ''),
        emp_code: typeof u.emp_code === 'string' ? u.emp_code : (empCode || ''),
        employeeId: typeof u.emp_code === 'string' ? u.emp_code : (empCode || ''),
        contact: rawContact,
        designation: typeof u.designation === 'string' ? u.designation : (desig || 'Team Member'),
        department: typeof u.department === 'string' ? u.department : 'Operations',
        workLocation: typeof u.workLocation === 'string' ? u.workLocation : (typeof u.location === 'string' ? u.location : 'Mumbai, IN'),
        joined: typeof u.joined === 'string' ? u.joined : (typeof u.joining_date === 'string' ? u.joining_date : '—'),
        reportingManager: typeof u.reporting_manager === 'string' ? u.reporting_manager : (typeof u.manager === 'string' ? u.manager : '—'),
        status: 'Active',
        ...u,
        contact: rawContact, // guarantee string
      };
    } catch {}
    return {
      name: 'Employee',
      email: '',
      emp_code: '',
      employeeId: '',
      contact: '',
      designation: 'Team Member',
      department: 'Operations',
      workLocation: 'Mumbai, IN',
      joined: '—',
      reportingManager: '—',
      status: 'Active',
    };
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastToast] = useState('');
  const [editForm, setEditForm] = useState({
    phone: '',
    personal_email: '',
    dob: '',
    gender: 'Male',
    marital_status: 'Single',
    blood_group: 'O+',
    current_address: '',
    permanent_address: '',
    emergency_name: '',
    emergency_relation: 'Family',
    emergency_phone: '',
  });

  useEffect(() => {
    let mounted = true;
    api.getMyProfile()
      .then((data) => {
        if (mounted && data) {
          const apiContact = typeof data.contact === 'string' ? data.contact : (typeof data.mobile_no === 'string' ? data.mobile_no : (typeof data.phone === 'string' ? data.phone : ''));
          setProfile((prev) => ({
            ...prev,
            ...data,
            contact: apiContact || prev.contact || '',
            name: getEmployeeDisplayName(data.name || data.full_name ? data : prev),
          }));
        }
      })
      .catch((err) => {
        console.warn('Failed to load employee profile:', err);
      });
    return () => { mounted = false; };
  }, []);

  // Keyboard escape listener to close edit modal
  useEffect(() => {
    if (!isEditModalOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsEditModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen]);

  const displayName = toSafeText(getEmployeeDisplayName(profile) || profile.name || (profile.email ? profile.email.split('@')[0] : 'Employee'), 'Employee');
  const deptLabel = toSafeText(profile.department, 'Operations');
  const roleLabel = toSafeText(profile.designation, 'Team Member');
  const managerLabel = toSafeText(profile.reportingManager || profile.manager || profile.reporting_manager, '—');
  const empIdLabel = toSafeText(profile.emp_code || profile.employeeId, '—');
  const joiningLabel = toSafeText(profile.joined || profile.joining_date, '—');
  const locationLabel = toSafeText(profile.workLocation || profile.location, 'Mumbai, IN');
  const phoneLabel = toSafeText(
    (typeof profile.phone === 'string' && profile.phone) ||
    (typeof profile.mobile === 'string' && profile.mobile) ||
    (typeof profile.mobile_no === 'string' && profile.mobile_no) ||
    (typeof profile.contact === 'string' && profile.contact) ||
    (profile.contact_info && typeof profile.contact_info['Mobile Number'] === 'string' && profile.contact_info['Mobile Number']),
    '—'
  );
  const displayEmail = toSafeText(
    (typeof profile.email === 'string' && profile.email) ||
    (typeof profile.work_email === 'string' && profile.work_email) ||
    (typeof profile.official_email === 'string' && profile.official_email) ||
    localStorage.getItem('loginEmail') ||
    localStorage.getItem('rememberedLoginEmail'),
    '—'
  );

  const handleOpenEdit = () => {
    const rawDob = toSafeText(profile.personal?.['Date of Birth'] || profile.dob, '');
    const currentAddr = toSafeText(profile.contact_info?.['Current Address'] || profile.address1 || profile.current_address, '');
    const permanentAddr = toSafeText(profile.contact_info?.['Permanent Address'] || profile.address2 || profile.permanent_address, '');
    const persEmail = toSafeText(profile.contact_info?.['Personal Email'] || profile.personal_email || (!displayEmail.endsWith('@company.com') ? displayEmail : ''), '');
    const emergName = toSafeText(profile.emergency?.Name || profile.emergency_contact_name || profile.father_name, '');
    const emergRel = toSafeText(profile.emergency?.Relationship || profile.emergency_contact_relation, 'Family');
    const emergPhone = toSafeText(profile.emergency?.['Phone Number'] || profile.emergency_contact_phone || profile.family_contact, '');

    setEditForm({
      phone: phoneLabel !== '—' ? phoneLabel : '',
      personal_email: persEmail !== '—' ? persEmail : '',
      dob: normalizeDateForInput(rawDob),
      gender: toSafeText(profile.personal?.Gender || profile.gender, 'Male'),
      marital_status: toSafeText(profile.personal?.['Marital Status'] || profile.marital_status, 'Single'),
      blood_group: toSafeText(profile.personal?.['Blood Group'] || profile.blood_group, 'O+'),
      current_address: currentAddr !== '—' ? currentAddr : '',
      permanent_address: permanentAddr !== '—' ? permanentAddr : '',
      emergency_name: emergName !== '—' ? emergName : '',
      emergency_relation: emergRel !== '—' ? emergRel : 'Family',
      emergency_phone: emergPhone !== '—' ? emergPhone : '',
    });
    setIsEditModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const empCode = profile.emp_code || profile.employeeId || localStorage.getItem('emp_code') || '';
    const payload = {
      mobile: editForm.phone,
      mobile_no: editForm.phone,
      phone: editForm.phone,
      email: editForm.personal_email || profile.email,
      personal_email: editForm.personal_email,
      dob: editForm.dob,
      gender: editForm.gender,
      marital_status: editForm.marital_status,
      blood_group: editForm.blood_group,
      address1: editForm.current_address,
      address2: editForm.permanent_address,
      current_address: editForm.current_address,
      permanent_address: editForm.permanent_address,
      father_name: editForm.emergency_name,
      emergency_name: editForm.emergency_name,
      emergency_contact_name: editForm.emergency_name,
      emergency_contact_relation: editForm.emergency_relation,
      family_contact: editForm.emergency_phone,
      emergency_phone: editForm.emergency_phone,
      emergency_contact_phone: editForm.emergency_phone,
    };

    try {
      if (empCode && api.updateProfile) {
        await api.updateProfile(empCode, payload);
      }
    } catch (err) {
      console.warn('API profile update fallback:', err);
    }

    // Format DOB for display (e.g. 1995-05-20 -> 20 May 1995)
    let displayDob = '—';
    if (editForm.dob) {
      const parsed = new Date(editForm.dob);
      if (!isNaN(parsed.getTime())) {
        displayDob = parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } else {
        displayDob = editForm.dob;
      }
    }

    // Update state immediately without creating nested objects inside string fields
    setProfile((prev) => ({
      ...prev,
      contact: editForm.phone || (typeof prev.contact === 'string' ? prev.contact : '') || '',
      phone: editForm.phone,
      mobile: editForm.phone,
      mobile_no: editForm.phone,
      personal_email: editForm.personal_email,
      dob: editForm.dob,
      gender: editForm.gender,
      marital_status: editForm.marital_status,
      blood_group: editForm.blood_group,
      current_address: editForm.current_address,
      permanent_address: editForm.permanent_address,
      emergency_contact_name: editForm.emergency_name,
      emergency_contact_relation: editForm.emergency_relation,
      emergency_contact_phone: editForm.emergency_phone,
      personal: {
        ...(typeof prev.personal === 'object' && prev.personal !== null ? prev.personal : {}),
        'Date of Birth': displayDob,
        Gender: editForm.gender || '—',
        'Blood Group': editForm.blood_group || '—',
        'Marital Status': editForm.marital_status || '—',
      },
      contact_info: {
        ...(typeof prev.contact_info === 'object' && prev.contact_info !== null ? prev.contact_info : {}),
        'Mobile Number': editForm.phone || '—',
        'Personal Email': editForm.personal_email || '—',
        'Current Address': editForm.current_address || '—',
        'Permanent Address': editForm.permanent_address || '—',
      },
      emergency: {
        ...(typeof prev.emergency === 'object' && prev.emergency !== null ? prev.emergency : {}),
        Name: editForm.emergency_name || '—',
        Relationship: editForm.emergency_relation || '—',
        'Phone Number': editForm.emergency_phone || '—',
      },
    }));

    // Save to localStorage for persistence
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        localStorage.setItem('user', JSON.stringify({
          ...u,
          phone: editForm.phone,
          contact: editForm.phone,
          personal_email: editForm.personal_email,
          dob: editForm.dob,
          gender: editForm.gender,
          marital_status: editForm.marital_status,
          blood_group: editForm.blood_group,
          current_address: editForm.current_address,
          permanent_address: editForm.permanent_address,
        }));
      }
    } catch {}

    setIsSaving(false);
    setIsEditModalOpen(false);
    setToastToast('Profile updated successfully!');
    setTimeout(() => setToastToast(''), 4000);
  };

  return (
    <div className="profile-page">
      {/* Dark Purple Hero Banner */}
      <div className="profile-hero dark-purple-hero">
        <div className="hero-rings"><span /><span /></div>
        <div className="profile-hero-inner">
          <div className="hero-actions-bar">
            <button className="edit-profile-btn" type="button" onClick={handleOpenEdit}>
              Edit Profile
            </button>
            <button className="icon-btn light-icon" title="Edit Profile" type="button" onClick={handleOpenEdit}>
              <Pencil size={16} />
            </button>
          </div>
          <div className="profile-identity">
            <div className="hero-identity-details">
              <h1 className="hero-main-name" style={{ color: '#ffffff' }}>{displayName}</h1>
              <div className="hero-badge-tags">
                <span className="hero-pill-tag">
                  {roleLabel && deptLabel && roleLabel.toLowerCase() !== deptLabel.toLowerCase()
                    ? `${roleLabel} - ${deptLabel}`
                    : (roleLabel || deptLabel || 'Software Developer')}
                </span>
                {managerLabel && managerLabel !== '—' && (
                  <span className="hero-pill-tag">Reporting Manager: {managerLabel}</span>
                )}
                {empIdLabel && empIdLabel !== '—' && (
                  <span className="hero-pill-tag">Employee ID: {empIdLabel}</span>
                )}
              </div>
              <div className="hero-submeta-grid">
                <div className="submeta-item">
                  <span>Department</span>
                  <strong>{deptLabel}</strong>
                </div>
                <div className="submeta-item">
                  <span>Joining</span>
                  <strong>{joiningLabel}</strong>
                </div>
                <div className="submeta-item">
                  <span>Location</span>
                  <strong>{locationLabel}</strong>
                </div>
                <div className="submeta-item status-pill-item">
                  <span className="active-chip"><i /> {toSafeText(profile.status, 'Active')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Overview Bar */}
      <div className="profile-body">
        <div className="profile-overview card">
          <div className="overview-item">
            <span>Work Email</span>
            <strong>{displayEmail}</strong>
          </div>
          <div className="overview-item">
            <span>Department</span>
            <strong>{deptLabel}</strong>
          </div>
          <div className="overview-item">
            <span>Joining Date</span>
            <strong>{joiningLabel}</strong>
          </div>
          <div className="overview-item">
            <span>Location</span>
            <strong>{locationLabel}</strong>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="profile-grid">
          {/* Card 1: Personal Information */}
          <section className="card profile-card">
            <div className="card-header">
              <div className="section-icon"><User size={17} /></div>
              <div>
                <h2>Personal Information</h2>
                <p>Employee information</p>
              </div>
            </div>
            <div className="profile-fields">
              <div className="field">
                <span>DATE OF BIRTH</span>
                <strong>{toSafeText(profile.personal?.['Date of Birth'] || profile.dob)}</strong>
              </div>
              <div className="field">
                <span>GENDER</span>
                <strong>{toSafeText(profile.personal?.Gender || profile.gender)}</strong>
              </div>
              <div className="field">
                <span>BLOOD GROUP</span>
                <strong>{toSafeText(profile.personal?.['Blood Group'] || profile.blood_group)}</strong>
              </div>
              <div className="field">
                <span>MARITAL STATUS</span>
                <strong>{toSafeText(profile.personal?.['Marital Status'] || profile.marital_status)}</strong>
              </div>
              <div className="field wide">
                <span>NATIONALITY</span>
                <strong>{toSafeText(profile.personal?.Nationality || profile.nationality, 'Indian')}</strong>
              </div>
            </div>
          </section>

          {/* Card 2: Contact Information */}
          <section className="card profile-card">
            <div className="card-header">
              <div className="section-icon"><Phone size={17} /></div>
              <div>
                <h2>Contact Information</h2>
                <p>Employee information</p>
              </div>
            </div>
            <div className="profile-fields">
              <div className="field">
                <span>WORK EMAIL</span>
                <strong>{displayEmail}</strong>
              </div>
              <div className="field">
                <span>PERSONAL EMAIL</span>
                <strong>{toSafeText(profile.contact_info?.['Personal Email'] || profile.personal_email)}</strong>
              </div>
              <div className="field wide">
                <span>MOBILE NUMBER</span>
                <strong>{phoneLabel}</strong>
              </div>
              <div className="field">
                <span>CURRENT ADDRESS</span>
                <strong>{toSafeText(profile.contact_info?.['Current Address'] || profile.current_address || profile.address1)}</strong>
              </div>
              <div className="field">
                <span>PERMANENT ADDRESS</span>
                <strong>{toSafeText(profile.contact_info?.['Permanent Address'] || profile.permanent_address || profile.address2)}</strong>
              </div>
            </div>
          </section>

          {/* Card 3: Employment Details */}
          <section className="card profile-card">
            <div className="card-header">
              <div className="section-icon"><Briefcase size={17} /></div>
              <div>
                <h2>Employment Details</h2>
                <p>Employee information</p>
              </div>
            </div>
            <div className="profile-fields">
              <div className="field">
                <span>EMPLOYEE ID</span>
                <strong>{empIdLabel}</strong>
              </div>
              <div className="field">
                <span>DATE OF JOINING</span>
                <strong>{joiningLabel}</strong>
              </div>
              <div className="field">
                <span>DEPARTMENT</span>
                <strong>{deptLabel}</strong>
              </div>
              <div className="field">
                <span>DESIGNATION</span>
                <strong>{roleLabel}</strong>
              </div>
              <div className="field">
                <span>REPORTING MANAGER</span>
                <strong>{managerLabel}</strong>
              </div>
              <div className="field">
                <span>WORK LOCATION</span>
                <strong>{locationLabel}</strong>
              </div>
              <div className="field wide">
                <span>EMPLOYMENT TYPE</span>
                <strong>{toSafeText(profile.employment_type || profile.employmentType, 'Full-Time')}</strong>
              </div>
            </div>
          </section>

          {/* Card 4: Emergency Contact */}
          <section className="card profile-card">
            <div className="card-header">
              <div className="section-icon"><HeartPulse size={17} /></div>
              <div>
                <h2>Emergency Contact</h2>
                <p>Employee information</p>
              </div>
            </div>
            <div className="profile-fields">
              <div className="field">
                <span>NAME</span>
                <strong>{toSafeText(profile.emergency?.Name || profile.emergency_contact_name || profile.father_name)}</strong>
              </div>
              <div className="field">
                <span>RELATIONSHIP</span>
                <strong>{toSafeText(profile.emergency?.Relationship || profile.emergency_contact_relation)}</strong>
              </div>
              <div className="field wide">
                <span>PHONE NUMBER</span>
                <strong>{toSafeText(profile.emergency?.['Phone Number'] || profile.emergency_contact_phone || profile.family_contact)}</strong>
              </div>
            </div>
          </section>
        </div>

        <div className="profile-note">
          <ShieldCheck size={17} />
          <span>Your personal information is protected and kept secure.</span>
        </div>
      </div>

      {/* Edit Profile Modal Dialog */}
      {isEditModalOpen && (
        <div className="profile-edit-modal-backdrop" onMouseDown={() => setIsEditModalOpen(false)}>
          <div
            className="profile-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-edit-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="profile-edit-modal-header">
              <div>
                <h2 id="profile-edit-title" className="profile-edit-modal-title">Edit Profile Information</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  Update your personal, contact, and emergency details
                </p>
              </div>
              <button
                className="icon-btn"
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="profile-edit-modal-body">
                {/* Section 1: Personal Details */}
                <div className="profile-edit-section">
                  <div className="profile-edit-section-header">
                    <User size={15} />
                    <span>Personal Details</span>
                  </div>
                  <div className="profile-edit-grid">
                    <div className="profile-edit-input-group">
                      <label htmlFor="edit-dob">Date of Birth</label>
                      <input
                        id="edit-dob"
                        type="date"
                        value={editForm.dob}
                        onChange={(e) => handleFormChange('dob', e.target.value)}
                      />
                    </div>
                    <div className="profile-edit-input-group">
                      <label htmlFor="edit-gender">Gender</label>
                      <select
                        id="edit-gender"
                        value={editForm.gender}
                        onChange={(e) => handleFormChange('gender', e.target.value)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="profile-edit-input-group">
                      <label htmlFor="edit-marital">Marital Status</label>
                      <select
                        id="edit-marital"
                        value={editForm.marital_status}
                        onChange={(e) => handleFormChange('marital_status', e.target.value)}
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                    <div className="profile-edit-input-group">
                      <label htmlFor="edit-blood">Blood Group</label>
                      <select
                        id="edit-blood"
                        value={editForm.blood_group}
                        onChange={(e) => handleFormChange('blood_group', e.target.value)}
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact Details */}
                <div className="profile-edit-section">
                  <div className="profile-edit-section-header">
                    <Phone size={15} />
                    <span>Contact Details</span>
                  </div>
                  <div className="profile-edit-grid">
                    <div className="profile-edit-input-group">
                      <label htmlFor="edit-phone">Mobile / Phone Number</label>
                      <input
                        id="edit-phone"
                        type="tel"
                        placeholder="e.g. +91 9876543210"
                        value={editForm.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="profile-edit-input-group">
                      <label htmlFor="edit-personal-email">Personal Email</label>
                      <input
                        id="edit-personal-email"
                        type="email"
                        placeholder="e.g. employee@gmail.com"
                        value={editForm.personal_email}
                        onChange={(e) => handleFormChange('personal_email', e.target.value)}
                      />
                    </div>
                    <div className="profile-edit-input-group wide-col">
                      <label htmlFor="edit-current-address">Current Residential Address</label>
                      <textarea
                        id="edit-current-address"
                        rows="2"
                        placeholder="Street, Building, City, Pincode"
                        value={editForm.current_address}
                        onChange={(e) => handleFormChange('current_address', e.target.value)}
                      />
                    </div>
                    <div className="profile-edit-input-group wide-col">
                      <label htmlFor="edit-permanent-address">Permanent Address</label>
                      <textarea
                        id="edit-permanent-address"
                        rows="2"
                        placeholder="Permanent residence details"
                        value={editForm.permanent_address}
                        onChange={(e) => handleFormChange('permanent_address', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Emergency Contact */}
                <div className="profile-edit-section">
                  <div className="profile-edit-section-header">
                    <HeartPulse size={15} />
                    <span>Emergency Contact</span>
                  </div>
                  <div className="profile-edit-grid">
                    <div className="profile-edit-input-group">
                      <label htmlFor="edit-emerg-name">Contact Person Name</label>
                      <input
                        id="edit-emerg-name"
                        type="text"
                        placeholder="e.g. Father, Mother or Spouse name"
                        value={editForm.emergency_name}
                        onChange={(e) => handleFormChange('emergency_name', e.target.value)}
                      />
                    </div>
                    <div className="profile-edit-input-group">
                      <label htmlFor="edit-emerg-rel">Relationship</label>
                      <input
                        id="edit-emerg-rel"
                        type="text"
                        placeholder="e.g. Father, Mother, Spouse, Sibling"
                        value={editForm.emergency_relation}
                        onChange={(e) => handleFormChange('emergency_relation', e.target.value)}
                      />
                    </div>
                    <div className="profile-edit-input-group wide-col">
                      <label htmlFor="edit-emerg-phone">Emergency Phone Number</label>
                      <input
                        id="edit-emerg-phone"
                        type="tel"
                        placeholder="e.g. +91 9876543210"
                        value={editForm.emergency_phone}
                        onChange={(e) => handleFormChange('emergency_phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="profile-edit-modal-footer">
                <div className="profile-edit-notice">
                  <ShieldCheck size={15} />
                  <span>Official employment info (ID, Role, Joining) is managed by HR.</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {toastMessage && (
        <div className="profile-toast-success">
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
