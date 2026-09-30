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
  Building2,
  Home,
  Briefcase,
  ChevronDown,
} from 'lucide-react';

import api from '../api';
import './AttendancePunch.css';

function getStorageKey() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const empId = user.employeeId || user.employee_id || user.emp_code || user.id || localStorage.getItem('emp_code') || 'default';
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
  } catch (e) { }
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
  } catch (e) { }

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

  // Work Mode state
  const [selectedWorkMode, setSelectedWorkMode] = React.useState('OFFICE');
  const [selectedClientSiteId, setSelectedClientSiteId] = React.useState('');
  const [selectedClientSiteName, setSelectedClientSiteName] = React.useState('');
  const [allowedWorkModes, setAllowedWorkModes] = React.useState(['OFFICE', 'WFH', 'CLIENT_SITE']);
  const [allowedClientSites, setAllowedClientSites] = React.useState([]);
  const [permissionsLoaded, setPermissionsLoaded] = React.useState(false);
  const [activeWorkMode, setActiveWorkMode] = React.useState(null); // what was actually punched with
  const [activeClientSiteName, setActiveClientSiteName] = React.useState(null);

  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const syncAttendanceWithBackend = React.useCallback(() => {
    const currentToday = todayKey();

    const applyTodayRecord = (todayRec) => {
      const hasIn = Boolean(todayRec.checkIn && todayRec.checkIn !== '—' && todayRec.checkIn !== '-');
      const hasOut = Boolean(todayRec.checkOut && todayRec.checkOut !== '—' && todayRec.checkOut !== '-');

      // Restore active work mode from DB record
      if (hasIn && todayRec.work_mode) {
        setActiveWorkMode(todayRec.work_mode);
        setActiveClientSiteName(todayRec.client_site_name || null);
      }

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
    };

    return api.getAttendanceRecords()
      .then(async (records) => {
        let todayRec = Array.isArray(records) ? records.find((r) => isTodayRecord(r.date)) : null;

        if (!todayRec && api.getTodayAttendance) {
          try {
            const direct = await api.getTodayAttendance();
            if (direct && (direct.punched || direct.checkIn)) {
              todayRec = direct;
            }
          } catch {}
        }

        if (todayRec) {
          applyTodayRecord(todayRec);
        } else {
          // No record in backend for today -> database is source of truth! Clear local cache
          clearAllPunchStorage();
          setActiveWorkMode(null);
          setActiveClientSiteName(null);
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
    } catch (e) { }
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
    } catch (e) { }
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

  // Load work location permissions once
  React.useEffect(() => {
    api.getMyWorkLocationPermissions()
      .then((data) => {
        const modes = data?.allowed_modes || data?.allowed_work_modes;
        if (Array.isArray(modes) && modes.length > 0) {
          setAllowedWorkModes(modes);
          setSelectedWorkMode((current) => current || modes[0]);
        }
        if (data && Array.isArray(data.assigned_client_sites)) {
          setAllowedClientSites(data.assigned_client_sites);
          if (data.assigned_client_sites.length > 0) {
            setSelectedClientSiteId(String(data.assigned_client_sites[0].id));
            setSelectedClientSiteName(data.assigned_client_sites[0].name);
          }
        }
        setPermissionsLoaded(true);
      })
      .catch(() => setPermissionsLoaded(true));
  }, []);

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
      videoRef.current.play().catch(() => { });
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
          videoRef.current.play().catch(() => { });
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
      } catch (e) { }

      const empCode = currentUser.employeeId || currentUser.employee_id || currentUser.emp_code || currentUser.id || localStorage.getItem('emp_code') || '';

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
        employee_id: empCode,
        employeeId: empCode,
        emp_code: empCode,
        email: currentUser.email || localStorage.getItem('loginEmail') || '',
        // Work mode fields
        work_mode: selectedWorkMode || 'OFFICE',
        client_site_id: selectedWorkMode === 'CLIENT_SITE' ? (selectedClientSiteId ? parseInt(selectedClientSiteId, 10) : null) : null,
        client_site_name: selectedWorkMode === 'CLIENT_SITE' ? (selectedClientSiteName || null) : null,
      };

      const res = await api.punchAttendance(payload);
      const resolvedLoc = res?.location || (location ? `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}` : null);

      setState((current) => {
        if (cameraMode === 'checkIn') {
          // Track the work mode we punched in with
          setActiveWorkMode(selectedWorkMode);
          setActiveClientSiteName(selectedWorkMode === 'CLIENT_SITE' ? selectedClientSiteName : null);
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
        res?.message || (
          cameraMode === 'checkIn'
            ? `Punch In confirmed at ${timestamp}.`
            : cameraMode === 'recovery'
              ? `Recovery punch-in recorded at ${timestamp}. You can punch out again when ready.`
              : `Punch Out confirmed at ${timestamp}.`
        )
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
      } catch (e) { }
      onPunchSuccess?.();
      closeCamera();
    } catch (err) {
      const message = err?.message || 'Unable to capture location for this punch.';
      const isAlreadyPunched = /already punched in|already completed/i.test(message);
      if (isAlreadyPunched) {
        setFeedback(message);
        syncAttendanceWithBackend();
        onPunchSuccess?.();
        closeCamera();
        return;
      }
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
          videoRef.current.play().catch(() => { });
        }
      }, 0);
    } else {
      startCameraStream();
    }
  }

  function startRecovery() {
    openCamera('recovery');
  }

  const workModeLabels = {
    OFFICE: { label: 'Office', Icon: Building2 },
    WFH: { label: 'WFH', Icon: Home },
    CLIENT_SITE: { label: 'Client Site', Icon: Briefcase },
    office: { label: 'Office', Icon: Building2 },
    wfh: { label: 'WFH', Icon: Home },
    client_site: { label: 'Client Site', Icon: Briefcase },
    Office: { label: 'Office', Icon: Building2 },
    'Client site': { label: 'Client Site', Icon: Briefcase },
  };

  return (
    <div className={`punch-panel${compact ? ' punch-panel-compact' : ''}`}>
      {/* 1. Card Header */}
      <div className="punch-heading">
        <div className="punch-heading-text">
          <div className="punch-eyebrow-row">
            <span className="punch-eyebrow">TODAY'S PUNCH</span>
            {checkedIn && !checkedOut && (
              <span className="punch-live-badge">
                <span className="punch-live-dot" /> LIVE
              </span>
            )}
          </div>
          <h3 className="punch-title">{
            recoveryCompleted
              ? 'Attendance corrected'
              : checkedOut
                ? (wasEarly ? 'Early punch-out recorded' : 'Shift completed')
                : checkedIn
                  ? 'You are checked in'
                  : 'Ready to start your day?'
          }</h3>
        </div>
        <div className="punch-heading-actions">
          {(checkedIn || checkedOut) && (
            <button
              type="button"
              className="punch-reset-btn"
              onClick={handleResetToday}
              title="Reset today's punch (Start fresh)"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
          <span className={`punch-state ${recoveryCompleted || checkedOut ? 'done' : checkedIn ? 'active' : 'idle'}`}>
            <span className="punch-state-dot" />
            {statusLabel}
          </span>
        </div>
      </div>

      {/* 2. Work Mode Section — Segmented Control */}
      {!checkedIn && !checkedOut && (
        <div className="work-mode-section">
          <div className="work-mode-header">
            <span className="work-mode-label">WORK MODE</span>
            <span className="work-mode-subtext">Choose your work location today</span>
          </div>
          <div className="work-mode-segmented-control" role="tablist" aria-label="Select Work Mode">
            {(allowedWorkModes && allowedWorkModes.length > 0 ? allowedWorkModes : ['OFFICE', 'WFH', 'CLIENT_SITE']).map((mode) => {
              const upperKey = String(mode).toUpperCase();
              const cfg = workModeLabels[mode] || workModeLabels[upperKey] || { label: mode || 'Office', Icon: Building2 };
              const isSelected = String(selectedWorkMode).toUpperCase() === upperKey;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`work-mode-segment${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setSelectedWorkMode(mode)}
                >
                  <cfg.Icon size={14} className="segment-icon" style={{ color: isSelected ? '#ffffff' : '#6d44f5' }} />
                  <span className="segment-title" style={{ color: isSelected ? '#ffffff' : '#1e293b', fontWeight: isSelected ? '700' : '600' }}>
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>

          {String(selectedWorkMode).toUpperCase() === 'CLIENT_SITE' && allowedClientSites.length > 0 && (
            <div className="client-site-dropdown-wrap">
              <Briefcase size={14} className="client-site-icon" />
              <select
                className="client-site-select"
                value={selectedClientSiteId}
                onChange={(e) => {
                  const site = allowedClientSites.find((s) => String(s.id) === e.target.value);
                  setSelectedClientSiteId(e.target.value);
                  setSelectedClientSiteName(site ? site.name : '');
                }}
              >
                {allowedClientSites.map((site) => (
                  <option key={site.id} value={String(site.id)}>
                    {site.name}{site.client_name ? ` — ${site.client_name}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="client-site-chevron" />
            </div>
          )}
          {String(selectedWorkMode).toUpperCase() === 'CLIENT_SITE' && allowedClientSites.length === 0 && (
            <p className="work-mode-note">No client sites assigned. Contact your admin.</p>
          )}
        </div>
      )}

      {/* Active Work Mode Pill — Shown after punch-in */}
      {checkedIn && (
        <div className="work-mode-active-pill">
          <div className="active-pill-icon">
            {((activeWorkMode || 'OFFICE').toUpperCase() === 'OFFICE') && <Building2 size={13} />}
            {((activeWorkMode || '').toUpperCase() === 'WFH') && <Home size={13} />}
            {((activeWorkMode || '').toUpperCase() === 'CLIENT_SITE') && <Briefcase size={13} />}
          </div>
          <span className="active-pill-label">
            Working from <strong>{workModeLabels[(activeWorkMode || 'OFFICE').toUpperCase()]?.label || activeWorkMode || 'Office'}</strong>
            {activeClientSiteName && <> &mdash; {activeClientSiteName}</>}
          </span>
          <span className="active-pill-verified">Verified</span>
        </div>
      )}

      {/* 3. Action Buttons: Punch In & Punch Out */}
      <div className="punch-actions">
        <button
          type="button"
          className={`punch-btn punch-btn-in ${checkedIn ? 'is-punched-in' : 'is-actionable'}`}
          onClick={() => openCamera('checkIn')}
          disabled={checkedIn || checkedOut || Boolean(processing) || Boolean(cameraMode)}
          aria-label={checkedIn ? `Punched in at ${state.checkIn}` : 'Punch in'}
        >
          {processing === 'checkIn' ? (
            <Loader2 size={16} className="spin" />
          ) : checkedIn ? (
            <CheckCircle2 size={16} />
          ) : (
            <LogIn size={16} />
          )}
          <span className="punch-btn-label">
            {processing === 'checkIn'
              ? 'Punching In…'
              : checkedIn
                ? `In ${state.checkIn}`
                : 'Punch In'}
          </span>
        </button>

        <button
          type="button"
          className={`punch-btn punch-btn-out ${checkedOut ? 'is-punched-out' : checkedIn ? 'is-actionable' : 'is-disabled'}`}
          onClick={() => openCamera('checkOut')}
          disabled={!checkedIn || checkedOut || Boolean(processing) || Boolean(cameraMode)}
          aria-label={checkedOut ? `Punched out at ${state.checkOut}` : 'Punch out'}
        >
          {processing === 'checkOut' ? (
            <Loader2 size={16} className="spin" />
          ) : checkedOut ? (
            <CheckCircle2 size={16} />
          ) : (
            <LogOut size={16} />
          )}
          <span className="punch-btn-label">
            {processing === 'checkOut'
              ? 'Punching Out…'
              : checkedOut
                ? `Out ${state.checkOut}`
                : 'Punch Out'}
          </span>
        </button>
      </div>

      {/* 4. Dedicated Status Row: Check-in, Check-out & Location */}
      <div className="punch-status-row">
        <div className="punch-status-block">
          <div className={`punch-status-icon-wrap ${checkedIn ? 'active' : ''}`}>
            <Clock3 size={15} />
          </div>
          <div className="punch-status-details">
            <span className="punch-status-title">Check-in</span>
            <strong className="punch-status-time">{state.checkIn || '—'}</strong>
          </div>
        </div>

        <div className="punch-status-divider" />

        <div className="punch-status-block">
          <div className={`punch-status-icon-wrap ${checkedOut ? 'active' : ''}`}>
            <Clock3 size={15} />
          </div>
          <div className="punch-status-details">
            <span className="punch-status-title">Check-out</span>
            <strong className="punch-status-time">{state.checkOut || '—'}</strong>
          </div>
        </div>

        {(state.checkInLocation || state.checkOutLocation) && (
          <>
            <div className="punch-status-divider" />
            <div
              className="punch-status-block location-block"
              title={typeof (state.checkInLocation || state.checkOutLocation) === 'string'
                ? (state.checkInLocation || state.checkOutLocation)
                : 'GPS Location Verified'}
            >
              <div className="punch-status-icon-wrap active">
                <MapPin size={15} />
              </div>
              <div className="punch-status-details">
                <span className="punch-status-title">GPS Location</span>
                <strong className="punch-status-time">
                  {typeof (state.checkInLocation || state.checkOutLocation) === 'string'
                    ? ((state.checkInLocation || state.checkOutLocation).split(',')[0] || 'Captured')
                    : 'Verified'}
                </strong>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 5. Early Checkout Recovery Window */}
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

      {/* 6. Feedback & Errors */}
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
              <button type="button" className="secondary-btn" onClick={closeCamera}>
                Cancel
              </button>
              {!capturedPhoto ? (
                <button
                  type="button"
                  className="primary-btn confirm-punch-btn"
                  onClick={capturePhoto}
                  disabled={cameraPhase !== 'preview'}
                  style={{
                    background: 'linear-gradient(135deg, #6d44f5, #8d6bff)',
                    color: '#ffffff',
                    border: '1px solid #6d44f5',
                    boxShadow: '0 4px 14px rgba(109, 68, 245, 0.35)',
                    fontWeight: '700',
                  }}
                >
                  <Camera size={15} style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff', fontWeight: '700' }}>Capture</span>
                </button>
              ) : (
                <>
                  <button type="button" className="secondary-btn" onClick={retake} disabled={Boolean(processing)}>
                    <RotateCcw size={15} /> Retake
                  </button>
                  <button
                    type="button"
                    className="primary-btn confirm-punch-btn"
                    onClick={confirmPunch}
                    disabled={Boolean(processing)}
                    style={{
                      background: 'linear-gradient(135deg, #6d44f5, #8d6bff)',
                      color: '#ffffff',
                      border: '1px solid #6d44f5',
                      boxShadow: '0 4px 14px rgba(109, 68, 245, 0.35)',
                      fontWeight: '700',
                      minWidth: '150px',
                    }}
                  >
                    {processing === cameraMode ? (
                      <>
                        <Loader2 size={15} className="spin" style={{ color: '#ffffff' }} />
                        <span style={{ color: '#ffffff', fontWeight: '700' }}>Confirming…</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={15} style={{ color: '#ffffff' }} />
                        <span style={{ color: '#ffffff', fontWeight: '700' }}>Confirm Punch</span>
                      </>
                    )}
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
