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

const COMMON_SPECIES = [
  'Rohu', 'Catla', 'Mrigal', 'Pangasius', 'Tilapia',
  'Common Carp', 'Grass Carp', 'Silver Carp', 'Bighead Carp', 'Hilsa',
];

export default function AddEditBatchScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { hatcheryId } = route.params ?? {};

  const [speciesName, setSpeciesName] = useState('');
  const [speciesVariant, setSpeciesVariant] = useState('');
  const [maleCount, setMaleCount] = useState('');
  const [femaleCount, setFemaleCount] = useState('');
  const [totalKg, setTotalKg] = useState('');
  const [spawnCount, setSpawnCount] = useState('');
  const [notes, setNotes] = useState('');
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const payload = {
        species_name: speciesName.trim(),
        species_variant: speciesVariant.trim() || undefined,
        broodstock_male_count: maleCount ? parseInt(maleCount, 10) : undefined,
        broodstock_female_count: femaleCount ? parseInt(femaleCount, 10) : undefined,
        broodstock_total_kg: totalKg ? parseFloat(totalKg) : undefined,
        estimated_spawn_count: spawnCount ? parseInt(spawnCount, 10) : undefined,
        notes: notes.trim() || undefined,
      };

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
            <Text style={styles.sectionTitle}>Species</Text>

            <FormField
              label="Species Name *"
              value={speciesName}
              onChangeText={setSpeciesName}
              placeholder="e.g. Rohu, Catla, Pangasius"
              icon="fish-outline"
              theme={theme}
            />

            {/* Quick species chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {COMMON_SPECIES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.speciesChip, speciesName === s && styles.speciesChipActive]}
                  onPress={() => setSpeciesName(s)}
                >
                  <Text style={[styles.speciesChipText, speciesName === s && styles.speciesChipTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FormField
              label="Variant / Strain"
              value={speciesVariant}
              onChangeText={setSpeciesVariant}
              placeholder="e.g. Jayanti Rohu, Amrita Katla"
              icon="git-branch-outline"
              theme={theme}
            />
          </View>

          {/* Broodstock */}
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
