import React, { useEffect, useRef, useState } from 'react';
import { Bell, Menu, LogOut, UserRound, ChevronDown, CheckCheck, CalendarDays, Clock3, FileText, Megaphone, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { employee } from '../data';
import api from '../api';
import { getEmployeeDisplayName, getInitials } from '../../../utils/employeeDisplay';
import { resolveAvatarUrl, getStoredAvatarUrl } from '../../../utils/avatarUtils';
import { handleGlobalLogout } from '../../../utils/authUtils';
import logoAsset from '../assets/img/la-esfera-logo.png';
import fullLogoAsset from '../assets/img/laesfera_full_logo.png';

const DEFAULT_NOTIFICATIONS = [];

const iconMap = { leave:CalendarDays, attendance:Clock3, regularization:FileText, payroll:FileText, announcement:Megaphone, policy:FileText };

function formatRelative(iso) {
  if (!iso) return 'Recent';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (isNaN(diff)) return 'Recent';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return 'Recent';
  }
}

function getUserFromStorage() {
  try {
    const savedUser = (() => {
      try {
        return (
          JSON.parse(localStorage.getItem('user') || 'null') ||
          JSON.parse(localStorage.getItem('userData') || 'null') ||
          JSON.parse(localStorage.getItem('manager_user') || 'null')
        );
      } catch {
        return null;
      }
    })();

    const userName = localStorage.getItem('user_name') || localStorage.getItem('name');
    const email =
      localStorage.getItem('loginEmail') ||
      localStorage.getItem('rememberedLoginEmail') ||
      localStorage.getItem('email');
    const desig = localStorage.getItem('designation');
    const empCode = localStorage.getItem('emp_code') || localStorage.getItem('empCode');

    let resolvedName = '';
    let resolvedEmail = email || '';
    let resolvedDesig = desig || '';

    if (savedUser) {
      if (savedUser.designation) resolvedDesig = savedUser.designation;
      if (savedUser.email) resolvedEmail = savedUser.email;
      const cleanName = getEmployeeDisplayName(savedUser);
      if (cleanName && cleanName !== 'Unknown employee' && cleanName !== 'Employee') {
        resolvedName = cleanName;
      }
    }

    if (!resolvedName && userName) {
      const cleanUser = getEmployeeDisplayName(userName);
      if (cleanUser && cleanUser !== 'Unknown employee' && cleanUser !== 'Employee') {
        resolvedName = cleanUser;
      }
    }

    if (!resolvedName && resolvedEmail) {
      const cleanEmailName = getEmployeeDisplayName(resolvedEmail);
      if (cleanEmailName && cleanEmailName !== 'Unknown employee') {
        resolvedName = cleanEmailName;
      }
    }

    if (!resolvedName && empCode) {
      resolvedName = empCode;
    }

    const finalName = getEmployeeDisplayName(resolvedName || 'Employee');
    const finalDesignation = resolvedDesig || 'Employee';
    const finalInitials = getInitials(finalName, resolvedEmail);
    const finalPhoto = getStoredAvatarUrl(savedUser);

    return {
      name: finalName,
      designation: finalDesignation,
      initials: finalInitials,
      photo: finalPhoto,
    };
  } catch {}
  return {
    name: 'Employee',
    designation: 'Employee',
    initials: 'EM',
    photo: null,
  };
}

const ROUTE_TITLES = [
  { match: (p) => p.includes('/attendance/regularization') || p.endsWith('/regularization'), title: 'Regularization' },
  { match: (p) => p.includes('/attendance/records'), title: 'Attendance Records' },
  { match: (p) => p.endsWith('/attendance'), title: 'Attendance Records' },
  { match: (p) => p.includes('/employee-directory'), title: 'Employee Directory' },
  { match: (p) => p.includes('/leave/applications'), title: 'My Leave Applications' },
  { match: (p) => p.includes('/leave/balance'), title: 'Leave Balance' },
  { match: (p) => p.includes('/leave/comp-off'), title: 'Comp-Off List' },
  { match: (p) => p.includes('/leave/holidays'), title: 'Holiday List' },
  { match: (p) => p.includes('/leave'), title: 'Leave' },
  { match: (p) => p.includes('/payslips'), title: 'Payslips' },
  { match: (p) => p.includes('/profile'), title: 'My Profile' },
  { match: (p) => p.includes('/policies'), title: 'Company Policies' },
  { match: (p) => p.includes('/dailytask'), title: 'Daily Tasks' },
  { match: (p) => p.includes('/create_ticket'), title: 'Tickets' },
];

function getPageTitle(pathname) {
  const p = (pathname || '').toLowerCase().replace(/\/+$/, '');
  const found = ROUTE_TITLES.find((r) => r.match(p));
  return found ? found.title : 'HRMS Dashboard';
}

export default function Header({ onMenu, title }) {
  const location = useLocation();
  const navigate = useNavigate();
  const displayTitle = title || getPageTitle(location.pathname);
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getUserFromStorage);
  const [imgFailed, setImgFailed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notificationPanelRef = useRef(null);

  useEffect(() => {
    setImgFailed(false);
  }, [currentUser.photo]);

  useEffect(() => {
    let mounted = true;

    // Listen for storage or local updates from Dashboard
    const handleUpdate = () => {
      if (mounted) setCurrentUser(getUserFromStorage());
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('user-profile-updated', handleUpdate);

    // Primary: fetch full profile
    api.getMyProfile().then((data) => {
      if (mounted && data) {
        const cleanName = getEmployeeDisplayName(data);
        const name = cleanName !== 'Unknown employee' ? cleanName : (data.name || 'Employee');
        const designation = data.designation || localStorage.getItem('designation') || 'Employee';
        const initials = getInitials(name, data.email);
        const rawPhoto =
          data.profile_image ||
          data.profileImage ||
          data.avatar ||
          data.photo ||
          data.avatar_url ||
          null;
        const photo = null;
        const updated = { name, designation, initials, photo: null };
        setCurrentUser((prev) => ({ ...prev, ...updated }));
        try {
          const prev = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...prev, ...data, ...updated, profile_image: rawPhoto || prev.profile_image }));
          if (rawPhoto) localStorage.setItem('profile_image', rawPhoto);
        } catch {}
      }
    }).catch(() => {
      // Secondary fallback: get summary
      api.getDashboardSummary().then((sum) => {
        if (mounted && sum?.employee) {
          const emp = sum.employee;
          const cleanName = getEmployeeDisplayName(emp);
          const name = cleanName !== 'Unknown employee' ? cleanName : (emp.name || 'Employee');
          const designation = emp.designation || localStorage.getItem('designation') || 'Employee';
          const initials = getInitials(name, emp.email);
          const photo = null;
          const updated = { name, designation, initials, photo: null };
          setCurrentUser((prev) => ({ ...prev, ...updated }));
          try {
            const prev = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...prev, ...emp, name, designation, initials, profile_image: rawPhoto || prev.profile_image }));
            if (rawPhoto) localStorage.setItem('profile_image', rawPhoto);
          } catch {}
        }
      }).catch(() => {});
    });

    const fetchNotifs = () => {
      api.getNotifications().then((data) => {
        if (mounted && Array.isArray(data)) {
          setNotifications(data.map((d) => ({
            id: d.id,
            title: d.title,
            message: d.message || d.description,
            time: formatRelative(d.created_at || d.dateLabel),
            type: d.notification_type === 'POLICY_UPDATED' ? 'policy' : (d.type || 'announcement'),
            notificationType: d.notification_type,
            policyId: d.policy_id || d.reference_id,
            version: d.version_number || d.version,
            updatedDate: d.updated_date,
            read: Boolean(d.is_read ?? d.read ?? false),
          })));
        }
      }).catch(() => {});
    };

    fetchNotifs();

    return () => {
      mounted = false;
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('user-profile-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('hrms-notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const onPointer = (event) => {
      const inProfile =
        (profileRef.current && profileRef.current.contains(event.target)) ||
        (profileMenuRef.current && profileMenuRef.current.contains(event.target)) ||
        (event.target.closest && (event.target.closest('.profile-menu-wrap') || event.target.closest('.profile-menu')));
      if (!inProfile) setOpen(false);

      const inNotif =
        (notificationRef.current && notificationRef.current.contains(event.target)) ||
        (notificationPanelRef.current && notificationPanelRef.current.contains(event.target)) ||
        (event.target.closest && (event.target.closest('.notification-wrap') || event.target.closest('.notification-panel')));
      if (!inNotif) setNotificationsOpen(false);
    };
    const onKey = (event) => { if (event.key === 'Escape') { setOpen(false); setNotificationsOpen(false); } };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey); };
  }, []);

  const logout = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpen(false);
    handleGlobalLogout({ navigate });
  };

  const unread = notifications.filter(n => !n.read).length;

  const markRead = (id) => {
    api.markNotificationRead(id);
    setNotifications(items => items.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleNotificationClick = (item) => {
    markRead(item.id);
    if (item.notificationType === 'POLICY_UPDATED' || item.type === 'policy' || item.policyId) {
      setNotificationsOpen(false);
      navigate('/dashboard_emp/policies');
    }
  };

  const markAllRead = () => {
    api.markAllNotificationsRead();
    setNotifications(items => items.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="topbar ep-topbar">
      {/* ─── MOBILE TOP NAVIGATION BAR (Matching Reference: Left Menu | Center Logo | Right Bell + Profile) ─── */}
      <div className="ep-mobile-nav-bar">
        {/* Left: 3-line Hamburger Menu Button */}
        <button
          type="button"
          className="ep-mobile-hamburger-btn icon-btn"
          onClick={onMenu}
          id="employee-mobile-hamburger"
          title="Open Menu"
          aria-label="Open Menu"
        >
          <Menu size={22} strokeWidth={2.4} />
        </button>

        {/* Center: HRMS Company Logo */}
        <div
          className="ep-mobile-logo-wrap"
          onClick={() => navigate('/dashboard_emp')}
          role="button"
          tabIndex={0}
          title="LA ESFERA Employee Dashboard"
        >
          <img
            src={fullLogoAsset}
            alt="LA ESFERA"
            className="ep-mobile-logo-img"
            onError={(e) => {
              e.currentTarget.src = logoAsset;
            }}
          />
        </div>

        {/* Right: Notification Bell + Profile Avatar */}
        <div className="ep-mobile-right-controls">
          <button
            type="button"
            className={`icon-btn header-icon-btn notification-btn ep-mobile-bell-btn ${notificationsOpen ? 'active' : ''}`}
            onClick={() => setNotificationsOpen((v) => !v)}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={19} strokeWidth={2.2} />
            {unread > 0 && (
              <span className="notification-count">{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          <button
            type="button"
            className="ep-mobile-avatar-btn"
            onClick={() => setOpen((v) => !v)}
            title={currentUser.name}
            aria-label="Profile Menu"
          >
            <div className="avatar avatar-sm">
              {currentUser.initials}
            </div>
          </button>
        </div>
      </div>

      {/* ─── MOBILE CONTEXT SUBBAR ─── */}
      <div className="ep-mobile-subbar">
        <div className="eyebrow">EMPLOYEE PORTAL</div>
        <h2 className="ep-mobile-subbar-title">{displayTitle}</h2>
      </div>

      {/* ─── DESKTOP HEADER ROW ─── */}
      <div className="ep-desktop-header-row">
        <div className="topbar-title">
          <div className="eyebrow">EMPLOYEE PORTAL</div>
          <div className="topbar-page">{displayTitle}</div>
        </div>

        <div className="topbar-actions">
          <div className="notification-wrap" ref={notificationRef}>
            <button
              className={`icon-btn header-icon-btn notification-btn ${notificationsOpen ? 'active' : ''}`}
              onClick={() => setNotificationsOpen((v) => !v)}
              title="Notifications"
              aria-label="Notifications"
              aria-haspopup="dialog"
              aria-expanded={notificationsOpen}
            >
              <Bell size={19} />
              {unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
            </button>
          </div>

          <div className="profile-menu-wrap" ref={profileRef}>
            <button className="profile-trigger" onClick={() => setOpen((v) => !v)}>
              <span className="profile-trigger-text">
                <strong>{currentUser.name}</strong>
                <small>{currentUser.designation}</small>
              </span>
              <ChevronDown size={16} />
            </button>
          </div>

          <button className="logout-btn" onClick={logout}>
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* ─── DROPDOWN PANELS (Rendered for both mobile and desktop) ─── */}
      {notificationsOpen && (
        <div className="notification-panel" ref={notificationPanelRef}>
          <div className="notification-head">
            <div>
              <strong>Notifications</strong>
              <span>{unread ? `${unread} unread` : 'All caught up'}</span>
            </div>
            <button className="notification-close-mobile" onClick={() => setNotificationsOpen(false)}>
              <X size={15} />
            </button>
          </div>
          <div className="notification-actions">
            <span>Latest updates</span>
            <button onClick={markAllRead} disabled={!unread}>
              <CheckCheck size={14} /> Mark all as read
            </button>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={26} />
                <strong>No notifications</strong>
                <span>You’re all caught up.</span>
              </div>
            ) : (
              notifications.map((item) => {
                const Icon = item.type === 'policy' ? FileText : (iconMap[item.type] || Bell);
                return (
                  <div
                    key={item.id}
                    className={`notification-item ${item.read ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="notification-item-icon">
                      <Icon size={15} />
                    </span>
                    <span className="notification-item-copy">
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                      {(item.version || item.updatedDate) && (
                        <span style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px', display: 'flex', gap: '8px' }}>
                          {item.version && <span>Version: {item.version}</span>}
                          {item.updatedDate && <span>Updated: {item.updatedDate}</span>}
                        </span>
                      )}
                      <small>{item.time}</small>
                      {(item.notificationType === 'POLICY_UPDATED' || item.type === 'policy') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(item);
                          }}
                          style={{
                            marginTop: '6px',
                            padding: '3px 9px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#fff',
                            background: '#6d28d9',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            alignSelf: 'flex-start',
                          }}
                        >
                          View Policy
                        </button>
                      )}
                    </span>
                    {!item.read && <i className="notification-unread-dot" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {open && (
        <div className="profile-menu" ref={profileMenuRef}>
          <div className="profile-menu-header">
            <div className="profile-menu-user-info">
              <strong>{currentUser.name}</strong>
              <small>{currentUser.designation}</small>
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate('/dashboard_emp/profile');
            }}
          >
            <UserRound size={17} /> My Profile
          </button>
          <button className="logout-item" onClick={logout}>
            <LogOut size={17} /> Logout
          </button>
        </div>
      )}
    </header>
  );
}
