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
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardShell } from "../../components/header/DashboardHeader";
import "./AttendanceFinalization.css";

/* ─────────────────────────── demo data ─────────────────────────── */

function generateMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = d.toLocaleString("en-US", { month: "long" });
    options.push(`${mName}-${d.getFullYear()}`);
  }
  return options;
}

const MONTH_OPTIONS = generateMonthOptions();

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

function buildExceptions(peopleList = SEED_PEOPLE) {
  const pList = peopleList && peopleList.length > 0 ? peopleList : SEED_PEOPLE;
  const rows = [];
  for (let i = 0; i < Math.min(pList.length, 5); i += 1) {
    const [name, code] = pList[i % pList.length];
    const day = 25 - (i % 5);
    rows.push({
      id: `exc-${i}`,
      name,
      code,
      initials: name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      avatarClass: `af-av-${["a", "b", "c", "d", "e", "f"][i % 6]}`,
      date: `${String(Math.max(day, 1)).padStart(2, "0")}-09-2026`,
      type: EXCEPTION_TYPES[i % EXCEPTION_TYPES.length],
      detail:
        i % 2 === 0
          ? "Check-in captured, no matching check-out found."
          : "Worked duration shorter than configured shift hours.",
    });
  }
  return rows;
}

const ALL_RUNS = buildRuns(SEED_PEOPLE);
const ALL_EXCEPTIONS = buildExceptions(SEED_PEOPLE);

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
            detail:
              r.reason ||
              r.issue ||
              r.comment ||
              "Check-in captured, no matching check-out found.",
          }));
          setExceptions(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const monthRuns = useMemo(
    () => (runs || []).filter((r) => r.month === month),
    [runs, month]
  );

  const filteredExc = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exceptions || [];
    return (exceptions || []).filter(
      (x) =>
        (x.name || "").toLowerCase().includes(q) ||
        (x.code || "").toLowerCase().includes(q) ||
        (x.type || "").toLowerCase().includes(q)
    );
  }, [query, exceptions]);

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
                runId: `AF-2026-${String(421 + (prev ? prev.length : 0)).padStart(4, "0")}`,
                month,
                executedAt: "Just now",
                triggeredBy: (() => {
                  try {
                    const u = JSON.parse(localStorage.getItem("user") || "{}");
                    return (
                      u.name ||
                      `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
                      localStorage.getItem("user_name") ||
                      "Admin User"
                    );
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
              ...(prev || []),
            ];
            try {
              localStorage.setItem(
                "laesfera_attendance_finalization_runs",
                JSON.stringify(next)
              );
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
              <span className="af-stat-value">
                {lastRun?.runId ? `#${lastRun.runId.split("-").pop()}` : "—"}
              </span>
              <span className="af-stat-label">
                {lastRun ? `Last run (${lastRun.month})` : "No runs yet"}
              </span>
            </div>
          </div>
          <div className="af-stat-card">
            <span className="af-stat-icon green"><Users size={20} /></span>
            <div>
              <span className="af-stat-value">
                {lastRun ? Number(lastRun.employees || 0).toLocaleString() : "0"}
              </span>
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
          <div className="af-table-wrap">
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
                    <td>{Number(r.employees || 0).toLocaleString()}</td>
                    <td>{Number(r.records || 0).toLocaleString()}</td>
                    <td>{r.exceptions}</td>
                    <td>
                      <span className={`af-badge ${(r.status || "").toLowerCase()}`}>{r.status}</span>
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
            <div className="af-search">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employee, code or type…"
                aria-label="Search exceptions"
              />
            </div>
          </div>
          <div className="af-table-wrap">
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
        </div>
      </div>
    </DashboardShell>
  );
}
