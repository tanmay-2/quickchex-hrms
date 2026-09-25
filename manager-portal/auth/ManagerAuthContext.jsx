import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const ManagerAuthContext = createContext(null);

const getUnifiedSession = () => {
  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("manager_token") ||
      null;

    const role = (localStorage.getItem("role") || "").trim().toLowerCase();
    const rawUser = localStorage.getItem("user") || localStorage.getItem("manager_user");

    let user = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser);
      } catch {
        user = null;
      }
    }

    if (token && role === "manager") {
      const name =
        user?.name ||
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
        "Manager User";

      const nameParts = name.split(" ").filter(Boolean);
      const initials =
        nameParts.length >= 2
          ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
          : nameParts[0]
          ? nameParts[0].slice(0, 2).toUpperCase()
          : "MG";

      const formattedUser = {
        ...user,
        id: user?.emp_code || user?.id || localStorage.getItem("emp_code") || "",
        name,
        email: user?.email || localStorage.getItem("loginEmail") || "",
        role: user?.designation || (role === "admin" ? "Administrator" : "Manager"),
        systemRole: role,
        department: user?.department || "Management",
        initials: user?.initials || initials,
        phone: user?.phone || user?.mobile_no || "",
        location: user?.branch_location || "Mumbai Office",
      };

      return { token, user: formattedUser, role };
    }
  } catch (err) {
    console.error("Error reading unified session for manager portal:", err);
  }

  return { token: null, user: null, role: null };
};

export const ManagerAuthProvider = ({ children }) => {
  const [session, setSession] = useState(getUnifiedSession);
  const [loading, setLoading] = useState(false);

  // Sync state on storage changes or route loads
  const syncSession = useCallback(() => {
    setSession(getUnifiedSession());
  }, []);

  useEffect(() => {
    syncSession();
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, [syncSession]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("role");
    localStorage.removeItem("emp_code");
    localStorage.removeItem("designation");
    localStorage.removeItem("user");
    localStorage.removeItem("manager_token");
    localStorage.removeItem("manager_user");
    sessionStorage.clear();
    setSession({ token: null, user: null, role: null });
    window.location.href = "/login";
  };

  const updateProfile = (data) => {
    setSession((prev) => {
      const updated = { ...(prev.user || {}), ...data };
      try {
        localStorage.setItem("user", JSON.stringify(updated));
        localStorage.setItem("manager_user", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to persist updated user profile:", err);
      }
      return { ...prev, user: updated };
    });
  };

  const value = {
    manager: session.user,
    token: session.token,
    role: session.role,
    isAuthenticated: Boolean(
      session.token && (session.role === "admin" || session.role === "manager")
    ),
    loading,
    logout,
    updateProfile,
    syncSession,
  };

  return (
    <ManagerAuthContext.Provider value={value}>
      {children}
    </ManagerAuthContext.Provider>
  );
};

export const useManagerAuth = () => {
  const context = useContext(ManagerAuthContext);
  if (!context) {
    throw new Error("useManagerAuth must be used within a ManagerAuthProvider");
  }
  return context;
};
