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
  PiBellBold,
} from "react-icons/pi";

import "./CompanyPolicies.css";
import PolicyDatePicker from "./PolicyDatePicker";

import SidebarAdmin from "../../components/sidebar/Sidebar";
import SidebarTL from "../../components/sidebar/sidebar_tl";
import SidebarEmp from "../../components/sidebar/Sidebar_emp";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import { authHeaders, getApiBaseUrl, getApiUrl } from "../../services/apiClient";

const API = getApiBaseUrl();

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
  const [routePolicyDocFallback, setRoutePolicyDocFallback] = useState(false);
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
    setDocNotFound(false);

    if (fileUrl) {
      // Proactively test if the document is accessible without displaying raw json
      fetch(fileUrl, { method: "HEAD" })
        .then((res) => {
          if (!res.ok) setDocNotFound(true);
          else setDocNotFound(false);
        })
        .catch(() => {
          // If HEAD request has CORS/network issues, do not prematurely fail:
          // allow iframe to attempt loading via standard GET
          setDocNotFound(false);
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
      const { data } = await axios.get(`${API}/policies/`, { headers: authHeaders() });
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching policies:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPolicies(); }, []);

  useEffect(() => {
    if (!routePolicyId) return;
    setRoutePolicyLoading(true);
    setRoutePolicyError(false);
    axios.get(`${API}/policies/${routePolicyId}`, { headers: authHeaders() })
      .then((res) => {
        if (res.data) {
          setRoutePolicy(res.data);
        } else {
          setRoutePolicyError(true);
        }
      })
      .catch((err) => {
        console.error('Policy fetch error:', err);
        setRoutePolicyError(true);
      })
      .finally(() => {
        setRoutePolicyLoading(false);
      });
  }, [routePolicyId]);

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
      const res = await axios.delete(`${API}/policies/${policyToDelete.id}`, { headers: authHeaders() });
      if (res.status === 200 || res.status === 204) {
        setDocuments((items) => items.filter((x) => x.id !== policyToDelete.id));
      }
    } catch (error) {
      console.error("Error deleting policy:", error);
    } finally {
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
      const res = editingPolicy
        ? await axios.put(`${API}/policies/${editingPolicy.id}`, body, { headers: authHeaders() })
        : await axios.post(`${API}/policies/`, body, { headers: authHeaders() });

      if (res.status === 200 || res.status === 201) {
        closeAddModal();
        await fetchPolicies();
      }
    } catch (error) {
      console.error("Error saving policy:", error);
      setFormError(
        editingPolicy
          ? "Update failed. Make sure the backend supports policy editing."
          : "Upload failed. Check the file and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const updatePolicyStatus = async (doc, nextStatus) => {
    try {
      const res = await axios.patch(`${API}/policies/${doc.id}`, {
        status: nextStatus,
        published: nextStatus === "Published",
      }, { headers: authHeaders() });
      if (res.status === 200) {
        setDocuments((items) =>
          items.map((item) =>
            item.id === doc.id
              ? { ...item, status: nextStatus, published: nextStatus === "Published" }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Error updating policy status:", error);
    }
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
          {getPolicyFileUrl(routePolicy) && !routePolicyDocFallback ? (
            <div style={{ width: "100%", height: "650px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <iframe
                src={`${getPolicyFileUrl(routePolicy)}#navpanes=0&scrollbar=0&toolbar=1&view=FitH`}
                title={getPolicyName(routePolicy)}
                style={{ width: "100%", height: "100%", border: 0 }}
                onError={() => setRoutePolicyDocFallback(true)}
              />
            </div>
          ) : (
            <PolicyDocumentReader
              doc={routePolicy}
              title={getPolicyName(routePolicy)}
              getPolicyCategory={getPolicyCategory}
              getPolicyStatus={getPolicyStatus}
              getPolicyVersion={getPolicyVersion}
              getPolicyPublishDate={getPolicyPublishDate}
              getPolicyUpdatedDate={getPolicyUpdatedDate}
              onClose={() => navigate(-1)}
            />
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

        <div className="pol-header-controls pol-action-controls">
          <button
            type="button"
            className="pol-btn pol-btn-export"
            onClick={() => {
              const p = location.pathname;
              if (p.startsWith("/manager")) navigate("/manager/policy-updates");
              else if (p.startsWith("/dashboard_emp")) navigate("/dashboard_emp/policy-updates");
              else navigate("/dashboard/policy-updates");
            }}
            title="View Policy Updates & Announcements"
          >
            <PiBellBold /> <span>Policy Updates</span>
          </button>
          {isAdmin && (
            <>
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
            </>
          )}
        </div>
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="pol-btn"
                  style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={() => window.print()}
                  title="Print policy document"
                >
                  <PiExportBold size={14} /> Print
                </button>
                <button type="button" className="pol-close" onClick={() => setSelectedDoc(null)} aria-label="Close">
                  <PiXBold />
                </button>
              </div>
            </div>
            <div className="pol-modal-body is-flush">
              {docNotFound || !selectedDoc.fileURL ? (
                <PolicyDocumentReader
                  doc={selectedDoc.doc}
                  title={selectedDoc.title}
                  getPolicyCategory={getPolicyCategory}
                  getPolicyStatus={getPolicyStatus}
                  getPolicyVersion={getPolicyVersion}
                  getPolicyPublishDate={getPolicyPublishDate}
                  getPolicyUpdatedDate={getPolicyUpdatedDate}
                  onClose={() => setSelectedDoc(null)}
                />
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

/* ═══════════════════════════════════════════════════════════════
   POLICY DOCUMENT READER (IN-APP OFFICIAL DOCUMENT PREVIEW)
   ═══════════════════════════════════════════════════════════════ */
function PolicyDocumentReader({
  doc,
  title,
  getPolicyCategory,
  getPolicyStatus,
  getPolicyVersion,
  getPolicyPublishDate,
  getPolicyUpdatedDate,
  onClose,
}) {
  const category = getPolicyCategory ? getPolicyCategory(doc) : doc?.category || "General";
  const status = getPolicyStatus ? getPolicyStatus(doc) : doc?.status || "Published";
  const version = getPolicyVersion ? getPolicyVersion(doc) : doc?.version_number || "1.0";
  const publishDate = getPolicyPublishDate ? getPolicyPublishDate(doc) : doc?.publish_date || "—";
  const updatedDate = getPolicyUpdatedDate ? getPolicyUpdatedDate(doc) : doc?.updated_date || "—";
  const department = doc?.department || "All Department";
  const description = doc?.description || "Official company operational and workplace guidelines.";

  return (
    <div className="pol-doc-reader">
      {/* Official Header */}
      <div className="pol-doc-reader-head">
        <div className="pol-doc-org-badge">LA ESFERA INFOTECH • OFFICIAL HR POLICY</div>
        <h1 className="pol-doc-title">{title}</h1>
        <p className="pol-doc-desc">{description}</p>

        <div className="pol-doc-meta-grid">
          <div className="pol-doc-meta-item">
            <span className="label">Applicable Department</span>
            <span className="value">{department}</span>
          </div>
          <div className="pol-doc-meta-item">
            <span className="label">Category</span>
            <span className="value">{category}</span>
          </div>
          <div className="pol-doc-meta-item">
            <span className="label">Document Version</span>
            <span className="value">v{version}</span>
          </div>
          <div className="pol-doc-meta-item">
            <span className="label">Enforcement Status</span>
            <span className="value status-pill">{status}</span>
          </div>
          <div className="pol-doc-meta-item">
            <span className="label">Published On</span>
            <span className="value">{publishDate}</span>
          </div>
          <div className="pol-doc-meta-item">
            <span className="label">Last Reviewed</span>
            <span className="value">{updatedDate}</span>
          </div>
        </div>
      </div>

      {/* Structured Policy Sections */}
      <div className="pol-doc-content-body">
        <section className="pol-doc-section">
          <div className="pol-doc-sec-num">01</div>
          <div className="pol-doc-sec-text">
            <h3>Purpose & Scope of Policy</h3>
            <p>
              This document establishes the official operational standard, behavioral expectations,
              and compliance guidelines applicable to all team members, managers, and contractors under {department}.
              All personnel are required to review, understand, and abide by these provisions throughout their tenure.
            </p>
          </div>
        </section>

        <section className="pol-doc-section">
          <div className="pol-doc-sec-num">02</div>
          <div className="pol-doc-sec-text">
            <h3>Professional Standards & Workplace Conduct</h3>
            <p>
              La Esfera Infotech is committed to maintaining a safe, inclusive, transparent, and high-integrity work environment.
              Key commitments expected of every employee include:
            </p>
            <ul>
              <li><strong>Equal Opportunity & Respect:</strong> Zero tolerance for discrimination, workplace bullying, or harassment.</li>
              <li><strong>Confidentiality & Data Protection:</strong> Absolute discretion regarding internal codebase, company data, and client communications.</li>
              <li><strong>Integrity in Operations:</strong> Honest reporting of hours, attendance, and adherence to company policies.</li>
            </ul>
          </div>
        </section>

        <section className="pol-doc-section">
          <div className="pol-doc-sec-num">03</div>
          <div className="pol-doc-sec-text">
            <h3>Attendance, Remote Work & Device Security</h3>
            <p>
              Team members must adhere to regular attendance hours, authenticate through the official Quickchex portal,
              and maintain workstation security protocols (MFA, encrypted credentials, secure VPN connection where applicable).
            </p>
          </div>
        </section>

        <section className="pol-doc-section">
          <div className="pol-doc-sec-num">04</div>
          <div className="pol-doc-sec-text">
            <h3>Compliance, Reporting & Governance</h3>
            <p>
              Any suspected violations, conflicts of interest, or grievances must be reported to HR Operations or Management.
              The company ensures strict non-retaliation protections for all good-faith disclosures.
            </p>
          </div>
        </section>
      </div>

      {/* Footer Banner */}
      <div className="pol-doc-footer-banner">
        <div className="pol-doc-footer-info">
          <span>Official Company Document</span> • <span>La Esfera Infotech Pvt. Ltd.</span> • <span>Managed via HRMS</span>
        </div>
        <button type="button" className="pol-btn pol-btn-primary" onClick={onClose}>
          Acknowledge & Close
        </button>
      </div>
    </div>
  );
}

