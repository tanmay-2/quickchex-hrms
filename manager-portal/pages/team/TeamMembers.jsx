import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Mail, Phone, ArrowRight } from "lucide-react";
import { ManagerBadge } from "../../components/ManagerBadge";
import { getTeam, getTodayAttendance } from "../../services/managerApiService";
import "./Team.css";

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
      const [team, attendance] = await Promise.allSettled([
        getTeam(),
        getTodayAttendance(),
      ]);

      let teamList = team.status === "fulfilled" && Array.isArray(team.value)
        ? team.value
        : [];

      // Build attendance status map: emp_code → status
      const attMap = {};
      if (attendance.status === "fulfilled" && Array.isArray(attendance.value)) {
        attendance.value.forEach((a) => {
          attMap[a.emp_code] = (a.status || "").toLowerCase();
        });
      }

      // Merge attendance status into each team member
      const merged = teamList.map((m) => {
        const rawStatus = attMap[m.emp_code] || "absent";
        // Normalise status for badge
        let status = "absent";
        if (rawStatus.includes("present")) status = "present";
        else if (rawStatus.includes("late")) status = "late";
        else if (rawStatus.includes("leave")) status = "leave";
        else if (rawStatus.includes("half")) status = "late";
        return { ...m, liveStatus: status };
      });

      setMembers(merged);
    } catch (err) {
      setError("Failed to load team members.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filteredMembers = members.filter(
    (m) =>
      (m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.designation || m.role || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.emp_code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
          Managed Team Directory
        </h2>
        <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
          {loading
            ? "Loading team..."
            : `Overview of all ${members.length} direct reports in your team.`}
        </p>
      </div>

      {/* Search Input */}
      <div style={{ position: "relative", maxWidth: "380px" }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search team member by name, ID or role..."
          style={{
            width: "100%", padding: "9px 14px", borderRadius: "10px",
            border: "1px solid var(--mp-border)", background: "var(--mp-surface)",
            color: "var(--mp-text-primary)", fontSize: "13.5px", outline: "none",
          }}
        />
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "14px" }}>
          Loading team members...
        </div>
      )}
      {error && !loading && (
        <div style={{ padding: "20px", color: "#DC2626", fontSize: "14px" }}>{error}</div>
      )}

      {/* Cards Grid */}
      {!loading && !error && (
        <div className="mp-team-cards-grid">
          {filteredMembers.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "14px", gridColumn: "1/-1" }}>
              No team members found.
            </div>
          ) : (
            filteredMembers.map((m) => {
              const name = m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.emp_code;
              const role = m.designation || m.role || "Employee";
              const dept = m.department || "—";
              const email = m.email || "—";
              const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);

              return (
                <div
                  key={m.emp_code || m.id}
                  className="mp-team-member-card"
                  onClick={() => navigate(`/manager/team/${m.emp_code || m.id}`)}
                >
                  <div className="mp-member-large-avatar">{initials}</div>

                  <div>
                    <h4 className="mp-member-card-name">{name}</h4>
                    <div className="mp-member-card-role">{role}</div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--mp-brand-600)", marginTop: "2px" }}>
                      {m.emp_code} • {dept}
                    </div>
                  </div>

                  <ManagerBadge variant={m.liveStatus} size="sm" dot>
                    {m.liveStatus.toUpperCase()}
                  </ManagerBadge>

                  <div className="mp-member-quick-stats">
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--mp-text-muted)" }}>Department</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--mp-text-primary)" }}>{dept}</div>
                    </div>
                  </div>

                  <div style={{ width: "100%", fontSize: "12px", color: "var(--mp-text-muted)", display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Mail size={13} /> <span>{email}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12.5px", fontWeight: 700, color: "var(--mp-brand-600)" }}>
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
