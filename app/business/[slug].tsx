import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Phone, Mail, MapPin, Clock, ExternalLink } from 'lucide-react-native';
import Header from '../../components/Header';
import LoadingSpinner from '../../components/LoadingSpinner';
import { websiteAPI } from '../../services/api';
import { trackPageView } from '../../utils/analyticsTracker';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows, Spacing } from '../../constants/theme';

export default function BusinessDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [website, setWebsite] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWebsite();
  }, [slug]);

  const loadWebsite = async () => {
    try {
      setLoading(true);
      const response = await websiteAPI.getWebsiteBySlug(slug!);
      const data = response.website || response.data || response;
      setWebsite(data);
      if (data) {
        await trackPageView(data._id, data.ownerId, data.businessId, { slug, source: 'mobile' });
      }
    } catch (error) {
      console.error('Error loading website:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.page}>
        <Header title="Loading..." showBack />
        <LoadingSpinner />
      </View>
    );
  }

  if (!website) {
    return (
      <View style={styles.page}>
        <Header title="Not Found" showBack />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Business not found</Text>
          <Text style={styles.errorDesc}>This business page does not exist or has been unpublished.</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.ctaBtnText}>Back to Explore</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const businessData = website.businessData || {};
  const primaryColor = website.theme?.primaryColor || Colors.primaryOrange;
  const secondaryColor = website.theme?.secondaryColor || Colors.secondaryOrange;

  return (
    <View style={styles.page}>
      <Header title={website.name} showBack />
      <ScrollView style={styles.content}>
        {/* Hero */}
        <LinearGradient colors={[primaryColor, secondaryColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroTitle}>{website.name}</Text>
          {website.templateCategory && (
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{website.templateCategory}</Text></View>
          )}
          {businessData.tagline && <Text style={styles.heroTagline}>{businessData.tagline}</Text>}
        </LinearGradient>

        {/* About */}
        {businessData.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Us</Text>
            <Text style={styles.descText}>{businessData.description}</Text>
          </View>
        )}

        {/* Services */}
        {businessData.services?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Services</Text>
            {businessData.services.map((service: any, i: number) => (
              <View key={i} style={styles.serviceCard}>
                <Text style={styles.serviceName}>{service.name || service.title}</Text>
                {service.description && <Text style={styles.serviceDesc}>{service.description}</Text>}
                {service.price && <Text style={[styles.servicePrice, { color: primaryColor }]}>{service.price}</Text>}
                {service.duration && (
                  <View style={styles.durationRow}>
                    <Clock size={14} color={Colors.textMuted} />
                    <Text style={styles.durationText}>{service.duration}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Team */}
        {businessData.personnel?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Team</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {businessData.personnel.map((person: any, i: number) => (
                <View key={i} style={styles.teamCard}>
                  {person.image ? (
                    <Image source={{ uri: person.image }} style={[styles.teamAvatar, { borderColor: primaryColor }]} />
                  ) : (
                    <View style={[styles.teamAvatarPlaceholder, { borderColor: primaryColor }]}>
                      <Text style={styles.teamAvatarText}>{person.name?.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.teamName}>{person.name}</Text>
                  {person.role && <Text style={styles.teamRole}>{person.role}</Text>}
                  {person.specialization && <Text style={styles.teamSpec}>{person.specialization}</Text>}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {businessData.email && (
            <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL(`mailto:${businessData.email}`)}>
              <Mail size={20} color={primaryColor} />
              <Text style={styles.contactText}>{businessData.email}</Text>
            </TouchableOpacity>
          )}
          {businessData.phone && (
            <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL(`tel:${businessData.phone}`)}>
              <Phone size={20} color={primaryColor} />
              <Text style={styles.contactText}>{businessData.phone}</Text>
            </TouchableOpacity>
          )}
          {businessData.address && (
            <View style={styles.contactItem}>
              <MapPin size={20} color={primaryColor} />
              <Text style={styles.contactText}>{businessData.address}</Text>
            </View>
          )}
          {businessData.hours && (
            <View style={styles.contactItem}>
              <Clock size={20} color={primaryColor} />
              <Text style={styles.contactText}>{businessData.hours}</Text>
            </View>
          )}
        </View>

        {/* Social Links */}
        {(businessData.facebook || businessData.instagram || businessData.twitter || businessData.website) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Follow Us</Text>
            <View style={styles.socialLinks}>
              {businessData.facebook && (
                <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL(businessData.facebook)}>
                  <Text style={styles.socialBtnText}>Facebook</Text>
                </TouchableOpacity>
              )}
              {businessData.instagram && (
                <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL(businessData.instagram)}>
                  <Text style={styles.socialBtnText}>Instagram</Text>
                </TouchableOpacity>
              )}
              {businessData.twitter && (
                <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL(businessData.twitter)}>
                  <Text style={styles.socialBtnText}>Twitter</Text>
                </TouchableOpacity>
              )}
              {businessData.website && (
                <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL(businessData.website)}>
                  <ExternalLink size={14} color={Colors.primaryOrange} />
                  <Text style={styles.socialBtnText}>Website</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating Book Button */}
      <LinearGradient colors={[primaryColor, secondaryColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.floatingBtn}>
        <TouchableOpacity style={styles.floatingBtnInner} onPress={() => router.push(`/book/${slug}`)}>
          <Calendar size={20} color={Colors.white} />
          <Text style={styles.floatingBtnText}>Book Now</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgLight },
  content: { flex: 1 },
  hero: { padding: 24, paddingTop: 32, paddingBottom: 32 },
  heroTitle: { fontSize: FontSize.title, fontWeight: FontWeight.bold, color: Colors.white, marginBottom: 8 },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full, marginBottom: 8 },
  heroBadgeText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  heroTagline: { fontSize: FontSize.lg, color: 'rgba(255,255,255,0.9)' },
  section: { padding: 20 },
  sectionTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark, marginBottom: 12 },
  descText: { fontSize: FontSize.lg, color: Colors.textMuted, lineHeight: 24 },
  serviceCard: { backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 8, ...Shadows.sm },
  serviceName: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textDark, marginBottom: 4 },
  serviceDesc: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: 6 },
  servicePrice: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: 4 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { fontSize: FontSize.sm, color: Colors.textMuted },
  teamCard: { alignItems: 'center', width: 120, backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, padding: 12, ...Shadows.sm },
  teamAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, marginBottom: 8 },
  teamAvatarPlaceholder: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, backgroundColor: Colors.bgLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  teamAvatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textMuted },
  teamName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textDark, textAlign: 'center' },
  teamRole: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  teamSpec: { fontSize: FontSize.xs, color: Colors.primaryOrange, textAlign: 'center', marginTop: 2 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  contactText: { fontSize: FontSize.lg, color: Colors.textDark, flex: 1 },
  socialLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.borderColor },
  socialBtnText: { fontSize: FontSize.md, color: Colors.primaryOrange, fontWeight: FontWeight.medium },
  floatingBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, borderRadius: BorderRadius.lg, ...Shadows.lg },
  floatingBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  floatingBtnText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark, marginBottom: 8 },
  errorDesc: { fontSize: FontSize.lg, color: Colors.textMuted, textAlign: 'center', marginBottom: 20 },
  ctaBtn: { backgroundColor: Colors.primaryOrange, paddingHorizontal: 24, paddingVertical: 12, borderRadius: BorderRadius.md },
  ctaBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
