import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Alert, Image, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';
import database from '../database';
import { loadProfile } from '../services/profileService';
import { syncService } from '../services/syncService';
import Pond from '../database/models/Pond';
import { Q } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import { fetchSpeciesLookup, getSpeciesDisplay, SpeciesLookup } from '../utils/speciesLookup';
import * as ImagePicker from 'expo-image-picker';
import { getSpeciesProfile, getCultureProfile, type FarmingSystem } from '../utils/pondLifecycle';

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatStockingDate = (timestamp?: number) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
};

// ─── Offline ROI estimator ────────────────────────────────────────────────────
// Uses pondLifecycle species profiles — no backend call needed.
// Returns null if species or system data is insufficient.

type PondROI = {
    speciesName: string;
    systemType: string;
    cultureDays: number;
    cropsPerYear: number;
    harvestWeightMin: number;
    harvestWeightMax: number;
    note: string;
    // Estimated financials (conservative)
    estimatedYieldKgPerCycle: number | null;
    estimatedRevenuePerCycle: number | null;
    estimatedOpexPerCycle: number | null;
    estimatedProfitPerCycle: number | null;
    breakevenMonths: number | null;
    marketPriceMin: number | null;
    marketPriceMax: number | null;
};

function computePondROI(
    scientificName: string | null | undefined,
    systemType: string | null | undefined,
    storedAreaOrUnits: number,  // raw areaHectares field — for EARTHEN this IS hectares; for BIOFLOC/RAS/CAGES it's the unit count stored via toStored()
): PondROI | null {
    if (!scientificName) return null;

    const profile = getSpeciesProfile(scientificName);
    if (!profile) return null;

    const sys = (systemType || profile.defaultSystem) as FarmingSystem;
    const culture = getCultureProfile(scientificName, sys);

    // getCultureProfile may return null for unsupported species/system combos — bail out safely
    if (!culture) return null;

    // Scale interpretation differs by system:
    //   EARTHEN / PENS  → storedAreaOrUnits = hectares
    //   BIOFLOC / RAS / CAGES → storedAreaOrUnits = integer unit/tank/cage count
    const scaleValue = Math.max(storedAreaOrUnits || 1, 0.01);

    // Market price from species economic parameters (stored in DB, not in pondLifecycle)
    // Use conservative estimates per species category
    const MARKET_PRICE_BY_CATEGORY: Record<string, { min: number; max: number }> = {
        INDIAN_MAJOR_CARP: { min: 80,  max: 130 },
        MINOR_CARP:        { min: 60,  max: 100 },
        EXOTIC_CARP:       { min: 60,  max: 100 },
        CATFISH:           { min: 150, max: 300 },
        MURREL:            { min: 200, max: 400 },
        CICHLID:           { min: 80,  max: 120 },
        SHRIMP:            { min: 300, max: 500 },
        PRAWN:             { min: 250, max: 400 },
        FEATHERBACK:       { min: 200, max: 350 },
        SPINY_EEL:         { min: 300, max: 600 },
        ORNAMENTAL:        { min: 200, max: 800 },
        CRAB:              { min: 100, max: 250 },
    };

    const priceRange = MARKET_PRICE_BY_CATEGORY[profile.category] || { min: 80, max: 150 };
    const conservativePrice = priceRange.min + (priceRange.max - priceRange.min) * 0.35;

    // Yield estimate per cycle
    // For EARTHEN: use areaHectares × yield per hectare (rough: 2,000–5,000 kg/ha for carps)
    // For BIOFLOC/RAS/CAGES: use unit count × per-unit yield from culture profile
    let yieldKgPerCycle: number | null = null;
    let opexPerCycle: number | null = null;
    let capexEstimate: number | null = null;

    const avgHarvestKg = (culture.harvestWeightGMin + culture.harvestWeightGMax) / 2 / 1000;

    if (sys === 'BIOFLOC') {
        // Biofloc: ~500–800 kg per tank per cycle depending on species
        const yieldPerTank = profile.category === 'CATFISH'
            ? 4500 * 0.75 * avgHarvestKg   // Mangur: 4500 fish × 75% × avg weight
            : 1350 * 0.80 * avgHarvestKg;  // Pangasius: 1350 fish × 80% × avg weight
        yieldKgPerCycle = yieldPerTank * scaleValue;
        opexPerCycle = (profile.category === 'CATFISH' ? 82000 : 36000) * scaleValue;
        capexEstimate = 22000 * scaleValue;
    } else if (sys === 'RAS') {
        // RAS: 4500 fish × 80% × 0.45 kg = 1620 kg per unit
        yieldKgPerCycle = 4500 * 0.80 * avgHarvestKg * scaleValue;
        opexPerCycle = 140000 * scaleValue;
        capexEstimate = 560000 * scaleValue;
    } else if (sys === 'CAGES') {
        // Cage: 9600 fish × 80% × 0.6 kg = 4608 kg per cage
        yieldKgPerCycle = 9600 * 0.80 * avgHarvestKg * scaleValue;
        opexPerCycle = 200000 * scaleValue;
        capexEstimate = 100000 * scaleValue;
    } else {
        // EARTHEN: conservative 2,500 kg/ha for carps, 3,000 for catfish
        const yieldPerHa = profile.category === 'CATFISH' ? 3000
            : profile.category === 'SHRIMP' || profile.category === 'PRAWN' ? 500
            : 2500;
        yieldKgPerCycle = yieldPerHa * scaleValue;
        // OPEX: ~Rs 60,000/ha for carps
        opexPerCycle = 60000 * scaleValue;
        capexEstimate = 150000 * scaleValue;
    }

    const revenuePerCycle = yieldKgPerCycle * conservativePrice;
    const profitPerCycle = revenuePerCycle - opexPerCycle;
    // Breakeven: months to recover capex from profit per cycle
    const cycleMonths = culture.days / 30;
    const breakevenMonths = profitPerCycle > 0
        ? Math.ceil((capexEstimate / profitPerCycle) * cycleMonths)
        : null;

    return {
        speciesName: profile.commonName,
        systemType: sys,
        cultureDays: culture.days,
        cropsPerYear: culture.cropsPerYear,
        harvestWeightMin: culture.harvestWeightGMin,
        harvestWeightMax: culture.harvestWeightGMax,
        note: culture.note,
        estimatedYieldKgPerCycle: Math.round(yieldKgPerCycle),
        estimatedRevenuePerCycle: Math.round(revenuePerCycle),
        estimatedOpexPerCycle: Math.round(opexPerCycle),
        estimatedProfitPerCycle: Math.round(profitPerCycle),
        breakevenMonths,
        marketPriceMin: priceRange.min,
        marketPriceMax: priceRange.max,
    };
}

// ─── PondROICard component ────────────────────────────────────────────────────

function PondROICard({
    roi, theme,
}: {
    roi: PondROI;
    theme: any;
}) {
    const [expanded, setExpanded] = useState(false);
    const c = theme.colors;
    const isProfit = (roi.estimatedProfitPerCycle ?? 0) >= 0;

    const fc = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

    return (
        <View style={roiStyles.card}>
            {/* Header row — always visible */}
            <TouchableOpacity
                style={roiStyles.header}
                onPress={() => setExpanded(e => !e)}
                activeOpacity={0.8}
            >
                <View style={roiStyles.headerLeft}>
                    <Ionicons name="trending-up-outline" size={16} color={c.primary} />
                    <View>
                        <Text style={[roiStyles.headerTitle, { color: c.textPrimary }]}>
                            Estimated ROI — {roi.speciesName}
                        </Text>
                        <Text style={[roiStyles.headerSub, { color: c.textMuted }]}>
                            {`${roi.systemType} \u00b7 ${roi.cultureDays} days \u00b7 ${roi.cropsPerYear} crop${roi.cropsPerYear !== 1 ? 's' : ''}/year`}
                        </Text>
                    </View>
                </View>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={c.textMuted}
                />
            </TouchableOpacity>

            {/* Summary bento — always visible */}
            <View style={roiStyles.bentoRow}>
                <View style={[roiStyles.bentoItem, { borderColor: c.border, backgroundColor: c.surfaceLow }]}>
                    <Text style={[roiStyles.bentoLabel, { color: c.textMuted }]}>YIELD/CYCLE</Text>
                    <Text style={[roiStyles.bentoValue, { color: c.textPrimary }]}>
                        {roi.estimatedYieldKgPerCycle != null ? `${roi.estimatedYieldKgPerCycle.toLocaleString('en-IN')} kg` : '—'}
                    </Text>
                </View>
                <View style={[roiStyles.bentoItem, { borderColor: c.border, backgroundColor: c.surfaceLow }]}>
                    <Text style={[roiStyles.bentoLabel, { color: c.textMuted }]}>PROFIT/CYCLE</Text>
                    <Text style={[roiStyles.bentoValue, { color: isProfit ? c.secondary : c.error }]}>
                        {roi.estimatedProfitPerCycle != null ? fc(roi.estimatedProfitPerCycle) : '—'}
                    </Text>
                </View>
                <View style={[roiStyles.bentoItem, { borderColor: c.border, backgroundColor: c.surfaceLow }]}>
                    <Text style={[roiStyles.bentoLabel, { color: c.textMuted }]}>BREAKEVEN</Text>
                    <Text style={[roiStyles.bentoValue, { color: c.textPrimary }]}>
                        {roi.breakevenMonths != null ? `${roi.breakevenMonths} mo` : '—'}
                    </Text>
                </View>
            </View>

            {/* Expanded detail */}
            {expanded && (
                <View style={[roiStyles.detail, { borderTopColor: c.borderGlass }]}>
                    <ROIRow label="Harvest weight" value={`${roi.harvestWeightMin}–${roi.harvestWeightMax} g`} theme={theme} />
                    <ROIRow label="Market price range" value={`₹${roi.marketPriceMin}–₹${roi.marketPriceMax}/kg`} theme={theme} />
                    <ROIRow label="Est. revenue/cycle" value={roi.estimatedRevenuePerCycle != null ? fc(roi.estimatedRevenuePerCycle) : '—'} theme={theme} />
                    <ROIRow label="Est. running cost/cycle" value={roi.estimatedOpexPerCycle != null ? fc(roi.estimatedOpexPerCycle) : '—'} theme={theme} />
                    <ROIRow label="Annual crops" value={`${roi.cropsPerYear} cycle${roi.cropsPerYear !== 1 ? 's' : ''}/year`} theme={theme} />
                    <View style={[roiStyles.noteBox, { backgroundColor: c.primaryLight, borderColor: c.primary + '30' }]}>
                        <Text style={[roiStyles.noteText, { color: c.textSecondary }]}>{roi.note}</Text>
                    </View>
                    <Text style={[roiStyles.disclaimer, { color: c.textMuted }]}>
                        * Conservative estimates based on Bihar/UP market rates. Actual results depend on management, feed quality, and market conditions. Run the ROI Calculator for a detailed analysis.
                    </Text>
                </View>
            )}
        </View>
    );
}

function ROIRow({ label, value, theme }: { label: string; value: string; theme: any }) {
    return (
        <View style={roiStyles.roiRow}>
            <Text style={[roiStyles.roiLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
            <Text style={[roiStyles.roiValue, { color: theme.colors.textPrimary }]}>{value}</Text>
        </View>
    );
}

const roiStyles = StyleSheet.create({
    card: {
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#0ea5e940',  // primary tint — works in both light/dark
        backgroundColor: 'transparent',
        marginTop: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    headerTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    headerSub: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    bentoRow: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingBottom: 12,
        gap: 8,
    },
    bentoItem: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 6,
        alignItems: 'center',
        gap: 3,
    },
    bentoLabel: {
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    bentoValue: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    },
    detail: {
        borderTopWidth: 1,
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 14,
        gap: 8,
    },
    roiRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 3,
    },
    roiLabel: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    roiValue: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'right',
    },
    noteBox: {
        borderRadius: 10,
        borderWidth: 1,
        padding: 10,
        marginTop: 4,
    },
    noteText: {
        fontSize: 12,
        lineHeight: 17,
        fontStyle: 'italic',
    },
    disclaimer: {
        fontSize: 10,
        lineHeight: 15,
        marginTop: 4,
    },
});

// ─── PondDetailModal ─────────────────────────────────────────────────────────

function PondDetailModal({
    pond, theme, speciesLookup, t, onClose, onEdit,
}: {
    pond: Pond | null;
    theme: any;
    speciesLookup: SpeciesLookup;
    t: (k: string, opts?: any) => string;
    onClose: () => void;
    onEdit: () => void;
}) {
    if (!pond) return null;
    const c = theme.colors;
    const species = getSpeciesDisplay(pond.speciesId, speciesLookup);
    const stockingDate = formatStockingDate(pond.stockingDate);
    const isActive = (pond.status || '').toUpperCase() === 'ACTIVE';

    const DetailRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
        <View style={detailStyles.detailRow}>
            <View style={[detailStyles.iconWrap, { backgroundColor: c.primaryLight }]}>
                <Ionicons name={icon as any} size={16} color={c.primary} />
            </View>
            <View style={detailStyles.detailText}>
                <Text style={[detailStyles.detailLabel, { color: c.textMuted }]}>{label}</Text>
                <Text style={[detailStyles.detailValue, { color: c.textPrimary }]}>{value}</Text>
            </View>
        </View>
    );

    return (
        <Modal
            visible={!!pond}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[detailStyles.container, { backgroundColor: c.background }]}>
                {/* Hero */}
                <View style={detailStyles.hero}>
                    {pond.imageUri ? (
                        <Image source={{ uri: pond.imageUri }} style={detailStyles.heroImage} />
                    ) : (
                        <View style={[detailStyles.heroPlaceholder, { backgroundColor: c.surfaceAlt }]}>
                            <Ionicons name="water-outline" size={56} color={c.primary} />
                        </View>
                    )}
                    {/* Gradient overlay */}
                    <View style={detailStyles.heroOverlay} />
                    {/* Close button */}
                    <TouchableOpacity style={[detailStyles.closeBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={onClose}>
                        <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                    {/* Title overlay */}
                    <View style={detailStyles.heroContent}>
                        <Text style={detailStyles.heroTitle} numberOfLines={2}>{pond.name}</Text>
                        <View style={[detailStyles.heroBadge, { backgroundColor: isActive ? c.secondary : c.accentSoft }]}>
                            <Text style={[detailStyles.heroBadgeText, { color: isActive ? c.textOnSecondary : c.accent }]}>
                                {t(`ponds.status.${(pond.status || 'UNKNOWN').toUpperCase()}`)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Details scroll */}
                <ScrollView contentContainerStyle={detailStyles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={[detailStyles.card, { backgroundColor: c.surface, borderColor: c.borderGlass }]}>
                        {species && (
                            <DetailRow
                                icon="fish-outline"
                                label={t('ponds.species') || 'Species'}
                                value={species.scientificName ? `${species.label} (${species.scientificName})` : species.label}
                            />
                        )}
                        {pond.areaHectares != null && (
                            <DetailRow
                                icon="resize-outline"
                                label={t('ponds.area') || 'Area'}
                                value={`${pond.areaHectares} ${t('common.ha') || 'ha'}`}
                            />
                        )}
                        {pond.systemType ? (
                            <DetailRow icon="grid-outline" label={t('ponds.system') || 'System'} value={pond.systemType} />
                        ) : null}
                        {pond.waterSourceType ? (
                            <DetailRow icon="water-outline" label={t('ponds.source') || 'Water Source'} value={pond.waterSourceType} />
                        ) : null}
                        {stockingDate ? (
                            <DetailRow icon="calendar-outline" label={t('ponds.stockedOn', { date: '' }).split(':')[0] || 'Stocked On'} value={stockingDate} />
                        ) : null}
                        {pond.districtName ? (
                            <DetailRow icon="location-outline" label="District" value={pond.districtName} />
                        ) : null}
                        {pond.blockName ? (
                            <DetailRow icon="map-outline" label="Block" value={pond.blockName} />
                        ) : null}
                    </View>

                    {/* Action buttons */}
                    <TouchableOpacity
                        style={[detailStyles.editBtn, { backgroundColor: c.primary }]}
                        onPress={onEdit}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="create-outline" size={18} color={c.textInverse} />
                        <Text style={[detailStyles.editBtnText, { color: c.textInverse }]}>
                            {t('ponds.editPondBtn') || 'Edit Pond'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </Modal>
    );
}

const detailStyles = StyleSheet.create({
    container: { flex: 1 },
    hero: { height: 280, position: 'relative' },
    heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(11,19,38,0.6)',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroContent: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 20,
        gap: 8,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    heroBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    heroBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
    scroll: { padding: 16, gap: 14, paddingBottom: 48 },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#00000015',
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailText: { flex: 1, gap: 2 },
    detailLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: 15, fontWeight: '700' },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 15,
        borderRadius: 16,
    },
    editBtnText: { fontSize: 15, fontWeight: '800' },
});

// ─── PondCard ────────────────────────────────────────────────────────────────

function PondCard({
    item, theme, styles, speciesLookup,
    onEdit, onDelete, onPickImage, onViewDetail, t,
}: {
    item: Pond;
    theme: any;
    styles: ReturnType<typeof getStyles>;
    speciesLookup: SpeciesLookup;
    onEdit: () => void;
    onDelete: () => void;
    onPickImage: () => void;
    onViewDetail: () => void;
    t: (k: string, opts?: any) => string;
}) {
    const species = getSpeciesDisplay(item.speciesId, speciesLookup);
    const stockingDate = formatStockingDate(item.stockingDate);
    const isActive = (item.status || '').toUpperCase() === 'ACTIVE';

    // Compute ROI only when species is set and pond is active.
    // Pass the raw areaHectares value which is interpreted as:
    //   - hectares for EARTHEN ponds
    //   - unit/tank/cage count for BIOFLOC, RAS, CAGES (stored via ScaleConfig.toStored)
    const roi = isActive && species?.scientificName
        ? computePondROI(species.scientificName, item.systemType, item.areaHectares ?? 1)
        : null;

    return (
        <View style={styles.card}>
            {/* ── Hero image section — tap to view details ── */}
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={onViewDetail}
                style={styles.heroWrapper}
            >
                {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={styles.heroImage} />
                ) : (
                    <View style={styles.heroPlaceholder}>
                        <Ionicons name="water-outline" size={32} color={theme.colors.primary} />
                        <Text style={styles.heroPlaceholderText}>{t('ponds.tapToView') || 'Tap to view details'}</Text>
                    </View>
                )}
                {/* gradient overlay */}
                <View style={styles.heroGradient} pointerEvents="none">
                    <View style={styles.heroGradientInner} />
                </View>
                <View style={styles.heroOverlayContent}>
                    <Text style={styles.heroTitle} numberOfLines={1}>{item.name}</Text>
                    <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeFallow]}>
                        <Text style={[styles.statusBadgeText, isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextFallow]}>
                            {t(`ponds.status.${(item.status || 'UNKNOWN').toUpperCase()}`)}
                        </Text>
                    </View>
                </View>

                {/* Camera pick chip – always shown top-right */}
                <TouchableOpacity
                    style={styles.cameraChip}
                    onPress={e => { e.stopPropagation?.(); onPickImage(); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="camera" size={13} color="#fff" />
                    <Text style={styles.cameraChipText}>{item.imageUri ? t('ponds.update') : t('ponds.tapAddPhoto')}</Text>
                </TouchableOpacity>
            </TouchableOpacity>

            {/* ── Card body ── */}
            <View style={styles.cardBody}>
                {/* Section: Stats row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('ponds.area')}</Text>
                        <Text style={styles.statValue}>{item.areaHectares ?? '—'}<Text style={styles.statUnit}> {t('common.ha')}</Text></Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('ponds.source')}</Text>
                        <Text style={styles.statValue}>{item.waterSourceType || '—'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('ponds.system')}</Text>
                        <Text style={styles.statValue}>{item.systemType || '—'}</Text>
                    </View>
                </View>

                {/* Section: Species */}
                {species ? (
                    <View style={styles.infoRow}>
                        <Ionicons name="fish-outline" size={14} color={theme.colors.primary} />
                        <Text style={styles.infoLabel}>{species.label}</Text>
                        {species.scientificName && species.scientificName !== species.label ? (
                            <Text style={styles.infoMeta}>({species.scientificName})</Text>
                        ) : null}
                    </View>
                ) : (
                    <View style={styles.infoRow}>
                        <Ionicons name="fish-outline" size={14} color={theme.colors.textMuted} />
                        <Text style={styles.infoMeta}>{t('ponds.speciesNotAdded')}</Text>
                    </View>
                )}

                {/* Section: Stocking date */}
                {stockingDate ? (
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
                        <Text style={styles.infoMeta}>{t('ponds.stockedOn', { date: stockingDate })}</Text>
                    </View>
                ) : (
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
                        <Text style={styles.infoMeta}>{t('ponds.addStockingHelp')}</Text>
                    </View>
                )}

                {/* ── ROI estimate card — only shown for active ponds with species set ── */}
                {roi && (
                    <PondROICard roi={roi} theme={theme} />
                )}

                {/* ── Action row ── */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editButton} onPress={onEdit}>
                        <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.editButtonText}>{t('ponds.editPondBtn')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                        <Text style={styles.deleteButtonText}>{t('ponds.deleteBtn')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// ─── PondsList (inner reactive component) ────────────────────────────────────

const PondsList = ({ ponds }: { ponds: Pond[] }) => {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(theme);
    const [speciesLookup, setSpeciesLookup] = useState<SpeciesLookup>({});
    const [selectedPond, setSelectedPond] = useState<Pond | null>(null);

    useEffect(() => {
        fetchSpeciesLookup().then(setSpeciesLookup);
        loadProfile().then(profile => {
            syncService.sync(profile.userId).catch(console.error);
        });
    }, []);

    const handleDelete = (pond: Pond) => {
        Alert.alert(
            t('ponds.deletePondTitle'),
            t('ponds.deletePondBody', { name: pond.name }) + (pond.status === 'ACTIVE' ? t('ponds.deletePondActiveSuffix') : ''),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await database.write(async () => {
                                if (pond.localSyncStatus === 'NEW') {
                                    await pond.destroyPermanently();
                                    return;
                                }
                                await pond.markAsDeleted();
                            });
                        } catch (error: any) {
                            Alert.alert(t('ponds.deleteFailed'), error?.message || t('ponds.deleteFailedBody'));
                        }
                    },
                },
            ]
        );
    };

    const saveImageToPond = async (pond: Pond, uri: string) => {
        try {
            await database.write(async () => {
                await pond.update((p) => {
                    p.imageUri = uri;
                    p.wideAnglePhotoUri = uri;
                });
            });
        } catch {
            Alert.alert(t('ponds.photoErrorTitle'), t('ponds.photoErrorBody'));
        }
    };

    const handlePickImage = async (pond: Pond) => {
        Alert.alert(
            t('ponds.updatePhoto'),
            t('ponds.updatePhotoBody'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('ponds.takePhoto'),
                    onPress: async () => {
                        const permission = await ImagePicker.requestCameraPermissionsAsync();
                        if (!permission.granted) {
                            Alert.alert(t('common.error'), t('ponds.photoErrorBody'));
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
                        if (!result.canceled && result.assets?.length) {
                            saveImageToPond(pond, result.assets[0].uri);
                        }
                    },
                },
                {
                    text: t('ponds.fromGallery'),
                    onPress: async () => {
                        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!permission.granted) {
                            Alert.alert(t('common.error'), t('ponds.photoErrorBody'));
                            return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.7,
                        });
                        if (!result.canceled && result.assets?.length) {
                            saveImageToPond(pond, result.assets[0].uri);
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={() => navigation.navigate('Main', { screen: 'Profile' })}
                >
                    <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('ponds.title')}</Text>
                <TouchableOpacity
                    style={[styles.headerIconBtn, styles.headerAddBtn]}
                    onPress={() => navigation.navigate('AddEditPond')}
                >
                    <Ionicons name="add" size={22} color={theme.colors.textInverse} />
                </TouchableOpacity>
            </View>

            {/* ── Pond Detail Modal ── */}
            <PondDetailModal
                pond={selectedPond}
                theme={theme}
                speciesLookup={speciesLookup}
                t={t}
                onClose={() => setSelectedPond(null)}
                onEdit={() => {
                    setSelectedPond(null);
                    navigation.navigate('AddEditPond', { pondId: selectedPond?.id });
                }}
            />

            {ponds.length === 0 ? (
                /* ── Empty state ── */
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="water-outline" size={52} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('ponds.noPondsTitle')}</Text>
                    <Text style={styles.emptySub}>
                        {t('ponds.noPondsBody')}
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('AddEditPond')}
                    >
                        <Ionicons name="add" size={18} color={theme.colors.textInverse} />
                        <Text style={styles.primaryButtonText}>{t('ponds.addFirstPond')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={ponds}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <PondCard
                            item={item}
                            theme={theme}
                            styles={styles}
                            speciesLookup={speciesLookup}
                            t={t}
                            onViewDetail={() => setSelectedPond(item)}
                            onEdit={() => navigation.navigate('AddEditPond', { pondId: item.id })}
                            onDelete={() => handleDelete(item)}
                            onPickImage={() => handlePickImage(item)}
                        />
                    )}
                />
            )}
        </SafeAreaView>
    );
};

// ─── withObservables wrapper ──────────────────────────────────────────────────

const EnhancedPondsList = withObservables([], () => ({
    ponds: database.collections
        .get<Pond>('ponds')
        .query(Q.where('sync_status', Q.notEq('DELETED')))
        .observe(),
}))(PondsList);

export default function PondsListScreen() {
    return <EnhancedPondsList />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.borderGlass,
    },
    headerAddBtn: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    headerTitle: {
        color: theme.colors.textPrimary,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },

    // List
    list: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 120,
        gap: 16,
    },

    // Card shell
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderGlass,
        overflow: 'hidden',
        ...theme.shadows.md,
    },

    // Hero image
    heroWrapper: {
        height: 180,
        backgroundColor: theme.colors.surfaceAlt,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    heroPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    heroPlaceholderText: {
        color: theme.colors.textMuted,
        fontSize: 13,
        fontWeight: '600',
    },
    heroGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 90,
    },
    heroGradientInner: {
        flex: 1,
        backgroundColor: 'rgba(11,19,38,0.75)',
    },
    heroOverlayContent: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    heroTitle: {
        flex: 1,
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.2,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    cameraChip: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    cameraChipText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },

    // Status badge
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.full,
    },
    statusBadgeActive: {
        backgroundColor: theme.colors.secondary,
    },
    statusBadgeFallow: {
        backgroundColor: theme.colors.accentSoft,
        borderWidth: 1,
        borderColor: theme.colors.accent,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    statusBadgeTextActive: {
        color: theme.colors.textOnSecondary,
    },
    statusBadgeTextFallow: {
        color: theme.colors.accent,
    },

    // Card body
    cardBody: {
        padding: 14,
        gap: 10,
    },

    // Stats row
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.borderRadius.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: theme.colors.borderGlass,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    statLabel: {
        color: theme.colors.textMuted,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    statValue: {
        color: theme.colors.textPrimary,
        fontSize: 13,
        fontWeight: '800',
    },
    statUnit: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: theme.colors.borderGlass,
    },

    // Info rows
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        flexWrap: 'wrap',
    },
    infoLabel: {
        color: theme.colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    infoMeta: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },

    // Action row
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    editButtonText: {
        color: theme.colors.primary,
        fontWeight: '700',
        fontSize: 13,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.errorSoft,
        borderWidth: 1,
        borderColor: theme.colors.error,
    },
    deleteButtonText: {
        color: theme.colors.error,
        fontWeight: '700',
        fontSize: 13,
    },

    // Empty state
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    emptyIconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: theme.colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    emptyTitle: {
        color: theme.colors.textPrimary,
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    emptySub: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        fontSize: 14,
    },
    primaryButton: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 52,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 28,
        ...theme.shadows.glow,
    },
    primaryButtonText: {
        color: theme.colors.textInverse,
        fontWeight: '800',
        fontSize: 15,
    },
});
