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

export default function ManagerDashboardScreen({ session, onNavigate, onBack }) {
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [pendingRegs, setPendingRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(null);

  const load = async () => {
    setRefreshing(true);
    try {
      const [attRes, leavesRes, regRes] = await Promise.allSettled([
        api.get('/api/v1/attendance/admin/today'),
        api.get('/api/v1/leaves/admin/all'),
        api.get('/api/v1/regularization/admin/all'),
      ]);

      if (attRes.status === 'fulfilled' && attRes.value?.data) {
        const d = attRes.value.data;
        setTeamAttendance(Array.isArray(d) ? d : []);
      }

      if (leavesRes.status === 'fulfilled' && leavesRes.value?.data) {
        const d = leavesRes.value.data;
        const list = Array.isArray(d) ? d : d?.leaves || [];
        setPendingApprovals(list.filter((l) => (l.status || '').toLowerCase() === 'pending'));
      }

      if (regRes.status === 'fulfilled' && regRes.value?.data) {
        const d = regRes.value.data;
        const list = Array.isArray(d) ? d : d?.regularizations || [];
        setPendingRegs(list.filter((r) => (r.status || '').toLowerCase() === 'pending'));
      }
    } catch (e) {
      console.warn('Error loading manager dashboard:', e);
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
      try {
        await api.post(`/api/v1/leaves/${id}/${action}`);
        Alert.alert('Success ✅', `Leave application ${action}d successfully. Synced with portal.`);
        await load();
      } catch (err2) {
        Alert.alert('Error', err2.message || 'Action failed.');
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
      Alert.alert('Error', err.message || 'Action failed.');
    } finally {
      setActing(null);
    }
  };

  const totalTeam = teamAttendance.length || 23;
  const presentCount = teamAttendance.filter((r) =>
    r.punch_in_time || (r.status || '').toLowerCase() === 'present' || (r.status || '').toLowerCase() === 'punched in'
  ).length;
  const onLeaveCount = teamAttendance.filter((r) =>
    (r.status || '').toLowerCase().includes('leave')
  ).length;
  const absentCount = Math.max(0, totalTeam - presentCount - onLeaveCount);

  const MANAGER_TOOLS = [
    { id: 'allAttendance', icon: '📍', label: 'Team Attendance', desc: 'Live punch logs', color: '#0284c7' },
    { id: 'leaveApprovals', icon: '📅', label: 'Leave Approvals', desc: `${pendingApprovals.length} requests`, color: '#059669' },
    { id: 'regularization', icon: '🔄', label: 'Regularization', desc: `${pendingRegs.length} missed punches`, color: '#dc2626' },
    { id: 'directory', icon: '👥', label: 'Team Directory', desc: 'Team member info', color: '#7445ef' },
    { id: 'tasks', icon: '📋', label: 'Daily Tasks', desc: 'Tasks & assignments', color: '#d97706' },
    { id: 'reports', icon: '📊', label: 'Team Analytics', desc: 'Monthly summaries', color: '#4f46e5' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="Manager Command Center" onBack={onBack} />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Purple Hero Header Banner (Exact match to .mp-page-header in ManagerDashboard.jsx) */}
        <View style={s.heroBanner}>
          <View style={s.heroContent}>
            <View style={s.liveTag}>
              <View style={s.liveDot} />
              <Text style={s.liveTagText}>MANAGER ROSTER · NEON DB</Text>
            </View>
            <Text style={s.heroTitle}>Manager Portal — {session?.name?.split(' ')[0] || 'Team Lead'} 👋</Text>
            <Text style={s.heroSubtitle}>
              Live oversight for {new Date().toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>

          <View style={s.heroPillsRow}>
            <View style={s.heroPill}>
              <Text style={s.heroPillLabel}>Team Size</Text>
              <Text style={s.heroPillVal}>{totalTeam}</Text>
            </View>
            <View style={s.heroPillDivider} />
            <TouchableOpacity style={s.heroPill} onPress={() => onNavigate('leaveApprovals')} activeOpacity={0.8}>
              <Text style={s.heroPillLabel}>Pending Tasks</Text>
              <Text style={[s.heroPillVal, { color: '#fef08a' }]}>{pendingApprovals.length + pendingRegs.length}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 ManagerStatCards (Matching ManagerDashboard.jsx) */}
        <View style={s.kpiGrid}>
          {/* Total Team */}
          <TouchableOpacity style={s.kpiCard} onPress={() => onNavigate('directory')} activeOpacity={0.8}>
            <View style={[s.kpiIconWrap, { backgroundColor: '#f0ebff' }]}>
              <Text style={[s.kpiIcon, { color: COLORS.primary }]}>👥</Text>
            </View>
            <View style={s.kpiContent}>
              <Text style={s.kpiLabel}>TOTAL TEAM</Text>
              <Text style={[s.kpiVal, { color: COLORS.primary }]}>{totalTeam}</Text>
              <Text style={s.kpiSub}>Active employees</Text>
            </View>
          </TouchableOpacity>

          {/* Present Today */}
          <TouchableOpacity style={s.kpiCard} onPress={() => onNavigate('allAttendance')} activeOpacity={0.8}>
            <View style={[s.kpiIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Text style={[s.kpiIcon, { color: '#059669' }]}>✓</Text>
            </View>
            <View style={s.kpiContent}>
              <Text style={s.kpiLabel}>PRESENT TODAY</Text>
              <Text style={[s.kpiVal, { color: '#059669' }]}>{presentCount}</Text>
              <Text style={s.kpiSub}>{Math.round((presentCount / (totalTeam || 1)) * 100)}% attendance</Text>
            </View>
          </TouchableOpacity>

          {/* On Leave */}
          <TouchableOpacity style={s.kpiCard} onPress={() => onNavigate('leaveApprovals')} activeOpacity={0.8}>
            <View style={[s.kpiIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Text style={[s.kpiIcon, { color: '#0284c7' }]}>✈️</Text>
            </View>
            <View style={s.kpiContent}>
              <Text style={s.kpiLabel}>ON LEAVE</Text>
              <Text style={[s.kpiVal, { color: '#0284c7' }]}>{onLeaveCount}</Text>
              <Text style={s.kpiSub}>Scheduled leaves</Text>
            </View>
          </TouchableOpacity>

          {/* Absent / Missing */}
          <TouchableOpacity style={s.kpiCard} onPress={() => onNavigate('allAttendance')} activeOpacity={0.8}>
            <View style={[s.kpiIconWrap, { backgroundColor: '#fef2f2' }]}>
              <Text style={[s.kpiIcon, { color: '#dc2626' }]}>✕</Text>
            </View>
            <View style={s.kpiContent}>
              <Text style={s.kpiLabel}>ABSENT</Text>
              <Text style={[s.kpiVal, { color: '#dc2626' }]}>{absentCount}</Text>
              <Text style={s.kpiSub}>Unrecorded</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Manager Tools Grid */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Manager Tools</Text>
          <Text style={s.sectionSubtitle}>Quick team actions</Text>
        </View>

        <View style={s.toolsGrid}>
          {MANAGER_TOOLS.map((tool) => (
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

        {/* Quick Pending Approvals Queue */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Pending Leave Approvals</Text>
          <TouchableOpacity onPress={() => onNavigate('leaveApprovals')}>
            <Text style={s.seeAllText}>View All ({pendingApprovals.length}) ›</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : pendingApprovals.length === 0 ? (
          <View style={s.emptyNotice}>
            <Text style={s.emptyNoticeIcon}>✓</Text>
            <Text style={s.emptyNoticeText}>No pending leave approvals for your team.</Text>
          </View>
        ) : (
          pendingApprovals.slice(0, 3).map((app) => (
            <View key={app.id} style={s.approvalCard}>
              <View style={s.appTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.appEmpName}>{app.employee_name || app.emp_name || app.emp_code || 'Team Member'}</Text>
                  <Text style={s.appType}>{app.category || app.leave_type || 'Leave'} · {app.total_days || app.days || 1} day(s)</Text>
                  <Text style={s.appDates}>{app.start_date || app.from} → {app.end_date || app.to}</Text>
                </View>
                <View style={s.pendingBadge}>
                  <Text style={s.pendingBadgeText}>PENDING</Text>
                </View>
              </View>
              {app.reason ? <Text style={s.appReason} numberOfLines={2}>Reason: {app.reason}</Text> : null}
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: '#059669' }]}
                  onPress={() => handleLeaveAction(app.id, 'approve')}
                  disabled={acting === app.id}
                  activeOpacity={0.85}
                >
                  <Text style={s.actionBtnText}>✓ Approve</Text>
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

        {/* Today's Punches Feed (Matching Website Live Attendance) */}
        <View style={{ marginTop: 14 }}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>Today's Team Punches</Text>
              <Text style={s.sectionSubtitle}>Live punch feed from database</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('allAttendance')}>
              <Text style={s.seeAllText}>All ({teamAttendance.length}) ›</Text>
            </TouchableOpacity>
          </View>

          {teamAttendance.slice(0, 5).map((p, i) => {
            const pStatus = (p.status || '').toLowerCase();
            const punchTime = p.check_in || p.punch_in || (p.punch_in_time ? new Date(p.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
            const isPresent = punchTime !== '—';
            const isLate = p.remark === 'Late' || pStatus === 'late';

            return (
              <View key={p.id || i} style={s.punchRowCard}>
                <View style={[s.punchAvatar, { backgroundColor: isLate ? '#fffbeb' : isPresent ? '#ecfdf5' : '#f1f5f9' }]}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isLate ? '#d97706' : isPresent ? '#059669' : '#64748b' }}>
                    {(p.employee_name || p.emp_name || p.emp_code || 'E')[0]}
                  </Text>
                </View>
                <View style={s.punchInfo}>
                  <Text style={s.punchEmpName}>{p.employee_name || p.emp_name || p.emp_code || 'Member'}</Text>
                  <Text style={s.punchEmpDept}>{p.department || 'Team'} · {isPresent ? `In at ${punchTime}` : 'Not punched yet'}</Text>
                </View>
                <View style={[s.punchStatusPill, { backgroundColor: isLate ? '#fffbeb' : isPresent ? '#ecfdf5' : '#f8fafc' }]}>
                  <Text style={[s.punchStatusText, { color: isLate ? '#d97706' : isPresent ? '#059669' : '#94a3b8' }]}>
                    {isLate ? 'Late' : isPresent ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

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

  punchRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  punchAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  punchInfo: { flex: 1 },
  punchEmpName: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  punchEmpDept: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  punchStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  punchStatusText: { fontSize: 10, fontWeight: '800' },
});
