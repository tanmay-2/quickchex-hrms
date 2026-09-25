const host = typeof window !== "undefined" && window.location?.hostname ? window.location.hostname : "localhost";
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  `http://${host}:8000/api/v1`;

/* =========================================================
   AUTH HELPERS
   ========================================================= */

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

const authHeaders = (extra = {}) => {
  const token = getToken();

  return {
    Accept: "application/json",
    ...extra,
    ...(token
      ? {
        Authorization: `Bearer ${token}`,
      }
      : {}),
  };
};

/* =========================================================
   GENERIC JSON REQUEST
   ========================================================= */

const apiRequest = async (
  endpoint,
  options = {}
) => {
  const headers = authHeaders({
    "Content-Type": "application/json",
    ...(options.headers || {}),
  });

  const response = await fetch(
    `${API_BASE}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const text = await response.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.detail ||
        data?.message ||
        `Request failed (${response.status})`;

    const error = new Error(message);

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
};

/* =========================================================
   FETCH PAYROLL
   ========================================================= */

export const fetchPayroll = async (
  params = {}
) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        query.set(
          key,
          String(value)
        );
      }
    }
  );

  const suffix = query.toString()
    ? `?${query.toString()}`
    : "";

  try {
    return await apiRequest(
      `/payroll${suffix}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    /*
      IMPORTANT:
      The Salary page should still render when the backend
      payroll endpoint has not been created yet.
    */
    if (error.status === 404) {
      return {
        records: [],
        items: [],
        data: [],
        summary: {
          totalEmployees: 0,
          payrollRecords: 0,
          pendingApproval: 0,
          approved: 0,
          payslipsGenerated: 0,
          totalGrossPayroll: 0,
          totalDeductions: 0,
          totalSalaryCredited: 0,
        },
        apiUnavailable: true,
      };
    }

    throw error;
  }
};

/* =========================================================
   VALIDATE PAYROLL
   ========================================================= */

export const validatePayroll = async (
  records
) => {
  return apiRequest(
    "/payroll/validate",
    {
      method: "POST",
      body: JSON.stringify({
        records,
      }),
    }
  );
};

/* =========================================================
   IMPORT PAYROLL
   ========================================================= */

export const importPayroll = async ({
  records,
  replace_existing = false,
  skip_existing = true,
} = {}) => {
  return apiRequest(
    "/payroll/import",
    {
      method: "POST",
      body: JSON.stringify({
        records,
        replace_existing,
        skip_existing,
      }),
    }
  );
};

/* =========================================================
   APPROVE PAYROLL
   ========================================================= */

export const approvePayroll = async (
  id
) => {
  return apiRequest(
    `/payroll/${encodeURIComponent(
      id
    )}/approve`,
    {
      method: "POST",
    }
  );
};

/* =========================================================
   UPDATE PAYROLL
   ========================================================= */

export const updatePayroll = async (
  id,
  payload
) => {
  return apiRequest(
    `/payroll/${encodeURIComponent(
      id
    )}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
};

/* =========================================================
   GENERATE PAYSLIP
   ========================================================= */

export const generatePayslip = async (
  id
) => {
  return apiRequest(
    `/payroll/${encodeURIComponent(
      id
    )}/generate-payslip`,
    {
      method: "POST",
    }
  );
};

/* =========================================================
   DOWNLOAD PAYSLIP
   THIS EXPORT FIXES YOUR CURRENT ERROR
   ========================================================= */

export const downloadPayslip = async (
  id
) => {
  const token = getToken();

  const response = await fetch(
    `${API_BASE}/payroll/${encodeURIComponent(
      id
    )}/payslip/download`,
    {
      method: "GET",
      headers: authHeaders({
        Accept: "application/pdf",
      }),
    }
  );

  if (!response.ok) {
    let message = `Unable to download payslip (${response.status})`;

    try {
      const text =
        await response.text();

      try {
        const data =
          JSON.parse(text);

        message =
          data?.detail ||
          data?.message ||
          message;
      } catch {
        if (text) {
          message = text;
        }
      }
    } catch {
      // Keep default message.
    }

    const error = new Error(message);

    error.status =
      response.status;

    throw error;
  }

  return response.blob();
};

/* =========================================================
   DOWNLOAD EXCEL TEMPLATE
   ========================================================= */

export const downloadTemplate =
  async () => {
    let XLSX;

    try {
      XLSX =
        await import("xlsx");
    } catch {
      throw new Error(
        "Excel package is missing. Run: npm install xlsx"
      );
    }

    const headers = [
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
        headers,
        sampleRow,
      ]);

    worksheet["!cols"] =
      headers.map(
        (_, index) => ({
          wch: [
            24,
            18,
            14,
            10,
            22,
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

    return true;
  };

/* =========================================================
   EXPORT PAYROLL
   ========================================================= */

export const exportPayroll =
  async ({
    format = "csv",
    search = "",
    month = "",
    year = "",
    department = "",
    status = "",
  } = {}) => {
    const query =
      new URLSearchParams();

    query.set(
      "format",
      format
    );

    if (search)
      query.set(
        "search",
        search
      );

    if (month)
      query.set(
        "month",
        month
      );

    if (year)
      query.set(
        "year",
        year
      );

    if (department)
      query.set(
        "department",
        department
      );

    if (status)
      query.set(
        "status",
        status
      );

    const token = getToken();

    const response =
      await fetch(
        `${API_BASE}/payroll/export?${query.toString()}`,
        {
          method: "GET",
          headers:
            authHeaders({
              Accept:
                format === "xlsx"
                  ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  : "text/csv",
            }),
        }
      );

    if (!response.ok) {
      throw new Error(
        `Payroll export failed (${response.status})`
      );
    }

    return response.blob();
  };

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

const payrollService = {
  fetchPayroll,
  validatePayroll,
  importPayroll,
  approvePayroll,
  updatePayroll,
  generatePayslip,
  downloadPayslip,
  downloadTemplate,
  exportPayroll,
};

export default payrollService;