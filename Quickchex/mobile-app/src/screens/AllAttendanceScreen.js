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
} from 'react-native';
import api from '../services/apiService';
import { COLORS, SPACING, RADII } from '../theme/tokens';
import { ScreenHeader, EmptyState, getStatusColor } from '../components/ui';

export default function AllAttendanceScreen({ session, onBack }) {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/v1/attendance/admin/today');
      const d = res.data;
      const list = Array.isArray(d) ? d : [];
      setRecords(list);
      setFiltered(list);
    } catch (e) {
      console.warn('Error loading all attendance:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    let result = records;

    if (q) {
      result = result.filter((r) =>
        (r.employee_name || r.name || r.emp_name || '').toLowerCase().includes(q) ||
        (r.emp_code || r.employee_code || '').toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((r) => {
        const s = (r.status || '').toLowerCase();
        const punchIn = r.punch_in || r.checkIn || r.punch_in_time;
        if (statusFilter === 'present') return punchIn && s !== 'late';
        if (statusFilter === 'late') return r.remark === 'Late' || s === 'late';
        if (statusFilter === 'leave') return s.includes('leave');
        if (statusFilter === 'absent') return !punchIn && !s.includes('leave');
        return true;
      });
    }

    setFiltered(result);
  }, [search, records, statusFilter]);

  const presentCount = records.filter(r => r.punch_in || r.checkIn || r.punch_in_time).length;
  const leaveCount = records.filter(r => (r.status || '').toLowerCase().includes('leave')).length;
  const absentCount = Math.max(0, records.length - presentCount - leaveCount);
  const lateCount = records.filter(r => r.remark === 'Late' || (r.status || '').toLowerCase() === 'late').length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="All Attendance Logs" onBack={onBack} />

      {/* Search Input Bar */}
      <View style={s.searchBarWrap}>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search employee, ID, department..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={s.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 4 Summary Chips */}
      <View style={s.summaryChipsRow}>
        <TouchableOpacity
          style={[s.chip, statusFilter === 'all' && s.chipActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[s.chipText, statusFilter === 'all' && s.chipTextActive]}>All ({records.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.chip, statusFilter === 'present' && s.chipActive]}
          onPress={() => setStatusFilter('present')}
        >
          <Text style={[s.chipText, statusFilter === 'present' && s.chipTextActive, { color: '#059669' }]}>
            Present ({presentCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.chip, statusFilter === 'late' && s.chipActive]}
          onPress={() => setStatusFilter('late')}
        >
          <Text style={[s.chipText, statusFilter === 'late' && s.chipTextActive, { color: '#d97706' }]}>
            Late ({lateCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.chip, statusFilter === 'absent' && s.chipActive]}
          onPress={() => setStatusFilter('absent')}
        >
          <Text style={[s.chipText, statusFilter === 'absent' && s.chipTextActive, { color: '#dc2626' }]}>
            Absent ({absentCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="👥" title="No Records Found" subtitle="No employee matches the active filter." />
        ) : (
          filtered.map((r, i) => {
            const punchIn = r.punch_in || r.checkIn || (r.punch_in_time ? new Date(r.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
            const punchOut = r.punch_out || r.checkOut || (r.punch_out_time ? new Date(r.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
            const isLate = r.remark === 'Late' || (r.status || '').toLowerCase() === 'late';
            const isPresent = punchIn !== '—';
            const status = isLate ? 'Late' : isPresent ? 'Present' : (r.status || 'Absent');
            const col = getStatusColor(status);

            return (
              <View key={r.emp_code || i} style={s.card}>
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: col + '15' }]}>
                    <Text style={[s.avatarText, { color: col }]}>{(r.employee_name || r.name || r.emp_code || 'E')[0]}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.empName}>{r.employee_name || r.name || r.emp_code || 'Employee'}</Text>
                    <Text style={s.empMeta}>{r.emp_code} · {r.department || 'General'}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: col + '15', borderColor: col + '30' }]}>
                    <Text style={[s.statusBadgeText, { color: col }]}>{status}</Text>
                  </View>
                </View>

                <View style={s.timingRow}>
                  <View style={s.timingBox}>
                    <Text style={s.timingLabel}>Punch In</Text>
                    <Text style={s.timingVal}>{punchIn}</Text>
                  </View>
                  <View style={s.timingDivider} />
                  <View style={s.timingBox}>
                    <Text style={s.timingLabel}>Punch Out</Text>
                    <Text style={s.timingVal}>{punchOut}</Text>
                  </View>
                  <View style={s.timingDivider} />
                  <View style={s.timingBox}>
                    <Text style={s.timingLabel}>Total Hours</Text>
                    <Text style={s.timingVal}>{r.workingHours || r.hours || r.prodHours || '—'}</Text>
                  </View>
                </View>

                {r.location || r.punch_in_location ? (
                  <Text style={s.locText} numberOfLines={1}>
                    📍 {r.location || r.punch_in_location}
                  </Text>
                ) : null}
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
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.surface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 44,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  clearText: { fontSize: 13, color: COLORS.textMuted, paddingHorizontal: 6 },

  summaryChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: '#f0ebff',
    borderColor: COLORS.primary,
  },
  chipText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  chipTextActive: { color: COLORS.primary },

  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  empName: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  empMeta: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },

  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf9fd',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timingBox: { flex: 1, alignItems: 'center' },
  timingLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted },
  timingVal: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  timingDivider: { width: 1, height: 22, backgroundColor: COLORS.border },

  locText: { fontSize: 10, color: COLORS.textMuted, marginTop: 8 },
});
