import React from "react";
import { PiEyeDuotone, PiCurrencyInrDuotone } from "react-icons/pi";

function Salary({ formData = {} }) {
  const salaryRecords = [
    {
      sr: 1,
      from: "01-01-2024",
      to: "31-12-2025",
      gross: formData.monthly_gross || "0.00",
      ctc: formData.monthly_ctc || "0.00",
      active: false,
    },
    {
      sr: 2,
      from: "01-01-2026",
      to: "—",
      gross: formData.monthly_gross || "0.00",
      ctc: formData.monthly_ctc || "0.00",
      active: true,
    },
  ];

  const formatCurrency = (val) => {
    const num = Number(val);
    if (Number.isNaN(num)) return `₹ ${val || "0.00"}`;
    return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="section">
      <div className="card">
        <h4>Salary Revision History</h4>

        <div className="table-responsive">
          <table className="payment-table">
            <thead>
              <tr>
                <th style={{ width: "70px" }}>Sr. No</th>
                <th>CTC Effective From</th>
                <th>CTC Effective To</th>
                <th>Monthly Gross</th>
                <th>Monthly CTC</th>
                <th style={{ width: "90px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {salaryRecords.map((item) => (
                <tr key={item.sr} className={item.active ? "active-row" : ""}>
                  <td style={{ fontWeight: 600 }}>{item.sr}</td>
                  <td>{item.from}</td>
                  <td>{item.to}</td>
                  <td>{formatCurrency(item.gross)}</td>
                  <td>{formatCurrency(item.ctc)}</td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="pf-action-icon-btn"
                      title="View salary details"
                    >
                      <PiEyeDuotone size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Salary;