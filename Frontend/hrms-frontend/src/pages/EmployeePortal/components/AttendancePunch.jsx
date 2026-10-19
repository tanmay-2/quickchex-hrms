import React from 'react';
import ReactDOM from 'react-dom';
import {
  Check,
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
  RefreshCw,
  Sparkles,
  ZoomIn,
} from 'lucide-react';

import api from '../api';
import './AttendancePunch.css';
import AttendanceSuccessAnimation from './AttendanceSuccessAnimation';
import { resolveAvatarUrl } from '../../../utils/avatarUtils';


function getStorageKey() {
  try {
    const user =
      JSON.parse(localStorage.getItem('user') || 'null') ||
      JSON.parse(localStorage.getItem('userData') || 'null') ||
      JSON.parse(localStorage.getItem('manager_user') || 'null') ||
      {};
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

function getCachedPunchSelfie(type = 'in', dateStr = null) {
  try {
    const d = dateStr || todayKey();
    let emp = '';
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null') ||
                JSON.parse(localStorage.getItem('userData') || 'null') || {};
      emp = u.emp_code || u.employeeId || u.id || localStorage.getItem('emp_code') || '';
    } catch { }

    return (emp && localStorage.getItem(`punch_selfie_${type}_${emp}_${d}`)) ||
           localStorage.getItem(`punch_selfie_${type}_${d}`) ||
           null;
  } catch {
    return null;
  }
}

function saveCachedPunchSelfie(type = 'in', photoData, dateStr = null) {
  try {
    if (!photoData) return;
    const d = dateStr || todayKey();
    localStorage.setItem(`punch_selfie_${type}_${d}`, photoData);
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null') ||
                JSON.parse(localStorage.getItem('userData') || 'null') || {};
      const emp = u.emp_code || u.employeeId || u.id || localStorage.getItem('emp_code') || '';
      if (emp) {
        localStorage.setItem(`punch_selfie_${type}_${emp}_${d}`, photoData);
      }
    } catch { }
  } catch { }
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
      clearAllPunchStorage();
    }
  } catch { }

  return {
    date: currentToday,
    checkIn: '',
    checkOut: '',
    checkInIso: '',
    checkOutIso: '',
    firstPunchOutTime: '',
    firstPunchOutTimeDisplay: '',
    originalCheckOut: '',
    originalCheckOutIso: '',
    recoveryCheckIn: '',
    recoveryCheckInIso: '',
    correctionStatus: 'NONE',
    correctionEligibleAt: '',
    correctionAvailable: false,
    correctionRemainingSeconds: 0,
    checkInLocation: null,
    checkOutLocation: null,
    recoveryLocation: null,
    checkInSelfie: '',
    checkOutSelfie: '',
    recoverySelfie: '',
    status: 'not-started',
  };
}

function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function formatReferenceDate(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
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
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
        accuracy: Math.round(position.coords.accuracy || 0),
        capturedAt: new Date().toISOString(),
      }),
      (err) => {
        console.warn('Geolocation warning (permission or timeout):', err?.message || err);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
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

export default function AttendancePunch({
  compact = false,
  autoOpen = null,
  onPunchSuccess,
  onClose,
}) {
  const [state, setState] = React.useState(getInitialState);
  const [processing, setProcessing] = React.useState(null);
  const [feedback, setFeedback] = React.useState('');
  const [error, setError] = React.useState('');
  const [correctionCountdown, setCorrectionCountdown] = React.useState(0);
  const [correctionEligibleAtMs, setCorrectionEligibleAtMs] = React.useState(null);

  // Camera & Mobile Flow States
  const [cameraMode, setCameraMode] = React.useState(null); // 'checkIn' | 'checkOut' | 'recovery' | null
  const [cameraPhase, setCameraPhase] = React.useState('permission'); // 'permission' | 'preview' | 'captured' | 'error'
  const [flowStep, setFlowStep] = React.useState('camera'); // 'camera' | 'verifying' | 'success'
  const [verifyChecks, setVerifyChecks] = React.useState({
    photo: 'pending', // 'pending' | 'checking' | 'verified' | 'error'
    location: 'pending',
    time: 'pending',
  });
  const [successDetails, setSuccessDetails] = React.useState(null);
  const [facingMode, setFacingMode] = React.useState('user');

  // Synchronize body class punch-flow-active when camera/flow is active
  React.useEffect(() => {
    if (cameraMode) {
      document.body.classList.add('punch-flow-active');
    } else {
      document.body.classList.remove('punch-flow-active');
    }
    return () => {
      document.body.classList.remove('punch-flow-active');
    };
  }, [cameraMode]);

  const [capturedPhoto, setCapturedPhoto] = React.useState('');
  const [capturedLocation, setCapturedLocation] = React.useState(null);
  const [cameraError, setCameraError] = React.useState('');
  const [locationError, setLocationError] = React.useState('');
  const [modalNow, setModalNow] = React.useState(() => new Date());
  const [cardLightboxPhoto, setCardLightboxPhoto] = React.useState(null);

  React.useEffect(() => {
    if (!cardLightboxPhoto) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setCardLightboxPhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cardLightboxPhoto]);

  // Work Mode state
  const [selectedWorkMode, setSelectedWorkMode] = React.useState('OFFICE');
  const [selectedClientSiteId, setSelectedClientSiteId] = React.useState('');
  const [selectedClientSiteName, setSelectedClientSiteName] = React.useState('');
  const [allowedWorkModes, setAllowedWorkModes] = React.useState(['OFFICE', 'WFH', 'CLIENT_SITE']);
  const [allowedClientSites, setAllowedClientSites] = React.useState([]);
  const [permissionsLoaded, setPermissionsLoaded] = React.useState(false);
  const [activeWorkMode, setActiveWorkMode] = React.useState(null);
  const [activeClientSiteName, setActiveClientSiteName] = React.useState(null);

  // Live GPS tracking
  const [liveGps, setLiveGps] = React.useState({
    status: 'idle',
    label: 'Getting your location...',
    detail: 'Detecting GPS coordinates',
  });

  const detectLiveLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setLiveGps({
        status: 'error',
        label: 'Unable to access location',
        detail: 'Location services not supported',
      });
      return;
    }
    setLiveGps({
      status: 'detecting',
      label: 'Getting your location...',
      detail: 'Detecting GPS coordinates',
    });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const data = await res.json();
            const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.city_district || '';
            const city = data.address?.city || data.address?.town || data.address?.state_district || '';
            const locationStr = [suburb, city].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(', ');
            setLiveGps({
              status: 'detected',
              label: 'Location detected',
              detail: locationStr || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
              lat,
              lon,
            });
            return;
          }
        } catch { }
        setLiveGps({
          status: 'detected',
          label: 'Location detected',
          detail: `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
          lat,
          lon,
        });
      },
      (err) => {
        const msg = err.code === 1 ? 'Location permission denied' : 'Unable to access location';
        setLiveGps({
          status: 'error',
          label: 'Unable to access location',
          detail: msg,
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  React.useEffect(() => {
    detectLiveLocation();
  }, [detectLiveLocation]);

  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  // Authenticated user resolution for dynamic header
  const getUserData = () => {
    try {
      const u =
        JSON.parse(localStorage.getItem('user') || 'null') ||
        JSON.parse(localStorage.getItem('userData') || 'null') ||
        JSON.parse(localStorage.getItem('manager_user') || 'null') ||
        {};
      const name =
        u.name ||
        u.fullName ||
        u.employee_name ||
        localStorage.getItem('user_name') ||
        localStorage.getItem('name') ||
        'Employee';
      const rawPhoto =
        u.profile_image ||
        u.profileImage ||
        u.avatar ||
        u.avatar_url ||
        u.photo ||
        u.profile_picture ||
        localStorage.getItem('profile_image') ||
        localStorage.getItem('photo') ||
        null;
      const initials = (name || 'EM')
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return { name, photo: null, initials };
    } catch {
      return { name: 'Employee', photo: null, initials: 'EM' };
    }
  };

  const currentUserData = getUserData();
  const [mobImgFailed, setMobImgFailed] = React.useState(false);
  React.useEffect(() => {
    setMobImgFailed(false);
  }, [currentUserData.photo]);

  const syncAttendanceWithBackend = React.useCallback(() => {
    const currentToday = todayKey();

    const applyTodayRecord = (todayRec) => {
      const hasIn = Boolean(todayRec.checkIn && todayRec.checkIn !== '—' && todayRec.checkIn !== '-');
      const hasOut = Boolean(todayRec.checkOut && todayRec.checkOut !== '—' && todayRec.checkOut !== '-');

      if (hasIn && todayRec.work_mode) {
        setActiveWorkMode(todayRec.work_mode);
        setActiveClientSiteName(todayRec.client_site_name || null);
      }

      const corrStatus = todayRec.correction_status || (hasOut ? 'CORRECTION_PENDING' : 'NONE');
      const firstOutTime = todayRec.first_punch_out_time || todayRec.punch_out_time || '';
      const firstOutTimeDisplay = todayRec.first_punch_out_time_display || (firstOutTime ? formatTime(firstOutTime) : (todayRec.checkOut || ''));
      const eligibleAt = todayRec.correction_eligible_at || (firstOutTime ? new Date(new Date(firstOutTime).getTime() + 15 * 60 * 1000).toISOString() : '');
      const eligibleMs = eligibleAt ? new Date(eligibleAt).getTime() : null;
      const remSec = typeof todayRec.correction_remaining_seconds === 'number'
        ? todayRec.correction_remaining_seconds
        : (eligibleMs ? Math.max(0, Math.ceil((eligibleMs - Date.now()) / 1000)) : 0);
      const isAvail = Boolean(todayRec.correction_available || (corrStatus === 'CORRECTION_PENDING' && remSec === 0));

      setCorrectionEligibleAtMs(eligibleMs);
      setCorrectionCountdown(remSec);

      let inSelfie = todayRec.punch_in_image || '';
      let outSelfie = todayRec.punch_out_image || '';

      const cachedIn = getCachedPunchSelfie('in', currentToday);
      if (cachedIn && (!inSelfie || !inSelfie.startsWith('data:'))) {
        inSelfie = cachedIn;
      }
      const cachedOut = getCachedPunchSelfie('out', currentToday);
      if (cachedOut && (!outSelfie || !outSelfie.startsWith('data:'))) {
        outSelfie = cachedOut;
      }

      setState({
        date: currentToday,
        checkIn: hasIn ? todayRec.checkIn : '',
        checkOut: hasOut ? todayRec.checkOut : '',
        checkInIso: hasIn ? (todayRec.punch_in_time || new Date().toISOString()) : '',
        checkOutIso: hasOut ? (todayRec.punch_out_time || new Date().toISOString()) : '',
        firstPunchOutTime: firstOutTime,
        firstPunchOutTimeDisplay: firstOutTimeDisplay,
        correctionStatus: corrStatus,
        correctionEligibleAt: eligibleAt,
        correctionAvailable: isAvail,
        correctionRemainingSeconds: remSec,
        status: hasOut ? (todayRec.status ? todayRec.status.toLowerCase() : 'completed') : hasIn ? 'punched-in' : 'not-started',
        attendanceStatus: todayRec.status || '',
        originalCheckOut: firstOutTimeDisplay || '',
        originalCheckOutIso: firstOutTime || '',
        recoveryCheckIn: '',
        recoveryCheckInIso: '',
        checkInLocation: todayRec.punch_in_location || null,
        checkOutLocation: todayRec.punch_out_location || null,
        recoveryLocation: null,
        checkInSelfie: inSelfie,
        checkOutSelfie: outSelfie,
        recoverySelfie: '',
      });
    };

    return Promise.allSettled([
      api.getTodayAttendance ? api.getTodayAttendance() : Promise.resolve(null),
      api.getAttendanceRecords ? api.getAttendanceRecords() : Promise.resolve([])
    ])
      .then(([todayRes, recordsRes]) => {
        const direct = todayRes.status === 'fulfilled' ? todayRes.value : null;
        const records = recordsRes.status === 'fulfilled' && Array.isArray(recordsRes.value) ? recordsRes.value : [];
        let todayRec = Array.isArray(records) ? records.find((r) => isTodayRecord(r.date)) : null;

        if (direct && (direct.punched || direct.checkIn || direct.checkOut)) {
          todayRec = { ...(todayRec || {}), ...direct };
        }

        if (todayRec && (todayRec.checkIn || todayRec.checkOut || todayRec.punched)) {
          applyTodayRecord(todayRec);
        } else {
          clearAllPunchStorage();
          setActiveWorkMode(null);
          setActiveClientSiteName(null);
          setCorrectionCountdown(0);
          setCorrectionEligibleAtMs(null);
          setState({
            date: currentToday,
            checkIn: '',
            checkOut: '',
            checkInIso: '',
            checkOutIso: '',
            firstPunchOutTime: '',
            firstPunchOutTimeDisplay: '',
            correctionStatus: 'NONE',
            correctionEligibleAt: '',
            correctionAvailable: false,
            correctionRemainingSeconds: 0,
            originalCheckOut: '',
            originalCheckOutIso: '',
            recoveryCheckIn: '',
            recoveryCheckInIso: '',
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

  React.useEffect(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  }, [state]);

  // 15-Minute Correction Buffer live countdown (1-second tick without spamming API)
  React.useEffect(() => {
    if (state.correctionStatus !== 'CORRECTION_PENDING' || !correctionEligibleAtMs) {
      return;
    }

    const tick = () => {
      const nowMs = Date.now();
      const remSec = Math.max(0, Math.ceil((correctionEligibleAtMs - nowMs) / 1000));
      setCorrectionCountdown(remSec);
      if (remSec === 0) {
        setState((prev) => ({ ...prev, correctionAvailable: true, correctionRemainingSeconds: 0 }));
        syncAttendanceWithBackend();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state.correctionStatus, correctionEligibleAtMs, syncAttendanceWithBackend]);

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
  const recoveryCompleted = Boolean(state.correctionStatus === 'Corrected' || state.correctionStatus === 'CORRECTED');
  const statusLabel = recoveryCompleted
    ? 'Corrected'
    : checkedOut
      ? (state.attendanceStatus || (workedMinutes >= 540 ? 'Present' : (workedMinutes >= 300 ? 'Half Day' : 'Absent')))
      : checkedIn
        ? 'In Progress'
        : 'Not Present';

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCameraStream(facing = facingMode) {
    stopCamera();
    setCameraError('');
    setCameraPhase('permission');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 540 } },
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

  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    await startCameraStream(nextMode);
  };

  async function openCamera(mode) {
    if (processing) return;
    setError('');
    setFeedback('');
    setCameraError('');
    setLocationError('');
    setCapturedPhoto('');
    setCapturedLocation(null);
    setSuccessDetails(null);
    setFlowStep('camera');
    setVerifyChecks({ photo: 'pending', location: 'pending', time: 'pending' });
    setCameraMode(mode);

    getLocation()
      .then((location) => setCapturedLocation(location))
      .catch((err) => setLocationError(err?.message || 'Unable to capture location.'));

    await startCameraStream(facingMode);
  }

  // Auto-open camera if autoOpen is provided (e.g. from Manager Portal direct punch button)
  React.useEffect(() => {
    if (autoOpen && !cameraMode) {
      openCamera(autoOpen);
    }
  }, [autoOpen]);

  function closeCamera() {
    stopCamera();
    setCameraMode(null);
    setCameraPhase('permission');
    setFlowStep('camera');
    setCapturedPhoto('');
    setCapturedLocation(null);
    setCameraError('');
    setLocationError('');
    setError('');
    setSuccessDetails(null);
    onClose?.();
  }

  // Exact Mobile Flow: Triggered by Shutter Click
  async function handleMobileCapture() {
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
    const photoData = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(photoData);
    stopCamera();

    // ── STEP 2: Transition to Verification Screen ──
    setFlowStep('verifying');
    setVerifyChecks({ photo: 'checking', location: 'pending', time: 'pending' });

    // Step 2.1: Photo Verification
    await new Promise((r) => setTimeout(r, 400));
    if (!photoData || photoData.length < 50) {
      setCameraError('Photo capture was invalid. Please try again.');
      setVerifyChecks({ photo: 'error', location: 'pending', time: 'pending' });
      return;
    }
    setVerifyChecks({ photo: 'verified', location: 'checking', time: 'pending' });

    // Step 2.2: Location Check (Faithful capture, never blocks punch)
    await new Promise((r) => setTimeout(r, 450));
    let loc = capturedLocation;
    if (!loc) {
      loc = await getLocation();
      if (loc) {
        setCapturedLocation(loc);
      }
    }

    // Resolve Location Text
    let locDisplay = '';
    if (loc && loc.latitude && loc.longitude) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`);
        if (res.ok) {
          const data = await res.json();
          const road = data.address?.road || data.address?.pedestrian || '';
          const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.city_district || '';
          const city = data.address?.city || data.address?.town || data.address?.county || '';
          const parts = [road, suburb, city].filter(Boolean);
          if (parts.length > 0) {
            locDisplay = parts.join(', ');
          } else if (data.display_name) {
            locDisplay = data.display_name.split(',').slice(0, 3).join(', ').trim();
          }
        }
      } catch (geoErr) {
        console.warn('Reverse geocode lookup note:', geoErr);
      }
      if (!locDisplay) {
        locDisplay = `GPS (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)})`;
      }
      if (selectedWorkMode === 'CLIENT_SITE' && selectedClientSiteName) {
        locDisplay = `${selectedClientSiteName} (${locDisplay})`;
      } else if (selectedWorkMode === 'WFH') {
        locDisplay = `Remote / Home (${locDisplay})`;
      }
    } else {
      // Clear fallback when location services are unavailable
      if (selectedWorkMode === 'WFH') {
        locDisplay = 'Remote / Work From Home (GPS Unavailable)';
      } else if (selectedWorkMode === 'CLIENT_SITE') {
        locDisplay = selectedClientSiteName ? `Client Site - ${selectedClientSiteName} (GPS Unavailable)` : 'Client Site (GPS Unavailable)';
      } else {
        locDisplay = 'Office (GPS Unavailable)';
      }
    }
    setVerifyChecks({ photo: 'verified', location: 'verified', time: 'checking' });

    // Step 2.3: Time Verification
    await new Promise((r) => setTimeout(r, 400));
    const now = new Date();
    const timestamp = formatTime(now);
    const iso = now.toISOString();
    setVerifyChecks({ photo: 'verified', location: 'verified', time: 'verified' });

    // Step 2.4: Real Backend Punch Call
    setProcessing(cameraMode);
    try {
      let currentUser = {};
      try {
        currentUser =
          JSON.parse(localStorage.getItem('user') || 'null') ||
          JSON.parse(localStorage.getItem('userData') || 'null') ||
          JSON.parse(localStorage.getItem('manager_user') || 'null') ||
          {};
      } catch (e) { }

      const empCode =
        currentUser.employeeId ||
        currentUser.employee_id ||
        currentUser.emp_code ||
        currentUser.id ||
        localStorage.getItem('emp_code') ||
        '';

      const payload = {
        type: cameraMode === 'checkIn' ? 'check_in' : cameraMode === 'checkOut' ? 'check_out' : 'recovery-in',
        punchType: cameraMode === 'checkIn' ? 'in' : cameraMode === 'checkOut' ? 'out' : 'recovery-in',
        timestamp: iso,
        displayTime: timestamp,
        location: loc ? locDisplay : null,
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
        accuracy: loc?.accuracy ?? null,
        selfie: photoData,
        employee_id: empCode,
        employeeId: empCode,
        emp_code: empCode,
        email: currentUser.email || localStorage.getItem('loginEmail') || '',
        work_mode: selectedWorkMode || 'OFFICE',
        client_site_id: selectedWorkMode === 'CLIENT_SITE' ? (selectedClientSiteId ? parseInt(selectedClientSiteId, 10) : null) : null,
        client_site_name: selectedWorkMode === 'CLIENT_SITE' ? (selectedClientSiteName || null) : null,
      };

      const res = await api.punchAttendance(payload);
      const resolvedLoc = res?.location || locDisplay;

      let finalWorkedHours = '0h 0m';
      setState((current) => {
        if (cameraMode === 'checkIn') {
          setActiveWorkMode(selectedWorkMode);
          setActiveClientSiteName(selectedWorkMode === 'CLIENT_SITE' ? selectedClientSiteName : null);
          saveCachedPunchSelfie('in', photoData, todayKey());
          return {
            ...current,
            checkIn: timestamp,
            checkInIso: iso,
            checkInLocation: resolvedLoc,
            checkInSelfie: photoData,
            status: 'punched-in',
          };
        }
        const isCorrectionPunch = Boolean(res?.is_correction || (current.checkOut && current.correctionStatus === 'CORRECTION_PENDING'));
        const nextCorrStatus = isCorrectionPunch ? 'CORRECTED' : (res?.correction_status || 'CORRECTION_PENDING');
        const firstOutIso = current.firstPunchOutTime || current.originalCheckOutIso || current.checkOutIso || iso;
        const firstOutDisplay = current.firstPunchOutTimeDisplay || current.originalCheckOut || current.checkOut || timestamp;
        const eligibleAt = isCorrectionPunch ? '' : (res?.correction_eligible_at || new Date(new Date(firstOutIso).getTime() + 15 * 60 * 1000).toISOString());
        const eligibleMs = eligibleAt ? new Date(eligibleAt).getTime() : null;
        const remSec = isCorrectionPunch ? 0 : (typeof res?.correction_remaining_seconds === 'number' ? res.correction_remaining_seconds : 15 * 60);

        setCorrectionEligibleAtMs(eligibleMs);
        setCorrectionCountdown(remSec);

        const finalStatus =
          res?.attendance_status ||
          res?.status ||
          (getWorkedMinutes(current.checkInIso, iso) >= 540 ? 'Present' : (getWorkedMinutes(current.checkInIso, iso) >= 300 ? 'Half Day' : 'Absent'));
        const totalMins = getWorkedMinutes(current.checkInIso, iso);
        finalWorkedHours = formatDuration(totalMins);

        saveCachedPunchSelfie('out', photoData, todayKey());
        return {
          ...current,
          originalCheckOut: firstOutDisplay,
          originalCheckOutIso: firstOutIso,
          firstPunchOutTime: firstOutIso,
          firstPunchOutTimeDisplay: firstOutDisplay,
          checkOut: timestamp,
          checkOutIso: iso,
          checkOutLocation: resolvedLoc,
          checkOutSelfie: photoData,
          correctionStatus: nextCorrStatus,
          correctionEligibleAt: eligibleAt,
          correctionAvailable: false,
          correctionRemainingSeconds: remSec,
          attendanceStatus: finalStatus,
          status: finalStatus.toLowerCase(),
        };
      });

      const isCorrectionPunch = Boolean(res?.is_correction || (state.checkOut && state.correctionStatus === 'CORRECTION_PENDING'));
      if (cameraMode === 'checkOut') {
        const totalMins = getWorkedMinutes(state.checkInIso, iso);
        finalWorkedHours = res?.hours || formatDuration(totalMins);
      }

      setSuccessDetails({
        mode: cameraMode,
        isCorrection: isCorrectionPunch,
        time: timestamp,
        date: formatReferenceDate(now),
        location: resolvedLoc,
        workedHours: res?.hours || finalWorkedHours,
        photo: photoData,
        workMode: selectedWorkMode || 'OFFICE',
        clientSiteName: selectedClientSiteName || null,
        employeeName: currentUser.name || currentUser.full_name || currentUser.username || 'Authorized User',
        empCode: empCode,
      });

      window.dispatchEvent(new CustomEvent('attendance-updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('punch-updated', { detail: payload }));
      try {
        localStorage.setItem('hrms_last_event', JSON.stringify({
          type: 'attendance-updated',
          payload,
          timestamp: Date.now()
        }));
      } catch (e) { }

      // ── STEP 3: Transition to 3D Success Screen ONLY AFTER BACKEND SUCCESS ──
      setFlowStep('success');
    } catch (err) {
      const message = err?.message || 'Unable to record punch. Please try again.';
      const isAlreadyPunched = /already punched in|already completed/i.test(message);
      if (isAlreadyPunched) {
        setFeedback(message);
        syncAttendanceWithBackend();
        onPunchSuccess?.();
        closeCamera();
        return;
      }
      // If 401 (expired/invalid token), clear storage and redirect to login
      const is401 = err?.status === 401 || /invalid.*token|expired.*token|not authenticated/i.test(message);
      if (is401) {
        // Clear all auth keys so next login generates a fresh token
        ['token', 'authToken', 'accessToken', 'access_token', 'manager_token',
          'user', 'userData', 'manager_user', 'emp_code', 'empCode', 'loginEmail'].forEach(k => {
          try { localStorage.removeItem(k); } catch { }
        });
        setError('Your session has expired. Please log in again.');
        setTimeout(() => { window.location.href = '/'; }, 1500);
        return;
      }
      setError(message);
      setVerifyChecks((prev) => ({ ...prev, time: 'error' }));
    } finally {
      setProcessing(null);
    }
  }

  const handleDone = () => {
    closeCamera();
    syncAttendanceWithBackend();
    onPunchSuccess?.();
    onClose?.();
  };

  const workModeLabels = {
    OFFICE: { label: 'Office', Icon: Building2 },
    WFH: { label: 'WFH', Icon: Home },
    CLIENT_SITE: { label: 'Client Site', Icon: Briefcase },
  };

  return (
    <div className={`punch-panel${compact ? ' punch-panel-compact' : ''}`}>
      {/* ═══════════════════════════════════════════════════════════════
          MOBILE ATTENDANCE CARD (Matches Reference Phone 1 & Phone 5)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="mob-punch-card">
        {/* Mobile Header: Welcome, {Name} + Avatar */}
        <div className="mob-punch-header">
          <div className="mob-punch-user-info">
            <span className="mob-punch-greeting">Welcome,</span>
            <h2 className="mob-punch-user-name">{currentUserData.name}</h2>
          </div>
          <div className="mob-punch-avatar">
            <span>{currentUserData.initials}</span>
          </div>
        </div>

        {/* Section: Today's Attendance + Status Pill */}
        <div className="mob-punch-section-header">
          <span className="mob-punch-section-title">Today's Attendance</span>
          {checkedOut ? (
            <span className="mob-punch-status-badge badge-completed">
              <span className="mob-punch-status-dot green-dot" /> Completed
            </span>
          ) : checkedIn ? (
            <span className="mob-punch-status-badge badge-punched-in">
              <span className="mob-punch-status-dot pulsing-green-dot" /> Punched In
            </span>
          ) : (
            <span className="mob-punch-status-badge badge-not-punched-in">
              <span className="mob-punch-status-dot green-dot" /> Not Punched In
            </span>
          )}
        </div>

        {/* Work Mode Selector (Pills) — Before Punch In */}
        {!checkedIn && !checkedOut && (
          <div className="mob-work-mode-pills" role="tablist" aria-label="Select Work Mode">
            {(allowedWorkModes && allowedWorkModes.length > 0 ? allowedWorkModes : ['OFFICE', 'WFH', 'CLIENT_SITE']).map((mode) => {
              const upperKey = String(mode).toUpperCase();
              const cfg = workModeLabels[upperKey] || { label: mode, Icon: Building2 };
              const isSelected = String(selectedWorkMode).toUpperCase() === upperKey;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`mob-work-mode-pill${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setSelectedWorkMode(mode)}
                >
                  <cfg.Icon size={12} />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Work Mode Active Label — Once Punched In */}
        {checkedIn && (
          <div className="mob-work-mode-active">
            <Building2 size={12} className="mob-work-mode-active-icon" />
            <span>
              Work mode: <strong>{workModeLabels[String(activeWorkMode || selectedWorkMode).toUpperCase()]?.label || activeWorkMode || 'Office'}</strong>
              {activeClientSiteName && <> &mdash; {activeClientSiteName}</>}
            </span>
          </div>
        )}

        {/* Dynamic Metric Cards */}
        {checkedOut ? (
          /* Phone 5 (Row 2): Completed Attendance */
          <div className="mob-punch-stats-wrap">
            <div className="mob-punch-stats-grid">
              <div className="mob-punch-stat-box">
                <span className="mob-stat-label">Check In</span>
                <strong className="mob-stat-val">{state.checkIn || '09:02 AM'}</strong>
              </div>
              <div className="mob-punch-stat-box">
                <span className="mob-stat-label">Check Out</span>
                <strong className="mob-stat-val">{state.checkOut || '06:15 PM'}</strong>
              </div>
            </div>
            <div className="mob-punch-stat-box mob-punch-stat-box-full">
              <span className="mob-stat-label">Total Hours</span>
              <strong className="mob-stat-val">{formatDuration(workedMinutes)}</strong>
            </div>
          </div>
        ) : checkedIn ? (
          /* Phone 5 (Row 1): Punched In */
          <div className="mob-punch-stats-grid">
            <div className="mob-punch-stat-box">
              <span className="mob-stat-label">Check In</span>
              <strong className="mob-stat-val">{state.checkIn}</strong>
            </div>
            <div className="mob-punch-stat-box">
              <span className="mob-stat-label">Working Hours</span>
              <strong className="mob-stat-val">{formatDuration(workedMinutes)}</strong>
            </div>
          </div>
        ) : (
          /* Phone 1: Not Punched In */
          <div className="mob-punch-stats-grid">
            <div className="mob-punch-stat-box">
              <div className="mob-stat-label-row">
                <span className="mob-stat-label">Working Hours</span>
                <span className="mob-stat-red-dot" />
              </div>
              <strong className="mob-stat-val">0h 0m</strong>
            </div>
            <div className="mob-punch-stat-box">
              <div className="mob-stat-label-row">
                <span className="mob-stat-label">Status</span>
                <span className="mob-stat-red-dot" />
              </div>
              <strong className="mob-stat-val text-not-present">Not Present</strong>
            </div>
          </div>
        )}

        {/* Mobile Captured Photo Showcase (Visible when Punched In or Completed) */}
        {(checkedIn || checkedOut) && (state.checkInSelfie || state.checkOutSelfie) && (
          <div className="mob-punch-photos-wrap">
            {state.checkInSelfie && (
              <div
                className="mob-punch-photo-box"
                onClick={() => setCardLightboxPhoto({
                  url: resolveAvatarUrl(state.checkInSelfie) || getCachedPunchSelfie('in', state.date),
                  title: 'Punch In Photo',
                  time: state.checkIn ? `Punched in at ${state.checkIn}` : 'Punch In',
                })}
                role="button"
                tabIndex={0}
                title="Tap to enlarge punch-in photo"
              >
                <div className="desk-photo-fallback" style={{ fontSize: '10px' }}>
                  <Camera size={20} strokeWidth={1.5} />
                </div>
                <img
                  src={resolveAvatarUrl(state.checkInSelfie) || getCachedPunchSelfie('in', state.date)}
                  alt="Punch In Selfie"
                  className="mob-punch-photo-img"
                  onError={(e) => {
                    const cached = getCachedPunchSelfie('in', state.date);
                    if (cached && e.currentTarget.src !== cached) {
                      e.currentTarget.src = cached;
                      return;
                    }
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="mob-punch-photo-overlay">
                  <span className="mob-punch-photo-tag tag-in">In: {state.checkIn}</span>
                  <span className="mob-punch-photo-zoom"><ZoomIn size={11} /></span>
                </div>
              </div>
            )}
            {state.checkOutSelfie && (
              <div
                className="mob-punch-photo-box"
                onClick={() => setCardLightboxPhoto({
                  url: resolveAvatarUrl(state.checkOutSelfie) || getCachedPunchSelfie('out', state.date),
                  title: 'Punch Out Photo',
                  time: state.checkOut ? `Punched out at ${state.checkOut}` : 'Punch Out',
                })}
                role="button"
                tabIndex={0}
                title="Tap to enlarge punch-out photo"
              >
                <div className="desk-photo-fallback" style={{ fontSize: '10px' }}>
                  <Camera size={20} strokeWidth={1.5} />
                </div>
                <img
                  src={resolveAvatarUrl(state.checkOutSelfie) || getCachedPunchSelfie('out', state.date)}
                  alt="Punch Out Selfie"
                  className="mob-punch-photo-img"
                  onError={(e) => {
                    const cached = getCachedPunchSelfie('out', state.date);
                    if (cached && e.currentTarget.src !== cached) {
                      e.currentTarget.src = cached;
                      return;
                    }
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="mob-punch-photo-overlay">
                  <span className="mob-punch-photo-tag tag-out">Out: {state.checkOut}</span>
                  <span className="mob-punch-photo-zoom"><ZoomIn size={11} /></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mob-punch-actions">
          {!checkedIn && !checkedOut && (
            <>
              <button
                type="button"
                className="mob-punch-btn-primary"
                onClick={() => openCamera('checkIn')}
                disabled={Boolean(processing) || Boolean(cameraMode)}
              >
                <Camera size={18} />
                <span>Punch In</span>
              </button>
              <button
                type="button"
                className="mob-punch-btn-disabled"
                disabled
              >
                <Camera size={18} />
                <span>Punch Out</span>
              </button>
            </>
          )}

          {checkedIn && !checkedOut && (
            <button
              type="button"
              className="mob-punch-btn-primary mob-punch-btn-out"
              onClick={() => openCamera('checkOut')}
              disabled={Boolean(processing) || Boolean(cameraMode)}
            >
              <Camera size={18} />
              <span>Punch Out</span>
            </button>
          )}

          {checkedOut && (
            <div className="mob-punch-completed-wrap">
              {state.correctionStatus === 'CORRECTION_PENDING' && (
                correctionCountdown > 0 ? (
                  <div className="mob-correction-card is-pending">
                    <div className="mob-punch-completed-bar">
                      <CheckCircle2 size={16} className="mob-completed-check" />
                      <span>Punch Out Completed</span>
                    </div>
                    <div className="mob-correction-timer-pill">
                      <Clock3 size={14} className="mob-correction-clock-icon" />
                      <span>Correction available in <strong className="mob-countdown-digits">{formatCountdown(correctionCountdown)}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="mob-correction-ready-card">
                    <div className="mob-correction-ready-head">
                      <Sparkles size={14} className="mob-correction-sparkle-icon" />
                      <span className="mob-correction-ready-badge">Correction Available</span>
                    </div>
                    <p className="mob-correction-ready-text">
                      You can punch out again to correct an accidental early punch-out.
                    </p>
                    <button
                      type="button"
                      className="mob-punch-btn-primary mob-punch-btn-correction"
                      onClick={() => openCamera('checkOut')}
                      disabled={Boolean(processing) || Boolean(cameraMode)}
                    >
                      <RotateCcw size={16} />
                      <span>Punch Out Again</span>
                    </button>
                  </div>
                )
              )}

              {state.correctionStatus === 'CORRECTED' && (
                <div className="mob-punch-completed-bar mob-punch-corrected-bar">
                  <CheckCircle2 size={16} className="mob-completed-check" />
                  <span>Punch Out Updated Successfully</span>
                </div>
              )}

              {(!state.correctionStatus || state.correctionStatus === 'NONE') && (
                <div className="mob-punch-completed-bar">
                  <CheckCircle2 size={16} className="mob-completed-check" />
                  <span>Shift Attendance Completed</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP CARD CONTAINER (Maintains Desktop Layout on >768px)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="desk-punch-card">
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
                ? 'Attendance updated'
                : state.correctionStatus === 'CORRECTION_PENDING' && correctionCountdown <= 0
                  ? 'Correction available'
                  : state.correctionStatus === 'CORRECTION_PENDING'
                    ? 'Shift completed'
                    : checkedOut
                      ? (wasEarly ? 'Early punch-out recorded' : 'Shift completed')
                      : checkedIn
                        ? 'You are checked in'
                        : 'Ready to start your day?'
            }</h3>
          </div>
          <div className="punch-heading-actions">
            <span className={`punch-state ${recoveryCompleted || checkedOut ? 'done' : checkedIn ? 'active' : 'idle'}`}>
              <span className="punch-state-dot" />
              {statusLabel}
            </span>
          </div>
        </div>

        {/* 2. Desktop Work Mode Selection */}
        {!checkedIn && !checkedOut && (
          <div className="work-mode-section">
            <div className="work-mode-header">
              <span className="work-mode-label">WORK MODE</span>
              <span className="work-mode-subtext">Choose your work location today</span>
            </div>
            <div className="work-mode-segmented-control" role="tablist" aria-label="Select Work Mode">
              {(allowedWorkModes && allowedWorkModes.length > 0 ? allowedWorkModes : ['OFFICE', 'WFH', 'CLIENT_SITE']).map((mode) => {
                const upperKey = String(mode).toUpperCase();
                const cfg = workModeLabels[upperKey] || { label: mode || 'Office', Icon: Building2 };
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
          </div>
        )}

        {/* Active Work Mode Pill */}
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

        {/* 3. Action Buttons */}
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

        {/* 3.1 Correction Buffer / Repunch Banner */}
        {checkedOut && (
          <div className="punch-correction-container">
            {state.correctionStatus === 'CORRECTION_PENDING' && (
              correctionCountdown > 0 ? (
                <div className="punch-correction-box is-pending">
                  <div className="punch-correction-icon-wrap pending-wrap">
                    <Clock3 size={16} />
                  </div>
                  <div className="punch-correction-content">
                    <div className="punch-correction-title-row">
                      <strong className="punch-correction-title">Punch Out Completed</strong>
                      <span className="punch-correction-badge badge-pending">Buffer Active</span>
                    </div>
                    <p className="punch-correction-desc">
                      Accidentally punched out early? Correction available in <strong className="punch-correction-timer">{formatCountdown(correctionCountdown)}</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="punch-correction-box is-available">
                  <div className="punch-correction-icon-wrap available-wrap">
                    <Sparkles size={16} />
                  </div>
                  <div className="punch-correction-content">
                    <div className="punch-correction-title-row">
                      <strong className="punch-correction-title">Correction Available</strong>
                      <span className="punch-correction-badge badge-active">Eligible Now</span>
                    </div>
                    <p className="punch-correction-desc">
                      You can punch out again to correct an accidental early punch-out. The latest punch-out will become effective.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="punch-correction-action-btn"
                    onClick={() => openCamera('checkOut')}
                    disabled={Boolean(processing) || Boolean(cameraMode)}
                  >
                    <RotateCcw size={15} />
                    <span>Punch Out Again</span>
                  </button>
                </div>
              )
            )}

            {recoveryCompleted && (
              <div className="punch-correction-box is-corrected">
                <div className="punch-correction-icon-wrap corrected-wrap">
                  <CheckCircle2 size={16} />
                </div>
                <div className="punch-correction-content">
                  <div className="punch-correction-title-row">
                    <strong className="punch-correction-title">Punch Out Updated Successfully</strong>
                    <span className="punch-correction-badge badge-success">Corrected</span>
                  </div>
                  <p className="punch-correction-desc">
                    Effective punch-out: <strong>{state.checkOut}</strong> &bull; Total working hours recalculated automatically.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop Captured Photo Showcase (Visible when Punched In or Completed) */}
        {(checkedIn || checkedOut) && (state.checkInSelfie || state.checkOutSelfie) && (
          <div className="desk-punch-photos-wrap">
            <div className="desk-punch-photos-head">
              <span className="desk-punch-photos-title">CAPTURED ATTENDANCE PHOTOS</span>
              <span className="desk-punch-photos-hint">Click photo to inspect full size</span>
            </div>
            <div className="desk-punch-photos-grid">
              {state.checkInSelfie && (
                <div
                  className="desk-punch-photo-card"
                  onClick={() => setCardLightboxPhoto({
                    url: resolveAvatarUrl(state.checkInSelfie) || getCachedPunchSelfie('in', state.date),
                    title: 'Punch In Photo',
                    time: state.checkIn ? `Punched in at ${state.checkIn}` : 'Punch In',
                  })}
                  role="button"
                  tabIndex={0}
                  title="Click to enlarge punch-in photo"
                >
                  <div className="desk-photo-fallback">
                    <Camera size={26} strokeWidth={1.5} />
                    <span>Punch In Selfie</span>
                  </div>
                  <img
                    src={resolveAvatarUrl(state.checkInSelfie) || getCachedPunchSelfie('in', state.date)}
                    alt="Punch In Selfie"
                    className="desk-punch-photo-img"
                    onError={(e) => {
                      const cached = getCachedPunchSelfie('in', state.date);
                      if (cached && e.currentTarget.src !== cached) {
                        e.currentTarget.src = cached;
                        return;
                      }
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="desk-punch-photo-overlay">
                    <span className="desk-photo-tag tag-in">Punch In: {state.checkIn}</span>
                    <span className="desk-photo-zoom"><ZoomIn size={12} /> Enlarge</span>
                  </div>
                </div>
              )}
              {state.checkOutSelfie && (
                <div
                  className="desk-punch-photo-card"
                  onClick={() => setCardLightboxPhoto({
                    url: resolveAvatarUrl(state.checkOutSelfie) || getCachedPunchSelfie('out', state.date),
                    title: 'Punch Out Photo',
                    time: state.checkOut ? `Punched out at ${state.checkOut}` : 'Punch Out',
                  })}
                  role="button"
                  tabIndex={0}
                  title="Click to enlarge punch-out photo"
                >
                  <div className="desk-photo-fallback">
                    <Camera size={26} strokeWidth={1.5} />
                    <span>Punch Out Selfie</span>
                  </div>
                  <img
                    src={resolveAvatarUrl(state.checkOutSelfie) || getCachedPunchSelfie('out', state.date)}
                    alt="Punch Out Selfie"
                    className="desk-punch-photo-img"
                    onError={(e) => {
                      const cached = getCachedPunchSelfie('out', state.date);
                      if (cached && e.currentTarget.src !== cached) {
                        e.currentTarget.src = cached;
                        return;
                      }
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="desk-punch-photo-overlay">
                    <span className="desk-photo-tag tag-out">Punch Out: {state.checkOut}</span>
                    <span className="desk-photo-zoom"><ZoomIn size={12} /> Enlarge</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Status Row */}
        <div className="punch-status-row">
          <div className="punch-status-block">
            <div className={`punch-status-icon-wrap ${checkedIn ? 'active' : ''}`}>
              <Clock3 size={15} />
            </div>
            <div className="punch-status-details">
              <span className="punch-status-title">Check-in</span>
              <strong className="punch-status-time">{state.checkIn || '—'}</strong>
              <span className="punch-status-subtext">
                {checkedIn ? 'Recorded today' : 'Not recorded'}
              </span>
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
              <span className="punch-status-subtext">
                {checkedOut ? 'Shift ended' : (checkedIn ? 'In progress' : 'Not recorded')}
              </span>
            </div>
          </div>

          <div className="punch-status-divider" />

          <div className="punch-status-block location-block">
            <div className={`punch-status-icon-wrap ${liveGps.status === 'detected' || state.checkInLocation || state.checkOutLocation ? 'active' : ''}`}>
              <MapPin size={15} />
            </div>
            <div className="punch-status-details punch-status-details-gps">
              <span className="punch-status-title">GPS Location</span>
              <strong className="punch-status-time punch-gps-heading">
                {state.checkInLocation || state.checkOutLocation
                  ? 'Location detected'
                  : (String(selectedWorkMode).toUpperCase() === 'WFH'
                    ? 'Work from Home'
                    : String(selectedWorkMode).toUpperCase() === 'CLIENT_SITE'
                      ? (selectedClientSiteName || 'Client Site')
                      : liveGps.label)}
              </strong>
              <span className="punch-status-subtext punch-gps-subtext">
                {state.checkInLocation || state.checkOutLocation
                  ? (typeof (state.checkInLocation || state.checkOutLocation) === 'string'
                    ? (state.checkInLocation || state.checkOutLocation)
                    : 'GPS location verified')
                  : (String(selectedWorkMode).toUpperCase() === 'WFH'
                    ? 'Remote / Home location'
                    : String(selectedWorkMode).toUpperCase() === 'CLIENT_SITE'
                      ? (selectedClientSiteName ? `Assigned: ${selectedClientSiteName}` : 'Client office')
                      : liveGps.detail)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="punch-hidden-canvas" />

      {/* ═══════════════════════════════════════════════════════════════
          EXACT MOBILE PUNCH FLOW MODAL (Phones 2, 3, 4)
          Rendered via Portal to document.body to ensure true 100vw x 100dvh fullscreen!
          ═══════════════════════════════════════════════════════════════ */}
      {cameraMode && ReactDOM.createPortal(
        <div className={`mob-flow-backdrop mob-flow-${flowStep}`} role="dialog" aria-modal="true">
          <div className={`mob-flow-container flow-${flowStep}`}>

            {/* ── STEP 1: CAMERA SCREEN (Phone 2) ── */}
            {flowStep === 'camera' && (
              <div className="mob-camera-screen">
                <div className="mob-camera-topbar">
                  <span className="mob-camera-instruction">Position your face in the frame</span>
                  <button
                    type="button"
                    className="mob-camera-close-btn"
                    onClick={closeCamera}
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                {cameraPhase === 'error' ? (
                  <div className="mob-camera-error-view">
                    <AlertTriangle size={36} className="mob-camera-error-icon" />
                    <h3>Camera access needed</h3>
                    <p>{cameraError || 'Please allow camera permission to verify your face.'}</p>
                    <div className="mob-camera-error-actions">
                      <button
                        type="button"
                        className="mob-btn-retry"
                        onClick={() => startCameraStream(facingMode)}
                      >
                        Try Camera Again
                      </button>
                      <button
                        type="button"
                        className="mob-btn-secondary"
                        onClick={closeCamera}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mob-viewfinder-wrap">
                      <div className="mob-viewfinder-frame">
                        <video
                          ref={videoRef}
                          playsInline
                          autoPlay
                          muted
                          className="mob-camera-video"
                        />
                        {/* 4 White Corner Brackets from Reference */}
                        <div className="mob-bracket mob-bracket-tl" />
                        <div className="mob-bracket mob-bracket-tr" />
                        <div className="mob-bracket mob-bracket-bl" />
                        <div className="mob-bracket mob-bracket-br" />
                      </div>
                    </div>

                    <div className="mob-camera-bottom-bar">
                      <div className="mob-camera-bottom-spacer" />
                      <button
                        type="button"
                        className="mob-shutter-btn"
                        onClick={handleMobileCapture}
                        disabled={cameraPhase !== 'preview'}
                        aria-label="Take Photo"
                      >
                        <span className="mob-shutter-inner" />
                      </button>
                      <button
                        type="button"
                        className="mob-flip-btn"
                        onClick={toggleCameraFacing}
                        title="Flip Camera"
                        aria-label="Flip Camera"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── STEP 2: VERIFICATION SCREEN (Phone 3) ── */}
            {flowStep === 'verifying' && (
              <div className="mob-verify-screen">
                <div className="mob-verify-badge-wrap">
                  <div className="mob-verify-ring">
                    <div className="mob-verify-circle">
                      <Check size={38} strokeWidth={3.5} className="mob-verify-check-icon" />
                    </div>
                  </div>
                </div>

                <h2 className="mob-verify-title">Verifying your details...</h2>

                {/* 3 Real Verification Checks */}
                <div className="mob-verify-checklist">
                  <div className="mob-verify-item">
                    <div className={`mob-check-icon-box ${verifyChecks.photo === 'verified' ? 'is-verified' : verifyChecks.photo === 'error' ? 'is-error' : 'is-checking'}`}>
                      {verifyChecks.photo === 'verified' ? (
                        <Check size={14} strokeWidth={3} />
                      ) : verifyChecks.photo === 'error' ? (
                        <X size={14} strokeWidth={3} />
                      ) : (
                        <Loader2 size={13} className="spin" />
                      )}
                    </div>
                    <span className="mob-check-label">Photo verification</span>
                  </div>

                  <div className="mob-verify-item">
                    <div className={`mob-check-icon-box ${verifyChecks.location === 'verified' ? 'is-verified' : verifyChecks.location === 'error' ? 'is-error' : 'is-checking'}`}>
                      {verifyChecks.location === 'verified' ? (
                        <Check size={14} strokeWidth={3} />
                      ) : verifyChecks.location === 'error' ? (
                        <X size={14} strokeWidth={3} />
                      ) : (
                        <Loader2 size={13} className="spin" />
                      )}
                    </div>
                    <span className="mob-check-label">Location check</span>
                  </div>

                  <div className="mob-verify-item">
                    <div className={`mob-check-icon-box ${verifyChecks.time === 'verified' ? 'is-verified' : verifyChecks.time === 'error' ? 'is-error' : 'is-checking'}`}>
                      {verifyChecks.time === 'verified' ? (
                        <Check size={14} strokeWidth={3} />
                      ) : verifyChecks.time === 'error' ? (
                        <X size={14} strokeWidth={3} />
                      ) : (
                        <Loader2 size={13} className="spin" />
                      )}
                    </div>
                    <span className="mob-check-label">Time verification</span>
                  </div>
                </div>

                {/* Error handling during verification */}
                {(locationError || cameraError || error) && (
                  <div className="mob-verify-error-banner">
                    <div className="mob-verify-error-head">
                      <AlertTriangle size={20} className="mob-verify-error-icon" />
                      <strong className="mob-verify-error-title">Unable to complete punch</strong>
                    </div>
                    <span className="mob-verify-error-msg">{locationError || cameraError || error || 'Verification failed. Please try again.'}</span>
                    <div className="mob-verify-error-buttons">
                      <button
                        type="button"
                        className="mob-btn-retry"
                        onClick={() => {
                          setError('');
                          setLocationError('');
                          setCameraError('');
                          setFlowStep('camera');
                          startCameraStream(facingMode);
                        }}
                      >
                        Try Again
                      </button>
                      <button
                        type="button"
                        className="mob-btn-secondary"
                        onClick={closeCamera}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: LIVE 3D SUCCESS SCREEN (Phone 4) ── */}
            {flowStep === 'success' && successDetails && (
              <AttendanceSuccessAnimation
                type={successDetails.mode === 'checkOut' ? 'punch-out' : 'punch-in'}
                attendance={successDetails}
                onDone={handleDone}
              />
            )}

          </div>
        </div>,
        document.body
      )}
      {/* ═══════════════════════════════════════════════════════════════
          ACCESSIBLE LIGHTBOX MODAL FOR INSPECTING CARD PHOTOS
          ═══════════════════════════════════════════════════════════════ */}
      {cardLightboxPhoto && ReactDOM.createPortal(
        <div
          className="asa-lightbox-backdrop"
          onClick={() => setCardLightboxPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Attendance photo preview"
        >
          <div className="asa-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="asa-lightbox-header">
              <div className="asa-lightbox-header-text">
                <span className="asa-lightbox-badge">{cardLightboxPhoto.title}</span>
                <span className="asa-lightbox-timestamp">{cardLightboxPhoto.time}</span>
              </div>
              <button
                type="button"
                className="asa-lightbox-close"
                onClick={() => setCardLightboxPhoto(null)}
                aria-label="Close enlarged preview"
              >
                <X size={20} />
              </button>
            </div>
            <div className="asa-lightbox-img-box">
              <img
                src={cardLightboxPhoto.url}
                alt={cardLightboxPhoto.title}
                className="asa-lightbox-full-img"
              />
            </div>
            <div className="asa-lightbox-footer">
              <div className="asa-lightbox-meta">
                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                <span className="asa-meta-text">Verified Attendance Selfie</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
