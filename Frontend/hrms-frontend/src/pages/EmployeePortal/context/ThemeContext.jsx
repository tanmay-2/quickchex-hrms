// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - THEMECONTEXT.JSX
// Path: Frontend/hrms-frontend/src/pages/EmployeePortal/context/ThemeContext.jsx
// Purpose: Web portal page component managing 'ThemeContext' views, user interactions, and state.
// UI Components:
//   • <ThemeContext />
//   • <ThemeProvider />
// Key Functions & Handlers:
//   • useTheme()
// ==============================================================================

import React, { createContext, useContext, useEffect, useMemo } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    if (document.body) {
      document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem('hrms-theme', 'light');
      localStorage.setItem('laesfera-theme', 'light');
    } catch {}
  }, []);

  const value = useMemo(() => ({
    theme: 'light',
    isDark: false,
    toggleTheme: () => {}
  }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

