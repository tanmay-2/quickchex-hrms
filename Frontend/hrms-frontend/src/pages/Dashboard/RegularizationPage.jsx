import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Bell,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Plus,
  Check,
  X,
  Eye,
  RotateCw,
  Download,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import { ApprovalProgress } from "../../components/ApprovalProgress/ApprovalProgress";
import "./RegularizationPage.css";
import { getApiUrl } from "../../services/apiClient";

const INITIAL_REGULARIZATIONS = [];

const normalizeReg = (r) => {
  const rawStatus = (r.overall_status || r.status || "PENDING_MANAGER").toUpperCase();
  const rawMgr = (r.manager_status || "").toUpperCase();
  const rawAdm = (r.admin_status || "").toUpperCase();

  const isAppr =
    ["APPROVED", "COMPLETED", "PENDING_ADMIN", "APPROVED_BY_MANAGER"].includes(rawStatus) ||
    rawMgr === "APPROVED" ||
    rawAdm === "APPROVED";

  const isRej = rawStatus.includes("REJECT") || rawMgr.includes("REJECT") || rawAdm.includes("REJECT");

  let overall_status = "PENDING_MANAGER";
  if (isAppr) overall_status = "APPROVED";
  else if (isRej) overall_status = "REJECTED";

  const manager_status = isAppr ? "APPROVED" : (isRej ? "REJECTED" : "PENDING");
  const admin_status = isAppr ? "APPROVED" : (isRej ? "REJECTED" : "PENDING");
  const displayStatus = isAppr ? "Approved" : (isRej ? "Rejected" : "Pending Manager Review");

  const empName = r.employeeName || r.name || r.emp_code || "Employee";
  const initials = empName.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "EM";

  const inTime = r.requested_check_in || r.requestedCheckIn || r.checkIn || r.inTime || "--";
  const outTime = r.requested_check_out || r.requestedCheckOut || r.checkOut || r.outTime || "--";

  const origIn = r.original_check_in || r.originalCheckIn || "--";
  const origOut = r.original_check_out || r.originalCheckOut || "--";
  const origWh = r.original_working_hours || r.originalWorkingHours || "--";
  const workHours = r.working_hours || r.workingHours || "--";

  return {
    id: String(r.id).startsWith("REG-") ? r.id : `REG-${r.id}`,
    rawId: r.id,
    employeeName: empName,
    empCode: r.emp_code || r.employeeId || "",
    email: r.email || "--",
    contactNumber: r.contact_number || r.contactNumber || r.phone || "--",
    department: r.department || "Operations",
    designation: r.designation || "Employee",
    location: r.location || "Mumbai, Maharashtra",
    initials,
    avatarTone: "tone-purple",
    attendanceDate: r.attendanceDate || r.target_date || r.date || "Today",
    date: r.attendanceDate || r.target_date || r.date || "Today",
    originalCheckIn: origIn,
    originalCheckOut: origOut,
    originalWorkingHours: origWh,
    originalStatus: r.original_status || "Absent",
    requestedCheckIn: inTime,
    requestedCheckOut: outTime,
    requestedTimings: inTime !== "--" || outTime !== "--" ? `In: ${inTime}  Out: ${outTime}` : "--",
    workingHours: workHours,
    reason: r.reason || r.comment || "--",
    comment: r.comment || r.reason || "--",
    overall_status,
    manager_status,
    admin_status,
    status: displayStatus,
    manager_reviewed_by: r.manager_reviewed_by || "",
    manager_reviewed_at: r.manager_reviewed_at || null,
    manager_comment: r.manager_comment || "",
    manager_rejection_reason: r.manager_rejection_reason || "",
    admin_reviewed_by: r.admin_reviewed_by || "",
    admin_reviewed_at: r.admin_reviewed_at || null,
    admin_comment: r.admin_comment || "",
    admin_rejection_reason: r.admin_rejection_reason || "",
    submittedOn: r.submittedOn || r.submitted_on || r.submitted_at || r.created_at || "—",
    submitted_at: r.submitted_at || r.created_at || null,
    approver: r.approver || (overall_status === "APPROVED" ? (r.admin_reviewed_by || "Admin") : "Admin Approver"),
    type: overall_status === "PENDING_ADMIN" ? "Pending" : "Completed",
  };
};

export default function RegularizationPage() {
  const navigate = useNavigate();

  // Tab State: 'Pending' or 'Completed'
  const [activeTab, setActiveTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [requests, setRequests] = useState([]);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [editModalItem, setEditModalItem] = useState(null);
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionSubmittingId, setActionSubmittingId] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // New Request Form State
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formReqIn, setFormReqIn] = useState("");
  const [formReqOut, setFormReqOut] = useState("");
  const [formActIn, setFormActIn] = useState("");
  const [formActOut, setFormActOut] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formComment, setFormComment] = useState("");

  const actionsRef = useRef(null);

  const fetchRegularizations = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/regularization/admin/all"));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRequests(data.map(normalizeReg));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch regularizations:", err);
    }
  };

  useEffect(() => {
    fetchRegularizations();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden")) return;
      fetchRegularizations();
    }, 30000);

    const onSync = () => {
      if (typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden")) return;
      fetchRegularizations();
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden && document.visibilityState === "visible") {
        fetchRegularizations();
      }
    };

    window.addEventListener("focus", onSync);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("regularization-updated", onSync);
    window.addEventListener("attendance-updated", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("regularization-updated", onSync);
      window.removeEventListener("attendance-updated", onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("regularization_page_requests_v2", JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Filter requests by active tab and search
  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesTab =
        activeTab === "Pending" ? ["PENDING_MANAGER", "PENDING_ADMIN"].includes(r.overall_status) : ["APPROVED", "REJECTED"].includes(r.overall_status);
      if (!matchesTab) return false;

      if (!term) return true;
      return (
        r.employeeName.toLowerCase().includes(term) ||
        r.date.toLowerCase().includes(term) ||
        (r.comment && r.comment.toLowerCase().includes(term)) ||
        (r.reason && r.reason.toLowerCase().includes(term)) ||
        (r.approver && r.approver.toLowerCase().includes(term))
      );
    });
  }, [requests, activeTab, search]);

  const pendingCount = requests.filter((r) => ["PENDING_MANAGER", "PENDING_ADMIN"].includes(r.overall_status)).length;
  const completedCount = requests.filter((r) => ["APPROVED", "REJECTED"].includes(r.overall_status)).length;

  const allSelected =
    filteredRequests.length > 0 && selectedIds.length === filteredRequests.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getRawId = (id) => {
    const item = requests.find((r) => r.id === id || r.rawId === id);
    if (item && item.rawId) return item.rawId;
    return String(id).replace("REG-", "");
  };

  // Action Handlers
  const handleApprove = async (id) => {
    const rawId = getRawId(id);
    if (actionSubmittingId) return;
    setActionSubmittingId(id);

    // Optimistic UI update so status changes immediately
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id || r.rawId === rawId || String(r.id) === String(id)
          ? {
              ...r,
              overall_status: "APPROVED",
              manager_status: "APPROVED",
              admin_status: "APPROVED",
              status: "Approved",
              type: "Completed",
            }
          : r
      )
    );

    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken") || "";
    try {
      const res = await fetch(getApiUrl(`/api/v1/regularization/${rawId}/approve`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ admin_name: "Admin Approver", approver_role: "admin", comment: "Approved by Admin" })
      });
      if (res.ok) {
        showToast("Regularization request approved and attendance synchronized.");
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.detail || "Unable to approve this request.");
      }
      fetchRegularizations();
      window.dispatchEvent(new Event("regularization-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'regularization-updated', timestamp: Date.now() }));
      } catch (e) { }
    } catch (err) {
      console.warn("Backend approve regularization error:", err);
      showToast("Unable to approve this request.");
      fetchRegularizations();
    } finally {
      setActionSubmittingId(null);
    }
  };

  const handleRejectClick = (item) => {
    setRejectModalItem(item);
    setRejectReason("");
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalItem) return;
    if (!rejectReason.trim()) {
      showToast("Please enter a reason for rejection.");
      return;
    }
    const rawId = getRawId(rejectModalItem.id);
    setActionSubmittingId(rejectModalItem.id);

    // Optimistic UI update so status changes immediately
    setRequests((prev) =>
      prev.map((r) =>
        r.id === rejectModalItem.id || r.rawId === rawId || String(r.id) === String(rejectModalItem.id)
          ? {
              ...r,
              overall_status: "REJECTED",
              manager_status: "REJECTED",
              admin_status: "REJECTED",
              status: "Rejected",
              type: "Completed",
            }
          : r
      )
    );

    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken") || "";
    try {
      const res = await fetch(getApiUrl(`/api/v1/regularization/${rawId}/reject`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          rejection_reason: rejectReason.trim(),
          comment: rejectReason.trim(),
          reason: rejectReason.trim(),
          admin_name: "Admin Approver",
          approver_role: "admin"
        }),
      });
      if (res.ok) {
        showToast("Request rejected successfully.");
        setRejectModalItem(null);
        setRejectReason("");
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.detail || "Unable to reject request.");
      }
      fetchRegularizations();
      window.dispatchEvent(new Event("regularization-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'regularization-updated', timestamp: Date.now() }));
      } catch (e) { }
    } catch (err) {
      console.warn("Backend reject regularization error:", err);
      showToast("Unable to reject request.");
      fetchRegularizations();
    } finally {
      setActionSubmittingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      showToast("Please select at least one request");
      return;
    }
    const idsToApprove = [...selectedIds];
    setRequests((prev) =>
      prev.map((r) =>
        selectedIds.includes(r.id)
          ? { ...r, type: "Completed", status: "Approved" }
          : r
      )
    );
    setSelectedIds([]);
    setActionsOpen(false);
    showToast(`Approved ${idsToApprove.length} regularization requests`);

    for (const id of idsToApprove) {
      const rawId = getRawId(id);
      try {
        await fetch(getApiUrl(`/api/v1/regularization/${rawId}/approve`), { method: "PUT" });
      } catch { }
    }
    fetchRegularizations();
    window.dispatchEvent(new Event("regularization-updated"));
    window.dispatchEvent(new Event("attendance-updated"));
    try {
      localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'regularization-updated', timestamp: Date.now() }));
    } catch (e) { }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) {
      showToast("Please select at least one request");
      return;
    }
    const idsToReject = [...selectedIds];
    setRequests((prev) =>
      prev.map((r) =>
        selectedIds.includes(r.id)
          ? { ...r, type: "Completed", status: "Rejected" }
          : r
      )
    );
    setSelectedIds([]);
    setActionsOpen(false);
    showToast(`Rejected ${idsToReject.length} requests`);

    for (const id of idsToReject) {
      const rawId = getRawId(id);
      try {
        await fetch(getApiUrl(`/api/v1/regularization/${rawId}/reject`), { method: "PUT" });
      } catch { }
    }
    fetchRegularizations();
    window.dispatchEvent(new Event("regularization-updated"));
    window.dispatchEvent(new Event("attendance-updated"));
    try {
      localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'regularization-updated', timestamp: Date.now() }));
    } catch (e) { }
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,Employee Name,Date,Requested Timings,Actual Timings,Comment,Status,Approver"]
        .concat(
          requests.map(
            (r) =>
              `${r.id},"${r.employeeName}",${r.date},"${r.requestedTimings}","${r.actualTimings}","${r.comment}",${r.status},"${r.approver || ""}"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "regularization_requests.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionsOpen(false);
    showToast("Exported regularization requests to CSV");
  };

  const handleAddRequest = async (e) => {
    e.preventDefault();
    if (!formName || !formDate) {
      showToast("Please fill in required fields");
      return;
    }

    const empCode = localStorage.getItem("emp_code") || localStorage.getItem("employee_code");
    if (!empCode) {
      showToast("Your employee profile is missing. Please sign in again.");
      return;
    }
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken") || "";
    try {
      const response = await fetch(getApiUrl("/api/v1/regularization/apply"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          emp_code: empCode,
          target_date: formDate,
          requested_check_in: formReqIn || formActIn,
          requested_check_out: formReqOut || formActOut,
          comment: formComment || formReason || "Regularization request",
        }),
      });
      if (!response.ok) throw new Error(await response.text());
    } catch (error) {
      console.error("Failed to submit regularization request:", error);
      showToast("Unable to submit regularization request.");
      return;
    }
    setFormName("");
    setFormDate("");
    setFormReqIn("");
    setFormReqOut("");
    setFormActIn("");
    setFormActOut("");
    setFormReason("");
    setFormComment("");
    setAddModalOpen(false);
    setActiveTab("Pending");
    showToast("New regularization request submitted");
    fetchRequests();
    window.dispatchEvent(new Event("regularization-updated"));
  };

  const profileName =
    window.localStorage.getItem("user_name") ||
    window.localStorage.getItem("name") ||
    "RV";

  return (
    <div className="regularization-page">
      <DashboardHeader />

      {/* =====================================================
          MAIN CARD
          ===================================================== */}
      <div className="reg-body">
        <div className="reg-toolbar">
          {/* TABS */}
          <div className="reg-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Pending"}
              className={`reg-tab-btn ${activeTab === "Pending" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("Pending");
                setSelectedIds([]);
              }}
            >
              Pending Requests
              <span className="reg-tab-count">{pendingCount}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Completed"}
              className={`reg-tab-btn ${activeTab === "Completed" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("Completed");
                setSelectedIds([]);
              }}
            >
              Completed Requests
              <span className="reg-tab-count">{completedCount}</span>
            </button>
          </div>

          {/* CONTROLS */}
          <div className="reg-controls">
            <div className="reg-search-filter-row">
              <div className="reg-search-wrap">
                <input
                  type="text"
                  placeholder="Search employee or comment"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="reg-search-input"
                />
              </div>

              <button
                type="button"
                className="reg-icon-btn"
                title="Filter"
                onClick={() => showToast("Filters active")}
              >
                <SlidersHorizontal size={17} />
              </button>
            </div>

            <div className="reg-actions-wrap" ref={actionsRef}>
              <button
                type="button"
                className="reg-actions-btn"
                onClick={() => setActionsOpen((prev) => !prev)}
                aria-expanded={actionsOpen}
              >
                Actions
                <ChevronDown size={15} />
              </button>

              {actionsOpen && (
                <div className="reg-actions-menu" role="menu">
                  <button
                    type="button"
                    onClick={() => {
                      setAddModalOpen(true);
                      setActionsOpen(false);
                    }}
                  >
                    <Plus size={15} />
                    New Request
                  </button>
                  <button type="button" onClick={handleBulkApprove}>
                    <Check size={15} />
                    Bulk Approve
                  </button>
                  <button type="button" onClick={handleBulkReject}>
                    <X size={15} />
                    Bulk Reject
                  </button>
                  <button type="button" onClick={handleExportCSV}>
                    <Download size={15} />
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================
            REGULARIZATION TABLE
            ===================================================== */}
        <div className="reg-table-card">
          <table className="reg-table">
            <thead>
              <tr>
                <th className="reg-col-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all requests"
                  />
                </th>
                <th>Employee Details</th>
                <th>Attendance Date</th>
                <th>Original Timings</th>
                <th>Requested Timings</th>
                <th>Working Hours</th>
                <th>Reason</th>
                <th>Manager Approval</th>
                <th>Admin Approval</th>
                <th>Status</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <Clock size={36} style={{ color: "var(--reg-purple)" }} />
                      <strong style={{ fontSize: "16px", color: "var(--reg-ink)" }}>
                        No Regularization Requests Found
                      </strong>
                      <span style={{ fontSize: "13px", color: "var(--reg-ink-muted)" }}>
                        There are currently no {activeTab.toLowerCase()} regularization requests.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((item) => {
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr key={item.id} className={isSelected ? "is-selected" : ""}>
                      <td className="reg-col-check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(item.id)}
                          aria-label={`Select ${item.employeeName}`}
                        />
                      </td>

                      <td>
                        <div className="reg-emp-cell">
                          <div className={`reg-emp-avatar ${item.avatarTone}`}>
                            {item.initials}
                          </div>
                          <div>
                            <span className="reg-emp-name">{item.employeeName}</span>
                            <div className="reg-emp-subline">
                              <span className="reg-emp-code-badge">{item.empCode}</span>
                              <span className="reg-emp-dept-badge">{item.department}</span>
                            </div>
                            <div className="reg-emp-contact-line">
                              <span>{item.email}</span>
                              {item.contactNumber && item.contactNumber !== "--" && (
                                <>
                                  <span>•</span>
                                  <span>{item.contactNumber}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ whiteSpace: "nowrap" }}>
                          <strong style={{ fontSize: "13px", color: "var(--reg-ink)" }}>{item.attendanceDate}</strong>
                          <div style={{ fontSize: "11px", color: "var(--reg-ink-muted)", marginTop: "2px" }}>
                            Submitted: {item.submittedOn}
                          </div>
                        </div>
                      </td>

                      <td className="reg-timing-cell">
                        <div>In: <strong>{item.originalCheckIn}</strong></div>
                        <div>Out: <strong>{item.originalCheckOut}</strong></div>
                        {item.originalWorkingHours && item.originalWorkingHours !== "--" && (
                          <div style={{ fontSize: "11px", color: "var(--reg-ink-muted)" }}>
                            ({item.originalWorkingHours})
                          </div>
                        )}
                      </td>

                      <td className="reg-timing-cell">
                        <div>In: <strong style={{ color: "var(--reg-purple)" }}>{item.requestedCheckIn}</strong></div>
                        <div>Out: <strong style={{ color: "var(--reg-purple)" }}>{item.requestedCheckOut}</strong></div>
                      </td>

                      <td>
                        <span className="reg-hours-badge">
                          <Clock size={12} />
                          {item.workingHours}
                        </span>
                      </td>

                      <td>
                        <div style={{ maxWidth: "160px", fontSize: "12px", color: "var(--reg-ink)" }} title={item.reason}>
                          {item.reason}
                        </div>
                      </td>

                      <td>
                        <div>
                          <span className={`reg-badge-mini ${item.manager_status === 'APPROVED' ? 'approved' : item.manager_status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                            {item.manager_status === 'APPROVED' ? '✓ Approved' : item.manager_status === 'REJECTED' ? '✕ Rejected' : '○ Pending'}
                          </span>
                          {item.manager_reviewed_by && (
                            <div style={{ fontSize: "11px", color: "var(--reg-ink-muted)", marginTop: "2px" }}>
                              {item.manager_reviewed_by}
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <div>
                          <span className={`reg-badge-mini ${item.admin_status === 'APPROVED' ? 'approved' : item.admin_status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                            {item.admin_status === 'APPROVED' ? '✓ Approved' : item.admin_status === 'REJECTED' ? '✕ Rejected' : '○ Pending'}
                          </span>
                          {item.admin_reviewed_by && (
                            <div style={{ fontSize: "11px", color: "var(--reg-ink-muted)", marginTop: "2px" }}>
                              {item.admin_reviewed_by}
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}>
                          <span className={`reg-status-badge reg-status-badge--${item.overall_status === "APPROVED" ? "approved" : item.overall_status === "REJECTED" ? "rejected" : "pending"}`}>
                            {item.overall_status === "APPROVED" ? "Approved" : item.overall_status === "REJECTED" ? "Rejected" : "Pending Review"}
                          </span>
                          <button
                            type="button"
                            className="reg-row-btn"
                            title="View Details"
                            onClick={() => setEditModalItem(item)}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>

                      <td>
                        <div className="reg-action-btns">
                          {["PENDING_MANAGER", "PENDING_ADMIN"].includes(item.overall_status) && (
                            <>
                              <button
                                type="button"
                                className="reg-btn-action-text reject"
                                title="Reject Request"
                                disabled={actionSubmittingId === item.id}
                                onClick={() => handleRejectClick(item)}
                              >
                                <X size={13} />
                                Reject
                              </button>
                              <button
                                type="button"
                                className="reg-btn-action-text approve"
                                title="Approve Request"
                                disabled={actionSubmittingId === item.id}
                                onClick={() => handleApprove(item.id)}
                              >
                                <Check size={13} />
                                {actionSubmittingId === item.id ? "Approving..." : "Approve"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================================
            REGULARIZATION MOBILE CARDS (Mobile View - No Scroller)
            ===================================================== */}
        <div className="reg-mobile-cards-list">
          {filteredRequests.length === 0 ? (
            <div className="reg-mobile-empty-card">
              <Clock size={32} style={{ color: "var(--reg-purple)" }} />
              <strong>No Regularization Requests Found</strong>
              <span>There are currently no {activeTab.toLowerCase()} regularization requests.</span>
            </div>
          ) : (
            filteredRequests.map((item) => {
              const isSelected = selectedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`reg-mob-card ${isSelected ? "is-selected" : ""}`}
                >
                  {/* Card Header: Checkbox + Avatar + Employee info + Status */}
                  <div className="reg-mob-header">
                    <div className="reg-mob-user-row">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(item.id)}
                        className="reg-mob-checkbox"
                        aria-label={`Select ${item.employeeName}`}
                      />
                      <div className={`reg-emp-avatar ${item.avatarTone} reg-mob-avatar`}>
                        {item.initials}
                      </div>
                      <div className="reg-mob-user-copy">
                        <h3 className="reg-mob-name">{item.employeeName}</h3>
                        <div className="reg-mob-badges">
                          <span className="reg-emp-code-badge">{item.empCode}</span>
                          <span className="reg-emp-dept-badge">{item.department}</span>
                        </div>
                      </div>
                    </div>

                    <div className="reg-mob-header-right">
                      <span className={`reg-status-badge reg-status-badge--${item.overall_status === "APPROVED" ? "approved" : item.overall_status === "REJECTED" ? "rejected" : "pending"}`}>
                        {item.overall_status === "APPROVED" ? "Approved" : item.overall_status === "REJECTED" ? "Rejected" : "Pending Review"}
                      </span>
                      <button
                        type="button"
                        className="reg-mob-view-btn"
                        title="View Details"
                        onClick={() => setEditModalItem(item)}
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Attendance Date & Working Hours Strip */}
                  <div className="reg-mob-meta-strip">
                    <div className="reg-mob-date-col">
                      <span className="reg-mob-lbl">Attendance Date</span>
                      <strong className="reg-mob-date">{item.attendanceDate}</strong>
                      <span className="reg-mob-sub">Submitted: {item.submittedOn}</span>
                    </div>
                    <div className="reg-mob-hours-col">
                      <span className="reg-mob-lbl">Hours</span>
                      <span className="reg-hours-badge">
                        <Clock size={12} />
                        {item.workingHours}
                      </span>
                    </div>
                  </div>

                  {/* Timing Comparison Grid */}
                  <div className="reg-mob-timings-grid">
                    <div className="reg-mob-timing-box">
                      <span className="reg-mob-timing-title">Original</span>
                      <div className="reg-mob-timing-vals">
                        <span>In: <strong>{item.originalCheckIn}</strong></span>
                        <span>Out: <strong>{item.originalCheckOut}</strong></span>
                      </div>
                      {item.originalWorkingHours && item.originalWorkingHours !== "--" && (
                        <span className="reg-mob-timing-dur">({item.originalWorkingHours})</span>
                      )}
                    </div>

                    <div className="reg-mob-timing-box highlight">
                      <span className="reg-mob-timing-title highlight">Requested</span>
                      <div className="reg-mob-timing-vals">
                        <span>In: <strong className="text-purple">{item.requestedCheckIn}</strong></span>
                        <span>Out: <strong className="text-purple">{item.requestedCheckOut}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Reason Box */}
                  {item.reason && (
                    <div className="reg-mob-reason-box">
                      <span className="reg-mob-reason-lbl">Reason:</span>
                      <p className="reg-mob-reason-text">{item.reason}</p>
                    </div>
                  )}

                  {/* Approval Stages Strip */}
                  <div className="reg-mob-approvals-row">
                    <div className="reg-mob-approval-item">
                      <span className="reg-mob-approval-lbl">Manager</span>
                      <span className={`reg-badge-mini ${item.manager_status === 'APPROVED' ? 'approved' : item.manager_status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                        {item.manager_status === 'APPROVED' ? '✓ Approved' : item.manager_status === 'REJECTED' ? '✕ Rejected' : '○ Pending'}
                      </span>
                      {item.manager_reviewed_by && (
                        <span className="reg-mob-reviewer">{item.manager_reviewed_by}</span>
                      )}
                    </div>

                    <div className="reg-mob-approval-item">
                      <span className="reg-mob-approval-lbl">Admin</span>
                      <span className={`reg-badge-mini ${item.admin_status === 'APPROVED' ? 'approved' : item.admin_status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                        {item.admin_status === 'APPROVED' ? '✓ Approved' : item.admin_status === 'REJECTED' ? '✕ Rejected' : '○ Pending'}
                      </span>
                      {item.admin_reviewed_by && (
                        <span className="reg-mob-reviewer">{item.admin_reviewed_by}</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons (Standard 44px height, 10px radius) */}
                  {["PENDING_MANAGER", "PENDING_ADMIN"].includes(item.overall_status) && (
                    <div className="reg-mob-actions-row">
                      <button
                        type="button"
                        className="reg-mob-btn-reject"
                        disabled={actionSubmittingId === item.id}
                        onClick={() => handleRejectClick(item)}
                      >
                        <X size={15} />
                        Reject
                      </button>
                      <button
                        type="button"
                        className="reg-mob-btn-approve"
                        disabled={actionSubmittingId === item.id}
                        onClick={() => handleApprove(item.id)}
                      >
                        <Check size={15} />
                        {actionSubmittingId === item.id ? "Approving..." : "Approve"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* LOAD MORE BUTTON */}
        {filteredRequests.length > 0 && (
          <div className="reg-load-more-wrap">
            <button
              type="button"
              className="reg-load-more-btn"
              onClick={() => showToast("Loaded all current records")}
            >
              <RotateCw size={15} />
              Load More
            </button>
          </div>
        )}
      </div>

      {/* =====================================================
          EDIT / VIEW MODAL (Requirement 38)
          ===================================================== */}
      {editModalItem && (
        <div className="reg-modal-overlay" onClick={() => setEditModalItem(null)}>
          <div className="reg-modal" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
            <div className="reg-modal-head">
              <h3>Regularization Request Details</h3>
              <button
                type="button"
                className="reg-modal-close"
                onClick={() => setEditModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="reg-modal-body">
              {/* Employee Overview Card */}
              <div className="reg-detail-header-card">
                <div className="reg-emp-cell" style={{ minWidth: "auto", marginBottom: 6 }}>
                  <div className={`reg-emp-avatar ${editModalItem.avatarTone}`}>
                    {editModalItem.initials}
                  </div>
                  <div>
                    <strong style={{ fontSize: "15px", color: "var(--reg-ink)" }}>{editModalItem.employeeName}</strong>
                    <div className="reg-emp-subline">
                      <span className="reg-emp-code-badge">{editModalItem.empCode}</span>
                      <span className="reg-emp-dept-badge">{editModalItem.department}</span>
                      {editModalItem.designation && <span className="reg-emp-dept-badge">{editModalItem.designation}</span>}
                    </div>
                  </div>
                </div>
                <div className="reg-emp-contact-line" style={{ fontSize: "12px", color: "var(--reg-ink-muted)", paddingLeft: "48px" }}>
                  <span>{editModalItem.email}</span>
                  {editModalItem.contactNumber && editModalItem.contactNumber !== "--" && (
                    <>
                      <span>•</span>
                      <span>{editModalItem.contactNumber}</span>
                    </>
                  )}
                  {editModalItem.location && (
                    <>
                      <span>•</span>
                      <span>{editModalItem.location}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Attendance Date & Submission */}
              <div className="reg-grid-2">
                <div className="reg-form-group">
                  <label>Attendance Date</label>
                  <input type="text" readOnly value={editModalItem.attendanceDate || editModalItem.date} />
                </div>
                <div className="reg-form-group">
                  <label>Submitted On</label>
                  <input type="text" readOnly value={editModalItem.submittedOn || "—"} />
                </div>
              </div>

              {/* Timing Comparison: Original vs Requested */}
              <div className="reg-detail-timing-grid">
                <div className="reg-detail-timing-card">
                  <h5>Original Timings</h5>
                  <div className="reg-timing-row">
                    <span>Check In:</span>
                    <strong>{editModalItem.originalCheckIn}</strong>
                  </div>
                  <div className="reg-timing-row">
                    <span>Check Out:</span>
                    <strong>{editModalItem.originalCheckOut}</strong>
                  </div>
                  <div className="reg-timing-row">
                    <span>Duration:</span>
                    <strong>{editModalItem.originalWorkingHours || "—"}</strong>
                  </div>
                </div>

                <div className="reg-detail-timing-card highlight">
                  <h5>Requested Timings</h5>
                  <div className="reg-timing-row">
                    <span>Check In:</span>
                    <strong style={{ color: "var(--reg-purple)" }}>{editModalItem.requestedCheckIn}</strong>
                  </div>
                  <div className="reg-timing-row">
                    <span>Check Out:</span>
                    <strong style={{ color: "var(--reg-purple)" }}>{editModalItem.requestedCheckOut}</strong>
                  </div>
                  <div className="reg-timing-row">
                    <span>Working Hours:</span>
                    <strong style={{ color: "var(--reg-purple)" }}>{editModalItem.workingHours}</strong>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="reg-form-group">
                <label>Reason</label>
                <textarea readOnly value={editModalItem.reason || editModalItem.comment || "—"} />
              </div>

              {/* Approval Workflow & Audit Trail */}
              <div className="reg-audit-trail-container">
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--reg-purple-deep)", marginBottom: 4 }}>
                  APPROVAL WORKFLOW & AUDIT
                </div>

                {/* Manager Step */}
                <div className="reg-audit-step">
                  <div className={`reg-audit-step-icon ${editModalItem.manager_status === 'APPROVED' ? 'success' : editModalItem.manager_status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                    {editModalItem.manager_status === 'APPROVED' ? '✓' : editModalItem.manager_status === 'REJECTED' ? '✕' : '○'}
                  </div>
                  <div className="reg-audit-step-info">
                    <div className="reg-audit-step-title">
                      Manager Review: {editModalItem.manager_status === 'APPROVED' ? 'Approved' : editModalItem.manager_status === 'REJECTED' ? 'Rejected' : 'Pending'}
                    </div>
                    <div className="reg-audit-step-meta">
                      {editModalItem.manager_reviewed_by ? `By: ${editModalItem.manager_reviewed_by}` : 'Pending review'}
                      {editModalItem.manager_reviewed_at && ` • ${editModalItem.manager_reviewed_at.slice(0, 19).replace('T', ' ')}`}
                    </div>
                    {editModalItem.manager_comment && (
                      <div className="reg-audit-step-comment">Note: {editModalItem.manager_comment}</div>
                    )}
                    {editModalItem.manager_rejection_reason && (
                      <div className="reg-audit-step-comment" style={{ borderColor: '#fca5a5', color: '#dc2626' }}>
                        Reason: {editModalItem.manager_rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Step */}
                <div className="reg-audit-step">
                  <div className={`reg-audit-step-icon ${editModalItem.admin_status === 'APPROVED' ? 'success' : editModalItem.admin_status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                    {editModalItem.admin_status === 'APPROVED' ? '✓' : editModalItem.admin_status === 'REJECTED' ? '✕' : '○'}
                  </div>
                  <div className="reg-audit-step-info">
                    <div className="reg-audit-step-title">
                      Admin Final Review: {editModalItem.admin_status === 'APPROVED' ? 'Approved' : editModalItem.admin_status === 'REJECTED' ? 'Rejected' : 'Pending'}
                    </div>
                    <div className="reg-audit-step-meta">
                      {editModalItem.admin_reviewed_by ? `By: ${editModalItem.admin_reviewed_by}` : 'Pending Admin action'}
                      {editModalItem.admin_reviewed_at && ` • ${editModalItem.admin_reviewed_at.slice(0, 19).replace('T', ' ')}`}
                    </div>
                    {editModalItem.admin_comment && (
                      <div className="reg-audit-step-comment">Note: {editModalItem.admin_comment}</div>
                    )}
                    {editModalItem.admin_rejection_reason && (
                      <div className="reg-audit-step-comment" style={{ borderColor: '#fca5a5', color: '#dc2626' }}>
                        Reason: {editModalItem.admin_rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Overall status footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTop: '1px dashed #d8b4fe' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--reg-ink-muted)' }}>Overall Status:</span>
                  <span className={`reg-status-badge reg-status-badge--${editModalItem.overall_status === "APPROVED" ? "approved" : editModalItem.overall_status === "REJECTED" ? "rejected" : "pending"}`}>
                    {editModalItem.overall_status === "APPROVED" ? "Approved" : editModalItem.overall_status === "REJECTED" ? "Rejected" : "Pending Review"}
                  </span>
                </div>
              </div>
            </div>

            <div className="reg-modal-foot">
              {["PENDING_MANAGER", "PENDING_ADMIN"].includes(editModalItem.overall_status) && (
                <>
                  <button
                    type="button"
                    className="reg-btn-action-text reject"
                    onClick={() => {
                      const itemToReject = editModalItem;
                      setEditModalItem(null);
                      handleRejectClick(itemToReject);
                    }}
                    disabled={actionSubmittingId === editModalItem.id}
                  >
                    <X size={13} />
                    Reject
                  </button>
                  <button
                    type="button"
                    className="reg-btn-submit"
                    style={{ background: "#16a34a" }}
                    onClick={() => {
                      handleApprove(editModalItem.id);
                      setEditModalItem(null);
                    }}
                    disabled={actionSubmittingId === editModalItem.id}
                  >
                    <Check size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                    {actionSubmittingId === editModalItem.id ? "Approving..." : "Approve"}
                  </button>
                </>
              )}
              <button
                type="button"
                className="reg-btn-cancel"
                onClick={() => setEditModalItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Modal (Requirement 4) ── */}
      {rejectModalItem && (
        <div className="reg-modal-overlay" onClick={() => !actionSubmittingId && setRejectModalItem(null)}>
          <div className="reg-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="reg-modal-head">
              <h3>Reject Regularization</h3>
              <button
                type="button"
                className="reg-modal-close"
                onClick={() => !actionSubmittingId && setRejectModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="reg-modal-body">
              <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--reg-ink-muted)" }}>
                Rejecting regularization request for <strong>{rejectModalItem.employeeName}</strong> on {rejectModalItem.date}.
              </p>
              <div className="reg-form-group">
                <label>Reason for rejection <span style={{ color: "#dc2626" }}>*</span></label>
                <textarea
                  placeholder="Enter reason for rejection..."
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="reg-modal-foot">
              <button
                type="button"
                className="reg-btn-cancel"
                onClick={() => setRejectModalItem(null)}
                disabled={actionSubmittingId === rejectModalItem.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reg-btn-action-text reject"
                style={{ padding: "8px 18px", fontSize: 13 }}
                onClick={handleRejectConfirm}
                disabled={actionSubmittingId === rejectModalItem.id}
              >
                {actionSubmittingId === rejectModalItem.id ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          NEW REQUEST MODAL
          ===================================================== */}
      {addModalOpen && (
        <div className="reg-modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="reg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reg-modal-head">
              <h3>New Regularization Request</h3>
              <button
                type="button"
                className="reg-modal-close"
                onClick={() => setAddModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRequest}>
              <div className="reg-modal-body">
                <div className="reg-form-group">
                  <label>Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Krishna Harilal Pal"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="reg-form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>

                <div className="reg-grid-2">
                  <div className="reg-form-group">
                    <label>Requested In</label>
                    <input
                      type="time"
                      value={formReqIn}
                      onChange={(e) => setFormReqIn(e.target.value)}
                    />
                  </div>
                  <div className="reg-form-group">
                    <label>Requested Out</label>
                    <input
                      type="time"
                      value={formReqOut}
                      onChange={(e) => setFormReqOut(e.target.value)}
                    />
                  </div>
                </div>

                <div className="reg-grid-2">
                  <div className="reg-form-group">
                    <label>Actual In</label>
                    <input
                      type="time"
                      value={formActIn}
                      onChange={(e) => setFormActIn(e.target.value)}
                    />
                  </div>
                  <div className="reg-form-group">
                    <label>Actual Out</label>
                    <input
                      type="time"
                      value={formActOut}
                      onChange={(e) => setFormActOut(e.target.value)}
                    />
                  </div>
                </div>

                <div className="reg-form-group">
                  <label>Reason / Category</label>
                  <select
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  >
                    <option value="">Select Reason</option>
                    <option value="Forgot to Punch">Forgot to Punch</option>
                    <option value="Work From Home">Work From Home</option>
                    <option value="On Duty / Client Visit">On Duty / Client Visit</option>
                    <option value="System Technical Issue">System Technical Issue</option>
                  </select>
                </div>

                <div className="reg-form-group">
                  <label>Comment / Note</label>
                  <textarea
                    placeholder="Provide details about the regularization..."
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="reg-modal-foot">
                <button
                  type="button"
                  className="reg-btn-cancel"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="reg-btn-submit">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && <div className="reg-toast">{toastMessage}</div>}
    </div>
  );
}
