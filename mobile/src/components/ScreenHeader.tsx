/**
 * ScreenHeader — Shared navigation header for all stack screens.
 * Provides a consistent back button, title, and optional right-side slot.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

interface ScreenHeaderProps {
  /** Title displayed in the center of the header. */
  title: string;
  /** Optional short context line displayed under the title. */
  subtitle?: string;
  /** Called when the back button is pressed. */
  onBack?: () => void;
  /**
   * Visual variant:
   * - 'surface' (default) — white/surface background, primary-colored text & icon.
   *   Used for most content screens (Species, Water Quality, Market, etc.)
   * - 'primary' — coloured background, white text & icon.
   *   Used for screens with a primary-colour hero header (Economics Results, Profile).
   */
  variant?: 'surface' | 'primary';
  /** Optional element rendered on the right side of the header (e.g. action button). */
  rightSlot?: React.ReactNode;
}

export default function ScreenHeader({
  title,
  onBack,
  subtitle,
  variant = 'surface',
  rightSlot,
}: ScreenHeaderProps) {
  const { theme } = useTheme();

  const isPrimary = variant === 'primary';
  const bgColor = isPrimary ? theme.colors.surface : theme.colors.surface;
  const iconColor = isPrimary ? theme.colors.textInverse : theme.colors.textPrimary;
  const textColor = isPrimary ? theme.colors.textInverse : theme.colors.textPrimary;
  const borderColor = theme.colors.border;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderBottomColor: borderColor,
          borderBottomWidth: 1,
        },
      ]}
    >
      {/* Back button */}
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
        disabled={!onBack}
      >
        {onBack ? (
          <>
            <Ionicons name="arrow-back" size={24} color={iconColor} />
            <Text style={[styles.backLabel, { color: iconColor }]}>Back</Text>
          </>
        ) : null}
      </TouchableOpacity>

      {/* Title */}
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right slot — kept same width as back button for visual symmetry */}
      <View style={styles.rightSlot}>
        {rightSlot ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 60,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  titleWrap: {
    flex: 1,
    marginHorizontal: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  rightSlot: {
    minWidth: 72,
    alignItems: 'flex-end',
  },
});
