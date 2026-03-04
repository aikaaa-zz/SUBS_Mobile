import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock, User, Mail, Phone, FileText, Send, CheckCircle, X } from 'lucide-react-native';
import Header from '../../components/Header';
import LoadingSpinner from '../../components/LoadingSpinner';
import { websiteAPI, bookingAPI, otpAPI, paymentAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { storage } from '../../utils/storage';
import { trackPageView, trackBookingSubmission } from '../../utils/analyticsTracker';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { API_BASE_URL } from '../../constants/api';

export default function BookingPortalScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const [website, setWebsite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [service, setService] = useState('');
  const [servicePrice, setServicePrice] = useState(0);
  const [personnelId, setPersonnelId] = useState('');
  const [personnelName, setPersonnelName] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date());
  const [bookingTime, setBookingTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // OTP
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  useEffect(() => {
    if (session) {
      setCustomerName(`${session.firstName} ${session.lastName}`);
      setCustomerEmail(session.email || '');
    }
    loadWebsite();
  }, [slug, session]);

  useEffect(() => {
    if (otpResendTimer > 0) {
      const timer = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendTimer]);

  const loadWebsite = async () => {
    try {
      setLoading(true);
      const response = await websiteAPI.getWebsiteBySlug(slug!);
      const data = response.website || response.data || response;
      setWebsite(data);
      if (data) await trackPageView(data._id, data.ownerId, data.businessId, { slug });
    } catch (error) {
      console.error('Error loading website:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (svc: any) => {
    let numericPrice = 0;
    if (svc.price) {
      numericPrice = parseFloat(svc.price.toString().replace(/[₱,]/g, '')) || 0;
    }
    setService(svc.name);
    setServicePrice(numericPrice);
  };

  const handlePersonnelSelect = (person: any) => {
    setPersonnelId(person.id || person._id);
    setPersonnelName(person.name);
  };

  const REQUIRE_OTP = true;

  const checkAvailability = async (): Promise<boolean> => {
    const dateStr = bookingDate.toISOString().split('T')[0];
    const timeStr = bookingTime.toTimeString().slice(0, 5);
    try {
      setCheckingAvailability(true);
      const response = await bookingAPI.getBusinessBookings(website.businessId);
      const existingBookings = response.bookings || response.data || response || [];
      const conflict = existingBookings.find((b: any) => {
        if (b.status === 'cancelled') return false;
        const sameDate = b.date === dateStr;
        const sameTime = b.time === timeStr;
        const sameStaff = personnelId ? (b.personnelId === personnelId) : false;
        return sameDate && sameTime && sameStaff;
      });
      if (conflict) {
        Alert.alert(
          'Time Slot Unavailable',
          `${personnelName || 'The selected staff member'} already has a booking at ${timeStr} on ${dateStr}. Please choose a different time or staff member.`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Availability check failed, proceeding anyway:', error);
      return true;
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async () => {
    if (!customerName || !customerEmail || !customerPhone || !service) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }
    const available = await checkAvailability();
    if (!available) return;
    if (REQUIRE_OTP) {
      await sendOtp();
    } else {
      await proceedToPayment();
    }
  };

  const sendOtp = async () => {
    setOtpSending(true);
    setOtpError('');
    try {
      await otpAPI.sendOtp({ email: customerEmail, purpose: 'booking' });
      setShowOtpModal(true);
      setOtpResendTimer(60);
    } catch (error: any) {
      Alert.alert('OTP Error', error.message || 'Failed to send OTP');
      setOtpError(error.message || 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async () => {
    const otpString = otpCode.join('');
    if (otpString.length !== 6) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }
    setOtpVerifying(true);
    setOtpError('');
    try {
      await otpAPI.verifyOtp({ email: customerEmail, otp: otpString, purpose: 'booking' });
      await proceedToPayment();
    } catch {
      setOtpError('Invalid OTP code. Please try again.');
      setOtpVerifying(false);
    }
  };

  const proceedToPayment = async () => {
    try {
      await trackBookingSubmission(website._id, website.ownerId, website.businessId, { service });
      const dateStr = bookingDate.toISOString().split('T')[0];
      const timeStr = bookingTime.toTimeString().slice(0, 5);
      const numericPrice = parseFloat(String(servicePrice)) || 0;

      const formData = {
        customerName, customerEmail, customerPhone,
        service, servicePrice: numericPrice,
        personnelId, personnelName,
        date: dateStr, time: timeStr, notes,
      };

      if (numericPrice > 0) {
        const pendingBookingData = {
          websiteId: website._id, businessId: website.businessId,
          customerId: session!.userId, businessName: website.name,
          category: website.templateCategory, ...formData,
          status: 'pending', paymentStatus: 'pending',
        };
        await storage.setPendingBooking(pendingBookingData);

        const paymentData = {
          userId: session!.userId, amount: numericPrice,
          customerEmail, customerName,
          redirectUrl: `${API_BASE_URL}/payment-return`,
          metadata: { service, date: dateStr, time: timeStr, businessName: website.name },
        };
        const paymentResponse = await paymentAPI.createGCashPayment(paymentData);

        if (paymentResponse.success && paymentResponse.payment?.checkoutUrl) {
          setShowOtpModal(false);
          setOtpCode(['', '', '', '', '', '']);
          setOtpVerifying(false);
          router.push({
            pathname: '/payment-webview',
            params: {
              checkoutUrl: paymentResponse.payment.checkoutUrl,
              paymentId: paymentResponse.payment.id || paymentResponse.payment._id,
            },
          });
        } else {
          throw new Error(paymentResponse.message || 'Failed to create payment');
        }
      } else {
        const bookingData = {
          websiteId: website._id, businessId: website.businessId,
          customerId: session!.userId, businessName: website.name,
          category: website.templateCategory, ...formData,
          status: 'confirmed', paymentStatus: 'not_required',
        };
        const response = await bookingAPI.createBooking(bookingData);
        if (response) {
          const existing = await storage.getLocalBookings();
          existing.push(response.booking || response.data || response);
          await storage.setLocalBookings(existing);
          setShowOtpModal(false);
          setOtpCode(['', '', '', '', '', '']);
          setOtpVerifying(false);
          router.replace('/(tabs)/bookings');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process booking');
      setOtpVerifying(false);
    }
  };

  if (loading) return <View style={styles.page}><Header title="Loading..." showBack /><LoadingSpinner /></View>;
  if (!website) return (
    <View style={styles.page}>
      <Header title="Not Found" showBack />
      <View style={styles.center}><Text style={styles.errorText}>Business not found</Text></View>
    </View>
  );

  const primaryColor = website.theme?.primaryColor || Colors.primaryOrange;

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Book Service" showBack />
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Business Info */}
        <View style={styles.businessInfo}>
          <Text style={styles.businessTitle}>{website.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{website.templateCategory}</Text>
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.formGroup}>
            <View style={styles.labelRow}><User size={18} color={Colors.textMuted} /><Text style={styles.label}> Full Name</Text></View>
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Enter your name" placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={styles.formGroup}>
            <View style={styles.labelRow}><Mail size={18} color={Colors.textMuted} /><Text style={styles.label}> Email</Text></View>
            <TextInput style={styles.input} value={customerEmail} onChangeText={setCustomerEmail} placeholder="Enter your email" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.formGroup}>
            <View style={styles.labelRow}><Phone size={18} color={Colors.textMuted} /><Text style={styles.label}> Phone Number</Text></View>
            <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} placeholder="Enter your phone number" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
          </View>
        </View>

        {/* Service Selection */}
        {website.businessData?.services?.length > 0 ? (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Select Service</Text>
            {website.businessData.services.map((svc: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={[styles.serviceCard, service === svc.name && { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }]}
                onPress={() => handleServiceSelect(svc)}
              >
                <Text style={styles.serviceName}>{svc.name}</Text>
                {svc.price && <Text style={[styles.servicePrice, { color: primaryColor }]}>{svc.price}</Text>}
                {svc.duration && <Text style={styles.serviceDuration}>{svc.duration}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            <View style={styles.formGroup}>
              <View style={styles.labelRow}><FileText size={18} color={Colors.textMuted} /><Text style={styles.label}> Service Type</Text></View>
              <TextInput style={styles.input} value={service} onChangeText={setService} placeholder="Enter service type" placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
        )}

        {/* Staff Selection */}
        {website.businessData?.staff?.length > 0 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Select Staff Member</Text>
            {website.businessData.staff
              .filter((p: any) => p.status === 'Available' || p.status === 'On Duty')
              .map((person: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.personnelCard, personnelId === (person.id || person._id) && { borderColor: Colors.secondaryOrange, backgroundColor: `${Colors.secondaryOrange}10` }]}
                  onPress={() => handlePersonnelSelect(person)}
                >
                  <Text style={styles.personnelName}>{person.name}</Text>
                  {person.type && <Text style={styles.personnelType}>{person.type}</Text>}
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Booking Details */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.formGroup}>
            <View style={styles.labelRow}><Calendar size={18} color={Colors.textMuted} /><Text style={styles.label}> Preferred Date</Text></View>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={bookingDate.toISOString().split('T')[0]}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e: any) => { if (e.target.value) setBookingDate(new Date(e.target.value + 'T00:00:00')); }}
                style={{ backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, color: '#1a202c', width: '100%' }}
              />
            ) : (
              <>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateInputText}>{bookingDate.toISOString().split('T')[0]}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker value={bookingDate} mode="date" minimumDate={new Date()} onChange={(_, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setBookingDate(d); }} />
                )}
              </>
            )}
          </View>
          <View style={styles.formGroup}>
            <View style={styles.labelRow}><Clock size={18} color={Colors.textMuted} /><Text style={styles.label}> Preferred Time</Text></View>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={bookingTime.toTimeString().slice(0, 5)}
                onChange={(e: any) => { if (e.target.value) { const [h, m] = e.target.value.split(':'); const d = new Date(); d.setHours(Number(h), Number(m), 0, 0); setBookingTime(d); } }}
                style={{ backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, color: '#1a202c', width: '100%' }}
              />
            ) : (
              <>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.dateInputText}>{bookingTime.toTimeString().slice(0, 5)}</Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker value={bookingTime} mode="time" onChange={(_, d) => { setShowTimePicker(Platform.OS === 'ios'); if (d) setBookingTime(d); }} />
                )}
              </>
            )}
          </View>
          <View style={styles.formGroup}>
            <View style={styles.labelRow}><FileText size={18} color={Colors.textMuted} /><Text style={styles.label}> Additional Notes (Optional)</Text></View>
            <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Any special requests..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />
          </View>
        </View>

        <TouchableOpacity style={[styles.submitBtn, (submitting || otpSending || checkingAvailability) && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting || otpSending || checkingAvailability} activeOpacity={0.8}>
          {submitting || otpSending || checkingAvailability ? (
            <><ActivityIndicator color={Colors.white} /><Text style={styles.submitBtnText}>{checkingAvailability ? 'Checking availability...' : otpSending ? 'Sending OTP...' : 'Processing...'}</Text></>
          ) : (
            <><Send size={20} color={Colors.white} /><Text style={styles.submitBtnText}>Submit Booking</Text></>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Your Email</Text>
              <TouchableOpacity onPress={() => { setShowOtpModal(false); setOtpCode(['','','','','','']); setOtpError(''); }}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.otpInstructions}>We've sent a 6-digit verification code to <Text style={{ fontWeight: FontWeight.bold }}>{customerEmail}</Text></Text>
            <View style={styles.otpInputGroup}>
              {otpCode.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={ref => { otpRefs.current[i] = ref; }}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={v => handleOtpChange(i, v)}
                  onKeyPress={e => handleOtpKeyPress(i, e.nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  editable={!otpVerifying}
                  selectTextOnFocus
                />
              ))}
            </View>
            {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}
            <TouchableOpacity
              style={[styles.otpVerifyBtn, (otpVerifying || otpCode.join('').length !== 6) && { opacity: 0.7 }]}
              onPress={handleOtpSubmit}
              disabled={otpVerifying || otpCode.join('').length !== 6}
            >
              {otpVerifying ? (
                <><ActivityIndicator color={Colors.white} /><Text style={styles.otpVerifyBtnText}>Verifying...</Text></>
              ) : (
                <><CheckCircle size={20} color={Colors.white} /><Text style={styles.otpVerifyBtnText}>Verify & Continue</Text></>
              )}
            </TouchableOpacity>
            <View style={styles.otpResend}>
              {otpResendTimer > 0 ? (
                <Text style={styles.otpResendText}>Resend code in {otpResendTimer}s</Text>
              ) : (
                <TouchableOpacity onPress={() => { setOtpCode(['','','','','','']); setOtpError(''); sendOtp(); }}>
                  <Text style={styles.otpResendLink}>Didn't receive code? Resend</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgLight },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: FontSize.lg, color: Colors.textMuted },
  businessInfo: { padding: 20, backgroundColor: Colors.bgWhite, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  businessTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark, marginBottom: 6 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: Colors.lightOrangeBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full },
  categoryText: { fontSize: FontSize.sm, color: Colors.primaryOrange, fontWeight: FontWeight.semibold },
  formSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textDark, marginBottom: 12 },
  formGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textDark },
  input: { backgroundColor: Colors.bgLight, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: BorderRadius.md, paddingHorizontal: 16, paddingVertical: 12, fontSize: FontSize.lg, color: Colors.textDark },
  textArea: { minHeight: 100, paddingTop: 12 },
  dateInput: { backgroundColor: Colors.bgLight, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: BorderRadius.md, padding: 12 },
  dateInputText: { fontSize: FontSize.lg, color: Colors.textDark },
  serviceCard: { borderWidth: 2, borderColor: Colors.borderColor, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 8, backgroundColor: Colors.bgWhite },
  serviceName: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textDark },
  servicePrice: { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: 4 },
  serviceDuration: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  personnelCard: { borderWidth: 2, borderColor: Colors.borderColor, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 8, backgroundColor: Colors.bgWhite },
  personnelName: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textDark },
  personnelType: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  submitBtn: { flexDirection: 'row', backgroundColor: Colors.primaryOrange, borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 12 },
  submitBtnText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.xl, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark },
  otpInstructions: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: 20, lineHeight: 22 },
  otpInputGroup: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  otpInput: { width: 44, height: 52, borderWidth: 2, borderColor: Colors.borderColor, borderRadius: BorderRadius.md, textAlign: 'center', fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark },
  otpErrorText: { color: Colors.errorRed, fontSize: FontSize.md, textAlign: 'center', marginBottom: 12 },
  otpVerifyBtn: { flexDirection: 'row', backgroundColor: Colors.primaryOrange, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  otpVerifyBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  otpResend: { alignItems: 'center' },
  otpResendText: { fontSize: FontSize.md, color: Colors.textMuted },
  otpResendLink: { fontSize: FontSize.md, color: Colors.primaryOrange, fontWeight: FontWeight.medium },
});
