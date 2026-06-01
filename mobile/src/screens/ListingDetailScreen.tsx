/**
 * ListingDetailScreen
 * Farmer views a specific listing and places an order.
 * Payment is confirmed off-platform; the farmer marks "paid" separately.
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
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';

interface ListingDetail {
    id: string;
    stage: 'fry' | 'fingerling';
    species_name: string;
    species_variant: string | null;
    description: string | null;
    total_quantity: number;
    quantity_available: number;
    min_order_qty: number;
    price_per_piece: string;
    status: string;
    hatchery_name: string;
    hatchery_district: string;
    hatchery_block: string;
    hatchery_panchayat: string | null;
    operator_name: string;
    operator_phone: string;
}

const STAGE_COLOR: Record<string, string> = {
    fingerling: '#0ea5e9',
    fry:        '#f59e0b',
};

export default function ListingDetailScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { listingId } = route.params;

    const [listing, setListing] = useState<ListingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState(false);

    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await api.get(`/api/v1/marketplace/listings/${listingId}`);
            setListing(res.data?.data ?? null);
        } catch {
            Alert.alert('Error', 'Could not load listing. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [listingId]);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const totalAmount = listing
        ? parseFloat(listing.price_per_piece) * (parseInt(quantity, 10) || 0)
        : 0;

    const handlePlaceOrder = async () => {
        if (!listing) return;

        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0) {
            Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
            return;
        }
        if (qty < listing.min_order_qty) {
            Alert.alert('Minimum Order', `Minimum order quantity is ${listing.min_order_qty} pieces.`);
            return;
        }
        if (qty > listing.quantity_available) {
            Alert.alert('Not Enough Stock', `Only ${listing.quantity_available} pieces are available.`);
            return;
        }

        Alert.alert(
            'Confirm Order',
            `Order ${qty.toLocaleString('en-IN')} ${listing.stage}s of ${listing.species_name} for ₹${totalAmount.toLocaleString('en-IN')}?\n\nYou will pay directly to the hatchery via bank transfer after placing this order.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Place Order',
                    onPress: async () => {
                        setPlacing(true);
                        try {
                            await api.post('/api/v1/marketplace/orders', {
                                listing_id: listingId,
                                quantity_ordered: qty,
                                farmer_notes: notes.trim() || undefined,
                                delivery_address: deliveryAddress.trim() || undefined,
                            });
                            Alert.alert(
                                'Order Placed',
                                'Your order has been placed. Pay the hatchery operator directly and then mark it as "Paid" in My Orders.',
                                [{ text: 'View My Orders', onPress: () => navigation.replace('MyOrders') }],
                            );
                        } catch (err: any) {
                            Alert.alert('Order Failed', err?.response?.data?.error ?? 'Could not place order.');
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
    const isAvailable = listing.status === 'ACTIVE' && listing.quantity_available > 0;

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
                        {!isAvailable && (
                            <View style={styles.soldOutBadge}>
                                <Text style={styles.soldOutText}>
                                    {listing.status === 'SOLD_OUT' ? 'SOLD OUT' : 'UNAVAILABLE'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Price & quantity stats */}
                    <View style={styles.statsGrid}>
                        <StatBox
                            icon="cash-outline"
                            label="Price / Piece"
                            value={`₹${parseFloat(listing.price_per_piece).toFixed(2)}`}
                            theme={theme}
                            accent={theme.colors.primary}
                        />
                        <StatBox
                            icon="layers-outline"
                            label="Available"
                            value={listing.quantity_available.toLocaleString('en-IN')}
                            theme={theme}
                            accent={listing.quantity_available < 500 ? '#ef4444' : '#22c55e'}
                        />
                        <StatBox
                            icon="bag-outline"
                            label="Min Order"
                            value={listing.min_order_qty.toLocaleString('en-IN')}
                            theme={theme}
                        />
                        <StatBox
                            icon="fish-outline"
                            label="Total Stock"
                            value={listing.total_quantity.toLocaleString('en-IN')}
                            theme={theme}
                        />
                    </View>

                    {/* Description */}
                    {listing.description ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                            <Text style={styles.descText}>{listing.description}</Text>
                        </View>
                    ) : null}

                    {/* Hatchery info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>HATCHERY INFO</Text>
                        <View style={styles.hatcheryCard}>
                            <View style={styles.hatcheryIconWrap}>
                                <Ionicons name="business-outline" size={22} color={theme.colors.primary} />
                            </View>
                            <View style={{ flex: 1, gap: 3 }}>
                                <Text style={styles.hatcheryName}>{listing.hatchery_name}</Text>
                                <Text style={styles.hatcheryLoc}>
                                    {[listing.hatchery_block, listing.hatchery_district].filter(Boolean).join(', ')}
                                </Text>
                                <Text style={styles.operatorLine}>
                                    Operator: {listing.operator_name}
                                </Text>
                            </View>
                            {listing.operator_phone ? (
                                <TouchableOpacity
                                    style={styles.callBtn}
                                    activeOpacity={0.8}
                                    onPress={() => Linking.openURL(`tel:${listing.operator_phone}`)}
                                >
                                    <Ionicons name="call-outline" size={18} color={theme.colors.textInverse} />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>

                    {/* Payment disclaimer */}
                    <View style={styles.disclaimerCard}>
                        <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.disclaimerText}>
                            Payment is made <Text style={{ fontWeight: '800' }}>directly to the hatchery</Text> via bank transfer or UPI.
                            After paying, mark your order as "Paid" in My Orders so the hatchery can confirm.
                        </Text>
                    </View>

                    {/* Order form */}
                    {isAvailable ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>PLACE YOUR ORDER</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Quantity (pieces)
                                    <Text style={styles.inputHint}>
                                        {' '}— min {listing.min_order_qty.toLocaleString('en-IN')}, max {listing.quantity_available.toLocaleString('en-IN')}
                                    </Text>
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={`e.g. ${listing.min_order_qty}`}
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="number-pad"
                                    returnKeyType="next"
                                />
                            </View>

                            {quantity.length > 0 && parseInt(quantity, 10) > 0 ? (
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Estimated Total</Text>
                                    <Text style={styles.totalAmount}>
                                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            ) : null}

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Delivery Address (optional)</Text>
                                <TextInput
                                    style={[styles.input, styles.inputMultiline]}
                                    placeholder="Village, Block, District..."
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={deliveryAddress}
                                    onChangeText={setDeliveryAddress}
                                    multiline
                                    numberOfLines={2}
                                    textAlignVertical="top"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Notes for Hatchery (optional)</Text>
                                <TextInput
                                    style={[styles.input, styles.inputMultiline]}
                                    placeholder="Any special requests or notes..."
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    numberOfLines={2}
                                    textAlignVertical="top"
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
                                    <Ionicons name="cart-outline" size={20} color={theme.colors.textInverse} />
                                )}
                                <Text style={styles.placeOrderBtnText}>
                                    {placing ? 'Placing Order...' : 'Place Order'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.unavailableCard}>
                            <Ionicons name="alert-circle-outline" size={32} color={theme.colors.textMuted} />
                            <Text style={styles.unavailableText}>
                                This listing is {listing.status === 'SOLD_OUT' ? 'sold out' : 'unavailable'}. Check other listings.
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
            <Text style={{ fontSize: 18, fontWeight: '800', color: c.textPrimary }}>{value}</Text>
            <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
        </View>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    return StyleSheet.create({
        safeArea:    { flex: 1, backgroundColor: c.background },
        center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
        errorText:   { fontSize: 16, color: c.error, textAlign: 'center' },
        scroll:      { padding: 16, gap: 16 },
        heroBanner:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
        stagePill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
        },
        stagePillText:  { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
        soldOutBadge: {
            backgroundColor: '#fecaca',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
        },
        soldOutText: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
        statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        section:     { gap: 10 },
        sectionLabel: {
            fontSize: 11,
            fontWeight: '800',
            color: c.textMuted,
            letterSpacing: 1,
        },
        descText:    { fontSize: 14, color: c.textSecondary, lineHeight: 21 },
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
        hatcheryName:   { fontSize: 15, fontWeight: '700', color: c.textPrimary },
        hatcheryLoc:    { fontSize: 13, color: c.textSecondary },
        operatorLine:   { fontSize: 12, color: c.textMuted },
        callBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        disclaimerCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: c.primaryLight ?? '#e0fdf4',
            borderRadius: 14,
            padding: 14,
        },
        disclaimerText: { flex: 1, fontSize: 13, color: c.textSecondary, lineHeight: 20 },
        inputGroup:     { gap: 6 },
        inputLabel:     { fontSize: 13, fontWeight: '700', color: c.textSecondary },
        inputHint:      { fontSize: 12, fontWeight: '400', color: c.textMuted },
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
        inputMultiline: {
            height: undefined,
            minHeight: 64,
            paddingVertical: 12,
        },
        totalRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: c.primaryLight ?? '#e0fdf4',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
        },
        totalLabel:  { fontSize: 13, fontWeight: '700', color: c.textSecondary },
        totalAmount: { fontSize: 20, fontWeight: '800', color: c.primary },
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
    });
};
