/**
 * CreateListingScreen
 * Full v2 implementation per spec — hatchery operator drafts a fingerling/fry
 * listing with all required marketplace fields, then publishes it.
 *
 * Flow: load profile -> validate gov UID present -> fill listing fields ->
 *   create DRAFT -> publish (DRAFT → UPCOMING or AVAILABLE based on ready date).
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api, { hatcheryProfileService, marketplaceService, HatcheryProfile, Stage } from '../services/apiService';

const ALLOWED_MARKET_SPECIES = [
    { label: 'Jayanti Rohu', name: 'Rohu', variant: 'Jayanti Rohu' },
    { label: 'Amrit Catla', name: 'Catla', variant: 'Amrit Catla' },
    { label: 'Amur Carp', name: 'Common Carp', variant: 'Amur Carp' },
    { label: 'Pangasius', name: 'Pangasius', variant: '' },
];

const SPECIES_LIST = ALLOWED_MARKET_SPECIES.map(s => s.label);

function todayISO(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

export default function CreateListingScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { batchId } = route.params ?? {};

    // Profile (gating)
    const [profile, setProfile] = useState<HatcheryProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // Core
    const [stage, setStage] = useState<Stage>('fingerling');
    const [speciesPick, setSpeciesPick] = useState('Jayanti Rohu');
    const [speciesCustom, setSpeciesCustom] = useState('');
    const [speciesPickerOpen, setSpeciesPickerOpen] = useState(false);
    const [speciesVariant, setSpeciesVariant] = useState('Jayanti Rohu');
    const [sizeDescription, setSizeDescription] = useState('');
    const [description, setDescription] = useState('');

    // Quantity & pricing
    //
    // The backend stores prices and thresholds in PER-PIECE terms (price_per_piece,
    // bulk_price_per_piece, bulk_price_threshold). To keep the operator's mental
    // model simple, the form lets them think in whichever unit matches how they
    // actually sell — per piece OR per batch. We convert at submit time.
    //
    //  - totalQuantity   → total stock the hatchery has available
    //  - batchSize       → how many fishes per batch (also serves as min_order_qty)
    //  - pricingMode     → whether `priceInput` is per piece or per batch
    //  - priceInput      → the headline price the user types
    //  - bulkPriceInput  → discounted price when buyer takes multiple batches
    //  - bulkBatches     → from how many batches the bulk price kicks in (≥ 2)
    type PricingMode = 'per_piece' | 'per_batch';
    const [totalQuantity, setTotalQuantity] = useState('');
    const [batchSize, setBatchSize] = useState('');
    const [pricingMode, setPricingMode] = useState<PricingMode>('per_piece');
    const [priceInput, setPriceInput] = useState('');
    const [bulkPriceInput, setBulkPriceInput] = useState('');
    const [bulkBatches, setBulkBatches] = useState('2');
    const [pricingModePickerOpen, setPricingModePickerOpen] = useState(false);

    // Timing
    const [expectedReadyDate, setExpectedReadyDate] = useState(todayISO(7));
    const [lastAvailableDate, setLastAvailableDate] = useState(todayISO(45));

    // Logistics
    const [pickupAvailable, setPickupAvailable] = useState(true);
    const [deliveryAvailable, setDeliveryAvailable] = useState(false);
    const [logisticsNotes, setLogisticsNotes] = useState('');

    // Per-listing contact overrides
    const [overrideContact, setOverrideContact] = useState(false);
    const [contactOverride, setContactOverride] = useState('');
    const [emailOverride, setEmailOverride] = useState('');
    const [upiOverride, setUpiOverride] = useState('');

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const p = await hatcheryProfileService.getMe();
                setProfile(p);

                if (batchId) {
                    const res = await api.get(`/api/v1/hatcheries/batches/${batchId}`);
                    const b = res.data?.data?.batch;
                    if (b) {
                        setStage(b.current_stage === 'fingerling_ready' ? 'fingerling' : 'fry');
                        
                        // Match with ALLOWED_MARKET_SPECIES
                        const matched = ALLOWED_MARKET_SPECIES.find(
                            s => s.name.toLowerCase() === b.species_name.toLowerCase() &&
                                 (s.variant || '').toLowerCase() === (b.species_variant || '').toLowerCase()
                        );
                        if (matched) {
                            setSpeciesPick(matched.label);
                            setSpeciesVariant(matched.variant);
                        } else {
                            const fallback = ALLOWED_MARKET_SPECIES.find(
                                s => s.name.toLowerCase() === b.species_name.toLowerCase()
                            );
                            if (fallback) {
                                setSpeciesPick(fallback.label);
                                setSpeciesVariant(fallback.variant);
                            } else {
                                setSpeciesPick(b.species_name);
                                setSpeciesVariant(b.species_variant ?? '');
                            }
                        }

                        if (b.estimated_fingerling_count) {
                            setTotalQuantity(String(b.estimated_fingerling_count));
                        } else if (b.estimated_fry_count) {
                            setTotalQuantity(String(b.estimated_fry_count));
                        }

                        if (b.avg_fingerling_weight_g) {
                            setSizeDescription(`Avg Weight: ${b.avg_fingerling_weight_g}g`);
                        }

                        if (b.notes) {
                            setDescription(b.notes);
                        }
                    }
                }
            } catch (e) {
                console.warn('Error pre-populating listing from batch:', e);
            } finally {
                setLoadingProfile(false);
            }
        })();
    }, [batchId]);

    const matchedSpec = ALLOWED_MARKET_SPECIES.find(s => s.label === speciesPick);
    const resolvedSpeciesName = matchedSpec ? matchedSpec.name : speciesPick;
    const resolvedSpeciesVariant = matchedSpec ? matchedSpec.variant : speciesVariant;

    /**
     * Resolve the per-piece price from the user-facing pricing mode.
     * - Per piece mode: the input is already per piece.
     * - Per batch mode: divide the batch price by batchSize to get per piece.
     * Returns NaN when inputs are incomplete or invalid.
     */
    const computePerPiece = (rawPrice: string, batchSizeNum: number): number => {
        const v = parseFloat(rawPrice);
        if (isNaN(v) || v <= 0) return NaN;
        if (pricingMode === 'per_batch') {
            if (!batchSizeNum || batchSizeNum <= 0) return NaN;
            return v / batchSizeNum;
        }
        return v;
    };

    const validate = (): string | null => {
        if (!profile) return 'Please complete your hatchery profile first.';
        if (!profile.hatchery_uid) return 'Your government registration UID is missing. Update your hatchery profile first.';
        if (!profile.contact_number && !contactOverride) return 'A contact phone number is required on your profile or this listing.';

        if (!resolvedSpeciesName) return 'Please select or enter a species name.';

        const qty = parseInt(totalQuantity, 10);
        if (!qty || qty <= 0) return 'Total stock must be a positive number.';

        const bSize = parseInt(batchSize, 10);
        if (!bSize || bSize <= 0) return 'Batch size must be a positive number.';
        if (bSize > qty) return 'Batch size cannot exceed total stock.';

        const perPiece = computePerPiece(priceInput, bSize);
        if (isNaN(perPiece) || perPiece <= 0) {
            return pricingMode === 'per_batch'
                ? 'Please enter a valid price per batch.'
                : 'Please enter a valid price per piece.';
        }

        if (bulkPriceInput) {
            const bulkPerPiece = computePerPiece(bulkPriceInput, bSize);
            if (isNaN(bulkPerPiece) || bulkPerPiece <= 0) {
                return pricingMode === 'per_batch'
                    ? 'Bulk price per batch must be a positive number.'
                    : 'Bulk price per piece must be a positive number.';
            }
            if (bulkPerPiece >= perPiece) return 'Bulk price must be lower than the standard price.';
            const bBatches = parseInt(bulkBatches, 10);
            if (!bBatches || bBatches < 2) return 'Bulk discount must kick in at 2 or more batches.';
        }

        if (expectedReadyDate >= lastAvailableDate) return 'Last available date must be after the ready date.';
        if (lastAvailableDate <= todayISO(0)) return 'Last available date must be in the future.';

        if (!pickupAvailable && !deliveryAvailable) return 'Please offer at least one of pickup or delivery.';

        if (overrideContact && contactOverride && !/^[6-9]\d{9}$/.test(contactOverride.trim())) {
            return 'Override contact must be a valid 10-digit Indian mobile.';
        }
        if (overrideContact && emailOverride && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOverride.trim())) {
            return 'Override email is not a valid address.';
        }

        return null;
    };

    const handlePublish = async () => {
        const err = validate();
        if (err) { Alert.alert('Check Details', err); return; }

        setSubmitting(true);
        try {
            // Convert the UI-level pricing mode into the per-piece values the
            // backend expects. The batch size doubles as `min_order_qty` so
            // buyers can't order partial batches.
            const bSize = parseInt(batchSize, 10);
            const perPiece = computePerPiece(priceInput, bSize);
            const bulkPerPiece = bulkPriceInput ? computePerPiece(bulkPriceInput, bSize) : null;
            const bulkThresholdQty =
                bulkPriceInput && bulkBatches ? bSize * parseInt(bulkBatches, 10) : null;

            const created = await marketplaceService.createListing({
                stage,
                species_name: resolvedSpeciesName,
                species_variant: resolvedSpeciesVariant ? resolvedSpeciesVariant.trim() : null,
                description: description.trim() || null,
                size_description: sizeDescription.trim() || null,
                total_quantity: parseInt(totalQuantity, 10),
                min_order_qty: bSize,
                price_per_piece: perPiece,
                bulk_price_per_piece: bulkPerPiece,
                bulk_price_threshold: bulkThresholdQty,
                expected_ready_date: expectedReadyDate,
                last_available_date: lastAvailableDate,
                pickup_available: pickupAvailable,
                delivery_available: deliveryAvailable,
                logistics_notes: logisticsNotes.trim() || null,
                contact_number_override: overrideContact && contactOverride ? contactOverride.trim() : null,
                email_override: overrideContact && emailOverride ? emailOverride.trim() : null,
                upi_id_override: overrideContact && upiOverride ? upiOverride.trim() : null,
                batch_id: batchId ?? null,
            });

            // Auto-publish: backend will pick UPCOMING or AVAILABLE based on ready date
            await marketplaceService.publishListing(created.id);

            Alert.alert(
                'Listing Published',
                expectedReadyDate <= todayISO(0)
                    ? 'Your listing is now LIVE on the marketplace.'
                    : 'Your listing is published as UPCOMING. Mark it available once stock is ready.',
                [{ text: 'OK', onPress: () => navigation.goBack() }],
            );
        } catch (e: any) {
            Alert.alert('Could Not Publish', e?.response?.data?.error ?? 'Failed to publish listing.');
        } finally {
            setSubmitting(false);
        }
    };

    // Computed preview — convert to per-piece terms for the totals display
    const qty = parseInt(totalQuantity, 10) || 0;
    const bSizePreview = parseInt(batchSize, 10) || 0;
    const perPiecePreview = computePerPiece(priceInput, bSizePreview) || 0;
    const showPreview = qty > 0 && perPiecePreview > 0;
    const batchesAvailable = bSizePreview > 0 ? Math.floor(qty / bSizePreview) : 0;

    if (loadingProfile) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScreenHeader title="New Listing" onBack={() => navigation.goBack()} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    if (!profile || !profile.hatchery_uid || !profile.contact_number) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScreenHeader title="New Listing" onBack={() => navigation.goBack()} />
                <View style={styles.gateCard}>
                    <Ionicons name="shield-outline" size={40} color={theme.colors.primary} />
                    <Text style={styles.gateTitle}>Complete Your Hatchery Profile</Text>
                    <Text style={styles.gateText}>
                        To list on the marketplace, your hatchery profile needs a Government Registration UID and a contact phone number.
                    </Text>
                    <TouchableOpacity
                        style={styles.gateBtn}
                        onPress={() => navigation.navigate('AddHatchery')}
                    >
                        <Ionicons name="business-outline" size={18} color={theme.colors.textInverse} />
                        <Text style={styles.gateBtnText}>Update Profile</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader title="New Listing" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Stage ── */}
                    <Section title="Stock Stage">
                        <View style={styles.toggleRow}>
                            {(['fingerling', 'fry'] as Stage[]).map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.toggleBtn, stage === s && styles.toggleBtnActive]}
                                    onPress={() => setStage(s)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="fish-outline" size={16}
                                        color={stage === s ? theme.colors.textInverse : theme.colors.textSecondary} />
                                    <Text style={[styles.toggleBtnText, stage === s && styles.toggleBtnTextActive]}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Section>

                    {/* ── Species ── */}
                    <Section title="Species">
                        <Label>Species *</Label>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 }}>
                            {ALLOWED_MARKET_SPECIES.map(s => {
                                const selected = speciesPick === s.label;
                                return (
                                    <TouchableOpacity
                                        key={s.label}
                                        style={{
                                            paddingHorizontal: 14,
                                            paddingVertical: 10,
                                            borderRadius: 24,
                                            borderWidth: 1.5,
                                            borderColor: selected ? theme.colors.primary : theme.colors.border,
                                            backgroundColor: selected ? `${theme.colors.primary}12` : theme.colors.surfaceLow ?? theme.colors.surface,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                        onPress={() => {
                                            setSpeciesPick(s.label);
                                            setSpeciesVariant(s.variant);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="fish-outline" size={16} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
                                        <Text style={{
                                            fontSize: 13,
                                            fontWeight: '700',
                                            color: selected ? theme.colors.primary : theme.colors.textSecondary
                                        }}>{s.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={{ height: 12 }} />
                        <Label>Size / Age (optional)</Label>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 6–8 cm, 45 days old"
                            placeholderTextColor={theme.colors.textMuted}
                            value={sizeDescription}
                            onChangeText={setSizeDescription}
                        />
                    </Section>

                    {/* ── Stock & Batch ── */}
                    <Section title="Stock & Batch">
                        <Label>Total Stock (pieces) *</Label>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 100000"
                            placeholderTextColor={theme.colors.textMuted}
                            value={totalQuantity}
                            onChangeText={setTotalQuantity}
                            keyboardType="numeric"
                        />
                        <Text style={styles.hint}>Total number of fish you have ready to sell.</Text>
                        <View style={{ height: 10 }} />
                        <Label>Batch Size (pieces per batch) *</Label>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 10000"
                            placeholderTextColor={theme.colors.textMuted}
                            value={batchSize}
                            onChangeText={setBatchSize}
                            keyboardType="numeric"
                        />
                        <Text style={styles.hint}>
                            Smallest quantity a buyer can order. {batchesAvailable > 0
                                ? `Stock supports ${batchesAvailable} batch${batchesAvailable === 1 ? '' : 'es'}.`
                                : 'You can be paid per piece or per whole batch — pick below.'}
                        </Text>
                    </Section>

                    {/* ── Pricing ── */}
                    <Section title="Pricing">
                        <Label>How do you want to price? *</Label>
                        <TouchableOpacity
                            style={styles.dropdownInput}
                            onPress={() => setPricingModePickerOpen(true)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.dropdownInputText}>
                                {pricingMode === 'per_piece' ? 'Per piece' : 'Per batch'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                        <View style={{ height: 10 }} />

                        <Label>
                            {pricingMode === 'per_piece' ? 'Price per Piece (₹) *' : 'Price per Batch (₹) *'}
                        </Label>
                        <View style={styles.priceWrap}>
                            <Text style={styles.rupeeSign}>₹</Text>
                            <TextInput
                                style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                                placeholder={pricingMode === 'per_piece' ? '0.00' : 'e.g. 50000'}
                                placeholderTextColor={theme.colors.textMuted}
                                value={priceInput}
                                onChangeText={setPriceInput}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        {pricingMode === 'per_batch' && bSizePreview > 0 && perPiecePreview > 0 && (
                            <Text style={styles.hint}>= ₹{perPiecePreview.toFixed(2)} per piece</Text>
                        )}

                        <View style={{ height: 16 }} />

                        <Label>Bulk Discount (optional)</Label>
                        <Text style={styles.hint}>
                            Discounted {pricingMode === 'per_piece' ? 'per-piece' : 'per-batch'} price when a buyer
                            orders multiple batches at once.
                        </Text>
                        <View style={styles.rowSection}>
                            <View style={{ flex: 1.4 }}>
                                <View style={styles.priceWrap}>
                                    <Text style={styles.rupeeSign}>₹</Text>
                                    <TextInput
                                        style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                                        placeholder={pricingMode === 'per_piece' ? 'Bulk price/pc' : 'Bulk price/batch'}
                                        placeholderTextColor={theme.colors.textMuted}
                                        value={bulkPriceInput}
                                        onChangeText={setBulkPriceInput}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={styles.suffixWrap}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                                        placeholder="2"
                                        placeholderTextColor={theme.colors.textMuted}
                                        value={bulkBatches}
                                        onChangeText={setBulkBatches}
                                        keyboardType="numeric"
                                    />
                                    <Text style={styles.suffixText}>batches+</Text>
                                </View>
                            </View>
                        </View>
                    </Section>

                    {/* ── Timing ── */}
                    <Section title="Timing">
                        <Label>Expected Ready Date *</Label>
                        <DateField value={expectedReadyDate} onChange={setExpectedReadyDate} theme={theme} />
                        <View style={{ height: 10 }} />
                        <Label>Last Available Date *</Label>
                        <DateField value={lastAvailableDate} onChange={setLastAvailableDate} theme={theme} />
                        <Text style={styles.hint}>
                            {expectedReadyDate <= todayISO(0) ? '→ Will publish as AVAILABLE' : '→ Will publish as UPCOMING'}
                        </Text>
                    </Section>

                    {/* ── Logistics ── */}
                    <Section title="Logistics">
                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.switchLabel}>Pickup Available</Text>
                                <Text style={styles.switchHint}>Farmers can come to your hatchery</Text>
                            </View>
                            <Switch
                                value={pickupAvailable}
                                onValueChange={setPickupAvailable}
                                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                            />
                        </View>
                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.switchLabel}>Delivery Available</Text>
                                <Text style={styles.switchHint}>You can arrange delivery</Text>
                            </View>
                            <Switch
                                value={deliveryAvailable}
                                onValueChange={setDeliveryAvailable}
                                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                            />
                        </View>
                        {deliveryAvailable && (
                            <>
                                <Label>Delivery Notes (range, fee, conditions)</Label>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="e.g. Within 50 km, ₹500 delivery fee"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={logisticsNotes}
                                    onChangeText={setLogisticsNotes}
                                    multiline
                                />
                            </>
                        )}
                    </Section>

                    {/* ── Description ── */}
                    <Section title="Description">
                        <Label>Notes for buyers (optional)</Label>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Feeding, health, water source, special handling..."
                            placeholderTextColor={theme.colors.textMuted}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            textAlignVertical="top"
                        />
                    </Section>

                    {/* ── Contact override ── */}
                    <Section title="Contact for this Listing">
                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.switchLabel}>Override profile contact</Text>
                                <Text style={styles.switchHint}>Use different phone/UPI for this listing only</Text>
                            </View>
                            <Switch
                                value={overrideContact}
                                onValueChange={setOverrideContact}
                                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                            />
                        </View>
                        {overrideContact && (
                            <>
                                <Label>Phone Number</Label>
                                <TextInput
                                    style={styles.input}
                                    placeholder="10-digit mobile"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={contactOverride}
                                    onChangeText={setContactOverride}
                                    keyboardType="phone-pad"
                                />
                                <View style={{ height: 10 }} />
                                <Label>Email (optional)</Label>
                                <TextInput
                                    style={styles.input}
                                    placeholder="contact@hatchery.com"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={emailOverride}
                                    onChangeText={setEmailOverride}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                <View style={{ height: 10 }} />
                                <Label>UPI ID (optional)</Label>
                                <TextInput
                                    style={styles.input}
                                    placeholder="hatchery@upi"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={upiOverride}
                                    onChangeText={setUpiOverride}
                                    autoCapitalize="none"
                                />
                            </>
                        )}
                        {!overrideContact && (
                            <Text style={styles.hint}>
                                Using profile: {profile.contact_number}{profile.upi_id ? ` · ${profile.upi_id}` : ''}
                            </Text>
                        )}
                    </Section>

                    {/* ── Preview ── */}
                    {showPreview && (
                        <View style={styles.previewCard}>
                            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                            <View style={{ flex: 1, gap: 3 }}>
                                <Text style={styles.previewTitle}>Revenue Preview</Text>
                                <Text style={styles.previewText}>
                                    {qty.toLocaleString('en-IN')} pcs × ₹{perPiecePreview.toFixed(2)}
                                </Text>
                                {batchesAvailable > 0 && (
                                    <Text style={styles.previewText}>
                                        ≈ {batchesAvailable} batch{batchesAvailable === 1 ? '' : 'es'} of {bSizePreview.toLocaleString('en-IN')} pcs
                                    </Text>
                                )}
                                <Text style={[styles.previewText, { color: theme.colors.primary, fontWeight: '800' }]}>
                                    Potential revenue: ₹{(qty * perPiecePreview).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* ── Submit ── */}
                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                        onPress={handlePublish}
                        activeOpacity={0.85}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={theme.colors.textInverse} />
                        ) : (
                            <>
                                <Ionicons name="storefront-outline" size={20} color={theme.colors.textInverse} />
                                <Text style={styles.submitBtnText}>Publish Listing</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Pricing-mode picker ───────────────────────────────────── */}
            <Modal
                visible={pricingModePickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setPricingModePickerOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPricingModePickerOpen(false)}
                >
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Choose pricing mode</Text>
                        <View style={styles.modalOptionList}>
                            {(['per_piece', 'per_batch'] as const).map((m) => (
                            <TouchableOpacity
                                key={m}
                                style={[
                                    styles.modalOption,
                                    pricingMode === m && styles.modalOptionActive,
                                ]}
                                onPress={() => {
                                    setPricingMode(m);
                                    setPricingModePickerOpen(false);
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalOptionTitle}>
                                        {m === 'per_piece' ? 'Per piece' : 'Per batch'}
                                    </Text>
                                    <Text style={styles.modalOptionSub}>
                                        {m === 'per_piece'
                                            ? 'Quote a price for one fish — buyers see ₹/pc on the listing.'
                                            : 'Quote a price for a full batch — buyers see one round number per batch.'}
                                    </Text>
                                </View>
                                {pricingMode === m && (
                                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    const { theme } = useTheme();
    const c = theme.colors;
    return (
        <View style={{
            backgroundColor: c.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.border,
            padding: 14,
            marginBottom: 14,
        }}>
            <Text style={{
                fontSize: 12,
                fontWeight: '800',
                color: c.textMuted,
                letterSpacing: 1,
                marginBottom: 10,
                textTransform: 'uppercase',
            }}>{title}</Text>
            {children}
        </View>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();
    return <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 6 }}>{children}</Text>;
}

function DateField({ value, onChange, theme }: { value: string; onChange: (v: string) => void; theme: any }) {
    // Lightweight date input — uses ISO YYYY-MM-DD text input with format hint.
    // (No native date picker dependency added; user types or pastes.)
    const c = theme.colors;
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1, borderColor: c.border, borderRadius: 12,
            paddingHorizontal: 14, height: 48, gap: 10,
        }}>
            <Ionicons name="calendar-outline" size={18} color={c.textMuted} />
            <TextInput
                style={{ flex: 1, color: c.textPrimary, fontSize: 15 }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.textMuted}
                value={value}
                onChangeText={(t) => {
                    // Allow only digits and dashes, max 10 chars
                    const cleaned = t.replace(/[^0-9-]/g, '').slice(0, 10);
                    onChange(cleaned);
                }}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
            />
            <Text style={{ fontSize: 12, color: c.textMuted }}>{value && formatDate(value)}</Text>
        </View>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    const r = theme.borderRadius ?? {};
    return StyleSheet.create({
        safeArea: { flex: 1, backgroundColor: c.background },
        scroll: { padding: 16, paddingBottom: 52 },
        rowSection: { flexDirection: 'row', gap: 12 },
        input: {
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: r.md ?? 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: c.textPrimary,
        },
        textArea: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
        pickerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: r.md ?? 12,
            paddingHorizontal: 14,
            height: 48,
            marginBottom: 10,
        },
        pickerRowText: { fontSize: 15, color: c.textPrimary, fontWeight: '600' },
        priceWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: r.md ?? 12,
            paddingHorizontal: 14,
        },
        rupeeSign: { fontSize: 17, fontWeight: '800', color: c.textPrimary, marginRight: 6 },
        toggleRow: { flexDirection: 'row', gap: 10 },
        toggleBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: r.md ?? 12,
            borderWidth: 1.5,
            borderColor: c.border,
            backgroundColor: c.surface,
        },
        toggleBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
        toggleBtnText: { fontSize: 14, fontWeight: '700', color: c.textSecondary },
        toggleBtnTextActive: { color: c.textInverse },
        switchRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            gap: 12,
        },
        switchLabel: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
        switchHint: { fontSize: 12, color: c.textMuted, marginTop: 2 },
        hint: { fontSize: 12, color: c.textMuted, marginTop: 6, fontStyle: 'italic' },

        // Pricing-mode dropdown trigger — visually consistent with text inputs
        dropdownInput: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: r.md ?? 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginTop: 6,
        },
        dropdownInputText: { fontSize: 14, color: c.textPrimary, fontWeight: '700' },

        // "X batches+" suffix input on bulk threshold
        suffixWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: r.md ?? 12,
            paddingHorizontal: 12,
            paddingVertical: 4,
        },
        suffixText: {
            fontSize: 12,
            fontWeight: '700',
            color: c.textMuted,
            marginLeft: 6,
        },

        // Pricing-mode picker options (modalOverlay / modalSheet / modalTitle
        // are already defined further down — reused from the species picker.)
        modalOptionList: {
            paddingHorizontal: 20,
            paddingTop: 12,
            gap: 12,
        },
        modalOption: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: c.background,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: r.md ?? 12,
            padding: 14,
        },
        modalOptionActive: {
            borderColor: c.primary,
            backgroundColor: (c.primary ?? '#0ea5e9') + '14',
        },
        modalOptionTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
        modalOptionSub: { fontSize: 12, color: c.textMuted, marginTop: 4, lineHeight: 17 },
        previewCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: (c.primary ?? '#0ea5e9') + '14',
            borderRadius: r.md ?? 12,
            borderWidth: 1,
            borderColor: (c.primary ?? '#0ea5e9') + '44',
            padding: 14,
            marginBottom: 14,
        },
        previewTitle: { fontSize: 13, fontWeight: '800', color: c.textPrimary },
        previewText: { fontSize: 13, color: c.textSecondary },
        submitBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            backgroundColor: c.primary,
            borderRadius: r.lg ?? 16,
            paddingVertical: 16,
        },
        submitBtnText: { fontSize: 16, fontWeight: '800', color: c.textInverse },
        gateCard: {
            margin: 24, padding: 32,
            backgroundColor: c.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: c.border,
            gap: 14,
            alignItems: 'center',
        },
        gateTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary, textAlign: 'center' },
        gateText: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
        gateBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: c.primary,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 14,
        },
        gateBtnText: { color: c.textInverse, fontSize: 15, fontWeight: '800' },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'flex-end',
        },
        modalSheet: {
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 8,
            paddingBottom: 28,
            maxHeight: '60%',
        },
        modalTitle: {
            fontSize: 16,
            fontWeight: '800',
            color: c.textPrimary,
            textAlign: 'center',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
        },
        modalItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
        },
        modalItemText: { fontSize: 15, color: c.textPrimary, fontWeight: '600' },
    });
};
