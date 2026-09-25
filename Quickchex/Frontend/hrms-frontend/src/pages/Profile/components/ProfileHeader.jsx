import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PiBellDuotone } from "react-icons/pi";

function ProfileHeader({ employee }) {
  const navigate = useNavigate();

  // --- Dropdown Menu State & Logic ---
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Helper to generate initials dynamically from the employee prop
  const getInitials = () => {
    if (!employee?.first_name) return "U"; // Default fallback
    return `${employee.first_name[0] || ""}${employee.last_name?.[0] || ""}`.toUpperCase();
  };

  return (
    <>
      
        <div
          className="profile-hero"
          style={{
            backgroundSize: "cover",
            backgroundPosition: "right center",
            padding: "10px 10px", 
            backgroundColor: "#ffffff", 
            borderBottom: "1px solid #e5e7eb" 
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", width: "100%" }}>

            {/* RIGHT SIDE: Bell & Avatar */}
            {/* Removed header-top-right class to prevent wrapping */}
            <div ref={menuRef} style={{ display: "flex", alignItems: "center", gap: "15px", position: "relative" }}>
              
              {/* BELL */}
              <div style={{ 
                display: "flex", alignItems: "center", justifyContent: "center", 
                width: "40px", height: "40px", borderRadius: "50%", 
                backgroundColor: "#f3f4f6", cursor: "pointer", color: "#4b5563",
                transition: "background-color 0.2s"
              }}>
                <PiBellDuotone />
              </div>

              {/* AVATAR */}
              <div
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "42px", height: "42px", borderRadius: "50%",
                  backgroundColor: "#1e3a8a", color: "white", fontWeight: "bold",
                  cursor: "pointer", fontSize: "14px", transition: "opacity 0.2s"
                }}
              >
                {getInitials()}
              </div>

              {/* DROPDOWN */}
              {menuOpen && (
                <div style={{
                  position: "absolute", top: "50px", right: "0",
                  backgroundColor: "white", border: "1px solid #e5e7eb",
                  borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  width: "200px", zIndex: 50, padding: "8px 0"
                }}>
                  <div className="dropdown-item" style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>Notification Settings</div>
                  <div className="dropdown-item" style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>Help Center</div>
                  <div className="dropdown-item" style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>Submit a Ticket</div>
                  <div style={{ borderTop: "1px solid #e5e7eb", margin: "4px 0" }}></div>
                  <div className="dropdown-item" onClick={() => navigate("/login")} style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#ef4444", fontWeight: "500" }}>Sign Out</div>
                </div>
              )}
            </div>

          </div>
        </div>
      
    </>
  );
}

export default ProfileHeader;