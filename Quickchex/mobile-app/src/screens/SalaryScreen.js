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
} from 'react-native';
import api from '../services/apiService';
import { COLORS, SPACING, RADII } from '../theme/tokens';
import { ScreenHeader, EmptyState } from '../components/ui';

export default function SalaryScreen({ session, onBack }) {
  const [payslips, setPayslips] = useState([]);
  const [ytdSummary, setYtdSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/v1/payslips');
      const data = res.data;
      // In the backend, monthly slips are under 'slips'
      const list = Array.isArray(data) ? data : data?.slips || data?.payslips || [];
      setPayslips(list);
      if (data?.ytd_summary) {
        setYtdSummary(data.ytd_summary);
      }
    } catch (e) {
      console.warn('Error loading payslips:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatCurrency = (val) => {
    const n = parseFloat(val || 0);
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="Salary & Payslips" onBack={onBack} />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* YTD Summary Card (Exact Match to Web Payroll) */}
        {ytdSummary ? (
          <View style={s.ytdCard}>
            <Text style={s.ytdEyebrow}>FINANCIAL YEAR 2026-2027</Text>
            <Text style={s.ytdTitle}>Year-to-Date Earnings</Text>

            <View style={s.ytdRow}>
              <View style={s.ytdBox}>
                <Text style={s.ytdLabel}>Gross Paid</Text>
                <Text style={s.ytdVal}>{formatCurrency(ytdSummary.gross_earnings)}</Text>
              </View>
              <View style={s.ytdDivider} />
              <View style={s.ytdBox}>
                <Text style={s.ytdLabel}>Net Take-Home</Text>
                <Text style={[s.ytdVal, { color: COLORS.success }]}>{formatCurrency(ytdSummary.net_take_home)}</Text>
              </View>
              <View style={s.ytdDivider} />
              <View style={s.ytdBox}>
                <Text style={s.ytdLabel}>Months Paid</Text>
                <Text style={s.ytdVal}>{ytdSummary.months_paid || payslips.length}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Monthly Payslips</Text>
          <Text style={s.sectionSub}>{payslips.length} slips generated</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : payslips.length === 0 ? (
          <EmptyState
            icon="💰"
            title="No Payslips Found"
            subtitle="Your payslips will appear here once monthly payroll is processed."
          />
        ) : (
          payslips.map((slip, i) => {
            const isExp = expanded === i;
            const gross = slip.gross_pay || slip.gross_earnings || slip.gross || 0;
            const net = slip.net_pay || slip.net_salary || slip.net || (gross ? gross * 0.93 : 0);
            const deductions = slip.total_deductions || (gross ? gross - net : 0);
            const monthName = slip.month || slip.month_name || `Month ${i + 1}`;
            const yearVal = slip.year || '2026';

            return (
              <TouchableOpacity
                key={slip.id || i}
                style={s.slipCard}
                onPress={() => setExpanded(isExp ? null : i)}
                activeOpacity={0.88}
              >
                <View style={s.slipTop}>
                  <View style={s.slipMonthWrap}>
                    <Text style={s.slipIcon}>📄</Text>
                    <View style={{ marginLeft: 10 }}>
                      <Text style={s.slipMonth}>{monthName} {yearVal}</Text>
                      <Text style={s.slipSub}>Paid via Bank Transfer</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.slipNet}>{formatCurrency(net)}</Text>
                    <Text style={s.slipNetLabel}>Net Salary</Text>
                  </View>
                </View>

                {isExp && (
                  <View style={s.slipDetailWrap}>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Gross Earnings</Text>
                      <Text style={s.detailVal}>{formatCurrency(gross)}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Total Deductions (PF/Tax)</Text>
                      <Text style={[s.detailVal, { color: COLORS.danger }]}>-{formatCurrency(deductions)}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={[s.detailLabel, { fontWeight: '800', color: COLORS.textPrimary }]}>Net Disbursed</Text>
                      <Text style={[s.detailVal, { fontWeight: '800', color: COLORS.success }]}>{formatCurrency(net)}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
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

  ytdCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ytdEyebrow: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  ytdTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2, marginBottom: 14 },
  ytdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf9fd',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ytdBox: { flex: 1, alignItems: 'center' },
  ytdLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted },
  ytdVal: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  ytdDivider: { width: 1, height: 26, backgroundColor: COLORS.border },

  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  slipCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slipTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slipMonthWrap: { flexDirection: 'row', alignItems: 'center' },
  slipIcon: { fontSize: 20 },
  slipMonth: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  slipSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  slipNet: { fontSize: 15, fontWeight: '800', color: COLORS.success },
  slipNetLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 1 },

  slipDetailWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { fontSize: 11, color: COLORS.textMuted },
  detailVal: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
});
