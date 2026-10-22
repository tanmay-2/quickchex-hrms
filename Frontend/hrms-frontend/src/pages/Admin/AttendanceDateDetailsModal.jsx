import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  FileText,
  Maximize2,
  Camera,
  Map as MapIcon,
  User as UserIcon,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { getApiBaseUrl } from "../../services/apiClient";
import "./AttendanceDateDetailsModal.css";

/** Helper to resolve profile or punch images into a fully loadable URL / base64 */
export function resolveImageUrl(src) {
  if (!src || typeof src !== "string") return null;
  const s = src.trim();
  if (
    !s ||
    s === "null" ||
    s === "undefined" ||
    s === "—" ||
    s === "-" ||
    s.toLowerCase() === "none"
  ) {
    return null;
  }
  if (
    s.startsWith("data:") ||
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("blob:")
  ) {
    return s;
  }
  const clean = s.replace(/^\/+/, "/");
  const base = getApiBaseUrl ? getApiBaseUrl() : "";
  return base ? `${base.replace(/\/$/, "")}${clean}` : clean;
}

/** Generates 2-letter uppercase initials */
function getInitials(name) {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

/** Resolves status badge class & label */
function resolveBadge(status, code) {
  const s = (status || "").toLowerCase();
  const c = (code || "").toUpperCase();

  if (s.includes("present") || c === "P") {
    return { label: "Present", className: "present" };
  }
  if (s.includes("half") || c === "HD" || c === "HD2") {
    return { label: "Half Day", className: "half-day" };
  }
  if (s.includes("leave") || c === "L" || c === "LV" || c === "1H" || c === "2H") {
    return { label: "Leave", className: "leave" };
  }
  if (s.includes("holiday") || c === "H") {
    return { label: "Holiday", className: "holiday" };
  }
  if (s.includes("week") || c === "WO") {
    return { label: "Week Off", className: "week-off" };
  }
  if (s.includes("missing") || c === "MP") {
    return { label: "Missing Punch", className: "missing-punch" };
  }
  if (s.includes("absent") || c === "A") {
    return { label: "Absent", className: "absent" };
  }
  return { label: status || "—", className: "default" };
}

/** Cleans multi-token location strings e.g. "loc1 * loc2" */
function formatLocation(loc) {
  if (!loc || typeof loc !== "string") return "—";
  if (loc.includes("*")) {
    const rawTokens = loc.split("*").map((t) => t.trim()).filter(Boolean);
    const seen = new Set();
    const unique = [];
    for (const t of rawTokens) {
      const lower = t.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(t);
      }
    }
    return unique.join(", ") || "—";
  }
  return loc.trim() || "—";
}

export default function AttendanceDateDetailsModal({
  isOpen,
  onClose,
  record,
  employee,
}) {
  const [lightboxImg, setLightboxImg] = useState(null);
  const [profileImgError, setProfileImgError] = useState(false);
  const [punchInImgError, setPunchInImgError] = useState(false);
  const [punchOutImgError, setPunchOutImgError] = useState(false);

  useEffect(() => {
    // Reset image error states when record changes
    setProfileImgError(false);
    setPunchInImgError(false);
    setPunchOutImgError(false);
    setLightboxImg(null);
  }, [record?.date, record?.emp_code, employee?.emp_code]);

  useEffect(() => {
    // Handle Escape key to close modal or lightbox
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (lightboxImg) {
          setLightboxImg(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, lightboxImg, onClose]);

  if (!isOpen || !record) return null;

  // Resolve employee identity
  const empName =
    employee?.name ||
    record.name ||
    record.employee_name ||
    employee?.emp_code ||
    record.emp_code ||
    "Employee";

  const empCode = employee?.emp_code || record.emp_code || "—";
  const managerName = employee?.manager || record.manager || "—";
  const rawProfileImage = employee?.profile_image || record.profile_image || null;
  const profileImageUrl = resolveImageUrl(rawProfileImage);

  // Status & Badges
  const badgeInfo = resolveBadge(record.status, record.badge_code || record.badge);

  // Timestamps & Working Hours
  const punchInTime = record.checkIn || record.punch_in || "—";
  let punchOutTime = record.checkOut || record.punch_out || "—";
  let isNextDay = false;

  if (punchOutTime && typeof punchOutTime === "string") {
    if (punchOutTime.toLowerCase().includes("next day")) {
      isNextDay = true;
      punchOutTime = punchOutTime.replace(/\(next day\)/gi, "").trim();
    }
  }

  // Date display with day name (e.g. 21 Oct 2026 (Wed))
  const rawDateStr = record.date || record.formattedDate || "—";
  let resolvedDay = record.dayName || "";
  if (!resolvedDay && (record.isoDate || record.date)) {
    try {
      const d = new Date(record.isoDate || record.date);
      if (!isNaN(d.getTime())) {
        resolvedDay = d.toLocaleDateString("en-US", { weekday: "short" });
      }
    } catch (e) {}
  }
  const dateDisplay =
    rawDateStr !== "—" && resolvedDay && !rawDateStr.includes("(")
      ? `${rawDateStr} (${resolvedDay})`
      : rawDateStr;

  const workingHours = record.workingHours || record.working_hours || "—";
  const leaveStatus = record.leave_status || record.leaveStatus || "None";
  const remarks = record.remarks || record.remark || "—";

  // Location resolution
  const punchInLoc = formatLocation(
    record.punch_in_location || record.location || employee?.location
  );
  const punchOutLoc = formatLocation(
    record.punch_out_location || record.location || employee?.location
  );
  const overallLocation = formatLocation(
    record.location || record.punch_in_location || employee?.location
  );

  // Punch Photos
  const punchInImageUrl = resolveImageUrl(record.punch_in_image || record.punch_in_photo);
  const punchOutImageUrl = resolveImageUrl(record.punch_out_image || record.punch_out_photo);

  const handleOpenMap = (lat, lng, locStr) => {
    if (lat && lng) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        "_blank",
        "noopener,noreferrer"
      );
    } else if (locStr && locStr !== "—") {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locStr)}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <>
      <div className="addm-backdrop" onClick={onClose} role="dialog" aria-modal="true">
        <div className="addm-modal" onClick={(e) => e.stopPropagation()}>
          {/* ── Modal Header ── */}
          <div className="addm-header">
            <h3 className="addm-title">Attendance Date Details</h3>
            <button
              type="button"
              className="addm-close-x"
              onClick={onClose}
              aria-label="Close details modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="addm-body">
            {/* 1. Employee Summary Card */}
            <div className="addm-emp-card">
              <div className="addm-emp-left">
                <div className="addm-avatar-wrap">
                  {profileImageUrl && !profileImgError ? (
                    <img
                      src={profileImageUrl}
                      alt={empName}
                      className="addm-avatar-img"
                      onError={() => setProfileImgError(true)}
                    />
                  ) : (
                    <span className="addm-avatar-initials">{getInitials(empName)}</span>
                  )}
                </div>

                <div className="addm-emp-meta">
                  <div className="addm-name-row">
                    <h4 className="addm-emp-name">{empName}</h4>
                    <span className={`addm-badge ${badgeInfo.className}`}>
                      {badgeInfo.label}
                    </span>
                  </div>
                  <p className="addm-emp-sub">
                    Employee Code: <strong>{empCode}</strong>
                  </p>
                  <p className="addm-emp-sub">
                    Reporting Manager: <strong>{managerName}</strong>
                  </p>
                </div>
              </div>

              <div className="addm-emp-right">
                <div className="addm-date-pill">
                  <Calendar size={14} color="#7C3AED" />
                  <span>{dateDisplay}</span>
                </div>
                <span className={`addm-badge ${badgeInfo.className}`}>
                  {badgeInfo.label}
                </span>
              </div>
            </div>

            {/* 2. Attendance Details (2-Column Grid on Desktop, Stacked on Mobile) */}
            <div className="addm-details-grid">
              {/* Left Column */}
              <div className="addm-detail-col">
                <div className="addm-detail-item">
                  <div className="addm-detail-icon-wrap">
                    <Clock size={15} />
                  </div>
                  <div className="addm-detail-content">
                    <span className="addm-detail-label">Punch In</span>
                    <strong className="addm-detail-val">{punchInTime}</strong>
                  </div>
                </div>

                <div className="addm-detail-item">
                  <div className="addm-detail-icon-wrap">
                    <LogOut size={15} />
                  </div>
                  <div className="addm-detail-content">
                    <span className="addm-detail-label">Punch Out</span>
                    <strong className="addm-detail-val">
                      {punchOutTime}
                      {isNextDay && <span className="addm-next-day">(Next Day)</span>}
                    </strong>
                  </div>
                </div>

                <div className="addm-detail-item">
                  <div className="addm-detail-icon-wrap">
                    <Clock size={15} />
                  </div>
                  <div className="addm-detail-content">
                    <span className="addm-detail-label">Working Hours</span>
                    <strong className="addm-detail-val">{workingHours}</strong>
                  </div>
                </div>

                <div className="addm-detail-item">
                  <div className="addm-detail-icon-wrap">
                    <Calendar size={15} />
                  </div>
                  <div className="addm-detail-content">
                    <span className="addm-detail-label">Leave Status</span>
                    <strong className="addm-detail-val">{leaveStatus}</strong>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="addm-detail-col">
                <div className="addm-location-item">
                  <div className="addm-detail-icon-wrap">
                    <MapPin size={15} />
                  </div>
                  <div className="addm-location-block">
                    <span className="addm-location-header">Location</span>
                    <span className="addm-location-text">{overallLocation}</span>
                    {overallLocation !== "—" && (
                      <button
                        type="button"
                        className="addm-map-btn"
                        onClick={() =>
                          handleOpenMap(
                            record.punch_in_latitude || record.punch_out_latitude,
                            record.punch_in_longitude || record.punch_out_longitude,
                            overallLocation
                          )
                        }
                        title="View Location on Google Maps"
                      >
                        <MapIcon size={12} />
                        <span>View on Map</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="addm-detail-item">
                  <div className="addm-detail-icon-wrap">
                    <FileText size={15} />
                  </div>
                  <div className="addm-detail-content">
                    <span className="addm-detail-label">Remarks</span>
                    <strong className="addm-detail-val">{remarks}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Punch Photos Section */}
            <div className="addm-photos-grid">
              {/* Card 1: Punch In Photo */}
              <div className="addm-photo-card">
                <div className="addm-photo-card-head">
                  <div className="addm-photo-tag">
                    <span className="addm-photo-dot in" />
                    <span>Punch In Photo</span>
                  </div>
                  <span className="addm-photo-time">{punchInTime}</span>
                </div>

                <div
                  className="addm-photo-box"
                  onClick={() => {
                    if (punchInImageUrl && !punchInImgError) {
                      setLightboxImg({
                        src: punchInImageUrl,
                        title: `Punch In Photo — ${punchInTime}`,
                        location: punchInLoc,
                      });
                    }
                  }}
                >
                  {punchInImageUrl && !punchInImgError ? (
                    <>
                      <img
                        src={punchInImageUrl}
                        alt="Punch In Photo"
                        className="addm-photo-img"
                        onError={() => setPunchInImgError(true)}
                      />
                      <button
                        type="button"
                        className="addm-expand-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImg({
                            src: punchInImageUrl,
                            title: `Punch In Photo — ${punchInTime}`,
                            location: punchInLoc,
                          });
                        }}
                        title="View Fullscreen Photo"
                        aria-label="Expand punch in photo"
                      >
                        <Maximize2 size={13} />
                      </button>
                    </>
                  ) : (
                    <div className="addm-photo-empty">
                      <Camera size={26} strokeWidth={1.5} />
                      <span className="addm-photo-empty-text">No photo available</span>
                    </div>
                  )}
                </div>

                <div className="addm-photo-footer">
                  <div className="addm-photo-loc-left" title={punchInLoc}>
                    <MapPin size={12} color="#7C3AED" />
                    <span className="addm-photo-loc-text">{punchInLoc}</span>
                  </div>
                  {punchInLoc !== "—" && (
                    <button
                      type="button"
                      className="addm-photo-map-link"
                      onClick={() =>
                        handleOpenMap(
                          record.punch_in_latitude,
                          record.punch_in_longitude,
                          punchInLoc
                        )
                      }
                      title="Open in Maps"
                      aria-label="Open punch in location in maps"
                    >
                      <MapIcon size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: Punch Out Photo */}
              <div className="addm-photo-card">
                <div className="addm-photo-card-head">
                  <div className="addm-photo-tag">
                    <span className="addm-photo-dot out" />
                    <span>Punch Out Photo</span>
                  </div>
                  <span className="addm-photo-time">
                    {punchOutTime}
                    {isNextDay ? " (Next Day)" : ""}
                  </span>
                </div>

                <div
                  className="addm-photo-box"
                  onClick={() => {
                    if (punchOutImageUrl && !punchOutImgError) {
                      setLightboxImg({
                        src: punchOutImageUrl,
                        title: `Punch Out Photo — ${punchOutTime}${isNextDay ? " (Next Day)" : ""}`,
                        location: punchOutLoc,
                      });
                    }
                  }}
                >
                  {punchOutImageUrl && !punchOutImgError ? (
                    <>
                      <img
                        src={punchOutImageUrl}
                        alt="Punch Out Photo"
                        className="addm-photo-img"
                        onError={() => setPunchOutImgError(true)}
                      />
                      <button
                        type="button"
                        className="addm-expand-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImg({
                            src: punchOutImageUrl,
                            title: `Punch Out Photo — ${punchOutTime}${isNextDay ? " (Next Day)" : ""}`,
                            location: punchOutLoc,
                          });
                        }}
                        title="View Fullscreen Photo"
                        aria-label="Expand punch out photo"
                      >
                        <Maximize2 size={13} />
                      </button>
                    </>
                  ) : (
                    <div className="addm-photo-empty">
                      <Camera size={26} strokeWidth={1.5} />
                      <span className="addm-photo-empty-text">No photo available</span>
                    </div>
                  )}
                </div>

                <div className="addm-photo-footer">
                  <div className="addm-photo-loc-left" title={punchOutLoc}>
                    <MapPin size={12} color="#7C3AED" />
                    <span className="addm-photo-loc-text">{punchOutLoc}</span>
                  </div>
                  {punchOutLoc !== "—" && (
                    <button
                      type="button"
                      className="addm-photo-map-link"
                      onClick={() =>
                        handleOpenMap(
                          record.punch_out_latitude,
                          record.punch_out_longitude,
                          punchOutLoc
                        )
                      }
                      title="Open in Maps"
                      aria-label="Open punch out location in maps"
                    >
                      <MapIcon size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Close Button ── */}
          <div className="addm-footer">
            <button
              type="button"
              className="addm-close-btn"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Fullscreen Photo Lightbox ── */}
      {lightboxImg && (
        <div
          className="addm-lightbox-backdrop"
          onClick={() => setLightboxImg(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="addm-lightbox-close"
            onClick={() => setLightboxImg(null)}
            aria-label="Close fullscreen view"
          >
            <X size={20} />
          </button>
          <div className="addm-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImg.src}
              alt={lightboxImg.title}
              className="addm-lightbox-img"
            />
            <div className="addm-lightbox-caption">
              <strong>{lightboxImg.title}</strong>
              {lightboxImg.location && lightboxImg.location !== "—" && (
                <span> • 📍 {lightboxImg.location}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
