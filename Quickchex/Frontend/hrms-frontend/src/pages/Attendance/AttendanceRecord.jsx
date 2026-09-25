import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/sidebar/Sidebar";
import "./AttendanceRecord.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const Icon = ({ name, size = 18 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M16 2v4M8 2v4M3 9h18" />
      </>
    ),
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    filter: <><path d="M4 5h16l-6 7v5l-4 2v-7z" /></>,
    download: <><path d="M12 3v11" /><path d="m8 10 4 4 4-4" /><path d="M4 20h16" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="M8 15v-3M12 15V8M16 15v-6M20 15v-9" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M17 11a4 4 0 0 0 0-8M21 21v-2a4 4 0 0 0-3-3.87" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    x: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    warning: <><path d="M12 3 2.8 19a1.5 1.5 0 0 0 1.3 2h15.8a1.5 1.5 0 0 0 1.3-2z" /><path d="M12 9v4M12 17h.01" /></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    location: <><path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const departments = ["All Departments", "Development", "Design", "Management", "HR"];
const statuses = ["All Statuses", "Present", "Absent", "Invalid", "Weekly Off", "Holiday", "On Leave", "Permission"];

const AttendanceRecord = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("All Employees");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [monthFilter, setMonthFilter] = useState("August");
  const [yearFilter, setYearFilter] = useState("2026");
  const [selectedDate, setSelectedDate] = useState("");

  const [logsRow, setLogsRow] = useState(null);
  const [selfieUrl, setSelfieUrl] = useState("");
  const [detailsRow, setDetailsRow] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(false);
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_BASE_URL}/api/v1/attendance/admin/today`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        if (!response.ok) throw new Error("Attendance request failed");

        const json = await response.json();
        const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        setRecords(normalizeApiRecords(list));
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const close = (event) => {
      if (!event.target.closest(".ar-dropdown")) {
        setEmployeeMenuOpen(false);
        setDepartmentMenuOpen(false);
        setStatusMenuOpen(false);
      }
      if (!event.target.closest(".ar-row-menu")) setMenuRow(null);
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function normalizeApiRecords(list) {
    return list.map((item, index) => ({
      id: item.id || item.attendance_id || `API-${index}`,
      employeeId: item.employee_code || item.employee_id || item.emp_code || "--",
      employee: item.name || item.employee_name || "Unknown Employee",
      department: item.department || item.dept || "--",
      designation: item.designation || item.role || "--",
      date: item.date || item.attendance_date || "Today",
      checkIn: item.checkIn || item.check_in || "--",
      checkOut: item.checkOut || item.check_out || "--",
      workingHours: item.workingHours || item.working_hours || item.activeHours || "--",
      deviation: item.deviation || item.deviation_hours || "--:-- Hrs.",
      breakHours: item.breakHours || item.break_hours || "00:00 Hrs.",
      lateEarly: item.lateEarly || item.remark || "--",
      status: item.status || "Invalid",
      shift: item.shift || item.shift_time || "09:00 AM - 09:00 PM",
      regularization: item.regularization || item.reg_status || "Not Requested",
      location: item.location || item.address || "--",
      logs: Array.isArray(item.logs) ? item.logs : [],
    }));
  }

  const employees = useMemo(
    () => ["All Employees", ...Array.from(new Set(records.map((r) => r.employee).filter(Boolean)))],
    [records]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return records.filter((row) => {
      const matchesSearch =
        !q ||
        row.employee.toLowerCase().includes(q) ||
        row.employeeId.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q) ||
        row.designation.toLowerCase().includes(q);

      const matchesEmployee =
        employeeFilter === "All Employees" || row.employee === employeeFilter;

      const matchesDepartment =
        departmentFilter === "All Departments" || row.department === departmentFilter;

      const matchesStatus =
        statusFilter === "All Statuses" || row.status === statusFilter;

      const matchesDate =
        !selectedDate ||
        row.date.toLowerCase().includes(
          new Date(selectedDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          }).toLowerCase()
        );

      return matchesSearch && matchesEmployee && matchesDepartment && matchesStatus && matchesDate;
    });
  }, [records, search, employeeFilter, departmentFilter, statusFilter, selectedDate]);

  const summary = useMemo(() => {
    const source = filtered.length ? filtered : records;
    const count = (status) => source.filter((r) => r.status.toLowerCase() === status.toLowerCase()).length;
    const present = count("Present");
    const absent = count("Absent");
    const invalid = count("Invalid");
    const leaves = count("On Leave");
    const weeklyOff = count("Weekly Off");
    const holidays = count("Holiday");

    return {
      present,
      absent,
      invalid,
      leaves,
      weeklyOff,
      holidays,
      late: source.filter((r) => r.lateEarly.toLowerCase().includes("late")).length,
      early: source.filter((r) => r.lateEarly.toLowerCase().includes("early")).length,
      workedHours: source.filter((r) => !["--", ""].includes(r.workingHours)).length
        ? `${source.filter((r) => !["--", ""].includes(r.workingHours)).length * 8}h`
        : "0h",
    };
  }, [filtered, records]);

  const chartData = useMemo(() => {
    const byMonth = MONTHS.map((month) => ({
      month,
      present: 0,
      absent: 0,
      leave: 0,
      weeklyOff: 0,
    }));

    records.forEach((row) => {
      const date = new Date(row.date);
      const monthIndex = Number.isNaN(date.getTime())
        ? MONTHS.findIndex((m) => row.date.includes(m))
        : date.getMonth();

      const bucket = byMonth[monthIndex];
      if (!bucket) return;

      const s = row.status.toLowerCase();
      if (s === "present") bucket.present += 1;
      if (s === "absent") bucket.absent += 1;
      if (s === "on leave") bucket.leave += 1;
      if (s === "weekly off") bucket.weeklyOff += 1;
    });

    return byMonth;
  }, [records]);

  const openLogs = (row) => {
    setLogsRow(row);
    setMenuRow(null);
  };

  const statusClass = (value) =>
    value.toLowerCase().replace(/\s+/g, "-");

  const handleExportReport = () => {
    const headers = [
      "Employee",
      "Employee ID",
      "Department",
      "Designation",
      "Date",
      "Check In",
      "Check Out",
      "Working Hours",
      "Deviation Hrs.",
      "Break Hrs.",
      "Late / Early",
      "Status",
      "Shift Time",
      "Regularization Status",
    ];

    const escapeCsv = (value) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = filtered.map((row) => [
      row.employee,
      row.employeeId,
      row.department,
      row.designation,
      row.date,
      row.checkIn,
      row.checkOut,
      row.workingHours,
      row.deviation,
      row.breakHours,
      row.lateEarly,
      row.status,
      row.shift,
      row.regularization,
    ]);

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const employeePart =
      employeeFilter === "All Employees"
        ? "all-employees"
        : employeeFilter.replace(/\s+/g, "-").toLowerCase();

    const monthPart = monthFilter.toLowerCase();
    const fileName = `attendance-${employeePart}-${monthPart}-${yearFilter}.csv`;

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`attendance-record-page ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <Sidebar expanded={sidebarExpanded} setExpanded={setSidebarExpanded} />

      <main className="attendance-record-main">
        <div className="attendance-record-inner">
          <header className="ar-page-header">
            <button className="ar-export-btn" type="button" onClick={handleExportReport}>
              <Icon name="download" size={16} />
              Export Report
            </button>
          </header>

          <section className="ar-filter-card">
            <div className="ar-filter-group">
              <label>Date</label>
              <div className="ar-date-control">
                <Icon name="calendar" size={16} />
                <input
                  type="date"
                  aria-label="Attendance date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <ArDropdown
              label="Employee"
              value={employeeFilter}
              options={employees}
              open={employeeMenuOpen}
              setOpen={setEmployeeMenuOpen}
              onChange={setEmployeeFilter}
            />


            <div className="ar-filter-group ar-search-group">
              <label>Search employee</label>
              <div className="ar-search-control">
                <Icon name="search" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, employee ID, department..."
                />
              </div>
            </div>

            <ArSelect
              label="Month"
              value={monthFilter}
              options={MONTHS}
              onChange={setMonthFilter}
            />

            <ArSelect
              label="Year"
              value={yearFilter}
              options={["2026", "2025", "2024"]}
              onChange={setYearFilter}
              icon="calendar"
            />
          </section>

          <section className="ar-summary-grid">
            <SummaryCard label="Present Days" value={summary.present} tone="present" icon="check" />
            <SummaryCard label="Absent Days" value={summary.absent} tone="absent" icon="x" />
            <SummaryCard label="Invalid Days" value={summary.invalid} tone="invalid" icon="warning" />
            <SummaryCard label="Approved Leaves" value={summary.leaves} tone="leave" icon="check" />
            <SummaryCard label="Holidays" value={summary.holidays} tone="holiday" icon="calendar" />
            <SummaryCard label="Weekly Off" value={summary.weeklyOff} tone="weekly" icon="calendar" />
            <SummaryCard label="Late / Early" value={`${summary.late}/${summary.early}`} tone="late" icon="clock" />
            <SummaryCard label="Worked Hours" value={summary.workedHours} tone="hours" icon="clock" />
          </section>

          <section className="ar-chart-card">
            <div className="ar-section-head">
              <div>
                <span className="ar-section-kicker">ATTENDANCE TREND</span>
                <h2>Monthly Attendance Overview</h2>
              </div>
              <div className="ar-legend">
                <span><i className="dot present" />Present</span>
                <span><i className="dot absent" />Absent</span>
                <span><i className="dot leave" />Leave</span>
                <span><i className="dot weekly" />Weekly Off</span>
              </div>
            </div>

            <div className="ar-chart">
              <div className="ar-chart-y">
                {[25, 20, 15, 10, 5, 0].map((n) => <span key={n}>{n}</span>)}
              </div>

              <div className="ar-chart-area">
                {[25, 20, 15, 10, 5, 0].map((n) => <div className="ar-grid-line" style={{ bottom: `${(n / 25) * 100}%` }} key={n} />)}

                {chartData.map((item) => {
                  const max = Math.max(item.present + item.absent + item.leave + item.weeklyOff, 1);
                  return (
                    <div className="ar-chart-column" key={item.month}>
                      <div className="ar-bars">
                        <span className="bar present" style={{ height: `${(item.present / max) * 78 + (item.present ? 8 : 0)}%` }} />
                        <span className="bar absent" style={{ height: `${(item.absent / max) * 78}%` }} />
                        <span className="bar leave" style={{ height: `${(item.leave / max) * 78}%` }} />
                        <span className="bar weekly" style={{ height: `${(item.weeklyOff / max) * 78}%` }} />
                      </div>
                      <span className="ar-chart-label">{item.month.slice(0, 3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="ar-table-card">
            <div className="ar-section-head ar-table-head">
              <div>
                <span className="ar-section-kicker">DAILY RECORDS</span>
                <h2>Employee Attendance Details</h2>
              </div>
              <span className="ar-result-count">{filtered.length} records</span>
            </div>

            <div className="ar-table-scroll">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Working Hours</th>
                    <th>Deviation Hrs.</th>
                    <th>Break Hrs.</th>
                    <th>Late / Early</th>
                    <th>Status</th>
                    <th>Shift Time</th>
                    <th>Reg. Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="12" className="ar-empty">Loading attendance records...</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="ar-empty">No attendance records match the selected filters.</td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id}>
                        <td>{row.date}</td>
                        <td>
                          <div className="ar-employee-cell">
                            <div className="ar-avatar">
                              {row.employee.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                            </div>
                            <div>
                              <strong>{row.employee}</strong>
                              <span>{row.employeeId} · {row.department}</span>
                            </div>
                          </div>
                        </td>
                        <td>{row.checkIn}</td>
                        <td>{row.checkOut}</td>
                        <td>{row.workingHours}</td>
                        <td>{row.deviation}</td>
                        <td>{row.breakHours}</td>
                        <td>{row.lateEarly}</td>
                        <td><span className={`ar-status ${statusClass(row.status)}`}>{row.status}</span></td>
                        <td>{row.shift}</td>
                        <td><span className={`ar-reg-status ${statusClass(row.regularization)}`}>{row.regularization}</span></td>
                        <td>
                          <div className="ar-row-actions">
                            <button type="button" className="ar-icon-btn" title="View attendance logs" onClick={() => openLogs(row)}>
                              <Icon name="list" size={16} />
                            </button>
                            <div className="ar-row-menu">
                              <button
                                type="button"
                                className="ar-icon-btn"
                                title="More actions"
                                onClick={() => setMenuRow(menuRow === row.id ? null : row.id)}
                              >
                                <Icon name="more" size={16} />
                              </button>

                              {menuRow === row.id && (
                                <div className="ar-action-menu">
                                  <button type="button" onClick={() => setDetailsRow(row)}>View Details</button>
                                  <button type="button" onClick={() => openLogs(row)}>View Attendance Logs</button>
                                  <button type="button">View Regularization</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {logsRow && (
        <div className="ar-overlay" onMouseDown={() => setLogsRow(null)}>
          <div className="ar-modal ar-logs-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ar-modal-head">
              <div>
                <span className="ar-modal-kicker">ATTENDANCE LOGS</span>
                <h3>Attendance Logs for {logsRow.employee}</h3>
                <p>{logsRow.date} · {logsRow.employeeId}</p>
              </div>
              <button type="button" className="ar-close" onClick={() => setLogsRow(null)}><Icon name="close" /></button>
            </div>

            <div className="ar-log-table-wrap">
              {logsRow.logs?.length ? (
                <table className="ar-log-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Capture Type</th>
                      <th>Location</th>
                      <th>Comments</th>
                      <th>Selfie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsRow.logs.map((log, i) => (
                      <tr key={`${log.time}-${i}`}>
                        <td><strong>{log.time}</strong></td>
                        <td><span className={`ar-log-type ${log.type === "Check In" ? "in" : "out"}`}>{log.type}</span></td>
                        <td>{log.capture}</td>
                        <td>
                          <div className="ar-location">
                            <Icon name="location" size={15} />
                            <span>{log.location || logsRow.location || "--"}</span>
                          </div>
                        </td>
                        <td>{log.comments || "--"}</td>
                        <td>
                          {log.selfie ? (
                            <button type="button" className="ar-proof-btn" onClick={() => setSelfieUrl(log.selfie)}>
                              <Icon name="eye" size={15} /> View
                            </button>
                          ) : (
                            <span className="ar-muted">No selfie</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="ar-log-empty">
                  <Icon name="list" size={26} />
                  <strong>No attendance logs available</strong>
                  <span>No punch records were provided for this date.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {detailsRow && (
        <div className="ar-overlay" onMouseDown={() => setDetailsRow(null)}>
          <div className="ar-modal ar-details-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ar-modal-head">
              <div>
                <span className="ar-modal-kicker">EMPLOYEE ATTENDANCE</span>
                <h3>{detailsRow.employee}</h3>
                <p>{detailsRow.designation} · {detailsRow.department}</p>
              </div>
              <button type="button" className="ar-close" onClick={() => setDetailsRow(null)}><Icon name="close" /></button>
            </div>

            <div className="ar-detail-grid">
              <Detail label="Employee ID" value={detailsRow.employeeId} />
              <Detail label="Date" value={detailsRow.date} />
              <Detail label="Check In" value={detailsRow.checkIn} />
              <Detail label="Check Out" value={detailsRow.checkOut} />
              <Detail label="Working Hours" value={detailsRow.workingHours} />
              <Detail label="Deviation" value={detailsRow.deviation} />
              <Detail label="Status" value={detailsRow.status} />
              <Detail label="Regularization" value={detailsRow.regularization} />
              <Detail label="Shift Time" value={detailsRow.shift} />
              <Detail label="Location" value={detailsRow.location} />
            </div>

            <div className="ar-detail-summary">
              <span>Attendance flow</span>
              <strong>Daily attendance → status → leave / regularization → payroll</strong>
            </div>
          </div>
        </div>
      )}

      {selfieUrl && (
        <div className="ar-overlay" onMouseDown={() => setSelfieUrl("")}>
          <div className="ar-selfie-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="ar-close ar-selfie-close" onClick={() => setSelfieUrl("")}>
              <Icon name="close" />
            </button>
            <img src={selfieUrl} alt="Attendance proof" />
          </div>
        </div>
      )}
    </div>
  );
};


const ArSelect = ({ label, value, options, onChange, icon = "calendar" }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = (event) => {
      if (!event.target.closest(".ar-select")) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="ar-filter-group ar-select">
      <label>{label}</label>
      <button
        type="button"
        className={`ar-dropdown-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="ar-select-left">
          <Icon name={icon} size={15} />
          <span>{value}</span>
        </span>
        <Icon name="chevron" size={15} />
      </button>

      {open && (
        <div className="ar-dropdown-menu">
          {options.map((option) => (
            <button
              type="button"
              key={option}
              className={option === value ? "selected" : ""}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span>{option}</span>
              {option === value && <Icon name="check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ArDropdown = ({ label, value, options, open, setOpen, onChange }) => (
  <div className="ar-filter-group ar-dropdown">
    <label>{label}</label>
    <button type="button" className={`ar-dropdown-trigger ${open ? "is-open" : ""}`} onClick={() => setOpen(!open)}>
      <span>{value}</span>
      <Icon name="chevron" size={15} />
    </button>

    {open && (
      <div className="ar-dropdown-menu">
        {options.map((option) => (
          <button
            type="button"
            className={option === value ? "selected" : ""}
            key={option}
            onClick={() => {
              onChange(option);
              setOpen(false);
            }}
          >
            <span>{option}</span>
            {option === value && <Icon name="check" size={15} />}
          </button>
        ))}
      </div>
    )}
  </div>
);

const SummaryCard = ({ label, value, tone, icon }) => (
  <div className={`ar-summary-card ${tone}`}>
    <div className="ar-summary-icon"><Icon name={icon} size={18} /></div>
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </div>
);

const Detail = ({ label, value }) => (
  <div className="ar-detail-item">
    <span>{label}</span>
    <strong>{value || "--"}</strong>
  </div>
);

export default AttendanceRecord;
