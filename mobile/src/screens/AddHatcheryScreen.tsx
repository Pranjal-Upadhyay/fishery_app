/**
 * AddHatcheryScreen
 * Create or edit the operator's hatchery profile.
 * Captures fields required for the fingerling marketplace:
 *   - Government registration UID (trust anchor)
 *   - Contact phone, email, UPI ID (used by farmers to coordinate payment)
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
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import LocationCascadePicker, { LocationSelection } from '../components/LocationCascadePicker';
import * as Location from 'expo-location';
import { loadProfile } from '../services/profileService';
import { hatcheryProfileService } from '../services/apiService';

export default function AddHatcheryScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Core
  const [name, setName] = useState('');
  const [hatcheryStateCode, setHatcheryStateCode] = useState('BR');
  const [hatcheryLocation, setHatcheryLocation] = useState<Partial<LocationSelection>>({});
  const [capacityKg, setCapacityKg] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Marketplace-required
  const [hatcheryUid, setHatcheryUid] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // Try to load existing hatchery profile
        const existing = await hatcheryProfileService.getMe();
        if (existing) {
          setIsEditing(true);
          setName(existing.name ?? '');
          if (existing.district) {
          setHatcheryLocation({
              districtName: existing.district,
              districtCode: existing.district.toLowerCase().replace(/\s+/g, '-'),
              blockName: existing.block ?? undefined,
              // Use just the block name slug — matches BIHAR_PANCHAYATS keys and backend suffix-LIKE
              blockCode: existing.block?.toLowerCase().replace(/\s+/g, '-'),
              panchayatName: existing.panchayat ?? undefined,
              panchayatCode: existing.panchayat?.toLowerCase().replace(/\s+/g, '-'),
            });
          }
          if (existing.capacity_kg != null) setCapacityKg(String(existing.capacity_kg));
          if (existing.hatchery_uid) setHatcheryUid(existing.hatchery_uid);
          if (existing.contact_number) setContactNumber(existing.contact_number);
          if (existing.email) setEmail(existing.email);
          if (existing.upi_id) setUpiId(existing.upi_id);
          if (existing.latitude != null) setLat(String(existing.latitude));
          if (existing.longitude != null) setLng(String(existing.longitude));
        } else {
          // First-time create — prefill from user profile
          const profile = await loadProfile();
          if (profile.stateCode) setHatcheryStateCode(profile.stateCode);
          if (profile.panchayatCode) {
            setHatcheryLocation({
              districtCode: profile.districtCode,
              districtName: profile.districtName,
              blockCode: profile.blockCode,
              blockName: profile.blockName,
              panchayatCode: profile.panchayatCode,
              panchayatName: profile.panchayatName,
            });
          }
        }
      } catch {
        // ignore — user can fill manually
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      const permResult = await Location.requestForegroundPermissionsAsync();
      if (permResult.status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permissions to automatically fetch your coordinates.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(loc.coords.latitude.toFixed(6));
      setLng(loc.coords.longitude.toFixed(6));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not fetch location coordinates.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Please enter the hatchery name.';
    if (!hatcheryUid.trim()) return 'Government registration UID is required for the marketplace.';
    if (!contactNumber.trim()) return 'A contact phone number is required.';
    if (!/^[6-9]\d{9}$/.test(contactNumber.trim())) return 'Contact number must be a valid 10-digit Indian mobile (starting with 6/7/8/9).';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address, or leave it blank.';
    if (lat && isNaN(Number(lat))) return 'Latitude must be a valid number.';
    if (lng && isNaN(Number(lng))) return 'Longitude must be a valid number.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { Alert.alert('Required', err); return; }

    setSaving(true);
    try {
      await hatcheryProfileService.upsertMe({
        name: name.trim(),
        district: hatcheryLocation.districtName || null,
        block: hatcheryLocation.blockName || null,
        panchayat: hatcheryLocation.panchayatName || null,
        capacity_kg: capacityKg ? parseFloat(capacityKg) : null,
        hatchery_uid: hatcheryUid.trim(),
        contact_number: contactNumber.trim(),
        email: email.trim() || null,
        upi_id: upiId.trim() || null,
        latitude: lat ? parseFloat(lat) : null,
        longitude: lng ? parseFloat(lng) : null,
      });

      Alert.alert(
        isEditing ? 'Profile Updated' : 'Hatchery Created',
        isEditing ? 'Your hatchery profile is up to date.' : 'You can now create listings on the marketplace.',
        // HatcheryDashboard lives inside the HatcheryMain tab navigator, so we
        // can't replace directly to it from this stack screen. Replace to the
        // parent tab navigator and let it land on its default first tab
        // (HatcheryDashboard).
        [{ text: 'OK', onPress: () => isEditing ? navigation.goBack() : navigation.replace('HatcheryMain') }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Failed to save hatchery profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Hatchery Profile" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={isEditing ? 'Edit Hatchery Profile' : 'Create Hatchery'} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hatchery Details</Text>

            <FormField label="Hatchery Name *" value={name} onChangeText={setName} placeholder="e.g. Sri Gopal Fish Hatchery" icon="business-outline" theme={theme} />

            <Text style={styles.subhead}>Location</Text>
            <LocationCascadePicker
              stateCode={hatcheryStateCode}
              value={hatcheryLocation}
              onChange={setHatcheryLocation}
            />

            <FormField label="Capacity (kg/year)" value={capacityKg} onChangeText={setCapacityKg} placeholder="e.g. 5000" icon="scale-outline" keyboardType="decimal-pad" theme={theme} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 }}>
              <Text style={styles.subhead}>Geocoordinates</Text>
              <TouchableOpacity
                onPress={handleGetLocation}
                disabled={isGettingLocation}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <>
                    <Ionicons name="location-outline" size={14} color={theme.colors.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary }}>
                      Use My Location
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <FormField label="Latitude" value={lat} onChangeText={setLat} placeholder="e.g. 25.61" icon="navigate-outline" keyboardType="decimal-pad" theme={theme} />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Longitude" value={lng} onChangeText={setLng} placeholder="e.g. 85.14" icon="navigate-outline" keyboardType="decimal-pad" theme={theme} />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marketplace Details</Text>
            <Text style={styles.helperText}>
              These details are required for posting listings. The Government UID is displayed prominently to farmers and serves as the trust anchor for your hatchery.
            </Text>

            <FormField
              label="Government Registration UID *"
              value={hatcheryUid}
              onChangeText={setHatcheryUid}
              placeholder="e.g. BR-HAT-2024-00123"
              icon="shield-checkmark-outline"
              theme={theme}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <FormField
              label="Contact Phone *"
              value={contactNumber}
              onChangeText={setContactNumber}
              placeholder="10-digit mobile number"
              icon="call-outline"
              theme={theme}
              keyboardType="phone-pad"
            />
            <FormField
              label="Email (optional)"
              value={email}
              onChangeText={setEmail}
              placeholder="hatchery@example.com"
              icon="mail-outline"
              theme={theme}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FormField
              label="UPI ID (optional)"
              value={upiId}
              onChangeText={setUpiId}
              placeholder="e.g. hatchery@upi"
              icon="card-outline"
              theme={theme}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <>
                <Ionicons name={isEditing ? 'save-outline' : 'add-circle-outline'} size={20} color={theme.colors.textInverse} />
                <Text style={styles.saveBtnText}>{isEditing ? 'Save Profile' : 'Create Hatchery'}</Text>
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
    scroll: { padding: 16 },
    section: {
      backgroundColor: c.surface,
      borderRadius: theme.borderRadius?.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary, marginBottom: 14 },
    subhead: { fontSize: 11, fontWeight: '700', color: c.textSecondary, marginTop: 4, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    helperText: { fontSize: 12, color: c.textMuted, marginBottom: 12, lineHeight: 17 },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
      borderRadius: 18,
      paddingVertical: 16,
      gap: 10,
    },
    saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: '800' },
  });
};
