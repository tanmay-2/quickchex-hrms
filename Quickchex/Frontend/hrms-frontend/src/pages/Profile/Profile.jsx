import { useState, useEffect } from "react";
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
} from "react-icons/pi";

import SidebarAdmin from "../../components/sidebar/Sidebar";
import SidebarEmp from "../../components/sidebar/Sidebar_emp";
import SidebarTL from "../../components/sidebar/sidebar_tl";
import TopRightMenu from "../../components/TopRightMenu";
import ProfileSidebar from "./components/ProfileSidebar";

import Personal from "./sections/Personal";
import Employment from "./sections/Employment";
import Statutory from "./sections/Statutory";
import Salary from "./sections/Salary";
import Transaction from "./sections/Transaction";
import Documents from "./sections/Documents";

import "./Profile.css";

import { getApiBaseUrl as _getApiBaseUrl } from '../../utils/apiBase';
const API = _getApiBaseUrl();

const SECTION_LABELS = {
  personal: "Personal",
  employment: "Employment",
  statutory: "Statutory",
  salary: "Salary",
  transaction: "Transaction",
  documents: "Documents",
};

function Profile() {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const role = localStorage.getItem("role");
  const canEdit = role === "admin" || role === "superadmin";

  let SidebarComponent = SidebarEmp;
  if (role === "admin" || role === "superadmin") SidebarComponent = SidebarAdmin;
  else if (role === "teamleader") SidebarComponent = SidebarTL;

  useEffect(() => {
    if (!canEdit) setIsEditing(false);
  }, [canEdit]);

  const empCode =
    location.state?.emp_code ||
    location.state?.empCode ||
    localStorage.getItem("emp_code");

  useEffect(() => {
    if (!empCode) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/profile/${empCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch profile data");
        const data = await res.json();

        setFormData({
          emp_code: data.emp_code || "",
          first_name: data.first_name || "",
          middle_name: data.middle_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          mobile: data.mobile_no || "",
          gender: data.gender || "",
          dob: data.dob ? data.dob.split("T")[0] : "",
          marital_status: data.marital_status || "",
          pan: data.pan_no || "",
          aadhar: data.aadhar_no || "",
          father_name: data.father_name || "",
          mother_name: data.mother_name || "",
          family_contact: data.family_contact || "",

          address1: data.address1 || "",
          address2: data.address2 || "",
          country: data.country || "",
          state: data.state || "",
          city: data.city || "",
          pincode: data.pincode || "",

          joining_date: data.emp_join_date ? data.emp_join_date.split("T")[0] : "",

          employment_type: data.employment_type || "",
          skill_level: data.skill_level || "",
          emp_effective_from: data.emp_effective_from || "",
          emp_effective_to: data.emp_effective_to || "",
          confirmation_due: data.confirmation_due || "",
          confirmation_date: data.confirmation_date || "",
          employment_status: data.employment_status || "",
          job_effective_from: data.job_effective_from || "",
          job_effective_to: data.job_effective_to || "",
          location: data.branch_location || "",
          department: data.department || "",
          designation: data.designation || "",
          reporting_supervisor: data.reporting_supervisor || "",

          pf_applicable: data.pf_applicable || "",
          esic_applicable: data.esic_applicable || "",
          pt_applicable: data.pt_applicable || "",
          lwf_applicable: data.lwf_applicable || "",
          it_applicable: data.it_applicable || "",
          gratuity_applicable: data.gratuity_applicable || "",
          nps_applicable: data.nps_applicable || "",
          pran_number: data.pran_number || "",
          tax_regime: data.tax_regime || "",
          tax_regime_updated_at: data.tax_regime_updated_at || "",
          tax_regime_updated_by: data.tax_regime_updated_by || "",
          decimal_rates_allowed: data.decimal_rates_allowed || "",
          tax_no_on_pan: data.tax_no_on_pan || "",
          profile_image: data.profile_image || "",
        });
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

  const renderSection = () => {
    const props = { isEditing, formData, setFormData };
    switch (activeSection) {
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
    { icon: <PiMapPinDuotone />, label: "Branch location", value: formData.location },
    { icon: <PiPhoneDuotone />, label: "Mobile", value: formData.mobile },
    { icon: <PiEnvelopeSimpleDuotone />, label: "Email", value: formData.email },
    { icon: <PiBuildingsDuotone />, label: "Department", value: formData.department },
    { icon: <PiUserDuotone />, label: "Position", value: formData.designation },
  ];

  return (
    <div className="pf-shell">
      <SidebarComponent expanded={expanded} setExpanded={setExpanded} />

      <div className="pf-main" style={{ marginLeft: expanded ? 260 : 76 }}>
        <header className="pf-topbar">
          <button
            type="button"
            className="pf-back-btn"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(role === "employee" ? "/dashboard_emp" : role === "teamleader" ? "/dashboard_tl" : "/dashboard");
            }}
            title="Back to Dashboard"
          >
            <PiArrowLeftBold size={16} />
            <span>Back to Dashboard</span>
          </button>

          <TopRightMenu
            profileImage={formData.profile_image}
            fullName={fullName}
            email={formData.email}
            headerCollapsed={false}
            setHeaderCollapsed={() => { }}
          />
        </header>

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
                    <button type="button" className="pf-btn" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
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

            {loading ? <div className="pf-card pf-loading">Loading profile…</div> : renderSection()}
          </main>
        </div>
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