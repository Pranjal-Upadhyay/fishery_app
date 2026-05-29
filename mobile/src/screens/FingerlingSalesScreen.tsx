/**
 * FingerlingSalesScreen
 * Record a fingerling sale. Per-piece or per-kg pricing.
 * Displays the transaction reference on success for the farmer to scan.
 */

import React, { useState } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';

type PricingModel = 'per_piece' | 'per_kg';

export default function FingerlingSalesScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { batchId } = route.params ?? {};

  const [pricingModel, setPricingModel] = useState<PricingModel>('per_piece');

  // Buyer info
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerDistrict, setBuyerDistrict] = useState('');

  // Quantity fields
  const [quantityPieces, setQuantityPieces] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [avgWeightG, setAvgWeightG] = useState('');
  const [pricePerPiece, setPricePerPiece] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');

  const [saving, setSaving] = useState(false);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  // Live total calculation
  const totalAmount = React.useMemo(() => {
    if (pricingModel === 'per_piece') {
      const q = parseInt(quantityPieces, 10);
      const p = parseFloat(pricePerPiece);
      if (!isNaN(q) && !isNaN(p)) return q * p;
    } else {
      const q = parseFloat(quantityKg);
      const p = parseFloat(pricePerKg);
      if (!isNaN(q) && !isNaN(p)) return q * p;
    }
    return null;
  }, [pricingModel, quantityPieces, quantityKg, pricePerPiece, pricePerKg]);

  const handleSave = async () => {
    if (!buyerName.trim()) {
      Alert.alert('Required', 'Please enter the buyer name.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        pricing_model: pricingModel,
        buyer_name: buyerName.trim() || undefined,
        buyer_phone: buyerPhone.trim() || undefined,
        buyer_district: buyerDistrict.trim() || undefined,
        quantity_pieces: quantityPieces ? parseInt(quantityPieces, 10) : undefined,
        quantity_kg: quantityKg ? parseFloat(quantityKg) : undefined,
        avg_weight_g: avgWeightG ? parseFloat(avgWeightG) : undefined,
        price_per_piece: pricePerPiece ? parseFloat(pricePerPiece) : undefined,
        price_per_kg: pricePerKg ? parseFloat(pricePerKg) : undefined,
      };

      const res = await api.post(`/api/v1/hatcheries/batches/${batchId}/sales`, payload);
      const ref = res.data?.data?.transaction_ref;
      setSuccessRef(ref);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Failed to record sale.');
    } finally {
      setSaving(false);
    }
  };

  if (successRef) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Sale Recorded" onBack={() => navigation.goBack()} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.successTitle}>Sale Recorded!</Text>
          <Text style={styles.successSubtitle}>Share this transaction reference with the buyer</Text>

          <View style={styles.refCard}>
            <Text style={styles.refLabel}>Transaction Reference</Text>
            <Text style={styles.refCode}>{successRef}</Text>
            <Text style={styles.refHint}>
              The farmer enters this code in the app to link fingerlings to their pond.
            </Text>
          </View>

          {totalAmount && (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.popToTop?.() ?? navigation.goBack()}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Record Sale" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Pricing model toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Model</Text>
            <View style={styles.toggle}>
              {(['per_piece', 'per_kg'] as PricingModel[]).map(model => (
                <TouchableOpacity
                  key={model}
                  style={[styles.toggleBtn, pricingModel === model && styles.toggleBtnActive]}
                  onPress={() => setPricingModel(model)}
                >
                  <Ionicons
                    name={model === 'per_piece' ? 'fish-outline' : 'scale-outline'}
                    size={18}
                    color={pricingModel === model ? theme.colors.textInverse : theme.colors.primary}
                  />
                  <Text style={[styles.toggleBtnText, pricingModel === model && styles.toggleBtnTextActive]}>
                    {model === 'per_piece' ? 'Per Piece' : 'Per Kg'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Buyer details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Buyer Details</Text>
            <FormField label="Buyer Name *" value={buyerName} onChangeText={setBuyerName} placeholder="Full name" icon="person-outline" theme={theme} />
            <FormField label="Phone Number" value={buyerPhone} onChangeText={setBuyerPhone} placeholder="+91 XXXXX XXXXX" icon="call-outline" keyboardType="phone-pad" theme={theme} />
            <FormField label="District" value={buyerDistrict} onChangeText={setBuyerDistrict} placeholder="Buyer's district" icon="location-outline" theme={theme} />
          </View>

          {/* Quantity & Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {pricingModel === 'per_piece' ? 'Quantity & Price' : 'Weight & Price'}
            </Text>

            {pricingModel === 'per_piece' ? (
              <>
                <FormField label="Quantity (pieces) *" value={quantityPieces} onChangeText={setQuantityPieces} placeholder="e.g. 10000" icon="layers-outline" keyboardType="numeric" theme={theme} />
                <FormField label="Price per piece (₹)" value={pricePerPiece} onChangeText={setPricePerPiece} placeholder="e.g. 2.50" icon="cash-outline" keyboardType="decimal-pad" theme={theme} />
                <FormField label="Average Weight (g)" value={avgWeightG} onChangeText={setAvgWeightG} placeholder="e.g. 5.0" icon="scale-outline" keyboardType="decimal-pad" theme={theme} />
              </>
            ) : (
              <>
                <FormField label="Quantity (kg) *" value={quantityKg} onChangeText={setQuantityKg} placeholder="e.g. 50" icon="scale-outline" keyboardType="decimal-pad" theme={theme} />
                <FormField label="Price per kg (₹)" value={pricePerKg} onChangeText={setPricePerKg} placeholder="e.g. 150" icon="cash-outline" keyboardType="decimal-pad" theme={theme} />
                <FormField label="Average Weight (g)" value={avgWeightG} onChangeText={setAvgWeightG} placeholder="e.g. 10.0" icon="fish-outline" keyboardType="decimal-pad" theme={theme} />
              </>
            )}

            {/* Live total */}
            {totalAmount !== null && (
              <View style={styles.totalPreview}>
                <Text style={styles.totalPreviewLabel}>Estimated Total</Text>
                <Text style={styles.totalPreviewValue}>₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
              </View>
            )}
          </View>

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
                <Ionicons name="receipt-outline" size={20} color={theme.colors.textInverse} />
                <Text style={styles.saveBtnText}>Record Sale & Get TXN Ref</Text>
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
    },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary, marginBottom: 14 },
    toggle: {
      flexDirection: 'row',
      backgroundColor: c.surfaceLow ?? c.background,
      borderRadius: 14,
      padding: 4,
      gap: 4,
    },
    toggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: 'transparent',
    },
    toggleBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    toggleBtnText: { color: c.primary, fontSize: 14, fontWeight: '700' },
    toggleBtnTextActive: { color: c.textInverse },
    totalPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.primaryLight ?? '#e0fdf4',
      borderRadius: 12,
      padding: 14,
      marginTop: 4,
    },
    totalPreviewLabel: { color: c.primary, fontSize: 14, fontWeight: '700' },
    totalPreviewValue: { color: c.primary, fontSize: 22, fontWeight: '900' },
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
    // Success state
    successContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 16,
    },
    successIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: c.primaryLight ?? '#e0fdf4',
      alignItems: 'center',
      justifyContent: 'center',
    },
    successTitle: { fontSize: 26, fontWeight: '900', color: c.textPrimary, textAlign: 'center' },
    successSubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
    refCard: {
      width: '100%',
      backgroundColor: c.surface,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: c.primary,
      padding: 20,
      alignItems: 'center',
      gap: 8,
    },
    refLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    refCode: { fontSize: 24, fontWeight: '900', color: c.primary, letterSpacing: 1.5 },
    refHint: { fontSize: 12, color: c.textSecondary, textAlign: 'center', lineHeight: 18 },
    totalCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },
    totalLabel: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
    totalValue: { color: c.primary, fontSize: 22, fontWeight: '900' },
    doneBtn: {
      width: '100%',
      backgroundColor: c.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
    },
    doneBtnText: { color: c.textInverse, fontSize: 16, fontWeight: '800' },
  });
};
