import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Clock,
  MapPin,
  Users,
  Gift,
  Cake,
  Sparkles,
  Building,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CalendarDays,
  Video,
} from "lucide-react";
import {
  PiCalendarBlankBold,
  PiGiftBold,
  PiConfettiBold,
  PiMegaphoneBold,
  PiChalkboardTeacherBold,
} from "react-icons/pi";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./EventsPage.css";

/* =========================================================
   SAMPLE EVENTS DATA
   Today (0 events currently on today 01 Sep 2026)
   Upcoming this week / month
   ========================================================= */

const INITIAL_UPCOMING_EVENTS = [];

const EVENT_CATEGORIES = [
  { label: "Today's Events (0)", count: "0", key: "today", tone: "yellow", icon: PiCalendarBlankBold },
  { label: "This Week (4)", count: "4", key: "week", tone: "purple", icon: PiConfettiBold },
  { label: "This Month (12)", count: "12", key: "month", tone: "blue", icon: CalendarDays },
  { label: "Company Holidays", count: "3", key: "holiday", tone: "orange", icon: PiGiftBold },
];

export const EventsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("today");
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem("admin_events_list");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("admin_events_list", JSON.stringify(events));
    } catch { }
  }, [events]);

  useEffect(() => {
    // Fetch live company holidays to display in events feed
    fetch("http://localhost:8000/api/v1/leave/holidays")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const holidayEvents = data.map((h, i) => ({
            id: `HOL-${h.id || i + 1}`,
            title: `${h.name || h.title || "Holiday"} (Holiday)`,
            type: "Holiday Event",
            category: "holiday",
            date: h.date,
            time: "All Day",
            location: "Company-wide",
            department: "All Company",
            organizer: "HR & Organization",
            attendees: "All",
            description: `Official company holiday observed on ${h.day || ''} (${h.date}).`,
            color: "orange",
          }));
          setEvents((prev) => {
            const existingIds = new Set(prev.map(e => e.id));
            const fresh = holidayEvents.filter(he => !existingIds.has(he.id));
            return [...fresh, ...prev];
          });
        }
      })
      .catch((err) => console.warn("Failed to load holidays in events:", err));
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "Town Hall",
    category: "company",
    date: "2026-09-02",
    time: "10:00 AM - 11:00 AM",
    location: "Main Office & Online",
    department: "All Company",
    description: "",
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    const created = {
      id: `EVT-${Math.floor(100 + Math.random() * 900)}`,
      ...newEvent,
      organizer: "Aaquib Khan (Admin)",
      attendees: 50,
      color:
        newEvent.category === "holiday"
          ? "orange"
          : newEvent.category === "celebration"
            ? "pink"
            : newEvent.category === "training"
              ? "blue"
              : "purple",
    };

    setEvents((prev) => [created, ...prev]);
    setModalOpen(false);
    setNewEvent({
      title: "",
      type: "Town Hall",
      category: "company",
      date: "2026-09-02",
      time: "10:00 AM - 11:00 AM",
      location: "Main Office & Online",
      department: "All Company",
      description: "",
    });
    showToast(`Event "${created.title}" scheduled successfully.`);
  };

  const filteredEvents = useMemo(() => {
    if (activeTab === "today") {
      // In the mockup/data, today (01 Sep 2026) has exactly 0 events
      return [];
    }
    return events.filter((evt) => {
      if (activeTab === "holiday" && evt.category !== "holiday") return false;
      if (typeFilter !== "all" && evt.category !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          evt.title.toLowerCase().includes(q) ||
          evt.location.toLowerCase().includes(q) ||
          evt.department.toLowerCase().includes(q) ||
          evt.type.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [events, activeTab, typeFilter, searchQuery]);

  return (
    <div className="events-page">
      <DashboardHeader />

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="evt-toast">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Overview Tabs ── */}
      <div className="evt-kpi-grid">
        {EVENT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              className={`evt-kpi-card is-${cat.tone}${isActive ? " is-active" : ""}`}
              onClick={() => setActiveTab(cat.key)}
            >
              <div className="evt-kpi-icon-box">
                <Icon size={20} />
              </div>
              <div className="evt-kpi-info">
                <span className="evt-kpi-label">{cat.label}</span>
                <strong className="evt-kpi-count">{cat.count}</strong>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Main Container ── */}
      <div className="evt-card">
        {/* ── Toolbar ── */}
        <div className="evt-toolbar">
          <div className="evt-search-wrap">
            <input
              type="text"
              className="evt-search-input"
              placeholder="Search company events, birthdays or workshops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="evt-clear-search"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="evt-actions">
            <select
              className="evt-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Event Types</option>
              <option value="company">Company &amp; Town Halls</option>
              <option value="celebration">Birthdays &amp; Anniversaries</option>
              <option value="holiday">Holidays</option>
              <option value="training">Trainings</option>
            </select>

            <button
              type="button"
              className="evt-btn-add"
              onClick={() => setModalOpen(true)}
            >
              <Plus size={16} />
              <span>Schedule Event</span>
            </button>
          </div>
        </div>

        {/* ── Events Display ── */}
        {activeTab === "today" ? (
          <div className="evt-today-empty">
            <div className="evt-today-art">
              <Sparkles size={48} className="evt-empty-sparkle" />
            </div>
            <h3>No Events Scheduled for Today</h3>
            <p>
              There are no organization birthdays, holidays, or meetings on today's calendar.
            </p>
            <div className="evt-today-cta">
              <button
                type="button"
                className="evt-btn-switch"
                onClick={() => setActiveTab("week")}
              >
                View Upcoming This Week (4)
              </button>
              <button
                type="button"
                className="evt-btn-create-short"
                onClick={() => setModalOpen(true)}
              >
                <Plus size={14} />
                <span>Create New Event</span>
              </button>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="evt-today-empty">
            <CalendarIcon size={40} className="evt-empty-sparkle" />
            <h3>No Matching Events Found</h3>
            <p>Try refining your search terms or filter selection.</p>
          </div>
        ) : (
          <div className="evt-grid">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className={`evt-item-card is-${evt.color}`}>
                <div className="evt-item-header">
                  <span className={`evt-type-badge is-${evt.color}`}>{evt.type}</span>
                  <span className="evt-item-date">{evt.date}</span>
                </div>

                <h3 className="evt-item-title">{evt.title}</h3>
                <p className="evt-item-desc">{evt.description}</p>

                <div className="evt-item-meta-list">
                  <div className="evt-meta-line">
                    <Clock size={13} />
                    <span>{evt.time}</span>
                  </div>
                  <div className="evt-meta-line">
                    <MapPin size={13} />
                    <span>{evt.location}</span>
                  </div>
                  <div className="evt-meta-line">
                    <Building size={13} />
                    <span>{evt.department}</span>
                  </div>
                </div>

                <div className="evt-item-footer">
                  <span className="evt-attendees">
                    <Users size={13} />
                    <strong>{evt.attendees}</strong> expected
                  </span>
                  <span className="evt-organizer">{evt.organizer}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Schedule Event Modal ── */}
      {modalOpen && (
        <div className="evt-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="evt-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="evt-modal-header">
              <h2>Schedule New Event</h2>
              <button
                type="button"
                className="evt-modal-close"
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div className="evt-modal-body">
                <div className="evt-form-group">
                  <label>Event Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Town Hall Meeting"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                  />
                </div>

                <div className="evt-form-row">
                  <div className="evt-form-group">
                    <label>Event Type</label>
                    <select
                      value={newEvent.type}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cat =
                          val === "Birthday" || val === "Work Anniversary"
                            ? "celebration"
                            : val === "Holiday Event"
                              ? "holiday"
                              : val === "Training"
                                ? "training"
                                : "company";
                        setNewEvent({ ...newEvent, type: val, category: cat });
                      }}
                    >
                      <option value="Town Hall">Town Hall</option>
                      <option value="Holiday Event">Holiday Event</option>
                      <option value="Birthday">Birthday</option>
                      <option value="Work Anniversary">Work Anniversary</option>
                      <option value="Training">Training Workshop</option>
                      <option value="Team Outing">Team Outing</option>
                    </select>
                  </div>

                  <div className="evt-form-group">
                    <label>Target Department</label>
                    <select
                      value={newEvent.department}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, department: e.target.value })
                      }
                    >
                      <option value="All Company">All Company</option>
                      <option value="Operations">Operations</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>
                </div>

                <div className="evt-form-row">
                  <div className="evt-form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      required
                      value={newEvent.date}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, date: e.target.value })
                      }
                    />
                  </div>

                  <div className="evt-form-group">
                    <label>Time Window</label>
                    <input
                      type="text"
                      placeholder="e.g. 03:00 PM - 04:30 PM"
                      value={newEvent.time}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, time: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="evt-form-group">
                  <label>Location / Video Link</label>
                  <input
                    type="text"
                    placeholder="e.g. Conference Room A &amp; Zoom Link"
                    value={newEvent.location}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, location: e.target.value })
                    }
                  />
                </div>

                <div className="evt-form-group">
                  <label>Description &amp; Agenda</label>
                  <textarea
                    rows={3}
                    placeholder="Describe event highlights, dress code, or required prep..."
                    value={newEvent.description}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="evt-modal-footer">
                <button
                  type="button"
                  className="evt-btn-modal-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="evt-btn-modal-submit">
                  <Check size={15} />
                  <span>Save Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
