import React, { createContext, useContext, useEffect, useMemo } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {}
});

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    try {
      localStorage.removeItem('hrms-theme');
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({
    theme: 'light',
    isDark: false,
    toggleTheme: () => {}
  }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

