import React, { useState, useEffect, useCallback } from "react";
import { ManagerCalendarView } from "../../components/ManagerCalendarView";
import { Calendar, Plus } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useManagerAuth } from "../../auth/ManagerAuthContext";
import { getTeamLeaves } from "../../services/managerApiService";

export const TeamCalendar = () => {
  const { manager } = useManagerAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendarData = useCallback(async () => {
    const empCode = manager?.id || manager?.emp_code || localStorage.getItem("emp_code") || "MGR001";
    setLoading(true);
    try {
      const leaves = await getTeamLeaves(empCode);
      const leaveList = Array.isArray(leaves) ? leaves : [];

      const dynamicEvents = leaveList.map((l) => ({
        date: (l.start_date || l.from || "").split("T")[0],
        title: `${l.leave_type || l.leaveType || "Leave"} - ${l.employee_name || l.emp_code}`,
        employee: `${l.employee_name || l.emp_code} (${l.emp_code})`,
        type: "leave",
        status: l.status,
      }));

      setEvents(dynamicEvents);
    } catch (err) {
      console.error("Failed to load team calendar events:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <Toaster position="top-right" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
            Team Schedule & Attendance Calendar
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
            Comprehensive overview of team shifts, approved leaves, holidays, and milestones.
          </p>
        </div>
      </div>

      <ManagerCalendarView events={events} />
    </div>
  );
};
