import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Bell,
  ChevronDown,
  ChevronUp,
  Settings,
  Pencil,
  List,
  LayoutList,
  HelpCircle,
  Plus,
  X,
  Check,
  BookOpen,
  Layers,
  Users,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./TimesheetManagement.css";

/* =========================================================
   SECTION CONTENT DEFINITIONS
   ========================================================= */

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const YEARS = Array.from({ length: 12 }, (_, i) => (2020 + i).toString());

const TEMPLATES = [
  { id: 1, name: "Standard Workday (8h)", type: "Daily", frequency: "Daily", autoApprove: "No", status: "active" },
  { id: 2, name: "Weekly Summary", type: "Weekly", frequency: "Weekly", autoApprove: "Yes", status: "active" },
  { id: 3, name: "Monthly Full", type: "Monthly", frequency: "Monthly", autoApprove: "No", status: "inactive" },
];

const ASSIGNMENTS = [
  { id: 1, employee: "Renuka Vishwakarma (LE024)", template: "Standard Workday (8h)", since: "May 2023" },
  { id: 2, employee: "Rakesh Singh (LE002)", template: "Weekly Summary", since: "June 2023" },
  { id: 3, employee: "Akash Maurya (LE120)", template: "Standard Workday (8h)", since: "August 2023" },
];

/* =========================================================
   TIMESHEET MANAGEMENT COMPONENT
   ========================================================= */

function TimesheetManagement() {
  const navigate = useNavigate();

  // Left panel active nav
  const [activeSection, setActiveSection] = useState("settings");

  // Settings form state
  const [cycleDay, setCycleDay] = useState("1");
  const [cycleMonth, setCycleMonth] = useState("May");
  const [cycleYear, setCycleYear] = useState("2023");
  const [editMode, setEditMode] = useState(false);

  // Draft values while editing
  const [draftDay, setDraftDay] = useState("1");
  const [draftMonth, setDraftMonth] = useState("May");
  const [draftYear, setDraftYear] = useState("2023");

  // Template modal
  const [addTemplateModal, setAddTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateFreq, setNewTemplateFreq] = useState("Daily");
  const [templates, setTemplates] = useState(TEMPLATES);

  // Assignment modal
  const [addAssignmentModal, setAddAssignmentModal] = useState(false);
  const [newAssignEmp, setNewAssignEmp] = useState("");
  const [newAssignTpl, setNewAssignTpl] = useState("Standard Workday (8h)");
  const [assignments, setAssignments] = useState(ASSIGNMENTS);

  // Toast
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const profileName =
    window.localStorage.getItem("user_name") ||
    window.localStorage.getItem("name") ||
    "RV";

  // Start editing
  const handleEditClick = () => {
    setDraftDay(cycleDay);
    setDraftMonth(cycleMonth);
    setDraftYear(cycleYear);
    setEditMode(true);
  };

  // Save settings
  const handleSave = () => {
    setCycleDay(draftDay);
    setCycleMonth(draftMonth);
    setCycleYear(draftYear);
    setEditMode(false);
    showToast("Timesheet settings saved successfully");
  };

  // Add Template
  const handleAddTemplate = (e) => {
    e.preventDefault();
    if (!newTemplateName) return;
    const t = {
      id: Date.now(),
      name: newTemplateName,
      type: newTemplateFreq,
      frequency: newTemplateFreq,
      autoApprove: "No",
      status: "active",
    };
    setTemplates((prev) => [...prev, t]);
    setNewTemplateName("");
    setAddTemplateModal(false);
    showToast(`Template "${t.name}" added`);
  };

  // Add Assignment
  const handleAddAssignment = (e) => {
    e.preventDefault();
    if (!newAssignEmp) return;
    const a = {
      id: Date.now(),
      employee: newAssignEmp,
      template: newAssignTpl,
      since: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
    setAssignments((prev) => [...prev, a]);
    setNewAssignEmp("");
    setAddAssignmentModal(false);
    showToast(`Assignment added for "${newAssignEmp}"`);
  };

  /* ------ Render center panel based on activeSection ------ */
  const renderCenterContent = () => {
    if (activeSection === "settings") {
      return (
        <>
          <div className="tm-content-head">
            <h2>Timesheet General Settings</h2>
            <div className="tm-content-actions">
              {editMode ? (
                <>
                  <button type="button" className="tm-edit-btn" onClick={handleSave}>
                    <Check size={14} />
                    Save
                  </button>
                  <button
                    type="button"
                    className="tm-icon-btn"
                    title="Cancel"
                    onClick={() => setEditMode(false)}
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="tm-edit-btn" onClick={handleEditClick}>
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="tm-icon-btn"
                    title="View as list"
                    onClick={() => showToast("List view toggled")}
                  >
                    <LayoutList size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="tm-content-body">
            <div className="tm-form-group">
              <label>
                On what day of the month does your attendance cycle begin?{" "}
                <span className="req-star">*</span>
              </label>
              {editMode ? (
                <select
                  className="tm-select"
                  style={{ maxWidth: "200px" }}
                  value={draftDay}
                  onChange={(e) => setDraftDay(e.target.value)}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={String(d)}>
                      {d}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="tm-select"
                  style={{ maxWidth: "200px" }}
                  value={cycleDay}
                  disabled
                >
                  <option>{cycleDay}</option>
                </select>
              )}
            </div>

            <div className="tm-form-group">
              <label>
                From which attendance cycle is this date active from?{" "}
                <span className="req-star">*</span>
              </label>

              {editMode ? (
                <div className="tm-select-row">
                  <select
                    className="tm-select"
                    value={draftMonth}
                    onChange={(e) => setDraftMonth(e.target.value)}
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    className="tm-select"
                    value={draftYear}
                    onChange={(e) => setDraftYear(e.target.value)}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="tm-select-row">
                  <select className="tm-select" value={cycleMonth} disabled>
                    <option>{cycleMonth}</option>
                  </select>
                  <select className="tm-select" value={cycleYear} disabled>
                    <option>{cycleYear}</option>
                  </select>
                </div>
              )}
            </div>

            <div className="tm-form-group" style={{ marginTop: "8px" }}>
              <label>Timesheet Submission Frequency</label>
              {editMode ? (
                <select className="tm-select" style={{ maxWidth: "240px" }}>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              ) : (
                <select className="tm-select" style={{ maxWidth: "240px" }} disabled>
                  <option>Daily</option>
                </select>
              )}
            </div>

            <div className="tm-form-group">
              <label>Auto-Approve Submitted Timesheets</label>
              {editMode ? (
                <select className="tm-select" style={{ maxWidth: "200px" }}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              ) : (
                <select className="tm-select" style={{ maxWidth: "200px" }} disabled>
                  <option>No</option>
                </select>
              )}
            </div>
          </div>
        </>
      );
    }

    if (activeSection === "templates") {
      return (
        <>
          <div className="tm-content-head">
            <h2>Timesheet Templates</h2>
            <div className="tm-content-actions">
              <button
                type="button"
                className="tm-edit-btn"
                onClick={() => setAddTemplateModal(true)}
              >
                <Plus size={14} />
                Add Template
              </button>
            </div>
          </div>

          <div className="tm-content-body" style={{ padding: "0" }}>
            <table className="tm-templates-table">
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Type</th>
                  <th>Frequency</th>
                  <th>Auto Approve</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>{t.type}</td>
                    <td>{t.frequency}</td>
                    <td>{t.autoApprove}</td>
                    <td>
                      <span className={`tm-status-pill ${t.status}`}>
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (activeSection === "assignments") {
      return (
        <>
          <div className="tm-content-head">
            <h2>Template Assignments</h2>
            <div className="tm-content-actions">
              <button
                type="button"
                className="tm-edit-btn"
                onClick={() => setAddAssignmentModal(true)}
              >
                <Plus size={14} />
                Assign Template
              </button>
            </div>
          </div>

          <div className="tm-content-body" style={{ padding: "0" }}>
            <table className="tm-templates-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Assigned Template</th>
                  <th>Active Since</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.employee}</td>
                    <td>{a.template}</td>
                    <td>{a.since}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="timesheet-mgmt-page">
      <DashboardHeader />

      {/* =====================================================
          MAIN 3-COLUMN LAYOUT
          ===================================================== */}
      <div className="tm-body">

        {/* LEFT: Details List */}
        <aside className="tm-left-panel">
          <div className="tm-panel-head">
            <Settings size={18} className="tm-panel-head-icon" />
            <h2>Details List</h2>
          </div>

          <ul className="tm-nav-list" role="navigation">
            <li className="tm-nav-item">
              <button
                type="button"
                className={`tm-nav-btn ${activeSection === "settings" ? "is-active" : ""}`}
                onClick={() => setActiveSection("settings")}
              >
                <span>1. Settings</span>
                {activeSection === "settings" ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </li>

            <li className="tm-nav-item">
              <button
                type="button"
                className={`tm-nav-btn ${activeSection === "templates" ? "is-active" : ""}`}
                onClick={() => setActiveSection("templates")}
              >
                <span>2. Templates</span>
                {activeSection === "templates" ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </li>

            <li className="tm-nav-item">
              <button
                type="button"
                className={`tm-nav-btn ${activeSection === "assignments" ? "is-active" : ""}`}
                onClick={() => setActiveSection("assignments")}
              >
                <span>3. Template Assignments</span>
                {activeSection === "assignments" ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </li>
          </ul>
        </aside>

        {/* CENTER: Content */}
        <main className="tm-center-panel">
          {renderCenterContent()}
        </main>

        {/* RIGHT: Help Center */}
        <aside className="tm-right-panel">
          <div className="tm-help-head">
            <BookOpen size={18} className="tm-help-icon" />
            <h2>Help Center</h2>
          </div>

          <div className="tm-help-body">
            <ul className="tm-help-list">
              <li>
                Timesheet settings allows you to configure and manage company clients,
                projects, allocated tasks and assigned templates.
              </li>
              <li>
                You can define details like client code, project code, per hour rate,
                type of task (internal/external) and the status of the task.
              </li>
              <li>
                You can configure template settings like frequency of timesheet submission
                (daily/weekly/monthly), set approval hierarchy and auto approvals, etc.
              </li>
              <li>
                <strong>Timesheet module is integrated with the attendance module.</strong>{" "}
                Hence, timesheet data can also be used for capturing attendance.
              </li>
              <li>
                <a
                  href="#help"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast("Opening detailed documentation…");
                  }}
                >
                  Click Here
                </a>{" "}
                for detailed information.
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* =====================================================
          ADD TEMPLATE MODAL
          ===================================================== */}
      {addTemplateModal && (
        <div className="tm-modal-overlay" onClick={() => setAddTemplateModal(false)}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-head">
              <h3>Add Timesheet Template</h3>
              <button type="button" className="tm-modal-close" onClick={() => setAddTemplateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTemplate}>
              <div className="tm-modal-body">
                <div className="tm-form-group">
                  <label>Template Name *</label>
                  <select
                    className="tm-select"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    required
                  >
                    <option value="">Select or type name…</option>
                    <option value="Standard Workday (8h)">Standard Workday (8h)</option>
                    <option value="Remote Work Schedule">Remote Work Schedule</option>
                    <option value="Field Employee Daily">Field Employee Daily</option>
                    <option value="Contractor Weekly">Contractor Weekly</option>
                    <option value="Part-Time Weekly">Part-Time Weekly</option>
                  </select>
                </div>

                <div className="tm-form-group">
                  <label>Submission Frequency</label>
                  <select
                    className="tm-select"
                    value={newTemplateFreq}
                    onChange={(e) => setNewTemplateFreq(e.target.value)}
                  >
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
              </div>

              <div className="tm-modal-foot">
                <button type="button" className="tm-btn-cancel" onClick={() => setAddTemplateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="tm-btn-submit">
                  Add Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD ASSIGNMENT MODAL
          ===================================================== */}
      {addAssignmentModal && (
        <div className="tm-modal-overlay" onClick={() => setAddAssignmentModal(false)}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-head">
              <h3>Assign Timesheet Template</h3>
              <button type="button" className="tm-modal-close" onClick={() => setAddAssignmentModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAssignment}>
              <div className="tm-modal-body">
                <div className="tm-form-group">
                  <label>Employee Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Renuka Vishwakarma (LE024)"
                    value={newAssignEmp}
                    onChange={(e) => setNewAssignEmp(e.target.value)}
                    required
                    style={{
                      height: "42px",
                      padding: "0 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--tm-border)",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      color: "var(--tm-ink)",
                      background: "var(--tm-surface)",
                      outline: "none",
                    }}
                  />
                </div>

                <div className="tm-form-group">
                  <label>Assign Template</label>
                  <select
                    className="tm-select"
                    value={newAssignTpl}
                    onChange={(e) => setNewAssignTpl(e.target.value)}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="tm-modal-foot">
                <button type="button" className="tm-btn-cancel" onClick={() => setAddAssignmentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="tm-btn-submit">
                  Assign Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && <div className="tm-toast">{toastMessage}</div>}
    </div>
  );
}

export default TimesheetManagement;
