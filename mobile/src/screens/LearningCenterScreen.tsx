import React, { useState } from 'react';
import {
  Image, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import YouTubeCard, { YouTubeLinkItem } from '../components/YouTubeCard';

// ─── Category chip definitions ────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',      icon: 'apps-outline' as const },
  { id: 'basics',   icon: 'flag-outline' as const },
  { id: 'systems',  icon: 'build-outline' as const },
  { id: 'subsidy',  icon: 'ribbon-outline' as const },
  { id: 'glossary', icon: 'book-outline' as const },
  { id: 'results',  icon: 'analytics-outline' as const },
  { id: 'warnings', icon: 'warning-outline' as const },
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
  const { t } = useTranslation();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const knowledgeInsights = route.params?.knowledgeInsights;
  const stateCode = route.params?.stateCode;
  const farmerCategory = route.params?.farmerCategory;

  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

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

  const ytBasics: YouTubeLinkItem[] = [
    { search_query: 'fish farming basics India beginners guide', title: 'Fish Farming for Beginners — India', hint: 'Simple intro to setting up your first pond' },
    { search_query: 'aquaculture business plan step by step India', title: 'Business Plan: Aquaculture in India', hint: 'Planning your first fish farming venture' },
  ];
  const ytSystems: YouTubeLinkItem[] = [
    { search_query: 'pond fish farming setup India earthen pond', title: 'How to Set Up an Earthen Fish Pond', hint: 'Land, water, and pond construction basics' },
    { search_query: 'RAS recirculating aquaculture system India small scale', title: 'RAS System India — Small Scale', hint: 'Recirculating tanks for higher yield in less space' },
  ];
  const ytSubsidy: YouTubeLinkItem[] = [
    { search_query: 'PMMSY scheme fish farming subsidy India how to apply', title: 'PMMSY Subsidy — How to Apply', hint: 'Government scheme for fisheries development' },
    { search_query: 'fisheries loan subsidy Bihar UP India bank', title: 'Fish Farming Loan & Subsidy Guide', hint: 'Bank loans and subsidy release process explained' },
  ];
  const ytWarnings: YouTubeLinkItem[] = [
    { search_query: 'fish farming mistakes beginners India avoid', title: 'Common Fish Farming Mistakes to Avoid', hint: 'Learn from others so you don\'t repeat these errors' },
  ];

  // Filtered lessons
  const visibleLessons =
    activeCategory === 'all'
      ? LESSONS
      : LESSONS.filter(l => l.category === activeCategory);

  const renderLessonDetails = (lesson: LessonItem) => {
    switch (lesson.id) {
      case 'l1':
        return (
          <>
            <Text style={styles.bodyText}>
              Most new farmers lose money in the first crop because they skip planning and start spending too early.
              Use these five steps as your pre-investment checklist.
            </Text>
            {roadmap.map((item, idx) => (
              <BulletItem key={item} index={idx + 1} text={item} styles={styles} theme={theme} />
            ))}
            <View style={styles.ytSection}>
              <Text style={styles.ytSectionLabel}>{t('learning.watchAndLearn').toUpperCase()}</Text>
              {ytBasics.map((link) => <YouTubeCard key={link.title} item={link} />)}
            </View>
          </>
        );
      case 'l2':
        return (
          <>
            <InfoCard
              title="Land or space"
              icon="map-outline"
              body="Earthen ponds need more area, while tank-based systems like RAS can fit in tighter spaces. More land lowers crowding pressure, but also raises exposure to flood, seepage, and construction mistakes."
              styles={styles}
              theme={theme}
            />
            <Text style={styles.bodyText}>
              Match the system to the land you actually control, the water you can reliably access, and the daily labor you can manage.
            </Text>
            <View style={styles.ytSection}>
              <Text style={styles.ytSectionLabel}>{t('learning.watchAndLearn').toUpperCase()}</Text>
              {ytSystems.slice(0, 1).map((link) => <YouTubeCard key={link.title} item={link} />)}
            </View>
          </>
        );
      case 'l3':
        return (
          <>
            <InfoCard
              title="Water quality fundamentals"
              icon="water-outline"
              body="Water is the operating environment for the entire business. If dissolved oxygen, pH, temperature, salinity, or ammonia move out of range, even a good species and good feed plan will underperform."
              styles={styles}
              theme={theme}
            />
            <BulletItem text="Check dissolved oxygen early morning, not only during the day." styles={styles} theme={theme} />
            <BulletItem text="Keep a simple water log before each major stocking or feed increase." styles={styles} theme={theme} />
            <View style={styles.ytSection}>
              <Text style={styles.ytSectionLabel}>{t('learning.watchAndLearn').toUpperCase()}</Text>
              {ytSystems.slice(1).map((link) => <YouTubeCard key={link.title} item={link} />)}
            </View>
          </>
        );
      case 'l4':
        return (
          <>
            <InfoCard
              title="Capital and setup cost"
              icon="cash-outline"
              body="Setup cost is your CAPEX: pond excavation, liners, tanks, pumps, aerators, sheds, electricity work, plumbing, and starter equipment. Farmers usually underestimate this part, so keep a buffer instead of using the lowest quote."
              styles={styles}
              theme={theme}
            />
            <BulletItem text="Treat every equipment list as a working estimate, not a final invoice." styles={styles} theme={theme} />
            <BulletItem text="Keep a contingency buffer because startup bills usually expand during execution." styles={styles} theme={theme} />
          </>
        );
      case 'l5':
        return (
          <>
            <InfoCard
              title="Working capital during the crop"
              icon="wallet-outline"
              body="Running cost is your OPEX: feed, seed, medicines, electricity, labor, repairs, and pond upkeep. A farm that survives setup can still fail later if working capital runs short halfway through the crop."
              styles={styles}
              theme={theme}
            />
            <BulletItem text="Feed is often the largest running cost, so plan cash for the full crop cycle." styles={styles} theme={theme} />
            <BulletItem text="Do not assume subsidy money will arrive in time to solve short-term cash flow." styles={styles} theme={theme} />
          </>
        );
      case 'l6':
        return (
          <>
            <Text style={styles.bodyText}>
              Subsidy means the government may support part of an approved project cost. It does not mean the full project is paid for,
              and it should not be treated like guaranteed instant cash.
            </Text>
            <BulletItem text={`The likely beneficiary share in this app is ${subsidyText}.`} styles={styles} theme={theme} />
            <BulletItem text="You still need to arrange the remaining capital through your own funds, loan, or phased execution." styles={styles} theme={theme} />
            <View style={styles.ytSection}>
              <Text style={styles.ytSectionLabel}>{t('learning.watchAndLearn').toUpperCase()}</Text>
              {ytSubsidy.slice(0, 1).map((link) => <YouTubeCard key={link.title} item={link} />)}
            </View>
          </>
        );
      case 'l7':
        return (
          <>
            <Text style={styles.bodyText}>
              The funding split explains how the support is shared administratively between Centre and State.
              It does not change the amount you see as the beneficiary portion.
            </Text>
            <BulletItem text={`Current funding split preview: ${fundingPattern}.`} styles={styles} theme={theme} />
            <BulletItem text="Approval timing and release timing can still affect your actual cash flow on the ground." styles={styles} theme={theme} />
            <View style={styles.ytSection}>
              <Text style={styles.ytSectionLabel}>{t('learning.watchAndLearn').toUpperCase()}</Text>
              {ytSubsidy.slice(1).map((link) => <YouTubeCard key={link.title} item={link} />)}
            </View>
          </>
        );
      case 'l8':
        return (
          <>
            <Text style={styles.bodyText}>These are the most common planning terms inside the app and in aquaculture project reports.</Text>
            {glossary.map((item) => (
              <GlossaryCard key={item.term} term={item.term} meaning={item.meaning} simple={item.simple} styles={styles} theme={theme} />
            ))}
          </>
        );
      case 'l9':
        return (
          <>
            <Text style={styles.bodyText}>
              The ROI screen is a planning estimate. It helps compare options, but it is not a guarantee of farm income.
            </Text>
            <BulletItem text="Compatibility score shows how well the species fits your inputs." styles={styles} theme={theme} />
            <BulletItem text="Projected revenue is gross income before cost deduction." styles={styles} theme={theme} />
            <BulletItem text="Projected profit is the number to judge after cost assumptions are applied." styles={styles} theme={theme} />
            <BulletItem text="Breakeven timeline tells you how long it may take to recover the initial investment." styles={styles} theme={theme} />
          </>
        );
      case 'l10':
        return (
          <>
            <Text style={styles.bodyText}>
              These are the most common reasons beginners lose money even when the first plan looked profitable.
            </Text>
            {beginnerWarnings.map((item) => (
              <BulletItem key={item} text={item} styles={styles} theme={theme} accent />
            ))}
            <View style={styles.ytSection}>
              <Text style={styles.ytSectionLabel}>{t('learning.watchAndLearn').toUpperCase()}</Text>
              {ytWarnings.map((link) => <YouTubeCard key={link.title} item={link} />)}
            </View>
          </>
        );
      default:
        return lesson.description ? <Text style={styles.bodyText}>{lesson.description}</Text> : null;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={t('learning.title')} onBack={() => navigation.goBack()} />

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
              <Text style={styles.eyebrowText}>{t('learning.beginnerGuide').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.featuredTitle}>
            {t('learning.featuredTitle')}
          </Text>
          <Text style={styles.featuredSubtitle}>
            {t('learning.featuredSubtitle')}
          </Text>
          <TouchableOpacity
            style={styles.featuredCta}
            onPress={() => setActiveCategory('basics')}
            activeOpacity={0.82}
          >
            <Text style={styles.featuredCtaText}>{t('learning.startLearning')}</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Subsidy stat cards */}
        <View style={styles.statsRow}>
          <StatCard label={t('learning.likelySubsidy')}  value={subsidyText}    icon="gift-outline"      theme={theme} styles={styles} />
          <StatCard label={t('learning.fundingSplit')}    value={fundingPattern} icon="pie-chart-outline" theme={theme} styles={styles} />
        </View>

        {/* Category chips — horizontal scroll, pill shape, active=primary */}
        <SectionHeader label={t('learning.browseTopics').toUpperCase()} />
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
                  {t(`learning.lessonCategories.${cat.id}`, { defaultValue: cat.id })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lesson / article cards */}
        <SectionHeader label={t('learning.lessons').toUpperCase()} />
        <View style={styles.lessonsContainer}>
          {visibleLessons.map((lesson, idx) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              theme={theme}
              styles={styles}
              isLast={idx === visibleLessons.length - 1}
              isExpanded={Boolean(expandedLessons[lesson.id])}
              onPress={() => toggleLesson(lesson.id)}
            >
              {renderLessonDetails(lesson)}
            </LessonCard>
          ))}
        </View>


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
            <Text style={styles.linkTitle}>{t('learning.openPolicyGuidance')}</Text>
            <Text style={styles.linkText}>
              {t('learning.openPolicyGuidanceText')}
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

/** Lesson / article card: tap to expand topic details inline */
function LessonCard({
  lesson,
  theme,
  styles,
  isLast,
  isExpanded,
  onPress,
  children,
}: {
  lesson: LessonItem;
  theme: any;
  styles: any;
  isLast: boolean;
  isExpanded: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.lessonCard, isLast && { borderBottomWidth: 0 }]}>
      <TouchableOpacity style={styles.lessonCardButton} activeOpacity={0.82} onPress={onPress}>
        <View style={styles.lessonIconContainer}>
          <Ionicons name={lesson.icon} size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.lessonTextBlock}>
          <Text style={styles.lessonTitle} numberOfLines={2}>{lesson.title}</Text>
          {lesson.description ? (
            <Text style={styles.lessonSubtitle} numberOfLines={isExpanded ? undefined : 2}>
              {lesson.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={10} color={theme.colors.accent} />
          <Text style={styles.durationText}>{lesson.duration}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.textMuted}
          style={isExpanded ? styles.lessonChevronExpanded : undefined}
        />
      </TouchableOpacity>

      {isExpanded ? (
        <View style={styles.lessonExpandedBody}>
          {children}
        </View>
      ) : null}
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
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    lessonCardButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
    lessonSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
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
    lessonChevronExpanded: {
      transform: [{ rotate: '90deg' }],
    },
    lessonExpandedBody: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: 10,
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
    boldText: {
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },

    // ── YouTube section ──────────────────────────────────────────────────────
    ytSection: {
      marginTop: 12,
    },
    ytSectionLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 8,
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
      marginTop: 12,
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
