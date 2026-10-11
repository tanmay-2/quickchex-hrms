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
import { getTeam, getTodayAttendance } from "../../services/managerApiService";
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
      const [teamRes, attRes] = await Promise.allSettled([
        getTeam(),
        getTodayAttendance(),
      ]);

      const team = teamRes.status === "fulfilled" && Array.isArray(teamRes.value) ? teamRes.value : [];
      const att = attRes.status === "fulfilled" && Array.isArray(attRes.value) ? attRes.value : [];

      // Build lookup: emp_code -> attendance record
      const attMap = {};
      att.forEach((a) => {
        const code = a.emp_code || a.employee_code;
        if (code) attMap[code] = a;
      });

      const baseList = team.length > 0 ? team : att;

      const merged = baseList.map((m) => {
        const code = m.emp_code || m.employee_code || m.id;
        const rec = attMap[code] || (team.length === 0 ? m : {});
        const rawStatus = (rec.status || m.status || "absent").toLowerCase();

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

        const designation = m.designation || m.role || rec.designation || "Design";
        const inTime = formatTime(rec.check_in || rec.checkIn || rec.punch_in || rec.inTime);
        const outTime = formatTime(rec.check_out || rec.checkOut || rec.punch_out || rec.outTime);
        const prodHours = formatHours(rec.working_hours || rec.prodHours || rec.total_hours || rec.hours);

        let loc = rec.location || rec.punch_in_location || m.location;
        if (!loc || loc === "—" || loc === "-") {
          loc = status === "absent" ? "-- --" : "Office";
        }

        return {
          id: code,
          code,
          name,
          designation,
          status,
          inTime,
          outTime,
          prodHours,
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
    const interval = setInterval(() => fetchData(true), 4000);
    const handleSync = () => fetchData(true);

    window.addEventListener("focus", handleSync);
    window.addEventListener("attendance-updated", handleSync);
    window.addEventListener("punch-updated", handleSync);
    window.addEventListener("regularization-updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
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

  // Render Status Badge
  const renderBadge = (status) => {
    switch (status) {
      case "present":
        return (
          <span className="mp-live-badge present">
            <CheckCircle2 size={13} strokeWidth={2.4} />
            <span>Present</span>
          </span>
        );
      case "late":
        return (
          <span className="mp-live-badge late">
            <Clock size={13} strokeWidth={2.4} />
            <span>Late</span>
          </span>
        );
      case "leave":
        return (
          <span className="mp-live-badge leave">
            <Calendar size={13} strokeWidth={2.4} />
            <span>On Leave</span>
          </span>
        );
      case "absent":
      default:
        return (
          <span className="mp-live-badge absent">
            <AlertCircle size={13} strokeWidth={2.4} />
            <span>Absent</span>
          </span>
        );
    }
  };

  return (
    <div className="mp-live-attendance">
      {/* 1. Page Header */}
      <div className="mp-live-header">
        <div className="mp-live-title-group">
          <h1 className="mp-live-title">Live Attendance</h1>
          <p className="mp-live-subtitle">Monitor your team's attendance in real time.</p>
        </div>

        <div className="mp-live-header-actions">
          <span className="mp-live-timestamp">
            Last updated: {formatLastUpdated(lastUpdated)}
          </span>
          <button
            type="button"
            className={`mp-live-refresh-btn ${refreshing ? "is-spinning" : ""}`}
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Refresh live feeds"
            aria-label="Refresh attendance"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 2. Stat Summary Cards */}
      <div className="mp-live-stats-grid">
        {/* Present Now */}
        <div
          className={`mp-live-stat-card ${statusFilter === "present" ? "is-active" : ""}`}
          onClick={() => handleStatCardClick("present")}
          title="Filter by Present members"
        >
          <div className="mp-live-stat-left">
            <div className="mp-live-stat-icon-box present">
              <Users size={22} strokeWidth={2.2} />
            </div>
            <div className="mp-live-stat-info">
              <span className="mp-live-stat-label">Present Now</span>
              <span className="mp-live-stat-value">{presentCount}</span>
            </div>
          </div>
          <ChevronRight size={16} className="mp-live-stat-chevron" />
        </div>

        {/* Late Today */}
        <div
          className={`mp-live-stat-card ${statusFilter === "late" ? "is-active" : ""}`}
          onClick={() => handleStatCardClick("late")}
          title="Filter by Late members"
        >
          <div className="mp-live-stat-left">
            <div className="mp-live-stat-icon-box late">
              <Clock size={22} strokeWidth={2.2} />
            </div>
            <div className="mp-live-stat-info">
              <span className="mp-live-stat-label">Late Today</span>
              <span className="mp-live-stat-value">{lateCount}</span>
            </div>
          </div>
          <ChevronRight size={16} className="mp-live-stat-chevron" />
        </div>

        {/* On Leave */}
        <div
          className={`mp-live-stat-card ${statusFilter === "leave" ? "is-active" : ""}`}
          onClick={() => handleStatCardClick("leave")}
          title="Filter by members On Leave"
        >
          <div className="mp-live-stat-left">
            <div className="mp-live-stat-icon-box leave">
              <Calendar size={22} strokeWidth={2.2} />
            </div>
            <div className="mp-live-stat-info">
              <span className="mp-live-stat-label">On Leave</span>
              <span className="mp-live-stat-value">{leaveCount}</span>
            </div>
          </div>
          <ChevronRight size={16} className="mp-live-stat-chevron" />
        </div>

        {/* Absent */}
        <div
          className={`mp-live-stat-card ${statusFilter === "absent" ? "is-active" : ""}`}
          onClick={() => handleStatCardClick("absent")}
          title="Filter by Absent members"
        >
          <div className="mp-live-stat-left">
            <div className="mp-live-stat-icon-box absent">
              <UserX size={22} strokeWidth={2.2} />
            </div>
            <div className="mp-live-stat-info">
              <span className="mp-live-stat-label">Absent</span>
              <span className="mp-live-stat-value">{absentCount}</span>
            </div>
          </div>
          <ChevronRight size={16} className="mp-live-stat-chevron" />
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
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
            { key: "present", label: "Present" },
            { key: "late", label: "Late" },
            { key: "leave", label: "Leave" },
            { key: "absent", label: "Absent" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`mp-live-filter-pill ${statusFilter === tab.key ? "active" : ""}`}
              onClick={() => handleFilterSelect(tab.key)}
            >
              {tab.label}
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

          {/* 5B. Mobile Employee Cards View */}
          <div className="mp-live-mobile-cards">
            {filteredMembers.map((m) => {
              const initials = getInitials(m.name);
              const isCheckInEmpty = m.inTime === "--:--";
              const isCheckOutEmpty = m.outTime === "--:--";
              const isLocEmpty = m.location === "-- --" || m.location === "—";

              return (
                <div
                  key={m.id}
                  className="mp-live-card"
                  onClick={() => navigate("/manager/attendance/records")}
                  role="button"
                  tabIndex={0}
                >
                  {/* Top Row: User Avatar, Name, Designation & Status */}
                  <div className="mp-live-card-top">
                    <div className="mp-live-card-user">
                      <div className="mp-live-avatar">{initials}</div>
                      <div className="mp-live-card-user-meta">
                        <span className="mp-live-card-name">{m.name}</span>
                        <span className="mp-live-card-desig">{m.designation}</span>
                      </div>
                    </div>

                    <div className="mp-live-card-top-right">
                      {renderBadge(m.status)}
                      <ChevronRight size={16} className="mp-live-card-chevron" />
                    </div>
                  </div>

                  {/* Bottom Row: Check-in, Check-out, Location */}
                  <div className="mp-live-card-details">
                    <div className="mp-live-card-detail-item">
                      <div className="mp-live-card-detail-head">
                        <Clock size={12} className="mp-live-card-detail-icon" />
                        <span>Check-in</span>
                      </div>
                      <span className={`mp-live-card-detail-val ${isCheckInEmpty ? "empty" : ""}`}>
                        {m.inTime}
                      </span>
                    </div>

                    <div className="mp-live-card-detail-item">
                      <div className="mp-live-card-detail-head">
                        <Clock size={12} className="mp-live-card-detail-icon" />
                        <span>Check-out</span>
                      </div>
                      <span className={`mp-live-card-detail-val ${isCheckOutEmpty ? "empty" : ""}`}>
                        {m.outTime}
                      </span>
                    </div>

                    <div className="mp-live-card-detail-item">
                      <div className="mp-live-card-detail-head">
                        <MapPin size={12} className="mp-live-card-detail-icon" />
                        <span>Location</span>
                      </div>
                      <span className={`mp-live-card-detail-val ${isLocEmpty ? "empty" : ""}`}>
                        {isLocEmpty ? "—" : m.location}
                      </span>
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
