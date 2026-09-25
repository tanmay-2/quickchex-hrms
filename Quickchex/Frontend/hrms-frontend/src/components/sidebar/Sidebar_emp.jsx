import { useState, useEffect } from "react";
import {
  PiHouseDuotone,
  PiIdentificationCardDuotone,
  PiCalendarCheckDuotone,
  PiListChecksDuotone,       // 🔥 Added for Daily Task
  PiTicketDuotone    // 🔥 Added for Ticket
} from "react-icons/pi";
import { useNavigate, useLocation } from "react-router-dom";
import "./sidebar.css"; // ✅ USE SAME CSS

import logo from "../../assets/img/logo.png";
import fullLogo from "../../assets/img/laesfera_full_logo.png";

const menu = [
  { 
    icon: <PiHouseDuotone />, 
    label: "Dashboard", 
    path: "/dashboard_emp" 
  },
  {
    icon: <PiIdentificationCardDuotone />,
    label: "My Profile",
    path: "/dashboard_emp/profile",
  },
  {
    icon: <PiCalendarCheckDuotone />,
    label: "Attendance",
    children: [
      { label: "My Attendance", path: "/dashboard_emp/attendance" },
      { label: "My Regularization Request", path: "/dashboard_emp/regularization" },
    ],
  },
  {
    icon: <PiCalendarCheckDuotone />,
    label: "Leave",
    children: [
      // { label: "Leave Calendar", path: "/" },
      { label: "My Application", path: "/dashboard_emp/leave" },
        //  { label: "My Application", path: "/dashboard_emp/leave" },
    ],
  },
 
  {
    icon: <PiListChecksDuotone />, // 🔥 Updated to PiListChecksDuotone
    label: "Daily Task",
    path: "/dashboard_emp/dailytask",
  },
  {
    icon: <PiTicketDuotone />, // 🔥 Updated to PiTicketDuotone
    label: "Ticket",
    path: "/dashboard_emp/create_ticket",
  },
  {
    icon: <PiTicketDuotone />, // 🔥 Updated to PiTicketDuotone
    label: "Company Policies",
    path: "/dashboard_emp/policies",
  },
];

function Sidebar_emp({ expanded, setExpanded }) {
  const [openSection, setOpenSection] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    menu.forEach((item, index) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (sub) => sub.path === location.pathname
        );
        if (isChildActive) {
          setOpenSection(index);
        }
      }
    });
  }, [location.pathname]);

  return (
    <div
      className={`sidebar ${expanded ? "expanded" : ""}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* LOGO */}
      <div className="logo" onClick={() => navigate("/dashboard_emp")}>
        {expanded ? (
          <img src={fullLogo} alt="LA ESFERA" style={{ height: "34px", width: "auto", maxWidth: "150px", objectFit: "contain" }} />
        ) : (
          <img src={logo} alt="Logo" />
        )}
      </div>

      <ul>
        {menu.map((item, i) => {
          // ✅ EXACT SAME ACTIVE LOGIC AS ADMIN SIDEBAR
          const isActive =
            expanded
              ? (item.path && location.pathname === item.path)
              : (
                (item.path && location.pathname === item.path) ||
                (item.children &&
                  item.children.some((sub) => sub.path === location.pathname))
              );

          return (
            <li key={i}>
              <div
                className={`menu-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (item.children) {
                    setOpenSection(openSection === i ? null : i);
                  } else if (item.path) {
                    setOpenSection(null);
                    navigate(item.path);
                  }
                }}
              >
                <span className="icon">{item.icon}</span>

                {expanded && (
                  <>
                    <span className="label">{item.label}</span>

                    {item.children && (
                      <span className="arrow">
                        {openSection === i ? "−" : "+"}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* SUBMENU */}
              {item.children && openSection === i && expanded && (
                <ul className="submenu">
                  {item.children.map((sub, j) => {
                    const isSubActive =
                      sub.path && location.pathname === sub.path;

                    return (
                      <li
                        key={j}
                        className={`submenu-item ${isSubActive ? "active-sub" : ""
                          }`}
                        onClick={() => {
                          if (sub.path) {
                            setOpenSection(null);
                            navigate(sub.path);
                          }
                        }}
                      >
                        {sub.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Sidebar_emp;