import React, { useState, useEffect } from "react";

function ProfileSidebar({ activeSection, setActiveSection, employee, setToast }) {
  // localPreview is used to show the image IMMEDIATELY after selecting a file
  const [localPreview, setLocalPreview] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // Logic: Show local upload preview first, then the image from DB, then initials
  const displayImage = localPreview || employee?.profile_image;

  // Reset local preview if the employee changes (e.g., Admin switching profiles)
  useEffect(() => {
    setLocalPreview(null);
  }, [employee?.emp_code]);

  // 🔥 Handle Image Upload
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ✅ Validation: Allow only images
    if (!file.type.startsWith("image/")) {
      setToast({ show: true, message: "Only image files are allowed!", type: "failure" });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
      return;
    }

    // ✅ Validation: Limit size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setToast({ show: true, message: "Image must be less than 2MB", type: "failure" });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
      return;
    }

    // Set local preview for instant feedback
    setLocalPreview(URL.createObjectURL(file));

    // Prepare upload
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/profile/upload-image/${employee.emp_code}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      if (res.ok) {
        setToast({ show: true, message: "Profile image updated successfully!", type: "success" });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
        // Note: We don't need fetchAvatar() anymore because the parent re-fetches or 
        // the local preview stays until the next full page load.
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

  return (
    <div className="sidebar-wrapper">

      {/* 🔥 PROFILE CARD */}
      <div className="profile-card">

        {/* AVATAR */}
        <div className="profile-avatar">
          <input
            type="file"
            id="profileUpload"
            accept="image/*"
            onChange={handleImageChange}
            hidden
          />

          <label htmlFor="profileUpload" className="avatar-clickable">
            {displayImage ? (
              <img
                src={displayImage}
                alt="profile"
                className="avatar-img"
                onError={(e) => {
                  e.target.src = ""; // Clear broken source
                  setLocalPreview(null);
                }}
              />
            ) : (
              <div className="avatar-text">
                {employee?.first_name?.charAt(0)}
                {employee?.last_name?.charAt(0) || ""}
              </div>
            )}
          </label>
        </div>

        <h4>
          {employee?.first_name} {employee?.last_name}
        </h4>

        <p className="profile-role">
          {employee?.designation || "-"}
        </p>
      </div>

      {/* 🔥 SIDEBAR SECTIONS */}
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
          >
            {sec.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfileSidebar;