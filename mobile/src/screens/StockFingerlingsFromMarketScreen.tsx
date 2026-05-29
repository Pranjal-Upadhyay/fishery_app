/**
 * StockFingerlingsFromMarketScreen
 * When a farmer taps "Stock My Pond" on a marketplace listing, they land here
 * to pick which pond they want to stock. Selecting a pond opens the
 * StockFingerlingsSheet pre-filled with the listing data.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import StockFingerlingsSheet from '../components/StockFingerlingsSheet';
import database from '../database';
import Pond from '../database/models/Pond';
import { Q } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';

interface ListingItem {
  id: string;
  species_name: string;
  species_variant: string | null;
  estimated_fingerling_count: number | null;
  avg_fingerling_weight_g: number | null;
  hatchery_name: string;
  hatchery_district: string;
}

function StockFromMarket({ ponds }: { ponds: Pond[] }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const listing: ListingItem | undefined = route.params?.listing;

  const [selectedPond, setSelectedPond] = useState<Pond | null>(null);

  // Filter to non-active ponds that can be stocked
  const eligiblePonds = ponds.filter(p => p.status !== 'ACTIVE');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Choose a Pond" onBack={() => navigation.goBack()} />

      {/* Listing summary banner */}
      {listing && (
        <View style={styles.listingBanner}>
          <View style={styles.listingBannerLeft}>
            <Ionicons name="fish-outline" size={18} color={theme.colors.primary} />
            <View>
              <Text style={styles.listingSpecies}>
                {listing.species_name}
                {listing.species_variant ? ` · ${listing.species_variant}` : ''}
              </Text>
              <Text style={styles.listingMeta}>
                {listing.hatchery_name}
                {listing.hatchery_district ? ` · ${listing.hatchery_district}` : ''}
              </Text>
            </View>
          </View>
          {listing.estimated_fingerling_count && (
            <Text style={styles.listingCount}>
              ~{listing.estimated_fingerling_count.toLocaleString('en-IN')} pcs
            </Text>
          )}
        </View>
      )}

      <Text style={styles.instructionText}>Select the pond you want to stock with fingerlings:</Text>

      {eligiblePonds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="water-outline" size={56} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No Eligible Ponds</Text>
          <Text style={styles.emptySubtitle}>
            All your ponds are currently active. Harvest an existing pond first to stock new fingerlings.
          </Text>
        </View>
      ) : (
        <FlatList
          data={eligiblePonds}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pondCard}
              activeOpacity={0.85}
              onPress={() => setSelectedPond(item)}
            >
              <View style={styles.pondCardLeft}>
                <View style={[styles.pondDot, { backgroundColor: theme.colors.primary + '33' }]}>
                  <Ionicons name="water-outline" size={18} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.pondName}>{item.name}</Text>
                  <Text style={styles.pondMeta}>
                    {item.areaHectares} ha · {item.systemType?.replace(/_/g, ' ')}
                    {item.districtName ? ` · ${item.districtName}` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.selectBadge}>
                <Text style={styles.selectBadgeText}>Select</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* StockFingerlingsSheet — pre-filled with marketplace listing */}
      {selectedPond && (
        <StockFingerlingsSheet
          visible={Boolean(selectedPond)}
          onClose={() => setSelectedPond(null)}
          pondId={selectedPond.id}
          prefilledListing={listing ?? null}
          onSuccess={() => {
            setSelectedPond(null);
            navigation.popToTop?.() ?? navigation.goBack();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const EnhancedStockFromMarket = withObservables([], () => ({
  ponds: database.collections
    .get<Pond>('ponds')
    .query(Q.where('sync_status', Q.notEq('DELETED')))
    .observe(),
}))(StockFromMarket);

export default function StockFingerlingsFromMarketScreen() {
  return <EnhancedStockFromMarket />;
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    listingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.primaryLight ?? '#e0fdf4',
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    listingBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    listingSpecies: { fontSize: 14, fontWeight: '800', color: c.primary },
    listingMeta: { fontSize: 12, color: c.primary + 'aa', marginTop: 2 },
    listingCount: { fontSize: 13, fontWeight: '700', color: c.primary },
    instructionText: {
      fontSize: 13,
      color: c.textSecondary,
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 8,
      fontWeight: '600',
    },
    list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
    pondCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: theme.borderRadius?.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },
    pondCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    pondDot: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pondName: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    pondMeta: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    selectBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    selectBadgeText: { fontSize: 13, fontWeight: '700', color: c.primary },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
    emptySubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 21 },
  });
};
