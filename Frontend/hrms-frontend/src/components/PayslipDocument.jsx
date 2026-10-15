import React from 'react';
import './PayslipDocument.css';

const money = (v) =>
  `₹ ${Number(v || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PayslipDocument({
  slip = {},
  employee: employeeProp,
  documentId = 'payslip-document',
}) {
  const e = employeeProp || slip.employee || {};
  const p = slip.payroll || {};
  const gross = Number(p.grossEarnings || 0);
  const deductions = (p.deductions || []).reduce(
    (s, x) => s + Number(x.amount || 0),
    0
  );
  const net = Number(slip.netSalary ?? Math.max(0, gross - deductions));
  const displayMonth = slip.month || 'Payslip';

  return (
    <div id={documentId} className="payslip-sheet">
      {/* Company Header */}
      <div className="payslip-company-header">
        <div className="payslip-company-copy">
          <h2 className="payslip-company-name">LA ESFERA MULTISERVICES LLP</h2>
          <p className="payslip-company-address">
            HYDE PARK, SAKI VIHAR ROAD,
            <br />
            ANDHERI EAST,
            <br />
            MUMBAI 400072
          </p>
        </div>
        <div className="payslip-title-copy">
          <div className="payslip-title">PAYSLIP</div>
          <div className="payslip-period">{displayMonth}</div>
        </div>
      </div>

      {/* Employee Details Band (Royal Purple, strictly no orange) */}
      <div className="payslip-employee-band">
        <div className="payslip-employee-grid">
          <div className="payslip-employee-field">
            <span className="payslip-field-label">Employee Code</span>
            <strong className="payslip-field-value">{e.employeeId || '—'}</strong>
          </div>
          <div className="payslip-employee-field">
            <span className="payslip-field-label">Name</span>
            <strong className="payslip-field-value">{e.name || '—'}</strong>
          </div>
          <div className="payslip-employee-field">
            <span className="payslip-field-label">City</span>
            <strong className="payslip-field-value">{e.city || 'Mumbai'}</strong>
          </div>
          <div className="payslip-employee-field">
            <span className="payslip-field-label">State</span>
            <strong className="payslip-field-value">{e.state || 'Maharashtra'}</strong>
          </div>
          <div className="payslip-employee-field">
            <span className="payslip-field-label">Location Name</span>
            <strong className="payslip-field-value">{e.location || 'Mumbai'}</strong>
          </div>
          <div className="payslip-employee-field">
            <span className="payslip-field-label">Joining Date</span>
            <strong className="payslip-field-value">{e.joiningDate || '—'}</strong>
          </div>
          <div className="payslip-employee-field">
            <span className="payslip-field-label">PAN Number</span>
            <strong className="payslip-field-value">{e.pan || '—'}</strong>
          </div>
          <div className="payslip-employee-field">
            <span className="payslip-field-label">Designation</span>
            <strong className="payslip-field-value">{e.designation || '—'}</strong>
          </div>
          <div className="payslip-employee-field">
            <span className="payslip-field-label">Department</span>
            <strong className="payslip-field-value">{e.department || '—'}</strong>
          </div>
          <div className="payslip-employee-field">
            <span className="payslip-field-label">Bank Name</span>
            <strong className="payslip-field-value">{e.bankName || '—'}</strong>
          </div>
        </div>
      </div>

      {/* Payroll Days Strip */}
      <div className="payslip-payroll-strip" aria-label="Payroll days">
        <div>
          <span>Payroll Days</span>
          <strong>Total Days</strong>
          <em>{p.totalDays || 0}</em>
        </div>
        <div>
          <span>&nbsp;</span>
          <strong>Days Paid</strong>
          <em>{p.paidDays || 0}</em>
        </div>
        <div>
          <span>&nbsp;</span>
          <strong>Arrear Days</strong>
          <em>{p.arrearDays || 0}</em>
        </div>
        <div>
          <span>&nbsp;</span>
          <strong>Absent Days</strong>
          <em>{p.absentDays || 0}</em>
        </div>
      </div>

      {/* Two Column Earnings & Deductions */}
      <div className="payslip-two-column" aria-label="Earnings and deductions">
        <section className="payslip-pay-section earnings">
          <div className="payslip-section-heading earnings">●&nbsp; Earnings</div>
          <div className="payslip-table-header">
            <span className="payslip-th-label">Earning Head</span>
            <strong className="payslip-th-amount">Total Amount</strong>
          </div>
          {(p.earnings || []).map((x, idx) => (
            <div className="payslip-line" key={x.label || idx}>
              <span>{x.label}</span>
              <strong>{money(x.amount)}</strong>
            </div>
          ))}
          <div className="payslip-line total">
            <strong>Gross Earnings</strong>
            <strong>{money(gross)}</strong>
          </div>
        </section>

        <section className="payslip-pay-section deductions">
          <div className="payslip-section-heading deductions-heading">●&nbsp; Deductions</div>
          <div className="payslip-table-header">
            <span className="payslip-th-label">Deduction Head</span>
            <strong className="payslip-th-amount">Total Amount</strong>
          </div>
          {p.deductions && p.deductions.length ? (
            p.deductions.map((x, idx) => (
              <div className="payslip-line" key={x.label || idx}>
                <span>{x.label}</span>
                <strong>{money(x.amount)}</strong>
              </div>
            ))
          ) : (
            <div className="payslip-line">
              <span>No deductions reported</span>
              <strong>{money(0)}</strong>
            </div>
          )}
          <div className="payslip-line total">
            <strong>Gross Deductions</strong>
            <strong>{money(deductions)}</strong>
          </div>
        </section>
      </div>

      {/* Net Salary Bar */}
      <div className="payslip-net-bar">
        <strong>Net Salary</strong>
        <strong>{money(net)}</strong>
      </div>

      {/* Net Amount in Words */}
      <div className="payslip-words">
        <strong>Net Amount in words :</strong>
        <span>{numberToWords(net)} Rupees Only</span>
      </div>

      {/* Footer Note */}
      <div className="payslip-note">
        Note: This is a computer generated statement. Hence no signature is required.
      </div>
    </div>
  );
}

function numberToWords(n) {
  const o = [
    'Zero',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const t = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const u100 = (x) =>
    x < 20 ? o[x] : `${t[Math.floor(x / 10)]}${x % 10 ? ` ${o[x % 10]}` : ''}`;
  const u1000 = (x) =>
    x < 100
      ? u100(x)
      : `${o[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${u100(x % 100)}` : ''}`;
  const w = Math.floor(Number(n) || 0);
  if (w < 1000) return u100(w);
  if (w < 100000)
    return `${u1000(Math.floor(w / 1000))} Thousand${
      w % 1000 ? ` ${u1000(w % 1000)}` : ''
    }`;
  if (w < 10000000)
    return `${u1000(Math.floor(w / 100000))} Lakh${
      w % 100000 ? ` ${u1000(w % 100000)}` : ''
    }`;
  return w.toLocaleString('en-IN');
}
