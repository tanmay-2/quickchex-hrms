import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin
} from "lucide-react";

export default function AdminEmployeeAttendanceCalendar() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [fetchingLoc, setFetchingLoc] = useState(false);

  const detectLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setFetchingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const geoData = await res.json();
          const addr = geoData?.address;
          if (addr) {
            const locStr = [addr.suburb || addr.neighbourhood, addr.city || addr.town || addr.district || addr.county, addr.state, addr.country].filter(Boolean).join(", ");
            setLiveLocation(locStr || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } else {
            setLiveLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (e) {
          setLiveLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setFetchingLoc(false);
        }
      },
      (err) => {
        setFetchingLoc(false);
        alert("Unable to fetch location: " + err.message);
      }
    );
  };

  const fetchCalendar = (y, m) => {
    setLoading(true);
    fetch(`http://localhost:8000/admin/employees/${employeeId}/attendance-calendar?year=${y}&month=${m}`, {
      headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData && resData.employee) {
          setData(resData);
        }
      })
      .catch((err) => console.warn("Error fetching employee calendar:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCalendar(currentYear, currentMonth);
  }, [employeeId, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  const emp = data?.employee || {};
  const summary = data?.summary || { present: 0, absent: 0, half_day: 0, leave: 0, holidays: 0, week_off: 0, working_days: 0 };
  const calendarDays = data?.calendar || [];

  const displayName = useMemo(() => {
    if (!emp) return "Employee";
    const fn = (emp.first_name || "").trim();
    const ln = (emp.last_name || "").trim();
    const combined = `${fn} ${ln}`.trim();
    if (combined) return combined;
    if (emp.name && !emp.name.includes("@") && emp.name.toLowerCase() !== "employee" && emp.name !== emp.emp_code) {
      return emp.name.trim();
    }
    if (emp.email && emp.email.includes("@")) {
      const local = emp.email.split("@")[0];
      return local.replace(/[._\-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return emp.emp_code || "Employee";
  }, [emp]);

  const renderBadge = (code) => {
    switch (code) {
      case "P":
        return <span style={{ padding: "3px 7px", borderRadius: "6px", background: "#dcfce7", color: "#15803d", fontWeight: 700, fontSize: "11px" }}>P</span>;
      case "A":
        return <span style={{ padding: "3px 7px", borderRadius: "6px", background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: "11px" }}>A</span>;
      case "HD":
        return <span style={{ padding: "3px 7px", borderRadius: "6px", background: "#fef3c7", color: "#b45309", fontWeight: 700, fontSize: "11px" }}>HD</span>;
      case "L":
        return <span style={{ padding: "3px 7px", borderRadius: "6px", background: "#f3e8ff", color: "#7e22ce", fontWeight: 700, fontSize: "11px" }}>L</span>;
      case "1H":
        return <span style={{ padding: "3px 7px", borderRadius: "6px", background: "#f3e8ff", color: "#6b21a8", fontWeight: 700, fontSize: "11px" }}>1H Leave</span>;
      case "2H":
        return <span style={{ padding: "3px 7px", borderRadius: "6px", background: "#f3e8ff", color: "#6b21a8", fontWeight: 700, fontSize: "11px" }}>2H Leave</span>;
      case "H":
        return <span style={{ padding: "3px 7px", borderRadius: "6px", background: "#ffedd5", color: "#c2410c", fontWeight: 700, fontSize: "11px" }}>H</span>;
      case "WO":
        return <span style={{ padding: "3px 7px", borderRadius: "6px", background: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: "11px" }}>WO</span>;
      case "MP":
        return <span style={{ padding: "3px 7px", borderRadius: "6px", background: "#ffe4e6", color: "#e11d48", fontWeight: 700, fontSize: "11px" }}>MP</span>;
      default:
        return <span style={{ padding: "3px 7px", borderRadius: "6px", background: "#f8fafc", color: "#94a3b8", fontWeight: 600, fontSize: "11px" }}>—</span>;
    }
  };

  return (
    <div className="dash-page-container">
      {/* Top Header & Back Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "9px",
            border: "1px solid var(--border, #e2e8f0)",
            background: "var(--surface, #ffffff)",
            color: "var(--text, #0f172a)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <span style={{ fontSize: "13px", fontWeight: 700, color: "#7c3aed" }}>
          Employee Attendance Calendar
        </span>
      </div>

      {/* Employee Details Card */}
      <div className="card" style={{ padding: "20px 24px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(109,40,217,0.01) 100%)", border: "1px solid rgba(124,58,237,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#6366f1", color: "#ffffff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "20px" }}>
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--text, #0f172a)" }}>{displayName}</h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted, #64748b)" }}>
              Employee · {emp.department || "Operations"} Department
            </p>
          </div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "12px" }}>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Reporting Manager</span>
              <strong style={{ fontSize: "13px" }}>{emp.manager || "—"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Email ID</span>
              <strong style={{ fontSize: "13px" }}>{emp.email || "—"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Contact</span>
              <strong style={{ fontSize: "13px" }}>{emp.contact || emp.phone || emp.mobile_no || "—"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Employee Code</span>
              <strong style={{ fontSize: "13px" }}>{emp.emp_code || emp.id || "—"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Location</span>
              <strong style={{ fontSize: "13px" }}>{emp.location || emp.branch_location || "Mumbai, India"}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Attendance Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
        <div className="card" style={{ padding: "14px", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>Present</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "22px", fontWeight: 700, color: "#16a34a" }}>{summary.present}</h3>
        </div>
        <div className="card" style={{ padding: "14px", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 700 }}>Absent</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "22px", fontWeight: 700, color: "#dc2626" }}>{summary.absent}</h3>
        </div>
        <div className="card" style={{ padding: "14px", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 700 }}>Half Day</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "22px", fontWeight: 700, color: "#d97706" }}>{summary.half_day}</h3>
        </div>
        <div className="card" style={{ padding: "14px", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "11px", color: "#9333ea", fontWeight: 700 }}>Leave</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "22px", fontWeight: 700, color: "#9333ea" }}>{summary.leave}</h3>
        </div>
        <div className="card" style={{ padding: "14px", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "11px", color: "#ea580c", fontWeight: 700 }}>Holidays</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "22px", fontWeight: 700, color: "#ea580c" }}>{summary.holidays}</h3>
        </div>
        <div className="card" style={{ padding: "14px", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Week Off</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "22px", fontWeight: 700, color: "#64748b" }}>{summary.week_off}</h3>
        </div>
        <div className="card" style={{ padding: "14px", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 700 }}>Working Days</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "22px", fontWeight: 700, color: "#7c3aed" }}>{summary.working_days}</h3>
        </div>
      </div>

      {/* Monthly Attendance Calendar Card */}
      <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
        {/* Calendar Month Navigation Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <CalendarIcon size={18} color="#7c3aed" /> {data?.monthLabel || ""} Monthly Calendar
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handlePrevMonth}
              style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", background: "var(--surface, #ffffff)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600 }}
            >
              <ChevronLeft size={16} /> Previous Month
            </button>
            <button
              onClick={handleToday}
              style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", background: "var(--surface, #ffffff)", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", background: "var(--surface, #ffffff)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600 }}
            >
              Next Month <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px", fontSize: "11px", fontWeight: 600, padding: "10px", background: "var(--surface-2, #f8fafc)", borderRadius: "9px" }}>
          <span style={{ color: "var(--text-muted, #64748b)" }}>Legend:</span>
          <span><strong style={{ color: "#15803d" }}>P</strong> Present</span>
          <span><strong style={{ color: "#b91c1c" }}>A</strong> Absent</span>
          <span><strong style={{ color: "#b45309" }}>HD</strong> Half Day</span>
          <span><strong style={{ color: "#7e22ce" }}>L</strong> Full Day Leave</span>
          <span><strong style={{ color: "#6b21a8" }}>1H</strong> First Half Leave</span>
          <span><strong style={{ color: "#6b21a8" }}>2H</strong> Second Half Leave</span>
          <span><strong style={{ color: "#c2410c" }}>H</strong> Holiday</span>
          <span><strong style={{ color: "#475569" }}>WO</strong> Week Off</span>
          <span><strong style={{ color: "#e11d48" }}>MP</strong> Missing Punch</span>
        </div>

        {/* Calendar Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <div key={dayName} style={{ textAlign: "center", padding: "8px", fontWeight: 700, fontSize: "12px", color: "var(--text-muted, #64748b)", background: "var(--surface-2, #f8fafc)", borderRadius: "6px" }}>
              {dayName}
            </div>
          ))}

          {loading ? (
            <div style={{ gridColumn: "span 7", padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
              Loading calendar...
            </div>
          ) : (
            calendarDays.map((item) => (
              <div
                key={item.day}
                onClick={() => setSelectedDayDetail(item)}
                style={{
                  padding: "10px 8px",
                  minHeight: "72px",
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: "10px",
                  background: "var(--surface, #ffffff)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justify: "space-between",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700 }}>{item.day}</span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted, #64748b)" }}>{item.dayName}</span>
                </div>

                <div style={{ textAlign: "center", marginTop: "6px" }}>
                  {renderBadge(item.badge_code)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Date Details Modal / Drawer */}
      {selectedDayDetail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "grid", placeItems: "center", zIndex: 9999, padding: "16px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "440px", borderRadius: "16px", padding: "24px", background: "var(--surface, #ffffff)", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border, #e2e8f0)", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Attendance Date Details</h3>
              <button onClick={() => setSelectedDayDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #64748b)" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Date:</span>
                <strong>{selectedDayDetail.date} ({selectedDayDetail.dayName})</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Employee Name:</span>
                <strong>{emp.name && !emp.name.includes('@') ? emp.name : (emp.email && emp.email.includes('@') ? emp.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : emp.name || emp.emp_code)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Employee Code:</span>
                <strong>{emp.emp_code}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Attendance Status:</span>
                <div>{renderBadge(selectedDayDetail.badge_code)}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Punch In:</span>
                <strong>{selectedDayDetail.checkIn}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Punch Out:</span>
                <strong>{selectedDayDetail.checkOut}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Working Hours:</span>
                <strong>{selectedDayDetail.workingHours}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Location:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <strong>{liveLocation || selectedDayDetail.location || emp.branch_location || "Mumbai, India"}</strong>
                  <button
                    onClick={detectLiveLocation}
                    disabled={fetchingLoc}
                    title="Get Current GPS Location"
                    style={{
                      background: "rgba(124,58,237,0.08)",
                      border: "1px solid rgba(124,58,237,0.25)",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#7c3aed",
                      cursor: fetchingLoc ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <MapPin size={12} color="#7c3aed" />
                    {fetchingLoc ? "Detecting..." : "Get Live Location"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Leave Status:</span>
                <strong>{selectedDayDetail.leave_status || "None"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Reporting Manager:</span>
                <strong>{emp.manager || "—"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted, #64748b)" }}>Remarks:</span>
                <strong>{selectedDayDetail.remarks || "—"}</strong>
              </div>
            </div>

            <button
              onClick={() => setSelectedDayDetail(null)}
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "10px",
                borderRadius: "9px",
                background: "#7c3aed",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
