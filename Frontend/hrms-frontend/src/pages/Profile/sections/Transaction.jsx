import React from "react";
import { PiClockCounterClockwiseDuotone, PiFolderSimpleDashedDuotone, PiArrowSquareOutDuotone } from "react-icons/pi";

function Transaction({ isEditing, transactions = [] }) {
  const [selectedTx, setSelectedTx] = React.useState(null);

  const transactionList = React.useMemo(() => {
    if (Array.isArray(transactions) && transactions.length > 0) return transactions;
    return [
      {
        id: "TX-1092",
        type: "Personal Details Update",
        initiated_by: "Employee (Self)",
        updated_at: "14 Oct 2026, 04:30 PM",
        status: "Approved",
        details: "Updated residential address and emergency contact number.",
      },
      {
        id: "TX-1088",
        type: "Tax Regime Declaration",
        initiated_by: "Employee (Self)",
        updated_at: "01 Apr 2026, 11:15 AM",
        status: "Approved",
        details: "Selected New Tax Regime (Section 115BAC for FY 2026-27).",
      },
      {
        id: "TX-1075",
        type: "Bank Account Verification",
        initiated_by: "HR Admin",
        updated_at: "12 Jan 2026, 02:45 PM",
        status: "Completed",
        details: "Verified IFSC code and salary direct deposit routing details.",
      },
    ];
  }, [transactions]);

  const hasTransactions = transactionList.length > 0;

  return (
    <div className="section">
      <div className="card">
        <h4>Transaction History</h4>

        {hasTransactions ? (
          <div className="table-responsive">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Transaction Type</th>
                  <th>Initiated By</th>
                  <th>Last Activity</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactionList.map((t, idx) => (
                  <tr key={t.id || idx}>
                    <td style={{ fontWeight: 600, color: "#6d28d9" }}>{t.id || `TX-${1000 + idx}`}</td>
                    <td>{t.type || t.transaction_type || "Profile Change"}</td>
                    <td>{t.initiated_by || t.initiator || "Self"}</td>
                    <td>{t.updated_at || t.last_activity || "—"}</td>
                    <td>
                      <span className={`status-badge status-${(t.status || "pending").toLowerCase()}`}>
                        {t.status || "Pending"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="pf-action-icon-btn"
                        title="View details"
                        onClick={() => setSelectedTx(t)}
                      >
                        <PiArrowSquareOutDuotone size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="pf-empty-state">
            <div className="pf-empty-icon" aria-hidden="true">
              <PiFolderSimpleDashedDuotone size={44} />
            </div>
            <h5 className="pf-empty-title">No transaction requests yet</h5>
            <p className="pf-empty-desc">
              New profile change requests and administrative approval records will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
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
          onClick={() => setSelectedTx(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1e1b4b" }}>
                Transaction Details ({selectedTx.id})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
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

            <div style={{ display: "grid", gap: "12px", fontSize: "13.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ color: "#64748b" }}>Type</span>
                <strong>{selectedTx.type}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ color: "#64748b" }}>Initiated By</span>
                <strong>{selectedTx.initiated_by}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ color: "#64748b" }}>Date & Time</span>
                <strong>{selectedTx.updated_at}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span style={{ color: "#64748b" }}>Status</span>
                <span className={`status-badge status-${(selectedTx.status || "pending").toLowerCase()}`}>
                  {selectedTx.status}
                </span>
              </div>
              {selectedTx.details && (
                <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ color: "#64748b", marginBottom: "4px", fontSize: "12px" }}>Notes / Summary</div>
                  <div style={{ color: "#1e293b", lineHeight: 1.5 }}>{selectedTx.details}</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
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

export default Transaction;