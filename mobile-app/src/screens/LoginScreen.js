import React, { useState, useEffect, useMemo } from 'react';
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
import authService from '../services/authService';
import { API_BASE_URL } from '../config/apiConfig';

export default function LoginScreen({ onLoginSuccess, onOtpRequired }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dynamicGreeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return 'Good Morning ☀️';
    if (h < 17) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  }, [now]);

  const formattedTime = useMemo(() =>
    now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    [now]);

  const formattedDate = useMemo(() =>
    now.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }),
    [now]);

  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: '', general: '' }));
  };

  const handleLogin = async () => {
    // Per-field validation
    const newErrors = { email: '', password: '', general: '' };
    let failed = false;

    if (!email.trim()) {
      newErrors.email = 'Email or Employee ID is required.';
      failed = true;
    }
    if (!password) {
      newErrors.password = 'Password is required.';
      failed = true;
    }
    if (failed) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({ email: '', password: '', general: '' });

    try {
      const result = await authService.login(email.trim(), password);

      if (result.needs_otp) {
        if (onOtpRequired) onOtpRequired(result.email);
      } else {
        if (onLoginSuccess) onLoginSuccess(result.data);
      }
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setErrors(prev => ({ ...prev, general: msg }));
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrors(prev => ({ ...prev, email: 'Please enter your work email or Employee ID for SSO.' }));
      return;
    }

    setSsoLoading(true);
    setErrors({ email: '', password: '', general: '' });

    try {
      // Try SSO OTP send
      let res;
      try {
        res = await fetch(`${API_BASE_URL}/api/v1/auth/sso/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
      } catch {
        res = null;
      }

      if (!res || !res.ok) {
        // Fallback to resend-otp
        res = await fetch(`${API_BASE_URL}/api/v1/auth/resend-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.detail || data?.message || 'SSO request failed.';
        setErrors(prev => ({ ...prev, general: msg }));
        return;
      }

      if (onOtpRequired) onOtpRequired(cleanEmail);
    } catch (err) {
      setErrors(prev => ({ ...prev, general: err.message || 'Unable to complete SSO request.' }));
    } finally {
      setSsoLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Enter your registered work email to receive a password reset link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Link',
          onPress: async () => {
            const cleanEmail = email.trim();
            if (!cleanEmail) {
              Alert.alert('Error', 'Please enter your email first.');
              return;
            }
            try {
              const res = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail }),
              });
              if (res.ok) {
                Alert.alert('Email Sent ✅', `A password reset link has been sent to ${cleanEmail}. Check your inbox.`);
              } else {
                const data = await res.json().catch(() => ({}));
                Alert.alert('Error', data?.detail || 'Could not send reset email.');
              }
            } catch {
              Alert.alert('Error', 'Unable to connect to server. Please check your internet connection.');
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f6f6fa" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ── Top Brand Section ── */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>LE</Text>
          </View>
          <Text style={styles.brandTitle}>La Esfera</Text>
          <Text style={styles.brandSubtitle}>HR Management System</Text>

          {/* Live Clock */}
          <View style={styles.clockCard}>
            <Text style={styles.clockGreeting}>{dynamicGreeting}</Text>
            <Text style={styles.clockTime}>{formattedTime}</Text>
            <Text style={styles.clockDate}>{formattedDate}</Text>
          </View>

          <View style={styles.backendBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.backendText}>Connected · Secure & Encrypted</Text>
          </View>
        </View>

        {/* ── Login Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in to your workspace</Text>
          <Text style={styles.cardSubtitle}>Your attendance, leave and workday — all in one place.</Text>

          {/* Purple accent divider */}
          <View style={styles.accentDivider} />

          {/* General Error */}
          {errors.general ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>!</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Authentication failed</Text>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            </View>
          ) : null}

          {/* Email / Employee ID Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Work email or Employee ID</Text>
            <View style={[styles.inputWrap, errors.email ? styles.inputWrapError : null]}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                placeholder="name@company.com or EMP001"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={(text) => { setEmail(text); clearError('email'); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="next"
              />
              {email.trim() && !errors.email ? (
                <Text style={styles.validTick}>✓</Text>
              ) : null}
            </View>
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordHeader}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputWrap, errors.password ? styles.inputWrapError : null]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={(text) => { setPassword(text); clearError('password'); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
          </View>

          {/* Remember Me */}
          <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
              {rememberMe ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.rememberText}>Remember me on this device</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || ssoLoading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign In →</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* SSO / OTP Login */}
          <TouchableOpacity
            style={[styles.ssoButton, ssoLoading && styles.buttonDisabled]}
            onPress={handleSSOLogin}
            disabled={loading || ssoLoading}
            activeOpacity={0.8}
          >
            {ssoLoading ? (
              <ActivityIndicator color="#7445ef" />
            ) : (
              <Text style={styles.ssoButtonText}>🔐 Sign in with OTP (SSO)</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>La Esfera Mobile Portal v1.0 · Secure & Encrypted</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 32,
  },

  // Brand
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#7445ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#7445ef',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoBadgeText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#17182a',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#767b90',
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Clock
  clockCard: {
    backgroundColor: '#7445ef',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
    width: '100%',
  },
  clockGreeting: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  clockTime: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  clockDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    fontWeight: '500',
  },

  backendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ebff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dfd5ff',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#059669',
    marginRight: 6,
  },
  backendText: {
    fontSize: 11,
    color: '#7445ef',
    fontWeight: '700',
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e8e8ef',
    shadowColor: '#1f1845',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17182a',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#767b90',
    marginBottom: 16,
    lineHeight: 18,
  },

  accentDivider: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#7445ef',
    width: 40,
    marginBottom: 16,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  errorIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dc2626',
    width: 22,
    height: 22,
    textAlign: 'center',
    lineHeight: 22,
    backgroundColor: '#fecaca',
    borderRadius: 11,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 2,
  },
  fieldError: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },

  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#544c63',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafaff',
    borderWidth: 1.5,
    borderColor: '#e8e8ef',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  inputWrapError: {
    borderColor: '#dc2626',
    backgroundColor: '#fff8f8',
  },
  inputIcon: {
    fontSize: 15,
    marginRight: 10,
    color: '#544c63',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#17182a',
    paddingVertical: 12,
  },
  validTick: {
    fontSize: 15,
    color: '#059669',
    fontWeight: '800',
    marginLeft: 6,
  },

  // Password
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  toggleText: {
    fontSize: 12,
    color: '#7445ef',
    fontWeight: '700',
    marginLeft: 8,
  },
  forgotText: {
    fontSize: 12,
    color: '#7445ef',
    fontWeight: '700',
  },

  // Remember Me
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#dfd5ff',
    backgroundColor: '#f8f5ff',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#7445ef',
    borderColor: '#7445ef',
  },
  checkmark: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '800',
  },
  rememberText: {
    fontSize: 13,
    color: '#544c63',
    fontWeight: '500',
  },

  // Buttons
  button: {
    backgroundColor: '#7445ef',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#7445ef',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e8e8ef',
  },
  dividerText: {
    fontSize: 12,
    color: '#9ca1b2',
    fontWeight: '600',
    marginHorizontal: 12,
  },

  ssoButton: {
    backgroundColor: '#f0ebff',
    borderWidth: 1.5,
    borderColor: '#dfd5ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ssoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7445ef',
  },

  footerNote: {
    textAlign: 'center',
    color: '#9ca1b2',
    fontSize: 11,
    marginTop: 20,
    fontWeight: '500',
  },
});
