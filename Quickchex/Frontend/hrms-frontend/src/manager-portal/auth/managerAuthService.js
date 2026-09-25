/* ==========================================================================
   MANAGER AUTH SERVICE
   Handles manager login, OTP verification, demo accounts & session persistence
   Keys used: manager_token, manager_user (Isolated from admin/employee auth)
   ========================================================================== */

const STORAGE_KEYS = {
  TOKEN: "manager_token",
  USER: "manager_user",
  REMEMBER: "manager_remember_email",
};

const API_BASE = (
  typeof window !== "undefined" &&
  window.location.hostname &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? `http://${window.location.hostname}:8000`
    : (import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000")
).replace(/\/$/, "");

export const managerAuthService = {
  login: async (email, password, rememberMe = false) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error("Email and password are required.");
    }

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER, cleanEmail);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBER);
    }

    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Authentication failed. Please check your credentials.");
    }

    localStorage.setItem("pending_otp_email", cleanEmail);
    return {
      success: true,
      requiresOtp: true,
      email: data.email || cleanEmail,
      emp_code: data.emp_code,
      message: data.message || "6-digit verification code sent to your registered email.",
    };
  },

  verifyOtp: async (email, otp) => {
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      throw new Error("Invalid 6-digit OTP code.");
    }

    const cleanEmail = (email || localStorage.getItem("pending_otp_email") || "").trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error("Session expired. Please log in again.");
    }

    const res = await fetch(`${API_BASE}/api/v1/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Invalid or expired OTP code.");
    }

    const token = data.access_token;
    const user = data.user || {
      id: data.emp_code,
      emp_code: data.emp_code,
      email: cleanEmail,
      role: data.role,
      designation: data.designation,
    };

    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("role", data.role || "manager");
    localStorage.setItem("emp_code", data.emp_code || "");
    localStorage.setItem("user", JSON.stringify(user));

    return { success: true, token, user };
  },

  getStoredSession: () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const userRaw = localStorage.getItem(STORAGE_KEYS.USER);
      if (token && userRaw) {
        return { token, user: JSON.parse(userRaw) };
      }
    } catch {
      // ignore
    }
    return { token: null, user: null };
  },

  getRememberedEmail: () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.REMEMBER) || "";
    } catch {
      return "";
    }
  },

  updateProfile: (updatedData) => {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}");
      const next = { ...current, ...updatedData };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next));
      return next;
    } catch {
      return updatedData;
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },
};
