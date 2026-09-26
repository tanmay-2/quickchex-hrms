import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  FileSpreadsheet,
  Download,
  Eye,
  RefreshCw,
  X,
  Clock,
  MapPin,
  Camera,
  AlertCircle,
  CheckCircle2,
  User,
  ShieldAlert,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardShell } from "../../components/header/DashboardHeader";
import "./AttendanceLogs.css";

/* ─── Months generator (Past 12 months) ─── */
function generateMonthsList() {
  const list = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = d.toLocaleString("en-US", { month: "long" });
    list.push(`${mName}-${d.getFullYear()}`);
  }
  return list;
}

const MONTH_OPTIONS = generateMonthsList();
const PAGE_SIZE = 10;
const API_BASE = (import.meta.env?.VITE_API_URL || "https://quickchex-backend.onrender.com").replace(/\/$/, "");

export default function AttendanceLogs() {
  const [month, setMonth] = useState(MONTH_OPTIONS[0]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSelfieRow, setSelectedSelfieRow] = useState(null);

  const fetchLogs = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const [monthName, yearStr] = month.split("-");
      const monthIndex =
        [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ].indexOf(monthName) + 1;
      const yr = Number(yearStr) || new Date().getFullYear();

      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(
        `${API_BASE}/api/v1/attendance/admin/logs?month=${monthIndex}&year=${yr}`,
        { headers }
      );

      if (!res.ok) {
        throw new Error(`Failed to load logs: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setAllRows(data);
        if (showToast) {
          toast.success(`Refreshed ${data.length} logs for ${month}`);
        }
      } else {
        setAllRows([]);
      }
    } catch (err) {
      console.error("Error loading attendance logs:", err);
      setAllRows([]);
      toast.error("Could not fetch attendance logs. Check server connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    setPage(1);
  }, [month]);

  /* ── Filtered & Search ── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((r) => {
      // Type Filter
      if (typeFilter !== "all" && r.captureType.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      // Status Filter
      if (statusFilter !== "all" && (r.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Text Search
      if (!q) return true;
      return (
        (r.name || "").toLowerCase().includes(q) ||
        (r.code || "").toLowerCase().includes(q) ||
        (r.location || "").toLowerCase().includes(q) ||
        (r.captureType || "").toLowerCase().includes(q) ||
        (r.date || "").toLowerCase().includes(q)
      );
    });
  }, [allRows, query, typeFilter, statusFilter]);

  /* ── KPI Stats ── */
  const stats = useMemo(() => {
    const total = allRows.length;
    const checkIns = allRows.filter((r) => r.captureType === "Check In").length;
    const checkOuts = allRows.filter((r) => r.captureType === "Check Out").length;
    const late = allRows.filter(
      (r) => (r.status || "").toLowerCase() === "late" || (r.remark || "").toLowerCase().includes("late")
    ).length;
    const rejected = allRows.filter((r) => (r.status || "").toLowerCase() === "rejected").length;
    return { total, checkIns, checkOuts, late, rejected };
  }, [allRows]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageItems = useMemo(() => {
    const t = totalPages;
    if (t <= 10) return Array.from({ length: t }, (_, i) => i + 1);
    const head = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    if (safePage > 9 && safePage < t - 1) {
      return [...head, "…", safePage, "…", t - 1, t];
    }
    return [...head, "…", t - 1, t];
  }, [totalPages, safePage]);

  /* ── Reject Log Action ── */
  const handleReject = async (row) => {
    if (!row.rawId) {
      toast.error("Unable to reject log: missing database ID.");
      return;
    }

    try {
      const [monthName, yearStr] = month.split("-");
      const monthIndex =
        [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ].indexOf(monthName) + 1;
      const yr = Number(yearStr) || new Date().getFullYear();

      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(
        `${API_BASE}/api/v1/attendance/admin/logs/${row.rawId}/reject?month=${monthIndex}&year=${yr}`,
        { method: "POST", headers }
      );

      if (!res.ok) {
        throw new Error("Failed to reject punch log on server");
      }

      // Update state locally
      setAllRows((prev) =>
        prev.map((r) => (r.rawId === row.rawId ? { ...r, status: "Rejected", remark: "Rejected by Admin" } : r))
      );
      toast.success(`Punch log #${row.rawId} for ${row.name} rejected`);
    } catch (err) {
      console.error("Reject punch error:", err);
      toast.error("Failed to reject punch log. Check backend logs.");
    }
  };

  /* ── Export CSV ── */
  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No log entries available to export.");
      return;
    }

    const header = "Employee Name,Employee Code,Date,Time,Created At,Capture Type,Location,Status,Remarks\n";
    const body = filtered
      .map((r) =>
        [
          `"${r.name}"`,
          `"${r.code}"`,
          `"${r.date}"`,
          `"${r.time}"`,
          `"${r.createdAt}"`,
          `"${r.captureType}"`,
          `"${(r.location || "").replace(/"/g, '""')}"`,
          `"${r.status || "Present"}"`,
          `"${(r.remark || "").replace(/"/g, '""')}"`,
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-logs-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} log rows successfully`);
  };

  /* ── Selfie Download ── */
  const handleDownloadSelfie = (row) => {
    if (row.selfie && (row.selfie.startsWith("http") || row.selfie.startsWith("data:"))) {
      const a = document.createElement("a");
      a.href = row.selfie;
      a.download = `selfie-${row.code}-${row.date}.jpg`;
      a.click();
      toast.success(`Downloaded selfie for ${row.name}`);
    } else {
      toast("No image capture stored on device for this punch.", { icon: "📷" });
    }
  };

  const goto = (p) => {
    if (p < 1 || p > totalPages || p === safePage) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <DashboardShell
      customTitle="Attendance Logs"
      customSubtitle="Raw check-in and check-out punch logs captured across all devices"
    >
      <div className="attendance-logs-page">
        <Toaster position="top-right" />

        {/* ── KPI Summary Cards ── */}
        <div className="al-stats-grid">
          <div className="al-stat-card">
            <div className="al-stat-icon-wrap al-stat-purple">
              <Clock size={20} />
            </div>
            <div className="al-stat-info">
              <span className="al-stat-val">{stats.total}</span>
              <span className="al-stat-lbl">Total Logs</span>
            </div>
          </div>

          <div className="al-stat-card">
            <div className="al-stat-icon-wrap al-stat-green">
              <CheckCircle2 size={20} />
            </div>
            <div className="al-stat-info">
              <span className="al-stat-val">{stats.checkIns}</span>
              <span className="al-stat-lbl">Check Ins</span>
            </div>
          </div>

          <div className="al-stat-card">
            <div className="al-stat-icon-wrap al-stat-blue">
              <Clock size={20} />
            </div>
            <div className="al-stat-info">
              <span className="al-stat-val">{stats.checkOuts}</span>
              <span className="al-stat-lbl">Check Outs</span>
            </div>
          </div>

          <div className="al-stat-card">
            <div className="al-stat-icon-wrap al-stat-amber">
              <AlertCircle size={20} />
            </div>
            <div className="al-stat-info">
              <span className="al-stat-val">{stats.late}</span>
              <span className="al-stat-lbl">Late Punches</span>
            </div>
          </div>

          <div className="al-stat-card">
            <div className="al-stat-icon-wrap al-stat-red">
              <ShieldAlert size={20} />
            </div>
            <div className="al-stat-info">
              <span className="al-stat-val">{stats.rejected}</span>
              <span className="al-stat-lbl">Rejected</span>
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="al-toolbar">
          <div className="al-toolbar-controls">
            <div className="al-search-wrap">
              <Search size={16} className="al-search-icon" />
              <input
                type="text"
                className="al-search-input"
                placeholder="Search employee / code / location"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className="al-month-select"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              title="Filter by Punch Type"
            >
              <option value="all">All Types</option>
              <option value="Check In">Check In</option>
              <option value="Check Out">Check Out</option>
            </select>

            <select
              className="al-month-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              title="Filter by Status"
            >
              <option value="all">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              className="al-month-select"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="al-btn-secondary"
              onClick={() => fetchLogs(true)}
              disabled={refreshing || loading}
              title="Refresh Logs"
            >
              <RefreshCw size={15} className={refreshing ? "al-spin" : ""} />
              Refresh
            </button>

            <button type="button" className="al-export-btn" onClick={handleExport}>
              <FileSpreadsheet size={16} />
              Export
            </button>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="al-table-card">
          <div className="al-table-scroll">
            <table className="al-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Employee Code</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Created At</th>
                  <th>Capture Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Selfie</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="al-empty">
                      <div className="al-empty-icon">
                        <RefreshCw size={24} className="al-spin" />
                      </div>
                      <div>Loading attendance punch logs...</div>
                    </td>
                  </tr>
                ) : pageRows.length > 0 ? (
                  pageRows.map((row) => {
                    const isRejected = (row.status || "").toLowerCase() === "rejected";
                    const isLate = (row.status || "").toLowerCase() === "late";
                    const isCheckIn = row.captureType === "Check In";

                    return (
                      <tr key={row.id} className={isRejected ? "al-row-rejected" : ""}>
                        <td>
                          <div className="al-emp-cell">
                            <span className={`al-avatar ${row.avatarClass}`}>{row.initials}</span>
                            <span className="al-emp-name" title={row.name}>
                              {row.name}
                            </span>
                          </div>
                        </td>
                        <td className="al-code">{row.code}</td>
                        <td className="al-date">{row.date}</td>
                        <td className="al-time">
                          <strong>{row.time}</strong>
                        </td>
                        <td className="al-created">{row.createdAt}</td>
                        <td className="al-capture">
                          <span
                            className={`al-pill ${
                              isCheckIn ? "al-pill-in" : row.captureType === "Check Out" ? "al-pill-out" : "al-pill-auto"
                            }`}
                          >
                            {row.captureType}
                          </span>
                        </td>
                        <td className="al-location" title={row.location}>
                          <MapPin size={13} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
                          {row.location}
                        </td>
                        <td>
                          <span
                            className={`al-pill ${
                              isRejected
                                ? "al-status-rejected"
                                : isLate
                                ? "al-status-late"
                                : "al-status-present"
                            }`}
                          >
                            {row.status || "Present"}
                          </span>
                        </td>
                        <td>
                          <div className="al-icon-actions">
                            <button
                              type="button"
                              title="Download selfie"
                              onClick={() => handleDownloadSelfie(row)}
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              title="View selfie & details"
                              onClick={() => setSelectedSelfieRow(row)}
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                        <td>
                          {isRejected ? (
                            <span className="al-rejected-tag">Rejected</span>
                          ) : (
                            <button
                              type="button"
                              className="al-reject-btn"
                              onClick={() => handleReject(row)}
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="al-empty">
                      <div className="al-empty-icon">
                        <Clock size={28} />
                      </div>
                      <div style={{ fontWeight: 600, color: "var(--al-ink)" }}>
                        No punch logs found for {month}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        {query
                          ? "Try adjusting your search query or filters"
                          : "Punch events recorded via mobile app or web portal will appear here automatically."}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {filtered.length > 0 && (
            <div className="al-pagination">
              <span
                style={{
                  marginRight: "auto",
                  fontSize: 12.5,
                  color: "var(--al-ink-muted)",
                }}
              >
                Showing {(safePage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} logs
              </span>
              <button
                type="button"
                className="al-page-nav"
                disabled={safePage === 1}
                onClick={() => goto(safePage - 1)}
              >
                &#8592; Previous
              </button>
              {pageItems.map((item, idx) =>
                typeof item === "number" ? (
                  <button
                    key={`${item}-${idx}`}
                    type="button"
                    className={`al-page-num${item === safePage ? " is-active" : ""}`}
                    onClick={() => goto(item)}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={`gap-${idx}`} className="al-page-gap">
                    &#8230;
                  </span>
                )
              )}
              <button
                type="button"
                className="al-page-nav"
                disabled={safePage === totalPages}
                onClick={() => goto(safePage + 1)}
              >
                Next &#8594;
              </button>
            </div>
          )}
        </div>

        {/* ── Selfie & Details Modal ── */}
        {selectedSelfieRow && (
          <div
            className="al-modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedSelfieRow(null);
            }}
          >
            <div className="al-modal-card">
              <div className="al-modal-header">
                <h3>Punch Verification Details</h3>
                <button
                  type="button"
                  className="al-modal-close"
                  onClick={() => setSelectedSelfieRow(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="al-modal-body">
                <div className="al-modal-preview">
                  {selectedSelfieRow.selfie &&
                  (selectedSelfieRow.selfie.startsWith("http") || selectedSelfieRow.selfie.startsWith("data:")) ? (
                    <img src={selectedSelfieRow.selfie} alt="Punch Selfie" />
                  ) : (
                    <div className="al-modal-placeholder">
                      <Camera size={36} />
                      <p style={{ margin: 0, fontWeight: 500 }}>Device Camera Verified</p>
                      <span style={{ fontSize: 11.5, opacity: 0.8 }}>Punch captured via verified Web portal</span>
                    </div>
                  )}
                </div>

                <div className="al-modal-meta">
                  <div className="al-modal-row">
                    <span className="al-modal-label">Employee:</span>
                    <span className="al-modal-val">
                      {selectedSelfieRow.name} ({selectedSelfieRow.code})
                    </span>
                  </div>
                  <div className="al-modal-row">
                    <span className="al-modal-label">Punch Type:</span>
                    <span className="al-modal-val">{selectedSelfieRow.captureType}</span>
                  </div>
                  <div className="al-modal-row">
                    <span className="al-modal-label">Time & Date:</span>
                    <span className="al-modal-val">
                      {selectedSelfieRow.time} | {selectedSelfieRow.date}
                    </span>
                  </div>
                  <div className="al-modal-row">
                    <span className="al-modal-label">Location:</span>
                    <span className="al-modal-val" style={{ textAlign: "right", maxWidth: 220 }}>
                      {selectedSelfieRow.location}
                    </span>
                  </div>
                  <div className="al-modal-row">
                    <span className="al-modal-label">Status / Remark:</span>
                    <span className="al-modal-val">
                      {selectedSelfieRow.status || "Present"}
                      {selectedSelfieRow.remark ? ` (${selectedSelfieRow.remark})` : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="al-modal-footer">
                {selectedSelfieRow.selfie && (
                  <button
                    type="button"
                    className="al-btn-secondary"
                    onClick={() => handleDownloadSelfie(selectedSelfieRow)}
                  >
                    <Download size={14} /> Download Image
                  </button>
                )}
                <button
                  type="button"
                  className="al-export-btn"
                  onClick={() => setSelectedSelfieRow(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
