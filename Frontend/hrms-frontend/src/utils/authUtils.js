/**
 * LA ESFERA HRMS — CENTRALIZED AUTHENTICATION & SSO UTILITIES
 * 
 * Supports:
 * - Real Microsoft Entra ID (Azure Active Directory) OAuth 2.0 / OpenID Connect
 * - Account selection with prompt="select_account"
 * - Microsoft Single Sign-Out (End-Session Endpoint) with account picker
 * - Standard HRMS Session lifecycle management
 */

import { getApiUrl } from "../services/apiClient";
import {
  STATIC_REDIRECT_URI,
  DEFAULT_AZURE_TENANT_ID,
  DEFAULT_AZURE_CLIENT_ID,
  DEFAULT_AZURE_AUTHORITY,
  DEFAULT_AZURE_SCOPES,
  MSAL_AUTH_CONFIG,
  PORTAL_ROLE_ROUTES,
  getPortalRouteForRole,
} from "../config/authConfig";

export {
  STATIC_REDIRECT_URI,
  DEFAULT_AZURE_TENANT_ID,
  DEFAULT_AZURE_CLIENT_ID,
  DEFAULT_AZURE_AUTHORITY,
  DEFAULT_AZURE_SCOPES,
  MSAL_AUTH_CONFIG,
  PORTAL_ROLE_ROUTES,
  getPortalRouteForRole,
};

/**
 * Clears all local HRMS authentication tokens, profiles, and cached credentials.
 */
export function clearHRMSSession() {
  if (typeof window === "undefined" || !window.localStorage) return;

  const authKeys = [
    "token",
    "authToken",
    "accessToken",
    "access_token",
    "role",
    "emp_code",
    "employee_code",
    "hrms_user_emp_code",
    "designation",
    "user",
    "userData",
    "user_name",
    "loginEmail",
    "profile_image",
    "manager_token",
    "manager_user",
    "auth_provider",
    "must_change_password",
    "remembered_user",
    "ms_auth_redirect_uri",
  ];

  authKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore individual removal errors
    }
  });

  // Clear any cached MSAL / Azure AD tokens from localStorage
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("msal.") || k.startsWith("msal_"))) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // Ignore MSAL cleanup errors
  }

  try {
    sessionStorage.clear();
  } catch {
    // Ignore storage errors
  }

  // Notify all listening components and contexts across tabs and portals
  try {
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("hrms-session-cleared"));
  } catch {
    // Ignore event dispatch errors
  }
}

/**
 * Generates the direct Microsoft Entra ID OAuth 2.0 authorization URL.
 * Prompts user with select_account so they can pick their account.
 */
export function getMicrosoftAuthorizeUrl(redirectUri = STATIC_REDIRECT_URI) {
  const tenantId = DEFAULT_AZURE_TENANT_ID || "common";
  const clientId = DEFAULT_AZURE_CLIENT_ID;
  const scope = encodeURIComponent(DEFAULT_AZURE_SCOPES.join(" "));
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_mode=query&scope=${scope}&prompt=select_account`;
}

/**
 * Initiates the centralized Microsoft Entra ID sign-in flow.
 * Shared by Employee, Manager, and Admin portals.
 * Always targets STATIC_REDIRECT_URI: "http://localhost:5173/login" in local dev.
 */
export async function initiateMicrosoftSSO({ redirectUri = STATIC_REDIRECT_URI } = {}) {
  if (typeof window === "undefined") return;

  // Persist the exact redirectUri in sessionStorage for verification
  sessionStorage.setItem("ms_auth_redirect_uri", redirectUri);

  let targetAuthUrl = "";
  try {
    const urlEndpoint = getApiUrl(
      `/api/v1/auth/sso/microsoft/url?redirect_uri=${encodeURIComponent(redirectUri)}`
    );
    const res = await fetch(urlEndpoint, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      targetAuthUrl = data?.auth_url;
    }
  } catch (networkErr) {
    console.warn("Backend SSO URL fetch failed, falling back to direct configuration:", networkErr);
  }

  // Resilient fallback if backend endpoint was unreachable
  if (!targetAuthUrl) {
    targetAuthUrl = getMicrosoftAuthorizeUrl(redirectUri);
  }

  window.location.href = targetAuthUrl;
  return targetAuthUrl;
}

/**
 * Generates the official Microsoft Entra ID sign-out URL.
 * Redirects to the Microsoft account-picker sign-out screen.
 */
export function getMicrosoftLogoutUrl(postLogoutRedirectUri = STATIC_REDIRECT_URI) {
  const targetRedirect = postLogoutRedirectUri || STATIC_REDIRECT_URI;
  const tenantId = DEFAULT_AZURE_TENANT_ID || "common";

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(
    targetRedirect
  )}`;
}

/**
 * Executes a full sign-out flow across all dashboards and portals.
 * If user signed in via Microsoft SSO, triggers Microsoft End-Session flow.
 */
export async function handleGlobalLogout({ navigate, redirectUri = STATIC_REDIRECT_URI, forceMicrosoftLogout = false } = {}) {
  const authProvider = typeof window !== "undefined" ? localStorage.getItem("auth_provider") : "";
  const isMicrosoftAuth = forceMicrosoftLogout || authProvider === "microsoft";

  // 1. Wipe local HRMS session data
  clearHRMSSession();

  const targetRedirect = redirectUri || STATIC_REDIRECT_URI;

  // 2. If signed in via Microsoft SSO, perform Microsoft single sign-out
  if (isMicrosoftAuth) {
    try {
      // Attempt to retrieve server-configured logout URL if backend is online
      const res = await fetch(
        getApiUrl(
          `/api/v1/auth/sso/microsoft/logout-url?redirect_uri=${encodeURIComponent(
            targetRedirect
          )}`
        ),
        { headers: { Accept: "application/json" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.logout_url) {
          window.location.href = data.logout_url;
          return;
        }
      }
    } catch {
      // Fallback to client-constructed URL
    }

    // Direct browser redirect to Microsoft account sign-out picker
    window.location.href = getMicrosoftLogoutUrl(targetRedirect);
    return;
  }

  // 3. Standard password/OTP user logout -> clean redirect to login page
  if (typeof window !== "undefined") {
    // Clear URL search params (e.g. ?dev_auth=admin) so protected routes don't re-seed dummy auth
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  if (typeof navigate === "function") {
    navigate("/login", { replace: true });
  } else if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/**
 * Stores authenticated HRMS session data into localStorage following standard conventions.
 */
export function storeHRMSSession(data, { provider = "standard" } = {}) {
  if (typeof window === "undefined" || !window.localStorage) return;

  const token =
    data?.access_token ||
    data?.accessToken ||
    data?.token ||
    data?.authToken ||
    data?.data?.access_token ||
    data?.data?.token;

  let role = (data?.role || data?.user?.role || data?.data?.role || "employee")
    .toString()
    .trim()
    .toLowerCase();

  const designation =
    data?.designation ||
    data?.user?.designation ||
    data?.data?.designation ||
    "";

  // Normalize Team Leader designation to teamleader role
  if (
    role === "employee" &&
    typeof designation === "string" &&
    (designation.toLowerCase().includes("team lead") ||
      designation.toLowerCase().includes("leader") ||
      designation.toLowerCase() === "tl")
  ) {
    role = "teamleader";
  }

  const empCode =
    data?.emp_code ||
    data?.user?.emp_code ||
    data?.data?.emp_code ||
    "";

  const email =
    data?.email ||
    data?.user?.email ||
    data?.data?.email ||
    "";

  const userObj = data?.user || {
    id: data?.id,
    emp_code: empCode,
    email,
    role,
    designation,
    first_name: data?.first_name || "",
    last_name: data?.last_name || "",
  };

  const resolvedName =
    userObj.name ||
    `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim() ||
    userObj.username ||
    empCode;

  const profileImg =
    data?.profile_image ||
    data?.profileImage ||
    data?.avatar ||
    data?.photo ||
    userObj.profile_image ||
    userObj.profileImage ||
    userObj.avatar ||
    "";

  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
  }

  localStorage.setItem("role", role);
  if (empCode) localStorage.setItem("emp_code", empCode);
  if (designation) localStorage.setItem("designation", designation);
  if (email) localStorage.setItem("loginEmail", email);
  if (resolvedName) localStorage.setItem("user_name", resolvedName);

  localStorage.setItem("user", JSON.stringify(userObj));
  localStorage.setItem("auth_provider", provider);

  if (profileImg) {
    localStorage.setItem("profile_image", profileImg);
  } else {
    localStorage.removeItem("profile_image");
  }

  if (role === "manager" || role === "admin") {
    if (token) localStorage.setItem("manager_token", token);
    localStorage.setItem("manager_user", JSON.stringify(userObj));
  }

  return { token, role, empCode, email, user: userObj };
}
