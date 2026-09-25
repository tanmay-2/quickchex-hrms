import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import "./Attendance.css";

/* ═══════════════════════ helpers ═══════════════════════ */

const API_BASE_URL = import.meta.env.VITE_API_URL;
const REG_API_URL = `${API_BASE_URL}/api/v1/regularization`;

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

const createIsoDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") hours = "00";
  if (modifier === "PM") hours = parseInt(hours, 10) + 12;

  return `${dateStr}T${String(hours).padStart(2, "0")}:${minutes}:00`;
};

const fmt12 = (iso) => {
  if (!iso) return "--";
  const d = iso.includes("T") ? new Date(iso) : new Date(`1970-01-01T${iso}`);
  return isNaN(d) ? "--" : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const fmtDate = (iso) => {
  if (!iso) return "--";
  const d = new Date(iso);
  if (isNaN(d)) return "--";
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) +
    " " +
    d.toLocaleDateString("en-GB", { weekday: "short" })
  );
};

const fmtHrs = (hrs) => {
  if (hrs == null || hrs === "" || isNaN(Number(hrs))) return "--";
  const h = Math.floor(Number(hrs));
  const m = Math.round((Number(hrs) % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} Hrs.`;
};

const statusCls = (status) => {
  if (!status) return "va-status-invalid";
  const s = status.toLowerCase();
  if (s.includes("half")) return "va-status-halfday";
  if (s.includes("present")) return "va-status-present";
  if (s.includes("absent")) return "va-status-absent";
  if (s.includes("leave")) return "va-status-leave";
  if (s.includes("week") || s.includes("off")) return "va-status-weekoff";
  if (s.includes("holiday")) return "va-status-leave";
  return "va-status-invalid";
};

// 🔥 Added helper to automatically calculate Sundays and 4th Saturdays
const checkIsWeekOff = (dateString) => {
  const dateObj = new Date(dateString);
  const day = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

  if (day === 0) return true; // Every Sunday is a week off

  if (day === 6) {
    const dateNum = dateObj.getDate();
    // The 4th Saturday of any month always falls between the 22nd and 28th
    if (dateNum >= 22 && dateNum <= 28) return true;
  }

  return false;
};

/* ═══════════════════════ Regularization Modal Components ═══════════════════════ */

const TimePicker = ({ label, value, onChange, actualTime }) => {
  const [open, setOpen] = useState(false);

  const parseTime = (val) => {
    const match = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) return { h: parseInt(match[1]), m: parseInt(match[2]), period: match[3].toUpperCase() };
    return { h: 12, m: 0, period: "AM" };
  };

  const { h, m, period } = parseTime(value);
  const format = (hours, minutes, p) =>
    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${p}`;

  const update = (newH, newM, newP) => onChange(format(newH, newM, newP));

  return (
    <div className="rm-field" style={{ flex: 1 }}>
      <label className="rm-label">{label}</label>
      <div className="rm-timepicker-wrap">
        <input
          className="rm-input"
          value={value}
          readOnly
          onClick={() => setOpen((o) => !o)}
          style={{ cursor: "pointer" }}
        />
        <button className="rm-clock-btn" type="button" onClick={() => setOpen((o) => !o)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>

        {open && (
          <div className="rm-time-dropdown">
            <div className="rm-time-controls">
              <div className="rm-time-col">
                <button type="button" className="rm-arrow" onClick={() => update((h % 12) + 1, m, period)}>▲</button>
                <span className="rm-time-val">{String(h).padStart(2, "0")}</span>
                <button type="button" className="rm-arrow" onClick={() => update(h === 1 ? 12 : h - 1, m, period)}>▼</button>
                <span className="rm-time-unit">Hrs</span>
              </div>
              <span style={{ fontWeight: "600", fontSize: "18px", paddingBottom: "15px" }}>:</span>
              <div className="rm-time-col">
                <button type="button" className="rm-arrow" onClick={() => update(h, (m + 1) % 60, period)}>▲</button>
                <span className="rm-time-val">{String(m).padStart(2, "0")}</span>
                <button type="button" className="rm-arrow" onClick={() => update(h, m === 0 ? 59 : m - 1, period)}>▼</button>
                <span className="rm-time-unit">Min</span>
              </div>
              <div className="rm-period-toggle">
                <button type="button" className={`rm-period-btn ${period === "AM" ? "rm-period-active" : ""}`} onClick={() => update(h, m, "AM")}>AM</button>
                <button type="button" className={`rm-period-btn ${period === "PM" ? "rm-period-active" : ""}`} onClick={() => update(h, m, "PM")}>PM</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {actualTime && (
        <span style={{ fontSize: "11px", color: "#f97316", marginTop: "4px" }}>
          Actual check-in: {actualTime}
        </span>
      )}
    </div>
  );
};

const SuccessModal = ({ onClose }) => (
  <div className="rm-overlay">
    <div className="rm-success-box">
      <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#f0fdf4", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p style={{ fontWeight: "600", fontSize: "18px" }}>Successful</p>
      <p style={{ fontSize: "13px", color: "#666" }}>Regularization Request Created Successfully</p>
      <button className="rm-submit-btn" style={{ marginTop: "15px", width: "100px" }} onClick={onClose}>OK</button>
    </div>
  </div>
);

const RegularizationModal = ({ onClose, onSuccess, employeeName, preFillData }) => {
  const [requestType, setRequestType] = useState("");
  const [date, setDate] = useState(preFillData?.date || "");
  const [checkIn, setCheckIn] = useState(preFillData?.checkIn || "09:00 AM");
  const [checkOut, setCheckOut] = useState(preFillData?.checkOut || "06:00 PM");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preFillData) {
      if (!preFillData.checkIn || preFillData.checkIn === "--") setRequestType("checkin");
      else if (!preFillData.checkOut || preFillData.checkOut === "--") setRequestType("checkout");
      else setRequestType("both");
    }
  }, [preFillData]);

  const handleSubmit = async () => {
    if (!date || !requestType) {
      alert("Please select a date and request type.");
      return;
    }

    setLoading(true);

    const payload = {
      target_date: date,
      issued_for_in_time: (requestType === "checkin" || requestType === "both") ? createIsoDateTime(date, checkIn) : null,
      issued_for_out_time: (requestType === "checkout" || requestType === "both") ? createIsoDateTime(date, checkOut) : null,
      comment: comment
    };

    try {
      const response = await fetch(`${REG_API_URL}/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitted(true);
        if (onSuccess) onSuccess();
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.detail || "Failed to submit request"}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("An error occurred while communicating with the server.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return <SuccessModal onClose={onClose} />;

  return (
    <div className="rm-overlay">
      <div className="rm-modal">
        <div className="rm-header">
          <span style={{ fontWeight: "500" }}>New Regularization Request</span>
          <span style={{ cursor: "pointer" }} onClick={onClose}>✕</span>
        </div>

        <div className="rm-body">
          <div className="rm-field">
            <label className="rm-label">Employee Name</label>
            <input
              className="rm-input rm-input-disabled"
              value={employeeName || "Loading..."}
              disabled
            />
          </div>

          <div className="rm-field">
            <label className="rm-label">Date</label>
            <input className="rm-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} readOnly={!!preFillData?.date} />
          </div>

          <div className="rm-field">
            <label className="rm-label">Type of Request</label>
            <select className="rm-select" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
              <option value="">Select Type of Request</option>
              <option value="checkin">Check In Request</option>
              <option value="checkout">Check Out Request</option>
              <option value="both">Check In & Check Out Request</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            {(requestType === "checkin" || requestType === "both") && (
              <TimePicker label="Check In" value={checkIn} onChange={setCheckIn} />
            )}
            {(requestType === "checkout" || requestType === "both") && (
              <TimePicker label="Check Out" value={checkOut} onChange={setCheckOut} />
            )}
          </div>

          <div className="rm-field">
            <label className="rm-label">Comment</label>
            <textarea className="rm-textarea" rows={3} placeholder="Comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>

        <div className="rm-footer">
          <button className="rm-cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="rm-submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};


/* ═══════════════════════ AttendanceLogsModal ═══════════════════════ */

const AttendanceLogsModal = ({ record, userName, onClose, userRole }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayUserName = userName || record?.employee?.first_name || "User";
  const isTeamLeader = userRole === "teamleader";

  useEffect(() => {
    if (!record) return;

    const generatedLogs = [];
    const cleanUserName = displayUserName.split(" ")[0].trim();
    const dateObj = record.date ? new Date(record.date) : new Date();
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    const monthStr = dateObj.toLocaleString("en-GB", { month: "long" });
    const formattedDate = `${dayStr}${monthStr}`;

    const getFullImageUrl = (imgStr) => {
      if (!imgStr) return null;
      if (imgStr.startsWith("https")) return imgStr;

      let normalizedPath = imgStr.replace(/\\/g, '/');
      const path = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;

      const rootUrl = API_BASE_URL.replace("/api/v1", "");
      return `${rootUrl}${path}`;
    }

    if (record.punch_in_time) {
      generatedLogs.push({
        id: "in_" + record.id,
        punchType: "in",
        time: record.punch_in_time,
        capture_type: "Mobile app",
        location: record.punch_in_location || record.location || "--",
        regularization: record.regularization_status || "--",
        selfie_url: getFullImageUrl(record.punch_in_image || record.punch_in_photo || record.image_url),
        downloadName: `${cleanUserName}_${formattedDate}_in.png`
      });
    }

    if (record.punch_out_time) {
      generatedLogs.push({
        id: "out_" + record.id,
        punchType: "out",
        time: record.punch_out_time,
        capture_type: "Mobile app",
        location: record.punch_out_location || record.location || "--",
        regularization: record.regularization_status || "--",
        selfie_url: getFullImageUrl(record.punch_out_image || record.punch_out_photo),
        downloadName: `${cleanUserName}_${formattedDate}_out.png`
      });
    }

    setLogs(generatedLogs);
    setLoading(false);
  }, [record, displayUserName]);

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.warn("Fetch blocked by CORS, falling back to opening image...", error);
      const link = document.createElement('a');
      link.href = url;
      link.target = "_blank";
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="logs-overlay" onClick={handleOverlayClick}>
      <div className="logs-modal">
        <div className="logs-modal-header">
          <div className="logs-modal-title">
            Attendance Logs for {displayUserName}
            <div className="logs-modal-subtitle">{fmtDate(record?.date)}</div>
          </div>
          <button className="logs-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="logs-modal-body">
          {loading ? (
            <div className="logs-loading">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="logs-empty">No logs found for this day.</div>
          ) : (
            <div className="logs-table-wrapper">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Capture Type</th>
                    <th>Location</th>
                    <th>Regularization</th>
                    <th>Selfie</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="logs-time">{fmt12(log.time)}</td>
                      <td>{log.capture_type}</td>
                      <td className="logs-location-cell">{log.location}</td>
                      <td>{log.regularization}</td>
                      <td style={{ textAlign: 'center' }}>
                        {log.selfie_url ? (
                          <button
                            className="logs-selfie-btn"
                            title={isTeamLeader ? "Download disabled for Team Leaders" : "Download Selfie"}
                            onClick={() => !isTeamLeader && handleDownload(log.selfie_url, log.downloadName)}
                            disabled={isTeamLeader}
                            style={{
                              opacity: isTeamLeader ? 0.5 : 1,
                              cursor: isTeamLeader ? "not-allowed" : "pointer"
                            }}
                          >
                            ⬇
                          </button>
                        ) : (
                          <span style={{ color: '#ccc' }}>--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════ SummaryPanel ═══════════════════════ */

const SummaryPanel = ({ records, month }) => {
  const label = new Date(month + "-01").toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });

  let present = 0, absent = 0, invalid = 0, halfDay = 0, leaves = 0,
    holidays = 0, weekOff = 0, totalMins = 0;

  records.forEach((r) => {
    const s = (r?.status || "").toLowerCase();

    const hasPunchIn = !!r.punch_in_time;
    const hasPunchOut = !!r.punch_out_time;
    const isMissingOnePunch = hasPunchIn !== hasPunchOut;
    const isMissingBothPunches = !hasPunchIn && !hasPunchOut;

    if (isMissingBothPunches) absent++;
    else if (isMissingOnePunch) invalid++;
    else if (s.includes("half")) halfDay++;
    else if (s.includes("present")) present++;
    else if (s.includes("absent")) absent++;
    else if (s.includes("invalid")) invalid++;
    else if (s.includes("leave")) leaves++;
    else if (s.includes("holiday")) holidays++;
    else if (s.includes("week") || s.includes("off")) weekOff++;

    if (r?.hours_completed && !isMissingOnePunch && !isMissingBothPunches) {
      totalMins += Number(r.hours_completed) * 60;
    }
  });

  const totalH = Math.floor(totalMins / 60);
  const totalM = Math.round(totalMins % 60);
  const totalStr = `${String(totalH).padStart(2, "0")}:${String(totalM).padStart(2, "0")}`;

  const rows = [
    { label: "Present Days", value: present.toFixed(1), cls: "sum-teal" },
    { label: "Absent Days", value: absent.toFixed(1), cls: "sum-red" },
    { label: "Invalid Days", value: invalid.toFixed(1), cls: "sum-black" },
    { label: "Half Day Present", value: halfDay.toFixed(1), cls: "sum-lightblue" },
    { label: "Approved Leaves", value: leaves.toFixed(1), cls: "sum-lightblue" },
    { label: "Holidays", value: holidays.toFixed(1), cls: "sum-orange" },
    { label: "Weekly Off", value: weekOff.toFixed(1), cls: "sum-orange" },
  ];

  return (
    <div className="summary-panel">
      <div className="summary-title">
        <span>{label} Summary</span>
        <span className="summary-info" title="Month summary">ℹ</span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className={`summary-row ${row.cls}`}>
          <span style={{ fontWeight: row.cls === "sum-black" ? 600 : 500 }}>{row.label}</span>
          <span style={{ fontWeight: 700 }}>{row.value}</span>
        </div>
      ))}
      <div className="summary-row summary-total-row sum-teal">
        <span style={{ fontWeight: 600 }}>Total Worked Hours</span>
        <span style={{ fontWeight: 700 }}>{totalStr}</span>
      </div>
    </div>
  );
};

/* ═══════════════════════ MonthlyBarChart ═══════════════════════ */

const MonthlyBarChart = ({ records, chartType }) => {
  const grouped = {};
  let barColor = "#2cb28b";
  let yLabel = "Records";

  if (chartType === "Absent Days") { barColor = "#d32f2f"; yLabel = "Absent Records"; }
  else if (chartType === "Half Day Present") { barColor = "#5aa0ff"; yLabel = "Half Day Records"; }
  else if (chartType === "Approved Leaves") { barColor = "#5aa0ff"; yLabel = "Leave Records"; }
  else if (chartType === "WeekOff/Holidays") { barColor = "#f28e2b"; yLabel = "WeekOff Records"; }
  else if (chartType === "Total Regularized Days") { barColor = "#888888"; yLabel = "Regularized Records"; }
  else { yLabel = "Present Records"; }

  records.forEach((r) => {
    if (!r?.date) return;
    const d = new Date(r.date);
    if (isNaN(d)) return;
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", "-");

    if (!grouped[key]) grouped[key] = { month: key, count: 0, _ts: d.getTime() };

    const s = (r.status || "").toLowerCase();

    const hasPunchIn = !!r.punch_in_time;
    const hasPunchOut = !!r.punch_out_time;
    const isMissingOnePunch = hasPunchIn !== hasPunchOut;
    const isMissingBothPunches = !hasPunchIn && !hasPunchOut;

    let shouldCount = false;

    if (chartType === "Present Days" && s.includes("present") && !s.includes("half") && !isMissingOnePunch && !isMissingBothPunches) shouldCount = true;
    else if (chartType === "Half Day Present" && s.includes("half") && !isMissingOnePunch && !isMissingBothPunches) shouldCount = true;
    else if (chartType === "Absent Days" && (s.includes("absent") || isMissingBothPunches)) shouldCount = true;
    else if (chartType === "Approved Leaves" && s.includes("leave")) shouldCount = true;
    else if (chartType === "WeekOff/Holidays" && (s.includes("week") || s.includes("off") || s.includes("holiday"))) shouldCount = true;
    else if (chartType === "Total Regularized Days" && s.includes("regularized")) shouldCount = true;

    if (shouldCount) grouped[key].count++;
  });

  const data = Object.values(grouped).sort((a, b) => a._ts - b._ts);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#9ca3af", fontSize: 12 }}
          label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 15, style: { fill: "#9ca3af", fontSize: 11, textAnchor: "middle" } }}
          width={60}
        />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }} />
        <Bar dataKey="count" fill={barColor} radius={[6, 6, 0, 0]} maxBarSize={60} />
      </BarChart>
    </ResponsiveContainer>
  );
};

/* ═══════════════════════ Main Component ═══════════════════════ */

const ViewAllAttendance = () => {
  const location = useLocation();
  const selectedEmpCode = location.state?.empCode;
  const selectedEmpName = location.state?.employeeName;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [chartType, setChartType] = useState("Present Days");

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [logsRecord, setLogsRecord] = useState(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const [selectedRegData, setSelectedRegData] = useState(null);

  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role")?.toLowerCase() || "employee";
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    if (selectedEmpName) {
      setUserName(selectedEmpName);
      return;
    }

    const fetchProfile = async () => {
      try {
        const empCode = localStorage.getItem("emp_code");
        const res = await fetch(`${API_BASE_URL}/profile/${empCode}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const fullName = data?.first_name && data?.last_name ? `${data.first_name} ${data.last_name}`
          : data?.user?.first_name ? `${data.user.first_name} ${data.user.last_name || ""}`
            : data?.employee?.first_name ? `${data.employee.first_name} ${data.employee.last_name || ""}`
              : data?.firstName ? `${data.firstName} ${data.lastName || ""}` : data?.name ? data.name : "";
        setUserName(fullName);
      } catch (err) {
        console.error("Profile fetch error", err);
      }
    };
    fetchProfile();
  }, [token, selectedEmpName]);

  useEffect(() => {
    setLoading(true);

    const endpoint = selectedEmpCode ? `/attendance/employee/${selectedEmpCode}` : `/attendance/me`;

    fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch attendance data");
        return res.json();
      })
      .then((data) => setRecords(Array.isArray(data) ? data : data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, selectedEmpCode]);

  const handleOpenRegularization = (rec) => {
    const inTime = rec.punch_in_time ? fmt12(rec.punch_in_time) : "09:00 AM";
    const outTime = rec.punch_out_time ? fmt12(rec.punch_out_time) : "06:00 PM";

    setSelectedRegData({
      date: rec.date ? rec.date.split("T")[0] : "",
      checkIn: inTime !== "--" ? inTime : "09:00 AM",
      checkOut: outTime !== "--" ? outTime : "06:00 PM",
    });
    setShowRegModal(true);
  };

  const selectedYear = selectedMonth.split("-")[0];
  const generatedMonths = Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, "0")}`);
  const allApiMonths = records.filter((r) => r?.date).map((r) => r.date.slice(0, 7));
  const availableMonths = [...new Set([...allApiMonths, ...generatedMonths])].sort();

  const filtered = records.filter((r) => r?.date?.startsWith(selectedMonth)).sort((a, b) => new Date(a.date) - new Date(b.date));

  const [yearNum, monthNum] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const allDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return `${selectedMonth}-${day}`;
  });

  return (
    <div className="att-all-container">
      <div className="att-all-header" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <div className="header-actions">
          <select className="month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{new Date(m + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</option>
            ))}
          </select>
          <button className="btn-download-att">⬇ Download</button>
        </div>
      </div>

      <div className="att-top-grid">
        <div className="att-card chart-card">
          <div className="chart-header">
            <span className="chart-title">{chartType}</span>
            <select className="chart-menu-select" value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="Present Days">Present Days</option>
              <option value="Half Day Present">Half Day Present</option>
              <option value="Absent Days">Absent Days</option>
              <option value="Approved Leaves">Approved Leaves</option>
              <option value="WeekOff/Holidays">WeekOff/Holidays</option>
              <option value="Total Regularized Days">Total Regularized Days</option>
            </select>
          </div>
          {loading ? <div className="shimmer" style={{ height: 240 }} /> : <MonthlyBarChart records={records} chartType={chartType} />}
        </div>
        {loading ? <div className="att-card shimmer" style={{ minHeight: 100 }} /> : <SummaryPanel records={filtered} month={selectedMonth} />}
      </div>

      <div className="att-all-card" style={{ marginTop: 20, overflowX: "auto" }}>
        <table className="att-all-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Working Hrs.</th>
              <th>Status</th>
              <th>Shift Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>Loading…</td></tr>
            ) : (
              allDays.map((dateStr) => {
                const rec = filtered.find((r) => r?.date?.startsWith(dateStr));

                if (rec) {
                  let hrs = Number(rec.hours_completed);
                  if (isNaN(hrs) || hrs === 0) {
                    if (rec.punch_in_time && rec.punch_out_time) {
                      hrs = (new Date(rec.punch_out_time) - new Date(rec.punch_in_time)) / 3600000;
                    }
                  }

                  const hasPunchIn = !!rec.punch_in_time;
                  const hasPunchOut = !!rec.punch_out_time;
                  const isMissingOnePunch = hasPunchIn !== hasPunchOut;
                  const isMissingBothPunches = !hasPunchIn && !hasPunchOut;

                  let displayStatus = rec.status || "--";
                  let statusClass = "va-status-invalid";

                  if (isMissingBothPunches) {
                    displayStatus = "Absent";
                    statusClass = "va-status-absent";
                  } else if (isMissingOnePunch) {
                    displayStatus = "Invalid";
                    statusClass = "va-status-invalid";
                  } else if (hasPunchIn && hasPunchOut) {
                    if (hrs < 9) {
                      displayStatus = "Half Day Present";
                      statusClass = "va-status-halfday";
                    } else {
                      displayStatus = "Present";
                      statusClass = "va-status-present";
                    }
                  } else {
                    const s = displayStatus.toLowerCase();
                    if (s.includes("absent")) statusClass = "va-status-absent";
                    if (s.includes("week") || s.includes("off")) statusClass = "va-status-weekoff";
                    if (s.includes("leave") || s.includes("holiday")) statusClass = "va-status-leave";
                  }

                  return (
                    <tr key={rec.id || dateStr}>
                      <td>{fmtDate(rec.date)}</td>
                      <td>{fmt12(rec.punch_in_time)}</td>
                      <td>{fmt12(rec.punch_out_time)}</td>
                      <td>{hrs && !isMissingOnePunch ? `${Math.floor(hrs)}h ${Math.round((hrs % 1) * 60)}m` : "--"}</td>
                      <td className={statusClass}>{displayStatus}</td>
                      <td>{rec.shift_time || "10:00 AM - 07:00 PM"}</td>
                      <td>
                        <div className="action-btns">
                          <button className="action-btn" title="View logs" onClick={() => setLogsRecord(rec)}>≡</button>
                          {!selectedEmpCode && (
                            <button
                              className="action-btn btn-add"
                              title="Regularize"
                              onClick={() => handleOpenRegularization(rec)}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
                else {
                  // 🔥 UPDATED LOGIC: Calculate Week Offs & default to "--"
                  const isOff = checkIsWeekOff(dateStr);

                  const defaultStatus = isOff ? "Week Off" : "--";
                  const defaultClass = isOff ? "va-status-weekoff" : "";

                  return (
                    <tr key={dateStr}>
                      <td>{fmtDate(dateStr)}</td>
                      <td>00:00</td>
                      <td>00:00</td>
                      <td>00:00 Hrs.</td>
                      <td className={defaultClass}>{defaultStatus}</td>
                      <td>10:00 AM - 07:00 PM</td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="action-btn"
                            title="View logs"
                            onClick={() => setLogsRecord({ date: dateStr })}
                          >
                            ≡
                          </button>
                          {!selectedEmpCode && (
                            <button
                              className="action-btn btn-add"
                              title="Regularize"
                              onClick={() => handleOpenRegularization({ date: dateStr })}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
              })
            )}
          </tbody>
        </table>
      </div>

      {logsRecord && <AttendanceLogsModal record={logsRecord} userName={userName} onClose={() => setLogsRecord(null)} userRole={userRole} />}

      {showRegModal && !selectedEmpCode && (
        <RegularizationModal
          onClose={() => setShowRegModal(false)}
          onSuccess={() => {
            setShowRegModal(false);
          }}
          employeeName={userName}
          preFillData={selectedRegData}
        />
      )}
    </div>
  );
};

export default ViewAllAttendance;
