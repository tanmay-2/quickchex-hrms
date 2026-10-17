import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { getTeam, getTodayAttendance } from "../../services/managerApiService";
import "./Team.css";

/* ─── Initials Avatar Helper ─────────────────────────────────────────────── */
const getInitials = (name) => {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

export const TeamMembers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch team list + today's attendance in parallel
      const [teamRes, attendanceRes] = await Promise.allSettled([
        getTeam(),
        getTodayAttendance(),
      ]);

      let teamList =
        teamRes.status === "fulfilled" && Array.isArray(teamRes.value)
          ? teamRes.value
          : [];

      // Build attendance status map: emp_code → status
      const attMap = {};
      if (
        attendanceRes.status === "fulfilled" &&
        Array.isArray(attendanceRes.value)
      ) {
        attendanceRes.value.forEach((a) => {
          if (a.emp_code) {
            attMap[a.emp_code] = a.status || "";
          }
        });
      }

      // Merge attendance status into each team member
      const merged = teamList.map((m) => {
        const rawStatus = (attMap[m.emp_code] || m.status || "").toLowerCase();
        let status = "absent";
        let statusLabel = "ABSENT";

        if (rawStatus.includes("punched in") || rawStatus.includes("in")) {
          status = "present";
          statusLabel = "PRESENT";
        } else if (rawStatus.includes("present")) {
          status = "present";
          statusLabel = "PRESENT";
        } else if (rawStatus.includes("late")) {
          status = "late";
          statusLabel = "LATE";
        } else if (rawStatus.includes("leave")) {
          status = "leave";
          statusLabel = "LEAVE";
        } else if (rawStatus.includes("half")) {
          status = "late";
          statusLabel = "LATE";
        }

        return { ...m, liveStatus: status, liveStatusLabel: statusLabel };
      });

      setMembers(merged);
    } catch (err) {
      console.error("Failed to load team members:", err);
      setError("Failed to load team members. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    const name = (m.name || `${m.first_name || ""} ${m.last_name || ""}`).toLowerCase();
    const role = (m.designation || m.role || "").toLowerCase();
    const code = (m.emp_code || "").toLowerCase();
    const dept = (m.department || "").toLowerCase();
    return (
      name.includes(term) ||
      role.includes(term) ||
      code.includes(term) ||
      dept.includes(term)
    );
  });

  return (
    <div className="mp-team-container">
      {/* Page Title & Subtitle */}
      <div className="mp-team-title-wrap">
        <h2 className="mp-team-title">Managed Team Directory</h2>
        <p className="mp-team-subtitle">Overview of your direct reports</p>
      </div>

      {/* Full-Width Employee Search */}
      <div className="mp-team-search-wrap">
        <Search size={16} className="mp-team-search-icon" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search team member by name or code..."
          className="mp-team-search-input"
          aria-label="Search team members"
        />
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="mp-team-list">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`team-skel-${idx}`}
              style={{
                height: 110,
                borderRadius: 16,
                background:
                  "linear-gradient(90deg, #F3EEFF 25%, #E6E3EE 50%, #F3EEFF 75%)",
                backgroundSize: "200% 100%",
                animation: "mp-shimmer 1.5s infinite",
              }}
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            background: "#FFFFFF",
            borderRadius: 14,
            border: "1px solid #E5E7EB",
            color: "#DC2626",
            fontSize: 13.5,
          }}
        >
          <AlertCircle size={24} style={{ marginBottom: 6 }} />
          <div>{error}</div>
          <button
            type="button"
            onClick={fetchMembers}
            className="mp-team-card-action"
            style={{
              marginTop: 12,
              background: "#7C3AED",
              color: "#FFFFFF",
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Team Cards List (Option A) */}
      {!loading && !error && (
        <div className="mp-team-list">
          {filteredMembers.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                background: "#FFFFFF",
                borderRadius: 14,
                border: "1px solid #E5E7EB",
                color: "#6B7280",
                fontSize: 14,
              }}
            >
              No team members found matching your search.
            </div>
          ) : (
            filteredMembers.map((m) => {
              const name =
                m.name ||
                `${m.first_name || ""} ${m.last_name || ""}`.trim() ||
                m.emp_code;
              const role = m.designation || m.role || "Employee";
              const dept = m.department || "Operations";
              const initials = getInitials(name);
              const targetId = m.emp_code || m.id;

              return (
                <div
                  key={targetId}
                  className="mp-team-card-option-a"
                  onClick={() => navigate(`/manager/team/${targetId}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/manager/team/${targetId}`);
                    }
                  }}
                >
                  <div className="mp-team-card-top">
                    <div className="mp-team-avatar-option-a">{initials}</div>

                    <div className="mp-team-info-mid">
                      <h4 className="mp-team-emp-name">{name}</h4>
                      <div className="mp-team-emp-desig">
                        {role} • {m.emp_code}
                      </div>
                      <div className="mp-team-emp-dept">{dept}</div>
                    </div>

                    <div className="mp-team-right-col">
                      <span
                        className={`mp-team-status-pill ${m.liveStatus}`}
                      >
                        <span className="mp-team-status-dot" />
                        {m.liveStatusLabel}
                      </span>
                      <ChevronRight size={18} className="mp-team-chevron" />
                    </div>
                  </div>

                  <div className="mp-team-card-action">
                    <span>View Profile & Analytics</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
