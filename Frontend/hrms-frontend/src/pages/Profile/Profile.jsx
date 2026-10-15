import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PiArrowLeftBold,
  PiCalendarBlankDuotone,
  PiMapPinDuotone,
  PiPhoneDuotone,
  PiEnvelopeSimpleDuotone,
  PiBuildingsDuotone,
  PiUserDuotone,
  PiCheckCircleDuotone,
  PiXCircleDuotone,
  PiPencilSimpleDuotone,
  PiFloppyDiskDuotone,
  PiIdentificationCardDuotone,
  PiCameraBold,
} from "react-icons/pi";

import SidebarAdmin from "../../components/sidebar/Sidebar";
import SidebarEmp from "../../components/sidebar/Sidebar_emp";
import SidebarTL from "../../components/sidebar/sidebar_tl";
import TopRightMenu from "../../components/TopRightMenu";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import ProfileSidebar, { getCleanImageUrl } from "./components/ProfileSidebar";

import Personal from "./sections/Personal";
import Employment from "./sections/Employment";
import Statutory from "./sections/Statutory";
import Salary from "./sections/Salary";
import Transaction from "./sections/Transaction";
import Documents from "./sections/Documents";

import "./Profile.css";
import { getApiBaseUrl, getApiUrl } from "../../services/apiClient";

const API = getApiBaseUrl();

const SECTION_LABELS = {
  personal: "Personal",
  employment: "Employment",
  statutory: "Statutory",
  salary: "Salary",
  transaction: "Transaction",
  documents: "Documents",
};

const SECTIONS = [
  { id: "personal",    label: "Personal" },
  { id: "employment",  label: "Employment" },
  { id: "statutory",   label: "Statutory" },
  { id: "salary",      label: "Salary" },
  { id: "transaction", label: "Transaction" },
  { id: "documents",   label: "Documents" },
];

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();

  const role = localStorage.getItem("role");
  const canEdit = role === "admin" || role === "superadmin";

  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });
  const [mobileImgError, setMobileImgError] = useState(false);
  const tabsRef = useRef(null);

  let SidebarComponent = SidebarEmp;
  if (role === "admin" || role === "superadmin") SidebarComponent = SidebarAdmin;
  else if (role === "teamleader") SidebarComponent = SidebarTL;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } else {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  useEffect(() => {
    if (!canEdit) setIsEditing(false);
  }, [canEdit]);

  const empCode =
    location.state?.emp_code ||
    location.state?.empCode ||
    localStorage.getItem("emp_code") ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || localStorage.getItem("userData") || "{}");
        return u.emp_code || "";
      } catch {
        return "";
      }
    })() ||
    (role === "admin" || role === "superadmin" ? "ADM001" : "");

  const [formData, setFormData] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || localStorage.getItem("userData") || "{}");
      const code =
        location.state?.emp_code ||
        location.state?.empCode ||
        localStorage.getItem("emp_code") ||
        u.emp_code ||
        (role === "admin" || role === "superadmin" ? "ADM001" : "");
      return {
        emp_code: code || "",
        first_name: u.first_name || (u.name ? u.name.split(" ")[0] : "") || "",
        last_name: u.last_name || (u.name ? u.name.split(" ").slice(1).join(" ") : "") || "",
        email: u.email || localStorage.getItem("loginEmail") || "",
        mobile: u.mobile || u.mobile_no || u.phone || u.contact || "",
        gender: u.gender || "",
        dob: u.dob ? u.dob.split("T")[0] : "",
        marital_status: u.marital_status || "",
        address1: u.address1 || "",
        city: u.city || "",
        state: u.state || "",
        country: u.country || "",
        pincode: u.pincode || "",
        employment_type: u.employment_type || "Full-time",
        employment_status: u.employment_status || "Active",
        joining_date: u.joining_date || u.emp_join_date || "",
        department: u.department || "",
        designation: u.designation || localStorage.getItem("designation") || "",
        location: u.branch_location || u.location || "Mumbai, IN",
        reporting_supervisor: u.reporting_supervisor || u.manager || "—",
        profile_image: u.profile_image || localStorage.getItem("profile_image") || "",
        ...u,
      };
    } catch {
      return {};
    }
  });

  useEffect(() => {
    setMobileImgError(false);
  }, [formData?.profile_image]);

  useEffect(() => {
    if (!empCode) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        let res = await fetch(getApiUrl(`/profile/${empCode}`), { headers });
        if (!res.ok) {
          res = await fetch(getApiUrl(`/api/v1/profile/${empCode}`), { headers });
        }
        if (!res.ok) throw new Error("Failed to fetch profile data");
        const data = await res.json();

        setFormData((prev) => ({
          ...prev,
          emp_code: data.emp_code || prev.emp_code || "",
          first_name: data.first_name || prev.first_name || "",
          middle_name: data.middle_name || prev.middle_name || "",
          last_name: data.last_name || prev.last_name || "",
          email: data.email || prev.email || "",
          mobile: data.mobile_no || data.mobile || prev.mobile || "",
          gender: data.gender || prev.gender || "",
          dob: data.dob ? data.dob.split("T")[0] : prev.dob || "",
          marital_status: data.marital_status || prev.marital_status || "",
          pan: data.pan_no || data.pan || prev.pan || "",
          aadhar: data.aadhar_no || data.aadhar || prev.aadhar || "",
          father_name: data.father_name || prev.father_name || "",
          mother_name: data.mother_name || prev.mother_name || "",
          family_contact: data.family_contact || prev.family_contact || "",

          address1: data.address1 || prev.address1 || "",
          address2: data.address2 || prev.address2 || "",
          country: data.country || prev.country || "",
          state: data.state || prev.state || "",
          city: data.city || prev.city || "",
          pincode: data.pincode || prev.pincode || "",

          joining_date: data.emp_join_date ? data.emp_join_date.split("T")[0] : (data.joining_date || prev.joining_date || ""),

          employment_type: data.employment_type || prev.employment_type || "",
          skill_level: data.skill_level || prev.skill_level || "",
          emp_effective_from: data.emp_effective_from || prev.emp_effective_from || "",
          emp_effective_to: data.emp_effective_to || prev.emp_effective_to || "",
          confirmation_due: data.confirmation_due || prev.confirmation_due || "",
          confirmation_date: data.confirmation_date || prev.confirmation_date || "",
          employment_status: data.employment_status || prev.employment_status || "",
          job_effective_from: data.job_effective_from || prev.job_effective_from || "",
          job_effective_to: data.job_effective_to || prev.job_effective_to || "",
          location: data.branch_location || data.location || prev.location || "",
          department: data.department || prev.department || "",
          designation: data.designation || prev.designation || "",
          reporting_supervisor: data.reporting_supervisor || prev.reporting_supervisor || "",

          pf_applicable: data.pf_applicable || prev.pf_applicable || "",
          esic_applicable: data.esic_applicable || prev.esic_applicable || "",
          pt_applicable: data.pt_applicable || prev.pt_applicable || "",
          lwf_applicable: data.lwf_applicable || prev.lwf_applicable || "",
          it_applicable: data.it_applicable || prev.it_applicable || "",
          gratuity_applicable: data.gratuity_applicable || prev.gratuity_applicable || "",
          nps_applicable: data.nps_applicable || prev.nps_applicable || "",
          pran_number: data.pran_number || prev.pran_number || "",
          tax_regime: data.tax_regime || prev.tax_regime || "",
          tax_regime_updated_at: data.tax_regime_updated_at || prev.tax_regime_updated_at || "",
          tax_regime_updated_by: data.tax_regime_updated_by || prev.tax_regime_updated_by || "",
          decimal_rates_allowed: data.decimal_rates_allowed || prev.decimal_rates_allowed || "",
          tax_no_on_pan: data.tax_no_on_pan || prev.tax_no_on_pan || "",
          profile_image: data.profile_image || prev.profile_image || "",
        }));
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [empCode]);

  const handleSave = async () => {
    const flash = (message, type) => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    };

    try {
      const clean = (v) => (v === "" ? null : v);
      const asDate = (d) => (d ? d.split("T")[0] : null);

      const payload = {
        ...formData,
        mobile: clean(formData.mobile),
        aadhar: clean(formData.aadhar),
        family_contact: clean(formData.family_contact),
        dob: asDate(formData.dob),
        joining_date: asDate(formData.joining_date),
        pf_applicable: formData.pf_applicable ?? null,
        esic_applicable: formData.esic_applicable ?? null,
        pt_applicable: formData.pt_applicable ?? null,
      };

      const res = await fetch(`${API}/api/v1/profile/${empCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.status === "success") flash("Changes saved", "success");
      else flash("Couldn't save changes", "failure");

      setIsEditing(false);
    } catch (err) {
      console.error(err);
      flash("Server error - changes not saved", "error");
    }
  };

  const fullName = `${formData.first_name || ""} ${formData.last_name || ""}`.trim();

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  };

  const renderSection = (sectionId) => {
    const props = { isEditing, formData, setFormData, setToast };
    switch (sectionId || activeSection) {
      case "employment": return <Employment {...props} />;
      case "statutory": return <Statutory {...props} />;
      case "salary": return <Salary {...props} />;
      case "transaction": return <Transaction {...props} />;
      case "documents": return <Documents {...props} />;
      default: return <Personal {...props} />;
    }
  };

  const facts = [
    { icon: <PiCalendarBlankDuotone />, label: "Joined on", value: formatDate(formData.joining_date) },
    { icon: <PiMapPinDuotone />, label: "Branch", value: formData.location },
    { icon: <PiPhoneDuotone />, label: "Mobile", value: formData.mobile },
    { icon: <PiEnvelopeSimpleDuotone />, label: "Email", value: formData.email },
    { icon: <PiBuildingsDuotone />, label: "Department", value: formData.department },
    { icon: <PiUserDuotone />, label: "Position", value: formData.designation },
  ];

  const initials = `${formData.first_name?.charAt(0) || ""}${formData.last_name?.charAt(0) || ""}`.toUpperCase();

  const handleMobileTabClick = (sectionId) => {
    setActiveSection(sectionId);
    if (tabsRef.current) {
      const btn = tabsRef.current.querySelector(`[data-tab="${sectionId}"]`);
      if (btn) btn.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  };

  const handleMobileAvatarChange = async (e) => {
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

    const localUrl = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, profile_image: localUrl }));
    setMobileImgError(false);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const res = await fetch(`${API}/profile/upload-image/${empCode}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
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

  return (
    <div className="pf-shell">
      {/* Sidebar is always mounted so desktop shows sidebar and mobile drawer can open on hamburger click */}
      <SidebarComponent expanded={expanded} setExpanded={setExpanded} />

      <div className="pf-main" style={{ marginLeft: isMobile ? 0 : (expanded ? 260 : 76) }}>
        {isMobile ? (
          <>
            {/* ── Existing LA ESFERA Mobile Header with Hamburger, Logo, Right-Panel, and Back action ── */}
            <DashboardHeader
              title="Profile"
              subtitle="View and manage employee profile and documents."
              showBack={true}
              backUrl={role === "employee" ? "/dashboard_emp" : role === "teamleader" ? "/dashboard_tl" : "/dashboard"}
              onBack={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate(role === "employee" ? "/dashboard_emp" : role === "teamleader" ? "/dashboard_tl" : "/dashboard");
              }}
              name={fullName}
            />

            {/* ── Complete Mobile Profile Layout ── */}
            <div className="pf-mobile-layout">
              {/* Profile summary card */}
              <div className="pf-mb-card">
                <div className="pf-mb-avatar">
                  <div className="pf-mb-avatar__label" title={fullName}>
                    <span className="pf-mb-avatar__initials">{initials || "EM"}</span>
                  </div>
                </div>
                <div className="pf-mb-identity">
                  <h2 className="pf-mb-name">{fullName || "—"}</h2>
                  <p className="pf-mb-role">{formData.designation || "—"}</p>
                  <div className="pf-mb-chips">
                    {formData.department && (
                      <span className="pf-mb-chip">
                        <PiBuildingsDuotone size={12} /> {formData.department}
                      </span>
                    )}
                    {formData.emp_code && (
                      <span className="pf-mb-chip pf-mb-chip--code">{formData.emp_code}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick facts */}
              <div className="pf-mb-facts">
                {facts.filter((f) => f.value).map((f) => (
                  <div className="pf-mb-fact" key={f.label}>
                    <span className="pf-mb-fact__ico">{f.icon}</span>
                    <div>
                      <span className="pf-mb-fact__label">{f.label}</span>
                      <span className="pf-mb-fact__value">{f.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scrollable section tabs */}
              <div className="pf-mb-tabs" ref={tabsRef} role="tablist" aria-label="Profile Sections">
                {SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    data-tab={sec.id}
                    type="button"
                    role="tab"
                    aria-selected={activeSection === sec.id}
                    className={`pf-mb-tab${activeSection === sec.id ? " pf-mb-tab--active" : ""}`}
                    onClick={() => handleMobileTabClick(sec.id)}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>

              {/* Edit bar */}
              {canEdit && activeSection !== "documents" && (
                <div className="pf-mb-edit-bar">
                  {isEditing ? (
                    <>
                      <button type="button" className="pf-mb-btn pf-mb-btn--ghost" onClick={() => setIsEditing(false)}>
                        Cancel
                      </button>
                      <button type="button" className="pf-mb-btn pf-mb-btn--primary" onClick={handleSave}>
                        <PiFloppyDiskDuotone size={15} /> Save changes
                      </button>
                    </>
                  ) : (
                    <button type="button" className="pf-mb-btn pf-mb-btn--outline" onClick={() => setIsEditing(true)}>
                      <PiPencilSimpleDuotone size={15} /> Edit profile
                    </button>
                  )}
                </div>
              )}

              {/* Section content */}
              <div className="pf-mb-section">
                {loading && !formData.first_name && !formData.email ? (
                  <div className="pf-mb-loading">Loading profile…</div>
                ) : (
                  renderSection(activeSection)
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ── Single Purple Dashboard Header (Desktop & Mobile) ── */}
            <DashboardHeader
              title="Profile"
              subtitle="View and manage employee profile and documents."
              name={fullName}
            />

            {/* ── Desktop layout body ── */}
            <div className="pf-body">
              <aside className="pf-aside">
                <ProfileSidebar
                  activeSection={activeSection}
                  setActiveSection={setActiveSection}
                  employee={formData}
                  setToast={setToast}
                />
              </aside>

              <main className="pf-content">
                <section className="pf-facts">
                  {facts.map((f) => (
                    <div className="pf-fact" key={f.label}>
                      <span className="pf-fact-ico">{f.icon}</span>
                      <span className="pf-fact-label">{f.label}</span>
                      <span className="pf-fact-value">{f.value || "\u2014"}</span>
                    </div>
                  ))}
                </section>

                <div className="pf-section-bar">
                  <h2>{SECTION_LABELS[activeSection]}</h2>
                  {canEdit && activeSection !== "documents" && (
                    isEditing ? (
                      <div className="pf-actions">
                        <button type="button" className="pf-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                        <button type="button" className="pf-btn pf-btn-primary" onClick={handleSave}>
                          <PiFloppyDiskDuotone /> Save changes
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="pf-btn" onClick={() => setIsEditing(true)}>
                        <PiPencilSimpleDuotone /> Edit
                      </button>
                    )
                  )}
                </div>

                {loading && !formData.first_name && !formData.email ? (
                  <div className="pf-card pf-loading">Loading profile…</div>
                ) : (
                  renderSection(activeSection)
                )}
              </main>
            </div>
          </>
        )}
      </div>

      {toast.show && (
        <div className="pf-toast-wrap" role="status">
          <div className={`pf-toast is-${toast.type}`}>
            <span className="pf-toast-ico">
              {toast.type === "success" ? <PiCheckCircleDuotone /> : <PiXCircleDuotone />}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;