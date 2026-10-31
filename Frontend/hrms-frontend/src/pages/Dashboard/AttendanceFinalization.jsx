// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - ATTENDANCEFINALIZATION.JSX
// Path: Frontend/hrms-frontend/src/pages/Dashboard/AttendanceFinalization.jsx
// Purpose: Web portal page component managing 'AttendanceFinalization' views, user interactions, and state.
// UI Components:
//   • <MONTH_OPTIONS />
//   • <STEPS />
//   • <SEED_PEOPLE />
//   • <EXCEPTION_TYPES />
//   • <RUNNERS />
//   • <STATUSES />
//   • <SEED_EXCEPTIONS_DATA />
//   • <ALL_RUNS />
// Key Functions & Handlers:
//   • handleOutside()
//   • handleResolveException()
//   • runProcess()
//   • formatRunDateTime()
//   • formatExceptionDate()
//   • buildRuns()
//   • buildExceptions()
// ==============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Play,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Calendar,
  User,
  FileText,
  ArrowRight,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardShell } from "../../components/header/DashboardHeader";
import "./AttendanceFinalization.css";
import { getApiUrl } from "../../services/apiClient";

function formatRunDateTime(dtStr) {
  if (!dtStr) return "—";
  try {
    const parts = dtStr.match(/^(\d{2})-(\d{2})-(\d{4})\s*(.*)$/);
    if (parts) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const d = parts[1];
      const mIdx = parseInt(parts[2], 10) - 1;
      const y = parts[3];
      const time = parts[4] || "";
      const mName = monthNames[mIdx] || parts[2];
      return `${d} ${mName} ${y}${time ? `, ${time}` : ""}`;
    }
    return dtStr;
  } catch {
    return dtStr;
  }
}

function formatExceptionDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
      const mIdx = parseInt(ymd[2], 10) - 1;
      return `${ymd[3]} ${monthNames[mIdx] || ymd[2]} ${ymd[1]}`;
    }
    const dmy = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (dmy) {
      const mIdx = parseInt(dmy[2], 10) - 1;
      return `${dmy[1]} ${monthNames[mIdx] || dmy[2]} ${dmy[3]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/* ─────────────────────────── demo data ─────────────────────────── */

const MONTH_OPTIONS = [
  "August-2026",
  "July-2026",
  "June-2026",
  "May-2026",
  "April-2026",
  "March-2026",
];

const STEPS = [
  {
    id: "import",
    name: "Import Punches",
    desc: "Pull raw check-in / check-out logs from all registered devices.",
  },
  {
    id: "validate",
    name: "Validate Shifts",
    desc: "Match punches to shifts, flag missed punches and anomalies.",
  },
  {
    id: "process",
    name: "Process Late / OT",
    desc: "Compute late marks, half days, overtime and comp-off balances.",
  },
  {
    id: "approve",
    name: "Manager Approval",
    desc: "Route exception summaries to reporting managers for sign-off.",
  },
  {
    id: "finalize",
    name: "Finalize & Lock",
    desc: "Lock the month, push records to payroll and publish to employees.",
  },
];

const SEED_PEOPLE = [
  ["Aaquib Khan", "ADM001"],
  ["Payal Kaur", "EMP003"],
  ["Payal Mishra", "LE249"],
  ["Elena Rostova", "LE724"],
  ["Kevin John", "MGR001"],
  ["Aaquib Khan", "LE719"],
];

const EXCEPTION_TYPES = [
  "Missed check-out",
  "Less than shift hours",
  "Half day detected",
  "Missed check-in",
  "Excess overtime",
];

const RUNNERS = ["Aaquib Khan", "System (auto)", "Monika Tiwari", "Kevin Mathew"];
const STATUSES = ["Completed", "Completed", "Running", "Failed", "Completed"];

function buildRuns(peopleList = SEED_PEOPLE) {
  const pList = peopleList && peopleList.length > 0 ? peopleList : SEED_PEOPLE;
  const runs = [];
  for (let i = 0; i < 8; i += 1) {
    const [name, code] = pList[(i * 3) % pList.length];
    const day = 28 - i;
    runs.push({
      id: `run-${i}`,
      runId: `AF-2026-${String(420 - i).padStart(4, "0")}`,
      month: MONTH_OPTIONS[Math.floor(i / 2)] || MONTH_OPTIONS[0],
      executedAt: `${String(Math.max(day, 1)).padStart(2, "0")}-08-2026 ${String(
        9 + (i % 9)
      ).padStart(2, "0")}:${i % 2 === 0 ? "15" : "40"} ${
        i % 2 === 0 ? "AM" : "PM"
      }`,
      triggeredBy: RUNNERS[i % RUNNERS.length],
      employees: 11,
      records: 242 - (i % 5) * 12,
      exceptions: (i * 3) % 4,
      status: STATUSES[i % STATUSES.length],
      sampleEmp: `${name} (${code})`,
    });
  }
  return runs;
}

const SEED_EXCEPTIONS_DATA = [
  { name: "Aaquib Khan", code: "EMP001", date: "2026-09-28", type: "Forgot to punch in", detail: "Forgot to punch in on arrival." },
  { name: "Payal Mundhe", code: "LE249", date: "2026-09-20", type: "Forgot to punch out", detail: "Forgot to punch out at departure." },
  { name: "Aaquib Khan", code: "LE239", date: "2026-09-25", type: "Forgot to punch in and punch out", detail: "Both morning and evening punch missing." },
  { name: "Vishwaja Pilankar", code: "LE222", date: "2026-10-17", type: "Missed swipe punch", detail: "Device failed to capture NFC tap." },
  { name: "Vishwaja Pilankar", code: "LE222", date: "2026-10-21", type: "Forgot to punch in and punch out", detail: "Missing entry and exit punches." },
  { name: "Pratik Shah", code: "LE114", date: "2026-09-25", type: "Missed swipe punch", detail: "Biometric verification skipped." },
  { name: "Chirag Satpute", code: "LE240", date: "2026-10-17", type: "Forgot to punch out", detail: "Forgot to punch out at end of shift." },
  { name: "Antikumari Mishra", code: "LE210", date: "2026-10-21", type: "Forgot to punch in and punch out", detail: "Both check-in and check-out logs absent." },
  { name: "Nilesh Bakadve", code: "LE209", date: "2026-10-19", type: "Test", detail: "Test verification exception." },
  { name: "Krishna Harilal Pal", code: "LE214", date: "2026-10-16", type: "Test", detail: "Test exception scenario." },
  { name: "Atharva Karkikar", code: "LE164", date: "2026-10-14", type: "Late punch in", detail: "Late arrival recorded past threshold." },
  { name: "Sagar Pokhariyal", code: "LE238", date: "2026-10-12", type: "Forgot to punch in", detail: "Check-in missing for client visit." },
  { name: "Pankaj Gupta", code: "LE212", date: "2026-10-10", type: "Missed swipe punch", detail: "Card reader timeout." },
  { name: "Kevin John", code: "MGR001", date: "2026-10-08", type: "Less than shift hours", detail: "Worked 6.5 hours against 9 hours." },
  { name: "Elena Rostova", code: "LE724", date: "2026-10-06", type: "Half day detected", detail: "Half day status detected." },
  { name: "Monika Tiwari", code: "LE188", date: "2026-10-04", type: "Forgot to punch out", detail: "Exit gate punch unrecorded." },
  { name: "Tanmay Shinde", code: "ADM002", date: "2026-10-02", type: "Excess overtime", detail: "Unapproved overtime hours logged." }
];

function buildExceptions() {
  return SEED_EXCEPTIONS_DATA.map((item, i) => ({
    id: `exc-${i + 1}`,
    name: item.name,
    code: item.code,
    initials: item.name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    avatarClass: `af-av-${["a", "b", "c", "d", "e", "f"][i % 6]}`,
    date: item.date,
    type: item.type,
    detail: item.detail,
  }));
}

const ALL_RUNS = buildRuns(SEED_PEOPLE);
const ALL_EXCEPTIONS = buildExceptions();

/* ─────────────────────────── page ─────────────────────────── */

export default function AttendanceFinalization() {
  const [month, setMonth] = useState(MONTH_OPTIONS[0]);
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(STEPS.length);
  const [runs, setRuns] = useState(() => {
    try {
      const stored = localStorage.getItem("laesfera_attendance_finalization_runs");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ALL_RUNS;
  });
  const [exceptions, setExceptions] = useState(ALL_EXCEPTIONS);

  useEffect(() => {
    const token = localStorage.getItem("token") || "";

    fetch(getApiUrl("/api/v1/regularization/admin/all"), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((regData) => {
        const list = Array.isArray(regData?.value) ? regData.value : Array.isArray(regData) ? regData : [];
        if (list.length > 0) {
          const mapped = list.map((r, i) => ({
            id: `exc-db-${r.id || i}`,
            name: r.name || r.employeeName || "Employee",
            code: r.emp_code || `EMP${String(i + 1).padStart(3, "0")}`,
            initials: (r.name || r.employeeName || "EM")
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase(),
            avatarClass: `af-av-${["a", "b", "c", "d", "e", "f"][i % 6]}`,
            date: r.date || r.targetDate || "2026-09-24",
            type: r.issue ? r.issue.split(":")[0] : "Missed check-out",
            detail: r.reason || r.issue || r.comment || "Check-in captured, no matching check-out found.",
          }));
          setExceptions(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const monthRuns = useMemo(
    () => runs.filter((r) => r.month === month),
    [runs, month]
  );

  const filteredExc = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exceptions;
    return exceptions.filter(
      (x) =>
        x.name.toLowerCase().includes(q) ||
        x.code.toLowerCase().includes(q) ||
        x.type.toLowerCase().includes(q)
    );
  }, [query, exceptions]);

  const [showAllRuns, setShowAllRuns] = useState(false);
  const [activeRunMenu, setActiveRunMenu] = useState(null);
  const [activeExcMenu, setActiveExcMenu] = useState(null);
  const [excPage, setExcPage] = useState(1);
  const excPageSize = 10;

  useEffect(() => {
    setExcPage(1);
  }, [query]);

  useEffect(() => {
    const handleOutside = () => {
      setActiveRunMenu(null);
      setActiveExcMenu(null);
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, []);

  const totalPages = Math.ceil(filteredExc.length / excPageSize) || 1;
  const paginatedExceptions = useMemo(() => {
    const start = (excPage - 1) * excPageSize;
    return filteredExc.slice(start, start + excPageSize);
  }, [filteredExc, excPage]);

  const handleResolveException = (id, empName) => {
    setExceptions((prev) => prev.filter((x) => x.id !== id));
    toast.success(`Exception for ${empName} marked resolved`);
  };

  const runProcess = () => {
    if (running) return;
    setRunning(true);
    setStep(0);
    STEPS.forEach((_, i) => {
      setTimeout(() => {
        setStep(i + 1);
        if (i === STEPS.length - 1) {
          setRunning(false);
          toast.success(`${month} finalized & locked — pushed to payroll`);
          setRuns((prev) => {
            const next = [
              {
                id: `run-new-${Date.now()}`,
                runId: `AF-2026-${String(421 + prev.length).padStart(4, "0")}`,
                month,
                executedAt: "Just now",
                triggeredBy: (() => {
                  try {
                    const u = JSON.parse(localStorage.getItem("user") || "{}");
                    return u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || localStorage.getItem("user_name") || "Admin User";
                  } catch {
                    return localStorage.getItem("user_name") || "Admin User";
                  }
                })(),
                employees: 11,
                records: 242,
                exceptions: exceptions.length,
                status: "Completed",
                sampleEmp: "Payal Kaur (EMP003)",
              },
              ...prev,
            ];
            try {
              localStorage.setItem("laesfera_attendance_finalization_runs", JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }, 900 * (i + 1));
    });
  };

  const lastRun = runs && runs.length > 0 ? runs[0] : null;

  return (
    <DashboardShell>
      <Toaster position="top-right" />
      <div className="attendance-finalization-page">
        {/* ── summary cards ── */}
        <div className="af-stats">
          <div className="af-stat-card">
            <span className="af-stat-icon purple"><Play size={20} /></span>
            <div>
              <span className="af-stat-value">{lastRun?.runId ? `#${lastRun.runId.split("-").pop()}` : "—"}</span>
              <span className="af-stat-label">{lastRun ? `Last run (${lastRun.month})` : "No runs yet"}</span>
            </div>
          </div>
          <div className="af-stat-card">
            <span className="af-stat-icon green"><Users size={20} /></span>
            <div>
              <span className="af-stat-value">{lastRun ? Number(lastRun.employees || 0).toLocaleString() : "0"}</span>
              <span className="af-stat-label">Employees processed</span>
            </div>
          </div>
          <div className="af-stat-card">
            <span className="af-stat-icon amber"><AlertTriangle size={20} /></span>
            <div>
              <span className="af-stat-value">{filteredExc.length}</span>
              <span className="af-stat-label">Open exceptions</span>
            </div>
          </div>
          <div className="af-stat-card">
            <span className="af-stat-icon purple"><CheckCircle2 size={20} /></span>
            <div>
              <span className="af-stat-value">{lastRun?.status || "Ready"}</span>
              <span className="af-stat-label">Current status</span>
            </div>
          </div>
        </div>

        {/* ── process pipeline ── */}
        <div className="af-card af-pipeline-card">
          <div className="af-card-head">
            <div>
              <h3 className="af-card-title">Attendance Process</h3>
              <p className="af-card-sub">
                Run the end-to-end attendance finalization pipeline for a month.
              </p>
            </div>
            <div className="af-pipeline-controls">
              <div className="af-month-select">
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  aria-label="Select month"
                  disabled={running}
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="af-caret" />
              </div>
              <button
                type="button"
                className={`af-run-btn${running ? " running" : ""}`}
                onClick={runProcess}
                disabled={running}
              >
                {running ? <RefreshCw size={16} className="af-spin" /> : <Play size={16} />}
                {running ? "Processing…" : "Run Process"}
              </button>
            </div>
          </div>
          <ol className="af-steps">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={`af-step${i < step ? " done" : ""}${i === step && running ? " active" : ""}`}
              >
                <span className="af-step-dot">
                  {i < step ? <CheckCircle2 size={15} /> : i + 1}
                </span>
                <span className="af-step-name">{s.name}</span>
                <span className="af-step-desc">{s.desc}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* ── recent runs ── */}
        <div className="af-card af-table-card">
          <div className="af-card-head">
            <div>
              <h3 className="af-card-title">Recent Runs</h3>
              <p className="af-card-sub">Processing history for {month}.</p>
            </div>
            <button
              type="button"
              className="af-export-btn"
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(
                    monthRuns.map((r) => `${r.runId},${r.executedAt},${r.status}`).join("\n")
                  );
                  toast.success("Run history copied to clipboard");
                } catch {
                  toast.error("Could not copy run history");
                }
              }}
            >
              <FileSpreadsheet size={15} /> Export Runs
            </button>
          </div>
          {/* Desktop Table */}
          <div className="af-table-wrap af-desktop-only">
            <table className="af-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Executed At</th>
                  <th>Triggered By</th>
                  <th>Employees</th>
                  <th>Records</th>
                  <th>Exceptions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {monthRuns.map((r) => (
                  <tr key={r.id}>
                    <td className="af-code">{r.runId}</td>
                    <td>{r.executedAt}</td>
                    <td>{r.triggeredBy}</td>
                    <td>{r.employees.toLocaleString()}</td>
                    <td>{r.records.toLocaleString()}</td>
                    <td>{r.exceptions}</td>
                    <td>
                      <span className={`af-badge ${r.status.toLowerCase()}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
                {monthRuns.length === 0 && (
                  <tr>
                    <td colSpan={7} className="af-empty">
                      No runs recorded for {month} yet — click “Run Process” to start one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="af-run-cards-list af-mobile-only">
            {monthRuns.length === 0 ? (
              <div className="af-empty-card">
                No runs recorded for {month} yet — tap “Run Process” to start one.
              </div>
            ) : (
              (showAllRuns ? monthRuns : monthRuns.slice(0, 2)).map((r) => (
                <div key={r.id} className="af-run-card-item">
                  <div className="af-run-card-head">
                    <div className="af-run-card-title-group">
                      <span className="af-run-icon">
                        <Calendar size={15} />
                      </span>
                      <span className="af-run-id">{r.runId}</span>
                      <span className={`af-badge ${r.status.toLowerCase()}`}>{r.status}</span>
                    </div>
                    <div
                      className="af-card-action-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="af-dot-btn"
                        onClick={() => setActiveRunMenu(activeRunMenu === r.id ? null : r.id)}
                        aria-label="Options"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeRunMenu === r.id && (
                        <div className="af-popup-menu">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(r.runId);
                              toast.success(`Copied ${r.runId}`);
                              setActiveRunMenu(null);
                            }}
                          >
                            Copy Run ID
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="af-run-card-body">
                    <div className="af-run-detail-row">
                      <Calendar size={13} className="af-detail-icon" />
                      <span>{formatRunDateTime(r.executedAt)}</span>
                    </div>
                    <div className="af-run-detail-row">
                      <FileText size={13} className="af-detail-icon" />
                      <span>{r.status === "Completed" ? "Auto Finalization" : "Manual Run"}</span>
                    </div>
                    <div className="af-run-detail-row">
                      <User size={13} className="af-detail-icon" />
                      <span>Executed by: {r.triggeredBy || "System"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {monthRuns.length > 2 && (
              <button
                type="button"
                className="af-view-all-runs-btn"
                onClick={() => setShowAllRuns(!showAllRuns)}
              >
                <span>{showAllRuns ? "Show Less Runs" : "View All Runs"}</span>
                <ArrowRight size={14} className={showAllRuns ? "af-arrow-up" : ""} />
              </button>
            )}
          </div>
        </div>

        {/* ── open exceptions ── */}
        <div className="af-card af-exc-card">
          <div className="af-card-head">
            <div>
              <h3 className="af-card-title">Open Exceptions</h3>
              <p className="af-card-sub">
                {filteredExc.length} exception(s) need review before finalizing {month}.
              </p>
            </div>
            <div className="af-search af-desktop-only">
              <Search size={15} className="af-search-icon" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employee, code or type…"
                aria-label="Search exceptions"
              />
            </div>
          </div>

          {/* Full-width Search Input for Mobile View */}
          <div className="af-search af-mobile-search af-mobile-only">
            <Search size={15} className="af-search-icon" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee, code or type…"
              aria-label="Search exceptions mobile"
            />
          </div>

          {/* Desktop Table */}
          <div className="af-table-wrap af-desktop-only">
            <table className="af-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Exception</th>
                  <th>Detail</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExc.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <div className="af-emp">
                        <span className={`af-avatar ${x.avatarClass}`}>{x.initials}</span>
                        <div className="af-emp-meta">
                          <span className="af-emp-name">{x.name}</span>
                          <span className="af-code">{x.code}</span>
                        </div>
                      </div>
                    </td>
                    <td>{x.date}</td>
                    <td>
                      <span className="af-exc-type">
                        <AlertTriangle size={13} /> {x.type}
                      </span>
                    </td>
                    <td className="af-detail-cell">{x.detail}</td>
                    <td>
                      <button
                        type="button"
                        className="af-resolve-btn"
                        onClick={() => handleResolveException(x.id, x.name)}
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredExc.length === 0 && (
                  <tr>
                    <td colSpan={5} className="af-empty">
                      No exceptions match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="af-exc-cards-list af-mobile-only">
            {filteredExc.length === 0 ? (
              <div className="af-empty-card">
                No exceptions match your search.
              </div>
            ) : (
              paginatedExceptions.map((x) => (
                <div key={x.id} className="af-exc-card-item">
                  <div className="af-exc-card-top">
                    <div className="af-exc-user-group">
                      <span className={`af-avatar ${x.avatarClass}`}>{x.initials}</span>
                      <div className="af-emp-meta">
                        <span className="af-emp-name">{x.name}</span>
                        <span className="af-code">{x.code}</span>
                      </div>
                    </div>
                    <div className="af-exc-right-group">
                      <span className="af-exc-date-badge">
                        <Calendar size={12} />
                        <span>{formatExceptionDate(x.date)}</span>
                      </span>
                      <div
                        className="af-card-action-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="af-dot-btn"
                          onClick={() => setActiveExcMenu(activeExcMenu === x.id ? null : x.id)}
                          aria-label="Options"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeExcMenu === x.id && (
                          <div className="af-popup-menu">
                            <button
                              type="button"
                              onClick={() => {
                                handleResolveException(x.id, x.name);
                                setActiveExcMenu(null);
                              }}
                            >
                              Resolve Exception
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="af-exc-badge-row">
                    <span className="af-exc-warning-pill">
                      <AlertTriangle size={12} />
                      <span>{x.type}</span>
                    </span>
                  </div>
                </div>
              ))
            )}

            {filteredExc.length > 0 && (
              <div className="af-exc-pagination">
                <span className="af-pagination-count">
                  Showing {Math.min((excPage - 1) * excPageSize + 1, filteredExc.length)} to{" "}
                  {Math.min(excPage * excPageSize, filteredExc.length)} of {filteredExc.length} exceptions
                </span>
                {totalPages > 1 && (
                  <div className="af-pagination-btns">
                    <button
                      type="button"
                      className="af-page-btn arrow"
                      disabled={excPage === 1}
                      onClick={() => setExcPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`af-page-btn ${num === excPage ? "is-active" : ""}`}
                        onClick={() => setExcPage(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="af-page-btn arrow"
                      disabled={excPage === totalPages}
                      onClick={() => setExcPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

