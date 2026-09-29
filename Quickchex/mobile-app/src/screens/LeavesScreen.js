import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import attendanceService from '../services/attendanceService';
import api from '../services/apiService';
import { API_ENDPOINTS } from '../config/apiConfig';
import { getLeaveCount } from '../theme/tokens';

export default function LeavesScreen({ onBack }) {
  const [balance, setBalance] = useState({ casual: 12, sick: 6, privilege: 15 });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave');

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getLeaveBalance();
      if (data) setBalance(data);
    } catch {
      // Keep default
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const handleApply = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please enter a reason for your leave request.');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.post(API_ENDPOINTS.LEAVE_APPLY, {
        category: leaveType,
        type: leaveType,
        start_date: today,
        end_date: today,
        total_days: 1,
        reason: reason.trim(),
      });
      Alert.alert('Leave Submitted', 'Your leave request has been submitted for manager approval.');
      setReason('');
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Could not submit leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Balance Cards */}
        <Text style={styles.sectionTitle}>Your Leave Balances</Text>
        <View style={styles.cardsRow}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>
              {getLeaveCount(balance?.casualLeave ?? balance?.casual_leave ?? balance?.casual, 12)}
            </Text>
            <Text style={styles.balanceLabel}>Casual Leaves</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>
              {getLeaveCount(balance?.sickLeave ?? balance?.sick_leave ?? balance?.sick, 6)}
            </Text>
            <Text style={styles.balanceLabel}>Sick Leaves</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>
              {getLeaveCount(balance?.privilegeLeave ?? balance?.privilege_leave ?? balance?.privilege ?? balance?.optionalHoliday ?? balance?.optional, 15)}
            </Text>
            <Text style={styles.balanceLabel}>Privilege Leaves</Text>
          </View>
        </View>

        {/* Quick Leave Application */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Request Leave</Text>

          <Text style={styles.inputLabel}>Leave Type</Text>
          <View style={styles.typeSelector}>
            {['Casual Leave', 'Sick Leave', 'Privilege Leave'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, leaveType === type && styles.typeBtnActive]}
                onPress={() => setLeaveType(type)}
              >
                <Text style={[styles.typeBtnText, leaveType === type && styles.typeBtnTextActive]}>
                  {type.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Reason / Remarks</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Explain why you are requesting leave..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleApply}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Leave Request</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backBtnText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  balanceCard: {
    flex: 0.31,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  balanceNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#38bdf8',
  },
  balanceLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeBtn: {
    flex: 0.31,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  typeBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#ffffff',
  },
  textArea: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    color: '#f8fafc',
    fontSize: 14,
    textAlignVertical: 'top',
    height: 100,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
