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

const normalizeReg = (r) => {
  const isPending = (r.status || "Pending").toLowerCase().includes("pending");
  const empName = r.employeeName || r.name || r.emp_code || "Employee";
  const initials = empName.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "EM";
  return {
    id: String(r.id).startsWith("REG-") ? r.id : `REG-${r.id}`,
    rawId: r.id,
    employeeName: empName,
    empCode: r.emp_code || r.employeeId || "",
    location: r.location || "Mumbai, Maharashtra",
    initials,
    avatarTone: "tone-purple",
    date: r.effectiveDate || r.appliedDate || r.date || "Today",
    requestedTimings: r.inTime || r.outTime ? `In: ${r.inTime || "--"} Out: ${r.outTime || "--"}` : (r.requestedTimings || "--"),
    actualTimings: r.actualTimings || "--",
    reason: r.reason || "",
    comment: r.reason || r.comment || "",
    status: r.status || "Pending",
    approver: r.approver || "Admin Approver",
    type: isPending ? "Pending" : "Completed",
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
        r.employeeName.toLowerCase().includes(term) ||
        r.date.toLowerCase().includes(term) ||
        (r.comment && r.comment.toLowerCase().includes(term)) ||
        (r.reason && r.reason.toLowerCase().includes(term)) ||
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
        r.id === id ? { ...r, type: "Completed", status: "Approved" } : r
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
        r.id === id ? { ...r, type: "Completed", status: "Rejected" } : r
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
      employeeName: formName,
      empCode: `LE${Math.floor(100 + Math.random() * 900)}`,
      location: "Mumbai; Mumbai; Mahara...",
      initials: initials || "EM",
      avatarTone: "tone-purple",
      date: formDate,
      requestedTimings: reqTimings || "In: 09:30 AM Out: 06:30 PM",
      actualTimings: actTimings || "In: 10:00 AM Out: 04:00 PM",
      reason: formReason,
      comment: formComment || "Regularization submitted",
      status: "Level 1 Approval Pending",
      approver: "Migdad Mirza",
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
                <th className="reg-col-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all requests"
                  />
                </th>
                <th>Employee Name</th>
                <th>Date</th>
                <th>Requested Timings</th>
                <th>Actual Timings</th>
                <th>Reason</th>
                <th>Comment</th>
                <th>Status</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "60px 20px" }}>
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
                            <span className="reg-emp-loc">{item.location}</span>
                          </div>
                        </div>
                      </td>

                      <td style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{item.date}</td>

                      <td className="reg-timing-cell">
                        {item.requestedTimings ? <strong>{item.requestedTimings}</strong> : "—"}
                      </td>

                      <td className="reg-timing-cell">
                        {item.actualTimings ? item.actualTimings : "—"}
                      </td>

                      <td style={{ color: "var(--reg-ink-muted)", maxWidth: "120px" }}>
                        {item.reason || "—"}
                      </td>

                      <td style={{ color: "var(--reg-ink)", maxWidth: "180px" }}>
                        {item.comment || "—"}
                      </td>

                      <td>
                        <div>
                          <span className="reg-status-text">{item.status}</span>
                          {item.approver && (
                            <span className="reg-status-sub">with: {item.approver}</span>
                          )}
                        </div>
                      </td>

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
                                <MoreVertical size={14} />
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
              <div className="reg-emp-cell" style={{ marginBottom: "8px" }}>
                <div className={`reg-emp-avatar ${editModalItem.avatarTone}`}>
                  {editModalItem.initials}
                </div>
                <div>
                  <strong style={{ fontSize: "15px" }}>{editModalItem.employeeName}</strong>
                  <span className="reg-emp-loc">{editModalItem.location}</span>
                </div>
              </div>

              <div className="reg-grid-2">
                <div className="reg-form-group">
                  <label>Date</label>
                  <input type="text" readOnly value={editModalItem.date} />
                </div>
                <div className="reg-form-group">
                  <label>Status</label>
                  <input type="text" readOnly value={editModalItem.status} />
                </div>
              </div>

              <div className="reg-form-group">
                <label>Requested Timings</label>
                <input type="text" readOnly value={editModalItem.requestedTimings || "—"} />
              </div>

              <div className="reg-form-group">
                <label>Actual Timings</label>
                <input type="text" readOnly value={editModalItem.actualTimings || "—"} />
              </div>

              <div className="reg-form-group">
                <label>Comment / Note</label>
                <textarea readOnly value={editModalItem.comment || "—"} />
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
