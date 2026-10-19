import React, { useEffect, useState } from 'react';
import { Pencil, User, Phone, Briefcase, HeartPulse, ShieldCheck } from 'lucide-react';
import api from '../api';
import { getEmployeeDisplayName } from '../../../utils/employeeDisplay';

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

  const displayName = getEmployeeDisplayName(profile) || profile.name || (profile.email ? profile.email.split('@')[0] : 'Employee');
  const deptLabel = profile.department || '—';
  const roleLabel = profile.designation || '—';
  const managerLabel = profile.reportingManager || profile.manager || profile.reporting_manager || '—';
  const empIdLabel = profile.emp_code || profile.employeeId || '—';
  const joiningLabel = profile.joined || profile.joining_date || '—';
  const locationLabel = profile.workLocation || profile.location || 'Mumbai, IN';
  const phoneLabel = profile.contact || profile.phone || profile.mobile || profile.mobile_no || '—';
  const displayEmail = profile.email || profile.work_email || profile.official_email || localStorage.getItem('loginEmail') || localStorage.getItem('rememberedLoginEmail') || '—';

  return (
    <div className="profile-page">
      {/* Dark Purple Hero Banner */}
      <div className="profile-hero dark-purple-hero">
        <div className="hero-rings"><span /><span /></div>
        <div className="profile-hero-inner">
          <div className="hero-actions-bar">
            <button className="edit-profile-btn" type="button">
              Edit Profile
            </button>
            <button className="icon-btn light-icon" title="Edit Profile" type="button">
              <Pencil size={16} />
            </button>
          </div>
          <div className="profile-identity">
            <div className="hero-identity-details">
              <h1 className="hero-main-name">{displayName}</h1>
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
                <strong>{profile.contact?.['Personal Email'] || profile.personal_email || '—'}</strong>
              </div>
              <div className="field wide">
                <span>MOBILE NUMBER</span>
                <strong>{phoneLabel}</strong>
              </div>
              <div className="field">
                <span>CURRENT ADDRESS</span>
                <strong>{profile.contact?.['Current Address'] || profile.current_address || '—'}</strong>
              </div>
              <div className="field">
                <span>PERMANENT ADDRESS</span>
                <strong>{profile.contact?.['Permanent Address'] || profile.permanent_address || '—'}</strong>
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
                <strong>{profile.emergency?.Name || profile.emergency_contact_name || '—'}</strong>
              </div>
              <div className="field">
                <span>RELATIONSHIP</span>
                <strong>{profile.emergency?.Relationship || profile.emergency_contact_relation || '—'}</strong>
              </div>
              <div className="field wide">
                <span>PHONE NUMBER</span>
                <strong>{profile.emergency?.['Phone Number'] || profile.emergency_contact_phone || '—'}</strong>
              </div>
            </div>
          </section>
        </div>

        <div className="profile-note">
          <ShieldCheck size={17} />
          <span>Your personal information is protected and kept secure.</span>
        </div>
      </div>
    </div>
  );
}
