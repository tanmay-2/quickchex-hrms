import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  Clock,
  FileSpreadsheet,
  Eye,
  Mail,
  Phone,
  Briefcase,
  Plus,
  X,
  Search,
  Check,
  AlertCircle,
  User,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { getApiUrl } from "../../services/apiClient";
import { loadUnifiedEmployees, fetchDepartmentsApi } from "../../utils/employeeStore";
import "./AdminManagerTeamView.css";

const DEFAULT_WORK_LOCATIONS = [
  "Mumbai Office (Headquarters)",
  "Navi Mumbai, IN",
  "Headquarters",
  "Remote / WFH",
  "Client Site",
  "Bengaluru Office",
  "Delhi Branch"
];

const DEFAULT_ROLES = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "teamleader", label: "Team Leader" },
  { value: "admin", label: "Admin" }
];

const EMPLOYMENT_TYPES = [
  "Regular Employee",
  "Full-time",
  "Intern",
  "Contract",
  "Part-time",
  "Probation"
];

export default function AdminManagerTeamView() {
  const { managerId } = useParams();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState(null);
  const [viewMode, setViewMode] = useState("daily"); // "daily" | "monthly"
  const [monthlyGrid, setMonthlyGrid] = useState(null);

  // Success / Error Banner Alerts
  const [pageAlert, setPageAlert] = useState(null);

  // Pagination for Team Roster
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State & Dynamic Options
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [allManagers, setAllManagers] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [formData, setFormData] = useState({
    selectedEmployeeId: "",
    emp_code: "",
    name: "",
    email: "",
    contact: "",
    designation: "",
    department: "",
    employment_type: "Regular Employee",
    location: "Mumbai Office (Headquarters)",
    reporting_manager: managerId || "",
    joining_date: new Date().toISOString().split("T")[0],
    team_assignment: "",
    role: "employee"
  });

  // Attendance Preview State
  const [attendancePreview, setAttendancePreview] = useState({
    emp_code: "Auto-filled",
    punchIn: "Auto-filled",
    punchOut: "Auto-filled",
    workingHours: "Auto-filled",
    attendanceStatus: "Auto-filled",
    leaveStatus: "Auto-filled",
    loading: false
  });

  // 1. Fetch Team Attendance Data
  const fetchTeamData = (dateStr) => {
    setLoading(true);
    fetch(getApiUrl(`/admin/managers/${managerId}/team?date_str=${dateStr}`), {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        "Content-Type": "application/json"
      }
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData && resData.status === "success") {
          setTeamData(resData);
        }
      })
      .catch((err) => console.warn("Failed to fetch manager team:", err))
      .finally(() => setLoading(false));
  };

  const fetchMonthlyGrid = () => {
    const d = new Date(currentDate);
    fetch(getApiUrl(`/admin/managers/${managerId}/monthly-grid?year=${d.getFullYear()}&month=${d.getMonth() + 1}`), {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        "Content-Type": "application/json"
      }
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData && resData.grid) {
          setMonthlyGrid(resData);
        }
      })
      .catch((err) => console.warn("Failed to fetch monthly grid:", err));
  };

  useEffect(() => {
    fetchTeamData(currentDate);
  }, [managerId, currentDate]);

  useEffect(() => {
    if (viewMode === "monthly") {
      fetchMonthlyGrid();
    }
  }, [viewMode, currentDate]);

  // Load unified employees, managers, and departments
  useEffect(() => {
    // 1. Load employees for dropdown
    loadUnifiedEmployees().then((emps) => {
      if (Array.isArray(emps)) {
        setAllEmployees(emps);
      }
    }).catch((err) => console.warn("Failed to load unified employees:", err));

    // 2. Load managers list for reporting manager dropdown
    fetch(getApiUrl("/admin/managers"), {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        "Content-Type": "application/json"
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.managers) {
          setAllManagers(data.managers);
        }
      })
      .catch((err) => console.warn("Failed to load managers:", err));

    // 3. Load departments list
    fetchDepartmentsApi().then((depts) => {
      if (Array.isArray(depts) && depts.length > 0) {
        setDepartmentsList(depts);
      }
    }).catch(() => {});
  }, []);

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    setCurrentDate(new Date().toISOString().split("T")[0]);
  };

  const manager = teamData?.manager || {};
  const summary = teamData?.summary || { total: 0, present: 0, absent: 0, on_leave: 0, half_day: 0, missing_punch: 0 };
  const members = teamData?.members || [];

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(members.length / pageSize));
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return members.slice(start, start + pageSize);
  }, [members, currentPage, pageSize]);

  // Reset page when members list changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const getStatusBadge = (status, code) => {
    const st = String(status || "");
    const cd = String(code || "");
    if (cd === "P" || st === "Present" || st === "Punched In") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(34,197,94,0.12)", color: "#16a34a", fontWeight: 700, fontSize: "11px" }}>Present</span>;
    }
    if (cd === "HD" || st === "Half Day") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(245,158,11,0.12)", color: "#d97706", fontWeight: 700, fontSize: "11px" }}>Half Day</span>;
    }
    if (cd === "1H" || st === "First Half Leave") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(168,85,247,0.12)", color: "#9333ea", fontWeight: 700, fontSize: "11px" }}>1H Leave</span>;
    }
    if (cd === "2H" || st === "Second Half Leave") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(168,85,247,0.12)", color: "#9333ea", fontWeight: 700, fontSize: "11px" }}>2H Leave</span>;
    }
    if (cd === "L" || cd === "LV" || st.includes("Leave")) {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(124,58,237,0.12)", color: "#7c3aed", fontWeight: 700, fontSize: "11px" }}>Leave</span>;
    }
    if (cd === "MP" || st === "Missing Punch") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(239,68,68,0.12)", color: "#dc2626", fontWeight: 700, fontSize: "11px" }}>Missing Punch</span>;
    }
    if (cd === "WO" || st === "Week Off" || st === "Weekly Off") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(100,116,139,0.12)", color: "#64748b", fontWeight: 700, fontSize: "11px" }}>Week Off</span>;
    }
    if (st === "Absent") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(239,68,68,0.12)", color: "#dc2626", fontWeight: 700, fontSize: "11px" }}>Absent</span>;
    }
    return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(100,116,139,0.1)", color: "#64748b", fontWeight: 600, fontSize: "11px" }}>{status || "—"}</span>;
  };

  // =========================================================================
  // MODAL LOGIC & ATTENDANCE LINKING
  // =========================================================================
  const generateNextEmployeeCode = () => {
    let maxNum = 200;
    const existing = [...allEmployees, ...members];
    existing.forEach((e) => {
      const code = String(e.emp_code || e.id || "");
      const match = code.match(/(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum && n < 9999) {
          maxNum = n;
        }
      }
    });
    return `LE${maxNum + 1}`;
  };

  const handleOpenAddModal = () => {
    const currentMgrName = manager.name || "Manager";
    const currentMgrCode = manager.emp_code || managerId || "";
    const teamSize = members.length;

    setIsNewProfile(false);
    setFormErrors({});
    setEmployeeSearchTerm("");
    setIsEmployeeDropdownOpen(false);

    setFormData({
      selectedEmployeeId: "",
      emp_code: "",
      name: "",
      email: "",
      contact: "",
      designation: "",
      department: manager.department || (departmentsList[0] || "Engineering"),
      employment_type: "Regular Employee",
      location: "Mumbai Office (Headquarters)",
      reporting_manager: currentMgrCode,
      joining_date: currentDate || new Date().toISOString().split("T")[0],
      team_assignment: `${currentMgrName}'s Team (${teamSize} members)`,
      role: "employee"
    });

    setAttendancePreview({
      emp_code: "Auto-filled",
      punchIn: "Auto-filled",
      punchOut: "Auto-filled",
      workingHours: "Auto-filled",
      attendanceStatus: "Auto-filled",
      leaveStatus: "Auto-filled",
      loading: false
    });

    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsAddModalOpen(false);
    setFormErrors({});
  };

  // When an employee is chosen from the dropdown:
  const handleSelectEmployee = (emp) => {
    if (emp === "NEW") {
      // "+ Create New Employee Profile" chosen
      const nextCode = generateNextEmployeeCode();
      setIsNewProfile(true);
      setFormData((prev) => ({
        ...prev,
        selectedEmployeeId: "__NEW__",
        emp_code: nextCode,
        name: "",
        email: "",
        contact: "",
        designation: prev.designation || "",
        department: prev.department || manager.department || "Engineering",
        employment_type: "Regular Employee"
      }));
      setEmployeeSearchTerm("+ Create New Employee Profile");
      setIsEmployeeDropdownOpen(false);

      setAttendancePreview({
        emp_code: nextCode,
        punchIn: "No attendance recorded",
        punchOut: "No attendance recorded",
        workingHours: "0hr 0min",
        attendanceStatus: "No attendance recorded",
        leaveStatus: "None",
        loading: false
      });
      return;
    }

    // Existing employee chosen
    const code = emp.emp_code || emp.id || "";
    const fullName = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || code;
    const email = emp.email || "";
    const contact = emp.contact_number || emp.mobile || emp.mobile_no || emp.phone || "";
    const desig = emp.designation || emp.role || "";
    const dept = emp.department || manager.department || "Engineering";
    const empType = emp.type || emp.employment_type || "Regular Employee";
    const loc = emp.location || emp.branch_location || "Mumbai Office (Headquarters)";

    setIsNewProfile(false);
    setFormData((prev) => ({
      ...prev,
      selectedEmployeeId: code,
      emp_code: code,
      name: fullName,
      email: email,
      contact: contact,
      designation: desig,
      department: dept,
      employment_type: empType,
      location: loc
    }));
    setEmployeeSearchTerm(`${code} — ${fullName}`);
    setIsEmployeeDropdownOpen(false);

    // Fetch real attendance preview for this employee on currentDate
    setAttendancePreview((prev) => ({ ...prev, loading: true, emp_code: code }));
    fetch(getApiUrl(`/admin/employees/${code}/attendance-preview?date_str=${currentDate}`), {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        "Content-Type": "application/json"
      }
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData && resData.attendance) {
          const att = resData.attendance;
          setAttendancePreview({
            emp_code: code,
            punchIn: att.checkIn && att.checkIn !== "—" ? att.checkIn : "No attendance recorded",
            punchOut: att.checkOut && att.checkOut !== "—" ? att.checkOut : "No attendance recorded",
            workingHours: att.duration && att.duration !== "—" ? att.duration : "0hr 0min",
            attendanceStatus: att.status && att.status !== "—" ? att.status : "No attendance recorded",
            leaveStatus: att.leave_status && att.leave_status !== "—" ? att.leave_status : "None",
            loading: false
          });
        } else {
          setAttendancePreview({
            emp_code: code,
            punchIn: "No attendance recorded",
            punchOut: "No attendance recorded",
            workingHours: "0hr 0min",
            attendanceStatus: "No attendance recorded",
            leaveStatus: "None",
            loading: false
          });
        }
      })
      .catch(() => {
        setAttendancePreview({
          emp_code: code,
          punchIn: "No attendance recorded",
          punchOut: "No attendance recorded",
          workingHours: "0hr 0min",
          attendanceStatus: "No attendance recorded",
          leaveStatus: "None",
          loading: false
        });
      });
  };

  // Filtered employee options for the dropdown
  const filteredEmployeeOptions = useMemo(() => {
    if (!employeeSearchTerm) return allEmployees.slice(0, 30);
    const q = employeeSearchTerm.toLowerCase();
    return allEmployees.filter((e) => {
      const code = (e.emp_code || e.id || "").toLowerCase();
      const name = (e.name || "").toLowerCase();
      const email = (e.email || "").toLowerCase();
      return code.includes(q) || name.includes(q) || email.includes(q);
    }).slice(0, 30);
  }, [allEmployees, employeeSearchTerm]);

  // Form Field Validation
  const validateForm = () => {
    const errs = {};
    if (!formData.selectedEmployeeId) {
      errs.selectedEmployee = "Please select an existing employee or choose '+ Create New Employee Profile'.";
    }

    if (isNewProfile) {
      if (!formData.name.trim()) errs.name = "Full Name is required.";
      if (!formData.email.trim()) {
        errs.email = "Email Address is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errs.email = "Enter a valid email address.";
      }
    }

    if (!formData.designation.trim()) errs.designation = "Designation is required.";
    if (!formData.department.trim()) errs.department = "Department is required.";
    if (!formData.joining_date) errs.joining_date = "Joining Date is required.";
    if (!formData.reporting_manager) errs.reporting_manager = "Reporting Manager is required.";

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmitAddMember = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});

    const selectedMgrCode = formData.reporting_manager || manager.emp_code || managerId;
    const payload = {
      is_new: isNewProfile,
      emp_code: formData.emp_code.trim(),
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      contact: formData.contact.trim(),
      phone: formData.contact.trim(),
      mobile: formData.contact.trim(),
      designation: formData.designation.trim(),
      department: formData.department.trim(),
      employment_type: formData.employment_type,
      location: formData.location,
      joining_date: formData.joining_date,
      role: formData.role,
      reporting_supervisor: selectedMgrCode
    };

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(getApiUrl(`/admin/managers/${selectedMgrCode}/team/members`), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resData.detail || resData.message || "Failed to add member to team.");
      }

      // Success
      setIsAddModalOpen(false);
      const successMessage = resData.message || `Successfully assigned ${formData.name || formData.emp_code} to team.`;
      setPageAlert({ type: "success", message: successMessage });

      // Refresh team data
      fetchTeamData(currentDate);

      // Dispatch global events so Employee Directory and Org Tree sync seamlessly
      window.dispatchEvent(new Event("employees-updated"));
      try {
        localStorage.setItem("hrms_last_event", JSON.stringify({
          type: "employees-updated",
          emp_code: formData.emp_code,
          timestamp: Date.now()
        }));
      } catch (err) {}

      // Auto-hide alert banner after 5 seconds
      setTimeout(() => {
        setPageAlert(null);
      }, 5000);
    } catch (err) {
      console.error("Add team member error:", err);
      setFormErrors({ server: err.message || "An unexpected error occurred while saving." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dash-page-container">
      {/* Alert Banner */}
      {pageAlert && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          borderRadius: "10px",
          background: pageAlert.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${pageAlert.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: pageAlert.type === "success" ? "#15803d" : "#b91c1c",
          marginBottom: "16px",
          fontSize: "13px",
          fontWeight: 600
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {pageAlert.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{pageAlert.message}</span>
          </div>
          <button
            onClick={() => setPageAlert(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <button
          onClick={() => navigate("/admin/managers")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "9px",
            border: "1px solid var(--border, #e2e8f0)",
            background: "var(--surface, #ffffff)",
            color: "var(--text, #0f172a)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          <ArrowLeft size={16} /> Back to Managers
        </button>

        <div className="team-view-actions">
          <button
            onClick={() => setViewMode("daily")}
            className={`team-action-btn ${viewMode === "daily" ? "active" : "secondary"}`}
          >
            Daily Team View
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`team-action-btn ${viewMode === "monthly" ? "active" : "secondary"}`}
          >
            View Monthly Attendance
          </button>
          {/* + Add New Member Button */}
          <button
            onClick={handleOpenAddModal}
            className="team-action-btn primary"
            id="add-team-member-btn"
          >
            <Plus size={16} /> Add New Member
          </button>
        </div>
      </div>

      {/* Manager Information Card */}
      <div className="card" style={{ padding: "20px 24px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(109,40,217,0.01) 100%)", border: "1px solid rgba(124,58,237,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#7c3aed", color: "#ffffff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "20px" }}>
            {manager.name ? manager.name.charAt(0).toUpperCase() : "M"}
          </div>

          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>{manager.name || "Manager"}</h2>
              <span style={{ padding: "3px 9px", borderRadius: "12px", background: "#7c3aed", color: "#ffffff", fontSize: "11px", fontWeight: 700 }}>
                {manager.emp_code || managerId}
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted, #64748b)" }}>
              {manager.designation || "Manager"} · {manager.department || "Operations"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "12px" }}>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Email ID</span>
              <strong style={{ fontSize: "13px" }}>{manager.email || "—"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Contact</span>
              <strong style={{ fontSize: "13px" }}>{manager.contact || "—"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Team Size</span>
              <strong style={{ fontSize: "13px", color: "#7c3aed" }}>{members.length} Members</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Date Navigation & Summary Cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted, #64748b)" }}>Attendance Date:</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface, #ffffff)", border: "1px solid var(--border, #e2e8f0)", padding: "4px 8px", borderRadius: "9px" }}>
            <button onClick={handlePrevDay} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #64748b)" }}>
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: "13px", fontWeight: 600, color: "var(--text, #0f172a)", background: "none" }}
            />
            <button onClick={handleNextDay} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #64748b)" }}>
              <ChevronRight size={16} />
            </button>
          </div>
          <button onClick={handleToday} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", background: "var(--surface, #ffffff)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            Today
          </button>
        </div>

        <strong style={{ fontSize: "14px", color: "#7c3aed" }}>
          {teamData?.date || ""}
        </strong>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", fontWeight: 600 }}>Total Team Members</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700 }}>{members.length}</h3>
        </div>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Present Today</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700, color: "#16a34a" }}>{summary.present}</h3>
        </div>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 600 }}>Absent Today</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700, color: "#dc2626" }}>{summary.absent}</h3>
        </div>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "#9333ea", fontWeight: 600 }}>On Leave</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700, color: "#9333ea" }}>{summary.on_leave}</h3>
        </div>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>Half Day</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700, color: "#d97706" }}>{summary.half_day}</h3>
        </div>
        <div className="card" style={{ padding: "14px 16px", borderRadius: "12px" }}>
          <span style={{ fontSize: "11px", color: "#e11d48", fontWeight: 600 }}>Missing Punch</span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700, color: "#e11d48" }}>{summary.missing_punch}</h3>
        </div>
      </div>

      {/* Main Table / Matrix Content */}
      {viewMode === "daily" ? (
        <div className="card" style={{ padding: "20px", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Team Member Attendance Roster</h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
              Showing {members.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, members.length)} of {members.length} members
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-roster-table" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #f8fafc)" }}>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Employee</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Employee Code</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Designation</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Contact</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Email</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Punch In</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Punch Out</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Working Hours</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "left" }}>Leave</th>
                  <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                      Loading team members...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                      No team members assigned to this manager yet. Click <strong>+ Add New Member</strong> above to assign employees.
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((mem) => {
                    const initials = mem.name
                      ? mem.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                      : "E";
                    return (
                      <tr key={mem.id || mem.emp_code} style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                        <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#6366f1", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "12px" }}>
                              {initials}
                            </div>
                            <strong style={{ fontSize: "13px" }}>{mem.name}</strong>
                          </div>
                        </td>
                        <td style={{ padding: "14px", fontSize: "12px", fontWeight: 600 }}>{mem.emp_code}</td>
                        <td style={{ padding: "14px", fontSize: "12px" }}>{mem.designation}</td>
                        <td style={{ padding: "14px", fontSize: "12px" }}>{mem.contact}</td>
                        <td style={{ padding: "14px", fontSize: "12px" }}>{mem.email}</td>
                        <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{mem.checkIn || "—"}</td>
                        <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{mem.checkOut || "—"}</td>
                        <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{mem.workingHours || "—"}</td>
                        <td style={{ padding: "14px", textAlign: "center" }}>{getStatusBadge(mem.status, mem.badge_code)}</td>
                        <td style={{ padding: "14px", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>{mem.leave_status || "—"}</td>
                        <td style={{ padding: "14px", textAlign: "right" }}>
                          <button
                            onClick={() => navigate(`/admin/employees/${mem.emp_code}/attendance`)}
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

          {/* Mobile Responsive Cards View */}
          <div className="mobile-roster-cards">
            {loading ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>Loading team members...</div>
            ) : members.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                No team members assigned to this manager yet.
              </div>
            ) : (
              paginatedMembers.map((mem) => {
                const initials = mem.name
                  ? mem.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                  : "E";
                return (
                  <div key={mem.id || mem.emp_code} className="mobile-employee-card">
                    <div className="mobile-employee-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#6366f1", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "13px" }}>
                          {initials}
                        </div>
                        <div>
                          <strong style={{ fontSize: "14px", display: "block" }}>{mem.name}</strong>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{mem.emp_code} · {mem.designation}</span>
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(mem.status, mem.badge_code)}
                      </div>
                    </div>

                    <div className="mobile-employee-details">
                      <div>
                        <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>Email</span>
                        <strong style={{ fontSize: "11.5px", wordBreak: "break-all" }}>{mem.email || "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>Contact</span>
                        <strong style={{ fontSize: "11.5px" }}>{mem.contact || "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>Punch In / Out</span>
                        <strong style={{ fontSize: "11.5px" }}>{mem.checkIn || "—"} / {mem.checkOut || "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>Working Hours</span>
                        <strong style={{ fontSize: "11.5px" }}>{mem.workingHours || "—"}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/admin/employees/${mem.emp_code}/attendance`)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(124,58,237,0.1)",
                        color: "#7c3aed",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        width: "100%",
                        marginTop: "4px"
                      }}
                    >
                      View Attendance
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Roster Pagination Bar */}
          {members.length > 0 && (
            <div className="team-roster-pagination">
              <div>
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, members.length)} of {members.length} members
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="team-pagination-controls">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="team-page-btn"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span style={{ padding: "0 4px", color: "#94a3b8" }}>...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`team-page-btn ${currentPage === p ? "active" : ""}`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="team-page-btn"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #cbd5e1)",
                    fontSize: "12px",
                    background: "var(--surface, #ffffff)",
                    color: "var(--text, #0f172a)"
                  }}
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Monthly Team Grid View */
        <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 700 }}>Monthly Team Attendance Matrix</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #f8fafc)" }}>
                  <th style={{ padding: "10px", textAlign: "left", minWidth: "160px", position: "sticky", left: 0, background: "var(--surface-2, #f8fafc)", zIndex: 3 }}>Employee</th>
                  {Array.from({ length: monthlyGrid?.days_in_month || 31 }, (_, i) => (
                    <th key={i + 1} style={{ padding: "8px 6px", textAlign: "center", minWidth: "30px" }}>{i + 1}</th>
                  ))}
                  <th style={{ padding: "10px", textAlign: "center", background: "#f0fdf4", color: "#16a34a" }}>P</th>
                  <th style={{ padding: "10px", textAlign: "center", background: "#fef2f2", color: "#dc2626" }}>A</th>
                  <th style={{ padding: "10px", textAlign: "center", background: "#faf5ff", color: "#9333ea" }}>L</th>
                  <th style={{ padding: "10px", textAlign: "center", background: "#fffbeb", color: "#d97706" }}>HD</th>
                </tr>
              </thead>
              <tbody>
                {!monthlyGrid || !monthlyGrid.grid ? (
                  <tr><td colSpan={36} style={{ padding: "24px", textAlign: "center" }}>Loading monthly grid...</td></tr>
                ) : (
                  monthlyGrid.grid.map((row) => (
                    <tr key={row.emp_code} style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                      <td style={{ padding: "10px", fontWeight: 600, position: "sticky", left: 0, background: "var(--surface, #ffffff)", zIndex: 2 }}>
                        {row.name}
                        <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted, #64748b)" }}>{row.emp_code}</span>
                      </td>
                      {Array.from({ length: monthlyGrid.days_in_month }, (_, i) => {
                        const code = row.daily[String(i + 1)] || "—";
                        let bg = "#f8fafc";
                        let color = "#64748b";
                        if (code === "P") { bg = "#dcfce7"; color = "#15803d"; }
                        else if (code === "A") { bg = "#fee2e2"; color = "#b91c1c"; }
                        else if (code === "HD") { bg = "#fef3c7"; color = "#b45309"; }
                        else if (code === "L" || code === "1H" || code === "2H") { bg = "#f3e8ff"; color = "#7e22ce"; }
                        else if (code === "WO" || code === "H") { bg = "#f1f5f9"; color = "#475569"; }
                        return (
                          <td key={i + 1} style={{ padding: "4px 2px", textAlign: "center" }}>
                            <span style={{ display: "inline-block", width: "24px", height: "24px", lineHeight: "24px", borderRadius: "4px", background: bg, color: color, fontWeight: 700, fontSize: "10px" }}>
                              {code}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#16a34a" }}>{row.totals.present}</td>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#dc2626" }}>{row.totals.absent}</td>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#9333ea" }}>{row.totals.leave}</td>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#d97706" }}>{row.totals.half_day}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD NEW TEAM MEMBER MODAL
          ========================================================================= */}
      {isAddModalOpen && (
        <div className="team-modal-backdrop" onClick={handleCloseModal}>
          <div className="team-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="team-modal-header">
              <h2>Add New Team Member</h2>
              <button
                type="button"
                className="team-modal-close-btn"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitAddMember} className="team-modal-body">
              {/* Server-side Error Alert */}
              {formErrors.server && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: "12.5px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <AlertCircle size={16} />
                  <span>{formErrors.server}</span>
                </div>
              )}

              {/* -------------------------------------------------------------
                  SECTION A: Employee Profile
                  ------------------------------------------------------------- */}
              <div className="team-form-section-title">
                <User size={18} />
                <span>Employee Profile</span>
              </div>

              <div className="team-form-grid">
                {/* Select Employee */}
                <div className="team-form-group" style={{ position: "relative" }}>
                  <label className="team-form-label">
                    Select Employee <span className="required">*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="team-form-input"
                      placeholder="Search and select employee..."
                      value={employeeSearchTerm}
                      onFocus={() => setIsEmployeeDropdownOpen(true)}
                      onChange={(e) => {
                        setEmployeeSearchTerm(e.target.value);
                        setIsEmployeeDropdownOpen(true);
                      }}
                    />
                    <Search
                      size={15}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                        pointerEvents: "none"
                      }}
                    />
                  </div>

                  {/* Dropdown Options List */}
                  {isEmployeeDropdownOpen && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
                      zIndex: 50,
                      maxHeight: "220px",
                      overflowY: "auto",
                      marginTop: "4px"
                    }}>
                      {/* "+ Create New Employee Profile" option */}
                      <div
                        onClick={() => handleSelectEmployee("NEW")}
                        style={{
                          padding: "10px 14px",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#7c3aed",
                          background: "#faf5ff",
                          borderBottom: "1px solid #f3e8ff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <Plus size={16} /> Create New Employee Profile
                      </div>

                      {filteredEmployeeOptions.length === 0 ? (
                        <div style={{ padding: "12px", fontSize: "12px", color: "#64748b", textAlign: "center" }}>
                          No matching employees found
                        </div>
                      ) : (
                        filteredEmployeeOptions.map((e) => {
                          const code = e.emp_code || e.id;
                          const name = e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim() || code;
                          const isSelected = formData.selectedEmployeeId === code;
                          return (
                            <div
                              key={code}
                              onClick={() => handleSelectEmployee(e)}
                              style={{
                                padding: "9px 14px",
                                fontSize: "12.5px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: isSelected ? "#f8fafc" : "#ffffff"
                              }}
                              onMouseEnter={(el) => (el.currentTarget.style.background = "#f1f5f9")}
                              onMouseLeave={(el) => (el.currentTarget.style.background = isSelected ? "#f8fafc" : "#ffffff")}
                            >
                              <div>
                                <strong style={{ color: "#0f172a" }}>{name}</strong>
                                <span style={{ color: "#64748b", marginLeft: "6px", fontSize: "11.5px" }}>({code})</span>
                                {e.designation && (
                                  <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>{e.designation}</span>
                                )}
                              </div>
                              {isSelected && <Check size={16} color="#7c3aed" />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                  {formErrors.selectedEmployee && (
                    <span className="team-form-error-msg">{formErrors.selectedEmployee}</span>
                  )}
                </div>

                {/* Employee Code */}
                <div className="team-form-group">
                  <label className="team-form-label">Employee Code</label>
                  <input
                    type="text"
                    className="team-form-input readonly"
                    value={formData.emp_code || (isNewProfile ? "" : "Auto-filled")}
                    readOnly
                    placeholder="Auto-filled"
                  />
                </div>

                {/* Full Name */}
                <div className="team-form-group">
                  <label className="team-form-label">
                    Full Name {isNewProfile && <span className="required">*</span>}
                  </label>
                  <input
                    type="text"
                    className={`team-form-input ${!isNewProfile && formData.name ? "readonly" : ""}`}
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Auto-filled"
                    readOnly={!isNewProfile && Boolean(formData.selectedEmployeeId)}
                  />
                  {formErrors.name && <span className="team-form-error-msg">{formErrors.name}</span>}
                </div>

                {/* Email Address */}
                <div className="team-form-group">
                  <label className="team-form-label">
                    Email Address {isNewProfile && <span className="required">*</span>}
                  </label>
                  <input
                    type="email"
                    className={`team-form-input ${!isNewProfile && formData.email ? "readonly" : ""}`}
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Auto-filled"
                    readOnly={!isNewProfile && Boolean(formData.selectedEmployeeId)}
                  />
                  {formErrors.email && <span className="team-form-error-msg">{formErrors.email}</span>}
                </div>

                {/* Contact Number */}
                <div className="team-form-group">
                  <label className="team-form-label">Contact Number</label>
                  <input
                    type="text"
                    className={`team-form-input ${!isNewProfile && formData.contact ? "readonly" : ""}`}
                    value={formData.contact}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contact: e.target.value }))}
                    placeholder="Auto-filled"
                    readOnly={!isNewProfile && Boolean(formData.selectedEmployeeId)}
                  />
                </div>

                {/* Designation */}
                <div className="team-form-group">
                  <label className="team-form-label">
                    Designation <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="team-form-input"
                    placeholder="Select or enter designation"
                    value={formData.designation}
                    onChange={(e) => setFormData((prev) => ({ ...prev, designation: e.target.value }))}
                    list="designations-datalist"
                  />
                  <datalist id="designations-datalist">
                    <option value="Senior Developer" />
                    <option value="Software Developer" />
                    <option value="UI/UX Designer" />
                    <option value="Team Leader" />
                    <option value="Intern Developer" />
                    <option value="Business Analyst" />
                    <option value="Project Manager" />
                    <option value="Technical Architect" />
                    <option value="AI/ML Developer" />
                    <option value="Senior Software Developer" />
                  </datalist>
                  {formErrors.designation && <span className="team-form-error-msg">{formErrors.designation}</span>}
                </div>

                {/* Department */}
                <div className="team-form-group">
                  <label className="team-form-label">
                    Department <span className="required">*</span>
                  </label>
                  <select
                    className="team-form-select"
                    value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                  >
                    <option value="">Select department</option>
                    {(departmentsList.length > 0 ? departmentsList : ["Engineering", "Operations", "Design", "Marketing", "Human Resources", "Quality Assurance"]).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {formErrors.department && <span className="team-form-error-msg">{formErrors.department}</span>}
                </div>

                {/* Employment Type */}
                <div className="team-form-group">
                  <label className="team-form-label">Employment Type</label>
                  <select
                    className="team-form-select"
                    value={formData.employment_type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, employment_type: e.target.value }))}
                  >
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  SECTION B: Employment & Team Assignment
                  ------------------------------------------------------------- */}
              <div className="team-form-section-title">
                <Briefcase size={18} />
                <span>Employment & Team Assignment</span>
              </div>

              <div className="team-form-grid">
                {/* Work Location */}
                <div className="team-form-group">
                  <label className="team-form-label">Work Location</label>
                  <select
                    className="team-form-select"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  >
                    {DEFAULT_WORK_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Reporting Manager */}
                <div className="team-form-group">
                  <label className="team-form-label">
                    Reporting Manager <span className="required">*</span>
                  </label>
                  <select
                    className="team-form-select"
                    value={formData.reporting_manager}
                    onChange={(e) => {
                      const newMgrCode = e.target.value;
                      const selectedMgr = allManagers.find((m) => m.emp_code === newMgrCode);
                      const name = selectedMgr ? selectedMgr.name : manager.name || "Manager";
                      const size = selectedMgr ? selectedMgr.team_size : members.length;
                      setFormData((prev) => ({
                        ...prev,
                        reporting_manager: newMgrCode,
                        team_assignment: `${name}'s Team (${size} members)`
                      }));
                    }}
                  >
                    {allManagers.length > 0 ? (
                      allManagers.map((m) => (
                        <option key={m.emp_code} value={m.emp_code}>
                          {m.name} ({m.emp_code})
                        </option>
                      ))
                    ) : (
                      <option value={manager.emp_code || managerId}>
                        {manager.name || "Manager"} ({manager.emp_code || managerId})
                      </option>
                    )}
                  </select>
                  {formErrors.reporting_manager && (
                    <span className="team-form-error-msg">{formErrors.reporting_manager}</span>
                  )}
                </div>

                {/* Joining Date */}
                <div className="team-form-group">
                  <label className="team-form-label">
                    Joining Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    className="team-form-input"
                    value={formData.joining_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, joining_date: e.target.value }))}
                  />
                  {formErrors.joining_date && (
                    <span className="team-form-error-msg">{formErrors.joining_date}</span>
                  )}
                </div>

                {/* Team Assignment */}
                <div className="team-form-group">
                  <label className="team-form-label">
                    Team Assignment <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="team-form-input"
                    value={formData.team_assignment || `${manager.name || "Manager"}'s Team (${members.length} members)`}
                    onChange={(e) => setFormData((prev) => ({ ...prev, team_assignment: e.target.value }))}
                  />
                </div>

                {/* Role / Portal Access */}
                <div className="team-form-group">
                  <label className="team-form-label">
                    Role / Portal Access <span className="required">*</span>
                  </label>
                  <select
                    className="team-form-select"
                    value={formData.role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                  >
                    {DEFAULT_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  SECTION C: Linked Attendance Profile Box
                  ------------------------------------------------------------- */}
              <div className="team-attendance-box">
                <div className="team-attendance-box-header">
                  <Calendar size={18} />
                  <div>
                    <div className="team-attendance-box-title">Attendance Profile (linked automatically)</div>
                    <div className="team-attendance-box-desc">
                      Attendance details sync from existing attendance records after the member is assigned.
                    </div>
                  </div>
                </div>

                <div className="team-attendance-grid">
                  <div className="team-attendance-field">
                    <label>Employee ID</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={attendancePreview.emp_code || "Auto-filled"}
                    />
                  </div>

                  <div className="team-attendance-field">
                    <label>Punch In</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={attendancePreview.punchIn || "Auto-filled"}
                    />
                  </div>

                  <div className="team-attendance-field">
                    <label>Punch Out</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={attendancePreview.punchOut || "Auto-filled"}
                    />
                  </div>

                  <div className="team-attendance-field">
                    <label>Working Hours</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={attendancePreview.workingHours || "Auto-filled"}
                    />
                  </div>

                  <div className="team-attendance-field">
                    <label>Attendance Status</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={attendancePreview.attendanceStatus || "Auto-filled"}
                    />
                  </div>

                  <div className="team-attendance-field">
                    <label>Leave Status</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={attendancePreview.leaveStatus || "Auto-filled"}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Persistent Footer */}
              <div className="team-modal-footer">
                <button
                  type="button"
                  className="team-footer-cancel-btn"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="team-footer-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin-icon" style={{ animation: "spin 1s linear infinite" }} />
                      <span>Adding Member...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Add Member</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
