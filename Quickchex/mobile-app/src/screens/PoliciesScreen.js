import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator, Linking, Alert,
} from 'react-native';
import api from '../services/apiService';
import { API_BASE_URL } from '../config/apiConfig';

export default function PoliciesScreen({ onBack }) {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setRefreshing(true);
    try {
      const endpoints = ['/policies/', '/policies', '/api/v1/policies', '/api/v1/admin/policies', '/api/v1/company-policies'];
      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          const d = res.data;
          const list = Array.isArray(d) ? d : d?.policies || d?.data || [];
          if (list.length > 0) { setPolicies(list); break; }
        } catch {}
      }
    } catch {}
    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openFile = async (policy) => {
    try {
      const fileUrl = policy.file_url || policy.document_url || policy.url || policy.path;
      if (!fileUrl) {
        Alert.alert('No Document', 'No file attached to this policy.');
        return;
      }
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) await Linking.openURL(fullUrl);
      else Alert.alert('Cannot Open', 'Cannot open this file on your device.');
    } catch (err) {
      Alert.alert('Error', 'Could not open the policy document.');
    }
  };

  const POLICY_ICONS = {
    'hr': '👔', 'leave': '📅', 'attendance': '📍', 'salary': '💰',
    'work': '💼', 'code': '📜', 'conduct': '📜', 'holiday': '🏖️',
    'travel': '✈️', 'security': '🛡️', 'it': '💻', 'general': '📋',
  };

  const getPolicyIcon = (policy) => {
    const title = (policy.title || policy.name || '').toLowerCase();
    for (const [key, icon] of Object.entries(POLICY_ICONS)) {
      if (title.includes(key)) return icon;
    }
    return '📋';
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Company Policies</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#3b82f6" />}
      >
        {loading && <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />}

        {!loading && policies.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>No Policies Found</Text>
            <Text style={s.emptySubtitle}>Company policies will appear here when published.</Text>
          </View>
        )}

        {policies.map((policy, i) => (
          <TouchableOpacity key={i} style={s.card} onPress={() => openFile(policy)} activeOpacity={0.85}>
            <View style={s.cardRow}>
              <View style={s.iconBox}>
                <Text style={s.iconEmoji}>{getPolicyIcon(policy)}</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={s.cardTitle}>{policy.title || policy.name || 'Policy Document'}</Text>
                {policy.description && (
                  <Text style={s.cardDesc} numberOfLines={2}>{policy.description}</Text>
                )}
                {policy.created_at && (
                  <Text style={s.cardDate}>📅 {new Date(policy.created_at).toLocaleDateString()}</Text>
                )}
              </View>
              <View style={s.downloadIcon}>
                <Text style={s.downloadText}>📄</Text>
              </View>
            </View>
            <View style={s.openBtn}>
              <Text style={s.openBtnText}>Open Document</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  backBtn: { width: 36 },
  backBtnText: { color: '#60a5fa', fontSize: 24, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  scroll: { padding: 20 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', maxWidth: 260 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#334155',
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#4f46e522',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  iconEmoji: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#94a3b8', lineHeight: 17, marginBottom: 4 },
  cardDate: { fontSize: 11, color: '#64748b' },
  downloadIcon: { padding: 4 },
  downloadText: { fontSize: 20 },
  openBtn: {
    marginTop: 10, backgroundColor: '#4f46e522', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#4f46e544',
  },
  openBtnText: { color: '#818cf8', fontSize: 13, fontWeight: '600' },
});
