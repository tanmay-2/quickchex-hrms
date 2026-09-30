import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Clock } from "lucide-react";
import { ManagerBadge } from "./ManagerBadge";

export const ManagerCalendarView = ({ events = [], onSelectDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026 default
  const [selectedDate, setSelectedDate] = useState(15);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Filter events for selected day
  const selectedDayEvents = events.filter((ev) => {
    const evDate = new Date(ev.date);
    return (
      evDate.getDate() === selectedDate &&
      evDate.getMonth() === month &&
      evDate.getFullYear() === year
    );
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: "20px",
        background: "var(--mp-surface, #FFFFFF)",
        border: "1px solid var(--mp-border, #E6E3EE)",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "var(--mp-shadow-sm)",
      }}
      className="mp-calendar-container"
    >
      {/* Calendar Grid Side */}
      <div>
        {/* Month Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CalendarIcon size={20} style={{ color: "var(--mp-brand-500, #7C3AED)" }} />
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--mp-text-primary)" }}>
              {monthNames[month]} {year}
            </h3>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                padding: "6px",
                borderRadius: "8px",
                border: "1px solid var(--mp-border)",
                background: "var(--mp-surface)",
                cursor: "pointer",
                color: "var(--mp-text-primary)",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                padding: "6px",
                borderRadius: "8px",
                border: "1px solid var(--mp-border)",
                background: "var(--mp-surface)",
                cursor: "pointer",
                color: "var(--mp-text-primary)",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "8px",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          {daysOfWeek.map((day, i) => (
            <div
              key={day}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: i >= 5 ? "var(--mp-danger, #DC2626)" : "var(--mp-text-muted)",
                padding: "6px 0",
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
          {/* Empty cells before 1st of month */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} style={{ height: "64px", opacity: 0.2 }} />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isSelected = selectedDate === dayNum;
            const dayEvents = events.filter((ev) => {
              const evDate = new Date(ev.date);
              return evDate.getDate() === dayNum && evDate.getMonth() === month && evDate.getFullYear() === year;
            });

            const hasLeave = dayEvents.some((e) => e.type === "leave");
            const hasHoliday = dayEvents.some((e) => e.type === "holiday");
            const hasShift = dayEvents.some((e) => e.type === "shift");

            return (
              <div
                key={dayNum}
                onClick={() => {
                  setSelectedDate(dayNum);
                  if (onSelectDate) onSelectDate(new Date(year, month, dayNum));
                }}
                style={{
                  height: "64px",
                  borderRadius: "10px",
                  border: isSelected ? "2px solid var(--mp-brand-500, #7C3AED)" : "1px solid var(--mp-border, #E6E3EE)",
                  background: isSelected ? "var(--mp-brand-50, #F3EEFF)" : "var(--mp-surface, #FFFFFF)",
                  padding: "6px 8px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 140ms ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "var(--mp-brand-600, #6D28D9)" : "var(--mp-text-primary)",
                    }}
                  >
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: isSelected ? "var(--mp-brand-500)" : "var(--mp-surface-sunken)",
                        color: isSelected ? "#FFF" : "var(--mp-text-secondary)",
                        fontSize: "10px",
                        fontWeight: 700,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                  {hasHoliday && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#D97706" }} title="Holiday" />}
                  {hasLeave && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0284C7" }} title="Leave" />}
                  {hasShift && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#059669" }} title="Shift" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Detail */}
      <div
        style={{
          borderLeft: "1px solid var(--mp-border, #E6E3EE)",
          paddingLeft: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--mp-text-muted)", textTransform: "uppercase" }}>
            Schedule For
          </span>
          <h4 style={{ margin: "2px 0 0 0", fontSize: "17px", fontWeight: 700, color: "var(--mp-text-primary)" }}>
            {selectedDate} {monthNames[month]} {year}
          </h4>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto" }}>
          {selectedDayEvents.length === 0 ? (
            <div style={{ padding: "30px 10px", textAlign: "center", color: "var(--mp-text-muted)", fontSize: "13px" }}>
              No scheduled events, leaves, or shifts on this day.
            </div>
          ) : (
            selectedDayEvents.map((ev, i) => (
              <div
                key={i}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid var(--mp-border, #E6E3EE)",
                  background: "var(--mp-surface-subtle, #F8F7FB)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--mp-text-primary)" }}>
                    {ev.title}
                  </span>
                  <ManagerBadge
                    variant={ev.type === "holiday" ? "warning" : ev.type === "leave" ? "leave" : "present"}
                    size="sm"
                  >
                    {ev.type}
                  </ManagerBadge>
                </div>
                {ev.employee && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--mp-text-muted)" }}>
                    <User size={13} />
                    <span>{ev.employee}</span>
                  </div>
                )}
                {ev.time && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--mp-text-muted)" }}>
                    <Clock size={13} />
                    <span>{ev.time}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
