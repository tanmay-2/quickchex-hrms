import React, { useMemo, useState } from "react";
import {
  Search,
  FileSpreadsheet,
  Download,
  RotateCcw,
  ChevronDown,
  Users,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardShell } from "../../components/header/DashboardHeader";
import "./AttendanceAudit.css";

/* ─────────────────────────── demo data ─────────────────────────── */

const MONTH_OPTIONS = ["August-2026", "July-2026", "June-2026", "May-2026"];

const ACTION_TYPES = [
  "Regularization approved",
  "Regularization rejected",
  "Attendance edited",
  "Log rejected",
  "Record reverted",
  "Finalization override",
];

const PEOPLE = [];


const getAdminActor = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const name = u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || localStorage.getItem("user_name");
    if (name) return `${name} (Admin)`;
  } catch { /* ignore */ }
  return "Admin (Ops)";
};

const ACTORS = [
  getAdminActor(),
  "Monika Tiwari (Manager)",
  "System (auto)",
  "Kevin Mathew (Manager)",
];

const SOURCES = ["Web app", "Mobile app", "BioStar device", "API"];

function buildRows() {
  const rows = [];
  for (let i = 0; i < 164; i += 1) {
    const [name, code] = PEOPLE[i % PEOPLE.length];
    const day = 29 - Math.floor(i / 6);
    const action = ACTION_TYPES[i % ACTION_TYPES.length];
    const tone =
      action.includes("rejected") || action.includes("reverted")
        ? "danger"
        : action.includes("override")
        ? "amber"
        : action === "Attendance edited"
        ? "blue"
        : "green";
    rows.push({
      id: `aud-${i}`,
      ref: `AUD-2026-${String(9180 - i).padStart(4, "0")}`,
      name,
      code,
      initials: name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      avatarClass: `aa-av-${["a", "b", "c", "d", "e", "f"][i % 6]}`,
      action,
      tone,
      logDate: `${String(Math.max(day, 1)).padStart(2, "0")}-08-2026`,
      timestamp: `${String(Math.max(day, 1)).padStart(2, "0")}-08-2026 ${String(
        9 + (i % 10)
      ).padStart(2, "0")}:${(i % 6) * 9 + 5} ${i % 2 === 0 ? "AM" : "PM"}`,
      field:
        i % 3 === 0
          ? "Check-out time"
          : i % 3 === 1
          ? "Attendance status"
          : "Overtime hours",
      oldValue:
        i % 3 === 0 ? "18:30" : i % 3 === 1 ? "Absent" : "0h 00m",
      newValue:
        i % 3 === 0 ? "19:45" : i % 3 === 1 ? "Present" : "1h 15m",
      performedBy: ACTORS[i % ACTORS.length],
      source: SOURCES[i % SOURCES.length],
      ip: `10.4.${i % 12}.${(i * 7) % 240 + 10}`,
    });
  }
  return rows;
}

const ALL_ROWS = [];
const PAGE_SIZE = 10;


/* ─────────────────────────── page ─────────────────────────── */

export default function AttendanceAudit() {
  const [month, setMonth] = useState(MONTH_OPTIONS[0]);
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_ROWS.filter((r) => {
      const matchAction =
        actionFilter === "All Actions" || r.action === actionFilter;
      const matchQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.performedBy.toLowerCase().includes(q) ||
        r.ref.toLowerCase().includes(q);
      return matchAction && matchQuery;
    });
  }, [actionFilter, query]);

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
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i += 1) push(i);
    if (safePage < totalPages - 2) push("gap-r");
    push(totalPages);
    return items;
  }, [safePage, totalPages]);

  const exportAudit = () =>
    toast.success(
      `Audit trail exported — ${filtered.length} entries for ${month}`
    );

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
            <span className="aa-stat-icon tone-purple"><Users size={20} /></span>
            <div>
              <span className="aa-stat-value">{filtered.length}</span>
              <span className="aa-stat-label">Audit entries ({month})</span>
            </div>
          </div>
          <div className="aa-stat-card">
            <span className="aa-stat-icon tone-green"><CheckCircle2 size={20} /></span>
            <div>
              <span className="aa-stat-value">
                {filtered.filter((r) => r.tone === "green").length}
              </span>
              <span className="aa-stat-label">Approvals granted</span>
            </div>
          </div>
          <div className="aa-stat-card">
            <span className="aa-stat-icon tone-blue"><Edit3 size={20} /></span>
            <div>
              <span className="aa-stat-value">
                {filtered.filter((r) => r.tone === "blue").length}
              </span>
              <span className="aa-stat-label">Manual edits</span>
            </div>
          </div>
          <div className="aa-stat-card">
            <span className="aa-stat-icon tone-amber"><RotateCcw size={20} /></span>
            <div>
              <span className="aa-stat-value">
                {filtered.filter((r) => r.tone === "danger" || r.tone === "amber").length}
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
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
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
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown size={16} className="aa-select-caret" />
            </div>
            <div className="aa-search">
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
            <button type="button" className="aa-btn aa-btn-primary" onClick={exportAudit}>
              <FileSpreadsheet size={16} />
              Export Audit
            </button>
          </div>
        </div>

        {/* ── audit table ── */}
        <div className="aa-card">
          <div className="aa-table-wrap">
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
                      <span className={`aa-action tone-${r.tone}`}>{r.action}</span>
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
                      No audit entries match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
                    className={`aa-page-btn num ${it === safePage ? "active" : ""}`}
                    onClick={() => goto(it)}
                  >
                    {it}
                  </button>
                ) : (
                  <span key={`${it}-${idx}`} className="aa-page-gap">…</span>
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
        </div>
      </div>
    </DashboardShell>
  );
}
