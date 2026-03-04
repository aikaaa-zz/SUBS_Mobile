import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Header from '../components/Header';
import { Colors, FontSize, FontWeight } from '../constants/theme';
import { API_BASE_URL } from '../constants/api';
import { storage } from '../utils/storage';

const PAYMENT_TIMEOUT_SECONDS = 10 * 60; // 10 minutes

export default function PaymentWebViewScreen() {
  const { checkoutUrl, paymentId } = useLocalSearchParams<{ checkoutUrl: string; paymentId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(PAYMENT_TIMEOUT_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTimeout = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      await storage.clearPendingBooking();
    } catch {}
    Alert.alert(
      'Payment Timed Out',
      'Your payment session has expired. The booking has been cancelled. Please try again.',
      [{ text: 'OK', onPress: () => router.replace('/(tabs)/explore') }],
    );
  }, [router]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [handleTimeout]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNavigationChange = (navState: any) => {
    const { url } = navState;
    // Intercept redirect back from GCash to our API server's payment-return URL
    if (url.includes('payment-return') && url.includes(API_BASE_URL)) {
      try {
        const urlObj = new URL(url);
        const returnPaymentId = urlObj.searchParams.get('paymentId') || urlObj.searchParams.get('payment_id') || paymentId;
        const status = urlObj.searchParams.get('status') || 'completed';

        router.replace({
          pathname: '/payment-return',
          params: { payment_id: returnPaymentId || '', status },
        });
        return false;
      } catch {
        // URL parsing failed, let the WebView continue
      }
    }
    return true;
  };

  // On web, WebView is not supported — open the checkout URL in a new browser tab
  // and navigate directly to payment-return
  useEffect(() => {
    if (Platform.OS === 'web' && checkoutUrl) {
      // Open GCash checkout in a new browser tab
      window.open(checkoutUrl, '_blank');
      setLoading(false);
    }
  }, [checkoutUrl]);

  if (!checkoutUrl) {
    return (
      <View style={styles.page}>
        <Header title="Payment" showBack />
        <View style={styles.center}>
          <Text style={styles.errorText}>No checkout URL provided</Text>
        </View>
      </View>
    );
  }

  // On web, show instructions since WebView is not available
  if (Platform.OS === 'web') {
    return (
      <View style={styles.page}>
        <Header title="GCash Payment" showBack />
        <View style={styles.timerBar}>
          <Text style={[styles.timerText, timeRemaining <= 60 && styles.timerTextUrgent]}>
            Time remaining: {formatTime(timeRemaining)}
          </Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.webTitle}>Payment Opened in New Tab</Text>
          <Text style={styles.webMessage}>
            A new browser tab has been opened for GCash payment. Complete the payment there, then come back and tap the button below.
          </Text>
          <View style={{ marginTop: 24, gap: 12, width: '100%', paddingHorizontal: 40 }}>
            <Text
              style={styles.webLink}
              onPress={() => {
                window.open(checkoutUrl, '_blank');
              }}
            >
              Open Payment Page Again
            </Text>
            <Text
              style={styles.webButton}
              onPress={() => {
                router.replace({
                  pathname: '/payment-return',
                  params: { payment_id: paymentId || '', status: 'success' },
                });
              }}
            >
              I've Completed Payment
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // On native (iOS/Android), use WebView
  const WebView = require('react-native-webview').WebView;

  return (
    <View style={styles.page}>
      <Header title="GCash Payment" showBack />
      <View style={styles.timerBar}>
        <Text style={[styles.timerText, timeRemaining <= 60 && styles.timerTextUrgent]}>
          Time remaining: {formatTime(timeRemaining)}
        </Text>
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primaryOrange} />
          <Text style={styles.loadingText}>Loading payment page...</Text>
        </View>
      )}
      <WebView
        source={{ uri: checkoutUrl }}
        onLoadEnd={() => setLoading(false)}
        onShouldStartLoadWithRequest={(request: any) => handleNavigationChange(request)}
        onNavigationStateChange={handleNavigationChange}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgWhite },
  timerBar: { backgroundColor: '#f0f4f8', paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  timerText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#334155' },
  timerTextUrgent: { color: '#dc2626' },
  webview: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: FontSize.lg, color: Colors.textMuted },
  loadingOverlay: {
    position: 'absolute', top: 100, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgWhite, zIndex: 10,
  },
  loadingText: { marginTop: 12, fontSize: FontSize.md, color: Colors.textMuted },
  webTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark, marginBottom: 12, textAlign: 'center' },
  webMessage: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  webLink: { fontSize: FontSize.md, color: Colors.primaryOrange, fontWeight: FontWeight.semibold, textAlign: 'center', paddingVertical: 12 },
  webButton: {
    fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white,
    backgroundColor: Colors.primaryOrange, textAlign: 'center',
    paddingVertical: 14, borderRadius: 12, overflow: 'hidden',
  },
});
