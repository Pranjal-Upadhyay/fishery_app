/**
 * MyOrdersScreen
 * Farmer's order history with full v2 status flow:
 *   REQUESTED → ACCEPTED → FARMER_PAID → HATCHERY_CONFIRMED → FULFILLED
 *   plus REJECTED / CANCELLED / DISPUTED
 *   and advance-interest statuses
 *
 * Action moments:
 *   - ACCEPTED → "Pay & Mark Paid" (shows hatchery's UPI / phone, copy buttons)
 *   - HATCHERY_CONFIRMED → "Mark Fulfilled" / "Raise Dispute"
 *   - INTEREST_ACKNOWLEDGED + listing AVAILABLE → "Confirm Order"
 *   - REQUESTED / ACCEPTED → "Cancel"
 */

import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    FlatList,
    Linking,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import {
    marketplaceService,
    MarketplaceOrder,
    DisputeReason,
} from '../services/apiService';

type FilterKey = 'all' | 'pending' | 'paid' | 'confirmed' | 'fulfilled' | 'cancelled' | 'interest';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'pending',   label: 'Pending' },
    { key: 'paid',      label: 'Paid' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'fulfilled', label: 'Fulfilled' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'interest',  label: 'Interest' },
];

const STATUS_META: Record<string, { label: string; color: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = {
    REQUESTED:             { label: 'Requested',        color: '#f59e0b', icon: 'time-outline' },
    ACCEPTED:              { label: 'Accepted - Pay',   color: '#0ea5e9', icon: 'card-outline' },
    REJECTED:              { label: 'Rejected',         color: '#ef4444', icon: 'close-circle-outline' },
    FARMER_PAID:           { label: 'Paid - Awaiting',  color: '#a855f7', icon: 'cash-outline' },
    HATCHERY_CONFIRMED:    { label: 'Confirmed',        color: '#22c55e', icon: 'checkmark-circle-outline' },
    FULFILLED:             { label: 'Fulfilled',        color: '#16a34a', icon: 'trophy-outline' },
    CANCELLED:             { label: 'Cancelled',        color: '#94a3b8', icon: 'close-circle-outline' },
    DISPUTED:              { label: 'Disputed',         color: '#dc2626', icon: 'warning-outline' },
    INTEREST_REQUESTED:    { label: 'Interest Sent',    color: '#f59e0b', icon: 'star-outline' },
    INTEREST_ACKNOWLEDGED: { label: 'Acknowledged',     color: '#0ea5e9', icon: 'star' },
    INTEREST_DECLINED:     { label: 'Interest Declined',color: '#ef4444', icon: 'star-outline' },
    INTEREST_CONVERTED:    { label: 'Converted',        color: '#22c55e', icon: 'checkmark-circle' },
};

const DISPUTE_REASONS: { key: DisputeReason; label: string }[] = [
    { key: 'QUANTITY_MISMATCH',     label: 'Quantity mismatch' },
    { key: 'HIGH_MORTALITY',        label: 'High mortality on arrival' },
    { key: 'NOT_AS_DESCRIBED',      label: 'Fish not as described' },
    { key: 'PAYMENT_NOT_RECEIVED',  label: 'Payment not received' },
    { key: 'OTHER',                 label: 'Other' },
];

export default function MyOrdersScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();

    const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>('all');

    // Dispute modal
    const [disputeOrder, setDisputeOrder] = useState<MarketplaceOrder | null>(null);
    const [disputeReason, setDisputeReason] = useState<DisputeReason>('QUANTITY_MISMATCH');

    const load = useCallback(async () => {
        try {
            const data = await marketplaceService.getMyOrders();
            setOrders(data);
        } catch {
            Alert.alert('Error', 'Could not load orders.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const filtered = orders.filter(o => {
        if (filter === 'all') return true;
        if (filter === 'pending')   return ['REQUESTED', 'ACCEPTED'].includes(o.status);
        if (filter === 'paid')      return o.status === 'FARMER_PAID';
        if (filter === 'confirmed') return o.status === 'HATCHERY_CONFIRMED';
        if (filter === 'fulfilled') return o.status === 'FULFILLED';
        if (filter === 'cancelled') return ['CANCELLED', 'REJECTED', 'DISPUTED'].includes(o.status);
        if (filter === 'interest')  return o.order_type === 'ADVANCE_INTEREST';
        return true;
    });

    const handleMarkPaid = (order: MarketplaceOrder) => {
        Alert.alert(
            'Mark as Paid',
            'Confirm that you have paid the hatchery (UPI/bank transfer). They will verify and confirm.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'I Paid',
                    onPress: async () => {
                        try {
                            await marketplaceService.markPaid(order.id);
                            await load();
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.error ?? 'Could not mark as paid.');
                        }
                    },
                },
            ],
        );
    };

    const handleFulfill = (order: MarketplaceOrder) => {
        Alert.alert(
            'Mark Fulfilled',
            'Confirm you have received the fish and the order is complete.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Fulfilled',
                    onPress: async () => {
                        try {
                            await marketplaceService.fulfillOrder(order.id);
                            await load();
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.error ?? 'Could not mark fulfilled.');
                        }
                    },
                },
            ],
        );
    };

    const handleCancel = (order: MarketplaceOrder) => {
        Alert.alert(
            'Cancel Order',
            'Are you sure you want to cancel this order?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await marketplaceService.cancelOrder(order.id);
                            await load();
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.error ?? 'Could not cancel.');
                        }
                    },
                },
            ],
        );
    };

    const handleConvertInterest = (order: MarketplaceOrder) => {
        // For simplicity, use PICKUP as default and let user adjust later
        Alert.alert(
            'Confirm Order',
            'The stock is now available. Confirm to place a real order?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Order',
                    onPress: async () => {
                        try {
                            await marketplaceService.convertInterest(order.id, { logistics_preference: 'PICKUP' });
                            await load();
                            Alert.alert('Order Placed', 'Your interest has been converted to a real order. The hatchery will accept and you can then pay.');
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.error ?? 'Could not convert.');
                        }
                    },
                },
            ],
        );
    };

    const openDispute = (order: MarketplaceOrder) => {
        setDisputeOrder(order);
        setDisputeReason('QUANTITY_MISMATCH');
    };

    const submitDispute = async () => {
        if (!disputeOrder) return;
        try {
            await marketplaceService.raiseDispute(disputeOrder.id, disputeReason);
            setDisputeOrder(null);
            await load();
            Alert.alert('Dispute Raised', 'Your dispute has been recorded. The platform operator will resolve it.');
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error ?? 'Could not raise dispute.');
        }
    };

    const handleVerifyAndStock = (order: MarketplaceOrder) => {
        const listingForStocking = {
            id: order.listing_id || order.id,
            species_name: order.species_name || '',
            species_variant: order.species_variant || null,
            estimated_fingerling_count: order.quantity_ordered,
            avg_fingerling_weight_g: null,
            hatchery_name: order.hatchery_name || '',
            hatchery_district: order.hatchery_district || '',
        };
        navigation.navigate('StockFingerlings', { listing: listingForStocking });
    };

    const copy = async (text: string, label: string) => {
        // Use native Share sheet as a copy-friendly alternative (works without
        // expo-clipboard). User can tap "Copy" in the share sheet.
        try {
            await Share.share({ message: text, title: label });
        } catch {
            Alert.alert(label, text);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScreenHeader title="My Orders" onBack={() => navigation.goBack()} />
                <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader title="My Orders" onBack={() => navigation.goBack()} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.filterRow}>
                {FILTER_TABS.map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.filterChip, filter === t.key && styles.filterChipActive]}
                        onPress={() => setFilter(t.key)}
                    >
                        <Text style={[styles.filterChipText, filter === t.key && styles.filterChipTextActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {filtered.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="receipt-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={styles.emptyText}>No orders yet</Text>
                    <Text style={styles.emptySub}>Browse the marketplace to place your first order.</Text>
                    <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('MarketListings')}>
                        <Ionicons name="storefront-outline" size={18} color={theme.colors.textInverse} />
                        <Text style={styles.browseBtnText}>Browse Market</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(o) => o.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => {
                        const meta = STATUS_META[item.status] ?? STATUS_META.REQUESTED;
                        const showPaymentDetails = item.status === 'ACCEPTED';
                        const showFulfillActions = item.status === 'HATCHERY_CONFIRMED';
                        const showCancelButton = ['REQUESTED', 'ACCEPTED'].includes(item.status);
                        const showConvertInterest = item.status === 'INTEREST_ACKNOWLEDGED' && item.listing_status === 'AVAILABLE';

                        return (
                            <View style={styles.card}>
                                <View style={styles.cardHead}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>{item.species_name} {item.species_variant ? `· ${item.species_variant}` : ''}</Text>
                                        <Text style={styles.cardSub}>
                                            {item.quantity_ordered.toLocaleString('en-IN')} {item.stage} · {item.hatchery_name}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusPill, { backgroundColor: meta.color + '22' }]}>
                                        <Ionicons name={meta.icon} size={12} color={meta.color} />
                                        <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardMetaRow}>
                                    <Text style={styles.cardAmount}>₹{parseFloat(item.total_amount).toLocaleString('en-IN')}</Text>
                                    {item.bulk_price_applied && (
                                        <Text style={styles.bulkText}>· Bulk price</Text>
                                    )}
                                    {item.logistics_preference && (
                                        <Text style={styles.logText}>· {item.logistics_preference}</Text>
                                    )}
                                </View>

                                {showPaymentDetails && (
                                    <View style={styles.payBox}>
                                        <Text style={styles.payTitle}>Pay the hatchery now</Text>
                                        {item.upi_id_snapshot && (
                                            <TouchableOpacity style={styles.payRow} onPress={() => copy(item.upi_id_snapshot!, 'UPI ID')}>
                                                <Ionicons name="card-outline" size={16} color={theme.colors.primary} />
                                                <Text style={styles.payRowText}>UPI: {item.upi_id_snapshot}</Text>
                                                <Ionicons name="copy-outline" size={14} color={theme.colors.textMuted} />
                                            </TouchableOpacity>
                                        )}
                                        {item.contact_number_snapshot && (
                                            <TouchableOpacity style={styles.payRow} onPress={() => Linking.openURL(`tel:${item.contact_number_snapshot}`)}>
                                                <Ionicons name="call-outline" size={16} color={theme.colors.primary} />
                                                <Text style={styles.payRowText}>{item.contact_number_snapshot}</Text>
                                                <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity style={styles.paidBtn} onPress={() => handleMarkPaid(item)}>
                                            <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.textInverse} />
                                            <Text style={styles.paidBtnText}>I Have Paid</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {item.status === 'FARMER_PAID' && (
                                    <View style={styles.infoBox}>
                                        <Ionicons name="time-outline" size={16} color="#a855f7" />
                                        <Text style={styles.infoText}>Waiting for the hatchery to confirm payment...</Text>
                                    </View>
                                )}

                                {item.status === 'HATCHERY_CONFIRMED' && (
                                    <TouchableOpacity style={[styles.stockBtn, { marginBottom: 8 }]} onPress={() => handleVerifyAndStock(item)}>
                                        <Ionicons name="qr-code-outline" size={18} color={theme.colors.textInverse} />
                                        <Text style={styles.stockBtnText}>Verify & Stock Pond</Text>
                                    </TouchableOpacity>
                                )}

                                {showFulfillActions && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => openDispute(item)}>
                                            <Ionicons name="warning-outline" size={16} color="#dc2626" />
                                            <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Dispute</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => handleFulfill(item)}>
                                            <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.textInverse} />
                                            <Text style={[styles.actionBtnText, { color: theme.colors.textInverse }]}>Mark Fulfilled</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {item.status === 'FULFILLED' && (
                                    <TouchableOpacity style={[styles.stockBtn, { backgroundColor: theme.colors.secondary }]} onPress={() => handleVerifyAndStock(item)}>
                                        <Ionicons name="water-outline" size={18} color={theme.colors.textOnSecondary} />
                                        <Text style={[styles.stockBtnText, { color: theme.colors.textOnSecondary }]}>Verify & Stock Pond Again</Text>
                                    </TouchableOpacity>
                                )}

                                {showConvertInterest && (
                                    <TouchableOpacity style={styles.convertBtn} onPress={() => handleConvertInterest(item)}>
                                        <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.textInverse} />
                                        <Text style={styles.convertBtnText}>Stock Ready - Confirm Order</Text>
                                    </TouchableOpacity>
                                )}

                                {showCancelButton && (
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                                        <Text style={styles.cancelBtnText}>Cancel Order</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    }}
                />
            )}

            {/* Dispute modal */}
            <Modal visible={!!disputeOrder} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Raise a Dispute</Text>
                        <Text style={styles.modalSub}>Why is this order disputed?</Text>
                        {DISPUTE_REASONS.map(r => (
                            <TouchableOpacity
                                key={r.key}
                                style={[styles.modalItem, disputeReason === r.key && styles.modalItemActive]}
                                onPress={() => setDisputeReason(r.key)}
                            >
                                <Text style={[styles.modalItemText, disputeReason === r.key && { color: theme.colors.primary, fontWeight: '800' }]}>
                                    {r.label}
                                </Text>
                                {disputeReason === r.key && (
                                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setDisputeOrder(null)}>
                                <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={submitDispute}>
                                <Text style={styles.modalBtnTextPrimary}>Submit Dispute</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    return StyleSheet.create({
        safeArea: { flex: 1, backgroundColor: c.background },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
        emptyText: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
        emptySub: { fontSize: 13, color: c.textMuted, textAlign: 'center' },
        browseBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.primary,
            paddingHorizontal: 22,
            paddingVertical: 12,
            borderRadius: 14,
            marginTop: 10,
        },
        browseBtnText: { color: c.textInverse, fontSize: 14, fontWeight: '800' },
        filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
        filterChip: {
            alignSelf: 'flex-start',
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
        },
        filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
        filterChipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
        filterChipTextActive: { color: c.textInverse },
        list: { padding: 16, gap: 12 },
        card: {
            backgroundColor: c.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.border,
            padding: 14,
            gap: 10,
            marginBottom: 12,
        },
        cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
        cardTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
        cardSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
        statusPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            alignSelf: 'flex-start',
        },
        statusPillText: { fontSize: 11, fontWeight: '800' },
        cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
        cardAmount: { fontSize: 16, fontWeight: '800', color: c.primary },
        bulkText: { fontSize: 12, color: '#22c55e', fontWeight: '700' },
        logText: { fontSize: 12, color: c.textMuted, fontWeight: '700' },
        payBox: {
            backgroundColor: c.primary + '10',
            borderColor: c.primary + '44',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            gap: 8,
        },
        payTitle: { fontSize: 13, fontWeight: '800', color: c.textPrimary },
        payRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.surface,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        payRowText: { flex: 1, fontSize: 13, fontWeight: '700', color: c.textPrimary },
        paidBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: c.primary,
            borderRadius: 12,
            paddingVertical: 12,
            marginTop: 4,
        },
        paidBtnText: { fontSize: 14, fontWeight: '800', color: c.textInverse },
        stockBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: c.primary,
            borderRadius: 12,
            paddingVertical: 12,
            marginTop: 4,
        },
        stockBtnText: { fontSize: 14, fontWeight: '800', color: c.textInverse },
        infoBox: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#a855f710',
            borderRadius: 10,
            padding: 10,
        },
        infoText: { fontSize: 12, color: c.textSecondary, flex: 1 },
        actionRow: { flexDirection: 'row', gap: 8 },
        actionBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
        },
        actionBtnSecondary: { borderColor: '#dc2626' },
        actionBtnPrimary: { backgroundColor: c.primary, borderColor: c.primary },
        actionBtnText: { fontSize: 13, fontWeight: '800' },
        convertBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: '#22c55e',
            borderRadius: 12,
            paddingVertical: 12,
        },
        convertBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
        cancelBtn: {
            alignItems: 'center',
            paddingVertical: 10,
        },
        cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
        // Modal
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
        modalSheet: {
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 28,
            gap: 8,
        },
        modalTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary, textAlign: 'center' },
        modalSub: { fontSize: 13, color: c.textMuted, textAlign: 'center', marginBottom: 10 },
        modalItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
            paddingVertical: 14,
            backgroundColor: c.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            marginBottom: 6,
        },
        modalItemActive: { borderColor: c.primary, backgroundColor: c.primary + '10' },
        modalItemText: { fontSize: 14, color: c.textPrimary, fontWeight: '700' },
        modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
        modalBtn: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: 'center',
        },
        modalBtnSecondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
        modalBtnPrimary: { backgroundColor: '#dc2626' },
        modalBtnTextSecondary: { fontSize: 14, fontWeight: '800', color: c.textSecondary },
        modalBtnTextPrimary: { fontSize: 14, fontWeight: '800', color: '#fff' },
    });
};
