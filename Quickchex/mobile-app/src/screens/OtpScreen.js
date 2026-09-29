import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { API_BASE_URL } from '../config/apiConfig';
import authService from '../services/authService';

const VERIFY_OTP_URL = `${API_BASE_URL}/api/v1/auth/verify-otp`;
const RESEND_OTP_URL = `${API_BASE_URL}/api/v1/auth/resend-otp`;

export default function OtpScreen({ email, onOtpSuccess, onBack }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  // Auto-focus OTP input
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleVerify = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setErrorMsg('Please enter the OTP sent to your email.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(VERIFY_OTP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, otp: cleanOtp }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg =
          data?.detail ||
          data?.message ||
          data?.error ||
          'Invalid OTP. Please try again.';
        setErrorMsg(msg);
        return;
      }

      // OTP verified — save session and navigate to dashboard
      await authService.saveSession(data);
      if (onOtpSuccess) {
        onOtpSuccess(data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMsg('');
    try {
      const response = await fetch(RESEND_OTP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMsg(data?.detail || 'Failed to resend OTP. Please try again.');
        return;
      }

      Alert.alert('OTP Sent', `A new OTP has been sent to ${email}.`);
      setOtp('');
      setTimeLeft(120);
      setCanResend(false);
      inputRef.current?.focus();
    } catch (err) {
      setErrorMsg(err.message || 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f6f6fa" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>QC</Text>
          </View>
          <Text style={styles.brandTitle}>Quickchex</Text>
        </View>

        {/* OTP Card */}
        <View style={styles.card}>
          {/* Shield Icon */}
          <View style={styles.shieldBox}>
            <Text style={styles.shieldIcon}>🛡️</Text>
          </View>

          <Text style={styles.cardTitle}>Verify Your Identity</Text>
          <Text style={styles.cardSubtitle}>
            A One-Time Password (OTP) has been sent to:
          </Text>
          <View style={styles.emailBadge}>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* OTP Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
              ref={inputRef}
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#9ca1b2"
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/\D/g, '').slice(0, 6));
                setErrorMsg('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          {/* Resend & Timer */}
          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending ? (
                  <ActivityIndicator color="#3b82f6" size="small" />
                ) : (
                  <Text style={styles.resendText}>Resend OTP</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Resend in{' '}
                <Text style={styles.timerHighlight}>{formatTime(timeLeft)}</Text>
              </Text>
            )}
          </View>

          {/* Back to Login */}
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>‹ Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Do not share your OTP with anyone.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#7445ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#7445ef',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  logoBadgeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#17182a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8ef',
    shadowColor: '#1f1845',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  shieldBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0ebff',
    borderWidth: 1,
    borderColor: '#dfd5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  shieldIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17182a',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#767b90',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  emailBadge: {
    backgroundColor: '#f0ebff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfd5ff',
    marginBottom: 20,
  },
  emailText: {
    color: '#7445ef',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#544c63',
    marginBottom: 8,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: '#fafaff',
    borderWidth: 1.5,
    borderColor: '#7445ef',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '800',
    color: '#17182a',
    letterSpacing: 8,
    width: '100%',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#7445ef',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    shadowColor: '#7445ef',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  resendRow: {
    marginBottom: 16,
    alignItems: 'center',
  },
  resendText: {
    color: '#7445ef',
    fontSize: 14,
    fontWeight: '800',
  },
  timerText: {
    color: '#767b90',
    fontSize: 13,
  },
  timerHighlight: {
    color: '#d97706',
    fontWeight: '700',
  },
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    color: '#767b90',
    fontSize: 13,
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    color: '#9ca1b2',
    fontSize: 11,
    marginTop: 20,
    fontWeight: '500',
  },
});
