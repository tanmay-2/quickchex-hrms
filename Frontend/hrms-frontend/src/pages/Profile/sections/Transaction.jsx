// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - TRANSACTION.JSX
// Path: Frontend/hrms-frontend/src/pages/Profile/sections/Transaction.jsx
// Purpose: Web portal page component managing 'Transaction' views, user interactions, and state.
// UI Components:
//   • <Transaction />
// ==============================================================================

import React from "react";
import { PiClockCounterClockwiseDuotone, PiFolderSimpleDashedDuotone, PiArrowSquareOutDuotone } from "react-icons/pi";

function Transaction({ isEditing, transactions = [] }) {
  const hasTransactions = Array.isArray(transactions) && transactions.length > 0;

  return (
    <div className="section">
      <div className="card">
        <h4>Transaction History</h4>

        {hasTransactions ? (
          <div className="table-responsive">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Transaction Type</th>
                  <th>Initiated By</th>
                  <th>Last Activity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, idx) => (
                  <tr key={t.id || idx}>
                    <td style={{ fontWeight: 600 }}>{t.type || t.transaction_type || "Profile Change"}</td>
                    <td>{t.initiated_by || t.initiator || "Self"}</td>
                    <td>{t.updated_at || t.last_activity || "—"}</td>
                    <td>
                      <span className={`status-badge status-${(t.status || "pending").toLowerCase()}`}>
                        {t.status || "Pending"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="pf-action-icon-btn"
                        title="View details"
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
    </div>
  );
}

export default Transaction;