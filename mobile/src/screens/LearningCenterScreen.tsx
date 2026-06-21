import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';

type TrackId = 'all' | 'foundations' | 'breeding' | 'seed' | 'business' | 'digital';

type LearningModule = {
  id: string;
  track: Exclude<TrackId, 'all'>;
  title: string;
  summary: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  image?: ImageSourcePropType;
  bullets: string[];
  tip: string;
  caution: string;
  cta: string;
  label: string;
};

const HERO_IMAGE = require('../assets/hatchery-learning/hero-banner.png');
const WATER_IMAGE = require('../assets/hatchery-learning/water-quality.png');
const SEED_IMAGE = require('../assets/hatchery-learning/improved-seeds.png');
const POND_IMAGE = require('../assets/hatchery-learning/pond-setup.png');
const SUBSIDY_IMAGE = require('../assets/hatchery-learning/subsidy-policy.png');
const MISTAKE_IMAGE = require('../assets/hatchery-learning/common-mistakes.png');

const TRACKS: Array<{ id: TrackId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'foundations', label: 'Foundations' },
  { id: 'breeding', label: 'Breeding' },
  { id: 'seed', label: 'Seed Rearing' },
  { id: 'business', label: 'Business' },
  { id: 'digital', label: 'Records' },
];

const QUICK_CARDS = [
  {
    title: 'Water checks',
    subtitle: 'DO, pH, ammonia, temperature',
    icon: 'water-outline' as const,
    target: '6',
    accent: '#0ea5e9',
  },
  {
    title: 'Seed transport',
    subtitle: '1/3 water, 2/3 oxygen',
    icon: 'boat-outline' as const,
    target: '9',
    accent: '#14b8a6',
  },
  {
    title: 'Schemes',
    subtitle: 'Use app values only',
    icon: 'document-text-outline' as const,
    target: '11',
    accent: '#f59e0b',
  },
  {
    title: 'Logbooks',
    subtitle: 'Batch IDs and daily notes',
    icon: 'clipboard-outline' as const,
    target: '12',
    accent: '#8b5cf6',
  },
];

const MODULES: LearningModule[] = [
  {
    id: '1',
    track: 'foundations',
    title: 'Hatchery foundations & lifecycle',
    label: 'Core timing',
    summary: 'Learn the path from spawn to fry to fingerling, and why the 72-hour timing rule matters.',
    icon: 'layers-outline',
    accent: '#2563eb',
    bullets: [
      'Spawn stays on yolk-sack nutrition for the first 1-3 days.',
      'Fry begin active feeding after the yolk sac is absorbed.',
      'Fingerlings are the final sale-ready seed stage.',
    ],
    tip: 'Keep flow gentle and water highly oxygenated during the earliest stage.',
    caution: 'Do not move spawn into nursery ponds too early.',
    cta: 'Understand the full seed lifecycle',
  },
  {
    id: '2',
    track: 'breeding',
    title: 'High-quality seed selection',
    label: 'Better seed',
    summary: 'Choose strong broodstock, avoid inbreeding, and quarantine new fish before use.',
    icon: 'shield-checkmark-outline',
    accent: '#22c55e',
    image: SEED_IMAGE,
    bullets: [
      'Pick deep-bodied fish with clean scales and no scars.',
      'Source breeders from trusted, genetically diverse stock.',
      'Keep new breeders quarantined before mixing them in.',
    ],
    tip: 'Strong seed often translates into faster growth and better market value later.',
    caution: 'Reusing the same small breeding pool year after year weakens output.',
    cta: 'Check broodstock quality first',
  },
  {
    id: '3',
    track: 'breeding',
    title: 'Broodstock conditioning',
    label: 'Pre-breeding',
    summary: 'Prepare breeders months in advance with good feed, space, and steady water refreshment.',
    icon: 'fitness-outline',
    accent: '#7c3aed',
    bullets: [
      'Use protein-rich feed before the breeding season.',
      'Keep broodstock density low to reduce stress.',
      'Separate males and females before spawning.',
    ],
    tip: 'A little fish oil during the final stretch can improve egg quality.',
    caution: 'Do not let broodstock ponds become shallow and hot in peak summer.',
    cta: 'Prepare breeders before monsoon',
  },
  {
    id: '4',
    track: 'breeding',
    title: 'Spawning and injection basics',
    label: 'Breeding step',
    summary: 'Use correct hormone handling, careful dosing, and a quiet spawning window.',
    icon: 'eyedrop-outline',
    accent: '#ec4899',
    bullets: [
      'Synthetic hormones give more predictable results.',
      'Dose by body weight, not by guesswork.',
      'Keep the spawning area calm after injection.',
    ],
    tip: 'Handle fish gently and keep the environment close to 26-30 C.',
    caution: 'Wrong needles or wrong dose can injure breeders or stop spawning.',
    cta: 'Review spawning workflow',
  },
  {
    id: '5',
    track: 'breeding',
    title: 'Incubation and hatching',
    label: 'Egg care',
    summary: 'Keep eggs clean, suspended, and well-oxygenated until hatch time.',
    icon: 'water-outline',
    accent: '#06b6d4',
    bullets: [
      'Remove white or unfertilized eggs quickly.',
      'Keep water moving so eggs do not settle and suffocate.',
      'Do not overload the hatching pool.',
    ],
    tip: 'At around 28 C, hatching is usually very fast.',
    caution: 'Dead eggs left in the system can spread fungus.',
    cta: 'Open the egg health guide',
  },
  {
    id: '6',
    track: 'seed',
    title: 'Water quality engineering',
    label: 'Critical checks',
    summary: 'A hatchery is a high-density system, so water changes can hurt fast if they are ignored.',
    icon: 'flask-outline',
    accent: '#0ea5e9',
    image: WATER_IMAGE,
    bullets: [
      'Keep dissolved oxygen above 6.0 mg/L.',
      'Hold pH in the 7.5 to 8.5 range.',
      'Keep ammonia very low and test regularly.',
    ],
    tip: 'Check water at dawn and dusk, not just in the middle of the day.',
    caution: 'Clear-looking water is not always safe water.',
    cta: 'Log current water parameters',
  },
  {
    id: '7',
    track: 'seed',
    title: 'Nursery management',
    label: 'Seed rearing',
    summary: 'Prepare nursery ponds well, build plankton properly, and stock at the right density.',
    icon: 'leaf-outline',
    accent: '#16a34a',
    image: POND_IMAGE,
    bullets: [
      'Drain, dry, and lime the pond before stocking.',
      'Use fertilization to build natural live feed.',
      'Control insects and watch plankton density.',
    ],
    tip: 'A Secchi disc reading around 25-30 cm is a useful nursery check.',
    caution: 'Do not stock into thick green water or a pond full of predators.',
    cta: 'Open the nursery prep guide',
  },
  {
    id: '8',
    track: 'seed',
    title: 'Fingerling grading and harvest',
    label: 'Sorting stage',
    summary: 'Separate size groups early so fast growers do not dominate the rest.',
    icon: 'git-branch-outline',
    accent: '#f97316',
    bullets: [
      'Use grading boxes with smooth slot widths.',
      'Harvest during cool morning hours.',
      'Condition fingerlings before transport.',
    ],
    tip: 'Keep sorting equipment submerged so the slime coat is not damaged.',
    caution: 'Never harvest right after feeding.',
    cta: 'Check size chart standards',
  },
  {
    id: '9',
    track: 'seed',
    title: 'Seed transportation',
    label: 'Move safely',
    summary: 'Seed must arrive alive, so oxygen, temperature, and density all matter.',
    icon: 'car-outline',
    accent: '#14b8a6',
    bullets: [
      'Use closed bags for smaller fry and long trips.',
      'Lower transport density as travel time increases.',
      'Acclimate the fish slowly at the destination.',
    ],
    tip: 'For hot regions, overnight transport is safer than daytime movement.',
    caution: 'Do not dump fish straight into a hot pond.',
    cta: 'Open the transport calculator',
  },
  {
    id: '10',
    track: 'foundations',
    title: 'Biosecurity and disease control',
    label: 'Keep it clean',
    summary: 'Simple hygiene habits stop outbreaks from spreading through a dense hatchery.',
    icon: 'shield-outline',
    accent: '#ef4444',
    image: MISTAKE_IMAGE,
    bullets: [
      'Use footbaths and handwashing at entry points.',
      'Do not mix nets, tubs, and tools between ponds.',
      'Quarantine sick fish and disinfect equipment.',
    ],
    tip: 'Sun-drying nets and tools is a practical low-cost disinfecting habit.',
    caution: 'Never mix incompatible treatments in the same water body.',
    cta: 'Open the diagnostic disease guide',
  },
  {
    id: '11',
    track: 'business',
    title: 'Business planning, schemes and market timing',
    label: 'Money matters',
    summary: 'Match seed output to demand, keep records, and use the app’s existing scheme values.',
    icon: 'cash-outline',
    accent: '#f59e0b',
    image: SUBSIDY_IMAGE,
    bullets: [
      'Time sales to the post-monsoon demand window.',
      'Do not depend on one species only.',
      'Use the app’s current PMMSY and NABARD values as-is.',
    ],
    tip: 'Pre-season booking helps lock demand before breeding starts.',
    caution: 'Overproducing without demand can force low-price sales.',
    cta: 'Access the subsidy checklist',
  },
  {
    id: '12',
    track: 'digital',
    title: 'Digital record keeping',
    label: 'Track everything',
    summary: 'Batch IDs, water logs, feed inputs, and mortality trends make the hatchery easier to improve.',
    icon: 'clipboard-outline',
    accent: '#8b5cf6',
    bullets: [
      'Log batch source, dose time, and hatching success.',
      'Track daily water and feed data from the pond side.',
      'Back up your records so nothing is lost at season end.',
    ],
    tip: 'Weekly sample weights help you know when to change feed size.',
    caution: 'Do not wait until the end of the season to reconstruct records.',
    cta: 'Start today’s digital log',
  },
];

export default function LearningCenterScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const styles = getStyles(theme);

  const knowledgeInsights = route.params?.knowledgeInsights;
  const stateCode = route.params?.stateCode;
  const farmerCategory = route.params?.farmerCategory;

  const [activeTrack, setActiveTrack] = useState<TrackId>('all');
  const [expandedModuleId, setExpandedModuleId] = useState(MODULES[0].id);

  const subsidyText =
    knowledgeInsights?.beneficiarySubsidyPercent != null
      ? `${knowledgeInsights.beneficiarySubsidyPercent}%`
      : farmerCategory === 'GENERAL'
        ? 'Usually 40%'
        : farmerCategory
          ? 'Usually 60%'
          : 'Usually 40% to 60%';

  const fundingPattern =
    knowledgeInsights?.fundingShare?.centralPercent != null &&
    knowledgeInsights?.fundingShare?.statePercent != null
      ? `${knowledgeInsights.fundingShare.centralPercent}:${knowledgeInsights.fundingShare.statePercent}`
      : stateCode
        ? 'Depends on your state'
        : 'Usually 60:40 or 90:10';

  const visibleModules =
    activeTrack === 'all'
      ? MODULES
      : MODULES.filter((module) => module.track === activeTrack);

  const featuredModule = MODULES[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Hatchery Learning Center" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Image source={HERO_IMAGE} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="school-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.heroBadgeText}>12 modules</Text>
              </View>
              <View style={styles.heroBadgeAlt}>
                <Ionicons name="sparkles-outline" size={14} color={theme.colors.secondary} />
                <Text style={styles.heroBadgeAltText}>Modern hatchery learning</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>Learn the hatchery flow, step by step</Text>
            <Text style={styles.heroSubtitle}>
              Short, practical lessons for Indian carp and finfish hatchery operators, from broodstock to business.
            </Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => setExpandedModuleId(featuredModule.id)}
              activeOpacity={0.85}
            >
              <Ionicons name="book-outline" size={16} color={theme.colors.textInverse} />
              <Text style={styles.heroButtonText}>Start with the lifecycle</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickGrid}>
          {QUICK_CARDS.map((card) => (
            <TouchableOpacity
              key={card.title}
              style={[styles.quickCard, { borderColor: card.accent, backgroundColor: `${card.accent}14` }]}
              onPress={() => setExpandedModuleId(card.target)}
              activeOpacity={0.85}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: `${card.accent}22` }]}>
                <Ionicons name={card.icon} size={18} color={card.accent} />
              </View>
              <Text style={styles.quickTitle} numberOfLines={1}>
                {card.title}
              </Text>
              <Text style={styles.quickSubtitle} numberOfLines={2}>
                {card.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Likely subsidy" value={subsidyText} icon="gift-outline" theme={theme} styles={styles} />
          <StatCard label="Funding split" value={fundingPattern} icon="pie-chart-outline" theme={theme} styles={styles} />
        </View>

        <SectionHeader label="Browse topics" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackChips}>
          {TRACKS.map((track) => {
            const active = activeTrack === track.id;
            return (
              <TouchableOpacity
                key={track.id}
                style={[styles.trackChip, active && styles.trackChipActive]}
                onPress={() => setActiveTrack(track.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.trackChipText, active && styles.trackChipTextActive]}>{track.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <SectionHeader label="Core modules" />
        <View style={styles.moduleList}>
          {visibleModules.map((module) => {
            const isExpanded = expandedModuleId === module.id;
            return (
              <TouchableOpacity
                key={module.id}
                style={[styles.moduleCard, { borderColor: module.accent }]}
                onPress={() => setExpandedModuleId(isExpanded ? '' : module.id)}
                activeOpacity={0.9}
              >
                <View style={[styles.moduleAccentBar, { backgroundColor: module.accent }]} />
                <View style={styles.moduleHeader}>
                  {module.image ? (
                    <Image source={module.image} style={styles.moduleImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.moduleIconWrap, { backgroundColor: `${module.accent}18` }]}>
                      <Ionicons name={module.icon} size={22} color={module.accent} />
                    </View>
                  )}
                  <View style={styles.moduleHeaderCopy}>
                    <View style={styles.moduleLabelPill}>
                      <Text style={styles.moduleLabelText}>{module.label}</Text>
                    </View>
                    <Text style={styles.moduleTitle} numberOfLines={2}>
                      {module.title}
                    </Text>
                    <Text style={styles.moduleSummary} numberOfLines={isExpanded ? undefined : 3}>
                      {module.summary}
                    </Text>
                  </View>
                </View>

                {isExpanded ? (
                  <View style={styles.moduleBody}>
                    <View style={styles.pointGroup}>
                      <Text style={styles.pointHeading}>Key points</Text>
                      {module.bullets.map((bullet) => (
                        <View key={bullet} style={styles.bulletRow}>
                          <View style={[styles.bulletDot, { backgroundColor: module.accent }]} />
                          <Text style={styles.bulletText}>{bullet}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.tipBox}>
                      <Text style={styles.tipHeading}>Practical tip</Text>
                      <Text style={styles.tipText}>{module.tip}</Text>
                    </View>

                    <View style={styles.cautionBox}>
                      <Text style={styles.cautionHeading}>Avoid this</Text>
                      <Text style={styles.cautionText}>{module.caution}</Text>
                    </View>

                    <View style={styles.ctaPill}>
                      <Text style={styles.ctaPillText}>{module.cta}</Text>
                    </View>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.policyCard}
          onPress={() => navigation.navigate('PolicyGuidance', { knowledgeInsights, stateCode, farmerCategory })}
          activeOpacity={0.85}
        >
          <View style={styles.policyIconWrap}>
            <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.policyCopy}>
            <Text style={styles.policyTitle}>Open policy guidance</Text>
            <Text style={styles.policyText}>Use the app’s existing subsidy values when you need scheme detail.</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <View style={stylesHeader.section}>
      <Text style={[stylesHeader.sectionText, { color: theme.colors.textMuted }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function StatCard({ label, value, icon, theme, styles }: any) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={16} color={theme.colors.primary} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const stylesHeader = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
});

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 120,
    },
    heroCard: {
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      minHeight: 320,
      ...theme.shadows.sm,
    },
    heroImage: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    heroOverlay: {
      flex: 1,
      backgroundColor: 'rgba(4, 12, 24, 0.28)',
      padding: 20,
      justifyContent: 'flex-end',
      minHeight: 320,
    },
    heroBadgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    heroBadgeText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    heroBadgeAlt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: 'rgba(255,255,255,0.78)',
    },
    heroBadgeAltText: {
      color: theme.colors.secondary,
      fontSize: 11,
      fontWeight: '800',
    },
    heroTitle: {
      color: theme.colors.textInverse,
      fontSize: 24,
      fontWeight: '900',
      lineHeight: 30,
      letterSpacing: -0.4,
      maxWidth: 300,
    },
    heroSubtitle: {
      color: theme.colors.textInverse,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 10,
      maxWidth: 320,
    },
    heroButton: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    heroButtonText: {
      color: theme.colors.textInverse,
      fontSize: 14,
      fontWeight: '800',
    },
    quickGrid: {
      marginTop: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    quickCard: {
      width: '48.5%',
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      padding: 14,
      minHeight: 112,
      ...theme.shadows.sm,
    },
    quickIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    quickTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    quickSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 6,
    },
    statIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    statValue: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
    trackChips: {
      paddingHorizontal: 16,
      gap: 8,
    },
    trackChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
    },
    trackChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    trackChipText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    trackChipTextActive: {
      color: theme.colors.textInverse,
    },
    moduleList: {
      gap: 12,
    },
    moduleCard: {
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    moduleAccentBar: {
      height: 4,
    },
    moduleHeader: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      alignItems: 'flex-start',
    },
    moduleImage: {
      width: 84,
      height: 84,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceAlt,
      flexShrink: 0,
    },
    moduleIconWrap: {
      width: 84,
      height: 84,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    moduleHeaderCopy: {
      flex: 1,
      gap: 8,
    },
    moduleLabelPill: {
      alignSelf: 'flex-start',
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    moduleLabelText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    moduleTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 21,
    },
    moduleSummary: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    moduleBody: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      gap: 10,
    },
    pointGroup: {
      gap: 8,
    },
    pointHeading: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    bulletDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      flexShrink: 0,
    },
    bulletText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    tipBox: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primaryLight,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    tipHeading: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    tipText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 19,
    },
    cautionBox: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: `${theme.colors.error}14`,
      padding: 12,
      borderWidth: 1,
      borderColor: `${theme.colors.error}55`,
    },
    cautionHeading: {
      color: theme.colors.error,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    cautionText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    ctaPill: {
      alignSelf: 'flex-start',
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    ctaPillText: {
      color: theme.colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    policyCard: {
      marginTop: 14,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    policyIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary,
      flexShrink: 0,
    },
    policyCopy: {
      flex: 1,
    },
    policyTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    policyText: {
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginTop: 4,
      fontSize: 13,
    },
  });
