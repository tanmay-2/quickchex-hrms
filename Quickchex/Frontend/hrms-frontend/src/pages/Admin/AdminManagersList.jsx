import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Calendar, 
  Search, 
  ChevronRight, 
  Briefcase, 
  Mail, 
  Phone 
} from "lucide-react";

export default function AdminManagersList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ total_managers: 0, managers: [] });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchManagers = () => {
    setLoading(true);
    const token = localStorage.getItem("token") || "";
    const primaryHost = (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? `${window.location.hostname}:8000` : '127.0.0.1:8000';
    const hosts = [primaryHost, "127.0.0.1:8000", "localhost:8000"];
    const uniqueHosts = [...new Set(hosts)];

    const tryFetch = async () => {
      let lastErr;
      for (const host of uniqueHosts) {
        try {
          const res = await fetch(`http://${host}/admin/managers`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          if (res.ok) return await res.json();
        } catch (err) { lastErr = err; }
      }
      throw lastErr;
    };

    tryFetch()
      .then((resData) => {
        if (resData && resData.managers) {
          setData(resData);
        }
      })
      .catch((err) => console.warn("Failed to fetch managers:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const filteredManagers = (data.managers || []).filter((m) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      (m.name || "").toLowerCase().includes(q) ||
      (m.emp_code || "").toLowerCase().includes(q) ||
      (m.department || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q)
    );
  });

  const totalTeamMembers = (data.managers || []).reduce((acc, m) => acc + (m.team_size || 0), 0);
  const totalPresentToday = (data.managers || []).reduce((acc, m) => acc + (m.present_today || 0), 0);
  const totalOnLeaveToday = (data.managers || []).reduce((acc, m) => acc + (m.leave_today || 0), 0);

  return (
    <div className="dash-page-container">
      {/* Header */}
      <div className="dash-page-header">
        <div className="dash-page-header__left">
          <span className="dash-page-header__eyebrow">Admin Portal</span>
          <h1 className="dash-page-header__title">Managers & Teams</h1>
          <p className="dash-page-header__subtitle">
            View all managers, monitor direct reportees, and inspect team attendance in real-time.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div className="card" style={{ padding: "18px 20px", borderRadius: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(124,58,237,0.1)", color: "#7c3aed", display: "grid", placeItems: "center" }}>
              <Users size={22} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)", fontWeight: 600 }}>Total Managers</span>
              <h2 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 700 }}>{data.total_managers || 0}</h2>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderRadius: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(59,130,246,0.1)", color: "#3b82f6", display: "grid", placeItems: "center" }}>
              <Users size={22} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)", fontWeight: 600 }}>Total Team Members</span>
              <h2 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 700 }}>{totalTeamMembers}</h2>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderRadius: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(34,197,94,0.1)", color: "#22c55e", display: "grid", placeItems: "center" }}>
              <UserCheck size={22} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)", fontWeight: 600 }}>Present Today</span>
              <h2 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 700 }}>{totalPresentToday}</h2>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderRadius: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(168,85,247,0.1)", color: "#a855f7", display: "grid", placeItems: "center" }}>
              <Calendar size={22} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)", fontWeight: 600 }}>On Leave Today</span>
              <h2 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 700 }}>{totalOnLeaveToday}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Managers Directory</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
              Select a manager to view their team member roster and daily attendance.
            </p>
          </div>

          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #64748b)" }} />
            <input
              type="text"
              placeholder="Search manager, code or dept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "9px",
                border: "1px solid var(--border, #e2e8f0)",
                fontSize: "13px",
                outline: "none"
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "var(--surface-2, #f8fafc)" }}>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left", borderRadius: "8px 0 0 8px" }}>Manager</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Emp Code</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Designation</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Department</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Team Size</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Present</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Absent</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>On Leave</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Half Day</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "right", borderRadius: "0 8px 8px 0" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                    Loading managers...
                  </td>
                </tr>
              ) : filteredManagers.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                    No managers found.
                  </td>
                </tr>
              ) : (
                filteredManagers.map((m) => (
                  <tr key={m.id || m.emp_code} style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                    <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#7c3aed", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "13px" }}>
                          {m.name ? m.name.charAt(0).toUpperCase() : "M"}
                        </div>
                        <div>
                          <strong style={{ display: "block", fontSize: "13px" }}>{m.name}</strong>
                          <span style={{ fontSize: "11px", color: "var(--text-muted, #64748b)" }}>{m.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px", fontSize: "12px", fontWeight: 600 }}>{m.emp_code}</td>
                    <td style={{ padding: "14px", fontSize: "12px" }}>{m.designation}</td>
                    <td style={{ padding: "14px", fontSize: "12px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "6px", background: "rgba(124,58,237,0.08)", color: "#7c3aed", fontWeight: 600, fontSize: "11px" }}>
                        {m.department}
                      </span>
                    </td>
                    <td style={{ padding: "14px", textAlign: "center", fontSize: "13px", fontWeight: 700 }}>{m.team_size}</td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "12px", background: "rgba(34,197,94,0.1)", color: "#16a34a", fontWeight: 700, fontSize: "11px" }}>
                        {m.present_today}
                      </span>
                    </td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "12px", background: "rgba(239,68,68,0.1)", color: "#dc2626", fontWeight: 700, fontSize: "11px" }}>
                        {m.absent_today}
                      </span>
                    </td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "12px", background: "rgba(168,85,247,0.1)", color: "#9333ea", fontWeight: 700, fontSize: "11px" }}>
                        {m.leave_today}
                      </span>
                    </td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "12px", background: "rgba(245,158,11,0.1)", color: "#d97706", fontWeight: 700, fontSize: "11px" }}>
                        {m.halfday_today}
                      </span>
                    </td>
                    <td style={{ padding: "14px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          onClick={() => navigate(`/admin/managers/${m.emp_code}/team`)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            background: "#7c3aed",
                            color: "#ffffff",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          View Team <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
