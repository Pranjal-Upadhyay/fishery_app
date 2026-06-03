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
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { hatcheryProfileService, marketplaceService, HatcheryProfile, Stage } from '../services/apiService';

const SPECIES_LIST = [
    'Rohu', 'Catla', 'Mrigal', 'Pangasius',
    'Grass Carp', 'Common Carp', 'Silver Carp', 'Other',
];

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

    // Profile (gating)
    const [profile, setProfile] = useState<HatcheryProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // Core
    const [stage, setStage] = useState<Stage>('fingerling');
    const [speciesPick, setSpeciesPick] = useState('Rohu');
    const [speciesCustom, setSpeciesCustom] = useState('');
    const [speciesPickerOpen, setSpeciesPickerOpen] = useState(false);
    const [speciesVariant, setSpeciesVariant] = useState('');
    const [sizeDescription, setSizeDescription] = useState('');
    const [description, setDescription] = useState('');

    // Quantity & pricing
    const [totalQuantity, setTotalQuantity] = useState('');
    const [minOrderQty, setMinOrderQty] = useState('100');
    const [pricePerPiece, setPricePerPiece] = useState('');
    const [bulkPrice, setBulkPrice] = useState('');
    const [bulkThreshold, setBulkThreshold] = useState('');

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
            } catch {
                // ignore
            } finally {
                setLoadingProfile(false);
            }
        })();
    }, []);

    const resolvedSpeciesName = speciesPick === 'Other' ? speciesCustom.trim() : speciesPick;

    const validate = (): string | null => {
        if (!profile) return 'Please complete your hatchery profile first.';
        if (!profile.hatchery_uid) return 'Your government registration UID is missing. Update your hatchery profile first.';
        if (!profile.contact_number && !contactOverride) return 'A contact phone number is required on your profile or this listing.';

        if (!resolvedSpeciesName) return 'Please select or enter a species name.';

        const qty = parseInt(totalQuantity, 10);
        if (!qty || qty <= 0) return 'Total quantity must be a positive number.';

        const minQty = parseInt(minOrderQty, 10);
        if (!minQty || minQty <= 0) return 'Minimum order quantity must be a positive number.';
        if (minQty > qty) return 'Minimum order quantity cannot exceed total quantity.';

        const price = parseFloat(pricePerPiece);
        if (isNaN(price) || price <= 0) return 'Price per piece must be greater than zero.';

        if (bulkPrice) {
            const bp = parseFloat(bulkPrice);
            const bt = parseInt(bulkThreshold, 10);
            if (isNaN(bp) || bp <= 0) return 'Bulk price must be a positive number.';
            if (bp >= price) return 'Bulk price must be lower than the standard price.';
            if (!bt || bt <= minQty) return 'Bulk threshold must be greater than minimum order quantity.';
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
            const created = await marketplaceService.createListing({
                stage,
                species_name: resolvedSpeciesName,
                species_variant: speciesVariant.trim() || null,
                description: description.trim() || null,
                size_description: sizeDescription.trim() || null,
                total_quantity: parseInt(totalQuantity, 10),
                min_order_qty: parseInt(minOrderQty, 10),
                price_per_piece: parseFloat(pricePerPiece),
                bulk_price_per_piece: bulkPrice ? parseFloat(bulkPrice) : null,
                bulk_price_threshold: bulkPrice && bulkThreshold ? parseInt(bulkThreshold, 10) : null,
                expected_ready_date: expectedReadyDate,
                last_available_date: lastAvailableDate,
                pickup_available: pickupAvailable,
                delivery_available: deliveryAvailable,
                logistics_notes: logisticsNotes.trim() || null,
                contact_number_override: overrideContact && contactOverride ? contactOverride.trim() : null,
                email_override: overrideContact && emailOverride ? emailOverride.trim() : null,
                upi_id_override: overrideContact && upiOverride ? upiOverride.trim() : null,
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

    // Computed preview
    const qty = parseInt(totalQuantity, 10) || 0;
    const price = parseFloat(pricePerPiece) || 0;
    const showPreview = qty > 0 && price > 0;

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
                        <TouchableOpacity style={styles.pickerRow} onPress={() => setSpeciesPickerOpen(true)} activeOpacity={0.8}>
                            <Text style={styles.pickerRowText}>{speciesPick}</Text>
                            <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                        {speciesPick === 'Other' && (
                            <TextInput
                                style={styles.input}
                                placeholder="Enter species name"
                                placeholderTextColor={theme.colors.textMuted}
                                value={speciesCustom}
                                onChangeText={setSpeciesCustom}
                                autoCapitalize="words"
                            />
                        )}
                        <View style={{ height: 10 }} />
                        <Label>Variant / Strain (optional)</Label>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. IMC, GIFT, Local"
                            placeholderTextColor={theme.colors.textMuted}
                            value={speciesVariant}
                            onChangeText={setSpeciesVariant}
                            autoCapitalize="words"
                        />
                        <View style={{ height: 10 }} />
                        <Label>Size / Age (optional)</Label>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 6–8 cm, 45 days old"
                            placeholderTextColor={theme.colors.textMuted}
                            value={sizeDescription}
                            onChangeText={setSizeDescription}
                        />
                    </Section>

                    {/* ── Quantity ── */}
                    <Section title="Quantity">
                        <View style={styles.rowSection}>
                            <View style={{ flex: 1 }}>
                                <Label>Batch Size (pieces) *</Label>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 10000"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={totalQuantity}
                                    onChangeText={setTotalQuantity}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Label>Min Order Qty *</Label>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 100"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={minOrderQty}
                                    onChangeText={setMinOrderQty}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </Section>

                    {/* ── Pricing ── */}
                    <Section title="Pricing">
                        <Label>Price per Piece (₹) *</Label>
                        <View style={styles.priceWrap}>
                            <Text style={styles.rupeeSign}>₹</Text>
                            <TextInput
                                style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                                placeholder="0.00"
                                placeholderTextColor={theme.colors.textMuted}
                                value={pricePerPiece}
                                onChangeText={setPricePerPiece}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={{ height: 10 }} />
                        <Label>Bulk Discount (optional)</Label>
                        <View style={styles.rowSection}>
                            <View style={{ flex: 1 }}>
                                <View style={styles.priceWrap}>
                                    <Text style={styles.rupeeSign}>₹</Text>
                                    <TextInput
                                        style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                                        placeholder="Bulk price"
                                        placeholderTextColor={theme.colors.textMuted}
                                        value={bulkPrice}
                                        onChangeText={setBulkPrice}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="From qty"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={bulkThreshold}
                                    onChangeText={setBulkThreshold}
                                    keyboardType="numeric"
                                />
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
                                    {qty.toLocaleString('en-IN')} pcs × ₹{price.toFixed(2)}
                                </Text>
                                <Text style={[styles.previewText, { color: theme.colors.primary, fontWeight: '800' }]}>
                                    Potential revenue: ₹{(qty * price).toLocaleString('en-IN')}
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

            {/* Species picker modal */}
            <Modal visible={speciesPickerOpen} animationType="slide" transparent>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSpeciesPickerOpen(false)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Select Species</Text>
                        <FlatList
                            data={SPECIES_LIST}
                            keyExtractor={(s) => s}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => { setSpeciesPick(item); setSpeciesPickerOpen(false); }}
                                >
                                    <Text style={styles.modalItemText}>{item}</Text>
                                    {speciesPick === item && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
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
