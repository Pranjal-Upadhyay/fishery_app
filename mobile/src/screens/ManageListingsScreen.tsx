/**
 * ManageListingsScreen
 * Hatchery operator views, manages and creates fingerling/fry listings.
 * Tapping "New Listing" opens CreateListingScreen.
 * Tapping a listing shows its orders.
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
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';

interface MyListing {
    id: string;
    stage: 'fry' | 'fingerling';
    species_name: string;
    species_variant: string | null;
    total_quantity: number;
    quantity_available: number;
    min_order_qty: number;
    price_per_piece: string;
    status: 'ACTIVE' | 'SOLD_OUT' | 'CANCELLED';
    active_orders: number;
    confirmed_orders: number;
    total_revenue: string;
    created_at: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
    ACTIVE:    { label: 'Active',    color: '#22c55e' },
    SOLD_OUT:  { label: 'Sold Out',  color: '#f59e0b' },
    CANCELLED: { label: 'Cancelled', color: '#94a3b8' },
};

const STAGE_COLOR: Record<string, string> = {
    fingerling: '#0ea5e9',
    fry:        '#f59e0b',
};

export default function ManageListingsScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();

    const [listings, setListings] = useState<MyListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/api/v1/marketplace/listings/mine');
            setListings(res.data?.data ?? []);
        } catch {
            // offline
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(); }, [load]));
    const onRefresh = () => { setRefreshing(true); void load(); };

    const handleCancel = (item: MyListing) => {
        Alert.alert(
            'Cancel Listing',
            `Cancel the listing for "${item.species_name}"? Pending orders will still need to be handled separately.`,
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Cancel Listing',
                    style: 'destructive',
                    onPress: async () => {
                        setCancellingId(item.id);
                        try {
                            await api.patch(`/api/v1/marketplace/listings/${item.id}/cancel`);
                            await load();
                        } catch (err: any) {
                            Alert.alert('Error', err?.response?.data?.error ?? 'Could not cancel listing.');
                        } finally {
                            setCancellingId(null);
                        }
                    },
                },
            ],
        );
    };

    // Summary stats
    const activeCount = listings.filter(l => l.status === 'ACTIVE').length;
    const totalRevenue = listings.reduce((sum, l) => sum + parseFloat(l.total_revenue || '0'), 0);
    const pendingOrders = listings.reduce((sum, l) => sum + (parseInt(String(l.active_orders), 10) || 0), 0);

    const renderItem = ({ item }: { item: MyListing }) => {
        const statusMeta = STATUS_META[item.status];
        const stageColor = STAGE_COLOR[item.stage] ?? theme.colors.primary;
        const isCancelling = cancellingId === item.id;
        const soldPct = item.total_quantity > 0
            ? Math.round(((item.total_quantity - item.quantity_available) / item.total_quantity) * 100)
            : 0;

        return (
            <View style={styles.card}>
                {/* Header */}
                <View style={styles.cardTop}>
                    <View style={styles.speciesBlock}>
                        <Text style={styles.speciesName}>{item.species_name}</Text>
                        {item.species_variant ? (
                            <Text style={styles.speciesVariant}>{item.species_variant}</Text>
                        ) : null}
                    </View>
                    <View style={{ gap: 5, alignItems: 'flex-end' }}>
                        <View style={[styles.stageBadge, { backgroundColor: stageColor + '22' }]}>
                            <Text style={[styles.stageBadgeText, { color: stageColor }]}>
                                {item.stage.toUpperCase()}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusMeta.color + '22' }]}>
                            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                                {statusMeta.label}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Price + qty row */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricCell}>
                        <Text style={styles.metricValue}>
                            ₹{parseFloat(item.price_per_piece).toFixed(2)}
                        </Text>
                        <Text style={styles.metricLabel}>per piece</Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.metricCell}>
                        <Text style={styles.metricValue}>
                            {item.quantity_available.toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.metricLabel}>remaining</Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.metricCell}>
                        <Text style={styles.metricValue}>{soldPct}%</Text>
                        <Text style={styles.metricLabel}>sold</Text>
                    </View>
                </View>

                {/* Orders summary */}
                <View style={styles.ordersSummary}>
                    <View style={styles.ordersChip}>
                        <Ionicons name="receipt-outline" size={13} color={theme.colors.primary} />
                        <Text style={styles.ordersChipText}>
                            {item.active_orders} active order{parseInt(String(item.active_orders), 10) !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    {parseFloat(item.total_revenue) > 0 && (
                        <View style={[styles.ordersChip, { backgroundColor: '#dcfce7' }]}>
                            <Ionicons name="cash-outline" size={13} color="#16a34a" />
                            <Text style={[styles.ordersChipText, { color: '#16a34a' }]}>
                                ₹{parseFloat(item.total_revenue).toLocaleString('en-IN')} earned
                            </Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                {isCancelling ? (
                    <ActivityIndicator color={theme.colors.primary} />
                ) : item.status === 'ACTIVE' ? (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.cancelListingBtn}
                            activeOpacity={0.8}
                            onPress={() => handleCancel(item)}
                        >
                            <Ionicons name="close-circle-outline" size={15} color={theme.colors.error} />
                            <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>Cancel Listing</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.viewOrdersBtn}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('IncomingOrders', { listingId: item.id })}
                        >
                            <Ionicons name="receipt-outline" size={15} color={theme.colors.textInverse} />
                            <Text style={[styles.actionBtnText, { color: theme.colors.textInverse }]}>View Orders</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.viewOrdersBtn}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('IncomingOrders', { listingId: item.id })}
                    >
                        <Ionicons name="receipt-outline" size={15} color={theme.colors.textInverse} />
                        <Text style={[styles.actionBtnText, { color: theme.colors.textInverse }]}>View Orders</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader
                title="My Listings"
                onBack={() => navigation.goBack()}
                rightSlot={
                    <TouchableOpacity
                        style={styles.newListingBtn}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('CreateListing')}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.textInverse} />
                    </TouchableOpacity>
                }
            />

            {/* Summary stats */}
            {!loading && listings.length > 0 ? (
                <View style={styles.summaryRow}>
                    <SummaryChip icon="checkmark-circle-outline" value={String(activeCount)} label="Active" theme={theme} />
                    <SummaryChip icon="receipt-outline" value={String(pendingOrders)} label="Pending Orders" theme={theme} />
                    <SummaryChip icon="cash-outline" value={`₹${totalRevenue.toLocaleString('en-IN')}`} label="Total Earned" theme={theme} accent={theme.colors.primary} />
                </View>
            ) : null}

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
                            <Text style={styles.emptyTitle}>No Listings Yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Create your first listing to sell fingerlings or fry to farmers.
                            </Text>
                            <TouchableOpacity
                                style={styles.createFirstBtn}
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate('CreateListing')}
                            >
                                <Ionicons name="add-circle-outline" size={18} color={theme.colors.textInverse} />
                                <Text style={styles.createFirstBtnText}>Create First Listing</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

function SummaryChip({ icon, value, label, theme, accent }: any) {
    const c = theme.colors;
    const color = accent ?? c.textSecondary;
    return (
        <View style={{ flex: 1, alignItems: 'center', gap: 4, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 10 }}>
            <Ionicons name={icon} size={16} color={color} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: c.textPrimary }}>{value}</Text>
            <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
        </View>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    const r = theme.borderRadius ?? {};
    return StyleSheet.create({
        safeArea:   { flex: 1, backgroundColor: c.background },
        center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
        summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
        list:       { padding: 16, paddingTop: 4, gap: 14 },
        card: {
            backgroundColor: c.surface,
            borderRadius: r.lg ?? 16,
            borderWidth: 1,
            borderColor: c.border,
            padding: 16,
            gap: 12,
            ...(theme.shadows?.sm ?? {}),
        },
        cardTop:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
        speciesBlock: { flex: 1, gap: 2 },
        speciesName:  { fontSize: 17, fontWeight: '800', color: c.textPrimary },
        speciesVariant: { fontSize: 13, color: c.textSecondary },
        stageBadge:   { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
        stageBadgeText: { fontSize: 11, fontWeight: '800' },
        statusBadge:  { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
        statusBadgeText: { fontSize: 11, fontWeight: '700' },
        metricsRow:   { flexDirection: 'row', backgroundColor: c.background, borderRadius: 12, padding: 12, alignItems: 'center' },
        metricCell:   { flex: 1, alignItems: 'center', gap: 3 },
        metricValue:  { fontSize: 16, fontWeight: '800', color: c.textPrimary },
        metricLabel:  { fontSize: 10, color: c.textMuted, fontWeight: '600' },
        metricDivider:{ width: 1, height: 32, marginHorizontal: 4 },
        ordersSummary:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        ordersChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: c.primaryLight ?? '#e0fdf4',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
        },
        ordersChipText: { fontSize: 12, fontWeight: '700', color: c.primary },
        actionsRow:   { flexDirection: 'row', gap: 10 },
        cancelListingBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderWidth: 1,
            borderColor: c.error ?? '#ef4444',
            borderRadius: 12,
            paddingVertical: 10,
        },
        viewOrdersBtn: {
            flex: 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: c.primary,
            borderRadius: 12,
            paddingVertical: 10,
        },
        actionBtnText: { fontSize: 13, fontWeight: '800' },
        newListingBtn: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        emptyContainer: { padding: 48, alignItems: 'center', gap: 14 },
        emptyTitle:     { fontSize: 20, fontWeight: '800', color: c.textPrimary },
        emptySubtitle:  { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 21 },
        createFirstBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.primary,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 14,
        },
        createFirstBtnText: { color: c.textInverse, fontWeight: '800', fontSize: 14 },
    });
};
