import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clearHRMSSession } from "../utils/authUtils";

/**
 * Global Inactivity / Idle Timeout Configuration
 * Default: 2 minutes (120,000 ms)
 */
export const IDLE_TIMEOUT_MS = 2 * 60 * 1000;
const STORAGE_KEY = "hrms_last_activity";
const THROTTLE_INTERVAL_MS = 1000; // Throttles event recording to 1s
const CHECK_INTERVAL_MS = 5000; // Heartbeat check every 5s

/**
 * Custom hook that monitors user activity across the application.
 * Automatically signs out and redirects to /login if user is idle for more than 2 minutes.
 * Synchronizes across multiple browser tabs via localStorage.
 */
export function useIdleTimeout() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastRecordedTimeRef = useRef(Date.now());

  // Public/Auth routes where idle timeout should not run
  const isAuthFlowPage =
    location.pathname === "/login" ||
    location.pathname === "/otp" ||
    location.pathname === "/reset-password";

  const handleLogout = useCallback(() => {
    const hasToken =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("manager_token");

    if (!hasToken) return;

    console.warn("[Security] User inactive for > 2 minutes. Signing out automatically...");
    
    // Clear all session tokens
    clearHRMSSession();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    // Navigate to login with reason so the user is informed
    navigate("/login?reason=idle_timeout", { replace: true });
  }, [navigate]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastRecordedTimeRef.current >= THROTTLE_INTERVAL_MS) {
      lastRecordedTimeRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const hasToken =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("manager_token");

    // Do not run tracker if unauthenticated or on login/otp screen
    if (isAuthFlowPage || !hasToken) {
      return;
    }

    // Initialize activity timestamp
    const storedLast = Number(localStorage.getItem(STORAGE_KEY) || Date.now());
    lastRecordedTimeRef.current = Math.max(storedLast, Date.now());
    try {
      localStorage.setItem(STORAGE_KEY, String(lastRecordedTimeRef.current));
    } catch {}

    // Event listeners for user interaction
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
      "wheel",
    ];

    events.forEach((evt) => {
      window.addEventListener(evt, updateActivity, { passive: true });
    });

    // Check on tab focus or visibility change (e.g. laptop wake or returning to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const lastActive = Math.max(
          lastRecordedTimeRef.current,
          Number(localStorage.getItem(STORAGE_KEY) || 0)
        );
        if (now - lastActive >= IDLE_TIMEOUT_MS) {
          handleLogout();
          return;
        }
        updateActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // Cross-tab synchronization via storage event
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        lastRecordedTimeRef.current = Number(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Heartbeat check interval
    const intervalId = setInterval(() => {
      const now = Date.now();
      const lastActive = Math.max(
        lastRecordedTimeRef.current,
        Number(localStorage.getItem(STORAGE_KEY) || 0)
      );

      if (now - lastActive >= IDLE_TIMEOUT_MS) {
        handleLogout();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, updateActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [isAuthFlowPage, updateActivity, handleLogout, location.pathname]);
}
