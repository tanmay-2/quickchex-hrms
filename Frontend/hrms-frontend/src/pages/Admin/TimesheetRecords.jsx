// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - TIMESHEETRECORDS.JSX
// Path: Frontend/hrms-frontend/src/pages/Admin/TimesheetRecords.jsx
// Purpose: Web portal page component managing 'TimesheetRecords' views, user interactions, and state.
// UI Components:
//   • <MONTHS />
//   • <INITIAL_RECORDS />
//   • <PAGE_SIZE />
//   • <TimesheetRecords />
// Key Functions & Handlers:
//   • showToast()
//   • calcTotalEditHours()
//   • parseHrs()
//   • handleDownloadAllSummary()
//   • handleAddTimesheet()
//   • handleDownloadRowCSV()
//   • handleOpenEdit()
//   • handleSaveEdit()
//   • ... and 1 more handlers
// ==============================================================================

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Bell,
  ChevronDown,
  Search,
  Download,
  Pencil,
  List,
  Calendar,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Check,
  Eye,
  Plus,
  AlertCircle,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./TimesheetRecords.css";
import { getApiUrl } from "../../services/apiClient";

const MONTHS = [
  "January-2026",
  "February-2026",
  "March-2026",
  "April-2026",
  "May-2026",
  "June-2026",
  "July-2026",
  "August-2026",
  "September-2026",
  "October-2026",
  "November-2026",
  "December-2026",
];

const INITIAL_RECORDS = [
  {
    id: "EMP001",
    name: "Aaquib Khan",
    code: "ADM001",
    initials: "AK",
    avatarTone: "avatar-a",
    week1: "42:30 HRS",
    week2: "40:00 HRS",
    week3: "38:45 HRS",
    week4: "41:15 HRS",
    week5: "00:00 HRS",
    week6: "00:00 HRS",
    monthly: "162:30 HRS",
  },
  {
    id: "EMP002",
    name: "Payal Kaur",
    code: "EMP003",
    initials: "PK",
    avatarTone: "avatar-b",
    week1: "40:00 HRS",
    week2: "41:00 HRS",
    week3: "39:30 HRS",
    week4: "40:15 HRS",
    week5: "00:00 HRS",
    week6: "00:00 HRS",
    monthly: "160:45 HRS",
  },
  {
    id: "EMP003",
    name: "Payal Mishra",
    code: "LE249",
    initials: "PM",
    avatarTone: "avatar-c",
    week1: "39:00 HRS",
    week2: "40:30 HRS",
    week3: "41:00 HRS",
    week4: "38:45 HRS",
    week5: "00:00 HRS",
    week6: "00:00 HRS",
    monthly: "159:15 HRS",
  },
  {
    id: "EMP004",
    name: "Elena Rostova",
    code: "LE724",
    initials: "ER",
    avatarTone: "avatar-d",
    week1: "44:00 HRS",
    week2: "42:15 HRS",
    week3: "40:00 HRS",
    week4: "43:30 HRS",
    week5: "00:00 HRS",
    week6: "00:00 HRS",
    monthly: "169:45 HRS",
  },
  {
    id: "EMP005",
    name: "Kevin John",
    code: "MGR001",
    initials: "KJ",
    avatarTone: "avatar-a",
    week1: "40:00 HRS",
    week2: "40:00 HRS",
    week3: "40:00 HRS",
    week4: "40:00 HRS",
    week5: "00:00 HRS",
    week6: "00:00 HRS",
    monthly: "160:00 HRS",
  },
  {
    id: "EMP006",
    name: "Monika Tiwari",
    code: "MGR002",
    initials: "MT",
    avatarTone: "avatar-b",
    week1: "41:30 HRS",
    week2: "39:45 HRS",
    week3: "42:00 HRS",
    week4: "40:15 HRS",
    week5: "00:00 HRS",
    week6: "00:00 HRS",
    monthly: "163:30 HRS",
  },
];

const PAGE_SIZE = 10;

function TimesheetRecords() {
  const navigate = useNavigate();

  const [records, setRecords] = useState(INITIAL_RECORDS);

  useEffect(() => {
    fetch(getApiUrl("/profile/employees/"))
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((e, i) => {
            const tones = ["avatar-a", "avatar-b", "avatar-c", "avatar-d"];
            const empName = e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.emp_code;
            const initials = empName.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "EM";
            return {
              id: e.emp_code || e.id || `emp-${i + 1}`,
              name: empName,
              code: e.emp_code || "",
              initials,
              avatarTone: tones[i % tones.length],
              week1: "00:00 HRS",
              week2: "00:00 HRS",
              week3: "00:00 HRS",
              week4: "00:00 HRS",
              week5: "00:00 HRS",
              week6: "00:00 HRS",
              monthly: "00:00 HRS",
            };
          });
          setRecords(mapped);
        }
      })
      .catch((err) => console.warn("Failed to load employees in TimesheetRecords:", err));
  }, []);
  const [selectedMonth, setSelectedMonth] = useState("August-2026");
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Feedback
  const [editModalEmployee, setEditModalEmployee] = useState(null);
  const [viewRecordModal, setViewRecordModal] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Add Timesheet Form States
  const [addEmployeeId, setAddEmployeeId] = useState("");
  const [addProject, setAddProject] = useState("HRMS Portal Development");
  const [addTask, setAddTask] = useState("Feature Implementation & UI Polish");
  const [addHours, setAddHours] = useState("8.0");
  const [addDescription, setAddDescription] = useState("");

  // Initialize selected employee for Add Timesheet
  useEffect(() => {
    if (records.length > 0 && !addEmployeeId) {
      setAddEmployeeId(records[0].id);
    }
  }, [records, addEmployeeId]);

  // Lock background scrolling when any modal is open
  useEffect(() => {
    if (editModalEmployee || viewRecordModal || addModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [editModalEmployee, viewRecordModal, addModalOpen]);

  // Dismiss dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target)) {
        setMonthDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMonthDropdownOpen(false);
        setEditModalEmployee(null);
        setViewRecordModal(null);
        setAddModalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Edit Form Fields
  const [editWeeks, setEditWeeks] = useState({
    week1: "00:00",
    week2: "00:00",
    week3: "00:00",
    week4: "00:00",
    week5: "00:00",
    week6: "00:00",
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Live calculation of hours in Edit Timesheet Hours Modal
  const calcTotalEditHours = () => {
    const parseHrs = (str) => {
      const [h = "0", m = "0"] = (str || "00:00").split(":");
      return (parseFloat(h) || 0) + ((parseFloat(m) || 0) / 60);
    };
    const total =
      parseHrs(editWeeks.week1) +
      parseHrs(editWeeks.week2) +
      parseHrs(editWeeks.week3) +
      parseHrs(editWeeks.week4) +
      parseHrs(editWeeks.week5) +
      parseHrs(editWeeks.week6);
    const hours = Math.floor(total);
    const minutes = Math.round((total % 1) * 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} HRS`;
  };

  // Summary Metrics
  const totalApproved = useMemo(() => {
    return records.filter((r) => {
      const hrs = parseFloat((r.monthly || "0").replace(" HRS", "").replace(":", "."));
      return hrs >= 160;
    }).length || 28;
  }, [records]);

  const totalPending = useMemo(() => {
    return records.filter((r) => {
      const hrs = parseFloat((r.monthly || "0").replace(" HRS", "").replace(":", "."));
      return hrs > 0 && hrs < 160;
    }).length || 3;
  }, [records]);

  const totalNotSubmitted = useMemo(() => {
    return Math.max(0, 31 - totalApproved - totalPending);
  }, [totalApproved, totalPending]);

  const handleDownloadAllSummary = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Employee Name,Emp Code,Month,Week 1,Week 2,Week 3,Week 4,Week 5,Week 6,Monthly Hours"]
        .concat(
          records.map(
            (r) =>
              `"${r.name}",${r.code},${selectedMonth},${r.week1},${r.week2},${r.week3},${r.week4},${r.week5},${r.week6},${r.monthly}`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timesheet_summary_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded timesheet summary for ${selectedMonth}`);
  };

  const handleAddTimesheet = (e) => {
    e.preventDefault();
    const emp = records.find((r) => r.id === addEmployeeId) || records[0];
    showToast(`Timesheet logged: ${addHours} hrs for ${emp ? emp.name : "Employee"}`);
    setAddModalOpen(false);
    setAddHours("8.0");
    setAddDescription("");
  };

  // Filter records by search
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.code.toLowerCase().includes(query)
    );
  }, [records, search]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, currentPage]);

  const handleDownloadRowCSV = (emp, e) => {
    e.stopPropagation();
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Employee Name,Emp Code,Month,Week 1,Week 2,Week 3,Week 4,Week 5,Week 6,Monthly Hours"]
        .concat([
          `"${emp.name}",${emp.code},${selectedMonth},${emp.week1},${emp.week2},${emp.week3},${emp.week4},${emp.week5},${emp.week6},${emp.monthly}`
        ])
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timesheet_record_${emp.code}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded timesheet record for ${emp.name}`);
  };

  const handleOpenEdit = (emp, e) => {
    e.stopPropagation();
    setEditModalEmployee(emp);
    setEditWeeks({
      week1: emp.week1.replace(" HRS", ""),
      week2: emp.week2.replace(" HRS", ""),
      week3: emp.week3.replace(" HRS", ""),
      week4: emp.week4.replace(" HRS", ""),
      week5: emp.week5.replace(" HRS", ""),
      week6: emp.week6.replace(" HRS", ""),
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editModalEmployee) return;

    // Calculate total hours sum
    const parseHrs = (str) => {
      const [h = "0", m = "0"] = (str || "00:00").split(":");
      return parseFloat(h) + (parseFloat(m) / 60 || 0);
    };

    const totalHoursNum =
      parseHrs(editWeeks.week1) +
      parseHrs(editWeeks.week2) +
      parseHrs(editWeeks.week3) +
      parseHrs(editWeeks.week4) +
      parseHrs(editWeeks.week5) +
      parseHrs(editWeeks.week6);

    const totalHoursStr = `${Math.floor(totalHoursNum).toString().padStart(2, "0")}:${Math.round(
      (totalHoursNum % 1) * 60
    )
      .toString()
      .padStart(2, "0")} HRS`;

    setRecords((prev) =>
      prev.map((r) =>
        r.id === editModalEmployee.id
          ? {
            ...r,
            week1: `${editWeeks.week1} HRS`,
            week2: `${editWeeks.week2} HRS`,
            week3: `${editWeeks.week3} HRS`,
            week4: `${editWeeks.week4} HRS`,
            week5: `${editWeeks.week5} HRS`,
            week6: `${editWeeks.week6} HRS`,
            monthly: totalHoursStr,
          }
          : r
      )
    );

    setEditModalEmployee(null);
    showToast(`Updated weekly hours for ${editModalEmployee.name}`);
  };

  const handleOpenViewRecord = (emp, e) => {
    e.stopPropagation();
    setViewRecordModal(emp);
  };

  const profileName =
    window.localStorage.getItem("user_name") ||
    window.localStorage.getItem("name") ||
    "RV";

  return (
    <div className="timesheet-records-page">
      <DashboardHeader />

      {/* =====================================================
          PAGE BODY & CARD
          ===================================================== */}
      <div className="tr-body">
        {/* =====================================================
            STANDARDIZED SUMMARY CARDS
            ===================================================== */}
        <div className="tr-summary-cards-grid">
          <div className="tr-summary-card approved">
            <div className="tr-summary-card-inner">
              <div className="tr-summary-icon approved">
                <CheckCircle2 size={22} />
              </div>
              <div className="tr-summary-text-wrap">
                <span className="tr-summary-heading">Total Approved Timesheets</span>
                <span className="tr-summary-number">{totalApproved}</span>
              </div>
            </div>
            <button
              type="button"
              className="tr-summary-card-btn"
              onClick={handleDownloadAllSummary}
              title="Download Approved Timesheets"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
          </div>

          <div className="tr-summary-card pending">
            <div className="tr-summary-card-inner">
              <div className="tr-summary-icon pending">
                <Clock size={22} />
              </div>
              <div className="tr-summary-text-wrap">
                <span className="tr-summary-heading">Timesheets Pending Approval</span>
                <span className="tr-summary-number">{totalPending}</span>
              </div>
            </div>
            <button
              type="button"
              className="tr-summary-card-btn"
              onClick={() => navigate("/dashboard/timesheet-requests")}
              title="Review Pending Requests"
            >
              <FileSpreadsheet size={14} />
              <span>Approve / Reject</span>
            </button>
          </div>

          <div className="tr-summary-card not-submitted">
            <div className="tr-summary-card-inner">
              <div className="tr-summary-icon not-submitted">
                <FileSpreadsheet size={22} />
              </div>
              <div className="tr-summary-text-wrap">
                <span className="tr-summary-heading">Timesheets Not Submitted</span>
                <span className="tr-summary-number">{totalNotSubmitted}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="tr-top-bar">
          <h2 className="tr-section-title">Timesheet Records</h2>

          <div className="tr-controls">
            {/* Search Box */}
            <div className="tr-search-wrap">
              <input
                type="text"
                placeholder="Search employee"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="tr-search-input"
              />
            </div>

            {/* Premium Month Selector */}
            <div className="tr-premium-month-wrap" ref={monthDropdownRef}>
              <button
                type="button"
                className={`tr-premium-month-trigger ${monthDropdownOpen ? "is-open" : ""}`}
                onClick={() => setMonthDropdownOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={monthDropdownOpen}
              >
                <Calendar size={15} />
                <span>{selectedMonth.replace("-", " ")}</span>
                <ChevronDown size={14} className={monthDropdownOpen ? "is-rotated" : ""} />
              </button>

              {monthDropdownOpen && (
                <div className="tr-premium-month-popover" role="listbox">
                  <div className="tr-premium-month-scroll">
                    {MONTHS.map((m) => {
                      const isSelected = selectedMonth === m;
                      const displayMonth = m.replace("-", " ");
                      return (
                        <button
                          key={m}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`tr-premium-month-option ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            setSelectedMonth(m);
                            setMonthDropdownOpen(false);
                            showToast(`Viewing ${displayMonth}`);
                          }}
                        >
                          <span>{displayMonth}</span>
                          {isSelected && <Check size={14} className="tr-premium-month-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Add Timesheet Button */}
            <button
              type="button"
              className="tr-add-timesheet-btn"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus size={16} />
              <span>Add Timesheet</span>
            </button>
          </div>
        </div>

        {/* =====================================================
            DESKTOP TABLE (HIDDEN ON MOBILE <=768px)
            ===================================================== */}
        <div className="tr-table-card tr-desktop-only">
          <table className="tr-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Week 1</th>
                <th>Week 2</th>
                <th>Week 3</th>
                <th>Week 4</th>
                <th>Week 5</th>
                <th>Week 6</th>
                <th className="col-monthly">MONTHLY HOURS</th>
                <th className="col-actions">ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "48px 20px" }}>
                    No Timesheet Records Found.
                  </td>
                </tr>
              ) : (
                currentRecords.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className="tr-emp-cell">
                        <div className={`tr-emp-avatar ${emp.avatarTone}`}>
                          {emp.initials}
                        </div>
                        <span className="tr-emp-name">
                          {emp.name} - {emp.code}
                        </span>
                      </div>
                    </td>

                    <td className="tr-hours-cell">{emp.week1}</td>
                    <td className="tr-hours-cell">{emp.week2}</td>
                    <td className="tr-hours-cell">{emp.week3}</td>
                    <td className="tr-hours-cell">{emp.week4}</td>
                    <td className="tr-hours-cell">{emp.week5}</td>
                    <td className="tr-hours-cell">{emp.week6}</td>
                    <td className="tr-hours-cell monthly">{emp.monthly}</td>

                    <td>
                      <div className="tr-action-btns">
                        <button
                          type="button"
                          className="tr-row-btn"
                          title="Download Timesheet CSV"
                          onClick={(e) => handleDownloadRowCSV(emp, e)}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          className="tr-row-btn"
                          title="Edit Weekly Hours"
                          onClick={(e) => handleOpenEdit(emp, e)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="tr-row-btn"
                          title="View Timesheet Detail"
                          onClick={(e) => handleOpenViewRecord(emp, e)}
                        >
                          <List size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================================
            MOBILE CARDS VIEW (SHOWN ON MOBILE <=768px)
            ===================================================== */}
        <div className="tr-mobile-cards-list tr-mobile-only">
          {currentRecords.length === 0 ? (
            <div className="tr-mob-empty-card">
              <Clock size={32} />
              <h4>No Timesheet Records Found</h4>
              <p>Try searching for another employee or selecting a different month.</p>
            </div>
          ) : (
            currentRecords.map((emp) => (
              <div
                key={emp.id}
                className="tr-mob-card"
                onClick={(e) => handleOpenViewRecord(emp, e)}
              >
                {/* Card Header: Avatar, Name & Code, Monthly Total Hours */}
                <div className="tr-mob-card-head">
                  <div className="tr-mob-card-emp">
                    <div className={`tr-mob-card-avatar ${emp.avatarTone}`}>
                      {emp.initials}
                    </div>
                    <div className="tr-mob-card-meta">
                      <span className="tr-mob-card-name">{emp.name}</span>
                      <span className="tr-mob-card-code">{emp.code}</span>
                    </div>
                  </div>
                  <div className="tr-mob-monthly-badge">
                    <Clock size={11} />
                    <span>{emp.monthly}</span>
                  </div>
                </div>

                {/* Weekly Breakdown Grid: 6 Weeks */}
                <div className="tr-mob-weeks-grid">
                  <div className="tr-mob-week-item">
                    <span className="tr-mob-week-lbl">W1</span>
                    <span className="tr-mob-week-val">{emp.week1.replace(" HRS", "")}</span>
                  </div>
                  <div className="tr-mob-week-item">
                    <span className="tr-mob-week-lbl">W2</span>
                    <span className="tr-mob-week-val">{emp.week2.replace(" HRS", "")}</span>
                  </div>
                  <div className="tr-mob-week-item">
                    <span className="tr-mob-week-lbl">W3</span>
                    <span className="tr-mob-week-val">{emp.week3.replace(" HRS", "")}</span>
                  </div>
                  <div className="tr-mob-week-item">
                    <span className="tr-mob-week-lbl">W4</span>
                    <span className="tr-mob-week-val">{emp.week4.replace(" HRS", "")}</span>
                  </div>
                  <div className="tr-mob-week-item">
                    <span className="tr-mob-week-lbl">W5</span>
                    <span className="tr-mob-week-val">{emp.week5.replace(" HRS", "")}</span>
                  </div>
                  <div className="tr-mob-week-item">
                    <span className="tr-mob-week-lbl">W6</span>
                    <span className="tr-mob-week-val">{emp.week6.replace(" HRS", "")}</span>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="tr-mob-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="tr-mob-act-btn details"
                    onClick={(e) => handleOpenViewRecord(emp, e)}
                  >
                    <Eye size={13} />
                    <span>View Details</span>
                  </button>
                  <button
                    type="button"
                    className="tr-mob-act-btn edit"
                    onClick={(e) => handleOpenEdit(emp, e)}
                  >
                    <Pencil size={13} />
                    <span>Edit Hours</span>
                  </button>
                  <button
                    type="button"
                    className="tr-mob-act-btn download"
                    title="Download CSV"
                    onClick={(e) => handleDownloadRowCSV(emp, e)}
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* =====================================================
            PAGINATION
            ===================================================== */}
        <div className="tr-pagination-wrap">
          <button
            type="button"
            className="tr-page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              className={`tr-page-btn ${currentPage === pageNum ? "is-active" : ""}`}
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </button>
          ))}

          <button
            type="button"
            className="tr-page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      </div>

      {/* =====================================================
          EDIT WEEKLY HOURS MODAL
          ===================================================== */}
      {editModalEmployee && (
        <div className="tr-modal-overlay" onClick={() => setEditModalEmployee(null)}>
          <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tr-modal-drag-handle" />
            <div className="tr-modal-head">
              <h3>Edit Timesheet Hours - {editModalEmployee.name}</h3>
              <button
                type="button"
                className="tr-modal-close"
                onClick={() => setEditModalEmployee(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="tr-modal-form">
              <div className="tr-modal-body">
                <div className="tr-grid-inputs">
                  <div className="tr-form-group">
                    <label>
                      Week 1 (HH:MM) <span className="tr-required">*</span>
                    </label>
                    <div className="tr-input-icon-wrap">
                      <input
                        type="text"
                        placeholder="00:00"
                        value={editWeeks.week1}
                        onChange={(e) =>
                          setEditWeeks((prev) => ({ ...prev, week1: e.target.value }))
                        }
                        required
                      />
                      <Clock size={16} className="tr-input-clock" />
                    </div>
                  </div>

                  <div className="tr-form-group">
                    <label>
                      Week 2 (HH:MM) <span className="tr-required">*</span>
                    </label>
                    <div className="tr-input-icon-wrap">
                      <input
                        type="text"
                        placeholder="00:00"
                        value={editWeeks.week2}
                        onChange={(e) =>
                          setEditWeeks((prev) => ({ ...prev, week2: e.target.value }))
                        }
                        required
                      />
                      <Clock size={16} className="tr-input-clock" />
                    </div>
                  </div>

                  <div className="tr-form-group">
                    <label>
                      Week 3 (HH:MM) <span className="tr-required">*</span>
                    </label>
                    <div className="tr-input-icon-wrap">
                      <input
                        type="text"
                        placeholder="00:00"
                        value={editWeeks.week3}
                        onChange={(e) =>
                          setEditWeeks((prev) => ({ ...prev, week3: e.target.value }))
                        }
                        required
                      />
                      <Clock size={16} className="tr-input-clock" />
                    </div>
                  </div>

                  <div className="tr-form-group">
                    <label>
                      Week 4 (HH:MM) <span className="tr-required">*</span>
                    </label>
                    <div className="tr-input-icon-wrap">
                      <input
                        type="text"
                        placeholder="00:00"
                        value={editWeeks.week4}
                        onChange={(e) =>
                          setEditWeeks((prev) => ({ ...prev, week4: e.target.value }))
                        }
                        required
                      />
                      <Clock size={16} className="tr-input-clock" />
                    </div>
                  </div>

                  <div className="tr-form-group">
                    <label>
                      Week 5 (HH:MM) <span className="tr-required">*</span>
                    </label>
                    <div className="tr-input-icon-wrap">
                      <input
                        type="text"
                        placeholder="00:00"
                        value={editWeeks.week5}
                        onChange={(e) =>
                          setEditWeeks((prev) => ({ ...prev, week5: e.target.value }))
                        }
                        required
                      />
                      <Clock size={16} className="tr-input-clock" />
                    </div>
                  </div>

                  <div className="tr-form-group">
                    <label>
                      Week 6 (HH:MM) <span className="tr-required">*</span>
                    </label>
                    <div className="tr-input-icon-wrap">
                      <input
                        type="text"
                        placeholder="00:00"
                        value={editWeeks.week6}
                        onChange={(e) =>
                          setEditWeeks((prev) => ({ ...prev, week6: e.target.value }))
                        }
                        required
                      />
                      <Clock size={16} className="tr-input-clock" />
                    </div>
                  </div>
                </div>

                {/* Total Monthly Hours Card with Sigma Icon (matching screenshot 2) */}
                <div className="tr-edit-total-card">
                  <div className="tr-sigma-badge">∑</div>
                  <div className="tr-edit-total-content">
                    <span className="tr-edit-total-lbl">Total Monthly Hours</span>
                    <span className="tr-edit-total-val">{calcTotalEditHours()}</span>
                  </div>
                </div>
              </div>

              <div className="tr-modal-foot side-by-side">
                <button
                  type="button"
                  className="tr-btn-cancel"
                  onClick={() => setEditModalEmployee(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="tr-btn-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW RECORD DETAIL MODAL (MONTHLY SUMMARY)
          ===================================================== */}
      {viewRecordModal && (
        <div className="tr-modal-overlay" onClick={() => setViewRecordModal(null)}>
          <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tr-modal-drag-handle" />
            <div className="tr-modal-head">
              <h3>Monthly Summary - {viewRecordModal.name}</h3>
              <button
                type="button"
                className="tr-modal-close"
                onClick={() => setViewRecordModal(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tr-modal-body">
              <div className="tr-summary-emp-row">
                <div className={`tr-summary-avatar ${viewRecordModal.avatarTone}`}>
                  {viewRecordModal.initials}
                </div>
                <div className="tr-summary-emp-info">
                  <strong className="tr-summary-emp-name">
                    {viewRecordModal.name} - ({viewRecordModal.code})
                  </strong>
                  <span className="tr-summary-emp-month">
                    Month: {selectedMonth}
                  </span>
                </div>
                <button
                  type="button"
                  className="tr-summary-link-btn"
                  title="View Daily Breakdown"
                  onClick={() => {
                    navigate(`/dashboard/timesheet-requests/${viewRecordModal.id}`);
                  }}
                >
                  Daily Breakdown →
                </button>
              </div>

              {/* 6 Weekly Hours Cards (matching screenshot 1) */}
              <div className="tr-summary-weeks-grid">
                <div className="tr-summary-week-card">
                  <span className="tr-summary-week-lbl">Week 1</span>
                  <span className="tr-summary-week-val">{viewRecordModal.week1}</span>
                </div>
                <div className="tr-summary-week-card">
                  <span className="tr-summary-week-lbl">Week 2</span>
                  <span className="tr-summary-week-val">{viewRecordModal.week2}</span>
                </div>
                <div className="tr-summary-week-card">
                  <span className="tr-summary-week-lbl">Week 3</span>
                  <span className="tr-summary-week-val">{viewRecordModal.week3}</span>
                </div>
                <div className="tr-summary-week-card">
                  <span className="tr-summary-week-lbl">Week 4</span>
                  <span className="tr-summary-week-val">{viewRecordModal.week4}</span>
                </div>
                <div className="tr-summary-week-card">
                  <span className="tr-summary-week-lbl">Week 5</span>
                  <span className="tr-summary-week-val">{viewRecordModal.week5}</span>
                </div>
                <div className="tr-summary-week-card">
                  <span className="tr-summary-week-lbl">Week 6</span>
                  <span className="tr-summary-week-val">{viewRecordModal.week6}</span>
                </div>
              </div>

              {/* Total Monthly Hours Card (matching screenshot 1) */}
              <div className="tr-summary-total-card">
                <div className="tr-summary-total-icon">
                  <Calendar size={20} />
                </div>
                <div className="tr-summary-total-content">
                  <span className="tr-summary-total-lbl">Total Monthly Hours</span>
                  <span className="tr-summary-total-val">{viewRecordModal.monthly}</span>
                </div>
              </div>
            </div>

            <div className="tr-modal-foot">
              <button
                type="button"
                className="tr-btn-submit tr-btn-full"
                onClick={() => setViewRecordModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD TIMESHEET MODAL
          ===================================================== */}
      {addModalOpen && (
        <div className="tr-modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tr-modal-drag-handle" />
            <div className="tr-modal-head">
              <h3>Add Timesheet Record</h3>
              <button
                type="button"
                className="tr-modal-close"
                onClick={() => setAddModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTimesheet} className="tr-modal-form">
              <div className="tr-modal-body">
                <div className="tr-form-group">
                  <label>
                    Employee <span className="tr-required">*</span>
                  </label>
                  <div className="tr-select-wrap">
                    <select
                      value={addEmployeeId}
                      onChange={(e) => setAddEmployeeId(e.target.value)}
                      required
                    >
                      {records.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="tr-select-chevron" />
                  </div>
                </div>

                <div className="tr-form-group">
                  <label>
                    Project Name <span className="tr-required">*</span>
                  </label>
                  <div className="tr-select-wrap">
                    <select
                      value={addProject}
                      onChange={(e) => setAddProject(e.target.value)}
                      required
                    >
                      <option value="HRMS Portal Development">HRMS Portal Development</option>
                      <option value="Attendance & Biometric Sync">Attendance & Biometric Sync</option>
                      <option value="Payroll Processing Module">Payroll Processing Module</option>
                      <option value="Employee Self Service Portal">Employee Self Service Portal</option>
                      <option value="Client Site Deployment">Client Site Deployment</option>
                    </select>
                    <ChevronDown size={16} className="tr-select-chevron" />
                  </div>
                </div>

                <div className="tr-form-group">
                  <label>
                    Task / Activity <span className="tr-required">*</span>
                  </label>
                  <div className="tr-select-wrap">
                    <select
                      value={addTask}
                      onChange={(e) => setAddTask(e.target.value)}
                      required
                    >
                      <option value="Feature Implementation & UI Polish">Feature Implementation & UI Polish</option>
                      <option value="Bug Fixing & Code Optimization">Bug Fixing & Code Optimization</option>
                      <option value="API Integration & Testing">API Integration & Testing</option>
                      <option value="Database Schema Migration">Database Schema Migration</option>
                      <option value="UI/UX Responsiveness & Layout Review">UI/UX Responsiveness & Layout Review</option>
                      <option value="Client Meeting & Requirement Analysis">Client Meeting & Requirement Analysis</option>
                    </select>
                    <ChevronDown size={16} className="tr-select-chevron" />
                  </div>
                </div>

                <div className="tr-form-group">
                  <label>
                    Hours Worked <span className="tr-required">*</span>
                  </label>
                  <div className="tr-input-suffix-wrap">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      required
                      placeholder="8.0"
                      value={addHours}
                      onChange={(e) => setAddHours(e.target.value)}
                    />
                    <span className="tr-input-suffix">hrs</span>
                  </div>
                </div>

                <div className="tr-form-group">
                  <label>Description / Notes</label>
                  <div className="tr-textarea-wrap">
                    <textarea
                      placeholder="Provide details about the work done..."
                      value={addDescription}
                      maxLength={500}
                      onChange={(e) => setAddDescription(e.target.value)}
                    />
                    <span className="tr-char-counter">{addDescription.length}/500</span>
                  </div>
                </div>
              </div>

              <div className="tr-modal-foot side-by-side">
                <button
                  type="button"
                  className="tr-btn-cancel"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="tr-btn-submit">
                  Save Timesheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMessage && <div className="tr-toast">{toastMessage}</div>}
    </div>
  );
}

export default TimesheetRecords;
