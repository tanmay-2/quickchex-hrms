// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - FLOATINGTHEMETOGGLE.JSX
// Path: Frontend/hrms-frontend/src/theme/FloatingThemeToggle.jsx
// Purpose: UI / application module.
// UI Components:
//   • <NO_SIDEBAR />
//   • <FloatingThemeToggle />
// ==============================================================================

import { useLocation } from "react-router-dom";
import { useTheme } from "./ThemeProvider";
import { PiMoonDuotone, PiSunDuotone } from "react-icons/pi";

// Pages with no sidebar. The admin sidebar carries its own switch, so the
// floating button would be a duplicate everywhere else - and on the login
// screen it lands on top of the footer links.
const NO_SIDEBAR = ["/login", "/otp", "/reset-password"];

/**
 * Only appears on screens that have no sidebar of their own, so the theme
 * is still reachable before sign-in without covering page content.
 */
export default function FloatingThemeToggle() {
  return null;
}

