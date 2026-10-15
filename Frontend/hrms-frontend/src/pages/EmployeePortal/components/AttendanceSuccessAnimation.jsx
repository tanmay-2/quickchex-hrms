import React, { useEffect, useState } from 'react';
import {
  Clock3,
  MapPin,
  Camera,
  CheckCircle2,
  ZoomIn,
  X,
  ShieldCheck,
  Building2,
  Home,
  Briefcase,
  User,
} from 'lucide-react';
import Character3DScene from './Character3DScene';
import './AttendanceSuccessAnimation.css';
import { resolveAvatarUrl } from '../../../utils/avatarUtils';

/**
 * AttendanceSuccessAnimation
 * Premium Enterprise HRMS Attendance Success Experience
 * - Top half: Live Animated 3D Character Scene with Three.js particles & glowing badge.
 * - Middle: Status pill, greeting, headline & subtitle.
 * - Prominent Photo Showcase: Large, clearly visible selfie preview (160–220px desktop, 130–180px mobile) with lightbox.
 * - Bottom: Rounded attendance details card & primary purple Done button.
 */
export default function AttendanceSuccessAnimation({ type = 'punch-in', attendance = {}, onDone }) {
  const isPunchIn = type === 'punch-in' || attendance.mode === 'checkIn';
  const [revealed, setRevealed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const timeVal  = attendance.time  || '—';
  const dateVal  = attendance.date  || new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const locVal   = attendance.location   || 'Location Recorded';
  const hoursVal = attendance.workedHours || '0h 0m';
  const photoVal = resolveAvatarUrl(attendance.photo) || null;
  const workModeVal = (attendance.workMode || 'OFFICE').toUpperCase();
  const clientSiteVal = attendance.clientSiteName || '';

  const hour = new Date().getHours();
  const greeting = isPunchIn
    ? (hour < 12 ? 'Good Morning! ☀️' : hour < 17 ? 'Good Afternoon! 🌤️' : 'Good Evening! 🌙')
    : (hour >= 18 || hour < 5 ? 'Good Night! 🌙' : hour >= 12 ? 'Good Evening! 🌙' : 'Good Afternoon! 🌤️');

  useEffect(() => {
    // Reveal content smoothly after 3D character sequence plays (~1.5s)
    const timer = setTimeout(() => setRevealed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard accessibility for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  return (
    <div className={`asa-wrapper ${isPunchIn ? 'asa-in' : 'asa-out'}`}>

      {/* ── 1. LIVE ANIMATED 3D HERO STAGE ── */}
      <div className="asa-hero-stage-container">
        <Character3DScene type={isPunchIn ? 'punch-in' : 'punch-out'} />
      </div>

      {/* ── 2. STATUS & HEADINGS ── */}
      <div className={`asa-messages ${revealed ? 'asa-revealed' : ''}`}>
        <div className="asa-status-badge">
          <CheckCircle2 size={13} strokeWidth={2.6} />
          <span>{isPunchIn ? 'Punched In' : (attendance.isCorrection ? 'Punch Out Corrected' : 'Punched Out')}</span>
        </div>

        <p className="asa-greeting-text">{greeting}</p>

        <h2 className="asa-title">
          {isPunchIn ? 'Punched In Successfully!' : (attendance.isCorrection ? 'Punch Out Updated Successfully' : 'Punched Out Successfully!')}
        </h2>

        <p className="asa-subtitle">
          {isPunchIn ? 'Have a productive day! 🚀' : (attendance.isCorrection ? 'Correction applied. Effective punch-out recorded! 👍' : 'Great work today! 👋')}
        </p>
      </div>

      {/* ── 2.5 PROMINENT CAPTURED PHOTO SHOWCASE (160–220px desktop, 130–180px mobile) ── */}
      {photoVal && (
        <div className={`asa-photo-showcase ${revealed ? 'asa-revealed' : ''}`}>
          <div
            className="asa-photo-container"
            onClick={() => setLightboxOpen(true)}
            role="button"
            tabIndex={0}
            title="Click or tap to view full size photo"
            aria-label="Enlarge captured attendance photo"
          >
            <img
              src={photoVal}
              alt={`${isPunchIn ? 'Punch In' : 'Punch Out'} selfie`}
              className="asa-photo-large"
            />
            <div className="asa-photo-overlay">
              <span className={`asa-photo-badge ${isPunchIn ? 'badge-in' : 'badge-out'}`}>
                {isPunchIn ? 'Punch In Photo' : (attendance.isCorrection ? 'Corrected Photo' : 'Punch Out Photo')}
              </span>
              <div className="asa-photo-zoom-tag">
                <ZoomIn size={12} strokeWidth={2.5} />
                <span>Enlarge</span>
              </div>
            </div>
          </div>
          <span className="asa-photo-hint">Tap photo to inspect high-resolution capture</span>
        </div>
      )}

      {/* ── 3. ATTENDANCE DETAILS CARD ── */}
      <div className={`asa-card ${revealed ? 'asa-revealed' : ''}`}>

        {/* Time + Date */}
        <div className="asa-row">
          <div className="asa-icon-box asa-icon-purple">
            <Clock3 size={16} strokeWidth={2.2} />
          </div>
          <div className="asa-row-body">
            <div className="asa-val-row">
              <strong className="asa-val-primary">{timeVal}</strong>
              <span className={`asa-val-pill ${isPunchIn ? 'pill-in' : 'pill-out'}`}>{isPunchIn ? 'IN' : 'OUT'}</span>
            </div>
            <span className="asa-val-secondary">{dateVal}</span>
          </div>
        </div>

        <div className="asa-divider" />

        {/* Location */}
        <div className="asa-row">
          <div className="asa-icon-box asa-icon-green">
            <MapPin size={16} strokeWidth={2.2} />
          </div>
          <div className="asa-row-body">
            <span className="asa-val-secondary">Recorded Location</span>
            <span className="asa-val-location" title={locVal}>{locVal}</span>
          </div>
        </div>

        <div className="asa-divider" />

        {/* Work Mode */}
        <div className="asa-row">
          <div className="asa-icon-box asa-icon-blue">
            {workModeVal === 'WFH' ? (
              <Home size={16} strokeWidth={2.2} />
            ) : workModeVal === 'CLIENT_SITE' ? (
              <Briefcase size={16} strokeWidth={2.2} />
            ) : (
              <Building2 size={16} strokeWidth={2.2} />
            )}
          </div>
          <div className="asa-row-body">
            <span className="asa-val-secondary">Work Mode</span>
            <strong className="asa-val-mode">
              {workModeVal === 'WFH' ? 'Work From Home' : workModeVal === 'CLIENT_SITE' ? `Client Site${clientSiteVal ? ` — ${clientSiteVal}` : ''}` : 'Office'}
            </strong>
          </div>
        </div>

        {/* Total Hours — punch-out only */}
        {!isPunchIn && (
          <>
            <div className="asa-divider" />
            <div className="asa-row">
              <div className="asa-icon-box asa-icon-amber">
                <Clock3 size={16} strokeWidth={2.2} />
              </div>
              <div className="asa-row-body">
                <span className="asa-val-secondary">Total Working Hours</span>
                <strong className="asa-val-primary">{hoursVal}</strong>
              </div>
            </div>
          </>
        )}

        <div className="asa-divider" />

        {/* Photo Verification Badge */}
        <div className="asa-row">
          <div className="asa-icon-box asa-icon-emerald">
            <ShieldCheck size={16} strokeWidth={2.2} />
          </div>
          <div className="asa-row-body">
            <span className="asa-val-secondary">Verification Status</span>
            <strong className="asa-val-success">✓ Live Selfie Verified</strong>
          </div>
        </div>
      </div>

      {/* ── 4. DONE ACTION BUTTON ── */}
      <div className={`asa-btn-wrap ${revealed ? 'asa-revealed' : ''}`}>
        <button
          type="button"
          className="asa-done-btn"
          onClick={onDone}
          aria-label="Complete attendance punch"
        >
          <span>Done</span>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── 5. LIGHTBOX MODAL FOR FULL-SIZE INSPECTION ── */}
      {lightboxOpen && photoVal && (
        <div
          className="asa-lightbox-backdrop"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Full size attendance photo"
        >
          <div className="asa-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="asa-lightbox-header">
              <div className="asa-lightbox-header-text">
                <span className="asa-lightbox-badge">
                  {isPunchIn ? 'Punch In Selfie' : 'Punch Out Selfie'}
                </span>
                <span className="asa-lightbox-timestamp">{timeVal} &bull; {dateVal}</span>
              </div>
              <button
                type="button"
                className="asa-lightbox-close"
                onClick={() => setLightboxOpen(false)}
                aria-label="Close enlarged preview"
              >
                <X size={20} />
              </button>
            </div>
            <div className="asa-lightbox-img-box">
              <img
                src={photoVal}
                alt="Captured attendance verification"
                className="asa-lightbox-full-img"
              />
            </div>
            <div className="asa-lightbox-footer">
              <div className="asa-lightbox-meta">
                <MapPin size={14} className="asa-meta-icon" />
                <span className="asa-meta-text">{locVal}</span>
              </div>
              <div className="asa-lightbox-meta">
                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                <span className="asa-meta-text">Verified Live Camera Capture</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
