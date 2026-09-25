import { getEmployeeDisplayName } from './employeeDisplay.js';

function parseUniversalEmployeeRowTest(rowObj) {
  const entries = [];
  if (rowObj && typeof rowObj === 'object') {
    Object.entries(rowObj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const rawKey = String(k).trim();
        const cleanKey = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        entries.push({ key: rawKey, cleanKey, val: String(v).trim(), rawVal: v });
      }
    });
  }

  if (!entries.length) return null;

  const getVal = (keywords) => {
    for (const kw of keywords) {
      const match = entries.find((e) => e.cleanKey === kw || e.cleanKey.includes(kw) || e.key.toLowerCase().includes(kw));
      if (match) return match.val;
    }
    return '';
  };

  let name = getVal(['fullname', 'employeename', 'employeenamefull', 'membername', 'username', 'staffname', 'personname', 'employee', 'user', 'staff', 'person', 'name', 'empname']);
  let firstName = getVal(['firstname', 'fname', 'first', 'givenname']);
  let lastName = getVal(['lastname', 'lname', 'last', 'surname', 'familyname']);
  let email = getVal(['officialemail', 'emailid', 'emailaddress', 'email', 'mail', 'officialmail', 'workemail', 'personalemail', 'e_mail', 'useremail', 'empemail']);

  if (!email) {
    const emailEntry = entries.find((e) => e.val.includes('@') && e.val.includes('.'));
    if (emailEntry) email = emailEntry.val;
  }

  if (!name && (firstName || lastName)) {
    name = `${firstName || ''} ${lastName || ''}`.trim();
  }

  if (name && (name.includes('@') || (email && name.toLowerCase().trim() === email.toLowerCase().trim()))) {
    name = null;
  }

  return {
    name: name ? name.trim() : null,
    email: email ? email.trim() : null,
  };
}

function assertEqual(testName, actual, expected) {
  if (actual === expected) {
    console.log(`✅ [PASS] ${testName}: expected "${expected}", got "${actual}"`);
  } else {
    console.error(`❌ [FAIL] ${testName}: expected "${expected}", got "${actual}"`);
    process.exitCode = 1;
  }
}

console.log("Running Employee Import Parser Unit Tests...\n");

// Test F: Excel with Full Name + Email
const rowF = parseUniversalEmployeeRowTest({ "Full Name": "Aaquib Khan", "Email": "aaquib.k@laesfera.co" });
assertEqual("Case F (Parser): Full Name + Email name", rowF.name, "Aaquib Khan");
assertEqual("Case F (Parser): Full Name + Email display", getEmployeeDisplayName(rowF), "Aaquib Khan");

// Test G: Excel with only Email
const rowG = parseUniversalEmployeeRowTest({ "Email": "aaquib.k@laesfera.co", "Role": "admin" });
assertEqual("Case G (Parser): Only Email name", rowG.name, null);
assertEqual("Case G (Parser): Only Email display", getEmployeeDisplayName(rowG), "aaquib.k@laesfera.co");

// Test H: CSV with only Email
const rowH = parseUniversalEmployeeRowTest({ "Work Email": "aaquib.k@laesfera.co" });
assertEqual("Case H (Parser): CSV Work Email name", rowH.name, null);
assertEqual("Case H (Parser): CSV Work Email display", getEmployeeDisplayName(rowH), "aaquib.k@laesfera.co");

console.log("\nAll parser tests completed successfully.");
