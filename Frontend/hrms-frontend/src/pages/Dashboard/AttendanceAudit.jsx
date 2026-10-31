// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - ATTENDANCEAUDIT.JSX
// Path: Frontend/hrms-frontend/src/pages/Dashboard/AttendanceAudit.jsx
// Purpose: Web portal page component managing 'AttendanceAudit' views, user interactions, and state.
// UI Components:
//   • <MONTH_OPTIONS />
//   • <ACTION_TYPES />
//   • <SEED_PEOPLE />
//   • <ACTORS />
//   • <SOURCES />
//   • <PAGE_SIZE />
//   • <AttendanceAudit />
// Key Functions & Handlers:
//   • getAdminActor()
//   • goto()
//   • push()
//   • exportAudit()
//   • revert()
//   • buildRows()
// ==============================================================================

import React, { useMemo, useState, useEffect } from "react";
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
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardShell } from "../../components/header/DashboardHeader";
import { getApiUrl } from "../../services/apiClient";
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

const SEED_PEOPLE = [
  ["Aaquib Khan", "ADM001"],
  ["Payal Kaur", "EMP003"],
  ["Payal Mishra", "LE249"],
  ["Elena Rostova", "LE724"],
  ["Kevin John", "MGR001"],
  ["Aaquib Khan", "LE719"],
  ["Monika Tiwari", "MGR002"],
  ["Vikram Malhotra", "EMP012"],
  ["Priya Sharma", "EMP015"],
  ["Rahul Varma", "EMP020"],
];

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

function buildRows(peopleList = SEED_PEOPLE) {
  const pList = peopleList && peopleList.length > 0 ? peopleList : SEED_PEOPLE;
  const rows = [];
  for (let i = 0; i < 48; i += 1) {
    const person = pList[i % pList.length];
    const name = Array.isArray(person) ? person[0] : (person.name || person.first_name || "Employee");
    const code = Array.isArray(person) ? person[1] : (person.emp_code || person.code || "EMP001");
    const day = 29 - Math.floor(i / 4);
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
      initials: (name || "EM")
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

const PAGE_SIZE = 10;


/* ─────────────────────────── page ─────────────────────────── */

export default function AttendanceAudit() {
  const [rows, setRows] = useState(() => buildRows(SEED_PEOPLE));
  const [month, setMonth] = useState(MONTH_OPTIONS[0]);
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(getApiUrl("/api/v1/profile/employees/"))
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const list = data.map((e) => [
            e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.emp_code,
            e.emp_code || "EMP"
          ]);
          setRows(buildRows(list));
        }
      })
      .catch(() => {});
  }, []);

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
        (r.ref && r.ref.toLowerCase().includes(q));
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

        {/* ── audit table / mobile cards ── */}
        <div className="aa-card">
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
                  <span className={`aa-action tone-${r.tone}`}>{r.action}</span>
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
                    <span className="aa-mob-meta-val aa-code">{r.timestamp}</span>
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
                No audit entries match your filters.
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
