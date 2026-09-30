import React from 'react';
import { employee } from '../data';

const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PayslipDocument({ slip, documentId = 'payslip-document' }) {
  const payroll = slip?.payroll || {};
  const earnings = Array.isArray(payroll.earnings) && payroll.earnings.length
    ? payroll.earnings
    : [{ label: 'Net Salary', amount: Number(slip?.netSalary || 0) }];
  const deductions = Array.isArray(payroll.deductions) ? payroll.deductions : [];
  const gross = Number(payroll.grossEarnings ?? slip?.netSalary ?? 0);
  const deductionTotal = deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const net = Number(slip?.netSalary ?? Math.max(0, gross - deductionTotal));
  const displayMonth = slip?.month || 'Payslip';

  return (
    <article id={documentId} className="payslip-sheet" aria-label={`${displayMonth} payslip`}>
      <header className="payslip-company-header">
        <div className="payslip-company-copy">
          <h2>LA ESFERA MULTISERVICES LLP</h2>
          <p>HYDE PARK, SAKI VIHAR ROAD,<br />ANDHERI EAST,<br />MUMBAI 400072</p>
        </div>
        <div className="payslip-title-copy">
          <div className="payslip-title">Payslip</div>
          <div className="payslip-period">{displayMonth.replace(' ', ' - ')}</div>
        </div>
      </header>

      <section className="payslip-employee-band">
        <div className="payslip-employee-grid">
          <div className="payslip-employee-field"><span>Employee Code</span><strong>{employee.employeeId || '—'}</strong></div>
          <div className="payslip-employee-field"><span>Joining Date</span><strong>{employee.employment?.['Date of Joining'] || '—'}</strong></div>
          <div className="payslip-employee-field"><span>Name</span><strong>{employee.name || '—'}</strong></div>
          <div className="payslip-employee-field"><span>PAN Number</span><strong>—</strong></div>
          <div className="payslip-employee-field"><span>City</span><strong>{employee.employment?.['Work Location']?.split(',')[0] || '—'}</strong></div>
          <div className="payslip-employee-field"><span>Designation</span><strong>{employee.designation || '—'}</strong></div>
          <div className="payslip-employee-field"><span>State</span><strong>{employee.employment?.['Work Location']?.split(',')[1]?.trim() || '—'}</strong></div>
          <div className="payslip-employee-field"><span>Department</span><strong>{employee.department || '—'}</strong></div>
          <div className="payslip-employee-field"><span>Location Name</span><strong>{employee.employment?.['Work Location'] || '—'}</strong></div>
          <div className="payslip-employee-field"><span>Bank Name</span><strong>—</strong></div>
          <div className="payslip-employee-field"><span>Bank Account</span><strong>—</strong></div>
        </div>
      </section>

      <section className="payslip-payroll-strip" aria-label="Payroll days">
        <div><span>Payroll Days</span><strong>Total Days</strong><em>{payroll.totalDays ?? 0}</em></div>
        <div><span>&nbsp;</span><strong>Days Paid</strong><em>{payroll.paidDays ?? 0}</em></div>
        <div><span>&nbsp;</span><strong>Arrear Days</strong><em>{payroll.arrearDays ?? 0}</em></div>
        <div><span>&nbsp;</span><strong>Absent Days</strong><em>{payroll.absentDays ?? 0}</em></div>
      </section>

      <section className="payslip-two-column" aria-label="Earnings and deductions">
        <div className="payslip-pay-section">
          <div className="payslip-section-heading earnings"><span>●</span> Earnings</div>
          <div className="payslip-table-header"><span>Earning Head</span><strong>Total Amount</strong></div>
          {earnings.map((item, index) => (
            <div className="payslip-line" key={`earning-${item.label}-${index}`}>
              <span>{item.label}</span><strong>{money(item.amount)}</strong>
            </div>
          ))}
          <div className="payslip-line total"><strong>Gross Earnings</strong><strong>{money(gross)}</strong></div>
        </div>

        <div className="payslip-pay-section deductions">
          <div className="payslip-section-heading deductions-heading"><span>●</span> Deductions</div>
          <div className="payslip-table-header"><span>Deduction Head</span><strong>Total Amount</strong></div>
          {deductions.length ? deductions.map((item, index) => (
            <div className="payslip-line" key={`deduction-${item.label}-${index}`}>
              <span>{item.label}</span><strong>{money(item.amount)}</strong>
            </div>
          )) : (
            <div className="payslip-line"><span>No deductions reported</span><strong>{money(0)}</strong></div>
          )}
          <div className="payslip-line total"><strong>Gross Deductions</strong><strong>{money(deductionTotal)}</strong></div>
        </div>
      </section>

      <section className="payslip-net-bar">
        <strong>Net Salary</strong>
        <strong>{money(net)}</strong>
      </section>

      <div className="payslip-words">
        <strong>Net Amount in words :</strong>
        <span>{numberToWords(net)} Rupees Only</span>
      </div>

      <div className="payslip-note">
        Note: This is a computer generated statement. Hence no signature is required.
      </div>
    </article>
  );
}

function numberToWords(value) {
  const ones = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const under100 = (n) => n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`;
  const under1000 = (n) => n < 100 ? under100(n) : `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${under100(n % 100)}` : ''}`;
  const whole = Math.floor(Number(value) || 0);
  if (whole < 1000) return under1000(whole);
  if (whole < 100000) return `${under1000(Math.floor(whole / 1000))} Thousand${whole % 1000 ? ` ${under1000(whole % 1000)}` : ''}`;
  if (whole < 10000000) return `${under1000(Math.floor(whole / 100000))} Lakh${whole % 100000 ? ` ${under1000(whole % 100000)}` : ''}`;
  return whole.toLocaleString('en-IN');
}
