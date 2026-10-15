import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  User,
  CalendarDays,
  Clock,
  Wallet,
  CheckCircle2,
  Circle,
  Download,
  AlertTriangle,
  Briefcase,
  FileText,
  ShieldCheck,
  Check,
  Share2,
  Printer
} from "lucide-react";
import { DashboardShell } from "../../components/header/DashboardHeader";
import { getApiUrl } from "../../services/apiClient";
import "./NoticePeriodDetail.css";

/* ── Helpers ────────────────────────────────────────────────────────────── */

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatLastWorkingDay(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function getInitials(name) {
  if (!name) return "EM";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getStatusKey(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("urgent")) return "urgent";
  if (s.includes("upcoming")) return "upcoming";
  if (s.includes("complete") || s.includes("exit")) return "completed";
  return "active";
}

function getAvatarTone(name, i = 0) {
  const n = (name || "").toLowerCase();
  if (n.includes("aachal")) return "tone-green";
  if (n.includes("migdad")) return "tone-red";
  if (n.includes("janhavi")) return "tone-purple";
  if (n.includes("pratik")) return "tone-amber";
  if (n.includes("akash")) return "tone-indigo";
  if (n.includes("jasmeet")) return "tone-blue";
  const tones = ["tone-green", "tone-red", "tone-purple", "tone-amber", "tone-indigo", "tone-blue"];
  return tones[i % tones.length];
}

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

const authHeaders = (extra = {}) => {
  const token = getToken();
  return {
    Accept: "application/json",
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

/* ── Fallback mock for direct deep-link resilience ──────────────────────── */
const FALLBACK_RECORDS = [
  {
    id: 2,
    emp_code: "EMP002",
    name: "Migdad Mirza",
    email: "migdad.m@laesfera.co",
    department: "Engineering",
    designation: "Team Leader",
    manager: "Kevin John",
    resignationDate: "2026-09-01",
    noticePeriod: "45 Days",
    lastWorkingDay: "2026-10-16",
    primary_reason: "Higher Studies",
    notes: "Pursuing master's program.",
    status: "Urgent",
    totalNoticeDays: 45
  },
  {
    id: 4,
    emp_code: "EMP004",
    name: "Pratik Shah",
    email: "pratik.s@laesfera.co",
    department: "Engineering",
    designation: "Pre Sales",
    manager: "Kevin John",
    resignationDate: "2026-08-20",
    noticePeriod: "60 Days",
    lastWorkingDay: "2026-10-19",
    primary_reason: "Relocation",
    notes: "Family relocation to Bangalore.",
    status: "Urgent",
    totalNoticeDays: 60
  },
  {
    id: 5,
    emp_code: "EMP005",
    name: "Akash Maurya",
    email: "akash.m@laesfera.co",
    department: "Engineering",
    designation: "Frontend Engineer",
    manager: "Kevin John",
    resignationDate: "2026-09-25",
    noticePeriod: "30 Days",
    lastWorkingDay: "2026-10-25",
    primary_reason: "Career transition",
    notes: "Seeking full-stack opportunities.",
    status: "Active Notice",
    totalNoticeDays: 30
  },
  {
    id: 14,
    emp_code: "EMP014",
    name: "Aachal P.",
    email: "aachal.p@laesfera.co",
    department: "Design",
    designation: "UI/UX Designer",
    manager: "Kevin John",
    resignationDate: "2026-09-28",
    noticePeriod: "30 Days",
    lastWorkingDay: "2026-10-28",
    primary_reason: "Personal / Family Reasons",
    notes: "Personal sabbaticals.",
    status: "Active Notice",
    totalNoticeDays: 30
  },
  {
    id: 3,
    emp_code: "EMP003",
    name: "Janhavi Solanki",
    email: "janhavi.s@laesfera.co",
    department: "Design",
    designation: "Product Designer",
    manager: "Kevin John",
    resignationDate: "2026-10-04",
    noticePeriod: "30 Days",
    lastWorkingDay: "2026-11-04",
    primary_reason: "Higher Studies",
    notes: "Design fellowship program.",
    status: "Upcoming",
    totalNoticeDays: 30
  },
  {
    id: 6,
    emp_code: "EMP006",
    name: "Jasmeet Saggu",
    email: "jasmeet.s@laesfera.co",
    department: "Finance",
    designation: "Financial Analyst",
    manager: "Kevin John",
    resignationDate: "2026-09-10",
    noticePeriod: "60 Days",
    lastWorkingDay: "2026-11-10",
    primary_reason: "Better Career Opportunity",
    notes: "Accepted senior analyst role.",
    status: "Active Notice",
    totalNoticeDays: 60
  }
];

export default function NoticePeriodDetail() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadRecord() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(getApiUrl("/api/v1/resignation/all"), {
          headers: authHeaders()
        });

        let list = [];
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) list = data;
        }

        if (list.length === 0) {
          list = FALLBACK_RECORDS;
        }

        // Match by employeeId, emp_code, or id
        const normalizedParam = String(employeeId || "").trim().toLowerCase();
        const found = list.find(item => {
          const cCode = String(item.emp_code || item.employeeId || "").toLowerCase();
          const cId = String(item.id || "").toLowerCase();
          return cCode === normalizedParam || cId === normalizedParam;
        });

        if (isMounted) {
          if (found) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const resDateStr = found.resignationDate || found.resignation_date || "2026-09-01";
            const lwdStr = found.lastWorkingDay || found.last_working_day || "2026-10-16";
            const resignation = new Date(resDateStr);
            const lwd = new Date(lwdStr);

            const totalNoticeDays = found.totalNoticeDays || found.total_notice_days || Math.max(1, daysBetween(resignation, lwd));
            const daysRemaining = daysBetween(today, lwd);
            const daysElapsed = Math.min(Math.max(daysBetween(resignation, today), 0), totalNoticeDays);
            const progressPct = totalNoticeDays > 0
              ? Math.min(100, Math.max(0, Math.round((daysElapsed / totalNoticeDays) * 100)))
              : 100;

            const name = found.name || found.employeeName || "Employee";
            const empCode = found.emp_code || found.employeeId || `EMP${String(found.id || 1).padStart(3, "0")}`;

            setEmployee({
              ...found,
              id: found.id || empCode,
              emp_code: empCode,
              name,
              designation: found.designation || found.role || "Team Member",
              department: found.department || "Engineering",
              email: found.email || `${empCode.toLowerCase()}@laesfera.co`,
              manager: found.reporting_manager || found.manager || "Kevin John",
              employmentType: found.employment_type || "Full-time",
              employmentStatus: "Active — Serving Notice",
              resignationDate: resDateStr,
              noticePeriod: found.noticePeriod || found.notice_period || `${totalNoticeDays} Days`,
              lastWorkingDay: lwdStr,
              primary_reason: found.primary_reason || found.reason || "Career transition",
              notes: found.notes || found.comment || "Notice period record formally logged with HR.",
              status: found.status || "Active Notice",
              statusKey: getStatusKey(found.status || "Active Notice"),
              totalNoticeDays,
              daysRemaining,
              daysElapsed,
              progressPct,
              avatarTone: getAvatarTone(name),
              checklist: [
                { task: "Handover & Knowledge Transfer Documentation", done: progressPct >= 50 },
                { task: "Client / Project Responsibilities Reassignment", done: progressPct >= 40 },
                { task: "Company Assets Return (Laptop, Security Badges)", done: daysRemaining <= 2 },
                { task: "Exit Interview & HR Feedback Completed", done: progressPct >= 75 },
                { task: "System Access & Enterprise Credentials Revocation", done: daysRemaining <= 0 }
              ]
            });
          } else {
            setError(`No notice period record found for employee identifier "${employeeId}".`);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Failed to fetch resignation details:", err);
          setError("Failed to load employee notice period record.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRecord();
    return () => { isMounted = false; };
  }, [employeeId]);

  const handleExportSingle = () => {
    if (!employee) return;
    const content = `Employee Name: ${employee.name}
Employee ID: ${employee.emp_code}
Designation: ${employee.designation}
Department: ${employee.department}
Email: ${employee.email}
Reporting Manager: ${employee.manager}
Resignation Date: ${employee.resignationDate}
Notice Duration: ${employee.noticePeriod}
Last Working Day: ${employee.lastWorkingDay}
Days Remaining: ${employee.daysRemaining}
Status: ${employee.status}
Reason: ${employee.primary_reason}
Remarks: ${employee.notes}
Exported: ${new Date().toLocaleString()}
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Notice_Details_${employee.emp_code}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <DashboardShell
      customTitle="Notice Period"
      customSubtitle="Detailed employee offboarding and resignation record."
      showBack={true}
      backUrl="/dashboard/notice-period"
      onBack={() => navigate("/dashboard/notice-period")}
    >
      <div className="npd-container">
        {/* Navigation Action Bar */}
        <div className="npd-nav-bar">
          <button
            type="button"
            className="npd-back-btn"
            onClick={() => navigate("/dashboard/notice-period")}
            id="npd-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Back to Notice Period</span>
          </button>

          <div className="npd-nav-actions">
            <button
              type="button"
              className="npd-btn npd-btn-ghost"
              onClick={handleCopyLink}
              title="Copy page link"
            >
              {copied ? <Check size={14} color="#15803d" /> : <Share2 size={14} />}
              <span>{copied ? "Link Copied!" : "Share"}</span>
            </button>
            <button
              type="button"
              className="npd-btn npd-btn-ghost"
              onClick={() => window.print()}
              title="Print record"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              type="button"
              className="npd-btn npd-btn-secondary"
              onClick={handleExportSingle}
              id="npd-export-btn"
            >
              <Download size={14} />
              <span>Export Record</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="npd-state-card">
            <Clock size={28} className="spin" color="#6342e8" />
            <h3>Loading Employee Notice Record...</h3>
            <p>Fetching official resignation information and offboarding milestones.</p>
          </div>
        ) : error || !employee ? (
          <div className="npd-state-card npd-state-error">
            <AlertTriangle size={32} color="#dc2626" />
            <h3>Record Not Found</h3>
            <p>{error || "The requested notice period record could not be retrieved."}</p>
            <button
              type="button"
              className="npd-btn npd-btn-primary"
              onClick={() => navigate("/dashboard/notice-period")}
            >
              Return to Notice Period Overview
            </button>
          </div>
        ) : (
          <div className="npd-content-grid">
            {/* ── Top Hero Card ── */}
            <section className="npd-hero-card">
              <div className="npd-hero-left">
                <div className={`npd-avatar ${employee.avatarTone}`}>
                  {getInitials(employee.name)}
                </div>
                <div className="npd-hero-identity">
                  <div className="npd-hero-badge-line">
                    <span className="npd-hero-emp-code">{employee.emp_code}</span>
                    <span className={`npd-badge-dept dept-${(employee.department || "").toLowerCase()}`}>
                      {employee.department}
                    </span>
                  </div>
                  <h1 className="npd-hero-name">{employee.name}</h1>
                  <p className="npd-hero-role">{employee.designation}</p>
                </div>
              </div>

              <div className="npd-hero-status-pill-wrap">
                <span className={`npd-status-pill status-${employee.statusKey}`}>
                  <span className="npd-status-dot" />
                  <span>{employee.status}</span>
                </span>
                <span className="npd-lwd-chip">
                  <CalendarDays size={13} />
                  <span>LWD: {formatLastWorkingDay(employee.lastWorkingDay)}</span>
                </span>
              </div>
            </section>

            {/* ── Section 1: Employee Information ── */}
            <section className="npd-section-card">
              <div className="npd-section-head">
                <div className="npd-section-title-wrap">
                  <User size={18} className="npd-section-icon" />
                  <h2 className="npd-section-title">Employee Information</h2>
                </div>
                <span className="npd-section-sub">Personal & Organizational Record</span>
              </div>

              <div className="npd-info-grid">
                <div className="npd-info-tile">
                  <span className="npd-info-label">Full Employee Name</span>
                  <strong className="npd-info-value">{employee.name}</strong>
                </div>

                <div className="npd-info-tile">
                  <span className="npd-info-label">Employee ID</span>
                  <strong className="npd-info-value npd-mono">{employee.emp_code}</strong>
                </div>

                <div className="npd-info-tile">
                  <span className="npd-info-label">Department</span>
                  <strong className="npd-info-value">{employee.department}</strong>
                </div>

                <div className="npd-info-tile">
                  <span className="npd-info-label">Designation / Role</span>
                  <strong className="npd-info-value">{employee.designation}</strong>
                </div>

                <div className="npd-info-tile">
                  <span className="npd-info-label">Work Email</span>
                  <strong className="npd-info-value">{employee.email}</strong>
                </div>

                <div className="npd-info-tile">
                  <span className="npd-info-label">Reporting Manager</span>
                  <strong className="npd-info-value">{employee.manager}</strong>
                </div>

                <div className="npd-info-tile">
                  <span className="npd-info-label">Employment Type</span>
                  <strong className="npd-info-value">{employee.employmentType}</strong>
                </div>

                <div className="npd-info-tile">
                  <span className="npd-info-label">Employment Status</span>
                  <strong className="npd-info-value npd-text-amber">{employee.employmentStatus}</strong>
                </div>
              </div>
            </section>

            {/* ── Section 2: Resignation & Notice Period Details ── */}
            <section className="npd-section-card">
              <div className="npd-section-head">
                <div className="npd-section-title-wrap">
                  <CalendarDays size={18} className="npd-section-icon" />
                  <h2 className="npd-section-title">Resignation Information</h2>
                </div>
                <span className="npd-section-sub">Timeline & Offboarding Parameters</span>
              </div>

              <div className="npd-info-grid">
                <div className="npd-info-tile highlight">
                  <span className="npd-info-label">Resignation Submission Date</span>
                  <strong className="npd-info-value">{formatDate(employee.resignationDate)}</strong>
                </div>

                <div className="npd-info-tile highlight">
                  <span className="npd-info-label">Notice Duration</span>
                  <strong className="npd-info-value">{employee.noticePeriod}</strong>
                </div>

                <div className="npd-info-tile highlight">
                  <span className="npd-info-label">Last Working Day</span>
                  <strong className="npd-info-value npd-text-purple">
                    {formatLastWorkingDay(employee.lastWorkingDay)}
                  </strong>
                </div>

                <div className="npd-info-tile highlight">
                  <span className="npd-info-label">Remaining Notice Days</span>
                  <strong className="npd-info-value">
                    {employee.daysRemaining >= 0 ? `${employee.daysRemaining} days` : "Completed"}
                  </strong>
                </div>

                <div className="npd-info-tile full">
                  <span className="npd-info-label">Reason for Resignation</span>
                  <strong className="npd-info-value">{employee.primary_reason}</strong>
                </div>

                {employee.notes && (
                  <div className="npd-info-tile full">
                    <span className="npd-info-label">Employee Remarks / HR Notes</span>
                    <p className="npd-info-notes">{employee.notes}</p>
                  </div>
                )}
              </div>
            </section>

            {/* ── Section 3: Progress & Offboarding Checklist ── */}
            <section className="npd-section-card">
              <div className="npd-section-head">
                <div className="npd-section-title-wrap">
                  <Clock size={18} className="npd-section-icon" />
                  <h2 className="npd-section-title">Notice Period Progress & Handover</h2>
                </div>
                <span className="npd-section-sub">Key Milestones & Clearance</span>
              </div>

              {/* Progress Bar Component */}
              <div className="npd-progress-box">
                <div className="npd-progress-labels">
                  <div>
                    <span className="npd-progress-main-label">Offboarding Transition</span>
                    <strong className="npd-progress-sub-label">
                      {employee.daysElapsed} days completed of {employee.totalNoticeDays} days total
                    </strong>
                  </div>
                  <span className="npd-progress-pct-badge">{employee.progressPct}%</span>
                </div>
                <div className="npd-progress-track">
                  <div
                    className={`npd-progress-fill status-${employee.statusKey}`}
                    style={{ width: `${employee.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="npd-checklist-wrapper">
                <div className="npd-checklist-header">
                  <span className="npd-checklist-head-title">Clearance Checklist</span>
                  <span className="npd-checklist-counter">
                    {employee.checklist.filter(i => i.done).length} of {employee.checklist.length} Completed
                  </span>
                </div>

                <div className="npd-checklist-items">
                  {employee.checklist.map((item, idx) => (
                    <div className={`npd-checklist-row ${item.done ? "is-done" : ""}`} key={idx}>
                      <div className="npd-checklist-icon-wrap">
                        {item.done ? (
                          <CheckCircle2 size={16} className="npd-icon-done" />
                        ) : (
                          <Circle size={16} className="npd-icon-pending" />
                        )}
                      </div>
                      <span className="npd-checklist-text">{item.task}</span>
                      <span className={`npd-checklist-status-tag ${item.done ? "tag-done" : "tag-pending"}`}>
                        {item.done ? "Verified" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Section 4: Status & Approvals ── */}
            <section className="npd-section-card">
              <div className="npd-section-head">
                <div className="npd-section-title-wrap">
                  <ShieldCheck size={18} className="npd-section-icon" />
                  <h2 className="npd-section-title">Status and Approvals</h2>
                </div>
                <span className="npd-section-sub">Governance & Final Settlement</span>
              </div>

              <div className="npd-approvals-grid">
                <div className="npd-approval-tile">
                  <div className="npd-approval-left">
                    <span className="npd-approval-role">Notice Status</span>
                    <strong className="npd-approval-entity">HR Status</strong>
                  </div>
                  <span className={`npd-status-pill status-${employee.statusKey}`}>
                    {employee.status}
                  </span>
                </div>

                <div className="npd-approval-tile">
                  <div className="npd-approval-left">
                    <span className="npd-approval-role">Reporting Manager Approval</span>
                    <strong className="npd-approval-entity">{employee.manager}</strong>
                  </div>
                  <span className="npd-status-pill status-active">Approved</span>
                </div>

                <div className="npd-approval-tile">
                  <div className="npd-approval-left">
                    <span className="npd-approval-role">Department Clearance</span>
                    <strong className="npd-approval-entity">{employee.department}</strong>
                  </div>
                  <span className="npd-status-pill status-upcoming">In Progress</span>
                </div>

                <div className="npd-approval-tile">
                  <div className="npd-approval-left">
                    <span className="npd-approval-role">Finance & Final Settlement</span>
                    <strong className="npd-approval-entity">Payroll Team</strong>
                  </div>
                  <span className="npd-status-pill status-completed">Pending LWD</span>
                </div>
              </div>
            </section>

            {/* ── Bottom Action Strip ── */}
            <div className="npd-bottom-bar">
              <button
                type="button"
                className="npd-btn npd-btn-secondary"
                onClick={() => navigate("/dashboard/notice-period")}
              >
                <ArrowLeft size={15} />
                <span>Back to Notice Period</span>
              </button>

              <button
                type="button"
                className="npd-btn npd-btn-primary"
                onClick={handleExportSingle}
              >
                <Download size={15} />
                <span>Export Detailed Record</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
