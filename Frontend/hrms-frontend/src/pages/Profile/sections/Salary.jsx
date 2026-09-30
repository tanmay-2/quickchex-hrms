function Salary() {
  return (
    <div className="section">
      <div className="section-header">
          <h3>Salary</h3>
      </div>
      

      <div className="card">
       

        <table className="payment-table">
          <thead>
            <tr>
              <th>Sr. No</th>
              <th>CTC Effective From</th>
              <th>CTC Effective To</th>
              <th>Monthly Gross (₹)</th>
              <th>Monthly CTC (₹)</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>1</td>
              <td>01-01-2024</td>
              <td>31-12-2025</td>
              <td>0.0</td>
              <td>0.0</td>
              <td>👁</td>
            </tr>

            <tr className="active-row">
              <td>2</td>
              <td>01-01-2026</td>
              <td>-</td>
              <td>0.0</td>
              <td>0.0</td>
              <td>👁</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Salary;