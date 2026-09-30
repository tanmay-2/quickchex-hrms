import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, ArrowRight, ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { useManagerAuth } from "../../auth/ManagerAuthContext";
import logo from "../../../assets/img/logo.png";
import { managerToast } from "../../components/ManagerToast";
import "./ManagerAuth.css";

export const ManagerOtpPage = () => {
  const navigate = useNavigate();
  const { verifyOtp, pendingOtpEmail, loading } = useManagerAuth();

  const [otp, setOtp] = useState(["1", "2", "3", "4", "5", "6"]);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasted)) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      managerToast.error("Please enter the complete 6-digit code.", { title: "Incomplete OTP" });
      return;
    }

    try {
      await verifyOtp(fullOtp);
      managerToast.success("Manager authorization verified successfully!", { title: "Access Granted" });
      navigate("/manager/dashboard");
    } catch (err) {
      managerToast.error(err.message || "Invalid OTP code.", { title: "Verification Failed" });
    }
  };

  const handleResend = () => {
    if (timer > 0) return;
    setTimer(60);
    managerToast.info("A fresh OTP code has been dispatched.", { title: "OTP Resent" });
  };

  return (
    <div className="mp-auth-wrapper">
      <div className="mp-auth-card">
        <div className="mp-auth-header">
          <div className="mp-auth-logo-box">
            <img src={logo} alt="LA ESFERA" className="mp-auth-logo-img" />
          </div>
          <span className="mp-auth-badge">SECURITY VERIFICATION</span>
          <h1 className="mp-auth-title">Enter OTP Code</h1>
          <p className="mp-auth-subtitle">
            We sent a 6-digit code to <strong>{pendingOtpEmail || localStorage.getItem("pending_otp_email") || "your registered email"}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mp-auth-form">
          <div className="mp-otp-grid" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="mp-otp-box"
              />
            ))}
          </div>

          <div style={{ textAlign: "center", fontSize: "13px", color: "var(--mp-text-muted)" }}>
            {timer > 0 ? (
              <span>Resend code in <strong>{timer}s</strong></span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7C3AED",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <RefreshCw size={14} /> Resend OTP Code
              </button>
            )}
          </div>

          <button type="submit" disabled={loading} className="mp-submit-btn">
            <span>{loading ? "Verifying..." : "Verify & Access Dashboard"}</span>
            <ArrowRight size={17} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/manager/login")}
            style={{
              background: "none",
              border: "none",
              color: "var(--mp-text-muted)",
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "4px",
            }}
          >
            <ArrowLeft size={14} /> Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};
