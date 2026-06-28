/**
 * ManageListingsScreen
 * Hatchery operator manages their own listings grouped by status:
 *   Active (AVAILABLE) · Upcoming · Drafts · Closed/Expired
 *
 * Per listing:
 *   - Draft  → Publish · Delete
 *   - Upcoming → Mark Available · Close
 *   - Available → Close
 *   - Any with orders → Tap to view Incoming Orders
 */

import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    FlatList,
    ScrollView,
    Modal,
    Clipboard,
} from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { marketplaceService, MarketplaceListing } from '../services/apiService';

type Tab = 'active' | 'upcoming' | 'drafts' | 'closed';

const TABS: { key: Tab; label: string }[] = [
    { key: 'active',   label: 'Active' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'drafts',   label: 'Drafts' },
    { key: 'closed',   label: 'Closed' },
];

const STATUS_COLOR: Record<string, string> = {
    AVAILABLE: '#22c55e',
    UPCOMING:  '#f59e0b',
    DRAFT:     '#94a3b8',
    CLOSED:    '#64748b',
    EXPIRED:   '#ef4444',
};

function formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

type ListingWithCounts = MarketplaceListing & {
    active_orders?: number;
    fulfilled_orders?: number;
    disputed_orders?: number;
    total_revenue?: string | number;
};

export default function ManageListingsScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();

    const [listings, setListings] = useState<ListingWithCounts[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('active');
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [selectedQrListing, setSelectedQrListing] = useState<ListingWithCounts | null>(null);

    const openQrCode = (l: ListingWithCounts) => {
        setSelectedQrListing(l);
        setQrModalOpen(true);
    };

    const load = useCallback(async () => {
        try {
            const data = await marketplaceService.getMyListings() as unknown as ListingWithCounts[];
            setListings(data);
        } catch {
            Alert.alert('Error', 'Could not load your listings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const filtered = listings.filter(l => {
        const isSoldOut = l.quantity_available === 0 || l.status === 'CLOSED';
        if (tab === 'active')   return l.status === 'AVAILABLE' && !isSoldOut;
        if (tab === 'upcoming') return l.status === 'UPCOMING' && !isSoldOut;
        if (tab === 'drafts')   return l.status === 'DRAFT';
        if (tab === 'closed')   return ['CLOSED', 'EXPIRED'].includes(l.status) || (['AVAILABLE', 'UPCOMING'].includes(l.status) && isSoldOut);
        return false;
    });

    const handlePublish = (l: MarketplaceListing) => {
        Alert.alert(
            'Publish Listing',
            'This will publish your listing to the marketplace.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Publish',
                    onPress: async () => {
                        try {
                            await marketplaceService.publishListing(l.id);
                            await load();
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.error ?? 'Could not publish.');
                        }
                    },
                },
            ],
        );
    };

    const handleMarkAvailable = (l: MarketplaceListing) => {
        Alert.alert(
            'Stock Ready?',
            'Marking this batch as AVAILABLE will notify all interested farmers and let new orders be placed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Available',
                    onPress: async () => {
                        try {
                            await marketplaceService.markAvailable(l.id);
                            await load();
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.error ?? 'Could not update.');
                        }
                    },
                },
            ],
        );
    };

    const handleClose = (l: MarketplaceListing) => {
        Alert.alert(
            'Close Listing',
            'No new orders will be accepted. Existing orders remain.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Close',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await marketplaceService.closeListing(l.id);
                            await load();
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.error ?? 'Could not close.');
                        }
                    },
                },
            ],
        );
    };

    const handleDelete = (l: MarketplaceListing) => {
        Alert.alert(
            'Delete Draft',
            'This draft will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await marketplaceService.deleteListing(l.id);
                            await load();
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.error ?? 'Could not delete.');
                        }
                    },
                },
            ],
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScreenHeader title="My Listings" onBack={() => navigation.goBack()} />
                <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader
                title="My Listings"
                onBack={() => navigation.goBack()}
                rightSlot={
                    <TouchableOpacity
                        style={styles.headerAddBtn}
                        onPress={() => navigation.navigate('CreateListing')}
                    >
                        <Ionicons name="add" size={22} color={theme.colors.textInverse} />
                    </TouchableOpacity>
                }
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.filterRow}>
                {TABS.map(t => {
                    const count = listings.filter(l => {
                        const isSoldOut = l.quantity_available === 0 && (l.reserved_quantity === 0 || !l.reserved_quantity);
                        if (t.key === 'active')   return l.status === 'AVAILABLE' && !isSoldOut;
                        if (t.key === 'upcoming') return l.status === 'UPCOMING' && !isSoldOut;
                        if (t.key === 'drafts')   return l.status === 'DRAFT';
                        if (t.key === 'closed')   return ['CLOSED', 'EXPIRED'].includes(l.status) || (['AVAILABLE', 'UPCOMING'].includes(l.status) && isSoldOut);
                        return false;
                    }).length;
                    return (
                        <TouchableOpacity
                            key={t.key}
                            style={[styles.filterChip, tab === t.key && styles.filterChipActive]}
                            onPress={() => setTab(t.key)}
                        >
                            <Text style={[styles.filterChipText, tab === t.key && styles.filterChipTextActive]}>
                                {t.label} ({count})
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {filtered.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="storefront-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={styles.emptyText}>No {tab} listings</Text>
                    {tab !== 'closed' && (
                        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateListing')}>
                            <Ionicons name="add-circle-outline" size={18} color={theme.colors.textInverse} />
                            <Text style={styles.createBtnText}>Create Listing</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => {
                        const statusColor = STATUS_COLOR[item.status] ?? theme.colors.primary;
                        const isSoldOut = item.quantity_available === 0 && (item.reserved_quantity === 0 || !item.reserved_quantity);
                        return (
                            <View style={styles.card}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
                                >
                                    <View style={styles.cardHead}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardTitle}>{item.species_name}{item.species_variant ? ` · ${item.species_variant}` : ''}</Text>
                                            <Text style={styles.cardSub}>{item.stage.toUpperCase()}</Text>
                                        </View>
                                        <View style={[styles.statusPill, { backgroundColor: (isSoldOut ? STATUS_COLOR.CLOSED : statusColor) + '22' }]}>
                                            <Text style={[styles.statusPillText, { color: isSoldOut ? STATUS_COLOR.CLOSED : statusColor }]}>
                                                {isSoldOut ? 'SOLD OUT' : item.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.metaGrid}>
                                        <Meta label="Available" value={item.quantity_available.toLocaleString('en-IN')} theme={theme} />
                                        <Meta label="Price" value={`₹${parseFloat(item.price_per_piece).toFixed(2)}`} theme={theme} />
                                        <Meta label="Reserved" value={item.reserved_quantity?.toString() ?? '0'} theme={theme} />
                                        <Meta label="Confirmed" value={item.confirmed_quantity?.toString() ?? '0'} theme={theme} />
                                    </View>

                                    <View style={styles.timingRow}>
                                        <Text style={styles.timingText}>Ready: {formatDate(item.expected_ready_date)}</Text>
                                        <Text style={styles.timingDot}>·</Text>
                                        <Text style={styles.timingText}>Expires: {formatDate(item.last_available_date)}</Text>
                                    </View>
                                </TouchableOpacity>

                                {Number(item.active_orders ?? 0) > 0 && (
                                    <TouchableOpacity
                                        style={styles.ordersBtn}
                                        onPress={() => navigation.navigate('IncomingOrders', { listingId: item.id })}
                                    >
                                        <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
                                        <Text style={styles.ordersBtnText}>
                                            {Number(item.active_orders)} active order{Number(item.active_orders) > 1 ? 's' : ''}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
                                    </TouchableOpacity>
                                )}

                                <View style={styles.actionRow}>
                                    {item.status === 'DRAFT' && (
                                        <>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => handlePublish(item)}>
                                                <Ionicons name="rocket-outline" size={14} color={theme.colors.textInverse} />
                                                <Text style={styles.actionBtnTextPrimary}>Publish</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item)}>
                                                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                                <Text style={styles.actionBtnTextDanger}>Delete</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                    {item.status === 'UPCOMING' && (
                                        <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary, { flex: 2 }]} onPress={() => handleMarkAvailable(item)}>
                                                <Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.textInverse} />
                                                <Text style={styles.actionBtnTextPrimary}>Available</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary, { flex: 1.5 }]} onPress={() => handleClose(item)}>
                                                <Text style={styles.actionBtnTextSecondary}>Close</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary, { flex: 1 }]} onPress={() => openQrCode(item)}>
                                                <Ionicons name="qr-code-outline" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {item.status === 'AVAILABLE' && (
                                        <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary, { flex: 1 }]} onPress={() => handleClose(item)}>
                                                <Text style={styles.actionBtnTextSecondary}>Close Listing</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary, { flex: 1 }]} onPress={() => openQrCode(item)}>
                                                <Ionicons name="qr-code-outline" size={14} color={theme.colors.textInverse} />
                                                <Text style={styles.actionBtnTextPrimary}>Share QR</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            {/* QR Code Modal */}
            <Modal
                visible={qrModalOpen}
                animationType="fade"
                transparent
                onRequestClose={() => setQrModalOpen(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                }}>
                    <View style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: 24,
                        padding: 24,
                        width: '100%',
                        maxWidth: 340,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        gap: 16,
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>Verified Seed QR Handshake</Text>
                            <TouchableOpacity onPress={() => setQrModalOpen(false)}>
                                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' }}>
                            Show this QR code to the grow-out farmer when selling this fingerling batch.
                        </Text>

                        {/* QR Code svg */}
                        <View style={{
                            backgroundColor: '#fff',
                            padding: 16,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                        }}>
                            <MockQrSvg />
                        </View>

                        {selectedQrListing && (
                            <View style={{
                                width: '100%',
                                backgroundColor: theme.colors.primary + '11',
                                borderRadius: 12,
                                padding: 12,
                                gap: 6,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.primary }}>Verified Genetic Purity</Text>
                                </View>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary }}>
                                    {selectedQrListing.species_name}
                                    {selectedQrListing.species_variant ? ` · ${selectedQrListing.species_variant}` : ''}
                                </Text>
                                <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                                    Hatchery: {selectedQrListing.hatchery_name}
                                </Text>
                                <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                                    Available: {selectedQrListing.quantity_available.toLocaleString('en-IN')} pieces
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                backgroundColor: theme.colors.primary,
                                paddingVertical: 12,
                                paddingHorizontal: 20,
                                borderRadius: 12,
                                width: '100%',
                                justifyContent: 'center',
                            }}
                            onPress={() => {
                                if (!selectedQrListing) return;
                                const payload = {
                                    id: selectedQrListing.id,
                                    species_name: selectedQrListing.species_name,
                                    variant: selectedQrListing.species_variant || selectedQrListing.species_name,
                                    avgWeightG: 5.0,
                                    pricingModel: 'PIECES',
                                    pieces: selectedQrListing.quantity_available,
                                    totalKg: (selectedQrListing.quantity_available * 5) / 1000,
                                    amount: selectedQrListing.quantity_available * parseFloat(selectedQrListing.price_per_piece),
                                    soldDate: new Date().toISOString().slice(0, 10),
                                    hatchery_name: selectedQrListing.hatchery_name,
                                    hatchery_district: selectedQrListing.district_snapshot || 'Begusarai',
                                    is_verified_seed: true
                                };
                                const payloadStr = JSON.stringify(payload);
                                Clipboard.setString(payloadStr);
                                Alert.alert('Copied!', 'Handshake payload copied to clipboard for simulation scanner.');
                            }}
                        >
                            <Ionicons name="copy-outline" size={16} color={theme.colors.textInverse} />
                            <Text style={{ color: theme.colors.textInverse, fontSize: 14, fontWeight: '800' }}>Copy Handshake Payload</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ── Mock QR SVG ──────────────────────────────────────────────────────────────
function MockQrSvg() {
    return (
        <Svg width={200} height={200} viewBox="0 0 29 29">
            {/* Background */}
            <Rect width={29} height={29} fill="white" />
            {/* Top Left Marker */}
            <Path d="M0,0 h7 v7 h-7 z M1,1 h5 v5 h-5 z M2,2 h3 v3 h-3 z" fill="black" />
            {/* Top Right Marker */}
            <Path d="M22,0 h7 v7 h-7 z M23,1 h5 v5 h-5 z M24,2 h3 v3 h-3 z" fill="black" />
            {/* Bottom Left Marker */}
            <Path d="M0,22 h7 v7 h-7 z M1,23 h5 v5 h-5 z M2,24 h3 v3 h-3 z" fill="black" />
            {/* Random bits */}
            <Path d="M8,1 h2 v2 h-2 z M12,0 h1 v3 h-1 z M15,1 h3 v1 h-3 z M20,0 h1 v2 h-1 z" fill="black" />
            <Path d="M9,4 h1 v2 h-1 z M13,5 h3 v1 h-3 z M18,4 h2 v2 h-2 z" fill="black" />
            <Path d="M8,8 h3 v1 h-3 z M14,7 h1 v3 h-1 z M17,9 h4 v1 h-4 z M24,8 h2 v2 h-2 z" fill="black" />
            <Path d="M1,9 h2 v2 h-2 z M5,8 h1 v3 h-1 z M10,12 h2 v2 h-2 z M16,11 h1 v3 h-1 z M21,13 h3 v1 h-3 z" fill="black" />
            <Path d="M3,15 h3 v2 h-3 z M8,16 h4 v1 h-4 z M14,14 h3 v2 h-3 z M20,16 h1 v3 h-1 z M25,15 h2 v2 h-2 z" fill="black" />
            <Path d="M10,19 h2 v2 h-2 z M15,18 h2 v3 h-2 z M19,19 h4 v1 h-4 z M26,20 h2 v2 h-2 z" fill="black" />
            <Path d="M8,23 h3 v1 h-3 z M13,22 h2 v3 h-2 z M17,24 h2 v1 h-2 z M24,23 h3 v2 h-3 z" fill="black" />
            <Path d="M9,26 h2 v2 h-2 z M14,27 h4 v1 h-4 z M20,26 h1 v3 h-1 z M25,27 h2 v1 h-2 z" fill="black" />
        </Svg>
    );
}

function Meta({ label, value, theme }: any) {
    const c = theme.colors;
    return (
        <View style={{ flex: 1, minWidth: '40%' }}>
            <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: '700' }}>{label.toUpperCase()}</Text>
            <Text style={{ fontSize: 14, color: c.textPrimary, fontWeight: '800', marginTop: 2 }}>{value}</Text>
        </View>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    return StyleSheet.create({
        safeArea: { flex: 1, backgroundColor: c.background },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
        emptyText: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
        headerAddBtn: {
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: c.primary,
            alignItems: 'center', justifyContent: 'center',
        },
        createBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.primary,
            paddingHorizontal: 22,
            paddingVertical: 12,
            borderRadius: 14,
        },
        createBtnText: { color: c.textInverse, fontSize: 14, fontWeight: '800' },
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
        cardSub: { fontSize: 11, color: c.textMuted, fontWeight: '700', letterSpacing: 0.5 },
        statusPill: {
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            alignSelf: 'flex-start',
        },
        statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
        metaGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
        timingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        timingText: { fontSize: 12, color: c.textMuted },
        timingDot: { color: c.textMuted },
        ordersBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.primary + '15',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        ordersBtnText: { flex: 1, fontSize: 13, fontWeight: '700', color: c.primary },
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
    });
};
