const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, 'Quickchex/Frontend/hrms-frontend/src');
const BACKEND = 'https://quickchex-backend.onrender.com';

// Files to completely skip (they use dynamic host detection)
const SKIP = ['managerApiService.js', 'AdminManagersList.jsx'];
// Files where localhost:8000 is inside a fallback that already handles production
const SKIP_PATTERNS = ['Attendance_FULL_REBUILD.jsx', 'Dashboard.jsx'];

let totalFiles = 0;
let fixedFiles = 0;

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) { walk(full); return; }
    if (!f.endsWith('.jsx') && !f.endsWith('.js')) return;
    if (SKIP.includes(f)) { console.log('SKIP (known safe):', f); return; }

    let content = fs.readFileSync(full, 'utf8');
    const original = content;

    if (!content.includes('localhost:8000') && !content.includes('127.0.0.1:8000')) return;
    totalFiles++;
    
    console.log('\nProcessing:', full.replace(base + path.sep, ''));

    // Pattern 1: const API_BASE = "http://localhost:8000"; or const API = "http://localhost:8000";
    content = content.replace(
      /const\s+(API_BASE|API)\s*=\s*['"]http:\/\/localhost:8000['"];/g,
      `import { getApiBaseUrl as _getApiBaseUrl } from '../../utils/apiBase';\nconst $1 = _getApiBaseUrl();`
    );
    
    // Pattern 2: const API_BASE = 'http://localhost:8000'; at top level
    content = content.replace(
      /const\s+API_BASE\s*=\s*['"]http:\/\/localhost:8000['"];/g,
      `const API_BASE = '${BACKEND}';`
    );

    // Pattern 3: import.meta.env?.VITE_API_URL?.replace(...) || "http://localhost:8000"
    content = content.replace(
      /import\.meta\.env\??\.VITE_API_URL\??\.replace\([^)]+\)\s*\|\|\s*["']http:\/\/localhost:8000["']/g,
      `import.meta.env?.VITE_API_URL?.replace(/\\/$/, '') || '${BACKEND}'`
    );

    // Pattern 4: Simple fetch("http://localhost:8000/path")  
    content = content.replace(
      /fetch\(\s*["']http:\/\/localhost:8000(\/[^'"]+)["']/g,
      (match, urlPath) => `fetch(\`${BACKEND}${urlPath}\``
    );
    
    // Pattern 5: fetch(`http://localhost:8000/path/${var}`)
    content = content.replace(
      /["']http:\/\/localhost:8000(\/[^'"$`]+)["']/g,
      `'${BACKEND}$1'`
    );
    
    // Pattern 6: Template literals `http://localhost:8000/path/${var}`
    content = content.replace(
      /`http:\/\/localhost:8000(\/[^`]+)`/g,
      `\`${BACKEND}$1\``
    );

    // Pattern 7: const LOGIN_URL = "http://localhost:8000/api/v1/auth/login";
    content = content.replace(
      /const\s+LOGIN_URL\s*=\s*["']http:\/\/localhost:8000([^'"]+)["'];/g,
      `const LOGIN_URL = '${BACKEND}$1';`
    );

    if (content !== original) {
      fs.writeFileSync(full, content, 'utf8');
      fixedFiles++;
      console.log('  ✅ Fixed');
    } else {
      console.log('  ⚠️  Could not auto-fix - check manually');
    }
  });
}

walk(base);
console.log(`\n=== Done: Fixed ${fixedFiles}/${totalFiles} files ===`);
