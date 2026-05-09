import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import WeatherCard from '../components/WeatherCard';
import HarvestCountdownCard from '../components/HarvestCountdownCard';
import { database } from '../database';
import { fetchSpeciesLookup } from '../utils/speciesLookup';
import { getUnreadNotificationCount } from '../utils/notificationCenter';

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [activePonds, setActivePonds] = useState<any[]>([]);
  const [pondCount, setPondCount] = useState(0);
  const [criticalAlerts, setCriticalAlerts] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const loadPonds = useCallback(async () => {
    try {
      const pondsCollection = database.get<any>('ponds');
      const allPonds = await pondsCollection.query().fetch();
      const speciesLookup = await fetchSpeciesLookup();

      setPondCount(allPonds.length);
      const active = allPonds
        .filter((p: any) => (p.status || '').toLowerCase() === 'active' && p.stockingDate)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          species_id: p.speciesId,
          species_name: speciesLookup[p.speciesId]?.scientificName || null,
          species_label: speciesLookup[p.speciesId]?.label || null,
          stocking_date: p.stockingDate,
          status: p.status,
          area_hectares: p.areaHectares ?? 1,
        }));
      setActivePonds(active);

      const unreadCount = await getUnreadNotificationCount();
      setUnreadNotificationCount(unreadCount);
      setCriticalAlerts(unreadCount);
    } catch {
      // Ignore local-db bootstrap issues during initial app load.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPonds();
    }, [loadPonds])
  );

  const quickActions = [
    { icon: 'fish-outline' as const, label: t('home.checkSpecies'), screen: 'Species' },
    { icon: 'calculator-outline' as const, label: t('home.calculateROI'), screen: 'Economics' },
    { icon: 'water-outline' as const, label: t('home.logWaterQuality'), screen: 'WaterQuality' },
    { icon: 'trending-up-outline' as const, label: t('home.viewMarkets'), screen: 'MarketPrices' },
    { icon: 'construct-outline' as const, label: t('home.equipmentCatalog'), screen: 'EquipmentCatalog' },
    { icon: 'restaurant-outline' as const, label: t('home.feedNutrition'), screen: 'FeedCatalog' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top App Bar ── */}
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <View style={styles.brandIconContainer}>
              <Ionicons name="fish" size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.brandText}>Fishing God</Text>
          </View>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={20} color={theme.colors.textPrimary} />
            {unreadNotificationCount > 0 && (
              <View style={styles.badgeDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Hero Greeting ── */}
        <View style={styles.heroSection}>
          <Text style={styles.greetingText}>
            {getGreeting()}, Chief!
          </Text>
          <Text style={styles.greetingSub}>
            {pondCount > 0
              ? `${pondCount} pond${pondCount === 1 ? '' : 's'} in your farm${activePonds.length > 0 ? ` · ${activePonds.length} active` : ''}`
              : 'Add your first pond to start tracking your farm'}
          </Text>
        </View>

        {/* ── Farm Health Bento Grid ── */}
        <Text style={styles.sectionHeader}>FARM HEALTH</Text>
        <View style={styles.bentoGrid}>
          {/* Active Ponds */}
          <View style={[styles.bentoCard, styles.bentoCardLeft]}>
            <View style={[styles.bentoDot, { backgroundColor: theme.colors.secondary }]} />
            <Text style={styles.bentoNumber}>{activePonds.length}</Text>
            <Text style={styles.bentoLabel}>Active Ponds</Text>
          </View>
          {/* Critical Alerts */}
          <View style={[styles.bentoCard, styles.bentoCardRight]}>
            <View
              style={[
                styles.bentoDot,
                { backgroundColor: criticalAlerts > 0 ? theme.colors.error : theme.colors.textMuted },
              ]}
            />
            <Text
              style={[
                styles.bentoNumber,
                criticalAlerts > 0 && { color: theme.colors.error },
              ]}
            >
              {criticalAlerts}
            </Text>
            <Text style={styles.bentoLabel}>Critical Alerts</Text>
          </View>
        </View>

        {/* ── Harvest Countdown (horizontal pond cards) ── */}
        {activePonds.length > 0 && (
          <View style={styles.harvestShell}>
            <HarvestCountdownCard
              ponds={activePonds}
              onPressPond={() => navigation.navigate('PondsList')}
            />
          </View>
        )}

        {/* ── Weather ── */}
        <View style={styles.weatherShell}>
          <WeatherCard locationName="Your District" />
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.82}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name={action.icon} size={22} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Learn Card ── */}
        <TouchableOpacity
          style={styles.learnCard}
          onPress={() => navigation.navigate('LearningCenter')}
          activeOpacity={0.88}
        >
          <View style={styles.learnIconWrap}>
            <Ionicons name="school-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.learnCopy}>
            <Text style={styles.learnTitle}>New to aquaculture?</Text>
            <Text style={styles.learnText}>
              Learn business basics, subsidy rules, key terms, and how to read the app&apos;s numbers.
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 120,
    },

    // ── Top App Bar ──────────────────────────────────────────────
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      paddingBottom: 20,
    },
    brandWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    brandIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    brandText: {
      color: theme.colors.primary,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    bellButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeDot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.error,
      borderWidth: 1.5,
      borderColor: theme.colors.background,
    },

    // ── Hero Greeting ────────────────────────────────────────────
    heroSection: {
      marginBottom: 24,
    },
    greetingText: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      letterSpacing: -0.5,
    },
    greetingSub: {
      marginTop: 6,
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },

    // ── Section Header ───────────────────────────────────────────
    sectionHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 10,
      marginTop: 4,
    },

    // ── Bento Grid ───────────────────────────────────────────────
    bentoGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    bentoCard: {
      flex: 1,
      height: 112,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 16,
      justifyContent: 'flex-end',
      ...theme.shadows.sm,
    },
    bentoCardLeft: {},
    bentoCardRight: {},
    bentoDot: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    bentoNumber: {
      fontSize: 38,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      lineHeight: 42,
      letterSpacing: -1,
    },
    bentoLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      marginTop: 2,
    },

    // ── Harvest / Pond Cards ─────────────────────────────────────
    harvestShell: {
      marginBottom: 20,
    },

    // ── Weather ──────────────────────────────────────────────────
    weatherShell: {
      marginBottom: 24,
    },

    // ── Quick Action Grid ─────────────────────────────────────────
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 24,
    },
    actionCard: {
      width: '31%',
      minHeight: 88,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 6,
      gap: 8,
      ...theme.shadows.sm,
    },
    actionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 15,
    },

    // ── Learn Card ───────────────────────────────────────────────
    learnCard: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 8,
      ...theme.shadows.sm,
    },
    learnIconWrap: {
      width: 42,
      height: 42,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    learnCopy: {
      flex: 1,
    },
    learnTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    learnText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 3,
    },
  });
