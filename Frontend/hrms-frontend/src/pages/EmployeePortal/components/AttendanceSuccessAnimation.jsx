import React, { useEffect, useState } from 'react';
import { Clock3, MapPin, Camera, CheckCircle2 } from 'lucide-react';
import Character3DScene from './Character3DScene';
import './AttendanceSuccessAnimation.css';

/**
 * AttendanceSuccessAnimation
 * Premium Enterprise HRMS Attendance Success Experience (Phone 4)
 * Matches reference design 100%:
 * - Top half: Live Animated 3D Character Scene with Three.js particles & single glowing emerald badge.
 * - Middle: Status pill, greeting, headline & subtitle.
 * - Bottom: Rounded attendance details card & primary purple Done button.
 */
export default function AttendanceSuccessAnimation({ type = 'punch-in', attendance = {}, onDone }) {
  const isPunchIn = type === 'punch-in' || attendance.mode === 'checkIn';
  const [revealed, setRevealed] = useState(false);

  const timeVal  = attendance.time  || '—';
  const dateVal  = attendance.date  || new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const locVal   = attendance.location   || 'Office';
  const hoursVal = attendance.workedHours || '0h 0m';
  const photoVal = attendance.photo || null;

  const hour = new Date().getHours();
  const greeting = isPunchIn
    ? (hour < 12 ? 'Good Morning! ☀️' : hour < 17 ? 'Good Afternoon! 🌤️' : 'Good Evening! 🌙')
    : (hour >= 18 || hour < 5 ? 'Good Night! 🌙' : hour >= 12 ? 'Good Evening! 🌙' : 'Good Afternoon! 🌤️');

  useEffect(() => {
    // Reveal content smoothly after 3D character sequence plays (~1.5s)
    const timer = setTimeout(() => setRevealed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`asa-wrapper ${isPunchIn ? 'asa-in' : 'asa-out'}`}>

      {/* ── 1. LIVE ANIMATED 3D HERO STAGE (Character + Three.js Particles + Emerald Badge) ── */}
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

      {/* ── 3. ATTENDANCE DETAILS CARD ── */}
      <div className={`asa-card ${revealed ? 'asa-revealed' : ''}`}>

        {/* Time + Date */}
        <div className="asa-row">
          <div className="asa-icon-box asa-icon-purple">
            <Clock3 size={16} strokeWidth={2.2} />
          </div>
          <div className="asa-row-body">
            <strong className="asa-val-primary">{timeVal}</strong>
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
            <span className="asa-val-location">{locVal}</span>
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
                <span className="asa-val-secondary">Total Hours</span>
                <strong className="asa-val-primary">{hoursVal}</strong>
              </div>
            </div>
          </>
        )}

        <div className="asa-divider" />

        {/* Selfie Verification */}
        <div className="asa-row">
          <div className="asa-photo-thumb">
            {photoVal ? (
              <img src={photoVal} alt="Verification selfie" className="asa-photo-img" />
            ) : (
              <Camera size={15} strokeWidth={2} className="asa-photo-icon" />
            )}
          </div>
          <div className="asa-row-body">
            <span className="asa-val-secondary">Selfie Verification</span>
            <strong className="asa-val-success">✓ Photo Captured</strong>
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

    </div>
  );
}
