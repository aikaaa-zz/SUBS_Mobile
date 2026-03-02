import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, RefreshCw, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAPI } from '../services/api';
import { storage } from '../utils/storage';
import { Colors, FontSize, FontWeight } from '../constants/theme';

type HeaderProps = {
  title?: string;
  showBack?: boolean;
  onMenuClick?: () => void;
  onRefresh?: () => Promise<void> | void;
};

const Header: React.FC<HeaderProps> = ({ title, showBack = false, onMenuClick, onRefresh }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const userId = await storage.getUserId();
      if (userId) {
        const response = await notificationAPI.getUserNotifications(userId, true);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      {showBack ? (
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.textDark} />
        </TouchableOpacity>
      ) : (
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/subs-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      )}

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <View style={styles.rightActions}>
        {onRefresh && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={22} color={isRefreshing ? Colors.textMuted : Colors.textDark} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/notifications')}
        >
          <Bell size={24} color={Colors.textDark} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {onMenuClick && (
          <TouchableOpacity style={styles.headerButton} onPress={onMenuClick}>
            <Menu size={24} color={Colors.textDark} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
    zIndex: 999,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  title: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.errorRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
});

export default Header;
