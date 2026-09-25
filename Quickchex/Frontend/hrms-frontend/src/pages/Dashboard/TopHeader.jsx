import "./topHeader.css";
import navImg from "../../assets/img/nav_img.png";
import TopRightMenu from "../../components/TopRightMenu";
import { useNavigate } from "react-router-dom"; // ✅ ADD THIS

const TopHeader = ({ title }) => {
  const navigate = useNavigate(); // ✅ INIT

  return (
    <div
      className="top-header"
      style={{
        backgroundImage: `
          linear-gradient(
            90deg,
            rgba(124,58,237,0.85),
            rgba(124,58,237,0.4)
          ),
          url(${navImg})
        `
      }}
    >
      {/* 🔥 CLICKABLE TITLE */}
      <h2
        className="header-title"
        onClick={() => navigate("/dashboard")}   // ✅ NAVIGATE HERE
      >
        ← {title}
      </h2>

      <div className="header-top-right">
        <TopRightMenu />
      </div>
    </div>
  );
};

export default TopHeader;