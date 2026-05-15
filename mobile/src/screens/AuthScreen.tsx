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
import { authService, type AuthUser, type BackendUserRole } from '../services/authService';
import { useTheme } from '../ThemeContext';
import LocationCascadePicker, { type LocationSelection } from '../components/LocationCascadePicker';

interface Props {
    onLoginSuccess: (user: AuthUser) => Promise<void> | void;
}

type AppRole = 'FARMER' | 'DOCTOR';

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

function mapRoleLabel(role: BackendUserRole) {
    if (role === 'DOCTOR') return 'doctor';
    if (role === 'ADMIN') return 'admin';
    return 'farmer';
}

function isDoctorLocationComplete(location: Partial<LocationSelection>) {
    return Boolean(location.districtCode && location.blockCode && location.panchayatCode);
}

function normalizePhoneNumber(value: string) {
    const trimmed = value.trim();
    const hasPlus = trimmed.startsWith('+');
    const digitsOnly = trimmed.replace(/[^\d]/g, '');

    if (hasPlus) {
        return `+${digitsOnly}`;
    }

    if (digitsOnly.startsWith('91')) {
        return `+${digitsOnly}`;
    }

    return `+91${digitsOnly}`;
}

function hasValidPhoneNumber(value: string) {
    const digitsOnly = value.replace(/[^\d]/g, '');
    if (!digitsOnly) return false;
    if (digitsOnly.startsWith('91')) {
        return digitsOnly.length === 12;
    }
    return digitsOnly.length === 10;
}

export default function AuthScreen({ onLoginSuccess }: Props) {
    const { theme } = useTheme();
    const c = theme.colors;
    const styles = getStyles(theme);

    const [selectedRole, setSelectedRole] = useState<AppRole>('FARMER');
    const [isLogin, setIsLogin] = useState(true);
    const [phone, setPhone] = useState('+91 ');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [stateCode, setStateCode] = useState('BR');
    const [location, setLocation] = useState<Partial<LocationSelection>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const subtitle = useMemo(() => {
        if (isLogin) {
            return selectedRole === 'DOCTOR'
                ? 'Doctor access for visit queue, alerts, and appointment completion'
                : 'Farmer access for ponds, bookings, and aquaculture support';
        }
        return selectedRole === 'DOCTOR'
            ? 'Create a doctor account with your assigned block and panchayat'
            : 'Create a farmer account and complete your profile after signup';
    }, [isLogin, selectedRole]);

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
        const formattedPhone = normalizePhoneNumber(phone);

        if (!hasValidPhoneNumber(phone) || !password.trim()) {
            Alert.alert('Missing fields', 'Please enter a valid 10-digit phone number and password.');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                const res = await authService.login(formattedPhone, password.trim());
                if (!res.success || !res.user) {
                    Alert.alert('Login failed', res.error || 'Unable to login right now.');
                    return;
                }

                if (res.user.role !== selectedRole) {
                    await authService.logout();
                    Alert.alert(
                        'Wrong account type',
                        `This number is registered as a ${mapRoleLabel(res.user.role)} account. Switch the role selector and try again.`
                    );
                    return;
                }

                await onLoginSuccess(res.user);
                return;
            }

            if (!name.trim()) {
                Alert.alert('Name required', 'Please enter your full name.');
                return;
            }

            const normalizedStateCode = normalizeStateCode(stateCode);
            if (!normalizedStateCode) {
                Alert.alert('State required', 'Please enter a valid 2-letter state code or a supported state name.');
                return;
            }

            if (selectedRole === 'DOCTOR') {
                if (!isDoctorLocationComplete(location)) {
                    Alert.alert('Location required', 'Doctor signup requires district, block, and panchayat details.');
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
                    Alert.alert('Signup failed', res.error || 'Unable to create the doctor account.');
                    return;
                }

                Alert.alert('Doctor account created', 'Your doctor account is ready.');
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
                Alert.alert('Signup failed', res.error || 'Unable to create the farmer account.');
                return;
            }

            Alert.alert('Account created', 'Welcome to MatsyaMitra.');
            await onLoginSuccess(res.user!);
        } catch {
            Alert.alert('Error', 'Something went wrong while processing your request.');
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
                            {(['FARMER', 'DOCTOR'] as AppRole[]).map((role) => {
                                const active = selectedRole === role;
                                return (
                                    <TouchableOpacity
                                        key={role}
                                        style={[styles.roleChip, active && styles.roleChipActive]}
                                        activeOpacity={0.88}
                                        onPress={() => handleRoleSwitch(role)}
                                    >
                                        <Ionicons
                                            name={role === 'DOCTOR' ? 'medkit-outline' : 'leaf-outline'}
                                            size={16}
                                            color={active ? c.textInverse : c.primary}
                                        />
                                        <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                                            {role === 'DOCTOR' ? 'Doctor' : 'Farmer'}
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
                                <Text style={[styles.authTabText, isLogin && styles.authTabTextActive]}>Sign In</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.authTab, !isLogin && styles.authTabActive]}
                                onPress={() => handleAuthModeSwitch(false)}
                            >
                                <Text style={[styles.authTabText, !isLogin && styles.authTabTextActive]}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            {!isLogin ? (
                                <>
                                    <FormField
                                        label="Full Name"
                                        icon="person-outline"
                                        placeholder={selectedRole === 'DOCTOR' ? 'Dr. Full Name' : 'Full Name'}
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                    />
                                    <FormField
                                        label="State"
                                        icon="location-outline"
                                        placeholder="Bihar or BR"
                                        value={stateCode}
                                        onChangeText={setStateCode}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                    />
                                    {selectedRole === 'DOCTOR' ? (
                                        <View style={styles.locationCard}>
                                            <Text style={styles.locationTitle}>Assigned service area</Text>
                                            <Text style={styles.locationHelp}>
                                                Doctor booking routes are created from the panchayat you choose here.
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

                            <FormField
                                label="Phone Number"
                                icon="call-outline"
                                placeholder="+91 00000 00000"
                                value={phone}
                                onChangeText={setPhone}
                                autoCorrect={false}
                                autoCapitalize="none"
                                keyboardType="phone-pad"
                                autoComplete="tel"
                            />

                            <FormField
                                label="Password"
                                icon="lock-closed-outline"
                                placeholder="Enter password"
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
                                        Doctors receive live visit queue alerts and 12-hour reminder tracking for open appointments.
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
                                                    ? 'Login as Doctor'
                                                    : 'Login as Farmer'
                                                : selectedRole === 'DOCTOR'
                                                ? 'Create Doctor Account'
                                                : 'Create Farmer Account'}
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
                                    {isLogin ? 'Need a new account?' : 'Already have an account?'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.footer}>
                        By continuing, you agree to our Terms of Service and Privacy Policy.
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
            gap: 10,
            marginBottom: 16,
        },
        roleChip: {
            flex: 1,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.primary,
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: c.primaryLight,
        },
        roleChipActive: {
            backgroundColor: c.primary,
        },
        roleChipText: {
            color: c.primary,
            fontSize: 13,
            fontWeight: '800',
            letterSpacing: 0.4,
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
