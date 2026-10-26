import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Bell,
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Plus,
  Check,
  X,
  Eye,
  Trash2,
  Smartphone,
  Laptop,
  Tablet,
  Download,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  ShieldCheck,
  RefreshCw,
  Clock,
  Calendar,
  Hourglass,
  Ban,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./DeviceRegistration.css";

// 3D Empty state image generated & placed in public directory
const EMPTY_STATE_IMG = "/device-registration-empty.jpg";

/* =========================================================
   INITIAL DATA SEED (Realistic system employees & requests)
   ========================================================= */

const INITIAL_REQUESTS = [
  {
    id: "REQ-1001",
    employeeName: "Aaquib Khan",
    empCode: "EMP001",
    initials: "AS",
    deviceType: "laptop",
    brand: "Dell",
    model: "Latitude 7420",
    deviceId: "Laptop (Dell Latitude 7420)",
    serialNumber: "DL7420X9A12",
    imei: "",
    macAddress: "4C:EB:BD:81:4A:92",
    status: "Pending",
    requestDate: "2026-09-17",
    department: "UI/UX Design",
    reason: "Primary workstation setup for remote & hybrid attendance logging",
  },
  {
    id: "REQ-1002",
    employeeName: "Payal Mundhe",
    empCode: "LE249",
    initials: "PM",
    deviceType: "mobile",
    brand: "Apple",
    model: "iPhone 15",
    deviceId: "Mobile (iPhone 15)",
    serialNumber: "",
    imei: "354872341234567",
    macAddress: "B8:27:EB:55:A1:10",
    status: "Pending",
    requestDate: "2026-09-17",
    department: "Operations",
    reason: "Mobile geo-tracking for field punches and client site visits",
  },
  {
    id: "REQ-1003",
    employeeName: "Janhavi Samant",
    empCode: "ADM003",
    initials: "JS",
    deviceType: "laptop",
    brand: "HP",
    model: "EliteBook 840",
    deviceId: "Laptop (HP EliteBook 840)",
    serialNumber: "HP840A7B98",
    imei: "",
    macAddress: "3C:52:82:11:29:4F",
    status: "Pending",
    requestDate: "2026-09-16",
    department: "Human Resources",
    reason: "Administrative management and employee record processing",
  },
  {
    id: "REQ-1004",
    employeeName: "Krishna",
    empCode: "LE214",
    initials: "KB",
    deviceType: "tablet",
    brand: "Apple",
    model: "iPad Air",
    deviceId: "Tablet (iPad Air)",
    serialNumber: "DMPQ7845KL",
    imei: "869402049182741",
    macAddress: "F0:18:98:4C:E3:01",
    status: "Pending",
    requestDate: "2026-09-16",
    department: "Engineering",
    reason: "On-site QA testing and inspection tablet terminal",
  },
  {
    id: "REQ-1005",
    employeeName: "Parth Patil",
    empCode: "LE243",
    initials: "PP",
    deviceType: "laptop",
    brand: "Apple",
    model: "MacBook Pro",
    deviceId: "Laptop (MacBook Pro)",
    serialNumber: "C02G4567MD6T",
    imei: "",
    macAddress: "A4:83:E7:22:15:9B",
    status: "Pending",
    requestDate: "2026-09-15",
    department: "Backend Engineering",
    reason: "Spring Boot core service development and API integration",
  },
  {
    id: "REQ-1006",
    employeeName: "Tanmay Salgoankar",
    empCode: "LE252",
    initials: "TS",
    deviceType: "laptop",
    brand: "Lenovo",
    model: "ThinkPad X1 Carbon",
    deviceId: "Laptop (ThinkPad X1 Carbon)",
    serialNumber: "PF29X81L",
    imei: "",
    macAddress: "54:EE:75:A8:92:43",
    status: "Pending",
    requestDate: "2026-09-14",
    department: "AIML Operations",
    reason: "Machine learning model pipelines and attendance verification",
  },
  // Completed requests (12 records)
  {
    id: "REQ-1007",
    employeeName: "Aachal",
    empCode: "LE855",
    initials: "AP",
    deviceType: "laptop",
    brand: "Dell",
    model: "Inspiron 15",
    deviceId: "Laptop (Dell Inspiron 15)",
    serialNumber: "DL9812G2",
    imei: "",
    macAddress: "28:CF:E9:19:62:55",
    status: "Completed",
    requestDate: "2026-09-10",
    department: "Financial Analysis",
    reason: "Financial analytics and auditing workstation",
  },
  {
    id: "REQ-1008",
    employeeName: "Rohit Shinde",
    empCode: "EMP018",
    initials: "RS",
    deviceType: "mobile",
    brand: "Samsung",
    model: "Galaxy S23",
    deviceId: "Mobile (Samsung Galaxy S23)",
    serialNumber: "",
    imei: "359871029384756",
    macAddress: "90:78:41:88:B2:1A",
    status: "Completed",
    requestDate: "2026-09-08",
    department: "Operations",
    reason: "Field attendance and site visit logs",
  },
  {
    id: "REQ-1009",
    employeeName: "Sneha Kulkarni",
    empCode: "EMP022",
    initials: "SK",
    deviceType: "laptop",
    brand: "HP",
    model: "ProBook 450",
    deviceId: "Laptop (HP ProBook 450)",
    serialNumber: "HP450G8A1",
    imei: "",
    macAddress: "80:CE:62:3A:9F:88",
    status: "Completed",
    requestDate: "2026-09-05",
    department: "Human Resources",
    reason: "HR recruitment portal management",
  },
  {
    id: "REQ-1010",
    employeeName: "Vikas Sharma",
    empCode: "EMP031",
    initials: "VS",
    deviceType: "mobile",
    brand: "Google",
    model: "Pixel 8",
    deviceId: "Mobile (Google Pixel 8)",
    serialNumber: "",
    imei: "356719284756102",
    macAddress: "6C:29:95:5D:1E:F0",
    status: "Completed",
    requestDate: "2026-09-04",
    department: "Marketing",
    reason: "Campaign monitoring and field punch",
  },
  {
    id: "REQ-1011",
    employeeName: "Pooja Jadhav",
    empCode: "EMP045",
    initials: "PJ",
    deviceType: "tablet",
    brand: "Samsung",
    model: "Galaxy Tab S9",
    deviceId: "Tablet (Galaxy Tab S9)",
    serialNumber: "SMX710NZAA",
    imei: "",
    macAddress: "E4:5F:01:A2:7C:33",
    status: "Completed",
    requestDate: "2026-09-01",
    department: "Design",
    reason: "Design review & client presentation",
  },
  {
    id: "REQ-1012",
    employeeName: "Aditya Nair",
    empCode: "EMP052",
    initials: "AN",
    deviceType: "laptop",
    brand: "Dell",
    model: "Latitude 5420",
    deviceId: "Laptop (Dell Latitude 5420)",
    serialNumber: "DL5420Q1",
    imei: "",
    macAddress: "14:18:77:88:99:AA",
    status: "Completed",
    requestDate: "2026-08-28",
    department: "Engineering",
    reason: "Software engineering and CI/CD pipelines",
  },
  {
    id: "REQ-1013",
    employeeName: "Meera Joshi",
    empCode: "EMP060",
    initials: "MJ",
    deviceType: "laptop",
    brand: "Apple",
    model: "MacBook Air M2",
    deviceId: "Laptop (MacBook Air M2)",
    serialNumber: "C02J8912M",
    imei: "",
    macAddress: "F8:FF:C2:55:44:33",
    status: "Completed",
    requestDate: "2026-08-25",
    department: "Product",
    reason: "Product strategy and documentation",
  },
  {
    id: "REQ-1014",
    employeeName: "Kunal Deshmukh",
    empCode: "EMP064",
    initials: "KD",
    deviceType: "mobile",
    brand: "OnePlus",
    model: "12R",
    deviceId: "Mobile (OnePlus 12R)",
    serialNumber: "",
    imei: "867549021847593",
    macAddress: "94:65:2D:C1:55:12",
    status: "Completed",
    requestDate: "2026-08-22",
    department: "Sales",
    reason: "Field sales mobile punching",
  },
  {
    id: "REQ-1015",
    employeeName: "Ritu Gupta",
    empCode: "EMP071",
    initials: "RG",
    deviceType: "laptop",
    brand: "Lenovo",
    model: "Yoga Slim 7",
    deviceId: "Laptop (Lenovo Yoga Slim 7)",
    serialNumber: "PF18A92M",
    imei: "",
    macAddress: "30:24:A9:71:00:22",
    status: "Completed",
    requestDate: "2026-08-20",
    department: "Operations",
    reason: "Billing and client coordination",
  },
  {
    id: "REQ-1016",
    employeeName: "Sanjay Sawant",
    empCode: "EMP078",
    initials: "SS",
    deviceType: "laptop",
    brand: "Dell",
    model: "Vostro 3510",
    deviceId: "Laptop (Dell Vostro 3510)",
    serialNumber: "DL3510M7",
    imei: "",
    macAddress: "44:AF:28:90:33:44",
    status: "Completed",
    requestDate: "2026-08-18",
    department: "Support",
    reason: "Customer support ticket resolution",
  },
  {
    id: "REQ-1017",
    employeeName: "Ananya Roy",
    empCode: "EMP085",
    initials: "AR",
    deviceType: "tablet",
    brand: "Apple",
    model: "iPad 10th Gen",
    deviceId: "Tablet (iPad 10th Gen)",
    serialNumber: "DMQZ9182KL",
    imei: "",
    macAddress: "70:3E:AC:88:12:90",
    status: "Completed",
    requestDate: "2026-08-15",
    department: "Marketing",
    reason: "Social media and creative review",
  },
  {
    id: "REQ-1018",
    employeeName: "Gaurav More",
    empCode: "EMP092",
    initials: "GM",
    deviceType: "mobile",
    brand: "Samsung",
    model: "Galaxy A54",
    deviceId: "Mobile (Samsung Galaxy A54)",
    serialNumber: "",
    imei: "354910284759102",
    macAddress: "B4:52:7E:99:44:11",
    status: "Completed",
    requestDate: "2026-08-12",
    department: "Operations",
    reason: "Field attendance logging",
  },
  // No Device Attached requests (3 records)
  {
    id: "REQ-1019",
    employeeName: "Deepak Chavan",
    empCode: "EMP104",
    initials: "DC",
    deviceType: "none",
    brand: "None",
    model: "No hardware registered",
    deviceId: "No Device Attached",
    serialNumber: "—",
    imei: "—",
    macAddress: "—",
    status: "No Device Attached",
    requestDate: "2026-09-12",
    department: "Operations",
    reason: "New hire awaiting asset allocation",
  },
  {
    id: "REQ-1020",
    employeeName: "Priyanka Naik",
    empCode: "EMP110",
    initials: "PN",
    deviceType: "none",
    brand: "None",
    model: "No hardware registered",
    deviceId: "No Device Attached",
    serialNumber: "—",
    imei: "—",
    macAddress: "—",
    status: "No Device Attached",
    requestDate: "2026-09-09",
    department: "Human Resources",
    reason: "Pending BYOD registration verification",
  },
  {
    id: "REQ-1021",
    employeeName: "Nilesh Tawde",
    empCode: "EMP115",
    initials: "NT",
    deviceType: "none",
    brand: "None",
    model: "No hardware registered",
    deviceId: "No Device Attached",
    serialNumber: "—",
    imei: "—",
    macAddress: "—",
    status: "No Device Attached",
    requestDate: "2026-09-06",
    department: "Engineering",
    reason: "Contractor without corporate device provisioned",
  },
];

/* Helper: Format date as '17 Sep 2026' */
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

/* =========================================================
   DEVICE REGISTRATION REQUEST COMPONENT
   ========================================================= */

function DeviceRegistration() {
  const navigate = useNavigate();

  // Active Tab: 'Pending', 'Completed', 'No Device Attached'
  const [activeTab, setActiveTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Sorting: 'latest', 'oldest', 'name'
  const [sortBy, setSortBy] = useState("latest");
  const [sortOpen, setSortOpen] = useState(false);

  // Device type filter: 'all', 'laptop', 'mobile', 'tablet'
  const [deviceFilter, setDeviceFilter] = useState("all");

  // Mobile Load More pagination count
  const [visibleCount, setVisibleCount] = useState(6);

  const [requests, setRequests] = useState(() => {
    try {
      const saved = localStorage.getItem("device_reg_requests");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_REQUESTS;
    } catch {
      return INITIAL_REQUESTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("device_reg_requests", JSON.stringify(requests));
    } catch {}
  }, [requests]);

  // Dropdowns & Modals
  const [actionsOpen, setActionsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewDetailsModal, setViewDetailsModal] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // New Request Form State
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpCode, setNewEmpCode] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newDeviceType, setNewDeviceType] = useState("mobile");

  const actionsRef = useRef(null);
  const mobileActionsRef = useRef(null);
  const sortRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target) &&
        mobileActionsRef.current &&
        !mobileActionsRef.current.contains(event.target)
      ) {
        setActionsOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Reset pagination when active tab or search changes
  useEffect(() => {
    setVisibleCount(6);
  }, [activeTab, search, deviceFilter, sortBy]);

  // Filtered and sorted requests
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = requests.filter((item) => {
      // Tab matching: support "No Device" and "No Device Attached"
      const isNoDeviceTab =
        activeTab === "No Device" || activeTab === "No Device Attached";
      const matchesTab = isNoDeviceTab
        ? item.status === "No Device Attached" || item.status === "No Device"
        : item.status === activeTab;

      if (!matchesTab) return false;

      // Device type filter
      if (deviceFilter !== "all") {
        if (item.deviceType !== deviceFilter) return false;
      }

      // Search query
      if (!query) return true;

      return (
        item.employeeName.toLowerCase().includes(query) ||
        item.empCode.toLowerCase().includes(query) ||
        (item.deviceId && item.deviceId.toLowerCase().includes(query)) ||
        (item.brand && item.brand.toLowerCase().includes(query)) ||
        (item.model && item.model.toLowerCase().includes(query)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(query)) ||
        (item.imei && item.imei.toLowerCase().includes(query))
      );
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === "latest") {
        return new Date(b.requestDate || 0) - new Date(a.requestDate || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.requestDate || 0) - new Date(b.requestDate || 0);
      }
      if (sortBy === "name") {
        return a.employeeName.localeCompare(b.employeeName);
      }
      return 0;
    });

    return list;
  }, [requests, activeTab, search, deviceFilter, sortBy]);

  // Visible items on mobile
  const visibleMobileRequests = useMemo(() => {
    return filteredRequests.slice(0, visibleCount);
  }, [filteredRequests, visibleCount]);

  // Tab counts
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const completedCount = requests.filter((r) => r.status === "Completed").length;
  const noDeviceCount = requests.filter(
    (r) => r.status === "No Device Attached" || r.status === "No Device"
  ).length;

  const allSelected =
    filteredRequests.length > 0 && selectedIds.length === filteredRequests.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Actions
  const handleApprove = (id) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Completed" } : r))
    );
    showToast("Device registration request approved successfully");
  };

  const handleReject = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    showToast("Device registration request rejected");
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) {
      showToast("Please select at least one request");
      return;
    }
    setRequests((prev) =>
      prev.map((r) => (selectedIds.includes(r.id) ? { ...r, status: "Completed" } : r))
    );
    setSelectedIds([]);
    setActionsOpen(false);
    showToast(`Approved ${selectedIds.length} device requests`);
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) {
      showToast("Please select at least one request");
      return;
    }
    setRequests((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
    setSelectedIds([]);
    setActionsOpen(false);
    showToast(`Removed ${selectedIds.length} requests`);
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,Employee Name,Emp Code,Device ID,Serial Number,IMEI,Status,Request Date"]
        .concat(
          requests.map(
            (r) =>
              `${r.id},"${r.employeeName}",${r.empCode},"${r.deviceId || ""}",${
                r.serialNumber || ""
              },${r.imei || ""},${r.status},${r.requestDate}`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "device_registration_requests.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionsOpen(false);
    showToast("Exported device registrations to CSV");
  };

  const handleAddRequest = (e) => {
    e.preventDefault();
    if (!newEmpName || !newDeviceId) {
      showToast("Please fill in employee name and device ID");
      return;
    }

    const initials = newEmpName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const newReq = {
      id: `REQ-${Date.now().toString().slice(-4)}`,
      empCode: newEmpCode || `EMP${Math.floor(100 + Math.random() * 900)}`,
      employeeName: newEmpName,
      initials,
      deviceId: newDeviceId,
      deviceType: newDeviceType,
      brand: newDeviceType === "laptop" ? "HP" : newDeviceType === "mobile" ? "Apple" : "Samsung",
      model: newDeviceId,
      serialNumber: `SN${Math.floor(100000 + Math.random() * 900000)}`,
      imei: newDeviceType === "mobile" ? `35${Math.floor(1000000000000 + Math.random() * 9000000000000)}` : "",
      status: "Pending",
      requestDate: new Date().toISOString().split("T")[0],
      macAddress: "AA:BB:CC:DD:EE:FF",
      department: "General Staff",
      reason: "Employee requested device authorization",
    };

    setRequests((prev) => [newReq, ...prev]);
    setNewEmpName("");
    setNewEmpCode("");
    setNewDeviceId("");
    setAddModalOpen(false);
    setActiveTab("Pending");
    showToast("New device registration request created");
  };

  const getDeviceIcon = (type) => {
    const t = (type || "").toLowerCase();
    if (
      t === "laptop" ||
      t.includes("macbook") ||
      t.includes("thinkpad") ||
      t.includes("latitude") ||
      t.includes("elitebook")
    ) {
      return <Laptop size={14} className="dr-device-type-icon" />;
    }
    if (t === "tablet" || t.includes("ipad") || t.includes("tab")) {
      return <Tablet size={14} className="dr-device-type-icon" />;
    }
    if (t === "none" || t.includes("no device")) {
      return <AlertCircle size={14} className="dr-device-type-icon" />;
    }
    return <Smartphone size={14} className="dr-device-type-icon" />;
  };

  const getStatusBadge = (status) => {
    if (status === "Pending") {
      return (
        <span className="dr-mob-status-pill pending">
          <Clock size={12} />
          <span>Pending</span>
        </span>
      );
    }
    if (status === "Completed") {
      return (
        <span className="dr-mob-status-pill completed">
          <Check size={12} />
          <span>Approved</span>
        </span>
      );
    }
    return (
      <span className="dr-mob-status-pill no-device">
        <Ban size={12} />
        <span>No Device</span>
      </span>
    );
  };

  return (
    <div className="device-registration-page">
      <DashboardHeader />

      {/* =====================================================
          DESKTOP VIEW (>768px): PRESERVED EXISTING TABLE
          ===================================================== */}
      <div className="dr-desktop-view">
        <div className="dr-body">
          <div className="dr-toolbar">
            {/* TABS */}
            <div className="dr-tabs" role="tablist" aria-label="Device Registration Tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "Pending"}
                className={`dr-tab-btn ${activeTab === "Pending" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("Pending");
                  setSelectedIds([]);
                }}
              >
                Pending
                <span className="dr-tab-badge">{pendingCount}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "Completed"}
                className={`dr-tab-btn ${activeTab === "Completed" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("Completed");
                  setSelectedIds([]);
                }}
              >
                Completed
                <span className="dr-tab-badge">{completedCount}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={
                  activeTab === "No Device Attached" || activeTab === "No Device"
                }
                className={`dr-tab-btn ${
                  activeTab === "No Device Attached" || activeTab === "No Device"
                    ? "is-active"
                    : ""
                }`}
                onClick={() => {
                  setActiveTab("No Device Attached");
                  setSelectedIds([]);
                }}
              >
                No Device Attached
                <span className="dr-tab-badge">{noDeviceCount}</span>
              </button>
            </div>

            {/* CONTROLS (SEARCH, FILTER, ACTIONS) */}
            <div className="dr-controls">
              <div className="dr-search-wrap">
                <Search size={15} className="dr-search-icon" />
                <input
                  type="text"
                  placeholder="Search employee or device"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="dr-search-input"
                />
              </div>

              <button
                type="button"
                className={`dr-icon-btn ${filterOpen ? "is-active" : ""}`}
                title="Filter & Settings"
                onClick={() => setFilterOpen((prev) => !prev)}
              >
                <SlidersHorizontal size={17} />
              </button>

              <div className="dr-actions-wrap" ref={actionsRef}>
                <button
                  type="button"
                  className="dr-actions-btn"
                  onClick={() => setActionsOpen((prev) => !prev)}
                  aria-expanded={actionsOpen}
                >
                  Actions
                  <ChevronDown size={15} />
                </button>

                {actionsOpen && (
                  <div className="dr-actions-menu" role="menu">
                    <button
                      type="button"
                      onClick={() => {
                        setAddModalOpen(true);
                        setActionsOpen(false);
                      }}
                    >
                      <Plus size={15} />
                      Add Device Registration
                    </button>
                    <button type="button" onClick={handleBulkApprove}>
                      <Check size={15} />
                      Bulk Approve Requests
                    </button>
                    <button type="button" onClick={handleBulkReject}>
                      <X size={15} />
                      Bulk Reject Requests
                    </button>
                    <button type="button" onClick={handleExportCSV}>
                      <Download size={15} />
                      Export Device List
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TABLE & CARD */}
          <div className="dr-table-card">
            <table className="dr-table">
              <thead>
                <tr>
                  <th className="dr-col-check">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all requests"
                    />
                  </th>
                  <th>Employee Name</th>
                  <th>Device Ids</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right", paddingRight: "28px" }}>Actions</th>
                </tr>
              </thead>

              {filteredRequests.length > 0 && (
                <tbody>
                  {filteredRequests.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const statusClass =
                      item.status === "Completed"
                        ? "completed"
                        : item.status === "Pending"
                        ? "pending"
                        : "nodevice";

                    return (
                      <tr key={item.id} className={isSelected ? "is-selected" : ""}>
                        <td className="dr-col-check">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(item.id)}
                            aria-label={`Select ${item.employeeName}`}
                          />
                        </td>

                        <td>
                          <div className="dr-emp-cell">
                            <div className="dr-emp-avatar">{item.initials}</div>
                            <div className="dr-emp-info">
                              <strong>{item.employeeName}</strong>
                              <span>{item.empCode}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="dr-device-tag">
                            {getDeviceIcon(item.deviceType)}
                            {item.deviceId || item.model || "Device"}
                          </span>
                        </td>

                        <td>
                          <span className={`dr-status-badge ${statusClass}`}>
                            {item.status === "Completed" ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <AlertCircle size={13} />
                            )}
                            {item.status}
                          </span>
                        </td>

                        <td>
                          <div
                            className="dr-action-btns"
                            style={{ justifyContent: "flex-end" }}
                          >
                            {item.status === "Pending" && (
                              <>
                                <button
                                  type="button"
                                  className="dr-row-btn approve"
                                  title="Approve Request"
                                  onClick={() => handleApprove(item.id)}
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="dr-row-btn reject"
                                  title="Reject Request"
                                  onClick={() => handleReject(item.id)}
                                >
                                  <X size={15} />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              className="dr-row-btn"
                              title="View Details"
                              onClick={() => setViewDetailsModal(item)}
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>

            {/* EMPTY STATE */}
            {filteredRequests.length === 0 && (
              <div className="dr-empty-state">
                <div className="dr-empty-illustration-wrap">
                  <img
                    src={EMPTY_STATE_IMG}
                    alt="No Device Registration Request"
                    className="dr-empty-illustration"
                  />
                </div>

                <p className="dr-empty-message">
                  <Info size={16} />
                  No Device Registration Request Found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          MOBILE VIEW (<=768px): OPTION B REVIEW-FIRST LIST
          ===================================================== */}
      <div className="dr-mobile-view">
        {/* 1. Tabs Row with Pill Counts */}
        <div className="dr-mob-tabs-container">
          <div className="dr-mob-tabs" role="tablist" aria-label="Device Registration Tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Pending"}
              className={`dr-mob-tab ${activeTab === "Pending" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("Pending");
                setSelectedIds([]);
              }}
            >
              <span className="dr-mob-tab-inner">
                <span>Pending</span>
                <span className="dr-mob-tab-pill">{pendingCount}</span>
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Completed"}
              className={`dr-mob-tab ${activeTab === "Completed" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("Completed");
                setSelectedIds([]);
              }}
            >
              <span className="dr-mob-tab-inner">
                <span>Completed</span>
                <span className="dr-mob-tab-pill">{completedCount}</span>
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={
                activeTab === "No Device Attached" || activeTab === "No Device"
              }
              className={`dr-mob-tab ${
                activeTab === "No Device Attached" || activeTab === "No Device"
                  ? "is-active"
                  : ""
              }`}
              onClick={() => {
                setActiveTab("No Device Attached");
                setSelectedIds([]);
              }}
            >
              <span className="dr-mob-tab-inner">
                <span>No Device</span>
                <span className="dr-mob-tab-pill">{noDeviceCount}</span>
              </span>
            </button>
          </div>
        </div>

        {/* 2. Compact Status Summary Cards (3 Cards Row) */}
        <div className="dr-mob-summary-cards">
          <div
            className={`dr-mob-summary-card ${activeTab === "Pending" ? "is-active-card" : ""}`}
            onClick={() => setActiveTab("Pending")}
          >
            <div className="dr-mob-summary-icon pending">
              <Hourglass size={18} />
            </div>
            <div className="dr-mob-summary-content">
              <span className="dr-mob-summary-num">{pendingCount}</span>
              <span className="dr-mob-summary-txt">Pending</span>
            </div>
          </div>

          <div
            className={`dr-mob-summary-card ${activeTab === "Completed" ? "is-active-card" : ""}`}
            onClick={() => setActiveTab("Completed")}
          >
            <div className="dr-mob-summary-icon completed">
              <Check size={18} />
            </div>
            <div className="dr-mob-summary-content">
              <span className="dr-mob-summary-num">{completedCount}</span>
              <span className="dr-mob-summary-txt">Completed</span>
            </div>
          </div>

          <div
            className={`dr-mob-summary-card ${
              activeTab === "No Device Attached" || activeTab === "No Device"
                ? "is-active-card"
                : ""
            }`}
            onClick={() => setActiveTab("No Device Attached")}
          >
            <div className="dr-mob-summary-icon nodevice">
              <Ban size={18} />
            </div>
            <div className="dr-mob-summary-content">
              <span className="dr-mob-summary-num">{noDeviceCount}</span>
              <span className="dr-mob-summary-txt">No Device</span>
            </div>
          </div>
        </div>

        {/* 3. Full-Width Search Input */}
        <div className="dr-mob-search-wrap">
          <Search size={16} className="dr-mob-search-icon" />
          <input
            type="text"
            placeholder="Search employee or device..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="dr-mob-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="dr-mob-search-clear"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* 4. Filter Control & Actions Dropdown */}
        <div className="dr-mob-controls-row">
          <button
            type="button"
            className={`dr-mob-filter-btn ${filterOpen || deviceFilter !== "all" ? "is-active" : ""}`}
            onClick={() => setFilterOpen((prev) => !prev)}
            aria-label="Filter devices"
          >
            <SlidersHorizontal size={17} />
          </button>

          <div className="dr-mob-actions-wrap" ref={mobileActionsRef}>
            <button
              type="button"
              className="dr-mob-actions-btn"
              onClick={() => setActionsOpen((prev) => !prev)}
            >
              <span>Actions</span>
              <ChevronDown size={15} />
            </button>

            {actionsOpen && (
              <div className="dr-actions-menu" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    setAddModalOpen(true);
                    setActionsOpen(false);
                  }}
                >
                  <Plus size={15} />
                  Add Device Registration
                </button>
                <button type="button" onClick={handleBulkApprove}>
                  <Check size={15} />
                  Bulk Approve Requests
                </button>
                <button type="button" onClick={handleBulkReject}>
                  <X size={15} />
                  Bulk Reject Requests
                </button>
                <button type="button" onClick={handleExportCSV}>
                  <Download size={15} />
                  Export Device List
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Drawer / Dropdown when filterOpen is true */}
        {filterOpen && (
          <div className="dr-mob-filter-panel">
            <div className="dr-mob-filter-header">
              <span>Filter by Device Type:</span>
              {deviceFilter !== "all" && (
                <button
                  type="button"
                  className="dr-mob-filter-reset"
                  onClick={() => setDeviceFilter("all")}
                >
                  Reset
                </button>
              )}
            </div>
            <div className="dr-mob-filter-chips">
              {[
                { key: "all", label: "All Types" },
                { key: "laptop", label: "Laptops" },
                { key: "mobile", label: "Smartphones" },
                { key: "tablet", label: "Tablets" },
              ].map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className={`dr-mob-filter-chip ${deviceFilter === chip.key ? "is-active" : ""}`}
                  onClick={() => setDeviceFilter(chip.key)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Section Header with Sort Dropdown */}
        <div className="dr-mob-section-header">
          <span className="dr-mob-section-title">
            {activeTab === "Pending"
              ? "Pending Requests"
              : activeTab === "Completed"
              ? "Completed Requests"
              : "No Device Requests"}{" "}
            ({filteredRequests.length})
          </span>

          <div className="dr-mob-sort-wrap" ref={sortRef}>
            <button
              type="button"
              className="dr-mob-sort-trigger"
              onClick={() => setSortOpen((p) => !p)}
            >
              <ArrowUpDown size={13} />
              <span>
                Sort by:{" "}
                {sortBy === "latest" ? "Latest" : sortBy === "oldest" ? "Oldest" : "Name A-Z"}
              </span>
              <ChevronDown size={13} />
            </button>

            {sortOpen && (
              <div className="dr-mob-sort-dropdown">
                <button
                  type="button"
                  className={sortBy === "latest" ? "is-active" : ""}
                  onClick={() => {
                    setSortBy("latest");
                    setSortOpen(false);
                  }}
                >
                  Latest First
                </button>
                <button
                  type="button"
                  className={sortBy === "oldest" ? "is-active" : ""}
                  onClick={() => {
                    setSortBy("oldest");
                    setSortOpen(false);
                  }}
                >
                  Oldest First
                </button>
                <button
                  type="button"
                  className={sortBy === "name" ? "is-active" : ""}
                  onClick={() => {
                    setSortBy("name");
                    setSortOpen(false);
                  }}
                >
                  Employee Name (A-Z)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 6. Option B Device Request Cards (Review-First) */}
        <div className="dr-mob-cards-list">
          {filteredRequests.length === 0 ? (
            <div className="dr-mob-empty-card">
              <div className="dr-mob-empty-icon-wrap">
                <Laptop size={32} />
              </div>
              <h4>No device requests found</h4>
              <p>
                {search
                  ? "Try searching for a different name, device, or code."
                  : `There are currently no ${activeTab.toLowerCase()} device registration requests.`}
              </p>
              {!search && (
                <button
                  type="button"
                  className="dr-mob-empty-action"
                  onClick={() => setAddModalOpen(true)}
                >
                  <Plus size={15} /> Add Device Registration
                </button>
              )}
            </div>
          ) : (
            visibleMobileRequests.map((item) => (
              <div
                key={item.id}
                className="dr-mob-card"
                onClick={() => setViewDetailsModal(item)}
              >
                {/* Left: Avatar with initials */}
                <span
                  className="dr-mob-card-avatar"
                  style={{
                    width: "40px",
                    minWidth: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#ede9fe",
                    color: "#6d28d9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13.5px",
                    fontWeight: "700",
                    flexShrink: 0,
                    border: "1px solid #ddd6fe",
                  }}
                >
                  {item.initials}
                </span>

                {/* Middle: Name, Code, Device Info & Date */}
                <div className="dr-mob-card-info">
                  <div className="dr-mob-card-top-line">
                    <h4 className="dr-mob-emp-name">{item.employeeName}</h4>
                  </div>
                  <span className="dr-mob-emp-code">{item.empCode}</span>

                  <div className="dr-mob-card-details-row">
                    <div className="dr-mob-device-desc">
                      {getDeviceIcon(item.deviceType)}
                      <span className="dr-mob-device-text">
                        {item.deviceId ||
                          `${item.brand || ""} ${item.model || ""}`.trim() ||
                          "Device"}
                      </span>
                    </div>

                    <div className="dr-mob-date-desc">
                      <Calendar size={12} className="dr-mob-date-icon" />
                      <span>{formatDate(item.requestDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill & Chevron */}
                <div className="dr-mob-card-right">
                  {getStatusBadge(item.status)}
                  <ChevronRight size={18} className="dr-mob-card-chevron" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* 7. Pagination / Load More Controls */}
        {filteredRequests.length > 6 && (
          <div className="dr-mob-pagination">
            {visibleCount < filteredRequests.length ? (
              <button
                type="button"
                className="dr-mob-load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + 6)}
              >
                Load More ({filteredRequests.length - visibleCount} remaining)
              </button>
            ) : (
              <span className="dr-mob-all-loaded">
                Showing all {filteredRequests.length} requests
              </span>
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          ADD DEVICE MODAL (RESPONSIVE BOTTOM-SHEET)
          ===================================================== */}
      {addModalOpen && (
        <div
          className="dr-modal-overlay"
          onClick={() => setAddModalOpen(false)}
        >
          <div className="dr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dr-modal-head">
              <div>
                <span className="dr-modal-badge">DEVICE REGISTRATION</span>
                <h3>New Device Request</h3>
              </div>
              <button
                type="button"
                className="dr-modal-close"
                onClick={() => setAddModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRequest}>
              <div className="dr-modal-body">
                <div className="dr-form-group">
                  <label>Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Verma"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                  />
                </div>

                <div className="dr-form-group">
                  <label>Employee Code</label>
                  <input
                    type="text"
                    placeholder="e.g. EMP042"
                    value={newEmpCode}
                    onChange={(e) => setNewEmpCode(e.target.value)}
                  />
                </div>

                <div className="dr-form-group">
                  <label>Device ID / Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEV-IPH-9821 (iPhone 15 Pro)"
                    value={newDeviceId}
                    onChange={(e) => setNewDeviceId(e.target.value)}
                  />
                </div>

                <div className="dr-form-group">
                  <label>Device Type</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                  >
                    <option value="mobile">Smartphone / Mobile</option>
                    <option value="laptop">Laptop / PC</option>
                    <option value="tablet">Tablet / iPad</option>
                  </select>
                </div>
              </div>

              <div className="dr-modal-foot">
                <button
                  type="button"
                  className="dr-btn-cancel"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="dr-btn-submit">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW / REVIEW DETAILS MODAL (RESPONSIVE BOTTOM-SHEET)
          ===================================================== */}
      {viewDetailsModal && (
        <div
          className="dr-modal-overlay"
          onClick={() => setViewDetailsModal(null)}
        >
          <div
            className="dr-modal dr-review-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dr-modal-head">
              <div>
                <span className="dr-modal-badge">DEVICE REGISTRATION REVIEW</span>
                <h3>Device Request Details</h3>
              </div>
              <button
                type="button"
                className="dr-modal-close"
                onClick={() => setViewDetailsModal(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="dr-modal-body">
              {/* Employee Summary Card */}
              <div className="dr-modal-emp-card">
                <span
                  className="dr-mob-card-avatar"
                  style={{
                    width: "48px",
                    minWidth: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#ede9fe",
                    color: "#6d28d9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    fontWeight: "700",
                    border: "1px solid #ddd6fe",
                    flexShrink: 0,
                  }}
                >
                  {viewDetailsModal.initials}
                </span>

                <div className="dr-modal-emp-info">
                  <h4>{viewDetailsModal.employeeName}</h4>
                  <div className="dr-modal-emp-meta">
                    <span className="dr-modal-code">{viewDetailsModal.empCode}</span>
                    {viewDetailsModal.department && (
                      <>
                        <span className="dr-modal-dot">•</span>
                        <span>{viewDetailsModal.department}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="dr-modal-status-wrap">
                  {getStatusBadge(viewDetailsModal.status)}
                </div>
              </div>

              {/* Specification Grid */}
              <div className="dr-review-grid">
                <div className="dr-review-item">
                  <span className="dr-review-label">Device Type</span>
                  <strong className="dr-review-val">
                    {getDeviceIcon(viewDetailsModal.deviceType)}
                    <span style={{ textTransform: "capitalize" }}>
                      {viewDetailsModal.deviceType || "Device"}
                    </span>
                  </strong>
                </div>

                <div className="dr-review-item">
                  <span className="dr-review-label">Device Description</span>
                  <strong className="dr-review-val">
                    {viewDetailsModal.deviceId ||
                      `${viewDetailsModal.brand || ""} ${viewDetailsModal.model || ""}`.trim() ||
                      "—"}
                  </strong>
                </div>

                {viewDetailsModal.serialNumber && viewDetailsModal.serialNumber !== "—" && (
                  <div className="dr-review-item">
                    <span className="dr-review-label">Serial Number</span>
                    <strong className="dr-review-val mono">
                      {viewDetailsModal.serialNumber}
                    </strong>
                  </div>
                )}

                {viewDetailsModal.imei && viewDetailsModal.imei !== "—" && (
                  <div className="dr-review-item">
                    <span className="dr-review-label">IMEI</span>
                    <strong className="dr-review-val mono">
                      {viewDetailsModal.imei}
                    </strong>
                  </div>
                )}

                <div className="dr-review-item">
                  <span className="dr-review-label">MAC Address</span>
                  <strong className="dr-review-val mono">
                    {viewDetailsModal.macAddress || "—"}
                  </strong>
                </div>

                <div className="dr-review-item">
                  <span className="dr-review-label">Request Date</span>
                  <strong className="dr-review-val">
                    {formatDate(viewDetailsModal.requestDate)}
                  </strong>
                </div>

                {viewDetailsModal.reason && (
                  <div className="dr-review-item dr-review-item--full">
                    <span className="dr-review-label">Business Justification</span>
                    <p className="dr-review-desc">{viewDetailsModal.reason}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="dr-modal-foot">
              {viewDetailsModal.status === "Pending" ? (
                <div className="dr-review-buttons-group">
                  <button
                    type="button"
                    className="dr-btn-approve"
                    onClick={() => {
                      handleApprove(viewDetailsModal.id);
                      setViewDetailsModal(null);
                    }}
                  >
                    <Check size={16} /> Approve Device
                  </button>
                  <div className="dr-review-sub-buttons">
                    <button
                      type="button"
                      className="dr-btn-reject"
                      onClick={() => {
                        handleReject(viewDetailsModal.id);
                        setViewDetailsModal(null);
                      }}
                    >
                      <X size={16} /> Reject
                    </button>
                    <button
                      type="button"
                      className="dr-btn-cancel"
                      onClick={() => setViewDetailsModal(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="dr-btn-submit"
                  onClick={() => setViewDetailsModal(null)}
                >
                  Close Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMessage && <div className="dr-toast">{toastMessage}</div>}
    </div>
  );
}

export default DeviceRegistration;
