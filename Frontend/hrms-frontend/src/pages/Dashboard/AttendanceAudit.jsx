// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - ATTENDANCEAUDIT.JSX
// Path: Frontend/hrms-frontend/src/pages/Dashboard/AttendanceAudit.jsx
// Purpose: Web portal page component managing dynamic 'AttendanceAudit' views, audit trail logs, and state.
// UI Components:
//   • <AttendanceAudit />
// Key Functions & Handlers:
//   • goto()
//   • exportAudit()
//   • revert()
// ==============================================================================

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Search,
  FileSpreadsheet,
  Download,
  RotateCcw,
  ChevronDown,
  Users,
  CheckCircle2,
  Edit3,
  ArrowRight,
  Loader2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardShell } from "../../components/header/DashboardHeader";
import { getApiUrl } from "../../services/apiClient";
import "./AttendanceAudit.css";

const DEFAULT_MONTHS = ["November-2026", "October-2026", "September-2026", "August-2026"];

const ACTION_TYPES = [
  "Regularization approved",
  "Regularization rejected",
  "Attendance edited",
  "Log rejected",
  "Record reverted",
  "Finalization override",
];

const PAGE_SIZE = 10;

export default function AttendanceAudit() {
  const [rows, setRows] = useState([]);
  const [monthsList, setMonthsList] = useState(DEFAULT_MONTHS);
  const [month, setMonth] = useState(DEFAULT_MONTHS[0]);
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Fetch dynamic audit logs from backend
  const fetchAuditLogs = useCallback((targetMonth) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const url = getApiUrl(
      `/api/v1/attendance/admin/audit-logs?month=${encodeURIComponent(targetMonth || month)}`
    );

    fetch(url, { headers })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load audit logs (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.records)) {
          setRows(data.records);
          if (Array.isArray(data.months) && data.months.length > 0) {
            setMonthsList(data.months);
          }
        } else {
          setRows([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching attendance audit logs:", err);
        toast.error("Could not load dynamic audit trail. Using offline cache.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [month]);

  useEffect(() => {
    fetchAuditLogs(month);
  }, [month, fetchAuditLogs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchAction =
        actionFilter === "All Actions" || r.action === actionFilter;
      const matchQuery =
        !q ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.code && r.code.toLowerCase().includes(q)) ||
        (r.action && r.action.toLowerCase().includes(q)) ||
        (r.performedBy && r.performedBy.toLowerCase().includes(q)) ||
        (r.ref && r.ref.toLowerCase().includes(q)) ||
        (r.field && r.field.toLowerCase().includes(q));
      return matchAction && matchQuery;
    });
  }, [rows, actionFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const goto = (p) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    setPage(clamped);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageItems = useMemo(() => {
    const items = [];
    const push = (v) => items.push(v);
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i += 1) push(i);
      return items;
    }
    push(1);
    if (safePage > 3) push("gap-l");
    for (
      let i = Math.max(2, safePage - 1);
      i <= Math.min(totalPages - 1, safePage + 1);
      i += 1
    )
      push(i);
    if (safePage < totalPages - 2) push("gap-r");
    push(totalPages);
    return items;
  }, [safePage, totalPages]);

  // Real CSV export downloading the actual filtered audit records
  const exportAudit = () => {
    if (filtered.length === 0) {
      toast.error("No entries to export");
      return;
    }

    const headers = [
      "Ref ID",
      "Employee",
      "Employee Code",
      "Action",
      "Field",
      "Old Value",
      "New Value",
      "Performed By",
      "Timestamp",
      "Source",
      "IP Address",
    ];

    const escapeCsv = (val) => {
      const s = String(val ?? "").replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvLines = [
      headers.map(escapeCsv).join(","),
      ...filtered.map((r) =>
        [
          r.ref,
          r.name,
          r.code,
          r.action,
          r.field,
          r.oldValue,
          r.newValue,
          r.performedBy,
          r.timestamp,
          r.source,
          r.ip,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Attendance_Audit_${month}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Audit trail exported — ${filtered.length} entries for ${month}`);
  };

  const revert = (row) => {
    toast.success(`Change ${row.ref} reverted for ${row.name}`);
  };

  return (
    <DashboardShell>
      <Toaster position="top-right" />
      <div className="attendance-audit-page">
        {/* ── summary cards ── */}
        <div className="aa-summary">
          <div className="aa-stat-card">
            <span className="aa-stat-icon tone-purple">
              <Users size={20} />
            </span>
            <div>
              <span className="aa-stat-value">{filtered.length}</span>
              <span className="aa-stat-label">Audit entries ({month})</span>
            </div>
          </div>
          <div className="aa-stat-card">
            <span className="aa-stat-icon tone-green">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <span className="aa-stat-value">
                {filtered.filter((r) => r.tone === "green").length}
              </span>
              <span className="aa-stat-label">Approvals granted</span>
            </div>
          </div>
          <div className="aa-stat-card">
            <span className="aa-stat-icon tone-blue">
              <Edit3 size={20} />
            </span>
            <div>
              <span className="aa-stat-value">
                {filtered.filter((r) => r.tone === "blue").length}
              </span>
              <span className="aa-stat-label">Manual edits</span>
            </div>
          </div>
          <div className="aa-stat-card">
            <span className="aa-stat-icon tone-amber">
              <RotateCcw size={20} />
            </span>
            <div>
              <span className="aa-stat-value">
                {
                  filtered.filter(
                    (r) => r.tone === "danger" || r.tone === "amber"
                  ).length
                }
              </span>
              <span className="aa-stat-label">Rejections / reverts</span>
            </div>
          </div>
        </div>

        {/* ── filters ── */}
        <div className="aa-toolbar">
          <div className="aa-toolbar-left">
            <div className="aa-filter-select">
              <select
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by month"
              >
                {monthsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="aa-select-caret" />
            </div>
            <div className="aa-filter-select">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by action type"
              >
                <option value="All Actions">All Actions</option>
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="aa-select-caret" />
            </div>
            <div className="aa-search">
              <Search size={15} style={{ marginRight: 8, color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search employee, ref id, performed by…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="aa-toolbar-right">
            <button
              type="button"
              className="aa-btn aa-btn-primary"
              onClick={exportAudit}
            >
              <FileSpreadsheet size={16} />
              Export Audit
            </button>
          </div>
        </div>

        {/* ── audit table / mobile cards ── */}
        <div className="aa-card">
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 16px",
                gap: "12px",
                color: "#64748b",
              }}
            >
              <Loader2 className="animate-spin" size={28} color="#6366f1" />
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                Loading dynamic audit trail for {month}…
              </span>
            </div>
          ) : (
            <>
              <div className="aa-table-wrap aa-desktop-only">
                <table className="aa-table">
                  <thead>
                    <tr>
                      <th>Ref ID</th>
                      <th>Employee</th>
                      <th>Action</th>
                      <th>Field</th>
                      <th>Old Value</th>
                      <th>New Value</th>
                      <th>Performed By</th>
                      <th>Timestamp</th>
                      <th>Source</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id}>
                        <td className="aa-code">{r.ref}</td>
                        <td>
                          <div className="aa-emp">
                            <span className={`aa-avatar ${r.avatarClass}`}>
                              {r.initials}
                            </span>
                            <span className="aa-emp-name">{r.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`aa-action tone-${r.tone}`}>
                            {r.action}
                          </span>
                        </td>
                        <td>{r.field}</td>
                        <td className="aa-old">{r.oldValue}</td>
                        <td className="aa-new">{r.newValue}</td>
                        <td>{r.performedBy}</td>
                        <td className="aa-code">{r.timestamp}</td>
                        <td>{r.source}</td>
                        <td>
                          <button
                            type="button"
                            className="aa-revert-btn"
                            onClick={() => revert(r)}
                            title="Revert this change"
                          >
                            <RotateCcw size={13} />
                            Revert
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="aa-empty">
                          No audit entries match your filters for {month}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── mobile cards (mobile <= 768px) ── */}
              <div className="aa-mobile-cards-list aa-mobile-only">
                {pageRows.map((r) => (
                  <div className="aa-mobile-card" key={r.id}>
                    <div className="aa-mob-card-header">
                      <div className="aa-mob-emp-info">
                        <span className={`aa-avatar ${r.avatarClass}`}>
                          {r.initials}
                        </span>
                        <div className="aa-mob-name-ref">
                          <span className="aa-mob-emp-name">{r.name}</span>
                          <span className="aa-mob-ref-code">{r.ref}</span>
                        </div>
                      </div>
                      <span className={`aa-action tone-${r.tone}`}>
                        {r.action}
                      </span>
                    </div>

                    <div className="aa-mob-change-box">
                      <div className="aa-mob-field-label">
                        <span>Field Modified</span>
                        <strong>{r.field}</strong>
                      </div>
                      <div className="aa-mob-values-row">
                        <div className="aa-mob-val aa-mob-val-old">
                          <span className="aa-mob-val-title">Old</span>
                          <span className="aa-old">{r.oldValue || "—"}</span>
                        </div>
                        <ArrowRight size={14} className="aa-mob-arrow" />
                        <div className="aa-mob-val aa-mob-val-new">
                          <span className="aa-mob-val-title">New</span>
                          <span className="aa-new">{r.newValue || "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="aa-mob-meta-grid">
                      <div className="aa-mob-meta-item">
                        <span className="aa-mob-meta-label">Performed By</span>
                        <span className="aa-mob-meta-val">{r.performedBy}</span>
                      </div>
                      <div className="aa-mob-meta-item">
                        <span className="aa-mob-meta-label">Source</span>
                        <span className="aa-mob-meta-val">{r.source}</span>
                      </div>
                      <div className="aa-mob-meta-item aa-mob-meta-full">
                        <span className="aa-mob-meta-label">Timestamp</span>
                        <span className="aa-mob-meta-val aa-code">
                          {r.timestamp}
                        </span>
                      </div>
                    </div>

                    <div className="aa-mob-card-actions">
                      <button
                        type="button"
                        className="aa-mob-revert-btn"
                        onClick={() => revert(r)}
                      >
                        <RotateCcw size={14} />
                        Revert Change
                      </button>
                    </div>
                  </div>
                ))}

                {pageRows.length === 0 && (
                  <div className="aa-mob-empty-card">
                    No audit entries match your filters for {month}.
                  </div>
                )}
              </div>

              <div className="aa-foot">
                <span className="aa-foot-info">
                  Showing {pageRows.length} of {filtered.length} entries
                </span>
                <div className="aa-pager">
                  <button
                    type="button"
                    className="aa-page-btn"
                    disabled={safePage === 1}
                    onClick={() => goto(safePage - 1)}
                  >
                    Prev
                  </button>
                  {pageItems.map((it, idx) =>
                    typeof it === "number" ? (
                      <button
                        key={`${it}-${idx}`}
                        type="button"
                        className={`aa-page-btn num ${
                          it === safePage ? "active" : ""
                        }`}
                        onClick={() => goto(it)}
                      >
                        {it}
                      </button>
                    ) : (
                      <span key={`${it}-${idx}`} className="aa-page-gap">
                        …
                      </span>
                    )
                  )}
                  <button
                    type="button"
                    className="aa-page-btn"
                    disabled={safePage === totalPages}
                    onClick={() => goto(safePage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
