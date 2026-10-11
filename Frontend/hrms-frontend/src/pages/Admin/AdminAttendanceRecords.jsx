import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Search,
  Download,
  Filter,
  RotateCcw,
  ChevronRight,
  Upload,
  MapPin,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { DashboardShellContext } from "../../components/header/DashboardHeader";
import { getApiBaseUrl, getApiUrl } from "../../services/apiClient";

const getToken = () => localStorage.getItem("token") || "";

const getTodayLocalStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AdminAttendanceRecords() {
  const navigate = useNavigate();
  const isInsideShell = useContext(DashboardShellContext);

  // Filters
  const [dateStr, setDateStr] = useState(getTodayLocalStr());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [managerFilter, setManagerFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workModeFilter, setWorkModeFilter] = useState("all");
  const [clientSiteFilter, setClientSiteFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [clientSitesList, setClientSitesList] = useState([]);

  // Excel Upload state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch dropdown lists
  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    const headers = { Authorization: `Bearer ${getToken()}` };

    fetch(`${baseUrl}/api/v1/admin/users`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.users) {
          setEmployeesList(data.users);
          const depts = Array.from(new Set(data.users.map((u) => u.department).filter(Boolean)));
          setDepartmentsList(depts);
        }
      })
      .catch(() => {});

    fetch(`${baseUrl}/api/v1/admin/managers`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.managers) setManagersList(data.managers);
      })
      .catch(() => {});
  }, []);

  // Fetch records
  const fetchRecords = () => {
    setLoading(true);
    const q = [];
    if (dateStr) q.push(`date_str=${dateStr}`);
    if (selectedMonth) q.push(`month=${selectedMonth}`);
    if (selectedYear) q.push(`year=${selectedYear}`);
    if (managerFilter !== "all") q.push(`manager_id=${encodeURIComponent(managerFilter)}`);
    if (employeeFilter !== "all") q.push(`employee_id=${encodeURIComponent(employeeFilter)}`);
    if (deptFilter !== "all") q.push(`department=${encodeURIComponent(deptFilter)}`);
    if (statusFilter !== "all") q.push(`status_filter=${encodeURIComponent(statusFilter)}`);
    if (workModeFilter !== "all") q.push(`work_mode=${encodeURIComponent(workModeFilter)}`);
    if (clientSiteFilter !== "all") q.push(`client_site=${encodeURIComponent(clientSiteFilter)}`);
    if (searchQuery.trim()) q.push(`search=${encodeURIComponent(searchQuery.trim())}`);

    const url = `${getApiBaseUrl()}/api/v1/admin/attendance/all-records?${q.join("&")}`;
    fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.records) {
          const seen = new Set();
          const clean = data.records.filter((r) => {
            const key = (r.emp_code || r.email || r.name).trim().toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setRecords(clean);
        }
        // Populate client sites from API response
        if (data && data.client_sites && data.client_sites.length > 0) {
          setClientSitesList(data.client_sites);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
  }, [dateStr, selectedMonth, selectedYear, managerFilter, employeeFilter, deptFilter, statusFilter, workModeFilter, clientSiteFilter, searchQuery]);

  const handleClearFilters = () => {
    setDateStr(getTodayLocalStr());
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setManagerFilter("all");
    setEmployeeFilter("all");
    setDeptFilter("all");
    setStatusFilter("all");
    setWorkModeFilter("all");
    setClientSiteFilter("all");
    setSearchQuery("");
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!records.length) return;
    const headers = ["Date", "Employee", "Code", "Manager", "Dept", "Work Mode", "Client Site", "Punch In", "Punch Out", "Hours", "Location", "Status", "Leave"];
    const csvRows = [headers.join(",")];
    records.forEach((r) => {
      csvRows.push([
        `"${r.date}"`,
        `"${r.name}"`,
        `"${r.emp_code}"`,
        `"${r.manager}"`,
        `"${r.department}"`,
        `"${r.work_mode || r.workMode || "OFFICE"}"`,
        `"${r.client_site || r.clientSite || "—"}"`,
        `"${r.checkIn}"`,
        `"${r.checkOut}"`,
        `"${r.workingHours}"`,
        `"${r.location || r.punch_in_location || "—"}"`,
        `"${r.status}"`,
        `"${r.leave_status}"`,
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Admin_Attendance_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Upload
  const handleFileSelect = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setUploadFile(f);
      setUploadResult(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/attendance/upload-excel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setUploadResult(data);
      showToast(data.message || "Attendance records imported successfully!", "success");
      fetchRecords();
      window.dispatchEvent(new Event("attendance-updated"));
      setTimeout(() => {
        handleCloseUploadModal();
      }, 1000);
    } catch (err) {
      setUploadResult({ error: err.message });
      showToast(err.message, "error");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadResult(null);
  };

  const getBadgeStyle = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("present")) return { bg: "rgba(34,197,94,0.12)", color: "#16a34a", text: "Present" };
    if (s.includes("half day")) return { bg: "rgba(245,158,11,0.12)", color: "#d97706", text: "Half Day" };
    if (s.includes("leave")) return { bg: "rgba(124,58,237,0.12)", color: "#7c3aed", text: status };
    if (s.includes("missing")) return { bg: "rgba(239,68,68,0.12)", color: "#dc2626", text: "Missing Punch" };
    if (s.includes("week off")) return { bg: "rgba(100,116,139,0.12)", color: "#64748b", text: "Week Off" };
    if (s.includes("absent")) return { bg: "rgba(239,68,68,0.12)", color: "#dc2626", text: "Absent" };
    if (s.includes("punched in")) return { bg: "rgba(59,130,246,0.12)", color: "#2563eb", text: "Punched In" };
    return { bg: "rgba(100,116,139,0.1)", color: "#64748b", text: status || "—" };
  };

  const getWorkModeBadge = (wm) => {
    const m = (wm || "OFFICE").toUpperCase();
    if (m === "WFH") return { bg: "rgba(16,185,129,0.1)", color: "#059669", text: "WFH" };
    if (m === "CLIENT_SITE") return { bg: "rgba(245,158,11,0.1)", color: "#d97706", text: "Client Site" };
    return { bg: "rgba(99,102,241,0.1)", color: "#4f46e5", text: "Office" };
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid var(--border, #e2e8f0)",
    fontSize: "12.5px",
    outline: "none",
    backgroundColor: "var(--surface, #fff)",
    color: "var(--text, #1e293b)"
  };

  const selectStyle = {
    width: "100%",
    padding: "8px 30px 8px 10px",
    borderRadius: "8px",
    border: "1px solid var(--border, #e2e8f0)",
    fontSize: "12.5px",
    outline: "none",
    backgroundColor: "var(--surface, #fff)",
    color: "var(--text, #1e293b)",
    cursor: "pointer",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    backgroundSize: "14px 14px"
  };

  const labelStyle = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-muted, #64748b)",
    marginBottom: "4px"
  };

  return (
    <div className="dash-page-container">
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 9999,
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px 20px", borderRadius: "12px",
          background: toast.type === "error" ? "#fee2e2" : "#dcfce7",
          color: toast.type === "error" ? "#dc2626" : "#16a34a",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)", fontWeight: 600, fontSize: "13px"
        }}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Top Header */}
      {isInsideShell ? (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setUploadModalOpen(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "9px 18px", borderRadius: "9999px",
              background: "rgba(124,58,237,0.1)", color: "#7c3aed",
              border: "1px solid rgba(124,58,237,0.3)", fontSize: "13px",
              fontWeight: 600, cursor: "pointer"
            }}
          >
            <Upload size={16} /> Upload Excel
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "9px 18px", borderRadius: "9999px",
              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              color: "#ffffff", border: "none", fontSize: "13px",
              fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)"
            }}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      ) : (
        <div className="dash-page-header">
          <div className="dash-page-header__left">
            <span className="dash-page-header__eyebrow">Admin Portal</span>
            <h1 className="dash-page-header__title">Attendance Records</h1>
            <p className="dash-page-header__subtitle">
              Search, filter, and export overall company attendance records across managers, departments, work modes, and client sites.
            </p>
          </div>
          <div className="dash-page-header__actions" style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setUploadModalOpen(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "9px 18px", borderRadius: "9999px",
                background: "rgba(124,58,237,0.1)", color: "#7c3aed",
                border: "1px solid rgba(124,58,237,0.3)", fontSize: "13px",
                fontWeight: 600, cursor: "pointer"
              }}
            >
              <Upload size={16} /> Upload Attendance Excel
            </button>
            <button
              onClick={handleExportCSV}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "9px 18px", borderRadius: "9999px",
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                color: "#ffffff", border: "none", fontSize: "13px",
                fontWeight: 600, cursor: "pointer",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)"
              }}
            >
              <Download size={16} /> Export Attendance
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Filter size={16} color="#7c3aed" />
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Filter Attendance Records</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: "12px" }}>
          {/* Date */}
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} style={inputStyle} />
          </div>

          {/* Manager */}
          <div>
            <label style={labelStyle}>Manager</label>
            <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Managers</option>
              {managersList.map((m) => (
                <option key={m.emp_code} value={m.emp_code}>{m.name} ({m.emp_code})</option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label style={labelStyle}>Employee</label>
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Employees</option>
              {employeesList.map((emp) => (
                <option key={emp.emp_code} value={emp.emp_code}>
                  {emp.name || emp.first_name || emp.emp_code} ({emp.emp_code})
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label style={labelStyle}>Department</label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half day">Half Day</option>
              <option value="leave">Leave</option>
              <option value="missing punch">Missing Punch</option>
              <option value="week off">Week Off</option>
            </select>
          </div>

          {/* Work Mode */}
          <div>
            <label style={labelStyle}>Work Mode</label>
            <select value={workModeFilter} onChange={(e) => setWorkModeFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Modes</option>
              <option value="OFFICE">Office</option>
              <option value="WFH">WFH</option>
              <option value="CLIENT_SITE">Client Site</option>
            </select>
          </div>

          {/* Client Site */}
          <div>
            <label style={labelStyle}>Client Site</label>
            <select value={clientSiteFilter} onChange={(e) => setClientSiteFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Sites</option>
              {clientSitesList.map((cs) => (
                <option key={cs.id} value={cs.name}>{cs.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label style={labelStyle}>Search</label>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #64748b)" }} />
              <input
                type="text"
                placeholder="Name, code or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, paddingLeft: "30px" }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleClearFilters}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "6px 14px", borderRadius: "8px",
              border: "1px solid var(--border, #e2e8f0)",
              background: "var(--surface-2, #f8fafc)",
              fontSize: "12px", fontWeight: 600, cursor: "pointer",
              color: "var(--text-muted, #64748b)"
            }}
          >
            <RotateCcw size={14} /> Clear Filters
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Attendance Records Table</h3>
          <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)", fontWeight: 600 }}>Total: {records.length}</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "var(--surface-2, #f8fafc)" }}>
                {["Date", "Employee", "Code", "Manager", "Work Mode", "Client Site", "Punch In", "Punch Out", "Hours", "Location", "Status", "Leave", "Action"].map((h) => (
                  <th key={h} style={{ padding: "11px 13px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: h === "Action" ? "right" : "left", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                      <div style={{ width: "20px", height: "20px", border: "2px solid #e2e8f0", borderTop: "2px solid #7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Loading attendance records...
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                    <MapPin size={32} style={{ display: "block", margin: "0 auto 12px", opacity: 0.4 }} />
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => {
                  const b = getBadgeStyle(r.status);
                  const wm = getWorkModeBadge(r.work_mode || r.workMode);
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                      <td style={{ padding: "13px", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>{r.date}</td>
                      <td style={{ padding: "13px", whiteSpace: "nowrap" }}>
                        <strong style={{ fontSize: "13px" }}>{r.name}</strong>
                      </td>
                      <td style={{ padding: "13px", fontSize: "12px", fontWeight: 600 }}>{r.emp_code}</td>
                      <td style={{ padding: "13px", fontSize: "12px", color: "var(--text-muted, #64748b)", whiteSpace: "nowrap" }}>{r.manager}</td>
                      <td style={{ padding: "13px" }}>
                        <span style={{ padding: "3px 9px", borderRadius: "10px", background: wm.bg, color: wm.color, fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                          {wm.text}
                        </span>
                      </td>
                      <td style={{ padding: "13px", fontSize: "12px", color: "var(--text-muted, #64748b)", whiteSpace: "nowrap", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis" }} title={r.client_site || r.clientSite || "—"}>
                        {r.client_site || r.clientSite || "—"}
                      </td>
                      <td style={{ padding: "13px", textAlign: "left", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>{r.checkIn}</td>
                      <td style={{ padding: "13px", textAlign: "left", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>{r.checkOut}</td>
                      <td style={{ padding: "13px", textAlign: "left", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>{r.workingHours}</td>
                      <td style={{ padding: "13px", fontSize: "12px", color: "var(--text-muted, #64748b)", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.location || r.punch_in_location || "—"}>
                        {r.location || r.punch_in_location || "—"}
                      </td>
                      <td style={{ padding: "13px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: "12px", background: b.bg, color: b.color, fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                          {b.text}
                        </span>
                      </td>
                      <td style={{ padding: "13px", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>{r.leave_status}</td>
                      <td style={{ padding: "13px", textAlign: "right" }}>
                        <button
                          onClick={() => navigate(`/admin/employees/${r.emp_code}/attendance`)}
                          style={{
                            padding: "6px 12px", borderRadius: "7px",
                            background: "rgba(124,58,237,0.1)", color: "#7c3aed",
                            border: "none", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel Upload Modal */}
      {uploadModalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
          onClick={(e) => e.target === e.currentTarget && handleCloseUploadModal()}
        >
          <div style={{
            background: "#fff", borderRadius: "20px", padding: "32px",
            width: "min(520px, 95vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>Upload Attendance Excel</h2>
                <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
                  Import attendance records from .csv, .xlsx, or .xls files.
                </p>
              </div>
              <button onClick={handleCloseUploadModal} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                <X size={22} color="#94a3b8" />
              </button>
            </div>



            {/* File Drop Zone */}
            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: `2px dashed ${uploadFile ? "#7c3aed" : "#e2e8f0"}`,
                borderRadius: "12px",
                padding: "32px",
                textAlign: "center",
                cursor: "pointer",
                background: uploadFile ? "rgba(124,58,237,0.04)" : "#fafafa",
                transition: "all 0.2s",
                marginBottom: "20px"
              }}
            >
              <Upload size={28} color={uploadFile ? "#7c3aed" : "#94a3b8"} style={{ display: "block", margin: "0 auto 10px" }} />
              {uploadFile ? (
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: "#7c3aed", fontSize: "14px" }}>{uploadFile.name}</p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>{(uploadFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: "#475569", fontSize: "14px" }}>Click to select file</p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>Accepts .csv, .xlsx, .xls</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ display: "none" }} />
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div style={{
                padding: "14px 16px", borderRadius: "10px", marginBottom: "18px",
                background: uploadResult.error ? "#fee2e2" : "#dcfce7",
                border: `1px solid ${uploadResult.error ? "#fca5a5" : "#86efac"}`
              }}>
                {uploadResult.error ? (
                  <p style={{ margin: 0, color: "#dc2626", fontWeight: 600, fontSize: "13px" }}>
                    ❌ {uploadResult.error}
                  </p>
                ) : (
                  <div>
                    <p style={{ margin: 0, color: "#16a34a", fontWeight: 700, fontSize: "13.5px" }}>
                      ✅ {uploadResult.message || "Attendance records imported successfully."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={handleCloseUploadModal}
                style={{
                  padding: "10px 20px", borderRadius: "9999px",
                  border: "1px solid #e2e8f0", background: "#f8fafc",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#64748b"
                }}
              >
                {uploadResult && !uploadResult.error ? "Close" : "Cancel"}
              </button>
              {uploadResult && !uploadResult.error ? (
                <button
                  onClick={handleCloseUploadModal}
                  style={{
                    padding: "10px 24px", borderRadius: "9999px",
                    background: "linear-gradient(135deg, #16a34a, #15803d)",
                    color: "#fff", border: "none", fontSize: "13px", fontWeight: 700,
                    cursor: "pointer", boxShadow: "0 4px 12px rgba(22,163,74,0.3)"
                  }}
                >
                  Done
                </button>
              ) : (
                <button
                  onClick={handleUploadSubmit}
                  disabled={!uploadFile || uploadLoading}
                  style={{
                    padding: "10px 24px", borderRadius: "9999px",
                    background: uploadFile && !uploadLoading ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "#e2e8f0",
                    color: uploadFile && !uploadLoading ? "#fff" : "#94a3b8",
                    border: "none", fontSize: "13px", fontWeight: 700,
                    cursor: uploadFile && !uploadLoading ? "pointer" : "not-allowed",
                    boxShadow: uploadFile && !uploadLoading ? "0 4px 12px rgba(124,58,237,0.3)" : "none"
                  }}
                >
                  {uploadLoading ? "Importing..." : "Import Records"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS animation for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
