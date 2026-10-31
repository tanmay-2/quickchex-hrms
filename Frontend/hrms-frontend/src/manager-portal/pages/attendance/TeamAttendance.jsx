// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - TEAMATTENDANCE.JSX
// Path: Frontend/hrms-frontend/src/manager-portal/pages/attendance/TeamAttendance.jsx
// Purpose: Web portal page component managing 'TeamAttendance' views, user interactions, and state.
// UI Components:
//   • <TeamAttendance />
// Key Functions & Handlers:
//   • getInitials()
//   • formatTime()
//   • formatHours()
//   • formatLastUpdated()
//   • handleClickOutside()
//   • handleSync()
//   • handleVisibilityChange()
//   • handleRefresh()
//   • ... and 3 more handlers
// ==============================================================================

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Calendar,
  UserX,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Eye,
  FileText,
  History,
} from "lucide-react";
import { managerToast } from "../../components/ManagerToast";
import { getTeam, getTodayAttendance, getTeamLeaves } from "../../services/managerApiService";
import "./LiveAttendance.css";

// Helper: Initials Avatar (Dynamic generation)
export const getInitials = (name) => {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

// Helper: Time Display formatting
export const formatTime = (val) => {
  if (!val || val === "—" || val === "-" || val === "null" || val === "--:--") return "--:--";
  const trimmed = String(val).trim();
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) return trimmed.toUpperCase();
  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
    }
  }
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const [hh, mm] = trimmed.split(":");
    let h = parseInt(hh, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, "0")}:${mm} ${ampm}`;
  }
  return trimmed;
};

// Helper: Work Hours Display formatting
export const formatHours = (val) => {
  if (!val || val === "—" || val === "-" || val === "00:00" || val === "0h 00m" || val === "--:--" || val === "0 Hrs") {
    return "--:--";
  }
  if (typeof val === "number") {
    const h = Math.floor(val);
    const m = Math.round((val - h) * 60);
    return `${h}h ${m}m`;
  }
  const s = String(val).trim();
  if (s.includes("h") || s.includes("m") || s.includes("Hrs")) {
    return s.replace("Hrs", "h");
  }
  if (s.includes(":")) {
    const [h, m] = s.split(":");
    return `${parseInt(h, 10)}h ${parseInt(m, 10)}m`;
  }
  return s;
};

// Helper: Last Updated Timestamp formatting
export const formatLastUpdated = (d) => {
  if (!d) return "";
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return "";
  const day = String(dateObj.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  let hours = dateObj.getHours();
  const mins = String(dateObj.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${String(hours).padStart(2, "0")}:${mins} ${ampm}`;
};

export const TeamAttendance = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [page, setPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const menuRef = useRef(null);
  const pageSize = 7;

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Live Team Attendance from backend
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      if (members.length === 0) setLoading(true);
      else setRefreshing(true);
    }
    try {
      const [teamRes, attRes, leavesRes] = await Promise.allSettled([
        getTeam(),
        getTodayAttendance(),
        getTeamLeaves(),
      ]);

      const team = teamRes.status === "fulfilled" && Array.isArray(teamRes.value) ? teamRes.value : [];
      const att = attRes.status === "fulfilled" && Array.isArray(attRes.value) ? attRes.value : [];
      const leaves = leavesRes.status === "fulfilled" && Array.isArray(leavesRes.value) ? leavesRes.value : [];

      console.log("TeamAttendance fetchData:", { team, att, leaves });

      // Build lookup: emp_code -> attendance record
      const attMap = {};
      att.forEach((a) => {
        const code = a.emp_code || a.employee_code;
        if (code) attMap[code] = a;
      });

      // Build lookup: emp_code -> leave record
      const leavesMap = {};
      leaves.forEach((l) => {
        const code = l.emp_code || l.employee_code || l.employeeId;
        if (code) leavesMap[code] = l;
      });

      const baseList = team.length > 0 ? team : att;

      const merged = baseList.map((m) => {
        const code = m.emp_code || m.employee_code || m.id;
        const rec = attMap[code] || (team.length === 0 ? m : {});
        const leaveRec = leavesMap[code] || {};
        const rawStatus = (rec.status || m.status || (leaveRec.status ? "leave" : "absent")).toLowerCase();

        let status = "absent";
        if (
          rawStatus.includes("present") ||
          rawStatus.includes("punched in") ||
          rawStatus.includes("in progress")
        ) {
          status = "present";
        } else if (rawStatus.includes("late")) {
          status = "late";
        } else if (rawStatus.includes("leave")) {
          status = "leave";
        } else if (rawStatus.includes("half")) {
          status = "late";
        }

        const name =
          m.name ||
          m.employee ||
          `${m.first_name || ""} ${m.last_name || ""}`.trim() ||
          rec.name ||
          rec.employee ||
          code;

        const designation = m.designation || m.role || rec.designation || "Engineering";
        let department = m.department || rec.department || m.dept || designation;
        if (department && department.includes("*")) {
          department = department.split("*")[0].trim() || designation;
        }

        const inTime = formatTime(rec.check_in || rec.checkIn || rec.punch_in || rec.inTime);
        const outTime = formatTime(rec.check_out || rec.checkOut || rec.punch_out || rec.outTime);
        const prodHours = formatHours(rec.working_hours || rec.prodHours || rec.total_hours || rec.hours);

        let leaveDates = "Today";
        if (leaveRec.start_date) {
          try {
            const d1 = new Date(leaveRec.start_date);
            const d2 = leaveRec.end_date ? new Date(leaveRec.end_date) : null;
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            if (!isNaN(d1.getTime())) {
              if (d2 && !isNaN(d2.getTime()) && (d1.getDate() !== d2.getDate() || d1.getMonth() !== d2.getMonth())) {
                leaveDates = `${d1.getDate()} ${months[d1.getMonth()]} – ${d2.getDate()} ${months[d2.getMonth()]} ${d2.getFullYear()}`;
              } else {
                leaveDates = `${d1.getDate()} ${months[d1.getMonth()]} ${d1.getFullYear()}`;
              }
            } else {
              leaveDates = `${leaveRec.start_date}${leaveRec.end_date && leaveRec.end_date !== leaveRec.start_date ? ` – ${leaveRec.end_date}` : ""}`;
            }
          } catch {
            leaveDates = `${leaveRec.start_date}${leaveRec.end_date && leaveRec.end_date !== leaveRec.start_date ? ` – ${leaveRec.end_date}` : ""}`;
          }
        }
        const leaveType = leaveRec.category || leaveRec.leave_type || leaveRec.leaveType || "Annual Leave";

        let loc = rec.location || rec.punch_in_location || m.location;
        if (!loc || loc === "—" || loc === "-") {
          loc = status === "absent" ? "-- --" : "Office";
        }

        return {
          id: code,
          code,
          name,
          designation,
          department,
          status,
          inTime,
          outTime,
          prodHours,
          leaveDates,
          leaveType,
          location: loc,
          remark: rec.remark || (status === "present" ? "On Time" : status),
        };
      });

      setMembers(merged);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("LiveAttendance fetch error:", err);
      if (!silent) {
        managerToast.error("Failed to load live attendance feeds.", { title: "Error" });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [members.length]);

  // Initial load and periodic polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden")) return;
      fetchData(true);
    }, 30000);

    const handleSync = () => {
      if (typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden")) return;
      fetchData(true);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden && document.visibilityState === "visible") {
        fetchData(true);
      }
    };

    window.addEventListener("focus", handleSync);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("attendance-updated", handleSync);
    window.addEventListener("punch-updated", handleSync);
    window.addEventListener("regularization-updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("attendance-updated", handleSync);
      window.removeEventListener("punch-updated", handleSync);
      window.removeEventListener("regularization-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [fetchData]);

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
    managerToast.success("Live attendance feeds synchronized.", { title: "Synchronized" });
  };

  // Stat card counts
  const presentCount = members.filter((m) => m.status === "present").length;
  const lateCount = members.filter((m) => m.status === "late").length;
  const leaveCount = members.filter((m) => m.status === "leave").length;
  const absentCount = members.filter((m) => m.status === "absent").length;

  // Filtered list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (m.name || "").toLowerCase().includes(q) ||
        (m.designation || "").toLowerCase().includes(q) ||
        (m.code || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [members, searchTerm, statusFilter]);

  // Pagination for desktop table
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, page, pageSize]);

  // Filter pill click
  const handleFilterSelect = (filterKey) => {
    setStatusFilter(filterKey);
    setPage(1);
  };

  // Stat card toggle filter
  const handleStatCardClick = (filterKey) => {
    setStatusFilter((prev) => (prev === filterKey ? "all" : filterKey));
    setPage(1);
  };

  // Render Status Badge (Option B colored dot pill)
  const renderBadge = (status) => {
    const config = {
      present: { label: "Present", color: "#10B981", bg: "#ECFDF5", border: "#D1FAE5" },
      late: { label: "Late", color: "#F59E0B", bg: "#FFFBEB", border: "#FEF3C7" },
      leave: { label: "On Leave", color: "#3B82F6", bg: "#EFF6FF", border: "#DBEAFE" },
      absent: { label: "Absent", color: "#EF4444", bg: "#FEF2F2", border: "#FEE2E2" },
    }[status] || { label: "Absent", color: "#EF4444", bg: "#FEF2F2", border: "#FEE2E2" };

    return (
      <span
        className={`mp-live-badge ${status}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 9px",
          borderRadius: "9999px",
          fontSize: "11.5px",
          fontWeight: 600,
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            minWidth: "6px",
            maxWidth: "6px",
            minHeight: "6px",
            maxHeight: "6px",
            borderRadius: "50%",
            backgroundColor: config.color,
            flexShrink: 0,
          }}
        />
        <span>{config.label}</span>
      </span>
    );
  };

  return (
    <div className="mp-live-attendance">
      {/* 1. Page Header (Option B Live Monitor) */}
      <div className="mp-live-header">
        <div className="mp-live-title-group">
          <h1 className="mp-live-title">Live Attendance</h1>
          <p className="mp-live-subtitle">Monitor your team in real time.</p>
        </div>

        <div className="mp-live-header-actions">
          <div className="mp-live-updated-indicator">
            <span className="mp-live-updated-dot" />
            <span className="mp-live-updated-text">Last updated just now</span>
          </div>
          <button
            type="button"
            className={`mp-live-refresh-btn ${refreshing ? "is-spinning" : ""}`}
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Refresh live feeds"
            aria-label="Refresh attendance"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 2. Stat Summary Cards (Option B 2x2 Grid) */}
      <div className="mp-live-stats-grid">
        {/* Present Now */}
        <div
          className={`mp-live-stat-card ${statusFilter === "present" ? "is-active" : ""}`}
          onClick={() => handleStatCardClick("present")}
          title="Filter by Present members"
        >
          <div className="mp-live-stat-left">
            <div className="mp-live-stat-icon-box present" style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: "#DCFCE7", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={20} strokeWidth={2.2} color="#10B981" />
            </div>
            <div className="mp-live-stat-info">
              <span className="mp-live-stat-label">Present Now</span>
              <span className="mp-live-stat-value">{presentCount}</span>
            </div>
          </div>
        </div>

        {/* Late Today */}
        <div
          className={`mp-live-stat-card ${statusFilter === "late" ? "is-active" : ""}`}
          onClick={() => handleStatCardClick("late")}
          title="Filter by Late members"
        >
          <div className="mp-live-stat-left">
            <div className="mp-live-stat-icon-box late" style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: "#FEF3C7", color: "#F59E0B", border: "1px solid rgba(245, 158, 11, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Clock size={20} strokeWidth={2.2} color="#F59E0B" />
            </div>
            <div className="mp-live-stat-info">
              <span className="mp-live-stat-label">Late Today</span>
              <span className="mp-live-stat-value">{lateCount}</span>
            </div>
          </div>
        </div>

        {/* On Leave */}
        <div
          className={`mp-live-stat-card ${statusFilter === "leave" ? "is-active" : ""}`}
          onClick={() => handleStatCardClick("leave")}
          title="Filter by members On Leave"
        >
          <div className="mp-live-stat-left">
            <div className="mp-live-stat-icon-box leave" style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: "#DBEAFE", color: "#3B82F6", border: "1px solid rgba(59, 130, 246, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Calendar size={20} strokeWidth={2.2} color="#3B82F6" />
            </div>
            <div className="mp-live-stat-info">
              <span className="mp-live-stat-label">On Leave</span>
              <span className="mp-live-stat-value">{leaveCount}</span>
            </div>
          </div>
        </div>

        {/* Absent */}
        <div
          className={`mp-live-stat-card ${statusFilter === "absent" ? "is-active" : ""}`}
          onClick={() => handleStatCardClick("absent")}
          title="Filter by Absent members"
        >
          <div className="mp-live-stat-left">
            <div className="mp-live-stat-icon-box absent" style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: "#FEE2E2", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <UserX size={20} strokeWidth={2.2} color="#EF4444" />
            </div>
            <div className="mp-live-stat-info">
              <span className="mp-live-stat-label">Absent</span>
              <span className="mp-live-stat-value">{absentCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar (Option B Full Width + Colored Dots) */}
      <div className="mp-live-filter-row">
        <div className="mp-live-search-wrap">
          <Search size={16} className="mp-live-search-icon" />
          <input
            type="text"
            className="mp-live-search-input"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search team member by name or code..."
          />
        </div>

        <div className="mp-live-filter-tabs">
          {[
            { key: "all", label: "All" },
            { key: "present", label: "Present", dotColor: "#10B981" },
            { key: "late", label: "Late", dotColor: "#F59E0B" },
            { key: "leave", label: "Leave", dotColor: "#3B82F6" },
            { key: "absent", label: "Absent", dotColor: "#EF4444" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`mp-live-filter-pill ${statusFilter === tab.key ? "active" : ""}`}
              onClick={() => handleFilterSelect(tab.key)}
            >
              {tab.dotColor && (
                <span
                  className="mp-live-filter-dot"
                  style={{ backgroundColor: tab.dotColor }}
                />
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main Content: Skeleton, Empty State, or Data Views */}
      {loading && members.length === 0 ? (
        <div className="mp-live-table-card" style={{ padding: "20px" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mp-live-skeleton mp-live-skeleton-table-row" />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="mp-live-empty-state">
          <div className="mp-live-empty-icon">
            <Users size={28} />
          </div>
          <h3 className="mp-live-empty-title">No team members found</h3>
          <p className="mp-live-empty-desc">
            There are currently no team members matching your search or selected filter.
          </p>
          {(searchTerm || statusFilter !== "all") && (
            <button
              type="button"
              className="mp-live-clear-btn"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setPage(1);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 5A. Desktop Table View */}
          <div className="mp-live-table-card">
            <div className="mp-live-table-wrap">
              <table className="mp-live-table">
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>DESIGNATION</th>
                    <th>CHECK-IN</th>
                    <th>CHECK-OUT</th>
                    <th>WORK HOURS</th>
                    <th>LOCATION</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map((m) => {
                    const initials = getInitials(m.name);
                    const isCheckInEmpty = m.inTime === "--:--";
                    const isCheckOutEmpty = m.outTime === "--:--";
                    const isHoursEmpty = m.prodHours === "--:--";
                    const isLocEmpty = m.location === "-- --" || m.location === "—";

                    return (
                      <tr key={m.id}>
                        {/* Employee Avatar, Name & Code */}
                        <td>
                          <div className="mp-live-user-cell">
                            <div className="mp-live-avatar">{initials}</div>
                            <div className="mp-live-user-meta">
                              <span className="mp-live-user-name">{m.name}</span>
                              <span className="mp-live-user-code">{m.code}</span>
                            </div>
                          </div>
                        </td>

                        {/* Designation */}
                        <td>
                          <span className="mp-live-designation">{m.designation}</span>
                        </td>

                        {/* Check-In */}
                        <td>
                          <span className={`mp-live-time ${isCheckInEmpty ? "empty" : ""}`}>
                            {m.inTime}
                          </span>
                        </td>

                        {/* Check-Out */}
                        <td>
                          <span className={`mp-live-time ${isCheckOutEmpty ? "empty" : ""}`}>
                            {m.outTime}
                          </span>
                        </td>

                        {/* Work Hours */}
                        <td>
                          <span className={`mp-live-time ${isHoursEmpty ? "empty" : ""}`}>
                            {m.prodHours}
                          </span>
                        </td>

                        {/* Location */}
                        <td>
                          <span className={`mp-live-location-cell ${isLocEmpty ? "empty" : ""}`}>
                            {!isLocEmpty && <MapPin size={13} className="mp-live-location-icon" />}
                            <span>{m.location}</span>
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td>{renderBadge(m.status)}</td>

                        {/* Actions */}
                        <td style={{ textAlign: "right" }}>
                          <div
                            className="mp-live-action-wrap"
                            ref={activeMenuId === m.id ? menuRef : null}
                          >
                            <button
                              type="button"
                              className="mp-live-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId((prev) => (prev === m.id ? null : m.id));
                              }}
                              title="More options"
                              aria-label="Actions"
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {activeMenuId === m.id && (
                              <div className="mp-live-action-dropdown">
                                <button
                                  type="button"
                                  className="mp-live-dropdown-item"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate("/manager/team");
                                  }}
                                >
                                  <Eye size={14} />
                                  <span>View Profile</span>
                                </button>
                                <button
                                  type="button"
                                  className="mp-live-dropdown-item"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate("/manager/attendance/records");
                                  }}
                                >
                                  <FileText size={14} />
                                  <span>Attendance Records</span>
                                </button>
                                <button
                                  type="button"
                                  className="mp-live-dropdown-item"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate("/manager/attendance/logs");
                                  }}
                                >
                                  <History size={14} />
                                  <span>Attendance Logs</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Desktop Table Footer with Pagination */}
            <div className="mp-live-table-footer">
              <span className="mp-live-showing-text">
                Showing {Math.min(filteredMembers.length, (page - 1) * pageSize + 1)} to{" "}
                {Math.min(filteredMembers.length, page * pageSize)} of {filteredMembers.length} members
              </span>

              {totalPages > 1 && (
                <div className="mp-live-pagination">
                  <button
                    type="button"
                    className="mp-live-page-btn"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {[...Array(totalPages)].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        type="button"
                        className={`mp-live-page-btn ${page === p ? "active" : ""}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className="mp-live-page-btn"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    aria-label="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 5B. Mobile Employee Cards View (Option B — Live Monitor) */}
          <div className="mp-live-mobile-cards">
            {filteredMembers.map((m) => {
              const initials = getInitials(m.name);
              const isCheckInEmpty = !m.inTime || m.inTime === "--:--" || m.inTime === "—";
              const isCheckOutEmpty = !m.outTime || m.outTime === "--:--" || m.outTime === "—";
              const subline = `${m.code}${m.department ? ` • ${m.department}` : ""}`;

              return (
                <div
                  key={m.id}
                  className={`mp-live-card status-${m.status}`}
                  onClick={() => navigate(`/manager/team/${m.code}`)}
                  role="button"
                  tabIndex={0}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "stretch",
                    background: "#FFFFFF",
                    border: "1px solid #EAE7F2",
                    borderRadius: "14px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                    cursor: "pointer",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {/* Left colored status bar (Option B Inset Pill) */}
                  <div
                    className={`mp-live-card-bar status-${m.status}`}
                    style={{
                      width: "5px",
                      minWidth: "5px",
                      minHeight: "48px",
                      margin: "10px 0 10px 8px",
                      borderRadius: "4px",
                      backgroundColor:
                        m.status === "present"
                          ? "#10B981"
                          : m.status === "late"
                          ? "#F59E0B"
                          : m.status === "leave"
                          ? "#3B82F6"
                          : "#EF4444",
                      flexShrink: 0,
                    }}
                  />

                  <div
                    className="mp-live-card-inner"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "12px 14px 12px 10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {/* Top Row: User Avatar, Name, Code/Dept, Status Badge & Chevron */}
                    <div className="mp-live-card-top">
                      <div className="mp-live-card-user">
                        <div
                          className="mp-live-avatar"
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "12px",
                            backgroundColor: "#EDE9FE",
                            color: "#7C3AED",
                            fontSize: "13.5px",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div className="mp-live-card-user-meta">
                          <span className="mp-live-card-name">{m.name}</span>
                          <span className="mp-live-card-subline">{subline}</span>
                        </div>
                      </div>

                      <div className="mp-live-card-top-right">
                        {renderBadge(m.status)}
                        <ChevronRight size={14} className="mp-live-card-chevron" />
                      </div>
                    </div>

                    {/* Bottom Row: In/Out Punches or Leave Details + View Button */}
                    <div className="mp-live-card-bottom">
                      {m.status === "leave" ? (
                        <div className="mp-live-card-leave-info">
                          <Calendar size={15} className="mp-live-leave-icon" />
                          <div className="mp-live-leave-text">
                            <span className="mp-live-leave-dates">{m.leaveDates || "Today"}</span>
                            <span className="mp-live-leave-type">{m.leaveType || "Annual Leave"}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mp-live-card-punches">
                          <div className="mp-live-punch-badge in">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mp-punch-arrow-in">
                              <path d="M7 17V9a4 4 0 0 1 4-4h7" />
                              <polyline points="14 9 18 5 14 1" />
                            </svg>
                            <span className="mp-punch-label">In</span>
                            <span className={`mp-punch-time ${isCheckInEmpty ? "empty" : ""}`}>
                              {isCheckInEmpty ? "—" : m.inTime}
                            </span>
                          </div>

                          <div className="mp-live-punch-badge out">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mp-punch-arrow-out">
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                              <polyline points="16 17 21 12 16 7" />
                              <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            <span className="mp-punch-label">Out</span>
                            <span className={`mp-punch-time ${isCheckOutEmpty ? "empty" : ""}`}>
                              {isCheckOutEmpty ? "—" : m.outTime}
                            </span>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        className="mp-live-card-view-btn"
                        style={{
                          backgroundColor: "#EDE9FE",
                          color: "#7C3AED",
                          border: "none",
                          borderRadius: "8px",
                          padding: "5px 14px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/manager/team/${m.code}`);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
