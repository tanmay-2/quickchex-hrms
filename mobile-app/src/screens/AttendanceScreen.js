// ==============================================================================
// QUICKCHEX HRMS MOBILE APP - ATTENDANCESCREEN.JS
// Path: mobile-app/src/screens/AttendanceScreen.js
// Purpose: React Native screen view managing 'Attendance' workflows, UI presentation, and API integration.
// UI Components:
//   • <MONTHS />
//   • <AttendanceScreen />
// Key Functions & Handlers:
//   • load()
//   • handlePunch()
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { COLORS, SPACING, RADII } from '../theme/tokens';
import { ScreenHeader, EmptyState, getStatusColor } from '../components/ui';
import api from '../services/apiService';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AttendanceScreen({ session, onNavigate, onBack }) {
  const [records, setRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punching, setPunching] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  const load = async () => {
    setRefreshing(true);
    try {
      const [todayRes, recordsRes] = await Promise.allSettled([
        api.get('/api/v1/attendance/today'),
        api.get('/api/v1/attendance/records'),
      ]);

      if (todayRes.status === 'fulfilled' && todayRes.value?.data) {
        setTodayRecord(todayRes.value.data);
      }

      if (recordsRes.status === 'fulfilled' && recordsRes.value?.data) {
        const d = recordsRes.value.data;
        const list = Array.isArray(d) ? d : d?.records || d?.data || [];
        setRecords(list);
      }
    } catch (e) {
      console.warn('Error loading attendance:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ==============================================================================
  // PUNCH BUTTON (Clock in or Clock out with Phone GPS)
  // ==============================================================================
  // What this does in simple steps:
  // 1. Asks the phone for permission to see where you are (GPS location).
  // 2. Gets the exact location where the phone is right now.
  // 3. Finds out who is logged in (employee ID code).
  // 4. Checks if you already clocked in today:
  //    - If already clocked in: this button will Clock Out to end the day.
  //    - If not clocked in yet: this button will Clock In to start the day.
  // 5. Sends the time and location to the backend server.
  // 6. Shows a green success popup on the phone screen.
  // 7. Refreshes the numbers on screen so you can see your clock-in/out times.
  // ==============================================================================
  const handlePunch = async () => {
    // Enable visual loading spinner on the punch button
    setPunching(true);
    // Display status hint to employee while searching for GPS satellites
    setLocationStatus('Accessing GPS location...');
    try {
      // Step 1: Request foreground location permission from iOS / Android OS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS location permission is required for attendance.');
        setPunching(false);
        setLocationStatus('');
        return;
      }

      // Default fallback coordinates (Head Office Mumbai) in case of simulator or timeout
      let latitude = 19.11043;
      let longitude = 72.887818;
      let accuracy = 10;
      let location = null;

      // Step 2: Query real device GPS hardware for accurate position
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
          accuracy = loc.coords.accuracy || 10;
          location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }
      } catch (e) {
        console.warn('GPS reading fallback:', e);
      }

      // Step 3: Retrieve authenticated employee identifier from AuthContext or SecureStore
      const empCode = session?.empCode || await SecureStore.getItemAsync('emp_code') || 'EMP';
      const email = session?.email || await SecureStore.getItemAsync('email') || '';

      // Step 4: Determine punch direction (In vs Out) based on today's existing punches
      const punchIn = todayRecord?.checkIn || todayRecord?.punch_in || todayRecord?.punch_in_time;
      const punchOut = todayRecord?.checkOut || todayRecord?.punch_out || todayRecord?.punch_out_time;
      // If employee has punched in but has not yet punched out, the next action is punch out
      const isAlreadyIn = Boolean(punchIn && (!punchOut || punchOut === '—' || punchOut === '-'));
      const punchAction = isAlreadyIn ? 'out' : 'in';

      // Update UI feedback banner
      setLocationStatus(punchAction === 'out' ? 'Recording punch out...' : 'Recording punch in...');

      // Step 5: Construct unified attendance punch payload
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

      // Step 6: Dispatch HTTP POST request to FastAPI attendance punch endpoint
      await api.post('/api/v1/attendance/punch', payload);
      
      // Step 7: Notify employee of successful registration
      Alert.alert(
        'Success ✅',
        punchAction === 'out'
          ? 'Punch Out recorded! Synchronized with website.'
          : 'Punch In recorded! Synchronized with website.'
      );
      // Reload today's records and logs to immediately update UI display
      await load();
    } catch (err) {
      // Present readable error message if punch fails (e.g., duplicate, network)
      Alert.alert('Attendance Alert', err.message || 'Attendance punch failed.');
    } finally {
      // Reset loading states
      setPunching(false);
      setLocationStatus('');
    }
  };

  const punchInTime = todayRecord?.checkIn || todayRecord?.punch_in || (todayRecord?.punch_in_time ? new Date(todayRecord.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);
  const punchOutTime = todayRecord?.checkOut || todayRecord?.punch_out || (todayRecord?.punch_out_time ? new Date(todayRecord.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);
  const isPunchedIn = Boolean(punchInTime && (!punchOutTime || punchOutTime === '—' || punchOutTime === '-'));
  const isPunchedOut = Boolean(punchInTime && punchOutTime && punchOutTime !== '—' && punchOutTime !== '-');

  const statusLabel = isPunchedOut ? 'Checked Out' : isPunchedIn ? 'Checked In' : 'Not Started';
  const statusColor = isPunchedOut ? COLORS.textMuted : isPunchedIn ? COLORS.success : COLORS.warning;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="Attendance & Punch Logs" onBack={onBack} />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Unified Punch Card */}
        <View style={s.todayCard}>
          <View style={s.cardHeaderRow}>
            <View>
              <Text style={s.eyebrow}>LIVE PUNCH STATUS</Text>
              <Text style={s.todayDate}>
                {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <View style={[s.badge, { borderColor: statusColor + '40', backgroundColor: statusColor + '15' }]}>
              <View style={[s.badgeDot, { backgroundColor: statusColor }]} />
              <Text style={[s.badgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={s.punchTimesGrid}>
            <View style={s.punchTimeBox}>
              <Text style={s.punchLabel}>PUNCH IN</Text>
              <Text style={s.punchTime}>{punchInTime || '—'}</Text>
              <Text style={s.punchLocation} numberOfLines={1}>
                {todayRecord?.punch_in_location || todayRecord?.location || 'Office Boundary'}
              </Text>
            </View>
            <View style={s.divider} />
            <View style={s.punchTimeBox}>
              <Text style={s.punchLabel}>PUNCH OUT</Text>
              <Text style={s.punchTime}>{punchOutTime || '—'}</Text>
              <Text style={s.punchLocation} numberOfLines={1}>
                {todayRecord?.punch_out_location || (isPunchedIn ? 'Pending punch out' : '—')}
              </Text>
            </View>
          </View>

          {locationStatus ? (
            <Text style={s.locStatusText}>{locationStatus}</Text>
          ) : null}

          <TouchableOpacity
            style={[s.punchBtn, isPunchedIn && s.punchBtnOut]}
            onPress={handlePunch}
            disabled={punching}
            activeOpacity={0.88}
          >
            {punching ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={s.punchBtnText}>
                📍 {isPunchedIn ? 'Punch Out & Conclude Day' : 'Punch In with GPS'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Regularization Quick Action Banner (Matching Website Attendance Page) */}
        <TouchableOpacity
          style={s.regBanner}
          onPress={() => onNavigate && onNavigate('regularization')}
          activeOpacity={0.88}
        >
          <View style={s.regIconWrap}>
            <Text style={s.regIcon}>🔄</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.regTitle}>Missed Punch or Discrepancy?</Text>
            <Text style={s.regSub}>Apply for attendance regularization</Text>
          </View>
          <Text style={s.regArrow}>Apply ›</Text>
        </TouchableOpacity>

        {/* Monthly Summary Stats Bar (Matching Web Portal KPI Bar) */}
        {records.length > 0 && (() => {
          const presentDays = records.filter(r => {
            const st = (r.status || '').toLowerCase();
            return st === 'present' || st === 'punched in' || r.punch_in || r.check_in;
          }).length;
          const absentDays = records.filter(r => {
            const st = (r.status || '').toLowerCase();
            return st === 'absent';
          }).length;
          const lateDays = records.filter(r => {
            const st = (r.status || '').toLowerCase();
            return st === 'late' || r.remark === 'Late';
          }).length;
          const leaveDays = records.filter(r => {
            const st = (r.status || '').toLowerCase();
            return st.includes('leave');
          }).length;
          return (
            <View style={s.monthStatsBar}>
              <View style={s.monthStatItem}>
                <Text style={[s.monthStatNum, { color: '#059669' }]}>{presentDays}</Text>
                <Text style={s.monthStatLabel}>Present</Text>
              </View>
              <View style={s.monthStatDivider} />
              <View style={s.monthStatItem}>
                <Text style={[s.monthStatNum, { color: '#dc2626' }]}>{absentDays}</Text>
                <Text style={s.monthStatLabel}>Absent</Text>
              </View>
              <View style={s.monthStatDivider} />
              <View style={s.monthStatItem}>
                <Text style={[s.monthStatNum, { color: '#d97706' }]}>{lateDays}</Text>
                <Text style={s.monthStatLabel}>Late</Text>
              </View>
              <View style={s.monthStatDivider} />
              <View style={s.monthStatItem}>
                <Text style={[s.monthStatNum, { color: '#0284c7' }]}>{leaveDays}</Text>
                <Text style={s.monthStatLabel}>On Leave</Text>
              </View>
            </View>
          );
        })()}

        {/* Attendance History Section */}
        <View style={s.historyHeader}>
          <Text style={s.historyTitle}>Monthly Attendance Records</Text>
          <Text style={s.historySub}>{records.length} records retrieved</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
        ) : records.length === 0 ? (
          <EmptyState icon="📅" title="No Attendance Logs" subtitle="Attendance logs will appear here once recorded." />
        ) : (
          records.map((rec, i) => {
            const dateStr = rec.date || rec.attendance_date || rec.check_date || '';
            const inTime = rec.punch_in || rec.check_in || rec.checkIn || '—';
            const outTime = rec.punch_out || rec.check_out || rec.checkOut || '—';
            const status = rec.status || rec.attendance_status || (inTime !== '—' ? 'Present' : 'Absent');
            const col = getStatusColor(status);

            return (
              <View key={rec.id || i} style={s.recCard}>
                <View style={s.recLeft}>
                  <View style={[s.statusPill, { backgroundColor: col + '15', borderColor: col + '30' }]}>
                    <View style={[s.pillDot, { backgroundColor: col }]} />
                    <Text style={[s.pillText, { color: col }]}>{status}</Text>
                  </View>
                  <Text style={s.recDate}>{dateStr}</Text>
                </View>

                <View style={s.recRight}>
                  <Text style={s.recTimes}>
                    {inTime} → {outTime}
                  </Text>
                  <Text style={s.recHrs}>
                    {rec.working_hours || rec.hours || rec.hours_completed ? `${rec.hours || rec.working_hours || rec.hours_completed + 'h'}` : '—'}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },

  todayCard: {
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eyebrow: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  todayDate: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  punchTimesGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf9fd',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  punchTimeBox: { flex: 1, alignItems: 'center' },
  punchLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
  punchTime: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  punchLocation: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  divider: { width: 1, height: 32, backgroundColor: COLORS.border },

  locStatusText: { fontSize: 11, color: COLORS.primary, textAlign: 'center', marginBottom: 10, fontWeight: '600' },

  punchBtn: {
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
  punchBtnOut: { backgroundColor: '#dc2626' },
  punchBtnText: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 },

  // Monthly Stats Bar
  monthStatsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  monthStatItem: { flex: 1, alignItems: 'center' },
  monthStatNum: { fontSize: 20, fontWeight: '800' },
  monthStatLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  monthStatDivider: { width: 1, height: 28, backgroundColor: COLORS.border, alignSelf: 'center' },

  historyHeader: { marginBottom: 12 },
  historyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  historySub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recLeft: { flex: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 1,
    marginBottom: 4,
  },
  pillDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
  pillText: { fontSize: 10, fontWeight: '700' },
  recDate: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },

  recRight: { alignItems: 'flex-end' },
  recTimes: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  recHrs: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Regularization Banner
  regBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  regIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  regIcon: { fontSize: 18 },
  regTitle: { fontSize: 13, fontWeight: '800', color: '#9a3412' },
  regSub: { fontSize: 10, color: '#c2410c', marginTop: 2 },
  regArrow: { fontSize: 12, fontWeight: '800', color: '#ea580c', marginLeft: 8 },
});
