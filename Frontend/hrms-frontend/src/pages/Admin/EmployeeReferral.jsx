import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Smartphone,
  Share2,
  Users,
  Gift,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
  ExternalLink,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./EmployeeReferral.css";

const SOURCES = [
  "LinkedIn",
  "Employee Network",
  "Personal Contact",
  "Job Fair / Event",
  "Email Campaign",
  "Social Media",
  "Former Colleague",
  "Online Community",
  "Other",
];

const PROCESS_STEPS = [
  {
    icon: "📋",
    text: "Submit the form on the right with the details of the Company and person you are referring",
  },
  {
    icon: "👥",
    text: "Our Team will reach out to your Referral and walk them through the Quickchex Offering",
  },
  {
    icon: "🏡",
    text: "Upon your referral's first paid cycle completion with Quickchex, expect your Amazon Digital Gift Card within 7 days.",
  },
  {
    icon: "🎁",
    text: "Your referral receives a 20% discount on their invoice and waiver of their implementation fee.",
  },
];

function EmployeeReferral() {
  const navigate = useNavigate();

  const profileName = (() => {
    try {
      const u = JSON.parse(window.localStorage.getItem("user") || "{}");
      if (u.name || u.first_name) {
        return u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim();
      }
    } catch { /* ignore */ }
    return (
      window.localStorage.getItem("user_name") ||
      window.localStorage.getItem("name") ||
      "Team Member"
    );
  })();

  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    source: "",
    comments: "",
  });

  const [errors, setErrors] = useState({});
  const [successModal, setSuccessModal] = useState(false);
  const [tncModal, setTncModal] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.company.trim()) newErrors.company = "Company is required";
    if (!form.phone.trim()) {
      newErrors.phone = "Phone is required";
    } else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.phone.trim())) {
      newErrors.phone = "Enter a valid phone number";
    }
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Enter a valid email address";
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setSuccessModal(true);
    setForm({ name: "", company: "", phone: "", email: "", source: "", comments: "" });
    setErrors({});
  };

  return (
    <div className="employee-referral-page">
      <DashboardHeader />
      <div className="er-split">
        {/* =====================================================
            LEFT PANEL — Referral Promo
            ===================================================== */}
        <div className="er-left">
          {/* Logo */}
          <div className="er-logo-wrap">
            <div className="er-logo-icon">L</div>
            <span className="er-logo-name">LA ESFERA</span>
          </div>

          {/* Headline */}
          <h1 className="er-promo-headline">Refer and Earn!</h1>

          {/* Illustration */}
          <div className="er-illustration-wrap">
            <div className="er-illustration-bg">
              <div className="er-phone-icon">
                <div className="er-phone-inner">
                  <Share2 size={36} />
                </div>
              </div>

              {/* Floating avatar bubbles */}
              <div className="er-bubble er-bubble-1">👩</div>
              <div className="er-bubble er-bubble-2">👨‍💼</div>
              <div className="er-bubble er-bubble-3">👩‍💻</div>
              <div className="er-bubble er-bubble-4">🧑‍🎤</div>
            </div>
          </div>

          {/* Offer text */}
          <p className="er-offer-text">
            Refer a friend and get a Rs. 5000<br />Amazon Gift Card
          </p>

          {/* 4-step process */}
          <div className="er-steps">
            {PROCESS_STEPS.map((step, idx) => (
              <div key={idx} className="er-step">
                <div className="er-step-icon">{step.icon}</div>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* =====================================================
            RIGHT PANEL — Form
            ===================================================== */}
        <div className="er-right">
          <h1 className="er-welcome-name">Welcome, {profileName}</h1>
          <p className="er-form-section-title">Details of the Person You Are Referring</p>

          <form className="er-form" onSubmit={handleSubmit} noValidate>
            {/* Row 1: Name + Company */}
            <div className="er-form-row">
              <div className="er-form-group">
                <label>
                  Name of Person You Are Referring
                  <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className={`er-input ${errors.name ? "error" : ""}`}
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
                {errors.name && <span className="er-error-text">{errors.name}</span>}
              </div>

              <div className="er-form-group">
                <label>
                  Company of Referral
                  <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className={`er-input ${errors.company ? "error" : ""}`}
                  placeholder="Company name"
                  value={form.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                />
                {errors.company && <span className="er-error-text">{errors.company}</span>}
              </div>
            </div>

            {/* Row 2: Phone + Email */}
            <div className="er-form-row">
              <div className="er-form-group">
                <label>
                  Phone No.
                  <span className="req-star">*</span>
                </label>
                <input
                  type="tel"
                  className={`er-input ${errors.phone ? "error" : ""}`}
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
                {errors.phone && <span className="er-error-text">{errors.phone}</span>}
              </div>

              <div className="er-form-group">
                <label>
                  Email ID
                  <span className="req-star">*</span>
                </label>
                <input
                  type="email"
                  className={`er-input ${errors.email ? "error" : ""}`}
                  placeholder="email@company.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
                {errors.email && <span className="er-error-text">{errors.email}</span>}
              </div>
            </div>

            {/* Row 3: Source + Comments */}
            <div className="er-form-row">
              <div className="er-form-group">
                <label>How do you know this referral?</label>
                <select
                  className="er-select"
                  value={form.source}
                  onChange={(e) => handleChange("source", e.target.value)}
                >
                  <option value="">Select Source</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="er-form-group">
                <label>Comments</label>
                <textarea
                  className="er-textarea"
                  placeholder="Any additional notes..."
                  value={form.comments}
                  onChange={(e) => handleChange("comments", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="er-tnc-row">
              <button
                type="button"
                className="er-tnc-link"
                onClick={() => setTncModal(true)}
              >
                <Info size={14} />
                View Terms and Conditions
              </button>
            </div>

            {/* Submit */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end" }}>
              <button type="submit" className="er-submit-btn">
                Submit
              </button>
              <button
                type="button"
                className="er-track-link"
                onClick={() => navigate("/dashboard/referral-records")}
              >
                Click Here to Track your Referrals →
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* =====================================================
          SUCCESS MODAL
          ===================================================== */}
      {successModal && (
        <div className="er-modal-overlay" onClick={() => setSuccessModal(false)}>
          <div className="er-modal" onClick={(e) => e.stopPropagation()}>
            <div className="er-modal-icon">
              <CheckCircle2 size={32} />
            </div>
            <h3>Referral Submitted!</h3>
            <p>
              Thank you for your referral. Our team will reach out to your contact shortly.
              You'll receive your Rs. 5000 Amazon Gift Card upon their first paid cycle.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button className="er-modal-close-btn" onClick={() => setSuccessModal(false)}>
                Close
              </button>
              <button
                className="er-modal-close-btn"
                style={{ background: "var(--er-purple-soft)", color: "var(--er-purple)" }}
                onClick={() => {
                  setSuccessModal(false);
                  navigate("/dashboard/referral-records");
                }}
              >
                Track Referrals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          TERMS & CONDITIONS MODAL
          ===================================================== */}
      {tncModal && (
        <div className="er-modal-overlay" onClick={() => setTncModal(false)}>
          <div className="er-modal" style={{ textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "12px" }}>Terms & Conditions</h3>
            <div style={{ fontSize: "13px", color: "var(--er-ink-muted)", lineHeight: "1.7", marginBottom: "20px" }}>
              <p style={{ marginBottom: "8px" }}>
                <strong>1. Eligibility:</strong> Referrals must be from companies not already in the Quickchex system. The referrer must be an active Quickchex user.
              </p>
              <p style={{ marginBottom: "8px" }}>
                <strong>2. Reward:</strong> The Rs. 5000 Amazon Digital Gift Card is issued upon the referred company's first successful paid invoice cycle.
              </p>
              <p style={{ marginBottom: "8px" }}>
                <strong>3. Discount:</strong> Referred companies receive a 20% discount on their first invoice and waiver of implementation fees.
              </p>
              <p style={{ marginBottom: "8px" }}>
                <strong>4. Fraud:</strong> Any misuse or fraudulent referrals will result in disqualification and potential account suspension.
              </p>
              <p>
                <strong>5. Changes:</strong> Quickchex reserves the right to modify or terminate the referral program at any time without prior notice.
              </p>
            </div>
            <button className="er-modal-close-btn" onClick={() => setTncModal(false)}>
              I Understand
            </button>
          </div>
        </div>
      )}

      {toast && <div className="er-toast">{toast}</div>}
    </div>
  );
}

export default EmployeeReferral;
