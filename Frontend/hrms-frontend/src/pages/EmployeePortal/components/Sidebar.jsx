import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UsersRound,
  Clock3,
  ClipboardPenLine,
  Plane,
  CalendarDays,
  FileClock,
  WalletCards,
  ReceiptIndianRupee,
  X,
  PanelLeft,
  ChevronDown,
} from 'lucide-react';
import logoAsset from '../assets/img/la-esfera-logo.png';
import fullLogoAsset from '../assets/img/laesfera_full_logo.png';

const sections = [
  {
    title: 'MAIN',
    items: [
      { to: '/dashboard_emp', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'ORGANISATION',
    items: [
      { to: '/dashboard_emp/employee-directory', label: 'Employee Directory', icon: UsersRound },
    ],
  },
  {
    title: 'ATTENDANCE',
    items: [
      {
        to: '/dashboard_emp/attendance/records',
        label: 'Attendance',
        icon: Clock3,
        children: [
          { to: '/dashboard_emp/attendance/records', label: 'Attendance Records', icon: FileClock },
          { to: '/dashboard_emp/attendance/regularization', label: 'Regularization', icon: ClipboardPenLine },
        ],
      },
    ],
  },
  {
    title: 'LEAVE',
    items: [
      {
        to: '/dashboard_emp/leave',
        label: 'Leave',
        icon: Plane,
        children: [
          { to: '/dashboard_emp/leave/applications', label: 'My Leave Applications', icon: ClipboardPenLine },
          { to: '/dashboard_emp/leave/balance', label: 'Leave Balance', icon: CalendarDays },
          { to: '/dashboard_emp/leave/comp-off', label: 'Comp-Off List', icon: Clock3 },
          { to: '/dashboard_emp/leave/holidays', label: 'Holiday List', icon: CalendarDays },
        ],
      },
    ],
  },
  {
    title: 'PAYROLL',
    items: [
      { to: '/dashboard_emp/payslips', label: 'Payslips', icon: ReceiptIndianRupee },
    ],
  },
];

function MenuItem({ item, onClose, collapsed }) {
  const location = useLocation();
  const hasChildren = Boolean(item.children?.length);
  const [open, setOpen] = useState(
    item.children?.some((child) => location.pathname === child.to) ||
      location.pathname === item.to,
  );

  useEffect(() => {
    if (item.children?.some((child) => location.pathname === child.to)) {
      setOpen(true);
    }
  }, [location.pathname, item.children]);

  const Icon = item.icon;
  const activeParent = item.to === '/dashboard_emp'
    ? location.pathname === item.to
    : (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`) || item.children?.some((child) => location.pathname === child.to));

  if (!hasChildren) {
    return (
      <NavLink
        to={item.to}
        onClick={onClose}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        title={item.label}
      >
        <Icon size={18} strokeWidth={1.9} />
        <span>{item.label}</span>
      </NavLink>
    );
  }

  return (
    <div className={`nav-group ${activeParent ? 'parent-active' : ''}`}>
      <div className={`nav-parent-row ${activeParent ? 'active' : ''}`}>
        <NavLink
          to={item.to}
          onClick={() => {
            setOpen((v) => !v);
            if (onClose) onClose();
          }}
          className="nav-parent-link"
          title={item.label}
        >
          <Icon size={18} strokeWidth={1.9} />
          <span>{item.label}</span>
        </NavLink>
        {!collapsed && (
          <button
            type="button"
            className="nav-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${item.label}`}
          >
            <ChevronDown size={15} className={open ? 'rotate-180' : ''} />
          </button>
        )}
      </div>
      {!collapsed && open && (
        <div className="nav-children">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onClose}
                className={({ isActive }) => `nav-link nav-link-child ${isActive ? 'active' : ''}`}
                title={child.label}
              >
                <ChildIcon size={15} strokeWidth={1.9} />
                <span>{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ mobileOpen, onClose, collapsed, onToggle }) {
  return (
    <>
      <div className={`ep-sidebar-backdrop ${mobileOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`ep-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand-row">
          {collapsed ? (
            <span className="brand-logo-frame brand-logo-frame-ep-sidebar" onClick={onToggle} style={{ cursor: 'pointer' }} title="Expand sidebar">
              <img className="brand-logo brand-logo-ep-sidebar" src={logoAsset} alt="LA ESFERA" />
            </span>
          ) : (
            <>
              <NavLink to="/dashboard_emp" title="LA ESFERA" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                <img
                  className="brand-full-logo-ep-sidebar"
                  src={fullLogoAsset}
                  alt="LA ESFERA"
                />
              </NavLink>
              <button className="icon-btn ep-sidebar-toggle desktop-only" onClick={onToggle} title="Collapse sidebar">
                <PanelLeft size={17} />
              </button>
            </>
          )}
          <button className="icon-btn mobile-close" onClick={onClose} title="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="ep-sidebar-nav">
          {sections.map((section) => (
            <div className="nav-section" key={section.title}>
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item) => (
                <MenuItem key={item.to} item={item} onClose={onClose} collapsed={collapsed} />
              ))}
              {section.title !== 'PAYROLL' && <div className="section-gap" />}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
