import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  UserCheck,
  UserX,
  Clock,
  FileSpreadsheet,
  Eye,
  Mail,
  Phone,
  Briefcase,
  User,
  Plus,
  X,
  Search,
  Check,
  AlertCircle,
  Building,
  MapPin,
  Shield,
  Loader2,
  Sparkles
} from "lucide-react";
import { getApiUrl, apiRequest } from "../../services/apiClient";
import { loadUnifiedEmployees, fetchDepartmentsApi } from "../../utils/employeeStore";
import CustomSelect from "../../components/ui/CustomSelect";
import CustomDatePicker from "../../components/ui/CustomDatePicker";
import "./AdminManagerTeamView.css";

export default function AdminManagerTeamView() {
  const { managerId } = useParams();
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "M";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState(null);
  const [viewMode, setViewMode] = useState("daily"); // "daily" | "monthly"
  const [monthlyGrid, setMonthlyGrid] = useState(null);

  // Pagination State for Team Member Roster
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [allManagers, setAllManagers] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [designationsList, setDesignationsList] = useState([]);
  const [locationsList, setLocationsList] = useState([]);

  // Modal Form State
  const [empSelectionMode, setEmpSelectionMode] = useState("existing"); // "existing" | "new"
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const empDropdownRef = useRef(null);
  const empDropdownMenuRef = useRef(null);
  const [empDropdownCoords, setEmpDropdownCoords] = useState({ top: 0, left: 0, width: 0, placement: "bottom" });

  const [formData, setFormData] = useState({
    emp_code: "",
    full_name: "",
    email: "",
    contact: "",
    designation: "",
    department: "",
    employment_type: "Regular Employee",
    work_location: "Mumbai, IN",
    reporting_manager: "",
    team_assignment: "",
    role: "Employee",
    joining_date: new Date().toISOString().split("T")[0]
  });

  const [attendancePreview, setAttendancePreview] = useState({
    emp_code: "Auto-filled",
    checkIn: "Auto-filled",
    checkOut: "Auto-filled",
    workingHours: "Auto-filled",
    status: "Auto-filled",
    leave_status: "Auto-filled"
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionAlert, setActionAlert] = useState(null); // { type: "success" | "error", message: string }

  // Fetch Team Data
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

  // Initial load of team data
  useEffect(() => {
    fetchTeamData(currentDate);
  }, [managerId, currentDate]);

  useEffect(() => {
    if (viewMode === "monthly") {
      fetchMonthlyGrid();
    }
  }, [viewMode, currentDate]);

  // Load available system employees, managers, and metadata
  const loadSystemMetadata = async () => {
    try {
      const emps = await loadUnifiedEmployees();
      setAllEmployees(emps);

      // Extract designations
      const desigs = Array.from(
        new Set(
          emps
            .map((e) => e.designation)
            .filter((d) => d && d !== "Employee" && d !== "—")
        )
      );
      const defaultDesigs = [
        "Senior Developer",
        "Software Developer",
        "Intern Developer",
        "UI/UX Designer",
        "Product Manager",
        "DevOps Engineer",
        "QA Engineer",
        "HR Specialist",
        "Operations Associate"
      ];
      setDesignationsList(Array.from(new Set([...defaultDesigs, ...desigs])));

      // Extract locations
      const locs = Array.from(
        new Set(emps.map((e) => e.location).filter(Boolean))
      );
      const defaultLocs = ["Mumbai, IN", "Bangalore, IN", "Delhi, IN", "Remote"];
      setLocationsList(Array.from(new Set([...defaultLocs, ...locs])));

      // Fetch departments
      const depts = await fetchDepartmentsApi();
      setDepartmentsList(depts);

      // Fetch managers
      try {
        let mgrData = await apiRequest("/admin/managers").catch(() => null);
        if (!mgrData || !mgrData.managers) {
          mgrData = await apiRequest("/api/v1/admin/managers").catch(() => null);
        }
        if (mgrData && mgrData.managers) {
          setAllManagers(mgrData.managers);
        }
      } catch (e) {
        console.warn("Failed to fetch managers:", e);
      }
    } catch (err) {
      console.warn("Failed to load metadata for team modal:", err);
    }
  };

  useEffect(() => {
    loadSystemMetadata();
  }, []);

  // Viewport positioning calculation for Select Employee portaled dropdown
  const updateEmpDropdownPos = useCallback(() => {
    if (!empDropdownRef.current) return;
    const rect = empDropdownRef.current.getBoundingClientRect();
    const menuHeight = 290;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    let placement = "bottom";
    let top = rect.bottom + 5;
    if (spaceBelow < 250 && spaceAbove > spaceBelow) {
      placement = "top";
      top = Math.max(12, rect.top - menuHeight - 5);
    }

    let left = rect.left;
    let width = Math.max(rect.width, 240);
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    if (left < 12) left = 12;

    setEmpDropdownCoords({ top, left, width, placement });
  }, []);

  useEffect(() => {
    if (!isEmpDropdownOpen) return;
    updateEmpDropdownPos();
    const handleScrollResize = () => updateEmpDropdownPos();
    window.addEventListener("scroll", handleScrollResize, true);
    window.addEventListener("resize", handleScrollResize);
    return () => {
      window.removeEventListener("scroll", handleScrollResize, true);
      window.removeEventListener("resize", handleScrollResize);
    };
  }, [isEmpDropdownOpen, updateEmpDropdownPos]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isEmpDropdownOpen) return;
    const handleOutsideClick = (e) => {
      if (
        empDropdownRef.current && !empDropdownRef.current.contains(e.target) &&
        empDropdownMenuRef.current && !empDropdownMenuRef.current.contains(e.target)
      ) {
        setIsEmpDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsEmpDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEmpDropdownOpen]);

  // Lock background page scroll while Add Member modal is open
  useEffect(() => {
    if (isAddModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isAddModalOpen]);

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split("T")[0]);
    setCurrentPage(1);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split("T")[0]);
    setCurrentPage(1);
  };

  const handleToday = () => {
    setCurrentDate(new Date().toISOString().split("T")[0]);
    setCurrentPage(1);
  };

  const manager = teamData?.manager || {};
  const summary = teamData?.summary || { total: 0, present: 0, absent: 0, on_leave: 0, half_day: 0, missing_punch: 0 };
  const members = teamData?.members || [];

  // Generate next unique employee code helper
  const generateNextEmployeeCode = (employees) => {
    let maxLeNum = 0;
    let maxEmpNum = 0;
    employees.forEach((emp) => {
      const code = String(emp.emp_code || emp.id || "").trim().toUpperCase();
      if (code.startsWith("LE")) {
        const num = parseInt(code.replace(/\D/g, ""), 10);
        if (!isNaN(num) && num > maxLeNum) maxLeNum = num;
      } else if (code.startsWith("EMP")) {
        const num = parseInt(code.replace(/\D/g, ""), 10);
        if (!isNaN(num) && num > maxEmpNum) maxEmpNum = num;
      }
    });

    if (maxLeNum > 0) {
      return `LE${maxLeNum + 1}`;
    } else if (maxEmpNum > 0) {
      return `EMP${String(maxEmpNum + 1).padStart(3, "0")}`;
    }
    return `LE260`;
  };

  // Open modal and initialize form values
  const handleOpenAddModal = () => {
    const currentMgrCode = manager.emp_code || managerId || "";
    const currentMgrName = manager.name || "Manager";
    const teamLabel = `${currentMgrName}'s Team (${members.length} members)`;

    setEmpSelectionMode("existing");
    setSelectedEmp(null);
    setEmpSearchQuery("");
    setIsEmpDropdownOpen(false);
    setFormErrors({});
    setActionAlert(null);

    setFormData({
      emp_code: "",
      full_name: "",
      email: "",
      contact: "",
      designation: "",
      department: manager.department || "Engineering",
      employment_type: "Regular Employee",
      work_location: "Mumbai, IN",
      reporting_manager: currentMgrCode,
      team_assignment: teamLabel,
      role: "Employee",
      joining_date: new Date().toISOString().split("T")[0]
    });

    setAttendancePreview({
      emp_code: "Auto-filled",
      checkIn: "Auto-filled",
      checkOut: "Auto-filled",
      workingHours: "Auto-filled",
      status: "Auto-filled",
      leave_status: "Auto-filled"
    });

    setIsAddModalOpen(true);
  };

  // Close modal
  const handleCloseAddModal = () => {
    if (isSubmitting) return;
    setIsAddModalOpen(false);
    setFormErrors({});
    setIsEmpDropdownOpen(false);
  };

  // Quick fetch employee attendance preview
  const fetchEmployeeAttendanceQuick = async (empCode) => {
    if (!empCode) return;
    try {
      const res = await fetch(getApiUrl(`/admin/employees/${empCode}/attendance-quick?date_str=${currentDate}`), {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        const data = await res.json();
        const att = data.attendance || {};
        setAttendancePreview({
          emp_code: empCode,
          checkIn: att.checkIn && att.checkIn !== "—" ? att.checkIn : "No attendance recorded",
          checkOut: att.checkOut && att.checkOut !== "—" ? att.checkOut : "No attendance recorded",
          workingHours: att.workingHours && att.workingHours !== "—" ? att.workingHours : "—",
          status: att.status && att.status !== "Absent" ? att.status : (att.checkIn && att.checkIn !== "—" ? att.status : "No attendance recorded"),
          leave_status: att.leave_status && att.leave_status !== "None" ? att.leave_status : "—"
        });
        return;
      }
    } catch (e) {
      console.warn("Could not fetch quick attendance:", e);
    }

    // Fallback if record not yet generated
    setAttendancePreview({
      emp_code: empCode,
      checkIn: "No attendance recorded",
      checkOut: "No attendance recorded",
      workingHours: "—",
      status: "No attendance recorded",
      leave_status: "—"
    });
  };

  // Handle existing employee selected
  const handleSelectExistingEmployee = (emp) => {
    setSelectedEmp(emp);
    setEmpSelectionMode("existing");
    setIsEmpDropdownOpen(false);
    setFormErrors({});

    const currentMgrCode = manager.emp_code || managerId || "";
    const currentMgrName = manager.name || "Manager";

    setFormData((prev) => ({
      ...prev,
      emp_code: emp.emp_code || emp.id || "",
      full_name: emp.name || "",
      email: emp.email || "",
      contact: emp.contact || emp.phone || emp.mobile_no || "",
      designation: emp.designation || prev.designation || "Software Developer",
      department: emp.department || manager.department || prev.department || "Engineering",
      employment_type: emp.employment_type || emp.type || "Regular Employee",
      work_location: emp.location || "Mumbai, IN",
      reporting_manager: currentMgrCode,
      team_assignment: `${currentMgrName}'s Team (${members.length} members)`,
      role: emp.role ? (emp.role.charAt(0).toUpperCase() + emp.role.slice(1)) : "Employee",
      joining_date: emp.joining_date || emp.joined || new Date().toISOString().split("T")[0]
    }));

    fetchEmployeeAttendanceQuick(emp.emp_code || emp.id);
  };

  // Switch to creating new employee profile
  const handleSwitchToCreateNew = () => {
    setSelectedEmp(null);
    setEmpSelectionMode("new");
    setIsEmpDropdownOpen(false);
    setFormErrors({});

    const nextCode = generateNextEmployeeCode(allEmployees);
    const currentMgrCode = manager.emp_code || managerId || "";
    const currentMgrName = manager.name || "Manager";

    setFormData({
      emp_code: nextCode,
      full_name: "",
      email: "",
      contact: "",
      designation: "",
      department: manager.department || "Engineering",
      employment_type: "Regular Employee",
      work_location: "Mumbai, IN",
      reporting_manager: currentMgrCode,
      team_assignment: `${currentMgrName}'s Team (${members.length} members)`,
      role: "Employee",
      joining_date: new Date().toISOString().split("T")[0]
    });

    setAttendancePreview({
      emp_code: nextCode,
      checkIn: "No attendance recorded",
      checkOut: "No attendance recorded",
      workingHours: "—",
      status: "No attendance recorded",
      leave_status: "—"
    });
  };

  // Filtered employees for search dropdown
  const filteredEmployees = useMemo(() => {
    if (!empSearchQuery.trim()) return allEmployees.slice(0, 60);
    const q = empSearchQuery.toLowerCase().trim();
    return allEmployees.filter(
      (e) =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.emp_code || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (e.designation || "").toLowerCase().includes(q)
    ).slice(0, 60);
  }, [allEmployees, empSearchQuery]);

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.full_name.trim()) {
      errors.full_name = "Full Name is required.";
    }
    if (!formData.emp_code.trim()) {
      errors.emp_code = "Employee Code is required.";
    }
    if (!formData.email.trim()) {
      errors.email = "Email Address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!formData.designation.trim()) {
      errors.designation = "Designation is required.";
    }
    if (!formData.department.trim()) {
      errors.department = "Department is required.";
    }
    if (!formData.joining_date) {
      errors.joining_date = "Joining Date is required.";
    }
    if (!formData.reporting_manager) {
      errors.reporting_manager = "Reporting Manager is required.";
    }

    // Uniqueness & Duplicate checks
    const cleanCode = formData.emp_code.trim().toUpperCase();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (empSelectionMode === "new") {
      const existingCode = allEmployees.some(
        (e) => (e.emp_code || e.id || "").trim().toUpperCase() === cleanCode
      );
      if (existingCode) {
        errors.emp_code = "This Employee Code is already in use.";
      }
      const existingEmail = allEmployees.some(
        (e) => (e.email || "").trim().toLowerCase() === cleanEmail
      );
      if (existingEmail) {
        errors.email = "An employee account with this email already exists.";
      }
    } else {
      // If selecting existing employee, check if already in this manager's team
      const alreadyInTeam = members.some(
        (m) => (m.emp_code || "").trim().toUpperCase() === cleanCode
      );
      if (alreadyInTeam) {
        errors.emp_code = "This employee is already assigned to this manager's team.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmitAddMember = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setActionAlert(null);

    const token = localStorage.getItem("token") || "";

    try {
      if (empSelectionMode === "existing") {
        // Assign existing employee to this manager
        const res = await fetch(getApiUrl(`/admin/employees/${encodeURIComponent(formData.emp_code)}/assign-manager`), {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            manager_code: formData.reporting_manager,
            manager: formData.reporting_manager,
            department: formData.department,
            designation: formData.designation,
            location: formData.work_location,
            employment_type: formData.employment_type,
            role: (formData.role || "employee").toLowerCase()
          })
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.detail || resData.message || "Failed to assign member to manager.");
        }

        setActionAlert({
          type: "success",
          message: `Successfully assigned ${formData.full_name} (${formData.emp_code}) to ${manager.name || "the manager"}'s team!`
        });

        // Close modal and refresh team list
        setTimeout(() => {
          setIsAddModalOpen(false);
          fetchTeamData(currentDate);
          loadSystemMetadata();
        }, 1100);

      } else {
        // Create brand new employee profile
        const payload = {
          emp_code: formData.emp_code.trim(),
          name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          mobile: formData.contact.trim() || null,
          designation: formData.designation.trim(),
          department: formData.department.trim(),
          employment_type: formData.employment_type,
          location: formData.work_location,
          joining_date: formData.joining_date,
          role: (formData.role || "employee").toLowerCase(),
          reporting_supervisor: formData.reporting_manager || manager.emp_code || managerId
        };

        const res = await fetch(getApiUrl("/add-emp/"), {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const resData = await res.json();
        if (!res.ok) {
          const detail = resData.detail || resData.message || "Failed to create new employee profile.";
          const msg = typeof detail === "string" ? detail : JSON.stringify(detail);
          throw new Error(msg);
        }

        setActionAlert({
          type: "success",
          message: `Employee profile created and assigned to ${manager.name || "manager"}'s team successfully!`
        });

        // Close modal and refresh team list
        setTimeout(() => {
          setIsAddModalOpen(false);
          fetchTeamData(currentDate);
          loadSystemMetadata();
        }, 1100);
      }
    } catch (err) {
      console.error("Submission error:", err);
      setActionAlert({
        type: "error",
        message: err.message || "An error occurred while saving team member."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination calculation
  const totalMembers = members.length;
  const totalPages = Math.max(1, Math.ceil(totalMembers / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalMembers);
  const paginatedMembers = members.slice(startIndex, endIndex);

  const getStatusBadge = (status, code) => {
    if (code === "P" || status === "Present") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(34,197,94,0.12)", color: "#16a34a", fontWeight: 700, fontSize: "11px" }}>Present</span>;
    }
    if (code === "HD" || status === "Half Day") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(245,158,11,0.12)", color: "#d97706", fontWeight: 700, fontSize: "11px" }}>Half Day</span>;
    }
    if (code === "1H" || status === "First Half Leave") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(168,85,247,0.12)", color: "#9333ea", fontWeight: 700, fontSize: "11px" }}>1H Leave</span>;
    }
    if (code === "2H" || status === "Second Half Leave") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(168,85,247,0.12)", color: "#9333ea", fontWeight: 700, fontSize: "11px" }}>2H Leave</span>;
    }
    if (code === "L" || (status && status.includes("Leave"))) {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(124,58,237,0.12)", color: "#7c3aed", fontWeight: 700, fontSize: "11px" }}>Leave</span>;
    }
    if (code === "MP" || status === "Missing Punch") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(239,68,68,0.12)", color: "#dc2626", fontWeight: 700, fontSize: "11px" }}>Missing Punch</span>;
    }
    if (code === "WO" || status === "Week Off") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(100,116,139,0.12)", color: "#64748b", fontWeight: 700, fontSize: "11px" }}>Week Off</span>;
    }
    if (status === "Absent") {
      return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(239,68,68,0.12)", color: "#dc2626", fontWeight: 700, fontSize: "11px" }}>Absent</span>;
    }
    return <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(100,116,139,0.1)", color: "#64748b", fontWeight: 600, fontSize: "11px" }}>{status || "—"}</span>;
  };

  return (
    <div className="dash-page-container">
      {/* Top Header Action Row */}
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
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <ArrowLeft size={16} /> Back to Managers
        </button>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setViewMode("daily")}
            style={{
              padding: "8px 16px",
              borderRadius: "9px",
              border: "none",
              background: viewMode === "daily" ? "#7c3aed" : "var(--surface-2, #f1f5f9)",
              color: viewMode === "daily" ? "#ffffff" : "var(--text, #0f172a)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Daily Team View
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            style={{
              padding: "8px 16px",
              borderRadius: "9px",
              border: "none",
              background: viewMode === "monthly" ? "#7c3aed" : "var(--surface-2, #f1f5f9)",
              color: viewMode === "monthly" ? "#ffffff" : "var(--text, #0f172a)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            View Monthly Attendance
          </button>

          {/* + Add New Member Button */}
          <button
            id="btn-add-team-member"
            onClick={handleOpenAddModal}
            className="amtv-btn-add-member"
          >
            <Plus size={16} />
            <span>Add New Member</span>
          </button>
        </div>
      </div>

      {/* Manager Information Card */}
      <div className="card" style={{ padding: "20px 24px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(109,40,217,0.01) 100%)", border: "1px solid rgba(124,58,237,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)", color: "#ffffff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "20px", flexShrink: 0, boxShadow: "0 4px 10px rgba(124,58,237,0.2)" }}>
            {getInitials(manager.name)}
          </div>

          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--text, #0f172a)" }}>{manager.name || "Manager"}</h2>
              <span style={{ padding: "3px 9px", borderRadius: "12px", background: "#7c3aed", color: "#ffffff", fontSize: "11px", fontWeight: 700, fontFamily: "monospace" }}>
                {manager.emp_code}
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted, #64748b)" }}>
              {manager.designation} · {manager.department} Department
            </p>
          </div>

          <div className="amtv-manager-details">
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Email ID</span>
              <strong style={{ fontSize: "13px", wordBreak: "break-all", overflowWrap: "anywhere" }}>{manager.email}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Contact</span>
              <strong style={{ fontSize: "13px" }}>{manager.contact}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)", display: "block" }}>Team Size</span>
              <strong style={{ fontSize: "13px", color: "#7c3aed" }}>{manager.team_size || members.length} Members</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Date Navigation & Summary Cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted, #64748b)" }}>Attendance Date:</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={handlePrevDay}
              title="Previous Day"
              style={{
                width: "36px",
                height: "38px",
                borderRadius: "9px",
                border: "1px solid var(--border, #e2e8f0)",
                background: "var(--surface, #ffffff)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "var(--text, #334155)",
                transition: "all 0.15s ease",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ width: "170px" }}>
              <CustomDatePicker
                value={currentDate}
                onChange={(val) => {
                  if (val) {
                    setCurrentDate(val);
                    setCurrentPage(1);
                  }
                }}
                id="main-attendance-date-picker"
              />
            </div>
            <button
              type="button"
              onClick={handleNextDay}
              title="Next Day"
              style={{
                width: "36px",
                height: "38px",
                borderRadius: "9px",
                border: "1px solid var(--border, #e2e8f0)",
                background: "var(--surface, #ffffff)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "var(--text, #334155)",
                transition: "all 0.15s ease",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleToday}
            style={{
              padding: "9px 14px",
              borderRadius: "9px",
              border: "1px solid var(--border, #e2e8f0)",
              background: "var(--surface, #ffffff)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--text, #334155)",
              transition: "all 0.15s ease",
            }}
          >
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
          <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 700 }}>{summary.total}</h3>
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

      {/* Main Table Content */}
      {viewMode === "daily" ? (
        <div className="card" style={{ padding: "20px", borderRadius: "14px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 700 }}>Team Member Attendance Roster</h3>
          
          {/* Desktop Table View */}
          <div className="amtv-desktop-table" style={{ overflowX: "auto" }}>
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
                ) : paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                      No team members found for this manager.
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((mem) => (
                    <tr key={mem.id || mem.emp_code} style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                      <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#6366f1", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "12px" }}>
                            {getInitials(mem.name)}
                          </div>
                          <strong style={{ fontSize: "13px" }}>{mem.name}</strong>
                        </div>
                      </td>
                      <td style={{ padding: "14px", fontSize: "12px", fontWeight: 600 }}>{mem.emp_code}</td>
                      <td style={{ padding: "14px", fontSize: "12px" }}>{mem.designation}</td>
                      <td style={{ padding: "14px", fontSize: "12px" }}>{mem.contact}</td>
                      <td style={{ padding: "14px", fontSize: "12px" }}>{mem.email}</td>
                      <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{mem.checkIn}</td>
                      <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{mem.checkOut}</td>
                      <td style={{ padding: "14px", textAlign: "center", fontSize: "12px", fontWeight: 600 }}>{mem.workingHours}</td>
                      <td style={{ padding: "14px", textAlign: "center" }}>{getStatusBadge(mem.status, mem.badge_code)}</td>
                      <td style={{ padding: "14px", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>{mem.leave_status}</td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Member Cards View */}
          <div className="amtv-mobile-roster">
            {loading ? (
              <div style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                Loading team members...
              </div>
            ) : paginatedMembers.length === 0 ? (
              <div style={{ padding: "36px", textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                No team members found for this manager.
              </div>
            ) : (
              paginatedMembers.map((mem) => (
                <div key={mem.id || mem.emp_code} className="amtv-member-card">
                  <div className="amtv-member-header">
                    <div className="amtv-member-identity">
                      <div className="amtv-member-avatar">
                        {getInitials(mem.name)}
                      </div>
                      <div className="amtv-member-meta">
                        <h4 className="amtv-member-name">{mem.name}</h4>
                        <p className="amtv-member-desig">{mem.designation || "Team Member"}</p>
                      </div>
                    </div>
                    <span className="amtv-member-badge">{mem.emp_code}</span>
                  </div>

                  {(mem.email || (mem.contact && mem.contact !== "—")) && (
                    <div className="amtv-member-contacts">
                      {mem.email && (
                        <a href={`mailto:${mem.email}`} className="amtv-contact-link">
                          <Mail size={12} color="#7c3aed" />
                          <span>{mem.email}</span>
                        </a>
                      )}
                      {mem.contact && mem.contact !== "—" && (
                        <a href={`tel:${mem.contact}`} className="amtv-contact-link">
                          <Phone size={12} color="#7c3aed" />
                          <span>{mem.contact}</span>
                        </a>
                      )}
                    </div>
                  )}

                  <div className="amtv-member-attendance-grid">
                    <div className="amtv-att-col">
                      <span className="amtv-att-lbl">Punch In</span>
                      <span className="amtv-att-val">{mem.checkIn || "—"}</span>
                    </div>
                    <div className="amtv-att-col">
                      <span className="amtv-att-lbl">Punch Out</span>
                      <span className="amtv-att-val">{mem.checkOut || "—"}</span>
                    </div>
                    <div className="amtv-att-col">
                      <span className="amtv-att-lbl">Hours</span>
                      <span className="amtv-att-val">{mem.workingHours || "—"}</span>
                    </div>
                  </div>

                  <div className="amtv-member-footer">
                    <div>
                      {getStatusBadge(mem.status, mem.badge_code)}
                      {mem.leave_status && mem.leave_status !== "—" && (
                        <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--text-muted, #64748b)" }}>
                          ({mem.leave_status})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="amtv-btn-action"
                      onClick={() => navigate(`/admin/employees/${mem.emp_code}/attendance`)}
                    >
                      <Eye size={13} />
                      <span>View Attendance</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Table Pagination Bar */}
          {!loading && totalMembers > 0 && (
            <div className="amtv-pagination-bar">
              <span className="amtv-pagination-info">
                Showing {startIndex + 1} to {endIndex} of {totalMembers} members
              </span>

              <div className="amtv-pagination-controls">
                <button
                  type="button"
                  className="amtv-page-btn"
                  disabled={validCurrentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - validCurrentPage) <= 1) return true;
                    return false;
                  })
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) {
                      acc.push("...");
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`dots-${idx}`} className="amtv-pagination-dots">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={`amtv-page-btn ${item === validCurrentPage ? "active" : ""}`}
                        onClick={() => setCurrentPage(item)}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  type="button"
                  className="amtv-page-btn"
                  disabled={validCurrentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight size={15} />
                </button>

                <div style={{ width: "115px" }}>
                  <CustomSelect
                    size="sm"
                    value={pageSize}
                    onChange={(val) => {
                      const nextSize = typeof val === "object" && val?.target ? Number(val.target.value) : Number(val);
                      setPageSize(nextSize);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 10, label: "10 / page" },
                      { value: 25, label: "25 / page" },
                      { value: 50, label: "50 / page" },
                      { value: 100, label: "100 / page" },
                    ]}
                    id="table-page-size-select"
                  />
                </div>
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
          ADD NEW TEAM MEMBER MODAL (Matching Reference Mockup)
          ========================================================================= */}
      {isAddModalOpen && (
        <div className="amtv-modal-overlay" onClick={handleCloseAddModal}>
          <div
            className="amtv-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="amtv-modal-title"
          >
            {/* Modal Header */}
            <div className="amtv-modal-header">
              <h2 id="amtv-modal-title" className="amtv-modal-title">
                Add New Team Member
              </h2>
              <button
                type="button"
                className="amtv-modal-close"
                onClick={handleCloseAddModal}
                disabled={isSubmitting}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmitAddMember} className="amtv-modal-form">
              <div className="amtv-modal-body">
                {/* Alert Notification */}
                {actionAlert && (
                  <div
                    className={`amtv-alert-banner ${actionAlert.type === "success" ? "success" : "error"}`}
                  >
                    {actionAlert.type === "success" ? (
                      <Check size={16} className="amtv-alert-icon" />
                    ) : (
                      <AlertCircle size={16} className="amtv-alert-icon" />
                    )}
                    <span>{actionAlert.message}</span>
                  </div>
                )}

                {/* Section A: Employee Profile */}
                <div className="amtv-form-section">
                  <div className="amtv-section-header">
                    <User size={16} className="amtv-section-icon" />
                    <h3 className="amtv-section-title">Employee Profile</h3>
                  </div>

                  <div className="amtv-form-grid">
                    {/* Row 1: Select Employee (left) | Employee Code (right) */}
                    <div className="amtv-form-group" ref={empDropdownRef}>
                      <label className="amtv-label">
                        Select Employee <span className="amtv-required">*</span>
                      </label>
                      <div className="amtv-picker-container">
                        <button
                          type="button"
                          id="select-employee-trigger"
                          className="amtv-picker-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEmpDropdownOpen((prev) => !prev);
                          }}
                        >
                          <div className="amtv-picker-left">
                            <Search size={15} className="amtv-picker-search-icon" />
                            <span className={selectedEmp ? "amtv-picker-val" : "amtv-picker-placeholder"}>
                              {selectedEmp
                                ? `${selectedEmp.name} (${selectedEmp.emp_code || selectedEmp.id})`
                                : empSelectionMode === "new"
                                ? `+ New: ${formData.full_name || formData.emp_code}`
                                : "Search and select employee..."}
                            </span>
                          </div>
                          <ChevronDown size={15} className={`amtv-picker-chevron ${isEmpDropdownOpen ? "is-rotated" : ""}`} />
                        </button>

                        {/* Searchable Dropdown Popup Portaled */}
                        {isEmpDropdownOpen &&
                          typeof document !== "undefined" &&
                          createPortal(
                            <div
                              ref={empDropdownMenuRef}
                              className={`amtv-picker-dropdown amtv-picker-portal placement-${empDropdownCoords.placement}`}
                              style={{
                                position: "fixed",
                                top: `${empDropdownCoords.top}px`,
                                left: `${empDropdownCoords.left}px`,
                                width: `${empDropdownCoords.width}px`,
                                zIndex: 999999,
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <div className="amtv-picker-search-box">
                                <Search size={14} color="#7c3aed" />
                                <input
                                  type="text"
                                  autoFocus
                                  value={empSearchQuery}
                                  onChange={(e) => setEmpSearchQuery(e.target.value)}
                                  placeholder="Search employee by name, code..."
                                  className="amtv-picker-search-input"
                                />
                                {empSearchQuery && (
                                  <button
                                    type="button"
                                    className="amtv-picker-clear-search"
                                    onClick={() => setEmpSearchQuery("")}
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>

                              <div className="amtv-picker-list">
                                {/* Option: Create New Employee */}
                                <div
                                  id="option-create-new-employee"
                                  className="amtv-picker-item amtv-picker-create-new"
                                  onClick={handleSwitchToCreateNew}
                                >
                                  <div className="amtv-create-icon-wrap">
                                    <Plus size={14} color="#7c3aed" />
                                  </div>
                                  <div className="amtv-picker-item-meta">
                                    <strong className="amtv-create-title">+ Create New Employee Profile</strong>
                                    <span className="amtv-create-sub">Setup new employee profile</span>
                                  </div>
                                </div>

                                <div className="amtv-picker-divider" />

                                {/* List of existing employees */}
                                {filteredEmployees.length === 0 ? (
                                  <div className="amtv-picker-empty">
                                    No matching employees found in directory.
                                  </div>
                                ) : (
                                  filteredEmployees.map((emp) => {
                                    const empId = emp.emp_code || emp.id;
                                    const isCurrentManager = empId === (manager.emp_code || managerId);
                                    const isAlreadyInTeam = members.some(
                                      (m) => (m.emp_code || "").trim().toUpperCase() === String(empId || "").trim().toUpperCase()
                                    );
                                    const isSelected = selectedEmp && (selectedEmp.emp_code || selectedEmp.id) === empId;

                                    return (
                                      <div
                                        key={empId}
                                        className={`amtv-picker-item ${isSelected ? "selected" : ""}`}
                                        onClick={() => handleSelectExistingEmployee(emp)}
                                      >
                                        <div className="amtv-picker-avatar">
                                          {getInitials(emp.name)}
                                        </div>
                                        <div className="amtv-picker-item-meta">
                                          <div className="amtv-picker-item-top">
                                            <strong className="amtv-emp-name">{emp.name}</strong>
                                            <span className="amtv-emp-badge">{empId}</span>
                                          </div>
                                          <div className="amtv-picker-item-sub">
                                            <span>{emp.designation || "Employee"}</span>
                                            {isCurrentManager && (
                                              <span className="amtv-tag-manager">Manager</span>
                                            )}
                                            {isAlreadyInTeam && (
                                              <span className="amtv-tag-in-team">In Team</span>
                                            )}
                                          </div>
                                        </div>
                                        {isSelected && <Check size={14} color="#7c3aed" style={{ flexShrink: 0 }} />}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>,
                            document.body
                          )}
                      </div>
                    </div>

                    {/* Employee Code */}
                    <div className="amtv-form-group">
                      <label className="amtv-label">Employee Code</label>
                      <input
                        type="text"
                        name="emp_code"
                        value={formData.emp_code}
                        onChange={(e) => setFormData((prev) => ({ ...prev, emp_code: e.target.value.toUpperCase() }))}
                        disabled={empSelectionMode === "existing"}
                        placeholder="Auto-filled"
                        className={`amtv-input ${formErrors.emp_code ? "amtv-input-error" : ""}`}
                      />
                      {formErrors.emp_code && (
                        <span className="amtv-error-text">{formErrors.emp_code}</span>
                      )}
                    </div>

                    {/* Row 2: Full Name (left) | Email Address (right) */}
                    <div className="amtv-form-group">
                      <label className="amtv-label">
                        Full Name {empSelectionMode === "new" && <span className="amtv-required">*</span>}
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                        disabled={empSelectionMode === "existing"}
                        placeholder="Auto-filled"
                        className={`amtv-input ${formErrors.full_name ? "amtv-input-error" : ""}`}
                      />
                      {formErrors.full_name && (
                        <span className="amtv-error-text">{formErrors.full_name}</span>
                      )}
                    </div>

                    <div className="amtv-form-group">
                      <label className="amtv-label">
                        Email Address {empSelectionMode === "new" && <span className="amtv-required">*</span>}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        disabled={empSelectionMode === "existing"}
                        placeholder="Auto-filled"
                        className={`amtv-input ${formErrors.email ? "amtv-input-error" : ""}`}
                      />
                      {formErrors.email && (
                        <span className="amtv-error-text">{formErrors.email}</span>
                      )}
                    </div>

                    {/* Row 3: Contact Number (left) | Designation (right) */}
                    <div className="amtv-form-group">
                      <label className="amtv-label">Contact Number</label>
                      <input
                        type="tel"
                        name="contact"
                        value={formData.contact}
                        onChange={(e) => setFormData((prev) => ({ ...prev, contact: e.target.value }))}
                        disabled={empSelectionMode === "existing"}
                        placeholder="Auto-filled"
                        className="amtv-input"
                      />
                    </div>

                    <div className="amtv-form-group">
                      <label className="amtv-label">
                        Designation <span className="amtv-required">*</span>
                      </label>
                      <CustomSelect
                        name="designation"
                        value={formData.designation}
                        onChange={(val) => {
                          const nextVal = (val && typeof val === "object" && "target" in val) ? val.target.value : val;
                          setFormData((prev) => ({ ...prev, designation: nextVal }));
                          if (formErrors.designation) {
                            setFormErrors((prev) => ({ ...prev, designation: null }));
                          }
                        }}
                        options={designationsList.map((d) => ({ value: d, label: d }))}
                        placeholder="Select designation"
                        searchable={true}
                        error={Boolean(formErrors.designation)}
                        id="select-designation"
                      />
                      {formErrors.designation && (
                        <span className="amtv-error-text">{formErrors.designation}</span>
                      )}
                    </div>

                    {/* Row 4: Department (left) | Employment Type (right) */}
                    <div className="amtv-form-group">
                      <label className="amtv-label">
                        Department <span className="amtv-required">*</span>
                      </label>
                      <CustomSelect
                        name="department"
                        value={formData.department}
                        onChange={(val) => {
                          const nextVal = (val && typeof val === "object" && "target" in val) ? val.target.value : val;
                          setFormData((prev) => ({ ...prev, department: nextVal }));
                          if (formErrors.department) {
                            setFormErrors((prev) => ({ ...prev, department: null }));
                          }
                        }}
                        options={departmentsList.map((dept) => ({ value: dept, label: dept }))}
                        placeholder="Select department"
                        searchable={departmentsList.length > 8}
                        error={Boolean(formErrors.department)}
                        id="select-department"
                      />
                      {formErrors.department && (
                        <span className="amtv-error-text">{formErrors.department}</span>
                      )}
                    </div>

                    <div className="amtv-form-group">
                      <label className="amtv-label">Employment Type</label>
                      <CustomSelect
                        name="employment_type"
                        value={formData.employment_type}
                        onChange={(val) => {
                          const nextVal = (val && typeof val === "object" && "target" in val) ? val.target.value : val;
                          setFormData((prev) => ({ ...prev, employment_type: nextVal }));
                        }}
                        options={[
                          { value: "Regular Employee", label: "Regular Employee" },
                          { value: "Full-time", label: "Full-time" },
                          { value: "Intern", label: "Intern" },
                          { value: "Contract", label: "Contract" },
                          { value: "Part-time", label: "Part-time" },
                        ]}
                        id="select-employment-type"
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Employment & Team Assignment */}
                <div className="amtv-form-section">
                  <div className="amtv-section-header">
                    <Briefcase size={16} className="amtv-section-icon" />
                    <h3 className="amtv-section-title">Employment & Team Assignment</h3>
                  </div>

                  <div className="amtv-form-grid">
                    {/* Row 1: Work Location (left) | Reporting Manager (right) */}
                    <div className="amtv-form-group">
                      <label className="amtv-label">Work Location</label>
                      <CustomSelect
                        name="work_location"
                        value={formData.work_location}
                        onChange={(val) => {
                          const nextVal = (val && typeof val === "object" && "target" in val) ? val.target.value : val;
                          setFormData((prev) => ({ ...prev, work_location: nextVal }));
                        }}
                        options={locationsList.map((loc) => ({ value: loc, label: loc }))}
                        placeholder="Select work location"
                        id="select-work-location"
                      />
                    </div>

                    <div className="amtv-form-group">
                      <label className="amtv-label">
                        Reporting Manager <span className="amtv-required">*</span>
                      </label>
                      <CustomSelect
                        name="reporting_manager"
                        value={formData.reporting_manager}
                        onChange={(val) => {
                          const nextVal = (val && typeof val === "object" && "target" in val) ? val.target.value : val;
                          setFormData((prev) => ({ ...prev, reporting_manager: nextVal }));
                          if (formErrors.reporting_manager) {
                            setFormErrors((prev) => ({ ...prev, reporting_manager: null }));
                          }
                        }}
                        options={[
                          {
                            value: manager.emp_code || managerId,
                            label: manager.name ? `${manager.name} (${manager.emp_code || managerId})` : "Current Manager",
                            code: manager.emp_code || managerId
                          },
                          ...allManagers
                            .filter((m) => m.emp_code !== (manager.emp_code || managerId))
                            .map((m) => ({
                              value: m.emp_code,
                              label: `${m.name} (${m.emp_code})`,
                              code: m.emp_code
                            }))
                        ]}
                        searchable={true}
                        error={Boolean(formErrors.reporting_manager)}
                        id="select-reporting-manager"
                      />
                      {formErrors.reporting_manager && (
                        <span className="amtv-error-text">{formErrors.reporting_manager}</span>
                      )}
                    </div>

                    {/* Row 2: Joining Date (left) | Team Assignment (right) */}
                    <div className="amtv-form-group">
                      <label className="amtv-label">
                        Joining Date <span className="amtv-required">*</span>
                      </label>
                      <CustomDatePicker
                        value={formData.joining_date}
                        onChange={(dateStr) => {
                          setFormData((prev) => ({ ...prev, joining_date: dateStr }));
                          if (formErrors.joining_date) {
                            setFormErrors((prev) => ({ ...prev, joining_date: null }));
                          }
                        }}
                        placeholder="Select joining date..."
                        error={Boolean(formErrors.joining_date)}
                        id="joining-date-input"
                      />
                      {formErrors.joining_date && (
                        <span className="amtv-error-text">{formErrors.joining_date}</span>
                      )}
                    </div>

                    <div className="amtv-form-group">
                      <label className="amtv-label">
                        Team Assignment <span className="amtv-required">*</span>
                      </label>
                      <CustomSelect
                        name="team_assignment"
                        value={formData.team_assignment}
                        onChange={(val) => {
                          const nextVal = (val && typeof val === "object" && "target" in val) ? val.target.value : val;
                          setFormData((prev) => ({ ...prev, team_assignment: nextVal }));
                        }}
                        options={[
                          {
                            value: `${manager.name || "Manager"}'s Team (${members.length} members)`,
                            label: manager.name ? `${manager.name}'s Team (${members.length} members)` : "Current Manager's Team"
                          }
                        ]}
                        id="select-team-assignment"
                      />
                    </div>

                    {/* Row 3: Role / Portal Access (left) */}
                    <div className="amtv-form-group">
                      <label className="amtv-label">
                        Role / Portal Access <span className="amtv-required">*</span>
                      </label>
                      <CustomSelect
                        name="role"
                        value={formData.role}
                        onChange={(val) => {
                          const nextVal = (val && typeof val === "object" && "target" in val) ? val.target.value : val;
                          setFormData((prev) => ({ ...prev, role: nextVal }));
                        }}
                        options={[
                          { value: "Employee", label: "Employee" },
                          { value: "Team Leader", label: "Team Leader" },
                          { value: "Manager", label: "Manager" },
                          { value: "Admin", label: "Admin" }
                        ]}
                        id="select-role-access"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Linked Attendance Profile (Card) */}
                <div className="amtv-attendance-card">
                  <div className="amtv-att-card-header">
                    <div className="amtv-att-icon-box">
                      <Calendar size={18} color="#7c3aed" />
                    </div>
                    <div>
                      <h4 className="amtv-att-card-title">Attendance Profile (linked automatically)</h4>
                      <p className="amtv-att-card-sub">
                        Attendance details sync from existing attendance records after the member is assigned.
                      </p>
                    </div>
                  </div>

                  <div className="amtv-att-card-grid">
                    <div className="amtv-att-card-box">
                      <span className="amtv-att-box-lbl">Employee ID</span>
                      <input
                        type="text"
                        disabled
                        value={attendancePreview.emp_code}
                        className="amtv-att-box-input"
                      />
                    </div>
                    <div className="amtv-att-card-box">
                      <span className="amtv-att-box-lbl">Punch In</span>
                      <input
                        type="text"
                        disabled
                        value={attendancePreview.checkIn}
                        className="amtv-att-box-input"
                      />
                    </div>
                    <div className="amtv-att-card-box">
                      <span className="amtv-att-box-lbl">Punch Out</span>
                      <input
                        type="text"
                        disabled
                        value={attendancePreview.checkOut}
                        className="amtv-att-box-input"
                      />
                    </div>
                    <div className="amtv-att-card-box">
                      <span className="amtv-att-box-lbl">Working Hours</span>
                      <input
                        type="text"
                        disabled
                        value={attendancePreview.workingHours}
                        className="amtv-att-box-input"
                      />
                    </div>
                    <div className="amtv-att-card-box">
                      <span className="amtv-att-box-lbl">Attendance Status</span>
                      <input
                        type="text"
                        disabled
                        value={attendancePreview.status}
                        className="amtv-att-box-input"
                      />
                    </div>
                    <div className="amtv-att-card-box">
                      <span className="amtv-att-box-lbl">Leave Status</span>
                      <input
                        type="text"
                        disabled
                        value={attendancePreview.leave_status}
                        className="amtv-att-box-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Persistent Modal Footer */}
              <div className="amtv-modal-footer">
                <button
                  type="button"
                  id="btn-cancel-add-member"
                  className="amtv-btn-cancel"
                  onClick={handleCloseAddModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-add-member"
                  className="amtv-btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="amtv-spinner" />
                      <span>Saving...</span>
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
