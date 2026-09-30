import { getEmployeeDisplayName, getInitials } from './employeeDisplay.js';

function assertEqual(testName, actual, expected) {
  if (actual === expected) {
    console.log(`✅ [PASS] ${testName}: expected "${expected}", got "${actual}"`);
  } else {
    console.error(`❌ [FAIL] ${testName}: expected "${expected}", got "${actual}"`);
    process.exitCode = 1;
  }
}

console.log("Running Employee Display Unit Tests...\n");

// Test Case A
assertEqual(
  'Case A: Real Name + Email',
  getEmployeeDisplayName({ name: "Aaquib Khan", email: "aaquib.k@laesfera.co" }),
  "Aaquib Khan"
);

// Test Case B
assertEqual(
  'Case B: Name === Email',
  getEmployeeDisplayName({ name: "aaquib.k@laesfera.co", email: "aaquib.k@laesfera.co" }),
  "aaquib.k@laesfera.co"
);

// Test Case C
assertEqual(
  'Case C: Name is null',
  getEmployeeDisplayName({ name: null, email: "aaquib.k@laesfera.co" }),
  "aaquib.k@laesfera.co"
);

// Test Case D
assertEqual(
  'Case D: Name is empty string',
  getEmployeeDisplayName({ name: "", email: "aaquib.k@laesfera.co" }),
  "aaquib.k@laesfera.co"
);

// Test Case E
assertEqual(
  'Case E: Case-insensitive + untrimmed email match',
  getEmployeeDisplayName({ name: " AAQUIB.K@LAESFERA.CO ", email: "aaquib.k@laesfera.co" }),
  "aaquib.k@laesfera.co"
);

// Test Case F
assertEqual(
  'Case F: Excel import with Full Name + Email',
  getEmployeeDisplayName({ name: "Aaquib Khan", email: "aaquib.k@laesfera.co" }),
  "Aaquib Khan"
);

// Test Case G
assertEqual(
  'Case G: Excel import with only Email',
  getEmployeeDisplayName({ name: null, email: "aaquib.k@laesfera.co" }),
  "aaquib.k@laesfera.co"
);

// Test Case H
assertEqual(
  'Case H: CSV import with only Email',
  getEmployeeDisplayName({ name: null, email: "aaquib.k@laesfera.co" }),
  "aaquib.k@laesfera.co"
);

// Bonus Case: Repeated email in name ("email email")
assertEqual(
  'Bonus: Repeated email in name field',
  getEmployeeDisplayName({ name: "aaquib.k@laesfera.co aaquib.k@laesfera.co", email: "aaquib.k@laesfera.co" }),
  "aaquib.k@laesfera.co"
);

console.log("\nAll unit tests completed.");
