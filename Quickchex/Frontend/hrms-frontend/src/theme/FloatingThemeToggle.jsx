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
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();

  if (!NO_SIDEBAR.includes(pathname)) return null;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="app-theme-toggle"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <PiSunDuotone /> : <PiMoonDuotone />}
    </button>
  );
}
