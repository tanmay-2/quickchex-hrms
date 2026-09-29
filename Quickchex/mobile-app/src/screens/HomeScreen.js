import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import api from '../services/apiService';
import { COLORS, SPACING, RADII, getLeaveCount } from '../theme/tokens';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function calculateWorkingHours(punchIn, punchOut) {
  if (!punchIn) return '0h 00m';
  try {
    const parseTimeToMinutes = (t) => {
      if (!t || t === '—' || t === '-') return null;
      if (typeof t === 'string' && t.includes('T')) {
        const d = new Date(t);
        if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
      }
      const m = String(t).trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!m) return null;
      let hrs = parseInt(m[1], 10);
      const mins = parseInt(m[2], 10);
      const ampm = m[3] ? m[3].toUpperCase() : null;
      if (ampm === 'PM' && hrs < 12) hrs += 12;
      if (ampm === 'AM' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };

    const inMins = parseTimeToMinutes(punchIn);
    if (inMins === null) return '—';

    let outMins;
    if (punchOut && punchOut !== '—' && punchOut !== '-') {
      outMins = parseTimeToMinutes(punchOut);
    } else {
      const now = new Date();
      outMins = now.getHours() * 60 + now.getMinutes();
    }

    if (outMins !== null && outMins >= inMins) {
      const diff = outMins - inMins;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${String(m).padStart(2, '0')}m`;
    }
  } catch {}
  return '—';
}

export default function HomeScreen({ session, onNavigate }) {
  const [now, setNow] = useState(new Date());
  const [todayAtt, setTodayAtt] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punching, setPunching] = useState(false);

  const role = (session?.role || 'employee').toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || role === 'teamleader';

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    setRefreshing(true);
    try {
      const [todayRes, summaryRes, leaveRes, annRes] = await Promise.allSettled([
        api.get('/api/v1/attendance/today'),
        api.get('/api/v1/dashboard/summary'),
        api.get('/api/v1/leave/balance'),
        api.get('/api/v1/announcements'),
      ]);

      // 1. Live Today Attendance from Neon PostgreSQL
      if (todayRes.status === 'fulfilled' && todayRes.value?.data) {
        setTodayAtt(todayRes.value.data);
      }

      // 2. Dashboard Summary
      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data) {
        const sd = summaryRes.value.data;
        setSummaryData(sd);
        if (Array.isArray(sd.announcements) && sd.announcements.length > 0) {
          setAnnouncements(sd.announcements.slice(0, 3));
        }
        if (sd.leaveBalances) {
          setLeaveBalance((prev) => prev || sd.leaveBalances);
        }
      }

      // 3. Leave Balances
      if (leaveRes.status === 'fulfilled' && leaveRes.value?.data) {
        setLeaveBalance(leaveRes.value.data);
      }

      // 4. Announcements fallback
      if (annRes.status === 'fulfilled' && annRes.value?.data) {
        const d = annRes.value.data;
        if (Array.isArray(d) && d.length > 0) {
          setAnnouncements(d.slice(0, 3));
        }
      }
    } catch (e) {
      console.warn('Error loading home data:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Direct GPS Punch In / Out (Synchronized with Neon DB & Website)
  const handleDirectPunch = async () => {
    if (punching) return;
    setPunching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS location permission is required to punch attendance.');
        setPunching(false);
        return;
      }

      let location = null;
      let latitude = 19.11043;
      let longitude = 72.887818;
      let accuracy = 10;

      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
          accuracy = loc.coords.accuracy || 10;
          location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }
      } catch (e) {
        console.warn('Could not get precise GPS, using registered branch coordinates:', e);
      }

      const empCode = session?.empCode || await SecureStore.getItemAsync('emp_code') || 'EMP';
      const email = session?.email || await SecureStore.getItemAsync('email') || '';

      const isAlreadyIn = Boolean((todayAtt?.checkIn || todayAtt?.punch_in_time) && !(todayAtt?.checkOut || todayAtt?.punch_out_time));
      const punchAction = isAlreadyIn ? 'out' : 'in';

      const payload = {
        type: punchAction === 'in' ? 'check_in' : 'check_out',
        punchType: punchAction,
        punch_type: punchAction,
        timestamp: new Date().toISOString(),
        displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        location: location || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude,
        longitude,
        accuracy,
        emp_code: empCode,
        employee_id: empCode,
        employeeId: empCode,
        email,
      };

      await api.post('/api/v1/attendance/punch', payload);
      Alert.alert('Success ✅', punchAction === 'in' ? 'Punched in successfully! Synced with portal.' : 'Punched out successfully! Synced with portal.');
      await load();
    } catch (err) {
      Alert.alert('Punch Notice', err.message || 'Could not record attendance. Please check network/location.');
    } finally {
      setPunching(false);
    }
  };

  const punchIn = todayAtt?.checkIn || todayAtt?.punch_in || (todayAtt?.punch_in_time ? new Date(todayAtt.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);
  const punchOut = todayAtt?.checkOut || todayAtt?.punch_out || (todayAtt?.punch_out_time ? new Date(todayAtt.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);
  const isCheckedIn = Boolean(punchIn && (!punchOut || punchOut === '—' || punchOut === '-'));
  const isCheckedOut = Boolean(punchIn && punchOut && punchOut !== '—' && punchOut !== '-');

  const attStatus = isCheckedOut ? 'Checked Out' : isCheckedIn ? 'Checked In' : 'Not Punched';
  const attColor = isCheckedOut ? COLORS.textMuted : isCheckedIn ? COLORS.success : COLORS.warning;
  const attBg = isCheckedOut ? '#f1eff6' : isCheckedIn ? COLORS.successBg : COLORS.warningBg;

  const casualVal = getLeaveCount(leaveBalance?.casualLeave ?? leaveBalance?.casual_leave ?? leaveBalance?.casual, 10);
  const sickVal = getLeaveCount(leaveBalance?.sickLeave ?? leaveBalance?.sick_leave ?? leaveBalance?.sick, 8);
  const privVal = getLeaveCount(leaveBalance?.privilegeLeave ?? leaveBalance?.privilege_leave ?? leaveBalance?.optionalHoliday ?? leaveBalance?.optional, 3);
  const totalAvail = casualVal + sickVal + privVal;

  const liveHours = isCheckedIn ? calculateWorkingHours(punchIn, null) : isCheckedOut ? calculateWorkingHours(punchIn, punchOut) : (summaryData?.stats?.workingHours || '0h 00m');

  const displayName = summaryData?.employee?.name || session?.name || 'Employee';
  const firstName = displayName.split(' ')[0];
  const empCodeDisplay = summaryData?.employee?.emp_code || session?.empCode || 'EMP';

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Website-Style Top Header Bar */}
      <View style={s.topbar}>
        <View style={{ flex: 1 }}>
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>
              {now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={s.greeting}>{getGreeting()}, {firstName} 👋</Text>
          <Text style={s.empSubtitle}>{empCodeDisplay} · {(session?.role || 'Employee').toUpperCase()}</Text>
        </View>

        <TouchableOpacity style={s.avatarWrap} onPress={() => onNavigate('profile')} activeOpacity={0.8}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{firstName[0]?.toUpperCase() || 'U'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 4 Stat Cards Row (Exact Match to Website's .stats-grid) */}
        <View style={s.statsGrid}>
          {/* Attendance */}
          <TouchableOpacity style={s.statCard} onPress={() => onNavigate('attendance')} activeOpacity={0.8}>
            <View style={[s.statIconWrap, { backgroundColor: '#e7f4ff' }]}>
              <Text style={s.statIcon}>📅</Text>
            </View>
            <View style={s.statTextWrap}>
              <Text style={s.statLabel}>Attendance</Text>
              <Text style={s.statNumber}>{isCheckedIn ? 'Present' : isCheckedOut ? 'Done' : 'Pending'}</Text>
              <Text style={s.statHelper}>Today</Text>
            </View>
          </TouchableOpacity>

          {/* Working Hours */}
          <View style={s.statCard}>
            <View style={[s.statIconWrap, { backgroundColor: '#f0ebff' }]}>
              <Text style={s.statIcon}>⏱️</Text>
            </View>
            <View style={s.statTextWrap}>
              <Text style={s.statLabel}>Working Hours</Text>
              <Text style={[s.statNumber, { color: COLORS.primary }]}>{liveHours}</Text>
              <Text style={s.statHelper}>{isCheckedIn ? 'Live in progress' : 'Today'}</Text>
            </View>
          </View>

          {/* Leave Balance */}
          <TouchableOpacity style={s.statCard} onPress={() => onNavigate('leaves')} activeOpacity={0.8}>
            <View style={[s.statIconWrap, { backgroundColor: '#e8f7ed' }]}>
              <Text style={s.statIcon}>✈️</Text>
            </View>
            <View style={s.statTextWrap}>
              <Text style={s.statLabel}>Leave Balance</Text>
              <Text style={[s.statNumber, { color: COLORS.success }]}>{totalAvail}d</Text>
              <Text style={s.statHelper}>Available</Text>
            </View>
          </TouchableOpacity>

          {/* Payslips */}
          <TouchableOpacity style={s.statCard} onPress={() => onNavigate('salary')} activeOpacity={0.8}>
            <View style={[s.statIconWrap, { backgroundColor: '#fff4df' }]}>
              <Text style={s.statIcon}>💳</Text>
            </View>
            <View style={s.statTextWrap}>
              <Text style={s.statLabel}>Payslips</Text>
              <Text style={[s.statNumber, { color: COLORS.warning }]}>View</Text>
              <Text style={s.statHelper}>Current Year</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Unified Attendance Punch Card (Exact Match to Website) */}
        <View style={s.punchCard}>
          <View style={s.punchCardHeader}>
            <View>
              <Text style={s.punchCardEyebrow}>ATTENDANCE SYSTEM</Text>
              <Text style={s.punchCardTitle}>Daily Punch & Tracking</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: attBg, borderColor: attColor + '40' }]}>
              <View style={[s.statusDot, { backgroundColor: attColor }]} />
              <Text style={[s.statusText, { color: attColor }]}>{attStatus}</Text>
            </View>
          </View>

          {/* Clock Display */}
          <View style={s.clockWrap}>
            <Text style={s.clockTime}>
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
            <Text style={s.clockDate}>
              {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          {/* Punch In / Out Timing Boxes */}
          <View style={s.punchTimesRow}>
            <View style={s.punchTimeBox}>
              <Text style={s.punchTimeLabel}>PUNCH IN</Text>
              <Text style={s.punchTimeVal}>{punchIn || '—'}</Text>
            </View>
            <View style={s.punchTimeDivider} />
            <View style={s.punchTimeBox}>
              <Text style={s.punchTimeLabel}>PUNCH OUT</Text>
              <Text style={s.punchTimeVal}>{punchOut || '—'}</Text>
            </View>
          </View>

          {/* Primary Action Button — Live GPS Punch */}
          <TouchableOpacity
            style={[s.primaryPunchBtn, isCheckedIn && s.punchOutBtn]}
            onPress={handleDirectPunch}
            disabled={punching}
            activeOpacity={0.88}
          >
            {punching ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={s.primaryPunchText}>
                📍 {isCheckedIn ? 'Punch Out & Check Out' : 'Punch In with GPS'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Leave Balances Strip (Casual, Sick, Optional) */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Leave Balances</Text>
          <TouchableOpacity onPress={() => onNavigate('leaves')}>
            <Text style={s.seeAllText}>Apply Leave ›</Text>
          </TouchableOpacity>
        </View>

        <View style={s.leaveRow}>
          <View style={s.leaveBox}>
            <Text style={[s.leaveCount, { color: '#0284c7' }]}>{casualVal}</Text>
            <Text style={s.leaveLabel}>Casual Leave</Text>
            <Text style={s.leaveSub}>Remaining</Text>
          </View>
          <View style={s.leaveBox}>
            <Text style={[s.leaveCount, { color: COLORS.success }]}>{sickVal}</Text>
            <Text style={s.leaveLabel}>Sick Leave</Text>
            <Text style={s.leaveSub}>Remaining</Text>
          </View>
          <View style={s.leaveBox}>
            <Text style={[s.leaveCount, { color: COLORS.primary }]}>{privVal}</Text>
            <Text style={s.leaveLabel}>Optional</Text>
            <Text style={s.leaveSub}>Remaining</Text>
          </View>
        </View>

        {/* Quick Actions (Matching Website's .quick-grid) */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick Access</Text>
          <Text style={s.sectionSubtitle}>Most used actions</Text>
        </View>

        <View style={s.quickGrid}>
          {isAdmin && (
            <TouchableOpacity style={s.quickCard} onPress={() => onNavigate('adminDashboard')} activeOpacity={0.8}>
              <View style={[s.quickIconWrap, { backgroundColor: '#f0ebff' }]}>
                <Text style={s.quickIcon}>⚙️</Text>
              </View>
              <Text style={s.quickTitle}>Admin Hub</Text>
              <Text style={s.quickDesc}>Organization overview</Text>
            </TouchableOpacity>
          )}

          {isManager && (
            <TouchableOpacity style={s.quickCard} onPress={() => onNavigate('managerDashboard')} activeOpacity={0.8}>
              <View style={[s.quickIconWrap, { backgroundColor: '#e7f4ff' }]}>
                <Text style={s.quickIcon}>👥</Text>
              </View>
              <Text style={s.quickTitle}>Team Hub</Text>
              <Text style={s.quickDesc}>Approvals & roster</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.quickCard} onPress={() => onNavigate('regularization')} activeOpacity={0.8}>
            <View style={[s.quickIconWrap, { backgroundColor: '#fef2f2' }]}>
              <Text style={s.quickIcon}>🔄</Text>
            </View>
            <Text style={s.quickTitle}>Regularization</Text>
            <Text style={s.quickDesc}>Missed punch fix</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.quickCard} onPress={() => onNavigate('attendance')} activeOpacity={0.8}>
            <View style={[s.quickIconWrap, { backgroundColor: '#e7f4ff' }]}>
              <Text style={s.quickIcon}>📍</Text>
            </View>
            <Text style={s.quickTitle}>Punch Logs</Text>
            <Text style={s.quickDesc}>Monthly attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.quickCard} onPress={() => onNavigate('leaves')} activeOpacity={0.8}>
            <View style={[s.quickIconWrap, { backgroundColor: '#e8f7ed' }]}>
              <Text style={s.quickIcon}>📅</Text>
            </View>
            <Text style={s.quickTitle}>Apply Leave</Text>
            <Text style={s.quickDesc}>Submit request</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.quickCard} onPress={() => onNavigate('salary')} activeOpacity={0.8}>
            <View style={[s.quickIconWrap, { backgroundColor: '#fff4df' }]}>
              <Text style={s.quickIcon}>💰</Text>
            </View>
            <Text style={s.quickTitle}>Payslips</Text>
            <Text style={s.quickDesc}>Monthly breakdown</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.quickCard} onPress={() => onNavigate('directory')} activeOpacity={0.8}>
            <View style={[s.quickIconWrap, { backgroundColor: '#f0ebff' }]}>
              <Text style={s.quickIcon}>👥</Text>
            </View>
            <Text style={s.quickTitle}>Directory</Text>
            <Text style={s.quickDesc}>Team & colleagues</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.quickCard} onPress={() => onNavigate('holidays')} activeOpacity={0.8}>
            <View style={[s.quickIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Text style={s.quickIcon}>🎉</Text>
            </View>
            <Text style={s.quickTitle}>Holidays</Text>
            <Text style={s.quickDesc}>2026 Calendar</Text>
          </TouchableOpacity>
        </View>

        {/* Company Announcements (Matching Website) */}
        {announcements.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Announcements</Text>
            </View>
            {announcements.map((ann, idx) => (
              <View key={ann.id || idx} style={s.annCard}>
                <Text style={s.annIcon}>📢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.annTitle}>{ann.title || ann.subject || 'Company Update'}</Text>
                  <Text style={s.annBody} numberOfLines={2}>{ann.content || ann.message || ann.body || ''}</Text>
                  <Text style={s.annDate}>{ann.date || ann.created_at || 'Recent'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },

  // Top Header Bar
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ebff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: 5 },
  liveText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  greeting: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  empSubtitle: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginTop: 1 },
  avatarWrap: { marginLeft: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0d5ff',
  },
  avatarLetter: { fontSize: 18, fontWeight: '800', color: '#ffffff' },

  // 4 Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIcon: { fontSize: 18 },
  statTextWrap: {},
  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statNumber: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  statHelper: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // Punch Card
  punchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  punchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  punchCardEyebrow: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  punchCardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },

  clockWrap: {
    backgroundColor: '#faf9fd',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ede9fe',
    marginBottom: 14,
  },
  clockTime: { fontSize: 28, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  clockDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },

  punchTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf9fd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  punchTimeBox: { flex: 1, alignItems: 'center' },
  punchTimeLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },
  punchTimeVal: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  punchTimeDivider: { width: 1, height: 26, backgroundColor: COLORS.border },

  primaryPunchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  punchOutBtn: { backgroundColor: '#dc2626' },
  primaryPunchText: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.4 },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sectionSubtitle: { fontSize: 11, color: COLORS.textMuted },
  seeAllText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  // Leave Row
  leaveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  leaveBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  leaveCount: { fontSize: 18, fontWeight: '800' },
  leaveLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2, textAlign: 'center' },
  leaveSub: { fontSize: 9, color: COLORS.textMuted, marginTop: 1 },

  // Quick Grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickCard: {
    width: '48.5%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickIcon: { fontSize: 18 },
  quickTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  quickDesc: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // Announcements
  annCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  annIcon: { fontSize: 18, marginRight: 10, marginTop: 1 },
  annTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  annBody: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, lineHeight: 15 },
  annDate: { fontSize: 9, color: '#94a3b8', marginTop: 4 },
});
