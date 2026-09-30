import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Clock, MapPin, Smartphone, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
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
        const rawStatus = (rec.status || "absent").toLowerCase();
        let status = "absent";
        if (rawStatus.includes("present")) status = "present";
        else if (rawStatus.includes("late")) status = "late";
        else if (rawStatus.includes("leave")) status = "leave";
        else if (rawStatus.includes("half")) status = "late";

        const name = m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.emp_code;

        return {
          id: m.emp_code,
          name,
          code: m.emp_code,
          role: m.designation || m.role || "Employee",
          department: m.department || "—",
          status,
          inTime: rec.checkIn || (status === "absent" ? "--:--" : "--:--"),
          outTime: rec.checkOut || "--:--",
          prodHours: rec.prodHours || "0 Hrs",
          remark: rec.remark || rec.status || "—",
          location: "—",
          device: "—",
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

      {/* Stats Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <ManagerStatCard title="Present Now" value={presentCount} icon={CheckCircle2} variant="success" />
        <ManagerStatCard title="Late Today" value={lateCount} icon={Clock} variant="warning" />
        <ManagerStatCard title="On Leave" value={leaveCount} icon={AlertCircle} variant="info" />
        <ManagerStatCard title="Absent" value={absentCount} icon={AlertCircle} variant="danger" />
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "12px", background: "var(--mp-surface)",
          border: "1px solid var(--mp-border)", borderRadius: "12px", padding: "12px 16px",
        }}
      >
        <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team member by name or code..."
            style={{
              width: "100%", padding: "8px 14px", borderRadius: "8px",
              border: "1px solid var(--mp-border)", background: "var(--mp-surface-subtle)",
              color: "var(--mp-text-primary)", fontSize: "13.5px", outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
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
                <div key={m.id} className="mp-emp-card">
                  <div className="mp-emp-card-header">
                    <div className="mp-emp-card-user">
                      <div className="mp-emp-avatar">{initials}</div>
                      <div>
                        <div className="mp-emp-name">{m.name}</div>
                        <div className="mp-emp-role">{m.role} • {m.code}</div>
                      </div>
                    </div>
                    <ManagerBadge variant={m.status} dot>{m.status}</ManagerBadge>
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
                    <div style={{ marginTop: "4px", padding: "6px 8px", background: "var(--mp-surface-subtle)", borderRadius: "6px", color: "var(--mp-text-secondary)", fontWeight: 500 }}>
                      📌 {m.remark}
                    </div>
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
