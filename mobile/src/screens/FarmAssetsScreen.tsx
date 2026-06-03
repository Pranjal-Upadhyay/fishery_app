/**
 * FarmAssetsScreen
 * Farmer manages farm equipment / capital assets (Aerator, Motor Pump, etc.).
 * Annual depreciation is auto-computed:  (cost - salvage) / economic_life
 *
 * Captures gov-survey Section E. Each asset can optionally be linked to a
 * specific pond.
 *
 * Route params (optional): { pondId, pondName }
 *   - If pondId is provided, filters to that pond and pre-fills new assets
 *     with that pond link.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
    ActivityIndicator, FlatList, TextInput, Modal,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import CalendarPickerModal, { formatDateLabel } from '../components/CalendarPickerModal';
import { farmAssetService, FarmAsset, FarmAssetInput, AssetType } from '../services/apiService';

type RouteParams = { FarmAssets: { pondId?: string; pondName?: string } };

const ASSET_TYPES: { value: AssetType; label: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }[] = [
    { value: 'AERATOR',          label: 'Aerator',          icon: 'pulse-outline' },
    { value: 'MOTOR_PUMP',       label: 'Motor Pump',       icon: 'water-outline' },
    { value: 'BOAT',             label: 'Boat',             icon: 'boat-outline' },
    { value: 'FISH_NET',         label: 'Fish-net',         icon: 'grid-outline' },
    { value: 'BORE_WELL',        label: 'Bore-well',        icon: 'arrow-down-outline' },
    { value: 'BIOFLOC_TANK',     label: 'Biofloc Tank',     icon: 'beaker-outline' },
    { value: 'RAS',              label: 'RAS',              icon: 'sync-outline' },
    { value: 'BIOFLOC_POND',     label: 'Biofloc Pond',     icon: 'ellipse-outline' },
    { value: 'CIVIL_WORK_POND',  label: 'Civil Work - Pond', icon: 'construct-outline' },
    { value: 'EMBANKMENT',       label: 'Embankment',       icon: 'layers-outline' },
    { value: 'OTHER',            label: 'Other',            icon: 'cube-outline' },
];

const ASSET_TYPE_MAP: Record<AssetType, { label: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> =
    ASSET_TYPES.reduce((acc, t) => ({ ...acc, [t.value]: { label: t.label, icon: t.icon } }), {} as any);

interface FormState {
    asset_type: AssetType;
    asset_name: string;
    purchase_date: string;
    cost_inr: string;
    economic_life_years: string;
    salvage_value_inr: string;
    remarks: string;
}

const EMPTY_FORM: FormState = {
    asset_type: 'AERATOR',
    asset_name: '',
    purchase_date: '',
    cost_inr: '',
    economic_life_years: '',
    salvage_value_inr: '0',
    remarks: '',
};

function num(value: string | null | undefined): number {
    return value ? parseFloat(value) : 0;
}

export default function FarmAssetsScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'FarmAssets'>>();
    const filterPondId = route.params?.pondId;
    const filterPondName = route.params?.pondName;

    const [assets, setAssets] = useState<FarmAsset[]>([]);
    const [loading, setLoading] = useState(true);

    const [formOpen, setFormOpen] = useState(false);
    const [typePickerOpen, setTypePickerOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await farmAssetService.list(filterPondId ? { pondId: filterPondId } : {});
            setAssets(data);
        } catch {
            Alert.alert('Error', 'Could not load assets.');
        } finally {
            setLoading(false);
        }
    }, [filterPondId]);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const summary = useMemo(() => ({
        count:        assets.length,
        totalCost:    assets.reduce((s, a) => s + num(a.cost_inr), 0),
        annualDeprec: assets.reduce((s, a) => s + num(a.annual_depreciation_inr), 0),
    }), [assets]);

    const openNew = () => {
        setEditingId(null);
        setForm({
            ...EMPTY_FORM,
            purchase_date: new Date().toISOString().slice(0, 10),
        });
        setFormOpen(true);
    };

    const openEdit = (a: FarmAsset) => {
        setEditingId(a.id);
        setForm({
            asset_type: a.asset_type,
            asset_name: a.asset_name,
            purchase_date: a.purchase_date,
            cost_inr: a.cost_inr,
            economic_life_years: a.economic_life_years,
            salvage_value_inr: a.salvage_value_inr,
            remarks: a.remarks ?? '',
        });
        setFormOpen(true);
    };

    const validate = (): string | null => {
        if (!form.asset_name.trim()) return 'Please enter an asset name.';
        if (!form.purchase_date) return 'Please pick the purchase date.';
        const cost = parseFloat(form.cost_inr);
        if (isNaN(cost) || cost < 0) return 'Cost must be a non-negative number.';
        const life = parseFloat(form.economic_life_years);
        if (isNaN(life) || life <= 0) return 'Economic life must be greater than zero.';
        const salvage = parseFloat(form.salvage_value_inr || '0');
        if (isNaN(salvage) || salvage < 0) return 'Salvage value must be non-negative.';
        if (salvage > cost) return 'Salvage value cannot exceed cost.';
        return null;
    };

    const handleSave = async () => {
        const err = validate();
        if (err) { Alert.alert('Check Details', err); return; }

        const payload: FarmAssetInput = {
            pond_id:             filterPondId ?? null,
            asset_type:          form.asset_type,
            asset_name:          form.asset_name.trim(),
            purchase_date:       form.purchase_date,
            cost_inr:            parseFloat(form.cost_inr),
            economic_life_years: parseFloat(form.economic_life_years),
            salvage_value_inr:   parseFloat(form.salvage_value_inr || '0'),
            remarks:             form.remarks.trim() || null,
        };

        setSaving(true);
        try {
            if (editingId) {
                await farmAssetService.update(editingId, payload);
            } else {
                await farmAssetService.create(payload);
            }
            setFormOpen(false);
            await load();
        } catch (e: any) {
            Alert.alert('Failed', e?.response?.data?.error ?? 'Could not save asset.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Asset', 'This asset record will be permanently deleted.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await farmAssetService.remove(id);
                        setFormOpen(false);
                        await load();
                    } catch (e: any) {
                        Alert.alert('Error', e?.response?.data?.error ?? 'Could not delete.');
                    }
                },
            },
        ]);
    };

    // Live preview of depreciation while typing
    const previewDeprec = useMemo(() => {
        const cost = parseFloat(form.cost_inr);
        const life = parseFloat(form.economic_life_years);
        const salv = parseFloat(form.salvage_value_inr || '0');
        if (isNaN(cost) || isNaN(life) || life <= 0) return null;
        return (cost - (isNaN(salv) ? 0 : salv)) / life;
    }, [form.cost_inr, form.economic_life_years, form.salvage_value_inr]);

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScreenHeader title="Farm Assets" subtitle={filterPondName} onBack={() => navigation.goBack()} />
                <View style={styles.center}><ActivityIndicator color={theme.colors.primary} size="large" /></View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader
                title="Farm Assets"
                subtitle={filterPondName}
                onBack={() => navigation.goBack()}
                rightSlot={
                    <TouchableOpacity style={styles.addBtn} onPress={openNew}>
                        <Ionicons name="add" size={22} color={theme.colors.textInverse} />
                    </TouchableOpacity>
                }
            />

            {/* Summary strip */}
            <View style={styles.summaryRow}>
                <SummaryChip label="Assets"          value={String(summary.count)}                                     color={theme.colors.primary} theme={theme} />
                <SummaryChip label="Total Cost"      value={`₹${summary.totalCost.toLocaleString('en-IN')}`}            color="#0ea5e9"             theme={theme} />
                <SummaryChip label="Annual Deprec."  value={`₹${summary.annualDeprec.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} color="#22c55e" theme={theme} />
            </View>

            {assets.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="cube-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={styles.emptyTitle}>No assets recorded</Text>
                    <Text style={styles.emptySub}>Track aerators, pumps, boats, nets and more to compute depreciation.</Text>
                    <TouchableOpacity style={styles.createBtn} onPress={openNew}>
                        <Ionicons name="add-circle-outline" size={18} color={theme.colors.textInverse} />
                        <Text style={styles.createBtnText}>Add Asset</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={assets}
                    keyExtractor={a => a.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => {
                        const meta = ASSET_TYPE_MAP[item.asset_type];
                        return (
                            <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => openEdit(item)}>
                                <View style={styles.cardHead}>
                                    <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
                                        <Ionicons name={meta.icon} size={20} color={theme.colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>{item.asset_name}</Text>
                                        <Text style={styles.cardSub}>{meta.label} · Purchased {formatDateLabel(item.purchase_date)}</Text>
                                        {item.pond_name && (
                                            <Text style={styles.pondTag}>Pond: {item.pond_name}</Text>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.metaRow}>
                                    <Stat label="Cost" value={`₹${num(item.cost_inr).toLocaleString('en-IN')}`} theme={theme} />
                                    <Stat label="Life" value={`${num(item.economic_life_years)} yr`} theme={theme} />
                                    <Stat label="Salvage" value={`₹${num(item.salvage_value_inr).toLocaleString('en-IN')}`} theme={theme} />
                                    <Stat
                                        label="Annual Deprec."
                                        value={`₹${num(item.annual_depreciation_inr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                                        theme={theme}
                                        accent="#22c55e"
                                    />
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            {/* Form modal */}
            <Modal visible={formOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFormOpen(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
                    <ScreenHeader
                        title={editingId ? 'Edit Asset' : 'New Asset'}
                        subtitle={filterPondName}
                        onBack={() => setFormOpen(false)}
                        rightSlot={editingId ? (
                            <TouchableOpacity style={styles.headerDelBtn} onPress={() => handleDelete(editingId)}>
                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                            </TouchableOpacity>
                        ) : undefined}
                    />
                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">

                            <Section title="Asset">
                                <Label>Asset Type *</Label>
                                <TouchableOpacity style={styles.pickerRow} onPress={() => setTypePickerOpen(true)}>
                                    <Ionicons name={ASSET_TYPE_MAP[form.asset_type].icon} size={18} color={theme.colors.primary} />
                                    <Text style={styles.pickerRowText}>{ASSET_TYPE_MAP[form.asset_type].label}</Text>
                                    <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
                                </TouchableOpacity>
                                <View style={{ height: 10 }} />
                                <Label>Asset Name / Label *</Label>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 2 HP aerator (north pond)"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={form.asset_name}
                                    onChangeText={t => setForm(f => ({ ...f, asset_name: t }))}
                                />
                                <View style={{ height: 10 }} />
                                <Label>Purchase Date *</Label>
                                <TouchableOpacity style={styles.dateRow} onPress={() => setCalendarOpen(true)}>
                                    <Ionicons name="calendar-outline" size={16} color={form.purchase_date ? theme.colors.primary : theme.colors.textMuted} />
                                    <Text style={[styles.dateValue, !form.purchase_date && styles.dateValueEmpty]}>
                                        {form.purchase_date ? formatDateLabel(form.purchase_date) : 'Tap to choose'}
                                    </Text>
                                </TouchableOpacity>
                            </Section>

                            <Section title="Financials (₹)">
                                <NumField label="Cost (A)"           value={form.cost_inr}            onChange={v => setForm(f => ({ ...f, cost_inr: v }))}            suffix="₹" theme={theme} styles={styles} />
                                <NumField label="Economic Life (B)"  value={form.economic_life_years} onChange={v => setForm(f => ({ ...f, economic_life_years: v }))} suffix="yr" theme={theme} styles={styles} />
                                <NumField label="Salvage Value (C)"  value={form.salvage_value_inr}   onChange={v => setForm(f => ({ ...f, salvage_value_inr: v }))}   suffix="₹" theme={theme} styles={styles} />

                                {previewDeprec !== null && (
                                    <View style={styles.previewCard}>
                                        <Ionicons name="calculator-outline" size={18} color={theme.colors.primary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.previewLabel}>Annual Depreciation</Text>
                                            <Text style={styles.previewFormula}>(A − C) ÷ B</Text>
                                        </View>
                                        <Text style={styles.previewValue}>
                                            ₹{previewDeprec.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                )}
                            </Section>

                            <Section title="Remarks">
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Optional notes..."
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={form.remarks}
                                    onChangeText={t => setForm(f => ({ ...f, remarks: t }))}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </Section>

                            <TouchableOpacity
                                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color={theme.colors.textInverse} />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={20} color={theme.colors.textInverse} />
                                        <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Asset'}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>

                    <CalendarPickerModal
                        visible={calendarOpen}
                        value={form.purchase_date}
                        title="Purchase Date"
                        subtitle="When did you buy this asset?"
                        onSelect={iso => setForm(f => ({ ...f, purchase_date: iso }))}
                        onClose={() => setCalendarOpen(false)}
                    />

                    {/* Asset type picker */}
                    <Modal visible={typePickerOpen} transparent animationType="slide">
                        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypePickerOpen(false)}>
                            <View style={styles.modalSheet}>
                                <Text style={styles.modalTitle}>Select Asset Type</Text>
                                <FlatList
                                    data={ASSET_TYPES}
                                    keyExtractor={t => t.value}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.modalItem, form.asset_type === item.value && styles.modalItemActive]}
                                            onPress={() => {
                                                setForm(f => ({ ...f, asset_type: item.value }));
                                                setTypePickerOpen(false);
                                            }}
                                        >
                                            <Ionicons name={item.icon} size={20} color={theme.colors.primary} />
                                            <Text style={[styles.modalItemText, form.asset_type === item.value && { fontWeight: '800', color: theme.colors.primary }]}>
                                                {item.label}
                                            </Text>
                                            {form.asset_type === item.value && (
                                                <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </TouchableOpacity>
                    </Modal>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Sub-components (re-use the same pattern as CropCycleScreen) ─────────────

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
                fontSize: 12, fontWeight: '800', color: c.textMuted,
                letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase',
            }}>{title}</Text>
            {children}
        </View>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();
    return <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 6 }}>{children}</Text>;
}

function NumField({ label, value, onChange, suffix, theme, styles }: {
    label: string; value: string; onChange: (v: string) => void;
    suffix: string; theme: any; styles: any;
}) {
    return (
        <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
            <View style={styles.numWrap}>
                <Text style={styles.numSuffix}>{suffix}</Text>
                <TextInput
                    style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 15 }}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={value}
                    onChangeText={t => onChange(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                />
            </View>
        </View>
    );
}

function Stat({ label, value, theme, accent }: any) {
    const c = theme.colors;
    return (
        <View style={{ flex: 1, minWidth: '40%' }}>
            <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: '700' }}>{label.toUpperCase()}</Text>
            <Text style={{ fontSize: 13, color: accent || c.textPrimary, fontWeight: '800', marginTop: 2 }}>{value}</Text>
        </View>
    );
}

function SummaryChip({ label, value, color, theme }: any) {
    const c = theme.colors;
    return (
        <View style={{
            flex: 1, padding: 10,
            backgroundColor: color + '10',
            borderRadius: 12,
            borderWidth: 1, borderColor: color + '33',
            alignItems: 'center',
        }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color }}>{value}</Text>
            <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '700' }}>{label.toUpperCase()}</Text>
        </View>
    );
}

const getStyles = (theme: any) => {
    const c = theme.colors;
    return StyleSheet.create({
        safeArea: { flex: 1, backgroundColor: c.background },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
        emptyTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
        emptySub: { fontSize: 13, color: c.textMuted, textAlign: 'center' },
        addBtn: {
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: c.primary,
            alignItems: 'center', justifyContent: 'center',
        },
        createBtn: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: c.primary,
            paddingHorizontal: 22, paddingVertical: 12,
            borderRadius: 14,
        },
        createBtnText: { color: c.textInverse, fontSize: 14, fontWeight: '800' },
        summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
        list: { padding: 16, gap: 12, paddingTop: 16 },
        card: {
            backgroundColor: c.surface,
            borderRadius: 16,
            borderWidth: 1, borderColor: c.border,
            padding: 14,
            gap: 10,
            marginBottom: 12,
        },
        cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        iconWrap: {
            width: 44, height: 44, borderRadius: 12,
            alignItems: 'center', justifyContent: 'center',
        },
        cardTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
        cardSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
        pondTag: { fontSize: 11, color: c.primary, fontWeight: '700', marginTop: 2 },
        metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        formContent: { padding: 16, paddingBottom: 32 },
        input: {
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1, borderColor: c.border,
            borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 12,
            fontSize: 15, color: c.textPrimary,
        },
        textArea: { minHeight: 90, paddingTop: 12 },
        pickerRow: {
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1, borderColor: c.border,
            borderRadius: 12,
            paddingHorizontal: 14, height: 48,
        },
        pickerRowText: { flex: 1, fontSize: 15, color: c.textPrimary, fontWeight: '700' },
        dateRow: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1, borderColor: c.border,
            borderRadius: 12,
            paddingHorizontal: 12, height: 46,
        },
        dateValue: { flex: 1, fontSize: 14, color: c.textPrimary, fontWeight: '700' },
        dateValueEmpty: { color: c.textMuted, fontWeight: '500' },
        numWrap: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1, borderColor: c.border,
            borderRadius: 12,
            paddingHorizontal: 14, height: 46,
        },
        numSuffix: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
        previewCard: {
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: c.primary + '12',
            borderRadius: 12,
            borderWidth: 1, borderColor: c.primary + '33',
            padding: 12, marginTop: 4,
        },
        previewLabel: { fontSize: 12, color: c.textSecondary, fontWeight: '800' },
        previewFormula: { fontSize: 11, color: c.textMuted, fontStyle: 'italic', marginTop: 2 },
        previewValue: { fontSize: 17, color: c.primary, fontWeight: '800' },
        saveBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 10,
            backgroundColor: c.primary,
            borderRadius: 16,
            paddingVertical: 16,
        },
        saveBtnText: { color: c.textInverse, fontSize: 15, fontWeight: '800' },
        headerDelBtn: {
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: '#fef2f2',
            borderWidth: 1, borderColor: '#fecaca',
            alignItems: 'center', justifyContent: 'center',
        },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
        modalSheet: {
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 8, paddingBottom: 28,
            maxHeight: '70%',
        },
        modalTitle: {
            fontSize: 16, fontWeight: '800', color: c.textPrimary,
            textAlign: 'center', paddingVertical: 16,
            borderBottomWidth: 1, borderBottomColor: c.border,
        },
        modalItem: {
            flexDirection: 'row', alignItems: 'center', gap: 12,
            paddingHorizontal: 20, paddingVertical: 14,
            borderBottomWidth: 1, borderBottomColor: c.border,
        },
        modalItemActive: { backgroundColor: c.primary + '10' },
        modalItemText: { flex: 1, fontSize: 15, color: c.textPrimary, fontWeight: '700' },
    });
};
