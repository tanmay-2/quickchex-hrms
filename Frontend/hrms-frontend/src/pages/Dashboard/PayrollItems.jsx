import { useContext, useMemo, useState } from "react";
import {
  Search, Plus, Download, Pencil, CheckCircle2, X,
  Percent, DollarSign, Layers,
} from "lucide-react";
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import "./PayrollItems.css";

/* ── Static data ─────────────────────────────────────────────── */

const summaryMetrics = [
  { label:"Active Allowances",   value:"12", trend:"+2 this month",  icon:<CheckCircle2 size={16} />, tone:"teal" },
  { label:"Active Deductions",   value:"4",  trend:"Unchanged",      icon:<Percent size={16} />,      tone:"amber" },
  { label:"Custom Components",   value:"3",  trend:"Needs review",   icon:<Layers size={16} />,       tone:"purple" },
];

const payrollData = {
  allowances: [
    { id:"ALW-01", name:"House Rent Allowance (HRA)", type:"Percentage",   value:"40% of Basic", taxable:true,  lastEditedBy:"Kevin", status:"Active"   },
    { id:"ALW-02", name:"Special Allowance",           type:"Flat",         value:"$1,000.00",    taxable:true,  lastEditedBy:"Migdad",status:"Active"   },
    { id:"ALW-03", name:"Internet Reimbursement",      type:"Up to Limit",  value:"$60.00",       taxable:false, lastEditedBy:"Umesh", status:"Active"   },
    { id:"ALW-04", name:"Travel Allowance",            type:"Flat",         value:"$300.00",      taxable:false, lastEditedBy:"Kevin", status:"Inactive" },
  ],
  deductions: [
    { id:"DED-01", name:"Provident Fund",             type:"Percentage",   value:"12% of Basic", taxable:false, lastEditedBy:"Umesh", status:"Active"   },
    { id:"DED-02", name:"Professional Tax",           type:"Slab-based",   value:"Variable",     taxable:false, lastEditedBy:"Migdad",status:"Active"   },
    { id:"DED-03", name:"Health Insurance Premium",   type:"Flat",         value:"$150.00",      taxable:false, lastEditedBy:"Kevin", status:"Active"   },
  ],
};

/* ── Root ────────────────────────────────────────────────────── */

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

/* ── Content ─────────────────────────────────────────────────── */

function PayrollItemsContent() {
  const [activeTab, setActiveTab]     = useState("allowances");
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal]             = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [form, setForm]               = useState({
    name:"", type:"Percentage", value:"", taxable:true, status:"Active",
  });

  const currentData = payrollData[activeTab] || [];

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentData;
    return currentData.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.lastEditedBy.toLowerCase().includes(q)
    );
  }, [activeTab, searchQuery, currentData]);

  const handleExportCsv = () => {
    const headers = ["Item ID","Name","Calculation Type","Value / Rule","Taxable","Last Edited By","Status"];
    const rows = currentData.map(item => [item.id,item.name,item.type,item.value,item.taxable?"Yes":"No",item.lastEditedBy,item.status]);
    const csv = [headers,...rows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `payroll-${activeTab}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* Custom select inside modal */
  const CustomSelect = ({ id, value, options, onChange }) => {
    const isOpen = openDropdown === id;
    return (
      <div className={`pi-custom-select ${isOpen ? "open" : ""}`}>
        <button type="button" className="pi-select-trigger"
          aria-haspopup="listbox" aria-expanded={isOpen}
          onClick={() => setOpenDropdown(isOpen ? null : id)}>
          <span>{value}</span>
          <X size={14} style={{ transform:"rotate(45deg)", opacity:.4 }} />
        </button>
        {isOpen && (
          <div className="pi-select-menu" role="listbox">
            {options.map(opt => (
              <button key={opt} type="button" role="option" aria-selected={opt === value}
                className={`pi-select-option ${opt === value ? "selected" : ""}`}
                onClick={() => { onChange(opt); setOpenDropdown(null); }}>
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
    setForm({ name:"", type:"Percentage", value:"", taxable:true, status:"Active" });
    setOpenDropdown(null); setModal({ type:"create" });
  };

  const handleEditItem = (item) => {
    setOpenDropdown(null);
    setForm({ name:item.name, type:item.type, value:item.value, taxable:item.taxable, status:item.status });
    setModal({ type:"edit", item });
  };

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="pi-page">

      {/* ── Action Bar ── */}
      <div className="pi-action-bar">
        <div className="pi-header-actions">
          <button type="button" className="pi-btn pi-btn-secondary" onClick={handleExportCsv} id="pi-export-btn">
            <Download size={15} />Export CSV
          </button>
          <button type="button" className="pi-btn pi-btn-primary" onClick={handleCreateItem} id="pi-new-btn">
            <Plus size={15} />New Item
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <section className="pi-metrics-grid" aria-label="Payroll summary">
        {summaryMetrics.map(metric => (
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

      {/* ── Table Card ── */}
      <section className="pi-table-container">
        {/* Toolbar */}
        <div className="pi-toolbar">
          <div className="pi-tabs" role="tablist" aria-label="Payroll item type">
            <button type="button" role="tab"
              aria-selected={activeTab === "allowances"}
              className={`pi-tab ${activeTab === "allowances" ? "active" : ""}`}
              onClick={() => { setActiveTab("allowances"); setSearchQuery(""); }}>
              Allowances
              <span className="pi-tab-count">{payrollData.allowances.length}</span>
            </button>
            <button type="button" role="tab"
              aria-selected={activeTab === "deductions"}
              className={`pi-tab ${activeTab === "deductions" ? "active" : ""}`}
              onClick={() => { setActiveTab("deductions"); setSearchQuery(""); }}>
              Deductions
              <span className="pi-tab-count">{payrollData.deductions.length}</span>
            </button>
          </div>

          <div className="pi-toolbar-tools">
            <div className="pi-search-box">
              <input type="search" className="pi-input"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search payroll items"
                id="pi-search"
              />
              {searchQuery && (
                <button type="button" className="pi-clear-search"
                  onClick={() => setSearchQuery("")} aria-label="Clear search">×</button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
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
                filteredData.map(item => (
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
                    <td className="pi-text-subtle">{item.lastEditedBy}</td>
                    <td>
                      <div className="pi-status-indicator">
                        <span className={`pi-dot ${item.status.toLowerCase()}`} />
                        <span>{item.status}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <button type="button" className="pi-icon-btn"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => handleEditItem(item)}>
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="pi-empty-state">
                      <Search size={22} />
                      <strong>No payroll items found</strong>
                      <p>Try another name, item ID, calculation type, or editor.</p>
                      {searchQuery && (
                        <button type="button" className="pi-empty-clear"
                          onClick={() => setSearchQuery("")}>Clear search</button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          MODAL — Create / Edit
          ══════════════════════════════════════════════════════════════ */}
      {modal && (
        <div className="pi-modal-backdrop"
          onMouseDown={() => { setOpenDropdown(null); setModal(null); }}>
          <aside className="pi-modal" role="dialog" aria-modal="true"
            aria-labelledby="pi-modal-title"
            onMouseDown={e => e.stopPropagation()}>

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
              <button type="button" className="pi-modal-close"
                onClick={() => { setOpenDropdown(null); setModal(null); }}
                aria-label="Close">
                <span className="pi-close-x" aria-hidden="true" />
              </button>
            </div>

            <div className="pi-modal-scroll">
              <div className="pi-form-panel">

                {modal.type === "edit" && (
                  <div className="pi-edit-id-row">
                    <div>
                      <span>Item ID</span>
                      <strong>{modal.item.id}</strong>
                    </div>
                    <span className={`pi-modal-status ${modal.item.status.toLowerCase()}`}>
                      <i />{modal.item.status}
                    </span>
                  </div>
                )}

                <div className="pi-form-panel-title">Payroll item details</div>

                <div className="pi-form-grid">
                  <label className="pi-field pi-field-full">
                    <span>Item name</span>
                    <input value={form.name}
                      onChange={e => updateForm("name", e.target.value)}
                      placeholder="e.g. House Rent Allowance" />
                  </label>

                  <div className="pi-field">
                    <span>Calculation type</span>
                    <CustomSelect id="calc-type" value={form.type}
                      options={["Percentage","Flat","Up to Limit","Slab-based"]}
                      onChange={v => updateForm("type", v)} />
                  </div>

                  <label className="pi-field">
                    <span>Value / rule</span>
                    <input value={form.value}
                      onChange={e => updateForm("value", e.target.value)}
                      placeholder="e.g. 40% of Basic" />
                  </label>

                  <div className="pi-field">
                    <span>Status</span>
                    <CustomSelect id="item-status" value={form.status}
                      options={["Active","Inactive"]}
                      onChange={v => updateForm("status", v)} />
                  </div>

                  <div className="pi-field pi-tax-field">
                    <span>Tax treatment</span>
                    <div className="pi-tax-control">
                      <button type="button" className={`pi-switch ${form.taxable ? "on" : ""}`}
                        onClick={() => updateForm("taxable", !form.taxable)}
                        aria-pressed={form.taxable}>
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

                {modal.type === "edit" && (
                  <div className="pi-review-strip">
                    <CheckCircle2 size={17} color="var(--pi-primary)" />
                    <div>
                      <strong>Current configuration</strong>
                      <span>{modal.item.name} · {modal.item.type} · {modal.item.value}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pi-modal-footer">
              <button type="button" className="pi-btn pi-btn-secondary"
                onClick={() => { setOpenDropdown(null); setModal(null); }}>
                Cancel
              </button>
              <button type="button" className="pi-btn pi-btn-primary"
                onClick={() => { setOpenDropdown(null); setModal(null); }}>
                {modal.type === "edit" ? "Save Changes" : "Create Item"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}