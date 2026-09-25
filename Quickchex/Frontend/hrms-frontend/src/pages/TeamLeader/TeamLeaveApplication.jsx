import React, { useState, useEffect } from "react";
import SidebarTL from "../../components/sidebar/sidebar_tl";
import "./TeamLeaveApplication.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const TeamLeaveApplication = () => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("Pending");
  const token = localStorage.getItem("token");

  const [allRequests, setAllRequests] = useState([]);

  const isWeekday = (date) => {
    if (!date) return false;
    const day = date.getDay();
    if (day === 0) return false;
    if (day === 6) {
      const week = Math.ceil(date.getDate() / 7);
      if (week === 4) return false;
    }
    return true;
  };

  const getCalculatedDays = (startStr, endStr, hasHalf, halfDetails) => {
    if (!startStr || !endStr) return 0;
    let count = 0;
    let current = new Date(startStr);
    current.setHours(0, 0, 0, 0);
    let targetEnd = new Date(endStr);
    targetEnd.setHours(0, 0, 0, 0);

    while (current <= targetEnd) {
      if (isWeekday(current)) count++;
      current.setDate(current.getDate() + 1);
    }

    if (hasHalf) {
      let safeArr = [];
      if (Array.isArray(halfDetails)) safeArr = halfDetails;
      else if (typeof halfDetails === 'string') safeArr = halfDetails.split(",");

      if (safeArr.length > 0) {
        safeArr.forEach(d => {
          let hd = new Date(d);
          hd.setHours(0, 0, 0, 0);
          if (isWeekday(hd) && hd >= new Date(startStr).setHours(0, 0, 0, 0) && hd <= targetEnd.getTime()) {
            count -= 0.5;
          }
        });
      } else {
        count -= 0.5;
      }
    }
    return Math.max(0, count);
  };

  useEffect(() => {
    const fetchTeamLeaves = async () => {
      const tlEmpCode = localStorage.getItem("emp_code");
      if (!tlEmpCode || !token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/leaves/team/${tlEmpCode}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();

          const formattedData = data.map((item) => {
            const backendDays = item.totalDays !== undefined ? parseFloat(item.totalDays) : 0;
            const finalDays = backendDays > 0 ? backendDays : getCalculatedDays(item.startDate, item.endDate, item.has_half_days, item.half_day_details);

            return {
              id: item.id,
              name: item.name || "Unknown",
              role: item.role || "Employee",
              empCode: item.empCode,
              category: item.category,
              startDate: item.startDate,
              endDate: item.endDate,
              totalDays: finalDays,
              reason: item.reason || "-",
              status: item.status
            };
          });
          setAllRequests(formattedData);
        }
      } catch (err) {
        console.error("Error fetching team leaves:", err);
      }
    };
    fetchTeamLeaves();
  }, [token]);

  const handleApprove = async (id) => {
    setAllRequests(prev => prev.map(req => req.id === id ? { ...req, status: "Approved" } : req));
    try {
      await fetch(`${API_BASE_URL}/api/v1/leaves/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Failed to approve leave on backend:", err);
    }
  };

  const handleReject = async (id) => {
    setAllRequests(prev => prev.map(req => req.id === id ? { ...req, status: "Rejected" } : req));
    try {
      await fetch(`${API_BASE_URL}/api/v1/leaves/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Failed to reject leave on backend:", err);
    }
  };

  const formatTableDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const pendingData = allRequests.filter(req => req.status === "Pending");
  const completedData = allRequests.filter(req => req.status !== "Pending");
  const currentData = activeTab === "Pending" ? pendingData : completedData;

  return (
    <div className="team-leave-screen">
      <div className="app-layout">
        <SidebarTL expanded={expanded} setExpanded={setExpanded} />

        <div className={`main-wrapper ${expanded ? "expanded" : "collapsed"}`}>

          <div className="page-header" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="header-actions">
              <button className="btn-export">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export Report
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          </div>

          <div className="table-section">

            <div className="table-controls" style={{ paddingBottom: '10px', borderBottom: 'none' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Leave Requests</h3>
              <div className="filters">
                <button className="filter-btn">
                  Sort By : Newest First
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginLeft: '6px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            </div>

            <div className="tab-container">
              <button
                className={`tab-btn ${activeTab === "Pending" ? "active" : ""}`}
                onClick={() => setActiveTab("Pending")}
              >
                Pending Requests ({pendingData.length})
              </button>
              <button
                className={`tab-btn ${activeTab === "Completed" ? "active" : ""}`}
                onClick={() => setActiveTab("Completed")}
              >
                Completed Requests ({completedData.length})
              </button>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "center" }}>Employee</th>
                    <th style={{ textAlign: "center" }}>Leave Type</th>
                    <th style={{ textAlign: "center" }}>From</th>
                    <th style={{ textAlign: "center" }}>To</th>
                    <th style={{ textAlign: "center" }}>Days</th>
                    <th style={{ textAlign: "center" }}>Reason</th>
                    {activeTab === "Completed" && <th style={{ textAlign: "center" }}>Status</th>}
                    {activeTab === "Pending" && <th style={{ textAlign: "center" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                        No {activeTab.toLowerCase()} requests found.
                      </td>
                    </tr>
                  ) : (
                    currentData.map((item) => (
                      <tr key={item.id}>
                        <td style={{ textAlign: "center" }}>
                          <div className="employee-cell" style={{ justifyContent: "center" }}>
                            <div className="emp-info">
                              <span className="emp-name" style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                              <span className="emp-dept" style={{ fontSize: '12px', color: '#64748b' }}>{item.role} ({item.empCode})</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="leave-type" style={{ color: '#3b82f6', fontWeight: 500 }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>{formatTableDate(item.startDate)}</td>
                        <td style={{ textAlign: "center" }}>{formatTableDate(item.endDate)}</td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{item.totalDays} Days</td>
                        {/* ✅ FIXED: Allows text to wrap to the next line naturally */}
                        <td
                          style={{ maxWidth: "250px", whiteSpace: "normal", wordWrap: "break-word", textAlign: "center" }}
                        >
                          {item.reason}
                        </td>

                        {activeTab === "Completed" ? (
                          <td style={{ textAlign: "center" }}>
                            <span className={`badge ${item.status === 'Approved' ? 'badge-approved' : 'badge-rejected'}`}>
                              {item.status}
                            </span>
                          </td>
                        ) : (
                          <td style={{ textAlign: "center" }}>
                            <div className="action-buttons" style={{ justifyContent: "center" }}>
                              <button
                                className="btn-action btn-approve"
                                onClick={() => handleApprove(item.id)}
                                title="Approve Leave"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                Approve
                              </button>
                              <button
                                className="btn-action btn-reject"
                                onClick={() => handleReject(item.id)}
                                title="Reject Leave"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                Reject
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TeamLeaveApplication;
