import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Check,
  X,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  Calendar,
  Layers,
  ChevronDown,
  ArrowUpDown,
  User,
  Building,
  RefreshCw,
} from "lucide-react";
import {
  PiClipboardTextBold,
  PiCalendarCheckBold,
  PiClockCounterClockwiseBold,
  PiTableBold,
  PiIdentificationBadgeBold,
} from "react-icons/pi";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./PendingRequests.css";
import { getApiBaseUrl, getApiUrl } from "../../services/apiClient";

/* =========================================================
   HELPERS
   ========================================================= */

const getAdminName = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    return (
      u.name ||
      `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
      localStorage.getItem("user_name") ||
      "Admin Approver"
    );
  } catch {
    return localStorage.getItem("user_name") || "Admin Approver";
  }
};

const getToken = () => localStorage.getItem("token") || "";

const getInitials = (name) => {
  if (!name) return "??";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  "#6c2bd9",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#06b6d4",
  "#6366f1",
  "#d946ef",
  "#14b8a6",
];

const getAvatarColor = (str) => {
  if (!str) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const PendingRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedModalReq, setSelectedModalReq] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  // Reject reason modal state
  const [rejectModal, setRejectModal] = useState(null); // { id, rawId, category }
  const [rejectReason, setRejectReason] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    const baseUrl = getApiBaseUrl();
    const headers = { Authorization: `Bearer ${getToken()}` };
    try {
      const [regRes, leaveRes] = await Promise.all([
        fetch(`${baseUrl}/api/v1/regularization/admin/all`, { headers }).catch(() => null),
        fetch(`${baseUrl}/api/v1/leaves/admin/all`, { headers }).catch(() => null),
      ]);

      const regData = regRes && regRes.ok ? await regRes.json() : [];
      const leaveData = leaveRes && leaveRes.ok ? await leaveRes.json() : [];

      const regList = (Array.isArray(regData) ? regData : []).map((r) => {
        const empName = r.employeeName || r.name || r.emp_code || "Employee";
        return {
          id: `REG-${r.id}`,
          rawId: r.id,
          employeeName: empName,
          employeeId: r.emp_code || r.employeeId || "EMP",
          department: r.department || "General",
          avatar: getInitials(empName),
          avatarColor: getAvatarColor(empName),
          type: "Regularization",
          category: "regularization",
          priority: r.priority || "Medium",
          appliedDate: r.appliedDate || r.requestDate || "",
          effectiveDate: r.effectiveDate || r.targetDate || "",
          details:
            r.details ||
            (r.inTime || r.outTime
              ? `In: ${r.inTime || "--"}, Out: ${r.outTime || "--"}`
              : "Regularization correction"),
          reason: r.reason || r.comment || "Regularization adjustment",
          status: r.status || "Pending",
          approver: r.approver || getAdminName(),
        };
      });

      const leaveList = (Array.isArray(leaveData) ? leaveData : []).map((l) => {
        const empName = l.name || l.employee_name || l.emp_code || "Employee";
        const startDate = l.startDate || l.start_date || "";
        const endDate = l.endDate || l.end_date || "";
        const effectivePeriod =
          startDate && endDate
            ? `${startDate} - ${endDate}`
            : startDate || endDate || "Flexible";

        return {
          id: `LV-${l.id}`,
          rawId: l.id,
          employeeName: empName,
          employeeId: l.empCode || l.emp_code || "EMP",
          department: l.department || "General",
          avatar: getInitials(empName),
          avatarColor: getAvatarColor(empName),
          type: "Leave",
          category: "leave",
          priority: "Normal",
          appliedDate: l.startDate || l.start_date || "Today",
          effectiveDate: effectivePeriod,
          details: `${l.category || "Leave"} • ${l.days || l.total_days || 1} day(s)`,
          reason: l.reason || "Leave application",
          status: l.status || "Pending",
          approver: l.approver || getAdminName(),
        };
      });

      const merged = [...regList, ...leaveList].sort((a, b) => {
        if (a.status === "Pending" && b.status !== "Pending") return -1;
        if (a.status !== "Pending" && b.status === "Pending") return 1;
        return b.rawId - a.rawId;
      });

      setRequests(merged);
    } catch (err) {
      console.error("Failed to fetch pending requests:", err);
      if (!silent) setRequests([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden")) return;
      fetchRequests(true);
    }, 30000);

    const handleSync = () => {
      if (typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden")) return;
      fetchRequests(true);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden && document.visibilityState === "visible") {
        fetchRequests(true);
      }
    };

    window.addEventListener("focus", handleSync);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("leave-applied", handleSync);
    window.addEventListener("leave-balance-updated", handleSync);
    window.addEventListener("regularization-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("leave-applied", handleSync);
      window.removeEventListener("leave-balance-updated", handleSync);
      window.removeEventListener("regularization-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const kpiSummary = useMemo(() => {
    // A request is "pending" if it is in any state awaiting action
    const isPending = (r) => {
      const s = (r.status || "").toUpperCase();
      return s.includes("PENDING") || s === "PENDING" || s === "" ;
    };
    const pendingAll = requests.filter(isPending);
    const pendingLeaves = pendingAll.filter((r) => r.category === "leave").length;
    const pendingRegs = pendingAll.filter((r) => r.category === "regularization").length;
    const pendingTimesheets = pendingAll.filter((r) => r.category === "timesheet").length;
    const pendingDocs = pendingAll.filter((r) => r.category === "document").length;

    return [
      { label: "Total Pending", value: String(pendingAll.length), key: "all", icon: PiClipboardTextBold, tone: "purple" },
      { label: "Leave Applications", value: String(pendingLeaves), key: "leave", icon: PiCalendarCheckBold, tone: "pink" },
      { label: "Regularizations", value: String(pendingRegs), key: "regularization", icon: PiClockCounterClockwiseBold, tone: "orange" },
      { label: "Timesheets", value: String(pendingTimesheets), key: "timesheet", icon: PiTableBold, tone: "blue" },
      { label: "Profile / Docs", value: String(pendingDocs), key: "document", icon: PiIdentificationBadgeBold, tone: "green" },
    ];
  }, [requests]);

  const departments = useMemo(() => {
    const depts = new Set();
    requests.forEach((r) => {
      if (r.department && r.department.trim()) depts.add(r.department.trim());
    });
    return Array.from(depts);
  }, [requests]);

  const handleApprove = async (id, e) => {
    if (e) e.stopPropagation();
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const baseUrl = getApiBaseUrl();
    const token = getToken();
    try {
      if (req.category === "regularization") {
        const res = await fetch(
          `${baseUrl}/api/v1/regularization/${req.rawId}/approve`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ comment: "Approved by Admin" }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to approve regularization");
        }
      } else if (req.category === "leave") {
        const res = await fetch(
          `${baseUrl}/api/v1/leaves/${req.rawId}/approve`,
          { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to approve leave");
      }
      showToast(`✅ Request ${id} approved and attendance synchronized.`);
      fetchRequests();
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    }
    if (selectedModalReq && selectedModalReq.id === id) {
      setSelectedModalReq(null);
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Opens reject modal for regularizations (requires reason), direct reject for leaves
  const handleRejectClick = (id, e) => {
    if (e) e.stopPropagation();
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    if (req.category === "regularization") {
      setRejectReason("");
      setRejectModal({ id, rawId: req.rawId, category: req.category });
    } else {
      handleRejectConfirm(id, req.rawId, req.category, "");
    }
  };

  const handleRejectConfirm = async (id, rawId, category, reason) => {
    const baseUrl = getApiBaseUrl();
    const token = getToken();
    try {
      if (category === "regularization") {
        if (!reason.trim()) {
          showToast("❌ Please enter a rejection reason.");
          return;
        }
        const res = await fetch(
          `${baseUrl}/api/v1/regularization/${rawId}/reject`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ rejection_reason: reason.trim() }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to reject regularization");
        }
      } else if (category === "leave") {
        const res = await fetch(
          `${baseUrl}/api/v1/leaves/${rawId}/reject`,
          { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to reject leave");
      }
      showToast(`Request ${id} rejected.`);
      fetchRequests();
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    }
    setRejectModal(null);
    setRejectReason("");
    if (selectedModalReq && selectedModalReq.id === id) setSelectedModalReq(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const selectedList = requests.filter((r) => selectedIds.has(r.id));
    const baseUrl = getApiBaseUrl();
    const token = getToken();
    for (const req of selectedList) {
      try {
        if (req.category === "regularization") {
          await fetch(
            `${baseUrl}/api/v1/regularization/${req.rawId}/approve`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ comment: "Bulk approved by Admin" }),
            }
          );
        } else if (req.category === "leave") {
          await fetch(`${baseUrl}/api/v1/leaves/${req.rawId}/approve`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    showToast(`✅ ${selectedIds.size} pending request(s) approved in bulk.`);
    setSelectedIds(new Set());
    fetchRequests();
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    const selectedList = requests.filter((r) => selectedIds.has(r.id));
    const baseUrl = getApiBaseUrl();
    const token = getToken();
    for (const req of selectedList) {
      try {
        if (req.category === "regularization") {
          await fetch(
            `${baseUrl}/api/v1/regularization/${req.rawId}/reject`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ rejection_reason: "Bulk rejected by Admin" }),
            }
          );
        } else if (req.category === "leave") {
          await fetch(`${baseUrl}/api/v1/leaves/${req.rawId}/reject`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    showToast(`${selectedIds.size} pending request(s) rejected.`);
    setSelectedIds(new Set());
    fetchRequests();
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map((r) => r.id)));
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (activeTab !== "all" && req.category !== activeTab) return false;
      if (deptFilter !== "all" && req.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          req.id.toLowerCase().includes(q) ||
          req.employeeName.toLowerCase().includes(q) ||
          req.employeeId.toLowerCase().includes(q) ||
          req.type.toLowerCase().includes(q) ||
          req.reason.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [requests, activeTab, deptFilter, searchQuery]);

  return (
    <div className="pending-requests-page">
      <DashboardHeader />

      {/* ── Toast Message ── */}
      {toastMsg && (
        <div className="pr-toast">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── KPI Summary Cards ── */}
      <div className="pr-kpi-grid">
        {kpiSummary.map((kpi) => {
          const Icon = kpi.icon;
          const isActive = activeTab === kpi.key;
          return (
            <button
              key={kpi.key}
              type="button"
              className={`pr-kpi-card is-${kpi.tone}${isActive ? " is-active" : ""}`}
              onClick={() => setActiveTab(kpi.key)}
            >
              <div className="pr-kpi-icon-box">
                <Icon size={20} />
              </div>
              <div className="pr-kpi-info">
                <span className="pr-kpi-label">{kpi.label}</span>
                <strong className="pr-kpi-value">{kpi.value}</strong>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Main Content Card ── */}
      <div className="pr-card">
        {/* ── Toolbar & Filters ── */}
        <div className="pr-toolbar">
          <div className="pr-search-wrap">
            <input
              type="text"
              className="pr-search-input"
              placeholder="Search by ID, name, department or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="pr-clear-search"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="pr-filter-actions">
            <div className="pr-select-wrap">
              <Building size={14} className="pr-select-icon" />
              <select
                className="pr-select"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pr-chevron" />
            </div>

            <button
              type="button"
              className="pr-btn pr-btn-secondary"
              onClick={fetchRequests}
              title="Refresh requests"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} />
              <span>Refresh</span>
            </button>

            {selectedIds.size > 0 && (
              <div className="pr-bulk-actions">
                <span className="pr-bulk-count">{selectedIds.size} selected</span>
                <button
                  type="button"
                  className="pr-btn pr-btn-approve-bulk"
                  onClick={handleBulkApprove}
                >
                  <Check size={14} />
                  <span>Approve Selected</span>
                </button>
                <button
                  type="button"
                  className="pr-btn pr-btn-reject-bulk"
                  onClick={handleBulkReject}
                >
                  <X size={14} />
                  <span>Reject Selected</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Table (Desktop) ── */}
        <div className="pr-table-wrap hrms-desktop-table">
          <table className="pr-table">
            <thead>
              <tr>
                <th className="pr-th-check">
                  <input
                    type="checkbox"
                    checked={
                      filteredRequests.length > 0 &&
                      selectedIds.size === filteredRequests.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Request ID</th>
                <th>Employee</th>
                <th>Request Type</th>
                <th>Applied Date</th>
                <th>Effective Period / Details</th>
                <th>Reason</th>
                <th>Status</th>
                <th className="pr-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="pr-empty-cell">
                    <div className="pr-empty-state">
                      <Clock size={32} className="pr-empty-icon spin" />
                      <p className="pr-empty-title">Loading live requests...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="pr-empty-cell">
                    <div className="pr-empty-state">
                      <CheckCircle2 size={36} className="pr-empty-icon" />
                      <p className="pr-empty-title">No pending requests found</p>
                      <p className="pr-empty-sub">
                        All requests matching your criteria have been processed.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isSelected = selectedIds.has(req.id);
                  return (
                    <tr
                      key={req.id}
                      className={isSelected ? "is-selected" : ""}
                      onClick={() => setSelectedModalReq(req)}
                    >
                      <td
                        className="pr-td-check"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(req.id)}
                        />
                      </td>
                      <td>
                        <span className="pr-req-id">{req.id}</span>
                      </td>
                      <td>
                        <div className="pr-emp-cell">
                          <div
                            className="pr-emp-avatar"
                            style={{ background: req.avatarColor }}
                          >
                            {req.avatar}
                          </div>
                          <div className="pr-emp-details">
                            <span className="pr-emp-name">{req.employeeName}</span>
                            <span className="pr-emp-meta">
                              {req.employeeId} • {req.department}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`pr-type-badge is-${req.category}`}>
                          {req.type}
                        </span>
                      </td>
                      <td>
                        <span className="pr-date-text">{req.appliedDate}</span>
                      </td>
                      <td>
                        <div className="pr-details-cell">
                          <span className="pr-details-primary">{req.details}</span>
                          <span className="pr-details-sub">{req.effectiveDate}</span>
                        </div>
                      </td>
                      <td>
                        <span className="pr-reason-text" title={req.reason}>
                          {req.reason}
                        </span>
                      </td>
                      <td>
                        {(() => {
                          const s = (req.status || "").toUpperCase();
                          if (s === "APPROVED") return (
                            <span className="pr-status-badge" style={{ background: "#dcfce7", color: "#166534" }}>
                              <CheckCircle2 size={12} /><span>Approved</span>
                            </span>
                          );
                          if (s.includes("REJECT")) return (
                            <span className="pr-status-badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                              <XCircle size={12} /><span>Rejected</span>
                            </span>
                          );
                          if (s === "PENDING_ADMIN" || s === "APPROVED_BY_MANAGER") return (
                            <span className="pr-status-badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                              <AlertCircle size={12} /><span>Pending Admin</span>
                            </span>
                          );
                          return (
                            <span className="pr-status-badge">
                              <Clock size={12} /><span>Pending</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td
                        className="pr-td-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="pr-action-btn pr-btn-approve"
                          title="Approve"
                          onClick={(e) => handleApprove(req.id, e)}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          className="pr-action-btn pr-btn-reject"
                          title="Reject"
                          onClick={(e) => handleRejectClick(req.id, e)}
                        >
                          <X size={14} />
                        </button>
                        <button
                          type="button"
                          className="pr-action-btn pr-btn-view"
                          title="View Details"
                          onClick={() => setSelectedModalReq(req)}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Cards (<768px) ── */}
        <div className="pr-mobile-cards hrms-mobile-cards">
          {loading ? (
            <div className="pr-empty-state" style={{ padding: "30px 16px" }}>
              <Clock size={32} className="pr-empty-icon spin" />
              <p className="pr-empty-title">Loading live requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="pr-empty-state" style={{ padding: "30px 16px" }}>
              <CheckCircle2 size={36} className="pr-empty-icon" />
              <p className="pr-empty-title">No pending requests found</p>
              <p className="pr-empty-sub">
                All requests matching your criteria have been processed.
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const s = (req.status || "").toUpperCase();
              return (
                <div
                  key={req.id}
                  className="pr-mob-card"
                  onClick={() => setSelectedModalReq(req)}
                >
                  <div className="pr-mob-card-head">
                    <div className="pr-emp-cell">
                      <div
                        className="pr-emp-avatar"
                        style={{ background: req.avatarColor }}
                      >
                        {req.avatar}
                      </div>
                      <div className="pr-emp-details">
                        <span className="pr-emp-name">{req.employeeName}</span>
                        <span className="pr-emp-meta">
                          {req.employeeId} • {req.department}
                        </span>
                      </div>
                    </div>
                    <span className={`pr-type-badge is-${req.category}`}>
                      {req.type}
                    </span>
                  </div>

                  <div className="pr-mob-card-body">
                    <div className="pr-mob-field">
                      <span className="pr-mob-label">Details</span>
                      <span className="pr-mob-val">{req.details}</span>
                    </div>
                    <div className="pr-mob-field">
                      <span className="pr-mob-label">Period / Date</span>
                      <span className="pr-mob-val">{req.effectiveDate || req.appliedDate}</span>
                    </div>
                    {req.reason && (
                      <div className="pr-mob-field pr-mob-field-full">
                        <span className="pr-mob-label">Reason</span>
                        <span className="pr-mob-val pr-mob-reason">{req.reason}</span>
                      </div>
                    )}
                  </div>

                  <div className="pr-mob-card-footer">
                    <div className="pr-mob-status">
                      {s === "APPROVED" ? (
                        <span className="pr-status-badge" style={{ background: "#dcfce7", color: "#166534" }}>
                          <CheckCircle2 size={12} /><span>Approved</span>
                        </span>
                      ) : s.includes("REJECT") ? (
                        <span className="pr-status-badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                          <XCircle size={12} /><span>Rejected</span>
                        </span>
                      ) : s === "PENDING_ADMIN" || s === "APPROVED_BY_MANAGER" ? (
                        <span className="pr-status-badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                          <AlertCircle size={12} /><span>Pending Admin</span>
                        </span>
                      ) : (
                        <span className="pr-status-badge">
                          <Clock size={12} /><span>Pending</span>
                        </span>
                      )}
                    </div>
                    <div className="pr-mob-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="pr-action-btn pr-btn-approve"
                        title="Approve"
                        onClick={(e) => handleApprove(req.id, e)}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="pr-action-btn pr-btn-reject"
                        title="Reject"
                        onClick={(e) => handleRejectClick(req.id, e)}
                      >
                        <X size={14} />
                      </button>
                      <button
                        type="button"
                        className="pr-action-btn pr-btn-view"
                        title="View Details"
                        onClick={() => setSelectedModalReq(req)}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Request Detail Modal ── */}
      {selectedModalReq && (
        <div className="pr-modal-backdrop" onClick={() => setSelectedModalReq(null)}>
          <div className="pr-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <div className="pr-modal-title-wrap">
                <h2>Request Details — {selectedModalReq.id}</h2>
                <span className={`pr-type-badge is-${selectedModalReq.category}`}>
                  {selectedModalReq.type}
                </span>
              </div>
              <button
                type="button"
                className="pr-modal-close"
                onClick={() => setSelectedModalReq(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pr-modal-body">
              <div className="pr-modal-emp-banner">
                <div
                  className="pr-modal-emp-avatar"
                  style={{ background: selectedModalReq.avatarColor }}
                >
                  {selectedModalReq.avatar}
                </div>
                <div>
                  <h3>{selectedModalReq.employeeName}</h3>
                  <p>
                    {selectedModalReq.employeeId} • {selectedModalReq.department}
                  </p>
                </div>
              </div>

              <div className="pr-modal-grid">
                <div className="pr-modal-field">
                  <span className="pr-field-label">Applied Date</span>
                  <span className="pr-field-val">{selectedModalReq.appliedDate}</span>
                </div>
                <div className="pr-modal-field">
                  <span className="pr-field-label">Effective Period</span>
                  <span className="pr-field-val">{selectedModalReq.effectiveDate}</span>
                </div>
                <div className="pr-modal-field">
                  <span className="pr-field-label">Request Type</span>
                  <span className="pr-field-val">{selectedModalReq.type}</span>
                </div>
                <div className="pr-modal-field">
                  <span className="pr-field-label">Assigned Approver</span>
                  <span className="pr-field-val">{selectedModalReq.approver}</span>
                </div>
                <div className="pr-modal-field pr-modal-field-full">
                  <span className="pr-field-label">Details</span>
                  <span className="pr-field-val">{selectedModalReq.details}</span>
                </div>
                <div className="pr-modal-field pr-modal-field-full">
                  <span className="pr-field-label">Employee Reason / Comments</span>
                  <span className="pr-field-val pr-field-reason">
                    {selectedModalReq.reason}
                  </span>
                </div>
              </div>
            </div>

            <div className="pr-modal-footer">
              <button
                type="button"
                className="pr-btn pr-btn-secondary"
                onClick={() => setSelectedModalReq(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="pr-btn pr-btn-reject-modal"
                onClick={() => handleRejectClick(selectedModalReq.id)}
              >
                <X size={15} />
                <span>Reject</span>
              </button>
              <button
                type="button"
                className="pr-btn pr-btn-approve-modal"
                onClick={() => handleApprove(selectedModalReq.id)}
              >
                <Check size={15} />
                <span>Approve Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Modal ── */}
      {rejectModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            zIndex: 20000, display: "flex", alignItems: "center", justifyContent: "center"
          }}
          onClick={() => setRejectModal(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: "18px", padding: "28px",
              width: "min(440px, 94vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 800, color: "#dc2626" }}>Reject Regularization</h3>
            <p style={{ margin: "0 0 18px", fontSize: "13px", color: "#64748b" }}>
              Please provide a reason for rejecting request <strong>{rejectModal.id}</strong>. This is required.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "10px",
                border: "1px solid #e2e8f0", fontSize: "13px", resize: "vertical",
                outline: "none", boxSizing: "border-box", fontFamily: "inherit"
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                style={{
                  padding: "9px 20px", borderRadius: "9999px",
                  border: "1px solid #e2e8f0", background: "#f8fafc",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#64748b"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectConfirm(rejectModal.id, rejectModal.rawId, rejectModal.category, rejectReason)}
                disabled={!rejectReason.trim()}
                style={{
                  padding: "9px 22px", borderRadius: "9999px",
                  background: rejectReason.trim() ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "#e2e8f0",
                  color: rejectReason.trim() ? "#fff" : "#94a3b8",
                  border: "none", fontSize: "13px", fontWeight: 700,
                  cursor: rejectReason.trim() ? "pointer" : "not-allowed",
                  boxShadow: rejectReason.trim() ? "0 4px 12px rgba(220,38,38,0.3)" : "none"
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingRequests;
