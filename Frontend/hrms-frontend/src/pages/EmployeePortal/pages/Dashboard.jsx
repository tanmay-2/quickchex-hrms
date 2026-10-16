import React, { useEffect, useState, useCallback } from 'react';
import { CalendarCheck2, Clock3, Plane, WalletCards, ArrowUpRight, FileText, ChevronRight, X, MapPin, Mail, Phone, User, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { employee as defaultEmployee, attendanceRows as defaultAttendance, leaveRows as defaultLeaves } from '../data';
import StatCard from '../components/StatCard';
import AttendancePunch from '../components/AttendancePunch';
import api from '../api';
import { getEmployeeDisplayName } from '../../../utils/employeeDisplay';

function isPastAttendanceDate(dateVal) {
  if (!dateVal || dateVal === '-' || dateVal === '—') return false;
  let targetYear, targetMonth, targetDay;

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    const textMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (textMatch) {
      const months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const mStr = textMatch[2].substring(0, 3).toLowerCase();
      if (months[mStr] !== undefined) {
        targetDay = parseInt(textMatch[1], 10);
        targetMonth = months[mStr];
        targetYear = parseInt(textMatch[3], 10);
      }
    }
    if (targetYear === undefined) {
      const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        targetYear = parseInt(isoMatch[1], 10);
        targetMonth = parseInt(isoMatch[2], 10) - 1;
        targetDay = parseInt(isoMatch[3], 10);
      }
    }
  }

  if (targetYear === undefined) {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const recordDay = new Date(targetYear, targetMonth, targetDay).getTime();

  return recordDay < todayStart;
}

function parseWorkingHours(hoursVal, checkInStr, checkOutStr) {
  if (hoursVal !== undefined && hoursVal !== null && hoursVal !== '—' && hoursVal !== '-' && hoursVal !== '') {
    if (typeof hoursVal === 'number') return hoursVal;
    const str = String(hoursVal).trim();

    const hmMatch = str.match(/^(?:(\d+)\s*h(?:rs?)?)?\s*(?:(\d+)\s*m(?:ins?)?)?$/i);
    if (hmMatch && (hmMatch[1] || hmMatch[2])) {
      const h = parseInt(hmMatch[1] || '0', 10);
      const m = parseInt(hmMatch[2] || '0', 10);
      return h + m / 60;
    }

    const floatVal = parseFloat(str);
    if (!isNaN(floatVal)) return floatVal;
  }

  if (checkInStr && checkOutStr && checkInStr !== '—' && checkOutStr !== '—' && checkOutStr !== '-' && checkInStr !== '-') {
    const parseTime = (t) => {
      const m = String(t).trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!m) return null;
      let hrs = parseInt(m[1], 10);
      const mins = parseInt(m[2], 10);
      const ampm = m[3] ? m[3].toUpperCase() : null;
      if (ampm === 'PM' && hrs < 12) hrs += 12;
      if (ampm === 'AM' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };
    const inMins = parseTime(checkInStr);
    const outMins = parseTime(checkOutStr);
    if (inMins !== null && outMins !== null && outMins >= inMins) {
      return (outMins - inMins) / 60;
    }
  }

  return null;
}

function resolveAttendanceStatus(r) {
  const rawStatus = (r.status || r.attendance_status || '').trim();

  // Trust non-working authoritative statuses directly
  if (
    ['Rejected', 'On Leave', 'Holiday', 'Week Off', 'Weekly Off', 'Permission'].includes(rawStatus) ||
    rawStatus.includes('Leave') ||
    r.isHoliday ||
    r.isWeeklyOff
  ) {
    return rawStatus || (r.isHoliday ? 'Holiday' : r.isWeeklyOff ? 'Weekly Off' : 'On Leave');
  }

  const checkIn = r.checkIn || r.check_in;
  const checkOut = r.checkOut || r.check_out;

  const hasIn = Boolean(checkIn && checkIn !== '—' && checkIn !== '-' && checkIn !== '--');
  const hasOut = Boolean(checkOut && checkOut !== '—' && checkOut !== '-' && checkOut !== '--');

  // Employee Portal 9-Hour Rule:
  // Active punch-in: shown as Invalid unless and until 9 hours have elapsed
  if (hasIn && !hasOut) {
    const parseTime = (t) => {
      const m = String(t).trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!m) return null;
      let hrs = parseInt(m[1], 10);
      const mins = parseInt(m[2], 10);
      const ampm = m[3] ? m[3].toUpperCase() : null;
      if (ampm === 'PM' && hrs < 12) hrs += 12;
      if (ampm === 'AM' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };
    const inMins = parseTime(checkIn);
    if (inMins !== null) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      if (currentMins >= inMins && (currentMins - inMins) >= 540) {
        return 'Present';
      }
    }
    return 'Invalid';
  }

  if (!hasIn && !hasOut) {
    return rawStatus && rawStatus.toLowerCase() !== 'completed' ? rawStatus : 'Absent';
  }

  // Both punch-in and punch-out present — determine status from hours using 9h rule
  const hours = parseWorkingHours(r.hours, checkIn, checkOut);

  if (hours !== null && !isNaN(hours)) {
    const totalMinutes = Math.round(hours * 60);
    if (totalMinutes >= 540) {
      return 'Present';
    }
    return 'Invalid';
  }

  return rawStatus && rawStatus.toLowerCase() !== 'completed' ? rawStatus : 'Absent';
}

function getBadgeClass(status) {
  if (!status) return 'danger';
  const s = String(status).toLowerCase();
  if (s === 'invalid') return 'invalid';
  if (s === 'present' || s === 'approved' || s === 'available') return 'success';
  if (s === 'punched in' || s === 'punched-in' || s === 'in progress') return 'active';
  if (s === 'absent' || s === 'rejected') return 'danger';
  if (s.includes('half')) return 'warning';
  if (s.includes('leave') || s.includes('holiday')) return 'pending';
  return 'warning';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [emp, setEmp] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      const email = localStorage.getItem('loginEmail');
      const empCode = localStorage.getItem('emp_code');
      const desig = localStorage.getItem('designation');
      const userName = localStorage.getItem('user_name');
      let base = { ...defaultEmployee };
      if (stored) {
        const u = JSON.parse(stored);
        base = { ...base, ...u };
      }
      const resolvedName = getEmployeeDisplayName(base.name ? base : (userName || email || empCode || defaultEmployee.name));
      return {
        ...base,
        name: resolvedName !== 'Unknown employee' ? resolvedName : 'Employee',
        employeeId: base.emp_code || base.employeeId || empCode || '—',
        designation: base.designation || desig || defaultEmployee.designation,
        department: base.department || defaultEmployee.department,
      };
    } catch {}
    return defaultEmployee;
  });
  const [stats, setStats] = useState({
    attendance: '0%',
    workingHours: '0h 00m',
    leaveBalance: '0 days',
    netSalary: '₹0',
  });
  const [attendance, setAttendance] = useState([]);
  const [detailRecord, setDetailRecord] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState({
    casual: { used: 0, total: 0 },
    sick: { used: 0, total: 0 },
    optional: { used: 0, total: 0 },
  });
  const [announcements, setAnnouncements] = useState([]);

  const loadDashboardData = useCallback(() => {
    api.getMyProfile()
      .then((p) => {
        if (p) {
          const cleanName = getEmployeeDisplayName(p);
          setEmp((prev) => ({
            ...prev,
            ...p,
            name: cleanName !== 'Unknown employee' ? cleanName : prev.name,
          }));
          try {
            const prevStored = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...prevStored, ...p, name: cleanName !== 'Unknown employee' ? cleanName : prevStored.name }));
            window.dispatchEvent(new Event('user-profile-updated'));
          } catch {}
        }
      })
      .catch(() => {});

    api.getDashboardSummary()
      .then((data) => {
        if (!data) return;
        if (data.employee) {
          const cleanName = getEmployeeDisplayName(data.employee);
          setEmp((prev) => ({
            ...prev,
            ...data.employee,
            name: cleanName !== 'Unknown employee' ? cleanName : prev.name,
          }));
          try {
            const prevStored = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...prevStored, ...data.employee, name: cleanName !== 'Unknown employee' ? cleanName : prevStored.name }));
            window.dispatchEvent(new Event('user-profile-updated'));
          } catch {}
        }
        if (data.stats) setStats((prev) => ({ ...prev, ...data.stats }));
        if (Array.isArray(data.recentAttendance)) {
          setAttendance(data.recentAttendance);
          const d = new Date();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const todayStr1 = `${String(d.getDate()).padStart(2, '0')} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
          const todayStr2 = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
          const todayRec = data.recentAttendance.find((r) => r.date === todayStr1 || r.date === todayStr2);
          if (todayRec && todayRec.hours && todayRec.hours !== '—') {
            setStats((prev) => ({ ...prev, workingHours: todayRec.hours }));
          } else {
            setStats((prev) => ({ ...prev, workingHours: '0h 00m' }));
          }
        }
        if (Array.isArray(data.leaveRequests) && data.leaveRequests.length > 0) {
          setLeaves(data.leaveRequests);
        }
        if (data.leaveBalances) setBalances(data.leaveBalances);
        if (Array.isArray(data.announcements) && data.announcements.length > 0) {
          setAnnouncements(data.announcements);
        }
      })
      .catch((err) => {
        console.warn('Dashboard summary fetch failed:', err.message);
      });
  }, []);

  // Live clock — updates every second for real-time dynamic greeting & clock
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const getLocalDateKey = useCallback((d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Midnight day-change detector: reset punch state when the calendar date flips
  useEffect(() => {
    let currentDay = getLocalDateKey();
    const check = setInterval(() => {
      const newDay = getLocalDateKey();
      if (newDay !== currentDay) {
        currentDay = newDay;
        // Clear old punch state for previous day so check-in/out resets
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const empId = user.employeeId || user.employee_id || user.id || 'default';
          const key = `hrms-punch-state-v12-${empId}`;
          localStorage.removeItem(key);
        } catch {}
        loadDashboardData();
        window.dispatchEvent(new CustomEvent('new-day-started'));
      }
    }, 5000); // check every 5 seconds
    return () => clearInterval(check);
  }, [getLocalDateKey, loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(loadDashboardData, 4000);
    const handleFocus = () => loadDashboardData();
    const handleBalanceUpdate = () => loadDashboardData();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('leave-balance-updated', handleBalanceUpdate);
    window.addEventListener('leave-applied', handleBalanceUpdate);
    window.addEventListener('attendance-updated', handleBalanceUpdate);
    window.addEventListener('punch-updated', handleBalanceUpdate);
    window.addEventListener('regularization-updated', handleBalanceUpdate);
    window.addEventListener('storage', handleBalanceUpdate);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('leave-balance-updated', handleBalanceUpdate);
      window.removeEventListener('leave-applied', handleBalanceUpdate);
      window.removeEventListener('attendance-updated', handleBalanceUpdate);
      window.removeEventListener('punch-updated', handleBalanceUpdate);
      window.removeEventListener('regularization-updated', handleBalanceUpdate);
      window.removeEventListener('storage', handleBalanceUpdate);
    };
  }, [loadDashboardData]);

  // Dynamic greeting based on live clock hour
  const getGreeting = useCallback(() => {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
  }, [now]);

  // Emoji that matches the time of day
  const getGreetingEmoji = useCallback(() => {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return '🌅';
    if (hour >= 12 && hour < 17) return '☀️';
    if (hour >= 17 && hour < 21) return '🌆';
    return '🌙';
  }, [now]);

  const formattedLiveDate = React.useMemo(() => {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(now);
  }, [now]);

  const formatLeaveDates = (r) => {
    const fromStr = r.from || r.from_date || '';
    const toStr = r.to || r.to_date || '';
    const days = Number(r.days) || 1;
    const dayLabel = `${days} ${days === 1 ? 'day' : 'days'}`;

    if (!fromStr || fromStr === '—') return dayLabel;
    if (!toStr || toStr === '—' || fromStr === toStr) {
      return `${fromStr} · ${dayLabel}`;
    }

    const fParts = fromStr.trim().split(' ');
    const tParts = toStr.trim().split(' ');
    if (fParts.length === 3 && tParts.length === 3 && fParts[2] === tParts[2]) {
      return `${fParts[0]} ${fParts[1]} – ${tParts[0]} ${tParts[1]} ${tParts[2]} · ${dayLabel}`;
    }
    return `${fromStr} – ${toStr} · ${dayLabel}`;
  };

  const displayName = React.useMemo(() => {
    // 1. Full name from employee profile object
    if (emp) {
      const fn = (emp.first_name || emp.firstName || '').trim();
      const ln = (emp.last_name || emp.lastName || '').trim();
      if (fn && ln && !fn.includes('@') && !ln.includes('@')) {
        return `${fn} ${ln}`;
      }
      if (fn && !fn.includes('@')) return fn;
      const nm = (emp.name || emp.fullName || emp.full_name || '').trim();
      if (nm && !nm.includes('@') && nm.toLowerCase() !== 'employee') {
        return nm;
      }
    }

    // 2. From stored user in localStorage
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        const fn = (parsed.first_name || parsed.firstName || '').trim();
        const ln = (parsed.last_name || parsed.lastName || '').trim();
        if (fn && ln && !fn.includes('@') && !ln.includes('@')) {
          return `${fn} ${ln}`;
        }
        if (fn && !fn.includes('@')) return fn;
        const nm = (parsed.name || parsed.fullName || parsed.full_name || '').trim();
        if (nm && !nm.includes('@') && nm.toLowerCase() !== 'employee') {
          return nm;
        }
      }
    } catch {}

    const userName = localStorage.getItem('user_name');
    if (userName && !userName.includes('@') && userName.toLowerCase() !== 'employee') {
      return userName.trim();
    }

    return 'Employee';
  }, [emp]);

  const empCodeDisplay = emp?.emp_code || emp?.employee_id || emp?.id || localStorage.getItem('emp_code') || '';

  const contactDisplay = React.useMemo(() => {
    const raw = emp?.phone || emp?.contact_number || emp?.mobile || localStorage.getItem('phone') || '';
    if (!raw || raw === '—' || raw === 'None' || raw === 'null') return 'Contact not available';
    const clean = String(raw).trim();
    if (!clean) return 'Contact not available';
    if (clean.startsWith('+')) return clean;
    const digits = clean.replace(/\D/g, '');
    if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    return clean;
  }, [emp]);

  return (
    <div>
      <section className="welcome-row">
        <div>
          <div className="live-time-indicator">
            <span className="live-dot" />
            <span className="live-clock-text">{formattedLiveDate}</span>
          </div>
          <h1>{getGreeting()}, {displayName}</h1>
          <p className="muted">Here’s your live work snapshot synced with the database.</p>
        </div>
        <button className="primary-btn" onClick={() => navigate('/dashboard_emp/attendance/records')}>
          Attendance Records <ArrowUpRight size={16} />
        </button>
      </section>

      {/* Dynamic Authenticated Employee Profile Strip */}
      <section className="emp-dash-info-card">
        <div className="emp-dash-info-left">
          <div className="emp-dash-name-block">
            <span className="emp-dash-subhead">EMPLOYEE NAME</span>
            <h3 className="emp-dash-name-title">{displayName}</h3>
            <div className="emp-dash-tag-row">
              {empCodeDisplay && <span className="emp-dash-chip">ID: {empCodeDisplay}</span>}
              {emp.department && <span className="emp-dash-chip">{emp.department}</span>}
              {emp.designation && <span className="emp-dash-chip">{emp.designation}</span>}
            </div>
          </div>
        </div>
        <div className="emp-dash-info-right">
          <div className="emp-dash-contact-item">
            <span className="emp-dash-subhead">CONTACT</span>
            <div className="emp-dash-contact-row">
              <Phone size={14} className="emp-dash-icon" />
              <strong className="emp-dash-contact-val">{contactDisplay}</strong>
            </div>
          </div>
          {emp.email && (
            <div className="emp-dash-contact-item">
              <span className="emp-dash-subhead">EMAIL</span>
              <div className="emp-dash-contact-row">
                <Mail size={14} className="emp-dash-icon" />
                <span className="emp-dash-email-val">{emp.email}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="stats-grid">
        <StatCard icon={CalendarCheck2} label="Attendance" value={stats.attendance} helper="This month" />
        <StatCard icon={Clock3} label="Working hours" value={stats.workingHours} helper="Today" tone="blue" />
        <StatCard icon={Plane} label="Leave balance" value={stats.leaveBalance} helper="Available" tone="green" />
        <StatCard icon={WalletCards} label="Net salary" value={stats.netSalary} helper="Current month" tone="amber" />
      </section>

      <section className="dashboard-grid top-grid">
        <div className="card attendance-card attendance-card-unified">
          <AttendancePunch compact onPunchSuccess={loadDashboardData} />
        </div>
        <div className="card quick-card">
          <div className="card-header">
            <div>
              <h2>Quick access</h2>
              <p>Most used employee actions</p>
            </div>
            <button className="text-btn" onClick={() => navigate('/dashboard_emp/leave/applications')}>Apply leave</button>
          </div>
          <div className="quick-grid">
            <button className="quick-item" onClick={() => navigate('/dashboard_emp/attendance/regularization')}>
              <div className="quick-item-icon"><Clock3 size={16} /></div>
              <span>Regularization</span>
              <ChevronRight size={14} />
            </button>
            <button className="quick-item" onClick={() => navigate('/dashboard_emp/leave/applications')}>
              <div className="quick-item-icon"><Plane size={16} /></div>
              <span>Leave apply</span>
              <ChevronRight size={14} />
            </button>
            <button className="quick-item" onClick={() => navigate('/dashboard_emp/payslips')}>
              <div className="quick-item-icon"><WalletCards size={16} /></div>
              <span>Payslips</span>
              <ChevronRight size={14} />
            </button>
            <button className="quick-item" onClick={() => navigate('/dashboard_emp/policies')}>
              <div className="quick-item-icon"><FileText size={16} /></div>
              <span>Policies</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      <section className="dashboard-grid lower-grid">
        <div className="card recent-attendance-card">
          <div className="card-header">
            <div>
              <h2>Recent attendance</h2>
              <p>Latest check-in and check-out records</p>
            </div>
            <button className="text-btn" onClick={() => navigate('/dashboard_emp/attendance/records')}>View all</button>
          </div>
          {/* Desktop Table View */}
          <div className="table-wrap recent-att-desktop">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check in</th>
                  <th>Check out</th>
                  <th>Hours</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!attendance || attendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px 12px', color: 'var(--muted)', fontSize: '12px' }}>
                      No recent attendance records found
                    </td>
                  </tr>
                ) : (
                  attendance.map((r, idx) => {
                    const dynamicStatus = resolveAttendanceStatus(r);
                    const loc = r.location || r.punch_in_location || r.punch_out_location || '—';
                    return (
                      <tr
                        key={idx}
                        onClick={() => setDetailRecord(r)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view details"
                      >
                        <td>{r.date}</td>
                        <td>{r.checkIn || r.check_in || '—'}</td>
                        <td>{r.checkOut || r.check_out || '—'}</td>
                        <td>{r.hours || '—'}</td>
                        <td title={loc} style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11.5px', color: 'var(--text-sub)' }}>
                          {loc}
                        </td>
                        <td>
                          <span className={`status-badge ${getBadgeClass(dynamicStatus)}`}>
                            {dynamicStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards View (Requirement 21) */}
          <div className="recent-att-mobile-cards">
            {!attendance || attendance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--muted)', fontSize: '13px' }}>
                No recent attendance records found
              </div>
            ) : (
              attendance.map((r, idx) => {
                const dynamicStatus = resolveAttendanceStatus(r);
                const loc = r.location || r.punch_in_location || r.punch_out_location || '—';
                return (
                  <div
                    key={idx}
                    className="recent-att-card-item"
                    onClick={() => setDetailRecord(r)}
                  >
                    <div className="recent-att-card-head">
                      <strong className="recent-att-card-date">{r.date}</strong>
                      <span className={`status-badge ${getBadgeClass(dynamicStatus)}`}>
                        {dynamicStatus}
                      </span>
                    </div>
                    <div className="recent-att-card-grid">
                      <div className="recent-att-grid-col">
                        <span className="recent-att-col-lbl">Check In</span>
                        <strong className="recent-att-col-val">{r.checkIn || r.check_in || '—'}</strong>
                      </div>
                      <div className="recent-att-grid-col">
                        <span className="recent-att-col-lbl">Check Out</span>
                        <strong className="recent-att-col-val">{r.checkOut || r.check_out || '—'}</strong>
                      </div>
                      <div className="recent-att-grid-col">
                        <span className="recent-att-col-lbl">Hours</span>
                        <strong className="recent-att-col-val">{r.hours || '—'}</strong>
                      </div>
                    </div>
                    <div className="recent-att-card-loc">
                      <MapPin size={13} className="recent-att-loc-ico" />
                      <span className="recent-att-loc-txt" title={loc}>{loc}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="card leave-requests-card">
          <div className="card-header">
            <div>
              <h2>Leave requests</h2>
              <p>Your latest requests</p>
            </div>
            <button className="text-btn" onClick={() => navigate('/dashboard_emp/leave/applications')}>View all</button>
          </div>
          <div className="request-list">
            {!leaves || leaves.length === 0 ? (
              <div className="request-empty">
                <Plane size={20} />
                <p>No recent leave requests</p>
              </div>
            ) : (
              leaves.slice(0, 5).map((r, idx) => (
                <div className="request-item" key={idx}>
                  <div className="request-icon"><Plane size={16} /></div>
                  <div className="request-details">
                    <strong>{r.type}</strong>
                    <span title={formatLeaveDates(r)}>{formatLeaveDates(r)}</span>
                  </div>
                  <span className={`status-badge ${
                    r.status === 'Approved' ? 'success' :
                    r.status === 'Pending' ? 'warning pending' : 'danger'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-grid lower-grid">
        <div className="card announcements">
          <div className="card-header">
            <div>
              <h2>Announcements</h2>
              <p>Latest company updates</p>
            </div>
            <FileText size={19} />
          </div>
          {announcements.map((a, idx) => (
            <div className="announcement" key={idx}>
              <div className="announcement-mark">{a.badgeLetter || a.badge_letter || 'A'}</div>
              <div>
                <strong>{a.title}</strong>
                <p>{a.description}</p>
                <small>{a.dateLabel || a.date_label || 'Today'}</small>
              </div>
            </div>
          ))}
        </div>
        <div className="card balance-card">
          <div className="card-header">
            <div>
              <h2>Leave balance</h2>
              <p>Current entitlement</p>
            </div>
            <Plane size={19} />
          </div>
          <div className="balance-row">
            <span>Casual leave</span>
            <strong>{balances.casual?.available ?? 0} / {balances.casual?.total ?? 0} remaining</strong>
          </div>
          <div className="progress">
            <span style={{ width: `${(balances.casual?.total || 0) > 0 ? Math.max(0, Math.min(100, Math.round(((balances.casual?.available || 0) / balances.casual.total) * 100))) : 0}%` }} />
          </div>
          <div className="balance-row">
            <span>Sick leave</span>
            <strong>{balances.sick?.available ?? 0} / {balances.sick?.total ?? 0} remaining</strong>
          </div>
          <div className="progress">
            <span style={{ width: `${(balances.sick?.total || 0) > 0 ? Math.max(0, Math.min(100, Math.round(((balances.sick?.available || 0) / balances.sick.total) * 100))) : 0}%` }} />
          </div>
          <div className="balance-row">
            <span>Optional holiday</span>
            <strong>{balances.optional?.available ?? 0} / {balances.optional?.total ?? 0} remaining</strong>
          </div>
          <div className="progress">
            <span style={{ width: `${(balances.optional?.total || 0) > 0 ? Math.max(0, Math.min(100, Math.round(((balances.optional?.available || 0) / balances.optional.total) * 100))) : 0}%` }} />
          </div>
        </div>
      </section>

      {/* Daily Logs Modal (matching attached reference) */}
      {detailRecord && (
        <div 
          className="att-daily-logs-backdrop" 
          onClick={() => setDetailRecord(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
        >
          <div 
            className="att-daily-logs-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid #F1E5DF'
            }}
          >
            {/* Peach Header */}
            <div 
              style={{
                backgroundColor: '#FFE9DE',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F5D5C6'
              }}
            >
              <h3 
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#1E293B',
                  letterSpacing: '-0.01em',
                  flex: 1,
                  textAlign: 'center',
                  fontFamily: 'inherit'
                }}
              >
                Daily Logs
              </h3>
              <button 
                type="button" 
                onClick={() => setDetailRecord(null)}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}
              >
                <X size={20} strokeWidth={2.4} />
              </button>
            </div>

            {/* Sub-header: Date & Shift-time */}
            <div 
              style={{
                padding: '14px 18px 10px',
                borderBottom: '1px solid #F1F5F9'
              }}
            >
              <div 
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '4px'
                }}
              >
                {detailRecord.date || detailRecord.formattedDate}
              </div>
              <div 
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#64748B'
                }}
              >
                Shift-time: {detailRecord.shift_time || detailRecord.shift || detailRecord.timing || '09:30 AM-06:30 PM'}
              </div>
            </div>

            {/* Table Header: Time | Location | Type */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: '75px 1fr 50px',
                padding: '10px 18px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#64748B',
                borderBottom: '1px solid #F1F5F9',
                backgroundColor: '#FAFAFA'
              }}
            >
              <div>Time</div>
              <div>Location</div>
              <div style={{ textAlign: 'center' }}>Type</div>
            </div>

            {/* Rows / Punch logs */}
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {(() => {
                const logs = [];
                const checkIn = detailRecord.checkIn || detailRecord.check_in;
                const checkOut = detailRecord.checkOut || detailRecord.check_out;
                const inLoc = detailRecord.punch_in_location || detailRecord.location || 'Office';
                const outLoc = detailRecord.punch_out_location || detailRecord.location || 'Office';

                // Check Out row
                if (checkOut && checkOut !== '—' && checkOut !== '-') {
                  logs.push({
                    key: 'out',
                    time: checkOut,
                    location: outLoc,
                    type: 'mobile',
                    isOut: true,
                  });
                }

                // Check In row
                if (checkIn && checkIn !== '—' && checkIn !== '-') {
                  logs.push({
                    key: 'in',
                    time: checkIn,
                    location: inLoc,
                    type: 'mobile',
                    isIn: true,
                  });
                }

                if (logs.length === 0) {
                  return (
                    <div style={{ padding: '36px 18px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                      {detailRecord.isHoliday 
                        ? `Holiday (${detailRecord.holidayName || 'Holiday'})`
                        : detailRecord.isWeeklyOff 
                        ? 'Weekly Off' 
                        : detailRecord.status?.includes('Leave')
                        ? detailRecord.status
                        : 'No punch logs recorded for this date.'}
                    </div>
                  );
                }

                return logs.map((log) => (
                  <div 
                    key={log.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '75px 1fr 50px',
                      alignItems: 'center',
                      padding: '14px 18px',
                      borderBottom: '1px solid #F1F5F9',
                      gap: '8px'
                    }}
                  >
                    <div 
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#334155',
                        lineHeight: 1.2
                      }}
                    >
                      {log.time}
                    </div>
                    <div 
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#0284C7',
                        lineHeight: 1.4,
                        wordBreak: 'break-word'
                      }}
                    >
                      {log.location}
                    </div>
                    <div 
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        color: '#94A3B8'
                      }}
                    >
                      <Smartphone size={20} strokeWidth={2} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
