import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  X,
  CheckCircle2,
  User,
  Calendar,
  Scale,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import leaveBalancesEmptyImg from "../../assets/img/leave-balances-empty.jpg";
import "./LeaveBalances.css";

const LEAVE_CYCLES = [
  { id: "apr26-mar27", label: "Apr 2026 - Mar 2027" },
  { id: "apr25-mar26", label: "Apr 2025 - Mar 2026" },
  { id: "apr24-mar25", label: "Apr 2024 - Mar 2025" },
];

export const LeaveBalances = () => {
  const navigate = useNavigate();

  /* ── Form State ── */
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/profile/employees/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((e) => ({
            id: e.emp_code || e.id,
            name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.emp_code,
            dept: e.department || "General",
          }));
          setEmployees(mapped);
        }
      })
      .catch((err) => console.warn("Failed to fetch employees in LeaveBalances:", err));
  }, []);
  const [empDropOpen, setEmpDropOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(LEAVE_CYCLES[0]);
  const [cycleDropOpen, setCycleDropOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const [errors, setErrors] = useState({});

  /* ── Refs for click-outside ── */
  const empRef = useRef(null);
  const cycleRef = useRef(null);
  const actionsRef = useRef(null);

  /* ── Click outside to close dropdowns ── */
  useEffect(() => {
    const handler = (e) => {
      if (empRef.current && !empRef.current.contains(e.target)) setEmpDropOpen(false);
      if (cycleRef.current && !cycleRef.current.contains(e.target)) setCycleDropOpen(false);
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setActionsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3200);
  };

  /* ── Filtered employee list ── */
  const filteredEmployees = employees.filter((e) =>
    `${e.name} ${e.id}`.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  /* ── Submit handler ── */
  const handleSubmit = async () => {
    const newErrors = {};
    if (!selectedEmployee) newErrors.employee = "Please select an employee.";
    if (!selectedCycle) newErrors.cycle = "Please select a leave cycle.";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    try {
      const res = await fetch("http://localhost:8000/api/v1/leave/balance");
      if (res.ok) {
        const b = await res.json();
        const casual = b.casual || { total: 12, used: 0, available: 12 };
        const sick = b.sick || { total: 6, used: 0, available: 6 };
        const earned = b.earned || { total: 15, used: 0, available: 15 };
        const compOff = b.compOff || { total: 3, used: 0, available: 3 };

        const dynamicData = [
          { type: "Casual Leave", allotted: casual.total, taken: casual.used, pending: 0, balance: casual.available, lapsed: 0 },
          { type: "Sick Leave", allotted: sick.total, taken: sick.used, pending: 0, balance: sick.available, lapsed: 0 },
          { type: "Privilege Leave", allotted: earned.total, taken: earned.used, pending: 0, balance: earned.available, lapsed: 0 },
          { type: "Comp-off Leave", allotted: compOff.total, taken: compOff.used, pending: 0, balance: compOff.available, lapsed: 0 },
          { type: "LWP", allotted: 0, taken: 0, pending: 0, balance: 0, lapsed: 0 },
        ];
        setTableData(dynamicData);
      } else {
        setTableData([]);
      }
    } catch (err) {
      console.warn("Failed to fetch live balance:", err);
      setTableData([]);
    }
    setSubmitted(true);
  };

  /* ── Actions ── */
  const handleAction = (action) => {
    setActionsOpen(false);
    if (action === "excel") showToast("Downloading leave balances as Excel…");
    if (action === "pdf") showToast("Generating PDF report…");
    if (action === "print") { window.print(); }
  };

  /* ── Total row ── */
  const totals = tableData.reduce(
    (acc, row) => ({
      allotted: acc.allotted + row.allotted,
      taken: acc.taken + row.taken,
      pending: acc.pending + row.pending,
      balance: acc.balance + row.balance,
      lapsed: acc.lapsed + row.lapsed,
    }),
    { allotted: 0, taken: 0, pending: 0, balance: 0, lapsed: 0 }
  );

  return (
    <div className="lb-page">
      <DashboardHeader />

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="lb-toast" role="alert" aria-live="assertive">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}



      {/* ── Filter Card ── */}
      <div className="lb-filter-card">

        {/* Actions button — top-right of card */}
        <div className="lb-actions-wrap" ref={actionsRef}>
          <button
            id="lb-actions-btn"
            type="button"
            className="lb-btn-actions"
            onClick={() => setActionsOpen((v) => !v)}
            aria-expanded={actionsOpen}
            aria-haspopup="menu"
          >
            Actions
            {actionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {actionsOpen && (
            <div className="lb-actions-dropdown" role="menu" aria-label="Action options">
              <button
                type="button"
                className="lb-action-item"
                role="menuitem"
                onClick={() => handleAction("excel")}
              >
                <FileSpreadsheet size={15} />
                Download Excel
              </button>
              <button
                type="button"
                className="lb-action-item"
                role="menuitem"
                onClick={() => handleAction("pdf")}
              >
                <FileText size={15} />
                Download PDF
              </button>
            </div>
          )}
        </div>

        {/* ── Controls Row ── */}
        <div className="lb-controls-row">

          {/* Employee Name */}
          <div className="lb-field-group" ref={empRef}>
            <label className="lb-field-label" htmlFor="lb-emp-input">
              Employee Name
            </label>
            <div
              className={`lb-custom-select ${empDropOpen ? "is-open" : ""} ${errors.employee ? "has-error" : ""}`}
              onClick={() => setEmpDropOpen((v) => !v)}
            >
              <div className="lb-select-display">
                {selectedEmployee ? (
                  <span className="lb-select-value">{selectedEmployee.name}</span>
                ) : (
                  <input
                    id="lb-emp-input"
                    type="text"
                    className="lb-emp-search-input"
                    placeholder="Search Employee"
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      setEmpDropOpen(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Search employee by name or ID"
                    autoComplete="off"
                  />
                )}
                {selectedEmployee && (
                  <button
                    type="button"
                    className="lb-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmployee(null);
                      setEmployeeSearch("");
                      setSubmitted(false);
                      setTableData([]);
                    }}
                    aria-label="Clear selected employee"
                  >
                    <X size={12} />
                  </button>
                )}
                {!selectedEmployee && (
                  <ChevronDown size={14} className="lb-chevron" />
                )}
              </div>

              {empDropOpen && (
                <ul className="lb-dropdown-list" role="listbox" aria-label="Employee list">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <li
                        key={emp.id}
                        role="option"
                        aria-selected={selectedEmployee?.id === emp.id}
                        className={`lb-dropdown-item ${selectedEmployee?.id === emp.id ? "is-selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(emp);
                          setEmployeeSearch("");
                          setEmpDropOpen(false);
                          setErrors((prev) => ({ ...prev, employee: undefined }));
                          setSubmitted(false);
                          setTableData([]);
                        }}
                      >
                        <User size={13} className="lb-emp-icon" />
                        <div>
                          <div className="lb-emp-name">{emp.name}</div>
                          <div className="lb-emp-meta">{emp.id} · {emp.dept}</div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="lb-dropdown-empty">No employee found</li>
                  )}
                </ul>
              )}
            </div>
            {errors.employee && (
              <span className="lb-field-error" role="alert">{errors.employee}</span>
            )}
          </div>

          {/* Leave Cycle */}
          <div className="lb-field-group" ref={cycleRef}>
            <label className="lb-field-label" htmlFor="lb-cycle-btn">
              Leave Cycle
            </label>
            <div
              className={`lb-custom-select ${cycleDropOpen ? "is-open" : ""} ${errors.cycle ? "has-error" : ""}`}
              onClick={() => setCycleDropOpen((v) => !v)}
            >
              <div className="lb-select-display" id="lb-cycle-btn" aria-haspopup="listbox" role="combobox" aria-expanded={cycleDropOpen}>
                <Calendar size={14} className="lb-search-icon" />
                <span className="lb-select-value">
                  {selectedCycle ? selectedCycle.label : "Select Leave Cycle"}
                </span>
                {cycleDropOpen ? <ChevronUp size={14} className="lb-chevron" /> : <ChevronDown size={14} className="lb-chevron" />}
              </div>

              {cycleDropOpen && (
                <ul className="lb-dropdown-list" role="listbox" aria-label="Leave cycle options">
                  {LEAVE_CYCLES.map((cycle) => (
                    <li
                      key={cycle.id}
                      role="option"
                      aria-selected={selectedCycle?.id === cycle.id}
                      className={`lb-dropdown-item lb-cycle-item ${selectedCycle?.id === cycle.id ? "is-selected" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCycle(cycle);
                        setCycleDropOpen(false);
                        setErrors((prev) => ({ ...prev, cycle: undefined }));
                        setSubmitted(false);
                        setTableData([]);
                      }}
                    >
                      <Calendar size={13} className="lb-emp-icon" />
                      {cycle.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {errors.cycle && (
              <span className="lb-field-error" role="alert">{errors.cycle}</span>
            )}
          </div>

          {/* Submit */}
          <div className="lb-field-group lb-submit-group">
            <label className="lb-field-label lb-invisible-label">&nbsp;</label>
            <button
              id="lb-submit-btn"
              type="button"
              className="lb-btn-submit"
              onClick={handleSubmit}
              aria-label="Submit to load leave balances"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="lb-content-area">
        {!submitted ? (
          /* Empty State */
          <div className="lb-empty-state">
            <p className="lb-note-text">
              <span className="lb-note-keyword">Note:</span>{" "}
              Please select an employee name and leave cycle.
            </p>
            <div className="lb-illustration-wrap">
              <img
                src={leaveBalancesEmptyImg}
                alt="Select an employee and leave cycle to view leave balance data"
                className="lb-illustration"
              />
            </div>
          </div>
        ) : (
          /* Results Table */
          <div className="lb-results-wrap">
            {/* Employee info bar */}
            <div className="lb-result-header">
              <div className="lb-result-emp-info">
                <div className="lb-emp-avatar">
                  {selectedEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="lb-result-emp-name">{selectedEmployee.name}</div>
                  <div className="lb-result-emp-meta">
                    {selectedEmployee.id} · {selectedEmployee.dept}
                  </div>
                </div>
              </div>
              <div className="lb-result-cycle-badge">
                <Calendar size={13} />
                {selectedCycle.label}
              </div>
            </div>

            {/* Table */}
            <div className="lb-table-wrap">
              <table className="lb-table" aria-label="Leave balance details">
                <thead>
                  <tr>
                    <th className="lb-th">Leave Type</th>
                    <th className="lb-th lb-th-num">Allotted</th>
                    <th className="lb-th lb-th-num">Taken</th>
                    <th className="lb-th lb-th-num">Pending</th>
                    <th className="lb-th lb-th-num">Balance</th>
                    <th className="lb-th lb-th-num">Lapsed</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => (
                    <tr key={idx} className="lb-tr">
                      <td className="lb-td lb-td-type">{row.type}</td>
                      <td className="lb-td lb-td-num">{row.allotted}</td>
                      <td className="lb-td lb-td-num lb-taken">{row.taken}</td>
                      <td className="lb-td lb-td-num lb-pending">{row.pending || "—"}</td>
                      <td className="lb-td lb-td-num lb-balance">
                        <span className={`lb-balance-chip ${row.balance === 0 ? "lb-balance-zero" : ""}`}>
                          {row.balance}
                        </span>
                      </td>
                      <td className="lb-td lb-td-num lb-lapsed">
                        {row.lapsed > 0 ? (
                          <span className="lb-lapsed-chip">{row.lapsed}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="lb-tr-total">
                    <td className="lb-td lb-td-total-label">Total</td>
                    <td className="lb-td lb-td-num lb-td-total">{totals.allotted}</td>
                    <td className="lb-td lb-td-num lb-td-total">{totals.taken}</td>
                    <td className="lb-td lb-td-num lb-td-total">{totals.pending || "—"}</td>
                    <td className="lb-td lb-td-num lb-td-total">
                      <span className="lb-balance-chip lb-balance-total">{totals.balance}</span>
                    </td>
                    <td className="lb-td lb-td-num lb-td-total">
                      {totals.lapsed > 0 ? (
                        <span className="lb-lapsed-chip">{totals.lapsed}</span>
                      ) : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Legend */}
            <div className="lb-legend">
              <span className="lb-legend-item lb-legend-balance">
                <span className="lb-legend-dot" /> Balance = Allotted − Taken − Pending
              </span>
              <span className="lb-legend-item lb-legend-lapsed">
                <span className="lb-legend-dot lb-legend-dot-lapsed" /> Lapsed = expired at cycle end
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveBalances;
