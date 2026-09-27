import React, { useEffect, useMemo, useState } from "react";
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

/* ─────────────────────────── month & seed data ─────────────────────────── */

function generateMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = d.toLocaleString("en-US", { month: "long" });
    options.push(`${mName}-${d.getFullYear()}`);
  }
  return options;
}

const MONTH_OPTIONS = generateMonthOptions();

const ACTION_TYPES = [
  "Regularization approved",
  "Regularization rejected",
  "Attendance edited",
  "Log rejected",
  "Record reverted",
  "Finalization override",
];

const SEED_PEOPLE = [
  ["Tanmay S", "ADM001"],
  ["Miqdad Mirza", "ADM002"],
  ["Aaquib Khan", "ADM003"],
  ["Jahnvi Shah", "EMP002"],
  ["Payal", "MGR001"],
  ["Janhavi S", "ADM004"],
  ["Shraddha J", "ADM005"],
  ["Bikita H", "ADM007"],
  ["Test Employee", "TEST001"],
  ["Payal M", "EMP006"],
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
  "Payal (Manager)",
  "Aaquib Khan (Admin)",
];

const SOURCES = ["Web portal", "Mobile app", "Biometric device", "API integration"];

function buildRows(peopleList = SEED_PEOPLE) {
  const pList = peopleList && peopleList.length > 0 ? peopleList : SEED_PEOPLE;
  const rows = [];
  const currentMonth = MONTH_OPTIONS[0] || "September-2026";
  const prevMonth = MONTH_OPTIONS[1] || "August-2026";

  for (let i = 0; i < 84; i += 1) {
    const [name, code] = pList[i % pList.length];
    const day = 28 - Math.floor(i / 3);
    const assignedMonth = i < 48 ? currentMonth : prevMonth;
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
      month: assignedMonth,
      initials: (name || "EM")
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      avatarClass: `aa-av-${["a", "b", "c", "d", "e", "f"][i % 6]}`,
      action,
      tone,
      logDate: `${String(Math.max(day, 1)).padStart(2, "0")}-${i < 48 ? "09" : "08"}-2026`,
      timestamp: `${String(Math.max(day, 1)).padStart(2, "0")}-${i < 48 ? "09" : "08"}-2026 ${String(
        9 + (i % 9)
      ).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")} ${i % 2 === 0 ? "AM" : "PM"}`,
      field:
        i % 4 === 0
          ? "Check-out time"
          : i % 4 === 1
          ? "Attendance status"
          : i % 4 === 2
          ? "Check-in time"
          : "Work hours",
      oldValue:
        i % 4 === 0 ? "18:30" : i % 4 === 1 ? "Absent" : i % 4 === 2 ? "—" : "0h 00m",
      newValue:
        i % 4 === 0 ? "19:45" : i % 4 === 1 ? "Present" : i % 4 === 2 ? "09:30 AM" : "8h 30m",
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
  const [month, setMonth] = useState(MONTH_OPTIONS[0]);
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(() => buildRows(SEED_PEOPLE));

  // Fetch live regularization logs and merge with audit trail
  useEffect(() => {
    const baseUrl = (
      import.meta.env?.VITE_API_URL || "https://quickchex-backend.onrender.com"
    ).replace(/\/$/, "");
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";

    fetch(`${baseUrl}/api/v1/regularization/admin/all`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((regData) => {
        const list = Array.isArray(regData?.value)
          ? regData.value
          : Array.isArray(regData)
          ? regData
          : [];
        if (list.length > 0) {
          const liveRows = list.map((r, i) => {
            const isApproved = String(r.status || "").toLowerCase().includes("approved");
            const isRejected = String(r.status || "").toLowerCase().includes("rejected");
            const action = isApproved
              ? "Regularization approved"
              : isRejected
              ? "Regularization rejected"
              : "Attendance edited";
            const tone = isApproved ? "green" : isRejected ? "danger" : "amber";

            return {
              id: `aud-live-${r.id || i}`,
              ref: `AUD-REG-${String(r.id || 100 + i).padStart(4, "0")}`,
              name: r.name || r.employeeName || "Employee",
              code: r.emp_code || `EMP${String(i + 1).padStart(3, "0")}`,
              month: MONTH_OPTIONS[0],
              initials: (r.name || r.employeeName || "EM")
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase(),
              avatarClass: `aa-av-${["a", "b", "c", "d", "e", "f"][i % 6]}`,
              action,
              tone,
              logDate: r.date || r.targetDate || "2026-09-24",
              timestamp: r.created_at || `${r.date || "2026-09-24"} 10:30 AM`,
              field: r.issue ? r.issue.split(":")[0] : "Attendance status",
              oldValue: "Missing / Absent",
              newValue: r.status || "Present",
              performedBy: r.approved_by || getAdminActor(),
              source: "Web portal",
              ip: "10.4.1.20",
            };
          });

          setRows((prev) => {
            const existingIds = new Set(prev.map((x) => x.id));
            const newOnes = liveRows.filter((x) => !existingIds.has(x.id));
            return [...newOnes, ...prev];
          });
        }
      })
      .catch((err) => console.warn("Could not load live regularizations for audit:", err));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchMonth = !month || r.month === month;
      const matchAction =
        actionFilter === "All Actions" || r.action === actionFilter;
      const matchQuery =
        !q ||
        (r.name || "").toLowerCase().includes(q) ||
        (r.code || "").toLowerCase().includes(q) ||
        (r.action || "").toLowerCase().includes(q) ||
        (r.performedBy || "").toLowerCase().includes(q) ||
        (r.ref || "").toLowerCase().includes(q);
      return matchMonth && matchAction && matchQuery;
    });
  }, [rows, month, actionFilter, query]);

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

  const exportAudit = () => {
    if (!filtered.length) {
      toast.error("No audit entries to export");
      return;
    }
    const headers = ["Reference ID", "Employee", "Code", "Action", "Field", "Old Value", "New Value", "Performed By", "Timestamp", "Source"];
    const csvContent = [
      headers.join(","),
      ...filtered.map((r) => [
        `"${r.ref}"`,
        `"${r.name}"`,
        `"${r.code}"`,
        `"${r.action}"`,
        `"${r.field}"`,
        `"${r.oldValue}"`,
        `"${r.newValue}"`,
        `"${r.performedBy}"`,
        `"${r.timestamp}"`,
        `"${r.source}"`,
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Attendance_Audit_Trail_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filtered.length} audit entries for ${month}`);
  };

  const revert = (row) => {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
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
