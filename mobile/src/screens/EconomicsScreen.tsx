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
import * as Location from 'expo-location';
import { useTheme } from '../ThemeContext';
import { geoService, economicsService } from '../services/apiService';
import { loadProfile } from '../services/profileService';

export default function EconomicsScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [landSize, setLandSize] = useState('');
  const [salinity, setSalinity] = useState('500');
  const [capital, setCapital] = useState('');
  const [riskTolerance, setRiskTolerance] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [farmerCategory, setFarmerCategory] = useState<'GENERAL' | 'WOMEN' | 'SC' | 'ST' | 'EBC'>('GENERAL');
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
  const [locating, setLocating] = useState(false);
  const [numberOfRasUnits, setNumberOfRasUnits] = useState('1');
  const [numberOfBioflocTanks, setNumberOfBioflocTanks] = useState('1');
  const [numberOfCages, setNumberOfCages] = useState('6');
  const [cageSpecies, setCageSpecies] = useState<'PANGASIUS' | 'TILAPIA'>('PANGASIUS');
  const [bioflocSpecies, setBioflocSpecies] = useState<'PANGASIUS' | 'MANGUR'>('PANGASIUS');
  const RAS_SPECIES_OPTIONS = [
    { label: 'Auto Recommend', value: '' },
    { label: 'Monosex GIFT Tilapia', value: 'Oreochromis niloticus' },
    { label: 'Pangasius', value: 'Pangasianodon hypophthalmus' },
    // Pearlspot removed — coastal southern India species, not cultivable in Bihar/UP winters
    { label: 'Pabda / Butter Catfish', value: 'Ompok pabda' },
  ];

  // ── Auto-locate: fill state/district from saved profile or GPS ──────────────
  const handleAutoLocate = async () => {
    setLocating(true);
    try {
      // First try: use the profile's saved location
      const profile = await loadProfile();
      if (profile.stateCode) {
        setStateCode(profile.stateCode);
        // Try to match a district from zones
        if (zones.length > 0) {
          const zoneForState = zones.find((z: any) => z.state_code === profile.stateCode);
          if (zoneForState?.district_codes?.[0]) {
            setDistrictCode(zoneForState.district_codes[0]);
          }
        }
        Alert.alert(t('economics.locationSet'), t('economics.locationSetBody', { stateCode: profile.stateCode }));
        return;
      }

      // Fallback: GPS reverse geocode
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('economics.permissionDenied'), t('economics.permissionDeniedBody'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      if (geo?.region) {
        // Map region name to state code heuristically
        const regionLower = geo.region.toLowerCase();
        const stateCodeMap: Record<string, string> = {
          bihar: 'BR', 'andhra pradesh': 'AP', 'west bengal': 'WB',
          odisha: 'OD', assam: 'AS', kerala: 'KL', 'tamil nadu': 'TN',
          gujarat: 'GJ', maharashtra: 'MH', karnataka: 'KA',
        };
        const matched = Object.entries(stateCodeMap).find(([k]) => regionLower.includes(k));
        if (matched) {
          setStateCode(matched[1]);
          Alert.alert(t('economics.locationDetected'), t('economics.locationDetectedWithState', { region: geo.region }));
        } else {
          Alert.alert(t('economics.locationDetected'), t('economics.locationDetectedManual', { region: geo.region }));
        }
      }
    } catch {
      Alert.alert(t('economics.locationError'), t('economics.locationErrorBody'));
    } finally {
      setLocating(false);
    }
  };

  const WATER_SOURCES = ['BOREWELL', 'OPEN_WELL', 'CANAL', 'RIVER', 'TANK'];
  const SPECIES_OPTIONS = [
    { label: 'Auto Recommend', value: '' },
    { label: 'Vannamei Shrimp', value: 'Litopenaeus vannamei' },
    // Black Tiger Shrimp removed — strictly coastal/maritime, not farmed in Bihar/UP
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

    // Fix #16: include BIOFLOC in the project type mapping so Biofloc users
    // get the correct freshwater advisory (Biofloc is a freshwater system).
    let projectType: 'FRESHWATER' | 'BRACKISH' | 'RAS' = 'FRESHWATER';
    if (pondSystem === 'RAS') {
      projectType = 'RAS';
    } else if (pondSystem === 'BIOFLOC' || pondSystem === 'CAGES') {
      projectType = 'FRESHWATER'; // Both Biofloc and Cage are freshwater systems
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
    // ── RAS path ──────────────────────────────────────────────────────────────
    if (pondSystem === 'RAS') {
      const units = parseInt(numberOfRasUnits || '0');
      if (!units || units < 1) {
        Alert.alert('Missing Information', 'Please enter the number of RAS units you want to set up.');
        return;
      }
      if (!stateCode || !districtCode) {
        Alert.alert('Missing Information', 'Please select your state and district.');
        return;
      }
      if (!capital) {
        Alert.alert('Missing Information', 'Please enter your available capital.');
        return;
      }

      setIsLoading(true);
      try {
        const payload: any = {
          systemType: 'RAS',
          numberOfRasUnits: units,
          availableCapitalInr: parseFloat(capital),
          riskTolerance,
          farmerCategory,
          stateCode,
          districtCode,
          // These are required by the route schema — send safe defaults for RAS
          // The backend simulateRAS() ignores them and uses fixed constants
          landSizeHectares: units * 0.01,    // 100 sqm per unit converted to hectares
          waterSourceSalinityUsCm: 500,
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
      return;
    }

    // ── Biofloc path ──────────────────────────────────────────────────────────
    if (pondSystem === 'BIOFLOC') {
      const tanks = parseInt(numberOfBioflocTanks || '0');
      if (!tanks || tanks < 1) {
        Alert.alert('Missing Information', 'Please enter the number of Biofloc tanks.');
        return;
      }
      if (!stateCode || !districtCode) {
        Alert.alert('Missing Information', 'Please select your state and district.');
        return;
      }
      if (!capital) {
        Alert.alert('Missing Information', 'Please enter your available capital.');
        return;
      }

      setIsLoading(true);
      try {
        const payload: any = {
          systemType: 'BIOFLOC',
          numberOfBioflocTanks: tanks,
          bioflocSpecies,                    // 'PANGASIUS' or 'MANGUR'
          availableCapitalInr: parseFloat(capital),
          riskTolerance,
          farmerCategory,
          stateCode,
          districtCode,
          // Required by route schema — safe defaults, ignored by simulateBiofloc()
          landSizeHectares: tanks * 0.0005,  // ~5 sqm per tank to hectares
          waterSourceSalinityUsCm: 200,
        };

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
      return;
    }

    // ── Cage path ─────────────────────────────────────────────────────────────────────────────
    if (pondSystem === 'CAGES') {
      const cages = parseInt(numberOfCages || '0');
      if (!cages || cages < 1) {
        Alert.alert('Missing Information', 'Please enter the number of cages.');
        return;
      }
      if (!stateCode || !districtCode) {
        Alert.alert('Missing Information', 'Please select your state and district.');
        return;
      }
      if (!capital) {
        Alert.alert('Missing Information', 'Please enter your available capital.');
        return;
      }
      setIsLoading(true);
      try {
        const payload: any = {
          systemType: 'CAGES',
          numberOfCages: cages,
          cageSpecies,
          availableCapitalInr: parseFloat(capital),
          riskTolerance,
          farmerCategory,
          stateCode,
          districtCode,
          landSizeHectares: cages * 0.0024,
          waterSourceSalinityUsCm: 200,
        };
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
      return;
    }

    // ── Non-RAS path (EARTHEN) ────────────────────────────────────────────────────────────────────────────────────
    if (!landSize || !capital || !stateCode || !districtCode) {
      Alert.alert(t('economics.missingInformation'), t('economics.missingInformationBody'));
      return;
    }

    setIsLoading(true);
    try {
      const landHectares = parseFloat(landSize) * 0.4047;
      const projectType = parseFloat(salinity || '0') > 1000 ? 'BRACKISH' : 'FRESHWATER';

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
        Alert.alert(t('economics.simulationError'), result.message || t('economics.simulationFailed'));
      }
    } catch (error) {
      Alert.alert(t('economics.connectionFailed'), t('economics.connectionFailedBody'));
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

  const districtEntries: { code: string; name: string }[] = [];
  zones.filter(z => z.state_code === stateCode).forEach(z => {
    const codes: string[] = z.district_codes || [];
    const names: string[] = z.district_names || [];
    codes.forEach((code: string, idx: number) => {
      if (!districtEntries.find(d => d.code === code)) {
        districtEntries.push({ code, name: names[idx] || code });
      }
    });
  });
  const relevantDistricts: { label: string; value: string }[] = districtEntries
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(d => ({ label: d.name, value: d.code }));
  const currentDistrictLabel = relevantDistricts.find(d => d.value === districtCode)?.label || districtCode || 'Select';

  const profileFields = [
    Boolean(stateCode),
    Boolean(districtCode),
    pondSystem === 'RAS'
      ? Boolean(numberOfRasUnits)
      : pondSystem === 'BIOFLOC'
      ? Boolean(numberOfBioflocTanks)
      : pondSystem === 'CAGES'
      ? Boolean(numberOfCages)
      : Boolean(landSize.trim()),
    pondSystem === 'RAS' || pondSystem === 'BIOFLOC' || pondSystem === 'CAGES' ? true : Boolean(salinity.trim()),
    Boolean(capital.trim()),
    Boolean(farmerCategory),
  ];
  const completedFieldCount = profileFields.filter(Boolean).length;
  const profileCompletionPercent = Math.round((completedFieldCount / profileFields.length) * 100);

  // Subsidy preview data
  const subsidyPercent = knowledgeInsights?.beneficiarySubsidyPercent;
  const centralPercent = knowledgeInsights?.fundingShare?.centralPercent;
  const statePercent = knowledgeInsights?.fundingShare?.statePercent;
  const categoryPreview = getCategorySubsidyPreview(farmerCategory, subsidyPercent);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('economics.profitabilitySimulator')}</Text>
          <Text style={styles.headerSubtitle}>{t('economics.roiSubsidyAnalysis')}</Text>
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
            <Text style={styles.progressEyebrow}>{t('economics.stepFarmProfile')}</Text>
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
            <Text style={styles.learnBannerTitle}>{t('economics.newHere')}</Text>
            <Text style={styles.learnBannerText}>{t('economics.newHereBody')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* ── STEP 1: Farming System — must be asked first ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="construct-outline" size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.sectionLabel}>FARMING SYSTEM</Text>
          </View>

          <Text style={styles.chipGroupLabel}>SELECT YOUR SYSTEM TYPE</Text>
          <View style={styles.chipRow}>
            {(['EARTHEN', 'BIOFLOC', 'RAS', 'CAGES'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, pondSystem === item && styles.chipActive]}
                onPress={() => setPondSystem(item)}
              >
                <Text style={[styles.chipText, pondSystem === item && styles.chipTextActive]}>
                  {item === 'EARTHEN' ? 'EARTHEN POND' : item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* RAS information card — only shown when RAS is selected */}
          {pondSystem === 'RAS' && (
            <View style={styles.rasInfoCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.chipGroupLabel, { marginBottom: 0 }]}>ABOUT RAS</Text>
              </View>
              <Text style={styles.rasInfoText}>
                Indoor controlled tank system. Water is recycled through bio-filters — only 10% replaced daily.
                Each standard unit uses a 90,000-litre tank and produces{' '}
                <Text style={{ fontWeight: '800', color: theme.colors.textPrimary }}>
                  1,620 kg per 6-month cycle
                </Text>
                , with 2 cycles per year.
              </Text>
              <View style={styles.rasStatRow}>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>100 m²</Text>
                  <Text style={styles.rasStatLabel}>Land/unit</Text>
                </View>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>Rs 7.5L</Text>
                  <Text style={styles.rasStatLabel}>Setup/unit</Text>
                </View>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>2 cycles</Text>
                  <Text style={styles.rasStatLabel}>Per year</Text>
                </View>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>Rs 4.86L</Text>
                  <Text style={styles.rasStatLabel}>Annual rev</Text>
                </View>
              </View>
            </View>
          )}

          {/* Biofloc information card — only shown when BIOFLOC is selected */}
          {pondSystem === 'BIOFLOC' && (
            <View style={styles.rasInfoCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.chipGroupLabel, { marginBottom: 0 }]}>ABOUT BIOFLOC</Text>
              </View>
              <Text style={styles.rasInfoText}>
                Zero water exchange system — fish waste is converted into protein-rich food by beneficial bacteria.
                Each 10,000-litre tank is a self-contained ecosystem. Feed costs are lower than RAS because fish
                eat the floc.{' '}
                <Text style={{ fontWeight: '800', color: theme.colors.error }}>
                  Requires 24/7 uninterrupted aeration.
                </Text>
              </Text>
              <View style={styles.rasStatRow}>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>10,000 L</Text>
                  <Text style={styles.rasStatLabel}>Per tank</Text>
                </View>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>Rs 1.07L</Text>
                  <Text style={styles.rasStatLabel}>Setup/tank</Text>
                </View>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>2 cycles</Text>
                  <Text style={styles.rasStatLabel}>Per year</Text>
                </View>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>24/7</Text>
                  <Text style={[styles.rasStatLabel, { color: theme.colors.error }]}>Aeration</Text>
                </View>
              </View>
            </View>
          )}

          {/* Cage culture information card */}
          {pondSystem === 'CAGES' && (
            <View style={styles.rasInfoCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.chipGroupLabel, { marginBottom: 0 }]}>ABOUT CAGE CULTURE</Text>
              </View>
              <Text style={styles.rasInfoText}>
                Floating cages in reservoirs or lakes. Standard cage: 6m x 4m x 4m (96 m3). NFDB promotes cage culture under Blue Revolution scheme.{" "}
                <Text style={{ fontWeight: "800", color: theme.colors.error }}>
                  Requires reservoir 1,000+ ha with 10m+ depth year-round.
                </Text>
              </Text>
              <View style={styles.rasStatRow}>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>96 m3</Text>
                  <Text style={styles.rasStatLabel}>Per cage</Text>
                </View>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>Rs 3L</Text>
                  <Text style={styles.rasStatLabel}>Setup/cage</Text>
                </View>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>4.6 MT</Text>
                  <Text style={styles.rasStatLabel}>Yield/cage</Text>
                </View>
                <View style={styles.rasStatItem}>
                  <Text style={styles.rasStatValue}>Rs 1.15L</Text>
                  <Text style={styles.rasStatLabel}>Net/cage</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Location & Scale */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
            </View>
            <Text style={[styles.sectionLabel, { flex: 1 }]}>{t('economics.locationScale')}</Text>
            <TouchableOpacity
              style={styles.autoLocateBtn}
              onPress={handleAutoLocate}
              activeOpacity={0.8}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons name="navigate-outline" size={14} color={theme.colors.primary} />
              )}
              <Text style={styles.autoLocateText}>
                {locating ? t('economics.locating') : t('economics.autoLocate')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <GhostPickerField
              label={t('economics.stateLabel')}
              value={statesList.find(s => s.value === stateCode)?.label || t('common.notSpecified')}
              icon="map-outline"
              onPress={() => setActiveModal('state')}
              theme={theme}
            />
            <GhostPickerField
              label={t('economics.districtLabel')}
              value={currentDistrictLabel}
              icon="pin-outline"
              onPress={() => setActiveModal('district')}
              theme={theme}
            />
          </View>

          {pondSystem === 'RAS' ? (
            <>
              <GhostInputField
                label="NUMBER OF RAS UNITS"
                value={numberOfRasUnits}
                onChangeText={setNumberOfRasUnits}
                suffix="Units"
                icon="cube-outline"
                isFocused={focusedField === 'rasUnits'}
                onFocus={() => setFocusedField('rasUnits')}
                onBlur={() => setFocusedField(null)}
                theme={theme}
              />
              {numberOfRasUnits ? (
                <View style={styles.rasLandHint}>
                  <Ionicons name="map-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.rasLandHintText}>
                    You will need at least{' '}
                    <Text style={{ fontWeight: '800', color: theme.colors.textPrimary }}>
                      {parseInt(numberOfRasUnits || '0') * 100} sq. meters
                    </Text>{' '}
                    of land for this setup
                  </Text>
                </View>
              ) : null}
            </>
          ) : pondSystem === 'BIOFLOC' ? (
            <>
              <GhostInputField
                label="NUMBER OF BIOFLOC TANKS"
                value={numberOfBioflocTanks}
                onChangeText={setNumberOfBioflocTanks}
                suffix="Tanks"
                icon="water-outline"
                isFocused={focusedField === 'bioflocTanks'}
                onFocus={() => setFocusedField('bioflocTanks')}
                onBlur={() => setFocusedField(null)}
                theme={theme}
              />
              {numberOfBioflocTanks ? (
                <View style={styles.rasLandHint}>
                  <Ionicons name="map-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.rasLandHintText}>
                    Each 10,000-litre tank needs approximately{' '}
                    <Text style={{ fontWeight: '800', color: theme.colors.textPrimary }}>
                      4–5 sq. meters
                    </Text>
                    {' '}of space ({parseInt(numberOfBioflocTanks || '0') * 5} sq. meters total)
                  </Text>
                </View>
              ) : null}
              {parseInt(numberOfBioflocTanks || '0') > 0 && parseInt(numberOfBioflocTanks || '0') < 7 ? (
                <View style={[styles.rasLandHint, { marginTop: 8, backgroundColor: theme.colors.accentSoft || theme.colors.primaryLight, borderRadius: 8, padding: 8 }]}>
                  <Ionicons name="warning-outline" size={13} color={theme.colors.accent} />
                  <Text style={[styles.rasLandHintText, { color: theme.colors.accent }]}>
                    <Text style={{ fontWeight: '800' }}>Bihar PMMSY scheme minimum is 7 tanks.</Text>
                    {' '}Below 7, no govt subsidy applies — you pay full CAPEX. Still useful for planning your own setup.
                  </Text>
                </View>
              ) : null}
            </>
          ) : pondSystem === 'CAGES' ? (
            <>
              <GhostInputField
                label="NUMBER OF CAGES"
                value={numberOfCages}
                onChangeText={setNumberOfCages}
                suffix="Cages"
                icon="apps-outline"
                isFocused={focusedField === 'cages'}
                onFocus={() => setFocusedField('cages')}
                onBlur={() => setFocusedField(null)}
                theme={theme}
              />
              {numberOfCages ? (
                <View style={styles.rasLandHint}>
                  <Ionicons name="information-circle-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.rasLandHintText}>
                    Each cage is 6m x 4m x 4m (96 m3). A battery of{' '}
                    <Text style={{ fontWeight: '800', color: theme.colors.textPrimary }}>
                      {parseInt(numberOfCages || '0')} cages
                    </Text>
                    {' '}yields approx{' '}
                    <Text style={{ fontWeight: '800', color: theme.colors.textPrimary }}>
                      {(parseInt(numberOfCages || '0') * 4.608).toFixed(1)} MT
                    </Text>
                    {' '}per 8-month cycle. Requires reservoir 1,000+ ha.
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <GhostInputField
              label={t('economics.landSizeLabel')}
              value={landSize}
              onChangeText={setLandSize}
              suffix="Acres"
              icon="resize-outline"
              isFocused={focusedField === 'land'}
              onFocus={() => setFocusedField('land')}
              onBlur={() => setFocusedField(null)}
              theme={theme}
            />
          )}
        </View>

        {/* Operational Data */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="water-outline" size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.sectionLabel}>{t('economics.operationalData')}</Text>
          </View>

          {/* Cage species selector */}
          {pondSystem === 'CAGES' && (
            <>
              <Text style={styles.chipGroupLabel}>CAGE SPECIES</Text>
              <View style={[styles.chipRow, { marginBottom: 16 }]}>
                <TouchableOpacity
                  style={[styles.chip, { flex: 1 }, cageSpecies === 'PANGASIUS' && styles.chipActive]}
                  onPress={() => setCageSpecies('PANGASIUS')}
                >
                  <Text style={[styles.chipText, cageSpecies === 'PANGASIUS' && styles.chipTextActive]}>
                    PANGASIUS
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, { flex: 1 }, cageSpecies === 'TILAPIA' && styles.chipActive]}
                  onPress={() => setCageSpecies('TILAPIA')}
                >
                  <Text style={[styles.chipText, cageSpecies === 'TILAPIA' && styles.chipTextActive]}>
                    GIFT TILAPIA
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rasLandHint}>
                <Ionicons name="fish-outline" size={13} color={theme.colors.textMuted} />
                <Text style={styles.rasLandHintText}>
                  {cageSpecies === 'PANGASIUS'
                    ? 'Stocking: 9,600/cage • Survival: 80% • Harvest: 600g • Sale: Rs 90/kg • Yield: 4.6 MT/cage'
                    : 'Stocking: 9,600/cage • Survival: 82% • Harvest: 500g • Sale: Rs 100/kg • Monosex only'}
                </Text>
              </View>
            </>
          )}

          {pondSystem !== 'RAS' && pondSystem !== 'BIOFLOC' && pondSystem !== 'CAGES' && (
            <GhostInputField
              label={t('economics.waterSalinityLabel')}
              value={salinity}
              onChangeText={setSalinity}
              suffix="uS/cm"
              icon="water-outline"
              isFocused={focusedField === 'salinity'}
              onFocus={() => setFocusedField('salinity')}
              onBlur={() => setFocusedField(null)}
              theme={theme}
            />
          )}

          {/* Biofloc species selector — shown only when BIOFLOC is selected */}
          {pondSystem === 'BIOFLOC' && (
            <>
              <Text style={styles.chipGroupLabel}>BIOFLOC SPECIES</Text>
              <View style={[styles.chipRow, { marginBottom: 16 }]}>
                <TouchableOpacity
                  style={[styles.chip, { flex: 1 }, bioflocSpecies === 'PANGASIUS' && styles.chipActive]}
                  onPress={() => setBioflocSpecies('PANGASIUS')}
                >
                  <Text style={[styles.chipText, bioflocSpecies === 'PANGASIUS' && styles.chipTextActive]}>
                    PANGASIUS
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, { flex: 1 }, bioflocSpecies === 'MANGUR' && styles.chipActive]}
                  onPress={() => setBioflocSpecies('MANGUR')}
                >
                  <Text style={[styles.chipText, bioflocSpecies === 'MANGUR' && styles.chipTextActive]}>
                    MANGUR / SINGHI
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rasLandHint}>
                <Ionicons name="fish-outline" size={13} color={theme.colors.textMuted} />
                <Text style={styles.rasLandHintText}>
                  {bioflocSpecies === 'PANGASIUS'
                    ? 'Stocking: 1,350 fish/tank avg • Harvest: 500g • Sale: Rs 85/kg'
                    : 'Stocking: 4,500 fish/tank avg • Harvest: 250g • Sale: Rs 180/kg (premium)'}
                </Text>
              </View>
            </>
          )}

          <Text style={styles.chipGroupLabel}>{t('economics.farmerCategoryLabel')}</Text>
          <View style={styles.chipRow}>
            {(['GENERAL', 'WOMEN', 'SC', 'ST', 'EBC'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, farmerCategory === item && styles.chipActive]}
                onPress={() => setFarmerCategory(item as any)}
              >
                <Text style={[styles.chipText, farmerCategory === item && styles.chipTextActive]}>{t(`economics.categories.${item}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.chipGroupLabel, { marginTop: 16 }]}>{t('economics.waterSourceLabel')}</Text>
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
            <Text style={styles.sectionLabel}>{t('economics.financialSettings')}</Text>
          </View>

          <GhostInputField
            label={t('economics.initialCapital')}
            value={capital}
            onChangeText={setCapital}
            prefix="Rs"
            icon="wallet-outline"
            isFocused={focusedField === 'capital'}
            onFocus={() => setFocusedField('capital')}
            onBlur={() => setFocusedField(null)}
            theme={theme}
          />

          <Text style={styles.chipGroupLabel}>{t('economics.riskTolerance')}</Text>
          <View style={styles.riskRow}>
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((risk) => {
              const isActive = riskTolerance === risk;
              const dotColor = risk === 'LOW'
                ? theme.colors.success
                : risk === 'MEDIUM'
                ? theme.colors.accent
                : theme.colors.error;
              const riskLabel = risk === 'LOW'
                ? t('economics.lowRisk')
                : risk === 'MEDIUM'
                ? t('economics.mediumRisk')
                : t('economics.highRisk');
              return (
                <TouchableOpacity
                  key={risk}
                  style={[styles.riskOption, isActive && { borderColor: dotColor, backgroundColor: theme.colors.surfaceLow }]}
                  onPress={() => setRiskTolerance(risk)}
                >
                  <View style={[styles.riskDot, { backgroundColor: dotColor }, !isActive && styles.riskDotInactive]} />
                  <Text style={[styles.riskText, isActive && { color: dotColor }]}>{riskLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {pondSystem !== 'BIOFLOC' && (
            <GhostPickerField
              label={t('economics.preferredSpecies')}
              value={
                (pondSystem === 'RAS' ? RAS_SPECIES_OPTIONS : SPECIES_OPTIONS)
                  .find(item => item.value === preferredSpecies)?.label || t('common.notSpecified')
              }
              icon="fish-outline"
              onPress={() => setActiveModal('species')}
              theme={theme}
            />
          )}
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
                    {categoryPreview.percentLabel}
                  </Text>
                  <Text style={styles.subsidyEligibility}>
                    {getPolicyPreviewDescription(knowledgeInsights, farmerCategory)}
                  </Text>
                  <Text style={styles.subsidyCategoryMeta}>{categoryPreview.note}</Text>
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
        data={pondSystem === 'RAS' ? RAS_SPECIES_OPTIONS : SPECIES_OPTIONS}
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
  if (!knowledgeInsights) {
    const fallback = getCategorySubsidyPreview(farmerCategory);
    return `Choose your state to load policy-backed guidance. The preview is currently showing the default ${fallback.percentLabel} assumption for ${fallback.label}.`;
  }
  const subsidy = knowledgeInsights?.beneficiarySubsidyPercent;
  const central = knowledgeInsights?.fundingShare?.centralPercent;
  const state = knowledgeInsights?.fundingShare?.statePercent;
  const categoryLabel = getCategorySubsidyPreview(farmerCategory, subsidy).label;
  if (subsidy == null) return 'The app has not found a subsidy percentage for this profile yet.';
  if (central != null && state != null) {
    return `For a ${categoryLabel} applicant — up to ${subsidy}% support on eligible project cost. Centre:State split is ${central}:${state}.`;
  }
  return `For a ${categoryLabel} applicant — up to ${subsidy}% support on eligible project cost.`;
}

function getCategorySubsidyPreview(
  farmerCategory: 'GENERAL' | 'WOMEN' | 'SC' | 'ST' | 'EBC' | string,
  subsidyPercent?: number | null
) {
  // Bihar PMMSY/state yojana rates: General 50%, SC/ST/EBC 70%, Women 70%
  const fallbackPercent = farmerCategory === 'GENERAL' ? 50 : 70;

  switch (farmerCategory) {
    case 'WOMEN':
      return {
        label: 'women beneficiary',
        percentLabel: `${subsidyPercent ?? fallbackPercent}%`,
        note: 'Women applicants receive priority-beneficiary subsidy (70%) under Bihar PMMSY/state yojanas.',
      };
    case 'SC':
      return {
        label: 'SC beneficiary',
        percentLabel: `${subsidyPercent ?? fallbackPercent}%`,
        note: 'SC applicants receive 70% subsidy under Bihar PMMSY. Solar pump scheme offers 80% to all categories.',
      };
    case 'ST':
      return {
        label: 'ST beneficiary',
        percentLabel: `${subsidyPercent ?? fallbackPercent}%`,
        note: 'ST applicants receive 70% subsidy under Bihar PMMSY. DAJGUA tribal scheme offers 100% for Banka/Bhagalpur.',
      };
    case 'EBC':
      return {
        label: 'EBC beneficiary',
        percentLabel: `${subsidyPercent ?? fallbackPercent}%`,
        note: 'Extremely Backward Class applicants receive 70% subsidy — same as SC/ST under Bihar state yojanas.',
      };
    case 'GENERAL':
    default:
      return {
        label: 'general category beneficiary',
        percentLabel: `${subsidyPercent ?? fallbackPercent}%`,
        note: 'General applicants receive 50% subsidy under Bihar PMMSY. Special pond packages and solar pumps available.',
      };
  }
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
          returnKeyType="done"
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
    height: 52,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
    paddingVertical: 0,
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
  autoLocateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  autoLocateText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
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
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLow,
    minHeight: 40,
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
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
    flexWrap: 'wrap',
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
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  subsidyEligibility: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  subsidyCategoryMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
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

  // RAS-specific styles
  rasInfoCard: {
    marginTop: 14,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    backgroundColor: theme.colors.primaryLight,
    padding: 14,
  },
  rasInfoText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  rasStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rasStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  rasStatValue: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  rasStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  rasLandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  rasLandHintText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },

  // Modal
  modalOverlay: {    flex: 1,
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
