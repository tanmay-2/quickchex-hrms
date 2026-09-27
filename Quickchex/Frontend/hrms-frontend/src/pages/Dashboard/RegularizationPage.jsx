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
  Pencil,
  RotateCw,
  Download,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./RegularizationPage.css";

const INITIAL_REGULARIZATIONS = [];

function calculateHours(reqIn, reqOut) {
  if (!reqIn || !reqOut) return "8h 30m";
  try {
    const parseTime = (tStr) => {
      if (!tStr || tStr === "—" || tStr === "--") return null;
      const match = tStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3] ? match[3].toUpperCase() : null;
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    const inM = parseTime(reqIn);
    const outM = parseTime(reqOut);
    if (inM !== null && outM !== null && outM > inM) {
      const diff = outM - inM;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m > 0 ? `${m}m` : "00m"}`;
    }
  } catch {
    // fallback
  }
  return "8h 30m";
}

const renderBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s.includes("approv")) {
    return <span className="reg-badge reg-badge-approved">Approved</span>;
  }
  if (s.includes("reject")) {
    return <span className="reg-badge reg-badge-rejected">Rejected</span>;
  }
  if (s.includes("wait")) {
    return <span className="reg-badge reg-badge-waiting">Waiting</span>;
  }
  return <span className="reg-badge reg-badge-pending">Pending</span>;
};

const normalizeReg = (r) => {
  const empName = r.employeeName || r.name || r.emp_code || "Employee";
  const initials = empName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "EM";

  const reqIn = r.inTime || r.checkIn || "";
  const reqOut = r.outTime || r.checkOut || "";
  let reqTimings = r.requestedTimings || "";
  if (!reqTimings || reqTimings === "--" || reqTimings === "—") {
    if (reqIn || reqOut) {
      reqTimings = `${reqIn || "09:30 AM"} - ${reqOut || "06:30 PM"}`;
    } else {
      reqTimings = "09:30 AM - 06:30 PM";
    }
  } else {
    reqTimings = reqTimings.replace(/^In:\s*/i, "").replace(/\s*Out:\s*/i, " - ");
  }

  const origIn = r.original_check_in || r.actual_in_time || "";
  const origOut = r.original_check_out || r.actual_out_time || "";
  let origTimings = r.actualTimings || "";
  if (!origTimings || origTimings === "--" || origTimings === "—") {
    if (origIn || origOut) {
      origTimings = `${origIn || "—"} - ${origOut || "—"}`;
    } else {
      origTimings = "—";
    }
  } else {
    origTimings = origTimings.replace(/^In:\s*/i, "").replace(/\s*Out:\s*/i, " - ");
  }

  const workingHours =
    r.original_working_hours && r.original_working_hours !== "—"
      ? r.original_working_hours
      : calculateHours(reqIn, reqOut);

  // Status mapping
  const rawStatus = (r.status || "Pending").trim();
  let overallStatus = "Pending";
  let managerApproval = "Pending";
  let adminApproval = "Waiting";

  const lowerSt = rawStatus.toLowerCase();
  if (lowerSt.includes("approve") || lowerSt === "approved") {
    overallStatus = "Approved";
    managerApproval = "Approved";
    adminApproval = "Approved";
  } else if (lowerSt.includes("reject") || lowerSt === "rejected") {
    overallStatus = "Rejected";
    managerApproval = r.manager_action === "Approved" ? "Approved" : "Rejected";
    adminApproval = "Rejected";
  } else if (lowerSt.includes("level 2") || lowerSt.includes("admin")) {
    overallStatus = "Pending";
    managerApproval = "Approved";
    adminApproval = "Pending";
  } else {
    overallStatus = "Pending";
    managerApproval = r.manager_action || "Pending";
    adminApproval = managerApproval === "Approved" ? "Pending" : "Waiting";
  }

  const attDate = r.attendanceDate || r.date || r.target_date || r.effectiveDate || "Today";

  return {
    id: String(r.id).startsWith("REG-") ? r.id : `REG-${r.id}`,
    rawId: r.id,
    employeeName: empName,
    empCode: r.emp_code || r.employeeId || "",
    location: r.location || "Mumbai, Maharashtra",
    initials,
    avatarTone: r.avatarTone || "tone-purple",
    attendanceDate: attDate,
    date: attDate,
    originalTimings: origTimings,
    actualTimings: origTimings,
    requestedTimings: reqTimings,
    workingHours: workingHours || "8h 30m",
    reason: r.reason || r.issue || r.comment || "Forgot to Punch",
    comment: r.comment || r.reason || "",
    managerApproval,
    adminApproval,
    overallStatus,
    status: overallStatus,
    approver: r.approver || r.manager_name || "Reporting Manager",
    type: overallStatus === "Pending" ? "Pending" : "Completed",
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
      const res = await fetch(`https://quickchex-backend.onrender.com/api/v1/regularization/admin/all`);
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
    const interval = setInterval(fetchRegularizations, 4000);
    const onSync = () => fetchRegularizations();
    window.addEventListener("focus", onSync);
    window.addEventListener("regularization-updated", onSync);
    window.addEventListener("attendance-updated", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
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
        activeTab === "Pending" ? r.type === "Pending" : r.type === "Completed";
      if (!matchesTab) return false;

      if (!term) return true;
      return (
        (r.employeeName && r.employeeName.toLowerCase().includes(term)) ||
        (r.empCode && r.empCode.toLowerCase().includes(term)) ||
        (r.attendanceDate && r.attendanceDate.toLowerCase().includes(term)) ||
        (r.date && r.date.toLowerCase().includes(term)) ||
        (r.comment && r.comment.toLowerCase().includes(term)) ||
        (r.reason && r.reason.toLowerCase().includes(term)) ||
        (r.managerApproval && r.managerApproval.toLowerCase().includes(term)) ||
        (r.adminApproval && r.adminApproval.toLowerCase().includes(term)) ||
        (r.overallStatus && r.overallStatus.toLowerCase().includes(term)) ||
        (r.approver && r.approver.toLowerCase().includes(term))
      );
    });
  }, [requests, activeTab, search]);

  const pendingCount = requests.filter((r) => r.type === "Pending").length;
  const completedCount = requests.filter((r) => r.type === "Completed").length;

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
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              type: "Completed",
              overallStatus: "Approved",
              status: "Approved",
              managerApproval: "Approved",
              adminApproval: "Approved",
            }
          : r
      )
    );
    showToast("Regularization request approved");

    try {
      await fetch(`https://quickchex-backend.onrender.com/api/v1/regularization/${rawId}/approve`, { method: "PUT" });
      fetchRegularizations();
      window.dispatchEvent(new Event("regularization-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'regularization-updated', timestamp: Date.now() }));
      } catch (e) { }
    } catch (err) {
      console.warn("Backend approve regularization error:", err);
    }
  };

  const handleReject = async (id) => {
    const rawId = getRawId(id);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              type: "Completed",
              overallStatus: "Rejected",
              status: "Rejected",
              adminApproval: "Rejected",
            }
          : r
      )
    );
    showToast("Regularization request rejected");

    try {
      await fetch(`https://quickchex-backend.onrender.com/api/v1/regularization/${rawId}/reject`, { method: "PUT" });
      fetchRegularizations();
      window.dispatchEvent(new Event("regularization-updated"));
      window.dispatchEvent(new Event("attendance-updated"));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'regularization-updated', timestamp: Date.now() }));
      } catch (e) { }
    } catch (err) {
      console.warn("Backend reject regularization error:", err);
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
          ? {
              ...r,
              type: "Completed",
              overallStatus: "Approved",
              status: "Approved",
              managerApproval: "Approved",
              adminApproval: "Approved",
            }
          : r
      )
    );
    setSelectedIds([]);
    setActionsOpen(false);
    showToast(`Approved ${idsToApprove.length} regularization requests`);

    for (const id of idsToApprove) {
      const rawId = getRawId(id);
      try {
        await fetch(`https://quickchex-backend.onrender.com/api/v1/regularization/${rawId}/approve`, { method: "PUT" });
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
          ? {
              ...r,
              type: "Completed",
              overallStatus: "Rejected",
              status: "Rejected",
              adminApproval: "Rejected",
            }
          : r
      )
    );
    setSelectedIds([]);
    setActionsOpen(false);
    showToast(`Rejected ${idsToReject.length} requests`);

    for (const id of idsToReject) {
      const rawId = getRawId(id);
      try {
        await fetch(`https://quickchex-backend.onrender.com/api/v1/regularization/${rawId}/reject`, { method: "PUT" });
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
    const headers = [
      "ID",
      "Employee Name",
      "Employee Code",
      "Attendance Date",
      "Original Timings",
      "Requested Timings",
      "Working Hours",
      "Reason",
      "Manager Approval",
      "Admin Approval",
      "Overall Status",
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(",")]
        .concat(
          requests.map(
            (r) =>
              `${r.id},"${r.employeeName}","${r.empCode || ""}","${r.attendanceDate}","${r.originalTimings || ""}","${r.requestedTimings || ""}","${r.workingHours || ""}","${(r.reason || "").replace(/"/g, '""')}","${r.managerApproval}","${r.adminApproval}","${r.overallStatus}"`
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

  const handleAddRequest = (e) => {
    e.preventDefault();
    if (!formName || !formDate) {
      showToast("Please fill in required fields");
      return;
    }

    const initials = formName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const reqTimings = [
      formReqIn ? `In: ${formReqIn}` : "",
      formReqOut ? `Out: ${formReqOut}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const actTimings = [
      formActIn ? `In: ${formActIn}` : "",
      formActOut ? `Out: ${formActOut}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const newReq = {
      id: `REG-${Date.now().toString().slice(-4)}`,
      rawId: Date.now(),
      employeeName: formName,
      empCode: `LE${Math.floor(100 + Math.random() * 900)}`,
      location: "Mumbai, Maharashtra",
      initials: initials || "EM",
      avatarTone: "tone-purple",
      attendanceDate: formDate,
      date: formDate,
      requestedTimings: reqTimings || "09:30 AM - 06:30 PM",
      originalTimings: actTimings || "—",
      actualTimings: actTimings || "—",
      workingHours: calculateHours(formReqIn, formReqOut) || "8h 30m",
      reason: formReason || "Forgot to Punch",
      comment: formComment || "Regularization submitted",
      managerApproval: "Pending",
      adminApproval: "Waiting",
      overallStatus: "Pending",
      status: "Pending",
      approver: "Reporting Manager",
      type: "Pending",
    };

    setRequests((prev) => [newReq, ...prev]);
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
                <th className="reg-col-check" style={{ width: "36px", minWidth: "36px" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all requests"
                  />
                </th>
                <th style={{ minWidth: "165px" }}>Employee Details</th>
                <th style={{ minWidth: "95px" }}>Attendance Date</th>
                <th style={{ minWidth: "110px" }}>Original Timings</th>
                <th style={{ minWidth: "110px" }}>Requested Timings</th>
                <th style={{ minWidth: "85px" }}>Working Hours</th>
                <th style={{ minWidth: "110px" }}>Reason</th>
                <th style={{ minWidth: "105px" }}>Manager Approval</th>
                <th style={{ minWidth: "105px" }}>Admin Approval</th>
                <th style={{ minWidth: "100px" }}>Overall Status</th>
                <th className="th-actions" style={{ minWidth: "85px" }}>Actions</th>
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

                      {/* 1. Employee Details */}
                      <td>
                        <div className="reg-emp-cell">
                          <div className={`reg-emp-avatar ${item.avatarTone}`}>
                            {item.initials}
                          </div>
                          <div className="reg-emp-info">
                            <span className="reg-emp-name">{item.employeeName}</span>
                            <span className="reg-emp-loc">
                              {item.empCode ? `${item.empCode} • ` : ""}{item.location}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Attendance Date */}
                      <td style={{ whiteSpace: "nowrap", fontWeight: 500 }}>
                        {item.attendanceDate}
                      </td>

                      {/* 3. Original Timings */}
                      <td className="reg-timing-cell">
                        {item.originalTimings ? item.originalTimings : "—"}
                      </td>

                      {/* 4. Requested Timings */}
                      <td className="reg-timing-cell">
                        <strong>{item.requestedTimings || "—"}</strong>
                      </td>

                      {/* 5. Working Hours */}
                      <td style={{ whiteSpace: "nowrap", fontWeight: 600, color: "var(--reg-ink)" }}>
                        {item.workingHours || "8h 30m"}
                      </td>

                      {/* 6. Reason */}
                      <td
                        style={{
                          color: "var(--reg-ink-muted)",
                          maxWidth: "120px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={item.reason || "—"}
                      >
                        {item.reason || "—"}
                      </td>

                      {/* 7. Manager Approval */}
                      <td>
                        {renderBadge(item.managerApproval)}
                      </td>

                      {/* 8. Admin Approval */}
                      <td>
                        {renderBadge(item.adminApproval)}
                      </td>

                      {/* 9. Overall Status */}
                      <td>
                        {renderBadge(item.overallStatus)}
                      </td>

                      {/* 10. Actions */}
                      <td>
                        <div className="reg-action-btns">
                          <button
                            type="button"
                            className="reg-row-btn"
                            title="Edit / View Details"
                            onClick={() => setEditModalItem(item)}
                          >
                            <Pencil size={14} />
                          </button>
                          {item.type === "Pending" && (
                            <>
                              <button
                                type="button"
                                className="reg-row-btn approve"
                                title="Approve Request"
                                onClick={() => handleApprove(item.id)}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                className="reg-row-btn reject"
                                title="Reject Request"
                                onClick={() => handleReject(item.id)}
                              >
                                <X size={14} />
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
          EDIT / VIEW MODAL
          ===================================================== */}
      {editModalItem && (
        <div className="reg-modal-overlay" onClick={() => setEditModalItem(null)}>
          <div className="reg-modal" onClick={(e) => e.stopPropagation()}>
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
              <div className="reg-emp-cell" style={{ marginBottom: "12px" }}>
                <div className={`reg-emp-avatar ${editModalItem.avatarTone}`}>
                  {editModalItem.initials}
                </div>
                <div>
                  <strong style={{ fontSize: "15px" }}>{editModalItem.employeeName}</strong>
                  <span className="reg-emp-loc">
                    {editModalItem.empCode ? `${editModalItem.empCode} • ` : ""}{editModalItem.location}
                  </span>
                </div>
              </div>

              <div className="reg-grid-2">
                <div className="reg-form-group">
                  <label>Attendance Date</label>
                  <input type="text" readOnly value={editModalItem.attendanceDate || editModalItem.date} />
                </div>
                <div className="reg-form-group">
                  <label>Working Hours</label>
                  <input type="text" readOnly value={editModalItem.workingHours || "8h 30m"} />
                </div>
              </div>

              <div className="reg-grid-2">
                <div className="reg-form-group">
                  <label>Original Timings</label>
                  <input type="text" readOnly value={editModalItem.originalTimings || editModalItem.actualTimings || "—"} />
                </div>
                <div className="reg-form-group">
                  <label>Requested Timings</label>
                  <input type="text" readOnly value={editModalItem.requestedTimings || "—"} />
                </div>
              </div>

              <div className="reg-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div className="reg-form-group">
                  <label>Manager Approval</label>
                  <div style={{ marginTop: "4px" }}>{renderBadge(editModalItem.managerApproval)}</div>
                </div>
                <div className="reg-form-group">
                  <label>Admin Approval</label>
                  <div style={{ marginTop: "4px" }}>{renderBadge(editModalItem.adminApproval)}</div>
                </div>
                <div className="reg-form-group">
                  <label>Overall Status</label>
                  <div style={{ marginTop: "4px" }}>{renderBadge(editModalItem.overallStatus)}</div>
                </div>
              </div>

              <div className="reg-form-group" style={{ marginTop: "8px" }}>
                <label>Reason / Note</label>
                <textarea readOnly value={editModalItem.reason || editModalItem.comment || "—"} rows={3} />
              </div>
            </div>

            <div className="reg-modal-foot">
              {editModalItem.type === "Pending" && (
                <>
                  <button
                    type="button"
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#dc2626",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      handleReject(editModalItem.id);
                      setEditModalItem(null);
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="reg-btn-submit"
                    onClick={() => {
                      handleApprove(editModalItem.id);
                      setEditModalItem(null);
                    }}
                  >
                    Approve
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
