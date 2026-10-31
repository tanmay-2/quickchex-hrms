// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - PAYROLLITEMS.JSX
// Path: Frontend/hrms-frontend/src/pages/Dashboard/PayrollItems.jsx
// Purpose: Web portal page component managing 'PayrollItems' views, user interactions, and state.
// UI Components:
//   • <PayrollItems />
//   • <PayrollItemsContent />
//   • <CustomSelect />
// Key Functions & Handlers:
//   • getItemIcon()
//   • handleExportCsv()
//   • handleCreateItem()
//   • handleEditItem()
//   • handleDeleteItem()
//   • handleToggleTaxable()
//   • handleSaveModal()
//   • updateForm()
// ==============================================================================

import { useContext, useMemo, useState } from "react";
import {
  Search, Plus, Download, Pencil, CheckCircle2, X,
  Percent, DollarSign, Layers,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import "./PayrollItems.css";

/* ── Initial Data ────────────────────────────────────────────── */

const initialPayrollData = {
  allowances: [
    {
      id: "ALW-01",
      name: "House Rent Allowance (HRA)",
      type: "Percentage",
      value: "50% of Basic",
      amountOrPercent: "50",
      applicableFor: "All Employees",
      description: "House Rent Allowance based on percentage of basic salary.",
      taxable: true,
      lastEditedBy: "Kevin",
      status: "Active"
    },
    {
      id: "ALW-02",
      name: "Special Allowance",
      type: "Flat",
      value: "$1,000.00",
      amountOrPercent: "1,000",
      applicableFor: "All Employees",
      description: "Additional role and performance based special allowance.",
      taxable: true,
      lastEditedBy: "Migdad",
      status: "Active"
    },
    {
      id: "ALW-03",
      name: "Internet Reimbursement",
      type: "Up to Limit",
      value: "$60.00",
      amountOrPercent: "60",
      applicableFor: "All Employees",
      description: "Monthly internet and communication reimbursement limit.",
      taxable: false,
      lastEditedBy: "Umesh",
      status: "Active"
    },
    {
      id: "ALW-04",
      name: "Travel Allowance",
      type: "Flat",
      value: "$300.00",
      amountOrPercent: "300",
      applicableFor: "All Employees",
      description: "Official travel and local conveyance allowance.",
      taxable: false,
      lastEditedBy: "Kevin",
      status: "Active"
    },
  ],
  deductions: [
    {
      id: "DED-01",
      name: "Provident Fund",
      type: "Percentage",
      value: "12% of Basic",
      amountOrPercent: "12",
      applicableFor: "All Employees",
      description: "Statutory employee provident fund retirement savings deduction.",
      taxable: false,
      lastEditedBy: "Umesh",
      status: "Active"
    },
    {
      id: "DED-02",
      name: "Professional Tax",
      type: "Slab-based",
      value: "Variable",
      amountOrPercent: "Variable",
      applicableFor: "All Employees",
      description: "State professional tax deduction based on salary slabs.",
      taxable: false,
      lastEditedBy: "Migdad",
      status: "Active"
    },
    {
      id: "DED-03",
      name: "Health Insurance Premium",
      type: "Flat",
      value: "$150.00",
      amountOrPercent: "150",
      applicableFor: "All Employees",
      description: "Group health and medical insurance premium coverage.",
      taxable: false,
      lastEditedBy: "Kevin",
      status: "Active"
    },
  ],
};

/** Helper to return distinct icon and soft background matching reference UI */
export const getItemIcon = (name, type) => {
  const n = (name || "").toLowerCase();
  if (n.includes("house") || n.includes("hra") || n.includes("rent")) {
    return { icon: <Home size={18} color="#0284c7" />, bg: "#f0f9ff" };
  }
  if (n.includes("special") || n.includes("bonus") || n.includes("gift")) {
    return { icon: <Gift size={18} color="#7c3aed" />, bg: "#f5f3ff" };
  }
  if (n.includes("internet") || n.includes("wifi") || n.includes("phone") || n.includes("reimburse")) {
    return { icon: <Wifi size={18} color="#059669" />, bg: "#ecfdf5" };
  }
  if (n.includes("travel") || n.includes("conveyance") || n.includes("flight") || n.includes("transport")) {
    return { icon: <Plane size={18} color="#d97706" />, bg: "#fffbeb" };
  }
  if (n.includes("provident") || n.includes("pf") || n.includes("pension") || n.includes("fund")) {
    return { icon: <ShieldCheck size={18} color="#7c3aed" />, bg: "#f5f3ff" };
  }
  if (n.includes("tax") || n.includes("professional") || n.includes("tds")) {
    return { icon: <FileText size={18} color="#d97706" />, bg: "#fffbeb" };
  }
  if (n.includes("health") || n.includes("insurance") || n.includes("medical") || n.includes("esic")) {
    return { icon: <HeartPulse size={18} color="#e11d48" />, bg: "#fff1f2" };
  }
  if (type === "Percentage") {
    return { icon: <Percent size={18} color="#7c3aed" />, bg: "#f5f3ff" };
  }
  return { icon: <DollarSign size={18} color="#059669" />, bg: "#ecfdf5" };
};

/* ── Root Component ─────────────────────────────────────────── */

export default function PayrollItems(props) {
  const isInsideShell = useContext(DashboardShellContext);
  if (!isInsideShell) {
    return (
      <DashboardShell>
        <PayrollItemsContent {...props} />
      </DashboardShell>
    );
  }
  return <PayrollItemsContent {...props} />;
}

/* ── Content Component ───────────────────────────────────────── */

function PayrollItemsContent() {
  const [itemsData, setItemsData]     = useState(initialPayrollData);
  const [activeTab, setActiveTab]     = useState("allowances");
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal]             = useState(null); // { type: "create" | "edit", item? }
  const [detailItem, setDetailItem]   = useState(null); // Mobile bottom sheet item
  const [openDropdown, setOpenDropdown] = useState(null);

  const [form, setForm] = useState({
    name: "",
    type: "Percentage",
    value: "",
    amountOrPercent: "",
    applicableFor: "All Employees",
    description: "",
    taxable: true,
    status: "Active",
  });

  const currentData = itemsData[activeTab] || [];

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentData;
    return currentData.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.lastEditedBy && item.lastEditedBy.toLowerCase().includes(q))
    );
  }, [searchQuery, currentData]);

  // KPI Metrics for Desktop
  const summaryMetrics = useMemo(() => [
    {
      label: "Active Allowances",
      value: String(itemsData.allowances.filter((i) => i.status === "Active").length),
      trend: "+2 this month",
      icon: <CheckCircle2 size={16} />,
      tone: "teal"
    },
    {
      label: "Active Deductions",
      value: String(itemsData.deductions.filter((i) => i.status === "Active").length),
      trend: "Unchanged",
      icon: <Percent size={16} />,
      tone: "amber"
    },
    {
      label: "Custom Components",
      value: String(itemsData[activeTab].length > 0 ? (activeTab === "allowances" ? 3 : 2) : 0),
      trend: itemsData[activeTab].length > 0 ? "Needs review" : "No items configured",
      icon: <Layers size={16} />,
      tone: "purple"
    },
  ], [itemsData, activeTab]);

  // Mobile Top Summary Card
  const mobileCustomCount = itemsData[activeTab].length > 0 ? (activeTab === "allowances" ? 3 : 2) : 0;
  const mobileCustomSub = mobileCustomCount > 0 ? "Needs review" : "No items configured";

  const handleExportCsv = () => {
    const headers = ["Item ID", "Name", "Calculation Type", "Value / Rule", "Taxable", "Last Edited By", "Status"];
    const rows = currentData.map((item) => [
      item.id,
      item.name,
      item.type,
      item.value,
      item.taxable ? "Yes" : "No",
      item.lastEditedBy || "Admin",
      item.status
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${activeTab}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* Custom dropdown component */
  const CustomSelect = ({ id, value, options, onChange }) => {
    const isOpen = openDropdown === id;
    return (
      <div className={`pi-custom-select ${isOpen ? "open" : ""}`}>
        <button
          type="button"
          className="pi-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setOpenDropdown(isOpen ? null : id)}
        >
          <span>{value}</span>
          <ChevronDown size={14} style={{ opacity: 0.6 }} />
        </button>
        {isOpen && (
          <div className="pi-select-menu" role="listbox">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={opt === value}
                className={`pi-select-option ${opt === value ? "selected" : ""}`}
                onClick={() => {
                  onChange(opt);
                  setOpenDropdown(null);
                }}
              >
                <span>{opt}</span>
                {opt === value && <CheckCircle2 size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleCreateItem = () => {
    setForm({
      name: "",
      type: "Percentage",
      value: "",
      amountOrPercent: "50",
      applicableFor: "All Employees",
      description: "",
      taxable: true,
      status: "Active"
    });
    setOpenDropdown(null);
    setModal({ type: "create" });
  };

  const handleEditItem = (item) => {
    setOpenDropdown(null);
    setForm({
      name: item.name,
      type: item.type,
      value: item.value,
      amountOrPercent: item.amountOrPercent || item.value.replace(/[^0-9.]/g, "") || "50",
      applicableFor: item.applicableFor || "All Employees",
      description: item.description || "",
      taxable: item.taxable,
      status: item.status
    });
    setModal({ type: "edit", item });
  };

  const handleDeleteItem = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      setItemsData((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab].filter((i) => i.id !== item.id)
      }));
      if (detailItem && detailItem.id === item.id) {
        setDetailItem(null);
      }
    }
  };

  const handleToggleTaxable = (item) => {
    const updatedTaxable = !item.taxable;
    setDetailItem((prev) => (prev ? { ...prev, taxable: updatedTaxable } : null));
    setItemsData((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((i) => (i.id === item.id ? { ...i, taxable: updatedTaxable } : i))
    }));
  };

  const handleSaveModal = (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) return;

    if (modal.type === "edit" && modal.item) {
      setItemsData((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab].map((i) =>
          i.id === modal.item.id
            ? {
                ...i,
                name: form.name.trim(),
                type: form.type,
                value:
                  form.value ||
                  (form.type === "Percentage"
                    ? `${form.amountOrPercent || 50}% of Basic`
                    : `$${form.amountOrPercent || 100}.00`),
                amountOrPercent: form.amountOrPercent,
                applicableFor: form.applicableFor || "All Employees",
                description: form.description || i.description,
                taxable: form.taxable,
                status: form.status,
                lastEditedBy: "Admin"
              }
            : i
        )
      }));
    } else {
      const prefix = activeTab === "allowances" ? "ALW" : "DED";
      const nextNum = itemsData[activeTab].length + 1;
      const nextId = `${prefix}-${String(nextNum).padStart(2, "0")}`;
      const newItem = {
        id: nextId,
        name: form.name.trim(),
        type: form.type,
        value:
          form.value ||
          (form.type === "Percentage"
            ? `${form.amountOrPercent || 50}% of Basic`
            : `$${form.amountOrPercent || 100}.00`),
        amountOrPercent: form.amountOrPercent || "50",
        applicableFor: form.applicableFor || "All Employees",
        description: form.description || `${form.name.trim()} payroll item.`,
        taxable: form.taxable,
        lastEditedBy: "Admin",
        status: form.status
      };
      setItemsData((prev) => ({
        ...prev,
        [activeTab]: [...prev[activeTab], newItem]
      }));
    }

    setOpenDropdown(null);
    setModal(null);
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="pi-page">
      {/* ── 1. Desktop Action Bar ── */}
      <div className="pi-action-bar">
        <div className="pi-header-actions">
          <button
            type="button"
            className="pi-btn pi-btn-secondary"
            onClick={handleExportCsv}
            id="pi-export-btn"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            type="button"
            className="pi-btn pi-btn-primary"
            onClick={handleCreateItem}
            id="pi-new-btn"
          >
            <Plus size={15} />
            New Item
          </button>
        </div>
      </div>

      {/* ── 2. Desktop KPI Cards Grid (Hidden on Mobile) ── */}
      <section className="pi-metrics-grid" aria-label="Payroll summary">
        {summaryMetrics.map((metric) => (
          <article key={metric.label} className="pi-metric-card">
            <div className="pi-metric-topline">
              <span className="pi-metric-label">{metric.label}</span>
              <span className="pi-metric-dot" />
            </div>
            <h3 className="pi-metric-value">{metric.value}</h3>
            <span className="pi-metric-trend">{metric.trend}</span>
          </article>
        ))}
      </section>

      {/* ── 3. Mobile Top Custom Components Card (Phone 1 & 3) ── */}
      <div className="pi-mobile-summary-card">
        <div className="pi-mobile-summary-top">
          <span className="pi-mobile-summary-title">CUSTOM COMPONENTS</span>
          <span className="pi-mobile-summary-dot" />
        </div>
        <div className="pi-mobile-summary-value">{mobileCustomCount}</div>
        <div className="pi-mobile-summary-sub">{mobileCustomSub}</div>
      </div>

      {/* ── 4. Main Content Container (Tabs + Search + Cards/Table) ── */}
      <section className="pi-table-container">
        {/* Toolbar (Desktop & Mobile Shared Container) */}
        <div className="pi-toolbar">
          <div className="pi-tabs" role="tablist" aria-label="Payroll item type">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "allowances"}
              className={`pi-tab ${activeTab === "allowances" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("allowances");
                setSearchQuery("");
              }}
            >
              <span>Allowances</span>
              <span className="pi-tab-count">{itemsData.allowances.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "deductions"}
              className={`pi-tab ${activeTab === "deductions" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("deductions");
                setSearchQuery("");
              }}
            >
              <span>Deductions</span>
              <span className="pi-tab-count">{itemsData.deductions.length}</span>
            </button>
          </div>

          <div className="pi-toolbar-tools">
            <div className="pi-search-box">
              <Search size={16} className="pi-search-icon" />
              <input
                type="search"
                className="pi-input"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search payroll items"
                id="pi-search"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="pi-clear-search"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 5. Desktop Table (Hidden on Mobile) ── */}
        <div className="pi-table-responsive">
          <table className="pi-table">
            <thead>
              <tr>
                <th>Item ID &amp; Name</th>
                <th>Calculation Type</th>
                <th>Value / Rule</th>
                <th>Taxable</th>
                <th>Last Edited By</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="pi-item-identity">
                        <span className="pi-item-name">{item.name}</span>
                        <span className="pi-item-id">{item.id}</span>
                      </div>
                    </td>
                    <td className="pi-text-subtle">{item.type}</td>
                    <td className="pi-font-medium">{item.value}</td>
                    <td>
                      <span className={`pi-badge-outline ${item.taxable ? "taxable" : "non-taxable"}`}>
                        {item.taxable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="pi-text-subtle">{item.lastEditedBy || "Admin"}</td>
                    <td>
                      <div className="pi-status-indicator">
                        <span className={`pi-dot ${item.status.toLowerCase()}`} />
                        <span>{item.status}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="pi-icon-btn"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => handleEditItem(item)}
                          title="Edit Item"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="pi-icon-btn pi-delete-btn"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => handleDeleteItem(item)}
                          title="Delete Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="pi-empty-state">
                      <Search size={24} />
                      <strong>No payroll items found</strong>
                      <p>Try another name, item ID, calculation type, or editor.</p>
                      {searchQuery && (
                        <button
                          type="button"
                          className="pi-empty-clear"
                          onClick={() => setSearchQuery("")}
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── 6. Mobile Card List (Hidden on Desktop) ── */}
        <div className="pi-mobile-cards-list">
          {filteredData.length > 0 ? (
            filteredData.map((item) => {
              const iconInfo = getItemIcon(item.name, item.type);
              return (
                <div
                  className="pi-mobile-card"
                  key={item.id}
                  onClick={() => setDetailItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setDetailItem(item)}
                >
                  <div className="pi-mcard-icon-wrap" style={{ background: iconInfo.bg }}>
                    {iconInfo.icon}
                  </div>

                  <div className="pi-mcard-content">
                    <div className="pi-mcard-title">{item.name}</div>
                    <div className="pi-mcard-meta">
                      <span className="pi-mcard-id">{item.id}</span>
                      <span className="pi-mcard-bullet">·</span>
                      <span className="pi-mcard-status">
                        <span className={`pi-dot ${item.status.toLowerCase()}`} />
                        <span>{item.status}</span>
                      </span>
                    </div>
                    <div className="pi-mcard-calc-badge">{item.type}</div>
                  </div>

                  <button
                    type="button"
                    className="pi-mcard-menu-btn"
                    aria-label={`Options for ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailItem(item);
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              );
            })
          ) : (
            /* Mobile Empty State matching Phone 3 */
            <div className="pi-mobile-empty-state">
              <div className="pi-mempty-icon-wrap">
                <FileText size={30} color="#7c3aed" />
                <span className="pi-mempty-plus">+</span>
              </div>
              <h4 className="pi-mempty-title">
                {searchQuery
                  ? "No Matching Items"
                  : activeTab === "allowances"
                  ? "No Allowances Yet"
                  : "No Deductions Yet"}
              </h4>
              <p className="pi-mempty-sub">
                {searchQuery
                  ? "Try another name or item ID in the search field above."
                  : activeTab === "allowances"
                  ? "Create payroll allowance items to use in salary calculations."
                  : "Create payroll deduction items to use in salary calculations."}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  className="pi-mempty-action-btn"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </button>
              ) : (
                <button
                  type="button"
                  className="pi-mempty-action-btn"
                  onClick={handleCreateItem}
                >
                  <Plus size={16} />
                  <span>{activeTab === "allowances" ? "Add Allowance" : "Add Deduction"}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── 7. Mobile Details & Edit Bottom Sheet (Phone 2) ── */}
      {detailItem && (
        <div
          className="pi-sheet-backdrop"
          onClick={() => setDetailItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="pi-sheet-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="pi-sheet-handle" />

            {/* Header */}
            <div className="pi-sheet-header">
              <div className="pi-sheet-header-left">
                <div
                  className="pi-sheet-icon"
                  style={{ background: getItemIcon(detailItem.name, detailItem.type).bg }}
                >
                  {getItemIcon(detailItem.name, detailItem.type).icon}
                </div>
                <div className="pi-sheet-header-info">
                  <h3 className="pi-sheet-title">{detailItem.name}</h3>
                  <div className="pi-sheet-meta">
                    <span className="pi-sheet-id">{detailItem.id}</span>
                    <span className="pi-sheet-status-badge">
                      <span className={`pi-dot ${detailItem.status.toLowerCase()}`} />
                      <span>{detailItem.status}</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="pi-sheet-close"
                onClick={() => setDetailItem(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sheet Body Fields */}
            <div className="pi-sheet-body">
              <div className="pi-sheet-field">
                <label className="pi-sheet-label">Calculation Type</label>
                <div className="pi-sheet-readonly-box">{detailItem.type}</div>
              </div>

              <div className="pi-sheet-field">
                <label className="pi-sheet-label">
                  {detailItem.type === "Percentage" ? "Percentage (%)" : "Value / Rule"}
                </label>
                <div className="pi-sheet-readonly-box">
                  {detailItem.amountOrPercent || detailItem.value.replace(/[^0-9.]/g, "") || detailItem.value}
                </div>
              </div>

              <div className="pi-sheet-field">
                <label className="pi-sheet-label">Applicable For</label>
                <div className="pi-sheet-select-box">
                  <span>{detailItem.applicableFor || "All Employees"}</span>
                  <ChevronDown size={16} color="#64748b" />
                </div>
              </div>

              <div className="pi-sheet-switch-row">
                <span className="pi-sheet-label" style={{ marginBottom: 0 }}>Taxable</span>
                <button
                  type="button"
                  className={`pi-sheet-switch ${detailItem.taxable ? "active" : ""}`}
                  onClick={() => handleToggleTaxable(detailItem)}
                  aria-label="Toggle taxable"
                >
                  <span className="pi-sheet-switch-thumb" />
                </button>
              </div>

              <div className="pi-sheet-field">
                <label className="pi-sheet-label">Description</label>
                <div className="pi-sheet-desc-box">
                  {detailItem.description || `${detailItem.name} based on percentage of basic salary.`}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pi-sheet-actions">
              <button
                type="button"
                className="pi-sheet-edit-btn"
                onClick={() => {
                  const itemToEdit = detailItem;
                  setDetailItem(null);
                  handleEditItem(itemToEdit);
                }}
              >
                <Pencil size={15} />
                <span>Edit Payroll Item</span>
              </button>

              <button
                type="button"
                className="pi-sheet-delete-btn"
                onClick={() => handleDeleteItem(detailItem)}
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Create / Edit Modal (Desktop & Tablet) ── */}
      {modal && (
        <div
          className="pi-modal-backdrop"
          onMouseDown={() => {
            setOpenDropdown(null);
            setModal(null);
          }}
        >
          <aside
            className="pi-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pi-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="pi-modal-header">
              <div>
                <span className="pi-modal-eyebrow">
                  {modal.type === "edit" ? "Edit Payroll Item" : "New Payroll Item"}
                </span>
                <h2 id="pi-modal-title">
                  {modal.type === "edit" ? "Edit Payroll Item" : "Create Payroll Item"}
                </h2>
                <p className="pi-modal-subtitle">
                  {modal.type === "edit"
                    ? "Update the payroll rule and keep your item configuration consistent."
                    : "Add a new allowance or deduction to your payroll structure."}
                </p>
              </div>
              <button
                type="button"
                className="pi-modal-close"
                onClick={() => {
                  setOpenDropdown(null);
                  setModal(null);
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pi-modal-scroll">
              <div className="pi-form-panel">
                {modal.type === "edit" && modal.item && (
                  <div className="pi-edit-id-row">
                    <div>
                      <span>Item ID</span>
                      <strong>{modal.item.id}</strong>
                    </div>
                    <span className={`pi-modal-status ${modal.item.status.toLowerCase()}`}>
                      <i />
                      {modal.item.status}
                    </span>
                  </div>
                )}

                <div className="pi-form-panel-title">Payroll item details</div>

                <div className="pi-form-grid">
                  <label className="pi-field pi-field-full">
                    <span>Item name</span>
                    <input
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="e.g. House Rent Allowance"
                    />
                  </label>

                  <div className="pi-field">
                    <span>Calculation type</span>
                    <CustomSelect
                      id="calc-type"
                      value={form.type}
                      options={["Percentage", "Flat", "Up to Limit", "Slab-based"]}
                      onChange={(v) => updateForm("type", v)}
                    />
                  </div>

                  <label className="pi-field">
                    <span>
                      {form.type === "Percentage" ? "Percentage (%)" : "Value / rule"}
                    </span>
                    <input
                      value={form.amountOrPercent || form.value}
                      onChange={(e) => {
                        updateForm("amountOrPercent", e.target.value);
                        updateForm("value", e.target.value);
                      }}
                      placeholder={form.type === "Percentage" ? "e.g. 50" : "e.g. $1,000.00"}
                    />
                  </label>

                  <div className="pi-field">
                    <span>Status</span>
                    <CustomSelect
                      id="item-status"
                      value={form.status}
                      options={["Active", "Inactive"]}
                      onChange={(v) => updateForm("status", v)}
                    />
                  </div>

                  <label className="pi-field pi-field-full">
                    <span>Description</span>
                    <input
                      value={form.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      placeholder="e.g. House Rent Allowance based on percentage of basic salary."
                    />
                  </label>

                  <div className="pi-field pi-tax-field">
                    <span>Tax treatment</span>
                    <div className="pi-tax-control">
                      <button
                        type="button"
                        className={`pi-switch ${form.taxable ? "on" : ""}`}
                        onClick={() => updateForm("taxable", !form.taxable)}
                        aria-pressed={form.taxable}
                      >
                        <span />
                      </button>
                      <div>
                        <strong>{form.taxable ? "Taxable item" : "Non-taxable item"}</strong>
                        <small>
                          {form.taxable
                            ? "This payroll component is included in taxable earnings."
                            : "This payroll component is excluded from taxable earnings."}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                {modal.type === "edit" && modal.item && (
                  <div className="pi-review-strip">
                    <CheckCircle2 size={17} color="var(--pi-primary)" />
                    <div>
                      <strong>Current configuration</strong>
                      <span>
                        {modal.item.name} · {modal.item.type} · {modal.item.value}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pi-modal-footer">
              <button
                type="button"
                className="pi-btn pi-btn-secondary"
                onClick={() => {
                  setOpenDropdown(null);
                  setModal(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pi-btn pi-btn-primary"
                onClick={handleSaveModal}
              >
                {modal.type === "edit" ? "Save Changes" : "Create Item"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}