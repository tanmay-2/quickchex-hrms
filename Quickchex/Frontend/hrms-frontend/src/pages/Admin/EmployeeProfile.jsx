import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Save,
  X,
  Eye,
  Download,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Briefcase,
  Building2,
  CheckCircle2,
  Users,
  User,
  IndianRupee,
  BadgeCheck,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardShell } from "../../components/header/DashboardHeader";
import "./EmployeeProfile.css";

/* =========================================================
   EMPLOYEE PROFILE / PERSONAL DETAILS
   Subpage of Employee Directory.
   Renders inside the shared DashboardShell (sidebar + shared
   3D purple header). Purple HRMS theme, no orange.
   Route: /dashboard/employees/:employeeId
   ========================================================= */

const SECTIONS = [
  { id: "personal", label: "Personal" },
  { id: "employment", label: "Employment" },
  { id: "statutory", label: "Statutory" },
  { id: "salary", label: "Salary" },
  { id: "tax", label: "Tax" },
  { id: "documents", label: "Documents" },
  { id: "other", label: "Other Details" },
  { id: "transaction", label: "Transaction" },
  { id: "changelog", label: "Change Logs" },
];

const ALL_DIRECTORY_DEFAULT = [];


const TONES = [
  "tone-purple", "tone-pink", "tone-blue", "tone-green",
  "tone-amber", "tone-cyan", "tone-rose", "tone-indigo",
];

const getInitials = (name) => {
  if (!name) return "—";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0] ? parts[0][0] : "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const statusOf = (base) => {
  if (base.type === "Contract") return "Contract";
  if (base.joined > "2026-01-01") return "Probation";
  return "Active";
};

const readProfileName = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    return (
      localStorage.getItem("user_name") ||
      storedUser?.name ||
      storedUser?.full_name ||
      "HR Admin"
    );
  } catch {
    return "HR Admin";
  }
};

/* ── deterministic per-index seeds so every employee gets
   a realistic, unique but stable set of profile details ── */
const SEEDS = [
  { gender: "Female", marital: "Married", blood: "B+", bank: "HDFC Bank", pan: "AKPRA4521K", bankAccount: "50100234567890", ifsc: "HDFC0001234", supervisor: "LE103", gross: "142000", ctc: "182000" },
  { gender: "Male", marital: "Single", blood: "O+", bank: "ICICI Bank", pan: "BRLPW8890M", bankAccount: "10204567890123", ifsc: "ICIC0000234", supervisor: "LE103", gross: "98000", ctc: "124000" },
  { gender: "Female", marital: "Married", blood: "A-", bank: "Axis Bank", pan: "CDTPS3345P", bankAccount: "91102003456781", ifsc: "UTIB0000445", supervisor: "LE001", gross: "165000", ctc: "210000" },
  { gender: "Male", marital: "Married", blood: "AB+", bank: "State Bank of India", pan: "DCEQE2210K", bankAccount: "30123456789012", ifsc: "SBIN0000987", supervisor: "LE103", gross: "76000", ctc: "96000" },
  { gender: "Female", marital: "Single", blood: "O-", bank: "Kotak Mahindra Bank", pan: "EJWPF7789Q", bankAccount: "221234567890", ifsc: "KKBK0000678", supervisor: "LE105", gross: "132000", ctc: "168000" },
  { gender: "Female", marital: "Married", blood: "B-", bank: "HDFC Bank", pan: "FKXPH1234L", bankAccount: "50101234512345", ifsc: "HDFC0000888", supervisor: "LE103", gross: "121000", ctc: "154000" },
  { gender: "Female", marital: "Single", blood: "A+", bank: "ICICI Bank", pan: "GHRPI6655N", bankAccount: "60204567890123", ifsc: "ICIC0000456", supervisor: "LE103", gross: "128000", ctc: "161000" },
  { gender: "Male", marital: "Married", blood: "O+", bank: "DBS Bank", pan: "HJKAS9977R", bankAccount: "123123123123", ifsc: "DBSS0IN0811", supervisor: "LE103", gross: "147000", ctc: "188000" },
  { gender: "Male", marital: "Single", blood: "AB-", bank: "Axis Bank", pan: "IKLPW4432T", bankAccount: "91102004567890", ifsc: "UTIB0000789", supervisor: "LE107", gross: "88000", ctc: "112000" },
  { gender: "Female", marital: "Married", blood: "O+", bank: "HDFC Bank", pan: "JWLQH8811P", bankAccount: "50103456789012", ifsc: "HDFC0000444", supervisor: "LE107", gross: "94000", ctc: "120000" },
  { gender: "Male", marital: "Single", blood: "B+", bank: "ICICI Bank", pan: "KMRXB2282S", bankAccount: "10206789012345", ifsc: "ICIC0000987", supervisor: "LE107", gross: "64000", ctc: "82000" },
  { gender: "Female", marital: "Single", blood: "A+", bank: "Kotak Mahindra Bank", pan: "LNRWC8890R", bankAccount: "221267890123", ifsc: "KKBK0000777", supervisor: "LE108", gross: "91000", ctc: "116000" },
  { gender: "Male", marital: "Married", blood: "O-", bank: "State Bank of India", pan: "MPSVK5560N", bankAccount: "30124567890123", ifsc: "SBIN0001234", supervisor: "LE108", gross: "87000", ctc: "111000" },
  { gender: "Female", marital: "Married", blood: "A-", bank: "HDFC Bank", pan: "NQTBH9912L", bankAccount: "50104567890123", ifsc: "HDFC0000666", supervisor: "LE108", gross: "74000", ctc: "94000" },
  { gender: "Male", marital: "Single", blood: "B+", bank: "Emirates NBD", pan: "OPRWD3344J", bankAccount: "1234567890123456", ifsc: "EBILAEAD", supervisor: "LE106", gross: "106000", ctc: "135000" },
  { gender: "Female", marital: "Single", blood: "O+", bank: "Nordea Bank", pan: "QTSXZ6677P", bankAccount: "9876543210987654", ifsc: "NDEASESS", supervisor: "LE106", gross: "82000", ctc: "104000" },
];

/* Build a full, realistic profile object for a directory member */
const makeProfile = (base) => {
  const idx = Math.max(0, parseInt(String(base.id).replace(/\D/g, ""), 10) - 1);
  const seed = SEEDS[idx % SEEDS.length] || SEEDS[0];
  const gross = Number(seed.gross) || 90000;
  const basic = Math.round(gross * 0.46);
  const hra = Math.round(basic * 0.5);
  const special = gross - basic - hra;
  return {
    ...base,
    status: statusOf(base),
    tone: TONES[idx % TONES.length],
    fullName: base.name,
    personal: {
      firstName: base.name.split(" ")[0] || "",
      lastName: base.name.split(" ").slice(1).join(" ") || "",
      email: base.email,
      mobile: base.phone,
      gender: seed.gender,
      dob: `${1988 + (idx % 12)}-0${(idx % 9) + 1}-1${idx % 9}`,
      maritalStatus: seed.marital,
      bloodGroup: seed.blood,
      pan: seed.pan,
      aadhar: `${String(3187 + idx).padStart(4, "0")} ${String(5610 + idx).padStart(4, "0")} ${String(9034 + idx).padStart(4, "0")}`,
      nationality: "Indian",
    },
    family: {
      fatherName: `${base.name.split(" ")[0]} ${seed.supervisor.slice(1)} ${base.name.split(" ").slice(-1)[0]}`,
      motherName: `${base.name.split(" ")[0]} ${base.name.split(" ").slice(-1)[0]} Devi`,
      spouseName: idx % 2 === 0 ? `${seed.gender === "Male" ? "Meera" : "Arjun"} ${base.name.split(" ").slice(-1)[0]}` : "",
      emergencyContact: base.phone.replace(/[^\d+]/g, "").slice(0, 10),
      emergencyRelation: idx % 2 === 0 ? "Spouse" : "Parent",
      familyContact: base.phone.replace(/[^\d+]/g, "").slice(0, 10),
    },
    address: {
      address1: `Block ${String.fromCharCode(65 + (idx % 6))}, ${104 + idx} Palm Grove`,
      address2: `${base.location.includes(",") ? base.location.split(",")[0] : "Central District"}`,
      city: base.location.includes(",") ? base.location.split(",")[0].trim() : "Mumbai",
      state: idx % 2 === 0 ? "Karnataka" : "Maharashtra",
      country: base.location.includes("IN") ? "India" : "United States",
      pincode: `${400000 + idx * 123}`,
      permanentSame: true,
    },
    payment: {
      bankName: seed.bank,
      accountNumber: seed.bankAccount,
      ifsc: seed.ifsc,
      upi: `${base.name.split(" ")[0].toLowerCase()}@okbank`,
      paymentMode: "Bank Transfer",
      salaryAccount: true,
    },
    employment: {
      empCode: base.empCode,
      joiningDate: base.joined,
      employmentType: base.type === "Contract" ? "Contract" : "Full Time",
      skillLevel: idx % 3 === 0 ? "Lead" : idx % 3 === 1 ? "Senior" : "Junior",
      effectiveFrom: base.joined,
      effectiveTo: base.type === "Contract" ? "2026-12-31" : "",
      confirmationDue: "2026-02-28",
      confirmationDate: base.joined > "2024-06-01" ? "" : "2020-09-30",
      employmentStatus: base.type === "Contract" ? "Contract" : "Confirmed",
      jobEffectiveFrom: base.joined,
      jobEffectiveTo: "",
      department: base.department,
      designation: base.designation,
      reportingSupervisor: seed.supervisor,
      workLocation: base.location,
    },
    statutory: {
      pfApplicable: "true",
      esicApplicable: "false",
      ptApplicable: "true",
      lwfApplicable: "false",
      itApplicable: "true",
      gratuityApplicable: "true",
      npsApplicable: "false",
      pranNumber: "",
      uanNumber: `1014${String(890123 + idx * 17)}`,
      pfNumber: `MH/BAN/${String(112233 + idx * 7)}/000/0031${idx % 10}`,
    },
    salary: {
      monthlyGross: gross,
      monthlyCtc: Number(seed.ctc) || gross,
      basic,
      hra,
      specialAllowance: special,
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
    },
    tax: {
      regime: idx % 2 === 0 ? "New Regime" : "Old Regime",
      pan: seed.pan,
      declarationStatus: "Submitted",
      updatedAt: "2026-08-28 11:24 AM",
      updatedBy: readProfileName(),
    },
    other: {
      hobbies: idx % 2 === 0 ? "Trekking, Photography" : "Reading, Chess",
      emergencyAddress: base.location,
      volunteered: idx % 3 === 0 ? "Yes" : "No",
      notes: "",
    },
    documents: [
      { name: `${base.name}_PAN.pdf`, category: "PAN Card", size: "185 KB", uploaded: "2026-01-12", status: "Verified" },
      { name: `${base.name}_Aadhaar.pdf`, category: "Aadhaar Card", size: "240 KB", uploaded: "2026-01-12", status: "Verified" },
      { name: `Offer_Letter_${base.name}.pdf`, category: "Offer Letter", size: "96 KB", uploaded: base.joined, status: "Verified" },
      { name: `Appointment_Letter_${base.name}.pdf`, category: "Appointment Letter", size: "112 KB", uploaded: base.joined, status: "Verified" },
      { name: `Bank_Proof_${base.name}.pdf`, category: "Bank Proof", size: "78 KB", uploaded: "2026-02-02", status: "Pending" },
    ],
    transactions: [
      { ref: `TXN-${1000 + idx}`, type: "Data Change Request", initiatedBy: base.name, lastActivity: "2026-08-28", status: "Pending" },
      { ref: `TXN-${900 + idx}`, type: "Statutory Update", initiatedBy: "HR Admin", lastActivity: "2026-07-14", status: "Completed" },
      { ref: `TXN-${800 + idx}`, type: "Bank Detail Change", initiatedBy: base.name, lastActivity: "2026-05-02", status: "Completed" },
    ],
    changelog: [
      { date: "2026-08-28 11:24 AM", field: "Employment Status", oldValue: "Probation", newValue: "Confirmed", by: readProfileName() },
      { date: "2026-07-14 04:10 PM", field: "Designation", oldValue: "Software Engineer", newValue: base.designation, by: readProfileName() },
      { date: "2026-05-02 09:48 AM", field: "Bank Account", oldValue: "XXXX-XXXX-7821", newValue: `XXXX-XXXX-${seed.bankAccount.slice(-4)}`, by: base.name },
    ],
  };
};

/* Read/merge any locally saved edits for a profile id */
const loadSavedProfile = (id) => {
  try {
    const raw = localStorage.getItem("employee_profiles");
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[id] || null;
  } catch {
    return null;
  }
};

const saveProfileEdits = (profile) => {
  try {
    const raw = localStorage.getItem("employee_profiles");
    const map = raw ? JSON.parse(raw) : {};
    map[profile.id] = profile;
    localStorage.setItem("employee_profiles", JSON.stringify(map));
  } catch (error) {
    console.error("Unable to save profile edits:", error);
  }
};

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams();

  const [activeSection, setActiveSection] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [openCards, setOpenCards] = useState(["basic", "family", "address", "payment"]);
  const [search, setSearch] = useState("");
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const searchRef = useRef(null);
  const [directory, setDirectory] = useState(ALL_DIRECTORY_DEFAULT);

  // Fetch live employee directory for search + prev/next navigation
  useEffect(() => {
    fetch("http://localhost:8000/profile/employees/")
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((e, i) => ({
            id: e.emp_code || e.id || `emp-${i + 1}`,
            name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || "Employee",
            empCode: e.emp_code || "",
            designation: e.designation || e.role || "Employee",
            department: e.department || "General",
            email: e.email || "",
            phone: e.phone || e.mobile || "",
            location: e.location || e.city || "",
            type: e.employment_type || "Full-time",
            joined: e.date_of_joining || e.joining_date || "",
          }));
          setDirectory(mapped);
        }
      })
      .catch(() => { });
  }, []);

  /* Resolve the profile for the current route id */
  useEffect(() => {
    setLoading(true);
    setActiveSection("personal");
    setIsEditing(false);

    const base =
      directory.find((e) => e.id === employeeId) || directory[0];

    // Prefer navigation state passed from Employee Directory
    const stateEmp = typeof window !== "undefined"
      ? window.history?.state?.usr?.employee
      : null;

    const mergedBase = stateEmp && stateEmp.id === employeeId ? stateEmp : base;

    const saved = loadSavedProfile(employeeId);
    const profile = saved || makeProfile(mergedBase || base);
    setEmployee(profile);
    setLoading(false);

    const t = setTimeout(() => {
      setActiveSection("personal");
      setIsEditing(false);
      setOpenCards(["basic", "family", "address", "payment"]);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  /* Close search dropdown on outside click */
  useEffect(() => {
    const handle = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDrop(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const currentIndex = useMemo(
    () => directory.findIndex((e) => e.id === employeeId),
    [employeeId, directory]
  );

  const searchMatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return directory.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.empCode.toLowerCase().includes(term) ||
        e.department.toLowerCase().includes(term) ||
        e.designation.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [search, directory]);

  const goToEmployee = (id) => {
    navigate(`/dashboard/employees/${id}`);
    setShowSearchDrop(false);
    setSearch("");
  };

  const goPrev = () => {
    if (!directory.length) return;
    const prev = directory[(currentIndex - 1 + directory.length) % directory.length];
    goToEmployee(prev.id);
  };

  const goNext = () => {
    if (!directory.length) return;
    const next = directory[(currentIndex + 1) % directory.length];
    goToEmployee(next.id);
  };

  /* Edit field helpers */
  const handleFieldChange = (sectionKey, field, value) => {
    setEmployee((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [field]: value },
    }));
  };

  const handleSave = () => {
    if (!employee) return;
    saveProfileEdits(employee);
    setIsEditing(false);
    toast.success(`${employee.name}'s profile changes saved.`);
  };

  const handleCancel = () => {
    setIsEditing(false);
    const saved = loadSavedProfile(employeeId);
    const base = ALL_DIRECTORY.find((e) => e.id === employeeId) || ALL_DIRECTORY[0];
    setEmployee(saved || makeProfile(base));
  };

  const toggleCard = (key) => {
    setOpenCards((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleViewDoc = (doc) => {
    toast.success(`Opening ${doc.name}`);
  };

  const handleDownloadDoc = (doc) => {
    const blob = new Blob(["Placeholder document content for " + doc.name], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${doc.name}`);
  };

  /* ------------------------- RENDER ------------------------- */

  if (loading || !employee) {
    return (
      <DashboardShell
        customTitle="Employee Profile"
        customSubtitle="View and manage employee details."
      >
        <div className="ep-page">
          <div className="ep-loading">Loading employee profile…</div>
        </div>
      </DashboardShell>
    );
  }

  const per = employee.personal || {};
  const fam = employee.family || {};
  const addr = employee.address || {};
  const pay = employee.payment || {};
  const empSec = employee.employment || {};
  const stat = employee.statutory || {};
  const sal = employee.salary || {};
  const taxSec = employee.tax || {};
  const oth = employee.other || {};
  const docs = employee.documents || [];
  const txns = employee.transactions || [];
  const logs = employee.changelog || [];

  const fmtMoney = (v) =>
    v === "" || v == null ? "—" : `₹ ${Number(v).toLocaleString("en-IN")}`;

  const renderField = (label, value, sectionKey, key, type = "text") => (
    <div className="ep-field" key={key}>
      <label>{label}</label>
      {isEditing ? (
        type === "textarea" ? (
          <textarea
            rows={2}
            value={value ?? ""}
            onChange={(e) =>
              handleFieldChange(sectionKey, key, e.target.value)
            }
          />
        ) : type === "select" ? (
          <select
            value={value ?? ""}
            onChange={(e) =>
              handleFieldChange(sectionKey, key, e.target.value)
            }
          >
            {["true", "false"].includes(String(value)) ? (
              <>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </>
            ) : (
              <option value={value ?? ""}>{value || "—"}</option>
            )}
          </select>
        ) : (
          <input
            type={type}
            value={value ?? ""}
            onChange={(e) =>
              handleFieldChange(sectionKey, key, e.target.value)
            }
          />
        )
      ) : (
        <span className="ep-field-value">{value || "—"}</span>
      )}
    </div>
  );

  /* plain render function (NOT a component) so inputs keep focus while editing */
  const collapseCard = (id, title, icon, children) => {
    const open = openCards.includes(id);
    return (
      <div className="ep-card ep-collapse" key={id}>
        <button
          className="ep-collapse-head"
          onClick={() => toggleCard(id)}
          type="button"
        >
          <span className="ep-collapse-title">
            {icon}
            {title}
          </span>
          <ChevronDown size={17} className={open ? "is-open" : ""} />
        </button>
        {open && <div className="ep-grid">{children}</div>}
      </div>
    );
  };

  return (
    <DashboardShell
      customTitle="Employee Profile"
      customSubtitle="View and manage employee details."
      showBack={true}
      backUrl="/dashboard/employees"
    >
      <Toaster position="top-right" />
      <div className="ep-page">
        {/* ---------- toolbar: search / prev-next ---------- */}
        <div className="ep-toolbar">
          <button
            type="button"
            className="ep-back"
            onClick={() => navigate("/dashboard/employees")}
            title="Back to Employee Directory"
          >
            <ArrowLeft size={16} />
            <span>Back to Employee Directory</span>
          </button>

          <div className="ep-toolbar-right">
            <div className="ep-search" ref={searchRef}>
              <input
                value={search}
                placeholder="Search employees…"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSearchDrop(true);
                }}
                onFocus={() => setShowSearchDrop(true)}
              />
              {showSearchDrop && search.trim() !== "" && (
                <div className="ep-search-drop">
                  {searchMatches.length === 0 ? (
                    <div className="ep-search-empty">No employees found</div>
                  ) : (
                    searchMatches.map((m) => (
                      <button
                        key={m.id}
                        className="ep-search-row"
                        onClick={() => goToEmployee(m.id)}
                      >
                        <span className="ep-mini-avatar">
                          {getInitials(m.name)}
                        </span>
                        <span className="ep-search-name">{m.name}</span>
                        <span className="ep-search-sub">
                          {m.empCode} · {m.designation}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="ep-nav-btns">
              <button onClick={goPrev} title="Previous employee">
                <ChevronLeft size={16} />
              </button>
              <span className="ep-nav-count">
                {currentIndex + 1} / {(ALL_DIRECTORY_DEFAULT || []).length || 1}
              </span>
              <button onClick={goNext} title="Next employee">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ---------- profile header ---------- */}
        <div className="ep-card ep-head">
          <span className={`ep-avatar ${employee.tone}`}>
            {getInitials(employee.name)}
          </span>
          <div className="ep-head-main">
            <h2>{employee.fullName}</h2>
            <p className="ep-head-role">
              {employee.designation} · {employee.department}
            </p>
            <div className="ep-head-meta">
              <span>
                <BadgeCheck size={14} /> {employee.empCode}
              </span>
              <span>
                <Mail size={14} /> {employee.email}
              </span>
              <span>
                <Phone size={14} /> {employee.phone}
              </span>
              <span>
                <MapPin size={14} /> {employee.location}
              </span>
            </div>
          </div>
          <div className="ep-head-actions">
            <span
              className={`ep-status ep-status-${String(
                employee.status
              ).toLowerCase()}`}
            >
              {employee.status}
            </span>
            {isEditing ? (
              <>
                <button className="ep-btn ep-btn-primary" onClick={handleSave}>
                  <Save size={15} /> Save
                </button>
                <button className="ep-btn ep-btn-ghost" onClick={handleCancel}>
                  <X size={15} /> Cancel
                </button>
              </>
            ) : (
              <button
                className="ep-btn ep-btn-primary"
                onClick={() => setIsEditing(true)}
              >
                <Pencil size={15} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* ---------- body: sections nav + section content ---------- */}
        <div className="ep-body">
          <aside className="ep-side">
            <h4>Sections</h4>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`ep-side-item${activeSection === s.id ? " is-active" : ""
                  }`}
                onClick={() => setActiveSection(s.id)}
              >
                {s.label}
                <ChevronRight size={14} className="ep-side-arrow" />
              </button>
            ))}
          </aside>

          <div className="ep-content">
            {activeSection === "personal" && (
              <>
                {collapseCard(
                  "basic",
                  "Basic Information",
                  <User size={16} />,
                  <>
                    {renderField("First Name", per.firstName, "personal", "firstName")}
                    {renderField("Last Name", per.lastName, "personal", "lastName")}
                    {renderField("Email", per.email, "personal", "email", "email")}
                    {renderField("Mobile", per.mobile, "personal", "mobile")}
                    {renderField("Gender", per.gender, "personal", "gender")}
                    {renderField("Date of Birth", per.dob, "personal", "dob", "date")}
                    {renderField("Marital Status", per.maritalStatus, "personal", "maritalStatus")}
                    {renderField("Blood Group", per.bloodGroup, "personal", "bloodGroup")}
                    {renderField("Nationality", per.nationality, "personal", "nationality")}
                    {renderField("Aadhaar Number", per.aadhar, "personal", "aadhar")}
                    {renderField("PAN Number", per.pan, "personal", "pan")}
                  </>
                )}

                {collapseCard(
                  "family",
                  "Family Information",
                  <Users size={16} />,
                  <>
                    {renderField("Father's Name", fam.fatherName, "family", "fatherName")}
                    {renderField("Mother's Name", fam.motherName, "family", "motherName")}
                    {renderField("Spouse Name", fam.spouseName, "family", "spouseName")}
                    {renderField("Emergency Contact", fam.emergencyContact, "family", "emergencyContact")}
                    {renderField("Emergency Relation", fam.emergencyRelation, "family", "emergencyRelation")}
                    {renderField("Family Contact Number", fam.familyContact, "family", "familyContact")}
                  </>
                )}

                {collapseCard(
                  "address",
                  "Address Information",
                  <MapPin size={16} />,
                  <>
                    {renderField("Address Line 1", addr.address1, "address", "address1")}
                    {renderField("Address Line 2", addr.address2, "address", "address2")}
                    {renderField("City", addr.city, "address", "city")}
                    {renderField("State", addr.state, "address", "state")}
                    {renderField("Country", addr.country, "address", "country")}
                    {renderField("Pincode", addr.pincode, "address", "pincode")}
                    {renderField(
                      "Permanent Address Same",
                      addr.permanentSame ? "Yes" : "No",
                      "address",
                      "permanentSame"
                    )}
                  </>
                )}

                {collapseCard(
                  "payment",
                  "Payment Information",
                  <IndianRupee size={16} />,
                  <>
                    {renderField("Bank Name", pay.bankName, "payment", "bankName")}
                    {renderField("Account Number", pay.accountNumber, "payment", "accountNumber")}
                    {renderField("IFSC Code", pay.ifsc, "payment", "ifsc")}
                    {renderField("UPI ID", pay.upi, "payment", "upi")}
                    {renderField("Payment Mode", pay.paymentMode, "payment", "paymentMode")}
                    {renderField(
                      "Salary Account",
                      pay.salaryAccount ? "Yes" : "No",
                      "payment",
                      "salaryAccount"
                    )}
                  </>
                )}
              </>
            )}

            {activeSection === "employment" && (
              <>
                {collapseCard(
                  "employment",
                  "Employment Details",
                  <Briefcase size={16} />,
                  <>
                    {renderField("Employee Code", empSec.empCode, "employment", "empCode")}
                    {renderField("Joining Date", empSec.joiningDate, "employment", "joiningDate", "date")}
                    {renderField("Employment Type", empSec.employmentType, "employment", "employmentType")}
                    {renderField("Skill Level", empSec.skillLevel, "employment", "skillLevel")}
                    {renderField("Employment Status", empSec.employmentStatus, "employment", "employmentStatus")}
                    {renderField("Department", empSec.department, "employment", "department")}
                    {renderField("Designation", empSec.designation, "employment", "designation")}
                    {renderField("Reporting Supervisor", empSec.reportingSupervisor, "employment", "reportingSupervisor")}
                    {renderField("Work Location", empSec.workLocation, "employment", "workLocation")}
                    {renderField("Confirmation Due", empSec.confirmationDue, "employment", "confirmationDue", "date")}
                    {renderField("Confirmation Date", empSec.confirmationDate, "employment", "confirmationDate", "date")}
                    {renderField("Effective From", empSec.jobEffectiveFrom, "employment", "jobEffectiveFrom", "date")}
                  </>
                )}
              </>
            )}

            {activeSection === "statutory" && (
              <>
                {collapseCard(
                  "statutory",
                  "Statutory Details",
                  <BadgeCheck size={16} />,
                  <>
                    {renderField("PF Applicable", stat.pfApplicable, "statutory", "pfApplicable")}
                    {renderField("ESIC Applicable", stat.esicApplicable, "statutory", "esicApplicable")}
                    {renderField("PT Applicable", stat.ptApplicable, "statutory", "ptApplicable")}
                    {renderField("LWF Applicable", stat.lwfApplicable, "statutory", "lwfApplicable")}
                    {renderField("Income Tax Applicable", stat.itApplicable, "statutory", "itApplicable")}
                    {renderField("Gratuity Applicable", stat.gratuityApplicable, "statutory", "gratuityApplicable")}
                    {renderField("NPS Applicable", stat.npsApplicable, "statutory", "npsApplicable")}
                    {renderField("UAN Number", stat.uanNumber, "statutory", "uanNumber")}
                    {renderField("PF Number", stat.pfNumber, "statutory", "pfNumber")}
                    {renderField("PRAN Number", stat.pranNumber, "statutory", "pranNumber")}
                  </>
                )}
              </>
            )}

            {activeSection === "salary" && (
              <>
                {collapseCard(
                  "salary",
                  "Salary Details",
                  <IndianRupee size={16} />,
                  <>
                    {renderField("Monthly Gross", fmtMoney(sal.monthlyGross), "salary", "monthlyGross")}
                    {renderField("Basic", fmtMoney(sal.basic), "salary", "basic")}
                    {renderField("HRA", fmtMoney(sal.hra), "salary", "hra")}
                    {renderField("Special Allowance", fmtMoney(sal.specialAllowance), "salary", "specialAllowance")}
                    {renderField("Monthly CTC", fmtMoney(sal.monthlyCtc), "salary", "monthlyCtc")}
                    {renderField("Effective From", sal.effectiveFrom, "salary", "effectiveFrom", "date")}
                    {renderField("Effective To", sal.effectiveTo, "salary", "effectiveTo", "date")}
                  </>
                )}
              </>
            )}

            {activeSection === "tax" && (
              <>
                {collapseCard(
                  "tax",
                  "Tax Details",
                  <Building2 size={16} />,
                  <>
                    {renderField("Tax Regime", taxSec.regime, "tax", "regime")}
                    {renderField("PAN Number", taxSec.pan, "tax", "pan")}
                    {renderField("Declaration Status", taxSec.declarationStatus, "tax", "declarationStatus")}
                    {renderField("Last Updated", taxSec.updatedAt, "tax", "updatedAt")}
                    {renderField("Updated By", taxSec.updatedBy, "tax", "updatedBy")}
                  </>
                )}
              </>
            )}

            {activeSection === "documents" && (
              <div className="ep-card">
                <div className="ep-table-wrap">
                  <table className="ep-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Category</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((doc, i) => (
                        <tr key={`${doc.name}-${i}`}>
                          <td className="ep-doc-name">{doc.name}</td>
                          <td>{doc.category}</td>
                          <td>{doc.size}</td>
                          <td>{formatDate(doc.uploaded)}</td>
                          <td>
                            <span
                              className={`ep-pill ${doc.status === "Verified"
                                  ? "ep-pill-green"
                                  : "ep-pill-amber"
                                }`}
                            >
                              {doc.status}
                            </span>
                          </td>
                          <td>
                            <div className="ep-row-actions">
                              <button
                                className="ep-icon-btn"
                                title="View"
                                onClick={() => handleViewDoc(doc)}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                className="ep-icon-btn"
                                title="Download"
                                onClick={() => handleDownloadDoc(doc)}
                              >
                                <Download size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "other" && (
              <>
                {collapseCard(
                  "other",
                  "Other Details",
                  <User size={16} />,
                  <>
                    {renderField("Hobbies", oth.hobbies, "other", "hobbies")}
                    {renderField("Emergency Address", oth.emergencyAddress, "other", "emergencyAddress")}
                    {renderField("Volunteered", oth.volunteered, "other", "volunteered")}
                    {renderField("Notes", oth.notes, "other", "notes", "textarea")}
                  </>
                )}
              </>
            )}

            {activeSection === "transaction" && (
              <div className="ep-card">
                <div className="ep-table-wrap">
                  <table className="ep-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Type</th>
                        <th>Initiated By</th>
                        <th>Last Activity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t, i) => (
                        <tr key={`${t.ref}-${i}`}>
                          <td className="ep-mono">{t.ref}</td>
                          <td>{t.type}</td>
                          <td>{t.initiatedBy}</td>
                          <td>{formatDate(t.lastActivity)}</td>
                          <td>
                            <span
                              className={`ep-pill ${t.status === "Completed"
                                  ? "ep-pill-green"
                                  : "ep-pill-purple"
                                }`}
                            >
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "changelog" && (
              <div className="ep-card">
                <div className="ep-timeline">
                  {logs.map((log, i) => (
                    <div className="ep-timeline-row" key={`log-${i}`}>
                      <span className="ep-timeline-dot" />
                      <div className="ep-timeline-body">
                        <div className="ep-timeline-head">
                          <strong>{log.field}</strong>
                          <span className="ep-timeline-date">{log.date}</span>
                        </div>
                        <div className="ep-timeline-change">
                          <span className="ep-old">{log.oldValue || "—"}</span>
                          <ChevronRight size={13} />
                          <span className="ep-new">{log.newValue || "—"}</span>
                        </div>
                        <span className="ep-timeline-by">by {log.by}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export default EmployeeProfile;
