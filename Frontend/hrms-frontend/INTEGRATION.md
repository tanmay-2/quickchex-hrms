# EXACT INTEGRATION — 3 small changes

## 1) Salary.jsx imports

Add:

```jsx
import { CalendarDays, Building2, CircleCheck, UserRound } from "lucide-react";
import CustomDropdown from "../../components/payroll/CustomDropdown";
import { downloadPayrollTemplate } from "../../services/payrollService";
```

Use the icons you already import if these are already present.

## 2) Replace the existing native filter JSX

Do NOT use `<select>` for the Salary page filters.

Replace the existing Month / Year / Department / Status controls with:

```jsx
<CustomDropdown
  label="Month"
  value={month}
  placeholder="All Months"
  icon={CalendarDays}
  options={[
    { value: "", label: "All Months" },
    ...MONTHS.map((item) => ({
      value: item,
      label: item,
    })),
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
    ...years.map((item) => ({
      value: item,
      label: item,
    })),
  ]}
  onChange={setYear}
/>

<CustomDropdown
  label="Department"
  value={department}
  placeholder="All Departments"
  icon={Building2}
  options={[
    { value: "", label: "All Departments" },
    ...departments.map((item) => ({
      value: item,
      label: item,
    })),
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
    "Draft",
    "Imported",
    "Pending Approval",
    "Approved",
    "Payslip Generated",
    "Paid",
  ]}
  onChange={setStatus}
/>
```

Your existing `month`, `year`, `department`, `status`, `setMonth`, `setYear`,
`setDepartment`, and `setStatus` state stays exactly the same.

## 3) Fix "Download Excel Template"

Replace the existing template button handler with:

```jsx
<button
  type="button"
  className="download-template-button"
  onClick={downloadPayrollTemplate}
>
  <FileSpreadsheet size={15} />
  Download Excel Template
</button>
```

This generates a real:

`LA_ESFERA_Monthly_Payroll_Template.xlsx`

locally in the browser. It does not depend on the backend template endpoint.

## 4) Search input

Keep your existing search markup:

```jsx
<div className="filter-search">
  <Search size={16} />
  <input
    type="search"
    placeholder="Search employee name or ID..."
    value={search}
    onChange={(event) =>
      setSearch(event.target.value)
    }
  />
</div>
```

Do NOT add another wrapper around the input.

The included CSS specifically neutralizes the global input border that was producing the box-inside-a-box appearance.

## 5) Salary.css

Import the provided `PayrollUIFix.css` at the END of `Salary.css`:

```css
@import url("../../components/payroll/PayrollUIFix.css");
```

Or, preferably, copy the contents of `PayrollUIFix.css` to the very bottom of `Salary.css`.

The fix is intentionally scoped to `.payroll-layout` so the global theme/input styling is not changed for the rest of the HRMS.
