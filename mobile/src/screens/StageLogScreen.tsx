/**
 * StageLogScreen
 * Records a hatchery stage observation: counts, water quality, and notes.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';

const STAGE_LABELS: Record<string, string> = {
  broodstock: 'Broodstock',
  spawning: 'Spawning',
  hatching: 'Hatching',
  nursery: 'Nursery',
  rearing: 'Rearing',
  fingerling_ready: 'Fingerling Ready',
  sold: 'Sold',
};

export default function StageLogScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { batchId, currentStage = 'broodstock' } = route.params ?? {};

  const [countEntry, setCountEntry] = useState('');
  const [countExit, setCountExit] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [ph, setPh] = useState('');
  const [doMgl, setDoMgl] = useState('');
  const [ammonia, setAmmonia] = useState('');
  const [feedKg, setFeedKg] = useState('');
  const [fingerlingCount, setFingerlingCount] = useState('');
  const [avgWeight, setAvgWeight] = useState('');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);

  const survivalPreview = (() => {
    const entry = parseFloat(countEntry);
    const exit = parseFloat(countExit);
    if (entry > 0 && exit >= 0) return ((exit / entry) * 100).toFixed(1);
    return null;
  })();

  const handleSave = async () => {
    if (!batchId) {
      Alert.alert('Missing Batch', 'Could not identify this hatchery batch.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/api/v1/hatcheries/batches/${batchId}/logs`, {
        stage: currentStage,
        count_at_entry: countEntry ? parseInt(countEntry, 10) : undefined,
        count_at_exit: countExit ? parseInt(countExit, 10) : undefined,
        water_temp: waterTemp ? parseFloat(waterTemp) : undefined,
        ph: ph ? parseFloat(ph) : undefined,
        do_mgl: doMgl ? parseFloat(doMgl) : undefined,
        ammonia_ppm: ammonia ? parseFloat(ammonia) : undefined,
        feed_given_kg: feedKg ? parseFloat(feedKg) : undefined,
        estimated_fingerling_count: fingerlingCount ? parseInt(fingerlingCount, 10) : undefined,
        avg_fingerling_weight_g: avgWeight ? parseFloat(avgWeight) : undefined,
        observations: observations.trim() || undefined,
      });
      Alert.alert('Log Saved', 'The hatchery observation was added.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error ?? 'Could not save this log.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title="Stage Log"
        subtitle={STAGE_LABELS[currentStage] ?? currentStage}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Counts</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FormField label="Entry Count" value={countEntry} onChangeText={setCountEntry} icon="log-in-outline" keyboardType="numeric" theme={theme} />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Exit Count" value={countExit} onChangeText={setCountExit} icon="log-out-outline" keyboardType="numeric" theme={theme} />
              </View>
            </View>
            {survivalPreview ? (
              <View style={styles.preview}>
                <Ionicons name="analytics-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.previewText}>Survival preview: {survivalPreview}%</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Water Quality</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FormField label="Temp C" value={waterTemp} onChangeText={setWaterTemp} icon="thermometer-outline" keyboardType="decimal-pad" theme={theme} />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="pH" value={ph} onChangeText={setPh} icon="water-outline" keyboardType="decimal-pad" theme={theme} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FormField label="DO mg/L" value={doMgl} onChangeText={setDoMgl} icon="fitness-outline" keyboardType="decimal-pad" theme={theme} />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Ammonia ppm" value={ammonia} onChangeText={setAmmonia} icon="warning-outline" keyboardType="decimal-pad" theme={theme} />
              </View>
            </View>
            <FormField label="Feed Given kg" value={feedKg} onChangeText={setFeedKg} icon="restaurant-outline" keyboardType="decimal-pad" theme={theme} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fingerling Readiness</Text>
            <FormField label="Estimated Fingerlings" value={fingerlingCount} onChangeText={setFingerlingCount} icon="fish-outline" keyboardType="numeric" theme={theme} />
            <FormField label="Average Weight g" value={avgWeight} onChangeText={setAvgWeight} icon="scale-outline" keyboardType="decimal-pad" theme={theme} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observations</Text>
            <View style={[styles.inputShell, { minHeight: 106, alignItems: 'flex-start' }]}>
              <TextInput
                style={[styles.input, { textAlignVertical: 'top' }]}
                value={observations}
                onChangeText={setObservations}
                placeholder="Sampling notes, behavior, water condition, buyer readiness..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={() => void handleSave()} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color={theme.colors.textInverse} />
                <Text style={styles.saveText}>Save Log</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormField({ label, icon, theme, ...props }: any) {
  const styles = getStyles(theme);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        <Ionicons name={icon} size={17} color={theme.colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
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
    scroll: { padding: 16, paddingBottom: 40 },
    section: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 14,
    },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary, marginBottom: 12 },
    row: { flexDirection: 'row', gap: 10 },
    label: { fontSize: 11, fontWeight: '700', color: c.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
    inputShell: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceLow ?? c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 11,
      minHeight: 46,
      gap: 9,
    },
    input: { flex: 1, color: c.textPrimary, fontSize: 14, paddingVertical: 9 },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.primaryLight ?? c.background,
      borderRadius: 12,
      padding: 10,
    },
    previewText: { color: c.primary, fontSize: 13, fontWeight: '700' },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 15,
      gap: 10,
    },
    saveText: { color: c.textInverse, fontSize: 16, fontWeight: '800' },
  });
};
