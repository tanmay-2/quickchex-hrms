import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

import LoginPage from "./loginPage";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import "./OtpPage.css";

const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
};

const VERIFY_OTP_URL = `${getApiBaseUrl()}/api/v1/auth/verify-otp`;
const RESEND_OTP_URL = `${getApiBaseUrl()}/api/v1/auth/resend-otp`;

const OtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email =
    location.state?.email ||
    localStorage.getItem("loginEmail") ||
    "";

  const [otpSuccessType, setOtpSuccessType] = useState("");
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(20);
  const [canResend, setCanResend] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const inputRef = useRef(null);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 250);

    return () => window.clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [timeLeft]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}:${String(remaining).padStart(2, "0")}`;
  };

  const getErrorMessage = (data) => {
    if (!data) return "Unable to verify the OTP.";
    if (typeof data === "string") return data;

    if (typeof data.detail === "string") {
      return data.detail;
    }

    setOtpSuccessType("verified");
    if (Array.isArray(data.detail)) {
      const messages = data.detail
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.msg || item?.message || ""
        )
        .filter(Boolean);

      if (messages.length) {
        return messages.join(", ");
      }
    }

    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof data.error === "string") {
      return data.error;
    }

    return "Invalid OTP code. Please try again.";
  };

  const maskEmail = (value) => {
    if (!value) return "your email";

    const [name, domain] = value.split("@");

    if (!name || !domain) return value;

    if (name.length <= 2) {
      return `${name.charAt(0)}***@${domain}`;
    }

    return `${name.slice(0, 2)}***@${domain}`;
  };

  const handleOtpChange = (event) => {
    const nextValue = event.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(nextValue);
    setOtpError("");
    setOtpSuccess("");
    setOtpSuccessType("");
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();

    const pasted = (
      event.clipboardData?.getData("text") || ""
    )
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    setOtp(pasted);
    setOtpError("");
    setOtpSuccess("");
    setOtpSuccessType("");
  };

  const handleOtpKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (otp.length === 6 && !loading) {
        handleVerify();
      }
    }
  };

  const handleVerify = async () => {
    setOtpError("");
    setOtpSuccess("");
    setOtpSuccessType("");

    if (!otp) {
      setOtpError("Please enter the OTP code.");
      toast.error("Please enter the OTP code", {
        position: "top-center",
      });
      inputRef.current?.focus();
      return;
    }

    if (otp.length !== 6) {
      setOtpError("Enter the complete 6-digit OTP.");
      toast.error("Enter the complete 6-digit OTP", {
        position: "top-center",
      });
      inputRef.current?.focus();
      return;
    }

    setLoading(true);

    const loadingToast = toast.loading(
      "Verifying code...",
      {
        position: "top-center",
      }
    );

    try {
      const res = await fetch(VERIFY_OTP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const data = await res.json();

      toast.dismiss(loadingToast);

      if (!res.ok) {
        const message = getErrorMessage(data);

        setOtpError(message);
        setOtp("");

        toast.error(message, {
          position: "top-center",
        });

        window.setTimeout(() => {
          inputRef.current?.focus();
        }, 50);

        return;
      }

      setOtpError("");
      setOtpSuccess("Identity verified successfully.");
      setOtpSuccessType("verified");

      toast.success("Login Successful!", {
        position: "top-center",
      });

      let finalRole =
        data?.role?.toLowerCase() || "employee";

      const rawDesignation = data?.designation || "";
      const designationLower =
        rawDesignation.toLowerCase();

      if (
        finalRole === "employee" &&
        (
          designationLower.includes("team lead") ||
          designationLower.includes("leader") ||
          designationLower === "tl"
        )
      ) {
        finalRole = "teamleader";
      }

      if (data?.access_token) {
        localStorage.setItem(
          "token",
          data.access_token
        );

        localStorage.setItem(
          "authToken",
          data.access_token
        );
      }

      if (data?.emp_code) {
        localStorage.setItem(
          "emp_code",
          data.emp_code
        );
      }

      localStorage.setItem("role", finalRole);

      if (rawDesignation) {
        localStorage.setItem(
          "designation",
          rawDesignation
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

      // Role-isolated compatibility for Manager Portal components
      if (finalRole === "manager") {
        if (data?.access_token) {
          localStorage.setItem("manager_token", data.access_token);
        }
        if (data?.user) {
          localStorage.setItem("manager_user", JSON.stringify(data.user));
        }
      } else {
        localStorage.removeItem("manager_token");
        localStorage.removeItem("manager_user");
      }

      if (data?.must_change_password) {
        localStorage.setItem("must_change_password", "true");
        setShowChangePasswordModal(true);
        return;
      }

      localStorage.setItem("must_change_password", "false");

      redirectTimerRef.current = window.setTimeout(() => {
        if (finalRole === "admin") {
          navigate("/dashboard", {
            replace: true,
          });
        } else if (finalRole === "manager") {
          navigate("/manager/dashboard", {
            replace: true,
          });
        } else if (finalRole === "teamleader") {
          navigate("/dashboard_tl", {
            replace: true,
          });
        } else {
          navigate("/dashboard_emp", {
            replace: true,
          });
        }
      }, 850);
    } catch (error) {
      toast.dismiss(loadingToast);

      const message =
        error instanceof TypeError
          ? "Unable to connect to the server."
          : "Server connection failed.";

      setOtpError(message);

      toast.error(message, {
        position: "top-center",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;

    setOtpError("");
    setOtpSuccess("");
    setOtpSuccessType("");
    setResending(true);

    const loadingToast = toast.loading(
      "Requesting new OTP...",
      {
        position: "top-center",
      }
    );

    try {
      const res = await fetch(RESEND_OTP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      toast.dismiss(loadingToast);

      if (!res.ok) {
        const message = getErrorMessage(data);
        setOtpError(message);

        toast.error(message, {
          position: "top-center",
        });

        return;
      }

      setOtp("");
      setTimeLeft(300);
      setCanResend(false);

      setOtpSuccess(
        "A new OTP has been sent to your email."
      );
      setOtpSuccessType("resent");

      toast.success(
        "A new OTP has been sent to your email!",
        {
          position: "top-center",
        }
      );

      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } catch {
      toast.dismiss(loadingToast);

      const message =
        "Failed to connect to the server.";

      setOtpError(message);

      toast.error(message, {
        position: "top-center",
      });
    } finally {
      setResending(false);
    }
  };

  const handleDifferentAccount = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("role");
    localStorage.removeItem("designation");
    localStorage.removeItem("emp_code");
    localStorage.removeItem("loginEmail");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  const handlePasswordChangeSuccess = () => {
    localStorage.setItem("must_change_password", "false");
    setShowChangePasswordModal(false);

    const finalRole = (localStorage.getItem("role") || "").toLowerCase();
    if (finalRole === "admin") {
      navigate("/dashboard", { replace: true });
    } else if (finalRole === "manager") {
      navigate("/manager/dashboard", { replace: true });
    } else if (finalRole === "teamleader") {
      navigate("/dashboard_tl", { replace: true });
    } else {
      navigate("/dashboard_emp", { replace: true });
    }
  };

  return (
    <main className="otp-page">
      {/* Existing login page is intentionally reused ONLY as the
          dimmed/blurred background. loginPage.jsx is untouched. */}
      <div
        className="otp-background-login"
        aria-hidden="true"
        inert="true"
      >
        <LoginPage />
      </div>

      <div className="otp-backdrop" />

      <Toaster
        position="top-center"
        reverseOrder={false}
      />

      <section
        className="otp-reference-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-title"
      >
        <div className="otp-modal-header">
          <div className="otp-shield">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 3 19 6v5c0 4.8-3 8-7 10-4-2-7-5.2-7-10V6l7-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>

          <div>
            <span className="otp-kicker">
              SECURITY VERIFICATION
            </span>

            <h1 id="otp-title">
              Verify your identity
            </h1>
          </div>
        </div>

        <div className="otp-email-panel">
          <div className="otp-email-icon">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
              />
              <path d="m4 7 8 6 8-6" />
            </svg>
          </div>

          <p>
            We sent a 6-digit verification code to
            <strong>{maskEmail(email)}</strong>
          </p>
        </div>

        {otpError && (
          <div
            className="otp-inline-status otp-inline-error"
            role="alert"
          >
            <span>!</span>

            <div>
              <strong>
                Verification failed
              </strong>

              <p>{otpError}</p>
            </div>
          </div>
        )}

        {otpSuccess && (
          <div
            className="otp-inline-status otp-inline-success"
            role="status"
          >
            <span>✓</span>

            <div>
              <strong>
                {otpSuccessType === "resent"
                  ? "New code sent"
                  : "Verification complete"}
              </strong>

              <p>{otpSuccess}</p>
            </div>
          </div>
        )}

        <div className="otp-input-section">
          <label htmlFor="otp-input">
            Enter verification code
          </label>

          <input
            ref={inputRef}
            id="otp-input"
            className={`otp-main-input ${otpError
                ? "is-error"
                : otpSuccessType
                  ? "is-success"
                  : ""
              }`}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="1  2  3  4  5  6"
            value={otp}
            onChange={handleOtpChange}
            onKeyDown={handleOtpKeyDown}
            onPaste={handleOtpPaste}
            disabled={loading || otpSuccessType === "verified"}
            aria-invalid={Boolean(otpError)}
          />

          <div className="otp-input-meta">
            <span>
              {otp.length}/6 digits entered
            </span>

            <span>
              Secure one-time code
            </span>
          </div>
        </div>

        <button
          type="button"
          className="otp-continue-button"
          onClick={handleVerify}
          disabled={
            loading ||
            otp.length !== 6 ||
            otpSuccessType === "verified"
          }
        >
          {loading ? (
            <>
              <span className="otp-spinner" />
              Verifying...
            </>
          ) : otpSuccessType === "verified" ? (
            <>
              Verified
              <span className="otp-check">✓</span>
            </>
          ) : (
            <>
              Verify & Continue
              <span className="otp-arrow">→</span>
            </>
          )}
        </button>

        <div className="otp-resend">
          {canResend ? (
            <>
              <span>
                Didn't receive the code?
              </span>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending || otpSuccessType === "verified"}
              >
                {resending
                  ? "Sending..."
                  : "Resend OTP"}
              </button>
            </>
          ) : (
            <>
              <span>
                Resend available in
              </span>

              <strong>
                {formatTime(timeLeft)}
              </strong>
            </>
          )}
        </div>

        <div className="otp-security-note">
          <span />
          Never share your verification code with anyone.
        </div>

        <button
          type="button"
          className="otp-different-account"
          onClick={handleDifferentAccount}
          disabled={loading}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M10 17 15 12 10 7" />
            <path d="M15 12H4" />
            <path d="M14 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4" />
          </svg>

          Use a different account
        </button>
      </section>

      {/* Mandatory First-Time Password Change Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        targetIdentifier={email || localStorage.getItem("loginEmail") || localStorage.getItem("emp_code") || ""}
        onSuccess={handlePasswordChangeSuccess}
      />
    </main>
  );
};

export default OtpPage;
