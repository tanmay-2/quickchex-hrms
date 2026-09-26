import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./loginPage.css";

import logoIcon from "../../assets/img/logo.png";
import fullLogo from "../../assets/img/laesfera_full_logo.png";

/*
 * IMPORTANT:
 * Put the SECOND/master reference image here:
 *
 * public/login-master-reference.png
 *
 * The image itself already contains the approved
 * left-side 3D employee/globe/platform composition.
 *
 * We display only the LEFT 59.6% of that image in the hero,
 * so the reference's right-side login form is NOT duplicated.
 */
const MASTER_REFERENCE = "/login-master-v3.png?v=perfect_glow";

const API_BASE = (import.meta.env?.VITE_API_URL || 'https://quickchex-backend.onrender.com').replace(/\/$/, '');
const LOGIN_URL = `${API_BASE}/api/v1/auth/login`;
const SET_FIRST_PASSWORD_URL = `${API_BASE}/api/v1/auth/set-first-password`;
const SSO_MICROSOFT_URL = `${API_BASE}/api/v1/auth/sso/microsoft/url`;
const SSO_MICROSOFT_CALLBACK = `${API_BASE}/api/v1/auth/sso/microsoft/callback`;
const SSO_DIRECT_URL = `${API_BASE}/api/v1/auth/sso/direct`;
const SSO_ACCOUNTS_URL = `${API_BASE}/api/v1/auth/sso/accounts`;
const SSO_SEND_OTP_URL = `${API_BASE}/api/v1/auth/sso/send-otp`;

/* =========================================================
   ICONS
   ========================================================= */

const MicrosoftIcon = () => (
  <svg viewBox="0 0 21 21" width="18" height="18" style={{ flexShrink: 0 }} aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

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

const EyeIcon = ({ show }) => (
  <svg
    viewBox="0 0 24 24"
    width="19"
    height="19"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {show ? (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </>
    )}
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path
      d="M12 2.5 19 5.8v5.2c0 4.8-3.1 8.6-7 10-3.9-1.4-7-5.2-7-10V5.8L12 2.5Z"
      fill="#111827"
    />
    <path
      d="m9.5 11.5 1.8 1.8 3.5-3.5"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });

  const [shake, setShake] = useState(false);

  /* -------------------------------------------------------
     SET FIRST-TIME PASSWORD MODAL
     ------------------------------------------------------- */
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  /* -------------------------------------------------------
     SSO STATE
     ------------------------------------------------------- */
  const [ssoLoading, setSsoLoading] = useState(false);

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
     MICROSOFT SSO OAUTH CALLBACK HANDLER
     ------------------------------------------------------- */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const errorParam = urlParams.get("error");
    const errorDesc = urlParams.get("error_description");

    if (errorParam) {
      setErrors((prev) => ({
        ...prev,
        general: errorDesc || "Microsoft SSO authentication was cancelled or failed.",
      }));
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      setSsoLoading(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      const redirectUri = window.location.origin + "/login";

      fetch(SSO_MICROSOFT_CALLBACK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      })
        .then(async (res) => {
          const data = await readResponse(res);
          if (!res.ok) {
            throw new Error(getErrorMessage(data));
          }
          handleSsoLoginSuccess(data);
        })
        .catch((err) => {
          console.error("SSO Callback error:", err);
          setErrors((prev) => ({
            ...prev,
            general: err.message || "Failed to complete Microsoft SSO sign-in.",
          }));
        })
        .finally(() => {
          setSsoLoading(false);
        });
    }
  }, []);

  const handleSsoLoginSuccess = (data) => {
    const token =
      data?.access_token ||
      data?.accessToken ||
      data?.token ||
      data?.authToken;

    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
    }

    if (data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    let role = (data?.role || data?.user?.role || "employee").toLowerCase();
    const rawDesignation = (data?.designation || data?.user?.designation || "").toLowerCase();
    const empCode = data?.emp_code || data?.user?.emp_code || "";
    const emailVal = data?.user?.email || data?.email || "";

    if (role === "employee" && (rawDesignation.includes("team lead") || rawDesignation.includes("leader") || rawDesignation === "tl")) {
      role = "teamleader";
    }

    localStorage.setItem("role", role);
    if (data?.designation) localStorage.setItem("designation", data.designation);
    if (empCode) localStorage.setItem("emp_code", empCode);
    if (emailVal) localStorage.setItem("loginEmail", emailVal);

    if (role === "admin") {
      navigate("/dashboard", { replace: true });
    } else if (role === "teamleader") {
      navigate("/dashboard_tl", { replace: true });
    } else {
      navigate("/dashboard_emp", { replace: true });
    }
  };

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

  const formattedHeroDate = useMemo(() => {
    const day = now.getDate();
    const month = now.toLocaleDateString("en-US", { month: "short" });
    const year = now.getFullYear();
    return `${day} ${month}, ${year}`;
  }, [now]);

  const formattedHeroTime = useMemo(() => {
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, "0");
    return `${hoursStr}:${minutes}:${seconds} ${ampm}`;
  }, [now]);

  const formattedDate = useMemo(
    () =>
      now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [now]
  );

  const greeting = useMemo(() => {
    const hours = now.getHours();
    if (hours < 12) return "GOOD MORNING";
    if (hours < 17) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  }, [now]);

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

    try {
      // Resilient fetch: handles localhost vs 127.0.0.1 dual-homing and eliminates IPv6 / port delay
      const fetchWithFallback = async (payload, isJson = true) => {
        const urlsToTry = [];
        if (LOGIN_URL.includes("localhost")) {
          urlsToTry.push(LOGIN_URL.replace("localhost", "127.0.0.1"));
          urlsToTry.push(LOGIN_URL);
        } else if (LOGIN_URL.includes("127.0.0.1")) {
          urlsToTry.push(LOGIN_URL);
          urlsToTry.push(LOGIN_URL.replace("127.0.0.1", "localhost"));
        } else {
          urlsToTry.push(LOGIN_URL);
        }

        let lastErr;
        for (const targetUrl of urlsToTry) {
          try {
            const attemptController = new AbortController();
            const attemptTimer = window.setTimeout(() => attemptController.abort(), 120000);

            const res = await fetch(targetUrl, {
              method: "POST",
              headers: isJson
                ? {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                }
                : {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Accept: "application/json",
                },
              body: isJson ? JSON.stringify(payload) : payload.toString(),
              signal: attemptController.signal,
            });
            window.clearTimeout(attemptTimer);
            return res;
          } catch (err) {
            lastErr = err;
          }
        }
        throw lastErr;
      };

      let response = await fetchWithFallback({
        email: cleanEmail,
        password,
      }, true);

      let data = await readResponse(response);

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

        response = await fetchWithFallback(formData, false);
        data = await readResponse(response);
      }

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
         DEFAULT PASSWORD DETECTED (TRIGGER FIRST-TIME POPUP)
         =================================================== */

      if (data?.requires_password_change || data?.requiresPasswordChange) {
        const resolvedEmail = data?.email || cleanEmail;
        setTargetEmail(resolvedEmail);
        setShowPasswordModal(true);
        setNewPassword("");
        setConfirmPassword("");
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setModalError("");
        setLoading(false);
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

      localStorage.setItem(
        "loginEmail",
        cleanEmail
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
         OTP FLOW
         =================================================== */

      navigate("/otp", {
        state: {
          email: cleanEmail,
        },
        replace: true,
      });
    } catch (error) {
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

  /* =======================================================
     SET FIRST-TIME PASSWORD HANDLER
     ======================================================= */

  const handleSetFirstPassword = async (event) => {
    if (event) {
      event.preventDefault();
    }

    if (modalLoading) {
      return;
    }

    setModalError("");

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew || !trimmedConfirm) {
      setModalError("Please enter and confirm your new password.");
      return;
    }

    if (trimmedNew.length < 6) {
      setModalError("New password must be at least 6 characters long.");
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setModalError("Passwords do not match. Please verify.");
      return;
    }

    if (trimmedNew === "Employee@123") {
      setModalError("New password cannot be the default password (Employee@123). Please choose a different password.");
      return;
    }

    setModalLoading(true);

    try {
      const fetchWithFallback = async (targetEndpoint, payload) => {
        const urlsToTry = [];
        if (targetEndpoint.includes("localhost")) {
          urlsToTry.push(targetEndpoint.replace("localhost", "127.0.0.1"));
          urlsToTry.push(targetEndpoint);
        } else if (targetEndpoint.includes("127.0.0.1")) {
          urlsToTry.push(targetEndpoint);
          urlsToTry.push(targetEndpoint.replace("127.0.0.1", "localhost"));
        } else {
          urlsToTry.push(targetEndpoint);
        }

        let lastErr;
        for (const url of urlsToTry) {
          try {
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), 20000);
            const res = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            window.clearTimeout(timer);
            return res;
          } catch (err) {
            lastErr = err;
          }
        }
        throw lastErr;
      };

      const response = await fetchWithFallback(SET_FIRST_PASSWORD_URL, {
        email: targetEmail,
        new_password: trimmedNew,
      });

      const data = await readResponse(response);

      if (!response.ok) {
        const msg = getErrorMessage(data);
        setModalError(msg);
        return;
      }

      // Password successfully updated and OTP sent!
      setShowPasswordModal(false);
      localStorage.setItem("loginEmail", targetEmail);

      navigate("/otp", {
        state: {
          email: targetEmail,
          passwordSetSuccess: true,
        },
        replace: true,
      });
    } catch (err) {
      console.error("Set first password error:", err);
      setModalError("Unable to connect to the server. Please check your connection.");
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (!showPasswordModal) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !modalLoading) {
        setShowPasswordModal(false);
        setNewPassword("");
        setConfirmPassword("");
        setModalError("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPasswordModal, modalLoading]);

  /* =======================================================
  /* =======================================================
     SMART CORPORATE SSO ACTION (100% Frictionless)
     ======================================================= */

  const handleSmartSSOLogin = async () => {
    if (ssoLoading || loading) {
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
        email: "Please enter your Work Email or Employee ID for SSO Login.",
      }));
      triggerShake();
      const el = document.getElementById("login-email");
      if (el) el.focus();
      return;
    }

    setSsoLoading(true);

    try {
      const fetchWithFallback = async (targetEndpoint, payload) => {
        const urlsToTry = [];
        if (targetEndpoint.includes("localhost")) {
          urlsToTry.push(targetEndpoint.replace("localhost", "127.0.0.1"));
          urlsToTry.push(targetEndpoint);
        } else if (targetEndpoint.includes("127.0.0.1")) {
          urlsToTry.push(targetEndpoint);
          urlsToTry.push(targetEndpoint.replace("127.0.0.1", "localhost"));
        } else {
          urlsToTry.push(targetEndpoint);
        }

        let lastErr;
        for (const url of urlsToTry) {
          try {
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), 20000);
            const res = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            window.clearTimeout(timer);
            return res;
          } catch (err) {
            lastErr = err;
          }
        }
        throw lastErr;
      };

      const response = await fetchWithFallback(SSO_SEND_OTP_URL, {
        email: cleanEmail,
      });

      const data = await readResponse(response);

      if (!response.ok) {
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
          message: data?.message || `SSO verification code sent to your official Outlook inbox (${resolvedEmail})`,
        },
        replace: true,
      });
    } catch (err) {
      console.error("SSO Send OTP error:", err);
      let message = "Unable to connect to the authentication server.";
      if (err?.message) message = err.message;
      setErrors({
        email: "",
        password: "",
        general: message,
      });
      triggerShake();
    } finally {
      setSsoLoading(false);
    }
  };

  /* =======================================================
     VIEWPORT NO-SCROLL ENFORCEMENT & SCROLLBAR REMOVAL
     ======================================================= */

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyHeight = document.body.style.height;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyMargin = document.body.style.margin;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100vh";
    document.documentElement.style.height = "100vh";
    document.body.style.margin = "0";

    const styleEl = document.createElement("style");
    styleEl.id = "login-no-scrollbar-lock";
    styleEl.textContent = `
      html, body, #root, .login-page-root, .login-page-root__panel, .login-page-root__card {
        overflow: hidden !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      ::-webkit-scrollbar {
        display: none !important;
        width: 0px !important;
        height: 0px !important;
      }
    `;
    document.head.appendChild(styleEl);

    const preventWheel = (e) => {
      // Don't scroll page
      e.preventDefault();
    };
    window.addEventListener("wheel", preventWheel, { passive: false });

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.height = prevBodyHeight;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.margin = prevBodyMargin;
      window.removeEventListener("wheel", preventWheel);
      const el = document.getElementById("login-no-scrollbar-lock");
      if (el) el.remove();
    };
  }, []);

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main
      className={`login-page-root ${shake
        ? "login-page-root--shake"
        : ""
        }`}
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

        {/* Dynamic Live Date Card */}
        <div className="login-page-root__hero-dynamic-date" style={{ color: "#ffffff" }} aria-label={`Today: ${formattedHeroDate}`}>
          <span className="login-page-root__hero-label" style={{ color: "#ffffff" }}>Today</span>
          <strong className="login-page-root__hero-val" style={{ color: "#ffffff" }}>{formattedHeroDate}</strong>
        </div>

        {/* Dynamic Live Time Card */}
        <div className="login-page-root__hero-dynamic-time" style={{ color: "#ffffff" }} aria-label={`Current time: ${formattedHeroTime}`}>
          <span className="login-page-root__hero-label" style={{ color: "#ffffff" }}>Current time</span>
          <strong className="login-page-root__hero-val" style={{ color: "#ffffff" }}>{formattedHeroTime}</strong>
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
            <img
              src={fullLogo}
              alt="LA ESFERA - Indigenously Innovative"
              className="brand-lockup-full-logo"
            />
          </div>

          {/* -----------------------------------------------
              HEADING
              ----------------------------------------------- */}

          <div className="login-page-root__intro">
            <h1>
              Sign In
            </h1>

            <p>
              Welcome! Please enter your login details.
            </p>
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
                  {errors.general.toLowerCase().includes("password")
                    ? "Incorrect Password"
                    : errors.general.toLowerCase().includes("not registered")
                      ? "Account Not Found"
                      : errors.general.toLowerCase().includes("server") || errors.general.toLowerCase().includes("timed out") || errors.general.toLowerCase().includes("connect")
                        ? "Connection Notice"
                        : "Sign-in Notice"}
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
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    boxShadow: "none",
                    borderRadius: 0,
                    padding: 0,
                  }}
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
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    boxShadow: "none",
                    borderRadius: 0,
                    padding: 0,
                  }}
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
                  <EyeIcon show={showPassword} />
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
              disabled={loading || ssoLoading}
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

            {/* SSO LOGIN */}

            <button
              type="button"
              className="login-page-root__sso"
              disabled={loading || ssoLoading}
              onClick={handleSmartSSOLogin}
              title="SSO Login - Instant Outlook OTP Login"
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
                  <MicrosoftIcon />
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

      {/* ===================================================
          FIRST-TIME PASSWORD POPUP MODAL
          =================================================== */}
      {showPasswordModal && (
        <div className="login-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="login-modal-card">
            <button
              type="button"
              className="login-modal-close-btn"
              onClick={() => {
                setShowPasswordModal(false);
                setNewPassword("");
                setConfirmPassword("");
                setModalError("");
              }}
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="login-modal-header">
              <div className="login-modal-icon-badge">
                <ShieldIcon />
              </div>
              <h3 id="modal-title" className="login-modal-title">Set Your New Password</h3>
              <p className="login-modal-subtitle">
                Default password verified for <span className="login-modal-email-highlight">{targetEmail}</span>. For your security, please set your personal password before continuing.
              </p>
            </div>

            <form onSubmit={handleSetFirstPassword} className="login-modal-form">
              {modalError && (
                <div className="login-modal-alert">
                  <span>{modalError}</span>
                </div>
              )}

              <div className="login-modal-field">
                <label htmlFor="modal-new-password">New Password</label>
                <div className="login-modal-input-wrap">
                  <LockIcon />
                  <input
                    id="modal-new-password"
                    className="seamless-input"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (modalError) setModalError("");
                    }}
                    autoFocus
                    disabled={modalLoading}
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      boxShadow: "none",
                      borderRadius: 0,
                      padding: "0 10px",
                    }}
                  />
                  <button
                    type="button"
                    className="login-modal-eye-btn"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    tabIndex="-1"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon show={showNewPassword} />
                  </button>
                </div>
              </div>

              <div className="login-modal-field">
                <label htmlFor="modal-confirm-password">Confirm New Password</label>
                <div className="login-modal-input-wrap">
                  <LockIcon />
                  <input
                    id="modal-confirm-password"
                    className="seamless-input"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (modalError) setModalError("");
                    }}
                    disabled={modalLoading}
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      boxShadow: "none",
                      borderRadius: 0,
                      padding: "0 10px",
                    }}
                  />
                  <button
                    type="button"
                    className="login-modal-eye-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    tabIndex="-1"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon show={showConfirmPassword} />
                  </button>
                </div>
              </div>

              <div className="login-modal-actions">
                <button
                  type="submit"
                  className="login-modal-submit-btn"
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <>
                      <span className="login-page-root__spinner" />
                      Saving &amp; Sending OTP...
                    </>
                  ) : (
                    <>
                      Set Password &amp; Send OTP
                      <ArrowIcon />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="login-modal-cancel-btn"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword("");
                    setConfirmPassword("");
                    setModalError("");
                  }}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default LoginPage;
