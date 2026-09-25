/* ============================================================
   SHARED UNIFIED EMPLOYEE STORE & PERSISTENCE HELPER
   ============================================================ */

const STORAGE_KEY = "hrms_employee_store";
const API_BASE = (import.meta.env?.VITE_API_URL || (typeof window !== "undefined" && window.location?.hostname && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? `http://${window.location.hostname}:8000` : "https://quickchex-backend.onrender.com")).replace(/\/$/, "");

export function getStoredEmployees() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {
    console.warn("Failed to read employee store from localStorage:", err);
  }
  return [];
}

export function saveStoredEmployees(employees) {
  if (!Array.isArray(employees)) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  } catch (err) {
    console.warn("Failed to save employee store to localStorage:", err);
  }
}

export async function loadUnifiedEmployees() {
  let fetchedList = [];
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");

  try {
    // 1. Try /api/v1/admin/users
    let res = await fetch(`${API_BASE}/api/v1/admin/users`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      fetchedList = data.users || (Array.isArray(data) ? data : []);
    } else {
      // 2. Fallback /profile/employees/
      const res2 = await fetch(`${API_BASE}/profile/employees/`);
      if (res2.ok) {
        const data2 = await res2.json();
        fetchedList = Array.isArray(data2) ? data2 : [];
      }
    }
  } catch (err) {
    console.warn("API load failed, using stored local cache:", err);
  }

  // Format fetched list
  if (Array.isArray(fetchedList) && fetchedList.length > 0) {
    const formatted = fetchedList.map((emp, i) => {
      const empCode = emp.emp_code || emp.id || `EMP${i + 1}`;
      const rawName = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || empCode;
      const email = emp.email || `${String(empCode).toLowerCase()}@laesfera.co`;
      const phone = emp.mobile_no || emp.mobile || emp.phone || emp.contact || "—";
      const role = (emp.role || "employee").trim().lowerCase ? (emp.role || "employee").trim().toLowerCase() : "employee";

      return {
        id: empCode,
        emp_code: empCode,
        name: rawName,
        first_name: emp.first_name || null,
        last_name: emp.last_name || null,
        role: role,
        designation: emp.designation || (role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Employee"),
        department: emp.department || "General",
        email: email,
        phone: phone,
        mobile_no: phone,
        contact: phone,
        location: emp.location || emp.branch_location || "Mumbai, IN",
        type: emp.employment_type || emp.type || "Full-time",
        joined: emp.joining_date || emp.emp_join_date || "2026-01-01",
        employment_status: emp.employment_status || "Active",
        profile_image: emp.profile_image || "",
        reporting_supervisor: emp.reporting_supervisor || emp.manager || null,
      };
    });

    saveStoredEmployees(formatted);
    return formatted;
  }

  // Fallback to localStorage if API returned empty/error
  return getStoredEmployees();
}

export async function updateEmployeeRoleInStore(empCode, newRole) {
  if (!empCode || !newRole) return;
  const cleanRole = String(newRole).trim().toLowerCase();

  // 1. Update localStorage cache
  const localList = getStoredEmployees();
  const updatedList = localList.map((emp) =>
    emp.emp_code === empCode || emp.id === empCode
      ? { ...emp, role: cleanRole, designation: cleanRole === "admin" ? "Admin" : cleanRole === "manager" ? "Manager" : emp.designation }
      : emp
  );
  saveStoredEmployees(updatedList);

  // 2. Call Backend API
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  try {
    await fetch(`${API_BASE}/api/v1/admin/users/${empCode}/role`, {
      method: "PUT",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: cleanRole }),
    });
  } catch (err) {
    console.warn("Failed to persist role change to backend API:", err);
  }
}
