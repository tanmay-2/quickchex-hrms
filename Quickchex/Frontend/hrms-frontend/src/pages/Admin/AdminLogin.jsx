import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import logoIcon from "../../assets/img/laesfera_full_logo.png";
import "./AdminLogin.css";

const LOGIN_URL = 'https://quickchex-backend.onrender.com/api/v1/auth/login';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState(
    location.state?.email || ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [currentTime, setCurrentTime] = useState(
    new Date()
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const savedIdentifier = localStorage.getItem(
        "adminRememberedIdentifier"
      );

      if (savedIdentifier && !identifier) {
        setIdentifier(savedIdentifier);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage errors.
    }
  }, [identifier]);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [currentTime]);

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [currentTime]);

  const getErrorMessage = (data) => {
    if (!data) {
      return "Unable to sign in. Please check your credentials.";
    }

    if (typeof data === "string") {
      return data;
    }

    if (typeof data.detail === "string") {
      return data.detail;
    }

    if (Array.isArray(data.detail)) {
      return (
        data.detail
          .map((item) => item?.msg)
          .filter(Boolean)
          .join(", ") ||
        "Unable to sign in. Please try again."
      );
    }

    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof data.error === "string") {
      return data.error;
    }

    return "Invalid admin credentials. Please try again.";
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password", {
      state: {
        email: identifier,
        from: "admin-login",
      },
    });
  };

  const handleSSO = () => {
    setErrorMessage("");
    setSuccessMessage(
      "SSO sign-in is not configured yet."
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!identifier.trim()) {
      setErrorMessage(
        "Please enter your admin email or username."
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        "Please enter your password."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        LOGIN_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: identifier.trim(),
            email: identifier.trim(),
            password,
          }),
        }
      );

      const text = await response.text();

      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {
          detail: text,
        };
      }

      if (!response.ok) {
        setErrorMessage(
          getErrorMessage(data)
        );
        return;
      }

      /*
       * Preserve the existing OTP flow.
       * Do NOT store the final role/token here if your backend
       * intentionally completes authentication after OTP.
       */
      const emailForOtp =
        data.email ||
        data.username ||
        identifier.trim();

      setSuccessMessage(
        "Credentials verified. Sending you to verification..."
      );

      navigate("/otp", {
        state: {
          email: emailForOtp,
          from: "admin-login",
          adminLogin: true,
        },
      });
    } catch (error) {
      console.error(
        "Admin login error:",
        error
      );

      setErrorMessage(
        "Unable to connect to the authentication server."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-root">
      <div className="admin-login-bg-glow admin-login-bg-glow-one" />
      <div className="admin-login-bg-glow admin-login-bg-glow-two" />

      <div className="admin-login-shell">
        {/* =====================================================
            LEFT HERO
        ====================================================== */}
        <section className="admin-login-hero">
          <div className="admin-login-grid" />

          <div className="admin-login-hero-top">
            <div className="admin-login-brand">
              <div className="admin-login-brand-logo">
                <img
                  src={logoIcon}
                  alt="LA ESFERA"
                />
              </div>

              <div style={{ display: "none" }}>
                <div className="admin-login-brand-name">
                  LA ESFERA
                </div>

                <div className="admin-login-brand-role">
                  ADMIN PORTAL
                </div>
              </div>
            </div>

            <div className="admin-login-live-status">
              <span className="admin-login-live-dot" />
              <span>Admin systems online</span>
            </div>
          </div>

          <div className="admin-login-hero-copy">
            <div className="admin-login-eyebrow">
              <Sparkles size={13} />
              ENTERPRISE COMMAND CENTER
            </div>

            <h1>
              Manage.
              <br />
              <span>Monitor.</span>
              <br />
              Succeed.
            </h1>

            <p>
              Run your organization from one
              secure command center. Monitor
              people, attendance, payroll and
              operational insights in real time.
            </p>
          </div>

          {/* Digital globe */}
          <div className="admin-login-globe-wrap">
            <div className="admin-login-globe-halo" />

            <div className="admin-login-globe">
              <div className="admin-login-globe-line admin-login-globe-line-a" />
              <div className="admin-login-globe-line admin-login-globe-line-b" />
              <div className="admin-login-globe-line admin-login-globe-line-c" />
              <div className="admin-login-globe-grid" />
              <div className="admin-login-globe-core" />
            </div>

            <div className="admin-login-orbit admin-login-orbit-one" />
            <div className="admin-login-orbit admin-login-orbit-two" />
          </div>

          {/* Team */}
          <div className="admin-login-team">
            <div className="admin-login-platform">
              <div className="admin-login-platform-ring" />
              <div className="admin-login-platform-glow" />
            </div>

            <div className="admin-login-person admin-login-person-left">
              <div className="admin-login-person-head">
                <span className="admin-login-person-hair" />
                <span className="admin-login-person-eye left" />
                <span className="admin-login-person-eye right" />
              </div>

              <div className="admin-login-person-body">
                <div className="admin-login-person-badge">
                  ADMIN
                </div>
              </div>

              <div className="admin-login-person-arm admin-login-person-arm-left" />
              <div className="admin-login-person-arm admin-login-person-arm-right" />

              <div className="admin-login-person-leg admin-login-person-leg-left" />
              <div className="admin-login-person-leg admin-login-person-leg-right" />

              <div className="admin-login-person-shoe left" />
              <div className="admin-login-person-shoe right" />
            </div>

            <div className="admin-login-person admin-login-person-center">
              <div className="admin-login-person-head">
                <span className="admin-login-person-hair" />
                <span className="admin-login-person-eye left" />
                <span className="admin-login-person-eye right" />
              </div>

              <div className="admin-login-person-body">
                <div className="admin-login-person-badge">
                  HR
                </div>
              </div>

              <div className="admin-login-person-arm admin-login-person-arm-left" />
              <div className="admin-login-person-arm admin-login-person-arm-right" />

              <div className="admin-login-person-leg admin-login-person-leg-left" />
              <div className="admin-login-person-leg admin-login-person-leg-right" />

              <div className="admin-login-person-shoe left" />
              <div className="admin-login-person-shoe right" />
            </div>

            <div className="admin-login-person admin-login-person-right">
              <div className="admin-login-person-head">
                <span className="admin-login-person-hair" />
                <span className="admin-login-person-eye left" />
                <span className="admin-login-person-eye right" />
              </div>

              <div className="admin-login-person-body">
                <div className="admin-login-person-badge">
                  OPS
                </div>
              </div>

              <div className="admin-login-person-arm admin-login-person-arm-left" />
              <div className="admin-login-person-arm admin-login-person-arm-right" />

              <div className="admin-login-person-leg admin-login-person-leg-left" />
              <div className="admin-login-person-leg admin-login-person-leg-right" />

              <div className="admin-login-person-shoe left" />
              <div className="admin-login-person-shoe right" />
            </div>
          </div>

          {/* Floating insight cards */}
          <div className="admin-login-float-card admin-login-float-card-date">
            <div className="admin-login-float-icon">
              <CalendarDays size={18} />
            </div>

            <div>
              <span>Today</span>
              <strong>{formattedDate}</strong>
            </div>
          </div>

          <div className="admin-login-float-card admin-login-float-card-time">
            <div className="admin-login-float-icon">
              <Clock3 size={18} />
            </div>

            <div>
              <span>Current time</span>
              <strong>{formattedTime}</strong>
            </div>
          </div>

          <div className="admin-login-float-card admin-login-float-card-system">
            <div className="admin-login-float-icon admin-login-success">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <span>System status</span>
              <strong className="admin-login-green-text">
                Operational
              </strong>
            </div>
          </div>

          <div className="admin-login-float-card admin-login-float-card-control">
            <div className="admin-login-float-icon">
              <BarChart3 size={18} />
            </div>

            <div>
              <span>Management</span>
              <strong>Live insights</strong>
            </div>
          </div>

          <div className="admin-login-hero-footer">
            <div className="admin-login-feature">
              <div className="admin-login-feature-icon">
                <ShieldCheck size={17} />
              </div>

              <div>
                <strong>Secure Access</strong>
                <span>Protected admin controls</span>
              </div>
            </div>

            <div className="admin-login-feature">
              <div className="admin-login-feature-icon">
                <Activity size={17} />
              </div>

              <div>
                <strong>Real-time Insights</strong>
                <span>Monitor your organization</span>
              </div>
            </div>

            <div className="admin-login-feature">
              <div className="admin-login-feature-icon">
                <Building2 size={17} />
              </div>

              <div>
                <strong>Comprehensive Control</strong>
                <span>One command center</span>
              </div>
            </div>

            <div className="admin-login-feature">
              <div className="admin-login-feature-icon">
                <Users size={17} />
              </div>

              <div>
                <strong>Team Efficiency</strong>
                <span>Connected operations</span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            RIGHT ADMIN LOGIN
        ====================================================== */}
        <section className="admin-login-panel">
          <div className="admin-login-card">
            <div className="admin-login-card-top">
              <div className="admin-login-card-brand">
                <div className="admin-login-card-logo">
                  <img
                    src={logoIcon}
                    alt="LA ESFERA"
                  />
                </div>

                <div>
                  <span>
                    HR MANAGEMENT SYSTEM
                  </span>

                  <strong>
                    LA ESFERA
                  </strong>
                </div>
              </div>

              <div className="admin-login-secure-badge">
                <ShieldCheck size={14} />
                Secure &amp; Encrypted
              </div>
            </div>

            <div className="admin-login-form-header">
              <span className="admin-login-form-eyebrow">
                GOOD EVENING, ADMIN
              </span>

              <h2>
                Welcome back
              </h2>

              <p>
                Sign in to your admin portal
                and continue managing your
                organization.
              </p>
            </div>

            <div className="admin-login-divider">
              <span />
              <i />
              <span />
            </div>

            {errorMessage && (
              <div className="admin-login-alert admin-login-alert-error">
                <div className="admin-login-alert-icon">
                  !
                </div>

                <div>
                  <strong>
                    Authentication failed
                  </strong>

                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="admin-login-alert admin-login-alert-success">
                <CheckCircle2 size={17} />

                <p>{successMessage}</p>
              </div>
            )}

            <form
              className="admin-login-form"
              onSubmit={handleSubmit}
            >
              <label className="admin-login-field">
                <span className="admin-login-field-label">
                  Admin Email / Username
                </span>

                <div
                  className={`admin-login-input-wrap ${errorMessage &&
                      !identifier.trim()
                      ? "has-error"
                      : ""
                    }`}
                >
                  <Mail size={18} />

                  <input
                    type="text"
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(
                        event.target.value
                      );
                      setErrorMessage("");
                    }}
                    placeholder="admin@laesfera.co"
                    autoComplete="username"
                    disabled={isSubmitting}
                  />

                  <span className="admin-login-input-status">
                    <MapPin size={13} />
                  </span>
                </div>
              </label>

              <label className="admin-login-field">
                <span className="admin-login-field-label">
                  Password
                </span>

                <div
                  className={`admin-login-input-wrap ${errorMessage &&
                      !password
                      ? "has-error"
                      : ""
                    }`}
                >
                  <LockKeyhole size={18} />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) => {
                      setPassword(
                        event.target.value
                      );
                      setErrorMessage("");
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />

                  <button
                    type="button"
                    className="admin-login-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </label>

              <div className="admin-login-options">
                <label className="admin-login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    disabled={isSubmitting}
                  />

                  <span className="admin-login-custom-checkbox">
                    <CheckCircle2 size={11} />
                  </span>

                  <span>
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  className="admin-login-forgot"
                  onClick={
                    handleForgotPassword
                  }
                  disabled={isSubmitting}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="admin-login-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="admin-login-spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="admin-login-or">
                <span />
                <small>OR</small>
                <span />
              </div>

              <button
                type="button"
                className="admin-login-sso"
                onClick={handleSSO}
                disabled={isSubmitting}
              >
                <KeyRound size={17} />
                SSO Login
              </button>
            </form>

            <div className="admin-login-card-footer">
              <div className="admin-login-footer-secure">
                <span className="admin-login-footer-dot" />
                <ShieldCheck size={14} />
                <span>
                  System secure
                </span>
              </div>

              <span className="admin-login-footer-separator">
                |
              </span>

              <span>
                Protected administrator access
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminLogin;