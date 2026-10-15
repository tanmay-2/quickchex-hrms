import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";

import {
  Search,
  Upload,
  Download,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileSpreadsheet,
  Eye,
  Pencil,
  Check,
  CalendarDays,
  Building2,
  CircleCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import PayslipDocument from "../../components/PayslipDocument";

import {
  fetchPayroll,
  validatePayroll,
  importPayroll,
  approvePayroll,
  updatePayroll,
  generatePayslip,
  downloadPayslip,
  exportPayroll,
} from "../../services/payrollService";

import CustomDropdown from "../../components/payroll/CustomDropdown";
import "./Salary.css";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const YEARS = Array.from(
  { length: 8 },
  (_, index) =>
    String(new Date().getFullYear() - index)
);

const STATUS_OPTIONS = [
  "Payroll Ready",
  "Action Required",
  "Salary Not Configured",
  "Payslip Generated",
  "Pending Approval",
  "Approved",
  "Paid",
  "Draft",
  "Imported",
];

const REQUIRED_TEMPLATE_HEADERS = [
  "Employee Name",
  "Employee ID",
  "Month",
  "Year",
  "Total Days in Month",
  "Present Days",
  "Absent Days",
  "Paid Leave",
  "Unpaid Leave",
  "Gross Salary",
  "PT Deducted",
  "Other Deductions",
  "Salary Credited",
  "Final Amount Credited",
];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const aliases = {
  name: ["employee name", "name"],
  id: [
    "employee id",
    "employee number",
    "employee no",
    "emp id",
    "emp code",
    "employee_id",
  ],
  month: ["month"],
  year: ["year"],
  total: [
    "total days in month",
    "total days",
    "days in month",
  ],
  present: [
    "present days",
    "present",
    "paid days",
  ],
  absent: ["absent days", "absent"],
  paidLeave: [
    "paid leave",
    "paid leave days",
  ],
  unpaidLeave: [
    "unpaid leave",
    "unpaid leave days",
  ],
  gross: [
    "gross salary",
    "gross",
    "gross earnings",
  ],
  pt: [
    "pt deducted",
    "pt",
    "professional tax",
  ],
  other: [
    "other deductions",
    "other deduction",
  ],
  credited: [
    "salary credited",
    "credited salary",
  ],
  final: [
    "final amount credited",
    "final amount",
    "net salary",
    "net pay",
  ],
};

const toNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(
    String(value).replace(/[₹,]/g, "")
  );

  return Number.isFinite(number)
    ? number
    : null;
};

const monthName = (value) => {
  const source = String(value || "")
    .trim()
    .toLowerCase();

  const exactMonth = MONTHS.find(
    (month) =>
      month.toLowerCase() === source
  );

  if (exactMonth) {
    return exactMonth;
  }

  const numericMonth = toNumber(value);

  if (
    Number.isInteger(numericMonth) &&
    numericMonth >= 1 &&
    numericMonth <= 12
  ) {
    return MONTHS[numericMonth - 1];
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : MONTHS[date.getMonth()];
};

const daysInMonth = (month, year) => {
  const monthIndex =
    MONTHS.indexOf(month);

  if (monthIndex < 0) {
    return 0;
  }

  return new Date(
    Number(year),
    monthIndex + 1,
    0
  ).getDate();
};

const getHeader = (headers, key) => {
  const allowed = aliases[key];

  return headers.find((header) =>
    allowed.includes(
      normalizeHeader(header)
    )
  );
};

const localValidate = (rawRows) => {
  if (!rawRows.length) {
    return {
      valid: [],
      invalid: [
        {
          row: 2,
          errors: ["No data rows found."],
        },
      ],
    };
  }

  const headers = Object.keys(rawRows[0]);

  const headerMap = {};

  Object.keys(aliases).forEach((key) => {
    headerMap[key] = getHeader(
      headers,
      key
    );
  });

  const missing = Object.keys(aliases)
    .filter((key) => !headerMap[key])
    .map((key) => key);

  if (missing.length) {
    return {
      valid: [],
      invalid: [
        {
          row: 1,
          errors: [
            `Missing required columns: ${missing.join(
              ", "
            )}`,
          ],
        },
      ],
    };
  }

  const seen = new Set();
  const valid = [];
  const invalid = [];

  rawRows.forEach((rowData, index) => {
    const row = index + 2;

    const record = {
      employeeName: String(
        rowData[headerMap.name] || ""
      ).trim(),

      employeeId: String(
        rowData[headerMap.id] || ""
      ).trim(),

      month: monthName(
        rowData[headerMap.month]
      ),

      year: toNumber(
        rowData[headerMap.year]
      ),

      totalDays: toNumber(
        rowData[headerMap.total]
      ),

      presentDays: toNumber(
        rowData[headerMap.present]
      ),

      absentDays: toNumber(
        rowData[headerMap.absent]
      ),

      paidLeave: toNumber(
        rowData[headerMap.paidLeave]
      ),

      unpaidLeave: toNumber(
        rowData[headerMap.unpaidLeave]
      ),

      grossSalary: toNumber(
        rowData[headerMap.gross]
      ),

      ptDeducted: toNumber(
        rowData[headerMap.pt]
      ),

      otherDeductions: toNumber(
        rowData[headerMap.other]
      ),

      salaryCredited: toNumber(
        rowData[headerMap.credited]
      ),

      finalAmountCredited: toNumber(
        rowData[headerMap.final]
      ),
    };

    const errors = [];

    if (!record.employeeName) {
      errors.push(
        "Employee Name is required"
      );
    }

    if (!record.employeeId) {
      errors.push(
        "Employee ID is required"
      );
    }

    if (!record.month) {
      errors.push("Invalid Month");
    }

    if (
      !record.year ||
      record.year < 2000 ||
      record.year > 2100
    ) {
      errors.push("Invalid Year");
    }

    const maxDays = daysInMonth(
      record.month,
      record.year
    );

    if (
      record.totalDays === null ||
      record.totalDays <= 0 ||
      record.totalDays > maxDays
    ) {
      errors.push(
        "Invalid Total Days in Month"
      );
    }

    [
      "presentDays",
      "absentDays",
      "paidLeave",
      "unpaidLeave",
    ].forEach((key) => {
      if (
        record[key] === null ||
        record[key] < 0
      ) {
        errors.push(
          `${key} must be a non-negative number`
        );
      }
    });

    if (
      [
        record.presentDays,
        record.absentDays,
        record.paidLeave,
        record.unpaidLeave,
      ].every(
        (value) => value !== null
      ) &&
      record.totalDays !== null &&
      record.presentDays +
        record.absentDays +
        record.paidLeave +
        record.unpaidLeave >
        record.totalDays
    ) {
      errors.push(
        "Attendance/leave days exceed total days"
      );
    }

    [
      "grossSalary",
      "ptDeducted",
      "otherDeductions",
      "salaryCredited",
      "finalAmountCredited",
    ].forEach((key) => {
      if (
        record[key] === null ||
        record[key] < 0
      ) {
        errors.push(
          `${key} must be a non-negative number`
        );
      }
    });

    const uniqueKey =
      `${record.employeeId}|${record.month}|${record.year}`;

    if (seen.has(uniqueKey)) {
      errors.push(
        "Duplicate employee/month/year"
      );
    }

    seen.add(uniqueKey);

    if (errors.length) {
      invalid.push({
        row,
        ...record,
        errors,
      });
    } else {
      valid.push({
        row,
        ...record,
        errors: [],
      });
    }
  });

  return {
    valid,
    invalid,
  };
};

const normalizePayrollRow = (row) => ({
  ...row,
  id: row.id || (row.emp_code ? `rec-${row.emp_code}-${row.month || "cur"}-${row.year || "cur"}` : undefined),
  employeeId:
    row.employeeId ??
    row.employee_id ??
    row.emp_code ??
    "",
  employeeName:
    row.employeeName ??
    row.employee_name ??
    row.name ??
    "Employee",
  department:
    row.department ??
    row.department_name ??
    "Operations",
  designation:
    row.designation ??
    row.role ??
    "—",
  workerType:
    row.workerType ??
    row.worker_type ??
    (String(row.designation || "").toLowerCase().includes("intern")
      ? "Intern"
      : "Regular Employee"),
  employmentStatus:
    row.employmentStatus ??
    row.employment_status ??
    "Active",
  month: row.month ?? "",
  year: Number(row.year ?? 0),
  calendarDays: Number(
    row.calendarDays ??
      row.calendar_days ??
      row.totalDays ??
      row.total_days ??
      30
  ),
  totalDays: Number(
    row.totalDays ??
      row.total_days ??
      row.calendarDays ??
      row.calendar_days ??
      30
  ),
  presentDays: Number(
    row.presentDays ??
      row.present_days ??
      0
  ),
  halfDays: Number(
    row.halfDays ??
      row.half_days ??
      0
  ),
  absentDays: Number(
    row.absentDays ??
      row.absent_days ??
      0
  ),
  paidLeave: Number(
    row.paidLeaveDays ??
      row.paidLeave ??
      row.paid_leave ??
      0
  ),
  unpaidLeave: Number(
    row.unpaidLeaveDays ??
      row.unpaidLeave ??
      row.unpaid_leave ??
      0
  ),
  monthlyCompensation: Number(
    row.monthlyCompensation ??
      row.monthlySalary ??
      row.fixedGrossSalary ??
      row.grossSalary ??
      0
  ),
  grossSalary: Number(
    row.grossSalary ??
      row.gross_salary ??
      row.grossEarnedSalary ??
      row.monthlyCompensation ??
      0
  ),
  grossEarnedSalary: Number(
    row.grossEarnedSalary ??
      row.grossSalary ??
      row.gross_salary ??
      0
  ),
  ptDeducted: Number(
    row.ptDeducted ??
      row.pt_deducted ??
      row.pt ??
      0
  ),
  otherDeductions: Number(
    row.otherDeductions ??
      row.other_deductions ??
      row.other ??
      0
  ),
  salaryCredited: Number(
    row.salaryCredited ??
      row.salary_credited ??
      row.netSalary ??
      row.finalAmountCredited ??
      0
  ),
  finalAmountCredited: Number(
    row.finalAmountCredited ??
      row.final_amount_credited ??
      row.netSalary ??
      row.salaryCredited ??
      0
  ),
  status:
    row.status ?? "Imported",
  payslipGenerated: Boolean(
    row.payslipGenerated ??
      row.payslip_generated
  ),
  payslipId:
    row.payslipId ??
    row.payslip_id ??
    null,
  exceptions: Array.isArray(row.exceptions) ? row.exceptions : [],
});

/* ---------------------------------------------------------
   LOCAL .XLSX TEMPLATE
--------------------------------------------------------- */

const downloadPayrollTemplate = () => {
  const sampleRow = [
    "Example Employee",
    "EMP-0001",
    "August",
    new Date().getFullYear(),
    31,
    25,
    1,
    5,
    0,
    50000,
    200,
    0,
    49800,
    49800,
  ];

  const worksheet =
    XLSX.utils.aoa_to_sheet([
      REQUIRED_TEMPLATE_HEADERS,
      sampleRow,
    ]);

  worksheet["!cols"] =
    REQUIRED_TEMPLATE_HEADERS.map(
      (_, index) => ({
        wch: [
          24,
          18,
          14,
          10,
          21,
          15,
          15,
          14,
          16,
          18,
          14,
          19,
          18,
          23,
        ][index],
      })
    );

  worksheet["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
  };

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Payroll Template"
  );

  XLSX.writeFile(
    workbook,
    "LA_ESFERA_Monthly_Payroll_Template.xlsx"
  );
};

function SalaryContent() {

  const [rows, setRows] =
    useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    toast,
    setToast,
  ] = useState("");

  const currentMonth = MONTHS[new Date().getMonth()] || "October";
  const currentYear = String(new Date().getFullYear());

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    month,
    setMonth,
  ] = useState(currentMonth);

  const [
    year,
    setYear,
  ] = useState(currentYear);

  const [
    department,
    setDepartment,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    uploadOpen,
    setUploadOpen,
  ] = useState(false);

  const [
    detail,
    setDetail,
  ] = useState(null);

  const [
    edit,
    setEdit,
  ] = useState(null);

  const [
    preview,
    setPreview,
  ] = useState(null);

  const [
    summary,
    setSummary,
  ] = useState({
    totalEmployees: 0,
    payrollRecords: 0,
    pendingApproval: 0,
    approved: 0,
    payslipsGenerated: 0,
    totalGrossPayroll: 0,
    totalDeductions: 0,
    totalSalaryCredited: 0,
  });

  // Synchronized top and bottom horizontal scrollbars & natural wheel / touch / keyboard navigation
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isSyncingScroll = useRef(false);

  const checkScrollBoundaries = () => {
    const el = bottomScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  };

  const handleTopScroll = (e) => {
    if (isSyncingScroll.current) return;
    if (bottomScrollRef.current) {
      isSyncingScroll.current = true;
      bottomScrollRef.current.scrollLeft = e.target.scrollLeft;
      checkScrollBoundaries();
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };

  const handleBottomScroll = (e) => {
    checkScrollBoundaries();
    if (isSyncingScroll.current) return;
    if (topScrollRef.current) {
      isSyncingScroll.current = true;
      topScrollRef.current.scrollLeft = e.target.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };

  const scrollHorizontally = (distance) => {
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollBy({ left: distance, behavior: "smooth" });
    }
  };

  // Keyboard navigation for table
  const handleTableKeyDown = (e) => {
    const targetTag = (e.target?.tagName || "").toUpperCase();
    if (
      targetTag === "INPUT" ||
      targetTag === "SELECT" ||
      targetTag === "TEXTAREA" ||
      e.target?.isContentEditable
    ) {
      return;
    }

    const tableEl = bottomScrollRef.current;
    if (!tableEl) return;

    const SCROLL_STEP = 160;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      tableEl.scrollBy({ left: -SCROLL_STEP, behavior: "smooth" });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      tableEl.scrollBy({ left: SCROLL_STEP, behavior: "smooth" });
    } else if (e.key === "Home" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      tableEl.scrollTo({ left: 0, behavior: "smooth" });
    } else if (e.key === "End" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      tableEl.scrollTo({ left: tableEl.scrollWidth, behavior: "smooth" });
    }
  };

  // Wheel listener: Shift + Wheel scrolls horizontally without hijacking ordinary vertical wheel
  useEffect(() => {
    const tableEl = bottomScrollRef.current;
    if (!tableEl) return;

    const onWheel = (e) => {
      // Shift + Vertical Wheel: Convert deltaY into horizontal scroll
      if (e.shiftKey && e.deltaY !== 0) {
        e.preventDefault();
        const factor = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1;
        tableEl.scrollLeft += e.deltaY * factor;
        checkScrollBoundaries();
        return;
      }

      // Touchpad horizontal gestures fire deltaX != 0 without shiftKey.
      // We deliberately do NOT preventDefault, letting the browser's native horizontal scrolling engine move smoothly.
      if (e.deltaX !== 0) {
        requestAnimationFrame(checkScrollBoundaries);
      }
    };

    tableEl.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      tableEl.removeEventListener("wheel", onWheel);
    };
  }, []);

  useEffect(() => {
    const updateScrollMetrics = () => {
      if (bottomScrollRef.current) {
        setTableScrollWidth(bottomScrollRef.current.scrollWidth);
        checkScrollBoundaries();
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
  }, [rows]);

  const timer =
    useRef();

  const notify = (message) => {
    setToast(message);

    clearTimeout(
      timer.current
    );

    timer.current =
      setTimeout(
        () => setToast(""),
        3000
      );
  };

  const handleResetFilters = () => {
    setSearch("");
    setMonth(currentMonth);
    setYear(currentYear);
    setDepartment("");
    setStatus("");
  };

  const hasActiveFilters = Boolean(
    search ||
    month !== currentMonth ||
    year !== currentYear ||
    department ||
    status
  );

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetchPayroll({
          search,
          month,
          year,
          department,
          status,
        });

      const dataRows =
        (
          Array.isArray(response)
            ? response
            : response?.records ||
              response?.items ||
              response?.data ||
              []
        ).map(
          normalizePayrollRow
        );

      setRows(dataRows);

      if (response?.summary) {
        setSummary({
          totalEmployees:
            response.summary.totalEmployees ??
            new Set(
              dataRows.map(
                (item) =>
                  item.employeeId
              )
            ).size,

          payrollRecords:
            response.summary.payrollRecords ??
            dataRows.length,

          pendingApproval:
            response.summary.pendingApproval ??
            dataRows.filter(
              (item) =>
                /pending/i.test(
                  item.status
                )
            ).length,

          approved:
            response.summary.approved ??
            dataRows.filter(
              (item) =>
                /approved/i.test(
                  item.status
                )
            ).length,

          payslipsGenerated:
            response.summary.payslipsGenerated ??
            dataRows.filter(
              (item) =>
                item.payslipGenerated
            ).length,

          totalGrossPayroll:
            response.summary.grossPayroll ??
            response.summary.totalGrossPayroll ??
            dataRows.reduce(
              (sum, item) =>
                sum +
                (item.grossEarnedSalary ||
                  item.grossSalary ||
                  0),
              0
            ),

          totalDeductions:
            response.summary.totalDeductions ??
            dataRows.reduce(
              (sum, item) =>
                sum +
                item.ptDeducted +
                item.otherDeductions,
              0
            ),

          totalSalaryCredited:
            response.summary.netPayroll ??
            response.summary.totalSalaryCredited ??
            dataRows.reduce(
              (sum, item) =>
                sum +
                (item.finalAmountCredited ||
                  item.salaryCredited ||
                  0),
              0
            ),
        });
      } else {
        setSummary({
          totalEmployees:
            new Set(
              dataRows.map(
                (item) =>
                  item.employeeId
              )
            ).size,

          payrollRecords:
            dataRows.length,

          pendingApproval:
            dataRows.filter(
              (item) =>
                /pending/i.test(
                  item.status
                )
            ).length,

          approved:
            dataRows.filter(
              (item) =>
                /approved/i.test(
                  item.status
                )
            ).length,

          payslipsGenerated:
            dataRows.filter(
              (item) =>
                item.payslipGenerated
            ).length,

          totalGrossPayroll:
            dataRows.reduce(
              (sum, item) =>
                sum +
                (item.grossEarnedSalary ||
                  item.grossSalary ||
                  0),
              0
            ),

          totalDeductions:
            dataRows.reduce(
              (sum, item) =>
                sum +
                item.ptDeducted +
                item.otherDeductions,
              0
            ),

          totalSalaryCredited:
            dataRows.reduce(
              (sum, item) =>
                sum +
                (item.finalAmountCredited ||
                  item.salaryCredited ||
                  0),
              0
            ),
        });
      }
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to load payroll"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    clearTimeout(timer.current);

    timer.current =
      setTimeout(
        load,
        250
      );

    return () =>
      clearTimeout(
        timer.current
      );
  }, [
    search,
    month,
    year,
    department,
    status,
  ]);

  useEffect(() => {
    const handleSync = () => load();
    window.addEventListener("payroll-updated", handleSync);
    window.addEventListener("employees-updated", handleSync);
    window.addEventListener("focus", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("payroll-updated", handleSync);
      window.removeEventListener("employees-updated", handleSync);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const departments =
    useMemo(
      () =>
        [
          ...new Set(
            rows
              .map(
                (item) =>
                  item.department
              )
              .filter(
                (item) =>
                  item &&
                  item !== "—"
              )
          ),
        ].sort(),
      [rows]
    );

  const action = async (
    key,
    callback
  ) => {
    try {
      setBusy(key);

      await callback();

      notify(
        "Updated successfully"
      );

      await load();
    } catch (requestError) {
      notify(
        requestError.message ||
          "Action failed"
      );
    } finally {
      setBusy("");
    }
  };

  const downloadRow =
    async (row) =>
      action(
        `download-${row.id}`,
        async () => {
          const blob =
            await downloadPayslip(
              row.id
            );

          const url =
            URL.createObjectURL(
              blob
            );

          const anchor =
            document.createElement(
              "a"
            );

          anchor.href = url;

          anchor.download =
            `${row.employeeName}-${row.month}-${row.year}-Payslip.pdf`;

          document.body.appendChild(
            anchor
          );

          anchor.click();

          anchor.remove();

          setTimeout(
            () =>
              URL.revokeObjectURL(
                url
              ),
            1000
          );
        }
      );

  const doExport =
    async (format) =>
      action(
        `export-${format}`,
        async () => {
          if (
            format === "template"
          ) {
            downloadPayrollTemplate();
            notify(
              "Excel template downloaded"
            );
            return;
          }

          // Helper: generate CSV from loaded rows (client-side fallback)
          const generateClientCSV = () => {
            const escape = (v) => {
              const s = String(v == null ? "" : v);
              return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            };
            const headers = [
              "Employee Name", "Employee ID", "Department",
              "Month", "Year", "Gross Salary", "PT Deducted",
              "Other Deductions", "Salary Credited", "Final Amount", "Status"
            ];
            const dataRows = rows.map((r) => [
              r.employeeName || r.name || "",
              r.employeeId || r.empCode || "",
              r.department || "",
              r.month || "",
              r.year || "",
              r.grossSalary ?? r.gross ?? "",
              r.ptDeducted ?? r.pt ?? "",
              r.otherDeductions ?? r.other ?? "",
              r.salaryCredited ?? r.credited ?? "",
              r.finalAmount ?? r.final ?? "",
              r.status || "",
            ].map(escape).join(","));
            return [headers.join(","), ...dataRows].join("\n");
          };

          let blob;
          try {
            blob =
              await exportPayroll({
                format,
                search,
                month,
                year,
                department,
                status,
              });
          } catch {
            // Backend unavailable — fall back to client-side CSV
            const csv = generateClientCSV();
            blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            notify("Exported from local data");
          }

          const url =
            URL.createObjectURL(
              blob
            );

          const anchor =
            document.createElement(
              "a"
            );

          anchor.href = url;

          anchor.download =
            `Payroll-${month || "All"}-${year || "Years"}.${
              format === "xlsx"
                ? "xlsx"
                : "csv"
            }`;

          document.body.appendChild(
            anchor
          );

          anchor.click();

          anchor.remove();

          setTimeout(
            () =>
              URL.revokeObjectURL(
                url
              ),
            1000
          );
        }
      );

  return (
    <div className="payroll-layout">
      {/* ─── Top Action Bar ─── */}
      <header className="payroll-page-header">
        <div className="payroll-actions">
          <button
            type="button"
            className="pay-btn secondary"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            className="pay-btn secondary"
            onClick={() => doExport("csv")}
          >
            <Download size={15} />
            Export
          </button>

          <button
            type="button"
            className="pay-btn primary"
            onClick={() => setUploadOpen(true)}
          >
            <Upload size={15} />
            Upload Excel
          </button>
        </div>
      </header>

      {/* ─── Informational Banner ─── */}
      <div className="payroll-toolbar">
        <div className="payroll-toolbar-left">
          <FileSpreadsheet size={18} className="payroll-toolbar-icon" />
          <div className="payroll-toolbar-text">
            <b>Monthly Payroll Management</b>
            <span>Review attendance, calculate gross and net pay, approve records and generate payslips.</span>
          </div>
        </div>

        <button
          type="button"
          className="template-btn"
          onClick={() => doExport("template")}
        >
          Download Excel Template
        </button>
      </div>

      {/* ─── Error Alert Banner ─── */}
      {error && (
        <div className="pay-error-banner" role="alert">
          <div className="pay-error-left">
            <AlertCircle size={18} />
            <div className="pay-error-text">
              <strong>Unable to load payroll records</strong>
              <span>{error}</span>
            </div>
          </div>
          <button
            type="button"
            className="pay-btn secondary pay-btn-sm"
            onClick={load}
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      )}

      {/* ─── KPI Summary Cards Grid ─── */}
      <section className="pay-summary" aria-label="Payroll Summary Metrics">
        {[
          ["Total Employees", summary.totalEmployees],
          ["Payroll Records", summary.payrollRecords],
          ["Pending Approval", summary.pendingApproval],
          ["Approved", summary.approved],
          ["Payslips Generated", summary.payslipsGenerated],
          ["Gross Payroll", money(summary.totalGrossPayroll)],
          ["Deductions", money(summary.totalDeductions)],
          ["Salary Credited", money(summary.totalSalaryCredited)],
        ].map(([label, value]) => (
          <div className="summary-card" key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </section>

      {/* ─── Search & Filter Toolbar ─── */}
      <section className="filter-card" aria-label="Payroll Filters">
        {/* Row 1 on mobile: Full-width search */}
        <div className="pay-filter-row-full">
          <div className="search-box">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search employee name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search employee name or ID"
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch("")}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2 on mobile: Month + Year pair */}
        <div className="pay-filter-row-pair">
          <CustomDropdown
            label="Month"
            value={month}
            placeholder="All Months"
            icon={CalendarDays}
            options={[
              { value: "", label: "All Months" },
              ...MONTHS.map((item) => ({ value: item, label: item })),
            ]}
            onChange={setMonth}
          />

          <CustomDropdown
            label="Year"
            value={year}
            placeholder="All Years"
            icon={CalendarDays}
            options={[
              { value: "", label: "All Years" },
              ...YEARS.map((item) => ({ value: item, label: item })),
            ]}
            onChange={setYear}
          />
        </div>

        {/* Row 3 on mobile: Department + Status pair */}
        <div className="pay-filter-row-pair">
          <CustomDropdown
            label="Department"
            value={department}
            placeholder="All Departments"
            icon={Building2}
            options={[
              { value: "", label: "All Departments" },
              ...departments.map((item) => ({ value: item, label: item })),
            ]}
            onChange={setDepartment}
          />

          <CustomDropdown
            label="Status"
            value={status}
            placeholder="All Statuses"
            icon={CircleCheck}
            options={[
              { value: "", label: "All Statuses" },
              ...STATUS_OPTIONS.map((item) => ({ value: item, label: item })),
            ]}
            onChange={setStatus}
          />
        </div>

        {/* Clear filters action when active */}
        {hasActiveFilters && (
          <div className="pay-filter-reset-wrap">
            <button
              type="button"
              className="pay-filter-reset-btn"
              onClick={handleResetFilters}
              title="Reset all filters to current month"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        )}
      </section>

      {/* ─── Main Payroll Content Section ─── */}
      <section className="table-card" aria-label="Employee Payroll List">
        <div className="table-heading">
          <div>
            <span>MONTHLY PAYROLL</span>
            <h2>Employee Payroll</h2>
            <p>All imported payroll records for the selected filters.</p>
          </div>

          <div className="table-heading-actions">
            {/* Horizontal Scroll Controls */}
            <div className="salary-scroll-nav" role="group" aria-label="Table horizontal scroll controls">
              <button
                type="button"
                className="salary-scroll-nav-btn"
                onClick={() => scrollHorizontally(-260)}
                disabled={!canScrollLeft}
                title="Scroll table left (or Left Arrow / Shift + Wheel)"
                aria-label="Scroll table left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="salary-scroll-nav-btn"
                onClick={() => scrollHorizontally(260)}
                disabled={!canScrollRight}
                title="Scroll table right (or Right Arrow / Shift + Wheel)"
                aria-label="Scroll table right"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <strong className="table-count-badge">
              {rows.length} {rows.length === 1 ? "record" : "records"}
            </strong>
          </div>
        </div>

        {loading ? (
          <div className="pay-loading-container">
            <Loader2 className="spin" size={28} />
            <span>Loading payroll records...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="pay-empty-state">
            <FileSpreadsheet size={36} className="pay-empty-icon" />
            <h3>No payroll records found for the selected filters</h3>
            <p>Try selecting a different month, year, or clearing your active filters.</p>
            {hasActiveFilters && (
              <button
                type="button"
                className="pay-btn secondary pay-btn-sm"
                onClick={handleResetFilters}
              >
                <RotateCcw size={13} />
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ─── DESKTOP TABLE VIEW (Visible at > 768px) ─── */}
            <div className="salary-desktop-table-container">
              {/* Synchronized Top Horizontal Scroller */}
              <div
                className="salary-table-top-scroll"
                ref={topScrollRef}
                onScroll={handleTopScroll}
                aria-hidden="true"
                title="Scroll table horizontally"
              >
                <div
                  className="salary-table-top-scroll-inner"
                  style={{ width: tableScrollWidth ? `${tableScrollWidth}px` : "100%" }}
                />
              </div>

              <div
                className="salary-table-wrap"
                ref={bottomScrollRef}
                onScroll={handleBottomScroll}
                tabIndex={0}
                onKeyDown={handleTableKeyDown}
                role="region"
                aria-label="Payroll records table. Use Left/Right Arrow keys or Shift + Mouse Wheel to scroll horizontally."
              >
                <table className="salary-data-table">
                  <thead>
                    <tr>
                      <th className="th-employee">Employee</th>
                      <th className="th-id">ID</th>
                      <th className="th-month">Month</th>
                      <th className="th-present num-col">Present</th>
                      <th className="th-gross num-col">Gross</th>
                      <th className="th-pt num-col">PT</th>
                      <th className="th-other num-col">Other</th>
                      <th className="th-credited num-col">Credited</th>
                      <th className="th-final num-col">Final</th>
                      <th className="th-status center-col">Status</th>
                      <th className="th-payslip center-col">Payslip</th>
                      <th className="th-actions center-col">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id || `${row.employeeId}-${row.month}-${row.year}`}>
                        {/* Employee Identity */}
                        <td className="td-employee">
                          <div className="employee-cell">
                            <div className="avatar" aria-hidden="true">
                              {(row.employeeName || "EM")
                                .split(" ")
                                .filter(Boolean)
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase() || "EM"}
                            </div>
                            <div className="employee-info-cell">
                              <b className="employee-name-title">{row.employeeName}</b>
                              <span className="employee-dept-sub">
                                {row.department}
                                {row.designation && row.designation !== "—" ? ` • ${row.designation}` : ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Employee Code */}
                        <td className="td-id">
                          <span className="emp-id-pill">{row.employeeId}</span>
                        </td>

                        {/* Payroll Period */}
                        <td className="td-month">
                          <span className="emp-period">{row.month} {row.year}</span>
                        </td>

                        {/* Attendance Days */}
                        <td className="td-present num-col">
                          {row.presentDays}
                        </td>

                        {/* Monthly Gross */}
                        <td className="td-gross num-col money-cell">
                          {money(row.monthlyCompensation || row.grossSalary)}
                        </td>

                        {/* Professional Tax */}
                        <td className="td-pt num-col money-cell">
                          {money(row.ptDeducted)}
                        </td>

                        {/* Other Deductions */}
                        <td className="td-other num-col money-cell">
                          {money(row.otherDeductions)}
                        </td>

                        {/* Credited Salary */}
                        <td className="td-credited num-col money-cell">
                          {money(row.salaryCredited)}
                        </td>

                        {/* Final Net Pay */}
                        <td className="td-final num-col money-cell font-bold">
                          {money(row.finalAmountCredited)}
                        </td>

                        {/* Status Badge */}
                        <td className="td-status center-col">
                          <Status value={row.status} />
                        </td>

                        {/* Payslip Action */}
                        <td className="td-payslip center-col">
                          {row.payslipGenerated ? (
                            <button
                              type="button"
                              className="pay-view-btn"
                              onClick={() => setPreview(row)}
                              title="View Payslip"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="pay-not-generated">Not generated</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="td-actions center-col">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="salary-row-action"
                              title="View Details"
                              onClick={() => setDetail(row)}
                            >
                              <Eye size={14} />
                            </button>

                            {!/approved/i.test(row.status) && (
                              <button
                                type="button"
                                className="salary-row-action"
                                title="Edit Record"
                                onClick={() => setEdit(row)}
                              >
                                <Pencil size={14} />
                              </button>
                            )}

                            {!/approved/i.test(row.status) && (
                              <button
                                type="button"
                                className="salary-row-action salary-row-action--approve"
                                title="Approve Payroll"
                                onClick={() =>
                                  action(`approve-${row.id}`, () =>
                                    approvePayroll(row.id)
                                  )
                                }
                              >
                                <Check size={14} />
                              </button>
                            )}

                            {!row.payslipGenerated && /approved/i.test(row.status) && (
                              <button
                                type="button"
                                className="salary-row-action salary-row-action--document"
                                title="Generate Payslip"
                                onClick={() =>
                                  action(`payslip-${row.id}`, () =>
                                    generatePayslip(row.id)
                                  )
                                }
                              >
                                <FileText size={14} />
                              </button>
                            )}

                            {row.payslipGenerated && (
                              <button
                                type="button"
                                className="salary-row-action salary-row-action--document"
                                title="Download Payslip PDF"
                                onClick={() => downloadRow(row)}
                              >
                                <Download size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── MOBILE CARDS VIEW (Visible at <= 768px) ─── */}
            <div className="salary-mobile-cards-list">
              {rows.map((row) => (
                <EmployeePayrollCard
                  key={row.id || `${row.employeeId}-${row.month}-${row.year}`}
                  row={row}
                  onViewDetails={setDetail}
                  onViewPayslip={setPreview}
                  onEdit={setEdit}
                  onApprove={(r) =>
                    action(`approve-${r.id}`, () => approvePayroll(r.id))
                  }
                  onGeneratePayslip={(r) =>
                    action(`payslip-${r.id}`, () => generatePayslip(r.id))
                  }
                  onDownloadPayslip={downloadRow}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ─── Toast Notification ─── */}
      {toast && (
        <div className="pay-toast" role="status">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}

      {/* ─── Upload Modal ─── */}
      {uploadOpen && (
        <UploadModal
          close={() => setUploadOpen(false)}
          done={async (result) => {
            setUploadOpen(false);
            notify(
              `${
                result?.successfulRecords ??
                result?.importedRecords ??
                0
              } payroll records imported`
            );
            await load();
          }}
        />
      )}

      {/* ─── Detail Modal ─── */}
      {detail && (
        <DetailModal
          row={detail}
          close={() => setDetail(null)}
          preview={() => {
            setPreview(detail);
            setDetail(null);
          }}
        />
      )}

      {/* ─── Edit Modal ─── */}
      {edit && (
        <EditModal
          row={edit}
          close={() => setEdit(null)}
          save={(values) =>
            action(`edit-${edit.id}`, async () => {
              await updatePayroll(edit.id, values);
              setEdit(null);
            })
          }
        />
      )}

      {/* ─── Preview Modal ─── */}
      {preview && (
        <PreviewModal
          row={preview}
          close={() => setPreview(null)}
          download={() => downloadRow(preview)}
          busy={busy === `download-${preview.id}`}
        />
      )}
    </div>
  );
}

function Status({ value }) {
  const className = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  return (
    <span className={`status-pill status-pill--${className}`}>
      <span className="status-pill-dot" aria-hidden="true" />
      {value || "Unknown"}
    </span>
  );
}

function EmployeePayrollCard({
  row,
  onViewDetails,
  onViewPayslip,
  onEdit,
  onApprove,
  onGeneratePayslip,
  onDownloadPayslip,
}) {
  const initials = (row.employeeName || "EM")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "EM";

  const isConfigured =
    row.status !== "Salary Not Configured" &&
    (row.grossSalary > 0 || row.monthlyCompensation > 0);

  return (
    <article className="salary-card-item">
      {/* 1. Header: Avatar + Identity + Status badge */}
      <div className="salary-card-header">
        <div className="salary-card-id-block">
          <div className="salary-card-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="salary-card-id-text">
            <h3 className="salary-card-name">{row.employeeName}</h3>
            <span className="salary-card-badge-id">{row.employeeId}</span>
          </div>
        </div>
        <div className="salary-card-status-badge">
          <Status value={row.status} />
        </div>
      </div>

      <div className="salary-card-meta-line">
        <span className="salary-card-dept">{row.department}</span>
        {row.designation && row.designation !== "—" && (
          <span className="salary-card-desig">• {row.designation}</span>
        )}
        <span className="salary-card-period">• {row.month} {row.year}</span>
        {row.workerType && (
          <span className="salary-card-workertype">• {row.workerType}</span>
        )}
      </div>

      {/* 2. Payroll Breakdown Grid (2 columns) */}
      <div className="salary-card-grid">
        <div className="salary-card-stat">
          <span className="salary-card-stat-label">Present Days</span>
          <span className="salary-card-stat-val">{row.presentDays} days</span>
        </div>
        <div className="salary-card-stat">
          <span className="salary-card-stat-label">Monthly Gross</span>
          <span className="salary-card-stat-val font-semibold">
            {money(row.monthlyCompensation || row.grossSalary)}
          </span>
        </div>
        <div className="salary-card-stat">
          <span className="salary-card-stat-label">PT Deducted</span>
          <span className="salary-card-stat-val">{money(row.ptDeducted)}</span>
        </div>
        <div className="salary-card-stat">
          <span className="salary-card-stat-label">Other Deductions</span>
          <span className="salary-card-stat-val">{money(row.otherDeductions)}</span>
        </div>
        <div className="salary-card-stat salary-card-stat--highlight">
          <span className="salary-card-stat-label">Credited Salary</span>
          <span className="salary-card-stat-val salary-card-stat-val--primary">
            {money(row.salaryCredited)}
          </span>
        </div>
        <div className="salary-card-stat salary-card-stat--highlight">
          <span className="salary-card-stat-label">Final Net Pay</span>
          <span className="salary-card-stat-val salary-card-stat-val--bold">
            {money(row.finalAmountCredited)}
          </span>
        </div>
      </div>

      {/* 3. Warning callout if Salary Not Configured */}
      {!isConfigured && (
        <div className="salary-card-warning-callout">
          <AlertCircle size={14} />
          <span>Salary structure not configured in employee payroll master.</span>
        </div>
      )}

      {/* 4. Footer: View Payslip button + actions */}
      <div className="salary-card-footer">
        {row.payslipGenerated ? (
          <button
            type="button"
            className="salary-card-action-btn salary-card-action-btn--primary"
            onClick={() => onViewPayslip(row)}
          >
            <Eye size={15} />
            View Payslip
          </button>
        ) : (
          <span className="salary-card-not-gen">
            {row.status === "Salary Not Configured"
              ? "Salary setup required"
              : "Payslip not generated"}
          </span>
        )}

        <div className="salary-card-secondary-actions">
          <button
            type="button"
            className="salary-row-action"
            title="View Details"
            onClick={() => onViewDetails(row)}
          >
            <Eye size={15} />
          </button>
          {!/approved/i.test(row.status) && (
            <button
              type="button"
              className="salary-row-action"
              title="Edit Record"
              onClick={() => onEdit(row)}
            >
              <Pencil size={15} />
            </button>
          )}
          {!/approved/i.test(row.status) && (
            <button
              type="button"
              className="salary-row-action salary-row-action--approve"
              title="Approve"
              onClick={() => onApprove(row)}
            >
              <Check size={15} />
            </button>
          )}
          {!row.payslipGenerated && /approved/i.test(row.status) && (
            <button
              type="button"
              className="salary-row-action salary-row-action--document"
              title="Generate Payslip"
              onClick={() => onGeneratePayslip(row)}
            >
              <FileText size={15} />
            </button>
          )}
          {row.payslipGenerated && (
            <button
              type="button"
              className="salary-row-action salary-row-action--document"
              title="Download Payslip PDF"
              onClick={() => onDownloadPayslip(row)}
            >
              <Download size={15} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Modal({
  children,
  close,
  wide = false,
}) {
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close]);

  const modalNode = (
    <div
      className="modal-bg"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          close();
        }
      }}
    >
      <div
        className={`modal ${
          wide ? "wide" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalNode, document.body)
    : modalNode;
}

function DetailModal({
  row,
  close,
  preview,
}) {
  const values = [
    ["Total Days", row.totalDays],
    ["Present", row.presentDays],
    ["Absent", row.absentDays],
    ["Paid Leave", row.paidLeave],
    ["Unpaid Leave", row.unpaidLeave],
    ["Gross", money(row.grossSalary)],
    ["PT", money(row.ptDeducted)],
    [
      "Other Deductions",
      money(row.otherDeductions),
    ],
    [
      "Salary Credited",
      money(row.salaryCredited),
    ],
    [
      "Final Amount",
      money(row.finalAmountCredited),
    ],
  ];

  return (
    <Modal close={close}>
      <div className="modal-head">
        <div>
          <span>
            PAYROLL RECORD
          </span>

          <h3>
            {row.employeeName}
          </h3>

          <p>
            {row.employeeId} •{" "}
            {row.month}{" "}
            {row.year}
          </p>
        </div>

        <button
          type="button"
          onClick={close}
        >
          <X size={17} />
        </button>
      </div>

      <div className="detail-grid">
        {values.map(
          ([label, value]) => (
            <div key={label}>
              <span>
                {label}
              </span>
              <b>
                {value}
              </b>
            </div>
          )
        )}
      </div>

      <div className="modal-actions">
        <Status
          value={row.status}
        />

        {row.payslipGenerated && (
          <button
            type="button"
            className="pay-btn primary"
            onClick={preview}
          >
            <Eye size={15} />
            View Payslip
          </button>
        )}
      </div>
    </Modal>
  );
}

function EditModal({
  row,
  close,
  save,
}) {
  const [form, setForm] =
    useState({
      ...row,
    });

  const keys = [
    "totalDays",
    "presentDays",
    "absentDays",
    "paidLeave",
    "unpaidLeave",
    "grossSalary",
    "ptDeducted",
    "otherDeductions",
    "salaryCredited",
    "finalAmountCredited",
  ];

  return (
    <Modal close={close}>
      <div className="modal-head">
        <div>
          <span>
            EDIT PAYROLL
          </span>

          <h3>
            {row.employeeName}
          </h3>
        </div>

        <button
          type="button"
          onClick={close}
        >
          <X size={17} />
        </button>
      </div>

      <div className="edit-grid">
        {keys.map((key) => (
          <label key={key}>
            <span>
              {key.replace(
                /([A-Z])/g,
                " $1"
              )}
            </span>

            <input
              type="number"
              min="0"
              value={
                form[key] ?? ""
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  [key]: Number(
                    event.target
                      .value
                  ),
                })
              }
            />
          </label>
        ))}
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="pay-btn secondary"
          onClick={close}
        >
          Cancel
        </button>

        <button
          type="button"
          className="pay-btn primary"
          onClick={() =>
            save(form)
          }
        >
          <Check size={15} />
          Save Changes
        </button>
      </div>
    </Modal>
  );
}

function PreviewModal({
  row,
  close,
  download,
  busy,
}) {
  const slip = {
    month: `${row.month} ${row.year}`,
    netSalary:
      row.finalAmountCredited,

    employee: {
      employeeId: row.employeeId,
      name: row.employeeName,
      designation: row.designation || "—",
      department: row.department || "—",
      city: row.city || "Mumbai",
      state: row.state || "Maharashtra",
      location: row.location || row.locationName || "Mumbai",
      joiningDate: row.joiningDate || row.dateOfJoining || row.doj || "—",
      pan: row.pan || row.panNumber || "—",
      bankName: row.bankName || "—",
    },

    payroll: {
      totalDays:
        row.totalDays,

      paidDays:
        row.presentDays +
        row.paidLeave,

      arrearDays: 0,

      absentDays:
        row.absentDays,

      grossEarnings:
        row.grossSalary,

      earnings: [
        {
          label:
            "Gross Salary",
          amount:
            row.grossSalary,
        },
        {
          label:
            "Salary Credited",
          amount:
            row.salaryCredited,
        },
      ],

      deductions: [
        {
          label:
            "PT Deducted",
          amount:
            row.ptDeducted,
        },
        {
          label:
            "Other Deductions",
          amount:
            row.otherDeductions,
        },
      ],
    },
  };

  return (
    <Modal
      close={close}
      wide
    >
      <div className="modal-head">
        <div>
          <span>
            PAYSLIP PREVIEW
          </span>

          <h3>
            {row.employeeName} •{" "}
            {row.month}{" "}
            {row.year}
          </h3>
        </div>

        <button
          type="button"
          onClick={close}
        >
          <X size={17} />
        </button>
      </div>

      <div className="preview-actions">
        <button
          type="button"
          className="pay-btn secondary"
          onClick={close}
        >
          Back
        </button>

        <button
          type="button"
          className="pay-btn primary"
          onClick={download}
          disabled={busy}
        >
          {busy ? (
            <>
              <Loader2
                className="spin"
                size={15}
              />
              Preparing...
            </>
          ) : (
            <>
              <Download size={15} />
              Download PDF
            </>
          )}
        </button>
      </div>

      <div className="preview-scroll">
        <PayslipDocument
          slip={slip}
          employee={row.employee}
        />
      </div>
    </Modal>
  );
}

function UploadModal({
  close,
  done,
}) {
  const inputRef =
    useRef();

  const [file, setFile] =
    useState(null);

  const [stage, setStage] =
    useState("pick");

  const [validation, setValidation] =
    useState({
      valid: [],
      invalid: [],
    });

  const [error, setError] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [replace, setReplace] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const chooseFile = (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    if (
      !/\.(xlsx|xls)$/i.test(
        selectedFile.name
      )
    ) {
      setError(
        "Please upload .xlsx or .xls"
      );

      return;
    }

    setFile(selectedFile);
    setError("");
  };

  const validate = async () => {
    if (!file) {
      setError(
        "Choose an Excel file first"
      );

      return;
    }

    try {
      setBusy(true);
      setStage("validating");
      setError("");

      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(
          buffer,
          {
            type: "array",
          }
        );

      const firstSheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const raw =
        XLSX.utils.sheet_to_json(
          firstSheet,
          {
            defval: "",
            raw: false,
          }
        );

      let local =
        localValidate(raw);

      try {
        const backendResult =
          await validatePayroll(
            local.valid
          );

        local.valid =
          backendResult?.validRecords ||
          local.valid;

        local.invalid = [
          ...local.invalid,
          ...(backendResult
            ?.invalidRecords ||
            []),
        ];
      } catch {
        /*
         * Local validation remains usable
         * when the backend validation endpoint
         * is not available.
         */
      }

      setValidation(
        local
      );

      setStage(
        "preview"
      );
    } catch (readError) {
      setError(
        readError.message ||
          "Unable to read Excel"
      );

      setStage("pick");
    } finally {
      setBusy(false);
    }
  };

  const confirmImport =
    async () => {
      try {
        setBusy(true);
        setStage("importing");
        setError("");

        const importResult =
          await importPayroll({
            records:
              validation.valid,

            replace_existing:
              replace,

            skip_existing:
              !replace,
          });

        setResult(
          importResult
        );

        setStage("complete");

        done(
          importResult
        );
      } catch (importError) {
        setError(
          importError.message ||
            "Import failed"
        );

        setStage("preview");
      } finally {
        setBusy(false);
      }
    };

  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, busy]);

  const modalNode = (
    <div
      className="modal-bg"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) {
          close();
        }
      }}
    >
      <div className="upload-modal">
        <div className="modal-head">
          <div>
            <span>
              MONTHLY PAYROLL
            </span>

            <h3>
              Upload payroll
              Excel
            </h3>

            <p>
              Validate the file
              before creating
              payroll records.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
          >
            <X size={17} />
          </button>
        </div>

        {error && (
          <div className="pay-error">
            <AlertCircle
              size={15}
            />
            {error}
          </div>
        )}

        {stage === "pick" && (
          <>
            <button
              type="button"
              className="dropzone"
              onClick={() =>
                inputRef.current?.click()
              }
              onDragOver={(event) =>
                event.preventDefault()
              }
              onDrop={(event) => {
                event.preventDefault();

                chooseFile(
                  event.dataTransfer
                    .files[0]
                );
              }}
            >
              <Upload
                size={23}
              />

              <b>
                {file
                  ? file.name
                  : "Drop monthly Excel here or click to browse"}
              </b>

              <span>
                .xlsx and .xls
                supported
              </span>
            </button>

            <input
              hidden
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) =>
                chooseFile(
                  event.target
                    .files[0]
                )
              }
            />

            <div className="modal-actions">
              <button
                type="button"
                className="pay-btn secondary"
                onClick={close}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pay-btn primary"
                disabled={
                  !file ||
                  busy
                }
                onClick={
                  validate
                }
              >
                <CheckCircle2
                  size={15}
                />
                Validate Excel
              </button>
            </div>
          </>
        )}

        {stage ===
          "validating" && (
          <div className="processing">
            <Loader2
              className="spin"
              size={28}
            />

            <b>
              Validating
              payroll...
            </b>

            <span>
              Checking IDs,
              dates, days,
              salary values
              and duplicates.
            </span>
          </div>
        )}

        {stage === "preview" && (
          <>
            <div className="validation-cards">
              <div>
                Total
                <b>
                  {
                    validation
                      .valid
                      .length +
                    validation
                      .invalid
                      .length
                  }
                </b>
              </div>

              <div className="ok">
                Valid
                <b>
                  {
                    validation
                      .valid
                      .length
                  }
                </b>
              </div>

              <div className="bad">
                Invalid
                <b>
                  {
                    validation
                      .invalid
                      .length
                  }
                </b>
              </div>
            </div>

            <label className="replace-check">
              <input
                type="checkbox"
                checked={replace}
                onChange={(event) =>
                  setReplace(
                    event.target.checked
                  )
                }
              />

              Replace / update
              existing payroll
              records
            </label>

            {validation
              .invalid
              .length > 0 && (
              <div className="invalid-box">
                <b>
                  Rows requiring
                  attention
                </b>

                {validation.invalid
                  .slice(
                    0,
                    18
                  )
                  .map(
                    (invalidRow) => (
                      <div
                        key={
                          invalidRow.row
                        }
                      >
                        Row{" "}
                        {
                          invalidRow.row
                        }{" "}
                        —{" "}
                        {invalidRow.employeeName ||
                          "Unknown"}{" "}
                        —{" "}
                        {(
                          invalidRow.errors ||
                          []
                        ).join(
                          "; "
                        )}
                      </div>
                    )
                  )}
              </div>
            )}

            <div className="preview-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      Employee
                    </th>
                    <th>
                      ID
                    </th>
                    <th>
                      Month
                    </th>
                    <th>
                      Total
                    </th>
                    <th>
                      Present
                    </th>
                    <th>
                      Absent
                    </th>
                    <th>
                      Gross
                    </th>
                    <th>
                      PT
                    </th>
                    <th>
                      Other
                    </th>
                    <th>
                      Credited
                    </th>
                    <th>
                      Final
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {validation.valid.map(
                    (row) => (
                      <tr
                        key={`${row.employeeId}-${row.month}-${row.year}`}
                      >
                        <td>
                          {
                            row.employeeName
                          }
                        </td>
                        <td>
                          {
                            row.employeeId
                          }
                        </td>
                        <td>
                          {
                            row.month
                          }{" "}
                          {
                            row.year
                          }
                        </td>
                        <td>
                          {
                            row.totalDays
                          }
                        </td>
                        <td>
                          {
                            row.presentDays
                          }
                        </td>
                        <td>
                          {
                            row.absentDays
                          }
                        </td>
                        <td>
                          {money(
                            row.grossSalary
                          )}
                        </td>
                        <td>
                          {money(
                            row.ptDeducted
                          )}
                        </td>
                        <td>
                          {money(
                            row.otherDeductions
                          )}
                        </td>
                        <td>
                          {money(
                            row.salaryCredited
                          )}
                        </td>
                        <td>
                          {money(
                            row.finalAmountCredited
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="pay-btn secondary"
                onClick={() =>
                  setStage("pick")
                }
              >
                Back
              </button>

              <button
                type="button"
                className="pay-btn primary"
                disabled={
                  !validation
                    .valid
                    .length ||
                  busy
                }
                onClick={
                  confirmImport
                }
              >
                Confirm Import
              </button>
            </div>
          </>
        )}

        {stage ===
          "importing" && (
          <div className="processing">
            <Loader2
              className="spin"
              size={28}
            />

            <b>
              Importing payroll
              and generating
              payslips...
            </b>
          </div>
        )}

        {stage ===
          "complete" && (
          <div className="processing">
            <CheckCircle2
              size={46}
              color="#18a873"
            />

            <b>
              Payroll import
              completed
            </b>

            <span>
              {
                result?.successfulRecords ??
                result?.importedRecords ??
                0
              }{" "}
              records imported
              successfully.
            </span>

            <button
              type="button"
              className="pay-btn primary"
              onClick={close}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalNode, document.body)
    : modalNode;
}

export default function Salary(props) {
  const isInsideShell = useContext(DashboardShellContext);
  if (!isInsideShell) {
    return (
      <DashboardShell>
        <SalaryContent {...props} />
      </DashboardShell>
    );
  }
  return <SalaryContent {...props} />;
}
