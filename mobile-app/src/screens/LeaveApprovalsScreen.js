import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import api from '../services/apiService';
import { COLORS, SPACING, RADII } from '../theme/tokens';
import { ScreenHeader, EmptyState, TabStrip, getStatusColor } from '../components/ui';

export default function LeaveApprovalsScreen({ session, onBack }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [acting, setActing] = useState(null);

  const load = async () => {
    setRefreshing(true);
    try {
      let list = [];
      const endpoints = ['/api/v1/leaves/admin/all', '/api/v1/manager/leaves', '/api/v1/leave/applications'];
      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          const d = res.data;
          list = Array.isArray(d) ? d : d?.leaves || d?.applications || [];
          if (list.length > 0) break;
        } catch {}
      }
      setApplications(list);
    } catch (e) {
      console.warn('Error loading leave approvals:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id, action) => {
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

  const filtered = applications.filter((app) => {
    const s = (app.status || 'pending').toLowerCase();
    if (filter === 'all') return true;
    return s === filter;
  });

  const TABS = [
    { key: 'pending', label: `Pending (${applications.filter(a => (a.status || 'pending').toLowerCase() === 'pending').length})` },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="Leave Approvals" onBack={onBack} />

      <View style={s.tabWrap}>
        <TabStrip tabs={TABS} activeTab={filter} onTabChange={setFilter} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📋"
            title={`No ${filter} requests`}
            subtitle={filter === 'pending' ? 'All leave applications have been reviewed.' : 'No items match this filter.'}
          />
        ) : (
          filtered.map((app, i) => {
            const status = app.status || 'Pending';
            const col = getStatusColor(status);
            const isPending = status.toLowerCase() === 'pending';

            return (
              <View key={app.id || i} style={s.card}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.empName}>{app.employee_name || app.emp_name || app.emp_code || 'Employee'}</Text>
                    <Text style={s.cardType}>
                      {app.category || app.leave_type || app.type || 'Leave'} · {app.total_days || app.days || 1} day(s)
                    </Text>
                    <Text style={s.cardDates}>{app.start_date || app.from} → {app.end_date || app.to}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: col + '15', borderColor: col + '30' }]}>
                    <Text style={[s.badgeText, { color: col }]}>{status}</Text>
                  </View>
                </View>

                {app.reason ? (
                  <Text style={s.cardReason}>Reason: {app.reason}</Text>
                ) : null}

                {isPending && (
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: '#059669' }]}
                      onPress={() => handleAction(app.id, 'approve')}
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
                      onPress={() => handleAction(app.id, 'reject')}
                      disabled={acting === app.id}
                      activeOpacity={0.85}
                    >
                      <Text style={s.actionBtnText}>✕ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
  tabWrap: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  empName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  cardType: { fontSize: 11, fontWeight: '600', color: COLORS.primary, marginTop: 1 },
  cardDates: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  cardReason: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, fontStyle: 'italic' },

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
