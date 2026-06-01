/**
 * HatcheryDashboardScreen
 * Operator's home screen — shows all batches grouped by stage with live stats.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';

const STAGE_ORDER = ['broodstock', 'spawning', 'hatching', 'nursery', 'rearing', 'fingerling_ready', 'sold'];

const STAGE_META: Record<string, { label: string; color: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = {
  broodstock:       { label: 'Broodstock',        color: '#6366f1', icon: 'fish-outline' },
  spawning:         { label: 'Spawning',           color: '#ec4899', icon: 'pulse-outline' },
  hatching:         { label: 'Hatching',           color: '#f97316', icon: 'sunny-outline' },
  nursery:          { label: 'Nursery',            color: '#14b8a6', icon: 'leaf-outline' },
  rearing:          { label: 'Rearing',            color: '#22c55e', icon: 'trending-up-outline' },
  fingerling_ready: { label: 'Fingerling Ready',  color: '#eab308', icon: 'checkmark-circle-outline' },
  sold:             { label: 'Sold',               color: '#64748b', icon: 'cash-outline' },
};

interface Hatchery {
  id: string;
  name: string;
  district: string;
  block: string;
}

interface Batch {
  id: string;
  hatchery_id: string;
  species_name: string;
  species_variant: string | null;
  current_stage: string;
  estimated_fingerling_count: number | null;
  avg_fingerling_weight_g: number | null;
  spawning_date: string | null;
  updated_at: string;
  log_count: number;
}

export default function HatcheryDashboardScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { currentUser } = useAuth();

  const [hatchery, setHatchery] = useState<Hatchery | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const hatcheriesRes = await api.get('/api/v1/hatcheries');
      if (hatcheriesRes.data?.data?.length) {
        const h = hatcheriesRes.data.data[0];
        setHatchery(h);
        const batchesRes = await api.get(`/api/v1/hatcheries/${h.id}/batches`);
        setBatches(batchesRes.data?.data ?? []);
      } else {
        setHatchery(null);
        setBatches([]);
      }
    } catch {
      // offline — keep whatever was cached
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(); };

  const activeBatches = batches.filter(b => b.current_stage !== 'sold');
  const readyBatches = batches.filter(b => b.current_stage === 'fingerling_ready');
  const totalFingerlings = readyBatches.reduce((sum, b) => sum + (b.estimated_fingerling_count ?? 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Hatchery Dashboard" />
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!hatchery) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Hatchery Dashboard" />
        <View style={styles.center}>
          <Ionicons name="water-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No Hatchery Yet</Text>
          <Text style={styles.emptySubtitle}>Set up your first hatchery to get started.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('AddHatchery')}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.textInverse} />
            <Text style={styles.primaryBtnText}>Create Hatchery</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title={hatchery.name}
        subtitle={[hatchery.block, hatchery.district].filter(Boolean).join(', ')}
        rightSlot={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddEditBatch', { hatcheryId: hatchery.id })}
          >
            <Ionicons name="add" size={22} color={theme.colors.textInverse} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Stats bento row */}
        <View style={styles.statsRow}>
          <StatCard label="Active Batches" value={activeBatches.length} icon="layers-outline" theme={theme} />
          <StatCard label="Ready to Sell" value={readyBatches.length} icon="checkmark-circle-outline" theme={theme} accent={theme.colors.secondary} />
          <StatCard label="Fingerlings" value={totalFingerlings > 999 ? `${(totalFingerlings / 1000).toFixed(1)}K` : totalFingerlings} icon="fish-outline" theme={theme} />
        </View>

        {/* Marketplace quick actions */}
        <View style={styles.marketplaceRow}>
          <TouchableOpacity
            style={styles.marketplaceCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ManageListings')}
          >
            <View style={[styles.marketplaceIconWrap, { backgroundColor: theme.colors.primary + '22' }]}>
              <Ionicons name="storefront-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.marketplaceCardTitle}>Manage Listings</Text>
              <Text style={styles.marketplaceCardSub}>Post fingerlings for sale</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.marketplaceCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('IncomingOrders', {})}
          >
            <View style={[styles.marketplaceIconWrap, { backgroundColor: '#f59e0b22' }]}>
              <Ionicons name="receipt-outline" size={22} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.marketplaceCardTitle}>Incoming Orders</Text>
              <Text style={styles.marketplaceCardSub}>View & confirm payments</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Batches by stage */}
        {activeBatches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="layers-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyCardText}>No active batches. Tap + to start one.</Text>
          </View>
        ) : (
          STAGE_ORDER.filter(s => s !== 'sold').map(stage => {
            const stageBatches = activeBatches.filter(b => b.current_stage === stage);
            if (!stageBatches.length) return null;
            const meta = STAGE_META[stage];
            return (
              <View key={stage} style={styles.stageSection}>
                <View style={styles.stageHeader}>
                  <View style={[styles.stageIcon, { backgroundColor: meta.color + '22' }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <Text style={[styles.stageLabel, { color: meta.color }]}>{meta.label}</Text>
                  <View style={[styles.stageBadge, { backgroundColor: meta.color + '22' }]}>
                    <Text style={[styles.stageBadgeText, { color: meta.color }]}>{stageBatches.length}</Text>
                  </View>
                </View>

                {stageBatches.map(batch => (
                  <TouchableOpacity
                    key={batch.id}
                    style={styles.batchCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('BatchDetail', { batchId: batch.id })}
                  >
                    <View style={styles.batchCardLeft}>
                      <Text style={styles.batchSpecies}>
                        {batch.species_name}
                        {batch.species_variant ? ` • ${batch.species_variant}` : ''}
                      </Text>
                      {batch.estimated_fingerling_count ? (
                        <Text style={styles.batchMeta}>
                          ~{batch.estimated_fingerling_count.toLocaleString()} fingerlings
                        </Text>
                      ) : null}
                      <Text style={styles.batchMeta}>
                        {batch.log_count} log{batch.log_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.batchCardRight}>
                      <View style={[styles.stagePill, { backgroundColor: meta.color + '22' }]}>
                        <Text style={[styles.stagePillText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      {stage === 'fingerling_ready' && (
                        <TouchableOpacity
                          style={styles.sellBtn}
                          onPress={() => navigation.navigate('FingerlingSales', { batchId: batch.id })}
                        >
                          <Text style={styles.sellBtnText}>Sell</Text>
                        </TouchableOpacity>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} style={{ marginTop: 8 }} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}

        {/* Recent sold */}
        {batches.filter(b => b.current_stage === 'sold').length > 0 && (
          <View style={styles.stageSection}>
            <View style={styles.stageHeader}>
              <View style={[styles.stageIcon, { backgroundColor: '#64748b22' }]}>
                <Ionicons name="cash-outline" size={18} color="#64748b" />
              </View>
              <Text style={[styles.stageLabel, { color: '#64748b' }]}>Sold</Text>
            </View>
            {batches.filter(b => b.current_stage === 'sold').slice(0, 3).map(batch => (
              <TouchableOpacity
                key={batch.id}
                style={[styles.batchCard, { opacity: 0.72 }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('BatchDetail', { batchId: batch.id })}
              >
                <View style={styles.batchCardLeft}>
                  <Text style={styles.batchSpecies}>{batch.species_name}</Text>
                  <Text style={styles.batchMeta}>{new Date(batch.updated_at).toLocaleDateString('en-IN')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, theme, accent }: any) {
  const c = theme.colors;
  const color = accent || c.primary;
  return (
    <View style={{
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: theme.borderRadius?.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      alignItems: 'center',
      gap: 6,
      ...theme.shadows?.sm,
    }}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={{ fontSize: 22, fontWeight: '800', color: c.textPrimary }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.textMuted, textAlign: 'center', fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
    scroll: { padding: 16, gap: 16 },
    statsRow: { flexDirection: 'row', gap: 10 },
    marketplaceRow: { gap: 10 },
    marketplaceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: theme.borderRadius?.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      ...theme.shadows?.sm,
    },
    marketplaceIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    marketplaceCardTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
    marketplaceCardSub:   { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    stageSection: { gap: 8 },
    stageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
    stageIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    stageLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3, flex: 1 },
    stageBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    stageBadgeText: { fontSize: 12, fontWeight: '800' },
    batchCard: {
      backgroundColor: c.surface,
      borderRadius: theme.borderRadius?.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      ...theme.shadows?.sm,
    },
    batchCardLeft: { flex: 1, gap: 4 },
    batchCardRight: { alignItems: 'flex-end', gap: 4, marginLeft: 10 },
    batchSpecies: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    batchMeta: { fontSize: 12, color: c.textSecondary },
    stagePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    stagePillText: { fontSize: 11, fontWeight: '700' },
    sellBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      marginTop: 4,
    },
    sellBtnText: { color: c.textInverse, fontSize: 12, fontWeight: '800' },
    emptyCard: {
      backgroundColor: c.surface,
      borderRadius: theme.borderRadius?.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 32,
      alignItems: 'center',
      gap: 12,
    },
    emptyCardText: { color: c.textSecondary, fontSize: 14, textAlign: 'center' },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 24,
      marginTop: 8,
    },
    primaryBtnText: { color: c.textInverse, fontWeight: '800', fontSize: 15 },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};
