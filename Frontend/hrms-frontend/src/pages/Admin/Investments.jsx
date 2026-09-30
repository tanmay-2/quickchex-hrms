import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Settings,
  Pencil,
  Check,
  X,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Eye,
  Trash2,
  Download,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Users,
  Briefcase,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Info,
} from "lucide-react";
import "./Investments.css";

/* =========================================================
   MOCK DATA & CONSTANTS
   ========================================================= */

const INITIAL_GENERAL_SETTINGS = {
  regimeSelectionAllowed: true,
  revisedSubmissionAfterCutoff: false,
  proofMandatoryFor80C: true,
  approverEmailButtons: true,
  autoStandardDeduction: true,
  employeeViewAuditTrail: true,
  selectedTaxApprover: "Finance & Taxation Lead (Renuka V)",
  financialYear: "FY 2025 - 2026 (Assessment Year 2026-27)",
  provisionalWindowOpen: true,
  proofWindowOpen: true,
  provisionalCutoff: "2025-11-30",
  proofCutoff: "2026-02-15",
};

const APPROVER_OPTIONS = [
  "Finance & Taxation Lead (Renuka V)",
  "Payroll Operations (Kevin Fernandes)",
  "HR Compliance Team",
  "Senior Payroll Executive (Rakesh Singh)",
  "External Chartered Accountant (Audit Firm)",
];

const INITIAL_TEMPLATES = [
  {
    id: 1,
    name: "Comprehensive Old Regime Policy",
    description: "Full deductions eligible under Section 80C, 80D, Section 24, and HRA Section 10(13A).",
    coveredCount: 56,
    regime: "Old Tax Regime",
    proofMandatory: true,
    status: "Active",
    allowedSections: ["80C", "80D", "80CCD(1B)", "24(b)", "10(13A)", "80E", "80G"],
  },
  {
    id: 2,
    name: "Simplified New Tax Regime (Section 115BAC)",
    description: "Default concessional tax regime with standard deduction of ₹75,000 and employer NPS 80CCD(2).",
    coveredCount: 17,
    regime: "New Tax Regime (Default)",
    proofMandatory: false,
    status: "Active",
    allowedSections: ["Standard Deduction (₹75k)", "80CCD(2)"],
  },
  {
    id: 3,
    name: "Senior Citizen & HRA Specialized Policy",
    description: "Enhanced medical insurance limits under 80D (₹50,000) and metropolitan rent rebate structures.",
    coveredCount: 24,
    regime: "Old Tax Regime",
    proofMandatory: true,
    status: "Active",
    allowedSections: ["80C", "80D (Senior)", "10(13A)", "80TTB"],
  },
  {
    id: 4,
    name: "Executive NPS & Superannuation Elite",
    description: "Tailored for senior leadership with corporate NPS voluntary contributions and Section 80G deductions.",
    coveredCount: 38,
    regime: "Dual Regime Supported",
    proofMandatory: true,
    status: "Active",
    allowedSections: ["80C", "80D", "80CCD(1B)", "80CCD(2)", "24(b)", "80G"],
  },
  {
    id: 5,
    name: "Contractual & Minimal Deductions",
    description: "Simplified withholding policy for fixed-term consultants and technical interns.",
    coveredCount: 12,
    regime: "New Tax Regime",
    proofMandatory: false,
    status: "Inactive",
    allowedSections: ["Standard Deduction"],
  },
];

const INITIAL_ASSIGNMENTS = [
  {
    id: 101,
    name: "Kevin Fernandes",
    empCode: "LE101",
    department: "Development",
    template: "Comprehensive Old Regime Policy",
    panNumber: "ABCDE1234F",
    regime: "Old Regime",
    approvers: "Level 1: Finance Lead • Level 2: HR Head",
    status: "Assigned",
  },
  {
    id: 102,
    name: "Umesh Patel",
    empCode: "LE102",
    department: "Design & UX",
    template: "Simplified New Tax Regime (Section 115BAC)",
    panNumber: "BNMPK5678Q",
    regime: "New Regime",
    approvers: "Level 1: Finance Lead • Level 2: HR Head",
    status: "Assigned",
  },
  {
    id: 103,
    name: "Migdad Mirza",
    empCode: "LE103",
    department: "Management",
    template: "Executive NPS & Superannuation Elite",
    panNumber: "CKLPD9012Z",
    regime: "Old Regime",
    approvers: "Level 1: CFO Office • Level 2: Internal Audit",
    status: "Assigned",
  },
  {
    id: 104,
    name: "Rahul Sharma",
    empCode: "LE104",
    department: "HR Operations",
    template: "Comprehensive Old Regime Policy",
    panNumber: "DFGTY3456R",
    regime: "Old Regime",
    approvers: "Level 1: Finance Lead • Level 2: HR Head",
    status: "Assigned",
  },
  {
    id: 105,
    name: "Renuka Vishwakarma",
    empCode: "LE024",
    department: "Payroll & Finance",
    template: "Senior Citizen & HRA Specialized Policy",
    panNumber: "EWQAS7890M",
    regime: "Old Regime",
    approvers: "Level 1: Finance Lead • Level 2: HR Head",
    status: "Assigned",
  },
  {
    id: 106,
    name: "Rakesh Singh",
    empCode: "LE002",
    department: "Operations",
    template: "Comprehensive Old Regime Policy",
    panNumber: "GHJKL4567P",
    regime: "Old Regime",
    approvers: "Level 1: Finance Lead • Level 2: HR Head",
    status: "Assigned",
  },
  {
    id: 107,
    name: "Chaitanya Arakkan",
    empCode: "LE048",
    department: "Engineering",
    template: "Simplified New Tax Regime (Section 115BAC)",
    panNumber: "JHYTR8901L",
    regime: "New Regime",
    approvers: "Level 1: Finance Lead • Level 2: HR Head",
    status: "Assigned",
  },
  {
    id: 108,
    name: "Suraj Gupta",
    empCode: "LE085",
    department: "Support",
    template: "Comprehensive Old Regime Policy",
    panNumber: "MNBVC2345K",
    regime: "Old Regime",
    approvers: "Level 1: Finance Lead • Level 2: HR Head",
    status: "Assigned",
  },
  {
    id: 109,
    name: "Sakshi Patil",
    empCode: "LE106",
    department: "Marketing",
    template: "Senior Citizen & HRA Specialized Policy",
    panNumber: "PLOIK6789W",
    regime: "Old Regime",
    approvers: "Level 1: Finance Lead • Level 2: HR Head",
    status: "Assigned",
  },
  {
    id: 110,
    name: "Akash Maurya",
    empCode: "LE120",
    department: "Sales",
    template: "Comprehensive Old Regime Policy",
    panNumber: "QWERT1290S",
    regime: "Old Regime",
    approvers: "Level 1: Finance Lead • Level 2: HR Head",
    status: "Assigned",
  },
];

const INITIAL_SECTIONS = [
  {
    id: 1,
    code: "Section 80C",
    name: "Public Provident Fund, EPF, ELSS & LIC",
    maxLimit: "₹1,50,000",
    regime: "Old Regime",
    effectiveFrom: "01-04-2023",
    updatedAt: "31-03-2026",
    status: "Active",
  },
  {
    id: 2,
    code: "Section 80D (Self & Family)",
    name: "Health & Medical Insurance Premium",
    maxLimit: "₹25,000",
    regime: "Old Regime",
    effectiveFrom: "01-04-2023",
    updatedAt: "31-03-2026",
    status: "Active",
  },
  {
    id: 3,
    code: "Section 80D (Senior Parents)",
    name: "Health Insurance for Parents (Age 60+)",
    maxLimit: "₹50,000",
    regime: "Old Regime",
    effectiveFrom: "01-04-2023",
    updatedAt: "31-03-2026",
    status: "Active",
  },
  {
    id: 4,
    code: "Section 80CCD(1B)",
    name: "National Pension System (NPS Tier 1 Voluntary)",
    maxLimit: "₹50,000",
    regime: "Both Regimes",
    effectiveFrom: "01-04-2023",
    updatedAt: "31-03-2026",
    status: "Active",
  },
  {
    id: 5,
    code: "Section 24(b)",
    name: "Interest on Housing Loan for Self-Occupied Property",
    maxLimit: "₹2,00,000",
    regime: "Old Regime",
    effectiveFrom: "01-04-2023",
    updatedAt: "31-03-2026",
    status: "Active",
  },
  {
    id: 6,
    code: "Section 10(13A)",
    name: "House Rent Allowance (HRA Rent Exemption)",
    maxLimit: "Actual / Calculated",
    regime: "Old Regime",
    effectiveFrom: "01-04-2023",
    updatedAt: "31-03-2026",
    status: "Active",
  },
  {
    id: 7,
    code: "Section 80E",
    name: "Interest Paid on Higher Education Loan",
    maxLimit: "No Upper Limit",
    regime: "Old Regime",
    effectiveFrom: "01-04-2023",
    updatedAt: "31-03-2026",
    status: "Active",
  },
  {
    id: 8,
    code: "Section 80G",
    name: "Donations to Specified Funds and Charitable Trusts",
    maxLimit: "50% / 100% of Donation",
    regime: "Old Regime",
    effectiveFrom: "01-04-2023",
    updatedAt: "31-03-2026",
    status: "Active",
  },
  {
    id: 9,
    code: "Section 80TTA / 80TTB",
    name: "Interest on Savings Account Deposits",
    maxLimit: "₹10,000 / ₹50,000",
    regime: "Old Regime",
    effectiveFrom: "01-04-2023",
    updatedAt: "31-03-2026",
    status: "Active",
  },
];

const INITIAL_SUBMISSIONS = [
  {
    id: 201,
    employeeName: "Kevin Fernandes",
    empCode: "LE101",
    department: "Development",
    declaredAmount: "₹1,85,000",
    verifiedAmount: "₹1,50,000",
    regime: "Old Regime",
    submissionDate: "14-Jan-2026",
    proofCount: 4,
    status: "Approved",
    items: [
      { section: "80C - PPF", declared: 70000, verified: 70000, doc: "PPF_Receipt_2025.pdf", status: "Verified" },
      { section: "80C - ELSS Mutual Fund", declared: 80000, verified: 80000, doc: "ELSS_Statement_Jan26.pdf", status: "Verified" },
      { section: "80D - Health Insurance", declared: 25000, verified: 25000, doc: "HDFC_Ergo_Premium.pdf", status: "Verified" },
      { section: "80CCD(1B) - NPS", declared: 10000, verified: 10000, doc: "NPS_PRAN_Statement.pdf", status: "Verified" },
    ],
  },
  {
    id: 202,
    employeeName: "Renuka Vishwakarma",
    empCode: "LE024",
    department: "Payroll & Finance",
    declaredAmount: "₹2,60,000",
    verifiedAmount: "₹2,25,000",
    regime: "Old Regime",
    submissionDate: "18-Jan-2026",
    proofCount: 5,
    status: "Pending Verification",
    items: [
      { section: "80C - Life Insurance LIC", declared: 150000, verified: 150000, doc: "LIC_Policy_Receipt.pdf", status: "Verified" },
      { section: "80D - Parents Insurance", declared: 45000, verified: 45000, doc: "Star_Health_Senior.pdf", status: "Verified" },
      { section: "24(b) - Home Loan Interest", declared: 65000, verified: 30000, doc: "SBI_Interest_Certificate.pdf", status: "Under Review" },
    ],
  },
  {
    id: 203,
    employeeName: "Rakesh Singh",
    empCode: "LE002",
    department: "Operations",
    declaredAmount: "₹1,50,000",
    verifiedAmount: "₹0",
    regime: "Old Regime",
    submissionDate: "20-Jan-2026",
    proofCount: 2,
    status: "Proofs Required",
    items: [
      { section: "80C - Tuition Fees", declared: 90000, verified: 0, doc: "Tuition_Challan_Pending.pdf", status: "Pending Proof" },
      { section: "80D - Mediclaim", declared: 60000, verified: 0, doc: "Insurance_Bill_Pending.pdf", status: "Pending Proof" },
    ],
  },
  {
    id: 204,
    employeeName: "Sakshi Patil",
    empCode: "LE106",
    department: "Marketing",
    declaredAmount: "₹1,40,000",
    verifiedAmount: "₹1,40,000",
    regime: "Old Regime",
    submissionDate: "22-Jan-2026",
    proofCount: 3,
    status: "Approved",
    items: [
      { section: "80C - Sukanya Samriddhi", declared: 100000, verified: 100000, doc: "SSY_Passbook_Copy.pdf", status: "Verified" },
      { section: "80D - Self Mediclaim", declared: 25000, verified: 25000, doc: "MaxBupa_Policy.pdf", status: "Verified" },
      { section: "80CCD(1B) - NPS", declared: 15000, verified: 15000, doc: "NPS_Deposit_Slip.pdf", status: "Verified" },
    ],
  },
  {
    id: 205,
    employeeName: "Migdad Mirza",
    empCode: "LE103",
    department: "Management",
    declaredAmount: "₹3,10,000",
    verifiedAmount: "₹2,50,000",
    regime: "Old Regime",
    submissionDate: "25-Jan-2026",
    proofCount: 6,
    status: "Pending Verification",
    items: [
      { section: "80C - EPF Voluntary", declared: 150000, verified: 150000, doc: "VPF_Statement.pdf", status: "Verified" },
      { section: "24(b) - Home Loan Interest", declared: 110000, verified: 50000, doc: "HDFC_Home_Loan_Cert.pdf", status: "Under Review" },
      { section: "80CCD(1B) - NPS Tier 1", declared: 50000, verified: 50000, doc: "NPS_Contribution_Receipt.pdf", status: "Verified" },
    ],
  },
  {
    id: 206,
    employeeName: "Akash Maurya",
    empCode: "LE120",
    department: "Sales",
    declaredAmount: "₹75,000",
    verifiedAmount: "₹0",
    regime: "Old Regime",
    submissionDate: "28-Jan-2026",
    proofCount: 1,
    status: "Rejected",
    items: [
      { section: "80G - Donation", declared: 75000, verified: 0, doc: "Unverified_Donation_Slip.pdf", status: "Rejected" },
    ],
  },
];

/* =========================================================
   MAIN INVESTMENTS COMPONENT
   ========================================================= */

export default function Investments() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation state (synced with ?tab=...)
  const activeTab = searchParams.get("tab") || "settings";
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
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
    showToast("Investment & tax declaration settings saved successfully.");
  };

  const handleCancelSettings = () => {
    setIsEditingSettings(false);
  };

  // Subpage 2: Templates State
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    regime: "Old Tax Regime",
    proofMandatory: true,
    status: "Active",
  });

  const handleCreateTemplate = (e) => {
    e.preventDefault();
    if (!newTemplate.name.trim()) return;
    const created = {
      id: Date.now(),
      name: newTemplate.name.trim(),
      description: newTemplate.description || "Custom investment policy template.",
      coveredCount: 0,
      regime: newTemplate.regime,
      proofMandatory: newTemplate.proofMandatory,
      status: newTemplate.status,
      allowedSections: ["80C", "80D", "24(b)"],
    };
    setTemplates((prev) => [created, ...prev]);
    setTemplateModalOpen(false);
    setNewTemplate({
      name: "",
      description: "",
      regime: "Old Tax Regime",
      proofMandatory: true,
      status: "Active",
    });
    showToast(`Template "${created.name}" created successfully.`);
  };

  // Subpage 3: Assignments State
  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignFilterRegime, setAssignFilterRegime] = useState("all");
  const [selectedAssignIds, setSelectedAssignIds] = useState(new Set());
  const [assignPage, setAssignPage] = useState(1);
  const assignRowsPerPage = 6;

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
        a.empCode.toLowerCase().includes(assignSearch.toLowerCase()) ||
        a.panNumber.toLowerCase().includes(assignSearch.toLowerCase());
      const matchRegime =
        assignFilterRegime === "all" ||
        (assignFilterRegime === "old" && a.regime.includes("Old")) ||
        (assignFilterRegime === "new" && a.regime.includes("New"));
      return matchSearch && matchRegime;
    });
  }, [assignments, assignSearch, assignFilterRegime]);

  const totalAssignPages = Math.ceil(filteredAssignments.length / assignRowsPerPage) || 1;
  const paginatedAssignments = useMemo(() => {
    const start = (assignPage - 1) * assignRowsPerPage;
    return filteredAssignments.slice(start, start + assignRowsPerPage);
  }, [filteredAssignments, assignPage]);

  const handleToggleSelectAllAssign = () => {
    if (selectedAssignIds.size === paginatedAssignments.length && paginatedAssignments.length > 0) {
      setSelectedAssignIds(new Set());
    } else {
      setSelectedAssignIds(new Set(paginatedAssignments.map((a) => a.id)));
    }
  };

  const handleToggleSelectAssignRow = (id) => {
    const next = new Set(selectedAssignIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssignIds(next);
  };

  // Subpage 4: Sections State
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [sectionSearch, setSectionSearch] = useState("");
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [newSection, setNewSection] = useState({
    code: "",
    name: "",
    maxLimit: "₹50,000",
    regime: "Old Regime",
  });

  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      return (
        s.code.toLowerCase().includes(sectionSearch.toLowerCase()) ||
        s.name.toLowerCase().includes(sectionSearch.toLowerCase())
      );
    });
  }, [sections, sectionSearch]);

  const handleCreateSection = (e) => {
    e.preventDefault();
    if (!newSection.code.trim() || !newSection.name.trim()) return;
    const created = {
      id: Date.now(),
      code: newSection.code.trim(),
      name: newSection.name.trim(),
      maxLimit: newSection.maxLimit,
      regime: newSection.regime,
      effectiveFrom: "01-04-2025",
      updatedAt: "16-09-2026",
      status: "Active",
    };
    setSections((prev) => [created, ...prev]);
    setSectionModalOpen(false);
    setNewSection({ code: "", name: "", maxLimit: "₹50,000", regime: "Old Regime" });
    showToast(`Exemption section "${created.code}" added.`);
  };

  // Subpage 5: Submissions State
  const [submissions, setSubmissions] = useState(INITIAL_SUBMISSIONS);
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState("all");
  const [selectedSubIds, setSelectedSubIds] = useState(new Set());
  const [reviewModalData, setReviewModalData] = useState(null);
  const [subPage, setSubPage] = useState(1);
  const subRowsPerPage = 5;

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchSearch =
        s.employeeName.toLowerCase().includes(subSearch.toLowerCase()) ||
        s.empCode.toLowerCase().includes(subSearch.toLowerCase()) ||
        s.department.toLowerCase().includes(subSearch.toLowerCase());
      const matchStatus = subStatusFilter === "all" || s.status === subStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [submissions, subSearch, subStatusFilter]);

  const totalSubPages = Math.ceil(filteredSubmissions.length / subRowsPerPage) || 1;
  const paginatedSubmissions = useMemo(() => {
    const start = (subPage - 1) * subRowsPerPage;
    return filteredSubmissions.slice(start, start + subRowsPerPage);
  }, [filteredSubmissions, subPage]);

  const handleApproveSubmission = (subId) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: "Approved", verifiedAmount: s.declaredAmount } : s))
    );
    if (reviewModalData?.id === subId) {
      setReviewModalData((prev) => ({ ...prev, status: "Approved", verifiedAmount: prev.declaredAmount }));
    }
    showToast("Declaration proofs verified and approved!");
  };

  const handleRejectSubmission = (subId) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: "Rejected", verifiedAmount: "₹0" } : s))
    );
    if (reviewModalData?.id === subId) {
      setReviewModalData((prev) => ({ ...prev, status: "Rejected", verifiedAmount: "₹0" }));
    }
    showToast("Declaration rejected with notification sent to employee.", "warning");
  };

  /* =========================================================
     RENDER CENTER PANEL CONTENT ACCORDING TO ACTIVE TAB
     ========================================================= */

  const renderCenterContent = () => {
    switch (activeTab) {
      /* ----------------------------------------------------
         1. GENERAL SETTINGS
         ---------------------------------------------------- */
      case "settings":
        return (
          <div className="inv-tab-content">
            <div className="inv-content-header">
              <div>
                <h2 className="inv-content-title">General Settings</h2>
                <p className="inv-content-subtitle">
                  Configure corporate investment declaration rules, regimes, and approval workflows.
                </p>
              </div>
              <div className="inv-header-actions">
                {isEditingSettings ? (
                  <>
                    <button
                      type="button"
                      className="inv-btn inv-btn-primary"
                      onClick={handleSaveSettings}
                    >
                      <Check size={16} /> Save Changes
                    </button>
                    <button
                      type="button"
                      className="inv-btn inv-btn-secondary"
                      onClick={handleCancelSettings}
                    >
                      <X size={16} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="inv-btn inv-btn-primary"
                      onClick={handleStartEditSettings}
                    >
                      <Pencil size={15} /> Edit
                    </button>
                    <button
                      type="button"
                      className="inv-btn-icon"
                      title="Audit History"
                      onClick={() => showToast("Showing recent settings audit history logs.")}
                    >
                      <FileText size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="inv-settings-grid">
              {/* Question 1 */}
              <div className="inv-setting-item">
                <div className="inv-setting-info">
                  <span className="inv-setting-label">Can Employees select Tax Regime during declaration window?</span>
                  <span className="inv-setting-desc">
                    Allows employees to toggle between Old Regime (deductions eligible) and New Regime (Sec 115BAC).
                  </span>
                </div>
                <div className="inv-radio-group">
                  <label className={`inv-radio-pill ${draftSettings.regimeSelectionAllowed ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="regimeSelectionAllowed"
                      checked={draftSettings.regimeSelectionAllowed}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, regimeSelectionAllowed: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`inv-radio-pill ${!draftSettings.regimeSelectionAllowed ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="regimeSelectionAllowed"
                      checked={!draftSettings.regimeSelectionAllowed}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, regimeSelectionAllowed: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Question 2 */}
              <div className="inv-setting-item">
                <div className="inv-setting-info">
                  <span className="inv-setting-label">Allow employees to submit revision requests after cut-off date?</span>
                  <span className="inv-setting-desc">
                    Grants grace period submissions before the monthly payroll TDS cycle is finalized.
                  </span>
                </div>
                <div className="inv-radio-group">
                  <label className={`inv-radio-pill ${draftSettings.revisedSubmissionAfterCutoff ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="revisedSubmissionAfterCutoff"
                      checked={draftSettings.revisedSubmissionAfterCutoff}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, revisedSubmissionAfterCutoff: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`inv-radio-pill ${!draftSettings.revisedSubmissionAfterCutoff ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="revisedSubmissionAfterCutoff"
                      checked={!draftSettings.revisedSubmissionAfterCutoff}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, revisedSubmissionAfterCutoff: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Question 3 */}
              <div className="inv-setting-item">
                <div className="inv-setting-info">
                  <span className="inv-setting-label">Is documentary proof mandatory for Section 80C & 80D?</span>
                  <span className="inv-setting-desc">
                    If enabled, provisional declarations will not be tax-exempted without certified receipts attached.
                  </span>
                </div>
                <div className="inv-radio-group">
                  <label className={`inv-radio-pill ${draftSettings.proofMandatoryFor80C ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="proofMandatoryFor80C"
                      checked={draftSettings.proofMandatoryFor80C}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, proofMandatoryFor80C: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`inv-radio-pill ${!draftSettings.proofMandatoryFor80C ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="proofMandatoryFor80C"
                      checked={!draftSettings.proofMandatoryFor80C}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, proofMandatoryFor80C: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Question 4 */}
              <div className="inv-setting-item">
                <div className="inv-setting-info">
                  <span className="inv-setting-label">Would you like to show Approve/Reject button in email notifications?</span>
                  <span className="inv-setting-desc">
                    Approvers can approve or reject submitted Form 12BB declarations directly from their inbox.
                  </span>
                </div>
                <div className="inv-radio-group">
                  <label className={`inv-radio-pill ${draftSettings.approverEmailButtons ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="approverEmailButtons"
                      checked={draftSettings.approverEmailButtons}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, approverEmailButtons: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`inv-radio-pill ${!draftSettings.approverEmailButtons ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="approverEmailButtons"
                      checked={!draftSettings.approverEmailButtons}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, approverEmailButtons: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Question 5 */}
              <div className="inv-setting-item">
                <div className="inv-setting-info">
                  <span className="inv-setting-label">Automatically apply Standard Deduction (₹75k New / ₹50k Old)?</span>
                  <span className="inv-setting-desc">
                    Standard deduction is applied uniformly across gross salary computation without employee prompt.
                  </span>
                </div>
                <div className="inv-radio-group">
                  <label className={`inv-radio-pill ${draftSettings.autoStandardDeduction ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="autoStandardDeduction"
                      checked={draftSettings.autoStandardDeduction}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, autoStandardDeduction: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`inv-radio-pill ${!draftSettings.autoStandardDeduction ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="autoStandardDeduction"
                      checked={!draftSettings.autoStandardDeduction}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, autoStandardDeduction: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Question 6 */}
              <div className="inv-setting-item">
                <div className="inv-setting-info">
                  <span className="inv-setting-label">Can Employees view their tax computation sheet & audit trail?</span>
                  <span className="inv-setting-desc">
                    Allows employees to download projected monthly TDS calculations in their Employee Portal.
                  </span>
                </div>
                <div className="inv-radio-group">
                  <label className={`inv-radio-pill ${draftSettings.employeeViewAuditTrail ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="employeeViewAuditTrail"
                      checked={draftSettings.employeeViewAuditTrail}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, employeeViewAuditTrail: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`inv-radio-pill ${!draftSettings.employeeViewAuditTrail ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="employeeViewAuditTrail"
                      checked={!draftSettings.employeeViewAuditTrail}
                      disabled={!isEditingSettings}
                      onChange={() => setDraftSettings((p) => ({ ...p, employeeViewAuditTrail: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Approver Selection Dropdown */}
              <div className="inv-setting-item inv-setting-dropdown-row">
                <div className="inv-setting-info">
                  <span className="inv-setting-label">Select designated tax reviewer for investment declarations:</span>
                  <span className="inv-setting-desc">
                    Designated role or user responsible for reviewing proof documents and sanctioning exemptions.
                  </span>
                </div>
                <div className="inv-select-wrap">
                  <select
                    className="inv-select"
                    value={draftSettings.selectedTaxApprover}
                    disabled={!isEditingSettings}
                    onChange={(e) => setDraftSettings((p) => ({ ...p, selectedTaxApprover: e.target.value }))}
                  >
                    {APPROVER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Declaration Submission Window Box */}
              <div className="inv-window-box">
                <div className="inv-window-header">
                  <ShieldCheck size={20} className="inv-window-icon" />
                  <div>
                    <h3 className="inv-window-title">Declaration Submission Windows (FY 2025-26)</h3>
                    <p className="inv-window-sub">
                      Timelines for provisional declaration submissions and final year-end proofs verification.
                    </p>
                  </div>
                </div>
                <div className="inv-window-grid">
                  <div className="inv-window-card">
                    <span className="inv-window-badge is-open">Window Active</span>
                    <h4>Provisional Tax Declaration</h4>
                    <p>Allows employees to declare initial expected investments to optimize TDS deductions.</p>
                    <div className="inv-window-meta">
                      <span>Cut-off: <strong>30 Nov 2025</strong></span>
                      <span>Submissions: <strong>142 / 160</strong></span>
                    </div>
                  </div>
                  <div className="inv-window-card">
                    <span className="inv-window-badge is-open">Window Active</span>
                    <h4>Year-End Actual Proof Verification</h4>
                    <p>Mandatory window where employees must upload stamped bank slips, insurance and rent receipts.</p>
                    <div className="inv-window-meta">
                      <span>Cut-off: <strong>15 Feb 2026</strong></span>
                      <span>Submissions: <strong>98 / 160</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      /* ----------------------------------------------------
         2. TEMPLATES
         ---------------------------------------------------- */
      case "templates":
        return (
          <div className="inv-tab-content">
            <div className="inv-content-header">
              <div>
                <h2 className="inv-content-title">Investment Declaration Templates</h2>
                <p className="inv-content-subtitle">
                  Define customized investment deduction policies and eligibility slabs for employee groups.
                </p>
              </div>
              <div className="inv-header-actions">
                <button
                  type="button"
                  className="inv-btn inv-btn-primary"
                  onClick={() => setTemplateModalOpen(true)}
                >
                  <Plus size={16} /> Add Template
                </button>
              </div>
            </div>

            <div className="inv-table-card">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Template Name</th>
                    <th>No. Of Active Employees Covered</th>
                    <th>Applicable Tax Regime</th>
                    <th>Proof Mandatory</th>
                    <th>Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tpl) => (
                    <tr key={tpl.id}>
                      <td>
                        <div className="inv-tpl-cell">
                          <span className="inv-tpl-name">{tpl.name}</span>
                          <span className="inv-tpl-desc">{tpl.description}</span>
                        </div>
                      </td>
                      <td className="inv-num-cell">
                        <span className="inv-count-badge">{tpl.coveredCount}</span>
                      </td>
                      <td>
                        <span className={`inv-regime-tag ${tpl.regime.toLowerCase().includes("old") ? "is-old" : "is-new"}`}>
                          {tpl.regime}
                        </span>
                      </td>
                      <td className="inv-icon-cell">
                        {tpl.proofMandatory ? (
                          <CheckCircle2 size={18} className="inv-icon-check" />
                        ) : (
                          <XCircle size={18} className="inv-icon-cross" />
                        )}
                      </td>
                      <td>
                        <span className={`inv-status-pill ${tpl.status.toLowerCase()}`}>
                          {tpl.status}
                        </span>
                      </td>
                      <td className="td-actions">
                        <button
                          type="button"
                          className="inv-row-action-btn"
                          title="Edit Template"
                          onClick={() => showToast(`Opening edit modal for "${tpl.name}".`)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="inv-row-action-btn"
                          title="View Allowed Sections"
                          onClick={() => showToast(`Allowed sections: ${tpl.allowedSections.join(", ")}`)}
                        >
                          <Eye size={15} />
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
         3. TEMPLATE ASSIGNMENTS
         ---------------------------------------------------- */
      case "assignments":
        return (
          <div className="inv-tab-content">
            <div className="inv-content-header">
              <div>
                <h2 className="inv-content-title">Employee Investment Assignment</h2>
                <p className="inv-content-subtitle">
                  Assign declaration templates and tax approvers to employees across organizational departments.
                </p>
              </div>
              <div className="inv-header-actions">
                <div className="inv-actions-dropdown">
                  <button
                    type="button"
                    className="inv-btn inv-btn-secondary"
                    onClick={() => showToast("Bulk action selected. Apply to checked rows.")}
                  >
                    Actions <ChevronDown size={14} />
                  </button>
                </div>
                <div className="inv-search-box">
                  <input
                    type="text"
                    placeholder="Search employee or PAN..."
                    value={assignSearch}
                    onChange={(e) => {
                      setAssignSearch(e.target.value);
                      setAssignPage(1);
                    }}
                  />
                  {assignSearch && (
                    <button
                      type="button"
                      className="inv-search-clear"
                      onClick={() => setAssignSearch("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <select
                  className="inv-filter-select"
                  value={assignFilterRegime}
                  onChange={(e) => {
                    setAssignFilterRegime(e.target.value);
                    setAssignPage(1);
                  }}
                >
                  <option value="all">All Regimes</option>
                  <option value="old">Old Regime Only</option>
                  <option value="new">New Regime Only</option>
                </select>
              </div>
            </div>

            {selectedAssignIds.size > 0 && (
              <div className="inv-selection-bar">
                <span>{selectedAssignIds.size} employees selected</span>
                <div className="inv-selection-actions">
                  <button
                    type="button"
                    className="inv-pill-btn"
                    onClick={() => {
                      showToast(`Bulk updated ${selectedAssignIds.size} employees to Old Regime Template.`);
                      setSelectedAssignIds(new Set());
                    }}
                  >
                    Change Template
                  </button>
                  <button
                    type="button"
                    className="inv-pill-btn"
                    onClick={() => {
                      showToast(`Sent declaration reminder emails to ${selectedAssignIds.size} employees.`);
                      setSelectedAssignIds(new Set());
                    }}
                  >
                    Send Reminder
                  </button>
                  <button
                    type="button"
                    className="inv-pill-btn inv-pill-btn-clear"
                    onClick={() => setSelectedAssignIds(new Set())}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}

            <div className="inv-table-card">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: "42px" }}>
                      <input
                        type="checkbox"
                        checked={
                          selectedAssignIds.size === paginatedAssignments.length &&
                          paginatedAssignments.length > 0
                        }
                        onChange={handleToggleSelectAllAssign}
                        aria-label="Select all"
                      />
                    </th>
                    <th>Employee Name</th>
                    <th>Current Investment Template</th>
                    <th>PAN & Tax Regime</th>
                    <th>Supervisors / Approvers</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="inv-empty-state">
                        <Info size={24} />
                        <p>No matching employee investment assignments found.</p>
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
                            onChange={() => handleToggleSelectAssignRow(a.id)}
                            aria-label={`Select ${a.name}`}
                          />
                        </td>
                        <td>
                          <div className="inv-emp-cell">
                            <div className="inv-emp-avatar">
                              {a.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div>
                              <span className="inv-emp-name">{a.name}</span>
                              <span className="inv-emp-code">
                                {a.empCode} • {a.department}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="inv-template-badge">{a.template}</span>
                        </td>
                        <td>
                          <div className="inv-pan-cell">
                            <span className="inv-pan-num">{a.panNumber}</span>
                            <span className="inv-regime-sub">{a.regime}</span>
                          </div>
                        </td>
                        <td className="inv-approvers-cell">{a.approvers}</td>
                        <td className="td-actions">
                          <button
                            type="button"
                            className="inv-row-action-btn"
                            title="Reassign Template"
                            onClick={() => showToast(`Edit template assignment for ${a.name}`)}
                          >
                            <Plus size={15} />
                          </button>
                          <button
                            type="button"
                            className="inv-row-action-btn"
                            title="Declaration Logs"
                            onClick={() => showToast(`Viewing declaration logs for ${a.name}`)}
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            type="button"
                            className="inv-row-action-btn"
                            title="More options"
                            onClick={() => showToast(`Options menu for ${a.name}`)}
                          >
                            <MoreVertical size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="inv-pagination-bar">
              <span className="inv-pagination-info">
                Showing {filteredAssignments.length > 0 ? (assignPage - 1) * assignRowsPerPage + 1 : 0} to{" "}
                {Math.min(assignPage * assignRowsPerPage, filteredAssignments.length)} of{" "}
                {filteredAssignments.length} entries
              </span>
              <div className="inv-pagination-ctrls">
                <button
                  type="button"
                  className="inv-page-btn"
                  disabled={assignPage <= 1}
                  onClick={() => setAssignPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                {Array.from({ length: totalAssignPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    className={`inv-page-num ${pg === assignPage ? "is-active" : ""}`}
                    onClick={() => setAssignPage(pg)}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  className="inv-page-btn"
                  disabled={assignPage >= totalAssignPages}
                  onClick={() => setAssignPage((p) => Math.min(totalAssignPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        );

      /* ----------------------------------------------------
         4. INVESTMENT SECTIONS & LIMITS
         ---------------------------------------------------- */
      case "sections":
        return (
          <div className="inv-tab-content">
            <div className="inv-content-header">
              <div>
                <h2 className="inv-content-title">Investment Sections & Exemption Limits</h2>
                <p className="inv-content-subtitle">
                  Configure statutory tax exemptions, allowable deductions, and maximum fiscal year caps.
                </p>
              </div>
              <div className="inv-header-actions">
                <div className="inv-search-box">
                  <input
                    type="text"
                    placeholder="Search section code..."
                    value={sectionSearch}
                    onChange={(e) => setSectionSearch(e.target.value)}
                  />
                  {sectionSearch && (
                    <button
                      type="button"
                      className="inv-search-clear"
                      onClick={() => setSectionSearch("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="inv-btn inv-btn-primary"
                  onClick={() => setSectionModalOpen(true)}
                >
                  <Plus size={16} /> Add Section
                </button>
              </div>
            </div>

            <div className="inv-table-card">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Section Code & Exemption Name</th>
                    <th>Max Exemption Limit</th>
                    <th>Applicable Regime</th>
                    <th>Effective From</th>
                    <th>Updated At</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSections.map((sec) => (
                    <tr key={sec.id}>
                      <td>
                        <div className="inv-section-cell">
                          <span className="inv-section-code">{sec.code}</span>
                          <span className="inv-section-name">{sec.name}</span>
                        </div>
                      </td>
                      <td className="inv-limit-cell">
                        <strong>{sec.maxLimit}</strong>
                      </td>
                      <td>
                        <span className={`inv-regime-tag ${sec.regime.toLowerCase().includes("old") ? "is-old" : "is-both"}`}>
                          {sec.regime}
                        </span>
                      </td>
                      <td className="inv-date-cell">{sec.effectiveFrom}</td>
                      <td className="inv-date-cell">{sec.updatedAt}</td>
                      <td className="td-actions">
                        <button
                          type="button"
                          className="inv-row-action-btn"
                          title="Edit Limit"
                          onClick={() => showToast(`Edit section limit for ${sec.code}`)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="inv-row-action-btn inv-btn-delete"
                          title="Toggle Active Status"
                          onClick={() => showToast(`Toggled status for ${sec.code}`)}
                        >
                          <CheckCircle2 size={15} />
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
         5. SUBMISSIONS & PROOF VERIFICATION
         ---------------------------------------------------- */
      case "submissions":
        return (
          <div className="inv-tab-content">
            <div className="inv-content-header">
              <div>
                <h2 className="inv-content-title">Employee Declarations & Proof Verification</h2>
                <p className="inv-content-subtitle">
                  Inspect submitted Form 12BB declarations, examine uploaded receipts, and sanction tax exemptions.
                </p>
              </div>
              <div className="inv-header-actions">
                <div className="inv-actions-dropdown">
                  <button
                    type="button"
                    className="inv-btn inv-btn-secondary"
                    onClick={() => showToast("Bulk action selected: Exporting approved proofs ZIP.")}
                  >
                    Actions <ChevronDown size={14} />
                  </button>
                </div>
                <div className="inv-search-box">
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={subSearch}
                    onChange={(e) => {
                      setSubSearch(e.target.value);
                      setSubPage(1);
                    }}
                  />
                  {subSearch && (
                    <button
                      type="button"
                      className="inv-search-clear"
                      onClick={() => setSubSearch("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <select
                  className="inv-filter-select"
                  value={subStatusFilter}
                  onChange={(e) => {
                    setSubStatusFilter(e.target.value);
                    setSubPage(1);
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Proofs Required">Proofs Required</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="inv-table-card">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: "42px" }}>
                      <input
                        type="checkbox"
                        checked={
                          selectedSubIds.size === paginatedSubmissions.length &&
                          paginatedSubmissions.length > 0
                        }
                        onChange={() => {
                          if (selectedSubIds.size === paginatedSubmissions.length) {
                            setSelectedSubIds(new Set());
                          } else {
                            setSelectedSubIds(new Set(paginatedSubmissions.map((s) => s.id)));
                          }
                        }}
                        aria-label="Select all"
                      />
                    </th>
                    <th>Employee Name</th>
                    <th>Declared Amount</th>
                    <th>Verified Amount</th>
                    <th>Submission Date & Proofs</th>
                    <th>Verification Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="inv-empty-state">
                        <Info size={24} />
                        <p>No investment submissions found matching the criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSubmissions.map((s) => (
                      <tr key={s.id} className={selectedSubIds.has(s.id) ? "is-row-selected" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedSubIds.has(s.id)}
                            onChange={() => {
                              const next = new Set(selectedSubIds);
                              if (next.has(s.id)) next.delete(s.id);
                              else next.add(s.id);
                              setSelectedSubIds(next);
                            }}
                            aria-label={`Select ${s.employeeName}`}
                          />
                        </td>
                        <td>
                          <div className="inv-emp-cell">
                            <div className="inv-emp-avatar">
                              {s.employeeName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div>
                              <span className="inv-emp-name">{s.employeeName}</span>
                              <span className="inv-emp-code">
                                {s.empCode} • {s.department}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="inv-amount-cell">
                          <strong>{s.declaredAmount}</strong>
                        </td>
                        <td className="inv-amount-cell">
                          <span className={s.verifiedAmount !== "₹0" ? "inv-verified-val" : "inv-zero-val"}>
                            {s.verifiedAmount}
                          </span>
                        </td>
                        <td>
                          <div className="inv-sub-meta">
                            <span>{s.submissionDate}</span>
                            <span className="inv-proof-count">{s.proofCount} files attached</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`inv-status-pill ${
                              s.status === "Approved"
                                ? "is-approved"
                                : s.status === "Pending Verification"
                                ? "is-pending"
                                : s.status === "Proofs Required"
                                ? "is-required"
                                : "is-rejected"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="td-actions">
                          <button
                            type="button"
                            className="inv-row-action-btn inv-btn-review"
                            title="Review Proofs & Verify"
                            onClick={() => setReviewModalData(s)}
                          >
                            <Eye size={15} /> Review
                          </button>
                          <button
                            type="button"
                            className="inv-row-action-btn"
                            title="Download All Proofs"
                            onClick={() => showToast(`Downloaded proof documents for ${s.employeeName}.`)}
                          >
                            <Download size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="inv-pagination-bar">
              <span className="inv-pagination-info">
                Showing {filteredSubmissions.length > 0 ? (subPage - 1) * subRowsPerPage + 1 : 0} to{" "}
                {Math.min(subPage * subRowsPerPage, filteredSubmissions.length)} of{" "}
                {filteredSubmissions.length} submissions
              </span>
              <div className="inv-pagination-ctrls">
                <button
                  type="button"
                  className="inv-page-btn"
                  disabled={subPage <= 1}
                  onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                {Array.from({ length: totalSubPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    className={`inv-page-num ${pg === subPage ? "is-active" : ""}`}
                    onClick={() => setSubPage(pg)}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  className="inv-page-btn"
                  disabled={subPage >= totalSubPages}
                  onClick={() => setSubPage((p) => Math.min(totalSubPages, p + 1))}
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
    <div className="investments-page">
      {/* Toast Alert */}
      {toast && (
        <div className={`inv-toast inv-toast-${toast.type}`} role="alert">
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main 3-Column Structured Layout */}
      <div className="inv-layout-grid">
        {/* =========================================================
            LEFT COLUMN: Details List
            ========================================================= */}
        <aside className="inv-details-card">
          <div className="inv-details-header">
            <Settings size={18} className="inv-details-head-icon" />
            <h2>Details List</h2>
          </div>

          <nav className="inv-details-nav" aria-label="Investment Subpages">
            <button
              type="button"
              className={`inv-nav-item ${activeTab === "settings" ? "is-active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <div className="inv-nav-item-content">
                <span className="inv-nav-number">1.</span>
                <span className="inv-nav-text">General Settings</span>
              </div>
              <ChevronDown size={15} className="inv-nav-arrow" />
            </button>

            <button
              type="button"
              className={`inv-nav-item ${activeTab === "templates" ? "is-active" : ""}`}
              onClick={() => setActiveTab("templates")}
            >
              <div className="inv-nav-item-content">
                <span className="inv-nav-number">2.</span>
                <span className="inv-nav-text">Templates</span>
              </div>
              <ChevronDown size={15} className="inv-nav-arrow" />
            </button>

            <button
              type="button"
              className={`inv-nav-item ${activeTab === "assignments" ? "is-active" : ""}`}
              onClick={() => setActiveTab("assignments")}
            >
              <div className="inv-nav-item-content">
                <span className="inv-nav-number">3.</span>
                <span className="inv-nav-text">Template Assignments</span>
              </div>
              <ChevronDown size={15} className="inv-nav-arrow" />
            </button>

            <button
              type="button"
              className={`inv-nav-item ${activeTab === "sections" ? "is-active" : ""}`}
              onClick={() => setActiveTab("sections")}
            >
              <div className="inv-nav-item-content">
                <span className="inv-nav-number">4.</span>
                <span className="inv-nav-text">Investment Sections & Limits</span>
              </div>
              <ChevronDown size={15} className="inv-nav-arrow" />
            </button>

            <button
              type="button"
              className={`inv-nav-item ${activeTab === "submissions" ? "is-active" : ""}`}
              onClick={() => setActiveTab("submissions")}
            >
              <div className="inv-nav-item-content">
                <span className="inv-nav-number">5.</span>
                <span className="inv-nav-text">Submissions & Proofs</span>
              </div>
              <ChevronDown size={15} className="inv-nav-arrow" />
            </button>
          </nav>
        </aside>

        {/* =========================================================
            CENTER COLUMN: Dynamic Subpage Content
            ========================================================= */}
        <main className="inv-main-content">
          {renderCenterContent()}
        </main>

        {/* =========================================================
            RIGHT COLUMN: Help Center
            ========================================================= */}
        <aside className="inv-help-card">
          <div className="inv-help-header">
            <BookOpen size={18} className="inv-help-head-icon" />
            <h2>Help Center</h2>
          </div>

          <div className="inv-help-body">
            <ul className="inv-help-list">
              <li>
                <strong>Investment settings</strong> allows you to configure tax declaration policies in the form of templates based on different departments, tax regimes (Old vs New Regime under Sec 115BAC), and fiscal year cutoff windows.
              </li>
              <li>
                Within <strong>investment templates</strong> you can define allowed deduction sections (80C, 80D, 80CCD, HRA, Section 24), exemption caps, and whether documentary proof upload is mandatory.
              </li>
              <li>
                You can <strong>automate the tax deduction process</strong> by automatically computing taxable gross salary minus approved declaration proofs, preventing excessive TDS recovery.
              </li>
              <li>
                In the <strong>submission windows</strong> you can lock submission cutoffs for provisional declarations (beginning of FY) and final year-end proof submissions (Jan–Feb).
              </li>
              <li>
                <strong>Investments module is integrated with payroll and Form 16</strong> generation, syncing TDS deduction schedules directly for accurate tax remittance.
              </li>
            </ul>

            <div className="inv-help-links">
              <span className="inv-links-title">Quick Resources</span>
              <a
                href="#download-12bb"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Downloaded sample Form 12BB template.");
                }}
              >
                <Download size={14} /> Download Form 12BB Declaration
              </a>
              <a
                href="#tax-slabs"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Opened FY 2025-26 Tax Slab Comparison Table.");
                }}
              >
                <ExternalLink size={14} /> View FY 2025-26 Tax Slabs Guide
              </a>
              <a
                href="#verification-sop"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Opened Auditor Verification SOP.");
                }}
              >
                <FileText size={14} /> Tax Exemption Verification SOP
              </a>
            </div>
          </div>
        </aside>
      </div>

      {/* =========================================================
          MODALS
          ========================================================= */}

      {/* 1. Add Template Modal */}
      {templateModalOpen && (
        <div className="inv-modal-backdrop" onClick={() => setTemplateModalOpen(false)}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="inv-modal-header">
              <h3>Create Investment Declaration Template</h3>
              <button
                type="button"
                className="inv-modal-close"
                onClick={() => setTemplateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTemplate}>
              <div className="inv-modal-body">
                <div className="inv-form-group">
                  <label>Template Name <span className="req-star">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard Old Regime Deduction Policy"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="inv-form-group">
                  <label>Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of eligibility and covered tax sections..."
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Applicable Tax Regime</label>
                    <select
                      value={newTemplate.regime}
                      onChange={(e) => setNewTemplate((p) => ({ ...p, regime: e.target.value }))}
                    >
                      <option value="Old Tax Regime">Old Tax Regime</option>
                      <option value="New Tax Regime (Default)">New Tax Regime (Section 115BAC)</option>
                      <option value="Dual Regime Supported">Dual Regime Supported</option>
                    </select>
                  </div>
                  <div className="inv-form-group">
                    <label>Documentary Proof Required</label>
                    <select
                      value={newTemplate.proofMandatory ? "yes" : "no"}
                      onChange={(e) =>
                        setNewTemplate((p) => ({ ...p, proofMandatory: e.target.value === "yes" }))
                      }
                    >
                      <option value="yes">Yes (Mandatory Receipts)</option>
                      <option value="no">No (Self Declaration)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="inv-modal-footer">
                <button
                  type="button"
                  className="inv-btn inv-btn-secondary"
                  onClick={() => setTemplateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="inv-btn inv-btn-primary">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Section Modal */}
      {sectionModalOpen && (
        <div className="inv-modal-backdrop" onClick={() => setSectionModalOpen(false)}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="inv-modal-header">
              <h3>Add Exemption Section</h3>
              <button
                type="button"
                className="inv-modal-close"
                onClick={() => setSectionModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSection}>
              <div className="inv-modal-body">
                <div className="inv-form-group">
                  <label>Section Code <span className="req-star">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Section 80EEA"
                    value={newSection.code}
                    onChange={(e) => setNewSection((p) => ({ ...p, code: e.target.value }))}
                  />
                </div>
                <div className="inv-form-group">
                  <label>Section Name & Description <span className="req-star">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Interest on loan taken for certain house property"
                    value={newSection.name}
                    onChange={(e) => setNewSection((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Max Exemption Limit</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹1,50,000"
                      value={newSection.maxLimit}
                      onChange={(e) => setNewSection((p) => ({ ...p, maxLimit: e.target.value }))}
                    />
                  </div>
                  <div className="inv-form-group">
                    <label>Applicable Regime</label>
                    <select
                      value={newSection.regime}
                      onChange={(e) => setNewSection((p) => ({ ...p, regime: e.target.value }))}
                    >
                      <option value="Old Regime">Old Regime</option>
                      <option value="Both Regimes">Both Regimes</option>
                      <option value="New Regime">New Regime</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="inv-modal-footer">
                <button
                  type="button"
                  className="inv-btn inv-btn-secondary"
                  onClick={() => setSectionModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="inv-btn inv-btn-primary">
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Review Submission Modal */}
      {reviewModalData && (
        <div className="inv-modal-backdrop" onClick={() => setReviewModalData(null)}>
          <div className="inv-modal inv-modal-lg" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="inv-modal-header">
              <div>
                <h3>Investment Declaration Review</h3>
                <p className="inv-modal-sub">
                  Employee: <strong>{reviewModalData.employeeName}</strong> ({reviewModalData.empCode}) • {reviewModalData.department}
                </p>
              </div>
              <button
                type="button"
                className="inv-modal-close"
                onClick={() => setReviewModalData(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="inv-modal-body">
              <div className="inv-review-summary">
                <div className="inv-summary-card">
                  <span>Declared Total</span>
                  <strong>{reviewModalData.declaredAmount}</strong>
                </div>
                <div className="inv-summary-card">
                  <span>Verified Exemption</span>
                  <strong className="inv-verified-txt">{reviewModalData.verifiedAmount}</strong>
                </div>
                <div className="inv-summary-card">
                  <span>Tax Regime</span>
                  <strong>{reviewModalData.regime}</strong>
                </div>
                <div className="inv-summary-card">
                  <span>Status</span>
                  <span className={`inv-status-pill ${reviewModalData.status === "Approved" ? "is-approved" : "is-pending"}`}>
                    {reviewModalData.status}
                  </span>
                </div>
              </div>

              <h4 className="inv-section-h4">Attached Declaration Proofs ({reviewModalData.items.length})</h4>
              <div className="inv-items-table-wrap">
                <table className="inv-table inv-sub-table">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Declared (₹)</th>
                      <th>Verified (₹)</th>
                      <th>Proof Document</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewModalData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.section}</td>
                        <td>₹{item.declared.toLocaleString("en-IN")}</td>
                        <td>₹{item.verified.toLocaleString("en-IN")}</td>
                        <td>
                          <button
                            type="button"
                            className="inv-doc-link"
                            onClick={() => showToast(`Previewing file "${item.doc}"`)}
                          >
                            <FileText size={14} /> {item.doc}
                          </button>
                        </td>
                        <td>
                          <span className={`inv-item-status ${item.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="inv-modal-footer">
              <button
                type="button"
                className="inv-btn inv-btn-danger"
                onClick={() => handleRejectSubmission(reviewModalData.id)}
              >
                <XCircle size={16} /> Reject Declaration
              </button>
              <button
                type="button"
                className="inv-btn inv-btn-primary"
                onClick={() => handleApproveSubmission(reviewModalData.id)}
              >
                <CheckCircle2 size={16} /> Approve & Grant Exemption
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
