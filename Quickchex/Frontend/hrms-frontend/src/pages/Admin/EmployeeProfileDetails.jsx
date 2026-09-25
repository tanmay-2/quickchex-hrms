import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, Building2, UserCheck,
  Clock, ShieldAlert, Award, FileText, CheckCircle2, AlertCircle, XCircle,
  Clock3, Edit3, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { getEmployeeDisplayName, getInitials } from '../../utils/employeeDisplay';
import './EmployeeProfileDetails.css';

const API_BASE = 'http://localhost:8000';

export default function EmployeeProfileDetails() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employee, setEmployee] = useState(() => {
    return location.state?.employee || null;
  });

  // Attendance & Leaves State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [compOffs, setCompOffs] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Fetch Employee Profile & Related Data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!employee) setLoading(true);
      setError(null);

      try {
        let matchedEmp = location.state?.employee || null;
        const targetId = String(employeeId || '').trim();

        // 1. Try direct profile API endpoint
        if (targetId) {
          try {
            const profileRes = await fetch(`${API_BASE}/profile/${encodeURIComponent(targetId)}`);
            if (profileRes.ok) {
              const data = await profileRes.json();
              if (data && (data.emp_code || data.id)) {
                matchedEmp = data;
              }
            }
          } catch (e) {
            console.warn('Direct profile API call failed:', e);
          }
        }

        // 2. If not matched, query employees directory list
        if (!matchedEmp && targetId) {
          try {
            const listRes = await fetch(`${API_BASE}/profile/employees/`);
            if (listRes.ok) {
              const listData = await listRes.json();
              if (Array.isArray(listData)) {
                matchedEmp = listData.find((emp) => {
                  const empCode = String(emp.emp_code || emp.id || '').toLowerCase();
                  const empId = String(emp.id || '').toLowerCase();
                  const searchId = targetId.toLowerCase();
                  return empCode === searchId || empId === searchId;
                });
              }
            }
          } catch (e) {
            console.warn('Employees list fetch failed:', e);
          }
        }

        if (isMounted) {
          if (matchedEmp) {
            setEmployee(matchedEmp);
            setEditFormData(matchedEmp);
          } else if (!employee) {
            setError('Employee record not found');
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching employee details:', err);
          if (!employee) setError('Unable to load employee information');
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [employeeId, location.state]);

  // Fetch Employee Leaves & Regularizations
  useEffect(() => {
    if (!employee) return;
    const empCode = employee.emp_code || employee.id || employeeId;

    // Fetch leaves
    fetch(`${API_BASE}/api/v1/leave/all`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const filtered = data.filter(
            (l) => String(l.emp_code || l.employee_id).toLowerCase() === String(empCode).toLowerCase()
          );
          setLeaveRequests(filtered);
        }
      })
      .catch(() => { });

    // Fetch regularizations
    fetch(`${API_BASE}/api/v1/regularization/admin/all`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const filtered = data.filter(
            (r) => String(r.emp_code || r.employee_id).toLowerCase() === String(empCode).toLowerCase()
          );
          setRegularizations(filtered);
        }
      })
      .catch(() => { });
  }, [employee, employeeId]);

  // Handle Back Navigation
  const handleBack = () => {
    if (location.pathname.startsWith('/dashboard_emp')) {
      navigate('/dashboard_emp/employee-directory');
    } else {
      navigate('/dashboard/employees');
    }
  };

  // Derived normalized fields
  const cleanDisplayName = useMemo(() => {
    if (!employee) return 'Employee';
    const fn = (employee.first_name || '').trim();
    const ln = (employee.last_name || '').trim();
    const combined = `${fn} ${ln}`.trim();
    if (combined && combined !== employee.emp_code && !combined.includes('@')) return combined;
    if (employee.name && !employee.name.includes('@') && employee.name.toLowerCase() !== 'employee' && employee.name !== employee.emp_code) {
      return employee.name.trim();
    }
    if (employee.email && employee.email.includes('@')) {
      const local = employee.email.split('@')[0];
      return local.replace(/[._\-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return employee.emp_code || 'Employee';
  }, [employee]);

  const rawRole = (employee?.role || employee?.designation || 'Employee').toLowerCase();
  const formattedRole = useMemo(() => {
    if (rawRole.includes('admin')) return 'Admin';
    if (rawRole.includes('manager')) return 'Manager';
    if (rawRole.includes('team') || rawRole.includes('tl')) return 'Team Leader';
    return 'Employee';
  }, [rawRole]);

  const statusStr = (employee?.status || employee?.employment_status || 'Active').trim();
  const statusClass = useMemo(() => {
    const s = statusStr.toLowerCase();
    if (s.includes('active')) return 'epd-status-active';
    if (s.includes('notice')) return 'epd-status-notice';
    if (s.includes('terminate')) return 'epd-status-terminated';
    if (s.includes('inactive')) return 'epd-status-inactive';
    return 'epd-status-active';
  }, [statusStr]);

  const empCodeDisplay = employee?.emp_code || employee?.id || employeeId || '—';
  const locationDisplay = employee?.location || employee?.branch_location || 'Mumbai, India';
  const departmentDisplay = employee?.department || 'Operations';
  const designationDisplay = employee?.designation || 'UI/UX Designer';
  const emailDisplay = employee?.email || `${String(empCodeDisplay).toLowerCase()}@laesfera.co`;
  const phoneDisplay = employee?.phone || employee?.mobile || employee?.mobile_no || '+91 91234 56789';
  const joiningDateDisplay = employee?.joined || employee?.joining_date || employee?.emp_join_date || '23 Sep 2026';
  const employmentTypeDisplay = employee?.type || employee?.employment_type || 'Full-time';

  const managerDisplay = useMemo(() => {
    if (employee?.reporting_supervisor) return employee.reporting_supervisor;
    if (formattedRole === 'Admin') return 'Not Assigned';
    return 'Payal';
  }, [employee, formattedRole]);

  // Loading View
  if (loading && !employee) {
    return (
      <div className="epd-container">
        <div className="epd-state-card">
          <div className="epd-spinner" />
          <h3>Loading employee information...</h3>
          <p style={{ color: '#64748b', fontSize: '13px' }}>Fetching records from database</p>
        </div>
      </div>
    );
  }

  // Error View / Not Found View
  if (error || !employee) {
    return (
      <div className="epd-container">
        <div className="epd-topbar">
          <button className="epd-back-btn" onClick={handleBack}>
            <ArrowLeft size={16} /> Back to Employee Directory
          </button>
        </div>
        <div className="epd-state-card">
          <AlertCircle size={44} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h3>Employee Not Found</h3>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 20px' }}>
            The employee record for ID <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{employeeId}</code> could not be found.
          </p>
          <button className="epd-edit-btn" onClick={handleBack}>
            Back to Employee Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="epd-container">
      {/* ── Top Bar ── */}
      <div className="epd-topbar">
        <button className="epd-back-btn" onClick={handleBack}>
          <ArrowLeft size={16} /> Back to Employee Directory
        </button>
        <button
          className="epd-edit-btn"
          onClick={() => {
            setEditFormData(employee);
            setIsEditModalOpen(true);
          }}
        >
          <Edit3 size={15} /> Edit Employee
        </button>
      </div>

      {/* ── Header Banner Card ── */}
      <div className="epd-header-card">
        <div className="epd-avatar">
          {getInitials(cleanDisplayName, emailDisplay)}
        </div>
        <div className="epd-header-info">
          <div className="epd-header-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <h1 className="epd-name" style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{cleanDisplayName}</h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Employee · {departmentDisplay} Department
            </p>
          </div>

          <div className="epd-meta-row" style={{ marginTop: '12px', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px' }}>
            <span className="epd-meta-item">
              Reporting Manager: <strong>{managerDisplay || '—'}</strong>
            </span>
            <span className="epd-meta-item">
              Email ID: <strong>{emailDisplay || '—'}</strong>
            </span>
            <span className="epd-meta-item">
              Contact: <strong>{phoneDisplay || '—'}</strong>
            </span>
            <span className="epd-meta-item">
              Employee Code: <strong>{empCodeDisplay || '—'}</strong>
            </span>
            <span className="epd-meta-item">
              Location: <strong>{locationDisplay || 'Mumbai, India'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs Header ── */}
      <div className="epd-tabs">
        <button
          className={`epd-tab ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`epd-tab ${activeTab === 'attendance' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance
        </button>
        <button
          className={`epd-tab ${activeTab === 'leave' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('leave')}
        >
          Leave
        </button>
        <button
          className={`epd-tab ${activeTab === 'regularization' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('regularization')}
        >
          Regularization
        </button>
        <button
          className={`epd-tab ${activeTab === 'compoff' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('compoff')}
        >
          Comp-Off
        </button>
        <button
          className={`epd-tab ${activeTab === 'applications' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          Applications
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div>
          <div className="epd-grid-2">
            {/* Personal Information */}
            <div className="epd-card">
              <div className="epd-card-title">
                <span>Personal Information</span>
                <UserCheck size={16} color="#7c3aed" />
              </div>
              <div className="epd-info-list">
                <div className="epd-info-item">
                  <span className="epd-info-label">Full Name</span>
                  <span className="epd-info-value">{cleanDisplayName}</span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Email Address</span>
                  <span className="epd-info-value">
                    <a href={`mailto:${emailDisplay}`}>{emailDisplay}</a>
                  </span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Contact Number</span>
                  <span className="epd-info-value">{phoneDisplay}</span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Location</span>
                  <span className="epd-info-value">{locationDisplay}</span>
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="epd-card">
              <div className="epd-card-title">
                <span>Employment Information</span>
                <Briefcase size={16} color="#7c3aed" />
              </div>
              <div className="epd-info-list">
                <div className="epd-info-item">
                  <span className="epd-info-label">Employee Code</span>
                  <span className="epd-info-value">{empCodeDisplay}</span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Role</span>
                  <span className="epd-info-value">{formattedRole}</span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Department</span>
                  <span className="epd-info-value">{departmentDisplay}</span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Designation</span>
                  <span className="epd-info-value">{designationDisplay}</span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Joining Date</span>
                  <span className="epd-info-value">{joiningDateDisplay}</span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Employment Type</span>
                  <span className="epd-info-value">{employmentTypeDisplay}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="epd-grid-2">
            {/* Work Information */}
            <div className="epd-card">
              <div className="epd-card-title">
                <span>Work Information</span>
                <Building2 size={16} color="#7c3aed" />
              </div>
              <div className="epd-info-list">
                <div className="epd-info-item">
                  <span className="epd-info-label">Work Location</span>
                  <span className="epd-info-value">{locationDisplay}</span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Department</span>
                  <span className="epd-info-value">{departmentDisplay}</span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Reporting Manager</span>
                  <span className="epd-info-value">{managerDisplay}</span>
                </div>
                <div className="epd-info-item">
                  <span className="epd-info-label">Employment Status</span>
                  <span className="epd-info-value">{statusStr}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ATTENDANCE ── */}
      {activeTab === 'attendance' && (
        <div>
          {/* Today's Punch Metrics */}
          <div className="epd-grid-4">
            <div className="epd-metric-card">
              <div className="epd-metric-icon purple"><Clock3 size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Punch In</span>
                <span className="epd-metric-val">09:54 AM</span>
              </div>
            </div>
            <div className="epd-metric-card">
              <div className="epd-metric-icon blue"><Clock size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Punch Out</span>
                <span className="epd-metric-val">—</span>
              </div>
            </div>
            <div className="epd-metric-card">
              <div className="epd-metric-icon green"><Award size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Working Hours</span>
                <span className="epd-metric-val">0h 00m</span>
              </div>
            </div>
            <div className="epd-metric-card">
              <div className="epd-metric-icon amber"><MapPin size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Location</span>
                <span className="epd-metric-val">Captured</span>
              </div>
            </div>
          </div>

          {/* Attendance Calendar Grid */}
          <div className="epd-card" style={{ marginBottom: 20 }}>
            <div className="epd-calendar-header">
              <span className="epd-calendar-month-title">September 2026 Attendance Calendar</span>
            </div>
            <div className="epd-calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="epd-cal-day-header">{d}</div>
              ))}
              {Array.from({ length: 30 }, (_, i) => {
                const day = i + 1;
                let statusCls = 'status-present';
                let label = 'Present';
                if ([6, 7, 13, 14, 20, 21, 27, 28].includes(day)) {
                  statusCls = 'status-weekoff';
                  label = 'Week Off';
                } else if (day === 3) {
                  statusCls = 'status-leave';
                  label = 'Leave';
                } else if (day === 15) {
                  statusCls = 'status-halfday';
                  label = 'Half Day';
                }
                return (
                  <div key={day} className={`epd-cal-cell ${statusCls}`}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{String(day).padStart(2, '0')}</span>
                    <span style={{ fontSize: 9, opacity: 0.85 }}>{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="epd-cal-legend">
              <span className="epd-legend-item"><span className="epd-legend-dot" style={{ background: '#dcfce7' }} /> Present</span>
              <span className="epd-legend-item"><span className="epd-legend-dot" style={{ background: '#fee2e2' }} /> Absent</span>
              <span className="epd-legend-item"><span className="epd-legend-dot" style={{ background: '#fef3c7' }} /> Half Day</span>
              <span className="epd-legend-item"><span className="epd-legend-dot" style={{ background: '#f3e8ff' }} /> Leave</span>
              <span className="epd-legend-item"><span className="epd-legend-dot" style={{ background: '#e0f2fe' }} /> Holiday</span>
              <span className="epd-legend-item"><span className="epd-legend-dot" style={{ background: '#f1f5f9' }} /> Week Off</span>
            </div>
          </div>

          {/* Recent Attendance Log Table */}
          <div className="epd-card">
            <div className="epd-card-title">Recent Attendance Log</div>
            <div className="epd-table-wrap">
              <table className="epd-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Punch In</th>
                    <th>Punch Out</th>
                    <th>Working Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>24 Sep 2026</td>
                    <td>09:54 AM</td>
                    <td>—</td>
                    <td>Working</td>
                    <td><span className="epd-status-pill epd-status-active">Present</span></td>
                  </tr>
                  <tr>
                    <td>23 Sep 2026</td>
                    <td>09:42 AM</td>
                    <td>06:31 PM</td>
                    <td>08h 49m</td>
                    <td><span className="epd-status-pill epd-status-active">Present</span></td>
                  </tr>
                  <tr>
                    <td>22 Sep 2026</td>
                    <td>09:50 AM</td>
                    <td>06:20 PM</td>
                    <td>08h 30m</td>
                    <td><span className="epd-status-pill epd-status-active">Present</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LEAVE ── */}
      {activeTab === 'leave' && (
        <div>
          {/* Leave Balances Cards */}
          <div className="epd-grid-3">
            <div className="epd-metric-card">
              <div className="epd-metric-icon purple"><Calendar size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Casual Leave</span>
                <span className="epd-metric-val">10 / 10 remaining</span>
              </div>
            </div>
            <div className="epd-metric-card">
              <div className="epd-metric-icon green"><ShieldAlert size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Sick Leave</span>
                <span className="epd-metric-val">8 / 8 remaining</span>
              </div>
            </div>
            <div className="epd-metric-card">
              <div className="epd-metric-icon blue"><Award size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Optional Holiday</span>
                <span className="epd-metric-val">3 / 3 remaining</span>
              </div>
            </div>
          </div>

          {/* Leave Requests Table */}
          <div className="epd-card">
            <div className="epd-card-title">Leave Applications</div>
            {leaveRequests.length > 0 ? (
              <div className="epd-table-wrap">
                <table className="epd-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>From Date</th>
                      <th>To Date</th>
                      <th>Days</th>
                      <th>Status</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((req, i) => (
                      <tr key={i}>
                        <td>{req.leave_type || req.type || 'Sick Leave'}</td>
                        <td>{req.from_date || req.start_date || '24 Sep 2026'}</td>
                        <td>{req.to_date || req.end_date || '25 Sep 2026'}</td>
                        <td>{req.days || 1} Day</td>
                        <td>
                          <span className="epd-status-pill epd-status-notice">
                            {req.status || 'Pending'}
                          </span>
                        </td>
                        <td>{req.reason || 'Medical checkup'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="epd-empty-box">
                <FileText size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
                <p>No leave applications found for this employee.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: REGULARIZATION ── */}
      {activeTab === 'regularization' && (
        <div className="epd-card">
          <div className="epd-card-title">Regularization Requests</div>
          {regularizations.length > 0 ? (
            <div className="epd-table-wrap">
              <table className="epd-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Requested Punch In</th>
                    <th>Requested Punch Out</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {regularizations.map((reg, i) => (
                    <tr key={i}>
                      <td>{reg.date || '20 Sep 2026'}</td>
                      <td>{reg.requested_punch_in || '09:30 AM'}</td>
                      <td>{reg.requested_punch_out || '06:30 PM'}</td>
                      <td>{reg.reason || 'Biometric device issue'}</td>
                      <td><span className="epd-status-pill epd-status-notice">{reg.status || 'Pending'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="epd-empty-box">
              <Clock size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p>No regularization requests found for this employee.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: COMP-OFF ── */}
      {activeTab === 'compoff' && (
        <div>
          <div className="epd-grid-4">
            <div className="epd-metric-card">
              <div className="epd-metric-icon green"><CheckCircle2 size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Available</span>
                <span className="epd-metric-val">0 Days</span>
              </div>
            </div>
            <div className="epd-metric-card">
              <div className="epd-metric-icon blue"><Clock size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Used</span>
                <span className="epd-metric-val">0 Days</span>
              </div>
            </div>
            <div className="epd-metric-card">
              <div className="epd-metric-icon amber"><AlertCircle size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Pending</span>
                <span className="epd-metric-val">0 Days</span>
              </div>
            </div>
            <div className="epd-metric-card">
              <div className="epd-metric-icon purple"><XCircle size={20} /></div>
              <div className="epd-metric-info">
                <span className="epd-metric-label">Expired</span>
                <span className="epd-metric-val">0 Days</span>
              </div>
            </div>
          </div>

          <div className="epd-card">
            <div className="epd-card-title">Comp-Off History</div>
            <div className="epd-empty-box">
              <Award size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p>No comp-off applications recorded.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: APPLICATIONS ── */}
      {activeTab === 'applications' && (
        <div className="epd-card">
          <div className="epd-card-title">All Employee Applications</div>
          {leaveRequests.length > 0 || regularizations.length > 0 ? (
            <div className="epd-table-wrap">
              <table className="epd-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Date / Period</th>
                    <th>Details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((req, i) => (
                    <tr key={`l-${i}`}>
                      <td><span className="epd-role-pill">Leave ({req.leave_type || 'Sick'})</span></td>
                      <td>{req.from_date || '24 Sep 2026'} – {req.to_date || '25 Sep 2026'}</td>
                      <td>{req.reason || 'Leave request'}</td>
                      <td><span className="epd-status-pill epd-status-notice">{req.status || 'Pending'}</span></td>
                    </tr>
                  ))}
                  {regularizations.map((reg, i) => (
                    <tr key={`r-${i}`}>
                      <td><span className="epd-role-pill" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>Regularization</span></td>
                      <td>{reg.date || '20 Sep 2026'}</td>
                      <td>Requested: {reg.requested_punch_in || '09:30 AM'} – {reg.requested_punch_out || '06:30 PM'}</td>
                      <td><span className="epd-status-pill epd-status-notice">{reg.status || 'Pending'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="epd-empty-box">
              <FileText size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p>No recent applications found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
