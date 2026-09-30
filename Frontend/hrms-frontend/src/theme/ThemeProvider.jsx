import { createContext, useContext, useEffect, useCallback } from "react";

const STORAGE_KEY = "laesfera-theme";

const ThemeContext = createContext({
  theme: "light",
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const theme = "light";

  // Force light mode permanently across all portals
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.dataset.theme = "light";
    document.documentElement.classList.remove("dark");
    if (document.body) {
      document.body.classList.remove("dark");
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, "light");
      window.localStorage.setItem("hrms-theme", "light");
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback(() => {}, []);
  const toggleTheme = useCallback(() => {}, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: false, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;

