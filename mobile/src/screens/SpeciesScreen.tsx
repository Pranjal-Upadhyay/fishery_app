import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, Image, ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { speciesService } from '../services/apiService';
import { getSpeciesImageUri } from '../utils/speciesImages';

const CATEGORY_FILTERS = ['All', 'Freshwater', 'Saltwater', 'Crustaceans'];

function matchesCategory(species: any, filter: string) {
  if (filter === 'All') return true;

  const category = String(species.data?.category || '').toLowerCase();
  const habitat = String(species.data?.habitat || '').toLowerCase();
  const salinityMax = Number(species.data?.biological_parameters?.salinity_tolerance_ppt?.max ?? 0);
  const candidate = `${category} ${habitat}`;

  if (filter === 'Freshwater') {
    return candidate.includes('fresh') || salinityMax <= 1;
  }

  if (filter === 'Saltwater') {
    return candidate.includes('salt') || candidate.includes('marine') || salinityMax >= 20;
  }

  if (filter === 'Crustaceans') {
    return candidate.includes('shrimp') || candidate.includes('prawn') || candidate.includes('crust');
  }

  return true;
}

const SpeciesCard = ({ species, onPress, theme, styles }: { species: any; onPress: () => void; theme: any; styles: any; }) => {
  const { t, i18n } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const d = species.data || {};
  const params = d.biological_parameters || {};
  const temp = params.temperature_celsius || {};
  const currentLang = i18n.language || 'en';
  const enName = d.common_names?.en;
  const translatedName = enName ? t(`species.names.${enName}`, { defaultValue: '' }) : '';
  const commonName = translatedName || d.common_names?.[currentLang] || enName || d.scientific_name || 'Unknown Species';
  const category = (d.category || '').replace(/_/g, ' ') || 'Species';

  const imageSource = getSpeciesImageUri(d.scientific_name, d.image_url);
  const hasImage = imageSource && !imageError;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Hero image with gradient overlay */}
      <View style={styles.imageContainer}>
        {hasImage ? (
          <Image
            source={imageSource}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="fish" size={48} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.imageGradient} />
        {/* Species name overlaid on image */}
        <View style={styles.imageOverlay}>
          <Text style={styles.speciesNameOverlay} numberOfLines={1}>{commonName}</Text>
          <Text style={styles.scientificNameOverlay} numberOfLines={1}>{d.scientific_name}</Text>
        </View>
        {/* Category chip on image */}
        <View style={styles.categoryChip}>
          <Text style={styles.categoryChipText}>{category}</Text>
        </View>
      </View>

      {/* Stats grid + CTA */}
      <View style={styles.cardBody}>
        {/* 2-col stat grid: each cell is a surfaceLow rounded card */}
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Ionicons name="thermometer-outline" size={13} color={theme.colors.primary} />
            <Text style={styles.statLabel}>TEMP</Text>
            <Text style={styles.statValue}>
              {temp.min != null ? `${temp.min}–${temp.max}°C` : '–'}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Ionicons name="water-outline" size={13} color={theme.colors.primary} />
            <Text style={styles.statLabel}>pH</Text>
            <Text style={styles.statValue}>
              {params.ph_range?.min != null ? `${params.ph_range.min}–${params.ph_range.max}` : '–'}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Ionicons name="water" size={13} color={theme.colors.primary} />
            <Text style={styles.statLabel}>SALINITY</Text>
            <Text style={styles.statValue}>
              {params.salinity_tolerance_ppt?.max != null
                ? `${params.salinity_tolerance_ppt.min || 0}–${params.salinity_tolerance_ppt.max}ppt`
                : '–'}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Ionicons name="layers-outline" size={13} color={theme.colors.primary} />
            <Text style={styles.statLabel}>CATEGORY</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {category || '–'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={onPress} activeOpacity={0.82}>
          <Text style={styles.ctaText}>View Species Profile</Text>
          <Ionicons name="arrow-forward" size={15} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function SpeciesScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSpecies = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await speciesService.getAll();
      if (res.success && res.data) {
        const isFallback = res.data.length <= 3 && res.data[0]?.id?.startsWith('sp_');
        if (!isFallback) {
          setSpeciesList(res.data);
          setFiltered(res.data);
          setLoadError(null);
        } else if (speciesList.length === 0) {
          setSpeciesList(res.data);
          setFiltered(res.data);
          setLoadError('Showing offline data. Pull down to refresh when connected.');
        }
      }
    } catch (err: any) {
      console.error('Failed to load species', err);
      if (speciesList.length === 0) {
        setLoadError('Could not load species. Check your connection and pull down to retry.');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [speciesList.length]);

  useEffect(() => { loadSpecies(); }, [loadSpecies]);
  const currentLang = i18n.language || 'en';

  useEffect(() => {
    let next = speciesList;
    if (search) {
      const q = search.toLowerCase();
      next = next.filter((s: any) => {
        const d = s.data || {};
        const enName = d.common_names?.en;
        const translatedName = enName ? t(`species.names.${enName}`, { defaultValue: '' }) : '';
        const localizedName = (translatedName || d.common_names?.[currentLang] || enName || '').toLowerCase();
        const sci = (d.scientific_name || '').toLowerCase();
        return localizedName.includes(q) || sci.includes(q);
      });
    }

    next = next.filter((s: any) => matchesCategory(s, activeFilter));

    setFiltered(next);
  }, [search, speciesList, currentLang, t, activeFilter]);

  const onRefresh = () => { setRefreshing(true); loadSpecies(); };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading species data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerIcon}>
            <Ionicons name="fish-outline" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Species Catalog</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search bar — rounded-full, height 48, surfaceLow bg, primary border on focus */}
      <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
        <Ionicons
          name="search-outline"
          size={18}
          color={searchFocused ? theme.colors.primary : theme.colors.textMuted}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search fish or shrimp species..."
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips — pill shape */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={{ flexGrow: 0 }}
      >
        {CATEGORY_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            onPress={() => setActiveFilter(filter)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Section header — uppercase, textMuted, letterSpacing 2 */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>
          {filtered.length} {filtered.length === 1 ? 'SPECIES' : 'SPECIES'}
        </Text>
      </View>

      {loadError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.accent} />
          <Text style={styles.errorBannerText}>{loadError}</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <SpeciesCard
            theme={theme}
            styles={styles}
            species={item}
            onPress={() => navigation.navigate('SpeciesDetail' as never, { speciesId: item.id, speciesData: item } as never)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="fish-outline" size={54} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No species match your search.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: theme.colors.textSecondary, fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search bar — rounded-full, height 48, surfaceLow bg, 1.5 border, primary border on focus
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 4,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  searchBarFocused: {
    borderColor: theme.colors.primary,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },

  // Filter chips — pill, active=primary bg+textInverse, inactive=surfaceAlt+border+textSecondary
  filtersRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    height: 34,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    flexShrink: 0,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: theme.colors.textInverse,
  },

  // Section header — uppercase, textMuted, letterSpacing 2, fontSize 11, fontWeight 700
  sectionHeaderRow: {
    paddingHorizontal: 16,
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
    padding: 16,
    paddingTop: 2,
    paddingBottom: 110,
  },

  // Species card — hero image (150px) with gradient overlay
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: 16,
    ...theme.shadows.sm,
  },
  imageContainer: {
    height: 150,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Gradient overlay at bottom of hero image
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
    backgroundColor: theme.isDark ? 'rgba(11,19,38,0.68)' : 'rgba(14,25,50,0.58)',
  },
  // Species name + scientific name overlaying the image bottom
  imageOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    right: 60,
  },
  speciesNameOverlay: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  scientificNameOverlay: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Category chip on image (top-right)
  categoryChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  categoryChipText: {
    color: theme.colors.secondary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card body
  cardBody: {
    padding: 14,
  },

  // 2-col stat grid: each cell is a surfaceLow rounded card with gap
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  statCell: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 3,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statValue: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // "View Species Profile" aqua CTA button
  ctaButton: {
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  ctaText: {
    color: theme.colors.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },

  // Error banner
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty state
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
