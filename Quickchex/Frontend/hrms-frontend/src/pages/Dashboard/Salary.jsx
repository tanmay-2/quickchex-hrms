import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from "react";
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
  "Draft",
  "Imported",
  "Pending Approval",
  "Approved",
  "Payslip Generated",
  "Paid",
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
    "—",

  month: row.month ?? "",

  year: Number(row.year ?? 0),

  totalDays: Number(
    row.totalDays ??
      row.total_days ??
      0
  ),

  presentDays: Number(
    row.presentDays ??
      row.present_days ??
      0
  ),

  absentDays: Number(
    row.absentDays ??
      row.absent_days ??
      0
  ),

  paidLeave: Number(
    row.paidLeave ??
      row.paid_leave ??
      0
  ),

  unpaidLeave: Number(
    row.unpaidLeave ??
      row.unpaid_leave ??
      0
  ),

  grossSalary: Number(
    row.grossSalary ??
      row.gross_salary ??
      0
  ),

  ptDeducted: Number(
    row.ptDeducted ??
      row.pt_deducted ??
      0
  ),

  otherDeductions: Number(
    row.otherDeductions ??
      row.other_deductions ??
      0
  ),

  salaryCredited: Number(
    row.salaryCredited ??
      row.salary_credited ??
      0
  ),

  finalAmountCredited: Number(
    row.finalAmountCredited ??
      row.final_amount_credited ??
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

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    month,
    setMonth,
  ] = useState("");

  const [
    year,
    setYear,
  ] = useState("");

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

      setSummary(
        response?.summary || {
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
                item.grossSalary,
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
                item.finalAmountCredited,
              0
            ),
        }
      );
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

          const blob =
            await exportPayroll({
              format,
              search,
              month,
              year,
              department,
              status,
            });

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
          <header className="payroll-page-header">
            <div className="payroll-actions">
              <button
                type="button"
                className="pay-btn secondary"
                onClick={load}
              >
                <RefreshCw size={15} />
                Refresh
              </button>

              <button
                type="button"
                className="pay-btn secondary"
                onClick={() =>
                  doExport("csv")
                }
              >
                <Download size={15} />
                Export
              </button>

              <button
                type="button"
                className="pay-btn primary"
                onClick={() =>
                  setUploadOpen(true)
                }
              >
                <Upload size={15} />
                Upload Excel
              </button>
            </div>
          </header>

          <div className="payroll-toolbar">
            <div>
              <FileSpreadsheet
                size={17}
              />

              <div>
                <b>
                  Monthly payroll
                </b>

                <span>
                  Upload, validate,
                  approve and
                  generate payslips.
                </span>
              </div>
            </div>

            <button
              type="button"
              className="template-btn"
              onClick={() =>
                doExport(
                  "template"
                )
              }
            >
              Download Excel Template
            </button>
          </div>

          {error && (
            <div className="pay-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <section className="pay-summary">
            {[
              [
                "Total Employees",
                summary.totalEmployees,
              ],
              [
                "Payroll Records",
                summary.payrollRecords,
              ],
              [
                "Pending Approval",
                summary.pendingApproval,
              ],
              [
                "Approved",
                summary.approved,
              ],
              [
                "Payslips Generated",
                summary.payslipsGenerated,
              ],
              [
                "Gross Payroll",
                money(
                  summary.totalGrossPayroll
                ),
              ],
              [
                "Deductions",
                money(
                  summary.totalDeductions
                ),
              ],
              [
                "Salary Credited",
                money(
                  summary.totalSalaryCredited
                ),
              ],
            ].map(
              ([label, value]) => (
                <div
                  className="summary-card"
                  key={label}
                >
                  <span>
                    {label}
                  </span>

                  <b>
                    {value}
                  </b>
                </div>
              )
            )}
          </section>

          <section className="filter-card">
            <div className="search-box">
              <input
                type="search"
                placeholder="Search employee name or ID..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <CustomDropdown
              label="Month"
              value={month}
              placeholder="All Months"
              icon={CalendarDays}
              options={[
                {
                  value: "",
                  label: "All Months",
                },
                ...MONTHS.map(
                  (item) => ({
                    value: item,
                    label: item,
                  })
                ),
              ]}
              onChange={setMonth}
            />

            <CustomDropdown
              label="Year"
              value={year}
              placeholder="All Years"
              icon={CalendarDays}
              options={[
                {
                  value: "",
                  label: "All Years",
                },
                ...YEARS.map(
                  (item) => ({
                    value: item,
                    label: item,
                  })
                ),
              ]}
              onChange={setYear}
            />

            <CustomDropdown
              label="Department"
              value={department}
              placeholder="All Departments"
              icon={Building2}
              options={[
                {
                  value: "",
                  label:
                    "All Departments",
                },
                ...departments.map(
                  (item) => ({
                    value: item,
                    label: item,
                  })
                ),
              ]}
              onChange={
                setDepartment
              }
            />

            <CustomDropdown
              label="Status"
              value={status}
              placeholder="All Statuses"
              icon={CircleCheck}
              options={[
                {
                  value: "",
                  label:
                    "All Statuses",
                },
                ...STATUS_OPTIONS.map(
                  (item) => ({
                    value: item,
                    label: item,
                  })
                ),
              ]}
              onChange={setStatus}
            />
          </section>

          <section className="table-card">
            <div className="table-heading">
              <div>
                <span>
                  MONTHLY PAYROLL
                </span>

                <h2>
                  Employee Payroll
                </h2>

                <p>
                  All imported payroll
                  records for the
                  selected filters.
                </p>
              </div>

              <strong>
                {rows.length} records
              </strong>
            </div>

            {loading ? (
              <div className="empty-state">
                <Loader2 className="spin" />
                Loading payroll...
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Employee
                      </th>
                      <th>ID</th>
                      <th>
                        Month
                      </th>
                      <th>
                        Present
                      </th>
                      <th>
                        Gross
                      </th>
                      <th>PT</th>
                      <th>
                        Other
                      </th>
                      <th>
                        Credited
                      </th>
                      <th>
                        Final
                      </th>
                      <th>
                        Status
                      </th>
                      <th>
                        Payslip
                      </th>
                      <th>
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.length ===
                    0 ? (
                      <tr>
                        <td colSpan="12">
                          <div className="empty-state">
                            <FileSpreadsheet
                              size={28}
                            />

                            <b>
                              No payroll
                              records
                              found
                            </b>

                            <span>
                              Upload a
                              monthly
                              Excel file
                              to create
                              records.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map(
                        (row) => (
                          <tr
                            key={
                              row.id ||
                              `${row.employeeId}-${row.month}-${row.year}`
                            }
                          >
                            <td>
                              <div className="employee-cell">
                                <div className="avatar">
                                  {row.employeeName
                                    .slice(
                                      0,
                                      2
                                    )
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <b>
                                    {
                                      row.employeeName
                                    }
                                  </b>

                                  <span>
                                    {
                                      row.department
                                    }
                                  </span>
                                </div>
                              </div>
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
                                row.presentDays
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
                              <b>
                                {money(
                                  row.finalAmountCredited
                                )}
                              </b>
                            </td>

                            <td>
                              <Status
                                value={
                                  row.status
                                }
                              />
                            </td>

                            <td>
                              {row.payslipGenerated ? (
                                <button
                                  type="button"
                                  className="link-btn"
                                  onClick={() =>
                                    setPreview(
                                      row
                                    )
                                  }
                                >
                                  <Eye
                                    size={14}
                                  />
                                  View
                                </button>
                              ) : (
                                <span className="muted">
                                  Not generated
                                </span>
                              )}
                            </td>

                            <td>
                              <div className="row-actions">
                                <button
                                  type="button"
                                  title="View"
                                  onClick={() =>
                                    setDetail(
                                      row
                                    )
                                  }
                                >
                                  <Eye
                                    size={14}
                                  />
                                </button>

                                <button
                                  type="button"
                                  title="Edit"
                                  disabled={/approved/i.test(
                                    row.status
                                  )}
                                  onClick={() =>
                                    setEdit(
                                      row
                                    )
                                  }
                                >
                                  <Pencil
                                    size={14}
                                  />
                                </button>

                                {!/approved/i.test(
                                  row.status
                                ) && (
                                  <button
                                    type="button"
                                    title="Approve"
                                    onClick={() =>
                                      action(
                                        `approve-${row.id}`,
                                        () =>
                                          approvePayroll(
                                            row.id
                                          )
                                      )
                                    }
                                  >
                                    <Check
                                      size={14}
                                    />
                                  </button>
                                )}

                                {!row.payslipGenerated && (
                                  <button
                                    type="button"
                                    title="Generate payslip"
                                    onClick={() =>
                                      action(
                                        `payslip-${row.id}`,
                                        () =>
                                          generatePayslip(
                                            row.id
                                          )
                                      )
                                    }
                                  >
                                    <FileText
                                      size={14}
                                    />
                                  </button>
                                )}

                                {row.payslipGenerated && (
                                  <button
                                    type="button"
                                    title="Download payslip"
                                    onClick={() =>
                                      downloadRow(
                                        row
                                      )
                                    }
                                  >
                                    <Download
                                      size={14}
                                    />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

      {toast && (
        <div className="pay-toast">
          <CheckCircle2
            size={16}
          />
          {toast}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          close={() =>
            setUploadOpen(false)
          }
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

      {detail && (
        <DetailModal
          row={detail}
          close={() =>
            setDetail(null)
          }
          preview={() => {
            setPreview(detail);
            setDetail(null);
          }}
        />
      )}

      {edit && (
        <EditModal
          row={edit}
          close={() =>
            setEdit(null)
          }
          save={(values) =>
            action(
              `edit-${edit.id}`,
              async () => {
                await updatePayroll(
                  edit.id,
                  values
                );

                setEdit(null);
              }
            )
          }
        />
      )}

      {preview && (
        <PreviewModal
          row={preview}
          close={() =>
            setPreview(null)
          }
          download={() =>
            downloadRow(preview)
          }
          busy={
            busy ===
            `download-${preview.id}`
          }
        />
      )}
    </div>
  );
}

function Status({ value }) {
  const className = String(
    value || ""
  )
    .toLowerCase()
    .replace(/\s+/g, "-");

  return (
    <span
      className={`status ${className}`}
    >
      {value}
    </span>
  );
}

function Modal({
  children,
  close,
  wide = false,
}) {
  return (
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
      employeeId:
        row.employeeId,
      name:
        row.employeeName,
      designation:
        row.designation ||
        "—",
      department:
        row.department ||
        "—",
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

  return (
    <div className="modal-bg">
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
