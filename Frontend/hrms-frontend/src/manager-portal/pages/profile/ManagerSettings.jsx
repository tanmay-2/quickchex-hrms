import React, { useState } from "react";
import { Bell, Mail, Smartphone, Shield, Eye, Check } from "lucide-react";
import { managerToast } from "../../components/ManagerToast";
import "./ProfilePages.css";

export const ManagerSettings = () => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [regularizationAlerts, setRegularizationAlerts] = useState(true);
  const [leaveAlerts, setLeaveAlerts] = useState(true);
  const [lateArrivalAlerts, setLateArrivalAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const handleSave = () => {
    managerToast.success("Manager preferences saved successfully.", { title: "Preferences Saved" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
          Manager Portal Settings & Preferences
        </h2>
        <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
          Configure approval workflow alerts, notification channels, and portal behavior.
        </p>
      </div>

      <div className="mp-settings-group">
        <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 700, color: "var(--mp-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Bell size={18} style={{ color: "var(--mp-brand-500)" }} />
          <span>Team Approval & Alert Preferences</span>
        </h3>

        <div className="mp-settings-row">
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>Instant Email Notifications on Leave Requests</div>
            <div style={{ fontSize: "12px", color: "var(--mp-text-muted)" }}>Receive email as soon as an employee applies for leave.</div>
          </div>
          <input
            type="checkbox"
            checked={leaveAlerts}
            onChange={(e) => setLeaveAlerts(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "#7C3AED" }}
          />
        </div>

        <div className="mp-settings-row">
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>Regularization Request Notifications</div>
            <div style={{ fontSize: "12px", color: "var(--mp-text-muted)" }}>Get notified when a team member submits a punch correction.</div>
          </div>
          <input
            type="checkbox"
            checked={regularizationAlerts}
            onChange={(e) => setRegularizationAlerts(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "#7C3AED" }}
          />
        </div>

        <div className="mp-settings-row">
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>Late Arrival Alerts</div>
            <div style={{ fontSize: "12px", color: "var(--mp-text-muted)" }}>Alert when a team member clocks in beyond grace period.</div>
          </div>
          <input
            type="checkbox"
            checked={lateArrivalAlerts}
            onChange={(e) => setLateArrivalAlerts(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "#7C3AED" }}
          />
        </div>

        <div className="mp-settings-row">
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>Weekly Team Attendance Digest</div>
            <div style={{ fontSize: "12px", color: "var(--mp-text-muted)" }}>Receive automated Monday summary of previous week attendance hours.</div>
          </div>
          <input
            type="checkbox"
            checked={weeklyDigest}
            onChange={(e) => setWeeklyDigest(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "#7C3AED" }}
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          style={{
            marginTop: "10px",
            padding: "10px 22px",
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
          Save Preferences
        </button>
      </div>
    </div>
  );
};
