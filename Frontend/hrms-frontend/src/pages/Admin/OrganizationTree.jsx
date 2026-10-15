import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Users,
  Building2,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  ShieldCheck,
  ExternalLink,
  X,
  Layers,
  Sparkles,
  Award,
  CheckCircle2,
  FolderKanban,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Edit3,
  Building,
  Home,
  Clock,
  FileText,
  Settings,
  Shield,
  Check,
  Megaphone,
  Coins,
  MoreVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loadUnifiedEmployees, updateEmployeeRoleInStore } from "../../utils/employeeStore";
import { getApiBaseUrl } from "../../services/apiClient";
import "./OrganizationTree.css";

/* =========================================================
   DEFAULT / FALLBACK STATIC TREE
   (Preserved for export and desktop fallback)
   ========================================================= */
export const ORG_DATA = {
  id: "ADM001",
  name: "Aaquib Khan",
  role: "Chief Executive Officer & MD",
  department: "Executive",
  email: "aaquib.k@laesfera.co",
  phone: "+91 99999 99999",
  location: "Mumbai, IN",
  type: "Full-time",
  joined: "2024-01-15",
  about: "Co-founder & CEO driving enterprise HRMS vision, organizational operations, and global strategy.",
  status: "Active",
  avatarColor: "#7c3aed",
  children: [],
};

const DEFAULT_PERMISSIONS = {
  dashboard: true,
  employee_directory: true,
  attendance: true,
  leave_management: true,
  reports: true,
  settings: true,
};

function getInitials(name) {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* =========================================================
   ORGANIZATION AVATAR COMPONENT
   Clean initials badge (profile photos disabled)
   ========================================================= */
function OrgAvatar({ name, size = 42, className = "" }) {
  const initials = getInitials(name);

  return (
    <div
      className={`org-avatar-fallback ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        fontSize: Math.max(11, Math.round(size * 0.36)),
      }}
      aria-label={name || "Employee"}
    >
      {initials}
    </div>
  );
}

/* =========================================================
   BUILD DYNAMIC ORG TREE HIERARCHY FROM REAL EMPLOYEES
   ========================================================= */
function buildDynamicOrgTree(employees) {
  if (!Array.isArray(employees) || employees.length === 0) {
    return ORG_DATA;
  }

  // 1. Find CEO / Top Executive
  let ceo = employees.find(
    (e) =>
      e.emp_code === "ADM001" ||
      e.id === "ADM001" ||
      (e.designation && e.designation.toLowerCase().includes("ceo")) ||
      (e.role && e.role.toLowerCase() === "ceo")
  );
  if (!ceo) {
    ceo = employees.find((e) => e.role?.toLowerCase() === "admin") || employees[0];
  }

  // 2. Department color palettes
  const deptColors = {
    Engineering: "#7c3aed",
    Design: "#0284c7",
    Marketing: "#ea580c",
    HR: "#059669",
    "Human Resources": "#059669",
    Product: "#9333ea",
    Finance: "#2563eb",
    Operations: "#0891b2",
    Sales: "#d97706",
    General: "#6b7280",
  };

  const deptBgColors = {
    Engineering: "rgba(124, 58, 237, 0.08)",
    Design: "rgba(2, 132, 199, 0.08)",
    Marketing: "rgba(234, 88, 12, 0.08)",
    HR: "rgba(5, 150, 105, 0.08)",
    "Human Resources": "rgba(5, 150, 105, 0.08)",
    Product: "rgba(147, 51, 234, 0.08)",
    Finance: "rgba(37, 99, 235, 0.08)",
    Operations: "rgba(8, 145, 178, 0.08)",
    Sales: "rgba(217, 119, 6, 0.08)",
    General: "rgba(107, 114, 128, 0.08)",
  };

  // 3. Group employees by department (excluding Executive if CEO)
  const deptMap = {};
  employees.forEach((emp) => {
    const dept = (emp.department || "General").trim();
    if (dept.toLowerCase() === "executive" && (emp.emp_code === ceo.emp_code || emp.id === ceo.id)) {
      return;
    }
    if (!deptMap[dept]) {
      deptMap[dept] = [];
    }
    deptMap[dept].push(emp);
  });

  const childrenDepts = Object.entries(deptMap).map(([deptName, members]) => {
    // Determine Department Lead
    const lead =
      members.find(
        (m) =>
          m.role?.toLowerCase() === "manager" ||
          m.role?.toLowerCase() === "admin" ||
          (m.designation && m.designation.toLowerCase().includes("lead")) ||
          (m.designation && m.designation.toLowerCase().includes("manager"))
      ) || members[0];

    const teamMembers = members.filter(
      (m) => m.emp_code !== lead.emp_code && m.id !== lead.id
    );

    const color = deptColors[deptName] || "#7c3aed";
    const bgColor = deptBgColors[deptName] || "rgba(124, 58, 237, 0.08)";

    const leadNode = {
      id: lead.emp_code || lead.id,
      emp_code: lead.emp_code || lead.id,
      name: lead.name,
      role: lead.designation || (lead.role === "manager" ? `${deptName} Manager` : "Department Lead"),
      department: deptName,
      email: lead.email || `${lead.emp_code?.toLowerCase()}@laesfera.co`,
      phone: lead.phone || lead.mobile_no || "+91 99999 99999",
      location: lead.location || lead.branch_location || "Mumbai, IN",
      type: lead.type || "Full-time",
      joined: lead.joined || lead.emp_join_date || "2024-01-15",
      about: lead.about || "",
      status: lead.status || "Active",
      avatarColor: color,
      profile_image: lead.profile_image,
      reportsTo: ceo.name,
      children: teamMembers.map((tm) => ({
        id: tm.emp_code || tm.id,
        emp_code: tm.emp_code || tm.id,
        name: tm.name,
        role: tm.designation || "Team Member",
        department: deptName,
        email: tm.email || `${tm.emp_code?.toLowerCase()}@laesfera.co`,
        phone: tm.phone || tm.mobile_no || "+91 98765 43210",
        location: tm.location || tm.branch_location || "Mumbai, IN",
        type: tm.type || "Full-time",
        joined: tm.joined || tm.emp_join_date || "2024-01-15",
        about: tm.about || "",
        status: tm.status || "Active",
        avatarColor: color,
        profile_image: tm.profile_image,
        reportsTo: lead.name,
      })),
    };

    return {
      id: `dept-${deptName.toLowerCase().replace(/\s+/g, "-")}`,
      isDepartment: true,
      name: deptName,
      count: members.length,
      color,
      bgColor,
      lead: leadNode,
      teamMembers: leadNode.children,
      children: [leadNode],
    };
  });

  return {
    id: ceo.emp_code || ceo.id || "ADM001",
    emp_code: ceo.emp_code || ceo.id || "ADM001",
    name: ceo.name || "Aaquib Khan",
    role: ceo.designation || "Chief Executive Officer & MD",
    department: ceo.department || "Executive",
    email: ceo.email || "aaquib.k@laesfera.co",
    phone: ceo.phone || ceo.mobile_no || "+91 99999 99999",
    location: ceo.location || "Mumbai, IN",
    type: ceo.type || "Full-time",
    joined: ceo.joined || ceo.emp_join_date || "2024-01-15",
    about: ceo.about || "Co-founder & CEO driving enterprise HRMS vision.",
    status: ceo.status || "Active",
    avatarColor: "#7c3aed",
    profile_image: ceo.profile_image,
    children: childrenDepts,
  };
}

export default function OrganizationTree() {
  const navigate = useNavigate();

  // State
  const [rawEmployees, setRawEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedNode, setSelectedNode] = useState(null); // Desktop drawer
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState("tree"); // "tree" | "grid"
  const [collapsedNodes, setCollapsedNodes] = useState({});

  // Mobile navigation states
  const [activeDeptDetails, setActiveDeptDetails] = useState(null); // Screen 2
  const [selectedMember, setSelectedMember] = useState(null); // Screen 3
  const [selectedMemberRole, setSelectedMemberRole] = useState("Employee");
  const [memberPermissions, setMemberPermissions] = useState(DEFAULT_PERMISSIONS);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch real employee records on mount
  const loadData = async () => {
    try {
      setLoading(true);
      const list = await loadUnifiedEmployees();
      setRawEmployees(list || []);
    } catch (err) {
      console.warn("Failed to load employees for Org Tree:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Build dynamic tree data from real backend records
  const dynamicTree = useMemo(() => {
    return buildDynamicOrgTree(rawEmployees);
  }, [rawEmployees]);

  // Flatten all employees for quick search and stats
  const allMembers = useMemo(() => {
    const list = [];
    const seen = new Set();
    function traverse(node) {
      if (!node) return;
      if (!node.isDepartment) {
        const key = (node.emp_code || node.id || node.email || "").toString().trim().toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          list.push(node);
        }
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    }
    traverse(dynamicTree);
    return list;
  }, [dynamicTree]);

  // Department counts
  const departments = useMemo(() => {
    const functionalDepts = dynamicTree.children || [];
    const totalCount = allMembers.filter((m) => m.department !== "Executive").length || allMembers.length;
    return [
      { id: "All", name: "All Departments", count: totalCount },
      ...functionalDepts.map((d) => ({
        id: d.name,
        name: d.name,
        count: d.count,
        color: d.color,
      })),
    ];
  }, [dynamicTree, allMembers]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const functionalDepts = dynamicTree.children || [];
    const totalCount = allMembers.filter((m) => m.department !== "Executive").length || allMembers.length;
    const managersCount = rawEmployees.filter(
      (e) =>
        e.role?.toLowerCase() === "manager" ||
        e.role?.toLowerCase() === "admin"
    ).length || 7;
    const activeMembersCount = rawEmployees.filter((e) => (e.status || "Active").toLowerCase() === "active").length;
    const activePercent = rawEmployees.length > 0 ? Math.round((activeMembersCount / rawEmployees.length) * 100) : 100;

    return {
      headcount: totalCount,
      departments: functionalDepts.length,
      managers: managersCount,
      activeStatus: `${activePercent}%`,
    };
  }, [dynamicTree, allMembers, rawEmployees]);

  // Expand / collapse helpers
  const toggleCollapse = (id, e) => {
    if (e) e.stopPropagation();
    setCollapsedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => setCollapsedNodes({});
  const collapseAll = () => {
    const next = {};
    function traverse(node) {
      if (!node) return;
      if (node.children && node.children.length > 0) {
        next[node.id] = true;
      }
      if (node.children) node.children.forEach(traverse);
    }
    traverse(dynamicTree);
    setCollapsedNodes(next);
  };

  // Mobile accordion expand / collapse state
  const [expandedDepts, setExpandedDepts] = useState({ Engineering: true });
  const [showAllDeptMembers, setShowAllDeptMembers] = useState({});

  const toggleDeptAccordion = (deptKey, e) => {
    if (e) e.stopPropagation();
    setExpandedDepts((prev) => ({
      ...prev,
      [deptKey]: !prev[deptKey],
    }));
  };

  const toggleShowAllMembers = (deptKey, e) => {
    if (e) e.stopPropagation();
    setShowAllDeptMembers((prev) => ({
      ...prev,
      [deptKey]: !prev[deptKey],
    }));
  };

  const handleMobileExpandAll = () => {
    const allExp = {};
    if (dynamicTree && dynamicTree.children) {
      dynamicTree.children.forEach((d) => {
        allExp[d.name] = true;
        allExp[d.id] = true;
      });
    }
    setExpandedDepts(allExp);
    expandAll();
  };

  const handleMobileCollapseAll = () => {
    setExpandedDepts({});
    collapseAll();
  };

  const getDeptIcon = (deptName) => {
    const n = (deptName || "").toLowerCase();
    if (n.includes("engineer") || n.includes("tech") || n.includes("dev")) {
      return <Settings size={15} />;
    }
    if (n.includes("design") || n.includes("ui") || n.includes("ux")) {
      return <Building2 size={15} />;
    }
    if (n.includes("market") || n.includes("sales")) {
      return <Megaphone size={15} />;
    }
    if (n.includes("hr") || n.includes("human")) {
      return <ShieldCheck size={15} />;
    }
    if (n.includes("product")) {
      return <Layers size={15} />;
    }
    if (n.includes("finance") || n.includes("account")) {
      return <Coins size={15} />;
    }
    return <Users size={15} />;
  };

  const getDeptTone = (deptName) => {
    const n = (deptName || "").toLowerCase();
    if (n.includes("engineer") || n.includes("tech") || n.includes("dev")) return "purple";
    if (n.includes("design") || n.includes("ui") || n.includes("ux")) return "cyan";
    if (n.includes("market") || n.includes("sales")) return "orange";
    if (n.includes("hr") || n.includes("human")) return "green";
    if (n.includes("product")) return "indigo";
    if (n.includes("finance") || n.includes("account")) return "blue";
    return "slate";
  };

  const zoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 1.6));
  const zoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.4));
  const resetZoom = () => setZoomLevel(1);

  // Search filter
  const isMatch = (node) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      node.name?.toLowerCase().includes(q) ||
      node.role?.toLowerCase().includes(q) ||
      node.department?.toLowerCase().includes(q) ||
      node.email?.toLowerCase().includes(q) ||
      node.emp_code?.toLowerCase().includes(q) ||
      node.id?.toLowerCase().includes(q)
    );
  };

  // Check if department is visible
  const isDeptVisible = (deptName) => {
    if (selectedDept === "All") return true;
    return selectedDept.toLowerCase() === deptName?.toLowerCase();
  };

  // Open Screen 3 (User Profile & Role Details)
  const openMemberDetails = (member) => {
    setSelectedMember(member);
    const code = member.emp_code || member.id;
    // Set editable role
    setSelectedMemberRole(member.role || "Employee");
    // Load permissions from localStorage if available
    try {
      const stored = localStorage.getItem(`hrms_permissions_${code}`);
      if (stored) {
        setMemberPermissions(JSON.parse(stored));
      } else {
        setMemberPermissions(DEFAULT_PERMISSIONS);
      }
    } catch (e) {
      setMemberPermissions(DEFAULT_PERMISSIONS);
    }
  };

  // Toggle permission
  const handleTogglePermission = (key) => {
    setMemberPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Save changes in Screen 3
  const handleSaveChanges = async () => {
    if (!selectedMember) return;
    setIsSaving(true);
    const code = selectedMember.emp_code || selectedMember.id;
    try {
      // 1. Update role
      await updateEmployeeRoleInStore(code, selectedMemberRole);
      // 2. Persist permissions
      localStorage.setItem(`hrms_permissions_${code}`, JSON.stringify(memberPermissions));
      setSaveSuccessMsg("Changes saved successfully!");
      setTimeout(() => setSaveSuccessMsg(""), 3000);
      // Reload unified employees
      const updated = await loadUnifiedEmployees();
      setRawEmployees(updated);
    } catch (err) {
      console.warn("Failed to save changes:", err);
      setSaveSuccessMsg("Failed to save changes.");
      setTimeout(() => setSaveSuccessMsg(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Back navigation for mobile
  const handleBack = () => {
    if (selectedMember) {
      setSelectedMember(null);
    } else if (activeDeptDetails) {
      setActiveDeptDetails(null);
    }
  };

  return (
    <div className="org-tree-page">
      {/* =========================================================================
          DESKTOP VIEW (>768px) — Full interactive canvas, controls, and drawer
          ========================================================================= */}
      <div className="org-desktop-only">
        {/* Top Controls & Metrics Bar */}
        <div className="org-tree-topbar">
          <div className="org-stats-grid">
            <div className="org-stat-card">
              <div className="org-stat-icon org-stat-icon--purple">
                <Users size={18} />
              </div>
              <div>
                <div className="org-stat-value">{stats.headcount}</div>
                <div className="org-stat-label">Total Headcount</div>
              </div>
            </div>

            <div className="org-stat-card">
              <div className="org-stat-icon org-stat-icon--cyan">
                <Building2 size={18} />
              </div>
              <div>
                <div className="org-stat-value">{stats.departments}</div>
                <div className="org-stat-label">Departments</div>
              </div>
            </div>

            <div className="org-stat-card">
              <div className="org-stat-icon org-stat-icon--emerald">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="org-stat-value">{stats.managers}</div>
                <div className="org-stat-label">Managers & Leads</div>
              </div>
            </div>

            <div className="org-stat-card">
              <div className="org-stat-icon org-stat-icon--amber">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div className="org-stat-value">{stats.activeStatus}</div>
                <div className="org-stat-label">Active Status</div>
              </div>
            </div>
          </div>

          {/* Action / Search / View Controls */}
          <div className="org-controls-row">
            <div className="org-search-box">
              <Search size={16} className="org-search-icon" />
              <input
                type="text"
                placeholder="Search by name, role, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="org-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="org-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="org-actions-cluster">
              {/* View Mode Switcher */}
              <div className="org-view-toggle">
                <button
                  type="button"
                  className={`org-view-btn ${viewMode === "tree" ? "active" : ""}`}
                  onClick={() => setViewMode("tree")}
                  title="Hierarchy Tree Chart"
                >
                  <Layers size={15} />
                  <span>Tree Chart</span>
                </button>
                <button
                  type="button"
                  className={`org-view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Department Cards"
                >
                  <FolderKanban size={15} />
                  <span>Department Grid</span>
                </button>
              </div>

              {/* Tree Zoom / Expand controls (only in tree view) */}
              {viewMode === "tree" && (
                <div className="org-zoom-cluster">
                  <button
                    type="button"
                    className="org-tool-btn"
                    onClick={zoomIn}
                    title="Zoom In (+15%)"
                    aria-label="Zoom in"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <span className="org-zoom-indicator">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    type="button"
                    className="org-tool-btn"
                    onClick={zoomOut}
                    title="Zoom Out (-15%)"
                    aria-label="Zoom out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button
                    type="button"
                    className="org-tool-btn"
                    onClick={resetZoom}
                    title="Reset Zoom (100%)"
                    aria-label="Reset zoom"
                  >
                    <RotateCcw size={15} />
                  </button>

                  <div className="org-tool-divider" />

                  <button
                    type="button"
                    className="org-action-pill-btn"
                    onClick={expandAll}
                    title="Expand All Hierarchy Nodes"
                  >
                    <Maximize2 size={13} />
                    <span>Expand All</span>
                  </button>
                  <button
                    type="button"
                    className="org-action-pill-btn"
                    onClick={collapseAll}
                    title="Collapse All Hierarchy Nodes"
                  >
                    <Minimize2 size={13} />
                    <span>Collapse All</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Department Filter Tabs */}
          <div className="org-dept-tabs-wrap">
            <div className="org-dept-tabs">
              {departments.map((d) => {
                const active = selectedDept === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`org-dept-pill ${active ? "active" : ""}`}
                    onClick={() => setSelectedDept(d.id)}
                  >
                    <span>{d.name}</span>
                    <span className="org-dept-count">{d.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="org-canvas-viewport">
          {viewMode === "tree" ? (
            <div
              className="org-tree-canvas"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top center",
              }}
            >
              {/* Level 1: CEO Root Node */}
              <div className="org-tree-root">
                <div
                  className={`org-node-card org-node-card--ceo ${
                    selectedNode?.id === dynamicTree.id ? "selected" : ""
                  } ${isMatch(dynamicTree) ? "matched" : ""}`}
                  onClick={() => setSelectedNode(dynamicTree)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="org-ceo-crown">
                    <Award size={13} />
                    <span>Executive Leadership</span>
                  </div>

                  <div className="org-node-body">
                    <OrgAvatar
                      src={dynamicTree.profile_image}
                      name={dynamicTree.name}
                      size={48}
                      className="org-node-avatar"
                    />

                    <div className="org-node-info">
                      <h3 className="org-node-name">{dynamicTree.name}</h3>
                      <p className="org-node-role">{dynamicTree.role}</p>
                      <span className="org-node-dept-badge org-node-dept-badge--exec">
                        Executive Board
                      </span>
                    </div>
                  </div>

                  <div className="org-node-footer">
                    <span className="org-node-reports-badge">
                      {departments.length - 1} Departments • {stats.headcount} Employees
                    </span>

                    <button
                      type="button"
                      className="org-node-toggle-btn"
                      onClick={(e) => toggleCollapse(dynamicTree.id, e)}
                      title={collapsedNodes[dynamicTree.id] ? "Expand Tree" : "Collapse Tree"}
                      aria-label="Toggle node collapse"
                    >
                      {collapsedNodes[dynamicTree.id] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                  </div>
                </div>

                {/* Vertical trunk connector */}
                {!collapsedNodes[dynamicTree.id] && <div className="org-trunk-line" />}

                {/* Level 2: Departments & Teams Container */}
                {!collapsedNodes[dynamicTree.id] && (
                  <div className="org-departments-row">
                    {dynamicTree.children
                      .filter((dept) => isDeptVisible(dept.name))
                      .map((dept) => {
                        const isDeptCollapsed = collapsedNodes[dept.id];
                        return (
                          <div key={dept.id} className="org-department-branch">
                            <div className="org-branch-connector" />

                            <div
                              className={`org-dept-header-card ${
                                isDeptCollapsed ? "is-collapsed" : ""
                              }`}
                              style={{ "--dept-color": dept.color }}
                            >
                              <div className="org-dept-title-row">
                                <div
                                  className="org-dept-tag-icon"
                                  style={{ background: dept.bgColor, color: dept.color }}
                                >
                                  <Building2 size={15} />
                                </div>
                                <span className="org-dept-title">{dept.name}</span>
                                <span className="org-dept-badge-count">{dept.count}</span>

                                <button
                                  type="button"
                                  className="org-dept-toggle-btn"
                                  onClick={(e) => toggleCollapse(dept.id, e)}
                                  title={isDeptCollapsed ? "Expand Department" : "Collapse Department"}
                                >
                                  {isDeptCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                                </button>
                              </div>
                            </div>

                            {/* Manager and Direct Reports under Department */}
                            {!isDeptCollapsed && (
                              <div className="org-dept-members-col">
                                <div className="org-subbranch-line" />

                                {dept.children?.map((manager) => {
                                  const isMgrCollapsed = collapsedNodes[manager.id];
                                  const isMgrSelected = selectedNode?.id === manager.id;
                                  const isMgrMatched = isMatch(manager);

                                  return (
                                    <div key={manager.id} className="org-manager-group">
                                      <div
                                        className={`org-node-card org-node-card--manager ${
                                          isMgrSelected ? "selected" : ""
                                        } ${isMgrMatched ? "matched" : ""}`}
                                        onClick={() => setSelectedNode(manager)}
                                        role="button"
                                        tabIndex={0}
                                      >
                                        <div className="org-node-lead-badge">
                                          <Sparkles size={11} />
                                          <span>Department Lead</span>
                                        </div>

                                        <div className="org-node-body">
                                          <OrgAvatar
                                            src={manager.profile_image}
                                            name={manager.name}
                                            size={42}
                                            className="org-node-avatar"
                                          />

                                          <div className="org-node-info">
                                            <h4 className="org-node-name">{manager.name}</h4>
                                            <p className="org-node-role">{manager.role}</p>
                                            <span className="org-node-location-tag">
                                              <MapPin size={11} />
                                              {manager.location}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="org-node-footer">
                                          <span className="org-node-reports-badge">
                                            {manager.children?.length || 0} Direct Reports
                                          </span>

                                          {manager.children?.length > 0 && (
                                            <button
                                              type="button"
                                              className="org-node-toggle-btn"
                                              onClick={(e) => toggleCollapse(manager.id, e)}
                                              title={
                                                isMgrCollapsed
                                                  ? "Show Direct Reports"
                                                  : "Hide Direct Reports"
                                              }
                                            >
                                              {isMgrCollapsed ? (
                                                <ChevronDown size={13} />
                                              ) : (
                                                <ChevronUp size={13} />
                                              )}
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Direct Reports Column */}
                                      {!isMgrCollapsed && manager.children?.length > 0 && (
                                        <div className="org-reports-tree">
                                          <div className="org-reports-trunk" />
                                          <div className="org-reports-list">
                                            {manager.children.map((emp) => {
                                              const isEmpSelected = selectedNode?.id === emp.id;
                                              const isEmpMatched = isMatch(emp);

                                              return (
                                                <div key={emp.id} className="org-report-leaf">
                                                  <div className="org-leaf-arm" />
                                                  <div
                                                    className={`org-node-card org-node-card--employee ${
                                                      isEmpSelected ? "selected" : ""
                                                    } ${isEmpMatched ? "matched" : ""}`}
                                                    onClick={() => setSelectedNode(emp)}
                                                    role="button"
                                                    tabIndex={0}
                                                  >
                                                    <div className="org-node-body">
                                                      <OrgAvatar
                                                        src={emp.profile_image}
                                                        name={emp.name}
                                                        size={36}
                                                        className="org-node-avatar org-node-avatar--sm"
                                                      />

                                                      <div className="org-node-info">
                                                        <h5 className="org-node-name">{emp.name}</h5>
                                                        <p className="org-node-role">{emp.role}</p>
                                                        <div className="org-node-meta-row">
                                                          <span className="org-type-badge">{emp.type}</span>
                                                          <span className="org-loc-text">{emp.location}</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Department Grid View Mode */
            <div className="org-grid-view">
              {dynamicTree.children
                .filter((dept) => isDeptVisible(dept.name))
                .map((dept) => (
                  <div key={dept.id} className="org-grid-dept-card" style={{ "--dept-color": dept.color }}>
                    <div className="org-grid-dept-header">
                      <div className="org-grid-dept-header-left">
                        <div className="org-grid-dept-icon" style={{ color: dept.color, background: dept.bgColor }}>
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h3>{dept.name}</h3>
                          <span>{dept.count} Members across squads</span>
                        </div>
                      </div>
                      <span className="org-grid-badge" style={{ color: dept.color, borderColor: dept.color }}>
                        Active Unit
                      </span>
                    </div>

                    <div className="org-grid-dept-body">
                      {dept.children?.map((mgr) => (
                        <div key={mgr.id} className="org-grid-manager-block">
                          <div
                            className={`org-grid-emp-row org-grid-emp-row--lead ${
                              selectedNode?.id === mgr.id ? "selected" : ""
                            }`}
                            onClick={() => setSelectedNode(mgr)}
                          >
                            <OrgAvatar
                              src={mgr.profile_image}
                              name={mgr.name}
                              size={36}
                              className="org-node-avatar"
                            />
                            <div className="org-grid-emp-meta">
                              <strong>{mgr.name}</strong>
                              <span>{mgr.role} • Lead</span>
                            </div>
                            <span className="org-lead-pill">Manager</span>
                          </div>

                          <div className="org-grid-reports-subgrid">
                            {mgr.children?.map((member) => (
                              <div
                                key={member.id}
                                className={`org-grid-emp-card ${
                                  selectedNode?.id === member.id ? "selected" : ""
                                }`}
                                onClick={() => setSelectedNode(member)}
                              >
                                <OrgAvatar
                                  src={member.profile_image}
                                  name={member.name}
                                  size={30}
                                  className="org-node-avatar org-node-avatar--sm"
                                />
                                <div className="org-grid-emp-info">
                                  <strong>{member.name}</strong>
                                  <p>{member.role}</p>
                                  <small>{member.location} • {member.type}</small>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Selected Person Details Drawer (Desktop) */}
        {selectedNode && (
          <aside className="org-details-drawer" aria-label="Employee Details">
            <div className="org-drawer-header">
              <div className="org-drawer-header-left">
                <User size={18} className="org-drawer-header-icon" />
                <span>Person Details</span>
              </div>
              <button
                type="button"
                className="org-drawer-close-btn"
                onClick={() => setSelectedNode(null)}
                aria-label="Close panel"
              >
                <X size={17} />
              </button>
            </div>

            <div className="org-drawer-body">
              <div className="org-drawer-hero">
                <OrgAvatar
                  src={selectedNode.profile_image}
                  name={selectedNode.name}
                  size={68}
                  className="org-drawer-avatar"
                />

                <h2 className="org-drawer-name">{selectedNode.name}</h2>
                <p className="org-drawer-role">{selectedNode.role}</p>

                <div className="org-drawer-pills">
                  <span className="org-drawer-pill org-drawer-pill--dept">
                    {selectedNode.department}
                  </span>
                  <span className="org-drawer-pill org-drawer-pill--status">
                    <CheckCircle2 size={11} />
                    {selectedNode.status || "Active"}
                  </span>
                  <span className="org-drawer-pill org-drawer-pill--type">
                    {selectedNode.type}
                  </span>
                </div>
              </div>

              {selectedNode.about && (
                <div className="org-drawer-section">
                  <label className="org-drawer-section-title">ROLE & FOCUS</label>
                  <p className="org-drawer-about-text">{selectedNode.about}</p>
                </div>
              )}

              <div className="org-drawer-section">
                <label className="org-drawer-section-title">CONTACT & LOCATION</label>
                <div className="org-spec-list">
                  <div className="org-spec-item">
                    <Mail size={15} className="org-spec-icon" />
                    <div className="org-spec-content">
                      <span className="org-spec-label">Email Address</span>
                      <a href={`mailto:${selectedNode.email}`} className="org-spec-link">
                        {selectedNode.email}
                      </a>
                    </div>
                  </div>

                  <div className="org-spec-item">
                    <Phone size={15} className="org-spec-icon" />
                    <div className="org-spec-content">
                      <span className="org-spec-label">Work Phone</span>
                      <a href={`tel:${selectedNode.phone}`} className="org-spec-link">
                        {selectedNode.phone}
                      </a>
                    </div>
                  </div>

                  <div className="org-spec-item">
                    <MapPin size={15} className="org-spec-icon" />
                    <div className="org-spec-content">
                      <span className="org-spec-label">Work Location</span>
                      <span className="org-spec-val">{selectedNode.location}</span>
                    </div>
                  </div>

                  <div className="org-spec-item">
                    <Calendar size={15} className="org-spec-icon" />
                    <div className="org-spec-content">
                      <span className="org-spec-label">Joined Organization</span>
                      <span className="org-spec-val">{selectedNode.joined}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedNode.reportsTo && (
                <div className="org-drawer-section">
                  <label className="org-drawer-section-title">REPORTS DIRECTLY TO</label>
                  <div
                    className="org-drawer-rel-card"
                    onClick={() => {
                      const manager = allMembers.find((m) => m.name === selectedNode.reportsTo);
                      if (manager) setSelectedNode(manager);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <OrgAvatar
                      name={selectedNode.reportsTo}
                      size={32}
                      className="org-drawer-rel-avatar"
                    />
                    <div>
                      <strong>{selectedNode.reportsTo}</strong>
                      <span>Direct Supervisor</span>
                    </div>
                    <ChevronRight size={15} className="org-drawer-arrow" />
                  </div>
                </div>
              )}

              {selectedNode.children?.length > 0 && (
                <div className="org-drawer-section">
                  <label className="org-drawer-section-title">
                    DIRECT REPORTS ({selectedNode.children.length})
                  </label>
                  <div className="org-drawer-reports-list">
                    {selectedNode.children.map((child) => (
                      <div
                        key={child.id}
                        className="org-drawer-rel-card"
                        onClick={() => setSelectedNode(child)}
                        role="button"
                        tabIndex={0}
                      >
                        <OrgAvatar
                          src={child.profile_image}
                          name={child.name}
                          size={32}
                          className="org-drawer-rel-avatar"
                        />
                        <div>
                          <strong>{child.name}</strong>
                          <span>{child.role}</span>
                        </div>
                        <ChevronRight size={15} className="org-drawer-arrow" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="org-drawer-footer">
              <button
                type="button"
                className="org-drawer-action-btn org-drawer-action-btn--primary"
                onClick={() => navigate("/dashboard/employees")}
              >
                <Users size={15} />
                <span>View in Directory</span>
              </button>
              <a
                href={`mailto:${selectedNode.email}`}
                className="org-drawer-action-btn org-drawer-action-btn--secondary"
              >
                <Mail size={15} />
                <span>Send Email</span>
              </a>
            </div>
          </aside>
        )}
      </div>

      {/* =========================================================================
          MOBILE VIEW (<=768px) — Exact Reproduction of Reference Image (3 Screens)
          ========================================================================= */}
      <div className="org-mobile-only">
        {/* Toast feedback */}
        {saveSuccessMsg && (
          <div className="org-mob-toast" role="status">
            <Check size={16} />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────
            SCREEN 3: USER PROFILE & ROLE & ACCESS DETAILS
            ───────────────────────────────────────────────────────────────── */}
        {selectedMember ? (
          <div className="org-mob-details-screen">
            {/* Back to Org Tree */}
            <button
              type="button"
              className="org-mob-back-btn"
              onClick={handleBack}
            >
              <ArrowLeft size={16} />
              <span>Back to Organization Tree</span>
            </button>

            {/* Profile Overview Hero Card */}
            <div className="org-mob-prof-card">
              <div className="org-mob-prof-avatar-wrap">
                <OrgAvatar
                  src={selectedMember.profile_image}
                  name={selectedMember.name}
                  size={72}
                  className="org-mob-prof-avatar"
                />
              </div>

              <h2 className="org-mob-prof-name">{selectedMember.name}</h2>
              <div className="org-mob-prof-role-badge">
                {selectedMember.role || selectedMember.designation || "Member"}
              </div>
              <div className="org-mob-prof-id">
                {selectedMember.emp_code || selectedMember.id}
              </div>

              <div className="org-mob-prof-meta-list">
                <div className="org-mob-prof-meta-item">
                  <Mail size={15} className="org-mob-meta-icon" />
                  <span>{selectedMember.email || "—"}</span>
                </div>
                <div className="org-mob-prof-meta-item">
                  <Phone size={15} className="org-mob-meta-icon" />
                  <span>{selectedMember.phone || "+91 99999 99999"}</span>
                </div>
                <div className="org-mob-prof-meta-item">
                  <MapPin size={15} className="org-mob-meta-icon" />
                  <span>{selectedMember.location || "Mumbai, IN"}</span>
                </div>
                <div className="org-mob-prof-meta-item">
                  <Building size={15} className="org-mob-meta-icon" />
                  <span>{selectedMember.department || "General"}</span>
                </div>
                <div className="org-mob-prof-meta-item">
                  <Calendar size={15} className="org-mob-meta-icon" />
                  <span>Joined {selectedMember.joined ? (selectedMember.joined.includes("202") ? "Jan 15, 2024" : selectedMember.joined) : "Jan 15, 2024"}</span>
                </div>
              </div>
            </div>

            {/* Department & Reporting Card */}
            <div className="org-mob-section-card">
              <div className="org-mob-section-head">
                <div className="org-mob-head-title-wrap">
                  <div className="org-mob-dept-icon-mini">
                    <Building2 size={16} />
                  </div>
                  <h3 className="org-mob-section-title">Department & Reporting</h3>
                </div>
              </div>

              <div className="org-mob-dept-reporting-body">
                <div className="org-mob-rep-row">
                  <Mail size={15} className="org-mob-meta-icon" />
                  <span>{selectedMember.department || "General"}</span>
                </div>

                <div className="org-mob-rep-row org-mob-rep-supervisor">
                  <div className="org-mob-supervisor-left">
                    <span className="org-mob-rep-label">Reports to</span>
                    <div className="org-mob-supervisor-info">
                      <OrgAvatar
                        name={selectedMember.reportsTo || "Migdad Mirza"}
                        size={28}
                        className="org-mob-supervisor-avatar"
                      />
                      <span className="org-mob-supervisor-name">
                        {selectedMember.reportsTo || "Migdad Mirza"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Role & Access Card */}
            <div className="org-mob-section-card">
              <div className="org-mob-section-head">
                <h3 className="org-mob-section-title">Role & Access</h3>
                <span className="org-mob-pill-tag">
                  <Edit3 size={12} />
                  <span>Edit Role</span>
                </span>
              </div>

              <div className="org-mob-role-row">
                <span className="org-mob-role-label">Role</span>
                <div className="org-mob-role-select-wrap">
                  <select
                    className="org-mob-role-select"
                    value={selectedMemberRole}
                    onChange={(e) => setSelectedMemberRole(e.target.value)}
                  >
                    <option value="Senior Developer">Senior Developer</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                    <option value="UI/UX Designer">UI/UX Designer</option>
                    <option value="DevOps Engineer">DevOps Engineer</option>
                    <option value="Product Designer">Product Designer</option>
                    <option value="QA Engineer">QA Engineer</option>
                  </select>
                  <ChevronDown size={14} className="org-mob-select-arrow" />
                </div>
              </div>
            </div>

            {/* Permissions Card */}
            <div className="org-mob-section-card">
              <div className="org-mob-section-head">
                <h3 className="org-mob-section-title">Permissions</h3>
                <span className="org-mob-pill-tag">
                  <Edit3 size={12} />
                  <span>Edit Permissions</span>
                </span>
              </div>

              <div className="org-mob-perm-list">
                <div className="org-mob-perm-item">
                  <div className="org-mob-perm-left">
                    <Home size={16} className="org-mob-perm-icon" />
                    <span>Dashboard</span>
                  </div>
                  <label className="org-mob-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(memberPermissions.dashboard)}
                      onChange={() => handleTogglePermission("dashboard")}
                    />
                    <span className="org-mob-slider" />
                  </label>
                </div>

                <div className="org-mob-perm-item">
                  <div className="org-mob-perm-left">
                    <Users size={16} className="org-mob-perm-icon" />
                    <span>Employee Directory</span>
                  </div>
                  <label className="org-mob-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(memberPermissions.employee_directory)}
                      onChange={() => handleTogglePermission("employee_directory")}
                    />
                    <span className="org-mob-slider" />
                  </label>
                </div>

                <div className="org-mob-perm-item">
                  <div className="org-mob-perm-left">
                    <Clock size={16} className="org-mob-perm-icon" />
                    <span>Attendance</span>
                  </div>
                  <label className="org-mob-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(memberPermissions.attendance)}
                      onChange={() => handleTogglePermission("attendance")}
                    />
                    <span className="org-mob-slider" />
                  </label>
                </div>

                <div className="org-mob-perm-item">
                  <div className="org-mob-perm-left">
                    <Calendar size={16} className="org-mob-perm-icon" />
                    <span>Leave Management</span>
                  </div>
                  <label className="org-mob-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(memberPermissions.leave_management)}
                      onChange={() => handleTogglePermission("leave_management")}
                    />
                    <span className="org-mob-slider" />
                  </label>
                </div>

                <div className="org-mob-perm-item">
                  <div className="org-mob-perm-left">
                    <FileText size={16} className="org-mob-perm-icon" />
                    <span>Reports</span>
                  </div>
                  <label className="org-mob-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(memberPermissions.reports)}
                      onChange={() => handleTogglePermission("reports")}
                    />
                    <span className="org-mob-slider" />
                  </label>
                </div>

                <div className="org-mob-perm-item">
                  <div className="org-mob-perm-left">
                    <Settings size={16} className="org-mob-perm-icon" />
                    <span>Settings</span>
                  </div>
                  <label className="org-mob-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(memberPermissions.settings)}
                      onChange={() => handleTogglePermission("settings")}
                    />
                    <span className="org-mob-slider" />
                  </label>
                </div>
              </div>
            </div>

            {/* Save Changes Action Button */}
            <button
              type="button"
              className="org-mob-save-btn"
              onClick={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        ) : activeDeptDetails ? (
          /* ─────────────────────────────────────────────────────────────────
             SCREEN 2: DEPARTMENT DETAILS VIEW
             ───────────────────────────────────────────────────────────────── */
          <div className="org-mob-dept-screen">
            {/* Back to Org Tree */}
            <button
              type="button"
              className="org-mob-back-btn"
              onClick={handleBack}
            >
              <ArrowLeft size={16} />
              <span>Back to Organization Tree</span>
            </button>

            {/* Department Header Card */}
            <div className="org-mob-dept-hero-card">
              <div className="org-mob-dept-hero-icon">
                <Building2 size={24} />
              </div>
              <div className="org-mob-dept-hero-info">
                <h2 className="org-mob-dept-hero-title">{activeDeptDetails.name}</h2>
                <span className="org-mob-dept-hero-sub">
                  {activeDeptDetails.count} Members
                </span>
              </div>
              <ChevronRight size={18} className="org-mob-hero-arrow" />
            </div>

            {/* Department Lead Section */}
            {activeDeptDetails.lead && (
              <div className="org-mob-section-block">
                <h3 className="org-mob-group-heading">Department Lead</h3>
                <div
                  className="org-mob-lead-card"
                  onClick={() => openMemberDetails(activeDeptDetails.lead)}
                >
                  <OrgAvatar
                    src={activeDeptDetails.lead.profile_image}
                    name={activeDeptDetails.lead.name}
                    size={46}
                    className="org-mob-lead-avatar"
                  />
                  <div className="org-mob-lead-meta">
                    <h4 className="org-mob-lead-name">{activeDeptDetails.lead.name}</h4>
                    <span className="org-mob-lead-role">{activeDeptDetails.lead.role}</span>
                    <span className="org-mob-lead-loc">{activeDeptDetails.lead.location}</span>
                  </div>
                  <div className="org-mob-lead-actions" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`mailto:${activeDeptDetails.lead.email}`}
                      className="org-mob-icon-action"
                      aria-label="Send Email"
                    >
                      <Mail size={16} />
                    </a>
                    <a
                      href={`tel:${activeDeptDetails.lead.phone}`}
                      className="org-mob-icon-action"
                      aria-label="Call"
                    >
                      <Phone size={16} />
                    </a>
                    <button
                      type="button"
                      className="org-mob-icon-action org-mob-chevron-action"
                      onClick={() => openMemberDetails(activeDeptDetails.lead)}
                      aria-label="View Details"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Team Members Section */}
            <div className="org-mob-section-block">
              <h3 className="org-mob-group-heading">
                Team Members ({activeDeptDetails.teamMembers?.length || 0})
              </h3>
              <div className="org-mob-members-list">
                {activeDeptDetails.teamMembers?.map((member) => (
                  <div
                    key={member.id}
                    className="org-mob-member-card"
                    onClick={() => openMemberDetails(member)}
                  >
                    <OrgAvatar
                      src={member.profile_image}
                      name={member.name}
                      size={44}
                      className="org-mob-member-avatar"
                    />
                    <div className="org-mob-member-meta">
                      <h4 className="org-mob-member-name">{member.name}</h4>
                      <span className="org-mob-member-role">{member.role}</span>
                      <span className="org-mob-member-loc">
                        {member.emp_code || member.id} | {member.location}
                      </span>
                    </div>
                    <div className="org-mob-member-actions" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`mailto:${member.email}`}
                        className="org-mob-icon-action"
                        aria-label="Send Email"
                      >
                        <Mail size={16} />
                      </a>
                      <a
                        href={`tel:${member.phone}`}
                        className="org-mob-icon-action"
                        aria-label="Call"
                      >
                        <Phone size={16} />
                      </a>
                      <button
                        type="button"
                        className="org-mob-icon-action org-mob-chevron-action"
                        onClick={() => openMemberDetails(member)}
                        aria-label="View Details"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────
             SCREEN 1: MAIN ORGANIZATION TREE VIEW
             ───────────────────────────────────────────────────────────────── */
          <div className="org-mob-main-screen">
            {/* Top 4 Stat Cards (2x2 Grid) */}
            <div className="org-mob-stats-grid">
              <div className="org-mob-stat-card">
                <div className="org-mob-stat-icon org-mob-stat-icon--purple">
                  <Users size={18} />
                </div>
                <div className="org-mob-stat-meta">
                  <div className="org-mob-stat-val">{stats.headcount}</div>
                  <div className="org-mob-stat-lbl">Total Headcount</div>
                </div>
              </div>

              <div className="org-mob-stat-card">
                <div className="org-mob-stat-icon org-mob-stat-icon--cyan">
                  <Building2 size={18} />
                </div>
                <div className="org-mob-stat-meta">
                  <div className="org-mob-stat-val">{stats.departments}</div>
                  <div className="org-mob-stat-lbl">Departments</div>
                </div>
              </div>

              <div className="org-mob-stat-card">
                <div className="org-mob-stat-icon org-mob-stat-icon--emerald">
                  <ShieldCheck size={18} />
                </div>
                <div className="org-mob-stat-meta">
                  <div className="org-mob-stat-val">{stats.managers}</div>
                  <div className="org-mob-stat-lbl">Managers & Leads</div>
                </div>
              </div>

              <div className="org-mob-stat-card">
                <div className="org-mob-stat-icon org-mob-stat-icon--amber">
                  <Clock size={18} />
                </div>
                <div className="org-mob-stat-meta">
                  <div className="org-mob-stat-val">{stats.activeStatus}</div>
                  <div className="org-mob-stat-lbl">Active Status</div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="org-mob-search-row">
              <Search size={16} className="org-mob-search-icon" />
              <input
                type="text"
                className="org-mob-search-input"
                placeholder="Search by name, role, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="org-mob-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* View Mode Toggle Button */}
            <div className="org-mob-view-toggle">
              <button
                type="button"
                className={`org-mob-toggle-btn ${viewMode === "tree" ? "active" : ""}`}
                onClick={() => setViewMode("tree")}
              >
                <Layers size={15} />
                <span>Tree Chart</span>
              </button>
              <button
                type="button"
                className={`org-mob-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
              >
                <FolderKanban size={15} />
                <span>Department Grid</span>
              </button>
            </div>

            {/* Tree Controls (Zoom & Expand) */}
            {viewMode === "tree" && (
              <div className="org-mob-controls-row">
                <div className="org-mob-zoom-cluster">
                  <button
                    type="button"
                    className="org-mob-ctrl-icon-btn"
                    onClick={zoomOut}
                    aria-label="Zoom out"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <span className="org-mob-zoom-val">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    type="button"
                    className="org-mob-ctrl-icon-btn"
                    onClick={zoomIn}
                    aria-label="Zoom in"
                  >
                    <ZoomIn size={15} />
                  </button>
                  <button
                    type="button"
                    className="org-mob-ctrl-icon-btn"
                    onClick={resetZoom}
                    aria-label="Reset zoom"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                <div className="org-mob-expand-cluster">
                  <button
                    type="button"
                    id="org-mob-expand-all"
                    className="org-mob-pill-action-btn"
                    onClick={handleMobileExpandAll}
                    title="Expand all departments"
                  >
                    <Maximize2 size={13} />
                    <span>Expand All</span>
                  </button>
                  <button
                    type="button"
                    id="org-mob-collapse-all"
                    className="org-mob-pill-action-btn"
                    onClick={handleMobileCollapseAll}
                    title="Collapse all departments"
                  >
                    <Minimize2 size={13} />
                    <span>Collapse All</span>
                  </button>
                </div>
              </div>
            )}

            {/* Department Filter Tabs */}
            <div className="org-mob-filter-tabs-wrap">
              <span className="org-mob-filter-arrow" aria-hidden="true">‹</span>
              <div className="org-mob-filter-tabs">
                {departments.map((d) => {
                  const active = selectedDept === d.id;
                  const label = d.id === "all" || d.id === "All" ? "All Departments" : d.name;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={`org-mob-filter-tab ${active ? "active" : ""}`}
                      onClick={() => {
                        setSelectedDept(d.id);
                        if (d.id !== "All" && d.id !== "all") {
                          setExpandedDepts((prev) => ({ ...prev, [d.name]: true, [d.id]: true }));
                        }
                      }}
                    >
                      <span>{label}</span>
                      <span className="org-mob-filter-count">{d.count}</span>
                    </button>
                  );
                })}
              </div>
              <span className="org-mob-filter-arrow" aria-hidden="true">›</span>
            </div>

            {/* Hierarchy Tree or Department Grid */}
            {viewMode === "tree" ? (
              <div
                className="org-mob-tree-canvas"
                style={{
                  transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
                  transformOrigin: "top center",
                }}
              >
                {/* Level 1: CEO Root Node */}
                <div className="org-mob-ceo-wrap">
                  <div
                    className="org-mob-ceo-card"
                    onClick={() => openMemberDetails(dynamicTree)}
                  >
                    <div className="org-mob-ceo-eyebrow-pill">
                      <Award size={12} />
                      <span>EXECUTIVE LEADERSHIP</span>
                    </div>

                    <OrgAvatar
                      src={dynamicTree.profile_image}
                      name={dynamicTree.name}
                      size={48}
                      className="org-mob-ceo-avatar"
                    />

                    <div className="org-mob-ceo-meta">
                      <h4 className="org-mob-ceo-name">{dynamicTree.name}</h4>
                      <span className="org-mob-ceo-role">{dynamicTree.role || "Chief Executive Officer"}</span>
                      <span className="org-mob-ceo-board-pill">Executive Board</span>
                    </div>

                    <div
                      className="org-mob-ceo-footer-pill"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(dynamicTree.id, e);
                      }}
                    >
                      <span>{departments.length - 1} Departments • {stats.headcount} Employees</span>
                      {collapsedNodes[dynamicTree.id] ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronUp size={14} />
                      )}
                    </div>
                  </div>

                  {/* Trunk connector descending */}
                  {!collapsedNodes[dynamicTree.id] && <div className="org-mob-trunk-line" />}
                </div>

                {/* Level 2: Department Accordion Stack matching Reference */}
                {!collapsedNodes[dynamicTree.id] && (
                  <div className="org-mob-dept-accordions-list">
                    {dynamicTree.children
                      .filter((dept) => isDeptVisible(dept.name))
                      .map((dept) => {
                        const isExpanded = Boolean(expandedDepts[dept.name] || expandedDepts[dept.id]);
                        const allDeptMembers = [dept.lead, ...(dept.teamMembers || [])].filter(Boolean);
                        const isShowingAll = Boolean(showAllDeptMembers[dept.id] || showAllDeptMembers[dept.name]);
                        const displayedMembers = isShowingAll ? allDeptMembers : allDeptMembers.slice(0, 3);
                        const remainingCount = allDeptMembers.length - displayedMembers.length;

                        return (
                          <div
                            key={dept.id}
                            className={`org-mob-accordion-card ${isExpanded ? "is-expanded" : "is-collapsed"}`}
                          >
                            {/* Department Accordion Header */}
                            <div
                              className="org-mob-accordion-header"
                              onClick={(e) => toggleDeptAccordion(dept.name, e)}
                            >
                              <div className="org-mob-acc-head-left">
                                <div className={`org-mob-acc-icon-box org-mob-acc-icon--${getDeptTone(dept.name)}`}>
                                  {getDeptIcon(dept.name)}
                                </div>
                                <span className="org-mob-acc-dept-name">{dept.name}</span>
                                <span className="org-mob-acc-count-badge">{dept.count}</span>
                              </div>

                              <button
                                type="button"
                                className="org-mob-acc-chevron-btn"
                                aria-label={isExpanded ? "Collapse department" : "Expand department"}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>

                            {/* Department Members List when expanded */}
                            {isExpanded && (
                              <div className="org-mob-acc-body">
                                <div className="org-mob-acc-members-list">
                                  {displayedMembers.map((member) => (
                                    <div
                                      key={member.id}
                                      className="org-mob-acc-member-row"
                                      onClick={() => openMemberDetails(member)}
                                    >
                                      <div className="org-mob-acc-member-left">
                                        <OrgAvatar
                                          src={member.profile_image}
                                          name={member.name}
                                          size={36}
                                          className="org-mob-acc-avatar"
                                        />
                                        <div className="org-mob-acc-member-meta">
                                          <strong className="org-mob-acc-member-name">{member.name}</strong>
                                          <span className="org-mob-acc-member-role">{member.role || "Member"}</span>
                                        </div>
                                      </div>

                                      <div className="org-mob-acc-member-right">
                                        <span className="org-mob-acc-status-pill">
                                          <span className="org-mob-status-dot" />
                                          <span>Active</span>
                                        </span>
                                        <button
                                          type="button"
                                          className="org-mob-acc-more-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openMemberDetails(member);
                                          }}
                                          aria-label="Member options"
                                        >
                                          <MoreVertical size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {allDeptMembers.length > 3 && (
                                  <button
                                    type="button"
                                    className="org-mob-acc-expand-members-btn"
                                    onClick={(e) => toggleShowAllMembers(dept.id, e)}
                                  >
                                    <span>
                                      {isShowingAll
                                        ? "Show less members"
                                        : `+${remainingCount} more members`}
                                    </span>
                                    {isShowingAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              /* Department Grid Mode (Mobile) */
              <div className="org-mob-grid-container">
                {dynamicTree.children
                  .filter((dept) => isDeptVisible(dept.name))
                  .map((dept) => (
                    <div
                      key={dept.id}
                      className="org-mob-grid-card"
                      onClick={() => setActiveDeptDetails(dept)}
                    >
                      <div className="org-mob-grid-head">
                        <div className="org-mob-grid-head-left">
                          <div className="org-mob-grid-icon">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <h4 className="org-mob-grid-title">{dept.name}</h4>
                            <span className="org-mob-grid-sub">{dept.count} Members</span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="org-mob-hero-arrow" />
                      </div>

                      {dept.lead && (
                        <div className="org-mob-grid-lead-row">
                          <OrgAvatar
                            src={dept.lead.profile_image}
                            name={dept.lead.name}
                            size={32}
                            className="org-mob-grid-lead-avatar"
                          />
                          <div className="org-mob-grid-lead-meta">
                            <strong>{dept.lead.name}</strong>
                            <span>{dept.lead.role}</span>
                          </div>
                          <span className="org-mob-grid-lead-tag">Lead</span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
