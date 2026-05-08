import React, { useState, useEffect, useRef, Component } from 'react';
import {
  View as RNView,
  Text as RNText,
  StyleSheet,
  TouchableOpacity as RNTouchableOpacity,
  Alert,
  ActivityIndicator as RNActivityIndicator,
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
  Modal as RNModal,
  FlatList as RNFlatList,
  Image as RNImage,
  Linking as RNLinking,
} from 'react-native';

const View = RNView as any;
const Text = RNText as any;
const TouchableOpacity = RNTouchableOpacity as any;
const ActivityIndicator = RNActivityIndicator as any;
const ScrollView = RNScrollView as any;
const TextInput = RNTextInput as any;
const Modal = RNModal as any;
const FlatList = RNFlatList as any;
const Image = RNImage as any;
const Linking = RNLinking as any;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { geoService } from '../services/apiService';
import { useNavigation } from '@react-navigation/native';

// Lazy-import MapView so a native crash here doesn't kill the whole app
let MapView: any = null;
let Marker: any = null;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
} catch (e) {
  // react-native-maps not available (web, or native init failure)
}

import * as Location from 'expo-location';

// ─── Error Boundary (Cause A fix) ─────────────────────────────────────────────
// Wrapping MapView in this ensures a native Maps crash never propagates to crash
// the entire app. Instead it shows a friendly fallback within the Maps screen.
interface EBState { hasError: boolean; errorMessage: string }
class MapErrorBoundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, errorMessage: '' };
  static getDerivedStateFromError(error: any): EBState {
    return { hasError: true, errorMessage: error?.message || 'Map failed to load' };
  }
  componentDidCatch(error: any, info: any) {
    console.warn('[MapScreen] MapView crashed:', error, info);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const WATER_SOURCES = [
  { label: 'Borewell', value: 'BOREWELL' },
  { label: 'Open Well', value: 'OPEN_WELL' },
  { label: 'Canal', value: 'CANAL' },
  { label: 'River', value: 'RIVER' },
  { label: 'Tank', value: 'TANK' },
];

const STATE_MAP: Record<string, string> = {
  "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", "Assam": "AS",
  "Bihar": "BR", "Chhattisgarh": "CT", "Goa": "GA", "Gujarat": "GJ",
  "Haryana": "HR", "Himachal Pradesh": "HP", "Jharkhand": "JH",
  "Karnataka": "KA", "Kerala": "KL", "Madhya Pradesh": "MP",
  "Maharashtra": "MH", "Manipur": "MN", "Meghalaya": "ML",
  "Mizoram": "MZ", "Nagaland": "NL", "Odisha": "OR", "Punjab": "PB",
  "Rajasthan": "RJ", "Sikkim": "SK", "Tamil Nadu": "TN",
  "Telangana": "TG", "Tripura": "TR", "Uttar Pradesh": "UP",
  "Uttarakhand": "UT", "West Bengal": "WB",
  "Andaman and Nicobar Islands": "AN", "Chandigarh": "CH",
  "Dadra and Nagar Haveli and Daman and Diu": "DN", "Delhi": "DL",
  "Jammu and Kashmir": "JK", "Ladakh": "LA", "Lakshadweep": "LD",
  "Puducherry": "PY"
};

interface NominatimResult {
  display_name: string;
  address: {
    state?: string;
    state_district?: string;
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
  };
}

async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FisheryApp/1.0 (contact@fisheryapp.in)' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function MapScreen() {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [suitabilityData, setSuitabilityData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(true);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [mapAvailable, setMapAvailable] = useState<boolean>(!!MapView);
  const scrollViewRef = useRef<any>(null);

  // Cause B fix: mounted guard — never call setState after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Form state
  const [stateCode, setStateCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [waterSource, setWaterSource] = useState('BOREWELL');
  const [salinity, setSalinity] = useState('');

  // Dropdown states
  const [zones, setZones] = useState<any[]>([]);
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [isWaterOpen, setIsWaterOpen] = useState(false);

  // Load zones
  useEffect(() => {
    (async () => {
      try {
        const response = await geoService.getZones();
        if (!isMounted.current) return;
        if (response.success && response.data.length > 0) {
          setZones(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch zones', error);
      }
    })();
  }, []);

  // Set default state/district when zones arrive — pick alphabetically first state
  useEffect(() => {
    if (zones.length > 0 && !stateCode) {
      const statesSeen = new Map<string, any>();
      zones.forEach(z => { if (!statesSeen.has(z.state_code)) statesSeen.set(z.state_code, z); });
      const sorted = Array.from(statesSeen.values()).sort((a, b) =>
        (a.zone_name || a.state_code).localeCompare(b.zone_name || b.state_code)
      );
      const first = sorted[0];
      if (first) {
        setStateCode(first.state_code);
        if (first.district_codes?.length > 0) setDistrictCode(first.district_codes[0]);
      }
    }
  }, [zones]);

  // Cause D fix: safe null-checks throughout autoFillLocation
  const lastGeocodedCoords = useRef<{ lat: number; lng: number } | null>(null);

  const autoFillLocation = async (loc: Location.LocationObject, force: boolean = false) => {
    try {
      if (!force && lastGeocodedCoords.current) {
        const dLat = Math.abs(lastGeocodedCoords.current.lat - loc.coords.latitude);
        const dLng = Math.abs(lastGeocodedCoords.current.lng - loc.coords.longitude);
        if (dLat < 0.0005 && dLng < 0.0005) return;
      }
      lastGeocodedCoords.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };

      const nominatim = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      if (!isMounted.current) return;
      // Cause D fix: guard .address access
      if (!nominatim || !nominatim.address) return;

      setAddress(nominatim.display_name || 'Unknown Location');

      const stateName = nominatim.address.state;
      const districtName = nominatim.address.state_district
        || nominatim.address.county
        || nominatim.address.city
        || nominatim.address.town
        || nominatim.address.village;

      if (stateName && isMounted.current) {
        const mappedCode = STATE_MAP[stateName] || stateName;
        setZones(currentZones => {
          if (!isMounted.current) return currentZones;
          // Match on state_code (2-letter ISO) which is reliable
          const foundState = currentZones.find((z: any) =>
            z.state_code === mappedCode || z.zone_name === stateName
          );
          if (foundState) {
            setStateCode(foundState.state_code);
            // Collect all districts for this state across all zones
            const allDistricts: string[] = [];
            currentZones
              .filter((z: any) => z.state_code === foundState.state_code)
              .forEach((z: any) => (z.district_codes || []).forEach((d: string) => {
                if (!allDistricts.includes(d)) allDistricts.push(d);
              }));
            if (districtName && allDistricts.length > 0) {
              // Try substring match (handles "East Godavari" vs "EG" and full-name DB values)
              const dn = districtName.toLowerCase();
              const match =
                allDistricts.find(d => d.toLowerCase() === dn) ||
                allDistricts.find(d => d.toLowerCase().includes(dn) || dn.includes(d.toLowerCase()));
              setDistrictCode(match || allDistricts[0]);
            } else if (allDistricts.length > 0) {
              setDistrictCode(allDistricts[0]);
            }
          }
          return currentZones;
        });
      }
    } catch (err) {
      console.warn('[MapScreen] autoFillLocation error:', err);
    }
  };

  // Cause B+F fix: mounted guard + null-safe watchPositionAsync cleanup
  useEffect(() => {
    // Cause F fix: use a closure-scoped variable, not module-level let
    let locationSubscription: { remove: () => void } | null = null;
    let cancelled = false;

    const initLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || !isMounted.current) return;

        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location permission is required for maps to automatically find your district.');
          setIsGettingLocation(false);
          setHasLocationPermission(false);
          return;
        }
        setHasLocationPermission(true);

        // Show last known position first for instant feedback
        try {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (lastKnown && isMounted.current && !cancelled) {
            setLocation(lastKnown);
            setIsGettingLocation(false);
            autoFillLocation(lastKnown).catch(() => undefined);
          }
        } catch {
          // lastKnown can fail — ignore
        }

        // Then get accurate position
        const freshLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!isMounted.current || cancelled) return;
        setLocation(freshLocation);
        setIsGettingLocation(false);
        autoFillLocation(freshLocation, true).catch(() => undefined);

        // Cause F fix: only start watch if not yet cancelled; guard cleanup
        if (!cancelled) {
          try {
            locationSubscription = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.Balanced, distanceInterval: 100, timeInterval: 15000 },
              (newLoc) => {
                if (isMounted.current) setLocation(newLoc);
              }
            );
          } catch {
            // watch can fail on some devices
          }
        }
      } catch (err) {
        console.warn('[MapScreen] initLocation error:', err);
        if (isMounted.current) setIsGettingLocation(false);
      }
    };

    initLocation();

    // Cause F fix: safe cleanup — cancel flag + null guard on .remove()
    return () => {
      cancelled = true;
      try { locationSubscription?.remove(); } catch { /* ignore */ }
    };
  }, []);

  // Sync district when state changes
  useEffect(() => {
    if (stateCode && zones.length > 0) {
      const allDistricts: string[] = [];
      zones
        .filter(z => z.state_code === stateCode)
        .forEach(z => (z.district_codes || []).forEach((d: string) => {
          if (!allDistricts.includes(d)) allDistricts.push(d);
        }));
      if (allDistricts.length > 0 && !allDistricts.includes(districtCode)) {
        setDistrictCode(allDistricts[0]);
      }
    }
  }, [stateCode, zones]);

  const handleDetectLocation = async () => {
    try {
      setIsGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        setIsGettingLocation(false);
        setHasLocationPermission(false);
        return;
      }
      setHasLocationPermission(true);
      let loc: Location.LocationObject | null = null;
      try { loc = await Location.getLastKnownPositionAsync(); } catch { /* ignore */ }
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      if (loc && isMounted.current) {
        setLocation(loc);
        await autoFillLocation(loc, true);
      }
    } catch (err) {
      console.warn('[MapScreen] handleDetectLocation error:', err);
      Alert.alert('Error', 'Could not detect your location.');
    } finally {
      if (isMounted.current) setIsGettingLocation(false);
    }
  };

  const analyzeLocation = async () => {
    if (!location) return;
    setIsLoading(true);
    try {
      const result = await geoService.analyzeSuitability({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        stateCode,
        districtCode,
        waterSourceType: waterSource,
        measuredSalinityUsCm: salinity ? parseFloat(salinity) : undefined
      });

      if (!isMounted.current) return;
      if (result.success) {
        setSuitabilityData(result.data);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert("Analysis Failed", result.message || "Failed to analyze location data.");
      }
    } catch (error: any) {
      const apiErrorMsg = error.response?.data?.message || error.response?.data?.error;
      const genericMsg = error?.message || "Failed to connect to backend service.";
      Alert.alert("Analysis Error", apiErrorMsg || genericMsg);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  // Cause E fix: handleMapPress accepts both native event and LocationObject shapes
  const handleMapPress = async (e: any) => {
    if (!isMounted.current) return;
    try {
      // Native MapView event: e.nativeEvent.coordinate
      // onDragEnd also fires with e.nativeEvent.coordinate
      const coord = e?.nativeEvent?.coordinate || e?.coords;
      if (!coord) return;

      const newLoc: Location.LocationObject = {
        coords: {
          ...(location?.coords || { altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null }),
          latitude: coord.latitude,
          longitude: coord.longitude,
        },
        timestamp: Date.now(),
      };
      setLocation(newLoc);
      await autoFillLocation(newLoc);
    } catch (err) {
      console.warn('[MapScreen] handleMapPress error:', err);
    }
  };

  // Deduplicate zones so each state appears once in the state picker
  const statesMap = new Map<string, string>();
  zones.forEach(z => { if (!statesMap.has(z.state_code)) statesMap.set(z.state_code, z.zone_name); });
  const statesList = Array.from(statesMap.entries()).map(([value, label]) => ({ label, value })).sort((a, b) => a.label.localeCompare(b.label));

  // Merge district_codes from all zones that belong to the selected state
  const zonesForState = zones.filter(z => z.state_code === stateCode);
  const allDistrictCodes: string[] = [];
  zonesForState.forEach(z => (z.district_codes || []).forEach((d: string) => { if (!allDistrictCodes.includes(d)) allDistrictCodes.push(d); }));
  const relevantDistricts = allDistrictCodes.sort();
  const selectedStateName = statesList.find(s => s.value === stateCode)?.label || stateCode || 'Select State';

  // Open coordinates in native Maps app
  const openInMaps = () => {
    if (!location) return;
    const { latitude, longitude } = location.coords;
    const label = address ? encodeURIComponent(address) : 'Selected+Location';
    const url = `https://maps.google.com/?q=${latitude},${longitude}(${label})&z=14`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`geo:${latitude},${longitude}?q=${latitude},${longitude}`);
    });
  };

  // Static OSM tile shown when Google Maps tiles are blank
  const osmStaticUrl = location
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${location.coords.latitude},${location.coords.longitude}&zoom=14&size=640x320&markers=${location.coords.latitude},${location.coords.longitude},red`
    : null;

  // Map fallback UI (used both when MapView unavailable and inside ErrorBoundary)
  const mapFallback = location ? (
    <View style={[styles.loadingMap, { borderRadius: theme.borderRadius.lg, padding: 0, overflow: 'hidden' }]}>
      {osmStaticUrl ? (
        <>
          <Image
            source={{ uri: osmStaticUrl }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            resizeMode="cover"
          />
          <View style={styles.mapOverlayBar}>
            <View style={styles.mapOverlayCoords}>
              <Ionicons name="location" size={14} color="#fff" />
              <Text style={styles.mapOverlayCoordsText}>
                {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity style={styles.mapOverlayBtn} onPress={openInMaps}>
              <Ionicons name="navigate" size={13} color="#fff" />
              <Text style={styles.mapOverlayBtnText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Ionicons name="map-outline" size={48} color={theme.colors.primary} />
          <Text style={[styles.loadingText, { textAlign: 'center', marginTop: 12 }]}>Map not available</Text>
        </>
      )}
    </View>
  ) : (
    <View style={[styles.loadingMap, { borderRadius: theme.borderRadius.lg }]}>
      <Ionicons name="map-outline" size={48} color={theme.colors.primary} />
      <Text style={[styles.loadingText, { textAlign: 'center', marginTop: 12 }]}>
        {mapAvailable ? 'Map view unavailable' : 'Map not available in this build'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface }]} edges={['top']}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('maps.title') || 'Geo Suitability'}</Text>
          <Text style={styles.subtitle}>{t('maps.subtitle') || 'Analyze your pond environment'}</Text>
        </View>

        <View style={styles.mapContainer}>
          {isGettingLocation && !location ? (
            <View style={styles.loadingMap}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Acquiring GPS Signal...</Text>
            </View>
          ) : location && MapView ? (
            // Try native Google MapView; if blank/crashed, ErrorBoundary shows OSM fallback
            <MapErrorBoundary fallback={mapFallback}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.045,
                  longitudeDelta: 0.02,
                }}
                showsUserLocation={hasLocationPermission}
                showsMyLocationButton={false}
                onPress={handleMapPress}
              >
                {Marker && (
                  <Marker
                    coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                    title={address || 'Selected Location'}
                    draggable
                    onDragEnd={handleMapPress}
                  />
                )}
              </MapView>
              {/* "Open in Maps" button always visible on top of MapView */}
              <TouchableOpacity style={styles.openMapsBtn} onPress={openInMaps}>
                <Ionicons name="navigate-outline" size={14} color="#fff" />
                <Text style={styles.openMapsBtnText}>Open in Maps</Text>
              </TouchableOpacity>
            </MapErrorBoundary>
          ) : (
            mapFallback
          )}
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <Text style={styles.formTitle}>Environment Details</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity onPress={handleDetectLocation} style={styles.detectBtn} disabled={isGettingLocation}>
                {isGettingLocation
                  ? <ActivityIndicator size="small" color={theme.colors.primary} />
                  : <Ionicons name="locate" size={16} color={theme.colors.primary} />
                }
                <Text style={styles.detectBtnText}>{isGettingLocation ? 'Locating...' : 'Auto-Locate'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert("Why this is needed?", "Fisheries policies, subsidies, and climate data are mapped by administrative zones. Your selection helps us provide accurate species and system recommendations for your region.")}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>State</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setIsStateOpen(true)}>
                <Text style={styles.pickerText}>{selectedStateName}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputHalf}>
              <Text style={styles.label}>District</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setIsDistrictOpen(true)}>
                <Text style={styles.pickerText}>{districtCode || 'Select'}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputFull}>
            <Text style={styles.label}>Water Source</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setIsWaterOpen(true)}>
              <Text style={styles.pickerText}>{WATER_SOURCES.find(s => s.value === waterSource)?.label}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputFull}>
            <Text style={styles.label}>Measured Salinity (μS/cm) - Optional</Text>
            <TextInput
              style={styles.input}
              value={salinity}
              onChangeText={setSalinity}
              keyboardType="decimal-pad"
              placeholder="e.g. 500"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.checkButton, (!location || isLoading) && { opacity: 0.6 }]}
            onPress={analyzeLocation}
            activeOpacity={0.8}
            disabled={isLoading || !location}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="analytics-outline" size={24} color="#fff" />
            )}
            <Text style={styles.buttonText}>
              {isLoading ? 'Analyzing...' : (t('maps.checkSuitability') || 'Analyze Environment')}
            </Text>
          </TouchableOpacity>
        </View>

        {suitabilityData && address && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="location" size={20} color={theme.colors.primary} />
              <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
            </View>

            <View style={styles.scoreContainer}>
              <Text style={styles.resultLabel}>Suitability Index</Text>
              <Text style={[styles.score, {
                color: suitabilityData.suitabilityScore > 70 ? theme.colors.success :
                  suitabilityData.suitabilityScore > 50 ? theme.colors.accent :
                    theme.colors.error
              }]}>
                {suitabilityData.suitabilityScore}/100
              </Text>
              <Text style={styles.waterType}>{suitabilityData.waterQualityClassification} Profile</Text>
            </View>

            {suitabilityData.recommendedSystems && (
              <View style={styles.resultsSection}>
                <Text style={styles.sectionTitle}>Recommended Systems</Text>
                {suitabilityData.recommendedSystems.slice(0, 3).map((sys: any, idx: number) => (
                  <View key={idx} style={styles.systemItem}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                    <Text style={styles.systemName}>{sys.system}</Text>
                    <Text style={styles.systemScore}>{sys.suitabilityScore}%</Text>
                  </View>
                ))}
              </View>
            )}

            {suitabilityData.restrictedSpecies && suitabilityData.restrictedSpecies.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>Restricted Species</Text>
                <Text style={styles.smallText}>Not recommended for current salinity levels:</Text>
                <View style={styles.tagCloud}>
                  {suitabilityData.restrictedSpecies.map((s: string, idx: number) => (
                    <View key={idx} style={styles.tag}>
                      <Text style={styles.tagText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {suitabilityData.warnings && suitabilityData.warnings.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.accent }]}>Critical Warnings</Text>
                {suitabilityData.warnings.map((w: string, idx: number) => (
                  <View key={idx} style={styles.warningItem}>
                    <Ionicons name="warning" size={16} color={theme.colors.accent} />
                    <Text style={styles.warningText}>{w}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Select Modals */}
      <SelectionModal
        visible={isStateOpen}
        items={statesList}
        onSelect={(val: string) => { setStateCode(val); setIsStateOpen(false); }}
        onClose={() => setIsStateOpen(false)}
        title="Select State"
        styles={styles}
        theme={theme}
      />
      <SelectionModal
        visible={isDistrictOpen}
        items={relevantDistricts.map((d: string) => ({ label: d, value: d }))}
        onSelect={(val: string) => { setDistrictCode(val); setIsDistrictOpen(false); }}
        onClose={() => setIsDistrictOpen(false)}
        title="Select District"
        styles={styles}
        theme={theme}
      />
      <SelectionModal
        visible={isWaterOpen}
        items={WATER_SOURCES}
        onSelect={(val: string) => { setWaterSource(val); setIsWaterOpen(false); }}
        onClose={() => setIsWaterOpen(false)}
        title="Water Source"
        styles={styles}
        theme={theme}
      />
    </SafeAreaView>
  );
}

function SelectionModal({ visible, items, onSelect, onClose, title, styles, theme }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item: any) => item.value}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(item.value)}>
                <Text style={styles.modalItemText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
    zIndex: 10,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    fontWeight: 'bold'
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: 4
  },
  mapContainer: {
    height: 250,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  map: {
    flex: 1
  },
  loadingMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  mapOverlayBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  mapOverlayCoords: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapOverlayCoordsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  mapOverlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  mapOverlayBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  openMapsBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  openMapsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.textPrimary
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  formTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detectBtnText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  inputHalf: {
    flex: 1,
    marginBottom: 16
  },
  inputFull: {
    width: '100%',
    marginBottom: 16
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: isDark ? '#1e1e1e' : '#fafafa'
  },
  pickerText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    flex: 1
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: isDark ? '#1e1e1e' : '#fafafa',
    fontSize: 16,
    color: theme.colors.textPrimary
  },
  checkButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: 8,
    ...theme.shadows.sm,
  },
  buttonText: {
    ...theme.typography.buttonText,
    color: theme.colors.textInverse
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    marginTop: 0,
    ...theme.shadows.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  addressText: {
    ...theme.typography.body,
    flex: 1,
    fontWeight: '500',
    color: theme.colors.textPrimary
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  resultLabel: {
    ...theme.typography.bodyLarge,
    fontWeight: '600',
    color: theme.colors.textPrimary
  },
  score: {
    fontSize: 56,
    fontWeight: 'bold',
    marginVertical: theme.spacing.xs
  },
  waterType: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  resultsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  systemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10
  },
  systemName: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary
  },
  systemScore: {
    fontWeight: 'bold',
    color: theme.colors.primary
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
  },
  tag: {
    backgroundColor: isDark ? '#4A1C1C' : '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  tagText: {
    fontSize: 12,
    color: isDark ? '#FCA5A5' : '#B91C1C',
    fontWeight: '500'
  },
  smallText: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  warningItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 8
  },
  warningText: {
    fontSize: 13,
    color: theme.colors.accent,
    flex: 1
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    minHeight: 300,
    paddingBottom: 30
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary
  },
  modalItem: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalItemText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    flex: 1
  }
});
