import { createContext, useContext, useEffect, useCallback } from "react";

const STORAGE_KEY = "laesfera-theme";

const ThemeContext = createContext({
  theme: "light",
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  // Theme is permanently locked to light mode across the application
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem("hrms-theme");
    } catch {
      /* ignore */
    }
  }, []);

  const theme = "light";
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

