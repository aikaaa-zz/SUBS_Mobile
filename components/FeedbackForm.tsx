import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView,
  Switch, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Star } from 'lucide-react-native';
import { feedbackAPI } from '../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../constants/theme';

type FeedbackFormProps = {
  booking: any;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const StarRating: React.FC<{ value: number; onChange: (v: number) => void; label: string; size?: number }> = ({
  value, onChange, label, size = 24,
}) => (
  <View style={styles.starRatingContainer}>
    <Text style={styles.starLabel}>{label}</Text>
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)}>
          <Star size={size} color={s <= value ? '#f59e0b' : '#d1d5db'} fill={s <= value ? '#f59e0b' : 'none'} />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const FeedbackForm: React.FC<FeedbackFormProps> = ({ booking, visible, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [serviceQuality, setServiceQuality] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [valueForMoney, setValueForMoney] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getRatingText = (r: number) => {
    switch (r) {
      case 1: return 'Poor'; case 2: return 'Fair'; case 3: return 'Good';
      case 4: return 'Very Good'; case 5: return 'Excellent'; default: return '';
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please provide an overall rating'); return; }
    setLoading(true);
    setError('');
    try {
      await feedbackAPI.submitFeedback({
        bookingId: booking._id, userId: booking.customerId, rating, comment,
        serviceQuality: serviceQuality || undefined, cleanliness: cleanliness || undefined,
        punctuality: punctuality || undefined, valueForMoney: valueForMoney || undefined,
        wouldRecommend, isAnonymous,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Your Experience</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>×</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
            <View style={styles.bookingInfo}>
              <Text style={styles.infoText}><Text style={{ fontWeight: FontWeight.bold }}>Service:</Text> {booking.service}</Text>
              <Text style={styles.infoText}><Text style={{ fontWeight: FontWeight.bold }}>Date:</Text> {booking.date} at {booking.time}</Text>
            </View>

            <Text style={styles.sectionLabel}>Overall Rating *</Text>
            <View style={styles.mainRating}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Star size={36} color={s <= rating ? '#f59e0b' : '#d1d5db'} fill={s <= rating ? '#f59e0b' : 'none'} />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && <Text style={styles.ratingText}>{getRatingText(rating)}</Text>}

            <Text style={styles.sectionLabel}>Your Comments</Text>
            <TextInput style={styles.textarea} value={comment} onChangeText={setComment} placeholder="Tell us about your experience..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" maxLength={1000} />
            <Text style={styles.charCount}>{comment.length}/1000 characters</Text>

            <Text style={styles.sectionLabel}>Detailed Ratings (Optional)</Text>
            <StarRating value={serviceQuality} onChange={setServiceQuality} label="Service Quality" size={20} />
            <StarRating value={cleanliness} onChange={setCleanliness} label="Cleanliness" size={20} />
            <StarRating value={punctuality} onChange={setPunctuality} label="Punctuality" size={20} />
            <StarRating value={valueForMoney} onChange={setValueForMoney} label="Value for Money" size={20} />

            <Text style={styles.sectionLabel}>Would you recommend this business?</Text>
            <View style={styles.recommendRow}>
              <TouchableOpacity style={[styles.recommendBtn, wouldRecommend === true && styles.recommendYes]} onPress={() => setWouldRecommend(true)}>
                <Text style={[styles.recommendBtnText, wouldRecommend === true && { color: Colors.white }]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.recommendBtn, wouldRecommend === false && styles.recommendNo]} onPress={() => setWouldRecommend(false)}>
                <Text style={[styles.recommendBtnText, wouldRecommend === false && { color: Colors.white }]}>No</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Submit anonymously</Text>
              <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ true: Colors.primaryOrange }} />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitBtnText}>Submit Feedback</Text>}
              </TouchableOpacity>
            </View>
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  container: { backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.xl, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark },
  closeBtn: { fontSize: 28, color: Colors.textMuted },
  body: { padding: 20 },
  errorBox: { backgroundColor: Colors.errorBg, borderRadius: BorderRadius.md, padding: 12, marginBottom: 12 },
  errorText: { color: Colors.errorRed, fontSize: FontSize.md, textAlign: 'center' },
  bookingInfo: { backgroundColor: Colors.bgLight, borderRadius: BorderRadius.md, padding: 12, marginBottom: 16 },
  infoText: { fontSize: FontSize.md, color: Colors.textDark, marginBottom: 4 },
  sectionLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textDark, marginBottom: 8 },
  mainRating: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  ratingText: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: 16 },
  textarea: { backgroundColor: Colors.bgLight, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: BorderRadius.md, padding: 12, fontSize: FontSize.md, color: Colors.textDark, minHeight: 80 },
  charCount: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, marginBottom: 16 },
  starRatingContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  starLabel: { fontSize: FontSize.md, color: Colors.textMuted },
  starsRow: { flexDirection: 'row', gap: 4 },
  recommendRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  recommendBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderColor, alignItems: 'center' },
  recommendYes: { backgroundColor: Colors.successGreen, borderColor: Colors.successGreen },
  recommendNo: { backgroundColor: Colors.errorRed, borderColor: Colors.errorRed },
  recommendBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textDark },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  switchLabel: { fontSize: FontSize.md, color: Colors.textDark },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderColor, alignItems: 'center' },
  cancelBtnText: { color: Colors.textMuted, fontWeight: FontWeight.semibold },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryOrange, alignItems: 'center' },
  submitBtnText: { color: Colors.white, fontWeight: FontWeight.semibold },
});

export default FeedbackForm;
