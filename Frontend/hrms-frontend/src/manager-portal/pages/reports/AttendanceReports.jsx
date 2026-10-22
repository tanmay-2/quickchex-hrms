import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ManagerTable } from "../../components/ManagerTable";
import { ManagerSelect } from "../../components/ManagerSelect";
import {
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  Download,
  ChevronRight,
  TrendingUp,
  MinusCircle,
  PauseCircle,
  LogOut,
  X,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import { managerToast } from "../../components/ManagerToast";
import {
  getTeam,
  getTodayAttendance,
  getAttendanceMatrix,
} from "../../services/managerApiService";
import "./Reports.css";

const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(d.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

// Pastel palette for employee avatars
const AVATAR_PALETTES = [
  { bg: "#EDE9FE", color: "#6D44F5" }, // Purple
  { bg: "#E0F2FE", color: "#0284C7" }, // Blue
  { bg: "#FFE4E6", color: "#E11D48" }, // Rose
  { bg: "#DCFCE7", color: "#16A34A" }, // Emerald
  { bg: "#FEF3C7", color: "#D97706" }, // Amber
  { bg: "#F3E8FF", color: "#9333EA" }, // Violet
];

const getAvatarStyle = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
};

const getInitials = (name = "") => {
  if (!name) return "EM";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

export const AttendanceReports = () => {
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  // Fetch team, today attendance, and monthly matrix dynamically
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const parts = (selectedMonth || "").split(" ");
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const monthIndex = monthNames.findIndex(
        (mn) => mn.toLowerCase() === (parts[0] || "").toLowerCase()
      );
      const targetMonth = monthIndex >= 0 ? monthIndex + 1 : new Date().getMonth() + 1;
      const targetYear = parseInt(parts[1], 10) || new Date().getFullYear();

      const [teamRes, attRes, matrixRes] = await Promise.allSettled([
        getTeam(),
        getTodayAttendance(),
        getAttendanceMatrix(targetMonth, targetYear),
      ]);

      const team =
        teamRes.status === "fulfilled" && Array.isArray(teamRes.value) ? teamRes.value : [];
      const att =
        attRes.status === "fulfilled" && Array.isArray(attRes.value) ? attRes.value : [];
      const mat =
        matrixRes.status === "fulfilled" && matrixRes.value ? matrixRes.value : null;

      setTeamMembers(team);
      setAttendance(att);
      setMatrixData(mat);
    } catch (err) {
      console.error("Failed to load report data:", err);
      setTeamMembers([]);
      setAttendance([]);
      setMatrixData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData();
    window.addEventListener("attendance-updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    return () => {
      window.removeEventListener("attendance-updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, [fetchData]);

  // Dynamically compute report rows per member
  const reportRows = useMemo(() => {
    const attMap = {};
    attendance.forEach((a) => {
      attMap[a.emp_code] = a;
    });

    const matrixMap = {};
    if (matrixData?.team && Array.isArray(matrixData.team)) {
      matrixData.team.forEach((mt) => {
        matrixMap[mt.emp_code] = mt;
      });
    }

    return teamMembers.map((m, idx) => {
      const rec = attMap[m.emp_code] || {};
      const name = m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.emp_code;
      const matMem = matrixMap[m.emp_code];

      // If monthly matrix data is available for selected month
      if (matMem) {
        const pDays = matMem.present ?? 0;
        const aDays = matMem.absent ?? 0;
        const hDays = matMem.half_day ?? 0;
        const lDays = matMem.leave ?? 0;
        const totalWorkingDays = (matMem.days || []).length || (matrixData?.days_in_month || 30);
        const lMarks = (matMem.days || []).filter(
          (d) =>
            (d.status || "").toLowerCase().includes("late") ||
            d.badge === "L" ||
            d.badge === "HD2"
        ).length;

        let totalHrs = 0;
        (matMem.days || []).forEach((d) => {
          if (d.working_hours) {
            const h = parseFloat(d.working_hours);
            if (!isNaN(h)) totalHrs += h;
          } else if (d.badge === "P" || d.badge === "IP") {
            totalHrs += 8.5;
          } else if (d.badge === "HD2") {
            totalHrs += 4.5;
          }
        });
        if (totalHrs === 0 && pDays > 0) totalHrs = pDays * 8.5;

        const rate = totalWorkingDays > 0 ? Math.round((pDays / totalWorkingDays) * 100) : 0;
        const avgDaily = pDays > 0 ? (totalHrs / pDays).toFixed(1) : "0.0";
        const overtime = totalHrs > pDays * 8 ? (totalHrs - pDays * 8).toFixed(1) : "0.0";

        const rawStatus = (rec.status || (pDays > 0 ? "Present" : "Absent")).toLowerCase();
        const isPresentToday = rawStatus.includes("present") || rawStatus.includes("late");
        const statusLabel = isPresentToday
          ? rawStatus.includes("late")
            ? "Late"
            : "Present"
          : rawStatus.includes("leave")
          ? "Leave"
          : hDays > 0 && !isPresentToday
          ? "Half Day"
          : "Absent";

        return {
          id: `REP-${m.emp_code || idx}`,
          employee: name,
          code: m.emp_code || `EMP${idx + 1}`,
          designation: m.designation || m.role || "Team Member",
          department: m.department || "Operations",
          status: statusLabel,
          totalDays: totalWorkingDays,
          presentDays: pDays,
          absentDays: aDays,
          halfDays: hDays,
          leaveDays: lDays,
          workingHours: `${Math.round(totalHrs)}h`,
          avgDailyHours: `${avgDaily}h`,
          overtimeHours: `${overtime}h`,
          lateArrivals: lMarks,
          unapprovedAbsence: aDays,
          attendanceRate: `${rate}%`,
          checkIn: rec.punch_in || rec.check_in || "—",
          checkOut: rec.punch_out || rec.check_out || "—",
        };
      }

      // Fallback calculation using today's attendance snapshot
      const rawStatus = (rec.status || "Absent").toLowerCase();
      const isPresent = rawStatus.includes("present") || rawStatus.includes("late");
      const isLate = rawStatus.includes("late") || rec.remark === "Late";
      const isHalf = rawStatus.includes("half");
      const isLeave = rawStatus.includes("leave");
      const hoursNum =
        parseFloat(rec.prodHours) || parseFloat(rec.working_hours) || (isPresent ? 8.5 : 0);

      const presentDays = isPresent ? 1 : 0;
      const totalDays = 1;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
      const absentDays = !isPresent && !isLeave ? 1 : 0;
      const halfDays = isHalf ? 1 : 0;
      const leaveDays = isLeave ? 1 : 0;

      const statusLabel = isPresent
        ? isLate
          ? "Late"
          : "Present"
        : isLeave
        ? "Leave"
        : isHalf
        ? "Half Day"
        : "Absent";

      return {
        id: `REP-${m.emp_code || idx}`,
        employee: name,
        code: m.emp_code || `EMP${idx + 1}`,
        designation: m.designation || m.role || "Team Member",
        department: m.department || "Operations",
        status: statusLabel,
        totalDays,
        presentDays,
        absentDays,
        halfDays,
        leaveDays,
        workingHours: `${hoursNum.toFixed(1)}h`,
        avgDailyHours: `${hoursNum > 0 ? hoursNum.toFixed(1) : "0.0"}h`,
        overtimeHours: hoursNum > 8 ? `${(hoursNum - 8).toFixed(1)}h` : "0h",
        lateArrivals: isLate ? 1 : 0,
        unapprovedAbsence: absentDays,
        attendanceRate: `${Math.round(attendanceRate)}%`,
        checkIn: rec.punch_in || rec.check_in || "—",
        checkOut: rec.punch_out || rec.check_out || "—",
      };
    });
  }, [teamMembers, attendance, matrixData]);

  // Dynamic KPI summaries
  const totalLateCount = reportRows.reduce((acc, r) => acc + (r.lateArrivals || 0), 0);
  const totalPresentCount = reportRows.reduce(
    (acc, r) =>
      acc + (r.status === "Present" || r.status === "Late" || r.presentDays > 0 ? 1 : 0),
    0
  );
  const avgRate =
    reportRows.length > 0
      ? Math.round(
          reportRows.reduce(
            (acc, r) => acc + (parseInt(r.attendanceRate, 10) || 0),
            0
          ) / reportRows.length
        )
      : 0;

  // CSV Export
  const handleExportCSV = useCallback(
    (dataToExport) => {
      const exportList = Array.isArray(dataToExport) && dataToExport.length > 0
        ? dataToExport
        : reportRows;

      if (exportList.length === 0) {
        managerToast.info("No report records available to export.");
        return;
      }

      const headers = [
        "Employee Name",
        "Employee Code",
        "Designation",
        "Department",
        "Current Status",
        "Present Days",
        "Absent Days",
        "Half Days",
        "Working Hours",
        "Daily Avg Hours",
        "Overtime Hours",
        "Late Marks",
        "Attendance Rate",
      ];

      const rows = exportList.map((r) => [
        `"${String(r.employee || "").replace(/"/g, '""')}"`,
        `"${String(r.code || "").replace(/"/g, '""')}"`,
        `"${String(r.designation || "").replace(/"/g, '""')}"`,
        `"${String(r.department || "").replace(/"/g, '""')}"`,
        `"${String(r.status || "").replace(/"/g, '""')}"`,
        r.presentDays,
        r.absentDays,
        r.halfDays,
        `"${String(r.workingHours || "").replace(/"/g, '""')}"`,
        `"${String(r.avgDailyHours || "").replace(/"/g, '""')}"`,
        `"${String(r.overtimeHours || "").replace(/"/g, '""')}"`,
        r.lateArrivals,
        `"${String(r.attendanceRate || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Attendance_Report_${selectedMonth.replace(/\s+/g, "_")}_${Date.now()}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      managerToast.success("Attendance report exported to CSV successfully.");
    },
    [reportRows, selectedMonth]
  );

  // Desktop Table Columns
  const columns = [
    {
      header: "Employee",
      accessor: "employee",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: "var(--mp-text-primary)" }}>{row.employee}</div>
          <div style={{ fontSize: "11.5px", color: "var(--mp-text-muted)" }}>
            {row.code} • {row.designation}
          </div>
        </div>
      ),
    },
    {
      header: "Present Days",
      accessor: "presentDays",
      render: (row) => (
        <span style={{ fontWeight: 700 }}>
          {row.presentDays} / {row.totalDays}
        </span>
      ),
    },
    {
      header: "Working Hours",
      accessor: "workingHours",
      render: (row) => (
        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {row.workingHours}
        </span>
      ),
    },
    {
      header: "Avg Daily Time",
      accessor: "avgDailyHours",
      render: (row) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{row.avgDailyHours}</span>
      ),
    },
    {
      header: "Overtime Logged",
      accessor: "overtimeHours",
      render: (row) => (
        <span style={{ color: "#059669", fontWeight: 700 }}>+{row.overtimeHours}</span>
      ),
    },
    {
      header: "Late Marks",
      accessor: "lateArrivals",
      render: (row) => (
        <span
          style={{
            color: row.lateArrivals > 0 ? "#D97706" : "var(--mp-text-muted)",
            fontWeight: 600,
          }}
        >
          {row.lateArrivals}
        </span>
      ),
    },
    {
      header: "Attendance %",
      accessor: "attendanceRate",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "40px",
              height: "6px",
              background: "var(--mp-surface-sunken)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div style={{ width: row.attendanceRate, height: "100%", background: "#7C3AED" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "12.5px" }}>{row.attendanceRate}</span>
        </div>
      ),
    },
  ];

  // Helper to determine status class
  const getStatusClass = (status = "") => {
    const s = status.toLowerCase();
    if (s.includes("present")) return "present";
    if (s.includes("absent")) return "absent";
    if (s.includes("late")) return "late";
    if (s.includes("half")) return "half";
    if (s.includes("leave")) return "leave";
    return "present";
  };

  // Mobile Report Card Renderer
  const renderMobileCard = (row, idx) => {
    const avatarStyle = getAvatarStyle(row.code || row.employee);
    const initials = getInitials(row.employee);
    const statusClass = getStatusClass(row.status);

    return (
      <div
        key={row.id || idx}
        className="mp-emp-report-card"
        onClick={() => setSelectedMember(row)}
      >
        {/* Top Header */}
        <div className="mp-card-top-row">
          <div className="mp-card-user-meta">
            <div
              className="mp-card-avatar"
              style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.color }}
            >
              {initials}
            </div>
            <div className="mp-card-name-group">
              <div className="mp-card-emp-name">{row.employee}</div>
              <div className="mp-card-emp-sub">
                {row.code} • {row.designation}
              </div>
            </div>
          </div>
          <span className={`mp-card-status-pill ${statusClass}`}>{row.status}</span>
        </div>

        {/* 2-Column Metrics Grid */}
        <div className="mp-card-metrics-grid">
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="mp-card-metric-row">
              <div className="mp-metric-label-group">
                <Calendar size={15} style={{ color: "#10B981" }} />
                <span>Present Days</span>
              </div>
              <span className="mp-metric-num">{row.presentDays}</span>
            </div>
            <div className="mp-card-metric-row">
              <div className="mp-metric-label-group">
                <Clock size={15} style={{ color: "#06B6D4" }} />
                <span>Working Hours</span>
              </div>
              <span className="mp-metric-num">{row.workingHours}</span>
            </div>
            <div className="mp-card-metric-row">
              <div className="mp-metric-label-group">
                <TrendingUp size={15} style={{ color: "#10B981" }} />
                <span>Attendance</span>
              </div>
              <span className="mp-metric-num">{row.attendanceRate}</span>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="mp-card-metric-row">
              <div className="mp-metric-label-group">
                <LogOut size={15} style={{ color: "#EF4444" }} />
                <span>Late Marks</span>
              </div>
              <span className="mp-metric-num">{row.lateArrivals}</span>
            </div>
            <div className="mp-card-metric-row">
              <div className="mp-metric-label-group">
                <MinusCircle size={15} style={{ color: "#EF4444" }} />
                <span>Absent Days</span>
              </div>
              <span className="mp-metric-num">{row.absentDays}</span>
            </div>
            <div className="mp-card-metric-row">
              <div className="mp-metric-label-group">
                <PauseCircle size={15} style={{ color: "#F59E0B" }} />
                <span>Half Days</span>
              </div>
              <span className="mp-metric-num">{row.halfDays}</span>
            </div>
          </div>
        </div>

        {/* Card Footer: View Details Action */}
        <div className="mp-card-footer">
          <button
            type="button"
            className="mp-card-details-btn"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMember(row);
            }}
          >
            <span>View Details</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  };

  // Skeleton Card Renderer
  const renderSkeleton = (i) => (
    <div key={i} className="mp-skeleton-card">
      <div className="mp-skeleton-head">
        <div className="mp-skeleton-user">
          <div className="mp-skeleton-circle" />
          <div className="mp-skeleton-text-group">
            <div className="mp-skeleton-line w-name" />
            <div className="mp-skeleton-line w-sub" />
          </div>
        </div>
        <div className="mp-skeleton-pill" />
      </div>
      <div className="mp-skeleton-body" />
    </div>
  );

  return (
    <div className="mp-reports-page">
      {/* ====================================================================
          PAGE HEADER
          ==================================================================== */}
      <div className="mp-reports-header">
        <div className="mp-reports-header-text">
          <div className="mp-reports-title-row">
            <h2 className="mp-reports-title">Attendance Reports</h2>
            <div className="mp-reports-month-wrap mp-mobile-only">
              <ManagerSelect
                value={selectedMonth}
                onChange={setSelectedMonth}
                options={MONTH_OPTIONS}
                icon={Calendar}
                minWidth="150px"
              />
            </div>
          </div>
          <p className="mp-reports-subtitle">
            View and analyze employee attendance, working hours, and performance.
          </p>
        </div>

        <div className="mp-reports-header-actions mp-desktop-only">
          <ManagerSelect
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={MONTH_OPTIONS}
            icon={Calendar}
            minWidth="160px"
          />

          <button
            type="button"
            className="mp-reports-export-btn"
            onClick={() => handleExportCSV()}
            title="Export Attendance Report to CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          SUMMARY KPI CARDS (Desktop: 4 columns | Mobile: 2x2 grid)
          ==================================================================== */}
      <div className="mp-reports-summary-grid">
        {/* 1. LATE MARKS */}
        <div className="mp-report-kpi-card">
          <div className="mp-kpi-icon-wrap warning">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="mp-kpi-title">Late Marks</div>
            <div className="mp-kpi-value">{totalLateCount}</div>
            <div className="mp-kpi-sub">Across {reportRows.length} members</div>
          </div>
        </div>

        {/* 2. AVG ATTENDANCE */}
        <div className="mp-report-kpi-card">
          <div className="mp-kpi-icon-wrap info">
            <Clock size={20} />
          </div>
          <div>
            <div className="mp-kpi-title">Avg Attendance</div>
            <div className="mp-kpi-value">{avgRate}%</div>
            <div className="mp-kpi-sub">Live calculated rate</div>
          </div>
        </div>

        {/* 3. PRESENT TODAY */}
        <div className="mp-report-kpi-card">
          <div className="mp-kpi-icon-wrap success">
            <Calendar size={20} />
          </div>
          <div>
            <div className="mp-kpi-title">Present Today</div>
            <div className="mp-kpi-value">{totalPresentCount}</div>
            <div className="mp-kpi-sub">Across {reportRows.length} members</div>
          </div>
        </div>

        {/* 4. TOTAL EMPLOYEES */}
        <div className="mp-report-kpi-card">
          <div className="mp-kpi-icon-wrap primary">
            <Users size={20} />
          </div>
          <div>
            <div className="mp-kpi-title">Total Employees</div>
            <div className="mp-kpi-value">{reportRows.length}</div>
            <div className="mp-kpi-sub">In selected scope</div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          REPORT LIST: Desktop Table / Mobile Cards
          ==================================================================== */}
      <ManagerTable
        columns={columns}
        data={reportRows}
        searchPlaceholder="Search report by employee name or code..."
        searchKeys={["employee", "code", "designation", "department"]}
        emptyMessage={
          loading
            ? "Calculating report metrics from live attendance..."
            : "No team records found for this period."
        }
        loading={loading}
        renderMobileCard={renderMobileCard}
        renderSkeleton={renderSkeleton}
        onExportCSV={handleExportCSV}
        pageSize={8}
      />

      {/* ====================================================================
          DETAILS MODAL / DRAWER (Triggered by View Details or Card Tap)
          ==================================================================== */}
      {selectedMember && (
        <div
          className="mp-report-modal-backdrop"
          onClick={() => setSelectedMember(null)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="mp-report-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mp-report-modal-head">
              <div className="mp-modal-user">
                <div
                  className="mp-card-avatar"
                  style={{
                    backgroundColor: getAvatarStyle(
                      selectedMember.code || selectedMember.employee
                    ).bg,
                    color: getAvatarStyle(
                      selectedMember.code || selectedMember.employee
                    ).color,
                    width: "46px",
                    height: "46px",
                    fontSize: "16px",
                  }}
                >
                  {getInitials(selectedMember.employee)}
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#1A1626" }}>
                    {selectedMember.employee}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748B", marginTop: "2px" }}>
                    {selectedMember.code} • {selectedMember.designation}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mp-modal-close-btn"
                onClick={() => setSelectedMember(null)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mp-report-modal-body">
              {/* Scope & Status Pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "#F8F7FB",
                  borderRadius: "10px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                  Period: {selectedMonth}
                </span>
                <span
                  className={`mp-card-status-pill ${getStatusClass(
                    selectedMember.status
                  )}`}
                >
                  {selectedMember.status}
                </span>
              </div>

              {/* Attendance Counts */}
              <div className="mp-modal-metric-card">
                <div className="mp-modal-metric-item">
                  <span className="mp-modal-metric-title">Present Days</span>
                  <span className="mp-modal-metric-val" style={{ color: "#059669" }}>
                    {selectedMember.presentDays}
                  </span>
                </div>
                <div className="mp-modal-metric-item">
                  <span className="mp-modal-metric-title">Absent Days</span>
                  <span className="mp-modal-metric-val" style={{ color: "#DC2626" }}>
                    {selectedMember.absentDays}
                  </span>
                </div>
                <div className="mp-modal-metric-item">
                  <span className="mp-modal-metric-title">Half Days</span>
                  <span className="mp-modal-metric-val" style={{ color: "#D97706" }}>
                    {selectedMember.halfDays}
                  </span>
                </div>
                <div className="mp-modal-metric-item">
                  <span className="mp-modal-metric-title">Leave Days</span>
                  <span className="mp-modal-metric-val" style={{ color: "#475569" }}>
                    {selectedMember.leaveDays || 0}
                  </span>
                </div>
              </div>

              {/* Working Hours & Performance */}
              <div className="mp-modal-metric-card">
                <div className="mp-modal-metric-item">
                  <span className="mp-modal-metric-title">Total Working Hours</span>
                  <span className="mp-modal-metric-val">{selectedMember.workingHours}</span>
                </div>
                <div className="mp-modal-metric-item">
                  <span className="mp-modal-metric-title">Daily Average Time</span>
                  <span className="mp-modal-metric-val">{selectedMember.avgDailyHours}</span>
                </div>
                <div className="mp-modal-metric-item">
                  <span className="mp-modal-metric-title">Overtime Logged</span>
                  <span className="mp-modal-metric-val" style={{ color: "#059669" }}>
                    +{selectedMember.overtimeHours}
                  </span>
                </div>
                <div className="mp-modal-metric-item">
                  <span className="mp-modal-metric-title">Late Marks Logged</span>
                  <span
                    className="mp-modal-metric-val"
                    style={{
                      color: selectedMember.lateArrivals > 0 ? "#D97706" : "#475569",
                    }}
                  >
                    {selectedMember.lateArrivals}
                  </span>
                </div>
              </div>

              {/* Attendance Rate */}
              <div
                style={{
                  padding: "14px",
                  background: "#FAF5FF",
                  border: "1px solid #E9D5FF",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#6D28D9", fontWeight: 600 }}>
                    Overall Attendance Score
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#581C87" }}>
                    {selectedMember.attendanceRate}
                  </div>
                </div>
                <div
                  style={{
                    width: "80px",
                    height: "8px",
                    background: "#E9D5FF",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: selectedMember.attendanceRate,
                      height: "100%",
                      background: "#7C3AED",
                    }}
                  />
                </div>
              </div>

              {/* Punch Timings (if available) */}
              {(selectedMember.checkIn !== "—" || selectedMember.checkOut !== "—") && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: "#F8F7FB",
                    borderRadius: "10px",
                    fontSize: "12.5px",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748B" }}>Punch In: </span>
                    <strong style={{ color: "#1E1B2E" }}>{selectedMember.checkIn}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Punch Out: </span>
                    <strong style={{ color: "#1E1B2E" }}>{selectedMember.checkOut}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid #EBE8F3",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "#7C3AED",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
