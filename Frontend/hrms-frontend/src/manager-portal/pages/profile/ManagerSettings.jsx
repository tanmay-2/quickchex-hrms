// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - MANAGERSETTINGS.JSX
// Path: Frontend/hrms-frontend/src/manager-portal/pages/profile/ManagerSettings.jsx
// Purpose: Web portal page component managing 'ManagerSettings' views, user interactions, and state.
// UI Components:
//   • <STORAGE_KEY />
//   • <DEFAULT_PREFERENCES />
//   • <ManagerSettings />
// Key Functions & Handlers:
//   • handleToggle()
//   • handleSave()
// ==============================================================================

import React, { useState } from "react";
import { Sliders, Save, Check } from "lucide-react";
import { managerToast } from "../../components/ManagerToast";
import "./ProfilePages.css";

const STORAGE_KEY = "manager_portal_settings_preferences";

const DEFAULT_PREFERENCES = {
  leaveAlerts: true,
  regularizationAlerts: true,
  lateArrivalAlerts: false,
  earlyDepartureAlerts: true,
  attendanceAnomalyAlerts: true,
  weeklyDigest: false,
};

export const ManagerSettings = () => {
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_PREFERENCES;
  });

  const [saving, setSaving] = useState(false);

  const handleToggle = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      // Subtle delay for realistic button feedback
      await new Promise((r) => setTimeout(r, 450));
      managerToast.success("Manager preferences saved successfully.", {
        title: "Preferences Saved",
      });
    } catch (err) {
      console.error("Save preferences failed:", err);
      managerToast.error("Failed to save preferences. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mp-settings-page">
      {/* Page Header */}
      <div className="mp-page-header-wrap">
        <div className="mp-page-header-text">
          <h2 className="mp-page-main-title">
            Manager Portal Settings &amp; Preferences
          </h2>
          <p className="mp-page-subtitle">
            Configure approval workflow alerts, notification channels, and portal behavior.
          </p>
        </div>
      </div>

      {/* Settings Group Card */}
      <div className="mp-settings-card">
        {/* Section Header */}
        <div className="mp-settings-card-head">
          <div className="mp-settings-head-icon">
            <Sliders size={20} />
          </div>
          <h3 className="mp-settings-head-title">
            Team Approval &amp; Alert Preferences
          </h3>
        </div>

        {/* Setting 1: Leave Requests */}
        <div
          className="mp-setting-item-row"
          onClick={() => handleToggle("leaveAlerts")}
        >
          <div className="mp-setting-info">
            <div className="mp-setting-name">
              Instant Email Notifications on Leave Requests
            </div>
            <div className="mp-setting-desc">
              Receive email as soon as an employee applies for leave.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.leaveAlerts}
            className={`mp-switch-wrap ${preferences.leaveAlerts ? "is-on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle("leaveAlerts");
            }}
          >
            <span className="mp-switch-knob" />
          </button>
        </div>

        {/* Setting 2: Regularization */}
        <div
          className="mp-setting-item-row"
          onClick={() => handleToggle("regularizationAlerts")}
        >
          <div className="mp-setting-info">
            <div className="mp-setting-name">
              Regularization Request Notifications
            </div>
            <div className="mp-setting-desc">
              Get notified when a team member submits a punch correction.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.regularizationAlerts}
            className={`mp-switch-wrap ${preferences.regularizationAlerts ? "is-on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle("regularizationAlerts");
            }}
          >
            <span className="mp-switch-knob" />
          </button>
        </div>

        {/* Setting 3: Late Arrival */}
        <div
          className="mp-setting-item-row"
          onClick={() => handleToggle("lateArrivalAlerts")}
        >
          <div className="mp-setting-info">
            <div className="mp-setting-name">Late Arrival Alerts</div>
            <div className="mp-setting-desc">
              Alert when a team member clocks in beyond grace period.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.lateArrivalAlerts}
            className={`mp-switch-wrap ${preferences.lateArrivalAlerts ? "is-on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle("lateArrivalAlerts");
            }}
          >
            <span className="mp-switch-knob" />
          </button>
        </div>

        {/* Setting 4: Early Departure */}
        <div
          className="mp-setting-item-row"
          onClick={() => handleToggle("earlyDepartureAlerts")}
        >
          <div className="mp-setting-info">
            <div className="mp-setting-name">Early Departure Alerts</div>
            <div className="mp-setting-desc">
              Alert when a team member clocks out earlier than scheduled.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.earlyDepartureAlerts}
            className={`mp-switch-wrap ${preferences.earlyDepartureAlerts ? "is-on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle("earlyDepartureAlerts");
            }}
          >
            <span className="mp-switch-knob" />
          </button>
        </div>

        {/* Setting 5: Attendance Anomaly */}
        <div
          className="mp-setting-item-row"
          onClick={() => handleToggle("attendanceAnomalyAlerts")}
        >
          <div className="mp-setting-info">
            <div className="mp-setting-name">Attendance Anomaly Alerts</div>
            <div className="mp-setting-desc">
              Get notified for unusual attendance patterns (e.g., missed punches, multiple corrections).
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.attendanceAnomalyAlerts}
            className={`mp-switch-wrap ${preferences.attendanceAnomalyAlerts ? "is-on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle("attendanceAnomalyAlerts");
            }}
          >
            <span className="mp-switch-knob" />
          </button>
        </div>

        {/* Setting 6: Weekly Digest */}
        <div
          className="mp-setting-item-row"
          onClick={() => handleToggle("weeklyDigest")}
        >
          <div className="mp-setting-info">
            <div className="mp-setting-name">Weekly Team Attendance Digest</div>
            <div className="mp-setting-desc">
              Receive automated Monday summary of previous week attendance hours.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.weeklyDigest}
            className={`mp-switch-wrap ${preferences.weeklyDigest ? "is-on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle("weeklyDigest");
            }}
          >
            <span className="mp-switch-knob" />
          </button>
        </div>

        {/* Save Preferences Button */}
        <button
          type="button"
          className="mp-settings-save-btn"
          onClick={handleSave}
          disabled={saving}
          title="Save Preferences"
        >
          {saving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Check size={16} />
              <span>Save Preferences</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
