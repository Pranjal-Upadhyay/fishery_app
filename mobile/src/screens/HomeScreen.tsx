import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import WeatherCard from '../components/WeatherCard';
import HarvestCountdownCard from '../components/HarvestCountdownCard';
import HelplineCard from '../components/HelplineCard';
import { database } from '../database';
import { fetchSpeciesLookup } from '../utils/speciesLookup';
import { getUnreadNotificationCount } from '../utils/notificationCenter';

// Pre-load system type images at module level for Metro static resolution
const IMG_RAS          = require('../../system_types/RAS.png');
const IMG_BIOFLOC      = require('../../system_types/biofloc.png');
const IMG_EARTHEN_POND = require('../../system_types/earthen_pond_system.png');
const IMG_CAGE         = require('../../system_types/cage_system.png');


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
    { icon: 'fish-outline' as const,          label: t('home.checkSpecies'),     screen: 'Species' },
    { icon: 'calculator-outline' as const,    label: t('home.calculateROI'),     screen: 'Economics' },
    { icon: 'water-outline' as const,         label: t('home.logWaterQuality'),  screen: 'WaterQuality' },
    { icon: 'trending-up-outline' as const,   label: t('home.viewMarkets'),      screen: 'MarketPrices' },
    { icon: 'map-outline' as const,           label: t('navigation.maps'),       screen: 'Maps' },
    { icon: 'construct-outline' as const,     label: t('home.equipmentCatalog'), screen: 'EquipmentCatalog' },
    { icon: 'restaurant-outline' as const,    label: t('home.feedNutrition'),    screen: 'FeedCatalog' },
    { icon: 'bug-outline' as const,           label: t('home.diseaseIntelligence'),     screen: 'DiseaseList' },
    { icon: 'medical-outline' as const,       label: t('home.doctorNetwork'),           screen: 'DoctorNetwork' },
    { icon: 'storefront-outline' as const,    label: 'Fingerling Market',  screen: 'MarketListings' },
    { icon: 'receipt-outline' as const,       label: 'My Orders',          screen: 'MyOrders' },
    { icon: 'cube-outline' as const,          label: 'Farm Assets',        screen: 'FarmAssets' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greetingMorning');
    if (hour < 17) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
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
            <Text style={styles.brandText}>MatsyaMitra</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <HelplineCard />
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
        </View>

        {/* ── Hero Greeting ── */}
        <View style={styles.heroSection}>
          <Text style={styles.greetingText}>
            {getGreeting()}, {t('home.greetingChief')}!
          </Text>
          <Text style={styles.greetingSub}>
            {pondCount > 0
              ? `${t('home.subtitleWithPonds', { count: pondCount })}${activePonds.length > 0 ? t('home.subtitleActiveSuffix', { count: activePonds.length }) : ''}`
              : t('home.subtitleNoPonds')}
          </Text>
        </View>

        {/* ── Farm Health Bento Grid ── */}
        <Text style={styles.sectionHeader}>{t('home.farmHealth')}</Text>
        <View style={styles.bentoGrid}>
          {/* Active Ponds */}
          <TouchableOpacity
            style={styles.touchableBento}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('PondsList')}
          >
            <View style={[styles.bentoCard, styles.bentoCardLeft]}>
              <View style={[styles.bentoDot, { backgroundColor: theme.colors.secondary }]} />
              <Text style={styles.bentoNumber}>{activePonds.length}</Text>
              <Text style={styles.bentoLabel}>{t('home.activePonds')}</Text>
            </View>
          </TouchableOpacity>
          {/* Critical Alerts */}
          <TouchableOpacity
            style={styles.touchableBento}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('Notifications')}
          >
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
              <Text style={styles.bentoLabel}>{t('home.criticalAlerts')}</Text>
            </View>
          </TouchableOpacity>
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
        <Text style={styles.sectionHeader}>{t('home.quickActions').toUpperCase()}</Text>
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
            <Text style={styles.learnTitle}>{t('home.newToAquaculture')}</Text>
            <Text style={styles.learnText}>
              {t('home.newToAquacultureBody')}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* ── Farming Systems — dedicated separate section ─────────────────── */}
        <View style={styles.systemsSection}>
          <View style={styles.systemsSectionHeader}>
            <View style={styles.systemsSectionIconWrap}>
              <Ionicons name="fish-outline" size={16} color="#0D9488" />
            </View>
            <Text style={styles.systemsSectionHeading}>Farming Systems Guide</Text>
            <View style={styles.systemsNewPill}>
              <Text style={styles.systemsNewPillText}>NEW</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.systemsBanner}
            onPress={() => navigation.navigate('SystemTypes')}
            activeOpacity={0.85}
          >
            {/* 4 system image thumbnails */}
            <View style={styles.systemsImageStrip}>
              <Image source={IMG_EARTHEN_POND} style={styles.systemsThumb} resizeMode="cover" />
              <Image source={IMG_BIOFLOC}      style={styles.systemsThumb} resizeMode="cover" />
              <Image source={IMG_RAS}          style={styles.systemsThumb} resizeMode="cover" />
              <Image source={IMG_CAGE}         style={[styles.systemsThumb, { borderRightWidth: 0 }]} resizeMode="cover" />
            </View>
            <View style={styles.systemsBannerBody}>
              <View style={styles.systemsBannerTop}>
                <View style={styles.systemsBannerPill}>
                  <Text style={styles.systemsBannerPillText}>4 SYSTEMS</Text>
                </View>
                <Text style={styles.systemsBannerEmojis}>🏢🟤🚜🌊</Text>
              </View>
              <Text style={styles.systemsBannerTitle}>
                Learn about different kinds of systems in fish farming
              </Text>
              <Text style={styles.systemsBannerSub}>
                RAS · Biofloc · Earthen Pond · Cage — what they are, how they work & which fish thrive in each.
              </Text>
              <View style={styles.systemsBannerCta}>
                <Text style={styles.systemsBannerCtaText}>Explore Systems</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

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
    touchableBento: { flex: 1 },
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

    systemsSection: {
      marginTop: 20,
      marginBottom: 4,
    },
    systemsSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    systemsSectionIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: '#0D948820',
      alignItems: 'center',
      justifyContent: 'center',
    },
    systemsSectionHeading: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      flex: 1,
      letterSpacing: 0.2,
    },
    systemsNewPill: {
      backgroundColor: '#EF4444',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    systemsNewPillText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
    },
    // ── Farming Systems banner ───────────────────────────────────────────────
    systemsBanner: {
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: '#0D9488',
      backgroundColor: theme.colors.surface,
      ...theme.shadows?.md,
    },
    systemsImageStrip: {
      flexDirection: 'row',
      height: 90,
    },
    systemsThumb: {
      flex: 1,
      height: 90,
      borderRightWidth: 1,
      borderRightColor: '#fff',
    },
    systemsBannerBody: {
      padding: 16,
      backgroundColor: '#0D948808',
    },
    systemsBannerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    systemsBannerPill: {
      backgroundColor: '#0D9488',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    systemsBannerPillText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
    },
    systemsBannerEmojis: {
      fontSize: 18,
      letterSpacing: 2,
    },
    systemsBannerTitle: {
      color: theme.colors.textPrimary,
      fontSize: 17,
      fontWeight: '900',
      lineHeight: 23,
      letterSpacing: -0.2,
      marginBottom: 6,
    },
    systemsBannerSub: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 14,
    },
    systemsBannerCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: '#0D9488',
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 12,
    },
    systemsBannerCtaText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },
  });
