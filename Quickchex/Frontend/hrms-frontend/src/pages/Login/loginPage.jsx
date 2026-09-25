import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import "./loginPage.css";

import logoIcon from "../../assets/img/logo.png";
import heroLogo from "../../assets/img/laesfera_logo_white.png";
const MASTER_REFERENCE = "/login-master-reference.png?v=" + new Date().getTime();

const getApiBaseUrl = () => {
  const envUrl = import.meta.env?.VITE_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    let host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return `http://${host}:8000`;
  }
  return "https://quickchex-backend.onrender.com";
};

/* =========================================================
   ICONS
   ========================================================= */

const MailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="14" rx="3" />
    <path d="m5 7 7 5.3L19 7" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="10" width="14" height="10" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

const EyeIcon = ({ hidden }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {hidden ? (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.5 10.5a2.1 2.1 0 0 0 3 3" />
        <path d="M6.1 6.1C4.2 7.5 3 9.4 2.2 12c1.3 2.4 4.7 7 9.8 7 1.8 0 3.5-.5 5-1.4" />
        <path d="M9.9 5.2c.7-.1 1.4-.2 2.1-.2 5.1 0 8.5 4.6 9.8 7-.5.9-1.6 2.4-3.3 3.8" />
      </>
    ) : (
      <>
        <path d="M2.2 12C3.5 9.6 6.9 5 12 5s8.5 4.6 9.8 7c-1.3 2.4-4.7 7-9.8 7s-8.5-4.6-9.8-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 19 6v5.5c0 4.4-2.8 7.8-7 9.5-4.2-1.7-7-5.1-7-9.5V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h13" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

const readResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      detail: text,
    };
  }
};

const getErrorMessage = (data) => {
  if (!data) {
    return "Unable to sign in. Please try again.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    const messages = data.detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item?.msg || item?.message || "";
      })
      .filter(Boolean);

    return (
      messages.join(", ") ||
      "Invalid login details. Please check your credentials."
    );
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  return "Invalid credentials. Please try again.";
};

/* =========================================================
   LOGIN PAGE
   ========================================================= */

const LoginPage = () => {
  const navigate = useNavigate();

  /* -------------------------------------------------------
     FORM
     ------------------------------------------------------- */

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /* -------------------------------------------------------
     UI
     ------------------------------------------------------- */

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });

  const [shake, setShake] = useState(false);

  /* -------------------------------------------------------
     CLOCK
     ------------------------------------------------------- */

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /* -------------------------------------------------------
     THEME ISOLATION (Guarantee Light Theme on Login)
     ------------------------------------------------------- */

  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    document.body.classList.remove("dark");

    return () => {
      if (prevTheme && prevTheme !== "light") {
        root.setAttribute("data-theme", prevTheme);
      }
    };
  }, []);

  /* -------------------------------------------------------
     REMEMBERED LOGIN
     ------------------------------------------------------- */

  useEffect(() => {
    try {
      const remembered =
        localStorage.getItem("rememberLogin");

      const rememberedEmail =
        localStorage.getItem("rememberedLoginEmail");

      if (
        remembered === "true" &&
        rememberedEmail
      ) {
        setRememberMe(true);
        setEmail(rememberedEmail);
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);

  /* -------------------------------------------------------
     FORMATTED CLOCK
     ------------------------------------------------------- */

  const formattedTime = useMemo(
    () =>
      now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [now]
  );

  const formattedDate = useMemo(
    () =>
      now.toLocaleDateString([], {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [now]
  );

  /* Dynamic Date — DD MMM, YYYY  e.g. "18 Sep, 2026" */
  const dynamicHeroDate = useMemo(() => {
    const raw = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    // en-GB gives "18 Sept 2026" — normalise to "18 Sep, 2026"
    const parts = raw.split(' ');
    if (parts.length === 3) {
      const mon = parts[1].length > 3 ? parts[1].slice(0, 3) : parts[1];
      return `${parts[0]} ${mon}, ${parts[2]}`;
    }
    return raw;
  }, [now]);

  /* Dynamic Time — hh:mm:ss AM/PM  e.g. "12:01:25 PM" */
  const dynamicHeroTime = useMemo(() =>
    now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    , [now]);


  /* =======================================================
     SHAKE
     ======================================================= */

  const triggerShake = () => {
    setShake(false);

    window.requestAnimationFrame(() => {
      setShake(true);

      window.setTimeout(() => {
        setShake(false);
      }, 520);
    });
  };

  /* =======================================================
     CLEAR FIELD ERROR
     ======================================================= */

  const clearError = (field) => {
    setErrors((previous) => ({
      ...previous,
      [field]: "",
      general: "",
    }));
  };

  /* =======================================================
     LOGIN
     ======================================================= */

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrors({
      email: "",
      password: "",
      general: "",
    });

    const cleanEmail = email.trim();

    let validationFailed = false;

    if (!cleanEmail) {
      setErrors((previous) => ({
        ...previous,
        email: "Email or Employee ID is required.",
      }));

      validationFailed = true;
    }

    if (!password) {
      setErrors((previous) => ({
        ...previous,
        password: "Password is required.",
      }));

      validationFailed = true;
    }

    if (validationFailed) {
      triggerShake();
      return;
    }

    setLoading(true);

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 120000);

    try {
      let response;
      let data;

      const loginEndpoint = `${getApiBaseUrl()}/api/v1/auth/login`;

      /* ===================================================
         REQUEST 1 — JSON
         =================================================== */

      response = await fetch(loginEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
        signal: controller.signal,
      });

      data = await readResponse(response);

      /* ===================================================
         REQUEST 2 — FORM FALLBACK
         =================================================== */

      if (response.status === 422) {
        const formData = new URLSearchParams();

        formData.append(
          "username",
          cleanEmail
        );

        formData.append(
          "password",
          password
        );

        response = await fetch(loginEndpoint, {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: formData.toString(),
          signal: controller.signal,
        });

        data = await readResponse(response);
      }

      window.clearTimeout(timeoutId);

      /* ===================================================
         FAILED LOGIN
         =================================================== */

      if (!response.ok) {
        const message =
          getErrorMessage(data);

        setErrors({
          email: "",
          password: "",
          general: message,
        });

        triggerShake();

        return;
      }

      /* ===================================================
         SUCCESS
         =================================================== */

      const token =
        data?.access_token ||
        data?.accessToken ||
        data?.token ||
        data?.authToken ||
        data?.data?.access_token ||
        data?.data?.token;

      const role =
        data?.role ??
        data?.user?.role ??
        data?.data?.role ??
        "";

      const designation =
        data?.designation ??
        data?.user?.designation ??
        data?.data?.designation ??
        "";

      const empCode =
        data?.emp_code ??
        data?.user?.emp_code ??
        data?.data?.emp_code ??
        "";

      /* ===================================================
         SAVE AUTH DATA
         =================================================== */

      if (token) {
        localStorage.setItem(
          "token",
          token
        );

        localStorage.setItem(
          "authToken",
          token
        );
      }

      if (data?.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
        const resolvedName =
          data.user.name ||
          `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() ||
          data.user.username ||
          data.emp_code ||
          "";
        if (resolvedName) {
          localStorage.setItem("user_name", resolvedName);
        }
      }

      let finalRole =
        String(role).toLowerCase();

      if (
        finalRole === "employee" &&
        typeof designation === "string" &&
        designation
          .toLowerCase()
          .includes("team lead")
      ) {
        finalRole = "teamleader";
      }

      localStorage.setItem(
        "role",
        finalRole
      );

      localStorage.setItem(
        "designation",
        designation
      );

      localStorage.setItem(
        "emp_code",
        empCode
      );

      const resolvedEmail = data?.email || cleanEmail;

      localStorage.setItem(
        "loginEmail",
        resolvedEmail
      );

      /* ===================================================
         REMEMBER ME
         =================================================== */

      if (rememberMe) {
        localStorage.setItem(
          "rememberLogin",
          "true"
        );

        localStorage.setItem(
          "rememberedLoginEmail",
          cleanEmail
        );
      } else {
        localStorage.removeItem(
          "rememberLogin"
        );

        localStorage.removeItem(
          "rememberedLoginEmail"
        );
      }

      /* ===================================================
         FIRST-TIME / DEFAULT PASSWORD (BEFORE OTP)
         =================================================== */

      if (data?.must_change_password) {
        localStorage.setItem("must_change_password", "true");
        setPendingEmail(resolvedEmail);
        setShowChangePasswordModal(true);
        setLoading(false);
        return;
      }

      /* ===================================================
         OTP FLOW
         =================================================== */

      navigate("/otp", {
        state: {
          email: resolvedEmail,
        },
        replace: true,
      });
    } catch (error) {
      window.clearTimeout(timeoutId);

      console.error(
        "Login error:",
        error
      );

      let message =
        "Unable to connect to the server.";

      if (
        error?.name ===
        "AbortError"
      ) {
        message =
          "The request timed out. Please try again.";
      } else if (
        error instanceof TypeError
      ) {
        message =
          "Unable to connect to the backend. Please make sure the backend server is running.";
      } else if (error?.message) {
        message =
          error.message;
      }

      setErrors({
        email: "",
        password: "",
        general: message,
      });

      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     FORGOT PASSWORD
     ======================================================= */

  const handleForgotPassword = () => {
    if (loading) {
      return;
    }

    navigate("/reset-password", {
      state: {
        email: email.trim(),
      },
    });
  };

  const handlePasswordChangeSuccess = () => {
    localStorage.setItem("must_change_password", "false");
    setShowChangePasswordModal(false);

    // Password updated successfully. Now proceed to OTP verification!
    navigate("/otp", {
      state: {
        email: pendingEmail || email.trim(),
      },
      replace: true,
    });
  };

  /* =======================================================
     SSO LOGIN
     ======================================================= */

  const handleSSOLogin = async () => {
    if (loading || ssoLoading) {
      return;
    }

    setErrors({
      email: "",
      password: "",
      general: "",
    });

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrors((prev) => ({
        ...prev,
        email: "Please enter your Work email or Employee ID for SSO Login.",
      }));
      triggerShake();
      const el = document.getElementById("login-email");
      if (el) el.focus();
      return;
    }

    setSsoLoading(true);

    try {
      let res;
      try {
        res = await fetch(`${getApiBaseUrl()}/api/v1/auth/sso/send-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: cleanEmail }),
        });
      } catch {
        res = null;
      }

      if (!res || !res.ok) {
        res = await fetch(`${getApiBaseUrl()}/api/v1/auth/resend-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: cleanEmail }),
        });
      }

      const data = await readResponse(res);

      if (!res.ok) {
        const message = getErrorMessage(data);
        setErrors({
          email: "",
          password: "",
          general: message,
        });
        triggerShake();
        return;
      }

      const resolvedEmail = data?.email || cleanEmail;

      localStorage.setItem("loginEmail", resolvedEmail);
      if (data?.emp_code) {
        localStorage.setItem("emp_code", data.emp_code);
      }

      if (rememberMe) {
        localStorage.setItem("rememberLogin", "true");
        localStorage.setItem("rememberedLoginEmail", cleanEmail);
      }

      navigate("/otp", {
        state: {
          email: resolvedEmail,
          isSSO: true,
          emp_code: data?.emp_code,
          message: data?.message || `SSO verification code sent to your official inbox (${resolvedEmail})`,
        },
        replace: true,
      });
    } catch (err) {
      console.error("SSO Error:", err);
      setErrors({
        email: "",
        password: "",
        general: "Unable to complete SSO request. Please verify backend is running.",
      });
      triggerShake();
    } finally {
      setSsoLoading(false);
    }
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main
      className={`login-page-root ${shake
          ? "login-page-root--shake"
          : ""
        }`}
      data-theme="light"
    >
      {/* =================================================
          LEFT MASTER REFERENCE HERO
          ================================================= */}

      <section className="login-page-root__hero">
        <div
          className="login-page-root__master-reference"
          style={{
            backgroundImage:
              `url(${MASTER_REFERENCE})`,
          }}
          aria-hidden="true"
        />

        <div className="login-page-root__hero-overlay" />

        {/* ── HERO BRAND LOGO COVER-UP ── 
            Renders the white LA ESFERA logo on the left side */}
        <div style={{
          position: 'absolute',
          top: '3%',
          left: '3%',
          width: '32%',
          maxWidth: '260px',
          height: '13%',
          background: '#05050c', // seamlessly blends with the hero background
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '3%',
        }}>
          <img
            src={heroLogo}
            alt="LA ESFERA"
            style={{ width: '100%', maxWidth: '200px', height: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* ── DATE CARD ── direct child of hero (position:relative)
            so top/left are always relative to the hero section, not
            any intermediate wrapper. Full styling inline to bypass
            any backdrop-filter / CSS cascade issues.              */}
        {/* ── DATE CARD ── perfectly superimposing the hero box at (14.06%, 20.72%) ── */}
        <div
          aria-label={`Today is ${dynamicHeroDate}`}
          style={{
            position: 'absolute',
            top: '20.72%',
            left: '14.06%',
            width: '24.9%',
            minWidth: '220px',
            maxWidth: '260px',
            height: '10.1%',
            minHeight: '85px',
            maxHeight: '100px',
            zIndex: 5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 18px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(32, 26, 62, 1) 0%, rgba(18, 14, 38, 1) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.22)',
            pointerEvents: 'none',
            userSelect: 'none',
            boxSizing: 'border-box',
          }}
        >
          {/* Calendar icon */}
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px',
            background: 'rgba(124, 77, 255, 0.22)',
            border: '1px solid rgba(168, 130, 255, 0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#c4b5fd', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <circle cx="8" cy="14" r="1" fill="currentColor" />
              <circle cx="12" cy="14" r="1" fill="currentColor" />
              <circle cx="16" cy="14" r="1" fill="currentColor" />
              <circle cx="8" cy="18" r="1" fill="currentColor" />
              <circle cx="12" cy="18" r="1" fill="currentColor" />
              <circle cx="16" cy="18" r="1" fill="currentColor" />
            </svg>
          </div>
          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.2 }}>Today</span>
            <strong style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', lineHeight: 1.2 }} aria-live="polite">
              {dynamicHeroDate}
            </strong>
          </div>
        </div>

        {/* ── TIME CARD ── perfectly superimposing the hero box at (77.32%, 18.60%) ── */}
        <div
          aria-label={`Current time is ${dynamicHeroTime}`}
          style={{
            position: 'absolute',
            top: '18.60%',
            left: '77.32%',
            width: '24.9%',
            minWidth: '220px',
            maxWidth: '260px',
            height: '10.1%',
            minHeight: '85px',
            maxHeight: '100px',
            zIndex: 5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 18px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(32, 26, 62, 1) 0%, rgba(18, 14, 38, 1) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.22)',
            pointerEvents: 'none',
            userSelect: 'none',
            boxSizing: 'border-box',
          }}
        >
          {/* Clock icon */}
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px',
            background: 'rgba(124, 77, 255, 0.22)',
            border: '1px solid rgba(168, 130, 255, 0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#c4b5fd', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 15" />
            </svg>
          </div>
          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.2 }}>Current time</span>
            <strong style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', lineHeight: 1.2 }} aria-live="polite">
              {dynamicHeroTime}
            </strong>
          </div>
        </div>
      </section>

      {/* =================================================
          RIGHT LOGIN PANEL
          ================================================= */}

      <section className="login-page-root__panel">
        <div className="login-page-root__card">

          {/* -----------------------------------------------
              BRAND
              ----------------------------------------------- */}

          <div className="login-page-root__card-header">
            <div className="login-page-root__brand">
              <div className="login-page-root__brand-logo">
                <img
                  src={logoIcon}
                  alt="LA ESFERA"
                />
              </div>

              <div className="login-page-root__brand-text">
                <span>
                  HR MANAGEMENT SYSTEM
                </span>

                <strong>
                  LA ESFERA
                </strong>
              </div>
            </div>

            <div className="login-page-root__secure">
              <ShieldIcon />
              <span>
                Secure &amp; Encrypted
              </span>
            </div>
          </div>

          {/* -----------------------------------------------
              HEADING
              ----------------------------------------------- */}

          <div className="login-page-root__intro">
            <span>
              GOOD EVENING
            </span>

            <h1>
              Welcome back
            </h1>

            <p>
              Sign in to your employee attendance
              portal and continue your workday.
            </p>
          </div>

          {/* -----------------------------------------------
              PURPLE ACCENT
              ----------------------------------------------- */}

          <div className="login-page-root__accent">
            <span />
            <i />
            <span />
          </div>

          {/* -----------------------------------------------
              ERROR
              ----------------------------------------------- */}

          {errors.general && (
            <div
              className="login-page-root__alert"
              role="alert"
            >
              <div className="login-page-root__alert-icon">
                !
              </div>

              <div>
                <strong>
                  Authentication failed
                </strong>

                <p>
                  {errors.general}
                </p>
              </div>
            </div>
          )}

          {/* -----------------------------------------------
              FORM
              ----------------------------------------------- */}

          <form
            className="login-page-root__form"
            onSubmit={handleLogin}
            noValidate
          >
            {/* EMAIL */}

            <div className="login-page-root__field">
              <label htmlFor="login-email">
                Work email or Employee ID
              </label>

              <div
                className={`login-page-root__input ${errors.email
                    ? "login-page-root__input--error"
                    : ""
                  }`}
              >
                <MailIcon />

                <input
                  id="login-email"
                  name="email"
                  type="text"
                  value={email}
                  placeholder="name@company.com"
                  autoComplete="username"
                  disabled={loading}
                  onChange={(event) => {
                    setEmail(
                      event.target.value
                    );

                    clearError("email");
                  }}
                />

                {email.trim() &&
                  !errors.email && (
                    <span className="login-page-root__valid">
                      ✓
                    </span>
                  )}
              </div>

              {errors.email && (
                <small>
                  {errors.email}
                </small>
              )}
            </div>

            {/* PASSWORD */}

            <div className="login-page-root__field">
              <label htmlFor="login-password">
                Password
              </label>

              <div
                className={`login-page-root__input ${errors.password
                    ? "login-page-root__input--error"
                    : ""
                  }`}
              >
                <LockIcon />

                <input
                  id="login-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  onChange={(event) => {
                    setPassword(
                      event.target.value
                    );

                    clearError("password");
                  }}
                />

                <button
                  type="button"
                  className="login-page-root__password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (value) =>
                        !value
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <EyeIcon
                    hidden={
                      !showPassword
                    }
                  />
                </button>
              </div>

              {errors.password && (
                <small>
                  {errors.password}
                </small>
              )}
            </div>

            {/* OPTIONS */}

            <div className="login-page-root__options">
              <label className="login-page-root__remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={loading}
                  onChange={(event) =>
                    setRememberMe(
                      event.target.checked
                    )
                  }
                />

                <span>
                  ✓
                </span>

                Remember me
              </label>

              <button
                type="button"
                className="login-page-root__forgot"
                disabled={loading}
                onClick={
                  handleForgotPassword
                }
              >
                Forgot password?
              </button>
            </div>

            {/* SIGN IN */}

            <button
              type="submit"
              className="login-page-root__submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-page-root__spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowIcon />
                </>
              )}
            </button>

            {/* OR */}

            <div className="login-page-root__or">
              <span />
              <small>OR</small>
              <span />
            </div>

            {/* SSO */}

            <button
              type="button"
              className="login-page-root__sso"
              disabled={loading || ssoLoading}
              onClick={handleSSOLogin}
              style={{
                background: '#ffffff',
                color: '#1e293b',
                border: '1px solid #dfe1e9',
                padding: '12px 18px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s'
              }}
            >
              {ssoLoading ? (
                <>
                  <span className="login-page-root__spinner" style={{ borderColor: "#0284c7", borderTopColor: "transparent" }} />
                  Sending Outlook OTP...
                </>
              ) : (
                <>
                  <ShieldIcon />
                  <span>SSO Login</span>
                </>
              )}
            </button>
          </form>

          {/* -----------------------------------------------
              SECURITY
              ----------------------------------------------- */}

          <div className="login-page-root__security">
            <span>
              <i />
              System secure
            </span>

            <b />

            <span>
              Secure access
            </span>

            <b />

            <span>
              {formattedDate}
            </span>
          </div>

          {/* -----------------------------------------------
              TERMS
              ----------------------------------------------- */}

          <p className="login-page-root__terms">
            By continuing, you agree to our{" "}
            <span>
              Terms &amp; Conditions
            </span>{" "}
            and{" "}
            <span>
              Privacy Policy
            </span>
            .
          </p>
        </div>
      </section>

      {/* Mandatory Password Change Before OTP */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        targetIdentifier={pendingEmail || email.trim()}
        onSuccess={handlePasswordChangeSuccess}
      />
    </main>
  );
};

export default LoginPage;
