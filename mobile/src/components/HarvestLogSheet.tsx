/**
 * HarvestLogSheet
 * Bottom sheet for a farmer to log the actual harvest of a pond.
 * Saves harvest_weight_kg + actual_harvest_date to WatermelonDB.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { database } from '../database';

interface Props {
  visible: boolean;
  onClose: () => void;
  pondId: string;
  pondName: string;
  fingerlingCount?: number;
  stockingDate?: number;
  speciesName?: string;
  onSuccess?: (harvestData: { weightKg: number; date: Date }) => void;
}

export default function HarvestLogSheet({
  visible,
  onClose,
  pondId,
  pondName,
  fingerlingCount,
  stockingDate,
  speciesName,
  onSuccess,
}: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [harvestWeightKg, setHarvestWeightKg] = useState('');
  const [harvestDateStr, setHarvestDateStr] = useState(
    new Date().toISOString().split('T')[0] // YYYY-MM-DD
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const culturedDays = stockingDate
    ? Math.round((Date.now() - stockingDate) / (1000 * 60 * 60 * 24))
    : null;

  // FCR estimate
  const fcrEstimate = React.useMemo(() => {
    // Simple placeholder — actual FCR would need feed_given_kg from WQ logs
    return null;
  }, []);

  const handleSave = async () => {
    if (!harvestWeightKg.trim() || isNaN(parseFloat(harvestWeightKg))) {
      Alert.alert('Required', 'Please enter the total harvest weight in kg.');
      return;
    }

    const harvestDate = new Date(harvestDateStr);
    if (isNaN(harvestDate.getTime())) {
      Alert.alert('Invalid Date', 'Please enter a valid date (YYYY-MM-DD).');
      return;
    }

    setSaving(true);
    try {
      const pond = await database.get<any>('ponds').find(pondId);
      await database.write(async () => {
        await pond.update((p: any) => {
          p.harvestWeightKg = parseFloat(harvestWeightKg);
          p.actualHarvestDate = harvestDate.getTime();
          p.status = 'IDLE';
          p.localSyncStatus = 'PENDING';
        });
      });

      const weightKg = parseFloat(harvestWeightKg);
      onSuccess?.({ weightKg, date: harvestDate });
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save harvest. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Mark Harvested</Text>
                <Text style={styles.sheetSubtitle}>{pondName}</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

              {/* Pond info summary */}
              {(speciesName || fingerlingCount || culturedDays) && (
                <View style={styles.summaryCard}>
                  {speciesName && (
                    <View style={styles.summaryRow}>
                      <Ionicons name="fish-outline" size={15} color={theme.colors.primary} />
                      <Text style={styles.summaryText}>{speciesName}</Text>
                    </View>
                  )}
                  {fingerlingCount && (
                    <View style={styles.summaryRow}>
                      <Ionicons name="layers-outline" size={15} color={theme.colors.primary} />
                      <Text style={styles.summaryText}>{fingerlingCount.toLocaleString('en-IN')} stocked</Text>
                    </View>
                  )}
                  {culturedDays && (
                    <View style={styles.summaryRow}>
                      <Ionicons name="time-outline" size={15} color={theme.colors.primary} />
                      <Text style={styles.summaryText}>{culturedDays} days in culture</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Harvest weight */}
              <FormField
                label="Total Harvest Weight (kg) *"
                value={harvestWeightKg}
                onChangeText={setHarvestWeightKg}
                placeholder="e.g. 1250.5"
                icon="scale-outline"
                keyboardType="decimal-pad"
                theme={theme}
              />

              {/* Survival + yield estimate */}
              {harvestWeightKg && fingerlingCount ? (
                <View style={styles.yieldCard}>
                  <Text style={styles.yieldTitle}>Estimated Yield</Text>
                  <View style={styles.yieldRow}>
                    <YieldStat
                      label="Avg Fish Weight"
                      value={`${((parseFloat(harvestWeightKg) * 1000) / fingerlingCount).toFixed(0)}g`}
                      theme={theme}
                    />
                    <YieldStat
                      label="Yield per hectare"
                      value="—"
                      theme={theme}
                    />
                  </View>
                </View>
              ) : null}

              {/* Harvest date */}
              <FormField
                label="Harvest Date"
                value={harvestDateStr}
                onChangeText={setHarvestDateStr}
                placeholder="YYYY-MM-DD"
                icon="calendar-outline"
                theme={theme}
              />

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={() => void handleSave()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.textInverse} />
                    <Text style={styles.saveBtnText}>Confirm Harvest</Text>
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
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceLow ?? c.background, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 12, minHeight: 48, gap: 10 }}>
        <Ionicons name={icon} size={18} color={c.textMuted} />
        <TextInput
          style={{ flex: 1, color: c.textPrimary, fontSize: 15, paddingVertical: 10 }}
          placeholderTextColor={c.textMuted}
          selectionColor={c.primary}
          {...props}
        />
      </View>
    </View>
  );
}

function YieldStat({ label, value, theme }: any) {
  const c = theme.colors;
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheetWrapper: { maxHeight: '85%' },
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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
    sheetSubtitle: { fontSize: 14, color: c.textSecondary, marginTop: 2 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
    summaryCard: {
      backgroundColor: c.primaryLight ?? '#e0fdf4',
      borderRadius: 14,
      padding: 14,
      gap: 8,
      marginBottom: 16,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    summaryText: { fontSize: 14, color: c.textPrimary, fontWeight: '600' },
    yieldCard: {
      backgroundColor: c.surfaceLow ?? c.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 14,
    },
    yieldTitle: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    yieldRow: { flexDirection: 'row' },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 15,
      gap: 10,
      marginTop: 4,
    },
    saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: '800' },
  });
};
