import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  ActivityIndicator, RefreshControl, Alert, TouchableOpacity,
  TextInput, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { marketService, speciesService } from '../services/apiService';
import { useTheme } from '../ThemeContext';
import SparkLine from '../components/SparkLine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceRow {
  id: string;
  species_name: string;
  market_name: string;
  state_code: string;
  price_inr_per_kg: string;
  grade?: string;
  date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSparklineData(prices: PriceRow[], speciesName: string): number[] {
  return prices
    .filter(p => p.species_name === speciesName)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7)
    .map(p => parseFloat(p.price_inr_per_kg));
}

/** Returns demand level based on price relative to median. */
function getDemandLevel(price: number | null, allPrices: number[]): 'high' | 'low' | 'normal' {
  if (!price || allPrices.length < 2) return 'normal';
  const sorted = [...allPrices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (price >= median * 1.15) return 'high';
  if (price <= median * 0.85) return 'low';
  return 'normal';
}

/** Returns left-border color for demand level. */
function demandColor(level: 'high' | 'low' | 'normal', theme: any): string {
  if (level === 'high') return theme.colors.secondary;   // lime
  if (level === 'low') return theme.colors.error;        // error red
  return theme.colors.accent;                            // amber
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrendIndicator({ price, sparkData, theme }: { price: number | null; sparkData: number[]; theme: any }) {
  if (!price || sparkData.length < 2) {
    return <Ionicons name="remove-outline" size={18} color={theme.colors.textMuted} />;
  }
  const first = sparkData[0];
  const last = sparkData[sparkData.length - 1];
  const up = last >= first;
  const pct = Math.abs(((last - first) / first) * 100).toFixed(1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons
        name={up ? 'trending-up' : 'trending-down'}
        size={18}
        color={up ? theme.colors.success : theme.colors.error}
      />
      <Text
        style={{
          color: up ? theme.colors.success : theme.colors.error,
          fontSize: 11,
          fontWeight: '700',
        }}
      >
        {up ? '+' : '-'}{pct}%
      </Text>
    </View>
  );
}

// Filter chip definitions
const FISH_TYPE_FILTERS = ['All', 'Finfish', 'Shrimp', 'Crab', 'Molluscs'];
const REGION_FILTERS = ['All regions', 'AP', 'WB', 'KL', 'TN', 'MH', 'OD'];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MarketPricesScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [speciesData, setSpeciesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Filter chip state
  const [activeFishType, setActiveFishType] = useState('All');
  const [activeRegion, setActiveRegion] = useState('All regions');

  // Search focus glow animation
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handleSearchFocus = () => {
    setSearchFocused(true);
    Animated.timing(glowAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
  };
  const handleSearchBlur = () => {
    setSearchFocused(false);
    Animated.timing(glowAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
  };

  const searchBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, theme.colors.primary],
  });

  // ─── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [marketRes, speciesRes] = await Promise.all([
        marketService.getPrices(),
        speciesService.getAll(),
      ]);
      if (speciesRes.success && speciesRes.data) setSpeciesData(speciesRes.data);
      if (marketRes.success && marketRes.data) setPrices(marketRes.data);
    } catch {
      Alert.alert('Error', 'Could not load market prices. Please check your connection.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const mergedData = speciesData
    .map((s: any) => {
      const commonName = s.data?.common_names?.en || s.data?.scientific_name;
      const priceEntry = prices.find((p: PriceRow) =>
        p.species_name.toLowerCase().includes(commonName.toLowerCase()) ||
        commonName.toLowerCase().includes(p.species_name.toLowerCase())
      );
      return {
        id: s.id,
        species_name: commonName,
        price_inr_per_kg: priceEntry?.price_inr_per_kg || null,
        market_name: priceEntry?.market_name || 'Awaiting market data',
        state_code: priceEntry?.state_code || '',
        grade: priceEntry?.grade,
        image_url: s.data?.image_url || null,
        date: priceEntry?.date || null,
        category: s.data?.category || '',
      };
    })
    .filter((item: any) => {
      const matchSearch =
        searchQuery === '' ||
        item.species_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRegion =
        activeRegion === 'All regions' ||
        item.state_code === activeRegion;
      const matchType =
        activeFishType === 'All' ||
        (item.category && item.category.toLowerCase().includes(activeFishType.toLowerCase()));
      return matchSearch && matchRegion && matchType;
    });

  // All numeric prices for demand-level calculation
  const allNumericPrices = mergedData
    .map((d: any) => (d.price_inr_per_kg ? parseFloat(d.price_inr_per_kg) : null))
    .filter((p): p is number => p !== null);

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Market Prices</Text>
          <Text style={styles.headerSub}>{mergedData.length} species tracked</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Search bar — rounded-full, surfaceLow bg, glow on focus */}
      <Animated.View
        style={[
          styles.searchBar,
          { borderColor: searchBorderColor },
          searchFocused && styles.searchBarFocused,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={searchFocused ? theme.colors.primary : theme.colors.textMuted}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search species..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Fish-type filter chips */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>TYPE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {FISH_TYPE_FILTERS.map(f => {
            const active = activeFishType === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveFishType(f)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Region filter chips */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>REGION</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {REGION_FILTERS.map(r => {
            const active = activeRegion === r;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveRegion(r)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Section header — uppercase, textMuted, letterSpacing 2 */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>LIVE PRICES</Text>
      </View>

      <FlatList
        data={mergedData}
        keyExtractor={(item: any) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }: { item: any }) => {
          const price = item.price_inr_per_kg ? parseFloat(item.price_inr_per_kg) : null;
          const sparkData = price ? getSparklineData(prices, item.species_name) : [];
          const demand = getDemandLevel(price, allNumericPrices);
          const leftBorderColor = demandColor(demand, theme);

          return (
            <View style={[styles.card, { borderLeftColor: leftBorderColor }]}>
              {/* Hero image with gradient */}
              <View style={styles.cardImageWrap}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.cardImageFallback}>
                    <Ionicons name="fish-outline" size={36} color={theme.colors.primary} />
                  </View>
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(11,19,38,0.75)']}
                  style={styles.cardImageGradient}
                />
                {/* Grade badge on image */}
                {item.grade ? (
                  <View style={styles.gradeBadge}>
                    <Text style={styles.gradeBadgeText}>{item.grade}</Text>
                  </View>
                ) : null}
                {/* Demand badge */}
                <View style={[styles.demandBadge, { borderColor: leftBorderColor }]}>
                  <View style={[styles.demandDot, { backgroundColor: leftBorderColor }]} />
                  <Text style={[styles.demandBadgeText, { color: leftBorderColor }]}>
                    {demand === 'high' ? 'HIGH DEMAND' : demand === 'low' ? 'LOW DEMAND' : 'NORMAL'}
                  </Text>
                </View>
              </View>

              {/* Card body */}
              <View style={styles.cardBody}>
                {/* Species name (bold, textPrimary) + trend arrow */}
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.species_name}</Text>
                  <TrendIndicator price={price} sparkData={sparkData} theme={theme} />
                </View>

                {/* Price large bold in secondary (lime) */}
                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>
                    {price ? `₹${price.toFixed(0)}` : '—'}
                  </Text>
                  {price ? <Text style={styles.priceUnit}>/kg</Text> : null}
                  {price && sparkData.length > 1 ? (
                    <View style={styles.sparkWrap}>
                      <SparkLine data={sparkData} color={theme.colors.secondary} width={72} height={26} />
                    </View>
                  ) : null}
                </View>

                {/* Location + timestamp small in textMuted */}
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.marketMeta} numberOfLines={1}>
                    {item.market_name}{item.state_code ? ` · ${item.state_code}` : ''}
                  </Text>
                  {item.date ? (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
                      <Text style={styles.metaDate}>
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trending-up-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No species match your search.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.gutter,
      paddingVertical: theme.spacing.sm,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: { alignItems: 'center' },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    headerSub: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
      marginTop: 1,
    },

    // ── Search bar ── rounded-full, surfaceLow bg, glow on focus ────────────
    searchBar: {
      height: 48,
      marginHorizontal: theme.spacing.gutter,
      marginBottom: theme.spacing.base,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceLow,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: theme.spacing.gutter,
    },
    searchBarFocused: {
      ...theme.shadows.glow,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },

    // ── Filter chips ─────────────────────────────────────────────────────────
    filterSection: {
      marginBottom: 4,
    },
    filterLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      paddingHorizontal: theme.spacing.gutter,
      marginBottom: 4,
    },
    filterChips: {
      paddingHorizontal: theme.spacing.gutter,
      gap: 8,
      flexDirection: 'row',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    chipTextActive: {
      color: theme.colors.textInverse,
      fontWeight: '700',
    },

    // ── Section header ── uppercase, textMuted, letterSpacing 2 ─────────────
    sectionHeaderRow: {
      paddingHorizontal: theme.spacing.gutter,
      paddingTop: theme.spacing.sm,
      paddingBottom: 6,
    },
    sectionHeader: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },

    listContent: {
      paddingHorizontal: theme.spacing.gutter,
      paddingTop: 2,
      paddingBottom: 110,
    },

    // ── Price card with left colored border ──────────────────────────────────
    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderLeftWidth: 4,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      marginBottom: 14,
      ...theme.shadows.sm,
    },
    cardImageWrap: {
      height: 140,
      position: 'relative',
    },
    cardImage: {
      width: '100%',
      height: '100%',
    },
    cardImageFallback: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardImageGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 70,
    },
    gradeBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    gradeBadgeText: {
      color: theme.colors.accent,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    demandBadge: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceLowest,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
    },
    demandDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    demandBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },

    // ── Card body ────────────────────────────────────────────────────────────
    cardBody: { padding: 14 },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    // Species name — bold in textPrimary
    cardTitle: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.2,
    },

    // Price — large bold in secondary (lime)
    priceRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      marginTop: 8,
      marginBottom: 4,
    },
    priceText: {
      color: theme.colors.secondary,
      fontSize: 28,
      fontWeight: '900',
      lineHeight: 32,
    },
    priceUnit: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 2,
    },
    sparkWrap: {
      flex: 1,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
    },

    // Location + timestamp — small in textMuted
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
    },
    marketMeta: {
      flex: 1,
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    metaDot: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    metaDate: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '500',
    },

    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      color: theme.colors.textMuted,
      marginTop: 12,
      fontSize: 14,
    },
  });
