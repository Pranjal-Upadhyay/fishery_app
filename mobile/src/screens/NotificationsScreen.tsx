import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import {
  FarmNotification,
  getNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
} from '../utils/notificationCenter';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = getStyles(theme);

  const [notifications, setNotifications] = useState<FarmNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const feed = await getNotificationFeed();
      setNotifications(feed);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleOpenNotification = async (item: FarmNotification) => {
    await markNotificationRead(item.id);
    await loadNotifications();

    if (item.type === 'water_quality') {
      navigation.navigate('WaterQuality', { pondId: item.pondId, initialTab: 'history' });
      return;
    }
    if (item.pondId) {
      navigation.navigate('AddEditPond', { pondId: item.pondId });
      return;
    }
    navigation.navigate('PondsList');
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(notifications.map((item) => item.id));
    await loadNotifications();
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  // Colour helpers
  const dotColor = (item: FarmNotification) =>
    item.severity === 'critical'
      ? c.error
      : item.severity === 'warning'
      ? c.accent
      : c.secondary;

  const iconName = (item: FarmNotification): any =>
    item.type === 'water_quality'
      ? 'water-outline'
      : item.type === 'harvest'
      ? 'timer-outline'
      : 'construct-outline';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>
            Mark all
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary card ────────────────────────────────────── */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryIconWrap}>
          <Ionicons name="notifications" size={22} color={c.primary} />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>Farm Alerts</Text>
          <Text style={styles.summaryText}>
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'} based on your ponds and recent readings`
              : 'You are caught up. New harvest and water-quality alerts will show here.'}
          </Text>
        </View>
      </View>

      {/* ── Category legend ──────────────────────────────────── */}
      {notifications.length > 0 && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.error }]} />
            <Text style={styles.legendLabel}>Critical</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.accent }]} />
            <Text style={styles.legendLabel}>Warning</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.secondary }]} />
            <Text style={styles.legendLabel}>Info</Text>
          </View>
        </View>
      )}

      {/* ── Content ─────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={36} color={c.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>
            Add ponds, log water quality, and keep active crops updated to start receiving useful alerts.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const accent = dotColor(item);
            const isUnread = !item.isRead;
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  isUnread ? styles.cardUnread : styles.cardRead,
                ]}
                onPress={() => handleOpenNotification(item)}
                activeOpacity={0.88}
              >
                {/* Left colored dot */}
                <View style={[styles.leftDot, { backgroundColor: accent }]} />

                {/* Icon badge */}
                <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
                  <Ionicons name={iconName(item)} size={17} color={accent} />
                </View>

                {/* Copy */}
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text
                      style={[styles.cardTitle, isUnread && { color: c.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {isUnread && (
                      <View style={[styles.unreadDot, { backgroundColor: accent }]} />
                    )}
                  </View>
                  <Text style={styles.cardMessage} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text style={styles.cardTime}>
                    {new Date(item.timestamp).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  const r = theme.borderRadius;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    headerTitle: {
      color: c.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    markAllBtn: {
      paddingHorizontal: 4,
    },
    markAllText: {
      color: c.primary,
      fontWeight: '700',
      fontSize: 14,
    },
    markAllTextDisabled: {
      color: c.textMuted,
    },

    // Summary
    summaryCard: {
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: c.surface,
      borderRadius: r.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    summaryIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    unreadBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.error,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    unreadBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
    },
    summaryTitle: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    summaryText: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 3,
    },

    // Category legend
    legendRow: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textMuted,
      letterSpacing: 0.3,
    },

    // State
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 120,
    },

    // Notification card
    card: {
      borderRadius: r.lg,
      borderWidth: 1,
      padding: 12,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      overflow: 'hidden',
      position: 'relative',
    },
    cardUnread: {
      backgroundColor: c.surface,
      borderColor: c.border,
    },
    cardRead: {
      backgroundColor: c.surfaceAlt,
      borderColor: c.border,
    },
    leftDot: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      borderTopLeftRadius: r.lg,
      borderBottomLeftRadius: r.lg,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginLeft: 6,
    },
    cardBody: {
      flex: 1,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      flex: 1,
      color: c.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    unreadDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      flexShrink: 0,
    },
    cardMessage: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    cardTime: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 6,
    },

    // Empty state
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyTitle: {
      color: c.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 16,
    },
    emptyText: {
      color: c.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      marginTop: 8,
    },
  });
};
