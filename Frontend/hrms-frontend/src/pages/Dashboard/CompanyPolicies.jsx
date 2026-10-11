import React, { useState, useRef, useEffect, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import axios from "axios";
import {
  PiFilePdfDuotone,
  PiTrashDuotone,
  PiCalendarBlankDuotone,
  PiCloudArrowUpDuotone,
  PiWarningCircleDuotone,
  PiXBold,
  PiExportBold,
  PiPlusBold,
  PiFolderOpenDuotone,
  PiCaretDownBold,
  PiCheckBold,
  PiMagnifyingGlassBold,
  PiPencilSimpleBold,
  PiArchiveBold,
  PiEyeBold,
  PiEyeSlashBold,
  PiCheckCircleBold,
  PiCaretRightBold,
} from "react-icons/pi";

import "./CompanyPolicies.css";
import PolicyDatePicker from "./PolicyDatePicker";

import SidebarAdmin from "../../components/sidebar/Sidebar";
import SidebarTL from "../../components/sidebar/sidebar_tl";
import SidebarEmp from "../../components/sidebar/Sidebar_emp";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import { authHeaders, getApiBaseUrl, getApiUrl } from "../../services/apiClient";

export const INITIAL_COMPANY_POLICIES = [
  {
    id: 1,
    name: "Code of Conduct & Workplace Ethics",
    title: "Code of Conduct & Workplace Ethics",
    department: "All Department",
    category: "General",
    description: "Guidelines establishing professional ethics, integrity, workplace respect, conflict of interest, and statutory compliance across all business operations.",
    status: "Published",
    version_number: "2.1",
    publish_date: "15-01-2026",
    updated_date: "01-09-2026",
    created_date: "2026-01-15",
    file_path: "",
  },
  {
    id: 2,
    name: "Attendance, Hours & Leave Policy",
    title: "Attendance, Hours & Leave Policy",
    department: "HR",
    category: "HR",
    description: "Official policy on working hours (9:30 AM – 6:30 PM), punch-in grace period (15 mins), annual paid leaves, maternity/paternity leave, and attendance regularizations.",
    status: "Published",
    version_number: "3.0",
    publish_date: "01-02-2026",
    updated_date: "15-08-2026",
    created_date: "2026-02-01",
    file_path: "",
  },
  {
    id: 3,
    name: "Information Security & Data Protection",
    title: "Information Security & Data Protection",
    department: "IT",
    category: "Security",
    description: "Mandatory protocols for device security, client data confidentiality, two-factor authentication, safe VPN usage, and credential protection.",
    status: "Published",
    version_number: "2.0",
    publish_date: "10-03-2026",
    updated_date: "20-07-2026",
    created_date: "2026-03-10",
    file_path: "",
  },
  {
    id: 4,
    name: "Remote & Hybrid Work Policy",
    title: "Remote & Hybrid Work Policy",
    department: "Operations",
    category: "Operations",
    description: "Eligibility criteria, punch-in verification for work-from-home, core collaboration hours, and client-site etiquette.",
    status: "Published",
    version_number: "1.4",
    publish_date: "01-04-2026",
    updated_date: "10-09-2026",
    created_date: "2026-04-01",
    file_path: "",
  },
  {
    id: 5,
    name: "POSH & Workplace Safety Guidelines",
    title: "POSH & Workplace Safety Guidelines",
    department: "HR",
    category: "HR",
    description: "Zero-tolerance framework under the POSH Act 2013, Internal Complaints Committee (ICC) procedures, and confidential grievance redressal.",
    status: "Published",
    version_number: "2.0",
    publish_date: "15-02-2026",
    updated_date: "01-08-2026",
    created_date: "2026-02-15",
    file_path: "",
  },
  {
    id: 6,
    name: "Travel & Business Expense Reimbursement",
    title: "Travel & Business Expense Reimbursement",
    department: "Finance",
    category: "Finance",
    description: "Rules for official travel allowances, lodging caps, food per diem, receipt submission timelines, and manager approval matrix.",
    status: "Published",
    version_number: "1.2",
    publish_date: "01-05-2026",
    updated_date: "25-08-2026",
    created_date: "2026-05-01",
    file_path: "",
  },
];

const STORAGE_KEY = "hrms_company_policies";

function getStoredPolicies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to read policies from localStorage:", e);
  }
  return INITIAL_COMPANY_POLICIES;
}

function saveStoredPolicies(list) {
  try {
    if (Array.isArray(list)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn("Failed to save policies to localStorage:", e);
  }
}

const POLICY_CATEGORIES = [
  { value: "HR", label: "HR" },
  { value: "IT", label: "IT" },
  { value: "Finance", label: "Finance" },
  { value: "Operations", label: "Operations" },
  { value: "Security", label: "Security" },
  { value: "General", label: "General" },
];

const POLICY_STATUSES = [
  { value: "Draft", label: "Draft" },
  { value: "Published", label: "Published" },
  { value: "Archived", label: "Archived" },
];

const DEPARTMENTS = [
  { value: "All Department", label: "All departments" },
  { value: "Marketing", label: "Marketing" },
  { value: "IT", label: "IT" },
  { value: "HR", label: "HR" },
  { value: "Finance", label: "Finance" },
  { value: "Operations", label: "Operations" },
];

export default function CompanyPolicies(props) {
  const isInsideShell = useContext(DashboardShellContext);
  const location = useLocation();
  const userRole = localStorage.getItem("role")?.toLowerCase() || "employee";
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  const isEmbeddedInLayout = Boolean(
    isInsideShell ||
    location.pathname.startsWith("/dashboard_emp") ||
    location.pathname.startsWith("/manager") ||
    location.pathname.startsWith("/dashboard/")
  );

  if (!isEmbeddedInLayout && isAdmin) {
    return (
      <DashboardShell>
        <CompanyPoliciesContent isInsideShell={true} {...props} />
      </DashboardShell>
    );
  }

  return <CompanyPoliciesContent isInsideShell={isEmbeddedInLayout} {...props} />;
}

function CompanyPoliciesContent({ isInsideShell }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docNotFound, setDocNotFound] = useState(false);
  const { id: routePolicyId } = useParams();
  const [routePolicy, setRoutePolicy] = useState(null);
  const [routePolicyLoading, setRoutePolicyLoading] = useState(Boolean(routePolicyId));
  const [routePolicyError, setRoutePolicyError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [policyToDelete, setPolicyToDelete] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Category");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [openDatePicker, setOpenDatePicker] = useState(null); // 'publish' | 'updated' | null

  const fileInputRef = useRef(null);

  const userRole = localStorage.getItem("role")?.toLowerCase() || "employee";
  const isManagerPortal = location.pathname.startsWith("/manager");
  const isAdmin = userRole === "admin" || userRole === "superadmin" || userRole === "manager" || isManagerPortal;

  const emptyPolicy = {
    title: "",
    department: "All Department",
    description: "",
    category: "General",
    publishDate: "",
    updatedDate: "",
    version: "1.0",
    status: "Draft",
    file: null,
    fileName: "",
  };

  const [newPolicy, setNewPolicy] = useState(emptyPolicy);

  const getPolicyName = (doc) => doc?.name || doc?.title || "Untitled policy";
  const getPolicyCategory = (doc) => doc?.category || "General";
  const getPolicyStatus = (doc) => doc?.status || (doc?.published === false ? "Draft" : "Published");
  const getPolicyPublishDate = (doc) => doc?.publish_date || doc?.publishDate || doc?.created_date || "—";
  const getPolicyUpdatedDate = (doc) => doc?.updated_date || doc?.updatedDate || doc?.created_date || "—";
  const getPolicyVersion = (doc) => doc?.version_number || doc?.version || "1.0";

  const formatPolicyDate = (dateVal) => {
    if (!dateVal || dateVal === "—") return "—";
    try {
      const s = String(dateVal).trim();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // Match DD-MM-YYYY or DD/MM/YYYY
      const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, "0");
        const monthIdx = parseInt(dmyMatch[2], 10) - 1;
        const year = dmyMatch[3];
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day} ${monthNames[monthIdx]} ${year}`;
        }
      }

      // Match YYYY-MM-DD
      const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (ymdMatch) {
        const year = ymdMatch[1];
        const monthIdx = parseInt(ymdMatch[2], 10) - 1;
        const day = ymdMatch[3].padStart(2, "0");
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day} ${monthNames[monthIdx]} ${year}`;
        }
      }

      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = monthNames[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      }
      return s;
    } catch {
      return String(dateVal);
    }
  };

  const getPolicyFileUrl = (doc) =>
    doc?.file_path
      ? (doc.file_path.startsWith("http")
        ? doc.file_path
        : getApiUrl(`/${String(doc.file_path).replace(/^\/+/, "")}`))
      : "";

  const handleOpenDoc = (doc) => {
    if (!doc) return;
    const fileUrl = getPolicyFileUrl(doc);
    setSelectedDoc({ title: getPolicyName(doc), fileURL: fileUrl, doc });
    setDocNotFound(!fileUrl);

    if (fileUrl) {
      // Proactively test if the document is accessible without displaying raw json
      fetch(fileUrl, { method: "HEAD" })
        .then((res) => {
          if (!res.ok) setDocNotFound(true);
        })
        .catch(() => {
          setDocNotFound(true);
        });
    }
  };

  const handleExport = () => {
    if (filteredDocuments.length === 0) return;
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Policy Name", "Department", "Category", "Status", "Publish Date", "Last Updated", "Version"];
    const rows = filteredDocuments.map((d) => [
      getPolicyName(d), d.department, getPolicyCategory(d), getPolicyStatus(d),
      getPolicyPublishDate(d), getPolicyUpdatedDate(d), getPolicyVersion(d)
    ].map(esc).join(","));
    const csv = [header.map(esc).join(","), ...rows].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `policies-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const url = getApiUrl("/policies/");
      const res = await axios.get(url, { headers: authHeaders() });
      if (res && Array.isArray(res.data) && res.data.length > 0 && typeof res.data[0] === "object") {
        setDocuments(res.data);
        saveStoredPolicies(res.data);
        return;
      }
    } catch (error) {
      console.warn("Backend API policies fetch unavailable, loading stored/initial policies:", error);
    } finally {
      setLoading(false);
    }

    // Fallback to localStorage or bundled initial company policies
    const fallback = getStoredPolicies();
    setDocuments(fallback);
  };

  useEffect(() => { fetchPolicies(); }, []);

  useEffect(() => {
    if (!routePolicyId) return;
    setRoutePolicyLoading(true);
    setRoutePolicyError(false);
    const localMatch = documents.find((d) => String(d.id) === String(routePolicyId));
    if (localMatch) {
      setRoutePolicy(localMatch);
      setRoutePolicyLoading(false);
      return;
    }
    axios.get(getApiUrl(`/policies/${routePolicyId}`), { headers: authHeaders() })
      .then((res) => {
        if (res.data && typeof res.data === "object" && !String(res.data).includes("<!doctype")) {
          setRoutePolicy(res.data);
        } else {
          setRoutePolicyError(true);
        }
      })
      .catch((err) => {
        console.warn('Policy fetch error:', err);
        setRoutePolicyError(true);
      })
      .finally(() => {
        setRoutePolicyLoading(false);
      });
  }, [routePolicyId, documents]);

  const filteredDocuments = documents.filter((doc) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      getPolicyName(doc).toLowerCase().includes(q) ||
      String(doc.description || "").toLowerCase().includes(q) ||
      String(doc.department || "").toLowerCase().includes(q) ||
      getPolicyCategory(doc).toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === "All Category" || getPolicyCategory(doc) === categoryFilter;

    const matchesStatus =
      statusFilter === "All Status" || getPolicyStatus(doc) === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const resetPolicyForm = () => {
    setNewPolicy(emptyPolicy);
    setEditingPolicy(null);
    setFormError("");
    setDragging(false);
    setOpenDatePicker(null);
  };

  const openAddModal = () => {
    resetPolicyForm();
    setShowModal(true);
  };

  const openEditModal = (e, doc) => {
    e.stopPropagation();
    setEditingPolicy(doc);
    setNewPolicy({
      title: getPolicyName(doc),
      department: doc?.department || "All Department",
      description: doc?.description || "",
      category: getPolicyCategory(doc),
      publishDate: doc?.publish_date || doc?.publishDate || "",
      updatedDate: doc?.updated_date || doc?.updatedDate || "",
      version: getPolicyVersion(doc),
      status: getPolicyStatus(doc),
      file: null,
      fileName: "",
    });
    setFormError("");
    setOpenDatePicker(null);
    setShowModal(true);
  };

  const closeAddModal = () => {
    setShowModal(false);
    setOpenDatePicker(null);
    resetPolicyForm();
  };

  const confirmDelete = (e, doc) => {
    e.stopPropagation();
    setPolicyToDelete(doc);
  };

  const executeDelete = async () => {
    if (!policyToDelete) return;
    try {
      const url = getApiUrl(`/policies/${policyToDelete.id}`);
      await axios.delete(url, { headers: authHeaders() }).catch(() => {});
    } catch (error) {
      console.warn("Error deleting policy via API:", error);
    } finally {
      setDocuments((items) => {
        const next = items.filter((x) => x.id !== policyToDelete.id);
        saveStoredPolicies(next);
        return next;
      });
      setPolicyToDelete(null);
    }
  };

  const acceptFile = (file) => {
    if (!file) return;
    const ok = /\.(pdf|docx?|xlsx?|xls)$/i.test(file.name);
    if (!ok) return setFormError("Use PDF, DOC, DOCX, XLS or XLSX files.");
    setNewPolicy((p) => ({ ...p, file, fileName: file.name }));
    setFormError("");
  };

  const handleFileChange = (e) => acceptFile(e.target.files?.[0]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleSave = async () => {
    if (!newPolicy.title.trim()) return setFormError("Enter a policy name.");
    if (!editingPolicy && !newPolicy.file) return setFormError("Upload a policy document.");
    if (!newPolicy.version.trim()) return setFormError("Enter a version number.");

    const body = new FormData();
    body.append("name", newPolicy.title.trim());
    body.append("title", newPolicy.title.trim());
    body.append("department", newPolicy.department);
    body.append("description", newPolicy.description || "");
    body.append("category", newPolicy.category);
    body.append("publish_date", newPolicy.publishDate || "");
    body.append("updated_date", newPolicy.updatedDate || "");
    body.append("version_number", newPolicy.version.trim());
    body.append("status", newPolicy.status);
    if (newPolicy.file) body.append("file", newPolicy.file);

    try {
      setSaving(true);
      let savedDoc = null;
      try {
        const url = editingPolicy ? getApiUrl(`/policies/${editingPolicy.id}`) : getApiUrl(`/policies/`);
        const res = editingPolicy
          ? await axios.put(url, body, { headers: authHeaders() })
          : await axios.post(url, body, { headers: authHeaders() });

        if (res && res.data && typeof res.data === "object" && !String(res.data).includes("<!doctype")) {
          savedDoc = res.data;
        }
      } catch (apiErr) {
        console.warn("API save failed, persisting locally:", apiErr);
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const updatedItem = savedDoc || {
        id: editingPolicy?.id || Date.now(),
        name: newPolicy.title.trim(),
        title: newPolicy.title.trim(),
        department: newPolicy.department,
        description: newPolicy.description || "",
        category: newPolicy.category,
        publish_date: newPolicy.publishDate || editingPolicy?.publish_date || todayStr,
        updated_date: newPolicy.updatedDate || todayStr,
        version_number: newPolicy.version.trim(),
        status: newPolicy.status,
        file_path: newPolicy.file ? URL.createObjectURL(newPolicy.file) : (editingPolicy?.file_path || ""),
      };

      setDocuments((prev) => {
        let next;
        if (editingPolicy) {
          next = prev.map((item) => (item.id === editingPolicy.id ? { ...item, ...updatedItem } : item));
        } else {
          next = [updatedItem, ...prev];
        }
        saveStoredPolicies(next);
        return next;
      });

      closeAddModal();
    } catch (error) {
      console.error("Error saving policy:", error);
      setFormError("Failed to save policy.");
    } finally {
      setSaving(false);
    }
  };

  const updatePolicyStatus = async (doc, nextStatus) => {
    try {
      const url = getApiUrl(`/policies/${doc.id}`);
      axios.patch(url, { status: nextStatus, published: nextStatus === "Published" }, { headers: authHeaders() }).catch(() => {});
    } catch (error) {
      console.warn("Error updating policy status via API:", error);
    }
    setDocuments((prev) => {
      const next = prev.map((item) => item.id === doc.id ? { ...item, status: nextStatus, published: nextStatus === "Published" } : item);
      saveStoredPolicies(next);
      return next;
    });
  };

  const togglePublish = (e, doc) => {
    e.stopPropagation();
    updatePolicyStatus(
      doc,
      getPolicyStatus(doc) === "Published" ? "Draft" : "Published"
    );
  };

  const archivePolicy = (e, doc) => {
    e.stopPropagation();
    updatePolicyStatus(doc, "Archived");
  };

  let SidebarComponent = SidebarEmp;
  if (userRole === "admin" || userRole === "superadmin") SidebarComponent = SidebarAdmin;
  else if (userRole === "teamleader") SidebarComponent = SidebarTL;

  const stats = useMemo(() => {
    const total = documents.length;
    const published = documents.filter((d) => getPolicyStatus(d) === "Published").length;
    const drafts = documents.filter((d) => getPolicyStatus(d) === "Draft").length;
    const archived = documents.filter((d) => getPolicyStatus(d) === "Archived").length;
    const departmentsCovered = new Set(
      documents.map((d) => d.department).filter(Boolean)
    ).size;
    return {
      total,
      published,
      drafts,
      archived,
      departmentsCovered: departmentsCovered || (total > 0 ? departmentsCovered : 6),
    };
  }, [documents]);

  if (routePolicyId) {
    if (routePolicyLoading) {
      return (
        <div className="pol-page-container">
          <div className="pol-not-found-page">
            <div className="pol-empty">
              <span className="pol-empty-ico"><PiFilePdfDuotone /></span>
              <p className="pol-empty-title">Loading policy...</p>
            </div>
          </div>
        </div>
      );
    }
    if (routePolicyError || !routePolicy) {
      return (
        <div className="pol-page-container">
          <div className="pol-not-found-page">
            <div className="pol-not-found-card">
              <div className="pol-not-found-icon"><PiFilePdfDuotone size={48} /></div>
              <h2>Policy not found</h2>
              <p>The requested policy could not be found.</p>
              <button type="button" className="pol-btn pol-btn-primary" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} /> Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="pol-page-container">
        <div className="pol-main-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <button type="button" className="pol-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Go Back
            </button>
            <div style={{ display: "flex", gap: "8px" }}>
              <span className="pol-card-badge purple">{getPolicyCategory(routePolicy)}</span>
              <span className="pol-card-badge green">{getPolicyStatus(routePolicy)}</span>
            </div>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px" }}>
            {getPolicyName(routePolicy)}
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 20px" }}>
            {routePolicy.description || "Company policy documentation."}
          </p>
          {getPolicyFileUrl(routePolicy) ? (
            <div style={{ width: "100%", height: "650px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <iframe
                src={`${getPolicyFileUrl(routePolicy)}#navpanes=0&scrollbar=0&toolbar=1&view=FitH`}
                title={getPolicyName(routePolicy)}
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            </div>
          ) : (
            <div className="pol-not-found-modal">
              <div className="pol-not-found-icon"><PiFilePdfDuotone size={48} /></div>
              <h3>Policy not found</h3>
              <p>The requested policy could not be found.</p>
              <button type="button" className="pol-btn pol-btn-primary" onClick={() => navigate(-1)}>
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const pageBody = (
    <>
      {/* ── TOP ACTION BAR ── */}
      <section className="pol-top-action-bar">
        <div className="pol-header-copy pol-desktop-only">
          <div className="pol-header-title-row">
            <h1 className="pol-title">Company Policies</h1>
          </div>
          <p className="pol-subtitle">Access and manage company policies, guidelines, and important documents.</p>
        </div>

        {isAdmin && (
          <div className="pol-header-controls pol-action-controls">
            <button
              type="button"
              className="pol-btn pol-btn-export"
              onClick={handleExport}
              disabled={filteredDocuments.length === 0}
            >
              <PiExportBold /> <span>Export</span>
            </button>
            <button
              type="button"
              className="pol-btn pol-btn-primary"
              onClick={openAddModal}
            >
              <PiPlusBold /> <span>Add Policy</span>
            </button>
          </div>
        )}
      </section>

      {/* ── 4 KPI SUMMARY CARDS ── */}
      <section className="pol-summary-grid">
        {/* Card 1: Total Policies */}
        <div className="pol-stat-card">
          <div className="pol-stat-head">
            <div className="pol-stat-head-left">
              <div className="pol-stat-icon-badge purple">
                <PiFilePdfDuotone size={17} />
              </div>
              <div className="pol-stat-info-stack">
                <span className="pol-stat-label">Total Policies</span>
                <span className="pol-stat-pill purple">Full Handbook</span>
              </div>
            </div>
          </div>
          <div className="pol-stat-val-wrap">
            <h2 className="pol-stat-val">{stats.total}</h2>
            <span className="pol-stat-unit">Documents</span>
          </div>
          <div className="pol-stat-footer">
            <span><strong>{stats.published}</strong> Published</span>
            <span className="pol-sub-divider">•</span>
            <span><strong>{stats.drafts}</strong> Draft</span>
          </div>
        </div>

        {/* Card 2: Published */}
        <div className="pol-stat-card">
          <div className="pol-stat-head">
            <div className="pol-stat-head-left">
              <div className="pol-stat-icon-badge teal">
                <PiCheckCircleBold size={17} />
              </div>
              <div className="pol-stat-info-stack">
                <span className="pol-stat-label">Published</span>
                <span className="pol-stat-pill teal">Active</span>
              </div>
            </div>
          </div>
          <div className="pol-stat-val-wrap">
            <h2 className="pol-stat-val">{stats.published}</h2>
            <span className="pol-stat-unit">Live</span>
          </div>
          <div className="pol-stat-footer">
            <span><strong>Active & visible</strong> to team members</span>
          </div>
        </div>

        {/* Card 3: Draft / Review */}
        <div className="pol-stat-card">
          <div className="pol-stat-head">
            <div className="pol-stat-head-left">
              <div className="pol-stat-icon-badge amber">
                <PiCalendarBlankDuotone size={17} />
              </div>
              <div className="pol-stat-info-stack">
                <span className="pol-stat-label">Draft / Review</span>
                <span className="pol-stat-pill amber">In Review</span>
              </div>
            </div>
          </div>
          <div className="pol-stat-val-wrap">
            <h2 className="pol-stat-val">{stats.drafts}</h2>
            <span className="pol-stat-unit">Pending</span>
          </div>
          <div className="pol-stat-footer">
            <span><strong>Unpublished</strong> revision drafts</span>
          </div>
        </div>

        {/* Card 4: Coverage */}
        <div className="pol-stat-card">
          <div className="pol-stat-head">
            <div className="pol-stat-head-left">
              <div className="pol-stat-icon-badge blue">
                <PiFolderOpenDuotone size={17} />
              </div>
              <div className="pol-stat-info-stack">
                <span className="pol-stat-label">Coverage</span>
                <span className="pol-stat-pill blue">All Teams</span>
              </div>
            </div>
          </div>
          <div className="pol-stat-val-wrap">
            <h2 className="pol-stat-val">{stats.departmentsCovered}</h2>
            <span className="pol-stat-unit">Divisions</span>
          </div>
          <div className="pol-stat-footer">
            <span><strong>Organization-wide</strong> compliance</span>
          </div>
        </div>
      </section>

      {/* ── MAIN CARD: TOOLBAR + CONTENT ── */}
      <section className="pol-main-card">
        <div className="pol-toolbar-wrap">
          <div className="pol-toolbar-left">
            <h2 className="pol-section-title">All Policies</h2>
            <span className="pol-count-badge">
              {documents.length} {documents.length === 1 ? "document" : "documents"} · {filteredDocuments.length} shown
            </span>
          </div>

          <div className="pol-toolbar-right">
            <div className="pol-search-box">
              <PiMagnifyingGlassBold className="pol-search-icon" size={17} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search policy name, description..."
                className="pol-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="pol-search-clear"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  <PiXBold size={13} />
                </button>
              )}
            </div>

            <Dropdown
              id="pol-category-filter"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: "All Category", label: "All categories" },
                ...POLICY_CATEGORIES,
              ]}
            />

            <Dropdown
              id="pol-status-filter"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "All Status", label: "All status" },
                ...POLICY_STATUSES,
              ]}
            />
          </div>
        </div>

        {/* ── STATUS FILTER PILLS (Screen 8) ── */}
        <div className="pol-filter-tabs">
          <button
            type="button"
            className={`pol-filter-tab ${statusFilter === "All Status" ? "is-active" : ""}`}
            onClick={() => setStatusFilter("All Status")}
          >
            All ({stats.total})
          </button>
          <button
            type="button"
            className={`pol-filter-tab ${statusFilter === "Published" ? "is-active" : ""}`}
            onClick={() => setStatusFilter("Published")}
          >
            Published ({stats.published})
          </button>
          <button
            type="button"
            className={`pol-filter-tab ${statusFilter === "Draft" ? "is-active" : ""}`}
            onClick={() => setStatusFilter("Draft")}
          >
            Draft ({stats.drafts})
          </button>
          {stats.archived > 0 && (
            <button
              type="button"
              className={`pol-filter-tab ${statusFilter === "Archived" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("Archived")}
            >
              Archived ({stats.archived})
            </button>
          )}
        </div>

        <div className="pol-main-content-area">
          {loading ? (
            <div className="pol-grid">
              {[0, 1, 2, 3].map((i) => <div className="pol-card pol-skeleton" key={i} />)}
            </div>
          ) : documents.length === 0 ? (
            <div className="pol-empty">
              <span className="pol-empty-ico"><PiFolderOpenDuotone /></span>
              <p className="pol-empty-title">No policies yet</p>
              <p className="pol-empty-body">
                {isAdmin
                  ? "Upload your first policy document and it will appear here for everyone."
                  : "Policy documents will appear here once HR uploads them."}
              </p>
              {isAdmin && (
                <button type="button" className="pol-btn pol-btn-primary" onClick={() => setShowModal(true)}>
                  <PiPlusBold /> Add policy
                </button>
              )}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="pol-empty">
              <span className="pol-empty-ico"><PiMagnifyingGlassBold /></span>
              <p className="pol-empty-title">No policies found</p>
              <p className="pol-empty-body">There are no policies matching your current search or filter.</p>
              {(searchQuery || statusFilter !== "All Status" || categoryFilter !== "All Category") && (
                <button
                  type="button"
                  className="pol-btn pol-btn-clear-filter"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("All Status");
                    setCategoryFilter("All Category");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="pol-grid">
              {filteredDocuments.map((doc, idx) => {
                const toneColors = ["orange", "blue", "purple", "teal"];
                const cardTone = toneColors[idx % toneColors.length];
                return (
                  <article
                    key={doc.id}
                    className={`pol-card pol-card-${cardTone}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenDoc(doc)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenDoc(doc);
                      }
                    }}
                  >
                    {isAdmin && (
                      <div className="pol-card-actions">
                        <button type="button" className="pol-icon-btn" onClick={(e) => openEditModal(e, doc)} title="Edit policy">
                          <PiPencilSimpleBold />
                        </button>
                        <button type="button" className="pol-icon-btn" onClick={(e) => archivePolicy(e, doc)} title="Archive policy">
                          <PiArchiveBold />
                        </button>
                        <button type="button" className="pol-icon-btn pol-icon-danger" onClick={(e) => confirmDelete(e, doc)} title="Delete policy">
                          <PiTrashDuotone />
                        </button>
                      </div>
                    )}

                    <span className={`pol-file-ico ${cardTone}`}><PiFilePdfDuotone /></span>

                    <div className="pol-card-main-info">
                      <h3 className="pol-name" title={getPolicyName(doc)}>{getPolicyName(doc)}</h3>

                      <div className="pol-meta-row">
                        <span className="pol-dept">{doc.department || "All Department"}</span>
                        <span className={`pol-status pol-status-${getPolicyStatus(doc).toLowerCase()}`}>
                          {getPolicyStatus(doc)}
                        </span>
                      </div>

                      <div className="pol-mobile-meta">
                        <span className={`pol-status pol-status-${getPolicyStatus(doc).toLowerCase()}`}>
                          {getPolicyStatus(doc)}
                        </span>
                        <span className="pol-mobile-date">
                          <PiCalendarBlankDuotone /> Updated {formatPolicyDate(getPolicyUpdatedDate(doc))}
                        </span>
                      </div>
                    </div>

                    <p className="pol-desc" title={doc.description}>
                      {doc.description || "No description provided"}
                    </p>

                    <div className="pol-card-details">
                      <span>Category <b>{getPolicyCategory(doc)}</b></span>
                      <span>Version <b>{getPolicyVersion(doc)}</b></span>
                    </div>

                    <div className="pol-foot">
                      <span><PiCalendarBlankDuotone /> Published {getPolicyPublishDate(doc)}</span>
                      <span><PiCalendarBlankDuotone /> Updated {getPolicyUpdatedDate(doc)}</span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        className={`pol-publish-btn ${getPolicyStatus(doc) === "Published" ? "is-published" : ""}`}
                        onClick={(e) => togglePublish(e, doc)}
                      >
                        {getPolicyStatus(doc) === "Published" ? <PiEyeSlashBold /> : <PiCheckCircleBold />}
                        {getPolicyStatus(doc) === "Published" ? "Unpublish" : "Publish"}
                      </button>
                    )}

                    <span className="pol-mobile-chevron" aria-hidden="true">
                      <PiCaretRightBold />
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------- PDF viewer ---------- */}
      {selectedDoc && (
        <div className="pol-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="pol-modal is-large" onClick={(e) => e.stopPropagation()}>
            <div className="pol-modal-head">
              <h2>{selectedDoc.title}</h2>
              <button type="button" className="pol-close" onClick={() => setSelectedDoc(null)} aria-label="Close">
                <PiXBold />
              </button>
            </div>
            <div className="pol-modal-body is-flush">
              {docNotFound || !selectedDoc.fileURL ? (
                <div className="pol-doc-content-view">
                  <div className="pol-doc-content-header">
                    <div className="pol-doc-badge-group">
                      <span className={`pol-badge pol-badge-${getPolicyStatus(selectedDoc.doc || {}).toLowerCase()}`}>
                        {getPolicyStatus(selectedDoc.doc || {})}
                      </span>
                      <span className="pol-cat-pill">
                        {getPolicyCategory(selectedDoc.doc || {})}
                      </span>
                      <span className="pol-ver-pill">
                        v{getPolicyVersion(selectedDoc.doc || {})}
                      </span>
                    </div>
                    <span className="pol-doc-date-text">
                      Effective Date: {getPolicyPublishDate(selectedDoc.doc || {})}
                    </span>
                  </div>

                  <div className="pol-doc-content-body">
                    <h3>{getPolicyName(selectedDoc.doc || {})}</h3>
                    <p className="pol-doc-lead-desc">
                      {selectedDoc.doc?.description || "This policy establishes standard operational and behavioral standards across all departments to ensure compliance, integrity, and operational consistency."}
                    </p>

                    <div className="pol-doc-sections">
                      <div className="pol-doc-section-card">
                        <h4>1. Purpose & Objectives</h4>
                        <p>
                          To define explicit expectations and standard procedures for employees across {selectedDoc.doc?.department || "all organizational departments"}, ensuring alignment with professional standards and corporate governance.
                        </p>
                      </div>

                      <div className="pol-doc-section-card">
                        <h4>2. Scope & Applicability</h4>
                        <p>
                          This policy applies to all full-time employees, contractors, interns, and leadership teams across all company locations and remote work setups.
                        </p>
                      </div>

                      <div className="pol-doc-section-card">
                        <h4>3. Key Responsibilities & Compliance</h4>
                        <p>
                          Employees are expected to adhere strictly to the guidelines set forth. Any deviation or failure to adhere must be reported to the People Operations / HR team or Department Head promptly.
                        </p>
                      </div>

                      <div className="pol-doc-section-card">
                        <h4>4. Review & Audits</h4>
                        <p>
                          This policy is maintained by Human Resources & Executive Operations and undergoes periodic reviews. Last reviewed on {getPolicyUpdatedDate(selectedDoc.doc || {})}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pol-doc-content-footer">
                    <button type="button" className="pol-btn pol-btn-primary" onClick={() => setSelectedDoc(null)}>
                      Close Reader
                    </button>
                  </div>
                </div>
              ) : (
                <iframe
                  src={`${selectedDoc.fileURL}#navpanes=0&scrollbar=0&toolbar=1&view=FitH`}
                  title={selectedDoc.title}
                  onError={() => setDocNotFound(true)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- delete confirm ---------- */}
      {policyToDelete && (
        <div className="pol-overlay" onClick={() => setPolicyToDelete(null)}>
          <div className="pol-modal is-small" onClick={(e) => e.stopPropagation()}>
            <div className="pol-confirm">
              <span className="pol-confirm-ico"><PiWarningCircleDuotone /></span>
              <h2>Delete this policy?</h2>
              <p>
                <strong>{policyToDelete.name}</strong> will be removed for everyone.
                This can't be undone.
              </p>
              <div className="pol-confirm-actions">
                <button type="button" className="pol-btn" onClick={() => setPolicyToDelete(null)}>Cancel</button>
                <button type="button" className="pol-btn pol-btn-danger" onClick={executeDelete}>Delete policy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- add / edit policy modal ---------- */}
      {showModal && (
        <div className="pol-overlay" onClick={closeAddModal}>
          <div className="pol-sheet" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="pol-sheet-close" onClick={closeAddModal} aria-label="Close">
              <PiXBold />
            </button>

            <div className="pol-mobile-sheet-nav">
              <button type="button" className="pol-mobile-sheet-back" onClick={closeAddModal}>
                <ArrowLeft size={18} />
                <span>Back to Company Policies</span>
              </button>
            </div>

            <h2 className="pol-sheet-title">{editingPolicy ? "Edit policy" : "Add a policy"}</h2>
            <p className="pol-sheet-sub">
              {editingPolicy
                ? "Update the policy details, version, dates and document."
                : "Upload and publish a company policy for the appropriate employees."}
            </p>

            <div className="pol-top-fields-row">
              <div className="pol-field pol-title-field">
                <label htmlFor="pol-title">Policy Title <span className="pol-req">*</span></label>
                <input
                  id="pol-title"
                  type="text"
                  value={newPolicy.title}
                  onChange={(e) => { setNewPolicy({ ...newPolicy, title: e.target.value }); setFormError(""); }}
                  placeholder="Enter policy title"
                  autoFocus
                />
              </div>

              <div className={`pol-field pol-date-field ${openDatePicker === "publish" ? "has-open-picker" : ""}`}>
                <label htmlFor="pol-publish-date">Publish Date <span className="pol-req">*</span></label>
                <PolicyDatePicker
                  id="pol-publish-date"
                  value={newPolicy.publishDate}
                  onChange={(val) => setNewPolicy((prev) => ({ ...prev, publishDate: val }))}
                  isOpen={openDatePicker === "publish"}
                  onToggle={() => setOpenDatePicker((p) => (p === "publish" ? null : "publish"))}
                  onClose={() => setOpenDatePicker(null)}
                  rightIconType="calendar"
                  placeholder="dd-mm-yyyy"
                />
              </div>

              <div className={`pol-field pol-date-field ${openDatePicker === "updated" ? "has-open-picker" : ""}`}>
                <label htmlFor="pol-updated-date">Last Updated Date</label>
                <PolicyDatePicker
                  id="pol-updated-date"
                  value={newPolicy.updatedDate}
                  onChange={(val) => setNewPolicy((prev) => ({ ...prev, updatedDate: val }))}
                  isOpen={openDatePicker === "updated"}
                  onToggle={() => setOpenDatePicker((p) => (p === "updated" ? null : "updated"))}
                  onClose={() => setOpenDatePicker(null)}
                  rightIconType="chevron"
                  alignRight={true}
                  placeholder="dd-mm-yyyy"
                />
              </div>
            </div>

            <div className="pol-row">
              <div className="pol-field">
                <label htmlFor="pol-category">Category <span className="pol-req">*</span></label>
                <Dropdown
                  id="pol-category"
                  value={newPolicy.category}
                  onChange={(v) => setNewPolicy({ ...newPolicy, category: v })}
                  options={POLICY_CATEGORIES}
                  placeholder="Select category"
                />
              </div>

              <div className="pol-field">
                <label htmlFor="pol-dept">Department</label>
                <Dropdown
                  id="pol-dept"
                  value={newPolicy.department}
                  onChange={(v) => setNewPolicy({ ...newPolicy, department: v })}
                  options={DEPARTMENTS}
                />
              </div>
            </div>

            <div className="pol-field">
              <label htmlFor="pol-version">Version Number <span className="pol-req">*</span></label>
              <input
                id="pol-version"
                type="text"
                value={newPolicy.version}
                onChange={(e) => setNewPolicy({ ...newPolicy, version: e.target.value })}
                placeholder="e.g. 1.0"
              />
              <span className="pol-field-hint">e.g. 1.0, 1.1, 2.0</span>
            </div>

            <div className="pol-field">
              <label htmlFor="pol-desc">Description <span className="pol-req">*</span></label>
              <textarea
                id="pol-desc"
                value={newPolicy.description}
                onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                placeholder="Write policy details..."
                rows={4}
              />
            </div>

            <div className="pol-field">
              <label>Attachment <span className="pol-req">{editingPolicy ? "" : "*"}</span></label>

              {newPolicy.file ? (
                <div className="pol-file">
                  <span className="pol-file-badge"><PiFilePdfDuotone /></span>
                  <span className="pol-file-text">
                    <strong>{newPolicy.fileName}</strong>
                    <small>{(newPolicy.file.size / 1024).toFixed(0)} KB</small>
                  </span>
                  <button
                    type="button"
                    className="pol-file-clear"
                    onClick={() => setNewPolicy((prev) => ({ ...prev, file: null, fileName: "" }))}
                    aria-label="Remove file"
                  >
                    <PiXBold />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`pol-drop ${dragging ? "is-dragging" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <PiCloudArrowUpDuotone size={28} />
                  <span>{dragging ? <strong>Drop to upload</strong> : <><strong>Click to upload</strong> or drag and drop</>}</span>
                  <small>PDF, DOC, DOCX (Max 10MB)</small>
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                hidden
              />
              {editingPolicy && <span className="pol-hint">Leave blank to keep the existing document.</span>}
            </div>

            <div className="pol-policy-note pol-desktop-only">
              <div>
                <span className="pol-policy-note-title">Publication Status</span>
                <span>Publish now or keep it as a draft for later.</span>
              </div>
              <Dropdown
                id="pol-status"
                value={newPolicy.status}
                onChange={(v) => setNewPolicy({ ...newPolicy, status: v })}
                options={POLICY_STATUSES}
              />
            </div>

            <div className="pol-mobile-toggle-row">
              <div className="pol-mobile-toggle-copy">
                <span className="pol-mobile-toggle-title">Publish Policy</span>
                <span className="pol-mobile-toggle-sub">Make this policy visible to all employees</span>
              </div>
              <label className="pol-switch">
                <input
                  type="checkbox"
                  checked={newPolicy.status === "Published"}
                  onChange={(e) =>
                    setNewPolicy((prev) => ({
                      ...prev,
                      status: e.target.checked ? "Published" : "Draft",
                    }))
                  }
                />
                <span className="pol-slider"></span>
              </label>
            </div>

            {formError && (
              <p className="pol-error"><PiWarningCircleDuotone /> {formError}</p>
            )}

            <div className="pol-sheet-actions">
              <button type="button" className="pol-btn pol-desktop-only" onClick={closeAddModal}>Cancel</button>
              <button type="button" className="pol-btn pol-btn-primary pol-submit-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : (editingPolicy ? "Save Policy" : "Add Policy")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const isEmbeddedInLayout = Boolean(
    isInsideShell ||
    location.pathname.startsWith("/dashboard_emp") ||
    location.pathname.startsWith("/manager") ||
    location.pathname.startsWith("/dashboard/")
  );

  if (isEmbeddedInLayout) {
    return <div className="pol-page-container">{pageBody}</div>;
  }

  return (
    <div className="pol-shell">
      <SidebarComponent expanded={expanded} setExpanded={setExpanded} />
      <div className="pol-main" style={{ marginLeft: expanded ? 260 : 76 }}>
        {pageBody}
      </div>
    </div>
  );
}


/* --------------------------------------------------------------------------
   Dropdown
   A native <select> draws its open list with Windows, which is why it looked
   foreign - blue highlight, square corners, system font. This is a real
   listbox so it can be themed.

   Keyboard: Up/Down move, Enter or Space choose, Escape close, Home/End jump.
   -------------------------------------------------------------------------- */
function Dropdown({
  id,
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  fixedUp = false,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [menuRect, setMenuRect] = useState(null);

  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const updateMenuPosition = () => {
    if (!fixedUp || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    // Status has exactly three options. Keep a predictable menu size
    // and position it immediately above the trigger.
    const menuHeight = Math.min(options.length * 38 + 10, 190);
    const gap = 7;

    let top = rect.top - menuHeight - gap;

    // Keep the menu inside the viewport.
    if (top < 8) {
      top = Math.min(
        rect.bottom + gap,
        window.innerHeight - menuHeight - 8
      );
    }

    setMenuRect({
      left: rect.left,
      top,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      const insideTrigger = rootRef.current?.contains(e.target);
      const insideMenu = menuRef.current?.contains(e.target);

      // IMPORTANT: the fixed status menu is portaled to document.body,
      // so it is outside rootRef. Do not close when clicking the menu.
      if (!insideTrigger && !insideMenu) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);

    if (fixedUp) {
      window.addEventListener("resize", updateMenuPosition);
      window.addEventListener("scroll", updateMenuPosition, true);
      requestAnimationFrame(updateMenuPosition);
    }

    return () => {
      document.removeEventListener("mousedown", onDown);

      if (fixedUp) {
        window.removeEventListener("resize", updateMenuPosition);
        window.removeEventListener("scroll", updateMenuPosition, true);
      }
    };
  }, [open, fixedUp, options.length]);

  const choose = (index) => {
    const option = options[index];
    if (!option) return;

    onChange?.(option.value);
    setOpen(false);
  };

  const openDropdown = () => {
    setActive(selectedIndex >= 0 ? selectedIndex : 0);

    setOpen((current) => {
      const next = !current;

      if (next && fixedUp) {
        requestAnimationFrame(updateMenuPosition);
      }

      return next;
    });
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
        setActive(selectedIndex >= 0 ? selectedIndex : 0);
        if (fixedUp) requestAnimationFrame(updateMenuPosition);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const menu = (
    <ul
      ref={fixedUp ? menuRef : undefined}
      className={`pol-dd-list ${fixedUp ? "pol-dd-list-fixed-up" : ""}`}
      role="listbox"
      tabIndex={-1}
      style={
        fixedUp && menuRect
          ? {
            position: "fixed",
            left: `${menuRect.left}px`,
            top: `${menuRect.top}px`,
            width: `${menuRect.width}px`,
            margin: 0,
            zIndex: 100000,
          }
          : undefined
      }
    >
      {options.map((option, i) => (
        <li
          key={option.value}
          role="option"
          aria-selected={option.value === value}
          className={[
            "pol-dd-option",
            i === active ? "is-active" : "",
            option.value === value ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onMouseEnter={() => setActive(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => choose(i)}
        >
          <span>{option.label}</span>
          {option.value === value && <PiCheckBold className="pol-dd-tick" />}
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={rootRef} className={`pol-dd ${open ? "is-open" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className="pol-dd-trigger"
        onClick={openDropdown}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "" : "is-placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <PiCaretDownBold className="pol-dd-caret" />
      </button>

      {open &&
        (fixedUp && menuRect ? createPortal(menu, document.body) : menu)}
    </div>
  );
}
