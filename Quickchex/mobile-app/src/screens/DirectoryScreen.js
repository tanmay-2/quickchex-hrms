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
import { ScreenHeader, EmptyState } from '../components/ui';

export default function DirectoryScreen({ onBack }) {
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setRefreshing(true);
    try {
      let list = [];
      const endpoints = [
        '/api/v1/profile/employees/',
        '/api/v1/profile/employees',
        '/profile/employees/',
        '/profile/employees',
        '/api/v1/employees/',
        '/api/v1/admin/users',
      ];
      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          const d = res.data;
          list = Array.isArray(d) ? d : d?.employees || d?.data || [];
          if (list.length > 0) break;
        } catch {}
      }
      setEmployees(list);
      setFiltered(list);
    } catch (e) {
      console.warn('Error loading employees:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(employees);
      return;
    }
    setFiltered(
      employees.filter((e) =>
        (e.name || e.full_name || e.employee_name || `${e.first_name || ''} ${e.last_name || ''}`).toLowerCase().includes(q) ||
        (e.emp_code || e.employee_id || '').toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q)
      )
    );
  }, [search, employees]);

  const getName = (e) =>
    e.name || e.full_name || e.employee_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Employee';

  const getInitials = (e) => {
    const n = getName(e);
    return n.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'E';
  };

  const AVATAR_COLORS = ['#7445ef', '#0284c7', '#059669', '#d97706', '#dc2626', '#4f46e5'];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="Employee Directory" onBack={onBack} />

      {/* Search Bar */}
      <View style={s.searchBarWrap}>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, ID, department..."
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

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.countRow}>
          <Text style={s.countText}>{filtered.length} employees</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="👥" title="No Employees Found" subtitle="Try adjusting your search criteria." />
        ) : (
          filtered.map((emp, i) => {
            const isExp = expanded === i;
            const name = getName(emp);
            const initials = getInitials(emp);
            const avatarBg = AVATAR_COLORS[i % AVATAR_COLORS.length];

            return (
              <TouchableOpacity
                key={emp.emp_code || emp.id || i}
                style={s.empCard}
                onPress={() => setExpanded(isExp ? null : i)}
                activeOpacity={0.88}
              >
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: avatarBg + '18' }]}>
                    <Text style={[s.avatarText, { color: avatarBg }]}>{initials}</Text>
                  </View>
                  <View style={s.empInfo}>
                    <Text style={s.empName}>{name}</Text>
                    <Text style={s.empDesignation}>{emp.designation || 'Staff Member'}</Text>
                    <Text style={s.empDept}>{emp.emp_code} · {emp.department || 'General'}</Text>
                  </View>
                  <Text style={s.chevron}>{isExp ? '▲' : '▼'}</Text>
                </View>

                {isExp && (
                  <View style={s.expandedWrap}>
                    {emp.email ? (
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Email</Text>
                        <Text style={s.detailVal}>{emp.email}</Text>
                      </View>
                    ) : null}
                    {emp.phone || emp.mobile_no || emp.contact ? (
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Mobile</Text>
                        <Text style={s.detailVal}>{emp.phone || emp.mobile_no || emp.contact}</Text>
                      </View>
                    ) : null}
                    {emp.branch_location || emp.location ? (
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Location</Text>
                        <Text style={s.detailVal}>{emp.branch_location || emp.location}</Text>
                      </View>
                    ) : null}
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Role</Text>
                      <Text style={[s.detailVal, { color: COLORS.primary, fontWeight: '800' }]}>
                        {(emp.role || 'Employee').toUpperCase()}
                      </Text>
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
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 42,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  clearText: { fontSize: 13, color: COLORS.textMuted, paddingHorizontal: 6 },

  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },
  countRow: { marginBottom: 10 },
  countText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

  empCard: {
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
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  empInfo: { flex: 1, marginLeft: 12 },
  empName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  empDesignation: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  empDept: { fontSize: 10, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  chevron: { fontSize: 11, color: COLORS.textMuted, marginLeft: 8 },

  expandedWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { fontSize: 11, color: COLORS.textMuted },
  detailVal: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
});
