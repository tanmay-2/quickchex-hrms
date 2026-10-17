import React from "react";
import { PiEyeDuotone, PiCurrencyInrDuotone } from "react-icons/pi";

function Salary({ formData = {} }) {
  const [selectedRecord, setSelectedRecord] = React.useState(null);

  const salaryRecords = [
    {
      sr: 1,
      from: "01-01-2024",
      to: "31-12-2025",
      gross: formData.monthly_gross || "45000.00",
      ctc: formData.monthly_ctc || "50000.00",
      active: false,
    },
    {
      sr: 2,
      from: "01-01-2026",
      to: "—",
      gross: formData.monthly_gross || "65000.00",
      ctc: formData.monthly_ctc || "72000.00",
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
                      onClick={() => setSelectedRecord(item)}
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

      {/* Salary Breakdown Modal */}
      {selectedRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1e1b4b" }}>
                Salary Revision #{selectedRecord.sr} Breakdown
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: "10px", fontSize: "13.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ color: "#64748b" }}>Effective Period</span>
                <strong>{selectedRecord.from} to {selectedRecord.to}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ color: "#64748b" }}>Monthly Gross</span>
                <strong>{formatCurrency(selectedRecord.gross)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ color: "#64748b" }}>Monthly CTC</span>
                <strong style={{ color: "#7c3aed" }}>{formatCurrency(selectedRecord.ctc)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ color: "#64748b" }}>Basic Salary (50%)</span>
                <strong>{formatCurrency(Number(selectedRecord.gross || 0) * 0.5)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ color: "#64748b" }}>HRA (30%)</span>
                <strong>{formatCurrency(Number(selectedRecord.gross || 0) * 0.3)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ color: "#64748b" }}>Special Allowance</span>
                <strong>{formatCurrency(Number(selectedRecord.gross || 0) * 0.2)}</strong>
              </div>
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                style={{
                  background: "#7c3aed",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13px",
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
}

export default Salary;