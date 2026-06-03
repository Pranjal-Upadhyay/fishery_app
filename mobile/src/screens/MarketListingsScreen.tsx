/**
 * MarketListingsScreen
 * Farmer-facing browse screen for the fingerling marketplace.
 * Shows AVAILABLE listings by default; toggle reveals UPCOMING listings too.
 * Cards show gov. UID, location snapshot, bulk price tier, logistics support.
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
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { marketplaceService, MarketplaceListing, Stage } from '../services/apiService';

const STAGE_FILTERS: { key: '' | Stage; label: string }[] = [
    { key: '',           label: 'All' },
    { key: 'fingerling', label: 'Fingerling' },
    { key: 'fry',        label: 'Fry' },
];

const STAGE_COLOR: Record<string, string> = {
    fingerling: '#0ea5e9',
    fry:        '#f59e0b',
};

function formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function MarketListingsScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();

    const [listings, setListings] = useState<MarketplaceListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState<'' | Stage>('');
    const [includeUpcoming, setIncludeUpcoming] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await marketplaceService.browseListings({
                stage: stageFilter || undefined,
                species: search.trim() || undefined,
                includeUpcoming,
            });
            setListings(data);
        } catch {
            // keep stale
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [stageFilter, search, includeUpcoming]);

    useFocusEffect(useCallback(() => { void load(); }, [load]));
    const onRefresh = () => { setRefreshing(true); void load(); };

    const renderItem = ({ item }: { item: MarketplaceListing }) => {
        const stageColor = STAGE_COLOR[item.stage] ?? theme.colors.primary;
        const price = parseFloat(item.price_per_piece);
        const availPct = item.total_quantity > 0
            ? Math.round((item.quantity_available / item.total_quantity) * 100)
            : 0;
        const isUpcoming = item.status === 'UPCOMING';

        const locText = [item.block_snapshot, item.district_snapshot]
            .filter(Boolean).join(', ') || 'Location not available';

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            >
                {/* Top: species + status */}
                <View style={styles.cardTop}>
                    <View style={styles.speciesBlock}>
                        <Text style={styles.speciesName}>{item.species_name}</Text>
                        {item.species_variant ? (
                            <Text style={styles.speciesVariant}>{item.species_variant}</Text>
                        ) : null}
                    </View>
                    <View style={{ gap: 6, alignItems: 'flex-end' }}>
                        <View style={[styles.stageBadge, { backgroundColor: stageColor + '22' }]}>
                            <Ionicons name="fish-outline" size={12} color={stageColor} />
                            <Text style={[styles.stageBadgeText, { color: stageColor }]}>
                                {item.stage.toUpperCase()}
                            </Text>
                        </View>
                        {isUpcoming && (
                            <View style={styles.upcomingBadge}>
                                <Ionicons name="calendar-outline" size={11} color="#fff" />
                                <Text style={styles.upcomingBadgeText}>
                                    {formatDate(item.expected_ready_date)}
                                </Text>
                            </View>
                        )}
                        {!isUpcoming && (
                            <View style={styles.availBadge}>
                                <Text style={styles.availBadgeText}>AVAILABLE</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <StatChip
                        icon="cash-outline"
                        label={`₹${price.toFixed(2)}/pc`}
                        color={theme.colors.primary}
                    />
                    {!isUpcoming && (
                        <StatChip
                            icon="layers-outline"
                            label={`${item.quantity_available.toLocaleString('en-IN')} avail`}
                            color={availPct < 20 ? '#ef4444' : '#22c55e'}
                        />
                    )}
                    <StatChip
                        icon="bag-outline"
                        label={`Min ${item.min_order_qty}`}
                        color={theme.colors.textSecondary}
                    />
                    {item.bulk_price_per_piece && item.bulk_price_threshold && (
                        <StatChip
                            icon="pricetag-outline"
                            label={`Bulk ₹${parseFloat(item.bulk_price_per_piece).toFixed(2)} @ ${item.bulk_price_threshold}+`}
                            color="#22c55e"
                        />
                    )}
                </View>

                {/* Logistics badges */}
                <View style={styles.logRow}>
                    {item.pickup_available && (
                        <View style={styles.logChip}>
                            <Ionicons name="walk-outline" size={11} color={theme.colors.textSecondary} />
                            <Text style={styles.logChipText}>Pickup</Text>
                        </View>
                    )}
                    {item.delivery_available && (
                        <View style={styles.logChip}>
                            <Ionicons name="car-outline" size={11} color={theme.colors.textSecondary} />
                            <Text style={styles.logChipText}>Delivery</Text>
                        </View>
                    )}
                </View>

                {/* Hatchery row */}
                <View style={styles.hatcheryRow}>
                    <Ionicons name="business-outline" size={13} color={theme.colors.textSecondary} />
                    <Text style={styles.hatcheryName}>{item.hatchery_name}</Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.hatcheryLoc} numberOfLines={1}>{locText}</Text>
                </View>

                {/* UID strip */}
                {item.hatchery_uid_snapshot && (
                    <View style={styles.uidStrip}>
                        <Ionicons name="shield-checkmark" size={11} color="#22c55e" />
                        <Text style={styles.uidStripText}>UID: {item.hatchery_uid_snapshot}</Text>
                    </View>
                )}

                {/* CTA */}
                <View style={styles.cardFooter}>
                    <View style={styles.operatorRow}>
                        <Ionicons name="person-outline" size={12} color={theme.colors.textMuted} />
                        <Text style={styles.operatorName} numberOfLines={1}>{item.operator_name}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.orderBtn, isUpcoming && styles.orderBtnUpcoming]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
                    >
                        <Ionicons
                            name={isUpcoming ? 'star-outline' : 'cart-outline'}
                            size={15}
                            color={theme.colors.textInverse}
                        />
                        <Text style={styles.orderBtnText}>
                            {isUpcoming ? 'Express Interest' : 'Order'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader
                title="Fingerling Market"
                onBack={() => navigation.goBack()}
                rightSlot={
                    <TouchableOpacity
                        style={styles.ordersBtn}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('MyOrders')}
                    >
                        <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.ordersBtnText}>My Orders</Text>
                    </TouchableOpacity>
                }
            />

            {/* Search bar */}
            <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search species, hatchery..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={() => void load()}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearch(''); }} activeOpacity={0.7}>
                        <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Stage filter chips + Upcoming toggle */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
            >
                {STAGE_FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterChip, stageFilter === f.key && styles.filterChipActive]}
                        onPress={() => setStageFilter(f.key)}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.filterChipText,
                            stageFilter === f.key && styles.filterChipTextActive,
                        ]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity
                    style={[styles.filterChip, includeUpcoming && styles.filterChipActive]}
                    onPress={() => setIncludeUpcoming(prev => !prev)}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="calendar-outline"
                        size={12}
                        color={includeUpcoming ? theme.colors.textInverse : theme.colors.textSecondary}
                    />
                    <Text style={[
                        styles.filterChipText,
                        includeUpcoming && styles.filterChipTextActive,
                        { marginLeft: 4 },
                    ]}>
                        + Upcoming
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={listings}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="storefront-outline" size={64} color={theme.colors.textMuted} />
                            <Text style={styles.emptyTitle}>No Listings Found</Text>
                            <Text style={styles.emptySubtitle}>
                                {includeUpcoming
                                    ? 'No active or upcoming listings match your filters.'
                                    : 'No active listings. Toggle "+ Upcoming" to see batches in production.'}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

function StatChip({ icon, label, color }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    color: string;
}) {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: color + '18',
            paddingHorizontal: 9, paddingVertical: 5,
            borderRadius: 999,
        }}>
            <Ionicons name={icon} size={12} color={color} />
            <Text style={{ fontSize: 11, fontWeight: '700', color }}>{label}</Text>
        </View>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    const r = theme.borderRadius ?? {};
    return StyleSheet.create({
        safeArea: { flex: 1, backgroundColor: c.background },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginHorizontal: 16,
            marginVertical: 10,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            paddingHorizontal: 14,
            height: 46,
        },
        searchInput: { flex: 1, color: c.textPrimary, fontSize: 14 },
        filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
        filterChip: {
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
        },
        filterChipActive: {
            backgroundColor: c.primary,
            borderColor: c.primary,
        },
        filterChipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
        filterChipTextActive: { color: c.textInverse },
        list: { padding: 16, paddingTop: 4, gap: 14 },
        card: {
            backgroundColor: c.surface,
            borderRadius: r.lg ?? 16,
            borderWidth: 1,
            borderColor: c.border,
            padding: 16,
            gap: 10,
            ...(theme.shadows?.sm ?? {}),
        },
        cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
        speciesBlock: { flex: 1, gap: 2 },
        speciesName: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
        speciesVariant: { fontSize: 13, color: c.textSecondary },
        stageBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 999,
            alignSelf: 'flex-end',
        },
        stageBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
        availBadge: {
            paddingHorizontal: 8, paddingVertical: 3,
            backgroundColor: '#22c55e',
            borderRadius: 999,
            alignSelf: 'flex-end',
        },
        availBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
        upcomingBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 8, paddingVertical: 3,
            backgroundColor: '#f59e0b',
            borderRadius: 999,
            alignSelf: 'flex-end',
        },
        upcomingBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
        statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
        logRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
        logChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
        },
        logChipText: { fontSize: 10, fontWeight: '700', color: c.textSecondary },
        hatcheryRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        hatcheryName: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
        dot: { color: c.textMuted },
        hatcheryLoc: { fontSize: 13, color: c.textMuted, flex: 1 },
        uidStrip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 9,
            paddingVertical: 4,
            backgroundColor: '#22c55e15',
            borderRadius: 8,
            alignSelf: 'flex-start',
        },
        uidStripText: { fontSize: 11, fontWeight: '700', color: '#22c55e' },
        cardFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 2,
            gap: 8,
        },
        operatorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
        operatorName: { fontSize: 12, color: c.textMuted },
        orderBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: c.primary,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
        },
        orderBtnUpcoming: { backgroundColor: '#f59e0b' },
        orderBtnText: { color: c.textInverse, fontSize: 12, fontWeight: '800' },
        ordersBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            borderWidth: 1,
            borderColor: c.primary,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
        },
        ordersBtnText: { color: c.primary, fontSize: 12, fontWeight: '700' },
        emptyContainer: { padding: 48, alignItems: 'center', gap: 14 },
        emptyTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
        emptySubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 21 },
    });
};
