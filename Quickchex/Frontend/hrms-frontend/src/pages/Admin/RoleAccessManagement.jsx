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
  ChevronDown,
  Info,
  X,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import { getEmployeeDisplayName, getInitials } from "../../utils/employeeDisplay";
import { loadUnifiedEmployees, updateEmployeeRoleInStore } from "../../utils/employeeStore";
import "./RoleAccessManagement.css";

const API_BASE = (import.meta.env.VITE_API_URL || "https://quickchex-backend.onrender.com").replace(/\/$/, "");

/* ============================================================
   ROOT COMPONENT WITH SHELL INTEGRATION
   ============================================================ */
export default function RoleAccessManagement(props) {
  const isInsideShell = useContext(DashboardShellContext);

  if (!isInsideShell) {
    return (
      <DashboardShell
        customTitle="Role & Access Control"
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

  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef(null);

  const token = localStorage.getItem("token") || localStorage.getItem("authToken");

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

  const handleRoleChange = async (empCode, newRole, userName) => {
    if (!empCode || !newRole) return;
    setUpdatingEmpCode(empCode);

    try {
      const roleDisplay = newRole.charAt(0).toUpperCase() + newRole.slice(1);

      // Update local state directly for instant feedback
      setUsers((prev) =>
        prev.map((u) => (u.emp_code === empCode || u.id === empCode ? { ...u, role: newRole } : u))
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

  // Derive unique departments
  const departments = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      if (u.department) set.add(u.department.trim());
    });
    return Array.from(set).sort();
  }, [users]);

  // Derive statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admin = users.filter((u) => u.role === "admin").length;
    const manager = users.filter((u) => u.role === "manager").length;
    const employee = users.filter((u) => u.role !== "admin" && u.role !== "manager").length;
    return { total, admin, manager, employee };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Role filter
      if (selectedRoleFilter === "admin" && user.role !== "admin") return false;
      if (selectedRoleFilter === "manager" && user.role !== "manager") return false;
      if (
        selectedRoleFilter === "employee" &&
        (user.role === "admin" || user.role === "manager")
      ) {
        return false;
      }

      // Department filter
      if (
        selectedDeptFilter !== "all" &&
        (user.department || "").toLowerCase() !== selectedDeptFilter.toLowerCase()
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
  }, [users, selectedRoleFilter, selectedDeptFilter, searchQuery]);

  const getRoleBadge = (role) => {
    const r = (role || "employee").toLowerCase();
    if (r === "admin") {
      return (
        <span className="rap-role-badge admin">
          <ShieldAlert size={13} /> Admin Access
        </span>
      );
    }
    if (r === "manager") {
      return (
        <span className="rap-role-badge manager">
          <ShieldCheck size={13} /> Manager Access
        </span>
      );
    }
    return (
      <span className="rap-role-badge employee">
        <User size={13} /> Employee Access
      </span>
    );
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

      {/* ── TOP ACTION ROW: Right-aligned Refresh button directly below header ── */}
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

      {/* ── KPI OVERVIEW CARDS (4-COL GRID) ── */}
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

      {/* ── INFO BANNER ── */}
      <div className="rap-info-banner">
        <Info size={18} className="rap-info-icon" />
        <div>
          <strong>Instant Access Switch:</strong> Changing a user's role updates their profile immediately. When they log in with their email/ID and OTP (<code>123456</code>), they are automatically redirected to their designated portal.
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <section className="rap-table-card">
        {/* Toolbar */}
        <div className="rap-toolbar">
          {/* Search Input */}
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

        {/* Table Content */}
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
                      {/* Team Member */}
                      <td>
                        <div className="rap-user-cell">
                          <div className={`rap-avatar ${currentRole}`}>
                            {getInitials(user.name, user.email || user.emp_code)}
                          </div>
                          <div className="rap-user-info">
                            <span className="rap-user-name">{getEmployeeDisplayName(user)}</span>
                            <span className="rap-emp-code">{user.emp_code}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div className="rap-contact-cell">
                          <Mail size={13} />
                          <span>{user.email || "No email"}</span>
                        </div>
                      </td>

                      {/* Department & Designation */}
                      <td>
                        <div className="rap-dept-cell">
                          <span className="rap-desig">{user.designation || "Team Member"}</span>
                          <span className="rap-dept">{user.department || "General"}</span>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td>
                        {getRoleBadge(currentRole)}
                      </td>

                      {/* Select Portal Access */}
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

        {/* Footer Summary */}
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
  );
}
