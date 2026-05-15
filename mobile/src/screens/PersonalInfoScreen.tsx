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
import { useTheme } from '../ThemeContext';
import LocationCascadePicker, { LocationSelection } from '../components/LocationCascadePicker';
import { authService } from '../services/authService';
import { queuePendingProfileSync } from '../services/profileSyncService';

const PROFILE_KEY = '@fishing_god_profile';

export interface UserProfile {
    userId: string;
    name: string;
    phone: string;
    farmerCategory: 'GENERAL' | 'WOMEN' | 'SC' | 'ST';
    stateCode: string;
    districtCode?: string;
    districtName?: string;
    blockCode?: string;
    blockName?: string;
    panchayatCode?: string;
    panchayatName?: string;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function loadProfile(): Promise<UserProfile> {
    try {
        const json = await AsyncStorage.getItem(PROFILE_KEY);
        if (json) {
            const p = JSON.parse(json) as UserProfile;
            if (!p.userId) {
                p.userId = generateUUID();
                await saveProfile(p);
            }
            return p;
        }
    } catch { }
    return { userId: generateUUID(), name: '', phone: '', farmerCategory: 'GENERAL', stateCode: '' };
}

export async function saveProfile(profile: UserProfile): Promise<void> {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function isProfileLocationComplete(profile: UserProfile): boolean {
    return !!(profile.stateCode && profile.districtCode && profile.blockCode && profile.panchayatCode);
}

const FARMER_CATEGORIES: UserProfile['farmerCategory'][] = ['GENERAL', 'WOMEN', 'SC', 'ST'];

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
    const { theme } = useTheme();
    const c = theme.colors;
    const r = theme.borderRadius;
    const styles = getStyles(theme);

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
            setLoading(false);
        });
    }, []);

    const handleStateChange = (code: string) => {
        setStateCode(code);
        setLocation({});
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Name required', 'Please enter your name before saving.');
            return;
        }
        setSaving(true);
        try {
            const nextProfile = {
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
            };

            await saveProfile(nextProfile);

            const syncResult = userId
                ? await authService.updateProfile({
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
                })
                : { success: true as const };

            if (!syncResult.success && userId) {
                await queuePendingProfileSync({
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
                });
            }

            const message = syncResult.success
                ? 'Your profile has been updated.'
                : 'Saved on this device. It will sync automatically when internet is back.';

            Alert.alert('Saved', message, [
                { text: 'OK', onPress: () => navigation.navigate('Main') },
            ]);
        } catch {
            Alert.alert('Error', 'Could not save profile. Please try again.');
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
                    onPress={() => navigation.navigate('Main', { screen: 'Profile' })}
                >
                    <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Personal Info</Text>
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
                    <Text style={styles.heroName}>{name || 'Your Name'}</Text>
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
                                Location incomplete — required for doctor booking
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Basic info ─────────────────────────────────── */}
                <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>
                <View style={styles.fieldsCard}>
                    <LabeledInput
                        label="Full Name"
                        icon="person-outline"
                        value={name}
                        onChangeText={setName}
                        placeholder="Your full name"
                        isFocused={nameFocused}
                        onFocus={() => setNameFocused(true)}
                        onBlur={() => setNameFocused(false)}
                        theme={theme}
                        styles={styles}
                        last={false}
                    />
                    <View style={styles.fieldDivider} />
                    <LabeledInput
                        label="Phone Number"
                        icon="phone-portrait-outline"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        placeholder="+91 00000 00000"
                        isFocused={phoneFocused}
                        onFocus={() => setPhoneFocused(true)}
                        onBlur={() => setPhoneFocused(false)}
                        theme={theme}
                        styles={styles}
                        last
                    />
                </View>

                {/* ── Farmer category ────────────────────────────── */}
                <Text style={styles.sectionLabel}>FARMER CATEGORY</Text>
                <View style={styles.segmentRow}>
                    {FARMER_CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.segment, farmerCategory === cat && styles.segmentActive]}
                            onPress={() => setFarmerCategory(cat)}
                        >
                            <Text style={[styles.segmentText, farmerCategory === cat && styles.segmentTextActive]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Home state ─────────────────────────────────── */}
                <Text style={styles.sectionLabel}>HOME STATE</Text>
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
                                : 'Select your state'}
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
                        <Text style={styles.sectionLabel}>HOME LOCATION</Text>
                        <View style={styles.locationCard}>
                            <View style={styles.locationHintRow}>
                                <Ionicons name="information-circle-outline" size={15} color={c.primary} />
                                <Text style={styles.locationHint}>
                                    Your panchayat determines which doctor is assigned to you.
                                </Text>
                            </View>
                            <LocationCascadePicker
                                stateCode={stateCode}
                                value={location}
                                onChange={setLocation}
                            />
                            {stateCode && !['BR'].includes(stateCode) && (
                                <Text style={styles.comingSoonText}>
                                    District/block/panchayat data for {stateCode} coming soon.
                                </Text>
                            )}
                        </View>
                    </>
                ) : null}

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
                            <Text style={styles.saveButtonText}>Save Profile</Text>
                        </>
                    )}
                </TouchableOpacity>

            </ScrollView>
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
    });
};
