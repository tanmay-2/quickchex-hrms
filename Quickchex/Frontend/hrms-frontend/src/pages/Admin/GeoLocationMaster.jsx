import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
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

const STORAGE_KEY = "laesfera_geo_locations";

const SEED_LOCATIONS = [
  {
    id: "loc-001",
    name: "NCDEX",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Kanjur Station Road, Kanjur West, S Ward, Mumbai Zone 6, Mumbai, Mumbai Suburban District, Maharashtra, 400042, India",
    latitude: "19.13241306584792",
    longitude: "72.92787611957756",
    status: "Active",
  },
  {
    id: "loc-002",
    name: "NCDEX",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Kanjur Station Road, Kanjur West, S Ward, Mumbai Zone 6, Mumbai, Mumbai Suburban District, Maharashtra, 400042, India",
    latitude: "19.132512",
    longitude: "72.927946000001",
    status: "Active",
  },
  {
    id: "loc-003",
    name: "Jeevan Seva Building",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Swami Vivekanand Road, JEEVAN SHANTI COLONY, Vile Parle West, K/W Ward, Mumbai Zone 3, Mumbai, Mumbai Suburban District, Maharashtra, 400057, India",
    latitude: "19.0933709",
    longitude: "72.8398086",
    status: "Active",
  },
  {
    id: "loc-004",
    name: "Mittal Chambers, Nariman Point",
    city: "Mumbai",
    state: "Maharashtra",
    address: "NCPA Marg, Nariman Point, Colaba, A Ward, Mumbai Zone 1, Mumbai City District, Maharashtra, 400021, India",
    latitude: "18.9262",
    longitude: "72.8219",
    status: "Active",
  },
  {
    id: "loc-005",
    name: "LIC Colony, Suresh Colony",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Kothu Wadi, Vile Parle West, K/W Ward, Mumbai Zone 3, Mumbai, Mumbai Suburban District, Maharashtra, 400054, India",
    latitude: "19.0927141",
    longitude: "72.8404524",
    status: "Active",
  },
  {
    id: "loc-006",
    name: "Thane Hiranandani Front",
    city: "Thane",
    state: "Maharashtra",
    address: "Central Avenue, Hiranandani Estate, Brahmand Nagar, Thane, Thane Subdistrict, Thane, Maharashtra, 400607, India",
    latitude: "19.2521953",
    longitude: "72.9808554",
    status: "Active",
  },
  {
    id: "loc-007",
    name: "Cuffe Parade",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Nature's Basket, T L Waswani Road, Cuffe Parade, Colaba, A Ward, Mumbai Zone 1, Mumbai, Mumbai City District, Maharashtra, 400005, India",
    latitude: "18.9145662",
    longitude: "72.8179441",
    status: "Active",
  },
  {
    id: "loc-008",
    name: "Kandivali West",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Goregaon Link Road, Renuka Nagar, Mahavir Nagar, R/S Ward, Mumbai Zone 4, Mumbai Suburban District, Maharashtra, 400067, India",
    latitude: "19.2111092",
    longitude: "72.8356159",
    status: "Active",
  },
  {
    id: "loc-009",
    name: "Ghodbunder",
    city: "Thane",
    state: "Maharashtra",
    address: "Anand Nagar, Thane, Thane Subdistrict, Thane, Maharashtra, 400615, India",
    latitude: "19.2650059",
    longitude: "72.9630347",
    status: "Active",
  },
  {
    id: "loc-010",
    name: "FORT",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Mupanna P Shetty Marg, Kala Ghoda, Fort, Mumbai Zone 1, Mumbai City District, Maharashtra, 400032, India",
    latitude: "18.9310646",
    longitude: "72.8331541",
    status: "Active",
  },
  {
    id: "loc-011",
    name: "Palghar",
    city: "Boisar",
    state: "Maharashtra",
    address: "Boisar, Palghar Subdistrict, Palghar, Maharashtra, 401504, India",
    latitude: "19.8025181",
    longitude: "72.7573132",
    status: "Active",
  },
  {
    id: "loc-012",
    name: "Powai",
    city: "Mumbai",
    state: "Maharashtra",
    address: "New MHADA Colony Road, Tunga Village, L Ward, Mumbai Zone 5, Mumbai, Mumbai Suburban District, Maharashtra, 400087, India",
    latitude: "19.1232718",
    longitude: "72.8085564",
    status: "Active",
  },
  {
    id: "loc-013",
    name: "Thane Hiranandani",
    city: "Thane",
    state: "Maharashtra",
    address: "Regent Street, Hiranandani Estate, Waghbil, Thane, Thane Subdistrict, Thane, Maharashtra, 400607, India",
    latitude: "19.2628793",
    longitude: "72.9484532",
    status: "Active",
  },
  {
    id: "loc-014",
    name: "Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Mumbai Central business location, Maharashtra, India",
    latitude: "19.11043",
    longitude: "72.887818",
    status: "Active",
  },
];

const EMPTY_FORM = {
  name: "",
  city: "",
  state: "",
  address: "",
  latitude: "",
  longitude: "",
  status: "Active",
};

function loadLocations() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return SEED_LOCATIONS;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : SEED_LOCATIONS;
  } catch {
    return SEED_LOCATIONS;
  }
}

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

function GeoLocationModal({ mode, location, onClose, onSave }) {
  const [form, setForm] = useState(() =>
    mode === "edit" && location ? { ...location } : { ...EMPTY_FORM }
  );

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (event) => {
    event.preventDefault();

    const required = ["name", "city", "state", "address", "latitude", "longitude"];
    if (required.some((key) => !String(form[key] ?? "").trim())) {
      window.alert("Please fill all required location fields.");
      return;
    }

    if (!validCoordinates(form.latitude, form.longitude)) {
      window.alert("Please enter valid latitude and longitude values.");
      return;
    }

    onSave({
      ...form,
      id: location?.id || `loc-${Date.now()}`,
      latitude: String(form.latitude).trim(),
      longitude: String(form.longitude).trim(),
      status: form.status || "Active",
    });
  };

  return (
    <div className="geo-modal-backdrop" onMouseDown={onClose}>
      <form className="geo-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="geo-modal__header">
          <div>
            <span className="geo-modal__eyebrow">
              <MapPin size={14} />
              LOCATION MANAGEMENT
            </span>
            <h2>{mode === "edit" ? "Edit Location" : "Add Location"}</h2>
            <p>
              {mode === "edit"
                ? "Update the location details and status."
                : "Create a new geo-fenced organization location."}
            </p>
          </div>

          <button type="button" className="geo-icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="geo-modal__body">
          <div className="geo-form-grid">
            <label>
              <span>Location Name *</span>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} />
            </label>

            <label>
              <span>City *</span>
              <input value={form.city} onChange={(e) => update("city", e.target.value)} />
            </label>

            <label>
              <span>State *</span>
              <input value={form.state} onChange={(e) => update("state", e.target.value)} />
            </label>

            <label>
              <span>Status</span>
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

            <label className="geo-form-grid__full">
              <span>Address *</span>
              <textarea
                rows="4"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </label>

            <label>
              <span>Latitude *</span>
              <input
                inputMode="decimal"
                value={form.latitude}
                onChange={(e) => update("latitude", e.target.value)}
                placeholder="19.123456"
              />
            </label>

            <label>
              <span>Longitude *</span>
              <input
                inputMode="decimal"
                value={form.longitude}
                onChange={(e) => update("longitude", e.target.value)}
                placeholder="72.987654"
              />
            </label>
          </div>

          <div className="geo-location-tip">
            <ShieldCheck size={17} />
            <span>
              Coordinates are used for attendance location verification and should match the
              approved workplace location.
            </span>
          </div>
        </div>

        <div className="geo-modal__footer">
          <button type="button" className="geo-button geo-button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="geo-button geo-button--primary">
            <Check size={16} />
            {mode === "edit" ? "Save Changes" : "Add Location"}
          </button>
        </div>
      </form>
    </div>
  );
}

function GeoViewModal({ location, onClose }) {
  if (!location) return null;

  return (
    <div className="geo-modal-backdrop" onMouseDown={onClose}>
      <div className="geo-modal geo-modal--view" onMouseDown={(e) => e.stopPropagation()}>
        <div className="geo-modal__header">
          <div>
            <span className="geo-modal__eyebrow">
              <MapPin size={14} />
              LOCATION DETAILS
            </span>
            <h2>{location.name}</h2>
            <p>{location.city}, {location.state}</p>
          </div>

          <button type="button" className="geo-icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="geo-view-grid">
          <div className="geo-view-item">
            <span>Location</span>
            <strong>{location.name}</strong>
          </div>
          <div className="geo-view-item">
            <span>Status</span>
            <strong className={location.status === "Active" ? "is-active" : "is-inactive"}>
              {location.status}
            </strong>
          </div>
          <div className="geo-view-item geo-view-item--full">
            <span>Address</span>
            <strong>{location.address}</strong>
          </div>
          <div className="geo-view-item">
            <span>Latitude</span>
            <strong>{location.latitude}</strong>
          </div>
          <div className="geo-view-item">
            <span>Longitude</span>
            <strong>{location.longitude}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <div className="geo-modal-backdrop" onMouseDown={onCancel}>
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

function GeoLocationMasterPage() {
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const [locations, setLocations] = useState(loadLocations);
  const [activeTab, setActiveTab] = useState("Active");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
    } catch {
      // Ignore unavailable browser storage.
    }
  }, [locations]);

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return locations.filter((location) => {
      const matchesTab = location.status === activeTab;
      if (!matchesTab) return false;

      if (!query) return true;

      return [
        location.name,
        location.city,
        location.state,
        location.address,
        location.latitude,
        location.longitude,
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [locations, activeTab, search]);

  const activeCount = locations.filter((item) => item.status === "Active").length;
  const inactiveCount = locations.filter((item) => item.status === "Inactive").length;

  const saveLocation = (location) => {
    setLocations((current) => {
      const exists = current.some((item) => item.id === location.id);
      return exists
        ? current.map((item) => (item.id === location.id ? location : item))
        : [location, ...current];
    });
    setModal(null);
  };

  const deactivateLocation = (location) => {
    setLocations((current) =>
      current.map((item) =>
        item.id === location.id
          ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" }
          : item
      )
    );
    setModal(null);
  };

  const deleteLocation = (location) => {
    setLocations((current) => current.filter((item) => item.id !== location.id));
    setModal(null);
  };

  return (
    <DashboardShell>
      <div className="geo-page">

        <section className="geo-content-card">
          <div className="geo-toolbar-top">
            <div className="geo-tabs" role="tablist" aria-label="Location status">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "Active"}
                className={activeTab === "Active" ? "is-active" : ""}
                onClick={() => setActiveTab("Active")}
              >
                Active Location
                <span>{activeCount}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "Inactive"}
                className={activeTab === "Inactive" ? "is-active" : ""}
                onClick={() => setActiveTab("Inactive")}
              >
                Inactive Locations
                <span>{inactiveCount}</span>
              </button>
            </div>

            <div className="geo-toolbar-actions">
              <div className="geo-search">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search locations..."
                  aria-label="Search locations"
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
                <Plus size={16} />
                Add Location
              </button>
            </div>
          </div>

          <div className="geo-table-wrap">
            <table className="geo-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Address</th>
                  <th>Latitude/Longitude</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredLocations.map((location) => (
                  <tr key={location.id}>
                    <td>
                      <div className="geo-name-cell">
                        <span className="geo-location-icon">
                          <MapPin size={15} />
                        </span>
                        <span title={location.name}>{location.name}</span>
                      </div>
                    </td>

                    <td>{location.city}</td>
                    <td>{location.state}</td>

                    <td>
                      <span className="geo-address-cell" title={location.address}>
                        {location.address}
                      </span>
                    </td>

                    <td>
                      <div className="geo-coordinates">
                        <span>{location.latitude}</span>
                        <span>{location.longitude}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`geo-status ${
                          location.status === "Active" ? "is-active" : "is-inactive"
                        }`}
                      >
                        {location.status}
                      </span>
                    </td>

                    <td>
                      <div className="geo-row-actions">
                        <button
                          type="button"
                          className="geo-row-button"
                          title="Edit"
                          aria-label={`Edit ${location.name}`}
                          onClick={() => setModal({ type: "form", mode: "edit", location })}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="geo-row-button"
                          title="View"
                          aria-label={`View ${location.name}`}
                          onClick={() => setModal({ type: "view", location })}
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          type="button"
                          className={`geo-row-button ${
                            location.status === "Active" ? "is-danger" : "is-success"
                          }`}
                          title={location.status === "Active" ? "Deactivate" : "Activate"}
                          aria-label={
                            location.status === "Active"
                              ? `Deactivate ${location.name}`
                              : `Activate ${location.name}`
                          }
                          onClick={() =>
                            setModal({
                              type: "confirm-toggle",
                              location,
                            })
                          }
                        >
                          {location.status === "Active" ? <ShieldCheck size={15} /> : <Check size={15} />}
                        </button>

                        <button
                          type="button"
                          className="geo-row-button is-danger"
                          title="Delete"
                          aria-label={`Delete ${location.name}`}
                          onClick={() =>
                            setModal({
                              type: "confirm-delete",
                              location,
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!filteredLocations.length && (
                  <tr>
                    <td colSpan="7">
                      <div className="geo-empty-state">
                        <div className="geo-empty-state__icon">
                          <MapPin size={24} />
                        </div>
                        <h3>No {activeTab.toLowerCase()} locations found</h3>
                        <p>
                          {search
                            ? "Try a different search term."
                            : "Add a location to start managing geo locations."}
                        </p>
                        {!search && (
                          <button
                            type="button"
                            className="geo-button geo-button--primary"
                            onClick={() => setModal({ type: "form", mode: "add" })}
                          >
                            <Plus size={15} />
                            Add Location
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
              <strong>{activeTab === "Active" ? activeCount : inactiveCount}</strong>{" "}
              {activeTab.toLowerCase()} locations
            </span>
          </div>
        </section>

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
          />
        )}

        {modal?.type === "confirm-toggle" && (
          <ConfirmModal
            title={
              modal.location.status === "Active"
                ? "Deactivate location?"
                : "Activate location?"
            }
            message={
              modal.location.status === "Active"
                ? `Employees will no longer be able to use "${modal.location.name}" as an active geo location.`
                : `This will make "${modal.location.name}" available again for active location workflows.`
            }
            confirmLabel={modal.location.status === "Active" ? "Deactivate" : "Activate"}
            onCancel={() => setModal(null)}
            onConfirm={() => deactivateLocation(modal.location)}
          />
        )}

        {modal?.type === "confirm-delete" && (
          <ConfirmModal
            title="Delete location?"
            message={`This permanently removes "${modal.location.name}" from the geo location master.`}
            confirmLabel="Delete Location"
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
