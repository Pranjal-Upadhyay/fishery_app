/**
 * IncomingOrdersScreen
 * Hatchery operator views incoming orders + interest with v2 status flow.
 * Accepts optional listingId param to pre-filter to a single listing.
 *
 * Status flow:
 *   PURCHASE: REQUESTED → ACCEPTED → FARMER_PAID → HATCHERY_CONFIRMED → FULFILLED
 *           ↘ REJECTED          ↘ CANCELLED         ↘ DISPUTED
 *   INTEREST: INTEREST_REQUESTED → INTEREST_ACKNOWLEDGED → INTEREST_CONVERTED
 *                                ↘ INTEREST_DECLINED
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
    Linking,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { marketplaceService, MarketplaceOrder, DisputeReason } from '../services/apiService';

type IncomingOrdersRouteParams = {
    IncomingOrders: { listingId?: string };
};

type Tab = 'new' | 'paid' | 'confirmed' | 'fulfilled' | 'interest' | 'disputed';

const TABS: { key: Tab; label: string }[] = [
    { key: 'new',       label: 'New' },
    { key: 'paid',      label: 'Paid' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'fulfilled', label: 'Fulfilled' },
    { key: 'interest',  label: 'Interest' },
    { key: 'disputed',  label: 'Disputed' },
];

const STATUS_META: Record<string, { label: string; color: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = {
    REQUESTED:             { label: 'New Request',     color: '#f59e0b', icon: 'time-outline' },
    ACCEPTED:              { label: 'Accepted',         color: '#0ea5e9', icon: 'checkmark-outline' },
    REJECTED:              { label: 'Rejected',         color: '#ef4444', icon: 'close-circle-outline' },
    FARMER_PAID:           { label: 'Farmer Paid',      color: '#a855f7', icon: 'card-outline' },
    HATCHERY_CONFIRMED:    { label: 'Confirmed',        color: '#22c55e', icon: 'checkmark-circle-outline' },
    FULFILLED:             { label: 'Fulfilled',        color: '#16a34a', icon: 'trophy-outline' },
    CANCELLED:             { label: 'Cancelled',        color: '#94a3b8', icon: 'close-circle-outline' },
    DISPUTED:              { label: 'Disputed',         color: '#dc2626', icon: 'warning-outline' },
    INTEREST_REQUESTED:    { label: 'New Interest',     color: '#f59e0b', icon: 'star-outline' },
    INTEREST_ACKNOWLEDGED: { label: 'Acknowledged',     color: '#0ea5e9', icon: 'star' },
    INTEREST_DECLINED:     { label: 'Declined',         color: '#ef4444', icon: 'star-outline' },
    INTEREST_CONVERTED:    { label: 'Converted',        color: '#22c55e', icon: 'checkmark-circle' },
};

const DISPUTE_REASONS: { key: DisputeReason; label: string }[] = [
    { key: 'QUANTITY_MISMATCH',     label: 'Quantity mismatch' },
    { key: 'HIGH_MORTALITY',        label: 'High mortality on arrival' },
    { key: 'NOT_AS_DESCRIBED',      label: 'Fish not as described' },
    { key: 'PAYMENT_NOT_RECEIVED',  label: 'Payment not received' },
    { key: 'OTHER',                 label: 'Other' },
];

export default function IncomingOrdersScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<IncomingOrdersRouteParams, 'IncomingOrders'>>();
    const listingId = route.params?.listingId;

    const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<Tab>('new');

    // Dispute modal state
    const [disputeOrder, setDisputeOrder] = useState<MarketplaceOrder | null>(null);
    const [disputeReason, setDisputeReason] = useState<DisputeReason>('PAYMENT_NOT_RECEIVED');

    const load = useCallback(async () => {
        try {
            const all = await marketplaceService.getMyOrders();
            // Client-side filter when listingId param is supplied
            setOrders(listingId ? all.filter(o => o.listing_id === listingId) : all);
        } catch {
            Alert.alert('Error', 'Could not load orders.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [listingId]);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const onRefresh = useCallback(() => { setRefreshing(true); void load(); }, [load]);

    const filtered = orders.filter(o => {
        if (tab === 'new')       return ['REQUESTED'].includes(o.status);
        if (tab === 'paid')      return ['ACCEPTED', 'FARMER_PAID'].includes(o.status);
        if (tab === 'confirmed') return o.status === 'HATCHERY_CONFIRMED';
        if (tab === 'fulfilled') return o.status === 'FULFILLED';
        if (tab === 'disputed')  return o.status === 'DISPUTED';
        if (tab === 'interest')  return o.order_type === 'ADVANCE_INTEREST';
        return true;
    });

    const callApi = async (fn: () => Promise<any>, errPrefix = 'Failed') => {
        try {
            await fn();
            await load();
        } catch (e: any) {
            Alert.alert(errPrefix, e?.response?.data?.error ?? 'Unknown error.');
        }
    };

    const accept = (o: MarketplaceOrder) =>
        Alert.alert('Accept Order', `Reserve ${o.quantity_ordered} pieces for this farmer?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Accept', onPress: () => callApi(() => marketplaceService.acceptOrder(o.id)) },
        ]);

    const reject = (o: MarketplaceOrder) =>
        Alert.alert('Reject Order', 'Are you sure you want to reject this order?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reject', style: 'destructive', onPress: () => callApi(() => marketplaceService.rejectOrder(o.id)) },
        ]);

    const confirmPaid = (o: MarketplaceOrder) =>
        Alert.alert('Confirm Payment', 'Confirm that you received the payment from this farmer?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', onPress: () => callApi(() => marketplaceService.confirmPayment(o.id)) },
        ]);

    const fulfill = (o: MarketplaceOrder) =>
        Alert.alert('Mark Fulfilled', 'Has the farmer received the fish?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes, Fulfilled', onPress: () => callApi(() => marketplaceService.fulfillOrder(o.id)) },
        ]);

    const cancel = (o: MarketplaceOrder) =>
        Alert.alert('Cancel Order', 'Cancel this order?', [
            { text: 'No', style: 'cancel' },
            { text: 'Yes, Cancel', style: 'destructive', onPress: () => callApi(() => marketplaceService.cancelOrder(o.id)) },
        ]);

    const acknowledgeInterest = (o: MarketplaceOrder) =>
        callApi(() => marketplaceService.acknowledgeInterest(o.id));

    const declineInterest = (o: MarketplaceOrder) =>
        Alert.alert('Decline Interest', 'Decline this advance interest?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Decline', style: 'destructive', onPress: () => callApi(() => marketplaceService.declineInterest(o.id)) },
        ]);

    const openDispute = (o: MarketplaceOrder) => {
        setDisputeOrder(o);
        setDisputeReason('PAYMENT_NOT_RECEIVED');
    };

    const submitDispute = async () => {
        if (!disputeOrder) return;
        try {
            await marketplaceService.raiseDispute(disputeOrder.id, disputeReason);
            setDisputeOrder(null);
            await load();
            Alert.alert('Dispute Raised', 'The platform operator will resolve this.');
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error ?? 'Could not raise dispute.');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScreenHeader title="Incoming Orders" onBack={() => navigation.goBack()} />
                <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader title="Incoming Orders" onBack={() => navigation.goBack()} />

            {/* Summary chips */}
            <View style={styles.summaryRow}>
                <SummaryChip label="New" value={orders.filter(o => o.status === 'REQUESTED').length} color="#f59e0b" theme={theme} />
                <SummaryChip label="Awaiting" value={orders.filter(o => ['ACCEPTED', 'FARMER_PAID'].includes(o.status)).length} color="#0ea5e9" theme={theme} />
                <SummaryChip label="Disputed" value={orders.filter(o => o.status === 'DISPUTED').length} color="#dc2626" theme={theme} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {TABS.map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.filterChip, tab === t.key && styles.filterChipActive]}
                        onPress={() => setTab(t.key)}
                    >
                        <Text style={[styles.filterChipText, tab === t.key && styles.filterChipTextActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {filtered.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="mail-open-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={styles.emptyText}>No {tab} orders</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(o) => o.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    renderItem={({ item }) => {
                        const meta = STATUS_META[item.status] ?? STATUS_META.REQUESTED;
                        return (
                            <View style={styles.card}>
                                <View style={styles.cardHead}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>{item.species_name}{item.species_variant ? ` · ${item.species_variant}` : ''}</Text>
                                        <Text style={styles.cardSub}>
                                            {item.quantity_ordered.toLocaleString('en-IN')} {item.stage} from {item.farmer_name}
                                        </Text>
                                        {item.farmer_uid && (
                                            <Text style={styles.uidLine}>UID: {item.farmer_uid}</Text>
                                        )}
                                    </View>
                                    <View style={[styles.statusPill, { backgroundColor: meta.color + '22' }]}>
                                        <Ionicons name={meta.icon} size={12} color={meta.color} />
                                        <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardMetaRow}>
                                    <Text style={styles.cardAmount}>₹{parseFloat(item.total_amount).toLocaleString('en-IN')}</Text>
                                    {item.logistics_preference && (
                                        <Text style={styles.logText}>· {item.logistics_preference}</Text>
                                    )}
                                </View>

                                {item.farmer_notes && (
                                    <View style={styles.notesBox}>
                                        <Ionicons name="chatbubble-outline" size={14} color={theme.colors.textMuted} />
                                        <Text style={styles.notesText}>{item.farmer_notes}</Text>
                                    </View>
                                )}

                                {item.delivery_address && (
                                    <View style={styles.notesBox}>
                                        <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
                                        <Text style={styles.notesText}>{item.delivery_address}</Text>
                                    </View>
                                )}

                                {item.dispute_reason && (
                                    <View style={[styles.notesBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                                        <Ionicons name="warning-outline" size={14} color="#dc2626" />
                                        <Text style={[styles.notesText, { color: '#dc2626' }]}>
                                            {item.dispute_reason}{item.dispute_description ? ` — ${item.dispute_description}` : ''}
                                        </Text>
                                    </View>
                                )}

                                {/* Call farmer (always) */}
                                {item.farmer_phone && (
                                    <TouchableOpacity style={styles.callRow} onPress={() => Linking.openURL(`tel:${item.farmer_phone}`)}>
                                        <Ionicons name="call-outline" size={16} color={theme.colors.primary} />
                                        <Text style={styles.callText}>{item.farmer_phone}</Text>
                                        <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
                                    </TouchableOpacity>
                                )}

                                {/* Action buttons by status */}
                                <View style={styles.actionRow}>
                                    {item.status === 'REQUESTED' && (
                                        <>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => reject(item)}>
                                                <Ionicons name="close-outline" size={16} color="#ef4444" />
                                                <Text style={styles.actionBtnTextDanger}>Reject</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => accept(item)}>
                                                <Ionicons name="checkmark-outline" size={16} color={theme.colors.textInverse} />
                                                <Text style={styles.actionBtnTextPrimary}>Accept</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    {item.status === 'ACCEPTED' && (
                                        <>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => cancel(item)}>
                                                <Text style={styles.actionBtnTextSecondary}>Cancel</Text>
                                            </TouchableOpacity>
                                            <View style={[styles.actionBtn, { backgroundColor: '#a855f710', borderColor: '#a855f733', borderWidth: 1 }]}>
                                                <Text style={[styles.actionBtnTextSecondary, { color: '#a855f7' }]}>Awaiting payment</Text>
                                            </View>
                                        </>
                                    )}

                                    {item.status === 'FARMER_PAID' && (
                                        <>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => cancel(item)}>
                                                <Text style={styles.actionBtnTextSecondary}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => confirmPaid(item)}>
                                                <Ionicons name="card-outline" size={16} color={theme.colors.textInverse} />
                                                <Text style={styles.actionBtnTextPrimary}>Confirm Payment</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    {item.status === 'HATCHERY_CONFIRMED' && (
                                        <>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => openDispute(item)}>
                                                <Ionicons name="warning-outline" size={16} color="#ef4444" />
                                                <Text style={styles.actionBtnTextDanger}>Dispute</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => fulfill(item)}>
                                                <Ionicons name="trophy-outline" size={16} color={theme.colors.textInverse} />
                                                <Text style={styles.actionBtnTextPrimary}>Mark Fulfilled</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    {item.status === 'INTEREST_REQUESTED' && (
                                        <>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => declineInterest(item)}>
                                                <Text style={styles.actionBtnTextDanger}>Decline</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => acknowledgeInterest(item)}>
                                                <Ionicons name="star-outline" size={16} color={theme.colors.textInverse} />
                                                <Text style={styles.actionBtnTextPrimary}>Acknowledge</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    {item.status === 'INTEREST_ACKNOWLEDGED' && (
                                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => declineInterest(item)}>
                                            <Text style={styles.actionBtnTextDanger}>Decline Interest</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
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

function SummaryChip({ label, value, color, theme }: any) {
    const c = theme.colors;
    return (
        <View style={{
            flex: 1, padding: 10,
            backgroundColor: color + '10',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: color + '33',
            alignItems: 'center',
        }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color }}>{value}</Text>
            <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '700' }}>{label.toUpperCase()}</Text>
        </View>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    return StyleSheet.create({
        safeArea: { flex: 1, backgroundColor: c.background },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
        emptyText: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
        summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
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
        uidLine: { fontSize: 11, color: c.textMuted, marginTop: 2 },
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
        cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        cardAmount: { fontSize: 16, fontWeight: '800', color: c.primary },
        logText: { fontSize: 12, color: c.textMuted, fontWeight: '700' },
        notesBox: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            backgroundColor: c.surfaceLow ?? c.background,
            borderRadius: 10,
            padding: 10,
            borderWidth: 1,
            borderColor: c.border,
        },
        notesText: { flex: 1, fontSize: 12, color: c.textSecondary, lineHeight: 17 },
        callRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.primary + '15',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        callText: { flex: 1, fontSize: 13, fontWeight: '700', color: c.primary },
        actionRow: { flexDirection: 'row', gap: 8 },
        actionBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
        },
        actionBtnPrimary: { backgroundColor: c.primary, borderColor: c.primary },
        actionBtnSecondary: { backgroundColor: c.surface, borderColor: c.border },
        actionBtnDanger: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
        actionBtnTextPrimary: { fontSize: 13, fontWeight: '800', color: c.textInverse },
        actionBtnTextSecondary: { fontSize: 13, fontWeight: '800', color: c.textSecondary },
        actionBtnTextDanger: { fontSize: 13, fontWeight: '800', color: '#ef4444' },
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
