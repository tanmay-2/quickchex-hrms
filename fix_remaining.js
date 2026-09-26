const fs = require('fs');
const BACKEND = 'https://quickchex-backend.onrender.com';

const fixes = [
  {
    file: 'Quickchex/Frontend/hrms-frontend/src/components/header/DashboardHeader.jsx',
    from: `const API_BASE = (import.meta.env?.VITE_API_URL || 'http://localhost:8000').replace(/\\/$/, '');`,
    to: `const API_BASE = (import.meta.env?.VITE_API_URL || '${BACKEND}').replace(/\\/$/, '');`
  },
  {
    file: 'Quickchex/Frontend/hrms-frontend/src/manager-portal/auth/managerAuthService.js',
    from: `: (import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000")`,
    to: `: (import.meta.env?.VITE_API_URL || "${BACKEND}")`
  },
  {
    file: 'Quickchex/Frontend/hrms-frontend/src/pages/Admin/Dashboard.jsx',
    from: `const API_BASE = (import.meta.env?.VITE_API_URL || "http://localhost:8000").replace(/\\/$/, "");`,
    to: `const API_BASE = (import.meta.env?.VITE_API_URL || "${BACKEND}").replace(/\\/$/, "");`
  },
  {
    file: 'Quickchex/Frontend/hrms-frontend/src/pages/Admin/EmployeeDirectory.jsx',
    from: `const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\\/$/, '');`,
    to: `const API_BASE = (import.meta.env.VITE_API_URL || '${BACKEND}').replace(/\\/$/, '');`
  },
  {
    file: 'Quickchex/Frontend/hrms-frontend/src/pages/Admin/RoleAccessManagement.jsx',
    from: `const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\\/$/, "");`,
    to: `const API_BASE = (import.meta.env.VITE_API_URL || "${BACKEND}").replace(/\\/$/, "");`
  },
  {
    file: 'Quickchex/Frontend/hrms-frontend/src/pages/Dashboard/AttendanceLogs.jsx',
    from: `const API_BASE = (import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000").replace(/\\/$/, "");`,
    to: `const API_BASE = (import.meta.env?.VITE_API_URL || "${BACKEND}").replace(/\\/$/, "");`
  },
  {
    file: 'Quickchex/Frontend/hrms-frontend/src/pages/Dashboard/AttendanceRecord.jsx',
    from: `return \`http://localhost:8000\${img.startsWith("/") ? "" : "/"}`,
    to: `return \`${BACKEND}\${img.startsWith("/") ? "" : "/"}`
  },
  {
    file: 'Quickchex/Frontend/hrms-frontend/src/pages/EmployeePortal/pages/Login.jsx',
    from: `const API_BASE = (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? \`http://\${window.location.hostname}:8000\` : (import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000')).replace(/\\/$/, '');`,
    to: `const API_BASE = (import.meta.env?.VITE_API_URL || '${BACKEND}').replace(/\\/$/, '');`
  },
];

let fixed = 0;
fixes.forEach(({file, from, to}) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(from)) {
    fs.writeFileSync(file, content.replace(from, to), 'utf8');
    console.log('✅ Fixed:', file.split('/').slice(-2).join('/'));
    fixed++;
  } else {
    // Try partial match
    const lines = content.split('\n');
    const matchLine = lines.find(l => l.includes('localhost:8000') || l.includes('127.0.0.1:8000'));
    if (matchLine) {
      console.log('⚠️ Partial match in', file.split('/').slice(-2).join('/') + ':', matchLine.trim());
    } else {
      console.log('✅ Already clean:', file.split('/').slice(-2).join('/'));
    }
  }
});
console.log(`\nFixed ${fixed}/${fixes.length} files.`);
