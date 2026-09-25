import React, { useState } from "react";
import { Lock, KeyRound, Eye, EyeOff, CheckCircle2, Shield } from "lucide-react";
import { managerToast } from "../../components/ManagerToast";

export const ManagerChangePassword = () => {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentPass || !newPass || !confirmPass) {
      managerToast.error("Please fill in all password fields.", { title: "Validation Error" });
      return;
    }
    if (newPass !== confirmPass) {
      managerToast.error("New password and confirm password do not match.", { title: "Password Mismatch" });
      return;
    }
    if (newPass.length < 8) {
      managerToast.error("Password must be at least 8 characters long.", { title: "Too Short" });
      return;
    }

    managerToast.success("Manager security password updated successfully.", { title: "Password Updated" });
    setCurrentPass("");
    setNewPass("");
    setConfirmPass("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "600px" }}>

      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--mp-text-primary)", margin: 0 }}>
          Security & Password Management
        </h2>
        <p style={{ fontSize: "13.5px", color: "var(--mp-text-muted)", margin: "4px 0 0 0" }}>
          Update your manager account credentials to keep team data and approval access secure.
        </p>
      </div>

      <div
        style={{
          background: "var(--mp-surface, #FFFFFF)",
          border: "1px solid var(--mp-border, #E6E3EE)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "var(--mp-shadow-sm)",
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Current Password</label>
            <input
              type={showPass ? "text" : "password"}
              required
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="••••••••••••"
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--mp-border)",
                fontSize: "14px",
                outline: "none",
                background: "var(--mp-surface)",
                color: "var(--mp-text-primary)",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>New Password</label>
            <input
              type={showPass ? "text" : "password"}
              required
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Minimum 8 characters with numbers & symbols"
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--mp-border)",
                fontSize: "14px",
                outline: "none",
                background: "var(--mp-surface)",
                color: "var(--mp-text-primary)",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Confirm New Password</label>
            <input
              type={showPass ? "text" : "password"}
              required
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Re-enter new password"
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--mp-border)",
                fontSize: "14px",
                outline: "none",
                background: "var(--mp-surface)",
                color: "var(--mp-text-primary)",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <input
              type="checkbox"
              id="show-mgr-pass"
              checked={showPass}
              onChange={(e) => setShowPass(e.target.checked)}
              style={{ accentColor: "#7C3AED" }}
            />
            <label htmlFor="show-mgr-pass" style={{ cursor: "pointer", color: "var(--mp-text-secondary)" }}>
              Show passwords in clear text
            </label>
          </div>

          <button
            type="submit"
            style={{
              marginTop: "8px",
              padding: "11px 24px",
              borderRadius: "8px",
              border: "none",
              background: "#7C3AED",
              color: "#FFF",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              width: "fit-content",
            }}
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};
