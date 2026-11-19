// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - BENTOGRIDDASHBOARD.JSX
// Path: Frontend/hrms-frontend/src/components/ui/BentoGridDashboard.jsx
// Purpose: 12-Column Modular Bento Grid Dashboard (Hero Card, Team Snapshot, Quick Dock)
// ==============================================================================

import React, { useState, useEffect } from "react";
import {
  PiClockBold,
  PiCameraBold,
  PiCalendarCheckBold,
  PiFileTextBold,
  PiUserCircleBold,
  PiUsersBold,
  PiArrowRightBold,
  PiCheckCircleBold,
} from "react-icons/pi";
import "./BentoGridDashboard.css";

export function WorkHourCircularRing({ hours = 0, target = 9, size = 110, strokeWidth = 9 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(Math.max(hours / target, 0), 1);
  const strokeDashoffset = circumference - circumference * ratio;
  const isGoalMet = hours >= target;
  const color = isGoalMet ? "#10b981" : hours > 0 ? "#6366f1" : "#cbd5e1";

  const hrs = Math.floor(hours);
  const mins = Math.round((hours - hrs) * 60);

  return (
    <div className="bento-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="bento-ring-inner">
        <span className="bento-ring-time" style={{ color }}>
          {hrs}h {mins < 10 ? `0${mins}` : mins}m
        </span>
        <span className="bento-ring-label">{isGoalMet ? "Goal Met ✓" : `of ${target}h goal`}</span>
      </div>
    </div>
  );
}

export default function BentoGridDashboard({
  alreadyPunchedIn = false,
  alreadyPunchedOut = false,
  checkInTime = null,
  checkOutTime = null,
  hoursLogged = 0,
  headcount = 23,
  presentCount = 18,
  lateCount = 2,
  absentCount = 3,
  wfhCount = 0,
  onPunchClick,
  onActionClick,
  isPunching = false,
}) {
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const total = headcount || 1;
  const presentPct = Math.round((presentCount / total) * 100);
  const latePct = Math.round((lateCount / total) * 100);
  const absentPct = Math.round((absentCount / total) * 100);

  return (
    <div className="bento-grid-container">
      {/* ── 1. HERO ATTENDANCE CARD (40% width / 5 columns) ── */}
      <div className="bento-card bento-hero">
        <div className="bento-hero-top">
          <div className="bento-live-badge">
            <span className="bento-pulse-dot" />
            <span className="bento-live-clock">
              {liveTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="bento-live-sep">·</span>
            <span className="bento-live-date">
              {liveTime.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
            </span>
          </div>

          <span className={`bento-status-pill ${alreadyPunchedIn ? (alreadyPunchedOut ? "is-completed" : "is-active") : "is-idle"}`}>
            {alreadyPunchedOut ? "Punched Out" : alreadyPunchedIn ? "Active On Duty" : "Not Checked In"}
          </span>
        </div>

        <div className="bento-hero-body">
          <WorkHourCircularRing hours={hoursLogged} target={9} size={114} strokeWidth={9} />

          <div className="bento-hero-times">
            <div className="bento-time-row">
              <span className="bento-time-lbl">📍 Check-In</span>
              <strong className="bento-time-val">{checkInTime || "— : —"}</strong>
            </div>
            <div className="bento-time-sep" />
            <div className="bento-time-row">
              <span className="bento-time-lbl">🏁 Check-Out</span>
              <strong className="bento-time-val">{checkOutTime || "— : —"}</strong>
            </div>
          </div>
        </div>

        <div className="bento-hero-footer">
          <button
            type="button"
            className={`bento-punch-btn ${alreadyPunchedIn && !alreadyPunchedOut ? "is-out" : "is-in"}`}
            onClick={onPunchClick}
            disabled={alreadyPunchedOut || isPunching}
          >
            <PiCameraBold className="bento-btn-icon" />
            <span>
              {isPunching
                ? "Recording GPS Punch..."
                : alreadyPunchedOut
                ? "Attendance Completed for Today"
                : alreadyPunchedIn
                ? "Punch Out (Check-Out)"
                : "Punch In (Check-In)"}
            </span>
          </button>
        </div>
      </div>

      {/* ── 2. TEAM SNAPSHOT CARD (30% width / 4 columns) ── */}
      <div className="bento-card bento-snapshot">
        <div className="bento-card-head">
          <h4>Team Today</h4>
          <span className="bento-head-badge">{headcount} Profiles</span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="bento-seg-bar" title={`${presentCount} Present, ${lateCount} Late, ${absentCount} Absent`}>
          <div className="bento-seg seg-present" style={{ width: `${presentPct}%` }} />
          <div className="bento-seg seg-late" style={{ width: `${latePct}%` }} />
          <div className="bento-seg seg-absent" style={{ width: `${absentPct}%` }} />
        </div>

        {/* 4 Metrics Grid */}
        <div className="bento-metrics-grid">
          <div className="bento-m-box is-present">
            <span className="bento-m-val">{presentCount}</span>
            <span className="bento-m-lbl">🟢 Present</span>
          </div>
          <div className="bento-m-box is-late">
            <span className="bento-m-val">{lateCount}</span>
            <span className="bento-m-lbl">🟡 Late</span>
          </div>
          <div className="bento-m-box is-wfh">
            <span className="bento-m-val">{wfhCount}</span>
            <span className="bento-m-lbl">🔵 WFH</span>
          </div>
          <div className="bento-m-box is-absent">
            <span className="bento-m-val">{absentCount}</span>
            <span className="bento-m-lbl">🔴 Absent</span>
          </div>
        </div>

        <p className="bento-foot-note">
          {presentPct}% team attendance recorded today
        </p>
      </div>

      {/* ── 3. QUICK ACTION DOCK (30% width / 3 columns) ── */}
      <div className="bento-card bento-actions">
        <div className="bento-card-head">
          <h4>Quick Actions</h4>
          <span className="bento-hint-shortcut">Ctrl + K</span>
        </div>

        <div className="bento-action-pills">
          <button type="button" className="bento-action-pill is-leave" onClick={() => onActionClick?.("leave")}>
            <span className="bento-pill-icon"><PiCalendarCheckBold /></span>
            <div className="bento-pill-copy">
              <strong>Apply Leave</strong>
              <small>Casual / Sick leave</small>
            </div>
            <PiArrowRightBold className="bento-pill-arrow" />
          </button>

          <button type="button" className="bento-action-pill is-regularize" onClick={() => onActionClick?.("regularization")}>
            <span className="bento-pill-icon"><PiClockBold /></span>
            <div className="bento-pill-copy">
              <strong>Regularize</strong>
              <small>Missed punch / late mark</small>
            </div>
            <PiArrowRightBold className="bento-pill-arrow" />
          </button>

          <button type="button" className="bento-action-pill is-payslip" onClick={() => onActionClick?.("payslips")}>
            <span className="bento-pill-icon"><PiFileTextBold /></span>
            <div className="bento-pill-copy">
              <strong>Payslips</strong>
              <small>Salary statements</small>
            </div>
            <PiArrowRightBold className="bento-pill-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
}
