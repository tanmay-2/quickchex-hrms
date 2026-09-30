import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Fingerprint,
} from "lucide-react";
import { useManagerAuth } from "../../auth/ManagerAuthContext";
import { managerAuthService } from "../../auth/managerAuthService";
import { ManagerModal } from "../../components/ManagerModal";
import logo from "../../../assets/img/logo.png";
import leftHeroImage from "../../../assets/img/manager-login-left-hd.png";
import { managerToast } from "../../components/ManagerToast";
import "./ManagerLoginPage.css";

export const ManagerLoginPage = () => {
  const navigate = useNavigate();
  const { login, loading } = useManagerAuth();

  const [email, setEmail] = useState(
    () => managerAuthService.getRememberedEmail() || ""
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      managerToast.error("Please enter your email and password.", { title: "Login Required" });
      return;
    }
    try {
      const res = await login(email, password, rememberMe);
      managerToast.success(res.message || "OTP code sent to your email!", { title: "OTP Dispatched" });
      navigate("/manager/otp");
    } catch (err) {
      managerToast.error(err.message || "Invalid credentials.", { title: "Authentication Failed" });
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      managerToast.error("Please provide your registered manager email.", { title: "Email Required" });
      return;
    }
    managerToast.success("Password reset instructions sent to " + forgotEmail, { title: "Reset Email Sent" });
    setForgotModalOpen(false);
    setForgotEmail("");
  };

  // Format date like the reference: "Thursday, 27 Aug 2024"
  const formattedDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mpl-root">

      {/* ========== LEFT SPLIT PANEL ========== */}
      <div className="mpl-left">
        <img
          src={leftHeroImage}
          alt="LA ESFERA Manager Portal - Lead, Track, Approve, Empower"
          className="mpl-left-hero-img"
        />
      </div>

      {/* ========== RIGHT SPLIT PANEL ========== */}
      <div className="mpl-right">
        {/* Subtle decorative background contours */}
        <div className="mpl-right-bg-waves" aria-hidden="true">
          <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="460" cy="90" r="140" stroke="#7C3AED" strokeOpacity="0.05" strokeWidth="1.2" />
            <circle cx="460" cy="90" r="200" stroke="#7C3AED" strokeOpacity="0.04" strokeWidth="1.2" />
            <circle cx="460" cy="90" r="260" stroke="#7C3AED" strokeOpacity="0.03" strokeWidth="1.2" />
            <circle cx="460" cy="90" r="330" stroke="#7C3AED" strokeOpacity="0.025" strokeWidth="1.2" />
            <circle cx="460" cy="90" r="400" stroke="#7C3AED" strokeOpacity="0.02" strokeWidth="1.2" />
          </svg>
        </div>

        {/* Login Card */}
        <div className="mpl-card">
          {/* Card Top Bar: Logo + Brand + Manager Access Badge */}
          <div className="mpl-card-topbar">
            <div className="mpl-card-brand">
              <div className="mpl-card-logo-box">
                <img src={logo} alt="LA ESFERA" className="mpl-card-logo-img" />
              </div>
              <div className="mpl-card-brand-text">
                <span className="mpl-card-brand-name">LA ESFERA</span>
                <span className="mpl-card-brand-tag">HR MANAGEMENT SYSTEM</span>
              </div>
            </div>

            <div className="mpl-manager-badge">
              <Shield size={14} strokeWidth={2.2} className="mpl-manager-badge-icon" />
              <span>Manager Access</span>
            </div>
          </div>

          {/* Welcome Heading */}
          <div className="mpl-card-welcome">
            <div className="mpl-card-welcome-label">WELCOME BACK</div>
            <h1 className="mpl-card-title">
              Manager <span className="mpl-card-title-accent">Portal</span>
            </h1>
            <p className="mpl-card-subtitle">
              Sign in to manage your team, attendance and approvals.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mpl-form">
            {/* Email or Username */}
            <div className="mpl-field-group">
              <label className="mpl-field-label">Email or Username</label>
              <div className="mpl-field-box">
                <Mail size={18} className="mpl-field-icon" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@laesfera.co"
                  className="mpl-field-input"
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    boxShadow: "none",
                    borderRadius: "0",
                    padding: "0",
                    margin: "0",
                    width: "100%",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="mpl-field-group">
              <div className="mpl-field-label-row">
                <label className="mpl-field-label">Password</label>
                <button
                  type="button"
                  className="mpl-forgot-link"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotModalOpen(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="mpl-field-box">
                <Lock size={18} className="mpl-field-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mpl-field-input mpl-field-password"
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    boxShadow: "none",
                    borderRadius: "0",
                    padding: "0",
                    margin: "0",
                    width: "100%",
                  }}
                />
                <button
                  type="button"
                  className="mpl-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label className="mpl-remember-row">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mpl-checkbox-native"
              />
              <span className={`mpl-custom-checkbox ${rememberMe ? "checked" : ""}`}>
                {rememberMe && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="mpl-remember-text">Remember me</span>
            </label>

            {/* Submit: Continue to OTP */}
            <button type="submit" disabled={loading} className="mpl-submit-btn">
              <span>{loading ? "Verifying..." : "Continue to OTP"}</span>
              <ArrowRight size={18} className="mpl-submit-arrow" />
            </button>
          </form>

          {/* OR Divider */}
          <div className="mpl-or-divider">
            <span className="mpl-or-line" />
            <span className="mpl-or-text">OR</span>
            <span className="mpl-or-line" />
          </div>

          {/* SSO Login Button */}
          <button
            type="button"
            className="mpl-sso-btn"
            onClick={() => managerToast.info("SSO authentication connected to corporate IDP", { title: "SSO Login" })}
          >
            <Fingerprint size={19} className="mpl-sso-icon" />
            <span>Sign in with SSO</span>
          </button>

          {/* Card Footer: System Secure | Date */}
          <div className="mpl-card-footer">
            <span className="mpl-footer-secure">
              <span className="mpl-footer-dot" />
              System Secure
            </span>
            <span className="mpl-footer-divider">|</span>
            <span className="mpl-footer-date">{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ManagerModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Reset Manager Password"
        subtitle="Enter your official manager email to receive password reset instructions."
        footer={
          <>
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              style={{
                padding: "9px 18px",
                borderRadius: "10px",
                border: "1px solid #E5E7EB",
                background: "#FFFFFF",
                color: "#4B5563",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleForgotSubmit}
              style={{
                padding: "9px 20px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
              }}
            >
              Send Reset Link
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Work Email</label>
          <input
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="manager@laesfera.co"
            style={{
              padding: "11px 14px",
              borderRadius: "10px",
              border: "1.5px solid #E5E7EB",
              fontSize: "14px",
              outline: "none",
              width: "100%",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>
      </ManagerModal>
    </div>
  );
};
