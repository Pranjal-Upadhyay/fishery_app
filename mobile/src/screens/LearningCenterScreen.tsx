import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';

// ─── Category chip definitions ────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',      label: 'All',          icon: 'apps-outline' as const },
  { id: 'basics',   label: 'Basics',       icon: 'flag-outline' as const },
  { id: 'systems',  label: 'Systems',      icon: 'build-outline' as const },
  { id: 'subsidy',  label: 'Subsidy',      icon: 'ribbon-outline' as const },
  { id: 'glossary', label: 'Glossary',     icon: 'book-outline' as const },
  { id: 'results',  label: 'Results',      icon: 'analytics-outline' as const },
  { id: 'warnings', label: 'Warnings',     icon: 'warning-outline' as const },
];

// ─── Lesson / article card metadata ──────────────────────────────────────────

interface LessonItem {
  id: string;
  category: string;
  icon: any;
  title: string;
  duration: string;
  description?: string;
}

const LESSONS: LessonItem[] = [
  { id: 'l1', category: 'basics',   icon: 'flag-outline',       title: 'Start here — five steps before you spend',   duration: '4 min',  description: 'The most common mistake new farmers make is skipping the planning phase entirely.' },
  { id: 'l2', category: 'systems',  icon: 'map-outline',        title: 'Land, space & water type',                   duration: '5 min' },
  { id: 'l3', category: 'systems',  icon: 'water-outline',      title: 'Water quality fundamentals',                 duration: '6 min' },
  { id: 'l4', category: 'systems',  icon: 'cash-outline',       title: 'Capital and setup cost guide',               duration: '5 min' },
  { id: 'l5', category: 'systems',  icon: 'wallet-outline',     title: 'Working capital during a crop',              duration: '4 min' },
  { id: 'l6', category: 'subsidy',  icon: 'ribbon-outline',     title: 'Subsidy explained simply',                  duration: '7 min' },
  { id: 'l7', category: 'subsidy',  icon: 'pie-chart-outline',  title: 'Funding split — what it really means',       duration: '4 min' },
  { id: 'l8', category: 'glossary', icon: 'book-outline',       title: 'FCR, BCR, CAPEX, OPEX & more',              duration: '8 min' },
  { id: 'l9', category: 'results',  icon: 'analytics-outline',  title: 'How to read your app result',               duration: '5 min' },
  { id: 'l10',category: 'warnings', icon: 'warning-outline',    title: 'Common beginner pitfalls to avoid',         duration: '4 min' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LearningCenterScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const knowledgeInsights = route.params?.knowledgeInsights;
  const stateCode = route.params?.stateCode;
  const farmerCategory = route.params?.farmerCategory;

  const [activeCategory, setActiveCategory] = useState('all');

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

  // Glossary data
  const glossary = [
    { term: 'FCR',           meaning: 'Feed Conversion Ratio',           simple: 'How many kg of feed are needed to produce 1 kg of fish or shrimp. Lower is usually better.' },
    { term: 'BCR',           meaning: 'Benefit-Cost Ratio',              simple: 'A quick way to compare money coming in versus money going out. Above 1 usually means the project is financially positive.' },
    { term: 'CAPEX',         meaning: 'Capital Expenditure',             simple: 'Your setup cost at the beginning, like pond work, tanks, pumps, aerators, sheds, or equipment.' },
    { term: 'OPEX',          meaning: 'Operating Expenditure',           simple: 'Your running cost during the crop, like feed, seed, medicines, electricity, labor, and maintenance.' },
    { term: 'Survival Rate', meaning: 'How much stock survives to harvest', simple: 'If survival is 80%, then out of 100 stocked fish or shrimp, around 80 reach harvest.' },
    { term: 'Culture Period',meaning: 'Time from stocking to harvest',   simple: 'This tells you how long one crop takes before you can sell and earn revenue.' },
  ];

  const roadmap = [
    'Choose your location, water type, and land or tank size first.',
    'Pick a farming system that matches your capital, skill level, and risk tolerance.',
    'Estimate setup cost, running cost, crop duration, and selling price before borrowing.',
    'Check which subsidy rule may apply, but do not treat it as guaranteed cash in hand.',
    'Start with a manageable scale and learn operations before expanding.',
  ];

  const beginnerWarnings = [
    'Document-based models are planning examples, not guaranteed profit outcomes.',
    'Feed price, electricity cost, and sale price can change sharply by district and season.',
    'High-return systems like RAS or shrimp can also fail faster if operations are weak.',
    'Subsidy approval, bank sanction, and release timing can all change your real cash flow.',
  ];

  // Filtered lessons
  const visibleLessons =
    activeCategory === 'all'
      ? LESSONS
      : LESSONS.filter(l => l.category === activeCategory);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Learning Center" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Featured card — full-width, surfaceLow bg, larger text, primary CTA */}
        <View style={styles.featuredCard}>
          <View style={styles.featuredTopRow}>
            <View style={styles.featuredIconWrap}>
              <Ionicons name="school-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.eyebrowPill}>
              <Text style={styles.eyebrowText}>BEGINNER GUIDE</Text>
            </View>
          </View>
          <Text style={styles.featuredTitle}>
            How this business works in simple terms
          </Text>
          <Text style={styles.featuredSubtitle}>
            For first-time users who want to understand aquaculture, subsidy rules, and key economics terms before making decisions.
          </Text>
          <TouchableOpacity
            style={styles.featuredCta}
            onPress={() => setActiveCategory('basics')}
            activeOpacity={0.82}
          >
            <Text style={styles.featuredCtaText}>Start learning</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Subsidy stat cards */}
        <View style={styles.statsRow}>
          <StatCard label="Likely Subsidy"  value={subsidyText}    icon="gift-outline"      theme={theme} styles={styles} />
          <StatCard label="Funding Split"   value={fundingPattern} icon="pie-chart-outline" theme={theme} styles={styles} />
        </View>

        {/* Category chips — horizontal scroll, pill shape, active=primary */}
        <SectionHeader label="BROWSE TOPICS" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
          style={styles.categoryScroll}
        >
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={active ? theme.colors.textInverse : theme.colors.textSecondary}
                />
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lesson / article cards */}
        <SectionHeader label="LESSONS" />
        <View style={styles.lessonsContainer}>
          {visibleLessons.map((lesson, idx) => (
            <LessonCard key={lesson.id} lesson={lesson} theme={theme} styles={styles} isLast={idx === visibleLessons.length - 1} />
          ))}
        </View>

        {/* Detailed content — always visible below lesson list */}

        {/* Start here */}
        {(activeCategory === 'all' || activeCategory === 'basics') && (
          <LessonSection title="START HERE" icon="flag-outline" styles={styles} theme={theme}>
            {roadmap.map((item, idx) => (
              <BulletItem key={item} index={idx + 1} text={item} styles={styles} theme={theme} />
            ))}
          </LessonSection>
        )}

        {/* What the business needs */}
        {(activeCategory === 'all' || activeCategory === 'systems') && (
          <LessonSection title="WHAT THE BUSINESS NEEDS" icon="build-outline" styles={styles} theme={theme}>
            <InfoCard title="Land or space"    icon="map-outline"    body="You do not need the same size for every system. Earthen ponds usually need more land. RAS and tank-based systems use less land but need more equipment and stronger management."   styles={styles} theme={theme} />
            <InfoCard title="Water quality"    icon="water-outline"  body="Water type matters a lot. Freshwater, brackishwater, salinity, oxygen, and pH affect which species and systems are suitable."                                                          styles={styles} theme={theme} />
            <InfoCard title="Capital"          icon="cash-outline"   body="Some systems are beginner-friendly with lower capital, while others need a much bigger setup budget. In general, ponds are simpler to start than RAS."                                   styles={styles} theme={theme} />
            <InfoCard title="Working capital"  icon="wallet-outline" body="You need money not just for setup, but also for feed, seed, medicines, labor, and electricity until harvest happens."                                                                     styles={styles} theme={theme} />
          </LessonSection>
        )}

        {/* Subsidy */}
        {(activeCategory === 'all' || activeCategory === 'subsidy') && (
          <LessonSection title="SUBSIDY EXPLAINED SIMPLY" icon="ribbon-outline" styles={styles} theme={theme}>
            <Text style={styles.bodyText}>Subsidy means the government may support part of the approved project cost. It does not usually mean the full project becomes free.</Text>
            <Text style={styles.bodyText}>The beneficiary subsidy percentage is the part of project cost the farmer may get support for. The funding split only tells you how that subsidy is shared between Centre and State.</Text>
            <Text style={styles.bodyText}>In simple words: if subsidy is 40%, the farmer usually still arranges the remaining 60% through own money, bank loan, or both.</Text>
            <Text style={styles.bodyText}>Subsidy sanction and subsidy release are not the same thing. Timing can depend on paperwork, state release, and project approval.</Text>
          </LessonSection>
        )}

        {/* Glossary */}
        {(activeCategory === 'all' || activeCategory === 'glossary') && (
          <LessonSection title="IMPORTANT TERMS MADE SIMPLE" icon="book-outline" styles={styles} theme={theme}>
            {glossary.map((item) => (
              <GlossaryCard key={item.term} term={item.term} meaning={item.meaning} simple={item.simple} styles={styles} theme={theme} />
            ))}
          </LessonSection>
        )}

        {/* Results */}
        {(activeCategory === 'all' || activeCategory === 'results') && (
          <LessonSection title="HOW TO READ YOUR APP RESULT" icon="analytics-outline" styles={styles} theme={theme}>
            <BulletItem text="Compatibility score tells you how well a species matches your current inputs like water, economics, and risk level."                             styles={styles} theme={theme} />
            <BulletItem text="Projected revenue is the sales estimate before subtracting all expenses."                                                                       styles={styles} theme={theme} />
            <BulletItem text="Projected profit is what may remain after setup and operating cost assumptions are applied."                                                    styles={styles} theme={theme} />
            <BulletItem text="Breakeven timeline tells you how long it may take to recover your investment if assumptions hold."                                              styles={styles} theme={theme} />
            <BulletItem text="Tap recommended species cards to see why the match is strong, medium, or weak."                                                                styles={styles} theme={theme} />
          </LessonSection>
        )}

        {/* Current rules */}
        {(activeCategory === 'all' || activeCategory === 'results') && (
          <LessonSection title="CURRENT RULES USED IN THIS APP" icon="settings-outline" styles={styles} theme={theme}>
            <BulletItem text="Some PMMSY-linked eligibility checks in the app expect at least 0.1 hectare for subsidy planning."                                             styles={styles} theme={theme} />
            <BulletItem text="The simulator uses document-backed assumptions like FCR, survival, cycle duration, and state benchmarks where available."                       styles={styles} theme={theme} />
            <BulletItem text="If the app shows warnings or disclaimers, treat them seriously and update local prices before making a financial decision."                     styles={styles} theme={theme} />
          </LessonSection>
        )}

        {/* Warnings */}
        {(activeCategory === 'all' || activeCategory === 'warnings') && (
          <LessonSection title="BEGINNER WARNINGS" icon="warning-outline" styles={styles} theme={theme}>
            {beginnerWarnings.map((item) => (
              <BulletItem key={item} text={item} styles={styles} theme={theme} accent />
            ))}
          </LessonSection>
        )}

        {/* Policy guidance link card */}
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() =>
            navigation.navigate('PolicyGuidance', {
              knowledgeInsights,
              stateCode,
              farmerCategory,
            })
          }
          activeOpacity={0.82}
        >
          <View style={styles.linkIconWrap}>
            <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.linkCopy}>
            <Text style={styles.linkTitle}>Open policy guidance</Text>
            <Text style={styles.linkText}>
              See your current state and category subsidy preview in more detail.
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Lesson / article card: icon container (surfaceAlt, 44px, primary icon) + title + duration badge + arrow */
function LessonCard({ lesson, theme, styles, isLast }: { lesson: LessonItem; theme: any; styles: any; isLast: boolean }) {
  return (
    <View style={[styles.lessonCard, isLast && { borderBottomWidth: 0 }]}>
      {/* Icon container — surfaceAlt, 44px */}
      <View style={styles.lessonIconContainer}>
        <Ionicons name={lesson.icon} size={20} color={theme.colors.primary} />
      </View>
      {/* Text block */}
      <View style={styles.lessonTextBlock}>
        <Text style={styles.lessonTitle} numberOfLines={2}>{lesson.title}</Text>
      </View>
      {/* Duration badge — pill, accentSoft bg + accent text */}
      <View style={styles.durationBadge}>
        <Ionicons name="time-outline" size={10} color={theme.colors.accent} />
        <Text style={styles.durationText}>{lesson.duration}</Text>
      </View>
      {/* Arrow */}
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
    </View>
  );
}

function StatCard({ label, value, icon, theme, styles }: any) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardIconWrap}>
        <Ionicons name={icon} size={16} color={theme.colors.primary} />
      </View>
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={styles.statCardValue}>{value}</Text>
    </View>
  );
}

function LessonSection({ title, icon, styles, theme, children }: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={14} color={theme.colors.textMuted} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function BulletItem({ index, text, styles, theme, accent }: any) {
  return (
    <View style={styles.bulletRow}>
      {index != null ? (
        <View style={styles.bulletNum}>
          <Text style={styles.bulletNumText}>{index}</Text>
        </View>
      ) : (
        <View style={[styles.bulletDot, accent && styles.bulletDotAccent]} />
      )}
      <Text style={[styles.bulletText, accent && styles.bulletTextAccent]}>{text}</Text>
    </View>
  );
}

function InfoCard({ title, icon, body, styles, theme }: any) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardHeader}>
        <View style={styles.infoCardIconWrap}>
          <Ionicons name={icon} size={14} color={theme.colors.primary} />
        </View>
        <Text style={styles.infoCardTitle}>{title}</Text>
      </View>
      <Text style={styles.infoCardBody}>{body}</Text>
    </View>
  );
}

function GlossaryCard({ term, meaning, simple, styles, theme }: any) {
  return (
    <View style={styles.termCard}>
      <View style={styles.termHeader}>
        <Text style={styles.termTitle}>{term}</Text>
        <Text style={styles.termMeaning}>{meaning}</Text>
      </View>
      <Text style={styles.termBody}>{simple}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 120 },

    // ── Featured card ── full-width, surfaceLow bg, larger text, primary CTA ─
    featuredCard: {
      backgroundColor: theme.colors.surfaceLow,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20,
      marginBottom: 4,
    },
    featuredTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    featuredIconWrap: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    eyebrowPill: {
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    eyebrowText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
    },
    featuredTitle: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
      lineHeight: 28,
    },
    featuredSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 10,
      marginBottom: 16,
    },
    featuredCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.full,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignSelf: 'flex-start',
    },
    featuredCtaText: {
      color: theme.colors.textInverse,
      fontSize: 14,
      fontWeight: '700',
    },

    // ── Subsidy stat cards ───────────────────────────────────────────────────
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      marginBottom: 4,
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
    statCardIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statCardLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    statCardValue: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.3,
    },

    // ── Category chips ── horizontal scroll, pill, active=primary ────────────
    categoryScroll: { marginBottom: 4 },
    categoryChips: {
      paddingHorizontal: 16,
      gap: 8,
      flexDirection: 'row',
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryChipText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    categoryChipTextActive: {
      color: theme.colors.textInverse,
      fontWeight: '700',
    },

    // ── Lesson cards ─────────────────────────────────────────────────────────
    lessonsContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginHorizontal: 0,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    lessonCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    // Icon container — surfaceAlt, 44px, primary icon
    lessonIconContainer: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexShrink: 0,
    },
    lessonTextBlock: { flex: 1 },
    lessonTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
    },
    // Duration badge — pill, accentSoft bg + accent text
    durationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.accentSoft,
      flexShrink: 0,
    },
    durationText: {
      color: theme.colors.accent,
      fontSize: 10,
      fontWeight: '700',
    },

    // ── Section headers ── uppercase, textMuted, letterSpacing 2 ────────────
    section: { marginTop: 20 },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
      paddingHorizontal: 0,
    },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 10,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      lineHeight: 22,
      fontSize: 14,
    },

    // ── Bullet items ─────────────────────────────────────────────────────────
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    bulletNum: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 1,
    },
    bulletNumText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    bulletDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      marginTop: 7,
      flexShrink: 0,
    },
    bulletDotAccent: {
      backgroundColor: theme.colors.accent,
    },
    bulletText: {
      flex: 1,
      color: theme.colors.textSecondary,
      lineHeight: 22,
      fontSize: 14,
    },
    bulletTextAccent: {
      color: theme.colors.accent,
    },

    // ── Info cards ───────────────────────────────────────────────────────────
    infoCard: {
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surfaceAlt,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    infoCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    infoCardIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoCardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    infoCardBody: {
      color: theme.colors.textSecondary,
      lineHeight: 20,
      fontSize: 13,
    },

    // ── Glossary cards ───────────────────────────────────────────────────────
    termCard: {
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surfaceAlt,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    termHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    termTitle: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    termMeaning: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'right',
      flexShrink: 1,
    },
    termBody: {
      color: theme.colors.textSecondary,
      lineHeight: 20,
      fontSize: 13,
    },

    // ── Policy link card ─────────────────────────────────────────────────────
    linkCard: {
      marginTop: 20,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    linkIconWrap: {
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
    linkCopy: { flex: 1 },
    linkTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    linkText: {
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginTop: 4,
      fontSize: 13,
    },
  });
