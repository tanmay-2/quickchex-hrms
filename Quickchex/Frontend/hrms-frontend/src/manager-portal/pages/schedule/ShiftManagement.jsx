import React, { useState, useEffect, useCallback } from "react";
import { Sun, Moon, Clock, User, ArrowRightLeft, Plus } from "lucide-react";
import { ManagerBadge } from "../../components/ManagerBadge";
import { ManagerModal } from "../../components/ManagerModal";
import toast, { Toaster } from "react-hot-toast";
import { getTeam } from "../../services/managerApiService";
import "./Schedule.css";

const BASE_SHIFTS = [
  {
    id: "shift-gen",
    name: "General Day Shift",
    timings: "09:30 AM - 06:30 PM",
    graceTime: "15 mins",
    icon: Sun,
    color: "#7C3AED",
  },
  {
    id: "shift-morn",
    name: "Early Morning Operations",
    timings: "07:00 AM - 04:00 PM",
    graceTime: "10 mins",
    icon: Clock,
    color: "#059669",
  },
  {
    id: "shift-eve",
    name: "Evening Support & On-Call",
    timings: "02:00 PM - 11:00 PM",
    graceTime: "15 mins",
    icon: Moon,
    color: "#D97706",
  },
];

export const ShiftManagement = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swaps, setSwaps] = useState(() => {
    try {
      const saved = localStorage.getItem("manager_shift_swaps");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeam();
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load team for shifts:", err);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Dynamically assign real team members to the 3 company shifts
  const shifts = BASE_SHIFTS.map((sh, idx) => {
    const names = teamMembers.map((m) => m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.emp_code);
    let assigned = [];
    if (idx === 0) {
      assigned = names.slice(0, Math.ceil(names.length * 0.6));
    } else if (idx === 1) {
      assigned = names.slice(Math.ceil(names.length * 0.6), Math.ceil(names.length * 0.85));
    } else {
      assigned = names.slice(Math.ceil(names.length * 0.85));
    }
    return { ...sh, members: assigned };
  });

  const handleApproveSwap = (id) => {
    setSwaps((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, status: "approved" } : s));
      try { localStorage.setItem("manager_shift_swaps", JSON.stringify(updated)); } catch {}
      return updated;
    });
    toast.success("Shift swap request sanctioned.");
  };

  const handleRejectSwap = (id) => {
    setSwaps((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, status: "rejected" } : s));
      try { localStorage.setItem("manager_shift_swaps", JSON.stringify(updated)); } catch {}
      return updated;
    });
    toast.success("Shift swap request rejected.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <Toaster position="top-right" />

      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
          Shift & Working Hours Allocation
        </h2>
        <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
          Configure team working hours, review active rosters, and manage employee shift swap requests.
        </p>
      </div>

      {/* Shifts Breakdown */}
      <div className="mp-shift-roster-grid">
        {shifts.map((sh) => {
          const Icon = sh.icon;
          return (
            <div key={sh.id} className="mp-shift-type-card">
              <div className="mp-shift-type-header">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      background: `${sh.color}15`,
                      color: sh.color,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="mp-shift-name">{sh.name}</span>
                </div>
                <ManagerBadge variant="default" size="sm">
                  {sh.members.length} Members
                </ManagerBadge>
              </div>

              <div className="mp-shift-hours">{sh.timings}</div>
              <div style={{ fontSize: "11.5px", color: "var(--mp-text-muted)" }}>
                Grace Period: {sh.graceTime}
              </div>

              <div className="mp-shift-members-list">
                {sh.members.map((m) => (
                  <div key={m} className="mp-shift-member-pill">
                    <span style={{ color: "var(--mp-text-primary)" }}>{m}</span>
                    <span style={{ color: "var(--mp-text-muted)", fontSize: "11px" }}>Active</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Shift Swap Requests */}
      <div
        style={{
          background: "var(--mp-surface, #FFFFFF)",
          border: "1px solid var(--mp-border, #E6E3EE)",
          borderRadius: "16px",
          padding: "22px",
          boxShadow: "var(--mp-shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 700, color: "var(--mp-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <ArrowRightLeft size={18} style={{ color: "var(--mp-brand-500, #7C3AED)" }} />
            <span>Shift Swap Requests</span>
          </h3>
          <span style={{ fontSize: "12.5px", color: "var(--mp-text-muted)" }}>
            {swaps.filter((s) => s.status === "pending").length} Pending
          </span>
        </div>

        {swaps.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "13.5px" }}>
            No shift swap requests pending for your team.
          </div>
        ) : (
          swaps.map((swp) => (
          <div
            key={swp.id}
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "var(--mp-surface-subtle, #F8F7FB)",
              border: "1px solid var(--mp-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--mp-text-primary)" }}>
                {swp.requestor} ➔ {swp.target}
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--mp-text-muted)", marginTop: "2px" }}>
                Target Date: <strong>{swp.date}</strong> • Reason: {swp.reason}
              </div>
            </div>

            {swp.status === "pending" ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleRejectSwap(swp.id)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    border: "1px solid #FECACA",
                    background: "#FEF2F2",
                    color: "#DC2626",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveSwap(swp.id)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#059669",
                    color: "#FFFFFF",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Sanction Swap
                </button>
              </div>
            ) : (
              <ManagerBadge variant={swp.status === "approved" ? "approved" : "rejected"} dot>
                {swp.status}
              </ManagerBadge>
            )}
          </div>
        )))}
      </div>
    </div>
  );
};
