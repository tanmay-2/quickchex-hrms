import * as XLSX from "xlsx";

/*
 * Existing payroll API helpers can remain in this file.
 * This function is intentionally local so "Download Excel Template"
 * always creates a REAL .xlsx file even when no template API exists.
 */

const PAYROLL_TEMPLATE_HEADERS = [
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

const PAYROLL_TEMPLATE_SAMPLE = [
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

export const downloadPayrollTemplate = () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    PAYROLL_TEMPLATE_HEADERS,
    PAYROLL_TEMPLATE_SAMPLE,
  ]);

  worksheet["!cols"] = [
    { wch: 24 },
    { wch: 17 },
    { wch: 14 },
    { wch: 10 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 13 },
    { wch: 15 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 23 },
  ];

  // Make the first row visibly distinct in Excel.
  const headerStyle = {
    font: {
      bold: true,
      color: { rgb: "FFFFFF" },
    },
    fill: {
      fgColor: { rgb: "7442E8" },
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
    },
  };

  for (let column = 0; column < PAYROLL_TEMPLATE_HEADERS.length; column += 1) {
    const address = XLSX.utils.encode_cell({
      r: 0,
      c: column,
    });

    if (worksheet[address]) {
      worksheet[address].s = headerStyle;
    }
  }

  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

  const workbook = XLSX.utils.book_new();

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

export { PAYROLL_TEMPLATE_HEADERS };

