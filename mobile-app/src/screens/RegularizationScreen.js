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
  TextInput,
  Alert,
} from 'react-native';
import api from '../services/apiService';
import * as SecureStore from 'expo-secure-store';
import { COLORS, SPACING, RADII } from '../theme/tokens';
import { ScreenHeader, EmptyState, TabStrip } from '../components/ui';

const REG_TYPES = ['Late Arrival', 'Early Departure', 'Missed Punch', 'WFH'];

export default function RegularizationScreen({ session, onBack }) {
  const [tab, setTab] = useState('apply');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form
  const [regDate, setRegDate] = useState('');
  const [regType, setRegType] = useState('Late Arrival');
  const [punchIn, setPunchIn] = useState('');
  const [punchOut, setPunchOut] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/v1/attendance/regularization');
      const d = res.data;
      setRequests(Array.isArray(d) ? d : d?.regularizations || []);
    } catch (e) {
      console.warn('Error loading regularizations:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!regDate.trim() || !reason.trim()) {
      Alert.alert('Missing Info', 'Please enter the date (e.g. 2026-09-29) and reason.');
      return;
    }
    setSubmitting(true);
    try {
      const empCode = session?.empCode || await SecureStore.getItemAsync('emp_code') || 'EMP';
      const payload = {
        emp_code: empCode,
        date: regDate.trim(),
        attendanceDate: regDate.trim(),
        issue: regType,
        requestType: regType,
        regularization_type: regType,
        type: regType,
        checkIn: punchIn.trim() || '09:30 AM',
        check_in: punchIn.trim() || '09:30 AM',
        checkOut: punchOut.trim() || '06:30 PM',
        check_out: punchOut.trim() || '06:30 PM',
        punch_in: punchIn.trim() || '09:30 AM',
        punch_out: punchOut.trim() || '06:30 PM',
        reason: reason.trim(),
        comment: `${regType}: ${reason.trim()}`,
      };
      await api.post('/api/v1/attendance/regularization', payload);
      Alert.alert('Success ✅', 'Regularization request submitted! Pending manager approval.');
      setRegDate(''); setPunchIn(''); setPunchOut(''); setReason('');
      setTab('history');
      await load();
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit regularization.');
    } finally {
      setSubmitting(false);
    }
  };

  const TABS = [
    { key: 'apply', label: 'Apply Regularization' },
    { key: 'history', label: `My Requests (${requests.length})` },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="Attendance Regularization" onBack={onBack} />

      <View style={s.tabWrap}>
        <TabStrip tabs={TABS} activeTab={tab} onTabChange={setTab} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'apply' ? (
          <View style={s.formCard}>
            <Text style={s.formTitle}>Request Attendance Correction</Text>
            <Text style={s.formSub}>Submit adjustments for missed punch or timing discrepancies</Text>

            {/* Type Chips */}
            <Text style={s.fieldLabel}>Correction Type</Text>
            <View style={s.typeGrid}>
              {REG_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeChip, regType === t && s.typeChipActive]}
                  onPress={() => setRegType(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.typeChipText, regType === t && s.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Input */}
            <Text style={s.fieldLabel}>Date of Attendance</Text>
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD (e.g. 2026-09-29)"
              placeholderTextColor={COLORS.textMuted}
              value={regDate}
              onChangeText={setRegDate}
            />

            {/* Timings */}
            <View style={s.timeRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={s.fieldLabel}>Correct Punch In</Text>
                <TextInput
                  style={s.input}
                  placeholder="09:30 AM"
                  placeholderTextColor={COLORS.textMuted}
                  value={punchIn}
                  onChangeText={setPunchIn}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={s.fieldLabel}>Correct Punch Out</Text>
                <TextInput
                  style={s.input}
                  placeholder="06:30 PM"
                  placeholderTextColor={COLORS.textMuted}
                  value={punchOut}
                  onChangeText={setPunchOut}
                />
              </View>
            </View>

            {/* Reason */}
            <Text style={s.fieldLabel}>Reason for Regularization</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="Explain the reason for correction..."
              placeholderTextColor={COLORS.textMuted}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />

            {/* Submit */}
            <TouchableOpacity
              style={s.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={s.submitText}>Submit Correction Request</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : requests.length === 0 ? (
              <EmptyState icon="🔄" title="No Requests Yet" subtitle="Your regularization history will appear here." />
            ) : (
              requests.map((r, i) => {
                const status = r.status || 'Pending';
                const col = status.toLowerCase() === 'approved' ? '#059669' : status.toLowerCase() === 'rejected' ? '#dc2626' : '#d97706';

                return (
                  <View key={r.id || i} style={s.reqCard}>
                    <View style={s.reqTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.reqType}>{r.regularization_type || r.type || 'Missed Punch'}</Text>
                        <Text style={s.reqDate}>Date: {r.date}</Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: col + '15', borderColor: col + '30' }]}>
                        <Text style={[s.statusBadgeText, { color: col }]}>{status}</Text>
                      </View>
                    </View>

                    {r.punch_in || r.punch_out ? (
                      <Text style={s.reqTimes}>
                        Corrected: {r.punch_in || '—'} → {r.punch_out || '—'}
                      </Text>
                    ) : null}

                    {r.reason ? <Text style={s.reqReason}>"{r.reason}"</Text> : null}
                  </View>
                );
              })
            )}
          </View>
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

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  formSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, marginBottom: 16 },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.canvas,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: { height: 75, textAlignVertical: 'top' },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: { backgroundColor: '#f0ebff', borderColor: COLORS.primary },
  typeChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  typeChipTextActive: { color: COLORS.primary, fontWeight: '800' },

  timeRow: { flexDirection: 'row' },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  submitText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },

  reqCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reqType: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  reqDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  reqTimes: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginTop: 8 },
  reqReason: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic' },
});
