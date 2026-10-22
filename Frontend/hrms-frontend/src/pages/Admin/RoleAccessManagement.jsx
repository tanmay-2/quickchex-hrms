import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  User,
  Users,
  Building2,
  Search,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Info,
  X,
  ArrowLeft,
  Pencil,
  MapPin,
  Calendar,
  Home,
  Clock,
  TrendingUp,
  Settings,
  Filter,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import { getEmployeeDisplayName, getInitials } from "../../utils/employeeDisplay";
import {
  loadUnifiedEmployees,
  updateEmployeeRoleInStore,
  getStoredEmployees,
  saveStoredEmployees,
} from "../../utils/employeeStore";
import "./RoleAccessManagement.css";
import { getApiBaseUrl } from "../../services/apiClient";

const API_BASE = getApiBaseUrl();

/* ============================================================
   PERMISSION MODULES SPECIFICATION
   ============================================================ */
const PERMISSION_MODULES = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "directory", label: "Employee Directory", icon: Users },
  { id: "attendance", label: "Attendance", icon: Clock },
  { id: "leave", label: "Leave Management", icon: Calendar },
  { id: "reports", label: "Reports", icon: TrendingUp },
  { id: "settings", label: "Settings", icon: Settings },
];

function getDefaultPermissions(role) {
  const r = (role || "employee").toLowerCase();
  if (r === "admin") {
    return {
      dashboard: true,
      directory: true,
      attendance: true,
      leave: true,
      reports: true,
      settings: true,
    };
  }
  if (r === "manager") {
    return {
      dashboard: true,
      directory: true,
      attendance: true,
      leave: true,
      reports: true,
      settings: false,
    };
  }
  return {
    dashboard: true,
    directory: false,
    attendance: true,
    leave: true,
    reports: false,
    settings: false,
  };
}

function loadUserPermissions(empCode, role) {
  try {
    const raw = localStorage.getItem(`hrms_permissions_${empCode}`);
    if (raw) {
      return { ...getDefaultPermissions(role), ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn("Could not read permissions from storage:", err);
  }
  return getDefaultPermissions(role);
}

function saveUserPermissions(empCode, perms) {
  try {
    localStorage.setItem(`hrms_permissions_${empCode}`, JSON.stringify(perms));
  } catch (err) {
    console.warn("Could not save permissions to storage:", err);
  }
}

function formatJoinDate(val) {
  if (!val) return "Jan 15, 2024";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "Jan 15, 2024";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Jan 15, 2024";
  }
}

/* ============================================================
   EMPLOYEE AVATAR COMPONENT WITH REAL IMAGE & INITIALS FALLBACK
   ============================================================ */
export function getEmployeeAvatarUrl(emp) {
  if (!emp) return null;
  const raw =
    emp.profile_image ||
    emp.profileImage ||
    emp.avatar ||
    emp.avatar_url ||
    emp.photo ||
    emp.image_url;
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.trim();
  if (!clean || clean === "null" || clean === "undefined" || clean === "—") return null;
  if (/^https?:\/\//i.test(clean) || clean.startsWith("data:image/")) return clean;
  const normalized = clean.replace(/\\/g, "/");
  const uploadIdx = normalized.toLowerCase().indexOf("/uploads/");
  if (uploadIdx !== -1) {
    return normalized.slice(uploadIdx);
  }
  return `/${normalized.replace(/^\/+/, "")}`;
}

function RoleAccessAvatar({ user, size = 44, className = "" }) {
  const displayName = getEmployeeDisplayName(user);
  const initials = getInitials(displayName, user?.email || user?.emp_code);
  const role = (user?.role || "employee").toLowerCase();

  const getRoleColor = () => {
    if (role === "admin") return { bg: "#f5f3ff", color: "#7c3aed" };
    if (role === "manager") return { bg: "#eff6ff", color: "#2563eb" };
    return { bg: "#ecfdf5", color: "#059669" };
  };
  const roleColors = getRoleColor();

  return (
    <div
      className={`rap-avatar-box ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        position: "relative",
        overflow: "hidden",
        background: roleColors.bg,
        color: roleColors.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size >= 60 ? 22 : size >= 40 ? 14 : size >= 36 ? 12.5 : 11,
        letterSpacing: "0.02em",
        flexShrink: 0,
        border: "1.5px solid rgba(255, 255, 255, 0.95)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
        userSelect: "none",
      }}
      title={displayName}
      aria-label={displayName}
    >
      <span>{initials}</span>
    </div>
  );
}

/* ============================================================
   ROLE BADGE PILL COMPONENT (MATCHES EXACT REFERENCE STYLING)
   ============================================================ */
function RoleBadgePill({ role }) {
  const r = (role || "employee").toLowerCase();
  if (r === "admin") {
    return <span className="rap-badge-pill admin">Admin</span>;
  }
  if (r === "manager") {
    return <span className="rap-badge-pill manager">Manager</span>;
  }
  return <span className="rap-badge-pill employee">Employee</span>;
}

/* ============================================================
   ROOT COMPONENT WITH SHELL INTEGRATION
   ============================================================ */
export default function RoleAccessManagement(props) {
  const isInsideShell = useContext(DashboardShellContext);

  if (!isInsideShell) {
    return (
      <DashboardShell
        customTitle="Role Access"
        customSubtitle="Manage portal access, roles, permissions, and user privileges."
      >
        <RoleAccessManagementContent {...props} />
      </DashboardShell>
    );
  }

  return <RoleAccessManagementContent {...props} />;
}

/* ============================================================
   CONTENT COMPONENT
   ============================================================ */
function RoleAccessManagementContent() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [updatingEmpCode, setUpdatingEmpCode] = useState(null);
  const [toast, setToast] = useState(null);

  // Mobile navigation: selectedMember !== null triggers Screen 2 (User Details)
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberRole, setMemberRole] = useState("employee");
  const [memberPermissions, setMemberPermissions] = useState(getDefaultPermissions("employee"));
  const [isSaving, setIsSaving] = useState(false);

  // Department Dropdown state
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef(null);
  const roleSelectRef = useRef(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Close department dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target)) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const fetchUsers = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const list = await loadUnifiedEmployees();
      setUsers(list || []);
    } catch (err) {
      console.error("Error loading users:", err);
      showToast("Unable to load team member access list. Please try again.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Quick role change from desktop table
  const handleRoleChange = async (empCode, newRole, userName) => {
    if (!empCode || !newRole) return;
    setUpdatingEmpCode(empCode);

    try {
      const roleDisplay = newRole.charAt(0).toUpperCase() + newRole.slice(1);

      setUsers((prev) =>
        prev.map((u) =>
          u.emp_code === empCode || u.id === empCode
            ? { ...u, role: newRole, designation: newRole === "admin" ? "Admin" : newRole === "manager" ? "Manager" : u.designation }
            : u
        )
      );

      await updateEmployeeRoleInStore(empCode, newRole);
      showToast(`Access updated: ${userName} is now assigned ${roleDisplay} Portal access!`, "success");
    } catch (err) {
      console.error("Role update failed:", err);
      showToast(err.message || "Failed to update role access. Try again.", "error");
    } finally {
      setUpdatingEmpCode(null);
    }
  };

  // Derive unique departments dynamically from backend user records
  const departments = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      if (u.department && u.department.trim()) {
        set.add(u.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [users]);

  // Overall stats
  const stats = useMemo(() => {
    const total = users.length;
    const admin = users.filter((u) => (u.role || "").toLowerCase() === "admin").length;
    const manager = users.filter((u) => (u.role || "").toLowerCase() === "manager").length;
    const employee = users.filter((u) => {
      const r = (u.role || "employee").toLowerCase();
      return r === "employee" || (r !== "admin" && r !== "manager");
    }).length;
    return { total, admin, manager, employee };
  }, [users]);

  // Step 1: Filter by search and department (to compute dynamic tab counts)
  const deptAndSearchFiltered = useMemo(() => {
    return users.filter((user) => {
      // Dept filter
      if (
        selectedDeptFilter !== "all" &&
        (user.department || "").trim().toLowerCase() !== selectedDeptFilter.trim().toLowerCase()
      ) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (user.name || "").toLowerCase().includes(q);
        const matchesCode = (user.emp_code || "").toLowerCase().includes(q);
        const matchesEmail = (user.email || "").toLowerCase().includes(q);
        const matchesDesig = (user.designation || "").toLowerCase().includes(q);
        const matchesDept = (user.department || "").toLowerCase().includes(q);
        return matchesName || matchesCode || matchesEmail || matchesDesig || matchesDept;
      }
      return true;
    });
  }, [users, selectedDeptFilter, searchQuery]);

  // Dynamic tab counts based on active department & search query
  const dynamicTabCounts = useMemo(() => {
    const all = deptAndSearchFiltered.length;
    const employee = deptAndSearchFiltered.filter((u) => {
      const r = (u.role || "employee").toLowerCase();
      return r === "employee" || (r !== "admin" && r !== "manager");
    }).length;
    const manager = deptAndSearchFiltered.filter(
      (u) => (u.role || "").toLowerCase() === "manager"
    ).length;
    const admin = deptAndSearchFiltered.filter(
      (u) => (u.role || "").toLowerCase() === "admin"
    ).length;
    return { all, employee, manager, admin };
  }, [deptAndSearchFiltered]);

  // Step 2: Filter by selected role filter
  const filteredUsers = useMemo(() => {
    if (selectedRoleFilter === "all") return deptAndSearchFiltered;
    return deptAndSearchFiltered.filter((u) => {
      const r = (u.role || "employee").toLowerCase();
      if (selectedRoleFilter === "employee") {
        return r === "employee" || (r !== "admin" && r !== "manager");
      }
      if (selectedRoleFilter === "manager") return r === "manager";
      if (selectedRoleFilter === "admin") return r === "admin";
      return true;
    });
  }, [deptAndSearchFiltered, selectedRoleFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedDeptFilter, selectedRoleFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredUsers.length);
  const pageItems = filteredUsers.slice(startIndex, endIndex);

  const pageNumbers = useMemo(() => {
    const list = [];
    for (let i = 1; i <= totalPages; i++) {
      list.push(i);
    }
    return list;
  }, [totalPages]);

  // Open Screen 2: User Role & Access Details
  const handleSelectMember = (user) => {
    const curRole = (user.role || "employee").toLowerCase();
    setSelectedMember(user);
    setMemberRole(curRole);
    setMemberPermissions(loadUserPermissions(user.emp_code, curRole));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Toggle single permission
  const handleTogglePermission = (modId) => {
    setMemberPermissions((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  // Save changes in Screen 2
  const handleSaveMemberChanges = async () => {
    if (!selectedMember) return;
    setIsSaving(true);
    const empCode = selectedMember.emp_code || selectedMember.id;
    const newRole = memberRole.toLowerCase();

    try {
      // 1. Update backend & unified store
      await updateEmployeeRoleInStore(empCode, newRole);

      // 2. Save permissions to localStorage
      saveUserPermissions(empCode, memberPermissions);

      // 3. Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.emp_code === empCode || u.id === empCode
            ? {
                ...u,
                role: newRole,
                designation:
                  newRole === "admin"
                    ? "Admin"
                    : newRole === "manager"
                    ? "Manager"
                    : u.designation,
              }
            : u
        )
      );

      setSelectedMember((prev) => ({
        ...prev,
        role: newRole,
        designation:
          newRole === "admin"
            ? "Admin"
            : newRole === "manager"
            ? "Manager"
            : prev.designation,
      }));

      const roleName = newRole.charAt(0).toUpperCase() + newRole.slice(1);
      const displayName = getEmployeeDisplayName(selectedMember);
      showToast(
        `Access updated: ${displayName} permissions and ${roleName} role saved successfully!`,
        "success"
      );
    } catch (err) {
      console.error("Save failed:", err);
      showToast("Failed to save changes. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="role-access-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`rap-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         MOBILE VIEW (<=768px): EXACT REFERENCE IMPLEMENTATION
         Screens 1, 2, and 3
         ═══════════════════════════════════════════════════════════════ */}
      <div className="rap-mobile-only">
        {selectedMember ? (
          /* ── SCREEN 2: USER ROLE & ACCESS DETAILS ── */
          <div className="rap-mob-detail-view">
            {/* Back Button */}
            <button
              type="button"
              className="rap-mob-back-btn"
              onClick={() => setSelectedMember(null)}
              aria-label="Back to Role Access"
            >
              <ArrowLeft size={16} />
              <span>Back to Role Access</span>
            </button>

            {/* Profile Overview Card */}
            <div className="rap-mob-profile-card">
              <div className="rap-mob-profile-head">
                <RoleAccessAvatar user={selectedMember} size={72} className="rap-detail-avatar" />
                <div className="rap-mob-profile-titles">
                  <h3 className="rap-mob-profile-name">
                    {getEmployeeDisplayName(selectedMember)}
                  </h3>
                  <div className="rap-mob-profile-badge-row">
                    <RoleBadgePill role={selectedMember.role} />
                  </div>
                  <span className="rap-mob-profile-code">{selectedMember.emp_code}</span>
                </div>
              </div>

              {/* Profile Contact & Info Items */}
              <div className="rap-mob-info-list">
                <div className="rap-mob-info-item" title={selectedMember.email}>
                  <Mail size={14} className="rap-mob-info-icon" />
                  <span>{selectedMember.email || "No email"}</span>
                </div>
                <div className="rap-mob-info-item">
                  <Phone size={14} className="rap-mob-info-icon" />
                  <span>
                    {selectedMember.phone ||
                      selectedMember.mobile_no ||
                      selectedMember.mobile ||
                      "+91 99999 99999"}
                  </span>
                </div>
                <div className="rap-mob-info-item">
                  <MapPin size={14} className="rap-mob-info-icon" />
                  <span>{selectedMember.location || "Mumbai, IN"}</span>
                </div>
                <div className="rap-mob-info-item">
                  <Building2 size={14} className="rap-mob-info-icon" />
                  <span>{selectedMember.department || "General"}</span>
                </div>
                <div className="rap-mob-info-item">
                  <Calendar size={14} className="rap-mob-info-icon" />
                  <span>
                    Joined{" "}
                    {formatJoinDate(
                      selectedMember.joined || selectedMember.emp_join_date
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Role & Access Card */}
            <div className="rap-mob-card">
              <div className="rap-mob-card-head">
                <h4 className="rap-mob-card-title">Role & Access</h4>
                <button
                  type="button"
                  className="rap-mob-edit-pill-btn"
                  onClick={() => roleSelectRef.current?.focus()}
                >
                  <Pencil size={12} />
                  <span>Edit Role</span>
                </button>
              </div>

              <div className="rap-mob-role-row">
                <span className="rap-mob-role-label">Role</span>
                <div className="rap-mob-select-wrapper">
                  <select
                    ref={roleSelectRef}
                    value={memberRole}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      setMemberRole(nextRole);
                      setMemberPermissions(getDefaultPermissions(nextRole));
                    }}
                    className="rap-mob-role-select"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                    <option value="teamleader">Team Leader</option>
                  </select>
                  <ChevronDown size={14} className="rap-mob-select-arrow" />
                </div>
              </div>
            </div>

            {/* Permissions Card */}
            <div className="rap-mob-card">
              <div className="rap-mob-card-head">
                <h4 className="rap-mob-card-title">Permissions</h4>
                <button
                  type="button"
                  className="rap-mob-edit-pill-btn"
                  onClick={() => {
                    showToast("You can toggle each permission module switch below.", "info");
                  }}
                >
                  <Pencil size={12} />
                  <span>Edit Permissions</span>
                </button>
              </div>

              <div className="rap-mob-perms-list">
                {PERMISSION_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const isEnabled = !!memberPermissions[mod.id];
                  return (
                    <div key={mod.id} className="rap-mob-perm-row">
                      <div className="rap-mob-perm-left">
                        <Icon size={16} className="rap-mob-perm-icon" />
                        <span className="rap-mob-perm-name">{mod.label}</span>
                      </div>
                      <button
                        type="button"
                        className={`rap-mob-toggle ${isEnabled ? "is-on" : ""}`}
                        onClick={() => handleTogglePermission(mod.id)}
                        role="switch"
                        aria-checked={isEnabled}
                        aria-label={`Toggle permission for ${mod.label}`}
                      >
                        <span className="rap-mob-toggle-thumb" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Changes Button */}
            <button
              type="button"
              className="rap-mob-save-btn"
              onClick={handleSaveMemberChanges}
              disabled={isSaving}
            >
              {isSaving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        ) : (
          /* ── SCREEN 1 & SCREEN 3: ROLE ACCESS LIST ── */
          <div className="rap-mob-list-view">
            {/* Search Bar */}
            <div className="rap-mob-search-row">
              <Search size={16} className="rap-mob-search-icon" />
              <input
                type="text"
                className="rap-mob-search-input"
                placeholder="Search by name, ID, email, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="rap-mob-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Department Dropdown */}
            <div className="rap-mob-dept-dropdown-wrap" ref={deptDropdownRef}>
              <button
                type="button"
                className="rap-mob-dept-btn"
                onClick={() => setDeptDropdownOpen((v) => !v)}
              >
                <Building2 size={16} className="rap-mob-dept-icon" />
                <span className="rap-mob-dept-label">
                  {selectedDeptFilter === "all" ? "All Departments" : selectedDeptFilter}
                </span>
                <ChevronDown size={15} className="rap-mob-dept-arrow" />
              </button>

              {deptDropdownOpen && (
                <div className="rap-mob-dept-menu">
                  <button
                    type="button"
                    className={`rap-mob-dept-item ${
                      selectedDeptFilter === "all" ? "is-selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedDeptFilter("all");
                      setDeptDropdownOpen(false);
                    }}
                  >
                    <span>All Departments</span>
                    {selectedDeptFilter === "all" && <Check size={14} />}
                  </button>
                  {departments.map((dept) => (
                    <button
                      type="button"
                      key={dept}
                      className={`rap-mob-dept-item ${
                        selectedDeptFilter === dept ? "is-selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedDeptFilter(dept);
                        setDeptDropdownOpen(false);
                      }}
                    >
                      <span>{dept}</span>
                      {selectedDeptFilter === dept && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Role Filter Tabs (Dynamic Counts matching Screen 1 & 3) */}
            <div className="rap-mob-tabs-row">
              <button
                type="button"
                id="rap-mob-tab-all"
                className={`rap-mob-tab-btn ${
                  selectedRoleFilter === "all" ? "is-active" : ""
                }`}
                onClick={() => setSelectedRoleFilter("all")}
              >
                <span className="rap-mob-tab-label">All</span>
                <span className="rap-mob-tab-count">{dynamicTabCounts.all}</span>
              </button>

              <button
                type="button"
                id="rap-mob-tab-employee"
                className={`rap-mob-tab-btn ${
                  selectedRoleFilter === "employee" ? "is-active" : ""
                }`}
                onClick={() => setSelectedRoleFilter("employee")}
              >
                <span className="rap-mob-tab-label">Employees</span>
                <span className="rap-mob-tab-count">{dynamicTabCounts.employee}</span>
              </button>

              <button
                type="button"
                id="rap-mob-tab-manager"
                className={`rap-mob-tab-btn ${
                  selectedRoleFilter === "manager" ? "is-active" : ""
                }`}
                onClick={() => setSelectedRoleFilter("manager")}
              >
                <span className="rap-mob-tab-label">Managers</span>
                <span className="rap-mob-tab-count">{dynamicTabCounts.manager}</span>
              </button>
            </div>

            {/* Section Column Headers (TEAM MEMBERS | CONTACT DETAILS) */}
            <div className="rap-mob-col-headers">
              <span className="rap-mob-col-header left">TEAM MEMBERS</span>
              <span className="rap-mob-col-header right">CONTACT DETAILS</span>
            </div>

            {/* Member Cards List */}
            <div className="rap-mob-cards-wrap">
              {loading ? (
                <div className="rap-mob-state-box">
                  <RefreshCw size={24} className="rap-spinner" />
                  <p>Loading team access profiles...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="rap-mob-state-box">
                  <Users size={32} style={{ color: "#94a3b8" }} />
                  <h4>No team members found</h4>
                  <p>Try adjusting your search query or department filter.</p>
                </div>
              ) : (
                pageItems.map((user) => {
                  const currentRole = (user.role || "employee").toLowerCase();
                  return (
                    <div
                      key={user.emp_code || user.id}
                      className="rap-mob-row-card"
                      onClick={() => handleSelectMember(user)}
                      role="button"
                      tabIndex={0}
                    >
                      {/* Left: Avatar + Name + ID + Role Badge */}
                      <div className="rap-mob-row-left">
                        <RoleAccessAvatar user={user} size={44} />
                        <div className="rap-mob-row-info">
                          <span className="rap-mob-row-name">
                            {getEmployeeDisplayName(user)}
                          </span>
                          <span className="rap-mob-row-code">{user.emp_code}</span>
                          <div className="rap-mob-row-badge-wrap">
                            <RoleBadgePill role={currentRole} />
                          </div>
                        </div>
                      </div>

                      {/* Right: Email + Phone + Chevron */}
                      <div className="rap-mob-row-right">
                        <div className="rap-mob-row-contact-info">
                          <div className="rap-mob-contact-line" title={user.email}>
                            <Mail size={12} className="rap-mob-contact-icon" />
                            <span className="rap-mob-contact-text">
                              {user.email || "No email"}
                            </span>
                          </div>
                          <div className="rap-mob-contact-line">
                            <Phone size={12} className="rap-mob-contact-icon" />
                            <span className="rap-mob-contact-text">
                              {user.phone ||
                                user.mobile_no ||
                                user.mobile ||
                                "+91 99999 99999"}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={17} className="rap-mob-row-chevron" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Mobile Pagination */}
            {filteredUsers.length > 0 && (
              <div className="rap-mob-pagination">
                <span className="rap-mob-pagination-info">
                  Showing <strong>{filteredUsers.length === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of{" "}
                  <strong>{filteredUsers.length}</strong> members
                </span>
                <div className="rap-mob-pagination-btns">
                  <button
                    type="button"
                    className="rap-mob-page-btn arrow"
                    disabled={safePage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {pageNumbers.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`rap-mob-page-btn ${n === safePage ? "is-active" : ""}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="rap-mob-page-btn arrow"
                    disabled={safePage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
         DESKTOP VIEW (>768px): PRESERVED AND UNALTERED
         ═══════════════════════════════════════════════════════════════ */}
      <div className="rap-desktop-only">
        {/* Top Action Row: Refresh button */}
        <div className="rap-actions-row">
          <button
            type="button"
            className="rap-btn-secondary"
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            title="Refresh access records"
          >
            <RefreshCw size={14} className={refreshing ? "rap-spinner" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* KPI Overview Cards */}
        <section className="rap-stats-grid">
          <div
            className={`rap-stat-card ${selectedRoleFilter === "all" ? "is-active" : ""}`}
            onClick={() => setSelectedRoleFilter("all")}
          >
            <div className="rap-stat-top">
              <span className="rap-stat-label">Total Accounts</span>
              <div className="rap-stat-icon-wrap all">
                <Users size={18} />
              </div>
            </div>
            <div className="rap-stat-body">
              <span className="rap-stat-value">{stats.total}</span>
              <span className="rap-stat-hint">All company profiles</span>
            </div>
          </div>

          <div
            className={`rap-stat-card ${selectedRoleFilter === "employee" ? "is-active" : ""}`}
            onClick={() => setSelectedRoleFilter("employee")}
          >
            <div className="rap-stat-top">
              <span className="rap-stat-label">Employee Portal</span>
              <div className="rap-stat-icon-wrap employee">
                <User size={18} />
              </div>
            </div>
            <div className="rap-stat-body">
              <span className="rap-stat-value">{stats.employee}</span>
              <span className="rap-stat-hint">Standard self-service</span>
            </div>
          </div>

          <div
            className={`rap-stat-card ${selectedRoleFilter === "manager" ? "is-active" : ""}`}
            onClick={() => setSelectedRoleFilter("manager")}
          >
            <div className="rap-stat-top">
              <span className="rap-stat-label">Manager Portal</span>
              <div className="rap-stat-icon-wrap manager">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="rap-stat-body">
              <span className="rap-stat-value">{stats.manager}</span>
              <span className="rap-stat-hint">Team review & approval</span>
            </div>
          </div>

          <div
            className={`rap-stat-card ${selectedRoleFilter === "admin" ? "is-active" : ""}`}
            onClick={() => setSelectedRoleFilter("admin")}
          >
            <div className="rap-stat-top">
              <span className="rap-stat-label">Admin Portal</span>
              <div className="rap-stat-icon-wrap admin">
                <ShieldAlert size={18} />
              </div>
            </div>
            <div className="rap-stat-body">
              <span className="rap-stat-value">{stats.admin}</span>
              <span className="rap-stat-hint">Full RBAC control</span>
            </div>
          </div>
        </section>

        {/* Info Banner */}
        <div className="rap-info-banner">
          <Info size={18} className="rap-info-icon" />
          <div>
            <strong>Instant Access Switch:</strong> Changing a user's role updates their profile immediately. After verifying the one-time code sent to their work email, they are redirected to their designated portal.
          </div>
        </div>

        {/* Desktop Table Card */}
        <section className="rap-table-card">
          <div className="rap-toolbar">
            <div className="rap-search-wrap">
              <input
                type="text"
                className="rap-search-input"
                placeholder="Search by name, ID, email, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="rap-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="rap-toolbar-controls">
              {/* Department Filter */}
              <div className="rap-dropdown-wrap" ref={deptDropdownRef}>
                <button
                  type="button"
                  className="rap-dropdown-btn"
                  onClick={() => setDeptDropdownOpen((v) => !v)}
                >
                  <Building2 size={14} style={{ color: "var(--rap-text-muted)" }} />
                  <span>
                    {selectedDeptFilter === "all"
                      ? "All Departments"
                      : selectedDeptFilter}
                  </span>
                  <ChevronDown size={13} />
                </button>

                {deptDropdownOpen && (
                  <div className="rap-dropdown-menu">
                    <button
                      type="button"
                      className={`rap-dropdown-item ${
                        selectedDeptFilter === "all" ? "is-selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedDeptFilter("all");
                        setDeptDropdownOpen(false);
                      }}
                    >
                      <span>All Departments</span>
                      {selectedDeptFilter === "all" && <Check size={13} />}
                    </button>
                    {departments.map((dept) => (
                      <button
                        type="button"
                        key={dept}
                        className={`rap-dropdown-item ${
                          selectedDeptFilter === dept ? "is-selected" : ""
                        }`}
                        onClick={() => {
                          setSelectedDeptFilter(dept);
                          setDeptDropdownOpen(false);
                        }}
                      >
                        <span>{dept}</span>
                        {selectedDeptFilter === dept && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Role Filter Tabs */}
              <div className="rap-filter-pills">
                <button
                  type="button"
                  className={`rap-pill-btn ${
                    selectedRoleFilter === "all" ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedRoleFilter("all")}
                >
                  All ({stats.total})
                </button>
                <button
                  type="button"
                  className={`rap-pill-btn ${
                    selectedRoleFilter === "employee" ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedRoleFilter("employee")}
                >
                  Employees ({stats.employee})
                </button>
                <button
                  type="button"
                  className={`rap-pill-btn ${
                    selectedRoleFilter === "manager" ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedRoleFilter("manager")}
                >
                  Managers ({stats.manager})
                </button>
                <button
                  type="button"
                  className={`rap-pill-btn ${
                    selectedRoleFilter === "admin" ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedRoleFilter("admin")}
                >
                  Admins ({stats.admin})
                </button>
              </div>
            </div>
          </div>

          <div className="rap-table-scroll">
            <table className="rap-table">
              <thead>
                <tr>
                  <th>TEAM MEMBER</th>
                  <th>CONTACT DETAILS</th>
                  <th>DEPARTMENT & DESIGNATION</th>
                  <th>CURRENT STATUS</th>
                  <th style={{ textAlign: "right" }}>SELECT PORTAL ACCESS</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "48px 24px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--rap-text-muted)" }}>
                        <RefreshCw size={20} className="rap-spinner" />
                        <span>Loading team access profiles...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "48px 24px", color: "var(--rap-text-muted)" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <Users size={32} style={{ color: "var(--rap-text-faint)" }} />
                        <p style={{ margin: 0, fontWeight: 600, color: "var(--rap-text)" }}>
                          No team members found
                        </p>
                        <p style={{ margin: 0, fontSize: "13px" }}>
                          Try adjusting your search query or department filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const currentRole = (user.role || "employee").toLowerCase();
                    const isUpdating = updatingEmpCode === user.emp_code;

                    return (
                      <tr key={user.emp_code}>
                        <td>
                          <div className="rap-user-cell">
                            <RoleAccessAvatar user={user} size={36} />
                            <div className="rap-user-info">
                              <span className="rap-user-name">{getEmployeeDisplayName(user)}</span>
                              <span className="rap-emp-code">{user.emp_code}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="rap-contact-cell">
                            <div className="rap-contact-line" title={user.email}>
                              <Mail size={13} className="rap-contact-icon" />
                              <span>{user.email || "No email"}</span>
                            </div>
                            <div className="rap-contact-line">
                              <Phone size={13} className="rap-contact-icon" />
                              <span>
                                {user.phone ||
                                  user.mobile_no ||
                                  user.mobile ||
                                  "+91 99999 99999"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="rap-dept-cell">
                            <span className="rap-desig">{user.designation || "Team Member"}</span>
                            <span className="rap-dept">{user.department || "General"}</span>
                          </div>
                        </td>

                        <td>
                          <RoleBadgePill role={currentRole} />
                        </td>

                        <td style={{ textAlign: "right" }}>
                          {isUpdating ? (
                            <div className="rap-updating-cell">
                              <RefreshCw size={14} className="rap-spinner" />
                              <span>Updating...</span>
                            </div>
                          ) : (
                            <div className="rap-switch-group">
                              <button
                                type="button"
                                className={`rap-switch-btn ${
                                  currentRole === "employee" ? "is-selected" : ""
                                }`}
                                onClick={() => handleRoleChange(user.emp_code, "employee", user.name)}
                                title="Grant Employee Portal Access"
                              >
                                Employee
                              </button>

                              <button
                                type="button"
                                className={`rap-switch-btn ${
                                  currentRole === "manager" ? "is-selected" : ""
                                }`}
                                onClick={() => handleRoleChange(user.emp_code, "manager", user.name)}
                                title="Grant Manager Portal Access"
                              >
                                Manager
                              </button>

                              <button
                                type="button"
                                className={`rap-switch-btn ${
                                  currentRole === "admin" ? "is-selected" : ""
                                }`}
                                onClick={() => handleRoleChange(user.emp_code, "admin", user.name)}
                                title="Grant Admin Portal Access"
                              >
                                Admin
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="rap-table-footer">
            <span>
              Showing <b>{filteredUsers.length}</b> of <b>{users.length}</b> team members
            </span>
            <div className="rap-legend">
              <span className="rap-legend-item">
                <span className="rap-legend-dot emp" /> Employee
              </span>
              <span className="rap-legend-item">
                <span className="rap-legend-dot mgr" /> Manager
              </span>
              <span className="rap-legend-item">
                <span className="rap-legend-dot adm" /> Admin
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
