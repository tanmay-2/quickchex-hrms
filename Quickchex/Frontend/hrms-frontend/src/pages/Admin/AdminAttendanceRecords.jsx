import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Search,
  Download,
  Filter,
  RotateCcw,
  ChevronRight,
  User,
  Briefcase
} from "lucide-react";

const getApiBaseUrl = () => {
  const envUrl = import.meta.env?.VITE_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    let host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return `http://${host}:8000`;
  }
  return "https://quickchex-backend.onrender.com";
};

const getTodayLocalStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AdminAttendanceRecords() {
  const navigate = useNavigate();

  const [dateStr, setDateStr] = useState(getTodayLocalStr());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [managerFilter, setManagerFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  // Fetch managers & employees dropdown choices
  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.users) {
          setEmployeesList(data.users);
          const depts = Array.from(new Set(data.users.map((u) => u.department).filter(Boolean)));
          setDepartmentsList(depts);
        }
      })
      .catch((err) => console.warn("Error fetching users list:", err));

    fetch(`${baseUrl}/api/v1/admin/managers`, {
      headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.managers) {
          setManagersList(data.managers);
        }
      })
      .catch((err) => console.warn("Error fetching managers list:", err));
  }, []);

  // Fetch records with query params
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
    if (searchQuery.trim()) q.push(`search=${encodeURIComponent(searchQuery.trim())}`);

    const url = `${getApiBaseUrl()}/api/v1/admin/attendance/all-records?${q.join("&")}`;
    fetch(url, {
      headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.records) {
          setRecords(data.records);
        }
      })
      .catch((err) => console.warn("Error fetching attendance records:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
  }, [dateStr, selectedMonth, selectedYear, managerFilter, employeeFilter, deptFilter, statusFilter, searchQuery]);

  const handleClearFilters = () => {
    setDateStr(new Date().toISOString().split("T")[0]);
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setManagerFilter("all");
    setEmployeeFilter("all");
    setDeptFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  // CSV Export respecting current active filters
  const handleExportCSV = () => {
    if (!records.length) return;
    const headers = ["Date", "Employee Name", "Employee Code", "Manager", "Department", "Punch In", "Punch Out", "Working Hours", "Location", "Status", "Leave Details"];
    const csvRows = [headers.join(",")];

    records.forEach((r) => {
      csvRows.push([
        `"${r.date}"`,
        `"${r.name}"`,
        `"${r.emp_code}"`,
        `"${r.manager}"`,
        `"${r.department}"`,
        `"${r.checkIn}"`,
        `"${r.checkOut}"`,
        `"${r.workingHours}"`,
        `"${r.location || r.punch_in_location || '—'}"`,
        `"${r.status}"`,
        `"${r.leave_status}"`
      ].join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Admin_Attendance_Records_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeStyle = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("present")) return { bg: "rgba(34,197,94,0.12)", color: "#16a34a", text: "Present" };
    if (s.includes("half day")) return { bg: "rgba(245,158,11,0.12)", color: "#d97706", text: "Half Day" };
    if (s.includes("leave")) return { bg: "rgba(124,58,237,0.12)", color: "#7c3aed", text: status };
    if (s.includes("missing")) return { bg: "rgba(239,68,68,0.12)", color: "#dc2626", text: "Missing Punch" };
    if (s.includes("week off")) return { bg: "rgba(100,116,139,0.12)", color: "#64748b", text: "Week Off" };
    if (s.includes("absent")) return { bg: "rgba(239,68,68,0.12)", color: "#dc2626", text: "Absent" };
    return { bg: "rgba(100,116,139,0.1)", color: "#64748b", text: status || "—" };
  };

  return (
    <div className="dash-page-container">
      {/* Top Header & Export Button */}
      <div className="dash-page-header">
        <div className="dash-page-header__left">
          <span className="dash-page-header__eyebrow">Admin Portal</span>
          <h1 className="dash-page-header__title">Attendance Records</h1>
          <p className="dash-page-header__subtitle">
            Search, filter, and export overall company attendance records across managers, departments, and employees.
          </p>
        </div>

        <div className="dash-page-header__actions">
          <button
            onClick={handleExportCSV}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "9999px",
              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)"
            }}
          >
            <Download size={16} /> Export Attendance
          </button>
        </div>
      </div>

      {/* Multi-Filter Bar Card */}
      <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Filter size={16} color="#7c3aed" />
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Filter Attendance Records</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {/* Date Picker */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>Date</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", fontSize: "12.5px", outline: "none" }}
            />
          </div>

          {/* Manager Filter */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>Manager</label>
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", fontSize: "12.5px", outline: "none", background: "var(--surface, #fff)" }}
            >
              <option value="all">All Managers</option>
              {managersList.map((m) => (
                <option key={m.emp_code} value={m.emp_code}>{m.name} ({m.emp_code})</option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>Employee</label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", fontSize: "12.5px", outline: "none", background: "var(--surface, #fff)" }}
            >
              <option value="all">All Employees</option>
              {employeesList.map((emp) => (
                <option key={emp.emp_code} value={emp.emp_code}>
                  {emp.name || emp.first_name || emp.emp_code} ({emp.emp_code})
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", fontSize: "12.5px", outline: "none", background: "var(--surface, #fff)" }}
            >
              <option value="all">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Attendance Status Filter */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", fontSize: "12.5px", outline: "none", background: "var(--surface, #fff)" }}
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half day">Half Day</option>
              <option value="leave">Leave</option>
              <option value="missing punch">Missing Punch</option>
              <option value="week off">Week Off</option>
            </select>
          </div>

          {/* Search Query Input */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>Search</label>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #64748b)" }} />
              <input
                type="text"
                placeholder="Name, code or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", fontSize: "12.5px", outline: "none" }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleClearFilters}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border, #e2e8f0)",
              background: "var(--surface-2, #f8fafc)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--text-muted, #64748b)"
            }}
          >
            <RotateCcw size={14} /> Clear Filters
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Attendance Records Table</h3>
          <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)", fontWeight: 600 }}>Total Records: {records.length}</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "var(--surface-2, #f8fafc)" }}>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Date</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Employee</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Code</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Manager</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Punch In</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Punch Out</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Working Hours</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Location</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Status</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Leave</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                    Loading attendance records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => {
                  const b = getBadgeStyle(r.status);
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                      <td style={{ padding: "14px", fontSize: "12px", fontWeight: 600 }}>{r.date}</td>
                      <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                        <strong style={{ fontSize: "13px" }}>{r.name}</strong>
                      </td>
                      <td style={{ padding: "14px", fontSize: "12px", fontWeight: 600 }}>{r.emp_code}</td>
                      <td style={{ padding: "14px", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>{r.manager}</td>
                      <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{r.checkIn}</td>
                      <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{r.checkOut}</td>
                      <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{r.workingHours}</td>
                      <td style={{ padding: "14px", fontSize: "12px", color: "var(--text-muted, #64748b)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.location || r.punch_in_location || "—"}>
                        {r.location || r.punch_in_location || "—"}
                      </td>
                      <td style={{ padding: "14px", textAlign: "center" }}>
                        <span style={{ padding: "4px 10px", borderRadius: "12px", background: b.bg, color: b.color, fontWeight: 700, fontSize: "11px" }}>
                          {b.text}
                        </span>
                      </td>
                      <td style={{ padding: "14px", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>{r.leave_status}</td>
                      <td style={{ padding: "14px", textAlign: "right" }}>
                        <button
                          onClick={() => navigate(`/admin/employees/${r.emp_code}/attendance`)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "7px",
                            background: "rgba(124,58,237,0.1)",
                            color: "#7c3aed",
                            border: "none",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          View Attendance
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
    </div>
  );
}
