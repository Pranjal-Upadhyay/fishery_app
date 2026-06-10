import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { authService, type AuthUser, type BackendUserRole } from '../services/authService';
import { useTheme } from '../ThemeContext';
import LocationCascadePicker, { type LocationSelection } from '../components/LocationCascadePicker';

interface Props {
    onLoginSuccess: (user: AuthUser) => Promise<void> | void;
}

type AppRole = 'FARMER' | 'DOCTOR' | 'HATCHERY';

const STATE_CODE_BY_LABEL: Record<string, string> = {
    'andhra pradesh': 'AP',
    'arunachal pradesh': 'AR',
    assam: 'AS',
    bihar: 'BR',
    goa: 'GA',
    gujarat: 'GJ',
    haryana: 'HR',
    'himachal pradesh': 'HP',
    'jammu & kashmir': 'JK',
    'jammu and kashmir': 'JK',
    jharkhand: 'JH',
    karnataka: 'KA',
    kerala: 'KL',
    'madhya pradesh': 'MP',
    maharashtra: 'MH',
    manipur: 'MN',
    odisha: 'OR',
    orissa: 'OR',
    punjab: 'PB',
    rajasthan: 'RJ',
    'tamil nadu': 'TN',
    telangana: 'TG',
    'uttar pradesh': 'UP',
    'west bengal': 'WB',
};

function normalizeStateCode(value: string): string | null {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.length === 2) return normalized.toUpperCase();
    return STATE_CODE_BY_LABEL[normalized] || null;
}

function mapRoleLabel(role: BackendUserRole, t: (k: string) => string) {
    if (role === 'DOCTOR') return t('auth.roles.doctor');
    if (role === 'HATCHERY') return 'Hatchery';
    if (role === 'ADMIN') return t('auth.roles.admin');
    return t('auth.roles.farmer');
}

function isDoctorLocationComplete(location: Partial<LocationSelection>) {
    return Boolean(location.districtCode && location.blockCode && location.panchayatCode);
}

function normalizePhoneNumber(value: string) {
    const trimmed = value.trim();
    const hasPlus = trimmed.startsWith('+');
    const digitsOnly = trimmed.replace(/[^\d]/g, '');

    // If the user already typed a + prefix, trust their full international number
    if (hasPlus) {
        return `+${digitsOnly}`;
    }

    // Fix #7: Only treat as an already-prefixed Indian number when the digit string
    // is exactly 12 digits AND starts with '91'. A 10-digit number that happens to
    // start with '91' (e.g. 9123456789) is a local Indian number — prepend +91.
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
        return `+${digitsOnly}`;
    }

    return `+91${digitsOnly}`;
}

function hasValidPhoneNumber(value: string) {
    const digitsOnly = value.replace(/[^\d]/g, '');
    if (!digitsOnly) return false;
    // Fix #7: A valid Indian number is exactly 10 local digits, or 12 digits with
    // the 91 country code already included. Reject anything else.
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
        return true;
    }
    return digitsOnly.length === 10;
}

// Phone input sanitisation: the input only holds 10 local digits.
// The +91 country code is rendered as a fixed prefix label inside the input
// shell so the user can never delete or mangle it.
function sanitizePhoneDigits(raw: string) {
    // Strip everything that isn't a digit
    let digits = raw.replace(/[^\d]/g, '');
    // If the user pasted a number that already includes the 91 prefix, drop it
    if (digits.startsWith('91') && digits.length > 10) {
        digits = digits.slice(2);
    }
    // If the user pasted a leading zero (common when copying landline-style)
    if (digits.startsWith('0') && digits.length > 10) {
        digits = digits.slice(1);
    }
    // Cap at 10 — local Indian mobile numbers are exactly 10 digits
    return digits.slice(0, 10);
}

export default function AuthScreen({ onLoginSuccess }: Props) {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const c = theme.colors;
    const styles = getStyles(theme);

    const [selectedRole, setSelectedRole] = useState<AppRole>('FARMER');
    const [isLogin, setIsLogin] = useState(true);
    // Holds only the 10 local digits. The +91 prefix is rendered as a fixed
    // label inside the input and prepended at submit time.
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [stateCode, setStateCode] = useState('BR');
    const [location, setLocation] = useState<Partial<LocationSelection>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const subtitle = useMemo(() => {
        if (isLogin) {
            return selectedRole === 'DOCTOR'
                ? t('auth.subtitleLoginDoctor')
                : t('auth.subtitleLoginFarmer');
        }
        return selectedRole === 'DOCTOR'
            ? t('auth.subtitleSignupDoctor')
            : t('auth.subtitleSignupFarmer');
    }, [isLogin, selectedRole, t]);

    const handleRoleSwitch = (role: AppRole) => {
        setSelectedRole(role);
        if (role === 'FARMER') {
            setLocation({});
        }
    };

    const handleAuthModeSwitch = (nextIsLogin: boolean) => {
        setIsLogin(nextIsLogin);
    };

    const handleSubmit = async () => {
        // `phone` state holds only 10 digits — prepend the locked +91 prefix.
        const formattedPhone = phone.length === 10 ? `+91${phone}` : normalizePhoneNumber(phone);

        if (phone.length !== 10 || !password.trim()) {
            Alert.alert(t('auth.errors.missingFields'), t('auth.errors.missingFieldsBody'));
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                const res = await authService.login(formattedPhone, password.trim());
                if (!res.success || !res.user) {
                    Alert.alert(t('auth.errors.loginFailed'), res.error || t('auth.errors.loginFailedBody'));
                    return;
                }

                if (res.user.role !== selectedRole) {
                    await authService.logout();
                    Alert.alert(
                        t('auth.errors.wrongAccountType'),
                        t('auth.errors.wrongAccountTypeBody', { role: mapRoleLabel(res.user.role, t) })
                    );
                    return;
                }

                await onLoginSuccess(res.user);
                return;
            }

            if (!name.trim()) {
                Alert.alert(t('auth.errors.nameRequired'), t('auth.errors.nameRequiredBody'));
                return;
            }

            const normalizedStateCode = normalizeStateCode(stateCode);
            if (!normalizedStateCode) {
                Alert.alert(t('auth.errors.stateRequired'), t('auth.errors.stateRequiredBody'));
                return;
            }

            if (selectedRole === 'DOCTOR') {
                if (!isDoctorLocationComplete(location)) {
                    Alert.alert(t('auth.errors.locationRequired'), t('auth.errors.locationRequiredBody'));
                    return;
                }

                const res = await authService.signup({
                    role: 'DOCTOR',
                    phone: formattedPhone,
                    password: password.trim(),
                    name: name.trim(),
                    stateCode: normalizedStateCode,
                    districtCode: location.districtCode!,
                    districtName: location.districtName || location.districtCode!,
                    blockCode: location.blockCode!,
                    blockName: location.blockName || location.blockCode!,
                    panchayatCode: location.panchayatCode!,
                    panchayatName: location.panchayatName || location.panchayatCode!,
                });

                if (!res.success) {
                    Alert.alert(t('auth.errors.signupFailed'), res.error || t('auth.errors.signupFailedDoctorBody'));
                    return;
                }

                Alert.alert(t('auth.errors.doctorAccountCreated'), t('auth.errors.doctorAccountCreatedBody'));
                await onLoginSuccess(res.user!);
                return;
            }

            if (selectedRole === 'HATCHERY') {
                if (!isDoctorLocationComplete(location)) {
                    Alert.alert(t('auth.errors.locationRequired'), t('auth.errors.locationRequiredBody'));
                    return;
                }

                const res = await authService.signup({
                    role: 'HATCHERY',
                    phone: formattedPhone,
                    password: password.trim(),
                    name: name.trim(),
                    stateCode: normalizedStateCode,
                    districtCode: location.districtCode!,
                    districtName: location.districtName || location.districtCode!,
                    blockCode: location.blockCode!,
                    blockName: location.blockName || location.blockCode!,
                    panchayatCode: location.panchayatCode!,
                    panchayatName: location.panchayatName || location.panchayatCode!,
                });

                if (!res.success) {
                    Alert.alert(t('auth.errors.signupFailed'), res.error || 'Failed to create hatchery account');
                    return;
                }

                Alert.alert('Account Created', 'Hatchery account created successfully.');
                await onLoginSuccess(res.user!);
                return;
            }

            const res = await authService.signup({
                role: 'FARMER',
                phone: formattedPhone,
                password: password.trim(),
                name: name.trim(),
                stateCode: normalizedStateCode,
                farmerCategory: 'GENERAL',
            });

            if (!res.success) {
                Alert.alert(t('auth.errors.signupFailed'), res.error || t('auth.errors.signupFailedFarmerBody'));
                return;
            }

            Alert.alert(t('auth.errors.accountCreated'), t('auth.errors.accountCreatedBody'));
            await onLoginSuccess(res.user!);
        } catch {
            Alert.alert(t('auth.errors.genericError'), t('auth.errors.genericErrorBody'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.keyboardRoot}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    automaticallyAdjustKeyboardInsets
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.heroSection}>
                        <View style={styles.logoRing}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.appName}>MatsyaMitra</Text>
                        <Text style={styles.appTagline}>{subtitle}</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.roleRow}>
                            {(['FARMER', 'DOCTOR', 'HATCHERY'] as AppRole[]).map((role) => {
                                const active = selectedRole === role;
                                const getRoleIcon = () => {
                                    if (role === 'DOCTOR') return 'medkit-outline';
                                    if (role === 'HATCHERY') return 'business-outline';
                                    return 'leaf-outline';
                                };
                                const getRoleLabel = () => {
                                    if (role === 'DOCTOR') return t('auth.roleDoctor');
                                    if (role === 'HATCHERY') return 'Hatchery';
                                    return t('auth.roleFarmer');
                                };
                                return (
                                    <TouchableOpacity
                                        key={role}
                                        style={[styles.roleChip, active && styles.roleChipActive]}
                                        activeOpacity={0.88}
                                        onPress={() => handleRoleSwitch(role)}
                                    >
                                        <Ionicons
                                            name={getRoleIcon()}
                                            size={16}
                                            color={active ? c.textInverse : c.primary}
                                        />
                                        <Text 
                                            style={[styles.roleChipText, active && styles.roleChipTextActive]}
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.75}
                                        >
                                            {getRoleLabel()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.authTabs}>
                            <TouchableOpacity
                                style={[styles.authTab, isLogin && styles.authTabActive]}
                                onPress={() => handleAuthModeSwitch(true)}
                            >
                                <Text style={[styles.authTabText, isLogin && styles.authTabTextActive]}>{t('auth.tabSignIn')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.authTab, !isLogin && styles.authTabActive]}
                                onPress={() => handleAuthModeSwitch(false)}
                            >
                                <Text style={[styles.authTabText, !isLogin && styles.authTabTextActive]}>{t('auth.tabSignUp')}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            {!isLogin ? (
                                <>
                                    <FormField
                                        label={t('auth.fullName')}
                                        icon="person-outline"
                                        placeholder={selectedRole === 'DOCTOR' ? t('auth.fullNamePlaceholderDoctor') : t('auth.fullNamePlaceholderFarmer')}
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                    />
                                    <FormField
                                        label={t('auth.state')}
                                        icon="location-outline"
                                        placeholder={t('auth.statePlaceholder')}
                                        value={stateCode}
                                        onChangeText={setStateCode}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                    />
                                    {selectedRole === 'DOCTOR' || selectedRole === 'HATCHERY' ? (
                                        <View style={styles.locationCard}>
                                            <Text style={styles.locationTitle}>
                                                {selectedRole === 'DOCTOR' ? t('auth.assignedServiceArea') : 'Hatchery Location'}
                                            </Text>
                                            <Text style={styles.locationHelp}>
                                                {selectedRole === 'DOCTOR' ? t('auth.doctorAreaHelp') : 'Select the location where the hatchery is operated'}
                                            </Text>
                                            <LocationCascadePicker
                                                stateCode={normalizeStateCode(stateCode) || 'BR'}
                                                value={location}
                                                onChange={setLocation}
                                            />
                                        </View>
                                    ) : null}
                                </>
                            ) : null}

                            <PhoneField
                                label={t('auth.phoneNumber')}
                                value={phone}
                                onChangeText={(raw) => setPhone(sanitizePhoneDigits(raw))}
                            />

                            <FormField
                                label={t('auth.password')}
                                icon="lock-closed-outline"
                                placeholder={t('auth.passwordPlaceholder')}
                                value={password}
                                onChangeText={setPassword}
                                autoCorrect={false}
                                autoCapitalize="none"
                                secureTextEntry={!showPassword}
                                autoComplete={isLogin ? 'password' : 'new-password'}
                                rightIcon={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                onRightIconPress={() => setShowPassword((prev) => !prev)}
                            />

                            {selectedRole === 'DOCTOR' ? (
                                <View style={styles.infoBanner}>
                                    <Ionicons name="alarm-outline" size={16} color={c.primary} />
                                    <Text style={styles.infoBannerText}>
                                        {t('auth.doctorAlertBanner')}
                                    </Text>
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                                activeOpacity={0.88}
                                disabled={loading}
                                onPress={() => void handleSubmit()}
                            >
                                {loading ? (
                                    <ActivityIndicator color={c.textInverse} />
                                ) : (
                                    <>
                                        <Text style={styles.primaryButtonText}>
                                            {isLogin
                                                ? selectedRole === 'DOCTOR'
                                                    ? t('auth.loginAsDoctor')
                                                    : t('auth.loginAsFarmer')
                                                : selectedRole === 'DOCTOR'
                                                ? t('auth.createDoctorAccount')
                                                : t('auth.createFarmerAccount')}
                                        </Text>
                                        <Ionicons name="arrow-forward" size={18} color={c.textInverse} />
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryButton}
                                activeOpacity={0.85}
                                onPress={() => handleAuthModeSwitch(!isLogin)}
                            >
                                <Ionicons
                                    name={isLogin ? 'person-add-outline' : 'log-in-outline'}
                                    size={16}
                                    color={c.primary}
                                />
                                <Text style={styles.secondaryButtonText}>
                                    {isLogin ? t('auth.needNewAccount') : t('auth.alreadyHaveAccount')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.footer}>
                        {t('auth.termsFooter')}
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function FormField({
    label,
    icon,
    rightIcon,
    onRightIconPress,
    ...props
}: any) {
    const { theme } = useTheme();
    const c = theme.colors;

    return (
        <View style={stylesField.container}>
            <Text style={[stylesField.label, { color: c.textSecondary }]}>{label}</Text>
            <View style={[stylesField.inputShell, { backgroundColor: theme.isDark ? c.surfaceAlt : c.surfaceLow, borderColor: c.border }]}>
                <Ionicons name={icon} size={18} color={c.textMuted} />
                <TextInput
                    style={[stylesField.input, { color: c.textPrimary }]}
                    placeholderTextColor={c.textMuted}
                    selectionColor={c.primary}
                    {...props}
                />
                {rightIcon ? (
                    <TouchableOpacity onPress={onRightIconPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={rightIcon} size={20} color={c.textMuted} />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

/**
 * Phone field with a locked `+91` country code.
 *
 * The +91 prefix is rendered as a static label inside the input shell — it is
 * NOT part of the editable TextInput. The user can only type up to 10 digits
 * for the local mobile number. Backspace can never delete the +91 because the
 * prefix isn't in the editable string.
 */
function PhoneField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
    const { theme } = useTheme();
    const c = theme.colors;

    return (
        <View style={stylesField.container}>
            <Text style={[stylesField.label, { color: c.textSecondary }]}>{label}</Text>
            <View style={[stylesField.inputShell, { backgroundColor: theme.isDark ? c.surfaceAlt : c.surfaceLow, borderColor: c.border }]}>
                <Ionicons name="call-outline" size={18} color={c.textMuted} />
                <View style={[stylesField.prefixPill, { backgroundColor: theme.isDark ? c.surface : c.background, borderColor: c.border }]}>
                    <Text style={[stylesField.prefixText, { color: c.textPrimary }]}>+91</Text>
                </View>
                <TextInput
                    style={[stylesField.input, { color: c.textPrimary }]}
                    placeholderTextColor={c.textMuted}
                    selectionColor={c.primary}
                    placeholder="00000 00000"
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={10}
                    autoCorrect={false}
                    autoCapitalize="none"
                    autoComplete="tel-national"
                    textContentType="telephoneNumber"
                />
            </View>
        </View>
    );
}

const stylesField = StyleSheet.create({
    container: {
        marginBottom: 14,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    inputShell: {
        minHeight: 54,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    input: {
        flex: 1,
        minHeight: 50,
        fontSize: 15,
        paddingVertical: 10,
    },
    prefixPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
    },
    prefixText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

const getStyles = (theme: any) => {
    const c = theme.colors;
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: c.background,
        },
        keyboardRoot: {
            flex: 1,
        },
        scrollContent: {
            flexGrow: 1,
            paddingHorizontal: 18,
            paddingTop: 28,
            paddingBottom: 32,
        },
        heroSection: {
            alignItems: 'center',
            marginBottom: 28,
        },
        logoRing: {
            width: 92,
            height: 92,
            borderRadius: 46,
            borderWidth: 2,
            borderColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.primaryLight,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: theme.isDark ? 0.32 : 0.18,
            shadowRadius: 18,
            elevation: 6,
            marginBottom: 16,
        },
        logoImage: {
            width: 66,
            height: 66,
        },
        appName: {
            color: c.textPrimary,
            fontSize: 30,
            fontWeight: '800',
            letterSpacing: -0.5,
        },
        appTagline: {
            color: c.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 21,
            marginTop: 8,
            paddingHorizontal: 18,
        },
        card: {
            backgroundColor: theme.isDark ? c.glass : c.surface,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: theme.isDark ? c.borderGlass : c.border,
            padding: 18,
            shadowColor: theme.isDark ? '#000' : '#0b1326',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: theme.isDark ? 0.32 : 0.08,
            shadowRadius: 20,
            elevation: 6,
        },
        roleRow: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: 16,
        },
        roleChip: {
            flex: 1,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.primary,
            paddingVertical: 12,
            paddingHorizontal: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            backgroundColor: c.primaryLight,
        },
        roleChipActive: {
            backgroundColor: c.primary,
        },
        roleChipText: {
            color: c.primary,
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 0.2,
            textTransform: 'uppercase',
        },
        roleChipTextActive: {
            color: c.textInverse,
        },
        authTabs: {
            flexDirection: 'row',
            backgroundColor: theme.isDark ? c.surfaceAlt : c.surfaceLow,
            borderRadius: 18,
            padding: 4,
            marginBottom: 18,
        },
        authTab: {
            flex: 1,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: 'center',
        },
        authTabActive: {
            backgroundColor: c.primary,
        },
        authTabText: {
            color: c.textSecondary,
            fontSize: 13,
            fontWeight: '800',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        authTabTextActive: {
            color: c.textInverse,
        },
        form: {
            paddingTop: 2,
        },
        locationCard: {
            borderRadius: 20,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: theme.isDark ? c.surfaceAlt : c.surfaceLow,
            padding: 14,
            marginBottom: 14,
        },
        locationTitle: {
            color: c.textPrimary,
            fontSize: 14,
            fontWeight: '800',
            marginBottom: 6,
        },
        locationHelp: {
            color: c.textSecondary,
            fontSize: 13,
            lineHeight: 19,
            marginBottom: 10,
        },
        infoBanner: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            padding: 14,
            borderRadius: 18,
            backgroundColor: c.primaryLight,
            marginBottom: 16,
        },
        infoBannerText: {
            flex: 1,
            color: c.textSecondary,
            fontSize: 13,
            lineHeight: 19,
        },
        primaryButton: {
            minHeight: 54,
            borderRadius: 18,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 10,
            marginTop: 4,
        },
        primaryButtonDisabled: {
            opacity: 0.7,
        },
        primaryButtonText: {
            color: c.textInverse,
            fontSize: 16,
            fontWeight: '800',
        },
        secondaryButton: {
            minHeight: 50,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: c.primary,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginTop: 14,
        },
        secondaryButtonText: {
            color: c.primary,
            fontSize: 14,
            fontWeight: '700',
        },
        footer: {
            color: c.textMuted,
            fontSize: 12,
            textAlign: 'center',
            marginTop: 18,
            lineHeight: 18,
            paddingHorizontal: 20,
        },
    });
};
