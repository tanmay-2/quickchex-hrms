import React, { useEffect, useMemo, useState } from "react";
import SidebarEmp from "../../components/sidebar/Sidebar_emp";
import SidebarTL from "../../components/sidebar/sidebar_tl";
import SidebarAdmin from "../../components/sidebar/Sidebar";
import "./Attendance.css";

const API_BASE_URL =
    import.meta.env?.VITE_API_URL?.replace(/\/$/, '') || 'https://quickchex-backend.onrender.com';

// Daily and monthly attendance data is fetched live from the backend API.
// No hardcoded mock data.

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Date(2000, index, 1).toLocaleString("en-US", {
        month: "long",
    }),
}));

const Icon = ({ name, size = 20 }) => {
    const common = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
    };

    const paths = {
        check: (
            <>
                <path d="M20 6 9 17l-5-5" />
            </>
        ),
        clock: (
            <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
            </>
        ),
        file: (
            <>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M8 13h8M8 17h6" />
            </>
        ),
        alert: (
            <>
                <path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3z" />
                <path d="M12 9v4M12 17h.01" />
            </>
        ),
        users: (
            <>
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="9.5" cy="7" r="3" />
                <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.75" />
            </>
        ),
        calendar: (
            <>
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
            </>
        ),
        download: (
            <>
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
            </>
        ),
        report: (
            <>
                <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </>
        ),
        search: (
            <>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
            </>
        ),
    };

    return <svg {...common}>{paths[name]}</svg>;
};

const StatusPill = ({ value }) => {
    const normalized = String(value || "Absent").toLowerCase();
    return (
        <span className={`status-pill ${normalized}`}>
            {value || "Absent"}
        </span>
    );
};

const StatCard = ({ tone, value, label, icon }) => (
    <div className={`attendance-stat ${tone}`}>
        <div className="attendance-stat-icon">
            <Icon name={icon} size={21} />
        </div>
        <div>
            <strong>{value}</strong>
            <span>{label}</span>
        </div>
    </div>
);

const Attendance = () => {
    const [expanded, setExpanded] = useState(false);
    const [tab, setTab] = useState("daily");

    const [dailyRecords, setDailyRecords] = useState([]);
    const [dailyLoading, setDailyLoading] = useState(true);
    const [dailyError, setDailyError] = useState("");

    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("all");
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().slice(0, 10)
    );

    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [monthlyEmployee, setMonthlyEmployee] = useState("all");
    const [monthlyDepartment, setMonthlyDepartment] = useState("all");
    const [monthlyRecords, setMonthlyRecords] = useState([]);
    const [monthlyLoading, setMonthlyLoading] = useState(false);

    const [reportMessage, setReportMessage] = useState("");

    const userRole =
        localStorage.getItem("role")?.toLowerCase() || "employee";

    const SidebarComponent =
        userRole === "admin" || userRole === "superadmin"
            ? SidebarAdmin
            : userRole === "teamleader"
                ? SidebarTL
                : SidebarEmp;

    useEffect(() => {
        loadDailyAttendance();
    }, [selectedDate]);

    useEffect(() => {
        if (tab === "monthly" || tab === "salary") {
            loadMonthlyAttendance();
        }
    }, [tab, month, year]);

    const loadDailyAttendance = async () => {
        setDailyLoading(true);
        setDailyError("");

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${API_BASE_URL}/api/v1/attendance/admin/today`,
                {
                    headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : {},
                }
            );

            if (!response.ok) {
                throw new Error(`Request failed (${response.status})`);
            }

            const json = await response.json();
            const rows = Array.isArray(json)
                ? json
                : Array.isArray(json?.data)
                    ? json.data
                    : [];

            setDailyRecords(rows);
        } catch {
            setDailyRecords([]);
            setDailyError(
                "Unable to connect to live attendance service."
            );
        } finally {
            setDailyLoading(false);
        }
    };

    const daysInMonth = new Date(year, month, 0).getDate();

    const loadMonthlyAttendance = async () => {
        setMonthlyLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${API_BASE_URL}/api/v1/attendance/admin/monthly?month=${month}&year=${year}`,
                {
                    headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : {},
                }
            );

            if (!response.ok) {
                throw new Error("Monthly API unavailable");
            }

            const json = await response.json();
            const rows = Array.isArray(json)
                ? json
                : Array.isArray(json?.data)
                    ? json.data
                    : [];

            setMonthlyRecords(rows);
        } catch {
            setMonthlyRecords([]);
        } finally {
            setMonthlyLoading(false);
        }
    };

    const dailyDepartments = useMemo(() => {
        return [
            ...new Set(
                dailyRecords
                    .map((item) => item.department)
                    .filter(Boolean)
            ),
        ];
    }, [dailyRecords]);

    const filteredDaily = useMemo(() => {
        const q = search.trim().toLowerCase();

        return dailyRecords.filter((item) => {
            const name = String(item.name || "").toLowerCase();
            const role = String(
                item.role || item.designation || ""
            ).toLowerCase();
            const dept = String(item.department || "").toLowerCase();

            const matchesSearch =
                !q ||
                name.includes(q) ||
                role.includes(q) ||
                dept.includes(q);

            const matchesDepartment =
                department === "all" ||
                dept === department.toLowerCase();

            return matchesSearch && matchesDepartment;
        });
    }, [dailyRecords, search, department]);

    const dailyStats = useMemo(() => {
        const present = dailyRecords.filter(
            (r) => String(r.status).toLowerCase() === "present"
        ).length;

        const late = dailyRecords.filter(
            (r) =>
                String(r.remark || "").toLowerCase() === "late" ||
                String(r.status || "").toLowerCase() === "late"
        ).length;

        const permission = dailyRecords.filter(
            (r) => String(r.status).toLowerCase() === "permission"
        ).length;

        const uninformed = dailyRecords.filter((r) =>
            ["uninformed", "missing punch", "missing"].includes(
                String(r.status).toLowerCase()
            )
        ).length;

        const absent = dailyRecords.filter(
            (r) => String(r.status).toLowerCase() === "absent"
        ).length;

        return {
            present,
            late,
            permission,
            uninformed,
            absent,
        };
    }, [dailyRecords]);

    const monthlyDepartments = useMemo(
        () => [
            ...new Set(
                monthlyRecords
                    .map((item) => item.department)
                    .filter(Boolean)
            ),
        ],
        [monthlyRecords]
    );

    const monthlyEmployees = useMemo(
        () =>
            monthlyRecords.map((item) => ({
                value: String(
                    item.employee_id ?? item.id ?? item.name
                ),
                label: item.name,
            })),
        [monthlyRecords]
    );

    const normalizedMonthly = useMemo(() => {
        return monthlyRecords.map((row) => {
            const workingDays =
                Number(row.workingDays ?? row.working_days) ||
                daysInMonth;

            const monthlySalary =
                Number(
                    row.monthlySalary ??
                    row.monthly_salary ??
                    row.salary ??
                    0
                ) || 0;

            const presentDays =
                Number(
                    row.presentDays ?? row.present_days
                ) || 0;

            const absentDays =
                Number(
                    row.absentDays ?? row.absent_days
                ) || 0;

            const paidLeave =
                Number(row.paidLeave ?? row.paid_leave) || 0;

            const unpaidLeave =
                Number(row.unpaidLeave ?? row.unpaid_leave) || 0;

            const approvedLeave =
                Number(
                    row.approvedLeave ?? row.approved_leave
                ) || paidLeave + unpaidLeave;

            const pendingLeave =
                Number(
                    row.pendingLeave ?? row.pending_leave
                ) || 0;

            const leaveBalance =
                Number(
                    row.leaveBalance ?? row.leave_balance
                ) || Math.max(0, 24 - approvedLeave);

            const leaveDaysDeducted =
                Number(
                    row.leaveDaysDeducted ??
                    row.leave_days_deducted
                ) || unpaidLeave;

            const lateArrivals =
                Number(
                    row.lateArrivals ?? row.late_arrivals
                ) || 0;

            const totalWorkingHours =
                row.totalWorkingHours ??
                row.total_working_hours ??
                row.workingHours ??
                "0h";

            const perDaySalary =
                workingDays > 0
                    ? monthlySalary / workingDays
                    : 0;

            const salaryDeductions =
                Number(
                    row.salaryDeductions ??
                    row.salary_deductions
                ) ||
                Math.round(
                    (absentDays + unpaidLeave) * perDaySalary
                );

            const finalPayableSalary =
                Number(
                    row.finalPayableSalary ??
                    row.final_payable_salary
                ) ||
                Math.max(
                    0,
                    Math.round(
                        monthlySalary - salaryDeductions
                    )
                );

            return {
                ...row,
                employeeId:
                    row.employee_id ?? row.id ?? row.name,
                name: row.name || row.employee_name || "Unknown",
                department: row.department || "Unassigned",
                monthlySalary,
                workingDays,
                presentDays,
                absentDays,
                paidLeave,
                unpaidLeave,
                approvedLeave,
                pendingLeave,
                leaveBalance,
                leaveDaysDeducted,
                lateArrivals,
                totalWorkingHours,
                salaryDeductions,
                finalPayableSalary,
            };
        });
    }, [monthlyRecords, daysInMonth]);

    const filteredMonthly = useMemo(() => {
        return normalizedMonthly.filter((row) => {
            const employeeId = String(row.employeeId);
            const dept = String(
                row.department || ""
            ).toLowerCase();

            return (
                (monthlyEmployee === "all" ||
                    employeeId === monthlyEmployee) &&
                (monthlyDepartment === "all" ||
                    dept === monthlyDepartment.toLowerCase())
            );
        });
    }, [
        normalizedMonthly,
        monthlyEmployee,
        monthlyDepartment,
    ]);

    const monthlySummary = useMemo(() => {
        const sum = (key) =>
            filteredMonthly.reduce(
                (total, row) => total + (Number(row[key]) || 0),
                0
            );

        const workingDays =
            filteredMonthly.length > 0
                ? Math.max(
                    ...filteredMonthly.map(
                        (row) =>
                            Number(row.workingDays) || 0
                    )
                )
                : daysInMonth;

        return {
            employees: filteredMonthly.length,
            workingDays,
            presentDays: sum("presentDays"),
            absentDays: sum("absentDays"),
            paidLeave: sum("paidLeave"),
            unpaidLeave: sum("unpaidLeave"),
            approvedLeave: sum("approvedLeave"),
            pendingLeave: sum("pendingLeave"),
            lateArrivals: sum("lateArrivals"),
            leaveDaysDeducted: sum("leaveDaysDeducted"),
            totalSalary: sum("monthlySalary"),
            salaryDeductions: sum("salaryDeductions"),
            finalPayableSalary: sum("finalPayableSalary"),
        };
    }, [filteredMonthly, daysInMonth]);

    const monthLabel = new Date(
        year,
        Number(month) - 1,
        1
    ).toLocaleString("en-US", { month: "long" });

    const formatCurrency = (value) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(Number(value) || 0);

    const exportCSV = () => {
        const headers = [
            "Employee Name",
            "Department",
            "Monthly Salary",
            "Working Days",
            "Present Days",
            "Paid Leave",
            "Unpaid Leave",
            "Absent Days",
            "Salary Deductions",
            "Final Payable Salary",
        ];

        const rows = filteredMonthly.map((row) => [
            row.name,
            row.department,
            row.monthlySalary,
            row.workingDays,
            row.presentDays,
            row.paidLeave,
            row.unpaidLeave,
            row.absentDays,
            row.salaryDeductions,
            row.finalPayableSalary,
        ]);

        const csv = [headers, ...rows]
            .map((row) =>
                row
                    .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
                    .join(",")
            )
            .join("\r\n");

        const url = URL.createObjectURL(
            new Blob(["\ufeff" + csv], {
                type: "text/csv;charset=utf-8;",
            })
        );

        const link = document.createElement("a");
        link.href = url;
        link.download = `Attendance_${monthLabel}_${year}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setReportMessage(
            "Monthly attendance report exported successfully."
        );
        setTimeout(() => setReportMessage(""), 3000);
    };

    const printReport = () => {
        window.print();
    };

    const generateReport = (type) => {
        if (type === "csv" || type === "excel") {
            exportCSV();
            return;
        }

        setTab("monthly");

        setTimeout(() => {
            printReport();
            setReportMessage(
                type === "employee"
                    ? "Employee-wise report opened for printing/PDF."
                    : type === "department"
                        ? "Department-wise report opened for printing/PDF."
                        : "Attendance report opened for printing/PDF."
            );
            setTimeout(() => setReportMessage(""), 3000);
        }, 250);
    };

    const dailyDateLabel = new Date(
        `${selectedDate}T00:00:00`
    ).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="attendance-page-shell">
            <SidebarComponent
                expanded={expanded}
                setExpanded={setExpanded}
            />

            <main className="attendance-content">
                <div className="attendance-page">
                    <header className="attendance-header">
                        <div>
                            <div className="eyebrow">
                                ATTENDANCE
                            </div>
                            <h1>
                                {tab === "daily"
                                    ? "Daily Attendance"
                                    : tab === "monthly"
                                        ? "Monthly Attendance"
                                        : "Monthly Salary Summary"}
                            </h1>
                            <p>
                                {tab === "daily"
                                    ? "Track daily attendance, punches, permissions and working hours."
                                    : tab === "monthly"
                                        ? `Review attendance, leave and working-hours for ${monthLabel} ${year}.`
                                        : `Calculate end-of-month payable salary for ${monthLabel} ${year}.`}
                            </p>
                        </div>

                        {tab === "daily" ? (
                            <div className="page-date-chip">
                                <Icon name="calendar" size={16} />
                                <span>{dailyDateLabel}</span>
                            </div>
                        ) : (
                            <div className="page-date-chip">
                                <Icon name="calendar" size={16} />
                                <span>
                                    {monthLabel} {year}
                                </span>
                            </div>
                        )}
                    </header>

                    <div className="attendance-tabs">
                        <button
                            type="button"
                            className={
                                tab === "daily" ? "active" : ""
                            }
                            onClick={() => setTab("daily")}
                        >
                            Daily Attendance
                        </button>
                        <button
                            type="button"
                            className={
                                tab === "monthly" ? "active" : ""
                            }
                            onClick={() => setTab("monthly")}
                        >
                            Monthly Attendance
                        </button>
                        <button
                            type="button"
                            className={
                                tab === "salary" ? "active" : ""
                            }
                            onClick={() => setTab("salary")}
                        >
                            Monthly Salary Summary
                        </button>
                    </div>

                    {reportMessage && (
                        <div className="attendance-success">
                            <Icon name="check" size={16} />
                            <span>{reportMessage}</span>
                        </div>
                    )}

                    {tab === "daily" && (
                        <>
                            <section className="attendance-stats-grid">
                                <StatCard
                                    tone="present"
                                    value={dailyStats.present}
                                    label="Present"
                                    icon="check"
                                />
                                <StatCard
                                    tone="late"
                                    value={dailyStats.late}
                                    label="Late Login"
                                    icon="clock"
                                />
                                <StatCard
                                    tone="permission"
                                    value={
                                        dailyStats.permission
                                    }
                                    label="Permission"
                                    icon="file"
                                />
                                <StatCard
                                    tone="uninformed"
                                    value={
                                        dailyStats.uninformed
                                    }
                                    label="Uninformed / Missing"
                                    icon="alert"
                                />
                                <StatCard
                                    tone="absent"
                                    value={dailyStats.absent}
                                    label="Absent"
                                    icon="users"
                                />
                            </section>

                            {dailyError && (
                                <div className="attendance-alert">
                                    <Icon name="alert" size={18} />
                                    <span>{dailyError}</span>
                                </div>
                            )}

                            <section className="attendance-panel">
                                <div className="panel-heading">
                                    <div>
                                        <h2>
                                            Employee Logs (
                                            {
                                                filteredDaily.length
                                            }
                                            )
                                        </h2>
                                        <p>
                                            Check-in, check-out,
                                            status and active
                                            working hours.
                                        </p>
                                    </div>

                                    <div className="panel-filters">
                                        <div className="search-wrap">
                                            <Icon
                                                name="search"
                                                size={16}
                                            />
                                            <input
                                                value={search}
                                                onChange={(e) =>
                                                    setSearch(
                                                        e.target
                                                            .value
                                                    )
                                                }
                                                placeholder="Search employee..."
                                            />
                                        </div>

                                        <select
                                            value={department}
                                            onChange={(e) =>
                                                setDepartment(
                                                    e.target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="all">
                                                All Departments
                                            </option>
                                            {dailyDepartments.map(
                                                (dept) => (
                                                    <option
                                                        value={
                                                            dept
                                                        }
                                                        key={
                                                            dept
                                                        }
                                                    >
                                                        {dept}
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        <input
                                            className="date-input"
                                            type="date"
                                            value={
                                                selectedDate
                                            }
                                            onChange={(e) =>
                                                setSelectedDate(
                                                    e.target
                                                        .value
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="table-wrap">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>
                                                    Employee
                                                </th>
                                                <th>
                                                    Department
                                                </th>
                                                <th>Status</th>
                                                <th>
                                                    Check-in
                                                </th>
                                                <th>
                                                    Check-out
                                                </th>
                                                <th>
                                                    Active / Working
                                                </th>
                                                <th>
                                                    Remark
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dailyLoading ? (
                                                <tr>
                                                    <td
                                                        colSpan="7"
                                                        className="table-empty"
                                                    >
                                                        Loading
                                                        attendance...
                                                    </td>
                                                </tr>
                                            ) : filteredDaily.length ===
                                                0 ? (
                                                <tr>
                                                    <td
                                                        colSpan="7"
                                                        className="table-empty"
                                                    >
                                                        No attendance
                                                        records found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredDaily.map(
                                                    (row) => (
                                                        <tr
                                                            key={
                                                                row.id ||
                                                                row.employee_id ||
                                                                row.name
                                                            }
                                                        >
                                                            <td>
                                                                <div className="employee-cell">
                                                                    <div className="avatar">
                                                                        {String(
                                                                            row.name ||
                                                                            "NA"
                                                                        )
                                                                            .trim()
                                                                            .split(
                                                                                /\s+/
                                                                            )
                                                                            .slice(
                                                                                0,
                                                                                2
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    part
                                                                                ) =>
                                                                                    part[0]
                                                                            )
                                                                            .join(
                                                                                ""
                                                                            )
                                                                            .toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <strong>
                                                                            {row.name ||
                                                                                "Unknown"}
                                                                        </strong>
                                                                        <span>
                                                                            {row.role ||
                                                                                row.designation ||
                                                                                "-"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                {
                                                                    row.department ||
                                                                    "-"
                                                                }
                                                            </td>
                                                            <td>
                                                                <StatusPill
                                                                    value={
                                                                        row.status
                                                                    }
                                                                />
                                                            </td>
                                                            <td>
                                                                {
                                                                    row.checkIn ||
                                                                    row.check_in ||
                                                                    "--:--"
                                                                }
                                                            </td>
                                                            <td>
                                                                {
                                                                    row.checkOut ||
                                                                    row.check_out ||
                                                                    "--:--"
                                                                }
                                                            </td>
                                                            <td className="strong-cell">
                                                                {
                                                                    row.activeHours ||
                                                                    row.prodHours ||
                                                                    row.working_hours ||
                                                                    "-"
                                                                }
                                                            </td>
                                                            <td
                                                                className={
                                                                    String(
                                                                        row.remark ||
                                                                        ""
                                                                    ).toLowerCase() ===
                                                                        "late"
                                                                        ? "text-orange"
                                                                        : "text-green"
                                                                }
                                                            >
                                                                {
                                                                    row.remark ||
                                                                    "-"
                                                                }
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}

                    {tab !== "daily" && (
                        <section className="monthly-layout">
                            <div className="monthly-toolbar">
                                <div>
                                    <h2>
                                        {tab === "monthly"
                                            ? "Monthly Attendance"
                                            : "Monthly Salary Summary"}
                                    </h2>
                                    <p>
                                        Attendance + Approved Leave +
                                        Salary Details → Monthly
                                        Calculation
                                    </p>
                                </div>

                                <div className="report-actions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            generateReport(
                                                "attendance"
                                            )
                                        }
                                    >
                                        <Icon
                                            name="report"
                                            size={15}
                                        />
                                        Attendance Report
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            generateReport(
                                                "employee"
                                            )
                                        }
                                    >
                                        Employee-wise
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            generateReport(
                                                "department"
                                            )
                                        }
                                    >
                                        Department-wise
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            generateReport(
                                                "csv"
                                            )
                                        }
                                    >
                                        <Icon
                                            name="download"
                                            size={15}
                                        />
                                        CSV / Excel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            generateReport(
                                                "pdf"
                                            )
                                        }
                                    >
                                        PDF
                                    </button>
                                </div>
                            </div>

                            <div className="monthly-filters">
                                <label>
                                    Select Month
                                    <select
                                        value={month}
                                        onChange={(e) =>
                                            setMonth(
                                                Number(
                                                    e.target
                                                        .value
                                                )
                                            )
                                        }
                                    >
                                        {MONTHS.map((item) => (
                                            <option
                                                key={
                                                    item.value
                                                }
                                                value={
                                                    item.value
                                                }
                                            >
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Select Year
                                    <select
                                        value={year}
                                        onChange={(e) =>
                                            setYear(
                                                Number(
                                                    e.target
                                                        .value
                                                )
                                            )
                                        }
                                    >
                                        {[
                                            year - 1,
                                            year,
                                            year + 1,
                                        ].map((item) => (
                                            <option
                                                key={item}
                                                value={item}
                                            >
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Select Employee
                                    <select
                                        value={
                                            monthlyEmployee
                                        }
                                        onChange={(e) =>
                                            setMonthlyEmployee(
                                                e.target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="all">
                                            All Employees
                                        </option>
                                        {monthlyEmployees.map(
                                            (item) => (
                                                <option
                                                    key={
                                                        item.value
                                                    }
                                                    value={
                                                        item.value
                                                    }
                                                >
                                                    {item.label}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label>
                                    Department
                                    <select
                                        value={
                                            monthlyDepartment
                                        }
                                        onChange={(e) =>
                                            setMonthlyDepartment(
                                                e.target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="all">
                                            All Departments
                                        </option>
                                        {monthlyDepartments.map(
                                            (item) => (
                                                <option
                                                    key={item}
                                                    value={item}
                                                >
                                                    {item}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>
                            </div>

                            {monthlyLoading ? (
                                <div className="attendance-panel loading-panel">
                                    Loading monthly attendance...
                                </div>
                            ) : (
                                <>
                                    <div className="summary-grid">
                                        <div>
                                            <span>
                                                Total Working Days
                                            </span>
                                            <strong>
                                                {
                                                    monthlySummary.workingDays
                                                }
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                Present Days
                                            </span>
                                            <strong>
                                                {
                                                    monthlySummary.presentDays
                                                }
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                Absent Days
                                            </span>
                                            <strong>
                                                {
                                                    monthlySummary.absentDays
                                                }
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                Paid Leave
                                            </span>
                                            <strong>
                                                {
                                                    monthlySummary.paidLeave
                                                }
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                Unpaid Leave
                                            </span>
                                            <strong>
                                                {
                                                    monthlySummary.unpaidLeave
                                                }
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                Late Arrivals
                                            </span>
                                            <strong>
                                                {
                                                    monthlySummary.lateArrivals
                                                }
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                Total Working Hours
                                            </span>
                                            <strong>
                                                {filteredMonthly
                                                    .map(
                                                        (row) =>
                                                            row.totalWorkingHours
                                                    )
                                                    .join(
                                                        " • "
                                                    ) || "0h"}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                Leave Days
                                                Deducted
                                            </span>
                                            <strong>
                                                {
                                                    monthlySummary.leaveDaysDeducted
                                                }
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="leave-panel">
                                        <div className="leave-panel-head">
                                            <div>
                                                <h3>
                                                    Leave Calculation
                                                </h3>
                                                <p>
                                                    Approved and
                                                    pending leave
                                                    reflected in
                                                    monthly
                                                    attendance.
                                                </p>
                                            </div>
                                            <span className="leave-balance">
                                                Leave Balance{" "}
                                                <b>
                                                    {Math.max(
                                                        0,
                                                        24 -
                                                        monthlySummary.approvedLeave
                                                    )}
                                                </b>
                                            </span>
                                        </div>

                                        <div className="leave-grid">
                                            <div>
                                                <span>
                                                    Approved Leave
                                                </span>
                                                <strong>
                                                    {
                                                        monthlySummary.approvedLeave
                                                    }
                                                </strong>
                                            </div>
                                            <div>
                                                <span>
                                                    Pending Leave
                                                </span>
                                                <strong>
                                                    {
                                                        monthlySummary.pendingLeave
                                                    }
                                                </strong>
                                            </div>
                                            <div>
                                                <span>
                                                    Paid Leave
                                                </span>
                                                <strong>
                                                    {
                                                        monthlySummary.paidLeave
                                                    }
                                                </strong>
                                            </div>
                                            <div>
                                                <span>
                                                    Unpaid Leave
                                                </span>
                                                <strong>
                                                    {
                                                        monthlySummary.unpaidLeave
                                                    }
                                                </strong>
                                            </div>
                                            <div>
                                                <span>
                                                    Leave Days
                                                    Deducted
                                                </span>
                                                <strong>
                                                    {
                                                        monthlySummary.leaveDaysDeducted
                                                    }
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    {tab === "monthly" ? (
                                        <section className="attendance-panel">
                                            <div className="panel-heading compact">
                                                <div>
                                                    <h2>
                                                        Monthly
                                                        Attendance
                                                        Summary
                                                    </h2>
                                                    <p>
                                                        Review
                                                        employee-wise
                                                        attendance
                                                        for{" "}
                                                        {
                                                            monthLabel
                                                        }{" "}
                                                        {year}.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="table-wrap">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>
                                                                Employee
                                                            </th>
                                                            <th>
                                                                Department
                                                            </th>
                                                            <th>
                                                                Working
                                                                Days
                                                            </th>
                                                            <th>
                                                                Present
                                                            </th>
                                                            <th>
                                                                Absent
                                                            </th>
                                                            <th>
                                                                Paid
                                                                Leave
                                                            </th>
                                                            <th>
                                                                Unpaid
                                                                Leave
                                                            </th>
                                                            <th>
                                                                Late
                                                            </th>
                                                            <th>
                                                                Total
                                                                Hours
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredMonthly.length ===
                                                            0 ? (
                                                            <tr>
                                                                <td
                                                                    colSpan="9"
                                                                    className="table-empty"
                                                                >
                                                                    No
                                                                    monthly
                                                                    attendance
                                                                    data
                                                                    available.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredMonthly.map(
                                                                (
                                                                    row
                                                                ) => (
                                                                    <tr
                                                                        key={`${row.employeeId}-${row.department}`}
                                                                    >
                                                                        <td>
                                                                            <strong>
                                                                                {
                                                                                    row.name
                                                                                }
                                                                            </strong>
                                                                        </td>
                                                                        <td>
                                                                            {
                                                                                row.department
                                                                            }
                                                                        </td>
                                                                        <td>
                                                                            {
                                                                                row.workingDays
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
                                                                            {
                                                                                row.paidLeave
                                                                            }
                                                                        </td>
                                                                        <td>
                                                                            {
                                                                                row.unpaidLeave
                                                                            }
                                                                        </td>
                                                                        <td>
                                                                            {
                                                                                row.lateArrivals
                                                                            }
                                                                        </td>
                                                                        <td className="strong-cell">
                                                                            {
                                                                                row.totalWorkingHours
                                                                            }
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            )
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </section>
                                    ) : (
                                        <section className="salary-grid">
                                            {filteredMonthly.map(
                                                (row) => (
                                                    <article
                                                        className="salary-card"
                                                        key={
                                                            row.employeeId
                                                        }
                                                    >
                                                        <div className="salary-card-head">
                                                            <div>
                                                                <h3>
                                                                    {
                                                                        row.name
                                                                    }
                                                                </h3>
                                                                <span>
                                                                    {
                                                                        row.department
                                                                    }
                                                                </span>
                                                            </div>
                                                            <strong className="payable-badge">
                                                                {
                                                                    formatCurrency(
                                                                        row.finalPayableSalary
                                                                    )
                                                                }
                                                            </strong>
                                                        </div>

                                                        <div className="salary-grid-fields">
                                                            <div>
                                                                <span>
                                                                    Monthly
                                                                    Salary
                                                                </span>
                                                                <strong>
                                                                    {formatCurrency(
                                                                        row.monthlySalary
                                                                    )}
                                                                </strong>
                                                            </div>
                                                            <div>
                                                                <span>
                                                                    Working
                                                                    Days
                                                                </span>
                                                                <strong>
                                                                    {
                                                                        row.workingDays
                                                                    }
                                                                </strong>
                                                            </div>
                                                            <div>
                                                                <span>
                                                                    Present
                                                                    Days
                                                                </span>
                                                                <strong>
                                                                    {
                                                                        row.presentDays
                                                                    }
                                                                </strong>
                                                            </div>
                                                            <div>
                                                                <span>
                                                                    Paid
                                                                    Leave
                                                                </span>
                                                                <strong>
                                                                    {
                                                                        row.paidLeave
                                                                    }
                                                                </strong>
                                                            </div>
                                                            <div>
                                                                <span>
                                                                    Unpaid
                                                                    Leave
                                                                </span>
                                                                <strong>
                                                                    {
                                                                        row.unpaidLeave
                                                                    }
                                                                </strong>
                                                            </div>
                                                            <div>
                                                                <span>
                                                                    Absent
                                                                    Days
                                                                </span>
                                                                <strong>
                                                                    {
                                                                        row.absentDays
                                                                    }
                                                                </strong>
                                                            </div>
                                                            <div>
                                                                <span>
                                                                    Salary
                                                                    Deductions
                                                                </span>
                                                                <strong className="deduction">
                                                                    {formatCurrency(
                                                                        row.salaryDeductions
                                                                    )}
                                                                </strong>
                                                            </div>
                                                            <div>
                                                                <span>
                                                                    Final
                                                                    Payable
                                                                    Salary
                                                                </span>
                                                                <strong className="payable">
                                                                    {formatCurrency(
                                                                        row.finalPayableSalary
                                                                    )}
                                                                </strong>
                                                            </div>
                                                        </div>
                                                    </article>
                                                )
                                            )}
                                        </section>
                                    )}
                                </>
                            )}
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Attendance;
