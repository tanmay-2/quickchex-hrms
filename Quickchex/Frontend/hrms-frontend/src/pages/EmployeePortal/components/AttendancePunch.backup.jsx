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

const STORAGE_KEY = 'hrms-punch-state-v2';
const REQUIRED_MINUTES = 8 * 60 + 30;
const RECOVERY_WINDOW_MS = 10 * 60 * 1000;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getInitialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.date === todayKey()) return saved;
  } catch {
    // Ignore malformed local storage.
  }
  return {
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

export default function AttendancePunch({ compact = false }) {
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
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  React.useEffect(() => () => stopCamera(), []);

  const checkedIn = Boolean(state.checkInIso);
  const checkedOut = Boolean(state.checkOutIso);
  const originalEarlyOut = Boolean(state.originalCheckOutIso);
  const recoveryActive = originalEarlyOut && !checkedIn && Boolean(state.recoveryCheckInIso === '');
  const recoveryExpired = originalEarlyOut && !checkedIn && Date.now() > new Date(state.originalCheckOutIso).getTime() + RECOVERY_WINDOW_MS;
  const workedMinutes = getWorkedMinutes(state.checkInIso, checkedOut ? state.originalCheckOutIso : new Date().toISOString());
  const wasEarly = Boolean(state.originalCheckOutIso && getWorkedMinutes(state.checkInIso, state.originalCheckOutIso) < REQUIRED_MINUTES);
  const recoveryCompleted = Boolean(state.correctionStatus === 'Corrected');
  const statusLabel = recoveryCompleted
    ? 'Corrected'
    : checkedOut
      ? wasEarly
        ? 'Completed'
        : 'Completed'
      : checkedIn
        ? 'Checked in'
        : 'Not started';

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function openCamera(mode) {
    if (processing || cameraMode) return;
    setError('');
    setFeedback('');
    setCameraError('');
    setLocationError('');
    setCapturedPhoto('');
    setCapturedLocation(null);
    setCameraMode(mode);
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
    stopCamera();
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

      setState((current) => {
        if (cameraMode === 'checkIn') {
          return {
            ...current,
            checkIn: timestamp,
            checkInIso: iso,
            checkInLocation: location,
            checkInSelfie: capturedPhoto,
          };
        }
        if (cameraMode === 'recovery') {
          return {
            ...current,
            recoveryCheckIn: timestamp,
            recoveryCheckInIso: iso,
            recoveryLocation: location,
            recoverySelfie: capturedPhoto,
            checkIn: timestamp,
            checkInIso: iso,
            checkInLocation: location,
            checkInSelfie: capturedPhoto,
            correctionStatus: 'Recovery In Progress',
            checkOut: '',
            checkOutIso: '',
            checkOutLocation: null,
            checkOutSelfie: '',
          };
        }

        const early = getWorkedMinutes(current.checkInIso, iso) < REQUIRED_MINUTES;
        return {
          ...current,
          originalCheckOut: timestamp,
          originalCheckOutIso: iso,
          checkOut: timestamp,
          checkOutIso: iso,
          checkOutLocation: location,
          checkOutSelfie: capturedPhoto,
          correctionStatus: early ? 'Early Checkout' : '',
        };
      });

      setFeedback(
        cameraMode === 'checkIn'
          ? `Punch In confirmed at ${timestamp}.`
          : cameraMode === 'recovery'
            ? `Recovery punch-in recorded at ${timestamp}. You can punch out again when ready.`
            : `Punch Out confirmed at ${timestamp}.`
      );
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
    setLocationError('');
    openCamera(cameraMode);
  }

  function startRecovery() {
    if (recoveryExpired) {
      setError('The 10-minute early punch-out recovery window has expired. Please contact HR for a correction.');
      return;
    }
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
        <span className={`punch-state ${recoveryCompleted || checkedOut ? 'done' : checkedIn ? 'active' : 'idle'}`}>
          <span className="punch-state-dot" />
          {statusLabel}
        </span>
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
        {state.checkIn && <span><MapPin size={13} /> Location <strong>Captured</strong></span>}
      </div>

      <div className="punch-stat-grid">
        <div className="punch-stat-card">
          <span>Worked</span>
          <strong>{formatDuration(workedMinutes)}</strong>
        </div>
        <div className="punch-stat-card">
          <span>Break</span>
          <strong>45m</strong>
        </div>
        <div className="punch-stat-card">
          <span>Target</span>
          <strong>8h 30m</strong>
        </div>
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
                <p>Capture a selfie and your current location before confirming.</p>
              </div>
              <button type="button" className="icon-btn" onClick={closeCamera} aria-label="Close camera"><X size={18} /></button>
            </div>

            <div className="punch-camera-body">
              {cameraPhase === 'error' ? (
                <div className="punch-camera-state error">
                  <div className="punch-camera-state-icon"><Camera size={22} /></div>
                  <strong>Camera access needed</strong>
                  <p>{cameraError}</p>
                  <button type="button" className="primary-btn" onClick={() => openCamera(cameraMode)}>Try camera again</button>
                </div>
              ) : capturedPhoto ? (
                <div className="punch-camera-preview captured">
                  <img src={capturedPhoto} alt="Captured punch selfie preview" />
                  <div className="punch-camera-capture-badge"><ShieldCheck size={14} /> Selfie captured</div>
                </div>
              ) : (
                <div className="punch-camera-preview">
                  <video ref={videoRef} playsInline muted autoPlay aria-label="Camera preview" />
                  <div className="punch-camera-frame" aria-hidden="true" />
                </div>
              )}

              <canvas ref={canvasRef} className="punch-hidden-canvas" />

              <div className="punch-permission-grid">
                <div className={`punch-permission ${capturedPhoto ? 'ok' : ''}`}>
                  <Camera size={15} />
                  <span><strong>Selfie</strong><small>{capturedPhoto ? 'Captured' : cameraPhase === 'preview' ? 'Ready to capture' : 'Required'}</small></span>
                </div>
                <div className={`punch-permission ${capturedLocation ? 'ok' : locationError ? 'bad' : ''}`}>
                  <MapPin size={15} />
                  <span><strong>Location</strong><small>{capturedLocation ? 'Captured' : locationError ? locationError : 'Captured on confirm'}</small></span>
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
