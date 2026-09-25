RESTORE PACKAGE

Replace these exact files in your current project:
- src/App.jsx
- src/pages/Attendance/Attendance.jsx
- src/pages/Attendance/Attendance.css
- src/pages/Attendance/AttendanceRecord.jsx
- src/pages/Attendance/AttendanceRecord.css
- src/pages/Dashboard/RegularizationPage.jsx
- src/pages/Dashboard/RegularizationPage.css

Routes restored:
- /dashboard/all_emp_attendance -> Attendance
- /dashboard/attendance-records -> AttendanceRecord
- /dashboard/regularization -> RegularizationPage
- /dashboard_emp/attendance -> Attendance
- /dashboard_emp/regularization -> RegularizationPage
- /dashboard_tl/attendance -> Attendance
- /dashboard_tl/my_regularization -> RegularizationPage
- /dashboard_tl/tl_regularization -> TLRegularization

Do not add GenericPage back into App routing for these paths.
