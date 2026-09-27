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
import { getApiBaseUrl } from "../../utils/apiBase";
import { DEFAULT_OFFICE_LOCATIONS } from "../../utils/geoFence";
import "./GeoLocationMaster.css";

const STORAGE_KEY = "laesfera_geo_locations";

const SEED_LOCATIONS = DEFAULT_OFFICE_LOCATIONS;

const EMPTY_FORM = {
  name: "",
  city: "",
  state: "",
  address: "",
  latitude: "",
  longitude: "",
  radius_km: 1.0,
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
      radius_km: parseFloat(form.radius_km || 1.0),
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

            <label>
              <span>Allowed Attendance Radius (km) *</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="50"
                value={form.radius_km ?? 1.0}
                onChange={(e) => update("radius_km", e.target.value)}
                placeholder="1.0"
              />
            </label>
          </div>

          <div className="geo-location-tip">
            <ShieldCheck size={17} />
            <span>
              Coordinates and 1.0 km radius define the allowed workplace zone. Employees outside this perimeter will be blocked with live invalid location alert.
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
          <div className="geo-view-item">
            <span>Allowed Radius</span>
            <strong>{location.radius_km || 1.0} km</strong>
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

  useEffect(() => {
    const fetchBackendLocations = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/locations/geo-master`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setLocations(data);
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote geo locations:", err);
      }
    };
    fetchBackendLocations();
  }, []);

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

  const saveLocation = async (location) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/locations/geo-master`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });
      if (res.ok) {
        const saved = await res.json();
        setLocations((current) => {
          const exists = current.some((item) => item.id === saved.id);
          return exists
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [saved, ...current];
        });
        setModal(null);
        return;
      }
    } catch (err) {
      console.warn("Error saving location to backend, saving locally:", err);
    }

    setLocations((current) => {
      const exists = current.some((item) => item.id === location.id);
      return exists
        ? current.map((item) => (item.id === location.id ? location : item))
        : [location, ...current];
    });
    setModal(null);
  };

  const deactivateLocation = async (location) => {
    const updated = {
      ...location,
      status: location.status === "Active" ? "Inactive" : "Active",
    };
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/locations/geo-master`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const saved = await res.json();
        setLocations((current) =>
          current.map((item) => (item.id === saved.id ? saved : item))
        );
        setModal(null);
        return;
      }
    } catch (err) {
      console.warn("Error updating status to backend:", err);
    }

    setLocations((current) =>
      current.map((item) => (item.id === location.id ? updated : item))
    );
    setModal(null);
  };

  const deleteLocation = async (location) => {
    try {
      await fetch(`${getApiBaseUrl()}/api/v1/locations/geo-master/${location.id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Error deleting location from backend:", err);
    }
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
                  <th>Allowed Radius</th>
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
                      <span className="geo-radius-badge">
                        {location.radius_km || 1.0} km
                      </span>
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
                    <td colSpan="8">
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
