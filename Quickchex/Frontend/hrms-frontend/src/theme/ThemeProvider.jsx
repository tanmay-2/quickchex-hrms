import { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "laesfera-theme";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

/**
 * Reads the theme the user last chose. Falls back to whatever their OS is
 * set to, so a first-time visitor on a dark machine gets dark straight away.
 */
function getInitialTheme() {
  if (typeof window === "undefined") return "light";

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* private mode / storage disabled - fall through to the OS setting */
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  // The single place the theme is applied. Every token in tokens.css hangs
  // off [data-theme], so setting this attribute re-themes the entire app.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* not fatal - the theme still applies for this session */
    }
  }, [theme]);

  // Follow the OS if the user has never made an explicit choice.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const onChange = (event) => {
      let hasChosen = false;
      try {
        hasChosen = Boolean(window.localStorage.getItem(STORAGE_KEY));
      } catch {
        hasChosen = false;
      }
      if (!hasChosen) setThemeState(event.matches ? "dark" : "light");
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next === "dark" ? "dark" : "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;
