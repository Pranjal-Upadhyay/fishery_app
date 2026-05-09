import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { geoService, economicsService } from '../services/apiService';

export default function EconomicsScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [landSize, setLandSize] = useState('');
  const [salinity, setSalinity] = useState('500');
  const [capital, setCapital] = useState('');
  const [riskTolerance, setRiskTolerance] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [farmerCategory, setFarmerCategory] = useState<'GENERAL' | 'WOMEN' | 'SC' | 'ST'>('GENERAL');
  const [stateCode, setStateCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [preferredSpecies, setPreferredSpecies] = useState<string>('');
  const [pondSystem, setPondSystem] = useState<'EARTHEN' | 'BIOFLOC' | 'RAS' | 'CAGES'>('EARTHEN');
  const [waterSource, setWaterSource] = useState('BOREWELL');
  const [isLoading, setIsLoading] = useState(false);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<'state' | 'district' | 'species' | null>(null);
  const [knowledgeInsights, setKnowledgeInsights] = useState<any | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const WATER_SOURCES = ['BOREWELL', 'OPEN_WELL', 'CANAL', 'RIVER', 'TANK'];
  const SPECIES_OPTIONS = [
    { label: 'Auto Recommend', value: '' },
    { label: 'Vannamei Shrimp', value: 'Litopenaeus vannamei' },
    { label: 'Black Tiger Shrimp', value: 'Penaeus monodon' },
    { label: 'Pangasius', value: 'Pangasianodon hypophthalmus' },
    { label: 'Tilapia', value: 'Oreochromis niloticus' },
    { label: 'Rohu', value: 'Labeo rohita' },
  ];

  useEffect(() => {
    (async () => {
      try {
        const response = await geoService.getZones();
        if (response.success && response.data.length > 0) {
          setZones(response.data);
          const statesSeen = new Map<string, any>();
          response.data.forEach((z: any) => { if (!statesSeen.has(z.state_code)) statesSeen.set(z.state_code, z); });
          const sortedStates = Array.from(statesSeen.values()).sort((a, b) =>
            (a.zone_name || a.state_code).localeCompare(b.zone_name || b.state_code)
          );
          const firstState = sortedStates[0];
          if (firstState) {
            setStateCode(firstState.state_code);
            const firstDistrict = firstState.district_codes?.[0];
            if (firstDistrict) setDistrictCode(firstDistrict);
          }
        }
      } catch (error) {
        console.error('Failed to fetch zones for economics', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (!stateCode) return;

    let projectType: 'FRESHWATER' | 'BRACKISH' | 'RAS' = 'FRESHWATER';
    if (pondSystem === 'RAS') {
      projectType = 'RAS';
    } else {
      projectType = parseFloat(salinity || '0') > 1000 ? 'BRACKISH' : 'FRESHWATER';
    }

    let isMounted = true;
    (async () => {
      try {
        setAdvisoryLoading(true);
        const response = await economicsService.getAdvisory({
          stateCode,
          farmerCategory,
          projectType: projectType as any,
        });
        if (isMounted && response.success) {
          setKnowledgeInsights(response.data?.knowledgeInsights ?? null);
        }
      } catch (error) {
        if (isMounted) setKnowledgeInsights(null);
        console.error('Failed to fetch economics advisory', error);
      } finally {
        if (isMounted) setAdvisoryLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [stateCode, farmerCategory, salinity, pondSystem]);

  const runSimulation = async () => {
    if (!landSize || !capital || !stateCode || !districtCode) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const landHectares = parseFloat(landSize) * 0.4047;

      let projectType: string;
      if (pondSystem === 'RAS') {
        projectType = 'RAS';
      } else if (pondSystem === 'BIOFLOC') {
        projectType = parseFloat(salinity || '0') > 1000 ? 'BRACKISH' : 'FRESHWATER';
      } else {
        projectType = parseFloat(salinity || '0') > 1000 ? 'BRACKISH' : 'FRESHWATER';
      }

      const payload: any = {
        landSizeHectares: landHectares,
        waterSourceSalinityUsCm: parseFloat(salinity),
        availableCapitalInr: parseFloat(capital),
        riskTolerance,
        farmerCategory,
        stateCode,
        districtCode,
        projectType,
        systemType: pondSystem,
        waterSourceType: waterSource,
      };

      if (preferredSpecies) payload.preferredSpecies = [preferredSpecies];

      const result = await economicsService.simulate(payload);
      if (result.success) {
        navigation.navigate('EconomicsResult', { simulationData: result.data });
      } else {
        Alert.alert('Simulation Error', result.message || 'Failed to calculate ROI.');
      }
    } catch (error) {
      Alert.alert('Connection Failed', 'Could not reach simulation server.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const statesMap = new Map<string, string>();
  zones.forEach(z => { if (!statesMap.has(z.state_code)) statesMap.set(z.state_code, z.zone_name); });
  const statesList = Array.from(statesMap.entries())
    .map(([value, label]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const allDistrictCodes: string[] = [];
  zones.filter(z => z.state_code === stateCode).forEach(z => {
    const codes: string[] = z.district_codes || [];
    const names: string[] = z.district_names || [];
    codes.forEach((code: string, idx: number) => {
      if (!allDistrictCodes.includes(code)) allDistrictCodes.push(names[idx] || code);
    });
  });
  const relevantDistricts: { label: string; value: string }[] = allDistrictCodes
    .sort()
    .map(d => ({ label: d, value: d }));
  const currentDistrictLabel = relevantDistricts.find(d => d.value === districtCode)?.label || districtCode || 'Select';

  const profileFields = [
    Boolean(stateCode),
    Boolean(districtCode),
    Boolean(landSize.trim()),
    Boolean(salinity.trim()),
    Boolean(capital.trim()),
    Boolean(farmerCategory),
  ];
  const completedFieldCount = profileFields.filter(Boolean).length;
  const profileCompletionPercent = Math.round((completedFieldCount / profileFields.length) * 100);

  // Subsidy preview data
  const subsidyPercent = knowledgeInsights?.beneficiarySubsidyPercent;
  const centralPercent = knowledgeInsights?.fundingShare?.centralPercent;
  const statePercent = knowledgeInsights?.fundingShare?.statePercent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Profitability Simulator</Text>
          <Text style={styles.headerSubtitle}>ROI & subsidy analysis</Text>
        </View>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() =>
            navigation.navigate('PolicyGuidance', {
              knowledgeInsights,
              stateCode,
              farmerCategory,
            })
          }
        >
          <Ionicons name="help-circle-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressEyebrow}>STEP 1 OF 3 — FARM PROFILE</Text>
            <Text style={styles.progressPercent}>{profileCompletionPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${profileCompletionPercent}%` as any }]} />
          </View>
        </View>

        {/* Learn banner */}
        <TouchableOpacity
          style={styles.learnBanner}
          onPress={() =>
            navigation.navigate('LearningCenter', {
              knowledgeInsights,
              stateCode,
              farmerCategory,
            })
          }
          activeOpacity={0.85}
        >
          <View style={styles.learnBannerIcon}>
            <Ionicons name="school-outline" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.learnBannerCopy}>
            <Text style={styles.learnBannerTitle}>New here?</Text>
            <Text style={styles.learnBannerText}>
              Learn FCR, BCR, subsidy logic, land needs, and how this business works in simple terms.
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Location & Scale */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.sectionLabel}>LOCATION & SCALE</Text>
          </View>

          <View style={styles.row}>
            <GhostPickerField
              label="STATE"
              value={statesList.find(s => s.value === stateCode)?.label || 'Select'}
              icon="map-outline"
              onPress={() => setActiveModal('state')}
              theme={theme}
            />
            <GhostPickerField
              label="DISTRICT"
              value={currentDistrictLabel}
              icon="pin-outline"
              onPress={() => setActiveModal('district')}
              theme={theme}
            />
          </View>

          <GhostInputField
            label="LAND SIZE"
            value={landSize}
            onChangeText={setLandSize}
            suffix="Acres"
            icon="resize-outline"
            isFocused={focusedField === 'land'}
            onFocus={() => setFocusedField('land')}
            onBlur={() => setFocusedField(null)}
            theme={theme}
          />
        </View>

        {/* Operational Data */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="water-outline" size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.sectionLabel}>OPERATIONAL DATA</Text>
          </View>

          <GhostInputField
            label="WATER SALINITY"
            value={salinity}
            onChangeText={setSalinity}
            suffix="uS/cm"
            icon="water-outline"
            isFocused={focusedField === 'salinity'}
            onFocus={() => setFocusedField('salinity')}
            onBlur={() => setFocusedField(null)}
            theme={theme}
          />

          <Text style={styles.chipGroupLabel}>FARMER CATEGORY</Text>
          <View style={styles.chipRow}>
            {['GENERAL', 'WOMEN', 'SC', 'ST'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, farmerCategory === item && styles.chipActive]}
                onPress={() => setFarmerCategory(item as any)}
              >
                <Text style={[styles.chipText, farmerCategory === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.chipGroupLabel, { marginTop: 16 }]}>POND SYSTEM</Text>
          <View style={styles.chipRow}>
            {(['EARTHEN', 'BIOFLOC', 'RAS', 'CAGES'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, pondSystem === item && styles.chipActive]}
                onPress={() => setPondSystem(item)}
              >
                <Text style={[styles.chipText, pondSystem === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.chipGroupLabel, { marginTop: 16 }]}>WATER SOURCE</Text>
          <View style={styles.chipRow}>
            {WATER_SOURCES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, waterSource === item && styles.chipActive]}
                onPress={() => setWaterSource(item)}
              >
                <Text style={[styles.chipText, waterSource === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Financial Settings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.sectionLabel}>FINANCIAL SETTINGS</Text>
          </View>

          <GhostInputField
            label="INITIAL CAPITAL"
            value={capital}
            onChangeText={setCapital}
            prefix="Rs"
            icon="wallet-outline"
            isFocused={focusedField === 'capital'}
            onFocus={() => setFocusedField('capital')}
            onBlur={() => setFocusedField(null)}
            theme={theme}
          />

          <Text style={styles.chipGroupLabel}>RISK TOLERANCE</Text>
          <View style={styles.riskRow}>
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((risk, idx) => {
              const isActive = riskTolerance === risk;
              const dotColor = risk === 'LOW'
                ? theme.colors.success
                : risk === 'MEDIUM'
                ? theme.colors.accent
                : theme.colors.error;
              return (
                <TouchableOpacity
                  key={risk}
                  style={[styles.riskOption, isActive && { borderColor: dotColor, backgroundColor: theme.colors.surfaceLow }]}
                  onPress={() => setRiskTolerance(risk)}
                >
                  <View style={[styles.riskDot, { backgroundColor: dotColor }, !isActive && styles.riskDotInactive]} />
                  <Text style={[styles.riskText, isActive && { color: dotColor }]}>{risk}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <GhostPickerField
            label="PREFERRED SPECIES"
            value={SPECIES_OPTIONS.find(item => item.value === preferredSpecies)?.label || 'Auto Recommend'}
            icon="fish-outline"
            onPress={() => setActiveModal('species')}
            theme={theme}
          />
        </View>

        {/* Subsidy Preview — bento grid if data loaded */}
        <View style={styles.sectionCard}>
          <View style={styles.subsidyHeader}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.secondary} />
              </View>
              <Text style={[styles.sectionLabel, { color: theme.colors.secondary }]}>SUBSIDY PREVIEW</Text>
            </View>
            {advisoryLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </View>

          {knowledgeInsights ? (
            <>
              {/* Subsidy cards with colored left border */}
              <View style={styles.subsidyCardRow}>
                <View style={[styles.subsidyCard, { borderLeftColor: theme.colors.primary }]}>
                  <Text style={styles.subsidyCardLabel}>CENTRAL SHARE</Text>
                  <Text style={styles.subsidyCardValue}>
                    {centralPercent != null ? `${centralPercent}%` : 'N/A'}
                  </Text>
                  <Ionicons
                    name="business-outline"
                    size={24}
                    color={theme.colors.primary}
                    style={styles.subsidyCardGhostIcon}
                  />
                </View>
                <View style={[styles.subsidyCard, { borderLeftColor: theme.colors.secondary }]}>
                  <Text style={styles.subsidyCardLabel}>STATE SHARE</Text>
                  <Text style={[styles.subsidyCardValue, { color: theme.colors.secondary }]}>
                    {statePercent != null ? `${statePercent}%` : 'N/A'}
                  </Text>
                  <Ionicons
                    name="flag-outline"
                    size={24}
                    color={theme.colors.secondary}
                    style={styles.subsidyCardGhostIcon}
                  />
                </View>
                <View style={[styles.subsidyCard, { borderLeftColor: theme.colors.accent }]}>
                  <Text style={styles.subsidyCardLabel}>YOU PAY</Text>
                  <Text style={[styles.subsidyCardValue, { color: theme.colors.accent }]}>
                    {subsidyPercent != null ? `${100 - subsidyPercent}%` : 'N/A'}
                  </Text>
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={theme.colors.accent}
                    style={styles.subsidyCardGhostIcon}
                  />
                </View>
              </View>

              <View style={styles.subsidySchemeRow}>
                <View style={[styles.subsidySchemeCard, { borderLeftColor: theme.colors.primary }]}>
                  <Text style={styles.subsidySchemeName}>PMMSY — Beneficiary Subsidy</Text>
                  <Text style={styles.subsidySchemeValue}>
                    {subsidyPercent != null ? `${subsidyPercent}%` : 'Pending'}
                  </Text>
                  <Text style={styles.subsidyEligibility}>
                    {getPolicyPreviewDescription(knowledgeInsights, farmerCategory)}
                  </Text>
                </View>
              </View>

              {knowledgeInsights?.stateBenchmarks?.length ? (
                <View style={styles.benchmarkList}>
                  {knowledgeInsights.stateBenchmarks.slice(0, 2).map((item: any) => (
                    <View key={item.idSlug} style={styles.benchmarkItem}>
                      <View style={styles.benchmarkDot} />
                      <Text style={styles.benchmarkLabel}>{item.metricName}</Text>
                      <Text style={styles.benchmarkValue}>
                        {formatKnowledgeValue(item.numericValue, item.unit)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.subsidyHint}>
                  This state uses general assumptions — no special cost overrides in the seeded knowledge set.
                </Text>
              )}

              <TouchableOpacity
                style={styles.subsidyLink}
                onPress={() =>
                  navigation.navigate('PolicyGuidance', {
                    knowledgeInsights,
                    stateCode,
                    farmerCategory,
                  })
                }
              >
                <Text style={styles.subsidyLinkText}>Learn what these numbers mean</Text>
                <Ionicons name="arrow-forward" size={15} color={theme.colors.primary} />
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.subsidyHint}>
              Choose your state and farmer category to preview policy-backed subsidy guidance before running the simulation.
            </Text>
          )}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
          onPress={runSimulation}
          disabled={isLoading}
          activeOpacity={0.88}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <View style={styles.ctaInner}>
              <Ionicons name="calculator-outline" size={20} color={theme.colors.textInverse} />
              <Text style={styles.ctaText}>Calculate ROI</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      <SelectionModal
        visible={activeModal === 'state'}
        title="Select State"
        data={statesList}
        onClose={() => setActiveModal(null)}
        onSelect={(value: string) => {
          setStateCode(value);
          setDistrictCode('');
        }}
        theme={theme}
      />

      <SelectionModal
        visible={activeModal === 'district'}
        title="Select District"
        data={relevantDistricts}
        onClose={() => setActiveModal(null)}
        onSelect={(value: string) => setDistrictCode(value)}
        theme={theme}
      />

      <SelectionModal
        visible={activeModal === 'species'}
        title="Select Species"
        data={SPECIES_OPTIONS}
        onClose={() => setActiveModal(null)}
        onSelect={(value: string) => setPreferredSpecies(value)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatKnowledgeValue(value: number | null | undefined, unit?: string | null) {
  if (value == null) return 'N/A';
  switch (unit) {
    case 'PERCENT': return `${value}%`;
    case 'INR': return `Rs ${value.toLocaleString('en-IN')}`;
    case 'INR_PER_KG': return `Rs ${value}/kg`;
    case 'INR_PER_HA': return `Rs ${value.toLocaleString('en-IN')}/ha`;
    case 'INR_PER_50M3': return `Rs ${value.toLocaleString('en-IN')}/50m3`;
    default: return `${value}`;
  }
}

function getPolicyPreviewDescription(knowledgeInsights: any, farmerCategory: string) {
  if (!knowledgeInsights) return 'Choose your state and category to load policy-backed guidance.';
  const subsidy = knowledgeInsights?.beneficiarySubsidyPercent;
  const central = knowledgeInsights?.fundingShare?.centralPercent;
  const state = knowledgeInsights?.fundingShare?.statePercent;
  const categoryLabel = farmerCategory === 'GENERAL' ? 'general category' : farmerCategory.toLowerCase();
  if (subsidy == null) return 'The app has not found a subsidy percentage for this profile yet.';
  if (central != null && state != null) {
    return `For a ${categoryLabel} applicant — up to ${subsidy}% support on eligible project cost. Centre:State split is ${central}:${state}.`;
  }
  return `For a ${categoryLabel} applicant — up to ${subsidy}% support on eligible project cost.`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function GhostPickerField({ label, value, icon, onPress, theme }: any) {
  return (
    <View style={ghostStyles(theme).wrap}>
      <Text style={ghostStyles(theme).label}>{label}</Text>
      <TouchableOpacity style={ghostStyles(theme).row} onPress={onPress} activeOpacity={0.8}>
        <Ionicons name={icon} size={16} color={theme.colors.textMuted} />
        <Text style={ghostStyles(theme).value}>{value}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function GhostInputField({ label, value, onChangeText, prefix, suffix, icon, isFocused, onFocus, onBlur, theme }: any) {
  return (
    <View style={ghostStyles(theme).wrap}>
      <Text style={ghostStyles(theme).label}>{label}</Text>
      <View style={[ghostStyles(theme).row, isFocused && ghostStyles(theme).rowFocused]}>
        <Ionicons name={icon} size={16} color={isFocused ? theme.colors.primary : theme.colors.textMuted} />
        {prefix ? <Text style={[ghostStyles(theme).unit, isFocused && { color: theme.colors.primary }]}>{prefix}</Text> : null}
        <TextInput
          style={ghostStyles(theme).input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholderTextColor={theme.colors.textMuted}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {suffix ? <Text style={[ghostStyles(theme).unit, isFocused && { color: theme.colors.primary }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

// Using a factory rather than a hook since this is not called conditionally
const ghostStyles = (theme: any) => ({
  wrap: { marginBottom: 14, flex: 1 } as any,
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLow,
    paddingHorizontal: 14,
  },
  rowFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  value: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  unit: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700' as const,
  },
});

function SelectionModal({ visible, title, data, onClose, onSelect, theme }: any) {
  const styles = getStyles(theme);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalDragHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView
            style={styles.modalScrollArea}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {(data || []).map((item: { label: string; value: string }) => (
              <TouchableOpacity
                key={item.value}
                style={styles.modalItem}
                activeOpacity={0.7}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={styles.modalItemText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGlass,
  },
  headerSpacer: { width: 32 },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  headerAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },

  // Progress
  progressSection: { marginBottom: 16 },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressEyebrow: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  progressPercent: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },

  // Learn banner
  learnBanner: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  learnBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  learnBannerCopy: { flex: 1 },
  learnBannerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  learnBannerText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  // Section card
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },

  // Chips
  chipGroupLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  chipTextActive: {
    color: theme.colors.textInverse,
  },

  // Risk tolerance
  riskRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  riskOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLow,
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  riskDotInactive: {
    opacity: 0.3,
  },
  riskText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  // Subsidy section
  subsidyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subsidyCardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  subsidyCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
    padding: 12,
    overflow: 'hidden',
  },
  subsidyCardLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  subsidyCardValue: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  subsidyCardGhostIcon: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    opacity: 0.12,
  },
  subsidySchemeRow: {
    marginBottom: 12,
  },
  subsidySchemeCard: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    padding: 14,
  },
  subsidySchemeName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  subsidySchemeValue: {
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  subsidyEligibility: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  benchmarkList: {
    gap: 8,
    marginBottom: 12,
  },
  benchmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  benchmarkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  benchmarkLabel: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  benchmarkValue: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  subsidyHint: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  subsidyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  subsidyLinkText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },

  // CTA
  ctaButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaText: {
    color: theme.colors.textInverse,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '80%',
    minHeight: 300,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalScrollArea: { flex: 1 },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalItemText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  modalClose: {
    marginTop: 14,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalCloseText: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
});
