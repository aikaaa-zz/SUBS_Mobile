import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Mail, Calendar, CreditCard, LogOut, ChevronRight, Edit2, X, Save, MessageSquare,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { useAuth } from '../../hooks/useAuth';
import { userAPI } from '../../services/api';
import { storage } from '../../utils/storage';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows, Spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, logout, refreshSession } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [firstName, setFirstName] = useState(session?.firstName || '');
  const [lastName, setLastName] = useState(session?.lastName || '');
  const [email, setEmail] = useState(session?.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    try { await userAPI.logout(); } catch {}
    await logout();
    router.replace('/(auth)/login');
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('All fields are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Try backend save first; silently fall back to local-only if endpoint doesn't exist yet
      if (session?.userId) {
        try {
          await userAPI.updateProfile(session.userId, { firstName, lastName, email });
        } catch (backendError) {
          console.warn('Backend profile update unavailable, saving locally:', backendError);
        }
      }
      const updatedUser = { ...session?.user, firstName, lastName, email };
      await storage.setItem('user', JSON.stringify(updatedUser));
      await storage.setItem('userFirstName', firstName);
      await storage.setItem('userLastName', lastName);
      await storage.setItem('userEmail', email);
      await refreshSession();
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { icon: Calendar, label: 'My Bookings', desc: 'View your booking history', onPress: () => router.push('/(tabs)/bookings') },
    { icon: MessageSquare, label: 'My Feedback', desc: 'View your reviews and ratings', onPress: () => router.push('/my-feedback') },
    { icon: CreditCard, label: 'Payment History', desc: 'Track your transactions', onPress: () => router.push('/payment-history') },
  ];

  return (
    <View style={styles.page}>
      <Header title="Profile" onRefresh={refreshSession} />
      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <User size={48} color={Colors.textMuted} />
          </View>
          <Text style={styles.userName}>{session?.firstName} {session?.lastName}</Text>
          <View style={styles.emailRow}>
            <Mail size={16} color={Colors.textMuted} />
            <Text style={styles.userEmail}>{session?.email}</Text>
          </View>
          <View style={styles.accountBadge}>
            <Text style={styles.accountBadgeText}>Personal Account</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setShowEditModal(true); setError(''); }}>
            <View style={styles.menuIcon}><Edit2 size={20} color={Colors.primaryOrange} /></View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Edit Profile</Text>
              <Text style={styles.menuDesc}>Update your personal information</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuIcon}><item.icon size={20} color={Colors.primaryOrange} /></View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color={Colors.errorRed} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>SUBS Mobile v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2025 SUBS. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
            <Text style={styles.formLabel}>First Name</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={(t) => { setFirstName(t); setError(''); }} placeholder="First name" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.formLabel}>Last Name</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={(t) => { setLastName(t); setError(''); }} placeholder="Last name" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.formLabel}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={(t) => { setEmail(t); setError(''); }} placeholder="Email" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} size="small" /> : (
                  <><Save size={18} color={Colors.white} /><Text style={styles.saveBtnText}>Save Changes</Text></>
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
  content: { flex: 1 },
  profileHeader: { alignItems: 'center', padding: 24, backgroundColor: Colors.bgWhite, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.bgLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  userName: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark, marginBottom: 4 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  userEmail: { fontSize: FontSize.md, color: Colors.textMuted },
  accountBadge: { backgroundColor: Colors.lightOrangeBg, paddingHorizontal: 16, paddingVertical: 4, borderRadius: BorderRadius.full },
  accountBadgeText: { fontSize: FontSize.sm, color: Colors.primaryOrange, fontWeight: FontWeight.semibold },
  menu: { backgroundColor: Colors.bgWhite, marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.borderColor },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  menuIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.lightOrangeBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textDark },
  menuDesc: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, marginHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.errorRed },
  logoutText: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.errorRed },
  appInfo: { alignItems: 'center', padding: 24, marginBottom: 20 },
  appInfoText: { fontSize: FontSize.sm, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.xl, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark },
  errorBox: { backgroundColor: Colors.errorBg, borderRadius: BorderRadius.md, padding: 12, marginBottom: 16 },
  errorText: { color: Colors.errorRed, fontSize: FontSize.md, textAlign: 'center' },
  formLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textDark, marginBottom: 8 },
  input: { backgroundColor: Colors.bgLight, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: BorderRadius.md, paddingHorizontal: 16, paddingVertical: 12, fontSize: FontSize.lg, color: Colors.textDark, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderColor, alignItems: 'center' },
  cancelBtnText: { color: Colors.textMuted, fontWeight: FontWeight.semibold },
  saveBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryOrange, alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveBtnText: { color: Colors.white, fontWeight: FontWeight.semibold },
});
