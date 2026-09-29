import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl,
  StatusBar, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import api from '../services/apiService';
import { COLORS, RADII, SPACING, HEADER_TOP, getLeaveCount } from '../theme/tokens';

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Privilege Leave', 'Comp Off'];

export default function LeaveScreen({ session, onBack }) {
  const [tab, setTab] = useState('balance'); // 'balance' | 'apply' | 'history'
  const [balance, setBalance] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Apply form state
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const [balRes, appRes] = await Promise.allSettled([
        api.get('/api/v1/leave/balance'),
        api.get('/api/v1/leave/applications'),
      ]);
      if (balRes.status === 'fulfilled') setBalance(balRes.value.data);
      if (appRes.status === 'fulfilled') {
        const d = appRes.value.data;
        setApplications(Array.isArray(d) ? d : d?.applications || []);
      }
    } catch {}
    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApply = async () => {
    if (!startDate || !endDate || !reason.trim()) {
      Alert.alert('Missing Info', 'Please fill in all fields (leave type, start/end date, reason).');
      return;
    }
    setSubmitting(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end - start;
      const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
      await api.post('/api/v1/leaves/apply', {
        category: leaveType, type: leaveType,
        start_date: startDate, end_date: endDate,
        from: startDate, to: endDate,
        total_days: days, days: String(days),
        reason: reason.trim(),
      });
      Alert.alert('Success', 'Leave application submitted for approval.');
      setStartDate(''); setEndDate(''); setReason('');
      setTab('history');
      load();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit leave.');
    }
    setSubmitting(false);
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return '#10b981';
    if (s === 'rejected' || s === 'declined') return '#ef4444';
    return '#f59e0b';
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Leave Management</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {[['balance', '📊 Balance'], ['apply', '➕ Apply'], ['history', '📋 History']].map(([id, label]) => (
          <TouchableOpacity key={id} style={[s.tab, tab === id && s.tabActive]} onPress={() => setTab(id)}>
            <Text style={[s.tabText, tab === id && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} /> : null}

        {/* Balance Tab */}
        {tab === 'balance' && balance && (
          <View>
            <Text style={s.sectionTitle}>Your Leave Balances</Text>
            {[
              ['Casual Leave', getLeaveCount(balance.casualLeave ?? balance.casual_leave ?? balance.casual, 12), '#0284c7'],
              ['Sick Leave', getLeaveCount(balance.sickLeave ?? balance.sick_leave ?? balance.sick, 6), COLORS.success],
              ['Privilege Leave', getLeaveCount(balance.privilegeLeave ?? balance.privilege_leave ?? balance.privilege ?? balance.optionalHoliday ?? balance.optional, 15), COLORS.primary],
              ['Comp Off', getLeaveCount(balance.compOff ?? balance.comp_off ?? balance.compoff, 0), COLORS.warning],
            ].map(([label, value, color]) => (
              <View key={label} style={s.balanceCard}>
                <View>
                  <Text style={s.balanceLabel}>{label}</Text>
                  <Text style={s.balanceSub}>Available days</Text>
                </View>
                <View style={[s.balanceBadge, { backgroundColor: color + '18' }]}>
                  <Text style={[s.balanceNum, { color }]}>{String(value)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Apply Tab */}
        {tab === 'apply' && (
          <View>
            <Text style={s.sectionTitle}>Apply for Leave</Text>

            <Text style={s.formLabel}>Leave Type</Text>
            <View style={s.typeRow}>
              {LEAVE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeChip, leaveType === t && s.typeChipActive]}
                  onPress={() => setLeaveType(t)}
                >
                  <Text style={[s.typeChipText, leaveType === t && s.typeChipTextActive]}>
                    {t.replace(' Leave', '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.formLabel}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={s.formInput}
              placeholder="e.g. 2026-10-01"
              placeholderTextColor={COLORS.textDim}
              value={startDate}
              onChangeText={setStartDate}
            />

            <Text style={s.formLabel}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={s.formInput}
              placeholder="e.g. 2026-10-03"
              placeholderTextColor={COLORS.textDim}
              value={endDate}
              onChangeText={setEndDate}
            />

            <Text style={s.formLabel}>Reason</Text>
            <TextInput
              style={[s.formInput, s.textArea]}
              placeholder="Explain the reason for your leave..."
              placeholderTextColor={COLORS.textDim}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleApply}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Submit Leave Application</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* History Tab */}
        {tab === 'history' && (
          <View>
            <Text style={s.sectionTitle}>My Leave Applications</Text>
            {applications.length === 0 && !loading && (
              <Text style={s.emptyText}>No leave applications found.</Text>
            )}
            {applications.map((app, i) => (
              <View key={i} style={s.appCard}>
                <View style={s.appCardHeader}>
                  <Text style={s.appType}>{app.category || app.type || 'Leave'}</Text>
                  <View style={[s.appStatusBadge, { backgroundColor: getStatusColor(app.status) + '18' }]}>
                    <Text style={[s.appStatus, { color: getStatusColor(app.status) }]}>
                      {app.status || 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text style={s.appDates}>
                  {app.start_date || app.from || app.from_date} → {app.end_date || app.to || app.to_date}
                </Text>
                <Text style={s.appDays}>{app.total_days || app.days || 1} day(s)</Text>
                {app.reason && <Text style={s.appReason} numberOfLines={2}>{app.reason}</Text>}
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
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: HEADER_TOP, paddingBottom: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  backBtnText: { color: COLORS.primary, fontSize: 26, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  scroll: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 14 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 32, fontSize: 14 },
  // Balance
  balanceCard: {
    backgroundColor: COLORS.surface, borderRadius: RADII.md, padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  balanceLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  balanceSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  balanceBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  balanceNum: { fontSize: 22, fontWeight: '900' },
  // Apply
  formLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  formInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.sm, padding: 12, color: COLORS.textPrimary, fontSize: 14, marginBottom: 14,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 8 },
  typeChip: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADII.full,
  },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  typeChipTextActive: { color: '#ffffff', fontWeight: '700' },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADII.md, paddingVertical: 14,
    alignItems: 'center', marginTop: 6,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  // History
  appCard: {
    backgroundColor: COLORS.surface, borderRadius: RADII.md, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  appCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  appType: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  appStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADII.full },
  appStatus: { fontSize: 11, fontWeight: '700' },
  appDates: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  appDays: { fontSize: 12, color: COLORS.textMuted },
  appReason: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, fontStyle: 'italic' },
});
