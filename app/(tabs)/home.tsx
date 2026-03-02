import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Heart, TrendingUp, ExternalLink, AlertCircle } from 'lucide-react-native';
import Header from '../../components/Header';
import LoadingSpinner from '../../components/LoadingSpinner';
import { websiteAPI, bookingAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows, Spacing } from '../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [recommendedBusinesses, setRecommendedBusinesses] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadHomeData = useCallback(async () => {
    if (!session?.userId) return;
    try {
      setError('');
      const websitesResponse = await websiteAPI.getPublicWebsites();
      const websites = websitesResponse.websites || websitesResponse.data || websitesResponse || [];
      const shuffled = [...websites].sort(() => 0.5 - Math.random());
      setRecommendedBusinesses(shuffled.slice(0, 6));

      const bookingsResponse = await bookingAPI.getCustomerBookings(session.userId);
      const bookings = bookingsResponse.bookings || bookingsResponse.data || bookingsResponse || [];
      setRecentBookings(bookings.slice(-3).reverse());
    } catch (err: any) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.userId]);

  useEffect(() => { loadHomeData(); }, [loadHomeData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return { bg: Colors.successBg, text: Colors.successGreen };
      case 'completed': return { bg: '#dbeafe', text: '#1e40af' };
      case 'cancelled': return { bg: Colors.errorBg, text: Colors.errorRed };
      default: return { bg: Colors.warningBg, text: Colors.warningYellow };
    }
  };

  return (
    <View style={styles.page}>
      <Header title="Home" onRefresh={onRefresh} />
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryOrange} />}
      >
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Welcome back, {session?.firstName}!</Text>
          <Text style={styles.welcomeSub}>Discover and book services effortlessly</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={20} color={Colors.errorRed} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/explore')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#fff5f0' }]}>
              <TrendingUp size={24} color={Colors.primaryOrange} />
            </View>
            <Text style={styles.actionTitle}>Explore</Text>
            <Text style={styles.actionSub}>Find businesses</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/bookings')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
              <Calendar size={24} color="#3b82f6" />
            </View>
            <Text style={styles.actionTitle}>Bookings</Text>
            <Text style={styles.actionSub}>Manage appointments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/favorites')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#fdf2f8' }]}>
              <Heart size={24} color="#ec4899" />
            </View>
            <Text style={styles.actionTitle}>Favorites</Text>
            <Text style={styles.actionSub}>Saved businesses</Text>
          </TouchableOpacity>
        </View>

        {/* Recommended Businesses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? <LoadingSpinner /> : recommendedBusinesses.length > 0 ? (
            <View style={styles.businessGrid}>
              {recommendedBusinesses.map((business) => (
                <TouchableOpacity
                  key={business._id}
                  style={styles.businessCard}
                  onPress={() => router.push(`/business/${business.slug}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.businessCategory}>{business.templateCategory || 'Business'}</Text>
                  <Text style={styles.businessName}>{business.name || 'Business Name'}</Text>
                  <Text style={styles.businessDesc} numberOfLines={2}>
                    {business.businessData?.description || 'Professional services at your fingertips'}
                  </Text>
                  <View style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View & Book</Text>
                    <ExternalLink size={14} color={Colors.primaryOrange} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No businesses available yet</Text>
            </View>
          )}
        </View>

        {/* Recent Bookings */}
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? <LoadingSpinner /> : recentBookings.length > 0 ? (
            recentBookings.map((booking) => {
              const statusStyle = getStatusStyle(booking.status);
              return (
                <View key={booking._id} style={styles.bookingItem}>
                  <View style={styles.bookingIconBox}>
                    <Calendar size={20} color={Colors.primaryOrange} />
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingBusiness}>{booking.businessName}</Text>
                    <Text style={styles.bookingService}>{booking.service}</Text>
                    <Text style={styles.bookingDate}>{booking.date} • {booking.time}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{booking.status}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Calendar size={48} color="#cbd5e0" />
              <Text style={styles.emptyText}>No bookings yet</Text>
              <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(tabs)/explore')}>
                <Text style={styles.ctaButtonText}>Explore Businesses</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgLight },
  content: { flex: 1 },
  welcome: { padding: 20, paddingBottom: 8 },
  welcomeTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark },
  welcomeSub: { fontSize: FontSize.lg, color: Colors.textMuted, marginTop: 4 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: BorderRadius.lg, padding: 12, marginHorizontal: 20, marginBottom: 16,
  },
  errorText: { flex: 1, color: Colors.errorRed, fontSize: FontSize.md },
  retryBtn: { backgroundColor: Colors.errorRed, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.md },
  retryBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  quickActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 24 },
  actionCard: {
    flex: 1, backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg,
    padding: 16, alignItems: 'center', ...Shadows.sm,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textDark },
  actionSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  section: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textDark },
  seeAll: { fontSize: FontSize.md, color: Colors.primaryOrange, fontWeight: FontWeight.medium },
  businessGrid: { gap: 12 },
  businessCard: {
    backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, padding: 16, ...Shadows.sm, marginBottom: 4,
  },
  businessCategory: {
    fontSize: FontSize.xs, color: Colors.primaryOrange, fontWeight: FontWeight.semibold,
    textTransform: 'uppercase', marginBottom: 4,
  },
  businessName: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textDark, marginBottom: 4 },
  businessDesc: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: 12, lineHeight: 20 },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewButtonText: { fontSize: FontSize.md, color: Colors.primaryOrange, fontWeight: FontWeight.semibold },
  bookingItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgWhite,
    borderRadius: BorderRadius.lg, padding: 12, marginBottom: 8, ...Shadows.sm,
  },
  bookingIconBox: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.lightOrangeBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  bookingInfo: { flex: 1 },
  bookingBusiness: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textDark },
  bookingService: { fontSize: FontSize.sm, color: Colors.textMuted },
  bookingDate: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'capitalize' },
  emptyBox: {
    backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, padding: 32,
    alignItems: 'center', ...Shadows.sm,
  },
  emptyText: { fontSize: FontSize.lg, color: Colors.textMuted, marginTop: 8, textAlign: 'center' },
  ctaButton: { backgroundColor: Colors.primaryOrange, paddingHorizontal: 24, paddingVertical: 12, borderRadius: BorderRadius.md, marginTop: 16 },
  ctaButtonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
