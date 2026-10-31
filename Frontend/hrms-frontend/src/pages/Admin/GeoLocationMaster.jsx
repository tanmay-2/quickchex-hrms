// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - GEOLOCATIONMASTER.JSX
// Path: Frontend/hrms-frontend/src/pages/Admin/GeoLocationMaster.jsx
// Purpose: Web portal page component managing 'GeoLocationMaster' views, user interactions, and state.
// UI Components:
//   • <SEED_LOCATIONS />
//   • <EMPTY_FORM />
//   • <GeoLocationModal />
//   • <GeoViewModal />
//   • <ConfirmModal />
//   • <GeoLocationMasterPage />
//   • <API_BASE />
// Key Functions & Handlers:
//   • update()
//   • submit()
//   • saveLocation()
//   • toggleLocation()
//   • deleteLocation()
//   • validCoordinates()
//   • getSiteInitials()
// ==============================================================================

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { DashboardShell } from "../../components/header/DashboardHeader";
import "./GeoLocationMaster.css";
import { getApiBaseUrl } from "../../services/apiClient";

/* =====================================================================
   FALLBACK / INITIAL CLIENT SITES
   (Used if backend is initializing; overwritten by live API fetch)
   ===================================================================== */
const SEED_LOCATIONS = [
  {
    id: 1,
    name: "NCDX",
    client_name: "National Commodity & Derivatives Exchange",
    address: "BKC, Mumbai, Maharashtra 400051",
    latitude: "19.132413",
    longitude: "72.927876",
    radius: 100,
    status: "Active",
    is_active: true,
  },
  {
    id: 2,
    name: "UBI",
    client_name: "Union Bank of India",
    address: "Nariman Point, Mumbai, Maharashtra 400021",
    latitude: "18.9262",
    longitude: "72.8219",
    radius: 150,
    status: "Active",
    is_active: true,
  },
  {
    id: 3,
    name: "TCS - Powai",
    client_name: "Tata Consultancy Services",
    address: "Powai, Mumbai, Maharashtra 400076",
    latitude: "19.123271",
    longitude: "72.808556",
    radius: 200,
    status: "Active",
    is_active: true,
  },
  {
    id: 4,
    name: "Infosys - Hinjawadi",
    client_name: "Infosys Limited",
    address: "Hinjawadi, Pune, Maharashtra 411057",
    latitude: "18.5913",
    longitude: "73.7389",
    radius: 100,
    status: "Active",
    is_active: true,
  },
  {
    id: 5,
    name: "L&T Infotech - Mahape",
    client_name: "Larsen & Toubro Infotech",
    address: "Millennium Business Park, Mahape, Navi Mumbai 400710",
    latitude: "19.1075",
    longitude: "73.0163",
    radius: 150,
    status: "Active",
    is_active: true,
  },
  {
    id: 6,
    name: "Barclays - EON Kharadi",
    client_name: "Barclays Global Service Centre",
    address: "EON Free Zone, Kharadi, Pune, Maharashtra 411014",
    latitude: "18.5516",
    longitude: "73.9535",
    radius: 120,
    status: "Active",
    is_active: true,
  },
  {
    id: 7,
    name: "Capgemini - Airoli",
    client_name: "Capgemini Technology Services",
    address: "Mindspace, Airoli, Navi Mumbai, Maharashtra 400708",
    latitude: "19.1578",
    longitude: "72.9986",
    radius: 150,
    status: "Inactive",
    is_active: false,
  },
];

const EMPTY_FORM = {
  name: "",
  client_name: "",
  address: "",
  radius: 150,
  latitude: "",
  longitude: "",
  status: "Active",
};

function validCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function getSiteInitials(site) {
  const name = (site?.name || "").trim();
  if (!name) return "CS";
  // If name has hyphen (e.g. "TCS - Powai" -> "TB" or "TP")
  const parts = name.split(/[-–—]/);
  if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
    const p1 = parts[0].trim();
    const p2 = parts[1].trim();
    return (p1[0] + p2[0]).toUpperCase();
  }
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/* =====================================================================
   ADD / EDIT CLIENT SITE MODAL
   ===================================================================== */
function GeoLocationModal({ mode, location, onClose, onSave }) {
  const [form, setForm] = useState(() =>
    mode === "edit" && location
      ? {
          name: location.name || "",
          client_name: location.client_name || "",
          address: location.address || "",
          radius: location.allowed_radius || location.radius || 150,
          latitude: location.latitude != null ? String(location.latitude) : "",
          longitude: location.longitude != null ? String(location.longitude) : "",
          status: location.status || (location.is_active !== false ? "Active" : "Inactive"),
        }
      : {
          name: "",
          client_name: "",
          address: "",
          radius: 150,
          latitude: "",
          longitude: "",
          status: "Active",
        }
  );

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (event) => {
    event.preventDefault();

    const required = ["name", "address", "latitude", "longitude"];
    if (required.some((key) => !String(form[key] ?? "").trim())) {
      window.alert("Please fill all required fields: Site Name, Address, Latitude, Longitude.");
      return;
    }

    if (!validCoordinates(form.latitude, form.longitude)) {
      window.alert("Please enter valid decimal coordinates for latitude (-90 to 90) and longitude (-180 to 180).");
      return;
    }

    onSave({
      ...form,
      id: location?.id,
      name: String(form.name).trim(),
      client_name: String(form.client_name || "").trim(),
      address: String(form.address).trim(),
      radius: Number(form.radius) || 150,
      latitude: String(form.latitude).trim(),
      longitude: String(form.longitude).trim(),
      status: form.status || "Active",
      is_active: form.status === "Active",
    });
  };

  return (
    <div className="geo-modal-backdrop modal-overlay" onMouseDown={onClose}>
      <form className="geo-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="geo-modal__header">
          <div>
            <span className="geo-modal__eyebrow">
              <MapPin size={14} />
              CLIENT SITE MANAGEMENT
            </span>
            <h2>{mode === "edit" ? "Edit Client Site" : "Add Client Site"}</h2>
            <p>
              {mode === "edit"
                ? "Update client site geo-fencing and location parameters."
                : "Configure a new client workplace for on-site employee attendance."}
            </p>
          </div>

          <button type="button" className="geo-icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="geo-modal__body">
          <div className="geo-form-grid">
            <label>
              <span>Site Name *</span>
              <input
                required
                placeholder="e.g. NCDX, TCS - Powai"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </label>

            <label>
              <span>Client Name</span>
              <input
                placeholder="e.g. National Commodity & Derivatives Exchange"
                value={form.client_name}
                onChange={(e) => update("client_name", e.target.value)}
              />
            </label>

            <label className="geo-form-grid__full">
              <span>Full Address *</span>
              <textarea
                required
                rows="3"
                placeholder="Building, street, area, city, state, pincode"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </label>

            <label>
              <span>Geofence Radius (meters) *</span>
              <input
                type="number"
                min="10"
                max="5000"
                step="10"
                required
                placeholder="e.g. 100, 150, 200"
                value={form.radius}
                onChange={(e) => update("radius", e.target.value)}
              />
            </label>

            <label>
              <span>Status</span>
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

            <label>
              <span>Latitude *</span>
              <input
                required
                inputMode="decimal"
                value={form.latitude}
                onChange={(e) => update("latitude", e.target.value)}
                placeholder="e.g. 19.132413"
              />
            </label>

            <label>
              <span>Longitude *</span>
              <input
                required
                inputMode="decimal"
                value={form.longitude}
                onChange={(e) => update("longitude", e.target.value)}
                placeholder="e.g. 72.927876"
              />
            </label>
          </div>

          <div className="geo-location-tip">
            <ShieldCheck size={17} />
            <span>
              Geo-fence radius defines the allowed check-in boundary. Field and on-site staff within
              this radius can successfully mark attendance.
            </span>
          </div>
        </div>

        <div className="geo-modal__footer">
          <button type="button" className="geo-button geo-button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="geo-button geo-button--primary">
            <Check size={16} />
            {mode === "edit" ? "Save Changes" : "Create Client Site"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =====================================================================
   VIEW CLIENT SITE DETAILS MODAL
   ===================================================================== */
function GeoViewModal({ location, onClose, onEdit, onToggle, onDelete }) {
  if (!location) return null;
  const isActive = location.status === "Active" || location.is_active === true;
  const initials = getSiteInitials(location);

  return (
    <div className="geo-modal-backdrop modal-overlay" onMouseDown={onClose}>
      <div className="geo-modal geo-modal--view" onMouseDown={(e) => e.stopPropagation()}>
        <div className="geo-modal__header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="geo-mob-card-avatar" style={{ width: "44px", height: "44px", fontSize: "15px" }}>
              {initials}
            </span>
            <div>
              <span className="geo-modal__eyebrow">
                <MapPin size={14} />
                CLIENT SITE DETAILS
              </span>
              <h2>{location.name}</h2>
              <p>{location.client_name || "General Client Site"}</p>
            </div>
          </div>

          <button type="button" className="geo-icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="geo-view-grid">
          <div className="geo-view-item">
            <span>Site Name</span>
            <strong>{location.name}</strong>
          </div>
          <div className="geo-view-item">
            <span>Status</span>
            <strong className={isActive ? "is-active" : "is-inactive"}>
              {isActive ? "Active" : "Inactive"}
            </strong>
          </div>
          <div className="geo-view-item geo-view-item--full">
            <span>Client</span>
            <strong>{location.client_name || "—"}</strong>
          </div>
          <div className="geo-view-item geo-view-item--full">
            <span>Address</span>
            <strong>{location.address || "—"}</strong>
          </div>
          <div className="geo-view-item">
            <span>Geofence Radius</span>
            <strong>{location.allowed_radius || location.radius || 150} meters</strong>
          </div>
          <div className="geo-view-item">
            <span>Coordinates</span>
            <strong style={{ fontSize: "12px" }}>
              {location.latitude}, {location.longitude}
            </strong>
          </div>
        </div>

        <div className="geo-modal__footer" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className={`geo-button ${isActive ? "geo-button--secondary" : "geo-button--primary"}`}
              onClick={() => onToggle(location)}
            >
              {isActive ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              className="geo-button geo-button--danger"
              onClick={() => onDelete(location)}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="geo-button geo-button--secondary" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="geo-button geo-button--primary"
              onClick={() => onEdit(location)}
            >
              <Pencil size={14} /> Edit Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   CONFIRMATION DIALOG (Deactivate / Delete)
   ===================================================================== */
function ConfirmModal({ title, message, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <div className="geo-modal-backdrop modal-overlay" onMouseDown={onCancel}>
      <div className="geo-confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className={`geo-confirm-modal__icon ${danger ? "is-danger" : ""}`}>
          {danger ? <Trash2 size={20} /> : <ShieldCheck size={20} />}
        </div>

        <h2>{title}</h2>
        <p>{message}</p>

        <div className="geo-confirm-modal__actions">
          <button type="button" className="geo-button geo-button--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`geo-button ${danger ? "geo-button--danger" : "geo-button--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   MAIN COMPONENT: GeoLocationMasterPage
   ===================================================================== */
function GeoLocationMasterPage() {
  const navigate = useNavigate();
  const API_BASE = getApiBaseUrl();

  function getAuthHeaders() {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  const [locations, setLocations] = useState(SEED_LOCATIONS);
  const [activeTab, setActiveTab] = useState("Active");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Load client sites from backend
  const loadSites = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/work-locations/client-sites`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const sites = Array.isArray(data) ? data : (data.client_sites || []);
        if (sites.length > 0) {
          setLocations(
            sites.map((s) => ({
              id: s.id,
              name: s.name,
              client_name: s.client_name || "",
              address: s.address || "",
              latitude: s.latitude != null ? String(s.latitude) : "",
              longitude: s.longitude != null ? String(s.longitude) : "",
              radius: s.allowed_radius != null ? s.allowed_radius : (s.radius || 150),
              status: s.status || (s.is_active !== false ? "Active" : "Inactive"),
              is_active: s.is_active !== false,
            }))
          );
        } else {
          setLocations(SEED_LOCATIONS);
        }
      })
      .catch((err) => {
        console.warn("Using initial client sites:", err);
        setLocations((prev) => (prev.length > 0 ? prev : SEED_LOCATIONS));
      })
      .finally(() => setLoading(false));
  }, [API_BASE]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return locations.filter((loc) => {
      const isLocActive = loc.status === "Active" || loc.is_active === true;
      const matchesTab = activeTab === "Active" ? isLocActive : !isLocActive;
      if (!matchesTab) return false;
      if (!query) return true;
      return [loc.name, loc.client_name, loc.address, loc.latitude, loc.longitude].some((v) =>
        String(v || "").toLowerCase().includes(query)
      );
    });
  }, [locations, activeTab, search]);

  const activeCount = useMemo(
    () => locations.filter((l) => l.status === "Active" || l.is_active === true).length,
    [locations]
  );
  const inactiveCount = useMemo(
    () => locations.filter((l) => l.status === "Inactive" || l.is_active === false).length,
    [locations]
  );

  const saveLocation = async (location) => {
    setSaving(true);
    try {
      const isEdit = !!location.id && typeof location.id === "number";
      const payload = {
        name: location.name.trim(),
        client_name: (location.client_name || "").trim(),
        address: (location.address || "").trim(),
        latitude: location.latitude ? parseFloat(location.latitude) : null,
        longitude: location.longitude ? parseFloat(location.longitude) : null,
        allowed_radius: parseFloat(location.radius || location.allowed_radius || 150),
        is_active: location.status === "Active" || location.is_active !== false,
      };
      const url = isEdit
        ? `${API_BASE}/work-locations/client-sites/${location.id}`
        : `${API_BASE}/work-locations/client-sites`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccessMsg(isEdit ? `"${location.name}" updated successfully.` : `"${location.name}" created successfully.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      setModal(null);
      loadSites();
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleLocation = async (location) => {
    setSaving(true);
    try {
      const isCurrentlyActive = location.status === "Active" || location.is_active === true;
      const newActive = !isCurrentlyActive;
      const res = await fetch(`${API_BASE}/work-locations/client-sites/${location.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: newActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccessMsg(`"${location.name}" ${newActive ? "activated" : "deactivated"}.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      setModal(null);
      loadSites();
    } catch (err) {
      setError(`Status update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (location) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/work-locations/client-sites/${location.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccessMsg(`"${location.name}" deleted.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      setModal(null);
      loadSites();
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <div className="geo-page">
        {/* Success / Error banners */}
        {successMsg && (
          <div className="geo-alert geo-alert--success">
            <Check size={16} /> <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="geo-alert geo-alert--error">
            <span>⚠ {error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
              <X size={15} />
            </button>
          </div>
        )}

        {/* ── DESKTOP VIEW (>768px): 100% Preserved Desktop Layout ── */}
        <div className="geo-desktop-view">
          <section className="geo-content-card">
            <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid var(--geo-border)" }}>
              <h3 style={{ margin: 0, fontFamily: "Poppins", fontSize: "15px" }}>Client Site Master</h3>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--geo-muted)" }}>
                Manage client site locations for attendance. Changes are saved to the database and affect all employees immediately.
              </p>
            </div>

            <div className="geo-toolbar-top">
              <div className="geo-tabs" role="tablist" aria-label="Location status">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "Active"}
                  className={activeTab === "Active" ? "is-active" : ""}
                  onClick={() => setActiveTab("Active")}
                >
                  Active <span>{activeCount}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "Inactive"}
                  className={activeTab === "Inactive" ? "is-active" : ""}
                  onClick={() => setActiveTab("Inactive")}
                >
                  Inactive <span>{inactiveCount}</span>
                </button>
              </div>

              <div className="geo-toolbar-actions">
                <div className="geo-search">
                  <Search size={15} style={{ color: "var(--geo-muted)" }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search client sites..."
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="geo-search-clear"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="geo-add-button"
                  onClick={() => setModal({ type: "form", mode: "add" })}
                >
                  <Plus size={16} /> Add Client Site
                </button>
              </div>
            </div>

            <div className="geo-table-wrap">
              <table className="geo-table">
                <thead>
                  <tr>
                    <th>Site Name</th>
                    <th>Client</th>
                    <th>Address</th>
                    <th>Coordinates</th>
                    <th>Radius (m)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "28px", color: "var(--geo-muted)" }}>
                        Loading client sites from database…
                      </td>
                    </tr>
                  ) : filteredLocations.map((location) => {
                    const isActive = location.status === "Active" || location.is_active === true;
                    return (
                      <tr key={location.id}>
                        <td>
                          <div className="geo-name-cell">
                            <span className="geo-location-icon">
                              <MapPin size={15} />
                            </span>
                            <span title={location.name}>{location.name}</span>
                          </div>
                        </td>
                        <td>{location.client_name || "—"}</td>
                        <td>
                          <span className="geo-address-cell" title={location.address}>
                            {location.address || "—"}
                          </span>
                        </td>
                        <td>
                          <div className="geo-coordinates">
                            <span>{location.latitude || "—"}</span>
                            <span>{location.longitude || "—"}</span>
                          </div>
                        </td>
                        <td>{location.allowed_radius || location.radius ? `${location.allowed_radius || location.radius}m` : "—"}</td>
                        <td>
                          <span className={`geo-status ${isActive ? "is-active" : "is-inactive"}`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="geo-row-actions">
                            <button
                              type="button"
                              className="geo-row-button"
                              title="Edit"
                              onClick={() => setModal({ type: "form", mode: "edit", location })}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="geo-row-button"
                              title="View"
                              onClick={() => setModal({ type: "view", location })}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              className={`geo-row-button ${isActive ? "is-danger" : "is-success"}`}
                              title={isActive ? "Deactivate" : "Activate"}
                              onClick={() => setModal({ type: "confirm-toggle", location })}
                            >
                              {isActive ? <ShieldCheck size={15} /> : <Check size={15} />}
                            </button>
                            <button
                              type="button"
                              className="geo-row-button is-danger"
                              title="Delete"
                              onClick={() => setModal({ type: "confirm-delete", location })}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && !filteredLocations.length && (
                    <tr>
                      <td colSpan="7">
                        <div className="geo-empty-state">
                          <div className="geo-empty-state__icon">
                            <MapPin size={24} />
                          </div>
                          <h3>No {activeTab.toLowerCase()} client sites found</h3>
                          <p>{search ? "Try a different search term." : "Add a client site to start managing work locations."}</p>
                          {!search && (
                            <button
                              type="button"
                              className="geo-button geo-button--primary"
                              onClick={() => setModal({ type: "form", mode: "add" })}
                            >
                              <Plus size={15} /> Add Client Site
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="geo-footer">
              <span>
                Showing <strong>{filteredLocations.length}</strong> of{" "}
                <strong>{activeTab === "Active" ? activeCount : inactiveCount}</strong> {activeTab.toLowerCase()} sites
              </span>
              <button type="button" className="geo-row-button" title="Refresh from database" onClick={loadSites}>
                <Search size={14} /> Refresh
              </button>
            </div>
          </section>
        </div>

        {/* ── MOBILE VIEW (<=768px): Option B (Site Management List) ── */}
        <div className="geo-mobile-view">
          {/* 1. Client Site Master description card */}
          <div className="geo-mob-desc-card">
            <h3 className="geo-mob-desc-title">Client Site Master</h3>
            <p className="geo-mob-desc-subtitle">
              Manage the client sites and define geo-fencing to enable attendance tracking for field and on-site employees.
            </p>
          </div>

          {/* 2. Active / Inactive tabs with live counts */}
          <div className="geo-mob-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Active"}
              className={`geo-mob-tab ${activeTab === "Active" ? "is-active" : ""}`}
              onClick={() => setActiveTab("Active")}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Inactive"}
              className={`geo-mob-tab ${activeTab === "Inactive" ? "is-active" : ""}`}
              onClick={() => setActiveTab("Inactive")}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          {/* 3. Full-width site search */}
          <div className="geo-mob-search-wrap">
            <Search size={17} className="geo-mob-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search site name, client or location..."
              className="geo-mob-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="geo-mob-search-clear"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* 4. Prominent Add Client Site button */}
          <button
            type="button"
            className="geo-mob-add-btn"
            onClick={() => setModal({ type: "form", mode: "add" })}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add Client Site</span>
          </button>

          {/* 5. Individual site cards */}
          <div className="geo-mob-cards-list">
            {loading ? (
              <div className="geo-mob-loading">
                <span>Loading client sites from database…</span>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="geo-mob-empty-card">
                <MapPin size={32} style={{ color: "#7c3aed" }} />
                <h4>No {activeTab.toLowerCase()} client sites found</h4>
                <p>{search ? "No sites match your search." : `No ${activeTab.toLowerCase()} client sites configured yet.`}</p>
                {!search && (
                  <button
                    type="button"
                    className="geo-mob-empty-btn"
                    onClick={() => setModal({ type: "form", mode: "add" })}
                  >
                    <Plus size={15} /> Add Client Site
                  </button>
                )}
              </div>
            ) : (
              filteredLocations.map((site) => {
                const initials = getSiteInitials(site);
                const radiusVal = site.allowed_radius || site.radius || 200;
                const isActive = site.status === "Active" || site.is_active === true;

                return (
                  <div
                    key={site.id}
                    className="geo-mob-card"
                    onClick={() => setModal({ type: "view", location: site })}
                  >
                    {/* Top Row: Avatar + Names + Status Badge */}
                    <div className="geo-mob-card-head">
                      <div className="geo-mob-card-head-left">
                        <span
                          className="geo-mob-card-avatar"
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
                          {initials}
                        </span>
                        <div className="geo-mob-card-names">
                          <h4 className="geo-mob-card-site-name">{site.name}</h4>
                          <span className="geo-mob-card-client-name">
                            {site.client_name || "General Client Site"}
                          </span>
                        </div>
                      </div>

                      <span className={`geo-mob-status-badge ${isActive ? "active" : "inactive"}`}>
                        <span className={`geo-mob-status-dot ${isActive ? "active" : "inactive"}`} />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Middle Section: Location & Radius */}
                    <div className="geo-mob-card-details">
                      <div className="geo-mob-detail-row">
                        <MapPin size={14} className="geo-mob-detail-icon" />
                        <span className="geo-mob-detail-text">{site.address || "No address specified"}</span>
                      </div>

                      <div className="geo-mob-detail-row">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray="3 3"
                          className="geo-mob-detail-icon"
                        >
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                        <span className="geo-mob-detail-text">Radius: {radiusVal} meters</span>
                      </div>
                    </div>

                    {/* Bottom Row: View / Edit Button */}
                    <div className="geo-mob-card-footer">
                      <button
                        type="button"
                        className="geo-mob-view-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal({ type: "form", mode: "edit", location: site });
                        }}
                      >
                        <Pencil size={13} />
                        <span>View / Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modals */}
        {modal?.type === "form" && (
          <GeoLocationModal
            mode={modal.mode}
            location={modal.location}
            onClose={() => setModal(null)}
            onSave={saveLocation}
          />
        )}
        {modal?.type === "view" && (
          <GeoViewModal
            location={modal.location}
            onClose={() => setModal(null)}
            onEdit={(loc) => setModal({ type: "form", mode: "edit", location: loc })}
            onToggle={(loc) => setModal({ type: "confirm-toggle", location: loc })}
            onDelete={(loc) => setModal({ type: "confirm-delete", location: loc })}
          />
        )}
        {modal?.type === "confirm-toggle" && (
          <ConfirmModal
            title={modal.location.status === "Active" || modal.location.is_active === true ? "Deactivate client site?" : "Activate client site?"}
            message={modal.location.status === "Active" || modal.location.is_active === true
              ? `Employees will no longer be able to punch in at "${modal.location.name}".`
              : `"${modal.location.name}" will become available again for client-site attendance.`}
            confirmLabel={modal.location.status === "Active" || modal.location.is_active === true ? "Deactivate" : "Activate"}
            onCancel={() => setModal(null)}
            onConfirm={() => toggleLocation(modal.location)}
          />
        )}
        {modal?.type === "confirm-delete" && (
          <ConfirmModal
            title="Delete client site?"
            message={`This permanently removes "${modal.location.name}" from the database.`}
            confirmLabel="Delete"
            danger
            onCancel={() => setModal(null)}
            onConfirm={() => deleteLocation(modal.location)}
          />
        )}
      </div>
    </DashboardShell>
  );
}

export default GeoLocationMasterPage;