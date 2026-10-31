// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - TEAMCALENDAR.JSX
// Path: Frontend/hrms-frontend/src/manager-portal/pages/schedule/TeamCalendar.jsx
// Purpose: Web portal page component managing 'TeamCalendar' views, user interactions, and state.
// UI Components:
//   • <TeamCalendar />
// ==============================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ManagerCalendarView } from "../../components/ManagerCalendarView";
import { useManagerAuth } from "../../auth/ManagerAuthContext";
import { getTeamLeaves, getHolidays } from "../../services/managerApiService";
import "./TeamCalendar.css";

export const TeamCalendar = () => {
  const { manager } = useManagerAuth();
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  const fetchCalendarData = useCallback(async () => {
    const empCode =
      manager?.id ||
      manager?.emp_code ||
      localStorage.getItem("emp_code") ||
      "MGR001";

    try {
      // Parallel fetch for leaves and holidays
      const [leavesRes, holidaysRes] = await Promise.all([
        getTeamLeaves(empCode).catch(() => []),
        getHolidays().catch(() => []),
      ]);

      if (!isMountedRef.current) return;

      setLeaves(Array.isArray(leavesRes) ? leavesRes : []);
      setHolidays(Array.isArray(holidaysRes) ? holidaysRes : []);
    } catch (err) {
      console.warn("Failed to load team calendar data:", err);
      if (isMountedRef.current) {
        setLeaves([]);
        setHolidays([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [manager]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchCalendarData();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchCalendarData]);

  return (
    <div className="mp-team-calendar-wrapper">
      {/* ── Page Header ── */}
      <div className="mp-cal-page-header">
        <h2 className="mp-cal-page-title">
          Team Schedule & Attendance Calendar
        </h2>
        <p className="mp-cal-page-subtitle">
          Comprehensive overview of team shifts, approved leaves, holidays, and milestones.
        </p>
      </div>

      {/* ── Calendar View or Stable Skeleton ── */}
      {loading ? (
        <div className="mp-calendar-layout-grid">
          <div className="mp-cal-skeleton-card" style={{ minHeight: "480px" }}>
            <div className="mp-cal-skeleton-bar" style={{ height: "32px", width: "45%" }} />
            <div className="mp-cal-skeleton-bar" style={{ height: "24px", width: "100%" }} />
            <div className="mp-cal-skeleton-bar" style={{ height: "320px", width: "100%" }} />
          </div>
          <div className="mp-cal-skeleton-card" style={{ minHeight: "480px" }}>
            <div className="mp-cal-skeleton-bar" style={{ height: "32px", width: "60%" }} />
            <div className="mp-cal-skeleton-bar" style={{ height: "80px", width: "100%" }} />
            <div className="mp-cal-skeleton-bar" style={{ height: "80px", width: "100%" }} />
            <div className="mp-cal-skeleton-bar" style={{ height: "80px", width: "100%" }} />
          </div>
        </div>
      ) : (
        <ManagerCalendarView
          holidays={holidays}
          leaves={leaves}
        />
      )}
    </div>
  );
};
