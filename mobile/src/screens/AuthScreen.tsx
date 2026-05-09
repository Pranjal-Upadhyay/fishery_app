import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/authService';
import { useTheme } from '../ThemeContext';

interface Props {
    onLoginSuccess: () => void;
}

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

export default function AuthScreen({ onLoginSuccess }: Props) {
    const { theme } = useTheme();
    const c = theme.colors;
    const styles = getStyles(theme);

    const [isLogin, setIsLogin] = useState(true);
    const [phone, setPhone] = useState('+91 ');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [stateCode, setStateCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!phone || !password) {
            Alert.alert('Error', 'Please enter phone and password.');
            return;
        }

        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+91' + formattedPhone;
        }

        setLoading(true);
        try {
            if (isLogin) {
                const res = await authService.login(formattedPhone, password);
                if (res.success) onLoginSuccess();
                else Alert.alert('Login Failed', res.error);
            } else {
                if (!name || !stateCode) {
                    Alert.alert('Error', 'Please fill all required fields for signup.');
                    setLoading(false);
                    return;
                }

                const normalizedStateCode = normalizeStateCode(stateCode);
                if (!normalizedStateCode) {
                    Alert.alert('Error', 'Please enter a valid 2-letter state code or a supported state name.');
                    setLoading(false);
                    return;
                }

                const res = await authService.signup(formattedPhone, password, name, normalizedStateCode, 'GENERAL');
                if (res.success) {
                    Alert.alert('Signup Successful', 'Welcome to Fishing God!');
                    onLoginSuccess();
                } else {
                    Alert.alert('Signup Failed', res.error);
                }
            }
        } catch {
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.gradientBg}>
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo area */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoRing}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.appName}>Fishing God</Text>
                        <Text style={styles.appTagline}>Premium aquaculture management</Text>
                    </View>

                    {/* Glass card */}
                    <View style={styles.card}>
                        {/* Tab switcher */}
                        <View style={styles.tabs}>
                            <TouchableOpacity
                                style={[styles.tab, isLogin && styles.tabActive]}
                                onPress={() => setIsLogin(true)}
                            >
                                <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>
                                    Sign In
                                </Text>
                                {isLogin && <View style={styles.tabIndicator} />}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, !isLogin && styles.tabActive]}
                                onPress={() => setIsLogin(false)}
                            >
                                <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>
                                    Sign Up
                                </Text>
                                {!isLogin && <View style={styles.tabIndicator} />}
                            </TouchableOpacity>
                        </View>

                        {/* Form fields */}
                        <View style={styles.form}>
                            {!isLogin && (
                                <>
                                    <GhostField
                                        label="Full Name"
                                        icon="person-outline"
                                        placeholder="John Doe"
                                        value={name}
                                        onChangeText={setName}
                                        fieldKey="name"
                                        focusedField={focusedField}
                                        setFocusedField={setFocusedField}
                                        theme={theme}
                                        styles={styles}
                                    />
                                    <GhostField
                                        label="State"
                                        icon="location-outline"
                                        placeholder="e.g. Bihar or BR"
                                        value={stateCode}
                                        onChangeText={setStateCode}
                                        fieldKey="state"
                                        focusedField={focusedField}
                                        setFocusedField={setFocusedField}
                                        theme={theme}
                                        styles={styles}
                                    />
                                </>
                            )}

                            <GhostField
                                label="Phone Number"
                                icon="phone-portrait-outline"
                                placeholder="+91 00000 00000"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                fieldKey="phone"
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                                theme={theme}
                                styles={styles}
                            />

                            <GhostField
                                label="Password"
                                icon="lock-closed-outline"
                                placeholder="Enter password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                fieldKey="password"
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                                theme={theme}
                                styles={styles}
                                rightIcon={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                onRightIconPress={() => setShowPassword(!showPassword)}
                            />

                            {isLogin && (
                                <TouchableOpacity style={styles.forgotWrap}>
                                    <Text style={styles.forgotText}>Forgot Password?</Text>
                                </TouchableOpacity>
                            )}

                            {/* Primary CTA */}
                            <TouchableOpacity
                                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <ActivityIndicator color={c.textInverse} />
                                ) : (
                                    <>
                                        <Text style={styles.primaryButtonText}>
                                            {isLogin ? 'Sign In' : 'Create Account'}
                                        </Text>
                                        <Ionicons name="arrow-forward" size={18} color={c.textInverse} />
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Divider */}
                            <View style={styles.dividerRow}>
                                <View style={styles.divider} />
                                <Text style={styles.dividerText}>
                                    {isLogin ? 'NEW HERE?' : 'HAVE AN ACCOUNT?'}
                                </Text>
                                <View style={styles.divider} />
                            </View>

                            {/* Secondary link */}
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={() => setIsLogin(!isLogin)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={isLogin ? 'person-add-outline' : 'log-in-outline'}
                                    size={17}
                                    color={c.primary}
                                />
                                <Text style={styles.secondaryButtonText}>
                                    {isLogin ? 'Create New Account' : 'Switch to Sign In'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.footer}>
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </Text>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

// ── Ghost field component ────────────────────────────────────────────────────
function GhostField({
    label,
    icon,
    fieldKey,
    focusedField,
    setFocusedField,
    theme,
    styles,
    rightIcon,
    onRightIconPress,
    ...props
}: any) {
    const c = theme.colors;
    const isFocused = focusedField === fieldKey;
    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View
                style={[
                    styles.fieldRow,
                    isFocused && styles.fieldRowFocused,
                ]}
            >
                <Ionicons
                    name={icon}
                    size={18}
                    color={isFocused ? c.primary : c.textMuted}
                />
                <TextInput
                    style={styles.fieldInput}
                    placeholderTextColor={c.textMuted}
                    onFocus={() => setFocusedField(fieldKey)}
                    onBlur={() => setFocusedField(null)}
                    {...props}
                />
                {rightIcon && (
                    <TouchableOpacity onPress={onRightIconPress} style={{ padding: 4 }}>
                        <Ionicons name={rightIcon} size={20} color={c.textMuted} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (theme: any) => {
    const c = theme.colors;
    const r = theme.borderRadius;
    return StyleSheet.create({
        gradientBg: {
            flex: 1,
            backgroundColor: c.background,
        },
        container: {
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingBottom: 32,
            paddingTop: 56,
        },
        // Logo
        logoSection: {
            alignItems: 'center',
            marginBottom: 32,
        },
        logoRing: {
            width: 88,
            height: 88,
            borderRadius: 44,
            borderWidth: 2,
            borderColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.primaryLight,
            marginBottom: 14,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: theme.isDark ? 0.5 : 0.2,
            shadowRadius: 20,
            elevation: 8,
        },
        logoImage: {
            width: 64,
            height: 64,
        },
        appName: {
            fontSize: 26,
            fontWeight: '800',
            color: c.textPrimary,
            letterSpacing: -0.5,
        },
        appTagline: {
            fontSize: 13,
            color: c.textMuted,
            marginTop: 4,
            letterSpacing: 0.3,
        },
        // Glass card
        card: {
            backgroundColor: theme.isDark ? c.glass : c.surface,
            borderRadius: r.xl,
            borderWidth: 1,
            borderColor: theme.isDark ? c.borderGlass : c.border,
            overflow: 'hidden',
            ...(theme.isDark
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.45,
                    shadowRadius: 24,
                    elevation: 10,
                }
                : {
                    shadowColor: '#0b1326',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.08,
                    shadowRadius: 20,
                    elevation: 5,
                }),
        },
        // Tabs
        tabs: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: c.border,
        },
        tab: {
            flex: 1,
            paddingVertical: 16,
            alignItems: 'center',
            position: 'relative',
        },
        tabActive: {},
        tabText: {
            fontSize: 14,
            fontWeight: '700',
            color: c.textMuted,
        },
        tabTextActive: {
            color: c.primary,
        },
        tabIndicator: {
            position: 'absolute',
            bottom: -1,
            left: '20%',
            right: '20%',
            height: 2,
            borderRadius: 1,
            backgroundColor: c.primary,
        },
        // Form
        form: {
            padding: 20,
            gap: 14,
        },
        fieldWrap: {
            gap: 6,
        },
        fieldLabel: {
            fontSize: 12,
            fontWeight: '700',
            color: c.textSecondary,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        fieldRow: {
            height: 52,
            borderRadius: r.md,
            backgroundColor: theme.isDark ? c.surfaceAlt : c.surfaceLow,
            borderWidth: 1,
            borderColor: c.border,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        fieldRowFocused: {
            borderColor: c.primary,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: theme.isDark ? 0.35 : 0.2,
            shadowRadius: 8,
            elevation: 4,
        },
        fieldInput: {
            flex: 1,
            color: c.textPrimary,
            fontSize: 15,
        },
        forgotWrap: {
            alignSelf: 'flex-end',
            marginTop: -4,
        },
        forgotText: {
            color: c.primary,
            fontWeight: '700',
            fontSize: 13,
        },
        primaryButton: {
            height: 54,
            borderRadius: r.lg,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginTop: 4,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
        },
        primaryButtonDisabled: {
            opacity: 0.65,
        },
        primaryButtonText: {
            color: c.textInverse,
            fontSize: 16,
            fontWeight: '800',
        },
        dividerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        divider: {
            flex: 1,
            height: 1,
            backgroundColor: c.border,
        },
        dividerText: {
            color: c.textMuted,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 1,
        },
        secondaryButton: {
            height: 52,
            borderRadius: r.md,
            borderWidth: 1.5,
            borderColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
        },
        secondaryButtonText: {
            color: c.primary,
            fontSize: 15,
            fontWeight: '700',
        },
        footer: {
            color: c.textMuted,
            textAlign: 'center',
            fontSize: 11,
            lineHeight: 17,
            paddingHorizontal: 20,
            marginTop: 24,
        },
    });
};
