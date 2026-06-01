/**
 * IncomingOrdersScreen
 * Hatchery operator views orders on their listings and confirms payments.
 * Accepts optional listingId param to pre-filter to a single listing.
 * Status flow: PENDING → FARMER_PAID → HATCHERY_CONFIRMED
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
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';

type IncomingOrdersRouteParams = {
    IncomingOrders: { listingId?: string };
};

interface IncomingOrder {
    id: string;
    listing_id: string;
    species_name: string;
    species_variant: string | null;
    stage: string;
    farmer_uid: string | null;
    farmer_name: string;
    farmer_phone: string;
    quantity_ordered: number;
    price_per_piece: string;
    total_amount: string;
    status: 'PENDING' | 'FARMER_PAID' | 'HATCHERY_CONFIRMED' | 'CANCELLED';
    farmer_notes: string | null;
    delivery_address: string | null;
    farmer_paid_at: string | null;
    hatchery_confirmed_at: string | null;
    created_at: string;
}

const STATUS_META: Record<string, { label: string; color: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = {
    PENDING:            { label: 'Pending',      color: '#f59e0b', icon: 'time-outline' },
    FARMER_PAID:        { label: 'Farmer Paid',  color: '#0ea5e9', icon: 'card-outline' },
    HATCHERY_CONFIRMED: { label: 'Confirmed',    color: '#22c55e', icon: 'checkmark-circle-outline' },
    CANCELLED:          { label: 'Cancelled',    color: '#94a3b8', icon: 'close-circle-outline' },
};

const FILTER_TABS = [
    { key: '',                   label: 'All' },
    { key: 'PENDING',            label: 'Pending' },
    { key: 'FARMER_PAID',        label: 'Paid' },
    { key: 'HATCHERY_CONFIRMED', label: 'Confirmed' },
    { key: 'CANCELLED',          label: 'Cancelled' },
];

export default function IncomingOrdersScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<IncomingOrdersRouteParams, 'IncomingOrders'>>();
    const listingId = route.params?.listingId;

    const [orders, setOrders] = useState<IncomingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('');
    const [actionId, setActionId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/api/v1/marketplace/orders/mine');
            const all: IncomingOrder[] = res.data?.data ?? [];
            // Client-side filter by listing when navigated from ManageListings
            setOrders(listingId ? all.filter(o => o.listing_id === listingId) : all);
        } catch {
            // offline — keep cached data
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [listingId]);

    useFocusEffect(useCallback(() => { void load(); }, [load]));
    const onRefresh = () => { setRefreshing(true); void load(); };

    const handleConfirm = (item: IncomingOrder) => {
        Alert.alert(
            'Confirm Payment Received',
            `Confirm that you have received ₹${parseFloat(item.total_amount).toLocaleString('en-IN')} from ${item.farmer_name} for ${item.quantity_ordered.toLocaleString('en-IN')} ${item.stage}s?`,
            [
                { text: 'Not Yet', style: 'cancel' },
                {
                    text: 'Yes, Confirm',
                    onPress: async () => {
                        setActionId(item.id);
                        try {
                            await api.patch(`/api/v1/marketplace/orders/${item.id}/confirm`);
                            await load();
                        } catch (err: any) {
                            Alert.alert('Error', err?.response?.data?.error ?? 'Could not confirm order.');
                        } finally {
                            setActionId(null);
                        }
                    },
                },
            ],
        );
    };

    const handleCancel = (item: IncomingOrder) => {
        Alert.alert(
            'Cancel Order',
            `Cancel the order from ${item.farmer_name}? This will restore ${item.quantity_ordered.toLocaleString('en-IN')} pieces back to the listing.`,
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Cancel Order',
                    style: 'destructive',
                    onPress: async () => {
                        setActionId(item.id);
                        try {
                            await api.patch(`/api/v1/marketplace/orders/${item.id}/cancel`);
                            await load();
                        } catch (err: any) {
                            Alert.alert('Error', err?.response?.data?.error ?? 'Could not cancel order.');
                        } finally {
                            setActionId(null);
                        }
                    },
                },
            ],
        );
    };

    const filtered = filter ? orders.filter(o => o.status === filter) : orders;

    // Summary stats
    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    const awaitingConfirmCount = orders.filter(o => o.status === 'FARMER_PAID').length;
    const confirmedRevenue = orders
        .filter(o => o.status === 'HATCHERY_CONFIRMED')
        .reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);

    const renderItem = ({ item }: { item: IncomingOrder }) => {
        const meta = STATUS_META[item.status];
        const isActioning = actionId === item.id;

        return (
            <View style={styles.card}>
                {/* Header */}
                <View style={styles.cardTop}>
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.speciesName}>
                            {item.species_name}
                            {item.species_variant ? ` · ${item.species_variant}` : ''}
                        </Text>
                        <Text style={styles.stageName}>{item.stage.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: meta.color + '22' }]}>
                        <Ionicons name={meta.icon} size={12} color={meta.color} />
                        <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                </View>

                {/* Farmer info */}
                <View style={styles.farmerRow}>
                    <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.farmerName}>{item.farmer_name}</Text>
                    {item.farmer_uid ? <Text style={styles.farmerMeta}>· {item.farmer_uid}</Text> : null}
                    {item.farmer_phone ? <Text style={styles.farmerMeta}>· {item.farmer_phone}</Text> : null}
                </View>

                {/* Order metrics */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricCell}>
                        <Text style={styles.metricValue}>{item.quantity_ordered.toLocaleString('en-IN')}</Text>
                        <Text style={styles.metricLabel}>qty</Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.metricCell}>
                        <Text style={styles.metricValue}>₹{parseFloat(item.price_per_piece).toFixed(2)}</Text>
                        <Text style={styles.metricLabel}>per piece</Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.metricCell}>
                        <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
                            ₹{parseFloat(item.total_amount).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.metricLabel}>total</Text>
                    </View>
                </View>

                {/* Delivery / Notes */}
                {item.delivery_address ? (
                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
                        <Text style={styles.infoText} numberOfLines={2}>{item.delivery_address}</Text>
                    </View>
                ) : null}
                {item.farmer_notes ? (
                    <View style={styles.infoRow}>
                        <Ionicons name="chatbubble-outline" size={13} color={theme.colors.textMuted} />
                        <Text style={styles.infoText} numberOfLines={2}>{item.farmer_notes}</Text>
                    </View>
                ) : null}

                {/* Timestamp */}
                <Text style={styles.timestamp}>
                    {'Ordered ' + new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {item.farmer_paid_at
                        ? ' · Paid ' + new Date(item.farmer_paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : ''}
                    {item.hatchery_confirmed_at
                        ? ' · Confirmed ' + new Date(item.hatchery_confirmed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : ''}
                </Text>

                {/* Actions */}
                {isActioning ? (
                    <ActivityIndicator color={theme.colors.primary} />
                ) : item.status === 'FARMER_PAID' ? (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            activeOpacity={0.8}
                            onPress={() => handleCancel(item)}
                        >
                            <Ionicons name="close-circle-outline" size={15} color={theme.colors.error} />
                            <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmBtn}
                            activeOpacity={0.8}
                            onPress={() => handleConfirm(item)}
                        >
                            <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Confirm Payment</Text>
                        </TouchableOpacity>
                    </View>
                ) : item.status === 'PENDING' ? (
                    <TouchableOpacity
                        style={[styles.cancelBtn, { alignSelf: 'flex-start' }]}
                        activeOpacity={0.8}
                        onPress={() => handleCancel(item)}
                    >
                        <Ionicons name="close-circle-outline" size={15} color={theme.colors.error} />
                        <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>Cancel Order</Text>
                    </TouchableOpacity>
                ) : item.status === 'HATCHERY_CONFIRMED' ? (
                    <View style={styles.confirmedBanner}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={styles.confirmedText}>Payment confirmed — order complete</Text>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader
                title={listingId ? 'Listing Orders' : 'Incoming Orders'}
                onBack={() => navigation.goBack()}
            />

            {/* Summary chips */}
            {!loading && orders.length > 0 ? (
                <View style={styles.summaryRow}>
                    <SummaryChip icon="time-outline"             value={String(pendingCount)}        label="Pending"    color="#f59e0b" theme={theme} />
                    <SummaryChip icon="card-outline"             value={String(awaitingConfirmCount)} label="Needs Confirm" color="#0ea5e9" theme={theme} />
                    <SummaryChip icon="cash-outline"             value={`₹${confirmedRevenue.toLocaleString('en-IN')}`} label="Confirmed" color="#22c55e" theme={theme} />
                </View>
            ) : null}

            {/* Filter tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
            >
                {FILTER_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.filterChip, filter === tab.key && styles.filterChipActive]}
                        onPress={() => setFilter(tab.key)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.filterChipText, filter === tab.key && styles.filterChipTextActive]}>
                            {tab.label}
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
                    data={filtered}
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
                            <Ionicons name="receipt-outline" size={64} color={theme.colors.textMuted} />
                            <Text style={styles.emptyTitle}>No Orders Yet</Text>
                            <Text style={styles.emptySubtitle}>
                                {filter
                                    ? `No ${filter.replace(/_/g, ' ').toLowerCase()} orders.`
                                    : 'Orders placed by farmers will appear here.'}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

function SummaryChip({ icon, value, label, color, theme }: any) {
    const c = theme.colors;
    return (
        <View style={{
            flex: 1,
            alignItems: 'center',
            gap: 4,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 12,
            padding: 10,
        }}>
            <Ionicons name={icon} size={16} color={color} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: c.textPrimary }}>{value}</Text>
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
        filterRow:  { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
        filterChip: {
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
        },
        filterChipActive:     { backgroundColor: c.primary, borderColor: c.primary },
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
        cardTop:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
        speciesName:    { fontSize: 16, fontWeight: '800', color: c.textPrimary },
        stageName:      { fontSize: 11, color: c.textMuted, fontWeight: '700', letterSpacing: 0.5 },
        statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
        statusBadgeText:{ fontSize: 11, fontWeight: '700' },
        farmerRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
        farmerName:     { fontSize: 13, fontWeight: '700', color: c.textSecondary },
        farmerMeta:     { fontSize: 12, color: c.textMuted },
        metricsRow:     { flexDirection: 'row', backgroundColor: c.background, borderRadius: 12, padding: 12, alignItems: 'center' },
        metricCell:     { flex: 1, alignItems: 'center', gap: 3 },
        metricValue:    { fontSize: 15, fontWeight: '800', color: c.textPrimary },
        metricLabel:    { fontSize: 10, color: c.textMuted, fontWeight: '600' },
        metricDivider:  { width: 1, height: 28, marginHorizontal: 4 },
        infoRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
        infoText:       { flex: 1, fontSize: 13, color: c.textSecondary, lineHeight: 18 },
        timestamp:      { fontSize: 11, color: c.textMuted, fontWeight: '500' },
        actionsRow:     { flexDirection: 'row', gap: 10 },
        cancelBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderWidth: 1,
            borderColor: c.error ?? '#ef4444',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
        },
        confirmBtn: {
            flex: 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: '#22c55e',
            borderRadius: 12,
            paddingVertical: 10,
        },
        actionBtnText:  { fontSize: 13, fontWeight: '800' },
        confirmedBanner:{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#dcfce7',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },
        confirmedText:  { fontSize: 13, fontWeight: '700', color: '#16a34a' },
        emptyContainer: { padding: 48, alignItems: 'center', gap: 14 },
        emptyTitle:     { fontSize: 20, fontWeight: '800', color: c.textPrimary },
        emptySubtitle:  { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 21 },
    });
};
