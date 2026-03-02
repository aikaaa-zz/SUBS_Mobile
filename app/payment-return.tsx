import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, XCircle, Loader } from 'lucide-react-native';
import Header from '../components/Header';
import { paymentAPI, bookingAPI } from '../services/api';
import { storage } from '../utils/storage';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';

export default function PaymentReturnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ payment_id: string; status: string; id: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const paymentId = params.payment_id || params.id;
      if (!paymentId) {
        setStatus('failed');
        setMessage('Payment ID not found');
        return;
      }

      const verification = await paymentAPI.getPaymentStatus(paymentId);

      if (verification?.payment?.status === 'paid') {
        const pendingBooking = await storage.getPendingBooking();
        if (!pendingBooking) {
          setStatus('failed');
          setMessage('Booking data not found. Please contact support.');
          return;
        }

        pendingBooking.paymentId = paymentId;
        pendingBooking.paymentStatus = 'paid';
        pendingBooking.status = 'confirmed';

        const bookingResponse = await bookingAPI.createBooking(pendingBooking);

        if (bookingResponse) {
          const existing = await storage.getLocalBookings();
          existing.push(bookingResponse.booking || bookingResponse.data || bookingResponse);
          await storage.setLocalBookings(existing);
          await storage.clearPendingBooking();
          setStatus('success');
          setMessage('Your booking has been confirmed!');
        } else {
          setStatus('failed');
          setMessage('Failed to create booking. Please contact support.');
        }
      } else {
        setStatus('failed');
        setMessage(verification?.message || 'Payment was not successful');
      }
    } catch (error: any) {
      setStatus('failed');
      setMessage(error.message || 'An error occurred while processing your payment');
    }
  };

  const handleContinue = () => {
    if (status === 'success') {
      router.replace('/(tabs)/bookings');
    } else {
      router.replace('/(tabs)/explore');
    }
  };

  return (
    <View style={styles.page}>
      <Header title="Payment Status" />
      <View style={styles.content}>
        <View style={styles.card}>
          {status === 'loading' && (
            <View style={styles.statusContainer}>
              <ActivityIndicator size={64} color={Colors.primaryOrange} />
              <Text style={styles.statusTitle}>Verifying Payment</Text>
              <Text style={styles.statusDesc}>Please wait while we confirm your payment...</Text>
            </View>
          )}

          {status === 'success' && (
            <View style={styles.statusContainer}>
              <View style={styles.successIcon}>
                <CheckCircle size={64} color={Colors.successGreen} />
              </View>
              <Text style={styles.statusTitle}>Payment Successful!</Text>
              <Text style={styles.statusDesc}>{message}</Text>
              <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
                <Text style={styles.continueBtnText}>View My Bookings</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'failed' && (
            <View style={styles.statusContainer}>
              <View style={styles.failedIcon}>
                <XCircle size={64} color={Colors.errorRed} />
              </View>
              <Text style={styles.statusTitle}>Payment Failed</Text>
              <Text style={styles.statusDesc}>{message}</Text>
              <TouchableOpacity style={[styles.continueBtn, { backgroundColor: Colors.textMuted }]} onPress={handleContinue}>
                <Text style={styles.continueBtnText}>Back to Explore</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgLight },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.xl, padding: 32, ...Shadows.lg },
  statusContainer: { alignItems: 'center' },
  successIcon: { marginBottom: 16 },
  failedIcon: { marginBottom: 16 },
  statusTitle: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.textDark, marginBottom: 8, textAlign: 'center' },
  statusDesc: { fontSize: FontSize.lg, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  continueBtn: { backgroundColor: Colors.primaryOrange, paddingHorizontal: 32, paddingVertical: 14, borderRadius: BorderRadius.md },
  continueBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
});
