# LA ESFERA Admin Payroll Excel Workflow

Copy the files into the matching paths in the existing React project.

Install Excel parsing if it is not already present:

npm install xlsx

The frontend expects these backend endpoints:

GET /api/v1/payroll
POST /api/v1/payroll/validate
POST /api/v1/payroll/import
POST /api/v1/payroll/{id}/approve
PUT /api/v1/payroll/{id}
POST /api/v1/payroll/{id}/generate-payslip
GET /api/v1/payroll/{id}/payslip/download
GET /api/v1/payroll/template
GET /api/v1/payroll/export

Recommended unique key: employee_id + month + year.

The existing payslip layout/classes are retained; PayslipDocument now accepts employee data via props so imported records do not render hard-coded employee information.

For employee security, backend payslip endpoints must derive employee identity from the authenticated session/JWT and must not trust an employee ID sent by the employee client.
