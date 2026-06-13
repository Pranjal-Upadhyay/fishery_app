import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, Image, ScrollView, Modal
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
          <Text style={styles.scientificNameOverlay} numberOfLines={1}>({d.scientific_name})</Text>
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
            <Ionicons name="cash-outline" size={13} color={theme.colors.primary} />
            <Text style={styles.statLabel}>PRICE</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {d.economic_parameters?.market_price_per_kg_inr?.min != null
                ? `₹${d.economic_parameters.market_price_per_kg_inr.min}–${d.economic_parameters.market_price_per_kg_inr.max}/kg`
                : d.excel_economics?.market_price_inr_kg != null
                  ? `₹${d.excel_economics.market_price_inr_kg}/kg`
                  : '–'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={onPress} activeOpacity={0.82}>
          <Text style={styles.ctaText}>{t('species.viewProfile')}</Text>
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
  const [showCompareModal, setShowCompareModal] = useState(false);

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
          setLoadError('species.offlineData');
        }
      }
    } catch (err: any) {
      console.error('Failed to load species', err);
      if (speciesList.length === 0) {
        setLoadError('species.loadError');
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

    // Sort next so that premium/improved carps are pinned to the top
    const priorityScientific = [
      'labeo rohita',
      'catla catla',
      'cyprinus carpio haematopterus'
    ];
    
    next = [...next].sort((a: any, b: any) => {
      const sciA = (a.data?.scientific_name || '').toLowerCase();
      const sciB = (b.data?.scientific_name || '').toLowerCase();
      const idxA = priorityScientific.indexOf(sciA);
      const idxB = priorityScientific.indexOf(sciB);
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      
      const nameA = (a.data?.common_names?.en || '').toLowerCase();
      const nameB = (b.data?.common_names?.en || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    setFiltered(next);
  }, [search, speciesList, currentLang, t, activeFilter]);

  const onRefresh = () => { setRefreshing(true); loadSpecies(); };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
          <Text style={styles.headerTitle}>{t('species.title')}</Text>
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
          placeholder={t('species.searchPlaceholder')}
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
              {t(`species.filters.${filter.toLowerCase()}`, { defaultValue: filter })}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loadError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.accent} />
          <Text style={styles.errorBannerText}>{loadError ? t(loadError) : ''}</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          search.length === 0 ? (
            <CarpGeneticsBanner
              theme={theme}
              styles={styles}
              onPressCompare={() => setShowCompareModal(true)}
            />
          ) : null
        }
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
            <Text style={styles.emptyText}>{t('species.noResults')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <CompareStrainsModal
        visible={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        theme={theme}
        styles={styles}
      />
    </SafeAreaView>
  );
}

// ─── Banner & Modal helper sub-components ───────────────────────────────────

const CarpGeneticsBanner = ({ theme, styles, onPressCompare }: any) => {
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerGradient}>
        <View style={styles.bannerHeader}>
          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeText}>BIHAR AQUACULTURE PROGRAM</Text>
          </View>
          <Ionicons name="git-branch" size={16} color={theme.colors.primary} />
        </View>
        <Text style={styles.bannerTitle}>Next-Gen Carp Genetics</Text>
        <Text style={styles.bannerDesc}>
          Selectively bred strains with superior genetic gain, faster growth, and enhanced disease resistance.
        </Text>
        
        <View style={styles.bannerStrainsRow}>
          <View style={styles.bannerStrainChip}>
            <View style={[styles.bulletDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.bannerStrainChipText}>Jayanti Rohu</Text>
          </View>
          <View style={styles.bannerStrainChip}>
            <View style={[styles.bulletDot, { backgroundColor: theme.colors.secondary }]} />
            <Text style={styles.bannerStrainChipText}>Amrit Catla</Text>
          </View>
          <View style={styles.bannerStrainChip}>
            <View style={[styles.bulletDot, { backgroundColor: theme.colors.accent }]} />
            <Text style={styles.bannerStrainChipText}>Amur Carp</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.bannerButton} onPress={onPressCompare} activeOpacity={0.85}>
          <Text style={styles.bannerButtonText}>Compare Strains & Benefits</Text>
          <Ionicons name="chevron-forward" size={15} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CompareRow = ({ category, rohuText, catlaText, carpText, theme, styles }: any) => (
  <View style={styles.compareRowCard}>
    <Text style={styles.compareCategoryName}>{category}</Text>
    <View style={styles.compareStrainsGrid}>
      <View style={[styles.compareStrainCell, { borderColor: theme.colors.primary }]}>
        <Text style={[styles.compareStrainLabel, { color: theme.colors.primary }]}>Jayanti Rohu</Text>
        <Text style={styles.compareStrainText}>{rohuText}</Text>
      </View>
      <View style={[styles.compareStrainCell, { borderColor: theme.colors.secondary }]}>
        <Text style={[styles.compareStrainLabel, { color: theme.colors.secondary }]}>Amrit Catla</Text>
        <Text style={styles.compareStrainText}>{catlaText}</Text>
      </View>
      <View style={[styles.compareStrainCell, { borderColor: theme.colors.accent }]}>
        <Text style={[styles.compareStrainLabel, { color: theme.colors.accent }]}>Amur Carp</Text>
        <Text style={styles.compareStrainText}>{carpText}</Text>
      </View>
    </View>
  </View>
);

const CompareStrainsModal = ({ visible, onClose, theme, styles }: any) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleWrap}>
              <Ionicons name="git-network-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>Strains Comparison</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalIntroText}>
              Comparison of next-generation genetically improved carp varieties recommended under Bihar Aquaculture Improvement Program.
            </Text>

            <CompareRow
              category="High Genetic Gain"
              rohuText="~18% genetic improvement per generation."
              catlaText="~15% per generation (~35% cumulative gain by 3rd generation)."
              carpText="30-40% faster growth compared to local common carp."
              theme={theme}
              styles={styles}
            />

            <CompareRow
              category="Growth & Culture Cycle"
              rohuText="Achieves 1–1.2 kg in 8–10 months."
              catlaText="Grows up to ~1.8 kg annually (12 months)."
              carpText="Reaches 600–700g in 6 months, up to 1.2–1.5 kg in 12 months."
              theme={theme}
              styles={styles}
            />

            <CompareRow
              category="Farm Income & Productivity"
              rohuText="~50% higher economic returns, ~25% increase in income per hectare."
              catlaText="Larger body size & higher market value."
              carpText="Late sexual maturation (8-12 months) channels energy into body weight."
              theme={theme}
              styles={styles}
            />

            <CompareRow
              category="Disease Resistance"
              rohuText="Bred for Aeromonas hydrophila resistance. Survival heritability: 0.15–0.19."
              catlaText="More resilient and reliable seed than standard Catla."
              carpText="High hardiness, lower disease susceptibility than standard common carp."
              theme={theme}
              styles={styles}
            />

            <CompareRow
              category="Feed Efficiency & Environment"
              rohuText="10–15% improved feed efficiency. Lower production cost."
              catlaText="10-15% improved feed efficiency. Reduced carbon footprint."
              carpText="High feed conversion efficiency, thrives in low-input polyculture."
              theme={theme}
              styles={styles}
            />

            <CompareRow
              category="Nationwide Adoption"
              rohuText="Adopted and validated in 14–16 Indian states."
              catlaText="Officially released, distributed via NFFBB & certified hatcheries."
              carpText="Widely released by ICAR, available at central/state hatcheries."
              theme={theme}
              styles={styles}
            />

            <CompareRow
              category="Average Market Price (Consumable)"
              rohuText="₹150 – ₹220 / kg (Average ₹180/kg)"
              catlaText="₹180 – ₹240 / kg (Average ₹200/kg)"
              carpText="₹110 – ₹150 / kg (Average ₹130/kg)"
              theme={theme}
              styles={styles}
            />

            <CompareRow
              category="Average Seed Price (Fry/Fingerling)"
              rohuText="₹1.00 – ₹1.50 per piece"
              catlaText="₹1.20 – ₹1.80 per piece"
              carpText="₹0.80 – ₹1.20 per piece"
              theme={theme}
              styles={styles}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    minHeight: 36,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
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

  // ── Premium Carp Banner ───────────────────────────────────────────────────
  bannerContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  bannerGradient: {
    padding: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bannerBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  bannerBadgeText: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  bannerDesc: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  bannerStrainsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  bannerStrainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bannerStrainChipText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  bannerButton: {
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bannerButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '800',
    fontSize: 13,
  },

  // ── Comparison Modal ───────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalScrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  modalIntroText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },

  // ── Comparison Row ────────────────────────────────────────────────────────
  compareRowCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 14,
  },
  compareCategoryName: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 4,
  },
  compareStrainsGrid: {
    gap: 8,
  },
  compareStrainCell: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    padding: 8,
  },
  compareStrainLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  compareStrainText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
