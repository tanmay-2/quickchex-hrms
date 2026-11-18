// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - USEIDLETIMEOUT.JS
// Path: Frontend/hrms-frontend/src/hooks/useIdleTimeout.js
// Purpose: Idle timeout hook (Disabled per user requirement for long-running sessions)
// ==============================================================================

/**
 * Idle Timeout Configuration
 * Set to null/disabled so users stay logged in for hours without session interruption.
 */
export const IDLE_TIMEOUT_MS = null;

/**
 * Custom hook that previously monitored user inactivity.
 * Retained as a safe no-op so callers (e.g. App.jsx) continue functioning without error.
 */
export function useIdleTimeout() {
  // Inactivity timeout has been completely disabled as requested.
  // Users will remain signed in until they explicitly click "Sign Out".
  return;
}

export default useIdleTimeout;
