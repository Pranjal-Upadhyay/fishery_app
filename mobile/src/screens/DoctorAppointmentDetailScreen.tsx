import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../ThemeContext';
import {
  addDoctorNote,
  getDoctorAppointmentById,
  type DecoratedDoctorAppointment,
  type DoctorVisitReport,
  updateDoctorAppointmentStatus,
} from '../services/doctorDashboardService';

export default function DoctorAppointmentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { appointmentId } = route.params as { appointmentId: string };
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(theme);
  const c = theme.colors;

  const [appointment, setAppointment] = useState<DecoratedDoctorAppointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [pondInspected, setPondInspected] = useState(true);
  const [fishObserved, setFishObserved] = useState(true);
  const [farmerCounseled, setFarmerCounseled] = useState(true);
  const [quickNote, setQuickNote] = useState('');

  const loadAppointment = useCallback(async () => {
    setIsLoading(true);
    try {
      const item = await getDoctorAppointmentById(appointmentId);
      setAppointment(item);
      setDiagnosis(item?.report?.diagnosis || '');
      setTreatmentPlan(item?.report?.treatmentPlan || '');
      setVisitNotes(item?.report?.notes || '');
      setFollowUpRequired(Boolean(item?.report?.followUpRequired));
      setFollowUpDate(item?.report?.followUpDate ? item.report.followUpDate.slice(0, 10) : '');
      setPondInspected(item?.report?.completionChecklist.pondInspected ?? true);
      setFishObserved(item?.report?.completionChecklist.fishObserved ?? true);
      setFarmerCounseled(item?.report?.completionChecklist.farmerCounseled ?? true);
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  useFocusEffect(
    useCallback(() => {
      void loadAppointment();
    }, [loadAppointment])
  );

  const saveQuickNote = async () => {
    if (!quickNote.trim()) return;
    try {
      await addDoctorNote(appointmentId, quickNote);
      setQuickNote('');
      await loadAppointment();
    } catch (error: any) {
      Alert.alert(
        'Note not saved',
        error?.message || 'Could not save the doctor note right now.'
      );
    }
  };

  const markCompleted = async () => {
    if (!appointment) return;
    if (!diagnosis.trim() || !treatmentPlan.trim()) {
      Alert.alert('Complete visit report', 'Add at least a diagnosis and treatment plan before marking the appointment complete.');
      return;
    }

    const report: DoctorVisitReport = {
      diagnosis: diagnosis.trim(),
      treatmentPlan: treatmentPlan.trim(),
      notes: visitNotes.trim(),
      followUpRequired,
      followUpDate: followUpRequired && followUpDate ? new Date(followUpDate).toISOString() : undefined,
      completionChecklist: {
        pondInspected,
        fishObserved,
        farmerCounseled,
      },
    };

    try {
      await updateDoctorAppointmentStatus(appointment.id, 'COMPLETED', report);
      await loadAppointment();
      Alert.alert('Visit completed', 'The appointment was marked complete and the progress report has been updated.');
    } catch (error: any) {
      Alert.alert(
        'Update failed',
        error?.message || 'Could not complete the appointment right now.'
      );
    }
  };

  /**
   * Open the pond's coordinates in the OS-default maps app.
   * iOS → Apple Maps via maps:// scheme.
   * Android → geo: intent which Google Maps / OsmAnd / etc. all handle.
   * Universal fallback → google.com/maps which any browser/maps app intercepts.
   */
  const openInMaps = async (lat: number, lng: number, label?: string) => {
    const labelEnc = encodeURIComponent(label || 'Pond');
    const schemeUrl = Platform.select({
      ios: `maps://?ll=${lat},${lng}&q=${labelEnc}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${labelEnc})`,
    });
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    try {
      if (schemeUrl) {
        const can = await Linking.canOpenURL(schemeUrl);
        if (can) {
          await Linking.openURL(schemeUrl);
          return;
        }
      }
      await Linking.openURL(fallbackUrl);
    } catch {
      Alert.alert('Cannot open maps', 'No maps application is available on this device.');
    }
  };

  const handleStatusProgress = async () => {
    if (!appointment) return;
    try {
      if (appointment.derivedStatus === 'NEW') {
        await updateDoctorAppointmentStatus(appointment.id, 'ACKNOWLEDGED');
      } else if (appointment.derivedStatus === 'ACKNOWLEDGED') {
        await updateDoctorAppointmentStatus(appointment.id, 'IN_PROGRESS');
      }
      await loadAppointment();
    } catch (error: any) {
      Alert.alert(
        'Status update failed',
        error?.message || 'Could not update the appointment status right now.'
      );
    }
  };

  if (isLoading || !appointment) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={c.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('doctor.appointmentDetails')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroTitle}>{appointment.pondName}</Text>
              <Text style={styles.heroSubtitle}>{appointment.farmerName} · {appointment.farmerPhone || 'No phone saved'}</Text>
            </View>
            <View style={styles.statusPillWrap}>
              <Text style={styles.statusPillText}>{appointment.derivedStatus}</Text>
            </View>
          </View>
          <Text style={styles.issueText}>{appointment.issueDescription}</Text>
          <View style={styles.metaWrap}>
            <MetaLine icon="location-outline" text={appointment.location.addressLine} />
            <MetaLine icon="time-outline" text={appointment.timeRemainingHours >= 0 ? `${appointment.timeRemainingHours} hours left inside SLA` : `${Math.abs(appointment.timeRemainingHours)} hours overdue`} />
            <MetaLine icon="calendar-outline" text={`Booked ${new Date(appointment.bookedAt).toLocaleString('en-IN')}`} />
            {appointment.coordinates ? (
              <View style={styles.coordRow}>
                <View style={styles.coordTextWrap}>
                  <Ionicons name="navigate-outline" size={15} color={c.textSecondary} />
                  <Text style={styles.coordText}>
                    {appointment.coordinates.latitude.toFixed(4)}, {appointment.coordinates.longitude.toFixed(4)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.mapsButton}
                  onPress={() =>
                    void openInMaps(
                      appointment.coordinates!.latitude,
                      appointment.coordinates!.longitude,
                      appointment.pondName
                    )
                  }
                  activeOpacity={0.85}
                >
                  <Ionicons name="map-outline" size={14} color={c.textInverse} />
                  <Text style={styles.mapsButtonText}>Open in Maps</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <MetaLine icon="navigate-outline" text="Coordinates not available" />
            )}
          </View>
          {appointment.derivedStatus === 'NEW' || appointment.derivedStatus === 'ACKNOWLEDGED' ? (
            <TouchableOpacity style={styles.heroAction} onPress={() => void handleStatusProgress()}>
              <Text style={styles.heroActionText}>{appointment.derivedStatus === 'NEW' ? 'Acknowledge Visit' : 'Start Field Visit'}</Text>
              <Ionicons name="arrow-forward" size={16} color={c.textInverse} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>{t('disease.affected').toUpperCase()}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageStrip}>
          {appointment.images.length > 0 ? (
            appointment.images.map((uri, index) => (
              <Image key={`${uri}-${index}`} source={{ uri }} style={styles.evidenceImage} />
            ))
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="images-outline" size={28} color={c.textMuted} />
              <Text style={styles.placeholderText}>{t('common.notAvailable')}</Text>
            </View>
          )}
        </ScrollView>

        <Text style={styles.sectionLabel}>{t('doctor.patientPond').toUpperCase()}</Text>
        <View style={styles.panel}>
          <MetaLine icon="water-outline" text={`Water source: ${appointment.waterSourceType || 'Not provided'}`} />
          <MetaLine icon="resize-outline" text={`Area: ${appointment.pondAreaHectares ? `${appointment.pondAreaHectares} ha` : 'Not recorded'}`} />
          <MetaLine icon="bug-outline" text={`Symptoms: ${appointment.symptoms.join(', ') || 'Not tagged'}`} />
          <MetaLine icon="medkit-outline" text={`Suspected issue: ${appointment.suspectedDisease || 'No pre-triage tag'}`} />
          {appointment.waterQualitySnapshot ? (
            <View style={styles.snapshotGrid}>
              <SnapshotPill label="DO" value={appointment.waterQualitySnapshot.dissolvedOxygen ? `${appointment.waterQualitySnapshot.dissolvedOxygen} mg/L` : '—'} />
              <SnapshotPill label="pH" value={appointment.waterQualitySnapshot.ph ? `${appointment.waterQualitySnapshot.ph}` : '—'} />
              <SnapshotPill label="Temp" value={appointment.waterQualitySnapshot.temperature ? `${appointment.waterQualitySnapshot.temperature}°C` : '—'} />
              <SnapshotPill label="NH3" value={appointment.waterQualitySnapshot.ammonia ? `${appointment.waterQualitySnapshot.ammonia}` : '—'} />
            </View>
          ) : (
            <Text style={styles.supportText}>{t('common.notAvailable')}</Text>
          )}
        </View>

        <Text style={styles.sectionLabel}>{t('doctor.submitReport').toUpperCase()}</Text>
        <View style={styles.panel}>
          <ReportInput label={t('doctor.diagnosis')} value={diagnosis} onChangeText={setDiagnosis} placeholder={t('doctor.diagnosis')} multiline />
          <ReportInput label={t('doctor.treatmentPlan')} value={treatmentPlan} onChangeText={setTreatmentPlan} placeholder={t('doctor.treatmentPlan')} multiline />
          <ReportInput label={t('doctor.notes')} value={visitNotes} onChangeText={setVisitNotes} placeholder={t('doctor.notes')} multiline />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Follow-up required</Text>
            <Switch value={followUpRequired} onValueChange={setFollowUpRequired} trackColor={{ false: c.border, true: c.primaryLight }} thumbColor={followUpRequired ? c.primary : c.textMuted} />
          </View>
          {followUpRequired ? (
            <ReportInput label={t('doctor.followUpDate')} value={followUpDate} onChangeText={setFollowUpDate} placeholder="YYYY-MM-DD" />
          ) : null}

          <Text style={styles.checklistLabel}>{t('doctor.completionChecklist')}</Text>
          <ChecklistToggle label={t('doctor.pondInspected')} value={pondInspected} onValueChange={setPondInspected} />
          <ChecklistToggle label={t('doctor.fishObserved')} value={fishObserved} onValueChange={setFishObserved} />
          <ChecklistToggle label="Farmer counseled" value={farmerCounseled} onValueChange={setFarmerCounseled} />

          {appointment.derivedStatus !== 'COMPLETED' ? (
            <TouchableOpacity style={styles.completeButton} onPress={() => void markCompleted()}>
              <Text style={styles.completeButtonText}>{t('doctor.markCompleted')}</Text>
              <Ionicons name="checkmark-done-outline" size={18} color={c.textInverse} />
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-circle-outline" size={18} color={c.secondary} />
              <Text style={styles.completedBannerText}>{t('doctor.statusValues.COMPLETED')}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>{t('doctor.notes').toUpperCase()}</Text>
        <View style={styles.panel}>
          <View style={styles.quickNoteRow}>
            <TextInput
              style={styles.quickNoteInput}
              placeholder={t('doctor.quickNotePlaceholder')}
              placeholderTextColor={c.textMuted}
              value={quickNote}
              onChangeText={setQuickNote}
            />
            <TouchableOpacity style={styles.noteButton} onPress={() => void saveQuickNote()}>
              <Ionicons name="send-outline" size={18} color={c.textInverse} />
            </TouchableOpacity>
          </View>
          {appointment.noteHistory.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <Text style={styles.noteAuthor}>{note.author.toUpperCase()} · {new Date(note.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
              <Text style={styles.noteText}>{note.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { theme } = useTheme();
  return (
    <View style={stylesLocal.metaLine}>
      <Ionicons name={icon} size={15} color={theme.colors.textSecondary} />
      <Text style={[stylesLocal.metaText, { color: theme.colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

function SnapshotPill({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={[stylesLocal.snapshotPill, { backgroundColor: theme.colors.surfaceAlt }]}>
      <Text style={[stylesLocal.snapshotLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[stylesLocal.snapshotValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function ReportInput({ label, ...props }: any) {
  const { theme } = useTheme();
  return (
    <View style={stylesLocal.inputWrap}>
      <Text style={[stylesLocal.inputLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
      <TextInput
        style={[stylesLocal.input, props.multiline && stylesLocal.inputMultiline, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}
        placeholderTextColor={theme.colors.textMuted}
        textAlignVertical={props.multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}

function ChecklistToggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const { theme } = useTheme();
  return (
    <View style={stylesLocal.checklistRow}>
      <Text style={[stylesLocal.checklistText, { color: theme.colors.textPrimary }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }} thumbColor={value ? theme.colors.primary : theme.colors.textMuted} />
    </View>
  );
}

const stylesLocal = StyleSheet.create({
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  snapshotPill: {
    width: '47%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  snapshotLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  snapshotValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  inputWrap: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 94,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  checklistText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const getStyles = (theme: any) => {
  const c = theme.colors;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 120,
    },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      marginTop: 12,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'flex-start',
    },
    heroTitle: {
      color: c.textPrimary,
      fontSize: 22,
      fontWeight: '800',
    },
    heroSubtitle: {
      color: c.textSecondary,
      fontSize: 13,
      marginTop: 6,
    },
    statusPillWrap: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: c.primaryLight,
    },
    statusPillText: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    issueText: {
      color: c.textPrimary,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 16,
      marginBottom: 14,
    },
    metaWrap: {
      marginBottom: 8,
    },
    coordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 10,
    },
    coordTextWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    coordText: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      flex: 1,
    },
    mapsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    mapsButtonText: {
      color: c.textInverse,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    heroAction: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 14,
    },
    heroActionText: {
      color: c.textInverse,
      fontSize: 15,
      fontWeight: '800',
    },
    sectionLabel: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      marginTop: 24,
      marginBottom: 12,
    },
    imageStrip: {
      gap: 12,
    },
    evidenceImage: {
      width: 220,
      height: 160,
      borderRadius: 20,
      backgroundColor: c.surfaceAlt,
    },
    placeholderImage: {
      width: 220,
      height: 160,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    placeholderText: {
      color: c.textMuted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 19,
    },
    panel: {
      backgroundColor: c.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
    },
    snapshotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    supportText: {
      color: c.textMuted,
      fontSize: 13,
      marginTop: 8,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    toggleLabel: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    checklistLabel: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 8,
      marginBottom: 4,
    },
    completeButton: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.secondary,
      borderRadius: 16,
      paddingVertical: 14,
    },
    completeButtonText: {
      color: c.textOnSecondary,
      fontSize: 15,
      fontWeight: '800',
    },
    completedBanner: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 16,
      backgroundColor: c.secondaryLight,
    },
    completedBannerText: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 13,
      lineHeight: 20,
    },
    quickNoteRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    quickNoteInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.surfaceAlt,
      color: c.textPrimary,
      fontSize: 14,
    },
    noteButton: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noteCard: {
      borderRadius: 16,
      backgroundColor: c.surfaceAlt,
      padding: 14,
      marginBottom: 10,
    },
    noteAuthor: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    noteText: {
      color: c.textPrimary,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
    },
  });
};
