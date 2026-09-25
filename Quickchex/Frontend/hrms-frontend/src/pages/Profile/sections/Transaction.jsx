function Transaction({ isEditing }) {
  return (
    <div className="section">
      <h3>Transaction</h3>

      <div className="card">
       

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
        </table>

        {/* EMPTY STATE */}
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <p>There are no data change requests</p>
        </div>
      </div>
    </div>
  );
}

export default Transaction;