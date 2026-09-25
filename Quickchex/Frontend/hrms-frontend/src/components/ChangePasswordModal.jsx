import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import "./ChangePasswordModal.css";

const fetchWithFallback = async (endpointPath, payload) => {
  const primaryHost = (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? `${window.location.hostname}:8000` : '127.0.0.1:8000';
  const hosts = [primaryHost, "127.0.0.1:8000", "localhost:8000"];
  const uniqueHosts = [...new Set(hosts)];
  let lastErr;
  for (const host of uniqueHosts) {
    try {
      const url = `http://${host}${endpointPath}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return res;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
};

const ChangePasswordModal = ({
  isOpen = true,
  targetIdentifier = "",
  onSuccess = null
}) => {
  const navigate = useNavigate();

  // Resolve identifier from props or fallback to localStorage
  const identifier =
    targetIdentifier ||
    localStorage.getItem("loginEmail") ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u.email || u.emp_code || "";
      } catch {
        return "";
      }
    })() ||
    localStorage.getItem("emp_code") ||
    "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Enforce non-dismissible behaviour: block Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage("");

    const resolvedId =
      identifier ||
      targetIdentifier ||
      localStorage.getItem("loginEmail") ||
      (() => {
        try {
          const u = JSON.parse(localStorage.getItem("user") || "{}");
          return u.email || u.emp_code || "";
        } catch {
          return "";
        }
      })() ||
      localStorage.getItem("emp_code") ||
      "";

    if (!resolvedId) {
      const msg = "Account email not found. Please log in again.";
      setErrorMessage(msg);
      toast.error(msg, { position: "top-center" });
      return;
    }

    if (!newPassword.trim()) {
      const msg = "Please enter your new password.";
      setErrorMessage(msg);
      toast.error(msg, { position: "top-center" });
      return;
    }

    if (newPassword.length < 6) {
      const msg = "Password must be at least 6 characters long.";
      setErrorMessage(msg);
      toast.error(msg, { position: "top-center" });
      return;
    }

    if (newPassword === "Welcome@123") {
      const msg = "New password cannot be default password 'Welcome@123'.";
      setErrorMessage(msg);
      toast.error(msg, { position: "top-center" });
      return;
    }

    if (!confirmPassword.trim()) {
      const msg = "Please confirm your new password.";
      setErrorMessage(msg);
      toast.error(msg, { position: "top-center" });
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = "Passwords do not match.";
      setErrorMessage(msg);
      toast.error(msg, { position: "top-center" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithFallback("/api/v1/auth/recover-password", {
        email: resolvedId,
        new_password: newPassword,
      });

      const data = await response.json();

      if (!response.ok) {
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : data?.message || "Failed to update password. Please try again.";
        setErrorMessage(detail);
        toast.error(detail, { position: "top-center" });
        return;
      }

      // Successful password change
      localStorage.setItem("must_change_password", "false");
      window.dispatchEvent(new Event("storage"));
      toast.success("Password updated successfully!", {
        position: "top-center",
      });

      setNewPassword("");
      setConfirmPassword("");

      if (onSuccess) {
        onSuccess(data);
      } else {
        // Default fallback if no custom callback passed
        const role = (localStorage.getItem("role") || "").toLowerCase();
        if (role === "admin") {
          navigate("/dashboard", { replace: true });
        } else if (role === "manager") {
          navigate("/manager/dashboard", { replace: true });
        } else if (role === "teamleader") {
          navigate("/dashboard_tl", { replace: true });
        } else {
          navigate("/dashboard_emp", { replace: true });
        }
      }
    } catch (err) {
      console.error("Change password error:", err);
      const msg = "Unable to connect to server. Please try again.";
      setErrorMessage(msg);
      toast.error(msg, { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="cpm-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <Toaster
        position="top-center"
        reverseOrder={false}
        containerStyle={{ zIndex: 1000000 }}
      />
      <div
        className="cpm-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <form className="cpm-form" onSubmit={handleSubmit}>
          {/* New Password Input */}
          <div className="cpm-field">
            <label className="cpm-label" htmlFor="cpm-new-password">
              NEW PASSWORD
            </label>
            <div className="cpm-input-wrapper">
              <input
                id="cpm-new-password"
                type={showNewPassword ? "text" : "password"}
                className="cpm-input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrorMessage("");
                }}
                disabled={loading}
                autoFocus
              />
              <span className="cpm-input-icon">
                <Lock size={17} />
              </span>
              <button
                type="button"
                className="cpm-toggle-btn"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="cpm-field">
            <label className="cpm-label" htmlFor="cpm-confirm-password">
              CONFIRM PASSWORD
            </label>
            <div className="cpm-input-wrapper">
              <input
                id="cpm-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                className="cpm-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMessage("");
                }}
                disabled={loading}
              />
              <span className="cpm-input-icon">
                <KeyRound size={17} />
              </span>
              <button
                type="button"
                className="cpm-toggle-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="cpm-error-banner">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            className="cpm-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="cpm-spinner" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify and Continue</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
