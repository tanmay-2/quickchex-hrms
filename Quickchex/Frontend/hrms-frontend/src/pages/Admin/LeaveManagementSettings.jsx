import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { CustomSelect, CustomDatePicker } from "../../components/ui";
import "./LeaveManagementSettings.css";

/* =========================================================
   INITIAL DATA MATCHING REFERENCE SCREENSHOTS 2, 3, 4, 5
   ========================================================= */

const INITIAL_GENERAL_SETTINGS = {
  leaveCycleStartMonth: "April",
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
  { id: 1, label: "Earned / Sick Leave", type: "General Leave", frequency: "Annually", status: "Active" },
  { id: 2, label: "Casual Leave", type: "General Leave", frequency: "Annually", status: "Active" },
  { id: 3, label: "Leave Without Pay", type: "General Leave", frequency: "Monthly", status: "Active" },
  { id: 4, label: "Comp off", type: "General Leave", frequency: "Monthly", status: "Active" },
  { id: 5, label: "HALF DAY", type: "General Leave", frequency: "Monthly", status: "Active" },
  { id: 6, label: "Leave Without Pay.", type: "Annual Non-Accrual Leave", frequency: "Not Applicable", status: "Active" },
  { id: 7, label: "Compassionate Leave", type: "Annual Non-Accrual Leave", frequency: "Not Applicable", status: "Active" },
  { id: 8, label: "Maternity Leave", type: "Annual Non-Accrual Leave", frequency: "Not Applicable", status: "Active" },
  { id: 9, label: "Paternity Leave", type: "Annual Non-Accrual Leave", frequency: "Not Applicable", status: "Active" },
  { id: 10, label: "Comp Off.", type: "Comp Off", frequency: "Not Applicable", status: "Active" },
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

export default function LeaveManagementSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(
    () => searchParams.get("tab") || "settings"
  );

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  };

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

  /* =========================================================
     RENDER CENTER PANEL CONTENT
     ========================================================= */

  const renderCenterContent = () => {
    switch (activeTab) {
      /* ----------------------------------------------------
         1. GENERAL SETTINGS
         ---------------------------------------------------- */
      case "settings":
        return (
          <div className="lms-tab-content">
            <div className="lms-content-header">
              <div>
                <h2 className="lms-content-title">Leave Settings</h2>
                <p className="lms-content-subtitle">
                  Configure cycle months, approvals, supervisor permissions, and daily accrual schedules.
                </p>
              </div>
              <div className="lms-header-actions">
                {isEditingSettings ? (
                  <>
                    <button
                      type="button"
                      className="lms-btn lms-btn-primary"
                      onClick={handleSaveSettings}
                    >
                      <Check size={16} /> Save Changes
                    </button>
                    <button
                      type="button"
                      className="lms-btn lms-btn-secondary"
                      onClick={() => setIsEditingSettings(false)}
                    >
                      <X size={16} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="lms-btn lms-btn-primary"
                      onClick={handleStartEditSettings}
                    >
                      <Pencil size={15} /> Edit
                    </button>
                    <button
                      type="button"
                      className="lms-btn-icon"
                      title="View Policy Summary"
                      onClick={() => showToast("Leave settings policy log active.")}
                    >
                      <FileText size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="lms-settings-form">
              {/* Question 1 */}
              <div className="lms-form-row">
                <label className="lms-question-label">
                  What month of the year does your leave cycle start from? <span className="req-star">*</span>
                </label>
                <div className="lms-input-col">
                  <CustomSelect
                    options={MONTH_OPTIONS}
                    value={draftSettings.leaveCycleStartMonth}
                    disabled={!isEditingSettings}
                    onChange={(val) =>
                      setDraftSettings((p) => ({ ...p, leaveCycleStartMonth: val }))
                    }
                  />
                </div>
              </div>

              {/* Question 2 */}
              <div className="lms-form-row">
                <label className="lms-question-label">
                  Are Admins Having Manage Access to Leave Module Allowed To Approve/Reject Leave Applications? <span className="req-star">*</span>
                </label>
                <div className="lms-radio-group">
                  <label className={`lms-radio-pill ${draftSettings.adminsManageAccessAllowed ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="adminsManageAccessAllowed"
                      checked={draftSettings.adminsManageAccessAllowed}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, adminsManageAccessAllowed: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`lms-radio-pill ${!draftSettings.adminsManageAccessAllowed ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="adminsManageAccessAllowed"
                      checked={!draftSettings.adminsManageAccessAllowed}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, adminsManageAccessAllowed: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Question 3 */}
              <div className="lms-form-row">
                <label className="lms-question-label">
                  Can Supervisors add Leave Adjustments for subordinates? <span className="req-star">*</span>
                </label>
                <div className="lms-radio-group">
                  <label className={`lms-radio-pill ${draftSettings.supervisorsAddAdjustments ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="supervisorsAddAdjustments"
                      checked={draftSettings.supervisorsAddAdjustments}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, supervisorsAddAdjustments: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`lms-radio-pill ${!draftSettings.supervisorsAddAdjustments ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="supervisorsAddAdjustments"
                      checked={!draftSettings.supervisorsAddAdjustments}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, supervisorsAddAdjustments: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Question 4 */}
              <div className="lms-form-row">
                <label className="lms-question-label">
                  Would you like to run daily leave accruals? <span className="req-star">*</span>
                </label>
                <div className="lms-radio-group">
                  <label className={`lms-radio-pill ${draftSettings.runDailyAccruals ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="runDailyAccruals"
                      checked={draftSettings.runDailyAccruals}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, runDailyAccruals: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`lms-radio-pill ${!draftSettings.runDailyAccruals ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="runDailyAccruals"
                      checked={!draftSettings.runDailyAccruals}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, runDailyAccruals: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Question 5 */}
              <div className="lms-form-row">
                <label className="lms-question-label">
                  Can employees apply for leave encashment? <span className="req-star">*</span>
                </label>
                <div className="lms-radio-group">
                  <label className={`lms-radio-pill ${draftSettings.employeesApplyEncashment ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="employeesApplyEncashment"
                      checked={draftSettings.employeesApplyEncashment}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, employeesApplyEncashment: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`lms-radio-pill ${!draftSettings.employeesApplyEncashment ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="employeesApplyEncashment"
                      checked={!draftSettings.employeesApplyEncashment}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, employeesApplyEncashment: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Question 6 */}
              <div className="lms-form-row">
                <label className="lms-question-label">
                  What date were initial balances set? <span className="req-star">*</span>
                </label>
                <div className="lms-input-col">
                  <CustomDatePicker
                    disabled={!isEditingSettings}
                    value={draftSettings.initialBalancesDate}
                    onChange={(val) =>
                      setDraftSettings((p) => ({ ...p, initialBalancesDate: val }))
                    }
                  />
                </div>
              </div>

              {/* Question 7 */}
              <div className="lms-form-row">
                <label className="lms-question-label">
                  Would you like to show Approve/Reject button in the email notification for the approver? <span className="req-star">*</span>
                </label>
                <div className="lms-radio-group">
                  <label className={`lms-radio-pill ${draftSettings.showEmailApproveReject ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="showEmailApproveReject"
                      checked={draftSettings.showEmailApproveReject}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, showEmailApproveReject: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`lms-radio-pill ${!draftSettings.showEmailApproveReject ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="showEmailApproveReject"
                      checked={!draftSettings.showEmailApproveReject}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, showEmailApproveReject: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Question 8 */}
              <div className="lms-form-row">
                <label className="lms-question-label">Select user that can view requests?</label>
                <div className="lms-input-col">
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
            </div>
          </div>
        );

      /* ----------------------------------------------------
         2. LEAVE CATEGORIES
         ---------------------------------------------------- */
      case "categories":
        return (
          <div className="lms-tab-content">
            <div className="lms-content-header">
              <div>
                <h2 className="lms-content-title">Leave Categories</h2>
                <p className="lms-content-subtitle">
                  Define types of leaves, accrual frequencies, and category deduction parameters.
                </p>
              </div>
              <div className="lms-header-actions">
                <button
                  type="button"
                  className="lms-btn lms-btn-primary"
                  onClick={() => setAddCategoryModal(true)}
                >
                  <Plus size={16} /> Add Category
                </button>
              </div>
            </div>

            <div className="lms-table-card">
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
                          title="View Category Details"
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
          </div>
        );

      /* ----------------------------------------------------
         3. TEMPLATES
         ---------------------------------------------------- */
      case "templates":
        return (
          <div className="lms-tab-content">
            <div className="lms-content-header">
              <div>
                <h2 className="lms-content-title">Leave Templates</h2>
                <p className="lms-content-subtitle">
                  Configure corporate leave policy templates for different departments and employee bands.
                </p>
              </div>
              <div className="lms-header-actions">
                <button
                  type="button"
                  className="lms-btn lms-btn-primary"
                  onClick={() => setAddTemplateModal(true)}
                >
                  <Plus size={16} /> Add Template
                </button>
              </div>
            </div>

            <div className="lms-table-card">
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
          </div>
        );

      /* ----------------------------------------------------
         4. TEMPLATE ASSIGNMENTS
         ---------------------------------------------------- */
      case "assignments":
        return (
          <div className="lms-tab-content">
            <div className="lms-content-header">
              <div>
                <h2 className="lms-content-title">Employee Template Assignment</h2>
                <p className="lms-content-subtitle">
                  Map employees to customized leave policies and assign primary reporting supervisors.
                </p>
              </div>
              <div className="lms-header-actions">
                <div className="lms-search-box">
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
                <button
                  type="button"
                  className="lms-btn lms-btn-secondary"
                  onClick={() => showToast("Bulk reassigning selected employees.")}
                >
                  Actions <ChevronDown size={14} />
                </button>
              </div>
            </div>

            <div className="lms-table-card">
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
                  ← Previous
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
            LEFT COLUMN: Details List
            ========================================================= */}
        <aside className="lms-details-card">
          <div className="lms-details-header">
            <Settings size={18} className="lms-details-head-icon" />
            <h2>Details List</h2>
          </div>

          <nav className="lms-details-nav" aria-label="Leave Management Subpages">
            <button
              type="button"
              className={`lms-nav-item ${activeTab === "settings" ? "is-active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <div className="lms-nav-item-content">
                <span className="lms-nav-number">1.</span>
                <span className="lms-nav-text">General Settings</span>
              </div>
              <ChevronDown size={15} className="lms-nav-arrow" />
            </button>

            <button
              type="button"
              className={`lms-nav-item ${activeTab === "categories" ? "is-active" : ""}`}
              onClick={() => setActiveTab("categories")}
            >
              <div className="lms-nav-item-content">
                <span className="lms-nav-number">2.</span>
                <span className="lms-nav-text">Leave Categories</span>
              </div>
              <ChevronDown size={15} className="lms-nav-arrow" />
            </button>

            <button
              type="button"
              className={`lms-nav-item ${activeTab === "templates" ? "is-active" : ""}`}
              onClick={() => setActiveTab("templates")}
            >
              <div className="lms-nav-item-content">
                <span className="lms-nav-number">3.</span>
                <span className="lms-nav-text">Templates</span>
              </div>
              <ChevronDown size={15} className="lms-nav-arrow" />
            </button>

            <button
              type="button"
              className={`lms-nav-item ${activeTab === "assignments" ? "is-active" : ""}`}
              onClick={() => setActiveTab("assignments")}
            >
              <div className="lms-nav-item-content">
                <span className="lms-nav-number">4.</span>
                <span className="lms-nav-text">Template Assignments</span>
              </div>
              <ChevronDown size={15} className="lms-nav-arrow" />
            </button>
          </nav>
        </aside>

        {/* =========================================================
            CENTER COLUMN: Dynamic Subpage Content
            ========================================================= */}
        <main className="lms-main-content">{renderCenterContent()}</main>

        {/* =========================================================
            RIGHT COLUMN: Help Center (matching reference screenshots)
            ========================================================= */}
        <aside className="lms-help-card">
          <div className="lms-help-header">
            <BookOpen size={18} className="lms-help-head-icon" />
            <h2>Help Center</h2>
          </div>

          <div className="lms-help-body">
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
