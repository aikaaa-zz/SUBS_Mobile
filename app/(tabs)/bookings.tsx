import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TextInput,
  ScrollView, RefreshControl, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Clock, Phone, FileText, X, Edit, AlertTriangle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../../components/Header';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { bookingAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { storage } from '../../utils/storage';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows, Spacing } from '../../constants/theme';

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

export default function BookingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!session?.userId) return;
    try {
      const response = await bookingAPI.getCustomerBookings(session.userId);
      const data = response.bookings || response.data || response || [];
      const sorted = [...data].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(sorted);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.userId]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  useEffect(() => {
    if (selectedFilter === 'All') {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(b => b.status.toLowerCase() === selectedFilter.toLowerCase()));
    }
  }, [selectedFilter, bookings]);

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return { bg: Colors.successBg, text: '#065f46' };
      case 'completed': return { bg: '#dbeafe', text: '#1e40af' };
      case 'cancelled': return { bg: Colors.errorBg, text: '#991b1b' };
      default: return { bg: Colors.warningBg, text: '#92400e' };
    }
  };

  const isWithin24Hours = (booking: any): boolean => {
    try {
      if (!booking.date || !booking.time) return false;
      const [hours, minutes] = booking.time.split(':').map(Number);
      const bookingDateTime = new Date(booking.date);
      bookingDateTime.setHours(hours, minutes, 0, 0);
      const now = new Date();
      const diffMs = bookingDateTime.getTime() - now.getTime();
      return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const handleActionPress = (booking: any, action: 'cancel' | 'reschedule') => {
    if (isWithin24Hours(booking)) {
      Alert.alert(
        'Within 24-Hour Window',
        'This booking is within 24 hours and can no longer be modified. Please contact the business directly for changes.',
      );
      return;
    }
    if (action === 'cancel') {
      setSelectedBooking(booking);
      setShowCancelModal(true);
    } else {
      setSelectedBooking(booking);
      setRescheduleDate(new Date(booking.date || Date.now()));
      setShowRescheduleModal(true);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for cancellation');
      return;
    }
    setActionLoading(true);
    try {
      await bookingAPI.updateBooking(selectedBooking._id, { status: 'cancelled', cancellationReason: cancelReason });
      const updated = bookings.map(b => b._id === selectedBooking._id ? { ...b, status: 'cancelled' } : b);
      setBookings(updated);
      await storage.setLocalBookings(updated);
      setShowCancelModal(false);
      setCancelReason('');
    } catch {
      Alert.alert('Error', 'Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleBooking = async () => {
    setActionLoading(true);
    const dateStr = rescheduleDate.toISOString().split('T')[0];
    const timeStr = rescheduleTime.toTimeString().slice(0, 5);
    try {
      await bookingAPI.updateBooking(selectedBooking._id, { date: dateStr, time: timeStr, status: 'rescheduled' });
      const updated = bookings.map(b =>
        b._id === selectedBooking._id ? { ...b, date: dateStr, time: timeStr, status: 'rescheduled' } : b
      );
      setBookings(updated);
      await storage.setLocalBookings(updated);
      setShowRescheduleModal(false);
    } catch {
      Alert.alert('Error', 'Failed to reschedule booking');
    } finally {
      setActionLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadBookings(); };

  const renderBooking = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.status);
    const canAction = item.status === 'pending' || item.status === 'confirmed';
    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <Text style={styles.businessName} numberOfLines={1}>{item.businessName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <FileText size={16} color={Colors.textMuted} />
          <Text style={styles.detailLabel}>Service:</Text>
          <Text style={styles.detailValue}>{item.service}</Text>
        </View>
        <View style={styles.detailRow}>
          <Calendar size={16} color={Colors.textMuted} />
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{item.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={16} color={Colors.textMuted} />
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{item.time}</Text>
        </View>
        {item.customerPhone ? (
          <View style={styles.detailRow}>
            <Phone size={16} color={Colors.textMuted} />
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{item.customerPhone}</Text>
          </View>
        ) : null}
        {item.notes ? (
          <View style={styles.notesRow}>
            <Text style={styles.detailLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}
        {item.servicePrice ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={[styles.detailValue, { color: Colors.primaryOrange, fontWeight: FontWeight.semibold }]}>
              {typeof item.servicePrice === 'number' ? `₱${item.servicePrice.toFixed(2)}` : item.servicePrice}
            </Text>
          </View>
        ) : null}

        {canAction && isWithin24Hours(item) && (
          <View style={styles.policyWarning}>
            <AlertTriangle size={14} color="#92400e" />
            <Text style={styles.policyWarningText}>Within 24-hour cancellation window</Text>
          </View>
        )}

        {canAction && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.cancelBtn, isWithin24Hours(item) && { opacity: 0.5 }]} onPress={() => handleActionPress(item, 'cancel')}>
              <X size={16} color={Colors.errorRed} />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.rescheduleBtn, isWithin24Hours(item) && { opacity: 0.5 }]} onPress={() => handleActionPress(item, 'reschedule')}>
              <Edit size={16} color={Colors.primaryOrange} />
              <Text style={styles.rescheduleBtnText}>Reschedule</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <Header title="My Bookings" onRefresh={onRefresh} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.chip, selectedFilter === f && styles.chipActive]} onPress={() => setSelectedFilter(f)}>
            <Text style={[styles.chipText, selectedFilter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <LoadingSpinner /> : (
        <FlatList
          data={filteredBookings}
          keyExtractor={item => item._id}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryOrange} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Calendar size={64} color="#cbd5e0" />}
              title="No bookings found"
              message={selectedFilter === 'All' ? "You haven't made any bookings yet" : `No ${selectedFilter.toLowerCase()} bookings`}
              actionLabel="Explore Businesses"
              onAction={() => router.push('/(tabs)/explore')}
            />
          }
        />
      )}

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Booking</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Are you sure you want to cancel your booking at{' '}
              <Text style={{ fontWeight: FontWeight.bold }}>{selectedBooking?.businessName}</Text>?
            </Text>
            <Text style={styles.formLabel}>Reason for Cancellation</Text>
            <TextInput
              style={styles.textarea}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Please provide a reason (required)"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.keepBtn} onPress={() => setShowCancelModal(false)} disabled={actionLoading}>
                <Text style={styles.keepBtnText}>Keep Booking</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={handleCancelBooking} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color={Colors.white} size="small" /> : (
                  <><X size={18} color={Colors.white} /><Text style={styles.confirmCancelBtnText}>Cancel Booking</Text></>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={showRescheduleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Booking</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Reschedule your booking at{' '}
              <Text style={{ fontWeight: FontWeight.bold }}>{selectedBooking?.businessName}</Text>
            </Text>

            <Text style={styles.formLabel}>New Date</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={rescheduleDate.toISOString().split('T')[0]}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e: any) => { if (e.target.value) setRescheduleDate(new Date(e.target.value + 'T00:00:00')); }}
                style={{ backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, color: '#1a202c', width: '100%', marginBottom: 16 }}
              />
            ) : (
              <>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                  <Calendar size={18} color={Colors.textMuted} />
                  <Text style={styles.dateInputText}>{rescheduleDate.toISOString().split('T')[0]}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={rescheduleDate}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(_, date) => { setShowDatePicker(Platform.OS === 'ios'); if (date) setRescheduleDate(date); }}
                  />
                )}
              </>
            )}

            <Text style={styles.formLabel}>New Time</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={rescheduleTime.toTimeString().slice(0, 5)}
                onChange={(e: any) => { if (e.target.value) { const [h, m] = e.target.value.split(':'); const d = new Date(); d.setHours(Number(h), Number(m), 0, 0); setRescheduleTime(d); } }}
                style={{ backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, color: '#1a202c', width: '100%', marginBottom: 16 }}
              />
            ) : (
              <>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowTimePicker(true)}>
                  <Clock size={18} color={Colors.textMuted} />
                  <Text style={styles.dateInputText}>{rescheduleTime.toTimeString().slice(0, 5)}</Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={rescheduleTime}
                    mode="time"
                    onChange={(_, date) => { setShowTimePicker(Platform.OS === 'ios'); if (date) setRescheduleTime(date); }}
                  />
                )}
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.keepBtn} onPress={() => setShowRescheduleModal(false)} disabled={actionLoading}>
                <Text style={styles.keepBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleRescheduleBooking} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color={Colors.white} size="small" /> : (
                  <><Edit size={18} color={Colors.white} /><Text style={styles.saveBtnText}>Save Changes</Text></>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgLight },
  filtersScroll: { maxHeight: 52 },
  filtersContent: { paddingHorizontal: 20, gap: 8, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: Colors.bgWhite, borderWidth: 1, borderColor: Colors.borderColor,
  },
  chipActive: { backgroundColor: Colors.primaryOrange, borderColor: Colors.primaryOrange },
  chipText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.white },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  bookingCard: {
    backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, padding: 16,
    marginBottom: 12, ...Shadows.sm,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  businessName: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold, color: Colors.textDark, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'capitalize' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailLabel: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: FontWeight.medium },
  detailValue: { fontSize: FontSize.md, color: Colors.textDark, flex: 1 },
  notesRow: { marginBottom: 6 },
  notesText: { fontSize: FontSize.md, color: Colors.textDark, marginTop: 4 },
  policyWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: Colors.warningBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md },
  policyWarningText: { fontSize: FontSize.xs, color: '#92400e', fontWeight: FontWeight.medium },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderColor },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.errorRed },
  cancelBtnText: { color: Colors.errorRed, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  rescheduleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primaryOrange },
  rescheduleBtnText: { color: Colors.primaryOrange, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.xl, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark },
  modalDesc: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: 16, lineHeight: 22 },
  formLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textDark, marginBottom: 8 },
  textarea: {
    backgroundColor: Colors.bgLight, borderWidth: 1, borderColor: Colors.borderColor,
    borderRadius: BorderRadius.md, padding: 12, fontSize: FontSize.md, color: Colors.textDark,
    minHeight: 100, marginBottom: 16,
  },
  dateInput: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgLight,
    borderWidth: 1, borderColor: Colors.borderColor, borderRadius: BorderRadius.md,
    padding: 12, marginBottom: 16,
  },
  dateInputText: { fontSize: FontSize.md, color: Colors.textDark },
  modalActions: { flexDirection: 'row', gap: 12 },
  keepBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderColor, alignItems: 'center' },
  keepBtnText: { color: Colors.textMuted, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  confirmCancelBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.errorRed, alignItems: 'center', justifyContent: 'center', gap: 6 },
  confirmCancelBtnText: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  saveBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryOrange, alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveBtnText: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
});
