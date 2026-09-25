import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Trash2,
  Smartphone,
  Laptop,
  Tablet,
  Download,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./DeviceRegistration.css";

// 3D Empty state image generated & placed in public directory
const EMPTY_STATE_IMG = "/device-registration-empty.jpg";

/* =========================================================
   MOCK INITIAL DATA
   ========================================================= */

const INITIAL_REQUESTS = [];

/* =========================================================
   DEVICE REGISTRATION REQUEST COMPONENT
   ========================================================= */

function DeviceRegistration() {
  const navigate = useNavigate();

  // Active Tab: 'Pending', 'Completed', 'No Device Attached'
  const [activeTab, setActiveTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [requests, setRequests] = useState(() => {
    try {
      const saved = localStorage.getItem("device_reg_requests");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("device_reg_requests", JSON.stringify(requests));
    } catch {}
  }, [requests]);

  // Dropdowns & Modals
  const [actionsOpen, setActionsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewDetailsModal, setViewDetailsModal] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // New Request Form State
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpCode, setNewEmpCode] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newDeviceType, setNewDeviceType] = useState("mobile");

  const actionsRef = useRef(null);

  // Close dropdown on outside click
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

  // Filtered requests by tab and search
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((item) => {
      const matchesTab = item.status === activeTab;
      if (!matchesTab) return false;

      if (!query) return true;

      return (
        item.employeeName.toLowerCase().includes(query) ||
        item.empCode.toLowerCase().includes(query) ||
        item.deviceId.toLowerCase().includes(query)
      );
    });
  }, [requests, activeTab, search]);

  // Tab counts
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const completedCount = requests.filter((r) => r.status === "Completed").length;
  const noDeviceCount = requests.filter((r) => r.status === "No Device Attached").length;

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

  // Actions
  const handleApprove = (id) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Completed" } : r))
    );
    showToast("Device registration request approved successfully");
  };

  const handleReject = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    showToast("Device registration request rejected");
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) {
      showToast("Please select at least one request");
      return;
    }
    setRequests((prev) =>
      prev.map((r) => (selectedIds.includes(r.id) ? { ...r, status: "Completed" } : r))
    );
    setSelectedIds([]);
    setActionsOpen(false);
    showToast(`Approved ${selectedIds.length} device requests`);
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) {
      showToast("Please select at least one request");
      return;
    }
    setRequests((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
    setSelectedIds([]);
    setActionsOpen(false);
    showToast(`Removed ${selectedIds.length} requests`);
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,Employee Name,Emp Code,Device ID,Status,Request Date"]
        .concat(
          requests.map(
            (r) =>
              `${r.id},"${r.employeeName}",${r.empCode},"${r.deviceId}",${r.status},${r.requestDate}`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "device_registration_requests.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionsOpen(false);
    showToast("Exported device registrations to CSV");
  };

  const handleAddRequest = (e) => {
    e.preventDefault();
    if (!newEmpName || !newDeviceId) {
      showToast("Please fill in employee name and device ID");
      return;
    }

    const initials = newEmpName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const newReq = {
      id: `REQ-${Date.now().toString().slice(-4)}`,
      empCode: newEmpCode || `EMP${Math.floor(100 + Math.random() * 900)}`,
      employeeName: newEmpName,
      initials,
      deviceId: newDeviceId,
      deviceType: newDeviceType,
      status: "Pending",
      requestDate: new Date().toISOString().split("T")[0],
      macAddress: "AA:BB:CC:DD:EE:FF",
    };

    setRequests((prev) => [newReq, ...prev]);
    setNewEmpName("");
    setNewEmpCode("");
    setNewDeviceId("");
    setAddModalOpen(false);
    setActiveTab("Pending");
    showToast("New device registration request created");
  };

  const profileName =
    window.localStorage.getItem("user_name") ||
    window.localStorage.getItem("name") ||
    "RV";
  const getDeviceIcon = (type) => {
    if (type === "laptop") return <Laptop size={14} />;
    if (type === "tablet") return <Tablet size={14} />;
    if (type === "none") return <AlertCircle size={14} />;
    return <Smartphone size={14} />;
  };

  return (
    <div className="device-registration-page">
      <DashboardHeader />

      {/* =====================================================
          MAIN CARD & TOOLBAR
          ===================================================== */}
      <div className="dr-body">
        <div className="dr-toolbar">
          {/* TABS */}
          <div className="dr-tabs" role="tablist" aria-label="Device Registration Tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Pending"}
              className={`dr-tab-btn ${activeTab === "Pending" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("Pending");
                setSelectedIds([]);
              }}
            >
              Pending
              <span className="dr-tab-badge">{pendingCount}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Completed"}
              className={`dr-tab-btn ${activeTab === "Completed" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("Completed");
                setSelectedIds([]);
              }}
            >
              Completed
              <span className="dr-tab-badge">{completedCount}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "No Device Attached"}
              className={`dr-tab-btn ${
                activeTab === "No Device Attached" ? "is-active" : ""
              }`}
              onClick={() => {
                setActiveTab("No Device Attached");
                setSelectedIds([]);
              }}
            >
              No Device Attached
              <span className="dr-tab-badge">{noDeviceCount}</span>
            </button>
          </div>

          {/* CONTROLS (SEARCH, FILTER, ACTIONS) */}
          <div className="dr-controls">
            <div className="dr-search-wrap">
              <input
                type="text"
                placeholder="Search employee or device"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="dr-search-input"
              />
            </div>

            <button
              type="button"
              className="dr-icon-btn"
              title="Filter & Settings"
              onClick={() => setFilterOpen((prev) => !prev)}
            >
              <SlidersHorizontal size={17} />
            </button>

            <div className="dr-actions-wrap" ref={actionsRef}>
              <button
                type="button"
                className="dr-actions-btn"
                onClick={() => setActionsOpen((prev) => !prev)}
                aria-expanded={actionsOpen}
              >
                Actions
                <ChevronDown size={15} />
              </button>

              {actionsOpen && (
                <div className="dr-actions-menu" role="menu">
                  <button
                    type="button"
                    onClick={() => {
                      setAddModalOpen(true);
                      setActionsOpen(false);
                    }}
                  >
                    <Plus size={15} />
                    Add Device Registration
                  </button>
                  <button type="button" onClick={handleBulkApprove}>
                    <Check size={15} />
                    Bulk Approve Requests
                  </button>
                  <button type="button" onClick={handleBulkReject}>
                    <X size={15} />
                    Bulk Reject Requests
                  </button>
                  <button type="button" onClick={handleExportCSV}>
                    <Download size={15} />
                    Export Device List
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================
            TABLE & CARD
            ===================================================== */}
        <div className="dr-table-card">
          <table className="dr-table">
            <thead>
              <tr>
                <th className="dr-col-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all requests"
                  />
                </th>
                <th>Employee Name</th>
                <th>Device Ids</th>
                <th>Status</th>
                <th style={{ textAlign: "right", paddingRight: "28px" }}>Actions</th>
              </tr>
            </thead>

            {filteredRequests.length > 0 && (
              <tbody>
                {filteredRequests.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const statusClass =
                    item.status === "Completed"
                      ? "completed"
                      : item.status === "Pending"
                      ? "pending"
                      : "nodevice";

                  return (
                    <tr key={item.id} className={isSelected ? "is-selected" : ""}>
                      <td className="dr-col-check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(item.id)}
                          aria-label={`Select ${item.employeeName}`}
                        />
                      </td>

                      <td>
                        <div className="dr-emp-cell">
                          <div className="dr-emp-avatar">{item.initials}</div>
                          <div className="dr-emp-info">
                            <strong>{item.employeeName}</strong>
                            <span>{item.empCode}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="dr-device-tag">
                          {getDeviceIcon(item.deviceType)}
                          {item.deviceId}
                        </span>
                      </td>

                      <td>
                        <span className={`dr-status-badge ${statusClass}`}>
                          {item.status === "Completed" ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <AlertCircle size={13} />
                          )}
                          {item.status}
                        </span>
                      </td>

                      <td>
                        <div
                          className="dr-action-btns"
                          style={{ justifyContent: "flex-end" }}
                        >
                          {item.status === "Pending" && (
                            <>
                              <button
                                type="button"
                                className="dr-row-btn approve"
                                title="Approve Request"
                                onClick={() => handleApprove(item.id)}
                              >
                                <Check size={15} />
                              </button>
                              <button
                                type="button"
                                className="dr-row-btn reject"
                                title="Reject Request"
                                onClick={() => handleReject(item.id)}
                              >
                                <X size={15} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="dr-row-btn"
                            title="View Details"
                            onClick={() => setViewDetailsModal(item)}
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>

          {/* =====================================================
              3D EMPTY STATE (When no items match)
              ===================================================== */}
          {filteredRequests.length === 0 && (
            <div className="dr-empty-state">
              <div className="dr-empty-illustration-wrap">
                <img
                  src={EMPTY_STATE_IMG}
                  alt="No Device Registration Request"
                  className="dr-empty-illustration"
                />
              </div>

              <p className="dr-empty-message">
                <Info size={16} />
                No Device Registration Request Found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          ADD DEVICE MODAL
          ===================================================== */}
      {addModalOpen && (
        <div className="dr-modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="dr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dr-modal-head">
              <h3>New Device Registration Request</h3>
              <button
                type="button"
                className="dr-modal-close"
                onClick={() => setAddModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRequest}>
              <div className="dr-modal-body">
                <div className="dr-form-group">
                  <label>Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Verma"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                  />
                </div>

                <div className="dr-form-group">
                  <label>Employee Code</label>
                  <input
                    type="text"
                    placeholder="e.g. EMP042"
                    value={newEmpCode}
                    onChange={(e) => setNewEmpCode(e.target.value)}
                  />
                </div>

                <div className="dr-form-group">
                  <label>Device ID / Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEV-IPH-9821 (iPhone 15 Pro)"
                    value={newDeviceId}
                    onChange={(e) => setNewDeviceId(e.target.value)}
                  />
                </div>

                <div className="dr-form-group">
                  <label>Device Type</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                  >
                    <option value="mobile">Smartphone / Mobile</option>
                    <option value="laptop">Laptop / PC</option>
                    <option value="tablet">Tablet / iPad</option>
                  </select>
                </div>
              </div>

              <div className="dr-modal-foot">
                <button
                  type="button"
                  className="dr-btn-cancel"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="dr-btn-submit">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW DETAILS MODAL
          ===================================================== */}
      {viewDetailsModal && (
        <div className="dr-modal-overlay" onClick={() => setViewDetailsModal(null)}>
          <div className="dr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dr-modal-head">
              <h3>Device Request Details</h3>
              <button
                type="button"
                className="dr-modal-close"
                onClick={() => setViewDetailsModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dr-modal-body">
              <div className="dr-emp-cell" style={{ marginBottom: "10px" }}>
                <div className="dr-emp-avatar">{viewDetailsModal.initials}</div>
                <div className="dr-emp-info">
                  <strong style={{ fontSize: "15px" }}>
                    {viewDetailsModal.employeeName}
                  </strong>
                  <span>{viewDetailsModal.empCode}</span>
                </div>
              </div>

              <div className="dr-form-group">
                <label>Device ID & Model</label>
                <input type="text" readOnly value={viewDetailsModal.deviceId} />
              </div>

              <div className="dr-form-group">
                <label>MAC Address / UUID</label>
                <input type="text" readOnly value={viewDetailsModal.macAddress} />
              </div>

              <div className="dr-form-group">
                <label>Request Date</label>
                <input type="text" readOnly value={viewDetailsModal.requestDate} />
              </div>

              <div className="dr-form-group">
                <label>Current Status</label>
                <input type="text" readOnly value={viewDetailsModal.status} />
              </div>
            </div>

            <div className="dr-modal-foot">
              <button
                type="button"
                className="dr-btn-submit"
                onClick={() => setViewDetailsModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMessage && <div className="dr-toast">{toastMessage}</div>}
    </div>
  );
}

export default DeviceRegistration;
