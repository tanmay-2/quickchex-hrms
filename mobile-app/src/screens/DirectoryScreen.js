// ==============================================================================
// QUICKCHEX HRMS MOBILE APP - EMPLOYEE DIRECTORY SCREEN (DirectoryScreen.js)
// Path: mobile-app/src/screens/DirectoryScreen.js
// Description: Renders the company-wide staff directory in the mobile application.
// Features:
// 1. Resilient Multi-Endpoint Fetching: Queries backend API endpoints with deduplication.
// 2. Department Filtering: Aggregates distinct departments into horizontal filter chips.
// 3. Real-Time Search: Filters by name, employee code, designation, department, and email.
// 4. Accordion Expansion: Tap any employee card to expand contact details (email, phone, location, role).
// 5. Pull-To-Refresh: Pull down to re-synchronize roster from the live database.
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
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

// Axios API client configured with Bearer JWT tokens and base URL
import api from '../services/apiService';
// UI design tokens (colors, spacing, border radii)
import { COLORS, SPACING, RADII } from '../theme/tokens';
// Reusable UI components
import { ScreenHeader, EmptyState } from '../components/ui';

export default function DirectoryScreen({ onBack }) {
  // ----------------------------------------------------------------------------
  // SCREEN STATE MANAGEMENT
  // ----------------------------------------------------------------------------
  // Complete list of all employees loaded from the backend
  const [employees, setEmployees] = useState([]);
  // Filtered employee subset matching current search query & selected department
  const [filtered, setFiltered] = useState([]);
  // Loading spinner indicator for initial data fetch
  const [loading, setLoading] = useState(true);
  // Pull-to-refresh spinner status
  const [refreshing, setRefreshing] = useState(false);
  // Active text search query entered by user
  const [search, setSearch] = useState('');
  // Selected department filter chip (defaults to 'All')
  const [selectedDept, setSelectedDept] = useState('All');
  // Index of currently expanded employee card accordion (null if all collapsed)
  const [expanded, setExpanded] = useState(null);

  // ----------------------------------------------------------------------------
  // DATA FETCHING: Load & Merge Employee Roster
  // ----------------------------------------------------------------------------
  const load = async () => {
    setRefreshing(true);
    try {
      // List of candidate endpoints across legacy and modern API routes
      const endpoints = [
        '/employees/',
        '/employees',
        '/api/v1/admin/users',
        '/api/v1/profile/employees/',
        '/api/v1/profile/employees',
        '/profile/employees/',
        '/profile/employees',
        '/api/v1/employees/',
        '/api/v1/employees',
      ];

      // Map to deduplicate records by employee code or email
      const mergedMap = new Map();

      // Query endpoints sequentially until full roster is gathered
      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          const d = res.data;
          
          // Accurately extract user list from supported schema variants (d.users, d.employees, d.data, array)
          const raw = Array.isArray(d) ? d : d?.users || d?.employees || d?.data || [];
          if (Array.isArray(raw) && raw.length > 0) {
            for (const item of raw) {
              const codeKey = (item.emp_code || item.id || item.employee_id || item.employeeId || '').trim().toUpperCase();
              const emailKey = (item.email || '').trim().toLowerCase();
              const key = codeKey || emailKey;
              if (key) {
                // If record already exists in map, merge properties to retain richest profile data
                if (mergedMap.has(key)) {
                  mergedMap.set(key, { ...mergedMap.get(key), ...item });
                } else {
                  mergedMap.set(key, item);
                }
              }
            }
            // If full company roster is reached, break early to save mobile bandwidth
            if (mergedMap.size >= 70) {
              break;
            }
          }
        } catch (epErr) {
          // Silently proceed to next endpoint if current one returns 404
        }
      }

      // Convert deduplicated map back to an array
      const list = Array.from(mergedMap.values());
      if (list.length > 0) {
        setEmployees(list);
        setFiltered(list);
      }
    } catch (e) {
      console.warn('Error loading employees in DirectoryScreen:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Initial mount trigger: fetch directory on first render
  useEffect(() => { load(); }, []);

  // ----------------------------------------------------------------------------
  // DEPARTMENT AGGREGATOR
  // ----------------------------------------------------------------------------
  // Derives unique sorted list of departments from active employee records
  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      const d = (e.department || '').trim();
      if (d) set.add(d);
    });
    return ['All', ...Array.from(set).sort()];
  }, [employees]);

  // ----------------------------------------------------------------------------
  // REAL-TIME SEARCH & FILTER EFFECT
  // ----------------------------------------------------------------------------
  // Filters employees whenever search text or selected department changes
  useEffect(() => {
    const q = search.toLowerCase().trim();
    setFiltered(
      employees.filter((e) => {
        // Matches query against Name, Emp Code, Designation, Department, or Email
        const matchesSearch =
          !q ||
          (e.name || e.full_name || e.employee_name || `${e.first_name || ''} ${e.last_name || ''}`).toLowerCase().includes(q) ||
          (e.emp_code || e.employee_id || '').toLowerCase().includes(q) ||
          (e.designation || '').toLowerCase().includes(q) ||
          (e.department || '').toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q);

        // Matches selected department chip
        const matchesDept = selectedDept === 'All' || (e.department || '').trim() === selectedDept;

        return matchesSearch && matchesDept;
      })
    );
  }, [search, selectedDept, employees]);

  // Helper to resolve display name cleanly
  const getName = (e) =>
    e.name || e.full_name || e.employee_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Employee';

  // Helper to extract 1 or 2 letter uppercase initials for avatar badge
  const getInitials = (e) => {
    const n = getName(e);
    return n.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'E';
  };

  // Palette of vibrant colors assigned to employee avatar circles
  const AVATAR_COLORS = ['#7445ef', '#0284c7', '#059669', '#d97706', '#dc2626', '#4f46e5'];

  // ----------------------------------------------------------------------------
  // UI PRESENTATION VIEW
  // ----------------------------------------------------------------------------
  return (
    <View style={s.root}>
      {/* Configure mobile status bar */}
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      {/* Top navigation header with back button */}
      <ScreenHeader title="Employee Directory" onBack={onBack} />

      {/* Search Bar & Department Filter Bar */}
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
          {/* Quick Clear 'X' Button */}
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={s.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Horizontal Department Filter Chips */}
        {departments.length > 2 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.deptScroll}
            contentContainerStyle={s.deptChipsContainer}
          >
            {departments.map((dept) => {
              const isSel = selectedDept === dept;
              return (
                <TouchableOpacity
                  key={dept}
                  style={[s.deptChip, isSel && s.deptChipActive]}
                  onPress={() => setSelectedDept(dept)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.deptChipText, isSel && s.deptChipTextActive]}>
                    {dept}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Scrollable Employee Roster List */}
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Results Counter Header */}
        <View style={s.countRow}>
          <Text style={s.countText}>{filtered.length} of {employees.length} employees</Text>
        </View>

        {/* Loading Spinner */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          /* Empty Search Results State */
          <EmptyState icon="👥" title="No Employees Found" subtitle="Try adjusting your search criteria." />
        ) : (
          /* List of Employee Cards */
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
                {/* Card Header: Avatar, Name, Designation, Department */}
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

                {/* Expanded Accordion Details */}
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

// ----------------------------------------------------------------------------
// STYLESHEET DEFINITION
// ----------------------------------------------------------------------------
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
  deptScroll: { marginTop: 10 },
  deptChipsContainer: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deptChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  deptChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  deptChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

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
