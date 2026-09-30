import React, { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Download, Filter } from "lucide-react";
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
      result = result.filter((item) => String(item[filterKey]).toLowerCase() === String(activeFilter).toLowerCase());
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

  const handleExportCSV = () => {
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
    <div
      style={{
        background: "var(--mp-surface, #FFFFFF)",
        border: "1px solid var(--mp-border, #E6E3EE)",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "var(--mp-shadow-sm)",
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
            onClick={handleExportCSV}
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
            {paginatedData.length === 0 ? (
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
  );
};
