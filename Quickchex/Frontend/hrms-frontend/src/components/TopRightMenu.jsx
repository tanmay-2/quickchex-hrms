import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  PiBellDuotone, PiUserCircleDuotone, PiSlidersHorizontalDuotone, 
  PiUserGearDuotone, PiBookOpenDuotone, PiSignOutDuotone,
  PiMoonDuotone,
  PiSunDuotone,
  PiCalendarBlankDuotone, PiCaretDownBold, PiCaretUpBold
} from "react-icons/pi";
import "./TopRightMenu.css";
import { useTheme } from "../theme/ThemeProvider";

function TopRightMenu({ profileImage, fullName, email, headerCollapsed, setHeaderCollapsed }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const navigate = useNavigate();

  // ── CLOSE ON OUTSIDE CLICK ──
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getInitials = (n) =>
    n ? n.trim().split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";

  // Theme & Logout
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const handleLogout = () => {
    localStorage.clear(); 
    sessionStorage.clear();
    navigate("/login"); 
  };

  // Dynamic date calculation
  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

  return (
    <div className="top-right-menu" ref={ref} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

      {/* Date button */}
      <button className="de-header-btn de-date-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#6b7280', fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>
        <PiCalendarBlankDuotone />
        <span>{formattedDate}</span>
      </button>

      {/* AVATAR WRAPPER */}
      <div className="de-profile-wrapper-header" style={{ position: 'relative' }}>
        <div 
          className="de-header-avatar" 
          onClick={() => setOpen(!open)}
          style={{ cursor: 'pointer' }}
        >
          {profileImage ? (
            <img src={profileImage} alt="Profile" onError={(e) => { e.target.style.display = 'none' }} />
          ) : (
            <span>{getInitials(fullName)}</span>
          )}
        </div>

        {/* DROPDOWN */}
        {open && (
          <div className="de-profile-dropdown" style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', zIndex: 100 }}>
            <div className="de-dropdown-user">
              <div className="de-dropdown-avatar">
                {profileImage ? (
                  <img src={profileImage} alt="" onError={(e) => { e.target.style.display = 'none' }} />
                ) : (
                  <span>{getInitials(fullName)}</span>
                )}
              </div>
              <div>
                <p className="de-dropdown-name">{fullName || "—"}</p>
                <p className="de-dropdown-email">{email || "—"}</p>
              </div>
            </div>

            <div className="de-dropdown-divider" />

            <ul className="de-dropdown-menu">
              <li className="de-dropdown-item"><PiUserCircleDuotone className="de-di-icon"/> My Profile</li>
              <li className="de-dropdown-item"><PiSlidersHorizontalDuotone className="de-di-icon"/> Settings</li>
              <li className="de-dropdown-item"><PiUserGearDuotone className="de-di-icon"/> My Account</li>
              <li className="de-dropdown-item"><PiBookOpenDuotone className="de-di-icon"/> Knowledge Base</li>
              <li
                className="de-dropdown-item trm-theme"
                onClick={toggleTheme}
                style={{ cursor: "pointer" }}
              >
                {isDark ? <PiSunDuotone className="de-di-icon"/> : <PiMoonDuotone className="de-di-icon"/>}
                {isDark ? "Light mode" : "Dark mode"}
                <span className={`trm-switch ${isDark ? "on" : ""}`} aria-hidden="true"><span className="trm-knob" /></span>
              </li>
              <li className="de-dropdown-item de-danger" onClick={handleLogout} style={{ cursor: 'pointer' }}>
                <PiSignOutDuotone className="de-di-icon"/> Logout
              </li>
            </ul>
          </div>
        )}
      </div>

    </div>
  );
}

export default TopRightMenu;