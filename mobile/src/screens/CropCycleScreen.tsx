/**
 * CropCycleScreen
 * Farmer manages crop / production cycles for ONE pond.
 *
 * Route params: { pondId, pondName }
 *   - List existing cycles (status-tabbed: Ongoing / Harvested / Cancelled)
 *   - Tap an item to edit, or tap + to add
 *   - Captures gov-survey Section B recurring fields:
 *       production (kg), 8 input cost items, revenue
 *
 * Cycles live entirely on the backend (server is source of truth — these are
 * audit records). No WatermelonDB cache.
 */

import React, { useCallback, useState } from 'react';
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
import { cropCycleService, CropCycle, CropCycleInput, CropCycleStatus } from '../services/apiService';

type RouteParams = { CropCycle: { pondId: string; pondName?: string } };
type StatusTab = 'all' | 'ongoing' | 'harvested';

const STATUS_META: Record<CropCycleStatus, { label: string; color: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = {
    ONGOING:   { label: 'Ongoing',   color: '#0ea5e9', icon: 'play-circle-outline' },
    HARVESTED: { label: 'Harvested', color: '#22c55e', icon: 'checkmark-circle-outline' },
    CANCELLED: { label: 'Cancelled', color: '#94a3b8', icon: 'close-circle-outline' },
};

interface FormState {
    cycle_name: string;
    species_name: string;
    start_date: string;
    end_date: string;
    status: CropCycleStatus;
    present_production_kg: string;
    total_production_kg: string;
    feed_formulated_cost: string;
    feed_homemade_cost: string;
    probiotic_cost: string;
    medicine_cost: string;
    electricity_cost: string;
    labour_hired_cost: string;
    labour_family_cost: string;
    other_cost: string;
    revenue_inr: string;
    remarks: string;
}

const EMPTY_FORM: FormState = {
    cycle_name: '',
    species_name: '',
    start_date: '',
    end_date: '',
    status: 'ONGOING',
    present_production_kg: '',
    total_production_kg: '',
    feed_formulated_cost: '',
    feed_homemade_cost: '',
    probiotic_cost: '',
    medicine_cost: '',
    electricity_cost: '',
    labour_hired_cost: '',
    labour_family_cost: '',
    other_cost: '',
    revenue_inr: '',
    remarks: '',
};

function num(value: string | null | undefined): number {
    return value ? parseFloat(value) : 0;
}

function totalCost(c: CropCycle): number {
    return num(c.feed_formulated_cost) + num(c.feed_homemade_cost) +
        num(c.probiotic_cost) + num(c.medicine_cost) +
        num(c.electricity_cost) + num(c.labour_hired_cost) +
        num(c.labour_family_cost) + num(c.other_cost);
}

function profit(c: CropCycle): number {
    return num(c.revenue_inr) - totalCost(c);
}

export default function CropCycleScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'CropCycle'>>();
    const { pondId, pondName } = route.params;

    const [cycles, setCycles] = useState<CropCycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<StatusTab>('ongoing');

    // Form modal state
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [calendarFor, setCalendarFor] = useState<'start' | 'end' | null>(null);

    const expectedHarvestDate = React.useMemo(() => {
        if (!form.start_date) return null;
        const d = new Date(form.start_date);
        d.setDate(d.getDate() + 300);
        return d.toISOString().slice(0, 10);
    }, [form.start_date]);

    const load = useCallback(async () => {
        try {
            const data = await cropCycleService.list({ pondId });
            setCycles(data);
        } catch {
            Alert.alert('Error', 'Could not load cycles.');
        } finally {
            setLoading(false);
        }
    }, [pondId]);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const filtered = cycles.filter(c => {
        if (tab === 'all') return true;
        if (tab === 'ongoing') return c.status === 'ONGOING';
        if (tab === 'harvested') return c.status === 'HARVESTED' || c.status === 'CANCELLED';
        return true;
    });

    const openNew = () => {
        setEditingId(null);
        setForm({
            ...EMPTY_FORM,
            start_date: new Date().toISOString().slice(0, 10),
        });
        setFormOpen(true);
    };

    const openEdit = (c: CropCycle) => {
        setEditingId(c.id);
        setForm({
            cycle_name: c.cycle_name,
            species_name: c.species_name ?? '',
            start_date: c.start_date,
            end_date: c.end_date ?? '',
            status: c.status,
            present_production_kg: c.present_production_kg ?? '',
            total_production_kg: c.total_production_kg ?? '',
            feed_formulated_cost: c.feed_formulated_cost ?? '',
            feed_homemade_cost: c.feed_homemade_cost ?? '',
            probiotic_cost: c.probiotic_cost ?? '',
            medicine_cost: c.medicine_cost ?? '',
            electricity_cost: c.electricity_cost ?? '',
            labour_hired_cost: c.labour_hired_cost ?? '',
            labour_family_cost: c.labour_family_cost ?? '',
            other_cost: c.other_cost ?? '',
            revenue_inr: c.revenue_inr ?? '',
            remarks: c.remarks ?? '',
        });
        setFormOpen(true);
    };

    const validate = (): string | null => {
        if (!form.cycle_name.trim()) return 'Please enter a name for this cycle (e.g. "Kharif 2025").';
        if (!form.start_date) return 'Start date is required.';
        if (form.end_date && form.end_date < form.start_date) return 'End date cannot be before start date.';
        return null;
    };

    const handleSave = async () => {
        const err = validate();
        if (err) { Alert.alert('Check Details', err); return; }

        const toNum = (s: string): number | null => {
            const t = s.trim();
            if (!t) return null;
            const n = parseFloat(t);
            return isNaN(n) ? null : n;
        };

        const payload: CropCycleInput = {
            pond_id: pondId,
            cycle_name: form.cycle_name.trim(),
            species_name: form.species_name.trim() || null,
            start_date: form.start_date,
            end_date: form.end_date || null,
            status: form.status,
            present_production_kg: toNum(form.present_production_kg),
            total_production_kg: toNum(form.total_production_kg),
            feed_formulated_cost: toNum(form.feed_formulated_cost),
            feed_homemade_cost: toNum(form.feed_homemade_cost),
            probiotic_cost: toNum(form.probiotic_cost),
            medicine_cost: toNum(form.medicine_cost),
            electricity_cost: toNum(form.electricity_cost),
            labour_hired_cost: toNum(form.labour_hired_cost),
            labour_family_cost: toNum(form.labour_family_cost),
            other_cost: toNum(form.other_cost),
            revenue_inr: toNum(form.revenue_inr),
            remarks: form.remarks.trim() || null,
        };

        const proceedSave = async () => {
            setSaving(true);
            try {
                if (editingId) {
                    await cropCycleService.update(editingId, payload);
                } else {
                    await cropCycleService.create(payload);
                }
                setFormOpen(false);
                await load();
            } catch (e: any) {
                Alert.alert('Failed', e?.response?.data?.error ?? 'Could not save cycle.');
            } finally {
                setSaving(false);
            }
        };

        if (form.status === 'HARVESTED') {
            const totalInputCosts = num(form.feed_formulated_cost) + num(form.feed_homemade_cost) +
                num(form.probiotic_cost) + num(form.medicine_cost) +
                num(form.electricity_cost) + num(form.labour_hired_cost) +
                num(form.labour_family_cost) + num(form.other_cost);
            const revenue = num(form.revenue_inr);
            const bcr = totalInputCosts > 0 ? (revenue / totalInputCosts) : (revenue > 0 ? 99.9 : 0);

            let feedback = '';
            if (bcr > 1.0) {
                feedback = `Benefit-Cost Ratio (BCR): ${bcr.toFixed(2)}\n\nCongratulations! You made a profit. You earned ₹${bcr.toFixed(2)} for every ₹1 spent.`;
            } else {
                feedback = `Benefit-Cost Ratio (BCR): ${bcr.toFixed(2)}\n\nThis cycle did not break even. Check the Pitfalls guide in the Learning Center to see how to improve feed and survival.`;
            }

            Alert.alert(
                'Harvest Summary',
                feedback,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Confirm & Save', onPress: () => void proceedSave() }
                ]
            );
        } else {
            await proceedSave();
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Cycle', 'This cycle will be permanently deleted.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cropCycleService.remove(id);
                        setFormOpen(false);
                        await load();
                    } catch (e: any) {
                        Alert.alert('Error', e?.response?.data?.error ?? 'Could not delete.');
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScreenHeader title="Crop Cycles" subtitle={pondName} onBack={() => navigation.goBack()} />
                <View style={styles.center}><ActivityIndicator color={theme.colors.primary} size="large" /></View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScreenHeader
                title="Crop Cycles"
                subtitle={pondName}
                onBack={() => navigation.goBack()}
                rightSlot={
                    <TouchableOpacity style={styles.addBtn} onPress={openNew}>
                        <Ionicons name="add" size={22} color={theme.colors.textInverse} />
                    </TouchableOpacity>
                }
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.filterRow}>
                {(['ongoing', 'harvested', 'all'] as StatusTab[]).map(t => {
                    const count = cycles.filter(c => {
                        if (t === 'ongoing') return c.status === 'ONGOING';
                        if (t === 'harvested') return c.status === 'HARVESTED' || c.status === 'CANCELLED';
                        return true;
                    }).length;
                    return (
                        <TouchableOpacity
                            key={t}
                            style={[styles.filterChip, tab === t && styles.filterChipActive]}
                            onPress={() => setTab(t)}
                        >
                            <Text style={[styles.filterChipText, tab === t && styles.filterChipTextActive]}>
                                {t === 'ongoing' ? `Ongoing (${count})` :
                                 t === 'harvested' ? `Harvested (${count})` :
                                 `All (${count})`}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {filtered.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="analytics-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={styles.emptyTitle}>No cycles yet</Text>
                    <Text style={styles.emptySub}>Start a new cycle when you stock fish or begin a fresh season.</Text>
                    <TouchableOpacity style={styles.createBtn} onPress={openNew}>
                        <Ionicons name="add-circle-outline" size={18} color={theme.colors.textInverse} />
                        <Text style={styles.createBtnText}>New Cycle</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={c => c.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => {
                        const meta = STATUS_META[item.status];
                        const tc = totalCost(item);
                        const pr = profit(item);
                        return (
                            <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => openEdit(item)}>
                                <View style={styles.cardHead}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>{item.cycle_name}</Text>
                                        <Text style={styles.cardSub}>
                                            {formatDateLabel(item.start_date)}
                                            {item.end_date ? ` → ${formatDateLabel(item.end_date)}` : ' → ongoing'}
                                        </Text>
                                        {item.species_name && (
                                            <Text style={styles.cardSpecies}>{item.species_name}</Text>
                                        )}
                                    </View>
                                    <View style={[styles.statusPill, { backgroundColor: meta.color + '22' }]}>
                                        <Ionicons name={meta.icon} size={12} color={meta.color} />
                                        <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                                    </View>
                                </View>

                                <View style={styles.metaRow}>
                                    <Stat label="Production" value={`${num(item.total_production_kg || item.present_production_kg).toLocaleString('en-IN')} kg`} theme={theme} />
                                    <Stat label="Costs" value={`₹${tc.toLocaleString('en-IN')}`} theme={theme} />
                                    <Stat label="Revenue" value={`₹${num(item.revenue_inr).toLocaleString('en-IN')}`} theme={theme} />
                                    <Stat
                                        label="Profit"
                                        value={`₹${pr.toLocaleString('en-IN')}`}
                                        theme={theme}
                                        accent={pr >= 0 ? '#22c55e' : '#ef4444'}
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
                        title={editingId ? 'Edit Cycle' : 'New Cycle'}
                        subtitle={pondName}
                        onBack={() => setFormOpen(false)}
                        rightSlot={editingId ? (
                            <TouchableOpacity style={styles.headerDelBtn} onPress={() => handleDelete(editingId)}>
                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                            </TouchableOpacity>
                        ) : undefined}
                    />
                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">

                            <Section title="Basics">
                                <Label>Cycle Name *</Label>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Kharif 2025, Cycle 1"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={form.cycle_name}
                                    onChangeText={t => setForm(f => ({ ...f, cycle_name: t }))}
                                />
                                <View style={{ height: 10 }} />
                                <Label>Species (optional)</Label>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Rohu, Catla"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={form.species_name}
                                    onChangeText={t => setForm(f => ({ ...f, species_name: t }))}
                                />
                                <View style={{ height: 10 }} />

                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Label>Start Date *</Label>
                                        <TouchableOpacity style={styles.dateRow} onPress={() => setCalendarFor('start')}>
                                            <Ionicons name="calendar-outline" size={16} color={form.start_date ? theme.colors.primary : theme.colors.textMuted} />
                                            <Text style={[styles.dateValue, !form.start_date && styles.dateValueEmpty]}>
                                                {form.start_date ? formatDateLabel(form.start_date) : 'Pick'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Label>End Date</Label>
                                        <TouchableOpacity style={styles.dateRow} onPress={() => setCalendarFor('end')}>
                                            <Ionicons name="calendar-outline" size={16} color={form.end_date ? theme.colors.primary : theme.colors.textMuted} />
                                            <Text style={[styles.dateValue, !form.end_date && styles.dateValueEmpty]}>
                                                {form.end_date ? formatDateLabel(form.end_date) : 'Optional'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {expectedHarvestDate && !form.end_date && (
                                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 8, fontWeight: '600' }}>
                                        💡 Expected Harvest: {formatDateLabel(expectedHarvestDate)} (10 months)
                                    </Text>
                                )}

                                <View style={{ height: 10 }} />
                                <Label>Status</Label>
                                <View style={styles.statusToggleRow}>
                                    {(['ONGOING', 'HARVESTED', 'CANCELLED'] as CropCycleStatus[]).map(s => (
                                        <TouchableOpacity
                                            key={s}
                                            style={[styles.toggleBtn, form.status === s && styles.toggleBtnActive]}
                                            onPress={() => setForm(f => ({ ...f, status: s }))}
                                        >
                                            <Text style={[styles.toggleBtnText, form.status === s && styles.toggleBtnTextActive]}>
                                                {STATUS_META[s].label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </Section>

                            <Section title="Production (kg)">
                                <NumField
                                    label="Present Production (running)"
                                    value={form.present_production_kg}
                                    onChange={v => setForm(f => ({ ...f, present_production_kg: v }))}
                                    suffix="kg"
                                    theme={theme}
                                    styles={styles}
                                />
                                <NumField
                                    label="Total Production (at harvest)"
                                    value={form.total_production_kg}
                                    onChange={v => setForm(f => ({ ...f, total_production_kg: v }))}
                                    suffix="kg"
                                    theme={theme}
                                    styles={styles}
                                />
                            </Section>

                            <Section title="Input Cost Breakdown (₹)">
                                <NumField label="Feed — Formulated"  value={form.feed_formulated_cost} onChange={v => setForm(f => ({ ...f, feed_formulated_cost: v }))} suffix="₹" theme={theme} styles={styles} />
                                <NumField label="Feed — Home-made"   value={form.feed_homemade_cost}   onChange={v => setForm(f => ({ ...f, feed_homemade_cost: v }))}   suffix="₹" theme={theme} styles={styles} />
                                <NumField label="Probiotic"          value={form.probiotic_cost}       onChange={v => setForm(f => ({ ...f, probiotic_cost: v }))}       suffix="₹" theme={theme} styles={styles} />
                                <NumField label="Medicine"           value={form.medicine_cost}        onChange={v => setForm(f => ({ ...f, medicine_cost: v }))}        suffix="₹" theme={theme} styles={styles} />
                                <NumField label="Electricity"        value={form.electricity_cost}     onChange={v => setForm(f => ({ ...f, electricity_cost: v }))}     suffix="₹" theme={theme} styles={styles} />
                                <NumField label="Labour — Hired"     value={form.labour_hired_cost}    onChange={v => setForm(f => ({ ...f, labour_hired_cost: v }))}    suffix="₹" theme={theme} styles={styles} />
                                <NumField label="Labour — Family"    value={form.labour_family_cost}   onChange={v => setForm(f => ({ ...f, labour_family_cost: v }))}   suffix="₹" theme={theme} styles={styles} />
                                <NumField label="Other"              value={form.other_cost}           onChange={v => setForm(f => ({ ...f, other_cost: v }))}           suffix="₹" theme={theme} styles={styles} />
                            </Section>

                            <Section title="Revenue (₹)">
                                <NumField
                                    label="Total Revenue from Pond"
                                    value={form.revenue_inr}
                                    onChange={v => setForm(f => ({ ...f, revenue_inr: v }))}
                                    suffix="₹"
                                    theme={theme}
                                    styles={styles}
                                />
                            </Section>

                            <Section title="Remarks">
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Any notes about this cycle..."
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
                                        <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create Cycle'}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>

                    {/* Calendar pickers — shared modal switched by `calendarFor` */}
                    <CalendarPickerModal
                        visible={calendarFor !== null}
                        value={calendarFor === 'start' ? form.start_date : form.end_date}
                        title={calendarFor === 'start' ? 'Start Date' : 'End Date'}
                        subtitle={calendarFor === 'start' ? 'When did this cycle begin?' : 'When did it end?'}
                        onSelect={iso => {
                            if (calendarFor === 'start') setForm(f => ({ ...f, start_date: iso }));
                            else if (calendarFor === 'end') setForm(f => ({ ...f, end_date: iso }));
                        }}
                        onClose={() => setCalendarFor(null)}
                        maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                    />
                </SafeAreaView>
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
                    placeholder="0.00"
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
        filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
        filterChip: {
            alignSelf: 'flex-start',
            paddingHorizontal: 14, paddingVertical: 7,
            borderRadius: 999,
            borderWidth: 1, borderColor: c.border,
            backgroundColor: c.surface,
        },
        filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
        filterChipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
        filterChipTextActive: { color: c.textInverse },
        list: { padding: 16, gap: 12 },
        card: {
            backgroundColor: c.surface,
            borderRadius: 16,
            borderWidth: 1, borderColor: c.border,
            padding: 14,
            gap: 10,
            marginBottom: 12,
        },
        cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
        cardTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
        cardSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
        cardSpecies: { fontSize: 11, color: c.primary, fontWeight: '700', marginTop: 2 },
        statusPill: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 999,
            alignSelf: 'flex-start',
        },
        statusPillText: { fontSize: 11, fontWeight: '800' },
        metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        // Form
        formContent: { padding: 16, paddingBottom: 32 },
        input: {
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1, borderColor: c.border,
            borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 12,
            fontSize: 15, color: c.textPrimary,
        },
        textArea: { minHeight: 90, paddingTop: 12 },
        numWrap: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1, borderColor: c.border,
            borderRadius: 12,
            paddingHorizontal: 14, height: 46,
        },
        numSuffix: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
        dateRow: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: c.surfaceLow ?? c.background,
            borderWidth: 1, borderColor: c.border,
            borderRadius: 12,
            paddingHorizontal: 12, height: 46,
        },
        dateValue: { flex: 1, fontSize: 14, color: c.textPrimary, fontWeight: '700' },
        dateValueEmpty: { color: c.textMuted, fontWeight: '500' },
        statusToggleRow: { flexDirection: 'row', gap: 8 },
        toggleBtn: {
            flex: 1, paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1.5, borderColor: c.border,
            backgroundColor: c.surface,
            alignItems: 'center',
        },
        toggleBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
        toggleBtnText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
        toggleBtnTextActive: { color: c.textInverse },
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
    });
};
