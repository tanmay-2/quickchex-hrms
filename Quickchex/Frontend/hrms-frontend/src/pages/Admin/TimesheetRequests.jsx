import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Bell,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Pencil,
  Eye,
  Check,
  X,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./TimesheetRequests.css";

/* =========================================================
   SAMPLE EMPLOYEES DATA (Matching Reference)
   ========================================================= */




const MONTHS = [
  "January-2026",
  "February-2026",
  "March-2026",
  "April-2026",
  "May-2026",
  "June-2026",
  "July-2026",
  "August-2026",
  "September-2026",
  "October-2026",
  "November-2026",
  "December-2026",
];

function TimesheetRequests() {
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState("August-2026");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetch(`https://quickchex-backend.onrender.com/profile/employees/`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const tones = ["avatar-a", "avatar-b", "avatar-c", "avatar-d", "avatar-e", "avatar-f"];
          const mapped = data.map((e, i) => {
            const empName = e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.emp_code || "Employee";
            const initials = empName.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "EM";
            return {
              id: e.emp_code || e.id || `emp-${i + 1}`,
              empCode: e.emp_code || "",
              employeeName: empName,
              initials,
              avatarTone: tones[i % tones.length],
              latestSubmissionDate: "-",
              approvedCount: 0,
              pendingCount: 0,
            };
          });
          setEmployees(mapped);
        }
      })
      .catch(() => setEmployees([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [toastMessage, setToastMessage] = useState("");

  const actionsRef = useRef(null);

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

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter(
      (emp) =>
        emp.employeeName.toLowerCase().includes(query) ||
        emp.empCode.toLowerCase().includes(query)
    );
  }, [employees, search]);

  const allSelected =
    filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmployees.map((e) => e.id));
    }
  };

  const toggleSelectRow = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRowClick = (id) => {
    navigate(`/dashboard/timesheet-requests/${id}`);
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) {
      showToast("Please select at least one employee");
      return;
    }
    showToast(`Approved timesheets for ${selectedIds.length} employees`);
    setSelectedIds([]);
    setActionsOpen(false);
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) {
      showToast("Please select at least one employee");
      return;
    }
    showToast(`Rejected timesheets for ${selectedIds.length} employees`);
    setSelectedIds([]);
    setActionsOpen(false);
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Employee Code,Employee Name,Latest Submission Date,Approved,Pending"]
        .concat(
          employees.map(
            (e) =>
              `${e.empCode},"${e.employeeName}",${e.latestSubmissionDate},${e.approvedCount},${e.pendingCount}`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timesheet_requests_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionsOpen(false);
    showToast(`Exported timesheet requests for ${selectedMonth}`);
  };

  const profileName =
    window.localStorage.getItem("user_name") ||
    window.localStorage.getItem("name") ||
    "RV";

  return (
    <div className="timesheet-requests-page">
      <DashboardHeader />

      {/* =====================================================
          MAIN BODY & CONTROLS
          ===================================================== */}
      <div className="ts-body">
        <div className="ts-top-bar">
          <h2 className="ts-section-title">Timesheet Requests</h2>

          <div className="ts-controls">
            {/* Search Box */}
            <div className="ts-search-wrap">
              <input
                type="text"
                placeholder="Search employee"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ts-search-input"
              />
            </div>

            {/* Filter icon button */}
            <button
              type="button"
              className="ts-icon-btn"
              title="Filters"
              onClick={() => showToast("Filters applied")}
            >
              <SlidersHorizontal size={17} />
            </button>

            {/* Actions Dropdown */}
            <div className="ts-actions-wrap" ref={actionsRef}>
              <button
                type="button"
                className="ts-actions-btn"
                onClick={() => setActionsOpen((prev) => !prev)}
                aria-expanded={actionsOpen}
              >
                Actions
                <ChevronDown size={15} />
              </button>

              {actionsOpen && (
                <div className="ts-actions-menu" role="menu">
                  <button type="button" onClick={handleBulkApprove}>
                    <Check size={15} />
                    Bulk Approve Timesheets
                  </button>
                  <button type="button" onClick={handleBulkReject}>
                    <X size={15} />
                    Bulk Reject Timesheets
                  </button>
                  <button type="button" onClick={handleExportCSV}>
                    <Download size={15} />
                    Export CSV
                  </button>
                </div>
              )}
            </div>

            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                showToast(`Viewing ${e.target.value}`);
              }}
              className="ts-month-select"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* =====================================================
            TIMESHEET REQUESTS TABLE
            ===================================================== */}
        <div className="ts-table-card">
          <table className="ts-table">
            <thead>
              <tr>
                <th className="ts-col-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th>Employee Name</th>
                <th>Latest Submission Date</th>
                <th>No. Of Approved Applications</th>
                <th>No. Of Pending Applications</th>
                <th style={{ textAlign: "right", paddingRight: "28px" }}>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="ts-empty-state">
                      <Clock size={40} />
                      <h3>No Timesheet Requests Found</h3>
                      <p>Try adjusting your search criteria or month filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedIds.includes(emp.id);

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => handleRowClick(emp.id)}
                      className={isSelected ? "is-selected" : ""}
                    >
                      <td className="ts-col-check" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(emp.id, e)}
                          aria-label={`Select ${emp.employeeName}`}
                        />
                      </td>

                      <td>
                        <div className="ts-emp-cell">
                          <div className={`ts-emp-avatar ${emp.avatarTone}`}>
                            {emp.initials}
                          </div>
                          <span className="ts-emp-name">
                            {emp.employeeName}-{emp.empCode}
                          </span>
                        </div>
                      </td>

                      <td>{emp.latestSubmissionDate}</td>

                      <td>
                        <span
                          className={`ts-badge-count ${emp.approvedCount > 0 ? "approved" : ""
                            }`}
                        >
                          {emp.approvedCount}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`ts-badge-count ${emp.pendingCount > 0 ? "pending" : ""
                            }`}
                        >
                          {emp.pendingCount}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            paddingRight: "8px",
                          }}
                        >
                          <button
                            type="button"
                            className="ts-action-edit-btn"
                            title="View Employee Timesheet"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(emp.id);
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 10000,
            padding: "12px 18px",
            borderRadius: "10px",
            background: "#1e293b",
            color: "#ffffff",
            fontSize: "13.5px",
            fontWeight: 500,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default TimesheetRequests;
