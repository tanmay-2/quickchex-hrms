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

export default function TicketsScreen({ session, onBack }) {
  const [tab, setTab] = useState('list');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('Medium');
  const [urgency, setUrgency] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  const role = (session?.role || 'employee').toLowerCase();
  const isAdmin = role === 'admin';

  const load = async () => {
    setRefreshing(true);
    try {
      const endpoint = isAdmin ? '/api/v1/tickets/all' : '/api/v1/tickets/my';
      const res = await api.get(endpoint).catch(() => api.get('/api/v1/tickets/my'));
      const d = res.data;
      setTickets(Array.isArray(d) ? d : []);
    } catch (e) {
      console.warn('Error loading tickets:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Info', 'Please provide a ticket title and description.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/v1/tickets', {
        title: title.trim(),
        description: description.trim(),
        impact,
        urgency,
      });
      Alert.alert('Ticket Submitted ✅', 'Your support ticket has been created. Synced with portal.');
      setTitle(''); setDescription('');
      setTab('list');
      await load();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const TABS = [
    { key: 'list', label: `Tickets (${tickets.length})` },
    { key: 'new', label: '+ Raise Ticket' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="IT & HR Helpdesk" onBack={onBack} />

      <View style={s.tabWrap}>
        <TabStrip tabs={TABS} activeTab={tab} onTabChange={setTab} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'new' ? (
          <View style={s.formCard}>
            <Text style={s.formTitle}>Submit Support Request</Text>
            <Text style={s.formSub}>Need help with hardware, software, or HR queries? Let us know.</Text>

            <Text style={s.fieldLabel}>Subject / Title</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. VPN Access Issue / Payroll Query"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={s.fieldLabel}>Impact</Text>
                <View style={s.chipRow}>
                  {['Low', 'Medium', 'High'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[s.chip, impact === opt && s.chipActive]}
                      onPress={() => setImpact(opt)}
                    >
                      <Text style={[s.chipText, impact === opt && s.chipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={s.fieldLabel}>Urgency</Text>
                <View style={s.chipRow}>
                  {['Low', 'Medium', 'High'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[s.chip, urgency === opt && s.chipActive]}
                      onPress={() => setUrgency(opt)}
                    >
                      <Text style={[s.chipText, urgency === opt && s.chipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={s.fieldLabel}>Description</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="Describe the issue in detail..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={s.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={s.submitText}>Submit Ticket</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : tickets.length === 0 ? (
              <EmptyState icon="🎫" title="No Tickets Found" subtitle="Tap '+ Raise Ticket' to submit an inquiry." />
            ) : (
              tickets.map((t, i) => {
                const status = t.status || 'Open';
                const col = status.toLowerCase() === 'closed' ? '#059669' : '#0284c7';

                return (
                  <View key={t.id || i} style={s.card}>
                    <View style={s.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.ticketTitle}>{t.title}</Text>
                        <Text style={s.ticketMeta}>
                          {t.priority || 'Medium'} Priority · {t.impact || 'Normal'} Impact
                        </Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: col + '15', borderColor: col + '30' }]}>
                        <Text style={[s.badgeText, { color: col }]}>{status}</Text>
                      </View>
                    </View>
                    <Text style={s.ticketDesc} numberOfLines={3}>{t.description}</Text>
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

  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6, marginTop: 10 },
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
  textArea: { height: 80, textAlignVertical: 'top' },

  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', gap: 4 },
  chip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: '#f0ebff', borderColor: COLORS.primary },
  chipText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  chipTextActive: { color: COLORS.primary, fontWeight: '800' },

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

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ticketTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  ticketMeta: { fontSize: 10, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  ticketDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 8, lineHeight: 15 },
});
