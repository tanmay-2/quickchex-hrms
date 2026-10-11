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
  Alert,
} from 'react-native';
import api from '../services/apiService';
import authService from '../services/authService';
import * as SecureStore from 'expo-secure-store';
import { COLORS, SPACING, RADII } from '../theme/tokens';
import { ScreenHeader } from '../components/ui';

export default function ProfileScreen({ session, onBack, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      let p = null;
      const empCode = session?.empCode || session?.emp_code || await SecureStore.getItemAsync('emp_code');
      const endpoints = ['/api/v1/profile/me', '/profile/me'];
      if (empCode) {
        endpoints.push(`/api/v1/profile/${empCode}`, `/profile/${empCode}`);
      }
      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          if (res.data && (res.data.emp_code || res.data.name || res.data.first_name || res.data.email)) {
            p = res.data;
            break;
          }
        } catch {}
      }
      if (p) {
        setProfile(p);
      } else if (session) {
        setProfile(session);
      }
    } catch (e) {
      console.warn('Error loading profile:', e);
      if (session) setProfile(session);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of La Esfera?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            if (onLogout) onLogout();
          },
        },
      ]
    );
  };

  const getName = () =>
    profile?.name || profile?.fullName || profile?.full_name ||
    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || session?.name || 'Employee';

  const getInitials = () => {
    const name = getName();
    return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'E';
  };

  const infoSections = profile
    ? [
        {
          title: 'Employment Information',
          icon: '💼',
          fields: [
            ['Employee ID', profile.emp_code || profile.employee_id || session?.empCode || '—'],
            ['Role', (profile.role || session?.role || 'Employee').toUpperCase()],
            ['Department', profile.department || '—'],
            ['Designation', profile.designation || '—'],
            ['Work Location', profile.location || profile.branch_location || 'Hyde Park, Mumbai'],
            ['Date of Joining', profile.joined || profile.emp_join_date || '29 Sep 2026'],
            ['Reporting Manager', profile.reporting_supervisor || profile.reportingManager || '—'],
          ],
        },
        {
          title: 'Personal & Contact Details',
          icon: '👤',
          fields: [
            ['Full Name', getName()],
            ['Work Email', profile.email || session?.email || '—'],
            ['Mobile Number', profile.phone || profile.mobile || profile.contact || profile.mobile_no || '—'],
            ['Gender', profile.personal?.Gender || profile.gender || '—'],
            ['Date of Birth', profile.personal?.['Date of Birth'] || profile.date_of_birth || '—'],
            ['Blood Group', profile.personal?.['Blood Group'] || profile.blood_group || '—'],
            ['Nationality', profile.personal?.Nationality || 'Indian'],
          ],
        },
      ]
    : [];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScreenHeader title="My Profile" onBack={onBack} />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Hero */}
        <View style={s.heroCard}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{getInitials()}</Text>
          </View>
          <Text style={s.heroName}>{getName()}</Text>
          <Text style={s.heroDesignation}>{profile?.designation || 'Employee'}</Text>
          <View style={s.badgeRow}>
            <View style={s.roleBadge}>
              <Text style={s.roleBadgeText}>{(profile?.role || session?.role || 'Employee').toUpperCase()}</Text>
            </View>
            <View style={s.idBadge}>
              <Text style={s.idBadgeText}>{profile?.emp_code || session?.empCode || 'EMP'}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
        ) : (
          infoSections.map((sec, i) => (
            <View key={i} style={s.sectionCard}>
              <View style={s.sectionTitleRow}>
                <Text style={s.sectionIcon}>{sec.icon}</Text>
                <Text style={s.sectionTitle}>{sec.title}</Text>
              </View>

              {sec.fields.map(([label, value], fi) => (
                <View key={fi} style={[s.fieldRow, fi === sec.fields.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.fieldLabel}>{label}</Text>
                  <Text style={s.fieldValue}>{value || '—'}</Text>
                </View>
              ))}
            </View>
          ))
        )}

        {/* Sign Out Button */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={s.logoutText}>🚪 Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },

  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#e0d5ff',
  },
  avatarLetter: { fontSize: 26, fontWeight: '800', color: '#ffffff' },
  heroName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  heroDesignation: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  roleBadge: { backgroundColor: '#f0ebff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  roleBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  idBadge: { backgroundColor: COLORS.canvas, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border },
  idBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 16, marginRight: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },

  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  fieldLabel: { fontSize: 12, color: COLORS.textMuted },
  fieldValue: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, maxWidth: '60%', textAlign: 'right' },

  logoutBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: { fontSize: 14, fontWeight: '800', color: '#dc2626' },
});
