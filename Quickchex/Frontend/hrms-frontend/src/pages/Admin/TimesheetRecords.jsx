import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./TimesheetRecords.css";

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

const INITIAL_RECORDS = [];

const PAGE_SIZE = 10;

function TimesheetRecords() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/profile/employees/")
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
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Feedback
  const [editModalEmployee, setEditModalEmployee] = useState(null);
  const [viewRecordModal, setViewRecordModal] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

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

            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                showToast(`Viewing ${e.target.value}`);
              }}
              className="tr-month-select"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* =====================================================
            TIMESHEET RECORDS TABLE
            ===================================================== */}
        <div className="tr-table-card">
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
            <div className="tr-modal-head">
              <h3>Edit Timesheet Hours - {editModalEmployee.name}</h3>
              <button
                type="button"
                className="tr-modal-close"
                onClick={() => setEditModalEmployee(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="tr-modal-body">
                <div className="tr-grid-inputs">
                  <div className="tr-form-group">
                    <label>Week 1 (HH:MM)</label>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={editWeeks.week1}
                      onChange={(e) =>
                        setEditWeeks((prev) => ({ ...prev, week1: e.target.value }))
                      }
                    />
                  </div>

                  <div className="tr-form-group">
                    <label>Week 2 (HH:MM)</label>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={editWeeks.week2}
                      onChange={(e) =>
                        setEditWeeks((prev) => ({ ...prev, week2: e.target.value }))
                      }
                    />
                  </div>

                  <div className="tr-form-group">
                    <label>Week 3 (HH:MM)</label>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={editWeeks.week3}
                      onChange={(e) =>
                        setEditWeeks((prev) => ({ ...prev, week3: e.target.value }))
                      }
                    />
                  </div>

                  <div className="tr-form-group">
                    <label>Week 4 (HH:MM)</label>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={editWeeks.week4}
                      onChange={(e) =>
                        setEditWeeks((prev) => ({ ...prev, week4: e.target.value }))
                      }
                    />
                  </div>

                  <div className="tr-form-group">
                    <label>Week 5 (HH:MM)</label>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={editWeeks.week5}
                      onChange={(e) =>
                        setEditWeeks((prev) => ({ ...prev, week5: e.target.value }))
                      }
                    />
                  </div>

                  <div className="tr-form-group">
                    <label>Week 6 (HH:MM)</label>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={editWeeks.week6}
                      onChange={(e) =>
                        setEditWeeks((prev) => ({ ...prev, week6: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="tr-modal-foot">
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
          VIEW RECORD DETAIL MODAL
          ===================================================== */}
      {viewRecordModal && (
        <div className="tr-modal-overlay" onClick={() => setViewRecordModal(null)}>
          <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tr-modal-head">
              <h3>Monthly Summary - {viewRecordModal.name}</h3>
              <button
                type="button"
                className="tr-modal-close"
                onClick={() => setViewRecordModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tr-modal-body">
              <div className="tr-emp-cell" style={{ marginBottom: "12px" }}>
                <div className={`tr-emp-avatar ${viewRecordModal.avatarTone}`}>
                  {viewRecordModal.initials}
                </div>
                <div className="tr-emp-info">
                  <strong style={{ fontSize: "15px" }}>
                    {viewRecordModal.name} - ({viewRecordModal.code})
                  </strong>
                  <span style={{ color: "var(--tr-ink-muted)", fontSize: "12.5px" }}>
                    Month: {selectedMonth}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  background: "var(--tr-canvas)",
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid var(--tr-border)",
                }}
              >
                <div><strong>Week 1:</strong> {viewRecordModal.week1}</div>
                <div><strong>Week 2:</strong> {viewRecordModal.week2}</div>
                <div><strong>Week 3:</strong> {viewRecordModal.week3}</div>
                <div><strong>Week 4:</strong> {viewRecordModal.week4}</div>
                <div><strong>Week 5:</strong> {viewRecordModal.week5}</div>
                <div><strong>Week 6:</strong> {viewRecordModal.week6}</div>
                <div style={{ gridColumn: "span 2", paddingTop: "8px", borderTop: "1px solid var(--tr-border)", color: "var(--tr-purple)", fontWeight: 700 }}>
                  Total Monthly Hours: {viewRecordModal.monthly}
                </div>
              </div>
            </div>

            <div className="tr-modal-foot">
              <button
                type="button"
                className="tr-btn-cancel"
                onClick={() => {
                  navigate(`/dashboard/timesheet-requests/${viewRecordModal.id}`);
                }}
              >
                Open Daily Breakdown
              </button>
              <button
                type="button"
                className="tr-btn-submit"
                onClick={() => setViewRecordModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMessage && <div className="tr-toast">{toastMessage}</div>}
    </div>
  );
}

export default TimesheetRecords;
