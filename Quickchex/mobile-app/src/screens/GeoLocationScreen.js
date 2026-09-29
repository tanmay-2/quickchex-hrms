import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, TextInput, Alert, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, RADII } from '../theme/tokens';
import { ScreenHeader, Loading, EmptyState, SectionTitle, PrimaryButton } from '../components/ui';
import api from '../services/apiService';

export default function GeoLocationScreen({ onBack }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('list');

  // Form
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const endpoints = ['/api/v1/locations/geo-master', '/locations/geo-master'];
      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          const d = res.data;
          const list = Array.isArray(d) ? d : d?.locations || d?.data || [];
          if (list.length > 0) {
            setLocations(list);
            break;
          }
        } catch {}
      }
    } catch {}
    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name.trim() || !latitude || !longitude) {
      Alert.alert('Missing Info', 'Please provide name, latitude and longitude.'); return;
    }
    setSubmitting(true);
    try {
      const radKm = (parseFloat(radius) || 100) / 1000;
      await api.post('/api/v1/locations/geo-master', {
        name: name.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius_km: radKm,
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'Active',
      });
      Alert.alert('Success ✅', 'Geo-fence location added to database.');
      setName(''); setLatitude(''); setLongitude(''); setRadius('100');
      setTab('list'); load();
    } catch (err) { Alert.alert('Error', err.message || 'Failed to add location.'); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    Alert.alert('Delete', 'Remove this geo-fence location?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/v1/locations/geo-master/${id}`);
          load();
        } catch (err) {
          Alert.alert('Error', err.message || 'Failed to delete.');
        }
      }},
    ]);
  };

  return (
    <View style={s.root}>
      <ScreenHeader title="Geo-fence Locations" onBack={onBack} />
      <View style={s.tabs}>
        {[['list', '📍 Locations'], ['add', '➕ Add Location']].map(([id, label]) => (
          <TouchableOpacity key={id} style={[s.tab, tab === id && s.tabActive]} onPress={() => setTab(id)}>
            <Text style={[s.tabText, tab === id && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.blueLight} />}>
        {tab === 'list' && (
          <>
            {loading && <Loading />}
            {!loading && locations.length === 0 && <EmptyState icon="🗺️" title="No Locations" subtitle="Add geo-fence locations for attendance verification." />}
            {locations.map((loc, i) => (
              <View key={i} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.locIcon}><Text style={{ fontSize: 20 }}>📍</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.locName}>{loc.name || loc.location_name || `Location ${i + 1}`}</Text>
                    <Text style={s.locCoords}>Lat: {loc.latitude} · Long: {loc.longitude}</Text>
                    <Text style={s.locRadius}>Radius: {loc.radius || 100}m</Text>
                  </View>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(loc.id)}>
                    <Text style={s.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
        {tab === 'add' && (
          <View>
            <SectionTitle title="Add Geo-fence Location" />
            {[
              ['Location Name', name, setName, 'e.g. Head Office'],
              ['Latitude', latitude, setLatitude, 'e.g. 19.0760'],
              ['Longitude', longitude, setLongitude, 'e.g. 72.8777'],
              ['Radius (meters)', radius, setRadius, 'e.g. 100'],
            ].map(([label, val, setter, ph]) => (
              <View key={label} style={s.inputGroup}>
                <Text style={s.inputLabel}>{label}</Text>
                <TextInput style={s.input} placeholder={ph} placeholderTextColor={COLORS.textDim}
                  value={val} onChangeText={setter} keyboardType={label.includes('Lat') || label.includes('Long') || label.includes('Radius') ? 'decimal-pad' : 'default'} />
              </View>
            ))}
            <PrimaryButton label="Add Location" onPress={handleAdd} loading={submitting} icon="📍" color="#7c3aed" />
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.blueLight },
  tabText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.blueLight },
  scroll: { padding: SPACING.lg },
  card: { backgroundColor: COLORS.surface, borderRadius: RADII.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  locIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#7c3aed22', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  locName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  locCoords: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  locRadius: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 18 },
  inputGroup: { marginBottom: SPACING.md },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 6 },
  input: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADII.sm, padding: 12, color: COLORS.textPrimary, fontSize: 14 },
});
