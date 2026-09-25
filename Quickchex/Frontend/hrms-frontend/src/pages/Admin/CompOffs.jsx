import React, { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Check,
  X,
  Calendar,
  User,
  Clock,
  MessageSquare,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
  Filter,
} from "lucide-react";
import { CustomSelect, CustomDatePicker } from "../../components/ui";
import "./CompOffs.css";

const INITIAL_EARNINGS = [];

const HALF_DAY_OPTIONS = [
  { value: "No", label: "No (Full Day)", sublabel: "1 Full Day Credit" },
  { value: "Yes", label: "Yes (Half Day)", sublabel: "0.5 Day Credit" },
];

const FILTER_HALF_DAY_OPTIONS = [
  { value: "all", label: "All Half Days" },
  { value: "yes", label: "Yes (Half Day)" },
  { value: "no", label: "No (Full Day)" },
];

const FILTER_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function CompOffs() {
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "completed"
  const [earnings, setEarnings] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [halfDayFilter, setHalfDayFilter] = useState("all");

  // Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEarning, setNewEarning] = useState({
    employee: "",
    appliedFor: new Date().toISOString().split("T")[0],
    isHalfDay: "No",
    comment: "",
  });

  useEffect(() => {
    // Fetch live comp-off entries
    fetch("http://localhost:8000/api/v1/leave/comp-off")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((d, i) => ({
            id: d.id || i + 1,
            employeeName: d.employeeName || d.name || "Employee",
            empCode: d.empCode || d.emp_code || "",
            avatarBg: "#8b5cf6",
            appliedOn: d.appliedOn || d.date || "Recent",
            appliedFor: d.appliedFor || d.date || "Recent",
            isHalfDay: d.isHalfDay || "No",
            usedOn: d.usedOn || "—",
            comment: d.comment || d.reason || "",
            status: d.status || "Level 1 Approval Pending",
            level: d.level || "Level 1",
            tab: (d.status || "").toLowerCase().includes("pending") ? "pending" : "completed",
          }));
          setEarnings(mapped);
        }
      })
      .catch((err) => console.warn("Failed to fetch comp-offs:", err));

    // Fetch live employees for select dropdown
    fetch("http://localhost:8000/profile/employees/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const opts = data.map((e) => ({
            value: `${e.name || e.emp_code} - ${e.emp_code}`,
            label: e.name || e.emp_code,
            code: e.emp_code,
            avatarBg: "#7c3aed",
          }));
          setEmployeeOptions(opts);
          if (opts.length > 0) {
            setNewEarning((prev) => ({ ...prev, employee: opts[0].value }));
          }
        }
      })
      .catch((err) => console.warn("Failed to fetch employees for comp-off:", err));
  }, []);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filtered Earnings
  const filteredEarnings = useMemo(() => {
    return earnings.filter((item) => {
      if (item.tab !== activeTab) return false;

      const matchesSearch =
        item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.empCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.comment.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status.toLowerCase().includes(statusFilter.toLowerCase());

      const matchesHalfDay =
        halfDayFilter === "all" || item.isHalfDay.toLowerCase() === halfDayFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesHalfDay;
    });
  }, [earnings, activeTab, searchQuery, statusFilter, halfDayFilter]);

  // Actions
  const handleApprove = (id) => {
    setEarnings((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            status: "Approved",
            tab: "completed",
            level: "Completed",
          }
          : item
      )
    );
    showToast("Comp Off earning approved successfully!");
  };

  const handleReject = (id) => {
    setEarnings((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            status: "Rejected",
            tab: "completed",
            level: "Completed",
          }
          : item
      )
    );
    showToast("Comp Off earning rejected.", "warning");
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newEarning.comment.trim()) return;

    const [empName, empCode] = newEarning.employee.split(" - ");
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).replace(/\//g, "-");

    let formattedAppliedFor = newEarning.appliedFor;
    if (newEarning.appliedFor && newEarning.appliedFor.includes("-")) {
      const parts = newEarning.appliedFor.split("-");
      if (parts[0].length === 4) {
        formattedAppliedFor = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const created = {
      id: Date.now(),
      employeeName: empName.trim(),
      empCode: empCode ? empCode.trim() : "LE999",
      avatarBg: "#7c3aed",
      appliedOn: today,
      appliedFor: formattedAppliedFor,
      isHalfDay: newEarning.isHalfDay,
      usedOn: "—",
      comment: newEarning.comment.trim(),
      status: "Level 1 Approval Pending",
      level: "Level 1",
      tab: "pending",
    };

    setEarnings((prev) => [created, ...prev]);
    setAddModalOpen(false);
    setNewEarning({
      employee: "",
      appliedFor: new Date().toISOString().split("T")[0],
      isHalfDay: "No",
      comment: "",
    });
    showToast(`Comp Off earning added for ${created.employeeName}.`);
  };

  return (
    <div className="compoffs-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`co-toast co-toast-${toast.type}`} role="alert">
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Container Card */}
      <div className="co-container-card">
        {/* Top Tab Bar & Actions Bar */}
        <div className="co-toolbar">
          <div className="co-tabs-wrap">
            <button
              type="button"
              className={`co-tab-btn ${activeTab === "pending" ? "is-active" : ""}`}
              onClick={() => setActiveTab("pending")}
            >
              Pending Earnings
              <span className="co-tab-count">
                {earnings.filter((e) => e.tab === "pending").length}
              </span>
            </button>
            <button
              type="button"
              className={`co-tab-btn ${activeTab === "completed" ? "is-active" : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              Completed Earnings
              <span className="co-tab-count">
                {earnings.filter((e) => e.tab === "completed").length}
              </span>
            </button>
          </div>

          <div className="co-actions-wrap">
            {/* Search Input */}
            <div className="co-search-box">
              <input
                type="text"
                placeholder="Search employee or comment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="co-search-clear"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="co-filter-wrap">
              <button
                type="button"
                className={`co-icon-btn ${showFilterPopover ? "is-active" : ""}`}
                title="Filter Options"
                onClick={() => setShowFilterPopover(!showFilterPopover)}
              >
                <SlidersHorizontal size={15} />
              </button>

              {showFilterPopover && (
                <div className="co-filter-popover">
                  <div className="co-filter-popover-header">
                    <span>Filter Earnings</span>
                    <button
                      type="button"
                      className="co-popover-close"
                      onClick={() => setShowFilterPopover(false)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="co-filter-item">
                    <label>Half Day</label>
                    <CustomSelect
                      size="sm"
                      options={FILTER_HALF_DAY_OPTIONS}
                      value={halfDayFilter}
                      onChange={(val) => setHalfDayFilter(val)}
                    />
                  </div>
                  {activeTab === "completed" && (
                    <div className="co-filter-item">
                      <label>Status</label>
                      <CustomSelect
                        size="sm"
                        options={FILTER_STATUS_OPTIONS}
                        value={statusFilter}
                        onChange={(val) => setStatusFilter(val)}
                      />
                    </div>
                  )}
                  <div className="co-filter-actions">
                    <button
                      type="button"
                      className="co-btn-reset"
                      onClick={() => {
                        setHalfDayFilter("all");
                        setStatusFilter("all");
                        setShowFilterPopover(false);
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Add Comp Off Earning Button */}
            <button
              type="button"
              className="co-btn-primary"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus size={16} /> Comp Off Earning
            </button>
          </div>
        </div>

        {/* Earnings Table */}
        <div className="co-table-wrap">
          <table className="co-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Applied On</th>
                <th>Applied For</th>
                <th>Is Half Day?</th>
                <th>Used On</th>
                <th>Comment</th>
                <th>Status</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEarnings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="co-empty-cell">
                    <AlertCircle size={24} />
                    <p>No compensatory off earnings found.</p>
                  </td>
                </tr>
              ) : (
                filteredEarnings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="co-emp-cell">
                        <div
                          className="co-emp-avatar"
                          style={{ backgroundColor: item.avatarBg }}
                        >
                          {item.employeeName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="co-emp-text">
                          <span className="co-emp-name">
                            {item.employeeName} - {item.empCode}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{item.appliedOn}</td>
                    <td>{item.appliedFor}</td>
                    <td>
                      <span className={`co-half-day-pill ${item.isHalfDay === "Yes" ? "is-yes" : ""}`}>
                        {item.isHalfDay}
                      </span>
                    </td>
                    <td>{item.usedOn}</td>
                    <td className="co-comment-cell" title={item.comment}>
                      {item.comment}
                    </td>
                    <td>
                      <span
                        className={`co-status-badge ${item.status.includes("Pending")
                            ? "is-pending"
                            : item.status === "Approved"
                              ? "is-approved"
                              : "is-rejected"
                          }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="td-actions">
                      {item.tab === "pending" ? (
                        <div className="co-action-btns">
                          <button
                            type="button"
                            className="co-act-btn co-act-approve"
                            title="Approve Comp Off"
                            onClick={() => handleApprove(item.id)}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="co-act-btn co-act-reject"
                            title="Reject Comp Off"
                            onClick={() => handleReject(item.id)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="co-completed-txt">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          ADD COMP OFF EARNING MODAL
          ========================================================= */}
      {addModalOpen && (
        <div className="co-modal-backdrop" onClick={() => setAddModalOpen(false)}>
          <div className="co-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="co-modal-header">
              <h3>Add Comp Off Earning</h3>
              <button
                type="button"
                className="co-modal-close"
                onClick={() => setAddModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="co-modal-body">
                <div className="co-form-group">
                  <label>
                    Select Employee <span className="req-star">*</span>
                  </label>
                  <CustomSelect
                    searchable
                    placeholder="Choose an employee..."
                    options={employeeOptions}
                    value={newEarning.employee}
                    onChange={(val) =>
                      setNewEarning((p) => ({ ...p, employee: val }))
                    }
                  />
                </div>

                <div className="co-form-row">
                  <div className="co-form-group">
                    <label>
                      Worked On Date <span className="req-star">*</span>
                    </label>
                    <CustomDatePicker
                      required
                      placeholder="Select date..."
                      value={newEarning.appliedFor}
                      onChange={(val) =>
                        setNewEarning((p) => ({ ...p, appliedFor: val }))
                      }
                    />
                  </div>

                  <div className="co-form-group">
                    <label>Is Half Day?</label>
                    <CustomSelect
                      options={HALF_DAY_OPTIONS}
                      value={newEarning.isHalfDay}
                      onChange={(val) =>
                        setNewEarning((p) => ({ ...p, isHalfDay: val }))
                      }
                    />
                  </div>
                </div>

                <div className="co-form-group">
                  <label>
                    Reason / Comments <span className="req-star">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Worked on weekend release deployment or holiday support..."
                    value={newEarning.comment}
                    onChange={(e) =>
                      setNewEarning((p) => ({ ...p, comment: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="co-modal-footer">
                <button
                  type="button"
                  className="co-btn-secondary"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="co-btn-primary">
                  Submit Earning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
