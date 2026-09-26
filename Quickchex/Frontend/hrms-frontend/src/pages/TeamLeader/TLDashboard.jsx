import { useState, useEffect } from "react";
import {
  PiHouseDuotone, PiGearDuotone, PiCalendarBlankDuotone, PiCaretDownBold, PiCaretUpBold
} from "react-icons/pi";
import Sidebar from "../../components/sidebar/sidebar_tl";
import TopRightMenu from "../../components/TopRightMenu"; // Adjust path if needed
import "../Dashboard/Dashboard_emp.css";

function Dashboard_tl() {
  const [expanded, setExpanded] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const token = localStorage.getItem("token");
  const empCode = localStorage.getItem("emp_code");

  // ── Fetch profile ──────────────────
  useEffect(() => {
    if (!empCode) { setProfileLoading(false); return; }

    fetch(`https://quickchex-backend.onrender.com/profile/${empCode}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setProfileImage(data?.profile_image || null);
      })
      .catch((err) => console.error("Profile fetch error:", err))
      .finally(() => setProfileLoading(false));
  }, [empCode, token]);

  // ── Derived profile values ─────────
  const fullName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.replace(/\s+/g, " ").trim()
    : "";

  const email = profile?.email ?? "—";
  const phone = profile?.mobile_no ?? "—";
  const designation = profile?.designation ?? "—";
  const department = profile?.department ?? "—";
  const branchLocation = profile?.branch_location ?? "—";
  const formattedJoinDate = profile?.emp_join_date
    ? new Date(profile.emp_join_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const getInitials = (n) =>
    n ? n.trim().split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";

  if (profileLoading) {
    return (
      <div className="de-layout">
        <Sidebar expanded={expanded} setExpanded={setExpanded} />
        <div className={`de-main-content ${expanded ? "expanded" : ""}`}>
          <div className="de-dashboard-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
            <p>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="de-layout">
      <Sidebar expanded={expanded} setExpanded={setExpanded} />

      <div className={`de-main-content ${expanded ? "expanded" : ""}`}>
        {/* HEADER */}
        <div className="de-emp-header" style={{ display: "flex", justifyContent: "flex-end" }}>
          <div className="de-header-right">
            <button className="de-header-btn de-date-btn">
              <PiCalendarBlankDuotone />
              <span>{new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}</span>
            </button>
            <button
              className="de-header-btn de-collapse-btn"
              onClick={() => setHeaderCollapsed(!headerCollapsed)}
            >
              {headerCollapsed ? <PiCaretDownBold /> : <PiCaretUpBold />}
            </button>

            {/* 🔥 REUSABLE TOP RIGHT MENU */}
            <TopRightMenu profileImage={profileImage} fullName={fullName} email={email} />
          </div>
        </div>

        {/* PROFILE CARD */}
        <div className="de-dashboard-container">
          <div className="de-profile-card">
            <div className="de-profile-dark">
              <div className="de-profile-avatar">
                {profileImage
                  ? <img src={profileImage} alt="" onError={() => setProfileImage(null)} />
                  : <span>{getInitials(fullName)}</span>
                }
                <span className="de-online-dot" />
              </div>
              <div>
                <h3>{fullName || "—"}</h3>
                <p>{designation} &bull; {department}</p>
              </div>
            </div>

            <div className="de-profile-body">
              <div className="de-profile-field"><label>Phone</label><p>{phone}</p></div>
              <div className="de-profile-field"><label>Email</label><p>{email}</p></div>
              <div className="de-profile-field"><label>Office</label><p>{branchLocation}</p></div>
              <div className="de-profile-field"><label>Joined</label><p>{formattedJoinDate}</p></div>
            </div>
          </div>
        </div>

        <button className="de-floating-settings"><PiGearDuotone /></button>
      </div>
    </div>
  );
}

export default Dashboard_tl;