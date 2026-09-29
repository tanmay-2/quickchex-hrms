import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import attendanceService from '../services/attendanceService';
import authService from '../services/authService';
import { getLeaveCount } from '../theme/tokens';

export default function DashboardScreen({ session, onLogout, onNavigateAttendance, onNavigateLeaves }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayStatus, setTodayStatus] = useState('Not Checked In');
  const [checkInTime, setCheckInTime] = useState('--:--');
  const [checkOutTime, setCheckOutTime] = useState('--:--');
  const [leaveBalance, setLeaveBalance] = useState({ casual: 12, sick: 6 });
  const [refreshing, setRefreshing] = useState(false);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const records = await attendanceService.getTodayRecords();
      if (records && Array.isArray(records) && records.length > 0) {
        const today = records[0];
        if (today.punch_in || today.check_in) {
          setTodayStatus('Checked In');
          setCheckInTime(today.punch_in || today.check_in);
        }
        if (today.punch_out || today.check_out) {
          setTodayStatus('Checked Out');
          setCheckOutTime(today.punch_out || today.check_out);
        }
      }

      const balance = await attendanceService.getLeaveBalance();
      if (balance) {
        setLeaveBalance(balance);
      }
    } catch {
      // Keep existing displayed state
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Hello, {session?.name || 'Employee'}</Text>
          <Text style={styles.empBadge}>ID: {session?.empCode || 'EMP-QC'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#3b82f6" />
        }
      >
        {/* Live Clock Card */}
        <View style={styles.clockCard}>
          <Text style={styles.dateLabel}>{formattedDate}</Text>
          <Text style={styles.timeDisplay}>{formattedTime}</Text>
          
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor:
                    todayStatus === 'Checked In'
                      ? '#10b981'
                      : todayStatus === 'Checked Out'
                      ? '#6b7280'
                      : '#f59e0b',
                },
              ]}
            />
            <Text style={styles.statusText}>{todayStatus}</Text>
          </View>
        </View>

        {/* Today's Punch Summary */}
        <View style={styles.punchSummaryCard}>
          <View style={styles.punchBox}>
            <Text style={styles.punchBoxLabel}>PUNCH IN</Text>
            <Text style={styles.punchBoxTime}>{checkInTime}</Text>
          </View>
          <View style={styles.punchDivider} />
          <View style={styles.punchBox}>
            <Text style={styles.punchBoxLabel}>PUNCH OUT</Text>
            <Text style={styles.punchBoxTime}>{checkOutTime}</Text>
          </View>
        </View>

        {/* GPS Punch In/Out Action Button */}
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={onNavigateAttendance}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryActionTitle}>📍 Punch Attendance</Text>
          <Text style={styles.primaryActionSubtitle}>
            GPS Geofenced Punch In / Punch Out
          </Text>
        </TouchableOpacity>

        {/* Quick Menu Options */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        
        <View style={styles.grid}>
          {/* Leaves Card */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={onNavigateLeaves}
            activeOpacity={0.8}
          >
            <Text style={styles.gridIcon}>📅</Text>
            <Text style={styles.gridTitle}>Leave Balance</Text>
            <Text style={styles.gridValue}>
              {getLeaveCount(leaveBalance?.casualLeave ?? leaveBalance?.casual_leave ?? leaveBalance?.casual, 12)} CL /{' '}
              {getLeaveCount(leaveBalance?.sickLeave ?? leaveBalance?.sick_leave ?? leaveBalance?.sick, 6)} SL
            </Text>
          </TouchableOpacity>

          {/* Profile Card */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => Alert.alert('Employee Profile', `Role: ${session?.role || 'Employee'}\nEmail: ${session?.email || 'N/A'}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.gridIcon}>👤</Text>
            <Text style={styles.gridTitle}>My Profile</Text>
            <Text style={styles.gridValue}>{session?.role || 'Employee'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  empBadge: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  clockCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
  },
  timeDisplay: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  punchSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  punchBox: {
    flex: 1,
    alignItems: 'center',
  },
  punchBoxLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  punchBoxTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 4,
  },
  punchDivider: {
    width: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  primaryActionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  primaryActionSubtitle: {
    fontSize: 13,
    color: '#bfdbfe',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCard: {
    flex: 0.48,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gridIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  gridValue: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: '700',
    marginTop: 4,
  },
});
