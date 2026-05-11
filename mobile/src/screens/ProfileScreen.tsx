import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadProfile, UserProfile } from './PersonalInfoScreen';
import { syncService } from '../services/syncService';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { database } from '../database';

export default function ProfileScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = getStyles(theme);

  const [profile, setProfile] = useState<UserProfile>({
    userId: '',
    name: '',
    phone: '',
    farmerCategory: 'GENERAL',
    stateCode: '',
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(true);
  const [pondCount, setPondCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadData = async () => {
        const loadedProfile = await loadProfile();
        const ponds = await database.get<any>('ponds').query().fetch();
        if (!isMounted) return;
        setProfile(loadedProfile);
        setPondCount(ponds.length);
      };

      loadData().catch(() => {
        if (!isMounted) return;
        setPondCount(0);
      });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const handleSync = async () => {
    if (!profile.userId) {
      Alert.alert('Profile Incomplete', 'Please save your profile before syncing.');
      return;
    }
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      const res = await syncService.sync(profile.userId);
      if (res.success) {
        const now = new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setLastSynced(now);
        Alert.alert('Sync Complete', 'Your data is now up to date.');
      } else {
        Alert.alert('Sync Failed', res.error || 'Please check your internet connection.');
      }
    } catch {
      Alert.alert('Sync Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const displayName = profile.name || 'MatsyaMitra';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const farmerCategoryLabel: Record<string, string> = {
    GENERAL: 'General Farmer',
    SC: 'SC Farmer',
    ST: 'ST Farmer',
    OBC: 'OBC Farmer',
  };
  const categoryLabel = farmerCategoryLabel[profile.farmerCategory] || profile.farmerCategory;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('PersonalInfo')}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarInitials}>{initials || 'FG'}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <View style={styles.badgePill}>
              <Ionicons name="checkmark-circle" size={12} color={theme.colors.primary} />
              <Text style={styles.badgePillText}>{categoryLabel}</Text>
            </View>
          </View>
          {profile.phone ? (
            <Text style={styles.profilePhone}>{profile.phone}</Text>
          ) : null}
        </View>

        {/* ── Section: Account & Location ── */}
        <Text style={styles.sectionLabel}>ACCOUNT &amp; LOCATION</Text>
        <View style={styles.sectionPanel}>
          <MenuRow
            icon="person-outline"
            title={t('profile.personalInfo') || 'Personal Info'}
            onPress={() => navigation.navigate('PersonalInfo')}
            theme={theme}
            isFirst
          />
          <SectionDivider theme={theme} />
          <MenuRow
            icon="location-outline"
            title="State / District"
            value={profile.stateCode || 'Not set'}
            onPress={() => navigation.navigate('PersonalInfo')}
            theme={theme}
            isLast
          />
        </View>

        {/* ── Section: My Ponds ── */}
        <Text style={styles.sectionLabel}>MY PONDS</Text>
        <View style={styles.sectionPanel}>
          <MenuRow
            icon="water-outline"
            title={t('profile.myPonds') || 'My Ponds'}
            value={pondCount > 0 ? `${pondCount} pond${pondCount === 1 ? '' : 's'}` : undefined}
            onPress={() => navigation.navigate('PondsList')}
            theme={theme}
            isFirst
            isLast
          />
        </View>

        {/* ── Section: Preferences ── */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.sectionPanel}>
          <MenuRow
            icon="language-outline"
            title={t('profile.language') || 'Language'}
            value={i18n.language === 'hi' ? 'Hindi' : 'English'}
            onPress={() => {
              const isHindi = i18n.language === 'hi';
              const targetLangCode = isHindi ? 'en' : 'hi';
              const targetLangName = isHindi ? 'English' : 'Hindi';
              Alert.alert(
                'Change Language',
                `Are you sure you want to change the language to ${targetLangName}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Confirm', onPress: () => i18n.changeLanguage(targetLangCode) },
                ]
              );
            }}
            theme={theme}
            isFirst
          />
          <SectionDivider theme={theme} />
          <SwitchRow
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            title="Dark Mode"
            value={isDark}
            onValueChange={toggleTheme}
            theme={theme}
          />
          <SectionDivider theme={theme} />
          <SwitchRow
            icon="cloud-offline-outline"
            title={t('profile.offlineMode') || 'Offline Mode'}
            value={offlineMode}
            onValueChange={setOfflineMode}
            theme={theme}
            isLast
          />
        </View>

        {/* ── Section: Notifications ── */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS &amp; DATA</Text>
        <View style={styles.sectionPanel}>
          <MenuRow
            icon="notifications-outline"
            title="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            theme={theme}
            isFirst
          />
          <SectionDivider theme={theme} />
          <MenuRow
            icon="sync-outline"
            title={t('profile.syncData') || 'Sync Data'}
            value={lastSynced ?? undefined}
            trailing={
              isSyncing ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Ionicons name="sync-outline" size={18} color={theme.colors.primary} />
              )
            }
            onPress={handleSync}
            theme={theme}
          />
          <SectionDivider theme={theme} />
          <MenuRow
            icon="school-outline"
            title="Learning Center"
            onPress={() => navigation.navigate('LearningCenter')}
            theme={theme}
            isLast
          />
        </View>

        {/* ── Danger Zone: Sign Out ── */}
        <View style={styles.dangerZone}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() =>
              Alert.alert(
                'Logout',
                'Are you sure you want to log out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Logout', style: 'destructive', onPress: () => logout() },
                ]
              )
            }
            activeOpacity={0.85}
          >
            <View style={styles.signOutIconWrap}>
              <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
            </View>
            <Text style={styles.signOutText}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.error} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionDivider({ theme }: { theme: any }) {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.colors.borderGlass,
        marginLeft: 62,
      }}
    />
  );
}

function MenuRow({
  icon,
  title,
  value,
  trailing,
  onPress,
  theme,
  isFirst,
  isLast,
}: {
  icon: string;
  title: string;
  value?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  theme: any;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const styles = getRowStyles(theme);
  return (
    <TouchableOpacity
      style={[
        styles.row,
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={17} color={theme.colors.primary} />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {trailing !== undefined
        ? trailing
        : <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />}
    </TouchableOpacity>
  );
}

function SwitchRow({
  icon,
  title,
  value,
  onValueChange,
  theme,
  isLast,
}: {
  icon: string;
  title: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  theme: any;
  isLast?: boolean;
}) {
  const styles = getRowStyles(theme);
  return (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={() => onValueChange(!value)}
      activeOpacity={0.75}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={17} color={theme.colors.primary} />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.textInverse}
        style={{ alignSelf: 'center', marginVertical: 0 }}
      />
    </TouchableOpacity>
  );
}

// ── Row styles (shared between MenuRow and SwitchRow) ────────────────────────
const getRowStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 14,
    },
    rowFirst: {
      borderTopLeftRadius: theme.borderRadius.lg,
      borderTopRightRadius: theme.borderRadius.lg,
    },
    rowLast: {
      borderBottomLeftRadius: theme.borderRadius.lg,
      borderBottomRightRadius: theme.borderRadius.lg,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    rowValue: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      marginRight: 6,
    },
  });

// ── Screen styles ─────────────────────────────────────────────────────────────
const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // ── Top Bar ─────────────────────────────────────────────────
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    topBarTitle: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: theme.isDark
        ? 'rgba(0,219,233,0.25)'
        : 'rgba(0,105,112,0.25)',
    },
    editButtonText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },

    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 120,
    },

    // ── Profile Header Card ──────────────────────────────────────
    profileCard: {
      alignItems: 'center',
      paddingVertical: 24,
      marginBottom: 8,
    },
    avatarRing: {
      width: 104,
      height: 104,
      borderRadius: 52,
      borderWidth: 2.5,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      padding: 3,
    },
    avatarInner: {
      flex: 1,
      width: '100%',
      borderRadius: 50,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      color: theme.colors.textPrimary,
      fontSize: 32,
      fontWeight: '800',
    },
    profileInfo: {
      alignItems: 'center',
      gap: 8,
    },
    profileName: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
    },
    badgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: theme.isDark
        ? 'rgba(0,219,233,0.20)'
        : 'rgba(0,105,112,0.20)',
    },
    badgePillText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    profilePhone: {
      marginTop: 6,
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
    },

    // ── Section Label ────────────────────────────────────────────
    sectionLabel: {
      marginTop: 20,
      marginBottom: 8,
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 2,
    },

    // ── Section Panel (card wrapping rows) ───────────────────────
    sectionPanel: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },

    // ── Danger Zone ──────────────────────────────────────────────
    dangerZone: {
      marginTop: 28,
      marginBottom: 8,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      minHeight: 60,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.isDark ? 'rgba(255,180,171,0.08)' : 'rgba(105,0,5,0.06)',
      borderWidth: 1,
      borderColor: theme.isDark
        ? 'rgba(255,180,171,0.20)'
        : 'rgba(105,0,5,0.15)',
      paddingHorizontal: 16,
    },
    signOutIconWrap: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.isDark ? 'rgba(255,180,171,0.12)' : 'rgba(105,0,5,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    signOutText: {
      flex: 1,
      color: theme.colors.error,
      fontSize: 16,
      fontWeight: '700',
    },
  });
