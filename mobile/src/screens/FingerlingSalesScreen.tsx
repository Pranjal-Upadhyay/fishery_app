/**
 * FingerlingSalesScreen
 * Record a fingerling sale. Per-piece or per-kg pricing.
 * Displays the transaction reference on success for the farmer to scan.
 */

import React, { useState, useMemo } from 'react';
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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import api from '../services/apiService';
import { BIHAR_DISTRICTS } from '../components/LocationCascadePicker';
import { applyUidDashes } from '../utils/uidFormatter';

type PricingModel = 'per_piece' | 'per_kg';

export default function FingerlingSalesScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { batchId } = route.params ?? {};

  const [pricingModel, setPricingModel] = useState<PricingModel>('per_piece');

  // Buyer Verification & Info
  const [buyerUid, setBuyerUid] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone10, setBuyerPhone10] = useState('');
  const [buyerDistrict, setBuyerDistrict] = useState('');
  const [showDistrictModal, setShowDistrictModal] = useState(false);

  // Numeric fields
  const [quantityPieces, setQuantityPieces] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [avgWeightG, setAvgWeightG] = useState('');
  const [totalAmountInput, setTotalAmountInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  // UID Formatting — delegates to pure utility so it is independently testable
  const handleUidChange = (text: string) => {
    setBuyerUid(applyUidDashes(text, buyerUid));
    setIsVerified(false);
  };

  const handleVerifyUid = async () => {
    if (!buyerUid.trim()) {
      Alert.alert('Required', 'Please enter a Buyer UID.');
      return;
    }

    setVerifying(true);
    try {
      const res = await api.get(`/api/v1/hatcheries/lookup-farmer?uid=${buyerUid}`);
      if (res.data?.success && res.data?.data) {
        const farmer = res.data.data;
        setBuyerName(farmer.name || '');
        
        // Extract 10 digits from phone
        let phone = farmer.phone || '';
        if (phone.startsWith('+91')) {
          phone = phone.substring(3);
        } else if (phone.startsWith('91') && phone.length === 12) {
          phone = phone.substring(2);
        }
        setBuyerPhone10(phone);
        setBuyerDistrict(farmer.districtName || farmer.districtCode || '');
        setIsVerified(true);
        Alert.alert('Success', 'Farmer UID verified successfully!');
      } else {
        Alert.alert('Not Found', 'Farmer not found with the given UID.');
      }
    } catch (e: any) {
      Alert.alert('Verification Error', e?.response?.data?.error || 'Failed to verify Farmer UID.');
      setIsVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    const hasUid = Boolean(buyerUid.trim());

    if (!hasUid) {
      if (!buyerName.trim()) {
        Alert.alert('Required', 'Please enter the buyer name or verify a Farmer UID.');
        return;
      }
      if (buyerPhone10.length !== 10) {
        Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
        return;
      }
      if (!buyerDistrict.trim()) {
        Alert.alert('Required', 'Please select or enter the district.');
        return;
      }
    }

    const totalAmount = parseFloat(totalAmountInput);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid total amount.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        pricing_model: pricingModel,
        buyer_uid: buyerUid ? buyerUid.trim() : undefined,
        buyer_name: buyerName.trim() || undefined,
        buyer_phone: buyerPhone10 ? `+91${buyerPhone10}` : undefined,
        buyer_district: buyerDistrict.trim() || undefined,
        total_amount: totalAmount,
      };

      if (pricingModel === 'per_piece') {
        const pcs = parseInt(quantityPieces, 10);
        if (isNaN(pcs) || pcs <= 0) {
          Alert.alert('Required', 'Please enter a valid quantity of pieces.');
          setSaving(false);
          return;
        }
        payload.quantity_pieces = pcs;
      } else {
        const kg = parseFloat(quantityKg);
        const avgW = parseFloat(avgWeightG);
        if (isNaN(kg) || kg <= 0) {
          Alert.alert('Required', 'Please enter a valid quantity in kg.');
          setSaving(false);
          return;
        }
        if (isNaN(avgW) || avgW <= 0) {
          Alert.alert('Required', 'Please enter average weight per piece in grams.');
          setSaving(false);
          return;
        }
        payload.quantity_kg = kg;
        payload.avg_weight_g = avgW;
      }

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
    const totalAmount = parseFloat(totalAmountInput);
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

          {!isNaN(totalAmount) && (
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

          {/* Verification section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verify Grow-Out Farmer</Text>
            <Text style={styles.sectionDesc}>
              Enter the buyer's UID (e.g. FM-PAT-1082) to automatically fetch their registered name, phone number, and district.
            </Text>
            <View style={styles.verifyRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[styles.verifyInput, { borderColor: isVerified ? theme.colors.primary : theme.colors.border }]}
                  placeholder="e.g. FM-PAT-1082"
                  placeholderTextColor={theme.colors.textMuted}
                  value={buyerUid}
                  onChangeText={handleUidChange}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
              <TouchableOpacity
                style={[styles.verifyBtn, isVerified && styles.verifyBtnSuccess]}
                onPress={handleVerifyUid}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name={isVerified ? 'checkmark-done-circle' : 'search-outline'} size={18} color="#fff" />
                    <Text style={styles.verifyBtnText}>{isVerified ? 'Verified' : 'Verify'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

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
            <FormField
              label="Buyer Name *"
              value={buyerName}
              onChangeText={setBuyerName}
              placeholder="Full name"
              icon="person-outline"
              theme={theme}
              editable={!isVerified}
            />

            {/* Custom Phone Input with static prefix */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Phone Number *
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceLow ?? theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, paddingHorizontal: 12, minHeight: 48 }}>
                <Ionicons name="call-outline" size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                
                {/* Non-deletable +91 prefix container */}
                <View style={{ backgroundColor: theme.colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 }}>+91</Text>
                </View>

                <TextInput
                  style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 15, paddingVertical: 10 }}
                  placeholder="XXXXXXXXXX"
                  placeholderTextColor={theme.colors.textMuted}
                  value={buyerPhone10}
                  onChangeText={setBuyerPhone10}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!isVerified}
                />
              </View>
            </View>

            {/* District dropdown field */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                District *
              </Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceLow ?? theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, paddingHorizontal: 12, minHeight: 48, justifyContent: 'space-between' }}
                onPress={() => !isVerified && setShowDistrictModal(true)}
                disabled={isVerified}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="location-outline" size={18} color={theme.colors.textMuted} />
                  <Text style={{ color: buyerDistrict ? theme.colors.textPrimary : theme.colors.textMuted, fontSize: 15 }}>
                    {buyerDistrict || 'Select District'}
                  </Text>
                </View>
                {!isVerified && <Ionicons name="chevron-down-outline" size={18} color={theme.colors.textMuted} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Quantity & Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {pricingModel === 'per_piece' ? 'Quantity & Price' : 'Weight & Price'}
            </Text>

            {pricingModel === 'per_piece' ? (
              <>
                <FormField label="Quantity (pieces) *" value={quantityPieces} onChangeText={setQuantityPieces} placeholder="e.g. 10000" icon="layers-outline" keyboardType="numeric" theme={theme} />
                <FormField label="Total Amount (₹) *" value={totalAmountInput} onChangeText={setTotalAmountInput} placeholder="e.g. 25000" icon="cash-outline" keyboardType="decimal-pad" theme={theme} />
              </>
            ) : (
              <>
                <FormField label="Quantity (kg) *" value={quantityKg} onChangeText={setQuantityKg} placeholder="e.g. 50" icon="scale-outline" keyboardType="decimal-pad" theme={theme} />
                <FormField label="Average Weight (g) *" value={avgWeightG} onChangeText={setAvgWeightG} placeholder="e.g. 10.0" icon="fish-outline" keyboardType="decimal-pad" theme={theme} />
                <FormField label="Total Amount (₹) *" value={totalAmountInput} onChangeText={setTotalAmountInput} placeholder="e.g. 25000" icon="cash-outline" keyboardType="decimal-pad" theme={theme} />
              </>
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

      {/* District Selection Modal */}
      <Modal
        visible={showDistrictModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDistrictModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bihar District</Text>
              <TouchableOpacity onPress={() => setShowDistrictModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={BIHAR_DISTRICTS}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setBuyerDistrict(item.name);
                    setShowDistrictModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {buyerDistrict === item.name && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FormField({ label, icon, theme, editable = true, ...props }: any) {
  const c = theme.colors;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: editable ? (c.surfaceLow ?? c.background) : (c.surfaceAlt ?? c.border),
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        paddingHorizontal: 12,
        minHeight: 48,
        gap: 10,
        opacity: editable ? 1 : 0.8
      }}>
        <Ionicons name={icon} size={18} color={c.textMuted} />
        <TextInput
          style={{ flex: 1, color: c.textPrimary, fontSize: 15, paddingVertical: 10 }}
          placeholderTextColor={c.textMuted}
          selectionColor={c.primary}
          editable={editable}
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
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary, marginBottom: 6 },
    sectionDesc: { fontSize: 12, color: c.textSecondary, marginBottom: 14, lineHeight: 18 },
    verifyRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    verifyInput: {
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      color: c.textPrimary,
      fontSize: 15,
      backgroundColor: c.surfaceLow ?? c.background,
    },
    verifyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingHorizontal: 16,
      height: 48,
      gap: 6,
    },
    verifyBtnSuccess: {
      backgroundColor: '#10b981', // green success
    },
    verifyBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
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
    
    // Modal styling for district dropdown picker
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: c.surface,
      borderRadius: 18,
      maxHeight: '70%',
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.textPrimary,
    },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    modalItemText: {
      fontSize: 15,
      color: c.textPrimary,
    },
    modalSeparator: {
      height: 1,
      backgroundColor: c.border,
    },
  });
};
