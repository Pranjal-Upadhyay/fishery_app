/**
 * BatchDetailScreen
 * Vertical stage timeline + log history + stage advancement.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api, { marketplaceService, MarketplaceListing } from '../services/apiService';

const STAGE_ORDER = ['broodstock', 'spawning', 'hatching', 'nursery', 'rearing', 'fingerling_ready', 'sold'];

const STAGE_META: Record<string, { label: string; color: string }> = {
  broodstock:       { label: 'Broodstock',       color: '#6366f1' },
  spawning:         { label: 'Spawning',          color: '#ec4899' },
  hatching:         { label: 'Hatching',          color: '#f97316' },
  nursery:          { label: 'Nursery',           color: '#14b8a6' },
  rearing:          { label: 'Rearing',           color: '#22c55e' },
  fingerling_ready: { label: 'Fingerling Ready', color: '#eab308' },
  sold:             { label: 'Sold',              color: '#64748b' },
};

interface BatchData {
  batch: any;
  logs: any[];
  benchmarks: any[];
}

export default function BatchDetailScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { batchId } = route.params ?? {};

  const [data, setData] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Tracks whether this batch already has an open marketplace listing.
  // ACTIVE here means DRAFT / UPCOMING / AVAILABLE — i.e. not closed/expired.
  // If active, we hide "List to Market" and surface "View Listing" instead so
  // the operator can't accidentally double-list the same batch.
  const [existingListing, setExistingListing] = useState<MarketplaceListing | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/hatcheries/batches/${batchId}`);
      setData(res.data?.data ?? null);

      // Look up listings owned by this hatchery and find one bound to this batch
      // that is still in an active lifecycle state. Failure here is silent — we
      // simply fall back to showing "List to Market".
      try {
        const myListings = (await marketplaceService.getMyListings()) as MarketplaceListing[];
        const active = myListings.find(
          (l) =>
            l.batch_id === batchId &&
            ['DRAFT', 'UPCOMING', 'AVAILABLE'].includes(l.status)
        );
        setExistingListing(active ?? null);
      } catch {
        setExistingListing(null);
      }
    } catch {
      // keep stale
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [batchId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(); };

  const currentStageIdx = STAGE_ORDER.indexOf(data?.batch?.current_stage ?? 'broodstock');
  const nextStage = STAGE_ORDER[currentStageIdx + 1] ?? null;

  const handleAdvanceStage = () => {
    if (!nextStage) return;
    const nextMeta = STAGE_META[nextStage];
    Alert.alert(
      `Advance to ${nextMeta.label}?`,
      `Move this batch from ${STAGE_META[data!.batch.current_stage]?.label ?? data!.batch.current_stage} to ${nextMeta.label}. This will be logged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Advance',
          onPress: async () => {
            setAdvancing(true);
            try {
              await api.patch(`/api/v1/hatcheries/batches/${batchId}/stage`, { new_stage: nextStage });
              await load();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.error ?? 'Failed to advance stage.');
            } finally {
              setAdvancing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Batch Details" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Batch Details" onBack={() => navigation.goBack()} />
        <View style={styles.center}><Text style={styles.errorText}>Batch not found.</Text></View>
      </SafeAreaView>
    );
  }

  const batch = data.batch;
  const currentMeta = STAGE_META[batch.current_stage] ?? { label: batch.current_stage, color: theme.colors.primary };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title={`${batch.species_name}${batch.species_variant ? ` · ${batch.species_variant}` : ''}`}
        subtitle={batch.hatchery_name ?? undefined}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Current stage banner */}
        <View style={[styles.stageBanner, { borderColor: currentMeta.color + '44' }]}>
          <View style={[styles.stageBannerDot, { backgroundColor: currentMeta.color }]} />
          <Text style={[styles.stageBannerText, { color: currentMeta.color }]}>
            Current Stage: {currentMeta.label}
          </Text>
        </View>

        {/* Key metrics */}
        <View style={styles.metricsRow}>
          {(batch.estimated_fingerling_count ?? 0) > 0 && (
            <MetricCard
              label="Fingerlings"
              value={parseInt(batch.estimated_fingerling_count).toLocaleString('en-IN')}
              icon="fish-outline"
              theme={theme}
            />
          )}
          {(batch.avg_fingerling_weight_g ?? 0) > 0 && (
            <MetricCard
              label="Avg Weight"
              value={`${parseFloat(batch.avg_fingerling_weight_g).toFixed(1)}g`}
              icon="scale-outline"
              theme={theme}
            />
          )}
          {(batch.broodstock_total_kg ?? 0) > 0 && (
            <MetricCard
              label="Broodstock"
              value={`${parseFloat(batch.broodstock_total_kg)}kg`}
              icon="body-outline"
              theme={theme}
            />
          )}
        </View>

        {/* Stage timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lifecycle Timeline</Text>
          {STAGE_ORDER.map((stage, idx) => {
            const meta = STAGE_META[stage];
            const isCompleted = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            const isFuture = idx > currentStageIdx;
            const benchmark = data.benchmarks.find((b: any) => b.stage === stage);
            const isLast = idx === STAGE_ORDER.length - 1;

            return (
              <View key={stage} style={styles.timelineRow}>
                {/* connector */}
                <View style={styles.timelineConnectorCol}>
                  <View style={[
                    styles.timelineDot,
                    isCompleted && { backgroundColor: theme.colors.primary },
                    isCurrent && { backgroundColor: meta.color, width: 18, height: 18, borderRadius: 9 },
                    isFuture && { backgroundColor: theme.colors.border },
                  ]}>
                    {isCompleted && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                  {!isLast && <View style={[styles.timelineLine, isCompleted && { backgroundColor: theme.colors.primary }]} />}
                </View>

                {/* content */}
                <View style={[styles.timelineContent, isCurrent && styles.timelineContentCurrent]}>
                  <View style={styles.timelineHeader}>
                    <Text style={[
                      styles.timelineStageName,
                      isCurrent && { color: meta.color },
                      isFuture && { color: theme.colors.textMuted },
                    ]}>
                      {meta.label}
                    </Text>
                    {isCurrent && (
                      <View style={[styles.currentBadge, { backgroundColor: meta.color + '22' }]}>
                        <Text style={[styles.currentBadgeText, { color: meta.color }]}>CURRENT</Text>
                      </View>
                    )}
                  </View>
                  {benchmark && !isFuture && (
                    <Text style={styles.timelineMeta}>
                      {benchmark.typical_days > 0 ? `~${benchmark.typical_days} days` : benchmark.description}
                    </Text>
                  )}
                  {benchmark && isFuture && (
                    <Text style={[styles.timelineMeta, { color: theme.colors.textMuted }]}>
                      {benchmark.min_days}–{benchmark.max_days} days
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('StageLog', { batchId, currentStage: batch.current_stage })}
          >
            <Ionicons name="clipboard-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>Log Observations</Text>
          </TouchableOpacity>

          {nextStage && batch.current_stage !== 'sold' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary, advancing && { opacity: 0.7 }]}
              onPress={handleAdvanceStage}
              disabled={advancing}
            >
              {advancing ? (
                <ActivityIndicator color={theme.colors.textInverse} size="small" />
              ) : (
                <>
                  <Ionicons name="arrow-forward-circle-outline" size={20} color={theme.colors.textInverse} />
                  <Text style={[styles.actionBtnText, { color: theme.colors.textInverse }]}>
                    Advance to {STAGE_META[nextStage]?.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {batch.current_stage === 'fingerling_ready' && (
            existingListing ? (
              // Batch is already listed — surface a "View Listing" button that
              // jumps straight to the listing detail (read-only for the owner).
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={() =>
                  navigation.navigate('ListingDetail', {
                    listingId: existingListing.id,
                    viewOnly: true,
                  })
                }
              >
                <Ionicons name="eye-outline" size={20} color={theme.colors.textInverse} />
                <Text style={[styles.actionBtnText, { color: theme.colors.textInverse }]}>
                  View Listing on Marketplace
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSell]}
                onPress={() => navigation.navigate('CreateListing', { batchId })}
              >
                <Ionicons name="storefront-outline" size={20} color={theme.colors.textInverse} />
                <Text style={[styles.actionBtnText, { color: theme.colors.textInverse }]}>List to Market</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Log history */}
        {data.logs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Logs</Text>
            {data.logs.map((log: any) => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.logItemHeader}>
                  <View style={[styles.logStagePill, { backgroundColor: (STAGE_META[log.stage]?.color ?? theme.colors.primary) + '22' }]}>
                    <Text style={[styles.logStagePillText, { color: STAGE_META[log.stage]?.color ?? theme.colors.primary }]}>
                      {STAGE_META[log.stage]?.label ?? log.stage}
                    </Text>
                  </View>
                  <Text style={styles.logDate}>{new Date(log.created_at).toLocaleDateString('en-IN')}</Text>
                </View>
                {log.survival_rate_pct && (
                  <Text style={styles.logDetail}>Survival: {log.survival_rate_pct}%</Text>
                )}
                {log.water_temp && (
                  <Text style={styles.logDetail}>
                    Temp: {log.water_temp}°C · pH: {log.ph ?? '—'} · DO: {log.do_mgl ?? '—'} mg/L
                  </Text>
                )}
                {log.observations && (
                  <Text style={styles.logObservation}>{log.observations}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, icon, theme }: any) {
  const c = theme.colors;
  return (
    <View style={{
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      alignItems: 'center',
      gap: 4,
    }}>
      <Ionicons name={icon} size={18} color={c.primary} />
      <Text style={{ fontSize: 18, fontWeight: '800', color: c.textPrimary }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: c.textSecondary, fontSize: 16 },
    scroll: { padding: 16, gap: 14 },
    stageBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 2,
      padding: 14,
    },
    stageBannerDot: { width: 12, height: 12, borderRadius: 6 },
    stageBannerText: { fontSize: 16, fontWeight: '800' },
    metricsRow: { flexDirection: 'row', gap: 10 },
    card: {
      backgroundColor: c.surface,
      borderRadius: theme.borderRadius?.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 4,
    },
    cardTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary, marginBottom: 12 },
    timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
    timelineConnectorCol: { alignItems: 'center', width: 18 },
    timelineDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.isDark ? c.border : '#e2e8f0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineLine: { width: 2, flex: 1, backgroundColor: c.border, marginVertical: 2, minHeight: 24 },
    timelineContent: { flex: 1, paddingBottom: 16 },
    timelineContentCurrent: {
      backgroundColor: c.primaryLight ?? c.surfaceLow ?? c.surface,
      borderRadius: 12,
      padding: 10,
      marginTop: -2,
    },
    timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    timelineStageName: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    timelineMeta: { fontSize: 12, color: c.textSecondary },
    currentBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
    currentBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    actionsCard: {
      backgroundColor: c.surface,
      borderRadius: theme.borderRadius?.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 10,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.primary,
    },
    actionBtnPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    actionBtnSell: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    actionBtnText: { fontSize: 14, fontWeight: '700' },
    logItem: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 12,
      marginTop: 8,
      gap: 4,
    },
    logItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    logStagePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    logStagePillText: { fontSize: 11, fontWeight: '700' },
    logDate: { color: c.textMuted, fontSize: 12 },
    logDetail: { fontSize: 13, color: c.textSecondary },
    logObservation: { fontSize: 13, color: c.textPrimary, fontStyle: 'italic' },
  });
};
