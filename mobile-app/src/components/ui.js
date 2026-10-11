// Shared UI building blocks — used across all screens
import React from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ActivityIndicator,
  StatusBar, ScrollView, RefreshControl, Platform, TextInput,
} from 'react-native';
import { COLORS, RADII, SPACING, HEADER_TOP, TYPOGRAPHY } from '../theme/tokens';

// ─── SCREEN HEADER ────────────────────────────────────────
export function ScreenHeader({ title, onBack, rightElement }) {
  return (
    <View style={h.header}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={h.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={h.backText}>‹</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 36 }} />}
      <Text style={h.title} numberOfLines={1}>{title}</Text>
      {rightElement ? rightElement : <View style={{ width: 36 }} />}
    </View>
  );
}

const h = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingTop: HEADER_TOP, paddingBottom: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, alignItems: 'flex-start', justifyContent: 'center', height: 36 },
  backText: { color: COLORS.primary, fontSize: 28, fontWeight: '700', lineHeight: 32 },
  title: { flex: 1, ...TYPOGRAPHY.h3, textAlign: 'center', color: COLORS.textPrimary },
});

// ─── SCREEN WRAPPER WITH SAFE SCROLL ──────────────────────
export function ScreenWrapper({ children, padding = true, refreshing, onRefresh }) {
  return (
    <View style={sw.root}>
      <ScrollView
        contentContainerStyle={[sw.scroll, padding && { padding: SPACING.lg }]}
        refreshControl={
          onRefresh
            ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={COLORS.blueLight} />
            : undefined
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const sw = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1 },
});

// ─── CARD ─────────────────────────────────────────────────
export function Card({ children, style }) {
  return <View style={[card.card, style]}>{children}</View>;
}

const card = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADII.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
});

// ─── STATUS BADGE ─────────────────────────────────────────
export function StatusBadge({ label, color, bg }) {
  const c = color || COLORS.primary;
  const b = bg || c + '15';
  return (
    <View style={[sb.badge, { backgroundColor: b, borderColor: c + '30' }]}>
      <Text style={[sb.text, { color: c }]}>{label}</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADII.full, borderWidth: 1 },
  text: { fontSize: 11, fontWeight: '700' },
});

// ─── LOADING INDICATOR ─────────────────────────────────────
export function Loading() {
  return (
    <View style={ld.box}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const ld = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
});

// ─── EMPTY STATE ─────────────────────────────────────────
export function EmptyState({ icon = '📋', title, subtitle }) {
  return (
    <View style={es.box}>
      <Text style={es.icon}>{icon}</Text>
      <Text style={es.title}>{title}</Text>
      {subtitle ? <Text style={es.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const es = StyleSheet.create({
  box: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  icon: { fontSize: 52, marginBottom: 14 },
  title: { ...TYPOGRAPHY.h3, textAlign: 'center', marginBottom: 8, color: COLORS.textPrimary },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center', lineHeight: 20, color: COLORS.textMuted },
});

// ─── TAB STRIP ────────────────────────────────────────────
export function TabStrip({ tabs, active, activeTab, onChange, onTabChange }) {
  const currentActive = active !== undefined ? active : activeTab;
  const handleChange = onChange || onTabChange || (() => {});
  if (!Array.isArray(tabs)) return null;

  return (
    <View style={ts.row}>
      {tabs.map((tab, idx) => {
        let id, label;
        if (Array.isArray(tab)) {
          [id, label] = tab;
        } else if (typeof tab === 'object' && tab !== null) {
          id = tab.key !== undefined ? tab.key : (tab.id !== undefined ? tab.id : (tab.value !== undefined ? tab.value : idx));
          label = tab.label ?? tab.title ?? tab.name ?? String(id);
        } else {
          id = tab;
          label = String(tab);
        }
        const isActive = currentActive === id;
        return (
          <TouchableOpacity
            key={String(id)}
            style={[ts.tab, isActive && ts.tabActive]}
            onPress={() => handleChange(id)}
            activeOpacity={0.7}
          >
            <Text style={[ts.text, isActive && ts.textActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ts = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  text: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, fontSize: 12 },
  textActive: { color: COLORS.primary, fontWeight: '700' },
});

// ─── FORM INPUT ───────────────────────────────────────────
export function FormInput({ label, ...props }) {
  return (
    <View style={fi.group}>
      {label ? <Text style={fi.label}>{label}</Text> : null}
      <TextInput
        style={fi.input}
        placeholderTextColor={COLORS.textDim}
        {...props}
      />
    </View>
  );
}

const fi = StyleSheet.create({
  group: { marginBottom: SPACING.md },
  label: { ...TYPOGRAPHY.label, marginBottom: 6, color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.sm, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.textPrimary,
  },
});

// ─── CHIP SELECTOR ────────────────────────────────────────
export function ChipSelector({ options, value, onChange, color }) {
  const c = color || COLORS.primary;
  return (
    <View style={cs.row}>
      {options.map(opt => {
        const label = typeof opt === 'string' ? opt : opt.label;
        const val = typeof opt === 'string' ? opt : opt.value;
        const active = value === val;
        return (
          <TouchableOpacity
            key={val}
            style={[cs.chip, active && { backgroundColor: c, borderColor: c }]}
            onPress={() => onChange(val)}
          >
            <Text style={[cs.text, active && { color: '#fff' }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const cs = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  chip: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADII.full,
  },
  text: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
});

// ─── PRIMARY BUTTON ───────────────────────────────────────
export function PrimaryButton({ label, onPress, loading: l, color, icon }) {
  const c = color || COLORS.primary;
  return (
    <TouchableOpacity
      style={[pb.btn, { backgroundColor: c }, l && pb.disabled]}
      onPress={onPress}
      disabled={!!l}
      activeOpacity={0.85}
    >
      {l
        ? <ActivityIndicator color="#fff" />
        : <Text style={pb.text}>{icon ? `${icon} ${label}` : label}</Text>
      }
    </TouchableOpacity>
  );
}

const pb = StyleSheet.create({
  btn: {
    borderRadius: RADII.md, paddingVertical: 14, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  disabled: { opacity: 0.6 },
  text: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── STATS ROW ────────────────────────────────────────────
export function StatsRow({ stats }) {
  return (
    <View style={sr.row}>
      {stats.map((s, i) => (
        <View key={i} style={sr.card}>
          <Text style={[sr.num, { color: s.color || COLORS.primary }]}>{s.value ?? '—'}</Text>
          <Text style={sr.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md, gap: 8 },
  card: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADII.md,
    padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  num: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  label: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, fontWeight: '600', textAlign: 'center' },
});

// ─── SECTION TITLE ────────────────────────────────────────
export function SectionTitle({ title, style }) {
  return <Text style={[stt.text, style]}>{title}</Text>;
}

const stt = StyleSheet.create({
  text: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
});

// Helpers
export const getStatusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'active' || s === 'present' || s === 'paid') return COLORS.success;
  if (s === 'rejected' || s === 'declined' || s === 'absent' || s === 'overdue') return COLORS.danger;
  if (s === 'pending' || s === 'open' || s === 'draft') return COLORS.warning;
  if (s === 'closed' || s === 'resolved' || s === 'completed' || s === 'done') return COLORS.textMuted;
  return COLORS.blueLight;
};
