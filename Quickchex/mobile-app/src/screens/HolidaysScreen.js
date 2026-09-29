import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import api from '../services/apiService';
import { COLORS, SPACING, RADII } from '../theme/tokens';
import { ScreenHeader, EmptyState } from '../components/ui';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HolidaysScreen({ onBack }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date();

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/v1/leave/holidays');
      const d = res.data;
      const list = Array.isArray(d) ? d : d?.holidays || [];
      list.sort((a, b) => new Date(a.date) - new Date(b.date));
      setHolidays(list);
    } catch (e) {
      console.warn('Error loading holidays:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isPast = (dateStr) => new Date(dateStr) < today;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="Official Holidays 2026" onBack={onBack} />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.countRow}>
          <Text style={s.countText}>Company Holiday Calendar · 2026</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : holidays.length === 0 ? (
          <EmptyState icon="🎉" title="No Holidays Found" subtitle="Official holiday calendar will appear here." />
        ) : (
          holidays.map((h, i) => {
            const dateObj = new Date(h.date);
            const past = isPast(h.date);

            return (
              <View key={h.id || i} style={[s.card, past && s.cardPast]}>
                <View style={[s.dateBadge, past && s.dateBadgePast]}>
                  <Text style={[s.dateDay, past && { color: COLORS.textMuted }]}>{dateObj.getDate() || '—'}</Text>
                  <Text style={[s.dateMonth, past && { color: COLORS.textMuted }]}>{MONTHS[dateObj.getMonth()] || ''}</Text>
                </View>

                <View style={s.cardBody}>
                  <Text style={[s.cardName, past && { color: COLORS.textMuted }]}>{h.name}</Text>
                  <Text style={s.cardWeekday}>{h.day || dateObj.toLocaleDateString([], { weekday: 'long' })}</Text>
                </View>

                <View style={[s.typeBadge, { backgroundColor: h.type === 'National' ? '#ecfdf5' : '#f0ebff' }]}>
                  <Text style={[s.typeBadgeText, { color: h.type === 'National' ? '#059669' : COLORS.primary }]}>
                    {h.type || 'Gazetted'}
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
  countRow: { marginBottom: 12 },
  countText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardPast: { opacity: 0.65 },

  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0ebff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dateBadgePast: { backgroundColor: '#f1f5f9' },
  dateDay: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  dateMonth: { fontSize: 10, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase' },

  cardBody: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  cardWeekday: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
});
