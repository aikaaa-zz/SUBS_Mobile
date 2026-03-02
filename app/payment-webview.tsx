import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import Header from '../components/Header';
import { Colors, FontSize, FontWeight } from '../constants/theme';

export default function PaymentWebViewScreen() {
  const { checkoutUrl, paymentId } = useLocalSearchParams<{ checkoutUrl: string; paymentId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const handleNavigationChange = (navState: any) => {
    const { url } = navState;
    // Intercept redirect back to our app
    if (url.includes('payment-return') || url.includes('subs-mobile://')) {
      // Extract params from URL
      const urlObj = new URL(url.replace('subs-mobile://', 'https://app/'));
      const returnPaymentId = urlObj.searchParams.get('payment_id') || urlObj.searchParams.get('id') || paymentId;
      const status = urlObj.searchParams.get('status') || 'completed';

      router.replace({
        pathname: '/payment-return',
        params: { payment_id: returnPaymentId || '', status },
      });
      return false;
    }
    return true;
  };

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

  return (
    <View style={styles.page}>
      <Header title="GCash Payment" showBack />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primaryOrange} />
          <Text style={styles.loadingText}>Loading payment page...</Text>
        </View>
      )}
      <WebView
        source={{ uri: checkoutUrl }}
        onLoadEnd={() => setLoading(false)}
        onShouldStartLoadWithRequest={(request) => handleNavigationChange(request)}
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
  webview: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: FontSize.lg, color: Colors.textMuted },
  loadingOverlay: {
    position: 'absolute', top: 100, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgWhite, zIndex: 10,
  },
  loadingText: { marginTop: 12, fontSize: FontSize.md, color: Colors.textMuted },
});
