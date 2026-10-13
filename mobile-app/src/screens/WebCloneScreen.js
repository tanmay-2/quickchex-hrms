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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { RefreshCw, WifiOff } from 'lucide-react-native';
import { API_BASE_URL } from '../config/apiConfig';

// Default live web app deployment URL
export const WEB_APP_URL = 'https://quickchex-hrms.vercel.app';

export default function WebCloneScreen({ onExitClone }) {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
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
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#09081a" translucent={false} />

      {/* Main WebView Container */}
      <View style={styles.webViewWrap}>
        <WebView
          ref={webViewRef}
          source={{ uri: WEB_APP_URL }}
          injectedJavaScript={injectedJavaScript}
          injectedJavaScriptBeforeContentLoaded={`
            window.__QUICKCHEX_MOBILE_SHELL__ = true;
            window.isNativeMobileApp = true;
            true;
          `}
          onMessage={handleMessage}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          onLoadStart={() => setLoadError(false)}
          onError={() => setLoadError(true)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
          geolocationEnabled={true}
          allowsBackForwardNavigationGestures={true}
          pullToRefreshEnabled={true}
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          mixedContentMode="always"
          style={styles.webView}
        />

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
    backgroundColor: '#09081a',
  },
  webViewWrap: {
    flex: 1,
    backgroundColor: '#09081a',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
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
