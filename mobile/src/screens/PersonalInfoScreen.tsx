import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';
import LocationCascadePicker, { LocationSelection } from '../components/LocationCascadePicker';
import CalendarPickerModal, { formatDateLabel } from '../components/CalendarPickerModal';
import { authService } from '../services/authService';
import { queuePendingProfileSync } from '../services/profileSyncService';

import {
    type UserProfile,
    loadProfile,
    saveProfile,
    isProfileLocationComplete,
    type Gender,
    type EducationLevel,
    type PrimaryOccupation,
    type IncomeRange,
} from '../services/profileService';

const FARMER_CATEGORIES: UserProfile['farmerCategory'][] = ['GENERAL', 'WOMEN', 'SC', 'ST'];

const GENDERS: { value: Gender; label: string }[] = [
    { value: 'MALE',               label: 'Male' },
    { value: 'FEMALE',             label: 'Female' },
    { value: 'OTHER',              label: 'Other' },
    { value: 'PREFER_NOT_TO_SAY',  label: "Don't say" },
];

const EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
    { value: 'NONE',              label: 'No formal education' },
    { value: 'PRIMARY',           label: 'Primary (1–5)' },
    { value: 'SECONDARY',         label: 'Secondary (6–10)' },
    { value: 'HIGHER_SECONDARY',  label: 'Higher Secondary (11–12)' },
    { value: 'GRADUATE',          label: 'Graduate' },
    { value: 'POSTGRADUATE',      label: 'Postgraduate' },
];

const OCCUPATIONS: { value: PrimaryOccupation; label: string }[] = [
    { value: 'FISH_FARMING', label: 'Fish Farming' },
    { value: 'AGRICULTURE',  label: 'Agriculture' },
    { value: 'DAIRY',        label: 'Dairy' },
    { value: 'LABOUR',       label: 'Labour' },
    { value: 'BUSINESS',     label: 'Business' },
    { value: 'SERVICE',      label: 'Service / Job' },
    { value: 'OTHER',        label: 'Other' },
];

const INCOME_RANGES: { value: IncomeRange; label: string }[] = [
    { value: 'LT_50K',  label: 'Below ₹50,000' },
    { value: '50K_1L',  label: '₹50,000 – ₹1L' },
    { value: '1L_3L',   label: '₹1L – ₹3L' },
    { value: '3L_5L',   label: '₹3L – ₹5L' },
    { value: 'GT_5L',   label: 'Above ₹5L' },
];

const STATES: { code: string; name: string }[] = [
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'AR', name: 'Arunachal Pradesh' },
    { code: 'AS', name: 'Assam' },
    { code: 'BR', name: 'Bihar' },
    { code: 'CG', name: 'Chhattisgarh' },
    { code: 'GA', name: 'Goa' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'HR', name: 'Haryana' },
    { code: 'HP', name: 'Himachal Pradesh' },
    { code: 'JH', name: 'Jharkhand' },
    { code: 'JK', name: 'Jammu & Kashmir' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'KL', name: 'Kerala' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'MN', name: 'Manipur' },
    { code: 'ML', name: 'Meghalaya' },
    { code: 'MZ', name: 'Mizoram' },
    { code: 'NL', name: 'Nagaland' },
    { code: 'OR', name: 'Odisha' },
    { code: 'PB', name: 'Punjab' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'SK', name: 'Sikkim' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'TG', name: 'Telangana' },
    { code: 'TR', name: 'Tripura' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'UK', name: 'Uttarakhand' },
    { code: 'WB', name: 'West Bengal' },
];

export default function PersonalInfoScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const c = theme.colors;
    const styles = getStyles(theme);
    const r = theme.borderRadius;

    const [userId, setUserId] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [farmerCategory, setFarmerCategory] = useState<UserProfile['farmerCategory']>('GENERAL');
    const [stateCode, setStateCode] = useState('');
    const [location, setLocation] = useState<Partial<LocationSelection>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [nameFocused, setNameFocused] = useState(false);
    const [phoneFocused, setPhoneFocused] = useState(false);
    const [stateOpen, setStateOpen] = useState(false);

    // ── Bucket 1 — gov survey Section A fields ──
    const [fatherOrHusbandName, setFatherOrHusbandName] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [gender, setGender] = useState<Gender | ''>('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
    const [educationOpen, setEducationOpen] = useState(false);
    const [householdSize, setHouseholdSize] = useState('');
    const [farmingExperienceYears, setFarmingExperienceYears] = useState('');
    const [primaryOccupation, setPrimaryOccupation] = useState<PrimaryOccupation | ''>('');
    const [annualIncomeRange, setAnnualIncomeRange] = useState<IncomeRange | ''>('');
    const [incomeOpen, setIncomeOpen] = useState(false);
    const [kccHolder, setKccHolder] = useState<boolean | null>(null);
    const [bplHolder, setBplHolder] = useState<boolean | null>(null);
    const [consentGiven, setConsentGiven] = useState(false);

    const [fatherFocused, setFatherFocused] = useState(false);
    const [aadhaarFocused, setAadhaarFocused] = useState(false);
    const [hhFocused, setHhFocused] = useState(false);
    const [expFocused, setExpFocused] = useState(false);
    const [dobPickerOpen, setDobPickerOpen] = useState(false);

    // DOB calendar bounds: today max, ~120 years ago min.
    // useMemo prevents the modal from resetting `defaultMonth` on every render.
    const dobMinDate = React.useMemo(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 120);
        return d;
    }, []);
    const dobMaxDate = React.useMemo(() => new Date(), []);
    const dobDefaultMonth = React.useMemo(() => {
        // Default to 30 years ago so most adults land near their birth year
        const d = new Date();
        d.setFullYear(d.getFullYear() - 30);
        return d;
    }, []);

    useEffect(() => {
        loadProfile().then(p => {
            setUserId(p.userId);
            setName(p.name);
            setPhone(p.phone);
            setFarmerCategory(p.farmerCategory);
            setStateCode(p.stateCode);
            setLocation({
                districtCode: p.districtCode,
                districtName: p.districtName,
                blockCode: p.blockCode,
                blockName: p.blockName,
                panchayatCode: p.panchayatCode,
                panchayatName: p.panchayatName,
            });

            // ── Bucket 1 ──
            if (p.fatherOrHusbandName) setFatherOrHusbandName(p.fatherOrHusbandName);
            if (p.aadhaarNumber) setAadhaarNumber(p.aadhaarNumber);
            if (p.gender) setGender(p.gender);
            if (p.dateOfBirth) setDateOfBirth(p.dateOfBirth);
            if (p.educationLevel) setEducationLevel(p.educationLevel);
            if (p.householdSize != null) setHouseholdSize(String(p.householdSize));
            if (p.farmingExperienceYears != null) setFarmingExperienceYears(String(p.farmingExperienceYears));
            if (p.primaryOccupation) setPrimaryOccupation(p.primaryOccupation);
            if (p.annualIncomeRange) setAnnualIncomeRange(p.annualIncomeRange);
            if (p.kccHolder != null) setKccHolder(p.kccHolder);
            if (p.bplHolder != null) setBplHolder(p.bplHolder);
            if (p.consentGiven) setConsentGiven(p.consentGiven);

            setLoading(false);
        });
    }, []);

    const handleStateChange = (code: string) => {
        setStateCode(code);
        setLocation({});
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert(t('auth.errors.nameRequired'), t('auth.errors.nameRequiredBody'));
            return;
        }

        // Light validation for new fields (all optional but if entered, must be sensible)
        if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber.trim())) {
            Alert.alert('Invalid Aadhaar', 'Aadhaar number must be exactly 12 digits.');
            return;
        }
        if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
            Alert.alert('Invalid Date of Birth', 'Please use YYYY-MM-DD format.');
            return;
        }
        if (householdSize) {
            const n = parseInt(householdSize, 10);
            if (isNaN(n) || n < 1 || n > 50) {
                Alert.alert('Invalid Household Size', 'Household size must be 1–50.');
                return;
            }
        }
        if (farmingExperienceYears) {
            const n = parseInt(farmingExperienceYears, 10);
            if (isNaN(n) || n < 0 || n > 80) {
                Alert.alert('Invalid Experience', 'Years of experience must be 0–80.');
                return;
            }
        }

        setSaving(true);
        try {
            const householdSizeNum = householdSize ? parseInt(householdSize, 10) : undefined;
            const expYearsNum = farmingExperienceYears ? parseInt(farmingExperienceYears, 10) : undefined;

            const nextProfile: UserProfile = {
                userId,
                name: name.trim(),
                phone: phone.trim(),
                farmerCategory,
                stateCode,
                districtCode: location.districtCode,
                districtName: location.districtName,
                blockCode: location.blockCode,
                blockName: location.blockName,
                panchayatCode: location.panchayatCode,
                panchayatName: location.panchayatName,

                fatherOrHusbandName:    fatherOrHusbandName.trim() || undefined,
                aadhaarNumber:          aadhaarNumber.trim() || undefined,
                gender:                 gender || undefined,
                dateOfBirth:            dateOfBirth.trim() || undefined,
                educationLevel:         educationLevel || undefined,
                householdSize:          householdSizeNum,
                farmingExperienceYears: expYearsNum,
                primaryOccupation:      primaryOccupation || undefined,
                annualIncomeRange:      annualIncomeRange || undefined,
                kccHolder:              kccHolder ?? undefined,
                bplHolder:              bplHolder ?? undefined,
                consentGiven:           consentGiven || undefined,
            };

            await saveProfile(nextProfile);

            const syncPayload = {
                userId,
                name: nextProfile.name,
                farmerCategory: nextProfile.farmerCategory,
                stateCode: nextProfile.stateCode,
                districtCode: nextProfile.districtCode,
                districtName: nextProfile.districtName,
                blockCode: nextProfile.blockCode,
                blockName: nextProfile.blockName,
                panchayatCode: nextProfile.panchayatCode,
                panchayatName: nextProfile.panchayatName,
                fatherOrHusbandName:    nextProfile.fatherOrHusbandName ?? null,
                aadhaarNumber:          nextProfile.aadhaarNumber ?? null,
                gender:                 nextProfile.gender ?? null,
                dateOfBirth:            nextProfile.dateOfBirth ?? null,
                educationLevel:         nextProfile.educationLevel ?? null,
                householdSize:          nextProfile.householdSize ?? null,
                farmingExperienceYears: nextProfile.farmingExperienceYears ?? null,
                primaryOccupation:      nextProfile.primaryOccupation ?? null,
                annualIncomeRange:      nextProfile.annualIncomeRange ?? null,
                kccHolder:              nextProfile.kccHolder ?? null,
                bplHolder:              nextProfile.bplHolder ?? null,
                consentGiven:           nextProfile.consentGiven ?? false,
            };

            const syncResult = userId
                ? await authService.updateProfile(syncPayload)
                : { success: true as const };

            if (!syncResult.success && userId) {
                await queuePendingProfileSync(syncPayload);
            }

            const message = syncResult.success
                ? t('personalInfo.saveSuccess')
                : t('common.offline');

            Alert.alert(t('common.success'), message, [
                // goBack lets navigation pop to whichever screen pushed PersonalInfo
                // (FarmerProfile / HatcheryProfile / DoctorProfile) — hard-coding
                // 'Main' worked only for the farmer stack and crashed on the others.
                { text: t('common.ok'), onPress: () => navigation.goBack() },
            ]);
        } catch {
            Alert.alert(t('common.error'), t('personalInfo.saveError'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={c.primary} />
            </View>
        );
    }

    const locationComplete = stateCode && location.districtCode && location.blockCode && location.panchayatCode;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            {/* ── Header ────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    // PersonalInfo is reachable from FarmerProfile, HatcheryProfile,
                    // and DoctorProfile — each lives under a different root navigator.
                    // goBack pops to whichever stack pushed us, working for all 3.
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('personalInfo.title')}</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">

                {/* ── Hero card ──────────────────────────────────── */}
                <View style={styles.heroCard}>
                    <View style={styles.avatarRing}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={30} color={c.textInverse} />
                        </View>
                    </View>
                    <Text style={styles.heroName}>{name || t('personalInfo.fields.name')}</Text>
                    <Text style={styles.heroMeta}>{phone || '+91 —'}</Text>
                    {locationComplete ? (
                        <View style={styles.heroBadge}>
                            <Ionicons name="location" size={12} color={c.primary} />
                            <Text style={[styles.heroBadgeText, { color: c.primary }]}>
                                {location.panchayatName}, {location.blockName}
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.heroBadge, styles.heroBadgeWarn]}>
                            <Ionicons name="alert-circle-outline" size={12} color={c.error} />
                            <Text style={[styles.heroBadgeText, { color: c.error }]}>
                                {t('auth.errors.locationRequiredBody')}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Basic info ─────────────────────────────────── */}
                <Text style={styles.sectionLabel}>{t('addEditPond.basicInfo').toUpperCase()}</Text>
                <View style={styles.fieldsCard}>
                    <LabeledInput
                        label={t('personalInfo.fields.name')}
                        icon="person-outline"
                        value={name}
                        onChangeText={setName}
                        placeholder={t('personalInfo.fields.namePlaceholder')}
                        isFocused={nameFocused}
                        onFocus={() => setNameFocused(true)}
                        onBlur={() => setNameFocused(false)}
                        theme={theme}
                        styles={styles}
                        last={false}
                    />
                    <View style={styles.fieldDivider} />
                    <LabeledInput
                        label={t('personalInfo.fields.phone')}
                        icon="phone-portrait-outline"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        placeholder={t('auth.phonePlaceholder')}
                        isFocused={phoneFocused}
                        onFocus={() => setPhoneFocused(true)}
                        onBlur={() => setPhoneFocused(false)}
                        theme={theme}
                        styles={styles}
                        last
                    />
                </View>

                {/* ── Farmer category ────────────────────────────── */}
                <Text style={styles.sectionLabel}>{t('profile.farmerCategory').toUpperCase()}</Text>
                <View style={styles.segmentRow}>
                    {FARMER_CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.segment, farmerCategory === cat && styles.segmentActive]}
                            onPress={() => setFarmerCategory(cat)}
                        >
                            <Text style={[styles.segmentText, farmerCategory === cat && styles.segmentTextActive]}>
                                {t(`economics.categories.${cat}`)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Home state ─────────────────────────────────── */}
                <Text style={styles.sectionLabel}>{t('personalInfo.fields.state').toUpperCase()}</Text>
                <View style={styles.dropdownWrap}>
                    <TouchableOpacity
                        style={[styles.dropdownTrigger, stateOpen && styles.dropdownTriggerOpen]}
                        onPress={() => setStateOpen(o => !o)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="location-outline" size={18} color={stateCode ? c.primary : c.textMuted} />
                        <Text style={[styles.dropdownTriggerText, stateCode && styles.dropdownTriggerTextSelected]}>
                            {stateCode
                                ? STATES.find(s => s.code === stateCode)?.name ?? stateCode
                                : t('addEditPond.fields.selectStatus')}
                        </Text>
                        <Ionicons
                            name={stateOpen ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={c.textMuted}
                        />
                    </TouchableOpacity>

                    {stateOpen && (
                        <View style={styles.dropdownList}>
                            <ScrollView
                                nestedScrollEnabled
                                showsVerticalScrollIndicator={true}
                                style={{ maxHeight: 260 }}
                            >
                                {STATES.map(s => (
                                    <TouchableOpacity
                                        key={s.code}
                                        style={[
                                            styles.dropdownItem,
                                            stateCode === s.code && styles.dropdownItemActive,
                                        ]}
                                        onPress={() => {
                                            handleStateChange(s.code);
                                            setStateOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownItemText,
                                            stateCode === s.code && styles.dropdownItemTextActive,
                                        ]}>
                                            {s.name}
                                        </Text>
                                        {stateCode === s.code && (
                                            <Ionicons name="checkmark" size={16} color={c.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* ── Location cascade ───────────────────────────── */}
                {stateCode ? (
                    <>
                        <Text style={styles.sectionLabel}>{t('profile.location').toUpperCase()}</Text>
                        <View style={styles.locationCard}>
                            <View style={styles.locationHintRow}>
                                <Ionicons name="information-circle-outline" size={15} color={c.primary} />
                                <Text style={styles.locationHint}>
                                    {t('auth.doctorAreaHelp')}
                                </Text>
                            </View>
                            <LocationCascadePicker
                                stateCode={stateCode}
                                value={location}
                                onChange={setLocation}
                            />
                            {stateCode && !['BR'].includes(stateCode) && (
                                <Text style={styles.comingSoonText}>
                                    {t('common.comingSoon')}
                                </Text>
                            )}
                        </View>
                    </>
                ) : null}

                {/* ── Survey: Personal Details ──────────────────── */}
                <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
                <View style={styles.fieldsCard}>
                    <LabeledInput
                        label="FATHER / HUSBAND NAME"
                        icon="people-outline"
                        value={fatherOrHusbandName}
                        onChangeText={setFatherOrHusbandName}
                        placeholder="Optional"
                        isFocused={fatherFocused}
                        onFocus={() => setFatherFocused(true)}
                        onBlur={() => setFatherFocused(false)}
                        theme={theme}
                        styles={styles}
                        last={false}
                    />
                    <View style={styles.fieldDivider} />
                    <LabeledInput
                        label="AADHAAR NUMBER (12 DIGITS)"
                        icon="card-outline"
                        value={aadhaarNumber}
                        onChangeText={(t: string) => setAadhaarNumber(t.replace(/\D/g, '').slice(0, 12))}
                        placeholder="Optional"
                        keyboardType="numeric"
                        isFocused={aadhaarFocused}
                        onFocus={() => setAadhaarFocused(true)}
                        onBlur={() => setAadhaarFocused(false)}
                        theme={theme}
                        styles={styles}
                        last={false}
                    />
                    <View style={styles.fieldDivider} />
                    {/* DOB — tap-to-open calendar matching the app's style */}
                    <View style={styles.labeledRow}>
                        <Text style={styles.inputLabel}>DATE OF BIRTH</Text>
                        <TouchableOpacity
                            style={[styles.inputRow]}
                            activeOpacity={0.85}
                            onPress={() => setDobPickerOpen(true)}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={16}
                                color={dateOfBirth ? c.primary : c.textMuted}
                            />
                            <Text
                                style={[
                                    styles.dobValueText,
                                    !dateOfBirth && styles.dobValueTextEmpty,
                                ]}
                            >
                                {dateOfBirth ? formatDateLabel(dateOfBirth) : 'Tap to choose date'}
                            </Text>
                            {dateOfBirth ? (
                                <TouchableOpacity onPress={() => setDateOfBirth('')}>
                                    <Ionicons name="close-circle" size={18} color={c.textMuted} />
                                </TouchableOpacity>
                            ) : (
                                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Gender */}
                <Text style={styles.sectionLabel}>GENDER</Text>
                <View style={styles.segmentRow}>
                    {GENDERS.map(g => (
                        <TouchableOpacity
                            key={g.value}
                            style={[styles.segment, gender === g.value && styles.segmentActive]}
                            onPress={() => setGender(g.value)}
                        >
                            <Text style={[styles.segmentText, gender === g.value && styles.segmentTextActive]}>
                                {g.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Education dropdown */}
                <Text style={styles.sectionLabel}>EDUCATION LEVEL</Text>
                <View style={[styles.dropdownWrap, { zIndex: 9, elevation: 9 }]}>
                    <TouchableOpacity
                        style={[styles.dropdownTrigger, educationOpen && styles.dropdownTriggerOpen]}
                        onPress={() => setEducationOpen(o => !o)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="school-outline" size={18} color={educationLevel ? c.primary : c.textMuted} />
                        <Text style={[styles.dropdownTriggerText, educationLevel && styles.dropdownTriggerTextSelected]}>
                            {educationLevel
                                ? EDUCATION_LEVELS.find(e => e.value === educationLevel)?.label
                                : 'Select education level'}
                        </Text>
                        <Ionicons name={educationOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
                    </TouchableOpacity>
                    {educationOpen && (
                        <View style={styles.dropdownList}>
                            {EDUCATION_LEVELS.map(e => (
                                <TouchableOpacity
                                    key={e.value}
                                    style={[styles.dropdownItem, educationLevel === e.value && styles.dropdownItemActive]}
                                    onPress={() => { setEducationLevel(e.value); setEducationOpen(false); }}
                                >
                                    <Text style={[
                                        styles.dropdownItemText,
                                        educationLevel === e.value && styles.dropdownItemTextActive,
                                    ]}>
                                        {e.label}
                                    </Text>
                                    {educationLevel === e.value && <Ionicons name="checkmark" size={16} color={c.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Household + Experience */}
                <Text style={styles.sectionLabel}>HOUSEHOLD & EXPERIENCE</Text>
                <View style={styles.fieldsCard}>
                    <LabeledInput
                        label="HOUSEHOLD SIZE"
                        icon="home-outline"
                        value={householdSize}
                        onChangeText={(t: string) => setHouseholdSize(t.replace(/\D/g, '').slice(0, 2))}
                        placeholder="e.g. 5"
                        keyboardType="numeric"
                        isFocused={hhFocused}
                        onFocus={() => setHhFocused(true)}
                        onBlur={() => setHhFocused(false)}
                        theme={theme}
                        styles={styles}
                        last={false}
                    />
                    <View style={styles.fieldDivider} />
                    <LabeledInput
                        label="YEARS IN FISH FARMING"
                        icon="fish-outline"
                        value={farmingExperienceYears}
                        onChangeText={(t: string) => setFarmingExperienceYears(t.replace(/\D/g, '').slice(0, 2))}
                        placeholder="e.g. 8"
                        keyboardType="numeric"
                        isFocused={expFocused}
                        onFocus={() => setExpFocused(true)}
                        onBlur={() => setExpFocused(false)}
                        theme={theme}
                        styles={styles}
                        last
                    />
                </View>

                {/* Primary occupation */}
                <Text style={styles.sectionLabel}>PRIMARY OCCUPATION</Text>
                <View style={styles.segmentRow}>
                    {OCCUPATIONS.map(o => (
                        <TouchableOpacity
                            key={o.value}
                            style={[styles.segment, primaryOccupation === o.value && styles.segmentActive]}
                            onPress={() => setPrimaryOccupation(o.value)}
                        >
                            <Text style={[styles.segmentText, primaryOccupation === o.value && styles.segmentTextActive]}>
                                {o.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Annual income range */}
                <Text style={styles.sectionLabel}>ANNUAL HOUSEHOLD INCOME</Text>
                <View style={[styles.dropdownWrap, { zIndex: 8, elevation: 8 }]}>
                    <TouchableOpacity
                        style={[styles.dropdownTrigger, incomeOpen && styles.dropdownTriggerOpen]}
                        onPress={() => setIncomeOpen(o => !o)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="wallet-outline" size={18} color={annualIncomeRange ? c.primary : c.textMuted} />
                        <Text style={[styles.dropdownTriggerText, annualIncomeRange && styles.dropdownTriggerTextSelected]}>
                            {annualIncomeRange
                                ? INCOME_RANGES.find(i => i.value === annualIncomeRange)?.label
                                : 'Select income range'}
                        </Text>
                        <Ionicons name={incomeOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
                    </TouchableOpacity>
                    {incomeOpen && (
                        <View style={styles.dropdownList}>
                            {INCOME_RANGES.map(i => (
                                <TouchableOpacity
                                    key={i.value}
                                    style={[styles.dropdownItem, annualIncomeRange === i.value && styles.dropdownItemActive]}
                                    onPress={() => { setAnnualIncomeRange(i.value); setIncomeOpen(false); }}
                                >
                                    <Text style={[
                                        styles.dropdownItemText,
                                        annualIncomeRange === i.value && styles.dropdownItemTextActive,
                                    ]}>
                                        {i.label}
                                    </Text>
                                    {annualIncomeRange === i.value && <Ionicons name="checkmark" size={16} color={c.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Scheme eligibility */}
                <Text style={styles.sectionLabel}>GOVERNMENT SCHEME ELIGIBILITY</Text>
                <View style={styles.schemeCard}>
                    <View style={styles.schemeRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.schemeLabel}>Kisan Credit Card (KCC)</Text>
                            <Text style={styles.schemeHint}>Do you hold an active KCC?</Text>
                        </View>
                        <View style={styles.ynRow}>
                            <TouchableOpacity
                                style={[styles.ynBtn, kccHolder === true && styles.ynBtnActive]}
                                onPress={() => setKccHolder(true)}
                            >
                                <Text style={[styles.ynBtnText, kccHolder === true && styles.ynBtnTextActive]}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.ynBtn, kccHolder === false && styles.ynBtnActive]}
                                onPress={() => setKccHolder(false)}
                            >
                                <Text style={[styles.ynBtnText, kccHolder === false && styles.ynBtnTextActive]}>No</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.schemeDivider} />
                    <View style={styles.schemeRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.schemeLabel}>BPL Card</Text>
                            <Text style={styles.schemeHint}>Do you have a BPL ration card?</Text>
                        </View>
                        <View style={styles.ynRow}>
                            <TouchableOpacity
                                style={[styles.ynBtn, bplHolder === true && styles.ynBtnActive]}
                                onPress={() => setBplHolder(true)}
                            >
                                <Text style={[styles.ynBtnText, bplHolder === true && styles.ynBtnTextActive]}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.ynBtn, bplHolder === false && styles.ynBtnActive]}
                                onPress={() => setBplHolder(false)}
                            >
                                <Text style={[styles.ynBtnText, bplHolder === false && styles.ynBtnTextActive]}>No</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Consent */}
                <Text style={styles.sectionLabel}>CONSENT</Text>
                <TouchableOpacity
                    style={[styles.consentBox, consentGiven && styles.consentBoxActive]}
                    onPress={() => setConsentGiven(!consentGiven)}
                    activeOpacity={0.85}
                >
                    <View style={[styles.consentCheck, consentGiven && styles.consentCheckActive]}>
                        {consentGiven && <Ionicons name="checkmark" size={16} color={c.textInverse} />}
                    </View>
                    <Text style={styles.consentText}>
                        I confirm that the information provided above is correct and consent to its use by the government for fisheries-related schemes and surveys.
                    </Text>
                </TouchableOpacity>

                {/* ── Save button ────────────────────────────────── */}
                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <ActivityIndicator color={c.textInverse} />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color={c.textInverse} />
                            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                        </>
                    )}
                </TouchableOpacity>

            </ScrollView>

            <CalendarPickerModal
                visible={dobPickerOpen}
                value={dateOfBirth}
                title="Date of Birth"
                subtitle="Pick your date of birth"
                onSelect={setDateOfBirth}
                onClose={() => setDobPickerOpen(false)}
                maxDate={dobMaxDate}
                minDate={dobMinDate}
                defaultMonth={dobDefaultMonth}
            />
        </SafeAreaView>
    );
}

// ── Labeled input row ────────────────────────────────────────────────────────
function LabeledInput({
    label,
    icon,
    isFocused,
    onFocus,
    onBlur,
    theme,
    styles,
    last,
    ...props
}: any) {
    const c = theme.colors;
    return (
        <View style={[styles.labeledRow, last && { borderBottomWidth: 0 }]}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={[styles.inputRow, isFocused && styles.inputRowFocused]}>
                <Ionicons name={icon} size={16} color={isFocused ? c.primary : c.textMuted} />
                <TextInput
                    style={styles.textInput}
                    placeholderTextColor={c.textMuted}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    {...props}
                />
            </View>
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (theme: any) => {
    const c = theme.colors;
    const r = theme.borderRadius;
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        center: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: c.background,
        },

        // Header
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        backBtn: {
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerTitle: {
            color: c.textPrimary,
            fontSize: 20,
            fontWeight: '800',
        },

        content: {
            paddingHorizontal: 16,
            paddingBottom: 120,
            paddingTop: 4,
        },

        // Hero
        heroCard: {
            alignItems: 'center',
            backgroundColor: c.surface,
            borderRadius: r.xl,
            borderWidth: 1,
            borderColor: c.border,
            paddingVertical: 24,
            paddingHorizontal: 20,
            marginBottom: 20,
        },
        avatarRing: {
            width: 76,
            height: 76,
            borderRadius: 38,
            borderWidth: 2,
            borderColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: theme.isDark ? 0.4 : 0.15,
            shadowRadius: 12,
            elevation: 5,
        },
        avatar: {
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        heroName: {
            color: c.textPrimary,
            fontSize: 20,
            fontWeight: '800',
        },
        heroMeta: {
            color: c.textMuted,
            marginTop: 4,
            fontSize: 14,
        },
        heroBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            marginTop: 10,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: r.full,
            backgroundColor: c.primaryLight,
        },
        heroBadgeWarn: {
            backgroundColor: c.errorSoft,
        },
        heroBadgeText: {
            fontSize: 12,
            fontWeight: '700',
        },

        // Section labels
        sectionLabel: {
            fontSize: 11,
            fontWeight: '700',
            color: c.textMuted,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 10,
            marginLeft: 4,
        },

        // Fields card — NO overflow:'hidden': it blocks TextInput touch events on iOS
        fieldsCard: {
            backgroundColor: c.surface,
            borderRadius: r.lg,
            borderWidth: 1,
            borderColor: c.border,
            marginBottom: 20,
        },
        fieldDivider: {
            height: 1,
            backgroundColor: c.border,
            marginHorizontal: 16,
        },
        labeledRow: {
            paddingHorizontal: 16,
            paddingVertical: 14,
        },
        inputLabel: {
            fontSize: 12,
            fontWeight: '700',
            color: c.textMuted,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            marginBottom: 8,
        },
        inputRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderRadius: r.sm,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surfaceAlt,
            paddingHorizontal: 14,
            paddingVertical: 0,
            height: 52,
        },
        inputRowFocused: {
            borderColor: c.primary,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 3,
        },
        textInput: {
            flex: 1,
            color: c.textPrimary,
            fontSize: 16,
            height: 44,
            paddingVertical: 0,
        },

        // Farmer category
        segmentRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 20,
        },
        segment: {
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: r.full,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
        },
        segmentActive: {
            backgroundColor: c.primary,
            borderColor: c.primary,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 3,
        },
        segmentText: {
            color: c.textSecondary,
            fontWeight: '700',
            fontSize: 13,
        },
        segmentTextActive: {
            color: c.textInverse,
        },

        // State dropdown
        dropdownWrap: {
            marginBottom: 20,
            zIndex: 10,
            elevation: 10,
        },
        dropdownTrigger: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            height: 52,
            borderRadius: r.md,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            paddingHorizontal: 14,
        },
        dropdownTriggerOpen: {
            borderColor: c.primary,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
        },
        dropdownTriggerText: {
            flex: 1,
            color: c.textMuted,
            fontSize: 15,
            fontWeight: '500',
        },
        dropdownTriggerTextSelected: {
            color: c.textPrimary,
            fontWeight: '700',
        },
        dropdownList: {
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.primary,
            borderTopWidth: 0,
            borderBottomLeftRadius: r.md,
            borderBottomRightRadius: r.md,
            overflow: 'hidden',
            zIndex: 10,
            elevation: 10,
        },
        dropdownItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 13,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
        },
        dropdownItemActive: {
            backgroundColor: c.primaryLight,
        },
        dropdownItemText: {
            color: c.textSecondary,
            fontSize: 15,
            fontWeight: '500',
        },
        dropdownItemTextActive: {
            color: c.primary,
            fontWeight: '700',
        },

        // Location section
        locationCard: {
            backgroundColor: c.surface,
            borderRadius: r.lg,
            borderWidth: 1,
            borderColor: c.border,
            padding: 16,
            marginBottom: 20,
        },
        locationHintRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 7,
            marginBottom: 14,
        },
        locationHint: {
            flex: 1,
            color: c.textSecondary,
            fontSize: 13,
            lineHeight: 19,
        },
        comingSoonText: {
            color: c.textMuted,
            fontSize: 12,
            marginTop: 10,
            fontStyle: 'italic',
        },

        // Save button
        saveButton: {
            height: 54,
            borderRadius: r.lg,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
        },
        saveButtonDisabled: {
            opacity: 0.65,
        },
        saveButtonText: {
            color: c.textInverse,
            fontSize: 16,
            fontWeight: '800',
        },

        // ── Bucket 1 — survey extras ──
        schemeCard: {
            backgroundColor: c.surface,
            borderRadius: r.lg,
            borderWidth: 1,
            borderColor: c.border,
            marginBottom: 20,
            padding: 16,
        },
        schemeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        schemeLabel: {
            fontSize: 14,
            fontWeight: '700',
            color: c.textPrimary,
        },
        schemeHint: {
            fontSize: 12,
            color: c.textMuted,
            marginTop: 2,
        },
        schemeDivider: {
            height: 1,
            backgroundColor: c.border,
            marginVertical: 14,
        },
        ynRow: { flexDirection: 'row', gap: 8 },
        ynBtn: {
            paddingHorizontal: 18,
            paddingVertical: 8,
            borderRadius: r.full,
            backgroundColor: c.surfaceAlt,
            borderWidth: 1,
            borderColor: c.border,
        },
        ynBtnActive: {
            backgroundColor: c.primary,
            borderColor: c.primary,
        },
        ynBtnText: { fontSize: 13, fontWeight: '800', color: c.textSecondary },
        ynBtnTextActive: { color: c.textInverse },

        consentBox: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            padding: 14,
            backgroundColor: c.surface,
            borderRadius: r.lg,
            borderWidth: 1.5,
            borderColor: c.border,
            marginBottom: 20,
        },
        consentBoxActive: {
            borderColor: c.primary,
            backgroundColor: c.primaryLight,
        },
        consentCheck: {
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: c.border,
            backgroundColor: c.surface,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
        },
        consentCheckActive: {
            backgroundColor: c.primary,
            borderColor: c.primary,
        },
        consentText: {
            flex: 1,
            fontSize: 13,
            color: c.textSecondary,
            lineHeight: 19,
        },

        // DOB tap row
        dobValueText: {
            flex: 1,
            color: c.textPrimary,
            fontSize: 16,
            fontWeight: '600',
        },
        dobValueTextEmpty: {
            color: c.textMuted,
            fontWeight: '500',
        },
    });
};
