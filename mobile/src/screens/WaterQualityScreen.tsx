import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
  ActivityIndicator, RefreshControl, Modal, FlatList,
} from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { useTheme } from '../ThemeContext';
import WaterQualityChart from '../components/WaterQualityChart';
import { evaluatePondHealth, Advisory } from '../utils/pondAdvisory';
import { database } from '../database';
import Pond from '../database/models/Pond';
import WaterQualityLog from '../database/models/WaterQualityLog';
import { fetchSpeciesLookup } from '../utils/speciesLookup';
import { getUnreadNotificationCount } from '../utils/notificationCenter';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reading {
  id: string;
  pond_id: string;
  pond_name: string;
  temperature?: number;
  dissolved_oxygen?: number;
  ph?: number;
  salinity?: number;
  ammonia?: number;
  recorded_at: string;
}

interface PondOption {
  id: string;
  name: string;
  subtitle: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusFor(reading: Reading): 'normal' | 'warning' | 'alert' {
  if (reading.dissolved_oxygen != null && reading.dissolved_oxygen < 4) return 'alert';
  if (reading.ph != null && (reading.ph < 6.5 || reading.ph > 8.5)) return 'warning';
  if (reading.temperature != null && (reading.temperature < 20 || reading.temperature > 35)) return 'warning';
  return 'normal';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Safe range configuration for progress bars
const PARAM_RANGES: Record<string, { min: number; max: number; safeMin: number; safeMax: number; unit: string; label: string }> = {
  temperature:        { min: 10, max: 45, safeMin: 20, safeMax: 35, unit: '°C',      label: 'TEMP' },
  dissolved_oxygen:   { min: 0,  max: 15, safeMin: 5,  safeMax: 12, unit: 'mg/L',    label: 'DO' },
  ph:                 { min: 4,  max: 10, safeMin: 6.5, safeMax: 8.5, unit: 'pH',    label: 'pH' },
  salinity:           { min: 0,  max: 40, safeMin: 0,  safeMax: 20, unit: 'ppt',     label: 'SAL' },
  ammonia:            { min: 0,  max: 5,  safeMin: 0,  safeMax: 0.5, unit: 'mg/L',   label: 'NH₃' },
};

function paramStatus(key: string, value?: number): 'success' | 'warning' | 'error' {
  if (value == null) return 'success';
  const range = PARAM_RANGES[key];
  if (!range) return 'success';
  if (value < range.safeMin || value > range.safeMax) {
    if (key === 'dissolved_oxygen' && value < 3) return 'error';
    if (key === 'ammonia' && value > 1) return 'error';
    return 'warning';
  }
  return 'success';
}

function safeRangeProgress(key: string, value?: number): number {
  if (value == null) return 0;
  const range = PARAM_RANGES[key];
  if (!range) return 0;
  const span = range.max - range.min;
  return Math.min(1, Math.max(0, (value - range.min) / span));
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  paramKey, value, theme, styles,
}: {
  paramKey: string;
  value?: number;
  theme: any;
  styles: ReturnType<typeof getStyles>;
}) {
  const range = PARAM_RANGES[paramKey];
  if (!range) return null;
  const status = paramStatus(paramKey, value);
  const progress = safeRangeProgress(paramKey, value);

  const borderColor =
    status === 'error' ? theme.colors.error :
    status === 'warning' ? theme.colors.accent :
    theme.colors.success;

  const badgeBg =
    status === 'error' ? theme.colors.errorSoft :
    status === 'warning' ? theme.colors.accentSoft :
    theme.colors.secondaryLight;

  const badgeText =
    status === 'error' ? theme.colors.error :
    status === 'warning' ? theme.colors.accent :
    theme.colors.success;

  const progressColors: [string, string] =
    status === 'error' ? [theme.colors.error, `${theme.colors.error}88`] :
    status === 'warning' ? [theme.colors.accent, `${theme.colors.accent}88`] :
    [theme.colors.primary, theme.colors.secondary];

  return (
    <View style={[styles.metricCard, { borderLeftColor: borderColor }]}>
      {/* Status chip top-right */}
      <View style={[styles.metricBadge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.metricBadgeText, { color: badgeText }]}>
          {status === 'error' ? 'ALERT' : status === 'warning' ? 'WARN' : 'OK'}
        </Text>
      </View>

      {/* Label */}
      <Text style={styles.metricLabel}>{range.label}</Text>

      {/* Big number */}
      <View style={styles.metricValueRow}>
        <Text style={[styles.metricNumber, { color: borderColor }]}>
          {value != null ? value.toFixed(value < 10 ? 1 : 0) : '—'}
        </Text>
        <Text style={styles.metricUnit}>{range.unit}</Text>
      </View>

      {/* Safe range hint */}
      <Text style={styles.metricRange}>
        Safe: {range.safeMin}–{range.safeMax} {range.unit}
      </Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: progressColors[0],
            },
          ]}
        />
      </View>
    </View>
  );
}

// ─── Focused input ────────────────────────────────────────────────────────────

function Field({ label, value, onChangeText, theme, styles, full }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldWrap, full && styles.fullField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, focused && styles.fieldInputFocused]}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholderTextColor={theme.colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WaterQualityScreen({ route }: any) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<'log' | 'history'>(route.params?.initialTab || 'log');
  const [temperature, setTemperature] = useState('');
  const [dissolvedOxygen, setDissolvedOxygen] = useState('');
  const [ph, setPh] = useState('');
  const [salinity, setSalinity] = useState('');
  const [ammonia, setAmmonia] = useState('');
  const [notes, setNotes] = useState('');
  const [notesFocused, setNotesFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<Reading[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastAdvisory, setLastAdvisory] = useState<Advisory | null>(null);
  const [ponds, setPonds] = useState<PondOption[]>([]);
  const [selectedPondId, setSelectedPondId] = useState(route.params?.pondId || '');
  const [isLoadingPonds, setIsLoadingPonds] = useState(true);
  const [pondSelectorVisible, setPondSelectorVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const speciesLookupRef = React.useRef<Record<string, any>>({});

  const selectedPond = ponds.find(p => p.id === selectedPondId);

  // Latest reading for metric cards
  const latestReading: Reading | undefined = history[0];

  useEffect(() => {
    fetchSpeciesLookup()
      .then(lookup => { speciesLookupRef.current = lookup; })
      .catch(() => {});
  }, []);

  const loadNotificationCount = useCallback(async () => {
    const count = await getUnreadNotificationCount();
    setUnreadNotificationCount(count);
  }, []);

  const loadPonds = useCallback(async () => {
    try {
      setIsLoadingPonds(true);
      const pondRecords = await database.collections.get<Pond>('ponds').query().fetch();
      const speciesLookup = speciesLookupRef.current;

      const options = pondRecords
        .map(pond => {
          const species = pond.speciesId ? speciesLookup[pond.speciesId] : null;
          const status = String(pond.status || '').toUpperCase();
          const speciesLabel = species?.label || 'Species not added';
          return { id: pond.id, name: pond.name, subtitle: `${speciesLabel} • ${status}` };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setPonds(options);
      setSelectedPondId((prevId: string) => {
        if (options.length > 0) {
          const hasSelected = options.some(p => p.id === prevId);
          if (!prevId || !hasSelected) {
            return route.params?.pondId && options.some(p => p.id === route.params?.pondId)
              ? route.params.pondId
              : options[0].id;
          }
          return prevId;
        }
        return '';
      });
    } catch (error) {
      console.error('Failed to load ponds for water quality', error);
    } finally {
      setIsLoadingPonds(false);
    }
  }, [route.params?.pondId]);

  const loadHistory = useCallback(async () => {
    if (!selectedPondId) {
      setHistory([]);
      setIsLoadingHistory(false);
      setRefreshing(false);
      return;
    }
    try {
      setIsLoadingHistory(true);
      const logs = await database.collections
        .get<WaterQualityLog>('water_quality_logs')
        .query(Q.where('pond_id', selectedPondId), Q.sortBy('timestamp', Q.desc))
        .fetch();

      const pondMap = new Map(ponds.map(p => [p.id, p.name]));
      setHistory(logs.map(log => ({
        id: log.id,
        pond_id: log.pondId,
        pond_name: pondMap.get(log.pondId) || 'Unknown Pond',
        temperature: log.temperature,
        dissolved_oxygen: log.dissolvedOxygen,
        ph: log.ph,
        salinity: log.salinity,
        ammonia: log.ammonia,
        recorded_at: new Date(log.timestamp).toISOString(),
      })));
    } catch (err) {
      console.error('Failed to load water quality history', err);
    } finally {
      setIsLoadingHistory(false);
      setRefreshing(false);
    }
  }, [ponds, selectedPondId]);

  useFocusEffect(useCallback(() => {
    loadPonds();
    loadNotificationCount();
  }, [loadNotificationCount, loadPonds]));

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, selectedPondId, loadHistory]);

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
    if (route.params?.pondId) setSelectedPondId(route.params.pondId);
  }, [route.params?.initialTab, route.params?.pondId]);

  const saveReading = async () => {
    if (!selectedPondId) {
      Alert.alert('Add a pond first', 'Create a pond before logging water quality.');
      return;
    }
    if (!temperature && !dissolvedOxygen && !ph && !salinity && !ammonia) {
      Alert.alert('No Data', 'Please enter at least one measurement.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {};
      if (temperature) payload.temperature = parseFloat(temperature);
      if (dissolvedOxygen) payload.dissolvedOxygen = parseFloat(dissolvedOxygen);
      if (ph) payload.ph = parseFloat(ph);
      if (salinity) payload.salinity = parseFloat(salinity);
      if (ammonia) payload.ammonia = parseFloat(ammonia);

      const advisory = evaluatePondHealth({
        temperature: payload.temperature,
        dissolved_oxygen: payload.dissolvedOxygen,
        ph: payload.ph,
        ammonia: payload.ammonia,
      });

      const alerts = advisory.level === 'good' ? [] : [{
        parameter: 'overall',
        severity: advisory.level === 'critical' ? 'CRITICAL' : 'WARNING',
        message: notes.trim() ? `${advisory.message} Note: ${notes.trim()}` : advisory.message,
        recommendedAction: advisory.action,
      }];

      await database.write(async () => {
        await database.collections.get<WaterQualityLog>('water_quality_logs').create(log => {
          const id = uuidv4();
          log._raw.id = id;
          log.logId = id;
          log.pondId = selectedPondId;
          log.timestamp = Date.now();
          log.temperature = payload.temperature ?? undefined;
          log.dissolvedOxygen = payload.dissolvedOxygen ?? undefined;
          log.ph = payload.ph ?? undefined;
          log.salinity = payload.salinity ?? undefined;
          log.ammonia = payload.ammonia ?? undefined;
          log.alerts = JSON.stringify(alerts);
          log.localSyncStatus = 'NEW';
        });
      });

      setLastAdvisory(advisory);
      setTemperature('');
      setDissolvedOxygen('');
      setPh('');
      setSalinity('');
      setAmmonia('');
      setNotes('');
      setActiveTab('history');
      await loadHistory();
      await loadNotificationCount();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save this pond reading.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('waterQuality.title') || 'Water Quality'}</Text>
        <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications" size={20} color={theme.colors.textPrimary} />
          {unreadNotificationCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['log', 'history'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'log' ? 'Add Reading' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Advisory banner */}
      {lastAdvisory && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={16} color={theme.colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{lastAdvisory.title}</Text>
            <Text style={styles.alertText}>{lastAdvisory.message}</Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          activeTab === 'history'
            ? <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadHistory(); loadNotificationCount(); }}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            : undefined
        }
      >
        {isLoadingPonds ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : ponds.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="water-outline" size={36} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Add a pond first</Text>
            <Text style={styles.emptyText}>
              Water quality is tracked pond by pond so each reading can be tied to the right harvest and alerts.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('AddEditPond')}>
              <Ionicons name="add" size={16} color={theme.colors.textInverse} />
              <Text style={styles.primaryButtonText}>Add Pond</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Pond selector */}
            <TouchableOpacity style={styles.pondSelector} onPress={() => setPondSelectorVisible(true)}>
              <View style={styles.pondSelectorLeft}>
                <View style={styles.pondSelectorIcon}>
                  <Ionicons name="water" size={16} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pondSelectorFieldLabel}>SELECTED POND</Text>
                  <Text style={styles.pondSelectorTitle}>{selectedPond?.name || 'Choose pond'}</Text>
                  <Text style={styles.pondSelectorMeta}>{selectedPond?.subtitle || 'Pick the pond for this reading'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {activeTab === 'log' ? (
              /* ── Log tab ── */
              <>
                <Text style={styles.sectionLabel}>CURRENT VALUES</Text>

                {/* Metric cards (live preview from form values) */}
                <View style={styles.metricGrid}>
                  {([
                    ['temperature', temperature],
                    ['dissolved_oxygen', dissolvedOxygen],
                    ['ph', ph],
                    ['salinity', salinity],
                    ['ammonia', ammonia],
                  ] as [string, string][]).map(([key, val]) => {
                    const parsed = val ? parseFloat(val) : undefined;
                    return (
                      <MetricCard
                        key={key}
                        paramKey={key}
                        value={isNaN(parsed as number) ? undefined : parsed}
                        theme={theme}
                        styles={styles}
                      />
                    );
                  })}
                </View>

                {/* Log reading form */}
                <Text style={styles.sectionLabel}>LOG READING</Text>
                <View style={styles.formCard}>
                  <View style={styles.formGrid}>
                    <Field label="TEMPERATURE (°C)" value={temperature} onChangeText={setTemperature} theme={theme} styles={styles} />
                    <Field label="DISSOLVED OXYGEN (mg/L)" value={dissolvedOxygen} onChangeText={setDissolvedOxygen} theme={theme} styles={styles} />
                    <Field label="pH LEVEL" value={ph} onChangeText={setPh} theme={theme} styles={styles} />
                    <Field label="SALINITY (ppt)" value={salinity} onChangeText={setSalinity} theme={theme} styles={styles} />
                    <Field label="AMMONIA (NH3-N mg/L)" value={ammonia} onChangeText={setAmmonia} theme={theme} styles={styles} full />
                  </View>

                  {/* Notes */}
                  <View style={styles.fullField}>
                    <Text style={styles.fieldLabel}>FIELD NOTES</Text>
                    <TextInput
                      style={[styles.notesInput, notesFocused && styles.notesInputFocused]}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      placeholder="Optional note about water color, feed, smell, or pond condition..."
                      placeholderTextColor={theme.colors.textMuted}
                      onFocus={() => setNotesFocused(true)}
                      onBlur={() => setNotesFocused(false)}
                    />
                  </View>
                </View>

                {/* Save button */}
                <TouchableOpacity style={styles.saveButton} onPress={saveReading} disabled={isSaving}>
                  {isSaving
                    ? <ActivityIndicator color={theme.colors.textInverse} />
                    : <Text style={styles.saveButtonText}>Save Pond Reading</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              /* ── History tab ── */
              <>
                {isLoadingHistory && !refreshing ? (
                  <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} />
                  </View>
                ) : history.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                      <Ionicons name="analytics-outline" size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>No readings for this pond yet</Text>
                    <Text style={styles.emptyText}>
                      Add the first pond-specific reading to unlock trend analysis and alerts.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Latest metric cards */}
                    {latestReading && (
                      <>
                        <Text style={styles.sectionLabel}>LATEST READING</Text>
                        <Text style={styles.latestReadingDate}>{formatDate(latestReading.recorded_at)}</Text>
                        <View style={styles.metricGrid}>
                          {(['temperature', 'dissolved_oxygen', 'ph', 'salinity', 'ammonia'] as const).map(key => (
                            <MetricCard
                              key={key}
                              paramKey={key}
                              value={(latestReading as any)[key]}
                              theme={theme}
                              styles={styles}
                            />
                          ))}
                        </View>
                      </>
                    )}

                    {/* Chart */}
                    <Text style={styles.sectionLabel}>TREND ANALYSIS</Text>
                    <View style={styles.chartCard}>
                      <WaterQualityChart
                        readings={history.map(r => ({
                          timestamp: new Date(r.recorded_at).getTime(),
                          temperature: r.temperature,
                          dissolved_oxygen: r.dissolved_oxygen,
                          ph: r.ph,
                          ammonia: r.ammonia,
                        }))}
                      />
                    </View>

                    {/* History list */}
                    <Text style={styles.sectionLabel}>RECENT READINGS</Text>
                    {history.map(item => {
                      const st = statusFor(item);
                      const borderColor =
                        st === 'alert' ? theme.colors.error :
                        st === 'warning' ? theme.colors.accent :
                        theme.colors.success;
                      const badgeBg =
                        st === 'alert' ? theme.colors.errorSoft :
                        st === 'warning' ? theme.colors.accentSoft :
                        theme.colors.secondaryLight;
                      return (
                        <View key={item.id} style={[styles.historyCard, { borderLeftColor: borderColor }]}>
                          <View style={styles.historyTop}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.historyDate}>{formatDate(item.recorded_at)}</Text>
                              <Text style={styles.historyPondName}>{item.pond_name}</Text>
                            </View>
                            <View style={[styles.historyBadge, { backgroundColor: badgeBg }]}>
                              <Text style={[styles.historyBadgeText, { color: borderColor }]}>
                                {st === 'alert' ? 'ALERT' : st === 'warning' ? 'WARN' : 'NORMAL'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.historyMetricsRow}>
                            <View style={styles.historyMetricChip}>
                              <Text style={styles.historyMetricLabel}>TEMP</Text>
                              <Text style={styles.historyMetricValue}>{item.temperature ?? '—'}°C</Text>
                            </View>
                            <View style={styles.historyMetricChip}>
                              <Text style={styles.historyMetricLabel}>pH</Text>
                              <Text style={styles.historyMetricValue}>{item.ph ?? '—'}</Text>
                            </View>
                            <View style={styles.historyMetricChip}>
                              <Text style={styles.historyMetricLabel}>DO</Text>
                              <Text style={styles.historyMetricValue}>{item.dissolved_oxygen ?? '—'}</Text>
                            </View>
                            {item.ammonia != null && (
                              <View style={styles.historyMetricChip}>
                                <Text style={styles.historyMetricLabel}>NH₃</Text>
                                <Text style={styles.historyMetricValue}>{item.ammonia}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Pond selector modal */}
      <Modal visible={pondSelectorVisible} transparent animationType="slide" onRequestClose={() => setPondSelectorVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Pond</Text>
            <FlatList
              data={ponds}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item.id === selectedPondId && styles.modalItemSelected]}
                  onPress={() => { setSelectedPondId(item.id); setPondSelectorVisible(false); }}
                >
                  <Text style={styles.modalItemTitle}>{item.name}</Text>
                  <Text style={styles.modalItemMeta}>{item.subtitle}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setPondSelectorVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: theme.colors.textInverse,
    fontSize: 10,
    fontWeight: '800',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: theme.colors.primary },
  tabText: { color: theme.colors.textMuted, fontWeight: '700' },
  tabTextActive: { color: theme.colors.textPrimary },

  // Advisory banner
  alertBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  alertTitle: { color: theme.colors.textPrimary, fontWeight: '800' },
  alertText: { color: theme.colors.textSecondary, marginTop: 4, fontSize: 12, lineHeight: 18 },

  // Scroll content
  content: { paddingHorizontal: 16, paddingBottom: 120 },

  // Section labels
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  latestReadingDate: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -6,
    marginBottom: 10,
  },

  // Pond selector
  pondSelector: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...theme.shadows.sm,
  },
  pondSelectorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pondSelectorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pondSelectorFieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  pondSelectorTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  pondSelectorMeta: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  // Metric cards grid
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    borderLeftWidth: 4,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  metricBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  metricBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginBottom: 2,
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricUnit: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricRange: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Form card
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    padding: 14,
    gap: 4,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  fieldWrap: { width: '47%', marginBottom: 4 },
  fullField: { width: '100%' },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  fieldInput: {
    minHeight: 52,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  fieldInputFocused: {
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  notesInput: {
    minHeight: 96,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  notesInputFocused: {
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Save button
  saveButton: {
    marginTop: 18,
    height: 54,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glow,
  },
  saveButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '800',
    fontSize: 16,
  },

  // History cards
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  historyDate: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  historyPondName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  historyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  historyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  historyMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  historyMetricChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    minWidth: 52,
  },
  historyMetricLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  historyMetricValue: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },

  // Chart card
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 18,
  },

  // Empty states
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...theme.shadows.glow,
  },
  primaryButtonText: { color: theme.colors.textInverse, fontWeight: '800' },

  // Center loader
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36 },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalItemSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 10,
  },
  modalItemTitle: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 15 },
  modalItemMeta: { color: theme.colors.textMuted, marginTop: 4 },
  modalCloseButton: {
    marginTop: 14,
    height: 50,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: theme.colors.textPrimary, fontWeight: '800' },
});
