import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, User, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { ThemeProvider } from '../context/ThemeContext';
import '../styles.css';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const isHome = currentPath === '/dashboard_emp' || currentPath === '/dashboard_emp/';
  const isAttendance = currentPath.includes('/attendance');
  const isProfile = currentPath.includes('/profile');

  return (
    <ThemeProvider>
      <div className="employee-portal-root app-shell">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
        <div className={`app-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
          <Header onMenu={() => setMobileOpen(true)} />
          <main className="page-content">
            <Outlet />
          </main>

          {/* Exact Mobile Bottom Navigation (Reference Phones 1 & 5) */}
          <nav className="mob-bottom-nav" aria-label="Mobile Navigation">
            <button
              type="button"
              className={`mob-bottom-nav-item ${isHome ? 'active' : ''}`}
              onClick={() => navigate('/dashboard_emp')}
            >
              <Home size={18} />
              <span>Home</span>
            </button>
            <button
              type="button"
              className={`mob-bottom-nav-item ${isAttendance ? 'active' : ''}`}
              onClick={() => navigate('/dashboard_emp/attendance/records')}
            >
              <Calendar size={18} />
              <span>Attendance</span>
            </button>
            <button
              type="button"
              className={`mob-bottom-nav-item ${isProfile ? 'active' : ''}`}
              onClick={() => navigate('/dashboard_emp/profile')}
            >
              <User size={18} />
              <span>Profile</span>
            </button>
            <button
              type="button"
              className="mob-bottom-nav-item"
              onClick={() => setMobileOpen(true)}
              aria-label="More Navigation Options"
            >
              <Menu size={18} />
              <span>More</span>
            </button>
          </nav>
        </div>
      </div>
    </ThemeProvider>
  );
}
