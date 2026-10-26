import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Settings,
  Pencil,
  Check,
  X,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  HelpCircle,
  BookOpen,
  Eye,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Info,
  Calendar,
  Layers,
  Users,
  Shield,
  RotateCcw,
  CreditCard,
  Mail,
} from "lucide-react";
import { CustomSelect, CustomDatePicker } from "../../components/ui";
import "./LeaveManagementSettings.css";

/* =========================================================
   INITIAL DATA MATCHING REFERENCE SCREENSHOTS & OPTION B
   ========================================================= */

const INITIAL_GENERAL_SETTINGS = {
  leaveCycleStartMonth: "April",
  leaveCycleYear: "2026",
  adminsManageAccessAllowed: true,
  supervisorsAddAdjustments: false,
  runDailyAccruals: true,
  employeesApplyEncashment: false,
  initialBalancesDate: "2025-03-31",
  showEmailApproveReject: false,
  selectedViewUser: "None selected",
};

const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEAR_OPTIONS = ["2024", "2025", "2026", "2027", "2028"];

const VIEW_USER_OPTIONS = [
  "None selected",
  "HR Department Head",
  "Finance Operations Lead",
  "Renuka Vishwakarma (LE024)",
  "Kevin Fernandes (LE101)",
];

const LEAVE_TYPE_OPTIONS = [
  { value: "General Leave", label: "General Leave" },
  { value: "Annual Non-Accrual Leave", label: "Annual Non-Accrual Leave" },
  { value: "Comp Off", label: "Comp Off" },
  { value: "Special Leave", label: "Special Leave" },
];

const FREQUENCY_OPTIONS = [
  { value: "Annually", label: "Annually" },
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Not Applicable", label: "Not Applicable" },
];

const INITIAL_CATEGORIES = [
  { id: 1, label: "Casual Leave", code: "CL", days: 12, type: "General Leave", frequency: "Annually", status: "Active" },
  { id: 2, label: "Sick Leave", code: "SL", days: 10, type: "General Leave", frequency: "Annually", status: "Active" },
  { id: 3, label: "Earned Leave", code: "EL", days: 20, type: "General Leave", frequency: "Annually", status: "Active" },
  { id: 4, label: "Earned / Sick Leave", code: "ESL", days: 22, type: "General Leave", frequency: "Annually", status: "Active" },
  { id: 5, label: "Leave Without Pay", code: "LWP", days: 0, type: "General Leave", frequency: "Monthly", status: "Active" },
  { id: 6, label: "Comp off", code: "CO", days: 5, type: "General Leave", frequency: "Monthly", status: "Active" },
  { id: 7, label: "HALF DAY", code: "HD", days: 6, type: "General Leave", frequency: "Monthly", status: "Active" },
  { id: 8, label: "Compassionate Leave", code: "CPL", days: 5, type: "Annual Non-Accrual Leave", frequency: "Not Applicable", status: "Active" },
  { id: 9, label: "Maternity Leave", code: "ML", days: 180, type: "Annual Non-Accrual Leave", frequency: "Not Applicable", status: "Active" },
  { id: 10, label: "Paternity Leave", code: "PL", days: 15, type: "Annual Non-Accrual Leave", frequency: "Not Applicable", status: "Active" },
];

const INITIAL_TEMPLATES = [
  { id: 1, name: "LEAVE POLICY", coveredCount: 26, categoryCount: 4, status: "Active" },
  { id: 2, name: "New Leave Policy 2025", coveredCount: 101, categoryCount: 7, status: "Active" },
  { id: 3, name: "Executive Leadership Policy", coveredCount: 18, categoryCount: 6, status: "Active" },
  { id: 4, name: "Probationary Policy", coveredCount: 15, categoryCount: 3, status: "Active" },
];

const INITIAL_ASSIGNMENTS = [
  { id: 1, name: "la esfera", empCode: "1001", policy: "New Leave Policy 2025", supervisor: "L 1: Finance Admin" },
  { id: 2, name: "Rakesh Singh", empCode: "LE002", policy: "New Leave Policy 2025", supervisor: "L 1: Reema Shah" },
  { id: 3, name: "Chirag Vyas", empCode: "LE001", policy: "New Leave Policy 2025", supervisor: "L 1: Reema Shah" },
  { id: 4, name: "Renuka Vishwakarma", empCode: "LE024", policy: "New Leave Policy 2025", supervisor: "L 1: Renuka Vishwakarma" },
  { id: 5, name: "Vishal Patil", empCode: "LE036", policy: "New Leave Policy 2025", supervisor: "L 1: Renuka Vishwakarma" },
  { id: 6, name: "Chaitanya Arakkan", empCode: "LE048", policy: "New Leave Policy 2025", supervisor: "L 1: Rakesh Singh" },
  { id: 7, name: "Nikhil Mhatre", empCode: "LE050", policy: "New Leave Policy 2025", supervisor: "L 1: Rakesh Singh" },
  { id: 8, name: "Kaustubh Yadav", empCode: "LE055", policy: "New Leave Policy 2025", supervisor: "L 1: Rakesh Singh" },
  { id: 9, name: "Rutuja Maral", empCode: "LE065", policy: "New Leave Policy 2025", supervisor: "L 1: Rakesh Singh" },
  { id: 10, name: "Akshay Gopalan", empCode: "LE070", policy: "New Leave Policy 2025", supervisor: "L 1: Rakesh Singh" },
];

const LMS_TABS = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "categories", label: "Leave Categories", icon: Layers },
  { id: "templates", label: "Templates", icon: FileText },
];

export default function LeaveManagementSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(
    () => searchParams.get("tab") || "settings"
  );

  const activeTabRef = useRef(null);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // Automatically scroll selected tab into view on mobile/tablet
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab]);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Subpage 1: General Settings State
  const [settings, setSettings] = useState(INITIAL_GENERAL_SETTINGS);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState(INITIAL_GENERAL_SETTINGS);

  const handleStartEditSettings = () => {
    setDraftSettings({ ...settings });
    setIsEditingSettings(true);
  };

  const handleCancelEditSettings = () => {
    setDraftSettings({ ...settings });
    setIsEditingSettings(false);
  };

  const handleResetSettings = () => {
    setDraftSettings(INITIAL_GENERAL_SETTINGS);
    setSettings(INITIAL_GENERAL_SETTINGS);
    setIsEditingSettings(false);
    showToast("Leave management settings reset to defaults.");
  };

  const handleSaveSettings = () => {
    setSettings({ ...draftSettings });
    setIsEditingSettings(false);
    showToast("Leave management settings saved successfully.");
  };

  // Subpage 2: Categories State
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [addCategoryModal, setAddCategoryModal] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatType, setNewCatType] = useState("General Leave");
  const [newCatFreq, setNewCatFreq] = useState("Annually");

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;
    const cat = {
      id: Date.now(),
      label: newCatLabel.trim(),
      code: newCatLabel.trim().substring(0, 3).toUpperCase(),
      days: 12,
      type: newCatType,
      frequency: newCatFreq,
      status: "Active",
    };
    setCategories((prev) => [...prev, cat]);
    setNewCatLabel("");
    setAddCategoryModal(false);
    showToast(`Leave category "${cat.label}" created.`);
  };

  // Subpage 3: Templates State
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [addTemplateModal, setAddTemplateModal] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplCategories, setNewTplCategories] = useState(4);

  const handleAddTemplate = (e) => {
    e.preventDefault();
    if (!newTplName.trim()) return;
    const tpl = {
      id: Date.now(),
      name: newTplName.trim(),
      coveredCount: 0,
      categoryCount: Number(newTplCategories) || 4,
      status: "Active",
    };
    setTemplates((prev) => [...prev, tpl]);
    setNewTplName("");
    setAddTemplateModal(false);
    showToast(`Leave template "${tpl.name}" created.`);
  };

  // Subpage 4: Template Assignments State
  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedAssignIds, setSelectedAssignIds] = useState(new Set());
  const [assignPage, setAssignPage] = useState(1);
  const rowsPerPage = 6;

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      return (
        a.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
        a.empCode.toLowerCase().includes(assignSearch.toLowerCase()) ||
        a.supervisor.toLowerCase().includes(assignSearch.toLowerCase())
      );
    });
  }, [assignments, assignSearch]);

  const totalAssignPages = Math.ceil(filteredAssignments.length / rowsPerPage) || 1;
  const paginatedAssignments = useMemo(() => {
    const start = (assignPage - 1) * rowsPerPage;
    return filteredAssignments.slice(start, start + rowsPerPage);
  }, [filteredAssignments, assignPage]);

  const handleToggleSelectAll = () => {
    if (selectedAssignIds.size === paginatedAssignments.length && paginatedAssignments.length > 0) {
      setSelectedAssignIds(new Set());
    } else {
      setSelectedAssignIds(new Set(paginatedAssignments.map((a) => a.id)));
    }
  };

  const handleToggleSelectRow = (id) => {
    const next = new Set(selectedAssignIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssignIds(next);
  };

  // Mobile Help Center Accordion State
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  /* =========================================================
     RENDER CENTER PANEL CONTENT — SECTIONED DASHBOARD (OPTION B)
     ========================================================= */

  const renderCenterContent = () => {
    switch (activeTab) {
      /* ----------------------------------------------------
         1. GENERAL SETTINGS (OPTION B SECTIONED CARDS)
         ---------------------------------------------------- */
      case "settings":
        return (
          <div className="lms-tab-content lms-tab-settings">
            {/* Card 1: Leave Cycle Settings */}
            <div className="lms-card lms-cycle-card">
              <div className="lms-card-header">
                <div className="lms-card-title-wrap">
                  <div className="lms-icon-badge">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="lms-card-title">Leave Cycle Settings</h3>
                    <p className="lms-card-subtitle">
                      Manage leave cycle period, accruals and balance rules.
                    </p>
                  </div>
                </div>
                <div className="lms-card-actions">
                  {isEditingSettings ? (
                    <div className="lms-edit-btn-group">
                      <button
                        type="button"
                        className="lms-btn-action lms-btn-action-primary"
                        onClick={handleSaveSettings}
                      >
                        <Check size={14} /> Save
                      </button>
                      <button
                        type="button"
                        className="lms-btn-action lms-btn-action-secondary"
                        onClick={handleCancelEditSettings}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="lms-btn-action lms-btn-edit"
                      onClick={handleStartEditSettings}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="lms-card-body">
                <div className="lms-two-col-grid">
                  <div className="lms-field-wrap">
                    <label className="lms-field-label">
                      Cycle Start Month <span className="req-star">*</span>
                    </label>
                    <CustomSelect
                      prefixIcon={<Calendar size={15} color="#7c3aed" />}
                      options={MONTH_OPTIONS}
                      value={draftSettings.leaveCycleStartMonth}
                      disabled={!isEditingSettings}
                      onChange={(val) =>
                        setDraftSettings((p) => ({ ...p, leaveCycleStartMonth: val }))
                      }
                    />
                  </div>

                  <div className="lms-field-wrap">
                    <label className="lms-field-label">
                      Year <span className="req-star">*</span>
                    </label>
                    <CustomSelect
                      options={YEAR_OPTIONS}
                      value={draftSettings.leaveCycleYear || "2026"}
                      disabled={!isEditingSettings}
                      onChange={(val) =>
                        setDraftSettings((p) => ({ ...p, leaveCycleYear: val }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row: Admin Access & Supervisor Adjustments */}
            <div className="lms-two-cards-grid">
              {/* Admin Access Card */}
              <div className="lms-card lms-perm-card">
                <div className="lms-card-title-wrap">
                  <div className="lms-icon-badge">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h3 className="lms-card-title">Admin Access</h3>
                    <p className="lms-card-subtitle">
                      Allow admins to approve/reject leave applications?
                    </p>
                  </div>
                </div>
                <div className="lms-pill-toggle-group">
                  <button
                    type="button"
                    disabled={!isEditingSettings}
                    className={`lms-toggle-pill ${draftSettings.adminsManageAccessAllowed ? "is-selected" : ""}`}
                    onClick={() => setDraftSettings((p) => ({ ...p, adminsManageAccessAllowed: true }))}
                  >
                    {draftSettings.adminsManageAccessAllowed && <Check size={14} className="lms-toggle-check" />}
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isEditingSettings}
                    className={`lms-toggle-pill ${!draftSettings.adminsManageAccessAllowed ? "is-selected" : ""}`}
                    onClick={() => setDraftSettings((p) => ({ ...p, adminsManageAccessAllowed: false }))}
                  >
                    {!draftSettings.adminsManageAccessAllowed && <Check size={14} className="lms-toggle-check" />}
                    <span>No</span>
                  </button>
                </div>
              </div>

              {/* Supervisor Adjustments Card */}
              <div className="lms-card lms-perm-card">
                <div className="lms-card-title-wrap">
                  <div className="lms-icon-badge">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="lms-card-title">Supervisor Adjustments</h3>
                    <p className="lms-card-subtitle">
                      Can supervisors add leave adjustments for subordinates?
                    </p>
                  </div>
                </div>
                <div className="lms-pill-toggle-group">
                  <button
                    type="button"
                    disabled={!isEditingSettings}
                    className={`lms-toggle-pill ${draftSettings.supervisorsAddAdjustments ? "is-selected" : ""}`}
                    onClick={() => setDraftSettings((p) => ({ ...p, supervisorsAddAdjustments: true }))}
                  >
                    {draftSettings.supervisorsAddAdjustments && <Check size={14} className="lms-toggle-check" />}
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isEditingSettings}
                    className={`lms-toggle-pill ${!draftSettings.supervisorsAddAdjustments ? "is-selected" : ""}`}
                    onClick={() => setDraftSettings((p) => ({ ...p, supervisorsAddAdjustments: false }))}
                  >
                    {!draftSettings.supervisorsAddAdjustments && <Check size={14} className="lms-toggle-check" />}
                    <span>No</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 4: Daily Leave Accruals */}
            <div className="lms-card lms-perm-card">
              <div className="lms-card-title-wrap">
                <div className="lms-icon-badge">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="lms-card-title">Daily Leave Accruals</h3>
                  <p className="lms-card-subtitle">
                    Run daily leave accruals automatically?
                  </p>
                </div>
              </div>
              <div className="lms-pill-toggle-group">
                <button
                  type="button"
                  disabled={!isEditingSettings}
                  className={`lms-toggle-pill ${draftSettings.runDailyAccruals ? "is-selected" : ""}`}
                  onClick={() => setDraftSettings((p) => ({ ...p, runDailyAccruals: true }))}
                >
                  {draftSettings.runDailyAccruals && <Check size={14} className="lms-toggle-check" />}
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  disabled={!isEditingSettings}
                  className={`lms-toggle-pill ${!draftSettings.runDailyAccruals ? "is-selected" : ""}`}
                  onClick={() => setDraftSettings((p) => ({ ...p, runDailyAccruals: false }))}
                >
                  {!draftSettings.runDailyAccruals && <Check size={14} className="lms-toggle-check" />}
                  <span>No</span>
                </button>
              </div>
            </div>

            {/* Card 5: Initial Balance Date */}
            <div className="lms-card">
              <div className="lms-card-title-wrap">
                <div className="lms-icon-badge">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="lms-card-title">Initial Balance Date</h3>
                  <p className="lms-card-subtitle">
                    What date were initial balances set?
                  </p>
                </div>
              </div>
              <div className="lms-field-wrap" style={{ marginTop: "12px" }}>
                <CustomDatePicker
                  disabled={!isEditingSettings}
                  value={draftSettings.initialBalancesDate}
                  onChange={(val) =>
                    setDraftSettings((p) => ({ ...p, initialBalancesDate: val }))
                  }
                />
              </div>
            </div>

            {/* Additional Settings: Leave Encashment & Email Notifications */}
            <div className="lms-two-cards-grid">
              <div className="lms-card lms-perm-card">
                <div className="lms-card-title-wrap">
                  <div className="lms-icon-badge">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h3 className="lms-card-title">Leave Encashment</h3>
                    <p className="lms-card-subtitle">
                      Can employees apply for leave encashment?
                    </p>
                  </div>
                </div>
                <div className="lms-pill-toggle-group">
                  <button
                    type="button"
                    disabled={!isEditingSettings}
                    className={`lms-toggle-pill ${draftSettings.employeesApplyEncashment ? "is-selected" : ""}`}
                    onClick={() => setDraftSettings((p) => ({ ...p, employeesApplyEncashment: true }))}
                  >
                    {draftSettings.employeesApplyEncashment && <Check size={14} className="lms-toggle-check" />}
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isEditingSettings}
                    className={`lms-toggle-pill ${!draftSettings.employeesApplyEncashment ? "is-selected" : ""}`}
                    onClick={() => setDraftSettings((p) => ({ ...p, employeesApplyEncashment: false }))}
                  >
                    {!draftSettings.employeesApplyEncashment && <Check size={14} className="lms-toggle-check" />}
                    <span>No</span>
                  </button>
                </div>
              </div>

              <div className="lms-card lms-perm-card">
                <div className="lms-card-title-wrap">
                  <div className="lms-icon-badge">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="lms-card-title">Email Notifications</h3>
                    <p className="lms-card-subtitle">
                      Show Approve/Reject button in approver email?
                    </p>
                  </div>
                </div>
                <div className="lms-pill-toggle-group">
                  <button
                    type="button"
                    disabled={!isEditingSettings}
                    className={`lms-toggle-pill ${draftSettings.showEmailApproveReject ? "is-selected" : ""}`}
                    onClick={() => setDraftSettings((p) => ({ ...p, showEmailApproveReject: true }))}
                  >
                    {draftSettings.showEmailApproveReject && <Check size={14} className="lms-toggle-check" />}
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isEditingSettings}
                    className={`lms-toggle-pill ${!draftSettings.showEmailApproveReject ? "is-selected" : ""}`}
                    onClick={() => setDraftSettings((p) => ({ ...p, showEmailApproveReject: false }))}
                  >
                    {!draftSettings.showEmailApproveReject && <Check size={14} className="lms-toggle-check" />}
                    <span>No</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Select user that can view requests */}
            <div className="lms-card">
              <div className="lms-card-title-wrap">
                <div className="lms-icon-badge">
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="lms-card-title">View Requests Access</h3>
                  <p className="lms-card-subtitle">
                    Select user that can view leave requests
                  </p>
                </div>
              </div>
              <div className="lms-field-wrap" style={{ marginTop: "12px" }}>
                <CustomSelect
                  options={VIEW_USER_OPTIONS}
                  value={draftSettings.selectedViewUser}
                  disabled={!isEditingSettings}
                  onChange={(val) =>
                    setDraftSettings((p) => ({ ...p, selectedViewUser: val }))
                  }
                />
              </div>
            </div>

            {/* Option B Bottom Buttons */}
            <div className="lms-settings-footer-actions">
              <button
                type="button"
                className="lms-btn lms-btn-outline-lg"
                onClick={handleResetSettings}
              >
                Reset
              </button>
              <button
                type="button"
                className="lms-btn lms-btn-primary-lg"
                onClick={handleSaveSettings}
              >
                <CheckCircle2 size={16} /> Save Settings
              </button>
            </div>
          </div>
        );

      /* ----------------------------------------------------
         2. LEAVE CATEGORIES (OPTION B COMPACT LIST & CARDS)
         ---------------------------------------------------- */
      case "categories":
        return (
          <div className="lms-tab-content">
            <div className="lms-card lms-section-head-card">
              <div className="lms-card-title-wrap">
                <div className="lms-icon-badge">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="lms-card-title">Leave Categories</h3>
                  <p className="lms-card-subtitle">
                    Define leave types, limits and carry-forward rules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="lms-btn lms-btn-primary"
                onClick={() => setAddCategoryModal(true)}
              >
                <Plus size={15} /> Add Category
              </button>
            </div>

            {/* Table / List Container */}
            <div className="lms-categories-container">
              {/* Desktop Table View */}
              <div className="lms-desktop-table-wrap">
                <table className="lms-table">
                  <thead>
                    <tr>
                      <th>Leave Label</th>
                      <th>Leave Type</th>
                      <th>Frequency Of Accrual</th>
                      <th className="th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.label}</td>
                        <td>{c.type}</td>
                        <td>
                          <span className="lms-freq-pill">{c.frequency}</span>
                        </td>
                        <td className="td-actions">
                          <button
                            type="button"
                            className="lms-row-btn"
                            title="Edit Category"
                            onClick={() => showToast(`Edit category "${c.label}"`)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="lms-row-btn"
                            title="View Details"
                            onClick={() => showToast(`Viewing policies for "${c.label}"`)}
                          >
                            <FileText size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Option B Compact List */}
              <div className="lms-mobile-categories-list">
                <div className="lms-compact-list-header">
                  <span className="lms-col-type">LEAVE TYPE</span>
                  <span className="lms-col-code">CODE</span>
                  <span className="lms-col-days">DAYS</span>
                  <span className="lms-col-status">STATUS</span>
                  <span className="lms-col-action"></span>
                </div>
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="lms-compact-list-row"
                    onClick={() => showToast(`Category: ${c.label} (${c.type})`)}
                  >
                    <div className="lms-col-type">
                      <span className="lms-row-main-label">{c.label}</span>
                      <span className="lms-row-sub-type">{c.type}</span>
                    </div>
                    <div className="lms-col-code">
                      <span className="lms-code-badge">{c.code || c.label.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="lms-col-days">
                      <span className="lms-days-val">{c.days ?? (c.frequency === "Annually" ? 12 : 1)}</span>
                    </div>
                    <div className="lms-col-status">
                      <span className="lms-status-indicator">
                        <span className="lms-dot-green"></span> Active
                      </span>
                    </div>
                    <div className="lms-col-action">
                      <ChevronRight size={16} className="lms-row-chevron" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      /* ----------------------------------------------------
         3. TEMPLATES (OPTION B TEMPLATE CARDS)
         ---------------------------------------------------- */
      case "templates":
        return (
          <div className="lms-tab-content">
            <div className="lms-card lms-section-head-card">
              <div className="lms-card-title-wrap">
                <div className="lms-icon-badge">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="lms-card-title">Leave Templates</h3>
                  <p className="lms-card-subtitle">
                    Configure corporate leave policy templates for different departments and employee bands.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="lms-btn lms-btn-primary"
                onClick={() => setAddTemplateModal(true)}
              >
                <Plus size={15} /> Add Template
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="lms-desktop-table-wrap">
              <table className="lms-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Number Of Employees Covered</th>
                    <th>Number Of Leave Categories</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td className="lms-num-cell">
                        <span className="lms-count-badge">{t.coveredCount}</span>
                      </td>
                      <td className="lms-num-cell">
                        <span className="lms-count-badge is-secondary">{t.categoryCount}</span>
                      </td>
                      <td className="td-actions">
                        <button
                          type="button"
                          className="lms-row-btn"
                          title="Edit Template"
                          onClick={() => showToast(`Edit template "${t.name}"`)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="lms-row-btn"
                          title="View Details"
                          onClick={() => showToast(`Viewing template "${t.name}"`)}
                        >
                          <FileText size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Template Cards */}
            <div className="lms-mobile-template-cards">
              {templates.map((t) => (
                <div key={t.id} className="lms-template-card">
                  <div className="lms-tpl-card-top">
                    <div className="lms-tpl-name-wrap">
                      <span className="lms-tpl-name">{t.name}</span>
                      <span className="lms-status-indicator">
                        <span className="lms-dot-green"></span> Active
                      </span>
                    </div>
                    <div className="lms-tpl-actions">
                      <button
                        type="button"
                        className="lms-icon-action-btn"
                        title="Edit Template"
                        onClick={() => showToast(`Edit template "${t.name}"`)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="lms-icon-action-btn"
                        title="View Template Details"
                        onClick={() => showToast(`Viewing template "${t.name}"`)}
                      >
                        <FileText size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="lms-tpl-stats-row">
                    <div className="lms-tpl-stat-pill">
                      <Users size={14} className="lms-stat-icon" />
                      <span><strong>{t.coveredCount}</strong> Employees Covered</span>
                    </div>
                    <div className="lms-tpl-stat-pill">
                      <Layers size={14} className="lms-stat-icon" />
                      <span><strong>{t.categoryCount}</strong> Categories</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      /* ----------------------------------------------------
         4. TEMPLATE ASSIGNMENTS (OPTION B RESPONSIVE CARDS)
         ---------------------------------------------------- */
      case "assignments":
        return (
          <div className="lms-tab-content">
            <div className="lms-card lms-section-head-card">
              <div className="lms-card-title-wrap">
                <div className="lms-icon-badge">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="lms-card-title">Employee Template Assignment</h3>
                  <p className="lms-card-subtitle">
                    Map employees to customized leave policies and assign primary reporting supervisors.
                  </p>
                </div>
              </div>
            </div>

            {/* Search & Actions Toolbar */}
            <div className="lms-assignment-toolbar">
              <div className="lms-search-box">
                <Search size={15} className="lms-search-icon" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={assignSearch}
                  onChange={(e) => {
                    setAssignSearch(e.target.value);
                    setAssignPage(1);
                  }}
                />
                {assignSearch && (
                  <button
                    type="button"
                    className="lms-search-clear"
                    onClick={() => setAssignSearch("")}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="lms-toolbar-actions">
                <button
                  type="button"
                  className="lms-btn lms-btn-secondary"
                  onClick={() => {
                    if (selectedAssignIds.size === 0) {
                      showToast("Select at least one employee for bulk actions.", "warning");
                    } else {
                      showToast(`Bulk action initiated for ${selectedAssignIds.size} employees.`);
                    }
                  }}
                >
                  Actions <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Selection Summary Bar */}
            <div className="lms-select-summary-bar">
              <label className="lms-select-all-label">
                <input
                  type="checkbox"
                  checked={
                    selectedAssignIds.size === paginatedAssignments.length &&
                    paginatedAssignments.length > 0
                  }
                  onChange={handleToggleSelectAll}
                />
                <span>Select all ({selectedAssignIds.size}/{filteredAssignments.length})</span>
              </label>
            </div>

            {/* Desktop Table View */}
            <div className="lms-desktop-table-wrap">
              <table className="lms-table">
                <thead>
                  <tr>
                    <th style={{ width: "42px" }}>
                      <input
                        type="checkbox"
                        checked={
                          selectedAssignIds.size === paginatedAssignments.length &&
                          paginatedAssignments.length > 0
                        }
                        onChange={handleToggleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th>Employee Name</th>
                    <th>Current Leave Policy</th>
                    <th>Supervisors</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="lms-empty-state">
                        <Info size={24} />
                        <p>No matching employee template assignments found.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedAssignments.map((a) => (
                      <tr
                        key={a.id}
                        className={selectedAssignIds.has(a.id) ? "is-row-selected" : ""}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedAssignIds.has(a.id)}
                            onChange={() => handleToggleSelectRow(a.id)}
                            aria-label={`Select ${a.name}`}
                          />
                        </td>
                        <td>
                          <div className="lms-emp-cell">
                            <span className="lms-emp-name">
                              {a.name} - {a.empCode}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="lms-policy-badge">{a.policy}</span>
                        </td>
                        <td>
                          <span className="lms-supervisor-badge">{a.supervisor}</span>
                        </td>
                        <td className="td-actions">
                          <button
                            type="button"
                            className="lms-row-btn"
                            title="View / Modify Assignment"
                            onClick={() => showToast(`Edit policy for ${a.name}`)}
                          >
                            <FileText size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Assignment Cards */}
            <div className="lms-mobile-assignments-list">
              {paginatedAssignments.length === 0 ? (
                <div className="lms-empty-state">
                  <Info size={24} />
                  <p>No matching employee template assignments found.</p>
                </div>
              ) : (
                paginatedAssignments.map((a) => {
                  const isSelected = selectedAssignIds.has(a.id);
                  return (
                    <div
                      key={a.id}
                      className={`lms-assign-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => handleToggleSelectRow(a.id)}
                    >
                      <div className="lms-assign-card-top">
                        <div className="lms-assign-emp-info">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelectRow(a.id);
                            }}
                            className="lms-assign-checkbox"
                          />
                          <div>
                            <h4 className="lms-assign-emp-name">{a.name}</h4>
                            <span className="lms-assign-emp-code">ID: {a.empCode}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="lms-icon-action-btn"
                          title="View / Modify"
                          onClick={(e) => {
                            e.stopPropagation();
                            showToast(`Edit policy for ${a.name}`);
                          }}
                        >
                          <FileText size={15} />
                        </button>
                      </div>

                      <div className="lms-assign-details">
                        <div className="lms-assign-detail-item">
                          <span className="lms-detail-label">Policy</span>
                          <span className="lms-policy-badge">{a.policy}</span>
                        </div>
                        <div className="lms-assign-detail-item">
                          <span className="lms-detail-label">Supervisor</span>
                          <span className="lms-supervisor-badge">{a.supervisor}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div className="lms-pagination-bar">
              <span className="lms-pagination-info">
                Showing {filteredAssignments.length > 0 ? (assignPage - 1) * rowsPerPage + 1 : 0} to{" "}
                {Math.min(assignPage * rowsPerPage, filteredAssignments.length)} of{" "}
                {filteredAssignments.length} entries
              </span>
              <div className="lms-pagination-ctrls">
                <button
                  type="button"
                  className="lms-page-btn"
                  disabled={assignPage <= 1}
                  onClick={() => setAssignPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </button>
                {Array.from({ length: totalAssignPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    className={`lms-page-num ${pg === assignPage ? "is-active" : ""}`}
                    onClick={() => setAssignPage(pg)}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  className="lms-page-btn"
                  disabled={assignPage >= totalAssignPages}
                  onClick={() => setAssignPage((p) => Math.min(totalAssignPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="lms-page">
      {/* Toast Alert */}
      {toast && (
        <div className={`lms-toast lms-toast-${toast.type}`} role="alert">
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main 3-Column Structured Layout */}
      <div className="lms-layout-grid">
        {/* =========================================================
            LEFT COLUMN / MOBILE TOP TAB BAR: Section Navigation
            ========================================================= */}
        <aside className="lms-details-card">
          <div className="lms-details-header">
            <Settings size={18} className="lms-details-head-icon" />
            <h2>Details List</h2>
          </div>

          <nav className="lms-details-nav" aria-label="Leave Management Subpages">
            {LMS_TABS.map((t, idx) => {
              const IconComponent = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  ref={isActive ? activeTabRef : null}
                  type="button"
                  className={`lms-nav-item ${isActive ? "is-active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                  aria-selected={isActive}
                  role="tab"
                >
                  <div className="lms-nav-item-content">
                    <IconComponent size={16} className="lms-nav-icon" />
                    <span className="lms-nav-number">{idx + 1}.</span>
                    <span className="lms-nav-text">{t.label}</span>
                  </div>
                  <ChevronDown size={15} className="lms-nav-arrow" />
                </button>
              );
            })}
          </nav>
        </aside>

        {/* =========================================================
            CENTER COLUMN: Dynamic Subpage Content
            ========================================================= */}
        <main className="lms-main-content">{renderCenterContent()}</main>

        {/* =========================================================
            RIGHT COLUMN: Help Center (Collapsible on mobile)
            ========================================================= */}
        <aside className="lms-help-card">
          <div
            className="lms-help-header"
            onClick={() => setIsHelpOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-expanded={isHelpOpen}
          >
            <div className="lms-help-header-left">
              <BookOpen size={18} className="lms-help-head-icon" />
              <h2>Help Center</h2>
            </div>
            <ChevronDown
              size={16}
              className={`lms-help-toggle-arrow ${isHelpOpen ? "is-expanded" : ""}`}
            />
          </div>

          <div className={`lms-help-body ${isHelpOpen ? "is-open" : ""}`}>
            <h4 className="lms-help-subtitle">Leave Setting Guidelines:</h4>
            <ul className="lms-help-list">
              <li>
                <strong>Leaves consist of different categories</strong> like Privilege leave, casual leave, maternity leave, etc.
              </li>
              <li>
                <strong>Leave settings allows you to configure and assign leave policy</strong> for different category of leaves based on department, profile, locations, etc.
              </li>
              <li>
                Within the leave category you can <strong>set custom leave policies</strong> like accrual frequency period, leave encashment, recovery policies, sandwich leave, etc.
              </li>
              <li>
                Within the template settings you can <strong>set approval hierarchy and accrual policy</strong> for new joinees, etc.
              </li>
              <li>
                <strong>Leave module is integrated with the attendance module.</strong> Hence the leave data will be synced to attendance.
              </li>
              <li>
                <a
                  href="#detailed-info"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast("Opening detailed Leave Policy Documentation...");
                  }}
                >
                  Click Here
                </a>{" "}
                for detailed information.
              </li>
            </ul>

            <div className="lms-help-links">
              <span className="lms-links-title">Quick Resources</span>
              <a
                href="#policy-doc"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Downloaded Standard Leave Policy Guide.");
                }}
              >
                <Download size={14} /> Download Company Leave Policy
              </a>
              <a
                href="#accrual-rules"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Opened Accrual Rules Calculator.");
                }}
              >
                <ExternalLink size={14} /> View Annual Accrual Formulas
              </a>
            </div>
          </div>
        </aside>
      </div>

      {/* =========================================================
          MODALS
          ========================================================= */}

      {/* Add Category Modal */}
      {addCategoryModal && (
        <div className="lms-modal-backdrop" onClick={() => setAddCategoryModal(false)}>
          <div className="lms-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="lms-modal-header">
              <h3>Add Leave Category</h3>
              <button
                type="button"
                className="lms-modal-close"
                onClick={() => setAddCategoryModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="lms-modal-body">
                <div className="lms-form-group">
                  <label>
                    Leave Label <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bereavement Leave"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                  />
                </div>
                <div className="lms-form-row">
                  <div className="lms-form-group">
                    <label>Leave Type</label>
                    <CustomSelect
                      options={LEAVE_TYPE_OPTIONS}
                      value={newCatType}
                      onChange={(val) => setNewCatType(val)}
                    />
                  </div>
                  <div className="lms-form-group">
                    <label>Frequency Of Accrual</label>
                    <CustomSelect
                      options={FREQUENCY_OPTIONS}
                      value={newCatFreq}
                      onChange={(val) => setNewCatFreq(val)}
                    />
                  </div>
                </div>
              </div>
              <div className="lms-modal-footer">
                <button
                  type="button"
                  className="lms-btn lms-btn-secondary"
                  onClick={() => setAddCategoryModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="lms-btn lms-btn-primary">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Template Modal */}
      {addTemplateModal && (
        <div className="lms-modal-backdrop" onClick={() => setAddTemplateModal(false)}>
          <div className="lms-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="lms-modal-header">
              <h3>Create Leave Template</h3>
              <button
                type="button"
                className="lms-modal-close"
                onClick={() => setAddTemplateModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddTemplate}>
              <div className="lms-modal-body">
                <div className="lms-form-group">
                  <label>
                    Template Policy Name <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Remote Staff Leave Policy 2026"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                  />
                </div>
                <div className="lms-form-group">
                  <label>Number of Categories Included</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={newTplCategories}
                    onChange={(e) => setNewTplCategories(e.target.value)}
                  />
                </div>
              </div>
              <div className="lms-modal-footer">
                <button
                  type="button"
                  className="lms-btn lms-btn-secondary"
                  onClick={() => setAddTemplateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="lms-btn lms-btn-primary">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
