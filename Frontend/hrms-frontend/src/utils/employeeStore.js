/* ============================================================
   SHARED UNIFIED EMPLOYEE STORE & PERSISTENCE HELPER
   ============================================================ */

import { getApiBaseUrl, getApiUrl } from "../services/apiClient";

const STORAGE_KEY = "hrms_employee_store";
const API_BASE = getApiBaseUrl();

export function getStoredEmployees() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        const seen = new Set();
        const dedupe = [];
        for (const item of list) {
          const codeKey = (item.emp_code || item.id || "").trim().toUpperCase();
          const emailKey = (item.email || "").trim().toLowerCase();
          const key = codeKey || emailKey;
          if (key && !seen.has(key)) {
            seen.add(key);
            if (emailKey) seen.add(emailKey);
            if (codeKey) seen.add(codeKey);
            if (item.department && (item.department.includes("*") || item.department.toLowerCase().includes("mumbai") || item.department.toLowerCase().includes("india"))) {
              item.department = "Operations";
            }
            dedupe.push(item);
          }
        }
        return dedupe;
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
    let res = await fetch(getApiUrl("/api/v1/admin/users"), {
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
      const res2 = await fetch(getApiUrl("/profile/employees/"));
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
      const empCode = emp.emp_code || emp.id || emp.employee_id || emp.employeeId || `EMP${i + 1}`;
      const nameParts = [emp.first_name, emp.middle_name, emp.last_name]
        .map((s) => String(s || "").trim())
        .filter((s) => s && s !== "." && s.toLowerCase() !== "none");
      const cleanCombinedName = nameParts.length > 0 ? nameParts.join(" ") : "";
      let rawName = emp.name || cleanCombinedName || empCode;
      if (rawName && rawName.includes("@")) {
        rawName = rawName.split("@")[0];
      }

      const email = emp.email || `${String(empCode).toLowerCase()}@laesfera.co`;
      const phone = emp.mobile_no || emp.mobile || emp.phone || emp.contact || "—";
      const rawRole = typeof emp.role === "string" ? emp.role.trim().toLowerCase() : "employee";
      const validRoles = ["admin", "manager", "employee", "teamleader"];
      const role = validRoles.includes(rawRole) ? rawRole : "employee";

      const joinDate = emp.joining_date || emp.emp_join_date || emp.joined || "";
      let dept = emp.department && emp.department !== "." ? String(emp.department).trim() : "Operations";
      if (dept.includes("*") || dept.toLowerCase().includes("mumbai") || dept.toLowerCase().includes("india") || dept.toLowerCase() === "unassigned") {
        dept = "Operations";
      }

      return {
        id: empCode,
        emp_code: empCode,
        employee_id: empCode,
        employeeId: empCode,
        name: rawName,
        first_name: emp.first_name || null,
        middle_name: emp.middle_name || null,
        last_name: emp.last_name || null,
        role: role,
        designation: emp.designation || "Employee",
        department: dept,
        email: email,
        phone: phone,
        mobile_no: phone,
        contact: phone,
        location: emp.location || emp.branch_location || "Mumbai, IN",
        type: emp.employment_type || emp.type || "Full-time",
        employment_type: emp.employment_type || emp.type || "Full-time",
        joined: joinDate,
        joining_date: joinDate,
        status: emp.status || emp.employment_status || "Active",
        employment_status: emp.employment_status || emp.status || "Active",
        about: emp.about || "",
        profile_image: emp.profile_image || "",
        reporting_supervisor: emp.reporting_supervisor || emp.manager || null,
        gender: emp.gender || "",
        dob: emp.dob || "",
        marital_status: emp.marital_status || "",
        father_name: emp.father_name || "",
        mother_name: emp.mother_name || "",
        spouse_name: emp.spouse_name || "",
        family_contact: emp.family_contact || "",
        address1: emp.address1 || "",
        address2: emp.address2 || "",
        city: emp.city || "",
        state: emp.state || "",
        country: emp.country || "",
        pincode: emp.pincode || "",
        confirmation_due: emp.confirmation_due || "",
        confirmation_date: emp.confirmation_date || "",
        skill_level: emp.skill_level || "",
      };
    });

    // Deduplicate by unique emp_code / email
    const seenCodes = new Set();
    const seenEmails = new Set();
    const deduplicated = [];
    for (const item of formatted) {
      const codeKey = (item.emp_code || item.id || "").trim().toUpperCase();
      const emailKey = (item.email || "").trim().toLowerCase();
      if (codeKey && seenCodes.has(codeKey)) continue;
      if (emailKey && seenEmails.has(emailKey)) continue;
      if (codeKey) seenCodes.add(codeKey);
      if (emailKey) seenEmails.add(emailKey);
      deduplicated.push(item);
    }

    saveStoredEmployees(deduplicated);
    return deduplicated;
  }

  // Fallback to localStorage if API returned empty/error
  return getStoredEmployees();
}

export async function createEmployeeApi(payload) {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  const res = await fetch(`${API_BASE}/add-emp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`Server returned status ${res.status}. Please check your connection.`);
  }

  if (!res.ok) {
    const detail = data?.detail || data?.message || "Unable to create employee. Please try again.";
    const errorMsg = typeof detail === "string" ? detail : (Array.isArray(detail) ? detail.map((d) => d.msg || d.detail || JSON.stringify(d)).join(", ") : JSON.stringify(detail));
    throw new Error(errorMsg);
  }

  return data;
}

export async function fetchDepartmentsApi() {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  try {
    const res = await fetch(getApiUrl("/api/v1/admin/departments"), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.departments) && data.departments.length > 0) {
        return data.departments;
      }
    }
  } catch (err) {
    console.warn("Could not load departments from API:", err);
  }
  return ["Engineering", "Design", "Product", "Marketing", "Sales", "Finance", "Human Resources", "Operations"];
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
    await fetch(getApiUrl(`/api/v1/admin/users/${empCode}/role`), {
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

