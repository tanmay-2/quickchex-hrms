import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/sidebar/sidebar_tl";
import "./TeamAttendance.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const TeamAttendance = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]); // 🔥 Added for summary
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyTeam();
    fetchTodaySummary(); // 🔥 Fetch summary on load
  }, []);

  const fetchMyTeam = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/profile/team/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch team members");
      const data = await res.json();
      setTeamMembers(data);
    } catch (err) {
      setError("Could not load your team.");
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 NEW: Fetch Today's Attendance for Summary
  const fetchTodaySummary = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/v1/attendance/admin/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAttendanceData(json);
      }
    } catch (err) {
      console.error("Summary fetch error:", err);
    }
  };

  // ✅ Dynamic Summary Calculations
  const presentCount = attendanceData.filter(d => d.status?.toLowerCase() === 'present').length;
  const absentCount = attendanceData.filter(d => d.status?.toLowerCase() === 'absent').length;

  // 🔥 UPDATED: Now calculates based on the backend 'remark' field
  const lateCount = attendanceData.filter(d => d.remark?.toLowerCase() === 'late').length;

  const handleImageError = (empCode) => {
    setTeamMembers(prev => prev.map(emp => emp.emp_code === empCode ? { ...emp, profile_image: null } : emp));
  };

  const handleEmployeeClick = (empCode, empName) => {
    navigate(`/attendance/all`, { state: { empCode, employeeName: empName } });
  };

  return (
    <div className="layout">
      <Sidebar expanded={expanded} setExpanded={setExpanded} />

      <div className={`main-content ${expanded ? "shifted" : ""}`}>
        {/* 🔥 BEAUTIFIED SUMMARY SECTION */}
        <div className="summary-container beauty-mode">
          <div className="summary-header">
            <div>
              <h3>Attendance Details Today</h3>
              <p>Data from the {teamMembers.length} total team members</p>
            </div>
          </div>

          <div className="summary-beauty-grid">
            {/* Present Part */}
            <div className="stat-column">
              <div className="info-row centered">
                <span>👤</span>
                <b>Present</b>
                <div className="metric large">{presentCount}</div>
              </div>
            </div>

            {/* Late Part */}
            <div className="stat-column">
              <div className="info-row centered">
                <span>🕒</span>
                <b>Late</b>
                <div className="metric large late">{lateCount}</div>
              </div>
            </div>

            {/* Absent Part */}
            <div className="stat-column">
              <div className="info-row centered">
                <span>❌</span>
                <b>Absent</b>
                <div className="metric large absent">{absentCount}</div>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {isLoading ? (
          <div className="loading-state">Loading your team...</div>
        ) : (
          <div className="team-grid">
            {teamMembers.map((emp) => {
              const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
              return (
                <div key={emp.emp_code} className="team-member-card" onClick={() => handleEmployeeClick(emp.emp_code, fullName)}>
                  <div className="card-avatar">
                    {emp.profile_image ? (
                      <img src={emp.profile_image} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => handleImageError(emp.emp_code)} />
                    ) : (
                      <>{emp.first_name?.charAt(0) || ""}{emp.last_name?.charAt(0) || ""}</>
                    )}
                  </div>
                  <div className="card-details">
                    <h3>{fullName || "Unknown Name"}</h3>
                    <span className="emp-badge">{emp.emp_code}</span>
                    <p className="emp-role">{emp.designation || "Employee"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamAttendance;