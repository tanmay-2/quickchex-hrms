import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { ThemeProvider } from '../context/ThemeContext';
import '../styles.css';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
        </div>
      </div>
    </ThemeProvider>
  );
}
