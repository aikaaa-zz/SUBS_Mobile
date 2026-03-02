import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Heart, ExternalLink } from 'lucide-react-native';
import Header from '../../components/Header';
import EmptyState from '../../components/EmptyState';
import { storage } from '../../utils/storage';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows } from '../../constants/theme';

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    const favs = await storage.getFavorites();
    setFavorites(favs);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  const removeFavorite = async (id: string) => {
    const updated = favorites.filter(f => f._id !== id);
    setFavorites(updated);
    await storage.setFavorites(updated);
  };

  const renderFavorite = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardContent} onPress={() => router.push(`/business/${item.slug}`)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name || 'Business Name'}</Text>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{item.templateCategory || 'Business'}</Text>
          </View>
          <Text style={styles.desc} numberOfLines={2}>
            {item.businessData?.description || 'Professional services available'}
          </Text>
        </View>
        <View style={styles.visitIcon}>
          <ExternalLink size={20} color={Colors.primaryOrange} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.removeBtn} onPress={() => removeFavorite(item._id)}>
        <Heart size={18} color={Colors.errorRed} fill={Colors.errorRed} />
        <Text style={styles.removeBtnText}>Remove from Favorites</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.page}>
      <Header title="Favorites" onRefresh={loadFavorites} />
      <FlatList
        data={favorites}
        keyExtractor={item => item._id}
        renderItem={renderFavorite}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFavorites(); }} tintColor={Colors.primaryOrange} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Heart size={64} color="#cbd5e0" />}
            title="No Favorites Yet"
            message="Start exploring and save your favorite businesses"
            actionLabel="Explore Businesses"
            onAction={() => router.push('/(tabs)/explore')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgLight },
  listContent: { padding: 20 },
  card: { backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, marginBottom: 12, ...Shadows.sm },
  cardContent: { flexDirection: 'row', padding: 16 },
  name: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold, color: Colors.textDark, marginBottom: 4 },
  categoryTag: { alignSelf: 'flex-start', backgroundColor: Colors.lightOrangeBg, paddingHorizontal: 10, paddingVertical: 2, borderRadius: BorderRadius.full, marginBottom: 6 },
  categoryText: { fontSize: FontSize.xs, color: Colors.primaryOrange, fontWeight: FontWeight.semibold },
  desc: { fontSize: FontSize.md, color: Colors.textMuted, lineHeight: 20 },
  visitIcon: { justifyContent: 'center', marginLeft: 12 },
  removeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.borderColor,
  },
  removeBtnText: { fontSize: FontSize.md, color: Colors.errorRed, fontWeight: FontWeight.medium },
});
