import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Calendar, Clock, CheckCircle2, Shield, FileText, AlertCircle } from "lucide-react";
import { getTeam } from "../../services/managerApiService";
import { ManagerBadge } from "../../components/ManagerBadge";
import { ManagerStatCard } from "../../components/ManagerStatCard";

export const TeamMemberDetail = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeam()
      .then((team) => {
        if (!Array.isArray(team)) return;
        const found = team.find(
          (m) => String(m.emp_code) === String(memberId) || String(m.id) === String(memberId)
        );
        setMember(
          found || {
            name: "Unknown Member",
            designation: "—",
            emp_code: memberId,
            department: "—",
            email: "—",
            liveStatus: "absent",
            attendanceRate: "—",
            totalLeaves: 0,
            pendingRegularizations: 0,
          }
        );
      })
      .catch(() => {
        setMember({
          name: "Unknown Member",
          designation: "—",
          emp_code: memberId,
          department: "—",
          email: "—",
          liveStatus: "absent",
          attendanceRate: "—",
          totalLeaves: 0,
          pendingRegularizations: 0,
        });
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "14px" }}>
        Loading member details...
      </div>
    );
  }

  const name = member.name || `${member.first_name || ""} ${member.last_name || ""}`.trim() || member.emp_code;
  const role = member.designation || member.role || "Employee";
  const dept = member.department || "—";
  const email = member.email || "—";
  const status = member.liveStatus || "absent";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Member Profile Hero Card */}
      <div
        style={{
          background: "var(--mp-surface, #FFFFFF)",
          border: "1px solid var(--mp-border, #E6E3EE)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "var(--mp-shadow-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div className="mp-member-large-avatar" style={{ width: "72px", height: "72px", fontSize: "26px" }}>
            {name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "var(--mp-text-primary)" }}>
                {name}
              </h2>
              <ManagerBadge variant={status} size="sm" dot>
                {status.toUpperCase()}
              </ManagerBadge>
            </div>
            <div style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", marginTop: "2px" }}>
              {role} • {member.emp_code} • {dept}
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "12.5px", color: "var(--mp-text-secondary)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Mail size={13} /> {email}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Phone size={13} /> {member.phone || "—"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Calendar size={13} /> Joined {member.joinDate || member.date_of_joining || "—"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => navigate("/manager/attendance/records")}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              border: "1px solid var(--mp-border)",
              background: "var(--mp-surface-subtle)",
              color: "var(--mp-text-primary)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Attendance History
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        <ManagerStatCard title="Attendance Rate" value={member.attendanceRate || "—"} subtitle="This month" icon={CheckCircle2} variant="success" />
        <ManagerStatCard title="Current Shift" value="09:30 - 18:30" subtitle="General Day Shift" icon={Clock} variant="primary" />
        <ManagerStatCard title="Leaves Taken" value={`${member.totalLeaves ?? "—"} Days`} subtitle="CL / SL / PL" icon={Calendar} variant="info" />
        <ManagerStatCard title="Pending Requests" value={member.pendingRegularizations ?? "—"} subtitle="Regularization review" icon={AlertCircle} variant="warning" />
      </div>

      {/* Activity Timeline Card */}
      <div
        style={{
          background: "var(--mp-surface, #FFFFFF)",
          border: "1px solid var(--mp-border, #E6E3EE)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "var(--mp-shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 700, color: "var(--mp-text-primary)" }}>
          Recent Attendance & Punch Log History
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { date: "15 Aug 2026", in: "09:30 AM", out: "06:30 PM", hours: "9h 00m", status: "present" },
            { date: "14 Aug 2026", in: "09:42 AM", out: "06:45 PM", hours: "9h 03m", status: "present" },
            { date: "13 Aug 2026", in: "10:14 AM", out: "07:15 PM", hours: "9h 01m", status: "late" },
            { date: "12 Aug 2026", in: "09:28 AM", out: "06:30 PM", hours: "9h 02m", status: "present" },
            { date: "11 Aug 2026", in: "09:30 AM", out: "06:30 PM", hours: "9h 00m", status: "present" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: "10px",
                background: "var(--mp-surface-subtle)",
                border: "1px solid var(--mp-border)",
                fontSize: "13px",
              }}
            >
              <div style={{ fontWeight: 700 }}>{item.date}</div>
              <div>Punch In: <strong>{item.in}</strong></div>
              <div>Punch Out: <strong>{item.out}</strong></div>
              <div>Duration: <strong>{item.hours}</strong></div>
              <ManagerBadge variant={item.status} size="sm">
                {item.status.toUpperCase()}
              </ManagerBadge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
