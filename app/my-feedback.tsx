import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Star, MessageSquare, ThumbsUp, Calendar } from 'lucide-react-native';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { feedbackAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';

const getRatingText = (rating: number) => {
  switch (rating) {
    case 1: return 'Poor';
    case 2: return 'Fair';
    case 3: return 'Good';
    case 4: return 'Very Good';
    case 5: return 'Excellent';
    default: return '';
  }
};

const StarsDisplay: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={size}
        color={s <= rating ? '#f59e0b' : '#d1d5db'}
        fill={s <= rating ? '#f59e0b' : 'none'}
      />
    ))}
  </View>
);

export default function MyFeedbackScreen() {
  const { session } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeedback = useCallback(async () => {
    if (!session?.userId) return;
    try {
      const response = await feedbackAPI.getUserFeedback(session.userId);
      setFeedbacks(response.feedbacks || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.userId]);

  useEffect(() => { loadFeedback(); }, [loadFeedback]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const renderFeedback = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.businessName}>{item.websiteId?.name || 'Business'}</Text>
          <View style={styles.dateRow}>
            <Calendar size={14} color={Colors.textMuted} />
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.ratingBadge}>
          <Star size={20} color="#f59e0b" fill="#f59e0b" />
          <Text style={styles.ratingValue}>{item.rating}</Text>
        </View>
      </View>

      <View style={styles.ratingRow}>
        <StarsDisplay rating={item.rating} />
        <Text style={styles.ratingText}>{getRatingText(item.rating)}</Text>
      </View>

      {item.comment && (
        <View style={styles.commentBox}>
          <Text style={styles.commentText}>{item.comment}</Text>
        </View>
      )}

      {(item.serviceQuality || item.cleanliness || item.punctuality || item.valueForMoney) && (
        <View style={styles.detailedRatings}>
          <Text style={styles.detailedTitle}>Detailed Ratings</Text>
          {item.serviceQuality ? (
            <View style={styles.ratingItem}>
              <Text style={styles.ratingItemLabel}>Service Quality</Text>
              <View style={styles.ratingItemValue}><StarsDisplay rating={item.serviceQuality} size={14} /><Text style={styles.ratingItemNum}>{item.serviceQuality}/5</Text></View>
            </View>
          ) : null}
          {item.cleanliness ? (
            <View style={styles.ratingItem}>
              <Text style={styles.ratingItemLabel}>Cleanliness</Text>
              <View style={styles.ratingItemValue}><StarsDisplay rating={item.cleanliness} size={14} /><Text style={styles.ratingItemNum}>{item.cleanliness}/5</Text></View>
            </View>
          ) : null}
          {item.punctuality ? (
            <View style={styles.ratingItem}>
              <Text style={styles.ratingItemLabel}>Punctuality</Text>
              <View style={styles.ratingItemValue}><StarsDisplay rating={item.punctuality} size={14} /><Text style={styles.ratingItemNum}>{item.punctuality}/5</Text></View>
            </View>
          ) : null}
          {item.valueForMoney ? (
            <View style={styles.ratingItem}>
              <Text style={styles.ratingItemLabel}>Value for Money</Text>
              <View style={styles.ratingItemValue}><StarsDisplay rating={item.valueForMoney} size={14} /><Text style={styles.ratingItemNum}>{item.valueForMoney}/5</Text></View>
            </View>
          ) : null}
        </View>
      )}

      {item.wouldRecommend !== null && item.wouldRecommend !== undefined && (
        <View style={[styles.recommendBadge, item.wouldRecommend ? styles.recommendYes : styles.recommendNo]}>
          <ThumbsUp size={16} color={item.wouldRecommend ? Colors.successGreen : Colors.errorRed} />
          <Text style={[styles.recommendText, { color: item.wouldRecommend ? Colors.successGreen : Colors.errorRed }]}>
            {item.wouldRecommend ? 'Would Recommend' : 'Would Not Recommend'}
          </Text>
        </View>
      )}

      {item.response && (
        <View style={styles.responseBox}>
          <Text style={styles.responseTitle}>Business Response</Text>
          <Text style={styles.responseText}>{item.response.text}</Text>
          <Text style={styles.responseDate}>Responded on {formatDate(item.response.respondedAt)}</Text>
        </View>
      )}

      {item.isAnonymous && (
        <View style={styles.anonymousBadge}>
          <Text style={styles.anonymousText}>Anonymous Review</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.page}>
      <Header title="My Feedback" showBack onRefresh={loadFeedback} />

      <View style={styles.pageHeader}>
        <MessageSquare size={28} color={Colors.textDark} />
        <Text style={styles.pageTitle}>My Feedback</Text>
      </View>

      {loading ? <LoadingSpinner /> : (
        <FlatList
          data={feedbacks}
          keyExtractor={item => item._id}
          renderItem={renderFeedback}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFeedback(); }} tintColor={Colors.primaryOrange} />}
          ListEmptyComponent={
            <EmptyState
              icon={<MessageSquare size={64} color="#cbd5e0" />}
              title="No Feedback Yet"
              message="Complete a booking to leave your first review!"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgLight },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 12, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  businessName: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textDark },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dateText: { fontSize: FontSize.sm, color: Colors.textMuted },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  ratingValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#92400e' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ratingText: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: FontWeight.medium },
  commentBox: { backgroundColor: Colors.bgLight, borderRadius: BorderRadius.md, padding: 12, marginBottom: 10 },
  commentText: { fontSize: FontSize.md, color: Colors.textDark, lineHeight: 22 },
  detailedRatings: { borderTopWidth: 1, borderTopColor: Colors.borderColor, paddingTop: 10, marginBottom: 10 },
  detailedTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textDark, marginBottom: 8 },
  ratingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ratingItemLabel: { fontSize: FontSize.md, color: Colors.textMuted },
  ratingItemValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingItemNum: { fontSize: FontSize.sm, color: Colors.textMuted },
  recommendBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginBottom: 10 },
  recommendYes: { backgroundColor: Colors.successBg },
  recommendNo: { backgroundColor: Colors.errorBg },
  recommendText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  responseBox: { backgroundColor: '#f0f9ff', borderRadius: BorderRadius.md, padding: 12, borderLeftWidth: 3, borderLeftColor: '#3b82f6', marginBottom: 8 },
  responseTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#1e40af', marginBottom: 4 },
  responseText: { fontSize: FontSize.md, color: Colors.textDark, lineHeight: 22 },
  responseDate: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 6 },
  anonymousBadge: { alignSelf: 'flex-start', backgroundColor: Colors.bgLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full },
  anonymousText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
});
