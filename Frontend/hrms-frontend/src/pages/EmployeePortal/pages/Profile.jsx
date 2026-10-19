import React, { useEffect, useState } from 'react';
import { Pencil, User, Phone, Briefcase, HeartPulse, ShieldCheck, X, Check, Mail, Calendar, MapPin, Heart, AlertCircle } from 'lucide-react';
import api from '../api';
import { getEmployeeDisplayName } from '../../../utils/employeeDisplay';

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
      return {
        name: getEmployeeDisplayName(rawName),
        email: u.email || email || '',
        emp_code: u.emp_code || empCode || '',
        employeeId: u.emp_code || empCode || '',
        contact: u.contact || u.phone || u.mobile || '',
        designation: u.designation || desig || 'Team Member',
        department: u.department || 'Operations',
        workLocation: u.workLocation || u.location || 'Mumbai, IN',
        joined: u.joined || u.joining_date || '—',
        reportingManager: u.reporting_manager || u.manager || '—',
        status: 'Active',
        ...u,
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
          setProfile((prev) => ({
            ...prev,
            ...data,
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

  const displayName = getEmployeeDisplayName(profile) || profile.name || (profile.email ? profile.email.split('@')[0] : 'Employee');
  const deptLabel = profile.department || '—';
  const roleLabel = profile.designation || '—';
  const managerLabel = profile.reportingManager || profile.manager || profile.reporting_manager || '—';
  const empIdLabel = profile.emp_code || profile.employeeId || '—';
  const joiningLabel = profile.joined || profile.joining_date || '—';
  const locationLabel = profile.workLocation || profile.location || 'Mumbai, IN';
  const phoneLabel = profile.contact || profile.phone || profile.mobile || profile.mobile_no || '—';
  const displayEmail = profile.email || profile.work_email || profile.official_email || localStorage.getItem('loginEmail') || localStorage.getItem('rememberedLoginEmail') || '—';

  const handleOpenEdit = () => {
    const rawDob = profile.personal?.['Date of Birth'] || profile.dob || '';
    setEditForm({
      phone: phoneLabel !== '—' ? phoneLabel : '',
      personal_email: (profile.contact_info?.['Personal Email'] || profile.contact?.['Personal Email'] || profile.personal_email || (profile.email && !profile.email.endsWith('@company.com') ? profile.email : '')) !== '—' ? (profile.contact_info?.['Personal Email'] || profile.contact?.['Personal Email'] || profile.personal_email || '') : '',
      dob: normalizeDateForInput(rawDob),
      gender: profile.personal?.Gender || profile.gender || 'Male',
      marital_status: profile.personal?.['Marital Status'] || profile.marital_status || 'Single',
      blood_group: profile.personal?.['Blood Group'] || profile.blood_group || 'O+',
      current_address: (profile.contact_info?.['Current Address'] || profile.contact?.['Current Address'] || profile.address1 || profile.current_address || '') !== '—' ? (profile.contact_info?.['Current Address'] || profile.contact?.['Current Address'] || profile.address1 || profile.current_address || '') : '',
      permanent_address: (profile.contact_info?.['Permanent Address'] || profile.contact?.['Permanent Address'] || profile.address2 || profile.permanent_address || '') !== '—' ? (profile.contact_info?.['Permanent Address'] || profile.contact?.['Permanent Address'] || profile.address2 || profile.permanent_address || '') : '',
      emergency_name: (profile.emergency?.Name || profile.emergency_contact_name || profile.father_name || '') !== '—' ? (profile.emergency?.Name || profile.emergency_contact_name || profile.father_name || '') : '',
      emergency_relation: (profile.emergency?.Relationship || profile.emergency_contact_relation || 'Family') !== '—' ? (profile.emergency?.Relationship || profile.emergency_contact_relation || 'Family') : 'Family',
      emergency_phone: (profile.emergency?.['Phone Number'] || profile.emergency_contact_phone || profile.family_contact || '') !== '—' ? (profile.emergency?.['Phone Number'] || profile.emergency_contact_phone || profile.family_contact || '') : '',
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
      emergency_contact_name: editForm.emergency_name,
      emergency_contact_relation: editForm.emergency_relation,
      family_contact: editForm.emergency_phone,
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
    let displayDob = editForm.dob || '—';
    if (editForm.dob) {
      const parsed = new Date(editForm.dob);
      if (!isNaN(parsed.getTime())) {
        displayDob = parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }

    // Update state immediately
    setProfile((prev) => ({
      ...prev,
      contact: editForm.phone || prev.contact,
      phone: editForm.phone || prev.phone,
      mobile: editForm.phone || prev.mobile,
      mobile_no: editForm.phone || prev.mobile_no,
      personal_email: editForm.personal_email || prev.personal_email,
      dob: editForm.dob || prev.dob,
      gender: editForm.gender || prev.gender,
      marital_status: editForm.marital_status || prev.marital_status,
      blood_group: editForm.blood_group || prev.blood_group,
      current_address: editForm.current_address || prev.current_address,
      permanent_address: editForm.permanent_address || prev.permanent_address,
      emergency_contact_name: editForm.emergency_name || prev.emergency_contact_name,
      emergency_contact_relation: editForm.emergency_relation || prev.emergency_contact_relation,
      emergency_contact_phone: editForm.emergency_phone || prev.emergency_contact_phone,
      personal: {
        ...(prev.personal || {}),
        'Date of Birth': displayDob,
        Gender: editForm.gender || prev.personal?.Gender || '—',
        'Blood Group': editForm.blood_group || prev.personal?.['Blood Group'] || '—',
        'Marital Status': editForm.marital_status || prev.personal?.['Marital Status'] || '—',
      },
      contact: {
        ...(prev.contact || {}),
        'Personal Email': editForm.personal_email || prev.contact?.['Personal Email'] || '—',
        'Current Address': editForm.current_address || prev.contact?.['Current Address'] || '—',
        'Permanent Address': editForm.permanent_address || prev.contact?.['Permanent Address'] || '—',
      },
      contact_info: {
        ...(prev.contact_info || {}),
        'Mobile Number': editForm.phone || prev.contact_info?.['Mobile Number'] || '—',
        'Personal Email': editForm.personal_email || prev.contact_info?.['Personal Email'] || '—',
        'Current Address': editForm.current_address || prev.contact_info?.['Current Address'] || '—',
        'Permanent Address': editForm.permanent_address || prev.contact_info?.['Permanent Address'] || '—',
      },
      emergency: {
        ...(prev.emergency || {}),
        Name: editForm.emergency_name || prev.emergency?.Name || '—',
        Relationship: editForm.emergency_relation || prev.emergency?.Relationship || '—',
        'Phone Number': editForm.emergency_phone || prev.emergency?.['Phone Number'] || '—',
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
                <span className="hero-pill-tag">{roleLabel} - {deptLabel}</span>
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
                  <span className="active-chip"><i /> {profile.status || 'Active'}</span>
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
                <strong>{profile.personal?.['Date of Birth'] || profile.dob || '—'}</strong>
              </div>
              <div className="field">
                <span>GENDER</span>
                <strong>{profile.personal?.Gender || profile.gender || '—'}</strong>
              </div>
              <div className="field">
                <span>BLOOD GROUP</span>
                <strong>{profile.personal?.['Blood Group'] || profile.blood_group || '—'}</strong>
              </div>
              <div className="field">
                <span>MARITAL STATUS</span>
                <strong>{profile.personal?.['Marital Status'] || profile.marital_status || '—'}</strong>
              </div>
              <div className="field wide">
                <span>NATIONALITY</span>
                <strong>{profile.personal?.Nationality || profile.nationality || 'Indian'}</strong>
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
                <strong>{profile.contact_info?.['Personal Email'] || profile.contact?.['Personal Email'] || profile.personal_email || '—'}</strong>
              </div>
              <div className="field wide">
                <span>MOBILE NUMBER</span>
                <strong>{phoneLabel}</strong>
              </div>
              <div className="field">
                <span>CURRENT ADDRESS</span>
                <strong>{profile.contact_info?.['Current Address'] || profile.contact?.['Current Address'] || profile.current_address || profile.address1 || '—'}</strong>
              </div>
              <div className="field">
                <span>PERMANENT ADDRESS</span>
                <strong>{profile.contact_info?.['Permanent Address'] || profile.contact?.['Permanent Address'] || profile.permanent_address || profile.address2 || '—'}</strong>
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
                <strong>{profile.employment_type || profile.employmentType || 'Full-Time'}</strong>
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
                <strong>{profile.emergency?.Name || profile.emergency_contact_name || profile.father_name || '—'}</strong>
              </div>
              <div className="field">
                <span>RELATIONSHIP</span>
                <strong>{profile.emergency?.Relationship || profile.emergency_contact_relation || '—'}</strong>
              </div>
              <div className="field wide">
                <span>PHONE NUMBER</span>
                <strong>{profile.emergency?.['Phone Number'] || profile.emergency_contact_phone || profile.family_contact || '—'}</strong>
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
