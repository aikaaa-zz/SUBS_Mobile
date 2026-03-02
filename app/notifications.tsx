import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl,
} from 'react-native';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react-native';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { notificationAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';

export default function NotificationsScreen() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const userId = session?.userId || '';

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await notificationAPI.getUserNotifications(userId, filter === 'unread');
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, filter]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      const notif = notifications.find(n => n._id === id);
      await notificationAPI.deleteNotification(id, userId);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notif && !notif.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'booking_confirmed': case 'payment_received': return Colors.successGreen;
      case 'booking_cancelled': case 'payment_failed': return Colors.errorRed;
      case 'booking_completed': return '#3b82f6';
      default: return Colors.textMuted;
    }
  };

  const formatTime = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: any }) => (
    <View style={[styles.notifItem, !item.isRead && styles.notifUnread]}>
      <View style={[styles.notifIcon, { backgroundColor: getNotificationColor(item.type) }]}>
        <Bell size={20} color={Colors.white} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifHeaderRow}>
          <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
        <View style={styles.notifActions}>
          {!item.isRead && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleMarkAsRead(item._id)}>
              <Check size={16} color={Colors.successGreen} />
              <Text style={[styles.actionBtnText, { color: Colors.successGreen }]}>Mark as read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item._id)}>
            <Trash2 size={16} color={Colors.errorRed} />
            <Text style={[styles.actionBtnText, { color: Colors.errorRed }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </View>
  );

  return (
    <View style={styles.page}>
      <Header title="Notifications" showBack onRefresh={loadNotifications} />

      <View style={styles.headerSection}>
        <View style={styles.headerTitle}>
          <Bell size={28} color={Colors.textDark} />
          <View>
            <Text style={styles.pageTitle}>Notifications</Text>
            {unreadCount > 0 && <Text style={styles.unreadBadge}>{unreadCount} unread</Text>}
          </View>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllAsRead}>
            <CheckCheck size={18} color={Colors.primaryOrange} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterTabs}>
        <TouchableOpacity style={[styles.filterTab, filter === 'all' && styles.filterTabActive]} onPress={() => setFilter('all')}>
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]} onPress={() => setFilter('unread')}>
          <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? <LoadingSpinner /> : (
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} tintColor={Colors.primaryOrange} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={64} color="#cbd5e0" />}
              title="No notifications"
              message={filter === 'unread' ? "You're all caught up!" : "You don't have any notifications yet."}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgLight },
  headerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark },
  unreadBadge: { fontSize: FontSize.sm, color: Colors.primaryOrange, fontWeight: FontWeight.semibold },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText: { fontSize: FontSize.sm, color: Colors.primaryOrange, fontWeight: FontWeight.medium },
  filterTabs: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  filterTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.bgWhite, borderWidth: 1, borderColor: Colors.borderColor },
  filterTabActive: { backgroundColor: Colors.primaryOrange, borderColor: Colors.primaryOrange },
  filterTabText: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: FontWeight.medium },
  filterTabTextActive: { color: Colors.white },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  notifItem: { flexDirection: 'row', backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 8, ...Shadows.sm },
  notifUnread: { backgroundColor: '#fffbf5', borderLeftWidth: 3, borderLeftColor: Colors.primaryOrange },
  notifIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notifContent: { flex: 1 },
  notifHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textDark, flex: 1, marginRight: 8 },
  notifTime: { fontSize: FontSize.xs, color: Colors.textMuted },
  notifMessage: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: 8, lineHeight: 20 },
  notifActions: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryOrange, marginLeft: 4, marginTop: 4 },
});
