import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  Platform,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { RefreshCw, ArrowLeft, Home, WifiOff } from 'lucide-react-native';
import { API_BASE_URL } from '../config/apiConfig';

// Default live web app deployment URL
export const WEB_APP_URL = 'https://quickchex-hrms.vercel.app';

export default function WebCloneScreen({ onExitClone }) {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);

  // Request native GPS permission on mount to bridge with web punch
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setGpsReady(true);
        }
      } catch (e) {
        console.warn('GPS permission error:', e);
      }
    })();
  }, []);

  // Handle Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  // Injected JavaScript: Syncs native session into web localStorage and enhances mobile viewport
  const injectedJavaScript = `
    (function() {
      // Ensure viewport meta is optimized for mobile display
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
      }
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

      // Send punch messages to native shell if needed
      window.__QUICKCHEX_MOBILE_SHELL__ = true;
      true;
    })();
  `;

  // Bridge messages between Web and React Native
  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PUNCH_SUCCESS') {
        // Live notification that punch succeeded on web
        Alert.alert('Synced ✅', 'Attendance Punch has been recorded and synced across Web & Mobile!');
      } else if (data.type === 'SAVE_TOKEN' && data.token) {
        await SecureStore.setItemAsync('token', data.token);
      }
    } catch {}
  };

  const handleReload = () => {
    setLoadError(false);
    setLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Mobile Bar with Back / Refresh Controls */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {canGoBack ? (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => webViewRef.current?.goBack()}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={20} color="#1e1b4b" />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.brandTitle}>Quickchex HRMS</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE SYNC</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleReload}
            accessibilityLabel="Refresh"
          >
            <RefreshCw size={17} color="#4f46e5" />
          </TouchableOpacity>
          {onExitClone ? (
            <TouchableOpacity
              style={styles.modeBtn}
              onPress={onExitClone}
              accessibilityLabel="Switch to Native"
            >
              <Text style={styles.modeBtnText}>Native</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Main WebView Container */}
      <View style={styles.webViewWrap}>
        <WebView
          ref={webViewRef}
          source={{ uri: WEB_APP_URL }}
          injectedJavaScript={injectedJavaScript}
          onMessage={handleMessage}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          onLoadStart={() => {
            setLoading(true);
            setLoadError(false);
          }}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setLoadError(true);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          geolocationEnabled={true}
          allowsBackForwardNavigationGestures={true}
          mixedContentMode="always"
          style={styles.webView}
        />

        {/* Loading Spinner */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Connecting to HRMS live portal...</Text>
          </View>
        )}

        {/* Offline / Error Screen */}
        {loadError && (
          <View style={styles.errorOverlay}>
            <WifiOff size={44} color="#ef4444" />
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorSubtitle}>
              Unable to load the HRMS web portal. Check your internet connection or backend server status.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleReload}>
              <RefreshCw size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e1b4b',
    letterSpacing: -0.2,
  },
  liveBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  navBtn: {
    padding: 4,
    marginRight: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#6366f1',
  },
  modeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  webViewWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 14,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
