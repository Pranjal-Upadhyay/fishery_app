/**
 * CreateListingScreen
 * Hatchery operator creates a new fingerling/fry listing for the marketplace.
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';

type Stage = 'fry' | 'fingerling';

export default function CreateListingScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();

    const [stage, setStage] = useState<Stage>('fingerling');
    const [speciesName, setSpeciesName] = useState('');
    const [speciesVariant, setSpeciesVariant] = useState('');
    const [totalQuantity, setTotalQuantity] = useState('');
    const [minOrderQty, setMinOrderQty] = useState('100');
    const [pricePerPiece, setPricePerPiece] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const validate = (): boolean => {
        if (!speciesName.trim()) {
            Alert.alert('Missing Info', 'Please enter the species name.'); return false;
        }
        const qty = parseInt(totalQuantity, 10);
        if (!qty || qty <= 0) {
            Alert.alert('Invalid Quantity', 'Total quantity must be a positive number.'); return false;
        }
        const minQty = parseInt(minOrderQty, 10);
        if (!minQty || minQty <= 0) {
            Alert.alert('Invalid Min Order', 'Minimum order quantity must be a positive number.'); return false;
        }
        if (minQty > qty) {
            Alert.alert('Invalid Min Order', 'Minimum order quantity cannot exceed total quantity.'); return false;
        }
        const price = parseFloat(pricePerPiece);
        if (isNaN(price) || price < 0) {
            Alert.alert('Invalid Price', 'Price per piece must be a valid non-negative number.'); return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            await api.post('/api/v1/marketplace/listings', {
                stage,
                species_name:    speciesName.trim(),
                species_variant: speciesVariant.trim() || null,
                total_quantity:  parseInt(totalQuantity, 10),
                min_order_qty:   parseInt(minOrderQty, 10),
                price_per_piece: parseFloat(pricePerPiece),
                description:     description.trim() || null,
            });
            Alert.alert(
                'Listing Created',
                'Your listing is now live on the marketplace.',
                [{ text: 'OK', onPress: () => navigation.goBack() }],
            );
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error ?? 'Could not create listing.');
        } finally {
            setSubmitting(false);
        }
    };

    const qty   = parseInt(totalQuantity, 10) || 0;
    const price = parseFloat(pricePerPiece) || 0;
    const showPreview = qty > 0 && price >= 0 && pricePerPiece !== '';

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
                    {/* ── Stage Picker ── */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Stage *</Text>
                        <View style={styles.toggleRow}>
                            {(['fingerling', 'fry'] as Stage[]).map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.toggleBtn, stage === s && styles.toggleBtnActive]}
                                    onPress={() => setStage(s)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name="fish-outline"
                                        size={16}
                                        color={stage === s ? theme.colors.textInverse : theme.colors.textSecondary}
                                    />
                                    <Text style={[styles.toggleBtnText, stage === s && styles.toggleBtnTextActive]}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* ── Species ── */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Species Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Rohu, Catla, Pangasius"
                            placeholderTextColor={theme.colors.textMuted}
                            value={speciesName}
                            onChangeText={setSpeciesName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Variant / Strain (optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. IMC, GIFT, Local"
                            placeholderTextColor={theme.colors.textMuted}
                            value={speciesVariant}
                            onChangeText={setSpeciesVariant}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* ── Quantity row ── */}
                    <View style={styles.rowSection}>
                        <View style={[styles.section, { flex: 1 }]}>
                            <Text style={styles.label}>Total Quantity *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 10000"
                                placeholderTextColor={theme.colors.textMuted}
                                value={totalQuantity}
                                onChangeText={setTotalQuantity}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.section, { flex: 1 }]}>
                            <Text style={styles.label}>Min Order Qty *</Text>
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

                    {/* ── Price ── */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Price per Piece (₹) *</Text>
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
                    </View>

                    {/* ── Description ── */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Description (optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe your batch — age, size, health, origin..."
                            placeholderTextColor={theme.colors.textMuted}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* ── Preview ── */}
                    {showPreview && (
                        <View style={styles.previewCard}>
                            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                            <View style={{ flex: 1, gap: 3 }}>
                                <Text style={styles.previewTitle}>Listing Preview</Text>
                                <Text style={styles.previewText}>
                                    {qty.toLocaleString('en-IN')} {stage}s at ₹{price.toFixed(2)}/piece
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
                        onPress={handleSubmit}
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
        </SafeAreaView>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    const r = theme.borderRadius ?? {};
    return StyleSheet.create({
        safeArea:  { flex: 1, backgroundColor: c.background },
        scroll:    { padding: 16, paddingBottom: 52, gap: 0 },
        section:   { gap: 6, marginBottom: 16 },
        rowSection:{ flexDirection: 'row', gap: 12 },
        label:     { fontSize: 13, fontWeight: '700', color: c.textSecondary },
        input: {
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: r.md ?? 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: c.textPrimary,
        },
        textArea: { minHeight: 100, paddingTop: 12 },
        priceWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surface,
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
        toggleBtnActive:     { backgroundColor: c.primary, borderColor: c.primary },
        toggleBtnText:       { fontSize: 14, fontWeight: '700', color: c.textSecondary },
        toggleBtnTextActive: { color: c.textInverse },
        previewCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: (c.primary ?? '#0ea5e9') + '14',
            borderRadius: r.md ?? 12,
            borderWidth: 1,
            borderColor: (c.primary ?? '#0ea5e9') + '44',
            padding: 14,
            marginBottom: 16,
        },
        previewTitle: { fontSize: 13, fontWeight: '800', color: c.textPrimary },
        previewText:  { fontSize: 13, color: c.textSecondary },
        submitBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            backgroundColor: c.primary,
            borderRadius: r.lg ?? 16,
            paddingVertical: 16,
            marginTop: 4,
        },
        submitBtnText: { fontSize: 16, fontWeight: '800', color: c.textInverse },
    });
};
