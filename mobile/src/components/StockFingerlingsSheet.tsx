/**
 * StockFingerlingsSheet
 * Bottom sheet for a farmer to stock fingerlings into a pond.
 * Accepts either a marketplace listing or a manual TXN ref lookup.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { database } from '../database';
import api from '../services/apiService';

interface Props {
  visible: boolean;
  onClose: () => void;
  pondId: string;
  prefilledListing?: {
    id: string;
    species_name: string;
    species_variant: string | null;
    avg_fingerling_weight_g: number | null;
    hatchery_name: string;
    estimated_fingerling_count: number | null;
  } | null;
  onSuccess?: () => void;
}

export default function StockFingerlingsSheet({ visible, onClose, pondId, prefilledListing, onSuccess }: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  // TXN Ref lookup
  const [txnRef, setTxnRef] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookedUpSale, setLookedUpSale] = useState<any>(null);

  // Form fields
  const [speciesName, setSpeciesName] = useState(prefilledListing?.species_name ?? '');
  const [speciesVariant, setSpeciesVariant] = useState(prefilledListing?.species_variant ?? '');
  const [fingerlingCount, setFingerlingCount] = useState(
    prefilledListing?.estimated_fingerling_count?.toString() ?? ''
  );
  const [avgWeight, setAvgWeight] = useState(
    prefilledListing?.avg_fingerling_weight_g?.toString() ?? ''
  );
  const [source, setSource] = useState<'hatchery' | 'dealer' | 'own'>(
    prefilledListing ? 'hatchery' : 'dealer'
  );

  // Expected harvest date (days from stocking)
  const [harvestDays, setHarvestDays] = useState('180');

  const [saving, setSaving] = useState(false);

  const expectedHarvestDate = React.useMemo(() => {
    const days = parseInt(harvestDays, 10);
    if (!isNaN(days) && days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    }
    return null;
  }, [harvestDays]);

  const handleLookup = async () => {
    if (!txnRef.trim()) return;
    setLookupLoading(true);
    try {
      const res = await api.get(`/api/v1/hatcheries/sales/${txnRef.trim().toUpperCase()}`);
      const sale = res.data?.data;
      if (sale) {
        setLookedUpSale(sale);
        setSpeciesName(sale.species_name ?? sale.batch_species_name ?? '');
        setSpeciesVariant(sale.species_variant ?? sale.batch_species_variant ?? '');
        setFingerlingCount(sale.quantity_pieces?.toString() ?? '');
        setAvgWeight(sale.avg_fingerling_weight_g?.toString() ?? sale.avg_weight_g?.toString() ?? '');
        setSource('hatchery');
      }
    } catch {
      Alert.alert('Not Found', 'No sale found for that transaction reference.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleStock = async () => {
    if (!speciesName.trim()) {
      Alert.alert('Required', 'Please enter species name or look up a TXN reference.');
      return;
    }

    setSaving(true);
    try {
      const pond = await database.get<any>('ponds').find(pondId);
      await database.write(async () => {
        await pond.update((p: any) => {
          p.fingerlingCount = fingerlingCount ? parseInt(fingerlingCount, 10) : null;
          p.fingerlingAvgWeightG = avgWeight ? parseFloat(avgWeight) : null;
          p.fingerlingSource = source;
          p.fingerlingTransactionRef = (lookedUpSale?.transaction_ref ?? txnRef.trim()) || null;
          p.speciesVariant = speciesVariant.trim() || null;
          p.expectedHarvestDate = expectedHarvestDate ? expectedHarvestDate.getTime() : null;
          p.status = 'ACTIVE';
          p.localSyncStatus = 'PENDING';
        });
      });

      onSuccess?.();
      onClose();
      Alert.alert('Stocked!', `${fingerlingCount || 'Fingerlings'} added to your pond. Expected harvest around ${expectedHarvestDate?.toLocaleDateString('en-IN') ?? 'TBD'}.`);
    } catch (e: any) {
      Alert.alert('Error', 'Could not update pond. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTxnRef('');
    setLookedUpSale(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Stock Fingerlings</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

              {/* TXN lookup */}
              {!prefilledListing && (
                <View style={styles.txnSection}>
                  <Text style={styles.txnTitle}>Have a Transaction Reference?</Text>
                  <Text style={styles.txnSubtitle}>Enter the TXN ref from the hatchery to auto-fill details.</Text>
                  <View style={styles.txnRow}>
                    <TextInput
                      style={styles.txnInput}
                      placeholder="TXN-XXXXXXXXX-XXXX"
                      placeholderTextColor={theme.colors.textMuted}
                      value={txnRef}
                      onChangeText={setTxnRef}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.lookupBtn}
                      onPress={() => void handleLookup()}
                      disabled={lookupLoading}
                    >
                      {lookupLoading ? (
                        <ActivityIndicator color={theme.colors.textInverse} size="small" />
                      ) : (
                        <Ionicons name="search" size={18} color={theme.colors.textInverse} />
                      )}
                    </TouchableOpacity>
                  </View>

                  {lookedUpSale && (
                    <View style={styles.lookedUpCard}>
                      <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lookedUpText}>
                          {lookedUpSale.hatchery_name} — {lookedUpSale.species_name}
                        </Text>
                        <Text style={styles.lookedUpMeta}>
                          {lookedUpSale.hatchery_district} · Qty: {lookedUpSale.quantity_pieces ?? `${lookedUpSale.quantity_kg}kg`}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </View>
              )}

              {/* Species */}
              <FormField label="Species" value={speciesName} onChangeText={setSpeciesName} placeholder="e.g. Rohu" icon="fish-outline" theme={theme} />
              <FormField label="Variant / Strain" value={speciesVariant} onChangeText={setSpeciesVariant} placeholder="e.g. Jayanti Rohu" icon="git-branch-outline" theme={theme} />

              {/* Quantity */}
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <FormField label="Count (pieces)" value={fingerlingCount} onChangeText={setFingerlingCount} placeholder="e.g. 5000" icon="layers-outline" keyboardType="numeric" theme={theme} />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField label="Avg Weight (g)" value={avgWeight} onChangeText={setAvgWeight} placeholder="e.g. 5.0" icon="scale-outline" keyboardType="decimal-pad" theme={theme} />
                </View>
              </View>

              {/* Source */}
              <View style={styles.sourceRow}>
                <Text style={styles.sourceLabel}>Source</Text>
                <View style={styles.sourceToggle}>
                  {(['hatchery', 'dealer', 'own'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.sourceChip, source === s && styles.sourceChipActive]}
                      onPress={() => setSource(s)}
                    >
                      <Text style={[styles.sourceChipText, source === s && styles.sourceChipTextActive]}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Harvest days */}
              <View style={styles.harvestSection}>
                <FormField label="Expected Harvest (days from today)" value={harvestDays} onChangeText={setHarvestDays} placeholder="180" icon="calendar-outline" keyboardType="numeric" theme={theme} />
                {expectedHarvestDate && (
                  <View style={styles.harvestPreview}>
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.harvestPreviewText}>
                      Harvest around {expectedHarvestDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={() => void handleStock()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="water-outline" size={20} color={theme.colors.textInverse} />
                    <Text style={styles.saveBtnText}>Stock Pond</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function FormField({ label, icon, theme, ...props }: any) {
  const c = theme.colors;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceLow ?? c.background, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 11, minHeight: 46, gap: 9 }}>
        <Ionicons name={icon} size={17} color={c.textMuted} />
        <TextInput
          style={{ flex: 1, color: c.textPrimary, fontSize: 14, paddingVertical: 9 }}
          placeholderTextColor={c.textMuted}
          selectionColor={c.primary}
          {...props}
        />
      </View>
    </View>
  );
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheetWrapper: { maxHeight: '92%' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      maxHeight: '100%',
    },
    handle: {
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginBottom: 14,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
    txnSection: { marginBottom: 16 },
    txnTitle: { fontSize: 14, fontWeight: '700', color: c.textPrimary, marginBottom: 4 },
    txnSubtitle: { fontSize: 12, color: c.textSecondary, marginBottom: 10 },
    txnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    txnInput: {
      flex: 1,
      backgroundColor: c.surfaceLow ?? c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 46,
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    lookupBtn: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lookedUpCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#dcfce7',
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    lookedUpText: { fontSize: 13, fontWeight: '700', color: '#166534' },
    lookedUpMeta: { fontSize: 12, color: '#166534' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
    dividerText: { fontSize: 11, fontWeight: '700', color: c.textMuted, letterSpacing: 0.5 },
    rowFields: { flexDirection: 'row', gap: 10 },
    sourceRow: { marginBottom: 12 },
    sourceLabel: { fontSize: 11, fontWeight: '700', color: c.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
    sourceToggle: { flexDirection: 'row', gap: 8 },
    sourceChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
    },
    sourceChipActive: { backgroundColor: c.primary },
    sourceChipText: { color: c.primary, fontSize: 13, fontWeight: '700' },
    sourceChipTextActive: { color: c.textInverse },
    harvestSection: { marginBottom: 4 },
    harvestPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.primaryLight ?? '#e0fdf4',
      borderRadius: 10,
      padding: 10,
      marginTop: -4,
      marginBottom: 12,
    },
    harvestPreviewText: { color: c.primary, fontSize: 13, fontWeight: '600' },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 15,
      gap: 10,
      marginTop: 8,
    },
    saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: '800' },
  });
};
