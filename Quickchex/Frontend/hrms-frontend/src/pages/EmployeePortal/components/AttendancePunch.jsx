import React from 'react';
import {
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  Loader2,
  Camera,
  MapPin,
  RotateCcw,
  ShieldCheck,
  X,
  AlertTriangle,
} from 'lucide-react';

import api from '../api';

function getStorageKey() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const empId = user.employeeId || user.employee_id || user.id || 'default';
    return `hrms-punch-state-v12-${empId}`;
  } catch {
    return 'hrms-punch-state-v12-default';
  }
}

function clearAllPunchStorage() {
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('hrms-punch-state')) {
        localStorage.removeItem(k);
      }
    });
  } catch (e) {}
}

const REQUIRED_MINUTES = 9 * 60;
const RECOVERY_WINDOW_MS = 10 * 60 * 1000;

function todayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTimeStringToMinutes(timeStr) {
  if (!timeStr || timeStr === '—' || timeStr === '-') return null;
  const match = String(timeStr).trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3];
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function getInitialState() {
  const currentToday = todayKey();
  try {
    const saved = JSON.parse(localStorage.getItem(getStorageKey()) || 'null');
    if (saved && saved.date === currentToday) {
      return saved;
    }
    if (saved && saved.date !== currentToday) {
      // Stored state is from a previous calendar day: purge it immediately so it never leaks
      clearAllPunchStorage();
    }
  } catch {
    // Ignore malformed local storage.
  }

  return {
    date: currentToday,
    checkIn: '',
    checkOut: '',
    checkInIso: '',
    checkOutIso: '',
    originalCheckOut: '',
    originalCheckOutIso: '',
    recoveryCheckIn: '',
    recoveryCheckInIso: '',
    correctionStatus: '',
    checkInLocation: null,
    checkOutLocation: null,
    recoveryLocation: null,
    checkInSelfie: '',
    checkOutSelfie: '',
    recoverySelfie: '',
    status: 'not-started',
  };
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function getWorkedMinutes(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
}

function formatDuration(minutes) {
  const safe = Math.max(0, minutes || 0);
  return `${Math.floor(safe / 60)}h ${safe % 60}m`;
}

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location services are not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
        accuracy: Math.round(position.coords.accuracy || 0),
        capturedAt: new Date().toISOString(),
      }),
      () => reject(new Error('Location permission is required to record a punch.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

function isTodayRecord(recDate) {
  if (!recDate) return false;
  const now = new Date();
  const d1 = String(recDate).trim().toLowerCase();

  const day2 = String(now.getDate()).padStart(2, '0');
  const day1 = String(now.getDate());
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthStr = monthNames[now.getMonth()];
  const yearStr = String(now.getFullYear());
  const localToday = todayKey();

  const t1 = `${day2} ${monthStr} ${yearStr}`.toLowerCase();
  const t2 = `${day1} ${monthStr} ${yearStr}`.toLowerCase();

  if (d1 === t1 || d1 === t2 || d1 === localToday) return true;

  try {
    const parsed = new Date(recDate);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}` === localToday;
    }
  } catch (e) {}

  return false;
}

export default function AttendancePunch({ compact = false, onPunchSuccess }) {
  const [state, setState] = React.useState(getInitialState);
  const [processing, setProcessing] = React.useState(null);
  const [feedback, setFeedback] = React.useState('');
  const [error, setError] = React.useState('');
  const [cameraMode, setCameraMode] = React.useState(null);
  const [cameraPhase, setCameraPhase] = React.useState('permission');
  const [capturedPhoto, setCapturedPhoto] = React.useState('');
  const [capturedLocation, setCapturedLocation] = React.useState(null);
  const [cameraError, setCameraError] = React.useState('');
  const [locationError, setLocationError] = React.useState('');
  const [modalNow, setModalNow] = React.useState(() => new Date());

  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const syncAttendanceWithBackend = React.useCallback(() => {
    const currentToday = todayKey();

    return api.getAttendanceRecords()
      .then((records) => {
        if (!Array.isArray(records)) return;

        const todayRec = records.find((r) => isTodayRecord(r.date));

        if (todayRec) {
          const hasIn = Boolean(todayRec.checkIn && todayRec.checkIn !== '—' && todayRec.checkIn !== '-');
          const hasOut = Boolean(todayRec.checkOut && todayRec.checkOut !== '—' && todayRec.checkOut !== '-');

          setState({
            date: currentToday,
            checkIn: hasIn ? todayRec.checkIn : '',
            checkOut: hasOut ? todayRec.checkOut : '',
            checkInIso: hasIn ? (todayRec.punch_in_time || new Date().toISOString()) : '',
            checkOutIso: hasOut ? (todayRec.punch_out_time || new Date().toISOString()) : '',
            status: hasOut ? (todayRec.status ? todayRec.status.toLowerCase() : 'completed') : hasIn ? 'punched-in' : 'not-started',
            attendanceStatus: todayRec.status || '',
            originalCheckOut: '',
            originalCheckOutIso: '',
            recoveryCheckIn: '',
            recoveryCheckInIso: '',
            correctionStatus: '',
            checkInLocation: todayRec.punch_in_location || null,
            checkOutLocation: todayRec.punch_out_location || null,
            recoveryLocation: null,
            checkInSelfie: todayRec.punch_in_image || '',
            checkOutSelfie: todayRec.punch_out_image || '',
            recoverySelfie: '',
          });
        } else {
          // No record in backend for today -> database is source of truth! Clear local cache
          clearAllPunchStorage();
          setState({
            date: currentToday,
            checkIn: '',
            checkOut: '',
            checkInIso: '',
            checkOutIso: '',
            originalCheckOut: '',
            originalCheckOutIso: '',
            recoveryCheckIn: '',
            recoveryCheckInIso: '',
            correctionStatus: '',
            checkInLocation: null,
            checkOutLocation: null,
            recoveryLocation: null,
            checkInSelfie: '',
            checkOutSelfie: '',
            recoverySelfie: '',
            status: 'not-started',
          });
        }
      })
      .catch((err) => {
        console.warn('Attendance DB sync warning:', err.message);
      });
  }, []);

  const handleResetToday = async () => {
    try {
      clearAllPunchStorage();
      if (api.resetTodayAttendance) {
        await api.resetTodayAttendance();
      }
    } catch (e) {}
    setState({
      date: todayKey(),
      checkIn: '',
      checkOut: '',
      checkInIso: '',
      checkOutIso: '',
      originalCheckOut: '',
      originalCheckOutIso: '',
      recoveryCheckIn: '',
      recoveryCheckInIso: '',
      correctionStatus: '',
      checkInLocation: null,
      checkOutLocation: null,
      recoveryLocation: null,
      checkInSelfie: '',
      checkOutSelfie: '',
      recoverySelfie: '',
      status: 'not-started',
    });
    setFeedback('Today’s punch reset. Ready to punch in afresh.');
    window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { type: 'reset' } }));
    window.dispatchEvent(new CustomEvent('punch-updated', { detail: { type: 'reset' } }));
    try {
      localStorage.setItem('hrms_last_event', JSON.stringify({
        type: 'attendance-updated',
        action: 'reset',
        timestamp: Date.now()
      }));
    } catch (e) {}
    onPunchSuccess?.();
  };

  React.useEffect(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  }, [state]);

  const [livePunchTime, setLivePunchTime] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => setLivePunchTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    syncAttendanceWithBackend();
    const handleSync = () => syncAttendanceWithBackend();
    const interval = setInterval(handleSync, 4000);
    window.addEventListener('focus', handleSync);
    window.addEventListener('attendance-updated', handleSync);
    window.addEventListener('punch-updated', handleSync);
    window.addEventListener('regularization-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('attendance-updated', handleSync);
      window.removeEventListener('punch-updated', handleSync);
      window.removeEventListener('regularization-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [syncAttendanceWithBackend]);

  // Reset punch state when a new calendar day starts
  React.useEffect(() => {
    const resetForNewDay = () => {
      clearAllPunchStorage();
      setState(getInitialState());
      syncAttendanceWithBackend();
    };

    // Listen for the event fired by the Dashboard day-change detector
    window.addEventListener('new-day-started', resetForNewDay);

    // Also check internally every 5s so date transition is instantaneous
    let lastDay = todayKey();
    const check = setInterval(() => {
      const newDay = todayKey();
      if (newDay !== lastDay) {
        lastDay = newDay;
        resetForNewDay();
      }
    }, 5000);

    return () => {
      window.removeEventListener('new-day-started', resetForNewDay);
      clearInterval(check);
    };
  }, [syncAttendanceWithBackend]);

  React.useEffect(() => () => stopCamera(), []);

  React.useEffect(() => {
    if (cameraPhase === 'preview' && !capturedPhoto && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [cameraPhase, capturedPhoto]);

  React.useEffect(() => {
    if (!cameraMode) return undefined;
    setModalNow(new Date());
    const timer = window.setInterval(() => setModalNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [cameraMode]);

  const checkedIn = Boolean(state.checkIn && state.checkIn !== '—' && state.checkIn !== '-');
  const checkedOut = Boolean(state.checkOut && state.checkOut !== '—' && state.checkOut !== '-');

  let workedMinutes = 0;
  let workedSeconds = 0;
  if (state.checkIn && state.checkOut && state.checkIn !== '—' && state.checkOut !== '—') {
    const inMin = parseTimeStringToMinutes(state.checkIn);
    const outMin = parseTimeStringToMinutes(state.checkOut);
    if (inMin !== null && outMin !== null) {
      workedMinutes = outMin >= inMin ? outMin - inMin : (outMin + 24 * 60) - inMin;
    } else if (state.checkInIso && state.checkOutIso) {
      workedMinutes = getWorkedMinutes(state.checkInIso, state.checkOutIso);
    }
  } else if (checkedIn && !checkedOut) {
    if (state.checkInIso) {
      const diffMs = Math.max(0, livePunchTime.getTime() - new Date(state.checkInIso).getTime());
      workedSeconds = Math.floor(diffMs / 1000);
      workedMinutes = Math.floor(workedSeconds / 60);
    } else {
      const inMin = parseTimeStringToMinutes(state.checkIn);
      const nowMin = livePunchTime.getHours() * 60 + livePunchTime.getMinutes();
      if (inMin !== null) {
        workedMinutes = Math.max(0, nowMin - inMin);
        workedSeconds = workedMinutes * 60 + livePunchTime.getSeconds();
      }
    }
  } else if (state.checkInIso && state.originalCheckOutIso) {
    workedMinutes = getWorkedMinutes(state.checkInIso, state.originalCheckOutIso);
  }

  const wasEarly = Boolean(checkedOut && workedMinutes < REQUIRED_MINUTES && state.correctionStatus === 'Early Checkout');
  const originalEarlyOut = Boolean(wasEarly && state.originalCheckOutIso);
  const recoveryActive = originalEarlyOut && !checkedIn && Boolean(state.recoveryCheckInIso === '');
  const recoveryExpired = originalEarlyOut && !checkedIn && Date.now() > new Date(state.originalCheckOutIso).getTime() + RECOVERY_WINDOW_MS;
  const recoveryCompleted = Boolean(state.correctionStatus === 'Corrected');
  const statusLabel = recoveryCompleted
    ? 'Corrected'
    : checkedOut
      ? (state.attendanceStatus || (workedMinutes >= 540 ? 'Present' : (workedMinutes >= 300 ? 'Half Day' : 'Absent')))
      : checkedIn
        ? 'In Progress'
        : 'Not started';

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCameraStream() {
    stopCamera();
    setCameraError('');
    setCameraPhase('permission');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 540 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraPhase('preview');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 0);
    } catch (cameraErr) {
      setCameraError(cameraErr?.name === 'NotAllowedError'
        ? 'Camera permission was denied. Please allow camera access and try again.'
        : cameraErr?.message || 'Unable to access the camera.');
      setCameraPhase('error');
    }
  }

  async function openCamera(mode) {
    if (processing) return;
    setError('');
    setFeedback('');
    setCameraError('');
    setLocationError('');
    setCapturedPhoto('');
    setCapturedLocation(null);
    setCameraMode(mode);

    getLocation()
      .then((location) => setCapturedLocation(location))
      .catch((err) => setLocationError(err?.message || 'Unable to capture location.'));

    await startCameraStream();
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      setCameraError('Camera preview is not ready yet. Please try again.');
      return;
    }
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 540;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.82));
    setCameraPhase('captured');
  }

  async function confirmPunch() {
    if (!cameraMode || !capturedPhoto) return;
    setProcessing(cameraMode);
    setCameraError('');
    setLocationError('');
    try {
      const location = capturedLocation || await getLocation();
      const now = new Date();
      const timestamp = formatTime(now);
      const iso = now.toISOString();

      let currentUser = {};
      try {
        currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      } catch (e) {}

      const payload = {
        type: cameraMode === 'checkIn' ? 'check_in' : cameraMode === 'checkOut' ? 'check_out' : 'recovery-in',
        punchType: cameraMode === 'checkIn' ? 'in' : cameraMode === 'checkOut' ? 'out' : 'recovery-in',
        timestamp: iso,
        displayTime: timestamp,
        location,
        // Top-level GPS fields required by backend to persist into coordinate columns
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        accuracy: location?.accuracy ?? null,
        selfie: capturedPhoto,
        employee_id: currentUser.employeeId || currentUser.employee_id || '',
        employeeId: currentUser.employeeId || currentUser.employee_id || '',
        email: currentUser.email || '',
      };

      const res = await api.punchAttendance(payload);
      const resolvedLoc = res?.location || (location ? `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}` : null);

      setState((current) => {
        if (cameraMode === 'checkIn') {
          return {
            ...current,
            checkIn: timestamp,
            checkInIso: iso,
            checkInLocation: resolvedLoc,
            checkInSelfie: capturedPhoto,
            status: 'punched-in',
          };
        }
        if (cameraMode === 'recovery') {
          return {
            ...current,
            recoveryCheckIn: timestamp,
            recoveryCheckInIso: iso,
            recoveryLocation: resolvedLoc,
            recoverySelfie: capturedPhoto,
            checkIn: timestamp,
            checkInIso: iso,
            checkInLocation: resolvedLoc,
            checkInSelfie: capturedPhoto,
            correctionStatus: 'Recovery In Progress',
            checkOut: '',
            checkOutIso: '',
            checkOutLocation: null,
            checkOutSelfie: '',
            status: 'punched-in',
          };
        }

        const early = getWorkedMinutes(current.checkInIso, iso) < REQUIRED_MINUTES;
        const finalStatus = res?.attendance_status || res?.status || (getWorkedMinutes(current.checkInIso, iso) >= 540 ? 'Present' : (getWorkedMinutes(current.checkInIso, iso) >= 300 ? 'Half Day' : 'Absent'));
        return {
          ...current,
          originalCheckOut: timestamp,
          originalCheckOutIso: iso,
          checkOut: timestamp,
          checkOutIso: iso,
          checkOutLocation: resolvedLoc,
          checkOutSelfie: capturedPhoto,
          correctionStatus: early ? 'Early Checkout' : '',
          attendanceStatus: finalStatus,
          status: finalStatus.toLowerCase(),
        };
      });

      setFeedback(
        cameraMode === 'checkIn'
          ? `Punch In confirmed at ${timestamp}.`
          : cameraMode === 'recovery'
            ? `Recovery punch-in recorded at ${timestamp}. You can punch out again when ready.`
            : `Punch Out confirmed at ${timestamp}.`
      );
      syncAttendanceWithBackend();
      window.dispatchEvent(new CustomEvent('attendance-updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('punch-updated', { detail: payload }));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({
          type: 'attendance-updated',
          payload,
          timestamp: Date.now()
        }));
      } catch (e) {}
      onPunchSuccess?.();
      closeCamera();
    } catch (err) {
      const message = err?.message || 'Unable to capture location for this punch.';
      setLocationError(message);
      setCameraPhase('captured');
    } finally {
      setProcessing(null);
    }
  }

  function closeCamera() {
    stopCamera();
    setCameraMode(null);
    setCameraPhase('permission');
    setCapturedPhoto('');
    setCapturedLocation(null);
    setCameraError('');
    setLocationError('');
  }

  function retake() {
    setCapturedPhoto('');
    setCameraError('');
    const isLive = Boolean(
      streamRef.current &&
      streamRef.current.active &&
      streamRef.current.getVideoTracks().some((t) => t.readyState === 'live')
    );

    if (isLive) {
      setCameraPhase('preview');
      setTimeout(() => {
        if (videoRef.current) {
          if (videoRef.current.srcObject !== streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
          }
          videoRef.current.play().catch(() => {});
        }
      }, 0);
    } else {
      startCameraStream();
    }
  }

  function startRecovery() {
    openCamera('recovery');
  }

  return (
    <div className={`punch-panel${compact ? ' punch-panel-compact' : ''}`}>
      <div className="punch-heading">
        <div>
          <span className="punch-eyebrow">TODAY'S PUNCH</span>
          <strong>{
            recoveryCompleted
              ? 'Attendance corrected'
              : checkedOut
                ? (wasEarly ? 'Early punch-out recorded' : 'Shift completed')
                : checkedIn
                  ? 'You are checked in'
                  : 'Ready to start your day?'
          }</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(checkedIn || checkedOut) && (
            <button
              type="button"
              className="text-btn"
              onClick={handleResetToday}
              title="Reset today's punch (Start fresh)"
              style={{ fontSize: '11.5px', color: 'var(--muted)', cursor: 'pointer', padding: '2px 6px', fontWeight: 600 }}
            >
              ↻ Reset
            </button>
          )}
          <span className={`punch-state ${recoveryCompleted || checkedOut ? 'done' : checkedIn ? 'active' : 'idle'}`}>
            <span className="punch-state-dot" />
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="punch-actions">
        <button
          type="button"
          className="punch-btn punch-in"
          onClick={() => openCamera('checkIn')}
          disabled={checkedIn || checkedOut || Boolean(processing) || Boolean(cameraMode)}
          aria-label={checkedIn ? `Punched in at ${state.checkIn}` : 'Punch in'}
        >
          {processing === 'checkIn' ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
          <span>{checkedIn ? `In ${state.checkIn}` : 'Punch In'}</span>
        </button>
        <button
          type="button"
          className="punch-btn punch-out"
          onClick={() => openCamera('checkOut')}
          disabled={!checkedIn || checkedOut || Boolean(processing) || Boolean(cameraMode)}
          aria-label={checkedOut ? `Punched out at ${state.checkOut}` : 'Punch out'}
        >
          {processing === 'checkOut' ? <Loader2 size={16} className="spin" /> : <LogOut size={16} />}
          <span>{checkedOut ? `Out ${state.checkOut}` : 'Punch Out'}</span>
        </button>
      </div>

      <div className="punch-times">
        <span><Clock3 size={13} /> Check-in <strong>{state.checkIn || '—'}</strong></span>
        <span><Clock3 size={13} /> Check-out <strong>{state.checkOut || '—'}</strong></span>
        {(state.checkInLocation || state.checkOutLocation) ? (
          <span title={typeof (state.checkInLocation || state.checkOutLocation) === 'string' ? (state.checkInLocation || state.checkOutLocation) : 'GPS Location Captured'}>
            <MapPin size={13} /> Location <strong>{typeof (state.checkInLocation || state.checkOutLocation) === 'string' ? ((state.checkInLocation || state.checkOutLocation).split(',')[0] || 'Captured') : 'Captured'}</strong>
          </span>
        ) : state.checkIn ? (
          <span><MapPin size={13} /> Location <strong>Captured</strong></span>
        ) : null}
      </div>



      {(wasEarly || state.correctionStatus === 'Early Checkout' || state.correctionStatus === 'Recovery In Progress') && !recoveryCompleted && (
        <div className={`punch-recovery${recoveryExpired ? ' is-expired' : ''}`}>
          <div className="punch-recovery-copy">
            <div className="punch-recovery-icon"><RotateCcw size={15} /></div>
            <div>
              <strong>Early Punch-Out Recovery</strong>
              <p>
                {recoveryExpired
                  ? 'The 10-minute recovery window has expired.'
                  : 'Accidental early checkout detected. You can punch back in within 10 minutes.'}
              </p>
            </div>
          </div>
          <button type="button" className="punch-recovery-btn" onClick={startRecovery} disabled={recoveryExpired || Boolean(processing) || Boolean(cameraMode)}>
            <RotateCcw size={14} /> Punch Back In
          </button>
        </div>
      )}

      {state.originalCheckOut && wasEarly && (
        <div className="punch-original-note">
          <AlertTriangle size={14} /> Original punch-out kept at <strong>{state.originalCheckOut}</strong>. Latest valid checkout will become the final time after recovery.
        </div>
      )}

      {(state.correctionStatus || feedback || error) && (
        <div className={`punch-feedback-row${error ? ' is-error' : ''}`}>
          {error ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          <span>{error || feedback || `Status: ${state.correctionStatus}`}</span>
        </div>
      )}

      {cameraMode && (
        <div className="punch-camera-backdrop" onMouseDown={closeCamera}>
          <div className="punch-camera-modal" role="dialog" aria-modal="true" aria-labelledby="punch-camera-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="punch-camera-header">
              <div>
                <span className="punch-eyebrow">SECURE PUNCH</span>
                <h3 id="punch-camera-title">{cameraMode === 'recovery' ? 'Recovery Punch-In' : cameraMode === 'checkIn' ? 'Punch In Verification' : 'Punch Out Verification'}</h3>
                <p>Capture a selfie and confirm your current location before saving this punch.</p>
              </div>
              <button type="button" className="icon-btn" onClick={closeCamera} aria-label="Close camera"><X size={18} /></button>
            </div>

            <div className="punch-camera-body">
              {cameraPhase === 'error' ? (
                <div className="punch-camera-state error">
                  <div className="punch-camera-state-icon"><Camera size={22} /></div>
                  <strong>Camera access needed</strong>
                  <p>{cameraError}</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button type="button" className="secondary-btn" onClick={startCameraStream}>Try camera again</button>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => {
                        const canvas = document.createElement('canvas');
                        canvas.width = 320;
                        canvas.height = 240;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#1e1b4b';
                        ctx.fillRect(0, 0, 320, 240);
                        ctx.fillStyle = '#818cf8';
                        ctx.font = 'bold 16px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('Verified Web Punch', 160, 110);
                        ctx.fillStyle = '#94a3b8';
                        ctx.font = '12px sans-serif';
                        ctx.fillText(formatTime(new Date()), 160, 135);
                        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
                        setCameraPhase('captured');
                      }}
                    >
                      <ShieldCheck size={14} /> Punch without Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`punch-camera-preview${capturedPhoto ? ' captured' : ''}`}>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    aria-label="Camera preview"
                    style={{ display: capturedPhoto ? 'none' : 'block' }}
                  />
                  {!capturedPhoto && <div className="punch-camera-frame" aria-hidden="true" />}
                  {capturedPhoto && (
                    <>
                      <img src={capturedPhoto} alt="Captured punch selfie preview" />
                      <div className="punch-camera-capture-badge"><ShieldCheck size={14} /> Selfie captured</div>
                    </>
                  )}
                </div>
              )}

              <canvas ref={canvasRef} className="punch-hidden-canvas" />

              <div className="punch-verification-meta">
                <div className="punch-verification-item is-ready">
                  <Clock3 size={15} />
                  <span>
                    <small>Current time</small>
                    <strong>{formatTime(modalNow)}</strong>
                  </span>
                </div>

                <div className={`punch-verification-item ${capturedLocation ? 'is-ready' : locationError ? 'is-error' : ''}`}>
                  <MapPin size={15} />
                  <span>
                    <small>Location</small>
                    <strong>
                      {capturedLocation
                        ? `${capturedLocation.latitude.toFixed(4)}, ${capturedLocation.longitude.toFixed(4)}`
                        : locationError
                          ? 'Unavailable'
                          : 'Waiting for GPS…'}
                    </strong>
                  </span>
                </div>

                <div className={`punch-verification-item ${capturedPhoto ? 'is-ready' : cameraError ? 'is-error' : ''}`}>
                  <Camera size={15} />
                  <span>
                    <strong>Selfie camera</strong>
                    <small>{capturedPhoto ? 'Captured' : cameraPhase === 'preview' ? 'Ready' : cameraError ? 'Camera error' : 'Waiting for permission'}</small>
                  </span>
                </div>
              </div>

              {(cameraError || locationError) && (
                <div className="punch-camera-alert"><AlertTriangle size={14} /> {cameraError || locationError}</div>
              )}
            </div>

            <div className="punch-camera-actions">
              <button type="button" className="secondary-btn" onClick={closeCamera}>Cancel</button>
              {!capturedPhoto ? (
                <button type="button" className="primary-btn" onClick={capturePhoto} disabled={cameraPhase !== 'preview'}>
                  <Camera size={15} /> Capture
                </button>
              ) : (
                <>
                  <button type="button" className="secondary-btn" onClick={retake} disabled={Boolean(processing)}>
                    <RotateCcw size={15} /> Retake
                  </button>
                  <button type="button" className="primary-btn" onClick={confirmPunch} disabled={Boolean(processing)}>
                    {processing === cameraMode ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />}
                    {processing === cameraMode ? 'Confirming…' : 'Confirm Punch'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
