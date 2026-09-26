import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  PiCaretLeftDuotone,
  PiBellDuotone,
  PiMagnifyingGlassDuotone,
  PiSlidersHorizontalDuotone,
  PiCaretDownDuotone,
  PiPencilSimpleDuotone,
  PiCheckDuotone,
  PiXDuotone,
  PiArrowsClockwiseDuotone,
  PiQuestionDuotone,
} from "react-icons/pi";

import "./leaveApplication.css";

const PALETTE = ["#F59E0B", "#EC4899", "#22C55E", "#F43F5E", "#EAB308", "#8B5CF6", "#3B82F6"];

const normalizeLeave = (l, idx = 0) => {
  const name = l.name || l.employee_name || l.emp_code || "Employee";
  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "EM";
  const color = PALETTE[idx % PALETTE.length];
  const code = l.code || l.emp_code || "EMP";
  const daysVal = l.days || (l.total_days ? `${l.total_days} days` : "1.0 days");
  const status = l.status || "Pending";
  const level = status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : "Level 1 Approval Pending";

  return {
    id: l.id,
    name,
    code,
    location: l.location || "Mumbai; Maharashtra",
    initials,
    color,
    category: l.category || l.leave_type || "Leave Without Pay.",
    startDate: l.startDate || l.start_date || "",
    endDate: l.endDate || l.end_date || "",
    days: daysVal,
    status,
    level,
    approver: l.approver || "Admin Approver",
  };
};

/* =========================================================
   LEAVE APPLICATION PAGE (LIVE DB INTEGRATED)
   ========================================================= */

function LeaveApplication() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending");
  const [selected, setSelected] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = () => {
    setLoading(true);
    fetch(`https://quickchex-backend.onrender.com/api/v1/leaves/admin/all`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setLeaves(Array.isArray(data) ? data.map(normalizeLeave) : []);
      })
      .catch((err) => {
        console.warn("Failed to fetch leaves:", err);
        setLeaves([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const pendingApplications = useMemo(
    () => leaves.filter((l) => (l.status || "").toLowerCase() === "pending"),
    [leaves]
  );
  const completedApplications = useMemo(
    () => leaves.filter((l) => (l.status || "").toLowerCase() !== "pending"),
    [leaves]
  );

  const rows = activeTab === "pending" ? pendingApplications : completedApplications;
  const allSelected = selected.length > 0 && selected.length === rows.length;

  const toggleAll = () => {
    setSelected(allSelected ? [] : rows.map((r) => r.id));
  };

  const toggleOne = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelected([]);
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`https://quickchex-backend.onrender.com/api/v1/leaves/${id}/approve`, {
        method: "PUT",
      });
      if (res.ok) {
        fetchLeaves();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to approve leave");
      }
    } catch (e) {
      alert("Error approving leave: " + e.message);
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await fetch(`https://quickchex-backend.onrender.com/api/v1/leaves/${id}/reject`, {
        method: "PUT",
      });
      if (res.ok) {
        fetchLeaves();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to reject leave");
      }
    } catch (e) {
      alert("Error rejecting leave: " + e.message);
    }
  };

  return (
    <div className="la-page">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="la-header">
        <div className="la-header-decor" aria-hidden="true">
          <span className="la-decor-circle la-decor-circle--a" />
          <span className="la-decor-circle la-decor-circle--b" />
          <span className="la-decor-circle la-decor-circle--c" />
        </div>

        <div className="la-header-right">
          <div className="la-org-pill">LA ESFERA MULTISERVICES LLP</div>

          <button
            type="button"
            className="la-icon-btn"
            aria-label="Notifications"
          >
            <PiBellDuotone />
            <span className="la-badge">1</span>
          </button>

          <div className="la-avatar" aria-label="Account">
            RV
          </div>
        </div>
      </div>

      {/* =====================================================
          BODY
          ===================================================== */}

      <div className="la-body">
        <div className="la-toolbar">
          <div className="la-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "pending"}
              className={`la-tab ${activeTab === "pending" ? "active" : ""
                }`}
              onClick={() => switchTab("pending")}
            >
              Pending Applications
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "completed"}
              className={`la-tab ${activeTab === "completed" ? "active" : ""
                }`}
              onClick={() => switchTab("completed")}
            >
              Completed Applications
            </button>
          </div>

          <div className="la-toolbar-right">
            <button type="button" className="la-tool-btn" aria-label="Filter">
              <PiSlidersHorizontalDuotone />
            </button>

            <button type="button" className="la-actions-btn">
              Actions
              <PiCaretDownDuotone />
            </button>
          </div>
        </div>

        <div className="la-table-wrap">
          <table className="la-table">
            <thead>
              <tr>
                <th className="la-col-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all applications"
                  />
                </th>
                <th>Employee Name</th>
                <th>Category</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Leave Days</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)", fontStyle: "italic" }}>
                    Loading live leave applications from database...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    {activeTab === "pending" ? "No pending leave applications found." : "No completed leave applications found."}
                  </td>
                </tr>
              ) : (
                rows.map((app) => (
                  <tr key={app.id}>
                    <td className="la-col-check">
                      <input
                        type="checkbox"
                        checked={selected.includes(app.id)}
                        onChange={() => toggleOne(app.id)}
                        aria-label={`Select ${app.name}'s application`}
                      />
                    </td>

                    <td>
                      <div className="la-emp">
                        <span
                          className="la-emp-avatar"
                          style={{ background: app.color }}
                        >
                          {app.initials}
                        </span>

                        <div className="la-emp-info">
                          <span className="la-emp-name">
                            {app.name} - {app.code}
                          </span>
                          <span className="la-emp-loc">{app.location}</span>
                        </div>
                      </div>
                    </td>

                    <td>{app.category}</td>
                    <td>{app.startDate}</td>
                    <td>{app.endDate}</td>
                    <td>{app.days}</td>

                    <td>
                      <div className="la-status">
                        <span
                          className={`la-status-level ${app.level === "Approved"
                              ? "approved"
                              : app.level === "Rejected"
                                ? "rejected"
                                : ""
                            }`}
                        >
                          {app.level}
                        </span>
                        <span className="la-status-approver">
                          with: {app.approver}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="la-row-actions">
                        {activeTab === "pending" ? (
                          <>
                            <button
                              type="button"
                              className="la-action-btn la-action-btn--approve"
                              onClick={() => handleApprove(app.id)}
                              title="Approve Leave"
                              aria-label={`Approve ${app.name}'s application`}
                            >
                              <PiCheckDuotone />
                            </button>

                            <button
                              type="button"
                              className="la-action-btn la-action-btn--reject"
                              onClick={() => handleReject(app.id)}
                              title="Reject Leave"
                              aria-label={`Reject ${app.name}'s application`}
                            >
                              <PiXDuotone />
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "capitalize" }}>
                            {app.status}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="la-load-more-wrap">
          <button type="button" className="la-load-more">
            <PiArrowsClockwiseDuotone />
            Load More
          </button>
        </div>
      </div>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="la-footer">COPYRIGHT © 2026 LA ESFERA</footer>

      <button type="button" className="la-help" aria-label="Help">
        <PiQuestionDuotone />
      </button>
    </div>
  );
}

export default LeaveApplication;