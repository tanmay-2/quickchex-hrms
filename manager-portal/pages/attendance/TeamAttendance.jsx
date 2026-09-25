import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Clock, MapPin, CheckCircle2, AlertCircle, RefreshCw, X, Mail, Phone } from "lucide-react";
import { ManagerBadge } from "../../components/ManagerBadge";
import { ManagerStatCard } from "../../components/ManagerStatCard";
import { managerToast } from "../../components/ManagerToast";
import { getTeam, getTodayAttendance } from "../../services/managerApiService";
import "./AttendancePages.css";

export const TeamAttendance = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [teamRes, attRes] = await Promise.allSettled([
        getTeam(),
        getTodayAttendance(),
      ]);

      const team = teamRes.status === "fulfilled" && Array.isArray(teamRes.value)
        ? teamRes.value : [];
      const att = attRes.status === "fulfilled" && Array.isArray(attRes.value)
        ? attRes.value : [];

      // Build lookup: emp_code → attendance record
      const attMap = {};
      att.forEach((a) => { attMap[a.emp_code] = a; });

      const merged = team.map((m) => {
        const rec = attMap[m.emp_code] || {};
        const rawStatusStr = (rec.status || "absent").toLowerCase();
        let status = "absent";
        if (rawStatusStr.includes("punched in") || rawStatusStr === "punched-in") status = "present";
        else if (rawStatusStr.includes("completed")) status = "present";
        else if (rawStatusStr.includes("present")) status = "present";
        else if (rawStatusStr.includes("late")) status = "late";
        else if (rawStatusStr.includes("leave")) status = "leave";
        else if (rawStatusStr.includes("half")) status = "late";

        const name = m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.emp_code;
        const locStr = rec.location || rec.punch_in_location || null;

        return {
          id: m.emp_code,
          name,
          code: m.emp_code,
          role: m.designation || m.role || "Employee",
          department: m.department || "—",
          email: rec.email || m.email || null,
          contact: rec.contact || m.phone || null,
          status,
          rawStatus: rec.status || "—",
          inTime: rec.checkIn || rec.check_in || "--:--",
          outTime: rec.checkOut || rec.check_out || "--:--",
          prodHours: rec.working_hours || rec.hours || rec.prodHours || "0h 00m",
          remark: rec.remark || rec.status || "—",
          location: locStr,
          latitude: rec.latitude || rec.punch_in_latitude || null,
          longitude: rec.longitude || rec.punch_in_longitude || null,
          accuracy: rec.accuracy || rec.punch_in_accuracy || null,
        };
      });

      setMembers(merged);
    } catch (err) {
      console.error("TeamAttendance fetch error:", err);
      if (!silent) {
        managerToast.error("Failed to load attendance data.", { title: "Error" });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

  const handleRefresh = async () => {
    await fetchData();
    managerToast.success("Live attendance feeds synchronized.", { title: "Feeds Synchronized" });
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      const matchesSearch =
        (m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.role || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.code || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [members, searchTerm, statusFilter]);

  const presentCount = members.filter((m) => m.status === "present").length;
  const lateCount = members.filter((m) => m.status === "late").length;
  const leaveCount = members.filter((m) => m.status === "leave").length;
  const absentCount = members.filter((m) => m.status === "absent").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
            Live Team Attendance
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
            {loading
              ? "Loading live attendance..."
              : `Real-time check-in status for ${members.length} team members today.`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "8px 16px", borderRadius: "8px",
            border: "1px solid var(--mp-border)", background: "var(--mp-surface)",
            color: "var(--mp-text-primary)", fontWeight: 600, fontSize: "13px", cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} /> {loading ? "Refreshing..." : "Refresh Feeds"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <ManagerStatCard title="Present Now" value={presentCount} icon={CheckCircle2} variant="success" />
        <ManagerStatCard title="Late Today" value={lateCount} icon={Clock} variant="warning" />
        <ManagerStatCard title="On Leave" value={leaveCount} icon={AlertCircle} variant="info" />
        <ManagerStatCard title="Absent" value={absentCount} icon={AlertCircle} variant="danger" />
      </div>

      {/* Filter & Search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", background: "var(--mp-surface)", border: "1px solid var(--mp-border)", borderRadius: "12px", padding: "12px 16px" }}>
        <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team member by name or code..."
            style={{ width: "100%", padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--mp-border)", background: "var(--mp-surface-subtle)", color: "var(--mp-text-primary)", fontSize: "13.5px", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["all", "present", "late", "leave", "absent"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 14px", borderRadius: "8px", border: "1px solid",
                borderColor: statusFilter === st ? "var(--mp-brand-500, #7C3AED)" : "var(--mp-border)",
                background: statusFilter === st ? "var(--mp-brand-50, #F3EEFF)" : "var(--mp-surface)",
                color: statusFilter === st ? "var(--mp-brand-600, #6D28D9)" : "var(--mp-text-secondary)",
                fontWeight: 600, fontSize: "12.5px", textTransform: "capitalize", cursor: "pointer",
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Team Cards Grid */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "14px" }}>
          Loading attendance data...
        </div>
      ) : (
        <div className="mp-attendance-grid">
          {filteredMembers.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "14px", gridColumn: "1/-1" }}>
              No members match this filter.
            </div>
          ) : (
            filteredMembers.map((m) => {
              const initials = (m.name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div
                  key={m.id}
                  className="mp-emp-card"
                  onClick={() => setSelectedMember(m)}
                  style={{ cursor: "pointer" }}
                  title="Click to view attendance details"
                >
                  <div className="mp-emp-card-header">
                    <div className="mp-emp-card-user">
                      <div className="mp-emp-avatar">{initials}</div>
                      <div>
                        <div className="mp-emp-name">{m.name}</div>
                        <div className="mp-emp-role">{m.role} • {m.code}</div>
                      </div>
                    </div>
                    <ManagerBadge variant={m.status} dot>{m.rawStatus || m.status}</ManagerBadge>
                  </div>

                  <div className="mp-emp-times">
                    <div className="mp-time-block">
                      <span className="mp-time-label">Punch In</span>
                      <span className="mp-time-val">{m.inTime}</span>
                    </div>
                    <div className="mp-time-block">
                      <span className="mp-time-label">Punch Out</span>
                      <span className="mp-time-val">{m.outTime}</span>
                    </div>
                    <div className="mp-time-block">
                      <span className="mp-time-label">Hours</span>
                      <span className="mp-time-val">{m.prodHours}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: "12px", color: "var(--mp-text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {m.location && (
                      <div style={{ marginTop: "4px", padding: "5px 8px", background: "var(--mp-surface-subtle)", borderRadius: "6px", color: "var(--mp-text-secondary)", fontWeight: 500, display: "flex", alignItems: "center", gap: "5px" }}>
                        <MapPin size={11} style={{ flexShrink: 0, color: "#7c3aed" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.location}</span>
                      </div>
                    )}
                    <div style={{ marginTop: m.location ? "2px" : "4px", padding: "6px 8px", background: "var(--mp-surface-subtle)", borderRadius: "6px", color: "var(--mp-text-secondary)", fontWeight: 500 }}>
                      📌 {m.remark}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Detail Modal — Test 7 */}
      {selectedMember && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: "20px", background: "rgba(12,12,20,.52)", backdropFilter: "blur(4px)" }}
          onMouseDown={() => setSelectedMember(null)}
        >
          <div
            style={{ width: "min(500px, 100%)", background: "var(--mp-surface, #fff)", borderRadius: "18px", border: "1px solid var(--mp-border, #e5e7eb)", boxShadow: "0 24px 64px rgba(31,24,69,.22)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--mp-border, #e5e7eb)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: ".1em", color: "#7c3aed", textTransform: "uppercase" }}>Attendance Details</span>
                <h3 style={{ margin: "4px 0 0", fontSize: "17px", fontWeight: 700, color: "var(--mp-text-primary, #111)" }}>Today's Record</h3>
              </div>
              <button type="button" onClick={() => setSelectedMember(null)} style={{ width: "34px", height: "34px", display: "grid", placeItems: "center", borderRadius: "10px", background: "var(--mp-surface-subtle, #f3f4f6)", border: "1px solid var(--mp-border, #e5e7eb)", color: "var(--mp-text-muted, #6b7280)", cursor: "pointer", flexShrink: 0 }} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {/* Employee Info */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--mp-border, #e5e7eb)", background: "var(--mp-surface-subtle, #f9fafb)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#ede9fe", color: "#7c3aed", display: "grid", placeItems: "center", flexShrink: 0, fontWeight: 700, fontSize: "15px" }}>
                  {(selectedMember.name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--mp-text-primary, #111)" }}>{selectedMember.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--mp-text-muted, #6b7280)", marginTop: "2px" }}>{selectedMember.role} • {selectedMember.code} • {selectedMember.department}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {selectedMember.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--mp-text-muted, #6b7280)" }}>
                    <Mail size={12} />{selectedMember.email}
                  </div>
                )}
                {selectedMember.contact && (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--mp-text-muted, #6b7280)" }}>
                    <Phone size={12} />{selectedMember.contact}
                  </div>
                )}
              </div>
            </div>

            {/* Punch Times */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--mp-border, #e5e7eb)" }}>
              <div style={{ padding: "16px 18px", background: "var(--mp-surface, #fff)" }}>
                <div style={{ fontSize: "9px", fontWeight: 800, letterSpacing: ".08em", color: "#7c3aed", textTransform: "uppercase", marginBottom: "6px" }}>Punch In</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--mp-text-primary, #111)" }}>{selectedMember.inTime === "--:--" ? "—" : selectedMember.inTime}</div>
                {selectedMember.location && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "5px", marginTop: "8px", color: "var(--mp-text-muted, #6b7280)", fontSize: "11px" }}>
                    <MapPin size={11} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <span style={{ lineHeight: 1.4, wordBreak: "break-word" }}>{selectedMember.location}</span>
                  </div>
                )}
                {selectedMember.latitude && (
                  <div style={{ fontSize: "10px", color: "var(--mp-text-muted, #9ca3af)", marginTop: "4px", fontFamily: "monospace" }}>
                    {Number(selectedMember.latitude).toFixed(5)}, {Number(selectedMember.longitude).toFixed(5)}
                    {selectedMember.accuracy && <span style={{ marginLeft: "4px", color: "#059669" }}>±{Math.round(selectedMember.accuracy)}m</span>}
                  </div>
                )}
              </div>
              <div style={{ padding: "16px 18px", background: "var(--mp-surface, #fff)" }}>
                <div style={{ fontSize: "9px", fontWeight: 800, letterSpacing: ".08em", color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>Punch Out</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--mp-text-primary, #111)" }}>{selectedMember.outTime === "--:--" ? "—" : selectedMember.outTime}</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--mp-border, #e5e7eb)" }}>
              <div>
                <span style={{ fontSize: "10px", color: "var(--mp-text-muted, #6b7280)", fontWeight: 700, display: "block", marginBottom: "2px" }}>HOURS</span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--mp-text-primary, #111)" }}>{selectedMember.prodHours}</span>
              </div>
              <ManagerBadge variant={selectedMember.status} dot>{selectedMember.rawStatus || selectedMember.status}</ManagerBadge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
