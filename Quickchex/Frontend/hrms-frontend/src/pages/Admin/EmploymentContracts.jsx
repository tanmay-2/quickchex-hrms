import { useEffect, useRef, useState } from "react";

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
} from "react-icons/pi";

import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./employment-contracts.css";

/* =========================================================
   SAMPLE DATA — swap for the real API response
   ========================================================= */

const SAMPLE_CONTRACTS = [
  {
    id: "EC-1001",
    employeeName: "Rohan Verma",
    initials: "RV",
    startDate: "2026-09-01",
    endDate: "2027-08-31",
    approvalProof: "pending",
    agreement: "pending",
  },
  {
    id: "EC-1002",
    employeeName: "Ananya Iyer",
    initials: "AI",
    startDate: "2026-09-15",
    endDate: "2028-09-14",
    approvalProof: "uploaded",
    agreement: "pending",
  },
  {
    id: "EC-1003",
    employeeName: "Kabir Shah",
    initials: "KS",
    startDate: "2026-10-01",
    endDate: "2027-09-30",
    approvalProof: "uploaded",
    agreement: "uploaded",
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

function ProofCell({ status, label }) {
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
  const [contracts] = useState(SAMPLE_CONTRACTS);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [actionsOpen, setActionsOpen] = useState(false);

  const actionsRef = useRef(null);

  /* =======================================================
     CLOSE ACTIONS MENU ON OUTSIDE CLICK
     ======================================================= */

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const runBulkAction = (action) => {
    // TODO: wire up to the real bulk endpoints.
    console.log(action, selected);
    setActionsOpen(false);
  };

  return (
    <div className="ec-page">
      <DashboardHeader />

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

          <button type="button" className="ec-icon-btn" title="Filters">
            <PiSlidersDuotone />
          </button>
        </div>

        <div className="ec-toolbar-right" ref={actionsRef}>
          {selected.length > 0 && (
            <span className="ec-selected-count">{selected.length} selected</span>
          )}

          <div className="ec-actions">
            <button
              type="button"
              className="ec-actions-btn"
              onClick={() => setActionsOpen((current) => !current)}
              aria-expanded={actionsOpen}
              aria-haspopup="true"
            >
              Actions
              <PiCaretDownDuotone className={`ec-caret ${actionsOpen ? "open" : ""}`} />
            </button>

            {actionsOpen && (
              <div className="ec-actions-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => runBulkAction("add")}>
                  <PiPlusDuotone />
                  Bulk Add Employee Contract
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runBulkAction("upload-proof")}
                >
                  <PiUploadSimpleDuotone />
                  Bulk Upload Contract Approval Proof
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runBulkAction("upload-agreement")}
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
              <th>Employee Name</th>
              <th>Contract Start Date</th>
              <th>Contract End Date</th>
              <th>Contract Approval Proof</th>
              <th>Contract Agreement</th>
              <th className="ec-col-actions">Actions</th>
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
                      <span className="ec-avatar">{contract.initials}</span>
                      {contract.employeeName}
                    </div>
                  </td>

                  <td>{formatDate(contract.startDate)}</td>
                  <td>{formatDate(contract.endDate)}</td>

                  <td>
                    <ProofCell status={contract.approvalProof} label="approval proof" />
                  </td>

                  <td>
                    <ProofCell status={contract.agreement} label="agreement" />
                  </td>

                  <td className="ec-col-actions">
                    <button type="button" className="ec-row-action" title="View contract">
                      <PiEyeDuotone />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmploymentContracts;