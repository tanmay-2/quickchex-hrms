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
} from "react-icons/pi";

import { DashboardHeader, DashboardShellContext } from "../../components/header/DashboardHeader";
import "./employment-contracts.css";

/* =========================================================
   SAMPLE DATA — matching reference design
   ========================================================= */

const SAMPLE_CONTRACTS = [
  {
    id: "EC-1001",
    employeeName: "Rohan Verma",
    initials: "RV",
    avatarColor: "#fee2e2",
    textColor: "#ef4444",
    startDate: "2026-09-01",
    endDate: "2027-08-31",
    approvalProof: "pending",
    agreement: "pending",
  },
  {
    id: "EC-1002",
    employeeName: "Ananya Iyer",
    initials: "AI",
    avatarColor: "#fee2e2",
    textColor: "#ef4444",
    startDate: "2026-09-15",
    endDate: "2028-09-14",
    approvalProof: "uploaded",
    agreement: "pending",
  },
  {
    id: "EC-1003",
    employeeName: "Kabir Shah",
    initials: "KS",
    avatarColor: "#ffedd5",
    textColor: "#ea580c",
    startDate: "2026-10-01",
    endDate: "2027-09-30",
    approvalProof: "uploaded",
    agreement: "uploaded",
  },
  {
    id: "EC-1004",
    employeeName: "Payal Kaur",
    initials: "PP",
    avatarColor: "#fee2e2",
    textColor: "#ef4444",
    startDate: "2026-10-10",
    endDate: "2027-10-09",
    approvalProof: "pending",
    agreement: "pending",
  },
];

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
  const [contracts, setContracts] = useState(SAMPLE_CONTRACTS);
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
    employeeName: "",
    contractType: "Permanent Employment Contract",
    startDate: "2026-11-01",
    endDate: "2027-10-31",
    notes: "",
  });

  const [addForm, setAddForm] = useState({
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
    contract.employeeName.toLowerCase().includes(search.trim().toLowerCase())
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

  const runBulkAction = (action) => {
    setActionsOpen(false);

    if (action === "add") {
      setAddForm({
        employeeName: "",
        startDate: "2026-11-01",
        endDate: "2027-10-31",
      });
      setAddModalOpen(true);
    } else if (action === "upload-proof") {
      if (selected.length === 0) {
        // Apply to all pending contracts if none selected
        const pendingCount = contracts.filter((c) => c.approvalProof === "pending").length;
        if (pendingCount === 0) {
          showToast("All contracts already have approval proofs uploaded.");
          return;
        }
        setContracts((prev) =>
          prev.map((c) => ({ ...c, approvalProof: "uploaded" }))
        );
        showToast(`Approval proof uploaded for ${pendingCount} contract(s).`);
      } else {
        setContracts((prev) =>
          prev.map((c) =>
            selected.includes(c.id) ? { ...c, approvalProof: "uploaded" } : c
          )
        );
        showToast(`Approval proof uploaded for ${selected.length} contract(s).`);
      }
    } else if (action === "upload-agreement") {
      if (selected.length === 0) {
        const pendingCount = contracts.filter((c) => c.agreement === "pending").length;
        if (pendingCount === 0) {
          showToast("All contracts already have signed agreements uploaded.");
          return;
        }
        setContracts((prev) =>
          prev.map((c) => ({ ...c, agreement: "uploaded" }))
        );
        showToast(`Contract agreement uploaded for ${pendingCount} contract(s).`);
      } else {
        setContracts((prev) =>
          prev.map((c) =>
            selected.includes(c.id) ? { ...c, agreement: "uploaded" } : c
          )
        );
        showToast(`Contract agreement uploaded for ${selected.length} contract(s).`);
      }
    }
  };

  const openSendModal = () => {
    const selectedEmployee =
      selected.length === 1
        ? filtered.find((c) => c.id === selected[0])?.employeeName || ""
        : "";

    setSendForm({
      employeeName: selectedEmployee,
      contractType: "Permanent Employment Contract",
      startDate: "2026-11-01",
      endDate: "2027-10-31",
      notes: "",
    });
    setSendModalOpen(true);
  };

  const handleSendSubmit = (e) => {
    e.preventDefault();
    if (!sendForm.employeeName.trim()) {
      showToast("Please enter an employee name.");
      return;
    }

    const initials = sendForm.employeeName
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "EC";

    const newId = `EC-100${contracts.length + 1}`;
    const newContract = {
      id: newId,
      employeeName: sendForm.employeeName.trim(),
      initials,
      avatarColor: "#fee2e2",
      textColor: "#ef4444",
      startDate: sendForm.startDate,
      endDate: sendForm.endDate,
      approvalProof: "pending",
      agreement: "pending",
    };

    setContracts((prev) => [newContract, ...prev]);
    setSendModalOpen(false);
    showToast(`Contract sent successfully to ${sendForm.employeeName}!`);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!addForm.employeeName.trim()) {
      showToast("Please enter an employee name.");
      return;
    }

    const initials = addForm.employeeName
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "EC";

    const newId = `EC-100${contracts.length + 1}`;
    const newContract = {
      id: newId,
      employeeName: addForm.employeeName.trim(),
      initials,
      avatarColor: "#e0e7ff",
      textColor: "#4338ca",
      startDate: addForm.startDate,
      endDate: addForm.endDate,
      approvalProof: "pending",
      agreement: "pending",
    };

    setContracts((prev) => [newContract, ...prev]);
    setAddModalOpen(false);
    showToast(`New contract created for ${addForm.employeeName}!`);
  };

  const handleDocToggle = (contract, docType) => {
    const currentStatus = contract[docType];
    const newStatus = currentStatus === "uploaded" ? "pending" : "uploaded";

    setContracts((prev) =>
      prev.map((c) =>
        c.id === contract.id ? { ...c, [docType]: newStatus } : c
      )
    );

    const docLabel = docType === "approvalProof" ? "Approval proof" : "Agreement";
    showToast(
      `${docLabel} marked as ${newStatus} for ${contract.employeeName}.`
    );
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
            <h2 className="ec-stat-val">1</h2>
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
            {filtered.length === 0 ? (
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
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="ec-form-input"
                    value={sendForm.employeeName}
                    onChange={(e) => setSendForm({ ...sendForm, employeeName: e.target.value })}
                  />
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
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deepika Patel"
                    className="ec-form-input"
                    value={addForm.employeeName}
                    onChange={(e) => setAddForm({ ...addForm, employeeName: e.target.value })}
                  />
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