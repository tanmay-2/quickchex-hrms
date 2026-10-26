import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Bell,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  Plus,
  X,
  Check,
  Calendar,
  AlertCircle,
  Trash2,
  Edit2,
  Info,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./EmployeeTimesheetDetail.css";
import { getApiUrl } from "../../services/apiClient";

const MONTHS = [
  "January-2026",
  "February-2026",
  "March-2026",
  "April-2026",
  "May-2026",
  "June-2026",
  "July-2026",
  "August-2026",
  "September-2026",
  "October-2026",
  "November-2026",
  "December-2026",
];

// Helper to generate all days in a month string e.g. "August-2026"
function getDaysInMonth(monthYearStr) {
  const [monthName, yearStr] = monthYearStr.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthIndex = monthNames.indexOf(monthName);
  const year = parseInt(yearStr, 10) || 2026;
  const daysCount = new Date(year, monthIndex + 1, 0).getDate();

  const days = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let d = 1; d <= daysCount; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const dayOfWeek = dayNames[dateObj.getDay()];
    const padD = String(d).padStart(2, "0");
    const padM = String(monthIndex + 1).padStart(2, "0");

    days.push({
      dayNum: d,
      fullDateStr: `${padD}-${padM}-${year}`,
      displayLabel: `${padD}-${padM}-${year},${dayOfWeek}`,
      dayOfWeek,
      formattedDay: `${d} ${monthName} ${year}`,
    });
  }

  return days;
}

const EMPLOYEE_MAP = {};

function EmployeeTimesheetDetail() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState({ name: "Employee", code: employeeId || "" });

  useEffect(() => {
    if (!employeeId) return;
    fetch(getApiUrl(`/profile/employees/${employeeId}`))
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const name = data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || employeeId;
          setEmployee({ name, code: data.emp_code || employeeId });
        }
      })
      .catch(() => {
        // fallback to lookup from localStorage employee list
        try {
          const stored = JSON.parse(localStorage.getItem("employee_list") || "[]");
          const found = stored.find(e => e.emp_code === employeeId || e.id === employeeId);
          if (found) {
            const name = found.name || `${found.first_name || ''} ${found.last_name || ''}`.trim() || employeeId;
            setEmployee({ name, code: found.emp_code || employeeId });
          }
        } catch { }
      });
  }, [employeeId]);

  const [selectedMonth, setSelectedMonth] = useState("August-2026");
  const daysList = useMemo(() => getDaysInMonth(selectedMonth), [selectedMonth]);

  const [selectedDay, setSelectedDay] = useState(daysList[0]);

  // Update selected day when month changes
  useEffect(() => {
    if (daysList.length > 0) {
      setSelectedDay(daysList[0]);
    }
  }, [daysList]);

  // Timesheet entries state stored per date string
  const [timesheetEntries, setTimesheetEntries] = useState({});

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [approveRejectModal, setApproveRejectModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Form State
  const [formProject, setFormProject] = useState("HRMS Portal Development");
  const [formTask, setFormTask] = useState("Feature Implementation & UI Polish");
  const [formHours, setFormHours] = useState("8.0");
  const [formDescription, setFormDescription] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Calculate summary counts
  const currentEntries = timesheetEntries[selectedDay?.fullDateStr] || [];

  const totalApproved = Object.values(timesheetEntries)
    .flat()
    .filter((e) => e.status === "Approved").length;

  const totalPending = Object.values(timesheetEntries)
    .flat()
    .filter((e) => e.status === "Pending").length;

  const totalNotSubmitted = Math.max(
    0,
    daysList.length - (totalApproved + totalPending)
  );

  const handleAddTimesheet = (e) => {
    e.preventDefault();
    if (!formProject || !formHours) {
      showToast("Please fill in project and hours");
      return;
    }

    const newEntry = {
      id: `TS-${Date.now().toString().slice(-4)}`,
      project: formProject,
      task: formTask,
      hours: parseFloat(formHours) || 8.0,
      description: formDescription || "Standard work hours logged.",
      status: "Pending",
      date: selectedDay.fullDateStr,
    };

    setTimesheetEntries((prev) => ({
      ...prev,
      [selectedDay.fullDateStr]: [...(prev[selectedDay.fullDateStr] || []), newEntry],
    }));

    setFormDescription("");
    setAddModalOpen(false);
    showToast(`Timesheet logged for ${selectedDay.formattedDay}`);
  };

  const handleApproveAllPending = () => {
    setTimesheetEntries((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((dateKey) => {
        updated[dateKey] = updated[dateKey].map((entry) => ({
          ...entry,
          status: "Approved",
        }));
      });
      return updated;
    });
    setApproveRejectModal(false);
    showToast("All pending timesheets approved");
  };

  const handleRejectAllPending = () => {
    setTimesheetEntries((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((dateKey) => {
        updated[dateKey] = updated[dateKey].filter(
          (entry) => entry.status !== "Pending"
        );
      });
      return updated;
    });
    setApproveRejectModal(false);
    showToast("Pending timesheets rejected");
  };

  const handleDownloadCSV = () => {
    const allEntries = Object.values(timesheetEntries).flat();
    if (allEntries.length === 0) {
      showToast("No timesheet entries to download");
      return;
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Date,Employee Name,Emp Code,Project,Task,Hours,Status"]
        .concat(
          allEntries.map(
            (e) =>
              `${e.date},"${employee.name}",${employee.code},"${e.project}","${e.task}",${e.hours},${e.status}`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timesheet_${employee.code}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded timesheet for ${employee.name}`);
  };

  const profileName =
    window.localStorage.getItem("user_name") ||
    window.localStorage.getItem("name") ||
    "Renuka Vishwakarma";

  return (
    <div className="employee-timesheet-page">
      <DashboardHeader title="Timesheet Request Detail" subtitle="Review employee timesheet entry and application status." />

      {/* =====================================================
          MAIN BODY
          ===================================================== */}
      <div className="tsd-body">
        {/* TITLE & MONTH SELECTOR ROW */}
        <div className="tsd-title-row">
          <h2>
            {employee.name} - ({employee.code})
          </h2>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="tsd-month-dropdown"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* SUMMARY CARDS (3 COLS) */}
        <div className="tsd-summary-grid">
          {/* Card 1: Approved */}
          <div className="tsd-card card-green">
            <div className="tsd-card-left-wrap">
              <div className="tsd-card-icon approved">
                <CheckCircle2 size={18} />
              </div>
              <div className="tsd-card-text-wrap">
                <span className="tsd-card-heading">Total Approved Timesheets</span>
                <span className="tsd-card-number">{totalApproved}</span>
              </div>
            </div>
            <button
              type="button"
              className="tsd-card-btn download"
              onClick={handleDownloadCSV}
            >
              <Download size={14} />
              <span>Download</span>
            </button>
          </div>

          {/* Card 2: Pending */}
          <div className="tsd-card card-yellow">
            <div className="tsd-card-left-wrap">
              <div className="tsd-card-icon pending">
                <Clock size={18} />
              </div>
              <div className="tsd-card-text-wrap">
                <span className="tsd-card-heading">Timesheets Pending Approval</span>
                <span className="tsd-card-number">{totalPending}</span>
              </div>
            </div>
            <button
              type="button"
              className="tsd-card-btn approve"
              onClick={() => setApproveRejectModal(true)}
            >
              <FileText size={14} />
              <span>Approve / Reject</span>
            </button>
          </div>

          {/* Card 3: Not Submitted */}
          <div className="tsd-card card-purple">
            <div className="tsd-card-left-wrap">
              <div className="tsd-card-icon not-submitted">
                <FileText size={18} />
              </div>
              <div className="tsd-card-text-wrap">
                <span className="tsd-card-heading">Timesheets Not Submitted</span>
                <span className="tsd-card-number">{totalNotSubmitted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TWO COLUMN CONTENT SECTION */}
        <div className="tsd-main-split">
          {/* LEFT: DATE LIST */}
          <div className="tsd-date-list-card">
            {daysList.map((d) => {
              const isActive = selectedDay?.fullDateStr === d.fullDateStr;

              return (
                <button
                  key={d.fullDateStr}
                  type="button"
                  className={`tsd-date-item ${isActive ? "is-active" : ""}`}
                  onClick={() => setSelectedDay(d)}
                >
                  <span className="tsd-date-item-label">{d.displayLabel}</span>
                  <div className="tsd-date-item-right">
                    <FileText size={15} className="tsd-date-icon" />
                    <ChevronRight size={15} className="tsd-date-chevron" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* RIGHT: SELECTED DAY TIMESHEET DETAILS */}
          <div className="tsd-day-detail-card">
            <div className="tsd-day-head">
              <div className="tsd-day-head-info">
                <h3 className="tsd-day-title">Timesheet for {selectedDay?.formattedDay}</h3>
                <span
                  className={`tsd-status-badge ${
                    currentEntries.length === 0
                      ? "not-submitted"
                      : currentEntries.some((e) => e.status === "Pending")
                      ? "pending"
                      : "approved"
                  }`}
                >
                  {currentEntries.length === 0
                    ? "Not Submitted"
                    : currentEntries.some((e) => e.status === "Pending")
                    ? "Pending Approval"
                    : "Approved"}
                </span>
              </div>

              <button
                type="button"
                className="tsd-add-btn"
                onClick={() => setAddModalOpen(true)}
              >
                <Plus size={16} />
                <span>Add Timesheet</span>
              </button>
            </div>

            {currentEntries.length === 0 ? (
              <div className="tsd-empty-day">
                <div className="tsd-empty-icon-wrap">
                  <Calendar size={38} />
                </div>
                <h4>No Timesheet Logged for this Date</h4>
                <p>
                  Click "+ Add Timesheet" above to log hours and tasks for{" "}
                  {selectedDay?.formattedDay}.
                </p>
                {/* Note: Duplicate button intentionally removed from empty state per design specs */}
              </div>
            ) : (
              <div className="tsd-entries-list">
                {currentEntries.map((entry) => (
                  <div key={entry.id} className="tsd-entry-item">
                    <div className="tsd-entry-info">
                      <strong>{entry.project}</strong>
                      <p>
                        {entry.task} — {entry.description}
                      </p>
                    </div>

                    <div className="tsd-entry-meta">
                      <span className="tsd-hours-tag">{entry.hours} hrs</span>
                      <span
                        className={`tsd-status-tag ${
                          entry.status === "Approved" ? "approved" : "pending"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          ADD TIMESHEET MODAL
          ===================================================== */}
      {addModalOpen && (
        <div className="tsd-modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="tsd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tsd-modal-drag-handle" />
            <div className="tsd-modal-head">
              <h3>Add Timesheet for {selectedDay?.formattedDay}</h3>
              <button
                type="button"
                className="tsd-modal-close"
                onClick={() => setAddModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTimesheet} className="tsd-modal-form">
              <div className="tsd-modal-body">
                <div className="tsd-form-group">
                  <label>
                    Project Name <span className="tsd-required">*</span>
                  </label>
                  <div className="tsd-select-wrap">
                    <select
                      value={formProject}
                      onChange={(e) => setFormProject(e.target.value)}
                      required
                    >
                      <option value="HRMS Portal Development">HRMS Portal Development</option>
                      <option value="Attendance & Biometric Sync">Attendance & Biometric Sync</option>
                      <option value="Payroll Processing Module">Payroll Processing Module</option>
                      <option value="Employee Self Service Portal">Employee Self Service Portal</option>
                      <option value="Client Site Deployment">Client Site Deployment</option>
                    </select>
                    <ChevronDown size={16} className="tsd-select-chevron" />
                  </div>
                </div>

                <div className="tsd-form-group">
                  <label>
                    Task / Activity <span className="tsd-required">*</span>
                  </label>
                  <div className="tsd-select-wrap">
                    <select
                      value={formTask}
                      onChange={(e) => setFormTask(e.target.value)}
                      required
                    >
                      <option value="Feature Implementation & UI Polish">Feature Implementation & UI Polish</option>
                      <option value="Bug Fixing & Code Optimization">Bug Fixing & Code Optimization</option>
                      <option value="API Integration & Testing">API Integration & Testing</option>
                      <option value="Database Schema Migration">Database Schema Migration</option>
                      <option value="UI/UX Responsiveness & Layout Review">UI/UX Responsiveness & Layout Review</option>
                      <option value="Client Meeting & Requirement Analysis">Client Meeting & Requirement Analysis</option>
                    </select>
                    <ChevronDown size={16} className="tsd-select-chevron" />
                  </div>
                </div>

                <div className="tsd-form-group">
                  <label>
                    Hours Worked <span className="tsd-required">*</span>
                  </label>
                  <div className="tsd-input-suffix-wrap">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      required
                      placeholder="8.0"
                      value={formHours}
                      onChange={(e) => setFormHours(e.target.value)}
                    />
                    <span className="tsd-input-suffix">hrs</span>
                  </div>
                </div>

                <div className="tsd-form-group">
                  <label>Description / Notes</label>
                  <div className="tsd-textarea-wrap">
                    <textarea
                      placeholder="Provide details about the work done..."
                      value={formDescription}
                      maxLength={500}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                    <span className="tsd-char-counter">{formDescription.length}/500</span>
                  </div>
                </div>
              </div>

              <div className="tsd-modal-foot">
                <button
                  type="button"
                  className="tsd-btn-cancel"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="tsd-btn-submit">
                  Save Timesheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          APPROVE / REJECT MODAL
          ===================================================== */}
      {approveRejectModal && (
        <div
          className="tsd-modal-overlay"
          onClick={() => setApproveRejectModal(false)}
        >
          <div className="tsd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tsd-modal-head">
              <h3>Approve or Reject Timesheets</h3>
              <button
                type="button"
                className="tsd-modal-close"
                onClick={() => setApproveRejectModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tsd-modal-body">
              <p style={{ margin: 0, fontSize: "14px", color: "var(--tsd-ink)" }}>
                You have <strong>{totalPending}</strong> pending timesheet
                entries for <strong>{employee.name}</strong> in{" "}
                <strong>{selectedMonth}</strong>.
              </p>
            </div>

            <div className="tsd-modal-foot">
              <button
                type="button"
                className="tsd-btn-cancel"
                onClick={() => setApproveRejectModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={handleRejectAllPending}
              >
                Reject All
              </button>
              <button
                type="button"
                className="tsd-btn-submit"
                onClick={handleApproveAllPending}
              >
                Approve All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMessage && <div className="tsd-toast">{toastMessage}</div>}
    </div>
  );
}

export default EmployeeTimesheetDetail;
