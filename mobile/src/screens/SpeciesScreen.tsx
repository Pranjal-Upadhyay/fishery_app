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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {imageSource && !imageError ? (
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={styles.imageFallback}>
          <Ionicons name="fish" size={42} color={theme.colors.primary} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.speciesName}>{commonName}</Text>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{category}</Text>
          </View>
        </View>
        <Text style={styles.scientificName}>{d.scientific_name}</Text>
        <View style={styles.statsRow}>
          {params.ph_range?.min != null && (
            <View style={styles.statItem}>
              <Ionicons name="water-outline" size={12} color={theme.colors.primary} />
              <Text style={styles.statText}>pH {params.ph_range.min}-{params.ph_range.max}</Text>
            </View>
          )}
          {temp.min != null && (
            <View style={styles.statItem}>
              <Ionicons name="thermometer-outline" size={12} color={theme.colors.primary} />
              <Text style={styles.statText}>{temp.min}°-{temp.max}°C</Text>
            </View>
          )}
          {params.salinity_tolerance_ppt?.max != null && (
            <View style={styles.statItem}>
              <Ionicons name="water" size={12} color={theme.colors.primary} />
              <Text style={styles.statText}>Salinity {params.salinity_tolerance_ppt.min || 0}-{params.salinity_tolerance_ppt.max}ppt</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.ctaButton} onPress={onPress}>
          <Text style={styles.ctaText}>View Species Profile</Text>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.textInverse} />
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
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSpecies = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await speciesService.getAll();
      if (res.success && res.data) {
        // Only accept the result if it has more than the 3-item offline fallback
        // (fallback items have ids like 'sp_1', real DB rows have UUIDs)
        const isFallback = res.data.length <= 3 && res.data[0]?.id?.startsWith('sp_');
        if (!isFallback) {
          setSpeciesList(res.data);
          setFiltered(res.data);
          setLoadError(null);
        } else if (speciesList.length === 0) {
          // Only show offline data if we have nothing better cached
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

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search fish or shrimp species..."
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

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

      {loadError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.accent} />
          <Text style={styles.errorBannerText}>{loadError}</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
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
  loadingText: { marginTop: 12, color: theme.colors.textSecondary },
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
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 4,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  filtersRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    height: 36,
    borderRadius: 18,
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
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 2,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 180,
  },
  imageFallback: {
    height: 180,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  speciesName: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  categoryChip: {
    borderRadius: 8,
    backgroundColor: theme.colors.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryChipText: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scientificName: {
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  ctaButton: {
    marginTop: 16,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaText: {
    color: theme.colors.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: theme.colors.textMuted,
    marginTop: 12,
  },
});
