import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ExternalLink, Heart, AlertCircle } from 'lucide-react-native';
import Header from '../../components/Header';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { websiteAPI } from '../../services/api';
import { storage } from '../../utils/storage';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows, Spacing } from '../../constants/theme';

const CATEGORIES = [
  'All', 'Dental', 'Hotel', 'Travel', 'Beauty', 'Fitness',
  'Professional Services', 'Education', 'Automotive', 'Home Services', 'Food & Beverage',
];

export default function ExploreScreen() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState<any[]>([]);

  const loadBusinesses = useCallback(async () => {
    try {
      setError('');
      const response = await websiteAPI.getPublicWebsites();
      const websites = response.websites || response.data || response || [];
      setBusinesses(websites);
    } catch (err: any) {
      setError(err.message || 'Failed to load businesses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    const favs = await storage.getFavorites();
    setFavorites(favs);
  }, []);

  useEffect(() => { loadBusinesses(); loadFavorites(); }, [loadBusinesses, loadFavorites]);

  useEffect(() => {
    let filtered = [...businesses];
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(b => b.templateCategory?.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.name?.toLowerCase().includes(q) ||
        b.templateCategory?.toLowerCase().includes(q) ||
        b.businessData?.description?.toLowerCase().includes(q)
      );
    }
    setFilteredBusinesses(filtered);
  }, [searchQuery, selectedCategory, businesses]);

  const isFavorite = (id: string) => favorites.some(f => f._id === id);

  const toggleFavorite = async (business: any) => {
    let updated: any[];
    if (isFavorite(business._id)) {
      updated = favorites.filter(f => f._id !== business._id);
    } else {
      updated = [...favorites, business];
    }
    setFavorites(updated);
    await storage.setFavorites(updated);
  };

  const onRefresh = async () => { setRefreshing(true); await loadBusinesses(); await loadFavorites(); };

  const renderBusiness = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.businessCard}
      onPress={() => router.push(`/business/${item.slug}`)}
      activeOpacity={0.7}
    >
      <View style={styles.businessHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.businessName}>{item.name || 'Business Name'}</Text>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{item.templateCategory || 'Business'}</Text>
          </View>
        </View>
        <View style={styles.businessActions}>
          <TouchableOpacity onPress={() => toggleFavorite(item)} style={styles.favButton}>
            <Heart
              size={20}
              color={isFavorite(item._id) ? Colors.errorRed : Colors.textMuted}
              fill={isFavorite(item._id) ? Colors.errorRed : 'none'}
            />
          </TouchableOpacity>
          <View style={styles.visitButton}>
            <ExternalLink size={20} color={Colors.primaryOrange} />
          </View>
        </View>
      </View>
      <Text style={styles.businessDesc} numberOfLines={2}>
        {item.businessData?.description || 'Professional services available for booking'}
      </Text>
      <Text style={styles.businessEmail}>{item.businessData?.email || 'Contact for details'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.page}>
      <Header title="Explore" onRefresh={onRefresh} />

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'} found
        </Text>
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

      {loading ? <LoadingSpinner /> : (
        <FlatList
          data={filteredBusinesses}
          keyExtractor={item => item._id}
          renderItem={renderBusiness}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryOrange} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Search size={48} color="#cbd5e0" />}
              title="No businesses found"
              message="Try adjusting your search or filters"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgLight },
  searchSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgWhite,
    borderRadius: BorderRadius.lg, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.borderColor, gap: 10,
  },
  searchInput: { flex: 1, fontSize: FontSize.lg, color: Colors.textDark, padding: 0 },
  categoriesScroll: { maxHeight: 44 },
  categoriesContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: Colors.bgWhite, borderWidth: 1, borderColor: Colors.borderColor,
  },
  chipActive: { backgroundColor: Colors.primaryOrange, borderColor: Colors.primaryOrange },
  chipText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.white },
  resultsHeader: { paddingHorizontal: 20, paddingVertical: 8 },
  resultsText: { fontSize: FontSize.sm, color: Colors.textMuted },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: BorderRadius.lg, padding: 12, marginHorizontal: 20, marginBottom: 8,
  },
  errorText: { flex: 1, color: Colors.errorRed, fontSize: FontSize.md },
  retryBtn: { backgroundColor: Colors.errorRed, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.md },
  retryBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  businessCard: {
    backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, padding: 16,
    marginBottom: 12, ...Shadows.sm,
  },
  businessHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  businessName: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold, color: Colors.textDark, marginBottom: 4 },
  categoryTag: { alignSelf: 'flex-start', backgroundColor: Colors.lightOrangeBg, paddingHorizontal: 10, paddingVertical: 2, borderRadius: BorderRadius.full },
  categoryTagText: { fontSize: FontSize.xs, color: Colors.primaryOrange, fontWeight: FontWeight.semibold },
  businessActions: { flexDirection: 'row', gap: 8 },
  favButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  visitButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  businessDesc: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: 8, lineHeight: 20 },
  businessEmail: { fontSize: FontSize.sm, color: Colors.textMuted },
});
