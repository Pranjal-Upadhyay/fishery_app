/**
 * ListingDetailScreen
 * Farmer views a specific listing in full detail and either:
 *   - Places a purchase order (AVAILABLE listings), or
 *   - Expresses advance interest (UPCOMING listings)
 *
 * All payment is off-platform — the hatchery's contact phone + UPI are shown.
 */

import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import ScreenHeader from '../components/ScreenHeader';
import {
    marketplaceService,
    MarketplaceListing,
    MarketplaceOrder,
    LogisticsPreference,
} from '../services/apiService';

const STAGE_COLOR: Record<string, string> = {
    fingerling: '#0ea5e9',
    fry: '#f59e0b',
};

const STATUS_LABEL: Record<string, string> = {
    AVAILABLE: 'AVAILABLE NOW',
    UPCOMING: 'COMING SOON',
    CLOSED: 'CLOSED',
    EXPIRED: 'EXPIRED',
    DRAFT: 'DRAFT',
};

function formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ListingDetailScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { listingId } = route.params;
    const { currentUser } = useAuth();

    const [listing, setListing] = useState<MarketplaceListing | null>(null);
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState(false);
    const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    const [quantity, setQuantity] = useState('');
    const [logistics, setLogistics] = useState<LogisticsPreference>('PICKUP');
    const [preferredDate, setPreferredDate] = useState('');
    const [notes, setNotes] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');

    const load = useCallback(async () => {
        try {
            const data = await marketplaceService.getListing(listingId);
            setListing(data);
            // Default logistics preference based on what's offered
            if (data.delivery_available && !data.pickup_available) setLogistics('DELIVERY');
            else setLogistics('PICKUP');

            if (currentUser && data.operator_id === currentUser.id) {
                setLoadingOrders(true);
                try {
                    const allOrders = await marketplaceService.getMyOrders();
                    setOrders(allOrders.filter((o) => o.listing_id === listingId));
                } catch (err) {
                    console.error('Error loading listing orders:', err);
                } finally {
                    setLoadingOrders(false);
                }
            }
        } catch {
            Alert.alert('Error', 'Could not load listing. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [listingId, currentUser]);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const computePrice = (qty: number, l: MarketplaceListing): { price: number; bulk: boolean } => {
        const standard = parseFloat(l.price_per_piece);
        if (l.bulk_price_per_piece && l.bulk_price_threshold && qty >= l.bulk_price_threshold) {
            return { price: parseFloat(l.bulk_price_per_piece), bulk: true };
        }
        return { price: standard, bulk: false };
    };

    const totalAmount = listing
        ? computePrice(parseInt(quantity, 10) || 0, listing).price * (parseInt(quantity, 10) || 0)
        : 0;
    const bulkApplies = listing
        ? computePrice(parseInt(quantity, 10) || 0, listing).bulk
        : false;

    const handlePlaceOrder = async () => {
        if (!listing) return;

        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0) {
            Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
            return;
        }
        if (qty < listing.min_order_qty) {
            Alert.alert('Minimum Order', `Minimum order quantity is ${listing.min_order_qty.toLocaleString('en-IN')} pieces.`);
            return;
        }
        if (qty > listing.quantity_available) {
            Alert.alert('Not Enough Stock', `Only ${listing.quantity_available.toLocaleString('en-IN')} pieces are available.`);
            return;
        }
        if (logistics === 'DELIVERY' && !listing.delivery_available) {
            Alert.alert('Not Offered', 'Delivery is not offered for this listing.');
            return;
        }
        if (logistics === 'PICKUP' && !listing.pickup_available) {
            Alert.alert('Not Offered', 'Pickup is not offered for this listing.');
            return;
        }

        const isInterest = listing.status === 'UPCOMING';

        Alert.alert(
            isInterest ? 'Express Interest?' : 'Confirm Order',
            isInterest
                ? `Express interest in ${qty.toLocaleString('en-IN')} ${listing.stage}s of ${listing.species_name}?\n\nThis is non-binding — you will be notified when stock is ready.`
                : `Order ${qty.toLocaleString('en-IN')} ${listing.stage}s of ${listing.species_name} for ₹${totalAmount.toLocaleString('en-IN')}?\n\nThe hatchery will review your order. You will pay directly (UPI/bank transfer) after they accept.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isInterest ? 'Express Interest' : 'Place Order',
                    onPress: async () => {
                        setPlacing(true);
                        try {
                            if (isInterest) {
                                await marketplaceService.placeInterest(listingId, {
                                    quantity_requested: qty,
                                    logistics_preference: logistics,
                                    preferred_date: preferredDate.trim() || null,
                                    farmer_notes: notes.trim() || null,
                                });
                                Alert.alert(
                                    'Interest Recorded',
                                    'The hatchery will be notified. When stock is ready, you will be prompted to confirm your order.',
                                    [{ text: 'View My Orders', onPress: () => navigation.replace('MyOrders') }],
                                );
                            } else {
                                await marketplaceService.placeOrder({
                                    listing_id: listingId,
                                    quantity_requested: qty,
                                    logistics_preference: logistics,
                                    preferred_date: preferredDate.trim() || null,
                                    farmer_notes: notes.trim() || null,
                                    delivery_address: logistics === 'DELIVERY' ? deliveryAddress.trim() || null : null,
                                });
                                Alert.alert(
                                    'Order Placed',
                                    'The hatchery will review and accept. Then you pay directly and mark as paid.',
                                    [{ text: 'View My Orders', onPress: () => navigation.replace('MyOrders') }],
                                );
                            }
                        } catch (err: any) {
                            Alert.alert('Failed', err?.response?.data?.error ?? 'Could not place order.');
                        } finally {
                            setPlacing(false);
                        }
                    },
                },
            ],
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScreenHeader title="Listing Detail" onBack={() => navigation.goBack()} />
                <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    if (!listing) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScreenHeader title="Listing Detail" onBack={() => navigation.goBack()} />
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
                    <Text style={styles.errorText}>Listing not found.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const stageColor = STAGE_COLOR[listing.stage] ?? theme.colors.primary;
    const isOwner = Boolean(currentUser && listing && listing.operator_id === currentUser.id);
    const isSoldOut = (listing.status === 'AVAILABLE' && listing.quantity_available === 0) || listing.status === 'CLOSED';
    const isPurchasable = listing.status === 'AVAILABLE' && listing.quantity_available > 0;
    const isInterestable = listing.status === 'UPCOMING';
    const canOrder = (isPurchasable || isInterestable) && !isOwner;

    let badgeText = STATUS_LABEL[listing.status] ?? listing.status;
    let badgeStyle = styles.statusBadgeClosed;

    if (listing.status === 'AVAILABLE') {
        if (listing.quantity_available > 0) {
            badgeText = 'AVAILABLE NOW';
            badgeStyle = styles.statusBadgeAvailable;
        } else {
            badgeText = 'SOLD OUT';
            badgeStyle = styles.statusBadgeClosed;
        }
    } else if (listing.status === 'CLOSED') {
        badgeText = 'SOLD OUT';
        badgeStyle = styles.statusBadgeClosed;
    } else if (listing.status === 'UPCOMING') {
        badgeText = 'COMING SOON';
        badgeStyle = styles.statusBadgeUpcoming;
    }

    const locText = [
        listing.panchayat_snapshot,
        listing.block_snapshot,
        listing.district_snapshot,
    ].filter(Boolean).join(', ') || 'Location not available';

    const contactNumber = listing.contact_number_snapshot ?? null;
    const upiId = listing.upi_id_snapshot ?? null;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader
                title={listing.species_name}
                subtitle={listing.species_variant ?? undefined}
                onBack={() => navigation.goBack()}
            />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Stage + status banner */}
                    <View style={styles.heroBanner}>
                        <View style={[styles.stagePill, { backgroundColor: stageColor + '22' }]}>
                            <Ionicons name="fish-outline" size={14} color={stageColor} />
                            <Text style={[styles.stagePillText, { color: stageColor }]}>
                                {listing.stage.toUpperCase()}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, badgeStyle]}>
                            <Text style={styles.statusBadgeText}>{badgeText}</Text>
                        </View>
                    </View>

                    {/* Ready date for upcoming */}
                    {isInterestable && (
                        <View style={styles.calendarRow}>
                            <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                            <Text style={styles.calendarText}>
                                Ready from <Text style={{ fontWeight: '800' }}>{formatDate(listing.expected_ready_date)}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Price & quantity stats */}
                    <View style={styles.statsGrid}>
                        <StatBox icon="cash-outline" label="Price / Piece" value={`₹${parseFloat(listing.price_per_piece).toFixed(2)}`} accent={theme.colors.primary} theme={theme} />
                        <StatBox icon="layers-outline" label="Available" value={listing.quantity_available.toLocaleString('en-IN')} accent={listing.quantity_available < 500 ? '#ef4444' : '#22c55e'} theme={theme} />
                        <StatBox icon="bag-outline" label="Min Order" value={listing.min_order_qty.toLocaleString('en-IN')} theme={theme} />
                        <StatBox icon="fish-outline" label="Batch" value={listing.total_quantity.toLocaleString('en-IN')} theme={theme} />
                    </View>

                    {/* Bulk pricing tier badge */}
                    {listing.bulk_price_per_piece && listing.bulk_price_threshold && (
                        <View style={styles.bulkBadge}>
                            <Ionicons name="pricetag-outline" size={16} color={theme.colors.primary} />
                            <Text style={styles.bulkBadgeText}>
                                Bulk price ₹{parseFloat(listing.bulk_price_per_piece).toFixed(2)}/pc for {listing.bulk_price_threshold.toLocaleString('en-IN')}+ pieces
                            </Text>
                        </View>
                    )}

                    {/* Size description */}
                    {listing.size_description && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>SIZE / AGE</Text>
                            <Text style={styles.descText}>{listing.size_description}</Text>
                        </View>
                    )}

                    {/* Description */}
                    {listing.description && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                            <Text style={styles.descText}>{listing.description}</Text>
                        </View>
                    )}

                    {/* Hatchery info — UID is prominent */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>HATCHERY</Text>
                        <View style={styles.hatcheryCard}>
                            <View style={styles.hatcheryIconWrap}>
                                <Ionicons name="business-outline" size={22} color={theme.colors.primary} />
                            </View>
                            <View style={{ flex: 1, gap: 3 }}>
                                <Text style={styles.hatcheryName}>{listing.hatchery_name}</Text>
                                <Text style={styles.hatcheryLoc}>{locText}</Text>
                                <Text style={styles.operatorLine}>Operator: {listing.operator_name}</Text>
                            </View>
                            {contactNumber && !isOwner && (
                                <TouchableOpacity
                                    style={styles.callBtn}
                                    onPress={() => Linking.openURL(`tel:${contactNumber}`)}
                                >
                                    <Ionicons name="call-outline" size={18} color={theme.colors.textInverse} />
                                </TouchableOpacity>
                            )}
                        </View>
                        {listing.hatchery_uid_snapshot && (
                            <View style={styles.uidStrip}>
                                <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
                                <Text style={styles.uidStripText}>Gov. UID: {listing.hatchery_uid_snapshot}</Text>
                            </View>
                        )}
                    </View>

                    {/* Logistics summary */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>LOGISTICS</Text>
                        <View style={styles.logRow}>
                            <LogChip
                                active={listing.pickup_available}
                                label="Pickup"
                                icon="walk-outline"
                                theme={theme}
                            />
                            <LogChip
                                active={listing.delivery_available}
                                label="Delivery"
                                icon="car-outline"
                                theme={theme}
                            />
                        </View>
                        {listing.logistics_notes && (
                            <Text style={[styles.descText, { marginTop: 8 }]}>{listing.logistics_notes}</Text>
                        )}
                    </View>

                    {/* Validity dates */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>VALIDITY</Text>
                        <View style={styles.dateRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dateLabel}>Ready from</Text>
                                <Text style={styles.dateValue}>{formatDate(listing.expected_ready_date)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dateLabel}>Last sale by</Text>
                                <Text style={styles.dateValue}>{formatDate(listing.last_available_date)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Payment disclaimer */}
                    {!isOwner && (
                        <View style={styles.disclaimerCard}>
                            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.disclaimerText}>
                                Payment is made <Text style={{ fontWeight: '800' }}>directly to the hatchery</Text> via UPI or bank transfer
                                after they accept your order. You then mark as Paid in My Orders.
                            </Text>
                        </View>
                    )}

                    {/* Order form / Owner summary */}
                    {isOwner ? (
                        <View style={styles.ownerPanel}>
                            <Text style={styles.ownerPanelTitle}>HATCHERY SALES SUMMARY</Text>
                            <View style={styles.ownerStatsGrid}>
                                <View style={styles.ownerStatCard}>
                                    <Text style={styles.ownerStatVal}>{listing.total_quantity.toLocaleString('en-IN')}</Text>
                                    <Text style={styles.ownerStatLabel}>Total Created</Text>
                                </View>
                                <View style={styles.ownerStatCard}>
                                    <Text style={[styles.ownerStatVal, { color: theme.colors.primary }]}>
                                        {listing.confirmed_quantity.toLocaleString('en-IN')}
                                    </Text>
                                    <Text style={styles.ownerStatLabel}>Sold / Confirmed</Text>
                                </View>
                                <View style={styles.ownerStatCard}>
                                    <Text style={[styles.ownerStatVal, { color: '#f59e0b' }]}>
                                        {listing.reserved_quantity.toLocaleString('en-IN')}
                                    </Text>
                                    <Text style={styles.ownerStatLabel}>Reserved</Text>
                                </View>
                                <View style={styles.ownerStatCard}>
                                    <Text style={[styles.ownerStatVal, { color: listing.quantity_available > 0 ? '#22c55e' : theme.colors.textMuted }]}>
                                        {listing.quantity_available.toLocaleString('en-IN')}
                                    </Text>
                                    <Text style={styles.ownerStatLabel}>Remaining Available</Text>
                                </View>
                            </View>

                            <View style={[styles.ownerRevenueBlock, { backgroundColor: theme.colors.primary + '15' }]}>
                                <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
                                <Text style={styles.ownerRevenueText}>
                                    Estimated Revenue:{' '}
                                    <Text style={{ fontWeight: '800', color: theme.colors.primary }}>
                                        ₹{(listing.confirmed_quantity * parseFloat(listing.price_per_piece)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </Text>
                                </Text>
                            </View>

                            <View style={{ marginTop: 12, gap: 10 }}>
                                <Text style={styles.buyerSectionTitle}>Buyer Details & Payment Status</Text>
                                {loadingOrders ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} />
                                ) : orders.length === 0 ? (
                                    <Text style={styles.noOrdersText}>No orders placed on this listing yet.</Text>
                                ) : (
                                    orders.map((order) => {
                                        const isPaid = order.status === 'HATCHERY_CONFIRMED' || order.status === 'FULFILLED' || order.status === 'FARMER_PAID';
                                        return (
                                            <View key={order.id} style={styles.buyerCard}>
                                                <View style={{ flex: 1, gap: 2 }}>
                                                    <Text style={styles.buyerName}>{order.farmer_name || 'Farmer'}</Text>
                                                    <Text style={styles.buyerPhone}>Phone: {order.farmer_phone || 'N/A'}</Text>
                                                    <Text style={styles.buyerQty}>
                                                        Qty: {order.quantity_ordered.toLocaleString('en-IN')} pcs
                                                    </Text>
                                                    <Text style={styles.buyerAmount}>
                                                        Amount: ₹{parseFloat(order.total_amount).toLocaleString('en-IN')}
                                                    </Text>
                                                </View>
                                                <View style={[
                                                    styles.paymentBadge,
                                                    isPaid ? styles.paymentBadgePaid : styles.paymentBadgePending
                                                ]}>
                                                    <Text style={[
                                                        styles.paymentBadgeText,
                                                        { color: isPaid ? '#22c55e' : '#f59e0b' }
                                                    ]}>
                                                        {order.status === 'HATCHERY_CONFIRMED' || order.status === 'FULFILLED'
                                                            ? 'PAID & CONFIRMED'
                                                            : order.status === 'FARMER_PAID'
                                                            ? 'PAID (PENDING REVIEW)'
                                                            : 'PENDING'}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                            </View>
                        </View>
                    ) : canOrder ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>{isInterestable ? 'EXPRESS INTEREST' : 'PLACE YOUR ORDER'}</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Quantity (pieces)
                                    <Text style={styles.inputHint}>
                                        {' '}— min {listing.min_order_qty.toLocaleString('en-IN')}
                                        {!isInterestable && `, max ${listing.quantity_available.toLocaleString('en-IN')}`}
                                    </Text>
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={`e.g. ${listing.min_order_qty}`}
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="number-pad"
                                />
                            </View>

                            {parseInt(quantity, 10) > 0 && (
                                <View style={styles.totalRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.totalLabel}>Estimated Total</Text>
                                        {bulkApplies && (
                                            <Text style={styles.bulkAppliesText}>Bulk price applied</Text>
                                        )}
                                    </View>
                                    <Text style={styles.totalAmount}>
                                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Logistics Preference</Text>
                                <View style={styles.logToggleRow}>
                                    {listing.pickup_available && (
                                        <TouchableOpacity
                                            style={[styles.logToggle, logistics === 'PICKUP' && styles.logToggleActive]}
                                            onPress={() => setLogistics('PICKUP')}
                                        >
                                            <Ionicons name="walk-outline" size={16}
                                                color={logistics === 'PICKUP' ? theme.colors.textInverse : theme.colors.textSecondary} />
                                            <Text style={[styles.logToggleText, logistics === 'PICKUP' && styles.logToggleTextActive]}>
                                                Pickup
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    {listing.delivery_available && (
                                        <TouchableOpacity
                                            style={[styles.logToggle, logistics === 'DELIVERY' && styles.logToggleActive]}
                                            onPress={() => setLogistics('DELIVERY')}
                                        >
                                            <Ionicons name="car-outline" size={16}
                                                color={logistics === 'DELIVERY' ? theme.colors.textInverse : theme.colors.textSecondary} />
                                            <Text style={[styles.logToggleText, logistics === 'DELIVERY' && styles.logToggleTextActive]}>
                                                Delivery
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Preferred Date (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={preferredDate}
                                    onChangeText={(t) => setPreferredDate(t.replace(/[^0-9-]/g, '').slice(0, 10))}
                                    keyboardType="numbers-and-punctuation"
                                />
                            </View>

                            {logistics === 'DELIVERY' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Delivery Address</Text>
                                    <TextInput
                                        style={[styles.input, styles.inputMultiline]}
                                        placeholder="Village, Block, District..."
                                        placeholderTextColor={theme.colors.textMuted}
                                        value={deliveryAddress}
                                        onChangeText={setDeliveryAddress}
                                        multiline
                                    />
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Notes for Hatchery (optional)</Text>
                                <TextInput
                                    style={[styles.input, styles.inputMultiline]}
                                    placeholder="Any specific requirements..."
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.placeOrderBtn, placing && { opacity: 0.6 }]}
                                onPress={handlePlaceOrder}
                                disabled={placing}
                                activeOpacity={0.85}
                            >
                                {placing ? (
                                    <ActivityIndicator color={theme.colors.textInverse} size="small" />
                                ) : (
                                    <Ionicons name={isInterestable ? 'star-outline' : 'cart-outline'}
                                        size={20} color={theme.colors.textInverse} />
                                )}
                                <Text style={styles.placeOrderBtnText}>
                                    {placing
                                        ? 'Sending...'
                                        : isInterestable ? 'Express Interest' : 'Place Order'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.unavailableCard}>
                            <Ionicons name="alert-circle-outline" size={32} color={theme.colors.textMuted} />
                            <Text style={styles.unavailableText}>
                                This listing is {isSoldOut ? 'sold out' : listing.status.toLowerCase()} and is not accepting new orders.
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 32 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function StatBox({ icon, label, value, theme, accent }: any) {
    const c = theme.colors;
    const color = accent || c.textSecondary;
    return (
        <View style={{
            flex: 1,
            backgroundColor: c.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.border,
            padding: 14,
            alignItems: 'center',
            gap: 5,
            minWidth: '40%',
        }}>
            <Ionicons name={icon} size={20} color={color} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: c.textPrimary }}>{value}</Text>
            <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
        </View>
    );
}

function LogChip({ active, label, icon, theme }: any) {
    const c = theme.colors;
    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: active ? (c.primary + '88') : c.border,
            backgroundColor: active ? (c.primary + '15') : c.surface,
        }}>
            <Ionicons name={icon} size={14} color={active ? c.primary : c.textMuted} />
            <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: active ? c.primary : c.textMuted,
            }}>
                {label} {active ? '✓' : '✗'}
            </Text>
        </View>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    return StyleSheet.create({
        safeArea: { flex: 1, backgroundColor: c.background },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
        errorText: { fontSize: 16, color: c.error, textAlign: 'center' },
        scroll: { padding: 16, gap: 16 },
        heroBanner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        stagePill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
        },
        stagePillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
        statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
        statusBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
        statusBadgeAvailable: { backgroundColor: '#22c55e' },
        statusBadgeUpcoming: { backgroundColor: '#f59e0b' },
        statusBadgeClosed: { backgroundColor: '#94a3b8' },
        calendarRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#f59e0b15',
            borderColor: '#f59e0b44',
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
        },
        calendarText: { fontSize: 13, color: c.textSecondary },
        statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        section: { gap: 10 },
        sectionLabel: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1 },
        descText: { fontSize: 14, color: c.textSecondary, lineHeight: 21 },
        bulkBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.primary + '15',
            borderRadius: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: c.primary + '44',
        },
        bulkBadgeText: { fontSize: 12, fontWeight: '700', color: c.primary, flex: 1 },
        hatcheryCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.border,
            padding: 14,
            gap: 12,
        },
        hatcheryIconWrap: {
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: c.primaryLight ?? '#e0fdf4',
            alignItems: 'center',
            justifyContent: 'center',
        },
        hatcheryName: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
        hatcheryLoc: { fontSize: 13, color: c.textSecondary },
        operatorLine: { fontSize: 12, color: c.textMuted },
        callBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        uidStrip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: '#22c55e15',
            borderRadius: 10,
        },
        uidStripText: { fontSize: 12, fontWeight: '700', color: '#22c55e' },
        logRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
        dateRow: {
            flexDirection: 'row',
            backgroundColor: c.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            padding: 14,
            gap: 12,
        },
        dateLabel: { fontSize: 11, color: c.textMuted, fontWeight: '700' },
        dateValue: { fontSize: 14, color: c.textPrimary, fontWeight: '800', marginTop: 2 },
        disclaimerCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: c.primaryLight ?? '#e0fdf4',
            borderRadius: 14,
            padding: 14,
        },
        disclaimerText: { flex: 1, fontSize: 13, color: c.textSecondary, lineHeight: 20 },
        inputGroup: { gap: 6, marginBottom: 8 },
        inputLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
        inputHint: { fontSize: 12, fontWeight: '400', color: c.textMuted },
        input: {
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            height: 52,
            paddingVertical: 0,
            color: c.textPrimary,
            fontSize: 15,
        },
        inputMultiline: { height: undefined, minHeight: 64, paddingVertical: 12, textAlignVertical: 'top' },
        totalRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: c.primaryLight ?? '#e0fdf4',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 12,
        },
        totalLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
        totalAmount: { fontSize: 18, fontWeight: '800', color: c.primary },
        bulkAppliesText: { fontSize: 11, fontWeight: '700', color: '#22c55e', marginTop: 2 },
        logToggleRow: { flexDirection: 'row', gap: 8 },
        logToggle: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: c.border,
            backgroundColor: c.surface,
        },
        logToggleActive: { backgroundColor: c.primary, borderColor: c.primary },
        logToggleText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
        logToggleTextActive: { color: c.textInverse },
        placeOrderBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: c.primary,
            borderRadius: 16,
            paddingVertical: 16,
            marginTop: 4,
        },
        placeOrderBtnText: { color: c.textInverse, fontSize: 16, fontWeight: '800' },
        unavailableCard: {
            alignItems: 'center',
            gap: 12,
            padding: 32,
            backgroundColor: c.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.border,
        },
        unavailableText: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
        ownerPanel: {
            backgroundColor: c.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.border,
            padding: 16,
            gap: 16,
        },
        ownerPanelTitle: {
            fontSize: 14,
            fontWeight: '800',
            color: c.textPrimary,
            letterSpacing: 1,
        },
        ownerStatsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        ownerStatCard: {
            flex: 1,
            minWidth: '45%',
            backgroundColor: c.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            padding: 12,
            alignItems: 'center',
            gap: 4,
        },
        ownerStatVal: {
            fontSize: 16,
            fontWeight: '800',
            color: c.textPrimary,
        },
        ownerStatLabel: {
            fontSize: 11,
            color: c.textMuted,
            fontWeight: '700',
            textAlign: 'center',
        },
        ownerRevenueBlock: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: 12,
            padding: 14,
        },
        ownerRevenueText: {
            fontSize: 14,
            color: c.textSecondary,
        },
        buyerSectionTitle: {
            fontSize: 13,
            fontWeight: '800',
            color: c.textSecondary,
            marginTop: 8,
        },
        noOrdersText: {
            fontSize: 13,
            color: c.textMuted,
            fontStyle: 'italic',
        },
        buyerCard: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: c.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            padding: 12,
            gap: 10,
        },
        buyerName: {
            fontSize: 14,
            fontWeight: '700',
            color: c.textPrimary,
        },
        buyerPhone: {
            fontSize: 12,
            color: c.textSecondary,
        },
        buyerQty: {
            fontSize: 12,
            color: c.textSecondary,
            fontWeight: '600',
        },
        buyerAmount: {
            fontSize: 12,
            color: c.textSecondary,
            fontWeight: '600',
        },
        paymentBadge: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        paymentBadgePaid: {
            backgroundColor: '#22c55e15',
        },
        paymentBadgePending: {
            backgroundColor: '#f59e0b15',
        },
        paymentBadgeText: {
            fontSize: 10,
            fontWeight: '800',
        },
    });
};
