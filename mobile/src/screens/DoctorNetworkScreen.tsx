import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { diseaseService, doctorNetworkService } from '../services/apiService';
import { loadProfile, isProfileLocationComplete, type UserProfile } from '../services/profileService';
import database, { Pond } from '../database';
import { Q } from '@nozbe/watermelondb';

const symptomHints = ['fish gasping', 'white spots', 'red lesions', 'sudden deaths'];

function formatDoctorName(name?: string | null) {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'Doctor';
  return /^dr\.?\s+/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}

export default function DoctorNetworkScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;
  const styles = getStyles(theme);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [routingDoctor, setRoutingDoctor] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assignedDoctor, setAssignedDoctor] = useState<any | null>(null);
  const [noDocMsg, setNoDocMsg] = useState('');

  const [ponds, setPonds] = useState<Pond[]>([]);
  const [selectedPondId, setSelectedPondId] = useState<string>('');
  const [pondPickerVisible, setPondPickerVisible] = useState(false);

  const [symptoms, setSymptoms] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [photoPreviewUri, setPhotoPreviewUri] = useState('');
  const [photoUploadValue, setPhotoUploadValue] = useState('');
  const [sugg, setSugg] = useState<any>(null);
  const [symptomsInputFocused, setSymptomsInputFocused] = useState(false);
  const [issueInputFocused, setIssueInputFocused] = useState(false);

  // Per-booking GPS capture: a number bump that forces the selectedPond
  // reactive view to refresh after the pond's local lat/lng changes.
  const [locationBumpKey, setLocationBumpKey] = useState(0);
  const [capturingLocation, setCapturingLocation] = useState(false);

  useEffect(() => {
    void initialize();
  }, []);

  const initialize = async () => {
    setLoading(true);
    try {
      const p = await loadProfile();
      setProfile(p);

      if (!isProfileLocationComplete(p)) {
        Alert.alert(
          'Location Required',
          'Please complete your district, block, and panchayat details in your profile before booking a doctor.',
          [
            { text: 'Go to Profile', onPress: () => navigation.navigate('PersonalInfo') },
            { text: 'Later', style: 'cancel' },
          ]
        );
        // Fix #15: must reach finally to stop the spinner — don't return early here
        return;
      }

      const pondRecords = await database.collections
        .get<Pond>('ponds')
        .query(Q.where('status', 'ACTIVE'))
        .fetch();
      setPonds(pondRecords);
      if (pondRecords.length === 1) setSelectedPondId(pondRecords[0].id);

      await resolveDoctor(p, pondRecords.length === 1 ? pondRecords[0] : null);
    } catch {
      Alert.alert('Error', 'Could not load doctor booking right now. Please try again.');
    } finally {
      // Fix #15: always stop the spinner, even when returning early above
      setLoading(false);
    }
  };

  const resolveDoctor = useCallback(async (p: UserProfile, pond: Pond | null) => {
    const panchayatCode =
      (pond?.panchayatCode) ||
      p.panchayatCode;

    if (!panchayatCode) {
      setAssignedDoctor(null);
      setNoDocMsg('No panchayat set. Please update your profile.');
      return;
    }

    setRoutingDoctor(true);
    try {
      const res = await doctorNetworkService.routeDoctor(panchayatCode);
      if (res.success && res.data) {
        setAssignedDoctor(res.data);
        setNoDocMsg('');
      } else {
        setAssignedDoctor(null);
        setNoDocMsg(res.message || 'No doctor assigned to your panchayat yet. Please contact your block fisheries officer.');
      }
    } catch {
      setAssignedDoctor(null);
      setNoDocMsg('Could not reach server. Please check your connection.');
    } finally {
      setRoutingDoctor(false);
    }
  }, []);

  const handlePondSelect = useCallback(async (pond: Pond) => {
    setSelectedPondId(pond.id);
    setPondPickerVisible(false);
    if (profile) {
      await resolveDoctor(profile, pond);
    }
  }, [profile, resolveDoctor]);

  const selectedPond = ponds.find((p) => p.id === selectedPondId) || null;
  const doctorDisplayName = formatDoctorName(assignedDoctor?.name);

  const selectedSymptoms = useMemo(
    () => symptoms.split(',').map((s) => s.trim()).filter(Boolean),
    [symptoms]
  );

  const runSuggestion = async () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert('Enter symptoms', 'Add at least one symptom to run disease suggestion.');
      return;
    }
    try {
      const res = await diseaseService.suggest({ symptoms: selectedSymptoms });
      if (res.success) {
        setSugg(res.data);
      } else {
        Alert.alert('Suggestion unavailable', res.error || 'Could not analyze symptoms right now.');
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Could not analyze symptoms right now.';
      Alert.alert('Suggestion unavailable', message);
    }
  };

  /**
   * Capture current GPS coordinates and save them to the selected pond.
   *
   * The doctor view reads coordinates via JOIN on the ponds table, so updating
   * the pond's lat/lng (and triggering the regular sync) is enough — no
   * appointment-level location columns needed.
   */
  const captureCurrentLocation = async () => {
    if (!selectedPondId) {
      Alert.alert(
        'Select a pond first',
        'Please choose which pond this appointment is for, then tag its GPS location.'
      );
      return;
    }
    setCapturingLocation(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission needed',
          'Location access is required to tag this appointment with your pond’s GPS coordinates.'
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const pond = await database.collections.get<Pond>('ponds').find(selectedPondId);
      await database.write(async () => {
        await pond.update((p) => {
          p.latitude = lat;
          p.longitude = lng;
          p.localSyncStatus = 'PENDING';
        });
      });

      // Refresh in-memory pond list so the UI re-reads the new lat/lng.
      setPonds((prev) => prev.map((p) => (p.id === selectedPondId ? pond : p)));
      setLocationBumpKey((k) => k + 1);

      Alert.alert(
        'Location saved',
        `Pond location tagged at ${lat.toFixed(5)}, ${lng.toFixed(5)}. The doctor will see this on the appointment.`
      );
    } catch (error: any) {
      Alert.alert(
        'Location failed',
        error?.message || 'Could not get GPS location. Please try again outdoors.'
      );
    } finally {
      setCapturingLocation(false);
    }
  };

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const asset = result.assets[0];
      setPhotoPreviewUri(asset.uri);
      setPhotoUploadValue(
        asset.base64
          ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
          : asset.uri
      );
    }
  };

  const bookAppointment = async () => {
    if (!profile?.userId) {
      Alert.alert('Login required', 'Could not detect user profile. Please login again.');
      return;
    }
    if (!assignedDoctor) {
      Alert.alert('No doctor available', noDocMsg || 'No doctor is assigned to your panchayat.');
      return;
    }
    if (ponds.length > 1 && !selectedPondId) {
      Alert.alert('Select pond', 'Please select which pond this appointment is for.');
      return;
    }
    if (!issueDescription.trim()) {
      Alert.alert('Missing issue', 'Please describe the pond issue.');
      return;
    }

    const suspected = sugg?.recommendations?.[0]?.id;

    setSubmitting(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await doctorNetworkService.createAppointment({
        farmerId: profile.userId,
        doctorId: assignedDoctor.id,
        pondId: selectedPond?.id || undefined,
        issueDescription: issueDescription.trim(),
        suspectedDiseaseId: suspected || undefined,
        scheduledDate: tomorrow.toISOString(),
        consultationType: 'VISIT',
        emergencyFlag: sugg?.urgency === 'CRITICAL',
        photoUri: photoUploadValue || undefined,
      });

      if (res.success) {
        Alert.alert(
          'Appointment Requested',
          `${doctorDisplayName} will visit${selectedPond ? ` for pond "${selectedPond.name}"` : ''}.\nVisit fee: ₹400 total — You pay ₹200, Govt pays ₹200.`
        );
        setIssueDescription('');
        setSugg(null);
        setPhotoPreviewUri('');
        setPhotoUploadValue('');
      } else {
        Alert.alert('Failed', res.error || 'Could not book appointment.');
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Could not book appointment.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const urgencyColor = sugg?.urgency === 'CRITICAL'
    ? c.error
    : sugg?.urgency === 'HIGH'
    ? c.accent
    : c.secondary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('doctor.network')} onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* ── Assigned Doctor Card ───────────────────────────── */}
          <Text style={styles.sectionHeader}>{t('doctor.myProfile').toUpperCase()}</Text>
          <View style={styles.card}>
            {routingDoctor ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={c.primary} />
            ) : assignedDoctor ? (
              <View style={styles.doctorRow}>
                {/* Avatar */}
                <View style={styles.doctorAvatarWrap}>
                  <Text style={styles.doctorAvatarLetter}>
                    {assignedDoctor.name?.charAt(0)?.toUpperCase() || 'D'}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorName}>{assignedDoctor.name}</Text>

                  {/* Badges row */}
                  <View style={styles.badgeRow}>
                    {assignedDoctor.specialization ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{assignedDoctor.specialization}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.badge, styles.badgeAvailable]}>
                      <View style={styles.badgeDot} />
                      <Text style={[styles.badgeText, { color: c.secondary }]}>Available</Text>
                    </View>
                  </View>

                  <Text style={styles.doctorMeta}>{assignedDoctor.phone}</Text>
                  <Text style={styles.doctorMeta}>
                    Area: {profile?.panchayatName || profile?.blockName || 'Your panchayat'}
                  </Text>
                </View>

                {/* Book CTA inline */}
                <TouchableOpacity
                  style={styles.bookInlineBtn}
                  onPress={bookAppointment}
                  disabled={submitting}
                >
                  <Ionicons name="calendar-outline" size={16} color={c.textInverse} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noDocCard}>
                <Ionicons name="medical-outline" size={28} color={c.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.noDocText}>{noDocMsg}</Text>
                {!isProfileLocationComplete(profile!) && (
                  <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={() => navigation.navigate('PersonalInfo')}
                  >
                    <Text style={styles.profileBtnText}>{t('personalInfo.title')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* ── Pond Selector ─────────────────────────────────── */}
          {ponds.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>{t('addEditPond.fields.species').toUpperCase()}</Text>
              <View style={styles.card}>
                {ponds.length === 1 ? (
                  <View style={styles.singlePondRow}>
                    <Ionicons name="water-outline" size={18} color={c.primary} />
                    <Text style={styles.singlePondName}>{ponds[0].name}</Text>
                    <View style={[styles.badge, styles.badgeAvailable]}>
                      <Text style={[styles.badgeText, { color: c.secondary }]}>Auto-selected</Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.pondSelector}
                      onPress={() => setPondPickerVisible(true)}
                    >
                      <Ionicons name="water-outline" size={18} color={c.textMuted} />
                      <Text style={[
                        styles.pondSelectorText,
                        { color: selectedPond ? c.textPrimary : c.textMuted },
                      ]}>
                        {selectedPond ? selectedPond.name : 'Select a pond...'}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                    </TouchableOpacity>
                    {selectedPond?.panchayatName ? (
                      <Text style={styles.helper}>
                        Pond panchayat: {selectedPond.panchayatName}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
            </>
          )}

          {/* ── Pond Location ────────────────────────────────── */}
          {selectedPond && (
            <>
              <Text style={styles.sectionHeader}>POND LOCATION</Text>
              <View style={styles.card} key={`loc-${locationBumpKey}`}>
                {selectedPond.latitude && selectedPond.longitude ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={18} color={c.secondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationLabel}>Saved coordinates</Text>
                      <Text style={styles.locationCoords}>
                        {selectedPond.latitude.toFixed(5)}, {selectedPond.longitude.toFixed(5)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.locationRow}>
                    <Ionicons name="alert-circle-outline" size={18} color={c.accent} />
                    <Text style={[styles.helper, { flex: 1, marginBottom: 0 }]}>
                      No GPS location saved for this pond. Tag your current location so
                      the doctor can find the pond on a map.
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, { marginTop: 12 }, capturingLocation && styles.bookBtnDisabled]}
                  onPress={captureCurrentLocation}
                  disabled={capturingLocation}
                >
                  {capturingLocation ? (
                    <ActivityIndicator color={c.primary} />
                  ) : (
                    <>
                      <Ionicons name="navigate-outline" size={16} color={c.primary} />
                      <Text style={styles.actionBtnText}>
                        {selectedPond.latitude && selectedPond.longitude
                          ? 'Update GPS to current location'
                          : 'Use my current GPS location'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Symptom Triage ────────────────────────────────── */}
          <Text style={styles.sectionHeader}>{t('disease.sections.symptoms').toUpperCase()}</Text>
          <View style={styles.card}>
            <Text style={styles.helper}>Example: {symptomHints.join(', ')}</Text>
            <TextInput
              style={[styles.input, symptomsInputFocused && styles.inputFocused]}
              value={symptoms}
              onChangeText={setSymptoms}
              placeholder={t('disease.searchPlaceholder')}
              placeholderTextColor={c.textMuted}
              onFocus={() => setSymptomsInputFocused(true)}
              onBlur={() => setSymptomsInputFocused(false)}
            />
            <TouchableOpacity style={styles.actionBtn} onPress={runSuggestion}>
              <Ionicons name="flask-outline" size={16} color={c.primary} />
              <Text style={styles.actionBtnText}>{t('disease.title')}</Text>
            </TouchableOpacity>

            {sugg ? (
              <View style={[styles.suggestionCard, { borderLeftColor: urgencyColor }]}>
                <View style={styles.suggestionTopRow}>
                  <Text style={[styles.suggestionUrgency, { color: urgencyColor }]}>
                    {sugg.urgency}
                  </Text>
                  <View style={[styles.urgencyPill, { backgroundColor: urgencyColor + '22' }]}>
                    <Ionicons name="alert-circle-outline" size={13} color={urgencyColor} />
                    <Text style={[styles.urgencyPillText, { color: urgencyColor }]}>Urgency</Text>
                  </View>
                </View>
                <Text style={styles.suggestionBody}>{sugg.advisory}</Text>
                <Text style={[styles.suggestionBody, { marginTop: 6, color: c.textPrimary, fontWeight: '700' }]}>
                  Top match: {sugg.recommendations?.[0]?.name || 'No strong match'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Photo ─────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>{t('common.add')} {t('common.optional')}</Text>
          <View style={styles.card}>
            <Text style={styles.helper}>{t('ponds.updatePhotoBody')}</Text>
            {photoPreviewUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoPreviewUri }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.photoRetakeBtn} onPress={handlePickImage}>
                  <Ionicons name="camera-outline" size={14} color="#fff" />
                  <Text style={styles.photoRetakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
                <Ionicons name="camera-outline" size={22} color={c.textMuted} />
                <Text style={styles.photoBtnText}>{t('ponds.takePhoto')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Book Appointment ──────────────────────────────── */}
          <Text style={styles.sectionHeader}>{t('doctor.bookAppointment').toUpperCase()}</Text>
          <View style={styles.card}>
            <TextInput
              style={[styles.input, styles.multiline, issueInputFocused && styles.inputFocused]}
              value={issueDescription}
              onChangeText={setIssueDescription}
              multiline
              placeholder={t('doctor.issue')}
              placeholderTextColor={c.textMuted}
              onFocus={() => setIssueInputFocused(true)}
              onBlur={() => setIssueInputFocused(false)}
            />

            {/* Payment info row */}
            <View style={styles.paymentRow}>
              <Ionicons name="receipt-outline" size={15} color={c.accent} />
              <Text style={styles.paymentText}>Visit fee ₹400 — You pay ₹200, Govt pays ₹200</Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.bookBtn, (!assignedDoctor || submitting) && styles.bookBtnDisabled]}
              disabled={submitting || !assignedDoctor}
              onPress={bookAppointment}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={c.textInverse} />
              ) : (
                <>
                  <Ionicons name="calendar-outline" size={18} color={c.textInverse} />
                  <Text style={styles.bookBtnText}>
                    {assignedDoctor ? `Book ${doctorDisplayName}` : 'No Doctor Available'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

      {/* ── Pond Picker Modal ─────────────────────────────── */}
      <Modal
        visible={pondPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPondPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('addEditPond.fields.species')}</Text>
              <TouchableOpacity
                onPress={() => setPondPickerVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={ponds}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pondItem,
                    item.id === selectedPondId && styles.pondItemActive,
                  ]}
                  onPress={() => handlePondSelect(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pondItemName}>{item.name}</Text>
                    {item.panchayatName ? (
                      <Text style={styles.pondItemMeta}>
                        {item.panchayatName}, {item.blockName}
                      </Text>
                    ) : (
                      <Text style={[styles.pondItemMeta, { color: c.textMuted }]}>
                        No panchayat set — will use profile location
                      </Text>
                    )}
                  </View>
                  {item.id === selectedPondId && (
                    <Ionicons name="checkmark-circle" size={20} color={c.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  const r = theme.borderRadius;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },

    // Section header
    sectionHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 8,
      marginLeft: 4,
    },

    // Card
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: r.lg,
      padding: 16,
    },

    helper: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 10,
    },

    // Doctor card
    doctorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    doctorAvatarWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 5,
    },
    doctorAvatarLetter: {
      color: c.textInverse,
      fontSize: 22,
      fontWeight: '800',
    },
    doctorName: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 4,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 6,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: r.full,
      backgroundColor: c.surfaceAlt,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    badgeAvailable: {
      backgroundColor: c.secondaryLight,
    },
    badgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.secondary,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    doctorMeta: {
      color: c.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    bookInlineBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noDocCard: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    noDocText: {
      color: c.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
    },
    profileBtn: {
      marginTop: 12,
      backgroundColor: c.primary,
      borderRadius: r.md,
      paddingVertical: 10,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    profileBtnText: {
      color: c.textInverse,
      fontWeight: '800',
    },

    // Pond selector
    singlePondRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    singlePondName: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    pondSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: r.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.surfaceAlt,
    },
    pondSelectorText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
    },

    // Inputs
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: r.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.textPrimary,
      backgroundColor: c.surfaceAlt,
      fontSize: 14,
      marginBottom: 10,
    },
    inputFocused: {
      borderColor: c.primary,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
    multiline: {
      minHeight: 96,
      textAlignVertical: 'top',
    },

    // Action / triage button
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: r.md,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: c.primary,
      marginBottom: 10,
    },
    actionBtnText: {
      color: c.primary,
      fontWeight: '800',
      fontSize: 14,
    },

    // Pond location section
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    locationLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    locationCoords: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 2,
    },

    // Suggestion card
    suggestionCard: {
      borderRadius: r.md,
      backgroundColor: c.primaryLight,
      padding: 12,
      borderLeftWidth: 3,
    },
    suggestionTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    suggestionUrgency: {
      fontSize: 14,
      fontWeight: '800',
    },
    urgencyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: r.full,
    },
    urgencyPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    suggestionBody: {
      color: c.textSecondary,
      lineHeight: 19,
      fontSize: 13,
    },

    // Photo
    photoPreviewWrap: {
      borderRadius: r.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    photoPreview: {
      width: '100%',
      height: 160,
      resizeMode: 'cover',
    },
    photoRetakeBtn: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: r.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    photoRetakeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    photoBtn: {
      borderRadius: r.md,
      paddingVertical: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: c.border,
      borderStyle: 'dashed',
      backgroundColor: c.surfaceAlt,
    },
    photoBtnText: {
      color: c.textMuted,
      fontWeight: '700',
      fontSize: 14,
    },

    // Booking
    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    paymentText: {
      color: c.textSecondary,
      fontWeight: '700',
      fontSize: 13,
    },
    bookBtn: {
      borderRadius: r.lg,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 15,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },
    bookBtnDisabled: {
      backgroundColor: c.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    bookBtnText: {
      color: c.textInverse,
      fontWeight: '800',
      fontSize: 15,
    },

    // Pond picker modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '65%',
      paddingBottom: 32,
      borderTopWidth: 1,
      borderColor: c.border,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 2,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    modalTitle: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    modalCloseBtn: {
      paddingHorizontal: 4,
    },
    modalCloseText: {
      color: c.primary,
      fontWeight: '700',
      fontSize: 15,
    },
    pondItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      gap: 12,
    },
    pondItemActive: {
      backgroundColor: c.primaryLight,
    },
    pondItemName: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    pondItemMeta: {
      color: c.textSecondary,
      fontSize: 13,
      marginTop: 3,
    },
  });
};
