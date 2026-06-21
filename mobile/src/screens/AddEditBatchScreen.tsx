/**
 * AddEditBatchScreen
 * Create or edit a hatchery batch.
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';

const ALLOWED_BATCH_SPECIES = [
  { label: 'Jayanti Rohu', name: 'Rohu', variant: 'Jayanti Rohu' },
  { label: 'Amrit Catla', name: 'Catla', variant: 'Amrit Catla' },
  { label: 'Amur Carp', name: 'Common Carp', variant: 'Amur Carp' },
  { label: 'Pangasius', name: 'Pangasius', variant: '' }
];

export default function AddEditBatchScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { hatcheryId } = route.params ?? {};

  const [speciesName, setSpeciesName] = useState('');
  const [speciesVariant, setSpeciesVariant] = useState('');
  const [selectedSpeciesLabel, setSelectedSpeciesLabel] = useState('');
  const [startStage, setStartStage] = useState<'spawn' | 'broodstock'>('spawn');
  const [maleCount, setMaleCount] = useState('');
  const [femaleCount, setFemaleCount] = useState('');
  const [totalKg, setTotalKg] = useState('');
  const [spawnCount, setSpawnCount] = useState('');
  const [notes, setNotes] = useState('');
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelectSpecies = (label: string) => {
    setSelectedSpeciesLabel(label);
    const matched = ALLOWED_BATCH_SPECIES.find(s => s.label === label);
    if (matched) {
      setSpeciesName(matched.name);
      setSpeciesVariant(matched.variant);
    }
  };

  const handleSave = async () => {
    if (!speciesName.trim()) {
      Alert.alert('Required', 'Please enter the species name.');
      return;
    }
    if (!hatcheryId) {
      Alert.alert('Error', 'Hatchery ID is missing.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        species_name: speciesName.trim(),
        species_variant: speciesVariant.trim() || undefined,
        current_stage: startStage === 'spawn' ? 'spawning' : 'broodstock',
        notes: notes.trim() || undefined,
      };

      if (startStage === 'spawn') {
        payload.estimated_spawn_count = spawnCount ? parseInt(spawnCount, 10) : undefined;
      } else {
        payload.broodstock_male_count = maleCount ? parseInt(maleCount, 10) : undefined;
        payload.broodstock_female_count = femaleCount ? parseInt(femaleCount, 10) : undefined;
        payload.broodstock_total_kg = totalKg ? parseFloat(totalKg) : undefined;
        payload.estimated_spawn_count = spawnCount ? parseInt(spawnCount, 10) : undefined;
      }

      await api.post(`/api/v1/hatcheries/${hatcheryId}/batches`, payload);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Failed to save batch.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="New Batch" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Species */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Species *</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 }}>
              {ALLOWED_BATCH_SPECIES.map(s => {
                const selected = selectedSpeciesLabel === s.label;
                return (
                  <TouchableOpacity
                    key={s.label}
                    style={[
                      styles.speciesChip,
                      selected && styles.speciesChipActive,
                      { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 }
                    ]}
                    onPress={() => handleSelectSpecies(s.label)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.speciesChipText,
                      selected && styles.speciesChipTextActive,
                      { fontSize: 14 }
                    ]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Starting Stage */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Starting Stage *</Text>
            
            <View style={{
              flexDirection: 'row',
              backgroundColor: theme.colors.surfaceLow ?? '#F2F2F7',
              borderRadius: 12,
              padding: 4,
              marginVertical: 4,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: startStage === 'spawn' ? theme.colors.surface : 'transparent',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: startStage === 'spawn' ? 1 : 0 },
                  shadowOpacity: startStage === 'spawn' ? 0.12 : 0,
                  shadowRadius: startStage === 'spawn' ? 1.5 : 0,
                  elevation: startStage === 'spawn' ? 2 : 0,
                }}
                onPress={() => setStartStage('spawn')}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: '700',
                  textAlign: 'center',
                  color: startStage === 'spawn' ? theme.colors.primary : theme.colors.textSecondary
                }}>
                  Starting from Spawn
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: startStage === 'broodstock' ? theme.colors.surface : 'transparent',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: startStage === 'broodstock' ? 1 : 0 },
                  shadowOpacity: startStage === 'broodstock' ? 0.12 : 0,
                  shadowRadius: startStage === 'broodstock' ? 1.5 : 0,
                  elevation: startStage === 'broodstock' ? 2 : 0,
                }}
                onPress={() => setStartStage('broodstock')}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: '700',
                  textAlign: 'center',
                  color: startStage === 'broodstock' ? theme.colors.primary : theme.colors.textSecondary
                }}>
                  Starting from Broodstock
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Details based on Starting Stage */}
          {startStage === 'broodstock' ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Broodstock Details</Text>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Male Count"
                    value={maleCount}
                    onChangeText={setMaleCount}
                    placeholder="0"
                    icon="male-outline"
                    keyboardType="numeric"
                    theme={theme}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Female Count"
                    value={femaleCount}
                    onChangeText={setFemaleCount}
                    placeholder="0"
                    icon="female-outline"
                    keyboardType="numeric"
                    theme={theme}
                  />
                </View>
              </View>

              <FormField
                label="Total Weight (kg)"
                value={totalKg}
                onChangeText={setTotalKg}
                placeholder="e.g. 120"
                icon="scale-outline"
                keyboardType="decimal-pad"
                theme={theme}
              />

              <FormField
                label="Estimated Spawn Count"
                value={spawnCount}
                onChangeText={setSpawnCount}
                placeholder="e.g. 5000000"
                icon="infinite-outline"
                keyboardType="numeric"
                theme={theme}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spawn Details</Text>

              <FormField
                label="Actual Spawn Count"
                value={spawnCount}
                onChangeText={setSpawnCount}
                placeholder="e.g. 5000000"
                icon="infinite-outline"
                keyboardType="numeric"
                theme={theme}
              />
            </View>
          )}

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={[styles.inputShell, { minHeight: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
              <TextInput
                style={[styles.textInput, { flex: 1, textAlignVertical: 'top' }]}
                placeholder="Observations, feed type, water source..."
                placeholderTextColor={theme.colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Save button */}
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
                <Text style={styles.saveBtnText}>Create Batch</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormField({ label, icon, theme, ...props }: any) {
  const c = theme.colors;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surfaceLow ?? c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        paddingHorizontal: 12,
        minHeight: 48,
        gap: 10,
      }}>
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

const getStyles = (theme: any) => {
  const c = theme.colors;
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    scroll: { padding: 16, gap: 4 },
    section: {
      backgroundColor: c.surface,
      borderRadius: theme.borderRadius?.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 16,
      gap: 4,
    },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary, marginBottom: 12 },
    row: { flexDirection: 'row', gap: 10 },
    chipsScroll: { marginBottom: 12, marginHorizontal: -4 },
    speciesChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: c.primaryLight ?? c.surface,
      marginHorizontal: 4,
    },
    speciesChipActive: { backgroundColor: c.primary },
    speciesChipText: { color: c.primary, fontSize: 13, fontWeight: '700' },
    speciesChipTextActive: { color: c.textInverse },
    inputShell: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceLow ?? c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      minHeight: 48,
      gap: 10,
    },
    textInput: { color: c.textPrimary, fontSize: 15, paddingVertical: 10 },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
      borderRadius: 18,
      paddingVertical: 16,
      gap: 10,
      marginTop: 4,
    },
    saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: '800' },
  });
};
