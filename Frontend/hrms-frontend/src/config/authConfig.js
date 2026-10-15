/**
 * ==============================================================================
 * LA ESFERA HRMS — CENTRALIZED MICROSOFT ENTRA ID / AZURE AD AUTHENTICATION CONFIG
 * ==============================================================================
 * 
 * Single source of truth for:
 * 1. Employee Portal
 * 2. Manager Portal
 * 3. Admin Portal
 * 
 * NON-NEGOTIABLE ARCHITECTURE:
 * All portals share ONE static Microsoft redirect URI & post-logout URI during local development:
 *   http://localhost:5173/login
 * 
 * Portal redirection occurs dynamically AFTER backend identity & role resolution:
 *   - Admin        -> /dashboard
 *   - Manager      -> /manager/dashboard
 *   - Team Leader  -> /dashboard_tl
 *   - Employee     -> /dashboard_emp
 */

// Centralized static redirect URI for local development
export const STATIC_LOCAL_REDIRECT_URI = "http://localhost:5173/login";

// Resolved redirect URI: Strictly http://localhost:5173/login for local dev,
// allows environment variable override only in non-localhost production environments.
export const STATIC_REDIRECT_URI = (() => {
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "0.0.0.0";
    if (isLocalhost) {
      return STATIC_LOCAL_REDIRECT_URI;
    }
  }
  return import.meta.env?.VITE_AZURE_REDIRECT_URI || STATIC_LOCAL_REDIRECT_URI;
})();

export const DEFAULT_AZURE_TENANT_ID =
  import.meta.env?.VITE_AZURE_TENANT_ID || "b292bf8e-4b06-4865-b248-a1d099b8c151";

export const DEFAULT_AZURE_CLIENT_ID =
  import.meta.env?.VITE_AZURE_CLIENT_ID || "72ac0ee8-00ed-431c-99c2-3c0a5a803046";

export const DEFAULT_AZURE_AUTHORITY =
  `https://login.microsoftonline.com/${DEFAULT_AZURE_TENANT_ID}`;

export const DEFAULT_AZURE_SCOPES = ["User.Read", "openid", "profile", "email"];

/**
 * Standard MSAL-compliant configuration structure for LA ESFERA HRMS.
 */
export const MSAL_AUTH_CONFIG = {
  auth: {
    clientId: DEFAULT_AZURE_CLIENT_ID,
    authority: DEFAULT_AZURE_AUTHORITY,
    redirectUri: STATIC_REDIRECT_URI,
    postLogoutRedirectUri: STATIC_REDIRECT_URI,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  scopes: DEFAULT_AZURE_SCOPES,
};

/**
 * Authoritative destination paths for each HRMS role.
 */
export const PORTAL_ROLE_ROUTES = {
  admin: "/dashboard",
  manager: "/manager/dashboard",
  teamleader: "/dashboard_tl",
  employee: "/dashboard_emp",
};

/**
 * Resolves the destination portal route based on the database-authorized role.
 */
export function getPortalRouteForRole(role) {
  const cleanRole = (role || "").toString().trim().toLowerCase();
  return PORTAL_ROLE_ROUTES[cleanRole] || PORTAL_ROLE_ROUTES.employee;
}
