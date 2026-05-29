/**
 * HatcheryMarketplaceScreen
 * Farmer-facing browse screen for fingerling-ready batches from all hatcheries.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';

interface ListingItem {
  id: string;
  species_name: string;
  species_variant: string | null;
  estimated_fingerling_count: number | null;
  avg_fingerling_weight_g: number | null;
  hatchery_name: string;
  hatchery_district: string;
  hatchery_block: string;
  operator_name: string;
  operator_phone: string;
  updated_at: string;
}

export default function HatcheryMarketplaceScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (search.trim()) params.species = search.trim();
      const res = await api.get('/api/v1/hatcheries/marketplace', { params });
      setListings(res.data?.data ?? []);
    } catch {
      // offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(); };

  const filtered = listings.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.species_name.toLowerCase().includes(q) ||
      (item.species_variant ?? '').toLowerCase().includes(q) ||
      item.hatchery_name.toLowerCase().includes(q) ||
      item.hatchery_district.toLowerCase().includes(q)
    );
  });

  const renderItem = ({ item }: { item: ListingItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('StockFingerlings', { listing: item })}
    >
      <View style={styles.cardTop}>
        <View style={styles.speciesInfo}>
          <Text style={styles.speciesName}>{item.species_name}</Text>
          {item.species_variant && (
            <Text style={styles.speciesVariant}>{item.species_variant}</Text>
          )}
        </View>
        <View style={styles.readyBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
          <Text style={styles.readyBadgeText}>Ready</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        {item.estimated_fingerling_count && (
          <MetaChip
            icon="layers-outline"
            text={`~${item.estimated_fingerling_count.toLocaleString('en-IN')} pcs`}
            theme={theme}
          />
        )}
        {item.avg_fingerling_weight_g && (
          <MetaChip
            icon="scale-outline"
            text={`${parseFloat(String(item.avg_fingerling_weight_g)).toFixed(1)}g avg`}
            theme={theme}
          />
        )}
      </View>

      <View style={styles.hatcheryInfo}>
        <Ionicons name="business-outline" size={14} color={theme.colors.textSecondary} />
        <Text style={styles.hatcheryName}>{item.hatchery_name}</Text>
        <Text style={styles.hatcheryDivider}>·</Text>
        <Text style={styles.hatcheryLocation}>
          {[item.hatchery_block, item.hatchery_district].filter(Boolean).join(', ')}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.operatorInfo}>
          <Ionicons name="person-outline" size={13} color={theme.colors.textMuted} />
          <Text style={styles.operatorName}>{item.operator_name}</Text>
        </View>
        <TouchableOpacity
          style={styles.stockBtn}
          onPress={() => navigation.navigate('StockFingerlings', { listing: item })}
        >
          <Ionicons name="add-circle-outline" size={16} color={theme.colors.textInverse} />
          <Text style={styles.stockBtnText}>Stock My Pond</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Fingerling Marketplace" onBack={() => navigation.goBack()} />

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search species, hatchery, district..."
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => void load()}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="fish-outline" size={64} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Listings Yet</Text>
              <Text style={styles.emptySubtitle}>
                No fingerling-ready batches found. Check back soon or adjust your search.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function MetaChip({ icon, text, theme }: any) {
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.primaryLight ?? '#e0fdf4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
      <Ionicons name={icon} size={13} color={c.primary} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: c.primary }}>{text}</Text>
    </View>
  );
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 16,
      marginVertical: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 46,
    },
    searchInput: { flex: 1, color: c.textPrimary, fontSize: 14 },
    list: { padding: 16, gap: 14, paddingTop: 4 },
    card: {
      backgroundColor: c.surface,
      borderRadius: theme.borderRadius?.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 10,
      ...theme.shadows?.sm,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    speciesInfo: { flex: 1, gap: 2 },
    speciesName: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
    speciesVariant: { fontSize: 13, color: c.textSecondary },
    readyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#dcfce7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    readyBadgeText: { color: '#16a34a', fontSize: 12, fontWeight: '700' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    hatcheryInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    hatcheryName: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    hatcheryDivider: { color: c.textMuted },
    hatcheryLocation: { fontSize: 13, color: c.textMuted, flex: 1 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    operatorInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    operatorName: { fontSize: 12, color: c.textMuted },
    stockBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    stockBtnText: { color: c.textInverse, fontSize: 12, fontWeight: '800' },
    emptyContainer: { padding: 48, alignItems: 'center', gap: 14 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
    emptySubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 21 },
  });
};
