import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  DollarSign,
  Users,
  UserCheck,
  AlertTriangle,
  TrendingDown,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Unlock,
  Settings as SettingsIcon,
  Eye,
  Edit3,
  UserCog,
  FileText,
  Clock,
  ShieldCheck,
  X,
  ChevronRight,
  Info,
  CalendarCheck,
  Award,
  ArrowRight,
  ExternalLink,
  Layers,
  History as HistoryIcon,
  Calculator,
  MoreVertical
} from "lucide-react";

import {
  fetchPayroll,
  calculatePayroll,
  finalizePayroll,
  reopenPayroll,
  fetchPayrollSettings,
  updatePayrollSettings,
  fetchPayrollHistory,
  recordInternConversion,
  updateEmployeeSalary,
  downloadPayslip,
  exportPayroll
} from "../../../services/payrollService";
import CustomSelect from "../../../components/ui/CustomSelect";

import "./AdminPayroll.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

// Format Indian Currency
const money = (val) => {
  const num = Number(val || 0);
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Leap year detector for badge
const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export default function AdminPayroll() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "monthly";

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState(
    ["monthly", "calculator", "exceptions", "history"].includes(initialTab) ? initialTab : "monthly"
  );
  const [tableViewMode, setTableViewMode] = useState("company"); // "company" (Excel structure) | "attendance"

  // Data states
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [runDetails, setRunDetails] = useState(null);
  const [settings, setSettings] = useState(null);
  const [historyRuns, setHistoryRuns] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [workerTypeFilter, setWorkerTypeFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [exceptionsOnly, setExceptionsOnly] = useState(false);

  // Modals & Drawers
  const [breakdownModalEmployee, setBreakdownModalEmployee] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [salaryConfigEmployee, setSalaryConfigEmployee] = useState(null);
  const [internConvertEmployee, setInternConvertEmployee] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // Temporary salary edit form state
  const [salaryForm, setSalaryForm] = useState({
    gross_salary: "",
    basic_salary: "",
    hra: "",
    flexi_allowance: "",
    worker_type: "Regular Employee",
    pt_applicable: true,
    pf_applicable: false,
    tds_deduction: "0",
    other_deductions: "0",
    arrears: "0",
  });

  // Interactive Salary Calculator & Simulator State
  const [simSelectedEmpId, setSimSelectedEmpId] = useState("");
  const [simGrossSalary, setSimGrossSalary] = useState("150000");
  const [simMonth, setSimMonth] = useState(selectedMonth);
  const [simYear, setSimYear] = useState(selectedYear);
  const [simPresentDays, setSimPresentDays] = useState("31");
  const [simHalfDays, setSimHalfDays] = useState("0");
  const [simPaidLeaveDays, setSimPaidLeaveDays] = useState("1");
  const [simUnpaidLeaveDays, setSimUnpaidLeaveDays] = useState("0");
  const [simWeeklyOffDays, setSimWeeklyOffDays] = useState("0");
  const [simHolidayDays, setSimHolidayDays] = useState("0");
  const [simAbsentDays, setSimAbsentDays] = useState("0");
  const [simPtApplicable, setSimPtApplicable] = useState(true);
  const [simPfApplicable, setSimPfApplicable] = useState(false);
  const [simTdsDeduction, setSimTdsDeduction] = useState("12288");
  const [simOtherDeductions, setSimOtherDeductions] = useState("0");
  const [simArrears, setSimArrears] = useState("0");
  const [simWorkerType, setSimWorkerType] = useState("Regular Employee");

  // Synchronized top and bottom horizontal scrollbars
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const isSyncingScroll = useRef(false);

  const handleTopScroll = (e) => {
    if (isSyncingScroll.current) return;
    if (bottomScrollRef.current) {
      isSyncingScroll.current = true;
      bottomScrollRef.current.scrollLeft = e.target.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };

  const handleBottomScroll = (e) => {
    if (isSyncingScroll.current) return;
    if (topScrollRef.current) {
      isSyncingScroll.current = true;
      topScrollRef.current.scrollLeft = e.target.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };


  // Sync tab with URL
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", newTab);
      return next;
    });
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && ["monthly", "calculator", "exceptions", "history"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Temporary policy settings form state
  const [policyForm, setPolicyForm] = useState({
    pt_enabled: true,
    pt_amount: 200,
    pf_applicable: false,
    pf_wages_basis: "Basic + DA",
    pf_employee_percent: 12,
    pf_employer_percent: 12,
    pf_wage_ceiling: 15000,
    intern_eligibility_months: 6,
    intern_conversion_mode: "Manual HR Approval",
    intern_paid_leave_enabled: false,
    intern_paid_leave_quota: 0,
    intern_unpaid_leave_enabled: true,
    employee_paid_leave_enabled: true,
    weekly_off_paid: true,
    paid_holiday_paid: true,
    allow_negative_salary: false,
  });

  // Temporary intern convert form state
  const [convertForm, setConvertForm] = useState({
    decision: "Converted",
    effective_employee_date: "",
    extension_months: 0,
    new_salary: "",
    notes: "",
  });

  // Calendar days helper
  const calendarDays = useMemo(() => {
    const mIdx = MONTHS.indexOf(selectedMonth);
    return new Date(selectedYear, mIdx + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Load Payroll Data
  const loadPayroll = useCallback(async (forceRecalc = false) => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const data = await fetchPayroll({
        month: selectedMonth,
        year: selectedYear,
        force_recalculate: forceRecalc,
      });

      setRecords(data.records || []);
      setSummary(data.summary || null);
      setRunDetails(data.run || null);
      if (data.settings) {
        setSettings(data.settings);
        setPolicyForm(data.settings);
      }
    } catch (err) {
      console.error("Error loading payroll:", err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to load payroll data. Please refresh.",
      });
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  }, [selectedMonth, selectedYear]);

  // Load Settings & History
  const loadSettingsAndHistory = useCallback(async () => {
    try {
      const [settData, histData] = await Promise.all([
        fetchPayrollSettings().catch(() => null),
        fetchPayrollHistory().catch(() => []),
      ]);
      if (settData) {
        setSettings(settData);
        setPolicyForm(settData);
      }
      if (Array.isArray(histData)) {
        setHistoryRuns(histData);
      }
    } catch (err) {
      console.error("Error loading settings/history:", err);
    }
  }, []);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  useEffect(() => {
    loadSettingsAndHistory();
  }, [loadSettingsAndHistory]);

  // Trigger Recalculate
  const handleRecalculate = async () => {
    setRecalculating(true);
    setFeedback({ type: "", message: "" });
    try {
      await calculatePayroll(selectedMonth, selectedYear);
      await loadPayroll(true);
      setFeedback({ type: "success", message: `Payroll recalculated for ${selectedMonth} ${selectedYear}.` });
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to recalculate payroll." });
    } finally {
      setRecalculating(false);
    }
  };

  // Trigger Finalize
  const handleFinalize = async (overrideExceptions = false) => {
    setActionLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      await finalizePayroll(selectedMonth, selectedYear, overrideExceptions);
      setShowFinalizeConfirm(false);
      await loadPayroll(false);
      await loadSettingsAndHistory();
      setFeedback({
        type: "success",
        message: `Payroll for ${selectedMonth} ${selectedYear} has been finalized! Payslips have been generated for the Employee Portal.`,
      });
    } catch (err) {
      if (err.message && err.message.includes("unresolved exceptions")) {
        setShowFinalizeConfirm(true);
      } else {
        setFeedback({ type: "error", message: err.message || "Failed to finalize payroll." });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Reopen
  const handleReopen = async () => {
    if (!window.confirm(`Are you sure you want to reopen finalized payroll for ${selectedMonth} ${selectedYear}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await reopenPayroll(selectedMonth, selectedYear);
      await loadPayroll(false);
      await loadSettingsAndHistory();
      setFeedback({
        type: "info",
        message: `Payroll for ${selectedMonth} ${selectedYear} is reopened to Draft. You can now adjust records and recalculate.`,
      });
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to reopen payroll." });
    } finally {
      setActionLoading(false);
    }
  };

  // Save Salary Config
  const handleSaveSalary = async (e) => {
    e.preventDefault();
    if (!salaryConfigEmployee) return;
    setActionLoading(true);
    try {
      await updateEmployeeSalary(salaryConfigEmployee.employeeId, {
        gross_salary: parseFloat(salaryForm.gross_salary) || 0,
        basic_salary: parseFloat(salaryForm.basic_salary) || 0,
        hra: parseFloat(salaryForm.hra) || 0,
        flexi_allowance: parseFloat(salaryForm.flexi_allowance) || 0,
        worker_type: salaryForm.worker_type,
        pt_applicable: Boolean(salaryForm.pt_applicable),
        pf_applicable: Boolean(salaryForm.pf_applicable),
        tds_deduction: parseFloat(salaryForm.tds_deduction) || 0,
        other_deductions: parseFloat(salaryForm.other_deductions) || 0,
        arrears: parseFloat(salaryForm.arrears) || 0,
      });
      setSalaryConfigEmployee(null);
      await loadPayroll(true);
      setFeedback({
        type: "success",
        message: `Compensation updated for ${salaryConfigEmployee.employeeName}. Payroll recalculated.`,
      });
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to update compensation." });
    } finally {
      setActionLoading(false);
    }
  };

  // Save Policy Settings
  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const updated = await updatePayrollSettings(policyForm);
      setSettings(updated);
      setShowSettingsModal(false);
      await loadPayroll(true);
      setFeedback({
        type: "success",
        message: "Company payroll rules updated successfully. Calculations re-applied.",
      });
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to save payroll settings." });
    } finally {
      setActionLoading(false);
    }
  };

  // Save Intern Conversion
  const handleSaveInternConversion = async (e) => {
    e.preventDefault();
    if (!internConvertEmployee) return;
    setActionLoading(true);
    try {
      await recordInternConversion({
        emp_code: internConvertEmployee.employeeId,
        decision: convertForm.decision,
        effective_employee_date: convertForm.effective_employee_date,
        extension_months: parseInt(convertForm.extension_months) || 0,
        new_salary: convertForm.new_salary ? parseFloat(convertForm.new_salary) : null,
        notes: convertForm.notes,
      });
      setInternConvertEmployee(null);
      await loadPayroll(true);
      setFeedback({
        type: "success",
        message: `Conversion recorded for ${internConvertEmployee.employeeName}: ${convertForm.decision}. Notification sent.`,
      });
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to record conversion decision." });
    } finally {
      setActionLoading(false);
    }
  };

  // Export handlers
  const handleExport = async (format) => {
    try {
      const blob = await exportPayroll({
        format,
        month: selectedMonth,
        year: selectedYear,
        search: searchQuery,
        department: deptFilter !== "All" ? deptFilter : "",
        worker_type: workerTypeFilter !== "All" ? workerTypeFilter : "",
        status: statusFilter !== "All" ? statusFilter : "",
        has_exceptions: exceptionsOnly ? "true" : "",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Payroll_${selectedMonth}_${selectedYear}.${format === "xlsx" ? "xlsx" : "csv"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback({ type: "error", message: `Export failed: ${err.message}` });
    }
  };

  // Open Salary Edit Drawer
  const openSalaryConfig = (emp) => {
    setSalaryConfigEmployee(emp);
    const gross = emp.monthlyCompensation || emp.monthlySalary || 0;
    setSalaryForm({
      gross_salary: gross || "",
      basic_salary: emp.basicSalary || (gross ? Math.round(gross * 0.5) : ""),
      hra: emp.hra || (gross ? Math.round(gross * 0.25) : ""),
      flexi_allowance: emp.flexiAllowance || (gross ? Math.round(gross * 0.25) : ""),
      worker_type: emp.workerType || "Regular Employee",
      pt_applicable: emp.ptApplicable !== false,
      pf_applicable: Boolean(emp.pfApplicable),
      tds_deduction: emp.tdsDeduction || "0",
      other_deductions: emp.otherDeductions || "0",
      arrears: emp.arrears || "0",
    });
  };

  // Open Intern Conversion Drawer
  const openInternConvert = (emp) => {
    setInternConvertEmployee(emp);
    setConvertForm({
      decision: "Converted",
      effective_employee_date: new Date().toISOString().slice(0, 10),
      extension_months: 2,
      new_salary: emp.monthlyCompensation || "",
      notes: "Completed 6-month internship successfully. Converted to regular employee.",
    });
  };

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.department && r.department !== "—") set.add(r.department);
    });
    return Array.from(set).sort();
  }, [records]);

  // Simulator calculations
  const simCalDays = useMemo(() => {
    const mIdx = MONTHS.indexOf(simMonth);
    return new Date(simYear, mIdx + 1, 0).getDate();
  }, [simMonth, simYear]);

  const simIsLeap = useMemo(() => isLeapYear(simYear), [simYear]);

  const simDailySalary = useMemo(() => {
    const g = parseFloat(simGrossSalary) || 0;
    return simCalDays > 0 ? g / simCalDays : 0;
  }, [simGrossSalary, simCalDays]);

  const simPaidDays = useMemo(() => {
    const p = parseFloat(simPresentDays) || 0;
    const h = (parseFloat(simHalfDays) || 0) * 0.5;
    const pl = parseFloat(simPaidLeaveDays) || 0;
    const wo = parseFloat(simWeeklyOffDays) || 0;
    const hol = parseFloat(simHolidayDays) || 0;
    return Math.min(simCalDays, Math.round((p + h + pl + wo + hol) * 10) / 10);
  }, [simPresentDays, simHalfDays, simPaidLeaveDays, simWeeklyOffDays, simHolidayDays, simCalDays]);

  const simLopDays = useMemo(() => {
    const ab = parseFloat(simAbsentDays) || 0;
    const ul = parseFloat(simUnpaidLeaveDays) || 0;
    const h = (parseFloat(simHalfDays) || 0) * 0.5;
    return ab + ul + h;
  }, [simAbsentDays, simUnpaidLeaveDays, simHalfDays]);

  const simLopDeduction = useMemo(() => {
    return Math.round(simDailySalary * simLopDays * 100) / 100;
  }, [simDailySalary, simLopDays]);

  const simFixedGross = parseFloat(simGrossSalary) || 0;
  const simBasic = Math.round(simFixedGross * 0.50 * 100) / 100;
  const simHra = Math.round(simFixedGross * 0.25 * 100) / 100;
  const simFlexi = Math.round((simFixedGross - simBasic - simHra) * 100) / 100;

  const simEarnRatio = simCalDays > 0 ? (simPaidDays / simCalDays) : 0;
  const simEarnBasic = Math.round(simBasic * simEarnRatio * 100) / 100;
  const simEarnHra = Math.round(simHra * simEarnRatio * 100) / 100;
  const simEarnOtherAllo = Math.round(simFlexi * simEarnRatio * 100) / 100;
  const simEarnGross = Math.max(0, Math.round((simFixedGross - simLopDeduction) * 100) / 100);

  const simPfWages = simPfApplicable ? Math.min(simEarnBasic, 15000) : 0;
  const simPfDeduction = simPfApplicable ? Math.round(simPfWages * 0.12 * 100) / 100 : 0;
  const simPtDeducted = (simPtApplicable && (settings?.pt_enabled !== false)) ? Number(settings?.pt_amount || 200) : 0;
  const simTotalDeductions = Math.round((simPtDeducted + simPfDeduction + (parseFloat(simTdsDeduction) || 0) + (parseFloat(simOtherDeductions) || 0)) * 100) / 100;
  const simNetSalary = Math.max(0, Math.round((simEarnGross - simTotalDeductions + (parseFloat(simArrears) || 0)) * 100) / 100);

  const handleSelectSimEmployee = (empId) => {
    setSimSelectedEmpId(empId);
    if (!empId) {
      setSimGrossSalary("150000");
      setSimWorkerType("Regular Employee");
      setSimPresentDays(String(simCalDays));
      setSimHalfDays("0");
      setSimPaidLeaveDays("0");
      setSimUnpaidLeaveDays("0");
      setSimWeeklyOffDays("0");
      setSimHolidayDays("0");
      setSimAbsentDays("0");
      setSimPtApplicable(true);
      setSimPfApplicable(false);
      setSimTdsDeduction("12288");
      setSimOtherDeductions("0");
      setSimArrears("0");
      return;
    }
    const emp = records.find((r) => r.employeeId === empId);
    if (emp) {
      setSimGrossSalary(String(emp.monthlyCompensation || emp.monthlySalary || 150000));
      setSimWorkerType(emp.workerType || "Regular Employee");
      setSimPresentDays(String(emp.presentDays ?? simCalDays));
      setSimHalfDays(String(emp.halfDays ?? 0));
      setSimPaidLeaveDays(String(emp.paidLeaveDays ?? 0));
      setSimUnpaidLeaveDays(String(emp.unpaidLeaveDays ?? 0));
      setSimWeeklyOffDays(String(emp.weeklyOffDays ?? 0));
      setSimHolidayDays(String(emp.holidayDays ?? 0));
      setSimAbsentDays(String(emp.absentDays ?? 0));
      setSimPtApplicable(emp.ptApplicable !== false);
      setSimPfApplicable(Boolean(emp.pfApplicable));
      setSimTdsDeduction(String(emp.tdsDeduction ?? 0));
      setSimOtherDeductions(String(emp.otherDeductions ?? 0));
      setSimArrears(String(emp.arrears ?? 0));
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeId.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (workerTypeFilter !== "All" && r.workerType !== workerTypeFilter) {
        return false;
      }

      if (deptFilter !== "All" && r.department.toLowerCase() !== deptFilter.toLowerCase()) {
        return false;
      }

      if (statusFilter !== "All") {
        if (!r.status.toLowerCase().includes(statusFilter.toLowerCase())) return false;
      }

      if (exceptionsOnly && !r.hasExceptions) {
        return false;
      }

      return true;
    });
  }, [records, searchQuery, workerTypeFilter, deptFilter, statusFilter, exceptionsOnly]);

  // Exceptions list
  const exceptionRecords = useMemo(() => {
    return records.filter((r) => r.hasExceptions);
  }, [records]);

  // Synchronize scroll metrics after filteredRecords is defined
  useEffect(() => {
    const updateScrollMetrics = () => {
      if (bottomScrollRef.current) {
        setTableScrollWidth(bottomScrollRef.current.scrollWidth);
      }
    };

    updateScrollMetrics();
    const t = setTimeout(updateScrollMetrics, 150);

    let ro;
    if (typeof ResizeObserver !== "undefined" && bottomScrollRef.current) {
      ro = new ResizeObserver(updateScrollMetrics);
      ro.observe(bottomScrollRef.current);
      const tbl = bottomScrollRef.current.querySelector("table");
      if (tbl) ro.observe(tbl);
    }
    window.addEventListener("resize", updateScrollMetrics);

    return () => {
      clearTimeout(t);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateScrollMetrics);
    };
  }, [filteredRecords, tableViewMode]);

  const isFinalized = runDetails?.status === "Finalized";

  return (
    <div className="payroll-root-container">
      {/* ========================================================
          1. HEADER CONTROLS & MONTH-YEAR SELECTOR
          ======================================================== */}
      <header className="payroll-page-header">
        <div className="payroll-header-left">
          <div className="payroll-title-row">
            <h1 className="payroll-main-title">Monthly Payroll & Salary Calculator</h1>
            <span className={`payroll-status-pill status-${(runDetails?.status || "Draft").toLowerCase()}`}>
              {isFinalized ? <Lock size={13} /> : <Unlock size={13} />}
              {runDetails?.status || "Draft"}
            </span>
          </div>
          <p className="payroll-subtitle">
            Dynamic, auditable salary engine calculating pay based on exact calendar days, approved attendance,
            and company policy rules.
          </p>
        </div>

        {/* Month & Year Selectors & Calendar Days Badge */}
        <div className="payroll-header-controls">
          <div className="payroll-controls-row-1">
            <div className="payroll-header-select-item month-select-wrap">
              <CustomSelect
                id="payroll-header-month"
                value={selectedMonth}
                onChange={(val) => setSelectedMonth(val)}
                options={MONTHS.map((m) => ({ value: m, label: m }))}
                prefixIcon={<Calendar size={15} className="control-icon" />}
                disabled={loading || recalculating}
                size="md"
                searchable={false}
                ariaLabel="Select Payroll Month"
              />
            </div>

            <div className="payroll-header-select-item year-select-wrap">
              <CustomSelect
                id="payroll-header-year"
                value={selectedYear}
                onChange={(val) => setSelectedYear(Number(val))}
                options={YEARS.map((y) => ({ value: y, label: String(y) }))}
                disabled={loading || recalculating}
                size="md"
                searchable={false}
                ariaLabel="Select Payroll Year"
              />
            </div>

            {/* Dynamic Calendar Days Badge */}
            <div
              className={`calendar-days-badge ${
                selectedMonth === "February" && isLeapYear(selectedYear) ? "badge-leap" : ""
              }`}
              title={`Daily Salary = Monthly Salary ÷ ${calendarDays}`}
            >
              <CalendarCheck size={14} />
              <span>
                <strong>{calendarDays}</strong> calendar days
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="payroll-top-actions">
            <button
              type="button"
              className="payroll-btn btn-secondary btn-recalc"
              onClick={handleRecalculate}
              disabled={loading || recalculating || isFinalized}
              title="Recalculate salary for this month based on updated attendance/leaves"
            >
              <RefreshCw size={15} className={recalculating ? "spin" : ""} />
              <span>{recalculating ? "Calculating..." : "Recalculate"}</span>
            </button>

            {!isFinalized ? (
              <button
                type="button"
                className="payroll-btn btn-primary btn-finalize"
                onClick={() => handleFinalize(false)}
                disabled={loading || recalculating || actionLoading}
              >
                <CheckCircle2 size={15} />
                <span>Finalize Payroll</span>
              </button>
            ) : (
              <button
                type="button"
                className="payroll-btn btn-warning btn-finalize"
                onClick={handleReopen}
                disabled={loading || recalculating || actionLoading}
              >
                <Unlock size={15} />
                <span>Reopen Payroll</span>
              </button>
            )}

            <button
              type="button"
              className="payroll-btn btn-icon btn-settings-gear"
              onClick={() => setShowSettingsModal(true)}
              title="Configure Payroll & Intern Rules"
              aria-label="Settings"
            >
              <SettingsIcon size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Global Notification Feedback */}
      {feedback.message && (
        <div className={`payroll-banner banner-${feedback.type}`}>
          <div className="banner-content">
            {feedback.type === "error" ? (
              <AlertTriangle size={18} />
            ) : feedback.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <Info size={18} />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            className="banner-close"
            onClick={() => setFeedback({ type: "", message: "" })}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ========================================================
          2. DYNAMIC KPI DASHBOARD (Reconciled)
          ======================================================== */}
      <section className="payroll-kpi-grid" aria-label="Payroll Summary Metrics">
        <div className="kpi-card">
          <div className="kpi-icon-wrap icon-purple">
            <Users size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Regular Employees</span>
            <span className="kpi-value">{summary?.totalEmployees ?? 0}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap icon-blue">
            <UserCheck size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Interns</span>
            <span className="kpi-value">{summary?.totalInterns ?? 0}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap icon-indigo">
            <Layers size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Payroll Records</span>
            <span className="kpi-value">{summary?.payrollRecords ?? records.length}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap icon-teal">
            <DollarSign size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Gross Earned</span>
            <span className="kpi-value">{money(summary?.grossPayroll)}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap icon-amber">
            <TrendingDown size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">LOP Deduction</span>
            <span className="kpi-value">{money(summary?.totalLop)}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap icon-violet">
            <Award size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Professional Tax (PT)</span>
            <span className="kpi-value">{money(summary?.totalPt)}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap icon-orange">
            <TrendingDown size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Deductions</span>
            <span className="kpi-value">{money(summary?.totalDeductions)}</span>
          </div>
        </div>

        <div className="kpi-card kpi-card-highlight">
          <div className="kpi-icon-wrap icon-emerald">
            <DollarSign size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Net Payroll</span>
            <span className="kpi-value value-highlight">{money(summary?.netPayroll)}</span>
          </div>
        </div>

        <div
          className={`kpi-card kpi-card-exceptions ${(summary?.payrollExceptions || 0) > 0 ? "kpi-card-alert" : ""}`}
          onClick={() => setActiveTab("exceptions")}
          style={{ cursor: "pointer" }}
          title="Click to view all unresolved exceptions"
        >
          <div className="kpi-icon-wrap icon-rose">
            <AlertTriangle size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Payroll Exceptions</span>
            <span className="kpi-value">{summary?.payrollExceptions ?? 0}</span>
          </div>
        </div>
      </section>

      {/* Reconciliation Notice */}
      <div className="payroll-reconciliation-bar">
        <div className="reconciliation-left">
          <div className="reconciliation-icon-wrap">
            <Calculator size={18} />
          </div>
          <div className="reconciliation-content">
            <div className="reconciliation-title">
              Payroll Reconciliation ({selectedMonth} {selectedYear})
            </div>
            <div className="reconciliation-formula">
              <span className="recon-gross">{money(summary?.grossPayroll)}</span>
              <span className="recon-sep">−</span>
              <span className="recon-ded">{money(summary?.totalDeductions)}</span>
              <span className="recon-sep">=</span>
              <span className="recon-net">{money(summary?.netPayroll)}</span>
            </div>
          </div>
        </div>
        <div className={`reconciliation-badge ${summary?.isReconciled !== false ? "badge-matched" : "badge-mismatch"}`}>
          <CheckCircle2 size={13} />
          <span>{summary?.isReconciled !== false ? "Balanced" : "Discrepancy"}</span>
        </div>
      </div>

      {/* ========================================================
          3. TABS NAVIGATION & EXPORT BUTTONS
          ======================================================== */}
      <nav className="payroll-tab-nav" aria-label="Payroll Views">
        <div className="tab-buttons-group">
          <button
            type="button"
            className={`tab-btn ${activeTab === "monthly" ? "tab-active" : ""}`}
            onClick={() => handleTabChange("monthly")}
          >
            <FileSpreadsheet size={16} className="tab-desktop-icon" />
            <span>Monthly Payroll</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === "calculator" ? "tab-active" : ""}`}
            onClick={() => handleTabChange("calculator")}
          >
            <Calculator size={16} className="tab-desktop-icon" />
            <span>Salary Simulator</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === "exceptions" ? "tab-active" : ""}`}
            onClick={() => handleTabChange("exceptions")}
          >
            <AlertTriangle size={16} className="tab-desktop-icon" />
            <span>Exceptions</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === "history" ? "tab-active" : ""}`}
            onClick={() => handleTabChange("history")}
          >
            <HistoryIcon size={16} className="tab-desktop-icon" />
            <span>Payroll History</span>
          </button>
        </div>

        <div className="export-buttons-group">
          <button
            type="button"
            className="export-btn btn-export-excel"
            onClick={() => handleExport("xlsx")}
            title="Download full 27-column payroll sheet in Excel"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            className="export-btn btn-export-csv"
            onClick={() => handleExport("csv")}
            title="Download payroll sheet in CSV format"
          >
            <FileText size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </nav>

      {/* ========================================================
          4. TAB 1: MONTHLY PAYROLL TABLE & MOBILE CARDS
          ======================================================== */}
      {activeTab === "monthly" && (
        <section className="payroll-main-section">
          {/* Filter and Search Bar */}
          <div className="payroll-filter-bar">
            <div className="filter-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="filter-dropdowns">
              <div className="filter-item">
                <label htmlFor="filter-worker-type" className="filter-desktop-label">Type:</label>
                <div className="filter-select-wrap worker-type-wrap">
                  <CustomSelect
                    id="filter-worker-type"
                    value={workerTypeFilter}
                    onChange={(val) => setWorkerTypeFilter(val)}
                    options={[
                      { value: "All", label: "All Workers" },
                      { value: "Regular Employee", label: "Regular Employee" },
                      { value: "Intern", label: "Intern" }
                    ]}
                    size="sm"
                    searchable={false}
                    ariaLabel="Filter by Worker Type"
                  />
                </div>
              </div>

              <div className="filter-item">
                <label htmlFor="filter-dept" className="filter-desktop-label">Dept:</label>
                <div className="filter-select-wrap dept-wrap">
                  <CustomSelect
                    id="filter-dept"
                    value={deptFilter}
                    onChange={(val) => setDeptFilter(val)}
                    options={[
                      { value: "All", label: "All Departments" },
                      ...departments.map((d) => ({ value: d, label: d }))
                    ]}
                    size="sm"
                    searchable={false}
                    ariaLabel="Filter by Department"
                  />
                </div>
              </div>

              <div className="filter-item">
                <label htmlFor="filter-status" className="filter-desktop-label">Status:</label>
                <div className="filter-select-wrap status-wrap">
                  <CustomSelect
                    id="filter-status"
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={[
                      { value: "All", label: "All Statuses" },
                      { value: "Payroll Ready", label: "Payroll Ready" },
                      { value: "Action Required", label: "Action Required" },
                      { value: "Salary Not Configured", label: "Salary Missing" },
                      { value: "Finalized", label: "Finalized" }
                    ]}
                    size="sm"
                    searchable={false}
                    ariaLabel="Filter by Status"
                  />
                </div>
              </div>

              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={exceptionsOnly}
                  onChange={(e) => setExceptionsOnly(e.target.checked)}
                />
                <span>Exceptions only</span>
              </label>

              {(searchQuery || workerTypeFilter !== "All" || deptFilter !== "All" || statusFilter !== "All" || exceptionsOnly) && (
                <button
                  type="button"
                  className="filter-reset-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setWorkerTypeFilter("All");
                    setDeptFilter("All");
                    setStatusFilter("All");
                    setExceptionsOnly(false);
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="payroll-loading-state">
              <RefreshCw size={28} className="spin text-purple" />
              <p>Calculating dynamic monthly payroll for {selectedMonth} {selectedYear}...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="payroll-empty-state">
              <Users size={36} className="empty-icon" />
              <h3>No employee payroll records found</h3>
              <p>Try adjusting your search query or filters.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (Screens >= 768px) */}
              <div className="sheet-view-toggle-bar">
                <div className="sheet-view-btn-group">
                  <button
                    type="button"
                    className={`sheet-view-btn ${tableViewMode === "company" ? "view-btn-active" : ""}`}
                    onClick={() => setTableViewMode("company")}
                    title="Switch to Company Salary Structure format (Excel Sheet view)"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Company Salary Sheet (Excel Format)</span>
                  </button>
                  <button
                    type="button"
                    className={`sheet-view-btn ${tableViewMode === "attendance" ? "view-btn-active" : ""}`}
                    onClick={() => setTableViewMode("attendance")}
                    title="Switch to Attendance & Payability View (Present, Half, Paid Lv, Unpaid, LOP)"
                  >
                    <CalendarCheck size={15} />
                    <span>Attendance & Payability View</span>
                  </button>
                </div>
                <div className="sheet-view-hint">
                  {tableViewMode === "company"
                    ? "✨ Company Standard: Fixed Structure (Basic 50%, HRA 25%, Flexi 25%), Earned Pro-rata, and Deductions"
                    : "📅 Attendance Breakdown: Daily Rate, Present, Half Day, Paid Leave, Unpaid Leave, Absent, and LOP Days"}
                </div>
              </div>

              {/* Synchronized Top Horizontal Scroller */}
              <div
                className="admin-payroll-top-scroll"
                ref={topScrollRef}
                onScroll={handleTopScroll}
                aria-hidden="true"
                title="Scroll table horizontally"
              >
                <div
                  className="admin-payroll-top-scroll-inner"
                  style={{ width: tableScrollWidth ? `${tableScrollWidth}px` : "100%" }}
                />
              </div>

              <div
                className="desktop-table-container"
                ref={bottomScrollRef}
                onScroll={handleBottomScroll}
              >
                {tableViewMode === "company" ? (
                  <table className="payroll-table company-excel-table" aria-label="Company Salary Structure Sheet">
                    <thead>
                      <tr>
                        <th>Sr.no</th>
                        <th>Employee Name</th>
                        <th>Designation</th>
                        <th className="num-col">Gross Salary</th>
                        <th className="num-col col-green-hdr">Days in month</th>
                        <th className="num-col col-green-hdr">Paid Days</th>
                        <th className="num-col col-green-hdr">Leave Taken</th>
                        {/* Yellow Fixed Components Group (Matching User Excel Screenshot) */}
                        <th className="num-col col-yellow-hdr">Fixed Gross Salary</th>
                        <th className="num-col col-yellow-hdr">Basic + DA</th>
                        <th className="num-col col-yellow-hdr">HRA</th>
                        <th className="num-col col-yellow-hdr">Flexi Allowance</th>
                        <th className="num-col col-yellow-hdr">Gross</th>
                        {/* Earned Components Group */}
                        <th className="num-col col-earned-hdr">Earn basic</th>
                        <th className="num-col col-earned-hdr">Earn HRA</th>
                        <th className="num-col col-earned-hdr">Earn Other Allo</th>
                        <th className="num-col col-earned-hdr">Flexi Allowance2</th>
                        <th className="num-col col-earned-hdr font-bold">Earn Gross</th>
                        {/* Deductions Group */}
                        <th className="num-col col-deduct-hdr">PF WAGES</th>
                        <th className="num-col col-deduct-hdr">PF</th>
                        <th className="num-col col-deduct-hdr">ESIC</th>
                        <th className="num-col col-deduct-hdr font-semibold">PT</th>
                        <th className="num-col col-deduct-hdr">LWF</th>
                        <th className="num-col col-deduct-hdr font-semibold">TDS</th>
                        <th className="num-col col-green-hdr text-red">Leave Deduction</th>
                        <th className="num-col col-deduct-hdr">Other Deduction</th>
                        <th className="num-col">Arrears</th>
                        <th className="num-col col-net-hdr">Net Salary</th>
                        <th className="action-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((emp, idx) => {
                        const isUnconfigured = !emp.monthlyCompensation || emp.monthlyCompensation <= 0;
                        return (
                          <tr
                            key={emp.employeeId}
                            className={`${emp.hasExceptions ? "row-has-exception" : ""} ${
                              isUnconfigured ? "row-unconfigured" : ""
                            }`}
                          >
                            <td className="sr-no-cell">{idx + 1}</td>
                            <td className="emp-name-cell">
                              <div className="emp-avatar-block">
                                <div className="emp-avatar-circle">
                                  {emp.employeeName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="emp-name-meta">
                                  <span className="emp-name-text">{emp.employeeName}</span>
                                  <span className="emp-dept-text">{emp.employeeId} · {emp.department}</span>
                                </div>
                              </div>
                            </td>
                            <td>{emp.designation || emp.department || "—"}</td>
                            <td className="num-col font-semibold">
                              {isUnconfigured ? (
                                <span className="text-muted-missing">Not Configured</span>
                              ) : (
                                money(emp.monthlyCompensation)
                              )}
                            </td>
                            <td className="num-col col-green-cell">{emp.calendarDays}</td>
                            <td className="num-col col-green-cell font-bold">{emp.paidEquivalentDays}</td>
                            <td className="num-col col-green-cell">{emp.leaveTaken ?? (emp.paidLeaveDays + emp.unpaidLeaveDays)}</td>

                            {/* Yellow Fixed Components */}
                            <td className="num-col col-yellow-cell">{money(emp.fixedGrossSalary || emp.monthlyCompensation)}</td>
                            <td className="num-col col-yellow-cell">{money(emp.basicSalary)}</td>
                            <td className="num-col col-yellow-cell">{money(emp.hra)}</td>
                            <td className="num-col col-yellow-cell">{money(emp.flexiAllowance)}</td>
                            <td className="num-col col-yellow-cell font-bold">{money(emp.fixedGrossSalary || emp.monthlyCompensation)}</td>

                            {/* Earned Components */}
                            <td className="num-col col-earned-cell">{money(emp.earnBasic)}</td>
                            <td className="num-col col-earned-cell">{money(emp.earnHra)}</td>
                            <td className="num-col col-earned-cell">{money(emp.earnOtherAllo)}</td>
                            <td className="num-col col-earned-cell">₹0.00</td>
                            <td className="num-col col-earned-cell font-bold">{money(emp.earnGross || emp.grossEarnedSalary)}</td>

                            {/* Deductions */}
                            <td className="num-col">{money(emp.pfWages)}</td>
                            <td className="num-col">{money(emp.pfDeduction)}</td>
                            <td className="num-col">{money(emp.esicDeduction)}</td>
                            <td className="num-col font-semibold">{money(emp.ptDeducted)}</td>
                            <td className="num-col">{money(emp.lwfDeduction)}</td>
                            <td className="num-col font-semibold">{money(emp.tdsDeduction)}</td>
                            <td className="num-col col-green-cell text-red">{money(emp.leaveDeduction || emp.lopDeduction)}</td>
                            <td className="num-col">{money(emp.otherDeductions)}</td>
                            <td className="num-col">{money(emp.arrears)}</td>

                            {/* Net Salary */}
                            <td className="num-col col-net-cell">
                              <strong>{money(emp.netSalary)}</strong>
                            </td>

                            <td className="action-col">
                              <div className="row-action-group">
                                <button
                                  type="button"
                                  className="action-btn-sm"
                                  onClick={() => setBreakdownModalEmployee(emp)}
                                  title="View Step-by-Step Salary Calculation"
                                >
                                  <Eye size={14} />
                                  <span>Audit</span>
                                </button>

                                <button
                                  type="button"
                                  className="action-btn-sm btn-edit"
                                  onClick={() => openSalaryConfig(emp)}
                                  title="Edit Salary, Components & PT"
                                >
                                  <Edit3 size={14} />
                                </button>

                                {emp.workerType === "Intern" && (
                                  <button
                                    type="button"
                                    className="action-btn-sm btn-intern-action"
                                    onClick={() => openInternConvert(emp)}
                                    title="Review Intern Conversion Workflow"
                                  >
                                    <UserCog size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="payroll-table attendance-breakdown-table" aria-label="Employee Monthly Payroll">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>ID</th>
                        <th>Type</th>
                        <th className="num-col">Monthly Base</th>
                        <th className="num-col">Days</th>
                        <th className="num-col">Daily Rate</th>
                        <th className="num-col">Present</th>
                        <th className="num-col">Half</th>
                        <th className="num-col">Paid Lv</th>
                        <th className="num-col">Unpaid</th>
                        <th className="num-col">Absent</th>
                        <th className="num-col">LOP Days</th>
                        <th className="num-col">PF Wages</th>
                        <th className="num-col">PF</th>
                        <th className="num-col">PT</th>
                        <th className="num-col">Net Salary</th>
                        <th>Status</th>
                        <th className="action-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((emp) => {
                        const isUnconfigured = !emp.monthlyCompensation || emp.monthlyCompensation <= 0;
                        return (
                          <tr
                            key={emp.employeeId}
                            className={`${emp.hasExceptions ? "row-has-exception" : ""} ${
                              isUnconfigured ? "row-unconfigured" : ""
                            }`}
                          >
                            <td className="emp-name-cell">
                              <div className="emp-avatar-block">
                                <div className="emp-avatar-circle">
                                  {emp.employeeName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="emp-name-meta">
                                  <span className="emp-name-text">{emp.employeeName}</span>
                                  <span className="emp-dept-text">{emp.department}</span>
                                </div>
                              </div>
                            </td>

                            <td className="emp-id-cell">
                              <code>{emp.employeeId}</code>
                            </td>

                            <td>
                              <span
                                className={`worker-type-badge ${
                                  emp.workerType === "Intern" ? "badge-intern" : "badge-employee"
                                }`}
                              >
                                {emp.workerType}
                              </span>
                            </td>

                            <td className="num-col">
                              {isUnconfigured ? (
                                <span className="text-muted-missing">Not Configured</span>
                              ) : (
                                <strong>{money(emp.monthlyCompensation)}</strong>
                              )}
                            </td>

                            <td className="num-col">
                              <span className="cal-days-pill">{emp.calendarDays}</span>
                            </td>

                            <td className="num-col" title={`₹${emp.monthlyCompensation} ÷ ${emp.calendarDays}`}>
                              {money(emp.dailySalary)}
                            </td>

                            <td className="num-col">{emp.presentDays}</td>
                            <td className="num-col">{emp.halfDays}</td>
                            <td className="num-col">{emp.paidLeaveDays}</td>
                            <td className="num-col">{emp.unpaidLeaveDays}</td>
                            <td className="num-col">{emp.absentDays}</td>

                            <td className="num-col">
                              <span className={emp.lopDays > 0 ? "lop-pill-active" : "lop-pill-zero"}>
                                {emp.lopDays}
                              </span>
                            </td>

                            <td className="num-col">{money(emp.pfWages)}</td>

                            <td className="num-col">{money(emp.pfDeduction)}</td>

                            <td className="num-col">{money(emp.ptDeducted)}</td>

                            <td className="num-col net-salary-col">
                              <strong>{money(emp.netSalary)}</strong>
                            </td>

                            <td>
                              <span
                                className={`status-pill ${
                                  emp.hasExceptions
                                    ? "pill-warning"
                                    : emp.status === "Finalized"
                                    ? "pill-finalized"
                                    : "pill-ready"
                                }`}
                              >
                                {emp.hasExceptions ? "Action Req" : emp.status}
                              </span>
                            </td>

                            <td className="action-col">
                              <div className="row-action-group">
                                <button
                                  type="button"
                                  className="action-btn-sm"
                                  onClick={() => setBreakdownModalEmployee(emp)}
                                  title="View Step-by-Step Salary Calculation"
                                >
                                  <Eye size={14} />
                                  <span>Audit</span>
                                </button>

                                <button
                                  type="button"
                                  className="action-btn-sm btn-edit"
                                  onClick={() => openSalaryConfig(emp)}
                                  title="Edit Salary, Stipend, PT Applicability"
                                >
                                  <Edit3 size={14} />
                                </button>

                                {emp.workerType === "Intern" && (
                                  <button
                                    type="button"
                                    className="action-btn-sm btn-intern-action"
                                    onClick={() => openInternConvert(emp)}
                                    title="Review Intern Conversion Workflow"
                                  >
                                    <UserCog size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ========================================================
                  MOBILE CARD VIEW (Screens < 768px, 320px - 430px)
                  Matching Section 45, 46, 47, 85: Natural Vertical Page Scroll
                  ======================================================== */}
              {/* ========================================================
                  MOBILE CARD VIEW (Screens < 768px, 320px - 430px)
                  Matching Section 45, 46, 47, 85: Natural Vertical Page Scroll
                  ======================================================== */}
              <div className="mobile-payroll-cards-list">
                {filteredRecords.map((emp) => {
                  const isUnconfigured = !emp.monthlyCompensation || emp.monthlyCompensation <= 0;
                  const initials = (emp.employeeName || "")
                    .trim()
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "EE";

                  return (
                    <article
                      key={`card-${emp.employeeId}`}
                      className={`mobile-payroll-card ${emp.hasExceptions ? "card-has-exception" : ""}`}
                    >
                      {/* Top Header */}
                      <div className="card-top-header">
                        <div className="card-user-info">
                          <div
                            className={`card-avatar ${
                              emp.workerType === "Intern" ? "avatar-intern" : "avatar-employee"
                            }`}
                          >
                            {initials}
                          </div>
                          <div className="card-user-text">
                            <h3 className="card-user-name">{emp.employeeName}</h3>
                            <p className="card-user-meta">
                              <code>{emp.employeeId}</code>
                              <span className="meta-pipe">|</span>
                              <span>{emp.designation || emp.department || "Executive"}</span>
                            </p>
                          </div>
                        </div>

                        <div className="card-header-right">
                          <span
                            className={`worker-type-badge ${
                              emp.workerType === "Intern" ? "badge-intern" : "badge-employee"
                            }`}
                          >
                            {emp.workerType}
                          </span>
                          <button
                            type="button"
                            className="card-more-btn"
                            onClick={() => openSalaryConfig(emp)}
                            title="More options"
                            aria-label="More options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Warning Banner: Missing salary configuration */}
                      {isUnconfigured ? (
                        <div className="card-unconfigured-banner">
                          <AlertTriangle size={14} className="banner-icon" />
                          <span>
                            No active salary / stipend configuration found for {selectedMonth} {selectedYear}.
                          </span>
                        </div>
                      ) : emp.hasExceptions ? (
                        <div className="card-exception-banner">
                          <AlertTriangle size={14} className="banner-icon" />
                          <span>{emp.exceptions[0]?.message || "Action required on this record."}</span>
                        </div>
                      ) : null}

                      {/* Base Metrics (3 columns) */}
                      <div className="card-base-metrics-row">
                        <div className="base-metric-col">
                          <span className="base-metric-lbl">
                            {emp.workerType === "Intern" ? "Monthly Stipend" : "Monthly Salary"}
                          </span>
                          <span className="base-metric-val">
                            {isUnconfigured ? "Not Configured" : money(emp.monthlyCompensation)}
                          </span>
                        </div>
                        <div className="base-metric-col">
                          <span className="base-metric-lbl">Calendar Days</span>
                          <span className="base-metric-val">{emp.calendarDays || calendarDays}</span>
                        </div>
                        <div className="base-metric-col">
                          <span className="base-metric-lbl">Daily Salary</span>
                          <span className="base-metric-val">{money(emp.dailySalary)}</span>
                        </div>
                      </div>

                      {/* Attendance Breakdown Grid (6 pills: 3x2) */}
                      <div className="card-att-pill-grid">
                        <div className="att-pill-box">
                          <div className="att-pill-head">
                            <span className="att-dot dot-present" />
                            <span className="att-pill-count">{emp.presentDays ?? 0}</span>
                          </div>
                          <span className="att-pill-name">Present</span>
                        </div>

                        <div className="att-pill-box">
                          <div className="att-pill-head">
                            <span className="att-dot dot-half" />
                            <span className="att-pill-count">{emp.halfDays ?? 0}</span>
                          </div>
                          <span className="att-pill-name">Half Day</span>
                        </div>

                        <div className="att-pill-box">
                          <div className="att-pill-head">
                            <span className="att-dot dot-paid" />
                            <span className="att-pill-count">{emp.paidLeaveDays ?? 0}</span>
                          </div>
                          <span className="att-pill-name">Paid Leave</span>
                        </div>

                        <div className="att-pill-box">
                          <div className="att-pill-head">
                            <span className="att-dot dot-unpaid" />
                            <span className="att-pill-count">{emp.unpaidLeaveDays ?? 0}</span>
                          </div>
                          <span className="att-pill-name">Unpaid Leave</span>
                        </div>

                        <div className="att-pill-box">
                          <div className="att-pill-head">
                            <span className="att-dot dot-absent" />
                            <span className="att-pill-count">{emp.absentDays ?? 0}</span>
                          </div>
                          <span className="att-pill-name">Absent</span>
                        </div>

                        <div className="att-pill-box">
                          <div className="att-pill-head">
                            <span className="att-dot dot-lop" />
                            <span className="att-pill-count">{emp.lopDays ?? 0}</span>
                          </div>
                          <span className="att-pill-name">LOP Days</span>
                        </div>
                      </div>

                      {/* Financial Breakdown (2 columns with divider) */}
                      <div className="card-finance-dual-grid">
                        <div className="finance-side-col">
                          <div className="finance-line">
                            <span className="fin-lbl">LOP Deduction</span>
                            <span className={`fin-val ${Number(emp.lopDeduction) > 0 ? "val-deduct" : ""}`}>
                              {Number(emp.lopDeduction) > 0 ? `−${money(emp.lopDeduction)}` : money(0)}
                            </span>
                          </div>
                          <div className="finance-line">
                            <span className="fin-lbl">Gross Earned</span>
                            <span className="fin-val">{money(emp.grossEarnedSalary)}</span>
                          </div>
                          <div className="finance-line">
                            <span className="fin-lbl">PF Wages</span>
                            <span className="fin-val">{money(emp.pfWages || 0)}</span>
                          </div>
                        </div>

                        <div className="finance-col-separator" />

                        <div className="finance-side-col">
                          <div className="finance-line">
                            <span className="fin-lbl">PF Deduction</span>
                            <span className={`fin-val ${Number(emp.pfDeduction) > 0 ? "val-deduct" : ""}`}>
                              {Number(emp.pfDeduction) > 0 ? `−${money(emp.pfDeduction)}` : money(0)}
                            </span>
                          </div>
                          <div className="finance-line">
                            <span className="fin-lbl">Professional Tax (PT)</span>
                            <span className={`fin-val ${Number(emp.ptDeducted) > 0 ? "val-deduct" : ""}`}>
                              {Number(emp.ptDeducted) > 0 ? `−${money(emp.ptDeducted)}` : money(0)}
                            </span>
                          </div>
                          <div className="finance-line fin-net-line">
                            <span className="fin-lbl fin-net-lbl">Net Salary</span>
                            <span className="fin-val fin-net-val">{money(emp.netSalary)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Actions: View Calculation & Configure Salary */}
                      <div className="card-actions-row">
                        <button
                          type="button"
                          className="card-btn btn-view-calc"
                          onClick={() => setBreakdownModalEmployee(emp)}
                        >
                          <Eye size={15} />
                          <span>View Calculation</span>
                        </button>
                        <button
                          type="button"
                          className="card-btn btn-configure-salary"
                          onClick={() => openSalaryConfig(emp)}
                        >
                          <Edit3 size={15} />
                          <span>Configure Salary</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* ========================================================
          4B. TAB: INTERACTIVE SALARY CALCULATOR & SIMULATOR
          Directly addresses "where is the page of salary calculator you build"
          ======================================================== */}
      {activeTab === "calculator" && (
        <section className="payroll-calculator-section" aria-label="Interactive Salary Calculator">
          {/* Header Banner */}
          <div className="calculator-header-banner">
            <div className="calc-header-title-block">
              <div className="calc-icon-badge">
                <Calculator size={22} />
              </div>
              <div>
                <h2>Interactive Salary Calculator & Policy Simulator</h2>
                <p>
                  Test exact monthly payroll calculations live. Pick any real employee or simulate hypothetical numbers.
                  Strictly applies Calendar-Day Daily Rate, Indian Standard 50-25-25 component split, and attendance rules.
                </p>
              </div>
            </div>

            {/* Quick Benchmark Presets */}
            <div className="calc-quick-presets">
              <span className="preset-label">Quick Benchmarks:</span>
              <button
                type="button"
                className="preset-btn"
                onClick={() => {
                  setSimSelectedEmpId("");
                  setSimGrossSalary("150000");
                  setSimMonth("October");
                  setSimYear(2026);
                  setSimPresentDays("30");
                  setSimHalfDays("0");
                  setSimPaidLeaveDays("1");
                  setSimUnpaidLeaveDays("0");
                  setSimWeeklyOffDays("0");
                  setSimHolidayDays("0");
                  setSimAbsentDays("0");
                  setSimPtApplicable(true);
                  setSimPfApplicable(false);
                  setSimTdsDeduction("12288");
                  setSimOtherDeductions("0");
                  setSimArrears("0");
                }}
              >
                ₹1,50,000 (Ram Singh Benchmark)
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => {
                  setSimSelectedEmpId("");
                  setSimGrossSalary("15000");
                  setSimMonth("October");
                  setSimYear(2026);
                  setSimPresentDays("20");
                  setSimHalfDays("2");
                  setSimPaidLeaveDays("3");
                  setSimUnpaidLeaveDays("0");
                  setSimWeeklyOffDays("2");
                  setSimHolidayDays("1");
                  setSimAbsentDays("3");
                  setSimPtApplicable(true);
                  setSimPfApplicable(false);
                  setSimTdsDeduction("0");
                  setSimOtherDeductions("0");
                  setSimArrears("0");
                }}
              >
                ₹15,000 Prompt Benchmark (4 LOP Days)
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => {
                  setSimSelectedEmpId("");
                  setSimGrossSalary("15000");
                  setSimMonth("February");
                  setSimYear(2028); // Leap year 29 days!
                  setSimPresentDays("29");
                  setSimHalfDays("0");
                  setSimPaidLeaveDays("0");
                  setSimUnpaidLeaveDays("0");
                  setSimWeeklyOffDays("0");
                  setSimHolidayDays("0");
                  setSimAbsentDays("0");
                  setSimPtApplicable(true);
                  setSimPfApplicable(false);
                  setSimTdsDeduction("0");
                  setSimOtherDeductions("0");
                  setSimArrears("0");
                }}
              >
                Feb 2028 Leap Year (29 Days)
              </button>
            </div>
          </div>

          {/* Top Parameter Control Bar */}
          <div className="calculator-controls-bar">
            <div className="calc-ctrl-item calc-emp-select-wrap">
              <label htmlFor="sim-emp-select">Load Employee Profile:</label>
              <CustomSelect
                id="sim-emp-select"
                value={simSelectedEmpId}
                onChange={(val) => handleSelectSimEmployee(val)}
                options={[
                  { value: "", label: "-- Custom Simulation (Enter Values) --" },
                  ...records.map((r) => ({
                    value: r.employeeId,
                    label: `${r.employeeName} (${r.employeeId}) · ${money(r.monthlyCompensation)}`
                  }))
                ]}
                searchable={records.length > 8}
                placeholder="-- Custom Simulation (Enter Values) --"
                size="md"
                ariaLabel="Load Employee Profile"
              />
            </div>

            <div className="calc-ctrl-item calc-month-select-wrap">
              <label htmlFor="sim-month-select">Simulate Month:</label>
              <CustomSelect
                id="sim-month-select"
                value={simMonth}
                onChange={(val) => setSimMonth(val)}
                options={MONTHS.map((m) => ({ value: m, label: m }))}
                searchable={false}
                size="md"
                ariaLabel="Simulate Month"
              />
            </div>

            <div className="calc-ctrl-item calc-year-select-wrap">
              <label htmlFor="sim-year-select">Year:</label>
              <CustomSelect
                id="sim-year-select"
                value={simYear}
                onChange={(val) => setSimYear(Number(val))}
                options={YEARS.map((y) => ({ value: y, label: String(y) }))}
                searchable={false}
                size="md"
                ariaLabel="Simulate Year"
              />
            </div>

            {/* Dynamic Calendar Days Badge */}
            <div className={`cal-days-live-badge ${simMonth === "February" && simIsLeap ? "badge-leap" : ""}`}>
              <CalendarCheck size={16} />
              <span>
                <strong>{simCalDays} Calendar Days</strong>
                {simMonth === "February" ? (simIsLeap ? " (Leap Year 29d)" : " (Standard 28d)") : ""}
              </span>
            </div>
          </div>

          {/* Main 2-Column Split: Inputs vs Live Real-Time Results */}
          <div className="calculator-workspace-grid">
            {/* LEFT COLUMN: Configurable Inputs */}
            <div className="calc-inputs-column">
              {/* Card 1: Compensation Base */}
              <div className="calc-card">
                <div className="calc-card-header">
                  <DollarSign size={16} className="text-purple" />
                  <h3>1. Compensation & Salary Base</h3>
                </div>
                <div className="calc-card-body">
                  <div className="calc-field-group">
                    <label htmlFor="sim-gross-input">
                      {simWorkerType === "Intern" ? "Monthly Stipend (₹)" : "Monthly Gross Salary (₹)"}
                    </label>
                    <div className="currency-input-wrap">
                      <span className="currency-prefix">₹</span>
                      <input
                        id="sim-gross-input"
                        type="number"
                        min="0"
                        step="100"
                        value={simGrossSalary}
                        onChange={(e) => setSimGrossSalary(e.target.value)}
                        className="calc-input currency-input"
                      />
                    </div>
                  </div>

                  <div className="calc-field-group">
                    <label htmlFor="sim-worker-type">Worker Type</label>
                    <CustomSelect
                      id="sim-worker-type"
                      value={simWorkerType}
                      onChange={(val) => setSimWorkerType(val)}
                      options={[
                        { value: "Regular Employee", label: "Regular Employee (Monthly Salary)" },
                        { value: "Intern", label: "Intern (Monthly Stipend)" }
                      ]}
                      searchable={false}
                      size="md"
                      ariaLabel="Worker Type"
                    />
                  </div>

                  {/* Standard Structure Live Preview */}
                  <div className="structure-preview-mini">
                    <div className="struct-pill">
                      <span className="struct-lbl">Basic + DA (50%)</span>
                      <span className="struct-val">{money(simBasic)}</span>
                    </div>
                    <div className="struct-pill">
                      <span className="struct-lbl">HRA (25%)</span>
                      <span className="struct-val">{money(simHra)}</span>
                    </div>
                    <div className="struct-pill">
                      <span className="struct-lbl">Flexi (25%)</span>
                      <span className="struct-val">{money(simFlexi)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Attendance Inputs */}
              <div className="calc-card">
                <div className="calc-card-header">
                  <Clock size={16} className="text-blue" />
                  <h3>2. Attendance & Leave for {simMonth} ({simCalDays} Days)</h3>
                </div>
                <div className="calc-card-body">
                  <div className="att-inputs-grid">
                    <div className="att-field">
                      <label htmlFor="sim-p-input">Present (1.0 paid)</label>
                      <input
                        id="sim-p-input"
                        type="number"
                        min="0"
                        max={simCalDays}
                        step="1"
                        value={simPresentDays}
                        onChange={(e) => setSimPresentDays(e.target.value)}
                        className="calc-input"
                      />
                    </div>

                    <div className="att-field">
                      <label htmlFor="sim-h-input">Half Day (0.5 paid)</label>
                      <input
                        id="sim-h-input"
                        type="number"
                        min="0"
                        max={simCalDays}
                        step="1"
                        value={simHalfDays}
                        onChange={(e) => setSimHalfDays(e.target.value)}
                        className="calc-input"
                      />
                    </div>

                    <div className="att-field">
                      <label htmlFor="sim-pl-input">Paid Leave (1.0 paid)</label>
                      <input
                        id="sim-pl-input"
                        type="number"
                        min="0"
                        max={simCalDays}
                        step="1"
                        value={simPaidLeaveDays}
                        onChange={(e) => setSimPaidLeaveDays(e.target.value)}
                        className="calc-input"
                      />
                    </div>

                    <div className="att-field">
                      <label htmlFor="sim-ul-input">Unpaid Leave (0 paid)</label>
                      <input
                        id="sim-ul-input"
                        type="number"
                        min="0"
                        max={simCalDays}
                        step="1"
                        value={simUnpaidLeaveDays}
                        onChange={(e) => setSimUnpaidLeaveDays(e.target.value)}
                        className="calc-input input-danger"
                      />
                    </div>

                    <div className="att-field">
                      <label htmlFor="sim-wo-input">Weekly Off (1.0 paid)</label>
                      <input
                        id="sim-wo-input"
                        type="number"
                        min="0"
                        max={simCalDays}
                        step="1"
                        value={simWeeklyOffDays}
                        onChange={(e) => setSimWeeklyOffDays(e.target.value)}
                        className="calc-input"
                      />
                    </div>

                    <div className="att-field">
                      <label htmlFor="sim-hol-input">Holidays (1.0 paid)</label>
                      <input
                        id="sim-hol-input"
                        type="number"
                        min="0"
                        max={simCalDays}
                        step="1"
                        value={simHolidayDays}
                        onChange={(e) => setSimHolidayDays(e.target.value)}
                        className="calc-input"
                      />
                    </div>

                    <div className="att-field">
                      <label htmlFor="sim-ab-input">Absent Days (0 paid)</label>
                      <input
                        id="sim-ab-input"
                        type="number"
                        min="0"
                        max={simCalDays}
                        step="1"
                        value={simAbsentDays}
                        onChange={(e) => setSimAbsentDays(e.target.value)}
                        className="calc-input input-danger"
                      />
                    </div>
                  </div>

                  <div className="att-derived-summary">
                    <div className="derived-box box-green">
                      <span>Paid Equivalent:</span>
                      <strong>{simPaidDays} Days</strong>
                    </div>
                    <div className="derived-box box-red">
                      <span>Total LOP Days:</span>
                      <strong>{simLopDays} Days</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Deductions & Adjustments */}
              <div className="calc-card">
                <div className="calc-card-header">
                  <TrendingDown size={16} className="text-orange" />
                  <h3>3. Deductions & Adjustments</h3>
                </div>
                <div className="calc-card-body">
                  <div className="checkbox-row-card">
                    <label htmlFor="sim-pt-check" className="checkbox-label-styled">
                      <input
                        id="sim-pt-check"
                        type="checkbox"
                        checked={simPtApplicable}
                        onChange={(e) => setSimPtApplicable(e.target.checked)}
                      />
                      <span>Professional Tax (PT) Applicable ({money(settings?.pt_amount || 200)})</span>
                    </label>
                  </div>

                  <div className="checkbox-row-card">
                    <label htmlFor="sim-pf-check" className="checkbox-label-styled">
                      <input
                        id="sim-pf-check"
                        type="checkbox"
                        checked={simPfApplicable}
                        onChange={(e) => setSimPfApplicable(e.target.checked)}
                      />
                      <span>Provident Fund (PF) Applicable (Default: No · Current PF = ₹0.00)</span>
                    </label>
                  </div>

                  <div className="ded-inputs-row">
                    <div className="calc-field-group">
                      <label htmlFor="sim-tds-input">TDS Deduction (₹)</label>
                      <input
                        id="sim-tds-input"
                        type="number"
                        min="0"
                        step="1"
                        value={simTdsDeduction}
                        onChange={(e) => setSimTdsDeduction(e.target.value)}
                        className="calc-input"
                      />
                    </div>

                    <div className="calc-field-group">
                      <label htmlFor="sim-other-input">Other Deductions (₹)</label>
                      <input
                        id="sim-other-input"
                        type="number"
                        min="0"
                        step="1"
                        value={simOtherDeductions}
                        onChange={(e) => setSimOtherDeductions(e.target.value)}
                        className="calc-input"
                      />
                    </div>

                    <div className="calc-field-group">
                      <label htmlFor="sim-arrears-input">Arrears / Additions (₹)</label>
                      <input
                        id="sim-arrears-input"
                        type="number"
                        min="0"
                        step="1"
                        value={simArrears}
                        onChange={(e) => setSimArrears(e.target.value)}
                        className="calc-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Calculated Results & Formulas */}
            <div className="calc-results-column">
              {/* Hero Net Salary Card */}
              <div className="calc-hero-net-card">
                <div className="hero-net-top">
                  <span className="hero-net-label">Net Salary Payable</span>
                  <span className="hero-status-pill">Calculated Live</span>
                </div>
                <div className="hero-net-amount">{money(simNetSalary)}</div>
                <div className="hero-net-formula">
                  Earn Gross ({money(simEarnGross)}) − PT ({money(simPtDeducted)}) − PF ({money(simPfDeduction)}) − TDS ({money(parseFloat(simTdsDeduction) || 0)}) − Other ({money(parseFloat(simOtherDeductions) || 0)}) + Arrears ({money(parseFloat(simArrears) || 0)})
                </div>
              </div>

              {/* Dynamic Daily Salary Rate Box */}
              <div className="calc-result-box rate-formula-box">
                <div className="result-box-title">
                  <CalendarCheck size={16} />
                  <span>Dynamic Daily Salary Formula</span>
                </div>
                <div className="rate-formula-line">
                  <span>Monthly Salary ÷ Calendar Days:</span>
                  <strong>{money(simFixedGross)} ÷ {simCalDays} Days = {money(simDailySalary)}/day</strong>
                </div>
                <p className="rate-hint">
                  {simCalDays === 31 && "31-day month: January, March, May, July, August, October, December."}
                  {simCalDays === 30 && "30-day month: April, June, September, November."}
                  {simCalDays === 29 && "February Leap Year (29 days). Year is considered dynamically!"}
                  {simCalDays === 28 && "February Normal Year (28 days). Daily salary is ₹" + (simDailySalary.toFixed(2)) + "/day."}
                </p>
              </div>

              {/* Yellow Fixed Components (Matching User Excel Screenshot) */}
              <div className="calc-result-box yellow-structure-box">
                <div className="result-box-title">
                  <FileSpreadsheet size={16} />
                  <span>Company Fixed Salary Structure (Excel Yellow Section)</span>
                </div>
                <div className="yellow-grid">
                  <div className="yellow-cell">
                    <span className="y-lbl">Fixed Gross</span>
                    <strong className="y-val">{money(simFixedGross)}</strong>
                  </div>
                  <div className="yellow-cell">
                    <span className="y-lbl">Basic + DA (50%)</span>
                    <strong className="y-val">{money(simBasic)}</strong>
                  </div>
                  <div className="yellow-cell">
                    <span className="y-lbl">HRA (25%)</span>
                    <strong className="y-val">{money(simHra)}</strong>
                  </div>
                  <div className="yellow-cell">
                    <span className="y-lbl">Flexi Allowance (25%)</span>
                    <strong className="y-val">{money(simFlexi)}</strong>
                  </div>
                  <div className="yellow-cell">
                    <span className="y-lbl">Total Gross</span>
                    <strong className="y-val">{money(simFixedGross)}</strong>
                  </div>
                </div>
              </div>

              {/* Earned Components Pro-Rata Box */}
              <div className="calc-result-box earned-structure-box">
                <div className="result-box-title">
                  <Layers size={16} />
                  <span>Earned Components Pro-Rata (Paid Days ÷ Calendar Days: {simPaidDays} ÷ {simCalDays})</span>
                </div>
                <div className="earned-grid">
                  <div className="earned-cell">
                    <span className="e-lbl">Earn Basic</span>
                    <strong className="e-val">{money(simEarnBasic)}</strong>
                  </div>
                  <div className="earned-cell">
                    <span className="e-lbl">Earn HRA</span>
                    <strong className="e-val">{money(simEarnHra)}</strong>
                  </div>
                  <div className="earned-cell">
                    <span className="e-lbl">Earn Other Allo</span>
                    <strong className="e-val">{money(simEarnOtherAllo)}</strong>
                  </div>
                  <div className="earned-cell">
                    <span className="e-lbl">Flexi Allowance2</span>
                    <strong className="e-val">₹0.00</strong>
                  </div>
                  <div className="earned-cell font-bold">
                    <span className="e-lbl">Earn Gross</span>
                    <strong className="e-val text-emerald">{money(simEarnGross)}</strong>
                  </div>
                </div>
              </div>

              {/* Deductions Breakdown Box */}
              <div className="calc-result-box deductions-summary-box">
                <div className="result-box-title">
                  <TrendingDown size={16} />
                  <span>Deductions & Adjustments</span>
                </div>
                <div className="deduction-lines-list">
                  <div className="ded-line">
                    <span>Leave Deduction (LOP: {simLopDays} days × {money(simDailySalary)})</span>
                    <span className="text-red">−{money(simLopDeduction)}</span>
                  </div>
                  <div className="ded-line">
                    <span>PF Wages</span>
                    <span>{money(simPfWages)}</span>
                  </div>
                  <div className="ded-line">
                    <span>PF Deduction</span>
                    <span className={simPfDeduction > 0 ? "text-red" : ""}>{simPfDeduction > 0 ? `−${money(simPfDeduction)}` : money(0)}</span>
                  </div>
                  {!simPfApplicable && (
                    <div className="audit-pf-note">
                      <Info size={13} />
                      <span>PF is currently not applicable according to company payroll configuration.</span>
                    </div>
                  )}
                  <div className="ded-line">
                    <span>Professional Tax (PT {simPtApplicable ? "Applicable" : "Exempt"})</span>
                    <span className="text-red">−{money(simPtDeducted)}</span>
                  </div>
                  <div className="ded-line">
                    <span>TDS Deduction</span>
                    <span className="text-red">−{money(parseFloat(simTdsDeduction) || 0)}</span>
                  </div>
                  <div className="ded-line">
                    <span>Other Deductions</span>
                    <span className="text-red">−{money(parseFloat(simOtherDeductions) || 0)}</span>
                  </div>
                  <div className="ded-line line-arrears">
                    <span>Arrears / Bonus Additions</span>
                    <span className="text-emerald">+{money(parseFloat(simArrears) || 0)}</span>
                  </div>
                  <div className="ded-line line-final-net">
                    <span>Net Take-Home Salary</span>
                    <span className="final-net-val">{money(simNetSalary)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          5. TAB 2: EXCEPTIONS VIEW
          ======================================================== */}
      {activeTab === "exceptions" && (
        <section className="payroll-exceptions-section">
          <div className="exceptions-header">
            <div>
              <h2>Payroll Exceptions ({exceptionRecords.length})</h2>
              <p>Employees requiring action before final payroll submission.</p>
            </div>
            <button
              type="button"
              className="payroll-btn btn-secondary"
              onClick={handleRecalculate}
            >
              <RefreshCw size={14} />
              <span>Recalculate Exceptions</span>
            </button>
          </div>

          {exceptionRecords.length === 0 ? (
            <div className="exceptions-clean-card">
              <CheckCircle2 size={40} className="clean-icon" />
              <h3>All clear! Zero payroll exceptions found.</h3>
              <p>All employee salaries, attendances, and leaves are resolved for this period.</p>
            </div>
          ) : (
            <div className="exceptions-list-grid">
              {exceptionRecords.map((emp) => (
                <div key={`exc-${emp.employeeId}`} className="exception-item-card">
                  <div className="exc-card-header">
                    <div className="exc-emp-info">
                      <strong>{emp.employeeName}</strong>
                      <span className="exc-emp-id">({emp.employeeId} · {emp.department})</span>
                    </div>
                    <span className="worker-type-badge">{emp.workerType}</span>
                  </div>

                  <div className="exc-reasons-list">
                    {emp.exceptions.map((ex, idx) => (
                      <div key={idx} className="exc-reason-item">
                        <AlertTriangle size={15} className="exc-icon" />
                        <div className="exc-reason-text">
                          <strong className="exc-type-title">{ex.type}</strong>
                          <p>{ex.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="exc-actions-footer">
                    <button
                      type="button"
                      className="payroll-btn btn-secondary btn-sm"
                      onClick={() => setBreakdownModalEmployee(emp)}
                    >
                      <Eye size={13} />
                      <span>Audit Record</span>
                    </button>

                    <button
                      type="button"
                      className="payroll-btn btn-primary btn-sm"
                      onClick={() => openSalaryConfig(emp)}
                    >
                      <Edit3 size={13} />
                      <span>Configure Salary</span>
                    </button>

                    {emp.workerType === "Intern" && (
                      <button
                        type="button"
                        className="payroll-btn btn-outline btn-sm"
                        onClick={() => openInternConvert(emp)}
                      >
                        <UserCog size={13} />
                        <span>Review Conversion</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          6. TAB 3: PAYROLL HISTORY VIEW
          ======================================================== */}
      {activeTab === "history" && (
        <section className="payroll-history-section">
          <div className="history-header">
            <h2>Historical Payroll Runs</h2>
            <p>Chronological record of generated, reviewed, and finalized payroll periods.</p>
          </div>

          <div className="desktop-table-container">
            <table className="payroll-table history-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Calendar Days</th>
                  <th>Status</th>
                  <th>Employees</th>
                  <th>Interns</th>
                  <th className="num-col">Gross Payroll</th>
                  <th className="num-col">Total LOP</th>
                  <th className="num-col">Total PT</th>
                  <th className="num-col">Net Payout</th>
                  <th>Exceptions</th>
                  <th>Finalized Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyRuns.length === 0 ? (
                  <tr>
                    <td colSpan="12" style={{ textAlign: "center", padding: "30px" }}>
                      No past payroll runs saved yet.
                    </td>
                  </tr>
                ) : (
                  historyRuns.map((hr) => (
                    <tr key={`hr-${hr.id}`}>
                      <td>
                        <strong>{hr.month} {hr.year}</strong>
                      </td>
                      <td>{hr.calendar_days} days</td>
                      <td>
                        <span className={`status-pill status-${(hr.status || "Draft").toLowerCase()}`}>
                          {hr.status}
                        </span>
                      </td>
                      <td>{hr.total_employees}</td>
                      <td>{hr.total_interns}</td>
                      <td className="num-col">{money(hr.total_gross)}</td>
                      <td className="num-col">{money(hr.total_lop)}</td>
                      <td className="num-col">{money(hr.total_pt)}</td>
                      <td className="num-col net-salary-col">
                        <strong>{money(hr.total_net)}</strong>
                      </td>
                      <td>
                        {hr.total_exceptions > 0 ? (
                          <span className="pill-warning">{hr.total_exceptions} flags</span>
                        ) : (
                          <span className="pill-ready">0</span>
                        )}
                      </td>
                      <td>
                        {hr.finalized_at
                          ? new Date(hr.finalized_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="action-btn-sm"
                          onClick={() => {
                            setSelectedMonth(hr.month);
                            setSelectedYear(hr.year);
                            setActiveTab("monthly");
                          }}
                        >
                          <span>Load Run</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================
          7. MODAL: EMPLOYEE CALCULATION AUDIT BREAKDOWN
          Matching Prompt Section 49 & 50 Exactly
          ======================================================== */}
      {breakdownModalEmployee && (
        <PortalModal onClose={() => setBreakdownModalEmployee(null)}>
          <div className="payroll-modal-backdrop" onClick={() => setBreakdownModalEmployee(null)}>
          <div
            className="payroll-modal-container breakdown-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <FileText size={18} className="modal-title-icon" />
                <div>
                  <h3 className="modal-title">Calculation Breakdown</h3>
                  <p className="modal-subtitle">
                    {breakdownModalEmployee.employeeName} ({breakdownModalEmployee.employeeId}) · {selectedMonth} {selectedYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setBreakdownModalEmployee(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              {/* Employee Meta Summary */}
              <div className="breakdown-meta-grid">
                <div>
                  <span className="lbl">Worker Type:</span>
                  <strong>{breakdownModalEmployee.workerType}</strong>
                </div>
                <div>
                  <span className="lbl">Department:</span>
                  <strong>{breakdownModalEmployee.department}</strong>
                </div>
                <div>
                  <span className="lbl">Designation:</span>
                  <strong>{breakdownModalEmployee.designation}</strong>
                </div>
                <div>
                  <span className="lbl">Joining Date:</span>
                  <strong>{breakdownModalEmployee.joiningDate}</strong>
                </div>
                {breakdownModalEmployee.workerType === "Intern" && (
                  <div>
                    <span className="lbl">Internship Status:</span>
                    <strong>{breakdownModalEmployee.conversionStatus}</strong>
                  </div>
                )}
              </div>

              {/* Exact Formula Walkthrough */}
              <div className="breakdown-formula-box">
                <h4 className="formula-box-title">1. Calendar Day Rate Formula</h4>
                <div className="formula-item">
                  <span>Monthly Base Compensation:</span>
                  <strong>{money(breakdownModalEmployee.monthlyCompensation)}</strong>
                </div>
                <div className="formula-item">
                  <span>Actual Calendar Days in {selectedMonth} {selectedYear}:</span>
                  <strong>{breakdownModalEmployee.calendarDays} Days</strong>
                </div>
                <div className="formula-highlight">
                  <span>Daily Salary = Base Compensation ÷ Calendar Days:</span>
                  <strong>
                    {money(breakdownModalEmployee.monthlyCompensation)} ÷ {breakdownModalEmployee.calendarDays} = {money(breakdownModalEmployee.dailySalary)}/day
                  </strong>
                </div>
              </div>

              {/* Attendance Classification */}
              <div className="breakdown-attendance-box">
                <h4 className="formula-box-title">2. Attendance Payability Breakdown</h4>
                <div className="attendance-audit-grid">
                  <div className="audit-col">
                    <span>Present Days (1.0 paid):</span>
                    <strong>{breakdownModalEmployee.presentDays}</strong>
                  </div>
                  <div className="audit-col">
                    <span>Half Days (0.5 paid, 0.5 LOP):</span>
                    <strong>{breakdownModalEmployee.halfDays}</strong>
                  </div>
                  <div className="audit-col">
                    <span>Approved Paid Leave:</span>
                    <strong>{breakdownModalEmployee.paidLeaveDays}</strong>
                  </div>
                  <div className="audit-col">
                    <span>Approved Unpaid Leave:</span>
                    <strong>{breakdownModalEmployee.unpaidLeaveDays}</strong>
                  </div>
                  <div className="audit-col">
                    <span>Weekly Offs:</span>
                    <strong>{breakdownModalEmployee.weeklyOffDays}</strong>
                  </div>
                  <div className="audit-col">
                    <span>Approved Holidays:</span>
                    <strong>{breakdownModalEmployee.holidayDays}</strong>
                  </div>
                  <div className="audit-col">
                    <span>Absent Days:</span>
                    <strong>{breakdownModalEmployee.absentDays}</strong>
                  </div>
                  <div className="audit-col col-lop">
                    <span>Total LOP Days:</span>
                    <strong>{breakdownModalEmployee.lopDays} Days</strong>
                  </div>
                </div>
              </div>

              {/* Company Structure Breakdown (Excel Structure) */}
              <div className="breakdown-structure-box">
                <h4 className="formula-box-title">3. Company Salary Components (Excel Structure)</h4>
                <div className="structure-audit-two-col">
                  <div className="structure-col col-yellow">
                    <span className="col-title">Fixed Structure</span>
                    <div className="audit-line">
                      <span>Fixed Gross:</span>
                      <strong>{money(breakdownModalEmployee.fixedGrossSalary || breakdownModalEmployee.monthlyCompensation)}</strong>
                    </div>
                    <div className="audit-line">
                      <span>Basic + DA (50%):</span>
                      <strong>{money(breakdownModalEmployee.basicSalary)}</strong>
                    </div>
                    <div className="audit-line">
                      <span>HRA (25%):</span>
                      <strong>{money(breakdownModalEmployee.hra)}</strong>
                    </div>
                    <div className="audit-line">
                      <span>Flexi Allowance (25%):</span>
                      <strong>{money(breakdownModalEmployee.flexiAllowance)}</strong>
                    </div>
                  </div>

                  <div className="structure-col col-earned">
                    <span className="col-title">Earned Components (Pro-Rata)</span>
                    <div className="audit-line">
                      <span>Earn Basic:</span>
                      <strong>{money(breakdownModalEmployee.earnBasic)}</strong>
                    </div>
                    <div className="audit-line">
                      <span>Earn HRA:</span>
                      <strong>{money(breakdownModalEmployee.earnHra)}</strong>
                    </div>
                    <div className="audit-line">
                      <span>Earn Other Allo:</span>
                      <strong>{money(breakdownModalEmployee.earnOtherAllo)}</strong>
                    </div>
                    <div className="audit-line font-bold">
                      <span>Earn Gross:</span>
                      <strong className="text-emerald">{money(breakdownModalEmployee.earnGross || breakdownModalEmployee.grossEarnedSalary)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculation Reconciliation */}
              <div className="breakdown-reconcile-box">
                <h4 className="formula-box-title">4. Final Deductions & Net Statement</h4>
                <div className="reconcile-line">
                  <span>Gross Earned Salary</span>
                  <span>{money(breakdownModalEmployee.earnGross || breakdownModalEmployee.grossEarnedSalary)}</span>
                </div>
                <div className="reconcile-line line-deduction">
                  <span>
                    LOP Leave Deduction ({breakdownModalEmployee.lopDays} days × {money(breakdownModalEmployee.dailySalary)})
                  </span>
                  <span>−{money(breakdownModalEmployee.leaveDeduction || breakdownModalEmployee.lopDeduction)}</span>
                </div>
                <div className="reconcile-line line-deduction">
                  <span>Professional Tax (PT)</span>
                  <span>−{money(breakdownModalEmployee.ptDeducted)}</span>
                </div>
                <div className="reconcile-line line-deduction">
                  <span>PF Wages</span>
                  <span>{money(breakdownModalEmployee.pfWages || 0)}</span>
                </div>
                <div className="reconcile-line line-deduction">
                  <span>PF Deduction</span>
                  <span>{Number(breakdownModalEmployee.pfDeduction || 0) > 0 ? `−${money(breakdownModalEmployee.pfDeduction)}` : money(0)}</span>
                </div>
                {!breakdownModalEmployee.pfApplicable && (
                  <div className="audit-pf-note">
                    <Info size={13} />
                    <span>PF is currently not applicable according to company payroll configuration.</span>
                  </div>
                )}
                {Number(breakdownModalEmployee.tdsDeduction || 0) > 0 && (
                  <div className="reconcile-line line-deduction">
                    <span>TDS Deduction</span>
                    <span>−{money(breakdownModalEmployee.tdsDeduction)}</span>
                  </div>
                )}
                {Number(breakdownModalEmployee.otherDeductions || 0) > 0 && (
                  <div className="reconcile-line line-deduction">
                    <span>Other Deductions</span>
                    <span>−{money(breakdownModalEmployee.otherDeductions)}</span>
                  </div>
                )}
                {Number(breakdownModalEmployee.arrears || 0) > 0 && (
                  <div className="reconcile-line line-subtotal">
                    <span>Arrears</span>
                    <span>+{money(breakdownModalEmployee.arrears)}</span>
                  </div>
                )}
                <div className="reconcile-line line-net">
                  <span>Net Salary Payable</span>
                  <span className="net-val-big">{money(breakdownModalEmployee.netSalary)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="payroll-btn btn-secondary"
                onClick={() => setBreakdownModalEmployee(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="payroll-btn btn-primary"
                disabled={downloadingPdf}
                onClick={async () => {
                  if (downloadingPdf) return;
                  setDownloadingPdf(true);
                  try {
                    const empId = breakdownModalEmployee.employeeId;
                    const empMonth = breakdownModalEmployee.month || selectedMonth;
                    const empYear = breakdownModalEmployee.year || selectedYear;
                    const recId = breakdownModalEmployee.recordId || breakdownModalEmployee.id || empId;

                    const blob = await downloadPayslip(recId, empMonth, empYear);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Payslip_${empId}_${empMonth}_${empYear}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    alert("Payslip PDF download failed: " + err.message);
                  } finally {
                    setDownloadingPdf(false);
                  }
                }}
              >
                <Download size={14} />
                <span>{downloadingPdf ? "Generating Payslip..." : "Download Payslip PDF"}</span>
              </button>
            </div>
          </div>
        </div>
        </PortalModal>
      )}

      {/* ========================================================
          8. DRAWER / MODAL: SALARY & COMPENSATION CONFIGURATION
          ======================================================== */}
      {salaryConfigEmployee && (
        <PortalModal onClose={() => setSalaryConfigEmployee(null)}>
          <div className="payroll-modal-backdrop" onClick={() => setSalaryConfigEmployee(null)}>
          <div
            className="payroll-modal-container config-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Edit3 size={18} className="modal-title-icon" />
                <div>
                  <h3 className="modal-title">Configure Compensation</h3>
                  <p className="modal-subtitle">
                    {salaryConfigEmployee.employeeName} ({salaryConfigEmployee.employeeId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSalaryConfigEmployee(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSalary}>
              <div className="modal-body-content">
                <div className="form-group">
                  <label htmlFor="salary-worker-type">Worker Type</label>
                  <CustomSelect
                    id="salary-worker-type"
                    value={salaryForm.worker_type}
                    onChange={(val) => setSalaryForm({ ...salaryForm, worker_type: val })}
                    options={[
                      { value: "Regular Employee", label: "Regular Employee" },
                      { value: "Intern", label: "Intern" }
                    ]}
                    searchable={false}
                    size="md"
                    ariaLabel="Worker Type"
                  />
                  <small className="help-text">
                    Determines terminology (Salary vs Stipend) and leave policy applicability.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="salary-gross">
                    {salaryForm.worker_type === "Intern" ? "Monthly Stipend (₹)" : "Monthly Gross Salary (₹)"}
                  </label>
                  <input
                    id="salary-gross"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 15000"
                    value={salaryForm.gross_salary}
                    onChange={(e) => setSalaryForm({ ...salaryForm, gross_salary: e.target.value })}
                    className="payroll-input"
                    required
                  />
                  <small className="help-text">
                    Daily rate is dynamically divided by {calendarDays} calendar days in {selectedMonth} {selectedYear}.
                  </small>
                </div>

                <div className="form-row-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "10px" }}>
                  <div className="form-group">
                    <label htmlFor="salary-basic">Basic + DA (50%)</label>
                    <input
                      id="salary-basic"
                      type="number"
                      step="0.01"
                      min="0"
                      value={salaryForm.basic_salary}
                      onChange={(e) => setSalaryForm({ ...salaryForm, basic_salary: e.target.value })}
                      className="payroll-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="salary-hra">HRA (25%)</label>
                    <input
                      id="salary-hra"
                      type="number"
                      step="0.01"
                      min="0"
                      value={salaryForm.hra}
                      onChange={(e) => setSalaryForm({ ...salaryForm, hra: e.target.value })}
                      className="payroll-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="salary-flexi">Flexi Allowance (25%)</label>
                    <input
                      id="salary-flexi"
                      type="number"
                      step="0.01"
                      min="0"
                      value={salaryForm.flexi_allowance}
                      onChange={(e) => setSalaryForm({ ...salaryForm, flexi_allowance: e.target.value })}
                      className="payroll-input"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "10px" }}>
                  <label htmlFor="salary-pt" className="checkbox-form-label">
                    <input
                      id="salary-pt"
                      type="checkbox"
                      checked={salaryForm.pt_applicable}
                      onChange={(e) => setSalaryForm({ ...salaryForm, pt_applicable: e.target.checked })}
                    />
                    <span>Professional Tax (PT) Applicable ({money(settings?.pt_amount || 200)})</span>
                  </label>
                  <small className="help-text">
                    If unchecked, PT deduction will be ₹0 for this worker.
                  </small>
                </div>

                <div className="form-group" style={{ marginTop: "10px" }}>
                  <label htmlFor="salary-pf" className="checkbox-form-label">
                    <input
                      id="salary-pf"
                      type="checkbox"
                      checked={Boolean(salaryForm.pf_applicable)}
                      onChange={(e) => setSalaryForm({ ...salaryForm, pf_applicable: e.target.checked })}
                    />
                    <span>Provident Fund (PF) Applicable (Default: No · Current Company State: ₹0.00)</span>
                  </label>
                  <small className="help-text">
                    If unchecked, PF Wages & PF Deduction will be ₹0.00 for this worker.
                  </small>
                </div>

                <div className="form-row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="form-group">
                    <label htmlFor="salary-tds">TDS Deduction (₹)</label>
                    <input
                      id="salary-tds"
                      type="number"
                      step="0.01"
                      min="0"
                      value={salaryForm.tds_deduction}
                      onChange={(e) => setSalaryForm({ ...salaryForm, tds_deduction: e.target.value })}
                      className="payroll-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="salary-other-ded">Other Recurring Deductions (₹)</label>
                    <input
                      id="salary-other-ded"
                      type="number"
                      step="0.01"
                      min="0"
                      value={salaryForm.other_deductions}
                      onChange={(e) => setSalaryForm({ ...salaryForm, other_deductions: e.target.value })}
                      className="payroll-input"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="payroll-btn btn-secondary"
                  onClick={() => setSalaryConfigEmployee(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="payroll-btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Saving..." : "Save & Recalculate"}
                </button>
              </div>
            </form>
          </div>
        </div>
        </PortalModal>
      )}

      {/* ========================================================
          9. MODAL: COMPANY POLICY & INTERN RULES
          Matching Prompt Section 16, 21, 24, 30
          ======================================================== */}
      {showSettingsModal && (
        <PortalModal onClose={() => setShowSettingsModal(false)}>
          <div className="payroll-modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div
            className="payroll-modal-container policy-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <SettingsIcon size={18} className="modal-title-icon" />
                <div>
                  <h3 className="modal-title">Company Payroll & Intern Policy</h3>
                  <p className="modal-subtitle">Configure organization-wide rules for PT and Internship.</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowSettingsModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePolicy}>
              <div className="modal-body-content">
                {/* Professional Tax Settings */}
                <div className="policy-section">
                  <h4 className="policy-section-title">Professional Tax (PT) Configuration</h4>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label htmlFor="policy-pt-enabled" className="checkbox-form-label">
                        <input
                          id="policy-pt-enabled"
                          type="checkbox"
                          checked={policyForm.pt_enabled}
                          onChange={(e) => setPolicyForm({ ...policyForm, pt_enabled: e.target.checked })}
                        />
                        <span>Enable Professional Tax</span>
                      </label>
                    </div>
                    <div className="form-group">
                      <label htmlFor="policy-pt-amount">PT Monthly Amount (₹)</label>
                      <input
                        id="policy-pt-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={policyForm.pt_amount}
                        onChange={(e) => setPolicyForm({ ...policyForm, pt_amount: parseFloat(e.target.value) || 0 })}
                        className="payroll-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Provident Fund (PF) Settings */}
                <div className="policy-section">
                  <h4 className="policy-section-title">Provident Fund (PF) Configuration</h4>
                  <p className="policy-desc-text" style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                    Current company configuration: No employee receives or contributes PF (PF Applicable = No, PF = ₹0.00).
                    PF columns remain visible in all sheets, calculators, and exports. You may enable PF below if policy changes.
                  </p>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label htmlFor="policy-pf-enabled" className="checkbox-form-label">
                        <input
                          id="policy-pf-enabled"
                          type="checkbox"
                          checked={Boolean(policyForm.pf_applicable)}
                          onChange={(e) => setPolicyForm({ ...policyForm, pf_applicable: e.target.checked })}
                        />
                        <span>Enable Provident Fund (PF Applicable)</span>
                      </label>
                      <small className="help-text">
                        Currently: <strong>{policyForm.pf_applicable ? "Yes (Enabled)" : "No (Disabled · Current Company State)"}</strong>
                      </small>
                    </div>
                    <div className="form-group">
                      <label htmlFor="policy-pf-basis">PF Wages Basis</label>
                      <CustomSelect
                        id="policy-pf-basis"
                        value={policyForm.pf_wages_basis || "Basic + DA"}
                        onChange={(val) => setPolicyForm({ ...policyForm, pf_wages_basis: val })}
                        disabled={!policyForm.pf_applicable}
                        options={[
                          { value: "Basic + DA", label: "Basic + DA (Standard)" },
                          { value: "Gross Salary", label: "Gross Salary" }
                        ]}
                        searchable={false}
                        size="md"
                        ariaLabel="PF Wages Basis"
                      />
                    </div>
                  </div>
                  <div className="form-row-2" style={{ marginTop: "10px" }}>
                    <div className="form-group">
                      <label htmlFor="policy-pf-emp-pct">Employee Contribution (%)</label>
                      <input
                        id="policy-pf-emp-pct"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={policyForm.pf_employee_percent ?? 12}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, pf_employee_percent: parseFloat(e.target.value) || 12 })
                        }
                        className="payroll-input"
                        disabled={!policyForm.pf_applicable}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="policy-pf-ceiling">Wage Ceiling Limit (₹)</label>
                      <input
                        id="policy-pf-ceiling"
                        type="number"
                        step="100"
                        min="0"
                        value={policyForm.pf_wage_ceiling ?? 15000}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, pf_wage_ceiling: parseFloat(e.target.value) || 15000 })
                        }
                        className="payroll-input"
                        disabled={!policyForm.pf_applicable}
                      />
                    </div>
                  </div>
                </div>

                {/* Intern Policy Settings */}
                <div className="policy-section">
                  <h4 className="policy-section-title">Internship & Conversion Policy</h4>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label htmlFor="policy-intern-months">Internship Eligibility Period</label>
                      <input
                        id="policy-intern-months"
                        type="number"
                        min="1"
                        max="24"
                        value={policyForm.intern_eligibility_months}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, intern_eligibility_months: parseInt(e.target.value) || 6 })
                        }
                        className="payroll-input"
                      />
                      <small className="help-text">Months before intern becomes eligible for conversion (Default: 6).</small>
                    </div>
                    <div className="form-group">
                      <label htmlFor="policy-conv-mode">Conversion Mode</label>
                      <CustomSelect
                        id="policy-conv-mode"
                        value={policyForm.intern_conversion_mode}
                        onChange={(val) => setPolicyForm({ ...policyForm, intern_conversion_mode: val })}
                        options={[
                          { value: "Manual HR Approval", label: "Manual HR Approval (Recommended)" },
                          { value: "Automatic", label: "Automatic after 6 Months" },
                          { value: "Disabled", label: "Disabled" }
                        ]}
                        searchable={false}
                        size="md"
                        ariaLabel="Conversion Mode"
                      />
                    </div>
                  </div>

                  <div className="form-row-2" style={{ marginTop: "12px" }}>
                    <div className="form-group">
                      <label htmlFor="policy-intern-pl" className="checkbox-form-label">
                        <input
                          id="policy-intern-pl"
                          type="checkbox"
                          checked={policyForm.intern_paid_leave_enabled}
                          onChange={(e) => setPolicyForm({ ...policyForm, intern_paid_leave_enabled: e.target.checked })}
                        />
                        <span>Intern Paid Leave Enabled</span>
                      </label>
                    </div>
                    <div className="form-group">
                      <label htmlFor="policy-intern-quota">Intern Paid Leave Quota (Days)</label>
                      <input
                        id="policy-intern-quota"
                        type="number"
                        step="0.5"
                        min="0"
                        value={policyForm.intern_paid_leave_quota}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, intern_paid_leave_quota: parseFloat(e.target.value) || 0 })
                        }
                        className="payroll-input"
                      />
                    </div>
                  </div>
                </div>

                {/* General Treatment */}
                <div className="policy-section">
                  <h4 className="policy-section-title">Payable Days Treatment</h4>
                  <div className="checkbox-stack">
                    <label className="checkbox-form-label">
                      <input
                        type="checkbox"
                        checked={policyForm.weekly_off_paid}
                        onChange={(e) => setPolicyForm({ ...policyForm, weekly_off_paid: e.target.checked })}
                      />
                      <span>Weekly Offs are Paid (1.0 paid day)</span>
                    </label>
                    <label className="checkbox-form-label">
                      <input
                        type="checkbox"
                        checked={policyForm.paid_holiday_paid}
                        onChange={(e) => setPolicyForm({ ...policyForm, paid_holiday_paid: e.target.checked })}
                      />
                      <span>Official Paid Holidays are Paid (1.0 paid day)</span>
                    </label>
                    <label className="checkbox-form-label">
                      <input
                        type="checkbox"
                        checked={policyForm.allow_negative_salary}
                        onChange={(e) => setPolicyForm({ ...policyForm, allow_negative_salary: e.target.checked })}
                      />
                      <span>Allow Negative Net Salary (Otherwise flags exception)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="payroll-btn btn-secondary"
                  onClick={() => setShowSettingsModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="payroll-btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Saving..." : "Save Company Rules"}
                </button>
              </div>
            </form>
          </div>
        </div>
        </PortalModal>
      )}

      {/* ========================================================
          10. MODAL: INTERN CONVERSION REVIEW WORKFLOW
          Matching Prompt Section 23, 24, 25, 26, 64, 65
          ======================================================== */}
      {internConvertEmployee && (
        <PortalModal onClose={() => setInternConvertEmployee(null)}>
          <div className="payroll-modal-backdrop" onClick={() => setInternConvertEmployee(null)}>
          <div
            className="payroll-modal-container intern-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <UserCog size={18} className="modal-title-icon" />
                <div>
                  <h3 className="modal-title">Intern Conversion Workflow</h3>
                  <p className="modal-subtitle">
                    {internConvertEmployee.employeeName} ({internConvertEmployee.employeeId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setInternConvertEmployee(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInternConversion}>
              <div className="modal-body-content">
                <div className="intern-info-banner">
                  <div>
                    <span className="lbl">Joining Date:</span>
                    <strong>{internConvertEmployee.joiningDate}</strong>
                  </div>
                  <div>
                    <span className="lbl">Current Status:</span>
                    <strong>{internConvertEmployee.conversionStatus}</strong>
                  </div>
                  <div>
                    <span className="lbl">Current Stipend:</span>
                    <strong>{money(internConvertEmployee.monthlyCompensation)}</strong>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "16px" }}>
                  <label htmlFor="convert-decision">HR Decision</label>
                  <CustomSelect
                    id="convert-decision"
                    value={convertForm.decision}
                    onChange={(val) => setConvertForm({ ...convertForm, decision: val })}
                    options={[
                      { value: "Converted", label: "Convert to Regular Employee" },
                      { value: "Extended", label: "Extend Internship" },
                      { value: "Not Converted", label: "Keep as Intern (Not Converted)" }
                    ]}
                    searchable={false}
                    size="md"
                    ariaLabel="HR Decision"
                  />
                </div>

                {convertForm.decision === "Converted" && (
                  <>
                    <div className="form-group">
                      <label htmlFor="convert-eff-date">Effective Employee Date</label>
                      <input
                        id="convert-eff-date"
                        type="date"
                        value={convertForm.effective_employee_date}
                        onChange={(e) =>
                          setConvertForm({ ...convertForm, effective_employee_date: e.target.value })
                        }
                        className="payroll-input"
                        required
                      />
                      <small className="help-text">
                        If mid-month, payroll proration applies using intern stipend prior to this date.
                      </small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="convert-new-sal">New Monthly Gross Salary (₹)</label>
                      <input
                        id="convert-new-sal"
                        type="number"
                        step="0.01"
                        min="0"
                        value={convertForm.new_salary}
                        onChange={(e) => setConvertForm({ ...convertForm, new_salary: e.target.value })}
                        className="payroll-input"
                        placeholder="e.g. 25000"
                        required
                      />
                    </div>
                  </>
                )}

                {convertForm.decision === "Extended" && (
                  <div className="form-group">
                    <label htmlFor="convert-ext-months">Extension Period (Months)</label>
                    <input
                      id="convert-ext-months"
                      type="number"
                      min="1"
                      max="12"
                      value={convertForm.extension_months}
                      onChange={(e) => setConvertForm({ ...convertForm, extension_months: e.target.value })}
                      className="payroll-input"
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="convert-notes">HR Decision Notes</label>
                  <textarea
                    id="convert-notes"
                    rows="3"
                    value={convertForm.notes}
                    onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })}
                    className="payroll-input"
                    placeholder="Provide justification and confirmation comments..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="payroll-btn btn-secondary"
                  onClick={() => setInternConvertEmployee(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="payroll-btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Submitting..." : "Submit Decision & Notify"}
                </button>
              </div>
            </form>
          </div>
        </div>
        </PortalModal>
      )}

      {/* ========================================================
          11. MODAL: FINALIZATION EXCEPTION CONFIRMATION
          ======================================================== */}
      {showFinalizeConfirm && (
        <PortalModal onClose={() => setShowFinalizeConfirm(false)}>
          <div className="payroll-modal-backdrop" onClick={() => setShowFinalizeConfirm(false)}>
          <div
            className="payroll-modal-container confirm-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header header-alert">
              <div className="modal-title-wrap">
                <AlertTriangle size={20} className="modal-title-icon text-rose" />
                <h3 className="modal-title">Unresolved Payroll Exceptions</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowFinalizeConfirm(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              <p>
                There are <strong>{summary?.payrollExceptions} unresolved exceptions</strong> in this payroll run (e.g. missing salaries or pending regularizations).
              </p>
              <p>
                It is recommended to resolve these exceptions before finalization. Do you have authorization to override and finalize anyway?
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="payroll-btn btn-secondary"
                onClick={() => setShowFinalizeConfirm(false)}
              >
                Go Back & Review
              </button>
              <button
                type="button"
                className="payroll-btn btn-danger"
                onClick={() => handleFinalize(true)}
                disabled={actionLoading}
              >
                {actionLoading ? "Finalizing..." : "Admin Override & Finalize"}
              </button>
            </div>
          </div>
        </div>
        </PortalModal>
      )}
    </div>
  );
}

function PortalModal({ children, onClose }) {
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return children;
  return createPortal(children, document.body);
}
