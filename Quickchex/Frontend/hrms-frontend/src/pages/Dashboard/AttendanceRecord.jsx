import React, { useMemo, useState, useEffect } from "react";
import {
  Search,
  FileSpreadsheet,
  X,
  ChevronRight,
  CalendarDays,
  Clock,
  MapPin,
  LogIn,
  LogOut,
  Camera,
  Image as ImageIcon,
  ShieldCheck,
  CheckCircle2,
  Download,
  Eye,
  Maximize2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardShell } from "../../components/header/DashboardHeader";
import CustomSelect from "../../components/ui/CustomSelect";
import "./AttendanceRecord.css";

/* ─────────────────────────── demo data ─────────────────────────── */

function generateMonthsList() {
  const list = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = d.toLocaleString("en-US", { month: "long" });
    list.push(`${mName}-${d.getFullYear()}`);
  }
  return list;
}

const MONTHS = generateMonthsList();

const DEPARTMENTS = ["All Departments", "Operations", "Sales", "Finance", "HR", "IT", "Development"];

const EMPLOYEES = [];

const AVATAR_CLASSES = ["ar-av-a", "ar-av-b", "ar-av-c", "ar-av-d", "ar-av-e", "ar-av-f"];

const STATUS_LABEL = {
  P: { label: "Present", cls: "ok" },
  A: { label: "Absent", cls: "bad" },
  L: { label: "Late", cls: "warn" },
  H: { label: "Holiday", cls: "hol" },
  W: { label: "Week Off", cls: "off" },
};

/* Produce calendar day cells for the selected month */
function buildMonthDays(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    status: "W", // default; overridden when real data loads
  }));
}

/* ─────────────────────────── page ─────────────────────────── */

export default function AttendanceRecord() {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState(DEPARTMENTS[0]);
  const [selected, setSelected] = useState(null);
  const [month, setMonth] = useState(MONTHS[0]);
  const [logOpen, setLogOpen] = useState(false);
  const [photoModal, setPhotoModal] = useState(null);
  const [employeeList, setEmployeeList] = useState(EMPLOYEES);

  useEffect(() => {
    const [monthName, yearStr] = month.split("-");
    const monthIndex = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ].indexOf(monthName) + 1;
    const yr = Number(yearStr) || new Date().getFullYear();

    fetch(`https://quickchex-backend.onrender.com/api/v1/attendance/admin/monthly?month=${monthIndex}&year=${yr}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEmployeeList(data);
        } else {
          fetch(`https://quickchex-backend.onrender.com/profile/employees/`)
            .then((res) => res.json())
            .then((emps) => {
              if (Array.isArray(emps) && emps.length > 0) {
                setEmployeeList(emps.map((d, idx) => ({
                  id: `db-${d.emp_code || idx}`,
                  name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || d.name || `Employee ${idx + 1}`,
                  code: d.emp_code || `EMP${idx}`,
                  dept: d.department || d.dept || "Operations",
                  present: 0,
                  absent: 0,
                  late: 0,
                  leave: 0,
                  avatar: d.profile_photo || null,
                })));
              }
            })
            .catch(() => { });
        }
      })
      .catch(() => { });
  }, [month]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employeeList.filter((e) => {
      const matchQ = !q || e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q);
      const matchD = dept === DEPARTMENTS[0] || e.dept === dept || e.department === dept;
      return matchQ && matchD;
    });
  }, [query, dept, employeeList]);

  const [days, setDays] = useState([]);
  const [empLogs, setEmpLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const openDetail = (emp) => {
    setSelected(emp);
    setLogOpen(false);
    setEmpLogs([]);
    setDays([]);
    toast.success(`Opening attendance records for ${emp.name}`);

    // Fetch real monthly day-by-day status
    const [monthName, yearStr] = month.split("-");
    const monthIndex = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ].indexOf(monthName) + 1;
    const yr = Number(yearStr) || new Date().getFullYear();
    fetch(`https://quickchex-backend.onrender.com/api/v1/attendance/${emp.code}/monthly?month=${monthIndex}&year=${yr}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDays(data.map(d => ({ day: d.day || new Date(d.date).getDate(), status: (d.status || "W").charAt(0).toUpperCase() })));
        } else {
          setDays(buildMonthDays(yr, monthIndex));
        }
      })
      .catch(() => setDays(buildMonthDays(yr, monthIndex)));
  };

  const handleExport = () => {
    const header = "Employee Name,Employee Code,Department,Present,Absent,Late,Leave,Attendance %\n";
    const body = filtered
      .map((e) =>
        [e.name, e.code, e.dept, e.present, e.absent, e.late, e.leave, `${pct(e)}%`].join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-records-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} employee records`);
  };

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, e) => ({
          present: acc.present + e.present,
          absent: acc.absent + e.absent,
          late: acc.late + e.late,
          leave: acc.leave + e.leave,
        }),
        { present: 0, absent: 0, late: 0, leave: 0 }
      ),
    [filtered]
  );

  return (
    <DashboardShell>
      <div className="attendance-record-page">
        <Toaster position="top-right" />
        {/* summary cards */}
        <div className="ar-stats">
          <div className="ar-stat-card">
            <span className="ar-stat-icon ok"><CalendarDays size={18} /></span>
            <div>
              <span className="ar-stat-value">{totals.present}</span>
              <span className="ar-stat-label">Present Days</span>
            </div>
          </div>
          <div className="ar-stat-card">
            <span className="ar-stat-icon bad"><X size={18} /></span>
            <div>
              <span className="ar-stat-value">{totals.absent}</span>
              <span className="ar-stat-label">Absent Days</span>
            </div>
          </div>
          <div className="ar-stat-card">
            <span className="ar-stat-icon warn"><Clock size={18} /></span>
            <div>
              <span className="ar-stat-value">{totals.late}</span>
              <span className="ar-stat-label">Late Arrivals</span>
            </div>
          </div>
          <div className="ar-stat-card">
            <span className="ar-stat-icon hol"><MapPin size={18} /></span>
            <div>
              <span className="ar-stat-value">{totals.leave}</span>
              <span className="ar-stat-label">Leaves Taken</span>
            </div>
          </div>
        </div>

        {/* toolbar */}
        <div className="ar-toolbar">
          <h2 className="ar-section-title">Employee Attendance — {month}</h2>
          <div className="ar-toolbar-controls">
            <div className="ar-search-wrap">
              <input
                type="text"
                className="ar-search-input"
                placeholder="Search employee / code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div style={{ minWidth: 155 }}>
              <CustomSelect
                value={dept}
                onChange={(val) => setDept(val)}
                options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                size="md"
              />
            </div>
            <div style={{ minWidth: 155 }}>
              <CustomSelect
                value={month}
                onChange={(val) => {
                  setMonth(val);
                  toast.success(`Showing records for ${val}`);
                }}
                options={MONTHS.map((m) => ({ value: m, label: m }))}
                size="md"
              />
            </div>
            <button type="button" className="ar-export-btn" onClick={handleExport}>
              <FileSpreadsheet size={16} />
              Export
            </button>
          </div>
        </div>

        {/* table */}
        <div className="ar-table-card">
          <div className="ar-table-scroll">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Employee Code</th>
                  <th>Department</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Leave</th>
                  <th>Attendance %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className="ar-emp-cell">
                        <span className={`ar-avatar ${AVATAR_CLASSES[employeeList.indexOf(emp) % AVATAR_CLASSES.length]}`}>
                          {emp.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <span className="ar-emp-name">{emp.name}</span>
                      </div>
                    </td>
                    <td className="ar-code">{emp.code}</td>
                    <td>{emp.dept}</td>
                    <td><span className="ar-pill ok">{emp.present}</span></td>
                    <td><span className="ar-pill bad">{emp.absent}</span></td>
                    <td><span className="ar-pill warn">{emp.late}</span></td>
                    <td><span className="ar-pill hol">{emp.leave}</span></td>
                    <td>
                      <div className="ar-pct-wrap">
                        <div className="ar-pct-bar">
                          <span style={{ width: `${pct(emp)}%` }} />
                        </div>
                        <span className="ar-pct-val">{pct(emp)}%</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ar-view-btn"
                        onClick={() => openDetail(emp)}
                      >
                        View Records
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="ar-empty">
                      No employees match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* detail slide-over panel */}
        {selected && (
          <>
            <div className="ar-overlay" onClick={() => setSelected(null)} />
            <aside className="ar-detail">
              <div className="ar-detail-head">
                <div className="ar-detail-id">
                  <span className={`ar-avatar lg ${AVATAR_CLASSES[employeeList.indexOf(selected) % AVATAR_CLASSES.length]}`}>
                    {selected.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <div>
                    <h3>{selected.name}</h3>
                    <p>{selected.code} · {selected.dept}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ar-detail-close"
                  onClick={() => setSelected(null)}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ar-detail-controls" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 160 }}>
                  <CustomSelect
                    value={month}
                    onChange={(val) => {
                      setMonth(val);
                      toast.success(`Showing ${selected.name} for ${val}`);
                    }}
                    options={MONTHS.map((m) => ({ value: m, label: m }))}
                    size="md"
                  />
                </div>
                <button
                  type="button"
                  className="ar-logs-btn"
                  onClick={() => {
                    setLogsLoading(true);
                    const token = localStorage.getItem("token");
                    const [monthName, yearStr] = month.split("-");
                    const monthIndex = [
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ].indexOf(monthName) + 1;
                    const yr = Number(yearStr) || new Date().getFullYear();

                    fetch(`https://quickchex-backend.onrender.com/api/v1/attendance/${selected.code}/logs?month=${monthIndex}&year=${yr}`, {
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    })
                      .then(r => r.ok ? r.json() : [])
                      .then(data => {
                        const fmtImg = (img) => {
                          if (!img) return null;
                          if (img.startsWith("http") || img.startsWith("data:")) return img;
                          return `https://quickchex-backend.onrender.com${img.startsWith("/") ? "" : "/"}${img}`;
                        };
                        if (Array.isArray(data)) {
                          setEmpLogs(data.map((l, i) => ({
                            id: l.id || `log-${i}`,
                            date: l.date || l.punch_date || "",
                            inTime: l.punch_in_time || l.inTime || "—",
                            outTime: l.punch_out_time || l.outTime || "—",
                            inImage: fmtImg(l.punch_in_photo || l.inImage),
                            outImage: fmtImg(l.punch_out_photo || l.outImage),
                            worked: l.worked_hours || l.worked || "—",
                            status: l.status || "Present",
                            device: l.device || "Biometric",
                            location: l.location || "—",
                          })));
                        }
                        setLogsLoading(false);
                        setLogOpen(true);
                        toast.success(`Opening attendance log for ${selected.name}`);
                      })
                      .catch(() => { setLogsLoading(false); setLogOpen(true); });
                  }}
                >
                  View Logs
                </button>
              </div>

              <div className="ar-detail-summary">
                <div><strong>{selected.present}</strong><span>Present</span></div>
                <div><strong>{selected.absent}</strong><span>Absent</span></div>
                <div><strong>{selected.late}</strong><span>Late</span></div>
                <div><strong>{selected.leave}</strong><span>Leave</span></div>
              </div>

              <div className="ar-day-grid">
                {days.map((d) => (
                  <div
                    key={d.day}
                    className={`ar-day ${STATUS_LABEL[d.status].cls}`}
                    title={`Aug ${d.day} — ${STATUS_LABEL[d.status].label}`}
                  >
                    <span className="ar-day-num">{d.day}</span>
                    <span className="ar-day-status">{d.status}</span>
                  </div>
                ))}
              </div>

              <div className="ar-legend">
                {["P", "A", "L", "H", "W"].map((s) => (
                  <span key={s} className={`ar-legend-item ${STATUS_LABEL[s].cls}`}>
                    <i>{s}</i> {STATUS_LABEL[s].label}
                  </span>
                ))}
              </div>
            </aside>
          </>
        )}

        {/* logs modal */}
        {selected && logOpen && (
          <>
            <div className="ar-overlay" onClick={() => setLogOpen(false)} />
            <div className="ar-modal">
              <div className="ar-modal-head">
                <div>
                  <h3>Attendance Log — {selected.name}</h3>
                  <p>{month} · verified punches with captured face images</p>
                </div>
                <button
                  type="button"
                  className="ar-detail-close"
                  onClick={() => setLogOpen(false)}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="ar-modal-body">
                <table className="ar-table ar-logs-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Worked</th>
                      <th>Status</th>
                      <th>Device</th>
                      <th>Location</th>
                      <th className="ar-th-center">Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empLogs.map((l) => (
                      <tr key={l.id}>
                        <td className="ar-code">{l.date}</td>
                        <td>
                          <span className="ar-log-time in">
                            <LogIn size={13} /> {l.inTime}
                          </span>
                        </td>
                        <td>
                          <span className="ar-log-time out">
                            <LogOut size={13} /> {l.outTime}
                          </span>
                        </td>
                        <td>{l.worked}</td>
                        <td>
                          <span className={`ar-status ${l.status === "Late" ? "warn" : "ok"}`}>
                            {l.status}
                          </span>
                        </td>
                        <td>{l.device}</td>
                        <td className="ar-loc">{l.location}</td>
                        <td className="ar-td-center">
                          <button
                            type="button"
                            className="ar-single-image-btn"
                            title="Click to view Punch In & Out photos"
                            onClick={() =>
                              setPhotoModal({
                                empName: selected.name,
                                empCode: selected.code,
                                dept: selected.dept,
                                date: l.date,
                                inTime: l.inTime,
                                outTime: l.outTime,
                                inImage: l.inImage,
                                outImage: l.outImage,
                                worked: l.worked,
                                device: l.device,
                                location: l.location,
                                status: l.status,
                              })
                            }
                          >
                            <Camera size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* punch photo verification lightbox modal (both In & Out images) */}
        {photoModal && (
          <>
            <div className="ar-photo-overlay" onClick={() => setPhotoModal(null)} />
            <div className="ar-photo-modal ar-photo-modal-dual" role="dialog" aria-modal="true">
              <div className="ar-photo-head">
                <div className="ar-photo-head-title">
                  <span className="ar-photo-dual-badge">
                    <Camera size={14} /> Punch Verification Photos
                  </span>
                  <div>
                    <h4>{photoModal.empName}</h4>
                    <p>{photoModal.empCode} · {photoModal.dept} · {photoModal.date}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ar-photo-close"
                  onClick={() => setPhotoModal(null)}
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ar-photo-body">
                {/* 2-column cards for Punch In & Punch Out */}
                <div className="ar-dual-grid">
                  {/* Punch In Card */}
                  <div className="ar-dual-card in">
                    <div className="ar-dual-card-head">
                      <span className="ar-dual-tag in">
                        <LogIn size={13} /> Punch In
                      </span>
                      <strong className="ar-dual-time">{photoModal.inTime}</strong>
                    </div>

                    <div className="ar-photo-frame">
                      {photoModal.inImage ? (
                        <img
                          src={photoModal.inImage}
                          alt={`${photoModal.empName} Punch In`}
                          className="ar-photo-img"
                        />
                      ) : (
                        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)", color: "var(--muted)" }}>
                          No Punch In photo captured
                        </div>
                      )}
                      <div className="ar-photo-stamp bottom-left">
                        <Clock size={11} />
                        <span>{photoModal.date} · {photoModal.inTime}</span>
                      </div>
                    </div>

                    <div className="ar-dual-card-foot">
                      <span className="ar-dual-device" title={photoModal.device}>
                        <Camera size={12} /> {photoModal.device}
                      </span>
                      <a
                        href={photoModal.inImage}
                        download={`punch_in_${photoModal.empCode}_${photoModal.date}.png`}
                        target="_blank"
                        rel="noreferrer"
                        className="ar-dual-dl-btn"
                        title="Download Punch In Photo"
                      >
                        <Download size={13} /> Download
                      </a>
                    </div>
                  </div>

                  {/* Punch Out Card */}
                  <div className="ar-dual-card out">
                    <div className="ar-dual-card-head">
                      <span className="ar-dual-tag out">
                        <LogOut size={13} /> Punch Out
                      </span>
                      <strong className="ar-dual-time">{photoModal.outTime}</strong>
                    </div>

                    <div className="ar-photo-frame">
                      {photoModal.outImage ? (
                        <img
                          src={photoModal.outImage}
                          alt={`${photoModal.empName} Punch Out`}
                          className="ar-photo-img"
                        />
                      ) : (
                        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)", color: "var(--muted)" }}>
                          No Punch Out photo captured
                        </div>
                      )}
                      <div className="ar-photo-stamp bottom-left">
                        <Clock size={11} />
                        <span>{photoModal.date} · {photoModal.outTime}</span>
                      </div>
                    </div>

                    <div className="ar-dual-card-foot">
                      <span className="ar-dual-device" title={photoModal.device}>
                        <Camera size={12} /> {photoModal.device}
                      </span>
                      <a
                        href={photoModal.outImage}
                        download={`punch_out_${photoModal.empCode}_${photoModal.date}.png`}
                        target="_blank"
                        rel="noreferrer"
                        className="ar-dual-dl-btn"
                        title="Download Punch Out Photo"
                      >
                        <Download size={13} /> Download
                      </a>
                    </div>
                  </div>
                </div>

                {/* Details summary */}
                <div className="ar-photo-meta-card">
                  <div className="ar-photo-meta-item">
                    <span className="ar-photo-meta-label">
                      <CalendarDays size={13} /> Date
                    </span>
                    <strong>{photoModal.date}</strong>
                  </div>
                  <div className="ar-photo-meta-item">
                    <span className="ar-photo-meta-label">
                      <Clock size={13} /> Worked Duration
                    </span>
                    <strong>{photoModal.worked} ({photoModal.status})</strong>
                  </div>
                  <div className="ar-photo-meta-item full">
                    <span className="ar-photo-meta-label">
                      <MapPin size={13} /> Punch Location
                    </span>
                    <strong>{photoModal.location}</strong>
                  </div>
                </div>
              </div>

              <div className="ar-photo-foot">
                <span className="ar-photo-audit">
                  <CheckCircle2 size={14} /> Biometrically Verified & Geo-tagged
                </span>
                <button
                  type="button"
                  className="ar-photo-done"
                  onClick={() => setPhotoModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}


      </div>
    </DashboardShell>
  );
}

function pct(e) {
  const total = e.present + e.absent + e.late + e.leave || 1;
  return Math.round(((e.present + e.late) / total) * 100);
}
