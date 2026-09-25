import React, { useEffect, useRef, useState } from 'react';
import { Bell, Menu, Moon, Sun, LogOut, UserRound, ChevronDown, CheckCheck, CalendarDays, Clock3, FileText, Megaphone, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { employee } from '../data';
import api from '../api';
import { getEmployeeDisplayName, getInitials } from '../../../utils/employeeDisplay';

const DEFAULT_NOTIFICATIONS = [];

const iconMap = { leave:CalendarDays, attendance:Clock3, regularization:FileText, payroll:FileText, announcement:Megaphone };

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

    return {
      name: finalName,
      designation: finalDesignation,
      initials: finalInitials,
    };
  } catch {}
  return {
    name: 'Employee',
    designation: 'Employee',
    initials: 'EM',
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
  const displayTitle = title || getPageTitle(location.pathname);
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getUserFromStorage);
  const currentRole = (localStorage.getItem('role') || '').trim().toLowerCase();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

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
        const updated = { name, designation, initials };
        setCurrentUser(updated);
        try {
          const prev = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...prev, ...data, ...updated }));
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
          setCurrentUser({ name, designation, initials });
          try {
            const prev = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...prev, ...emp, name, designation, initials }));
          } catch {}
        }
      }).catch(() => {});
    });

    api.getAnnouncements().then((data) => {
      if (mounted && Array.isArray(data) && data.length > 0) {
        setNotifications(data.map((d) => ({
          id: d.id,
          title: d.title,
          message: d.description || d.content,
          time: d.dateLabel || 'Recent',
          type: 'announcement',
          read: false,
        })));
      }
    }).catch(() => {});

    return () => {
      mounted = false;
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('user-profile-updated', handleUpdate);
    };
  }, []);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('hrms-notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const onPointer = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setNotificationsOpen(false);
    };
    const onKey = (event) => { if (event.key === 'Escape') { setOpen(false); setNotificationsOpen(false); } };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey); };
  }, []);

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  const unread = notifications.filter(n => !n.read).length;
  const markRead = (id) => setNotifications(items => items.map(n => n.id === id ? { ...n, read:true } : n));
  const markAllRead = () => setNotifications(items => items.map(n => ({ ...n, read:true })));

  return <header className="topbar">
    <button className="mobile-menu icon-btn" onClick={onMenu}><Menu size={21}/></button>
    <div className="topbar-title"><div className="eyebrow">EMPLOYEE PORTAL</div><div className="topbar-page">HRMS Dashboard</div></div>
    <div className="topbar-actions">
      <button className="icon-btn header-icon-btn" onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>{isDark ? <Sun size={19}/> : <Moon size={19}/>}</button>
      <div className="notification-wrap" ref={notificationRef}>
        <button className={`icon-btn header-icon-btn notification-btn ${notificationsOpen ? 'active' : ''}`} onClick={() => setNotificationsOpen(v => !v)} title="Notifications" aria-label="Notifications" aria-haspopup="dialog" aria-expanded={notificationsOpen}>
          <Bell size={19}/>{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
        </button>
        {notificationsOpen && <div className="notification-panel">
          <div className="notification-head"><div><strong>Notifications</strong><span>{unread ? `${unread} unread` : 'All caught up'}</span></div><button className="notification-close-mobile" onClick={() => setNotificationsOpen(false)}><X size={15}/></button></div>
          <div className="notification-actions"><span>Latest updates</span><button onClick={markAllRead} disabled={!unread}><CheckCheck size={14}/> Mark all as read</button></div>
          <div className="notification-list">
            {notifications.length === 0 ? <div className="notification-empty"><Bell size={26}/><strong>No notifications</strong><span>You’re all caught up.</span></div> : notifications.map(item => {
              const Icon = iconMap[item.type] || Bell;
              return <button key={item.id} className={`notification-item ${item.read ? 'read' : 'unread'}`} onClick={() => markRead(item.id)}>
                <span className="notification-item-icon"><Icon size={15}/></span>
                <span className="notification-item-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{item.time}</small></span>
                {!item.read && <i className="notification-unread-dot" />}
              </button>;
            })}
          </div>
        </div>}
      </div>
      <div className="profile-menu-wrap" ref={profileRef}>
        <button className="profile-trigger" onClick={()=>setOpen(v=>!v)}>
          <span className="avatar avatar-sm">{currentUser.initials || (currentUser.name ? currentUser.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'EM')}</span>
          <span className="profile-trigger-text"><strong>{currentUser.name}</strong><small>{currentUser.designation}</small></span>
          <ChevronDown size={16}/>
        </button>
        {open && <div className="profile-menu">
          <button onClick={()=>{setOpen(false);navigate('/dashboard_emp/profile')}}><UserRound size={17}/> My Profile</button>
          <button onClick={()=>{setOpen(false);toggleTheme()}}>{isDark?<Sun size={17}/>:<Moon size={17}/>} {isDark?'Light Mode':'Dark Mode'}</button>
          <button className="logout-item" onClick={logout}><LogOut size={17}/> Logout</button>
        </div>}
      </div>
      <button className="logout-btn" onClick={logout}><LogOut size={17}/><span>Logout</span></button>
    </div>
  </header>;
}
