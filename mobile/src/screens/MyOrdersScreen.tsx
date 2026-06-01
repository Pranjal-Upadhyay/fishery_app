/**
 * MyOrdersScreen
 * Farmer views their placed orders. Can mark an order as "Paid"
 * (after bank-transfer to the hatchery) or cancel a pending order.
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
    Linking,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';

interface Order {
    id: string;
    status: 'PENDING' | 'FARMER_PAID' | 'HATCHERY_CONFIRMED' | 'CANCELLED';
    species_name: string;
    species_variant: string | null;
    stage: 'fry' | 'fingerling';
    quantity_ordered: number;
    price_per_piece: string;
    total_amount: string;
    farmer_notes: string | null;
    farmer_paid_at: string | null;
    hatchery_confirmed_at: string | null;
    hatchery_name: string;
    hatchery_district: string;
    operator_name: string;
    operator_phone: string;
    listing_id: string;
    created_at: string;
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
    PENDING:            { label: 'Pending Payment',   color: '#f59e0b', icon: 'time-outline' },
    FARMER_PAID:        { label: 'Paid — Awaiting Confirmation', color: '#0ea5e9', icon: 'checkmark-circle-outline' },
    HATCHERY_CONFIRMED: { label: 'Confirmed',          color: '#22c55e', icon: 'checkmark-done-circle-outline' },
    CANCELLED:          { label: 'Cancelled',          color: '#94a3b8', icon: 'close-circle-outline' },
};

const FILTER_TABS = [
    { key: '', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'FARMER_PAID', label: 'Paid' },
    { key: 'HATCHERY_CONFIRMED', label: 'Confirmed' },
    { key: 'CANCELLED', label: 'Cancelled' },
];

export default function MyOrdersScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('');
    const [actionId, setActionId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/api/v1/marketplace/orders/mine');
            setOrders(res.data?.data ?? []);
        } catch {
            // offline
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(); }, [load]));
    const onRefresh = () => { setRefreshing(true); void load(); };

    const handleMarkPaid = (order: Order) => {
        Alert.alert(
            'Confirm Payment',
            `Have you transferred ₹${parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} to ${order.operator_name}?`,
            [
                { text: 'Not Yet', style: 'cancel' },
                {
                    text: 'Yes, Mark Paid',
                    style: 'destructive',
                    onPress: async () => {
                        setActionId(order.id);
                        try {
                            await api.patch(`/api/v1/marketplace/orders/${order.id}/pay`);
                            await load();
                        } catch (err: any) {
                            Alert.alert('Error', err?.response?.data?.error ?? 'Could not mark as paid.');
                        } finally {
                            setActionId(null);
                        }
                    },
                },
            ],
        );
    };

    const handleCancel = (order: Order) => {
        Alert.alert(
            'Cancel Order',
            'Are you sure you want to cancel this order? The quantity will be returned to the listing.',
            [
                { text: 'Keep Order', style: 'cancel' },
                {
                    text: 'Cancel Order',
                    style: 'destructive',
                    onPress: async () => {
                        setActionId(order.id);
                        try {
                            await api.patch(`/api/v1/marketplace/orders/${order.id}/cancel`);
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

    const filtered = activeTab
        ? orders.filter(o => o.status === activeTab)
        : orders;

    const renderItem = ({ item }: { item: Order }) => {
        const meta = STATUS_META[item.status] ?? STATUS_META.PENDING;
        const isActioning = actionId === item.id;

        return (
            <View style={styles.card}>
                {/* Header row */}
                <View style={styles.cardTop}>
                    <View style={styles.speciesBlock}>
                        <Text style={styles.speciesName}>{item.species_name}</Text>
                        {item.species_variant ? (
                            <Text style={styles.speciesVariant}>{item.species_variant}</Text>
                        ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: meta.color + '22' }]}>
                        <Ionicons name={meta.icon} size={12} color={meta.color} />
                        <Text style={[styles.statusBadgeText, { color: meta.color }]}>
                            {meta.label}
                        </Text>
                    </View>
                </View>

                {/* Details */}
                <View style={styles.detailsRow}>
                    <InfoChip icon="layers-outline" text={`${item.quantity_ordered.toLocaleString('en-IN')} pcs`} theme={theme} />
                    <InfoChip icon="cash-outline" text={`₹${parseFloat(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} theme={theme} accent={theme.colors.primary} />
                    <InfoChip icon="fish-outline" text={item.stage.toUpperCase()} theme={theme} />
                </View>

                {/* Hatchery */}
                <View style={styles.hatcheryRow}>
                    <Ionicons name="business-outline" size={13} color={theme.colors.textSecondary} />
                    <Text style={styles.hatcheryText}>{item.hatchery_name}</Text>
                    {item.hatchery_district ? (
                        <>
                            <Text style={styles.dot}>·</Text>
                            <Text style={styles.hatcheryLoc}>{item.hatchery_district}</Text>
                        </>
                    ) : null}
                    {item.operator_phone ? (
                        <TouchableOpacity
                            style={styles.callMini}
                            activeOpacity={0.8}
                            onPress={() => Linking.openURL(`tel:${item.operator_phone}`)}
                        >
                            <Ionicons name="call-outline" size={13} color={theme.colors.primary} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Timestamps */}
                <Text style={styles.dateText}>
                    Ordered: {new Date(item.created_at).toLocaleDateString('en-IN')}
                    {item.farmer_paid_at
                        ? `  ·  Paid: ${new Date(item.farmer_paid_at).toLocaleDateString('en-IN')}`
                        : ''}
                    {item.hatchery_confirmed_at
                        ? `  ·  Confirmed: ${new Date(item.hatchery_confirmed_at).toLocaleDateString('en-IN')}`
                        : ''}
                </Text>

                {/* Notes */}
                {item.farmer_notes ? (
                    <Text style={styles.notes}>Note: {item.farmer_notes}</Text>
                ) : null}

                {/* Actions */}
                {isActioning ? (
                    <View style={styles.actionRow}>
                        <ActivityIndicator color={theme.colors.primary} size="small" />
                        <Text style={styles.actioningText}>Updating...</Text>
                    </View>
                ) : item.status === 'PENDING' ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.cancelOrderBtn}
                            activeOpacity={0.8}
                            onPress={() => handleCancel(item)}
                        >
                            <Ionicons name="close-outline" size={15} color={theme.colors.error} />
                            <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.paidBtn}
                            activeOpacity={0.8}
                            onPress={() => handleMarkPaid(item)}
                        >
                            <Ionicons name="checkmark-circle-outline" size={15} color={theme.colors.textInverse} />
                            <Text style={[styles.actionBtnText, { color: theme.colors.textInverse }]}>Mark as Paid</Text>
                        </TouchableOpacity>
                    </View>
                ) : item.status === 'FARMER_PAID' ? (
                    <View style={styles.awaitingRow}>
                        <Ionicons name="hourglass-outline" size={14} color="#0ea5e9" />
                        <Text style={styles.awaitingText}>Waiting for hatchery to confirm payment receipt.</Text>
                    </View>
                ) : item.status === 'HATCHERY_CONFIRMED' ? (
                    <View style={styles.confirmedRow}>
                        <Ionicons name="checkmark-done-circle-outline" size={16} color="#22c55e" />
                        <Text style={styles.confirmedText}>Payment confirmed by hatchery!</Text>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader title="My Orders" onBack={() => navigation.goBack()} />

            {/* Filter tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
            >
                {FILTER_TABS.map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.filterChip, activeTab === t.key && styles.filterChipActive]}
                        onPress={() => setActiveTab(t.key)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.filterChipText, activeTab === t.key && styles.filterChipTextActive]}>
                            {t.label}
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
                                Browse the Fingerling Market to place your first order.
                            </Text>
                            <TouchableOpacity
                                style={styles.browseBtn}
                                onPress={() => navigation.navigate('MarketListings')}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="storefront-outline" size={18} color={theme.colors.textInverse} />
                                <Text style={styles.browseBtnText}>Browse Market</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

function InfoChip({ icon, text, theme, accent }: any) {
    const color = accent ?? theme.colors.textSecondary;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color + '18', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}>
            <Ionicons name={icon} size={12} color={color} />
            <Text style={{ fontSize: 11, fontWeight: '700', color }}>{text}</Text>
        </View>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    const r = theme.borderRadius ?? {};
    return StyleSheet.create({
        safeArea:  { flex: 1, backgroundColor: c.background },
        center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
        filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
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
        list: { padding: 16, paddingTop: 0, gap: 14 },
        card: {
            backgroundColor: c.surface,
            borderRadius: r.lg ?? 16,
            borderWidth: 1,
            borderColor: c.border,
            padding: 16,
            gap: 10,
            ...(theme.shadows?.sm ?? {}),
        },
        cardTop:         { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
        speciesBlock:    { flex: 1, gap: 2 },
        speciesName:     { fontSize: 17, fontWeight: '800', color: c.textPrimary },
        speciesVariant:  { fontSize: 13, color: c.textSecondary },
        statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, maxWidth: 180 },
        statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, flexShrink: 1 },
        detailsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
        hatcheryRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
        hatcheryText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
        dot:          { color: c.textMuted },
        hatcheryLoc:  { fontSize: 12, color: c.textMuted, flex: 1 },
        callMini: {
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: c.primaryLight ?? '#e0fdf4',
            alignItems: 'center',
            justifyContent: 'center',
        },
        dateText:    { fontSize: 12, color: c.textMuted },
        notes:       { fontSize: 12, color: c.textSecondary, fontStyle: 'italic' },
        actionRow:   { flexDirection: 'row', gap: 10, marginTop: 4 },
        actioningText: { fontSize: 13, color: c.textSecondary },
        cancelOrderBtn: {
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
        paidBtn: {
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
        awaitingRow:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#e0f2fe', borderRadius: 10, padding: 10 },
        awaitingText:  { fontSize: 12, color: '#0284c7', fontWeight: '600', flex: 1 },
        confirmedRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#dcfce7', borderRadius: 10, padding: 10 },
        confirmedText: { fontSize: 12, color: '#16a34a', fontWeight: '600', flex: 1 },
        emptyContainer: { padding: 48, alignItems: 'center', gap: 14 },
        emptyTitle:     { fontSize: 20, fontWeight: '800', color: c.textPrimary },
        emptySubtitle:  { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 21 },
        browseBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.primary,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 14,
        },
        browseBtnText: { color: c.textInverse, fontWeight: '800', fontSize: 14 },
    });
};
