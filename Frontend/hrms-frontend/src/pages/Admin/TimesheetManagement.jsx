import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Pencil,
  Plus,
  X,
  Check,
  BookOpen,
  Users,
  Calendar,
  Shield,
  Bell,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  LayoutList,
  Clock,
  Info,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import { CustomSelect } from "../../components/ui";
import "./TimesheetManagement.css";

/* =========================================================
   SECTION CONTENT DEFINITIONS & DEFAULT DATA
   ========================================================= */

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const YEARS = ["2020", "2021", "2022", "2023", "2024", "2025", "2026", "2027", "2028"];
const FREQUENCIES = ["Weekly", "Daily", "Monthly", "Bi-Weekly"];
const YES_NO_OPTIONS = ["Yes", "No"];
const REMINDER_OPTIONS = ["1 Day", "2 Days", "3 Days", "5 Days", "1 Week", "None"];

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

const TEMPLATE_NAME_OPTIONS = [
  "Standard Workday (8h)",
  "Weekly Summary",
  "Monthly Full",
  "Remote Work Schedule",
  "Field Employee Daily",
  "Contractor Weekly",
  "Part-Time Weekly",
];

function getInitials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "EM"
  );
}

/* =========================================================
   TIMESHEET MANAGEMENT COMPONENT
   ========================================================= */

function TimesheetManagement() {
  const navigate = useNavigate();

  // Active section: "settings" | "templates" | "assignments"
  const [activeSection, setActiveSection] = useState("settings");

  // Settings form persisted state
  const [cycleDay, setCycleDay] = useState("1");
  const [cycleMonth, setCycleMonth] = useState("May");
  const [cycleYear, setCycleYear] = useState("2023");
  const [submissionFreq, setSubmissionFreq] = useState("Weekly");
  const [allowEditAfterSubmit, setAllowEditAfterSubmit] = useState("Yes");
  const [reminderDays, setReminderDays] = useState("3 Days");
  const [managerApprovalReq, setManagerApprovalReq] = useState("Yes");
  const [autoApproveTimesheets, setAutoApproveTimesheets] = useState("No");

  // Edit mode & draft values
  const [editMode, setEditMode] = useState(false);
  const [draftDay, setDraftDay] = useState("1");
  const [draftMonth, setDraftMonth] = useState("May");
  const [draftYear, setDraftYear] = useState("2023");
  const [draftSubmissionFreq, setDraftSubmissionFreq] = useState("Weekly");
  const [draftAllowEdit, setDraftAllowEdit] = useState("Yes");
  const [draftReminderDays, setDraftReminderDays] = useState("3 Days");
  const [draftManagerApproval, setDraftManagerApproval] = useState("Yes");
  const [draftAutoApprove, setDraftAutoApprove] = useState("No");

  // Mobile Help Center accordion
  const [helpAccordionOpen, setHelpAccordionOpen] = useState(false);

  // Template modal
  const [addTemplateModal, setAddTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("Standard Workday (8h)");
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

  // Start editing
  const handleEditClick = () => {
    setDraftDay(cycleDay);
    setDraftMonth(cycleMonth);
    setDraftYear(cycleYear);
    setDraftSubmissionFreq(submissionFreq);
    setDraftAllowEdit(allowEditAfterSubmit);
    setDraftReminderDays(reminderDays);
    setDraftManagerApproval(managerApprovalReq);
    setDraftAutoApprove(autoApproveTimesheets);
    setEditMode(true);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setDraftDay(cycleDay);
    setDraftMonth(cycleMonth);
    setDraftYear(cycleYear);
    setDraftSubmissionFreq(submissionFreq);
    setDraftAllowEdit(allowEditAfterSubmit);
    setDraftReminderDays(reminderDays);
    setDraftManagerApproval(managerApprovalReq);
    setDraftAutoApprove(autoApproveTimesheets);
    setEditMode(false);
  };

  // Save settings
  const handleSave = () => {
    setCycleDay(draftDay);
    setCycleMonth(draftMonth);
    setCycleYear(draftYear);
    setSubmissionFreq(draftSubmissionFreq);
    setAllowEditAfterSubmit(draftAllowEdit);
    setReminderDays(draftReminderDays);
    setManagerApprovalReq(draftManagerApproval);
    setAutoApproveTimesheets(draftAutoApprove);
    setEditMode(false);
    showToast("Timesheet settings saved successfully");
  };

  // Direct select updates (auto enters edit mode for responsive changes)
  const handleSelectField = (field, val) => {
    if (!editMode) {
      setDraftDay(cycleDay);
      setDraftMonth(cycleMonth);
      setDraftYear(cycleYear);
      setDraftSubmissionFreq(submissionFreq);
      setDraftAllowEdit(allowEditAfterSubmit);
      setDraftReminderDays(reminderDays);
      setDraftManagerApproval(managerApprovalReq);
      setDraftAutoApprove(autoApproveTimesheets);
      setEditMode(true);
    }
    if (field === "day") setDraftDay(val);
    if (field === "month") setDraftMonth(val);
    if (field === "year") setDraftYear(val);
    if (field === "freq") setDraftSubmissionFreq(val);
    if (field === "allowEdit") setDraftAllowEdit(val);
    if (field === "reminder") setDraftReminderDays(val);
    if (field === "approval") setDraftManagerApproval(val);
    if (field === "autoApprove") setDraftAutoApprove(val);
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
    setNewTemplateName("Standard Workday (8h)");
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

  // Current values based on editMode
  const curDay = editMode ? draftDay : cycleDay;
  const curMonth = editMode ? draftMonth : cycleMonth;
  const curYear = editMode ? draftYear : cycleYear;
  const curFreq = editMode ? draftSubmissionFreq : submissionFreq;
  const curAllowEdit = editMode ? draftAllowEdit : allowEditAfterSubmit;
  const curReminder = editMode ? draftReminderDays : reminderDays;
  const curApproval = editMode ? draftManagerApproval : managerApprovalReq;
  const curAutoApprove = editMode ? draftAutoApprove : autoApproveTimesheets;

  return (
    <div className="timesheet-mgmt-page">
      {/* 1. CRITICAL — Header preserved exactly */}
      <DashboardHeader />

      {/* MOBILE TOP NAVIGATION PILLS (OPTION B — SETTINGS DASHBOARD) */}
      <div className="tm-mob-tabs-bar" role="tablist" aria-label="Timesheet Details navigation">
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "settings"}
          className={`tm-mob-tab-pill ${activeSection === "settings" ? "is-active" : ""}`}
          onClick={() => setActiveSection("settings")}
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "templates"}
          className={`tm-mob-tab-pill ${activeSection === "templates" ? "is-active" : ""}`}
          onClick={() => setActiveSection("templates")}
        >
          <FileText size={14} />
          <span>Templates</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "assignments"}
          className={`tm-mob-tab-pill ${activeSection === "assignments" ? "is-active" : ""}`}
          onClick={() => setActiveSection("assignments")}
        >
          <Users size={14} />
          <span className="tm-pill-full">Template Assignments</span>
          <span className="tm-pill-short">Assignments</span>
        </button>
      </div>

      {/* =====================================================
          MAIN 3-COLUMN BODY (DESKTOP) / OPTION B CARDS (MOBILE)
          ===================================================== */}
      <div className="tm-body">

        {/* LEFT PANEL: Details List (Desktop Only) */}
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

        {/* CENTER PANEL: Content */}
        <main className="tm-center-panel">

          {/* ═══════════ TAB 1: SETTINGS (OPTION B DASHBOARD) ═══════════ */}
          {activeSection === "settings" && (
            <div className="tm-settings-dashboard">
              {/* Main Card */}
              <div className="tm-main-card">
                {/* Header with Title and Edit / Save Actions */}
                <div className="tm-main-card-header">
                  <div className="tm-main-card-title-group">
                    <div className="tm-main-card-title-row">
                      <div className="tm-header-gear-icon">
                        <Settings size={18} />
                      </div>
                      <h2>Timesheet General Settings</h2>
                    </div>
                    <p className="tm-main-card-subtitle">
                      Define attendance cycles, submission rules and approval workflows for timesheets.
                    </p>
                  </div>

                  <div className="tm-main-card-actions">
                    {editMode ? (
                      <div className="tm-action-btn-group">
                        <button
                          type="button"
                          className="tm-edit-btn tm-save-btn"
                          onClick={handleSave}
                        >
                          <Check size={14} />
                          Save
                        </button>
                        <button
                          type="button"
                          className="tm-icon-btn tm-cancel-icon-btn"
                          title="Cancel"
                          onClick={handleCancelEdit}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="tm-edit-btn"
                        onClick={handleEditClick}
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Card 1: Attendance Cycle */}
                <div className="tm-section-subcard">
                  <div className="tm-subcard-header">
                    <div className="tm-subcard-badge tm-badge-calendar">
                      <Calendar size={15} />
                    </div>
                    <h3>Attendance Cycle</h3>
                  </div>

                  <div className="tm-subcard-body">
                    {/* Field 1: Cycle Start Day */}
                    <div className="tm-form-field">
                      <label className="tm-field-label">
                        Cycle starts on day of the month <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="tm-number-input"
                        value={curDay}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          if (!val || (parseInt(val, 10) >= 1 && parseInt(val, 10) <= 31)) {
                            handleSelectField("day", val);
                          }
                        }}
                        placeholder="1"
                      />
                    </div>

                    {/* Field 2: Active From (Month & Year side-by-side) */}
                    <div className="tm-form-field">
                      <label className="tm-field-label">
                        Active from <span className="req-star">*</span>
                      </label>
                      <div className="tm-month-year-grid">
                        <div className="tm-select-field-wrap">
                          <CustomSelect
                            prefixIcon={<Calendar size={15} />}
                            value={curMonth}
                            options={MONTHS}
                            onChange={(val) => handleSelectField("month", val)}
                            searchable={false}
                            portal={false}
                          />
                        </div>
                        <div className="tm-select-field-wrap">
                          <CustomSelect
                            value={curYear}
                            options={YEARS}
                            onChange={(val) => handleSelectField("year", val)}
                            searchable={false}
                            portal={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Submission Rules */}
                <div className="tm-section-subcard">
                  <div className="tm-subcard-body">
                    {/* Submission Frequency */}
                    <div className="tm-form-field">
                      <label className="tm-field-label">
                        Timesheet submission frequency <span className="req-star">*</span>
                      </label>
                      <CustomSelect
                        prefixIcon={<Calendar size={15} />}
                        value={curFreq}
                        options={FREQUENCIES}
                        onChange={(val) => handleSelectField("freq", val)}
                        searchable={false}
                        portal={false}
                      />
                    </div>

                    {/* Allow Employee Edit After Submission */}
                    <div className="tm-form-field">
                      <label className="tm-field-label">
                        Allow Employee Edit After Submission
                      </label>
                      <CustomSelect
                        prefixIcon={<Shield size={15} />}
                        value={curAllowEdit}
                        options={YES_NO_OPTIONS}
                        onChange={(val) => handleSelectField("allowEdit", val)}
                        searchable={false}
                        portal={false}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 3: Reminders & Approvals */}
                <div className="tm-section-subcard">
                  <div className="tm-subcard-header">
                    <div className="tm-subcard-badge tm-badge-bell">
                      <Bell size={15} />
                    </div>
                    <h3>Reminders & Approvals</h3>
                  </div>

                  <div className="tm-subcard-body">
                    {/* Send reminder */}
                    <div className="tm-form-field">
                      <label className="tm-field-label">
                        Send reminder before due date <span className="req-star">*</span>
                      </label>
                      <CustomSelect
                        prefixIcon={<Bell size={15} />}
                        value={curReminder}
                        options={REMINDER_OPTIONS}
                        onChange={(val) => handleSelectField("reminder", val)}
                        searchable={false}
                        portal={false}
                      />
                    </div>

                    {/* Manager approval required */}
                    <div className="tm-form-field">
                      <label className="tm-field-label">
                        Manager approval required <span className="req-star">*</span>
                      </label>
                      <CustomSelect
                        prefixIcon={<Users size={15} />}
                        value={curApproval}
                        options={YES_NO_OPTIONS}
                        onChange={(val) => handleSelectField("approval", val)}
                        searchable={false}
                        portal={false}
                      />
                    </div>

                    {/* Auto-Approve Submitted Timesheets */}
                    <div className="tm-form-field">
                      <label className="tm-field-label">
                        Auto-Approve Submitted Timesheets
                      </label>
                      <CustomSelect
                        prefixIcon={<CheckCircle2 size={15} />}
                        value={curAutoApprove}
                        options={YES_NO_OPTIONS}
                        onChange={(val) => handleSelectField("autoApprove", val)}
                        searchable={false}
                        portal={false}
                      />
                    </div>
                  </div>
                </div>

                {/* Mobile Bottom Save / Cancel Bar when editing */}
                {editMode && (
                  <div className="tm-mob-save-bar">
                    <button
                      type="button"
                      className="tm-btn-cancel-wide"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="tm-btn-save-wide"
                      onClick={handleSave}
                    >
                      <Check size={16} />
                      Save Settings
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Help Center Card (Collapsible) */}
              <div className="tm-mob-help-card">
                <button
                  type="button"
                  className="tm-mob-help-toggle"
                  onClick={() => setHelpAccordionOpen(!helpAccordionOpen)}
                >
                  <div className="tm-mob-help-toggle-left">
                    <BookOpen size={16} className="tm-help-icon" />
                    <span>Timesheet Help & Instructions</span>
                  </div>
                  {helpAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {helpAccordionOpen && (
                  <div className="tm-mob-help-content">
                    <ul className="tm-help-list">
                      <li>
                        Timesheet settings allows you to configure and manage attendance cycles,
                        project hours, and employee submission rules.
                      </li>
                      <li>
                        Configure template settings like frequency of timesheet submission
                        (daily/weekly/monthly) and manager approval workflows.
                      </li>
                      <li>
                        <strong>Integrated attendance:</strong> Timesheet entries automatically
                        align with the official cycle dates configured here.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ TAB 2: TEMPLATES ═══════════ */}
          {activeSection === "templates" && (
            <div className="tm-templates-container">
              <div className="tm-content-head">
                <div>
                  <h2>Timesheet Templates</h2>
                  <p className="tm-section-desc">Manage template rules, frequencies and approval policies.</p>
                </div>
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

              {/* Desktop Table View */}
              <div className="tm-content-body tm-desktop-only" style={{ padding: "0" }}>
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

              {/* Mobile Cards View */}
              <div className="tm-mob-cards-list tm-mobile-only">
                {templates.map((t) => (
                  <div key={t.id} className="tm-mob-item-card">
                    <div className="tm-mob-item-card-header">
                      <div className="tm-mob-item-title-wrap">
                        <span className="tm-mob-item-title">{t.name}</span>
                        <span className="tm-mob-item-sub">{t.type}</span>
                      </div>
                      <span className={`tm-status-pill ${t.status}`}>
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                    </div>

                    <div className="tm-mob-item-grid">
                      <div className="tm-mob-prop-item">
                        <span className="tm-mob-prop-label">Frequency</span>
                        <span className="tm-mob-prop-value">{t.frequency}</span>
                      </div>
                      <div className="tm-mob-prop-item">
                        <span className="tm-mob-prop-label">Auto Approve</span>
                        <span className="tm-mob-prop-value">{t.autoApprove}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════ TAB 3: TEMPLATE ASSIGNMENTS ═══════════ */}
          {activeSection === "assignments" && (
            <div className="tm-assignments-container">
              <div className="tm-content-head">
                <div>
                  <h2>Template Assignments</h2>
                  <p className="tm-section-desc">Assign timesheet templates to employees and set active date ranges.</p>
                </div>
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

              {/* Desktop Table View */}
              <div className="tm-content-body tm-desktop-only" style={{ padding: "0" }}>
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

              {/* Mobile Cards View */}
              <div className="tm-mob-cards-list tm-mobile-only">
                {assignments.map((a) => (
                  <div key={a.id} className="tm-mob-item-card">
                    <div className="tm-mob-item-card-header">
                      <div className="tm-mob-emp-wrap">
                        <div className="tm-mob-emp-avatar">
                          {getInitials(a.employee)}
                        </div>
                        <div className="tm-mob-emp-details">
                          <span className="tm-mob-item-title">{a.employee}</span>
                          <span className="tm-mob-item-sub">Active since {a.since}</span>
                        </div>
                      </div>
                    </div>

                    <div className="tm-mob-assignment-badge">
                      <FileText size={13} />
                      <span>{a.template}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT PANEL: Help Center (Desktop Only) */}
        <aside className="tm-right-panel tm-desktop-only">
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
          ADD TEMPLATE MODAL (PREMIUM DROPDOWNS)
          ===================================================== */}
      {addTemplateModal && (
        <div className="tm-modal-overlay" onClick={() => setAddTemplateModal(false)}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-head">
              <h3>Add Timesheet Template</h3>
              <button
                type="button"
                className="tm-modal-close"
                onClick={() => setAddTemplateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTemplate}>
              <div className="tm-modal-body">
                <div className="tm-form-field">
                  <label className="tm-field-label">Template Name *</label>
                  <CustomSelect
                    value={newTemplateName}
                    options={TEMPLATE_NAME_OPTIONS}
                    onChange={(val) => setNewTemplateName(val)}
                    searchable={false}
                  />
                </div>

                <div className="tm-form-field">
                  <label className="tm-field-label">Submission Frequency</label>
                  <CustomSelect
                    value={newTemplateFreq}
                    options={FREQUENCIES}
                    onChange={(val) => setNewTemplateFreq(val)}
                    searchable={false}
                  />
                </div>
              </div>

              <div className="tm-modal-foot">
                <button
                  type="button"
                  className="tm-btn-cancel"
                  onClick={() => setAddTemplateModal(false)}
                >
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
          ADD ASSIGNMENT MODAL (PREMIUM DROPDOWNS)
          ===================================================== */}
      {addAssignmentModal && (
        <div className="tm-modal-overlay" onClick={() => setAddAssignmentModal(false)}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-head">
              <h3>Assign Timesheet Template</h3>
              <button
                type="button"
                className="tm-modal-close"
                onClick={() => setAddAssignmentModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAssignment}>
              <div className="tm-modal-body">
                <div className="tm-form-field">
                  <label className="tm-field-label">Employee Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Renuka Vishwakarma (LE024)"
                    value={newAssignEmp}
                    onChange={(e) => setNewAssignEmp(e.target.value)}
                    required
                    className="tm-text-input"
                  />
                </div>

                <div className="tm-form-field">
                  <label className="tm-field-label">Assign Template</label>
                  <CustomSelect
                    value={newAssignTpl}
                    options={templates.map((t) => t.name)}
                    onChange={(val) => setNewAssignTpl(val)}
                    searchable={false}
                  />
                </div>
              </div>

              <div className="tm-modal-foot">
                <button
                  type="button"
                  className="tm-btn-cancel"
                  onClick={() => setAddAssignmentModal(false)}
                >
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
