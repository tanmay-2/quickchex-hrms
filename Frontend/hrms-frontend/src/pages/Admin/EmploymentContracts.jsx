import { useContext, useEffect, useRef, useState } from "react";

import {
  PiSignatureDuotone,
  PiMagnifyingGlassDuotone,
  PiSlidersDuotone,
  PiCaretDownDuotone,
  PiPlusDuotone,
  PiUploadSimpleDuotone,
  PiCheckCircleDuotone,
  PiClockDuotone,
  PiEyeDuotone,
  PiXBold,
  PiDownloadSimpleDuotone,
  PiFileTextDuotone,
  PiSpinnerGapDuotone,
} from "react-icons/pi";

import { DashboardHeader, DashboardShellContext } from "../../components/header/DashboardHeader";
import { apiRequest } from "../../services/apiClient";
import "./employment-contracts.css";

/* =========================================================
   SAMPLE DATA — matching reference design
   ========================================================= */

const SAMPLE_CONTRACTS = [];


/* =========================================================
   HELPERS
   ========================================================= */

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProofCell({ status, label, onToggle }) {
  const uploaded = status === "uploaded";

  return (
    <div className={`ec-doc ${uploaded ? "is-uploaded" : "is-pending"}`}>
      <span className="ec-doc-status">
        {uploaded ? <PiCheckCircleDuotone /> : <PiClockDuotone />}
        {uploaded ? "Uploaded" : "Pending"}
      </span>

      <button
        type="button"
        className="ec-doc-action"
        title={uploaded ? `View ${label}` : `Upload ${label}`}
        onClick={onToggle}
      >
        {uploaded ? <PiEyeDuotone /> : <PiUploadSimpleDuotone />}
      </button>
    </div>
  );
}

/* =========================================================
   PENDING EMPLOYMENT CONTRACTS PAGE
   ========================================================= */

function EmploymentContracts() {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employeesList, setEmployeesList] = useState([]);
  const [noticeCount, setNoticeCount] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Modals
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewContractData, setViewContractData] = useState(null);

  // Forms
  const [sendForm, setSendForm] = useState({
    empCode: "",
    employeeName: "",
    contractType: "Permanent Employment Contract",
    startDate: "2026-11-01",
    endDate: "2027-10-31",
    notes: "",
  });

  const [addForm, setAddForm] = useState({
    empCode: "",
    employeeName: "",
    startDate: "2026-11-01",
    endDate: "2027-10-31",
  });

  const actionsRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3200);
  };

  const fetchContracts = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest("/api/v1/contracts");
      if (Array.isArray(data)) {
        setContracts(data);
      }
    } catch (err) {
      console.warn("Failed to fetch employment contracts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeesAndNotice = async () => {
    try {
      const emps = await apiRequest("/api/v1/profile/employees/");
      if (Array.isArray(emps)) {
        setEmployeesList(emps);
      }
    } catch (err) {
      console.warn("Failed to fetch employees:", err);
    }

    try {
      const resignations = await apiRequest("/api/v1/resignation/");
      if (Array.isArray(resignations)) {
        const activeNotice = resignations.filter(
          (r) =>
            (r.status || "").toLowerCase().includes("notice") ||
            (r.status || "").toLowerCase().includes("progress") ||
            (r.status || "").toLowerCase() === "urgent"
        ).length;
        setNoticeCount(activeNotice);
      }
    } catch (err) {
      console.warn("Failed to fetch notice count:", err);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchEmployeesAndNotice();
  }, []);

  /* =======================================================
     CLOSE ACTIONS MENU ON OUTSIDE CLICK / TOUCH
     ======================================================= */

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  /* =======================================================
     FILTERED ROWS
     ======================================================= */

  const filtered = contracts.filter((contract) =>
    (contract.employeeName || "").toLowerCase().includes(search.trim().toLowerCase())
  );

  const allSelected = filtered.length > 0 && selected.length === filtered.length;

  /* =======================================================
     SELECTION
     ======================================================= */

  const toggleAll = () => {
    setSelected(allSelected ? [] : filtered.map((contract) => contract.id));
  };

  const toggleRow = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((rowId) => rowId !== id)
        : [...current, id]
    );
  };

  /* =======================================================
     ACTIONS HANDLERS
     ======================================================= */

  const toggleActions = (e) => {
    e.stopPropagation();
    setActionsOpen((prev) => !prev);
  };

  const runBulkAction = async (action) => {
    setActionsOpen(false);

    if (action === "add") {
      setAddForm({
        empCode: "",
        employeeName: "",
        startDate: "2026-11-01",
        endDate: "2027-10-31",
      });
      setAddModalOpen(true);
    } else if (action === "upload-proof") {
      const targets = selected.length === 0
        ? contracts.filter((c) => c.approvalProof === "pending")
        : contracts.filter((c) => selected.includes(c.id));

      if (targets.length === 0) {
        showToast("All contracts already have approval proofs uploaded.");
        return;
      }

      setContracts((prev) =>
        prev.map((c) =>
          selected.length === 0 || selected.includes(c.id)
            ? { ...c, approvalProof: "uploaded" }
            : c
        )
      );

      for (const t of targets) {
        apiRequest(`/api/v1/contracts/${t.id}`, {
          method: "PUT",
          body: JSON.stringify({ approvalProof: "uploaded" }),
        }).catch((err) => console.warn(err));
      }

      showToast(`Approval proof uploaded for ${targets.length} contract(s).`);
    } else if (action === "upload-agreement") {
      const targets = selected.length === 0
        ? contracts.filter((c) => c.agreement === "pending")
        : contracts.filter((c) => selected.includes(c.id));

      if (targets.length === 0) {
        showToast("All contracts already have signed agreements uploaded.");
        return;
      }

      setContracts((prev) =>
        prev.map((c) =>
          selected.length === 0 || selected.includes(c.id)
            ? { ...c, agreement: "uploaded" }
            : c
        )
      );

      for (const t of targets) {
        apiRequest(`/api/v1/contracts/${t.id}`, {
          method: "PUT",
          body: JSON.stringify({ agreement: "uploaded" }),
        }).catch((err) => console.warn(err));
      }

      showToast(`Contract agreement uploaded for ${targets.length} contract(s).`);
    }
  };

  const openSendModal = () => {
    const selectedEmployee =
      selected.length === 1
        ? filtered.find((c) => c.id === selected[0])?.employeeName || ""
        : "";

    setSendForm({
      empCode: "",
      employeeName: selectedEmployee,
      contractType: "Permanent Employment Contract",
      startDate: "2026-11-01",
      endDate: "2027-10-31",
      notes: "",
    });
    setSendModalOpen(true);
  };

  const handleSendSubmit = async (e) => {
    e.preventDefault();
    if (!sendForm.employeeName.trim()) {
      showToast("Please enter or select an employee.");
      return;
    }

    const selectedEmp = employeesList.find(
      (emp) => emp.name === sendForm.employeeName || emp.emp_code === sendForm.empCode
    );

    const payload = {
      emp_code: sendForm.empCode || selectedEmp?.emp_code || "",
      employee_name: sendForm.employeeName.trim(),
      department: selectedEmp?.department || "Operations",
      contract_type: sendForm.contractType || "Permanent Employment Contract",
      start_date: sendForm.startDate,
      end_date: sendForm.endDate,
      notes: sendForm.notes || "",
    };

    try {
      const res = await apiRequest("/api/v1/contracts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res && res.contract) {
        setContracts((prev) => [...prev, res.contract]);
      } else {
        await fetchContracts();
      }
      setSendModalOpen(false);
      showToast(`Contract sent successfully to ${sendForm.employeeName}!`);
    } catch (err) {
      console.error("Failed to send contract:", err);
      showToast("Failed to create contract on server.");
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.employeeName.trim()) {
      showToast("Please enter or select an employee.");
      return;
    }

    const selectedEmp = employeesList.find(
      (emp) => emp.name === addForm.employeeName || emp.emp_code === addForm.empCode
    );

    const payload = {
      emp_code: addForm.empCode || selectedEmp?.emp_code || "",
      employee_name: addForm.employeeName.trim(),
      department: selectedEmp?.department || "Operations",
      contract_type: "Permanent Employment Contract",
      start_date: addForm.startDate,
      end_date: addForm.endDate,
    };

    try {
      const res = await apiRequest("/api/v1/contracts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res && res.contract) {
        setContracts((prev) => [...prev, res.contract]);
      } else {
        await fetchContracts();
      }
      setAddModalOpen(false);
      showToast(`New contract created for ${addForm.employeeName}!`);
    } catch (err) {
      console.error("Failed to add contract:", err);
      showToast("Failed to create contract on server.");
    }
  };

  const handleDocToggle = async (contract, docType) => {
    const currentStatus = contract[docType];
    const newStatus = currentStatus === "uploaded" ? "pending" : "uploaded";

    setContracts((prev) =>
      prev.map((c) =>
        c.id === contract.id ? { ...c, [docType]: newStatus } : c
      )
    );

    const docLabel = docType === "approvalProof" ? "Approval proof" : "Agreement";
    showToast(`${docLabel} marked as ${newStatus} for ${contract.employeeName}.`);

    try {
      await apiRequest(`/api/v1/contracts/${contract.id}`, {
        method: "PUT",
        body: JSON.stringify({ [docType]: newStatus }),
      });
    } catch (err) {
      console.warn("Failed to sync status:", err);
    }
  };

  const isInsideShell = useContext(DashboardShellContext);

  const completedCount = contracts.filter(
    (c) => c.approvalProof === "uploaded" && c.agreement === "uploaded"
  ).length;

  const pendingCount = contracts.filter(
    (c) => c.approvalProof === "pending" || c.agreement === "pending"
  ).length;

  return (
    <div className="ec-page">
      {!isInsideShell && <DashboardHeader />}

      {/* =====================================================
          TOP ACTION & STAT CARDS (Phone 6)
          ===================================================== */}
      <div className="ec-top-action-bar">
        <button
          type="button"
          className="ec-send-btn"
          onClick={openSendModal}
          title="Send contract to employee"
        >
          <PiUploadSimpleDuotone size={16} />
          <span>Send to Employee…</span>
        </button>
      </div>

      <div className="ec-stats-grid">
        <div className="ec-stat-card">
          <div className="ec-stat-head">
            <div className="ec-stat-head-left">
              <div className="ec-stat-icon-badge blue">
                <PiSignatureDuotone size={17} />
              </div>
              <span className="ec-stat-label">Total Contracts</span>
            </div>
            <span className="ec-stat-pill teal">Active</span>
          </div>
          <div className="ec-stat-val-wrap">
            <h2 className="ec-stat-val">{contracts.length}</h2>
          </div>
          <div className="ec-stat-footer">Total Headcount: Active</div>
        </div>

        <div className="ec-stat-card">
          <div className="ec-stat-head">
            <div className="ec-stat-head-left">
              <div className="ec-stat-icon-badge amber">
                <PiClockDuotone size={17} />
              </div>
              <span className="ec-stat-label">Pending Approval</span>
            </div>
            <span className="ec-stat-pill amber">Pending</span>
          </div>
          <div className="ec-stat-val-wrap">
            <h2 className="ec-stat-val">{pendingCount}</h2>
          </div>
          <div className="ec-stat-footer">Pending Approval: Pending</div>
        </div>

        <div className="ec-stat-card">
          <div className="ec-stat-head">
            <div className="ec-stat-head-left">
              <div className="ec-stat-icon-badge teal">
                <PiCheckCircleDuotone size={17} />
              </div>
              <span className="ec-stat-label">In Notice Period</span>
            </div>
            <span className="ec-stat-pill teal">Active</span>
          </div>
          <div className="ec-stat-val-wrap">
            <h2 className="ec-stat-val">{noticeCount}</h2>
          </div>
          <div className="ec-stat-footer">In Notice Period: Active</div>
        </div>

        <div className="ec-stat-card">
          <div className="ec-stat-head">
            <div className="ec-stat-head-left">
              <div className="ec-stat-icon-badge cyan">
                <PiCheckCircleDuotone size={17} />
              </div>
              <span className="ec-stat-label">Completed</span>
            </div>
            <span className="ec-stat-pill cyan">Done</span>
          </div>
          <div className="ec-stat-val-wrap">
            <h2 className="ec-stat-val">{completedCount}</h2>
          </div>
          <div className="ec-stat-footer">Completed: Done</div>
        </div>
      </div>

      {/* =====================================================
          TOOLBAR
          ===================================================== */}

      <div className="ec-toolbar">
        <div className="ec-toolbar-left">
          <div className="ec-search">
            <input
              type="text"
              placeholder="Search employee"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="ec-icon-btn"
            title="Filters"
            onClick={() => showToast("Filters applied")}
          >
            <PiSlidersDuotone />
          </button>
        </div>

        <div className="ec-toolbar-right">
          {selected.length > 0 && (
            <span className="ec-selected-count">{selected.length} selected</span>
          )}

          <div className="ec-actions" ref={actionsRef}>
            <button
              type="button"
              className="ec-actions-btn"
              onClick={toggleActions}
              aria-expanded={actionsOpen}
              aria-haspopup="true"
            >
              Actions
              <PiCaretDownDuotone className={`ec-caret ${actionsOpen ? "open" : ""}`} />
            </button>

            {actionsOpen && (
              <div className="ec-actions-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    runBulkAction("add");
                  }}
                >
                  <PiPlusDuotone />
                  Bulk Add Employee Contract
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    runBulkAction("upload-proof");
                  }}
                >
                  <PiUploadSimpleDuotone />
                  Bulk Upload Contract Approval Proof
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    runBulkAction("upload-agreement");
                  }}
                >
                  <PiUploadSimpleDuotone />
                  Bulk Upload Contract Agreement
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          TABLE
          ===================================================== */}

      <div className="ec-table-card">
        <table className="ec-table">
          <thead>
            <tr>
              <th className="ec-col-checkbox">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th>EMPLOYEE NAME</th>
              <th>CONTRACT START DATE</th>
              <th className="ec-col-desktop">CONTRACT END DATE</th>
              <th className="ec-col-desktop">APPROVAL PROOF</th>
              <th className="ec-col-desktop">AGREEMENT</th>
              <th className="ec-col-actions ec-col-desktop">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7}>
                  <div className="ec-empty" style={{ padding: "48px 16px" }}>
                    <span className="ec-empty-icon">
                      <PiSpinnerGapDuotone className="ec-spin" />
                    </span>
                    <p className="ec-empty-title">Loading employment contracts…</p>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="ec-empty">
                    <span className="ec-empty-icon">
                      <PiSignatureDuotone />
                    </span>
                    <p className="ec-empty-title">No pending employment contracts</p>
                    <p className="ec-empty-subtitle">
                      New contracts will show up here once they're added.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((contract) => (
                <tr key={contract.id}>
                  <td className="ec-col-checkbox">
                    <input
                      type="checkbox"
                      checked={selected.includes(contract.id)}
                      onChange={() => toggleRow(contract.id)}
                      aria-label={`Select ${contract.employeeName}`}
                    />
                  </td>

                  <td>
                    <div className="ec-employee">
                      <span
                        className="ec-avatar"
                        style={{
                          backgroundColor: contract.avatarColor || "#fee2e2",
                          color: contract.textColor || "#ef4444",
                        }}
                      >
                        {contract.initials}
                      </span>
                      <span className="ec-employee-name-text">{contract.employeeName}</span>
                    </div>
                  </td>

                  <td>{formatDate(contract.startDate)}</td>
                  <td className="ec-col-desktop">{formatDate(contract.endDate)}</td>

                  <td className="ec-col-desktop">
                    <ProofCell
                      status={contract.approvalProof}
                      label="approval proof"
                      onToggle={() => handleDocToggle(contract, "approvalProof")}
                    />
                  </td>

                  <td className="ec-col-desktop">
                    <ProofCell
                      status={contract.agreement}
                      label="agreement"
                      onToggle={() => handleDocToggle(contract, "agreement")}
                    />
                  </td>

                  <td className="ec-col-actions ec-col-desktop">
                    <button
                      type="button"
                      className="ec-row-action"
                      title="View contract"
                      onClick={() => setViewContractData(contract)}
                    >
                      <PiEyeDuotone />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination matching reference Phone 5 */}
        <div className="ec-pagination">
          <span className="ec-pagination-info">
            Showing 1–{filtered.length} of {filtered.length}
          </span>
          <div className="ec-pagination-controls">
            <button type="button" className="ec-page-btn" disabled>&lt;</button>
            <button type="button" className="ec-page-btn is-active">1</button>
            <button type="button" className="ec-page-btn" disabled>&gt;</button>
          </div>
        </div>
      </div>

      {/* =====================================================
          SEND CONTRACT MODAL
          ===================================================== */}
      {sendModalOpen && (
        <div className="ec-modal-overlay" onClick={() => setSendModalOpen(false)}>
          <div className="ec-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ec-modal-header">
              <div className="ec-modal-title-wrap">
                <div className="ec-modal-title-icon">
                  <PiUploadSimpleDuotone />
                </div>
                <div>
                  <h3 className="ec-modal-title">Send Contract to Employee</h3>
                  <p className="ec-modal-subtitle">Generate and dispatch digital contract agreement</p>
                </div>
              </div>
              <button
                type="button"
                className="ec-modal-close-btn"
                onClick={() => setSendModalOpen(false)}
              >
                <PiXBold />
              </button>
            </div>

            <form onSubmit={handleSendSubmit}>
              <div className="ec-modal-body">
                <div className="ec-form-group">
                  <label className="ec-form-label">Employee Name</label>
                  {employeesList && employeesList.length > 0 ? (
                    <select
                      required
                      className="ec-form-select"
                      value={sendForm.employeeName}
                      onChange={(e) => setSendForm({ ...sendForm, employeeName: e.target.value })}
                    >
                      <option value="">Select Employee...</option>
                      {employeesList.map((emp) => (
                        <option key={emp.id || emp.employee_id || emp.name} value={emp.name}>
                          {emp.name} {emp.employee_id ? `(${emp.employee_id})` : ""} {emp.department ? `- ${emp.department}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Akash Maurya"
                      className="ec-form-input"
                      value={sendForm.employeeName}
                      onChange={(e) => setSendForm({ ...sendForm, employeeName: e.target.value })}
                    />
                  )}
                </div>

                <div className="ec-form-group">
                  <label className="ec-form-label">Contract Type</label>
                  <select
                    className="ec-form-select"
                    value={sendForm.contractType}
                    onChange={(e) => setSendForm({ ...sendForm, contractType: e.target.value })}
                  >
                    <option value="Permanent Employment Contract">Permanent Employment Contract</option>
                    <option value="Fixed-Term Employment Contract">Fixed-Term Employment Contract</option>
                    <option value="Probationary Contract">Probationary Contract</option>
                    <option value="Consultancy Agreement">Consultancy Agreement</option>
                  </select>
                </div>

                <div className="ec-form-row">
                  <div className="ec-form-group">
                    <label className="ec-form-label">Start Date</label>
                    <input
                      type="date"
                      required
                      className="ec-form-input"
                      value={sendForm.startDate}
                      onChange={(e) => setSendForm({ ...sendForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="ec-form-group">
                    <label className="ec-form-label">End Date</label>
                    <input
                      type="date"
                      required
                      className="ec-form-input"
                      value={sendForm.endDate}
                      onChange={(e) => setSendForm({ ...sendForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="ec-form-group">
                  <label className="ec-form-label">Note for Employee (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Add instructions, benefits overview, or signing deadline…"
                    className="ec-form-textarea"
                    value={sendForm.notes}
                    onChange={(e) => setSendForm({ ...sendForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="ec-modal-footer">
                <button
                  type="button"
                  className="ec-btn-secondary"
                  onClick={() => setSendModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="ec-btn-primary">
                  <PiUploadSimpleDuotone size={16} />
                  Send Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD CONTRACT MODAL
          ===================================================== */}
      {addModalOpen && (
        <div className="ec-modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="ec-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ec-modal-header">
              <div className="ec-modal-title-wrap">
                <div className="ec-modal-title-icon">
                  <PiPlusDuotone />
                </div>
                <div>
                  <h3 className="ec-modal-title">Add Employee Contract</h3>
                  <p className="ec-modal-subtitle">Manually register a new employment record</p>
                </div>
              </div>
              <button
                type="button"
                className="ec-modal-close-btn"
                onClick={() => setAddModalOpen(false)}
              >
                <PiXBold />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="ec-modal-body">
                <div className="ec-form-group">
                  <label className="ec-form-label">Employee Full Name</label>
                  {employeesList && employeesList.length > 0 ? (
                    <select
                      required
                      className="ec-form-select"
                      value={addForm.employeeName}
                      onChange={(e) => setAddForm({ ...addForm, employeeName: e.target.value })}
                    >
                      <option value="">Select Employee...</option>
                      {employeesList.map((emp) => (
                        <option key={emp.id || emp.employee_id || emp.name} value={emp.name}>
                          {emp.name} {emp.employee_id ? `(${emp.employee_id})` : ""} {emp.department ? `- ${emp.department}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Akash Maurya"
                      className="ec-form-input"
                      value={addForm.employeeName}
                      onChange={(e) => setAddForm({ ...addForm, employeeName: e.target.value })}
                    />
                  )}
                </div>

                <div className="ec-form-row">
                  <div className="ec-form-group">
                    <label className="ec-form-label">Start Date</label>
                    <input
                      type="date"
                      required
                      className="ec-form-input"
                      value={addForm.startDate}
                      onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="ec-form-group">
                    <label className="ec-form-label">End Date</label>
                    <input
                      type="date"
                      required
                      className="ec-form-input"
                      value={addForm.endDate}
                      onChange={(e) => setAddForm({ ...addForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="ec-modal-footer">
                <button
                  type="button"
                  className="ec-btn-secondary"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="ec-btn-primary">
                  <PiPlusDuotone size={16} />
                  Create Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW CONTRACT DETAILS MODAL
          ===================================================== */}
      {viewContractData && (
        <div className="ec-modal-overlay" onClick={() => setViewContractData(null)}>
          <div className="ec-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ec-modal-header">
              <div className="ec-modal-title-wrap">
                <div className="ec-modal-title-icon">
                  <PiFileTextDuotone />
                </div>
                <div>
                  <h3 className="ec-modal-title">Contract Details</h3>
                  <p className="ec-modal-subtitle">{viewContractData.id}</p>
                </div>
              </div>
              <button
                type="button"
                className="ec-modal-close-btn"
                onClick={() => setViewContractData(null)}
              >
                <PiXBold />
              </button>
            </div>

            <div className="ec-modal-body">
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0" }}>
                <span
                  className="ec-avatar"
                  style={{
                    backgroundColor: viewContractData.avatarColor || "#fee2e2",
                    color: viewContractData.textColor || "#ef4444",
                    width: "42px",
                    height: "42px",
                    fontSize: "14px",
                  }}
                >
                  {viewContractData.initials}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--ec-text)" }}>
                    {viewContractData.employeeName}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ec-text-muted)" }}>
                    Reference ID: {viewContractData.id}
                  </div>
                </div>
              </div>

              <div className="ec-form-row">
                <div className="ec-form-group">
                  <label className="ec-form-label">Contract Start Date</label>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ec-text)" }}>
                    {formatDate(viewContractData.startDate)}
                  </div>
                </div>
                <div className="ec-form-group">
                  <label className="ec-form-label">Contract End Date</label>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ec-text)" }}>
                    {formatDate(viewContractData.endDate)}
                  </div>
                </div>
              </div>

              <div className="ec-form-row" style={{ marginTop: "8px" }}>
                <div className="ec-form-group">
                  <label className="ec-form-label">Approval Proof Status</label>
                  <span
                    className={`ec-doc-status`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: viewContractData.approvalProof === "uploaded" ? "#16803c" : "#b5730c",
                    }}
                  >
                    {viewContractData.approvalProof === "uploaded" ? (
                      <PiCheckCircleDuotone />
                    ) : (
                      <PiClockDuotone />
                    )}
                    {viewContractData.approvalProof === "uploaded" ? "Uploaded" : "Pending"}
                  </span>
                </div>
                <div className="ec-form-group">
                  <label className="ec-form-label">Agreement Status</label>
                  <span
                    className={`ec-doc-status`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: viewContractData.agreement === "uploaded" ? "#16803c" : "#b5730c",
                    }}
                  >
                    {viewContractData.agreement === "uploaded" ? (
                      <PiCheckCircleDuotone />
                    ) : (
                      <PiClockDuotone />
                    )}
                    {viewContractData.agreement === "uploaded" ? "Uploaded" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            <div className="ec-modal-footer">
              <button
                type="button"
                className="ec-btn-secondary"
                onClick={() => setViewContractData(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="ec-btn-primary"
                onClick={() => {
                  showToast(`Downloading contract PDF for ${viewContractData.employeeName}…`);
                  setViewContractData(null);
                }}
              >
                <PiDownloadSimpleDuotone size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          FLOATING TOAST NOTIFICATION
          ===================================================== */}
      {toastMessage && (
        <div className="ec-toast">
          <PiCheckCircleDuotone size={18} style={{ color: "#a78bfa" }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default EmploymentContracts;