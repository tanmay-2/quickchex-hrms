import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// 1. Tokens first - defines every colour, size and shadow.
import "./theme/tokens.css";

// 2. App (and with it, every page stylesheet).
import App from "./App.jsx";

// 3. Retrofit layer LAST so it overrides the old hardcoded page colours.
import "./theme/app-theme.css";
import "./styles/dashboard-theme.css";

import { ThemeProvider } from "./theme/ThemeProvider";
import FloatingThemeToggle from "./theme/FloatingThemeToggle";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <BrowserRouter>
      <App />
      <FloatingThemeToggle />
    </BrowserRouter>
  </ThemeProvider>
);
