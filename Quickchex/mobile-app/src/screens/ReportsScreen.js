import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, Alert, Share } from 'react-native';
import { COLORS, SPACING, RADII } from '../theme/tokens';
import { ScreenHeader, Loading, EmptyState, SectionTitle } from '../components/ui';
import api from '../services/apiService';

const REPORT_TYPES = [
  { id: 'attendance', label: 'Attendance Summary', icon: '📍', color: '#2563eb' },
  { id: 'leave', label: 'Leave Report', icon: '📅', color: '#7c3aed' },
  { id: 'payroll', label: 'Payroll Report', icon: '💰', color: '#059669' },
  { id: 'headcount', label: 'Headcount Report', icon: '👥', color: '#0891b2' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

export default function ReportsScreen({ onBack }) {
  const [reportType, setReportType] = useState('attendance');
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    setData(null);
    try {
      const res = await api.get(`/api/v1/reports/${reportType}?month=${month}&year=${year}`);
      setData(res.data);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not generate report.');
    }
    setLoading(false);
  };

  const renderReport = () => {
    if (!data) return null;
    const rows = Array.isArray(data) ? data : data?.report || data?.data || [];
    if (rows.length === 0) return <EmptyState icon="📊" title="No Data" subtitle={`No ${reportType} data for ${month} ${year}`} />;
    return rows.map((row, i) => (
      <View key={i} style={s.dataRow}>
        {Object.entries(row).slice(0, 4).map(([key, val]) => (
          <View key={key} style={s.dataCell}>
            <Text style={s.dataCellLabel}>{key.replace(/_/g, ' ')}</Text>
            <Text style={s.dataCellValue} numberOfLines={1}>{String(val ?? '—')}</Text>
          </View>
        ))}
      </View>
    ));
  };

  return (
    <View style={s.root}>
      <ScreenHeader title="Reports" onBack={onBack} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Report Type" />
        <View style={s.typeGrid}>
          {REPORT_TYPES.map(t => (
            <TouchableOpacity key={t.id} style={[s.typeCard, reportType === t.id && { borderColor: t.color }]} onPress={() => setReportType(t.id)} activeOpacity={0.8}>
              <View style={[s.typeIcon, { backgroundColor: t.color + '22' }]}>
                <Text style={{ fontSize: 22 }}>{t.icon}</Text>
              </View>
              <Text style={[s.typeLabel, reportType === t.id && { color: t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle title="Period" />
        <View style={s.periodRow}>
          <View style={s.periodGroup}>
            <Text style={s.periodLabel}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {MONTHS.map(m => (
                <TouchableOpacity key={m} style={[s.chip, month === m && s.chipActive]} onPress={() => setMonth(m)}>
                  <Text style={[s.chipText, month === m && s.chipTextActive]}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={s.periodGroup}>
            <Text style={s.periodLabel}>Year</Text>
            <View style={s.yearRow}>
              {YEARS.map(y => (
                <TouchableOpacity key={y} style={[s.chip, year === y && s.chipActive]} onPress={() => setYear(y)}>
                  <Text style={[s.chipText, year === y && s.chipTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity style={s.generateBtn} onPress={generateReport} disabled={loading} activeOpacity={0.85}>
          {loading ? null : <Text style={s.generateBtnText}>📊 Generate Report</Text>}
          {loading && <Text style={s.generateBtnText}>⏳ Generating...</Text>}
        </TouchableOpacity>

        {data && (
          <>
            <SectionTitle title={`Results: ${month} ${year}`} />
            {renderReport()}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  typeCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: RADII.md,
    padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
  },
  typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  typeLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  periodRow: { marginBottom: SPACING.md },
  periodGroup: { marginBottom: SPACING.sm },
  periodLabel: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8 },
  chipScroll: { flexDirection: 'row' },
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADII.full, marginRight: 6,
  },
  chipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blueLight },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  generateBtn: {
    backgroundColor: COLORS.blue, borderRadius: RADII.sm,
    paddingVertical: 14, alignItems: 'center', marginBottom: SPACING.lg,
  },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dataRow: {
    backgroundColor: COLORS.surface, borderRadius: RADII.md, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', flexWrap: 'wrap',
  },
  dataCell: { width: '50%', marginBottom: 8 },
  dataCellLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textTransform: 'capitalize' },
  dataCellValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500', marginTop: 1 },
});
