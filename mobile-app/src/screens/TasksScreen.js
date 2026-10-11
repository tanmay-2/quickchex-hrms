import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import api from '../services/apiService';

const TASK_STATUS_COLORS = {
  completed: '#10b981', done: '#10b981',
  'in progress': '#3b82f6', pending: '#f59e0b',
  overdue: '#ef4444', cancelled: '#6b7280',
};

export default function TasksScreen({ session, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all | pending | completed

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/v1/tasks');
      const d = res.data;
      const list = Array.isArray(d) ? d : d?.tasks || d?.data || [];
      setTasks(list);
    } catch (e) {
      // tasks endpoint may differ
      try {
        const res2 = await api.get('/api/v1/daily-tasks');
        const d = res2.data;
        setTasks(Array.isArray(d) ? d : d?.tasks || []);
      } catch {}
    }
    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.patch(`/api/v1/tasks/${taskId}`, { status: newStatus });
      load();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update task status.');
    }
  };

  const filtered = filter === 'all' ? tasks
    : filter === 'completed' ? tasks.filter(t => ['completed', 'done'].includes((t.status || '').toLowerCase()))
    : tasks.filter(t => !['completed', 'done'].includes((t.status || '').toLowerCase()));

  const getStatusColor = (status) => {
    return TASK_STATUS_COLORS[(status || '').toLowerCase()] || '#94a3b8';
  };

  const priorityColor = (p) => {
    if ((p || '').toLowerCase() === 'high') return '#ef4444';
    if ((p || '').toLowerCase() === 'medium') return '#f59e0b';
    return '#10b981';
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Daily Tasks</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter Tabs */}
      <View style={s.tabs}>
        {[['all', 'All'], ['pending', 'Pending'], ['completed', 'Completed']].map(([id, label]) => (
          <TouchableOpacity key={id} style={[s.tab, filter === id && s.tabActive]} onPress={() => setFilter(id)}>
            <Text style={[s.tabText, filter === id && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#3b82f6" />}
      >
        {loading && <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />}

        {!loading && filtered.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>✅</Text>
            <Text style={s.emptyTitle}>No Tasks</Text>
            <Text style={s.emptySubtitle}>No {filter !== 'all' ? filter : ''} tasks found.</Text>
          </View>
        )}

        {filtered.map((task, i) => {
          const status = task.status || 'Pending';
          const isDone = ['completed', 'done'].includes(status.toLowerCase());

          return (
            <View key={i} style={s.taskCard}>
              <View style={s.taskHeader}>
                <View style={s.taskTitleRow}>
                  <TouchableOpacity
                    style={[s.checkbox, isDone && s.checkboxDone]}
                    onPress={() => updateTaskStatus(task.id, isDone ? 'Pending' : 'Completed')}
                  >
                    {isDone && <Text style={s.checkmark}>✓</Text>}
                  </TouchableOpacity>
                  <Text style={[s.taskTitle, isDone && s.taskTitleDone]} numberOfLines={2}>
                    {task.title || task.task_name || task.name || 'Task'}
                  </Text>
                </View>
                <View style={s.taskBadges}>
                  {task.priority && (
                    <View style={[s.priorityBadge, { backgroundColor: priorityColor(task.priority) + '22' }]}>
                      <Text style={[s.priorityText, { color: priorityColor(task.priority) }]}>
                        {task.priority}
                      </Text>
                    </View>
                  )}
                  <View style={[s.statusBadge, { backgroundColor: getStatusColor(status) + '22' }]}>
                    <Text style={[s.statusText, { color: getStatusColor(status) }]}>{status}</Text>
                  </View>
                </View>
              </View>

              {task.description && (
                <Text style={s.taskDesc} numberOfLines={2}>{task.description}</Text>
              )}

              <View style={s.taskMeta}>
                {task.due_date && <Text style={s.metaText}>📅 Due: {task.due_date}</Text>}
                {task.assigned_by && <Text style={s.metaText}>👤 By: {task.assigned_by}</Text>}
                {task.project && <Text style={s.metaText}>📁 {task.project}</Text>}
              </View>
            </View>
          );
        })}

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
  tabs: { flexDirection: 'row', backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  tabTextActive: { color: '#3b82f6' },
  scroll: { padding: 20 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#64748b' },
  taskCard: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  taskHeader: { marginBottom: 8 },
  taskTitleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#334155',
    alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1, flexShrink: 0,
  },
  checkboxDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  taskTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#f8fafc', lineHeight: 20 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#64748b' },
  taskBadges: { flexDirection: 'row', gap: 6 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },
  taskDesc: { fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 17 },
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaText: { fontSize: 11, color: '#64748b' },
});
