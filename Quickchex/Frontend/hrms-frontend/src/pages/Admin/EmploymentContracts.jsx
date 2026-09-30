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

import {
  Calendar,
  FileText,
  ChevronRight,
  MoreVertical,
  Clock,
  CheckCircle2,
  Eye,
  Search,
  X,
  ChevronDown,
  Menu,
  SlidersHorizontal,
} from "lucide-react";

import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./employment-contracts.css";

/* =========================================================
   SAMPLE DATA — enriched with employee metadata
   ========================================================= */

const SAMPLE_CONTRACTS = [
  {
    id: "EC-1001",
    empCode: "EMP001",
    designation: "Software Engineer",
    employeeName: "Rohan Verma",
    initials: "RV",
    startDate: "2026-09-01",
    endDate: "2027-08-31",
    contractStatus: "Pending",
    approvalStatus: "Not Submitted",
    approvalProof: "pending",
    agreement: "pending",
  },
  {
    id: "EC-1002",
    empCode: "EMP002",
    designation: "Product Designer",
    employeeName: "Ananya Iyer",
    initials: "AJ",
    startDate: "2026-09-15",
    endDate: "2028-09-14",
    contractStatus: "Uploaded",
    approvalStatus: "Under Review",
    approvalProof: "uploaded",
    agreement: "pending",
  },
  {
    id: "EC-1003",
    empCode: "EMP003",
    designation: "HR Executive",
    employeeName: "Kabir Shah",
    initials: "KS",
    startDate: "2026-10-01",
    endDate: "2027-09-30",
    contractStatus: "Uploaded",
    approvalStatus: "Approved",
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

function formatContractDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
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
    contract.employeeName.toLowerCase().includes(search.trim().toLowerCase()) ||
    (contract.empCode && contract.empCode.toLowerCase().includes(search.trim().toLowerCase())) ||
    (contract.designation && contract.designation.toLowerCase().includes(search.trim().toLowerCase()))
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
      {/* ── DESKTOP VIEW ONLY ── */}
      <div className="ec-desktop-only">
        <DashboardHeader />

        {/* TOOLBAR */}
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

        {/* TABLE */}
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

      {/* ── MOBILE VIEW ONLY (Matches Mockup) ── */}
      <div className="ec-mobile-only">
        {/* Header Row */}
        <div className="ec-mheader">
          <div className="ec-mheader-left">
            <button
              type="button"
              className="ec-mmenu-btn"
              onClick={() => document.querySelector(".dh-mobile-menu-btn")?.click()}
              aria-label="Toggle navigation menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="ec-mtitle">Pending Employment Contracts</h1>
          </div>
          <span className="ec-mcount-pill">{filtered.length} Contracts</span>
        </div>

        {/* Search & Filter Row */}
        <div className="ec-msearch-row">
          <div className="ec-msearch-box">
            <Search size={16} className="ec-msearch-icon" />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ec-msearch-input"
            />
            {search && (
              <button
                type="button"
                className="ec-msearch-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button type="button" className="ec-mfilter-btn" title="Filters">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Actions Button Row */}
        <div className="ec-mactions-row" ref={actionsRef}>
          <button
            type="button"
            className="ec-maction-btn"
            onClick={() => setActionsOpen(!actionsOpen)}
          >
            <span>Actions</span>
            <ChevronDown size={14} />
          </button>

          {actionsOpen && (
            <div className="ec-actions-menu ec-mobile-actions-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => runBulkAction("add")}>
                <PiPlusDuotone />
                Bulk Add Employee Contract
              </button>
              <button type="button" role="menuitem" onClick={() => runBulkAction("upload-proof")}>
                <PiUploadSimpleDuotone />
                Bulk Upload Contract Approval Proof
              </button>
              <button type="button" role="menuitem" onClick={() => runBulkAction("upload-agreement")}>
                <PiUploadSimpleDuotone />
                Bulk Upload Contract Agreement
              </button>
            </div>
          )}
        </div>

        {/* Mobile Contract Cards List */}
        <div className="ec-mcards-list">
          {filtered.map((contract) => (
            <div key={contract.id} className="ec-mcard">
              {/* Card Top: Avatar + Name/Designation + 3 Dots */}
              <div className="ec-mcard-top">
                <div className="ec-mcard-user">
                  <div className="ec-mcard-avatar">
                    {contract.initials}
                  </div>
                  <div className="ec-mcard-user-info">
                    <span className="ec-mcard-name">{contract.employeeName}</span>
                    <span className="ec-mcard-sub">
                      {contract.empCode || "EMP001"} | {contract.designation || "Software Engineer"}
                    </span>
                  </div>
                </div>
                <button type="button" className="ec-mcard-more" aria-label="More options">
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Card Grid: 2 Columns */}
              <div className="ec-mcard-grid">
                {/* Col 1: Dates */}
                <div className="ec-mcard-col">
                  <div className="ec-mcard-info-item">
                    <Calendar size={15} className="ec-mcard-icon" />
                    <div className="ec-mcard-field">
                      <span className="ec-mcard-label">Contract Start Date</span>
                      <span className="ec-mcard-val">{formatContractDate(contract.startDate)}</span>
                    </div>
                  </div>

                  <div className="ec-mcard-info-item">
                    <Calendar size={15} className="ec-mcard-icon" />
                    <div className="ec-mcard-field">
                      <span className="ec-mcard-label">Contract End Date</span>
                      <span className="ec-mcard-val">{formatContractDate(contract.endDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Col 2: Status Badges */}
                <div className="ec-mcard-col">
                  <div className="ec-mcard-info-item">
                    <FileText size={15} className="ec-mcard-icon" />
                    <div className="ec-mcard-field">
                      <span className="ec-mcard-label">Contract Status</span>
                      <span className={`ec-mstatus-pill ${contract.contractStatus?.toLowerCase() || "pending"}`}>
                        {contract.contractStatus === "Uploaded" ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Uploaded</span>
                          </>
                        ) : (
                          <>
                            <Clock size={12} />
                            <span>Pending</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="ec-mcard-info-item">
                    <FileText size={15} className="ec-mcard-icon" />
                    <div className="ec-mcard-field">
                      <span className="ec-mcard-label">Approval Status</span>
                      <span className={`ec-mapproval-pill ${(contract.approvalStatus || "not-submitted").toLowerCase().replace(/\s+/g, "-")}`}>
                        {contract.approvalStatus === "Approved" ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Approved</span>
                          </>
                        ) : contract.approvalStatus === "Under Review" ? (
                          <>
                            <Eye size={12} />
                            <span>Under Review</span>
                          </>
                        ) : (
                          <span>Not Submitted</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Button */}
              <button
                type="button"
                className="ec-mview-contract-btn"
                onClick={() => {}}
              >
                <div className="ec-mview-btn-left">
                  <FileText size={16} />
                  <span>View Contract</span>
                </div>
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EmploymentContracts;