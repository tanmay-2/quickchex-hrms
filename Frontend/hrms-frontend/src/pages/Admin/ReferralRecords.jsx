import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Gift,
  Phone,
  Calendar,
  X,
  Share2,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronRight,
  Check,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./ReferralRecords.css";

/* ------------------------------------------------------------------
   CUSTOM SELECT DROPDOWN FOR REFERRAL RECORDS
   ------------------------------------------------------------------ */
function RRSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select",
  icon: Icon,
  variant = "default",
  alignRight = false,
  fullWidth = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  const normalizedOptions = useMemo(() => {
    return options.map((opt) =>
      typeof opt === "string" ? { value: opt, label: opt } : opt
    );
  }, [options]);

  const selectedOpt = normalizedOptions.find((o) => o.value === value);
  const displayLabel = selectedOpt ? selectedOpt.label : placeholder;
  const hasValue = value && value !== "All";

  return (
    <div
      className={`rr-select-wrap ${fullWidth ? "full-width" : ""} ${variant === "purple" ? "variant-purple" : ""}`}
      ref={containerRef}
      data-open={isOpen ? "true" : "false"}
    >
      <button
        type="button"
        className={`rr-select-btn ${hasValue ? "is-active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="rr-select-btn-left">
          {Icon && <Icon size={14} className="rr-select-icon" style={{ flexShrink: 0 }} />}
          <span className="rr-select-label">{displayLabel}</span>
        </span>
        <ChevronDown
          size={14}
          className="rr-select-chevron"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {isOpen && (
        <div className={`rr-select-dropdown ${alignRight ? "align-right" : ""}`}>
          {normalizedOptions.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                className={`rr-select-option ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={13} className="rr-select-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   MAIN REFERRAL RECORDS COMPONENT
   ------------------------------------------------------------------ */
function ReferralRecords() {
  const navigate = useNavigate();

  const [referrals, setReferrals] = useState(() => {
    try {
      const saved = localStorage.getItem("referral_records_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Listen for storage updates across tabs / components
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "referral_records_v1") {
        try {
          setReferrals(e.newValue ? JSON.parse(e.newValue) : []);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tenantFilter, setTenantFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const [viewModalItem, setViewModalItem] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Dynamically extract tenants from existing records
  const tenantOptions = useMemo(() => {
    const set = new Set();
    referrals.forEach((r) => {
      if (r.tenant) set.add(r.tenant);
      else if (r.company) set.add(r.company);
    });
    return Array.from(set).sort();
  }, [referrals]);

  // Dynamically extract categories from existing records
  const categoryOptions = useMemo(() => {
    const set = new Set();
    referrals.forEach((r) => {
      if (r.category) set.add(r.category);
      else if (r.source) set.add(r.source);
    });
    ["Employee Network", "LinkedIn", "Personal Contact", "Direct"].forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [referrals]);

  // Status Filter options
  const statusOptions = useMemo(
    () => [
      { value: "All", label: "All Statuses" },
      { value: "Pending", label: "Pending" },
      { value: "Under Review", label: "Under Review" },
      { value: "Contacted", label: "Contacted" },
      { value: "Interview Scheduled", label: "Interview Scheduled" },
      { value: "Hired", label: "Hired" },
      { value: "Rejected", label: "Rejected" },
    ],
    []
  );

  // Priority Filter options
  const priorityOptions = useMemo(
    () => [
      { value: "All", label: "All Priorities" },
      { value: "High", label: "High" },
      { value: "Medium", label: "Medium" },
      { value: "Low", label: "Low" },
    ],
    []
  );

  // Sort options
  const sortOptions = useMemo(
    () => [
      { value: "newest", label: "Newest First" },
      { value: "oldest", label: "Oldest First" },
      { value: "name_asc", label: "Name (A-Z)" },
      { value: "name_desc", label: "Name (Z-A)" },
      { value: "company_asc", label: "Company (A-Z)" },
    ],
    []
  );

  // Filtered & Sorted referrals list
  const filteredReferrals = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = referrals.filter((item) => {
      // 1. Status Filter
      if (statusFilter !== "All") {
        const itemStatus = (item.status || "").toLowerCase();
        const targetStatus = statusFilter.toLowerCase();
        if (itemStatus !== targetStatus) {
          if (targetStatus === "under review" && itemStatus === "pending") {
            // allow pending as under review if needed
          } else {
            return false;
          }
        }
      }

      // 2. Tenant Filter
      if (tenantFilter !== "All") {
        const itemTenant = (item.tenant || item.company || "").toLowerCase();
        if (itemTenant !== tenantFilter.toLowerCase()) return false;
      }

      // 3. Priority Filter
      if (priorityFilter !== "All") {
        const itemPrio = (item.priority || "Medium").toLowerCase();
        if (itemPrio !== priorityFilter.toLowerCase()) return false;
      }

      // 4. Category Filter
      if (categoryFilter !== "All") {
        const itemCat = (item.category || item.source || "").toLowerCase();
        if (itemCat !== categoryFilter.toLowerCase()) return false;
      }

      // 5. Search query
      if (query) {
        const name = (item.name || "").toLowerCase();
        const company = (item.company || "").toLowerCase();
        const email = (item.email || "").toLowerCase();
        const phone = (item.phone || "").toLowerCase();
        const source = (item.source || "").toLowerCase();
        if (
          !name.includes(query) &&
          !company.includes(query) &&
          !email.includes(query) &&
          !phone.includes(query) &&
          !source.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === "newest") {
        return (
          new Date(b.date || 0) - new Date(a.date || 0) || (b.id || 0) - (a.id || 0)
        );
      }
      if (sortBy === "oldest") {
        return (
          new Date(a.date || 0) - new Date(b.date || 0) || (a.id || 0) - (b.id || 0)
        );
      }
      if (sortBy === "name_asc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "name_desc") {
        return (b.name || "").localeCompare(a.name || "");
      }
      if (sortBy === "company_asc") {
        return (a.company || "").localeCompare(b.company || "");
      }
      return 0;
    });
  }, [
    referrals,
    search,
    statusFilter,
    tenantFilter,
    priorityFilter,
    categoryFilter,
    sortBy,
  ]);

  const handleExportCSV = () => {
    const listToExport = filteredReferrals.length > 0 ? filteredReferrals : referrals;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,Name,Email,Company,Phone,Source,Priority,Status,Date,Reward Status"]
        .concat(
          listToExport.map(
            (r) =>
              `${r.id || ""},"${r.name || ""}",${r.email || ""},"${r.company || ""}",${r.phone || ""},"${r.source || ""}",${r.priority || "Medium"},${r.status || "Pending"},${r.date || ""},"${r.rewardStatus || "Pending"}"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "referral_records.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported referral records to CSV");
  };

  const getStatusBadge = (status, showIcon = true) => {
    const s = (status || "").toLowerCase();
    if (s === "hired") {
      return (
        <span className="rr-status-badge hired">
          {showIcon && <CheckCircle2 size={12} />}
          Hired
        </span>
      );
    }
    if (s === "interview scheduled" || s === "interview") {
      return (
        <span className="rr-status-badge interview">
          {showIcon && <Clock size={12} />}
          Interview Scheduled
        </span>
      );
    }
    if (s === "under review") {
      return (
        <span className="rr-status-badge under-review">
          {showIcon && <Clock size={12} />}
          Under Review
        </span>
      );
    }
    if (s === "contacted") {
      return (
        <span className="rr-status-badge contacted">
          {showIcon && <Clock size={12} />}
          Contacted
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="rr-status-badge rejected">
          {showIcon && <XCircle size={12} />}
          Rejected
        </span>
      );
    }
    return (
      <span className="rr-status-badge pending">
        {showIcon && <Clock size={12} />}
        {status || "Pending"}
      </span>
    );
  };

  return (
    <div className="referral-records-page">
      <DashboardHeader />

      <div className="rr-body">
        {/* =====================================================
            MOBILE VIEW (≤768px)
            Matches reference image layout & component arrangement
            ===================================================== */}
        <div className="rr-mobile-view">
          {/* 1. Full-width Search Field */}
          <div className="rr-mobile-search-wrap">
            <Search size={16} className="rr-mobile-search-icon" />
            <input
              type="text"
              placeholder="Search referral or company"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rr-mobile-search-input"
            />
            {search && (
              <button
                type="button"
                className="rr-mobile-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 2. Responsive 2-Column Filters Grid */}
          <div className="rr-mobile-filters-grid">
            <RRSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              placeholder="All Statuses"
              icon={SlidersHorizontal}
            />
            <RRSelect
              value={tenantFilter}
              onChange={setTenantFilter}
              options={[
                { value: "All", label: "All Tenants" },
                ...tenantOptions.map((t) => ({ value: t, label: t })),
              ]}
              placeholder="All Tenants"
              icon={SlidersHorizontal}
              alignRight={true}
            />
            <RRSelect
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={priorityOptions}
              placeholder="All Priorities"
              icon={SlidersHorizontal}
            />
            <RRSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: "All", label: "All Categories" },
                ...categoryOptions.map((c) => ({ value: c, label: c })),
              ]}
              placeholder="All Categories"
              icon={SlidersHorizontal}
              alignRight={true}
            />
          </div>

          {/* 3. Full-width Sorting Dropdown */}
          <div className="rr-mobile-sort-row">
            <RRSelect
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              placeholder="Newest First"
              icon={ArrowUpDown}
              variant="purple"
              fullWidth={true}
            />
          </div>

          {/* 4. Full-width Action Buttons */}
          <div className="rr-mobile-actions-col">
            <button
              type="button"
              className="rr-btn-export"
              onClick={handleExportCSV}
            >
              <Download size={16} />
              <span>Export</span>
            </button>

            <button
              type="button"
              className="rr-btn-new-referral"
              onClick={() => navigate("/dashboard/referral")}
            >
              <Plus size={16} />
              <span>New Referral</span>
            </button>
          </div>

          {/* 5. Mobile Cards List OR Polished Empty State */}
          <div className="rr-mobile-cards-wrap">
            {filteredReferrals.length === 0 ? (
              <div className="rr-empty-card">
                <div className="rr-empty-illus-wrap">
                  <div className="rr-empty-badge">
                    <div className="rr-empty-doc">
                      <span className="rr-doc-line l1" />
                      <span className="rr-doc-line l2" />
                      <span className="rr-doc-line l3" />
                    </div>
                    <div className="rr-empty-search-circle">
                      <Search size={13} strokeWidth={2.4} />
                    </div>
                  </div>
                </div>
                <div className="rr-empty-text-wrap">
                  <h3 className="rr-empty-title">No referrals yet</h3>
                  <p className="rr-empty-desc">
                    {search || statusFilter !== "All" || tenantFilter !== "All" || priorityFilter !== "All" || categoryFilter !== "All"
                      ? "No referrals match your current filter criteria."
                      : "Your submitted referrals will appear here."}
                  </p>
                </div>
              </div>
            ) : (
              filteredReferrals.map((item) => {
                const priority = item.priority || "Medium";
                const priorityClass = priority.toLowerCase();
                return (
                  <div
                    key={item.id}
                    className="rr-card"
                    onClick={() => setViewModalItem(item)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="rr-card-head">
                      <div className="rr-card-head-left">
                        <h3 className="rr-card-name">{item.name}</h3>
                        <p className="rr-card-company">{item.company || "Company Not Specified"}</p>
                      </div>
                      <div className="rr-card-head-right">
                        {getStatusBadge(item.status, false)}
                      </div>
                    </div>

                    <div className="rr-card-foot">
                      <div className="rr-card-meta-wrap">
                        {/* Priority Indicator */}
                        <span className={`rr-prio-tag prio-${priorityClass}`}>
                          <span className="rr-prio-dot" />
                          <span>{priority}</span>
                        </span>

                        {/* Phone Number */}
                        {item.phone && (
                          <span className="rr-meta-item">
                            <Phone size={12} className="rr-meta-icon" />
                            <span>{item.phone}</span>
                          </span>
                        )}

                        {/* Date Referred */}
                        {item.date && (
                          <span className="rr-meta-item">
                            <Calendar size={12} className="rr-meta-icon" />
                            <span>{item.date}</span>
                          </span>
                        )}
                      </div>

                      <ChevronRight size={18} className="rr-card-arrow" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =====================================================
            DESKTOP VIEW (>768px)
            Preserved original table layout
            ===================================================== */}
        <div className="rr-desktop-view">
          <div className="rr-top-bar">
            <h2 className="rr-section-title">Submitted Referrals</h2>

            <div className="rr-controls">
              {/* Search Box */}
              <div className="rr-search-wrap">
                <Search size={15} className="rr-search-icon" />
                <input
                  type="text"
                  placeholder="Search referral or company"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rr-search-input"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rr-status-filter"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
                <option value="Contacted">Contacted</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
              </select>

              {/* Export */}
              <button
                type="button"
                className="rr-add-btn"
                style={{
                  background: "var(--rr-surface)",
                  color: "var(--rr-ink)",
                  border: "1px solid var(--rr-border)",
                }}
                onClick={handleExportCSV}
              >
                <Download size={15} />
                Export
              </button>

              {/* New Referral Button */}
              <button
                type="button"
                className="rr-add-btn"
                onClick={() => navigate("/dashboard/referral")}
              >
                <Plus size={16} />
                New Referral
              </button>
            </div>
          </div>

          <div className="rr-table-card">
            <table className="rr-table">
              <thead>
                <tr>
                  <th>Referred Person</th>
                  <th>Company</th>
                  <th>Phone No.</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Date Referred</th>
                  <th>Reward Status</th>
                  <th style={{ textAlign: "right", paddingRight: "24px" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="rr-empty-state">
                        <Share2 size={36} />
                        <h3>No Referral Records Found</h3>
                        <p>Try clearing filters or submit a new referral using the button above.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReferrals.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="rr-person-cell">
                          <div className={`rr-avatar ${item.avatarTone || "tone-a"}`}>
                            {item.initials || (item.name ? item.name.slice(0, 2).toUpperCase() : "RP")}
                          </div>
                          <div>
                            <div className="rr-person-name">{item.name}</div>
                            <div className="rr-person-email">{item.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ fontWeight: 500 }}>{item.company}</td>
                      <td>{item.phone}</td>
                      <td>{item.source}</td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td style={{ color: "var(--rr-ink-muted)", fontSize: "13px" }}>{item.date}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            color: item.status === "Hired" ? "var(--rr-purple)" : "var(--rr-ink-muted)",
                          }}
                        >
                          {item.status === "Hired" && <Gift size={13} />}
                          {item.rewardStatus || "Pending"}
                        </span>
                      </td>
                      <td>
                        <div className="rr-action-btns" style={{ justifyContent: "flex-end", paddingRight: "6px" }}>
                          <button
                            type="button"
                            className="rr-row-btn"
                            title="View Referral Details"
                            onClick={() => setViewModalItem(item)}
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =====================================================
          VIEW DETAILS MODAL (Mobile Bottom Sheet / Desktop Modal)
          ===================================================== */}
      {viewModalItem && (
        <div className="rr-modal-overlay" onClick={() => setViewModalItem(null)}>
          <div className="rr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rr-modal-head">
              <h3>Referral Details — {viewModalItem.name}</h3>
              <button
                type="button"
                className="rr-modal-close"
                onClick={() => setViewModalItem(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rr-modal-body">
              <div className="rr-detail-row">
                <strong>Referred Person:</strong>
                <span>{viewModalItem.name}</span>
              </div>
              <div className="rr-detail-row">
                <strong>Company:</strong>
                <span>{viewModalItem.company || "N/A"}</span>
              </div>
              {viewModalItem.email && (
                <div className="rr-detail-row">
                  <strong>Email Address:</strong>
                  <span>{viewModalItem.email}</span>
                </div>
              )}
              {viewModalItem.phone && (
                <div className="rr-detail-row">
                  <strong>Phone Number:</strong>
                  <span>{viewModalItem.phone}</span>
                </div>
              )}
              {viewModalItem.source && (
                <div className="rr-detail-row">
                  <strong>Referral Source:</strong>
                  <span>{viewModalItem.source}</span>
                </div>
              )}
              <div className="rr-detail-row">
                <strong>Priority:</strong>
                <span className={`rr-prio-tag prio-${(viewModalItem.priority || "Medium").toLowerCase()}`}>
                  <span className="rr-prio-dot" />
                  {viewModalItem.priority || "Medium"}
                </span>
              </div>
              <div className="rr-detail-row">
                <strong>Current Status:</strong>
                <span>{viewModalItem.status}</span>
              </div>
              {viewModalItem.date && (
                <div className="rr-detail-row">
                  <strong>Date Referred:</strong>
                  <span>{viewModalItem.date}</span>
                </div>
              )}
              {viewModalItem.rewardStatus && (
                <div className="rr-detail-row">
                  <strong>Reward Status:</strong>
                  <span style={{ color: "var(--rr-purple)", fontWeight: 600 }}>
                    {viewModalItem.rewardStatus}
                  </span>
                </div>
              )}
              {viewModalItem.comments && (
                <div className="rr-detail-row">
                  <strong>Notes / Comments:</strong>
                  <span>{viewModalItem.comments}</span>
                </div>
              )}
            </div>

            <div className="rr-modal-foot">
              <button
                type="button"
                className="rr-btn-action"
                onClick={() => setViewModalItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMessage && <div className="rr-toast">{toastMessage}</div>}
    </div>
  );
}

export default ReferralRecords;
