import React, { useEffect, useState, useCallback } from 'react';
import { CalendarCheck2, Clock3, Plane, WalletCards, ArrowUpRight, FileText, ChevronRight, X, MapPin, Mail, Phone, User } from 'lucide-react';
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

  // Trust backend authoritative statuses directly
  if (['Present', 'Half Day', 'Absent', 'Rejected', 'Punched In', 'In Progress', 'Missing Punch', 'On Leave', 'Holiday', 'Week Off', 'Weekly Off', 'Permission'].includes(rawStatus)) {
    return rawStatus;
  }
  if (rawStatus.toLowerCase() === 'punched in' || rawStatus.toLowerCase() === 'punched-in' || rawStatus.toLowerCase() === 'in progress') {
    return 'Punched In';
  }

  const checkIn = r.checkIn || r.check_in;
  const checkOut = r.checkOut || r.check_out;

  const hasIn = Boolean(checkIn && checkIn !== '—' && checkIn !== '-' && checkIn !== '--');
  const hasOut = Boolean(checkOut && checkOut !== '—' && checkOut !== '-' && checkOut !== '--');

  // Active punch-in (checked in but not yet out)
  if (hasIn && !hasOut) {
    return 'Punched In';
  }

  if (!hasIn && !hasOut) {
    return rawStatus && rawStatus.toLowerCase() !== 'completed' ? rawStatus : 'Absent';
  }

  // Both punch-in and punch-out present — determine status from hours using 9h / 5h rule
  const hours = parseWorkingHours(r.hours, checkIn, checkOut);

  if (hours !== null && !isNaN(hours)) {
    const totalMinutes = Math.round(hours * 60);
    if (totalMinutes >= 540) {
      return 'Present';
    } else if (totalMinutes >= 300) {
      return 'Half Day';
    } else {
      return 'Absent';
    }
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
          <div className="table-wrap">
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

      {/* Attendance Detail Drawer (Test 7) */}
      {detailRecord && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center',
            padding: '20px', background: 'rgba(12,12,20,.52)', backdropFilter: 'blur(4px)',
          }}
          onMouseDown={() => setDetailRecord(null)}
        >
          <div
            style={{
              width: 'min(560px, 100%)', background: 'var(--surface)', borderRadius: '18px',
              border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(31,24,69,.2)',
              overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.1em', color: 'var(--primary)', textTransform: 'uppercase' }}>Attendance Record Details</span>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'Poppins', fontSize: '17px', color: 'var(--text)' }}>{detailRecord.date}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailRecord(null)}
                style={{ width: '34px', height: '34px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', flexShrink: 0 }}
                aria-label="Close detail"
              >
                <X size={16} />
              </button>
            </div>

            {/* Employee Info */}
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary-100)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <User size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{detailRecord.employee_name || detailRecord.name || emp?.name || '—'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{detailRecord.emp_code || emp?.employeeId || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(detailRecord.email || emp?.email) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--muted)' }}>
                    <Mail size={12} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detailRecord.email || emp?.email}</span>
                  </div>
                )}
                {(detailRecord.contact || emp?.phone) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--muted)' }}>
                    <Phone size={12} />
                    <span>{detailRecord.contact || emp?.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Punch Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)' }}>
              {/* Punch In */}
              <div style={{ padding: '16px 20px', background: 'var(--surface)' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.08em', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Punch In</div>
                <div style={{ fontSize: '20px', fontFamily: 'Poppins', fontWeight: 700, color: 'var(--text)' }}>{detailRecord.checkIn || detailRecord.check_in || '—'}</div>
                {(detailRecord.punch_in_location || detailRecord.location) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginTop: '8px', color: 'var(--muted)', fontSize: '11px' }}>
                    <MapPin size={11} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ lineHeight: 1.4, wordBreak: 'break-word' }}>{detailRecord.punch_in_location || detailRecord.location}</span>
                  </div>
                )}
                {(detailRecord.punch_in_latitude || detailRecord.latitude) && (
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px', fontFamily: 'monospace' }}>
                    {Number(detailRecord.punch_in_latitude || detailRecord.latitude).toFixed(5)}, {Number(detailRecord.punch_in_longitude || detailRecord.longitude).toFixed(5)}
                    {(detailRecord.punch_in_accuracy || detailRecord.accuracy) && (
                      <span style={{ marginLeft: '4px', color: 'var(--success)' }}>±{Math.round(detailRecord.punch_in_accuracy || detailRecord.accuracy)}m</span>
                    )}
                  </div>
                )}
              </div>

              {/* Punch Out */}
              <div style={{ padding: '16px 20px', background: 'var(--surface)' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.08em', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>Punch Out</div>
                <div style={{ fontSize: '20px', fontFamily: 'Poppins', fontWeight: 700, color: 'var(--text)' }}>{detailRecord.checkOut || detailRecord.check_out || '—'}</div>
                {detailRecord.punch_out_location && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginTop: '8px', color: 'var(--muted)', fontSize: '11px' }}>
                    <MapPin size={11} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ lineHeight: 1.4, wordBreak: 'break-word' }}>{detailRecord.punch_out_location}</span>
                  </div>
                )}
                {detailRecord.punch_out_latitude && (
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px', fontFamily: 'monospace' }}>
                    {Number(detailRecord.punch_out_latitude).toFixed(5)}, {Number(detailRecord.punch_out_longitude).toFixed(5)}
                    {detailRecord.punch_out_accuracy && (
                      <span style={{ marginLeft: '4px', color: 'var(--success)' }}>±{Math.round(detailRecord.punch_out_accuracy)}m</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer: Hours + Status */}
            <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>TOTAL HOURS</span>
                <span style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{detailRecord.hours || '—'}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>STATUS</span>
                <span className={`status-badge ${getBadgeClass(resolveAttendanceStatus(detailRecord))}`}>
                  {resolveAttendanceStatus(detailRecord)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
