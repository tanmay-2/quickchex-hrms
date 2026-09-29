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
import api from '../services/apiService';
import { COLORS, SPACING, RADII } from '../theme/tokens';
import { ScreenHeader } from '../components/ui';

export default function AdminDashboardScreen({ session, onNavigate, onBack }) {
  const [attendanceToday, setAttendanceToday] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingRegs, setPendingRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(null);

  const load = async () => {
    setRefreshing(true);
    try {
      const [attRes, leavesRes, regsRes] = await Promise.allSettled([
        api.get('/api/v1/attendance/admin/today'),
        api.get('/api/v1/leaves/admin/all'),
        api.get('/api/v1/regularization/admin/all'),
      ]);

      if (attRes.status === 'fulfilled' && attRes.value?.data) {
        const d = attRes.value.data;
        setAttendanceToday(Array.isArray(d) ? d : []);
      }

      if (leavesRes.status === 'fulfilled' && leavesRes.value?.data) {
        const d = leavesRes.value.data;
        const list = Array.isArray(d) ? d : d?.leaves || [];
        setPendingLeaves(list.filter((l) => (l.status || '').toLowerCase() === 'pending'));
      }

      if (regsRes.status === 'fulfilled' && regsRes.value?.data) {
        const d = regsRes.value.data;
        const list = Array.isArray(d) ? d : d?.regularizations || [];
        setPendingRegs(list.filter((r) => (r.status || '').toLowerCase() === 'pending'));
      }
    } catch (e) {
      console.warn('Error loading admin dashboard:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleLeaveAction = async (id, action) => {
    setActing(id);
    try {
      await api.put(`/api/v1/leaves/${id}/${action}`);
      Alert.alert('Success ✅', `Leave application ${action}d successfully. Synced with portal.`);
      await load();
    } catch (err) {
      // Retry with POST
      try {
        await api.post(`/api/v1/leaves/${id}/${action}`);
        Alert.alert('Success ✅', `Leave application ${action}d successfully. Synced with portal.`);
        await load();
      } catch (err2) {
        Alert.alert('Action Failed', err2.message || 'Could not update leave application.');
      }
    } finally {
      setActing(null);
    }
  };

  const handleRegAction = async (id, action) => {
    setActing(id);
    try {
      await api.put(`/api/v1/attendance/regularization/${id}/${action}`);
      Alert.alert('Success ✅', `Regularization ${action}d successfully. Synced with portal.`);
      await load();
    } catch (err) {
      Alert.alert('Action Failed', err.message || 'Could not update regularization request.');
    } finally {
      setActing(null);
    }
  };

  // Exact metrics calculations matching web portal Dashboard.jsx
  const totalEmp = attendanceToday.length || 23;
  const presentCount = attendanceToday.filter((r) =>
    r.punch_in_time || (r.status || '').toLowerCase() === 'present' || (r.status || '').toLowerCase() === 'punched in'
  ).length;
  const lateCount = attendanceToday.filter((r) =>
    r.remark === 'Late' || (r.status || '').toLowerCase() === 'late'
  ).length;
  const leaveCount = attendanceToday.filter((r) =>
    (r.status || '').toLowerCase().includes('leave')
  ).length;
  const absentCount = Math.max(0, totalEmp - presentCount - leaveCount);

  const ADMIN_TOOLS = [
    { id: 'directory', icon: '👥', label: 'Employees', desc: 'Directory & Profiles', color: '#7445ef' },
    { id: 'allAttendance', icon: '📍', label: 'All Attendance', desc: 'Live punch tracking', color: '#0284c7' },
    { id: 'leaveApprovals', icon: '📅', label: 'Leave Approvals', desc: `${pendingLeaves.length} pending`, color: '#059669' },
    { id: 'salary', icon: '💰', label: 'Payroll & Slips', desc: 'Salaries overview', color: '#d97706' },
    { id: 'geoLocation', icon: '🗺️', label: 'Geo-Fence Zones', desc: 'Workplace perimeters', color: '#7445ef' },
    { id: 'tickets', icon: '🎫', label: 'Helpdesk Tickets', desc: 'Support requests', color: '#dc2626' },
    { id: 'holidays', icon: '🎉', label: 'Holiday Calendar', desc: 'Official holidays', color: '#4f46e5' },
    { id: 'policies', icon: '📋', label: 'Company Policies', desc: 'HR Guidelines', color: '#059669' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="Admin Command Center" onBack={onBack} />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Purple Hero Banner (Matching Website Command Center) */}
        <View style={s.heroBanner}>
          <View style={s.heroContent}>
            <View style={s.liveTag}>
              <View style={s.liveDot} />
              <Text style={s.liveTagText}>ADMIN CONTROL · LIVE NEON DB</Text>
            </View>
            <Text style={s.heroTitle}>Welcome back, {session?.name?.split(' ')[0] || 'Admin'} 👋</Text>
            <Text style={s.heroSubtitle}>
              Workforce status for {new Date().toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>

          <View style={s.heroPillsRow}>
            <View style={s.heroPill}>
              <Text style={s.heroPillLabel}>Total Workforce</Text>
              <Text style={s.heroPillVal}>{totalEmp}</Text>
            </View>
            <View style={s.heroPillDivider} />
            <TouchableOpacity style={s.heroPill} onPress={() => onNavigate('leaveApprovals')} activeOpacity={0.8}>
              <Text style={s.heroPillLabel}>Pending Approvals</Text>
              <Text style={[s.heroPillVal, { color: '#fef08a' }]}>{pendingLeaves.length + pendingRegs.length}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 Workforce Status KPI Cards (Matching Website Dashboard) */}
        <View style={s.kpiGrid}>
          <TouchableOpacity style={s.kpiCard} onPress={() => onNavigate('allAttendance')} activeOpacity={0.8}>
            <View style={[s.kpiIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Text style={[s.kpiIcon, { color: '#059669' }]}>✓</Text>
            </View>
            <View style={s.kpiContent}>
              <Text style={s.kpiLabel}>PRESENT TODAY</Text>
              <Text style={[s.kpiVal, { color: '#059669' }]}>{presentCount}</Text>
              <Text style={s.kpiSub}>{Math.round((presentCount / (totalEmp || 1)) * 100)}% of workforce</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.kpiCard} onPress={() => onNavigate('allAttendance')} activeOpacity={0.8}>
            <View style={[s.kpiIconWrap, { backgroundColor: '#fef2f2' }]}>
              <Text style={[s.kpiIcon, { color: '#dc2626' }]}>✕</Text>
            </View>
            <View style={s.kpiContent}>
              <Text style={s.kpiLabel}>ABSENT</Text>
              <Text style={[s.kpiVal, { color: '#dc2626' }]}>{absentCount}</Text>
              <Text style={s.kpiSub}>Unaccounted</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.kpiCard} onPress={() => onNavigate('leaveApprovals')} activeOpacity={0.8}>
            <View style={[s.kpiIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Text style={[s.kpiIcon, { color: '#0284c7' }]}>✈️</Text>
            </View>
            <View style={s.kpiContent}>
              <Text style={s.kpiLabel}>ON LEAVE</Text>
              <Text style={[s.kpiVal, { color: '#0284c7' }]}>{leaveCount}</Text>
              <Text style={s.kpiSub}>Approved leaves</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.kpiCard} onPress={() => onNavigate('allAttendance')} activeOpacity={0.8}>
            <View style={[s.kpiIconWrap, { backgroundColor: '#fffbeb' }]}>
              <Text style={[s.kpiIcon, { color: '#d97706' }]}>⏱️</Text>
            </View>
            <View style={s.kpiContent}>
              <Text style={s.kpiLabel}>LATE COMERS</Text>
              <Text style={[s.kpiVal, { color: '#d97706' }]}>{lateCount}</Text>
              <Text style={s.kpiSub}>After 10:30 AM</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Administration Management Tools Grid */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Administration Modules</Text>
          <Text style={s.sectionSubtitle}>Select tool to manage</Text>
        </View>

        <View style={s.toolsGrid}>
          {ADMIN_TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={s.toolCard}
              onPress={() => onNavigate(tool.id)}
              activeOpacity={0.8}
            >
              <View style={[s.toolIconWrap, { backgroundColor: tool.color + '15' }]}>
                <Text style={s.toolIcon}>{tool.icon}</Text>
              </View>
              <Text style={s.toolLabel}>{tool.label}</Text>
              <Text style={s.toolDesc}>{tool.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pending Leave Approvals Queue (Live Sync with Website) */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Pending Leave Approvals</Text>
          <TouchableOpacity onPress={() => onNavigate('leaveApprovals')}>
            <Text style={s.seeAllText}>Manage All ({pendingLeaves.length}) ›</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : pendingLeaves.length === 0 ? (
          <View style={s.emptyNotice}>
            <Text style={s.emptyNoticeIcon}>✓</Text>
            <Text style={s.emptyNoticeText}>All leave requests are cleared and up to date.</Text>
          </View>
        ) : (
          pendingLeaves.slice(0, 4).map((app) => (
            <View key={app.id} style={s.approvalCard}>
              <View style={s.appTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.appEmpName}>{app.employee_name || app.emp_name || app.emp_code || 'Employee'}</Text>
                  <Text style={s.appType}>
                    {app.category || app.leave_type || 'Leave'} · {app.total_days || app.days || 1} day(s)
                  </Text>
                  <Text style={s.appDates}>{app.start_date || app.from} → {app.end_date || app.to}</Text>
                </View>
                <View style={s.pendingBadge}>
                  <Text style={s.pendingBadgeText}>PENDING</Text>
                </View>
              </View>

              {app.reason ? (
                <Text style={s.appReason} numberOfLines={2}>Reason: {app.reason}</Text>
              ) : null}

              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: '#059669' }]}
                  onPress={() => handleLeaveAction(app.id, 'approve')}
                  disabled={acting === app.id}
                  activeOpacity={0.85}
                >
                  {acting === app.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.actionBtnText}>✓ Approve</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: '#dc2626' }]}
                  onPress={() => handleLeaveAction(app.id, 'reject')}
                  disabled={acting === app.id}
                  activeOpacity={0.85}
                >
                  <Text style={s.actionBtnText}>✕ Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Pending Regularizations Queue */}
        {pendingRegs.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Pending Regularizations</Text>
            </View>
            {pendingRegs.slice(0, 3).map((reg) => (
              <View key={reg.id} style={s.approvalCard}>
                <View style={s.appTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.appEmpName}>{reg.employee_name || reg.emp_name || reg.emp_code || 'Employee'}</Text>
                    <Text style={s.appType}>{reg.regularization_type || reg.type || 'Missed Punch'} · {reg.date}</Text>
                  </View>
                  <View style={s.pendingBadge}>
                    <Text style={s.pendingBadgeText}>PENDING</Text>
                  </View>
                </View>
                {reg.reason ? <Text style={s.appReason} numberOfLines={2}>Reason: {reg.reason}</Text> : null}
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#059669' }]}
                    onPress={() => handleRegAction(reg.id, 'approve')}
                    activeOpacity={0.85}
                  >
                    <Text style={s.actionBtnText}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#dc2626' }]}
                    onPress={() => handleRegAction(reg.id, 'reject')}
                    activeOpacity={0.85}
                  >
                    <Text style={s.actionBtnText}>✕ Reject</Text>
                  </TouchableOpacity>
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

  heroBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroContent: { marginBottom: 14 },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', marginRight: 5 },
  liveTagText: { fontSize: 9, fontWeight: '800', color: '#ffffff', letterSpacing: 0.8 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  heroSubtitle: { fontSize: 11, color: '#e0d5ff', marginTop: 3 },

  heroPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  heroPill: { flex: 1, alignItems: 'center' },
  heroPillLabel: { fontSize: 9, fontWeight: '700', color: '#e0d5ff', textTransform: 'uppercase' },
  heroPillVal: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  heroPillDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
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
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIcon: { fontSize: 16, fontWeight: '800' },
  kpiContent: {},
  kpiLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
  kpiVal: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  kpiSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sectionSubtitle: { fontSize: 11, color: COLORS.textMuted },
  seeAllText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toolCard: {
    width: '48.5%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toolIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toolIcon: { fontSize: 18 },
  toolLabel: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  toolDesc: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  emptyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  emptyNoticeIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    marginRight: 8,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  emptyNoticeText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  approvalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  appEmpName: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  appType: { fontSize: 11, fontWeight: '600', color: COLORS.primary, marginTop: 1 },
  appDates: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  pendingBadge: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef08a',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pendingBadgeText: { fontSize: 9, fontWeight: '800', color: '#b45309' },
  appReason: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, fontStyle: 'italic' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
});
