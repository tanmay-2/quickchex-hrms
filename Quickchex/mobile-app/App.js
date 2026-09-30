import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, ActivityIndicator, TouchableOpacity,
  Text, Platform, StatusBar, Alert,
} from 'react-native';
import * as Updates from 'expo-updates';
import authService from './src/services/authService';
import { COLORS, ROLE_NAV, normalizeRole } from './src/theme/tokens';

// Auth screens
import LoginScreen from './src/screens/LoginScreen';
import OtpScreen from './src/screens/OtpScreen';

// Shared screens (all roles)
import HomeScreen from './src/screens/HomeScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import LeaveScreen from './src/screens/LeaveScreen';
import SalaryScreen from './src/screens/SalaryScreen';
import TasksScreen from './src/screens/TasksScreen';
import RegularizationScreen from './src/screens/RegularizationScreen';
import DirectoryScreen from './src/screens/DirectoryScreen';
import PoliciesScreen from './src/screens/PoliciesScreen';
import TicketsScreen from './src/screens/TicketsScreen';
import HolidaysScreen from './src/screens/HolidaysScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Role-specific screens
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import ManagerDashboardScreen from './src/screens/ManagerDashboardScreen';
import LeaveApprovalsScreen from './src/screens/LeaveApprovalsScreen';
import AllAttendanceScreen from './src/screens/AllAttendanceScreen';
import GeoLocationScreen from './src/screens/GeoLocationScreen';
import ReportsScreen from './src/screens/ReportsScreen';

// Tab screens (show bottom nav)
const TAB_SCREENS = new Set(['home', 'attendance', 'regularization', 'leaves', 'salary', 'adminDashboard', 'managerDashboard', 'teamDashboard', 'profile']);

export default function App() {
  const [session, setSession] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [authStep, setAuthStep] = useState('login'); // 'login' | 'otp'
  const [otpEmail, setOtpEmail] = useState('');
  const [currentScreen, setCurrentScreen] = useState('home');

  useEffect(() => {
    restoreSession();
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    if (__DEV__) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          '🚀 Update Available',
          'A new version with the latest features and improvements has been downloaded. Restart now to apply?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Restart Now',
              onPress: async () => {
                await Updates.reloadAsync();
              },
            },
          ]
        );
      }
    } catch (e) {
      console.warn('OTA update check error:', e);
    }
  };

  const restoreSession = async () => {
    try {
      const s = await authService.getSession();
      if (s) {
        setSession(s);
        setCurrentScreen('home');
      }
    } catch {}
    setAppLoading(false);
  };

  const handleLogin = async () => {
    const s = await authService.getSession();
    setSession(s);
    setCurrentScreen('home');
  };

  const handleOtpRequired = (email) => {
    setOtpEmail(email);
    setAuthStep('otp');
  };

  const handleOtpSuccess = async () => {
    const s = await authService.getSession();
    setSession(s);
    setCurrentScreen('home');
    setAuthStep('login');
  };

  const handleLogout = async () => {
    await authService.logout();
    setSession(null);
    setCurrentScreen('home');
    setAuthStep('login');
  };

  const navigate = (screen) => setCurrentScreen(screen);
  const goBack = () => setCurrentScreen('home');

  // ── App Loading ──
  if (appLoading) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <ActivityIndicator size="large" color={COLORS.blueLight} />
      </View>
    );
  }

  // ── Auth Flow ──
  if (!session) {
    if (authStep === 'otp') {
      return <OtpScreen email={otpEmail} onOtpSuccess={handleOtpSuccess} onBack={() => setAuthStep('login')} />;
    }
    return <LoginScreen onLoginSuccess={handleLogin} onOtpRequired={handleOtpRequired} />;
  }

  const role = normalizeRole(session.role);

  // ── Screen Renderer ──
  const renderScreen = () => {
    const shared = { session, onBack: goBack };
    const withNav = { ...shared, onNavigate: navigate };

    switch (currentScreen) {
      // ─── SHARED ───
      case 'home':         return <HomeScreen {...withNav} />;
      case 'attendance':   return <AttendanceScreen {...withNav} />;
      case 'leaves':       return <LeaveScreen {...shared} />;
      case 'salary':       return <SalaryScreen {...shared} />;
      case 'tasks':        return <TasksScreen {...shared} />;
      case 'regularization': return <RegularizationScreen {...shared} />;
      case 'directory':    return <DirectoryScreen onBack={goBack} />;
      case 'policies':     return <PoliciesScreen onBack={goBack} />;
      case 'tickets':      return <TicketsScreen {...shared} />;
      case 'holidays':     return <HolidaysScreen onBack={goBack} />;
      case 'profile':      return <ProfileScreen {...shared} onLogout={handleLogout} />;

      // ─── ADMIN ───
      case 'adminDashboard':  return <AdminDashboardScreen {...shared} onNavigate={navigate} />;
      case 'allAttendance':   return <AllAttendanceScreen {...shared} />;
      case 'geoLocation':     return <GeoLocationScreen onBack={goBack} />;
      case 'reports':         return <ReportsScreen onBack={goBack} />;

      // ─── MANAGER / TL ───
      case 'managerDashboard': return <ManagerDashboardScreen {...shared} onNavigate={navigate} />;
      case 'teamDashboard':    return <ManagerDashboardScreen {...shared} onNavigate={navigate} />;
      case 'teamAttendance':   return <AllAttendanceScreen {...shared} />;
      case 'leaveApprovals':   return <LeaveApprovalsScreen {...shared} />;

      default: return <HomeScreen {...withNav} />;
    }
  };

  // Role-based bottom tabs
  const bottomTabs = ROLE_NAV[role] || ROLE_NAV.employee;
  const isTabScreen = TAB_SCREENS.has(currentScreen);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Screen content */}
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>

      {/* Bottom Navigation */}
      {isTabScreen && (
        <View style={s.bottomBar}>
          {bottomTabs.map(tab => {
            const active = currentScreen === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={s.navItem}
                onPress={() => setCurrentScreen(tab.id)}
                activeOpacity={0.75}
              >
                {active && <View style={s.navActiveLine} />}
                <View style={[s.navIconWrap, active && s.navIconWrapActive]}>
                  <Text style={s.navEmoji}>{tab.icon}</Text>
                </View>
                <Text style={[s.navLabel, active && s.navLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 10,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  navIconWrap: {
    width: 44, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  navIconWrapActive: {
    backgroundColor: COLORS.primarySubtle,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  navEmoji: { fontSize: 18 },
  navLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 3, fontWeight: '600' },
  navLabelActive: { color: COLORS.primary, fontWeight: '800' },
  navActiveLine: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
});
