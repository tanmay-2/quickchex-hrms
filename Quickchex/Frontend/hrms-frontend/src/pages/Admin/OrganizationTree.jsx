import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Users,
  Building2,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  ChevronRight,
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
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./OrganizationTree.css";

/* =========================================================
   ORGANIZATION DATA HIERARCHY
   Covers Executive, Departments, Managers, and Employees
   ========================================================= */

export const ORG_DATA = {
  id: "emp-00",
  name: "Aaquib Khan",
  role: "Chief Executive Officer & MD",
  department: "Executive",
  email: "aaquib.khan@laesfera.co",
  phone: "+1 (555) 010-9900",
  location: "Mumbai HQ",
  type: "Full-time",
  joined: "2018-01-15",
  about: "Co-founder & CEO driving enterprise HRMS vision, organizational operations, and global strategy.",
  status: "Active",
  avatarColor: "#7c3aed",
  children: [
    {
      id: "dept-eng",
      isDepartment: true,
      name: "Engineering",
      count: 4,
      color: "#7c3aed",
      bgColor: "rgba(124, 58, 237, 0.08)",
      icon: "code",
      children: [
        {
          id: "emp-03",
          name: "Priya Nair",
          role: "Engineering Manager",
          department: "Engineering",
          email: "",
          phone: "+1 (628) 555-0110",
          location: "Remote",
          type: "Full-time",
          joined: "2019-11-04",
          about: "Oversees platform architecture, cloud infrastructure, and core backend squads.",
          status: "Active",
          avatarColor: "#7c3aed",
          reportsTo: "Aaquib Khan",
          children: [
            {
              id: "emp-01",
              name: "Ananya Rao",
              role: "Senior Software Engineer",
              department: "Engineering",
              email: "",
              phone: "+1 (415) 555-0142",
              location: "Bengaluru, IN",
              type: "Full-time",
              joined: "2022-03-14",
              about: "Leads the payments platform team, distributed microservices, and mentors engineers.",
              status: "Active",
              avatarColor: "#9333ea",
              reportsTo: "Priya Nair",
            },
            {
              id: "emp-02",
              name: "Marcus Webb",
              role: "DevOps Engineer",
              department: "Engineering",
              email: "",
              phone: "+1 (512) 555-0199",
              location: "Austin, TX",
              type: "Full-time",
              joined: "2024-07-01",
              about: "Maintains Kubernetes clusters, automated CI/CD pipelines, and high availability.",
              status: "Active",
              avatarColor: "#6366f1",
              reportsTo: "Priya Nair",
            },
            {
              id: "emp-04",
              name: "Tomasz Kowalski",
              role: "QA Engineer",
              department: "Engineering",
              email: "",
              phone: "+48 22 555 0166",
              location: "Berlin, DE",
              type: "Contract",
              joined: "2026-02-10",
              about: "Builds automated end-to-end regression suites and load testing frameworks.",
              status: "Active",
              avatarColor: "#8b5cf6",
              reportsTo: "Priya Nair",
            },
          ],
        },
      ],
    },
    {
      id: "dept-des",
      isDepartment: true,
      name: "Design",
      count: 4,
      color: "#0891b2",
      bgColor: "rgba(8, 145, 178, 0.08)",
      icon: "palette",
      children: [
        {
          id: "emp-08",
          name: "Daniel Cho",
          role: "Design Lead",
          department: "Design",
          email: "",
          phone: "+1 (206) 555-0121",
          location: "Seattle, WA",
          type: "Full-time",
          joined: "2018-08-27",
          about: "Sets overall product UX vision, brand guidelines, and review standards across surfaces.",
          status: "Active",
          avatarColor: "#0891b2",
          reportsTo: "Aaquib Khan",
          children: [
            {
              id: "emp-05",
              name: "Sofia Alvarez",
              role: "Senior Product Designer",
              department: "Design",
              email: "",
              phone: "+1 (212) 555-0133",
              location: "New York, NY",
              type: "Full-time",
              joined: "2021-06-21",
              about: "Leads design system evolution, component tokens, and mobile experience.",
              status: "Active",
              avatarColor: "#06b6d4",
              reportsTo: "Daniel Cho",
            },
            {
              id: "emp-06",
              name: "Kenji Watanabe",
              role: "Product Designer",
              department: "Design",
              email: "",
              phone: "+81 3 5555 0187",
              location: "Remote",
              type: "Full-time",
              joined: "2023-09-18",
              about: "Focuses on user onboarding friction reduction, accessibility, and micro-interactions.",
              status: "Active",
              avatarColor: "#0284c7",
              reportsTo: "Daniel Cho",
            },
            {
              id: "emp-07",
              name: "Grace Mensah",
              role: "UX Researcher",
              department: "Design",
              email: "",
              phone: "+44 20 5555 0142",
              location: "London, UK",
              type: "Full-time",
              joined: "2020-01-13",
              about: "Conducts qualitative user interviews, usability testing, and customer journey audits.",
              status: "Active",
              avatarColor: "#3b82f6",
              reportsTo: "Daniel Cho",
            },
          ],
        },
      ],
    },
    {
      id: "dept-prod",
      isDepartment: true,
      name: "Product",
      count: 4,
      color: "#d97706",
      bgColor: "rgba(217, 119, 6, 0.08)",
      icon: "package",
      children: [
        {
          id: "emp-09",
          name: "Isabella Conti",
          role: "Senior Product Manager",
          department: "Product",
          email: "",
          phone: "+39 06 5555 0198",
          location: "Remote",
          type: "Full-time",
          joined: "2021-02-08",
          about: "Drives product roadmaps, cross-team alignment, and strategic roadmap execution.",
          status: "Active",
          avatarColor: "#d97706",
          reportsTo: "Aaquib Khan",
          children: [
            {
              id: "emp-10",
              name: "Ravi Chandran",
              role: "Product Manager",
              department: "Product",
              email: "",
              phone: "+91 80 5555 0176",
              location: "Bengaluru, IN",
              type: "Full-time",
              joined: "2024-04-22",
              about: "Owns internal productivity tools, attendance modules, and analytics exports.",
              status: "Active",
              avatarColor: "#f59e0b",
              reportsTo: "Isabella Conti",
            },
            {
              id: "emp-11",
              name: "Emily Novak",
              role: "Product Analyst",
              department: "Product",
              email: "",
              phone: "+1 (312) 555-0155",
              location: "Chicago, IL",
              type: "Full-time",
              joined: "2025-10-06",
              about: "Builds executive metrics dashboards, retention cohorts, and SQL reporting pipelines.",
              status: "Active",
              avatarColor: "#b45309",
              reportsTo: "Isabella Conti",
            },
            {
              id: "emp-12",
              name: "Lucas Ferreira",
              role: "Product Associate",
              department: "Product",
              email: "",
              phone: "+55 11 5555 0143",
              location: "Remote",
              type: "Contract",
              joined: "2026-05-19",
              about: "Supports user feedback synthesis, backlog grooming, and release documentation.",
              status: "Active",
              avatarColor: "#eab308",
              reportsTo: "Isabella Conti",
            },
          ],
        },
      ],
    },
    {
      id: "dept-mkt",
      isDepartment: true,
      name: "Marketing",
      count: 4,
      color: "#db2777",
      bgColor: "rgba(219, 39, 119, 0.08)",
      icon: "megaphone",
      children: [
        {
          id: "emp-13",
          name: "Hannah Bright",
          role: "Marketing Manager",
          department: "Marketing",
          email: "",
          phone: "+1 (646) 555-0187",
          location: "New York, NY",
          type: "Full-time",
          joined: "2020-05-11",
          about: "Directs omni-channel campaigns, brand partnerships, and product launches.",
          status: "Active",
          avatarColor: "#db2777",
          reportsTo: "Aaquib Khan",
          children: [
            {
              id: "emp-14",
              name: "Omar Farouk",
              role: "Growth Marketer",
              department: "Marketing",
              email: "",
              phone: "+971 4 555 0132",
              location: "Dubai, UAE",
              type: "Full-time",
              joined: "2023-01-30",
              about: "Manages performance marketing budgets, conversion optimization, and experiments.",
              status: "Active",
              avatarColor: "#ec4899",
              reportsTo: "Hannah Bright",
            },
            {
              id: "emp-15",
              name: "Lina Berg",
              role: "Content Strategist",
              department: "Marketing",
              email: "",
              phone: "+46 8 555 0119",
              location: "Remote",
              type: "Full-time",
              joined: "2022-11-02",
              about: "Writes customer success stories, product documentation, and white papers.",
              status: "Active",
              avatarColor: "#f43f5e",
              reportsTo: "Hannah Bright",
            },
            {
              id: "emp-16",
              name: "Chidi Okoro",
              role: "SEO Specialist",
              department: "Marketing",
              email: "",
              phone: "+234 1 555 0164",
              location: "Lagos, NG",
              type: "Contract",
              joined: "2026-01-15",
              about: "Drives organic discovery, technical site audits, and domain authority growth.",
              status: "Active",
              avatarColor: "#e11d48",
              reportsTo: "Hannah Bright",
            },
          ],
        },
      ],
    },
    {
      id: "dept-sales",
      isDepartment: true,
      name: "Sales",
      count: 4,
      color: "#059669",
      bgColor: "rgba(5, 150, 105, 0.08)",
      icon: "trending",
      children: [
        {
          id: "emp-17",
          name: "Rachel Kim",
          role: "Sales Director",
          department: "Sales",
          email: "",
          phone: "+1 (669) 555-0173",
          location: "San Francisco, CA",
          type: "Full-time",
          joined: "2019-03-25",
          about: "Leads enterprise sales teams, global partner channels, and strategic enterprise accounts.",
          status: "Active",
          avatarColor: "#059669",
          reportsTo: "Aaquib Khan",
          children: [
            {
              id: "emp-18",
              name: "Tobias Lindqvist",
              role: "Account Executive",
              department: "Sales",
              email: "",
              phone: "+46 31 555 0141",
              location: "Remote",
              type: "Full-time",
              joined: "2024-08-12",
              about: "Closes EMEA enterprise deals and negotiates annual corporate software contracts.",
              status: "Active",
              avatarColor: "#10b981",
              reportsTo: "Rachel Kim",
            },
            {
              id: "emp-19",
              name: "Meera Iyer",
              role: "Customer Success Lead",
              department: "Sales",
              email: "",
              phone: "+91 22 555 0158",
              location: "Mumbai, IN",
              type: "Full-time",
              joined: "2021-09-06",
              about: "Champions customer retention, SLA fulfillment, and onboarding excellence.",
              status: "Active",
              avatarColor: "#14b8a6",
              reportsTo: "Rachel Kim",
            },
            {
              id: "emp-20",
              name: "Jordan Pierce",
              role: "SDR Specialist",
              department: "Sales",
              email: "",
              phone: "+1 (720) 555-0129",
              location: "Denver, CO",
              type: "Full-time",
              joined: "2025-06-02",
              about: "Sources high-value outbound leads and schedules qualification discovery demos.",
              status: "Active",
              avatarColor: "#0d9488",
              reportsTo: "Rachel Kim",
            },
          ],
        },
      ],
    },
    {
      id: "dept-fin",
      isDepartment: true,
      name: "Finance",
      count: 4,
      color: "#2563eb",
      bgColor: "rgba(37, 99, 235, 0.08)",
      icon: "landmark",
      children: [
        {
          id: "emp-21",
          name: "Wei Zhang",
          role: "Finance Manager",
          department: "Finance",
          email: "",
          phone: "+65 6555 0187",
          location: "Singapore",
          type: "Full-time",
          joined: "2020-10-19",
          about: "Directs financial planning, audits, budget allocations, and compliance reporting.",
          status: "Active",
          avatarColor: "#2563eb",
          reportsTo: "Aaquib Khan",
          children: [
            {
              id: "emp-22",
              name: "Aoife Byrne",
              role: "Senior Financial Analyst",
              department: "Finance",
              email: "",
              phone: "+353 1 555 0176",
              location: "Dublin, IE",
              type: "Full-time",
              joined: "2023-04-17",
              about: "Builds financial forecasts, scenario models, and SaaS unit economics projections.",
              status: "Active",
              avatarColor: "#3b82f6",
              reportsTo: "Wei Zhang",
            },
            {
              id: "emp-23",
              name: "Samuel Otieno",
              role: "Payroll Specialist",
              department: "Finance",
              email: "",
              phone: "+254 20 555 0143",
              location: "Remote",
              type: "Full-time",
              joined: "2022-07-25",
              about: "Manages global payroll compliance, tax deductions, and statutory disbursements.",
              status: "Active",
              avatarColor: "#1d4ed8",
              reportsTo: "Wei Zhang",
            },
            {
              id: "emp-24",
              name: "Nadia Petrova",
              role: "Corporate Accountant",
              department: "Finance",
              email: "",
              phone: "+7 495 555 0198",
              location: "Remote",
              type: "Contract",
              joined: "2026-03-03",
              about: "Handles accounts payable, vendor reconciliations, and quarterly tax reporting.",
              status: "Active",
              avatarColor: "#1e40af",
              reportsTo: "Wei Zhang",
            },
          ],
        },
      ],
    },
  ],
};

function getInitials(name) {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function OrganizationTree() {
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState("tree"); // "tree" | "grid"
  const [collapsedNodes, setCollapsedNodes] = useState({});

  // Flatten all employees for quick search and stats
  const allMembers = useMemo(() => {
    const list = [];
    function traverse(node) {
      if (!node) return;
      if (!node.isDepartment) {
        list.push(node);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    }
    traverse(ORG_DATA);
    return list;
  }, []);

  // Department counts
  const departments = useMemo(() => {
    return [
      { id: "All", name: "All Departments", count: allMembers.length },
      ...ORG_DATA.children.map((d) => ({
        id: d.name,
        name: d.name,
        count: d.count,
        color: d.color,
      })),
    ];
  }, [allMembers]);

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
    traverse(ORG_DATA);
    setCollapsedNodes(next);
  };

  const zoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 1.6));
  const zoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.55));
  const resetZoom = () => setZoomLevel(1);

  // Search filter
  const isMatch = (node) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      node.name?.toLowerCase().includes(q) ||
      node.role?.toLowerCase().includes(q) ||
      node.department?.toLowerCase().includes(q) ||
      node.email?.toLowerCase().includes(q)
    );
  };

  // Check if department is visible
  const isDeptVisible = (deptName) => {
    if (selectedDept === "All") return true;
    return selectedDept === deptName;
  };

  return (
    <div className="org-tree-page">
      {/* Top Controls & Metrics Bar */}
      <div className="org-tree-topbar">
        <div className="org-stats-grid">
          <div className="org-stat-card">
            <div className="org-stat-icon org-stat-icon--purple">
              <Users size={18} />
            </div>
            <div>
              <div className="org-stat-value">{allMembers.length}</div>
              <div className="org-stat-label">Total Headcount</div>
            </div>
          </div>

          <div className="org-stat-card">
            <div className="org-stat-icon org-stat-icon--cyan">
              <Building2 size={18} />
            </div>
            <div>
              <div className="org-stat-value">{departments.length - 1}</div>
              <div className="org-stat-label">Departments</div>
            </div>
          </div>

          <div className="org-stat-card">
            <div className="org-stat-icon org-stat-icon--emerald">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="org-stat-value">7</div>
              <div className="org-stat-label">Managers & Leads</div>
            </div>
          </div>

          <div className="org-stat-card">
            <div className="org-stat-icon org-stat-icon--amber">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="org-stat-value">100%</div>
              <div className="org-stat-label">Active Status</div>
            </div>
          </div>
        </div>

        {/* Action / Search / View Controls */}
        <div className="org-controls-row">
          <div className="org-search-box">
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
                  selectedNode?.id === ORG_DATA.id ? "selected" : ""
                } ${isMatch(ORG_DATA) ? "matched" : ""}`}
                onClick={() => setSelectedNode(ORG_DATA)}
                role="button"
                tabIndex={0}
              >
                <div className="org-ceo-crown">
                  <Award size={13} />
                  <span>Executive Leadership</span>
                </div>

                <div className="org-node-body">
                  <div
                    className="org-node-avatar"
                    style={{ background: ORG_DATA.avatarColor }}
                  >
                    {getInitials(ORG_DATA.name)}
                    <span className="org-node-status-dot" title="Active" />
                  </div>

                  <div className="org-node-info">
                    <h3 className="org-node-name">{ORG_DATA.name}</h3>
                    <p className="org-node-role">{ORG_DATA.role}</p>
                    <span className="org-node-dept-badge org-node-dept-badge--exec">
                      Executive Board
                    </span>
                  </div>
                </div>

                <div className="org-node-footer">
                  <span className="org-node-reports-badge">
                    {departments.length - 1} Departments • {allMembers.length - 1} Employees
                  </span>

                  <button
                    type="button"
                    className="org-node-toggle-btn"
                    onClick={(e) => toggleCollapse(ORG_DATA.id, e)}
                    title={collapsedNodes[ORG_DATA.id] ? "Expand Tree" : "Collapse Tree"}
                    aria-label="Toggle node collapse"
                  >
                    {collapsedNodes[ORG_DATA.id] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>
              </div>

              {/* Vertical trunk connector */}
              {!collapsedNodes[ORG_DATA.id] && <div className="org-trunk-line" />}

              {/* Level 2: Departments & Teams Container */}
              {!collapsedNodes[ORG_DATA.id] && (
                <div className="org-departments-row">
                  {ORG_DATA.children
                    .filter((dept) => isDeptVisible(dept.name))
                    .map((dept) => {
                      const isDeptCollapsed = collapsedNodes[dept.id];
                      return (
                        <div key={dept.id} className="org-department-branch">
                          {/* Branch connector line from top crossbar */}
                          <div className="org-branch-connector" />

                          {/* Department Node Card */}
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
                                    {/* Manager Node Card */}
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
                                        <div
                                          className="org-node-avatar"
                                          style={{ background: manager.avatarColor }}
                                        >
                                          {getInitials(manager.name)}
                                          <span className="org-node-status-dot" title="Active" />
                                        </div>

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
                                                    <div
                                                      className="org-node-avatar org-node-avatar--sm"
                                                      style={{ background: emp.avatarColor }}
                                                    >
                                                      {getInitials(emp.name)}
                                                      <span className="org-node-status-dot" />
                                                    </div>

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
            {ORG_DATA.children
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
                          <div className="org-node-avatar" style={{ background: mgr.avatarColor }}>
                            {getInitials(mgr.name)}
                          </div>
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
                              <div className="org-node-avatar org-node-avatar--sm" style={{ background: member.avatarColor }}>
                                {getInitials(member.name)}
                              </div>
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

      {/* Selected Person Details Drawer */}
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
            {/* Profile Overview Card */}
            <div className="org-drawer-hero">
              <div
                className="org-drawer-avatar"
                style={{ background: selectedNode.avatarColor || "#7c3aed" }}
              >
                {getInitials(selectedNode.name)}
                <span className="org-drawer-status-ring" title={selectedNode.status || "Active"} />
              </div>

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

            {/* About / Bio */}
            {selectedNode.about && (
              <div className="org-drawer-section">
                <label className="org-drawer-section-title">ROLE & FOCUS</label>
                <p className="org-drawer-about-text">{selectedNode.about}</p>
              </div>
            )}

            {/* Contact & Employment Specs */}
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

            {/* Hierarchy Context: Reports To */}
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
                  <div className="org-drawer-rel-avatar">
                    {getInitials(selectedNode.reportsTo)}
                  </div>
                  <div>
                    <strong>{selectedNode.reportsTo}</strong>
                    <span>Direct Supervisor</span>
                  </div>
                  <ChevronRight size={15} className="org-drawer-arrow" />
                </div>
              </div>
            )}

            {/* Hierarchy Context: Direct Reports */}
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
                      <div
                        className="org-drawer-rel-avatar"
                        style={{ background: child.avatarColor || "#0891b2" }}
                      >
                        {getInitials(child.name)}
                      </div>
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

          {/* Quick Actions Footer */}
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
  );
}
