import React, { useState, useEffect } from "react";
import { useManagerAuth } from "../../auth/ManagerAuthContext";
import { User, Mail, Phone, Building2, MapPin, Calendar, Users, ShieldCheck, Edit3 } from "lucide-react";
import { managerToast } from "../../components/ManagerToast";
import { getTeam } from "../../services/managerApiService";
import "./ProfilePages.css";

export const ManagerProfile = () => {
  const { manager, updateProfile } = useManagerAuth();
  const [editing, setEditing] = useState(false);
  const [teamCount, setTeamCount] = useState(0);
  const [phone, setPhone] = useState(manager?.phone || manager?.mobile_no || "");
  const [location, setLocation] = useState(manager?.location || manager?.branch_location || "Mumbai Office");

  useEffect(() => {
    getTeam()
      .then((data) => {
        if (Array.isArray(data)) setTeamCount(data.length);
      })
      .catch(() => {});
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile({ phone, location });
    setEditing(false);
    managerToast.success("Manager profile updated successfully.", { title: "Profile Updated" });
  };

  const name = manager?.name || `${manager?.first_name || ""} ${manager?.last_name || ""}`.trim() || "Manager User";
  const initials = manager?.initials || name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "MG";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
          Manager Profile & Direct Reports
        </h2>
        <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
          Managerial authority credentials, reporting hierarchy, and team assignment details.
        </p>
      </div>

      <div className="mp-profile-card-grid">
        {/* Left Hero Card */}
        <div
          style={{
            background: "var(--mp-surface, #FFFFFF)",
            border: "1px solid var(--mp-border, #E6E3EE)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "14px",
            boxShadow: "var(--mp-shadow-sm)",
          }}
        >
          <div className="mp-member-large-avatar" style={{ width: "84px", height: "84px", fontSize: "32px" }}>
            {initials}
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--mp-text-primary)" }}>
              {name}
            </h3>
            <div style={{ fontSize: "13px", color: "var(--mp-brand-600)", fontWeight: 700, marginTop: "2px" }}>
              {manager?.designation || manager?.role || "Engineering Manager"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--mp-text-muted)", marginTop: "2px" }}>
              {manager?.department || "Product & Engineering"}
            </div>
          </div>

          <div style={{ width: "100%", padding: "12px", background: "var(--mp-surface-subtle)", borderRadius: "10px", border: "1px solid var(--mp-border)" }}>
            <div style={{ fontSize: "11px", color: "var(--mp-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Direct Reports</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", marginTop: "2px" }}>{teamCount} Members</div>
          </div>

          <button
            type="button"
            onClick={() => setEditing(!editing)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--mp-border)",
              background: "var(--mp-surface)",
              color: "var(--mp-text-primary)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Edit3 size={15} /> {editing ? "Cancel Editing" : "Edit Contact Details"}
          </button>
        </div>

        {/* Right Details Card */}
        <div
          style={{
            background: "var(--mp-surface, #FFFFFF)",
            border: "1px solid var(--mp-border, #E6E3EE)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "var(--mp-shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 700, color: "var(--mp-text-primary)" }}>
            Employment & Contact Information
          </h3>

          {editing ? (
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--mp-border)",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Location Base</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--mp-border)",
                    fontSize: "14px",
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#7C3AED",
                  color: "#FFF",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="mp-req-detail-item">
                <span className="mp-req-label">Official Email</span>
                <span className="mp-req-val">{manager?.email || localStorage.getItem("loginEmail") || "—"}</span>
              </div>
              <div className="mp-req-detail-item">
                <span className="mp-req-label">Phone</span>
                <span className="mp-req-val">{phone || "—"}</span>
              </div>
              <div className="mp-req-detail-item">
                <span className="mp-req-label">Organization</span>
                <span className="mp-req-val">LA ESFERA MULTISERVICES LLP</span>
              </div>
              <div className="mp-req-detail-item">
                <span className="mp-req-label">Location</span>
                <span className="mp-req-val">{location}</span>
              </div>
              <div className="mp-req-detail-item">
                <span className="mp-req-label">Tenure Date</span>
                <span className="mp-req-val">{manager?.joinDate || manager?.emp_join_date || "—"}</span>
              </div>
              <div className="mp-req-detail-item">
                <span className="mp-req-label">Management Level</span>
                <span className="mp-req-val">{manager?.systemRole === "admin" ? "Level M1 (Administrator)" : "Level M2 (Line Manager)"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
