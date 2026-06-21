import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, KeyboardAvoidingView, Platform,
    Modal, FlatList, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';
import database from '../database';
import Pond from '../database/models/Pond';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { speciesService } from '../services/apiService';
import { getSpeciesDisplay } from '../utils/speciesLookup';
import LocationCascadePicker, { LocationSelection } from '../components/LocationCascadePicker';
import { loadProfile } from '../services/profileService';
import { syncService } from '../services/syncService';

// ─── Constants ───────────────────────────────────────────────────────────────

const WATER_SOURCES = ['BOREWELL', 'OPEN_WELL', 'CANAL', 'RIVER', 'TANK'];
const SYSTEMS = ['EARTHEN', 'BIOFLOC', 'RAS', 'CAGES', 'PENS'];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Bucket 2 — gov survey Section B/D/F enums ──
const OWNERSHIP_TYPES = [
    { value: 'OWNED',  label: 'Owned' },
    { value: 'LEASED', label: 'Leased' },
    { value: 'SHARED', label: 'Shared' },
    { value: 'GOVT',   label: 'Government' },
] as const;

const WATER_AVAILABILITY = [
    { value: 'SEASONAL',  label: 'Seasonal' },
    { value: 'PERENNIAL', label: 'Perennial' },
] as const;

const CULTURE_CATEGORIES = [
    { value: 'EXTENSIVE',       label: 'Extensive' },
    { value: 'SEMI_INTENSIVE',  label: 'Semi-intensive' },
    { value: 'INTENSIVE',       label: 'Intensive' },
] as const;

const POND_ACTIVITIES = [
    { value: 'NURSERY',     label: 'Nursery' },
    { value: 'REARING',     label: 'Rearing' },
    { value: 'GROW_OUT',    label: 'Grow-out' },
    { value: 'BROODSTOCK',  label: 'Broodstock' },
    { value: 'MIXED',       label: 'Mixed' },
] as const;

const DISEASE_OCCURRENCES = [
    { value: 'NONE',  label: 'None' },
    { value: 'MINOR', label: 'Minor' },
    { value: 'MAJOR', label: 'Major' },
] as const;

const SURVEY_PHOTOS: { key: 'wideAngle' | 'embankment' | 'closeView' | 'farmerWithPond'; label: string; hint: string }[] = [
    { key: 'wideAngle',      label: 'Pond — Wide Angle',     hint: 'Full view of the pond' },
    { key: 'embankment',     label: 'Pond — Embankment',     hint: 'Show the boundary' },
    { key: 'closeView',      label: 'Pond — Close View',     hint: 'Water surface up close' },
    { key: 'farmerWithPond', label: 'Farmer with Pond',      hint: 'You standing by the pond' },
];

// ─── Species recommended per farming system ───────────────────────────────────
// Mirrors the EconomicsScreen species options to keep UX consistent.
// Keys are scientific name substrings (lowercase) for fuzzy matching.
const SYSTEM_SPECIES_RECOMMENDED: Record<string, string[]> = {
    RAS: [
        'oreochromis niloticus',  // GIFT Tilapia
        'pangasianodon hypophthalmus', // Pangasius
        'ompok pabda',             // Pabda / Butter Catfish
        'clarias magur',           // Magur
        'heteropneustes fossilis', // Singhi
    ],
    BIOFLOC: [
        'oreochromis niloticus',  // Tilapia — undisputed biofloc champion
        'pangasianodon hypophthalmus', // Pangasius
        'clarias magur',           // Magur / Desi Catfish
        'heteropneustes fossilis', // Singhi
        'ompok pabda',             // Pabda
    ],
    CAGES: [
        'pangasianodon hypophthalmus', // Pangasius — most popular cage species
        'oreochromis niloticus',   // GIFT Tilapia
        'lates calcarifer',        // Bekti / Sea Bass
        'labeo rohita',            // Rohu
    ],
    EARTHEN: [
        // All freshwater species are valid for earthen ponds — no restriction
    ],
    PENS: [
        // Pens are open-water — allow all species
    ],
};

/** Filter species options to those recommended for the given system.
 *  For EARTHEN and PENS we return all species (no restriction).
 *  For other systems, we do a case-insensitive substring match on scientificName. */
function filterSpeciesBySystem(all: SpeciesOption[], system: string): SpeciesOption[] {
    const priorityLabels = ['Jayanti Rohu', 'Amrit Catla', 'Amur Carp', 'Pangasius'];
    const recommended = SYSTEM_SPECIES_RECOMMENDED[system] || [];
    if (recommended.length === 0) return all; // no restriction
    return all.filter(opt =>
        priorityLabels.includes(opt.label) ||
        recommended.some(r => opt.scientificName.toLowerCase().includes(r))
    );
}


type SpeciesOption = { label: string; value: string; scientificName: string };

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDateInput(timestamp?: number | null): string {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) return null;
    const parsed = new Date(`${trimmed}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function formatDateLabel(value: string): string {
    const parsed = parseDateInput(value);
    if (!parsed) return '';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function buildCalendarDays(monthDate: Date) {
    const today = new Date();
    const monthStart = getMonthStart(monthDate);
    const gridStart = addDays(monthStart, -monthStart.getDay());

    return Array.from({ length: 42 }, (_, index) => {
        const date = addDays(gridStart, index);
        const inMonth = date.getMonth() === monthDate.getMonth();
        const isFuture = date.getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
        return {
            key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
            date,
            inMonth,
            isFuture,
        };
    });
}

// ─── Focused input wrapper ────────────────────────────────────────────────────

function Field({
    label,
    styles,
    theme,
    half,
    ...props
}: any) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={[styles.fieldWrap, half && styles.halfField]}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={[styles.input, focused && styles.inputFocused]}
                placeholderTextColor={theme.colors.textMuted}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                {...props}
            />
        </View>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, styles }: { label: string; styles: any }) {
    return <Text style={styles.sectionLabel}>{label}</Text>;
}

// ─── System-aware scale field config ─────────────────────────────────────────

type ScaleConfig = {
    label: string;
    suffix: string;
    placeholder: string;
    hint: string;
    keyboardType: 'decimal-pad' | 'number-pad';
    /** Convert stored areaHectares value to display string */
    fromStored: (v: number) => string;
    /** Convert display string to areaHectares for storage */
    toStored: (v: string) => number;
};

function getScaleConfig(system: string): ScaleConfig {
    switch (system) {
        case 'BIOFLOC':
            return {
                label: 'NUMBER OF TANKS',
                suffix: 'Tanks',
                placeholder: 'e.g. 4',
                hint: 'Each 10,000-litre tank needs ~4–5 sq. meters. 2 cycles/year.',
                keyboardType: 'number-pad',
                fromStored: (v) => Math.round(v).toString(),
                toStored: (v) => parseInt(v) || 0,
            };
        case 'RAS':
            return {
                label: 'NUMBER OF RAS UNITS',
                suffix: 'Units',
                placeholder: 'e.g. 2',
                hint: 'Each unit = 90,000-litre tank + 3 cages. Needs ~100 sq. meters.',
                keyboardType: 'number-pad',
                fromStored: (v) => Math.round(v).toString(),
                toStored: (v) => parseInt(v) || 0,
            };
        case 'CAGES':
            return {
                label: 'NUMBER OF CAGES',
                suffix: 'Cages',
                placeholder: 'e.g. 6',
                hint: 'Standard cage: 6m × 4m × 4m (96 m³). Requires reservoir ≥ 1,000 ha.',
                keyboardType: 'number-pad',
                fromStored: (v) => Math.round(v).toString(),
                toStored: (v) => parseInt(v) || 0,
            };
        case 'PENS':
            return {
                label: 'PEN AREA (HECTARES)',
                suffix: 'Ha',
                placeholder: 'e.g. 0.5',
                hint: 'Total area of pen enclosures in the water body.',
                keyboardType: 'decimal-pad',
                fromStored: (v) => v.toString(),
                toStored: (v) => parseFloat(v) || 0,
            };
        default: // EARTHEN
            return {
                label: 'POND AREA (HECTARES)',
                suffix: 'Ha',
                placeholder: 'e.g. 0.5',
                hint: '1 hectare = 2.47 acres. Enter total water surface area.',
                keyboardType: 'decimal-pad',
                fromStored: (v) => v.toString(),
                toStored: (v) => parseFloat(v) || 0,
            };
    }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddEditPondScreen({ route }: any) {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(theme);

    const existingPondId = route.params?.pondId;
    const [name, setName] = useState('');
    const [area, setArea] = useState('');
    const [source, setSource] = useState(WATER_SOURCES[0]);
    const [system, setSystem] = useState(SYSTEMS[0]);
    const [status, setStatus] = useState('ACTIVE');
    const [speciesId, setSpeciesId] = useState('');
    const [stockingDate, setStockingDate] = useState('');
    const [speciesVariant, setSpeciesVariant] = useState('');
    const [fingerlingCount, setFingerlingCount] = useState('');
    const [fingerlingAvgWeightG, setFingerlingAvgWeightG] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [speciesOptions, setSpeciesOptions] = useState<SpeciesOption[]>([]);
    const [speciesModalVisible, setSpeciesModalVisible] = useState(false);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => getMonthStart(new Date()));
    const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [pondStateCode, setPondStateCode] = useState('');
    const [pondLocation, setPondLocation] = useState<Partial<LocationSelection>>({});

    // ── Bucket 2 — gov survey Section B/D/F fields ──
    const [ownershipType, setOwnershipType] = useState<typeof OWNERSHIP_TYPES[number]['value'] | ''>('');
    const [waterAvailability, setWaterAvailability] = useState<typeof WATER_AVAILABILITY[number]['value'] | ''>('');
    const [cultureSystemCategory, setCultureSystemCategory] = useState<typeof CULTURE_CATEGORIES[number]['value'] | ''>('');
    const [pondActivityType, setPondActivityType] = useState<typeof POND_ACTIVITIES[number]['value'] | ''>('');
    const [wideAnglePhoto, setWideAnglePhoto] = useState('');
    const [embankmentPhoto, setEmbankmentPhoto] = useState('');
    const [closeViewPhoto, setCloseViewPhoto] = useState('');
    const [farmerWithPondPhoto, setFarmerWithPondPhoto] = useState('');
    const [isInsured, setIsInsured] = useState<boolean | null>(null);
    const [floodImpact3Yrs, setFloodImpact3Yrs] = useState<boolean | null>(null);
    const [diseaseOccurrence, setDiseaseOccurrence] = useState<typeof DISEASE_OCCURRENCES[number]['value'] | ''>('');

    const selectedSpecies = getSpeciesDisplay(
        speciesId,
        Object.fromEntries(
            speciesOptions.map(item => [item.value, { label: item.label, scientificName: item.scientificName }])
        )
    );

    React.useEffect(() => {
        if (existingPondId) loadPond();
        else prefillLocationFromProfile();
    }, [existingPondId]);

    React.useEffect(() => { loadSpecies(); }, []);

    React.useEffect(() => {
        const parsed = parseDateInput(stockingDate);
        if (parsed) setCalendarMonth(getMonthStart(parsed));
    }, [stockingDate]);

    const prefillLocationFromProfile = async () => {
        try {
            const profile = await loadProfile();
            if (profile.stateCode) setPondStateCode(profile.stateCode);
            if (profile.panchayatCode) {
                setPondLocation({
                    districtCode: profile.districtCode,
                    districtName: profile.districtName,
                    blockCode: profile.blockCode,
                    blockName: profile.blockName,
                    panchayatCode: profile.panchayatCode,
                    panchayatName: profile.panchayatName,
                });
            }
        } catch {}
    };

    const loadSpecies = async () => {
        try {
            setIsLoadingSpecies(true);
            const response = await speciesService.getAll();
            if (response.success && Array.isArray(response.data)) {
                const options = response.data
                    .map((item: any) => {
                        const data = item.data || {};
                        let commonName = data.common_names?.en || data.scientific_name || 'Unknown Species';
                        const scientificName = data.scientific_name || commonName;

                        if (scientificName === 'Labeo rohita') {
                            commonName = 'Jayanti Rohu';
                        } else if (scientificName === 'Catla catla') {
                            commonName = 'Amrit Catla';
                        } else if (scientificName === 'Cyprinus carpio haematopterus') {
                            commonName = 'Amur Carp';
                        } else if (scientificName === 'Pangasianodon hypophthalmus' || scientificName === 'Pangasionodon hypophthalmus') {
                            commonName = 'Pangasius';
                        }

                        return { label: commonName, value: item.id, scientificName };
                    });

                const priority = ['Jayanti Rohu', 'Amrit Catla', 'Amur Carp', 'Pangasius'];
                options.sort((a: SpeciesOption, b: SpeciesOption) => {
                    const idxA = priority.indexOf(a.label);
                    const idxB = priority.indexOf(b.label);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return a.label.localeCompare(b.label);
                });

                setSpeciesOptions(options);
            }
        } catch (error) {
            console.error('Failed to load species for pond form', error);
        } finally {
            setIsLoadingSpecies(false);
        }
    };

    const loadPond = async () => {
        try {
            const pond = await database.collections.get<Pond>('ponds').find(existingPondId);
            setName(pond.name);
            const cfg = getScaleConfig(pond.systemType);
            setArea(cfg.fromStored(pond.areaHectares));
            setSource(pond.waterSourceType);
            setSystem(pond.systemType);
            setStatus(pond.status);
            setSpeciesId(pond.speciesId || '');
            setStockingDate(formatDateInput(pond.stockingDate));
            setSpeciesVariant(pond.speciesVariant || '');
            setFingerlingCount(pond.fingerlingCount ? pond.fingerlingCount.toString() : '');
            setFingerlingAvgWeightG(pond.fingerlingAvgWeightG ? pond.fingerlingAvgWeightG.toString() : '');
            if (pond.latitude) setLat(pond.latitude.toString());
            if (pond.longitude) setLng(pond.longitude.toString());
            if (pond.districtCode) {
                // Fix #6: Derive state code from the district code prefix (e.g. 'BR-PATNA' → 'BR')
                // instead of hardcoding 'BR'. Fall back to the user's profile state if the
                // district code doesn't contain a dash (legacy / manual-entry codes).
                const derivedStateCode = pond.districtCode.includes('-')
                    ? pond.districtCode.split('-')[0]
                    : (await loadProfile()).stateCode || 'BR';
                setPondStateCode(derivedStateCode);
                setPondLocation({
                    districtCode: pond.districtCode,
                    districtName: pond.districtName,
                    blockCode: pond.blockCode,
                    blockName: pond.blockName,
                    panchayatCode: pond.panchayatCode,
                    panchayatName: pond.panchayatName,
                });
            }

            // ── Bucket 2 survey fields ──
            if (pond.ownershipType) setOwnershipType(pond.ownershipType);
            if (pond.waterAvailability) setWaterAvailability(pond.waterAvailability);
            if (pond.cultureSystemCategory) setCultureSystemCategory(pond.cultureSystemCategory);
            if (pond.pondActivityType) setPondActivityType(pond.pondActivityType);
            if (pond.wideAnglePhotoUri) setWideAnglePhoto(pond.wideAnglePhotoUri);
            if (pond.embankmentPhotoUri) setEmbankmentPhoto(pond.embankmentPhotoUri);
            if (pond.closeViewPhotoUri) setCloseViewPhoto(pond.closeViewPhotoUri);
            if (pond.farmerWithPondPhotoUri) setFarmerWithPondPhoto(pond.farmerWithPondPhotoUri);
            if (pond.isInsured != null) setIsInsured(pond.isInsured);
            if (pond.floodImpact3Yrs != null) setFloodImpact3Yrs(pond.floodImpact3Yrs);
            if (pond.diseaseOccurrence) setDiseaseOccurrence(pond.diseaseOccurrence);
        } catch {
            Alert.alert(t('common.error'), t('addEditPond.saveErrorBody'));
            navigation.goBack();
        }
    };

    const handleGetLocation = async () => {
        setIsGettingLocation(true);
        try {
            const permResult = await Location.requestForegroundPermissionsAsync();
            if (permResult.status !== 'granted') {
                Alert.alert(t('addEditPond.locationErrorTitle'), t('addEditPond.locationErrorBody'));
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setLat(loc.coords.latitude.toFixed(6));
            setLng(loc.coords.longitude.toFixed(6));
        } catch (err: any) {
            Alert.alert(t('addEditPond.locationErrorTitle'), err?.message || t('addEditPond.locationErrorBody'));
        } finally {
            setIsGettingLocation(false);
        }
    };

    const handleSave = async () => {
        const scaleConfig = getScaleConfig(system);
        const storedArea = scaleConfig.toStored(area);

        if (!name.trim()) return Alert.alert(t('addEditPond.validation.title'), t('addEditPond.validation.nameRequired'));
        if (!area.trim() || isNaN(storedArea) || storedArea <= 0) {
            const msg = system === 'BIOFLOC' ? 'Please enter the number of Biofloc tanks.'
                : system === 'RAS' ? 'Please enter the number of RAS units.'
                : system === 'CAGES' ? 'Please enter the number of cages.'
                : t('addEditPond.validation.areaInvalid');
            return Alert.alert(t('addEditPond.validation.title'), msg);
        }
        const parsedStockingDate = parseDateInput(stockingDate);
        if (status === 'ACTIVE' && !speciesId) return Alert.alert(t('addEditPond.validation.title'), t('ponds.validationError'));
        if (status === 'ACTIVE' && !parsedStockingDate) return Alert.alert(t('addEditPond.validation.title'), t('ponds.validationError'));
        if (parsedStockingDate && parsedStockingDate.getTime() > Date.now()) return Alert.alert(t('addEditPond.validation.title'), t('ponds.validationError'));

        setIsSaving(true);
        try {
            // Helper: assign the new Bucket 2 fields onto a pond model instance.
            // Shared between create and update branches so the two stay in sync.
            const applySurveyFields = (p: Pond) => {
                p.ownershipType         = ownershipType || undefined;
                p.waterAvailability     = waterAvailability || undefined;
                p.cultureSystemCategory = cultureSystemCategory || undefined;
                p.pondActivityType      = pondActivityType || undefined;
                p.wideAnglePhotoUri     = wideAnglePhoto || undefined;
                p.embankmentPhotoUri    = embankmentPhoto || undefined;
                p.closeViewPhotoUri     = closeViewPhoto || undefined;
                p.farmerWithPondPhotoUri = farmerWithPondPhoto || undefined;
                p.isInsured             = isInsured ?? undefined;
                p.floodImpact3Yrs       = floodImpact3Yrs ?? undefined;
                p.diseaseOccurrence     = diseaseOccurrence || undefined;
                p.imageUri              = wideAnglePhoto || undefined;
            };

            await database.write(async () => {
                if (existingPondId) {
                    const pond = await database.collections.get<Pond>('ponds').find(existingPondId);
                    await pond.update(p => {
                        p.name = name;
                        p.areaHectares = storedArea;
                        p.waterSourceType = source;
                        p.systemType = system;
                        p.status = status;
                        p.speciesId = speciesId || undefined;
                        p.stockingDate = parsedStockingDate ? parsedStockingDate.getTime() : undefined;
                        p.speciesVariant = speciesVariant.trim() || undefined;
                        p.fingerlingCount = fingerlingCount ? parseInt(fingerlingCount, 10) : undefined;
                        p.fingerlingAvgWeightG = fingerlingAvgWeightG ? parseFloat(fingerlingAvgWeightG) : undefined;
                        p.latitude = lat ? Number(lat) : undefined;
                        p.longitude = lng ? Number(lng) : undefined;
                        p.districtCode = pondLocation.districtCode || undefined;
                        p.districtName = pondLocation.districtName || undefined;
                        p.blockCode = pondLocation.blockCode || undefined;
                        p.blockName = pondLocation.blockName || undefined;
                        p.panchayatCode = pondLocation.panchayatCode || undefined;
                        p.panchayatName = pondLocation.panchayatName || undefined;
                        p.localSyncStatus = 'PENDING';
                        applySurveyFields(p);
                    });
                } else {
                    await database.collections.get<Pond>('ponds').create(p => {
                        p._raw.id = uuidv4();
                        p.pondId = p._raw.id;
                        p.name = name;
                        p.areaHectares = storedArea;
                        p.waterSourceType = source;
                        p.systemType = system;
                        p.status = status;
                        p.speciesId = speciesId || undefined;
                        p.stockingDate = parsedStockingDate ? parsedStockingDate.getTime() : undefined;
                        p.speciesVariant = speciesVariant.trim() || undefined;
                        p.fingerlingCount = fingerlingCount ? parseInt(fingerlingCount, 10) : undefined;
                        p.fingerlingAvgWeightG = fingerlingAvgWeightG ? parseFloat(fingerlingAvgWeightG) : undefined;
                        p.latitude = lat ? Number(lat) : undefined;
                        p.longitude = lng ? Number(lng) : undefined;
                        p.districtCode = pondLocation.districtCode || undefined;
                        p.districtName = pondLocation.districtName || undefined;
                        p.blockCode = pondLocation.blockCode || undefined;
                        p.blockName = pondLocation.blockName || undefined;
                        p.panchayatCode = pondLocation.panchayatCode || undefined;
                        p.panchayatName = pondLocation.panchayatName || undefined;
                        p.localSyncStatus = 'NEW';
                        applySurveyFields(p);
                    });
                }
            });
            // Asynchronously trigger synchronization in the background
            loadProfile().then(profile => {
                syncService.sync(profile.userId).catch(console.error);
            }).catch(console.error);
            navigation.goBack();
        } catch (e: any) {
            Alert.alert(t('addEditPond.saveErrorTitle'), e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Generic survey-photo picker. Each slot is independent — no Alert prompt
    // for camera vs gallery (kept simple for field use); defaults to gallery.
    const pickSurveyPhoto = async (
        setter: (uri: string) => void,
    ) => {
        Alert.alert(
            'Add Photo',
            'Choose a source',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Camera',
                    onPress: async () => {
                        const perm = await ImagePicker.requestCameraPermissionsAsync();
                        if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
                        const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
                        if (!result.canceled && result.assets?.length) setter(result.assets[0].uri);
                    },
                },
                {
                    text: 'Gallery',
                    onPress: async () => {
                        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!perm.granted) { Alert.alert('Permission needed', 'Gallery access is required.'); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
                        if (!result.canceled && result.assets?.length) setter(result.assets[0].uri);
                    },
                },
            ],
        );
    };



    const openCalendar = () => {
        const baseDate = parseDateInput(stockingDate) || new Date();
        setCalendarMonth(getMonthStart(baseDate));
        setCalendarVisible(true);
    };

    const handleSelectCalendarDate = (date: Date) => {
        setStockingDate(formatDateInput(date.getTime()));
        setCalendarVisible(false);
    };

    const selectedCalendarDate = parseDateInput(stockingDate);
    const calendarDays = buildCalendarDays(calendarMonth);
    const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(calendarMonth);
    const canGoForward = getMonthStart(calendarMonth).getTime() < getMonthStart(new Date()).getTime();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{existingPondId ? t('addEditPond.editTitle') : t('addEditPond.newTitle')}</Text>
                <View style={styles.headerIconBtn} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">

                    {/* ── Section: System type — FIRST so scale field updates immediately ── */}
                    <SectionHeader label={t('addEditPond.fields.system').toUpperCase()} styles={styles} />
                    <View style={styles.chipRow}>
                        {SYSTEMS.map(item => (
                            <TouchableOpacity
                                key={item}
                                style={[styles.chip, system === item && styles.chipActive]}
                                onPress={() => {
                                    setSystem(item);
                                    setArea('');
                                    // Clear species if it's not recommended for the new system
                                    if (speciesId && item !== 'EARTHEN' && item !== 'PENS') {
                                        const currentSpecies = speciesOptions.find(s => s.value === speciesId);
                                        if (currentSpecies) {
                                            const recommended = SYSTEM_SPECIES_RECOMMENDED[item] || [];
                                            const isCompatible = recommended.length === 0 ||
                                                recommended.some(r => currentSpecies.scientificName.toLowerCase().includes(r));
                                            if (!isCompatible) setSpeciesId('');
                                        }
                                    }
                                }}
                            >
                                <Text style={[styles.chipText, system === item && styles.chipTextActive]}>
                                    {item === 'EARTHEN' ? 'EARTHEN POND' : item}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Section: Basic info ── */}
                    <SectionHeader label={t('addEditPond.basicInfo').toUpperCase()} styles={styles} />
                    <View style={styles.sectionCard}>
                        <Field
                            label="POND / UNIT NAME"
                            value={name}
                            onChangeText={setName}
                            placeholder={t('addEditPond.fields.namePlaceholder')}
                            styles={styles}
                            theme={theme}
                        />
                        {/* Dynamic scale field — changes based on system type */}
                        {(() => {
                            const cfg = getScaleConfig(system);
                            return (
                                <View style={styles.fieldWrap}>
                                    <Text style={styles.fieldLabel}>{cfg.label}</Text>
                                    <View style={styles.scaleInputRow}>
                                        <TextInput
                                            style={[styles.scaleInput, styles.input]}
                                            value={area}
                                            onChangeText={setArea}
                                            keyboardType={cfg.keyboardType}
                                            placeholder={cfg.placeholder}
                                            placeholderTextColor={theme.colors.textMuted}
                                        />
                                        <View style={styles.scaleSuffix}>
                                            <Text style={styles.scaleSuffixText}>{cfg.suffix}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.scaleHint}>{cfg.hint}</Text>
                                </View>
                            );
                        })()}
                    </View>

                    {/* ── Section: Water source ── */}
                    <SectionHeader label={t('addEditPond.fields.waterSource').toUpperCase()} styles={styles} />
                    <View style={styles.chipRow}>
                        {WATER_SOURCES.map(item => (
                            <TouchableOpacity
                                key={item}
                                style={[styles.chip, source === item && styles.chipActive]}
                                onPress={() => setSource(item)}
                            >
                                <Text style={[styles.chipText, source === item && styles.chipTextActive]}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <SectionHeader label={t('addEditPond.fields.status').toUpperCase()} styles={styles} />
                    <View style={styles.chipRow}>
                        {['ACTIVE', 'FALLOW'].map(item => (
                            <TouchableOpacity
                                key={item}
                                style={[styles.chip, status === item && styles.chipActive]}
                                onPress={() => {
                                    setStatus(item);
                                    if (item === 'FALLOW') {
                                        setSpeciesId('');
                                        setStockingDate('');
                                    }
                                }}
                            >
                                <Text style={[styles.chipText, status === item && styles.chipTextActive]}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Section: Culture details ── */}
                    {status === 'ACTIVE' && (
                        <>
                            <SectionHeader label={t('addEditPond.speciesAndStocking').toUpperCase()} styles={styles} />
                            <View style={styles.sectionCard}>
                                {/* Species selector */}
                                <View style={styles.fieldWrap}>
                                    <Text style={styles.fieldLabel}>SPECIES</Text>
                                    {/* Show recommended hint for intensive systems */}
                                    {(system === 'RAS' || system === 'BIOFLOC' || system === 'CAGES') && (
                                        <Text style={[styles.helperText, { marginBottom: 6, color: theme.colors.primary }]}>
                                            {system === 'RAS' ? '⚡ Recommended for RAS: GIFT Tilapia, Pangasius, Pabda, Magur, Singhi'
                                            : system === 'BIOFLOC' ? '🟤 Recommended for Biofloc: Tilapia, Pangasius, Magur, Singhi, Pabda'
                                            : '🌊 Recommended for Cage Farming: Pangasius, GIFT Tilapia, Bekti, Rohu'}
                                        </Text>
                                    )}
                                    <TouchableOpacity style={styles.selectorField} onPress={() => setSpeciesModalVisible(true)}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.selectorValue, !speciesId && styles.selectorPlaceholder]}>
                                                {selectedSpecies?.label || 'Select species'}
                                            </Text>
                                            {selectedSpecies?.scientificName && selectedSpecies.scientificName !== selectedSpecies.label ? (
                                                <Text style={styles.selectorHint}>{selectedSpecies.scientificName}</Text>
                                            ) : null}
                                        </View>
                                        {isLoadingSpecies
                                            ? <ActivityIndicator size="small" color={theme.colors.primary} />
                                            : <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
                                        }
                                    </TouchableOpacity>
                                </View>

                                {/* Stocking date */}
                                <View style={styles.fieldWrap}>
                                    <Text style={styles.fieldLabel}>STOCKING DATE</Text>
                                    <TouchableOpacity style={styles.selectorField} onPress={openCalendar}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.selectorValue, !stockingDate && styles.selectorPlaceholder]}>
                                                {formatDateLabel(stockingDate) || 'Choose from calendar'}
                                            </Text>
                                            <Text style={styles.selectorHint}>
                                                {stockingDate ? 'Tap to change date' : 'Select when fish or shrimp were stocked'}
                                            </Text>
                                        </View>
                                        <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Quick date actions */}
                                <View style={styles.quickRow}>
                                    <TouchableOpacity style={styles.quickPill} onPress={() => setStockingDate(formatDateInput(Date.now()))}>
                                        <Text style={styles.quickPillText}>Today</Text>
                                    </TouchableOpacity>
                                    {stockingDate ? (
                                        <TouchableOpacity style={styles.quickPillMuted} onPress={() => setStockingDate('')}>
                                            <Text style={styles.quickPillMutedText}>Clear</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>

                                {/* Stocking details fields */}
                                <Field
                                    label="SPECIES VARIANT / STRAIN"
                                    value={speciesVariant}
                                    onChangeText={setSpeciesVariant}
                                    placeholder="e.g. Jayanti Rohu"
                                    styles={styles}
                                    theme={theme}
                                />

                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <Field
                                        label="STOCKING COUNT (PIECES)"
                                        value={fingerlingCount}
                                        onChangeText={setFingerlingCount}
                                        placeholder="e.g. 10000"
                                        keyboardType="numeric"
                                        styles={styles}
                                        theme={theme}
                                        half
                                    />
                                    <Field
                                        label="AVG WEIGHT (GRAMS)"
                                        value={fingerlingAvgWeightG}
                                        onChangeText={setFingerlingAvgWeightG}
                                        placeholder="e.g. 5.0"
                                        keyboardType="decimal-pad"
                                        styles={styles}
                                        theme={theme}
                                        half
                                    />
                                </View>

                                <Text style={styles.helperText}>
                                    Active ponds should include species and stocking date so harvest progress and alerts can work correctly.
                                </Text>
                            </View>
                        </>
                    )}

                    {/* ── Section: Pond Panchayat ── */}
                    <SectionHeader label={t('personalInfo.fields.panchayat').toUpperCase()} styles={styles} />
                    <Text style={styles.helperText}>
                        If this pond is in a different location than your home, set its panchayat here.
                        The doctor assigned to this panchayat will handle this pond.
                    </Text>
                    <LocationCascadePicker
                        stateCode={pondStateCode || 'BR'}
                        value={pondLocation}
                        onChange={setPondLocation}
                    />

                    {/* ── Section: Survey-cycle nav cards (only for existing ponds) ── */}
                    {existingPondId && (
                        <View style={styles.cycleNavRow}>
                            <TouchableOpacity
                                style={styles.cycleNavCard}
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate('CropCycle', { pondId: existingPondId, pondName: name })}
                            >
                                <View style={[styles.cycleNavIcon, { backgroundColor: '#0ea5e922' }]}>
                                    <Ionicons name="analytics-outline" size={22} color="#0ea5e9" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cycleNavTitle}>Crop Cycles</Text>
                                    <Text style={styles.cycleNavSub}>Production · costs · revenue</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.cycleNavCard}
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate('FarmAssets', { pondId: existingPondId, pondName: name })}
                            >
                                <View style={[styles.cycleNavIcon, { backgroundColor: '#22c55e22' }]}>
                                    <Ionicons name="cube-outline" size={22} color="#22c55e" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cycleNavTitle}>Pond Assets</Text>
                                    <Text style={styles.cycleNavSub}>Aerators · pumps · nets</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Section: Ownership & Water Availability ── */}
                    <SectionHeader label="POND OWNERSHIP" styles={styles} />
                    <View style={styles.chipRow}>
                        {OWNERSHIP_TYPES.map(item => (
                            <TouchableOpacity
                                key={item.value}
                                style={[styles.chip, ownershipType === item.value && styles.chipActive]}
                                onPress={() => setOwnershipType(item.value)}
                            >
                                <Text style={[styles.chipText, ownershipType === item.value && styles.chipTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <SectionHeader label="WATER AVAILABILITY" styles={styles} />
                    <View style={styles.chipRow}>
                        {WATER_AVAILABILITY.map(item => (
                            <TouchableOpacity
                                key={item.value}
                                style={[styles.chip, waterAvailability === item.value && styles.chipActive]}
                                onPress={() => setWaterAvailability(item.value)}
                            >
                                <Text style={[styles.chipText, waterAvailability === item.value && styles.chipTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Section: Culture System Category ── */}
                    <SectionHeader label="CULTURE INTENSITY" styles={styles} />
                    <View style={styles.chipRow}>
                        {CULTURE_CATEGORIES.map(item => (
                            <TouchableOpacity
                                key={item.value}
                                style={[styles.chip, cultureSystemCategory === item.value && styles.chipActive]}
                                onPress={() => setCultureSystemCategory(item.value)}
                            >
                                <Text style={[styles.chipText, cultureSystemCategory === item.value && styles.chipTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Section: Pond Activity ── */}
                    <SectionHeader label="POND ACTIVITY TYPE" styles={styles} />
                    <View style={styles.chipRow}>
                        {POND_ACTIVITIES.map(item => (
                            <TouchableOpacity
                                key={item.value}
                                style={[styles.chip, pondActivityType === item.value && styles.chipActive]}
                                onPress={() => setPondActivityType(item.value)}
                            >
                                <Text style={[styles.chipText, pondActivityType === item.value && styles.chipTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Section: Survey Photos (4 slots) ── */}
                    <SectionHeader label="SURVEY PHOTOS (OPTIONAL)" styles={styles} />
                    <Text style={styles.helperText}>
                        Four photos requested by the government survey. You can fill them now or add later.
                    </Text>
                    <View style={styles.surveyPhotoGrid}>
                        {SURVEY_PHOTOS.map(slot => {
                            const uri =
                                slot.key === 'wideAngle' ? wideAnglePhoto :
                                slot.key === 'embankment' ? embankmentPhoto :
                                slot.key === 'closeView' ? closeViewPhoto :
                                farmerWithPondPhoto;
                            const setter =
                                slot.key === 'wideAngle' ? setWideAnglePhoto :
                                slot.key === 'embankment' ? setEmbankmentPhoto :
                                slot.key === 'closeView' ? setCloseViewPhoto :
                                setFarmerWithPondPhoto;
                            return (
                                <TouchableOpacity
                                    key={slot.key}
                                    style={[styles.surveyPhotoSlot, uri && styles.surveyPhotoSlotFilled]}
                                    onPress={() => pickSurveyPhoto(setter)}
                                    activeOpacity={0.85}
                                >
                                    {uri ? (
                                        <>
                                            <Image source={{ uri }} style={styles.surveyPhotoImg} />
                                            <View style={styles.surveyPhotoLabelBar}>
                                                <Text style={styles.surveyPhotoLabelText} numberOfLines={1}>
                                                    {slot.label}
                                                </Text>
                                                <TouchableOpacity onPress={() => setter('')}>
                                                    <Ionicons name="close-circle" size={18} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="image-outline" size={24} color={theme.colors.textMuted} />
                                            <Text style={styles.surveyPhotoSlotLabel} numberOfLines={1}>{slot.label}</Text>
                                            <Text style={styles.surveyPhotoSlotHint} numberOfLines={1}>{slot.hint}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* ── Section: Risk & Insurance ── */}
                    <SectionHeader label="RISK & INSURANCE" styles={styles} />
                    <View style={styles.surveyCard}>
                        <View style={styles.surveyRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.surveyLabel}>Pond Insured?</Text>
                                <Text style={styles.surveyHint}>Crop / livestock insurance scheme</Text>
                            </View>
                            <View style={styles.ynRow}>
                                <TouchableOpacity
                                    style={[styles.ynBtn, isInsured === true && styles.ynBtnActive]}
                                    onPress={() => setIsInsured(true)}
                                >
                                    <Text style={[styles.ynBtnText, isInsured === true && styles.ynBtnTextActive]}>Yes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.ynBtn, isInsured === false && styles.ynBtnActive]}
                                    onPress={() => setIsInsured(false)}
                                >
                                    <Text style={[styles.ynBtnText, isInsured === false && styles.ynBtnTextActive]}>No</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.surveyDivider} />
                        <View style={styles.surveyRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.surveyLabel}>Flood Impact (last 3 years)?</Text>
                                <Text style={styles.surveyHint}>Has the pond been affected by floods?</Text>
                            </View>
                            <View style={styles.ynRow}>
                                <TouchableOpacity
                                    style={[styles.ynBtn, floodImpact3Yrs === true && styles.ynBtnActive]}
                                    onPress={() => setFloodImpact3Yrs(true)}
                                >
                                    <Text style={[styles.ynBtnText, floodImpact3Yrs === true && styles.ynBtnTextActive]}>Yes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.ynBtn, floodImpact3Yrs === false && styles.ynBtnActive]}
                                    onPress={() => setFloodImpact3Yrs(false)}
                                >
                                    <Text style={[styles.ynBtnText, floodImpact3Yrs === false && styles.ynBtnTextActive]}>No</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <SectionHeader label="DISEASE OCCURRENCE" styles={styles} />
                    <View style={styles.chipRow}>
                        {DISEASE_OCCURRENCES.map(item => (
                            <TouchableOpacity
                                key={item.value}
                                style={[styles.chip, diseaseOccurrence === item.value && styles.chipActive]}
                                onPress={() => setDiseaseOccurrence(item.value)}
                            >
                                <Text style={[styles.chipText, diseaseOccurrence === item.value && styles.chipTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Section: GPS Coordinates ── */}
                    <View style={styles.locationHeader}>
                        <SectionHeader label={t('addEditPond.fields.locationCoords').toUpperCase()} styles={styles} />
                        <TouchableOpacity onPress={handleGetLocation} disabled={isGettingLocation}>
                            <Text style={styles.autoLocate}>
                                {isGettingLocation ? t('common.loading') : t('addEditPond.fields.useMyLocation')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.coordinateRow}>
                        <Field label="LATITUDE" value={lat} onChangeText={setLat} keyboardType="decimal-pad" styles={styles} theme={theme} half />
                        <Field label="LONGITUDE" value={lng} onChangeText={setLng} keyboardType="decimal-pad" styles={styles} theme={theme} half />
                    </View>

                    <View style={{ height: 20 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Footer: Save button ── */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                    {isSaving
                        ? <ActivityIndicator color={theme.colors.textInverse} />
                        : <Text style={styles.saveButtonText}>{existingPondId ? t('common.save') : t('addEditPond.save')}</Text>
                    }
                </TouchableOpacity>
            </View>

            {/* ── Species modal ── */}
            <Modal visible={speciesModalVisible} transparent animationType="slide" onRequestClose={() => setSpeciesModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Select Species</Text>
                        <FlatList
                            data={filterSpeciesBySystem(speciesOptions, system)}
                            keyExtractor={item => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalItem, item.value === speciesId && styles.modalItemSelected]}
                                    onPress={() => { setSpeciesId(item.value); setSpeciesModalVisible(false); }}
                                >
                                    <Text style={styles.modalItemTitle}>{item.label}</Text>
                                    <Text style={styles.modalItemMeta}>({item.scientificName})</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.modalEmptyText}>
                                    No species options loaded yet. Make sure the backend is running and species data is available.
                                </Text>
                            }
                        />
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSpeciesModalVisible(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Calendar modal ── */}
            <Modal visible={calendarVisible} transparent animationType="slide" onRequestClose={() => setCalendarVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.calendarCard}>
                        <View style={styles.calendarHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{t('addEditPond.fields.stockingDate')}</Text>
                                <Text style={styles.calendarSubtitle}>{t('addEditPond.fields.selectDate')}</Text>
                            </View>
                            <TouchableOpacity style={styles.calendarIconButton} onPress={() => setCalendarVisible(false)}>
                                <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calendarMonthRow}>
                            <TouchableOpacity
                                style={styles.calendarArrowButton}
                                onPress={() => setCalendarMonth(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                            >
                                <Ionicons name="chevron-back" size={18} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.calendarMonthLabel}>{monthLabel}</Text>
                            <TouchableOpacity
                                style={[styles.calendarArrowButton, !canGoForward && styles.calendarArrowButtonDisabled]}
                                onPress={() => { if (canGoForward) setCalendarMonth(c => new Date(c.getFullYear(), c.getMonth() + 1, 1)); }}
                                disabled={!canGoForward}
                            >
                                <Ionicons name="chevron-forward" size={18} color={canGoForward ? theme.colors.textPrimary : theme.colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.weekdayRow}>
                            {WEEKDAY_LABELS.map(label => (
                                <Text key={label} style={styles.weekdayLabel}>{label}</Text>
                            ))}
                        </View>

                        <View style={styles.calendarGrid}>
                            {calendarDays.map(day => {
                                const isSelected = selectedCalendarDate ? isSameDay(day.date, selectedCalendarDate) : false;
                                const isToday = isSameDay(day.date, new Date());
                                return (
                                    <TouchableOpacity
                                        key={day.key}
                                        style={[
                                            styles.calendarDay,
                                            !day.inMonth && styles.calendarDayOutside,
                                            isSelected && styles.calendarDaySelected,
                                            isToday && !isSelected && styles.calendarDayToday,
                                            day.isFuture && styles.calendarDayDisabled,
                                        ]}
                                        onPress={() => handleSelectCalendarDate(day.date)}
                                        disabled={day.isFuture}
                                    >
                                        <Text style={[
                                            styles.calendarDayText,
                                            !day.inMonth && styles.calendarDayTextOutside,
                                            isSelected && styles.calendarDayTextSelected,
                                            day.isFuture && styles.calendarDayTextDisabled,
                                        ]}>
                                            {day.date.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.calendarFooter}>
                            <TouchableOpacity style={styles.quickPill} onPress={() => handleSelectCalendarDate(new Date())}>
                                <Text style={styles.quickPillText}>Use today</Text>
                            </TouchableOpacity>
                            {stockingDate ? (
                                <TouchableOpacity style={styles.quickPillMuted} onPress={() => { setStockingDate(''); setCalendarVisible(false); }}>
                                    <Text style={styles.quickPillMutedText}>Clear date</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
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

    // Scroll content
    content: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },

    // Section label – uppercase, textMuted, letterSpacing 2, fontSize 11
    sectionLabel: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginTop: 20,
        marginBottom: 10,
    },

    // Section card wrapper
    sectionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderGlass,
        padding: 14,
        gap: 4,
        marginBottom: 4,
    },

    // Field
    fieldWrap: { marginBottom: 14 },
    halfField: { flex: 1 },
    fieldLabel: {
        color: theme.colors.textMuted,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 7,
    },
    input: {
        height: 52,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceLow,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 14,
        paddingVertical: 0,
        color: theme.colors.textPrimary,
        fontSize: 15,
    },
    inputFocused: {
        borderColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },

    // Selector field (species / date)
    selectorField: {
        minHeight: 60,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceLow,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    selectorValue: {
        color: theme.colors.textPrimary,
        fontSize: 15,
        fontWeight: '700',
    },
    selectorPlaceholder: {
        color: theme.colors.textMuted,
        fontWeight: '500',
    },
    selectorHint: {
        color: theme.colors.textMuted,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 3,
    },

    // Chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip: {
        height: 36,
        borderRadius: theme.borderRadius.full,
        paddingHorizontal: 14,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: theme.colors.textInverse },

    // Quick action pills
    quickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    quickPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
    },
    quickPillText: { color: theme.colors.textInverse, fontWeight: '800', fontSize: 12 },
    quickPillMuted: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    quickPillMutedText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 12 },

    // Helper text
    helperText: {
        color: theme.colors.textMuted,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 10,
    },

    // Scale input row (number + suffix badge)
    scaleInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scaleInput: {
        flex: 1,
    },
    scaleSuffix: {
        height: 52,
        paddingHorizontal: 14,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primaryLight,
        borderWidth: 1,
        borderColor: theme.colors.primary + '40',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scaleSuffixText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '800',
    },
    scaleHint: {
        color: theme.colors.textMuted,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 6,
    },



    // Location
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    autoLocate: {
        color: theme.colors.primary,
        fontWeight: '800',
        fontSize: 13,
    },
    coordinateRow: { flexDirection: 'row', gap: 12 },

    // Footer
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    saveButton: {
        height: 54,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.glow,
    },
    saveButtonText: { color: theme.colors.textInverse, fontSize: 16, fontWeight: '800' },

    // Modal shared
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
        maxHeight: '72%',
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
    modalEmptyText: { color: theme.colors.textSecondary, lineHeight: 20, marginVertical: 20 },
    modalCloseButton: {
        marginTop: 14,
        height: 50,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCloseText: { color: theme.colors.textPrimary, fontWeight: '800' },

    // Calendar modal
    calendarCard: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 24,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 18,
    },
    calendarSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        marginTop: -6,
    },
    calendarIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceAlt,
    },
    calendarMonthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    calendarArrowButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceAlt,
    },
    calendarArrowButtonDisabled: { opacity: 0.45 },
    calendarMonthLabel: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
    weekdayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    weekdayLabel: {
        width: `${100 / 7}%`,
        textAlign: 'center',
        color: theme.colors.textMuted,
        fontSize: 12,
        fontWeight: '700',
    },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2 },
    calendarDay: {
        width: '14.2857%',
        aspectRatio: 1,
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        marginBottom: 6,
    },
    calendarDayOutside: { opacity: 0.45 },
    calendarDaySelected: { backgroundColor: theme.colors.primary },
    calendarDayToday: {
        borderWidth: 1,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight,
    },
    calendarDayDisabled: { opacity: 0.3 },
    calendarDayText: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    calendarDayTextOutside: { color: theme.colors.textMuted },
    calendarDayTextSelected: { color: theme.colors.textInverse },
    calendarDayTextDisabled: { color: theme.colors.textMuted },
    calendarFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },

    // ── Bucket 2 survey extras ──
    surveyPhotoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 14,
    },
    surveyPhotoSlot: {
        width: '48%',
        aspectRatio: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        gap: 4,
        overflow: 'hidden',
    },
    surveyPhotoSlotFilled: {
        borderStyle: 'solid',
        borderColor: theme.colors.primary,
    },
    surveyPhotoSlotLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginTop: 4,
    },
    surveyPhotoSlotHint: {
        fontSize: 10,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
    surveyPhotoImg: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    surveyPhotoLabelBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    surveyPhotoLabelText: {
        flex: 1,
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
    surveyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 14,
        marginBottom: 14,
    },
    surveyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    surveyLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    surveyHint: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    surveyDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 12,
    },
    ynRow: { flexDirection: 'row', gap: 8 },
    ynBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    ynBtnActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    ynBtnText: { fontSize: 13, fontWeight: '800', color: theme.colors.textSecondary },
    ynBtnTextActive: { color: theme.colors.textInverse },

    // Cycle/Asset nav cards
    cycleNavRow: { gap: 10, marginBottom: 16 },
    cycleNavCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 14,
    },
    cycleNavIcon: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    cycleNavTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.textPrimary },
    cycleNavSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
});
