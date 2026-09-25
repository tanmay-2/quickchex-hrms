import React, { useEffect, useState } from 'react';
import { Pencil, User, Phone, Briefcase, HeartPulse, ShieldCheck } from 'lucide-react';
import api from '../api';
import { getEmployeeDisplayName, getInitials } from '../../../utils/employeeDisplay';

export default function Profile() {
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('user') || localStorage.getItem('userData');
      const email = localStorage.getItem('loginEmail') || localStorage.getItem('rememberedLoginEmail');
      const empCode = localStorage.getItem('emp_code') || localStorage.getItem('empCode');
      const desig = localStorage.getItem('designation');
      let u = {};
      if (stored) {
        try { u = JSON.parse(stored); } catch {}
      }
      return {
        name: getEmployeeDisplayName(u.name ? u : (email || empCode || 'janhavi.s')),
        email: u.email || email || 'janhavi.s@laesfera.co',
        emp_code: u.emp_code || empCode || '25',
        employeeId: u.emp_code || empCode || '25',
        designation: u.designation || desig || 'Employee',
        department: u.department || 'Operations',
        workLocation: u.workLocation || u.location || 'Mumbai, IN',
        joined: u.joined || '23 Sep 2026',
        reportingManager: u.reporting_manager || u.manager || 'Sarah Chen',
        status: 'Active',
        ...u,
      };
    } catch {}
    return {
      name: 'janhavi.s',
      email: 'janhavi.s@laesfera.co',
      emp_code: '25',
      employeeId: '25',
      designation: 'Employee',
      department: 'Operations',
      workLocation: 'Mumbai, IN',
      joined: '23 Sep 2026',
      reportingManager: 'Sarah Chen',
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
            name: getEmployeeDisplayName(data.name ? data : prev),
          }));
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const displayName = getEmployeeDisplayName(profile) !== 'Employee' ? getEmployeeDisplayName(profile) : 'janhavi.s';
  const displayEmail = profile.email || 'janhavi.s@laesfera.co';
  const initials = getInitials(displayName, displayEmail) || 'JJ';

  const deptLabel = profile.department || 'Operations';
  const roleLabel = profile.designation || 'Employee';
  const managerLabel = profile.reportingManager || profile.manager || 'Sarah Chen';
  const empIdLabel = profile.emp_code || profile.employeeId || '25';
  const joiningLabel = profile.joined || profile.joining_date || '23 Sep 2026';
  const locationLabel = profile.workLocation || profile.location || 'Mumbai, IN';

  return (
    <div className="profile-page">
      {/* Dark Purple Hero Banner matching Picture 3 */}
      <div className="profile-hero dark-purple-hero">
        <div className="hero-rings"><span /><span /></div>
        <div className="profile-hero-inner">
          <div className="hero-actions-bar">
            <button className="edit-profile-btn">
              Edit Profile
            </button>
            <button className="icon-btn light-icon" title="Edit Profile">
              <Pencil size={16} />
            </button>
          </div>
          <div className="profile-identity">
            <div className="avatar hero-avatar-circle">{initials}</div>
            <div className="hero-identity-details">
              <h1 className="hero-main-name">{displayName}</h1>
              <div className="hero-badge-tags">
                <span className="hero-pill-tag">{roleLabel} - {deptLabel}</span>
                <span className="hero-pill-tag">Reporting Manager: {managerLabel}</span>
                <span className="hero-pill-tag">Employee ID: {empIdLabel}</span>
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
                  <span className="active-chip"><i /> Active</span>
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
                <strong>{profile.personal?.['Date of Birth'] || profile.dob || '12 Oct 1995'}</strong>
              </div>
              <div className="field">
                <span>GENDER</span>
                <strong>{profile.personal?.Gender || profile.gender || 'Female'}</strong>
              </div>
              <div className="field">
                <span>BLOOD GROUP</span>
                <strong>{profile.personal?.['Blood Group'] || '—'}</strong>
              </div>
              <div className="field">
                <span>MARITAL STATUS</span>
                <strong>{profile.personal?.['Marital Status'] || '—'}</strong>
              </div>
              <div className="field wide">
                <span>NATIONALITY</span>
                <strong>{profile.personal?.Nationality || 'Indian'}</strong>
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
                <strong>{profile.contact?.['Personal Email'] || 'janhavi.s@gmail.com'}</strong>
              </div>
              <div className="field wide">
                <span>MOBILE NUMBER</span>
                <strong>{profile.contact?.['Mobile Number'] || profile.mobile_no || 'e.g. 987-654-3210'}</strong>
              </div>
              <div className="field">
                <span>CURRENT ADDRESS</span>
                <strong>{profile.contact?.['Current Address'] || '—'}</strong>
              </div>
              <div className="field">
                <span>PERMANENT ADDRESS</span>
                <strong>{profile.contact?.['Permanent Address'] || '—'}</strong>
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
                <strong>Full-Time</strong>
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
                <strong>{profile.emergency?.Name || 'Rahul Sharma'}</strong>
              </div>
              <div className="field">
                <span>RELATIONSHIP</span>
                <strong>{profile.emergency?.Relationship || 'Brother'}</strong>
              </div>
              <div className="field wide">
                <span>PHONE NUMBER</span>
                <strong>{profile.emergency?.['Phone Number'] || '987-654-3211'}</strong>
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
