// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - PROFILESIDEBAR.JSX
// Path: Frontend/hrms-frontend/src/pages/Profile/components/ProfileSidebar.jsx
// Purpose: Web portal page component managing 'ProfileSidebar' views, user interactions, and state.
// UI Components:
//   • <ProfileSidebar />
//   • <API_BASE_URL />
// Key Functions & Handlers:
//   • handleImageChange()
// ==============================================================================

import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "../../../services/apiClient";
import { PiCameraBold, PiUserDuotone } from "react-icons/pi";

/**
 * Normalizes relative upload paths to absolute URLs using getApiBaseUrl
 */
export function getCleanImageUrl(src) {
  if (!src || typeof src !== "string") return null;
  const clean = src.trim();
  if (!clean || clean === "null" || clean === "undefined") return null;
  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("blob:") ||
    clean.startsWith("data:")
  ) {
    return clean;
  }
  const normalizedPath = clean.replace(/^\/+/, "/");
  const base = getApiBaseUrl();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

function ProfileSidebar({ activeSection, setActiveSection, employee, setToast }) {
  const [localPreview, setLocalPreview] = useState(null);
  const [imgError, setImgError] = useState(false);
  const API_BASE_URL = getApiBaseUrl();

  const rawImage = localPreview || employee?.profile_image;
  const resolvedImage = getCleanImageUrl(rawImage);

  // Reset local preview and error when the employee or image changes
  useEffect(() => {
    setLocalPreview(null);
    setImgError(false);
  }, [employee?.emp_code, employee?.profile_image]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToast({ show: true, message: "Only image files are allowed!", type: "failure" });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setToast({ show: true, message: "Image must be less than 2MB", type: "failure" });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
      return;
    }

    setLocalPreview(URL.createObjectURL(file));
    setImgError(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const res = await fetch(`${API_BASE_URL}/profile/upload-image/${employee.emp_code}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (res.ok) {
        setToast({ show: true, message: "Profile image updated successfully!", type: "success" });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
      } else {
        setToast({ show: true, message: "Upload failed. Please try again.", type: "failure" });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      setToast({ show: true, message: "Server error during upload.", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    }
  };

  const fullName =
    `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() ||
    employee?.name ||
    employee?.emp_code ||
    "Employee";

  const initials = (
    `${(employee?.first_name || "").charAt(0)}${(employee?.last_name || "").charAt(0)}`
  ).toUpperCase() || (employee?.emp_code ? employee.emp_code.slice(0, 2) : "EM");

  return (
    <div className="sidebar-wrapper">
      {/* PROFILE CARD */}
      <div className="profile-card">
        {/* AVATAR */}
        <div className="profile-avatar">
          <div className="avatar-clickable" title={fullName}>
            <div className="avatar-text">
              {initials || "EM"}
            </div>
          </div>
        </div>

        <h4>{fullName}</h4>
        <p className="profile-role">{employee?.designation || "—"}</p>
        {employee?.department && (
          <span className="profile-dept-badge">{employee.department}</span>
        )}
      </div>

      {/* SIDEBAR SECTIONS NAV */}
      <div className="profile-sidebar">
        <h4>Sections</h4>
        {[
          { id: "personal", label: "Personal" },
          { id: "employment", label: "Employment" },
          { id: "statutory", label: "Statutory" },
          { id: "salary", label: "Salary" },
          { id: "transaction", label: "Transaction" },
          { id: "documents", label: "Documents" },
        ].map((sec) => (
          <div
            key={sec.id}
            className={activeSection === sec.id ? "active" : ""}
            onClick={() => setActiveSection(sec.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveSection(sec.id);
              }
            }}
          >
            {sec.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfileSidebar;
