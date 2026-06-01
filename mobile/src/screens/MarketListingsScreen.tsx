/**
 * MarketListingsScreen
 * Farmer-facing browse screen for the fingerling marketplace.
 * Shows active fingerling_listings posted by hatchery operators.
 * Farmers tap a listing card to view detail and place an order.
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
import api from '../services/apiService';

interface Listing {
    id: string;
    stage: 'fry' | 'fingerling';
    species_name: string;
    species_variant: string | null;
    total_quantity: number;
    quantity_available: number;
    min_order_qty: number;
    price_per_piece: string;
    description: string | null;
    status: string;
    hatchery_name: string;
    hatchery_district: string;
    hatchery_block: string;
    operator_name: string;
    operator_phone: string;
    total_orders: number;
    created_at: string;
}

const STAGE_FILTERS = [
    { key: '', label: 'All' },
    { key: 'fingerling', label: 'Fingerling' },
    { key: 'fry', label: 'Fry' },
];

const STAGE_COLOR: Record<string, string> = {
    fingerling: '#0ea5e9',
    fry:        '#f59e0b',
};

export default function MarketListingsScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();

    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState('');

    const load = useCallback(async () => {
        try {
            const params: Record<string, string> = {};
            if (stageFilter) params.stage = stageFilter;
            if (search.trim()) params.species = search.trim();
            const res = await api.get('/api/v1/marketplace/listings', { params });
            setListings(res.data?.data ?? []);
        } catch {
            // offline — keep cached
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [stageFilter, search]);

    useFocusEffect(useCallback(() => { void load(); }, [load]));
    const onRefresh = () => { setRefreshing(true); void load(); };

    const renderItem = ({ item }: { item: Listing }) => {
        const stageColor = STAGE_COLOR[item.stage] ?? theme.colors.primary;
        const price = parseFloat(item.price_per_piece);
        const availPct = item.total_quantity > 0
            ? Math.round((item.quantity_available / item.total_quantity) * 100)
            : 0;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            >
                {/* Top row */}
                <View style={styles.cardTop}>
                    <View style={styles.speciesBlock}>
                        <Text style={styles.speciesName}>{item.species_name}</Text>
                        {item.species_variant ? (
                            <Text style={styles.speciesVariant}>{item.species_variant}</Text>
                        ) : null}
                    </View>
                    <View style={[styles.stageBadge, { backgroundColor: stageColor + '22' }]}>
                        <Ionicons name="fish-outline" size={12} color={stageColor} />
                        <Text style={[styles.stageBadgeText, { color: stageColor }]}>
                            {item.stage.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <StatChip
                        icon="cash-outline"
                        label={`₹${price.toFixed(2)} / piece`}
                        color={theme.colors.primary}
                        theme={theme}
                    />
                    <StatChip
                        icon="layers-outline"
                        label={`${item.quantity_available.toLocaleString('en-IN')} avail`}
                        color={availPct < 20 ? '#ef4444' : '#22c55e'}
                        theme={theme}
                    />
                    <StatChip
                        icon="bag-outline"
                        label={`Min ${item.min_order_qty}`}
                        color={theme.colors.textSecondary}
                        theme={theme}
                    />
                </View>

                {/* Hatchery row */}
                <View style={styles.hatcheryRow}>
                    <Ionicons name="business-outline" size={13} color={theme.colors.textSecondary} />
                    <Text style={styles.hatcheryName}>{item.hatchery_name}</Text>
                    {item.hatchery_district ? (
                        <>
                            <Text style={styles.dot}>·</Text>
                            <Text style={styles.hatcheryLoc}>{item.hatchery_district}</Text>
                        </>
                    ) : null}
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                    <View style={styles.operatorRow}>
                        <Ionicons name="person-outline" size={12} color={theme.colors.textMuted} />
                        <Text style={styles.operatorName}>{item.operator_name}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.orderBtn}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
                    >
                        <Ionicons name="cart-outline" size={15} color={theme.colors.textInverse} />
                        <Text style={styles.orderBtnText}>Order</Text>
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

            {/* Stage filter chips */}
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
                                No active fingerling listings right now. Check back soon.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

function StatChip({ icon, label, color, theme }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    color: string;
    theme: any;
}) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color + '18', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}>
            <Ionicons name={icon} size={12} color={color} />
            <Text style={{ fontSize: 11, fontWeight: '700', color }}>{label}</Text>
        </View>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    const r = theme.borderRadius ?? {};
    return StyleSheet.create({
        safeArea:        { flex: 1, backgroundColor: c.background },
        center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
        filterRow:   { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
        filterChip: {
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
        filterChipText:       { fontSize: 12, fontWeight: '700', color: c.textSecondary },
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
        cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
        speciesBlock: { flex: 1, gap: 2 },
        speciesName:  { fontSize: 18, fontWeight: '800', color: c.textPrimary },
        speciesVariant: { fontSize: 13, color: c.textSecondary },
        stageBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 999,
        },
        stageBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
        statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
        hatcheryRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        hatcheryName: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
        dot:          { color: c.textMuted },
        hatcheryLoc:  { fontSize: 13, color: c.textMuted, flex: 1 },
        cardFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 2,
        },
        operatorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
        orderBtnText:  { color: c.textInverse, fontSize: 12, fontWeight: '800' },
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
        emptyTitle:     { fontSize: 20, fontWeight: '800', color: c.textPrimary },
        emptySubtitle:  { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 21 },
    });
};
