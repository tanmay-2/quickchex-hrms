// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - MANAGERTABLE.JSX
// Path: Frontend/hrms-frontend/src/manager-portal/components/ManagerTable.jsx
// Purpose: Reusable UI component 'ManagerTable' rendering structured interface controls and visual layouts.
// UI Components:
//   • <ManagerTable />
// Key Functions & Handlers:
//   • handleSort()
//   • handleExportCSVInternal()
// ==============================================================================

import React, { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Download, X } from "lucide-react";
import { ManagerSelect } from "./ManagerSelect";

export const ManagerTable = ({
  columns = [],
  data = [],
  searchable = true,
  searchPlaceholder = "Search records...",
  searchKeys = [],
  filterOptions = null, // [{ label: 'All', value: 'all' }, ...]
  filterKey = null,
  actions = null,
  pageSize = 8,
  emptyMessage = "No records found matching your criteria.",
  renderMobileCard = null,
  loading = false,
  renderSkeleton = null,
  skeletonCount = 4,
  onExportCSV = null,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Filter & Search
  const filteredData = useMemo(() => {
    let result = [...data];

    // Status filter
    if (filterKey && activeFilter !== "all") {
      result = result.filter(
        (item) => String(item[filterKey]).toLowerCase() === String(activeFilter).toLowerCase()
      );
    }

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((item) => {
        if (searchKeys.length > 0) {
          return searchKeys.some((k) => String(item[k] || "").toLowerCase().includes(q));
        }
        return Object.values(item).some((val) => String(val || "").toLowerCase().includes(q));
      });
    }

    // Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] ?? "";
        const valB = b[sortConfig.key] ?? "";
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, activeFilter, filterKey, searchKeys, sortConfig]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleExportCSVInternal = () => {
    if (onExportCSV) {
      onExportCSV(filteredData);
      return;
    }
    if (filteredData.length === 0) return;
    const headerRow = columns.map((col) => col.header).join(",");
    const rows = filteredData.map((item) =>
      columns.map((col) => `"${String(item[col.accessor] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headerRow, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `manager_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {/* ====================================================================
          DESKTOP TABLE VIEW (Visible on >= 768px, or always if no renderMobileCard)
          ==================================================================== */}
      <div
        className={renderMobileCard ? "mp-table-desktop-wrap" : ""}
        style={{
          background: "var(--mp-surface, #FFFFFF)",
          border: "1px solid var(--mp-border, #E6E3EE)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "var(--mp-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
        }}
      >
        {/* Table Toolbar */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            borderBottom: "1px solid var(--mp-border, #E6E3EE)",
            background: "var(--mp-surface-subtle, #F8F7FB)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
            {searchable && (
              <div
                style={{
                  position: "relative",
                  minWidth: "240px",
                  maxWidth: "360px",
                  flex: 1,
                }}
              >
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  style={{
                    width: "100%",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--mp-border, #E6E3EE)",
                    background: "var(--mp-surface, #FFFFFF)",
                    color: "var(--mp-text-primary)",
                    fontSize: "13.5px",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {filterOptions && filterOptions.length > 0 && (
              <ManagerSelect
                value={activeFilter}
                onChange={(val) => {
                  setActiveFilter(val);
                  setCurrentPage(1);
                }}
                options={filterOptions}
                minWidth="150px"
              />
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {actions}
            <button
              type="button"
              className="mp-btn-action"
              onClick={handleExportCSVInternal}
              title="Export to CSV"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ background: "var(--mp-surface-subtle, #F8F7FB)", borderBottom: "1px solid var(--mp-border, #E6E3EE)" }}>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    onClick={() => col.sortable !== false && col.accessor && handleSort(col.accessor)}
                    style={{
                      padding: "12px 18px",
                      fontWeight: 600,
                      color: "var(--mp-text-muted)",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      cursor: col.sortable !== false && col.accessor ? "pointer" : "default",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span>{col.header}</span>
                      {col.sortable !== false && col.accessor && (
                        <ArrowUpDown size={12} style={{ opacity: sortConfig.key === col.accessor ? 1 : 0.4 }} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: "40px 20px", textAlign: "center", color: "var(--mp-text-muted)" }}>
                    Loading records...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: "40px 20px", textAlign: "center", color: "var(--mp-text-muted)" }}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIdx) => (
                  <tr
                    key={row.id || rowIdx}
                    style={{
                      borderBottom: "1px solid var(--mp-border, #E6E3EE)",
                      transition: "background-color 120ms ease",
                    }}
                    className="mp-table-row"
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        style={{
                          padding: "14px 18px",
                          color: "var(--mp-text-primary)",
                          verticalAlign: "middle",
                          whiteSpace: col.wrap ? "normal" : "nowrap",
                        }}
                      >
                        {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          style={{
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid var(--mp-border, #E6E3EE)",
            background: "var(--mp-surface-subtle, #F8F7FB)",
            fontSize: "13px",
            color: "var(--mp-text-muted)",
          }}
        >
          <span>
            Showing <strong>{filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
            <strong>{Math.min(currentPage * pageSize, filteredData.length)}</strong> of <strong>{filteredData.length}</strong> records
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--mp-border, #E6E3EE)",
                background: "var(--mp-surface, #FFFFFF)",
                color: currentPage === 1 ? "var(--mp-text-muted)" : "var(--mp-text-primary)",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--mp-border, #E6E3EE)",
                background: "var(--mp-surface, #FFFFFF)",
                color: currentPage >= totalPages ? "var(--mp-text-muted)" : "var(--mp-text-primary)",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                opacity: currentPage >= totalPages ? 0.5 : 1,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          MOBILE CARD-BASED VIEW (Visible on < 768px when renderMobileCard provided)
          ==================================================================== */}
      {renderMobileCard && (
        <div className="mp-table-mobile-wrap" style={{ width: "100%", boxSizing: "border-box" }}>
          {/* Mobile Search Bar & Export CSV Action Toolbar */}
          <div
            className="mp-table-mobile-toolbar"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "14px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {searchable && (
              <div className="mp-reports-search-box" style={{ flex: 1, minWidth: 0, position: "relative" }}>
                <Search size={18} className="mp-reports-search-icon" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="mp-reports-search-input"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="mp-reports-search-clear"
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {actions}

            <button
              type="button"
              className="mp-reports-export-btn mp-mobile-toolbar-export-btn"
              onClick={handleExportCSVInternal}
              title="Export to CSV"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Cards List or Skeletons or Empty */}
          {loading ? (
            <div className="mp-mobile-cards-list">
              {Array.from({ length: skeletonCount }).map((_, i) =>
                renderSkeleton ? (
                  renderSkeleton(i)
                ) : (
                  <div key={i} className="mp-skeleton-card">
                    <div className="mp-skeleton-head">
                      <div className="mp-skeleton-user">
                        <div className="mp-skeleton-circle" />
                        <div className="mp-skeleton-text-group">
                          <div className="mp-skeleton-line w-name" />
                          <div className="mp-skeleton-line w-sub" />
                        </div>
                      </div>
                      <div className="mp-skeleton-pill" />
                    </div>
                    <div className="mp-skeleton-body" />
                  </div>
                )
              )}
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="mp-mobile-empty-state">
              <p className="mp-mobile-empty-title">No attendance reports found</p>
              <p className="mp-mobile-empty-desc">
                {searchTerm
                  ? "There are no employee attendance reports matching your search criteria."
                  : emptyMessage}
              </p>
              {searchTerm && (
                <button
                  type="button"
                  className="mp-mobile-empty-clear"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="mp-mobile-cards-list">
              {paginatedData.map((row, idx) =>
                renderMobileCard(row, (currentPage - 1) * pageSize + idx)
              )}
            </div>
          )}

          {/* Mobile Pagination Footer */}
          {filteredData.length > 0 && !loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
                padding: "16px 4px 10px",
                fontSize: "13px",
                color: "var(--mp-text-muted, #7D7590)",
              }}
            >
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(currentPage * pageSize, filteredData.length)}</strong> of{" "}
                <strong>{filteredData.length}</strong>
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--mp-border, #E6E3EE)",
                    background: "var(--mp-surface, #FFFFFF)",
                    color: currentPage === 1 ? "var(--mp-text-muted)" : "var(--mp-text-primary)",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1,
                    fontSize: "12.5px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ChevronLeft size={15} /> Prev
                </button>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--mp-border, #E6E3EE)",
                    background: "var(--mp-surface, #FFFFFF)",
                    color: currentPage >= totalPages ? "var(--mp-text-muted)" : "var(--mp-text-primary)",
                    cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage >= totalPages ? 0.5 : 1,
                    fontSize: "12.5px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
